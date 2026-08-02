/**
 * Server-only helpers for the Late-Breaking Abstract (LBA) monitor.
 * Firecrawl handles discovery + scraping; the Lovable AI gateway does extraction.
 */
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertPublicHttpUrl, isPublicHttpUrl } from "./safe-url";

export interface RawLba {
  abstractNumber: string;
  title: string;
  authors: string;
  sponsor: string;
  trialId: string;
  indication: string;
  phase: string;
  summary: string;
  sourceUrl: string;
}

export interface WatchTerm {
  term: string;
  kind: string;
  priority: number;
}

export interface ScoredLba extends RawLba {
  relevanceScore: number;
  matchReason: string;
  watchTerm: string;
  kitTopic: string | null;
  relevantToKit: boolean;
}

const AGENDA_HINT =
  /(late[- ]?breaking|lba|abstract|programme|program|session|presidential|plenary)/i;

function firecrawlKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("Firecrawl is not configured");
  return key;
}

/** Discover candidate late-breaking abstract pages for a conference. */
export async function discoverLbaSources(conferenceName: string): Promise<string[]> {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `${conferenceName} late-breaking abstracts LBA titles scientific programme`,
      limit: 8,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl search failed (${res.status})`);
  const json = (await res.json()) as Record<string, unknown>;
  const raw = json.data;
  const items = (Array.isArray(raw)
    ? raw
    : ((raw as { web?: unknown[]; news?: unknown[] })?.web ??
      (raw as { news?: unknown[] })?.news ??
      (json.web as unknown[]) ??
      (json.results as unknown[]) ??
      [])) as Array<{ url?: string; title?: string; description?: string }>;

  const scored = items
    .filter((i) => i.url && isPublicHttpUrl(i.url))
    .map((i) => ({
      url: i.url as string,
      score:
        (AGENDA_HINT.test(i.title ?? "") ? 2 : 0) +
        (AGENDA_HINT.test(i.description ?? "") ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const s of scored) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    urls.push(s.url);
    if (urls.length >= 4) break;
  }
  return urls;
}

/** Scrape a page to markdown via Firecrawl (SSRF-guarded). */
export async function scrapeMarkdown(rawUrl: string): Promise<string> {
  const url = assertPublicHttpUrl(rawUrl);
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  const firecrawl = new Firecrawl({ apiKey: firecrawlKey() });
  const result = await firecrawl.scrape(url, {
    formats: ["markdown"],
    onlyMainContent: true,
  });
  const md =
    (result as { markdown?: string }).markdown ??
    (result as { data?: { markdown?: string } }).data?.markdown ??
    "";
  return md.slice(0, 40000);
}

function parseJsonArray<T>(text: string): T[] {
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : text;
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start < 0 || end < 0) return [];
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Extract late-breaking abstracts from scraped page content. */
export async function extractLbas(
  markdown: string,
  sourceUrl: string,
  conferenceName: string,
): Promise<RawLba[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");
  if (!markdown.trim()) return [];
  const gateway = createLovableAiGatewayProvider(apiKey);

  const prompt = `You are a competitive-intelligence engine for pharma medical affairs teams monitoring ${conferenceName}.

From the page content below, extract ONLY late-breaking abstracts / late-breaker presentations (typically numbered LBA*, LB*, or explicitly labelled "late-breaking"). Ignore ordinary posters and regular sessions.

For each late-breaker return:
- abstractNumber (e.g. "LBA5001", "" if absent)
- title
- authors (lead author or presenter, "" if absent)
- sponsor (company or sponsoring institution, "" if absent)
- trialId (NCT number or trial acronym, "" if absent)
- indication (tumour type / disease, "" if absent)
- phase (e.g. "Phase 3", "" if absent)
- summary (one factual sentence based only on the page text)

Never invent values. Use "" for anything not stated. Return ONLY a JSON array; return [] if the page has no late-breakers.

PAGE CONTENT:
${markdown}`;

  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    prompt,
  });

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return parseJsonArray<Record<string, unknown>>(text)
    .map((r) => ({
      abstractNumber: str(r.abstractNumber),
      title: str(r.title),
      authors: str(r.authors),
      sponsor: str(r.sponsor),
      trialId: str(r.trialId),
      indication: str(r.indication),
      phase: str(r.phase),
      summary: str(r.summary),
      sourceUrl,
    }))
    .filter((r) => r.title.length > 3)
    .slice(0, 60);
}

/** Score an extracted LBA against the conference watchlist and KIT topics. */
export function scoreLba(
  lba: RawLba,
  watchlist: WatchTerm[],
  kitTopics: string[],
): ScoredLba {
  const haystack = [
    lba.title,
    lba.summary,
    lba.sponsor,
    lba.trialId,
    lba.indication,
    lba.authors,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const reasons: string[] = [];
  let topTerm = "";
  let topPriority = 99;

  for (const w of watchlist) {
    const term = w.term.trim().toLowerCase();
    if (!term || !haystack.includes(term)) continue;
    const weight = w.priority <= 1 ? 40 : w.priority === 2 ? 25 : 15;
    score += weight;
    reasons.push(`watch term "${w.term}"`);
    if (w.priority < topPriority) {
      topPriority = w.priority;
      topTerm = w.term;
    }
  }

  let kitTopic: string | null = null;
  for (const topic of kitTopics) {
    const tokens = topic
      .toLowerCase()
      .split(/[^a-z0-9-]+/)
      .filter((t) => t.length > 3);
    const hits = tokens.filter((t) => haystack.includes(t)).length;
    if (hits >= Math.max(1, Math.ceil(tokens.length / 3))) {
      kitTopic = topic;
      score += 30;
      reasons.push(`matches KIT "${topic}"`);
      break;
    }
  }

  if (/phase\s*3|phase\s*iii/i.test(haystack)) {
    score += 10;
    reasons.push("Phase 3 readout");
  }
  if (/overall survival|\bos\b|primary endpoint met/i.test(haystack)) {
    score += 10;
    reasons.push("survival/primary endpoint data");
  }

  score = Math.max(0, Math.min(100, score));
  return {
    ...lba,
    relevanceScore: score,
    matchReason: reasons.length ? reasons.join("; ") : "No watchlist match",
    watchTerm: topTerm,
    kitTopic,
    relevantToKit: Boolean(kitTopic) || score >= 40,
  };
}

/** Human-friendly "detected" label. */
export function detectedLabel(date = new Date()): string {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
