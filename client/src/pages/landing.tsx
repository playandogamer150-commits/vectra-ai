import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/constants";
import { MonoIcon } from "@/components/mono-icon";
import { Loader2, Sparkles, Layers, Wand2, Download, Clock, Users, Image, Zap, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/50 backdrop-blur-xl border-b border-white/10 supports-[backdrop-filter]:bg-black/20">
        <div className="max-w-[1400px] mx-auto h-full px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MonoIcon name="logo" className="w-8 h-8" />
            <span className="hidden sm:block text-lg font-medium tracking-tight text-white">{BRAND.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                {t.landingPage.pricing}
              </Button>
            </Link>
            <LanguageToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden md:flex text-white hover:bg-white/10">
                {language === "pt-BR" ? "Entrar" : "Log in"}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-white text-black hover:bg-white/90">
                {language === "pt-BR" ? "Começar Agora" : "Get Started"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="min-h-[calc(100vh-64px)] flex items-center relative overflow-hidden bg-black text-white">
          {/* Subtle Monochromatic Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden="true">
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" className="opacity-10" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80" />
          </div>

          <div className="max-w-6xl mx-auto px-6 py-16 w-full relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white" data-testid="text-hero-title">
                    {BRAND.name}
                  </h1>
                  <p className="text-xl text-white/60 font-light max-w-lg">
                    {t.landingPage.tagline}
                  </p>
                </div>

                <p className="text-2xl md:text-3xl font-light text-white/90 leading-snug" data-testid="text-marketing-line">
                  {t.landingPage.marketingLine}
                </p>

                <p className="text-base text-white/50 leading-relaxed max-w-lg" data-testid="text-hero-description">
                  {t.landingPage.description}
                </p>

                <div className="pt-4 space-y-8">
                  <div className="grid gap-6">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3" data-testid={`feature-${i}`}>
                        <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center mt-0.5 shrink-0 bg-white/5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{feature.title}</p>
                          <p className="text-sm text-white/40">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl" data-testid="auth-card">
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-white">{t.landingPage.getStarted}</h2>
                      <p className="text-sm text-white/50">
                        {t.landingPage.signInSubtitle}
                      </p>
                    </div>

                    <div className="grid gap-4">
                      <Link href="/register">
                        <Button className="w-full h-12 text-base bg-white text-black hover:bg-white/90" data-testid="button-register-hero">
                          {language === "pt-BR" ? "Criar Conta Gratuita" : "Create Free Account"}
                        </Button>
                      </Link>
                      <Link href="/login">
                        <Button variant="outline" className="w-full h-12 text-base border-white/10 bg-transparent text-white hover:bg-white/5" data-testid="button-login-hero">
                          {language === "pt-BR" ? "Já tenho uma conta" : "I already have an account"}
                        </Button>
                      </Link>
                    </div>

                    <p className="text-xs text-center text-white/30">
                      {t.landingPage.signInProviders}
                    </p>
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
        <Link href="/register">
          <Button
            size="lg"
            className="shadow-lg gap-2 bg-white text-black hover:bg-white/90 rounded-full h-14 px-8"
            data-testid="button-floating-cta"
          >
            <Clock className="w-5 h-5" />
            <span className="font-medium text-base">{language === "pt-BR" ? "Oferta Limitada" : "Limited Offer"}</span>
          </Button>
        </Link>
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
