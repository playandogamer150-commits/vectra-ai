/**
 * =============================================================================
 * VECTRA AI - BANNER FILTER CONTROLS COMPONENT
 * =============================================================================
 * 
 * Controles de filtros aprimorados com modo antes/depois e auto-ajuste.
 * 
 * @author Tech Lead Senior
 * @date 2026-01-04
 */

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    Sun, Contrast, Palette,
    RefreshCcw, Wand2, SplitSquareHorizontal,
    Droplets
} from "lucide-react";

export interface FilterValues {
    brightness: number;
    contrast: number;
    saturation: number;
    grayscale: number;
    sepia: number;
    blur: number;
}

interface BannerFilterControlsProps {
    filters: FilterValues;
    onFilterChange: (filter: keyof FilterValues, value: number) => void;
    onReset: () => void;
    beforeAfterMode: boolean;
    onBeforeAfterToggle: () => void;
    language: string;
}

interface FilterSliderProps {
    label: string;
    value: number;
    min?: number;
    max: number;
    defaultValue: number;
    icon: React.ReactNode;
    onChange: (value: number) => void;
    suffix?: string;
}

function FilterSlider({
    label,
    value,
    min = 0,
    max,
    defaultValue,
    icon,
    onChange,
    suffix = "%"
}: FilterSliderProps) {
    const isDefault = value === defaultValue;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-white/60">
                    {icon}
                    <span>{label}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`font-mono text-[11px] min-w-[36px] text-right ${isDefault ? 'text-white/40' : 'text-white/80'
                        }`}>
                        {Math.round(value)}{suffix}
                    </span>
                    {!isDefault && (
                        <button
                            className="p-0.5 hover:bg-white/10 rounded text-white/30 hover:text-white/60 transition-colors"
                            onClick={() => onChange(defaultValue)}
                        >
                            <RefreshCcw className="w-2.5 h-2.5" />
                        </button>
                    )}
                </div>
            </div>
            <div className="relative">
                <Slider
                    value={[value]}
                    min={min}
                    max={max}
                    step={1}
                    onValueChange={([v]) => onChange(v)}
                    className="cursor-pointer"
                />
                {/* Default value indicator */}
                {!isDefault && defaultValue >= min && defaultValue <= max && (
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 bg-white/30 rounded pointer-events-none"
                        style={{ left: `${((defaultValue - min) / (max - min)) * 100}%` }}
                    />
                )}
            </div>
        </div>
    );
}

export function BannerFilterControls({
    filters,
    onFilterChange,
    onReset,
    beforeAfterMode,
    onBeforeAfterToggle,
    language,
}: BannerFilterControlsProps) {
    // Auto-adjust function - applies sensible defaults for enhancement
    const handleAutoAdjust = useCallback(() => {
        onFilterChange('brightness', 105);
        onFilterChange('contrast', 110);
        onFilterChange('saturation', 115);
        onFilterChange('grayscale', 0);
        onFilterChange('sepia', 0);
        onFilterChange('blur', 0);
    }, [onFilterChange]);

    const isModified =
        filters.brightness !== 100 ||
        filters.contrast !== 100 ||
        filters.saturation !== 100 ||
        filters.grayscale !== 0 ||
        filters.sepia !== 0 ||
        filters.blur !== 0;

    return (
        <div className="space-y-4 pt-4 border-t border-white/10">
            {/* Header with Actions */}
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold flex items-center gap-2">
                    <Palette className="w-3 h-3" />
                    {language === "pt-BR" ? "Filtros" : "Filters"}
                </h4>
                <div className="flex items-center gap-1">
                    {/* Before/After Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-2 text-[9px] ${beforeAfterMode
                                ? 'text-white bg-white/10'
                                : 'text-white/40 hover:text-white/60'
                            }`}
                        onClick={onBeforeAfterToggle}
                        title={language === "pt-BR" ? "Antes/Depois" : "Before/After"}
                    >
                        <SplitSquareHorizontal className="w-3 h-3" />
                    </Button>

                    {/* Auto Adjust */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[9px] text-white/40 hover:text-white/60"
                        onClick={handleAutoAdjust}
                        title={language === "pt-BR" ? "Auto Ajuste" : "Auto Adjust"}
                    >
                        <Wand2 className="w-3 h-3" />
                    </Button>

                    {/* Reset */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-6 px-2 text-[9px] ${isModified
                                ? 'text-white/60 hover:text-white'
                                : 'text-white/20'
                            }`}
                        onClick={onReset}
                        disabled={!isModified}
                    >
                        Reset
                    </Button>
                </div>
            </div>

            {/* Filter Sliders */}
            <div className="space-y-3">
                {/* Exposure Group */}
                <div className="space-y-3">
                    <FilterSlider
                        label={language === "pt-BR" ? "Brilho" : "Brightness"}
                        value={filters.brightness}
                        max={200}
                        defaultValue={100}
                        icon={<Sun className="w-3.5 h-3.5" />}
                        onChange={(v) => onFilterChange('brightness', v)}
                    />

                    <FilterSlider
                        label={language === "pt-BR" ? "Contraste" : "Contrast"}
                        value={filters.contrast}
                        max={200}
                        defaultValue={100}
                        icon={<Contrast className="w-3.5 h-3.5" />}
                        onChange={(v) => onFilterChange('contrast', v)}
                    />
                </div>

                {/* Color Group */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                    <FilterSlider
                        label={language === "pt-BR" ? "Saturação" : "Saturation"}
                        value={filters.saturation}
                        max={200}
                        defaultValue={100}
                        icon={<Droplets className="w-3.5 h-3.5" />}
                        onChange={(v) => onFilterChange('saturation', v)}
                    />

                    <FilterSlider
                        label={language === "pt-BR" ? "Escala de Cinza" : "Grayscale"}
                        value={filters.grayscale}
                        max={100}
                        defaultValue={0}
                        icon={<Palette className="w-3.5 h-3.5 opacity-50" />}
                        onChange={(v) => onFilterChange('grayscale', v)}
                    />

                    <FilterSlider
                        label="Sepia"
                        value={filters.sepia}
                        max={100}
                        defaultValue={0}
                        icon={<Palette className="w-3.5 h-3.5 text-amber-500/60" />}
                        onChange={(v) => onFilterChange('sepia', v)}
                    />
                </div>
            </div>

            {/* Before/After Indicator */}
            {beforeAfterMode && isModified && (
                <div className="flex items-center justify-center gap-2 py-2 bg-white/5 rounded-lg text-[10px]">
                    <span className="text-white/40">{language === "pt-BR" ? "Original" : "Before"}</span>
                    <div className="w-px h-3 bg-white/20" />
                    <span className="text-white/60 font-medium">{language === "pt-BR" ? "Editado" : "After"}</span>
                </div>
            )}
        </div>
    );
}
