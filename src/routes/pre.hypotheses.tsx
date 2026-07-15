import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { PageHeader, StubNotice } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHypotheses, useKits } from "@/lib/hooks";
import type { Kit } from "@/data/types";
import { ExternalLink, FlaskConical, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/pre/hypotheses")({
  head: () =>
    routeSeo({
      title: "Hypothesis Engine — VERA 2.0",
      description: "Log competitive and scientific hypotheses with impact, likelihood, and linked evidence from PubMed and ClinicalTrials.gov.",
      path: "/pre/hypotheses",
    }),
  component: Hypotheses,
});

const rank = { High: 3, Medium: 2, Low: 1 } as const;

function kiqLabel(kiqId: string, kits: Kit[]) {
  for (const kit of kits) {
    const kiq = kit.kiqs.find((k) => k.id === kiqId);
    if (kiq) return kiq.question;
  }
  return kiqId;
}

function Meter({ label, level }: { label: string; level: "High" | "Medium" | "Low" }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-3 w-1.5 rounded-sm ${
              n <= rank[level] ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Hypotheses() {
  const { data: hypotheses = [] } = useHypotheses();
  const { data: kits = [] } = useKits();
  const sorted = [...hypotheses].sort(
    (a, b) => rank[b.impact] + rank[b.likelihood] - (rank[a.impact] + rank[a.likelihood]),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="AI Hypothesis Engine"
        description="Generates testable hypotheses per KIQ, ranked by impact and likelihood, with links to prior evidence."
      />
      <StubNotice>
        Hypotheses are illustrative. Every one links to supporting prior evidence from
        PubMed and ClinicalTrials.gov.
      </StubNotice>

      <div className="space-y-4">
        {sorted.map((h) => (
          <Card key={h.id} className={h.gap ? "border-warning/40" : undefined}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FlaskConical className="h-3.5 w-3.5 text-primary" />
                  {kiqLabel(h.kiqId, kits) || "Unmapped hypothesis"}
                </div>
                {h.gap && (
                  <Badge variant="outline" className="gap-1 border-warning/40 text-warning">
                    <TriangleAlert className="h-3 w-3" /> Evidence gap
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium leading-snug">{h.statement}</p>
              <div className="flex flex-wrap items-center gap-4">
                <Meter label="Impact" level={h.impact} />
                <Meter label="Likelihood" level={h.likelihood} />
              </div>
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {h.evidence.map((e) => (
                  <a
                    key={e.label}
                    href="#"
                    onClick={(ev) => ev.preventDefault()}
                    className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted"
                  >
                    <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                      {e.source}
                    </Badge>
                    {e.label}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
                {h.gap && (
                  <span className="text-xs text-warning">
                    No conference sessions currently answer this KIQ.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
