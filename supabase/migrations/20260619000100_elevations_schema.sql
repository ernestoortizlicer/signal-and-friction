-- ── 1. SCHEMA CHANGES FOR ELEVATIONS ──

-- Add columns to public.clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cognitive_fatigue_score INT DEFAULT 0 CHECK (cognitive_fatigue_score >= 0 AND cognitive_fatigue_score <= 100);

-- Add columns to public.beta_projects
ALTER TABLE public.beta_projects 
ADD COLUMN IF NOT EXISTS guarantee_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expansion_score INT DEFAULT 0 CHECK (expansion_score >= 0 AND expansion_score <= 100);


-- ── 2. SEED HYPER-LEAP CASE STUDY ──

-- Seed the Hyper-Leap case study article
INSERT INTO public.education_content (title, slug, category, summary, body, read_time_mins)
VALUES (
    'TikTok India Conversion Collapse',
    'tiktok-india-collapse',
    'Global Expansion',
    'A retrospective case study analyzing the multi-disciplinary cognitive barriers that caused TikTok''s India localized onboarding flow to crash.',
    'In this Hyper-Leap case study, we analyze the conversion catastrophe of TikTok''s India localized onboarding flow. In 2019, when expanding, the growth team localized the app, yet conversion plummeted. Systemic analysis reveals a combination of low-speed connection latency (technical friction), complex SMS OTP sequence (cognitive friction), and lack of trust elements during registration (trust deficit). Reverse-engineer the case study on your dashboard to see how the Socratic agents isolate these details.',
    8
)
ON CONFLICT (slug) DO NOTHING;

-- Seed the 3 Socratic drafts for this Hyper-Leap case study
INSERT INTO public.education_drafts (article_slug, draft_number, content)
VALUES
(
    'tiktok-india-collapse',
    1,
    '**Draft 1: Global Expansion Hacker Focus (SaaS Expansion)**

Expansion fails when local internet bandwidth, device memory, and localized network speed are ignored. In India, 3G/low-end Android devices predominated. The onboarding payload exceeded memory limits, causing app crashes before registration. Expanding requires a 90% lighter client package and offline-first token registration.'
),
(
    'tiktok-india-collapse',
    2,
    '**Draft 2: Founder''s Mind Architect Focus (Stanford Psychology)**

The local product team suffered from execution myopia, chasing registration volume while ignoring high-friction SMS OTP verification codes. Founders must overcome registration vanity metrics, audit local friction thresholds, and balance executive pressure with developer mental runway to avoid deployment quality slip.'
),
(
    'tiktok-india-collapse',
    3,
    '**Draft 3: Linguistic Architect Focus (MIT/Berkeley)**

Localization is not translation. Rushing the translation resulted in generic directives that failed to communicate value. To drive onboarding activation, the copy should have used high-status local phrasing that matches regional sub-cultures, reducing signup anxiety.'
)
ON CONFLICT DO NOTHING;
