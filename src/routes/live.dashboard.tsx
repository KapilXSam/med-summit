import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "@/components/attribution";
import { kits, insights, sessions, delegates } from "@/data/mock";
import { Camera, CheckCircle2, Clock, Radio, Sparkles, Wifi } from "lucide-react";

export const Route = createFileRoute("/live/dashboard")({
  head: () => ({ meta: [{ title: "Live Dashboard — VERA 2.0" }] }),
  component: LiveDashboard,
});

function LiveDashboard() {
  const nowSessions = sessions.slice(0, 5);
  const allKiqs = kits.flatMap((k) => k.kiqs);
  const liveInsights = insights.filter((i) => !i.duplicateOf).slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Module B · During Conference"
        title="Live Dashboard"
        description="Real-time agenda, delegate check-ins, and a live feed of new insights. Optimised for mobile on the show floor."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-emerald-600" /> Loaded in 1.4s · 4G
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 animate-pulse text-emerald-600" /> Happening now
            </CardTitle>
            <Button asChild size="sm" variant="secondary">
              <Link to="/live/capture">
                <Camera className="h-4 w-4" /> Capture
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {nowSessions.map((s, idx) => {
              const d = delegates[idx % delegates.length];
              const checkedIn = idx % 2 === 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-sm font-semibold tabular-nums">{s.time}</div>
                    <div className="text-[10px] text-muted-foreground">{s.room}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.therapyArea}</div>
                  </div>
                  {checkedIn ? (
                    <Badge className="gap-1 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> {d.initials}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Clock className="h-3 w-3" /> Open
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">KIQ Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allKiqs.map((k) => (
              <div key={k.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate pr-2">{k.question}</span>
                  <span className="shrink-0 tabular-nums">{k.completion}%</span>
                </div>
                <Progress value={k.completion} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Live insight feed
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/live/insights">All insights</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {liveInsights.map((i) => (
              <div key={i.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  {i.significant && (
                    <Badge className="text-[10px]">Significant</Badge>
                  )}
                  {i.contradictory && (
                    <Badge variant="destructive" className="text-[10px]">
                      Contradictory
                    </Badge>
                  )}
                  <ConfidenceBadge score={i.confidence} className="ml-auto" />
                </div>
                <p className="text-sm">{i.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
