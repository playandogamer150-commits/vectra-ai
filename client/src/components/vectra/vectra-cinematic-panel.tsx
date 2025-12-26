import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { VectraTabs, VectraTabContent } from "./vectra-tabs";
import { VectraSecureInput } from "./vectra-secure-input";
import { VectraUploadSlot } from "./vectra-upload-slot";
import { VectraSlider } from "./vectra-slider";
import { 
  Camera, Film, User, Shirt, 
  Eye, Scan, Square, RectangleVertical, 
  RectangleHorizontal, Sparkles,
  Video, Smartphone, Focus, Crosshair, Clapperboard,
  Power, Moon, SunDim, Contrast, Droplets, Tv,
  Wand2, Crown, Leaf, Watch, Wrench, Maximize, Minimize,
  Move, ArrowDownRight, Zap, ChevronDown, HelpCircle, X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

interface VectraCinematicPanelProps {
  isPremium: boolean;
  onSettingsChange?: (settings: CinematicSettings) => void;
  className?: string;
}

export interface CinematicSettings {
  optics: {
    style: string;
    aspectRatio: string;
    sampleCount: number;
  };
  vfx: {
    effects: string[];
    intensity: number;
  };
  subjects: {
    subjectA: SubjectData;
    subjectB: SubjectData;
  };
  styleDna: {
    brand: string;
    layering: string;
    fit: string;
    outerwear: string;
    footwear: string;
    bottom: string;
    moodboard: { id: string; url: string }[];
  };
  customApiKey?: string;
}

interface SubjectData {
  faceImages: { id: string; url: string }[];
  bodyImages: { id: string; url: string }[];
  signatureImages: { id: string; url: string }[];
}

const OPTICS_OPTIONS = [
  { id: "cinematic", label: "Cine", icon: Clapperboard, description: "Estilo cinematográfico profissional com visual de filme" },
  { id: "smartphone", label: "Phone", icon: Smartphone, description: "Visual realista de foto tirada com smartphone" },
  { id: "iphone-hdr", label: "HDR", icon: Sparkles, description: "Foto estilo iPhone com HDR máximo e cores vibrantes" },
  { id: "realistic-raw", label: "RAW", icon: Focus, description: "Foto realista sem processamento, como arquivo RAW" },
  { id: "forensic-dslr", label: "DSLR", icon: Crosshair, description: "Estilo de câmera DSLR profissional com foco preciso" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1", icon: Square, description: "Formato quadrado - ideal para Instagram posts" },
  { id: "9:16", label: "9:16", icon: RectangleVertical, description: "Formato vertical - ideal para Stories e Reels" },
  { id: "16:9", label: "16:9", icon: RectangleHorizontal, description: "Formato horizontal - ideal para YouTube e desktop" },
];

const VFX_OPTIONS = [
  { id: "off", label: "OFF", icon: Power, description: "Desativar todos os efeitos visuais" },
  { id: "vhs", label: "VHS", icon: Tv, description: "Efeito de fita VHS retrô dos anos 80/90" },
  { id: "35mm", label: "35MM", icon: Film, description: "Granulação e textura de filme analógico 35mm" },
  { id: "nvg", label: "NVG", icon: Eye, description: "Visão noturna com tonalidade verde militar" },
  { id: "cine", label: "CINE", icon: Video, description: "Color grading cinematográfico profissional" },
  { id: "gltch", label: "GLTCH", icon: Zap, description: "Efeito de glitch digital e distorção" },
  { id: "blum", label: "BLUM", icon: SunDim, description: "Efeito bloom com brilho suave nas luzes" },
  { id: "grain", label: "GRAIN", icon: Droplets, description: "Textura granulada sutil de filme" },
  { id: "leak", label: "LEAK", icon: Sparkles, description: "Vazamento de luz artístico vintage" },
  { id: "scan", label: "SCAN", icon: Scan, description: "Linhas de escaneamento estilo monitor CRT" },
  { id: "noir", label: "NOIR", icon: Moon, description: "Preto e branco dramático estilo film noir" },
  { id: "teal", label: "TEAL", icon: Contrast, description: "Color grading teal & orange de Hollywood" },
];

const BRAND_OPTIONS = [
  { id: "auto", label: "Auto", icon: Wand2, description: "Detectar automaticamente o estilo da imagem" },
  { id: "streetwear", label: "Street", icon: Shirt, description: "Estilo streetwear urbano e casual" },
  { id: "luxury", label: "Luxury", icon: Crown, description: "Estética luxuosa e sofisticada" },
  { id: "minimalist", label: "Minimal", icon: Leaf, description: "Design minimalista e clean" },
  { id: "vintage", label: "Vintage", icon: Watch, description: "Visual retrô e clássico atemporal" },
  { id: "techwear", label: "Tech", icon: Wrench, description: "Estilo futurista e funcional techwear" },
];

const FIT_OPTIONS = [
  { id: "oversized", label: "Over", icon: Maximize, description: "Caimento oversized e folgado" },
  { id: "relaxed", label: "Relax", icon: Move, description: "Caimento relaxado e confortável" },
  { id: "regular", label: "Reg", icon: Square, description: "Caimento regular padrão" },
  { id: "slim", label: "Slim", icon: Minimize, description: "Caimento slim e ajustado" },
  { id: "tailored", label: "Tail", icon: ArrowDownRight, description: "Caimento alfaiataria sob medida" },
];

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  testId: string;
  badge?: string;
  helpContent?: React.ReactNode;
}

function AccordionSection({ title, icon, isOpen, onToggle, children, testId, badge, helpContent }: AccordionSectionProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto"
          data-testid={`${testId}-trigger`}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
            {badge && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {badge}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {helpContent && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`${testId}-help`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      {icon}
                      {title} - Guia de Uso
                    </DialogTitle>
                  </DialogHeader>
                  {helpContent}
                </DialogContent>
              </Dialog>
            )}
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface TooltipButtonProps {
  option: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; description: string };
  isSelected: boolean;
  onClick: () => void;
  testId: string;
  showLabel?: boolean;
}

function TooltipButton({ option, isSelected, onClick, testId, showLabel = false }: TooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          onClick={onClick}
          className={cn("gap-1.5", showLabel ? "" : "px-2")}
          data-testid={testId}
        >
          <option.icon className="w-3.5 h-3.5" />
          {showLabel && <span className="text-xs">{option.label}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <p className="font-medium">{option.label}</p>
        <p className="text-xs text-muted-foreground">{option.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function VectraCinematicPanel({ 
  isPremium, 
  onSettingsChange,
  className 
}: VectraCinematicPanelProps) {
  const { t } = useI18n();
  
  const [opticsStyle, setOpticsStyle] = useState("cinematic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [sampleCount, setSampleCount] = useState(1);
  
  const [vfxEffects, setVfxEffects] = useState<string[]>(["off"]);
  const [vfxIntensity, setVfxIntensity] = useState(3);
  
  const [subjectTab, setSubjectTab] = useState("a");
  const [subjectA, setSubjectA] = useState<SubjectData>({
    faceImages: [],
    bodyImages: [],
    signatureImages: [],
  });
  const [subjectB, setSubjectB] = useState<SubjectData>({
    faceImages: [],
    bodyImages: [],
    signatureImages: [],
  });
  
  const [styleBrand, setStyleBrand] = useState("auto");
  const [styleLayering, setStyleLayering] = useState("relaxed");
  const [styleFit, setStyleFit] = useState("regular");
  const [styleOuterwear, setStyleOuterwear] = useState("");
  const [styleFootwear, setStyleFootwear] = useState("");
  const [styleBottom, setStyleBottom] = useState("");
  const [moodboard, setMoodboard] = useState<{ id: string; url: string }[]>([]);
  
  const [customApiKey, setCustomApiKey] = useState("");
  
  const [openSection, setOpenSection] = useState<string | null>("optics");

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  useEffect(() => {
    if (onSettingsChange) {
      const settings: CinematicSettings = {
        optics: {
          style: opticsStyle,
          aspectRatio,
          sampleCount,
        },
        vfx: {
          effects: vfxEffects,
          intensity: vfxIntensity,
        },
        subjects: {
          subjectA,
          subjectB,
        },
        styleDna: {
          brand: styleBrand,
          layering: styleLayering,
          fit: styleFit,
          outerwear: styleOuterwear,
          footwear: styleFootwear,
          bottom: styleBottom,
          moodboard,
        },
        customApiKey: customApiKey || undefined,
      };
      onSettingsChange(settings);
    }
  }, [
    opticsStyle, aspectRatio, sampleCount,
    vfxEffects, vfxIntensity,
    subjectA, subjectB,
    styleBrand, styleLayering, styleFit, styleOuterwear, styleFootwear, styleBottom, moodboard,
    customApiKey, onSettingsChange
  ]);

  const handleImageUpload = useCallback((
    subject: "a" | "b",
    type: "face" | "body" | "signature",
    files: File[]
  ) => {
    const setSubject = subject === "a" ? setSubjectA : setSubjectB;
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newImage = { id: crypto.randomUUID(), url };
        
        setSubject((prev) => ({
          ...prev,
          [`${type}Images`]: [...prev[`${type}Images`], newImage].slice(0, 20),
        }));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleRemoveImage = useCallback((
    subject: "a" | "b",
    type: "face" | "body" | "signature",
    id: string
  ) => {
    const setSubject = subject === "a" ? setSubjectA : setSubjectB;
    setSubject((prev) => ({
      ...prev,
      [`${type}Images`]: prev[`${type}Images`].filter((img) => img.id !== id),
    }));
  }, []);

  const handleMoodboardUpload = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newImage = { id: crypto.randomUUID(), url };
        setMoodboard((prev) => [...prev, newImage].slice(0, 20));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const testApiKey = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/validate-custom-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: customApiKey }),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const currentSubject = subjectTab === "a" ? subjectA : subjectB;

  const vfxCount = vfxEffects.filter(e => e !== "off").length;
  const subjectCount = subjectA.faceImages.length + subjectB.faceImages.length;

  const opticsHelp = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Controle o estilo visual da câmera e formato da imagem gerada.
      </p>
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Estilos de Câmera</h4>
        {OPTICS_OPTIONS.map(opt => (
          <div key={opt.id} className="flex items-start gap-2">
            <div className="p-1.5 rounded bg-muted">
              <opt.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Proporções</h4>
        {ASPECT_RATIOS.map(ar => (
          <div key={ar.id} className="flex items-start gap-2">
            <div className="p-1.5 rounded bg-muted">
              <ar.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{ar.label}</p>
              <p className="text-xs text-muted-foreground">{ar.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-xs text-muted-foreground">
          <strong>Samples:</strong> Controla quantas variações da imagem serão geradas. Mais samples = mais opções para escolher.
        </p>
      </div>
    </div>
  );

  const vfxHelp = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Adicione efeitos visuais cinematográficos à sua imagem. Você pode combinar múltiplos efeitos.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {VFX_OPTIONS.map(opt => (
          <div key={opt.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <div className="p-1 rounded bg-muted">
              <opt.icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-medium">{opt.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{opt.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-xs text-muted-foreground">
          <strong>Intensidade:</strong> Controla o quão forte os efeitos serão aplicados. 0 = sutil, 5 = extremo.
        </p>
      </div>
    </div>
  );

  const styleHelp = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina a estética e o caimento das roupas na imagem gerada.
      </p>
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Estética</h4>
        <div className="grid grid-cols-2 gap-2">
          {BRAND_OPTIONS.map(opt => (
            <div key={opt.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
              <div className="p-1 rounded bg-muted">
                <opt.icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{opt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Caimento (Fit)</h4>
        <div className="grid grid-cols-2 gap-2">
          {FIT_OPTIONS.map(opt => (
            <div key={opt.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
              <div className="p-1 rounded bg-muted">
                <opt.icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{opt.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const subjectsHelp = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Faça upload de fotos de referência para manter a consistência do personagem nas imagens geradas.
      </p>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-sm font-medium">Sujeito A & B</p>
          <p className="text-xs text-muted-foreground">
            Você pode definir até 2 personagens diferentes. Útil para cenas com múltiplas pessoas.
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-sm font-medium">Face</p>
          <p className="text-xs text-muted-foreground">
            Fotos do rosto do personagem. Use fotos frontais com boa iluminação para melhores resultados.
          </p>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-xs">
          <strong>Dica Pro:</strong> Quanto mais fotos de referência você adicionar, maior será a consistência do personagem gerado (recomendado: 3-5 fotos).
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn("vectra-cinematic-panel divide-y divide-border/50 rounded-lg border bg-card", className)}>
      {/* Optics Section */}
      <AccordionSection
        title="Óptica"
        icon={<Camera className="w-4 h-4" />}
        isOpen={openSection === "optics"}
        onToggle={() => toggleSection("optics")}
        testId="panel-optics"
        badge={opticsStyle !== "cinematic" ? OPTICS_OPTIONS.find(o => o.id === opticsStyle)?.label : undefined}
        helpContent={opticsHelp}
      >
        <div className="space-y-3 pt-2">
          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Estilo de Câmera</span>
            <div className="flex flex-wrap gap-1">
              {OPTICS_OPTIONS.map((opt) => (
                <TooltipButton
                  key={opt.id}
                  option={opt}
                  isSelected={opticsStyle === opt.id}
                  onClick={() => setOpticsStyle(opt.id)}
                  testId={`optics-${opt.id}`}
                  showLabel
                />
              ))}
            </div>
          </div>
          
          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Proporção</span>
            <div className="flex gap-1">
              {ASPECT_RATIOS.map((ar) => (
                <TooltipButton
                  key={ar.id}
                  option={ar}
                  isSelected={aspectRatio === ar.id}
                  onClick={() => setAspectRatio(ar.id)}
                  testId={`aspect-${ar.id}`}
                  showLabel
                />
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Samples</span>
              <span className="text-xs font-mono text-muted-foreground">{sampleCount}</span>
            </div>
            <VectraSlider
              value={sampleCount}
              onChange={setSampleCount}
              min={1}
              max={4}
              testId="slider-samples"
            />
          </div>
        </div>
      </AccordionSection>

      {/* VFX Section */}
      <AccordionSection
        title="VFX"
        icon={<Film className="w-4 h-4" />}
        isOpen={openSection === "vfx"}
        onToggle={() => toggleSection("vfx")}
        testId="panel-vfx"
        badge={vfxCount > 0 ? `${vfxCount} ativo${vfxCount > 1 ? 's' : ''}` : undefined}
        helpContent={vfxHelp}
      >
        <div className="space-y-3 pt-2">
          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Efeitos Visuais</span>
            <div className="flex flex-wrap gap-1">
              {VFX_OPTIONS.map((opt) => (
                <TooltipButton
                  key={opt.id}
                  option={opt}
                  isSelected={vfxEffects.includes(opt.id)}
                  onClick={() => {
                    if (opt.id === "off") {
                      setVfxEffects(["off"]);
                    } else {
                      setVfxEffects(prev => {
                        const newEffects = prev.filter(e => e !== "off");
                        if (prev.includes(opt.id)) {
                          const result = newEffects.filter(e => e !== opt.id);
                          return result.length === 0 ? ["off"] : result;
                        }
                        return [...newEffects, opt.id];
                      });
                    }
                  }}
                  testId={`vfx-${opt.id}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Intensidade</span>
              <span className="text-xs font-mono text-muted-foreground">{vfxIntensity}</span>
            </div>
            <VectraSlider
              value={vfxIntensity}
              onChange={setVfxIntensity}
              min={0}
              max={5}
              testId="slider-vfx-intensity"
            />
          </div>
        </div>
      </AccordionSection>

      {/* Subjects Section */}
      <AccordionSection
        title="Sujeitos"
        icon={<User className="w-4 h-4" />}
        isOpen={openSection === "subjects"}
        onToggle={() => toggleSection("subjects")}
        testId="panel-subjects"
        badge={subjectCount > 0 ? `${subjectCount} foto${subjectCount > 1 ? 's' : ''}` : undefined}
        helpContent={subjectsHelp}
      >
        <div className="space-y-3 pt-2">
          <VectraTabs
            tabs={[
              { id: "a", label: "Sujeito A" },
              { id: "b", label: "Sujeito B" },
            ]}
            activeTab={subjectTab}
            onTabChange={setSubjectTab}
            testId="tabs-subjects"
          />
          
          <VectraTabContent>
            <VectraUploadSlot
              images={currentSubject.faceImages}
              maxImages={5}
              onUpload={(files) => handleImageUpload(subjectTab as "a" | "b", "face", files)}
              onRemove={(id) => handleRemoveImage(subjectTab as "a" | "b", "face", id)}
              label="Face"
              testId="upload-face"
            />
          </VectraTabContent>
        </div>
      </AccordionSection>

      {/* Style DNA Section */}
      <AccordionSection
        title="Estilo DNA"
        icon={<Shirt className="w-4 h-4" />}
        isOpen={openSection === "style"}
        onToggle={() => toggleSection("style")}
        testId="panel-style"
        helpContent={styleHelp}
      >
        <div className="space-y-3 pt-2">
          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Estética</span>
            <div className="flex flex-wrap gap-1">
              {BRAND_OPTIONS.map((opt) => (
                <TooltipButton
                  key={opt.id}
                  option={opt}
                  isSelected={styleBrand === opt.id}
                  onClick={() => setStyleBrand(opt.id)}
                  testId={`brand-${opt.id}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Caimento (Fit)</span>
            <div className="flex flex-wrap gap-1">
              {FIT_OPTIONS.map((opt) => (
                <TooltipButton
                  key={opt.id}
                  option={opt}
                  isSelected={styleFit === opt.id}
                  onClick={() => setStyleFit(opt.id)}
                  testId={`fit-${opt.id}`}
                />
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Custom API Key - Only for Premium */}
      {isPremium && (
        <div className="p-3">
          <VectraSecureInput
            value={customApiKey}
            onChange={setCustomApiKey}
            onTest={testApiKey}
            label="API Key Personalizada"
            testId="input-custom-api-key"
          />
        </div>
      )}
    </div>
  );
}
