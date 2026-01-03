import { Router } from "express";
import { storage } from "../storage";
import { getUserId, requireAuth } from "../lib/auth-helpers";
import { checkGenerationLimits, logUsage } from "../lib/quotas";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";
import { createVideoJobRequestSchema } from "@shared/schema";
import { ZodError } from "zod";

const router = Router();
const ALLOWED_MODELSLAB_HOSTS = [
    "modelslab.com",
    "api.modelslab.com",
    "stablediffusionapi.com",
];

// ============ IMAGE-TO-VIDEO GENERATION (Direct) ============
// Uses ModelsLab Wan 2.1 I2V model for high quality video from any image
router.post("/sora2/generate", async (req, res) => {
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
        }, 300000); // 300s timeout for video generation

        const data = await response.json();
        console.log("Wan 2.1 I2V response:", data);

        res.json(data);
    } catch (error) {
        console.error("Error generating video:", error);
        res.status(500).json({ error: "Failed to generate video" });
    }
});

router.post("/sora2/status", async (req, res) => {
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
router.post("/videogen/jobs", async (req, res) => {
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
        const { createVideoJob } = await import("../videogen/service");
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

router.get("/videogen/jobs", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        if (!userId) return;
        const jobs = await storage.getVideoJobs(userId);
        res.json(jobs);
    } catch (error) {
        console.error("Error fetching video jobs:", error);
        res.status(500).json({ error: "Failed to fetch video job" });
    }
});

router.get("/videogen/jobs/:id", async (req, res) => {
    try {
        const job = await storage.getVideoJob(req.params.id);
        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        if (job.status === "processing" && job.providerJobId) {
            const { pollVideoJob } = await import("../videogen/service");
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

export default router;
