import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeMediaServer, startStreaming, stopStreaming, getStreamStatus } from "./streaming";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertVideoSchema, insertStreamSettingsSchema } from "@shared/schema";

// Create uploads directory if it doesn't exist
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

export function registerRoutes(app: Express): Server {
  const mediaServer = initializeMediaServer();

  // Video routes
  app.get("/api/videos", async (_req, res) => {
    try {
      const videos = await storage.getVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.post("/api/videos", upload.single("video"), async (req, res) => {
    try {
      console.log("Received upload request:", {
        body: req.body,
        file: req.file,
        contentType: req.headers['content-type']
      });

      if (!req.file) {
        const error = "No video file uploaded";
        console.error(error);
        res.status(400).json({ error });
        return;
      }

      console.log("File received:", {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const result = insertVideoSchema.safeParse({
        title: req.body.title,
        description: req.body.description,
        filePath: req.file.path
      });

      if (!result.success) {
        const error = result.error.message;
        console.error("Validation error:", error);
        res.status(400).json({ error });
        return;
      }

      console.log("Creating video record with data:", result.data);
      const video = await storage.createVideo(result.data);
      console.log("Video record created:", video);

      res.json(video);
    } catch (error) {
      console.error("Error in video upload:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload video" 
      });
    }
  });

  app.put("/api/videos/:id/active", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.setVideoActive(id, req.body.active);
      res.json(video);
    } catch (error) {
      console.error("Error updating video active status:", error);
      res.status(500).json({ error: "Failed to update video status" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVideo(id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // Stream settings routes
  app.get("/api/stream-settings", async (_req, res) => {
    try {
      const settings = await storage.getStreamSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching stream settings:", error);
      res.status(500).json({ error: "Failed to fetch stream settings" });
    }
  });

  app.post("/api/stream-settings", async (req, res) => {
    try {
      const result = insertStreamSettingsSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error.message });
        return;
      }

      const settings = await storage.updateStreamSettings(result.data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating stream settings:", error);
      res.status(500).json({ error: "Failed to update stream settings" });
    }
  });

  // Streaming control routes
  app.post("/api/stream/start", async (_req, res) => {
    try {
      await startStreaming();
      res.json({ status: "streaming" });
    } catch (error) {
      console.error("Error starting stream:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/stream/stop", async (_req, res) => {
    try {
      await stopStreaming();
      res.json({ status: "stopped" });
    } catch (error) {
      console.error("Error stopping stream:", error);
      res.status(500).json({ error: "Failed to stop stream" });
    }
  });

  app.get("/api/stream/status", (_req, res) => {
    try {
      res.json(getStreamStatus());
    } catch (error) {
      console.error("Error getting stream status:", error);
      res.status(500).json({ error: "Failed to get stream status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}