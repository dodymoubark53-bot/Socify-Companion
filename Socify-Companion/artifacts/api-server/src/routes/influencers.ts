import { Router } from "express";
import { db } from "@workspace/db";
import { influencersTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

function toResponse(i: typeof influencersTable.$inferSelect) {
  return {
    id: i.id, workspaceId: i.workspaceId, name: i.name,
    handle: i.handle, platform: i.platform, avatar: i.avatar ?? null,
    bio: i.bio ?? null, email: i.email ?? null, category: i.category,
    tier: i.tier, followers: i.followers, avgLikes: i.avgLikes,
    avgComments: i.avgComments,
    engagementRate: i.engagementRate ? parseFloat(i.engagementRate as string) : null,
    avgReach: i.avgReach, location: i.location ?? null, language: i.language,
    status: i.status, tags: i.tags ?? [], notes: i.notes ?? null,
    lastContactedAt: i.lastContactedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/influencers", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = Number(req.query.workspaceId);
    const search = req.query.search as string | undefined;
    const platform = req.query.platform as string | undefined;
    const tier = req.query.tier as string | undefined;
    const status = req.query.status as string | undefined;

    const conditions = [eq(influencersTable.workspaceId, workspaceId)];
    if (search) conditions.push(ilike(influencersTable.name, `%${search}%`));
    if (platform) conditions.push(eq(influencersTable.platform, platform));
    if (tier) conditions.push(eq(influencersTable.tier, tier));
    if (status) conditions.push(eq(influencersTable.status, status));

    const influencers = await db.select().from(influencersTable)
      .where(and(...conditions))
      .orderBy(sql`${influencersTable.followers} DESC`);
    res.json(influencers.map(toResponse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list influencers" });
  }
});

router.post("/influencers", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body;
    const [inf] = await db.insert(influencersTable).values({
      workspaceId: body.workspaceId, name: body.name,
      handle: body.handle, platform: body.platform,
      avatar: body.avatar ?? null, bio: body.bio ?? null,
      email: body.email ?? null, category: body.category ?? "lifestyle",
      tier: body.tier ?? "micro", followers: body.followers ?? 0,
      avgLikes: body.avgLikes ?? 0, avgComments: body.avgComments ?? 0,
      engagementRate: body.engagementRate?.toString() ?? null,
      avgReach: body.avgReach ?? 0, location: body.location ?? null,
      status: body.status ?? "prospect", tags: body.tags ?? [],
    }).returning();
    res.status(201).json(toResponse(inf));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create influencer" });
  }
});

router.patch("/influencers/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updateData: Record<string, unknown> = {};
    const allowed = ["name","handle","platform","bio","email","category","tier","followers","status","tags","notes","lastContactedAt"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const [inf] = await db.update(influencersTable).set(updateData).where(eq(influencersTable.id, id)).returning();
    if (!inf) { res.status(404).json({ message: "Influencer not found" }); return; }
    res.json(toResponse(inf));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update influencer" });
  }
});

router.delete("/influencers/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(influencersTable).where(eq(influencersTable.id, Number(req.params.id)));
    res.json({ message: "Influencer deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete influencer" });
  }
});

export default router;
