import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface VectraTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  testId?: string;
}

export function VectraTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  testId,
}: VectraTabsProps) {
  return (
    <div
      className={cn("flex items-center gap-1 border-b border-white/[0.06]", className)}
      data-testid={testId}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "vectra-tab relative flex items-center gap-2",
              "px-4 py-3 text-xs font-medium uppercase tracking-widest",
              "transition-colors duration-200",
              isActive
                ? "text-white"
                : "text-white/40 hover:text-white/60"
            )}
            data-testid={`${testId}-${tab.id}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white/80 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface VectraTabContentProps {
  children: ReactNode;
  className?: string;
}

export function VectraTabContent({ children, className }: VectraTabContentProps) {
  return (
    <div className={cn("pt-4", className)}>
      {children}
    </div>
  );
}
