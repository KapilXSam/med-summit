import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/context/app-context";
import { useSessions, useKits } from "@/lib/hooks";
import {
  fetchCiContacts,
  upsertCiContact,
  deleteCiContact,
  type CiContact,
  type CiPriority,
  type CiStatus,
} from "@/lib/ci-contacts";
import { buildPeople, initialsOf, startMinutes, type Person } from "@/lib/people";
import {
  Users,
  Search,
  Download,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  MapPin,
  Clock,
  Building2,
  Target,
  Trash2,
  ExternalLink,
  X,
} from "lucide-react";

export const Route = createFileRoute("/pre/people")({
  head: () =>
    routeSeo({
      title: "Primary CI · People Finder — Pharmalix",
      description:
        "Find the right person from the right company, at the right hall and time, and ask your key intelligence questions at the congress.",
      path: "/pre/people",
    }),
  component: PeopleFinder,
});

const PRIORITIES: CiPriority[] = ["High", "Medium", "Low"];
const STATUSES: CiStatus[] = ["To approach", "Approached", "Done"];

function priorityTone(p: CiPriority) {
  return p === "High"
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : p === "Medium"
      ? "bg-primary/10 text-primary border-primary/20"
      : "bg-muted text-muted-foreground border-border";
}

function statusTone(s: CiStatus) {
  return s === "Done"
    ? "bg-success/10 text-success border-success/20"
    : s === "Approached"
      ? "bg-warning/10 text-warning border-warning/20"
      : "bg-muted text-muted-foreground border-border";
}

