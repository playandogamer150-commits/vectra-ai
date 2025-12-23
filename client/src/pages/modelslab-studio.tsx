import { useState, useRef, useEffect, useCallback } from "react";
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
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { LlmProfile, PromptBlueprint, Filter, SavedImage, FilterPreset, SavedVideo } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { 
  Loader2, ImagePlus, Sparkles, X, Download, ExternalLink, Upload, Clipboard,
  ChevronDown, ChevronUp, Layers, SlidersHorizontal, Wand2, RefreshCw, Heart,
  Save, Trash2, FolderOpen, BookmarkPlus, Video, Play, FileJson, FileText, FileDown
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToJSON, exportToYAML, exportToPDF } from "@/lib/export-utils";

interface ModelsLabResponse {
  status: string;
  generationTime?: number;
  id?: number;
  output?: string[];
  fetch_result?: string;
  eta?: number;
  message?: string;
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

export default function ModelsLabStudioPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  
  // Image state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Prompt state
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  
  // Prompt Engine state
  const [usePromptEngine, setUsePromptEngine] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>("");
  const [selectedUserBlueprint, setSelectedUserBlueprint] = useState<string>("");
  const [blueprintTab, setBlueprintTab] = useState<"system" | "custom">("system");
  const [activeFilters, setActiveFilters] = useState<FilterValue>({});
  const [seed, setSeed] = useState<string>("");
  const [subject, setSubject] = useState("");
  
