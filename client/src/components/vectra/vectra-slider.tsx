import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

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
  return (
    <div className={cn("space-y-1.5", className)} data-testid={testId}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
          )}
          {showValue && (
            <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
              {value}
            </Badge>
          )}
        </div>
      )}
      
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={min}
        max={max}
        step={step}
        data-testid={`${testId}-input`}
      />
    </div>
  );
}
