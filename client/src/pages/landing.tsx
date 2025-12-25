import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { Loader2, Sparkles, Layers, Wand2, Download, Clock, Users, Image, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n, LanguageToggle } from "@/lib/i18n";
import { motion, useInView } from "framer-motion";
import sampleStudio from "@assets/b89ed159-462b-4443-bf08-017117234da7_1766695047798.jpg";
import sampleCCTV1 from "@assets/297690cb-8aa0-43bf-8ece-0ae0a369f228_1766695063959.jpg";
import sampleCCTV2 from "@assets/10c8d038-5f4b-40e8-89a3-a1252b78630e_1766695069995.jpg";

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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

        {/* Social Proof Section */}
        <section className="py-16 px-6 border-b border-border">
          <AnimatedSection>
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Image className="w-5 h-5 text-muted-foreground" />
                    <span className="text-3xl md:text-4xl font-light">500K+</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" ? "Imagens Geradas" : "Images Generated"}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="text-3xl md:text-4xl font-light">12K+</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" ? "Usuários Ativos" : "Active Users"}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Layers className="w-5 h-5 text-muted-foreground" />
                    <span className="text-3xl md:text-4xl font-light">50+</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" ? "Blueprints" : "Blueprints"}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <span className="text-3xl md:text-4xl font-light">99.9%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" ? "Uptime" : "Uptime"}
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-6">
          <AnimatedSection>
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-2xl md:text-3xl font-medium mb-3">
                  {language === "pt-BR" ? "Como Funciona" : "How It Works"}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  {language === "pt-BR" 
                    ? "Crie prompts profissionais em 4 passos simples"
                    : "Create professional prompts in 4 simple steps"}
                </p>
              </div>
              
              <div className="grid md:grid-cols-4 gap-8">
                <div className="text-center group">
                  <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mx-auto mb-4 transition-colors group-hover:border-foreground/30">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">01</div>
                  <h3 className="font-medium mb-2">
                    {language === "pt-BR" ? "Escolha o Blueprint" : "Choose Blueprint"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" 
                      ? "Selecione entre dezenas de templates profissionais"
                      : "Select from dozens of professional templates"}
                  </p>
                </div>
                
                <div className="text-center group">
                  <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mx-auto mb-4 transition-colors group-hover:border-foreground/30">
                    <Wand2 className="w-6 h-6" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">02</div>
                  <h3 className="font-medium mb-2">
                    {language === "pt-BR" ? "Configure Filtros" : "Configure Filters"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" 
                      ? "Ajuste estética, câmera e estilo temporal"
                      : "Adjust aesthetics, camera and temporal style"}
                  </p>
                </div>
                
                <div className="text-center group">
                  <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mx-auto mb-4 transition-colors group-hover:border-foreground/30">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">03</div>
                  <h3 className="font-medium mb-2">
                    {language === "pt-BR" ? "Gere o Prompt" : "Generate Prompt"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" 
                      ? "Compile prompts otimizados para cada modelo"
                      : "Compile optimized prompts for each model"}
                  </p>
                </div>
                
                <div className="text-center group">
                  <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center mx-auto mb-4 transition-colors group-hover:border-foreground/30">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">04</div>
                  <h3 className="font-medium mb-2">
                    {language === "pt-BR" ? "Crie Imagens" : "Create Images"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt-BR" 
                      ? "Use o prompt em qualquer modelo de IA"
                      : "Use the prompt in any AI model"}
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </section>

        {/* Showcase Section */}
        <section className="py-20 px-6 bg-card/30">
          <AnimatedSection>
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-medium mb-3">
                  {language === "pt-BR" ? "Criado com Vectra AI" : "Created with Vectra AI"}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {language === "pt-BR" 
                  ? "Veja o que nossos usuários estão criando com prompts otimizados e modelos de última geração."
                  : "See what our users are creating with optimized prompts and cutting-edge models."}
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="relative rounded-xl overflow-hidden aspect-[4/5] group">
                <img 
                  src={sampleStudio} 
                  alt="Music Studio Dubai" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium">
                    {language === "pt-BR" ? "Estúdio de Música" : "Music Studio"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "pt-BR" ? "Sessão noturna em Dubai" : "Night session in Dubai"}
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl overflow-hidden aspect-[4/5] group">
                <img 
                  src={sampleCCTV1} 
                  alt="CCTV Detection" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium">
                    {language === "pt-BR" ? "Estética CCTV" : "CCTV Aesthetic"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "pt-BR" ? "Detecção e vigilância realista" : "Realistic detection and surveillance"}
                  </p>
                </div>
              </div>
              
              <div className="relative rounded-xl overflow-hidden aspect-[4/5] group">
                <img 
                  src={sampleCCTV2} 
                  alt="Street Scene" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm font-medium">
                    {language === "pt-BR" ? "Cena Urbana" : "Urban Scene"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "pt-BR" ? "Fotorrealismo de rua" : "Street photorealism"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </AnimatedSection>
        </section>
      </main>

      {/* Floating CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={handleLogin}
          size="lg"
          className="shadow-lg gap-2"
          data-testid="button-floating-cta"
        >
          <Clock className="w-4 h-4" />
          {language === "pt-BR" ? "Oferta Limitada" : "Limited Offer"}
        </Button>
      </motion.div>

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
