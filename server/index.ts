import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { log } from "./lib/logger";
import { rateLimiter } from "./middleware/rateLimiter";
import cookieParser from "cookie-parser";
import {
  securityHeaders,
  contentSecurityPolicy,
  secureCookies,
  inputSanitizer,
  advancedRateLimiter,
  logSecurityEvent
} from "./middleware/security";

const app = express();
const httpServer = createServer(app);

// Environment detection
const IS_PRODUCTION = process.env.NODE_ENV === "production" ||
  process.env.RAILWAY_ENVIRONMENT === "production" ||
  process.env.REPLIT_DEPLOYMENT === "1";

// =============================================================================
// SECURITY MIDDLEWARE STACK (Enterprise-grade)
// =============================================================================

// 1. Cookie parser (needed for CSRF and session handling)
app.use(cookieParser());

// 2. Security headers (removes X-Powered-By, adds security headers)
app.use(securityHeaders);

// 3. Content Security Policy (dynamic nonce-based)
app.use(contentSecurityPolicy);

// 4. Secure cookie defaults
app.use(secureCookies);

// 5. Input sanitization (XSS protection) - before body parsing
app.use(inputSanitizer);

// 6. Advanced rate limiting (per-endpoint with blocking)
app.use(advancedRateLimiter);

// 7. Global rate limiting fallback
app.use(rateLimiter);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Re-export log for compatibility
export { log };

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    log('DATABASE_URL not found - skipping Stripe initialization', 'stripe');
    return;
  }

  try {
    log('Checking Stripe credentials...', 'stripe');
    const stripeSync = await getStripeSync();
    log(`Stripe sync status: ${stripeSync ? 'ENABLED' : 'DISABLED'}`, 'stripe');
    if (!stripeSync) {
      log('Stripe sync disabled (missing keys or dev mode)', 'stripe');
      return;
    }

    log('Initializing Stripe schema...', 'stripe');
    await runMigrations({ databaseUrl });
    log('Stripe schema ready', 'stripe');

    const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
    // If STRIPE_WEBHOOK_SECRET is set, we assume you're using a manually configured webhook
    // (e.g., https://vectraai.io/api/stripe/webhook). In that case, skip Replit managed webhook
    // to avoid startup failures from stale/orphaned managed webhook records.
    if (replitDomain && !process.env.STRIPE_WEBHOOK_SECRET) {
      log('Setting up managed webhook...', 'stripe');
      const webhookBaseUrl = `https://${replitDomain}`;
      try {
        const { webhook } = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        log(`Webhook configured: ${webhook?.url || 'unknown'}`, 'stripe');
      } catch (webhookError: any) {
        log(`Webhook setup skipped: ${webhookError.message}`, 'stripe');
      }
    } else {
      log(
        replitDomain
          ? 'Skipping managed webhook setup (STRIPE_WEBHOOK_SECRET is set)'
          : 'Skipping webhook setup (no REPLIT_DOMAINS)',
        'stripe'
      );
    }

    log('Syncing Stripe data in background...', 'stripe');
    stripeSync.syncBackfill()
      .then(() => {
        log('Stripe data synced', 'stripe');
      })
      .catch((err: any) => {
        log(`Error syncing Stripe data: ${err.message}`, 'stripe');
      });
  } catch (error: any) {
    log(`Failed to initialize Stripe: ${error.message}`, 'stripe');
  }
}

(async () => {
  await initStripe();

  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          log('STRIPE WEBHOOK ERROR: req.body is not a Buffer', 'stripe');
          return res.status(500).json({ error: 'Webhook processing error' });
        }

        await WebhookHandlers.processWebhook(req.body as Buffer, sig);

        res.status(200).json({ received: true });
      } catch (error: any) {
        log(`Webhook error: ${error.message}`, 'stripe');
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );

  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Debug middleware to check if body parsing worked
  app.use((req, res, next) => {
    if (req.path.includes('/api/profile/banner')) {
      console.log(`[Middleware Check] ${req.method} ${req.path} - Body Parsed: ${!!req.body}`);
    }
    next();
  });

  // Catch body parser errors
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error("JSON Syntax Error:", err);
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    next(err);
  });

  app.use(express.urlencoded({ extended: false, limit: "50mb" }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  // Start the background worker for polling video status
  const { startPollingWorker } = await import("./videogen/service");
  startPollingWorker();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})().catch((err) => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
