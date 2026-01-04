import { Router } from "express";
import { storage } from "../storage";
import { getUserId, requireAuth } from "../lib/auth-helpers";
import { checkImageQuotaAndModel, logUsage, MODELSLAB_MODELS, ImageQuotaResult } from "../lib/quotas";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";

const router = Router();

// ModelsLab Image Generation API (Nano Banana Pro for HQ, Realistic Vision 51 for Standard)
router.post("/generate", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        // Check if user is admin (all admins bypass quotas)
        const user = await storage.getAppUser(userId);
        const isAdmin = user?.isAdmin === 1;
        const encryptedApiKey = user?.customModelsLabKey;
        const hasCustomKey = isAdmin && !!encryptedApiKey;

        // All admins bypass quotas, regardless of having a custom key
        let imageQuota: ImageQuotaResult;
        if (isAdmin) {
            // Admins get unlimited HQ access
            imageQuota = {
                allowed: true,
                isPro: true,
                modelId: MODELSLAB_MODELS.HQ,
                imageQuality: "hq"
            };
        } else {
            imageQuota = await checkImageQuotaAndModel(userId);
            if (!imageQuota.allowed) {
                return res.status(403).json({
                    error: imageQuota.reason,
                    isPremiumRequired: true,
                    quotas: imageQuota.quotas,
                });
            }
        }

        const { prompt, images, aspectRatio, activeGems, bodyFidelity, preserveTattoos, negativePrompt, cinematicSettings, rawSubject } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        // ============ VECTRA UNIFIED PROMPT SYSTEM ============
        // CRITICAL: Nano Banana Pro prioritizes the BEGINNING of the prompt
        // Structure: [SUBJECT FIRST] + [Technical Directives as suffix]

        const hasActiveGems = Array.isArray(activeGems) && activeGems.length > 0;
        const needsTattooPreservation = preserveTattoos === true ||
            (hasActiveGems && (activeGems.includes("face_swapper") || activeGems.includes("tattoo_preservation")));
        const usePreciseControlMode = needsTattooPreservation || (hasActiveGems && bodyFidelity && bodyFidelity > 50);

        // ============ EXTRACT USER SUBJECT FROM COMPILED PROMPT ============
        // The compiled prompt contains technical directives + subject
        // We need to identify and PRIORITIZE the actual user request

        // PRIORITY 1: Use rawSubject directly from frontend if available
        let userSubject = rawSubject || "";

        // PRIORITY 2: Try to find the subject line in the compiled prompt
        if (!userSubject) {
            const subjectMatch = prompt.match(/Subject:\s*(.+?)(?:\n|$)/i);
            if (subjectMatch) {
                userSubject = subjectMatch[1].trim();
            } else {
                // Look for any lines that seem like user content (not technical directives)
                const lines = prompt.split('\n');
                for (const line of lines) {
                    const cleanLine = line.trim();
                    // Skip technical directive lines
                    if (cleanLine.startsWith('[') || cleanLine.startsWith('CRITICAL') ||
                        cleanLine.startsWith('Quality:') || cleanLine.startsWith('Fidelity:') ||
                        cleanLine.startsWith('Anatomy:') || cleanLine.startsWith('Technical') ||
                        cleanLine.includes('LOCKDOWN') || cleanLine.includes('PRESERVATION') ||
                        cleanLine.length === 0) {
                        continue;
                    }
                    // This might be user content
                    if (cleanLine.length > 20 && !cleanLine.startsWith('-')) {
                        // Check if it looks like a description/subject
                        if (cleanLine.toLowerCase().includes('esse') ||
                            cleanLine.toLowerCase().includes('this') ||
                            cleanLine.toLowerCase().includes('homem') ||
                            cleanLine.toLowerCase().includes('mulher') ||
                            cleanLine.toLowerCase().includes('woman') ||
                            cleanLine.toLowerCase().includes('man') ||
                            cleanLine.toLowerCase().includes('person') ||
                            cleanLine.toLowerCase().includes('usando') ||
                            cleanLine.toLowerCase().includes('wearing')) {
                            userSubject = cleanLine;
                            break;
                        }
                    }
                }
            }
        }

        console.log(`[SUBJECT] rawSubject: "${(rawSubject || 'none').substring(0, 50)}", userSubject: "${userSubject.substring(0, 50)}"`);

        // ============ BUILD NANO BANANA PRO OPTIMIZED PROMPT ============
        // The model works best with: [SCENE DESCRIPTION] [SUBJECT] [STYLE MODIFIERS]
        // NOT with long technical preambles that bury the user's actual request

        let optimizedPrompt = "";

        // PRIORITY 1: User's actual scene/subject request goes FIRST
        if (userSubject) {
            optimizedPrompt = `SCENE: ${userSubject}\n\n`;
        }

        // PRIORITY 2: Add the rest of the compiled prompt (but trimmed)
        // Remove verbose technical sections that don't help the model
        let cleanedPrompt = prompt;

        // Remove overly long technical sections
        cleanedPrompt = cleanedPrompt.replace(/\[FACIAL BIOMETRICS LOCKDOWN MODE\][\s\S]*?Preserve microexpressions[^\n]*\n/gi, '[PRESERVE EXACT FACE] ');
        cleanedPrompt = cleanedPrompt.replace(/\[BODY MARKING PRESERVATION[^\]]*\][\s\S]*?DO NOT invent[^\n]*\n/gi, '[PRESERVE EXACT TATTOOS] ');
        cleanedPrompt = cleanedPrompt.replace(/\[ULTRA-REALISM MODE[^\]]*\][\s\S]*?uncanny valley\./gi, '[PHOTOREALISTIC] ');
        cleanedPrompt = cleanedPrompt.replace(/\[INSTAGRAM UGC PHOTOREALISM MODE\][\s\S]*?smartphone photography\./gi, '[AUTHENTIC SMARTPHONE PHOTO] ');
        cleanedPrompt = cleanedPrompt.replace(/\[TATTOO[^\]]*PRESERVATION[^\]]*\][\s\S]*?PRECISELY\./gi, '[PRESERVE TATTOOS] ');

        // Remove duplicate newlines and trim
        cleanedPrompt = cleanedPrompt.replace(/\n{3,}/g, '\n\n').trim();

        // If we extracted a subject, remove it from the cleaned prompt to avoid duplication
        if (userSubject && cleanedPrompt.includes(userSubject)) {
            cleanedPrompt = cleanedPrompt.replace(userSubject, '');
        }

        // Add the cleaned prompt
        optimizedPrompt += cleanedPrompt;

        // PRIORITY 3: Add concise style directives at end based on gems
        const styleDirectives: string[] = [];

        if (hasActiveGems) {
            if (activeGems.includes("face_swapper")) {
                styleDirectives.push("preserve exact facial features");
            }
            if (activeGems.includes("ai_instagram_media")) {
                styleDirectives.push("authentic UGC smartphone photo style");
            }
            if (activeGems.includes("tattoo_preservation")) {
                styleDirectives.push("preserve exact tattoos ONLY where they exist in reference");
            }
        }

        // Add anti-CGI directives (concise)
        const needsUltraRealism = hasActiveGems ||
            prompt.toLowerCase().includes("photorealistic") ||
            prompt.toLowerCase().includes("real");

        if (needsUltraRealism) {
            styleDirectives.push("photorealistic quality");
            styleDirectives.push("no CGI or 3D render aesthetics");
        }

        if (styleDirectives.length > 0) {
            optimizedPrompt += `\n\nStyle: ${styleDirectives.join(", ")}`;
        }

        // ============ FACIAL TATTOO BIOMETRIC LOCKDOWN ULTRA ============
        // When tattoo preservation is active, add explicit FACIAL TATTOO controls
        if (needsTattooPreservation) {
            const facialTattooLockdown = `

[FACIAL TATTOO BIOMETRIC LOCKDOWN - ULTRA PRIORITY]
CRITICAL INSTRUCTION: This subject has SPECIFIC facial tattoos only in EXACT locations.
DO NOT ADD any tattoos to: forehead, eyebrows, temples, cheeks (unless present in reference), chin, neck, ears.
DO NOT EXTEND existing tattoos beyond their reference boundaries.
DO NOT CREATE new facial markings, spots, shadows that look like tattoos.
ONLY replicate the EXACT tattoos visible in the reference images.
Any skin area WITHOUT a tattoo in the reference MUST remain clean and unmarked.
This is a HARD CONSTRAINT - violation means image rejection.`;

            optimizedPrompt = facialTattooLockdown + "\n\n" + optimizedPrompt;

            console.log(`[FACIAL-LOCKDOWN] Added facial tattoo biometric lockdown to prompt`);
        }

        // Use the optimized prompt as the unified prompt
        let unifiedPrompt = optimizedPrompt;

        console.log(`[OPTIMIZED-PROMPT] Length: ${unifiedPrompt.length} chars, Subject extracted: ${!!userSubject}`);
        console.log(`[PROMPT-PREVIEW] First 300 chars: ${unifiedPrompt.substring(0, 300)}`);

        // ============ BUILD UNIFIED NEGATIVE PROMPT ============
        const antiCgiNegatives = [
            "CGI", "3D render", "computer generated", "artificial lighting", "plastic skin",
            "airbrushed", "smooth skin", "wax figure", "mannequin", "doll-like",
            "video game", "cartoon", "illustration", "digital art", "octane render"
        ];

        let unifiedNegativePrompt = negativePrompt || "bad quality, blurry, distorted, low resolution, watermark, text";

        if (needsUltraRealism) {
            unifiedNegativePrompt += ", " + antiCgiNegatives.join(", ");
        }

        // ============ FACIAL TATTOO ULTRA NEGATIVE PROMPTS ============
        // Extremely specific negative prompts for facial tattoo regions
        if (needsTattooPreservation) {
            const facialTattooNegatives = [
                // General tattoo invention prevention
                "extra tattoos", "new tattoos", "additional tattoos", "invented tattoos",
                "tattoos appearing where none exist", "different tattoo designs", "modified tattoos",
                // FACIAL REGION SPECIFIC - prevent tattoos in wrong areas
                "forehead tattoo", "eyebrow tattoo", "above eyebrow tattoo", "temple tattoo",
                "tattoo on forehead", "tattoo above eye", "tattoo on eyebrow",
                "new facial markings", "extra face tattoos", "additional facial ink",
                "cheek tattoo if not in reference", "chin tattoo if not in reference",
                "neck tattoo if not in reference", "ear tattoo",
                // Pattern specific prevention
                "extended tattoo lines", "spread tattoo ink", "bleeding tattoo edges",
                "smudged tattoos", "blurred tattoo boundaries", "morphed tattoo design",
                // False positive prevention
                "shadows that look like tattoos", "dirt marks on face", "smudges on skin",
                "dark spots on face", "artificial skin marks", "fake tattooed appearance"
            ];

            unifiedNegativePrompt += ", " + facialTattooNegatives.join(", ");

            console.log(`[FACIAL-LOCKDOWN] Added ${facialTattooNegatives.length} facial tattoo negatives`);
        }

        // ============ VFX STRENGTH CALCULATION ============
        // If VFX are active and intense, allow more AI freedom to apply styles
        let vfxStrengthBonus = 0;
        if (cinematicSettings?.vfx?.effects && cinematicSettings.vfx.effects.length > 0 && !cinematicSettings.vfx.effects.includes("off")) {
            const intensity = cinematicSettings.vfx.intensity || 50;
            vfxStrengthBonus = (intensity / 100) * 0.4;
        }

        // Calculate strength from bodyFidelity
        // IMPORTANT: When tattoo preservation is active with high fidelity, use VERY LOW strength
        // to maximize preservation of original tattoo positions
        let fidelityStrengthBase = bodyFidelity ? Math.max(0.15, Math.min(0.7, (100 - bodyFidelity) / 100)) : 0.5;

        // TATTOO PRESERVATION PRIORITY: When active with high fidelity, cap strength regardless of VFX
        let tattooStrengthCap = 1.0; // No cap by default
        if (needsTattooPreservation && bodyFidelity && bodyFidelity >= 80) {
            tattooStrengthCap = 0.25; // Strict cap for maximum tattoo preservation
            fidelityStrengthBase = Math.min(fidelityStrengthBase, 0.20);
            console.log(`[TATTOO-FIDELITY] High fidelity mode - base capped at 0.20, max at 0.25`);
        } else if (needsTattooPreservation) {
            tattooStrengthCap = 0.45; // Moderate cap when tattoo preservation is on but fidelity is lower
            console.log(`[TATTOO-FIDELITY] Standard mode - max capped at 0.45`);
        }

        // Apply VFX bonus but respect tattoo cap
        let calculatedStrength = Math.max(fidelityStrengthBase, 0.4 + vfxStrengthBonus);

        // Apply tattoo preservation cap (this takes priority over VFX)
        if (needsTattooPreservation) {
            calculatedStrength = Math.min(calculatedStrength, tattooStrengthCap);
        }

        const adjustedStrength = Math.min(0.85, calculatedStrength);

        console.log(`[STRENGTH-CALC] Base: ${fidelityStrengthBase.toFixed(2)}, VFX: ${vfxStrengthBonus.toFixed(2)}, TattooCap: ${tattooStrengthCap.toFixed(2)}, Final: ${adjustedStrength.toFixed(2)}`);

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: "At least one image is required" });
        }

        // Use custom API key for admins (decrypt if present), otherwise use system key
        let apiKey = process.env.MODELSLAB_API_KEY;
        if (hasCustomKey && encryptedApiKey) {
            try {
                const { decryptApiKey } = await import("../lib/encryption");
                const decryptedKey = decryptApiKey(encryptedApiKey);
                if (decryptedKey) {
                    apiKey = decryptedKey;
                }
            } catch {
                // If decryption fails, use system key
            }
        }
        if (!apiKey) {
            return res.status(500).json({ error: "ModelsLab API key not configured" });
        }

        // Nano Banana Pro accepts images as URLs or base64 data URLs directly
        // Keep the full data URL format for base64 images
        const processedImages = images.map((img: string) => {
            if (typeof img !== 'string') return '';
            return img;
        }).filter((img: string) => img.length > 0);

        if (processedImages.length === 0) {
            return res.status(400).json({ error: "No valid images provided" });
        }

        // Nano Banana Pro v7 API - supports up to 14 images with multi-image fusion
        // Valid aspect ratios: 1:1, 9:16, 2:3, 3:4, 4:5, 5:4, 4:3, 3:2, 16:9, 21:9
        const validRatios = ["1:1", "9:16", "2:3", "3:4", "4:5", "5:4", "4:3", "3:2", "16:9", "21:9"];
        const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

        // Calculate dimensions respecting ModelsLab's max 1024px limit while maintaining aspect ratio
        const getDimensions = (ratio: string): { width: string; height: string } => {
            switch (ratio) {
                case "16:9":
                    return { width: "1024", height: "576" };
                case "9:16":
                    return { width: "576", height: "1024" };
                case "4:3":
                    return { width: "1024", height: "768" };
                case "3:4":
                    return { width: "768", height: "1024" };
                case "3:2":
                    return { width: "1024", height: "683" };
                case "2:3":
                    return { width: "683", height: "1024" };
                case "5:4":
                    return { width: "1024", height: "819" };
                case "4:5":
                    return { width: "819", height: "1024" };
                case "21:9":
                    return { width: "1024", height: "439" };
                case "1:1":
                default:
                    return { width: "1024", height: "1024" };
            }
        };

        const dimensions = getDimensions(selectedRatio);

        // Use only the first image - ModelsLab image-to-image expects a single init_image
        let initImage = processedImages[0];

        // Truncate UNIFIED prompt to API max length (2000 chars)
        // unifiedPrompt already contains: Anti-CGI + Gems + Original Prompt
        const truncatedPrompt = unifiedPrompt.length > 2000 ? unifiedPrompt.substring(0, 2000) : unifiedPrompt;

        // Check if it's a base64 data URL and extract just the base64 content
        const isBase64 = initImage.startsWith("data:");
        if (isBase64) {
            // Extract just the base64 content (remove "data:image/...;base64," prefix)
            const base64Match = initImage.match(/^data:image\/[^;]+;base64,(.+)$/);
            if (base64Match) {
                initImage = base64Match[1];
            }
        }

        // Select model based on quota check (HQ = nano-banana-pro, Standard = realistic-vision-51)
        // IMPORTANT: When precise control mode is needed (gems/tattoo preservation), 
        // we force Realistic Vision v6 even for admins because it accepts control parameters
        let selectedModel: string;
        let isHqModel: boolean;
        let isNanoBananaPro: boolean;

        // Check if user is Pro from quota
        const isPro = imageQuota?.isPro === true;

        if (isAdmin || isPro) {
            // Both Admins AND Pro users get Nano Banana Pro HQ model ALWAYS
            // We prioritize Model Quality over "Precise Control" mechanisms used for tattoos/gems
            selectedModel = MODELSLAB_MODELS.HQ;
            isHqModel = true;
            isNanoBananaPro = true;
            console.log(`User is ${isAdmin ? 'Admin' : 'Pro'} - using Nano Banana Pro HQ model (Precise Content Mode: ${usePreciseControlMode})`);
        } else if (usePreciseControlMode) {
            // For FREE users, we support the downgrade to Standard for better control if needed
            selectedModel = MODELSLAB_MODELS.STANDARD;
            isHqModel = false;
            isNanoBananaPro = false;
            console.log(`Free user with Precise control mode active - switching to Realistic Vision`);
        } else {
            // Free users standard logic
            selectedModel = imageQuota?.modelId || MODELSLAB_MODELS.STANDARD;
            isHqModel = imageQuota?.imageQuality === "hq";
            isNanoBananaPro = selectedModel === MODELSLAB_MODELS.HQ;
            console.log(`Free user - using ${selectedModel} (${imageQuota?.imageQuality || 'standard'} quality)`);
        }

        // Use the unified negative prompt (already built above with anti-CGI + gems + tattoo)
        const finalNegativePrompt = unifiedNegativePrompt;

        // Nano Banana Pro uses v7 API with different parameters
        let requestBody: any;
        let apiEndpoint: string;

        // Always use v7 API for Nano Banana Pro
        if (isNanoBananaPro) {
            // Nano Banana Pro - v7 API with multi-image fusion support
            // Convert aspect ratio to Nano Banana format
            const aspectRatioMap: Record<string, string> = {
                "1:1": "1:1",
                "16:9": "16:9",
                "9:16": "9:16",
                "4:3": "4:3",
                "3:4": "3:4",
                "5:4": "4:3",
                "4:5": "3:4",
                "21:9": "16:9",
            };
            const nanoBananaRatio = aspectRatioMap[selectedRatio] || "1:1";

            requestBody = {
                key: apiKey,
                model_id: "nano-banana-pro",
                prompt: truncatedPrompt,
                negative_prompt: finalNegativePrompt, // Pass negative prompt even to v7
                init_image: processedImages, // Array of images for multi-image fusion
                aspect_ratio: nanoBananaRatio,
                guidance_scale: needsTattooPreservation ? 9.0 : 7.5, // Pass guidance scale
                prompt_strength: adjustedStrength, // Pass strength to v7 (if supported, otherwise ignored)
            };
            apiEndpoint = "https://modelslab.com/api/v7/images/image-to-image";

            console.log(`Using Nano Banana Pro (v7 API) - Precise Mode: ${usePreciseControlMode}, Strength: ${adjustedStrength}`);
        } else {
            // Realistic Vision 5.1 - v6 API with full control parameters
            // Used when: standard quota, or precise control mode is active (gems/tattoo preservation)
            const controlStrength = adjustedStrength; // Use adjusted strength with VFX boost
            const controlCfg = needsTattooPreservation ? 9.0 : 7.5;
            const controlSteps = needsTattooPreservation ? "35" : "30";

            requestBody = {
                key: apiKey,
                model_id: selectedModel === "nano-banana-pro" ? MODELSLAB_MODELS.STANDARD : selectedModel,
                prompt: truncatedPrompt,
                negative_prompt: finalNegativePrompt,
                init_image: initImage,
                base64: isBase64 ? "yes" : "no",
                width: dimensions.width,
                height: dimensions.height,
                samples: "1",
                num_inference_steps: controlSteps,
                safety_checker: "no",
                enhance_prompt: "no",
                guidance_scale: controlCfg,
                strength: controlStrength,
                scheduler: "DPMSolverMultistepScheduler",
            };
            apiEndpoint = "https://modelslab.com/api/v6/images/img2img";

            if (usePreciseControlMode) {
                console.log(`Precise control: strength=${controlStrength.toFixed(2)}, cfg=${controlCfg}, steps=${controlSteps}, tattooMode=${needsTattooPreservation}`);
            }
        }

        console.log(`Sending to ModelsLab ${isNanoBananaPro ? 'v7 Nano Banana Pro' : 'v6 img2img'} (${selectedModel} - ${imageQuota.imageQuality}):`, {
            ...requestBody,
            key: "[REDACTED]",
            init_image: isNanoBananaPro ? `[${processedImages.length} images]` : `[image: ${initImage.substring(0, 50)}...]`,
            prompt: `[${truncatedPrompt.length} chars]`,
        });

        let response = await fetchWithTimeout(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        }, 90000); // 90s timeout for Nano Banana Pro (larger model)

        let data = await response.json();

        // Retry mechanism: If custom key fails (400 Invalid API Key), try with System Key
        if (data.status === "error" &&
            (data.message?.includes("Invalid API Key") || data.message?.includes("auth")) &&
            hasCustomKey) {

            console.warn("Custom Admin API Key failed. Retrying with System API Key...");

            // Switch to System Key
            requestBody.key = process.env.MODELSLAB_API_KEY;

            response = await fetchWithTimeout(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            }, 90000);

            data = await response.json();
        }

        if (data.status === "error") {
            console.error("ModelsLab error:", data);
            return res.status(400).json({ error: data.message || "ModelsLab API error" });
        }

        // Process base64 URLs if present - convert them to proper data URLs
        if (data.status === "success" && data.output && Array.isArray(data.output)) {
            const processedOutput: string[] = [];
            for (const url of data.output) {
                if (typeof url === 'string' && url.endsWith('.base64')) {
                    try {
                        console.log(`Fetching base64 content from: ${url}`);
                        // Fetch the base64 content from the file
                        const base64Response = await fetchWithTimeout(url, {
                            method: "GET",
                        }, 45000); // Increased timeout for base64 fetch

                        if (!base64Response.ok) {
                            throw new Error(`Failed to fetch base64 file: ${base64Response.status} ${base64Response.statusText}`);
                        }

                        const base64Content = await base64Response.text();
                        if (!base64Content || base64Content.length < 100) {
                            throw new Error("Invalid base64 content received (too short)");
                        }

                        const cleanBase64 = base64Content.trim();

                        // Check if the content already has a data URI prefix (avoid double-prefixing)
                        if (cleanBase64.startsWith('data:image/')) {
                            processedOutput.push(cleanBase64);
                            console.log(`Base64 content already has data URI prefix, using as-is`);
                        } else {
                            // Detect image type from base64 header
                            let mimeType = 'image/png';
                            if (cleanBase64.startsWith('/9j/')) {
                                mimeType = 'image/jpeg';
                            } else if (cleanBase64.startsWith('iVBOR')) {
                                mimeType = 'image/png';
                            }
                            processedOutput.push(`data:${mimeType};base64,${cleanBase64}`);
                        }
                        console.log(`Successfully converted .base64 URL to data URI (${cleanBase64.length} chars)`);
                    } catch (err) {
                        console.error('Failed to fetch/convert base64 content:', err);
                        // Do NOT push the original URL as fallback if it's a .base64 file
                        // browsers cannot render .base64 text files in <img> tags
                        // This prevents the "broken image" icon in frontend
                    }
                } else {
                    processedOutput.push(url);
                }
            }

            // If we had outputs but failed to process any of them, mark as error
            if (data.output.length > 0 && processedOutput.length === 0) {
                console.error("All outputs failed processing");
                return res.status(500).json({ error: "Generated images could not be retrieved. Please try again." });
            }

            data.output = processedOutput;
        }

        await logUsage(userId, "image", {
            imageQuality: imageQuota.imageQuality,
            modelId: selectedModel,
        });

        // Include quota info and model used in response
        res.json({
            ...data,
            modelUsed: selectedModel,
            imageQuality: imageQuota.imageQuality,
            hqExhausted: imageQuota.hqExhausted || false,
            quotas: imageQuota.quotas,
        });
    } catch (error) {
        console.error("Error calling ModelsLab API:", error);
        res.status(500).json({ error: "Failed to generate image" });
    }
});

