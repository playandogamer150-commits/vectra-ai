import type { VideoProvider, CreateVideoJobInput, CreateJobResult, JobStatusResult, VideoJobStatus } from "../contracts";
import { getModelForAspectRatio, getVideoModel, isValidVideoModel, type VideoModelConfig, type VideoAspectRatio } from "../model-registry";
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

    // Choose model explicitly if provided; otherwise fall back to aspect-based default
    const model =
      input.modelId && isValidVideoModel(input.modelId)
        ? getVideoModel(input.modelId)
        : getModelForAspectRatio(aspectRatio);

    // Hard guard: model must match requested aspect ratio
    if (model.supportedAspectRatio !== aspectRatio) {
      return {
        success: false,
        status: "error",
        error: `Selected model ${model.displayName} only supports ${model.supportedAspectRatio} (requested ${aspectRatio}).`,
      };
    }

    console.log(`[VideoService] Auto-selected model ${model.id} (${model.displayName}) for aspect ratio ${aspectRatio}`);

    try {
      // Enforce per-model duration constraints (keeps UI/registry/server consistent)
      const duration = input.durationSeconds ?? model.minDurationSeconds;
      if (model.allowedDurationSeconds && !model.allowedDurationSeconds.includes(duration)) {
        return {
          success: false,
          status: "error",
          error: `Invalid duration for ${model.displayName}. Allowed: ${model.allowedDurationSeconds.join("s, ")}s.`,
        };
      }
      if (duration < model.minDurationSeconds || duration > model.maxDurationSeconds) {
        return {
          success: false,
          status: "error",
          error: `Invalid duration for ${model.displayName}. Allowed: ${model.minDurationSeconds}s–${model.maxDurationSeconds}s.`,
        };
      }

      // Enforce optional per-model fps/resolution constraints
      if (model.supportedFps && typeof input.fps === "number" && !model.supportedFps.includes(input.fps)) {
        return {
          success: false,
          status: "error",
          error: `Invalid fps for ${model.displayName}. Allowed: ${model.supportedFps.join(", ")}.`,
        };
      }
      if (model.supportedResolutions && input.resolution && !model.supportedResolutions.includes(input.resolution)) {
        return {
          success: false,
          status: "error",
          error: `Invalid resolution for ${model.displayName}. Allowed: ${model.supportedResolutions.join(", ")}.`,
        };
      }
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

    const apiKey = input.apiKey || this.apiKey;
    const requestBody = {
      key: apiKey,
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
    }, 300000); // 300s timeout for video generation

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

    // For image-to-video, use a safe generic prompt to avoid content filtering
    // The visual content is already in the image, we just need motion description
    const safePrompt = this.sanitizePromptForVideo(input.prompt);

    // IMPORTANT: Use exact model_id from registry - this determines which model generates the video
    const modelId = model.modelIdParam;

    const apiKey = input.apiKey || this.apiKey;
    const requestBody: any = {
      key: apiKey,
      model_id: modelId,
      init_image: input.sourceImageUrl,
      prompt: safePrompt,
      negative_prompt: input.negativePrompt || "low quality, blurry, distorted, amateur, static, frozen",
      aspect_ratio: aspectRatio,
      ...(input.seed && { seed: input.seed }),
    };

    // Model-specific request payload
    if (modelId === "seedance-1-5-pro") {
      requestBody.duration = input.durationSeconds || 5; // number
    } else if (modelId === "ltx-2-pro-i2v") {
      // ModelsLab LTX 2 Pro Image->Video
      requestBody.duration = String(input.durationSeconds || 10);
      requestBody.resolution = input.resolution || "1920x1080";
      requestBody.fps = input.fps || 25;
      requestBody.generate_audio = input.generateAudio ?? false;

      // LTX payload per docs (keep minimal to avoid strict schema rejection)
      delete requestBody.aspect_ratio;
      delete requestBody.negative_prompt;
    } else {
      // Veo 3.1 (and similar)
      requestBody.duration = String(input.durationSeconds || 5);
      requestBody.resolution = "720p";
    }

    const endpoint = `${MODELSLAB_BASE_URL}${model.endpoint}`;

    console.log("[ModelsLab] ========== VIDEO GENERATION REQUEST ==========");
    console.log("[ModelsLab] Model ID:", modelId);
    console.log("[ModelsLab] Model Display Name:", model.displayName);
    console.log("[ModelsLab] Aspect Ratio:", aspectRatio);
    console.log("[ModelsLab] Endpoint:", endpoint);
    console.log("[ModelsLab] Duration:", input.durationSeconds);
    console.log("[ModelsLab] Full Request Body:", JSON.stringify({ ...requestBody, key: "[REDACTED]" }, null, 2));
    console.log("[ModelsLab] =================================================");

    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }, 300000); // 300s timeout for video generation

    const data: ModelsLabResponse = await response.json();
    console.log("[ModelsLab] ========== VIDEO GENERATION RESPONSE ==========");
    console.log("[ModelsLab] Status:", data.status);
    console.log("[ModelsLab] Job ID:", data.id);
    console.log("[ModelsLab] ETA:", data.eta);
    console.log("[ModelsLab] Message:", data.message || "N/A");
    console.log("[ModelsLab] Fetch URL:", data.fetch_result || "N/A");
    console.log("[ModelsLab] Has Output:", !!data.output?.length);
    console.log("[ModelsLab] Full Response:", JSON.stringify(data, null, 2));
    console.log("[ModelsLab] =================================================");

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

  private sanitizePromptForVideo(prompt: string | undefined | null): string {
    if (!prompt) {
      return "Cinematic video with natural smooth movement, professional cinematography";
    }

    const sensitivePatterns = [
      // Politicians, business leaders
      /\b(kanye\s*west|ye\s+west|elon\s*musk|donald\s*trump|joe\s*biden|barack\s*obama|putin|xi\s*jinping|mark\s*zuckerberg|jeff\s*bezos|bill\s*gates|steve\s*jobs|andrew\s*tate)\b/gi,
      // Musicians and singers
      /\b(taylor\s*swift|kim\s*kardashian|beyonce|rihanna|drake|eminem|snoop\s*dogg|jay\s*z|lady\s*gaga|ariana\s*grande|billie\s*eilish|selena\s*gomez|justin\s*bieber|dua\s*lipa|ed\s*sheeran|post\s*malone|bad\s*bunny|shakira|jennifer\s*lopez|j\s*lo|cardi\s*b|nicki\s*minaj|miley\s*cyrus|katy\s*perry|demi\s*lovato|bruno\s*mars|the\s*weeknd|weeknd|travis\s*scott|lizzo|harry\s*styles|olivia\s*rodrigo|kendrick\s*lamar|j\s*cole|lil\s*wayne|future|kanye|ye)\b/gi,
      // Actors and TV personalities
      /\b(oprah|ellen\s*degeneres|johnny\s*depp|amber\s*heard|will\s*smith|chris\s*rock|mr\s*beast|pewdiepie|logan\s*paul|jake\s*paul|jhony\s*dang|johnny\s*dang)\b/gi,
      // Sports personalities
      /\b(lebron\s*james|michael\s*jordan|cristiano\s*ronaldo|lionel\s*messi|neymar|mbappe)\b/gi,
      // Generic terms
      /\b(celebrity|celebridade|famoso|famous\s+person|artista|singer|cantor|cantora|rapper)\b/gi,
    ];

    let cleanPrompt = prompt;

    for (const pattern of sensitivePatterns) {
      cleanPrompt = cleanPrompt.replace(pattern, "person");
    }

    cleanPrompt = cleanPrompt
      .replace(/\s{2,}/g, " ")
      .trim();

    if (cleanPrompt.length < 10) {
      return "Cinematic video with natural smooth movement, professional cinematography";
    }

    return cleanPrompt;
  }
}
