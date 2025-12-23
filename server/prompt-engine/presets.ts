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
    name: "Raw Surveillance Realism",
    category: "surveillance",
    description: "Realismo bruto de câmera de vigilância sem textos, HUDs ou overlays - apenas a estética autêntica e crua",
    blocks: ["surveillance_angle", "lowlight_realism", "candid_moment", "subtle_grain"],
    constraints: ["no_text_overlays", "no_ui_elements", "authentic_imperfection"],
    previewDescription: "Realismo bruto sem overlays",
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
  {
    name: "General UGC Photo",
    category: "ugc",
    description: "Fotografia ultra-realista estilo UGC com toque amador autêntico, perfeita para conteúdo de redes sociais",
    blocks: ["general_ugc_base", "general_ugc_lighting", "general_ugc_camera", "general_ugc_texture", "general_ugc_subject"],
    constraints: ["authentic_amateur_feel", "no_overprocessing"],
    previewDescription: "Foto UGC ultra-realista padrão",
  },
  {
    name: "Product Flat Lay",
    category: "product",
    description: "Fotografia de produto flat lay com composição organizada, sombras suaves e estética minimalista",
    blocks: ["flatlay_composition", "product_lighting", "clean_surface", "organized_props"],
    constraints: ["top_down_angle", "balanced_composition"],
    previewDescription: "Flat lay de produtos estilizados",
  },
  {
    name: "Neon Cyberpunk Portrait",
    category: "aesthetic",
    description: "Retrato estilo cyberpunk com iluminação neon, reflexos urbanos e atmosfera futurista noir",
    blocks: ["neon_lighting", "cyberpunk_environment", "futuristic_elements", "rain_reflections"],
    constraints: ["high_contrast_neon", "urban_night_setting"],
    previewDescription: "Retrato cyberpunk com neons",
  },
  {
    name: "Vintage Film Grain",
    category: "retro",
    description: "Estética de filme analógico com grão autêntico, cores desbotadas e vazamentos de luz",
    blocks: ["film_grain_texture", "vintage_color_grade", "light_leaks", "soft_focus_edges"],
    constraints: ["analog_authenticity", "no_digital_sharpness"],
    previewDescription: "Foto analógica vintage",
  },
  {
    name: "Food Photography Pro",
    category: "product",
    description: "Fotografia gastronômica profissional com iluminação apetitosa, styling elaborado e foco seletivo",
    blocks: ["food_hero_shot", "appetizing_lighting", "garnish_styling", "shallow_dof"],
    constraints: ["fresh_appearance", "color_vibrancy"],
    previewDescription: "Foto gastronômica profissional",
  },
  {
    name: "Dreamy Soft Glow",
    category: "aesthetic",
    description: "Estética sonhadora com brilho suave, tons pastéis e atmosfera etérea romântica",
    blocks: ["soft_glow_lighting", "pastel_tones", "ethereal_atmosphere", "bokeh_background"],
    constraints: ["soft_transitions", "gentle_highlights"],
    previewDescription: "Foto com brilho suave sonhador",
  },
  {
    name: "Street Documentary",
    category: "documentary",
    description: "Fotografia de rua documental com momentos candid, luz natural e autenticidade urbana",
    blocks: ["candid_moment", "street_environment", "natural_light", "documentary_framing"],
    constraints: ["unposed_authentic", "decisive_moment"],
    previewDescription: "Fotografia de rua documental",
  },
  {
    name: "Polaroid Instant",
    category: "retro",
    description: "Estética de foto instantânea Polaroid com moldura branca, cores ligeiramente desaturadas e textura única",
    blocks: ["polaroid_frame", "instant_color_cast", "slight_blur", "vintage_saturation"],
    constraints: ["square_format", "instant_film_look"],
    previewDescription: "Foto estilo Polaroid instantânea",
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
  
  // Raw Surveillance Realism (sem overlays)
  { key: "surveillance_angle", label: "Ângulo de Vigilância", template: "ângulo de câmera fixa elevada, visão de canto, perspectiva voyeurística natural", type: "camera" },
  { key: "lowlight_realism", label: "Realismo em Baixa Luz", template: "iluminação ambiente natural, sombras suaves autênticas, sem flash artificial, luz de ambiente interno realista", type: "camera" },
  { key: "candid_moment", label: "Momento Candid", template: "pose espontânea natural, expressão desprevenida, movimento genuíno capturado, sem consciência da câmera", type: "subject" },
  { key: "subtle_grain", label: "Granulação Sutil", template: "ruído de sensor leve, textura fotográfica autêntica, imperfeições naturais mínimas", type: "postfx" },
  
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
  
  // General UGC Photo
  { key: "general_ugc_base", label: "Base UGC Geral", template: "fotografia ultra-realista estilo conteúdo gerado pelo usuário, qualidade autêntica de smartphone, composição casual natural, sem polimento profissional excessivo", type: "style" },
  { key: "general_ugc_lighting", label: "Iluminação UGC", template: "iluminação ambiente natural, sem setup profissional, luz do dia ou iluminação interna comum, sombras naturais não controladas", type: "camera" },
  { key: "general_ugc_camera", label: "Câmera UGC", template: "qualidade de câmera de celular moderna, leve imperfeição de foco, ângulo handheld casual, enquadramento espontâneo", type: "camera" },
  { key: "general_ugc_texture", label: "Textura UGC", template: "textura de pele natural com poros visíveis, imperfeições autênticas, grão sutil de smartphone, compressão leve de JPEG", type: "postfx" },
  { key: "general_ugc_subject", label: "Sujeito UGC", template: "{subject}, aparência natural sem maquiagem pesada, expressão genuína relaxada, pose casual não forçada", type: "subject" },
  { key: "authentic_amateur_feel", label: "Sensação Amadora", template: "estética de foto tirada por pessoa comum, sem direção profissional, momento capturado naturalmente", type: "constraint" },
  { key: "no_overprocessing", label: "Sem Processamento Excessivo", template: "sem filtros pesados, sem suavização de pele artificial, cores naturais sem saturação exagerada", type: "constraint" },
  
  // Product Flat Lay
  { key: "flatlay_composition", label: "Composição Flat Lay", template: "composição flat lay organizada, visão de cima para baixo, arranjo cuidadoso de elementos", type: "layout" },
  { key: "product_lighting", label: "Iluminação de Produto", template: "iluminação suave difusa, sombras mínimas, destaque uniforme nos produtos", type: "camera" },
  { key: "clean_surface", label: "Superfície Limpa", template: "fundo de superfície limpa, textura minimalista, mármore ou madeira clara ou cor sólida", type: "layout" },
  { key: "organized_props", label: "Props Organizados", template: "acessórios complementares organizados, elementos decorativos sutis, espaço negativo intencional", type: "subject" },
  { key: "top_down_angle", label: "Ângulo Superior", template: "ângulo de câmera perpendicular à superfície, visão aérea direta", type: "constraint" },
  { key: "balanced_composition", label: "Composição Equilibrada", template: "equilíbrio visual, simetria ou assimetria intencional, hierarquia clara", type: "constraint" },
  
  // Neon Cyberpunk Portrait
  { key: "neon_lighting", label: "Iluminação Neon", template: "iluminação neon vibrante, cores ciano e magenta, reflexos coloridos na pele e superfícies", type: "camera" },
  { key: "cyberpunk_environment", label: "Ambiente Cyberpunk", template: "cenário urbano futurista, letreiros holográficos, ruas chuvosas à noite, arquitetura high-tech", type: "layout" },
  { key: "futuristic_elements", label: "Elementos Futuristas", template: "implantes cibernéticos, óculos tecnológicos, acessórios LED, estética tech-noir", type: "subject" },
  { key: "rain_reflections", label: "Reflexos de Chuva", template: "superfícies molhadas refletindo neons, poças d'água luminosas, atmosfera úmida", type: "postfx" },
  { key: "high_contrast_neon", label: "Alto Contraste Neon", template: "contraste dramático entre sombras profundas e luzes neon intensas", type: "constraint" },
  { key: "urban_night_setting", label: "Cenário Noturno Urbano", template: "ambiente exclusivamente noturno, cidade grande, vielas e becos iluminados", type: "constraint" },
  
  // Vintage Film Grain
  { key: "film_grain_texture", label: "Textura de Grão de Filme", template: "grão de filme analógico autêntico, ruído orgânico, textura Kodak ou Fuji vintage", type: "postfx" },
  { key: "vintage_color_grade", label: "Gradação Vintage", template: "cores levemente desbotadas, tons sépia sutis, pretos elevados, brancos suavizados", type: "postfx" },
  { key: "light_leaks", label: "Vazamentos de Luz", template: "vazamentos de luz nas bordas, reflexos de lente vintage, halos suaves", type: "postfx" },
  { key: "soft_focus_edges", label: "Bordas com Foco Suave", template: "bordas levemente suavizadas, foco central nítido com fall-off suave", type: "postfx" },
  { key: "analog_authenticity", label: "Autenticidade Analógica", template: "aparência genuína de filme de 35mm, sem efeitos digitais artificiais", type: "constraint" },
  { key: "no_digital_sharpness", label: "Sem Nitidez Digital", template: "evitar nitidez excessiva, manter suavidade orgânica de filme", type: "constraint" },
  
  // Food Photography Pro
  { key: "food_hero_shot", label: "Hero Shot de Comida", template: "prato principal em destaque, apresentação gastronômica profissional, composição apetitosa", type: "subject" },
  { key: "appetizing_lighting", label: "Iluminação Apetitosa", template: "iluminação lateral suave, realce de texturas, brilho nos molhos, vapor visível se aplicável", type: "camera" },
  { key: "garnish_styling", label: "Estilização de Guarnição", template: "guarnições frescas estrategicamente posicionadas, ervas, gotas de molho, elementos decorativos", type: "subject" },
  { key: "shallow_dof", label: "Profundidade Rasa", template: "profundidade de campo muito rasa, foco seletivo no prato principal, bokeh suave no fundo", type: "camera" },
  { key: "fresh_appearance", label: "Aparência Fresca", template: "ingredientes com aparência fresca e vibrante, sem elementos murchos ou secos", type: "constraint" },
  { key: "color_vibrancy", label: "Cores Vibrantes", template: "cores naturais intensificadas, verde das folhas, vermelho dos tomates, amarelo dourado", type: "constraint" },
  
  // Dreamy Soft Glow
  { key: "soft_glow_lighting", label: "Iluminação com Brilho Suave", template: "iluminação difusa etérea, brilho suave ao redor de highlights, atmosfera onírica", type: "camera" },
  { key: "pastel_tones", label: "Tons Pastéis", template: "paleta de cores pastéis, rosa suave, azul bebê, lavanda, pêssego", type: "postfx" },
  { key: "ethereal_atmosphere", label: "Atmosfera Etérea", template: "sensação sonhadora e romântica, neblina suave, qualidade mágica", type: "style" },
  { key: "bokeh_background", label: "Fundo Bokeh", template: "bokeh circular suave no fundo, pontos de luz desfocados, separação do sujeito", type: "postfx" },
  { key: "soft_transitions", label: "Transições Suaves", template: "transições graduais entre tons, sem contrastes abruptos", type: "constraint" },
  { key: "gentle_highlights", label: "Highlights Suaves", template: "destaques luminosos gentis, sem estouros de branco", type: "constraint" },
  
  // Street Documentary
  { key: "candid_moment", label: "Momento Candid", template: "momento espontâneo capturado, pessoa não posando, ação natural em andamento", type: "subject" },
  { key: "street_environment", label: "Ambiente de Rua", template: "cenário urbano autêntico, rua movimentada, arquitetura da cidade, elementos urbanos", type: "layout" },
  { key: "natural_light", label: "Luz Natural", template: "iluminação natural disponível, luz do sol ou sombra, sem flash ou iluminação artificial", type: "camera" },
  { key: "documentary_framing", label: "Enquadramento Documental", template: "enquadramento estilo fotojornalismo, composição dinâmica, captura do momento decisivo", type: "camera" },
  { key: "unposed_authentic", label: "Não Posado Autêntico", template: "sujeito completamente inconsciente da câmera, sem direção", type: "constraint" },
  { key: "decisive_moment", label: "Momento Decisivo", template: "captura do instante perfeito, ação congelada no momento certo", type: "constraint" },
  
  // Polaroid Instant
  { key: "polaroid_frame", label: "Moldura Polaroid", template: "moldura branca característica de Polaroid, formato quadrado da imagem, bordas da foto instantânea", type: "layout" },
  { key: "instant_color_cast", label: "Cast de Cor Instantânea", template: "cast de cor característico de filme instantâneo, tons levemente esverdeados ou azulados", type: "postfx" },
  { key: "slight_blur", label: "Leve Desfoque", template: "suave imperfeição de foco típica de Polaroid, nitidez reduzida", type: "postfx" },
  { key: "vintage_saturation", label: "Saturação Vintage", template: "saturação ligeiramente reduzida, cores desbotadas nostálgicas", type: "postfx" },
  { key: "square_format", label: "Formato Quadrado", template: "proporção 1:1 quadrada, composição adaptada ao formato", type: "constraint" },
  { key: "instant_film_look", label: "Look de Filme Instantâneo", template: "textura e aparência autêntica de foto instantânea revelada", type: "constraint" },
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
  {
    key: "sensual_pose",
    label: "Pose Sensual",
    schema: { type: "select", options: ["sutil", "confiante", "provocante", "intima", "editorial_hot"] },
    effect: {
      sutil: "elegant pose with subtle sensuality, graceful body language, sophisticated allure, soft gaze",
      confiante: "confident powerful pose, strong eye contact, self-assured body language, commanding presence, empowered stance",
      provocante: "provocative seductive pose, intense gaze, arched back, expressive body language, flirtatious attitude",
      intima: "intimate close-up pose, vulnerable and inviting expression, bedroom eyes, soft lips parted, natural intimacy",
      editorial_hot: "high fashion editorial pose with sensual undertones, model-like posture, elongated limbs, striking and bold",
    },
  },
  {
    key: "sensual_scenario",
    label: "Cenário Sensual",
    schema: { type: "select", options: ["quarto", "banheiro", "piscina", "golden_hour", "estudio", "hotel_luxo"] },
    effect: {
      quarto: "intimate bedroom setting, soft bed linens, warm ambient lighting, romantic atmosphere, messy sheets",
      banheiro: "steamy bathroom environment, wet skin glistening, mirror reflections, towels and water droplets",
      piscina: "poolside setting, wet swimwear, sun-kissed skin, water reflections, summer vibes",
      golden_hour: "golden hour outdoor lighting, warm sun glow on skin, natural backlight, soft warm tones",
      estudio: "professional studio with intimate lighting, single soft light source, dark background, dramatic shadows on body",
      hotel_luxo: "luxury hotel suite, elegant interior, silk robes, champagne aesthetic, premium sophisticated setting",
    },
  },
  {
    key: "body_emphasis",
    label: "Destaque Corporal",
    schema: { type: "select", options: ["curvas", "silhueta", "textura_pele", "atletico", "natural"] },
    effect: {
      curvas: "emphasis on natural body curves, hourglass silhouette, flattering angles highlighting figure",
      silhueta: "dramatic silhouette against light, body outline, contour definition, shadow play on form",
      textura_pele: "detailed skin texture, natural skin with pores, realistic imperfections, authentic beauty",
      atletico: "athletic toned body, muscle definition, fit physique, healthy glow, strength and grace",
      natural: "natural relaxed body, unposed authentic feel, comfortable in own skin, effortless beauty",
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
