import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { APP_NAME } from "@/lib/constants";
import { Zap, Repeat, Sliders, Check, ArrowRight, Sparkles, Layers, Target } from "lucide-react";

export default function LandingPage() {
  const { t } = useI18n();

  const features = [
    {
      icon: Layers,
      title: t.landing.feature1Title,
      description: t.landing.feature1Desc,
    },
    {
      icon: Sliders,
      title: t.landing.feature2Title,
      description: t.landing.feature2Desc,
    },
    {
      icon: Repeat,
      title: t.landing.feature3Title,
      description: t.landing.feature3Desc,
    },
  ];

  const pricingPlans = [
    {
      name: t.landing.free,
      price: "$0",
      period: t.landing.freePriceMonth,
      features: [
        t.landing.freeFeature1,
        t.landing.freeFeature2,
        t.landing.freeFeature3,
        t.landing.freeFeature4,
      ],
      notIncluded: [],
      cta: t.landing.startFree,
      variant: "outline" as const,
    },
    {
      name: t.landing.pro,
      price: "$12",
      period: t.landing.proPriceMonth,
      badge: "Popular",
      features: [
        t.landing.proFeature1,
        t.landing.proFeature2,
        t.landing.proFeature3,
        t.landing.proFeature4,
        t.landing.proFeature5,
      ],
      notIncluded: [],
      cta: t.landing.upgradePro,
      variant: "default" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative pt-32 pb-28 px-6 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-32 left-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-2/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-3xl mx-auto text-center relative">
          <Badge variant="secondary" className="mb-8 px-4 py-1.5" data-testid="badge-hero">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Prompt Engineering Studio
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-8 leading-tight" data-testid="text-hero-title">
            {t.landing.heroTitle}
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed" data-testid="text-hero-description">
            {t.landing.heroSubtitle}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/studio">
              <Button size="lg" className="gap-2.5 px-6 h-12 text-base rounded-xl" data-testid="button-hero-cta">
                <Zap className="w-4.5 h-4.5" />
                {t.landing.getStarted}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/library">
              <Button size="lg" variant="outline" className="px-6 h-12 text-base rounded-xl" data-testid="button-hero-secondary">
                {t.landing.viewLibrary}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4" data-testid="text-features-title">
              {t.landing.featuresTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t.landing.featuresSubtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={feature.title} className="bg-card border-border/50 p-6" data-testid={`card-feature-${i}`}>
                <CardHeader className="p-0 pb-4">
                  <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-8 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4" data-testid="text-pricing-title">
              {t.landing.pricingTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t.landing.pricingSubtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative p-6 ${plan.badge ? "border-primary/50 bg-card" : "border-border/50 bg-card"}`}
                data-testid={`card-pricing-${plan.name.toLowerCase()}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3">
                    {plan.badge}
                  </Badge>
                )}
                <CardHeader className="text-center p-0 pb-6">
                  <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground ml-1.5 text-sm">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0 space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm text-foreground/90">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.variant} 
                    className="w-full h-11 rounded-xl" 
                    data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 md:px-8 bg-gradient-to-br from-primary to-accent-2 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-8">
            <Target className="w-7 h-7" />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-4" data-testid="text-cta-title">
            {t.landing.heroTitle}
          </h2>
          <p className="text-white/70 max-w-md mx-auto mb-10 leading-relaxed">
            {t.landing.footer}
          </p>
          <Link href="/studio">
            <Button size="lg" variant="secondary" className="gap-2.5 px-6 h-12 text-base rounded-xl" data-testid="button-footer-cta">
              <Zap className="w-4.5 h-4.5" />
              {t.landing.getStarted}
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-10 px-6 md:px-8 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A855F7] to-[#EC4899] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">{APP_NAME}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.landing.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
