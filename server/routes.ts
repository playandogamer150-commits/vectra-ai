import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { compiler } from "./prompt-engine/compiler";
import { defaultProfiles, defaultBlueprints, defaultBlocks, defaultFilters, defaultBaseModels } from "./prompt-engine/presets";
import { generateRequestSchema } from "@shared/schema";
import { ZodError } from "zod";
import { registerLoraRoutes } from "./lora-routes";

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

      const result = compiler.compile({
        profileId: validated.profileId,
        blueprintId: validated.blueprintId,
        filters: validated.filters,
        seed: validated.seed || "",
        subject: validated.subject,
        context: validated.context,
        items: validated.items,
        environment: validated.environment,
        restrictions: validated.restrictions,
      });

      const savedPrompt = await storage.createGeneratedPrompt({
        userId: null,
        profileId: validated.profileId,
        blueprintId: validated.blueprintId,
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

      res.json(savedPrompt);
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

  return httpServer;
}
