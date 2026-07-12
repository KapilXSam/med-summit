import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/app-context";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Users,
  FileText,
  Clock,
  TrendingDown,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conference Portfolio — VERA 2.0" },
      {
        name: "description",
        content: "All your medical conferences in one intelligence workspace.",
      },
    ],
  }),
  component: Portfolio,
});

const stats = [
  { label: "Manual work saved", value: "80%", icon: TrendingDown },
  { label: "Time to first deliverable", value: "60 min", icon: Clock },
  { label: "Active conferences", value: "3", icon: CalendarDays },
  { label: "Deliverables generated", value: "27", icon: FileText },
];

function Portfolio() {
  const { conferences, setConferenceId } = useApp();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Workspace"
        title="Conference Portfolio"
        description="One shared source of truth across pre-conference planning, live capture, and post-conference deliverables."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {conferences.map((c) => {
          const statusVariant =
            c.status === "Live"
              ? "default"
              : c.status === "Planning"
                ? "secondary"
                : "outline";
          const target =
            c.phase === "pre"
              ? "/pre/extraction"
              : c.phase === "live"
                ? "/live/dashboard"
                : "/post/deliverables";
          return (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-lg font-bold">{c.acronym}</span>
                  <Badge variant={statusVariant}>{c.status}</Badge>
                </div>
                <CardTitle className="text-sm font-normal leading-snug text-muted-foreground">
                  {c.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {c.location}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />{" "}
                    {new Date(c.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    –{" "}
                    {new Date(c.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="flex gap-4 border-t pt-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    {c.sessionCount.toLocaleString()}
                    <span className="text-muted-foreground">sessions</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    {c.delegateCount}
                    <span className="text-muted-foreground">delegates</span>
                  </span>
                </div>
                <Button
                  asChild
                  className="mt-auto w-full"
                  variant="secondary"
                  onClick={() => setConferenceId(c.id)}
                >
                  <Link to={target}>
                    Open workspace <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
