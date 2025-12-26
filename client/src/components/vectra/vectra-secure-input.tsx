import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X, Loader2, Key } from "lucide-react";

interface VectraSecureInputProps {
  value: string;
  onChange: (value: string) => void;
  onTest?: () => Promise<boolean>;
  label?: string;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function VectraSecureInput({
  value,
  onChange,
  onTest,
  label,
  placeholder = "sk-...",
  hint,
  disabled = false,
  className,
  testId,
}: VectraSecureInputProps) {
  const [showValue, setShowValue] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "valid" | "invalid">("idle");

  const handleTest = async () => {
    if (!onTest) return;
    setTestStatus("testing");
    const isValid = await onTest();
    setTestStatus(isValid ? "valid" : "invalid");
    if (isValid || !isValid) {
      setTimeout(() => setTestStatus("idle"), 5000);
    }
  };

  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      {label && (
        <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-white/50">
          <Key className="w-3 h-3" strokeWidth={1.5} />
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={showValue ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="vectra-input w-full pr-10"
            data-testid={`${testId}-input`}
          />
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
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
              "vectra-gridbtn",
              testStatus === "valid" && "vectra-gridbtn--active !bg-green-500/20 !text-green-400",
              testStatus === "invalid" && "!bg-red-500/20 !text-red-400"
            )}
            data-testid={`${testId}-test`}
          >
            {testStatus === "testing" && <Loader2 className="w-4 h-4 animate-spin" />}
            {testStatus === "valid" && <Check className="w-4 h-4" />}
            {testStatus === "invalid" && <X className="w-4 h-4" />}
            {testStatus === "idle" && <Check className="w-4 h-4" />}
          </button>
        )}
      </div>

      {hint && (
        <p className="text-[10px] text-white/30">{hint}</p>
      )}
    </div>
  );
}
