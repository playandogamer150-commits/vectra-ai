import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

/**
 * Standard Studio Page Wrapper
 * Applies the dark radial gradient background found in ModelsLab Studio
 */
export function StudioPage({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("vectra-studio-bg min-h-screen w-full text-foreground pt-20", className)}>
            <div className="vectra-studio-content max-w-[1400px] mx-auto p-6">
                {children}
            </div>
        </div>
    );
}

/**
 * Standard Page Header
 * Title, description and optional actions
 */
export function StudioHeader({
    title,
    description,
    children,
    className
}: {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8", className)}>
            <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white/90">{title}</h1>
                {description && <p className="text-muted-foreground text-sm md:text-base">{description}</p>}
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
    );
}

/**
 * Standard Studio Card
 * Matches the glassmorphism aesthetic of the Studio
 */
export function StudioCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("vectra-studio-card", className)}>
            {children}
        </div>
    );
}

export function StudioCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("vectra-studio-card-header", className)}>
            {children}
        </div>
    );
}

export function StudioCardTitle({ children, icon: Icon, className }: { children: React.ReactNode; icon?: React.ElementType; className?: string }) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {Icon && <Icon className="w-4 h-4 vectra-studio-card-icon" />}
            <span className="vectra-studio-card-title">{children}</span>
        </div>
    );
}

export function StudioCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("space-y-4", className)}>
            {children}
        </div>
    );
}

/**
 * Empty State Component
 * Consistent feedback when lists are empty
 */
export function StudioEmptyState({
    icon: Icon = Sparkles,
    title,
    description,
    actionLabel,
    onAction,
}: {
    icon?: React.ElementType;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="secondary">
                    {actionLabel}
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            )}
        </div>
    );
}
