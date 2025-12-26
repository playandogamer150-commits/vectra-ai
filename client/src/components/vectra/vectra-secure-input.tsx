import { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Check, X, Loader2, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
  placeholder = "sk-••••••••••••",
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
      setTimeout(() => setTestStatus("idle"), 5000);
    } catch {
      setTestStatus("invalid");
      setTimeout(() => setTestStatus("idle"), 5000);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)} data-testid={testId}>
      {label && (
        <Label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Settings className="w-2.5 h-2.5" />
          {label}
        </Label>
      )}
      
      <div className="relative flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            type={showValue ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-8 h-7 text-xs"
            data-testid={`${testId}-input`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-0 top-0 h-7 w-7"
            data-testid={`${testId}-toggle-visibility`}
          >
            {showValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>

        {onTest && (
          <Button
            type="button"
            variant={testStatus === "valid" ? "default" : testStatus === "invalid" ? "destructive" : "outline"}
            size="sm"
            onClick={handleTest}
            disabled={!value || testStatus === "testing"}
            className="gap-1 h-7 text-[10px] px-2"
            data-testid={`${testId}-test`}
          >
            {testStatus === "testing" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {testStatus === "valid" && <Check className="w-2.5 h-2.5" />}
            {testStatus === "invalid" && <X className="w-2.5 h-2.5" />}
            {testStatus === "idle" ? "Test" : testStatus === "testing" ? "..." : testStatus === "valid" ? "OK" : "X"}
          </Button>
        )}
      </div>

      {testStatus !== "idle" && (
        <div className={cn(
          "flex items-center gap-1 text-[10px]",
          testStatus === "valid" ? "text-green-600 dark:text-green-400" : testStatus === "invalid" ? "text-destructive" : "text-muted-foreground"
        )}>
          {testStatus === "valid" && (
            <>
              <div className="w-1 h-1 rounded-full bg-green-500" />
              Validada
            </>
          )}
          {testStatus === "invalid" && (
            <>
              <div className="w-1 h-1 rounded-full bg-destructive" />
              Inválida
            </>
          )}
        </div>
      )}

      {hint && (
        <p className="text-[9px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
