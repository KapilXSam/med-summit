import { supabase } from "@/integrations/supabase/client";
import type {
  Comment,
  Conference,
  Delegate,
  Endpoint,
  Hypothesis,
  Insight,
  Kit,
  Kiq,
  LbaAlert,
  LbaWatchTerm,
  LbaScanRun,
  Poster,
  Session,
} from "@/data/types";

/**
 * Data-access layer for the conference intelligence platform.
 * Single-user (no auth) — reads/writes go through the anon Supabase client.
 * Row shapes are snake_case in the DB and mapped to the app's camelCase types.
 */

// ---------- Conferences ----------
export async function fetchConferences(): Promise<Conference[]> {
  const { data, error } = await supabase
    .from("conferences")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    acronym: c.acronym,
    location: c.location,
    startDate: c.start_date,
    endDate: c.end_date,
    therapyAreas: c.therapy_areas ?? [],
    sessionCount: c.session_count,
    delegateCount: c.delegate_count,
    status: c.status as Conference["status"],
    phase: c.phase as Conference["phase"],
  }));
}

// ---------- Delegates ----------
export async function fetchDelegates(): Promise<Delegate[]> {
  const { data, error } = await supabase
    .from("delegates")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    initials: d.initials,
    role: d.role as Delegate["role"],
    focus: d.focus,
  }));
}

// ---------- Sessions ----------
export async function fetchSessions(conferenceId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

function mapSession(s: Record<string, unknown>): Session {
  return {
    id: s.id as string,
    title: s.title as string,
    time: (s.time as string) ?? "",
    day: (s.day as string) ?? "",
    room: (s.room as string) ?? "",
    authors: (s.authors as string) ?? "",
    affiliation: (s.affiliation as string) ?? "",
    trialId: (s.trial_id as string) ?? undefined,
    therapyArea: (s.therapy_area as string) ?? "",
    asset: (s.asset as string) ?? "",
    phase: (s.phase as string) ?? "",
    confidence: (s.confidence as number) ?? 0,
    assignedTo: (s.assigned_to as string) ?? undefined,
    conflict: (s.conflict as boolean) ?? false,
    kiqId: (s.kiq_id as string) ?? undefined,
    sourceUrl: (s.source_url as string) ?? undefined,
  };
}

export interface NewSession {
  conferenceId: string;
  title: string;
  authors?: string;
  affiliation?: string;
  day?: string;
  time?: string;
  room?: string;
  trialId?: string;
  therapyArea?: string;
  asset?: string;
  phase?: string;
  confidence?: number;
  sourceUrl?: string;
}

export async function insertSessions(rows: NewSession[]): Promise<Session[]> {
  if (rows.length === 0) return [];
  const payload = rows.map((r) => ({
    conference_id: r.conferenceId,
    title: r.title,
    authors: r.authors ?? "",
    affiliation: r.affiliation ?? "",
    day: r.day ?? "",
    time: r.time ?? "",
    room: r.room ?? "",
    trial_id: r.trialId || null,
    therapy_area: r.therapyArea ?? "",
    asset: r.asset ?? "",
    phase: r.phase ?? "",
    confidence: r.confidence ?? 0,
    source_url: r.sourceUrl ?? null,
  }));
  const { data, error } = await supabase.from("sessions").insert(payload).select("*");
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

export async function updateSession(id: string, patch: Partial<Session>) {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.day !== undefined) payload.day = patch.day;
  if (patch.time !== undefined) payload.time = patch.time;
  if (patch.room !== undefined) payload.room = patch.room;
  if (patch.therapyArea !== undefined) payload.therapy_area = patch.therapyArea;
  if (patch.asset !== undefined) payload.asset = patch.asset;
  if (patch.authors !== undefined) payload.authors = patch.authors;
  if (patch.affiliation !== undefined) payload.affiliation = patch.affiliation;
  if (patch.assignedTo !== undefined) payload.assigned_to = patch.assignedTo || null;
  if (patch.conflict !== undefined) payload.conflict = patch.conflict;
  const { error } = await supabase.from("sessions").update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Agenda (planner) ----------
export interface AgendaRow {
  id: string;
  sessionId: string;
  position: number;
  day: string;
  note: string;
  session: Session | null;
}

export async function fetchAgenda(conferenceId: string): Promise<AgendaRow[]> {
  const { data, error } = await supabase
    .from("agenda_items")
    .select("*, sessions(*)")
    .eq("conference_id", conferenceId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    sessionId: a.session_id as string,
    position: a.position,
    day: a.day,
    note: a.note,
    session: a.sessions ? mapSession(a.sessions as Record<string, unknown>) : null,
  }));
}

export async function addAgendaItem(
  conferenceId: string,
  sessionId: string,
  day: string,
  position: number,
) {
  const { error } = await supabase.from("agenda_items").insert({
    conference_id: conferenceId,
    session_id: sessionId,
    day,
    position,
  });
  if (error) throw error;
}

