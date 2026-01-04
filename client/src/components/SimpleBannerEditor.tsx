/**
 * =============================================================================
 * VECTRA AI - SIMPLE BANNER EDITOR
 * =============================================================================
 * 
 * Editor de banner minimalista e funcional, inspirado no YouTube e Twitter.
 * 
 * Features:
 * - Caixa de seleção clara com aspect ratio fixo (1152x274)
 * - Overlay escuro fora da área de corte
 * - Apenas controle de zoom
 * - Drag para reposicionar
 * - UX simples e intuitiva
 * 
 * @author Tech Lead Senior
 * @date 2026-01-04
 */

import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, ZoomIn, Move } from 'lucide-react';
import getCroppedImg from '@/lib/image-utils';

interface SimpleBannerEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    onSave: (croppedImage: string) => Promise<void>;
    isSaving?: boolean;
    language?: string;
}

// Banner dimensions: 1152 x 274 = aspect ratio 4.2:1
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
                0, // no rotation
                { horizontal: false, vertical: false }, // no flip
                { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, blur: 0 } // no filters
            );

            if (croppedImageBase64) {
                await onSave(croppedImageBase64);
            }
        } catch (error) {
            console.error('Error cropping image:', error);
        }
    };

    const handleClose = () => {
        // Reset state when closing
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onClose();
    };

    const t = {
        title: language === 'pt-BR' ? 'Ajustar Banner' : 'Adjust Banner',
        dragHint: language === 'pt-BR' ? 'Arraste para reposicionar' : 'Drag to reposition',
        zoom: 'Zoom',
        cancel: language === 'pt-BR' ? 'Cancelar' : 'Cancel',
        save: language === 'pt-BR' ? 'Salvar' : 'Save',
        saving: language === 'pt-BR' ? 'Salvando...' : 'Saving...',
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl w-[95vw] bg-[#0a0a0b] border-white/10 text-white p-0 gap-0 overflow-hidden">
                {/* Header - Minimal */}
                <DialogHeader className="px-6 py-4 border-b border-white/10">
                    <DialogTitle className="text-lg font-semibold text-white">
                        {t.title}
                    </DialogTitle>
                </DialogHeader>

                {/* Cropper Area - The main focus */}
                <div className="relative w-full bg-black" style={{ height: '400px' }}>
                    {/* Custom styles for react-easy-crop */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
              .simple-banner-cropper .reactEasyCrop_Container {
                background: #000 !important;
              }
              .simple-banner-cropper .reactEasyCrop_CropArea {
                border: 3px solid #ffffff !important;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7) !important;
                color: transparent !important;
              }
              .simple-banner-cropper .reactEasyCrop_CropAreaGrid {
                display: none !important;
              }
            `
                    }} />

                    <div className="simple-banner-cropper w-full h-full">
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

                    {/* Drag hint overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                        <div className="flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-full border border-white/20 text-white/70 text-sm">
                            <Move className="w-4 h-4" />
                            <span>{t.dragHint}</span>
                        </div>
                    </div>
                </div>

                {/* Controls - Only Zoom */}
                <div className="px-6 py-5 bg-[#0f0f10] border-t border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-white/50 text-sm shrink-0">
                            <ZoomIn className="w-4 h-4" />
                            <span>{t.zoom}</span>
                        </div>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.01}
                            onValueChange={(value) => setZoom(value[0])}
                            className="flex-1"
                        />
                        <span className="text-white/40 text-sm font-mono w-12 text-right">
                            {Math.round(zoom * 100)}%
                        </span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#0a0a0b] border-t border-white/10">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSaving}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                        <X className="w-4 h-4 mr-2" />
                        {t.cancel}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !croppedAreaPixels}
                        className="bg-white text-black hover:bg-white/90 font-medium px-6"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t.saving}
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                {t.save}
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default SimpleBannerEditor;
