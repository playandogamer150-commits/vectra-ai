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
    basePrompt: "Gere uma imagem visualmente impactante com atenção cuidadosa aos detalhes e qualidade artística.",
    preferredOrder: ["subject", "layout", "style", "camera", "constraint", "postfx"],
    forbiddenPatterns: ["nsfw", "gore"],
    maxLength: 4000,
    capabilities: ["fotorrealista", "ilustração", "3d"],
  },
  {
    name: "Stable Diffusion XL",
    basePrompt: "Uma imagem magistralmente elaborada demonstrando qualidade técnica e artística excepcional.",
    preferredOrder: ["subject", "style", "postfx", "camera", "layout", "constraint"],
    forbiddenPatterns: [],
    maxLength: 1500,
    capabilities: ["fotorrealista", "anime", "artístico"],
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
    description: "Itens de comida em pixel art com estética Minecraft, texturas blocadas e cores vibrantes",
    blocks: ["pixelart_base", "food_subject", "minecraft_lighting", "game_ui_frame"],
    constraints: ["maintain_blocky_aesthetic", "no_smooth_gradients"],
    previewDescription: "Fotografia de comida inspirada em 8-bit",
  },
  {
    name: "Analog Collage Refrigerator",
    category: "retro",
    description: "Estética de colagem vintage com ímãs de geladeira e estilo de recorte de revista",
    blocks: ["collage_base", "vintage_texture", "magnet_elements", "paper_cutout"],
    constraints: ["visible_paper_edges", "imperfect_alignment"],
    previewDescription: "Colagem de recortes de revista anos 70",
  },
  {
    name: "Gothic Car Wrap",
    category: "aesthetic",
    description: "Estética gótica sombria aplicada a envelopamentos de veículos com padrões intrincados",
    blocks: ["gothic_pattern", "vehicle_surface", "dark_lighting", "ornate_details"],
    constraints: ["seamless_pattern", "vehicle_contour_respect"],
    previewDescription: "Design ornamental escuro para veículos",
  },
  {
    name: "Weightless Phone Photo",
    category: "aesthetic",
    description: "Objetos flutuantes e estética de fotografia de smartphone em gravidade zero",
    blocks: ["floating_objects", "smartphone_camera", "soft_shadows", "clean_background"],
    constraints: ["natural_lighting", "physics_defying_but_believable"],
    previewDescription: "Fotografia de produto levitando",
  },
  {
    name: "Lookbook 9-Frame",
    category: "fashion",
    description: "Grade de lookbook de moda com 9 poses coordenadas e estilo consistente",
    blocks: ["grid_layout_9", "fashion_poses", "editorial_lighting", "minimal_background"],
    constraints: ["consistent_model", "cohesive_color_palette"],
    previewDescription: "Grade editorial de moda 3x3",
  },
  {
    name: "CCTV Detection",
    category: "surveillance",
    description: "Estética de filmagem de câmera de segurança com sobreposições de detecção e marcadores de tempo",
    blocks: ["cctv_camera", "detection_overlay", "timestamp_hud", "grainy_texture"],
    constraints: ["fixed_camera_angle", "low_quality_authentic"],
    previewDescription: "Estética de filmagem de segurança",
  },
  {
    name: "MS Paint Screen",
    category: "retro",
    description: "Interface clássica do MS Paint do Windows com estética de arte digital amadora",
    blocks: ["mspaint_interface", "crude_drawing", "limited_palette", "aliased_edges"],
    constraints: ["16_color_maximum", "no_antialiasing"],
    previewDescription: "Estética do Paint do Windows 95",
  },
  {
    name: "Character Creator Screen",
    category: "ui",
    description: "Interface de criação de personagem de videogame com controles deslizantes e opções de customização",
    blocks: ["ui_panels", "character_turntable", "customization_sliders", "stat_display"],
    constraints: ["game_ui_consistency", "readable_interface"],
    previewDescription: "Interface de customização de RPG",
  },
  {
    name: "IG Realistic UGC",
    category: "ugc",
    description: "Selfie ultra-realista de Instagram Story com estética handheld, poses casuais e textura lo-fi autêntica",
    blocks: ["ig_story_base", "ig_framing_selfie", "ig_story_aesthetic", "ig_appearance_neutral", "ig_accessory_details"],
    constraints: ["no_text_stickers", "raw_story_only"],
    previewDescription: "Selfie autêntica de IG Story",
  },
];

