export type VideoModelId = "seedance-1-5-pro" | "svd";
export type VideoGenerationType = "text-to-video" | "image-to-video";

export interface VideoModelConfig {
  id: VideoModelId;
  displayName: string;
  provider: "modelslab";
  endpoint: string;
  modelIdParam: string;
  supportsAudio: boolean;
  supportsAspectRatio: boolean;
  qualityTier: "standard" | "high" | "ultra";
  generationType: VideoGenerationType;
  isDefault: boolean;
  maxDurationSeconds: number;
  minDurationSeconds: number;
}

export const VIDEO_MODEL_REGISTRY: Record<VideoModelId, VideoModelConfig> = {
  "seedance-1-5-pro": {
    id: "seedance-1-5-pro",
    displayName: "Seedance 1.5 Pro",
    provider: "modelslab",
    endpoint: "/api/v7/video-fusion/text-to-video",
    modelIdParam: "seedance-1-5-pro",
    supportsAudio: true,
    supportsAspectRatio: true,
    qualityTier: "ultra",
    generationType: "text-to-video",
    isDefault: false,
    maxDurationSeconds: 8,
    minDurationSeconds: 2,
  },
  "svd": {
    id: "svd",
    displayName: "Stable Video Diffusion",
    provider: "modelslab",
    endpoint: "/api/v7/video-fusion/image-to-video",
    modelIdParam: "svd",
    supportsAudio: false,
    supportsAspectRatio: false,
    qualityTier: "high",
    generationType: "image-to-video",
    isDefault: true,
    maxDurationSeconds: 8,
    minDurationSeconds: 2,
  },
};

export function getDefaultVideoModel(): VideoModelConfig {
  const defaultModel = Object.values(VIDEO_MODEL_REGISTRY).find(m => m.isDefault);
  if (!defaultModel) {
    throw new Error("No default video model configured");
  }
  return defaultModel;
}

export function getVideoModel(modelId: string): VideoModelConfig {
  const model = VIDEO_MODEL_REGISTRY[modelId as VideoModelId];
  if (!model) {
    throw new Error(`Unknown video model: ${modelId}. Valid models: ${Object.keys(VIDEO_MODEL_REGISTRY).join(", ")}`);
  }
  return model;
}

export function isValidVideoModel(modelId: string): modelId is VideoModelId {
  return modelId in VIDEO_MODEL_REGISTRY;
}
