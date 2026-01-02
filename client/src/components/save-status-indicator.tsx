import { useEffect, useState, memo } from "react";
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/hooks/use-auto-save";
import { getTimeSinceLastSave } from "@/hooks/use-auto-save";

interface SaveStatusIndicatorProps {
    status: SaveStatus;
    lastSaved: Date | null;
    hasUnsavedChanges: boolean;
    className?: string;
    showText?: boolean;
}

/**
 * Visual indicator for auto-save status (similar to Google Docs)
 */
export const SaveStatusIndicator = memo(function SaveStatusIndicator({
    status,
    lastSaved,
    hasUnsavedChanges,
    className,
    showText = true
}: SaveStatusIndicatorProps) {
    const [timeSince, setTimeSince] = useState(() => getTimeSinceLastSave(lastSaved));

    // Update time since last save every 10 seconds
    useEffect(() => {
        if (!lastSaved) return;

        const interval = setInterval(() => {
            setTimeSince(getTimeSinceLastSave(lastSaved));
        }, 10000);

        setTimeSince(getTimeSinceLastSave(lastSaved));
        return () => clearInterval(interval);
    }, [lastSaved]);

    const getStatusConfig = () => {
        switch (status) {
            case "saving":
                return {
                    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
                    text: "Saving...",
                    color: "text-white/40",
                    bgColor: "bg-white/5"
                };
            case "saved":
                return {
                    icon: <Check className="w-3.5 h-3.5" />,
                    text: `Saved ${timeSince}`,
                    color: "text-white",
                    bgColor: "bg-white/10"
                };
            case "error":
                return {
                    icon: <AlertCircle className="w-3.5 h-3.5" />,
                    text: "Save failed",
                    color: "text-white",
                    bgColor: "bg-white/10"
                };
            default:
                if (hasUnsavedChanges) {
                    return {
                        icon: <CloudOff className="w-3.5 h-3.5" />,
                        text: "Unsaved changes",
                        color: "text-white/40",
                        bgColor: "bg-white/5"
                    };
                }
                return {
                    icon: <Cloud className="w-3.5 h-3.5" />,
                    text: lastSaved ? `Saved ${timeSince}` : "Auto-save enabled",
                    color: "text-white/50",
                    bgColor: "bg-white/5"
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
                config.color,
                config.bgColor,
                className
            )}
        >
            {config.icon}
            {showText && <span className="hidden sm:inline">{config.text}</span>}
        </div>
    );
});

interface SessionRecoveryBannerProps {
    onRestore: () => void;
    onDismiss: () => void;
    sessionDate?: Date;
}

/**
 * Banner that appears when a previous session can be restored
 */
export function SessionRecoveryBanner({
    onRestore,
    onDismiss,
    sessionDate
}: SessionRecoveryBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss();
    };

    const handleRestore = () => {
        setIsVisible(false);
        onRestore();
    };

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-black/95 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-white">Previous session found</p>
                    <p className="text-xs text-white/60">
                        {sessionDate
                            ? `Last saved ${sessionDate.toLocaleDateString()} at ${sessionDate.toLocaleTimeString()}`
                            : "Would you like to restore your work?"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDismiss}
                        className="px-3 py-1.5 text-xs text-white/70 hover:text-white transition-colors"
                    >
                        Dismiss
                    </button>
                    <button
                        onClick={handleRestore}
                        className="px-3 py-1.5 text-xs bg-white hover:bg-white/90 text-black font-bold rounded-lg transition-colors"
                    >
                        Restore
                    </button>
                </div>
            </div>
        </div>
    );
}

interface WorkInProgressIndicatorProps {
    isGenerating: boolean;
    progress?: number;
    className?: string;
}

/**
 * Subtle indicator when work is in progress (generating, saving, etc.)
 */
export function WorkInProgressIndicator({
    isGenerating,
    progress,
    className
}: WorkInProgressIndicatorProps) {
    if (!isGenerating) return null;

    return (
        <div className={cn("relative", className)}>
            {/* Pulsing dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </div>

            {/* Optional progress bar */}
            {progress !== undefined && (
                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
