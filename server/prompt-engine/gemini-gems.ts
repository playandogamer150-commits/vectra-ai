/**
 * Gemini Gems Optimization System
 * 
 * Two specialized optimization manifests for ultra-realistic UGC and facial biometrics:
 * - FACE-SWAPPER: Facial biometrics lockdown, consistency, VFX-grade quality
 * - A.I INSTAGRAM MEDIA: Instagram-optimized identity preservation, photorealism
 */

export interface GeminiGemManifest {
  id: string;
  name: string;
  description: string;
  category: "facial_biometrics" | "identity_preservation" | "ugc_realism";
  priority: number;

  // Prompt injection rules
  promptEnhancements: {
    prefix?: string;
    suffix?: string;
    negativePrompt?: string;
    qualityModifiers: string[];
    fidelityModifiers: string[];
    anatomyModifiers: string[];
  };

  // Technical parameters (for ModelsLab/SD integration)
  technicalParams: {
    cfgScaleRange: [number, number];
    denoisingStrengthRange: [number, number];
    recommendedSamplers: string[];
    controlNetWeights: {
      openPose?: number;
      depth?: number;
      canny?: number;
      ipAdapter?: number;
    };
  };

  // Validation rules
  qualityChecks: string[];
}

/**
 * FACE-SWAPPER Gem Manifest
 * Specialized in: Ultra-realistic face swap, biometric lockdown, VFX-grade consistency
 * Based on: DeepFaceLab, InsightFace, ReActor pipelines
 */
export const FACE_SWAPPER_GEM: GeminiGemManifest = {
  id: "face_swapper",
  name: "FACE-SWAPPER",
  description: "Especialista em face-swap de nível VFX com lockdown biométrico facial",
  category: "facial_biometrics",
  priority: 1,

  promptEnhancements: {
    prefix: `[FACIAL BIOMETRICS LOCKDOWN MODE]
Ultra-high fidelity facial reconstruction with biometric preservation.
Maintain exact facial geometry: landmark alignment, bone structure, eye spacing.
Preserve microexpressions and facial muscle topology.

[BODY MARKING PRESERVATION - CRITICAL]
PRESERVE EXACT original tattoos - do NOT add, remove, or modify any tattoos.
Maintain all existing body markings, scars, and skin features WITHOUT alteration.
The subject's tattoos are FIXED reference points - replicate them EXACTLY as shown.
DO NOT invent new tattoos or body art that doesn't exist in the reference image.`,

    suffix: `Technical requirements:
- Exact replication of facial proportions (Golden Ratio Φ ≈ 1.618)
- Consistent lighting direction on facial planes
- Seamless blending with no visible mask edges
- Skin texture preservation (pores, fine lines, natural imperfections)
- Eye reflection consistency with scene lighting
- Hair-to-face boundary natural transition`,

    negativePrompt: `deformed face, asymmetric eyes, wrong eye color, plastic skin, airbrushed, 
uncanny valley, facial distortion, mask artifacts, halo around face, color mismatch, 
wrong skin tone, floating features, disconnected face, blurred edges, 
bad facial anatomy, extra features, missing features, wrong proportions,
extra tattoos, new tattoos, additional body art, tattoo modifications, altered tattoos,
tattoos appearing where none exist, invented tattoos, different tattoo designs,
modified skin markings, added scars, removed tattoos, tattoo style changes`,

    qualityModifiers: [
      "photorealistic skin texture",
      "detailed skin pores",
      "natural subsurface scattering",
      "accurate facial shadows",
      "lifelike eye reflections",
      "anatomically correct proportions",
      "cinematic facial lighting",
      "8K facial detail"
    ],

    fidelityModifiers: [
      "exact replication",
      "perfect fidelity",
      "maintain original identity",
      "biometric consistency",
      "facial landmark preservation",
      "expression microdetail capture",
      "preserve exact tattoos",
      "maintain body markings",
      "no tattoo alterations",
      "skin marking fidelity"
    ],

    anatomyModifiers: [
      "correct eye spacing",
      "natural nose bridge alignment",
      "accurate lip proportions",
      "proper ear placement",
      "natural jawline curvature",
      "anatomically correct neck transition"
    ]
  },

  technicalParams: {
    cfgScaleRange: [7, 9],
    denoisingStrengthRange: [0.15, 0.25],
    recommendedSamplers: ["DPM++ 2M Karras", "Euler a"],
    controlNetWeights: {
      openPose: 1.0,
      depth: 0.8,
      canny: 0.6,
      ipAdapter: 0.75
    }
  },

  qualityChecks: [
    "Identity coherence - subject remains recognizable",
    "Zero uncanny valley - natural expressions",
    "Chromatic compatibility - matching white balance and saturation",
    "Temporal stability - no flicker between frames",
    "Edge seamlessness - invisible mask transitions",
    "Lighting consistency - shadows match scene key light",
    "Tattoo preservation - NO new tattoos added",
    "Body marking fidelity - all original tattoos preserved exactly",
    "Skin feature accuracy - scars and marks unchanged"
  ]
};

