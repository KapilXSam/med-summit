# PRF — Conference Calendar ("Conference Compass") Module

**Product:** Pharmalix — Conference Intelligence Platform
**Module:** Module A · Pre-Conference → Conference Calendar
**Route:** `/pre/extraction`
**Status:** Built and running
**Purpose of this document:** a complete, implementation-grade functional requirements file. Any AI coding tool should be able to rebuild this module byte-for-behaviour from this file alone.

---

## 1. Product summary

The Conference Calendar is the landing surface for a user planning attendance at a medical congress (default: ESMO 2026). It replaces the official congress website's calendar with a structured, filterable, analysable view.

It does three things:

1. **Ingests** a live conference programme from the web (search-by-name auto-build, or direct URL import) using a web scraper plus an LLM extraction pass with per-field confidence scoring.
2. **Persists and distributes** the extracted sessions into the shared database, automatically fanning them out to sibling modules (Sessions, Posters, Trial Endpoints).
3. **Presents** the programme as a browsable calendar with KPI stats, session-type chips, multi-dimension filters, and three view modes (Timeline, By Type, By Indication), plus a one-click hand-off to the Session Planner.

**Primary user:** medical affairs / competitive intelligence analyst planning congress coverage.
**Success criterion:** a user can go from "ESMO 2026" typed into a box to a fully structured, filtered agenda in under 60 seconds, without opening the congress website.

---

## 2. Tech stack (must match)

| Concern | Choice |
|---|---|
| Framework | TanStack Start v1 (React 19, file-based routing, SSR) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 via `src/styles.css` (`@theme` tokens, no tailwind.config.js) |
| Components | shadcn/ui |
| Icons | lucide-react |
| Data fetching | TanStack React Query |
| Server logic | `createServerFn` from `@tanstack/react-start` |
| Database / backend | Supabase (Lovable Cloud) |
| Scraping | Firecrawl (`@mendable/firecrawl-js` + Firecrawl v2 `/search` REST) |
| LLM | Lovable AI Gateway → `google/gemini-3-flash-preview` via Vercel `ai` SDK `generateText` |
| Validation | zod |
| Toasts | sonner |

**Required environment secrets (server-side only):**
- `FIRECRAWL_API_KEY`
- `LOVABLE_API_KEY`

---

## 3. File inventory

| File | Role |
|---|---|
| `src/routes/pre.extraction.tsx` | The Conference Calendar page (~930 lines). All UI, derivation, filters, views. |
| `src/lib/extraction.functions.ts` | All server functions: scrape, extract, search, URL check, auto-build, cache, distribute, history. |
| `src/lib/extraction-types.ts` | `ExtractedSession`, `IngestResult`, `FieldConfidence`, `EDITABLE_FIELDS`. |
| `src/lib/ai-gateway.server.ts` | `createLovableAiGatewayProvider(apiKey)` — AI SDK provider factory. |
| `src/lib/db.ts` | Data access layer, snake_case DB ↔ camelCase app types. |
| `src/lib/hooks.ts` | React Query hooks scoped to active conference (`useSessions`, `usePosters`, …). |
| `src/context/app-context.tsx` | `useApp()` → active `conference`, role. |
| `src/data/types.ts` | Shared domain types (`Session`, `Poster`, `Endpoint`, `Conference`, …). |
| `src/components/app-sidebar.tsx` | Nav entry: "Conference Calendar" → `/pre/extraction`, icon `CalendarRange`. |
| `src/components/page-header.tsx` | Shared page header with `eyebrow`, `title`, `description`, `actions`. |
| `src/lib/route-seo.ts` | `routeSeo({title, description, path})` helper for `head()`. |

---

## 4. Data model

### 4.1 `ExtractedSession` (transport type, `src/lib/extraction-types.ts`)

