import { apiRequest } from "./queryClient";
import type { Video, StreamSettings } from "@shared/schema";

export async function uploadVideo(formData: FormData): Promise<Video> {
  console.log("Starting video upload...");

  // Log the FormData contents
  for (const [key, value] of formData.entries()) {
    console.log(`FormData ${key}:`, value instanceof File ? `File: ${value.name}` : value);
  }

  // Use fetch directly for file upload instead of apiRequest
  const res = await fetch("/api/videos", {
    method: "POST",
    // Don't set Content-Type header, let the browser set it with the boundary
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Upload failed with status:", res.status);
    console.error("Error response:", errorText);
    throw new Error(errorText || "Failed to upload video");
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