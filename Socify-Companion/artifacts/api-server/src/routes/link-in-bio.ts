import { Router } from "express";
import { db } from "@workspace/db";
import { linkInBioTable, linkInBioLinksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

async function pageToResponse(p: typeof linkInBioTable.$inferSelect) {
  const links = await db.select().from(linkInBioLinksTable)
    .where(eq(linkInBioLinksTable.pageId, p.id))
    .orderBy(linkInBioLinksTable.sortOrder);
  return {
    id: p.id, workspaceId: p.workspaceId, userId: p.userId,
    slug: p.slug, title: p.title, bio: p.bio ?? null, avatar: p.avatar ?? null,
    backgroundColor: p.backgroundColor, accentColor: p.accentColor,
    fontStyle: p.fontStyle, isPublished: p.isPublished,
    totalClicks: p.totalClicks, createdAt: p.createdAt.toISOString(),
    links: links.map(l => ({
      id: l.id, title: l.title, url: l.url, icon: l.icon ?? null,
      isActive: l.isActive, clicks: l.clicks, sortOrder: l.sortOrder,
    })),
  };
}

router.get("/link-in-bio", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = Number(req.query.workspaceId);
    const pages = await db.select().from(linkInBioTable).where(eq(linkInBioTable.workspaceId, workspaceId));
    res.json(await Promise.all(pages.map(pageToResponse)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list pages" });
  }
});

router.post("/link-in-bio", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body;
    const slug = b.slug ?? `${b.title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const [page] = await db.insert(linkInBioTable).values({
      workspaceId: b.workspaceId, userId: req.userId!, slug,
      title: b.title, bio: b.bio ?? null, avatar: b.avatar ?? null,
      backgroundColor: b.backgroundColor ?? "#09090B",
      accentColor: b.accentColor ?? "#6366F1",
      fontStyle: b.fontStyle ?? "geist",
    }).returning();
    res.status(201).json(await pageToResponse(page));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create page" });
  }
});

router.patch("/link-in-bio/:pageId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const pageId = Number(req.params.pageId);
    const b = req.body;
    const updateData: Record<string, unknown> = {};
    const allowed = ["title","bio","avatar","backgroundColor","accentColor","fontStyle","isPublished"];
    for (const key of allowed) { if (b[key] !== undefined) updateData[key] = b[key]; }
    const [page] = await db.update(linkInBioTable).set(updateData).where(eq(linkInBioTable.id, pageId)).returning();
    if (!page) { res.status(404).json({ message: "Page not found" }); return; }
    res.json(await pageToResponse(page));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update page" });
  }
});

router.post("/link-in-bio/:pageId/links", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const pageId = Number(req.params.pageId);
    const b = req.body;
    const existing = await db.select().from(linkInBioLinksTable).where(eq(linkInBioLinksTable.pageId, pageId));
    const [link] = await db.insert(linkInBioLinksTable).values({
      pageId, title: b.title, url: b.url, icon: b.icon ?? null,
      sortOrder: existing.length,
    }).returning();
    res.status(201).json(link);
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to add link" });
  }
});

router.delete("/link-in-bio/:pageId/links/:linkId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await db.delete(linkInBioLinksTable).where(eq(linkInBioLinksTable.id, Number(req.params.linkId)));
    res.json({ message: "Link deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete link" });
  }
});

router.delete("/link-in-bio/:pageId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const pageId = Number(req.params.pageId);
    await db.delete(linkInBioLinksTable).where(eq(linkInBioLinksTable.pageId, pageId));
    await db.delete(linkInBioTable).where(eq(linkInBioTable.id, pageId));
    res.json({ message: "Page deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete page" });
  }
});

export default router;
