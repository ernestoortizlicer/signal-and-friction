-- ════════════════════════════════════════════════════════════
-- MIGRATION: Loom View Events Tracking Table
-- Migration ID: 20260626000100_loom_view_events
--
-- Tracks when prospects view their diagnostic Loom videos.
-- Used for deal acceleration signals and engagement metrics.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.loom_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text NOT NULL,
  prospect_id uuid,
  timestamp timestamptz DEFAULT now(),
  user_agent text,
  referrer text,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  
  -- Foreign key relationship (if prospect tracking needed)
  CONSTRAINT fk_prospect_id FOREIGN KEY (prospect_id)
    REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX idx_loom_client_key ON public.loom_view_events(client_key);
CREATE INDEX idx_loom_prospect_id ON public.loom_view_events(prospect_id);
CREATE INDEX idx_loom_timestamp ON public.loom_view_events(timestamp DESC);

-- Enable RLS
ALTER TABLE public.loom_view_events ENABLE ROW LEVEL SECURITY;

-- Service role (admin) can read all view events
CREATE POLICY service_role_read_loom_events ON public.loom_view_events
    FOR SELECT TO service_role
    USING (true);

-- Authenticated users can read only their own prospect's view events
CREATE POLICY authenticated_read_own_loom_events ON public.loom_view_events
    FOR SELECT TO authenticated
    USING (
      prospect_id IN (
        SELECT id FROM clients
        WHERE auth.uid()::text = id OR auth.role() = 'service_role'
      )
    );
