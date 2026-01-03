import { useState, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
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
import type { LoraModel, LoraVersion, LoraDataset } from "@shared/schema";
import {
  Cpu, Plus, Upload, Play, Layers, Settings, Zap, Lock, ChevronRight,
  Image, X, CheckCircle, AlertCircle, FileImage
} from "lucide-react";

interface LoraModelWithDetails extends LoraModel {
  datasets?: LoraDataset[];
  versions?: LoraVersion[];
}

interface ActiveLoraResponse {
  loraVersionId: string;
  loraModelId: string;
  weight: number;
  targetPlatform?: string;
  version?: LoraVersion;
  model?: LoraModel;
}

interface UploadUrlInfo {
  filename: string;
  uploadUrl: string;
  storageKey: string;
}

interface FileWithPreview {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  sha256?: string;
  width?: number;
  height?: number;
  storageKey?: string;
}

const TARGET_PLATFORMS = [
  { id: "sora_2_pro_max", name: "Sora 2 Pro Max", supportsLora: false },
  { id: "sora_2_pro", name: "Sora 2 Pro", supportsLora: false },
  { id: "sora_2", name: "Sora 2", supportsLora: false },
  { id: "veo_3.1", name: "Veo 3.1", supportsLora: false },
  { id: "veo_3.1_fast", name: "Veo 3.1 Fast", supportsLora: false },
  { id: "grok_3", name: "Grok 3", supportsLora: false },
  { id: "flux_dev", name: "Flux Dev", supportsLora: true },
  { id: "flux_schnell", name: "Flux Schnell", supportsLora: true },
  { id: "sdxl_1.0", name: "SDXL 1.0", supportsLora: true },
];

const TRAINABLE_BASE_MODELS = [
  { id: "flux_dev", name: "Flux Dev", format: "safetensors" },
  { id: "flux_schnell", name: "Flux Schnell", format: "safetensors" },
  { id: "sdxl_1.0", name: "SDXL 1.0", format: "safetensors" },
  { id: "sd_1.5", name: "Stable Diffusion 1.5", format: "safetensors" },
];

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function LoraStudioPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelDesc, setNewModelDesc] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  const [targetPlatform, setTargetPlatform] = useState("");
  const [trainableBaseModel, setTrainableBaseModel] = useState("");
  const [trainingSteps, setTrainingSteps] = useState(1000);
  const [learningRate, setLearningRate] = useState(0.0001);
  const [resolution, setResolution] = useState(1024);
  const [rank, setRank] = useState(32);
  const [activationWeight, setActivationWeight] = useState([0.8]);

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentDatasetId, setCurrentDatasetId] = useState<string | null>(null);

  const { data: models, isLoading: loadingModels } = useQuery<LoraModel[]>({
    queryKey: ["/api/lora/models"],
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

  const validateDatasetMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const res = await apiRequest("POST", "/api/lora/dataset/validate", { datasetId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.loraStudio.validated });
      queryClient.invalidateQueries({ queryKey: ["/api/lora/models", selectedModel] });
    },
    onError: (error: Error) => {
      toast({ title: "Validation failed", description: error.message, variant: "destructive" });
    },
  });

  const startTrainingMutation = useMutation({
    mutationFn: async (datasetId: string) => {
      const res = await apiRequest("POST", "/api/lora/jobs", {
        loraModelId: selectedModel,
        datasetId,
        baseModel: trainableBaseModel,
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
        targetPlatform: targetPlatform || undefined,
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

  const handleFilesDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith("image/")
    );
    addFiles(droppedFiles);
  }, []);

  const handleFilesSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        f => f.type.startsWith("image/")
      );
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const fileObjects: FileWithPreview[] = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...fileObjects]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadDataset = async () => {
    if (!selectedModel || files.length < 15) {
      toast({
        title: "Invalid dataset",
        description: "Minimum 15 images required",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const initRes = await apiRequest("POST", "/api/lora/dataset/init", {
        loraModelId: selectedModel,
        imageCount: files.length,
        filenames: files.map(f => f.file.name),
      });
      const initData = await initRes.json() as { datasetId: string; uploadUrls: UploadUrlInfo[] };
      setCurrentDatasetId(initData.datasetId);

      const updatedFiles = [...files];
      const totalFiles = files.length;
      let completedFiles = 0;

      for (let i = 0; i < files.length; i++) {
        const fileObj = updatedFiles[i];
        const uploadInfo = initData.uploadUrls[i];

        if (!uploadInfo) continue;

        updatedFiles[i] = { ...fileObj, status: "uploading" };
        setFiles([...updatedFiles]);

        try {
          const [sha256, dimensions] = await Promise.all([
            computeSha256(fileObj.file),
            getImageDimensions(fileObj.file),
          ]);

          await fetch(uploadInfo.uploadUrl, {
            method: "PUT",
            body: fileObj.file,
            headers: { "Content-Type": fileObj.file.type },
          });

          updatedFiles[i] = {
            ...fileObj,
            status: "done",
            progress: 100,
            sha256,
            width: dimensions.width,
            height: dimensions.height,
            storageKey: uploadInfo.storageKey,
          };
        } catch {
          updatedFiles[i] = { ...fileObj, status: "error", progress: 0 };
        }

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
        setFiles([...updatedFiles]);
      }

      const successfulUploads = updatedFiles.filter(f => f.status === "done" && f.sha256 && f.storageKey);

      if (successfulUploads.length >= 15) {
        await apiRequest("POST", "/api/lora/dataset/commit", {
          datasetId: initData.datasetId,
          items: successfulUploads.map(f => ({
            storageKey: f.storageKey!,
            sha256: f.sha256!,
            width: f.width!,
            height: f.height!,
            filename: f.file.name,
          })),
        });

        toast({ title: "Dataset uploaded successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/lora/models", selectedModel] });
        setFiles([]);
        setCurrentDatasetId(null);
      } else {
        toast({
          title: "Upload incomplete",
          description: `Only ${successfulUploads.length} of ${files.length} files uploaded successfully. Minimum 15 required.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      uploaded: "outline",
      validated: "default",
      invalid: "destructive",
      processing: "outline",
      completed: "default",
      failed: "destructive",
    };
    const statusText: Record<string, string> = {
      pending: t.loraStudio.pending,
      uploaded: "Uploaded",
      validated: t.loraStudio.validated,
      invalid: t.loraStudio.invalid,
      processing: t.loraStudio.training,
      completed: t.loraStudio.completed,
      failed: t.loraStudio.failed,
    };
    return <Badge variant={variants[status] || "secondary"}>{statusText[status] || status}</Badge>;
  };

  const isPro = true;
  const canTrain = trainableBaseModel && files.length === 0;
  const selectedPlatformSupportsLora = TARGET_PLATFORMS.find(p => p.id === targetPlatform)?.supportsLora;

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
                    {activeLora.targetPlatform && ` | Platform: ${activeLora.targetPlatform}`}
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
                          className={`w-full text-left p-3 rounded-md mb-1 transition-colors hover-elevate ${selectedModel === model.id ? "bg-accent" : ""
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

                <div className="grid sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">{t.loraStudio.targetPlatform}</CardTitle>
                      <CardDescription className="text-xs">
                        {t.loraStudio.targetPlatformDesc}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select value={targetPlatform} onValueChange={setTargetPlatform}>
                        <SelectTrigger data-testid="select-target-platform">
                          <SelectValue placeholder="Select platform..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_PLATFORMS.map((platform) => (
                            <SelectItem key={platform.id} value={platform.id}>
                              <div className="flex items-center gap-2">
                                {platform.name}
                                {platform.supportsLora && (
                                  <Badge variant="secondary" className="text-xs">LoRA</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {targetPlatform && !selectedPlatformSupportsLora && (
                        <p className="text-xs text-muted-foreground mt-2">
                          This platform uses Character Pack export instead of LoRA injection
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">{t.loraStudio.trainableBaseModel}</CardTitle>
                      <CardDescription className="text-xs">
                        {t.loraStudio.trainableBaseModelDesc}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select value={trainableBaseModel} onValueChange={setTrainableBaseModel}>
                        <SelectTrigger data-testid="select-trainable-model">
                          <SelectValue placeholder="Select base model..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAINABLE_BASE_MODELS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      {t.loraStudio.uploadDataset}
                    </CardTitle>
                    <CardDescription>
                      Upload 15-50 images of your subject from different angles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFilesDrop}
                      className="border-2 border-dashed border-border rounded-md p-8 text-center mb-4 transition-colors hover:border-primary/50"
                    >
                      <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop images here, or click to select
                      </p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFilesSelect}
                        className="hidden"
                        id="file-upload"
                        data-testid="input-file-upload"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Select Images
                        </label>
                      </Button>
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {files.length} image{files.length !== 1 ? 's' : ''} selected
                            {files.length < 15 && (
                              <span className="text-destructive ml-2">
                                (minimum 15 required)
                              </span>
                            )}
                          </p>
                          <Button
                            onClick={uploadDataset}
                            disabled={isUploading || files.length < 15}
                            data-testid="button-upload-dataset"
                          >
                            {isUploading ? `Uploading ${uploadProgress}%` : "Upload Dataset"}
                          </Button>
                        </div>

                        {isUploading && (
                          <Progress value={uploadProgress} className="h-2" />
                        )}

                        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2">
                          {files.map((fileObj, index) => (
                            <div key={index} className="relative group aspect-square">
                              <img
                                src={fileObj.preview}
                                alt={fileObj.file.name}
                                className="w-full h-full object-cover rounded-md"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                                <button
                                  onClick={() => removeFile(index)}
                                  className="p-1 bg-white/20 rounded-full"
                                  disabled={isUploading}
                                >
                                  <X className="w-4 h-4 text-white" />
                                </button>
                              </div>
                              {fileObj.status === "done" && (
                                <div className="absolute top-1 right-1">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                </div>
                              )}
                              {fileObj.status === "error" && (
                                <div className="absolute top-1 right-1">
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {modelDetails.datasets && modelDetails.datasets.length > 0 && (
                      <div className="mt-6 pt-6 border-t">
                        <h4 className="text-sm font-medium mb-3">Existing Datasets</h4>
                        <div className="space-y-3">
                          {modelDetails.datasets.map((dataset) => (
                            <div
                              key={dataset.id}
                              className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <FileImage className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  {getStatusBadge(dataset.status)}
                                  <span className="text-sm ml-2">
                                    {dataset.imageCount} {t.loraStudio.imageCount}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {dataset.status === "uploaded" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => validateDatasetMutation.mutate(dataset.id)}
                                    disabled={validateDatasetMutation.isPending}
                                    data-testid={`button-validate-dataset-${dataset.id}`}
                                  >
                                    Validate
                                  </Button>
                                )}
                                {dataset.status === "validated" && (
                                  <Button
                                    size="sm"
                                    onClick={() => startTrainingMutation.mutate(dataset.id)}
                                    disabled={!trainableBaseModel || startTrainingMutation.isPending}
                                    data-testid={`button-train-dataset-${dataset.id}`}
                                  >
                                    <Play className="w-4 h-4 mr-1" />
                                    {t.loraStudio.startTraining}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
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
                      <div className="space-y-2">
                        <Label>Learning Rate: {learningRate}</Label>
                        <Slider
                          value={[learningRate * 10000]}
                          onValueChange={(v) => setLearningRate(v[0] / 10000)}
                          min={1}
                          max={100}
                          step={1}
                          data-testid="slider-learning-rate"
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
                              {version.artifactUrl ? (
                                <Badge variant="default" className="bg-green-600">{t.loraStudio.completed}</Badge>
                              ) : (
                                <Badge variant="outline" className="animate-pulse">{t.loraStudio.training}</Badge>
                              )}
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
