import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStreamSettingsSchema, type Video, type StreamSettings } from "@shared/schema";
import { startStream, stopStream, updateStreamSettings, deleteVideo, setVideoActive } from "@/lib/youtube";
import { Link } from "wouter";
import { Play, Square, Upload, Settings, Trash2, CheckCircle } from "lucide-react";
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
        title: "सेटिंग्स अपडेट हुई",
        description: "आपकी स्ट्रीम सेटिंग्स सेव हो गई हैं।",
      });
    },
  });

  const startStreamMutation = useMutation({
    mutationFn: startStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stream/status"] });
      toast({
        title: "स्ट्रीम शुरू हुई",
        description: "आपकी स्ट्रीम YouTube पर लाइव है।",
      });
    },
  });

  const stopStreamMutation = useMutation({
    mutationFn: stopStream,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stream/status"] });
      toast({
        title: "स्ट्रीम रुकी",
        description: "आपकी स्ट्रीम रोक दी गई है।",
      });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "वीडियो हटाई गई",
        description: "वीडियो सफलतापूर्वक हटा दी गई है।",
      });
    },
  });

  const setVideoActiveMutation = useMutation({
    mutationFn: setVideoActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "वीडियो चुनी गई",
        description: "स्ट्रीमिंग के लिए वीडियो चुन ली गई है।",
      });
    },
  });

  const handleStartStream = async () => {
    const activeVideo = videos.find(v => v.active);
    if (!activeVideo) {
      toast({
        title: "त्रुटि",
        description: "कृपया पहले स्ट्रीम करने के लिए एक वीडियो चुनें।",
        variant: "destructive",
      });
      return;
    }
    startStreamMutation.mutate();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">स्ट्रीम डैशबोर्ड</h1>
        <Link href="/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            वीडियो अपलोड करें
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>स्ट्रीम नियंत्रण</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleStartStream}
                  disabled={streamStatus.isStreaming || startStreamMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Play className="mr-2 h-4 w-4" />
                  स्ट्रीम शुरू करें
                </Button>
                <Button
                  onClick={() => stopStreamMutation.mutate()}
                  disabled={!streamStatus.isStreaming || stopStreamMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Square className="mr-2 h-4 w-4" />
                  स्ट्रीम रोकें
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${streamStatus.isStreaming ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-600">
                  {streamStatus.isStreaming ? 'स्ट्रीमिंग चल रही है' : 'ऑफलाइन'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>स्ट्रीम सेटिंग्स</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => updateSettingsMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="YouTube स्ट्रीम की"
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
                सेटिंग्स सेव करें
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>वीडियो</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {videos.map((video) => (
              <Card key={video.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{video.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{video.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${video.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-600">
                        {video.active ? 'चयनित' : 'अचयनित'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setVideoActiveMutation.mutate({ id: video.id, active: !video.active })}
                        disabled={streamStatus.isStreaming}
                      >
                        <CheckCircle className={`h-4 w-4 ${video.active ? 'text-green-500' : 'text-gray-400'}`} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteVideoMutation.mutate(video.id)}
                        disabled={streamStatus.isStreaming}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
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