import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { routeSeo } from "@/lib/route-seo";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/app-context";
import {
  useKits,
  useInsights,
  useSessions,
  useLbaAlerts,
  useDelegates,
  usePosters,
  useEndpoints,
} from "@/lib/hooks";
import { ConfidenceBadge } from "@/components/attribution";
import {
  ArrowRight,
  Sparkles,
  Users,
  BellRing,
  CalendarDays,
  MapPin,
  Camera,
  AlertTriangle,
  Activity,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  head: () =>
    routeSeo({
      title: "Conference Dashboard — Pharmalix",
      description:
        "Real-time analytics on coverage, late-breaking alerts, evidence capture, and KIT/KIQ progress for your active medical conference.",
      path: "/dashboard",
    }),
  component: Dashboard,
});

const INDICATION_PATTERNS: [RegExp, string][] = [
  [/nsclc|non[- ]small cell/i, "NSCLC"],
  [/sclc|small[- ]cell lung/i, "SCLC"],
  [/breast/i, "Breast"],
  [/prostate/i, "Prostate"],
  [/ovarian/i, "Ovarian"],
  [/colorectal|crc/i, "Colorectal"],
  [/pancrea/i, "Pancreatic"],
  [/gastric|gastro[- ]?esophageal/i, "Gastric / GEJ"],
  [/hepatocellular|hcc/i, "HCC"],
  [/melanoma/i, "Melanoma"],
  [/renal|rcc|kidney/i, "RCC"],
  [/bladder|urothelial/i, "Urothelial"],
  [/head and neck|hnscc/i, "Head & Neck"],
  [/lymphoma|dlbcl/i, "Lymphoma"],
  [/myeloma/i, "Myeloma"],
  [/sarcoma/i, "Sarcoma"],
];

