export type AspectRatio = "9:16" | "16:9" | "1:1" | "auto";
export type VideoJobStatus = "queued" | "processing" | "success" | "error";
export type TransformStrategy = "letterbox" | "crop" | "none";

export interface CreateVideoJobInput {
  userId: string;
  sourceImageUrl?: string;
  prompt?: string;
  negativePrompt?: string;
  targetAspect: AspectRatio;
  durationSeconds: number;
  seed?: number;
  modelId?: string;
  generateAudio?: boolean;
  generationType?: "text-to-video" | "image-to-video";
  apiKey?: string;
}

export interface CreateJobResult {
  success: boolean;
  jobId?: string;
  providerJobId?: string;
  status: VideoJobStatus;
  eta?: number;
  error?: string;
}

export interface JobStatusResult {
  status: VideoJobStatus;
  outputs: string[];
  eta?: number;
  progress?: number;
  error?: string;
  rawMeta?: Record<string, unknown>;
}

export interface VideoJob {
  id: string;
  userId: string;
  provider: string;
  providerJobId: string | null;
  status: VideoJobStatus;
  sourceImageUrl: string;
  prompt: string | null;
  negativePrompt: string | null;
  targetAspect: AspectRatio;
  durationSeconds: number;
  seed: number | null;
  transformStrategy: TransformStrategy;
  detectedAspect: string | null;
  resultUrls: string[];
  errorMessage: string | null;
  eta: number | null;
  retryCount: number;
  nextPollAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoProvider {
  name: string;
  createJob(input: CreateVideoJobInput): Promise<CreateJobResult>;
  fetchJob(providerJobId: string): Promise<JobStatusResult>;
}

export function detectAspectRatio(width: number, height: number): "portrait" | "landscape" | "square" {
  const ratio = width / height;
  if (ratio > 1.1) return "landscape";
  if (ratio < 0.9) return "portrait";
  return "square";
}

export function generateIdempotencyKey(
  userId: string,
  sourceImageUrl: string,
  prompt: string | null,
  params: Record<string, unknown>
): string {
  const data = JSON.stringify({ userId, sourceImageUrl, prompt, params });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
