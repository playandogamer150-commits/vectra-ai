export interface CompilerInput {
  profileId: string;
  blueprintId: string;
  filters: Record<string, string>;
  seed: string;
  subject: string;
  context: string;
  items: string;
  environment: string;
  restrictions: string;
}

export interface CompilerOutput {
  compiledPrompt: string;
  metadata: {
    profileName: string;
    blueprintName: string;
    blockCount: number;
    filterCount: number;
  };
  score: number;
  warnings: string[];
  seed: string;
}

export interface BlockDefinition {
  key: string;
  label: string;
  template: string;
  type: "style" | "camera" | "layout" | "constraint" | "postfx" | "subject";
}

export interface FilterDefinition {
  key: string;
  label: string;
  schema: { type: string; options?: string[]; min?: number; max?: number };
  effect: Record<string, string>;
}

export interface ProfileDefinition {
  name: string;
  basePrompt: string;
  preferredOrder: string[];
  forbiddenPatterns: string[];
  maxLength: number;
  capabilities: string[];
}

export interface BlueprintDefinition {
  name: string;
  category: string;
  description: string;
  blocks: string[];
  constraints: string[];
  previewDescription?: string;
}
