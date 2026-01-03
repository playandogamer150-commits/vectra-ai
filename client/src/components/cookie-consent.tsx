import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "vectra-cookie-consent";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const { language } = useI18n();

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const t = {
    "pt-BR": {
      title: "Utilizamos Cookies",
      description: "Usamos cookies para melhorar sua experiência, personalizar conteúdo e analisar nosso tráfego. Ao continuar navegando, você concorda com nossa",
      privacy: "Política de Privacidade",
      accept: "Aceitar",
      decline: "Recusar",
    },
    "en": {
      title: "We Use Cookies",
      description: "We use cookies to improve your experience, personalize content, and analyze our traffic. By continuing to browse, you agree to our",
      privacy: "Privacy Policy",
      accept: "Accept",
      decline: "Decline",
    },
  };

  const content = t[language];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-card border-t border-border shadow-lg animate-in slide-in-from-bottom duration-300 pointer-events-auto"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 pr-8">
          <h3 id="cookie-consent-title" className="text-sm font-medium mb-1">
            {content.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {content.description}{" "}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">
              {content.privacy}
            </Link>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDecline}
            className="text-xs"
            data-testid="button-cookie-decline"
          >
            {content.decline}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="text-xs"
            data-testid="button-cookie-accept"
          >
            {content.accept}
          </Button>
        </div>
        <button
          onClick={handleDecline}
          className="absolute top-3 right-3 sm:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
