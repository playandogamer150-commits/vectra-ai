import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SavedVideo } from "@shared/schema";
import {
    Download, Trash2, Video as VideoIcon, Play, ChevronDown, ChevronUp
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function getProxiedVideoUrl(url: string): string {
    if (!url) return url;
    const needsProxy = url.includes("r2.dev") ||
        url.includes("modelslab.com") ||
        url.includes("stablediffusionapi.com");
    if (needsProxy) {
        return `/api/proxy/media?url=${encodeURIComponent(url)}`;
    }
    return url;
}

interface VideoThumbnailProps {
    src: string;
    poster?: string;
    className?: string;
    onPlay?: () => void;
    onPause?: () => void;
}

function VideoThumbnail({ src, poster, className, onPlay, onPause }: VideoThumbnailProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    return (
        <video
            ref={videoRef}
            src={getProxiedVideoUrl(src)}
            poster={poster}
            className={className}
            muted
            loop
            playsInline
            preload="metadata"
            onMouseEnter={(e) => {
                e.currentTarget.play().catch(() => { });
                onPlay?.();
            }}
            onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
                onPause?.();
            }}
        />
    );
}

export default function GalleryVideosPage() {
    const { toast } = useToast();
    const { t, language } = useI18n();
    const [selectedVideo, setSelectedVideo] = useState<SavedVideo | null>(null);
    const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

    const { data: savedVideos, isLoading } = useQuery<SavedVideo[]>({
        queryKey: ["/api/video-gallery"],
    });

    const deleteVideoMutation = useMutation({
        mutationFn: async (videoId: string) => {
            return apiRequest("DELETE", `/api/video-gallery/${videoId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/video-gallery"] });
            toast({
                title: language === "pt-BR" ? "Vídeo excluído" : "Video deleted",
                description: language === "pt-BR"
                    ? "O vídeo foi removido da sua galeria."
                    : "The video has been removed from your gallery.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: language === "pt-BR" ? "Erro" : "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const downloadVideo = async (videoUrl: string, filename?: string) => {
        try {
            const proxyUrl = `/api/proxy/media?url=${encodeURIComponent(videoUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Download failed");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || `vectra-video-${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast({
                title: language === "pt-BR" ? "Erro" : "Error",
                description: language === "pt-BR" ? "Falha ao baixar vídeo" : "Failed to download video",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="min-h-screen bg-black text-white pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <VideoIcon className="w-6 h-6 text-white/60" />
                        <h1 className="text-2xl font-bold">{language === "pt-BR" ? "Galeria de Vídeos" : "Video Gallery"}</h1>
                    </div>
                    <p className="text-sm text-white/40">
                        {language === "pt-BR" ? "Seus vídeos gerados salvos" : "Your saved generated videos"}
                    </p>
                </div>

                {/* Gallery Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-64 bg-white/5" />
                        ))}
                    </div>
                ) : savedVideos && savedVideos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedVideos.map((video) => (
                            <Card key={video.id} className="bg-white/5 border-white/10 overflow-hidden group">
                                <div className="relative aspect-video overflow-hidden bg-black">
                                    <VideoThumbnail
                                        src={video.videoUrl}
                                        className="w-full h-full object-cover cursor-pointer"
                                    />
                                    <div
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        onClick={() => setSelectedVideo(video)}
                                    >
                                        <Play className="w-12 h-12 text-white" />
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 bg-black/60 hover:bg-black/80"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                downloadVideo(video.videoUrl, `vectra-${video.id}.mp4`);
                                            }}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="h-8 w-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteVideoMutation.mutate(video.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <Collapsible
                                        open={expandedVideoId === video.id}
                                        onOpenChange={(open) => setExpandedVideoId(open ? video.id : null)}
                                    >
                                        <CollapsibleTrigger className="w-full flex items-center justify-between text-xs text-white/60 hover:text-white">
                                            <span>{language === "pt-BR" ? "Detalhes" : "Details"}</span>
                                            {expandedVideoId === video.id ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 space-y-1 text-[10px] text-white/40">
                                            {video.prompt && (
                                                <p className="line-clamp-2">{video.prompt}</p>
                                            )}
                                            <p>ID: {video.id.slice(0, 8)}</p>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <VideoIcon className="w-16 h-16 mx-auto mb-4 text-white/20" />
                        <p className="text-white/40">
                            {language === "pt-BR" ? "Nenhum vídeo salvo ainda" : "No saved videos yet"}
                        </p>
                    </div>
                )}

                {/* Video Detail Modal */}
                <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
                    <DialogContent className="max-w-4xl bg-black border-white/10">
                        <DialogHeader>
                            <DialogTitle>{language === "pt-BR" ? "Detalhes do Vídeo" : "Video Details"}</DialogTitle>
                        </DialogHeader>
                        {selectedVideo && (
                            <div className="space-y-4">
                                <video
                                    src={getProxiedVideoUrl(selectedVideo.videoUrl)}
                                    controls
                                    className="w-full rounded-lg"
                                    autoPlay
                                    loop
                                />
                                {selectedVideo.prompt && (
                                    <div>
                                        <p className="text-xs text-white/60 mb-1">{language === "pt-BR" ? "Prompt:" : "Prompt:"}</p>
                                        <p className="text-sm text-white/80">{selectedVideo.prompt}</p>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={() => downloadVideo(selectedVideo.videoUrl, `vectra-${selectedVideo.id}.mp4`)}>
                                        <Download className="w-4 h-4 mr-2" />
                                        {language === "pt-BR" ? "Baixar" : "Download"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
