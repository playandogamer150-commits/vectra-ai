import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { VectraGridToggle } from "./vectra-grid-toggle";
import { VectraTabs, VectraTabContent } from "./vectra-tabs";
import { VectraSecureInput } from "./vectra-secure-input";
import { VectraUploadSlot } from "./vectra-upload-slot";
import { VectraSlider } from "./vectra-slider";
import { 
  Camera, Film, User, Shirt, 
  Mic, Eye, Scan, Square, RectangleVertical, 
  RectangleHorizontal, Sparkles,
  Video, Smartphone, Focus, Crosshair, Clapperboard,
  Power, Moon, SunDim, Contrast, Droplets, Tv,
  Wand2, Crown, Leaf, Watch, Wrench, Maximize, Minimize,
  Move, ArrowDownRight, Zap, ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  { id: "cinematic", label: "Cine", icon: Clapperboard },
  { id: "smartphone", label: "Phone", icon: Smartphone },
  { id: "iphone-hdr", label: "HDR", icon: Sparkles },
  { id: "realistic-raw", label: "RAW", icon: Focus },
  { id: "forensic-dslr", label: "DSLR", icon: Crosshair },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1", icon: Square },
  { id: "9:16", label: "9:16", icon: RectangleVertical },
  { id: "16:9", label: "16:9", icon: RectangleHorizontal },
];

const VFX_OPTIONS = [
  { id: "off", label: "OFF", icon: Power },
  { id: "vhs", label: "VHS", icon: Tv },
  { id: "35mm", label: "35MM", icon: Film },
  { id: "nvg", label: "NVG", icon: Eye },
  { id: "cine", label: "CINE", icon: Video },
  { id: "gltch", label: "GLTCH", icon: Zap },
  { id: "blum", label: "BLUM", icon: SunDim },
  { id: "grain", label: "GRAIN", icon: Droplets },
  { id: "leak", label: "LEAK", icon: Sparkles },
  { id: "scan", label: "SCAN", icon: Scan },
  { id: "noir", label: "NOIR", icon: Moon },
  { id: "teal", label: "TEAL", icon: Contrast },
];

const BRAND_OPTIONS = [
  { id: "auto", label: "Auto", icon: Wand2 },
  { id: "streetwear", label: "Street", icon: Shirt },
  { id: "luxury", label: "Luxury", icon: Crown },
  { id: "minimalist", label: "Minimal", icon: Leaf },
  { id: "vintage", label: "Vintage", icon: Watch },
  { id: "techwear", label: "Tech", icon: Wrench },
];

const FIT_OPTIONS = [
  { id: "oversized", label: "Over", icon: Maximize },
  { id: "relaxed", label: "Relax", icon: Move },
  { id: "regular", label: "Reg", icon: Square },
  { id: "slim", label: "Slim", icon: Minimize },
  { id: "tailored", label: "Tail", icon: ArrowDownRight },
];

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  testId: string;
  badge?: string;
}

function AccordionSection({ title, icon, isOpen, onToggle, children, testId, badge }: AccordionSectionProps) {
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
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
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
  
  // Accordion state - only one open at a time for cleaner UX
  const [openSection, setOpenSection] = useState<string | null>("optics");

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  // Notify parent of settings changes
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

  // Count active settings for badges
  const vfxCount = vfxEffects.filter(e => e !== "off").length;
  const subjectCount = subjectA.faceImages.length + subjectB.faceImages.length;

  return (
    <div className={cn("vectra-cinematic-panel divide-y divide-border/50 rounded-lg border bg-card", className)}>
      {/* Optics Section */}
      <AccordionSection
        title="Óptica"
        icon={<Camera className="w-4 h-4" />}
        isOpen={openSection === "optics"}
        onToggle={() => toggleSection("optics")}
        testId="panel-optics"
        badge={opticsStyle !== "cinematic" ? opticsStyle.toUpperCase() : undefined}
      >
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-1">
            {OPTICS_OPTIONS.map((opt) => (
              <Button
                key={opt.id}
                variant={opticsStyle === opt.id ? "default" : "outline"}
                size="sm"
                onClick={() => setOpticsStyle(opt.id)}
                className="gap-1.5"
                data-testid={`optics-${opt.id}`}
              >
                <opt.icon className="w-3.5 h-3.5" />
                <span className="text-xs">{opt.label}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16">Proporção</span>
            <div className="flex gap-1">
              {ASPECT_RATIOS.map((ar) => (
                <Button
                  key={ar.id}
                  variant={aspectRatio === ar.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAspectRatio(ar.id)}
                  data-testid={`aspect-${ar.id}`}
                >
                  <ar.icon className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16">Samples</span>
            <div className="flex-1">
              <VectraSlider
                value={sampleCount}
                onChange={setSampleCount}
                min={1}
                max={4}
                testId="slider-samples"
              />
            </div>
            <span className="text-xs font-mono w-4 text-right">{sampleCount}</span>
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
        badge={vfxCount > 0 ? `${vfxCount}` : undefined}
      >
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-1">
            {VFX_OPTIONS.slice(0, 6).map((opt) => (
              <Button
                key={opt.id}
                variant={vfxEffects.includes(opt.id) ? "default" : "outline"}
                size="sm"
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
                data-testid={`vfx-${opt.id}`}
              >
                <opt.icon className="w-3.5 h-3.5" />
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {VFX_OPTIONS.slice(6).map((opt) => (
              <Button
                key={opt.id}
                variant={vfxEffects.includes(opt.id) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setVfxEffects(prev => {
                    const newEffects = prev.filter(e => e !== "off");
                    if (prev.includes(opt.id)) {
                      const result = newEffects.filter(e => e !== opt.id);
                      return result.length === 0 ? ["off"] : result;
                    }
                    return [...newEffects, opt.id];
                  });
                }}
                data-testid={`vfx-${opt.id}`}
              >
                <opt.icon className="w-3.5 h-3.5" />
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16">Intensidade</span>
            <div className="flex-1">
              <VectraSlider
                value={vfxIntensity}
                onChange={setVfxIntensity}
                min={0}
                max={5}
                testId="slider-vfx-intensity"
              />
            </div>
            <span className="text-xs font-mono w-4 text-right">{vfxIntensity}</span>
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
        badge={subjectCount > 0 ? `${subjectCount}` : undefined}
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
      >
        <div className="space-y-3 pt-2">
          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Estética</span>
            <div className="flex flex-wrap gap-1">
              {BRAND_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={styleBrand === opt.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStyleBrand(opt.id)}
                  data-testid={`brand-${opt.id}`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                </Button>
              ))}
            </div>
          </div>
          
          <div>
            <span className="text-xs text-muted-foreground mb-1.5 block">Fit</span>
            <div className="flex flex-wrap gap-1">
              {FIT_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={styleFit === opt.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStyleFit(opt.id)}
                  data-testid={`fit-${opt.id}`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                </Button>
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
