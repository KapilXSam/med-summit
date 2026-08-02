import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPublicHttpUrl, isPublicHttpUrl } from "./safe-url";
import type { ExtractedSession, IngestResult } from "./extraction-types";

const CONF_THRESHOLD = 70;

const publicUrl = z
  .string()
  .url()
  .refine(isPublicHttpUrl, { message: "URL must be a public http(s) address" });

const IngestInput = z.object({
  url: publicUrl,
  limit: z.number().min(1).max(80).optional(),
});

const RetryInput = z.object({
  url: publicUrl,
  sessionTitle: z.string().min(1),
  field: z.string().min(1),
});

const SuggestInput = z.object({
  query: z.string().min(2).max(200),
});

const CheckInput = z.object({
  url: publicUrl,
});


export interface UrlSuggestion {
  url: string;
  title: string;
  description: string;
}

export interface UrlCheckResult {
  ok: boolean;
  status: number;
  contentType?: string;
  looksLikeAgenda: boolean;
  reason?: string;
}

const FIELD_KEYS = [
  "title",
  "authors",
  "affiliation",
  "day",
  "time",
  "room",
  "trialId",
  "therapyArea",
  "asset",
];

async function scrapeMarkdown(rawUrl: string): Promise<string> {
  const url = assertPublicHttpUrl(rawUrl);
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("Firecrawl is not configured");
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  const firecrawl = new Firecrawl({ apiKey });
  const result = await firecrawl.scrape(url, {
    formats: ["markdown"],
    onlyMainContent: true,
  });
  const md =
    (result as { markdown?: string }).markdown ??
    (result as { data?: { markdown?: string } }).data?.markdown ??
    "";
  if (!md) throw new Error("No readable content found at that URL");
  return md.slice(0, 40000);
}

function parseJson<T>(text: string): T | null {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf("[") >= 0 ? raw.indexOf("[") : raw.indexOf("{");
    const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
    if (start < 0 || end < 0) return null;
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export const ingestConferenceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IngestInput.parse(input))
  .handler(async ({ data }): Promise<IngestResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const markdown = await scrapeMarkdown(data.url);
    const gateway = createLovableAiGatewayProvider(apiKey);
    const limit = data.limit ?? 40;

    const prompt = `You are a medical-conference agenda extraction engine. From the page content below, extract every scientific session, abstract, or presentation you can find (up to ${limit}).

For EACH session return an object with these string fields (use "" when a value is genuinely absent — never guess or infer):
- title, authors, affiliation, day, time, room, trialId, therapyArea, asset

Also return "fieldConfidence": an object mapping each of those field names to an integer 0-100 reflecting how directly the value was stated on the page. Use a LOW score (< ${CONF_THRESHOLD}) when the value was ambiguous, inferred, or missing. Also return "confidence": an integer 0-100 overall for the row.

Only extract values that appear in the source. Do not fabricate trial IDs, times, or rooms.

Return ONLY a JSON array, no prose. Shape:
[{"title":"","authors":"","affiliation":"","day":"","time":"","room":"","trialId":"","therapyArea":"","asset":"","confidence":85,"fieldConfidence":{"title":95,"authors":80,"affiliation":60,"day":90,"time":90,"room":40,"trialId":30,"therapyArea":85,"asset":70}}]

PAGE CONTENT:
${markdown}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });

    const parsed = parseJson<Record<string, unknown>[]>(text);
    if (!parsed || !Array.isArray(parsed)) {
      return { sourceUrl: data.url, sessions: [], warning: "Could not parse extraction output." };
    }

    const sessions: ExtractedSession[] = parsed.slice(0, limit).map((raw, i) => {
      const fc: Record<string, number> = {};
      const rawFc = (raw.fieldConfidence ?? {}) as Record<string, unknown>;
      for (const k of FIELD_KEYS) {
        const v = Number(rawFc[k]);
        fc[k] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 50;
      }
      const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
      const overall = Number(raw.confidence);
      return {
        id: `ext-${i}`,
        title: str("title"),
        authors: str("authors"),
        affiliation: str("affiliation"),
        day: str("day"),
        time: str("time"),
        room: str("room"),
        trialId: str("trialId"),
        therapyArea: str("therapyArea"),
        asset: str("asset"),
        confidence: Number.isFinite(overall)
          ? Math.max(0, Math.min(100, Math.round(overall)))
          : Math.round(FIELD_KEYS.reduce((a, k) => a + fc[k], 0) / FIELD_KEYS.length),
        fieldConfidence: fc,
      };
    });

    return { sourceUrl: data.url, sessions };
  });

export const retryFieldExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RetryInput.parse(input))
  .handler(async ({ data }): Promise<{ value: string; confidence: number }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured");

    const markdown = await scrapeMarkdown(data.url);
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `From the conference page content below, extract ONLY the "${data.field}" for the session titled "${data.sessionTitle}".

Return ONLY a JSON object: {"value":"<the extracted value or empty string>","confidence":<0-100 integer>}
Use a low confidence and empty value if it is not clearly stated. Do not fabricate.

PAGE CONTENT:
${markdown}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });

    const parsed = parseJson<{ value?: string; confidence?: number }>(text);
    const value = typeof parsed?.value === "string" ? parsed.value : "";
    const conf = Number(parsed?.confidence);
    return {
      value,
      confidence: Number.isFinite(conf) ? Math.max(0, Math.min(100, Math.round(conf))) : 50,
    };
  });

