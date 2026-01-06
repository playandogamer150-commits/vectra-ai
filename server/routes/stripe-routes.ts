import { Router } from "express";
import { stripeService } from "../stripeService";
import { getStripePublishableKey } from "../stripeClient";
import { requireAuth } from "../lib/auth-helpers";
import { storage } from "../storage";

const router = Router();

router.get("/publishable-key", async (req, res) => {
    try {
        const publishableKey = await getStripePublishableKey();
        res.json({ publishableKey });
    } catch (error: any) {
        console.error("Error getting Stripe publishable key:", error);
        res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
});

router.get("/products", async (req, res) => {
    try {
        const products = await stripeService.listProductsWithPrices();
        res.json({ products });
    } catch (error: any) {
        console.error("Error listing products:", error);
        res.status(500).json({ error: "Failed to list products" });
    }
});

router.post("/checkout", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        console.log("[Stripe Checkout] Request received from UserID:", userId);
        if (!userId) {
            console.log("[Stripe Checkout] Unauthorized attempt.");
            return;
        }

        const user = req.user as any;
        const { priceId } = req.body;

        if (!priceId) {
            return res.status(400).json({ error: "Price ID is required" });
        }

        // Validate Price ID against active products
        const products = await stripeService.listProductsWithPrices();
        const validPrice = products.find(p => p.priceId === priceId);

        if (!validPrice) {
            console.warn(`[Stripe Checkout] Invalid or inactive Price ID requested: ${priceId} by user ${userId}`);
            return res.status(400).json({ error: "Invalid price selected. Please refresh the page and try again." });
        }
        console.log("[Stripe Checkout] Valid price ID:", priceId);

        let appUser = await storage.getAppUser(userId);

        if (appUser?.plan === "pro") {
            return res.status(400).json({ error: "Already subscribed to Pro" });
        }

        let customerId = appUser?.stripeCustomerId;
        const userEmail = user?.claims?.email || `${user?.claims?.name || 'user'}@vectra.temp`;
        const userName = user?.claims?.name || user?.claims?.sub || "User";

        if (!customerId) {
            try {
                const customer = await stripeService.createCustomer(
                    userEmail,
                    userId,
                    userName
                );
                customerId = customer.id;

                if (appUser) {
                    await stripeService.updateUserStripeInfo(userId, { stripeCustomerId: customerId });
                } else {
                    await storage.createAppUserFromReplit(userId, userName, customerId);
                }
                appUser = await storage.getAppUser(userId);
            } catch (err: any) {
                console.error("Failed to create Stripe customer:", err);
                return res.status(500).json({ error: "Failed to initialize billing account: " + err.message });
            }
        }

        // Ensure customerId is a string
        if (!customerId) {
            return res.status(500).json({ error: "Failed to resolve customer ID" });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const locale = req.body.locale || req.headers['accept-language']?.split(',')[0] || 'pt-BR';

        // Explicit success/cancel overrides or defaults
        const successUrl = req.body.successUrl || `${baseUrl}/pricing?success=true`;
        const cancelUrl = req.body.cancelUrl || `${baseUrl}/pricing?canceled=true`;

        const session = await stripeService.createCheckoutSession(
            customerId,
            priceId,
            successUrl,
            cancelUrl,
            locale,
            userId
        );

        console.log("[Stripe Checkout] Session created:", session.id, "URL:", session.url);
        res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error("[Stripe Checkout] Error creating checkout session:", error);
        res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
});

router.post("/portal", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        if (!userId) return;

        const user = req.user as any;
        if (!user?.claims?.sub) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const appUser = await storage.getAppUser(userId);
        if (!appUser?.stripeCustomerId) {
            return res.status(400).json({ error: "No billing account found" });
        }

        const returnUrl = req.body.returnUrl || `${req.protocol}://${req.get('host')}/profile`;

        const session = await stripeService.createCustomerPortalSession(
            appUser.stripeCustomerId,
            returnUrl
        );

        res.json({ url: session.url });
    } catch (error: any) {
        console.error("Error creating portal session:", error);
        res.status(500).json({ error: error.message || "Failed to create portal session" });
    }
});

router.get("/subscription", async (req, res) => {
    try {
        const userId = requireAuth(req, res);
        if (!userId) return;

        const appUser = await storage.getAppUser(userId);

        if (!appUser?.stripeSubscriptionId) {
            return res.json({ subscription: null });
        }

        const subscription = await stripeService.getSubscription(appUser.stripeSubscriptionId);
        res.json({ subscription });
    } catch (error: any) {
        console.error("Error getting subscription status:", error);
        res.status(500).json({ error: "Failed to get subscription status" });
    }
});

export default router;