```ts
interface ExtractedSession {
  id: string;                 // "ext-0", "ext-1", … index-based
  title: string;
  authors: string;
  affiliation: string;
  day: string;
  time: string;
  room: string;
  trialId: string;
  therapyArea: string;
  asset: string;
  confidence: number;                       // overall 0-100
  fieldConfidence: Record<string, number>;  // per-field 0-100
}

interface IngestResult {
  sourceUrl: string;
  sessions: ExtractedSession[];
  warning?: string;
}

const EDITABLE_FIELDS = [
  { key: "title",       label: "Session title" },
  { key: "authors",     label: "Authors" },
  { key: "affiliation", label: "Affiliation" },
  { key: "day",         label: "Day" },
  { key: "time",        label: "Time" },
  { key: "room",        label: "Room" },
  { key: "trialId",     label: "Trial ID" },
  { key: "therapyArea", label: "Therapy area" },
  { key: "asset",       label: "Asset" },
];
```

`FIELD_KEYS` (server) = exactly those nine keys, in that order.
`CONF_THRESHOLD = 70` — any field scoring below 70 is "low confidence" and flagged for review.

### 4.2 Domain `Session` (`src/data/types.ts`)

```ts
interface Session {
  id: string; title: string; time: string; day: string; room: string;
  authors: string; affiliation: string; trialId?: string;
  therapyArea: string; asset: string; phase: string; confidence: number;
  assignedTo?: string; conflict?: boolean; kiqId?: string; sourceUrl?: string;
}
```

### 4.3 Database tables (Supabase, `public` schema)

All tables are single-tenant / no-auth: permissive RLS (`USING true` / `WITH CHECK true`) for `anon` and `authenticated`, plus `GRANT ALL ... TO service_role`. This is intentional for this product.

**`sessions`** — `id uuid pk`, `conference_id uuid fk→conferences`, `title text`, `authors text`, `affiliation text`, `day text`, `time text`, `room text`, `trial_id text null`, `therapy_area text`, `asset text`, `confidence int`, `source_url text`, plus planner columns (`assigned_to`, `conflict`, `kiq_id`, `phase`), `created_at`.

**`posters`** — `id`, `conference_id`, `title`, `presenter`, `captured_by`, `captured_at`, `therapy_area`, `ocr_status text` (`queued|processing|complete`), `summary jsonb[]`, `significant bool`, `contradictory bool`, `source_quote text`, `page int`, `confidence int`.

**`endpoints`** — `id`, `conference_id`, `trial_id`, `trial_name`, `asset`, `endpoint_type` (`Primary|Secondary`), `endpoint`, `value`, `p_value`, `hr`, `ci`.

**`extraction_cache`** — caching layer.
```
id uuid pk
conference_id uuid fk → conferences
source_url text NOT NULL
query text null
sessions jsonb NOT NULL DEFAULT '[]'   -- full ExtractedSession[]
session_count int NOT NULL DEFAULT 0
scraped_at timestamptz NOT NULL DEFAULT now()
created_at, updated_at timestamptz
UNIQUE (conference_id, source_url)     -- required: upsert onConflict target
```

**`extraction_runs`** — audit/history log.
```
id uuid pk
conference_id uuid fk → conferences
query text null
source_url text null
status text NOT NULL           -- 'ok' | 'cached' | 'empty' | 'failed'
session_count int DEFAULT 0
new_sessions int DEFAULT 0
posters_created int DEFAULT 0
endpoints_created int DEFAULT 0
from_cache bool DEFAULT false
reason text null
attempts jsonb DEFAULT '[]'    -- AutoBuildAttempt[]
created_at timestamptz DEFAULT now()
```

**`conferences`** — `id`, `name`, `acronym`, `location`, `start_date`, `end_date`, `therapy_areas text[]`, `session_count int`, `delegate_count int`, `status`, `phase`.
Seeded upcoming conferences only: **ESMO 2026** (IFEMA Madrid, Spain, Oct 23–27 2026), **ASH 2026** (Orlando, Dec 5–8 2026), **ASCO 2027** (Chicago, Jun 4–8 2027).

---

## 5. Server functions (`src/lib/extraction.functions.ts`)

> Authoring rule: this file must remain a thin wrapper — only imports, types, and exported `createServerFn` declarations at module scope where possible. `supabaseAdmin` is imported **dynamically inside handlers** (`await import("@/integrations/supabase/client.server")`) so it never enters the client bundle.

