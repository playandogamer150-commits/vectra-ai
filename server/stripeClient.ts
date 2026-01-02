import Stripe from 'stripe';
import { fetchWithTimeout } from './lib/fetch-with-timeout';

let connectionSettings: any;

async function getCredentials() {
  // 1. Standard Environment Variables (Preferred for Independent Hosting)
  // This removes the strict dependency on Replit
  if (process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY) {
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
    };
  }

  // 2. Replit Connector Logic (Fallback for Replit Deployments)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn('[stripe] Skipping Stripe initialization: No Stripe keys or Replit token found (local dev)');
      return null;
    }
    // In production, we must have credentials
    console.warn('[stripe] CRITICAL: No Stripe credentials found in environment variables.');
    throw new Error('Stripe credentials missing (STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY or Replit Token)');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  }, 10000); // 10s timeout for credentials

  const data = await response.json();

  connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

export async function getUncachableStripeClient() {
  const creds = await getCredentials();
  if (!creds || !creds.secretKey) return null;

  return new Stripe(creds.secretKey, {
    apiVersion: '2025-11-17.clover' as any,
  });
}

export async function getStripePublishableKey() {
  const creds = await getCredentials();
  return creds?.publishableKey || null;
}

export async function getStripeSecretKey() {
  const creds = await getCredentials();
  return creds?.secretKey || null;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const secretKey = await getStripeSecretKey();
    if (!secretKey) return null;

    const { StripeSync } = await import('stripe-replit-sync');

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        ssl: process.env.DATABASE_URL?.includes("supabase.com") ? { rejectUnauthorized: false } : false,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
