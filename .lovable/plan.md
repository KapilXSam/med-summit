# VERA 2.0 — Clickable Prototype Plan

A frontend-only, fully navigable prototype covering all three modules (Pre / During / Post conference) using realistic mock data. No backend, no real AI, no auth enforcement — role switching is simulated. Focus is on validating the end-to-end workflow and UI.

## Design language
- Clean enterprise pharma/SaaS look: neutral surfaces, one confident primary accent (deep teal/blue), generous whitespace, data-dense but legible.
- Persistent left sidebar navigation + top bar with conference selector and a simulated role switcher.
- Reusable UI primitives (shadcn): cards, tables, tabs, badges, progress bars, dialogs, sheets, toasts.
- Confidence scores and source-attribution chips shown throughout to reflect the regulated-industry requirement.

## App shell & navigation
- `__root.tsx`: app title/meta, sidebar + topbar layout, `<Outlet />`.
- Topbar: conference dropdown (mock conferences e.g. ASCO 2025, ESMO 2025), role switcher (Admin, PM, Analyst, Delegate, Medical Writer, Client Viewer) that visually toggles permissions (e.g. Client Viewer hides low-confidence items).
- Sidebar sections: Dashboard, Pre-Conference, During Conference, Post-Conference, plus KIT/KIQ and Settings.

## Routes
```text
/                      Landing / conference portfolio overview
/dashboard             Cross-module status for active conference
/pre                   Module A hub (tabs below)
/pre/extraction        AI Extraction review (session table, confidence flags)
/pre/planner           Session Planner (filter, assign, conflict detection)
/pre/lba               LBA Monitor (alerts feed)
/pre/kitkiq            KIT/KIQ Builder (nested tree + AI mapping)
/pre/hypotheses        AI Hypothesis Engine
/live                  Module B hub (mobile-first)
/live/dashboard        Live Dashboard (agenda, check-in, KIQ tracker, feed)
/live/capture          Evidence Capture (mock photo upload -> OCR/summary)
/live/insights         Live AI Insights feed
/live/collab           Live Collaboration threads
/post                  Module C hub
/post/summaries        Bulk Summarization
/post/endpoints        Trial Endpoint Extractor (comparison tables)
/post/synthesis        Insight Synthesis
/post/deliverables     Deliverable Generator (3 tiers, mock export)
```

## Mock data (in `src/data/`)
Typed fixtures for: Conference, Session, Abstract/Poster, Trial, Endpoint, KIT, KIQ, Hypothesis, Insight, Delegate, Comment, LBA alert. Enough volume (e.g. ~40 sessions, ~12 posters, several KIQs/insights) to make tables, filters, and trackers feel real. Numbers marked as "direct extraction" per the no-inferred-values rule.

## Module highlights (all simulated)
- **Pre — Extraction**: sortable/filterable session table, therapy-area/asset tags, confidence badges, "flagged for review" state for <70%.
- **Pre — Planner**: filters, multi-select assign-to-delegate, conflict highlighting, mock calendar export button.
- **Pre — LBA Monitor**: chronological alert feed with "relevant to your KIT" badges.
- **Pre — KIT/KIQ**: expandable nested tree, per-KIQ mapped session counts, editable labels.
- **Pre — Hypotheses**: hypothesis cards ranked by impact/likelihood with mock PubMed/ClinicalTrials.gov citation links and gap flags.
- **Live — Dashboard**: hourly-agenda list, KIQ completion progress bars, delegate check-in chips, live insight feed.
- **Live — Capture**: file-input mock upload that shows a simulated OCR + 3-bullet summary after a short delay, with source quote/page/confidence.
- **Live — Insights/Collab**: insight cards with significance/contradiction flags; threaded comments with @mentions (local state).
- **Post — Summaries**: batch summarize control with progress simulation.
- **Post — Endpoints**: cross-trial comparison table (p-values, HR, CI) with extraction markers.
- **Post — Synthesis**: insights grouped by KIT/KIQ, ranked, dedup indicator.
- **Post — Deliverables**: 3 exec-summary tiers, report preview, mock Word/PPT/PDF export buttons with attribution footnotes.

## Explicitly not in this prototype
Real extraction/scraping, real OCR/AI, live sync, integrations, database, and enforced auth — all simulated with mock data and timed UI feedback. These are called out as stubs so expectations are clear.

## Technical notes
- TanStack Start file-based routes; each route sets its own `head()` metadata.
- Global state (active conference, current role) via a small React context.
- No new heavy dependencies beyond existing shadcn/Tailwind stack; icons via lucide-react.

I'll build the shell and mock data first, then fill in each module's screens.