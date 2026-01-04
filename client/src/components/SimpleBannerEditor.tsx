/**
 * =============================================================================
 * VECTRA AI - PROFESSIONAL BANNER EDITOR
 * =============================================================================
 * 
 * Um editor de banner premium, eficiente e funcional.
 * 
 * Features:
 * - Seleção precisa com aspect ratio fixo (1152x274)
 * - Controles avançados: Rotação, Flip Horizontal/Vertical
 * - Guia Visual: Grade de Regra dos Terços
 * - Zoom Interativo com botões e slider
 * - UI Dark Mode elegante e intuitiva
 * 
 * @author Antigravity
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
import { Label } from '@/components/ui/label';
import {
    Loader2, Check, X, ZoomIn, ZoomOut, Move,
    RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
    Grid3X3, Maximize2
} from 'lucide-react';
import getCroppedImg from '@/lib/image-utils';
import { cn } from '@/lib/utils';

interface SimpleBannerEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    onSave: (croppedImage: string) => Promise<void>;
    isSaving?: boolean;
    language?: string;
}

// Banner dimensions: 1152 x 274 = aspect ratio ~4.2:1
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
    const [rotation, setRotation] = useState(0);
    const [flip, setFlip] = useState({ horizontal: false, vertical: false });
    const [showGrid, setShowGrid] = useState(true);
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
                rotation,
                flip,
                { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, blur: 0 }
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
        setRotation(0);
        setFlip({ horizontal: false, vertical: false });
        setCroppedAreaPixels(null);
        onClose();
    };

    const toggleFlipHorizontal = () => setFlip(prev => ({ ...prev, horizontal: !prev.horizontal }));
    const toggleFlipVertical = () => setFlip(prev => ({ ...prev, vertical: !prev.vertical }));
    const resetTransformations = () => {
        setZoom(1);
        setRotation(0);
        setFlip({ horizontal: false, vertical: false });
    };

    const t = {
        title: language === 'pt-BR' ? 'Ajustar Banner do Perfil' : 'Adjust Profile Banner',
        dragHint: language === 'pt-BR' ? 'Arraste para posicionar' : 'Drag to position',
        zoom: language === 'pt-BR' ? 'Zoom' : 'Zoom',
        rotation: language === 'pt-BR' ? 'Rotação' : 'Rotation',
        flip: language === 'pt-BR' ? 'Inverter' : 'Flip',
        grid: language === 'pt-BR' ? 'Grade' : 'Grid',
        reset: language === 'pt-BR' ? 'Resetar' : 'Reset',
        cancel: language === 'pt-BR' ? 'Cancelar' : 'Cancel',
        save: language === 'pt-BR' ? 'Salvar Banner' : 'Save Banner',
        saving: language === 'pt-BR' ? 'Salvando...' : 'Saving...',
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-5xl w-[95vw] bg-[#0a0a0b] border-white/10 text-white p-0 gap-0 overflow-hidden shadow-2xl">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold text-white tracking-tight">
                            {t.title}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowGrid(!showGrid)}
                                className={cn(
                                    "h-8 px-3 text-xs gap-2 transition-colors",
                                    showGrid ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                                )}
                            >
                                <Grid3X3 className="w-3.5 h-3.5" />
                                {t.grid}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetTransformations}
                                className="h-8 px-3 text-xs gap-2 text-white/40 hover:text-white"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                {t.reset}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main Content Area */}
                <div className="flex flex-col lg:flex-row h-full lg:h-[500px]">

                    {/* Left: Cropper Area */}
                    <div className="relative flex-1 bg-[#050505] min-h-[350px] lg:min-h-0 border-r border-white/5 overflow-hidden">
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                .professional-banner-cropper .reactEasyCrop_Container {
                                    background: #000 !important;
                                }
                                .professional-banner-cropper .reactEasyCrop_CropArea {
                                    border: 2px solid #ffffff !important;
                                    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85) !important;
                                    color: transparent !important;
                                }
                                .professional-banner-cropper .reactEasyCrop_CropAreaGrid::before,
                                .professional-banner-cropper .reactEasyCrop_CropAreaGrid::after {
                                    border: 0.5px solid rgba(255, 255, 255, 0.15) !important;
                                }
                            `
                        }} />

                        <div className="professional-banner-cropper w-full h-full">
                            {imageUrl && (
                                <Cropper
                                    image={imageUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={BANNER_ASPECT_RATIO}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onRotationChange={setRotation}
                                    onCropComplete={onCropComplete}
                                    showGrid={showGrid}
                                    style={{
                                        containerStyle: {
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: '#050505'
                                        },
                                    }}
                                />
                            )}
                        </div>

                        {/* Centered Hint */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-40">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] uppercase font-bold tracking-widest text-white">
                                <Move className="w-3 h-3" />
                                {t.dragHint}
                            </div>
                        </div>
                    </div>

                    {/* Right: Detailed Controls */}
                    <div className="w-full lg:w-[280px] bg-[#0c0c0d] p-6 space-y-8 flex flex-col justify-center">

                        {/* Zoom Control */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t.zoom}</Label>
                                <span className="text-[11px] font-mono text-white/60">{Math.round(zoom * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10"
                                    onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <Slider
                                    value={[zoom]}
                                    min={1}
                                    max={3}
                                    step={0.01}
                                    onValueChange={(value) => setZoom(value[0])}
                                    className="flex-1"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10"
                                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Rotation Control */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t.rotation}</Label>
                                <span className="text-[11px] font-mono text-white/60">{rotation}°</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 bg-white/5 hover:bg-white/10"
                                    onClick={() => setRotation((rotation - 90) % 360)}
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Slider
                                    value={[rotation]}
                                    min={-180}
                                    max={180}
                                    step={1}
                                    onValueChange={(value) => setRotation(value[0])}
                                    className="flex-1 px-2"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 bg-white/5 hover:bg-white/10"
                                    onClick={() => setRotation((rotation + 90) % 360)}
                                >
                                    <RotateCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Flip Controls */}
                        <div className="space-y-4">
                            <Label className="text-[11px] font-bold uppercase tracking-wider text-white/40">{t.flip}</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-10 text-xs gap-2 border border-white/5 transition-all",
                                        flip.horizontal ? "bg-white text-black font-bold" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                                    )}
                                    onClick={toggleFlipHorizontal}
                                >
                                    <FlipHorizontal className="w-4 h-4" />
                                    Horiz.
                                </Button>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "h-10 text-xs gap-2 border border-white/5 transition-all",
                                        flip.vertical ? "bg-white text-black font-bold" : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                                    )}
                                    onClick={toggleFlipVertical}
                                >
                                    <FlipVertical className="w-4 h-4" />
                                    Vert.
                                </Button>
                            </div>
                        </div>

                        {/* Preview Stats */}
                        <div className="mt-auto pt-6 border-t border-white/5">
                            <div className="flex items-center justify-between text-[10px] text-white/30 uppercase tracking-tighter">
                                <span>Output Ratio</span>
                                <span className="text-white/60">4.2:1 (1152x274)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 px-8 py-5 bg-[#0a0a0b] border-t border-white/10">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSaving}
                        className="h-11 px-6 text-white/40 hover:text-white hover:bg-white/5 font-medium transition-all"
                    >
                        {t.cancel}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !croppedAreaPixels}
                        className="h-11 px-10 bg-white text-black hover:bg-white/90 font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all active:scale-95"
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
