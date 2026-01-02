import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../lib/auth-helpers";
import { createFilterPresetRequestSchema, updateFilterPresetRequestSchema } from "@shared/schema";
import { ZodError } from "zod";

const router = Router();

router.get("/", async (req, res) => {
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

router.get("/:id", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.patch("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

export default router;
