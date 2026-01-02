import { Request, Response, NextFunction } from "express";
import { log } from "../lib/logger";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 1000; // Limit each IP to 1000 requests per window

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const ipHits = new Map<string, RateLimitRecord>();

// Periodic cleanup to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    ipHits.forEach((data, ip) => {
        if (now > data.resetTime) {
            ipHits.delete(ip);
        }
    });
}, 60 * 1000); // Run every minute

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting for static assets if handled by express (though usually handled by nginx/vite)
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
        return next();
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = ipHits.get(ip);

    if (!record || now > record.resetTime) {
        ipHits.set(ip, { count: 1, resetTime: now + WINDOW_MS });
        return next();
    }

    if (record.count >= MAX_REQUESTS) {
        log(`Rate limit exceeded for IP: ${ip}`, "security", "warn");
        return res.status(429).json({
            error: "Too many requests. Please try again later."
        });
    }

    record.count += 1;
    next();
}
