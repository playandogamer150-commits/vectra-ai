import { SYSTEM_PROMPT_CORE } from "./system-prompt";
import type { CompilerInput, CompilerOutput, BlockDefinition } from "./types";
import type { LlmProfile, PromptBlueprint, PromptBlock, Filter, LoraVersion } from "@shared/schema";
import { createHash } from "crypto";

export interface LoraContext {
  version: LoraVersion;
  weight: number;
  triggerWord?: string;
  modelName?: string;
}

export interface CharacterPackOutput {
  promptWithoutLora: string;
  characterInstructions: string;
  referenceImagesCount: number;
  recommendedParams: {
    aspectRatio: string;
    duration?: number;
    style?: string;
  };
  targetPlatform: string;
}

const LORA_SUPPORTING_PROFILES = ["flux", "sdxl", "stable_diffusion", "sd1.5", "sd_1.5"];
const TARGET_PLATFORM_PROFILES = ["sora", "veo", "grok"];

export class PromptCompiler {
  private profiles: Map<string, LlmProfile> = new Map();
  private blueprints: Map<string, PromptBlueprint> = new Map();
  private blocks: Map<string, PromptBlock> = new Map();
  private filters: Map<string, Filter> = new Map();
  private activeLora: LoraContext | null = null;

  setData(
    profiles: LlmProfile[],
    blueprints: PromptBlueprint[],
    blocks: PromptBlock[],
    filters: Filter[]
  ) {
    this.profiles = new Map(profiles.map(p => [p.id, p]));
    this.blueprints = new Map(blueprints.map(b => [b.id, b]));
    this.blocks = new Map(blocks.map(b => [b.key, b]));
    this.filters = new Map(filters.map(f => [f.key, f]));
  }

  setActiveLora(lora: LoraContext | null) {
    this.activeLora = lora;
  }

  getActiveLora(): LoraContext | null {
    return this.activeLora;
  }

