import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../lib/auth-helpers";
import { log } from "../lib/logger";
import { encryptApiKey } from "../lib/encryption";

const router = Router();

// Admin: Save custom ModelsLab API key (encrypted)
router.post("/api-key", async (req, res) => {
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
router.delete("/api-key", async (req, res) => {
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

// Admin: Validate custom API key
router.post("/validate-custom-key", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        if (!userId) return;

        const user = await storage.getAppUser(userId);
        if (!user || user.isAdmin !== 1) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { apiKey } = req.body;
        if (!apiKey || typeof apiKey !== "string") {
            return res.status(400).json({ error: "API key is required" });
        }

        // Test the key with a minimal API call to check if it's valid
        try {
            // Use node-fetch or native fetch (Node 18+)
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

export default router;
