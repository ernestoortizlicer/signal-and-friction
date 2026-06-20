-- ════════════════════════════════════════════════════════════
-- SUPABASE / POSTGRES MIGRATION: BUSINESS TRANSFORMATION & EDUCATION SCHEMA
-- Migration ID: 20260619000000_transformation_schema
-- ════════════════════════════════════════════════════════════

-- ── 1. SCHEMA EXTENSIONS ON CLIENTS & PROJECTS ──

-- Add segment and custom_fields to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT 'high_ticket' CHECK (segment IN ('high_ticket', 'microdosing')),
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add current_phase and custom_metrics to beta_projects
ALTER TABLE public.beta_projects
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'diagnostic' CHECK (current_phase IN ('diagnostic', 'intervention', 'monitoring', 'expansion', 'autonomy')),
ADD COLUMN IF NOT EXISTS custom_metrics JSONB DEFAULT '{}'::jsonb;


-- ── 2. NEW EDUCATION SYSTEM TABLES ──

-- Socratic Drafts Table
CREATE TABLE IF NOT EXISTS public.education_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_slug TEXT NOT NULL REFERENCES public.education_content(slug) ON DELETE CASCADE,
    draft_number INT NOT NULL CHECK (draft_number IN (1, 2, 3)),
    content TEXT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    selected_arguments TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for drafts lookup
CREATE INDEX IF NOT EXISTS idx_education_drafts_slug ON public.education_drafts(article_slug);

-- Educational Progress Tracker
CREATE TABLE IF NOT EXISTS public.education_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    article_slug TEXT NOT NULL REFERENCES public.education_content(slug) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    quiz_answers JSONB DEFAULT '{}'::jsonb,
    score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for progress tracking
CREATE INDEX IF NOT EXISTS idx_education_progress_user ON public.education_progress(user_email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_education_progress_user_slug ON public.education_progress(user_email, article_slug);


-- ── 3. DATA SEEDING (Socratic Education Content) ──

-- Seed the core article on the Socratic Method for funnel optimization
INSERT INTO public.education_content (title, slug, category, summary, body, read_time_mins)
VALUES (
    'The Socratic Method of Funnel Diagnostics',
    'socratic-funnel-diagnostics',
    'Conversion Architecture',
    'How Socratic dialogue and multi-agent debate uncover hidden cognitive friction in software pricing funnels.',
    'Conversion optimization is typically treated as a series of tactical A/B tests. However, the Signal & Friction Method™ models conversion as a cognitive journey with distinct friction mechanisms. The Socratic Method applies parallel agent reasoning to critique a funnel from multiple angles: the Product Strategist focuses on unit economics, the Behavioral Scientist on choice fatigue, and the Linguistic Architect on message rhythm. This debate avoids premature optimization consensus, leading to deeper diagnostics.',
    6
)
ON CONFLICT (slug) DO NOTHING;

-- Seed the 3 Socratic drafts for this article
INSERT INTO public.education_drafts (article_slug, draft_number, content)
VALUES
(
    'socratic-funnel-diagnostics',
    1,
    '**Draft 1: Product Strategist Focus (Silicon Valley)**\n\nTo scale a SaaS to $10M ARR, optimization must map to pricing metrics. Reducing cognitive overhead directly shortens sales cycles. By mapping user flows to product tiers, the Socratic approach ensures that any conversion lift increases LTV-to-CAC ratios. Tactics must prioritize high-tier conversions over cheap sign-ups.'
),
(
    'socratic-funnel-diagnostics',
    2,
    '**Draft 2: Behavioral Scientist Focus (Reforge/Stanford)**\n\nFriction is cognitive resistance. According to Kahneman System 1/System 2 thinking, users default to System 1 (fast, low-effort) when visiting pricing pages. When they see a complex grid, they switch to System 2 (analytical, high-effort), which triggers decision fatigue and bounces. Socratic debate targets this specific transition point to keep users in System 1.'
),
(
    'socratic-funnel-diagnostics',
    3,
    '**Draft 3: Linguistic Architect Focus (MIT/Berkeley)**\n\nWords dictate processing speed. The rhythmic pace of headline copy sets the user''s internal tempo. Using passive voice or generic slogans ("We build the future") increases reading latency. The Socratic methodology reframes headings into clean, high-status directives that match the founder''s executive tone.'
)
ON CONFLICT DO NOTHING;


-- ── 4. ROW LEVEL SECURITY (RLS) POLICIES ──

ALTER TABLE public.education_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_progress ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY allow_read_education_drafts ON public.education_drafts
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY allow_read_education_progress ON public.education_progress
    FOR SELECT TO authenticated, anon USING (true);

-- Admin modification policies
CREATE POLICY admin_all_education_drafts ON public.education_drafts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY admin_all_education_progress ON public.education_progress
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
