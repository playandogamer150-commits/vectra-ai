import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Info, HelpCircle } from "lucide-react";
import React from "react";

export function InfoGuide({ title, children }: { title?: string, children: React.ReactNode }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full ml-1 hover:bg-muted text-muted-foreground p-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <HelpCircle className="w-3 h-3" />
                    <span className="sr-only">Info</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-2">
                    {title && <h4 className="font-medium text-sm flex items-center gap-2"><Info className="w-4 h-4" /> {title}</h4>}
                    <div className="text-xs text-muted-foreground space-y-2">
                        {children}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
