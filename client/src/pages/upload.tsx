import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVideoSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";
import { Link, useLocation } from "wouter";
import { uploadVideo } from "@/lib/youtube";
import { queryClient } from "@/lib/queryClient";

export default function UploadPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertVideoSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  async function onSubmit(data: { title: string; description: string }) {
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("video", file);

      await uploadVideo(formData);
      
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Link href="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Video Title"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Video Description"
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="file"
                accept="video/*"
              />
            </div>

            <Button type="submit" disabled={uploading} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Video"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
