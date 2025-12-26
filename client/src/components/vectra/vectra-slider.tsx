import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface VectraSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  testId?: string;
}

export function VectraSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  className,
  testId,
}: VectraSliderProps) {
  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">{label}</span>
          )}
          {showValue && (
            <span className="vectra-badge font-mono">
              {value}
            </span>
          )}
        </div>
      )}
      
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={min}
        max={max}
        step={step}
        className={cn(
          "[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5",
          "[&_[role=slider]]:bg-white/95 [&_[role=slider]]:border-[rgba(14,16,20,0.3)] [&_[role=slider]]:border-2",
          "[&_[role=slider]]:shadow-[0_2px_6px_rgba(0,0,0,0.3)]",
          "[&_[role=slider]]:transition-all [&_[role=slider]]:duration-150 [&_[role=slider]]:ease-[cubic-bezier(0.4,0,0.2,1)]",
          "[&_[role=slider]]:hover:scale-115 [&_[role=slider]]:hover:shadow-[0_3px_10px_rgba(0,0,0,0.4)]",
          "[&_[role=slider]]:active:scale-105 [&_[role=slider]]:active:bg-white [&_[role=slider]]:active:shadow-[0_2px_12px_rgba(255,255,255,0.2)]",
          "[&_[data-orientation=horizontal]]:h-1 [&_[data-orientation=horizontal]]:bg-white/10",
          "[&_span[data-orientation=horizontal]]:bg-gradient-to-r [&_span[data-orientation=horizontal]]:from-white/60 [&_span[data-orientation=horizontal]]:to-white/80",
          "[&_span[data-orientation=horizontal]]:transition-all [&_span[data-orientation=horizontal]]:duration-100 [&_span[data-orientation=horizontal]]:ease-out"
        )}
      />
    </div>
  );
}
