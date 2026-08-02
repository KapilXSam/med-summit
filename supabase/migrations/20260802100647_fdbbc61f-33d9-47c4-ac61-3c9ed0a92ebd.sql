DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['conferences','sessions','agenda_items','delegates','kits','kiqs','hypotheses','insights','posters','endpoints','comments','lba_alerts','extraction_runs','extraction_cache']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format($f$CREATE POLICY "authenticated_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)$f$, t);
    EXECUTE format($f$CREATE POLICY "authenticated_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)$f$, t);
    EXECUTE format($f$CREATE POLICY "authenticated_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)$f$, t);
    EXECUTE format($f$CREATE POLICY "authenticated_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)$f$, t);
  END LOOP;
END $$;