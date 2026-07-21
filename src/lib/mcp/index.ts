import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listConferences from "./tools/list-conferences";
import listSessions from "./tools/list-sessions";
import listInsights from "./tools/list-insights";
import createInsight from "./tools/create-insight";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pharmalix-mcp",
  title: "Pharmalix Conference Intelligence",
  version: "0.1.0",
  instructions:
    "Tools for Pharmalix — a medical conference intelligence platform. Use list_conferences first to discover conference IDs, then list_sessions / list_insights scoped by conferenceId. Use create_insight to add new evidence captured from a session or poster.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listConferences, listSessions, listInsights, createInsight],
});