### 5.1 Shared helpers

**`scrapeMarkdown(url): Promise<string>`**
- Reads `process.env.FIRECRAWL_API_KEY` inside the call; throws `"Firecrawl is not configured"` if absent.
- Dynamic-imports `@mendable/firecrawl-js`, calls `firecrawl.scrape(url, { formats: ["markdown"], onlyMainContent: true })`.
- Reads markdown from `result.markdown` **or** `result.data.markdown` (Firecrawl v2 shape variance).
- Throws `"No readable content found at that URL"` when empty.
- Truncates to **40,000 chars**.

**`parseJson<T>(text)`**
- Strips ```` ```json ```` fences, finds first `[` or `{` and last `]` or `}`, `JSON.parse`s the slice, returns `null` on any failure. Never throws.

**`searchAgendaUrls(query): Promise<UrlSuggestion[]>`**
- POST `https://api.firecrawl.dev/v2/search` with `{ query: "<query> scientific programme agenda sessions abstracts", limit: 10 }`, bearer `FIRECRAWL_API_KEY`.
- **Critical:** the response `data` may be an array **or** an object `{web:[], news:[]}`. Resolution order: `Array.isArray(json.data) ? json.data : json.data?.web ?? json.data?.news ?? json.web ?? json.results ?? []`. (Getting this wrong produces the "items not iterable" bug.)
- Dedupes by URL, ranks by regex `(agenda|program(me)?|session|abstract|schedule|scientific|congress|meeting)` — title match = 2 points, description match = 1 — returns top 6.

**`ingestOnce(url, limit): Promise<ExtractedSession[]>`** — scrape + LLM extract, returns [] on parse failure (never throws on bad JSON).

### 5.2 Extraction prompt (verbatim contract)

```
You are a medical-conference agenda extraction engine. From the page content below,
extract every scientific session, abstract, or presentation you can find (up to {limit}).

For EACH session return an object with these string fields (use "" when a value is
genuinely absent — never guess or infer):
- title, authors, affiliation, day, time, room, trialId, therapyArea, asset

Also return "fieldConfidence": an object mapping each of those field names to an
integer 0-100 reflecting how directly the value was stated on the page. Use a LOW
score (< 70) when the value was ambiguous, inferred, or missing. Also return
"confidence": an integer 0-100 overall for the row.

Only extract values that appear in the source. Do not fabricate trial IDs, times, or rooms.

Return ONLY a JSON array, no prose. Shape:
[{"title":"","authors":"","affiliation":"","day":"","time":"","room":"","trialId":"",
"therapyArea":"","asset":"","confidence":85,"fieldConfidence":{...}}]

PAGE CONTENT:
{markdown}
```

Model: `google/gemini-3-flash-preview`. Default `limit` = 40, max 80.

**Normalisation rules applied to every parsed row:**
- Any non-string field → `""`.
- Each `fieldConfidence[k]` → clamped integer 0–100; **default 50** when missing/NaN.
- `confidence` → clamped 0–100; when missing, computed as the mean of the nine field confidences.
- `id` = `ext-${index}`.

### 5.3 Exported server functions

| Function | Method | Input (zod) | Returns |
|---|---|---|---|
| `ingestConferenceUrl` | POST | `{ url: url, limit?: 1-80 }` | `IngestResult` — **preview only, does not persist** |
| `retryFieldExtraction` | POST | `{ url, sessionTitle, field }` | `{ value: string, confidence: number }` — re-extracts one field |
| `suggestConferenceUrls` | POST | `{ query: 2-200 chars }` | `UrlSuggestion[]` (max 6) |
| `checkAgendaUrl` | POST | `{ url }` | `UrlCheckResult` |
| `autoBuildFromName` | POST | `{ query, conferenceId, limit?, refresh?, maxAgeHours? }` | `AutoBuildResult` — **the main entry point** |
| `getExtractionHistory` | POST | `{ conferenceId, limit? ≤50 }` | `ExtractionRunRow[]` (newest first, default 10) |
| `getExtractionCaches` | POST | `{ conferenceId, limit? }` | `ExtractionCacheRow[]` (newest first) |

