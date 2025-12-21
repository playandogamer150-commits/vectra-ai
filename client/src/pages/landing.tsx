import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Repeat, Sliders, Check, ArrowRight, Sparkles, Layers, Target } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Infinite Blueprints",
    description: "Pre-built templates for any creative need - from pixel art to cinematic shots",
  },
  {
    icon: Repeat,
    title: "Reproducible Results",
    description: "Seed-based generation ensures you can recreate any prompt exactly",
  },
  {
    icon: Sliders,
    title: "Filter Precision",
    description: "Fine-tune aesthetics, camera styles, and temporal effects with granular filters",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "3 generations per day",
      "3 filter slots",
      "Basic blueprints",
      "Copy prompt text",
    ],
    notIncluded: ["Export JSON", "Save versions", "Advanced presets", "Priority support"],
    cta: "Get Started",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    badge: "Popular",
    features: [
      "Unlimited generations",
      "All premium filters",
      "All blueprints & presets",
      "Export JSON with metadata",
      "Save & version prompts",
      "Priority support",
    ],
    notIncluded: [],
    cta: "Upgrade to Pro",
    variant: "default" as const,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <section className="relative pt-32 pb-24 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
            <Sparkles className="w-3 h-3 mr-1" />
            Prompt Engineering Reimagined
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
            Forge Production-Grade
            <span className="text-primary block mt-2">Prompts in Seconds</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10" data-testid="text-hero-description">
            The professional studio for prompt engineers. Combine blueprints, filters, and reproducible seeds to generate infinite variations with precision.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/studio">
              <Button size="lg" className="gap-2" data-testid="button-hero-cta">
                <Zap className="w-4 h-4" />
                Open Studio
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/library">
              <Button size="lg" variant="outline" data-testid="button-hero-secondary">
                Browse Blueprints
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold mb-4" data-testid="text-features-title">
              Built for Prompt Engineers
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every feature designed with production workflows in mind
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={feature.title} className="border-border/50" data-testid={`card-feature-${i}`}>
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start free, upgrade when you need more power
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.badge ? "border-primary" : "border-border/50"}`}
                data-testid={`card-pricing-${plan.name.toLowerCase()}`}
              >
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {plan.badge}
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 opacity-50">
                        <div className="w-4 h-4 shrink-0" />
                        <span className="text-sm line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.variant} className="w-full" data-testid={`button-pricing-${plan.name.toLowerCase()}`}>
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 md:px-8 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <Target className="w-12 h-12 mx-auto mb-6 opacity-80" />
          <h2 className="text-3xl font-semibold mb-4" data-testid="text-cta-title">
            Ready to Forge Your First Prompt?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Join thousands of prompt engineers who use PromptForge to create consistent, production-ready prompts.
          </p>
          <Link href="/studio">
            <Button size="lg" variant="secondary" className="gap-2" data-testid="button-footer-cta">
              <Zap className="w-4 h-4" />
              Start Creating
            </Button>
          </Link>
        </div>
      </section>

      <footer className="py-12 px-4 md:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">PromptForge</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for prompt engineers, by prompt engineers.
          </p>
        </div>
      </footer>
    </div>
  );
}
