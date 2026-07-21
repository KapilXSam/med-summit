import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_sessions",
  title: "List sessions",
  description:
    "List sessions for a conference, optionally filtered by therapy area or trial ID. Returns title, day, time, room, authors, affiliation, trialId, therapyArea, asset, phase.",
  inputSchema: {
    conferenceId: z.string().describe("Conference ID (from list_conferences)."),
    therapyArea: z.string().optional().describe("Optional indication/therapy area filter."),
    trialId: z.string().optional().describe("Optional trial ID filter (exact match)."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ conferenceId, therapyArea, trialId, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("sessions")
      .select("*")
      .eq("conference_id", conferenceId)
      .limit(limit ?? 100);
    if (therapyArea) q = q.ilike("therapy_area", `%${therapyArea}%`);
    if (trialId) q = q.eq("trial_id", trialId);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
