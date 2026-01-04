import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface BannerPreviewDynamicProps {
    // Imagem original
    imageUrl: string | null;

    // Transformações do cropper
    crop: { x: number; y: number };
    zoom: number;
    rotation: number;
    croppedAreaPixels: any;

    // Filtros
    filters: {
        brightness: number;
        contrast: number;
        saturation: number;
        grayscale: number;
        sepia: number;
        blur: number;
    };

    // Dados do perfil
    displayName: string;
    username: string;
    avatarUrl: string | null;
    isPro: boolean;

    // Dimensões esperadas
    bannerWidth?: number;
    bannerHeight?: number;
}

export function BannerPreviewDynamic({
    imageUrl,
    crop,
    zoom,
    rotation,
    croppedAreaPixels,
    filters,
    displayName,
    username,
    avatarUrl,
    isPro,
    bannerWidth = 1152,
    bannerHeight = 274,
}: BannerPreviewDynamicProps) {

    // Calcular o estilo da imagem no preview
    // Isso sincroniza exatamente com o que o usuário vê no cropper
    const bannerStyle = useMemo(() => {
        if (!imageUrl || !croppedAreaPixels) {
            return {};
        }

        // Aplicar transformações CSS
        const filterString = `
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      saturate(${filters.saturation}%)
      grayscale(${filters.grayscale}%)
      sepia(${filters.sepia}%)
      blur(${filters.blur}px)
    `;

        return {
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: `${croppedAreaPixels.width}px ${croppedAreaPixels.height}px`,
            backgroundPosition: `${-croppedAreaPixels.x}px ${-croppedAreaPixels.y}px`,
            backgroundRepeat: 'no-repeat',
            filter: filterString,
            transform: `rotate(${rotation}deg) scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'all 0.1s ease-out', // Suave mas responsivo
        };
    }, [imageUrl, croppedAreaPixels, filters, rotation, zoom]);

    return (
        <div className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
            {/* Título */}
            <div className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                Preview do Perfil
            </div>

            {/* Container do Banner Preview */}
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black">
                {/* Banner */}
                <div
                    className="w-full bg-cover bg-center"
                    style={{
                        aspectRatio: `${bannerWidth} / ${bannerHeight}`,
                        backgroundImage: bannerStyle.backgroundImage,
                        backgroundSize: bannerStyle.backgroundSize,
                        backgroundPosition: bannerStyle.backgroundPosition,
                        backgroundRepeat: bannerStyle.backgroundRepeat,
                        filter: bannerStyle.filter,
                        transform: bannerStyle.transform,
                        transformOrigin: bannerStyle.transformOrigin,
                        transition: bannerStyle.transition,
                    }}
                />

                {/* Overlay escuro para melhor legibilidade do texto */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

                {/* Informações do Perfil (sobreposto) */}
                <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end gap-2">
                    {/* Avatar */}
                    <div className="relative rounded-full p-[1px] bg-black">
                        <Avatar className="h-12 w-12 border-2 border-black">
                            <AvatarImage
                                src={avatarUrl || undefined}
                                alt={displayName || username}
                                className="object-cover"
                            />
                            <AvatarFallback className="text-sm bg-white/10 text-white">
                                {(displayName || username || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Nome e Username */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                            <h3 className="text-xs font-bold text-white truncate">
                                {displayName || username}
                            </h3>
                            {isPro && (
                                <Badge className="bg-white text-black text-[8px] px-1 py-0 h-4 shrink-0">
                                    <Crown className="w-2 h-2 mr-0.5" />
                                    PRO
                                </Badge>
                            )}
                        </div>
                        <p className="text-[10px] text-white/60 truncate">@{username}</p>
                    </div>
                </div>
            </div>

            {/* Informações de Dimensões */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/5 rounded px-2 py-1.5 border border-white/10">
                    <div className="text-white/40">Dimensão Final</div>
                    <div className="font-mono text-white/80 font-semibold">
                        {bannerWidth} × {bannerHeight} px
                    </div>
                </div>
                <div className="bg-white/5 rounded px-2 py-1.5 border border-white/10">
                    <div className="text-white/40">Aspect Ratio</div>
                    <div className="font-mono text-white/80 font-semibold">
                        {(bannerWidth / bannerHeight).toFixed(1)}:1 ✓
                    </div>
                </div>
            </div>

            {/* Status de Sincronização */}
            <div className="text-[9px] text-white/40 text-center">
                Sincronizando em tempo real • Zoom: {Math.round(zoom * 100)}% • Rotação: {rotation}°
            </div>
        </div>
    );
}
