import type { VideoProvider, CreateVideoJobInput, CreateJobResult, JobStatusResult, VideoJobStatus } from "../contracts";

const MODELSLAB_BASE_URL = "https://modelslab.com/api/v7/video-fusion";

interface SeedanceResponse {
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
      const requestBody = {
        key: this.apiKey,
        model_id: "seedance-1.0-pro-i2v",
        init_image: [input.sourceImageUrl],
        prompt: input.prompt || "Cinematic video with natural smooth movement, professional cinematography",
        negative_prompt: input.negativePrompt || "low quality, blurry, distorted, amateur, static, frozen",
        duration: String(input.durationSeconds),
        ...(input.seed && { seed: input.seed }),
      };

      console.log("Seedance I2V request:", { ...requestBody, key: "[REDACTED]" });

      const response = await fetch(`${MODELSLAB_BASE_URL}/image-to-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: SeedanceResponse = await response.json();
      console.log("Seedance I2V response:", data);

      return this.parseCreateResponse(data);
    } catch (error) {
      console.error("Seedance createJob error:", error);
      return {
        success: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private parseCreateResponse(data: SeedanceResponse): CreateJobResult {
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

      const data: SeedanceResponse = await response.json();
      console.log(`Seedance fetch ${providerJobId}:`, data);

      return this.parseFetchResponse(data);
    } catch (error) {
      console.error("Seedance fetchJob error:", error);
      return {
        status: "error",
        outputs: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private parseFetchResponse(data: SeedanceResponse): JobStatusResult {
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
