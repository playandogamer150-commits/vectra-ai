import { Router } from "express";
import { storage } from "../storage";
import { log } from "../lib/logger";
import { sendWelcomeEmail } from "../lib/email";
import { getAvailableGems, GEMINI_GEMS } from "../prompt-engine/gemini-gems";
import { requireAuth } from "../lib/auth-helpers";

const router = Router();

// Waitlist endpoint
router.post("/waitlist", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !email.includes("@")) {
            return res.status(400).json({ error: "Invalid email" });
        }

        // Check if already in waitlist
        const existing = await storage.getWaitlistEntry(email);
        if (existing) {
            const count = await storage.getWaitlistCount();
            return res.json({ success: true, position: count + 2847 });
        }

        await storage.addToWaitlist(email);
        const count = await storage.getWaitlistCount();

        // Async email sending (don't block response)
        sendWelcomeEmail(email, count + 2847).catch(err => {
            log(`Failed to send welcome email to ${email}: ${err}`, "email", "error");
        });

        res.json({ success: true, position: count + 2847 });
    } catch (err) {
        log(`Waitlist error: ${err}`, "api", "error");
        res.status(500).json({ error: "Failed to join waitlist" });
    }
});

router.get("/profiles", async (_req, res) => {
    try {
        const profiles = await storage.getProfiles();
        res.json(profiles);
    } catch (error) {
        console.error("Error fetching profiles:", error);
        res.status(500).json({ error: "Failed to fetch profiles" });
    }
});

router.get("/blueprints", async (_req, res) => {
    try {
        const blueprints = await storage.getBlueprints();
        res.json(blueprints);
    } catch (error) {
        console.error("Error fetching blueprints:", error);
        res.status(500).json({ error: "Failed to fetch blueprints" });
    }
});

router.get("/filters", async (_req, res) => {
    try {
        const filters = await storage.getFilters();
        res.json(filters);
    } catch (error) {
        console.error("Error fetching filters:", error);
        res.status(500).json({ error: "Failed to fetch filters" });
    }
});

router.get("/blocks", async (_req, res) => {
    try {
        const blocks = await storage.getBlocks();
        res.json(blocks);
    } catch (error) {
        console.error("Error fetching blocks:", error);
        res.status(500).json({ error: "Failed to fetch blocks" });
    }
});

// Gemini Gems Optimization Endpoints
router.get("/gemini-gems", async (_req, res) => {
    try {
        const gems = getAvailableGems();
        res.json(gems);
    } catch (error) {
        console.error("Error fetching Gemini gems:", error);
        res.status(500).json({ error: "Failed to fetch Gemini gems" });
    }
});

router.get("/gemini-gems/:id", async (req, res) => {
    try {
        const gem = GEMINI_GEMS[req.params.id];
        if (!gem) {
            return res.status(404).json({ error: "Gemini gem not found" });
        }
        res.json(gem);
    } catch (error) {
        console.error("Error fetching Gemini gem:", error);
        res.status(500).json({ error: "Failed to fetch Gemini gem" });
    }
});

router.get("/history", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        if (!userId) return;

        const history = await storage.getHistory(userId);
        res.json(history);
    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

export default router;
