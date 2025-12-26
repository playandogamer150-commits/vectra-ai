import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
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
  offOption?: string;
  className?: string;
  testId?: string;
}

export function VectraGridToggle({
  options,
  selected,
  onChange,
  multiSelect = true,
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

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      data-testid={testId}
    >
      {options.map((option) => {
        const isActive = selected.includes(option.id);
        const Icon = option.icon;
        
        return (
          <Tooltip key={option.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleToggle(option.id)}
                className={cn(
                  "vectra-gridbtn",
                  isActive && "vectra-gridbtn--active"
                )}
                data-testid={`${testId}-${option.id}`}
              >
                {Icon && <Icon className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs bg-black/90 border-white/10">
              {option.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
