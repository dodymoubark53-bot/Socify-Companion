import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { workspacesTable, workspaceMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth, signToken, type AuthenticatedRequest } from "../middlewares/auth";
import { sendEmail, passwordResetEmail } from "../lib/email";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const body = RegisterBody.parse(req.body);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const [user] = await db.insert(usersTable).values({
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      role: "user",
    }).returning();

    const slug = body.name.toLowerCase().replace(/\s+/g, "-") + "-" + user.id;
    const [workspace] = await db.insert(workspacesTable).values({
      name: `${body.name}'s Workspace`,
      slug,
      plan: "free",
      ownerId: user.id,
    }).returning();

    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    await db.update(usersTable).set({ currentWorkspaceId: workspace.id }).where(eq(usersTable.id, user.id));

    const token = signToken(user.id, workspace.id);
    res.status(201).json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        avatar: user.avatar ?? null, role: user.role,
        currentWorkspaceId: workspace.id,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const body = LoginBody.parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.email.toLowerCase())).limit(1);
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const token = signToken(user.id, user.currentWorkspaceId ?? undefined);
    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        avatar: user.avatar ?? null, role: user.role,
        currentWorkspaceId: user.currentWorkspaceId ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ message: "Login failed" });
  }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: "If that email exists, a reset link has been sent." });
      return;
    }

    const token = signToken(user.id, undefined, "1h");
    const appUrl = process.env["CLIENT_URL"] ?? "https://socify.app";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your SOCIFY password",
      html: passwordResetEmail(user.name, resetUrl),
      text: `Reset your password: ${resetUrl}`,
    });

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to process request" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ message: "Token and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }
    // Verify the reset token (it's a JWT signed with the user's id, expires 1h)
    let userId: number;
    try {
      const jwt = await import("jsonwebtoken");
      const secret = process.env["SESSION_SECRET"] ?? "dev-secret-change-me";
      const payload = jwt.default.verify(token, secret) as { userId: number };
      userId = payload.userId;
    } catch {
      res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      return;
    }
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) { res.status(404).json({ message: "User not found" }); return; }
    res.json({
      id: user.id, name: user.name, email: user.email,
      avatar: user.avatar ?? null, role: user.role,
      currentWorkspaceId: user.currentWorkspaceId ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ message: "Failed to get user" });
  }
});

export default router;
