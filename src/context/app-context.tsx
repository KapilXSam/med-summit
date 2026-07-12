import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { conferences } from "@/data/mock";
import type { Conference, Role } from "@/data/types";

interface AppState {
  conference: Conference;
  setConferenceId: (id: string) => void;
  role: Role;
  setRole: (role: Role) => void;
  isClientViewer: boolean;
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
  const [conferenceId, setConferenceId] = useState(conferences[0].id);
  const [role, setRole] = useState<Role>("Project Manager");

  const value = useMemo<AppState>(() => {
    const conference =
      conferences.find((c) => c.id === conferenceId) ?? conferences[0];
    return {
      conference,
      setConferenceId,
      role,
      setRole,
      isClientViewer: role === "Client Viewer",
    };
  }, [conferenceId, role]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
