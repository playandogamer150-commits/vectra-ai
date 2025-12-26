import { cn } from "@/lib/utils";

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
  max = 5,
  step = 1,
  label,
  showValue = true,
  className,
  testId,
}: VectraSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("vectra-slider space-y-2", className)} data-testid={testId}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">{label}</span>
          )}
          {showValue && (
            <span className="text-xs font-mono text-white/70 bg-white/[0.05] px-2 py-0.5 rounded">
              {value}
            </span>
          )}
        </div>
      )}
      
      <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          )}
          data-testid={`${testId}-input`}
        />
      </div>
    </div>
  );
}
