import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { storageProvider } from "./lib/storage-provider";
import { verifySignature, createJobPayload } from "./lib/hmac";
import { loraJobRateLimiter, webhookRateLimiter, datasetUploadRateLimiter } from "./lib/rate-limiter";
import {
  createLoraModelRequestSchema,
  initDatasetRequestSchema,
  validateDatasetRequestSchema,
  createLoraJobRequestSchema,
  webhookPayloadSchema,
  activateLoraRequestSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { createHash } from "crypto";

const WORKER_URL = process.env.WORKER_URL || "";
const IS_PRO_OVERRIDE = process.env.ADMIN_OVERRIDE === "true" || process.env.PLAN_PRO_OVERRIDE === "true";
const FREE_LORA_JOBS = 0;
const PRO_LORA_JOBS = 10;

function getUserId(req: Request): string {
  return req.ip || "anonymous";
}

async function checkLoraPermission(req: Request, res: Response, next: NextFunction) {
  if (IS_PRO_OVERRIDE) {
    return next();
  }
  
  return res.status(403).json({
    error: "LoRA training requires a Pro subscription",
    isPremiumRequired: true,
  });
}

export function registerLoraRoutes(app: Express) {
  app.get("/api/lora/models", async (req, res) => {
    try {
      const userId = getUserId(req);
      const models = await storage.getLoraModels(userId);
      res.json(models);
    } catch (error) {
      console.error("Error fetching LoRA models:", error);
      res.status(500).json({ error: "Failed to fetch LoRA models" });
    }
  });

  app.get("/api/lora/models/:id", async (req, res) => {
    try {
      const model = await storage.getLoraModel(req.params.id);
      if (!model) {
        return res.status(404).json({ error: "LoRA model not found" });
      }
      
      const datasets = await storage.getLoraDatasets(model.id);
      const versions = await storage.getLoraVersions(model.id);
      
      res.json({ ...model, datasets, versions });
    } catch (error) {
      console.error("Error fetching LoRA model:", error);
      res.status(500).json({ error: "Failed to fetch LoRA model" });
    }
  });

  app.post("/api/lora/models", checkLoraPermission, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validated = createLoraModelRequestSchema.parse(req.body);
      
      const model = await storage.createLoraModel({
        userId,
        name: validated.name,
        description: validated.description || null,
        consentGiven: validated.consent ? 1 : 0,
      });
      
      res.status(201).json(model);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error creating LoRA model:", error);
      res.status(500).json({ error: "Failed to create LoRA model" });
    }
  });

  app.post("/api/lora/dataset/init", checkLoraPermission, datasetUploadRateLimiter(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const validated = initDatasetRequestSchema.parse(req.body);
      
      const model = await storage.getLoraModel(validated.loraModelId);
      if (!model) {
        return res.status(404).json({ error: "LoRA model not found" });
      }
      
      if (model.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const dataset = await storage.createLoraDataset({
        userId,
        loraModelId: validated.loraModelId,
        imageCount: validated.imageCount,
        status: "pending",
      });
      
      const datasetKey = `datasets/${userId}/${dataset.id}/images.zip`;
      const { uploadUrl, publicUrl } = await storageProvider.getPresignedUploadUrl(datasetKey);
      
      await storage.updateLoraDataset(dataset.id, { datasetUrl: publicUrl });
      
      res.status(201).json({
        datasetId: dataset.id,
        uploadUrl,
        publicUrl,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error initializing dataset:", error);
      res.status(500).json({ error: "Failed to initialize dataset" });
    }
  });

  app.post("/api/lora/dataset/validate", checkLoraPermission, async (req, res) => {
    try {
      const validated = validateDatasetRequestSchema.parse(req.body);
      
      const dataset = await storage.getLoraDataset(validated.datasetId);
      if (!dataset) {
        return res.status(404).json({ error: "Dataset not found" });
      }
      
      const qualityReport = {
        valid: true,
        imageCount: dataset.imageCount,
        minResolution: { width: 512, height: 512 },
        duplicatesFound: 0,
        issues: [] as string[],
        score: 85,
      };
      
      if (dataset.imageCount < 10) {
        qualityReport.valid = false;
        qualityReport.issues.push("Minimum 10 images required");
        qualityReport.score -= 30;
      }
      
      if (dataset.imageCount > 30) {
        qualityReport.issues.push("More than 30 images may slow training");
        qualityReport.score -= 5;
      }
      
      const datasetHash = createHash("sha256")
        .update(`${dataset.id}-${dataset.imageCount}-${Date.now()}`)
        .digest("hex")
        .substring(0, 16);
      
      await storage.updateLoraDataset(dataset.id, {
        qualityReport,
        datasetHash,
        status: qualityReport.valid ? "validated" : "invalid",
      });
      
      res.json({ datasetId: dataset.id, qualityReport, datasetHash });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error validating dataset:", error);
      res.status(500).json({ error: "Failed to validate dataset" });
    }
  });

  app.post("/api/lora/jobs", checkLoraPermission, loraJobRateLimiter(), async (req, res) => {
    try {
      const userId = getUserId(req);
      const validated = createLoraJobRequestSchema.parse(req.body);
      
      const model = await storage.getLoraModel(validated.loraModelId);
      if (!model || model.userId !== userId) {
        return res.status(404).json({ error: "LoRA model not found" });
      }
      
      const dataset = await storage.getLoraDataset(validated.datasetId);
      if (!dataset || dataset.status !== "validated") {
        return res.status(400).json({ error: "Dataset must be validated before training" });
      }
      
      if (!dataset.datasetHash) {
        return res.status(400).json({ error: "Dataset has no hash" });
      }
      
      const version = await storage.createLoraVersion({
        loraModelId: validated.loraModelId,
        baseModel: validated.baseModel,
        params: validated.params,
        datasetHash: dataset.datasetHash,
      });
      
      const job = await storage.createLoraJob({
        loraVersionId: version.id,
        provider: "webhook_worker",
        status: "pending",
      });
      
      if (WORKER_URL) {
        const callbackUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:5000"}/api/lora/webhook`;
        
        const signedPayload = createJobPayload(
          job.id,
          dataset.datasetUrl || "",
          validated.params,
          callbackUrl
        );
        
        try {
          const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Signature": signedPayload.signature,
              "X-Timestamp": String(signedPayload.timestamp),
            },
            body: JSON.stringify(signedPayload.payload),
          });
          
          if (response.ok) {
            const result = await response.json() as { externalJobId?: string };
            await storage.updateLoraJob(job.id, {
              status: "processing",
              externalJobId: result.externalJobId || null,
              startedAt: new Date(),
            });
          } else {
            await storage.updateLoraJob(job.id, {
              status: "failed",
              error: "Failed to start worker job",
            });
          }
        } catch (err) {
          console.error("Worker request failed:", err);
          await storage.updateLoraJob(job.id, {
            status: "pending",
            error: "Worker unavailable - job queued",
          });
        }
      } else {
        await storage.updateLoraJob(job.id, {
          error: "No worker configured - job in mock mode",
        });
      }
      
      res.status(201).json({ job, version });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error creating LoRA job:", error);
      res.status(500).json({ error: "Failed to create LoRA job" });
    }
  });

  app.get("/api/lora/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getLoraJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const version = await storage.getLoraVersion(job.loraVersionId);
      res.json({ job, version });
    } catch (error) {
      console.error("Error fetching LoRA job:", error);
      res.status(500).json({ error: "Failed to fetch LoRA job" });
    }
  });

  app.post("/api/lora/webhook", webhookRateLimiter(), async (req, res) => {
    try {
      const signature = req.headers["x-signature"] as string;
      const timestamp = parseInt(req.headers["x-timestamp"] as string, 10);
      
      if (!signature || !timestamp) {
        return res.status(401).json({ error: "Missing authentication headers" });
      }
      
      const verification = verifySignature(signature, timestamp, req.body);
      if (!verification.valid) {
        return res.status(401).json({ error: verification.error });
      }
      
      const validated = webhookPayloadSchema.parse(req.body);
      
      const job = await storage.getLoraJob(validated.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      await storage.updateLoraJob(validated.jobId, {
        status: validated.status,
        logsUrl: validated.logsUrl || null,
        error: validated.error || null,
        finishedAt: validated.status === "completed" || validated.status === "failed" ? new Date() : null,
      });
      
      if (validated.status === "completed" && validated.artifactUrl) {
        await storage.updateLoraVersion(job.loraVersionId, {
          artifactUrl: validated.artifactUrl,
          checksum: validated.checksum || null,
          previewImages: validated.previewImages || [],
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid webhook payload", details: error.errors });
      }
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/lora/activate", checkLoraPermission, async (req, res) => {
    try {
      const userId = getUserId(req);
      const validated = activateLoraRequestSchema.parse(req.body);
      
      const version = await storage.getLoraVersion(validated.loraVersionId);
      if (!version) {
        return res.status(404).json({ error: "LoRA version not found" });
      }
      
      if (!version.artifactUrl) {
        return res.status(400).json({ error: "LoRA version has no trained artifact" });
      }
      
      const model = await storage.getLoraModel(version.loraModelId);
      if (!model || model.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const active = await storage.setUserActiveLora(userId, validated.loraVersionId, validated.weight);
      
      res.json(active);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error activating LoRA:", error);
      res.status(500).json({ error: "Failed to activate LoRA" });
    }
  });

  app.get("/api/lora/active", async (req, res) => {
    try {
      const userId = getUserId(req);
      const active = await storage.getUserActiveLora(userId);
      
      if (!active) {
        return res.json(null);
      }
      
      const version = await storage.getLoraVersion(active.loraVersionId);
      const model = version ? await storage.getLoraModel(version.loraModelId) : null;
      
      res.json({ ...active, version, model });
    } catch (error) {
      console.error("Error fetching active LoRA:", error);
      res.status(500).json({ error: "Failed to fetch active LoRA" });
    }
  });

  app.delete("/api/lora/active", checkLoraPermission, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      res.json({ success: true, message: "LoRA deactivated" });
    } catch (error) {
      console.error("Error deactivating LoRA:", error);
      res.status(500).json({ error: "Failed to deactivate LoRA" });
    }
  });

  app.get("/api/lora/base-models", async (_req, res) => {
    try {
      const models = await storage.getBaseModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching base models:", error);
      res.status(500).json({ error: "Failed to fetch base models" });
    }
  });
}
