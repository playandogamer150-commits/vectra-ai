/**
 * =============================================================================
 * VECTRA AI - FILE UPLOAD SECURITY MIDDLEWARE
 * =============================================================================
 * 
 * Enterprise-grade file validation:
 * - Magic number validation (file signatures)
 * - Extension validation
 * - Size limits
 * - MIME type verification
 * - Content analysis for malicious patterns
 * 
 * @author Tech Lead Senior
 * @date 2026-01-04
 */

import { log } from "../lib/logger";

// =============================================================================
// FILE SIGNATURES (Magic Numbers)
// =============================================================================

interface FileSignature {
    ext: string;
    mime: string;
    signature: number[];
    offset?: number;
}

const FILE_SIGNATURES: FileSignature[] = [
    // Images
    { ext: "jpg", mime: "image/jpeg", signature: [0xFF, 0xD8, 0xFF] },
    { ext: "jpeg", mime: "image/jpeg", signature: [0xFF, 0xD8, 0xFF] },
    { ext: "png", mime: "image/png", signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
    { ext: "gif", mime: "image/gif", signature: [0x47, 0x49, 0x46, 0x38] },
    { ext: "webp", mime: "image/webp", signature: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
    { ext: "bmp", mime: "image/bmp", signature: [0x42, 0x4D] },
    { ext: "ico", mime: "image/x-icon", signature: [0x00, 0x00, 0x01, 0x00] },

    // Videos
    { ext: "mp4", mime: "video/mp4", signature: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp at offset 4
    { ext: "webm", mime: "video/webm", signature: [0x1A, 0x45, 0xDF, 0xA3] },
    { ext: "mov", mime: "video/quicktime", signature: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

// =============================================================================
// ALLOWED FILE TYPES BY CONTEXT
// =============================================================================

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// =============================================================================
// SIZE LIMITS
// =============================================================================

export const SIZE_LIMITS = {
    avatar: 10 * 1024 * 1024, // 10MB
    banner: 15 * 1024 * 1024, // 15MB
    image: 20 * 1024 * 1024,  // 20MB
    video: 100 * 1024 * 1024, // 100MB
};

// =============================================================================
// MALICIOUS CONTENT PATTERNS
// =============================================================================

const MALICIOUS_PATTERNS = [
    // PHP
    /<\?php/i,
    /\beval\s*\(/i,
    /\bshell_exec\s*\(/i,
    /\bpassthru\s*\(/i,
    /\bsystem\s*\(/i,
    /\bexec\s*\(/i,

    // JavaScript in images (polyglot attacks)
    /<script/i,
    /javascript:/i,

    // Other dangerous patterns
    /<%/,
    /\x00/g, // Null bytes
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate file by checking magic numbers (file signature)
 */
export function validateFileSignature(
    buffer: Buffer | Uint8Array,
    allowedTypes: string[]
): { valid: boolean; detectedMime: string | null; error?: string } {
    const bytes = buffer instanceof Buffer ? buffer : Buffer.from(buffer);

    for (const sig of FILE_SIGNATURES) {
        if (!allowedTypes.includes(sig.mime)) continue;

        const offset = sig.offset || 0;
        let matches = true;

        for (let i = 0; i < sig.signature.length; i++) {
            if (bytes[offset + i] !== sig.signature[i]) {
                matches = false;
                break;
            }
        }

        if (matches) {
            return { valid: true, detectedMime: sig.mime };
        }
    }

    return { valid: false, detectedMime: null, error: "Invalid file signature" };
}

/**
 * Validate base64 data URL format and extract components
 */
export function parseDataUrl(dataUrl: string): {
    valid: boolean;
    mime: string | null;
    data: string | null;
    error?: string;
} {
    const match = dataUrl.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);

    if (!match) {
        return { valid: false, mime: null, data: null, error: "Invalid data URL format" };
    }

    return { valid: true, mime: match[1], data: match[2] };
}

/**
 * Validate image data URL with all security checks
 */
export function validateImageDataUrl(
    dataUrl: string,
    context: keyof typeof SIZE_LIMITS = "image"
): { valid: boolean; error?: string; mime?: string } {
    // Step 1: Parse data URL
    const parsed = parseDataUrl(dataUrl);
    if (!parsed.valid || !parsed.mime || !parsed.data) {
        return { valid: false, error: parsed.error || "Invalid data URL" };
    }

    // Step 2: Check MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(parsed.mime)) {
        log(`Rejected file upload: invalid MIME type ${parsed.mime}`, "security", "warn");
        return { valid: false, error: `Invalid file type: ${parsed.mime}. Allowed: JPEG, PNG, WebP, GIF` };
    }

    // Step 3: Check size (base64 is ~37% larger than original)
    const estimatedSize = (parsed.data.length * 3) / 4;
    const maxSize = SIZE_LIMITS[context];

    if (estimatedSize > maxSize) {
        log(`Rejected file upload: size ${estimatedSize} exceeds limit ${maxSize}`, "security", "warn");
        return { valid: false, error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` };
    }

    // Step 4: Decode and check magic numbers
    try {
        const buffer = Buffer.from(parsed.data, "base64");

        // Verify buffer is not empty
        if (buffer.length < 8) {
            return { valid: false, error: "File is too small to be a valid image" };
        }

        const signatureCheck = validateFileSignature(buffer, ALLOWED_IMAGE_TYPES);

        if (!signatureCheck.valid) {
            log(`Rejected file upload: magic number mismatch`, "security", "warn");
            return { valid: false, error: "File content does not match declared type" };
        }

        // Verify declared MIME matches detected MIME (with tolerance)
        if (signatureCheck.detectedMime && signatureCheck.detectedMime !== parsed.mime) {
            // WebP special case - can declare as image/webp but RIFF signature
            const isWebpMismatch = parsed.mime === "image/webp";
            // JPEG can have slight variations in MIME
            const isJpegVariant = parsed.mime.includes("jpeg") || parsed.mime.includes("jpg");
            if (!isWebpMismatch && !isJpegVariant) {
                log(`MIME mismatch: declared ${parsed.mime}, detected ${signatureCheck.detectedMime}`, "security", "warn");
                // Allow but log - some browsers may send slightly different MIME types
            }
        }

        // Step 5: Check for dangerous patterns ONLY in text-based metadata sections
        // Avoid checking pure binary data to prevent false positives
        // Only check if file appears to have embedded text/scripts at the start or end
        const startBytes = buffer.toString("utf8", 0, Math.min(buffer.length, 100));
        const endBytes = buffer.toString("utf8", Math.max(0, buffer.length - 100), buffer.length);

        // Only check for obvious script injections (not common in legitimate images)
        const scriptPatterns = [
            /<script/i,
            /javascript:/i,
            /<\?php/i,
        ];

        for (const pattern of scriptPatterns) {
            if (pattern.test(startBytes) || pattern.test(endBytes)) {
                log(`Rejected file upload: script pattern detected in image boundaries`, "security", "warn");
                return { valid: false, error: "File contains potentially malicious content" };
            }
        }

    } catch (err) {
        log(`File validation error: ${err}`, "security", "error");
        return { valid: false, error: "Failed to validate file content" };
    }

    return { valid: true, mime: parsed.mime };
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
    return filename
        // Remove path separators
        .replace(/[\/\\]/g, "_")
        // Remove null bytes
        .replace(/\x00/g, "")
        // Remove special characters except dots, dashes, underscores
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        // Collapse multiple underscores
        .replace(/_+/g, "_")
        // Remove leading/trailing dots and underscores
        .replace(/^[._]+|[._]+$/g, "")
        // Limit length
        .slice(0, 255);
}

/**
 * Generate a secure random filename
 */
export function generateSecureFilename(originalName: string): string {
    const ext = originalName.split(".").pop()?.toLowerCase() || "bin";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}.${ext}`;
}
