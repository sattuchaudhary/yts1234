import { videos, streamSettings, type Video, type InsertVideo, type StreamSettings } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private videos: Map<number, Video>;
  private streamSettings: StreamSettings | undefined;
  private currentVideoId: number;
  private currentSettingsId: number;

  constructor() {
    this.videos = new Map();
    this.currentVideoId = 1;
    this.currentSettingsId = 1;
  }

  async getVideos(): Promise<Video[]> {
    return Array.from(this.videos.values());
  }

  async getVideo(id: number): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.currentVideoId++;
    const video: Video = {
      ...insertVideo,
      id,
      active: false,
      uploadedAt: new Date(),
    };
    this.videos.set(id, video);
    return video;
  }

  async setVideoActive(id: number, active: boolean): Promise<Video> {
    const video = await this.getVideo(id);
    if (!video) throw new Error("Video not found");
    
    // Deactivate all other videos if this one is being activated
    if (active) {
      for (const [videoId, existingVideo] of this.videos) {
        if (videoId !== id && existingVideo.active) {
          this.videos.set(videoId, { ...existingVideo, active: false });
        }
      }
    }
    
    const updatedVideo = { ...video, active };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async deleteVideo(id: number): Promise<void> {
    this.videos.delete(id);
  }

  async getStreamSettings(): Promise<StreamSettings | undefined> {
    return this.streamSettings;
  }

  async updateStreamSettings(settings: Partial<StreamSettings>): Promise<StreamSettings> {
    if (!this.streamSettings) {
      this.streamSettings = {
        id: this.currentSettingsId++,
        youtubeStreamKey: settings.youtubeStreamKey || "",
        active: settings.active || false,
      };
    } else {
      this.streamSettings = {
        ...this.streamSettings,
        ...settings,
      };
    }
    return this.streamSettings;
  }
}

export const storage = new MemStorage();
