import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "pt-BR";

const translations = {
  "en": {
    nav: {
      home: "Home",
      studio: "Studio",
      library: "Library",
      history: "History",
    },
    landing: {
      heroTitle: "Forge Perfect Prompts",
      heroSubtitle: "Professional prompt engineering studio with blueprints, filters, and reproducible seeds for generating production-grade prompts for any LLM.",
      getStarted: "Get Started",
      viewLibrary: "View Library",
      featuresTitle: "Everything You Need",
      featuresSubtitle: "Build production-ready prompts with our comprehensive toolkit",
      feature1Title: "Smart Blueprints",
      feature1Desc: "Pre-built templates for common use cases with customizable blocks and constraints.",
      feature2Title: "Powerful Filters",
      feature2Desc: "Fine-tune your prompts with adjustable parameters for style, quality, and format.",
      feature3Title: "Reproducible Seeds",
      feature3Desc: "Generate consistent results with deterministic seeds for reliable prompt engineering.",
      feature4Title: "Multi-LLM Support",
      feature4Desc: "Optimized profiles for Midjourney, DALL-E, Stable Diffusion, and Flux Pro.",
      feature5Title: "Quality Scoring",
      feature5Desc: "Automatic quality assessment with conflict detection and optimization suggestions.",
      feature6Title: "Version History",
      feature6Desc: "Track all your generations and iterations with full history and replay capability.",
      pricingTitle: "Simple Pricing",
      pricingSubtitle: "Start free, upgrade when you need more",
      free: "Free",
      freePriceMonth: "/month",
      freeFeature1: "3 generations per day",
      freeFeature2: "Basic blueprints",
      freeFeature3: "Up to 3 filters",
      freeFeature4: "Generation history",
      startFree: "Start Free",
      pro: "Pro",
      proPriceMonth: "/month",
      proFeature1: "Unlimited generations",
      proFeature2: "All blueprints",
      proFeature3: "Unlimited filters",
      proFeature4: "Priority support",
      proFeature5: "API access",
      upgradePro: "Upgrade to Pro",
      footer: "Built for prompt engineers who demand precision.",
    },
    studio: {
      title: "Prompt Studio",
      subtitle: "Generate production-grade prompts with precision control",
      configuration: "Configuration",
      llmProfile: "LLM Profile",
      selectProfile: "Select a profile",
      blueprint: "Blueprint",
      selectBlueprint: "Select a blueprint",
      seed: "Seed",
      seedPlaceholder: "Leave empty for random",
      randomize: "Randomize",
      filters: "Filters",
      filtersDesc: "Adjust parameters to fine-tune your prompt",
      selectOption: "Select option",
      inputFields: "Input Fields",
      subject: "Subject",
      subjectPlaceholder: "Main subject of the prompt",
      context: "Context",
      contextPlaceholder: "Background context or setting",
      items: "Items",
      itemsPlaceholder: "Specific items to include",
      environment: "Environment",
      environmentPlaceholder: "Environmental details",
      restrictions: "Restrictions",
      restrictionsPlaceholder: "Things to avoid or exclude",
      generatePrompt: "Generate Prompt",
      generating: "Generating...",
      generatedPrompt: "Generated Prompt",
      copyToClipboard: "Copy to Clipboard",
      exportJson: "Export JSON",
      saveVersion: "Save Version",
      qualityScore: "Quality Score",
      warnings: "Warnings",
      metadata: "Metadata",
      profile: "Profile",
      blocksUsed: "Blocks Used",
      filtersApplied: "Filters Applied",
      selectProfileBlueprint: "Select a profile and blueprint to begin",
      copied: "Copied!",
      promptCopied: "Prompt copied to clipboard",
      versionSaved: "Version Saved",
      versionSavedDesc: "Prompt version saved successfully",
      errorGenerating: "Error generating prompt",
    },
    library: {
      title: "Blueprint Library",
      subtitle: "Browse and discover prompt blueprints for any use case",
      searchPlaceholder: "Search blueprints...",
      allCategories: "All Categories",
      noResults: "No blueprints found matching your criteria",
      useBlueprint: "Use Blueprint",
      blocks: "blocks",
    },
    history: {
      title: "Generation History",
      subtitle: "View and replay your previous prompt generations",
      noHistory: "No generation history yet",
      noHistoryDesc: "Generate your first prompt to see it here",
      goToStudio: "Go to Studio",
      replay: "Replay",
      score: "Score",
    },
    common: {
      loading: "Loading...",
      error: "Error",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
    },
  },
  "pt-BR": {
    nav: {
      home: "Início",
      studio: "Estúdio",
      library: "Biblioteca",
      history: "Histórico",
    },
    landing: {
      heroTitle: "Forje Prompts Perfeitos",
      heroSubtitle: "Estúdio profissional de engenharia de prompts com blueprints, filtros e seeds reproduzíveis para gerar prompts de nível profissional para qualquer LLM.",
      getStarted: "Começar",
      viewLibrary: "Ver Biblioteca",
      featuresTitle: "Tudo que Você Precisa",
      featuresSubtitle: "Construa prompts prontos para produção com nosso kit de ferramentas completo",
      feature1Title: "Blueprints Inteligentes",
      feature1Desc: "Templates pré-construídos para casos de uso comuns com blocos e restrições personalizáveis.",
      feature2Title: "Filtros Poderosos",
      feature2Desc: "Ajuste fino dos seus prompts com parâmetros ajustáveis para estilo, qualidade e formato.",
      feature3Title: "Seeds Reproduzíveis",
      feature3Desc: "Gere resultados consistentes com seeds determinísticas para engenharia de prompts confiável.",
      feature4Title: "Suporte Multi-LLM",
      feature4Desc: "Perfis otimizados para Midjourney, DALL-E, Stable Diffusion e Flux Pro.",
      feature5Title: "Pontuação de Qualidade",
      feature5Desc: "Avaliação automática de qualidade com detecção de conflitos e sugestões de otimização.",
      feature6Title: "Histórico de Versões",
      feature6Desc: "Acompanhe todas as suas gerações e iterações com histórico completo e capacidade de replay.",
      pricingTitle: "Preços Simples",
      pricingSubtitle: "Comece grátis, faça upgrade quando precisar de mais",
      free: "Grátis",
      freePriceMonth: "/mês",
      freeFeature1: "3 gerações por dia",
      freeFeature2: "Blueprints básicos",
      freeFeature3: "Até 3 filtros",
      freeFeature4: "Histórico de gerações",
      startFree: "Começar Grátis",
      pro: "Pro",
      proPriceMonth: "/mês",
      proFeature1: "Gerações ilimitadas",
      proFeature2: "Todos os blueprints",
      proFeature3: "Filtros ilimitados",
      proFeature4: "Suporte prioritário",
      proFeature5: "Acesso à API",
      upgradePro: "Fazer Upgrade para Pro",
      footer: "Feito para engenheiros de prompt que exigem precisão.",
    },
    studio: {
      title: "Estúdio de Prompts",
      subtitle: "Gere prompts de nível profissional com controle preciso",
      configuration: "Configuração",
      llmProfile: "Perfil LLM",
      selectProfile: "Selecione um perfil",
      blueprint: "Blueprint",
      selectBlueprint: "Selecione um blueprint",
      seed: "Seed",
      seedPlaceholder: "Deixe vazio para aleatório",
      randomize: "Aleatorizar",
      filters: "Filtros",
      filtersDesc: "Ajuste os parâmetros para refinar seu prompt",
      selectOption: "Selecione uma opção",
      inputFields: "Campos de Entrada",
      subject: "Assunto",
      subjectPlaceholder: "Assunto principal do prompt",
      context: "Contexto",
      contextPlaceholder: "Contexto ou cenário de fundo",
      items: "Itens",
      itemsPlaceholder: "Itens específicos para incluir",
      environment: "Ambiente",
      environmentPlaceholder: "Detalhes do ambiente",
      restrictions: "Restrições",
      restrictionsPlaceholder: "Coisas a evitar ou excluir",
      generatePrompt: "Gerar Prompt",
      generating: "Gerando...",
      generatedPrompt: "Prompt Gerado",
      copyToClipboard: "Copiar para Área de Transferência",
      exportJson: "Exportar JSON",
      saveVersion: "Salvar Versão",
      qualityScore: "Pontuação de Qualidade",
      warnings: "Avisos",
      metadata: "Metadados",
      profile: "Perfil",
      blocksUsed: "Blocos Usados",
      filtersApplied: "Filtros Aplicados",
      selectProfileBlueprint: "Selecione um perfil e blueprint para começar",
      copied: "Copiado!",
      promptCopied: "Prompt copiado para a área de transferência",
      versionSaved: "Versão Salva",
      versionSavedDesc: "Versão do prompt salva com sucesso",
      errorGenerating: "Erro ao gerar prompt",
    },
    library: {
      title: "Biblioteca de Blueprints",
      subtitle: "Navegue e descubra blueprints de prompts para qualquer uso",
      searchPlaceholder: "Buscar blueprints...",
      allCategories: "Todas as Categorias",
      noResults: "Nenhum blueprint encontrado com seus critérios",
      useBlueprint: "Usar Blueprint",
      blocks: "blocos",
    },
    history: {
      title: "Histórico de Gerações",
      subtitle: "Veja e replique suas gerações de prompts anteriores",
      noHistory: "Nenhum histórico de gerações ainda",
      noHistoryDesc: "Gere seu primeiro prompt para vê-lo aqui",
      goToStudio: "Ir para o Estúdio",
      replay: "Repetir",
      score: "Pontuação",
    },
    common: {
      loading: "Carregando...",
      error: "Erro",
      save: "Salvar",
      cancel: "Cancelar",
      close: "Fechar",
    },
  },
};

type TranslationKey = keyof typeof translations["en"];
type Translations = typeof translations["en"];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language") as Language;
      if (saved && (saved === "en" || saved === "pt-BR")) return saved;
      const browserLang = navigator.language;
      if (browserLang.startsWith("pt")) return "pt-BR";
    }
    return "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = translations[language];

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  
  return (
    <button
      onClick={() => setLanguage(language === "en" ? "pt-BR" : "en")}
      className="text-xs font-medium px-2 py-1 rounded-md bg-muted hover-elevate"
      data-testid="button-language-toggle"
    >
      {language === "en" ? "PT" : "EN"}
    </button>
  );
}