export const defaultBlocks: BlockDefinition[] = [
  // Minecraft Style Food
  { key: "pixelart_base", label: "Base Pixel Art", template: "estilo pixel art, estética 8-bit, pixels blocados visíveis", type: "style" },
  { key: "food_subject", label: "Assunto Comida", template: "{subject}, apresentação apetitosa, fotografia de comida", type: "subject" },
  { key: "minecraft_lighting", label: "Iluminação Minecraft", template: "sombreamento plano, oclusão de ambiente, iluminação estilo jogo", type: "postfx" },
  { key: "game_ui_frame", label: "Moldura UI de Jogo", template: "moldura de slot de inventário, borda de interface de jogo", type: "layout" },
  
  // Analog Collage Refrigerator
  { key: "collage_base", label: "Base de Colagem", template: "colagem de papel recortado, elementos em camadas, mídia mista", type: "style" },
  { key: "vintage_texture", label: "Textura Vintage", template: "textura de papel envelhecido, leve amarelamento, bordas gastas", type: "postfx" },
  { key: "magnet_elements", label: "Elementos de Ímã", template: "ímãs de geladeira, ímãs de letras, clipes magnéticos", type: "subject" },
  { key: "paper_cutout", label: "Recorte de Papel", template: "recortes de revista, bordas de tesoura, cola visível", type: "style" },
  
  // Gothic Car Wrap
  { key: "gothic_pattern", label: "Padrão Gótico", template: "padrões góticos intrincados, design ornamental escuro, inspirado em catedral", type: "style" },
  { key: "vehicle_surface", label: "Superfície de Veículo", template: "envelopamento de carroceria, contornos do veículo, superfície automotiva", type: "subject" },
  { key: "dark_lighting", label: "Iluminação Escura", template: "iluminação dramática low-key, sombras profundas, atmosfera sombria", type: "camera" },
  { key: "ornate_details", label: "Detalhes Ornamentais", template: "padrões de filigrana, elementos barrocos, embelezamentos detalhados", type: "style" },
  
  // Weightless Phone Photo
  { key: "floating_objects", label: "Objetos Flutuantes", template: "objetos levitando, gravidade zero, suspensos no ar", type: "subject" },
  { key: "smartphone_camera", label: "Câmera de Smartphone", template: "fotografia de smartphone, qualidade de câmera mobile, enquadramento casual", type: "camera" },
  { key: "soft_shadows", label: "Sombras Suaves", template: "sombras difusas suaves, queda de luz gentil", type: "postfx" },
  { key: "clean_background", label: "Fundo Limpo", template: "fundo minimalista, pano de fundo de cor sólida, ambiente de estúdio", type: "layout" },
  
  // Lookbook 9-Frame
  { key: "grid_layout_9", label: "Grade de 9 Quadros", template: "layout de grade 3x3, nove quadros iguais, espaçamento consistente", type: "layout" },
  { key: "fashion_poses", label: "Poses de Moda", template: "poses editoriais, postura de modelo de moda, poses profissionais", type: "subject" },
  { key: "editorial_lighting", label: "Iluminação Editorial", template: "iluminação de fotografia de moda, beauty dish, luz de contorno", type: "camera" },
  { key: "minimal_background", label: "Fundo Minimalista", template: "fundo limpo, papel seamless, tons neutros", type: "layout" },
  
  // CCTV Detection
  { key: "cctv_camera", label: "Câmera CCTV", template: "visão de câmera de segurança, distorção grande angular, ângulo superior", type: "camera" },
  { key: "detection_overlay", label: "Sobreposição de Detecção", template: "caixas delimitadoras, indicadores de rastreamento, marcadores de detecção", type: "postfx" },
  { key: "timestamp_hud", label: "HUD de Timestamp", template: "sobreposição de data e hora, ID da câmera, indicador de gravação", type: "postfx" },
  { key: "grainy_texture", label: "Textura Granulada", template: "ruído de vídeo, artefatos de compressão, baixa resolução", type: "postfx" },
  
  // MS Paint Screen
  { key: "mspaint_interface", label: "Interface MS Paint", template: "Interface do Paint do Windows 95, barra de ferramentas visível, área de tela", type: "layout" },
  { key: "crude_drawing", label: "Desenho Amador", template: "desenho digital amador, linhas tremidas, formas básicas", type: "style" },
  { key: "limited_palette", label: "Paleta Limitada", template: "paleta de 16 cores, cores padrão do Windows, tons básicos", type: "style" },
  { key: "aliased_edges", label: "Bordas Serrilhadas", template: "sem anti-aliasing, bordas serrilhadas, linhas pixel-perfect", type: "postfx" },
  
  // Character Creator Screen
  { key: "ui_panels", label: "Painéis de Interface", template: "painéis de interface de jogo, janelas de menu, caixas de opções", type: "layout" },
  { key: "character_turntable", label: "Visualização do Personagem", template: "pré-visualização do personagem, visão rotativa, exibição de modelo 3D", type: "subject" },
  { key: "customization_sliders", label: "Controles Deslizantes", template: "controles deslizantes, barras de ajuste, indicadores de valor", type: "layout" },
  { key: "stat_display", label: "Exibição de Atributos", template: "estatísticas do personagem, valores de atributos, números de habilidade", type: "layout" },
  
  // IG Realistic UGC
  { key: "ig_story_base", label: "Base IG Story", template: "selfie vertical 9:16 ultra-realista handheld, estilo autêntico de IG-story, leve desfoque de movimento, textura lo-fi suave, iluminação interna quente, textura de pele fotorrealista, imperfeições naturais", type: "style" },
  { key: "ig_framing_selfie", label: "Enquadramento Selfie IG", template: "selfie vertical close-up preenchendo a maior parte do frame do story, câmera muito próxima do rosto, ângulo handheld imperfeito, pose casual relaxada, expressão natural confiante, contato visual direto com a câmera", type: "camera" },
  { key: "ig_story_aesthetic", label: "Estética IG Story", template: "realismo de IG-story, exposição levemente variável, profundidade de campo rasa, grão sutil, bordas levemente suavizadas de smartphone, sem polimento cinematográfico, qualidade autêntica de câmera de celular", type: "postfx" },
  { key: "ig_appearance_neutral", label: "Aparência Neutra IG", template: "pessoa fotorrealista, textura de pele natural com poros e imperfeições sutis, identidade e características determinadas apenas pela imagem de referência, sem estilização", type: "subject" },
  { key: "ig_accessory_details", label: "Detalhes Acessórios IG", template: "acessórios casuais conforme apropriado, roupas naturais visíveis nos ombros, fundo interno neutro suavemente desfocado, iluminação ambiente autêntica", type: "subject" },
  { key: "no_text_stickers", label: "Sem Texto/Stickers", template: "sem texto na tela, sem stickers, apenas a selfie crua estilo story", type: "constraint" },
  { key: "raw_story_only", label: "Apenas Story Bruto", template: "captura de story autêntica sem edição, sem filtros aplicados, sem sobreposições", type: "constraint" },
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
