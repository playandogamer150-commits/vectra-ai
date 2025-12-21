import { SYSTEM_PROMPT_CORE } from "./system-prompt";
import type { CompilerInput, CompilerOutput, BlockDefinition } from "./types";
import type { LlmProfile, PromptBlueprint, PromptBlock, Filter } from "@shared/schema";
import { createHash } from "crypto";

export class PromptCompiler {
  private profiles: Map<string, LlmProfile> = new Map();
  private blueprints: Map<string, PromptBlueprint> = new Map();
  private blocks: Map<string, PromptBlock> = new Map();
  private filters: Map<string, Filter> = new Map();

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