/**
 * A.I INSTAGRAM MEDIA Gem Manifest
 * Specialized in: Instagram-optimized photorealism, UGC authenticity, identity preservation
 * Based on: LoRA training, IP-Adapter FaceID, adaptive memory learning
 */
export const AI_INSTAGRAM_MEDIA_GEM: GeminiGemManifest = {
  id: "ai_instagram_media",
  name: "A.I INSTAGRAM MEDIA",
  description: "Especialista em mídia Instagram fotorrealista com preservação de identidade",
  category: "identity_preservation",
  priority: 2,

  promptEnhancements: {
    prefix: `[INSTAGRAM UGC PHOTOREALISM MODE]
Generate authentic user-generated content style imagery.
Priority: Identity preservation > Artistic style.
Target: Indistinguishable from real smartphone photography.`,

    suffix: `Instagram optimization requirements:
- Natural smartphone camera aesthetics (slight lens distortion, authentic bokeh)
- Organic lighting conditions (golden hour, natural window light, ambient)
- Genuine skin texture (not airbrushed, real pores and imperfections visible)
- Authentic composition (not overly staged, natural candid feel)
- Platform-native aspect ratios (1:1, 4:5, 9:16 for stories)
- Color grading consistent with popular Instagram filters (warm tones, slightly lifted blacks)
- Natural hand/body positioning typical of selfies and UGC`,

    negativePrompt: `studio lighting, professional photoshoot, airbrushed skin, perfect symmetry,
overly posed, stock photo aesthetic, unnatural colors, oversaturated, 
HDR artifacts, artificial bokeh, lens flare abuse, plastic skin texture,
fashion magazine style, advertising aesthetic, corporate look,
deformed hands, extra fingers, bad anatomy, mutated limbs,
extra tattoos, new tattoos, additional body art, tattoo modifications, altered tattoos,
tattoos appearing where none exist, invented tattoos, different tattoo designs`,

    qualityModifiers: [
      "authentic UGC aesthetic",
      "smartphone camera quality",
      "natural skin imperfections",
      "organic lighting",
      "candid composition",
      "Instagram-native colors",
      "genuine photorealism",
      "lived-in authenticity"
    ],

    fidelityModifiers: [
      "identity lock",
      "face consistency across generations",
      "recognizable subject",
      "preserved distinctive features",
      "maintained facial structure",
      "consistent skin tone",
      "preserve original tattoos",
      "maintain body art exactly",
      "skin marking consistency"
    ],

    anatomyModifiers: [
      "natural hand positions",
      "correct finger count",
      "anatomically accurate limbs",
      "proper body proportions",
      "realistic joint articulation",
      "natural pose biomechanics"
    ]
  },

  technicalParams: {
    cfgScaleRange: [7, 10],
    denoisingStrengthRange: [0.15, 0.30],
    recommendedSamplers: ["DPM++ 2M Karras", "Euler a"],
    controlNetWeights: {
      openPose: 1.0,
      depth: 0.7,
      canny: 0.5,
      ipAdapter: 0.70
    }
  },

  qualityChecks: [
    "Identity preservation - subject clearly recognizable",
    "UGC authenticity - looks like real smartphone photo",
    "Natural imperfections - not overly processed",
    "Anatomy correctness - no deformed features",
    "Lighting realism - consistent with scene",
    "Platform optimization - correct aspect ratio and color",
    "Tattoo fidelity - original tattoos preserved",
    "Body marking accuracy - no new markings added"
  ]
};

