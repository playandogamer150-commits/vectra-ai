import type { ProfileDefinition, BlueprintDefinition, BlockDefinition, FilterDefinition, BaseModelDefinition } from "./types";

export const defaultProfiles: ProfileDefinition[] = [
  {
    name: "Midjourney V6",
    basePrompt: "Create a highly detailed, professional quality image with cinematic composition.",
    preferredOrder: ["subject", "style", "camera", "layout", "postfx", "constraint"],
    forbiddenPatterns: ["nsfw", "gore", "violence"],
    maxLength: 2000,
    capabilities: ["photorealistic", "artistic", "stylized"],
  },
  {
    name: "DALL-E 3",
    basePrompt: "Generate a visually striking image with careful attention to detail and artistic quality.",
    preferredOrder: ["subject", "layout", "style", "camera", "constraint", "postfx"],
    forbiddenPatterns: ["nsfw", "gore"],
    maxLength: 4000,
    capabilities: ["photorealistic", "illustration", "3d"],
  },
  {
    name: "Stable Diffusion XL",
    basePrompt: "A masterfully crafted image showcasing exceptional technical and artistic quality.",
    preferredOrder: ["subject", "style", "postfx", "camera", "layout", "constraint"],
    forbiddenPatterns: [],
    maxLength: 1500,
    capabilities: ["photorealistic", "anime", "artistic"],
  },
  {
    name: "Flux Pro",
    basePrompt: "Ultra high quality, professional grade imagery with exceptional detail and composition.",
    preferredOrder: ["subject", "camera", "style", "layout", "postfx", "constraint"],
    forbiddenPatterns: ["nsfw"],
    maxLength: 2500,
    capabilities: ["photorealistic", "cinematic", "editorial"],
  },
];

export const defaultBlueprints: BlueprintDefinition[] = [
  {
    name: "Minecraft Style Food",
    category: "gaming",
    description: "Pixel art food items in Minecraft aesthetic with blocky textures and vibrant colors",
    blocks: ["pixelart_base", "food_subject", "minecraft_lighting", "game_ui_frame"],
    constraints: ["maintain_blocky_aesthetic", "no_smooth_gradients"],
    previewDescription: "8-bit inspired food photography",
  },
  {
    name: "Analog Collage Refrigerator",
    category: "retro",
    description: "Vintage collage aesthetic with refrigerator magnets and cut-out magazine style",
    blocks: ["collage_base", "vintage_texture", "magnet_elements", "paper_cutout"],
    constraints: ["visible_paper_edges", "imperfect_alignment"],
    previewDescription: "70s magazine cutout collage",
  },
  {
    name: "Gothic Car Wrap",
    category: "aesthetic",
    description: "Dark gothic aesthetic applied to vehicle wraps with intricate patterns",
    blocks: ["gothic_pattern", "vehicle_surface", "dark_lighting", "ornate_details"],
    constraints: ["seamless_pattern", "vehicle_contour_respect"],
    previewDescription: "Dark ornate vehicle design",
  },
  {
    name: "Weightless Phone Photo",
    category: "aesthetic",
    description: "Floating objects and zero-gravity smartphone photography aesthetic",
    blocks: ["floating_objects", "smartphone_camera", "soft_shadows", "clean_background"],
    constraints: ["natural_lighting", "physics_defying_but_believable"],
    previewDescription: "Levitating product photography",
  },
  {
    name: "Lookbook 9-Frame",
    category: "fashion",
    description: "Fashion lookbook grid with 9 coordinated poses and consistent styling",
    blocks: ["grid_layout_9", "fashion_poses", "editorial_lighting", "minimal_background"],
    constraints: ["consistent_model", "cohesive_color_palette"],
    previewDescription: "3x3 fashion editorial grid",
  },
  {
    name: "CCTV Detection",
    category: "surveillance",
    description: "Security camera footage aesthetic with detection overlays and timestamps",
    blocks: ["cctv_camera", "detection_overlay", "timestamp_hud", "grainy_texture"],
    constraints: ["fixed_camera_angle", "low_quality_authentic"],
    previewDescription: "Security footage aesthetic",
  },
  {
    name: "MS Paint Screen",
    category: "retro",
    description: "Classic Windows MS Paint interface with crude digital art aesthetic",
    blocks: ["mspaint_interface", "crude_drawing", "limited_palette", "aliased_edges"],
    constraints: ["16_color_maximum", "no_antialiasing"],
    previewDescription: "Windows 95 paint aesthetic",
  },
  {
    name: "Character Creator Screen",
    category: "ui",
    description: "Video game character creation interface with sliders and customization options",
    blocks: ["ui_panels", "character_turntable", "customization_sliders", "stat_display"],
    constraints: ["game_ui_consistency", "readable_interface"],
    previewDescription: "RPG character customization UI",
  },
  {
    name: "IG Realistic UGC",
    category: "ugc",
    description: "Ultra-realistic Instagram Story selfie with handheld aesthetic, playful poses, and authentic lo-fi texture",
    blocks: ["ig_story_base", "ig_framing_selfie", "ig_story_aesthetic", "ig_appearance_neutral", "ig_accessory_details"],
    constraints: ["no_text_stickers", "raw_story_only"],
    previewDescription: "Authentic IG Story selfie",
  },
];

