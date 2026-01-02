import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, getUserId } from "../lib/auth-helpers";
import {
    createUserBlueprintRequestSchema,
    updateUserBlueprintRequestSchema,
} from "@shared/schema";
import { ZodError } from "zod";

const router = Router();
const FREE_BLUEPRINT_LIMIT = 2;

router.get("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.patch("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

router.get("/:id/versions", async (req, res) => {
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

router.post("/:id/duplicate", async (req, res) => {
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

export default router;
