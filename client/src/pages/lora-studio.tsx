import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LoraModel, LoraVersion, BaseModel } from "@shared/schema";
import { 
  Cpu, Plus, Upload, Play, Layers, Settings, Zap, Lock, ChevronRight, Image
} from "lucide-react";

interface LoraModelWithDetails extends LoraModel {
  datasets?: Array<{
    id: string;
    status: string;
    imageCount: number;
    qualityReport?: { score: number; valid: boolean; issues: string[] };
  }>;
  versions?: LoraVersion[];
}

interface ActiveLoraResponse {
  loraVersionId: string;
  weight: number;
  version?: LoraVersion;
  model?: LoraModel;
}

export default function LoraStudioPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelDesc, setNewModelDesc] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  
  const [trainingSteps, setTrainingSteps] = useState(1000);
  const [learningRate, setLearningRate] = useState(0.0001);
  const [resolution, setResolution] = useState(1024);
  const [rank, setRank] = useState(32);
  const [selectedBaseModel, setSelectedBaseModel] = useState("");
  const [activationWeight, setActivationWeight] = useState([0.8]);

  const { data: models, isLoading: loadingModels } = useQuery<LoraModel[]>({
    queryKey: ["/api/lora/models"],
  });

  const { data: baseModels } = useQuery<BaseModel[]>({
    queryKey: ["/api/lora/base-models"],
  });

  const { data: activeLora } = useQuery<ActiveLoraResponse | null>({
    queryKey: ["/api/lora/active"],
  });

  const { data: modelDetails, isLoading: loadingDetails } = useQuery<LoraModelWithDetails>({
    queryKey: ["/api/lora/models", selectedModel],
    enabled: !!selectedModel,
  });

  const createModelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lora/models", {
        name: newModelName,
        description: newModelDesc || undefined,
        consent: consentGiven,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.loraStudio.modelCreated });
      queryClient.invalidateQueries({ queryKey: ["/api/lora/models"] });
      setShowCreateDialog(false);
      setNewModelName("");
      setNewModelDesc("");
      setConsentGiven(false);
    },
    onError: (error: Error) => {
      toast({ title: t.loraStudio.errorCreating, description: error.message, variant: "destructive" });
    },
  });

  const startTrainingMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const res = await apiRequest("POST", "/api/lora/jobs", {
        loraModelId: selectedModel,
        datasetId,
        baseModel: selectedBaseModel,
        params: {
          steps: trainingSteps,
          learningRate,
          resolution,
          rank,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.loraStudio.trainingStarted });
      queryClient.invalidateQueries({ queryKey: ["/api/lora/models", selectedModel] });
    },
    onError: (error: Error) => {
      toast({ title: t.loraStudio.errorTraining, description: error.message, variant: "destructive" });
    },
  });

  const activateLoraMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const res = await apiRequest("POST", "/api/lora/activate", {
        loraVersionId: versionId,
        weight: activationWeight[0],
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.loraStudio.loraActivated });
      queryClient.invalidateQueries({ queryKey: ["/api/lora/active"] });
    },
  });

  const deactivateLoraMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/lora/active", {});
    },
    onSuccess: () => {
      toast({ title: t.loraStudio.loraDeactivated });
      queryClient.invalidateQueries({ queryKey: ["/api/lora/active"] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      validated: "default",
      invalid: "destructive",
      processing: "outline",
      completed: "default",
      failed: "destructive",
    };
    const statusText: Record<string, string> = {
      pending: t.loraStudio.pending,
      validated: t.loraStudio.validated,
      invalid: t.loraStudio.invalid,
      processing: t.loraStudio.training,
      completed: t.loraStudio.completed,
      failed: t.loraStudio.failed,
    };
    return <Badge variant={variants[status] || "secondary"}>{statusText[status] || status}</Badge>;
  };

  const isPro = true;

  if (!isPro) {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-6 flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-pro-required">{t.loraStudio.proRequired}</h1>
          <p className="text-muted-foreground mb-6">{t.loraStudio.proRequiredDesc}</p>
          <Button data-testid="button-upgrade-pro">{t.loraStudio.upgradePro}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2" data-testid="text-lora-title">{t.loraStudio.title}</h1>
            <p className="text-muted-foreground">{t.loraStudio.subtitle}</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-model">
            <Plus className="w-4 h-4 mr-2" />
            {t.loraStudio.createModel}
          </Button>
        </div>

        {activeLora && (
          <Card className="mb-8 border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {t.loraStudio.activeLora}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{activeLora.model?.name || "LoRA Model"}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.loraStudio.weight}: {activeLora.weight}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => deactivateLoraMutation.mutate()}
                  data-testid="button-deactivate-lora"
                >
                  {t.loraStudio.deactivate}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <aside>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {t.loraStudio.myModels}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingModels ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : models && models.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="p-2">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={`w-full text-left p-3 rounded-md mb-1 transition-colors hover-elevate ${
                            selectedModel === model.id ? "bg-accent" : ""
                          }`}
                          data-testid={`button-select-model-${model.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{model.name}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          {model.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {model.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t.loraStudio.noModels}</p>
                    <p className="text-xs mt-1">{t.loraStudio.noModelsDesc}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          <main>
            {selectedModel && modelDetails ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{modelDetails.name}</CardTitle>
                    {modelDetails.description && (
                      <CardDescription>{modelDetails.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      {t.loraStudio.datasets}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {modelDetails.datasets && modelDetails.datasets.length > 0 ? (
                      <div className="space-y-3">
                        {modelDetails.datasets.map((dataset) => (
                          <div 
                            key={dataset.id} 
                            className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                          >
                            <div className="flex items-center gap-4">
                              {getStatusBadge(dataset.status)}
                              <span className="text-sm">
                                {dataset.imageCount} {t.loraStudio.imageCount}
                              </span>
                              {dataset.qualityReport && (
                                <span className="text-sm text-muted-foreground">
                                  {t.loraStudio.qualityScore}: {dataset.qualityReport.score}
                                </span>
                              )}
                            </div>
                            {dataset.status === "validated" && (
                              <Button 
                                size="sm" 
                                onClick={() => startTrainingMutation.mutate(dataset.id)}
                                disabled={!selectedBaseModel || startTrainingMutation.isPending}
                                data-testid={`button-train-dataset-${dataset.id}`}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                {t.loraStudio.startTraining}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t.loraStudio.uploadDataset}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {t.loraStudio.trainingParams}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t.loraStudio.baseModel}</Label>
                        <Select value={selectedBaseModel} onValueChange={setSelectedBaseModel}>
                          <SelectTrigger data-testid="select-base-model">
                            <SelectValue placeholder={t.loraStudio.selectBaseModel} />
                          </SelectTrigger>
                          <SelectContent>
                            {baseModels?.map((model) => (
                              <SelectItem key={model.id} value={model.name}>
                                {model.displayName}
                              </SelectItem>
                            ))}
                            <SelectItem value="sdxl_1.0">Stable Diffusion XL</SelectItem>
                            <SelectItem value="flux_pro">Flux Pro</SelectItem>
                            <SelectItem value="sd_1.5">Stable Diffusion 1.5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t.loraStudio.steps}: {trainingSteps}</Label>
                        <Slider
                          value={[trainingSteps]}
                          onValueChange={(v) => setTrainingSteps(v[0])}
                          min={500}
                          max={3000}
                          step={100}
                          data-testid="slider-steps"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.loraStudio.resolution}: {resolution}</Label>
                        <Select value={String(resolution)} onValueChange={(v) => setResolution(Number(v))}>
                          <SelectTrigger data-testid="select-resolution">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="512">512px</SelectItem>
                            <SelectItem value="768">768px</SelectItem>
                            <SelectItem value="1024">1024px</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t.loraStudio.rank}: {rank}</Label>
                        <Slider
                          value={[rank]}
                          onValueChange={(v) => setRank(v[0])}
                          min={4}
                          max={128}
                          step={4}
                          data-testid="slider-rank"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      {t.loraStudio.versions}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {modelDetails.versions && modelDetails.versions.length > 0 ? (
                      <div className="space-y-3">
                        {modelDetails.versions.map((version) => (
                          <div 
                            key={version.id} 
                            className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary">{version.baseModel}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {(version.params as { steps?: number })?.steps || 0} steps
                              </span>
                            </div>
                            {version.artifactUrl && (
                              <div className="flex items-center gap-2">
                                <div className="w-32">
                                  <Slider
                                    value={activationWeight}
                                    onValueChange={setActivationWeight}
                                    min={0}
                                    max={1.5}
                                    step={0.1}
                                    data-testid={`slider-weight-${version.id}`}
                                  />
                                </div>
                                <Button 
                                  size="sm"
                                  onClick={() => activateLoraMutation.mutate(version.id)}
                                  disabled={activateLoraMutation.isPending}
                                  data-testid={`button-activate-${version.id}`}
                                >
                                  <Zap className="w-4 h-4 mr-1" />
                                  {t.loraStudio.activate}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t.loraStudio.noVersions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground p-8">
                  <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t.loraStudio.noModels}</p>
                  <p className="text-sm mt-2">{t.loraStudio.noModelsDesc}</p>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.loraStudio.createModel}</DialogTitle>
            <DialogDescription>{t.loraStudio.subtitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">{t.loraStudio.modelName}</Label>
              <Input
                id="model-name"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder={t.loraStudio.modelNamePlaceholder}
                data-testid="input-model-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-desc">{t.loraStudio.description}</Label>
              <Textarea
                id="model-desc"
                value={newModelDesc}
                onChange={(e) => setNewModelDesc(e.target.value)}
                placeholder={t.loraStudio.descriptionPlaceholder}
                data-testid="input-model-desc"
              />
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(checked === true)}
                data-testid="checkbox-consent"
              />
              <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                {t.loraStudio.consent}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => createModelMutation.mutate()}
              disabled={!newModelName || !consentGiven || createModelMutation.isPending}
              data-testid="button-submit-create"
            >
              {createModelMutation.isPending ? t.loraStudio.creating : t.loraStudio.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
