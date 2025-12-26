import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface VectraTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
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
    <div className={cn("flex gap-1", className)} data-testid={testId}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "vectra-tab",
            activeTab === tab.id && "vectra-tab--active"
          )}
          data-testid={`${testId}-${tab.id}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

interface VectraTabContentProps {
  children: ReactNode;
  className?: string;
}

export function VectraTabContent({ children, className }: VectraTabContentProps) {
  return (
    <div className={cn("mt-3", className)}>
      {children}
    </div>
  );
}
