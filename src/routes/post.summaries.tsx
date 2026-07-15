import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useState } from "react";
import { PageHeader, StubNotice } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePosters } from "@/lib/hooks";
import { CheckCircle2, FileStack, Play } from "lucide-react";

export const Route = createFileRoute("/post/summaries")({
  head: () =>
    routeSeo({
      title: "Executive Summaries — VERA 2.0",
      description: "Tiered executive summaries by KIT and conference, ready for leadership review.",
      path: "/post/summaries",
    }),
  component: Summaries,
});

function Summaries() {
  const { data: posters = [] } = usePosters();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [length, setLength] = useState("standard");
  const total = 500;

  const run = () => {
    setRunning(true);
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setRunning(false);
          return 100;
        }
        return p + 5;
      });
    }, 120);
  };

  const done = progress >= 100;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Module C · Post-Conference"
        title="Bulk Summarization"
        description="One-click summarisation of all captured content with configurable summary length."
      />
      <StubNotice>Summarisation is simulated. 500 posters summarise in under 10 minutes.</StubNotice>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={length} onValueChange={setLength} disabled={running}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief · 1 sentence</SelectItem>
                <SelectItem value="standard">Standard · 3 bullets</SelectItem>
                <SelectItem value="detailed">Detailed · full paragraph</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={run} disabled={running}>
              <Play className="h-4 w-4" /> {running ? "Summarising…" : "Summarise all"}
            </Button>
            <Badge variant="secondary" className="ml-auto">
              {total} items queued
            </Badge>
          </div>

          {(running || done) && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <FileStack className="h-4 w-4 text-primary" />
                  {Math.round((progress / 100) * total)} / {total} summarised
                </span>
                {done && (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-4 w-4" /> Complete
                  </span>
                )}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sample output</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {posters.slice(0, 3).map((p) => (
            <div key={p.id} className="rounded-lg border p-3">
              <div className="mb-1 text-sm font-medium">{p.title}</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(length === "brief" ? p.summary.slice(0, 1) : p.summary).map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
