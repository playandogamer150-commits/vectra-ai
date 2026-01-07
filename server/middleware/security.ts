/**
 * =============================================================================
 * VECTRA AI - ENTERPRISE SECURITY MIDDLEWARE
 * =============================================================================
 * 
 * Implementação enterprise-grade de segurança seguindo OWASP Top 10:
 * - A01:2021 Broken Access Control
 * - A02:2021 Cryptographic Failures
 * - A03:2021 Injection
 * - A04:2021 Insecure Design
 * - A05:2021 Security Misconfiguration
 * - A07:2021 Cross-Site Scripting (XSS)
 * - A08:2021 Cross-Site Request Forgery (CSRF)
 * 
 * @author Tech Lead Senior - 30+ years experience
 * @date 2026-01-04
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { log } from "../lib/logger";

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1";

// =============================================================================
// CSRF TOKEN MANAGEMENT
// =============================================================================

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_COOKIE_NAME = "__Host-csrf";

// In-memory token store (production should use Redis/DB)
const csrfTokens = new Map<string, { token: string; expires: number }>();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
    const now = Date.now();
    csrfTokens.forEach((data, key) => {
        if (now > data.expires) {
            csrfTokens.delete(key);
        }
    });
}, 5 * 60 * 1000);

function generateCsrfToken(): string {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF for safe methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Skip for API endpoints that use Bearer token auth (API-first approach)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return next();
    }

    // Skip for webhooks (verified by signature)
    if (req.path.includes("/webhook")) {
        return next();
    }

    // For state-changing requests, validate CSRF token
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        logSecurityEvent("CSRF_VIOLATION", req, {
            headerPresent: !!headerToken,
            cookiePresent: !!cookieToken
        });
        res.status(403).json({ error: "Invalid or missing CSRF token" });
        return;
    }

    next();
}

// Endpoint to get a new CSRF token
export function getCsrfToken(req: Request, res: Response): void {
    const token = generateCsrfToken();

    // Set secure cookie with the token
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: "strict",
        maxAge: 60 * 60 * 1000, // 1 hour
        path: "/",
    });

    res.json({ csrfToken: token });
}

// =============================================================================
// ADVANCED RATE LIMITING PER ENDPOINT
// =============================================================================

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message: string;
    blockDurationMs?: number; // Optional extended block after threshold
}

interface RateLimitRecord {
    count: number;
    resetTime: number;
    blocked: boolean;
    blockUntil?: number;
}

// Endpoint-specific rate limits - adjusted for production usage
// These are per-IP limits to protect against abuse while allowing normal usage
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
    // Auth endpoints - strict to prevent brute force
    "/api/login": { windowMs: 15 * 60 * 1000, maxRequests: 10, message: "Too many login attempts. Please wait 15 minutes.", blockDurationMs: 15 * 60 * 1000 },
    "/api/auth": { windowMs: 15 * 60 * 1000, maxRequests: 20, message: "Too many auth requests", blockDurationMs: 10 * 60 * 1000 },
    "/api/register": { windowMs: 60 * 60 * 1000, maxRequests: 5, message: "Too many registration attempts", blockDurationMs: 30 * 60 * 1000 },
    "/auth/forgot-password": { windowMs: 60 * 60 * 1000, maxRequests: 5, message: "Too many password reset requests" },

    // Profile endpoints - relaxed for normal usage
    "/api/profile": { windowMs: 60 * 1000, maxRequests: 60, message: "Too many profile requests" },
    "/api/profile/avatar": { windowMs: 60 * 1000, maxRequests: 10, message: "Too many avatar uploads" },
    "/api/profile/banner": { windowMs: 60 * 1000, maxRequests: 10, message: "Too many banner uploads" },

    // Generation endpoints - generous limits (actual quotas handled by backend)
    // Rate limiting here is just to prevent API abuse, not quota management
    "/api/modelslab/generate": { windowMs: 60 * 1000, maxRequests: 30, message: "Generation rate limit exceeded. Please slow down." },
    "/api/sora2": { windowMs: 60 * 1000, maxRequests: 15, message: "Video generation rate limit exceeded" },

    // Admin endpoints - moderate
    "/api/admin": { windowMs: 60 * 1000, maxRequests: 100, message: "Admin rate limit exceeded" },
};

// Per-IP rate limit storage
const ipRateLimits = new Map<string, Map<string, RateLimitRecord>>();

// Cleanup periodically
setInterval(() => {
    const now = Date.now();
    ipRateLimits.forEach((endpoints, ip) => {
        endpoints.forEach((record, endpoint) => {
            if (!record.blocked && now > record.resetTime) {
                endpoints.delete(endpoint);
            }
            if (record.blocked && record.blockUntil && now > record.blockUntil) {
                endpoints.delete(endpoint);
            }
        });
        if (endpoints.size === 0) {
            ipRateLimits.delete(ip);
        }
    });
}, 60 * 1000);

function getClientIP(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
        return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    }
    return req.socket.remoteAddress || "unknown";
}

function findMatchingConfig(path: string): RateLimitConfig | null {
    // Exact match first
    if (RATE_LIMIT_CONFIGS[path]) {
        return RATE_LIMIT_CONFIGS[path];
    }

    // Prefix match
    for (const [endpoint, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
        if (path.startsWith(endpoint)) {
            return config;
        }
    }

    return null;
}

export function advancedRateLimiter(req: Request, res: Response, next: NextFunction): void {
    const ip = getClientIP(req);
    const path = req.path;
    const now = Date.now();

    // Find matching rate limit config
    const config = findMatchingConfig(path);

    if (!config) {
        // Use default global rate limit from existing rateLimiter
        return next();
    }

    // Get or create IP record map
    if (!ipRateLimits.has(ip)) {
        ipRateLimits.set(ip, new Map());
    }
    const ipRecords = ipRateLimits.get(ip)!;

    // Get or create endpoint record
    let record = ipRecords.get(path);

    // Check if blocked
    if (record?.blocked && record.blockUntil && now < record.blockUntil) {
        logSecurityEvent("RATE_LIMIT_BLOCKED", req, {
            endpoint: path,
            remainingBlockMs: record.blockUntil - now
        });
        res.status(429).json({
            error: config.message,
            retryAfter: Math.ceil((record.blockUntil - now) / 1000)
        });
        return;
    }

    // Reset if window expired
    if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + config.windowMs, blocked: false };
        ipRecords.set(path, record);
        return next();
    }

    // Increment count
    record.count += 1;

    // Check if limit exceeded
    if (record.count > config.maxRequests) {
        record.blocked = true;
        record.blockUntil = config.blockDurationMs ? now + config.blockDurationMs : record.resetTime;

        logSecurityEvent("RATE_LIMIT_EXCEEDED", req, {
            endpoint: path,
            attempts: record.count,
            blockDurationMs: config.blockDurationMs
        });

        res.status(429).json({
            error: config.message,
            retryAfter: Math.ceil((record.blockUntil - now) / 1000)
        });
        return;
    }

    next();
}

// =============================================================================
// SECURITY HEADERS (Enhanced - CRÍTICA #4)
// =============================================================================

export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
    // Remove identifying headers (CRÍTICA #4)
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");

    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "DENY");

    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Enable XSS filter
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Referrer policy - don't leak URLs to external sites
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // HSTS - enforce HTTPS (1 year + preload ready)
    if (IS_PRODUCTION) {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    // Permissions policy - restrict dangerous APIs
    res.setHeader("Permissions-Policy",
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
    );

    // DNS Prefetch Control
    res.setHeader("X-DNS-Prefetch-Control", "off");

    // Download Options for IE
    res.setHeader("X-Download-Options", "noopen");

    // Permitted Cross-Domain Policies
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

    next();
}

// =============================================================================
// CONTENT SECURITY POLICY (Enhanced - CRÍTICA #5)
// =============================================================================

export function contentSecurityPolicy(req: Request, res: Response, next: NextFunction): void {
    // Generate nonce for inline scripts (if needed)
    const nonce = crypto.randomBytes(16).toString("base64");
    res.locals.cspNonce = nonce;

    const directives = [
        "default-src 'self'",

        // Scripts - stricter in production
        IS_PRODUCTION
            ? `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://fast.wistia.com https://fast.wistia.net`
            : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://fast.wistia.com https://fast.wistia.net`,

        // Disallow inline event handlers like onclick=""
        "script-src-attr 'none'",

        // Styles - stricter in production
        IS_PRODUCTION
            ? `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`
            : `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,

        // Fonts
        "font-src 'self' https://fonts.gstatic.com data:",

        // Images - allow necessary sources for image generation API
        // blob: needed for download URLs, r2.dev for Cloudflare R2, stablediffusionapi for ModelsLab CDN
        "img-src 'self' data: blob: https://fast.wistia.com https://*.modelslab.com https://*.cloudflare.com https://*.r2.dev https://*.stablediffusionapi.com https://cdn.modelslab.com https://cdn2.stablediffusionapi.com",

        // Connections
        "connect-src 'self' https://modelslab.com https://*.modelslab.com https://*.stablediffusionapi.com https://*.r2.dev https://api.stripe.com https://*.stripe.com https://fast.wistia.com https://fast.wistia.net",

        // Frames - specific domains only
        "frame-src https://js.stripe.com https://hooks.stripe.com https://fast.wistia.com https://fast.wistia.net",

        // Frame ancestors - prevent clickjacking
        "frame-ancestors 'none'",

        // Form action - prevent form hijacking
        "form-action 'self'",

        // Base URI - prevent base tag hijacking
        "base-uri 'self'",

        // Object/Embed - disable plugins
        "object-src 'none'",

        // Media - also allow R2 and stablediffusionapi for videos
        "media-src 'self' https://*.modelslab.com https://*.stablediffusionapi.com https://*.r2.dev https://fast.wistia.com blob:",

        // Worker
        "worker-src 'self' blob:",

        // Upgrade insecure requests in production
        ...(IS_PRODUCTION ? ["upgrade-insecure-requests"] : []),

        // Report violations (optional - configure endpoint if needed)
        // "report-uri /api/csp-report",
    ];

    res.setHeader("Content-Security-Policy", directives.join("; "));

    next();
}

// =============================================================================
// INPUT SANITIZATION (Simplified - CRITICAL FIX)
// =============================================================================

// Only remove actual dangerous patterns - DO NOT escape normal characters
// Escaping characters like & < > " ' breaks prompts, URLs, and normal user input
const DANGEROUS_PATTERNS = [
    /\<script\b[^\>]*\>[\s\S]*?\<\/script\>/gi,  // Remove script tags
    /javascript\s*:/gi,                           // Remove javascript: protocol
    /\<iframe[^>]*\>/gi,                          // Remove iframe tags
    /\<object[^>]*\>/gi,                          // Remove object tags
    /\<embed[^>]*\>/gi,                           // Remove embed tags
];

function sanitizeValue(value: any): any {
    if (typeof value === "string") {
        let sanitized = value;
        // Only remove truly dangerous patterns
        for (const pattern of DANGEROUS_PATTERNS) {
            sanitized = sanitized.replace(pattern, "");
        }
        // DO NOT escape HTML entities - this breaks prompts!
        // Escaping should happen at OUTPUT time, not INPUT time
        return sanitized;
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === "object") {
        const sanitized: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
            sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
    }
    return value;
}

export function inputSanitizer(req: Request, res: Response, next: NextFunction): void {
    // Skip sanitization for file uploads, webhooks, and image generation
    if (req.is("multipart/form-data") || req.path.includes("/webhook")) {
        return next();
    }

    // Skip sanitization for image generation endpoints - prompts need all characters
    if (req.path.includes("/modelslab") || req.path.includes("/generate")) {
        return next();
    }

    // Skip for base64 image data (would break it)
    if (req.body?.imageData && typeof req.body.imageData === "string" &&
        req.body.imageData.startsWith("data:image/")) {
        const { imageData, ...rest } = req.body;
        req.body = { ...sanitizeValue(rest), imageData };
        return next();
    }

    // Also preserve images array for image generation
    if (req.body?.images && Array.isArray(req.body.images)) {
        const { images, ...rest } = req.body;
        req.body = { ...sanitizeValue(rest), images };
        return next();
    }

    if (req.body && typeof req.body === "object") {
        req.body = sanitizeValue(req.body);
    }

    if (req.query && typeof req.query === "object") {
        req.query = sanitizeValue(req.query);
    }

    next();
}


// =============================================================================
// SECURE COOKIE CONFIGURATION (ALTA #2)
// =============================================================================

export function secureCookies(req: Request, res: Response, next: NextFunction): void {
    // Override res.cookie to enforce security flags
    const originalCookie = res.cookie.bind(res);

    res.cookie = function (name: string, value: any, options: any = {}) {
        const secureOptions = {
            ...options,
            httpOnly: options.httpOnly !== false, // Default to true
            secure: IS_PRODUCTION ? true : options.secure, // Force secure in production
            sameSite: options.sameSite || "strict", // Default to strict
            path: options.path || "/",
        };

        return originalCookie(name, value, secureOptions);
    };

    next();
}

// =============================================================================
// SECURITY EVENT LOGGING (ALTA #3)
// =============================================================================

type SecurityEventType =
    | "CSRF_VIOLATION"
    | "RATE_LIMIT_EXCEEDED"
    | "RATE_LIMIT_BLOCKED"
    | "AUTH_FAILURE"
    | "UNAUTHORIZED_ACCESS"
    | "SUSPICIOUS_INPUT"
    | "BRUTE_FORCE_DETECTED";

interface SecurityEvent {
    type: SecurityEventType;
    timestamp: string;
    ip: string;
    userAgent: string;
    path: string;
    method: string;
    userId?: string;
    details: Record<string, any>;
}

// In-memory log buffer (production should use external logging service)
const securityEventBuffer: SecurityEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

export function logSecurityEvent(
    type: SecurityEventType,
    req: Request,
    details: Record<string, any> = {}
): void {
    const event: SecurityEvent = {
        type,
        timestamp: new Date().toISOString(),
        ip: getClientIP(req),
        userAgent: req.headers["user-agent"] || "unknown",
        path: req.path,
        method: req.method,
        userId: (req as any).user?.claims?.sub,
        details,
    };

    // Add to buffer
    securityEventBuffer.push(event);
    if (securityEventBuffer.length > MAX_BUFFER_SIZE) {
        securityEventBuffer.shift();
    }

    // Log to console/file
    log(`[SECURITY] ${type}: ${JSON.stringify(event)}`, "security", "warn");
}

// Endpoint to retrieve security logs (admin only)
export function getSecurityLogs(req: Request, res: Response): void {
    // This should be protected by admin auth middleware
    res.json({
        events: securityEventBuffer.slice(-100),
        total: securityEventBuffer.length
    });
}

// =============================================================================
// USER ENUMERATION PROTECTION (CRÍTICA #7)
// =============================================================================

const GENERIC_AUTH_MESSAGES = {
    login: "Invalid credentials",
    register: "Registration processing",
    passwordReset: "If an account exists with this email, you will receive a password reset link",
    verification: "Verification email sent if account exists",
};

export function antiEnumerationResponse(type: keyof typeof GENERIC_AUTH_MESSAGES): string {
    return GENERIC_AUTH_MESSAGES[type];
}

// =============================================================================
// COMBINED SECURITY MIDDLEWARE
// =============================================================================

export function applySecurityMiddleware(app: any): void {
    // Order matters! Apply in correct sequence
    app.use(securityHeaders);
    app.use(contentSecurityPolicy);
    app.use(secureCookies);
    app.use(inputSanitizer);
    app.use(advancedRateLimiter);

    // CSRF only for browser requests (has session cookie)
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.cookies && Object.keys(req.cookies).length > 0) {
            return csrfMiddleware(req, res, next);
        }
        next();
    });

    // CSRF token endpoint
    app.get("/api/csrf-token", getCsrfToken);

    // Security logs endpoint (should be protected by admin middleware)
    app.get("/api/admin/security-logs", getSecurityLogs);

    log("Security middleware initialized", "security", "info");
}
