
export const jwtConstants = {
    secret: process.env.JWT_SECRET || 'vectra-secret-key-change-in-production',
    // In production, this MUST come from env.
};
