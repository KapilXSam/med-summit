import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const PUBLIC_PREFIXES = ["/auth", "/.lovable", "/.well-known", "/.mcp", "/mcp", "/api"];

/**
 * Data in this app is protected by row-level security and requires a signed-in
 * user. This gate keeps the UI in sync with that: anything outside the public
 * routes renders only for an authenticated session.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!session) {
    const next = typeof window !== "undefined" ? window.location.pathname : "/";
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold tracking-tight">Sign in to Pharmalix</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Conference intelligence data is restricted to authorized team members.
          </p>
          <Button asChild className="mt-6">
            <a href={`/auth?next=${encodeURIComponent(next)}`}>Sign in</a>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
