import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X, Loader2, Settings } from "lucide-react";

interface VectraSecureInputProps {
  value: string;
  onChange: (value: string) => void;
  onTest?: () => Promise<boolean>;
  placeholder?: string;
  label?: string;
  hint?: string;
  className?: string;
  testId?: string;
  disabled?: boolean;
}

export function VectraSecureInput({
  value,
  onChange,
  onTest,
  placeholder = "••••••••••••",
  label = "Custom API Key",
  hint,
  className,
  testId,
  disabled,
}: VectraSecureInputProps) {
  const [showValue, setShowValue] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");

  const handleTest = async () => {
    if (!onTest || !value) return;
    
    setTestStatus("testing");
    try {
      const isValid = await onTest();
      setTestStatus(isValid ? "valid" : "invalid");
      // Reset status after 5 seconds to allow retry
      setTimeout(() => setTestStatus("idle"), 5000);
    } catch {
      setTestStatus("invalid");
      setTimeout(() => setTestStatus("idle"), 5000);
    }
  };

  return (
    <div className={cn("vectra-secure-input space-y-2", className)} data-testid={testId}>
      {label && (
        <label className="flex items-center gap-2 text-xs font-medium text-white/50 uppercase tracking-wide">
          <Settings className="w-3 h-3" />
          {label}
        </label>
      )}
      
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full px-4 py-2.5 pr-10",
              "bg-white/[0.03] border border-white/[0.06] rounded-xl",
              "text-sm text-white/90 placeholder:text-white/20",
              "focus:outline-none focus:border-white/20 focus:bg-white/[0.05]",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            data-testid={`${testId}-input`}
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            data-testid={`${testId}-toggle-visibility`}
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {onTest && (
          <button
            type="button"
            onClick={handleTest}
            disabled={!value || testStatus === "testing"}
            className={cn(
              "flex items-center justify-center gap-1.5",
              "px-3 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wide",
              "border transition-all duration-200",
              testStatus === "valid"
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : testStatus === "invalid"
                ? "bg-red-500/20 border-red-500/30 text-red-400"
                : "bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06] hover:text-white/70",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            data-testid={`${testId}-test`}
          >
            {testStatus === "testing" && <Loader2 className="w-3 h-3 animate-spin" />}
            {testStatus === "valid" && <Check className="w-3 h-3" />}
            {testStatus === "invalid" && <X className="w-3 h-3" />}
            {testStatus === "idle" && "Test"}
          </button>
        )}
      </div>

      {testStatus !== "idle" && (
        <div className={cn(
          "flex items-center gap-1.5 text-xs",
          testStatus === "valid" ? "text-emerald-400" : testStatus === "invalid" ? "text-red-400" : "text-white/40"
        )}>
          {testStatus === "valid" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Key validated successfully
            </>
          )}
          {testStatus === "invalid" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Invalid API key
            </>
          )}
        </div>
      )}

      {hint && (
        <p className="text-[10px] text-white/30 italic">{hint}</p>
      )}
    </div>
  );
}
