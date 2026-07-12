import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { sessions as allSessions } from "@/data/mock";
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
  head: () => ({ meta: [{ title: "Session Planner — VERA 2.0" }] }),
  component: Planner,
});

const DAY_ORDER = ["Fri Oct 16", "Sat Oct 17", "Sun Oct 18", "Mon Oct 19"];

interface AgendaItem {
  id: string;
  title: string;
  day: string;
  time: string;
  room: string;
  therapyArea: string;
  conflict?: boolean;
}

function toAgendaItem(s: Session): AgendaItem {
  return {
    id: s.id,
    title: s.title,
    day: s.day,
    time: s.time,
    room: s.room,
    therapyArea: s.therapyArea,
    conflict: s.conflict,
  };
}

function Planner() {
  const [agenda, setAgenda] = useState<AgendaItem[]>(() =>
    allSessions.slice(0, 8).map(toAgendaItem),
  );
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  type FilterKey = "track" | "company" | "format" | "kol" | "asset";
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({
    track: [],
    company: [],
    format: [],
    kol: [],
    asset: [],
  });

  const uniq = (values: string[]) => [...new Set(values)].sort();
  const options = useMemo(
    () => ({
      track: uniq(allSessions.map((s) => s.therapyArea)),
      company: uniq(allSessions.map((s) => s.affiliation)),
      format: uniq(allSessions.map((s) => s.phase)),
      kol: uniq(allSessions.map((s) => s.authors)),
      asset: uniq(allSessions.map((s) => s.asset)),
    }),
    [],
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

  const inAgenda = useMemo(() => new Set(agenda.map((a) => a.id)), [agenda]);

  const available = useMemo(
    () =>
      allSessions.filter(
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
    [inAgenda, filters, query],
  );

  const filterConfig: { key: FilterKey; label: string; opts: string[] }[] = [
    { key: "track", label: "Track", opts: options.track },
    { key: "company", label: "Company", opts: options.company },
    { key: "format", label: "Format", opts: options.format },
    { key: "kol", label: "KOL", opts: options.kol },
    { key: "asset", label: "Asset", opts: options.asset },
  ];



  // group agenda by day, preserving insertion order within each day
  const grouped = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of agenda) {
      if (!map.has(item.day)) map.set(item.day, []);
      map.get(item.day)!.push(item);
    }
    return [...map.entries()].sort(
      (a, b) => DAY_ORDER.indexOf(a[0]) - DAY_ORDER.indexOf(b[0]),
    );
  }, [agenda]);

  const add = (s: Session) => {
    setAgenda((prev) => [...prev, toAgendaItem(s)]);
    toast.success("Added to agenda");
  };

  const remove = (id: string) =>
    setAgenda((prev) => prev.filter((a) => a.id !== id));

  const update = (id: string, patch: Partial<AgendaItem>) =>
    setAgenda((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  // move an item up/down among its same-day siblings within the flat list
  const moveWithinDay = (id: string, dir: -1 | 1) => {
    setAgenda((prev) => {
      const item = prev.find((a) => a.id === id);
      if (!item) return prev;
      const sameDay = prev.filter((a) => a.day === item.day);
      const idx = sameDay.findIndex((a) => a.id === id);
      const swapWith = sameDay[idx + dir];
      if (!swapWith) return prev;
      const next = [...prev];
      const i = next.findIndex((a) => a.id === id);
      const j = next.findIndex((a) => a.id === swapWith.id);
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setAgenda((prev) => {
      const from = prev.findIndex((a) => a.id === dragId);
      const to = prev.findIndex((a) => a.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      moved.day = next[to > from ? to - 1 : to]?.day ?? moved.day;
      const insertAt = next.findIndex((a) => a.id === targetId);
      next.splice(insertAt, 0, moved);
      return next;
    });
    setDragId(null);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Session Planner"
        description="Group extracted sessions into a day-by-day agenda. Edit details inline and drag to reorder."
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
                      <Badge variant="secondary" className="text-[10px]">
                        {s.therapyArea}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label="Add to agenda"
                    onClick={() => add(s)}
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
                  const isEditing = editing === item.id;
                  return (
                    <Card
                      key={item.id}
                      draggable={!isEditing}
                      onDragStart={() => setDragId(item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(item.id)}
                      className={
                        dragId === item.id ? "opacity-50" : "transition-shadow"
                      }
                    >
                      <CardContent className="flex items-start gap-2 p-3">
                        <div className="flex flex-col items-center gap-0.5 pt-0.5 text-muted-foreground">
                          <GripVertical className="h-4 w-4 cursor-grab" />
                        </div>

                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="grid gap-2">
                              <Input
                                value={item.title}
                                onChange={(e) =>
                                  update(item.id, { title: e.target.value })
                                }
                                className="h-8"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Select
                                  value={item.day}
                                  onValueChange={(v) => update(item.id, { day: v })}
                                >
                                  <SelectTrigger className="h-8 w-[140px]">
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
                                  value={item.time}
                                  onChange={(e) =>
                                    update(item.id, { time: e.target.value })
                                  }
                                  className="h-8 w-24"
                                  placeholder="Time"
                                />
                                <Input
                                  value={item.room}
                                  onChange={(e) =>
                                    update(item.id, { room: e.target.value })
                                  }
                                  className="h-8 w-36"
                                  placeholder="Room"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {item.title}
                                </span>
                                {item.conflict && (
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
                                  <Clock className="h-3 w-3" /> {item.time}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" /> {item.room}
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {item.therapyArea}
                                </Badge>
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
                            onClick={() => moveWithinDay(item.id, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Move down"
                            disabled={idx === items.length - 1}
                            onClick={() => moveWithinDay(item.id, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label={isEditing ? "Done editing" : "Edit session"}
                            onClick={() =>
                              setEditing(isEditing ? null : item.id)
                            }
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
                            onClick={() => remove(item.id)}
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