// ============ PROMPT REFINER FOR TEXT-TO-IMAGE ============
router.post("/refine-prompt", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { prompt, aspectRatio } = req.body;

        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const userPrompt = prompt.trim();
        console.log(`[REFINE-PROMPT] Input: "${userPrompt.substring(0, 100)}..."`);

        // ============ INTENT ANALYSIS ============
        // Detect the type of content user wants to create
        const lowerPrompt = userPrompt.toLowerCase();

        interface PromptIntent {
            type: "logo" | "portrait" | "landscape" | "product" | "abstract" | "character" | "scene" | "artwork";
            style: string[];
            mood: string[];
            colors: string[];
            subject: string;
            details: string[];
            quality: string[];
        }

        const intent: PromptIntent = {
            type: "artwork",
            style: [],
            mood: [],
            colors: [],
            subject: userPrompt,
            details: [],
            quality: ["high quality", "detailed", "professional"]
        };

        // Detect type
        if (lowerPrompt.includes("logo") || lowerPrompt.includes("logotipo") || lowerPrompt.includes("marca")) {
            intent.type = "logo";
            intent.quality.push("vector-like", "clean lines", "scalable design");
        } else if (lowerPrompt.includes("retrato") || lowerPrompt.includes("portrait") || lowerPrompt.includes("rosto") || lowerPrompt.includes("face")) {
            intent.type = "portrait";
            intent.quality.push("photorealistic", "sharp focus on face", "studio lighting");
        } else if (lowerPrompt.includes("paisagem") || lowerPrompt.includes("landscape") || lowerPrompt.includes("cenário") || lowerPrompt.includes("ambiente")) {
            intent.type = "landscape";
            intent.quality.push("wide angle", "environmental lighting", "atmospheric");
        } else if (lowerPrompt.includes("produto") || lowerPrompt.includes("product") || lowerPrompt.includes("item")) {
            intent.type = "product";
            intent.quality.push("commercial photography", "clean background", "product focus");
        } else if (lowerPrompt.includes("abstrato") || lowerPrompt.includes("abstract")) {
            intent.type = "abstract";
            intent.quality.push("artistic", "creative composition", "unique");
        } else if (lowerPrompt.includes("personagem") || lowerPrompt.includes("character") || lowerPrompt.includes("herói") || lowerPrompt.includes("hero")) {
            intent.type = "character";
            intent.quality.push("character design", "full body", "dynamic pose");
        } else if (lowerPrompt.includes("cena") || lowerPrompt.includes("scene")) {
            intent.type = "scene";
            intent.quality.push("cinematic", "narrative composition", "storytelling");
        }

        // Detect styles
        const styleKeywords: Record<string, string[]> = {
            "minimalista": ["minimalist", "clean", "simple", "modern"],
            "minimal": ["minimalist", "clean", "simple", "modern"],
            "gótico": ["gothic", "dark", "ornate", "medieval"],
            "gotico": ["gothic", "dark", "ornate", "medieval"],
            "rock": ["rock style", "edgy", "bold", "rebellious"],
            "corporativo": ["corporate", "professional", "business", "sleek"],
            "futurista": ["futuristic", "sci-fi", "cyberpunk", "neon"],
            "vintage": ["vintage", "retro", "classic", "nostalgic"],
            "neon": ["neon lights", "glowing", "vibrant", "electric"],
            "3d": ["3D render", "volumetric", "dimensional", "depth"],
            "flat": ["flat design", "2D", "geometric", "simplified"],
            "realista": ["photorealistic", "hyperrealistic", "lifelike"],
            "realistic": ["photorealistic", "hyperrealistic", "lifelike"],
            "cartoon": ["cartoon style", "animated", "stylized"],
            "anime": ["anime style", "japanese animation", "manga-inspired"],
            "aquarela": ["watercolor", "soft edges", "organic flow"],
            "watercolor": ["watercolor", "soft edges", "organic flow"],
        };

        for (const [keyword, styles] of Object.entries(styleKeywords)) {
            if (lowerPrompt.includes(keyword)) {
                intent.style.push(...styles);
            }
        }

        // Detect colors
        const colorKeywords: Record<string, string[]> = {
            "preto e branco": ["black and white", "monochrome", "grayscale"],
            "black and white": ["black and white", "monochrome", "grayscale"],
            "monocromático": ["monochromatic", "single color palette"],
            "colorido": ["vibrant colors", "colorful", "rich palette"],
            "dourado": ["gold accents", "golden", "luxurious"],
            "neon": ["neon colors", "glowing", "electric colors"],
            "pastel": ["pastel colors", "soft tones", "muted"],
            "escuro": ["dark tones", "shadows", "low key"],
            "claro": ["bright", "light tones", "high key"],
        };

        for (const [keyword, colors] of Object.entries(colorKeywords)) {
            if (lowerPrompt.includes(keyword)) {
                intent.colors.push(...colors);
            }
        }

        // Detect mood
        const moodKeywords: Record<string, string[]> = {
            "elegante": ["elegant", "sophisticated", "refined"],
            "agressivo": ["aggressive", "intense", "powerful"],
            "calmo": ["calm", "peaceful", "serene"],
            "misterioso": ["mysterious", "enigmatic", "intriguing"],
            "profissional": ["professional", "polished", "corporate"],
            "divertido": ["fun", "playful", "cheerful"],
            "sério": ["serious", "formal", "authoritative"],
        };

        for (const [keyword, moods] of Object.entries(moodKeywords)) {
            if (lowerPrompt.includes(keyword)) {
                intent.mood.push(...moods);
            }
        }

        // ============ BUILD OPTIMIZED PROMPT ============
        // Nano Banana Pro works best with: [SUBJECT] [STYLE] [DETAILS] [QUALITY]

        let optimizedPrompt = "";

        // 1. Subject (the main thing user wants)
        optimizedPrompt += userPrompt;

        // 2. Add detected styles
        if (intent.style.length > 0) {
            const uniqueStyles = Array.from(new Set(intent.style)).slice(0, 4);
            optimizedPrompt += `, ${uniqueStyles.join(", ")}`;
        }

        // 3. Add colors
        if (intent.colors.length > 0) {
            const uniqueColors = Array.from(new Set(intent.colors)).slice(0, 3);
            optimizedPrompt += `, ${uniqueColors.join(", ")}`;
        }

        // 4. Add mood
        if (intent.mood.length > 0) {
            const uniqueMoods = Array.from(new Set(intent.mood)).slice(0, 2);
            optimizedPrompt += `, ${uniqueMoods.join(", ")}`;
        }

        // 5. Add type-specific enhancements
        switch (intent.type) {
            case "logo":
                optimizedPrompt += ", centered composition, clean background, professional logo design, brand identity, sharp edges";
                break;
            case "portrait":
                optimizedPrompt += ", professional portrait photography, perfect lighting, sharp focus, bokeh background";
                break;
            case "landscape":
                optimizedPrompt += ", stunning landscape, dramatic lighting, high dynamic range, wide angle view";
                break;
            case "product":
                optimizedPrompt += ", product photography, clean white background, professional lighting, commercial quality";
                break;
            case "abstract":
                optimizedPrompt += ", abstract art, creative composition, artistic expression, unique design";
                break;
            case "character":
                optimizedPrompt += ", character concept art, full body design, dynamic pose, detailed illustration";
                break;
            case "scene":
                optimizedPrompt += ", cinematic scene, narrative composition, environmental storytelling, atmospheric lighting";
                break;
            default:
                optimizedPrompt += ", high quality, detailed, professional artwork";
        }

        // 6. Universal quality boosters
        optimizedPrompt += ", 4K resolution, masterpiece, best quality";

        // 7. Aspect ratio optimization
        if (aspectRatio === "16:9" || aspectRatio === "21:9") {
            optimizedPrompt += ", widescreen composition, cinematic framing";
        } else if (aspectRatio === "9:16") {
            optimizedPrompt += ", vertical composition, portrait orientation";
        } else if (aspectRatio === "1:1") {
            optimizedPrompt += ", centered balanced composition, square format";
        }

        // Build response JSON
        const result = {
            original: userPrompt,
            refined: optimizedPrompt,
            analysis: {
                type: intent.type,
                styles: Array.from(new Set(intent.style)),
                colors: Array.from(new Set(intent.colors)),
                mood: Array.from(new Set(intent.mood)),
            },
            suggestions: [
                intent.style.length === 0 ? "Considere adicionar um estilo (ex: minimalista, gótico, futurista)" : null,
                intent.colors.length === 0 ? "Adicione cores específicas para melhor resultado (ex: preto e branco, neon)" : null,
                intent.type === "logo" && !lowerPrompt.includes("fundo") ? "Para logos, especifique o fundo (ex: fundo transparente, fundo branco)" : null,
            ].filter(Boolean)
        };

        console.log(`[REFINE-PROMPT] Output: "${optimizedPrompt.substring(0, 150)}..." | Type: ${intent.type}`);

        res.json(result);
    } catch (error) {
        console.error("Error refining prompt:", error);
        res.status(500).json({ error: "Failed to refine prompt" });
    }
});

