import { Router } from "express";
import { db } from "@workspace/db";
import { automationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListAutomationsQueryParams, CreateAutomationBody, UpdateAutomationBody
} from "@workspace/api-zod";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

function autoToResponse(a: typeof automationsTable.$inferSelect) {
  return {
    id: a.id, workspaceId: a.workspaceId, name: a.name,
    description: a.description ?? null, isActive: a.isActive,
    triggerType: a.triggerType, actionTypes: a.actionTypes ?? [],
    runCount: a.runCount, lastRunAt: a.lastRunAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/automations", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { workspaceId } = ListAutomationsQueryParams.parse({ workspaceId: Number(req.query.workspaceId) });
    const automations = await db.select().from(automationsTable)
      .where(eq(automationsTable.workspaceId, workspaceId))
      .orderBy(sql`${automationsTable.createdAt} DESC`);
    res.json(automations.map(autoToResponse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to list automations" });
  }
});

router.post("/automations", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = CreateAutomationBody.parse(req.body);
    const [auto] = await db.insert(automationsTable).values({
      workspaceId: body.workspaceId, name: body.name,
      description: body.description ?? null,
      triggerType: body.triggerType,
      actionTypes: body.actionTypes,
    }).returning();
    res.status(201).json(autoToResponse(auto));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to create automation" });
  }
});

router.patch("/automations/:automationId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const automationId = Number(req.params.automationId);
    const body = UpdateAutomationBody.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.description !== undefined) updateData.description = body.description;
    const [auto] = await db.update(automationsTable).set(updateData).where(eq(automationsTable.id, automationId)).returning();
    if (!auto) { res.status(404).json({ message: "Automation not found" }); return; }
    res.json(autoToResponse(auto));
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Failed to update automation" });
  }
});

router.delete("/automations/:automationId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const automationId = Number(req.params.automationId);
    await db.delete(automationsTable).where(eq(automationsTable.id, automationId));
    res.json({ message: "Automation deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to delete automation" });
  }
});

export default router;
