import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/app-context";
import { useKits, useInsights, useSessions, useLbaAlerts, useDelegates } from "@/lib/hooks";
import { ConfidenceBadge } from "@/components/attribution";
import { ArrowRight, Sparkles, Users, BellRing } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Conference Dashboard — VERA 2.0" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { conference } = useApp();
  const { data: kits = [] } = useKits();
  const { data: insights = [] } = useInsights();
  const { data: sessions = [] } = useSessions();
  const { data: lbaAlerts = [] } = useLbaAlerts();
  const { data: delegates = [] } = useDelegates();
  const allKiqs = kits.flatMap((k) => k.kiqs);
  const avgCompletion = allKiqs.length
    ? Math.round(allKiqs.reduce((a, k) => a + k.completion, 0) / allKiqs.length)
    : 0;
  const flagged = sessions.filter((s) => s.confidence < 70).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={conference.acronym}
        title="Conference Dashboard"
        description={`${conference.name} · ${conference.location}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Sessions extracted", value: conference.sessionCount.toLocaleString() },
          { label: "Flagged for review", value: flagged },
          { label: "KIQ completion", value: `${avgCompletion}%` },
          { label: "Insights captured", value: insights.filter((i) => !i.duplicateOf).length },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">KIQ Completion Tracker</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/live/kiq">
                View <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {allKiqs.map((k) => (
              <div key={k.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate pr-3">{k.question}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {k.completion}%
                  </span>
                </div>
                <Progress value={k.completion} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4 text-primary" /> LBA Alerts
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pre/lba">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lbaAlerts.slice(0, 3).map((l) => (
              <div key={l.id} className="text-sm">
                <div className="flex items-start gap-2">
                  {l.relevantToKit && (
                    <Badge variant="default" className="mt-0.5 shrink-0 text-[10px]">
                      KIT
                    </Badge>
                  )}
                  <span className="line-clamp-2">{l.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">{l.detectedAt}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Latest Insights
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/live/insights">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights
              .filter((i) => !i.duplicateOf)
              .slice(0, 3)
              .map((i) => (
                <div key={i.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex-1">{i.text}</span>
                  <ConfidenceBadge score={i.confidence} />
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Delegates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {delegates.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {d.initials}
                </div>
                <span className="flex-1 truncate">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.focus}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
