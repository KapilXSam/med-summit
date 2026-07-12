import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/attribution";
import { insights, kits } from "@/data/mock";
import { Combine, CopyMinus, Layers, Sparkles } from "lucide-react";

export const Route = createFileRoute("/post/synthesis")({
  head: () => ({ meta: [{ title: "Insight Synthesis — VERA 2.0" }] }),
  component: Synthesis,
});

function Synthesis() {
  const duplicates = insights.filter((i) => i.duplicateOf).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Module C · Post-Conference"
        title="Insight Synthesis"
        description="Groups every insight by KIT and KIQ, removes duplicates, and ranks by impact and novelty."
        actions={
          <Badge variant="secondary" className="gap-1">
            <CopyMinus className="h-3.5 w-3.5" /> {duplicates} duplicate removed
          </Badge>
        }
      />

      <div className="space-y-5">
        {kits.map((kit) => {
          const kitInsights = insights.filter((i) => i.kitId === kit.id && !i.duplicateOf);
          return (
            <div key={kit.id}>
              <div className="mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">{kit.topic}</h2>
                <Badge variant="outline" className="text-[10px]">
                  {kitInsights.length} insights
                </Badge>
              </div>
              <div className="space-y-2">
                {kitInsights
                  .sort((a, b) => b.impact + b.novelty - (a.impact + a.novelty))
                  .map((i, idx) => (
                    <Card key={i.id}>
                      <CardContent className="flex items-start gap-3 p-4">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{i.text}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {i.significant && <Badge className="text-[10px]">Significant</Badge>}
                            {i.contradictory && (
                              <Badge variant="destructive" className="text-[10px]">
                                Contradictory
                              </Badge>
                            )}
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Impact {i.impact} · Novelty{" "}
                              {i.novelty}
                            </span>
                          </div>
                        </div>
                        <ConfidenceBadge score={i.confidence} />
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="mt-5 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Combine className="h-4 w-4 text-primary" /> Deduplication
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {duplicates} near-identical insight was detected and merged into the ranked view
          above to keep the synthesis clean.
        </CardContent>
      </Card>
    </div>
  );
}