function MultiFilter({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
              {selected.length}
            </Badge>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          {label}
          {selected.length > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={onClear}>
              Clear
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No values yet</p>
        )}
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o}
            checked={selected.includes(o)}
            onCheckedChange={() => onToggle(o)}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="truncate">{o}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PeopleFinder() {
  const { conference } = useApp();
  const qc = useQueryClient();
  const { data: sessions = [], isLoading } = useSessions();
  const { data: kits = [] } = useKits();
  const { data: contacts = [] } = useQuery({
    queryKey: ["ci-contacts", conference.id],
    queryFn: () => fetchCiContacts(conference.id),
  });

  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [indications, setIndications] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [halls, setHalls] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<"person" | "company">("person");
  const [nowOnly, setNowOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<Person | null>(null);

  const kiqOptions = useMemo(
    () => kits.flatMap((k) => k.kiqs.map((q) => ({ ...q, kit: k.topic }))),
    [kits],
  );

  const derived = useMemo(() => buildPeople(sessions), [sessions]);

  /** Manual contacts become synthetic people so they show up in the same table. */
  const people: Person[] = useMemo(() => {
    const byKey = new Map(derived.map((p) => [p.key, p]));
    for (const c of contacts.filter((c) => c.manual)) {
      if (byKey.has(c.personKey)) continue;
      byKey.set(c.personKey, {
        key: c.personKey,
        name: c.personName,
        company: c.company || "Unaffiliated",
        manual: true,
        appearances: [
          {
            sessionId: c.id,
            sessionTitle: c.sessionTitle,
            day: c.day,
            time: c.time,
            room: c.room,
            asset: c.asset,
            trialId: c.trialId || undefined,
            indication: c.indication,
          },
        ],
      });
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [derived, contacts]);

  const contactByKey = useMemo(() => {
    const m = new Map<string, CiContact>();
    for (const c of contacts) m.set(c.personKey, c);
    return m;
  }, [contacts]);

  const options = useMemo(() => {
    const uniq = (v: string[]) => [...new Set(v.filter(Boolean))].sort();
    return {
      companies: uniq(people.map((p) => p.company)),
      indications: uniq(people.flatMap((p) => p.appearances.map((a) => a.indication))),
      days: uniq(people.flatMap((p) => p.appearances.map((a) => a.day))),
      halls: uniq(people.flatMap((p) => p.appearances.map((a) => a.room))),
    };
  }, [people]);

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people
      .map((p) => {
        const apps = p.appearances.filter((a) => {
          if (indications.length && !indications.includes(a.indication)) return false;
          if (days.length && !days.includes(a.day)) return false;
          if (halls.length && !halls.includes(a.room)) return false;
          if (nowOnly) {
            const start = startMinutes(a.time);
            if (start === null || start < nowMinutes - 30 || start > nowMinutes + 120)
              return false;
          }
          return true;
        });
        return { ...p, appearances: apps };
      })
      .filter((p) => {
        if (p.appearances.length === 0) return false;
        if (companies.length && !companies.includes(p.company)) return false;
        if (statusFilter.length) {
          const st = contactByKey.get(p.key)?.status ?? "To approach";
          if (!statusFilter.includes(st)) return false;
        }
        if (
          q &&
          !p.name.toLowerCase().includes(q) &&
          !p.company.toLowerCase().includes(q) &&
          !p.appearances.some((a) => a.sessionTitle.toLowerCase().includes(q))
        )
          return false;
        return true;
      });
  }, [
    people,
    search,
    companies,
    indications,
    days,
    halls,
    statusFilter,
    nowOnly,
    nowMinutes,
    contactByKey,
  ]);

  const byCompany = useMemo(() => {
    const m = new Map<string, Person[]>();
    for (const p of filtered) {
      const list = m.get(p.company) ?? [];
      list.push(p);
      m.set(p.company, list);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);




  const save = useMutation({
    mutationFn: (input: {
      person: Person;
      patch: Partial<Pick<CiContact, "priority" | "status" | "kiqId" | "note">>;
    }) => {
      const existing = contactByKey.get(input.person.key);
      const first = input.person.appearances[0];
      return upsertCiContact({
        conferenceId: conference.id,
        personName: input.person.name,
        personKey: input.person.key,
        company: input.person.company,
        sessionTitle: existing?.sessionTitle ?? first?.sessionTitle ?? "",
        asset: existing?.asset ?? first?.asset ?? "",
        trialId: existing?.trialId ?? first?.trialId ?? "",
        day: existing?.day ?? first?.day ?? "",
        time: existing?.time ?? first?.time ?? "",
        room: existing?.room ?? first?.room ?? "",
        indication: existing?.indication ?? first?.indication ?? "",
        manual: existing?.manual ?? input.person.manual,
        priority: existing?.priority ?? "Medium",
        status: existing?.status ?? "To approach",
        kiqId: existing?.kiqId,
        note: existing?.note ?? "",
        ...input.patch,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ci-contacts", conference.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeManual = useMutation({
    mutationFn: (id: string) => deleteCiContact(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ci-contacts", conference.id] });
      toast.success("Contact removed");
    },
  });

  const exportCsv = () => {
    const head = [
      "Person",
      "Company",
      "Session",
      "Asset / Trial",
      "Day",
      "Time",
      "Hall",
      "Indication",
      "Priority",
      "Status",
      "KIQ",
      "Note",
    ];
    const rows: string[][] = [];
    for (const p of filtered) {
      const c = contactByKey.get(p.key);
      const kiq = kiqOptions.find((k) => k.id === c?.kiqId)?.question ?? "";
      for (const a of p.appearances) {
        rows.push([
          p.name,
          p.company,
          a.sessionTitle,
          [a.asset, a.trialId].filter(Boolean).join(" / "),
          a.day,
          a.time,
          a.room,
          a.indication,
          c?.priority ?? "",
          c?.status ?? "",
          kiq,
          c?.note ?? "",
        ]);
      }
    }
    const csv = [head, ...rows]
      .map((r) => r.map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conference.acronym.replace(/\s+/g, "-").toLowerCase()}-primary-ci.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows`);
  };

  const priorityCount = contacts.filter((c) => c.priority === "High").length;
  const doneCount = contacts.filter((c) => c.status === "Done").length;

  const clearAll = () => {
    setCompanies([]);
    setIndications([]);
    setDays([]);
    setHalls([]);
    setStatusFilter([]);
    setSearch("");
    setNowOnly(false);
  };

  const anyFilter =
    companies.length + indications.length + days.length + halls.length + statusFilter.length > 0 ||
    !!search ||
    nowOnly;

  const toggle = (setter: (fn: (v: string[]) => string[]) => void) => (v: string) =>
    setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  return (
    <div>
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Primary CI · People Finder"
        description="Every person presenting at this congress, by company — with the session, asset, time and hall where you can find them to ask your KIQs."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add person
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="People identified" value={people.length} />
        <StatCard icon={Building2} label="Companies" value={options.companies.length} />
        <StatCard icon={Target} label="High priority targets" value={priorityCount} />
        <StatCard icon={Clock} label="Approaches completed" value={doneCount} />
      </div>

      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search person, company or session…"
              className="pl-8"
            />
          </div>
          <MultiFilter
            label="Company"
            options={options.companies}
            selected={companies}
            onToggle={toggle(setCompanies)}
            onClear={() => setCompanies([])}
          />
          <MultiFilter
            label="Indication"
            options={options.indications}
            selected={indications}
            onToggle={toggle(setIndications)}
            onClear={() => setIndications([])}
          />
          <MultiFilter
            label="Day"
            options={options.days}
            selected={days}
            onToggle={toggle(setDays)}
            onClear={() => setDays([])}
          />
          <MultiFilter
            label="Hall"
            options={options.halls}
            selected={halls}
            onToggle={toggle(setHalls)}
            onClear={() => setHalls([])}
          />
          <MultiFilter
            label="Status"
            options={STATUSES}
            selected={statusFilter}
            onToggle={toggle(setStatusFilter)}
            onClear={() => setStatusFilter([])}
          />
          <Button
            variant={nowOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setNowOnly((v) => !v)}
          >
            <Clock className="mr-1.5 h-4 w-4" /> Right now
          </Button>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as "person" | "company")}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="person">Group by person</SelectItem>
              <SelectItem value="company">Group by company</SelectItem>
            </SelectContent>
          </Select>
          {anyFilter && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          )}
        </CardContent>
      </Card>



      {isLoading ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Loading people from the planner…
          </CardContent>
        </Card>
      ) : people.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No people yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              People are derived from the presenters and authors of imported sessions. Import or add
              sessions in the Session Planner first, or add a contact manually.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add person manually
            </Button>
          </CardContent>
        </Card>
      ) : groupBy === "company" ? (
        <div className="space-y-4">
          {byCompany.map(([company, list]) => (
            <Card key={company}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{company}</span>
                  </div>
                  <Badge variant="secondary">{list.length} people</Badge>
                </div>
                <PeopleTable
                  people={list}
                  contactByKey={contactByKey}
                  kiqOptions={kiqOptions}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  onSave={(person, patch) => save.mutate({ person, patch })}
                  onNote={setNoteFor}
                  onDelete={(key) => {
                    const c = contactByKey.get(key);
                    if (c) removeManual.mutate(c.id);
                  }}
                  hideCompany
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <PeopleTable
              people={filtered}
              contactByKey={contactByKey}
              kiqOptions={kiqOptions}
              expanded={expanded}
              setExpanded={setExpanded}
              onSave={(person, patch) => save.mutate({ person, patch })}
              onNote={setNoteFor}
              onDelete={(key) => {
                const c = contactByKey.get(key);
                if (c) removeManual.mutate(c.id);
              }}
            />
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && people.length > 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No people match the current filters.
        </p>
      )}

      <AddPersonDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        conferenceId={conference.id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["ci-contacts", conference.id] })}
      />

      <NoteDialog
        person={noteFor}
        initial={noteFor ? (contactByKey.get(noteFor.key)?.note ?? "") : ""}
        onClose={() => setNoteFor(null)}
        onSave={(note) => {
          if (noteFor) save.mutate({ person: noteFor, patch: { note } });
          setNoteFor(null);
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PeopleTable({
  people,
  contactByKey,
  kiqOptions,
  expanded,
  setExpanded,
  onSave,
  onNote,
  onDelete,
  hideCompany,
}: {
  people: Person[];
  contactByKey: Map<string, CiContact>;
  kiqOptions: { id: string; question: string; kit: string }[];
  expanded: Record<string, boolean>;
  setExpanded: (fn: (v: Record<string, boolean>) => Record<string, boolean>) => void;
  onSave: (person: Person, patch: Partial<CiContact>) => void;
  onNote: (p: Person) => void;
  onDelete: (key: string) => void;
  hideCompany?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead className="min-w-44">Person</TableHead>
          {!hideCompany && <TableHead className="min-w-40">Company</TableHead>}
          <TableHead className="min-w-32">Location</TableHead>
          <TableHead className="min-w-64">Session</TableHead>
          <TableHead className="min-w-32">Asset / Trial</TableHead>
          <TableHead className="min-w-28">Date</TableHead>
          <TableHead className="min-w-24">Time</TableHead>
          <TableHead className="min-w-28">Hall</TableHead>
          <TableHead className="min-w-32">Indication</TableHead>
          <TableHead className="min-w-28">Priority</TableHead>
          <TableHead className="min-w-36">Status</TableHead>
          <TableHead className="min-w-52">KIQ to ask</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.map((p) => {
          const c = contactByKey.get(p.key);
          const first = p.appearances[0];
          const more = p.appearances.length - 1;
          const isOpen = !!expanded[p.key];
          return (
            <Fragment key={p.key}>
              <TableRow className="align-top">
                <TableCell className="pt-4">
                  {more > 0 ? (
                    <button
                      onClick={() => setExpanded((v) => ({ ...v, [p.key]: !v[p.key] }))}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={isOpen ? "Collapse appearances" : "Expand appearances"}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {initialsOf(p.name)}
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{p.name}</p>
                      {more > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {p.appearances.length} appearances
                        </p>
                      )}
                      {p.manual && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          manual
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                {!hideCompany && (
                  <TableCell className="text-sm text-muted-foreground">{p.company}</TableCell>
                )}
                <TableCell className="text-sm">
                  <span className="line-clamp-2">{first?.sessionTitle || "—"}</span>
                  {first?.sourceUrl && (
                    <a
                      href={first.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Session page <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {[first?.asset, first?.trialId].filter(Boolean).join(" / ") || "—"}
                </TableCell>
                <TableCell className="text-sm">{first?.day || "—"}</TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {first?.time || "—"}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {first?.room || "—"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[11px]">
                    {first?.indication || "—"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={c?.priority ?? "Medium"}
                    onValueChange={(v) => onSave(p, { priority: v as CiPriority })}
                  >
                    <SelectTrigger
                      className={`h-8 w-full border text-xs ${priorityTone(c?.priority ?? "Medium")}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={c?.status ?? "To approach"}
                    onValueChange={(v) => onSave(p, { status: v as CiStatus })}
                  >
                    <SelectTrigger
                      className={`h-8 w-full border text-xs ${statusTone(c?.status ?? "To approach")}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={c?.kiqId ?? "none"}
                    onValueChange={(v) => onSave(p, { kiqId: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Assign KIQ" />
                    </SelectTrigger>
                    <SelectContent className="max-w-80">
                      <SelectItem value="none">No KIQ assigned</SelectItem>
                      {kiqOptions.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          <span className="line-clamp-1">{k.question}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {c?.note && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{c.note}</p>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onNote(p)}>
                    Note
                  </Button>
                  {p.manual && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(p.key)}
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              {isOpen &&
                p.appearances.slice(1).map((a, i) => (
                  <TableRow key={`${p.key}-a${i}`} className="bg-muted/30 text-sm">
                    <TableCell />
                    <TableCell className="text-xs text-muted-foreground">also presenting</TableCell>
                    {!hideCompany && <TableCell />}
                    <TableCell className="text-sm">
                      <span className="line-clamp-2">{a.sessionTitle}</span>
                    </TableCell>
                    <TableCell>{[a.asset, a.trialId].filter(Boolean).join(" / ") || "—"}</TableCell>
                    <TableCell>{[a.day, a.time].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell>{a.room || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[11px]">
                        {a.indication}
                      </Badge>
                    </TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                ))}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function NoteDialog({
  person,
  initial,
  onClose,
  onSave,
}: {
  person: Person | null;
  initial: string;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [text, setText] = useState(initial);
  return (
    <Dialog
      open={!!person}
      onOpenChange={(o) => {
        if (!o) onClose();
        else setText(initial);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Note — {person?.name}</DialogTitle>
          <DialogDescription>
            Context for the field team: what to ask, prior interactions, or a debrief after the
            conversation.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          defaultValue={initial}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="e.g. Ask about OS maturity in the PD-L1 high subgroup…"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(text)}>Save note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPersonDialog({
  open,
  onOpenChange,
  conferenceId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conferenceId: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    sessionTitle: "",
    asset: "",
    day: "",
    time: "",
    room: "",
    indication: "",
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { personKeyOf } = await import("@/lib/people");
      return upsertCiContact({
        conferenceId,
        personName: form.name.trim(),
        personKey: personKeyOf(form.name),
        company: form.company.trim(),
        sessionTitle: form.sessionTitle.trim(),
        asset: form.asset.trim(),
        day: form.day.trim(),
        time: form.time.trim(),
        room: form.room.trim(),
        indication: form.indication.trim(),
        manual: true,
      });
    },
    onSuccess: () => {
      toast.success("Contact added");
      setForm({
        name: "",
        company: "",
        sessionTitle: "",
        asset: "",
        day: "",
        time: "",
        room: "",
        indication: "",
      });
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a person</DialogTitle>
          <DialogDescription>
            For contacts who are not listed as session authors — booth staff, medical affairs leads
            or KOLs you know are attending.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={set("name")} placeholder="Dr. Elena Marsh" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Company / affiliation</Label>
            <Input value={form.company} onChange={set("company")} placeholder="AstraZeneca" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Session / where to find them</Label>
            <Input
              value={form.sessionTitle}
              onChange={set("sessionTitle")}
              placeholder="Booth 4.12 / industry symposium"
            />
          </div>
          <div>
            <Label className="text-xs">Asset / trial</Label>
            <Input value={form.asset} onChange={set("asset")} placeholder="NCT04500123" />
          </div>
          <div>
            <Label className="text-xs">Indication</Label>
            <Input value={form.indication} onChange={set("indication")} placeholder="NSCLC" />
          </div>
          <div>
            <Label className="text-xs">Day</Label>
            <Input value={form.day} onChange={set("day")} placeholder="Sat Oct 24" />
          </div>
          <div>
            <Label className="text-xs">Time</Label>
            <Input value={form.time} onChange={set("time")} placeholder="14:30" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Hall / location</Label>
            <Input value={form.room} onChange={set("room")} placeholder="Hall 5, Booth 4.12" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || mutation.isPending}
          >
            Add person
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