// ============ TEXT-TO-IMAGE GENERATION ============
router.post("/text2img", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        // Check if user is admin (all admins bypass quotas)
        const user = await storage.getAppUser(userId);
        const isAdmin = user?.isAdmin === 1;
        const encryptedApiKey = user?.customModelsLabKey;
        const hasCustomKey = isAdmin && !!encryptedApiKey;

        // All admins bypass quotas, regardless of having a custom key
        let imageQuota: ImageQuotaResult;
        if (isAdmin) {
            // Admins get unlimited HQ access
            imageQuota = {
                allowed: true,
                isPro: true,
                modelId: MODELSLAB_MODELS.HQ,
                imageQuality: "hq"
            };
        } else {
            imageQuota = await checkImageQuotaAndModel(userId);
            if (!imageQuota.allowed) {
                return res.status(403).json({
                    error: imageQuota.reason,
                    isPremiumRequired: true,
                    quotas: imageQuota.quotas,
                });
            }
        }

        const { prompt, aspectRatio, negativePrompt } = req.body;

        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({ error: "Prompt is required for text-to-image generation" });
        }

        // Use custom API key for admins (decrypt if present), otherwise use system key
        let apiKey = process.env.MODELSLAB_API_KEY;
        if (hasCustomKey && encryptedApiKey) {
            try {
                const { decryptApiKey } = await import("../lib/encryption");
                const decryptedKey = decryptApiKey(encryptedApiKey);
                if (decryptedKey) {
                    apiKey = decryptedKey;
                }
            } catch {
                // If decryption fails, use system key
            }
        }
        if (!apiKey) {
            return res.status(500).json({ error: "ModelsLab API key not configured" });
        }

        // Check if user is Pro from quota
        const isPro = imageQuota?.isPro === true;

        // Select model based on plan
        let selectedModel: string;
        let isHqModel: boolean;

        if (isAdmin || isPro) {
            // Pro/Admin get Nano Banana Pro for text2img
            selectedModel = MODELSLAB_MODELS.HQ;
            isHqModel = true;
            console.log(`[TEXT2IMG] User is ${isAdmin ? 'Admin' : 'Pro'} - using Nano Banana Pro HQ model`);
        } else {
            // Free users use standard model or HQ while quota available
            selectedModel = imageQuota?.modelId || MODELSLAB_MODELS.STANDARD;
            isHqModel = imageQuota?.imageQuality === "hq";
            console.log(`[TEXT2IMG] Free user - using ${selectedModel} (${imageQuota?.imageQuality || 'standard'} quality)`);
        }

        // Build negative prompt
        let finalNegativePrompt = negativePrompt || "bad quality, blurry, distorted, low resolution, watermark, text, ugly, deformed";

        // Calculate dimensions from aspect ratio
        const validRatios = ["1:1", "9:16", "2:3", "3:4", "4:5", "5:4", "4:3", "3:2", "16:9", "21:9"];
        const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

        const getDimensions = (ratio: string): { width: string; height: string } => {
            switch (ratio) {
                case "16:9":
                    return { width: "1024", height: "576" };
                case "9:16":
                    return { width: "576", height: "1024" };
                case "4:3":
                    return { width: "1024", height: "768" };
                case "3:4":
                    return { width: "768", height: "1024" };
                case "3:2":
                    return { width: "1024", height: "683" };
                case "2:3":
                    return { width: "683", height: "1024" };
                case "5:4":
                    return { width: "1024", height: "819" };
                case "4:5":
                    return { width: "819", height: "1024" };
                case "21:9":
                    return { width: "1024", height: "439" };
                case "1:1":
                default:
                    return { width: "1024", height: "1024" };
            }
        };

        const dimensions = getDimensions(selectedRatio);

        // Truncate prompt to API max length (2000 chars)
        const truncatedPrompt = prompt.length > 2000 ? prompt.substring(0, 2000) : prompt;

        // Build request for text2img API
        let requestBody: any;
        let apiEndpoint: string;

        if (isHqModel && selectedModel === MODELSLAB_MODELS.HQ) {
            // Nano Banana Pro text2img - use v7 API
            const aspectRatioMap: Record<string, string> = {
                "1:1": "1:1",
                "16:9": "16:9",
                "9:16": "9:16",
                "4:3": "4:3",
                "3:4": "3:4",
                "5:4": "4:3",
                "4:5": "3:4",
                "21:9": "16:9",
            };
            const nanoBananaRatio = aspectRatioMap[selectedRatio] || "1:1";

            requestBody = {
                key: apiKey,
                model_id: "nano-banana-pro",
                prompt: truncatedPrompt,
                negative_prompt: finalNegativePrompt,
                aspect_ratio: nanoBananaRatio,
                guidance_scale: 7.5,
            };
            apiEndpoint = "https://modelslab.com/api/v7/images/text-to-image";

            console.log(`[TEXT2IMG] Using Nano Banana Pro (v7 API) for text-to-image`);
        } else {
            // Standard model - use v6 API text2img
            requestBody = {
                key: apiKey,
                model_id: selectedModel,
                prompt: truncatedPrompt,
                negative_prompt: finalNegativePrompt,
                width: dimensions.width,
                height: dimensions.height,
                samples: "1",
                num_inference_steps: "30",
                safety_checker: "no",
                enhance_prompt: "yes",
                guidance_scale: 7.5,
                scheduler: "DPMSolverMultistepScheduler",
            };
            apiEndpoint = "https://modelslab.com/api/v6/images/text2img";

            console.log(`[TEXT2IMG] Using ${selectedModel} (v6 API) for text-to-image`);
        }

        console.log(`[TEXT2IMG] Sending to ModelsLab:`, {
            ...requestBody,
            key: "[REDACTED]",
            prompt: `[${truncatedPrompt.length} chars]`,
        });

        let response = await fetchWithTimeout(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        }, 90000); // 90s timeout

        let data = await response.json();

        // Retry mechanism: If custom key fails, try with System Key
        if (data.status === "error" &&
            (data.message?.includes("Invalid API Key") || data.message?.includes("auth")) &&
            hasCustomKey) {

            console.warn("[TEXT2IMG] Custom Admin API Key failed. Retrying with System API Key...");

            requestBody.key = process.env.MODELSLAB_API_KEY;

            response = await fetchWithTimeout(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            }, 90000);

            data = await response.json();
        }

        if (data.status === "error") {
            console.error("[TEXT2IMG] ModelsLab error:", data);
            return res.status(400).json({ error: data.message || "ModelsLab API error" });
        }

        // Process base64 URLs if present
        if (data.status === "success" && data.output && Array.isArray(data.output)) {
            const processedOutput: string[] = [];
            for (const url of data.output) {
                if (typeof url === 'string' && url.endsWith('.base64')) {
                    try {
                        const base64Response = await fetchWithTimeout(url, {
                            method: "GET",
                        }, 30000);
                        const base64Content = await base64Response.text();
                        const cleanBase64 = base64Content.trim();

                        let mimeType = 'image/png';
                        if (cleanBase64.startsWith('/9j/')) {
                            mimeType = 'image/jpeg';
                        } else if (cleanBase64.startsWith('iVBOR')) {
                            mimeType = 'image/png';
                        }
                        processedOutput.push(`data:${mimeType};base64,${cleanBase64}`);
                    } catch (err) {
                        console.error('[TEXT2IMG] Failed to fetch base64 content:', err);
                        processedOutput.push(url);
                    }
                } else {
                    processedOutput.push(url);
                }
            }
            data.output = processedOutput;
        }

        await logUsage(userId, "image", {
            imageQuality: imageQuota.imageQuality,
            modelId: selectedModel,
            generationType: "text2img",
        });

        // Include quota info and model used in response
        res.json({
            ...data,
            modelUsed: selectedModel,
            imageQuality: imageQuota.imageQuality,
            hqExhausted: imageQuota.hqExhausted || false,
            quotas: imageQuota.quotas,
            generationType: "text2img",
        });
    } catch (error) {
        console.error("[TEXT2IMG] Error calling ModelsLab API:", error);
        res.status(500).json({ error: "Failed to generate image" });
    }
});