export async function removeAgendaItem(id: string) {
  const { error } = await supabase.from("agenda_items").delete().eq("id", id);
  if (error) throw error;
}

export async function updateAgendaItem(
  id: string,
  patch: { day?: string; position?: number; note?: string },
) {
  const { error } = await supabase.from("agenda_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function reorderAgenda(items: { id: string; position: number; day: string }[]) {
  // Persist positions/days one by one (small lists).
  await Promise.all(
    items.map((it) =>
      supabase.from("agenda_items").update({ position: it.position, day: it.day }).eq("id", it.id),
    ),
  );
}

// ---------- Kits & KIQs ----------
export interface KitWithKiqs extends Kit {}

export async function fetchKits(conferenceId: string): Promise<Kit[]> {
  const { data, error } = await supabase
    .from("kits")
    .select("*, kiqs(*)")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((k) => ({
    id: k.id,
    topic: k.topic,
    owner: k.owner,
    kiqs: ((k.kiqs as Record<string, unknown>[]) ?? [])
      .map(
        (q): Kiq => ({
          id: q.id as string,
          question: q.question as string,
          mappedSessions: (q.mapped_sessions as number) ?? 0,
          completion: (q.completion as number) ?? 0,
          hasNewEvidence: (q.has_new_evidence as boolean) ?? false,
        }),
      )
      .sort((a, b) => a.question.localeCompare(b.question)),
  }));
}

export async function addKit(conferenceId: string, topic: string, owner: string) {
  const { data, error } = await supabase
    .from("kits")
    .insert({ conference_id: conferenceId, topic, owner })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function addKiq(kitId: string, question: string) {
  const { error } = await supabase.from("kiqs").insert({ kit_id: kitId, question });
  if (error) throw error;
}

export async function deleteKit(id: string) {
  const { error } = await supabase.from("kits").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteKiq(id: string) {
  const { error } = await supabase.from("kiqs").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Posters ----------
export async function fetchPosters(conferenceId: string): Promise<Poster[]> {
  const { data, error } = await supabase
    .from("posters")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    presenter: p.presenter,
    capturedBy: p.captured_by,
    capturedAt: p.captured_at,
    therapyArea: p.therapy_area,
    ocrStatus: p.ocr_status as Poster["ocrStatus"],
    summary: p.summary ?? [],
    significant: p.significant,
    contradictory: p.contradictory,
    sourceQuote: p.source_quote,
    page: p.page,
    confidence: p.confidence,
  }));
}

export async function addPoster(conferenceId: string, poster: Partial<Poster> & { title: string }) {
  const { error } = await supabase.from("posters").insert({
    conference_id: conferenceId,
    title: poster.title,
    presenter: poster.presenter ?? "",
    captured_by: poster.capturedBy ?? "",
    captured_at: poster.capturedAt ?? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    therapy_area: poster.therapyArea ?? "",
    ocr_status: poster.ocrStatus ?? "processing",
    summary: poster.summary ?? [],
    significant: poster.significant ?? false,
    contradictory: poster.contradictory ?? false,
    source_quote: poster.sourceQuote ?? "",
    page: poster.page ?? 1,
    confidence: poster.confidence ?? 0,
  });
  if (error) throw error;
}

// ---------- Endpoints ----------
export async function fetchEndpoints(conferenceId: string): Promise<Endpoint[]> {
  const { data, error } = await supabase
    .from("endpoints")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    trialId: e.trial_id,
    trialName: e.trial_name,
    asset: e.asset,
    endpointType: e.endpoint_type as Endpoint["endpointType"],
    endpoint: e.endpoint,
    value: e.value,
    pValue: e.p_value,
    hr: e.hr,
    ci: e.ci,
  }));
}

// ---------- Hypotheses ----------
export async function fetchHypotheses(conferenceId: string): Promise<Hypothesis[]> {
  const { data, error } = await supabase
    .from("hypotheses")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((h) => ({
    id: h.id,
    kiqId: (h.kiq_id as string) ?? "",
    statement: h.statement,
    impact: h.impact as Hypothesis["impact"],
    likelihood: h.likelihood as Hypothesis["likelihood"],
    gap: h.gap,
    evidence: (h.evidence as Hypothesis["evidence"]) ?? [],
  }));
}

export async function addHypothesis(
  conferenceId: string,
  h: { statement: string; impact: string; likelihood: string; gap?: boolean },
) {
  const { error } = await supabase.from("hypotheses").insert({
    conference_id: conferenceId,
    statement: h.statement,
    impact: h.impact,
    likelihood: h.likelihood,
    gap: h.gap ?? false,
    evidence: [],
  });
  if (error) throw error;
}

