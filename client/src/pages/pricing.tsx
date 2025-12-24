import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";

export default function PricingPage() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "",
      description: "Get started with the essentials",
      features: [
        "Limited generations/day",
        "Core blueprints",
        "Basic history",
        "Personal projects",
      ],
      cta: "Start Free",
      variant: "outline" as const,
      href: "/",
    },
    {
      name: "Pro",
      price: "$19",
      period: "/mo",
      description: "Full control for professionals",
      badge: "Popular",
      features: [
        "Unlimited generations",
        "Advanced models (image/video)",
        "Custom blueprints",
        "Full history + versioning",
        "Priority processing",
      ],
      cta: "Upgrade to Pro",
      variant: "default" as const,
      href: "/",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <MonoIcon name="logo" className="w-7 h-7" />
            <span className="text-base font-medium tracking-tight">{BRAND.name}</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-14">
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-4" data-testid="text-pricing-title">
                Pricing
              </h1>
              <p className="text-lg text-muted-foreground" data-testid="text-pricing-subtitle">
                Start free. Upgrade when you need full control.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-card border rounded-xl p-6 ${
                    plan.badge ? "border-foreground/20" : "border-border"
                  }`}
                  data-testid={`card-pricing-${plan.name.toLowerCase()}`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 text-xs font-medium bg-foreground text-background rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-medium tracking-tight">{plan.price}</span>
                      {plan.period && (
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center mt-0.5 shrink-0">
                          <MonoIcon name="check" className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.href}>
                    <Button
                      variant={plan.variant}
                      className="w-full"
                      data-testid={`button-pricing-${plan.name.toLowerCase()}`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Need teams & compliance?
              </p>
              <Button variant="outline" size="sm">
                Talk to us
              </Button>
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
          <p className="text-xs text-muted-foreground">
            {BRAND.tagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
