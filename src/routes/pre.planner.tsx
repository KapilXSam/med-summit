import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/context/app-context";
import {
  fetchSessions,
  fetchAgenda,
  addAgendaItem,
  removeAgendaItem,
  updateAgendaItem,
  reorderAgenda,
  updateSession,
  type AgendaRow,
} from "@/lib/db";
import type { Session } from "@/data/types";
import {
  CalendarDays,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Search,
  Pencil,
  Check,
  TriangleAlert,
  Clock,
  MapPin,
  X,
  ChevronsUpDown,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/pre/planner")({
  head: () =>
    routeSeo({
      title: "Coverage Planner — Pharmalix",
      description:
        "Plan delegate coverage across tracks, companies, formats, KOLs, and assets with drag-and-drop persistence.",
      path: "/pre/planner",
    }),
  component: Planner,
});

// Base timezone the source agenda times are recorded in (ESMO ⇒ CET).
const TIMEZONES: { value: string; label: string; offsetH: number }[] = [
  { value: "CET", label: "CET · Munich (source)", offsetH: 0 },
  { value: "GMT", label: "GMT · London", offsetH: -1 },
  { value: "ET", label: "ET · New York", offsetH: -6 },
  { value: "CT", label: "CT · Chicago", offsetH: -7 },
  { value: "PT", label: "PT · San Francisco", offsetH: -9 },
  { value: "IST", label: "IST · Mumbai", offsetH: 3.5 },
  { value: "JST", label: "JST · Tokyo", offsetH: 8 },
];

// Map trial assets (drugs / competitor tags) to their trial sponsor company.
const ASSET_SPONSOR: Record<string, string> = {
  "VRA-101": "Veranex Therapeutics",
  "VRA-204": "Veranex Therapeutics",
  "Competitor A": "Merck & Co.",
  "Competitor B": "AstraZeneca",
  SoC: "Investigator-sponsored",
};

function sponsorFor(s: { asset?: string; trialId?: string; affiliation?: string }) {
  if (s.asset && ASSET_SPONSOR[s.asset]) return ASSET_SPONSOR[s.asset];
  if (s.trialId) return "Industry-sponsored trial";
  return s.affiliation || "";
}

// Derive a specific indication from the session title. Falls back to the
// stored therapy area (broader bucket) when no disease keyword is found.
const INDICATION_RULES: { label: string; patterns: RegExp[] }[] = [
  { label: "NSCLC", patterns: [/\bNSCLC\b/i, /non[- ]small[- ]cell lung/i, /\blung\b/i] },
  { label: "SCLC", patterns: [/\bSCLC\b/i, /small[- ]cell lung/i] },
  { label: "Breast cancer", patterns: [/\bbreast\b/i, /\bHER2\b/i, /\bHR\+/i, /triple[- ]negative/i, /\bTNBC\b/i] },
  { label: "Colorectal cancer", patterns: [/colorectal/i, /\bCRC\b/i, /\brectal\b/i, /\bcolon\b/i] },
  { label: "Prostate cancer", patterns: [/prostate/i, /\bmCRPC\b/i, /castration[- ]resistant/i] },
  { label: "Ovarian cancer", patterns: [/ovarian/i] },
  { label: "Lymphoma", patterns: [/lymphoma/i, /\bDLBCL\b/i, /Hodgkin/i] },
  { label: "Leukemia", patterns: [/leukemia/i, /\bAML\b/i, /\bCLL\b/i, /\bALL\b/i] },
  { label: "Multiple myeloma", patterns: [/myeloma/i] },
  { label: "Melanoma", patterns: [/melanoma/i] },
  { label: "Gastric cancer", patterns: [/gastric/i, /stomach cancer/i] },
  { label: "Pancreatic cancer", patterns: [/pancrea/i] },
  { label: "Hepatocellular carcinoma", patterns: [/hepatocellular/i, /\bHCC\b/i, /liver cancer/i] },
  { label: "Bladder / urothelial", patterns: [/bladder/i, /urothelial/i] },
  { label: "Head & neck cancer", patterns: [/head and neck/i, /\bHNSCC\b/i] },
  { label: "Renal cell carcinoma", patterns: [/renal cell/i, /\bRCC\b/i, /kidney cancer/i] },
  { label: "Glioma / CNS", patterns: [/glioma/i, /glioblastoma/i, /\bGBM\b/i] },
  { label: "Cervical cancer", patterns: [/cervical/i] },
  { label: "Endometrial cancer", patterns: [/endometrial/i] },
];

function indicationFor(s: { title?: string; therapyArea?: string }) {
  const title = s.title || "";
  for (const rule of INDICATION_RULES) {
    if (rule.patterns.some((p) => p.test(title))) return rule.label;
  }
  return s.therapyArea || "Other";
}

const INDICATION_OPTIONS = INDICATION_RULES.map((r) => r.label);

