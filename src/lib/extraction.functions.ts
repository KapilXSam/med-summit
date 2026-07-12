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
