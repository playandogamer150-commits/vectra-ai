import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { VectraPanel } from "./vectra-panel";
import { VectraGridToggle } from "./vectra-grid-toggle";
import { VectraTabs, VectraTabContent } from "./vectra-tabs";
import { VectraSecureInput } from "./vectra-secure-input";
import { VectraUploadSlot } from "./vectra-upload-slot";
import { VectraSlider } from "./vectra-slider";
import { 
  Camera, Aperture, Film, Zap, User, Shirt, Activity, 
  Mic, Settings, Eye, Scan, Square, RectangleVertical, 
  RectangleHorizontal, Sparkles, Layers, CircleDot,
  Video, Smartphone, Focus, Crosshair, Clapperboard,
  Power, Radio, Moon, SunDim, Contrast, Droplets, Tv,
  Wand2, Crown, Leaf, Watch, Wrench, Maximize, Minimize,
  Move, ArrowDownRight, ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  { id: "cinematic", label: "Cinematográfica", icon: Clapperboard },
  { id: "smartphone", label: "Smartphone RL", icon: Smartphone },
  { id: "iphone-hdr", label: "iPhone Max HDR", icon: Sparkles },
  { id: "realistic-raw", label: "Realistic RAW", icon: Focus },
  { id: "forensic-dslr", label: "Forensic DSLR", icon: Crosshair },
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
  { id: "auto", label: "Auto-Detect", icon: Wand2 },
  { id: "streetwear", label: "Streetwear", icon: Shirt },
  { id: "luxury", label: "Luxury", icon: Crown },
  { id: "minimalist", label: "Minimalist", icon: Leaf },
  { id: "vintage", label: "Vintage", icon: Watch },
  { id: "techwear", label: "Techwear", icon: Wrench },
];

const FIT_OPTIONS = [
  { id: "oversized", label: "Oversized", icon: Maximize },
  { id: "relaxed", label: "Relaxed", icon: Move },
  { id: "regular", label: "Regular", icon: Square },
  { id: "slim", label: "Slim", icon: Minimize },
  { id: "tailored", label: "Tailored", icon: ArrowDownRight },
];

const ENGINES = [
  { name: "Vectra Core", status: "live" },
  { name: "Style DNA", status: "live" },
  { name: "VFX Pipeline", status: "live" },
  { name: "Subject Mapping", status: "live" },
];

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(true);

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
  const currentSetSubject = subjectTab === "a" ? setSubjectA : setSubjectB;

  return (
    <div className={cn("vectra-cinematic-panel space-y-2", className)}>
      <VectraPanel
        title="Óptica"
        icon={<Camera className="w-4 h-4" />}
        testId="panel-optics"
      >
        <div className="space-y-3">
          <VectraGridToggle
            options={OPTICS_OPTIONS}
            selected={[opticsStyle]}
            onChange={(s) => setOpticsStyle(s[0])}
            multiSelect={false}
            testId="toggle-optics-style"
          />
          
          <VectraGridToggle
            options={ASPECT_RATIOS}
            selected={[aspectRatio]}
            onChange={(s) => setAspectRatio(s[0])}
            multiSelect={false}
            testId="toggle-aspect-ratio"
          />
          
          <VectraSlider
            label="Samples"
            value={sampleCount}
            onChange={setSampleCount}
            min={1}
            max={4}
            testId="slider-sample-count"
          />
        </div>
      </VectraPanel>

      <VectraPanel
        title="VFX"
        icon={<Film className="w-4 h-4" />}
        testId="panel-vfx"
      >
        <div className="space-y-3">
          <VectraGridToggle
            options={VFX_OPTIONS}
            selected={vfxEffects}
            onChange={setVfxEffects}
            multiSelect={true}
            offOption="off"
            testId="toggle-vfx"
          />
          
          <VectraSlider
            label="Intensidade"
            value={vfxIntensity}
            onChange={setVfxIntensity}
            min={0}
            max={5}
            testId="slider-vfx-intensity"
          />
        </div>
      </VectraPanel>

      <VectraPanel
        title="Sujeitos"
        icon={<User className="w-4 h-4" />}
        testId="panel-subjects"
      >
        <VectraTabs
          tabs={[
            { id: "a", label: "A" },
            { id: "b", label: "B" },
          ]}
          activeTab={subjectTab}
          onTabChange={setSubjectTab}
          testId="tabs-subjects"
        />
        
        <VectraTabContent>
          <div className="space-y-2">
            <VectraUploadSlot
              images={currentSubject.faceImages}
              maxImages={20}
              onUpload={(files) => handleImageUpload(subjectTab as "a" | "b", "face", files)}
              onRemove={(id) => handleRemoveImage(subjectTab as "a" | "b", "face", id)}
              label="Face"
              testId="upload-face"
            />
            
            <VectraUploadSlot
              images={currentSubject.bodyImages}
              maxImages={20}
              onUpload={(files) => handleImageUpload(subjectTab as "a" | "b", "body", files)}
              onRemove={(id) => handleRemoveImage(subjectTab as "a" | "b", "body", id)}
              label="Corpo"
              testId="upload-body"
            />
            
            <VectraUploadSlot
              images={currentSubject.signatureImages}
              maxImages={20}
              onUpload={(files) => handleImageUpload(subjectTab as "a" | "b", "signature", files)}
              onRemove={(id) => handleRemoveImage(subjectTab as "a" | "b", "signature", id)}
              label="Sinais"
              testId="upload-signatures"
            />
          </div>
        </VectraTabContent>
      </VectraPanel>

      <VectraPanel
        title="Estilo"
        icon={<Shirt className="w-4 h-4" />}
        testId="panel-style-dna"
      >
        <div className="space-y-3">
          <VectraGridToggle
            options={BRAND_OPTIONS}
            selected={[styleBrand]}
            onChange={(s) => setStyleBrand(s[0])}
            multiSelect={false}
            testId="toggle-brand"
          />
          
          <VectraGridToggle
            options={FIT_OPTIONS}
            selected={[styleFit]}
            onChange={(s) => setStyleFit(s[0])}
            multiSelect={false}
            testId="toggle-fit"
          />
          
          <VectraUploadSlot
            images={moodboard}
            maxImages={20}
            onUpload={handleMoodboardUpload}
            onRemove={(id) => setMoodboard((prev) => prev.filter((img) => img.id !== id))}
            label="Moodboard"
            testId="upload-moodboard"
          />
        </div>
      </VectraPanel>

      <VectraPanel
        title="Sistema"
        icon={<Activity className="w-4 h-4" />}
        collapsible
        isOpen={diagnosticsOpen}
        onOpenChange={setDiagnosticsOpen}
        testId="panel-diagnostics"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {ENGINES.map((engine) => (
              <Badge key={engine.name} variant="secondary" className="gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse" />
                {engine.name}
              </Badge>
            ))}
          </div>
          
          {isPremium && (
            <VectraSecureInput
              value={customApiKey}
              onChange={setCustomApiKey}
              onTest={testApiKey}
              label="Custom API Key"
              testId="input-custom-api-key"
            />
          )}
        </div>
      </VectraPanel>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="mx-auto"
        data-testid="button-voice"
      >
        <Mic className="w-4 h-4" />
      </Button>
    </div>
  );
}
