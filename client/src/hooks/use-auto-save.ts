import { useState, useEffect, useCallback, useRef } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveOptions {
    /** Delay in milliseconds before auto-saving (default: 1000) */
    debounceMs?: number;
    /** Key prefix for storage (default: "vectra-autosave") */
    storageKey?: string;
    /** Use localStorage instead of sessionStorage (default: false) */
    persistent?: boolean;
    /** Callback when save completes */
    onSave?: (data: unknown) => void;
    /** Callback when save fails */
    onError?: (error: Error) => void;
}

interface AutoSaveResult<T> {
    /** Current save status */
    status: SaveStatus;
    /** Last saved timestamp */
    lastSaved: Date | null;
    /** Whether there are unsaved changes */
    hasUnsavedChanges: boolean;
    /** Manually trigger a save */
    save: () => void;
    /** Clear saved data */
    clear: () => void;
    /** Restore saved data */
    restore: () => T | null;
    /** Mark as having changes (for tracking) */
    markChanged: () => void;
    /** Reset changed status */
    markSaved: () => void;
}

/**
 * Hook for auto-saving data to browser storage with status tracking
 */
export function useAutoSave<T>(
    key: string,
    data: T,
    options: AutoSaveOptions = {}
): AutoSaveResult<T> {
    const {
        debounceMs = 1000,
        storageKey = "vectra-autosave",
        persistent = false,
        onSave,
        onError
    } = options;

    const [status, setStatus] = useState<SaveStatus>("idle");
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousDataRef = useRef<string>("");

    const storage = persistent ? localStorage : sessionStorage;
    const fullKey = `${storageKey}-${key}`;

    // Compare data to detect changes
    useEffect(() => {
        const currentData = JSON.stringify(data);
        if (previousDataRef.current && currentData !== previousDataRef.current) {
            setHasUnsavedChanges(true);
        }
        previousDataRef.current = currentData;
    }, [data]);

    // Auto-save with debounce
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setStatus("saving");

        timeoutRef.current = setTimeout(() => {
            try {
                const saveData = {
                    data,
                    timestamp: new Date().toISOString(),
                    version: 1
                };
                storage.setItem(fullKey, JSON.stringify(saveData));
                setStatus("saved");
                setLastSaved(new Date());
                setHasUnsavedChanges(false);
                onSave?.(data);

                // Reset to idle after 2 seconds
                setTimeout(() => setStatus("idle"), 2000);
            } catch (error) {
                setStatus("error");
                onError?.(error as Error);
            }
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, hasUnsavedChanges, debounceMs, fullKey, storage, onSave, onError]);

    const save = useCallback(() => {
        try {
            const saveData = {
                data,
                timestamp: new Date().toISOString(),
                version: 1
            };
            storage.setItem(fullKey, JSON.stringify(saveData));
            setStatus("saved");
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            onSave?.(data);
            setTimeout(() => setStatus("idle"), 2000);
        } catch (error) {
            setStatus("error");
            onError?.(error as Error);
        }
    }, [data, fullKey, storage, onSave, onError]);

    const clear = useCallback(() => {
        storage.removeItem(fullKey);
        setStatus("idle");
        setLastSaved(null);
        setHasUnsavedChanges(false);
    }, [fullKey, storage]);

    const restore = useCallback((): T | null => {
        try {
            const saved = storage.getItem(fullKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.data as T;
            }
        } catch {
            // Ignore parse errors
        }
        return null;
    }, [fullKey, storage]);

    const markChanged = useCallback(() => {
        setHasUnsavedChanges(true);
    }, []);

    const markSaved = useCallback(() => {
        setHasUnsavedChanges(false);
        setStatus("saved");
        setLastSaved(new Date());
        setTimeout(() => setStatus("idle"), 2000);
    }, []);

    return {
        status,
        lastSaved,
        hasUnsavedChanges,
        save,
        clear,
        restore,
        markChanged,
        markSaved
    };
}

/**
 * Hook to warn user before leaving page with unsaved changes
 */
export function useUnsavedChangesWarning(
    hasUnsavedChanges: boolean,
    message = "You have unsaved changes. Are you sure you want to leave?"
) {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges, message]);
}

/**
 * Get formatted time since last save
 */
export function getTimeSinceLastSave(lastSaved: Date | null): string {
    if (!lastSaved) return "";

    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 5) return "just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
}
