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
      const [{ data: watchRows }, { data: kitRows }, { data: existingRows }] = await Promise.all([
        supabase
          .from("lba_watchlist")
          .select("term, kind, priority")
          .eq("conference_id", data.conferenceId)
          .eq("active", true),
        supabase.from("kits").select("topic").eq("conference_id", data.conferenceId),
        supabase
          .from("lba_alerts")
          .select("id, abstract_number, title, approval, edited")
          .eq("conference_id", data.conferenceId),
      ]);

      const watchlist = (watchRows ?? []) as WatchTerm[];
      const kitTopics = (kitRows ?? []).map((k: { topic: string }) => k.topic);

      // Companies to sweep: explicit input, else watchlist company terms.
      const scanCompanies = data.scanCompanies !== false;
      const companies = (
        data.companies && data.companies.length > 0
          ? data.companies
          : watchlist
              .filter((w) => /company|sponsor|competitor/i.test(w.kind))
              .map((w) => w.term)
      ).slice(0, 6);

      const sources =
        data.urls && data.urls.length > 0
          ? data.urls
          : await discoverLbaSources(data.conferenceName);

      const collected: Array<{ lba: ScoredLba; sourceType: "conference" | "company_pr"; company: string }> = [];
      const scanned: string[] = [];
      const failures: string[] = [];
      const companiesScanned: string[] = [];

      for (const url of sources) {
        try {
          const md = await scrapeMarkdown(url);
          const raw = await extractLbas(md, url, data.conferenceName);
          for (const r of raw)
            collected.push({ lba: scoreLba(r, watchlist, kitTopics), sourceType: "conference", company: "" });
          scanned.push(url);
        } catch (e) {
          failures.push(`${url}: ${e instanceof Error ? e.message : "failed"}`);
        }
      }

      if (scanCompanies) {
        for (const company of companies) {
          try {
            const prUrls = await discoverCompanyPressReleases(company, data.conferenceName);
            let hit = false;
            for (const url of prUrls) {
              try {
                const md = await scrapeMarkdown(url);
                const raw = await extractCompanyLbaSignals(md, url, company, data.conferenceName);
                for (const r of raw)
                  collected.push({
                    lba: scoreLba(r, watchlist, kitTopics),
                    sourceType: "company_pr",
                    company,
                  });
                scanned.push(url);
                hit = true;
              } catch (e) {
                failures.push(`${url}: ${e instanceof Error ? e.message : "failed"}`);
              }
            }
            if (hit || prUrls.length === 0) companiesScanned.push(company);
          } catch (e) {
            failures.push(`${company}: ${e instanceof Error ? e.message : "search failed"}`);
          }
        }
      }

      if (sources.length === 0 && collected.length === 0) {
        await finish({ status: "completed", sources_scanned: scanned, alerts_found: 0, new_alerts: 0 });
        return {
          runId,
          sources: scanned,
          found: 0,
          created: 0,
          updated: 0,
          pending: 0,
          companiesScanned,
          warning: "No sources found.",
        };
      }

      // Deduplicate within the batch by abstract number, else title.
      // Conference-sourced records win over press-release signals.
      const byKey = new Map<string, (typeof collected)[number]>();
      for (const c of collected) {
        const key = (c.lba.abstractNumber || c.lba.title).toLowerCase().trim();
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, c);
          continue;
        }
        const better =
          (c.sourceType === "conference" && prev.sourceType !== "conference") ||
          (c.sourceType === prev.sourceType && c.lba.relevanceScore > prev.lba.relevanceScore);
        if (better) byKey.set(key, c);
      }

      const existing = new Map<string, { id: string; edited: boolean }>();
      for (const e of existingRows ?? []) {
        const key = ((e.abstract_number as string) || (e.title as string) || "")
          .toLowerCase()
          .trim();
        if (key) existing.set(key, { id: e.id as string, edited: Boolean(e.edited) });
      }

      let created = 0;
      let updated = 0;
      let pending = 0;
      const now = new Date().toISOString();

      for (const [key, entry] of byKey) {
        const { lba, sourceType, company } = entry;
        const isPending = sourceType === "company_pr";
        const row: Record<string, unknown> = {
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
          source_type: sourceType,
          company,
        };
        const existingRow = existing.get(key);
        if (existingRow) {
          // Never overwrite manual corrections; never downgrade an approved row.
          const patch = existingRow.edited
            ? { last_seen_at: now, source_type: sourceType }
            : row;
          const { error } = await supabase
            .from("lba_alerts")
            .update(patch as never)
            .eq("id", existingRow.id);
          if (!error) updated += 1;
        } else {
          const { error } = await supabase
            .from("lba_alerts")
            .insert({ ...row, approval: isPending ? "pending" : "approved" } as never);
          if (!error) {
            created += 1;
            if (isPending) pending += 1;
          }
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
        pending,
        companiesScanned,
        warning: failures.length ? `${failures.length} source(s) failed` : undefined,
      };

    } catch (e) {
      const message = e instanceof Error ? e.message : "Scan failed";
      await finish({ status: "failed", error: message.slice(0, 500) });
      throw new Error(message);
    }
  });
