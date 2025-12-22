import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, ImagePlus, Sparkles, X, Download, ExternalLink } from "lucide-react";

interface ModelsLabResponse {
  status: string;
  generationTime?: number;
  id?: number;
  output?: string[];
  fetch_result?: string;
  eta?: number;
  message?: string;
}

export default function ModelsLabStudioPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [prompt, setPrompt] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [result, setResult] = useState<ModelsLabResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const validImages = imageUrls.filter(url => url.trim() !== "");
      if (validImages.length === 0) {
        throw new Error(t.modelslab.noImages);
      }
      
      const res = await apiRequest("POST", "/api/modelslab/generate", {
        prompt,
        images: validImages,
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
    const maxAttempts = 60; // 5 minutes max
    
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
          // Timeout reached
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

  const addImageField = () => {
    if (imageUrls.length < 14) {
      setImageUrls([...imageUrls, ""]);
    }
  };

  const removeImageField = (index: number) => {
    if (imageUrls.length > 1) {
      setImageUrls(imageUrls.filter((_, i) => i !== index));
    }
  };

  const updateImageUrl = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
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
              {/* Image URLs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t.modelslab.imageUrls}</Label>
                  <Badge variant="secondary" className="text-xs">
                    {imageUrls.filter(u => u.trim()).length}/14
                  </Badge>
                </div>
                
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateImageUrl(index, e.target.value)}
                      placeholder={`${t.modelslab.imagePlaceholder} ${index + 1}`}
                      data-testid={`input-image-url-${index}`}
                    />
                    {imageUrls.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeImageField(index)}
                        data-testid={`button-remove-image-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {imageUrls.length < 14 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addImageField}
                    className="w-full"
                    data-testid="button-add-image"
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    {t.modelslab.addImage}
                  </Button>
                )}
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
                disabled={isGenerating || !prompt.trim()}
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