function indicationOf(title: string, therapyArea: string) {
  if (therapyArea?.trim()) return therapyArea.trim();
  for (const [re, label] of INDICATION_PATTERNS) if (re.test(title)) return label;
  return "General Oncology";
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent = "text-primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { conference } = useApp();
  const { data: kits = [] } = useKits();
  const { data: insights = [] } = useInsights();
  const { data: sessions = [] } = useSessions();
  const { data: lbaAlerts = [] } = useLbaAlerts();
  const { data: delegates = [] } = useDelegates();
  const { data: posters = [] } = usePosters();
  const { data: endpoints = [] } = useEndpoints();

  const allKiqs = kits.flatMap((k) => k.kiqs);
  const avgCompletion = allKiqs.length
    ? Math.round(allKiqs.reduce((a, k) => a + k.completion, 0) / allKiqs.length)
    : 0;

  const stats = useMemo(() => {
    const byDay = new Map<string, number>();
    const byIndication = new Map<string, number>();
    const rooms = new Set<string>();
    let assigned = 0;
    let conflicts = 0;
    let lowConfidence = 0;
    for (const s of sessions) {
      if (s.day) byDay.set(s.day, (byDay.get(s.day) ?? 0) + 1);
      const ind = indicationOf(s.title, s.therapyArea);
      byIndication.set(ind, (byIndication.get(ind) ?? 0) + 1);
      if (s.room) rooms.add(s.room);
      if (s.assignedTo) assigned++;
      if (s.conflict) conflicts++;
      if (s.confidence < 70) lowConfidence++;
    }
    return {
      days: [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day: day.slice(5) || day, count })),
      indications: [...byIndication.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count })),
      rooms: rooms.size,
      assigned,
      conflicts,
      lowConfidence,
    };
  }, [sessions]);

  const uniqueInsights = insights.filter((i) => !i.duplicateOf);
  const pendingLba = lbaAlerts.filter((l) => l.approval === "pending");
  const kitRelevantLba = lbaAlerts.filter((l) => l.relevantToKit);
  const coverage = sessions.length
    ? Math.round((stats.assigned / sessions.length) * 100)
    : 0;
  const avgInsightConfidence = uniqueInsights.length
    ? Math.round(
        uniqueInsights.reduce((a, i) => a + i.confidence, 0) / uniqueInsights.length,
      )
    : 0;

  const gauges = [
    { name: "KIQ completion", value: avgCompletion, fill: "hsl(var(--primary))" },
    { name: "Delegate coverage", value: coverage, fill: "hsl(var(--success))" },
    {
      name: "Insight confidence",
      value: avgInsightConfidence,
      fill: "hsl(var(--warning))",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={conference.acronym}
        title="Conference Dashboard"
        description={`${conference.name} · ${conference.location} · ${conference.startDate} → ${conference.endDate}`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Sessions tracked"
          value={sessions.length.toLocaleString()}
          sub={`${stats.days.length} days · ${stats.rooms} rooms`}
          icon={CalendarDays}
        />
        <Kpi
          label="LBA alerts"
          value={lbaAlerts.length}
          sub={`${pendingLba.length} pending approval`}
          icon={BellRing}
          accent="text-destructive"
        />
        <Kpi
          label="Evidence captured"
          value={posters.length}
          sub={`${endpoints.length} endpoints extracted`}
          icon={Camera}
          accent="text-success"
        />
        <Kpi
          label="Insights"
          value={uniqueInsights.length}
          sub={`avg confidence ${avgInsightConfidence}%`}
          icon={Sparkles}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Delegate coverage"
          value={`${coverage}%`}
          sub={`${stats.assigned} of ${sessions.length} assigned`}
          icon={Target}
          accent="text-success"
        />
        <Kpi
          label="Schedule conflicts"
          value={stats.conflicts}
          sub="overlapping assignments"
          icon={AlertTriangle}
          accent="text-warning"
        />
        <Kpi
          label="Flagged for review"
          value={stats.lowConfidence}
          sub="confidence below 70%"
          icon={Activity}
          accent="text-warning"
        />
        <Kpi
          label="KIT-relevant LBAs"
          value={kitRelevantLba.length}
          sub={`${kits.length} KITs · ${allKiqs.length} KIQs`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sessions by indication</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/pre/extraction">
                Calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="h-64">
            {stats.indications.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.indications} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid horizontal={false} strokeOpacity={0.15} />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RTooltip
                    cursor={{ fillOpacity: 0.06 }}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions imported yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={gauges}
                  innerRadius="35%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" background cornerRadius={6} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {gauges.map((g) => (
                <div key={g.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: g.fill }}
                    />
                    {g.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{g.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" /> Daily session load
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              <MapPin className="mr-1 inline h-3 w-3" />
              {stats.rooms} rooms
            </span>
          </CardHeader>
          <CardContent className="h-52">
            {stats.days.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.days}>
                  <CartesianGrid vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={28} />
                  <RTooltip
                    cursor={{ fillOpacity: 0.06 }}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No scheduled days yet.</p>
            )}
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
            {lbaAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No late-breaking abstracts detected yet.
              </p>
            )}
            {lbaAlerts.slice(0, 4).map((l) => (
              <div key={l.id} className="text-sm">
                <div className="flex items-start gap-2">
                  {l.relevantToKit && (
                    <Badge variant="default" className="mt-0.5 shrink-0 text-[10px]">
                      KIT
                    </Badge>
                  )}
                  <span className="line-clamp-2">{l.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {l.sponsor ? `${l.sponsor} · ` : ""}
                  {l.detectedAt}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

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
            {allKiqs.length === 0 && (
              <p className="text-sm text-muted-foreground">No KIQs defined yet.</p>
            )}
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
              <Sparkles className="h-4 w-4 text-primary" /> Latest Insights
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/live/insights">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {uniqueInsights.length === 0 && (
              <p className="text-sm text-muted-foreground">No insights captured yet.</p>
            )}
            {uniqueInsights.slice(0, 4).map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="flex-1 line-clamp-3">{i.text}</span>
                <ConfidenceBadge score={i.confidence} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Delegate roster
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {delegates.length === 0 && (
              <p className="text-sm text-muted-foreground">No delegates added yet.</p>
            )}
            {delegates.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {d.initials}
                </div>
                <span className="flex-1 truncate">{d.name}</span>
                <span className="truncate text-xs text-muted-foreground">{d.focus}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