**`checkAgendaUrl` logic:** GET with `User-Agent: Mozilla/5.0 Pharmalix/1.0`, follow redirects. Non-OK → `{ok:false, reason:"HTTP <status>"}`. Otherwise read first 60,000 chars lowercased, count hits among `["session","abstract","programme","program","agenda","schedule","presentation","poster"]`; `looksLikeAgenda = hits >= 2`. Reason string reports keyword count. Never throws — catches and returns `{ok:false, status:0}`.

**Result contracts:**
```ts
interface AutoBuildAttempt { url; title; status: "ok"|"empty"|"failed"|"cached"; sessions: number; reason?: string }
interface DistributeSummary { newSessions: number; postersCreated: number; endpointsCreated: number }
interface AutoBuildResult {
  query; sourceUrl: string|null; sessions: ExtractedSession[];
  attempts: AutoBuildAttempt[]; warning?: string;
  fromCache: boolean; cachedAt?: string; distributed: DistributeSummary;
}
```

### 5.4 `autoBuildFromName` algorithm (exact order)

```
limit   = input.limit ?? 40
maxAge  = input.maxAgeHours ?? 24

1. CACHE PATH — skipped when refresh === true
   loadCache(conferenceId, sourceUrl=null, query, maxAge):
     SELECT * FROM extraction_cache
       WHERE conference_id = ? AND scraped_at >= now() - maxAge hours
         AND query = ?
       ORDER BY scraped_at DESC LIMIT 1
   If hit AND cached.sessions is a non-empty array:
     - distributeSessions(conferenceId, cached.sessions, cached.source_url)
     - logRun(status:"cached", fromCache:true, attempts:[{url, title:"Cache", status:"cached", sessions:n}])
     - RETURN { fromCache:true, cachedAt: cached.scraped_at, ... }

2. FRESH PATH
   candidates = searchAgendaUrls(query)
   If candidates.length === 0:
     warning = "No candidate URLs found — try a more specific name."
     logRun(status:"empty"); RETURN empty result with warning.

   FOR each of candidates.slice(0, 4):        // max 4 attempts
     try:
       sessions = ingestOnce(url, limit)
       if sessions.length > 0:
         attempts.push({status:"ok", sessions:n})
         saveCache(conferenceId, url, query, sessions)     // upsert on (conference_id, source_url)
         distributed = distributeSessions(conferenceId, sessions, url)
         logRun(status:"ok", fromCache:false, attempts)
         RETURN success                                     // FIRST success wins, stop looping
       attempts.push({status:"empty", sessions:0})
     catch e:
       attempts.push({status:"failed", sessions:0, reason:e.message})

3. ALL FAILED
   warning = "Tried the top candidates but none returned sessions. Paste a direct agenda URL below."
   logRun(status:"failed", attempts); RETURN empty result with warning + attempts.
```

### 5.5 `distributeSessions(conferenceId, sessions, sourceUrl)` — fan-out

Uses `supabaseAdmin` (service role, bypasses RLS). Steps, in order:

1. **Load existing** `sessions` rows for the conference (`id, title, trial_id`). Build `seenTitles` (lowercased trimmed titles) and `seenTrials` (lowercased trimmed trial IDs).
2. **Insert new sessions** — keep rows with a non-empty title whose lowercased title is not in `seenTitles`. Map camelCase → snake_case; `trial_id` is `null` when empty; `source_url` = the ingest URL. Insert and `.select("id")`; `newSessions` = inserted count. **Throws** `"Session distribution failed: <msg>"` on error.
3. **Insert posters** — a session is a poster if `/poster/i` matches `asset` OR `room` OR `title`. Poster rows default `captured_by:""`, `ocr_status:"queued"`, `summary:[]`, `significant:false`, `contradictory:false`, `source_quote:""`, `page:1`; `captured_at` = the session `time`. Dedupe against existing poster titles. Insert errors are **swallowed** (best-effort); `postersCreated` = inserted count.
4. **Insert endpoint stubs** — one per unique new `trialId` not already in `seenTrials`. Row: `trial_name` = the source session title, `asset` from the session, `endpoint_type:"Primary"`, and `endpoint/value/p_value/hr/ci` = `""` (deliberately blank — no inferred clinical values, ever). Dedupe against existing `endpoints.trial_id`. Errors swallowed. `endpointsCreated` = inserted count.
5. **Recount** `sessions` for the conference (`count:"exact", head:true`) and `UPDATE conferences SET session_count = <count>`.
6. Return `{ newSessions, postersCreated, endpointsCreated }`.

