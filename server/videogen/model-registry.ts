export type VideoModelId = "veo-3.1" | "seedance-1-5-pro";
export type VideoGenerationType = "text-to-video" | "image-to-video";
export type VideoAspectRatio = "16:9" | "9:16";

export interface VideoModelConfig {
  id: VideoModelId;
  displayName: string;
  provider: "modelslab";
  endpoint: string;
  modelIdParam: string;
  supportedAspectRatio: VideoAspectRatio;
  qualityTier: "standard" | "high" | "ultra";
  generationType: VideoGenerationType;
  maxDurationSeconds: number;
  minDurationSeconds: number;
}

export const VIDEO_MODEL_REGISTRY: Record<VideoModelId, VideoModelConfig> = {
  "veo-3.1": {
    id: "veo-3.1",
    displayName: "Google Veo 3.1",
    provider: "modelslab",
    endpoint: "/api/v7/video-fusion/image-to-video",
    modelIdParam: "veo-3.1",
    supportedAspectRatio: "16:9",
    qualityTier: "ultra",
    generationType: "image-to-video",
    maxDurationSeconds: 8,
    minDurationSeconds: 2,
  },
  "seedance-1-5-pro": {
    id: "seedance-1-5-pro",
    displayName: "Seedance 1.5 Pro",
    provider: "modelslab",
    endpoint: "/api/v7/video-fusion/image-to-video",
    modelIdParam: "seedance-1-5-pro",
    supportedAspectRatio: "9:16",
    qualityTier: "ultra",
    generationType: "image-to-video",
    maxDurationSeconds: 25,
    minDurationSeconds: 5,
  },
};

export function getModelForAspectRatio(aspectRatio: VideoAspectRatio): VideoModelConfig {
  if (aspectRatio === "9:16") {
    return VIDEO_MODEL_REGISTRY["seedance-1-5-pro"];
  }
  return VIDEO_MODEL_REGISTRY["veo-3.1"];
}

export function getDefaultVideoModel(): VideoModelConfig {
  return VIDEO_MODEL_REGISTRY["veo-3.1"];
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

