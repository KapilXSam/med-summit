import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { useSessions } from "@/lib/hooks";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Session } from "@/data/types";
import {
  autoBuildFromName,
  ingestConferenceUrl,
  type AutoBuildAttempt,
} from "@/lib/extraction.functions";
import {
  Search,
  Wand2,
  Loader2,
  RotateCw,
  Sparkles,
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Filter,
  Flame,
  Mic,
  Presentation,
  BookOpen,
  Star,
  Building2,
  ChevronDown,
  Radio,
  Clock,
  Layers,
  ArrowRight,
  Database,
} from "lucide-react";

export const Route = createFileRoute("/pre/extraction")({
  head: () =>
    routeSeo({
      title: "Conference Calendar — Pharmalix",
      description:
        "Explore the full ESMO 2026 program in one place — browse sessions by type, day, and indication, and plan your attendance faster than the source website.",
      path: "/pre/extraction",
    }),
  component: ConferenceCalendar,
});

const ESMO_URL = "https://cslide.ctimeetingtech.com/esmo2026/attendee/confcal";

// ---------- session type derivation ----------

const SESSION_TYPES = [
  { key: "Late-Breaking", icon: Flame, tone: "danger" },
  { key: "Plenary", icon: Star, tone: "primary" },
  { key: "Keynote", icon: Star, tone: "primary" },
  { key: "Proffered Paper", icon: Mic, tone: "success" },
  { key: "Mini Oral", icon: Mic, tone: "success" },
  { key: "Poster Discussion", icon: Presentation, tone: "warning" },
  { key: "Poster", icon: Presentation, tone: "muted" },
  { key: "Symposium", icon: Layers, tone: "primary" },
  { key: "Educational", icon: BookOpen, tone: "muted" },
  { key: "Meet the Expert", icon: Users, tone: "muted" },
  { key: "Industry", icon: Building2, tone: "muted" },
  { key: "Workshop", icon: Layers, tone: "muted" },
  { key: "Session", icon: Radio, tone: "muted" },
] as const;

type SessionType = (typeof SESSION_TYPES)[number]["key"];

function deriveType(title: string): SessionType {
  const t = title.toLowerCase();
  if (/\blba\b|late[- ]breaking/.test(t)) return "Late-Breaking";
  if (/plenary/.test(t)) return "Plenary";
  if (/keynote/.test(t)) return "Keynote";
  if (/proffered/.test(t)) return "Proffered Paper";
  if (/mini[- ]oral/.test(t)) return "Mini Oral";
  if (/poster discussion|poster spotlight/.test(t)) return "Poster Discussion";
  if (/poster/.test(t)) return "Poster";
  if (/symposium/.test(t)) return "Symposium";
  if (/educational|tutorial/.test(t)) return "Educational";
  if (/meet the expert|ask the expert/.test(t)) return "Meet the Expert";
  if (/industry|satellite|sponsored/.test(t)) return "Industry";
  if (/workshop/.test(t)) return "Workshop";
  return "Session";
}

function typeMeta(type: SessionType) {
  return SESSION_TYPES.find((s) => s.key === type) ?? SESSION_TYPES[SESSION_TYPES.length - 1];
}

