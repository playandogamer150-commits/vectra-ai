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
    Download, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
                                <div className="relative aspect-square overflow-hidden">
                                    <img
                                        src={image.imageUrl}
                                        alt={image.prompt || "Generated image"}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        onClick={() => setSelectedImage(image)}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 bg-black/60 hover:bg-black/80"
                                            onClick={() => downloadImage(image.imageUrl, `vectra-${image.id}.png`)}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="h-8 w-8"
                                            onClick={() => deleteImageMutation.mutate(image.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <Collapsible
                                        open={expandedImageId === image.id}
                                        onOpenChange={(open) => setExpandedImageId(open ? image.id : null)}
                                    >
                                        <CollapsibleTrigger className="w-full flex items-center justify-between text-xs text-white/60 hover:text-white">
                                            <span>{language === "pt-BR" ? "Detalhes" : "Details"}</span>
                                            {expandedImageId === image.id ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2 space-y-1 text-[10px] text-white/40">
                                            {image.prompt && (
                                                <p className="line-clamp-2">{image.prompt}</p>
                                            )}
                                            <p>ID: {image.id.slice(0, 8)}</p>
                                        </CollapsibleContent>
                                    </Collapsible>
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
                    <DialogContent className="max-w-4xl bg-black border-white/10">
                        <DialogHeader>
                            <DialogTitle>{language === "pt-BR" ? "Detalhes da Imagem" : "Image Details"}</DialogTitle>
                        </DialogHeader>
                        {selectedImage && (
                            <div className="space-y-4">
                                <img
                                    src={selectedImage.imageUrl}
                                    alt={selectedImage.prompt || "Generated image"}
                                    className="w-full rounded-lg"
                                />
                                {selectedImage.prompt && (
                                    <div>
                                        <p className="text-xs text-white/60 mb-1">{language === "pt-BR" ? "Prompt:" : "Prompt:"}</p>
                                        <p className="text-sm text-white/80">{selectedImage.prompt}</p>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={() => downloadImage(selectedImage.imageUrl, `vectra-${selectedImage.id}.png`)}>
                                        <Download className="w-4 h-4 mr-2" />
                                        {language === "pt-BR" ? "Baixar" : "Download"}
                                    </Button>
                                    <Button variant="outline" onClick={() => window.open(selectedImage.imageUrl, "_blank")}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {language === "pt-BR" ? "Abrir em Nova Aba" : "Open in New Tab"}
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
