# Pharmalix — AlphaSense-Inspired Design System

Portable spec of the "Clean Authority" design language used in this app.
Drop into any Tailwind v4 + shadcn project. Every token is semantic — swap
values without touching components.

---

## 1. Brand Essence

- **Voice:** Trust · Intelligence · Precision · Velocity
- **Feel:** High-end financial terminal × modern SaaS calm
- **Rule:** Let the *data* and *AI insight* be the loudest thing on the page

---

## 2. Color Tokens

Pure, vivid AlphaSense Blue on white with a near-black navy chrome.
All values are `oklch()` so light/dark stay perceptually balanced.

| Token | Light | Hex ≈ | Role |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `#FFFFFF` | Page surface |
| `--foreground` | `oklch(0.16 0.02 265)` | `#0B1220` | Body ink (near-black navy) |
| `--primary` | `oklch(0.48 0.29 264)` | `#0033FF` | **AlphaSense Blue** — CTAs, links, active |
| `--primary-foreground` | `oklch(1 0 0)` | `#FFFFFF` | Text on primary |
| `--secondary` / `--muted` | `oklch(0.97 0.005 260)` | `#F6F7FA` | Section fills, chips |
| `--muted-foreground` | `oklch(0.50 0.02 260)` | `#6B7280` | Meta / helper text |
| `--accent` | `oklch(0.95 0.03 265)` | `#EDEFFF` | Subtle indigo tint |
| `--border` / `--input` | `oklch(0.92 0.008 260)` | `#E5E7EB` | Hairlines |
| `--ring` | `oklch(0.48 0.29 264)` | `#0033FF` | Focus ring |
| `--ai` | `oklch(0.59 0.22 277)` | `#6366F1` | **Electric Indigo** — GenAI surfaces |
| `--success` | `oklch(0.68 0.17 163)` | `#10B981` | Positive signal |
| `--destructive` | `oklch(0.63 0.24 27)` | `#EF4444` | Risk / critical |
| `--sidebar` | `oklch(0.14 0.02 265)` | `#0A0F1C` | **Midnight Navy** chrome |
| `--sidebar-foreground` | `oklch(0.90 0.01 250)` | `#E4E7EE` | Sidebar text |

**Charts:** blue → green → indigo → amber → red (`--chart-1..5`).

**Signature gradient:** `linear-gradient(135deg, #0033FF, #6366F1)` — reserve for GenAI/AI insight surfaces only.

---

## 3. Typography

Load once in `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
```

| Role | Family | Weight | Notes |
|---|---|---|---|
| Display (h1–h4) | **Space Grotesk** | 600 / 700 | Geometric grotesque, `letter-spacing: -0.02em` (h1: -0.03em) |
| Body | **Inter** | 400 / 500 | 16px base, line-height 1.5–1.65 |
| Data / Mono | **JetBrains Mono** | 400 / 500 | Financials, IDs, code |

**Numerals:** always tabular — `font-variant-numeric: tabular-nums` for any price, delta, percentage, or table column. Prevents column jitter.

**Type scale:** 12 · 14 · 16 · 18 · 20 · 24 · 32 · 48 · 64.

---

## 4. Spacing, Radius, Elevation

- **Spacing rhythm:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 (8pt base)
- **Radius scale:** `--radius: 0.75rem` (12px cards, 8px buttons)
- **Shadow — card lift on hover only:**
  `box-shadow: 0 12px 24px -12px rgb(15 23 42 / 0.18)`
- **Hairlines over shadows** — this is a terminal aesthetic. Use `border` before `shadow`.

---

## 5. Motion

Keep motion functional, never decorative.

- **Micro-interactions:** 150–200ms, `ease-out`
- **Card lift:** `translateY(-2px)` + shadow, 200ms
- **AI "live" pulse:** 2s indigo ring pulse on active AI indicators only
- **Respect `prefers-reduced-motion`** globally

---

## 6. Tailwind v4 Setup (`src/styles.css`)

```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-ai: var(--ai);
  --color-ai-foreground: var(--ai-foreground);
  --color-success: var(--success);
  /* …repeat for every semantic token */
}

:root {
  --radius: 0.75rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.16 0.02 265);
  --primary: oklch(0.48 0.29 264);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.97 0.005 260);
  --muted: oklch(0.97 0.005 260);
  --muted-foreground: oklch(0.50 0.02 260);
  --accent: oklch(0.95 0.03 265);
  --border: oklch(0.92 0.008 260);
  --ring: oklch(0.48 0.29 264);
  --ai: oklch(0.59 0.22 277);
  --success: oklch(0.68 0.17 163);
  --destructive: oklch(0.63 0.24 27);
  --sidebar: oklch(0.14 0.02 265);
  --sidebar-foreground: oklch(0.90 0.01 250);
  /* …charts + dark overrides */
}

@theme inline {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Space Grotesk", "Inter", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

@layer base {
  * { border-color: var(--color-border); }
  body {
    background: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4, .font-display {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  h1 { font-weight: 700; letter-spacing: -0.03em; }
}

/* GenAI gradient — use sparingly */
@utility bg-synthesis {
  background-image: linear-gradient(135deg,
    oklch(0.48 0.29 264), oklch(0.59 0.22 277));
}
@utility text-synthesis {
  background-image: linear-gradient(135deg,
    oklch(0.48 0.29 264), oklch(0.59 0.22 277));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

@utility card-lift {
  transition: transform 200ms ease, box-shadow 200ms ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -12px rgb(15 23 42 / 0.18);
  }
}

@utility ai-pulse {
  position: relative;
  &::after {
    content: "";
    position: absolute; inset: -2px;
    border-radius: inherit;
    animation: ai-pulse-ring 2s ease-out infinite;
    pointer-events: none;
  }
}
@keyframes ai-pulse-ring {
  0%   { box-shadow: 0 0 0 0 oklch(0.59 0.22 277 / 0.45); }
  70%  { box-shadow: 0 0 0 10px oklch(0.59 0.22 277 / 0); }
  100% { box-shadow: 0 0 0 0 oklch(0.59 0.22 277 / 0); }
}
```

---

## 7. Component Patterns

- **Primary button:** `bg-primary text-primary-foreground rounded-lg px-4 py-2 font-medium`
- **Card:** `bg-card border border-border rounded-xl p-6 card-lift`
- **AI insight card:** add `border-l-4 border-l-[color:var(--ai)]` and an `ai-pulse` dot
- **Sidebar:** `bg-sidebar text-sidebar-foreground` — nav uses uppercase 11px tracking-wider group labels
- **Data table:** hairline borders, `tabular-nums`, zebra via `--muted` at 40% alpha

---

## 8. Do / Don't

**Do**
- Use semantic tokens (`bg-primary`, `text-muted-foreground`) — never raw hex in components
- Reserve indigo + `bg-synthesis` for genuine AI/GenAI moments
- Show provenance next to every insight (source chip, timestamp)
- Meet WCAG AA (4.5:1 body, 3:1 large text) — verify in both themes

**Don't**
- No emoji as UI icons — use Lucide/Heroicons
- No purple-on-white AI-slop gradients — the gradient is blue→indigo, used sparingly
- No decorative motion — every animation must express cause and effect
- No serif fonts, no rounded-full pill buttons for primary actions

---

## 9. Content Tone

Authoritative, precise, forward-looking. Keywords: *Confidence, Proprietary, Unrivaled, Streamlined, Traceable.* Avoid hype without backing — always ground claims in a source.
