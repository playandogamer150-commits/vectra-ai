import { createHmac, timingSafeEqual } from "crypto";

const HMAC_SECRET = process.env.WORKER_HMAC_SECRET || "dev-secret-change-in-production";
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
