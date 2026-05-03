import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const socialAccountsTable = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id),
  platform: text("platform").notNull(),
  accountType: text("account_type").notNull().default("profile"),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  avatar: text("avatar"),
  isActive: boolean("is_active").notNull().default(true),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  avgEngagementRate: numeric("avg_engagement_rate", { precision: 5, scale: 2 }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSocialAccountSchema = createInsertSchema(socialAccountsTable).omit({ id: true, createdAt: true });
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialAccount = typeof socialAccountsTable.$inferSelect;