**Non-negotiable rule (regulated-industry constraint):** the pipeline never fabricates clinical values. Absent fields are stored as `""`, and every extracted value carries a confidence score.

---

## 6. Client derivation logic (in the route file)

### 6.1 Session type derivation

Ordered list `SESSION_TYPES` (key, icon, tone):

| Key | Icon | Tone |
|---|---|---|
| Late-Breaking | Flame | danger |
| Plenary | Star | primary |
| Keynote | Star | primary |
| Proffered Paper | Mic | success |
| Mini Oral | Mic | success |
| Poster Discussion | Presentation | warning |
| Poster | Presentation | muted |
| Symposium | Layers | primary |
| Educational | BookOpen | muted |
| Meet the Expert | Users | muted |
| Industry | Building2 | muted |
| Workshop | Layers | muted |
| Session | Radio | muted (fallback) |

`deriveType(title)` — lowercase the title, return the **first** match, in this exact order:
```
/\blba\b|late[- ]breaking/     → Late-Breaking
/plenary/                      → Plenary
/keynote/                      → Keynote
/proffered/                    → Proffered Paper
/mini[- ]oral/                 → Mini Oral
/poster discussion|poster spotlight/ → Poster Discussion
/poster/                       → Poster
/symposium/                    → Symposium
/educational|tutorial/         → Educational
/meet the expert|ask the expert/ → Meet the Expert
/industry|satellite|sponsored/ → Industry
/workshop/                     → Workshop
otherwise                      → Session
```

`toneClasses(tone)` maps to semantic token classes only — never raw colours:
- danger → `bg-destructive/10 text-destructive border-destructive/30`
- success → `bg-success/10 text-success border-success/30`
- warning → `bg-warning/10 text-warning border-warning/30`
- primary → `bg-primary/10 text-primary border-primary/30`
- default → `bg-muted text-muted-foreground border-border`

### 6.2 Indication derivation

`deriveIndication(session)`: if `session.therapyArea` is non-empty, use it verbatim (trimmed). Otherwise test the title against `INDICATION_PATTERNS` in order and return the first label. Fallback: `"General Oncology"`.

```
nsclc|non[- ]small cell        → NSCLC
sclc|small[- ]cell lung        → SCLC
breast                         → Breast
prostate                       → Prostate
ovarian                        → Ovarian
colorectal|crc                 → Colorectal
pancrea                        → Pancreatic
gastric|gastro[- ]?esophageal  → Gastric / GEJ
hepatocellular|hcc|liver       → HCC
melanoma                       → Melanoma
renal|rcc|kidney               → RCC
bladder|urothelial             → Urothelial
head and neck|hnscc            → Head & Neck
glioblastoma|glioma|brain      → CNS / Glioma
leukemia|aml|cll               → Leukemia
lymphoma|dlbcl                 → Lymphoma
myeloma                        → Multiple Myeloma
cervical                       → Cervical
endometrial                    → Endometrial
sarcoma                        → Sarcoma
```
(all case-insensitive)

Every session is memoised into `EnrichedSession = Session & { _type, _ind }`.

---

## 7. UI specification

### 7.1 Route shell

```ts
export const Route = createFileRoute("/pre/extraction")({
  head: () => routeSeo({
    title: "Conference Calendar — Pharmalix",
    description: "Explore the full ESMO 2026 program in one place — browse sessions by type, day, and indication, and plan your attendance faster than the source website.",
    path: "/pre/extraction",
  }),
  component: ConferenceCalendar,
});

const ESMO_URL = "https://cslide.ctimeetingtech.com/esmo2026/attendee/confcal";
```

