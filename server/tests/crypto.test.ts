import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../lib/crypto';

describe('Crypto Helpers', () => {
    it('should hash a password consistently (salt varying but verify works)', async () => {
        const password = 'mySecretPassword';
        const hash = await hashPassword(password);

        expect(hash).toBeDefined();
        expect(hash).toContain('.'); // Salt separator
    });

    it('should verify a correct password', async () => {
        const password = 'mySecretPassword';
        const hash = await hashPassword(password);

        const isValid = await comparePassword(hash, password);
        expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
        const password = 'mySecretPassword';
        const hash = await hashPassword(password);

        const isValid = await comparePassword(hash, 'wrongPassword');
        expect(isValid).toBe(false);
    });
});
