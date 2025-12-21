import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userPlanEnum = pgEnum("user_plan", ["free", "pro"]);
export const blockTypeEnum = pgEnum("block_type", ["style", "camera", "layout", "constraint", "postfx", "subject"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  plan: userPlanEnum("plan").default("free").notNull(),
  generationsToday: integer("generations_today").default(0).notNull(),
  lastGenerationDate: text("last_generation_date"),
});

export const llmProfiles = pgTable("llm_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  basePrompt: text("base_prompt").notNull(),
  preferredOrder: jsonb("preferred_order").$type<string[]>().default([]),
  forbiddenPatterns: jsonb("forbidden_patterns").$type<string[]>().default([]),
  maxLength: integer("max_length").default(2000).notNull(),
  capabilities: jsonb("capabilities").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptBlueprints = pgTable("prompt_blueprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  blocks: jsonb("blocks").$type<string[]>().notNull(),
  constraints: jsonb("constraints").$type<string[]>().default([]),
  previewDescription: text("preview_description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptBlocks = pgTable("prompt_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  template: text("template").notNull(),
  type: blockTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const filters = pgTable("filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  schema: jsonb("schema").$type<{ type: string; options?: string[]; min?: number; max?: number }>().notNull(),
  effect: jsonb("effect").$type<Record<string, string>>().notNull(),
  isPremium: integer("is_premium").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedPrompts = pgTable("generated_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  profileId: varchar("profile_id").notNull(),
  blueprintId: varchar("blueprint_id").notNull(),
  seed: text("seed").notNull(),
  input: jsonb("input").$type<{
    subject?: string;
    context?: string;
    items?: string;
    environment?: string;
    restrictions?: string;
  }>().notNull(),
  appliedFilters: jsonb("applied_filters").$type<Record<string, string>>().default({}),
  compiledPrompt: text("compiled_prompt").notNull(),
  metadata: jsonb("metadata").$type<{
    profileName: string;
    blueprintName: string;
    blockCount: number;
    filterCount: number;
  }>().notNull(),
  score: integer("score").notNull(),
  warnings: jsonb("warnings").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptVersions = pgTable("prompt_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generatedPromptId: varchar("generated_prompt_id").notNull(),
  version: integer("version").notNull(),
  compiledPrompt: text("compiled_prompt").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").default(0).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  generatedPrompts: many(generatedPrompts),
}));

export const generatedPromptsRelations = relations(generatedPrompts, ({ one, many }) => ({
  user: one(users, { fields: [generatedPrompts.userId], references: [users.id] }),
  profile: one(llmProfiles, { fields: [generatedPrompts.profileId], references: [llmProfiles.id] }),
  blueprint: one(promptBlueprints, { fields: [generatedPrompts.blueprintId], references: [promptBlueprints.id] }),
  versions: many(promptVersions),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one }) => ({
  generatedPrompt: one(generatedPrompts, { fields: [promptVersions.generatedPromptId], references: [generatedPrompts.id] }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertLlmProfileSchema = createInsertSchema(llmProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertBlueprintSchema = createInsertSchema(promptBlueprints).omit({
  id: true,
  createdAt: true,
});

export const insertBlockSchema = createInsertSchema(promptBlocks).omit({
  id: true,
  createdAt: true,
});

export const insertFilterSchema = createInsertSchema(filters).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedPromptSchema = createInsertSchema(generatedPrompts).omit({
  id: true,
  createdAt: true,
});

export const insertPromptVersionSchema = createInsertSchema(promptVersions).omit({
  id: true,
  createdAt: true,
});

export const generateRequestSchema = z.object({
  profileId: z.string().min(1),
  blueprintId: z.string().min(1),
  filters: z.record(z.string(), z.string()).optional().default({}),
  seed: z.string().optional(),
  subject: z.string().optional().default(""),
  context: z.string().optional().default(""),
  items: z.string().optional().default(""),
  environment: z.string().optional().default(""),
  restrictions: z.string().optional().default(""),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LlmProfile = typeof llmProfiles.$inferSelect;
export type InsertLlmProfile = z.infer<typeof insertLlmProfileSchema>;
export type PromptBlueprint = typeof promptBlueprints.$inferSelect;
export type InsertBlueprint = z.infer<typeof insertBlueprintSchema>;
export type PromptBlock = typeof promptBlocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type Filter = typeof filters.$inferSelect;
export type InsertFilter = z.infer<typeof insertFilterSchema>;
export type GeneratedPrompt = typeof generatedPrompts.$inferSelect;
export type InsertGeneratedPrompt = z.infer<typeof insertGeneratedPromptSchema>;
export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = z.infer<typeof insertPromptVersionSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
