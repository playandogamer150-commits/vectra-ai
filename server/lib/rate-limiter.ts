import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || "anonymous",
    message = "Too many requests, please try again later",
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    if (!store[key] || store[key].resetAt < now) {
      store[key] = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    store[key].count++;

    const remaining = Math.max(0, maxRequests - store[key].count);
    const resetAt = store[key].resetAt;

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

    if (store[key].count > maxRequests) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      });
    }

    next();
  };
}

export function loraJobRateLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    keyGenerator: (req) => `lora-job:${req.ip || "anonymous"}`,
    message: "LoRA job limit exceeded. Pro users get more capacity.",
  });
}

export function webhookRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => `webhook:${req.ip || "anonymous"}`,
    message: "Webhook rate limit exceeded",
  });
}

export function datasetUploadRateLimiter() {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: (req) => `dataset:${req.ip || "anonymous"}`,
    message: "Dataset upload limit exceeded",
  });
}

setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  }
}, 60 * 1000);