  profileSupportsLoraInjection(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) return false;
    const profileName = profile.name.toLowerCase().replace(/[\s.-]+/g, "_");
    return LORA_SUPPORTING_PROFILES.some(id => profileName.includes(id));
  }

  isTargetPlatformProfile(targetPlatform: string): boolean {
    const normalized = targetPlatform.toLowerCase();
    return TARGET_PLATFORM_PROFILES.some(id => normalized.includes(id));
  }

  generateCharacterPack(input: CompilerInput, targetPlatform: string): CharacterPackOutput | null {
    if (!this.activeLora) return null;

    const output = this.compile(input);
    const lora = this.activeLora;
    const modelName = lora.modelName || "Custom Identity";
    
    let platformInstructions = "";
    let recommendedParams: CharacterPackOutput["recommendedParams"] = { aspectRatio: "16:9" };

    if (targetPlatform.startsWith("sora")) {
      platformInstructions = `For Sora: Use this prompt with your uploaded reference images. ` +
        `The character "${modelName}" should maintain consistent appearance across all frames. ` +
        `Upload the reference images as "character reference" in Sora's interface.`;
      recommendedParams = { aspectRatio: "16:9", duration: 10, style: "cinematic" };
    } else if (targetPlatform.startsWith("veo")) {
      platformInstructions = `For Veo: Include these reference images as visual anchors. ` +
        `Describe the character "${modelName}" in your prompt for consistency. ` +
        `Use Veo's subject reference feature to maintain identity.`;
      recommendedParams = { aspectRatio: "16:9", duration: 8, style: "photorealistic" };
    } else if (targetPlatform.startsWith("grok")) {
      platformInstructions = `For Grok: Describe the character "${modelName}" with specific visual details. ` +
        `Reference the attached images for appearance consistency.`;
      recommendedParams = { aspectRatio: "1:1" };
    }

    const previewImages = (lora.version.previewImages as string[]) || [];

    return {
      promptWithoutLora: output.compiledPrompt,
      characterInstructions: platformInstructions,
      referenceImagesCount: previewImages.length || 20,
      recommendedParams,
      targetPlatform,
    };
  }

  generateSeed(input: CompilerInput): string {
    if (input.seed) return input.seed;
    
    const data = JSON.stringify({
      profile: input.profileId,
      blueprint: input.blueprintId,
      filters: input.filters,
      subject: input.subject,
      timestamp: Date.now(),
      random: Math.random(),
    });
    
    return createHash("sha256").update(data).digest("hex").substring(0, 8);
  }

  compile(input: CompilerInput): CompilerOutput {
    const warnings: string[] = [];
    const profile = this.profiles.get(input.profileId);
    const blueprint = this.blueprints.get(input.blueprintId);

    if (!profile) {
      throw new Error(`Profile not found: ${input.profileId}`);
    }
    if (!blueprint) {
      throw new Error(`Blueprint not found: ${input.blueprintId}`);
    }

    const seed = this.generateSeed(input);
    const parts: string[] = [];

    parts.push(profile.basePrompt);
    parts.push(SYSTEM_PROMPT_CORE);

    if (this.activeLora && this.profileSupportsLoraInjection(input.profileId)) {
      const loraBlock = this.buildLoraBlock(this.activeLora);
      if (loraBlock) {
        parts.push(loraBlock);
      }
    }

    if (input.subject) {
      parts.push(`Subject: ${input.subject}`);
    }

    if (input.environment) {
      parts.push(`Environment: ${input.environment}`);
    }

    if (input.context) {
      parts.push(`Context: ${input.context}`);
    }

    const blueprintBlocks = (blueprint.blocks as string[]) || [];
    const preferredOrder = (profile.preferredOrder as string[]) || [];
    
    const orderedBlocks = this.orderBlocks(blueprintBlocks, preferredOrder);
    let blockCount = 0;

    for (const blockKey of orderedBlocks) {
      const block = this.blocks.get(blockKey);
      if (block) {
        let template = block.template;
        
        template = this.applyFiltersToBlock(template, input.filters, block.type);
        
        if (input.items) {
          template = template.replace(/\{items\}/g, input.items);
        }
        if (input.subject) {
          template = template.replace(/\{subject\}/g, input.subject);
        }
        if (input.environment) {
          template = template.replace(/\{environment\}/g, input.environment);
        }
        
        parts.push(template);
        blockCount++;
      } else {
        warnings.push(`Block not found: ${blockKey}`);
      }
    }

    const constraints = (blueprint.constraints as string[]) || [];
    if (constraints.length > 0) {
      parts.push(`Constraints: ${constraints.join(", ")}`);
    }

    if (input.restrictions) {
      parts.push(`Avoid: ${input.restrictions}`);
    }

    let compiledPrompt = parts.filter(Boolean).join("\n\n");

    const forbiddenPatterns = (profile.forbiddenPatterns as string[]) || [];
    for (const pattern of forbiddenPatterns) {
      if (compiledPrompt.toLowerCase().includes(pattern.toLowerCase())) {
        warnings.push(`Contains forbidden pattern: "${pattern}"`);
        compiledPrompt = compiledPrompt.replace(new RegExp(pattern, "gi"), "");
      }
    }

    if (compiledPrompt.length > profile.maxLength) {
      warnings.push(`Prompt exceeds max length (${compiledPrompt.length}/${profile.maxLength})`);
      compiledPrompt = compiledPrompt.substring(0, profile.maxLength);
    }

    const filterConflicts = this.detectFilterConflicts(input.filters);
    warnings.push(...filterConflicts);

    const score = this.calculateScore(compiledPrompt, input, warnings);

    return {
      compiledPrompt,
      metadata: {
        profileName: profile.name,
        blueprintName: blueprint.name,
        blockCount,
        filterCount: Object.keys(input.filters).length,
      },
      score,
      warnings,
      seed,
    };
  }

  private orderBlocks(blocks: string[], preferredOrder: string[]): string[] {
    const typeOrder: Record<string, number> = {};
    preferredOrder.forEach((type, i) => {
      typeOrder[type] = i;
    });

    return [...blocks].sort((a, b) => {
      const blockA = this.blocks.get(a);
      const blockB = this.blocks.get(b);
      const orderA = blockA ? (typeOrder[blockA.type] ?? 999) : 999;
      const orderB = blockB ? (typeOrder[blockB.type] ?? 999) : 999;
      return orderA - orderB;
    });
  }

  private applyFiltersToBlock(template: string, filters: Record<string, string>, blockType: string): string {
    let result = String(template);
    const appliedEffects: string[] = [];

    for (const [key, value] of Object.entries(filters)) {
      const filter = this.filters.get(key);
      if (filter && filter.effect) {
        const effect = (filter.effect as Record<string, string>)[value];
        if (effect) {
          result = result.replace(`{${key}}`, effect);
          appliedEffects.push(effect);
        }
      }
    }

    result = result.replace(/\{[a-z_]+\}/g, "");

    if (appliedEffects.length > 0) {
      result = `${result}, ${appliedEffects.join(", ")}`;
    }

    return result;
  }

  private detectFilterConflicts(filters: Record<string, string>): string[] {
    const conflicts: string[] = [];

    if (filters.ugc_realism === "phone" && filters.camera_bias === "dslr") {
      conflicts.push("Filter conflict: UGC phone style may conflict with DSLR camera bias");
    }

    if (filters.aesthetic_intensity === "extreme" && filters.ugc_realism === "ugc") {
      conflicts.push("Filter conflict: Extreme aesthetic intensity may override UGC realism");
    }

    if (filters.temporal_style === "y2k" && filters.camera_bias === "modern") {
      conflicts.push("Filter conflict: Y2K temporal style may conflict with modern camera");
    }

    return conflicts;
  }

  private buildLoraBlock(lora: LoraContext): string | null {
    const triggerWord = lora.triggerWord || "lora_style";
    const weight = Math.max(0, Math.min(2, lora.weight));
    const params = lora.version.params as { steps?: number; rank?: number } | null;
    
    let loraBlock = `<lora:${triggerWord}:${weight.toFixed(2)}>`;
    
    if (params?.rank && params.rank >= 32) {
      loraBlock += " (trained with high capacity adapter)";
    }
    
    if (!lora.version.artifactUrl) {
      loraBlock += " [pending training completion]";
    }
    
    return `LoRA Style Enhancement: ${loraBlock}`;
  }

  private calculateScore(prompt: string, input: CompilerInput, warnings: string[]): number {
    let score = 100;

    score -= warnings.length * 5;

    if (!input.subject) {
      score -= 15;
    }

    if (prompt.length < 100) {
      score -= 10;
    } else if (prompt.length > 1500) {
      score -= 5;
    }

    const words = prompt.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio < 0.5) {
      score -= 10;
    }

    const qualityKeywords = ["lighting", "camera", "composition", "texture", "atmosphere", "detail"];
    const hasQualityKeywords = qualityKeywords.some(kw => prompt.toLowerCase().includes(kw));
    if (hasQualityKeywords) {
      score += 5;
    }

    if (Object.keys(input.filters).length > 0) {
      score += Math.min(Object.keys(input.filters).length * 2, 10);
    }

    return Math.max(0, Math.min(100, score));
  }
}

export const compiler = new PromptCompiler();
