import { Request, Response } from "express";

export const DEV_USER_ID = "dev_user";
// SECURITY: Fail-safe default. If NODE_ENV is not explicitly 'development', assume production.
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const IS_PRODUCTION = !IS_DEVELOPMENT;
export const IS_PRO_OVERRIDE = false;

export function getUserId(req: Request): string | null {
    const user = req.user as any;
    if (user?.claims?.sub) {
        return user.claims.sub;
    }
    // SECURITY: Only allow dev_user fallback in explicit development mode
    if (IS_DEVELOPMENT) {
        // Optional: Add a header check to prevent accidental reliance even in dev?
        // For now, adhering to strict environment check is sufficient.
        return DEV_USER_ID;
    }
    return null;
}

export function requireAuth(req: Request, res: Response): string | null {
    const userId = getUserId(req);
    if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return null;
    }
    return userId;
}
