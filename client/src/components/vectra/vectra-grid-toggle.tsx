import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ToggleOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface VectraGridToggleProps {
  options: ToggleOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  columns?: 2 | 3 | 4 | 5 | 6;
  offOption?: string;
  className?: string;
  testId?: string;
}

export function VectraGridToggle({
  options,
  selected,
  onChange,
  multiSelect = true,
  columns = 4,
  offOption,
  className,
  testId,
}: VectraGridToggleProps) {
  const handleToggle = (id: string) => {
    if (offOption && id === offOption) {
      onChange([offOption]);
      return;
    }

    if (multiSelect) {
      const withoutOff = selected.filter((s) => s !== offOption);
      if (selected.includes(id)) {
        const newSelected = withoutOff.filter((s) => s !== id);
        onChange(newSelected.length === 0 && offOption ? [offOption] : newSelected);
      } else {
        onChange([...withoutOff, id]);
      }
    } else {
      onChange([id]);
    }
  };

  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  return (
    <div
      className={cn("grid gap-2", gridCols[columns], className)}
      data-testid={testId}
    >
      {options.map((option) => {
        const isActive = selected.includes(option.id);
        const Icon = option.icon;
        
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => handleToggle(option.id)}
            className={cn(
              "vectra-toggle-item",
              "relative flex flex-col items-center justify-center gap-1.5",
              "px-3 py-3 rounded-xl",
              "text-xs font-medium uppercase tracking-wide",
              "transition-all duration-200",
              "border",
              isActive
                ? "bg-white/10 text-white border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                : "bg-white/[0.03] text-white/40 border-white/[0.04] hover:bg-white/[0.06] hover:text-white/60"
            )}
            data-testid={`${testId}-${option.id}`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
