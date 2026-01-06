
export const jwtConstants = {
    secret: process.env.JWT_SECRET || 'vectra-secret-key-change-in-production',
    // In production, this MUST come from env.
};

if ((process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") && !process.env.JWT_SECRET) {
  // Fail fast to avoid shipping with a known default secret.
  console.error("[auth] CRITICAL: JWT_SECRET must be set in production.");
  process.exit(1);
}