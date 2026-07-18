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
} from "lucide-react";

export const Route = createFileRoute("/pre/planner")({
  head: () =>
    routeSeo({
      title: "Coverage Planner — Pharmalix",
      description: "Plan delegate coverage across tracks, companies, formats, KOLs, and assets with drag-and-drop persistence.",
      path: "/pre/planner",
    }),
  component: Planner,
});

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

  // Day order derived from the conference's sessions (first-seen order).
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
      track: uniq(sessions.map((s) => s.therapyArea)),
      company: uniq(sessions.map((s) => s.affiliation)),
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
          matches(filters.track, s.therapyArea) &&
          matches(filters.company, s.affiliation) &&
          matches(filters.format, s.phase) &&
          matches(filters.kol, s.authors) &&
          matches(filters.asset, s.asset) &&
          (query === "" ||
            s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.room.toLowerCase().includes(query.toLowerCase())),
      ),
    [sessions, inAgenda, filters, query],
  );

  const filterConfig: { key: FilterKey; label: string; opts: string[] }[] = [
    { key: "track", label: "Track", opts: options.track },
    { key: "company", label: "Company", opts: options.company },
    { key: "format", label: "Format", opts: options.format },
    { key: "kol", label: "KOL", opts: options.kol },
    { key: "asset", label: "Asset", opts: options.asset },
  ];

  // group agenda by (edited) day, preserving position order.
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

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Session Planner"
        description="Group extracted sessions into a day-by-day agenda. Edit details inline and drag to reorder — everything is saved automatically."
        actions={
          <Button
            variant="secondary"
            onClick={() => toast.success("Agenda exported as calendar (.ics)")}
          >
            <CalendarDays className="h-4 w-4" /> Export agenda
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Available sessions */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {filterConfig.map(({ key, label, opts }) => {
              const selected = filters[key];
              return (
                <DropdownMenu key={key}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={
                        "h-9 justify-between gap-1 font-normal" +
                        (selected.length ? " border-primary/50" : "")
                      }
                    >
                      <span className="truncate">
                        {label}
                        {selected.length > 0 && (
                          <span className="ml-1 text-primary">({selected.length})</span>
                        )}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
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
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search extracted sessions"
              className="pl-9"
            />
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 justify-start px-2 text-xs text-muted-foreground"
              onClick={resetFilters}
            >
              <X className="h-3 w-3" /> Clear {activeFilterCount} filter
              {activeFilterCount === 1 ? "" : "s"}
            </Button>
          )}

          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {available.length} extracted session{available.length === 1 ? "" : "s"}
          </div>
          <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
            {available.map((s) => (
              <Card key={s.id} className="group">
                <CardContent className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-medium">{s.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{s.day}</span>
                      <span>· {s.time}</span>
                      {s.therapyArea && (
                        <Badge variant="secondary" className="text-[10px]">
                          {s.therapyArea}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label="Add to agenda"
                    onClick={() => addMut.mutate(s)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {available.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No sessions match. All extracted sessions may already be in your agenda.
              </div>
            )}
          </div>
        </div>

        {/* Agenda */}
        <div className="flex flex-col gap-5">
          {grouped.length === 0 && (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Your agenda is empty. Add extracted sessions from the left to start
                building a day-by-day plan.
              </p>
            </div>
          )}

          {grouped.map(([day, items]) => (
            <div key={day}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold">{day}</h2>
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
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {s.time || "—"}
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
        </div>
      </div>
    </div>
  );
}
