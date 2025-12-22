import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ImagePlus, Sparkles, X, Download, ExternalLink, Upload, Clipboard } from "lucide-react";

interface ModelsLabResponse {
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

export default function ModelsLabStudioPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [result, setResult] = useState<ModelsLabResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const processFile = useCallback(async (file: File): Promise<UploadedImage | null> => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.modelslab.error,
        description: t.modelslab.invalidFileType || "Invalid file type. Only images allowed.",
        variant: "destructive",
      });
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t.modelslab.error,
        description: t.modelslab.fileTooLarge || "File too large. Max 10MB.",
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
        title: t.modelslab.warning || "Warning",
        description: t.modelslab.maxImagesReached || `Only ${remainingSlots} more images can be added.`,
      });
    }

    const newImages: UploadedImage[] = [];
    for (const file of filesToProcess) {
      const processed = await processFile(file);
      if (processed) {
        newImages.push(processed);
      }
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
        if (file) {
          imageFiles.push(file);
        }
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

  const generateMutation = useMutation({
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
            description: t.modelslab.timeout || "Generation timed out. Please try again.",
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

  const aspectRatios = [
    "1:1", "9:16", "2:3", "3:4", "4:5", "5:4", "4:3", "3:2", "16:9", "21:9"
  ];

  const isGenerating = generateMutation.isPending || isPolling;

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="w-5 h-5" />
                {t.modelslab.inputTitle}
              </CardTitle>
              <CardDescription>{t.modelslab.inputDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Upload Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t.modelslab.referenceImages || "Reference Images"}</Label>
                  <Badge variant="secondary" className="text-xs">
                    {images.length}/14
                  </Badge>
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                
                {/* Drop zone / Upload area */}
                <div
                  ref={dropZoneRef}
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
                      <p className="text-sm font-medium">
                        {t.modelslab.dropOrClick || "Drop images here or click to upload"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clipboard className="w-3 h-3" />
                        {t.modelslab.pasteHint || "You can also paste images (Ctrl+V)"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Image thumbnails grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {images.map((img) => (
                          <div
                            key={img.id}
                            className="relative group aspect-square rounded-md overflow-hidden border bg-muted"
                            data-testid={`thumbnail-${img.id}`}
                          >
                            <img
                              src={img.dataUrl}
                              alt={img.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(img.id);
                              }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`button-remove-${img.id}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        
                        {/* Add more button in grid */}
                        {images.length < 14 && (
                          <div
                            className="aspect-square rounded-md border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-primary/50 transition-colors"
                          >
                            <ImagePlus className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                        <Clipboard className="w-3 h-3" />
                        {t.modelslab.pasteHint || "Paste images with Ctrl+V"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label>{t.modelslab.prompt}</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.modelslab.promptPlaceholder}
                  rows={4}
                  data-testid="textarea-prompt"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>{t.modelslab.aspectRatio}</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger data-testid="select-aspect-ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aspectRatios.map((ratio) => (
                      <SelectItem key={ratio} value={ratio}>
                        {ratio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={isGenerating || !prompt.trim() || images.length === 0}
                className="w-full"
                data-testid="button-generate"
              >
                {isGenerating ? (
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
                          onClick={() => window.open(imageUrl, "_blank")}
                          data-testid={`button-open-image-${index}`}
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
                          data-testid={`button-download-image-${index}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {result.generationTime && (
                    <p className="text-sm text-muted-foreground text-center">
                      {t.modelslab.generatedIn} {result.generationTime.toFixed(2)}s
                    </p>
                  )}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center border border-dashed rounded-lg">
                  <p className="text-muted-foreground text-center">
                    {isGenerating ? (
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
      </div>
    </div>
  );
}
