import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfidenceBadge, SourceChip } from "@/components/attribution";
import { usePosters } from "@/lib/hooks";
import { useApp } from "@/context/app-context";
import { addPoster } from "@/lib/db";
import { analyzePosterCapture, getCaptureImageUrl, type PosterAnalysis } from "@/lib/capture.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Crop, Loader2, ScanText, Upload } from "lucide-react";

export const Route = createFileRoute("/live/capture")({
  head: () =>
    routeSeo({
      title: "Evidence Capture — Pharmalix",
      description:
        "Capture posters and slides on-site with real OCR, page-level source attribution, and confidence scoring.",
      path: "/live/capture",
    }),
  component: Capture,
});

type Stage = "idle" | "enhancing" | "ocr" | "review";

const MAX_EDGE = 1600;

/** Downscale + re-encode to JPEG in the browser so uploads stay small and legible. */
async function prepareImage(file: File): Promise<{ base64: string; mimeType: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: dataUrl.split(",")[1] ?? "", mimeType: "image/jpeg", preview: dataUrl };
}

function Capture() {
  const { conference } = useApp();
  const qc = useQueryClient();
  const { data: posters = [] } = usePosters();
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PosterAnalysis | null>(null);
  const [capturedBy, setCapturedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("idle");
    setPreview(null);
    setResult(null);
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    try {
      setStage("enhancing");
      const { base64, mimeType, preview: p } = await prepareImage(file);
      setPreview(p);
      setStage("ocr");
      const analysis = await analyzePosterCapture({
        data: { conferenceId: conference.id, fileName: file.name, mimeType, dataBase64: base64 },
      });
      setResult(analysis);
      setStage("review");
      if (analysis.warning) toast.warning(analysis.warning);
    } catch (e) {
      toast.error((e as Error).message || "Capture failed");
      reset();
    }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await addPoster(conference.id, {
        title: result.title,
        presenter: result.presenter,
        capturedBy: capturedBy.trim(),
        therapyArea: result.therapyArea,
        ocrStatus: "complete",
        summary: result.summary,
        significant: result.significant,
        contradictory: result.contradictory,
        sourceQuote: result.sourceQuote,
        page: result.page,
        confidence: result.confidence,
        imagePath: result.imagePath,
        ocrText: result.ocrText,
      });
      await qc.invalidateQueries({ queryKey: ["posters", conference.id] });
      toast.success("Evidence saved");
      reset();
    } catch (e) {
      toast.error((e as Error).message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const openStored = async (path?: string) => {
    if (!path) return;
    const { url } = await getCaptureImageUrl({ data: { path } });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else toast.error("Image is no longer available");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Module B · During Conference"
        title="Evidence Capture"
        description="Two-tap poster and slide capture with OCR, a 3-bullet AI summary, verbatim source quote and confidence score."
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <Card>
        <CardContent className="p-5">
          {stage === "idle" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-7 w-7" />
              </div>
              <div>
                <div className="font-medium">Capture a poster or slide</div>
                <div className="text-sm text-muted-foreground">or drop a photo here to upload</div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => cameraRef.current?.click()} className="gap-1">
                  <Camera className="h-3.5 w-3.5" /> Take photo
                </Button>
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} className="gap-1">
                  <Upload className="h-3.5 w-3.5" /> Choose file
                </Button>
              </div>
            </div>
          )}

          {(stage === "enhancing" || stage === "ocr") && (
            <div className="flex flex-col items-center gap-4 py-10">
              {preview && (
                <img src={preview} alt="Captured poster preview" className="max-h-48 rounded-lg border object-contain" />
              )}
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <Crop className="h-4 w-4" /> Downscale &amp; enhance
                  {stage !== "enhancing" && (
                    <Badge variant="secondary" className="text-[10px]">
                      done
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ScanText className="h-4 w-4" /> Running OCR &amp; summarisation…
                </span>
              </div>
            </div>
          )}

          {stage === "review" && result && (
            <div className="space-y-4">
              {preview && (
                <img
                  src={preview}
                  alt={result.title || "Captured poster"}
                  className="max-h-56 w-full rounded-lg border object-contain"
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{result.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {result.presenter || "Presenter not legible"} · captured just now
                  </div>
                </div>
                <ConfidenceBadge score={result.confidence} />
              </div>

              <div className="flex flex-wrap gap-2">
                {result.significant && <Badge>Statistically significant</Badge>}
                {result.contradictory && <Badge variant="destructive">Contradictory</Badge>}
                {result.therapyArea && <Badge variant="secondary">{result.therapyArea}</Badge>}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ScanText className="h-4 w-4 text-primary" /> 3-bullet AI summary
                </div>
                {result.summary.length ? (
                  <ul className="space-y-1.5">
                    {result.summary.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No summary could be generated from this image.</p>
                )}
              </div>

              {result.sourceQuote && <SourceChip quote={result.sourceQuote} page={result.page} />}

              {result.ocrText && (
                <details className="rounded-lg border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Full OCR text</summary>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {result.ocrText}
                  </pre>
                </details>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Captured by</label>
                <Input
                  value={capturedBy}
                  onChange={(e) => setCapturedBy(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save evidence
                </Button>
                <Button variant="secondary" onClick={reset} disabled={saving}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recently captured</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {posters.length === 0 && (
            <p className="text-sm text-muted-foreground">No evidence captured for this conference yet.</p>
          )}
          {posters
            .slice()
            .reverse()
            .slice(0, 6)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => openStored(p.imagePath)}
                  disabled={!p.imagePath}
                  className="flex h-8 w-8 items-center justify-center rounded bg-muted disabled:opacity-50"
                  aria-label="Open captured image"
                >
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </button>
                <span className="flex-1 truncate">{p.title}</span>
                {p.ocrStatus === "processing" ? (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Loader2 className="h-3 w-3 animate-spin" /> OCR
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{p.capturedAt}</span>
                )}
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
