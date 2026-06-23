-- Deliverable Intelligence: tracks when a prospect opens their teardown link.
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).

CREATE TABLE IF NOT EXISTS deliverable_view_events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_key  TEXT        NOT NULL,
  viewed_at   TIMESTAMPTZ DEFAULT NOW(),
  user_agent  TEXT,
  country     TEXT
);

CREATE INDEX IF NOT EXISTS idx_dve_client_key_viewed_at
  ON deliverable_view_events (client_key, viewed_at DESC);

-- No Row Level Security needed — the pixel function uses the service role key,
-- which bypasses RLS by design. The data carries no PII.