export const suggestConferenceUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data }): Promise<UrlSuggestion[]> => {
    const fcKey = process.env.FIRECRAWL_API_KEY;
    if (!fcKey) throw new Error("Firecrawl is not configured");
    const query = `${data.query} scientific programme agenda sessions abstracts`;

    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fcKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 8 }),
    });
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const json = (await res.json()) as {
      data?:
        | Array<{ url?: string; title?: string; description?: string }>
        | {
            web?: Array<{ url?: string; title?: string; description?: string }>;
            news?: Array<{ url?: string; title?: string; description?: string }>;
          };
      web?: Array<{ url?: string; title?: string; description?: string }>;
      results?: Array<{ url?: string; title?: string; description?: string }>;
    };
    const items: Array<{ url?: string; title?: string; description?: string }> =
      Array.isArray(json.data)
        ? json.data
        : (json.data?.web ??
          json.data?.news ??
          json.web ??
          json.results ??
          []);

    const suggestions: UrlSuggestion[] = [];
    const seen = new Set<string>();
    const agendaHint =
      /(agenda|program(me)?|session|abstract|schedule|scientific|congress|meeting)/i;
    for (const it of items) {
      if (!it.url || seen.has(it.url)) continue;
      seen.add(it.url);
      const title = it.title ?? it.url;
      const desc = it.description ?? "";
      const score =
        (agendaHint.test(title) ? 1 : 0) + (agendaHint.test(desc) ? 1 : 0);
      if (!isPublicHttpUrl(it.url)) continue;
      suggestions.push({ url: it.url, title, description: desc });
      // prioritize agenda-y ones by pushing others down
      if (score === 0 && suggestions.length > 5) break;
    }
    return suggestions
      .sort((a, b) => {
        const sa = (agendaHint.test(a.title) ? 2 : 0) + (agendaHint.test(a.description) ? 1 : 0);
        const sb = (agendaHint.test(b.title) ? 2 : 0) + (agendaHint.test(b.description) ? 1 : 0);
        return sb - sa;
      })
      .slice(0, 6);
  });

export const checkAgendaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data }): Promise<UrlCheckResult> => {
    try {
      const safeUrl = assertPublicHttpUrl(data.url);
      const r = await fetch(safeUrl, {
        method: "GET",
        headers: { "User-Agent": "Mozilla/5.0 Pharmalix/1.0" },
        redirect: "follow",
      });
      const contentType = r.headers.get("content-type") ?? "";
      if (!r.ok) {
        return {
          ok: false,
          status: r.status,
          contentType,
          looksLikeAgenda: false,
          reason: `HTTP ${r.status}`,
        };
      }
      const text = (await r.text()).slice(0, 60000).toLowerCase();
      const hits = [
        "session",
        "abstract",
        "programme",
        "program",
        "agenda",
        "schedule",
        "presentation",
        "poster",
      ].filter((k) => text.includes(k)).length;
      const looksLikeAgenda = hits >= 2;
      return {
        ok: true,
        status: r.status,
        contentType,
        looksLikeAgenda,
        reason: looksLikeAgenda
          ? `Detected ${hits} agenda keywords`
          : "Page reachable but no agenda keywords detected",
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        looksLikeAgenda: false,
        reason: e instanceof Error ? e.message : "Fetch failed",
      };
    }
  });

