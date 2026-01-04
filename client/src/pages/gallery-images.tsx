import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SavedImage } from "@shared/schema";
import {
    Download, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, ExternalLink, Clock, Palette, Sparkles
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

export default function GalleryImagesPage() {
    const { toast } = useToast();
    const { t, language } = useI18n();
    const [selectedImage, setSelectedImage] = useState<SavedImage | null>(null);
    const [expandedImageId, setExpandedImageId] = useState<string | null>(null);

    const { data: savedImages, isLoading } = useQuery<SavedImage[]>({
        queryKey: ["/api/gallery"],
    });

    const deleteImageMutation = useMutation({
        mutationFn: async (imageId: string) => {
            return apiRequest("DELETE", `/api/gallery/${imageId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
            toast({
                title: language === "pt-BR" ? "Imagem excluída" : "Image deleted",
                description: language === "pt-BR"
                    ? "A imagem foi removida da sua galeria."
                    : "The image has been removed from your gallery.",
            });
            setSelectedImage(null);
        },
        onError: (error: Error) => {
            toast({
                title: language === "pt-BR" ? "Erro" : "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const downloadImage = async (imageUrl: string, filename?: string) => {
        try {
            const proxyUrl = `/api/proxy/media?url=${encodeURIComponent(imageUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Download failed");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || `vectra-image-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast({
                title: language === "pt-BR" ? "Erro" : "Error",
                description: language === "pt-BR" ? "Falha ao baixar imagem" : "Failed to download image",
                variant: "destructive",
            });
        }
    };

    const formatDate = (date: string | Date) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleString(language === "pt-BR" ? "pt-BR" : "en-US", {
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
                        <ImageIcon className="w-6 h-6 text-white/60" />
                        <h1 className="text-2xl font-bold">{language === "pt-BR" ? "Galeria de Imagens" : "Image Gallery"}</h1>
                    </div>
                    <p className="text-sm text-white/40">
                        {language === "pt-BR" ? "Suas imagens geradas salvas" : "Your saved generated images"}
                    </p>
                </div>

                {/* Gallery Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Skeleton key={i} className="h-64 bg-white/5" />
                        ))}
                    </div>
                ) : savedImages && savedImages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedImages.map((image) => (
                            <Card key={image.id} className="bg-white/5 border-white/10 overflow-hidden group">
                                <div className="relative aspect-square overflow-hidden cursor-pointer" onClick={() => setSelectedImage(image)}>
                                    <img
                                        src={image.imageUrl}
                                        alt={image.prompt || "Generated image"}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Quality Badge */}
                                    {image.metadata?.imageQuality && (
                                        <Badge className="absolute top-2 left-2 bg-black/70 backdrop-blur text-xs">
                                            {image.metadata.imageQuality === "hq" ? "HQ" : "Standard"}
                                        </Badge>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 bg-black/60 hover:bg-black/80"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                downloadImage(image.imageUrl, `vectra-${image.id}.png`);
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
                                                if (confirm(language === "pt-BR" ? "Excluir esta imagem?" : "Delete this image?")) {
                                                    deleteImageMutation.mutate(image.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Quick Info Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white/80 line-clamp-2">{image.prompt}</p>
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(image.createdAt)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-white/20" />
                        <p className="text-white/40">
                            {language === "pt-BR" ? "Nenhuma imagem salva ainda" : "No saved images yet"}
                        </p>
                    </div>
                )}

                {/* Image Detail Modal */}
                <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                    <DialogContent className="max-w-5xl bg-black border-white/10 text-white max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{language === "pt-BR" ? "Detalhes da Imagem" : "Image Details"}</DialogTitle>
                        </DialogHeader>
                        {selectedImage && (
                            <div className="space-y-4">
                                {/* Image */}
                                <img
                                    src={selectedImage.imageUrl}
                                    alt={selectedImage.prompt || "Generated image"}
                                    className="w-full rounded-lg"
                                />

                                {/* Prompt */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-white/80">{language === "pt-BR" ? "Prompt:" : "Prompt:"}</h3>
                                    <p className="text-sm text-white/60 bg-white/5 p-3 rounded-lg">{selectedImage.prompt}</p>
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {selectedImage.aspectRatio && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Proporção" : "Aspect Ratio"}</p>
                                            <p className="text-sm text-white/80">{selectedImage.aspectRatio}</p>
                                        </div>
                                    )}
                                    {selectedImage.metadata?.imageQuality && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Qualidade" : "Quality"}</p>
                                            <p className="text-sm text-white/80">{selectedImage.metadata.imageQuality === "hq" ? "High Quality" : "Standard"}</p>
                                        </div>
                                    )}
                                    {selectedImage.metadata?.modelId && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Modelo" : "Model"}</p>
                                            <p className="text-sm text-white/80">{selectedImage.metadata.modelId}</p>
                                        </div>
                                    )}
                                    {selectedImage.metadata?.generationTime && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Tempo de Geração" : "Generation Time"}</p>
                                            <p className="text-sm text-white/80">{(selectedImage.metadata.generationTime / 1000).toFixed(2)}s</p>
                                        </div>
                                    )}
                                    {selectedImage.seed && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">Seed</p>
                                            <p className="text-sm text-white/80 font-mono">{selectedImage.seed}</p>
                                        </div>
                                    )}
                                    {selectedImage.createdAt && (
                                        <div className="bg-white/5 p-3 rounded-lg">
                                            <p className="text-[10px] text-white/40 uppercase mb-1">{language === "pt-BR" ? "Data de Criação" : "Created At"}</p>
                                            <p className="text-sm text-white/80">{formatDate(selectedImage.createdAt)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Applied Filters */}
                                {selectedImage.appliedFilters && Object.keys(selectedImage.appliedFilters).length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                                            <Palette className="w-4 h-4" />
                                            {language === "pt-BR" ? "Filtros Aplicados:" : "Applied Filters:"}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(selectedImage.appliedFilters).map(([key, value]) => (
                                                <Badge key={key} variant="secondary" className="text-xs">
                                                    {key}: {value}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Cinematic Settings */}
                                {selectedImage.metadata?.cinematicSettings && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            {language === "pt-BR" ? "Configurações Cinemáticas:" : "Cinematic Settings:"}
                                        </h3>
                                        <div className="bg-white/5 p-3 rounded-lg space-y-2 text-sm text-white/60">
                                            {selectedImage.metadata.cinematicSettings.optics && (
                                                <div>
                                                    <span className="text-white/40">Optics:</span> {selectedImage.metadata.cinematicSettings.optics.style}
                                                </div>
                                            )}
                                            {selectedImage.metadata.cinematicSettings.activeGems && selectedImage.metadata.cinematicSettings.activeGems.length > 0 && (
                                                <div>
                                                    <span className="text-white/40">Gems:</span> {selectedImage.metadata.cinematicSettings.activeGems.join(", ")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <Button onClick={() => downloadImage(selectedImage.imageUrl, `vectra-${selectedImage.id}.png`)} className="flex-1">
                                        <Download className="w-4 h-4 mr-2" />
                                        {language === "pt-BR" ? "Baixar" : "Download"}
                                    </Button>
                                    <Button variant="outline" onClick={() => window.open(selectedImage.imageUrl, "_blank")}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {language === "pt-BR" ? "Abrir" : "Open"}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            if (confirm(language === "pt-BR" ? "Excluir esta imagem?" : "Delete this image?")) {
                                                deleteImageMutation.mutate(selectedImage.id);
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