// Check generation status (for async generation)
// Security: Only allow fetching from trusted ModelsLab domains
const ALLOWED_MODELSLAB_HOSTS = [
    "modelslab.com",
    "api.modelslab.com",
    "stablediffusionapi.com",
];

router.post("/status", async (req, res) => {
    try {
        const { fetchUrl } = req.body;

        if (!fetchUrl) {
            return res.status(400).json({ error: "Fetch URL is required" });
        }

        // Validate URL is from trusted ModelsLab domain
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(fetchUrl);
        } catch {
            return res.status(400).json({ error: "Invalid URL format" });
        }

        const isAllowedHost = ALLOWED_MODELSLAB_HOSTS.some(
            host => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
        );

        if (!isAllowedHost) {
            console.warn(`Blocked SSRF attempt to: ${parsedUrl.hostname}`);
            return res.status(403).json({ error: "URL not from trusted ModelsLab domain" });
        }

        const apiKey = process.env.MODELSLAB_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "ModelsLab API key not configured" });
        }

        const response = await fetchWithTimeout(fetchUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                key: apiKey,
            }),
        }, 30000); // 30s timeout for status check

        const data = await response.json();

        // Process base64 URLs if present - convert them to proper data URLs
        if (data.status === "success" && data.output && Array.isArray(data.output)) {
            const processedOutput: string[] = [];
            for (const url of data.output) {
                if (typeof url === 'string' && url.endsWith('.base64')) {
                    try {
                        // Fetch the base64 content from the file
                        const base64Response = await fetchWithTimeout(url, {
                            method: "GET",
                        }, 30000);
                        const base64Content = await base64Response.text();
                        const cleanBase64 = base64Content.trim();

                        // Detect image type from base64 header
                        let mimeType = 'image/png';
                        if (cleanBase64.startsWith('/9j/')) {
                            mimeType = 'image/jpeg';
                        } else if (cleanBase64.startsWith('iVBOR')) {
                            mimeType = 'image/png';
                        }
                        processedOutput.push(`data:${mimeType};base64,${cleanBase64}`);
                    } catch (err) {
                        console.error('Failed to fetch base64 content:', err);
                        processedOutput.push(url); // Fallback to original
                    }
                } else {
                    processedOutput.push(url);
                }
            }
            data.output = processedOutput;
        }

        res.json(data);
    } catch (error) {
        console.error("Error checking ModelsLab status:", error);
        res.status(500).json({ error: "Failed to check status" });
    }
});

export default router;
