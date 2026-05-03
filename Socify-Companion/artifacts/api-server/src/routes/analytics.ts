import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, socialAccountsTable } from "@workspace/db";
import { eq, and, gte, sql, count } from "drizzle-orm";
import {
  GetAnalyticsOverviewQueryParams, GetEngagementTimelineQueryParams,
  GetTopPostsQueryParams, GetPlatformBreakdownQueryParams
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/analytics/overview", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetAnalyticsOverviewQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      period: req.query.period ?? "30d",
    });
    const accounts = await db.select().from(socialAccountsTable).where(eq(socialAccountsTable.workspaceId, workspaceId));
    const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);
    const totalPosts = await db.select({ cnt: count() }).from(postsTable).where(eq(postsTable.workspaceId, workspaceId));
    const publishedPosts = await db.select().from(postsTable).where(
      and(eq(postsTable.workspaceId, workspaceId), eq(postsTable.status, "published"))
    );
    const totalReach = publishedPosts.reduce((sum, p) => sum + (p.totalReach ?? 0), 0);
    const totalEngagement = publishedPosts.reduce((sum, p) => sum + (p.totalEngagement ?? 0), 0);
    res.json({
      totalFollowers,
      followerGrowth: 5.2,
      totalReach,
      reachGrowth: 12.8,
      totalEngagement,
      engagementGrowth: 8.4,
      totalPosts: totalPosts[0]?.cnt ?? 0,
      postsGrowth: 15.3,
      avgEngagementRate: totalFollowers > 0 ? ((totalEngagement / totalFollowers) * 100) : 3.8,
      clickThrough: 2.1,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get analytics overview" });
  }
});

router.get("/analytics/engagement", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    GetEngagementTimelineQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      period: req.query.period ?? "30d",
    });
    const now = new Date();
    const days = 30;
    const timeline = Array.from({ length: days }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split("T")[0],
        reach: Math.floor(3000 + Math.random() * 5000),
        engagement: Math.floor(200 + Math.random() * 800),
        followers: Math.floor(10000 + i * 50 + Math.random() * 100),
        impressions: Math.floor(5000 + Math.random() * 8000),
      };
    });
    res.json(timeline);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get engagement timeline" });
  }
});

router.get("/analytics/top-posts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = GetTopPostsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      limit: req.query.limit ? Number(req.query.limit) : 5,
    });
    const posts = await db.select().from(postsTable).where(
      and(eq(postsTable.workspaceId, params.workspaceId), eq(postsTable.status, "published"))
    ).orderBy(sql`${postsTable.totalEngagement} DESC NULLS LAST`).limit(params.limit ?? 5);
    const mapped = await Promise.all(posts.map(async (p) => {
      const { usersTable } = await import("@workspace/db");
      const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, p.authorId)).limit(1);
      return {
        id: p.id, workspaceId: p.workspaceId, authorId: p.authorId,
        authorName: user?.name ?? "Unknown", caption: p.caption,
        mediaUrls: p.mediaUrls ?? [], mediaType: p.mediaType,
        platforms: p.platforms ?? [], hashtags: p.hashtags ?? [],
        status: p.status, scheduledAt: p.scheduledAt?.toISOString() ?? null,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        totalReach: p.totalReach ?? null, totalEngagement: p.totalEngagement ?? null,
        campaignId: p.campaignId ?? null, aiGenerated: p.aiGenerated,
        createdAt: p.createdAt.toISOString(),
      };
    }));
    res.json(mapped);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get top posts" });
  }
});

router.get("/analytics/platform-breakdown", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetPlatformBreakdownQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      period: req.query.period ?? "30d",
    });
    const accounts = await db.select().from(socialAccountsTable).where(eq(socialAccountsTable.workspaceId, workspaceId));
    const breakdown = accounts.map(a => ({
      platform: a.platform,
      followers: a.followers,
      reach: Math.floor(a.followers * 0.12),
      engagement: Math.floor(a.followers * 0.04),
      posts: Math.floor(Math.random() * 20) + 5,
      engagementRate: parseFloat((3.5 + Math.random() * 3).toFixed(2)),
    }));
    res.json(breakdown);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get platform breakdown" });
  }
});

export default router;
