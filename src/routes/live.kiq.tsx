import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useKits, useSessions } from "@/lib/hooks";
import { AlertTriangle, CheckCircle2, Target, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/live/kiq")({
  head: () => ({ meta: [{ title: "KIQ Tracker — VERA 2.0" }] }),
  component: KiqTracker,
});

function KiqTracker() {
  const { data: kits = [] } = useKits();
  const { data: sessions = [] } = useSessions();
  const suggestions = sessions.slice(6, 9);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Module B · During Conference"
        title="KIQ Tracker"
        description="Real-time completion for every Key Intelligence Question. See exactly what has been answered at any moment."
      />

      <div className="space-y-4">
        {kits.map((kit) => (
          <Card key={kit.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{kit.topic}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {kit.kiqs.map((k) => (
                <div key={k.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">{k.question}</span>
                    {k.hasNewEvidence ? (
                      <Badge className="shrink-0 gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> New evidence
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-amber-500/40 text-[10px] text-amber-700"
                      >
                        <AlertTriangle className="h-3 w-3" /> No new evidence
                      </Badge>
                    )}
                  </div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{k.mappedSessions} mapped sessions</span>
                    <span className="tabular-nums">{k.completion}% complete</span>
                  </div>
                  <Progress value={k.completion} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Suggested sessions to close gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg bg-card p-2.5">
                <div className="w-12 shrink-0 text-center text-xs">
                  <div className="font-semibold">{s.time}</div>
                  <div className="text-muted-foreground">{s.room}</div>
                </div>
                <span className="flex-1 truncate text-sm">{s.title}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {s.therapyArea}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