const AutoBuildInput = z.object({
  query: z.string().min(2).max(200),
  conferenceId: z.string().min(1),
  limit: z.number().min(1).max(80).optional(),
  refresh: z.boolean().optional(),
  maxAgeHours: z.number().min(0).max(720).optional(),
});

const HistoryInput = z.object({
  conferenceId: z.string().min(1),
  limit: z.number().min(1).max(50).optional(),
});

export interface AutoBuildAttempt {
  url: string;
  title: string;
  status: "ok" | "empty" | "failed" | "cached";
  sessions: number;
  reason?: string;
}

export interface DistributeSummary {
  newSessions: number;
  postersCreated: number;
  endpointsCreated: number;
}

export interface AutoBuildResult {
  query: string;
  sourceUrl: string | null;
  sessions: ExtractedSession[];
  attempts: AutoBuildAttempt[];
  warning?: string;
  fromCache: boolean;
  cachedAt?: string;
  distributed: DistributeSummary;
}

export interface ExtractionRunRow {
  id: string;
  query: string | null;
  sourceUrl: string | null;
  status: string;
  sessionCount: number;
  newSessions: number;
  postersCreated: number;
  endpointsCreated: number;
  fromCache: boolean;
  reason: string | null;
  attempts: AutoBuildAttempt[];
  createdAt: string;
}

export interface ExtractionCacheRow {
  id: string;
  sourceUrl: string;
  query: string | null;
  sessionCount: number;
  scrapedAt: string;
}


async function searchAgendaUrls(query: string): Promise<UrlSuggestion[]> {
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!fcKey) throw new Error("Firecrawl is not configured");
  const q = `${query} scientific programme agenda sessions abstracts`;
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fcKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: q, limit: 10 }),
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = (await res.json()) as {
    data?:
      | Array<{ url?: string; title?: string; description?: string }>
      | {
          web?: Array<{ url?: string; title?: string; description?: string }>;
          news?: Array<{ url?: string; title?: string; description?: string }>;
        };
    web?: Array<{ url?: string; title?: string; description?: string }>;
    results?: Array<{ url?: string; title?: string; description?: string }>;
  };
  const items = Array.isArray(json.data)
    ? json.data
    : (json.data?.web ?? json.data?.news ?? json.web ?? json.results ?? []);
  const agendaHint =
    /(agenda|program(me)?|session|abstract|schedule|scientific|congress|meeting)/i;
  const seen = new Set<string>();
  const out: UrlSuggestion[] = [];
  for (const it of items) {
    if (!it.url || seen.has(it.url)) continue;
    seen.add(it.url);
    out.push({ url: it.url, title: it.title ?? it.url, description: it.description ?? "" });
  }
  return out
    .sort((a, b) => {
      const sa = (agendaHint.test(a.title) ? 2 : 0) + (agendaHint.test(a.description) ? 1 : 0);
      const sb = (agendaHint.test(b.title) ? 2 : 0) + (agendaHint.test(b.description) ? 1 : 0);
      return sb - sa;
    })
    .slice(0, 6);
}

