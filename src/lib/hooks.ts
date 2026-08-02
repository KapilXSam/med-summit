import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/context/app-context";
import {
  fetchSessions,
  fetchDelegates,
  fetchKits,
  fetchPosters,
  fetchEndpoints,
  fetchHypotheses,
  fetchInsights,
  fetchLbaAlerts,
  fetchComments,
  fetchLbaWatchlist,
  fetchLbaScanRuns,
} from "@/lib/db";

/** Convenience hooks scoped to the active conference. */
export function useSessions() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["sessions", conference.id],
    queryFn: () => fetchSessions(conference.id),
  });
}

export function useDelegates() {
  return useQuery({ queryKey: ["delegates"], queryFn: fetchDelegates });
}

export function useKits() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["kits", conference.id],
    queryFn: () => fetchKits(conference.id),
  });
}

export function usePosters() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["posters", conference.id],
    queryFn: () => fetchPosters(conference.id),
  });
}

export function useEndpoints() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["endpoints", conference.id],
    queryFn: () => fetchEndpoints(conference.id),
  });
}

export function useHypotheses() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["hypotheses", conference.id],
    queryFn: () => fetchHypotheses(conference.id),
  });
}

export function useInsights() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["insights", conference.id],
    queryFn: () => fetchInsights(conference.id),
  });
}

export function useLbaAlerts() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["lba", conference.id],
    queryFn: () => fetchLbaAlerts(conference.id),
  });
}

export function useComments() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["comments", conference.id],
    queryFn: () => fetchComments(conference.id),
  });
}

export function useLbaWatchlist() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["lba-watchlist", conference.id],
    queryFn: () => fetchLbaWatchlist(conference.id),
  });
}

export function useLbaScanRuns() {
  const { conference } = useApp();
  return useQuery({
    queryKey: ["lba-runs", conference.id],
    queryFn: () => fetchLbaScanRuns(conference.id),
  });
}