Container: `mx-auto max-w-7xl`.

### 7.2 Page header

`<PageHeader eyebrow="Module A · Pre-Conference" title="Conference Calendar" description="One structured view of every session, poster, and late-breaker — filter, plan and prepare in minutes." />`

**Actions (rendered only when `hasData`):**
- **Refresh** (outline, `RotateCw`, spinner while building) → `handleAutoBuild({ refresh: true })`.
- **Send to Session Planner** (primary, `ArrowRight`) → invalidate `["sessions", conference.id]`, toast `"{n} sessions available in Session Planner"`, `navigate({ to: "/pre/planner" })`.

### 7.3 Hero card

- Card with `border-primary/20`; inner panel `bg-gradient-to-br from-primary via-primary to-primary/70`, `text-primary-foreground`, plus a 10%-opacity radial dot pattern overlay (`radial-gradient(circle at 20% 20%, white 1px, transparent 1px)`, `24px 24px`).
- Eyebrow "Active conference" → `conference.name` as `<h2>` in display font, 3xl→4xl.
- Meta row with icons: `Calendar` `{startDate} → {endDate}`, `MapPin` `{location}`, `Users` `{delegateCount} delegates`.
- Therapy-area badges: first 6, translucent white pills.
- When `!hasData && !isLoading`: a large secondary button `Load {acronym} program` (`Sparkles` / spinner) → `handleLoadEsmo()`.

### 7.4 KPI strip (only when `hasData`)

A bordered grid, `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` with dividers. Six `<Stat>` tiles (icon in a rounded `bg-muted` square, big number, uppercase 11px label):

| Label | Value | Icon |
|---|---|---|
| Sessions | total enriched count | Radio |
| Late-Breaking | count of `_type === "Late-Breaking"` | Flame (`text-destructive` accent) |
| Days | distinct non-empty `day` values | Calendar |
| Indications | distinct `_ind` values | Layers |
| Rooms | distinct non-empty `room` values | MapPin |
| Presenters | distinct first author (`authors.split(",")[0].trim()`) | Users |

### 7.5 Data-source panel (Collapsible card, collapsed by default)

Trigger row: `Database` icon + "Data source" + subtext — `"{n} sessions loaded · click to refresh or import another program"` when data exists, otherwise `"Import a live program to populate the calendar"`. Chevron rotates 180° when open.

Content, two columns on `md`:
1. **Auto-build by conference name** — search-icon input (default value `"ESMO 2026"`), Enter submits, `Build` button (`Wand2` / spinner) → `handleAutoBuild()`.
2. **Import from URL** — input pre-filled with `ESMO_URL`, `Import` button (secondary, `Sparkles`) → `handleLoadEsmo()`.

Below, when `attempts.length > 0`: a **Recent attempts** list — one row per attempt, truncated URL on the left, and on the right either a success badge `"{n} sessions"` (`bg-success/10 text-success`) for status `ok`/`cached`, or a muted badge showing the raw status.

### 7.6 Body states

- **Loading** → four `Skeleton` blocks (`h-20 w-full`).
- **Empty** → `EmptyState`: dashed card, `Sparkles` in a rounded primary tint square, heading "Load the ESMO 2026 program in one click", body "Pharmalix will fetch the official programme, extract every session with AI, and organize it by type, day, and indication — better than the source calendar.", large `Import from cslide.ctimeetingtech.com` button, footnote "Extraction may take 30-60 seconds on first run."
- **Filtered to nothing** → `EmptyResult`: dashed card, "No sessions match the current filters."

### 7.7 Type chips row

One pill per session type **actually present** in the data, in canonical `SESSION_TYPES` order. Each pill: type icon + label + count. Clicking toggles that type in the multi-select `typeFilter`. Active pills use the tone classes + `ring-2 ring-primary/30`; inactive are neutral with hover. A **Clear filters** text link appears whenever any filter is active and resets all four filter states.

### 7.8 Filter bar

