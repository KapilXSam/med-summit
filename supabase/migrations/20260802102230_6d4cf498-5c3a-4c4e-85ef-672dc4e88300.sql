ALTER TABLE public.lba_alerts
  ADD COLUMN IF NOT EXISTS abstract_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS sponsor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS indication text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS relevance_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS watch_term text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.lba_alerts
  DROP CONSTRAINT IF EXISTS lba_alerts_status_check;
ALTER TABLE public.lba_alerts
  ADD CONSTRAINT lba_alerts_status_check CHECK (status IN ('new','reviewed','dismissed'));

CREATE UNIQUE INDEX IF NOT EXISTS lba_alerts_conf_abstract_uidx
  ON public.lba_alerts (conference_id, lower(abstract_number))
  WHERE abstract_number <> '';

CREATE INDEX IF NOT EXISTS lba_alerts_conf_idx ON public.lba_alerts (conference_id);

DROP TRIGGER IF EXISTS lba_alerts_set_updated_at ON public.lba_alerts;
CREATE TRIGGER lba_alerts_set_updated_at
  BEFORE UPDATE ON public.lba_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lba_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  term text NOT NULL,
  kind text NOT NULL DEFAULT 'keyword',
  priority integer NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lba_watchlist TO authenticated;
GRANT ALL ON public.lba_watchlist TO service_role;
ALTER TABLE public.lba_watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lba_watchlist_select" ON public.lba_watchlist;
CREATE POLICY "lba_watchlist_select" ON public.lba_watchlist FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lba_watchlist_insert" ON public.lba_watchlist;
CREATE POLICY "lba_watchlist_insert" ON public.lba_watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lba_watchlist_update" ON public.lba_watchlist;
CREATE POLICY "lba_watchlist_update" ON public.lba_watchlist FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lba_watchlist_delete" ON public.lba_watchlist;
CREATE POLICY "lba_watchlist_delete" ON public.lba_watchlist FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS lba_watchlist_conf_term_uidx
  ON public.lba_watchlist (conference_id, lower(term));

CREATE TRIGGER lba_watchlist_set_updated_at
  BEFORE UPDATE ON public.lba_watchlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lba_scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  sources_scanned text[] NOT NULL DEFAULT '{}',
  alerts_found integer NOT NULL DEFAULT 0,
  new_alerts integer NOT NULL DEFAULT 0,
  error text,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lba_scan_runs TO authenticated;
GRANT ALL ON public.lba_scan_runs TO service_role;
ALTER TABLE public.lba_scan_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lba_scan_runs_select" ON public.lba_scan_runs;
CREATE POLICY "lba_scan_runs_select" ON public.lba_scan_runs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lba_scan_runs_insert" ON public.lba_scan_runs;
CREATE POLICY "lba_scan_runs_insert" ON public.lba_scan_runs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lba_scan_runs_update" ON public.lba_scan_runs;
CREATE POLICY "lba_scan_runs_update" ON public.lba_scan_runs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "lba_scan_runs_delete" ON public.lba_scan_runs;
CREATE POLICY "lba_scan_runs_delete" ON public.lba_scan_runs FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER lba_scan_runs_set_updated_at
  BEFORE UPDATE ON public.lba_scan_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.lba_watchlist (conference_id, term, kind, priority)
SELECT c.id, t.term, t.kind, t.priority
FROM public.conferences c
CROSS JOIN (VALUES
  ('NSCLC', 'indication', 1),
  ('overall survival', 'keyword', 2),
  ('bispecific', 'keyword', 2),
  ('antibody-drug conjugate', 'keyword', 2)
) AS t(term, kind, priority)
ON CONFLICT DO NOTHING;