function toneClasses(tone: string) {
  switch (tone) {
    case "danger":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "success":
      return "bg-success/10 text-success border-success/30";
    case "warning":
      return "bg-warning/10 text-warning border-warning/30";
    case "primary":
      return "bg-primary/10 text-primary border-primary/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// ---------- indication ----------

const INDICATION_PATTERNS: [RegExp, string][] = [
  [/nsclc|non[- ]small cell/i, "NSCLC"],
  [/sclc|small[- ]cell lung/i, "SCLC"],
  [/breast/i, "Breast"],
  [/prostate/i, "Prostate"],
  [/ovarian/i, "Ovarian"],
  [/colorectal|crc/i, "Colorectal"],
  [/pancrea/i, "Pancreatic"],
  [/gastric|gastro[- ]?esophageal/i, "Gastric / GEJ"],
  [/hepatocellular|hcc|liver/i, "HCC"],
  [/melanoma/i, "Melanoma"],
  [/renal|rcc|kidney/i, "RCC"],
  [/bladder|urothelial/i, "Urothelial"],
  [/head and neck|hnscc/i, "Head & Neck"],
  [/glioblastoma|glioma|brain/i, "CNS / Glioma"],
  [/leukemia|aml|cll/i, "Leukemia"],
  [/lymphoma|dlbcl/i, "Lymphoma"],
  [/myeloma/i, "Multiple Myeloma"],
  [/cervical/i, "Cervical"],
  [/endometrial/i, "Endometrial"],
  [/sarcoma/i, "Sarcoma"],
];

function deriveIndication(s: Session): string {
  if (s.therapyArea && s.therapyArea.trim()) return s.therapyArea.trim();
  for (const [re, label] of INDICATION_PATTERNS) if (re.test(s.title)) return label;
  return "General Oncology";
}

// ---------- component ----------

function ConferenceCalendar() {
  const { conference } = useApp();
  const { data: sessions = [], isLoading } = useSessions();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const autoBuild = useServerFn(autoBuildFromName);
  const ingest = useServerFn(ingestConferenceUrl);

  const [importOpen, setImportOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("ESMO 2026");
  const [urlInput, setUrlInput] = useState(ESMO_URL);
  const [building, setBuilding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [attempts, setAttempts] = useState<AutoBuildAttempt[]>([]);

  // filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<SessionType>>(new Set());
  const [indFilter, setIndFilter] = useState<Set<string>>(new Set());
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [lbaOnly, setLbaOnly] = useState(false);

  const enriched = useMemo(
    () =>
      sessions.map((s) => ({
        ...s,
        _type: deriveType(s.title),
        _ind: deriveIndication(s),
      })),
    [sessions],
  );

  const days = useMemo(
    () => Array.from(new Set(enriched.map((s) => s.day).filter(Boolean))).sort(),
    [enriched],
  );
  const allIndications = useMemo(
    () => Array.from(new Set(enriched.map((s) => s._ind))).sort(),
    [enriched],
  );
  const allTypes = useMemo(() => {
    const found = new Set(enriched.map((s) => s._type));
    return SESSION_TYPES.filter((t) => found.has(t.key)).map((t) => t.key);
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((s) => {
      if (q) {
        const hay = `${s.title} ${s.authors} ${s.room} ${s.trialId ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (typeFilter.size && !typeFilter.has(s._type)) return false;
      if (indFilter.size && !indFilter.has(s._ind)) return false;
      if (dayFilter !== "all" && s.day !== dayFilter) return false;
      if (lbaOnly && s._type !== "Late-Breaking") return false;
      return true;
    });
  }, [enriched, search, typeFilter, indFilter, dayFilter, lbaOnly]);

  // stats
  const stats = useMemo(() => {
    const byType = new Map<SessionType, number>();
    let lba = 0;
    const rooms = new Set<string>();
    const presenters = new Set<string>();
    for (const s of enriched) {
      byType.set(s._type, (byType.get(s._type) ?? 0) + 1);
      if (s._type === "Late-Breaking") lba++;
      if (s.room) rooms.add(s.room);
      if (s.authors) presenters.add(s.authors.split(",")[0].trim());
    }
    return {
      total: enriched.length,
      lba,
      rooms: rooms.size,
      presenters: presenters.size,
      days: days.length,
      indications: allIndications.length,
      byType,
    };
  }, [enriched, days.length, allIndications.length]);

  function toggle<T>(set: Set<T>, val: T, setter: (s: Set<T>) => void) {
    const n = new Set(set);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    setter(n);
  }

  async function handleLoadEsmo() {
    setImporting(true);
    setAttempts([]);
    try {
      const res = await ingest({ data: { url: ESMO_URL } });
      if (res.sessions.length === 0) {
        toast.warning(res.warning ?? "No sessions found — try Auto-build instead");
      } else {
        // persist via server function autoBuild path? ingest is preview only.
        // Fall back to autoBuild for persistence + distribution.
        const persisted = await autoBuild({
          data: { query: "ESMO 2026", conferenceId: conference.id, refresh: true },
        });
        setAttempts(persisted.attempts);
        toast.success(
          `Loaded ${persisted.sessions.length} sessions · +${persisted.distributed.newSessions} new`,
        );
        qc.invalidateQueries({ queryKey: ["sessions", conference.id] });
        qc.invalidateQueries({ queryKey: ["posters", conference.id] });
        qc.invalidateQueries({ queryKey: ["endpoints", conference.id] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setImporting(false);
    }
  }

  async function handleAutoBuild(opts: { refresh?: boolean } = {}) {
    if (!nameQuery.trim()) return;
    setBuilding(true);
    setAttempts([]);
    try {
      const res = await autoBuild({
        data: {
          query: nameQuery.trim(),
          conferenceId: conference.id,
          refresh: opts.refresh ?? false,
        },
      });
      setAttempts(res.attempts);
      if (res.sessions.length > 0) {
        const host = res.sourceUrl ? new URL(res.sourceUrl).hostname : "source";
        toast.success(
          `${res.fromCache ? "Loaded from cache" : "Built"} ${res.sessions.length} sessions from ${host}`,
        );
        qc.invalidateQueries({ queryKey: ["sessions", conference.id] });
        qc.invalidateQueries({ queryKey: ["posters", conference.id] });
        qc.invalidateQueries({ queryKey: ["endpoints", conference.id] });
      } else {
        toast.warning(res.warning ?? "No sessions found");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto-build failed");
    } finally {
      setBuilding(false);
    }
  }

  const hasData = enriched.length > 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Conference Calendar"
        description="One structured view of every session, poster, and late-breaker — filter, plan and prepare in minutes."
        actions={
          hasData ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleAutoBuild({ refresh: true })}
                disabled={building}
              >
                {building ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button
                onClick={() => {
                  qc.invalidateQueries({ queryKey: ["sessions", conference.id] });
                  toast.success(
                    `${stats.total} sessions available in Session Planner`,
                  );
                  navigate({ to: "/pre/planner" });
                }}
              >
                <ArrowRight className="h-4 w-4" />
                Send to Session Planner
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Hero */}
      <Card className="mb-6 overflow-hidden border-primary/20">
        <div className="relative bg-gradient-to-br from-primary via-primary to-primary/70 px-6 py-8 text-primary-foreground">
          <div className="absolute inset-0 opacity-10 [background:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                Active conference
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {conference.name}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/85">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {conference.startDate} → {conference.endDate}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {conference.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {conference.delegateCount} delegates
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {conference.therapyAreas.slice(0, 6).map((ta) => (
                  <Badge
                    key={ta}
                    variant="secondary"
                    className="border-white/20 bg-white/10 text-primary-foreground hover:bg-white/20"
                  >
                    {ta}
                  </Badge>
                ))}
              </div>
            </div>
            {!hasData && !isLoading && (
              <Button
                size="lg"
                variant="secondary"
                onClick={handleLoadEsmo}
                disabled={importing}
                className="shadow-lg"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Load {conference.acronym} program
              </Button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        {hasData && (
          <div className="grid grid-cols-2 divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
            <Stat label="Sessions" value={stats.total} icon={Radio} />
            <Stat
              label="Late-Breaking"
              value={stats.lba}
              icon={Flame}
              accent="text-destructive"
            />
            <Stat label="Days" value={stats.days} icon={Calendar} />
            <Stat label="Indications" value={stats.indications} icon={Layers} />
            <Stat label="Rooms" value={stats.rooms} icon={MapPin} />
            <Stat label="Presenters" value={stats.presenters} icon={Users} />
          </div>
        )}
      </Card>

      {/* Import / refresh (collapsible, compact) */}
      <Collapsible open={importOpen} onOpenChange={setImportOpen} className="mb-6">
        <Card>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between px-4 py-3 text-left">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Database className="h-4 w-4 text-primary" />
                Data source
                <span className="text-xs font-normal text-muted-foreground">
                  {hasData
                    ? `${stats.total} sessions loaded · click to refresh or import another program`
                    : "Import a live program to populate the calendar"}
                </span>
              </span>
              <ChevronDown
                className={
                  "h-4 w-4 text-muted-foreground transition-transform " +
                  (importOpen ? "rotate-180" : "")
                }
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-4 border-t px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Auto-build by conference name
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="e.g. ESMO 2026"
                        value={nameQuery}
                        onChange={(e) => setNameQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAutoBuild()}
                      />
                    </div>
                    <Button onClick={() => handleAutoBuild()} disabled={building}>
                      {building ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      Build
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Import from URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://…/programme"
                    />
                    <Button
                      variant="secondary"
                      onClick={handleLoadEsmo}
                      disabled={importing}
                    >
                      {importing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Import
                    </Button>
                  </div>
                </div>
              </div>
              {attempts.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="mb-1.5 font-medium text-foreground">Recent attempts</p>
                  <ul className="space-y-1">
                    {attempts.map((a, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate text-muted-foreground">{a.url}</span>
                        <span className="shrink-0">
                          {a.status === "ok" || a.status === "cached" ? (
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              {a.sessions} sessions
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-muted">
                              {a.status}
                            </Badge>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Body */}
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !hasData ? (
        <EmptyState onLoad={handleLoadEsmo} loading={importing} />
      ) : (
        <>
          {/* Type breakdown chips */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {allTypes.map((t) => {
              const meta = typeMeta(t);
              const active = typeFilter.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggle(typeFilter, t, setTypeFilter)}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (active
                      ? toneClasses(meta.tone) + " ring-2 ring-primary/30"
                      : "border-border bg-background text-muted-foreground hover:bg-muted")
                  }
                >
                  <meta.icon className="h-3 w-3" />
                  {t}
                  <span className="ml-0.5 opacity-70">{stats.byType.get(t) ?? 0}</span>
                </button>
              );
            })}
            {(typeFilter.size > 0 || indFilter.size > 0 || lbaOnly || dayFilter !== "all") && (
              <button
                onClick={() => {
                  setTypeFilter(new Set());
                  setIndFilter(new Set());
                  setLbaOnly(false);
                  setDayFilter("all");
                }}
                className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search title, presenter, room, trial ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" /> Indication
                  {indFilter.size > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {indFilter.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
                <DropdownMenuLabel>Filter by indication</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allIndications.map((i) => (
                  <DropdownMenuCheckboxItem
                    key={i}
                    checked={indFilter.has(i)}
                    onCheckedChange={() => toggle(indFilter, i, setIndFilter)}
                  >
                    {i}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4" />
                  {dayFilter === "all" ? "All days" : dayFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={dayFilter === "all"}
                  onCheckedChange={() => setDayFilter("all")}
                >
                  All days
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {days.map((d) => (
                  <DropdownMenuCheckboxItem
                    key={d}
                    checked={dayFilter === d}
                    onCheckedChange={() => setDayFilter(d)}
                  >
                    {d}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={lbaOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setLbaOnly((v) => !v)}
            >
              <Flame className="h-4 w-4" />
              Late-breaking only
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              Showing <b className="text-foreground">{filtered.length}</b> of {stats.total}
            </span>
          </div>

          {/* Views */}
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">
                <Clock className="mr-1 h-4 w-4" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="type">
                <Layers className="mr-1 h-4 w-4" /> By Type
              </TabsTrigger>
              <TabsTrigger value="indication">
                <Radio className="mr-1 h-4 w-4" /> By Indication
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <TimelineView sessions={filtered} />
            </TabsContent>
            <TabsContent value="type" className="mt-4">
              <GroupedView
                sessions={filtered}
                keyOf={(s) => s._type}
                order={SESSION_TYPES.map((t) => t.key)}
              />
            </TabsContent>
            <TabsContent value="indication" className="mt-4">
              <GroupedView sessions={filtered} keyOf={(s) => s._ind} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ---------- helpers ----------

type EnrichedSession = Session & { _type: SessionType; _ind: string };

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={
          "grid h-9 w-9 place-items-center rounded-lg bg-muted " + (accent ?? "text-primary")
        }
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ onLoad, loading }: { onLoad: () => void; loading: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-7 w-7" />
        </span>
        <div>
          <h3 className="font-display text-xl font-semibold">
            Load the ESMO 2026 program in one click
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Pharmalix will fetch the official programme, extract every session with AI, and
            organize it by type, day, and indication — better than the source calendar.
          </p>
        </div>
        <Button size="lg" onClick={onLoad} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          Import from cslide.ctimeetingtech.com
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Extraction may take 30-60 seconds on first run.
        </p>
      </CardContent>
    </Card>
  );
}

function TimelineView({ sessions }: { sessions: EnrichedSession[] }) {
  const byDay = useMemo(() => {
    const map = new Map<string, EnrichedSession[]>();
    for (const s of sessions) {
      const d = s.day || "Unscheduled";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(s);
    }
    for (const arr of map.values())
      arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sessions]);

  if (byDay.length === 0) return <EmptyResult />;

  return (
    <div className="space-y-6">
      {byDay.map(([day, list]) => (
        <div key={day}>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
              {day}
            </h3>
            <span className="text-xs text-muted-foreground">{list.length} sessions</span>
            <div className="ml-2 h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-2">
            {list.map((s) => (
              <SessionRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupedView({
  sessions,
  keyOf,
  order,
}: {
  sessions: EnrichedSession[];
  keyOf: (s: EnrichedSession) => string;
  order?: string[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, EnrichedSession[]>();
    for (const s of sessions) {
      const k = keyOf(s);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    const entries = Array.from(map.entries());
    if (order) {
      entries.sort(
        ([a], [b]) => order.indexOf(a) - order.indexOf(b) || a.localeCompare(b),
      );
    } else {
      entries.sort((a, b) => b[1].length - a[1].length);
    }
    return entries;
  }, [sessions, keyOf, order]);

  if (grouped.length === 0) return <EmptyResult />;

  return (
    <div className="space-y-6">
      {grouped.map(([label, list]) => (
        <div key={label}>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
              {label}
            </h3>
            <Badge variant="secondary">{list.length}</Badge>
            <div className="ml-2 h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-2">
            {list.map((s) => (
              <SessionRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionRow({ s }: { s: EnrichedSession }) {
  const meta = typeMeta(s._type);
  return (
    <Card className="group border transition-colors hover:border-primary/40 hover:shadow-sm">
      <CardContent className="flex items-start gap-4 p-3">
        {/* time column */}
        <div className="w-20 shrink-0 border-r pr-3 text-center">
          <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {s.time || "—"}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {s.day || "TBA"}
          </p>
        </div>
        {/* main */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                toneClasses(meta.tone)
              }
            >
              <meta.icon className="h-3 w-3" />
              {s._type}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {s._ind}
            </Badge>
            {s.trialId && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {s.trialId}
              </Badge>
            )}
            {s.room && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {s.room}
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {s.title}
          </p>
          {s.authors && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {s.authors}
              {s.affiliation && <span className="ml-1 opacity-70">· {s.affiliation}</span>}
            </p>
          )}
        </div>
        {/* actions */}
        <div className="flex shrink-0 items-center gap-1">
          {s.sourceUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open on conference site</TooltipContent>
            </Tooltip>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pre/planner">
              Plan <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyResult() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        No sessions match the current filters.
      </CardContent>
    </Card>
  );
}
