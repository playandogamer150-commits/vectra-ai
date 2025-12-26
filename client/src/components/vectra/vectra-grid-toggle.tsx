import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <Button
            key={option.id}
            type="button"
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            onClick={() => handleToggle(option.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 h-auto py-1.5 px-2 min-h-0",
              "text-[10px] font-medium",
              isActive && "ring-1 ring-primary/20"
            )}
            data-testid={`${testId}-${option.id}`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            <span className="truncate">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
