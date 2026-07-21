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
  name: "create_insight",
  title: "Create insight",
  description:
    "Add a new insight to a conference, optionally linked to a KIT/KIQ, with a source quote and page reference.",
  inputSchema: {
    conferenceId: z.string(),
    text: z.string().min(1).describe("The insight statement."),
    kitId: z.string().optional(),
    kiqId: z.string().optional(),
    sourceQuote: z.string().optional(),
    page: z.number().int().optional(),
    significant: z.boolean().optional(),
    contradictory: z.boolean().optional(),
    novelty: z.number().min(0).max(1).optional(),
    impact: z.number().min(0).max(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("insights")
      .insert({
        conference_id: input.conferenceId,
        text: input.text,
        kit_id: input.kitId ?? null,
        kiq_id: input.kiqId ?? null,
        source_quote: input.sourceQuote ?? "",
        page: input.page ?? 0,
        significant: input.significant ?? false,
        contradictory: input.contradictory ?? false,
        novelty: input.novelty ?? 0.5,
        impact: input.impact ?? 0.5,
        confidence: input.confidence ?? 0.7,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created insight ${data.id}` }],
      structuredContent: { insight: data },
    };
  },
});
