import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import path from "path";
import express from "express";
import { setupAuth, registerAuthRoutes } from "../replit_integrations/auth/index";
import { registerLoraRoutes } from "../lora-routes";
import { seedDatabase } from "../lib/seeder";
import { storage } from "../storage";
import { compiler } from "../prompt-engine/compiler";
import profileRouter from "./profile";
import adminRouter from "./admin";
import miscRouter from "./misc";
import blueprintsRouter from "./blueprints";
import promptsRouter from "./prompts";
import imageGenRouter from "./image-generation";
import videoGenRouter from "./video-generation";
import { imagesRouter, videosRouter, proxyRouter } from "./gallery";
import presetsRouter from "./presets";
import stripeRouter from "./stripe-routes";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
    // Set up authentication first
    await setupAuth(app);
    registerAuthRoutes(app);

    // Initialize database with default data
    await seedDatabase();

    // Initialize Compiler Data
    const profiles = await storage.getProfiles();
    const blueprints = await storage.getBlueprints();
    const blocks = await storage.getBlocks();
    const filters = await storage.getFilters();
    compiler.setData(profiles, blueprints, blocks, filters);

    registerLoraRoutes(app);

    // API Routes
    app.use("/api/profile", profileRouter);
    app.use("/api/admin", adminRouter);
    app.use("/api", miscRouter); // Includes /api/waitlist, /api/profiles, etc.
    app.use("/api/user-blueprints", blueprintsRouter);
    app.use("/api", promptsRouter); // Includes /api/generate, /api/save-version, /api/prompt/:id
    app.use("/api/modelslab", imageGenRouter);
    app.use("/api", videoGenRouter); // Includes /api/sora2/* and /api/videogen/*
    app.use("/api/gallery", imagesRouter);
    app.use("/api/video-gallery", videosRouter);
    app.use("/api/proxy", proxyRouter);
    app.use("/api/presets", presetsRouter);
    app.use("/api/stripe", stripeRouter);

    // Health check with detailed status
    const startTime = Date.now();
    app.get("/api/health", async (_req, res) => {
        const uptime = process.uptime();
        try {
            // Quick DB check
            await storage.getProfiles();
            res.json({
                status: "ok",
                timestamp: new Date().toISOString(),
                uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
                version: "1.2.0",
                database: "connected",
                environment: process.env.NODE_ENV || "development",
            });
        } catch (error) {
            res.status(503).json({
                status: "degraded",
                timestamp: new Date().toISOString(),
                uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
                version: "1.2.0",
                database: "disconnected",
                error: "Database connection failed",
            });
        }
    });

    return httpServer;
}
