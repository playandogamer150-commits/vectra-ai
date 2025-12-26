import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VectraPanelProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  badge?: ReactNode;
  testId?: string;
}

export function VectraPanel({
  title,
  icon,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  onOpenChange,
  isOpen,
  badge,
  testId,
}: VectraPanelProps) {
  const panelClasses = cn(
    "vectra-panel",
    "relative rounded-[18px] overflow-hidden",
    "bg-black/40 backdrop-blur-xl",
    "border border-white/[0.06]",
    "before:absolute before:inset-x-0 before:top-0 before:h-px",
    "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
    className
  );

  const headerClasses = cn(
    "flex items-center justify-between gap-3 px-5 py-4",
    "text-white/60 text-xs font-medium uppercase tracking-widest"
  );

  const titleContent = (
    <div className="flex items-center gap-2.5">
      {icon && <span className="text-white/40">{icon}</span>}
      <span>{title}</span>
      {badge}
    </div>
  );

  if (collapsible) {
    return (
      <Collapsible
        open={isOpen}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        className={panelClasses}
        data-testid={testId}
      >
        <CollapsibleTrigger className={cn(headerClasses, "w-full hover:text-white/80 transition-colors")}>
          {titleContent}
          {isOpen !== undefined ? (
            isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
          ) : null}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className={panelClasses} data-testid={testId}>
      <div className={headerClasses}>{titleContent}</div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}
