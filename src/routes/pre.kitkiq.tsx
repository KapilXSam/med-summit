import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StubNotice } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { kits } from "@/data/mock";
import { ChevronRight, FolderTree, Import, Link2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pre/kitkiq")({
  head: () => ({ meta: [{ title: "KIT / KIQ Builder — VERA 2.0" }] }),
  component: KitKiq,
});

function KitKiq() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="KIT / KIQ Builder"
        description="Build nested Key Intelligence Topics and Questions. AI maps every session and abstract to the right KIQ."
        actions={
          <Button variant="secondary">
            <Import className="h-4 w-4" /> Import from library
          </Button>
        }
      />
      <StubNotice>
        Automatic session-to-KIQ mapping is simulated at ~90% accuracy and is fully
        editable.
      </StubNotice>

      <div className="space-y-4">
        {kits.map((kit) => (
          <Card key={kit.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{kit.topic}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Owner · {kit.owner}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {kit.kiqs.map((kiq) => (
                <Collapsible key={kiq.id}>
                  <div className="rounded-lg border bg-muted/30">
                    <CollapsibleTrigger className="group flex w-full items-center gap-3 p-3 text-left">
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                      <span className="flex-1 text-sm font-medium">{kiq.question}</span>
                      <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                        <Link2 className="h-3 w-3" /> {kiq.mappedSessions} sessions
                      </Badge>
                      {kiq.hasNewEvidence && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                          title="New evidence"
                        />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Coverage from mapped sessions</span>
                        <span className="tabular-nums">{kiq.completion}%</span>
                      </div>
                      <Progress value={kiq.completion} className="h-1.5" />
                      <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI mapped {kiq.mappedSessions} sessions to this KIQ
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
              <Button variant="ghost" size="sm" className="mt-1">
                + Add KIQ
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
