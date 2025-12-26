import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Tabs value={activeTab} onValueChange={onTabChange} className={cn("w-full", className)}>
      <TabsList className="w-full h-7" data-testid={testId}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex-1 gap-1 text-[10px] py-1"
            data-testid={`${testId}-${tab.id}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

interface VectraTabContentProps {
  children: ReactNode;
  className?: string;
}

export function VectraTabContent({ children, className }: VectraTabContentProps) {
  return (
    <div className={cn("mt-2", className)}>
      {children}
    </div>
  );
}
