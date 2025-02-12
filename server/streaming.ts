import NodeMediaServer from "node-media-server";
import { storage } from "./storage";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

let nms: NodeMediaServer;
let currentStream: NodeJS.Timer | null = null;
let ffmpegProcess: any = null;

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

  // Start RTMP stream to YouTube using ffmpeg
  const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${settings.youtubeStreamKey}`;

  try {
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }

    ffmpegProcess = spawn('ffmpeg', [
      '-re',
      '-i', activeVideo.filePath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-f', 'flv',
      rtmpUrl
    ]);

    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      console.log('FFmpeg Log:', data.toString());
    });

    ffmpegProcess.on('error', (err: Error) => {
      console.error('FFmpeg Error:', err);
      stopStreaming();
    });

    currentStream = setInterval(() => {
      // Keep alive check
      if (ffmpegProcess && ffmpegProcess.exitCode !== null) {
        console.log('FFmpeg process exited, restarting...');
        stopStreaming();
        startStreaming();
      }
    }, 5000);

    await storage.updateStreamSettings({ ...settings, active: true });
  } catch (error) {
    console.error("Streaming error:", error);
    await stopStreaming();
    throw error;
  }
}

export async function stopStreaming() {
  if (currentStream) {
    clearInterval(currentStream);
    currentStream = null;
  }

  if (ffmpegProcess) {
    ffmpegProcess.kill();
    ffmpegProcess = null;
  }

  const settings = await storage.getStreamSettings();
  if (settings) {
    await storage.updateStreamSettings({ ...settings, active: false });
  }
}

export function getStreamStatus() {
  return {
    isStreaming: currentStream !== null && ffmpegProcess !== null
  };
}