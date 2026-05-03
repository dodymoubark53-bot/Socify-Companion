import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  ListPostsQueryParams, CreatePostBody, GetPostParams, UpdatePostBody,
  ApprovePostParams, GetCalendarPostsQueryParams
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

async function postToResponse(p: typeof postsTable.$inferSelect) {
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, p.authorId)).limit(1);
  return {
    id: p.id, workspaceId: p.workspaceId, authorId: p.authorId,
    authorName: user?.name ?? "Unknown",
    caption: p.caption, mediaUrls: p.mediaUrls ?? [],
    mediaType: p.mediaType, platforms: p.platforms ?? [],
    hashtags: p.hashtags ?? [], status: p.status,
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    totalReach: p.totalReach ?? null,
    totalEngagement: p.totalEngagement ?? null,
    campaignId: p.campaignId ?? null,
    aiGenerated: p.aiGenerated,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/posts/calendar", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId, startDate, endDate } = GetCalendarPostsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
    const posts = await db.select().from(postsTable).where(
      and(
        eq(postsTable.workspaceId, workspaceId),
        gte(postsTable.scheduledAt, new Date(startDate as string)),
        lte(postsTable.scheduledAt, new Date(endDate as string))
      )
    );
    res.json(await Promise.all(posts.map(postToResponse)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get calendar posts" });
  }
});

router.get("/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = ListPostsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      status: req.query.status,
      platform: req.query.platform,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(postsTable.workspaceId, params.workspaceId)];
    if (params.status) conditions.push(eq(postsTable.status, params.status));

    const posts = await db.select().from(postsTable)
      .where(and(...conditions))
      .orderBy(sql`${postsTable.createdAt} DESC`)
      .limit(limit).offset(offset);

    const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)` }).from(postsTable).where(and(...conditions));

    res.json({
      posts: await Promise.all(posts.map(postToResponse)),
      total: Number(cnt), page, totalPages: Math.ceil(Number(cnt) / limit),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list posts" });
  }
});

router.post("/posts", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = CreatePostBody.parse(req.body);
    const [post] = await db.insert(postsTable).values({
      workspaceId: body.workspaceId,
      authorId: req.userId!,
      caption: body.caption,
      mediaUrls: body.mediaUrls ?? [],
      mediaType: body.mediaType,
      platforms: body.platforms,
      hashtags: body.hashtags ?? [],
      status: body.status ?? "draft",
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      campaignId: body.campaignId ?? null,
    }).returning();
    res.status(201).json(await postToResponse(post));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create post" });
  }
});

router.get("/posts/:postId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { postId } = GetPostParams.parse({ postId: Number(req.params.postId) });
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post) { res.status(404).json({ message: "Post not found" }); return; }
    res.json(await postToResponse(post));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get post" });
  }
});

router.patch("/posts/:postId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { postId } = GetPostParams.parse({ postId: Number(req.params.postId) });
    const body = UpdatePostBody.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.caption !== undefined) updateData.caption = body.caption;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.scheduledAt !== undefined) updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.hashtags !== undefined) updateData.hashtags = body.hashtags;
    const [post] = await db.update(postsTable).set(updateData).where(eq(postsTable.id, postId)).returning();
    if (!post) { res.status(404).json({ message: "Post not found" }); return; }
    res.json(await postToResponse(post));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update post" });
  }
});

router.delete("/posts/:postId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { postId } = GetPostParams.parse({ postId: Number(req.params.postId) });
    await db.delete(postsTable).where(eq(postsTable.id, postId));
    res.json({ message: "Post deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

router.post("/posts/:postId/approve", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { postId } = ApprovePostParams.parse({ postId: Number(req.params.postId) });
    const [post] = await db.update(postsTable).set({ status: "approved" }).where(eq(postsTable.id, postId)).returning();
    if (!post) { res.status(404).json({ message: "Post not found" }); return; }
    res.json(await postToResponse(post));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to approve post" });
  }
});

export default router;
