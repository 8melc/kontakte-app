-- Migration: kontakt_events
-- Logs every "gemeldet" / "dran gedacht" event with timestamp + source.
-- Used by the Statistik page for weekly sparkline, streaks and trends.
-- Apply in Supabase SQL Editor: paste this whole file → Run.

CREATE TABLE IF NOT EXISTS public.kontakt_events (
  id          BIGSERIAL PRIMARY KEY,
  kontakt_id  BIGINT NOT NULL REFERENCES public.kontakte(id) ON DELETE CASCADE,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  source      TEXT,             -- 'detail' | 'swipe' | 'quickadd' | 'meldung' | 'manual'
  kind        TEXT NOT NULL DEFAULT 'gemeldet',  -- 'gemeldet' | 'gedacht'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kontakt_events_ts_idx ON public.kontakt_events (ts DESC);
CREATE INDEX IF NOT EXISTS kontakt_events_kontakt_idx ON public.kontakt_events (kontakt_id);

-- RLS — match existing pattern of the kontakte table.
-- This app currently uses the anon key with permissive policies.
-- Adjust if your existing tables use a stricter pattern (e.g. auth.uid()).
ALTER TABLE public.kontakt_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon all" ON public.kontakt_events;
CREATE POLICY "anon all"
  ON public.kontakt_events
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated all" ON public.kontakt_events;
CREATE POLICY "authenticated all"
  ON public.kontakt_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Backfill: seed one event per kontakt with the existing last_contact.
-- This way the Statistik page already shows trend lines based on the
-- single data point you have today, without losing it.
INSERT INTO public.kontakt_events (kontakt_id, ts, source, kind)
SELECT
  k.id,
  (k.last_contact::timestamptz + INTERVAL '12 hours'),
  'backfill',
  'gemeldet'
FROM public.kontakte k
WHERE k.last_contact IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.kontakt_events e
    WHERE e.kontakt_id = k.id AND e.source = 'backfill'
  );
