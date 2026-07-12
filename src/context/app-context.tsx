import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchConferences } from "@/lib/db";
import type { Conference, Role } from "@/data/types";

interface AppState {
  conference: Conference;
  conferences: Conference[];
  setConferenceId: (id: string) => void;
  role: Role;
  setRole: (role: Role) => void;
  isClientViewer: boolean;
  loading: boolean;
}

const AppContext = createContext<AppState | null>(null);

export const ROLES: Role[] = [
  "Admin",
  "Project Manager",
  "Analyst",
  "On-site Delegate",
  "Medical Writer",
  "Client Viewer",
];

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: conferences = [], isLoading } = useQuery({
    queryKey: ["conferences"],
    queryFn: fetchConferences,
    staleTime: 60_000,
  });
  const [conferenceId, setConferenceId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("Project Manager");

  useEffect(() => {
    if (!conferenceId && conferences.length > 0) {
      setConferenceId(conferences[0].id);
    }
  }, [conferences, conferenceId]);

  const value = useMemo<AppState>(() => {
    const conference =
      conferences.find((c) => c.id === conferenceId) ?? conferences[0] ?? null;
    return {
      conference: conference as Conference,
      conferences,
      setConferenceId,
      role,
      setRole,
      isClientViewer: role === "Client Viewer",
      loading: isLoading || conferences.length === 0,
    };
  }, [conferenceId, conferences, role, isLoading]);

  if (isLoading || conferences.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading conferences…</span>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
