import { Router } from "express";
import { db } from "@workspace/db";
import { workspacesTable, workspaceMembersTable, usersTable, socialAccountsTable, postsTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { CreateWorkspaceBody, UpdateWorkspaceBody, GetWorkspaceParams } from "@workspace/api-zod";
import { requireAuth, signToken, type AuthenticatedRequest } from "../middlewares/auth";
import { sendEmail } from "../lib/email";

const router = Router();

async function workspaceToResponse(ws: typeof workspacesTable.$inferSelect) {
  const [membersRes] = await db.select({ cnt: count() }).from(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, ws.id));
  const [accountsRes] = await db.select({ cnt: count() }).from(socialAccountsTable).where(eq(socialAccountsTable.workspaceId, ws.id));
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [postsRes] = await db.select({ cnt: count() }).from(postsTable).where(
    and(eq(postsTable.workspaceId, ws.id), sql`${postsTable.createdAt} >= ${startOfMonth}`)
  );
  return {
    id: ws.id, name: ws.name, slug: ws.slug,
    logo: ws.logo ?? null, plan: ws.plan,
    membersCount: membersRes?.cnt ?? 0,
    socialAccountsCount: accountsRes?.cnt ?? 0,
    postsThisMonth: postsRes?.cnt ?? 0,
    createdAt: ws.createdAt.toISOString(),
  };
}

router.get("/workspaces", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const members = await db.select().from(workspaceMembersTable).where(eq(workspaceMembersTable.userId, req.userId!));
    const wsIds = members.map(m => m.workspaceId);
    if (wsIds.length === 0) { res.json([]); return; }
    const workspaces = await db.select().from(workspacesTable).where(sql`${workspacesTable.id} = ANY(${wsIds})`);
    const result = await Promise.all(workspaces.map(workspaceToResponse));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list workspaces" });
  }
});

router.post("/workspaces", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = CreateWorkspaceBody.parse(req.body);
    const [ws] = await db.insert(workspacesTable).values({ ...body, ownerId: req.userId! }).returning();
    await db.insert(workspaceMembersTable).values({ workspaceId: ws.id, userId: req.userId!, role: "owner" });
    res.status(201).json(await workspaceToResponse(ws));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create workspace" });
  }
});

router.get("/workspaces/:workspaceId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetWorkspaceParams.parse({ workspaceId: Number(req.params.workspaceId) });
    const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId)).limit(1);
    if (!ws) { res.status(404).json({ message: "Workspace not found" }); return; }
    res.json(await workspaceToResponse(ws));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get workspace" });
  }
});

router.patch("/workspaces/:workspaceId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetWorkspaceParams.parse({ workspaceId: Number(req.params.workspaceId) });
    const body = UpdateWorkspaceBody.parse(req.body);
    const [ws] = await db.update(workspacesTable).set(body).where(eq(workspacesTable.id, workspaceId)).returning();
    if (!ws) { res.status(404).json({ message: "Workspace not found" }); return; }
    res.json(await workspaceToResponse(ws));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update workspace" });
  }
});

router.get("/workspaces/:workspaceId/members", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const members = await db
      .select({
        id: workspaceMembersTable.id,
        userId: workspaceMembersTable.userId,
        role: workspaceMembersTable.role,
        joinedAt: workspaceMembersTable.joinedAt,
        name: usersTable.name,
        email: usersTable.email,
        avatar: usersTable.avatar,
      })
      .from(workspaceMembersTable)
      .innerJoin(usersTable, eq(usersTable.id, workspaceMembersTable.userId))
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));
    res.json(members.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      name: m.name,
      email: m.email,
      avatar: m.avatar ?? null,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list members" });
  }
});

router.post("/workspaces/:workspaceId/invite", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const { email, role = "editor" } = req.body as { email?: string; role?: string };
    if (!email) { res.status(400).json({ message: "Email is required" }); return; }

    const [inviter] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const [ws] = await db.select({ name: workspacesTable.name }).from(workspacesTable).where(eq(workspacesTable.id, workspaceId)).limit(1);

    // Check if user already exists and add them directly
    const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existingUser) {
      const [alreadyMember] = await db.select({ id: workspaceMembersTable.id })
        .from(workspaceMembersTable)
        .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, existingUser.id)))
        .limit(1);
      if (alreadyMember) {
        res.status(409).json({ message: "User is already a member of this workspace" });
        return;
      }
      await db.insert(workspaceMembersTable).values({ workspaceId, userId: existingUser.id, role });
    }

    const appUrl = process.env["CLIENT_URL"] ?? "https://socify.app";
    const inviteUrl = `${appUrl}/login?workspace=${workspaceId}`;
    await sendEmail({
      to: email,
      subject: `${inviter?.name ?? "Someone"} invited you to ${ws?.name ?? "a workspace"} on SOCIFY`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#09090B;color:#FAFAFA;border-radius:12px;border:1px solid #27272A">
          <h2 style="margin:0 0 8px;font-size:20px;">You've been invited!</h2>
          <p style="color:#A1A1AA;margin:0 0 24px;">${inviter?.name ?? "A team member"} has invited you to join <strong style="color:#FAFAFA">${ws?.name ?? "a workspace"}</strong> on SOCIFY as <strong style="color:#FAFAFA">${role}</strong>.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Accept Invitation</a>
          <p style="color:#52525B;font-size:12px;margin-top:24px;">If you didn't expect this, you can safely ignore this email.</p>
        </div>
      `,
      text: `You've been invited to join ${ws?.name ?? "a workspace"} on SOCIFY. Accept here: ${inviteUrl}`,
    });

    res.json({ message: existingUser ? "Member added and notified by email" : "Invitation sent by email" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to send invitation" });
  }
});

router.delete("/workspaces/:workspaceId/members/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = Number(req.params.workspaceId);
    const targetUserId = Number(req.params.userId);
    await db.delete(workspaceMembersTable).where(
      and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, targetUserId))
    );
    res.json({ message: "Member removed" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to remove member" });
  }
});

export default router;
