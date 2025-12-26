import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { compiler } from "./prompt-engine/compiler";
import { defaultProfiles, defaultBlueprints, defaultBlocks, defaultFilters, defaultBaseModels } from "./prompt-engine/presets";
import { 
  generateRequestSchema, 
  createUserBlueprintRequestSchema, 
  updateUserBlueprintRequestSchema,
  saveImageRequestSchema,
  saveVideoRequestSchema,
  createFilterPresetRequestSchema,
  updateFilterPresetRequestSchema,
  createVideoJobRequestSchema,
  updateProfileSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { registerLoraRoutes } from "./lora-routes";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import { fetchWithTimeout } from "./lib/fetch-with-timeout";

const DEV_USER_ID = "dev_user";
const IS_PRODUCTION = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

function getUserId(req: Request): string | null {
  const user = req.user as any;
  if (user?.claims?.sub) {
    return user.claims.sub;
  }
  // In development, allow dev_user fallback for testing
  if (!IS_PRODUCTION) {
    return DEV_USER_ID;
  }
  return null;
}

function requireAuth(req: Request, res: any): string | null {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

const IS_PRO_OVERRIDE = process.env.ADMIN_OVERRIDE === "true" || process.env.PLAN_PRO_OVERRIDE === "true";

const FREE_LIMITS = {
  promptsPerDay: 10,
  imagesHqPerDay: 5,       // Nano Banana Pro (ultra-realistic)
  imagesStandardPerDay: 5, // Realistic Vision 51 (standard) - 5 additional after HQ exhausted
  videosPerDay: 0,
};

interface ImageQuotaResult {
  allowed: boolean;
  reason?: string;
  isPro: boolean;
  modelId: string;
  imageQuality: "hq" | "standard";
  hqExhausted?: boolean;  // True when HQ quota just became exhausted (first standard image)
  quotas?: {
    hq: { used: number; limit: number };
    standard: { used: number; limit: number };
  };
}

// ModelsLab model IDs - verified from their API documentation
const MODELSLAB_MODELS = {
  HQ: "nano-banana-pro",           // Google Nano Banana Pro - best quality, 4K, multi-image fusion
  STANDARD: "realistic-vision-51", // Realistic Vision 5.1 - fallback for free tier
};

async function checkImageQuotaAndModel(userId: string): Promise<ImageQuotaResult> {
  if (IS_PRO_OVERRIDE) {
    return { allowed: true, isPro: true, modelId: MODELSLAB_MODELS.HQ, imageQuality: "hq" };
  }
  
  const appUser = await storage.getAppUser(userId);
  const isPro = appUser?.plan === "pro";
  
  if (isPro) {
    return { allowed: true, isPro: true, modelId: MODELSLAB_MODELS.HQ, imageQuality: "hq" };
  }
  
  const usage = await storage.getImageUsageTodayByQuality(userId);
  const quotas = {
    hq: { used: usage.hq, limit: FREE_LIMITS.imagesHqPerDay },
    standard: { used: usage.standard, limit: FREE_LIMITS.imagesStandardPerDay },
  };
  
  // Check HQ quota first (Realistic Vision 5.1 - best quality)
  if (usage.hq < FREE_LIMITS.imagesHqPerDay) {
    return { 
      allowed: true, 
      isPro: false, 
      modelId: MODELSLAB_MODELS.HQ, 
      imageQuality: "hq",
      quotas,
    };
  }
  
  // If HQ exhausted, check standard quota (Anything V3 - faster)
  if (usage.standard < FREE_LIMITS.imagesStandardPerDay) {
    // hqExhausted=true signals frontend to show popup about model downgrade
    const isFirstStandardImage = usage.standard === 0;
    return { 
      allowed: true, 
      isPro: false, 
      modelId: MODELSLAB_MODELS.STANDARD, 
      imageQuality: "standard",
      hqExhausted: isFirstStandardImage, // Show popup only on first standard image
      quotas,
    };
  }
  
  // Both quotas exhausted
  const totalUsed = usage.hq + usage.standard;
  const totalLimit = FREE_LIMITS.imagesHqPerDay + FREE_LIMITS.imagesStandardPerDay;
  return { 
    allowed: false, 
    reason: `Limite diário de imagens atingido (${totalUsed}/${totalLimit}). Faça upgrade para Pro para continuar.`,
    isPro: false,
    modelId: "",
    imageQuality: "standard",
    quotas,
  };
}

async function checkGenerationLimits(userId: string, type: "prompt" | "image" | "video"): Promise<{ allowed: boolean; reason?: string; isPro: boolean }> {
  if (IS_PRO_OVERRIDE) {
    return { allowed: true, isPro: true };
  }
  
  const appUser = await storage.getAppUser(userId);
  const isPro = appUser?.plan === "pro";
  
  if (isPro) {
    return { allowed: true, isPro: true };
  }
  
  // For images, use the tiered quota system
  if (type === "image") {
    const imageQuota = await checkImageQuotaAndModel(userId);
    return { 
      allowed: imageQuota.allowed, 
      reason: imageQuota.reason,
      isPro: imageQuota.isPro,
    };
  }
  
  const usageToday = await storage.getUsageToday(userId, type);
  const limit = type === "prompt" ? FREE_LIMITS.promptsPerDay : FREE_LIMITS.videosPerDay;
  
  if (usageToday >= limit) {
    const limitName = type === "prompt" ? "prompt" : "video";
    return { 
      allowed: false, 
      reason: `Daily ${limitName} limit reached (${limit}/${limit}). Upgrade to Pro for unlimited.`,
      isPro: false,
    };
  }
  
  return { allowed: true, isPro: false };
}

async function logUsage(userId: string, type: "prompt" | "image" | "video", metadata?: Record<string, any>): Promise<void> {
  await storage.logUsage(userId, type, metadata);
}

const LEGACY_FILTER_KEYS = [
  "body_type",
  "pose_style", 
  "clothing_state",
  "setting",
  "lighting",
  "skin_detail",
  "expression",
  "lighting_mood",
  "scene_setting",
  "Tipo de Corpo",
  "Estilo de Pose",
  "Estado da Roupa",
  "Cenário",
  "Iluminação",
  "Detalhe da Pele",
  "Expressão",
];

async function seedDatabase() {
  const deletedCount = await storage.deleteFiltersByKeys(LEGACY_FILTER_KEYS);
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} legacy filters from database`);
  }

  const existingProfiles = await storage.getProfiles();
  if (existingProfiles.length === 0) {
    console.log("Seeding database with initial data...");
    
    for (const profile of defaultProfiles) {
      await storage.createProfile(profile);
    }
    
    for (const blueprint of defaultBlueprints) {
      await storage.createBlueprint(blueprint);
    }
    
    for (const block of defaultBlocks) {
      await storage.createBlock(block);
    }
    
    for (const filter of defaultFilters) {
      await storage.createFilter({
        key: filter.key,
        label: filter.label,
        schema: filter.schema,
        effect: filter.effect,
        isPremium: 0,
      });
    }
    
    for (const baseModel of defaultBaseModels) {
      await storage.createBaseModel(baseModel);
    }
    
    console.log("Database seeded successfully!");
  } else {
    // Sync missing blueprints
    const existingBlueprints = await storage.getBlueprints();
    const existingBlueprintNames = new Set(existingBlueprints.map(b => b.name));
    
    for (const blueprint of defaultBlueprints) {
      if (!existingBlueprintNames.has(blueprint.name)) {
        console.log(`Adding missing blueprint: ${blueprint.name}`);
        await storage.createBlueprint(blueprint);
      }
    }
    
    // Sync missing blocks
    const existingBlocks = await storage.getBlocks();
    const existingBlockKeys = new Set(existingBlocks.map(b => b.key));
    
    for (const block of defaultBlocks) {
      if (!existingBlockKeys.has(block.key)) {
        console.log(`Adding missing block: ${block.key}`);
        await storage.createBlock(block);
      }
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup auth BEFORE other routes
  await setupAuth(app);
  registerAuthRoutes(app);
  
  await seedDatabase();

  const profiles = await storage.getProfiles();
  const blueprints = await storage.getBlueprints();
  const blocks = await storage.getBlocks();
  const filters = await storage.getFilters();
  compiler.setData(profiles, blueprints, blocks, filters);

  registerLoraRoutes(app);

  // Profile routes
  app.get("/api/profile", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      
      const user = req.user as any;
      
      if (userId === DEV_USER_ID) {
        // In dev mode, use localStorage-like behavior via a static variable
        const devTutorialCompleted = (global as any).__devTutorialCompleted ?? 0;
        return res.json({
          id: DEV_USER_ID,
          username: user?.claims?.name || "Developer",
          email: user?.claims?.email || null,
          plan: "free",
          displayName: user?.claims?.name || "Developer",
          avatarUrl: user?.claims?.profile_image || null,
          tagline: null,
          timezone: "America/Sao_Paulo",
          defaultLanguage: "pt-BR",
          defaultLlmProfileId: null,
          theme: "system",
          tutorialCompleted: devTutorialCompleted,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      let appUser = await storage.getAppUser(userId);
      
      if (!appUser) {
        // Create the user in the database on first access
        appUser = await storage.createAppUserFromReplit(
          userId,
          user?.claims?.name || "User"
        );
      }

      res.json({
        ...appUser,
        email: user?.claims?.email || null,
        avatarUrl: appUser.avatarUrl || user?.claims?.profile_image || null,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      
      const user = req.user as any;
      
      if (userId === DEV_USER_ID) {
        const data = updateProfileSchema.parse(req.body);
        // Persist tutorialCompleted in dev mode
        if (typeof data.tutorialCompleted === "number") {
          (global as any).__devTutorialCompleted = data.tutorialCompleted;
        }
        return res.json({ success: true, message: "Profile updated (dev mode)", ...data });
      }

      const data = updateProfileSchema.parse(req.body);
      
      // Check if user exists, create if not (upsert pattern)
      let appUser = await storage.getAppUser(userId);
      if (!appUser) {
        appUser = await storage.createAppUserFromReplit(
          userId,
          user?.claims?.name || "User"
        );
      }
      
      const updated = await storage.updateAppUser(userId, data);
      
      if (!updated) {
        return res.status(500).json({ error: "Failed to update profile" });
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // PATCH alias for profile updates (used by tutorial completion)
  app.patch("/api/profile", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      
      const user = req.user as any;
      
      if (userId === DEV_USER_ID) {
        const data = updateProfileSchema.parse(req.body);
        if (typeof data.tutorialCompleted === "number") {
          (global as any).__devTutorialCompleted = data.tutorialCompleted;
        }
        return res.json({ success: true, message: "Profile updated (dev mode)", ...data });
      }

      const data = updateProfileSchema.parse(req.body);
      
      let appUser = await storage.getAppUser(userId);
      if (!appUser) {
        appUser = await storage.createAppUserFromReplit(
          userId,
          user?.claims?.name || "User"
        );
      }
      
      const updated = await storage.updateAppUser(userId, data);
      
      if (!updated) {
        return res.status(500).json({ error: "Failed to update profile" });
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Avatar upload endpoint
  app.post("/api/profile/avatar", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const { imageData } = req.body;
      
      if (!imageData || typeof imageData !== "string") {
        return res.status(400).json({ error: "Image data is required" });
      }

      // Validate base64 data URL format
      const dataUrlMatch = imageData.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,/);
      if (!dataUrlMatch) {
        return res.status(400).json({ error: "Invalid image format. Use JPEG, PNG, WebP or GIF." });
      }

      // Check size (limit to ~10MB of base64 data)
      const MAX_SIZE = 10 * 1024 * 1024 * 1.37; // ~10MB accounting for base64 overhead
      if (imageData.length > MAX_SIZE) {
        return res.status(400).json({ error: "Image too large. Maximum size is 10MB." });
      }

      // Update user avatar
      const updated = await storage.updateAppUser(userId, { avatarUrl: imageData });
      
      if (!updated) {
        return res.status(500).json({ error: "Failed to update avatar" });
      }

      res.json({ success: true, avatarUrl: imageData });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Remove avatar endpoint
  app.delete("/api/profile/avatar", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const updated = await storage.updateAppUser(userId, { avatarUrl: null });
      
      if (!updated) {
        return res.status(500).json({ error: "Failed to remove avatar" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing avatar:", error);
      res.status(500).json({ error: "Failed to remove avatar" });
    }
  });

  app.get("/api/profile/usage", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      
      const history = await storage.getHistory(userId);
      const loraModels = await storage.getLoraModels(userId);
      const userBlueprints = await storage.getUserBlueprints(userId);
      const savedImages = await storage.getSavedImages(userId);
      const savedVideos = await storage.getSavedVideos(userId);
      
      let trainedLorasCount = 0;
      for (const model of loraModels) {
        const versions = await storage.getLoraVersions(model.id);
        trainedLorasCount += versions.filter(v => v.artifactUrl).length;
      }

      const today = new Date().toISOString().split("T")[0];
      const promptsToday = history.filter(h => 
        h.createdAt && h.createdAt.toISOString().split("T")[0] === today
      ).length;

      const appUser = await storage.getAppUser(userId);
      const plan = IS_PRO_OVERRIDE ? "pro" : (appUser?.plan || "free");
      const isPro = IS_PRO_OVERRIDE || plan === "pro";

      const imageUsageByQuality = await storage.getImageUsageTodayByQuality(userId);
      const videosUsedToday = await storage.getUsageToday(userId, "video");
      const promptsUsedToday = await storage.getUsageToday(userId, "prompt");
      
      const totalImagesUsed = imageUsageByQuality.hq + imageUsageByQuality.standard;
      const totalImagesLimit = FREE_LIMITS.imagesHqPerDay + FREE_LIMITS.imagesStandardPerDay;

      res.json({
        totalPromptsGenerated: history.length,
        promptsToday,
        totalImagesGenerated: savedImages.length,
        totalVideosGenerated: savedVideos.length,
        blueprintsSaved: userBlueprints.length,
        loraModelsTrained: trainedLorasCount,
        plan,
        isPro,
        daily: {
          prompts: { used: promptsUsedToday, limit: isPro ? -1 : FREE_LIMITS.promptsPerDay },
          images: { 
            used: totalImagesUsed, 
            limit: isPro ? -1 : totalImagesLimit,
            hq: { 
              used: imageUsageByQuality.hq, 
              limit: isPro ? -1 : FREE_LIMITS.imagesHqPerDay,
              model: MODELSLAB_MODELS.HQ,
              label: "Nano Banana Pro (HQ)",
            },
            standard: { 
              used: imageUsageByQuality.standard, 
              limit: isPro ? -1 : FREE_LIMITS.imagesStandardPerDay,
              model: MODELSLAB_MODELS.STANDARD,
              label: "Realistic Vision 5.1 (Standard)",
            },
          },
          videos: { used: videosUsedToday, limit: isPro ? -1 : FREE_LIMITS.videosPerDay },
        },
        limits: {
          free: {
            promptsPerDay: FREE_LIMITS.promptsPerDay,
            imagesHqPerDay: FREE_LIMITS.imagesHqPerDay,
            imagesStandardPerDay: FREE_LIMITS.imagesStandardPerDay,
            videosPerDay: FREE_LIMITS.videosPerDay,
            maxFilters: 3,
            maxBlueprints: 5,
            loraTraining: false,
          },
          pro: {
            promptsPerDay: -1,
            imagesHqPerDay: -1,
            imagesStandardPerDay: -1,
            videosPerDay: -1,
            maxFilters: -1,
            maxBlueprints: -1,
            loraTraining: true,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  app.get("/api/profiles", async (_req, res) => {
    try {
      const profiles = await storage.getProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  app.get("/api/blueprints", async (_req, res) => {
    try {
      const blueprints = await storage.getBlueprints();
      res.json(blueprints);
    } catch (error) {
      console.error("Error fetching blueprints:", error);
      res.status(500).json({ error: "Failed to fetch blueprints" });
    }
  });

  app.get("/api/filters", async (_req, res) => {
    try {
      const filters = await storage.getFilters();
      res.json(filters);
    } catch (error) {
      console.error("Error fetching filters:", error);
      res.status(500).json({ error: "Failed to fetch filters" });
    }
  });

  app.get("/api/history", async (_req, res) => {
    try {
      const history = await storage.getHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/generate", async (req, res) => {
    try {
      const rateLimitKey = req.ip || "anonymous";
      const isAdminOverride = process.env.ADMIN_OVERRIDE === "true";
      
      const freeGenerationsPerDay = 3;
      const freeFilterLimit = 3;
      
      if (!isAdminOverride) {
        const canProceed = await storage.checkRateLimit(rateLimitKey, freeGenerationsPerDay, 24 * 60 * 60 * 1000);
        if (!canProceed) {
          return res.status(429).json({ 
            error: "Daily generation limit reached. Upgrade to Pro for unlimited generations.",
            isPremiumRequired: true
          });
        }
      }

      const validated = generateRequestSchema.parse(req.body);
      
      if (!isAdminOverride) {
        const premiumFilters = await storage.getFilters();
        const premiumFilterKeys = premiumFilters.filter(f => f.isPremium === 1).map(f => f.key);
        const appliedPremiumFilters = Object.keys(validated.filters).filter(k => premiumFilterKeys.includes(k));
        
        if (appliedPremiumFilters.length > 0) {
          return res.status(403).json({ 
            error: `Premium filters detected: ${appliedPremiumFilters.join(", ")}. Upgrade to Pro to use these filters.`,
            isPremiumRequired: true
          });
        }
        
        if (Object.keys(validated.filters).length > freeFilterLimit) {
          return res.status(403).json({ 
            error: `Free plan limited to ${freeFilterLimit} filters. Upgrade to Pro for unlimited filters.`,
            isPremiumRequired: true
          });
        }
      }

      const latestProfiles = await storage.getProfiles();
      const latestBlueprints = await storage.getBlueprints();
      const latestBlocks = await storage.getBlocks();
      const latestFilters = await storage.getFilters();
      compiler.setData(latestProfiles, latestBlueprints, latestBlocks, latestFilters);

      // Handle user blueprints - convert to virtual system blueprint format
      let effectiveBlueprintId = validated.blueprintId || "";
      if (validated.userBlueprintId) {
        const userBlueprint = await storage.getUserBlueprint(validated.userBlueprintId);
        if (!userBlueprint) {
          return res.status(400).json({ error: "User blueprint not found" });
        }
        // Get the latest version to access blocks and constraints
        const latestVersion = await storage.getUserBlueprintLatestVersion(validated.userBlueprintId);
        if (!latestVersion) {
          return res.status(400).json({ error: "User blueprint has no versions" });
        }
        // Register user blueprint in compiler as a virtual system blueprint
        compiler.registerUserBlueprint({
          id: userBlueprint.id,
          name: userBlueprint.name,
          description: userBlueprint.description || "",
          category: userBlueprint.category,
          blocks: latestVersion.blocks as string[],
          constraints: latestVersion.constraints as string[],
        });
        effectiveBlueprintId = userBlueprint.id;
      }

      // Always reset LoRA state before each request to prevent leaking between requests
      compiler.setActiveLora(null);
      
      // Activate LoRA if provided and valid
      if (validated.loraVersionId) {
        const loraVersion = await storage.getLoraVersion(validated.loraVersionId);
        if (!loraVersion) {
          return res.status(400).json({ error: "LoRA version not found" });
        }
        if (!loraVersion.artifactUrl) {
          return res.status(400).json({ error: "LoRA version not trained yet" });
        }
        const loraModel = await storage.getLoraModel(loraVersion.loraModelId);
        compiler.setActiveLora({
          version: loraVersion,
          weight: validated.loraWeight || 1,
          triggerWord: loraModel?.name?.toLowerCase().replace(/\s+/g, "_") || "custom_style",
          modelName: loraModel?.name || "Custom Model",
        });
      }

      // Merge cinematicSettings into filters for unified processing
      const cinematicFilters: Record<string, string> = {};
      const cinematicModifiers: string[] = [];
      
      if (validated.cinematicSettings) {
        const cs = validated.cinematicSettings;
        
        // Optics settings
        if (cs.optics?.style && cs.optics.style !== "cinematic") {
          const opticsMap: Record<string, string> = {
            "smartphone": "smartphone real-life photo, authentic mobile photography",
            "iphone-hdr": "iPhone HDR max photo, vibrant colors, dynamic range",
            "realistic-raw": "realistic RAW photo, unprocessed, natural",
            "forensic-dslr": "forensic DSLR, sharp focus, clinical precision",
          };
          if (opticsMap[cs.optics.style]) {
            cinematicModifiers.push(opticsMap[cs.optics.style]);
            cinematicFilters["camera_style"] = cs.optics.style;
          }
        }
        
        // VFX effects
        if (cs.vfx?.effects && cs.vfx.effects.length > 0) {
          const vfxMap: Record<string, string> = {
            "vhs": "VHS tape effect, retro analog distortion, chromatic aberration",
            "35mm": "35mm film grain, analog texture, cinematic warmth",
            "nvg": "night vision green tint, military thermal imaging",
            "cine": "cinematic color grading, anamorphic lens flares",
            "gltch": "digital glitch effect, data corruption aesthetic",
            "blum": "bloom lighting effect, ethereal glow, soft highlights",
            "grain": "film grain texture, subtle noise, analog feel",
            "leak": "light leak effect, vintage photography, warm light streaks",
            "scan": "scan lines overlay, CRT monitor effect, retro display",
            "noir": "noir black and white, dramatic shadows, film noir",
            "teal": "teal and orange color grading, Hollywood blockbuster look",
          };
          const intensity = cs.vfx.intensity || 3;
          const intensityPrefix = intensity >= 4 ? "strong " : intensity <= 1 ? "subtle " : "";
          
          cs.vfx.effects.forEach(effect => {
            if (effect !== "off" && vfxMap[effect]) {
              cinematicModifiers.push(`${intensityPrefix}${vfxMap[effect]}`);
              cinematicFilters[`vfx_${effect}`] = String(intensity);
            }
          });
        }
        
        // Style DNA
        if (cs.styleDna) {
          if (cs.styleDna.brand && cs.styleDna.brand !== "auto") {
            const brandMap: Record<string, string> = {
              "streetwear": "streetwear urban aesthetic, casual street style",
              "luxury": "luxury high fashion, premium sophisticated look",
              "minimalist": "minimalist clean design, understated elegance",
              "vintage": "vintage retro aesthetic, timeless classic style",
              "techwear": "techwear futuristic functional, technical fashion",
            };
            if (brandMap[cs.styleDna.brand]) {
              cinematicModifiers.push(brandMap[cs.styleDna.brand]);
              cinematicFilters["style_brand"] = cs.styleDna.brand;
            }
          }
          
          if (cs.styleDna.fit && cs.styleDna.fit !== "regular") {
            const fitMap: Record<string, string> = {
              "oversized": "oversized relaxed fit clothing",
              "relaxed": "relaxed comfortable fit",
              "slim": "slim fitted silhouette",
              "tailored": "tailored bespoke fit, precision tailoring",
            };
            if (fitMap[cs.styleDna.fit]) {
              cinematicModifiers.push(fitMap[cs.styleDna.fit]);
              cinematicFilters["style_fit"] = cs.styleDna.fit;
            }
          }
        }
      }
      
      // Merge cinematic filters with user filters
      const mergedFilters = { ...validated.filters, ...cinematicFilters };

      const compileInput = {
        profileId: validated.profileId,
        blueprintId: effectiveBlueprintId,
        filters: mergedFilters,
        seed: validated.seed || "",
        subject: validated.subject,
        context: validated.context,
        items: validated.items,
        environment: validated.environment,
        restrictions: validated.restrictions,
      };

      // Check if target platform needs Character Pack instead of LoRA syntax
      let characterPack = null;
      const loraSupportingPlatforms = ["flux", "sdxl", "stable_diffusion", "sd1.5", "sd_1.5"];
      const targetPlatform = validated.targetPlatform?.toLowerCase() || "";
      const platformSupportsLora = loraSupportingPlatforms.some(p => targetPlatform.includes(p));
      
      if (validated.loraVersionId && validated.targetPlatform && !platformSupportsLora) {
        // Generate Character Pack for non-LoRA platforms
        characterPack = compiler.generateCharacterPack(compileInput, validated.targetPlatform);
        // Clear LoRA so it doesn't inject syntax into the prompt
        compiler.setActiveLora(null);
      }

      let result = compiler.compile(compileInput);
      
      // Append cinematic modifiers to compiled prompt if any
      if (cinematicModifiers.length > 0) {
        result = {
          ...result,
          compiledPrompt: `${result.compiledPrompt}\n\nCinematic Enhancement: ${cinematicModifiers.join(", ")}`,
          metadata: {
            ...result.metadata,
            filterCount: result.metadata.filterCount + cinematicModifiers.length,
          },
        };
      }

      const savedPrompt = await storage.createGeneratedPrompt({
        userId: null,
        profileId: validated.profileId,
        blueprintId: validated.blueprintId || null,
        userBlueprintId: validated.userBlueprintId || null,
        seed: result.seed,
        input: {
          subject: validated.subject,
          context: validated.context,
          items: validated.items,
          environment: validated.environment,
          restrictions: validated.restrictions,
        },
        appliedFilters: validated.filters,
        compiledPrompt: result.compiledPrompt,
        metadata: result.metadata,
        score: result.score,
        warnings: result.warnings,
      });

      await storage.incrementRateLimit(rateLimitKey);

      // Include Character Pack if generated
      const response: Record<string, unknown> = { ...savedPrompt };
      if (characterPack) {
        response.characterPack = characterPack;
      }

      res.json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error generating prompt:", error);
      res.status(500).json({ error: "Failed to generate prompt" });
    }
  });

  app.post("/api/save-version", async (req, res) => {
    try {
      const { promptId } = req.body;
      
      if (!promptId) {
        return res.status(400).json({ error: "promptId is required" });
      }

      const prompt = await storage.getGeneratedPrompt(promptId);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }

      const existingVersions = await storage.getVersions(promptId);
      const nextVersion = existingVersions.length + 1;

      const version = await storage.createPromptVersion({
        generatedPromptId: promptId,
        version: nextVersion,
        compiledPrompt: prompt.compiledPrompt,
        metadata: prompt.metadata as Record<string, unknown>,
      });

      res.json(version);
    } catch (error) {
      console.error("Error saving version:", error);
      res.status(500).json({ error: "Failed to save version" });
    }
  });

  app.get("/api/prompt/:id", async (req, res) => {
    try {
      const prompt = await storage.getGeneratedPrompt(req.params.id);
      if (!prompt) {
        return res.status(404).json({ error: "Prompt not found" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({ error: "Failed to fetch prompt" });
    }
  });

  app.get("/api/prompt/:id/versions", async (req, res) => {
    try {
      const versions = await storage.getVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching versions:", error);
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  // User Custom Blueprints API
  const FREE_BLUEPRINT_LIMIT = 2;

  app.get("/api/user-blueprints", async (_req, res) => {
    try {
      const userId = DEV_USER_ID;
      const blueprints = await storage.getUserBlueprints(userId);
      
      const blueprintsWithVersions = await Promise.all(
        blueprints.map(async (bp) => {
          const latestVersion = await storage.getUserBlueprintLatestVersion(bp.id);
          return {
            ...bp,
            blocks: latestVersion?.blocks || [],
            constraints: latestVersion?.constraints || [],
          };
        })
      );
      
      res.json(blueprintsWithVersions);
    } catch (error) {
      console.error("Error fetching user blueprints:", error);
      res.status(500).json({ error: "Failed to fetch user blueprints" });
    }
  });

  app.get("/api/user-blueprints/:id", async (req, res) => {
    try {
      const userId = DEV_USER_ID;
      const blueprint = await storage.getUserBlueprint(req.params.id);
      
      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }
      
      if (blueprint.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const latestVersion = await storage.getUserBlueprintLatestVersion(blueprint.id);
      
      res.json({
        ...blueprint,
        blocks: latestVersion?.blocks || [],
        constraints: latestVersion?.constraints || [],
      });
    } catch (error) {
      console.error("Error fetching user blueprint:", error);
      res.status(500).json({ error: "Failed to fetch user blueprint" });
    }
  });

  app.post("/api/user-blueprints", async (req, res) => {
    try {
      const userId = DEV_USER_ID;
      const isAdminOverride = process.env.ADMIN_OVERRIDE === "true";
      
      if (!isAdminOverride) {
        const count = await storage.countUserBlueprints(userId);
        if (count >= FREE_BLUEPRINT_LIMIT) {
          return res.status(403).json({
            error: `Free plan limited to ${FREE_BLUEPRINT_LIMIT} custom blueprints. Upgrade to Pro for unlimited.`,
            isPremiumRequired: true,
          });
        }
      }
      
      const validated = createUserBlueprintRequestSchema.parse(req.body);
      
      const allBlocks = await storage.getBlocks();
      const validBlockKeys = allBlocks.map(b => b.key);
      const invalidBlocks = validated.blocks.filter(b => !validBlockKeys.includes(b));
      
      if (invalidBlocks.length > 0) {
        return res.status(400).json({
          error: `Invalid block keys: ${invalidBlocks.join(", ")}`,
        });
      }
      
      const result = await storage.createUserBlueprint(
        {
          userId,
          name: validated.name,
          description: validated.description || null,
          category: validated.category,
          tags: validated.tags,
          compatibleProfiles: validated.compatibleProfiles,
          isActive: 1,
        },
        validated.blocks,
        validated.constraints
      );
      
      res.json({
        ...result.blueprint,
        blocks: result.version.blocks,
        constraints: result.version.constraints,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error creating user blueprint:", error);
      res.status(500).json({ error: "Failed to create user blueprint" });
    }
  });

  app.patch("/api/user-blueprints/:id", async (req, res) => {
    try {
      const userId = DEV_USER_ID;
      const validated = updateUserBlueprintRequestSchema.parse(req.body);
      
      if (validated.blocks) {
        const allBlocks = await storage.getBlocks();
        const validBlockKeys = allBlocks.map(b => b.key);
        const invalidBlocks = validated.blocks.filter(b => !validBlockKeys.includes(b));
        
        if (invalidBlocks.length > 0) {
          return res.status(400).json({
            error: `Invalid block keys: ${invalidBlocks.join(", ")}`,
          });
        }
      }
      
      const result = await storage.updateUserBlueprint(
        req.params.id,
        userId,
        {
          name: validated.name,
          description: validated.description,
          category: validated.category,
          tags: validated.tags,
          compatibleProfiles: validated.compatibleProfiles,
        },
        validated.blocks,
        validated.constraints
      );
      
      if (!result) {
        return res.status(404).json({ error: "Blueprint not found or access denied" });
      }
      
      res.json({
        ...result.blueprint,
        blocks: result.version.blocks,
        constraints: result.version.constraints,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error updating user blueprint:", error);
      res.status(500).json({ error: "Failed to update user blueprint" });
    }
  });

  app.delete("/api/user-blueprints/:id", async (req, res) => {
    try {
      const userId = DEV_USER_ID;
      const deleted = await storage.deleteUserBlueprint(req.params.id, userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Blueprint not found or access denied" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user blueprint:", error);
      res.status(500).json({ error: "Failed to delete user blueprint" });
    }
  });

  app.get("/api/user-blueprints/:id/versions", async (req, res) => {
    try {
      const userId = DEV_USER_ID;
      const blueprint = await storage.getUserBlueprint(req.params.id);
      
      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }
      
      if (blueprint.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const versions = await storage.getUserBlueprintVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching blueprint versions:", error);
      res.status(500).json({ error: "Failed to fetch blueprint versions" });
    }
  });

  app.post("/api/user-blueprints/:id/duplicate", async (req, res) => {
    try {
      const userId = DEV_USER_ID;
      const isAdminOverride = process.env.ADMIN_OVERRIDE === "true";
      
      if (!isAdminOverride) {
        const count = await storage.countUserBlueprints(userId);
        if (count >= FREE_BLUEPRINT_LIMIT) {
          return res.status(403).json({
            error: `Free plan limited to ${FREE_BLUEPRINT_LIMIT} custom blueprints. Upgrade to Pro for unlimited.`,
            isPremiumRequired: true,
          });
        }
      }
      
      const blueprint = await storage.getUserBlueprint(req.params.id);
      
      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }
      
      if (blueprint.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const latestVersion = await storage.getUserBlueprintLatestVersion(blueprint.id);
      
      const result = await storage.createUserBlueprint(
        {
          userId,
          name: `${blueprint.name} (Copy)`,
          description: blueprint.description,
          category: blueprint.category,
          tags: blueprint.tags,
          compatibleProfiles: blueprint.compatibleProfiles,
          isActive: 1,
        },
        latestVersion?.blocks || [],
        latestVersion?.constraints || []
      );
      
      res.json({
        ...result.blueprint,
        blocks: result.version.blocks,
        constraints: result.version.constraints,
      });
    } catch (error) {
      console.error("Error duplicating blueprint:", error);
      res.status(500).json({ error: "Failed to duplicate blueprint" });
    }
  });

  app.get("/api/blocks", async (_req, res) => {
    try {
      const blocks = await storage.getBlocks();
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching blocks:", error);
      res.status(500).json({ error: "Failed to fetch blocks" });
    }
  });

  // Validate custom API key (Premium only)
  app.post("/api/validate-custom-key", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      
      const appUser = await storage.getAppUser(userId);
      if (!appUser || appUser.plan !== "pro") {
        return res.status(403).json({ error: "Premium feature only" });
      }

      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }

      // Test the key with a minimal API call to check if it's valid
      try {
        const testResponse = await fetch("https://modelslab.com/api/v6/images/text2img", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: apiKey,
            prompt: "test validation",
            width: "64",
            height: "64",
            samples: "1",
            num_inference_steps: "1",
          }),
        });
        
        if (!testResponse.ok && testResponse.status >= 500) {
          // Server error - cannot determine key validity
          return res.status(503).json({ 
            valid: false, 
            error: "ModelsLab service temporarily unavailable",
            transient: true
          });
        }
        
        const testData = await testResponse.json() as { status?: string; message?: string };
        
        // Check for explicit invalid key message
        if (testData.status === "error") {
          const msg = (testData.message || "").toLowerCase();
          if (msg.includes("invalid") || msg.includes("api key") || msg.includes("unauthorized")) {
            return res.status(400).json({ valid: false, error: "Invalid API key" });
          }
          // Other errors (rate limit, quota, etc.) mean the key exists but has issues
          return res.status(400).json({ 
            valid: false, 
            error: testData.message || "API key validation failed",
            transient: false
          });
        }
        
        // Key is valid (status is success or processing)
        res.json({ valid: true });
      } catch (networkError) {
        console.error("Network error validating API key:", networkError);
        res.status(503).json({ 
          valid: false, 
          error: "Could not connect to ModelsLab service",
          transient: true
        });
      }
    } catch (error) {
      console.error("Error validating custom key:", error);
      res.status(500).json({ error: "Failed to validate key" });
    }
  });

  // ModelsLab Image Generation API (Nano Banana Pro for HQ, Realistic Vision 51 for Standard)
  app.post("/api/modelslab/generate", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const imageQuota = await checkImageQuotaAndModel(userId);
      if (!imageQuota.allowed) {
        return res.status(403).json({ 
          error: imageQuota.reason,
          isPremiumRequired: true,
          quotas: imageQuota.quotas,
        });
      }

      const { prompt, images, aspectRatio } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "At least one image is required" });
      }
      
      const apiKey = process.env.MODELSLAB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "ModelsLab API key not configured" });
      }
      
      // Nano Banana Pro accepts images as URLs or base64 data URLs directly
      // Keep the full data URL format for base64 images
      const processedImages = images.map((img: string) => {
        if (typeof img !== 'string') return '';
        return img;
      }).filter((img: string) => img.length > 0);
      
      if (processedImages.length === 0) {
        return res.status(400).json({ error: "No valid images provided" });
      }
      
      // Nano Banana Pro v7 API - supports up to 14 images with multi-image fusion
      // Valid aspect ratios: 1:1, 9:16, 2:3, 3:4, 4:5, 5:4, 4:3, 3:2, 16:9, 21:9
      const validRatios = ["1:1", "9:16", "2:3", "3:4", "4:5", "5:4", "4:3", "3:2", "16:9", "21:9"];
      const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";
      
      // Calculate dimensions respecting ModelsLab's max 1024px limit while maintaining aspect ratio
      const getDimensions = (ratio: string): { width: string; height: string } => {
        switch (ratio) {
          case "16:9":
            return { width: "1024", height: "576" };
          case "9:16":
            return { width: "576", height: "1024" };
          case "4:3":
            return { width: "1024", height: "768" };
          case "3:4":
            return { width: "768", height: "1024" };
          case "3:2":
            return { width: "1024", height: "683" };
          case "2:3":
            return { width: "683", height: "1024" };
          case "5:4":
            return { width: "1024", height: "819" };
          case "4:5":
            return { width: "819", height: "1024" };
          case "21:9":
            return { width: "1024", height: "439" };
          case "1:1":
          default:
            return { width: "1024", height: "1024" };
        }
      };
      
      const dimensions = getDimensions(selectedRatio);
      
      // Use only the first image - ModelsLab image-to-image expects a single init_image
      let initImage = processedImages[0];
      
      // Truncate prompt to API max length (2000 chars)
      const truncatedPrompt = prompt.length > 2000 ? prompt.substring(0, 2000) : prompt;
      
      // Check if it's a base64 data URL and extract just the base64 content
      const isBase64 = initImage.startsWith("data:");
      if (isBase64) {
        // Extract just the base64 content (remove "data:image/...;base64," prefix)
        const base64Match = initImage.match(/^data:image\/[^;]+;base64,(.+)$/);
        if (base64Match) {
          initImage = base64Match[1];
        }
      }
      
      // Select model based on quota check (HQ = nano-banana-pro, Standard = realistic-vision-51)
      const selectedModel = imageQuota.modelId;
      const isHqModel = imageQuota.imageQuality === "hq";
      const isNanoBananaPro = selectedModel === "nano-banana-pro";
      
      // Nano Banana Pro uses v7 API with different parameters
      let requestBody: any;
      let apiEndpoint: string;
      
      if (isNanoBananaPro) {
        // Nano Banana Pro - v7 API with multi-image fusion support
        // Convert aspect ratio to Nano Banana format
        const aspectRatioMap: Record<string, string> = {
          "1:1": "1:1",
          "16:9": "16:9",
          "9:16": "9:16",
          "4:3": "4:3",
          "3:4": "3:4",
          "5:4": "4:3",
          "4:5": "3:4",
          "21:9": "16:9",
        };
        const nanoBananaRatio = aspectRatioMap[selectedRatio] || "1:1";
        
        requestBody = {
          key: apiKey,
          model_id: "nano-banana-pro",
          prompt: truncatedPrompt,
          init_image: processedImages, // Array of images for multi-image fusion
          aspect_ratio: nanoBananaRatio,
        };
        apiEndpoint = "https://modelslab.com/api/v7/images/image-to-image";
      } else {
        // Realistic Vision 5.1 - v6 API (standard fallback)
        requestBody = {
          key: apiKey,
          model_id: selectedModel,
          prompt: truncatedPrompt,
          negative_prompt: "bad quality, blurry, distorted, low resolution, watermark, text",
          init_image: initImage,
          base64: isBase64 ? "yes" : "no",
          width: dimensions.width,
          height: dimensions.height,
          samples: "1",
          num_inference_steps: "30",
          safety_checker: "no",
          enhance_prompt: "no",
          guidance_scale: 7.5,
          strength: 0.7,
          scheduler: "UniPCMultistepScheduler",
        };
        apiEndpoint = "https://modelslab.com/api/v6/images/img2img";
      }
      
      console.log(`Sending to ModelsLab ${isNanoBananaPro ? 'v7 Nano Banana Pro' : 'v6 img2img'} (${selectedModel} - ${imageQuota.imageQuality}):`, { 
        ...requestBody, 
        key: "[REDACTED]",
        init_image: isNanoBananaPro ? `[${processedImages.length} images]` : `[image: ${initImage.substring(0, 50)}...]`,
        prompt: `[${truncatedPrompt.length} chars]`,
      });
      
      const response = await fetchWithTimeout(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }, 90000); // 90s timeout for Nano Banana Pro (larger model)
      
      const data = await response.json();
      
      if (data.status === "error") {
        console.error("ModelsLab error:", data);
        return res.status(400).json({ error: data.message || "ModelsLab API error" });
      }
      
      // Process base64 URLs if present - convert them to proper data URLs
      if (data.status === "success" && data.output && Array.isArray(data.output)) {
        const processedOutput: string[] = [];
        for (const url of data.output) {
          if (typeof url === 'string' && url.endsWith('.base64')) {
            try {
              // Fetch the base64 content from the file
              const base64Response = await fetchWithTimeout(url, {
                method: "GET",
              }, 30000);
              const base64Content = await base64Response.text();
              const cleanBase64 = base64Content.trim();
              
              // Detect image type from base64 header
              let mimeType = 'image/png';
              if (cleanBase64.startsWith('/9j/')) {
                mimeType = 'image/jpeg';
              } else if (cleanBase64.startsWith('iVBOR')) {
                mimeType = 'image/png';
              }
              processedOutput.push(`data:${mimeType};base64,${cleanBase64}`);
            } catch (err) {
              console.error('Failed to fetch base64 content:', err);
              processedOutput.push(url); // Fallback to original
            }
          } else {
            processedOutput.push(url);
          }
        }
        data.output = processedOutput;
      }
      
      await logUsage(userId, "image", { 
        imageQuality: imageQuota.imageQuality, 
        modelId: selectedModel,
      });
      
      // Include quota info and model used in response
      res.json({
        ...data,
        modelUsed: selectedModel,
        imageQuality: imageQuota.imageQuality,
        hqExhausted: imageQuota.hqExhausted || false,
        quotas: imageQuota.quotas,
      });
    } catch (error) {
      console.error("Error calling ModelsLab API:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  // Check generation status (for async generation)
  // Security: Only allow fetching from trusted ModelsLab domains
  const ALLOWED_MODELSLAB_HOSTS = [
    "modelslab.com",
    "api.modelslab.com",
    "stablediffusionapi.com",
  ];
  
  app.post("/api/modelslab/status", async (req, res) => {
    try {
      const { fetchUrl } = req.body;
      
      if (!fetchUrl) {
        return res.status(400).json({ error: "Fetch URL is required" });
      }
      
      // Validate URL is from trusted ModelsLab domain
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(fetchUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }
      
      const isAllowedHost = ALLOWED_MODELSLAB_HOSTS.some(
        host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
      );
      
      if (!isAllowedHost) {
        console.warn(`Blocked SSRF attempt to: ${parsedUrl.hostname}`);
        return res.status(403).json({ error: "URL not from trusted ModelsLab domain" });
      }
      
      const apiKey = process.env.MODELSLAB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "ModelsLab API key not configured" });
      }
      
      const response = await fetchWithTimeout(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
        }),
      }, 30000); // 30s timeout for status check
      
      const data = await response.json();
      
      // Process base64 URLs if present - convert them to proper data URLs
      if (data.status === "success" && data.output && Array.isArray(data.output)) {
        const processedOutput: string[] = [];
        for (const url of data.output) {
          if (typeof url === 'string' && url.endsWith('.base64')) {
            try {
              // Fetch the base64 content from the file
              const base64Response = await fetchWithTimeout(url, {
                method: "GET",
              }, 30000);
              const base64Content = await base64Response.text();
              const cleanBase64 = base64Content.trim();
              
              // Detect image type from base64 header
              let mimeType = 'image/png';
              if (cleanBase64.startsWith('/9j/')) {
                mimeType = 'image/jpeg';
              } else if (cleanBase64.startsWith('iVBOR')) {
                mimeType = 'image/png';
              }
              processedOutput.push(`data:${mimeType};base64,${cleanBase64}`);
            } catch (err) {
              console.error('Failed to fetch base64 content:', err);
              processedOutput.push(url); // Fallback to original
            }
          } else {
            processedOutput.push(url);
          }
        }
        data.output = processedOutput;
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error checking ModelsLab status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  // ============ IMAGE-TO-VIDEO GENERATION ============
  // Uses ModelsLab Wan 2.1 I2V model for high quality video from any image
  app.post("/api/sora2/generate", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const limitCheck = await checkGenerationLimits(userId, "video");
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          error: limitCheck.reason,
          isPremiumRequired: true,
        });
      }

      const { prompt, imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required for video generation" });
      }
      
      const apiKey = process.env.MODELSLAB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "ModelsLab API key not configured" });
      }
      
      console.log("=== Image-to-Video Generation (Wan 2.1) ===");
      console.log("Input image:", imageUrl);
      
      // Use Wan 2.1 I2V model - max height is 512px per API requirement
      const requestBody = {
        key: apiKey,
        model_id: "wan-2.1-i2v",
        init_image: imageUrl,
        prompt: prompt || "Cinematic video with natural smooth movement, professional cinematography, hyper-realistic",
        negative_prompt: "low quality, blurry, distorted, amateur, static, frozen",
        height: 512,
        width: 512,
        num_frames: 81,
        fps: 16,
        guidance_scale: 5,
        num_inference_steps: 30,
      };
      
      console.log("Wan 2.1 I2V request:", { 
        ...requestBody, 
        key: "[REDACTED]"
      });
      
      const response = await fetchWithTimeout("https://modelslab.com/api/v6/video/img2video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }, 90000); // 90s timeout for video generation
      
      const data = await response.json();
      console.log("Wan 2.1 I2V response:", data);
      
      res.json(data);
    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ error: "Failed to generate video" });
    }
  });

  app.post("/api/sora2/status", async (req, res) => {
    try {
      const { fetchUrl } = req.body;
      
      if (!fetchUrl) {
        return res.status(400).json({ error: "Fetch URL is required" });
      }
      
      // Validate URL is from trusted ModelsLab domain
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(fetchUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }
      
      const isAllowedHost = ALLOWED_MODELSLAB_HOSTS.some(
        host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
      );
      
      if (!isAllowedHost) {
        console.warn(`Blocked SSRF attempt to: ${parsedUrl.hostname}`);
        return res.status(403).json({ error: "URL not from trusted ModelsLab domain" });
      }
      
      const apiKey = process.env.MODELSLAB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "ModelsLab API key not configured" });
      }
      
      const response = await fetchWithTimeout(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
        }),
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error checking Sora 2 status:", error);
      res.status(500).json({ error: "Failed to check video status" });
    }
  });

  // ============ VIDEO GENERATION (Job System) ============
  app.post("/api/videogen/jobs", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const limitCheck = await checkGenerationLimits(userId, "video");
      if (!limitCheck.allowed) {
        return res.status(403).json({ 
          error: limitCheck.reason,
          isPremiumRequired: true,
        });
      }

      const validated = createVideoJobRequestSchema.parse(req.body);
      
      const { createVideoJob } = await import("./videogen/service");
      const result = await createVideoJob(userId, validated);
      
      if (result.success) {
        await logUsage(userId, "video");
        const job = await storage.getVideoJob(result.jobId!);
        res.status(201).json(job);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error creating video job:", error);
      res.status(500).json({ error: "Failed to create video job" });
    }
  });

  app.get("/api/videogen/jobs", async (_req, res) => {
    try {
      const jobs = await storage.getVideoJobs(DEV_USER_ID);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching video jobs:", error);
      res.status(500).json({ error: "Failed to fetch video jobs" });
    }
  });

  app.get("/api/videogen/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getVideoJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      if (job.status === "processing" && job.providerJobId) {
        const { pollVideoJob } = await import("./videogen/service");
        await pollVideoJob(job);
        const updatedJob = await storage.getVideoJob(req.params.id);
        return res.json(updatedJob);
      }
      
      res.json(job);
    } catch (error) {
      console.error("Error fetching video job:", error);
      res.status(500).json({ error: "Failed to fetch video job" });
    }
  });

  // ============ SAVED IMAGES (Gallery) ============
  app.get("/api/gallery", async (_req, res) => {
    try {
      const images = await storage.getSavedImages(DEV_USER_ID);
      res.json(images);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  });

  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const image = await storage.getSavedImage(req.params.id);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.json(image);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ error: "Failed to fetch image" });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const validated = saveImageRequestSchema.parse(req.body);
      const image = await storage.createSavedImage({
        ...validated,
        userId: DEV_USER_ID,
        isFavorite: 0,
      });
      res.status(201).json(image);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error saving image:", error);
      res.status(500).json({ error: "Failed to save image" });
    }
  });

  app.patch("/api/gallery/:id/favorite", async (req, res) => {
    try {
      const updated = await storage.toggleFavorite(req.params.id, DEV_USER_ID);
      if (!updated) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      const success = await storage.deleteSavedImage(req.params.id, DEV_USER_ID);
      if (!success) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // ============ VIDEO/MEDIA PROXY (for CORS) ============
  // Proxy endpoint to serve R2 videos without CORS issues
  app.get("/api/proxy/media", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL parameter required" });
      }

      // Only allow proxying from our R2 bucket
      const allowedDomains = [
        "pub-3626123a908346a7a8be8d9295f44e26.r2.dev",
        "modelslab.com",
        "cdn.modelslab.com",
        "cdn2.stablediffusionapi.com",
      ];
      
      const parsedUrl = new URL(url);
      if (!allowedDomains.some(d => parsedUrl.hostname.includes(d))) {
        return res.status(403).json({ error: "Domain not allowed" });
      }

      const response = await fetchWithTimeout(url, {}, 60000);
      
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch media" });
      }

      // Forward content type and other headers
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      
      // Allow caching
      res.setHeader("Cache-Control", "public, max-age=86400");
      
      // Stream the response
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Error proxying media:", error);
      res.status(500).json({ error: "Failed to proxy media" });
    }
  });

  // ============ SAVED VIDEOS (Video Gallery) ============
  app.get("/api/video-gallery", async (_req, res) => {
    try {
      const videos = await storage.getSavedVideos(DEV_USER_ID);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching video gallery:", error);
      res.status(500).json({ error: "Failed to fetch video gallery" });
    }
  });

  app.get("/api/video-gallery/:id", async (req, res) => {
    try {
      const video = await storage.getSavedVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  app.post("/api/video-gallery", async (req, res) => {
    try {
      const validated = saveVideoRequestSchema.parse(req.body);
      const video = await storage.createSavedVideo({
        ...validated,
        userId: DEV_USER_ID,
        isFavorite: 0,
      });
      res.status(201).json(video);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error saving video:", error);
      res.status(500).json({ error: "Failed to save video" });
    }
  });

  app.patch("/api/video-gallery/:id/favorite", async (req, res) => {
    try {
      const updated = await storage.toggleVideoFavorite(req.params.id, DEV_USER_ID);
      if (!updated) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error toggling video favorite:", error);
      res.status(500).json({ error: "Failed to toggle favorite" });
    }
  });

  app.delete("/api/video-gallery/:id", async (req, res) => {
    try {
      const success = await storage.deleteSavedVideo(req.params.id, DEV_USER_ID);
      if (!success) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // ============ FILTER PRESETS ============
  app.get("/api/presets", async (_req, res) => {
    try {
      const presets = await storage.getFilterPresets(DEV_USER_ID);
      res.json(presets);
    } catch (error) {
      console.error("Error fetching presets:", error);
      res.status(500).json({ error: "Failed to fetch presets" });
    }
  });

  app.get("/api/presets/:id", async (req, res) => {
    try {
      const preset = await storage.getFilterPreset(req.params.id);
      if (!preset) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json(preset);
    } catch (error) {
      console.error("Error fetching preset:", error);
      res.status(500).json({ error: "Failed to fetch preset" });
    }
  });

  app.post("/api/presets", async (req, res) => {
    try {
      console.log("Creating preset with body:", JSON.stringify(req.body, null, 2));
      const validated = createFilterPresetRequestSchema.parse(req.body);
      console.log("Validated preset:", JSON.stringify(validated, null, 2));
      const preset = await storage.createFilterPreset({
        ...validated,
        userId: DEV_USER_ID,
        isDefault: validated.isDefault ? 1 : 0,
      });
      console.log("Created preset:", JSON.stringify(preset, null, 2));
      res.status(201).json(preset);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Zod validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error creating preset:", error);
      res.status(500).json({ error: "Failed to create preset" });
    }
  });

  app.patch("/api/presets/:id", async (req, res) => {
    try {
      const validated = updateFilterPresetRequestSchema.parse(req.body);
      const updated = await storage.updateFilterPreset(req.params.id, DEV_USER_ID, {
        ...validated,
        isDefault: validated.isDefault !== undefined ? (validated.isDefault ? 1 : 0) : undefined,
      });
      if (!updated) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error updating preset:", error);
      res.status(500).json({ error: "Failed to update preset" });
    }
  });

  app.delete("/api/presets/:id", async (req, res) => {
    try {
      const success = await storage.deleteFilterPreset(req.params.id, DEV_USER_ID);
      if (!success) {
        return res.status(404).json({ error: "Preset not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting preset:", error);
      res.status(500).json({ error: "Failed to delete preset" });
    }
  });

  // Stripe routes
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Error getting Stripe publishable key:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  app.get("/api/stripe/products", async (req, res) => {
    try {
      const products = await stripeService.listProductsWithPrices();
      res.json({ products });
    } catch (error: any) {
      console.error("Error listing products:", error);
      res.status(500).json({ error: "Failed to list products" });
    }
  });

  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const user = req.user as any;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      let appUser = await storage.getAppUser(userId);
      
      if (appUser?.plan === "pro") {
        return res.status(400).json({ error: "Already subscribed to Pro" });
      }

      let customerId = appUser?.stripeCustomerId;
      const userEmail = user?.claims?.email || `${user?.claims?.name || 'user'}@vectra.temp`;
      const userName = user?.claims?.name || user?.claims?.sub || "User";

      if (!customerId) {
        const customer = await stripeService.createCustomer(
          userEmail,
          userId,
          userName
        );
        customerId = customer.id;
        
        if (appUser) {
          await stripeService.updateUserStripeInfo(userId, { stripeCustomerId: customerId });
        } else {
          await storage.createAppUserFromReplit(userId, userName, customerId);
        }
        appUser = await storage.getAppUser(userId);
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const locale = req.body.locale || req.headers['accept-language']?.split(',')[0] || 'pt-BR';
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/pricing?success=true`,
        `${baseUrl}/pricing?canceled=true`,
        locale,
        userId
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/portal", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      
      const user = req.user as any;
      
      if (!user?.claims?.sub) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const appUser = await storage.getAppUser(userId);
      if (!appUser?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        appUser.stripeCustomerId,
        `${baseUrl}/profile`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to access billing portal" });
    }
  });

  app.get("/api/stripe/subscription", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      
      const appUser = await storage.getAppUser(userId);
      
      if (!appUser?.stripeSubscriptionId) {
        return res.json({ subscription: null });
      }

      const subscription = await stripeService.getSubscription(appUser.stripeSubscriptionId);
      res.json({ subscription });
    } catch (error: any) {
      console.error("Error getting subscription:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  return httpServer;
}
