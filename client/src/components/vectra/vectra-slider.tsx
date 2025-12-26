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
        className="[&_[data-slot=track]]:vectra-slider-track [&_[data-slot=range]]:vectra-slider-range [&_[data-slot=thumb]]:vectra-slider-thumb"
      />
    </div>
  );
}
