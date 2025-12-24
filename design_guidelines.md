# PromptForge Design Guidelines

## Design Language: Soft Minimal Editorial UI / Calm Tech Design

A content-first, quiet UI that is premium, comfortable for extended use, and maintains high legibility.

**Key Principles:**
- Content-first: UI recedes to let content shine
- Calm tech: Professional without being cold
- Editorial precision: Clear hierarchy, generous whitespace
- Quiet confidence: Subtle interactions, no visual noise

---

## Color Palette

### Light Mode
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| background | 240 5% 97% | #F7F7F8 | Page background |
| surface (card) | 0 0% 100% | #FFFFFF | Cards, panels |
| border | 220 9% 91% | #E6E7EB | Subtle borders |
| foreground | 220 13% 10% | #191B1F | Headings, strong text |
| muted-foreground | 220 9% 46% | #6B7280 | Secondary text |
| primary | 292 84% 61% | #D946EF | Accent (Fuchsia) |
| accent-2 | 263 70% 58% | #7C3AED | Secondary accent (Violet) |
| success | 142 76% 36% | #16A34A | Success states |
| warning | 38 92% 50% | #F59E0B | Warning states |
| destructive | 0 72% 51% | #EF4444 | Error states |

### Dark Mode (No pure black)
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| background | 225 14% 7% | #0F1115 | Page background |
| surface (card) | 222 20% 10% | #141824 | Cards, panels |
| border | 222 16% 18% | #232A3B | Subtle borders |
| foreground | 220 9% 95% | #F3F4F6 | Headings, strong text |
| muted-foreground | 220 9% 64% | #9CA3AF | Secondary text |
| primary | 292 84% 55% | #C026D3 | Accent (Fuchsia) |
| accent-2 | 263 70% 68% | #8B5CF6 | Secondary accent (Violet) |

---

## Typography

**Font Stack:**
- Primary: Inter (with system fallback)
- Monospace: JetBrains Mono

**Type Scale:**
| Level | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| H1 | 32px (2rem) | 1.25 | Semibold | Page titles |
| H2 | 24px (1.5rem) | 1.33 | Semibold | Section headers |
| H3 | 18px (1.125rem) | 1.44 | Semibold | Card titles |
| Body | 14px (0.875rem) | 1.57 | Regular | Main content |
| Small | 12px (0.75rem) | 1.5 | Regular | Captions, labels |

**Letter Spacing:**
- Headings: -0.015em (tracking-tight)
- Body: 0em (tracking-normal)
- Labels: 0.025em (tracking-wide)

---

## Spacing & Layout

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Micro gaps |
| sm | 8px | Small gaps, padding |
| md | 16px | Standard gaps |
| lg | 24px | Section gaps |
| xl | 32px | Large sections |
| 2xl | 48px | Page sections |

### Editorial Layout
- **Page padding:** 24-32px
- **Card padding:** 20-28px
- **Gap between elements:** 16-24px
- **Section spacing:** 48-80px
- **Max content width:** 1280px (7xl)

### Grid Structure
- Two-column layout for studios (controls left, results right)
- Generous whitespace between sections
- Separation through spacing, not heavy dividers

---

## Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Base | 14px | rounded-DEFAULT |
| Buttons/Inputs | 12px | rounded-md |
| Cards | 16px | rounded-lg |
| Badges/Chips | 8px | rounded-sm |

---

## Shadows

Minimal and diffuse - only for elevation cues.

| Shadow | Usage |
|--------|-------|
| shadow-editorial | Cards, subtle elevation |
| shadow-editorial-md | Popovers, dropdowns |
| shadow-editorial-lg | Modals, dialogs |

**When to use shadows:**
- Modals and dialogs
- Dropdown menus and popovers
- Floating tooltips
- Cards on scroll (sticky elements)

---

## Borders

- **Width:** 1px always
- **Style:** Solid
- **Opacity:** Low (use border tokens)
- **Rule:** Avoid borders when contrast is sufficient

---

## Icons

**Library:** lucide-react

| Size | Tailwind | Usage |
|------|----------|-------|
| 16px | w-4 h-4 | Inline text, badges |
| 18px | w-4.5 h-4.5 | Buttons, inputs |
| 20px | w-5 h-5 | Navigation, actions |
| 24px | w-6 h-6 | Headers, empty states |

**Style:**
- Stroke width: 1.5px (default)
- Always use currentColor
- Align with text baseline

---

## Components

### Buttons

| Variant | Background | Text | Usage |
|---------|------------|------|-------|
| Primary | Fuchsia | White | Main CTAs |
| Secondary | Gray | Dark | Secondary actions |
| Ghost | Transparent | Current | Tertiary actions |
| Destructive | Red | White | Dangerous actions |

**States:**
- Hover: Subtle background elevation (--elevate-1)
- Active: More elevation (--elevate-2)
- Disabled: 50% opacity, no pointer
- Focus: Accent ring with 2px offset

**Sizes:**
- Default: h-10 (40px)
- Small: h-8 (32px)
- Large: h-12 (48px)
- Icon: h-10 w-10

### Cards

- Background: card (white/dark surface)
- Border: 1px card-border
- Radius: 16px (rounded-lg)
- Padding: 20-28px (p-5 to p-7)
- **Rule:** Never nest cards

### Inputs

- Height: 40px (h-10)
- Border: 1px input color
- Radius: 12px (rounded-md)
- Focus: Primary ring
- Placeholder: muted-foreground

### Badges

- Height: 24px (small variant)
- Padding: 4px 8px
- Radius: 8px (rounded-sm)
- Font: 12px medium

---

## Motion

Subtle and functional - never distracting.

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 150ms | ease-out | Hovers, toggles |
| Standard | 200ms | ease-out | State changes |
| Complex | 250ms | ease-in-out | Modals, drawers |

**Guidelines:**
- Use fade for appearance/disappearance
- Use slide for drawers/sheets (8px offset)
- No bounce or spring physics
- Skeleton loaders for async content

---

## Page Structure

### Header/Navigation
- Height: 56px (h-14)
- Background: transparent or blur
- Border: subtle bottom border
- Content: Logo left, tabs center, actions right
- **Rule:** No heavy boxes or backgrounds

### Content Layout
- Two-column for workspaces
- Left column: Controls, filters (max-w-md)
- Right column: Results, previews (flex-1)
- Generous padding between sections

### Card Structure
- Title: H3 or text-base font-semibold
- Description: text-sm text-muted-foreground
- Content: Gap-4 between elements
- Actions: Bottom aligned or inline

---

## Accessibility

- **Contrast:** WCAG AA minimum (4.5:1 for text)
- **Focus:** Visible ring on all interactive elements
- **Touch targets:** 44px minimum
- **Labels:** All inputs have associated labels
- **ARIA:** Appropriate attributes on custom components

---

## Dark Mode Rules

1. No pure black (#000000) anywhere
2. Maintain calm, warm undertones
3. Borders slightly lighter than background
4. Shadows more prominent (higher opacity)
5. Same visual hierarchy as light mode
6. Text contrast adequate (not too bright)

---

## Implementation Checklist

- [ ] All pages use editorial-container utility
- [ ] Cards have consistent padding (p-5 or p-6)
- [ ] Gaps are consistent (gap-4 to gap-6)
- [ ] No heavy borders or shadows
- [ ] Typography scale is respected
- [ ] Icons are correct sizes
- [ ] Dark mode is fully supported
- [ ] Focus states are visible
- [ ] Motion is subtle (150-250ms)
