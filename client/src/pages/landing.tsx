import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n, LanguageToggle } from "@/lib/i18n";
import heroWorkspace from "@assets/generated_images/ai_prompt_engineering_workspace.png";
import heroControlRoom from "@assets/generated_images/ai_creative_control_room.png";
import heroNetwork from "@assets/generated_images/ai_neural_network_visualization.png";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, language } = useI18n();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/image-studio");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const features = [
    {
      title: t.landingPage.feature1Title,
      description: t.landingPage.feature1Desc,
    },
    {
      title: t.landingPage.feature2Title,
      description: t.landingPage.feature2Desc,
    },
    {
      title: t.landingPage.feature3Title,
      description: t.landingPage.feature3Desc,
    },
  ];

  const handleLogin = () => {
    setIsSubmitting(true);
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
        <div className="max-w-6xl mx-auto h-full px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MonoIcon name="logo" className="w-7 h-7" />
            <span className="text-base font-medium tracking-tight">{BRAND.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {t.landingPage.pricing}
              </Button>
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="pt-14">
        <section className="min-h-[calc(100vh-56px)] flex items-center relative overflow-hidden">
          {/* Geometric grid background */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <svg
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="grid-pattern"
                  width="60"
                  height="60"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 60 0 L 0 0 0 60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-foreground/[0.03]"
                  />
                </pattern>
                <pattern
                  id="grid-pattern-large"
                  width="180"
                  height="180"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 180 0 L 0 0 0 180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.75"
                    className="text-foreground/[0.04]"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              <rect width="100%" height="100%" fill="url(#grid-pattern-large)" />
            </svg>
            {/* Diagonal accent lines */}
            <svg
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <line
                x1="0%"
                y1="100%"
                x2="40%"
                y2="0%"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-foreground/[0.02]"
              />
              <line
                x1="20%"
                y1="100%"
                x2="60%"
                y2="0%"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-foreground/[0.02]"
              />
              <line
                x1="60%"
                y1="100%"
                x2="100%"
                y2="0%"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-foreground/[0.02]"
              />
            </svg>
          </div>
          <div className="max-w-6xl mx-auto px-6 py-16 w-full relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-medium tracking-tight" data-testid="text-hero-title">
                    {BRAND.name}
                  </h1>
                  <p className="text-xl text-muted-foreground font-light">
                    {t.landingPage.tagline}
                  </p>
                </div>

                <p className="text-2xl md:text-3xl font-light text-foreground/90 leading-snug" data-testid="text-marketing-line">
                  {t.landingPage.marketingLine}
                </p>

                <p className="text-base text-muted-foreground leading-relaxed max-w-lg" data-testid="text-hero-description">
                  {t.landingPage.description}
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
                    {t.landingPage.builtFor}
                  </p>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm" data-testid="auth-card">
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-medium">{t.landingPage.getStarted}</h2>
                      <p className="text-sm text-muted-foreground">
                        {t.landingPage.signInSubtitle}
                      </p>
                    </div>

                    {isSubmitting ? (
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full rounded-md" />
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t.landingPage.redirecting}</span>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={handleLogin}
                        className="w-full"
                        size="lg"
                        data-testid="button-login"
                      >
                        {t.landingPage.signInButton}
                      </Button>
                    )}

                    <p className="text-xs text-center text-muted-foreground">
                      {t.landingPage.signInProviders}
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border">
                    <Link href="/pricing" className="block">
                      <Button variant="outline" className="w-full gap-2" data-testid="button-view-pricing">
                        {t.landingPage.viewPricing}
                        <MonoIcon name="arrow-right" className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-medium mb-3">
                {language === "pt-BR" ? "Tecnologia de Ponta" : "Cutting-Edge Technology"}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {language === "pt-BR" 
                  ? "Interface profissional projetada para máxima produtividade e resultados excepcionais."
                  : "Professional interface designed for maximum productivity and exceptional results."}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative rounded-xl overflow-hidden aspect-video group">
                <img 
                  src={heroWorkspace} 
                  alt="AI Workspace" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium">
                    {language === "pt-BR" ? "Estúdio de Prompts Avançado" : "Advanced Prompt Studio"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "pt-BR" ? "Crie, itere e refine prompts com precisão" : "Create, iterate and refine prompts with precision"}
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl overflow-hidden aspect-video group">
                <img 
                  src={heroControlRoom} 
                  alt="AI Control Room" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium">
                    {language === "pt-BR" ? "Geração de Imagens e Vídeo" : "Image & Video Generation"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "pt-BR" ? "Modelos ultra-realistas de última geração" : "Ultra-realistic cutting-edge models"}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <div className="relative rounded-xl overflow-hidden w-32 h-32 group">
                <img 
                  src={heroNetwork} 
                  alt="AI Neural Network" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
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
            {t.landingPage.tagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