export const defaultBlocks: BlockDefinition[] = [
  { key: "pixelart_base", label: "Pixel Art Base", template: "pixel art style, 8-bit aesthetic, blocky pixels visible", type: "style" },
  { key: "food_subject", label: "Food Subject", template: "{subject}, appetizing presentation, food photography", type: "subject" },
  { key: "minecraft_lighting", label: "Minecraft Lighting", template: "flat shading, ambient occlusion, game-style lighting", type: "postfx" },
  { key: "game_ui_frame", label: "Game UI Frame", template: "inventory slot frame, game interface border", type: "layout" },
  
  { key: "collage_base", label: "Collage Base", template: "cut paper collage, layered elements, mixed media", type: "style" },
  { key: "vintage_texture", label: "Vintage Texture", template: "aged paper texture, slight yellowing, worn edges", type: "postfx" },
  { key: "magnet_elements", label: "Magnet Elements", template: "refrigerator magnets, letter magnets, magnetic clips", type: "subject" },
  { key: "paper_cutout", label: "Paper Cutout", template: "magazine cutouts, scissors edges, glue visible", type: "style" },
  
  { key: "gothic_pattern", label: "Gothic Pattern", template: "intricate gothic patterns, dark ornamental design, cathedral-inspired", type: "style" },
  { key: "vehicle_surface", label: "Vehicle Surface", template: "car body wrap, vehicle contours, automotive surface", type: "subject" },
  { key: "dark_lighting", label: "Dark Lighting", template: "dramatic low-key lighting, deep shadows, moody atmosphere", type: "camera" },
  { key: "ornate_details", label: "Ornate Details", template: "filigree patterns, baroque elements, detailed embellishments", type: "style" },
  
  { key: "floating_objects", label: "Floating Objects", template: "levitating objects, zero gravity, suspended in air", type: "subject" },
  { key: "smartphone_camera", label: "Smartphone Camera", template: "smartphone photography, mobile camera quality, casual framing", type: "camera" },
  { key: "soft_shadows", label: "Soft Shadows", template: "soft diffused shadows, gentle light falloff", type: "postfx" },
  { key: "clean_background", label: "Clean Background", template: "minimal background, solid color backdrop, studio setting", type: "layout" },
  
  { key: "grid_layout_9", label: "9-Frame Grid", template: "3x3 grid layout, nine equal frames, consistent spacing", type: "layout" },
  { key: "fashion_poses", label: "Fashion Poses", template: "editorial poses, fashion model stance, professional posing", type: "subject" },
  { key: "editorial_lighting", label: "Editorial Lighting", template: "fashion photography lighting, beauty dish, rim light", type: "camera" },
  { key: "minimal_background", label: "Minimal Background", template: "clean backdrop, seamless paper, neutral tones", type: "layout" },
  
  { key: "cctv_camera", label: "CCTV Camera", template: "security camera view, wide angle distortion, overhead angle", type: "camera" },
  { key: "detection_overlay", label: "Detection Overlay", template: "bounding boxes, tracking indicators, detection markers", type: "postfx" },
  { key: "timestamp_hud", label: "Timestamp HUD", template: "date time overlay, camera ID, recording indicator", type: "postfx" },
  { key: "grainy_texture", label: "Grainy Texture", template: "video noise, compression artifacts, low resolution", type: "postfx" },
  
  { key: "mspaint_interface", label: "MS Paint Interface", template: "Windows 95 paint UI, toolbar visible, canvas area", type: "layout" },
  { key: "crude_drawing", label: "Crude Drawing", template: "amateur digital drawing, wobbly lines, basic shapes", type: "style" },
  { key: "limited_palette", label: "Limited Palette", template: "16 color palette, Windows default colors, basic hues", type: "style" },
  { key: "aliased_edges", label: "Aliased Edges", template: "no anti-aliasing, jagged edges, pixel-perfect lines", type: "postfx" },
  
  { key: "ui_panels", label: "UI Panels", template: "game interface panels, menu windows, option boxes", type: "layout" },
  { key: "character_turntable", label: "Character Turntable", template: "character preview, rotating view, 3D model display", type: "subject" },
  { key: "customization_sliders", label: "Customization Sliders", template: "slider controls, adjustment bars, value indicators", type: "layout" },
  { key: "stat_display", label: "Stat Display", template: "character stats, attribute values, skill numbers", type: "layout" },
  
  // IG Realistic UGC blocks
  { key: "ig_story_base", label: "IG Story Base", template: "9:16 ultra-realistic handheld vertical selfie, shot in authentic IG-story style, slight motion blur, soft lo-fi texture, warm indoor lighting, photorealistic skin texture, natural imperfections", type: "style" },
  { key: "ig_framing_selfie", label: "IG Framing Selfie", template: "vertical close-up selfie filling most of the story frame, camera very close to the face, imperfect handheld angle, casual relaxed pose, natural confident expression, direct eye contact with the camera", type: "camera" },
  { key: "ig_story_aesthetic", label: "IG Story Aesthetic", template: "IG-story realism, gentle exposure drifting, shallow depth of field, subtle grain, slightly over-smoothed smartphone edges, no cinematic polish, authentic phone camera quality", type: "postfx" },
  { key: "ig_appearance_neutral", label: "IG Appearance Neutral", template: "photorealistic person, natural skin texture with pores and subtle imperfections, identity and features determined by reference image only, no stylization", type: "subject" },
  { key: "ig_accessory_details", label: "IG Accessory Details", template: "casual accessories as appropriate, natural clothing visible at shoulders, neutral indoor background softly out of focus, authentic ambient lighting", type: "subject" },
  { key: "no_text_stickers", label: "No Text/Stickers", template: "no text on screen, no stickers, only the raw story-style selfie", type: "constraint" },
  { key: "raw_story_only", label: "Raw Story Only", template: "authentic unedited story capture, no filters applied, no overlays", type: "constraint" },
];

