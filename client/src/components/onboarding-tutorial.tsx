import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Wand2, 
  Image, 
  Layers, 
  Sliders, 
  History, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Rocket,
  PartyPopper
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";

interface OnboardingTutorialProps {
  open: boolean;
  onComplete: () => void;
}

interface TutorialStep {
  icon: typeof Sparkles;
  title: string;
  description: string;
  tip?: string;
}

const tutorialSteps: Record<string, TutorialStep[]> = {
  "pt-BR": [
    {
      icon: Rocket,
      title: "Bem-vindo ao Vectra AI!",
      description: "Vamos fazer um tour rápido para você conhecer as principais funcionalidades do estúdio de engenharia de prompts mais poderoso do mercado.",
      tip: "Dica: Este tutorial leva apenas 1 minuto!",
    },
    {
      icon: Layers,
      title: "Blueprints Inteligentes",
      description: "Blueprints são modelos pré-configurados que definem a estrutura do seu prompt. Cada blueprint é otimizado para um estilo específico de imagem.",
      tip: "Dica: Comece com 'Minecraft Style Food' para resultados incríveis!",
    },
    {
      icon: Sliders,
      title: "Filtros Poderosos",
      description: "Use filtros para ajustar cada detalhe do seu prompt: intensidade estética, ângulo da câmera, estilo temporal e muito mais.",
      tip: "Dica: Combine até 3 filtros no plano gratuito.",
    },
    {
      icon: Wand2,
      title: "Motor de Prompts",
      description: "Nosso compilador inteligente combina seu blueprint, filtros e inputs para gerar prompts profissionais otimizados para cada modelo de IA.",
      tip: "Dica: Use seeds para resultados reproduzíveis!",
    },
    {
      icon: Image,
      title: "Estúdio de Imagem",
      description: "Gere imagens de alta fidelidade usando múltiplas imagens de referência. Nossa tecnologia de fusão mantém 95%+ de consistência de personagem.",
      tip: "Dica: Quanto mais imagens de referência, melhor o resultado!",
    },
    {
      icon: History,
      title: "Histórico & Biblioteca",
      description: "Todas as suas gerações são salvas automaticamente. Acesse seu histórico, salve favoritos e reutilize prompts que funcionaram bem.",
      tip: "Dica: Exporte seus prompts em YAML ou PDF!",
    },
    {
      icon: PartyPopper,
      title: "Você está pronto!",
      description: "Parabéns! Agora você conhece o Vectra AI. Comece a criar prompts incríveis e leve sua arte de IA para o próximo nível.",
      tip: "Boas gerações!",
    },
  ],
  "en": [
    {
      icon: Rocket,
      title: "Welcome to Vectra AI!",
      description: "Let's take a quick tour of the main features of the most powerful prompt engineering studio on the market.",
      tip: "Tip: This tutorial takes only 1 minute!",
    },
    {
      icon: Layers,
      title: "Smart Blueprints",
      description: "Blueprints are pre-configured templates that define your prompt structure. Each blueprint is optimized for a specific image style.",
      tip: "Tip: Start with 'Minecraft Style Food' for amazing results!",
    },
    {
      icon: Sliders,
      title: "Powerful Filters",
      description: "Use filters to adjust every detail of your prompt: aesthetic intensity, camera angle, temporal style, and much more.",
      tip: "Tip: Combine up to 3 filters on the free plan.",
    },
    {
      icon: Wand2,
      title: "Prompt Engine",
      description: "Our intelligent compiler combines your blueprint, filters, and inputs to generate professional prompts optimized for each AI model.",
      tip: "Tip: Use seeds for reproducible results!",
    },
    {
      icon: Image,
      title: "Image Studio",
      description: "Generate high-fidelity images using multiple reference images. Our fusion technology maintains 95%+ character consistency.",
      tip: "Tip: More reference images mean better results!",
    },
    {
      icon: History,
      title: "History & Library",
      description: "All your generations are saved automatically. Access your history, save favorites, and reuse prompts that worked well.",
      tip: "Tip: Export your prompts in YAML or PDF!",
    },
    {
      icon: PartyPopper,
      title: "You're ready!",
      description: "Congratulations! Now you know Vectra AI. Start creating amazing prompts and take your AI art to the next level.",
      tip: "Happy generating!",
    },
  ],
};

const buttonLabels = {
  "pt-BR": {
    next: "Próximo",
    prev: "Anterior",
    skip: "Pular tutorial",
    finish: "Começar a criar!",
  },
  "en": {
    next: "Next",
    prev: "Previous",
    skip: "Skip tutorial",
    finish: "Start creating!",
  },
};

export function OnboardingTutorial({ open, onComplete }: OnboardingTutorialProps) {
  const { language } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const lang = language as "pt-BR" | "en";
  const steps = tutorialSteps[lang] || tutorialSteps["pt-BR"];
  const labels = buttonLabels[lang] || buttonLabels["pt-BR"];
  
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const CurrentIcon = steps[currentStep].icon;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg border-border bg-card/95 backdrop-blur-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="mb-4">
          <Progress value={progress} className="h-1" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{currentStep + 1} / {steps.length}</span>
            {!isLastStep && (
              <button 
                onClick={onComplete}
                className="hover:text-foreground transition-colors"
                data-testid="button-skip-tutorial"
              >
                {labels.skip}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="py-4"
          >
            <DialogHeader className="text-center pb-2">
              <motion.div 
                className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-muted/30 to-muted flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <CurrentIcon className="w-10 h-10 text-foreground" />
              </motion.div>
              <DialogTitle className="text-2xl font-semibold">
                {steps[currentStep].title}
              </DialogTitle>
            </DialogHeader>

            <motion.p 
              className="text-center text-muted-foreground mt-4 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {steps[currentStep].description}
            </motion.p>

            {steps[currentStep].tip && (
              <motion.div
                className="mt-6 p-4 rounded-md bg-muted/30 border border-border"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  {steps[currentStep].tip}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex gap-3">
          {currentStep > 0 && !isLastStep && (
            <Button 
              variant="outline" 
              onClick={handlePrev}
              className="flex-1"
              data-testid="button-tutorial-prev"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {labels.prev}
            </Button>
          )}
          <Button 
            onClick={handleNext}
            className={`flex-1 ${currentStep === 0 || isLastStep ? 'w-full' : ''}`}
            data-testid="button-tutorial-next"
          >
            {isLastStep ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {labels.finish}
              </>
            ) : (
              <>
                {labels.next}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep 
                  ? "bg-foreground" 
                  : index < currentStep 
                    ? "bg-muted-foreground" 
                    : "bg-muted"
              }`}
              animate={index === currentStep ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
