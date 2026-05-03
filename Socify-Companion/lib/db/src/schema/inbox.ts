import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";

export const inboxMessagesTable = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id),
  platform: text("platform").notNull(),
  type: text("type").notNull().default("comment"),
  senderName: text("sender_name").notNull(),
  senderHandle: text("sender_handle").notNull(),
  senderAvatar: text("sender_avatar"),
  content: text("content").notNull(),
  sentiment: text("sentiment").notNull().default("neutral"),
  sentimentScore: numeric("sentiment_score", { precision: 4, scale: 3 }).notNull().default("0"),
  status: text("status").notNull().default("unread"),
  isStarred: boolean("is_starred").notNull().default(false),
  assignedToId: integer("assigned_to_id"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInboxMessageSchema = createInsertSchema(inboxMessagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInboxMessage = z.infer<typeof insertInboxMessageSchema>;
export type InboxMessage = typeof inboxMessagesTable.$inferSelect;
