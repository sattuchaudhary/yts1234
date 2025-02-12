import NodeMediaServer from "node-media-server";
import { storage } from "./storage";
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
  console.log("Starting stream to:", rtmpUrl);
  console.log("Using video file:", activeVideo.filePath);

  try {
    if (ffmpegProcess) {
      ffmpegProcess.kill();
    }

    // Use better FFmpeg settings for YouTube streaming
    ffmpegProcess = spawn('ffmpeg', [
      '-re',  // Read input at native frame rate
      '-i', activeVideo.filePath,
      '-c:v', 'libx264', // Use H.264 codec
      '-preset', 'veryfast', // Fast encoding
      '-b:v', '2500k', // Video bitrate
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-c:a', 'aac', // Audio codec
      '-b:a', '160k', // Audio bitrate
      '-ar', '44100', // Audio sample rate
      '-f', 'flv', // Output format
      rtmpUrl
    ]);

    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      console.log('FFmpeg Log:', data.toString());
    });

    ffmpegProcess.on('error', (err: Error) => {
      console.error('FFmpeg Error:', err);
      stopStreaming();
    });

    ffmpegProcess.on('exit', (code: number) => {
      console.log('FFmpeg process exited with code:', code);
      if (code !== 0) {
        stopStreaming();
      }
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
    ffmpegProcess.kill('SIGTERM');
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