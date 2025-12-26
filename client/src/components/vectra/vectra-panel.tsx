import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
  const titleContent = (
    <div className="flex items-center gap-2">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-sm font-medium">{title}</span>
      {badge}
    </div>
  );

  if (collapsible) {
    return (
      <Card className={cn("", className)} data-testid={testId}>
        <Collapsible
          open={isOpen}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-center justify-between gap-2 py-2 px-3 cursor-pointer hover-elevate">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                {icon && <span className="text-muted-foreground">{icon}</span>}
                {title}
                {badge}
              </CardTitle>
              {isOpen !== undefined ? (
                isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : null}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-3 pb-3">{children}</CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)} data-testid={testId}>
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-1.5">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
          {badge}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">{children}</CardContent>
    </Card>
  );
}
