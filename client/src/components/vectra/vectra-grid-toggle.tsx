import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      className={cn("flex flex-wrap gap-1", className)}
      data-testid={testId}
    >
      {options.map((option) => {
        const isActive = selected.includes(option.id);
        const Icon = option.icon;
        
        return (
          <Tooltip key={option.id}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                onClick={() => handleToggle(option.id)}
                className={cn(
                  "h-8 w-8",
                  isActive && "ring-1 ring-primary/30"
                )}
                data-testid={`${testId}-${option.id}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {option.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