/**
 * TATTOO PRESERVATION Gem Manifest
 * Specialized in: Preserving tattoos, scars, and body markings with exact fidelity
 * Use case: Face swap for tattooed subjects where body art must remain unchanged
 */
export const TATTOO_PRESERVATION_GEM: GeminiGemManifest = {
  id: "tattoo_preservation",
  name: "TATTOO PRESERVATION",
  description: "Especialista em preservação de tatuagens e marcas corporais",
  category: "identity_preservation",
  priority: 1,

  promptEnhancements: {
    prefix: `[TATTOO & BODY MARKING PRESERVATION MODE - MAXIMUM PRIORITY]
This is a TATTOOED subject. Their tattoos are FIXED IDENTITY MARKERS.
CRITICAL: Preserve ALL existing tattoos EXACTLY as shown in reference.
DO NOT add ANY new tattoos, body art, or skin markings.
DO NOT modify, extend, or alter existing tattoo designs.
DO NOT remove or fade any visible tattoos.
Tattoo locations, sizes, and designs must match reference PRECISELY.

[SKIN FIDELITY LOCKDOWN]
Treat all visible skin markings as immutable reference points.
Replicate exact tattoo line work, shading, and color saturation.
Preserve natural skin texture around and within tattoo areas.`,

    suffix: `Tattoo preservation requirements:
- EXACT replication of all visible tattoos (position, size, design, color)
- NO new tattoos or body art invention
- NO tattoo modifications, extensions, or style changes
- Preserve tattoo edges and boundaries precisely
- Maintain original tattoo color saturation and contrast
- Keep scar tissue and skin imperfections intact
- Replicate tattoo aging/wear if present in reference

VALIDATION: Count the tattoos in reference vs output - must match exactly.`,

    negativePrompt: `extra tattoos, new tattoos, additional tattoos, invented tattoos,
tattoo modifications, altered tattoos, extended tattoos, changed tattoo designs,
tattoos appearing where none exist, different tattoo style, removed tattoos,
faded tattoos that should be visible, wrong tattoo placement, incorrect tattoo size,
added body art, new piercings, new scars, modified skin markings,
tattoo color changes, tattoo line work alterations, missing tattoos`,

    qualityModifiers: [
      "exact tattoo replication",
      "precise body art preservation",
      "tattoo-accurate skin rendering",
      "original ink colors maintained",
      "tattoo line work fidelity",
      "skin marking consistency",
      "body art reference matching",
      "tattoo boundary preservation"
    ],

    fidelityModifiers: [
      "zero tattoo alterations",
      "exact tattoo count preservation",
      "tattoo position lock",
      "body marking immutability",
      "skin feature preservation",
      "tattoo design fidelity",
      "original body art only",
      "no invented markings"
    ],

    anatomyModifiers: [
      "tattoo placement accuracy",
      "correct skin topology",
      "natural tattoo curvature on body",
      "proper tattoo perspective",
      "anatomically consistent markings",
      "body-accurate tattoo sizing"
    ]
  },

  technicalParams: {
    cfgScaleRange: [8, 10],
    denoisingStrengthRange: [0.10, 0.20],
    recommendedSamplers: ["DPM++ 2M Karras", "Euler a"],
    controlNetWeights: {
      openPose: 1.0,
      depth: 0.9,
      canny: 0.8,
      ipAdapter: 0.85
    }
  },

  qualityChecks: [
    "Tattoo count match - exact same number as reference",
    "Tattoo position accuracy - correct body placement",
    "Tattoo design fidelity - no alterations to artwork",
    "Tattoo size consistency - matches reference proportions",
    "No invented tattoos - zero new body art",
    "Color accuracy - ink colors match reference",
    "Scar preservation - all skin features maintained",
    "Boundary sharpness - tattoo edges are crisp"
  ]
};

