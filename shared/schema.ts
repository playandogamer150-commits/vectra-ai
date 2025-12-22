import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, pgEnum, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userPlanEnum = pgEnum("user_plan", ["free", "pro"]);
export const blockTypeEnum = pgEnum("block_type", ["style", "camera", "layout", "constraint", "postfx", "subject"]);
export const loraJobStatusEnum = pgEnum("lora_job_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const loraProviderEnum = pgEnum("lora_provider", ["webhook_worker", "replicate", "runpod"]);

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

export const loraModels = pgTable("lora_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  consentGiven: integer("consent_given").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loraDatasets = pgTable("lora_datasets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  loraModelId: varchar("lora_model_id").notNull(),
  datasetUrl: text("dataset_url"),
  datasetHash: text("dataset_hash"),
  imageCount: integer("image_count").default(0).notNull(),
  qualityReport: jsonb("quality_report").$type<{
    valid: boolean;
    imageCount: number;
    minResolution: { width: number; height: number };
    duplicatesFound: number;
    varietyScore: number;
    issues: string[];
    score: number;
  }>(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loraDatasetItems = pgTable("lora_dataset_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  datasetId: varchar("dataset_id").notNull(),
  storageKey: text("storage_key").notNull(),
  sha256: text("sha256").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  filename: text("filename"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loraVersions = pgTable("lora_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loraModelId: varchar("lora_model_id").notNull(),
  baseModel: text("base_model").notNull(),
  params: jsonb("params").$type<{
    steps: number;
    learningRate: number;
    resolution: number;
    rank: number;
    networkAlpha?: number;
  }>().notNull(),
  datasetHash: text("dataset_hash").notNull(),
  artifactUrl: text("artifact_url"),
  checksum: text("checksum"),
  previewImages: jsonb("preview_images").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loraJobs = pgTable("lora_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  loraVersionId: varchar("lora_version_id").notNull(),
  provider: loraProviderEnum("provider").default("webhook_worker").notNull(),
  status: loraJobStatusEnum("status").default("pending").notNull(),
  externalJobId: text("external_job_id"),
  logsUrl: text("logs_url"),
  error: text("error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userLoraActive = pgTable("user_lora_active", {
  userId: varchar("user_id").primaryKey(),
  loraModelId: varchar("lora_model_id").notNull(),
  loraVersionId: varchar("lora_version_id").notNull(),
  weight: real("weight").default(0.8).notNull(),
  targetPlatform: text("target_platform"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const baseModels = pgTable("base_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  loraFormat: text("lora_format").notNull(),
  defaultResolution: integer("default_resolution").default(1024).notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Custom Blueprints
export const userBlueprints = pgTable("user_blueprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  compatibleProfiles: jsonb("compatible_profiles").$type<string[]>().default([]),
  version: integer("version").default(1).notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userBlueprintVersions = pgTable("user_blueprint_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blueprintId: varchar("blueprint_id").notNull(),
  version: integer("version").notNull(),
  blocks: jsonb("blocks").$type<string[]>().notNull(),
  constraints: jsonb("constraints").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  generatedPrompts: many(generatedPrompts),
  loraModels: many(loraModels),
  activeLora: one(userLoraActive, { fields: [users.id], references: [userLoraActive.userId] }),
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

export const loraModelsRelations = relations(loraModels, ({ one, many }) => ({
  user: one(users, { fields: [loraModels.userId], references: [users.id] }),
  datasets: many(loraDatasets),
  versions: many(loraVersions),
}));

export const loraDatasetsRelations = relations(loraDatasets, ({ one, many }) => ({
  user: one(users, { fields: [loraDatasets.userId], references: [users.id] }),
  loraModel: one(loraModels, { fields: [loraDatasets.loraModelId], references: [loraModels.id] }),
  items: many(loraDatasetItems),
}));

export const loraDatasetItemsRelations = relations(loraDatasetItems, ({ one }) => ({
  dataset: one(loraDatasets, { fields: [loraDatasetItems.datasetId], references: [loraDatasets.id] }),
}));

export const loraVersionsRelations = relations(loraVersions, ({ one, many }) => ({
  loraModel: one(loraModels, { fields: [loraVersions.loraModelId], references: [loraModels.id] }),
  jobs: many(loraJobs),
}));

export const loraJobsRelations = relations(loraJobs, ({ one }) => ({
  loraVersion: one(loraVersions, { fields: [loraJobs.loraVersionId], references: [loraVersions.id] }),
}));

export const userLoraActiveRelations = relations(userLoraActive, ({ one }) => ({
  user: one(users, { fields: [userLoraActive.userId], references: [users.id] }),
  loraVersion: one(loraVersions, { fields: [userLoraActive.loraVersionId], references: [loraVersions.id] }),
}));

export const userBlueprintsRelations = relations(userBlueprints, ({ one, many }) => ({
  user: one(users, { fields: [userBlueprints.userId], references: [users.id] }),
  versions: many(userBlueprintVersions),
}));

export const userBlueprintVersionsRelations = relations(userBlueprintVersions, ({ one }) => ({
  blueprint: one(userBlueprints, { fields: [userBlueprintVersions.blueprintId], references: [userBlueprints.id] }),
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
  blueprintId: z.string().optional(),
  userBlueprintId: z.string().optional(),
  filters: z.record(z.string(), z.string()).optional().default({}),
  seed: z.string().optional(),
  subject: z.string().optional().default(""),
  context: z.string().optional().default(""),
  items: z.string().optional().default(""),
  environment: z.string().optional().default(""),
  restrictions: z.string().optional().default(""),
  loraVersionId: z.string().optional(),
  loraWeight: z.number().min(0).max(2).optional().default(1),
  targetPlatform: z.string().optional(),
}).refine(data => data.blueprintId || data.userBlueprintId, {
  message: "Either blueprintId or userBlueprintId is required",
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

export const insertLoraModelSchema = createInsertSchema(loraModels).omit({
  id: true,
  createdAt: true,
});

export const insertLoraDatasetSchema = createInsertSchema(loraDatasets).omit({
  id: true,
  createdAt: true,
});

export const insertLoraVersionSchema = createInsertSchema(loraVersions).omit({
  id: true,
  createdAt: true,
});

export const insertLoraJobSchema = createInsertSchema(loraJobs).omit({
  id: true,
  createdAt: true,
});

export const insertBaseModelSchema = createInsertSchema(baseModels).omit({
  id: true,
  createdAt: true,
});

export const createLoraModelRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  consent: z.boolean().refine(val => val === true, {
    message: "You must confirm that you have rights to use these images",
  }),
});

export const initDatasetRequestSchema = z.object({
  loraModelId: z.string().min(1),
  imageCount: z.number().min(15).max(50),
  filenames: z.array(z.string()).min(15).max(50),
});

export const commitDatasetRequestSchema = z.object({
  datasetId: z.string().min(1),
  items: z.array(z.object({
    storageKey: z.string().min(1),
    sha256: z.string().min(1),
    width: z.number().min(256).max(4096),
    height: z.number().min(256).max(4096),
    filename: z.string().optional(),
  })).min(15).max(50),
});

export const validateDatasetRequestSchema = z.object({
  datasetId: z.string().min(1),
});

export const createLoraJobRequestSchema = z.object({
  loraModelId: z.string().min(1),
  datasetId: z.string().min(1),
  baseModel: z.string().min(1),
  params: z.object({
    steps: z.number().min(100).max(5000).default(1000),
    learningRate: z.number().min(0.00001).max(0.01).default(0.0001),
    resolution: z.number().min(512).max(2048).default(1024),
    rank: z.number().min(4).max(128).default(32),
    networkAlpha: z.number().optional(),
  }),
});

export const webhookPayloadSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(["processing", "completed", "failed"]),
  artifactUrl: z.string().url().optional(),
  checksum: z.string().optional(),
  logsUrl: z.string().url().optional(),
  error: z.string().optional(),
  previewImages: z.array(z.string().url()).optional(),
});

export const activateLoraRequestSchema = z.object({
  loraVersionId: z.string().min(1),
  weight: z.number().min(0).max(1.5).default(0.8),
  targetPlatform: z.string().optional(),
});

export type LoraModel = typeof loraModels.$inferSelect;
export type InsertLoraModel = z.infer<typeof insertLoraModelSchema>;
export type LoraDataset = typeof loraDatasets.$inferSelect;
export type InsertLoraDataset = z.infer<typeof insertLoraDatasetSchema>;
export type LoraVersion = typeof loraVersions.$inferSelect;
export type InsertLoraVersion = z.infer<typeof insertLoraVersionSchema>;
export type LoraJob = typeof loraJobs.$inferSelect;
export type InsertLoraJob = z.infer<typeof insertLoraJobSchema>;
export type UserLoraActive = typeof userLoraActive.$inferSelect;
export type BaseModel = typeof baseModels.$inferSelect;
export type InsertBaseModel = z.infer<typeof insertBaseModelSchema>;
export type LoraDatasetItem = typeof loraDatasetItems.$inferSelect;
export type CreateLoraModelRequest = z.infer<typeof createLoraModelRequestSchema>;
export type InitDatasetRequest = z.infer<typeof initDatasetRequestSchema>;
export type CommitDatasetRequest = z.infer<typeof commitDatasetRequestSchema>;
export type CreateLoraJobRequest = z.infer<typeof createLoraJobRequestSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
export type ActivateLoraRequest = z.infer<typeof activateLoraRequestSchema>;

// User Blueprint schemas
export const insertUserBlueprintSchema = createInsertSchema(userBlueprints).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserBlueprintVersionSchema = createInsertSchema(userBlueprintVersions).omit({
  id: true,
  createdAt: true,
});

export const createUserBlueprintRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  blocks: z.array(z.string()).min(1),
  constraints: z.record(z.string(), z.unknown()).default({}),
  compatibleProfiles: z.array(z.string()).default([]),
});

export const updateUserBlueprintRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  blocks: z.array(z.string()).min(1).optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  compatibleProfiles: z.array(z.string()).optional(),
});

export type UserBlueprint = typeof userBlueprints.$inferSelect;
export type InsertUserBlueprint = z.infer<typeof insertUserBlueprintSchema>;
export type UserBlueprintVersion = typeof userBlueprintVersions.$inferSelect;
export type InsertUserBlueprintVersion = z.infer<typeof insertUserBlueprintVersionSchema>;
export type CreateUserBlueprintRequest = z.infer<typeof createUserBlueprintRequestSchema>;
export type UpdateUserBlueprintRequest = z.infer<typeof updateUserBlueprintRequestSchema>;
