import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isPublicHttpUrl } from "./safe-url";
import {
  discoverLbaSources,
  discoverCompanyPressReleases,
  extractCompanyLbaSignals,
  extractLbas,
  scrapeMarkdown,
  scoreLba,
  detectedLabel,
  type ScoredLba,
  type WatchTerm,
} from "./lba.server";

const ScanInput = z.object({
  conferenceId: z.string().min(1),
  conferenceName: z.string().min(2),
  urls: z
    .array(z.string().url().refine(isPublicHttpUrl, "URL must be public http(s)"))
    .max(6)
    .optional(),
  companies: z.array(z.string().min(2).max(80)).max(8).optional(),
  scanCompanies: z.boolean().optional(),
});

export interface LbaScanResult {
  runId: string | null;
  sources: string[];
  found: number;
  created: number;
  updated: number;
  pending: number;
  companiesScanned: string[];
  warning?: string;
}


export const scanLbaFeeds = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data }): Promise<LbaScanResult> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const supabase = createClient(process.env['SUPABASE_URL']!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization');
          h.set('apikey', key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const startedAt = Date.now();

    const { data: runRow } = await supabase
      .from("lba_scan_runs")
      .insert({ conference_id: data.conferenceId, status: "running" })
      .select("id")
      .single();
    const runId = runRow?.id ?? null;

    const finish = async (patch: Record<string, unknown>) => {
      if (!runId) return;
      await supabase
        .from("lba_scan_runs")
        .update({ ...patch, duration_ms: Date.now() - startedAt })
        .eq("id", runId);
    };

    try {
      const sources =
        data.urls && data.urls.length > 0
          ? data.urls
          : await discoverLbaSources(data.conferenceName);

      if (sources.length === 0) {
        await finish({ status: "completed", sources_scanned: [], alerts_found: 0, new_alerts: 0 });
        return { runId, sources: [], found: 0, created: 0, updated: 0, warning: "No sources found." };
      }

      const [{ data: watchRows }, { data: kitRows }, { data: existingRows }] = await Promise.all([
        supabase
          .from("lba_watchlist")
          .select("term, kind, priority")
          .eq("conference_id", data.conferenceId)
          .eq("active", true),
        supabase.from("kits").select("topic").eq("conference_id", data.conferenceId),
        supabase
          .from("lba_alerts")
          .select("id, abstract_number, title")
          .eq("conference_id", data.conferenceId),
      ]);

      const watchlist = (watchRows ?? []) as WatchTerm[];
      const kitTopics = (kitRows ?? []).map((k: { topic: string }) => k.topic);

      const collected: ScoredLba[] = [];
      const scanned: string[] = [];
      const failures: string[] = [];

      for (const url of sources) {
        try {
          const md = await scrapeMarkdown(url);
          const raw = await extractLbas(md, url, data.conferenceName);
          for (const r of raw) collected.push(scoreLba(r, watchlist, kitTopics));
          scanned.push(url);
        } catch (e) {
          failures.push(`${url}: ${e instanceof Error ? e.message : "failed"}`);
        }
      }

      // Deduplicate within the batch by abstract number, else title.
      const byKey = new Map<string, ScoredLba>();
      for (const c of collected) {
        const key = (c.abstractNumber || c.title).toLowerCase().trim();
        const prev = byKey.get(key);
        if (!prev || c.relevanceScore > prev.relevanceScore) byKey.set(key, c);
      }

      const existing = new Map<string, string>();
      for (const e of existingRows ?? []) {
        const key = ((e.abstract_number as string) || (e.title as string) || "")
          .toLowerCase()
          .trim();
        if (key) existing.set(key, e.id as string);
      }

      let created = 0;
      let updated = 0;
      const now = new Date().toISOString();

      for (const [key, lba] of byKey) {
        const row = {
          conference_id: data.conferenceId,
          title: lba.title,
          abstract_number: lba.abstractNumber,
          summary: lba.summary,
          source_url: lba.sourceUrl,
          sponsor: lba.sponsor,
          indication: lba.indication,
          phase: lba.phase,
          trial_id: lba.trialId,
          relevance_score: lba.relevanceScore,
          match_reason: lba.matchReason,
          watch_term: lba.watchTerm,
          kit_topic: lba.kitTopic,
          relevant_to_kit: lba.relevantToKit,
          detected_at: detectedLabel(),
          last_seen_at: now,
        };
        const existingId = existing.get(key);
        if (existingId) {
          const { error } = await supabase
            .from("lba_alerts")
            .update(row)
            .eq("id", existingId);
          if (!error) updated += 1;
        } else {
          const { error } = await supabase.from("lba_alerts").insert(row);
          if (!error) created += 1;
        }
      }

      await finish({
        status: failures.length && !scanned.length ? "failed" : "completed",
        sources_scanned: scanned,
        alerts_found: byKey.size,
        new_alerts: created,
        error: failures.length ? failures.join(" | ").slice(0, 500) : null,
      });

      return {
        runId,
        sources: scanned,
        found: byKey.size,
        created,
        updated,
        warning: failures.length ? `${failures.length} source(s) failed` : undefined,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Scan failed";
      await finish({ status: "failed", error: message.slice(0, 500) });
      throw new Error(message);
    }
  });
