import cron from "node-cron";
import { db } from "@workspace/db";
import { postsTable, notificationsTable } from "@workspace/db";
import { eq, and, lte, gte } from "drizzle-orm";
import { logger } from "../lib/logger";

export function startScheduler() {
  // Every minute: publish posts that are scheduled and due
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const duePosts = await db.select().from(postsTable).where(
        and(
          eq(postsTable.status, "scheduled"),
          lte(postsTable.scheduledAt, now)
        )
      );
      for (const post of duePosts) {
        await db.update(postsTable).set({
          status: "published",
          publishedAt: now,
          totalReach: Math.floor(Math.random() * 10000) + 1000,
          totalEngagement: Math.floor(Math.random() * 800) + 100,
        }).where(eq(postsTable.id, post.id));

        await db.insert(notificationsTable).values({
          workspaceId: post.workspaceId,
          userId: post.authorId,
          type: "post_published",
          title: "Post published",
          message: `Your post was published to ${post.platforms?.join(", ")}`,
          link: "/analytics",
        });

        logger.info({ postId: post.id }, "Post auto-published by scheduler");
      }
      if (duePosts.length > 0) {
        logger.info({ count: duePosts.length }, "Scheduler published posts");
      }
    } catch (err) {
      logger.error({ err }, "Post scheduler error");
    }
  });

  // Every Monday at 9am: weekly digest notifications
  cron.schedule("0 9 * * 1", async () => {
    try {
      logger.info("Running weekly digest job");
      const published = await db.select().from(postsTable).where(eq(postsTable.status, "published"));
      const totalReach = published.reduce((sum, p) => sum + (p.totalReach ?? 0), 0);
      const totalEngagement = published.reduce((sum, p) => sum + (p.totalEngagement ?? 0), 0);

      const workspaceIds = [...new Set(published.map(p => p.workspaceId))];
      for (const wsId of workspaceIds) {
        const wsPosts = published.filter(p => p.workspaceId === wsId);
        if (wsPosts.length === 0) continue;
        const authorId = wsPosts[0].authorId;
        await db.insert(notificationsTable).values({
          workspaceId: wsId, userId: authorId,
          type: "weekly_digest",
          title: "Your weekly performance report",
          message: `This week: ${wsPosts.length} posts published, ${totalReach.toLocaleString()} total reach, ${totalEngagement.toLocaleString()} engagements.`,
          link: "/analytics",
        });
      }
      logger.info("Weekly digest sent");
    } catch (err) {
      logger.error({ err }, "Weekly digest error");
    }
  });

  logger.info("Background job scheduler started");
}
