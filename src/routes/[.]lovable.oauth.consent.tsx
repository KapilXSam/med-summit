import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// The Supabase JS `auth.oauth` namespace is beta; add a typed shim so we can
// call the three methods we need without TS errors.
type AuthzDetails = {
  client?: { name?: string; client_uri?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  requested_scopes?: string[] | null;
  scope?: string | null;
} | null;

type OAuthResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<AuthzDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<AuthzDetails>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<AuthzDetails>>;
};

function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md py-16">
      <h1 className="text-xl font-semibold">Could not load authorization request</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an external app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Connect {clientName} to Pharmalix
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This lets <strong>{clientName}</strong> use Pharmalix's conference intelligence tools as
        you — reading conferences, sessions, and insights, and adding new insights on your behalf.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        This does not bypass Pharmalix's permissions or backend policies.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex gap-2">
        <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
          Approve
        </Button>
        <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
          Deny
        </Button>
      </div>
    </main>
  );
}