export const defaultFilters: FilterDefinition[] = [
  {
    key: "aesthetic_intensity",
    label: "Aesthetic Intensity",
    schema: { type: "select", options: ["low", "medium", "high", "extreme"] },
    effect: {
      low: "subtle stylization",
      medium: "moderate artistic enhancement",
      high: "strong aesthetic treatment",
      extreme: "maximum stylization, highly artistic",
    },
  },
  {
    key: "ugc_realism",
    label: "UGC Realism",
    schema: { type: "select", options: ["phone", "ugc", "pro", "cinematic"] },
    effect: {
      phone: "smartphone quality, casual snapshot",
      ugc: "user generated content look, authentic amateur",
      pro: "professional photography quality",
      cinematic: "cinema camera quality, film look",
    },
  },
  {
    key: "layout_entropy",
    label: "Layout Entropy",
    schema: { type: "select", options: ["strict", "balanced", "loose"] },
    effect: {
      strict: "rigid composition, rule of thirds",
      balanced: "harmonious arrangement, natural flow",
      loose: "organic placement, creative chaos",
    },
  },
  {
    key: "camera_bias",
    label: "Camera Bias",
    schema: { type: "select", options: ["iphone", "cctv", "dslr", "camcorder_2000s"] },
    effect: {
      iphone: "iPhone camera characteristics, portrait mode",
      cctv: "security camera look, fisheye distortion",
      dslr: "professional DSLR quality, shallow depth of field",
      camcorder_2000s: "early 2000s camcorder, SD quality",
    },
  },
  {
    key: "temporal_style",
    label: "Temporal Style",
    schema: { type: "select", options: ["y2k", "2000s_jp_tv", "modern", "retro_future"] },
    effect: {
      y2k: "Y2K aesthetic, early internet era",
      "2000s_jp_tv": "Japanese TV broadcast 2000s, variety show aesthetic",
      modern: "contemporary clean aesthetic",
      retro_future: "retrofuturism, vintage sci-fi",
    },
  },
  {
    key: "prompt_length",
    label: "Prompt Length",
    schema: { type: "select", options: ["short", "normal", "long"] },
    effect: {
      short: "concise description",
      normal: "standard detail level",
      long: "extended detailed description",
    },
  },
];

export const defaultBaseModels: BaseModelDefinition[] = [
  {
    name: "sdxl_1.0",
    displayName: "Stable Diffusion XL 1.0",
    loraFormat: "safetensors",
    defaultResolution: 1024,
    isActive: 1,
  },
  {
    name: "flux_pro",
    displayName: "Flux Pro",
    loraFormat: "safetensors",
    defaultResolution: 1024,
    isActive: 1,
  },
  {
    name: "sd_1.5",
    displayName: "Stable Diffusion 1.5",
    loraFormat: "safetensors",
    defaultResolution: 512,
    isActive: 1,
  },
];
