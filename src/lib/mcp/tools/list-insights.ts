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
  name: "list_insights",
  title: "List insights",
  description:
    "List captured insights for a conference. Returns text, KIT/KIQ mapping, significance, novelty, impact, confidence, and source quote.",
  inputSchema: {
    conferenceId: z.string().describe("Conference ID (from list_conferences)."),
    significantOnly: z.boolean().optional().describe("Only return insights flagged significant."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ conferenceId, significantOnly, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supabaseForUser(ctx)
      .from("insights")
      .select("*")
      .eq("conference_id", conferenceId)
      .limit(limit ?? 100);
    if (significantOnly) q = q.eq("significant", true);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { insights: data ?? [] },
    };
  },
});
