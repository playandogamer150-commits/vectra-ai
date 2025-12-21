import { 
  users, llmProfiles, promptBlueprints, promptBlocks, filters, 
  generatedPrompts, promptVersions, rateLimits,
  type User, type InsertUser, type LlmProfile, type InsertLlmProfile,
  type PromptBlueprint, type InsertBlueprint, type PromptBlock, type InsertBlock,
  type Filter, type InsertFilter, type GeneratedPrompt, type InsertGeneratedPrompt,
  type PromptVersion, type InsertPromptVersion
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
