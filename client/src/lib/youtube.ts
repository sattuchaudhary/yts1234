import { apiRequest } from "./queryClient";
import type { Video, StreamSettings } from "@shared/schema";

export async function uploadVideo(formData: FormData): Promise<Video> {
  const res = await fetch("/api/videos", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!res.ok) {
    throw new Error("Failed to upload video");
  }
  
  return res.json();
}

export async function updateStreamSettings(settings: Partial<StreamSettings>): Promise<StreamSettings> {
  const res = await apiRequest("POST", "/api/stream-settings", settings);
  return res.json();
}

export async function startStream(): Promise<void> {
  await apiRequest("POST", "/api/stream/start");
}

export async function stopStream(): Promise<void> {
  await apiRequest("POST", "/api/stream/stop");
}
