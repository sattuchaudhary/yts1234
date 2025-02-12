import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVideoSchema, type InsertVideo } from "@shared/schema";
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const form = useForm<InsertVideo>({
    resolver: zodResolver(insertVideoSchema),
    defaultValues: {
      title: "",
      description: "",
      filePath: undefined,
    },
  });

  async function onSubmit(data: InsertVideo) {
    console.log("Form submitted with data:", data);
    console.log("Selected file:", selectedFile);

    if (!selectedFile) {
      toast({
        title: "त्रुटि",
        description: "कृपया एक वीडियो फ़ाइल चुनें",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile.type.startsWith('video/')) {
      toast({
        title: "त्रुटि",
        description: "कृपया एक वैध वीडियो फ़ाइल चुनें",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress("अपलोड शुरू हो रहा है...");

    try {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("video", selectedFile);

      setUploadProgress("वीडियो अपलोड हो रहा है...");
      console.log("Starting upload with FormData:", {
        title: data.title,
        description: data.description,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      const video = await uploadVideo(formData);
      console.log("Upload successful:", video);

      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "सफल",
        description: "वीडियो सफलतापूर्वक अपलोड हो गया",
      });
      navigate("/");
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "त्रुटि",
        description: error instanceof Error ? error.message : "वीडियो अपलोड करने में विफल",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name, file.type, file.size);
      setSelectedFile(file);
    }
  };

  console.log("Form state:", {
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
  });

  return (
    <div className="container mx-auto p-6">
      <Link href="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          डैशबोर्ड पर वापस जाएं
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>वीडियो अपलोड करें</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submission started");
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                placeholder="वीडियो का शीर्षक"
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
                placeholder="वीडियो का विवरण"
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
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  चयनित फ़ाइल: {selectedFile.name}
                </p>
              )}
              {uploadProgress && (
                <p className="text-sm text-blue-500">{uploadProgress}</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={uploading || !selectedFile} 
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "अपलोड हो रहा है..." : "वीडियो अपलोड करें"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}