async function ingestOnce(url: string, limit: number): Promise<ExtractedSession[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");
  const markdown = await scrapeMarkdown(url);
  const gateway = createLovableAiGatewayProvider(apiKey);
  const prompt = `You are a medical-conference agenda extraction engine. From the page content below, extract every scientific session, abstract, or presentation you can find (up to ${limit}).

For EACH session return an object with these string fields (use "" when a value is genuinely absent — never guess or infer):
- title, authors, affiliation, day, time, room, trialId, therapyArea, asset

Also return "fieldConfidence": an object mapping each of those field names to an integer 0-100. Also return "confidence": overall 0-100.

Return ONLY a JSON array, no prose.

PAGE CONTENT:
${markdown}`;
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    prompt,
  });
  const parsed = parseJson<Record<string, unknown>[]>(text);
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.slice(0, limit).map((raw, i) => {
    const fc: Record<string, number> = {};
    const rawFc = (raw.fieldConfidence ?? {}) as Record<string, unknown>;
    for (const k of FIELD_KEYS) {
      const v = Number(rawFc[k]);
      fc[k] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 50;
    }
    const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
    const overall = Number(raw.confidence);
    return {
      id: `ext-${i}`,
      title: str("title"),
      authors: str("authors"),
      affiliation: str("affiliation"),
      day: str("day"),
      time: str("time"),
      room: str("room"),
      trialId: str("trialId"),
      therapyArea: str("therapyArea"),
      asset: str("asset"),
      confidence: Number.isFinite(overall)
        ? Math.max(0, Math.min(100, Math.round(overall)))
        : Math.round(FIELD_KEYS.reduce((a, k) => a + fc[k], 0) / FIELD_KEYS.length),
      fieldConfidence: fc,
    };
  });
}

async function distributeSessions(
  conferenceId: string,
  sessions: ExtractedSession[],
  sourceUrl: string,
): Promise<DistributeSummary> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Existing sessions in this conference — used to dedupe.
  const { data: existing } = await supabaseAdmin
    .from("sessions")
    .select("id, title, trial_id")
    .eq("conference_id", conferenceId);
  const seenTitles = new Set(
    (existing ?? []).map((r) => (r.title ?? "").trim().toLowerCase()),
  );
  const seenTrials = new Set(
    (existing ?? []).map((r) => (r.trial_id ?? "").trim().toLowerCase()).filter(Boolean),
  );

  const isPoster = (s: ExtractedSession) =>
    /poster/i.test(s.asset) || /poster/i.test(s.room) || /poster/i.test(s.title);

  const sessionRows = sessions
    .filter((s) => s.title.trim() && !seenTitles.has(s.title.trim().toLowerCase()))
    .map((s) => ({
      conference_id: conferenceId,
      title: s.title,
      authors: s.authors || "",
      affiliation: s.affiliation || "",
      day: s.day || "",
      time: s.time || "",
      room: s.room || "",
      trial_id: s.trialId || null,
      therapy_area: s.therapyArea || "",
      asset: s.asset || "",
      confidence: s.confidence ?? 0,
      source_url: sourceUrl,
    }));

  let newSessions = 0;
  if (sessionRows.length > 0) {
    const { data: inserted, error } = await supabaseAdmin
      .from("sessions")
      .insert(sessionRows)
      .select("id");
    if (error) throw new Error(`Session distribution failed: ${error.message}`);
    newSessions = inserted?.length ?? 0;
  }

  // Posters: sessions tagged as posters
  const posterCandidates = sessions.filter(isPoster);
  const posterRows = posterCandidates
    .filter((s) => s.title.trim())
    .map((s) => ({
      conference_id: conferenceId,
      title: s.title,
      presenter: s.authors || "",
      captured_by: "",
      captured_at: s.time || "",
      therapy_area: s.therapyArea || "",
      ocr_status: "queued",
      summary: [],
      significant: false,
      contradictory: false,
      source_quote: "",
      page: 1,
      confidence: s.confidence ?? 0,
    }));
  let postersCreated = 0;
  if (posterRows.length > 0) {
    // Dedupe against existing posters by title
    const { data: existingPosters } = await supabaseAdmin
      .from("posters")
      .select("title")
      .eq("conference_id", conferenceId);
    const seenPoster = new Set(
      (existingPosters ?? []).map((r) => (r.title ?? "").trim().toLowerCase()),
    );
    const fresh = posterRows.filter((r) => !seenPoster.has(r.title.trim().toLowerCase()));
    if (fresh.length > 0) {
      const { data: ins, error } = await supabaseAdmin.from("posters").insert(fresh).select("id");
      if (!error) postersCreated = ins?.length ?? 0;
    }
  }

  // Endpoints: one stub per unique new trial_id
  const trialIds = Array.from(
    new Set(
      sessions
        .map((s) => (s.trialId || "").trim())
        .filter((t) => t && !seenTrials.has(t.toLowerCase())),
    ),
  );
  let endpointsCreated = 0;
  if (trialIds.length > 0) {
    const rows = trialIds.map((tid) => {
      const src = sessions.find((s) => (s.trialId || "").trim() === tid);
      return {
        conference_id: conferenceId,
        trial_id: tid,
        trial_name: src?.title ?? tid,
        asset: src?.asset ?? "",
        endpoint_type: "Primary",
        endpoint: "",
        value: "",
        p_value: "",
        hr: "",
        ci: "",
      };
    });
    const { data: existingEp } = await supabaseAdmin
      .from("endpoints")
      .select("trial_id")
      .eq("conference_id", conferenceId);
    const seenEp = new Set((existingEp ?? []).map((r) => (r.trial_id ?? "").toLowerCase()));
    const fresh = rows.filter((r) => !seenEp.has(r.trial_id.toLowerCase()));
    if (fresh.length > 0) {
      const { data: ins, error } = await supabaseAdmin.from("endpoints").insert(fresh).select("id");
      if (!error) endpointsCreated = ins?.length ?? 0;
    }
  }

  // Bump session_count on the conference so cards reflect reality.
  const { count } = await supabaseAdmin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("conference_id", conferenceId);
  if (typeof count === "number") {
    await supabaseAdmin
      .from("conferences")
      .update({ session_count: count })
      .eq("id", conferenceId);
  }

  return { newSessions, postersCreated, endpointsCreated };
}

