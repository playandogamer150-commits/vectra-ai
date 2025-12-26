import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VectraPanelProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  testId?: string;
}

export function VectraPanel({
  title,
  icon,
  badge,
  children,
  collapsible = false,
  defaultOpen = true,
  isOpen,
  onOpenChange,
  className,
  testId,
}: VectraPanelProps) {
  if (collapsible) {
    return (
      <div className={cn("vectra-panel", className)} data-testid={testId}>
        <Collapsible
          open={isOpen}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
        >
          <CollapsibleTrigger className="w-full">
            <div className="vectra-panel-header cursor-pointer">
              {icon && <span className="vectra-panel-icon">{icon}</span>}
              <span className="vectra-panel-title flex-1 text-left">{title}</span>
              {badge}
              {isOpen !== undefined ? (
                isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />
              ) : null}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className={cn("vectra-panel", className)} data-testid={testId}>
      <div className="vectra-panel-header">
        {icon && <span className="vectra-panel-icon">{icon}</span>}
        <span className="vectra-panel-title">{title}</span>
        {badge}
      </div>
      <div>{children}</div>
    </div>
  );
}
