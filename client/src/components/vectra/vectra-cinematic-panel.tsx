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
  RectangleHorizontal, Sparkles, Layers, CircleDot
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  { id: "cinematic", label: "Cinematográfica" },
  { id: "smartphone", label: "Smartphone RL" },
  { id: "iphone-hdr", label: "iPhone Max HDR" },
  { id: "realistic-raw", label: "Realistic RAW" },
  { id: "forensic-dslr", label: "Forensic DSLR" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1", icon: Square },
  { id: "9:16", label: "9:16", icon: RectangleVertical },
  { id: "16:9", label: "16:9", icon: RectangleHorizontal },
];

const VFX_OPTIONS = [
  { id: "off", label: "OFF" },
  { id: "vhs", label: "VHS" },
  { id: "35mm", label: "35MM" },
  { id: "nvg", label: "NVG" },
  { id: "cine", label: "CINE" },
  { id: "gltch", label: "GLTCH" },
  { id: "blum", label: "BLUM" },
  { id: "grain", label: "GRAIN" },
  { id: "leak", label: "LEAK" },
  { id: "scan", label: "SCAN" },
  { id: "noir", label: "NOIR" },
  { id: "teal", label: "TEAL" },
];

const BRAND_OPTIONS = [
  { id: "auto", label: "Auto-Detect" },
  { id: "streetwear", label: "Streetwear" },
  { id: "luxury", label: "Luxury" },
  { id: "minimalist", label: "Minimalist" },
  { id: "vintage", label: "Vintage" },
  { id: "techwear", label: "Techwear" },
];

const FIT_OPTIONS = [
  { id: "oversized", label: "Oversized" },
  { id: "relaxed", label: "Relaxed" },
  { id: "regular", label: "Regular" },
  { id: "slim", label: "Slim" },
  { id: "tailored", label: "Tailored" },
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
    <div className={cn("vectra-cinematic-panel space-y-4", className)}>
      <VectraPanel
        title="Óptica & Estética"
        icon={<Camera className="w-4 h-4" />}
        testId="panel-optics"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <span className="text-xs text-white/40 uppercase tracking-wide">Estilo de Captura</span>
            <VectraGridToggle
              options={OPTICS_OPTIONS}
              selected={[opticsStyle]}
              onChange={(s) => setOpticsStyle(s[0])}
              multiSelect={false}
              columns={3}
              testId="toggle-optics-style"
            />
          </div>
          
          <div className="space-y-2">
            <span className="text-xs text-white/40 uppercase tracking-wide">Aspect Ratio</span>
            <VectraGridToggle
              options={ASPECT_RATIOS}
              selected={[aspectRatio]}
              onChange={(s) => setAspectRatio(s[0])}
              multiSelect={false}
              columns={3}
              testId="toggle-aspect-ratio"
            />
          </div>
          
          <VectraSlider
            label="Sample Count"
            value={sampleCount}
            onChange={setSampleCount}
            min={1}
            max={4}
            testId="slider-sample-count"
          />
        </div>
      </VectraPanel>

      <VectraPanel
        title="Pós-Processamento & VFX"
        icon={<Film className="w-4 h-4" />}
        testId="panel-vfx"
      >
        <div className="space-y-4">
          <VectraGridToggle
            options={VFX_OPTIONS}
            selected={vfxEffects}
            onChange={setVfxEffects}
            multiSelect={true}
            offOption="off"
            columns={4}
            testId="toggle-vfx"
          />
          
          <VectraSlider
            label="Intensidade VFX"
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
            { id: "a", label: "Sujeito A" },
            { id: "b", label: "Sujeito B" },
          ]}
          activeTab={subjectTab}
          onTabChange={setSubjectTab}
          testId="tabs-subjects"
        />
        
        <VectraTabContent>
          <div className="space-y-4">
            <VectraUploadSlot
              images={currentSubject.faceImages}
              maxImages={20}
              onUpload={(files) => handleImageUpload(subjectTab as "a" | "b", "face", files)}
              onRemove={(id) => handleRemoveImage(subjectTab as "a" | "b", "face", id)}
              label="Face Scan"
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
              label="Assinaturas Corporais"
              testId="upload-signatures"
            />
          </div>
        </VectraTabContent>
      </VectraPanel>

      <VectraPanel
        title="DNA de Estilo & Wardrobe"
        icon={<Shirt className="w-4 h-4" />}
        testId="panel-style-dna"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs text-white/40 uppercase tracking-wide">Designer Brand</span>
            <VectraGridToggle
              options={BRAND_OPTIONS}
              selected={[styleBrand]}
              onChange={(s) => setStyleBrand(s[0])}
              multiSelect={false}
              columns={3}
              testId="toggle-brand"
            />
          </div>
          
          <div className="space-y-2">
            <span className="text-xs text-white/40 uppercase tracking-wide">Fit / Caimento</span>
            <VectraGridToggle
              options={FIT_OPTIONS}
              selected={[styleFit]}
              onChange={(s) => setStyleFit(s[0])}
              multiSelect={false}
              columns={5}
              testId="toggle-fit"
            />
          </div>
          
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
        title="Diagnóstico de Sistemas"
        icon={<Activity className="w-4 h-4" />}
        collapsible
        isOpen={diagnosticsOpen}
        onOpenChange={setDiagnosticsOpen}
        testId="panel-diagnostics"
      >
        <div className="space-y-3">
          {ENGINES.map((engine) => (
            <div
              key={engine.name}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]"
            >
              <span className="text-xs text-white/60">{engine.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider">LIVE</span>
              </div>
            </div>
          ))}
          
          {isPremium && (
            <div className="pt-3 border-t border-white/[0.04]">
              <VectraSecureInput
                value={customApiKey}
                onChange={setCustomApiKey}
                onTest={testApiKey}
                label="Custom API Key"
                hint="Override local • Premium feature"
                testId="input-custom-api-key"
              />
            </div>
          )}
        </div>
      </VectraPanel>

      <button
        type="button"
        className={cn(
          "vectra-voice-btn",
          "flex items-center gap-2 px-4 py-2 mx-auto",
          "rounded-full bg-white/[0.04] border border-white/[0.06]",
          "text-xs text-white/30 hover:text-white/50",
          "transition-all duration-200"
        )}
        data-testid="button-voice"
      >
        <Mic className="w-3.5 h-3.5" />
        <span>Voz</span>
      </button>
    </div>
  );
}
