/**
 * =============================================================================
 * VECTRA AI - BANNER EDITOR CONTROLS COMPONENT
 * =============================================================================
 * 
 * Controles aprimorados de transformação com presets, atalhos e feedback visual.
 * 
 * @author Tech Lead Senior
 * @date 2026-01-04
 */

import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    ZoomIn, ZoomOut, RotateCw, RefreshCcw,
    Maximize, Move, Target, Keyboard
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface BannerEditorControlsProps {
    zoom: number;
    rotation: number;
    onZoomChange: (zoom: number) => void;
    onRotationChange: (rotation: number) => void;
    onReset: () => void;
    language: string;
}

type PresetType = 'fit' | 'fill' | 'center' | 'reset';

export function BannerEditorControls({
    zoom,
    rotation,
    onZoomChange,
    onRotationChange,
    onReset,
    language,
}: BannerEditorControlsProps) {
    // Preset handlers
    const handlePreset = useCallback((preset: PresetType) => {
        switch (preset) {
            case 'fit':
                onZoomChange(1);
                onRotationChange(0);
                break;
            case 'fill':
                onZoomChange(1.5);
                onRotationChange(0);
                break;
            case 'center':
                onRotationChange(0);
                break;
            case 'reset':
                onReset();
                break;
        }
    }, [onZoomChange, onRotationChange, onReset]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if not in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (e.key) {
                case '+':
                case '=':
                    e.preventDefault();
                    onZoomChange(Math.min(zoom + 0.1, 3));
                    break;
                case '-':
                case '_':
                    e.preventDefault();
                    onZoomChange(Math.max(zoom - 0.1, 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    onRotationChange((rotation + 5) % 360);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    onRotationChange((rotation - 5 + 360) % 360);
                    break;
                case 'r':
                case 'R':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        handlePreset('reset');
                    }
                    break;
                case 'f':
                case 'F':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        handlePreset('fit');
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [zoom, rotation, onZoomChange, onRotationChange, handlePreset]);

    return (
        <div className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold flex items-center gap-2">
                <Move className="w-3 h-3" />
                {language === "pt-BR" ? "Transformação" : "Transform"}
            </h4>

            {/* Preset Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                                onClick={() => handlePreset('fit')}
                            >
                                <Maximize className="w-3 h-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px]">
                            <p>Fit (F)</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                                onClick={() => handlePreset('fill')}
                            >
                                <ZoomIn className="w-3 h-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px]">
                            <p>Fill</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                                onClick={() => handlePreset('center')}
                            >
                                <Target className="w-3 h-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px]">
                            <p>Center</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[10px] text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
                                onClick={() => handlePreset('reset')}
                            >
                                <RefreshCcw className="w-3 h-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px]">
                            <p>Reset (R)</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white/60">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Zoom</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => onZoomChange(Math.max(zoom - 0.1, 1))}
                        >
                            <ZoomOut className="w-3 h-3" />
                        </Button>
                        <span className="font-mono text-white/80 text-[11px] min-w-[40px] text-center bg-white/5 px-1.5 py-0.5 rounded">
                            {Math.round(zoom * 100)}%
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => onZoomChange(Math.min(zoom + 0.1, 3))}
                        >
                            <ZoomIn className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
                <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.01}
                    onValueChange={(vals) => onZoomChange(vals[0])}
                    className="cursor-pointer"
                />
            </div>

            {/* Rotation Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white/60">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>{language === "pt-BR" ? "Rotação" : "Rotation"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => onRotationChange((rotation - 15 + 360) % 360)}
                        >
                            <RotateCw className="w-3 h-3 transform -scale-x-100" />
                        </Button>
                        <span className="font-mono text-white/80 text-[11px] min-w-[36px] text-center bg-white/5 px-1.5 py-0.5 rounded">
                            {rotation}°
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-white/40 hover:text-white hover:bg-white/10"
                            onClick={() => onRotationChange((rotation + 15) % 360)}
                        >
                            <RotateCw className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Slider
                        value={[rotation]}
                        min={0}
                        max={360}
                        step={1}
                        onValueChange={(vals) => onRotationChange(vals[0])}
                        className="flex-1 cursor-pointer"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-white/10 text-white/40 shrink-0"
                        onClick={() => onRotationChange(0)}
                    >
                        <RefreshCcw className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="flex items-center gap-1.5 text-[9px] text-white/30 pt-2 border-t border-white/5">
                <Keyboard className="w-3 h-3" />
                <span>+/- zoom • ↑/↓ rotate • R reset • F fit</span>
            </div>
        </div>
    );
}
