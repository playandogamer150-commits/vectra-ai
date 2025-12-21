# PromptForge Design Guidelines

## Design Approach

**Selected Approach:** Design System (Linear-inspired technical workspace)

**Justification:** PromptForge is a professional productivity tool requiring clarity, efficiency, and sophisticated UI controls. Linear's design language perfectly balances technical precision with modern aesthetics - ideal for a studio-style application handling complex inputs and outputs.

**Key Principles:**
- Precision over decoration: Every element serves a functional purpose
- Technical clarity: Information hierarchy guides power users efficiently
- Professional restraint: Sophisticated without being flashy
- Studio-grade interface: Workspace tools that feel powerful and refined

---

## Typography

**Font Stack:**
- Primary: Inter (Google Fonts) - UI text, labels, body
- Monospace: JetBrains Mono - code output, seeds, technical data

**Hierarchy:**
- Hero Headlines: text-5xl/text-6xl font-bold (landing only)
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Component Labels: text-sm font-medium uppercase tracking-wide text-opacity-60
- Body Text: text-base font-normal
- Technical Data: text-sm font-mono
- Captions/Meta: text-xs font-medium text-opacity-50

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Micro spacing (component internals): p-2, gap-2
- Standard spacing (between elements): p-4, gap-4, mb-6
- Section spacing: p-8, py-12, gap-8
- Page margins: p-16, py-24 (desktop)

**Grid System:**
- Container: max-w-7xl mx-auto px-8
- Studio workspace: 2-column split (sidebar + main), lg:grid-cols-[280px_1fr]
- Library grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Filter panels: flex flex-wrap gap-4

---

## Component Library

### Navigation
**Top Bar:** Fixed header (h-16) with logo left, navigation center, user/account right. Backdrop blur background, border-b separator.

### Studio Workspace Components

**Profile/Blueprint Selectors:**
- Card-based selection with radio behavior
- Each card: p-4, border, rounded-lg, hover state with subtle elevation
- Active state: border accent, background tint
- Display: name (font-semibold), description (text-sm opacity-60), metadata badges

**Filter Panel:**
- Organized in collapsible sections
- Each filter: label + control (chips for discrete, slider for continuous)
- Chips: px-3 py-1.5 rounded-full, multi-select with active state
- Sliders: custom range inputs with value display

**Input Form:**
- Vertical stack with generous spacing (gap-6)
- Labels: text-sm font-medium mb-2
- Text inputs: p-3 rounded-lg border, focus ring
- Textareas: min-h-32 for context fields
- Seed field: monospace font with "randomize" icon button inline

**Generate Button:**
- Primary CTA: px-8 py-4 text-base font-semibold rounded-lg
- Full width on mobile, auto width on desktop
- Loading state with spinner

**Output Display:**
- Dedicated panel with clear visual separation
- Header with metadata badges (profile, blueprint, score)
- Prompt text: font-mono p-6 rounded-lg background subtle
- Action row: Copy, Export JSON, Save Version, Share (icons + labels)
- Warnings: amber accent with icon, collapsible details
- Score visualization: progress bar or circular gauge

### Library Components

**Blueprint Cards:**
- Hover-lift effect (transform subtle)
- Preview thumbnail area (16:9 aspect ratio placeholder)
- Content: title (font-semibold text-lg), category badge, description (2 lines max), block count indicator
- Footer: "Use Blueprint" button

### History Components

**History List:**
- Table-like rows with: timestamp, blueprint name, score badge, prompt preview (truncated), replay seed button
- Click row to expand full details
- Filters: date range, blueprint type, score threshold

---

## Page Layouts

### Landing Page
**Hero Section (h-screen max-h-[600px]):**
- Centered layout max-w-4xl
- Headline + subheadline + CTA stack
- Below fold: 3-column feature grid highlighting "Infinite Blueprints", "Reproducible Results", "Filter Precision"
- Social proof section: "Trusted by prompt engineers" with placeholder logos
- Pricing comparison table (Free vs Pro) with feature checkmarks
- Footer with links, newsletter signup

**Hero Image:** Abstract visualization of prompt compilation - geometric shapes flowing into structured text formation (suggest Midjourney/DALL-E generation with keywords: "abstract data flow, blueprint wireframes, minimalist tech illustration, purple and blue gradient")

### Studio Page
**Layout Structure:**
- Left Sidebar (280px): Profile selector (sticky top), Blueprint selector (scrollable)
- Main Area: 
  - Top: Filter Panel (collapsible horizontal chips)
  - Middle: Input Form (max-w-2xl)
  - Bottom: Generate button + Output panel (conditional render)
- Responsive: sidebar becomes drawer on mobile

### Library Page
- Page header with search bar and category filters
- Blueprint grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card showcases blueprint with visual preview area

### History Page
- Search + filter bar (sticky)
- Sortable table with pagination
- Empty state with "Generate your first prompt" CTA

---

## Animations

**Minimal, purposeful only:**
- Page transitions: 150ms ease fade
- Card hovers: transform scale(1.02) + shadow in 200ms
- Collapsible sections: height transition 300ms ease
- Loading states: subtle pulse on skeleton elements
- No scroll-triggered animations

---

## Images

**Hero Image (Landing):**
- Position: Full-width background with gradient overlay
- Description: Abstract visualization of prompt compilation process - flowing data streams converging into structured blueprint format, modern tech aesthetic, depth and dimensionality, color scheme: deep purples, electric blues, subtle gradients
- Treatment: Subtle blur overlay, centered content with backdrop-blur card

**Blueprint Cards (Library):**
- Each blueprint displays category-appropriate preview
- Examples: "minecraft_style_food" shows pixelated food grid, "cctv_detection" shows surveillance aesthetic, "lookbook_9frame" shows 3x3 fashion layout
- Aspect ratio: 16:9, object-fit: cover

---

## Accessibility & States

- Focus indicators: 2px ring with offset
- Hover states: opacity-80 or subtle background shift
- Active states: background deepening + scale(0.98)
- Disabled states: opacity-40 + cursor-not-allowed
- Form validation: inline errors with red accent, success with green checkmark
- Loading skeletons: pulsing placeholder blocks matching content structure
- Keyboard navigation: full tab order, escape to close modals/drawers

---

## Production Checklist

- Responsive breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)
- Dark mode consideration: design supports but not required for MVP
- Empty states: all lists/grids have illustrated empty state with CTA
- Error states: user-friendly messages with retry actions
- Loading states: skeleton screens matching final content structure
- Touch targets: minimum 44px for mobile interactive elements