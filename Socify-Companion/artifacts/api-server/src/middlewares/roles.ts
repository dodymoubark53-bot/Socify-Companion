import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { workspaceMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { type AuthenticatedRequest } from "./auth";

type WorkspaceRole = "owner" | "admin" | "editor" | "viewer" | "analyst";

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  analyst: 2,
  viewer: 1,
};

export function requireRole(...allowedRoles: WorkspaceRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId;
    const workspaceId = Number(req.query["workspaceId"] ?? req.body?.workspaceId ?? req.params["workspaceId"]);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!workspaceId || isNaN(workspaceId)) {
      res.status(400).json({ message: "workspaceId is required" });
      return;
    }

    try {
      const [member] = await db
        .select({ role: workspaceMembersTable.role })
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, workspaceId),
            eq(workspaceMembersTable.userId, userId),
          ),
        )
        .limit(1);

      if (!member) {
        res.status(403).json({ message: "You are not a member of this workspace" });
        return;
      }

      const userLevel = ROLE_HIERARCHY[member.role as WorkspaceRole] ?? 0;
      const hasPermission = allowedRoles.some(
        (role) => userLevel >= ROLE_HIERARCHY[role],
      );

      if (!hasPermission) {
        res.status(403).json({
          message: `Required role: ${allowedRoles.join(" or ")}. Your role: ${member.role}`,
        });
        return;
      }

      (req as any).workspaceRole = member.role;
      next();
    } catch (err) {
      res.status(500).json({ message: "Failed to check permissions" });
    }
  };
}

export const requireOwner = requireRole("owner");
export const requireAdmin = requireRole("owner", "admin");
export const requireEditor = requireRole("owner", "admin", "editor");
export const requireAnalyst = requireRole("owner", "admin", "editor", "analyst");
