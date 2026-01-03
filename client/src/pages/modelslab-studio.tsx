import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useAutoSave, useUnsavedChangesWarning } from "@/hooks/use-auto-save";
import { SaveStatusIndicator, SessionRecoveryBanner } from "@/components/save-status-indicator";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { AppUser, LlmProfile, PromptBlueprint, Filter, SavedImage, FilterPreset, SavedVideo } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import {
  Loader2, ImagePlus, Sparkles, X, Download, ExternalLink, Upload, Clipboard,
  ChevronDown, ChevronUp, Layers, SlidersHorizontal, Wand2, RefreshCw, Heart,
  Save, Trash2, FolderOpen, BookmarkPlus, Video, Play, FileJson, FileText as FileTextIcon, FileDown,
  Square, Info, Zap, Film, Palette, Pause, ScanFace, PackageCheck
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportToJSON, exportToYAML, exportToPDF } from "@/lib/export-utils";
import { UpgradeModal } from "@/components/upgrade-modal";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { VectraCinematicPanel, type CinematicSettings, VectraGemCard, VectraLaodingTriangle } from "@/components/vectra";
import { StudioPage, StudioHeader } from "@/components/layout/StudioLayout";
import { InfoGuide } from "@/components/info-guide";

interface ModelsLabResponse {
  status: string;
  generationTime?: number;
  id?: number;
  output?: string[];
  fetch_result?: string;
  eta?: number;
  message?: string;
  modelUsed?: string;
  imageQuality?: "hq" | "standard";
  hqExhausted?: boolean;
  quotas?: {
    hq: { used: number; limit: number };
    standard: { used: number; limit: number };
  };
}

interface Sora2Response {
  status: string;
  generationTime?: number;
  id?: number;
  output?: string[];
  fetch_result?: string;
  eta?: number;
  message?: string;
}

interface UploadedImage {
  id: string;
  dataUrl: string;
  name: string;
}

interface UserBlueprint {
  id: string;
  name: string;
  description: string | null;
  category: string;
  blocks: string[];
}

interface GeneratedPromptResult {
  compiledPrompt: string;
  seed: string;
}

type FilterValue = Record<string, string>;