/**
 * REAL LIFE CONTEXT Gem Manifest
 * Specialized in: Forcing real-life, human, documentary-style context
 */
export const REAL_LIFE_CONTEXT_GEM: GeminiGemManifest = {
  id: "real_life_context",
  name: "REAL LIFE CONTEXT",
  description: "Força um contexto humano de vida real, documental e cru",
  category: "ugc_realism",
  priority: 3,

  promptEnhancements: {
    prefix: `[REAL LIFE DOCUMENTARY MODE]
CONTEXT: REAL LIFE, RAW REALITY, HUMAN EXPERIENCE.
Subject must be grounded in a believable, tangible, real-world environment.
Avoid generic backgrounds. Use specific, lived-in, cluttered, imperfect settings.
Lighting must be motivated by realistic sources (fluorescent, sunlight, practical lamps).`,

    suffix: `Realism requirements:
- Imperfect composition (documentary style)
- Natural, unposed body language
- Cluttered, detailed backgrounds implying a history
- Realistic textures (dust, scratches, fabric wear)
- No "perfect" studio lighting
- Contextual storytelling elements`,

    negativePrompt: `cgi, 3d render, anime, cartoon, sketch, painting, unreal engine, 
perfect studio lighting, empty background, generic background, 
floating objects, physical impossibilities, dreamlike, fantasy, 
overly clean, sterile environment, ai generated look, plastic`,

    qualityModifiers: [
      "raw documentary style",
      "real life context",
      "human imperfection",
      "tangible atmosphere",
      "lived-in environment",
      "environmental storytelling"
    ],

    fidelityModifiers: [
      "contextual grounding",
      "realistic scale",
      "physical plausibility",
      "environmental interaction"
    ],

    anatomyModifiers: [
      "relaxed posture",
      "natural weight distribution",
      "candid expression"
    ]
  },

  technicalParams: {
    cfgScaleRange: [5, 8],
    denoisingStrengthRange: [0.3, 0.5],
    recommendedSamplers: ["DPM++ 2M SDE Karras"],
    controlNetWeights: {
      ipAdapter: 0.6,
      depth: 0.6
    }
  },

  qualityChecks: [
    "Is the environment believable?",
    "Does it look like a real photo?",
    "Are textures realistic?"
  ]
};

export const GEMINI_GEMS: Record<string, GeminiGemManifest> = {
  face_swapper: FACE_SWAPPER_GEM,
  ai_instagram_media: AI_INSTAGRAM_MEDIA_GEM,
  tattoo_preservation: TATTOO_PRESERVATION_GEM,
  real_life_context: REAL_LIFE_CONTEXT_GEM
};

export interface GemOptimizationResult {
  enhancedPrompt: string;
  negativePrompt: string;
  appliedGems: string[];
  technicalRecommendations: {
    cfgScale: number;
    denoisingStrength: number;
    sampler: string;
    controlNetWeights: Record<string, number>;
  };
  qualityChecklist: string[];
}

/**
 * Apply Gemini Gems optimization to a compiled prompt
 */
