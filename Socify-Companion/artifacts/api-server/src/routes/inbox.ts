import { Router } from "express";
import { db } from "@workspace/db";
import { inboxMessagesTable, usersTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import {
  ListInboxMessagesQueryParams, GetInboxMessageParams,
  UpdateInboxMessageBody, ReplyToMessageBody, GetInboxStatsQueryParams
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { emitToWorkspace } from "../lib/socket";

const router = Router();

async function msgToResponse(m: typeof inboxMessagesTable.$inferSelect) {
  let assignedToName: string | null = null;
  if (m.assignedToId) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, m.assignedToId)).limit(1);
    assignedToName = u?.name ?? null;
  }
  return {
    id: m.id, workspaceId: m.workspaceId, platform: m.platform, type: m.type,
    senderName: m.senderName, senderHandle: m.senderHandle, senderAvatar: m.senderAvatar ?? null,
    content: m.content, sentiment: m.sentiment, sentimentScore: parseFloat(m.sentimentScore as string),
    status: m.status, isStarred: m.isStarred,
    assignedToId: m.assignedToId ?? null, assignedToName,
    receivedAt: m.receivedAt.toISOString(), repliedAt: m.repliedAt?.toISOString() ?? null,
  };
}

router.get("/inbox/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetInboxStatsQueryParams.parse({ workspaceId: Number(req.query.workspaceId) });
    const all = await db.select().from(inboxMessagesTable).where(eq(inboxMessagesTable.workspaceId, workspaceId));
    const stats = {
      total: all.length,
      unread: all.filter(m => m.status === "unread").length,
      inProgress: all.filter(m => m.status === "in_progress").length,
      done: all.filter(m => m.status === "done").length,
      positive: all.filter(m => m.sentiment === "positive").length,
      neutral: all.filter(m => m.sentiment === "neutral").length,
      negative: all.filter(m => m.sentiment === "negative").length,
      avgResponseTime: 2.4,
    };
    res.json(stats);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get inbox stats" });
  }
});

router.get("/inbox", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = ListInboxMessagesQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      status: req.query.status,
      platform: req.query.platform,
      sentiment: req.query.sentiment,
      page: req.query.page ? Number(req.query.page) : 1,
    });
    const page = params.page ?? 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const conditions = [eq(inboxMessagesTable.workspaceId, params.workspaceId)];
    if (params.status) conditions.push(eq(inboxMessagesTable.status, params.status));
    if (params.platform) conditions.push(eq(inboxMessagesTable.platform, params.platform));
    if (params.sentiment) conditions.push(eq(inboxMessagesTable.sentiment, params.sentiment));
    const messages = await db.select().from(inboxMessagesTable)
      .where(and(...conditions))
      .orderBy(sql`${inboxMessagesTable.receivedAt} DESC`)
      .limit(limit).offset(offset);
    const total = await db.select({ cnt: count() }).from(inboxMessagesTable).where(and(...conditions));
    const unreadCount = await db.select({ cnt: count() }).from(inboxMessagesTable)
      .where(and(eq(inboxMessagesTable.workspaceId, params.workspaceId), eq(inboxMessagesTable.status, "unread")));
    res.json({
      messages: await Promise.all(messages.map(msgToResponse)),
      total: total[0]?.cnt ?? 0,
      unreadCount: unreadCount[0]?.cnt ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list inbox messages" });
  }
});

router.get("/inbox/:messageId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { messageId } = GetInboxMessageParams.parse({ messageId: Number(req.params.messageId) });
    const [m] = await db.select().from(inboxMessagesTable).where(eq(inboxMessagesTable.id, messageId)).limit(1);
    if (!m) { res.status(404).json({ message: "Message not found" }); return; }
    res.json(await msgToResponse(m));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get message" });
  }
});

router.patch("/inbox/:messageId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { messageId } = GetInboxMessageParams.parse({ messageId: Number(req.params.messageId) });
    const body = UpdateInboxMessageBody.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.isStarred !== undefined) updateData.isStarred = body.isStarred;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId;
    const [m] = await db.update(inboxMessagesTable).set(updateData).where(eq(inboxMessagesTable.id, messageId)).returning();
    if (!m) { res.status(404).json({ message: "Message not found" }); return; }
    const response = await msgToResponse(m);
    emitToWorkspace(m.workspaceId, "inbox:message_updated", response);
    res.json(response);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update message" });
  }
});

router.post("/inbox/:messageId/reply", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { messageId } = GetInboxMessageParams.parse({ messageId: Number(req.params.messageId) });
    ReplyToMessageBody.parse(req.body);
    const [m] = await db.update(inboxMessagesTable).set({
      status: "done",
      repliedAt: new Date(),
    }).where(eq(inboxMessagesTable.id, messageId)).returning();
    if (m) {
      emitToWorkspace(m.workspaceId, "inbox:reply_sent", { messageId: m.id, workspaceId: m.workspaceId });
    }
    res.json({ message: "Reply sent" });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to send reply" });
  }
});

export default router;