function shiftTime(time: string, offsetH: number): string {
  if (!time || offsetH === 0) return time;
  // supports "09:00", "09:00-10:30", "09:00–10:30", with optional trailing text
  return time.replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => {
    const totalMin = parseInt(h, 10) * 60 + parseInt(m, 10) + offsetH * 60;
    const wrapped = ((totalMin % 1440) + 1440) % 1440;
    const hh = Math.floor(wrapped / 60)
      .toString()
      .padStart(2, "0");
    const mm = Math.floor(wrapped % 60)
      .toString()
      .padStart(2, "0");
    return `${hh}:${mm}`;
  });
}

function Planner() {
  const { conference } = useApp();
  const conferenceId = conference.id;
  const qc = useQueryClient();

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", conferenceId],
    queryFn: () => fetchSessions(conferenceId),
  });
  const { data: agendaRows = [] } = useQuery({
    queryKey: ["agenda", conferenceId],
    queryFn: () => fetchAgenda(conferenceId),
  });

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>("CET");
  const tzOffset = TIMEZONES.find((t) => t.value === timezone)?.offsetH ?? 0;
  const [rowTz, setRowTz] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState<Record<string, "High" | "Medium" | "Low">>({});


  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["agenda", conferenceId] });
    qc.invalidateQueries({ queryKey: ["sessions", conferenceId] });
  };

  const addMut = useMutation({
    mutationFn: (s: Session) =>
      addAgendaItem(conferenceId, s.id, s.day, agendaRows.length),
    onSuccess: () => {
      invalidate();
      toast.success("Added to agenda");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeMut = useMutation({
    mutationFn: (id: string) => removeAgendaItem(id),
    onSuccess: invalidate,
  });
  const updItemMut = useMutation({
    mutationFn: ({ id, day }: { id: string; day: string }) =>
      updateAgendaItem(id, { day }),
    onSuccess: invalidate,
  });
  const updSessionMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Session> }) =>
      updateSession(id, patch),
    onSuccess: invalidate,
  });
  const reorderMut = useMutation({
    mutationFn: reorderAgenda,
    onSuccess: invalidate,
  });

  const DAY_ORDER = useMemo(() => {
    const seen: string[] = [];
    for (const s of sessions) if (s.day && !seen.includes(s.day)) seen.push(s.day);
    return seen;
  }, [sessions]);

  type FilterKey = "track" | "company" | "format" | "kol" | "asset";
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    track: [],
    company: [],
    format: [],
    kol: [],
    asset: [],
  });

  const uniq = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
  const options = useMemo(
    () => ({
      track: uniq([...INDICATION_OPTIONS, ...sessions.map((s) => indicationFor(s))]),
      company: uniq(sessions.map((s) => sponsorFor(s))),
      format: uniq(sessions.map((s) => s.phase)),
      kol: uniq(sessions.map((s) => s.authors)),
      asset: uniq(sessions.map((s) => s.asset)),
    }),
    [sessions],
  );

  const toggleFilter = (key: FilterKey, value: string) =>
    setFilters((prev) => {
      const set = new Set(prev[key]);
      set.has(value) ? set.delete(value) : set.add(value);
      return { ...prev, [key]: [...set] };
    });
  const clearFilter = (key: FilterKey) =>
    setFilters((prev) => ({ ...prev, [key]: [] }));
  const resetFilters = () =>
    setFilters({ track: [], company: [], format: [], kol: [], asset: [] });
  const activeFilterCount = Object.values(filters).reduce(
    (n, arr) => n + arr.length,
    0,
  );

  const matches = (selected: string[], value: string) =>
    selected.length === 0 || selected.includes(value);

  const inAgenda = useMemo(
    () => new Set(agendaRows.map((a) => a.sessionId)),
    [agendaRows],
  );

  const available = useMemo(
    () =>
      sessions.filter(
        (s) =>
          !inAgenda.has(s.id) &&
          matches(filters.track, indicationFor(s)) &&
          matches(filters.company, sponsorFor(s)) &&
          matches(filters.format, s.phase) &&
          matches(filters.kol, s.authors) &&
          matches(filters.asset, s.asset) &&
          (query === "" ||
            s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.room.toLowerCase().includes(query.toLowerCase()) ||
            s.authors.toLowerCase().includes(query.toLowerCase()) ||
            s.affiliation.toLowerCase().includes(query.toLowerCase())),
      ),
    [sessions, inAgenda, filters, query],
  );

  const filterConfig: { key: FilterKey; label: string; opts: string[] }[] = [
    { key: "track", label: "Indication", opts: options.track },
    { key: "company", label: "Company", opts: options.company },
    { key: "format", label: "Format", opts: options.format },
    { key: "kol", label: "KOL", opts: options.kol },
    { key: "asset", label: "Asset", opts: options.asset },
  ];

  const grouped = useMemo(() => {
    const map = new Map<string, AgendaRow[]>();
    for (const item of agendaRows) {
      const day = item.day || item.session?.day || "Unscheduled";
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(item);
    }
    return [...map.entries()].sort((a, b) => {
      const ai = DAY_ORDER.indexOf(a[0]);
      const bi = DAY_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [agendaRows, DAY_ORDER]);

  const moveWithinDay = (row: AgendaRow, dir: -1 | 1) => {
    const day = row.day || row.session?.day || "Unscheduled";
    const sameDay = agendaRows.filter(
      (a) => (a.day || a.session?.day || "Unscheduled") === day,
    );
    const idx = sameDay.findIndex((a) => a.id === row.id);
    const swapWith = sameDay[idx + dir];
    if (!swapWith) return;
    reorderMut.mutate([
      { id: row.id, position: swapWith.position, day },
      { id: swapWith.id, position: row.position, day },
    ]);
  };

  const onDrop = (target: AgendaRow) => {
    if (!dragId || dragId === target.id) return;
    const dragged = agendaRows.find((a) => a.id === dragId);
    if (!dragged) return;
    const targetDay = target.day || target.session?.day || "Unscheduled";
    reorderMut.mutate([{ id: dragged.id, position: target.position, day: targetDay }]);
    setDragId(null);
  };

  const indicationOptions = [...new Set([...INDICATION_OPTIONS, ...options.track])];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Session Planner"
        description="Browse the extracted session catalogue, then add sessions to build a day-by-day agenda."
        actions={
          <Button
            variant="secondary"
            onClick={() => toast.success("Agenda exported as calendar (.ics)")}
          >
            <CalendarDays className="h-4 w-4" /> Export agenda
          </Button>
        }
      />

      {/* Extracted sessions table */}
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold">Extracted sessions</h2>
          <Badge variant="secondary" className="text-[10px]">
            {available.length}
          </Badge>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, room, presenter…"
                className="h-9 w-64 pl-9"
              />
            </div>

            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="h-9 w-[210px]">
                <Clock className="h-3.5 w-3.5 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filterConfig.map(({ key, label, opts }) => {
              const selected = filters[key];
              return (
                <DropdownMenu key={key}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        "h-9 gap-1 font-normal" +
                        (selected.length ? " border-primary/50" : "")
                      }
                    >
                      {label}
                      {selected.length > 0 && (
                        <span className="text-primary">({selected.length})</span>
                      )}
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-72 w-56 overflow-y-auto"
                  >
                    <DropdownMenuLabel className="flex items-center justify-between">
                      {label}
                      {selected.length > 0 && (
                        <button
                          className="text-xs font-normal text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            clearFilter(key);
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {opts.map((o) => (
                      <DropdownMenuCheckboxItem
                        key={o}
                        checked={selected.includes(o)}
                        onCheckedChange={() => toggleFilter(key, o)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {o}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {opts.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No values
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1 text-xs text-muted-foreground"
                onClick={resetFilters}
              >
                <X className="h-3 w-3" /> Clear {activeFilterCount}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="max-h-[62vh] overflow-auto">
              <Table className="w-full min-w-[1920px] table-fixed">
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-[56px]">#</TableHead>
                    <TableHead className="w-[260px]">Session title</TableHead>
                    <TableHead className="w-[170px]">Indication</TableHead>
                    <TableHead className="w-[150px]">Sponsor</TableHead>
                    <TableHead className="w-[130px]">Time</TableHead>
                    <TableHead className="w-[150px]">Timezone</TableHead>
                    <TableHead className="w-[110px]">Day</TableHead>
                    <TableHead className="w-[140px]">Hall / Room</TableHead>
                    <TableHead className="w-[160px]">Presenter</TableHead>
                    <TableHead className="w-[150px]">Related / Asset</TableHead>
                    <TableHead className="w-[140px]">Clinical Status</TableHead>
                    <TableHead className="w-[130px]">Priority</TableHead>
                    <TableHead className="w-[70px] text-right">Add</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {available.map((s, i) => {
                    const rowTimezone = rowTz[s.id] ?? timezone;
                    const rowOffset =
                      TIMEZONES.find((t) => t.value === rowTimezone)?.offsetH ?? 0;
                    const rowPriority = priority[s.id] ?? "Medium";
                    return (
                    <TableRow key={s.id} className="align-top">
                      <TableCell className="pt-3 font-mono text-xs text-muted-foreground tabular-nums">
                        {String(i + 1).padStart(3, "0")}
                      </TableCell>
                      <TableCell className="pt-3">
                        <div className="text-sm font-medium leading-snug break-words">
                          {s.title}
                        </div>
                        {s.trialId && (
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {s.trialId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="pt-2">
                        <Select
                          value={
                            s.therapyArea && INDICATION_OPTIONS.includes(s.therapyArea)
                              ? s.therapyArea
                              : indicationFor(s)
                          }
                          onValueChange={(v) =>
                            updSessionMut.mutate({
                              id: s.id,
                              patch: { therapyArea: v },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {indicationOptions.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="pt-3 text-xs break-words">
                        {sponsorFor(s) || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pt-3 font-mono text-xs tabular-nums">
                        {shiftTime(s.time, rowOffset) || "—"}
                      </TableCell>
                      <TableCell className="pt-2">
                        <Select
                          value={rowTimezone}
                          onValueChange={(v) =>
                            setRowTz((prev) => ({ ...prev, [s.id]: v }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <Clock className="h-3 w-3 opacity-60" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="pt-3 text-xs text-muted-foreground">
                        {s.day || "—"}
                      </TableCell>
                      <TableCell className="pt-3 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {s.room || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="pt-3 text-xs break-words">
                        {s.authors || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pt-3 text-xs">
                        {s.asset ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {s.asset}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pt-3 text-xs">
                        {s.phase || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pt-2">
                        <Select
                          value={rowPriority}
                          onValueChange={(v) =>
                            setPriority((prev) => ({
                              ...prev,
                              [s.id]: v as "High" | "Medium" | "Low",
                            }))
                          }
                        >
                          <SelectTrigger
                            className={
                              "h-8 text-xs " +
                              (rowPriority === "High"
                                ? "border-destructive/50 text-destructive"
                                : rowPriority === "Low"
                                  ? "text-muted-foreground"
                                  : "")
                            }
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="pt-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Add to agenda"
                          onClick={() => addMut.mutate(s)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {available.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No sessions match. All extracted sessions may already be in
                        your agenda.
                      </TableCell>
                    </TableRow>
                  )}

                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Day-by-day agenda */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Day-by-day agenda</h2>
          <Badge variant="secondary" className="text-[10px]">
            {agendaRows.length} session{agendaRows.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {grouped.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Your agenda is empty. Add extracted sessions from the table above to
              start building a day-by-day plan.
            </p>
          </div>
        )}

        {grouped.map(([day, items]) => (
          <div key={day}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{day}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {items.length} session{items.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="grid gap-2">
              {items.map((item, idx) => {
                const s = item.session;
                if (!s) return null;
                const isEditing = editing === item.id;
                const rowDay = item.day || s.day;
                return (
                  <Card
                    key={item.id}
                    draggable={!isEditing}
                    onDragStart={() => setDragId(item.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(item)}
                    className={dragId === item.id ? "opacity-50" : "transition-shadow"}
                  >
                    <CardContent className="flex items-start gap-2 p-3">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5 text-muted-foreground">
                        <GripVertical className="h-4 w-4 cursor-grab" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="grid gap-2">
                            <Input
                              defaultValue={s.title}
                              onBlur={(e) =>
                                e.target.value !== s.title &&
                                updSessionMut.mutate({
                                  id: s.id,
                                  patch: { title: e.target.value },
                                })
                              }
                              className="h-8"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Select
                                value={rowDay}
                                onValueChange={(v) =>
                                  updItemMut.mutate({ id: item.id, day: v })
                                }
                              >
                                <SelectTrigger className="h-8 w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DAY_ORDER.map((d) => (
                                    <SelectItem key={d} value={d}>
                                      {d}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                defaultValue={s.time}
                                onBlur={(e) =>
                                  e.target.value !== s.time &&
                                  updSessionMut.mutate({
                                    id: s.id,
                                    patch: { time: e.target.value },
                                  })
                                }
                                className="h-8 w-24"
                                placeholder="Time"
                              />
                              <Input
                                defaultValue={s.room}
                                onBlur={(e) =>
                                  e.target.value !== s.room &&
                                  updSessionMut.mutate({
                                    id: s.id,
                                    patch: { room: e.target.value },
                                  })
                                }
                                className="h-8 w-36"
                                placeholder="Room"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{s.title}</span>
                              {s.conflict && (
                                <Badge
                                  variant="destructive"
                                  className="shrink-0 gap-1 text-[10px]"
                                >
                                  <TriangleAlert className="h-3 w-3" /> Conflict
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Clock className="h-3 w-3" />{" "}
                                {shiftTime(s.time, tzOffset) || "—"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {s.room || "—"}
                              </span>
                              {s.therapyArea && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {s.therapyArea}
                                </Badge>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label="Move up"
                          disabled={idx === 0}
                          onClick={() => moveWithinDay(item, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label="Move down"
                          disabled={idx === items.length - 1}
                          onClick={() => moveWithinDay(item, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label={isEditing ? "Done editing" : "Edit session"}
                          onClick={() => setEditing(isEditing ? null : item.id)}
                        >
                          {isEditing ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label="Remove from agenda"
                          onClick={() => removeMut.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
