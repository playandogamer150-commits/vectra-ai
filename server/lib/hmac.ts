import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const IS_PRODUCTION = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

// In production, require HMAC secret to be set. In development, use a random secret per session.
const HMAC_SECRET = (() => {
  if (process.env.WORKER_HMAC_SECRET) {
    return process.env.WORKER_HMAC_SECRET;
  }
  if (IS_PRODUCTION) {
    console.error("CRITICAL: WORKER_HMAC_SECRET must be set in production!");
    throw new Error("WORKER_HMAC_SECRET environment variable is required in production");
  }
  // Development: generate random secret per session (webhooks won't work but prevents attacks)
  return randomBytes(32).toString("hex");
})();

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

export interface SignedPayload {
  signature: string;
  timestamp: number;
  payload: unknown;
}

export function signPayload(payload: unknown): SignedPayload {
  const timestamp = Date.now();
  const dataToSign = JSON.stringify({ payload, timestamp });
  const signature = createHmac("sha256", HMAC_SECRET)
    .update(dataToSign)
    .digest("hex");
  
  return { signature, timestamp, payload };
}

export function verifySignature(
  signature: string,
  timestamp: number,
  payload: unknown
): { valid: boolean; error?: string } {
  const now = Date.now();
  
  if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_MS) {
    return { valid: false, error: "Timestamp expired or invalid" };
  }

  const dataToSign = JSON.stringify({ payload, timestamp });
  const expectedSignature = createHmac("sha256", HMAC_SECRET)
    .update(dataToSign)
    .digest("hex");

  try {
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: "Invalid signature length" };
    }
    
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: "Signature mismatch" };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: "Signature verification failed" };
  }
}

export function createJobPayload(
  jobId: string,
  datasetUrl: string,
  params: unknown,
  callbackUrl: string
): SignedPayload {
  const payload = {
    jobId,
    datasetUrl,
    params,
    callbackUrl,
  };
  
  return signPayload(payload);
}
