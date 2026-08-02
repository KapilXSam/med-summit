import { supabase } from "@/integrations/supabase/client";

export type CiPriority = "High" | "Medium" | "Low";
export type CiStatus = "To approach" | "Approached" | "Done";

export interface CiContact {
  id: string;
  conferenceId: string;
  personName: string;
  personKey: string;
  company: string;
  sessionTitle: string;
  asset: string;
  trialId: string;
  day: string;
  time: string;
  room: string;
  indication: string;
  priority: CiPriority;
  status: CiStatus;
  kiqId?: string;
  note: string;
  manual: boolean;
}

function map(r: Record<string, unknown>): CiContact {
  return {
    id: r.id as string,
    conferenceId: (r.conference_id as string) ?? "",
    personName: r.person_name as string,
    personKey: r.person_key as string,
    company: (r.company as string) ?? "",
    sessionTitle: (r.session_title as string) ?? "",
    asset: (r.asset as string) ?? "",
    trialId: (r.trial_id as string) ?? "",
    day: (r.day as string) ?? "",
    time: (r.time as string) ?? "",
    room: (r.room as string) ?? "",
    indication: (r.indication as string) ?? "",
    priority: ((r.priority as string) ?? "Medium") as CiPriority,
    status: ((r.status as string) ?? "To approach") as CiStatus,
    kiqId: (r.kiq_id as string) ?? undefined,
    note: (r.note as string) ?? "",
    manual: (r.manual as boolean) ?? false,
  };
}

export async function fetchCiContacts(conferenceId: string): Promise<CiContact[]> {
  const { data, error } = await supabase
    .from("ci_contacts")
    .select("*")
    .eq("conference_id", conferenceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(map);
}

export interface CiContactUpsert extends Partial<Omit<CiContact, "id">> {
  conferenceId: string;
  personName: string;
  personKey: string;
}

/** Insert or update the annotation row for one person at one conference. */
export async function upsertCiContact(input: CiContactUpsert): Promise<CiContact> {
  const payload = {
    conference_id: input.conferenceId,
    person_name: input.personName,
    person_key: input.personKey,
    company: input.company ?? "",
    session_title: input.sessionTitle ?? "",
    asset: input.asset ?? "",
    trial_id: input.trialId ?? "",
    day: input.day ?? "",
    time: input.time ?? "",
    room: input.room ?? "",
    indication: input.indication ?? "",
    priority: input.priority ?? "Medium",
    status: input.status ?? "To approach",
    kiq_id: input.kiqId || null,
    note: input.note ?? "",
    manual: input.manual ?? false,
  };
  const { data, error } = await supabase
    .from("ci_contacts")
    .upsert(payload as never, { onConflict: "conference_id,person_key" })
    .select("*")
    .single();
  if (error) throw error;
  return map(data as Record<string, unknown>);
}

export async function updateCiContact(id: string, patch: Partial<CiContact>) {
  const payload: Record<string, unknown> = {};
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.note !== undefined) payload.note = patch.note;
  if (patch.kiqId !== undefined) payload.kiq_id = patch.kiqId || null;
  if (patch.company !== undefined) payload.company = patch.company;
  const { error } = await supabase.from("ci_contacts").update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteCiContact(id: string) {
  const { error } = await supabase.from("ci_contacts").delete().eq("id", id);
  if (error) throw error;
}
