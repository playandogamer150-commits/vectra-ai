import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth } from "../lib/auth-helpers";
import { saveImageRequestSchema, saveVideoRequestSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";

const router = Router();

// ============ SAVED IMAGES (Gallery) ============
const imagesRouter = Router();

imagesRouter.get("/", async (req: Request, res: Response) => {
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

imagesRouter.get("/:id", async (req, res) => {
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

imagesRouter.post("/", async (req: Request, res: Response) => {
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

imagesRouter.patch("/:id/favorite", async (req, res) => {
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

imagesRouter.delete("/:id", async (req, res) => {
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

// ============ SAVED VIDEOS (Video Gallery) ============
const videosRouter = Router();

videosRouter.get("/", async (req: Request, res: Response) => {
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

videosRouter.get("/:id", async (req, res) => {
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

videosRouter.post("/", async (req, res) => {
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

videosRouter.patch("/:id/favorite", async (req, res) => {
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

videosRouter.delete("/:id", async (req, res) => {
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

// ============ VIDEO/MEDIA PROXY (for CORS) ============
// Proxy endpoint to serve R2 videos without CORS issues
const proxyRouter = Router();

proxyRouter.get("/media", async (req, res) => {
    try {
        const url = req.query.url as string;
        if (!url) {
            return res.status(400).json({ error: "URL parameter required" });
        }

        // Allow proxying from trusted image/video sources
        const allowedDomains = [
            // Cloudflare R2 buckets
            "r2.dev",
            "pub-3626123a908346a7a8be8d9295f44e26.r2.dev",
            // ModelsLab CDNs
            "modelslab.com",
            "cdn.modelslab.com",
            "cdn2.modelslab.com",
            // Stable Diffusion API CDNs
            "stablediffusionapi.com",
            "cdn.stablediffusionapi.com",
            "cdn2.stablediffusionapi.com",
            // Cloudflare general
            "cloudflare.com",
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

export { imagesRouter, videosRouter, proxyRouter };
