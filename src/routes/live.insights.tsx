import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge, SourceChip } from "@/components/attribution";
import { useInsights } from "@/lib/hooks";
import { useApp } from "@/context/app-context";
import { AlertOctagon, EyeOff, Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/live/insights")({
  head: () =>
    routeSeo({
      title: "Live AI Insights — VERA 2.0",
      description: "KIT/KIQ-mapped conference insights ranked by novelty, impact, and confidence, with contradictory-evidence flags.",
      path: "/live/insights",
    }),
  component: LiveInsights,
});

type Filter = "all" | "significant" | "contradictory";

function LiveInsights() {
  const { isClientViewer } = useApp();
  const { data: insights = [] } = useInsights();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = insights
    .filter((i) => !i.duplicateOf)
    .filter((i) => {
      if (filter === "significant") return i.significant;
      if (filter === "contradictory") return i.contradictory;
      return true;
    });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Module B · During Conference"
        title="Live AI Insights"
        description="Every insight carries a source quote, page number, and confidence score. Low-confidence items are hidden from client viewers."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["significant", "Significant"],
            ["contradictory", "Contradictory"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
        {isClientViewer && (
          <Badge variant="secondary" className="ml-auto gap-1">
            <EyeOff className="h-3.5 w-3.5" /> Client view · low-confidence hidden
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {rows.map((i) => {
          const hidden = isClientViewer && i.confidence < 7;
          if (hidden) {
            return (
              <Card key={i.id} className="border-dashed">
                <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <EyeOff className="h-4 w-4" /> Insight hidden — confidence below client
                  threshold (7/10).
                </CardContent>
              </Card>
            );
          }
          return (
            <Card key={i.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {i.significant && (
                    <Badge className="gap-1">
                      <Sparkles className="h-3 w-3" /> Significant
                    </Badge>
                  )}
                  {i.contradictory && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertOctagon className="h-3 w-3" /> Contradictory
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" /> Novelty {i.novelty}/10 · Impact{" "}
                    {i.impact}/10
                  </span>
                  <ConfidenceBadge score={i.confidence} className="ml-auto" />
                </div>
                <p className="font-medium">{i.text}</p>
                <SourceChip quote={i.sourceQuote} page={i.page} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
