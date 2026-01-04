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
    Download, Trash2, Video as VideoIcon, Play, Clock, Film
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
            setSelectedVideo(null);
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString(language === "pt-BR" ? "pt-BR" : "en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
                                        poster={video.thumbnailUrl || undefined}
                                        className="w-full h-full object-cover"
                                    />

                                    {/* Duration Badge */}
                                    <Badge className="absolute top-2 left-2 bg-black/70 backdrop-blur text-xs">
                                        {video.durationSeconds}s
                                    </Badge>

                                    {/* Play Button Overlay */}
                                    <div
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        onClick={() => setSelectedVideo(video)}
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                            <Play className="w-8 h-8 text-white ml-1" />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
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
                                                if (confirm(language === "pt-BR" ? "Excluir este vídeo?" : "Delete this video?")) {
                                                    deleteVideoMutation.mutate(video.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Quick Info Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white/80 line-clamp-2">{video.prompt}</p>
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(video.createdAt)}
                                    </div>
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
                    <DialogContent className="max-w-5xl bg-black border-white/10 text-white max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{language === "pt-BR" ? "Detalhes do Vídeo" : "Video Details"}</DialogTitle>
                        </DialogHeader>
                        {selectedVideo && (
                            <div className="space-y-4">
                                {/* Video Player */}
                                <video
                                    src={getProxiedVideoUrl(selectedVideo.videoUrl)}
                                    controls
                                    className="w-full rounded-lg bg-black"
                                    autoPlay
                                    loop
                                    poster={selectedVideo.thumbnailUrl || undefined}
                                />

                                {/* Prompt */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-white/80">{language === "pt-BR" ? "Prompt:" : "Prompt:"}</h3>
                                    <p className="text-sm text-white/60 bg-white/5 p-3 rounded-lg">{selectedVideo.prompt}</p>
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {selectedVideo.aspectRatio && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Proporção" : "Aspect Ratio"}</p>
                                            <p className="text-sm text-white/80">{selectedVideo.aspectRatio}</p>
                                        </div>
                                    )}
                                    <div className="bg-white/5 p-3 rounded-lg">
                                        <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Duração" : "Duration"}</p>
                                        <p className="text-sm text-white/80">{selectedVideo.durationSeconds}s</p>
                                    </div>
                                    {selectedVideo.jobId && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">Job ID</p>
                                            <p className="text-sm text-white/80 font-mono truncate">{selectedVideo.jobId}</p>
                                        </div>
                                    )}
                                    {selectedVideo.createdAt && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Data de Criação" : "Created At"}</p>
                                            <p className="text-sm text-white/80">{formatDate(selectedVideo.createdAt)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={() => downloadVideo(selectedVideo.videoUrl, `vectra-${selectedVideo.id}.mp4`)} className="flex-1">
                                        <Download className="w-4 h-4 mr-2" />
                                        {language === "pt-BR" ? "Baixar" : "Download"}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (confirm(language === "pt-BR" ? "Excluir este vídeo?" : "Delete this video?")) {
                                                deleteVideoMutation.mutate(selectedVideo.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {language === "pt-BR" ? "Excluir" : "Delete"}
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
