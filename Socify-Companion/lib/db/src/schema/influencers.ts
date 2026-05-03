import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const influencersTable = pgTable("influencers", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  email: text("email"),
  category: text("category").notNull().default("lifestyle"),
  tier: text("tier").notNull().default("micro"),
  followers: integer("followers").notNull().default(0),
  avgLikes: integer("avg_likes").notNull().default(0),
  avgComments: integer("avg_comments").notNull().default(0),
  engagementRate: numeric("engagement_rate", { precision: 5, scale: 2 }),
  avgReach: integer("avg_reach").notNull().default(0),
  location: text("location"),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("prospect"),
  tags: text("tags").array().notNull().default([]),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInfluencerSchema = createInsertSchema(influencersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInfluencer = z.infer<typeof insertInfluencerSchema>;
export type Influencer = typeof influencersTable.$inferSelect;
