import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeMediaServer, startStreaming, stopStreaming, getStreamStatus } from "./streaming";
import multer from "multer";
import path from "path";
import { insertVideoSchema, insertStreamSettingsSchema } from "@shared/schema";

const upload = multer({ dest: "uploads/" });

export function registerRoutes(app: Express): Server {
  const mediaServer = initializeMediaServer();
  
  // Video routes
  app.get("/api/videos", async (_req, res) => {
    const videos = await storage.getVideos();
    res.json(videos);
  });

  app.post("/api/videos", upload.single("video"), async (req, res) => {
    const result = insertVideoSchema.safeParse({
      title: req.body.title,
      description: req.body.description,
      filePath: req.file?.path
    });

    if (!result.success) {
      res.status(400).json({ error: "Invalid video data" });
      return;
    }

    const video = await storage.createVideo(result.data);
    res.json(video);
  });

  app.put("/api/videos/:id/active", async (req, res) => {
    const id = parseInt(req.params.id);
    const video = await storage.setVideoActive(id, req.body.active);
    res.json(video);
  });

  app.delete("/api/videos/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteVideo(id);
    res.status(204).end();
  });

  // Stream settings routes
  app.get("/api/stream-settings", async (_req, res) => {
    const settings = await storage.getStreamSettings();
    res.json(settings || {});
  });

  app.post("/api/stream-settings", async (req, res) => {
    const result = insertStreamSettingsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid stream settings" });
      return;
    }

    const settings = await storage.updateStreamSettings(result.data);
    res.json(settings);
  });

  // Streaming control routes
  app.post("/api/stream/start", async (_req, res) => {
    try {
      await startStreaming();
      res.json({ status: "streaming" });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/stream/stop", async (_req, res) => {
    await stopStreaming();
    res.json({ status: "stopped" });
  });

  app.get("/api/stream/status", (_req, res) => {
    res.json(getStreamStatus());
  });

  const httpServer = createServer(app);
  return httpServer;
}
