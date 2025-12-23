import type { CreateVideoJobInput, VideoProvider, AspectRatio, TransformStrategy } from "./contracts";
import { detectAspectRatio, generateIdempotencyKey } from "./contracts";
import { ModelsLabProvider } from "./providers/modelslab";
import { storage } from "../storage";
import type { VideoJob, CreateVideoJobRequest } from "@shared/schema";

const providers: Map<string, VideoProvider> = new Map();

export function initializeProviders() {
  const modelsLabKey = process.env.MODELSLAB_API_KEY;
  if (modelsLabKey) {
    providers.set("modelslab", new ModelsLabProvider(modelsLabKey));
    console.log("ModelsLab video provider initialized");
  }
}

export function getProvider(name: string = "modelslab"): VideoProvider | undefined {
  return providers.get(name);
}

export async function createVideoJob(
  userId: string,
  request: CreateVideoJobRequest
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const provider = getProvider("modelslab");
  if (!provider) {
    return { success: false, error: "Video provider not configured" };
  }

  let detectedAspect: string | null = null;
  let finalAspect: AspectRatio = request.targetAspect as AspectRatio;
  let transformStrategy: TransformStrategy = "none";

  if (request.targetAspect === "auto" && request.sourceImageUrl) {
    try {
      const imageInfo = await getImageDimensions(request.sourceImageUrl);
      if (imageInfo) {
        detectedAspect = detectAspectRatio(imageInfo.width, imageInfo.height);
        finalAspect = detectedAspect === "portrait" ? "9:16" : 
                      detectedAspect === "landscape" ? "16:9" : "1:1";
      }
    } catch (e) {
      console.warn("Could not detect image dimensions, using 16:9 for text-to-video");
      finalAspect = "16:9";
    }
  } else if (request.targetAspect === "auto") {
    finalAspect = "16:9";
  }

  const idempotencyKey = generateIdempotencyKey(
    userId,
    request.sourceImageUrl || "",
    request.prompt || null,
    { aspect: finalAspect, duration: request.durationSeconds, modelId: request.modelId }
  );

  const existingJob = await storage.findVideoJobByIdempotency(userId, idempotencyKey);
  if (existingJob && (existingJob.status === "processing" || existingJob.status === "success")) {
    return { success: true, jobId: existingJob.id };
  }

  const job = await storage.createVideoJob({
    userId,
    provider: "modelslab",
    providerJobId: null,
    status: "queued",
    sourceImageUrl: request.sourceImageUrl || "",
    prompt: request.prompt || null,
    negativePrompt: request.negativePrompt || null,
    targetAspect: finalAspect,
    durationSeconds: request.durationSeconds,
    seed: request.seed || null,
    transformStrategy,
    detectedAspect,
    resultUrls: [],
    errorMessage: null,
    eta: null,
    retryCount: 0,
    nextPollAt: null,
  });

  const generationType = request.generationType || "text-to-video";
  console.log(`[VideoService] Creating ${generationType} job with model: ${request.modelId || "seedance-1-5-pro"}`);

  const input: CreateVideoJobInput = {
    userId,
    sourceImageUrl: request.sourceImageUrl,
    prompt: request.prompt,
    negativePrompt: request.negativePrompt,
    targetAspect: finalAspect,
    durationSeconds: request.durationSeconds,
    seed: request.seed,
    modelId: request.modelId || "seedance-1-5-pro",
    generateAudio: request.generateAudio ?? false,
    generationType,
  };

  try {
    const result = await provider.createJob(input);
    
    if (result.success) {
      await storage.updateVideoJob(job.id, {
        status: result.status,
        providerJobId: result.providerJobId || null,
        eta: result.eta || null,
        nextPollAt: result.status === "processing" ? new Date(Date.now() + 10000) : null,
      });
      return { success: true, jobId: job.id };
    } else {
      await storage.updateVideoJob(job.id, {
        status: "error",
        errorMessage: result.error || "Provider error",
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await storage.updateVideoJob(job.id, {
      status: "error",
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

export async function pollVideoJob(job: VideoJob): Promise<void> {
  if (!job.providerJobId) return;
  
  const provider = getProvider(job.provider);
  if (!provider) return;

  try {
    const result = await provider.fetchJob(job.providerJobId);
    
    const retryCount = job.retryCount + 1;
    const backoffMs = Math.min(10000 * Math.pow(1.5, retryCount), 120000);

    if (result.status === "success" && result.outputs.length > 0) {
      await storage.updateVideoJob(job.id, {
        status: "success",
        resultUrls: result.outputs,
        nextPollAt: null,
      });
    } else if (result.status === "error") {
      await storage.updateVideoJob(job.id, {
        status: "error",
        errorMessage: result.error || "Generation failed",
        nextPollAt: null,
      });
    } else {
      await storage.updateVideoJob(job.id, {
        status: result.status,
        eta: result.eta || null,
        retryCount,
        nextPollAt: new Date(Date.now() + backoffMs),
      });
    }
  } catch (error) {
    const retryCount = job.retryCount + 1;
    if (retryCount >= 10) {
      await storage.updateVideoJob(job.id, {
        status: "error",
        errorMessage: "Max retries exceeded",
        nextPollAt: null,
      });
    } else {
      const backoffMs = Math.min(10000 * Math.pow(1.5, retryCount), 120000);
      await storage.updateVideoJob(job.id, {
        retryCount,
        nextPollAt: new Date(Date.now() + backoffMs),
      });
    }
  }
}

export async function runPollingWorker(): Promise<void> {
  const jobsToPoll = await storage.getVideoJobsNeedingPoll();
  
  for (const job of jobsToPoll) {
    await pollVideoJob(job);
  }
}

async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return null;
  } catch {
    return null;
  }
}

initializeProviders();
