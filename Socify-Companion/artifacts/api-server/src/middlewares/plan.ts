import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { workspacesTable, postsTable, socialAccountsTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";
import { type AuthenticatedRequest } from "./auth";

type PlanName = "free" | "pro" | "agency" | "enterprise";

const PLAN_LIMITS: Record<PlanName, Record<string, number>> = {
  free: {
    postsPerMonth: 30,
    socialAccounts: 3,
    teamMembers: 1,
    scheduledPosts: 10,
    aiGenerations: 10,
  },
  pro: {
    postsPerMonth: 200,
    socialAccounts: 10,
    teamMembers: 5,
    scheduledPosts: 100,
    aiGenerations: 100,
  },
  agency: {
    postsPerMonth: 1000,
    socialAccounts: 50,
    teamMembers: 25,
    scheduledPosts: 500,
    aiGenerations: 500,
  },
  enterprise: {
    postsPerMonth: Infinity,
    socialAccounts: Infinity,
    teamMembers: Infinity,
    scheduledPosts: Infinity,
    aiGenerations: Infinity,
  },
};

async function getWorkspacePlan(workspaceId: number): Promise<PlanName> {
  const [ws] = await db
    .select({ plan: workspacesTable.plan })
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1);
  return (ws?.plan as PlanName) ?? "free";
}

export function checkPlanLimit(resource: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const workspaceId = Number(
      req.query["workspaceId"] ?? req.body?.workspaceId ?? req.params["workspaceId"],
    );

    if (!workspaceId || isNaN(workspaceId)) {
      next();
      return;
    }

    try {
      const plan = await getWorkspacePlan(workspaceId);
      const limits = PLAN_LIMITS[plan];

      if (!limits) {
        next();
        return;
      }

      const limit = limits[resource];
      if (limit === undefined || limit === Infinity) {
        next();
        return;
      }

      let currentCount = 0;

      if (resource === "postsPerMonth") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [result] = await db
          .select({ value: count() })
          .from(postsTable)
          .where(
            and(
              eq(postsTable.workspaceId, workspaceId),
              gte(postsTable.createdAt, startOfMonth),
            ),
          );
        currentCount = result?.value ?? 0;
      } else if (resource === "socialAccounts") {
        const [result] = await db
          .select({ value: count() })
          .from(socialAccountsTable)
          .where(eq(socialAccountsTable.workspaceId, workspaceId));
        currentCount = result?.value ?? 0;
      } else if (resource === "teamMembers") {
        const [result] = await db
          .select({ value: count() })
          .from(workspaceMembersTable)
          .where(eq(workspaceMembersTable.workspaceId, workspaceId));
        currentCount = result?.value ?? 0;
      }

      if (currentCount >= limit) {
        res.status(403).json({
          message: `Plan limit reached: ${resource} (${limit} allowed on ${plan} plan). Upgrade to continue.`,
          code: "PLAN_LIMIT_EXCEEDED",
          resource,
          limit,
          current: currentCount,
          plan,
        });
        return;
      }

      next();
    } catch (err) {
      next();
    }
  };
}
