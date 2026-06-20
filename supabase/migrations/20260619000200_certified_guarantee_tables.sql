-- ── 1. SCHEMA DEFINITION FOR CERTIFICATIONS & GUARANTEES ──

-- Add private notes field for founder psychology tracking to public.clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS private_notes TEXT;

-- Certification Programs Table
CREATE TABLE IF NOT EXISTS public.certification_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    curriculum JSONB NOT NULL DEFAULT '[]'::jsonb,
    price_cents INT NOT NULL DEFAULT 250000, -- Default $2,500.00 (in cents)
    pricing_model TEXT NOT NULL CHECK (pricing_model IN ('one_time', 'subscription')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Certified Practitioners Table (Tracks clients/consultants licensed under S&F)
CREATE TABLE IF NOT EXISTS public.certified_practitioners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.certification_programs(id) ON DELETE CASCADE,
    certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    satisfaction_score INT CHECK (satisfaction_score >= 0 AND satisfaction_score <= 100) DEFAULT 100,
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'expired')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(client_id, program_id)
);

-- Performance Guarantees Table (Tracks active A/B testing guarantee conditions per project)
CREATE TABLE IF NOT EXISTS public.performance_guarantees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES public.beta_projects(id) ON DELETE CASCADE,
    target_improvement_pct NUMERIC(5, 2) DEFAULT 20.00,
    timeframe_days INT DEFAULT 30,
    traffic_gate_met BOOLEAN DEFAULT false,
    sla_gate_met BOOLEAN DEFAULT false,
    isolation_gate_met BOOLEAN DEFAULT false,
    telemetry_gate_met BOOLEAN DEFAULT false,
    baseline_conversion_rate NUMERIC(5, 2) DEFAULT 0.00,
    current_conversion_rate NUMERIC(5, 2) DEFAULT 0.00,
    guarantee_status TEXT NOT NULL CHECK (guarantee_status IN ('active', 'met', 'failed_refunded', 'voided')) DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_certified_practitioners_client ON public.certified_practitioners(client_id);
CREATE INDEX IF NOT EXISTS idx_certified_practitioners_status ON public.certified_practitioners(status);
CREATE INDEX IF NOT EXISTS idx_performance_guarantees_project ON public.performance_guarantees(project_id);
CREATE INDEX IF NOT EXISTS idx_performance_guarantees_status ON public.performance_guarantees(guarantee_status);


-- ── 2. SEED DEFAULT DATA ──

-- Seed the initial S&F Certified Program
INSERT INTO public.certification_programs (name, curriculum, price_cents, pricing_model)
VALUES (
    'Signal & Friction Method™ Certified Practitioner',
    '[
      {"module": "01. Introduction to Cognitive Friction Heuristics", "duration_weeks": 2},
      {"module": "02. Trust Deficits and Social Proof Structuring", "duration_weeks": 2},
      {"module": "03. Sequence Order & High-Value Copy Variants", "duration_weeks": 3},
      {"module": "04. PostHog Telemetry & baseline validation", "duration_weeks": 1},
      {"module": "05. Master Socratic Simulator Exam", "duration_weeks": 2}
    ]'::jsonb,
    250000, -- $2,500.00
    'one_time'
)
ON CONFLICT DO NOTHING;
