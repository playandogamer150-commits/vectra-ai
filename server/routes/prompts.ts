import { Router } from "express";
import { storage } from "../storage";
import { requireAuth, getUserId } from "../lib/auth-helpers";
import { compiler } from "../prompt-engine/compiler";
import { generateRequestSchema } from "@shared/schema";
import { ZodError } from "zod";
import { applyGeminiGemsOptimization } from "../prompt-engine/gemini-gems";
import { FREE_LIMITS } from "../lib/quotas";

const router = Router();

router.post("/generate", async (req, res) => {
    try {
        const userId = getUserId(req);
        const rateLimitKey = req.ip || "anonymous";
        const isEnvAdminOverride = process.env.ADMIN_OVERRIDE === "true";

        // Resolve plan/admin once
        const appUser = userId ? await storage.getAppUser(userId) : undefined;
        const isUserAdmin = appUser?.isAdmin === 1;
        const isPro = appUser?.plan === "pro";
        const isAdminOverride = isEnvAdminOverride || isUserAdmin;
        const isProOrAdmin = isAdminOverride || isPro;

        // Anonymous abuse protection (IP-based). Logged-in users use plan-based quotas.
        const freeGenerationsPerDayAnonymous = 3;
        const freeFilterLimit = 3;

        if (!userId) {
            // Anonymous: keep IP-based limit
            const canProceed = await storage.checkRateLimit(rateLimitKey, freeGenerationsPerDayAnonymous, 24 * 60 * 60 * 1000);
            if (!canProceed) {
                return res.status(429).json({
                    error: "Daily generation limit reached. Create an account or upgrade to Pro for unlimited generations.",
                    isPremiumRequired: true
                });
            }
        } else if (!isProOrAdmin) {
            // Logged-in Free: enforce per-user daily quota
            const usedToday = await storage.getUsageToday(userId, "prompt");
            if (usedToday >= FREE_LIMITS.promptsPerDay) {
                return res.status(429).json({
                    error: `Daily generation limit reached (${FREE_LIMITS.promptsPerDay}/${FREE_LIMITS.promptsPerDay}). Upgrade to Pro for unlimited generations.`,
                    isPremiumRequired: true
                });
            }
        }

        const validated = generateRequestSchema.parse(req.body);

        if (!isProOrAdmin) {
            const premiumFilters = await storage.getFilters();
            const premiumFilterKeys = premiumFilters.filter(f => f.isPremium === 1).map(f => f.key);
            const appliedPremiumFilters = Object.keys(validated.filters).filter(k => premiumFilterKeys.includes(k));

            if (appliedPremiumFilters.length > 0) {
                return res.status(403).json({
                    error: `Premium filters detected: ${appliedPremiumFilters.join(", ")}. Upgrade to Pro to use these filters.`,
                    isPremiumRequired: true
                });
            }

            if (Object.keys(validated.filters).length > freeFilterLimit) {
                return res.status(403).json({
                    error: `Free plan limited to ${freeFilterLimit} filters. Upgrade to Pro for unlimited filters.`,
                    isPremiumRequired: true
                });
            }
        }

        const latestProfiles = await storage.getProfiles();
        const latestBlueprints = await storage.getBlueprints();
        const latestBlocks = await storage.getBlocks();
        const latestFilters = await storage.getFilters();
        compiler.setData(latestProfiles, latestBlueprints, latestBlocks, latestFilters);

        // Handle user blueprints - convert to virtual system blueprint format
        let effectiveBlueprintId = validated.blueprintId || "";
        if (validated.userBlueprintId) {
            const userBlueprint = await storage.getUserBlueprint(validated.userBlueprintId);
            if (!userBlueprint) {
                return res.status(400).json({ error: "User blueprint not found" });
            }
            // Get the latest version to access blocks and constraints
            const latestVersion = await storage.getUserBlueprintLatestVersion(validated.userBlueprintId);
            if (!latestVersion) {
                return res.status(400).json({ error: "User blueprint has no versions" });
            }
            // Register user blueprint in compiler as a virtual system blueprint
            compiler.registerUserBlueprint({
                id: userBlueprint.id,
                name: userBlueprint.name,
                description: userBlueprint.description || "",
                category: userBlueprint.category,
                blocks: latestVersion.blocks as string[],
                constraints: latestVersion.constraints as string[],
            });
            effectiveBlueprintId = userBlueprint.id;
        }

        // Always reset LoRA state before each request to prevent leaking between requests
        compiler.setActiveLora(null);

        // Activate LoRA if provided and valid
        if (validated.loraVersionId) {
            const loraVersion = await storage.getLoraVersion(validated.loraVersionId);
            if (!loraVersion) {
                return res.status(400).json({ error: "LoRA version not found" });
            }
            if (!loraVersion.artifactUrl) {
                return res.status(400).json({ error: "LoRA version not trained yet" });
            }
            const loraModel = await storage.getLoraModel(loraVersion.loraModelId);
            compiler.setActiveLora({
                version: loraVersion,
                weight: validated.loraWeight || 1,
                triggerWord: loraModel?.name?.toLowerCase().replace(/\s+/g, "_") || "custom_style",
                modelName: loraModel?.name || "Custom Model",
            });
        }

        // Merge cinematicSettings into filters for unified processing
        const cinematicFilters: Record<string, string> = {};
        const cinematicModifiers: string[] = [];

        if (validated.cinematicSettings) {
            const cs = validated.cinematicSettings;

            // Optics settings - Camera style that defines the overall visual aesthetic
            if (cs.optics?.style) {
                const opticsMap: Record<string, string> = {
                    "cinematic": "professional cinematic photography, anamorphic lens, shallow depth of field, Hollywood film quality, 4K resolution",
                    "smartphone": "authentic smartphone photo, real-life mobile photography, natural lighting, casual candid shot, iPhone quality",
                    "iphone-hdr": "iPhone 15 Pro Max HDR photo, Apple ProRAW, vibrant dynamic range, Smart HDR 5, photorealistic mobile capture",
                    "realistic-raw": "unprocessed RAW photo, no post-processing, natural unedited look, direct from camera sensor, authentic documentary style",
                    "forensic-dslr": "forensic DSLR photography, sharp clinical focus, evidence-grade precision, high detail capture, professional documentation",
                };
                if (opticsMap[cs.optics.style]) {
                    cinematicModifiers.push(opticsMap[cs.optics.style]);
                    cinematicFilters["camera_style"] = cs.optics.style;
                }
            }

            // VFX effects - Visual post-processing effects that transform the image
            if (cs.vfx?.effects && cs.vfx.effects.length > 0) {
                const vfxMap: Record<string, string> = {
                    "vhs": "VHS tape recording aesthetic, retro 1980s video quality, chromatic aberration, magnetic tape distortion, analog noise, tracking lines, RGB color bleeding",
                    "35mm": "35mm analog film stock, Kodak Portra 400 emulation, organic film grain texture, cinematic warmth, photochemical color science, slight vignette",
                    "nvg": "NIGHT VISION GOGGLES POV, monochrome phosphor green tint, military Gen3 NVG display, infrared thermal imaging overlay, tactical night operations aesthetic, green-scale image intensifier",
                    "cine": "professional cinematic color grading, ARRI Alexa look, anamorphic horizontal lens flares, Hollywood blockbuster color science, cinematic letterbox feel",
                    "gltch": "digital glitch art effect, data corruption aesthetic, pixel sorting, RGB channel displacement, databending artifacts, broken display simulation",
                    "blum": "ethereal bloom lighting effect, soft dreamy glow on highlights, diffused light halos, romantic atmospheric haze, lens diffusion filter",
                    "grain": "organic film grain texture pattern, analog ISO noise, subtle photographic noise, celluloid texture, authentic film stock feel",
                    "leak": "vintage light leak effect, warm orange and red light streaks, film camera light leak, Lomography aesthetic, sun flare artifacts",
                    "scan": "CRT monitor scan lines, retro interlaced video display, horizontal line overlay, old TV screen effect, phosphor dot pattern",
                    "noir": "classic film noir black and white, dramatic chiaroscuro lighting, high contrast monochrome, deep shadows, 1940s crime thriller aesthetic",
                    "teal": "Hollywood teal and orange color grading, complementary color scheme, blockbuster movie look, Michael Bay color science, cinematic contrast",
                };
                const intensity = cs.vfx.intensity || 50;
                const intensityPrefix = intensity >= 80 ? "EXTREMELY STRONG " : intensity >= 60 ? "STRONG " : intensity <= 20 ? "SUBTLE " : "";

                cs.vfx.effects.forEach(effect => {
                    if (effect !== "off" && vfxMap[effect]) {
                        cinematicModifiers.push(`${intensityPrefix}${vfxMap[effect]}`);
                        cinematicFilters[`vfx_${effect}`] = String(intensity);
                    }
                });
            }

            // Style DNA - Fashion and clothing aesthetics
            if (cs.styleDna) {
                // Brand aesthetic
                if (cs.styleDna.brand && cs.styleDna.brand !== "auto") {
                    const brandMap: Record<string, string> = {
                        "streetwear": "streetwear urban fashion, casual street style, hypebeast aesthetic, Supreme/Off-White influence, urban contemporary look",
                        "luxury": "luxury high fashion aesthetic, premium designer look, Gucci/Louis Vuitton sophistication, elegant upscale style, haute couture influence",
                        "minimalist": "minimalist clean design, understated elegance, neutral tones, COS/Uniqlo aesthetic, less is more philosophy, refined simplicity",
                        "vintage": "vintage retro aesthetic, timeless classic style, thrift store finds, 70s/80s/90s inspired fashion, nostalgic wardrobe",
                        "techwear": "futuristic techwear aesthetic, functional technical fashion, Acronym/Nike ACG style, utility pockets, water-resistant materials, cyberpunk influence",
                    };
                    if (brandMap[cs.styleDna.brand]) {
                        cinematicModifiers.push(brandMap[cs.styleDna.brand]);
                        cinematicFilters["style_brand"] = cs.styleDna.brand;
                    }
                }

                // Layering style
                if (cs.styleDna.layering && cs.styleDna.layering !== "relaxed") {
                    const layeringMap: Record<string, string> = {
                        "minimal": "minimal layering, single layer outfit, clean simple clothing",
                        "light": "light layering, two layer outfit, casual everyday look",
                        "medium": "medium layering, three layers, well-coordinated outfit",
                        "heavy": "heavy layering, multiple layers, complex styled outfit, fashion-forward stacking",
                    };
                    if (layeringMap[cs.styleDna.layering]) {
                        cinematicModifiers.push(layeringMap[cs.styleDna.layering]);
                        cinematicFilters["style_layering"] = cs.styleDna.layering;
                    }
                }

                // Fit style
                if (cs.styleDna.fit && cs.styleDna.fit !== "regular") {
                    const fitMap: Record<string, string> = {
                        "oversized": "oversized baggy fit clothing, relaxed silhouette, loose comfortable garments, streetwear proportions",
                        "relaxed": "relaxed comfortable fit, casual everyday proportions, easy-going silhouette",
                        "slim": "slim fitted silhouette, tailored close-fitting clothes, modern slim cut",
                        "tailored": "bespoke tailored fit, precision-cut garments, custom-fitted clothing, sartorial excellence",
                    };
                    if (fitMap[cs.styleDna.fit]) {
                        cinematicModifiers.push(fitMap[cs.styleDna.fit]);
                        cinematicFilters["style_fit"] = cs.styleDna.fit;
                    }
                }

                // Outerwear
                if (cs.styleDna.outerwear) {
                    const outerwearMap: Record<string, string> = {
                        "jacket": "wearing stylish jacket, fashionable outerwear",
                        "coat": "wearing elegant coat, sophisticated overcoat",
                        "hoodie": "wearing hoodie, casual streetwear hoodie",
                        "blazer": "wearing tailored blazer, smart casual blazer",
                        "puffer": "wearing puffer jacket, quilted down jacket",
                        "leather": "wearing leather jacket, classic biker jacket",
                        "denim": "wearing denim jacket, jean jacket trucker style",
                        "bomber": "wearing bomber jacket, classic flight jacket",
                    };
                    if (outerwearMap[cs.styleDna.outerwear]) {
                        cinematicModifiers.push(outerwearMap[cs.styleDna.outerwear]);
                        cinematicFilters["style_outerwear"] = cs.styleDna.outerwear;
                    }
                }

                // Footwear
                if (cs.styleDna.footwear) {
                    const footwearMap: Record<string, string> = {
                        "sneakers": "wearing stylish sneakers, fashionable athletic shoes",
                        "boots": "wearing boots, stylish leather boots",
                        "loafers": "wearing loafers, elegant slip-on shoes",
                        "dress": "wearing dress shoes, formal oxford shoes",
                        "sandals": "wearing sandals, casual open footwear",
                        "high-tops": "wearing high-top sneakers, basketball style shoes",
                        "running": "wearing running shoes, athletic trainers",
                    };
                    if (footwearMap[cs.styleDna.footwear]) {
                        cinematicModifiers.push(footwearMap[cs.styleDna.footwear]);
                        cinematicFilters["style_footwear"] = cs.styleDna.footwear;
                    }
                }

                // Bottom/Pants
                if (cs.styleDna.bottom) {
                    const bottomMap: Record<string, string> = {
                        "jeans": "wearing denim jeans, classic blue jeans",
                        "chinos": "wearing chino pants, smart casual trousers",
                        "joggers": "wearing jogger pants, comfortable sweatpants",
                        "shorts": "wearing shorts, casual short pants",
                        "cargo": "wearing cargo pants, utility pocket pants",
                        "dress": "wearing dress pants, formal trousers",
                        "wide": "wearing wide-leg pants, relaxed fit trousers",
                    };
                    if (bottomMap[cs.styleDna.bottom]) {
                        cinematicModifiers.push(bottomMap[cs.styleDna.bottom]);
                        cinematicFilters["style_bottom"] = cs.styleDna.bottom;
                    }
                }
            }
        }

        // Merge cinematic filters with user filters
        const mergedFilters = { ...validated.filters, ...cinematicFilters };

        const compileInput = {
            profileId: validated.profileId,
            blueprintId: effectiveBlueprintId,
            filters: mergedFilters,
            seed: validated.seed || "",
            subject: validated.subject,
            context: validated.context,
            items: validated.items,
            environment: validated.environment,
            restrictions: validated.restrictions,
        };

        // Check if target platform needs Character Pack instead of LoRA syntax
        let characterPack = null;
        const loraSupportingPlatforms = ["flux", "sdxl", "stable_diffusion", "sd1.5", "sd_1.5"];
        const targetPlatform = validated.targetPlatform?.toLowerCase() || "";
        const platformSupportsLora = loraSupportingPlatforms.some(p => targetPlatform.includes(p));

        if (validated.loraVersionId && validated.targetPlatform && !platformSupportsLora) {
            // Generate Character Pack for non-LoRA platforms
            characterPack = compiler.generateCharacterPack(compileInput, validated.targetPlatform);
            // Clear LoRA so it doesn't inject syntax into the prompt
            compiler.setActiveLora(null);
        }

        let result = compiler.compile(compileInput);

        // Prepend cinematic modifiers to compiled prompt for stronger effect (VFX effects go first)
        if (cinematicModifiers.length > 0) {
            const cinematicPrefix = `[VISUAL STYLE: ${cinematicModifiers.join(", ")}]\n\n`;
            result = {
                ...result,
                compiledPrompt: `${cinematicPrefix}${result.compiledPrompt}`,
                metadata: {
                    ...result.metadata,
                    filterCount: result.metadata.filterCount + cinematicModifiers.length,
                },
            };
        }

        // Apply Gemini Gems optimizations for ultra-realistic UGC and facial biometrics
        let gemOptimization = null;
        if (validated.geminiGems && validated.geminiGems.length > 0) {
            gemOptimization = applyGeminiGemsOptimization(
                result.compiledPrompt,
                validated.geminiGems,
                validated.restrictions
            );
            result = {
                ...result,
                compiledPrompt: gemOptimization.enhancedPrompt,
                metadata: {
                    ...result.metadata,
                    filterCount: result.metadata.filterCount + validated.geminiGems.length,
                },
            };
        }

        const savedPrompt = await storage.createGeneratedPrompt({
            userId: userId || null,
            profileId: validated.profileId,
            blueprintId: validated.blueprintId || null,
            userBlueprintId: validated.userBlueprintId || null,
            seed: result.seed,
            input: {
                subject: validated.subject,
                context: validated.context,
                items: validated.items,
                environment: validated.environment,
                restrictions: validated.restrictions,
            },
            appliedFilters: validated.filters,
            compiledPrompt: result.compiledPrompt,
            metadata: result.metadata,
            score: result.score,
            warnings: result.warnings,
        });

        // Track usage for logged-in users (powers plan limits and usage dashboard)
        if (userId) {
            await storage.logUsage(userId, "prompt", {
                filterCount: Object.keys(validated.filters || {}).length,
                hasGeminiGems: Array.isArray(validated.geminiGems) && validated.geminiGems.length > 0,
            });
        } else {
            // Anonymous: keep IP rate-limit accounting
            await storage.incrementRateLimit(rateLimitKey);
        }

        // Include Character Pack if generated
        const response: Record<string, unknown> = { ...savedPrompt };
        if (characterPack) {
            response.characterPack = characterPack;
        }

        // Include Gemini Gems optimization info
        if (gemOptimization) {
            response.gemOptimization = {
                appliedGems: gemOptimization.appliedGems,
                negativePrompt: gemOptimization.negativePrompt,
                technicalRecommendations: gemOptimization.technicalRecommendations,
                qualityChecklist: gemOptimization.qualityChecklist,
            };
        }

        res.json(response);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ error: "Invalid request", details: error.errors });
        }
        console.error("Error generating prompt:", error);
        res.status(500).json({ error: "Failed to generate prompt" });
    }
});

