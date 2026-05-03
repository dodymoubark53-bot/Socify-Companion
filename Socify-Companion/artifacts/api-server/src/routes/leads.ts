import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, usersTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import {
  ListLeadsQueryParams, CreateLeadBody, GetLeadParams,
  UpdateLeadBody, GetLeadPipelineQueryParams
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

async function leadToResponse(l: typeof leadsTable.$inferSelect) {
  let assignedToName: string | null = null;
  if (l.assignedToId) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, l.assignedToId)).limit(1);
    assignedToName = u?.name ?? null;
  }
  return {
    id: l.id, workspaceId: l.workspaceId, name: l.name,
    email: l.email ?? null, phone: l.phone ?? null,
    company: l.company ?? null, position: l.position ?? null,
    avatar: l.avatar ?? null, stage: l.stage, score: l.score,
    source: l.source, assignedToId: l.assignedToId ?? null, assignedToName,
    tags: l.tags ?? [], notes: l.notes ?? null,
    estimatedValue: l.estimatedValue ? parseFloat(l.estimatedValue as string) : null,
    nextFollowUpDate: l.nextFollowUpDate?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/leads/pipeline", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = GetLeadPipelineQueryParams.parse({ workspaceId: Number(req.query.workspaceId) });
    const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
    const leads = await db.select().from(leadsTable).where(eq(leadsTable.workspaceId, workspaceId));
    const pipeline = stages.map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage);
      return {
        stage,
        count: stageLeads.length,
        totalValue: stageLeads.reduce((sum, l) => sum + (l.estimatedValue ? parseFloat(l.estimatedValue as string) : 0), 0),
      };
    });
    res.json(pipeline);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get lead pipeline" });
  }
});

router.get("/leads", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const params = ListLeadsQueryParams.parse({
      workspaceId: Number(req.query.workspaceId),
      stage: req.query.stage,
      search: req.query.search,
    });
    const conditions = [eq(leadsTable.workspaceId, params.workspaceId)];
    if (params.stage) conditions.push(eq(leadsTable.stage, params.stage));
    if (params.search) conditions.push(ilike(leadsTable.name, `%${params.search}%`));
    const leads = await db.select().from(leadsTable)
      .where(and(...conditions))
      .orderBy(sql`${leadsTable.createdAt} DESC`);
    res.json(await Promise.all(leads.map(leadToResponse)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list leads" });
  }
});

router.post("/leads", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = CreateLeadBody.parse(req.body);
    const [lead] = await db.insert(leadsTable).values({
      workspaceId: body.workspaceId, name: body.name,
      email: body.email ?? null, phone: body.phone ?? null,
      company: body.company ?? null, position: body.position ?? null,
      stage: body.stage ?? "new", source: body.source ?? "manual",
      tags: body.tags ?? [],
      estimatedValue: body.estimatedValue?.toString() ?? null,
      notes: body.notes ?? null,
    }).returning();
    res.status(201).json(await leadToResponse(lead));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create lead" });
  }
});

router.get("/leads/:leadId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { leadId } = GetLeadParams.parse({ leadId: Number(req.params.leadId) });
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId)).limit(1);
    if (!lead) { res.status(404).json({ message: "Lead not found" }); return; }
    res.json(await leadToResponse(lead));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get lead" });
  }
});

router.patch("/leads/:leadId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { leadId } = GetLeadParams.parse({ leadId: Number(req.params.leadId) });
    const body = UpdateLeadBody.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.company !== undefined) updateData.company = body.company;
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.score !== undefined) updateData.score = body.score;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.estimatedValue !== undefined) updateData.estimatedValue = body.estimatedValue?.toString();
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.nextFollowUpDate !== undefined) updateData.nextFollowUpDate = body.nextFollowUpDate ? new Date(body.nextFollowUpDate) : null;
    const [lead] = await db.update(leadsTable).set(updateData).where(eq(leadsTable.id, leadId)).returning();
    if (!lead) { res.status(404).json({ message: "Lead not found" }); return; }
    res.json(await leadToResponse(lead));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update lead" });
  }
});

router.delete("/leads/:leadId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { leadId } = GetLeadParams.parse({ leadId: Number(req.params.leadId) });
    await db.delete(leadsTable).where(eq(leadsTable.id, leadId));
    res.json({ message: "Lead deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete lead" });
  }
});

export default router;
