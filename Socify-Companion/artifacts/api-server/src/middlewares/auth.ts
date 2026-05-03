import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "socify-dev-secret-min-32-chars-long";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  workspaceId?: number;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; workspaceId?: number };
    req.userId = payload.userId;
    req.workspaceId = payload.workspaceId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function signToken(userId: number, workspaceId?: number, expiresIn: string = "7d") {
  return jwt.sign({ userId, workspaceId }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}