router.post("/save-version", async (req, res) => {
    try {
        const { promptId } = req.body;

        if (!promptId) {
            return res.status(400).json({ error: "promptId is required" });
        }

        const prompt = await storage.getGeneratedPrompt(promptId);
        if (!prompt) {
            return res.status(404).json({ error: "Prompt not found" });
        }

        const existingVersions = await storage.getVersions(promptId);
        const nextVersion = existingVersions.length + 1;

        const version = await storage.createPromptVersion({
            generatedPromptId: promptId,
            version: nextVersion,
            compiledPrompt: prompt.compiledPrompt,
            metadata: prompt.metadata as Record<string, unknown>,
        });

        res.json(version);
    } catch (error) {
        console.error("Error saving version:", error);
        res.status(500).json({ error: "Failed to save version" });
    }
});

router.get("/prompt/:id", async (req, res) => {
    try {
        const prompt = await storage.getGeneratedPrompt(req.params.id);
        if (!prompt) {
            return res.status(404).json({ error: "Prompt not found" });
        }
        res.json(prompt);
    } catch (error) {
        console.error("Error fetching prompt:", error);
        res.status(500).json({ error: "Failed to fetch prompt" });
    }
});

router.get("/prompt/:id/versions", async (req, res) => {
    try {
        const versions = await storage.getVersions(req.params.id);
        res.json(versions);
    } catch (error) {
        console.error("Error fetching versions:", error);
        res.status(500).json({ error: "Failed to fetch versions" });
    }
});

export default router;
