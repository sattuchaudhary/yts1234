import NodeMediaServer from "node-media-server";
import { storage } from "./storage";
import fs from "fs/promises";
import path from "path";

let nms: NodeMediaServer;
let currentStream: NodeJS.Timer | null = null;

export function initializeMediaServer() {
  const config = {
    rtmp: {
      port: 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60
    },
    http: {
      port: 8000,
      mediaroot: './media',
      allow_origin: '*'
    }
  };

  nms = new NodeMediaServer(config);
  nms.run();

  return nms;
}

export async function startStreaming() {
  if (currentStream) {
    return;
  }

  const settings = await storage.getStreamSettings();
  if (!settings || !settings.youtubeStreamKey) {
    throw new Error("Stream settings not configured");
  }

  const videos = await storage.getVideos();
  const activeVideo = videos.find(v => v.active);
  if (!activeVideo) {
    throw new Error("No active video selected");
  }

  // Start RTMP stream to YouTube
  const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${settings.youtubeStreamKey}`;
  
  // Start continuous streaming loop
  currentStream = setInterval(async () => {
    try {
      const session = nms.nodeRelaySession({
        ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
        inPath: activeVideo.filePath,
        outPath: rtmpUrl
      });
      
      session.run();
    } catch (error) {
      console.error("Streaming error:", error);
      await stopStreaming();
    }
  }, 100);

  await storage.updateStreamSettings({ ...settings, active: true });
}

export async function stopStreaming() {
  if (currentStream) {
    clearInterval(currentStream);
    currentStream = null;
  }
  
  const settings = await storage.getStreamSettings();
  if (settings) {
    await storage.updateStreamSettings({ ...settings, active: false });
  }
}

export function getStreamStatus() {
  return {
    isStreaming: currentStream !== null
  };
}
