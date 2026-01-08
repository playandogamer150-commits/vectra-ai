import { pool } from "../db";

/**
 * Wait until DB is reachable (Supabase pooler can be slow/cold-start).
 * Avoids crashing the server on transient connection timeouts during boot.
 */
export async function waitForDbReady(options?: {
  maxWaitMs?: number;
  initialDelayMs?: number;
}): Promise<void> {
  const maxWaitMs = options?.maxWaitMs ?? 90_000;
  let delayMs = options?.initialDelayMs ?? 1_000;
  const startedAt = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await pool.query("select 1");
      return;
    } catch (err: any) {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= maxWaitMs) {
        throw err;
      }
      console.warn(`[db] Not ready yet (${Math.round(elapsed / 1000)}s elapsed). Retrying in ${Math.round(delayMs / 1000)}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(Math.round(delayMs * 1.6), 10_000);
    }
  }
}

