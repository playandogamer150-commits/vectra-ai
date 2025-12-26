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
    <div className={cn("space-y-2", className)} data-testid={testId}>
      {label && (
        <Label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Settings className="w-3 h-3" />
          {label}
        </Label>
      )}
      
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={showValue ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10"
            data-testid={`${testId}-input`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-0 top-0 h-full w-10"
            data-testid={`${testId}-toggle-visibility`}
          >
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {onTest && (
          <Button
            type="button"
            variant={testStatus === "valid" ? "default" : testStatus === "invalid" ? "destructive" : "outline"}
            size="sm"
            onClick={handleTest}
            disabled={!value || testStatus === "testing"}
            className="gap-1.5"
            data-testid={`${testId}-test`}
          >
            {testStatus === "testing" && <Loader2 className="w-3 h-3 animate-spin" />}
            {testStatus === "valid" && <Check className="w-3 h-3" />}
            {testStatus === "invalid" && <X className="w-3 h-3" />}
            {testStatus === "idle" ? "Testar" : testStatus === "testing" ? "Testando..." : testStatus === "valid" ? "OK" : "Falhou"}
          </Button>
        )}
      </div>

      {testStatus !== "idle" && (
        <div className={cn(
          "flex items-center gap-1.5 text-xs",
          testStatus === "valid" ? "text-green-600 dark:text-green-400" : testStatus === "invalid" ? "text-destructive" : "text-muted-foreground"
        )}>
          {testStatus === "valid" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Chave validada com sucesso
            </>
          )}
          {testStatus === "invalid" && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
              Chave de API inválida
            </>
          )}
        </div>
      )}

      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
