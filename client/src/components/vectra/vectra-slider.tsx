import { cn } from "@/lib/utils";
import { useState, useRef, useCallback, useEffect } from "react";

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
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  const updateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const rawValue = min + percent * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  }, [min, max, step, value, onChange]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateValue(e.clientX);
  }, [updateValue]);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updateValue(e.touches[0].clientX);
  }, [updateValue]);
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX);
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      updateValue(e.touches[0].clientX);
    };
    
    const handleEnd = () => {
      setIsDragging(false);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleEnd);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, updateValue]);
  
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
      
      <div
        ref={trackRef}
        className={cn(
          "relative h-2 w-full rounded-full cursor-pointer select-none",
          "bg-white/10 backdrop-blur-sm",
          "transition-all duration-150"
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Filled track */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            "bg-gradient-to-r from-white/50 to-white/70",
            "transition-all duration-75 ease-out"
          )}
          style={{ width: `${percentage}%` }}
        />
        
        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-4 h-4 rounded-full",
            "bg-white shadow-lg",
            "border-2 border-black/20",
            "transition-transform duration-100 ease-out",
            isDragging 
              ? "scale-110 shadow-[0_0_12px_rgba(255,255,255,0.3)]" 
              : "hover:scale-105"
          )}
          style={{ left: `${percentage}%` }}
        />
        
        {/* Step markers (for small ranges) */}
        {(max - min) <= 10 && (
          <div className="absolute inset-0 flex items-center justify-between px-0.5 pointer-events-none">
            {Array.from({ length: max - min + 1 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 h-1 rounded-full",
                  i + min <= value ? "bg-white/40" : "bg-white/15"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
