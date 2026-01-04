/**
 * =============================================================================
 * VECTRA AI - BANNER PREVIEW COMPONENT
 * =============================================================================
 * 
 * Componente de preview em tempo real do banner como aparecerá no perfil.
 * Mostra o banner com avatar e nome de usuário para visualização completa.
 * 
 * @author Tech Lead Senior
 * @date 2026-01-04
 */

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Eye } from "lucide-react";

interface BannerPreviewProps {
    imageUrl: string | null;
    zoom: number;
    rotation: number;
    filters: {
        brightness: number;
        contrast: number;
        saturation: number;
        grayscale: number;
        sepia: number;
        blur: number;
    };
    croppedAreaPixels: { x: number; y: number; width: number; height: number } | null;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    isPro?: boolean;
    language: string;
}

export function BannerPreview({
    imageUrl,
    zoom,
    rotation,
    filters,
    croppedAreaPixels,
    displayName,
    username,
    avatarUrl,
    isPro = false,
    language,
}: BannerPreviewProps) {
    // Calculate filter CSS
    const filterStyle = useMemo(() => ({
        filter: `
            brightness(${filters.brightness}%) 
            contrast(${filters.contrast}%) 
            saturate(${filters.saturation}%) 
            grayscale(${filters.grayscale}%) 
            sepia(${filters.sepia}%) 
            blur(${filters.blur}px)
        `,
        transform: `scale(${zoom}) rotate(${rotation}deg)`,
    }), [filters, zoom, rotation]);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
                <Eye className="w-3 h-3" />
                <span>{language === "pt-BR" ? "Preview do Perfil" : "Profile Preview"}</span>
            </div>

            {/* Preview Container */}
            <div className="relative rounded-lg overflow-hidden border border-white/10 bg-[#0a0a0b] shadow-xl">
                {/* Banner Area - Scaled down proportionally from 1152x274 */}
                <div
                    className="relative h-16 w-full overflow-hidden"
                    style={{
                        background: imageUrl ? 'transparent' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                >
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            alt="Banner Preview"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                                ...filterStyle,
                                transformOrigin: croppedAreaPixels
                                    ? `${croppedAreaPixels.x + croppedAreaPixels.width / 2}px ${croppedAreaPixels.y + croppedAreaPixels.height / 2}px`
                                    : 'center center',
                            }}
                        />
                    )}
                    {/* Overlay gradient for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Profile Info Area */}
                <div className="relative px-3 pb-3 -mt-5">
                    <div className="flex items-end gap-2">
                        {/* Mini Avatar */}
                        <div className="relative rounded-full p-[1px] bg-black shrink-0">
                            <Avatar className="h-10 w-10 border-2 border-black">
                                <AvatarImage
                                    src={avatarUrl || undefined}
                                    alt={displayName}
                                    className="object-cover"
                                />
                                <AvatarFallback className="text-xs bg-white/10 text-white">
                                    {(displayName || username || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Name */}
                        <div className="pb-0.5 min-w-0">
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] font-semibold text-white truncate">
                                    {displayName || username}
                                </span>
                                {isPro && (
                                    <Badge className="bg-white text-black text-[6px] px-1 py-0 h-3">
                                        <Crown className="w-2 h-2 mr-0.5" />
                                        PRO
                                    </Badge>
                                )}
                            </div>
                            <p className="text-[9px] text-white/40 truncate">@{username}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dimensions Info */}
            <div className="flex items-center justify-between text-[9px] text-white/30">
                <span>{language === "pt-BR" ? "Dimensão final:" : "Final size:"} 1152 × 274 px</span>
                <span>Aspect: 4.2:1</span>
            </div>
        </div>
    );
}
