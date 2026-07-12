import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StubNotice } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lbaAlerts } from "@/data/mock";
import { BellRing, Clock, Radar } from "lucide-react";

export const Route = createFileRoute("/pre/lba")({
  head: () => ({ meta: [{ title: "LBA Monitor — VERA 2.0" }] }),
  component: LbaMonitor,
});

function LbaMonitor() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="Late-Breaking Abstract Monitor"
        description="Scans conference feeds every 15 minutes and alerts you only for LBAs relevant to your KIT."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <Radar className="h-3.5 w-3.5 animate-pulse text-emerald-600" /> Monitoring
          </Badge>
        }
      />
      <StubNotice>
        Live scanning is simulated. In production, alerts arrive within 20 minutes of an
        LBA being published.
      </StubNotice>

      <div className="space-y-3">
        {lbaAlerts.map((l) => (
          <Card
            key={l.id}
            className={l.relevantToKit ? "border-primary/40" : undefined}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  l.relevantToKit
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <BellRing className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {l.relevantToKit ? (
                    <Badge>Relevant to your KIT</Badge>
                  ) : (
                    <Badge variant="outline">General</Badge>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    {l.trialId}
                  </span>
                </div>
                <p className="mt-1 font-medium leading-snug">{l.title}</p>
                {l.kitTopic && (
                  <p className="text-xs text-muted-foreground">
                    Matched KIT: {l.kitTopic}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> Detected {l.detectedAt}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
