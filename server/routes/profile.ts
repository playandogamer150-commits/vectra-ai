import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, getUserId, DEV_USER_ID, IS_PRO_OVERRIDE } from "../lib/auth-helpers";
import { updateProfileSchema } from "@shared/schema";
import { ZodError } from "zod";
import { FREE_LIMITS, MODELSLAB_MODELS } from "../lib/quotas";
import { log } from "../lib/logger";
import { validateImageDataUrl } from "../middleware/fileValidation";

const router = Router();

// Profile routes
router.get("/", async (req, res) => {
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

            if (isAdminEmail && appUser.isAdmin !== 1) {
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

router.put("/", async (req, res) => {
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
router.patch("/", async (req, res) => {
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

// Avatar upload endpoint - with enterprise-grade file validation
router.post("/avatar", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        if (!userId) return;

        const { imageData } = req.body;

        if (!imageData || typeof imageData !== "string") {
            return res.status(400).json({ error: "Image data is required" });
        }

        // Enterprise-grade file validation (magic numbers, MIME, size, malicious content)
        const validation = validateImageDataUrl(imageData, "avatar");
        if (!validation.valid) {
            log(`Avatar upload rejected for user ${userId}: ${validation.error}`, "security", "warn");
            return res.status(400).json({ error: validation.error });
        }

        // Update user avatar
        const updated = await storage.updateAppUser(userId, { avatarUrl: imageData });

        if (!updated) {
            return res.status(500).json({ error: "Failed to update avatar" });
        }

        log(`Avatar updated for user ${userId}`, "profile", "info");
        res.json({ success: true, avatarUrl: imageData });
    } catch (error) {
        console.error("Error uploading avatar:", error);
        res.status(500).json({ error: "Failed to upload avatar" });
    }
});

// Remove avatar endpoint
router.delete("/avatar", async (req, res) => {
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

// Banner upload endpoint - with persistent cropping support
router.post("/banner", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        if (!userId) return;

        const { imageData, cropData } = req.body;

        if (!imageData || typeof imageData !== "string") {
            return res.status(400).json({ error: "Image data is required" });
        }

        // Enterprise-grade file validation
        const validation = validateImageDataUrl(imageData, "banner");
        if (!validation.valid) {
            log(`Banner upload rejected for user ${userId}: ${validation.error}`, "security", "warn");
            return res.status(400).json({ error: validation.error });
        }

        // Update user banner and its crop metadata
        const updated = await storage.updateAppUser(userId, {
            bannerUrl: imageData,
            bannerCrop: cropData || null
        });

        if (!updated) {
            return res.status(500).json({ error: "Failed to update banner" });
        }

        log(`Banner and crop metadata updated for user ${userId}`, "profile", "info");
        res.json({ success: true, bannerUrl: imageData, bannerCrop: cropData });
    } catch (error) {
        console.error("Error uploading banner:", error);
        res.status(500).json({ error: "Failed to upload banner" });
    }
});

// Remove banner endpoint
router.delete("/banner", async (req, res) => {
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

router.get("/usage", async (req, res) => {
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
                    maxBlueprints: 2,
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

export default router;
