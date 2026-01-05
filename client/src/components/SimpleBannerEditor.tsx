/**
 * =============================================================================
 * VECTRA AI - X.COM STYLE BANNER EDITOR
 * =============================================================================
 * 
 * Um editor de banner minimalista e elegante, inspirado na interface do X (Twitter).
 * focado em simplicidade e facilidade de uso.
 * 
 * Features:
 * - Design Idêntico ao X.com
 * - Header com botão "Aplicar" (Apply)
 * - Slider de Zoom inferior com ícones
 * - Área de crop limpa e escura
 * 
 * @author Antigravity
 * @date 2026-01-04
 */

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
    Loader2, ZoomIn, ZoomOut, ArrowLeft, X
} from 'lucide-react';
import getCroppedImg from '@/lib/image-utils';

interface SimpleBannerEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    onSave: (croppedImage: string) => Promise<void>;
    isSaving?: boolean;
    language?: string;
}

// Banner dimensions: 1152 x 274
const BANNER_ASPECT_RATIO = 1152 / 274;

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

    const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!imageUrl || !croppedAreaPixels) return;

        try {
            const croppedImageBase64 = await getCroppedImg(
                imageUrl,
                croppedAreaPixels,
                0, // No rotation in X-style
                { horizontal: false, vertical: false }, // No flip in X-style
            );

            if (croppedImageBase64) {
                await onSave(croppedImageBase64);
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
            <DialogContent className="max-w-[600px] w-[95vw] h-[650px] bg-black border-none text-white p-0 flex flex-col overflow-hidden shadow-2xl rounded-2xl">

                {/* Custom X-Style Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-black">
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
                        className="bg-white text-black hover:bg-[#eff3f4] rounded-full px-6 py-0 h-9 font-bold transition-colors"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t.applying}
                            </>
                        ) : t.apply}
                    </Button>
                </div>

                {/* Cropper Container */}
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                            .x-style-cropper .reactEasyCrop_Container {
                                background: #000 !important;
                            }
                            .x-style-cropper .reactEasyCrop_CropArea {
                                border: 2px solid #1d9bf0 !important;
                                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7) !important;
                            }
                            /* Remove grid lines to match X minimalism */
                            .x-style-cropper .reactEasyCrop_CropAreaGrid::before,
                            .x-style-cropper .reactEasyCrop_CropAreaGrid::after {
                                display: none !important;
                            }
                        `
                    }} />

                    <div className="x-style-cropper w-full h-full max-h-[400px]">
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
                                style={{
                                    containerStyle: {
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: '#000'
                                    },
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Footer with Zoom Control - Centered and Minimalist */}
                <div className="bg-black px-12 py-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-6 w-full max-w-[400px]">
                        <ZoomOut className="w-5 h-5 text-white/50" />
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.01}
                            onValueChange={(value) => setZoom(value[0])}
                            className="flex-1"
                        />
                        <ZoomIn className="w-5 h-5 text-white/50" />
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}

export default SimpleBannerEditor;
