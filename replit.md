# PromptForge - Infinite Prompt Generator

## Overview
PromptForge is a professional prompt engineering studio with blueprints, filters, and reproducible seeds for generating production-grade prompts for any LLM.

## Tech Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Tailwind CSS + shadcn/ui components
- **Fonts**: Inter (UI), JetBrains Mono (code/technical)

## Project Structure
```
├── client/src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # shadcn components
│   │   ├── header.tsx  # Navigation header
│   │   └── theme-provider.tsx
│   ├── pages/          # Route pages
│   │   ├── landing.tsx # Home page with hero/features/pricing
│   │   ├── studio.tsx  # Main prompt generation workspace
│   │   ├── library.tsx # Blueprint browser
│   │   └── history.tsx # Generation history
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities
│   └── App.tsx         # Main router
├── server/
│   ├── prompt-engine/  # Core engine
│   │   ├── compiler.ts # Prompt compilation logic
│   │   ├── presets.ts  # Default profiles, blueprints, blocks, filters
│   │   ├── types.ts    # TypeScript interfaces
│   │   └── system-prompt.ts
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Database operations
│   └── db.ts           # Database connection
├── shared/
│   └── schema.ts       # Drizzle schema + Zod validation
└── design_guidelines.md
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `ADMIN_OVERRIDE` - Set to "true" to bypass premium limits (development)

## API Endpoints

### Prompt Generation
- `GET /api/profiles` - List LLM profiles
- `GET /api/blueprints` - List prompt blueprints
- `GET /api/filters` - List available filters
- `GET /api/history` - Get generation history
- `POST /api/generate` - Generate a prompt
- `POST /api/save-version` - Save a prompt version
- `GET /api/prompt/:id` - Get specific prompt
- `GET /api/prompt/:id/versions` - Get prompt versions

### LoRA Training (Pro-only)
- `GET /api/lora/models` - List user's LoRA models
- `GET /api/lora/models/:id` - Get LoRA model with datasets and versions
- `POST /api/lora/models` - Create new LoRA model
- `POST /api/lora/dataset/init` - Initialize dataset upload (returns presigned URL)
- `POST /api/lora/dataset/validate` - Validate uploaded dataset
- `POST /api/lora/jobs` - Start LoRA training job
- `GET /api/lora/jobs/:id` - Get training job status
- `POST /api/lora/webhook` - GPU worker webhook callback
- `POST /api/lora/activate` - Activate a trained LoRA for prompt generation
- `GET /api/lora/active` - Get currently active LoRA
- `DELETE /api/lora/active` - Deactivate LoRA
- `GET /api/lora/base-models` - List available base models

## Core Concepts

### LLM Profiles
Pre-configured settings for different LLMs (Midjourney, DALL-E, Stable Diffusion, Flux Pro) with base prompts, preferred block ordering, and output limits.

### Blueprints
Template collections defining prompt structure for specific use cases:
- Minecraft Style Food
- Analog Collage Refrigerator
- Gothic Car Wrap
- Weightless Phone Photo
- Lookbook 9-Frame
- CCTV Detection
- MS Paint Screen
- Character Creator Screen

### Filters
Adjustable parameters that modify prompt output:
- aesthetic_intensity (low/medium/high/extreme)
- ugc_realism (phone/ugc/pro/cinematic)
- layout_entropy (strict/balanced/loose)
- camera_bias (iphone/cctv/dslr/camcorder_2000s)
- temporal_style (y2k/2000s_jp_tv/modern/retro_future)
- prompt_length (short/normal/long)

### Seeds
Deterministic seeds enable reproducible prompt generation.

## Premium Gating (MVP)
- Free tier: 3 generations/day, max 3 filters
- Pro tier: Unlimited (via ADMIN_OVERRIDE=true)

## Running Locally
```bash
npm run dev          # Start development server
npm run db:push      # Push schema changes to database
```

## Adding New Content

### Adding an LLM Profile
Add to `server/prompt-engine/presets.ts`:
```typescript
{
  name: "Profile Name",
  basePrompt: "Base instruction...",
  preferredOrder: ["subject", "style", ...],
  forbiddenPatterns: [],
  maxLength: 2000,
  capabilities: ["photorealistic", "artistic"]
}
```

### Adding a Blueprint
Add to `server/prompt-engine/presets.ts`:
```typescript
{
  name: "Blueprint Name",
  category: "aesthetic",
  description: "Description...",
  blocks: ["block_key1", "block_key2"],
  constraints: ["constraint1"]
}
```

### Adding a Filter
Add to `server/prompt-engine/presets.ts`:
```typescript
{
  key: "filter_key",
  label: "Display Name",
  schema: { type: "select", options: ["opt1", "opt2"] },
  effect: { opt1: "effect text", opt2: "other effect" }
}
```

## LoRA Training Infrastructure

### Database Tables
- `lora_models` - User's LoRA model projects
- `lora_datasets` - Training datasets with quality reports
- `lora_versions` - Trained versions with params and artifacts
- `lora_jobs` - Training job status and progress
- `user_lora_active` - Currently active LoRA per user
- `base_models` - Supported base models (SDXL, Flux, SD1.5)

### Architecture
- **Storage Abstraction**: `server/lib/storage-provider.ts` supports S3/R2/local
- **HMAC Security**: `server/lib/hmac.ts` for webhook authentication
- **Rate Limiting**: `server/lib/rate-limiter.ts` (5 jobs/hr, 100 webhooks/min, 10 uploads/hr)
- **Compiler Integration**: LoRA blocks are injected via `compiler.setActiveLora()`

### GPU Worker Contract
Workers receive signed payloads with:
- `jobId`: Unique job identifier
- `datasetUrl`: Presigned URL for training images
- `params`: Training parameters (steps, learning rate, resolution, rank)
- `callbackUrl`: Webhook URL for progress updates

Workers must sign responses with HMAC and include `X-Signature` + `X-Timestamp` headers.

## Recent Changes
- 2024-12-22: Integrated trained LoRA models into Prompt Studio with selector UI and weight slider (0-2)
- 2024-12-22: Added `/api/lora/trained` endpoint to fetch all trained LoRA versions
- 2024-12-22: Extended generate endpoint to accept `loraVersionId` and `loraWeight` parameters
- 2024-12-22: Added 400 error responses for invalid/untrained LoRA versions
- 2024-12-22: Added Character Pack generation for non-LoRA platforms (Sora/Veo/Grok)
- 2024-12-22: Implemented profileSupportsLoraInjection() for conditional LoRA syntax injection
- 2024-12-22: Added dual-dropdown architecture: Target Platform (for export) vs Trainable Base Model (for training)
- 2024-12-22: Added lora_dataset_items table for individual file tracking with SHA256 hashes
- 2024-12-22: Added real dataset upload workflow: init → presigned URLs → commit → validate
- 2024-12-22: Added Portuguese translations for new LoRA Studio fields
- 2024-12-21: Added LoRA training infrastructure (routes, storage, compiler integration)
- 2024-12-21: Initial MVP release with full prompt generation workflow
