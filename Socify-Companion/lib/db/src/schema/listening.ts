import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const listeningKeywordsTable = pgTable("listening_keywords", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id),
  keyword: text("keyword").notNull(),
  platforms: text("platforms").array().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  mentionsCount: integer("mentions_count").notNull().default(0),
  lastMentionAt: timestamp("last_mention_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listeningMentionsTable = pgTable("listening_mentions", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id),
  keywordId: integer("keyword_id").notNull().references(() => listeningKeywordsTable.id),
  keyword: text("keyword").notNull(),
  platform: text("platform").notNull(),
  authorName: text("author_name").notNull(),
  authorHandle: text("author_handle").notNull(),
  authorAvatar: text("author_avatar"),
  authorFollowers: integer("author_followers").notNull().default(0),
  content: text("content").notNull(),
  url: text("url"),
  sentiment: text("sentiment").notNull().default("neutral"),
  sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }).notNull().default("0"),
  likes: integer("likes").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  reach: integer("reach").notNull().default(0),
  isSpike: boolean("is_spike").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertListeningKeywordSchema = createInsertSchema(listeningKeywordsTable).omit({ id: true, createdAt: true });
export const insertListeningMentionSchema = createInsertSchema(listeningMentionsTable).omit({ id: true, createdAt: true });
export type InsertListeningKeyword = z.infer<typeof insertListeningKeywordSchema>;
export type ListeningKeyword = typeof listeningKeywordsTable.$inferSelect;
export type ListeningMention = typeof listeningMentionsTable.$inferSelect;
