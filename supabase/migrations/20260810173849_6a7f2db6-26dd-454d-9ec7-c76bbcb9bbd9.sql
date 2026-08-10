ALTER TABLE public.lba_alerts
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'conference',
  ADD COLUMN IF NOT EXISTS approval text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edited boolean NOT NULL DEFAULT false;

UPDATE public.lba_alerts SET source_type = 'conference', approval = 'approved' WHERE source_type IS NULL OR approval IS NULL;

CREATE INDEX IF NOT EXISTS lba_alerts_approval_idx ON public.lba_alerts (conference_id, approval);