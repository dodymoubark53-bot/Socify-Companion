import { Router } from "express";
import { db } from "@workspace/db";
import { socialAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListSocialAccountsQueryParams, CreateSocialAccountBody, DeleteSocialAccountParams } from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

function toResponse(a: typeof socialAccountsTable.$inferSelect) {
  return {
    id: a.id, workspaceId: a.workspaceId, platform: a.platform,
    accountType: a.accountType, name: a.name, handle: a.handle,
    avatar: a.avatar ?? null, isActive: a.isActive,
    followers: a.followers, following: a.following,
    avgEngagementRate: a.avgEngagementRate ? parseFloat(a.avgEngagementRate) : null,
    lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
    connectedAt: a.connectedAt.toISOString(),
  };
}

router.get("/social-accounts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = ListSocialAccountsQueryParams.parse({ workspaceId: Number(req.query.workspaceId) });
    const accounts = await db.select().from(socialAccountsTable).where(eq(socialAccountsTable.workspaceId, workspaceId));
    res.json(accounts.map(toResponse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list social accounts" });
  }
});

router.post("/social-accounts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = CreateSocialAccountBody.parse(req.body);
    const [account] = await db.insert(socialAccountsTable).values({
      workspaceId: body.workspaceId,
      platform: body.platform,
      accountType: body.accountType,
      name: body.name,
      handle: body.handle,
      followers: body.followers ?? 0,
      isActive: true,
    }).returning();
    res.status(201).json(toResponse(account));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create social account" });
  }
});

router.delete("/social-accounts/:accountId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { accountId } = DeleteSocialAccountParams.parse({ accountId: Number(req.params.accountId) });
    await db.delete(socialAccountsTable).where(eq(socialAccountsTable.id, accountId));
    res.json({ message: "Account disconnected" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete social account" });
  }
});

export default router;
