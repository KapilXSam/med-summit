CREATE TABLE public.ci_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id text REFERENCES public.conferences(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  person_key text NOT NULL,
  company text NOT NULL DEFAULT '',
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  session_title text NOT NULL DEFAULT '',
  asset text NOT NULL DEFAULT '',
  trial_id text NOT NULL DEFAULT '',
  day text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT '',
  room text NOT NULL DEFAULT '',
  indication text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'To approach',
  kiq_id uuid REFERENCES public.kiqs(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ci_contacts_person_conf_idx ON public.ci_contacts (conference_id, person_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ci_contacts TO authenticated;
GRANT ALL ON public.ci_contacts TO service_role;

ALTER TABLE public.ci_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_contacts_select" ON public.ci_contacts FOR SELECT USING (true);
CREATE POLICY "ci_contacts_insert" ON public.ci_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "ci_contacts_update" ON public.ci_contacts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ci_contacts_delete" ON public.ci_contacts FOR DELETE USING (true);

CREATE TRIGGER ci_contacts_set_updated_at
BEFORE UPDATE ON public.ci_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();