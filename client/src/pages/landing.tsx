import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/studio");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const features = [
    {
      title: "Blueprint-driven prompts",
      description: "Build prompts with structure — not guesswork.",
    },
    {
      title: "Model-aware output",
      description: "Generate prompts tailored to each model's required base format.",
    },
    {
      title: "Reusable workflows",
      description: "Save, reuse, version, and scale your generations.",
    },
  ];

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MonoIcon name="logo" className="w-7 h-7" />
            <span className="text-base font-medium tracking-tight">{BRAND.name}</span>
          </div>
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Pricing
            </Button>
          </Link>
        </div>
      </header>

      <main className="pt-14">
        <section className="min-h-[calc(100vh-56px)] flex items-center">
          <div className="max-w-6xl mx-auto px-6 py-16 w-full">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-medium tracking-tight" data-testid="text-hero-title">
                    {BRAND.name}
                  </h1>
                  <p className="text-xl text-muted-foreground font-light">
                    {BRAND.tagline}
                  </p>
                </div>

                <p className="text-2xl md:text-3xl font-light text-foreground/90 leading-snug" data-testid="text-marketing-line">
                  {BRAND.marketingLine}
                </p>

                <p className="text-base text-muted-foreground leading-relaxed max-w-lg" data-testid="text-hero-description">
                  {BRAND.description}
                </p>

                <div className="pt-4 space-y-8">
                  <div className="grid gap-6">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3" data-testid={`feature-${i}`}>
                        <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center mt-0.5 shrink-0">
                          <MonoIcon name="check" className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{feature.title}</p>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Built for creators, studios, and agencies.
                  </p>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm" data-testid="auth-card">
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-medium">Get Started</h2>
                      <p className="text-sm text-muted-foreground">
                        Sign in with your account to access all features
                      </p>
                    </div>

                    <Button
                      onClick={handleLogin}
                      className="w-full"
                      size="lg"
                      data-testid="button-login"
                    >
                      Sign in to continue
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      Supports Google, GitHub, Apple, and email sign-in
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border">
                    <Link href="/pricing" className="block">
                      <Button variant="outline" className="w-full gap-2" data-testid="button-view-pricing">
                        View Pricing
                        <MonoIcon name="arrow-right" className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
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
