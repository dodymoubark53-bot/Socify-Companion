import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable, postsTable, leadsTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import {
  ListCampaignsQueryParams, CreateCampaignBody, GetCampaignParams, UpdateCampaignBody
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

async function campaignToResponse(c: typeof campaignsTable.$inferSelect) {
  const [postsRes] = await db.select({ cnt: count() }).from(postsTable).where(eq(postsTable.campaignId, c.id));
  const [leadsRes] = await db.select({ cnt: count() }).from(leadsTable).where(eq(leadsTable.workspaceId, c.workspaceId));
  return {
    id: c.id, workspaceId: c.workspaceId, name: c.name,
    description: c.description ?? null, objective: c.objective,
    status: c.status,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    budget: c.budget ? parseFloat(c.budget as string) : null,
    currency: c.currency ?? null,
    targetPlatforms: c.targetPlatforms ?? [],
    postsCount: postsRes?.cnt ?? 0,
    leadsCount: leadsRes?.cnt ?? 0,
    totalReach: c.totalReach, totalEngagement: c.totalEngagement,
    roi: c.roi ? parseFloat(c.roi as string) : null,
    color: c.color ?? null, tags: c.tags ?? [],
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/campaigns", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = ListCampaignsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      status: req.query.status,
    });
    const conditions = [eq(campaignsTable.workspaceId, params.workspaceId)];
    if (params.status) conditions.push(eq(campaignsTable.status, params.status));
    const campaigns = await db.select().from(campaignsTable)
      .where(and(...conditions))
      .orderBy(sql`${campaignsTable.createdAt} DESC`);
    res.json(await Promise.all(campaigns.map(campaignToResponse)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list campaigns" });
  }
});

router.post("/campaigns", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = CreateCampaignBody.parse(req.body);
    const [campaign] = await db.insert(campaignsTable).values({
      workspaceId: body.workspaceId, name: body.name,
      description: body.description ?? null,
      objective: body.objective, status: "draft",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      budget: body.budget?.toString() ?? null,
      currency: body.currency ?? "USD",
      targetPlatforms: body.targetPlatforms ?? [],
      color: body.color ?? null,
      tags: body.tags ?? [],
    }).returning();
    res.status(201).json(await campaignToResponse(campaign));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create campaign" });
  }
});

router.get("/campaigns/:campaignId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = GetCampaignParams.parse({ campaignId: Number(req.params.campaignId) });
    const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId)).limit(1);
    if (!c) { res.status(404).json({ message: "Campaign not found" }); return; }
    res.json(await campaignToResponse(c));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get campaign" });
  }
});

router.patch("/campaigns/:campaignId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = GetCampaignParams.parse({ campaignId: Number(req.params.campaignId) });
    const body = UpdateCampaignBody.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.budget !== undefined) updateData.budget = body.budget?.toString();
    if (body.targetPlatforms !== undefined) updateData.targetPlatforms = body.targetPlatforms;
    const [c] = await db.update(campaignsTable).set(updateData).where(eq(campaignsTable.id, campaignId)).returning();
    if (!c) { res.status(404).json({ message: "Campaign not found" }); return; }
    res.json(await campaignToResponse(c));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update campaign" });
  }
});

router.delete("/campaigns/:campaignId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignId } = GetCampaignParams.parse({ campaignId: Number(req.params.campaignId) });
    await db.delete(campaignsTable).where(eq(campaignsTable.id, campaignId));
    res.json({ message: "Campaign deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete campaign" });
  }
});

export default router;