- **Search input** (flex-1, min-width 240px, `Search` icon) — case-insensitive substring across `title + authors + room + trialId`.
- **Indication dropdown** — `DropdownMenuCheckboxItem` multi-select over all derived indications, scrollable (`max-h-80`), badge shows selection count.
- **Day dropdown** — single-select: "All days" plus each distinct day.
- **Late-breaking only** toggle button (`Flame`) — variant flips `default` ↔ `outline`.
- Right-aligned counter: `Showing <b>{filtered}</b> of {total}`.

Filter predicate (all conditions AND-ed; empty set = no constraint):
```
search matches haystack
&& (typeFilter.size === 0 || typeFilter.has(s._type))
&& (indFilter.size  === 0 || indFilter.has(s._ind))
&& (dayFilter === "all"   || s.day === dayFilter)
&& (!lbaOnly || s._type === "Late-Breaking")
```

### 7.9 View tabs (default `timeline`)

1. **Timeline** (`Clock`) — group by `day` (empty → `"Unscheduled"`), sort groups by day string ascending, sort within group by `time` string ascending. Group header: uppercase primary day label + `{n} sessions` + hairline rule.
2. **By Type** (`Layers`) — group by `_type`, ordered by the canonical `SESSION_TYPES` order.
3. **By Indication** (`Radio`) — group by `_ind`, ordered by **descending group size**.

Groups 2 and 3 share one `GroupedView` component taking `keyOf` and optional `order`.

### 7.10 `SessionRow` card

Hover: `hover:border-primary/40 hover:shadow-sm`. Three regions:

- **Time column** — fixed `w-20`, right border, centered. Monospace tabular time (or `—`), below it a 10px uppercase day (or `TBA`).
- **Main** — badge row: type chip (icon + uppercase label, tone-coloured), outline indication badge, monospace `trialId` badge when present, `MapPin` + room when present. Then the title (`line-clamp-2`, medium weight), then authors (`line-clamp-1`, muted) with `· affiliation` appended at 70% opacity.
- **Actions** — when `sourceUrl` exists, a ghost icon button `ExternalLink` opening the session on the conference site in a new tab (tooltip: "Open on conference site"); then a ghost `Plan →` link to `/pre/planner`.

### 7.11 Handlers

**`handleLoadEsmo()`**
```
setImporting(true); setAttempts([])
res = ingestConferenceUrl({ url: ESMO_URL })      // preview probe
if res.sessions.length === 0 → toast.warning(res.warning ?? "No sessions found — try Auto-build instead")
else:
  persisted = autoBuildFromName({ query:"ESMO 2026", conferenceId, refresh:true })   // persistence + distribution
  setAttempts(persisted.attempts)
  toast.success(`Loaded ${persisted.sessions.length} sessions · +${persisted.distributed.newSessions} new`)
  invalidate ["sessions",id], ["posters",id], ["endpoints",id]
catch → toast.error(message); finally → setImporting(false)
```
(`ingestConferenceUrl` is preview-only and does not write; `autoBuildFromName` performs the actual persistence — this two-step is intentional.)

**`handleAutoBuild({ refresh })`**
```
if !nameQuery.trim() return
setBuilding(true); setAttempts([])
res = autoBuildFromName({ query: nameQuery.trim(), conferenceId, refresh: refresh ?? false })
setAttempts(res.attempts)
if res.sessions.length > 0:
  host = new URL(res.sourceUrl).hostname
  toast.success(`${res.fromCache ? "Loaded from cache" : "Built"} ${n} sessions from ${host}`)
  invalidate sessions / posters / endpoints
else toast.warning(res.warning ?? "No sessions found")
catch → toast.error; finally → setBuilding(false)
```

### 7.12 Component state

```ts
importOpen: boolean = false
nameQuery: string   = "ESMO 2026"
urlInput: string    = ESMO_URL
building: boolean   = false
importing: boolean  = false
attempts: AutoBuildAttempt[] = []
search: string = ""
typeFilter: Set<SessionType> = new Set()
indFilter: Set<string> = new Set()
dayFilter: string = "all"
lbaOnly: boolean = false
```
Generic `toggle(set, val, setter)` clones the Set, adds/removes, and sets — never mutates in place.

