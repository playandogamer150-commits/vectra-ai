import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { compiler } from "./prompt-engine/compiler";
import { defaultProfiles, defaultBlueprints, defaultBlocks, defaultFilters, defaultBaseModels } from "./prompt-engine/presets";
import { 
  generateRequestSchema, 
  createUserBlueprintRequestSchema, 
  updateUserBlueprintRequestSchema,
  saveImageRequestSchema,
  createFilterPresetRequestSchema,
  updateFilterPresetRequestSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { registerLoraRoutes } from "./lora-routes";

const DEV_USER_ID = "dev_user";

async function seedDatabase() {
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
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  const profiles = await storage.getProfiles();
  const blueprints = await storage.getBlueprints();
  const blocks = await storage.getBlocks();
  const filters = await storage.getFilters();
  compiler.setData(profiles, blueprints, blocks, filters);

  registerLoraRoutes(app);

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

      const compileInput = {
        profileId: validated.profileId,
        blueprintId: effectiveBlueprintId,
        filters: validated.filters,
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

      const result = compiler.compile(compileInput);

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

  // ModelsLab Nano Banana Pro API
  app.post("/api/modelslab/generate", async (req, res) => {
    try {
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
      
      const requestBody = {
        key: apiKey,
        model_id: "nano-banana-pro",
        prompt,
        init_image: processedImages,
        aspect_ratio: selectedRatio,
      };
      
      console.log("Sending to ModelsLab:", { 
        ...requestBody, 
        key: "[REDACTED]",
        init_image: `[${processedImages.length} images]`
      });
      
      const response = await fetch("https://modelslab.com/api/v7/images/image-to-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (data.status === "error") {
        console.error("ModelsLab error:", data);
        return res.status(400).json({ error: data.message || "ModelsLab API error" });
      }
      
      res.json(data);
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
      
      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
        }),
      });
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error checking ModelsLab status:", error);
      res.status(500).json({ error: "Failed to check status" });
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
      const validated = createFilterPresetRequestSchema.parse(req.body);
      const preset = await storage.createFilterPreset({
        ...validated,
        userId: DEV_USER_ID,
        isDefault: validated.isDefault ? 1 : 0,
      });
      res.status(201).json(preset);
    } catch (error) {
      if (error instanceof ZodError) {
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

  return httpServer;
}
