import { storage } from "../storage";

export const IS_PRO_OVERRIDE = process.env.ADMIN_OVERRIDE === "true" || process.env.PLAN_PRO_OVERRIDE === "true";

export const FREE_LIMITS = {
    promptsPerDay: 10,
    imagesHqPerDay: 5,       // Nano Banana Pro (ultra-realistic)
    imagesStandardPerDay: 5, // Realistic Vision 51 (standard) - 5 additional after HQ exhausted
    videosPerDay: 2,         // Enable video generation for free tier (was 0)
};

export interface ImageQuotaResult {
    allowed: boolean;
    reason?: string;
    isPro: boolean;
    modelId: string;
    imageQuality: "hq" | "standard";
    hqExhausted?: boolean;  // True when HQ quota just became exhausted (first standard image)
    quotas?: {
        hq: { used: number; limit: number };
        standard: { used: number; limit: number };
    };
}

// ModelsLab model IDs - verified from their API documentation
export const MODELSLAB_MODELS = {
    HQ: "nano-banana-pro",           // Google Nano Banana Pro - best quality, 4K, multi-image fusion
    STANDARD: "realistic-vision-51", // Realistic Vision 5.1 - fallback for free tier
};

export async function checkImageQuotaAndModel(userId: string): Promise<ImageQuotaResult> {
    if (IS_PRO_OVERRIDE) {
        return { allowed: true, isPro: true, modelId: MODELSLAB_MODELS.HQ, imageQuality: "hq" };
    }

    const appUser = await storage.getAppUser(userId);
    const isPro = appUser?.plan === "pro";
    const isAdmin = appUser?.isAdmin === 1;

    // Admins have unlimited access with HQ model
    if (isAdmin) {
        return { allowed: true, isPro: true, modelId: MODELSLAB_MODELS.HQ, imageQuality: "hq" };
    }

    if (isPro) {
        return { allowed: true, isPro: true, modelId: MODELSLAB_MODELS.HQ, imageQuality: "hq" };
    }

    const usage = await storage.getImageUsageTodayByQuality(userId);
    const quotas = {
        hq: { used: usage.hq, limit: FREE_LIMITS.imagesHqPerDay },
        standard: { used: usage.standard, limit: FREE_LIMITS.imagesStandardPerDay },
    };

    // Check HQ quota first (Realistic Vision 5.1 - best quality)
    if (usage.hq < FREE_LIMITS.imagesHqPerDay) {
        return {
            allowed: true,
            isPro: false,
            modelId: MODELSLAB_MODELS.HQ,
            imageQuality: "hq",
            quotas,
        };
    }

    // If HQ exhausted, check standard quota (Anything V3 - faster)
    if (usage.standard < FREE_LIMITS.imagesStandardPerDay) {
        // hqExhausted=true signals frontend to show popup about model downgrade
        const isFirstStandardImage = usage.standard === 0;
        return {
            allowed: true,
            isPro: false,
            modelId: MODELSLAB_MODELS.STANDARD,
            imageQuality: "standard",
            hqExhausted: isFirstStandardImage, // Show popup only on first standard image
            quotas,
        };
    }

    // Both quotas exhausted
    const totalUsed = usage.hq + usage.standard;
    const totalLimit = FREE_LIMITS.imagesHqPerDay + FREE_LIMITS.imagesStandardPerDay;
    return {
        allowed: false,
        reason: `Limite diário de imagens atingido (${totalUsed}/${totalLimit}). Faça upgrade para Pro para continuar.`,
        isPro: false,
        modelId: "",
        imageQuality: "standard",
        quotas,
    };
}

export async function checkGenerationLimits(userId: string, type: "prompt" | "image" | "video"): Promise<{ allowed: boolean; reason?: string; isPro: boolean; isAdmin?: boolean }> {
    if (IS_PRO_OVERRIDE) {
        return { allowed: true, isPro: true };
    }

    const appUser = await storage.getAppUser(userId);
    const isPro = appUser?.plan === "pro";
    const isAdmin = appUser?.isAdmin === 1;

    // Admins have unlimited access
    if (isAdmin) {
        return { allowed: true, isPro: true, isAdmin: true };
    }

    if (isPro) {
        return { allowed: true, isPro: true };
    }

    // For images, use the tiered quota system
    if (type === "image") {
        const imageQuota = await checkImageQuotaAndModel(userId);
        return {
            allowed: imageQuota.allowed,
            reason: imageQuota.reason,
            isPro: imageQuota.isPro,
        };
    }

    const usageToday = await storage.getUsageToday(userId, type);
    const limit = type === "prompt" ? FREE_LIMITS.promptsPerDay : FREE_LIMITS.videosPerDay;

    if (usageToday >= limit) {
        const limitName = type === "prompt" ? "prompt" : "video";
        return {
            allowed: false,
            reason: `Daily ${limitName} limit reached (${limit}/${limit}). Upgrade to Pro for unlimited.`,
            isPro: false,
        };
    }

    return { allowed: true, isPro: false };
}

export async function logUsage(userId: string, type: "prompt" | "image" | "video", metadata?: Record<string, any>): Promise<void> {
    await storage.logUsage(userId, type, metadata);
}
