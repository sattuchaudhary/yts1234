import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(),
  active: boolean("active").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const streamSettings = pgTable("stream_settings", {
  id: serial("id").primaryKey(),
  youtubeStreamKey: text("youtube_stream_key").notNull(),
  active: boolean("active").default(false),
});

// Modified schema to be more lenient with the file path
export const insertVideoSchema = createInsertSchema(videos)
  .omit({
    id: true,
    uploadedAt: true,
    active: true,
  })
  .extend({
    title: z.string().min(1, "शीर्षक आवश्यक है"),
    description: z.string().optional(),
    filePath: z.string().optional(), // Make filePath optional since it's handled by multer
  });

export const insertStreamSettingsSchema = createInsertSchema(streamSettings).omit({
  id: true,
  active: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
export type StreamSettings = typeof streamSettings.$inferSelect;