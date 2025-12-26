import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Zap, Video, Image, Wand2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: "video" | "image" | "prompt" | "lora" | "filters" | "general";
  customTitle?: string;
  customDescription?: string;
}

const featureIcons = {
  video: Video,
  image: Image,
  prompt: Wand2,
  lora: Sparkles,
  filters: Zap,
  general: Crown,
};

const translations = {
  "pt-BR": {
    title: {
      video: "Limite de Vídeos Atingido",
      image: "Limite de Imagens Atingido",
      prompt: "Limite de Prompts Atingido",
      lora: "Recurso Exclusivo Pro",
      filters: "Filtros Premium",
      general: "Recurso Premium",
    },
    description: {
      video: "Você atingiu o limite diário de geração de vídeos do plano gratuito. Faça upgrade para Pro e tenha gerações ilimitadas.",
      image: "Você atingiu o limite diário de imagens. Com o plano Pro, gere imagens ilimitadas em alta qualidade.",
      prompt: "Você atingiu o limite diário de prompts. Desbloqueie gerações ilimitadas com o plano Pro.",
      lora: "O treinamento de modelos LoRA é exclusivo para assinantes Pro. Crie modelos personalizados com suas próprias imagens.",
      filters: "Você atingiu o limite de filtros do plano gratuito. Desbloqueie todos os filtros com o Pro.",
      general: "Este recurso está disponível apenas para assinantes Pro.",
    },
    benefits: [
      "Gerações ilimitadas de imagens e vídeos",
      "Acesso a todos os blueprints e filtros",
      "Treinamento de modelos LoRA personalizados",
      "Suporte prioritário",
    ],
    upgradeButton: "Fazer Upgrade para Pro",
    maybeLater: "Talvez depois",
  },
  "en": {
    title: {
      video: "Video Limit Reached",
      image: "Image Limit Reached",
      prompt: "Prompt Limit Reached",
      lora: "Pro Exclusive Feature",
      filters: "Premium Filters",
      general: "Premium Feature",
    },
    description: {
      video: "You've reached the daily video generation limit on the free plan. Upgrade to Pro for unlimited generations.",
      image: "You've reached the daily image limit. With Pro, generate unlimited high-quality images.",
      prompt: "You've reached the daily prompt limit. Unlock unlimited generations with Pro.",
      lora: "LoRA model training is exclusive to Pro subscribers. Create custom models with your own images.",
      filters: "You've reached the filter limit on the free plan. Unlock all filters with Pro.",
      general: "This feature is only available for Pro subscribers.",
    },
    benefits: [
      "Unlimited image and video generations",
      "Access to all blueprints and filters",
      "Custom LoRA model training",
      "Priority support",
    ],
    upgradeButton: "Upgrade to Pro",
    maybeLater: "Maybe later",
  },
};

export function UpgradeModal({ 
  open, 
  onOpenChange, 
  feature = "general",
  customTitle,
  customDescription,
}: UpgradeModalProps) {
  const { language } = useI18n();
  const [, navigate] = useLocation();
  const lang = language as "pt-BR" | "en";
  const t = translations[lang] || translations["pt-BR"];
  const Icon = featureIcons[feature];

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card/95 backdrop-blur-sm">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="text-center pb-2">
                <motion.div 
                  className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                  <Icon className="w-8 h-8 text-foreground" />
                </motion.div>
                <DialogTitle className="text-xl font-semibold">
                  {customTitle || t.title[feature]}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2">
                  {customDescription || t.description[feature]}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-3">
                {t.benefits.map((benefit: string, index: number) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3 text-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                  >
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-foreground" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <Button 
                  onClick={handleUpgrade}
                  className="w-full group"
                  data-testid="button-upgrade-modal"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {t.upgradeButton}
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="w-full text-muted-foreground"
                  data-testid="button-upgrade-later"
                >
                  {t.maybeLater}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
