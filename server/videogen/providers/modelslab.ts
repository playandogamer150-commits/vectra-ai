import type { VideoProvider, CreateVideoJobInput, CreateJobResult, JobStatusResult, VideoJobStatus } from "../contracts";
import { getModelForAspectRatio, type VideoModelConfig, type VideoAspectRatio } from "../model-registry";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

const MODELSLAB_BASE_URL = "https://modelslab.com";

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
    const aspectRatio = this.normalizeAspectRatio(input.targetAspect);
    
    if (aspectRatio !== "16:9" && aspectRatio !== "9:16") {
      return {
        success: false,
        status: "error",
        error: "Only 16:9 (landscape) or 9:16 (portrait) aspect ratios are supported for video generation.",
      };
    }

    const model = getModelForAspectRatio(aspectRatio);
    
    console.log(`[VideoService] Auto-selected model ${model.id} (${model.displayName}) for aspect ratio ${aspectRatio}`);

    try {
      return await this.createImageToVideoJob(input, model, aspectRatio);
    } catch (error) {
      console.error("[ModelsLab] createJob error:", error);
      return {
        success: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
  
  private normalizeAspectRatio(aspect: string | undefined): VideoAspectRatio {
    if (aspect === "9:16") return "9:16";
    return "16:9";
  }

  private async createTextToVideoJob(input: CreateVideoJobInput, model: VideoModelConfig): Promise<CreateJobResult> {
    const aspectRatio = input.targetAspect === "auto" ? "16:9" : input.targetAspect;
    
    const requestBody = {
      key: this.apiKey,
      model_id: model.modelIdParam,
      prompt: input.prompt || "Cinematic video with natural smooth movement, ultra realistic, professional cinematography",
      negative_prompt: input.negativePrompt || "low quality, blurry, distorted, amateur, static, frozen, text overlay",
      aspect_ratio: aspectRatio,
      duration: String(input.durationSeconds),
      generate_audio: input.generateAudio ?? false,
      ...(input.seed && { seed: input.seed }),
    };

    const endpoint = `${MODELSLAB_BASE_URL}${model.endpoint}`;
    
    console.log("[ModelsLab] Text-to-Video Request:", {
      endpoint,
      model_id: model.modelIdParam,
      model_display: model.displayName,
      aspect_ratio: aspectRatio,
      duration: input.durationSeconds,
      generate_audio: input.generateAudio,
      prompt: requestBody.prompt?.substring(0, 100) + "...",
    });

    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }, 90000); // 90s timeout for video generation

    const data: ModelsLabResponse = await response.json();
    
    console.log("[ModelsLab] Text-to-Video Response:", {
      status: data.status,
      id: data.id,
      eta: data.eta,
      hasOutput: !!data.output?.length,
    });

    return this.parseCreateResponse(data);
  }

  private async createImageToVideoJob(input: CreateVideoJobInput, model: VideoModelConfig, aspectRatio: VideoAspectRatio): Promise<CreateJobResult> {
    if (!input.sourceImageUrl) {
      return {
        success: false,
        status: "error",
        error: "Source image URL is required for image-to-video generation",
      };
    }

    const requestBody = {
      key: this.apiKey,
      model_id: model.modelIdParam,
      init_image: input.sourceImageUrl,
      prompt: input.prompt || "Cinematic video with natural smooth movement, professional cinematography",
      negative_prompt: input.negativePrompt || "low quality, blurry, distorted, amateur, static, frozen",
      duration: String(input.durationSeconds || 5),
      ...(input.seed && { seed: input.seed }),
    };

    const endpoint = `${MODELSLAB_BASE_URL}${model.endpoint}`;
    
    console.log("[ModelsLab] Image-to-Video Request:", {
      endpoint,
      model_id: model.modelIdParam,
      model_display: model.displayName,
      aspectRatio,
      duration: input.durationSeconds,
    });

    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }, 90000); // 90s timeout for video generation

    const data: ModelsLabResponse = await response.json();
    console.log("[ModelsLab] Image-to-Video Response:", data);

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
      const response = await fetchWithTimeout(`${MODELSLAB_BASE_URL}/api/v7/video-fusion/fetch/${providerJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: this.apiKey }),
      }, 30000); // 30s timeout for status check

      const data: ModelsLabResponse = await response.json();
      console.log(`[ModelsLab] Fetch job ${providerJobId}:`, {
        status: data.status,
        hasOutput: !!data.output?.length,
        eta: data.eta,
      });

      return this.parseFetchResponse(data);
    } catch (error) {
      console.error("[ModelsLab] fetchJob error:", error);
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

  private mapStatus(status: string): VideoJobStatus {
    switch (status) {
      case "success":
        return "success";
      case "processing":
      case "queued":
        return "processing";
      case "error":
      case "failed":
        return "error";
      default:
        return "processing";
    }
  }
}
