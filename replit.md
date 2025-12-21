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
- `GET /api/profiles` - List LLM profiles
- `GET /api/blueprints` - List prompt blueprints
- `GET /api/filters` - List available filters
- `GET /api/history` - Get generation history
- `POST /api/generate` - Generate a prompt
- `POST /api/save-version` - Save a prompt version
- `GET /api/prompt/:id` - Get specific prompt
- `GET /api/prompt/:id/versions` - Get prompt versions

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

## Recent Changes
- 2024-12-21: Initial MVP release with full prompt generation workflow
