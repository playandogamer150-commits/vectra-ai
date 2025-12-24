import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Sparkles, Building2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  username: string;
  plan: "free" | "pro";
  planStatus?: string;
}

export default function PricingPage() {
  const { t, language, setLanguage } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("success") === "true") {
      toast({
        title: language === "pt-BR" ? "Assinatura ativada!" : "Subscription activated!",
        description: language === "pt-BR" 
          ? "Bem-vindo ao Vectra AI Pro! Aproveite todos os recursos." 
          : "Welcome to Vectra AI Pro! Enjoy all features.",
      });
      window.history.replaceState({}, "", "/pricing");
    }
    if (searchParams.get("canceled") === "true") {
      toast({
        title: language === "pt-BR" ? "Checkout cancelado" : "Checkout canceled",
        description: language === "pt-BR" 
          ? "Você pode tentar novamente quando quiser." 
          : "You can try again whenever you want.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/pricing");
    }
  }, [language, toast]);

  const handleUpgrade = async (priceId: string) => {
    if (!profile?.id) {
      setLocation("/__repl?login=1");
      return;
    }

    setIsUpgrading(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/checkout", { priceId, locale: language });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" 
          ? "Não foi possível iniciar o checkout. Tente novamente." 
          : "Could not start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const plans = [
    {
      id: "free",
      name: "Free",
      price: language === "pt-BR" ? "R$0" : "$0",
      period: "",
      description: language === "pt-BR" 
        ? "Comece com o essencial" 
        : "Get started with the essentials",
      icon: Sparkles,
      features: language === "pt-BR" ? [
        "10 gerações de prompts/dia",
        "5 gerações de imagem/dia",
        "Blueprints básicos",
        "Histórico de 7 dias",
        "Projetos pessoais",
      ] : [
        "10 prompt generations/day",
        "5 image generations/day",
        "Basic blueprints",
        "7-day history",
        "Personal projects",
      ],
      cta: language === "pt-BR" ? "Começar Grátis" : "Start Free",
      variant: "outline" as const,
      href: "/image-studio",
    },
    {
      id: "pro",
      name: "Pro",
      price: language === "pt-BR" ? "R$49" : "$19",
      period: language === "pt-BR" ? "/mês" : "/mo",
      description: language === "pt-BR" 
        ? "Controle total para profissionais" 
        : "Full control for professionals",
      badge: language === "pt-BR" ? "Popular" : "Popular",
      icon: Crown,
      features: language === "pt-BR" ? [
        "Gerações ilimitadas",
        "Modelos avançados (imagem/vídeo)",
        "LoRA Training (até 5/mês)",
        "Blueprints customizados",
        "Histórico completo + versões",
        "Processamento prioritário",
        "Suporte prioritário",
      ] : [
        "Unlimited generations",
        "Advanced models (image/video)",
        "LoRA Training (up to 5/month)",
        "Custom blueprints",
        "Full history + versioning",
        "Priority processing",
        "Priority support",
      ],
      cta: language === "pt-BR" ? "Assinar Pro" : "Upgrade to Pro",
      variant: "default" as const,
      priceId: "price_pro_monthly",
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: language === "pt-BR" ? "Custom" : "Custom",
      period: "",
      description: language === "pt-BR" 
        ? "Para times e empresas" 
        : "For teams and enterprises",
      icon: Building2,
      features: language === "pt-BR" ? [
        "Tudo do Pro",
        "LoRA Training ilimitado",
        "API dedicada",
        "SSO e SAML",
        "Gerenciamento de times",
        "SLA garantido",
        "Suporte dedicado",
      ] : [
        "Everything in Pro",
        "Unlimited LoRA Training",
        "Dedicated API",
        "SSO and SAML",
        "Team management",
        "Guaranteed SLA",
        "Dedicated support",
      ],
      cta: language === "pt-BR" ? "Fale Conosco" : "Contact Us",
      variant: "outline" as const,
      href: "/support",
    },
  ];

  const isPro = profile?.plan === "pro";

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <MonoIcon name="logo" className="w-7 h-7" />
            <span className="text-base font-medium tracking-tight">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "pt-BR" ? "en" : "pt-BR")}
              className="text-xs"
              data-testid="button-toggle-language"
            >
              {language === "pt-BR" ? "EN" : "PT"}
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {language === "pt-BR" ? "Voltar" : "Back"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-14">
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-4" data-testid="text-pricing-title">
                {language === "pt-BR" ? "Preços" : "Pricing"}
              </h1>
              <p className="text-lg text-muted-foreground" data-testid="text-pricing-subtitle">
                {language === "pt-BR" 
                  ? "Comece grátis. Faça upgrade quando precisar de mais controle." 
                  : "Start free. Upgrade when you need full control."}
              </p>
              {isPro && (
                <Badge variant="secondary" className="mt-4">
                  <Crown className="w-3 h-3 mr-1" />
                  {language === "pt-BR" ? "Você é Pro!" : "You're Pro!"}
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const isCurrentPlan = (plan.id === "free" && !isPro) || (plan.id === "pro" && isPro);
                
                return (
                  <div
                    key={plan.name}
                    className={`relative bg-card border rounded-xl p-6 flex flex-col ${
                      plan.badge ? "border-foreground/30 ring-1 ring-foreground/10" : "border-border"
                    }`}
                    data-testid={`card-pricing-${plan.id}`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 text-xs font-medium bg-foreground text-background rounded-full">
                          {plan.badge}
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-medium tracking-tight">{plan.price}</span>
                        {plan.period && (
                          <span className="text-sm text-muted-foreground">{plan.period}</span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center mt-0.5 shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <Button variant="secondary" className="w-full" disabled>
                        {language === "pt-BR" ? "Plano Atual" : "Current Plan"}
                      </Button>
                    ) : plan.priceId ? (
                      <Button
                        variant={plan.variant}
                        className="w-full"
                        onClick={() => handleUpgrade(plan.priceId!)}
                        disabled={isUpgrading}
                        data-testid={`button-pricing-${plan.id}`}
                      >
                        {isUpgrading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === "pt-BR" ? "Carregando..." : "Loading..."}</>
                        ) : (
                          plan.cta
                        )}
                      </Button>
                    ) : (
                      <Link href={plan.href || "/"}>
                        <Button
                          variant={plan.variant}
                          className="w-full"
                          data-testid={`button-pricing-${plan.id}`}
                        >
                          {plan.cta}
                        </Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-16 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {language === "pt-BR" 
                  ? "Todos os planos incluem suporte básico e atualizações gratuitas." 
                  : "All plans include basic support and free updates."}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "pt-BR" 
                  ? "Pagamento seguro via Stripe. Cancele quando quiser." 
                  : "Secure payment via Stripe. Cancel anytime."}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MonoIcon name="logo" className="w-5 h-5" />
            <span className="text-sm font-medium">{BRAND.name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {language === "pt-BR" ? "Termos" : "Terms"}
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {language === "pt-BR" ? "Privacidade" : "Privacy"}
            </Link>
            <Link href="/support" className="hover:text-foreground transition-colors">
              {language === "pt-BR" ? "Suporte" : "Support"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
