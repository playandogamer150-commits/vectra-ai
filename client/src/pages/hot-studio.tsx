import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { Filter } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { 
  Loader2, Sparkles, Download, Flame, AlertTriangle, RefreshCw, Upload, X, ImagePlus
} from "lucide-react";

interface UploadedImage {
  id: string;
  dataUrl: string;
  name: string;
}

interface ModelsLabResponse {
  status: string;
  generationTime?: number;
  id?: number;
  output?: string[];
  fetch_result?: string;
  eta?: number;
  message?: string;
}

type FilterValue = Record<string, string>;

export default function HotStudioPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [activeFilters, setActiveFilters] = useState<FilterValue>({});
  const [result, setResult] = useState<ModelsLabResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setReferenceImages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), dataUrl, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeImage = (id: string) => {
    setReferenceImages((prev) => prev.filter((img) => img.id !== id));
  };

  const { data: filters, isLoading: loadingFilters } = useQuery<Filter[]>({
    queryKey: ["/api/filters-nsfw"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const filterEffects = Object.entries(activeFilters)
        .map(([key, value]) => {
          const filter = filters?.find(f => f.key === key);
          if (filter && filter.effect) {
            const effectMap = filter.effect as Record<string, string>;
            return effectMap[value] || "";
          }
          return "";
        })
        .filter(Boolean)
        .join(", ");

      const fullPrompt = `ultra realistic photograph, 8k uhd, hyperrealistic, professional photography, ${filterEffects}${prompt ? `, ${prompt}` : ""}, extremely detailed skin texture, natural lighting, photorealistic, lifelike, raw photo`;

      return apiRequest("POST", "/api/modelslab/generate-nsfw", {
        prompt: fullPrompt,
        aspectRatio,
        images: referenceImages.map((img) => img.dataUrl),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setResult(data);
      
      if (data.status === "success" && data.output) {
        setGeneratedImages(prev => [...data.output, ...prev]);
        toast({ title: t.hotStudio?.success || "Image generated!" });
      } else if (data.status === "processing" || data.status === "queued") {
        if (data.fetch_result) {
          pollForResult(data.fetch_result);
        } else if (data.id) {
          pollForResult(`https://modelslab.com/api/v4/dreambooth/fetch/${data.id}`);
        } else {
          toast({ 
            title: t.hotStudio?.error || "Generation failed", 
            description: "No polling URL returned",
            variant: "destructive" 
          });
        }
      } else if (data.status === "error") {
        toast({ 
          title: t.hotStudio?.error || "Generation failed", 
          description: data.message || "Unknown error",
          variant: "destructive" 
        });
      }
    },
    onError: () => {
      toast({ 
        title: t.hotStudio?.error || "Generation failed", 
        variant: "destructive" 
      });
    },
  });

  const pollForResult = useCallback(async (fetchUrl: string) => {
    setIsPolling(true);
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsPolling(false);
        toast({ title: "Timeout", variant: "destructive" });
        return;
      }

      try {
        const response = await apiRequest("POST", "/api/modelslab/status", { fetchUrl });
        const data = await response.json();

        if (data.status === "success" && data.output) {
          setGeneratedImages(prev => [...data.output, ...prev]);
          setIsPolling(false);
          toast({ title: t.hotStudio?.success || "Image generated!" });
        } else if (data.status === "processing") {
          attempts++;
          setTimeout(poll, 3000);
        } else if (data.status === "error") {
          setIsPolling(false);
          toast({ title: data.message || "Error", variant: "destructive" });
        }
      } catch {
        setIsPolling(false);
        toast({ title: "Connection error", variant: "destructive" });
      }
    };

    poll();
  }, [toast, t]);

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters(prev => {
      if (prev[key] === value) {
        const newFilters = { ...prev };
        delete newFilters[key];
        return newFilters;
      }
      return { ...prev, [key]: value };
    });
  };

  const downloadImage = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `hot-studio-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const aspectRatios = [
    { value: "1:1", label: "1:1" },
    { value: "9:16", label: "9:16" },
    { value: "16:9", label: "16:9" },
    { value: "4:3", label: "4:3" },
    { value: "3:4", label: "3:4" },
  ];

  const isGenerating = generateMutation.isPending || isPolling;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Flame className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold" data-testid="text-hot-studio-title">
              {t.hotStudio?.title || "HOT Studio"}
            </h1>
            <Badge variant="destructive" className="text-xs">
              +18
            </Badge>
          </div>
          <p className="text-muted-foreground" data-testid="text-hot-studio-subtitle">
            {t.hotStudio?.subtitle || "Ultra-realistic NSFW image generation"}
          </p>
          <div className="flex items-center gap-2 mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">
              {t.hotStudio?.warning || "Adult content only. You must be 18+ to use this feature."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImagePlus className="w-4 h-4" />
                  {t.hotStudio?.referenceImage || "Reference Image"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.hotStudio?.referenceImageDesc || "Upload a photo of the character to use as reference"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  data-testid="input-file-upload"
                />
                
                {referenceImages.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? "border-red-500 bg-red-500/10"
                        : "border-muted-foreground/25 hover:border-red-500/50"
                    }`}
                    data-testid="dropzone-reference"
                  >
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {t.hotStudio?.uploadHint || "Click or drag to upload reference photo"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {referenceImages.map((img) => (
                        <div key={img.id} className="relative group aspect-square rounded-md overflow-hidden">
                          <img
                            src={img.dataUrl}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-image-${img.id}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      data-testid="button-add-more-images"
                    >
                      <ImagePlus className="w-3 h-3 mr-1" />
                      {t.hotStudio?.addMore || "Add more"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t.hotStudio?.filters || "Filters"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.hotStudio?.filtersDesc || "Select options to build your prompt"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingFilters ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filters && filters.length > 0 ? (
                  <div className="space-y-4">
                    {filters.map((filter) => (
                      <div key={filter.key} className="space-y-1.5">
                        <span className="text-xs text-muted-foreground font-medium">
                          {filter.label}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {filter.schema.options?.map((option: string) => {
                            const isSelected = activeFilters[filter.key] === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleFilterChange(filter.key, option)}
                                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                                  isSelected
                                    ? "bg-red-500 text-white border-red-500"
                                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                                }`}
                                data-testid={`filter-chip-${filter.key}-${option}`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t.hotStudio?.noFilters || "No filters available"}
                  </p>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs">{t.hotStudio?.aspectRatio || "Aspect Ratio"}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.value}
                        type="button"
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          aspectRatio === ratio.value
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                        }`}
                        data-testid={`aspect-ratio-${ratio.value}`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs">{t.hotStudio?.additionalPrompt || "Additional Details"}</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t.hotStudio?.promptPlaceholder || "Add specific details..."}
                    rows={3}
                    className="text-sm"
                    data-testid="textarea-prompt"
                  />
                </div>

                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={isGenerating || (Object.keys(activeFilters).length === 0 && referenceImages.length === 0)}
                  className="w-full bg-red-500 hover:bg-red-600"
                  data-testid="button-generate"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.hotStudio?.generating || "Generating..."}
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4 mr-2" />
                      {t.hotStudio?.generate || "Generate"}
                    </>
                  )}
                </Button>

                {Object.keys(activeFilters).length === 0 && referenceImages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {t.hotStudio?.selectFiltersHint || "Upload a reference image or select filters to generate"}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    {t.hotStudio?.gallery || "Generated Images"}
                  </CardTitle>
                  {generatedImages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGeneratedImages([])}
                      data-testid="button-clear-gallery"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {t.hotStudio?.clear || "Clear"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {generatedImages.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative group aspect-[3/4] rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={url}
                          alt={`Generated ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={() => downloadImage(url)}
                            data-testid={`button-download-${index}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Flame className="w-12 h-12 mb-4 opacity-30" />
                    <p className="text-sm">
                      {t.hotStudio?.noImages || "No images generated yet"}
                    </p>
                    <p className="text-xs mt-1">
                      {t.hotStudio?.selectFiltersStart || "Select filters and click Generate"}
                    </p>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-red-500" />
                      <p className="text-sm text-muted-foreground">
                        {t.hotStudio?.generatingImage || "Generating ultra-realistic image..."}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
