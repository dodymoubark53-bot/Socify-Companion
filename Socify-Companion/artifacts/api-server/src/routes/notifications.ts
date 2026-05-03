import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListNotificationsQueryParams, MarkAllNotificationsReadBody
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = ListNotificationsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      unreadOnly: req.query.unreadOnly === "true",
    });
    const conditions = [
      eq(notificationsTable.workspaceId, params.workspaceId),
      eq(notificationsTable.userId, req.userId!),
    ];
    if (params.unreadOnly) conditions.push(eq(notificationsTable.isRead, false));
    const notifications = await db.select().from(notificationsTable)
      .where(and(...conditions))
      .orderBy(sql`${notificationsTable.createdAt} DESC`)
      .limit(50);
    res.json(notifications.map(n => ({
      id: n.id, workspaceId: n.workspaceId, userId: n.userId,
      type: n.type, title: n.title, message: n.message,
      isRead: n.isRead, link: n.link ?? null,
      createdAt: n.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list notifications" });
  }
});

router.post("/notifications/:notificationId/read", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const notificationId = Number(req.params.notificationId);
    await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, notificationId));
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

router.post("/notifications/read-all", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = MarkAllNotificationsReadBody.parse(req.body);
    await db.update(notificationsTable).set({ isRead: true }).where(
      and(eq(notificationsTable.workspaceId, body.workspaceId), eq(notificationsTable.userId, req.userId!))
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to mark all notifications as read" });
  }
});

export default router;