export async function deleteHypothesis(id: string) {
  const { error } = await supabase.from("hypotheses").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Insights ----------
export async function fetchInsights(conferenceId: string): Promise<Insight[]> {
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((i) => ({
    id: i.id,
    text: i.text,
    kitId: (i.kit_id as string) ?? "",
    kiqId: (i.kiq_id as string) ?? "",
    posterId: (i.poster_id as string) ?? undefined,
    significant: i.significant,
    contradictory: i.contradictory,
    novelty: i.novelty,
    impact: i.impact,
    confidence: i.confidence,
    sourceQuote: i.source_quote,
    page: i.page,
    duplicateOf: (i.duplicate_of as string) ?? undefined,
  }));
}

// ---------- LBA alerts ----------
function mapLba(row: Record<string, unknown>): LbaAlert {
  const s = (k: string) => (typeof row[k] === "string" ? (row[k] as string) : "");
  return {
    id: row.id as string,
    title: s("title"),
    detectedAt: s("detected_at"),
    relevantToKit: Boolean(row.relevant_to_kit),
    kitTopic: s("kit_topic") || undefined,
    trialId: s("trial_id"),
    abstractNumber: s("abstract_number"),
    summary: s("summary"),
    sourceUrl: s("source_url") || undefined,
    sponsor: s("sponsor"),
    indication: s("indication"),
    phase: s("phase"),
    relevanceScore: Number(row.relevance_score ?? 0),
    matchReason: s("match_reason"),
    status: (s("status") || "new") as LbaAlert["status"],
    watchTerm: s("watch_term"),
    lastSeenAt: s("last_seen_at") || s("created_at"),
  };
}

export async function fetchLbaAlerts(conferenceId: string): Promise<LbaAlert[]> {
  const { data, error } = await supabase
    .from("lba_alerts")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("relevance_score", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((l) => mapLba(l as Record<string, unknown>));
}

export async function updateLbaStatus(id: string, status: LbaAlert["status"]) {
  const { error } = await supabase.from("lba_alerts").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteLbaAlert(id: string) {
  const { error } = await supabase.from("lba_alerts").delete().eq("id", id);
  if (error) throw error;
}

export interface NewLbaAlert {
  title: string;
  abstractNumber?: string;
  sponsor?: string;
  trialId?: string;
  indication?: string;
  phase?: string;
  summary?: string;
  sourceUrl?: string;
  relevantToKit?: boolean;
}

/** Manually record an LBA that the automated scan missed. */
export async function addLbaAlert(conferenceId: string, input: NewLbaAlert) {
  const { error } = await supabase.from("lba_alerts").insert({
    conference_id: conferenceId,
    title: input.title,
    abstract_number: input.abstractNumber ?? "",
    sponsor: input.sponsor ?? "",
    trial_id: input.trialId ?? "",
    indication: input.indication ?? "",
    phase: input.phase ?? "",
    summary: input.summary ?? "",
    source_url: input.sourceUrl || null,
    relevant_to_kit: input.relevantToKit ?? true,
    relevance_score: 50,
    match_reason: "Added manually",
    status: "new",
    detected_at: new Date().toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  } as never);
  if (error) throw error;
}


// ---------- LBA watchlist ----------
export async function fetchLbaWatchlist(conferenceId: string): Promise<LbaWatchTerm[]> {
  const { data, error } = await supabase
    .from("lba_watchlist")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((w) => ({
    id: w.id as string,
    term: w.term as string,
    kind: (w.kind as string) ?? "keyword",
    priority: Number(w.priority ?? 2),
    active: Boolean(w.active),
  }));
}

export async function addLbaWatchTerm(
  conferenceId: string,
  term: { term: string; kind: string; priority: number },
) {
  const { error } = await supabase.from("lba_watchlist").insert({
    conference_id: conferenceId,
    term: term.term,
    kind: term.kind,
    priority: term.priority,
  });
  if (error) throw error;
}

export async function toggleLbaWatchTerm(id: string, active: boolean) {
  const { error } = await supabase.from("lba_watchlist").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteLbaWatchTerm(id: string) {
  const { error } = await supabase.from("lba_watchlist").delete().eq("id", id);
  if (error) throw error;
}

// ---------- LBA scan runs ----------
export async function fetchLbaScanRuns(conferenceId: string): Promise<LbaScanRun[]> {
  const { data, error } = await supabase
    .from("lba_scan_runs")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    status: (r.status as string) ?? "running",
    sourcesScanned: (r.sources_scanned as string[]) ?? [],
    alertsFound: Number(r.alerts_found ?? 0),
    newAlerts: Number(r.new_alerts ?? 0),
    error: (r.error as string) ?? undefined,
    durationMs: Number(r.duration_ms ?? 0),
    createdAt: r.created_at as string,
  }));
}


// ---------- Comments ----------
export async function fetchComments(conferenceId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    author: c.author,
    initials: c.initials,
    text: c.text,
    time: c.time,
    target: c.target,
    mentions: c.mentions ?? [],
  }));
}

export async function addComment(
  conferenceId: string,
  c: { author: string; initials: string; text: string; target: string; mentions: string[] },
) {
  const { error } = await supabase.from("comments").insert({
    conference_id: conferenceId,
    author: c.author,
    initials: c.initials,
    text: c.text,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    target: c.target,
    mentions: c.mentions,
  });
  if (error) throw error;
}