async function loadCache(
  conferenceId: string,
  sourceUrl: string | null,
  query: string | null,
  maxAgeHours: number,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - maxAgeHours * 3600_000).toISOString();
  let q = supabaseAdmin
    .from("extraction_cache")
    .select("*")
    .eq("conference_id", conferenceId)
    .gte("scraped_at", cutoff)
    .order("scraped_at", { ascending: false })
    .limit(1);
  if (sourceUrl) q = q.eq("source_url", sourceUrl);
  else if (query) q = q.eq("query", query);
  const { data } = await q;
  return data?.[0] ?? null;
}

async function saveCache(
  conferenceId: string,
  sourceUrl: string,
  query: string,
  sessions: ExtractedSession[],
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("extraction_cache")
    .upsert(
      {
        conference_id: conferenceId,
        source_url: sourceUrl,
        query,
        sessions: sessions as unknown as never,
        session_count: sessions.length,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "conference_id,source_url" },
    );
}

async function logRun(row: {
  conferenceId: string;
  query: string;
  sourceUrl: string | null;
  status: string;
  sessionCount: number;
  newSessions: number;
  postersCreated: number;
  endpointsCreated: number;
  fromCache: boolean;
  reason?: string;
  attempts: AutoBuildAttempt[];
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("extraction_runs").insert({
    conference_id: row.conferenceId,
    query: row.query,
    source_url: row.sourceUrl,
    status: row.status,
    session_count: row.sessionCount,
    new_sessions: row.newSessions,
    posters_created: row.postersCreated,
    endpoints_created: row.endpointsCreated,
    from_cache: row.fromCache,
    reason: row.reason ?? null,
    attempts: row.attempts as unknown as never,
  });
}

export const autoBuildFromName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AutoBuildInput.parse(input))
  .handler(async ({ data }): Promise<AutoBuildResult> => {
    const limit = data.limit ?? 40;
    const maxAge = data.maxAgeHours ?? 24;

    // 1) Cache hit path
    if (!data.refresh) {
      const cached = await loadCache(data.conferenceId, null, data.query, maxAge);
      if (cached && Array.isArray(cached.sessions) && cached.sessions.length > 0) {
        const sessions = cached.sessions as unknown as ExtractedSession[];
        const distributed = await distributeSessions(
          data.conferenceId,
          sessions,
          cached.source_url,
        );
        await logRun({
          conferenceId: data.conferenceId,
          query: data.query,
          sourceUrl: cached.source_url,
          status: "cached",
          sessionCount: sessions.length,
          newSessions: distributed.newSessions,
          postersCreated: distributed.postersCreated,
          endpointsCreated: distributed.endpointsCreated,
          fromCache: true,
          attempts: [
            { url: cached.source_url, title: "Cache", status: "cached", sessions: sessions.length },
          ],
        });
        return {
          query: data.query,
          sourceUrl: cached.source_url,
          sessions,
          attempts: [
            { url: cached.source_url, title: "Cache", status: "cached", sessions: sessions.length },
          ],
          fromCache: true,
          cachedAt: cached.scraped_at,
          distributed,
        };
      }
    }

    // 2) Fresh search + extract
    const candidates = (await searchAgendaUrls(data.query)).filter((c) =>
      isPublicHttpUrl(c.url),
    );
    if (candidates.length === 0) {
      const warning = "No candidate URLs found — try a more specific name.";
      await logRun({
        conferenceId: data.conferenceId,
        query: data.query,
        sourceUrl: null,
        status: "empty",
        sessionCount: 0,
        newSessions: 0,
        postersCreated: 0,
        endpointsCreated: 0,
        fromCache: false,
        reason: warning,
        attempts: [],
      });
      return {
        query: data.query,
        sourceUrl: null,
        sessions: [],
        attempts: [],
        warning,
        fromCache: false,
        distributed: { newSessions: 0, postersCreated: 0, endpointsCreated: 0 },
      };
    }

    const attempts: AutoBuildAttempt[] = [];
    for (const c of candidates.slice(0, 4)) {
      try {
        const sessions = await ingestOnce(c.url, limit);
        if (sessions.length > 0) {
          attempts.push({ url: c.url, title: c.title, status: "ok", sessions: sessions.length });
          await saveCache(data.conferenceId, c.url, data.query, sessions);
          const distributed = await distributeSessions(data.conferenceId, sessions, c.url);
          await logRun({
            conferenceId: data.conferenceId,
            query: data.query,
            sourceUrl: c.url,
            status: "ok",
            sessionCount: sessions.length,
            newSessions: distributed.newSessions,
            postersCreated: distributed.postersCreated,
            endpointsCreated: distributed.endpointsCreated,
            fromCache: false,
            attempts,
          });
          return {
            query: data.query,
            sourceUrl: c.url,
            sessions,
            attempts,
            fromCache: false,
            distributed,
          };
        }
        attempts.push({ url: c.url, title: c.title, status: "empty", sessions: 0 });
      } catch (e) {
        attempts.push({
          url: c.url,
          title: c.title,
          status: "failed",
          sessions: 0,
          reason: e instanceof Error ? e.message : "Unknown error",
        });
      }
    }
    const warning = "Tried the top candidates but none returned sessions. Paste a direct agenda URL below.";
    await logRun({
      conferenceId: data.conferenceId,
      query: data.query,
      sourceUrl: null,
      status: "failed",
      sessionCount: 0,
      newSessions: 0,
      postersCreated: 0,
      endpointsCreated: 0,
      fromCache: false,
      reason: warning,
      attempts,
    });
    return {
      query: data.query,
      sourceUrl: null,
      sessions: [],
      attempts,
      warning,
      fromCache: false,
      distributed: { newSessions: 0, postersCreated: 0, endpointsCreated: 0 },
    };
  });