---

## 8. Cross-module data flow

```text
                    ┌──────────────────────────┐
   "ESMO 2026"  ──► │  Firecrawl v2 /search    │  (top 10 → ranked → top 6 → try 4)
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
   direct URL  ────► │ Firecrawl scrape → MD    │  (onlyMainContent, 40k cap)
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Gemini 3 Flash extract   │  → ExtractedSession[] + confidence
                    └────────────┬─────────────┘
                                 ▼
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
     extraction_cache                        extraction_runs
     (24h TTL, per conf+url)                 (audit trail, attempts)
              │
              ▼  distributeSessions()  (dedupe by title / trial_id)
      ┌───────┼────────────────┬─────────────────────┐
      ▼       ▼                ▼                     ▼
   sessions  posters       endpoints        conferences.session_count
      │         │              │
      ▼         ▼              ▼
 Session    Evidence      Endpoint          → Insight Synthesis
 Planner    Capture       Extractor         → Deliverables (PDF export)
 (/pre/planner) (/live/capture) (/post/endpoints)
```

**Refresh behaviour:** re-running auto-build without `refresh` reuses a cache entry younger than 24 h; the `Refresh` button forces `refresh:true`, re-searches, re-scrapes, upserts the cache, and distributes only genuinely new rows. Sessions added to the source website later are therefore picked up on refresh and appended without duplicating existing rows.

---

## 9. Design system constraints

- **Never** hardcode colour utilities (`text-white`, `bg-black`, `bg-[#hex]`). Use semantic tokens: `primary`, `destructive`, `success`, `warning`, `muted`, `border`, `foreground`.
- Design language: "Clean Authority" — vivid blue primary `#0052CC`, navy sidebar, generous whitespace, 12px card radius.
- Typography: **Space Grotesk** for display/headings (`font-display`), **Inter** for body. Fonts loaded via `<link>` in `src/routes/__root.tsx` (never `@import` a remote URL in `styles.css`).
- Numbers in tables/timelines use `font-mono tabular-nums`.
- Every claim surfaced anywhere in the product carries source attribution (quote, page, confidence) — this module's contribution is `source_url` + per-field confidence.

---

## 10. Acceptance criteria

1. Visiting `/pre/extraction` with an empty database shows the hero plus the one-click load CTA — no crash, no console errors.
2. Clicking **Load ESMO 2026 program** scrapes, extracts, persists, and re-renders with populated KPIs within ~60 s.
3. KPI counts equal the derived values exactly (sessions, LBA, days, indications, rooms, presenters).
4. Type chips list only types present, in canonical order, with correct counts; clicking filters and can multi-select.
5. Search, indication multi-select, day select, and LBA toggle compose correctly (AND) and the counter matches the rendered rows.
6. All three view tabs render the same filtered set, grouped and sorted per spec.
7. Sessions with `sourceUrl` expose a working external link.
8. **Send to Session Planner** navigates to `/pre/planner` where the same sessions appear in the extracted-sessions table.
9. Re-running auto-build within 24 h reports "Loaded from cache"; **Refresh** reports "Built … from <host>".
10. Re-running never duplicates sessions, posters, or endpoints (dedupe by lowercased title / trial ID).
11. `extraction_runs` gains exactly one row per invocation with accurate counts and attempts.
12. `conferences.session_count` matches the live row count after every distribution.
13. No extracted numeric clinical value is ever invented — absent fields persist as `""` with low confidence.

---

## 11. Known limitations / non-goals

- Login-gated or purely JS-rendered congress portals may return no readable content; the UI falls back to the "paste a direct agenda URL" path.
- Endpoint rows created by distribution are **stubs** (trial ID + name only); clinical values are filled in by the Post-Conference Endpoint Extractor.
- Poster rows are created with `ocr_status: "queued"` and empty summaries; OCR happens in Evidence Capture.
- Extraction caps at 40 sessions per page by default (max 80) — very large programmes need multiple source URLs.
- No authentication: single-tenant app with permissive RLS by explicit product decision.
