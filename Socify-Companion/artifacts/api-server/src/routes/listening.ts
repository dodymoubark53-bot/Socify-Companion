import { Router } from "express";
import { db } from "@workspace/db";
import { listeningKeywordsTable, listeningMentionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListKeywordsQueryParams, CreateKeywordBody, ListMentionsQueryParams, GetListeningStatsQueryParams
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

router.get("/listening/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetListeningStatsQueryParams.parse({ workspaceId: Number(req.query.workspaceId) });
    const mentions = await db.select().from(listeningMentionsTable).where(eq(listeningMentionsTable.workspaceId, workspaceId));
    const total = mentions.length;
    const positive = mentions.filter(m => m.sentiment === "positive").length;
    const negative = mentions.filter(m => m.sentiment === "negative").length;
    const neutral = mentions.filter(m => m.sentiment === "neutral").length;
    const platforms = mentions.map(m => m.platform);
    const topPlatform = platforms.length > 0 ? (Object.entries(platforms.reduce((acc: Record<string, number>, p) => ({ ...acc, [p]: (acc[p] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "twitter") : "twitter";
    res.json({
      totalMentions: total,
      mentionsGrowth: 18.2,
      positivePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
      negativePercent: total > 0 ? Math.round((negative / total) * 100) : 0,
      neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
      topPlatform,
      avgReachPerMention: mentions.length > 0 ? mentions.reduce((sum, m) => sum + m.reach, 0) / mentions.length : 0,
      spikeAlerts: mentions.filter(m => m.isSpike).length,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get listening stats" });
  }
});

router.get("/listening/keywords", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = ListKeywordsQueryParams.parse({ workspaceId: Number(req.query.workspaceId) });
    const keywords = await db.select().from(listeningKeywordsTable).where(eq(listeningKeywordsTable.workspaceId, workspaceId));
    res.json(keywords.map(k => ({
      id: k.id, workspaceId: k.workspaceId, keyword: k.keyword,
      platforms: k.platforms ?? [], isActive: k.isActive,
      mentionsCount: k.mentionsCount,
      lastMentionAt: k.lastMentionAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list keywords" });
  }
});

router.post("/listening/keywords", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = CreateKeywordBody.parse(req.body);
    const [kw] = await db.insert(listeningKeywordsTable).values({
      workspaceId: body.workspaceId,
      keyword: body.keyword,
      platforms: body.platforms,
    }).returning();
    res.status(201).json({
      id: kw.id, workspaceId: kw.workspaceId, keyword: kw.keyword,
      platforms: kw.platforms ?? [], isActive: kw.isActive,
      mentionsCount: kw.mentionsCount,
      lastMentionAt: kw.lastMentionAt?.toISOString() ?? null,
      createdAt: kw.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create keyword" });
  }
});

router.get("/listening/mentions", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = ListMentionsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      keywordId: req.query.keywordId ? Number(req.query.keywordId) : undefined,
      sentiment: req.query.sentiment,
      platform: req.query.platform,
    });
    const conditions = [eq(listeningMentionsTable.workspaceId, params.workspaceId)];
    if (params.keywordId) conditions.push(eq(listeningMentionsTable.keywordId, params.keywordId));
    if (params.sentiment) conditions.push(eq(listeningMentionsTable.sentiment, params.sentiment));
    if (params.platform) conditions.push(eq(listeningMentionsTable.platform, params.platform));
    const mentions = await db.select().from(listeningMentionsTable).where(and(...conditions));
    res.json(mentions.map(m => ({
      id: m.id, workspaceId: m.workspaceId, keywordId: m.keywordId, keyword: m.keyword,
      platform: m.platform, authorName: m.authorName, authorHandle: m.authorHandle,
      authorAvatar: m.authorAvatar ?? null, authorFollowers: m.authorFollowers,
      content: m.content, url: m.url ?? null, sentiment: m.sentiment,
      sentimentScore: parseFloat(m.sentimentScore as string), likes: m.likes,
      shares: m.shares, comments: m.comments, reach: m.reach, isSpike: m.isSpike,
      publishedAt: m.publishedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list mentions" });
  }
});

export default router;