  // Result state
  const [result, setResult] = useState<ModelsLabResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);

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

  // Gallery state
  const [showGallery, setShowGallery] = useState(false);
  const [showVideoGallery, setShowVideoGallery] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [showPresetDialog, setShowPresetDialog] = useState(false);

  // Video generation state (Job System)
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<string>("");
  const [videoResult, setVideoResult] = useState<Sora2Response | null>(null);
  const [isPollingVideo, setIsPollingVideo] = useState(false);
  const [videoAspect, setVideoAspect] = useState<"auto" | "9:16" | "16:9" | "1:1">("16:9");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [generateAudio, setGenerateAudio] = useState<boolean>(false);
  const [currentVideoJobId, setCurrentVideoJobId] = useState<string | null>(null);
  const [videoGenerationMeta, setVideoGenerationMeta] = useState<{
    duration: number;
    aspect: string;
    sourceImage: string;
    generatedAt: Date;
    generationTimeMs?: number;
  } | null>(null);
  const [videoGenerationStartTime, setVideoGenerationStartTime] = useState<number | null>(null);

  // Save image mutation
  const saveImageMutation = useMutation({
    mutationFn: async (imageData: { imageUrl: string; prompt: string }) => {
      return apiRequest("POST", "/api/gallery", {
        ...imageData,
        aspectRatio,
        profileId: selectedProfile || undefined,
        blueprintId: selectedBlueprint || undefined,
        userBlueprintId: selectedUserBlueprint || undefined,
        appliedFilters: activeFilters,
        seed: seed || undefined,
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
        aspectRatio: videoAspect === "auto" ? "16:9" : videoAspect,
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
        modelId: "svd",
        generationType: "image-to-video",
      });
      return await response.json();
    },
    onSuccess: (data) => {
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
      toast({ 
        title: t.modelslab.videoError || "Video generation failed", 
        description: String(error),
        variant: "destructive" 
      });
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
    });
    setIsPollingVideo(false);
    setShowVideoDialog(false);
    toast({ title: t.modelslab.videoGenerated || "Video generated successfully!" });
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
      });
      return res.json() as Promise<GeneratedPromptResult>;
    },
    onSuccess: (data) => {
      setPrompt(data.compiledPrompt);
      setSeed(data.seed);
      toast({ 
        title: t.modelslab.promptGenerated || "Prompt generated",
        description: t.modelslab.promptApplied || "Prompt applied to the textarea" 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: t.modelslab.error, 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Image generation mutation
  const generateImageMutation = useMutation({
    mutationFn: async () => {
      if (images.length === 0) {
        throw new Error(t.modelslab.noImages);
      }
      
      const imageUrls = images.map(img => img.dataUrl);
      
      const res = await apiRequest("POST", "/api/modelslab/generate", {
        prompt,
        images: imageUrls,
        aspectRatio,
      });
      return res.json() as Promise<ModelsLabResponse>;
    },
    onSuccess: async (data) => {
      if (data.status === "processing" && data.fetch_result) {
        setIsPolling(true);
        pollForResult(data.fetch_result);
      } else if (data.status === "success" && data.output) {
        setResult(data);
        toast({
          title: t.modelslab.success,
          description: t.modelslab.imageGenerated,
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
      toast({
        title: t.modelslab.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pollForResult = async (fetchUrl: string) => {
    let attempts = 0;
    const maxAttempts = 60;
    
    const poll = async () => {
      try {
        const res = await apiRequest("POST", "/api/modelslab/status", { fetchUrl });
        const data = await res.json() as ModelsLabResponse;
        
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

  const isGeneratingImage = generateImageMutation.isPending || isPolling;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-modelslab-title">
            {t.modelslab.title}
          </h1>
          <p className="text-muted-foreground" data-testid="text-modelslab-subtitle">
            {t.modelslab.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImagePlus className="w-5 h-5" />
                  {t.modelslab.referenceImages}
                </CardTitle>
                <CardDescription>{t.modelslab.inputDescription}</CardDescription>
              </CardHeader>
              <CardContent>
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
                      <div className="grid grid-cols-4 gap-2">
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
              </CardContent>
            </Card>

            {/* Prompt Engine */}
            <Card>
              <Collapsible open={usePromptEngine} onOpenChange={setUsePromptEngine}>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-prompt-engine">
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5" />
                      {t.modelslab.promptEngine || "Prompt Engine"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={usePromptEngine ? "default" : "secondary"} data-testid="badge-prompt-engine-status">
                        {usePromptEngine ? t.modelslab.enabled || "Enabled" : t.modelslab.disabled || "Disabled"}
                      </Badge>
                      {usePromptEngine ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CollapsibleTrigger>
                  <CardDescription>
                    {t.modelslab.promptEngineDescription || "Use blueprints, filters and profiles to generate professional prompts"}
                  </CardDescription>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Profile Selector */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <Sparkles className="w-3 h-3" />
                        {t.studio?.llmProfile || "LLM Profile"}
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

                    {/* Filters */}
                    {!loadingFilters && filters && filters.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <SlidersHorizontal className="w-3 h-3" />
                          {t.studio?.filters || "Filters"}
                        </Label>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-3 pr-4">
                            {filters.map((filter) => (
                              <div key={filter.key} className="space-y-1">
                                <Label className="text-xs">{filter.label}</Label>
                                <Select
                                  value={activeFilters[filter.key] || ""}
                                  onValueChange={(value) => handleFilterChange(filter.key, value)}
                                >
                                  <SelectTrigger className="h-8" data-testid={`select-filter-${filter.key}`}>
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filter.schema.options?.map((option: string) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Subject Input */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t.studio?.subject || "Subject"}</Label>
                      <Textarea
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={t.studio?.subjectPlaceholder || "Main subject of the image..."}
                        rows={2}
                        data-testid="textarea-subject"
                      />
                    </div>

                    {/* Seed */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">{t.studio?.seed || "Seed"}</Label>
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

                    {/* Generate Prompt Button */}
                    <Button
                      onClick={() => generatePromptMutation.mutate()}
                      disabled={!canGeneratePrompt || generatePromptMutation.isPending}
                      className="w-full"
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
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Manual Prompt & Generation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {t.modelslab.prompt}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <Button
                  onClick={() => generateImageMutation.mutate()}
                  disabled={isGeneratingImage || !prompt.trim() || images.length === 0}
                  className="w-full"
                  data-testid="button-generate"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isPolling ? t.modelslab.processing : t.modelslab.generating}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t.modelslab.generate}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Output Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {t.modelslab.outputTitle}
              </CardTitle>
              <CardDescription>{t.modelslab.outputDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {result?.output && result.output.length > 0 ? (
                <div className="space-y-4">
                  {result.output.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Generated ${index + 1}`}
                        className="w-full rounded-lg border"
                        data-testid={`img-result-${index}`}
                      />
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => saveImageMutation.mutate({ imageUrl, prompt })}
                          disabled={saveImageMutation.isPending}
                          data-testid={`button-save-${index}`}
                          title={t.modelslab.saveToGallery || "Save to gallery"}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
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
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = imageUrl;
                            link.download = `modelslab-${Date.now()}.png`;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => {
                            setSelectedImageForVideo(imageUrl);
                            setShowVideoDialog(true);
                          }}
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
                      onClick={() => {
                        if (result.output && result.output.length > 0) {
                          setSelectedImageForVideo(result.output[0]);
                          setShowVideoDialog(true);
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
                          <FileText className="w-4 h-4 mr-2" />
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
                              await exportToPDF(exportData, 'promptforge-export', {
                                title: t.modelslab.exportTitle || "PromptForge Export",
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
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.modelslab.waitingResult}
                      </span>
                    ) : (
                      t.modelslab.noResult
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Result Viewer - Shows generated video in main view */}
          {videoResult?.output && videoResult.output.length > 0 && (
            <Card className="mt-6 border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    {t.modelslab.videoResult || "Generated Video"}
                  </CardTitle>
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
                <CardDescription>
                  {t.modelslab.videoResultDescription || "Your video is ready! Download or save it to your gallery."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <video 
                  src={videoResult.output[0]} 
                  controls 
                  autoPlay
                  loop
                  className="w-full rounded-lg border aspect-video bg-black"
                  data-testid="video-result-main"
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
                      <p className="font-medium">Stable Video Diffusion</p>
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
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = videoResult.output![0];
                      link.download = `video-${Date.now()}.mp4`;
                      link.click();
                    }}
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
              </CardContent>
            </Card>
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
                                <FileText className="w-4 h-4 mr-2" />
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
                                      title: t.modelslab.exportTitle || "PromptForge Export",
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
                      <video
                        src={video.videoUrl}
                        poster={video.thumbnailUrl || undefined}
                        className="w-full h-full object-cover rounded-lg border"
                        data-testid={`video-gallery-${video.id}`}
                        muted
                        loop
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
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
                                <FileText className="w-4 h-4 mr-2" />
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
      </div>

      {/* Video Generation Dialog - Only for configuration and initial status */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              {t.modelslab.videoDialogTitle || "Generate Video"}
            </DialogTitle>
            <DialogDescription>
              {t.modelslab.videoDialogDescription || "Animate your image into a realistic video using Stable Video Diffusion"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Model Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                SVD
              </Badge>
              <Badge variant="outline" className="text-xs">
                Image-to-Video
              </Badge>
            </div>

            {/* Video Options - Only show when not processing */}
            {!isPollingVideo && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.modelslab.videoAspectRatio || "Aspect Ratio"}</Label>
                  <Select value={videoAspect} onValueChange={(v) => setVideoAspect(v as typeof videoAspect)}>
                    <SelectTrigger data-testid="select-video-aspect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t.modelslab.aspectAuto || "Auto (detect from image)"}</SelectItem>
                      <SelectItem value="9:16">{t.modelslab.aspectPortrait || "9:16 Portrait"}</SelectItem>
                      <SelectItem value="16:9">{t.modelslab.aspectLandscape || "16:9 Landscape"}</SelectItem>
                      <SelectItem value="1:1">{t.modelslab.aspectSquare || "1:1 Square"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.modelslab.videoDuration || "Duration"}: {videoDuration}s</Label>
                  <Slider
                    value={[videoDuration]}
                    onValueChange={(v) => setVideoDuration(v[0])}
                    min={2}
                    max={8}
                    step={1}
                    data-testid="slider-video-duration"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>2s</span>
                    <span>8s</span>
                  </div>
                </div>

              </div>
            )}

            {/* Video Specs Info */}
            <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg space-y-1">
              <p>{t.modelslab.videoSpecs || "High-quality video generation at 16fps."}</p>
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
    </div>
  );
}
