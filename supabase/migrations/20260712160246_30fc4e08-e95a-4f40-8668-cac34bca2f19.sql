
-- updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- CONFERENCES
CREATE TABLE public.conferences (
  id text PRIMARY KEY,
  name text NOT NULL,
  acronym text NOT NULL,
  location text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  therapy_areas text[] NOT NULL DEFAULT '{}',
  session_count int NOT NULL DEFAULT 0,
  delegate_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Planning',
  phase text NOT NULL DEFAULT 'pre',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conferences TO anon, authenticated;
GRANT ALL ON public.conferences TO service_role;
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage conferences" ON public.conferences FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_conferences_updated BEFORE UPDATE ON public.conferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DELEGATES
CREATE TABLE public.delegates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  initials text NOT NULL,
  role text NOT NULL,
  focus text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delegates TO anon, authenticated;
GRANT ALL ON public.delegates TO service_role;
ALTER TABLE public.delegates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage delegates" ON public.delegates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- KITS
CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  topic text NOT NULL,
  owner text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO anon, authenticated;
GRANT ALL ON public.kits TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage kits" ON public.kits FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_kits_updated BEFORE UPDATE ON public.kits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- KIQS
CREATE TABLE public.kiqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid REFERENCES public.kits(id) ON DELETE CASCADE,
  question text NOT NULL,
  mapped_sessions int NOT NULL DEFAULT 0,
  completion int NOT NULL DEFAULT 0,
  has_new_evidence boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiqs TO anon, authenticated;
GRANT ALL ON public.kiqs TO service_role;
ALTER TABLE public.kiqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage kiqs" ON public.kiqs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_kiqs_updated BEFORE UPDATE ON public.kiqs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SESSIONS
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  title text NOT NULL,
  time text NOT NULL DEFAULT '',
  day text NOT NULL DEFAULT '',
  room text NOT NULL DEFAULT '',
  authors text NOT NULL DEFAULT '',
  affiliation text NOT NULL DEFAULT '',
  trial_id text,
  therapy_area text NOT NULL DEFAULT '',
  asset text NOT NULL DEFAULT '',
  phase text NOT NULL DEFAULT '',
  confidence int NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES public.delegates(id) ON DELETE SET NULL,
  conflict boolean NOT NULL DEFAULT false,
  kiq_id uuid REFERENCES public.kiqs(id) ON DELETE SET NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO anon, authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage sessions" ON public.sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_sessions_conference ON public.sessions(conference_id);

-- AGENDA ITEMS (planner)
CREATE TABLE public.agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  day text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_items TO anon, authenticated;
GRANT ALL ON public.agenda_items TO service_role;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage agenda_items" ON public.agenda_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_agenda_updated BEFORE UPDATE ON public.agenda_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_agenda_conference ON public.agenda_items(conference_id);

-- POSTERS
CREATE TABLE public.posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  title text NOT NULL,
  presenter text NOT NULL DEFAULT '',
  captured_by text NOT NULL DEFAULT '',
  captured_at text NOT NULL DEFAULT '',
  therapy_area text NOT NULL DEFAULT '',
  ocr_status text NOT NULL DEFAULT 'processing',
  summary text[] NOT NULL DEFAULT '{}',
  significant boolean NOT NULL DEFAULT false,
  contradictory boolean NOT NULL DEFAULT false,
  source_quote text NOT NULL DEFAULT '',
  page int NOT NULL DEFAULT 1,
  confidence int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posters TO anon, authenticated;
GRANT ALL ON public.posters TO service_role;
ALTER TABLE public.posters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage posters" ON public.posters FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_posters_updated BEFORE UPDATE ON public.posters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ENDPOINTS
CREATE TABLE public.endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  trial_id text NOT NULL DEFAULT '',
  trial_name text NOT NULL DEFAULT '',
  asset text NOT NULL DEFAULT '',
  endpoint_type text NOT NULL DEFAULT 'Primary',
  endpoint text NOT NULL DEFAULT '',
  value text NOT NULL DEFAULT '',
  p_value text NOT NULL DEFAULT '',
  hr text NOT NULL DEFAULT '',
  ci text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.endpoints TO anon, authenticated;
GRANT ALL ON public.endpoints TO service_role;
ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage endpoints" ON public.endpoints FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_endpoints_updated BEFORE UPDATE ON public.endpoints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HYPOTHESES
CREATE TABLE public.hypotheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  kiq_id uuid REFERENCES public.kiqs(id) ON DELETE SET NULL,
  statement text NOT NULL,
  impact text NOT NULL DEFAULT 'Medium',
  likelihood text NOT NULL DEFAULT 'Medium',
  gap boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hypotheses TO anon, authenticated;
GRANT ALL ON public.hypotheses TO service_role;
ALTER TABLE public.hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage hypotheses" ON public.hypotheses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_hypotheses_updated BEFORE UPDATE ON public.hypotheses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INSIGHTS
CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  text text NOT NULL,
  kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL,
  kiq_id uuid REFERENCES public.kiqs(id) ON DELETE SET NULL,
  poster_id uuid REFERENCES public.posters(id) ON DELETE SET NULL,
  significant boolean NOT NULL DEFAULT false,
  contradictory boolean NOT NULL DEFAULT false,
  novelty int NOT NULL DEFAULT 0,
  impact int NOT NULL DEFAULT 0,
  confidence int NOT NULL DEFAULT 0,
  source_quote text NOT NULL DEFAULT '',
  page int NOT NULL DEFAULT 1,
  duplicate_of uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insights TO anon, authenticated;
GRANT ALL ON public.insights TO service_role;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage insights" ON public.insights FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_insights_updated BEFORE UPDATE ON public.insights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LBA ALERTS
CREATE TABLE public.lba_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  title text NOT NULL,
  detected_at text NOT NULL DEFAULT '',
  relevant_to_kit boolean NOT NULL DEFAULT false,
  kit_topic text,
  trial_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lba_alerts TO anon, authenticated;
GRANT ALL ON public.lba_alerts TO service_role;
ALTER TABLE public.lba_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage lba_alerts" ON public.lba_alerts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- COMMENTS
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT '',
  initials text NOT NULL DEFAULT '',
  text text NOT NULL,
  time text NOT NULL DEFAULT '',
  target text NOT NULL DEFAULT '',
  mentions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO anon, authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public manage comments" ON public.comments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
