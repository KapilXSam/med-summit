import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { routeSeo } from "@/lib/route-seo";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/context/app-context";
import { useLbaAlerts, useLbaWatchlist, useLbaScanRuns } from "@/lib/hooks";
import {
  addLbaAlert,
  addLbaWatchTerm,
  deleteLbaWatchTerm,
  toggleLbaWatchTerm,
  updateLbaStatus,
  type NewLbaAlert,
} from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { scanLbaFeeds } from "@/lib/lba.functions";
import type { LbaAlert, LbaStatus } from "@/data/types";
import {
  BellRing,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  Radar,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";


export const Route = createFileRoute("/pre/lba")({
  head: () =>
    routeSeo({
      title: "LBA Monitor — Pharmalix",
      description:
        "Late-breaking abstract monitor that scans live conference sources and alerts only on LBAs relevant to your KIT and watchlist.",
      path: "/pre/lba",
    }),
  component: LbaMonitor,
});

const KINDS = ["asset", "competitor", "indication", "trial", "keyword"];

/** Short, readable label for a source URL. */
function hostLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}

function LbaMonitor() {
  const { conference } = useApp();
  const qc = useQueryClient();
  const { data: alerts = [], isLoading } = useLbaAlerts();
  const { data: watchlist = [] } = useLbaWatchlist();
  const { data: runs = [] } = useLbaScanRuns();
  const scan = useServerFn(scanLbaFeeds);

  const [tab, setTab] = useState<"relevant" | "all" | "dismissed">("relevant");
  const [sourceUrl, setSourceUrl] = useState("");
  const [term, setTerm] = useState("");
  const [kind, setKind] = useState("keyword");
  const [priority, setPriority] = useState("2");
  const [manualOpen, setManualOpen] = useState(false);

  const manualMutation = useMutation({
    mutationFn: (v: NewLbaAlert) => addLbaAlert(conference.id, v),
    onSuccess: () => {
      setManualOpen(false);
      qc.invalidateQueries({ queryKey: ["lba", conference.id] });
      toast.success("Late-breaker added");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lba", conference.id] });
    qc.invalidateQueries({ queryKey: ["lba-runs", conference.id] });
  };

  const scanMutation = useMutation({
    mutationFn: () =>
      scan({
        data: {
          conferenceId: conference.id,
          conferenceName: conference.name,
          ...(sourceUrl.trim() ? { urls: [sourceUrl.trim()] } : {}),
        },
      }),
    onSuccess: (r) => {
      invalidate();
      toast.success(
        `Scan complete — ${r.found} late-breakers (${r.created} new, ${r.updated} updated)`,
        { description: r.warning },
      );
    },
    onError: (e: Error) => toast.error(e.message || "Scan failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LbaStatus }) =>
      updateLbaStatus(id, status),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const watchMutations = {
    add: useMutation({
      mutationFn: () =>
        addLbaWatchTerm(conference.id, {
          term: term.trim(),
          kind,
          priority: Number(priority),
        }),
      onSuccess: () => {
        setTerm("");
        qc.invalidateQueries({ queryKey: ["lba-watchlist", conference.id] });
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    toggle: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        toggleLbaWatchTerm(id, active),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["lba-watchlist", conference.id] }),
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteLbaWatchTerm(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["lba-watchlist", conference.id] }),
    }),
  };

  const filtered = useMemo(() => {
    if (tab === "dismissed") return alerts.filter((a) => a.status === "dismissed");
    const live = alerts.filter((a) => a.status !== "dismissed");
    return tab === "relevant" ? live.filter((a) => a.relevantToKit) : live;
  }, [alerts, tab]);

  const lastRun = runs[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Late-Breaking Abstract Monitor"
        description={`Scans live sources for ${conference.acronym} late-breakers and scores them against your watchlist and KIT topics.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Radar className="h-3.5 w-3.5 text-success" /> {alerts.length} tracked
            </Badge>
            <Button variant="outline" onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4" /> Add LBA manually
            </Button>
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
            >
              {scanMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {scanMutation.isPending ? "Checking…" : "Check conference site"}
            </Button>
          </div>
        }
      />

      <ManualLbaDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSubmit={(v) => manualMutation.mutate(v)}
        pending={manualMutation.isPending}
      />


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Scan source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Optional: specific LBA page URL (leave blank to auto-discover)"
            />
            {sourceUrl && (
              <Button variant="outline" onClick={() => setSourceUrl("")}>
                Clear
              </Button>
            )}
          </div>
          {lastRun && (
            <p className="text-xs text-muted-foreground">
              Last scan {new Date(lastRun.createdAt).toLocaleString()} ·{" "}
              {lastRun.status} · {lastRun.sourcesScanned.length} source(s) ·{" "}
              {lastRun.alertsFound} found ({lastRun.newAlerts} new) ·{" "}
              {Math.round(lastRun.durationMs / 1000)}s
              {lastRun.error ? ` · ${lastRun.error}` : ""}
            </p>
          )}
          {lastRun && lastRun.sourcesScanned.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lastRun.sourcesScanned.map((u) => (
                <a
                  key={u}
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  title={u}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  <span className="truncate">{hostLabel(u)}</span>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {watchlist.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5"
              >
                <Switch
                  checked={w.active}
                  onCheckedChange={(v) =>
                    watchMutations.toggle.mutate({ id: w.id, active: v })
                  }
                />
                <span className="text-sm font-medium">{w.term}</span>
                <Badge variant="outline" className="text-[10px]">
                  {w.kind} · P{w.priority}
                </Badge>
                <button
                  aria-label={`Remove ${w.term}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => watchMutations.remove.mutate(w.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {watchlist.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No watch terms yet — add assets, competitors or indications to focus alerts.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Add a term (e.g. VRA-101, NSCLC, bispecific)"
              className="sm:max-w-xs"
            />
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">P1 · critical</SelectItem>
                <SelectItem value="2">P2 · standard</SelectItem>
                <SelectItem value="3">P3 · background</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!term.trim() || watchMutations.add.isPending}
              onClick={() => watchMutations.add.mutate()}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="relevant">Relevant</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isLoading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}

        {!isLoading && filtered.length === 0 && (
          <Card>
            <CardContent className="space-y-3 p-8 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                No late-breaking abstracts for {conference.acronym} yet
              </p>
              <p className="mx-auto max-w-md">
                LBA titles are usually published only a few weeks before the congress, so
                an empty list is expected this far out. Use{" "}
                <span className="font-medium text-foreground">Check conference site</span>{" "}
                to re-scan, or add one manually if you spotted it before we did.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${scanMutation.isPending ? "animate-spin" : ""}`}
                  />
                  Check conference site
                </Button>
                <Button variant="outline" onClick={() => setManualOpen(true)}>
                  <Plus className="h-4 w-4" /> Add LBA manually
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {filtered.map((l) => (
          <AlertCard
            key={l.id}
            alert={l}
            onStatus={(status) => statusMutation.mutate({ id: l.id, status })}
          />
        ))}
      </div>
    </div>
  );
}

function AlertCard({
  alert: l,
  onStatus,
}: {
  alert: LbaAlert;
  onStatus: (s: LbaStatus) => void;
}) {
  return (
    <Card className={l.relevantToKit ? "border-primary/40" : undefined}>
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            l.relevantToKit ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <BellRing className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {l.relevantToKit ? <Badge>Relevant to your KIT</Badge> : <Badge variant="outline">General</Badge>}
            <Badge variant="secondary">Score {l.relevanceScore}</Badge>
            {l.abstractNumber && (
              <span className="font-mono text-xs text-muted-foreground">{l.abstractNumber}</span>
            )}
            {l.trialId && (
              <span className="font-mono text-xs text-muted-foreground">{l.trialId}</span>
            )}
            {l.status === "reviewed" && <Badge variant="outline">Reviewed</Badge>}
          </div>
          <p className="mt-1 font-medium leading-snug">{l.title}</p>
          {l.summary && (
            <p className="mt-1 text-sm text-muted-foreground">{l.summary}</p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {l.sponsor && <span>Sponsor: {l.sponsor}</span>}
            {l.indication && <span>Indication: {l.indication}</span>}
            {l.phase && <span>{l.phase}</span>}
            {l.kitTopic && <span>Matched KIT: {l.kitTopic}</span>}
          </div>
          {l.matchReason && (
            <p className="mt-1 text-xs text-muted-foreground">Why: {l.matchReason}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Detected {l.detectedAt}
            </span>
            {l.sourceUrl ? (
              <a
                href={l.sourceUrl}
                target="_blank"
                rel="noreferrer"
                title={l.sourceUrl}
                className="flex max-w-full items-center gap-1 truncate text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{hostLabel(l.sourceUrl)}</span>
              </a>
            ) : (
              <span className="italic">No source link</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          {l.status !== "reviewed" && (
            <Button size="sm" variant="outline" onClick={() => onStatus("reviewed")}>
              <Check className="h-3.5 w-3.5" /> Reviewed
            </Button>
          )}
          {l.status !== "dismissed" ? (
            <Button size="sm" variant="ghost" onClick={() => onStatus("dismissed")}>
              <X className="h-3.5 w-3.5" /> Dismiss
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onStatus("new")}>
              Restore
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const EMPTY_MANUAL: NewLbaAlert = {
  title: "",
  abstractNumber: "",
  sponsor: "",
  trialId: "",
  indication: "",
  phase: "",
  summary: "",
  sourceUrl: "",
};

/** Manual entry for late-breakers the scan hasn't picked up yet. */
function ManualLbaDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: NewLbaAlert) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<NewLbaAlert>(EMPTY_MANUAL);
  const set = (k: keyof NewLbaAlert) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const fields: Array<[keyof NewLbaAlert, string, string]> = [
    ["abstractNumber", "Abstract number", "LBA5001"],
    ["sponsor", "Sponsor", "Company or institution"],
    ["trialId", "Trial ID", "NCT01234567 / acronym"],
    ["indication", "Indication", "NSCLC"],
    ["phase", "Phase", "Phase 3"],
    ["sourceUrl", "Source link", "https://…"],
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setForm(EMPTY_MANUAL);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a late-breaking abstract</DialogTitle>
          <DialogDescription>
            For LBAs published on the congress site that the scan hasn&apos;t caught yet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lba-title">Title</Label>
            <Input
              id="lba-title"
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="Late-breaker title"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([key, label, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`lba-${key}`}>{label}</Label>
                <Input
                  id={`lba-${key}`}
                  value={(form[key] as string) ?? ""}
                  onChange={(e) => set(key)(e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lba-summary">Summary</Label>
            <Textarea
              id="lba-summary"
              rows={3}
              value={form.summary}
              onChange={(e) => set("summary")(e.target.value)}
              placeholder="One-line description of the readout"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.title.trim() || pending}
            onClick={() => onSubmit({ ...form, title: form.title.trim() })}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add late-breaker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

