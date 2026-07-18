import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useState } from "react";
import { PageHeader, StubNotice } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge, SourceChip } from "@/components/attribution";
import { usePosters } from "@/lib/hooks";
import { Camera, Crop, Loader2, Mic, ScanText, Upload } from "lucide-react";

export const Route = createFileRoute("/live/capture")({
  head: () =>
    routeSeo({
      title: "Evidence Capture — Pharmalix",
      description: "Capture posters and sessions on-site with OCR, page-level source attribution, and confidence scoring.",
      path: "/live/capture",
    }),
  component: Capture,
});

type Stage = "idle" | "enhancing" | "ocr" | "done";

function Capture() {
  const { data: posters = [] } = usePosters();
  const [stage, setStage] = useState<Stage>("idle");
  const example = posters[0];

  const runCapture = () => {
    setStage("enhancing");
    setTimeout(() => setStage("ocr"), 900);
    setTimeout(() => setStage("done"), 2200);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Module B · During Conference"
        title="Evidence Capture"
        description="One-tap poster and slide capture with auto crop, deskew, background OCR, and voice notes."
      />
      <StubNotice>
        Upload and OCR are simulated. In production a poster is captured in 2 taps with a
        full summary available ~60 seconds later.
      </StubNotice>

      <Card>
        <CardContent className="p-5">
          {stage === "idle" && (
            <button
              onClick={runCapture}
              className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed py-12 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-7 w-7" />
              </div>
              <div>
                <div className="font-medium">Tap to capture poster or slide</div>
                <div className="text-sm text-muted-foreground">
                  or drop a photo to upload
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Upload className="h-3 w-3" /> Photo
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Mic className="h-3 w-3" /> Voice note
                </Badge>
              </div>
            </button>
          )}

          {(stage === "enhancing" || stage === "ocr") && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <Crop className="h-4 w-4" /> Auto-crop, deskew & enhance
                  {stage !== "enhancing" && (
                    <Badge variant="secondary" className="text-[10px]">
                      done
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ScanText className="h-4 w-4" /> Running OCR & summarisation…
                </span>
              </div>
            </div>
          )}

          {stage === "done" && example && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{example.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {example.presenter} · captured just now
                  </div>
                </div>
                <ConfidenceBadge score={example.confidence} />
              </div>

              <div className="flex flex-wrap gap-2">
                {example.significant && <Badge>Statistically significant</Badge>}
                <Badge variant="secondary">{example.therapyArea}</Badge>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ScanText className="h-4 w-4 text-primary" /> 3-bullet AI summary
                </div>
                <ul className="space-y-1.5">
                  {example.summary.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <SourceChip quote={example.sourceQuote} page={example.page} />

              <Button variant="secondary" className="w-full" onClick={() => setStage("idle")}>
                Capture another
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recently captured</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {posters.slice(1, 5).map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                <Camera className="h-4 w-4 text-muted-foreground" />
              </div>
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
