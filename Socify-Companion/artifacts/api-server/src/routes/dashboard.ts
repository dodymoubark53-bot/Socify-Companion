import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable, inboxMessagesTable, campaignsTable, leadsTable,
  listeningMentionsTable, socialAccountsTable, notificationsTable
} from "@workspace/db";
import { eq, and, gte, sql, count } from "drizzle-orm";
import {
  GetDashboardSummaryQueryParams, GetRecentActivityQueryParams, GetUpcomingPostsQueryParams
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetDashboardSummaryQueryParams.parse({ workspaceId: Number(req.query.workspaceId) });
    const accounts = await db.select().from(socialAccountsTable).where(eq(socialAccountsTable.workspaceId, workspaceId));
    const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);

    const [scheduledRes] = await db.select({ cnt: count() }).from(postsTable)
      .where(and(eq(postsTable.workspaceId, workspaceId), eq(postsTable.status, "scheduled")));
    const [publishedRes] = await db.select({ cnt: count() }).from(postsTable)
      .where(and(eq(postsTable.workspaceId, workspaceId), eq(postsTable.status, "published")));
    const [unreadRes] = await db.select({ cnt: count() }).from(inboxMessagesTable)
      .where(and(eq(inboxMessagesTable.workspaceId, workspaceId), eq(inboxMessagesTable.status, "unread")));
    const [activeCampaignsRes] = await db.select({ cnt: count() }).from(campaignsTable)
      .where(and(eq(campaignsTable.workspaceId, workspaceId), eq(campaignsTable.status, "active")));
    const [openLeadsRes] = await db.select({ cnt: count() }).from(leadsTable)
      .where(and(eq(leadsTable.workspaceId, workspaceId), sql`${leadsTable.stage} NOT IN ('won','lost')`));

    const today = new Date(); today.setHours(0,0,0,0);
    const [mentionsRes] = await db.select({ cnt: count() }).from(listeningMentionsTable)
      .where(and(eq(listeningMentionsTable.workspaceId, workspaceId), gte(listeningMentionsTable.publishedAt, today)));

    res.json({
      totalFollowers,
      followerGrowth: 5.2,
      scheduledPosts: scheduledRes?.cnt ?? 0,
      publishedPosts: publishedRes?.cnt ?? 0,
      unreadMessages: unreadRes?.cnt ?? 0,
      activeCampaigns: activeCampaignsRes?.cnt ?? 0,
      openLeads: openLeadsRes?.cnt ?? 0,
      mentionsToday: mentionsRes?.cnt ?? 0,
      engagementRate: 3.8,
      reachThisWeek: Math.floor(totalFollowers * 0.15),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get dashboard summary" });
  }
});

router.get("/dashboard/activity", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = GetRecentActivityQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });
    const posts = await db.select().from(postsTable).where(eq(postsTable.workspaceId, params.workspaceId))
      .orderBy(sql`${postsTable.createdAt} DESC`).limit(params.limit ?? 10);
    const activities = posts.map((p, i) => ({
      id: i + 1,
      type: p.status === "published" ? "post_published" : "post_scheduled",
      title: p.status === "published" ? "Post published" : "Post scheduled",
      description: p.caption.slice(0, 80) + (p.caption.length > 80 ? "..." : ""),
      actorName: "Team Member",
      actorAvatar: null,
      platform: p.platforms?.[0] ?? null,
      createdAt: p.createdAt.toISOString(),
    }));
    res.json(activities);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get recent activity" });
  }
});

router.get("/dashboard/upcoming-posts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = GetUpcomingPostsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      limit: req.query.limit ? Number(req.query.limit) : 5,
    });
    const now = new Date();
    const posts = await db.select().from(postsTable)
      .where(and(
        eq(postsTable.workspaceId, params.workspaceId),
        eq(postsTable.status, "scheduled"),
        gte(postsTable.scheduledAt, now)
      ))
      .orderBy(postsTable.scheduledAt)
      .limit(params.limit ?? 5);

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
    res.status(500).json({ message: "Failed to get upcoming posts" });
  }
});

export default router;
