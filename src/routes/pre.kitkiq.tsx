import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, StubNotice } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useApp } from "@/context/app-context";
import { useKits } from "@/lib/hooks";
import { addKit, addKiq, deleteKit, deleteKiq } from "@/lib/db";
import {
  ChevronRight,
  FolderTree,
  Link2,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/pre/kitkiq")({
  head: () =>
    routeSeo({
      title: "KIT / KIQ Builder — VERA 2.0",
      description: "Build Key Intelligence Topics and Questions that drive downstream insight capture and synthesis.",
      path: "/pre/kitkiq",
    }),
  component: KitKiq,
});

function KitKiq() {
  const { conference } = useApp();
  const qc = useQueryClient();
  const { data: kits = [] } = useKits();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["kits", conference.id] });

  const [newTopic, setNewTopic] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [kitOpen, setKitOpen] = useState(false);
  const [kiqDraft, setKiqDraft] = useState<Record<string, string>>({});

  const addKitMut = useMutation({
    mutationFn: () => addKit(conference.id, newTopic.trim(), newOwner.trim() || "Unassigned"),
    onSuccess: () => {
      invalidate();
      setNewTopic("");
      setNewOwner("");
      setKitOpen(false);
      toast.success("KIT created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const addKiqMut = useMutation({
    mutationFn: ({ kitId, q }: { kitId: string; q: string }) => addKiq(kitId, q),
    onSuccess: invalidate,
  });
  const delKitMut = useMutation({
    mutationFn: (id: string) => deleteKit(id),
    onSuccess: () => {
      invalidate();
      toast.success("KIT deleted");
    },
  });
  const delKiqMut = useMutation({
    mutationFn: (id: string) => deleteKiq(id),
    onSuccess: invalidate,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Module A · Pre-Conference"
        title="KIT / KIQ Builder"
        description="Build nested Key Intelligence Topics and Questions. AI maps every session and abstract to the right KIQ."
        actions={
          <Dialog open={kitOpen} onOpenChange={setKitOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New KIT
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Key Intelligence Topic</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Topic (e.g. VRA-101 competitive positioning)"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                />
                <Input
                  placeholder="Owner (e.g. Dr. Elena Marsh)"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => addKitMut.mutate()}
                  disabled={!newTopic.trim() || addKitMut.isPending}
                >
                  Create KIT
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <StubNotice>
        Automatic session-to-KIQ mapping is simulated at ~90% accuracy and is fully
        editable.
      </StubNotice>

      <div className="space-y-4">
        {kits.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            No KITs yet. Create your first Key Intelligence Topic to start mapping
            sessions.
          </div>
        )}
        {kits.map((kit) => (
          <Card key={kit.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{kit.topic}</CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label="Delete KIT"
                  onClick={() => delKitMut.mutate(kit.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-primary">
                          <Sparkles className="h-3.5 w-3.5" />
                          AI mapped {kiq.mappedSessions} sessions to this KIQ
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => delKiqMut.mutate(kiq.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
              <div className="flex gap-2 pt-1">
                <Input
                  className="h-9"
                  placeholder="Add a Key Intelligence Question…"
                  value={kiqDraft[kit.id] ?? ""}
                  onChange={(e) =>
                    setKiqDraft((p) => ({ ...p, [kit.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    const q = (kiqDraft[kit.id] ?? "").trim();
                    if (e.key === "Enter" && q) {
                      addKiqMut.mutate({ kitId: kit.id, q });
                      setKiqDraft((p) => ({ ...p, [kit.id]: "" }));
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!(kiqDraft[kit.id] ?? "").trim()}
                  onClick={() => {
                    const q = (kiqDraft[kit.id] ?? "").trim();
                    addKiqMut.mutate({ kitId: kit.id, q });
                    setKiqDraft((p) => ({ ...p, [kit.id]: "" }));
                  }}
                >
                  <Plus className="h-4 w-4" /> Add KIQ
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
