import { useState, useEffect, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfile {
  id: string;
  username: string;
  plan: "free" | "pro";
  planStatus?: string;
}

interface StripeProduct {
  productId: string;
  productName: string;
  description: string | null;
  priceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year' | null;
  intervalCount: number | null;
  active: boolean;
  metadata: Record<string, string>;
}

export default function PricingPage() {
  const { t, language, setLanguage } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [autoCheckoutTriggered, setAutoCheckoutTriggered] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  // Fetch products from Stripe (dynamic)
  const { data: stripeProducts, isLoading: isLoadingProducts, error: productsError } = useQuery<StripeProduct[]>({
    queryKey: ["/api/stripe/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/stripe/products");
      const data = await response.json();
      return data.products || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    if (productsError) {
      toast({
        title: language === "pt-BR" ? "Pagamento indisponível" : "Payments unavailable",
        description: language === "pt-BR"
          ? "Não conseguimos carregar os produtos do Stripe. Recarregue a página e tente novamente."
          : "We couldn't load Stripe products. Refresh and try again.",
        variant: "destructive",
      });
    }
  }, [productsError, language, toast]);

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

  const handleUpgrade = useCallback(async (priceId: string) => {
    if (isLoadingProfile) {
      console.log("[Pricing] Profile is loading, ignoring click.");
      return;
    }

    console.log("[Pricing] Upgrade clicked. Profile:", profile);

    if (!profile?.id) {
      console.log("[Pricing] No user profile found, redirecting to GitHub OAuth.");
      // Save current selection to auto-trigger after login? (Future enhancement)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b9f4aeaa-15c2-4e37-b8bd-d049fca18de0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'client/src/pages/pricing.tsx:upgrade_click',message:'upgrade_click_unauthenticated',data:{redirectTo:'/pricing'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Redirect to GitHub OAuth with return path and checkout flag to auto-trigger checkout after login
      const redirectUrl = encodeURIComponent("/pricing?checkout=true");
      window.location.href = `/api/auth/github?redirect=${redirectUrl}`;
      return;
    }

    if (!priceId) {
      toast({
        title: language === "pt-BR" ? "Plano indisponível" : "Plan unavailable",
        description: language === "pt-BR"
          ? "Não encontramos o preço do plano Pro no Stripe. Recarregue a página e tente novamente."
          : "We couldn't find the Pro price in Stripe. Refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsUpgrading(true);
    try {
      console.log("[Pricing] Starting checkout for:", priceId);
      const response = await apiRequest("POST", "/api/stripe/checkout", { priceId, locale: language });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      const errorMessage = error?.message || (language === "pt-BR"
        ? "Não foi possível iniciar o checkout. Tente novamente."
        : "Could not start checkout. Please try again.");

      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  }, [profile, isLoadingProfile, language, toast]);

  // Auto-trigger checkout after login if user was trying to upgrade
  useEffect(() => {
    // Prevent multiple triggers
    if (autoCheckoutTriggered) return;
    
    const searchParams = new URLSearchParams(window.location.search);
    const autoCheckout = searchParams.get("checkout") === "true";
    
    // Only auto-trigger if user is logged in, products are loaded, and we have a Pro product
    if (autoCheckout && profile?.id && !isLoadingProfile && !isLoadingProducts && stripeProducts && !isUpgrading) {
      const proProduct = stripeProducts.find(p =>
        p.productName.toLowerCase().includes('pro') ||
        p.metadata?.plan === 'pro'
      );
      
      if (proProduct?.priceId && profile.plan !== "pro") {
        setAutoCheckoutTriggered(true);
        // Remove the checkout parameter from URL
        window.history.replaceState({}, "", "/pricing");
        // Trigger checkout automatically
        console.log("[Pricing] Auto-triggering checkout for Pro plan after login");
        handleUpgrade(proProduct.priceId);
      }
    }
  }, [profile, isLoadingProfile, isLoadingProducts, stripeProducts, handleUpgrade, autoCheckoutTriggered, isUpgrading]);

  // Find Pro product from Stripe
  // Prefer explicit metadata (plan=pro) or name match, otherwise fall back to the first valid recurring paid price.
  const proProduct = (() => {
    if (!stripeProducts || stripeProducts.length === 0) return undefined;

    const byMetadataOrName = stripeProducts.find(p =>
      (p.metadata?.plan || "").toLowerCase() === "pro" ||
      (p.productName || "").toLowerCase().includes("pro")
    );
    if (byMetadataOrName) return byMetadataOrName;

    const validRecurring = stripeProducts.filter(p => p.active && !!p.priceId && (p.amount ?? 0) > 0 && !!p.interval);
    if (validRecurring.length === 0) return undefined;

    // Prefer monthly, then yearly, then lowest amount
    const monthly = validRecurring.filter(p => p.interval === "month").sort((a, b) => a.amount - b.amount)[0];
    if (monthly) return monthly;
    const yearly = validRecurring.filter(p => p.interval === "year").sort((a, b) => a.amount - b.amount)[0];
    if (yearly) return yearly;
    return validRecurring.sort((a, b) => a.amount - b.amount)[0];
  })();
  // (logs de debug removidos após validação em produção)

  // Format price for display
  const formatPrice = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat(language === "pt-BR" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    });
    return formatter.format(amount / 100);
  };

  // Build plans array (static Free + Enterprise, dynamic Pro from Stripe)
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
        "10 gerações de imagem/dia (5 HQ + 5 Standard)",
        "2 gerações de vídeo/dia",
        "Blueprints básicos",
        "Até 2 blueprints customizados",
        "Histórico (últimos 50 prompts)",
        "Projetos pessoais",
      ] : [
        "10 prompt generations/day",
        "10 image generations/day (5 HQ + 5 Standard)",
        "2 video generations/day",
        "Basic blueprints",
        "Up to 2 custom blueprints",
        "History (last 50 prompts)",
        "Personal projects",
      ],
      cta: language === "pt-BR" ? "Começar Grátis" : "Start Free",
      variant: "outline" as const,
      href: "/image-studio",
      priceId: null,
    },
    {
      id: "pro",
      name: "Pro",
      price: proProduct
        ? formatPrice(proProduct.amount, proProduct.currency)
        : (language === "pt-BR" ? "R$49" : "$19"),
      period: proProduct?.interval === 'month'
        ? (language === "pt-BR" ? "/mês" : "/mo")
        : proProduct?.interval === 'year'
          ? (language === "pt-BR" ? "/ano" : "/yr")
          : (language === "pt-BR" ? "/mês" : "/mo"),
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
        "Histórico + versões",
        "Processamento prioritário",
        "Suporte prioritário",
      ] : [
        "Unlimited generations",
        "Advanced models (image/video)",
        "LoRA Training (up to 5/month)",
        "Custom blueprints",
        "History + versioning",
        "Priority processing",
        "Priority support",
      ],
      cta: language === "pt-BR" ? "Assinar Pro" : "Upgrade to Pro",
      variant: "default" as const,
      priceId: proProduct?.priceId || null,
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
      priceId: null,
    },
  ];

  const isPro = profile?.plan === "pro";

  // Loading skeleton for pricing cards
  const PricingCardSkeleton = () => (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
      <div className="text-center mb-6">
        <Skeleton className="w-10 h-10 rounded-lg mx-auto mb-3" />
        <Skeleton className="h-6 w-20 mx-auto mb-2" />
        <Skeleton className="h-4 w-32 mx-auto mb-4" />
        <Skeleton className="h-10 w-24 mx-auto" />
      </div>
      <div className="space-y-3 mb-6 flex-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-4 h-4 rounded-full mt-0.5" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto h-full px-4 md:px-6 flex items-center justify-between gap-4">
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
        <section className="py-12 md:py-20 px-4 md:px-6">
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
              {isLoadingProducts ? (
                // Show skeletons while loading
                <>
                  <PricingCardSkeleton />
                  <PricingCardSkeleton />
                  <PricingCardSkeleton />
                </>
              ) : (
                plans.map((plan) => {
                  const Icon = plan.icon;
                  const isCurrentPlan = (plan.id === "free" && !isPro) || (plan.id === "pro" && isPro);

                  return (
                    <div
                      key={plan.name}
                      className={`relative bg-card border rounded-xl p-6 flex flex-col ${plan.badge ? "border-foreground/30 ring-1 ring-foreground/10" : "border-border"
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
                      ) : plan.id === "pro" && !plan.priceId ? (
                        <Button
                          variant="default"
                          className="w-full"
                          disabled
                          data-testid={`button-pricing-${plan.id}`}
                        >
                          {isLoadingProducts
                            ? (language === "pt-BR" ? "Carregando..." : "Loading...")
                            : (language === "pt-BR" ? "Indisponível" : "Unavailable")}
                        </Button>
                      ) : plan.priceId ? (
                        <Button
                          variant={plan.variant}
                          className="w-full"
                          onClick={() => handleUpgrade(plan.priceId!)}
                          disabled={isUpgrading || isLoadingProfile}
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
                })
              )}
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