function getProxiedVideoUrl(url: string): string {
  if (!url) return url;
  const needsProxy = url.includes("r2.dev") ||
    url.includes("modelslab.com") ||
    url.includes("stablediffusionapi.com");
  if (needsProxy) {
    return `/api/proxy/media?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function VideoThumbnail({
  src,
  poster,
  className,
  testId,
  onPlay,
  onPause
}: {
  src: string;
  poster?: string;
  className?: string;
  testId?: string;
  onPlay?: () => void;
  onPause?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(poster || null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || poster) return;

    const handleLoadedData = () => {
      setIsLoaded(true);
      video.currentTime = 0.5;
    };

    const handleSeeked = () => {
      const canvas = canvasRef.current;
      if (!canvas || !video) return;

      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setThumbnail(dataUrl);
        } catch (e) {
          console.warn('Could not capture video frame');
        }
      }
    };

    const handleError = () => {
      setHasError(true);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };
  }, [src, poster]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <video
        ref={videoRef}
        src={getProxiedVideoUrl(src)}
        poster={thumbnail || undefined}
        className={className}
        data-testid={testId}
        muted
        loop
        playsInline
        preload="auto"
        onMouseEnter={(e) => {
          e.currentTarget.play().catch(() => { });
          onPlay?.();
        }}
        onMouseLeave={(e) => {
          e.currentTarget.pause();
          e.currentTarget.currentTime = 0;
          onPause?.();
        }}
      />
      {hasError && !thumbnail && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <Play className="w-8 h-8 text-muted-foreground" />
        </div>
      )}
    </>
  );
}

export default function ModelsLabStudioPage() {
  const { toast } = useToast();
  const { t, language } = useI18n();

  useEffect(() => {
    document.title = "Studio | VECTRA AI";
  }, []);


  const FILTER_TRANSLATIONS: Record<string, string> = {
    "front": "Frente",
    "side": "Lado",
    "back": "Costas",
    "above": "De Cima",
    "below": "De Baixo",
    "closeup": "Close-up",
    "wide": "Angular",
    "telephoto": "Teleobjetiva",
    "macro": "Macro",
    "fisheye": "Olho de Peixe",
    "portrait": "Retrato",
    "landscape": "Paisagem",
    "cyberpunk": "Cyberpunk",
    "steampunk": "Steampunk",
    "fantasy": "Fantasia",
    "sci-fi": "Sci-Fi",
    "noir": "Noir",
    "minimalist": "Minimalista",
    "abstract": "Abstrato",
    "realistic": "Realista",
    "cartoon": "Cartoon",
    "anime": "Anime",
    "oil painting": "Pintura a Óleo",
    "watercolor": "Aquarela",
    "sketch": "Esboço",
    "pencil": "Lápis"
  };

  const FILTER_DESCRIPTIONS: Record<string, string> = {
    "aesthetic_intensity": "Define a intensidade do estilo artístico. 'Low' mantém mais natural, 'Extreme' força um visual muito processado.",
    "ugc_realism": "Simula a qualidade da foto. 'UGC/Phone' parece foto de amador/celular. 'Pro' parece câmera profissional.",
    "layout_entropy": "Controla a bagunça da cena. 'Strict' mantém tudo organizado e limpo. 'Loose' adiciona mais elementos aleatórios.",
    "camera_bias": "Imita o 'olhar' de dispositivos específicos. CCTV (câmera de segurança), Drone, DSLR profissional, etc.",
    "temporal_style": "Define a estética de uma época (ex: Y2K anos 2000, VHS anos 90, Retrofuturismo).",
    "prompt_length": "Define o tamanho do prompt gerado. 'Long' permite que a IA alucine mais detalhes ricos e criativos.",
    "camera_angle": "Define o ângulo da tomada (de cima, de baixo, close-up, etc).",
    "lighting_style": "Define a atmosfera de iluminação da cena.",
    "aspect_ratio": "Proporção da imagem (Quadrada, Retrato, Paisagem)."
  };

  const { user } = useAuth();

  const { data: profile } = useQuery<AppUser>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  // Safe isAdmin check defaulting to false
  const isAdmin = profile?.isAdmin === 1;

  // Image state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prompt state
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Generation mode: "img2img", "text2img" or "product-avatar"
  const [generationMode, setGenerationMode] = useState<"img2img" | "text2img" | "product-avatar">(() => {
    try {
      const saved = sessionStorage.getItem("vectra-generation-mode");
      return (saved === "text2img" || saved === "product-avatar") ? saved : "img2img";
    } catch { return "img2img"; }
  });

  // Product Avatar Mode State
  const [faceImage, setFaceImage] = useState<UploadedImage | null>(null);
  const [productImage, setProductImage] = useState<UploadedImage | null>(null);

  // Persist generation mode
  useEffect(() => {
    sessionStorage.setItem("vectra-generation-mode", generationMode);
  }, [generationMode]);

  // ============ PROMPT ENGINE STATE WITH SESSION PERSISTENCE ============
  // These states persist across page navigation within the same browser session
  const [usePromptEngine, setUsePromptEngine] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem("vectra-use-prompt-engine");
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const [selectedProfile, setSelectedProfile] = useState<string>(() => {
    try {
      return sessionStorage.getItem("vectra-selected-profile") || "";
    } catch { return ""; }
  });

  const [selectedBlueprint, setSelectedBlueprint] = useState<string>(() => {
    try {
      return sessionStorage.getItem("vectra-selected-blueprint") || "";
    } catch { return ""; }
  });

  const [selectedUserBlueprint, setSelectedUserBlueprint] = useState<string>(() => {
    try {
      return sessionStorage.getItem("vectra-selected-user-blueprint") || "";
    } catch { return ""; }
  });

  const [blueprintTab, setBlueprintTab] = useState<"system" | "custom">(() => {
    try {
      const saved = sessionStorage.getItem("vectra-blueprint-tab");
      return (saved === "custom" ? "custom" : "system");
    } catch { return "system"; }
  });

  const [activeFilters, setActiveFilters] = useState<FilterValue>(() => {
    try {
      const saved = sessionStorage.getItem("vectra-active-filters");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [seed, setSeed] = useState<string>(() => {
    try {
      return sessionStorage.getItem("vectra-seed") || "";
    } catch { return ""; }
  });

  const [subject, setSubject] = useState(() => {
    try {
      return sessionStorage.getItem("vectra-subject") || "";
    } catch { return ""; }
  });

  // ============ PERSIST PROMPT ENGINE STATE ============
  useEffect(() => {
    sessionStorage.setItem("vectra-use-prompt-engine", JSON.stringify(usePromptEngine));
  }, [usePromptEngine]);

  useEffect(() => {
    sessionStorage.setItem("vectra-selected-profile", selectedProfile);
  }, [selectedProfile]);

  useEffect(() => {
    sessionStorage.setItem("vectra-selected-blueprint", selectedBlueprint);
  }, [selectedBlueprint]);

  useEffect(() => {
    sessionStorage.setItem("vectra-selected-user-blueprint", selectedUserBlueprint);
  }, [selectedUserBlueprint]);

  useEffect(() => {
    sessionStorage.setItem("vectra-blueprint-tab", blueprintTab);
  }, [blueprintTab]);

  useEffect(() => {
    sessionStorage.setItem("vectra-active-filters", JSON.stringify(activeFilters));
  }, [activeFilters]);

  useEffect(() => {
    sessionStorage.setItem("vectra-seed", seed);
  }, [seed]);

  useEffect(() => {
    sessionStorage.setItem("vectra-subject", subject);
  }, [subject]);

  // Result state
  const [result, setResult] = useState<ModelsLabResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const isCancelledRef = useRef(false);

  // HQ quota exhausted popup state
  const [showHqExhaustedPopup, setShowHqExhaustedPopup] = useState(false);

  // Upgrade modal state for premium features
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"video" | "image" | "prompt" | "lora" | "filters" | "general">("general");

  // Onboarding tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentQuotas, setCurrentQuotas] = useState<{
    hq: { used: number; limit: number };
    standard: { used: number; limit: number };
  } | null>(null);

  // ============ CINEMATIC PANEL STATE WITH SESSION PERSISTENCE ============
  const [showCinematicPanel, setShowCinematicPanel] = useState(() => {
    try {
      const saved = sessionStorage.getItem("vectra-show-cinematic-panel");
      return saved ? JSON.parse(saved) : false;
    } catch { return false; }
  });

  const [cinematicSettings, setCinematicSettings] = useState<CinematicSettings | null>(() => {
    try {
      const saved = sessionStorage.getItem("vectra-cinematic-settings");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Persist cinematic panel state
  useEffect(() => {
    sessionStorage.setItem("vectra-show-cinematic-panel", JSON.stringify(showCinematicPanel));
  }, [showCinematicPanel]);

  useEffect(() => {
    if (cinematicSettings) {
      sessionStorage.setItem("vectra-cinematic-settings", JSON.stringify(cinematicSettings));
    }
  }, [cinematicSettings]);

  // Gemini Gems optimization state (uses localStorage for longer persistence)
  const [activeGems, setActiveGems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("vectra-active-gems");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist gems selection
  useEffect(() => {
    localStorage.setItem("vectra-active-gems", JSON.stringify(activeGems));
  }, [activeGems]);

  // ============ AUTO-SAVE SYSTEM ============
  // Combines all important studio state for auto-saving
  const studioState = useMemo(() => ({
    prompt,
    subject,
    aspectRatio,
    usePromptEngine,
    selectedProfile,
    selectedBlueprint,
    selectedUserBlueprint,
    blueprintTab,
    activeFilters,
    seed,
    showCinematicPanel,
    cinematicSettings,
    activeGems,
    images: images.map(img => ({ id: img.id, name: img.name })), // Don't save full dataUrl
  }), [
    prompt, subject, aspectRatio, usePromptEngine, selectedProfile,
    selectedBlueprint, selectedUserBlueprint, blueprintTab, activeFilters,
    seed, showCinematicPanel, cinematicSettings, activeGems, images
  ]);

  // Auto-save hook with 2 second debounce
  const {
    status: saveStatus,
    lastSaved,
    hasUnsavedChanges,
    restore: restoreSession,
    markSaved
  } = useAutoSave("studio-session", studioState, {
    debounceMs: 2000,
    persistent: false, // Use sessionStorage
    onSave: () => {
      console.log("[AUTO-SAVE] Studio session saved");
    }
  });

  // Warn user before leaving with unsaved changes (browser close/refresh only)
  // Note: This only triggers on actual browser close/refresh, not in-app navigation
  useUnsavedChangesWarning(
    hasUnsavedChanges,
    language === "pt-BR"
      ? "Você tem alterações não salvas. Tem certeza que deseja sair?"
      : "You have unsaved changes. Are you sure you want to leave?"
  );

  // Session recovery state
  const [showSessionRecovery, setShowSessionRecovery] = useState(false);
  const [sessionRecoveryDate, setSessionRecoveryDate] = useState<Date | undefined>();

  // Check for previous session on mount
  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem("vectra-autosave-studio-session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.timestamp) {
          const savedDate = new Date(parsed.timestamp);
          const now = new Date();
          // Show recovery banner if session is less than 24 hours old
          const hoursDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
          if (hoursDiff < 24 && parsed.data?.prompt) {
            setSessionRecoveryDate(savedDate);
            setShowSessionRecovery(true);
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Handle session restore
  const handleRestoreSession = useCallback(() => {
    const restored = restoreSession();
    if (restored) {
      // Restore individual states
      if (restored.prompt) setPrompt(restored.prompt);
      if (restored.subject) setSubject(restored.subject);
      if (restored.aspectRatio) setAspectRatio(restored.aspectRatio);
      if (typeof restored.usePromptEngine === "boolean") setUsePromptEngine(restored.usePromptEngine);
      if (restored.selectedProfile) setSelectedProfile(restored.selectedProfile);
      if (restored.selectedBlueprint) setSelectedBlueprint(restored.selectedBlueprint);
      if (restored.selectedUserBlueprint) setSelectedUserBlueprint(restored.selectedUserBlueprint);
      if (restored.blueprintTab) setBlueprintTab(restored.blueprintTab);
      if (restored.activeFilters) setActiveFilters(restored.activeFilters);
      if (restored.seed) setSeed(restored.seed);
      if (typeof restored.showCinematicPanel === "boolean") setShowCinematicPanel(restored.showCinematicPanel);
      if (restored.cinematicSettings) setCinematicSettings(restored.cinematicSettings);
      if (restored.activeGems) setActiveGems(restored.activeGems);

      toast({
        title: language === "pt-BR" ? "Sessão restaurada" : "Session restored",
        description: language === "pt-BR"
          ? "Suas configurações anteriores foram recuperadas."
          : "Your previous settings have been restored.",
      });
    }
    setShowSessionRecovery(false);
  }, [restoreSession, language, toast]);

  // Admin API key state
  const [showAdminKeyModal, setShowAdminKeyModal] = useState(false);
  const [adminApiKey, setAdminApiKey] = useState("");

  // Direct download function - uses server proxy to bypass CORS
  const downloadImage = async (imageUrl: string, filename?: string) => {
    try {
      // Use server proxy to bypass CORS restrictions
      const proxyUrl = `/api/proxy/media?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `vectra-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: t.common.error || "Error",
        description: "Failed to download image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadVideo = async (videoUrl: string, filename?: string) => {
    try {
      // Use server proxy to bypass CORS restrictions
      const proxyUrl = `/api/proxy/media?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `vectra-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: t.common.error || "Error",
        description: "Failed to download video. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Queries for Prompt Engine
  const { data: profiles, isLoading: loadingProfiles } = useQuery<LlmProfile[]>({
    queryKey: ["/api/profiles"],
  });

  const { data: blueprints, isLoading: loadingBlueprints } = useQuery<PromptBlueprint[]>({
    queryKey: ["/api/blueprints"],
  });

  const { data: filters, isLoading: loadingFilters } = useQuery<Filter[]>({
    queryKey: ["/api/filters"],
  });

  // Gemini Gems query
  interface GeminiGem {
    id: string;
    name: string;
    description: string;
    category: string;
  }
  const { data: geminiGems } = useQuery<GeminiGem[]>({
    queryKey: ["/api/gemini-gems"],
  });

  const { data: userBlueprints, isLoading: loadingUserBlueprints } = useQuery<UserBlueprint[]>({
    queryKey: ["/api/user-blueprints"],
  });

  // Gallery and Presets queries
  const { data: savedImages, isLoading: loadingSavedImages } = useQuery<SavedImage[]>({
    queryKey: ["/api/gallery"],
  });

  const { data: filterPresets, isLoading: loadingPresets } = useQuery<FilterPreset[]>({
    queryKey: ["/api/presets"],
  });

  const { data: savedVideos, isLoading: loadingSavedVideos } = useQuery<SavedVideo[]>({
    queryKey: ["/api/video-gallery"],
  });

  interface UsageData {
    plan: string;
    isPro: boolean;
    isAdmin?: boolean;
    hasCustomKey?: boolean;
    daily: {
      prompts: { used: number; limit: number };
      images: { used: number; limit: number };
      videos: { used: number; limit: number };
    };
  }

  const { data: usageData } = useQuery<UsageData>({
    queryKey: ["/api/profile/usage"],
  });

  // User profile for default settings and tutorial status
  interface UserProfileData {
    defaultLlmProfileId?: string | null;
    tutorialCompleted?: number;
    plan?: string;
  }

  const { data: userProfile } = useQuery<UserProfileData>({
    queryKey: ["/api/profile"],
  });

  // Mutation to mark tutorial as completed
  const completeTutorialMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/profile", { tutorialCompleted: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  // Admin API key mutation
  const saveAdminApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      return apiRequest("POST", "/api/admin/api-key", { apiKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/usage"] });
      setShowAdminKeyModal(false);
      setAdminApiKey("");
      toast({
        title: t.modelslab?.apiKeySaved || "API key saved",
        description: t.modelslab?.apiKeyDesc || "Your custom API key is now active"
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.modelslab?.error || "Error",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const removeAdminApiKeyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/admin/api-key");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile/usage"] });
      toast({
        title: t.modelslab?.apiKeyRemoved || "API key removed",
        description: t.modelslab?.apiKeyRemovedDesc || "Using system API key now"
      });
    },
  });

  // Auto-populate from URL parameters (blueprint from library)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const blueprintId = searchParams.get("blueprint");
    const userBlueprintId = searchParams.get("userBlueprint");
    const seedParam = searchParams.get("seed");
    const profileId = searchParams.get("profile");

    if (blueprintId || userBlueprintId) {
      setUsePromptEngine(true);

      if (blueprintId) {
        setSelectedBlueprint(blueprintId);
        setBlueprintTab("system");
        setSelectedUserBlueprint("");
      }

      if (userBlueprintId) {
        setSelectedUserBlueprint(userBlueprintId);
        setBlueprintTab("custom");
        setSelectedBlueprint("");
      }

      // Clear URL params after processing
      window.history.replaceState({}, "", "/image-studio");

      toast({
        title: t.modelslab.blueprintLoaded || "Blueprint loaded",
        description: t.modelslab.blueprintLoadedDesc || "Blueprint settings applied to the studio",
      });
    }

    if (seedParam) {
      setSeed(seedParam);
    }

    if (profileId) {
      setSelectedProfile(profileId);
    }
  }, [t, toast]);

  // Set default profile from user preferences if not already set
  useEffect(() => {
    if (!selectedProfile && userProfile?.defaultLlmProfileId && profiles) {
      const profileExists = profiles.some(p => p.id === userProfile.defaultLlmProfileId);
      if (profileExists) {
        setSelectedProfile(userProfile.defaultLlmProfileId);
      }
    }
  }, [userProfile, profiles, selectedProfile]);

  // Show tutorial for new free tier users
  useEffect(() => {
    if (userProfile && userProfile.tutorialCompleted === 0 && userProfile.plan !== "pro") {
      setShowTutorial(true);
    }
  }, [userProfile]);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    completeTutorialMutation.mutate();
  };

  // Gallery state
  const [showGallery, setShowGallery] = useState(false);
  const [showVideoGallery, setShowVideoGallery] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [selectedImageDetails, setSelectedImageDetails] = useState<SavedImage | null>(null);

  // Video generation state (Job System)
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<string>("");
  const [videoResult, setVideoResult] = useState<Sora2Response | null>(null);
  const [isPollingVideo, setIsPollingVideo] = useState(false);
  const [videoAspect, setVideoAspect] = useState<"9:16" | "16:9">("16:9");
  const [detectedAspect, setDetectedAspect] = useState<"9:16" | "16:9" | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [generateAudio, setGenerateAudio] = useState<boolean>(false);
  const [currentVideoJobId, setCurrentVideoJobId] = useState<string | null>(null);
  const [videoGenerationMeta, setVideoGenerationMeta] = useState<{
    duration: number;
    aspect: string;
    sourceImage: string;
    generatedAt: Date;
    generationTimeMs?: number;
    model?: string;
  } | null>(null);
  const [videoGenerationStartTime, setVideoGenerationStartTime] = useState<number | null>(null);

  // Save image mutation with full metadata
  const saveImageMutation = useMutation({
    mutationFn: async (imageData: { imageUrl: string; prompt: string; generationTimeMs?: number; model?: string }) => {
      return apiRequest("POST", "/api/gallery", {
        ...imageData,
        aspectRatio,
        profileId: selectedProfile || undefined,
        blueprintId: selectedBlueprint || undefined,
        userBlueprintId: selectedUserBlueprint || undefined,
        appliedFilters: activeFilters,
        seed: seed || undefined,
        metadata: {
          generationTime: imageData.generationTimeMs,
          imageQuality: imageData.model === "nano-banana-pro" ? "hq" : "standard",
          modelId: imageData.model,
          cinematicSettings: cinematicSettings ? {
            optics: cinematicSettings.optics ? {
              style: cinematicSettings.optics.style,
              aspectRatio: cinematicSettings.optics.aspectRatio,
              sampleCount: cinematicSettings.optics.sampleCount,
            } : undefined,
            vfx: cinematicSettings.vfx ? {
              effects: cinematicSettings.vfx.effects,
              intensity: cinematicSettings.vfx.intensity,
            } : undefined,
            styleDna: cinematicSettings.styleDna ? {
              brand: cinematicSettings.styleDna.brand,
              fit: cinematicSettings.styleDna.fit,
            } : undefined,
            activeGems: activeGems.length > 0 ? activeGems : undefined,
          } : undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: t.modelslab.imageSaved || "Image saved to gallery" });
    },
    onError: () => {
      toast({ title: t.modelslab.error, description: "Failed to save image", variant: "destructive" });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/gallery/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({ title: t.modelslab.imageDeleted || "Image deleted" });
    },
  });

  // Save preset mutation
  const savePresetMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/presets", {
        name,
        filters: activeFilters,
        profileId: selectedProfile || undefined,
        blueprintId: selectedBlueprint || undefined,
        userBlueprintId: selectedUserBlueprint || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      setPresetName("");
      setShowPresetDialog(false);
      toast({ title: t.modelslab.presetSaved || "Filter preset saved" });
    },
    onError: () => {
      toast({ title: t.modelslab.error, description: "Failed to save preset", variant: "destructive" });
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/presets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presets"] });
      toast({ title: t.modelslab.presetDeleted || "Preset deleted" });
    },
  });

  // Save video mutation
  const saveVideoMutation = useMutation({
    mutationFn: async (videoData: { videoUrl: string; prompt: string; thumbnailUrl?: string }) => {
      return apiRequest("POST", "/api/video-gallery", {
        ...videoData,
        aspectRatio: videoAspect,
        durationSeconds: videoDuration,
        jobId: currentVideoJobId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-gallery"] });
      toast({ title: t.modelslab.videoSaved || "Video saved to gallery" });
    },
    onError: () => {
      toast({ title: t.modelslab.error, description: "Failed to save video", variant: "destructive" });
    },
  });

  // Toggle video favorite mutation
  const toggleVideoFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/video-gallery/${id}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-gallery"] });
    },
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/video-gallery/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-gallery"] });
      toast({ title: t.modelslab.videoDeleted || "Video deleted" });
    },
  });

  // Video generation mutation (Job System with ModelsLab)
  const generateVideoMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest("POST", "/api/videogen/jobs", {
        sourceImageUrl: imageUrl,
        prompt: prompt || "Cinematic video with smooth natural motion, professional cinematography",
        targetAspect: videoAspect,
        durationSeconds: videoDuration,
        generationType: "image-to-video",
      });
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate usage cache to sync limits
      queryClient.invalidateQueries({ queryKey: ["/api/profile/usage"] });

      if (data.id) {
        setCurrentVideoJobId(data.id);
        setVideoGenerationStartTime(Date.now());
        if (data.status === "processing" || data.status === "queued") {
          setIsPollingVideo(true);
          pollVideoJobStatus(data.id);
        } else if (data.status === "success" && data.resultUrls?.length > 0) {
          handleVideoSuccess(data.resultUrls);
        }
      }
    },
    onError: (error) => {
      const errorMsg = String(error).toLowerCase();
      if (errorMsg.includes("limit") || errorMsg.includes("premium") || errorMsg.includes("403")) {
        setUpgradeFeature("video");
        setShowUpgradeModal(true);
      } else {
        toast({
          title: t.modelslab.videoError || "Video generation failed",
          description: String(error),
          variant: "destructive"
        });
      }
    },
  });

  // Handle successful video generation
  const handleVideoSuccess = (resultUrls: string[]) => {
    const generationTime = videoGenerationStartTime ? Date.now() - videoGenerationStartTime : undefined;
    setVideoResult({ status: "success", output: resultUrls });
    setVideoGenerationMeta({
      duration: videoDuration,
      aspect: videoAspect,
      sourceImage: selectedImageForVideo,
      generatedAt: new Date(),
      generationTimeMs: generationTime,
      model: videoAspect === "9:16" ? "Seedance 1.5 Pro I2V" : "Veo 3.1",
    });
    setIsPollingVideo(false);
    setShowVideoDialog(false);
    toast({ title: t.modelslab.videoGenerated || "Video generated successfully!" });

    // Auto-save generated videos
    resultUrls.forEach((url) => {
      saveVideoMutation.mutate({
        videoUrl: url,
        prompt: "Video generated via ModelsLab",
        thumbnailUrl: undefined // Will be generated by server or blank
      });
    });
  };

  // Poll video job status
  const pollVideoJobStatus = async (jobId: string) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsPollingVideo(false);
        toast({
          title: t.modelslab.videoTimeout || "Video generation timed out",
          variant: "destructive"
        });
        return;
      }

      try {
        const response = await fetch(`/api/videogen/jobs/${jobId}`);
        const job = await response.json();

        if (job.status === "success" && job.resultUrls?.length > 0) {
          handleVideoSuccess(job.resultUrls);
        } else if (job.status === "error") {
          setIsPollingVideo(false);
          toast({
            title: t.modelslab.videoFailed || "Video generation failed",
            variant: "destructive"
          });
        } else {
          attempts++;
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        setIsPollingVideo(false);
        toast({
          title: t.modelslab.videoError || "Error checking video status",
          variant: "destructive"
        });
      }
    };

    poll();
  };

  // Clear video result
  const clearVideoResult = () => {
    setVideoResult(null);
    setVideoGenerationMeta(null);
    setCurrentVideoJobId(null);
    setVideoGenerationStartTime(null);
  };

  // Detect aspect ratio from image and open video dialog
  const openVideoDialogWithImage = (imageUrl: string) => {
    setSelectedImageForVideo(imageUrl);

    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const detected: "16:9" | "9:16" = ratio >= 1 ? "16:9" : "9:16";
      setDetectedAspect(detected);
      setVideoAspect(detected);
      setShowVideoDialog(true);
    };
    img.onerror = () => {
      setDetectedAspect("16:9");
      setVideoAspect("16:9");
      setShowVideoDialog(true);
    };
    img.src = imageUrl;
  };

  // Get model name based on aspect ratio
  const getVideoModelInfo = (aspect: "16:9" | "9:16") => {
    if (aspect === "9:16") {
      return { name: "Seedance 1.5 Pro", description: "Portrait video (9:16)" };
    }
    return { name: "Google Veo 3.1", description: "Landscape video (16:9)" };
  };

  // Load preset function
  const loadPreset = (preset: FilterPreset) => {
    setActiveFilters(preset.filters as Record<string, string>);
    if (preset.profileId) setSelectedProfile(preset.profileId);
    if (preset.blueprintId) {
      setSelectedBlueprint(preset.blueprintId);
      setBlueprintTab("system");
    }
    if (preset.userBlueprintId) {
      setSelectedUserBlueprint(preset.userBlueprintId);
      setBlueprintTab("custom");
    }
    toast({ title: t.modelslab.presetLoaded || "Preset loaded" });
  };

  // File processing
  const processFile = useCallback(async (file: File): Promise<UploadedImage | null> => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.modelslab.error,
        description: t.modelslab.invalidFileType,
        variant: "destructive",
      });
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t.modelslab.error,
        description: t.modelslab.fileTooLarge,
        variant: "destructive",
      });
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          name: file.name,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, [toast, t]);

  const addImages = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = 14 - images.length;
    const filesToProcess = fileArray.slice(0, remainingSlots);

    if (fileArray.length > remainingSlots) {
      toast({
        title: t.modelslab.warning,
        description: t.modelslab.maxImagesReached,
      });
    }

    const newImages: UploadedImage[] = [];
    for (const file of filesToProcess) {
      const processed = await processFile(file);
      if (processed) newImages.push(processed);
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  }, [images.length, processFile, toast, t]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImages(e.target.files);
      e.target.value = '';
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      addImages(imageFiles);
    }
  }, [addImages]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  // Prompt Engine mutation
  const generatePromptMutation = useMutation({
    mutationFn: async () => {
      const isUserBlueprint = blueprintTab === "custom" && selectedUserBlueprint;
      const res = await apiRequest("POST", "/api/generate", {
        profileId: selectedProfile,
        blueprintId: isUserBlueprint ? undefined : selectedBlueprint,
        userBlueprintId: isUserBlueprint ? selectedUserBlueprint : undefined,
        filters: activeFilters,
        seed: seed || undefined,
        subject,
        cinematicSettings: showCinematicPanel ? cinematicSettings : undefined,
        geminiGems: activeGems.length > 0 ? activeGems : undefined,
      });
      return res.json() as Promise<GeneratedPromptResult>;
    },
    onSuccess: (data) => {
      // Invalidate usage cache to sync limits
      queryClient.invalidateQueries({ queryKey: ["/api/profile/usage"] });

      setPrompt(data.compiledPrompt);
      setSeed(data.seed);
      toast({
        title: t.modelslab.promptGenerated || "Prompt generated",
        description: t.modelslab.promptApplied || "Prompt applied to the textarea"
      });
    },
    onError: (error: Error) => {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("limit") || errorMsg.includes("premium") || errorMsg.includes("403")) {
        setUpgradeFeature("prompt");
        setShowUpgradeModal(true);
      } else {
        toast({
          title: t.modelslab.error,
          description: error.message,
          variant: "destructive"
        });
      }
    },
  });

  // Image generation mutation
  const generateImageMutation = useMutation({
    mutationFn: async () => {
      if (generationMode === "img2img" && images.length === 0) {
        throw new Error(t.modelslab.noImages);
      }
      if (generationMode === "product-avatar" && (!faceImage || !productImage)) {
        throw new Error("Please upload both a Character Face and a Product Image");
      }

      let imageUrls: string[] = [];

      if (generationMode === "product-avatar" && faceImage && productImage) {
        // Order: Face first, then Product
        imageUrls = [faceImage.dataUrl, productImage.dataUrl];
      } else {
        imageUrls = images.map(img => img.dataUrl);
      }

      // Build enhanced prompt with cinematic settings if available
      let enhancedPrompt = prompt;

      // Add Commercial/Ads keywords if in product-avatar mode
      if (generationMode === "product-avatar") {
        const commercialPrefix = "COMMERCIAL PHOTOGRAPHY, PRODUCT ADVERTISEMENT, (masterpiece, best quality, ultra-detailed), professional lighting, high contrast, 8k resolution, commercial ad style, (product focus:1.2)";
        enhancedPrompt = `${commercialPrefix}, ${enhancedPrompt}`;
      }

      if (cinematicSettings) {
        const cinematicPrefix: string[] = []; // High priority - goes at START
        const cinematicSuffix: string[] = []; // Lower priority - goes at END

        // Get intensity level (0-100) and create intensity modifier
        const intensity = cinematicSettings.vfx?.intensity ?? 50;
        const getIntensityPrefix = (i: number) => {
          if (i >= 90) return "EXTREMELY STRONG, MAXIMUM";
          if (i >= 70) return "VERY STRONG, DOMINANT";
          if (i >= 50) return "STRONG, VISIBLE";
          if (i >= 30) return "MODERATE, NOTICEABLE";
          return "SUBTLE, SLIGHT";
        };
        const intensityPrefix = getIntensityPrefix(intensity);

        // Add VFX effects with STRONG descriptions - these go at the START for priority
        // When multiple effects are selected, they are COMBINED into a single cohesive directive
        if (cinematicSettings.vfx?.effects && cinematicSettings.vfx.effects.length > 0) {
          const vfxMap: Record<string, string> = {
            "vhs": "VHS tape recording with scan lines, tape distortion, chromatic aberration, analog video noise, magnetic tape artifacts",
            "35mm": "35mm analog film with authentic grain, halation, Kodak Portra colors, vignetting, film emulsion texture",
            "nvg": "NIGHT VISION GOGGLES view with GREEN MONOCHROME phosphor screen, NVG grain, infrared glow, military thermal imaging",
            "sony90s": "SONY GHS 2000 camcorder night vision 1990s, green phosphor glow, VHS-quality infrared, night shot mode with scan lines, ghosting artifacts",
            "cine": "cinematic movie color grading, anamorphic lens flare, Hollywood blockbuster theatrical film look",
            "gltch": "digital glitch with RGB split, data corruption artifacts, pixel displacement, databending aesthetic",
            "blum": "heavy bloom lighting, bright diffusion, dreamy glow, overexposed highlights bleeding, soft focus",
            "grain": "heavy film grain texture, analog noise pattern, high ISO grainy photographic texture",
            "leak": "strong light leak, color bleeding from edges, lens flare streaks, orange and cyan light leaks",
            "scan": "CRT scanlines overlay, interlaced video lines, cathode ray tube aesthetic, horizontal scan lines",
            "noir": "black and white noir, high contrast monochrome, dramatic shadows, film noir moody dark aesthetic",
            "teal": "teal and orange color grading, Hollywood complementary color contrast, cinematic color correction"
          };

          // Collect all active effects
          const activeEffects: string[] = [];
          const effectNames: string[] = [];

          cinematicSettings.vfx.effects.forEach(effect => {
            if (effect !== "off" && vfxMap[effect]) {
              activeEffects.push(vfxMap[effect]);
              effectNames.push(effect.toUpperCase());
            }
          });

          // If multiple effects, create a COMBINED directive for better fusion
          if (activeEffects.length > 0) {
            if (activeEffects.length === 1) {
              // Single effect - apply directly with intensity
              cinematicPrefix.push(`${intensityPrefix} ${activeEffects[0]}`);
            } else {
              // Multiple effects - create COMBINED/MIXED directive for better fusion
              const combinedEffectList = effectNames.join(" + ");
              const fusedDescription = activeEffects.join(" MIXED WITH ");
              cinematicPrefix.push(`${intensityPrefix} COMBINED VISUAL EFFECTS [${combinedEffectList}]: ${fusedDescription}. BLEND ALL EFFECTS TOGETHER seamlessly into a unified aesthetic`);
            }
          }
        }

        // Add optics style
        if (cinematicSettings.optics?.style && cinematicSettings.optics.style !== "cinematic") {
          const styleMap: Record<string, string> = {
            "smartphone": "smartphone real-life authentic photo, mobile phone camera quality",
            "iphone-hdr": "iPhone 15 Pro Max HDR photo, Apple ProRAW quality, computational photography",
            "realistic-raw": "realistic RAW unprocessed photo, professional camera sensor output",
            "forensic-dslr": "forensic DSLR evidence photography, sharp clinical documentation style"
          };
          if (styleMap[cinematicSettings.optics.style]) {
            cinematicSuffix.push(styleMap[cinematicSettings.optics.style]);
          }
        }

        // Add style DNA
        if (cinematicSettings.styleDna) {
          if (cinematicSettings.styleDna.brand && cinematicSettings.styleDna.brand !== "auto") {
            cinematicSuffix.push(`${cinematicSettings.styleDna.brand} brand aesthetic, fashion style`);
          }
          if (cinematicSettings.styleDna.fit) {
            cinematicSuffix.push(`${cinematicSettings.styleDna.fit} fit clothing style`);
          }
        }

        // Build final prompt: VFX PREFIX + original + suffix
        // VFX goes FIRST for maximum priority in image generation
        if (cinematicPrefix.length > 0 || cinematicSuffix.length > 0) {
          const prefix = cinematicPrefix.length > 0 ? cinematicPrefix.join(", ") + ", " : "";
          const suffix = cinematicSuffix.length > 0 ? ", " + cinematicSuffix.join(", ") : "";
          enhancedPrompt = `${prefix}${prompt}${suffix}`;
        }
      }

      // Merge subject images from cinematic panel with main reference images
      let allImages = [...imageUrls];
      if (cinematicSettings?.subjects) {
        const { subjectA, subjectB } = cinematicSettings.subjects;
        // Extract URLs from image objects (format: { id: string, url: string })
        const extractUrls = (imgs: Array<{ id: string; url: string }> | undefined) =>
          imgs?.map(img => img.url).filter(Boolean) || [];

        // Add face images first (highest priority for character consistency)
        const faceA = extractUrls(subjectA?.faceImages);
        const faceB = extractUrls(subjectB?.faceImages);
        if (faceA.length) allImages = [...faceA, ...allImages];
        if (faceB.length) allImages = [...faceB, ...allImages];

        // Add body images
        const bodyA = extractUrls(subjectA?.bodyImages);
        const bodyB = extractUrls(subjectB?.bodyImages);
        if (bodyA.length) allImages = [...allImages, ...bodyA];
        if (bodyB.length) allImages = [...allImages, ...bodyB];

        // Add signature style images
        const sigA = extractUrls(subjectA?.signatureImages);
        const sigB = extractUrls(subjectB?.signatureImages);
        if (sigA.length) allImages = [...allImages, ...sigA];
        if (sigB.length) allImages = [...allImages, ...sigB];
      }
      // Limit to 14 images (ModelsLab max)
      allImages = allImages.slice(0, 14);

      const res = await apiRequest("POST", "/api/modelslab/generate", {
        prompt: enhancedPrompt,
        images: allImages,
        aspectRatio: cinematicSettings?.optics?.aspectRatio || aspectRatio,
        cinematicSettings: cinematicSettings || undefined,
        activeGems: activeGems.length > 0 ? activeGems : undefined,
        bodyFidelity: cinematicSettings?.bodyFidelity,
        preserveTattoos: cinematicSettings?.preserveTattoos,
        // Send the raw subject separately for priority extraction
        rawSubject: subject || undefined,
      });
      return res.json() as Promise<ModelsLabResponse>;
    },
    onSuccess: async (data) => {
      // Invalidate usage cache to sync limits
      queryClient.invalidateQueries({ queryKey: ["/api/profile/usage"] });

      // Update quotas if available
      if (data.quotas) {
        setCurrentQuotas(data.quotas);
      }

      // Show HQ exhausted popup if this is the first standard image
      if (data.hqExhausted) {
        setShowHqExhaustedPopup(true);
      }

      if (data.status === "processing" && data.fetch_result) {
        setIsPolling(true);
        pollForResult(data.fetch_result);
      } else if (data.status === "success" && data.output) {
        setResult(data);
        const modelLabel = data.imageQuality === "hq" ? "Nano Banana Pro" : "Realistic Vision 5.1";
        toast({
          title: t.modelslab.success,
          description: `${t.modelslab.imageGenerated} (${modelLabel})`,
        });
      } else if (data.status === "error") {
        toast({
          title: t.modelslab.error,
          description: data.message || t.modelslab.generationFailed,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("limit") || errorMsg.includes("premium") || errorMsg.includes("403")) {
        setUpgradeFeature("image");
        setShowUpgradeModal(true);
      } else {
        toast({
          title: t.modelslab.error,
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Text-to-Image generation mutation (no reference images needed)
  // Uses 'subject' (raw user text) for pure text-to-image, or 'prompt' (compiled) if Prompt Engine is active
  const generateText2ImgMutation = useMutation({
    mutationFn: async () => {
      // For text2img, prefer the raw subject text (what user types in the Assunto field)
      // If Prompt Engine is ON and has generated a prompt, use that instead
      const textPrompt = usePromptEngine && prompt.trim() ? prompt : subject;

      if (!textPrompt.trim()) {
        throw new Error(t.modelslab.promptRequired || "Prompt is required for text-to-image generation");
      }

      console.log("[TEXT2IMG] Sending prompt:", textPrompt.substring(0, 100) + "...");

      const res = await apiRequest("POST", "/api/modelslab/text2img", {
        prompt: textPrompt,
        aspectRatio: cinematicSettings?.optics?.aspectRatio || aspectRatio,
        negativePrompt: "bad quality, blurry, distorted, low resolution, watermark, text, ugly, deformed",
      });
      return res.json() as Promise<ModelsLabResponse>;
    },
    onSuccess: async (data) => {
      // Invalidate usage cache to sync limits
      queryClient.invalidateQueries({ queryKey: ["/api/profile/usage"] });

      // Update quotas if available
      if (data.quotas) {
        setCurrentQuotas(data.quotas);
      }

      // Show HQ exhausted popup if this is the first standard image
      if (data.hqExhausted) {
        setShowHqExhaustedPopup(true);
      }

      if (data.status === "processing" && data.fetch_result) {
        setIsPolling(true);
        pollForResult(data.fetch_result);
      } else if (data.status === "success" && data.output) {
        setResult(data);
        const modelLabel = data.imageQuality === "hq" ? "Nano Banana Pro" : "Realistic Vision 5.1";
        toast({
          title: t.modelslab.success,
          description: `${t.modelslab.imageGenerated} (${modelLabel} - Text-to-Image)`,
        });

        // Auto-save generated images
        data.output.forEach((url) => {
          saveImageMutation.mutate({
            imageUrl: url,
            prompt: prompt,
            generationTimeMs: data.generationTime ? data.generationTime * 1000 : undefined,
            model: data.imageQuality === "hq" ? "nano-banana-pro" : "realistic-vision-51",
          });
        });

      } else if (data.status === "error") {
        toast({
          title: t.modelslab.error,
          description: data.message || t.modelslab.generationFailed,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("limit") || errorMsg.includes("premium") || errorMsg.includes("403")) {
        setUpgradeFeature("image");
        setShowUpgradeModal(true);
      } else {
        toast({
          title: t.modelslab.error,
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Prompt Refiner mutation for Text-to-Image mode
  const [refinedPromptData, setRefinedPromptData] = useState<{
    original: string;
    refined: string;
    analysis: { type: string; styles: string[]; colors: string[]; mood: string[] };
    suggestions: string[];
  } | null>(null);

  const refinePromptMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim()) {
        throw new Error("Digite um prompt para refinar");
      }

      const res = await apiRequest("POST", "/api/modelslab/refine-prompt", {
        prompt: subject,
        aspectRatio: cinematicSettings?.optics?.aspectRatio || aspectRatio,
      });
      try {
        return await res.json();
      } catch (e) {
        throw new Error("Servidor desatualizado. Por favor, REINICIE o terminal (pare e rode 'npm run dev' novamente) para aplicar as atualizações.");
      }
    },
    onSuccess: (data) => {
      setRefinedPromptData(data);
      // Optionally update the subject with the refined prompt
      setSubject(data.refined);
      toast({
        title: t.modelslab.promptRefined || "Prompt Refinado!",
        description: `Tipo detectado: ${data.analysis.type}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.modelslab.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel generation function
  const cancelGeneration = () => {
    isCancelledRef.current = true;
    setIsPolling(false);
    toast({
      title: t.modelslab.cancelled || "Generation cancelled",
      description: t.modelslab.cancelledDescription || "You can now adjust your settings and try again.",
    });
  };

  const pollForResult = async (fetchUrl: string) => {
    let attempts = 0;
    const maxAttempts = 60;
    isCancelledRef.current = false; // Reset cancelled state when starting

    const poll = async () => {
      // Check if cancelled before continuing
      if (isCancelledRef.current) {
        return;
      }

      try {
        const res = await apiRequest("POST", "/api/modelslab/status", { fetchUrl });
        const data = await res.json() as ModelsLabResponse;

        // Check again after fetch in case cancelled during request
        if (isCancelledRef.current) {
          return;
        }

        if (data.status === "success" && data.output) {
          setResult(data);
          setIsPolling(false);
          toast({
            title: t.modelslab.success,
            description: t.modelslab.imageGenerated,
          });
        } else if (data.status === "processing" && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 5000);
        } else if (data.status === "processing" && attempts >= maxAttempts) {
          setIsPolling(false);
          toast({
            title: t.modelslab.error,
            description: t.modelslab.timeout,
            variant: "destructive",
          });
        } else if (data.status === "error") {
          setIsPolling(false);
          toast({
            title: t.modelslab.error,
            description: data.message || t.modelslab.generationFailed,
            variant: "destructive",
          });
        }
      } catch {
        if (isCancelledRef.current) return;
        setIsPolling(false);
        toast({
          title: t.modelslab.error,
          description: t.modelslab.pollingFailed,
          variant: "destructive",
        });
      }
    };

    poll();
  };

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRandomSeed = () => {
    setSeed(Math.random().toString(36).substring(2, 10));
  };

  const canGeneratePrompt = selectedProfile && (
    (blueprintTab === "system" && selectedBlueprint) ||
    (blueprintTab === "custom" && selectedUserBlueprint)
  );

  const aspectRatios = [
    "1:1", "9:16", "2:3", "3:4", "4:5", "5:4", "4:3", "3:2", "16:9", "21:9"
  ];

  const isGeneratingImage = generateImageMutation.isPending || generateText2ImgMutation.isPending || isPolling;

  return (
    <StudioPage>
      {/* Session Recovery Banner */}
      {showSessionRecovery && (
        <SessionRecoveryBanner
          onRestore={handleRestoreSession}
          onDismiss={() => setShowSessionRecovery(false)}
          sessionDate={sessionRecoveryDate}
        />
      )}

      <StudioHeader
        title={t.modelslab.title}
        description={t.modelslab.subtitle}
      >
        <div className="flex items-center gap-4">
          {/* Auto-Save Status Indicator */}
          <SaveStatusIndicator
            status={saveStatus}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            showText={true}
          />
          {usageData && !usageData.isPro && (
            <Card className="bg-muted/50 border-dashed" data-testid="card-usage-indicator">
              <CardContent className="p-3">
                <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                  {t.studio?.dailyLimits || "Daily Limits"}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5" title="Prompts">
                    <FileTextIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={usageData.daily.prompts.used >= usageData.daily.prompts.limit ? "text-destructive" : ""}>
                      {usageData.daily.prompts.used}/{usageData.daily.prompts.limit}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Images">
                    <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={usageData.daily.images.used >= usageData.daily.images.limit ? "text-destructive" : ""}>
                      {usageData.daily.images.used}/{usageData.daily.images.limit}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Videos">
                    <Video className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={usageData.daily.videos.limit === 0 ? "text-muted-foreground" : usageData.daily.videos.used >= usageData.daily.videos.limit ? "text-destructive" : ""}>
                      {usageData.daily.videos.used}/{usageData.daily.videos.limit}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {usageData?.isPro && (
            <div className="flex items-center gap-2">
              {usageData?.isAdmin ? (
                <Badge variant="default" className="text-xs bg-white/10 text-white border-white/20" data-testid="badge-admin">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs" data-testid="badge-pro-plan">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              )}
              {usageData?.isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdminKeyModal(true)}
                  className="text-xs text-white/60 hover:text-white"
                  data-testid="button-admin-api-key"
                >
                  {usageData?.hasCustomKey ? "API Key Ativa" : "Inserir API Key"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCinematicPanel(!showCinematicPanel)}
                className="text-xs text-muted-foreground"
                data-testid="button-toggle-cinematic"
              >
                <SlidersHorizontal className="w-4 h-4 mr-1" />
                {showCinematicPanel ? "Ocultar Controles Avançados" : "Controles Avançados"}
              </Button>
            </div>
          )}
        </div>
      </StudioHeader>

      {/* Vectra Cinematic Control Panel - Premium Only */}
      {usageData?.isPro && showCinematicPanel && (
        <div className="mb-8 p-0 rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]" data-testid="section-cinematic-panel">
          <VectraCinematicPanel
            isPremium={true}
            onSettingsChange={setCinematicSettings}
          />
        </div>
      )}

      {/* Gemini Gems Optimization Panel - Admin/Premium Only */}
      {usageData?.isAdmin && geminiGems && geminiGems.length > 0 && (
        <div className="mb-8" data-testid="section-gemini-gems">
          <Card className="bg-white/[0.02] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-white/60" />
                Gemini Gems - Otimizadores de IA
                <InfoGuide title="Gemini Gems & UGC Realism">
                  <p><strong>UGC Realism:</strong> (User Generated Content) Simula imperfeições de câmeras reais e iluminação natural para criar imagens que parecem fotos reais de redes sociais, evitando o visual "plástico" de IA.</p>
                  <p>Ative os Gems para instruir o Motor de Prompts a priorizar ultra-realismo.</p>
                </InfoGuide>
              </CardTitle>
              <CardDescription className="text-xs">
                Ative gems especializados para ultra-realismo UGC e lockdown biométrico facial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {geminiGems.map((gem) => (
                  <VectraGemCard
                    key={gem.id}
                    id={gem.id}
                    name={gem.name}
                    description={gem.description}
                    category={gem.category}
                    isActive={activeGems.includes(gem.id)}
                    onToggle={(checked) => {
                      if (checked) {
                        setActiveGems(prev => [...prev, gem.id]);
                      } else {
                        setActiveGems(prev => prev.filter(g => g !== gem.id));
                      }
                    }}
                  />
                ))}
              </div>
              {activeGems.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-white/60 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-white/40" />
                    {activeGems.length} gem{activeGems.length > 1 ? 's' : ''} ativo{activeGems.length > 1 ? 's' : ''} - Otimizações serão aplicadas ao gerar prompt
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-6">
          {/* Generation Mode Toggle */}
          <div className="vectra-studio-card">
            <div className="vectra-studio-card-header">
              <Palette className="w-4 h-4 vectra-studio-card-icon" />
              <span className="vectra-studio-card-title">{t.modelslab.generationMode || "Generation Mode"}</span>
            </div>
            <div className="pt-2">

              <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as "img2img" | "text2img" | "product-avatar")}>
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="img2img" className="text-[10px] sm:text-xs" data-testid="tab-img2img">
                    <ImagePlus className="w-3 h-3 mr-1" />
                    {t.modelslab.img2imgMode || "Image to Image"}
                  </TabsTrigger>
                  <TabsTrigger value="product-avatar" className="text-[10px] sm:text-xs" data-testid="tab-product-avatar">
                    <PackageCheck className="w-3 h-3 mr-1" />
                    Ad Generator
                  </TabsTrigger>
                  <TabsTrigger value="text2img" className="text-[10px] sm:text-xs" data-testid="tab-text2img">
                    <Wand2 className="w-3 h-3 mr-1" />
                    {t.modelslab.text2imgMode || "Text to Image"}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground mt-2">
                {generationMode === "text2img"
                  ? (t.modelslab.text2imgDescription || "Generate images from text prompts only. Perfect for logos, scenarios, and creative concepts.")
                  : generationMode === "product-avatar"
                    ? "Create professional product advertisements featuring a specific character avatar."
                    : (t.modelslab.img2imgDescription || "Transform reference images using prompts. Ideal for character consistency and style transfer.")}
              </p>
              {/* Warning when using text2img with Prompt Engine active */}
              {generationMode === "text2img" && usePromptEngine && (
                <div className="mt-2 px-3 py-2 bg-white/5 border border-white/20 rounded-md flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-white/60 shrink-0" />
                  <p className="text-[11px] text-white/60">
                    {t.modelslab.disablePromptEngineWarning || "Desative o Motor de Prompts se for usar Texto para Imagem"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Product Avatar Upload Mode */}
          {generationMode === "product-avatar" && (
            <div className="vectra-studio-card">
              <div className="vectra-studio-card-header">
                <ScanFace className="w-4 h-4 vectra-studio-card-icon" />
                <span className="vectra-studio-card-title">Assets (Face + Product)</span>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Face Slot */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <ScanFace className="w-3 h-3" /> Character Face <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const processed = await processFile(file);
                            if (processed) setFaceImage(processed);
                          }
                        };
                        input.click();
                      }}
                      className={`
                        aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors
                        ${faceImage ? 'border-green-500/50 bg-green-500/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                      `}
                    >
                      {faceImage ? (
                        <div className="relative w-full h-full group">
                          <img src={faceImage.dataUrl} className="w-full h-full object-cover rounded-lg" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setFaceImage(null); }}
                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <ScanFace className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-[10px] text-muted-foreground text-center px-2">Upload Face</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Product Slot */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1 text-muted-foreground">
                      <PackageCheck className="w-3 h-3" /> Product Image <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const processed = await processFile(file);
                            if (processed) setProductImage(processed);
                          }
                        };
                        input.click();
                      }}
                      className={`
                        aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors
                        ${productImage ? 'border-blue-500/50 bg-blue-500/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                      `}
                    >
                      {productImage ? (
                        <div className="relative w-full h-full group">
                          <img src={productImage.dataUrl} className="w-full h-full object-cover rounded-lg" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setProductImage(null); }}
                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <PackageCheck className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-[10px] text-muted-foreground text-center px-2">Upload Product</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Image Upload - Only show in img2img mode */}
          {generationMode === "img2img" && (
            <div className="vectra-studio-card">
              <div className="vectra-studio-card-header">
                <ImagePlus className="w-4 h-4 vectra-studio-card-icon" />
                <span className="vectra-studio-card-title">{t.modelslab.referenceImages}</span>
              </div>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />

                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {images.length}/14
                  </Badge>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => images.length < 14 && fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer
                    ${isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                    }
                    ${images.length >= 14 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  data-testid="dropzone-images"
                >
                  {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">{t.modelslab.dropOrClick}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clipboard className="w-3 h-3" />
                        {t.modelslab.pasteHint}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {images.map((img) => (
                          <div
                            key={img.id}
                            className="relative group aspect-square rounded-md overflow-hidden border bg-muted"
                          >
                            <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                            <button
                              onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-remove-image-${img.id}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {images.length < 14 && (
                          <div className="aspect-square rounded-md border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                            <ImagePlus className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Prompt Engine */}
          <div className="vectra-studio-card">
            <Collapsible open={usePromptEngine} onOpenChange={setUsePromptEngine}>
              <div className="vectra-studio-card-header cursor-pointer" onClick={() => setUsePromptEngine(!usePromptEngine)}>
                <Wand2 className="w-4 h-4 vectra-studio-card-icon" />
                <span className="vectra-studio-card-title flex-1 flex items-center">
                  {t.modelslab.promptEngine || "Prompt Engine"}
                  <InfoGuide title="Motor de Prompts (Prompt Engine)">
                    <p>O <strong>Motor de Prompts</strong> é o cérebro do VECTRA AI. Ele pega sua ideia simples (ex: "gato no espaço") e a reescreve usando técnicas avançadas de engenharia de prompt.</p>
                    <p>Ele adiciona automaticamente detalhes de iluminação, composição, estilo de câmera e texturas baseados no Perfil e Blueprint escolhidos.</p>
                  </InfoGuide>
                </span>
                <div className="flex items-center gap-2">
                  <span className={`vectra-pill text-[10px] ${usePromptEngine ? 'vectra-pill--active' : ''}`} data-testid="badge-prompt-engine-status">
                    {usePromptEngine ? t.modelslab.enabled || "Enabled" : t.modelslab.disabled || "Disabled"}
                  </span>
                  {usePromptEngine ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
                </div>
              </div>

              <CollapsibleContent>
                <div className="space-y-4 pt-4">
                  {/* Profile Selector */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="w-3 h-3" />
                      {t.studio?.llmProfile || "LLM Profile"}
                      <InfoGuide title="Perfil de IA (LLM Profile)">
                        <p>Define a <strong>"personalidade"</strong> da IA que vai escrever seu prompt.</p>
                        <ul className="list-disc pl-3 space-y-1 mt-1">
                          <li><strong>Fotógrafo:</strong> Foca em lentes, ISO, abertura e iluminação técnica.</li>
                          <li><strong>Artista Digital:</strong> Foca em composição, cores vibrantes e renderização 3D.</li>
                          <li><strong>Cinematográfico:</strong> Foca em storytelling, ângulos de câmera e drama.</li>
                        </ul>
                      </InfoGuide>
                    </Label>
                    {loadingProfiles ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                        <SelectTrigger data-testid="select-profile">
                          <SelectValue placeholder={t.modelslab.selectProfile || "Select profile..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles?.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Blueprint Selector */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                      <Layers className="w-3 h-3" />
                      {t.studio?.blueprint || "Blueprint"}
                      <InfoGuide title="Blueprint (Modelo Estrutural)">
                        <p>O <strong>Blueprint</strong> é o esqueleto do prompt. Ele diz à IA como organizar as informações.</p>
                        <p>Use Blueprints específicos para melhores resultados (ex: use "Portrait" para rostos, "Landscape" para cenários). Isso garante que o Motor de Prompts use as palavras-chave corretas para aquele tipo de imagem.</p>
                      </InfoGuide>
                    </Label>
                    <Tabs value={blueprintTab} onValueChange={(v) => setBlueprintTab(v as "system" | "custom")}>
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="system" className="text-xs" data-testid="tab-system-blueprints">
                          {t.blueprintBuilder?.systemBlueprints || "System"}
                        </TabsTrigger>
                        <TabsTrigger value="custom" className="text-xs" data-testid="tab-custom-blueprints">
                          {t.blueprintBuilder?.myBlueprints || "My"}
                          {userBlueprints && userBlueprints.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs px-1">{userBlueprints.length}</Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="system" className="mt-2">
                        {loadingBlueprints ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Select value={selectedBlueprint} onValueChange={(v) => { setSelectedBlueprint(v); setSelectedUserBlueprint(""); }}>
                            <SelectTrigger data-testid="select-blueprint">
                              <SelectValue placeholder={t.modelslab.selectBlueprint || "Select blueprint..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {blueprints?.map((bp) => (
                                <SelectItem key={bp.id} value={bp.id}>
                                  <span className="flex items-center gap-2">
                                    {bp.name}
                                    <Badge variant="outline" className="text-xs">{bp.category}</Badge>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TabsContent>

                      <TabsContent value="custom" className="mt-2">
                        {loadingUserBlueprints ? (
                          <Skeleton className="h-10 w-full" />
                        ) : userBlueprints && userBlueprints.length > 0 ? (
                          <Select value={selectedUserBlueprint} onValueChange={(v) => { setSelectedUserBlueprint(v); setSelectedBlueprint(""); }}>
                            <SelectTrigger data-testid="select-user-blueprint">
                              <SelectValue placeholder={t.modelslab.selectBlueprint || "Select blueprint..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {userBlueprints.map((bp) => (
                                <SelectItem key={bp.id} value={bp.id}>
                                  {bp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            {t.blueprintBuilder?.noUserBlueprints || "No custom blueprints"}
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Filters - Chip/Badge Style */}
                  {!loadingFilters && filters && filters.length > 0 && (
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <SlidersHorizontal className="w-3 h-3" />
                        {t.studio?.filters || "Filters"}
                        <InfoGuide title="Filtros & Aesthetic Intensity">
                          <p><strong>Tags de Filtro:</strong> Adicionam palavras-chave de estilo forçado ao prompt (ex: "Cyberpunk", "Noir", "Watercolor").</p>
                          <p><strong>Aesthetic Intensity:</strong> É determinada pela combinação destas tags + os controles de VFX (no painel avançado).</p>
                          <p>Para uma estética forte, selecione múltiplos filtros do mesmo estilo (ex: Cyberpunk + Neon + Night).</p>
                        </InfoGuide>
                      </Label>
                      <div className="space-y-3">

                        {filters.map((filter) => (
                          <div key={filter.key} className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">{filter.label}</span>
                              {FILTER_DESCRIPTIONS[filter.key] && (
                                <InfoGuide title={filter.label}>
                                  <p>{FILTER_DESCRIPTIONS[filter.key]}</p>
                                </InfoGuide>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {filter.schema.options?.map((option: string) => {
                                const isSelected = activeFilters[filter.key] === option;
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => handleFilterChange(filter.key, isSelected ? "" : option)}
                                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${isSelected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                                      }`}
                                    data-testid={`filter-chip-${filter.key}-${option}`}
                                  >
                                    {FILTER_TRANSLATIONS[option.toLowerCase()] || option}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subject Input */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center">
                      {t.studio?.subject || "Subject"}
                      <InfoGuide title="Sujeito (Subject)">
                        <p>O foco principal da sua imagem. Quem ou o que você quer ver?</p>
                        <p>Seja direto: "Uma mulher guerreira futurista" ou "Um carro esportivo vermelho". O Motor de Prompts vai preencher o resto.</p>
                      </InfoGuide>
                    </Label>
                    <Textarea
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t.studio?.subjectPlaceholder || "Main subject of the image..."}
                      rows={2}
                      data-testid="textarea-subject"
                    />

                    {/* Refine Prompt Button - Only in text2img mode */}
                    {generationMode === "text2img" && (
                      <div className="space-y-2">
                        <Button
                          onClick={() => refinePromptMutation.mutate()}
                          disabled={!subject.trim() || refinePromptMutation.isPending}
                          variant="outline"
                          size="sm"
                          className="w-full"
                          data-testid="button-refine-prompt"
                        >
                          {refinePromptMutation.isPending ? (
                            <>
                              <VectraLaodingTriangle className="w-3 h-3 mr-2" />
                              {t.modelslab.refiningPrompt || "Refinando..."}
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3 h-3 mr-2" />
                              {t.modelslab.refinePrompt || "Refinar Prompt com IA"}
                            </>
                          )}
                        </Button>

                        {/* Show analysis results */}
                        {refinedPromptData && (
                          <div className="text-[10px] p-2 rounded-md bg-muted/50 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[9px]">
                                {refinedPromptData.analysis.type}
                              </Badge>
                              {refinedPromptData.analysis.styles.slice(0, 2).map((s, i) => (
                                <Badge key={i} variant="outline" className="text-[9px]">{s}</Badge>
                              ))}
                            </div>
                            {refinedPromptData.suggestions.length > 0 && (
                              <p className="text-muted-foreground text-[9px] mt-1">
                                💡 {refinedPromptData.suggestions[0]}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Seed */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-xs flex items-center">
                        {t.studio?.seed || "Seed"}
                        <InfoGuide title="Seed (Semente)">
                          <p>Um número que define a aleatoriedade da geração.</p>
                          <p><strong>Mesmo Seed + Mesmo Prompt = Mesma Imagem.</strong></p>
                          <p>Use para reproduzir um resultado que você gostou ou deixe em branco para variações aleatórias.</p>
                        </InfoGuide>
                      </Label>
                      <input
                        type="text"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder={t.studio?.seedPlaceholder || "Random seed..."}
                        className="w-full h-8 px-3 text-sm rounded-md border bg-background"
                        data-testid="input-seed"
                      />
                    </div>
                    <Button size="icon" variant="outline" onClick={handleRandomSeed} className="mt-5" data-testid="button-random-seed">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {/* Generate Prompt Button */}
                    <Button
                      onClick={() => generatePromptMutation.mutate()}
                      disabled={!canGeneratePrompt || generatePromptMutation.isPending}
                      className="flex-1"
                      variant="secondary"
                      data-testid="button-generate-prompt"
                    >
                      {generatePromptMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4 mr-2" />
                      )}
                      {t.modelslab.generatePrompt || "Generate Prompt"}
                    </Button>

                    {/* Pause Button */}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        // Logic to pause/stop generation if supported, or just placeholder visually
                        if (generatePromptMutation.isPending) {
                          // Example: Resetting mutation state to 'stop' the loading UI
                          generatePromptMutation.reset();
                        }
                      }}
                      disabled={!generatePromptMutation.isPending}
                      title="Pausar Geração"
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Manual Prompt & Generation */}
          <div className="vectra-studio-card">
            <div className="vectra-studio-card-header">
              <Sparkles className="w-4 h-4 vectra-studio-card-icon" />
              <span className="vectra-studio-card-title">{t.modelslab.prompt}</span>
            </div>
            <div className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.modelslab.promptPlaceholder}
                rows={4}
                data-testid="textarea-prompt"
              />

              <div className="space-y-2">
                <Label>{t.modelslab.aspectRatio}</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger data-testid="select-aspect-ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aspectRatios.map((ratio) => (
                      <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (generationMode === "text2img") {
                      generateText2ImgMutation.mutate();
                    } else {
                      generateImageMutation.mutate();
                    }
                  }}
                  disabled={
                    isGeneratingImage ||
                    (generationMode === "text2img"
                      ? !(usePromptEngine && prompt.trim() ? prompt : subject).trim()
                      : generationMode === "product-avatar"
                        ? (!prompt.trim() || !faceImage || !productImage)
                        : !prompt.trim()) ||
                    (generationMode === "img2img" && images.length === 0)
                  }
                  className="flex-1"
                  data-testid="button-generate"
                >
                  {isGeneratingImage ? (
                    <>
                      <VectraLaodingTriangle className="w-4 h-4 mr-2" />
                      {generationMode === "product-avatar"
                        ? "Renderizando..."
                        : (isPolling ? t.modelslab.processing : t.modelslab.generating)}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {generationMode === "text2img"
                        ? (t.modelslab.generateText2Img || "Generate from Prompt")
                        : generationMode === "product-avatar"
                          ? "Gerar Campanha Publicitária"
                          : t.modelslab.generate}
                    </>
                  )}
                </Button>
                {isGeneratingImage && (
                  <Button
                    onClick={cancelGeneration}
                    variant="destructive"
                    size="icon"
                    data-testid="button-cancel-generation"
                    title={t.modelslab.cancel || "Cancel"}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="vectra-studio-card">
          <div className="vectra-studio-card-header">
            <Sparkles className="w-4 h-4 vectra-studio-card-icon" />
            <span className="vectra-studio-card-title">{t.modelslab.outputTitle}</span>
          </div>
          <div className="space-y-4">
            {result?.output && result.output.length > 0 ? (
              <div className="space-y-4">
                {result.output.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Generated ${index + 1}`}
                      className="w-full max-h-[70vh] object-contain rounded-lg border bg-black/20"
                      data-testid={`img-result-${index}`}
                    />
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => {
                          if (!result?.output?.[index]) {
                            toast({
                              title: t.common?.error || "Error",
                              description: "No image to save",
                              variant: "destructive"
                            });
                            return;
                          }

                          try {
                            saveImageMutation.mutate({
                              imageUrl,
                              prompt,
                              generationTimeMs: result.generationTime ? result.generationTime * 1000 : undefined,
                              model: isAdmin ? "nano-banana-pro" : "realistic-vision-51",
                            });
                          } catch (error) {
                            console.error("Failed to trigger save:", error);
                            toast({
                              title: t.common?.error || "Error",
                              description: "Failed to save image",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={saveImageMutation.isPending}
                        data-testid={`button-save-${index}`}
                        title={t.modelslab.saveToGallery || "Save to gallery"}
                      >
                        <Save className="w-4 h-4 text-green-500" />
                      </Button>
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] text-white/50 pointer-events-none">
                        Auto-saved
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => window.open(imageUrl, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => downloadImage(imageUrl)}
                        title="Download"
                        data-testid={`button-download-${index}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => openVideoDialogWithImage(imageUrl)}
                        title={t.modelslab.transformToVideo || "Transform to Video"}
                        data-testid={`button-video-${index}`}
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {result.generationTime && (
                  <p className="text-sm text-muted-foreground text-center">
                    {t.modelslab.generatedIn} {result.generationTime.toFixed(2)}s
                  </p>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t flex flex-wrap gap-2">
                  <Button
                    onClick={() => generateImageMutation.mutate()}
                    disabled={isGeneratingImage || !prompt.trim() || (generationMode === 'img2img' ? images.length === 0 : (generationMode === 'product-avatar' ? (!faceImage || !productImage) : false))}
                    className="flex-1"
                    variant="default"
                    data-testid="button-regenerate"
                  >
                    {isGeneratingImage ? (
                      <VectraLaodingTriangle className="w-4 h-4 mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {t.modelslab.regenerate || "Regenerate"}
                  </Button>
                  <Button
                    onClick={() => {
                      if (result.output && result.output.length > 0) {
                        openVideoDialogWithImage(result.output[0]);
                      }
                    }}
                    className="flex-1"
                    variant="outline"
                    data-testid="button-transform-video"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {t.modelslab.transformToVideoFull || "Transform to Video"}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" data-testid="button-export-dropdown">
                        <FileDown className="w-4 h-4 mr-2" />
                        {t.modelslab.export || "Export"}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          if (!result?.output) return;
                          const exportData = {
                            prompt: prompt || undefined,
                            seed: seed || undefined,
                            aspectRatio,
                            profile: selectedProfile || undefined,
                            blueprint: selectedBlueprint || selectedUserBlueprint || undefined,
                            filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
                            imageUrls: result.output,
                            generatedAt: new Date().toISOString(),
                          };
                          exportToJSON(exportData);
                          toast({ title: t.modelslab.exportSuccess || "Export completed" });
                        }}
                        data-testid="menu-item-export-json"
                      >
                        <FileJson className="w-4 h-4 mr-2" />
                        {t.modelslab.exportJSON || "Export JSON"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!result?.output) return;
                          const exportData = {
                            prompt: prompt || undefined,
                            seed: seed || undefined,
                            aspectRatio,
                            profile: selectedProfile || undefined,
                            blueprint: selectedBlueprint || selectedUserBlueprint || undefined,
                            filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
                            imageUrls: result.output,
                            generatedAt: new Date().toISOString(),
                          };
                          exportToYAML(exportData);
                          toast({ title: t.modelslab.exportSuccess || "Export completed" });
                        }}
                        data-testid="menu-item-export-yaml"
                      >
                        <FileTextIcon className="w-4 h-4 mr-2" />
                        {t.modelslab.exportYAML || "Export YAML"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          if (!result?.output) return;
                          try {
                            const exportData = {
                              prompt: prompt || undefined,
                              seed: seed || undefined,
                              aspectRatio,
                              profile: selectedProfile || undefined,
                              blueprint: selectedBlueprint || selectedUserBlueprint || undefined,
                              filters: Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
                              imageUrls: result.output,
                              generatedAt: new Date().toISOString(),
                            };
                            await exportToPDF(exportData, 'vectra-ai-export', {
                              title: t.modelslab.exportTitle || "Vectra AI Export",
                              prompt: t.modelslab.exportPrompt || "Prompt",
                              seed: t.modelslab.exportSeed || "Seed",
                              aspectRatio: t.modelslab.exportAspectRatio || "Aspect Ratio",
                              profile: t.modelslab.exportProfile || "Profile",
                              blueprint: t.modelslab.exportBlueprint || "Blueprint",
                              filters: t.modelslab.exportFilters || "Filters",
                              generatedAt: t.modelslab.exportGeneratedAt || "Generated At",
                              images: t.modelslab.exportImages || "Images",
                            });
                            toast({ title: t.modelslab.exportSuccess || "Export completed" });
                          } catch (error) {
                            toast({ title: t.modelslab.exportError || "Export failed", variant: "destructive" });
                          }
                        }}
                        data-testid="menu-item-export-pdf"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        {t.modelslab.exportPDF || "Export PDF"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
                <p className="text-muted-foreground text-center">
                  {isGeneratingImage ? (
                    <span className="flex items-center gap-2">
                      <VectraLaodingTriangle className="w-5 h-5" />
                      {t.modelslab.waitingResult}
                    </span>
                  ) : (
                    t.modelslab.noResult
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Video Result Viewer - Shows generated video in main view */}
        {videoResult?.output && videoResult.output.length > 0 && (
          <div className="vectra-studio-card mt-6 border-2 border-primary/20">
            <div className="vectra-studio-card-header">
              <Video className="w-4 h-4 vectra-studio-card-icon" />
              <span className="vectra-studio-card-title flex-1">{t.modelslab.videoResult || "Generated Video"}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={clearVideoResult}
                title={t.modelslab.close || "Close"}
                data-testid="button-close-video-result"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <video
                src={getProxiedVideoUrl(videoResult.output[0])}
                controls
                autoPlay
                loop
                playsInline
                className="w-full rounded-lg border aspect-video bg-black"
                data-testid="video-result-main"
                onError={(e) => {
                  console.error("Video playback error:", e, "URL:", videoResult.output?.[0]);
                }}
              />

              {/* Video Metadata */}
              {videoGenerationMeta && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg text-sm">
                  <div>
                    <p className="text-muted-foreground">{t.modelslab.videoDurationLabel || "Duration"}</p>
                    <p className="font-medium">{videoGenerationMeta.duration}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.modelslab.aspectRatio}</p>
                    <p className="font-medium">{videoGenerationMeta.aspect === "auto" ? "Auto" : videoGenerationMeta.aspect}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.modelslab.model}</p>
                    <p className="font-medium">{videoGenerationMeta.model || "AI Video Model"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.modelslab.generationTime || "Generation Time"}</p>
                    <p className="font-medium">
                      {videoGenerationMeta.generationTimeMs
                        ? `${(videoGenerationMeta.generationTimeMs / 1000).toFixed(1)}s`
                        : "-"}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(videoResult.output![0], "_blank")}
                  data-testid="button-open-video-main"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t.modelslab.openVideo || "Open in New Tab"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadVideo(videoResult.output![0])}
                  data-testid="button-download-video-main"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t.modelslab.downloadVideo || "Download"}
                </Button>
                <Button
                  onClick={() => {
                    saveVideoMutation.mutate({
                      videoUrl: videoResult.output![0],
                      prompt: prompt || "Video generated from image",
                    });
                  }}
                  disabled={saveVideoMutation.isPending}
                  data-testid="button-save-video-main"
                >
                  {saveVideoMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Heart className="w-4 h-4 mr-2" />
                  )}
                  {t.modelslab.saveVideoToGallery || "Save to Gallery"}
                </Button>
              </div>

              {/* Source Image Thumbnail */}
              {videoGenerationMeta?.sourceImage && (
                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                  <img
                    src={videoGenerationMeta.sourceImage}
                    alt="Source"
                    className="w-16 h-16 object-cover rounded border"
                  />
                  <div className="text-sm">
                    <p className="font-medium">{t.modelslab.sourceImage || "Source Image"}</p>
                    <p className="text-muted-foreground">
                      {t.modelslab.transformedAt || "Transformed at"} {videoGenerationMeta.generatedAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video Processing Indicator (when modal is closed but still processing) */}
        {isPollingVideo && !showVideoDialog && (
          <Card className="mt-6 border-dashed">
            <CardContent className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">{t.modelslab.videoProcessing || "Generating video..."}</p>
                <p className="text-sm text-muted-foreground">{t.modelslab.videoProcessingHint || "This may take a few minutes. You can continue using the app."}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Model Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t.modelslab.aboutTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t.modelslab.resolution}</p>
              <p className="font-medium">Up to 4K</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.modelslab.maxImages}</p>
              <p className="font-medium">14 images</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.modelslab.consistency}</p>
              <p className="font-medium">95%+</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.modelslab.model}</p>
              <p className="font-medium">Nano Banana Pro</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              {t.modelslab.galleryTitle || "Image Gallery"}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGallery(!showGallery)}
            >
              {showGallery ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
          <CardDescription>{t.modelslab.galleryDescription || "Your saved generated images"}</CardDescription>
        </CardHeader>
        {showGallery && (
          <CardContent>
            {loadingSavedImages ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : savedImages && savedImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedImages.map((img) => (
                  <div key={img.id} className="relative group aspect-square">
                    <img
                      src={img.imageUrl}
                      alt={img.prompt.slice(0, 50)}
                      className="w-full h-full object-cover rounded-lg border"
                      data-testid={`img-gallery-${img.id}`}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white"
                          onClick={() => toggleFavoriteMutation.mutate(img.id)}
                          data-testid={`button-favorite-${img.id}`}
                        >
                          <Heart
                            className={`w-4 h-4 ${img.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-white"
                              data-testid={`button-export-gallery-${img.id}`}
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                const exportData = {
                                  prompt: img.prompt || undefined,
                                  imageUrls: [img.imageUrl],
                                  generatedAt: new Date(img.createdAt).toISOString(),
                                };
                                exportToJSON(exportData, `image-${img.id}`);
                                toast({ title: t.modelslab.exportSuccess || "Export completed" });
                              }}
                              data-testid={`menu-item-gallery-json-${img.id}`}
                            >
                              <FileJson className="w-4 h-4 mr-2" />
                              JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const exportData = {
                                  prompt: img.prompt || undefined,
                                  imageUrls: [img.imageUrl],
                                  generatedAt: new Date(img.createdAt).toISOString(),
                                };
                                exportToYAML(exportData, `image-${img.id}`);
                                toast({ title: t.modelslab.exportSuccess || "Export completed" });
                              }}
                              data-testid={`menu-item-gallery-yaml-${img.id}`}
                            >
                              <FileTextIcon className="w-4 h-4 mr-2" />
                              YAML
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const exportData = {
                                    prompt: img.prompt || undefined,
                                    imageUrls: [img.imageUrl],
                                    generatedAt: new Date(img.createdAt).toISOString(),
                                  };
                                  await exportToPDF(exportData, `image-${img.id}`, {
                                    title: t.modelslab.exportTitle || "Vectra AI Export",
                                    prompt: t.modelslab.exportPrompt || "Prompt",
                                    seed: t.modelslab.exportSeed || "Seed",
                                    aspectRatio: t.modelslab.exportAspectRatio || "Aspect Ratio",
                                    profile: t.modelslab.exportProfile || "Profile",
                                    blueprint: t.modelslab.exportBlueprint || "Blueprint",
                                    filters: t.modelslab.exportFilters || "Filters",
                                    generatedAt: t.modelslab.exportGeneratedAt || "Generated At",
                                    images: t.modelslab.exportImages || "Images",
                                  });
                                  toast({ title: t.modelslab.exportSuccess || "Export completed" });
                                } catch (error) {
                                  toast({ title: t.modelslab.exportError || "Export failed", variant: "destructive" });
                                }
                              }}
                              data-testid={`menu-item-gallery-pdf-${img.id}`}
                            >
                              <FileDown className="w-4 h-4 mr-2" />
                              PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white"
                          onClick={() => window.open(img.imageUrl, "_blank")}
                          data-testid={`button-open-gallery-${img.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white"
                          onClick={() => setSelectedImageDetails(img)}
                          data-testid={`button-info-gallery-${img.id}`}
                          title={t.modelslab.imageDetails || "Image Details"}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white"
                          onClick={() => deleteImageMutation.mutate(img.id)}
                          data-testid={`button-delete-gallery-${img.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-white/80 line-clamp-2">{img.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center border border-dashed rounded-lg">
                <p className="text-muted-foreground text-sm">{t.modelslab.noSavedImages || "No saved images yet"}</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Video Gallery Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {t.modelslab.videoGalleryTitle || "Video Gallery"}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVideoGallery(!showVideoGallery)}
              data-testid="button-toggle-video-gallery"
            >
              {showVideoGallery ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
          <CardDescription>{t.modelslab.videoGalleryDescription || "Your saved generated videos"}</CardDescription>
        </CardHeader>
        {showVideoGallery && (
          <CardContent>
            {loadingSavedVideos ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-lg" />
                ))}
              </div>
            ) : savedVideos && savedVideos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {savedVideos.map((video) => (
                  <div key={video.id} className="relative group aspect-video">
                    <VideoThumbnail
                      src={video.videoUrl}
                      poster={video.thumbnailUrl || undefined}
                      className="w-full h-full object-cover rounded-lg border bg-black"
                      testId={`video-gallery-${video.id}`}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white"
                          onClick={() => toggleVideoFavoriteMutation.mutate(video.id)}
                          data-testid={`button-favorite-video-${video.id}`}
                        >
                          <Heart
                            className={`w-4 h-4 ${video.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                          />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-white"
                              data-testid={`button-export-video-${video.id}`}
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                const exportData = {
                                  prompt: video.prompt || undefined,
                                  videoUrl: video.videoUrl,
                                  aspectRatio: video.aspectRatio,
                                  durationSeconds: video.durationSeconds,
                                  generatedAt: new Date(video.createdAt).toISOString(),
                                };
                                exportToJSON(exportData, `video-${video.id}`);
                                toast({ title: t.modelslab.exportSuccess || "Export completed" });
                              }}
                              data-testid={`menu-item-video-json-${video.id}`}
                            >
                              <FileJson className="w-4 h-4 mr-2" />
                              JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const exportData = {
                                  prompt: video.prompt || undefined,
                                  videoUrl: video.videoUrl,
                                  aspectRatio: video.aspectRatio,
                                  durationSeconds: video.durationSeconds,
                                  generatedAt: new Date(video.createdAt).toISOString(),
                                };
                                exportToYAML(exportData, `video-${video.id}`);
                                toast({ title: t.modelslab.exportSuccess || "Export completed" });
                              }}
                              data-testid={`menu-item-video-yaml-${video.id}`}
                            >
                              <FileTextIcon className="w-4 h-4 mr-2" />
                              YAML
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white"
                          onClick={() => window.open(video.videoUrl, "_blank")}
                          data-testid={`button-open-video-${video.id}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-white"
                          onClick={() => deleteVideoMutation.mutate(video.id)}
                          data-testid={`button-delete-video-${video.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {video.durationSeconds}s
                        </Badge>
                        <p className="text-xs text-white/80 line-clamp-1 flex-1">{video.prompt}</p>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2">
                      <Play className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center border border-dashed rounded-lg">
                <p className="text-muted-foreground text-sm">{t.modelslab.noSavedVideos || "No saved videos yet"}</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filter Presets Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5" />
              {t.modelslab.presetsTitle || "Filter Presets"}
            </CardTitle>
            <div className="flex gap-2">
              {Object.keys(activeFilters).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPresetDialog(true)}
                  data-testid="button-save-preset"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {t.modelslab.savePreset || "Save Preset"}
                </Button>
              )}
            </div>
          </div>
          <CardDescription>{t.modelslab.presetsDescription || "Save and load your filter configurations"}</CardDescription>
        </CardHeader>
        <CardContent>
          {showPresetDialog && (
            <div className="mb-4 p-3 border rounded-lg bg-muted/50">
              <Label className="text-sm mb-2 block">{t.modelslab.presetName || "Preset Name"}</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                  placeholder={t.modelslab.enterPresetName || "Enter preset name..."}
                  data-testid="input-preset-name"
                />
                <Button
                  size="sm"
                  onClick={() => presetName.trim() && savePresetMutation.mutate(presetName.trim())}
                  disabled={!presetName.trim() || savePresetMutation.isPending}
                  data-testid="button-confirm-save-preset"
                >
                  {savePresetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t.modelslab.save || "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowPresetDialog(false);
                    setPresetName("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {loadingPresets ? (
            <div className="flex gap-2 flex-wrap">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          ) : filterPresets && filterPresets.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {filterPresets.map((preset) => (
                <div key={preset.id} className="flex items-center gap-1 group">
                  <Badge
                    className="cursor-pointer hover-elevate"
                    onClick={() => loadPreset(preset)}
                    data-testid={`badge-preset-${preset.id}`}
                  >
                    {preset.name}
                    <span className="ml-1 text-xs opacity-60">
                      ({Object.keys(preset.filters as Record<string, string>).length})
                    </span>
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deletePresetMutation.mutate(preset.id)}
                    data-testid={`button-delete-preset-${preset.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.modelslab.noPresets || "No saved presets. Enable filters and save a preset to get started."}</p>
          )}
        </CardContent>
      </Card>


      {/* Video Generation Dialog - Only for configuration and initial status */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {t.modelslab.videoDialogTitle || "Image to Video"}
            </DialogTitle>
            <DialogDescription>
              {t.modelslab.videoDialogDescription || "Transform your image into a high-quality video"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Auto-detected Model Info */}
            <div className="p-4 bg-muted/50 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Model</span>
                <Badge variant="secondary">{getVideoModelInfo(videoAspect).name}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t.modelslab.videoAspectRatio || "Aspect Ratio"}</span>
                <Badge variant="outline">{videoAspect}</Badge>
              </div>
              {detectedAspect && (
                <p className="text-xs text-muted-foreground">
                  {videoAspect === "16:9"
                    ? "Landscape images use Google Veo 3.1"
                    : "Portrait images use Seedance 1.5 Pro"}
                </p>
              )}
            </div>

            {/* Aspect Ratio Toggle - Allow user to override */}
            {!isPollingVideo && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.modelslab.videoAspectRatio || "Output Aspect Ratio"}</Label>
                  <Select value={videoAspect} onValueChange={(v) => setVideoAspect(v as typeof videoAspect)}>
                    <SelectTrigger data-testid="select-video-aspect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 Landscape (Veo 3.1)</SelectItem>
                      <SelectItem value="9:16">9:16 Portrait (Seedance 1.5 Pro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.modelslab.videoDuration || "Duration"}: {videoDuration}s</Label>
                  <Slider
                    value={[videoDuration]}
                    onValueChange={(v) => setVideoDuration(v[0])}
                    min={2}
                    max={videoAspect === "9:16" ? 25 : 8}
                    step={1}
                    data-testid="slider-video-duration"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>2s</span>
                    <span>{videoAspect === "9:16" ? "25s" : "8s"}</span>
                  </div>
                </div>

              </div>
            )}

            {/* Video Specs Info */}
            <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg space-y-1">
              <p>{t.modelslab.videoSpecs || "Generates ~5 second high-quality videos at 16fps."}</p>
              <p className="text-xs opacity-75">{t.modelslab.videoCostNote || "Video generation may take 1-3 minutes to complete."}</p>
            </div>

            {/* Processing Status - Show in modal while processing */}
            {isPollingVideo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {t.modelslab.videoProcessing || "Generating video..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.modelslab.videoModalHint || "You can close this dialog. The video will appear in the main view when ready."}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

          <DialogFooter className="gap-2">
            {isPollingVideo ? (
              <Button
                variant="outline"
                onClick={() => setShowVideoDialog(false)}
                data-testid="button-close-video-modal"
              >
                {t.modelslab.closeAndWait || "Close & Wait"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowVideoDialog(false)}
                  data-testid="button-cancel-video"
                >
                  {t.modelslab.cancel || "Cancel"}
                </Button>
                <Button
                  onClick={() => selectedImageForVideo && generateVideoMutation.mutate(selectedImageForVideo)}
                  disabled={generateVideoMutation.isPending || !selectedImageForVideo}
                  data-testid="button-confirm-video"
                >
                  {generateVideoMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.modelslab.startingGeneration || "Starting..."}
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      {t.modelslab.generateVideo || "Generate Video"}
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HQ Quota Exhausted Popup */}
      <Dialog open={showHqExhaustedPopup} onOpenChange={setShowHqExhaustedPopup}>
        <DialogContent className="max-w-md" data-testid="dialog-hq-exhausted">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t.modelslab.hqLimitReached || "Limite de Imagens HQ Atingido"}
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                {t.modelslab.hqLimitMessage || "Você utilizou suas 5 imagens de alta qualidade (Nano Banana Pro). As próximas 5 gerações gratuitas usarão o modelo Realistic Vision 5.1."}
              </p>
              {currentQuotas && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Imagens HQ (Nano Banana Pro):</span>
                    <span className="font-medium">{currentQuotas.hq.used}/{currentQuotas.hq.limit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Imagens Standard (Realistic Vision 5.1):</span>
                    <span className="font-medium">{currentQuotas.standard.used}/{currentQuotas.standard.limit}</span>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowHqExhaustedPopup(false)}
              data-testid="button-hq-popup-ok"
            >
              OK
            </Button>
            <Button
              onClick={() => {
                setShowHqExhaustedPopup(false);
                window.location.href = "/pricing";
              }}
              data-testid="button-hq-popup-upgrade"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t.modelslab.upgradeToPro || "Upgrade para Pro (ilimitado)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal for Premium Features */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={upgradeFeature}
      />

      {/* Onboarding Tutorial for First-Time Users */}
      <OnboardingTutorial
        open={showTutorial}
        onComplete={handleTutorialComplete}
      />

      {/* Admin API Key Modal */}
      <Dialog open={showAdminKeyModal} onOpenChange={setShowAdminKeyModal}>
        <DialogContent className="bg-[#0e1014]/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Configurar API Key do ModelsLab
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {usageData?.hasCustomKey
                ? "Sua API key personalizada está ativa. Você pode atualizá-la ou removê-la."
                : "Insira sua API key do ModelsLab para usar geração ilimitada com sua própria conta."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key do ModelsLab</Label>
              <Textarea
                placeholder="Insira sua API key aqui..."
                value={adminApiKey}
                onChange={(e) => setAdminApiKey(e.target.value)}
                className="font-mono text-sm bg-background/50"
                data-testid="input-admin-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Obtenha sua API key em <a href="https://modelslab.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">modelslab.com</a>
              </p>
            </div>

            {usageData?.hasCustomKey && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  API Key personalizada ativa - geração ilimitada
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {usageData?.hasCustomKey && (
              <Button
                variant="outline"
                onClick={() => removeAdminApiKeyMutation.mutate()}
                disabled={removeAdminApiKeyMutation.isPending}
                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                data-testid="button-remove-api-key"
              >
                {removeAdminApiKeyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Remover Key
              </Button>
            )}
            <Button
              onClick={() => saveAdminApiKeyMutation.mutate(adminApiKey)}
              disabled={!adminApiKey.trim() || saveAdminApiKeyMutation.isPending}
              data-testid="button-save-api-key"
            >
              {saveAdminApiKeyMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Details Dialog */}
      <Dialog open={!!selectedImageDetails} onOpenChange={(open) => !open && setSelectedImageDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              {t.modelslab.imageDetails || "Image Details"}
            </DialogTitle>
            <DialogDescription>
              {t.modelslab.imageDetailsDescription || "Generation settings and metadata for this image"}
            </DialogDescription>
          </DialogHeader>

          {selectedImageDetails && (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={selectedImageDetails.imageUrl}
                  alt="Generated image"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{t.modelslab.aspectRatio || "Aspect Ratio"}</p>
                  <p className="font-medium">{selectedImageDetails.aspectRatio || "1:1"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.modelslab.createdAt || "Created At"}</p>
                  <p className="font-medium">{new Date(selectedImageDetails.createdAt).toLocaleString()}</p>
                </div>
                {selectedImageDetails.seed && (
                  <div>
                    <p className="text-sm text-muted-foreground">Seed</p>
                    <p className="font-mono text-sm">{selectedImageDetails.seed}</p>
                  </div>
                )}
                {selectedImageDetails.metadata?.generationTime != null && typeof selectedImageDetails.metadata.generationTime === 'number' && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t.modelslab.generationTime || "Generation Time"}</p>
                    <p className="font-medium">{(selectedImageDetails.metadata.generationTime / 1000).toFixed(1)}s</p>
                  </div>
                )}
              </div>

              {/* Model & Quality */}
              {(selectedImageDetails.metadata?.modelId || selectedImageDetails.metadata?.imageQuality) && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4" />
                    {t.modelslab.model || "Model"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedImageDetails.metadata?.modelId && (
                      <Badge variant="secondary">
                        {selectedImageDetails.metadata.modelId === "nano-banana-pro" ? "Nano Banana Pro (HQ)" : "Realistic Vision 5.1"}
                      </Badge>
                    )}
                    {selectedImageDetails.metadata?.imageQuality && (
                      <Badge variant={selectedImageDetails.metadata.imageQuality === "hq" ? "default" : "outline"}>
                        {selectedImageDetails.metadata.imageQuality === "hq" ? "High Quality" : "Standard"}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* VFX Effects */}
              {Array.isArray(selectedImageDetails.metadata?.cinematicSettings?.vfx?.effects) &&
                selectedImageDetails.metadata.cinematicSettings.vfx.effects.length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Film className="w-4 h-4" />
                      VFX Effects
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedImageDetails.metadata.cinematicSettings.vfx.effects.map((effect) => (
                        <Badge key={effect} variant="outline" className="capitalize">
                          {String(effect).replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                    {typeof selectedImageDetails.metadata.cinematicSettings.vfx.intensity === 'number' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Intensity: {selectedImageDetails.metadata.cinematicSettings.vfx.intensity}%
                      </p>
                    )}
                  </div>
                )}

              {/* Optics & Style DNA */}
              {(selectedImageDetails.metadata?.cinematicSettings?.optics ||
                selectedImageDetails.metadata?.cinematicSettings?.styleDna) && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Palette className="w-4 h-4" />
                      {t.modelslab.cinematicSettings || "Cinematic Settings"}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedImageDetails.metadata?.cinematicSettings?.optics?.style && (
                        <div>
                          <p className="text-muted-foreground">Optics Style</p>
                          <p className="capitalize">{selectedImageDetails.metadata.cinematicSettings.optics.style}</p>
                        </div>
                      )}
                      {selectedImageDetails.metadata?.cinematicSettings?.styleDna?.brand && (
                        <div>
                          <p className="text-muted-foreground">Brand DNA</p>
                          <p className="capitalize">{selectedImageDetails.metadata.cinematicSettings.styleDna.brand}</p>
                        </div>
                      )}
                      {selectedImageDetails.metadata?.cinematicSettings?.styleDna?.fit && (
                        <div>
                          <p className="text-muted-foreground">Fit Style</p>
                          <p className="capitalize">{selectedImageDetails.metadata.cinematicSettings.styleDna.fit}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Active Gems */}
              {Array.isArray(selectedImageDetails.metadata?.cinematicSettings?.activeGems) &&
                selectedImageDetails.metadata.cinematicSettings.activeGems.length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4" />
                      Gemini Gems
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedImageDetails.metadata.cinematicSettings.activeGems.map((gem) => (
                        <Badge key={gem} variant="secondary" className="uppercase text-xs">
                          {String(gem).replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Prompt */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Prompt</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedImageDetails.prompt}</p>
              </div>

              {/* Applied Filters */}
              {selectedImageDetails.appliedFilters &&
                typeof selectedImageDetails.appliedFilters === 'object' &&
                Object.keys(selectedImageDetails.appliedFilters).length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <SlidersHorizontal className="w-4 h-4" />
                      {t.modelslab.appliedFilters || "Applied Filters"}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedImageDetails.appliedFilters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="capitalize">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StudioPage >
  );
}
