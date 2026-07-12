import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sessions as allSessions, delegates } from "@/data/mock";
import { CalendarDown, CalendarClock, UserPlus, TriangleAlert } from "lucide-react";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/pre/planner")({
  head: () => ({ meta: [{ title: "Session Planner — VERA 2.0" }] }),
  component: Planner;
});

function Planner() {
  const [area, setArea] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [delegate, setDelegate] = useState(delegates[0].id);
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      allSessions.filter((s) => s.assignedTo).map((s) => [s.id, s.assignedTo!]),
    ),
  );

  const areas = ["All", "Lung", "Breast", "GI", "GU", "Hematology"];
  const rows = useMemo(
    () => allSessions.filter((s) => area === "All" || s.therapyArea === area),
    [area],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const assign = () => {
    if (selected.size === 0) {
      toast.error("Select sessions to assign first.");
      return;
    }
    const d = delegates.find((x) => x.id === delegate)!;
    setAssignments((prev) => {
      const next = { ...prev };
      selected.forEach((id) => (next[id] = delegate));
      return next;
    });
    toast.success(`Assigned ${selected.size} sessions to ${d.name}`);
    setSelected(new Set());
  };

  const delegateName = (id?: string) => delegates.find((d) => d.id === id)?.initials;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Session Planner"
        description="Filter, tag, and allocate sessions to delegates with automatic conflict detection."
        actions={
          <Button
            variant="secondary"
            onClick={() => toast.success("Calendar (.ics) exported for delegate")}
          >
            <CalendarDays className="h-4 w-4" /> Export calendar
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "All" ? "All therapy areas" : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 rounded-md border bg-card p-1.5">
          <Badge variant={selected.size ? "default" : "secondary"}>
            {selected.size} selected
          </Badge>
          <Select value={delegate} onValueChange={setDelegate}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {delegates.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={assign}>
            <UserPlus className="h-4 w-4" /> Assign
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        {rows.map((s) => {
          const isSelected = selected.has(s.id);
          const assignedTo = assignments[s.id];
          return (
            <Card
              key={s.id}
              className={isSelected ? "border-primary ring-1 ring-primary/30" : undefined}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <Checkbox checked={isSelected} onCheckedChange={() => toggle(s.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{s.title}</span>
                    {s.conflict && (
                      <Badge variant="destructive" className="shrink-0 gap-1 text-[10px]">
                        <TriangleAlert className="h-3 w-3" /> Conflict
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {s.day} · {s.time} · {s.room}
                  </div>
                </div>
                <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">
                  {s.therapyArea}
                </Badge>
                {assignedTo ? (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                    title="Assigned"
                  >
                    {delegateName(assignedTo)}
                  </div>
                ) : (
                  <span className="w-8 text-center text-xs text-muted-foreground">—</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
