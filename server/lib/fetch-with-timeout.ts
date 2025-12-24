/**
 * Fetch with timeout wrapper to prevent hanging requests
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Redact sensitive information from objects for logging
 */
export function redactSensitive(obj: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['key', 'api_key', 'apiKey', 'password', 'secret', 'token', 'authorization'];
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some(sk => keyLower.includes(sk))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 200) {
      result[key] = `[${value.length} chars]`;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = Array.isArray(value) ? `[${value.length} items]` : '[object]';
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
