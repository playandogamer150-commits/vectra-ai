import { 
  users, llmProfiles, promptBlueprints, promptBlocks, filters, 
  generatedPrompts, promptVersions, rateLimits,
  loraModels, loraDatasets, loraDatasetItems, loraVersions, loraJobs, userLoraActive, baseModels,
  type User, type InsertUser, type LlmProfile, type InsertLlmProfile,
  type PromptBlueprint, type InsertBlueprint, type PromptBlock, type InsertBlock,
  type Filter, type InsertFilter, type GeneratedPrompt, type InsertGeneratedPrompt,
  type PromptVersion, type InsertPromptVersion,
  type LoraModel, type InsertLoraModel, type LoraDataset, type InsertLoraDataset,
  type LoraVersion, type InsertLoraVersion, type LoraJob, type InsertLoraJob,
  type UserLoraActive, type BaseModel, type InsertBaseModel, type LoraDatasetItem
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProfiles(): Promise<LlmProfile[]>;
  getProfile(id: string): Promise<LlmProfile | undefined>;
  createProfile(profile: InsertLlmProfile): Promise<LlmProfile>;
  
  getBlueprints(): Promise<PromptBlueprint[]>;
  getBlueprint(id: string): Promise<PromptBlueprint | undefined>;
  createBlueprint(blueprint: InsertBlueprint): Promise<PromptBlueprint>;
  
  getBlocks(): Promise<PromptBlock[]>;
  getBlock(key: string): Promise<PromptBlock | undefined>;
  createBlock(block: InsertBlock): Promise<PromptBlock>;
  
  getFilters(): Promise<Filter[]>;
  getFilter(key: string): Promise<Filter | undefined>;
  createFilter(filter: InsertFilter): Promise<Filter>;
  
  getHistory(userId?: string): Promise<GeneratedPrompt[]>;
  getGeneratedPrompt(id: string): Promise<GeneratedPrompt | undefined>;
  createGeneratedPrompt(prompt: InsertGeneratedPrompt): Promise<GeneratedPrompt>;
  
  createPromptVersion(version: InsertPromptVersion): Promise<PromptVersion>;
  getVersions(promptId: string): Promise<PromptVersion[]>;
  
  checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean>;
  incrementRateLimit(key: string): Promise<void>;
  
  getLoraModels(userId: string): Promise<LoraModel[]>;
  getLoraModel(id: string): Promise<LoraModel | undefined>;
  createLoraModel(model: InsertLoraModel): Promise<LoraModel>;
  
  getLoraDatasets(loraModelId: string): Promise<LoraDataset[]>;
  getLoraDataset(id: string): Promise<LoraDataset | undefined>;
  createLoraDataset(dataset: InsertLoraDataset): Promise<LoraDataset>;
  updateLoraDataset(id: string, data: Partial<InsertLoraDataset>): Promise<LoraDataset | undefined>;
  
  getLoraVersions(loraModelId: string): Promise<LoraVersion[]>;
  getLoraVersion(id: string): Promise<LoraVersion | undefined>;
  createLoraVersion(version: InsertLoraVersion): Promise<LoraVersion>;
  updateLoraVersion(id: string, data: Partial<InsertLoraVersion>): Promise<LoraVersion | undefined>;
  
  getLoraJobs(loraVersionId: string): Promise<LoraJob[]>;
  getLoraJob(id: string): Promise<LoraJob | undefined>;
  createLoraJob(job: InsertLoraJob): Promise<LoraJob>;
  updateLoraJob(id: string, data: Partial<InsertLoraJob>): Promise<LoraJob | undefined>;
  
  getUserActiveLora(userId: string): Promise<UserLoraActive | undefined>;
  setUserActiveLora(userId: string, loraModelId: string, loraVersionId: string, weight: number, targetPlatform?: string): Promise<UserLoraActive>;
  clearUserActiveLora(userId: string): Promise<void>;
  
  getDatasetItems(datasetId: string): Promise<LoraDatasetItem[]>;
  createDatasetItem(item: { datasetId: string; storageKey: string; sha256: string; width: number; height: number; filename?: string }): Promise<LoraDatasetItem>;
  createDatasetItems(items: Array<{ datasetId: string; storageKey: string; sha256: string; width: number; height: number; filename?: string }>): Promise<LoraDatasetItem[]>;
  
  getBaseModels(): Promise<BaseModel[]>;
  createBaseModel(model: InsertBaseModel): Promise<BaseModel>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProfiles(): Promise<LlmProfile[]> {
    return db.select().from(llmProfiles);
  }

  async getProfile(id: string): Promise<LlmProfile | undefined> {
    const [profile] = await db.select().from(llmProfiles).where(eq(llmProfiles.id, id));
    return profile || undefined;
  }

  async createProfile(profile: InsertLlmProfile): Promise<LlmProfile> {
    const [created] = await db.insert(llmProfiles).values(profile).returning();
    return created;
  }

  async getBlueprints(): Promise<PromptBlueprint[]> {
    return db.select().from(promptBlueprints);
  }

  async getBlueprint(id: string): Promise<PromptBlueprint | undefined> {
    const [blueprint] = await db.select().from(promptBlueprints).where(eq(promptBlueprints.id, id));
    return blueprint || undefined;
  }

  async createBlueprint(blueprint: InsertBlueprint): Promise<PromptBlueprint> {
    const [created] = await db.insert(promptBlueprints).values(blueprint).returning();
    return created;
  }

  async getBlocks(): Promise<PromptBlock[]> {
    return db.select().from(promptBlocks);
  }

  async getBlock(key: string): Promise<PromptBlock | undefined> {
    const [block] = await db.select().from(promptBlocks).where(eq(promptBlocks.key, key));
    return block || undefined;
  }

  async createBlock(block: InsertBlock): Promise<PromptBlock> {
    const [created] = await db.insert(promptBlocks).values(block).returning();
    return created;
  }

  async getFilters(): Promise<Filter[]> {
    return db.select().from(filters);
  }

  async getFilter(key: string): Promise<Filter | undefined> {
    const [filter] = await db.select().from(filters).where(eq(filters.key, key));
    return filter || undefined;
  }

  async createFilter(filter: InsertFilter): Promise<Filter> {
    const [created] = await db.insert(filters).values(filter).returning();
    return created;
  }

  async getHistory(userId?: string): Promise<GeneratedPrompt[]> {
    if (userId) {
      return db.select().from(generatedPrompts)
        .where(eq(generatedPrompts.userId, userId))
        .orderBy(desc(generatedPrompts.createdAt))
        .limit(50);
    }
    return db.select().from(generatedPrompts)
      .orderBy(desc(generatedPrompts.createdAt))
      .limit(50);
  }

  async getGeneratedPrompt(id: string): Promise<GeneratedPrompt | undefined> {
    const [prompt] = await db.select().from(generatedPrompts).where(eq(generatedPrompts.id, id));
    return prompt || undefined;
  }

  async createGeneratedPrompt(prompt: InsertGeneratedPrompt): Promise<GeneratedPrompt> {
    const [created] = await db.insert(generatedPrompts).values(prompt).returning();
    return created;
  }

  async createPromptVersion(version: InsertPromptVersion): Promise<PromptVersion> {
    const [created] = await db.insert(promptVersions).values(version).returning();
    return created;
  }

  async getVersions(promptId: string): Promise<PromptVersion[]> {
    return db.select().from(promptVersions)
      .where(eq(promptVersions.generatedPromptId, promptId))
      .orderBy(desc(promptVersions.version));
  }

  async checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const [record] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
    
    if (!record) {
      return true;
    }
    
    const windowStart = new Date(record.windowStart);
    const now = new Date();
    
    if (now.getTime() - windowStart.getTime() > windowMs) {
      await db.update(rateLimits)
        .set({ windowStart: now, count: 0 })
        .where(eq(rateLimits.key, key));
      return true;
    }
    
    return record.count < limit;
  }

  async incrementRateLimit(key: string): Promise<void> {
    const [existing] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
    
    if (existing) {
      await db.update(rateLimits)
        .set({ count: existing.count + 1 })
        .where(eq(rateLimits.key, key));
    } else {
      await db.insert(rateLimits).values({
        key,
        windowStart: new Date(),
        count: 1,
      });
    }
  }

  async getLoraModels(userId: string): Promise<LoraModel[]> {
    return db.select().from(loraModels)
      .where(eq(loraModels.userId, userId))
      .orderBy(desc(loraModels.createdAt));
  }

  async getLoraModel(id: string): Promise<LoraModel | undefined> {
    const [model] = await db.select().from(loraModels).where(eq(loraModels.id, id));
    return model || undefined;
  }

  async createLoraModel(model: InsertLoraModel): Promise<LoraModel> {
    const [created] = await db.insert(loraModels).values(model).returning();
    return created;
  }

  async getLoraDatasets(loraModelId: string): Promise<LoraDataset[]> {
    return db.select().from(loraDatasets)
      .where(eq(loraDatasets.loraModelId, loraModelId))
      .orderBy(desc(loraDatasets.createdAt));
  }

  async getLoraDataset(id: string): Promise<LoraDataset | undefined> {
    const [dataset] = await db.select().from(loraDatasets).where(eq(loraDatasets.id, id));
    return dataset || undefined;
  }

  async createLoraDataset(dataset: InsertLoraDataset): Promise<LoraDataset> {
    const [created] = await db.insert(loraDatasets).values(dataset).returning();
    return created;
  }

  async updateLoraDataset(id: string, data: Partial<InsertLoraDataset>): Promise<LoraDataset | undefined> {
    const [updated] = await db.update(loraDatasets)
      .set(data)
      .where(eq(loraDatasets.id, id))
      .returning();
    return updated || undefined;
  }

  async getLoraVersions(loraModelId: string): Promise<LoraVersion[]> {
    return db.select().from(loraVersions)
      .where(eq(loraVersions.loraModelId, loraModelId))
      .orderBy(desc(loraVersions.createdAt));
  }

  async getLoraVersion(id: string): Promise<LoraVersion | undefined> {
    const [version] = await db.select().from(loraVersions).where(eq(loraVersions.id, id));
    return version || undefined;
  }

  async createLoraVersion(version: InsertLoraVersion): Promise<LoraVersion> {
    const [created] = await db.insert(loraVersions).values(version).returning();
    return created;
  }

  async updateLoraVersion(id: string, data: Partial<InsertLoraVersion>): Promise<LoraVersion | undefined> {
    const [updated] = await db.update(loraVersions)
      .set(data)
      .where(eq(loraVersions.id, id))
      .returning();
    return updated || undefined;
  }

  async getLoraJobs(loraVersionId: string): Promise<LoraJob[]> {
    return db.select().from(loraJobs)
      .where(eq(loraJobs.loraVersionId, loraVersionId))
      .orderBy(desc(loraJobs.createdAt));
  }

  async getLoraJob(id: string): Promise<LoraJob | undefined> {
    const [job] = await db.select().from(loraJobs).where(eq(loraJobs.id, id));
    return job || undefined;
  }

  async createLoraJob(job: InsertLoraJob): Promise<LoraJob> {
    const [created] = await db.insert(loraJobs).values(job).returning();
    return created;
  }

  async updateLoraJob(id: string, data: Partial<InsertLoraJob>): Promise<LoraJob | undefined> {
    const [updated] = await db.update(loraJobs)
      .set(data)
      .where(eq(loraJobs.id, id))
      .returning();
    return updated || undefined;
  }

  async getUserActiveLora(userId: string): Promise<UserLoraActive | undefined> {
    const [active] = await db.select().from(userLoraActive).where(eq(userLoraActive.userId, userId));
    return active || undefined;
  }

  async setUserActiveLora(userId: string, loraModelId: string, loraVersionId: string, weight: number, targetPlatform?: string): Promise<UserLoraActive> {
    const existing = await this.getUserActiveLora(userId);
    
    if (existing) {
      const [updated] = await db.update(userLoraActive)
        .set({ loraModelId, loraVersionId, weight, targetPlatform: targetPlatform || null, updatedAt: new Date() })
        .where(eq(userLoraActive.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userLoraActive)
        .values({ userId, loraModelId, loraVersionId, weight, targetPlatform: targetPlatform || null })
        .returning();
      return created;
    }
  }

  async clearUserActiveLora(userId: string): Promise<void> {
    await db.delete(userLoraActive).where(eq(userLoraActive.userId, userId));
  }

  async getDatasetItems(datasetId: string): Promise<LoraDatasetItem[]> {
    return db.select().from(loraDatasetItems).where(eq(loraDatasetItems.datasetId, datasetId));
  }

  async createDatasetItem(item: { datasetId: string; storageKey: string; sha256: string; width: number; height: number; filename?: string }): Promise<LoraDatasetItem> {
    const [created] = await db.insert(loraDatasetItems).values(item).returning();
    return created;
  }

  async createDatasetItems(items: Array<{ datasetId: string; storageKey: string; sha256: string; width: number; height: number; filename?: string }>): Promise<LoraDatasetItem[]> {
    if (items.length === 0) return [];
    return db.insert(loraDatasetItems).values(items).returning();
  }

  async getBaseModels(): Promise<BaseModel[]> {
    return db.select().from(baseModels).where(eq(baseModels.isActive, 1));
  }

  async createBaseModel(model: InsertBaseModel): Promise<BaseModel> {
    const [created] = await db.insert(baseModels).values(model).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
