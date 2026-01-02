import type { Express, Request, Response } from "express";
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
import { applyGeminiGemsOptimization, getAvailableGems, GEMINI_GEMS } from "./prompt-engine/gemini-gems";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { log } from "./lib/logger";
import { sendWelcomeEmail } from "./lib/email";

// Self-healing migration: Ensure banner_url exists
(async () => {
  try {
    await db.execute(sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS banner_url TEXT;`);
    log("[Migration] Ensured banner_url column exists in app_users", "db");
  } catch (error) {
    log(`[Migration] Failed to check/add banner_url column: ${error}`, "db", "error");
  }
})();

const DEV_USER_ID = "dev_user";
// SECURITY: Fail-safe default. If NODE_ENV is not explicitly 'development', assume production.
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
const IS_PRODUCTION = !IS_DEVELOPMENT;

function getUserId(req: Request): string | null {
  const user = req.user as any;
  if (user?.claims?.sub) {
    return user.claims.sub;
  }
  // SECURITY: Only allow dev_user fallback in explicit development mode
  if (IS_DEVELOPMENT) {
    // Optional: Add a header check to prevent accidental reliance even in dev?
    // For now, adhering to strict environment check is sufficient.
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
  videosPerDay: 2,         // Enable video generation for free tier (was 0)
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
  const isAdmin = appUser?.isAdmin === 1;

  // Admins have unlimited access with HQ model
  if (isAdmin) {
    return { allowed: true, isPro: true, modelId: MODELSLAB_MODELS.HQ, imageQuality: "hq" };
  }

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

async function checkGenerationLimits(userId: string, type: "prompt" | "image" | "video"): Promise<{ allowed: boolean; reason?: string; isPro: boolean; isAdmin?: boolean }> {
  if (IS_PRO_OVERRIDE) {
    return { allowed: true, isPro: true };
  }

  const appUser = await storage.getAppUser(userId);
  const isPro = appUser?.plan === "pro";
  const isAdmin = appUser?.isAdmin === 1;

  // Admins have unlimited access
  if (isAdmin) {
    return { allowed: true, isPro: true, isAdmin: true };
  }

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

  console.log("Checking database seeds...");

  // Profiles
  const existingProfiles = await storage.getProfiles();
  const existingProfileNames = new Set(existingProfiles.map(p => p.name));
  for (const profile of defaultProfiles) {
    if (!existingProfileNames.has(profile.name)) {
      await storage.createProfile(profile);
    }
  }

  // Blueprints
  const existingBlueprints = await storage.getBlueprints();
  const existingBlueprintNames = new Set(existingBlueprints.map(b => b.name));
  for (const blueprint of defaultBlueprints) {
    if (!existingBlueprintNames.has(blueprint.name)) {
      await storage.createBlueprint(blueprint);
    }
  }

  // Blocks
  const existingBlocks = await storage.getBlocks();
  const existingBlockKeys = new Set(existingBlocks.map(b => b.key));
  for (const block of defaultBlocks) {
    if (!existingBlockKeys.has(block.key) && block.key) {
      await storage.createBlock(block);
    }
  }

  // Filters
  const existingFilters = await storage.getFilters();
  const existingFilterKeys = new Set(existingFilters.map(f => f.key));
  for (const filter of defaultFilters) {
    if (!existingFilterKeys.has(filter.key)) {
      await storage.createFilter({
        key: filter.key,
        label: filter.label,
        schema: filter.schema,
        effect: filter.effect,
        isPremium: 0,
      });
    }
  }

  // Base Models
  const existingBaseModels = await storage.getBaseModels();
  const existingModelIds = new Set(existingBaseModels.map(m => (m as any).modelId || m.id));
  for (const baseModel of defaultBaseModels) {
    if (!existingModelIds.has((baseModel as any).modelId || (baseModel as any).id)) {
      await storage.createBaseModel(baseModel as any);
    }
  }

  // Ensure dev_user exists with admin rights for local development
  if (!IS_PRODUCTION) {
    const devUser = await storage.getAppUser(DEV_USER_ID);
    if (!devUser) {
      console.log("Creating local dev_user with admin rights...");
      await storage.createAppUserFromReplit(DEV_USER_ID, "Developer");
      await storage.updateAppUser(DEV_USER_ID, {
        isAdmin: 1,
        plan: "pro",
        // @ts-ignore - Handle potential schema mismatches for optional fields
        credits: 1000
      } as any);
    }
  }

  console.log("Database seed check complete!");
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

  // Waitlist endpoint
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Invalid email" });
      }

      // Check if already in waitlist
      const existing = await storage.getWaitlistEntry(email);
      if (existing) {
        const count = await storage.getWaitlistCount();
        return res.json({ success: true, position: count + 2847 });
      }

      await storage.addToWaitlist(email);
      const count = await storage.getWaitlistCount();

      // Async email sending (don't block response)
      sendWelcomeEmail(email, count + 2847).catch(err => {
        log(`Failed to send welcome email to ${email}: ${err}`, "email", "error");
      });

      res.json({ success: true, position: count + 2847 });
    } catch (err) {
      log(`Waitlist error: ${err}`, "api", "error");
      res.status(500).json({ error: "Failed to join waitlist" });
    }
  });

  // Profile routes
  app.get("/api/profile", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const user = req.user as any;

      if (userId === DEV_USER_ID) {
        // In dev mode, use localStorage-like behavior via a static variable
        const devTutorialCompleted = (global as any).__devTutorialCompleted ?? 0;

        // Try to fetch from DB to see if we seeded it (should be true)
        const dbUser = await storage.getAppUser(DEV_USER_ID);

        return res.json({
          id: DEV_USER_ID,
          username: user?.claims?.name || "Developer",
          email: user?.claims?.email || null,
          plan: dbUser?.plan || "pro",
          isAdmin: dbUser?.isAdmin || 1,
          displayName: user?.claims?.name || "Developer",
          avatarUrl: user?.claims?.profile_image || null,
          bannerUrl: null,
          tagline: null,
          timezone: "America/Sao_Paulo",
          defaultLanguage: "pt-BR",
          defaultLlmProfileId: null,
          theme: "system",
          tutorialCompleted: devTutorialCompleted,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPro: (dbUser?.plan === "pro") || true,
          isTrial: false
        });
      }

      let appUser = await storage.getAppUser(userId);

      if (!appUser) {
        // Create the user in the database on first access
        // Use unique username: prefer name, then email prefix, then replitId
        const email = user?.claims?.email as string | undefined;
        const uniqueUsername = user?.claims?.name ||
          (email ? email.split('@')[0] : null) ||
          `user_${userId}`;
        appUser = await storage.createAppUserFromReplit(
          userId,
          uniqueUsername
        );
      }

      // Check if user's email is in admin list and update isAdmin flag
      const userEmail = user?.claims?.email;
      if (userEmail) {
        // Check both database table and environment variable for admin emails
        const isAdminInDb = await storage.isAdminEmail(userEmail);
        const adminEmailsEnv = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
        const isAdminInEnv = adminEmailsEnv.includes(userEmail.toLowerCase());
        const isAdminEmail = isAdminInDb || isAdminInEnv;

        console.log("[admin-check]", {
          userEmail,
          isAdminInDb,
          isAdminInEnv,
          isAdminEmail,
          currentIsAdmin: appUser.isAdmin,
          adminEmailsEnv
        });

        if (isAdminEmail && appUser.isAdmin !== 1) {
          console.log("[admin-check] Updating user to admin");
          appUser = (await storage.updateAppUser(userId, { isAdmin: 1 })) || appUser;
        }
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
        const email = user?.claims?.email as string | undefined;
        const uniqueUsername = user?.claims?.name ||
          (email ? email.split('@')[0] : null) ||
          `user_${userId}`;
        appUser = await storage.createAppUserFromReplit(
          userId,
          uniqueUsername
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

  // Banner upload endpoint
  app.post("/api/profile/banner", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      console.log(`[Banner Upload] Start - User: ${userId}`);
      const { imageData } = req.body;

      if (!imageData || typeof imageData !== "string") {
        console.log("[Banner Upload] Error: No image data");
        return res.status(400).json({ error: "Image data is required" });
      }

      const sizeInMB = imageData.length / (1024 * 1024);
      console.log(`[Banner Upload] Image Size: ${sizeInMB.toFixed(2)} MB`);

      // Validate base64 data URL format
      const dataUrlMatch = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,/);
      if (!dataUrlMatch) {
        console.log("[Banner Upload] Error: Invalid format");
        return res.status(400).json({ error: "Invalid image format. Use JPEG, PNG or WebP." });
      }

      // Check size (limit to ~15MB of original file size)
      const MAX_SIZE = 15 * 1024 * 1024 * 1.37; // ~15MB accounting for base64 overhead
      if (imageData.length > MAX_SIZE) {
        console.log("[Banner Upload] Error: Size exceeded");
        return res.status(400).json({ error: "Image too large. Maximum size is 15MB." });
      }

      // Update user banner
      console.log("[Banner Upload] Updating DB...");
      const updated = await storage.updateAppUser(userId, { bannerUrl: imageData });

      if (!updated) {
        return res.status(500).json({ error: "Failed to update banner" });
      }

      res.json({ success: true, bannerUrl: imageData });
    } catch (error) {
      console.error("Error uploading banner:", error);
      res.status(500).json({ error: "Failed to upload banner" });
    }
  });

  // Remove banner endpoint
  app.delete("/api/profile/banner", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const updated = await storage.updateAppUser(userId, { bannerUrl: null });

      if (!updated) {
        return res.status(500).json({ error: "Failed to remove banner" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing banner:", error);
      res.status(500).json({ error: "Failed to remove banner" });
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
      const isAdmin = appUser?.isAdmin === 1;
      const hasCustomKey = isAdmin && !!appUser?.customModelsLabKey;
      const plan = IS_PRO_OVERRIDE ? "pro" : (appUser?.plan || "free");
      const isPro = IS_PRO_OVERRIDE || plan === "pro" || isAdmin;

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
        plan: isAdmin ? "admin" : plan,
        isPro,
        isAdmin,
        hasCustomKey,
        daily: {
          prompts: { used: promptsUsedToday, limit: (isPro || isAdmin) ? -1 : FREE_LIMITS.promptsPerDay },
          images: {
            used: hasCustomKey ? 0 : totalImagesUsed,
            limit: (isPro || hasCustomKey) ? -1 : totalImagesLimit,
            hq: {
              used: hasCustomKey ? 0 : imageUsageByQuality.hq,
              limit: (isPro || hasCustomKey) ? -1 : FREE_LIMITS.imagesHqPerDay,
              model: MODELSLAB_MODELS.HQ,
              label: "Nano Banana Pro (HQ)",
            },
            standard: {
              used: hasCustomKey ? 0 : imageUsageByQuality.standard,
              limit: (isPro || hasCustomKey) ? -1 : FREE_LIMITS.imagesStandardPerDay,
              model: MODELSLAB_MODELS.STANDARD,
              label: "Realistic Vision 5.1 (Standard)",
            },
          },
          videos: { used: videosUsedToday, limit: (isPro || isAdmin) ? -1 : FREE_LIMITS.videosPerDay },
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

  // Admin: Save custom ModelsLab API key (encrypted)
  app.post("/api/admin/api-key", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const user = await storage.getAppUser(userId);
      if (!user || user.isAdmin !== 1) {
        log(`Unauthorized admin access attempt by ${userId}`, "security", "warn");
        return res.status(403).json({ error: "Admin access required" });
      }

      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== "string") {
        return res.status(400).json({ error: "API key is required" });
      }

      // Encrypt the API key before storing
      const { encryptApiKey } = await import("./lib/encryption");
      const encryptedKey = encryptApiKey(apiKey);

      await storage.updateAppUser(userId, { customModelsLabKey: encryptedKey });

      log(`Admin ${userId} updated custom API key`, "audit", "warn");

      res.json({ success: true });
    } catch (error) {
      log(`Error saving API key: ${error}`, "admin", "error");
      res.status(500).json({ error: "Failed to save API key" });
    }
  });

  // Admin: Remove custom API key
  app.delete("/api/admin/api-key", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;

      const user = await storage.getAppUser(userId);
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.updateAppUser(userId, { customModelsLabKey: null });
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing API key:", error);
      res.status(500).json({ error: "Failed to remove API key" });
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

  // Gemini Gems Optimization Endpoints
  app.get("/api/gemini-gems", async (_req, res) => {
    try {
      const gems = getAvailableGems();
      res.json(gems);
    } catch (error) {
      console.error("Error fetching Gemini gems:", error);
      res.status(500).json({ error: "Failed to fetch Gemini gems" });
    }
  });

  app.get("/api/gemini-gems/:id", async (req, res) => {
    try {
      const gem = GEMINI_GEMS[req.params.id];
      if (!gem) {
        return res.status(404).json({ error: "Gemini gem not found" });
      }
      res.json(gem);
    } catch (error) {
      console.error("Error fetching Gemini gem:", error);
      res.status(500).json({ error: "Failed to fetch Gemini gem" });
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
      const isEnvAdminOverride = process.env.ADMIN_OVERRIDE === "true";

      // Check if logged-in user is admin
      const userId = getUserId(req);
      let isUserAdmin = false;
      if (userId) {
        const appUser = await storage.getAppUser(userId);
        isUserAdmin = appUser?.isAdmin === 1;
      }

      const isAdminOverride = isEnvAdminOverride || isUserAdmin;

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

        // Optics settings - Camera style that defines the overall visual aesthetic
        if (cs.optics?.style) {
          const opticsMap: Record<string, string> = {
            "cinematic": "professional cinematic photography, anamorphic lens, shallow depth of field, Hollywood film quality, 4K resolution",
            "smartphone": "authentic smartphone photo, real-life mobile photography, natural lighting, casual candid shot, iPhone quality",
            "iphone-hdr": "iPhone 15 Pro Max HDR photo, Apple ProRAW, vibrant dynamic range, Smart HDR 5, photorealistic mobile capture",
            "realistic-raw": "unprocessed RAW photo, no post-processing, natural unedited look, direct from camera sensor, authentic documentary style",
            "forensic-dslr": "forensic DSLR photography, sharp clinical focus, evidence-grade precision, high detail capture, professional documentation",
          };
          if (opticsMap[cs.optics.style]) {
            cinematicModifiers.push(opticsMap[cs.optics.style]);
            cinematicFilters["camera_style"] = cs.optics.style;
          }
        }

        // VFX effects - Visual post-processing effects that transform the image
        if (cs.vfx?.effects && cs.vfx.effects.length > 0) {
          const vfxMap: Record<string, string> = {
            "vhs": "VHS tape recording aesthetic, retro 1980s video quality, chromatic aberration, magnetic tape distortion, analog noise, tracking lines, RGB color bleeding",
            "35mm": "35mm analog film stock, Kodak Portra 400 emulation, organic film grain texture, cinematic warmth, photochemical color science, slight vignette",
            "nvg": "NIGHT VISION GOGGLES POV, monochrome phosphor green tint, military Gen3 NVG display, infrared thermal imaging overlay, tactical night operations aesthetic, green-scale image intensifier",
            "cine": "professional cinematic color grading, ARRI Alexa look, anamorphic horizontal lens flares, Hollywood blockbuster color science, cinematic letterbox feel",
            "gltch": "digital glitch art effect, data corruption aesthetic, pixel sorting, RGB channel displacement, databending artifacts, broken display simulation",
            "blum": "ethereal bloom lighting effect, soft dreamy glow on highlights, diffused light halos, romantic atmospheric haze, lens diffusion filter",
            "grain": "organic film grain texture pattern, analog ISO noise, subtle photographic noise, celluloid texture, authentic film stock feel",
            "leak": "vintage light leak effect, warm orange and red light streaks, film camera light leak, Lomography aesthetic, sun flare artifacts",
            "scan": "CRT monitor scan lines, retro interlaced video display, horizontal line overlay, old TV screen effect, phosphor dot pattern",
            "noir": "classic film noir black and white, dramatic chiaroscuro lighting, high contrast monochrome, deep shadows, 1940s crime thriller aesthetic",
            "teal": "Hollywood teal and orange color grading, complementary color scheme, blockbuster movie look, Michael Bay color science, cinematic contrast",
          };
          const intensity = cs.vfx.intensity || 50;
          const intensityPrefix = intensity >= 80 ? "EXTREMELY STRONG " : intensity >= 60 ? "STRONG " : intensity <= 20 ? "SUBTLE " : "";

          cs.vfx.effects.forEach(effect => {
            if (effect !== "off" && vfxMap[effect]) {
              cinematicModifiers.push(`${intensityPrefix}${vfxMap[effect]}`);
              cinematicFilters[`vfx_${effect}`] = String(intensity);
            }
          });
        }

        // Style DNA - Fashion and clothing aesthetics
        if (cs.styleDna) {
          // Brand aesthetic
          if (cs.styleDna.brand && cs.styleDna.brand !== "auto") {
            const brandMap: Record<string, string> = {
              "streetwear": "streetwear urban fashion, casual street style, hypebeast aesthetic, Supreme/Off-White influence, urban contemporary look",
              "luxury": "luxury high fashion aesthetic, premium designer look, Gucci/Louis Vuitton sophistication, elegant upscale style, haute couture influence",
              "minimalist": "minimalist clean design, understated elegance, neutral tones, COS/Uniqlo aesthetic, less is more philosophy, refined simplicity",
              "vintage": "vintage retro aesthetic, timeless classic style, thrift store finds, 70s/80s/90s inspired fashion, nostalgic wardrobe",
              "techwear": "futuristic techwear aesthetic, functional technical fashion, Acronym/Nike ACG style, utility pockets, water-resistant materials, cyberpunk influence",
            };
            if (brandMap[cs.styleDna.brand]) {
              cinematicModifiers.push(brandMap[cs.styleDna.brand]);
              cinematicFilters["style_brand"] = cs.styleDna.brand;
            }
          }

          // Layering style
          if (cs.styleDna.layering && cs.styleDna.layering !== "relaxed") {
            const layeringMap: Record<string, string> = {
              "minimal": "minimal layering, single layer outfit, clean simple clothing",
              "light": "light layering, two layer outfit, casual everyday look",
              "medium": "medium layering, three layers, well-coordinated outfit",
              "heavy": "heavy layering, multiple layers, complex styled outfit, fashion-forward stacking",
            };
            if (layeringMap[cs.styleDna.layering]) {
              cinematicModifiers.push(layeringMap[cs.styleDna.layering]);
              cinematicFilters["style_layering"] = cs.styleDna.layering;
            }
          }

          // Fit style
          if (cs.styleDna.fit && cs.styleDna.fit !== "regular") {
            const fitMap: Record<string, string> = {
              "oversized": "oversized baggy fit clothing, relaxed silhouette, loose comfortable garments, streetwear proportions",
              "relaxed": "relaxed comfortable fit, casual everyday proportions, easy-going silhouette",
              "slim": "slim fitted silhouette, tailored close-fitting clothes, modern slim cut",
              "tailored": "bespoke tailored fit, precision-cut garments, custom-fitted clothing, sartorial excellence",
            };
            if (fitMap[cs.styleDna.fit]) {
              cinematicModifiers.push(fitMap[cs.styleDna.fit]);
              cinematicFilters["style_fit"] = cs.styleDna.fit;
            }
          }

          // Outerwear
          if (cs.styleDna.outerwear) {
            const outerwearMap: Record<string, string> = {
              "jacket": "wearing stylish jacket, fashionable outerwear",
              "coat": "wearing elegant coat, sophisticated overcoat",
              "hoodie": "wearing hoodie, casual streetwear hoodie",
              "blazer": "wearing tailored blazer, smart casual blazer",
              "puffer": "wearing puffer jacket, quilted down jacket",
              "leather": "wearing leather jacket, classic biker jacket",
              "denim": "wearing denim jacket, jean jacket trucker style",
              "bomber": "wearing bomber jacket, classic flight jacket",
            };
            if (outerwearMap[cs.styleDna.outerwear]) {
              cinematicModifiers.push(outerwearMap[cs.styleDna.outerwear]);
              cinematicFilters["style_outerwear"] = cs.styleDna.outerwear;
            }
          }

          // Footwear
          if (cs.styleDna.footwear) {
            const footwearMap: Record<string, string> = {
              "sneakers": "wearing stylish sneakers, fashionable athletic shoes",
              "boots": "wearing boots, stylish leather boots",
              "loafers": "wearing loafers, elegant slip-on shoes",
              "dress": "wearing dress shoes, formal oxford shoes",
              "sandals": "wearing sandals, casual open footwear",
              "high-tops": "wearing high-top sneakers, basketball style shoes",
              "running": "wearing running shoes, athletic trainers",
            };
            if (footwearMap[cs.styleDna.footwear]) {
              cinematicModifiers.push(footwearMap[cs.styleDna.footwear]);
              cinematicFilters["style_footwear"] = cs.styleDna.footwear;
            }
          }

          // Bottom/Pants
          if (cs.styleDna.bottom) {
            const bottomMap: Record<string, string> = {
              "jeans": "wearing denim jeans, classic blue jeans",
              "chinos": "wearing chino pants, smart casual trousers",
              "joggers": "wearing jogger pants, comfortable sweatpants",
              "shorts": "wearing shorts, casual short pants",
              "cargo": "wearing cargo pants, utility pocket pants",
              "dress": "wearing dress pants, formal trousers",
              "wide": "wearing wide-leg pants, relaxed fit trousers",
            };
            if (bottomMap[cs.styleDna.bottom]) {
              cinematicModifiers.push(bottomMap[cs.styleDna.bottom]);
              cinematicFilters["style_bottom"] = cs.styleDna.bottom;
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

      // Prepend cinematic modifiers to compiled prompt for stronger effect (VFX effects go first)
      if (cinematicModifiers.length > 0) {
        const cinematicPrefix = `[VISUAL STYLE: ${cinematicModifiers.join(", ")}]\n\n`;
        result = {
          ...result,
          compiledPrompt: `${cinematicPrefix}${result.compiledPrompt}`,
          metadata: {
            ...result.metadata,
            filterCount: result.metadata.filterCount + cinematicModifiers.length,
          },
        };
      }

      // Apply Gemini Gems optimizations for ultra-realistic UGC and facial biometrics
      let gemOptimization = null;
      if (validated.geminiGems && validated.geminiGems.length > 0) {
        gemOptimization = applyGeminiGemsOptimization(
          result.compiledPrompt,
          validated.geminiGems,
          validated.restrictions
        );
        result = {
          ...result,
          compiledPrompt: gemOptimization.enhancedPrompt,
          metadata: {
            ...result.metadata,
            filterCount: result.metadata.filterCount + validated.geminiGems.length,
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

      // Include Gemini Gems optimization info
      if (gemOptimization) {
        response.gemOptimization = {
          appliedGems: gemOptimization.appliedGems,
          negativePrompt: gemOptimization.negativePrompt,
          technicalRecommendations: gemOptimization.technicalRecommendations,
          qualityChecklist: gemOptimization.qualityChecklist,
        };
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

  app.get("/api/user-blueprints", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
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
      const userId = requireAuth(req, res);
      if (!userId) return;
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const isEnvAdminOverride = process.env.ADMIN_OVERRIDE === "true";

      // Check if logged-in user is admin
      const loggedUserId = getUserId(req);
      let isUserAdmin = false;
      if (loggedUserId) {
        const appUser = await storage.getAppUser(loggedUserId);
        isUserAdmin = appUser?.isAdmin === 1;
      }

      const isAdminOverride = isEnvAdminOverride || isUserAdmin;

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
      const userId = requireAuth(req, res);
      if (!userId) return;
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
      const userId = requireAuth(req, res);
      if (!userId) return;
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
      const userId = requireAuth(req, res);
      if (!userId) return;
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const isEnvAdminOverride = process.env.ADMIN_OVERRIDE === "true";

      // Check if logged-in user is admin
      const loggedUserId = getUserId(req);
      let isUserAdmin = false;
      if (loggedUserId) {
        const appUser = await storage.getAppUser(loggedUserId);
        isUserAdmin = appUser?.isAdmin === 1;
      }

      const isAdminOverride = isEnvAdminOverride || isUserAdmin;

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

      // Check if user is admin (all admins bypass quotas)
      const user = await storage.getAppUser(userId);
      const isAdmin = user?.isAdmin === 1;
      const encryptedApiKey = user?.customModelsLabKey;
      const hasCustomKey = isAdmin && !!encryptedApiKey;

      // All admins bypass quotas, regardless of having a custom key
      let imageQuota: ImageQuotaResult;
      if (isAdmin) {
        // Admins get unlimited HQ access
        imageQuota = {
          allowed: true,
          isPro: true,
          modelId: MODELSLAB_MODELS.HQ,
          imageQuality: "hq"
        };
      } else {
        imageQuota = await checkImageQuotaAndModel(userId);
        if (!imageQuota.allowed) {
          return res.status(403).json({
            error: imageQuota.reason,
            isPremiumRequired: true,
            quotas: imageQuota.quotas,
          });
        }
      }

      const { prompt, images, aspectRatio, activeGems, bodyFidelity, preserveTattoos, negativePrompt, cinematicSettings, rawSubject } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // ============ VECTRA UNIFIED PROMPT SYSTEM ============
      // CRITICAL: Nano Banana Pro prioritizes the BEGINNING of the prompt
      // Structure: [SUBJECT FIRST] + [Technical Directives as suffix]

      const hasActiveGems = Array.isArray(activeGems) && activeGems.length > 0;
      const needsTattooPreservation = preserveTattoos === true ||
        (hasActiveGems && (activeGems.includes("face_swapper") || activeGems.includes("tattoo_preservation")));
      const usePreciseControlMode = needsTattooPreservation || (hasActiveGems && bodyFidelity && bodyFidelity > 50);

      // ============ EXTRACT USER SUBJECT FROM COMPILED PROMPT ============
      // The compiled prompt contains technical directives + subject
      // We need to identify and PRIORITIZE the actual user request

      // PRIORITY 1: Use rawSubject directly from frontend if available
      let userSubject = rawSubject || "";

      // PRIORITY 2: Try to find the subject line in the compiled prompt
      if (!userSubject) {
        const subjectMatch = prompt.match(/Subject:\s*(.+?)(?:\n|$)/i);
        if (subjectMatch) {
          userSubject = subjectMatch[1].trim();
        } else {
          // Look for any lines that seem like user content (not technical directives)
          const lines = prompt.split('\n');
          for (const line of lines) {
            const cleanLine = line.trim();
            // Skip technical directive lines
            if (cleanLine.startsWith('[') || cleanLine.startsWith('CRITICAL') ||
              cleanLine.startsWith('Quality:') || cleanLine.startsWith('Fidelity:') ||
              cleanLine.startsWith('Anatomy:') || cleanLine.startsWith('Technical') ||
              cleanLine.includes('LOCKDOWN') || cleanLine.includes('PRESERVATION') ||
              cleanLine.length === 0) {
              continue;
            }
            // This might be user content
            if (cleanLine.length > 20 && !cleanLine.startsWith('-')) {
              // Check if it looks like a description/subject
              if (cleanLine.toLowerCase().includes('esse') ||
                cleanLine.toLowerCase().includes('this') ||
                cleanLine.toLowerCase().includes('homem') ||
                cleanLine.toLowerCase().includes('mulher') ||
                cleanLine.toLowerCase().includes('woman') ||
                cleanLine.toLowerCase().includes('man') ||
                cleanLine.toLowerCase().includes('person') ||
                cleanLine.toLowerCase().includes('usando') ||
                cleanLine.toLowerCase().includes('wearing')) {
                userSubject = cleanLine;
                break;
              }
            }
          }
        }
      }

      console.log(`[SUBJECT] rawSubject: "${(rawSubject || 'none').substring(0, 50)}", userSubject: "${userSubject.substring(0, 50)}"`);

      // ============ BUILD NANO BANANA PRO OPTIMIZED PROMPT ============
      // The model works best with: [SCENE DESCRIPTION] [SUBJECT] [STYLE MODIFIERS]
      // NOT with long technical preambles that bury the user's actual request

      let optimizedPrompt = "";

      // PRIORITY 1: User's actual scene/subject request goes FIRST
      if (userSubject) {
        optimizedPrompt = `SCENE: ${userSubject}\n\n`;
      }

      // PRIORITY 2: Add the rest of the compiled prompt (but trimmed)
      // Remove verbose technical sections that don't help the model
      let cleanedPrompt = prompt;

      // Remove overly long technical sections
      cleanedPrompt = cleanedPrompt.replace(/\[FACIAL BIOMETRICS LOCKDOWN MODE\][\s\S]*?Preserve microexpressions[^\n]*\n/gi, '[PRESERVE EXACT FACE] ');
      cleanedPrompt = cleanedPrompt.replace(/\[BODY MARKING PRESERVATION[^\]]*\][\s\S]*?DO NOT invent[^\n]*\n/gi, '[PRESERVE EXACT TATTOOS] ');
      cleanedPrompt = cleanedPrompt.replace(/\[ULTRA-REALISM MODE[^\]]*\][\s\S]*?uncanny valley\./gi, '[PHOTOREALISTIC] ');
      cleanedPrompt = cleanedPrompt.replace(/\[INSTAGRAM UGC PHOTOREALISM MODE\][\s\S]*?smartphone photography\./gi, '[AUTHENTIC SMARTPHONE PHOTO] ');
      cleanedPrompt = cleanedPrompt.replace(/\[TATTOO[^\]]*PRESERVATION[^\]]*\][\s\S]*?PRECISELY\./gi, '[PRESERVE TATTOOS] ');

      // Remove duplicate newlines and trim
      cleanedPrompt = cleanedPrompt.replace(/\n{3,}/g, '\n\n').trim();

      // If we extracted a subject, remove it from the cleaned prompt to avoid duplication
      if (userSubject && cleanedPrompt.includes(userSubject)) {
        cleanedPrompt = cleanedPrompt.replace(userSubject, '');
      }

      // Add the cleaned prompt
      optimizedPrompt += cleanedPrompt;

      // PRIORITY 3: Add concise style directives at end based on gems
      const styleDirectives: string[] = [];

      if (hasActiveGems) {
        if (activeGems.includes("face_swapper")) {
          styleDirectives.push("preserve exact facial features");
        }
        if (activeGems.includes("ai_instagram_media")) {
          styleDirectives.push("authentic UGC smartphone photo style");
        }
        if (activeGems.includes("tattoo_preservation")) {
          styleDirectives.push("preserve exact tattoos ONLY where they exist in reference");
        }
      }

      // Add anti-CGI directives (concise)
      const needsUltraRealism = hasActiveGems ||
        prompt.toLowerCase().includes("photorealistic") ||
        prompt.toLowerCase().includes("real");

      if (needsUltraRealism) {
        styleDirectives.push("photorealistic quality");
        styleDirectives.push("no CGI or 3D render aesthetics");
      }

      if (styleDirectives.length > 0) {
        optimizedPrompt += `\n\nStyle: ${styleDirectives.join(", ")}`;
      }

      // ============ FACIAL TATTOO BIOMETRIC LOCKDOWN ULTRA ============
      // When tattoo preservation is active, add explicit FACIAL TATTOO controls
      if (needsTattooPreservation) {
        const facialTattooLockdown = `

[FACIAL TATTOO BIOMETRIC LOCKDOWN - ULTRA PRIORITY]
CRITICAL INSTRUCTION: This subject has SPECIFIC facial tattoos only in EXACT locations.
DO NOT ADD any tattoos to: forehead, eyebrows, temples, cheeks (unless present in reference), chin, neck, ears.
DO NOT EXTEND existing tattoos beyond their reference boundaries.
DO NOT CREATE new facial markings, spots, shadows that look like tattoos.
ONLY replicate the EXACT tattoos visible in the reference images.
Any skin area WITHOUT a tattoo in the reference MUST remain clean and unmarked.
This is a HARD CONSTRAINT - violation means image rejection.`;

        optimizedPrompt = facialTattooLockdown + "\n\n" + optimizedPrompt;

        console.log(`[FACIAL-LOCKDOWN] Added facial tattoo biometric lockdown to prompt`);
      }

      // Use the optimized prompt as the unified prompt
      let unifiedPrompt = optimizedPrompt;

      console.log(`[OPTIMIZED-PROMPT] Length: ${unifiedPrompt.length} chars, Subject extracted: ${!!userSubject}`);
      console.log(`[PROMPT-PREVIEW] First 300 chars: ${unifiedPrompt.substring(0, 300)}`);

      // ============ BUILD UNIFIED NEGATIVE PROMPT ============
      const antiCgiNegatives = [
        "CGI", "3D render", "computer generated", "artificial lighting", "plastic skin",
        "airbrushed", "smooth skin", "wax figure", "mannequin", "doll-like",
        "video game", "cartoon", "illustration", "digital art", "octane render"
      ];

      let unifiedNegativePrompt = negativePrompt || "bad quality, blurry, distorted, low resolution, watermark, text";

      if (needsUltraRealism) {
        unifiedNegativePrompt += ", " + antiCgiNegatives.join(", ");
      }

      // ============ FACIAL TATTOO ULTRA NEGATIVE PROMPTS ============
      // Extremely specific negative prompts for facial tattoo regions
      if (needsTattooPreservation) {
        const facialTattooNegatives = [
          // General tattoo invention prevention
          "extra tattoos", "new tattoos", "additional tattoos", "invented tattoos",
          "tattoos appearing where none exist", "different tattoo designs", "modified tattoos",
          // FACIAL REGION SPECIFIC - prevent tattoos in wrong areas
          "forehead tattoo", "eyebrow tattoo", "above eyebrow tattoo", "temple tattoo",
          "tattoo on forehead", "tattoo above eye", "tattoo on eyebrow",
          "new facial markings", "extra face tattoos", "additional facial ink",
          "cheek tattoo if not in reference", "chin tattoo if not in reference",
          "neck tattoo if not in reference", "ear tattoo",
          // Pattern specific prevention
          "extended tattoo lines", "spread tattoo ink", "bleeding tattoo edges",
          "smudged tattoos", "blurred tattoo boundaries", "morphed tattoo design",
          // False positive prevention
          "shadows that look like tattoos", "dirt marks on face", "smudges on skin",
          "dark spots on face", "artificial skin marks", "fake tattooed appearance"
        ];

        unifiedNegativePrompt += ", " + facialTattooNegatives.join(", ");

        console.log(`[FACIAL-LOCKDOWN] Added ${facialTattooNegatives.length} facial tattoo negatives`);
      }

      // ============ VFX STRENGTH CALCULATION ============
      // If VFX are active and intense, allow more AI freedom to apply styles
      let vfxStrengthBonus = 0;
      if (cinematicSettings?.vfx?.effects && cinematicSettings.vfx.effects.length > 0 && !cinematicSettings.vfx.effects.includes("off")) {
        const intensity = cinematicSettings.vfx.intensity || 50;
        vfxStrengthBonus = (intensity / 100) * 0.4;
      }

      // Calculate strength from bodyFidelity
      // IMPORTANT: When tattoo preservation is active with high fidelity, use VERY LOW strength
      // to maximize preservation of original tattoo positions
      let fidelityStrengthBase = bodyFidelity ? Math.max(0.15, Math.min(0.7, (100 - bodyFidelity) / 100)) : 0.5;

      // TATTOO PRESERVATION PRIORITY: When active with high fidelity, cap strength regardless of VFX
      let tattooStrengthCap = 1.0; // No cap by default
      if (needsTattooPreservation && bodyFidelity && bodyFidelity >= 80) {
        tattooStrengthCap = 0.25; // Strict cap for maximum tattoo preservation
        fidelityStrengthBase = Math.min(fidelityStrengthBase, 0.20);
        console.log(`[TATTOO-FIDELITY] High fidelity mode - base capped at 0.20, max at 0.25`);
      } else if (needsTattooPreservation) {
        tattooStrengthCap = 0.45; // Moderate cap when tattoo preservation is on but fidelity is lower
        console.log(`[TATTOO-FIDELITY] Standard mode - max capped at 0.45`);
      }

      // Apply VFX bonus but respect tattoo cap
      let calculatedStrength = Math.max(fidelityStrengthBase, 0.4 + vfxStrengthBonus);

      // Apply tattoo preservation cap (this takes priority over VFX)
      if (needsTattooPreservation) {
        calculatedStrength = Math.min(calculatedStrength, tattooStrengthCap);
      }

      const adjustedStrength = Math.min(0.85, calculatedStrength);

      console.log(`[STRENGTH-CALC] Base: ${fidelityStrengthBase.toFixed(2)}, VFX: ${vfxStrengthBonus.toFixed(2)}, TattooCap: ${tattooStrengthCap.toFixed(2)}, Final: ${adjustedStrength.toFixed(2)}`);

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "At least one image is required" });
      }

      // Use custom API key for admins (decrypt if present), otherwise use system key
      let apiKey = process.env.MODELSLAB_API_KEY;
      if (hasCustomKey && encryptedApiKey) {
        try {
          const { decryptApiKey } = await import("./lib/encryption");
          const decryptedKey = decryptApiKey(encryptedApiKey);
          if (decryptedKey) {
            apiKey = decryptedKey;
          }
        } catch {
          // If decryption fails, use system key
        }
      }
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

      // Truncate UNIFIED prompt to API max length (2000 chars)
      // unifiedPrompt already contains: Anti-CGI + Gems + Original Prompt
      const truncatedPrompt = unifiedPrompt.length > 2000 ? unifiedPrompt.substring(0, 2000) : unifiedPrompt;

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
      // IMPORTANT: When precise control mode is needed (gems/tattoo preservation), 
      // we force Realistic Vision v6 even for admins because it accepts control parameters
      let selectedModel: string;
      let isHqModel: boolean;
      let isNanoBananaPro: boolean;

      // Check if user is Pro from quota
      const isPro = imageQuota?.isPro === true;

      if (isAdmin || isPro) {
        // Both Admins AND Pro users get Nano Banana Pro HQ model ALWAYS
        // We prioritize Model Quality over "Precise Control" mechanisms used for tattoos/gems
        selectedModel = MODELSLAB_MODELS.HQ;
        isHqModel = true;
        isNanoBananaPro = true;
        console.log(`User is ${isAdmin ? 'Admin' : 'Pro'} - using Nano Banana Pro HQ model (Precise Content Mode: ${usePreciseControlMode})`);
      } else if (usePreciseControlMode) {
        // For FREE users, we support the downgrade to Standard for better control if needed
        selectedModel = MODELSLAB_MODELS.STANDARD;
        isHqModel = false;
        isNanoBananaPro = false;
        console.log(`Free user with Precise control mode active - switching to Realistic Vision`);
      } else {
        // Free users standard logic
        selectedModel = imageQuota?.modelId || MODELSLAB_MODELS.STANDARD;
        isHqModel = imageQuota?.imageQuality === "hq";
        isNanoBananaPro = selectedModel === MODELSLAB_MODELS.HQ;
        console.log(`Free user - using ${selectedModel} (${imageQuota?.imageQuality || 'standard'} quality)`);
      }

      // Use the unified negative prompt (already built above with anti-CGI + gems + tattoo)
      const finalNegativePrompt = unifiedNegativePrompt;

      // Nano Banana Pro uses v7 API with different parameters
      let requestBody: any;
      let apiEndpoint: string;

      // Always use v7 API for Nano Banana Pro
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
          negative_prompt: finalNegativePrompt, // Pass negative prompt even to v7
          init_image: processedImages, // Array of images for multi-image fusion
          aspect_ratio: nanoBananaRatio,
          guidance_scale: needsTattooPreservation ? 9.0 : 7.5, // Pass guidance scale
          prompt_strength: adjustedStrength, // Pass strength to v7 (if supported, otherwise ignored)
        };
        apiEndpoint = "https://modelslab.com/api/v7/images/image-to-image";

        console.log(`Using Nano Banana Pro (v7 API) - Precise Mode: ${usePreciseControlMode}, Strength: ${adjustedStrength}`);
      } else {
        // Realistic Vision 5.1 - v6 API with full control parameters
        // Used when: standard quota, or precise control mode is active (gems/tattoo preservation)
        const controlStrength = adjustedStrength; // Use adjusted strength with VFX boost
        const controlCfg = needsTattooPreservation ? 9.0 : 7.5;
        const controlSteps = needsTattooPreservation ? "35" : "30";

        requestBody = {
          key: apiKey,
          model_id: selectedModel === "nano-banana-pro" ? MODELSLAB_MODELS.STANDARD : selectedModel,
          prompt: truncatedPrompt,
          negative_prompt: finalNegativePrompt,
          init_image: initImage,
          base64: isBase64 ? "yes" : "no",
          width: dimensions.width,
          height: dimensions.height,
          samples: "1",
          num_inference_steps: controlSteps,
          safety_checker: "no",
          enhance_prompt: "no",
          guidance_scale: controlCfg,
          strength: controlStrength,
          scheduler: "DPMSolverMultistepScheduler",
        };
        apiEndpoint = "https://modelslab.com/api/v6/images/img2img";

        if (usePreciseControlMode) {
          console.log(`Precise control: strength=${controlStrength.toFixed(2)}, cfg=${controlCfg}, steps=${controlSteps}, tattooMode=${needsTattooPreservation}`);
        }
      }

      console.log(`Sending to ModelsLab ${isNanoBananaPro ? 'v7 Nano Banana Pro' : 'v6 img2img'} (${selectedModel} - ${imageQuota.imageQuality}):`, {
        ...requestBody,
        key: "[REDACTED]",
        init_image: isNanoBananaPro ? `[${processedImages.length} images]` : `[image: ${initImage.substring(0, 50)}...]`,
        prompt: `[${truncatedPrompt.length} chars]`,
      });

      let response = await fetchWithTimeout(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }, 90000); // 90s timeout for Nano Banana Pro (larger model)

      let data = await response.json();

      // Retry mechanism: If custom key fails (400 Invalid API Key), try with System Key
      if (data.status === "error" &&
        (data.message?.includes("Invalid API Key") || data.message?.includes("auth")) &&
        hasCustomKey) {

        console.warn("Custom Admin API Key failed. Retrying with System API Key...");

        // Switch to System Key
        requestBody.key = process.env.MODELSLAB_API_KEY;

        response = await fetchWithTimeout(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }, 90000);

        data = await response.json();
      }

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

  // ============ PROMPT REFINER FOR TEXT-TO-IMAGE ============
  // Analyzes user intent and generates optimized prompt for Nano Banana Pro
  app.post("/api/modelslab/refine-prompt", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { prompt, aspectRatio } = req.body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const userPrompt = prompt.trim();
      console.log(`[REFINE-PROMPT] Input: "${userPrompt.substring(0, 100)}..."`);

      // ============ INTENT ANALYSIS ============
      // Detect the type of content user wants to create
      const lowerPrompt = userPrompt.toLowerCase();

      interface PromptIntent {
        type: "logo" | "portrait" | "landscape" | "product" | "abstract" | "character" | "scene" | "artwork";
        style: string[];
        mood: string[];
        colors: string[];
        subject: string;
        details: string[];
        quality: string[];
      }

      const intent: PromptIntent = {
        type: "artwork",
        style: [],
        mood: [],
        colors: [],
        subject: userPrompt,
        details: [],
        quality: ["high quality", "detailed", "professional"]
      };

      // Detect type
      if (lowerPrompt.includes("logo") || lowerPrompt.includes("logotipo") || lowerPrompt.includes("marca")) {
        intent.type = "logo";
        intent.quality.push("vector-like", "clean lines", "scalable design");
      } else if (lowerPrompt.includes("retrato") || lowerPrompt.includes("portrait") || lowerPrompt.includes("rosto") || lowerPrompt.includes("face")) {
        intent.type = "portrait";
        intent.quality.push("photorealistic", "sharp focus on face", "studio lighting");
      } else if (lowerPrompt.includes("paisagem") || lowerPrompt.includes("landscape") || lowerPrompt.includes("cenário") || lowerPrompt.includes("ambiente")) {
        intent.type = "landscape";
        intent.quality.push("wide angle", "environmental lighting", "atmospheric");
      } else if (lowerPrompt.includes("produto") || lowerPrompt.includes("product") || lowerPrompt.includes("item")) {
        intent.type = "product";
        intent.quality.push("commercial photography", "clean background", "product focus");
      } else if (lowerPrompt.includes("abstrato") || lowerPrompt.includes("abstract")) {
        intent.type = "abstract";
        intent.quality.push("artistic", "creative composition", "unique");
      } else if (lowerPrompt.includes("personagem") || lowerPrompt.includes("character") || lowerPrompt.includes("herói") || lowerPrompt.includes("hero")) {
        intent.type = "character";
        intent.quality.push("character design", "full body", "dynamic pose");
      } else if (lowerPrompt.includes("cena") || lowerPrompt.includes("scene")) {
        intent.type = "scene";
        intent.quality.push("cinematic", "narrative composition", "storytelling");
      }

      // Detect styles
      const styleKeywords: Record<string, string[]> = {
        "minimalista": ["minimalist", "clean", "simple", "modern"],
        "minimal": ["minimalist", "clean", "simple", "modern"],
        "gótico": ["gothic", "dark", "ornate", "medieval"],
        "gotico": ["gothic", "dark", "ornate", "medieval"],
        "rock": ["rock style", "edgy", "bold", "rebellious"],
        "corporativo": ["corporate", "professional", "business", "sleek"],
        "futurista": ["futuristic", "sci-fi", "cyberpunk", "neon"],
        "vintage": ["vintage", "retro", "classic", "nostalgic"],
        "neon": ["neon lights", "glowing", "vibrant", "electric"],
        "3d": ["3D render", "volumetric", "dimensional", "depth"],
        "flat": ["flat design", "2D", "geometric", "simplified"],
        "realista": ["photorealistic", "hyperrealistic", "lifelike"],
        "realistic": ["photorealistic", "hyperrealistic", "lifelike"],
        "cartoon": ["cartoon style", "animated", "stylized"],
        "anime": ["anime style", "japanese animation", "manga-inspired"],
        "aquarela": ["watercolor", "soft edges", "organic flow"],
        "watercolor": ["watercolor", "soft edges", "organic flow"],
      };

      for (const [keyword, styles] of Object.entries(styleKeywords)) {
        if (lowerPrompt.includes(keyword)) {
          intent.style.push(...styles);
        }
      }

      // Detect colors
      const colorKeywords: Record<string, string[]> = {
        "preto e branco": ["black and white", "monochrome", "grayscale"],
        "black and white": ["black and white", "monochrome", "grayscale"],
        "monocromático": ["monochromatic", "single color palette"],
        "colorido": ["vibrant colors", "colorful", "rich palette"],
        "dourado": ["gold accents", "golden", "luxurious"],
        "neon": ["neon colors", "glowing", "electric colors"],
        "pastel": ["pastel colors", "soft tones", "muted"],
        "escuro": ["dark tones", "shadows", "low key"],
        "claro": ["bright", "light tones", "high key"],
      };

      for (const [keyword, colors] of Object.entries(colorKeywords)) {
        if (lowerPrompt.includes(keyword)) {
          intent.colors.push(...colors);
        }
      }

      // Detect mood
      const moodKeywords: Record<string, string[]> = {
        "elegante": ["elegant", "sophisticated", "refined"],
        "agressivo": ["aggressive", "intense", "powerful"],
        "calmo": ["calm", "peaceful", "serene"],
        "misterioso": ["mysterious", "enigmatic", "intriguing"],
        "profissional": ["professional", "polished", "corporate"],
        "divertido": ["fun", "playful", "cheerful"],
        "sério": ["serious", "formal", "authoritative"],
      };

      for (const [keyword, moods] of Object.entries(moodKeywords)) {
        if (lowerPrompt.includes(keyword)) {
          intent.mood.push(...moods);
        }
      }

      // ============ BUILD OPTIMIZED PROMPT ============
      // Nano Banana Pro works best with: [SUBJECT] [STYLE] [DETAILS] [QUALITY]

      let optimizedPrompt = "";

      // 1. Subject (the main thing user wants)
      optimizedPrompt += userPrompt;

      // 2. Add detected styles
      if (intent.style.length > 0) {
        const uniqueStyles = Array.from(new Set(intent.style)).slice(0, 4);
        optimizedPrompt += `, ${uniqueStyles.join(", ")}`;
      }

      // 3. Add colors
      if (intent.colors.length > 0) {
        const uniqueColors = Array.from(new Set(intent.colors)).slice(0, 3);
        optimizedPrompt += `, ${uniqueColors.join(", ")}`;
      }

      // 4. Add mood
      if (intent.mood.length > 0) {
        const uniqueMoods = Array.from(new Set(intent.mood)).slice(0, 2);
        optimizedPrompt += `, ${uniqueMoods.join(", ")}`;
      }

      // 5. Add type-specific enhancements
      switch (intent.type) {
        case "logo":
          optimizedPrompt += ", centered composition, clean background, professional logo design, brand identity, sharp edges";
          break;
        case "portrait":
          optimizedPrompt += ", professional portrait photography, perfect lighting, sharp focus, bokeh background";
          break;
        case "landscape":
          optimizedPrompt += ", stunning landscape, dramatic lighting, high dynamic range, wide angle view";
          break;
        case "product":
          optimizedPrompt += ", product photography, clean white background, professional lighting, commercial quality";
          break;
        case "abstract":
          optimizedPrompt += ", abstract art, creative composition, artistic expression, unique design";
          break;
        case "character":
          optimizedPrompt += ", character concept art, full body design, dynamic pose, detailed illustration";
          break;
        case "scene":
          optimizedPrompt += ", cinematic scene, narrative composition, environmental storytelling, atmospheric lighting";
          break;
        default:
          optimizedPrompt += ", high quality, detailed, professional artwork";
      }

      // 6. Universal quality boosters
      optimizedPrompt += ", 4K resolution, masterpiece, best quality";

      // 7. Aspect ratio optimization
      if (aspectRatio === "16:9" || aspectRatio === "21:9") {
        optimizedPrompt += ", widescreen composition, cinematic framing";
      } else if (aspectRatio === "9:16") {
        optimizedPrompt += ", vertical composition, portrait orientation";
      } else if (aspectRatio === "1:1") {
        optimizedPrompt += ", centered balanced composition, square format";
      }

      // Build response JSON
      const result = {
        original: userPrompt,
        refined: optimizedPrompt,
        analysis: {
          type: intent.type,
          styles: Array.from(new Set(intent.style)),
          colors: Array.from(new Set(intent.colors)),
          mood: Array.from(new Set(intent.mood)),
        },
        suggestions: [
          intent.style.length === 0 ? "Considere adicionar um estilo (ex: minimalista, gótico, futurista)" : null,
          intent.colors.length === 0 ? "Adicione cores específicas para melhor resultado (ex: preto e branco, neon)" : null,
          intent.type === "logo" && !lowerPrompt.includes("fundo") ? "Para logos, especifique o fundo (ex: fundo transparente, fundo branco)" : null,
        ].filter(Boolean)
      };

      console.log(`[REFINE-PROMPT] Output: "${optimizedPrompt.substring(0, 150)}..." | Type: ${intent.type}`);

      res.json(result);
    } catch (error) {
      console.error("Error refining prompt:", error);
      res.status(500).json({ error: "Failed to refine prompt" });
    }
  });

  // ============ TEXT-TO-IMAGE GENERATION ============
  // Uses Nano Banana Pro for HQ text-to-image (no reference image needed)
  // Perfect for logos, scenarios, creative concepts
  app.post("/api/modelslab/text2img", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Check if user is admin (all admins bypass quotas)
      const user = await storage.getAppUser(userId);
      const isAdmin = user?.isAdmin === 1;
      const encryptedApiKey = user?.customModelsLabKey;
      const hasCustomKey = isAdmin && !!encryptedApiKey;

      // All admins bypass quotas, regardless of having a custom key
      let imageQuota: ImageQuotaResult;
      if (isAdmin) {
        // Admins get unlimited HQ access
        imageQuota = {
          allowed: true,
          isPro: true,
          modelId: MODELSLAB_MODELS.HQ,
          imageQuality: "hq"
        };
      } else {
        imageQuota = await checkImageQuotaAndModel(userId);
        if (!imageQuota.allowed) {
          return res.status(403).json({
            error: imageQuota.reason,
            isPremiumRequired: true,
            quotas: imageQuota.quotas,
          });
        }
      }

      const { prompt, aspectRatio, negativePrompt } = req.body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "Prompt is required for text-to-image generation" });
      }

      // Use custom API key for admins (decrypt if present), otherwise use system key
      let apiKey = process.env.MODELSLAB_API_KEY;
      if (hasCustomKey && encryptedApiKey) {
        try {
          const { decryptApiKey } = await import("./lib/encryption");
          const decryptedKey = decryptApiKey(encryptedApiKey);
          if (decryptedKey) {
            apiKey = decryptedKey;
          }
        } catch {
          // If decryption fails, use system key
        }
      }
      if (!apiKey) {
        return res.status(500).json({ error: "ModelsLab API key not configured" });
      }

      // Check if user is Pro from quota
      const isPro = imageQuota?.isPro === true;

      // Select model based on plan
      let selectedModel: string;
      let isHqModel: boolean;

      if (isAdmin || isPro) {
        // Pro/Admin get Nano Banana Pro for text2img
        selectedModel = MODELSLAB_MODELS.HQ;
        isHqModel = true;
        console.log(`[TEXT2IMG] User is ${isAdmin ? 'Admin' : 'Pro'} - using Nano Banana Pro HQ model`);
      } else {
        // Free users use standard model or HQ while quota available
        selectedModel = imageQuota?.modelId || MODELSLAB_MODELS.STANDARD;
        isHqModel = imageQuota?.imageQuality === "hq";
        console.log(`[TEXT2IMG] Free user - using ${selectedModel} (${imageQuota?.imageQuality || 'standard'} quality)`);
      }

      // Build negative prompt
      let finalNegativePrompt = negativePrompt || "bad quality, blurry, distorted, low resolution, watermark, text, ugly, deformed";

      // Calculate dimensions from aspect ratio
      const validRatios = ["1:1", "9:16", "2:3", "3:4", "4:5", "5:4", "4:3", "3:2", "16:9", "21:9"];
      const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

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

      // Truncate prompt to API max length (2000 chars)
      const truncatedPrompt = prompt.length > 2000 ? prompt.substring(0, 2000) : prompt;

      // Build request for text2img API
      let requestBody: any;
      let apiEndpoint: string;

      if (isHqModel && selectedModel === MODELSLAB_MODELS.HQ) {
        // Nano Banana Pro text2img - use v7 API
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
          negative_prompt: finalNegativePrompt,
          aspect_ratio: nanoBananaRatio,
          guidance_scale: 7.5,
        };
        apiEndpoint = "https://modelslab.com/api/v7/images/text-to-image";

        console.log(`[TEXT2IMG] Using Nano Banana Pro (v7 API) for text-to-image`);
      } else {
        // Standard model - use v6 API text2img
        requestBody = {
          key: apiKey,
          model_id: selectedModel,
          prompt: truncatedPrompt,
          negative_prompt: finalNegativePrompt,
          width: dimensions.width,
          height: dimensions.height,
          samples: "1",
          num_inference_steps: "30",
          safety_checker: "no",
          enhance_prompt: "yes",
          guidance_scale: 7.5,
          scheduler: "DPMSolverMultistepScheduler",
        };
        apiEndpoint = "https://modelslab.com/api/v6/images/text2img";

        console.log(`[TEXT2IMG] Using ${selectedModel} (v6 API) for text-to-image`);
      }

      console.log(`[TEXT2IMG] Sending to ModelsLab:`, {
        ...requestBody,
        key: "[REDACTED]",
        prompt: `[${truncatedPrompt.length} chars]`,
      });

      let response = await fetchWithTimeout(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }, 90000); // 90s timeout

      let data = await response.json();

      // Retry mechanism: If custom key fails, try with System Key
      if (data.status === "error" &&
        (data.message?.includes("Invalid API Key") || data.message?.includes("auth")) &&
        hasCustomKey) {

        console.warn("[TEXT2IMG] Custom Admin API Key failed. Retrying with System API Key...");

        requestBody.key = process.env.MODELSLAB_API_KEY;

        response = await fetchWithTimeout(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }, 90000);

        data = await response.json();
      }

      if (data.status === "error") {
        console.error("[TEXT2IMG] ModelsLab error:", data);
        return res.status(400).json({ error: data.message || "ModelsLab API error" });
      }

      // Process base64 URLs if present
      if (data.status === "success" && data.output && Array.isArray(data.output)) {
        const processedOutput: string[] = [];
        for (const url of data.output) {
          if (typeof url === 'string' && url.endsWith('.base64')) {
            try {
              const base64Response = await fetchWithTimeout(url, {
                method: "GET",
              }, 30000);
              const base64Content = await base64Response.text();
              const cleanBase64 = base64Content.trim();

              let mimeType = 'image/png';
              if (cleanBase64.startsWith('/9j/')) {
                mimeType = 'image/jpeg';
              } else if (cleanBase64.startsWith('iVBOR')) {
                mimeType = 'image/png';
              }
              processedOutput.push(`data:${mimeType};base64,${cleanBase64}`);
            } catch (err) {
              console.error('[TEXT2IMG] Failed to fetch base64 content:', err);
              processedOutput.push(url);
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
        generationType: "text2img",
      });

      // Include quota info and model used in response
      res.json({
        ...data,
        modelUsed: selectedModel,
        imageQuality: imageQuota.imageQuality,
        hqExhausted: imageQuota.hqExhausted || false,
        quotas: imageQuota.quotas,
        generationType: "text2img",
      });
    } catch (error) {
      console.error("[TEXT2IMG] Error calling ModelsLab API:", error);
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
        res.status(201).json({ id: result.jobId, status: "queued" });
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
      const userId = requireAuth(_req, res);
      if (!userId) return;
      const jobs = await storage.getVideoJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching video jobs:", error);
      res.status(500).json({ error: "Failed to fetch video job" });
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
  app.get("/api/gallery", async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      const images = await storage.getSavedImages(userId);
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

  app.post("/api/gallery", async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      const validated = saveImageRequestSchema.parse(req.body);
      const image = await storage.createSavedImage({
        ...validated,
        userId: userId,
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const updated = await storage.toggleFavorite(req.params.id, userId);
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const success = await storage.deleteSavedImage(req.params.id, userId);
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
  app.get("/api/video-gallery", async (req: Request, res: Response) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      const videos = await storage.getSavedVideos(userId);
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const validated = saveVideoRequestSchema.parse(req.body);
      const video = await storage.createSavedVideo({
        ...validated,
        userId: userId,
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const updated = await storage.toggleVideoFavorite(req.params.id, userId);
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const success = await storage.deleteSavedVideo(req.params.id, userId);
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
  app.get("/api/presets", async (req, res) => {
    try {
      const userId = requireAuth(req, res);
      if (!userId) return;
      const presets = await storage.getFilterPresets(userId);
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      console.log("Creating preset with body:", JSON.stringify(req.body, null, 2));
      const validated = createFilterPresetRequestSchema.parse(req.body);
      console.log("Validated preset:", JSON.stringify(validated, null, 2));
      const preset = await storage.createFilterPreset({
        ...validated,
        userId: userId,
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const validated = updateFilterPresetRequestSchema.parse(req.body);
      const updated = await storage.updateFilterPreset(req.params.id, userId, {
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
      const userId = requireAuth(req, res);
      if (!userId) return;
      const success = await storage.deleteFilterPreset(req.params.id, userId);
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