export function applyGeminiGemsOptimization(
  originalPrompt: string,
  activeGems: string[],
  existingNegative?: string
): GemOptimizationResult {
  const appliedGems: string[] = [];
  const prefixes: string[] = [];
  const suffixes: string[] = [];
  const negatives: string[] = existingNegative ? [existingNegative] : [];
  const qualityMods: string[] = [];
  const fidelityMods: string[] = [];
  const anatomyMods: string[] = [];
  const qualityChecklist: string[] = [];

  let avgCfgScale = 7.5;
  let avgDenoising = 0.25;
  const controlNetWeights: Record<string, number> = {
    openPose: 1.0,
    depth: 0.5,
    canny: 0.4,
    ipAdapter: 0.5
  };
  let gemCount = 0;

  for (const gemId of activeGems) {
    const gem = GEMINI_GEMS[gemId];
    if (!gem) continue;

    appliedGems.push(gem.name);

    if (gem.promptEnhancements.prefix) {
      prefixes.push(gem.promptEnhancements.prefix);
    }
    if (gem.promptEnhancements.suffix) {
      suffixes.push(gem.promptEnhancements.suffix);
    }
    if (gem.promptEnhancements.negativePrompt) {
      negatives.push(gem.promptEnhancements.negativePrompt);
    }

    qualityMods.push(...gem.promptEnhancements.qualityModifiers);
    fidelityMods.push(...gem.promptEnhancements.fidelityModifiers);
    anatomyMods.push(...gem.promptEnhancements.anatomyModifiers);
    qualityChecklist.push(...gem.qualityChecks);

    // Average technical params
    const [minCfg, maxCfg] = gem.technicalParams.cfgScaleRange;
    const [minDenoise, maxDenoise] = gem.technicalParams.denoisingStrengthRange;
    avgCfgScale += (minCfg + maxCfg) / 2;
    avgDenoising += (minDenoise + maxDenoise) / 2;

    // Merge ControlNet weights (take max)
    const cnWeights = gem.technicalParams.controlNetWeights;
    if (cnWeights.openPose) controlNetWeights.openPose = Math.max(controlNetWeights.openPose, cnWeights.openPose);
    if (cnWeights.depth) controlNetWeights.depth = Math.max(controlNetWeights.depth, cnWeights.depth);
    if (cnWeights.canny) controlNetWeights.canny = Math.max(controlNetWeights.canny, cnWeights.canny);
    if (cnWeights.ipAdapter) controlNetWeights.ipAdapter = Math.max(controlNetWeights.ipAdapter, cnWeights.ipAdapter);

    gemCount++;
  }

  // Calculate averages
  if (gemCount > 0) {
    avgCfgScale = avgCfgScale / (gemCount + 1);
    avgDenoising = avgDenoising / (gemCount + 1);
  }

  // Build enhanced prompt
  const enhancedParts: string[] = [];

  // Add prefixes
  if (prefixes.length > 0) {
    enhancedParts.push(prefixes.join("\n\n"));
  }

  // Add original prompt
  enhancedParts.push(originalPrompt);

  // Add quality/fidelity/anatomy modifiers inline
  const uniqueQuality = Array.from(new Set(qualityMods)).slice(0, 8);
  const uniqueFidelity = Array.from(new Set(fidelityMods)).slice(0, 6);
  const uniqueAnatomy = Array.from(new Set(anatomyMods)).slice(0, 6);

  if (uniqueQuality.length > 0) {
    enhancedParts.push(`Quality: ${uniqueQuality.join(", ")}`);
  }
  if (uniqueFidelity.length > 0) {
    enhancedParts.push(`Fidelity: ${uniqueFidelity.join(", ")}`);
  }
  if (uniqueAnatomy.length > 0) {
    enhancedParts.push(`Anatomy: ${uniqueAnatomy.join(", ")}`);
  }

  // Add suffixes
  if (suffixes.length > 0) {
    enhancedParts.push(suffixes.join("\n\n"));
  }

  const enhancedPrompt = enhancedParts.join("\n\n");
  const negativePrompt = Array.from(new Set(negatives)).join(", ");

  return {
    enhancedPrompt,
    negativePrompt,
    appliedGems,
    technicalRecommendations: {
      cfgScale: Math.round(avgCfgScale * 10) / 10,
      denoisingStrength: Math.round(avgDenoising * 100) / 100,
      sampler: "DPM++ 2M Karras",
      controlNetWeights
    },
    qualityChecklist: Array.from(new Set(qualityChecklist))
  };
}

/**
 * Get available gems for display in UI
 */
export function getAvailableGems(): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
}> {
  return Object.values(GEMINI_GEMS).map(gem => ({
    id: gem.id,
    name: gem.name,
    description: gem.description,
    category: gem.category
  }));
}
