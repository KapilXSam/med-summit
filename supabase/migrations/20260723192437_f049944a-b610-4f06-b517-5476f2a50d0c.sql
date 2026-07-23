
CREATE TABLE public.extraction_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  query text,
  sessions jsonb NOT NULL DEFAULT '[]'::jsonb,
  session_count int NOT NULL DEFAULT 0,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conference_id, source_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extraction_cache TO anon, authenticated;
GRANT ALL ON public.extraction_cache TO service_role;
ALTER TABLE public.extraction_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage extraction_cache" ON public.extraction_cache FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_extraction_cache_updated BEFORE UPDATE ON public.extraction_cache FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_extraction_cache_conf ON public.extraction_cache(conference_id, scraped_at DESC);

CREATE TABLE public.extraction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  query text,
  source_url text,
  status text NOT NULL DEFAULT 'ok',
  session_count int NOT NULL DEFAULT 0,
  new_sessions int NOT NULL DEFAULT 0,
  posters_created int NOT NULL DEFAULT 0,
  endpoints_created int NOT NULL DEFAULT 0,
  reason text,
  attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  from_cache boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extraction_runs TO anon, authenticated;
GRANT ALL ON public.extraction_runs TO service_role;
ALTER TABLE public.extraction_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage extraction_runs" ON public.extraction_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_extraction_runs_conf ON public.extraction_runs(conference_id, created_at DESC);
