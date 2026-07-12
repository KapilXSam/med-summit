import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { ConfidenceBadge } from "@/components/attribution";
import {
  ingestConferenceUrl,
  retryFieldExtraction,
} from "@/lib/extraction.functions";
import {
  EDITABLE_FIELDS,
  type ExtractedSession,
} from "@/lib/extraction-types";
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
} from "lucide-react";

export const Route = createFileRoute("/pre/extraction")({
  head: () => ({ meta: [{ title: "AI Extraction — VERA 2.0" }] }),
  component: Extraction,
});

function Extraction() {
  const ingest = useServerFn(ingestConferenceUrl);
  const retryField = useServerFn(retryFieldExtraction);

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

  const filtered = useMemo(
    () =>
      rows.filter((s) => {
        const low = EDITABLE_FIELDS.some(
          (f) => (s.fieldConfidence[f.key as string] ?? 100) < threshold,
        );
        if (onlyFlagged && !low) return false;
        if (query && !s.title.toLowerCase().includes(query.toLowerCase()))
          return false;
        return true;
      }),
    [rows, query, onlyFlagged, threshold],
  );

  const flaggedCount = rows.filter((s) =>
    EDITABLE_FIELDS.some(
      (f) => (s.fieldConfidence[f.key as string] ?? 100) < threshold,
    ),
  ).length;

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

      {/* Ingestion controls */}
      <Card className="mb-4">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Conference agenda URL
              </Label>
              <Link2 className="absolute left-2.5 top-[34px] h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://conference.org/2025/agenda"
                className="pl-8"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleIngest()}
              />
            </div>
            <Button onClick={handleIngest} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Ingesting…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" /> Ingest & extract
                </>
              )}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="min-w-[240px] flex-1">
              <Label className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence threshold</span>
                <span className="font-mono text-foreground">{threshold}%</span>
              </Label>
              <Slider
                value={[threshold]}
                min={40}
                max={95}
                step={5}
                onValueChange={(v) => setThreshold(v[0])}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Fields below <span className="font-medium text-foreground">{threshold}%</span>{" "}
              are flagged for review. No values are inferred — empty means the field
              was not stated in the source.
            </p>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Link2 className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No agenda ingested yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Paste a real conference agenda URL above. The page is fetched live and
              AI extracts structured sessions with per-field confidence scoring.
            </p>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions…"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant={onlyFlagged ? "default" : "outline"}
              onClick={() => setOnlyFlagged((v) => !v)}
            >
              <AlertTriangle className="h-4 w-4" /> Flagged ({flaggedCount})
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
                    const lowFields = EDITABLE_FIELDS.filter(
                      (f) => (s.fieldConfidence[f.key as string] ?? 100) < threshold,
                    );
                    return (
                      <Fragment key={s.id}>

                        <TableRow
                          key={s.id}
                          className={
                            lowFields.length > 0
                              ? "cursor-pointer bg-destructive/5"
                              : "cursor-pointer"
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
                            <div className="text-xs text-muted-foreground">
                              {[s.authors, s.affiliation].filter(Boolean).join(" · ") ||
                                "—"}
                            </div>
                            {lowFields.length > 0 && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
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
                          <TableCell className="hidden font-mono text-xs lg:table-cell">
                            {s.trialId || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <ConfidenceBadge score={s.confidence} scale={100} />
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow key={`${s.id}-edit`} className="bg-muted/30">
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
                                        <Label className="text-xs text-muted-foreground">
                                          {f.label}
                                        </Label>
                                        <span
                                          className={
                                            isLow
                                              ? "text-[10px] font-medium text-destructive"
                                              : "text-[10px] text-muted-foreground"
                                          }
                                        >
                                          {conf}%
                                        </span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Input
                                          value={
                                            (s[f.key] as string) ?? ""
                                          }
                                          placeholder="—"
                                          onChange={(e) =>
                                            updateField(
                                              s.id,
                                              f.key,
                                              e.target.value,
                                              100,
                                            )
                                          }
                                          className={
                                            isLow
                                              ? "h-8 border-destructive/50 bg-destructive/5 text-sm"
                                              : "h-8 text-sm"
                                          }
                                        />
                                        {isLow && (
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 shrink-0"
                                            title="Re-run AI extraction for this field"
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
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px]">
                                  {s.therapyArea || "Unclassified"}
                                </Badge>
                                {s.asset && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {s.asset}
                                  </Badge>
                                )}
                                {lowFields.length === 0 && (
                                  <span className="ml-auto flex items-center gap-1 text-emerald-600">
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {rows.length} extracted sessions from{" "}
            <span className="font-mono">{sourceUrl}</span> · click a row to edit fields
            · low-confidence fields can be re-run individually.
          </p>
        </>
      )}
    </div>
  );
}
