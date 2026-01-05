/**
 * =============================================================================
 * VECTRA AI - X.COM STYLE BANNER EDITOR (ULTIMATE FIX)
 * =============================================================================
 * 
 * Um editor de banner minimalista e elegante, inspirado na interface do X (Twitter).
 * 
 * Correções Finais:
 * - Garante visibilidade da área de seleção (Azul Vibrante)
 * - Aspect Ratio strictly 1500x500 (3:1) conforme padrão X.com
 * - Layout centrado e limpo
 */

import React, { useState, useCallback, useEffect } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
    Loader2, ZoomIn, ZoomOut, ArrowLeft
} from 'lucide-react';
import getCroppedImg from '@/lib/image-utils';

interface SimpleBannerEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    onSave: (croppedImage: string, cropData: any) => Promise<void>;
    isSaving?: boolean;
    language?: string;
}

// X.com Standard Banner Aspect Ratio
const BANNER_ASPECT_RATIO = 3 / 1; // 1500 x 500

export function SimpleBannerEditor({
    isOpen,
    onClose,
    imageUrl,
    onSave,
    isSaving = false,
    language = 'en'
}: SimpleBannerEditorProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Injetar CSS global para garantir visibilidade absoluta da cropper area
    useEffect(() => {
        const styleId = 'vectra-banner-cropper-css';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .vectra-cropper-active .reactEasyCrop_CropArea {
                    border: 2px solid #1d9bf0 !important;
                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75) !important;
                    color: #1d9bf0 !important;
                    pointer-events: none;
                }
                .vectra-cropper-active .reactEasyCrop_Container {
                    background-color: #000 !important;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!imageUrl || !croppedAreaPixels) return;

        try {
            const croppedImageBase64 = await getCroppedImg(
                imageUrl,
                croppedAreaPixels,
                0,
                { horizontal: false, vertical: false },
            );

            if (croppedImageBase64) {
                const cropData = {
                    x: crop.x,
                    y: crop.y,
                    zoom,
                    cropAreaPixels: croppedAreaPixels,
                    aspect: BANNER_ASPECT_RATIO
                };
                await onSave(croppedImageBase64, cropData);
            }
        } catch (error) {
            console.error('Error cropping image:', error);
        }
    };

    const handleClose = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onClose();
    };

    const t = {
        title: language === 'pt-BR' ? 'Editar mídia' : 'Edit media',
        apply: language === 'pt-BR' ? 'Aplicar' : 'Apply',
        applying: language === 'pt-BR' ? 'Aplicando...' : 'Applying...',
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-[700px] w-[98vw] h-auto bg-black border-none text-white p-0 flex flex-col overflow-hidden shadow-2xl rounded-2xl vectra-cropper-active">

                {/* Header X-Style */}
                <div className="flex items-center justify-between px-6 py-4 bg-black/90 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <h2 className="text-xl font-bold tracking-tight">
                            {t.title}
                        </h2>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !croppedAreaPixels}
                        className="bg-white text-black hover:bg-[#eff3f4] rounded-full px-6 py-0 h-9 font-bold transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t.applying}
                            </>
                        ) : t.apply}
                    </Button>
                </div>

                {/* Cropper Section */}
                <div className="relative w-full aspect-[16/10] sm:aspect-square md:aspect-[16/9] max-h-[500px] bg-black border-y border-white/5 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full relative">
                        {imageUrl && (
                            <Cropper
                                image={imageUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={BANNER_ASPECT_RATIO}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                showGrid={false}
                                restrictPosition={true}
                            />
                        )}
                    </div>
                </div>

                {/* Footer Slider */}
                <div className="bg-black px-12 py-10 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-6 w-full max-w-[450px]">
                        <button onClick={() => setZoom(Math.max(1, zoom - 0.1))} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                            <ZoomOut className="w-5 h-5 text-white/40" />
                        </button>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.01}
                            onValueChange={(value) => setZoom(value[0])}
                            className="flex-1"
                        />
                        <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                            <ZoomIn className="w-5 h-5 text-white/40" />
                        </button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}

export default SimpleBannerEditor;
