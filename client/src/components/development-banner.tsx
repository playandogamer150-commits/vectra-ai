import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { BadgeCheck, X, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

const DISMISS_KEY = "vectra-dev-banner-dismissed-until";
const DISMISS_MS = 24 * 60 * 60 * 1000; // 24h
const BANNER_HEIGHT_PX = 40;

export function DevelopmentBanner({
  topOffsetPx = 0,
  className = "",
}: {
  topOffsetPx?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const [dismissedUntil, setDismissedUntil] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });

  const isVisible = useMemo(() => Date.now() > dismissedUntil, [dismissedUntil]);

  useEffect(() => {
    // Keep in sync across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISMISS_KEY) {
        const v = e.newValue ? Number(e.newValue) : 0;
        setDismissedUntil(Number.isFinite(v) ? v : 0);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!isVisible) return null;

  const dismiss = () => {
    const until = Date.now() + DISMISS_MS;
    setDismissedUntil(until);
    try {
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Spacer to avoid covering the page content (banner is fixed) */}
      <div style={{ height: BANNER_HEIGHT_PX }} aria-hidden="true" />

      <div
        className={[
          "fixed left-0 right-0 z-40 h-10",
          "border-b border-white/10 bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/25",
          className,
        ].join(" ")}
        style={{ top: topOffsetPx }}
        role="region"
        aria-label={t.devBanner?.ariaLabel || "Aviso do produto"}
        data-testid="development-banner"
      >
        <div className="max-w-[1400px] mx-auto h-full px-4 md:px-6 flex items-center gap-3">
          <Badge
            variant="secondary"
            className="shrink-0 bg-white/10 text-white border border-white/15 px-2 py-1 h-7"
          >
            <BadgeCheck className="w-4 h-4 mr-1.5" />
            {t.devBanner?.verifiedLabel || "Verificado • Vectra"}
          </Badge>
          <div className="flex-1" />

          <Link href="/support" data-testid="development-banner-support-link">
            <button className="hidden sm:inline-flex items-center gap-1 text-xs text-white/75 hover:text-white transition-colors">
              <LifeBuoy className="w-3.5 h-3.5" />
              {t.devBanner?.supportCta || "Falar com o suporte"}
            </button>
          </Link>

          <Button
            size="icon"
            variant="ghost"
            onClick={dismiss}
            className="shrink-0 h-8 w-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            title={t.common?.close || "Fechar"}
            aria-label={t.common?.close || "Fechar"}
            data-testid="development-banner-dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

