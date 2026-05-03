import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workspacesTable } from "./workspaces";
import { usersTable } from "./users";

export const linkInBioTable = pgTable("link_in_bio", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  backgroundColor: text("background_color").notNull().default("#09090B"),
  accentColor: text("accent_color").notNull().default("#6366F1"),
  fontStyle: text("font_style").notNull().default("geist"),
  isPublished: boolean("is_published").notNull().default(false),
  totalClicks: integer("total_clicks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const linkInBioLinksTable = pgTable("link_in_bio_links", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().references(() => linkInBioTable.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  clicks: integer("clicks").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLinkInBioSchema = createInsertSchema(linkInBioTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLinkInBioLinkSchema = createInsertSchema(linkInBioLinksTable).omit({ id: true, createdAt: true });
export type InsertLinkInBio = z.infer<typeof insertLinkInBioSchema>;
export type LinkInBio = typeof linkInBioTable.$inferSelect;
export type LinkInBioLink = typeof linkInBioLinksTable.$inferSelect;
