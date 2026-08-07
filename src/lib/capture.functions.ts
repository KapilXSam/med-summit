import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AnalyzeInput = z.object({
  conferenceId: z.string().min(1),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/),
  /** Base64 (no data-URL prefix) of a downscaled image, max ~6MB encoded. */
  dataBase64: z.string().min(100).max(8_000_000),
});

const SignInput = z.object({ path: z.string().min(1) });

export interface PosterAnalysis {
  imagePath: string;
  title: string;
  presenter: string;
  therapyArea: string;
  summary: string[];
  significant: boolean;
  contradictory: boolean;
  sourceQuote: string;
  page: number;
  confidence: number;
  ocrText: string;
  warning?: string;
}

function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

const PROMPT = `You are an OCR and summarisation engine for medical conference posters and slides.

Read the image and return ONLY a JSON object with this exact shape:
{
  "ocrText": "the full text you can read from the image, preserving reading order",
  "title": "poster or slide title exactly as printed",
  "presenter": "presenting author name if printed, else \\"\\"",
  "therapyArea": "indication or therapy area, e.g. NSCLC, else \\"\\"",
  "summary": ["bullet 1", "bullet 2", "bullet 3"],
  "significant": true,
  "contradictory": false,
  "sourceQuote": "one verbatim sentence from the image that best supports the summary",
  "page": 1,
  "confidence": 0
}

Rules:
- Never invent values. If something is not legible, use "" (or 0 for confidence you cannot justify).
- "summary" is exactly 3 bullets, each grounded in text visible in the image.
- "significant" is true only when a statistically significant result is explicitly stated (p-value, HR with CI excluding 1).
- "contradictory" is true only when the image explicitly reports a result that conflicts with the stated hypothesis or prior data.
- "sourceQuote" must be copied verbatim from the image.
- "confidence" is an integer 0-100 for overall legibility and extraction certainty.
Return JSON only, no prose.`;

export const analyzePosterCapture = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }): Promise<PosterAnalysis> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");

    const bytes = Buffer.from(data.dataBase64, "base64");
    const ext = data.mimeType.split("/")[1]!.replace("jpeg", "jpg");
    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
    const path = `${data.conferenceId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("posters")
      .upload(path, bytes, { contentType: data.mimeType, upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const empty: PosterAnalysis = {
      imagePath: path,
      title: "",
      presenter: "",
      therapyArea: "",
      summary: [],
      significant: false,
      contradictory: false,
      sourceQuote: "",
      page: 1,
      confidence: 0,
      ocrText: "",
    };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ...empty, warning: "AI is not configured; the image was stored without OCR." };

    let text = "";
    try {
      const gateway = createLovableAiGatewayProvider(key);
      const res = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image", image: `data:${data.mimeType};base64,${data.dataBase64}` },
            ],
          },
        ],
      });
      text = res.text;
    } catch (e) {
      return { ...empty, warning: `OCR failed: ${(e as Error).message}` };
    }

    const raw = parseJson<Record<string, unknown>>(text);
    if (!raw) return { ...empty, warning: "Could not parse the OCR result." };

    const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string).trim() : "");
    const num = (k: string, fallback: number) => {
      const v = Number(raw[k]);
      return Number.isFinite(v) ? v : fallback;
    };
    const summary = Array.isArray(raw.summary)
      ? (raw.summary as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
      : [];

    return {
      imagePath: path,
      title: str("title") || "Untitled capture",
      presenter: str("presenter"),
      therapyArea: str("therapyArea"),
      summary,
      significant: raw.significant === true,
      contradictory: raw.contradictory === true,
      sourceQuote: str("sourceQuote"),
      page: Math.max(1, Math.round(num("page", 1))),
      // stored on the platform-wide 1-10 confidence scale
      confidence: Math.max(0, Math.min(10, Math.round(num("confidence", 0) / 10))),
      ocrText: str("ocrText"),
    };
  });

/** Short-lived signed URL so the private capture bucket can be displayed in the UI. */
export const getCaptureImageUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignInput.parse(d))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("posters")
      .createSignedUrl(data.path, 60 * 60);
    if (error) return { url: null };
    return { url: signed?.signedUrl ?? null };
  });
