# Tailwind v4 Theme Snippet — AlphaSense-Inspired Tokens

Paste into `src/styles.css` (or your Tailwind v4 entry). Tailwind v4 is
**CSS-first** — there is no `tailwind.config.js`. Tokens live in `@theme`
and `:root`; utilities like `bg-primary`, `text-ai`, `font-display`,
`rounded-xl` are generated automatically.

> **Fonts:** load Space Grotesk + Inter + JetBrains Mono via `<link>` in
> your root `<head>` — never `@import` a remote URL inside this file
> (Lightning CSS resolves `@import` from disk, not the network).

```css
/* src/styles.css */
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* ---------- 1. Semantic → CSS variable bridge ---------- */
@theme inline {
  /* Radii */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);

  /* Surfaces */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);

  /* Brand */
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);

  /* Semantic signals */
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-ai: var(--ai);
  --color-ai-foreground: var(--ai-foreground);

  /* Chrome */
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Data viz */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* Sidebar */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

/* ---------- 2. Fonts (registered in <link>, referenced here) ---------- */
@theme inline {
  --font-sans:    "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-display: "Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, "SFMono-Regular", monospace;
}

/* ---------- 3. Light theme values ---------- */
:root {
  --radius: 0.75rem;                              /* 12px cards, 8px buttons */

  --background: oklch(1 0 0);                     /* #FFFFFF */
  --foreground: oklch(0.16 0.02 265);             /* near-black navy ink */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.16 0.02 265);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.16 0.02 265);

  --primary: oklch(0.48 0.29 264);                /* AlphaSense Blue #0033FF */
  --primary-foreground: oklch(1 0 0);

  --secondary: oklch(0.97 0.005 260);
  --secondary-foreground: oklch(0.16 0.02 265);
  --muted: oklch(0.97 0.005 260);
  --muted-foreground: oklch(0.50 0.02 260);
  --accent: oklch(0.95 0.03 265);
  --accent-foreground: oklch(0.30 0.20 264);

  --destructive: oklch(0.63 0.24 27);             /* #EF4444 */
  --destructive-foreground: oklch(1 0 0);
  --success: oklch(0.68 0.17 163);                /* #10B981 */
  --success-foreground: oklch(1 0 0);
  --ai: oklch(0.59 0.22 277);                     /* Electric Indigo #6366F1 */
  --ai-foreground: oklch(1 0 0);

  --border: oklch(0.92 0.008 260);
  --input: oklch(0.92 0.008 260);
  --ring: oklch(0.48 0.29 264);

  --chart-1: oklch(0.48 0.29 264);
  --chart-2: oklch(0.68 0.17 163);
  --chart-3: oklch(0.59 0.22 277);
  --chart-4: oklch(0.72 0.16 75);
  --chart-5: oklch(0.63 0.24 27);

  --sidebar: oklch(0.14 0.02 265);                /* Midnight Navy */
  --sidebar-foreground: oklch(0.90 0.01 250);
  --sidebar-primary: oklch(0.48 0.29 264);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.20 0.03 265);
  --sidebar-accent-foreground: oklch(0.98 0.005 250);
  --sidebar-border: oklch(0.24 0.03 265);
  --sidebar-ring: oklch(0.48 0.29 264);
}

/* ---------- 4. Dark theme overrides ---------- */
.dark {
  --background: oklch(0.15 0.03 265);
  --foreground: oklch(0.97 0.01 240);
  --card: oklch(0.20 0.04 265);
  --card-foreground: oklch(0.97 0.01 240);
  --popover: oklch(0.20 0.04 265);
  --popover-foreground: oklch(0.97 0.01 240);
  --primary: oklch(0.62 0.22 264);
  --primary-foreground: oklch(0.15 0.03 265);
  --secondary: oklch(0.26 0.04 265);
  --secondary-foreground: oklch(0.97 0.01 240);
  --muted: oklch(0.24 0.04 265);
  --muted-foreground: oklch(0.72 0.03 250);
  --accent: oklch(0.28 0.06 275);
  --accent-foreground: oklch(0.97 0.01 240);
  --destructive: oklch(0.68 0.22 27);
  --destructive-foreground: oklch(1 0 0);
  --success: oklch(0.72 0.17 163);
  --success-foreground: oklch(0.15 0.03 265);
  --ai: oklch(0.68 0.20 277);
  --ai-foreground: oklch(0.15 0.03 265);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 16%);
  --ring: oklch(0.62 0.22 264);
  --sidebar: oklch(0.10 0.02 265);
  --sidebar-foreground: oklch(0.90 0.01 250);
}

/* ---------- 5. Base layer ---------- */
@layer base {
  * { border-color: var(--color-border); }

  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  h1, h2, h3, h4, .font-display {
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  h1 { font-weight: 700; letter-spacing: -0.03em; }

  .tabular-nums { font-variant-numeric: tabular-nums; }
}

/* ---------- 6. Custom utilities (v4 syntax) ---------- */
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
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -12px rgb(15 23 42 / 0.18);
  }
}

@utility ai-pulse {
  position: relative;
  &::after {
    content: "";
    position: absolute;
    inset: -2px;
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

## Font `<link>` (root document head)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
```

## Generated utilities you now get

`bg-primary` · `text-primary-foreground` · `bg-ai` · `text-ai`
`bg-success` · `bg-destructive` · `border-border` · `ring-ring`
`bg-sidebar` · `text-sidebar-foreground` · `bg-card` · `text-muted-foreground`
`font-sans` · `font-display` · `font-mono`
`rounded-lg` (12px) · `rounded-md` (10px) · `rounded-xl` (16px)
Custom: `bg-synthesis` · `text-synthesis` · `card-lift` · `ai-pulse` · `tabular-nums`

## Tailwind v3 project?

If you're on v3, drop the `@theme` blocks and paste into `tailwind.config.js`:

```js
// tailwind.config.js — v3 only
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        success: { DEFAULT: "var(--success)", foreground: "var(--success-foreground)" },
        ai: { DEFAULT: "var(--ai)", foreground: "var(--ai-foreground)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          accent: "var(--sidebar-accent)",
          border: "var(--sidebar-border)",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', '"Inter"', "ui-sans-serif", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

Then keep the `:root` / `.dark` blocks from section 3–4 in your global CSS.
