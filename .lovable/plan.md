# Conference Intelligence — readiness assessment

Overall: roughly **60–65% of the PRD is genuinely working**. Pre-conference is close to production; live capture and post-conference generation are still the thin part.

## What is real today

- **Conference Calendar / extraction** — live scraping + AI structuring, per-field confidence, edit/retry, dedupe/merge, 24h cache, run history (10 runs recorded). Working.
- **Session Planner** — 301 real ESMO sessions in the database, filters, manual add, conflict detection, agenda builder with reorder. Working.
- **Primary CI · People Finder** — 1,008 people derived from real faculty, company/location and date/time columns, "right now" mode, CSV export, annotations table. Working (annotation table currently has 0 rows — untested in anger).
- **LBA Monitor** — watchlist (12 terms), scan runs, AI relevance scoring, manual entry, refresh. Working; 9 alerts stored.
- **KIT/KIQ Builder** — create/delete KITs and KIQs persists. Working but small (2 KITs, 4 KIQs).
- **Live Collaboration** — comments with realtime subscription and @mentions. Working.
- **Deliverables** — PDF export with source attribution and section toggles. Working.
- **Platform** — backend tables + open access policies, MCP/OAuth agent integration, SEO (llms.txt, robots, sitemap), design system.

## What is still pending

**1. Evidence Capture (largest gap).** The upload flow is a timed simulation — `setTimeout` moves it through "ocr" to "done". There is no file input, no storage bucket, no OCR, no voice-note transcription. PRD's core "2-tap poster upload, OCR in 60 seconds" does not exist. The 12 posters in the database were inserted by the extraction distributor, not captured.

**2. Bulk Summarization.** The progress bar is a `setInterval` animation; no summarization call is made. Configurable length is UI only.

**3. AI Hypothesis Engine.** Hypotheses can be stored and listed, but nothing generates 3+ hypotheses per KIQ, ranks them, or links PubMed / ClinicalTrials.gov evidence. Gap-flagging is not computed.

**4. Insight generation and synthesis.** Insights are read-only (4 rows). No AI produces them from posters, no duplicate removal, no novelty/impact ranking beyond displaying stored values. KIQ completion percentages are derived from static columns, not from evidence.

**5. Trial Endpoint Extractor.** 5 endpoint rows exist from extraction; there is no dedicated extractor that pulls p-values / HR / CI from poster text, and no cross-trial comparison table generation.

**6. Delegate workflow.** 6 delegates exist but there is no assignment UI end-to-end, no check-in, no calendar export per delegate, no push notifications.

**7. Operational gaps.** No scheduled LBA scanning (the 15-minute cron in the PRD is manual today, 1 scan run recorded); no auth/roles (sign-in removed by request, all tables open); no audit log; only ESMO 2026 has real data — ASH 2026 and ASCO 2027 are empty shells.

## Suggested build order

1. Evidence Capture for real — storage bucket, image upload, OCR, AI 3-bullet summary with quote + page + confidence. Unblocks 2, 4, 5.
2. Insight generation + synthesis (dedupe, novelty/impact ranking, KIQ completion computed from real evidence).
3. Bulk summarization wired to the AI gateway.
4. Hypothesis engine with PubMed / ClinicalTrials.gov evidence links and gap detection.
5. Endpoint extractor + cross-trial comparison tables.
6. Scheduled LBA scanning and delegate assignment/check-in.

## Technical notes

- Simulated code to replace: `src/routes/live.capture.tsx` (stage timers), `src/routes/post.summaries.tsx` (progress interval).
- No storage buckets exist in the backend yet; capture needs one plus an upload path.
- AI work should go through existing server-function patterns (`src/lib/extraction.functions.ts`, `src/lib/lba.functions.ts`) using the Lovable AI gateway helper already in `src/lib/ai-gateway.server.ts`.
- Data layer additions belong in `src/lib/db.ts` with hooks in `src/lib/hooks.ts`.
