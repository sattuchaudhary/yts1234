import { videos, streamSettings, type Video, type InsertVideo, type StreamSettings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Video operations
  getVideos(): Promise<Video[]>;
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  setVideoActive(id: number, active: boolean): Promise<Video>;
  deleteVideo(id: number): Promise<void>;

  // Stream settings operations
  getStreamSettings(): Promise<StreamSettings | undefined>;
  updateStreamSettings(settings: Partial<StreamSettings>): Promise<StreamSettings>;
}

export class DatabaseStorage implements IStorage {
  async getVideos(): Promise<Video[]> {
    return await db.select().from(videos);
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async setVideoActive(id: number, active: boolean): Promise<Video> {
    // Deactivate all other videos if this one is being activated
    if (active) {
      await db
        .update(videos)
        .set({ active: false })
        .where(eq(videos.active, true));
    }

    const [updatedVideo] = await db
      .update(videos)
      .set({ active })
      .where(eq(videos.id, id))
      .returning();

    if (!updatedVideo) {
      throw new Error("Video not found");
    }

    return updatedVideo;
  }

  async deleteVideo(id: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  async getStreamSettings(): Promise<StreamSettings | undefined> {
    const [settings] = await db.select().from(streamSettings);
    return settings;
  }

  async updateStreamSettings(settings: Partial<StreamSettings>): Promise<StreamSettings> {
    const currentSettings = await this.getStreamSettings();

    if (!currentSettings) {
      // Create new settings
      const [newSettings] = await db
        .insert(streamSettings)
        .values(settings)
        .returning();
      return newSettings;
    }

    // Update existing settings
    const [updatedSettings] = await db
      .update(streamSettings)
      .set(settings)
      .where(eq(streamSettings.id, currentSettings.id))
      .returning();

    return updatedSettings;
  }
}

export const storage = new DatabaseStorage();