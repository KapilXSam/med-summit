import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, StubNotice } from "@/components/page-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge } from "@/components/attribution";
import { sessions } from "@/data/mock";
import { Search, Wand2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/pre/extraction")({
  head: () => ({ meta: [{ title: "AI Extraction — VERA 2.0" }] }),
  component: Extraction,
});

const areas = ["All", "Lung", "Breast", "GI", "GU", "Hematology"];

function Extraction() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All");
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const rows = useMemo(
    () =>
      sessions.filter((s) => {
        if (area !== "All" && s.therapyArea !== area) return false;
        if (onlyFlagged && s.confidence >= 70) return false;
        if (query && !s.title.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [query, area, onlyFlagged],
  );

  const flaggedCount = sessions.filter((s) => s.confidence < 70).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="AI Extraction"
        description="Structured extraction of every session field with auto-tagging, deduplication, and confidence scoring."
        actions={
          <Button variant="secondary">
            <Wand2 className="h-4 w-4" /> Re-run extraction
          </Button>
        }
      />
      <StubNotice>
        Extraction is simulated. In production this ingests the full conference agenda
        (~4,000 sessions) in under 10 minutes at &gt;95% accuracy.
      </StubNotice>

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
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-[160px]">
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
                <TableHead>Session</TableHead>
                <TableHead className="hidden md:table-cell">Time / Room</TableHead>
                <TableHead className="hidden lg:table-cell">Trial ID</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow
                  key={s.id}
                  className={s.confidence < 70 ? "bg-destructive/5" : undefined}
                >
                  <TableCell className="max-w-[320px]">
                    <div className="font-medium leading-snug">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.authors} · {s.affiliation}
                    </div>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                    {s.day}
                    <br />
                    {s.time} · {s.room}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs lg:table-cell">
                    {s.trialId ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {s.therapyArea}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {s.asset}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfidenceBadge score={s.confidence} scale={100} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Showing {rows.length} of {sessions.length} extracted sessions · rows below 70%
        confidence are flagged for analyst review.
      </p>
    </div>
  );
}
