DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agenda_items','comments','conferences','delegates','endpoints','extraction_cache','extraction_runs','hypotheses','insights','kiqs','kits','lba_alerts','lba_scan_runs','lba_watchlist','posters','sessions']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "public access %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "public access %s" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;