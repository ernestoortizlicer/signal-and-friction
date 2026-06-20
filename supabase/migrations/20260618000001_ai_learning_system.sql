-- ════════════════════════════════════════════════════════════
-- SUPABASE / POSTGRES MIGRATION: CONTINUOUS LEARNING & AI ERROR SYSTEM
-- Migration ID: 20260618000001_ai_learning_system
-- ════════════════════════════════════════════════════════════

-- ── 1. PROMPT VERSIONS TABLE ──
CREATE TABLE IF NOT EXISTS public.prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    iteration_version TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup of latest prompt versions
CREATE INDEX IF NOT EXISTS idx_prompt_versions_phase_version ON public.prompt_versions(phase, created_at DESC);

-- Seed initial prompt versions for outreach and diagnostic phases
INSERT INTO public.prompt_versions (phase, prompt_text, iteration_version)
VALUES 
('outreach', 'Hey [Name], saw you are scaling the product team at [Company]. Audited your signups — there is a clear [Mechanism] bottleneck on [Bottleneck]. You are asking for configurations before they see the dashboard, which creates friction. I put together a quick, 2-line visual correction for this. No pitch, no call. Want me to send the mockup over in a DM?', 'v1.0.0'),
('diagnostic', 'Provide B2B SaaS diagnostics with McKinsey-level clinical precision. Focus on the core friction mechanism: Cognitive Load, Trust Deficit, Commitment Anxiety, Ordering Error, Identity Friction, Value Uncertainty. Present exactly 3 strategic decisions (Conservative, Aggressive, Lateral).', 'v1.0.0')
ON CONFLICT DO NOTHING;


-- ── 2. AI INCIDENTS TABLE ──
CREATE TABLE IF NOT EXISTS public.ai_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL CHECK (incident_type IN (
        'ai_hallucination',
        'process_error',
        'client_friction',
        'automation_failure',
        'data_quality_issue',
        'prompt_improvement',
        'tool_misuse',
        'unexpected_outcome'
    )),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    phase TEXT NOT NULL CHECK (phase IN (
        'prospecting',
        'outreach',
        'follow_up',
        'diagnostic',
        'delivery',
        'testimonial',
        'portfolio',
        'backend',
        'dashboard',
        'mcp_server'
    )),
    description TEXT NOT NULL,
    root_cause TEXT,
    hallucination_snippet TEXT, -- exact AI output that was wrong, if applicable
    affected_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    affected_project_id UUID REFERENCES public.beta_projects(id) ON DELETE SET NULL,
    resolution TEXT,
    lesson_learned TEXT,
    applied_improvement TEXT, -- what changed in the system as a result
    improvement_type TEXT CHECK (improvement_type IN (
        'prompt_updated',
        'schema_changed',
        'automation_fixed',
        'message_rewritten',
        'validation_added',
        'documentation_updated',
        'tool_reconfigured'
    )),
    iteration_version TEXT, -- tracks which version of the system this incident applies to (e.g. v1.0.1)
    improved_prompt TEXT, -- raw updated prompt text if prompt_updated
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Indexes for performance and reporting
CREATE INDEX IF NOT EXISTS idx_ai_incidents_type ON public.ai_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_ai_incidents_phase ON public.ai_incidents(phase);
CREATE INDEX IF NOT EXISTS idx_ai_incidents_severity ON public.ai_incidents(severity);


-- ── 3. AUTOMATED TRIGGERS & FUNCTIONS ──

-- Trigger: Audit Log on incident creation
CREATE OR REPLACE FUNCTION public.log_ai_incident()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_log (client_id, action, details)
    VALUES (
        NEW.affected_client_id,
        'ai_incident_reported',
        jsonb_build_object(
            'incident_id', NEW.id,
            'type', NEW.incident_type,
            'phase', NEW.phase,
            'severity', NEW.severity,
            'description', substring(NEW.description from 1 for 100)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_log_ai_incident
    AFTER INSERT ON public.ai_incidents
    FOR EACH ROW EXECUTE FUNCTION public.log_ai_incident();

-- Trigger: Audit Log on incident resolution
CREATE OR REPLACE FUNCTION public.log_ai_incident_resolved()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
        INSERT INTO public.activity_log (client_id, action, details)
        VALUES (
            NEW.affected_client_id,
            'ai_incident_resolved',
            jsonb_build_object(
                'incident_id', NEW.id,
                'type', NEW.incident_type,
                'phase', NEW.phase,
                'improvement_type', NEW.improvement_type,
                'iteration_version', NEW.iteration_version
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_log_ai_incident_resolved
    AFTER UPDATE ON public.ai_incidents
    FOR EACH ROW EXECUTE FUNCTION public.log_ai_incident_resolved();


-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ──

ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_incidents ENABLE ROW LEVEL SECURITY;

-- SELECT policies allowing read access to authenticated and anon users client-side
CREATE POLICY allow_read_prompt_versions ON public.prompt_versions
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY allow_read_ai_incidents ON public.ai_incidents
    FOR SELECT TO authenticated, anon USING (true);

-- ALL policies allowing writes/mutations to authenticated admin (and service_role automatically)
CREATE POLICY admin_all_prompt_versions ON public.prompt_versions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_ai_incidents ON public.ai_incidents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── 5. EXTEND READ PERMISSIONS ON EXISTING TABLES FOR CLIENT-SIDE DASHBOARD ──

DROP POLICY IF EXISTS allow_read_clients ON public.clients;
CREATE POLICY allow_read_clients ON public.clients 
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS allow_read_beta_projects ON public.beta_projects;
CREATE POLICY allow_read_beta_projects ON public.beta_projects 
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS allow_read_interactions ON public.interactions;
CREATE POLICY allow_read_interactions ON public.interactions 
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS allow_read_testimonials ON public.testimonials;
CREATE POLICY allow_read_testimonials ON public.testimonials 
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS allow_read_portfolio ON public.portfolio;
CREATE POLICY allow_read_portfolio ON public.portfolio 
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS allow_read_activity_log ON public.activity_log;
CREATE POLICY allow_read_activity_log ON public.activity_log 
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS allow_read_tasks ON public.tasks;
CREATE POLICY allow_read_tasks ON public.tasks 
    FOR SELECT TO authenticated, anon USING (true);
