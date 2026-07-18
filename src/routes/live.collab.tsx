import { createFileRoute } from "@tanstack/react-router";
import { routeSeo } from "@/lib/route-seo";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/app-context";
import { useComments } from "@/lib/hooks";
import { addComment } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AtSign, MessageSquarePlus, Send } from "lucide-react";

export const Route = createFileRoute("/live/collab")({
  head: () =>
    routeSeo({
      title: "Live Collaboration — Pharmalix",
      description: "Real-time delegate collaboration with comments, mentions, and live updates across the conference floor.",
      path: "/live/collab",
    }),
  component: Collab,
});

function renderText(text: string) {
  return text.split(/(@[^,.!?]+)/g).map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-medium text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function Collab() {
  const { conference } = useApp();
  const qc = useQueryClient();
  const { data: comments = [] } = useComments();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const channel = supabase
      .channel("comments-" + conference.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        () => qc.invalidateQueries({ queryKey: ["comments", conference.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conference.id, qc]);

  const postMut = useMutation({
    mutationFn: (text: string) => {
      const mentions = (text.match(/@[\w.\s]+/g) ?? []).map((m) => m.slice(1).trim());
      return addComment(conference.id, {
        author: "Dr. Elena Marsh",
        initials: "EM",
        text,
        target: "AURORA-3 poster",
        mentions,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", conference.id] }),
  });

  const post = () => {
    if (!draft.trim()) return;
    postMut.mutate(draft);
    setDraft("");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Module B · During Conference"
        title="Live Collaboration"
        description="Threaded comments per session, poster, and KIQ with @mentions and push notifications."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquarePlus className="h-4 w-4 text-primary" /> Thread · AURORA-3 poster
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {c.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.author}</span>
                  <span className="text-xs text-muted-foreground">{c.time}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {c.target}
                  </Badge>
                </div>
                <p className="text-sm">{renderText(c.text)}</p>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 border-t pt-3">
            <div className="relative flex-1">
              <AtSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Add a comment… use @ to mention"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && post()}
              />
            </div>
            <Button size="icon" onClick={post}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Comments sync to all team members within 1 second (simulated).
      </p>
    </div>
  );
}
