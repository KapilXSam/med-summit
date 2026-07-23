import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { ExtractedSession, IngestResult } from "./extraction-types";

const CONF_THRESHOLD = 70;

const IngestInput = z.object({
  url: z.string().url(),
  limit: z.number().min(1).max(80).optional(),
});

const RetryInput = z.object({
  url: z.string().url(),
  sessionTitle: z.string().min(1),
  field: z.string().min(1),
});

const SuggestInput = z.object({
  query: z.string().min(2).max(200),
});

const CheckInput = z.object({
  url: z.string().url(),
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

async function scrapeMarkdown(url: string): Promise<string> {
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
  .inputValidator((input: unknown) => CheckInput.parse(input))
  .handler(async ({ data }): Promise<UrlCheckResult> => {
    try {
      const r = await fetch(data.url, {
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
  limit: z.number().min(1).max(80).optional(),
});

export interface AutoBuildAttempt {
  url: string;
  title: string;
  status: "ok" | "empty" | "failed";
  sessions: number;
  reason?: string;
}

export interface AutoBuildResult {
  query: string;
  sourceUrl: string | null;
  sessions: ExtractedSession[];
  attempts: AutoBuildAttempt[];
  warning?: string;
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

export const autoBuildFromName = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AutoBuildInput.parse(input))
  .handler(async ({ data }): Promise<AutoBuildResult> => {
    const limit = data.limit ?? 40;
    const candidates = await searchAgendaUrls(data.query);
    if (candidates.length === 0) {
      return {
        query: data.query,
        sourceUrl: null,
        sessions: [],
        attempts: [],
        warning: "No candidate URLs found — try a more specific name.",
      };
    }

    const attempts: AutoBuildAttempt[] = [];
    for (const c of candidates.slice(0, 4)) {
      try {
        const sessions = await ingestOnce(c.url, limit);
        if (sessions.length > 0) {
          attempts.push({ url: c.url, title: c.title, status: "ok", sessions: sessions.length });
          return { query: data.query, sourceUrl: c.url, sessions, attempts };
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
    return {
      query: data.query,
      sourceUrl: null,
      sessions: [],
      attempts,
      warning: "Tried the top candidates but none returned sessions. Paste a direct agenda URL below.",
    };
  });
