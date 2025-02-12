import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStreamSettingsSchema, type Video, type StreamSettings } from "@shared/schema";
import { startStream, stopStream, updateStreamSettings } from "@/lib/youtube";
import { Link } from "wouter";
import { Play, Square, Upload, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const { data: streamSettings = {} } = useQuery<StreamSettings>({
    queryKey: ["/api/stream-settings"],
  });

  const { data: streamStatus = { isStreaming: false } } = useQuery<{ isStreaming: boolean }>({
    queryKey: ["/api/stream/status"],
    refetchInterval: 5000,
  });

  const form = useForm({
    resolver: zodResolver(insertStreamSettingsSchema),
    defaultValues: {
      youtubeStreamKey: streamSettings?.youtubeStreamKey || "",
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateStreamSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stream-settings"] });
      toast({
        title: "Settings updated",
        description: "Your stream settings have been saved.",
      });
    },
  });

  const startStreamMutation = useMutation({
    mutationFn: startStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stream/status"] });
      toast({
        title: "Stream started",
        description: "Your stream is now live on YouTube.",
      });
    },
  });

  const stopStreamMutation = useMutation({
    mutationFn: stopStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stream/status"] });
      toast({
        title: "Stream stopped",
        description: "Your stream has been stopped.",
      });
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stream Dashboard</h1>
        <Link href="/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stream Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => startStreamMutation.mutate()}
                  disabled={streamStatus.isStreaming || startStreamMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Stream
                </Button>
                <Button
                  onClick={() => stopStreamMutation.mutate()}
                  disabled={!streamStatus.isStreaming || stopStreamMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop Stream
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${streamStatus.isStreaming ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">
                  {streamStatus.isStreaming ? 'Streaming' : 'Offline'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stream Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="YouTube Stream Key"
                  {...form.register("youtubeStreamKey")}
                />
                {form.formState.errors.youtubeStreamKey && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.youtubeStreamKey.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={updateSettingsMutation.isPending}>
                <Settings className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {videos.map((video) => (
              <Card key={video.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{video.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{video.description}</p>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${video.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-600">
                      {video.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}