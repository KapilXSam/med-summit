import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApp } from "@/context/app-context";
import { insertSessions } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfidenceBadge } from "@/components/attribution";
import {
  ingestConferenceUrl,
  retryFieldExtraction,
} from "@/lib/extraction.functions";
import { EDITABLE_FIELDS, type ExtractedSession } from "@/lib/extraction-types";
import {
  Search,
  Wand2,
  AlertTriangle,
  Link2,
  Loader2,
  ChevronDown,
  ChevronRight,
  RotateCw,
  Check,
  Sparkles,
  ShieldCheck,
  Gauge,
  ListChecks,
  Save,
} from "lucide-react";

export const Route = createFileRoute("/pre/extraction")({
  head: () => ({ meta: [{ title: "AI Extraction — VERA 2.0" }] }),
  component: Extraction,
});

function Extraction() {
  const ingest = useServerFn(ingestConferenceUrl);
  const retryField = useServerFn(retryFieldExtraction);
  const { conference } = useApp();
  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: (sessions: ExtractedSession[]) =>
      insertSessions(
        sessions.map((s) => ({
          conferenceId: conference.id,
          title: s.title || "Untitled session",
          authors: s.authors,
          affiliation: s.affiliation,
          day: s.day,
          time: s.time,
          room: s.room,
          trialId: s.trialId,
          therapyArea: s.therapyArea,
          asset: s.asset,
          confidence: s.confidence,
          sourceUrl,
        })),
      ),
    onSuccess: (inserted) => {
      qc.invalidateQueries({ queryKey: ["sessions", conference.id] });
      toast.success(
        `Saved ${inserted.length} session${inserted.length === 1 ? "" : "s"} to ${conference.acronym} — now available in the Planner`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [url, setUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(70);
  const [rows, setRows] = useState<ExtractedSession[]>([]);
  const [query, setQuery] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [retrying, setRetrying] = useState<string | null>(null);

  async function handleIngest() {
    if (!url.trim()) {
      toast.error("Enter a conference agenda URL first");
      return;
    }
    setLoading(true);
    try {
      const res = await ingest({ data: { url: url.trim() } });
      setRows(res.sessions);
      setSourceUrl(res.sourceUrl);
      setExpanded({});
      if (res.warning) toast.warning(res.warning);
      else if (res.sessions.length === 0)
        toast.warning("No sessions found on that page");
      else toast.success(`Extracted ${res.sessions.length} sessions`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Ingestion failed — check the URL",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(
    id: string,
    field: keyof ExtractedSession,
    value: string,
    confidence?: number,
  ) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: value,
              fieldConfidence: {
                ...r.fieldConfidence,
                ...(confidence != null ? { [field]: confidence } : {}),
              },
            }
          : r,
      ),
    );
  }

  async function handleRetry(row: ExtractedSession, field: string) {
    setRetrying(`${row.id}:${field}`);
    try {
      const res = await retryField({
        data: { url: sourceUrl, sessionTitle: row.title, field },
      });
      updateField(row.id, field as keyof ExtractedSession, res.value, res.confidence);
      if (res.confidence >= threshold)
        toast.success(`Re-extracted "${field}" (${res.confidence}%)`);
      else toast.warning(`"${field}" still low confidence (${res.confidence}%)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setRetrying(null);
    }
  }

  const lowFieldsOf = (s: ExtractedSession) =>
    EDITABLE_FIELDS.filter(
      (f) => (s.fieldConfidence[f.key as string] ?? 100) < threshold,
    );

  const filtered = useMemo(
    () =>
      rows.filter((s) => {
        if (onlyFlagged && lowFieldsOf(s).length === 0) return false;
        if (query && !s.title.toLowerCase().includes(query.toLowerCase()))
          return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, query, onlyFlagged, threshold],
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const flagged = rows.filter((s) => lowFieldsOf(s).length > 0).length;
    const avg = total
      ? Math.round(rows.reduce((a, s) => a + s.confidence, 0) / total)
      : 0;
    const clean = total - flagged;
    return { total, flagged, clean, avg };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, threshold]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="AI Extraction"
        description="Ingest a live conference agenda URL, extract every session field with per-field confidence scoring, and edit or re-run low-confidence values."
        actions={
          rows.length > 0 ? (
            <Button variant="secondary" onClick={handleIngest} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Re-run extraction
            </Button>
          ) : undefined
        }
      />

      {/* Ingestion command panel */}
      <Card className="mb-6 overflow-hidden border-primary/20">
        <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-primary/10 via-accent/40 to-transparent px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Live agenda ingestion</p>
            <p className="truncate text-xs text-muted-foreground">
              Fetches the page in real time and extracts structured sessions with AI.
            </p>
          </div>
        </div>
        <CardContent className="space-y-5 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="relative min-w-0">
              <Label
                htmlFor="agenda-url"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Conference agenda URL
              </Label>
              <Link2 className="pointer-events-none absolute left-2.5 top-[34px] h-4 w-4 text-muted-foreground" />
              <Input
                id="agenda-url"
                type="url"
                inputMode="url"
                placeholder="https://conference.org/2025/agenda"
                className="pl-8"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleIngest()}
              />
            </div>
            <Button onClick={handleIngest} disabled={loading} className="shrink-0">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Ingesting…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Ingest &amp; extract
                </>
              )}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] sm:items-center">
            <div>
              <Label className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Confidence threshold</span>
                <span className="font-mono tabular-nums text-foreground">
                  {threshold}%
                </span>
              </Label>
              <Slider
                aria-label="Confidence threshold"
                value={[threshold]}
                min={40}
                max={95}
                step={5}
                onValueChange={(v) => setThreshold(v[0])}
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Fields below{" "}
              <span className="font-medium text-foreground">{threshold}%</span> are
              flagged for analyst review. No values are inferred — an empty field means
              it was not stated in the source page.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && rows.length === 0 && (
        <div className="space-y-3" aria-busy="true" aria-label="Extracting sessions">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Fetching page and extracting sessions…
          </div>
          <Card>
            <CardContent className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-primary">
              <Link2 className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold">No agenda ingested yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Paste a real conference agenda URL above. The page is fetched live and AI
              extracts structured sessions with per-field confidence scoring.
            </p>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="animate-fade-in space-y-5">
          {/* Summary strip */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={<ListChecks className="h-4 w-4" />}
              label="Sessions extracted"
              value={stats.total}
            />
            <StatCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Above threshold"
              value={stats.clean}
              tone="positive"
            />
            <StatCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Flagged for review"
              value={stats.flagged}
              tone={stats.flagged > 0 ? "warning" : "default"}
            />
            <StatCard
              icon={<Gauge className="h-4 w-4" />}
              label="Avg. confidence"
              value={`${stats.avg}%`}
              progress={stats.avg}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions…"
                aria-label="Search sessions"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant={onlyFlagged ? "default" : "outline"}
              onClick={() => setOnlyFlagged((v) => !v)}
              aria-pressed={onlyFlagged}
            >
              <AlertTriangle className="h-4 w-4" /> Flagged ({stats.flagged})
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Session</TableHead>
                    <TableHead className="hidden md:table-cell">Time / Room</TableHead>
                    <TableHead className="hidden lg:table-cell">Trial ID</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => {
                    const isOpen = expanded[s.id];
                    const lowFields = lowFieldsOf(s);
                    return (
                      <Fragment key={s.id}>
                        <TableRow
                          className={
                            "cursor-pointer transition-colors" +
                            (lowFields.length > 0
                              ? " bg-destructive/[0.04] hover:bg-destructive/[0.07]"
                              : "")
                          }
                          onClick={() =>
                            setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }))
                          }
                        >
                          <TableCell>
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-[340px]">
                            <div className="font-medium leading-snug">
                              {s.title || (
                                <span className="italic text-muted-foreground">
                                  Untitled
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {[s.authors, s.affiliation].filter(Boolean).join(" · ") ||
                                "—"}
                            </div>
                            {lowFields.length > 0 && (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                {lowFields.length} low-confidence field
                                {lowFields.length > 1 ? "s" : ""}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                            {s.day || "—"}
                            <br />
                            {[s.time, s.room].filter(Boolean).join(" · ") || "—"}
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs tabular-nums lg:table-cell">
                            {s.trialId || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <ConfidenceBadge score={s.confidence} scale={100} />
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell />
                            <TableCell colSpan={4} className="py-4">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {EDITABLE_FIELDS.map((f) => {
                                  const conf =
                                    s.fieldConfidence[f.key as string] ?? 100;
                                  const isLow = conf < threshold;
                                  const key = `${s.id}:${f.key}`;
                                  return (
                                    <div key={f.key} className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <Label
                                          htmlFor={key}
                                          className="text-xs text-muted-foreground"
                                        >
                                          {f.label}
                                        </Label>
                                        <span
                                          className={
                                            "text-[10px] font-medium tabular-nums " +
                                            (isLow
                                              ? "text-destructive"
                                              : "text-muted-foreground")
                                          }
                                        >
                                          {conf}%
                                        </span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Input
                                          id={key}
                                          value={(s[f.key] as string) ?? ""}
                                          placeholder="Not stated in source"
                                          onChange={(e) =>
                                            updateField(
                                              s.id,
                                              f.key,
                                              e.target.value,
                                              100,
                                            )
                                          }
                                          className={
                                            "h-8 text-sm " +
                                            (isLow
                                              ? "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/40"
                                              : "")
                                          }
                                        />
                                        {isLow && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-8 w-8 shrink-0"
                                                aria-label={`Re-run AI extraction for ${f.label}`}
                                                disabled={retrying === key}
                                                onClick={() =>
                                                  handleRetry(s, f.key as string)
                                                }
                                              >
                                                {retrying === key ? (
                                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                  <RotateCw className="h-3.5 w-3.5" />
                                                )}
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Re-run AI extraction for this field
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px]">
                                  {s.therapyArea || "Unclassified"}
                                </Badge>
                                {s.asset && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {s.asset}
                                  </Badge>
                                )}
                                {lowFields.length === 0 && (
                                  <span className="ml-auto inline-flex items-center gap-1 font-medium text-emerald-600">
                                    <Check className="h-3.5 w-3.5" /> All fields above
                                    threshold
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        No sessions match your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length} extracted sessions from{" "}
            <span className="break-all font-mono">{sourceUrl}</span> · click a row to
            edit fields · low-confidence fields can be re-run individually.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = "default",
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "positive" | "warning";
  progress?: number;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-destructive"
        : "text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={toneClass}>{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
        {progress != null && (
          <Progress value={progress} className="mt-2 h-1.5" />
        )}
      </CardContent>
    </Card>
  );
}
