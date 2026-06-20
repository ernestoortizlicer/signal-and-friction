-- ════════════════════════════════════════════════════════════
-- SUPABASE / POSTGRES MIGRATION: CLIENT PROSPECTING PIPELINE
-- Migration ID: 20260618000000_init_prospection
-- ════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. SCHEMA DEFINITION ──

-- Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT,
    contact_profile_url TEXT,
    industry TEXT NOT NULL,
    estimated_mrr NUMERIC(12, 2) DEFAULT 0.00,
    source_platform TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interactions & Diagnostic Data Table
CREATE TABLE IF NOT EXISTS public.interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    funnel_signal TEXT,
    dominant_friction_mechanism TEXT CHECK (dominant_friction_mechanism IN ('cognitive_load', 'trust_deficit', 'value_deficit', 'sequence_order')),
    root_cause_description TEXT,
    diagnostic_loom_url TEXT,
    figma_annotated_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Beta Projects Table
CREATE TABLE IF NOT EXISTS public.beta_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('prospecting', 'outreach_sent', 'followup_sent', 'diagnostic_in_progress', 'delivered', 'awaiting_testimonial', 'closed_completed', 'closed_lost')) DEFAULT 'prospecting',
    outreach_sent_at TIMESTAMPTZ,
    followup_sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    symbolic_price_charged NUMERIC(10, 2) DEFAULT 350.00,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('uninvoiced', 'invoiced_unpaid', 'paid')) DEFAULT 'uninvoiced',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Testimonials Table
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
    linkedin_comment_url TEXT,
    quote_text TEXT NOT NULL,
    headshot_url TEXT,
    permission_status BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Public Portfolio Case Studies Table
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
    one_line_pain TEXT NOT NULL,
    one_line_solution TEXT NOT NULL,
    key_metric_result TEXT NOT NULL,
    is_live BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable Activity & Audit Log Table
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks / Follow-up Reminders Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. PERFORMANCE INDEXES ──
CREATE INDEX IF NOT EXISTS idx_clients_industry ON public.clients(industry);
CREATE INDEX IF NOT EXISTS idx_beta_projects_status ON public.beta_projects(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_client ON public.activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date) WHERE is_completed = false;

-- ── 3. AUTOMATED TRIGGERS & FUNCTIONS ──

-- Automatic updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply set_updated_at Triggers
CREATE TRIGGER trigger_set_clients_updated
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_set_beta_projects_updated
    BEFORE UPDATE ON public.beta_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_set_portfolio_updated
    BEFORE UPDATE ON public.portfolio
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: Auto-create Beta Project on Client Insertion
CREATE OR REPLACE FUNCTION public.handle_client_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.beta_projects (client_id, status)
    VALUES (NEW.id, 'prospecting');
    
    INSERT INTO public.activity_log (client_id, action, details)
    VALUES (NEW.id, 'CLIENT_CREATED', jsonb_build_object('company_name', NEW.company_name));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_client_created
    AFTER INSERT ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.handle_client_created();

-- Trigger: Audit Log project status updates & timestamps
CREATE OR REPLACE FUNCTION public.handle_project_status_updated()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Log action
        INSERT INTO public.activity_log (client_id, action, details)
        VALUES (
            NEW.client_id, 
            'STATUS_CHANGE', 
            jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status)
        );

        -- Update timestamps automatically depending on status
        IF NEW.status = 'outreach_sent' THEN
            NEW.outreach_sent_at = now();
        ELSIF NEW.status = 'followup_sent' THEN
            NEW.followup_sent_at = now();
        ELSIF NEW.status = 'delivered' THEN
            NEW.delivered_at = now();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_status_updated
    BEFORE UPDATE ON public.beta_projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_project_status_updated();

-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ──

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Enforce Admin-only access policies for all tables
CREATE POLICY admin_all_clients ON public.clients
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_interactions ON public.interactions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_beta_projects ON public.beta_projects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_testimonials ON public.testimonials
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_portfolio ON public.portfolio
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_activity_log ON public.activity_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_tasks ON public.tasks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
