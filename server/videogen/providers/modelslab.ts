import type { VideoProvider, CreateVideoJobInput, CreateJobResult, JobStatusResult, VideoJobStatus } from "../contracts";
import { mapDurationToFrames } from "../contracts";

const MODELSLAB_BASE_URL = "https://modelslab.com/api/v6/video";

interface ModelsLabResponse {
  status: string;
  id?: number;
  output?: string[];
  eta?: number;
  message?: string;
  fetch_result?: string;
  generationTime?: number;
}

export class ModelsLabProvider implements VideoProvider {
  name = "modelslab";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createJob(input: CreateVideoJobInput): Promise<CreateJobResult> {
    try {
      const isPortrait = input.targetAspect === "9:16";
      const numFrames = mapDurationToFrames(input.durationSeconds);
      
      if (input.qualityTier === "ultra") {
        return this.createUltraJob(input, isPortrait, numFrames);
      } else {
        return this.createStandardJob(input, numFrames);
      }
    } catch (error) {
      console.error("ModelsLab createJob error:", error);
      return {
        success: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async createUltraJob(
    input: CreateVideoJobInput, 
    isPortrait: boolean, 
    numFrames: number
  ): Promise<CreateJobResult> {
    const requestBody = {
      key: this.apiKey,
      model_id: "wan2.1",
      init_image: input.sourceImageUrl,
      prompt: input.prompt || "Cinematic video with natural smooth movement, professional cinematography",
      negative_prompt: input.negativePrompt || "low quality, blurry, distorted, amateur, static, frozen",
      portrait: isPortrait,
      resolution: "512",
      num_frames: numFrames,
      fps: 16,
      guidance_scale: 5,
      num_inference_steps: 30,
      ...(input.seed && { seed: input.seed }),
    };

    console.log("ModelsLab Ultra request:", { ...requestBody, key: "[REDACTED]" });

    const response = await fetch(`${MODELSLAB_BASE_URL}/img2video_ultra`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data: ModelsLabResponse = await response.json();
    console.log("ModelsLab Ultra response:", data);

    return this.parseCreateResponse(data);
  }

  private async createStandardJob(
    input: CreateVideoJobInput, 
    numFrames: number
  ): Promise<CreateJobResult> {
    const requestBody = {
      key: this.apiKey,
      model_id: "svd",
      init_image: input.sourceImageUrl,
      prompt: input.prompt || "Smooth natural motion, cinematic quality",
      negative_prompt: input.negativePrompt || "low quality, blurry, distorted",
      width: 512,
      height: 512,
      num_frames: Math.min(numFrames, 25),
      fps: 8,
      motion_bucket_id: 127,
      noise_aug_strength: 0.02,
      ...(input.seed && { seed: input.seed }),
    };

    console.log("ModelsLab Standard request:", { ...requestBody, key: "[REDACTED]" });

    const response = await fetch(`${MODELSLAB_BASE_URL}/img2video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data: ModelsLabResponse = await response.json();
    console.log("ModelsLab Standard response:", data);

    return this.parseCreateResponse(data);
  }

  private parseCreateResponse(data: ModelsLabResponse): CreateJobResult {
    if (data.status === "error") {
      return {
        success: false,
        status: "error",
        error: data.message || "Generation failed",
      };
    }

    if (data.status === "success" && data.output && data.output.length > 0) {
      return {
        success: true,
        status: "success",
        providerJobId: data.id?.toString(),
      };
    }

    if (data.status === "processing" && data.id) {
      return {
        success: true,
        jobId: data.id.toString(),
        providerJobId: data.id.toString(),
        status: "processing",
        eta: data.eta,
      };
    }

    return {
      success: false,
      status: "error",
      error: "Unexpected response format",
    };
  }

  async fetchJob(providerJobId: string): Promise<JobStatusResult> {
    try {
      const response = await fetch(`${MODELSLAB_BASE_URL}/fetch/${providerJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: this.apiKey }),
      });

      const data: ModelsLabResponse = await response.json();
      console.log(`ModelsLab fetch ${providerJobId}:`, data);

      return this.parseFetchResponse(data);
    } catch (error) {
      console.error("ModelsLab fetchJob error:", error);
      return {
        status: "error",
        outputs: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private parseFetchResponse(data: ModelsLabResponse): JobStatusResult {
    const status = this.mapStatus(data.status);

    return {
      status,
      outputs: data.output || [],
      eta: data.eta,
      rawMeta: data as unknown as Record<string, unknown>,
      error: status === "error" ? data.message : undefined,
    };
  }

  private mapStatus(apiStatus: string): VideoJobStatus {
    switch (apiStatus) {
      case "success":
        return "success";
      case "processing":
        return "processing";
      case "queued":
        return "queued";
      default:
        return "error";
    }
  }
}
