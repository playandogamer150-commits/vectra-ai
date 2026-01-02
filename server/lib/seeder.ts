import { storage } from "../storage";
import { defaultProfiles, defaultBlueprints, defaultBlocks, defaultFilters, defaultBaseModels } from "../prompt-engine/presets";

const LEGACY_FILTER_KEYS = [
    "body_type",
    "pose_style",
    "clothing_state",
    "setting",
    "lighting",
    "skin_detail",
    "expression",
    "lighting_mood",
    "scene_setting",
    "Tipo de Corpo",
    "Estilo de Pose",
    "Estado da Roupa",
    "Cenário",
    "Iluminação",
    "Detalhe da Pele",
    "Expressão",
];

export const DEV_USER_ID = "dev_user";
const IS_PRODUCTION = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

export async function seedDatabase() {
    const deletedCount = await storage.deleteFiltersByKeys(LEGACY_FILTER_KEYS);
    if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} legacy filters from database`);
    }

    console.log("Checking database seeds...");

    // Profiles
    const existingProfiles = await storage.getProfiles();
    const existingProfileNames = new Set(existingProfiles.map(p => p.name));
    for (const profile of defaultProfiles) {
        if (!existingProfileNames.has(profile.name)) {
            await storage.createProfile(profile);
        }
    }

    // Blueprints
    const existingBlueprints = await storage.getBlueprints();
    const existingBlueprintNames = new Set(existingBlueprints.map(b => b.name));
    for (const blueprint of defaultBlueprints) {
        if (!existingBlueprintNames.has(blueprint.name)) {
            await storage.createBlueprint(blueprint);
        }
    }

    // Blocks
    const existingBlocks = await storage.getBlocks();
    const existingBlockKeys = new Set(existingBlocks.map(b => b.key));
    for (const block of defaultBlocks) {
        if (!existingBlockKeys.has(block.key) && block.key) {
            await storage.createBlock(block);
        }
    }

    // Filters
    const existingFilters = await storage.getFilters();
    const existingFilterKeys = new Set(existingFilters.map(f => f.key));
    for (const filter of defaultFilters) {
        if (!existingFilterKeys.has(filter.key)) {
            await storage.createFilter({
                key: filter.key,
                label: filter.label,
                schema: filter.schema,
                effect: filter.effect,
                isPremium: 0,
            });
        }
    }

    // Base Models
    const existingBaseModels = await storage.getBaseModels();
    const existingModelIds = new Set(existingBaseModels.map(m => (m as any).modelId || m.id));
    for (const baseModel of defaultBaseModels) {
        if (!existingModelIds.has((baseModel as any).modelId || (baseModel as any).id)) {
            await storage.createBaseModel(baseModel as any);
        }
    }

    // Ensure dev_user exists with admin rights for local development
    if (!IS_PRODUCTION) {
        const devUser = await storage.getAppUser(DEV_USER_ID);
        if (!devUser) {
            console.log("Creating local dev_user with admin rights...");
            await storage.createAppUserFromReplit(DEV_USER_ID, "Developer");
            await storage.updateAppUser(DEV_USER_ID, {
                isAdmin: 1,
                plan: "pro",
                // @ts-ignore - Handle potential schema mismatches for optional fields
                credits: 1000
            } as any);
        }
    }

    console.log("Database seed check complete!");
}