export const getExtractionHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HistoryInput.parse(input))
  .handler(async ({ data }): Promise<ExtractionRunRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("extraction_runs")
      .select("*")
      .eq("conference_id", data.conferenceId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 10);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      query: (r.query as string | null) ?? null,
      sourceUrl: (r.source_url as string | null) ?? null,
      status: r.status as string,
      sessionCount: (r.session_count as number) ?? 0,
      newSessions: (r.new_sessions as number) ?? 0,
      postersCreated: (r.posters_created as number) ?? 0,
      endpointsCreated: (r.endpoints_created as number) ?? 0,
      fromCache: (r.from_cache as boolean) ?? false,
      reason: (r.reason as string | null) ?? null,
      attempts: (r.attempts as unknown as AutoBuildAttempt[]) ?? [],
      createdAt: r.created_at as string,
    }));
  });

export const getExtractionCaches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HistoryInput.parse(input))
  .handler(async ({ data }): Promise<ExtractionCacheRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("extraction_cache")
      .select("id, source_url, query, session_count, scraped_at")
      .eq("conference_id", data.conferenceId)
      .order("scraped_at", { ascending: false })
      .limit(data.limit ?? 10);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id as string,
      sourceUrl: r.source_url as string,
      query: (r.query as string | null) ?? null,
      sessionCount: (r.session_count as number) ?? 0,
      scrapedAt: r.scraped_at as string,
    }));
  });

