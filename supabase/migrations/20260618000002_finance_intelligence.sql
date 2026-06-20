-- ════════════════════════════════════════════════════════════
-- SUPABASE / POSTGRES MIGRATION: PERSONAL FINANCE COMMAND CENTER
-- Migration ID: 20260618000002_finance_intelligence
-- ════════════════════════════════════════════════════════════

-- ── 1. ACCOUNT AND TRANSACTION LEDGER SCHEMA ──

-- Financial Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expense & Income Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction Headers
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ NOT NULL DEFAULT now(),
    description TEXT NOT NULL,
    source_project_id UUID REFERENCES public.beta_projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction Entries (Double-Entry Splits)
CREATE TABLE IF NOT EXISTS public.transaction_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount INT8 NOT NULL, -- Integer in cents. Positive = Debit, Negative = Credit (or standard balance changes)
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_entries_tx ON public.transaction_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_entries_account ON public.transaction_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);


-- ── 2. INVESTMENTS, ASSETS, NET WORTH SCHEMA ──

-- Investments & ROI Engine
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('hardware', 'ai_tools', 'software', 'financial_asset')),
    purchase_date TIMESTAMPTZ NOT NULL,
    cost_basis INT8 NOT NULL, -- cost in cents
    current_value INT8 NOT NULL, -- current value in cents
    projected_annual_roi_pct NUMERIC(5, 2) DEFAULT 0.00,
    actual_annual_roi_pct NUMERIC(5, 2) DEFAULT 0.00,
    depreciation_rate_annual_pct NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Net Worth snapshots for historical charts
CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE,
    total_assets INT8 NOT NULL, -- cents
    total_liabilities INT8 NOT NULL, -- cents
    net_worth INT8 NOT NULL, -- cents
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Education Knowledge Base
CREATE TABLE IF NOT EXISTS public.education_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    body TEXT NOT NULL,
    read_time_mins INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Goals / Targets
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    target_amount INT8 NOT NULL, -- cents
    current_amount INT8 NOT NULL DEFAULT 0, -- cents
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Incidents Linkage
CREATE TABLE IF NOT EXISTS public.financial_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.ai_incidents(id) ON DELETE CASCADE,
    discrepancy_amount INT8 NOT NULL DEFAULT 0, -- cents
    expected_amount INT8 NOT NULL DEFAULT 0,
    actual_amount INT8 NOT NULL DEFAULT 0,
    reconciled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ── 3. DATA SEEDING (ACCOUNTS, CATEGORIES, EDUCATION) ──

-- Seed accounts
INSERT INTO public.accounts (name, type, currency)
VALUES
('Signal & Friction Checking', 'asset', 'USD'),
('Investment Account', 'asset', 'USD'),
('Roth IRA Account', 'asset', 'USD'),
('Hardware Assets', 'asset', 'USD'),
('Consulting Revenue', 'revenue', 'USD'),
('Software Subscription Expenses', 'expense', 'USD'),
('AI API & Platform Expenses', 'expense', 'USD'),
('Education Expenses', 'expense', 'USD'),
('Stripe Fees Expense', 'expense', 'USD')
ON CONFLICT (name) DO NOTHING;

-- Seed categories
INSERT INTO public.categories (name, type)
VALUES
('consulting_income', 'income'),
('investment_return', 'income'),
('hardware_upgrade', 'expense'),
('software_licenses', 'expense'),
('ai_credits', 'expense'),
('education_books', 'expense'),
('retirement_savings', 'expense'),
('stripe_processing_fees', 'expense')
ON CONFLICT (name) DO NOTHING;

-- Seed initial educational articles
INSERT INTO public.education_content (title, slug, category, summary, body, read_time_mins)
VALUES
('The FIRE Movement for Async Solopreneurs', 'fire-movement-solopreneur', 'FIRE Movement', 'How to calculate your financial independence number and plan retirement working as a premium async consultant.', 'The Financial Independence, Retire Early (FIRE) movement is perfectly suited for high-ticket async solopreneurs. Because your consulting model requires zero office overhead and focuses on selling visual briefs for $1,500 - $3,000, your margins are close to 95%. By keeping your burn rate low and routing surplus checking cash directly into broad-market index funds (like S&P 500 ETFs), you can achieve financial freedom within 5-7 years instead of decades. Key formula: Net Worth Target = Annual Burn Rate * 25. Once reached, you can safely withdraw 4% annually without ever touching the principal.', 6),
('Opportunity Cost Analysis: Hardware Upgrades vs. AI Credits', 'opportunity-cost-hardware-ai', 'Investing', 'A quantitative model for evaluating whether to upgrade physical computing hardware or redirect capital into API subscriptions.', 'When managing a modern async practice, every capital outlay is an investment. Buying a new $3,500 MacBook Pro has a physical depreciation rate of roughly 25% annually, and its return on investment (ROI) is capped by your personal hour-limit. Conversely, investing $3,500 in additional AI API credits or ChatGPT Enterprise seat licenses can automate lead generation and mock-up designs, expanding output bandwidth by 10x. Before upgrading your laptop, verify if your current processor is genuinely throttling render times. If not, redirecting that budget into AI leverage yields a higher economic multiplier.', 5),
('Tax Optimization for Single-Member B2B LLCs', 'tax-optimization-llc', 'Tax Optimization', 'Strategic write-offs for hardware, software, and AI subscriptions to legally minimize self-employment tax burden.', 'As a single-member LLC, your business checking transactions are the foundation of tax optimization. Every subscription (ChatGPT, Claude, Supabase, Vercel) and hardware purchase is fully deductible as an ordinary and necessary business expense. To maximize savings, ensure your double-entry accounting ledger isolates these expenses into dedicated categories. Additionally, contributing to a Simplified Employee Pension (SEP) IRA allows you to write off up to 25% of your net earnings from self-employment, building retirement wealth while lowering current taxable income.', 7)
ON CONFLICT (slug) DO NOTHING;


-- ── 4. AUTOMATED TRIGGERS & FUNCTIONS ──

-- Constraint validation: check that debits and credits match (sum to 0) in transaction entries.
-- Declared as DEFERRABLE INITIALLY DEFERRED to run at transaction commit.
CREATE OR REPLACE FUNCTION public.check_transaction_double_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_sum INT8;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_sum
    FROM public.transaction_entries
    WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);

    IF v_sum <> 0 THEN
        RAISE EXCEPTION 'Double-entry transaction constraint violated: Debits and Credits must sum to zero. Sum was % cents.', v_sum;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_transaction_double_entry ON public.transaction_entries;
CREATE CONSTRAINT TRIGGER trigger_check_transaction_double_entry
    AFTER INSERT OR UPDATE OR DELETE ON public.transaction_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION public.check_transaction_double_entry();

-- Trigger: Automatically reconcile payments when project state moves to 'paid'
CREATE OR REPLACE FUNCTION public.handle_project_payment_paid()
RETURNS TRIGGER AS $$
DECLARE
    v_checking_account_id UUID;
    v_revenue_account_id UUID;
    v_category_id UUID;
    v_transaction_id UUID;
    v_amount_cents INT8;
BEGIN
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
        v_amount_cents := COALESCE(NEW.symbolic_price_charged, 350.00) * 100;

        -- Ensure checking asset account exists
        SELECT id INTO v_checking_account_id FROM public.accounts WHERE name = 'Signal & Friction Checking' LIMIT 1;
        -- Ensure consulting revenue account exists
        SELECT id INTO v_revenue_account_id FROM public.accounts WHERE name = 'Consulting Revenue' LIMIT 1;
        -- Ensure consulting income category exists
        SELECT id INTO v_category_id FROM public.categories WHERE name = 'consulting_income' LIMIT 1;

        -- Create transaction header
        INSERT INTO public.transactions (description, source_project_id)
        VALUES ('Automatic Reconciliation: Payment for project ' || NEW.id, NEW.id)
        RETURNING id INTO v_transaction_id;

        -- Debit: Checking account increases (positive)
        INSERT INTO public.transaction_entries (transaction_id, account_id, category_id, amount)
        VALUES (v_transaction_id, v_checking_account_id, v_category_id, v_amount_cents);

        -- Credit: Revenue account increases (negative credit representation)
        INSERT INTO public.transaction_entries (transaction_id, account_id, category_id, amount)
        VALUES (v_transaction_id, v_revenue_account_id, v_category_id, -v_amount_cents);

        -- Audit Log financial reconciliation trace
        INSERT INTO public.activity_log (client_id, action, details)
        VALUES (
            NEW.client_id,
            'FINANCIAL_RECONCILIATION',
            jsonb_build_object(
                'transaction_id', v_transaction_id,
                'project_id', NEW.id,
                'amount_usd', COALESCE(NEW.symbolic_price_charged, 350.00)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_project_payment_paid
    AFTER UPDATE ON public.beta_projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_project_payment_paid();

-- Snapshot generation helper
CREATE OR REPLACE FUNCTION public.generate_monthly_net_worth_snapshot()
RETURNS VOID AS $$
DECLARE
    v_total_assets INT8 := 0;
    v_total_liabilities INT8 := 0;
    v_net_worth INT8 := 0;
BEGIN
    -- Assets = sum of all transaction amounts in asset accounts (debits > credits)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_assets
    FROM public.transaction_entries e
    JOIN public.accounts a ON e.account_id = a.id
    WHERE a.type = 'asset';

    -- Liabilities = absolute sum of transaction entries in liability accounts (credits > debits)
    SELECT COALESCE(ABS(SUM(amount)), 0) INTO v_total_liabilities
    FROM public.transaction_entries e
    JOIN public.accounts a ON e.account_id = a.id
    WHERE a.type = 'liability';

    v_net_worth := v_total_assets - v_total_liabilities;

    INSERT INTO public.net_worth_snapshots (snapshot_date, total_assets, total_liabilities, net_worth)
    VALUES (CURRENT_DATE, v_total_assets, v_total_liabilities, v_net_worth)
    ON CONFLICT (snapshot_date) 
    DO UPDATE SET 
        total_assets = EXCLUDED.total_assets,
        total_liabilities = EXCLUDED.total_liabilities,
        net_worth = EXCLUDED.net_worth;
END;
$$ LANGUAGE plpgsql;


-- ── 5. ROW LEVEL SECURITY (RLS) POLICIES ──

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_incidents ENABLE ROW LEVEL SECURITY;

-- SELECT policies allowing read access to authenticated and anonymous roles
CREATE POLICY allow_read_accounts ON public.accounts FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_categories ON public.categories FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_transactions ON public.transactions FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_transaction_entries ON public.transaction_entries FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_investments ON public.investments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_snapshots ON public.net_worth_snapshots FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_education ON public.education_content FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_goals ON public.financial_goals FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY allow_read_fin_incidents ON public.financial_incidents FOR SELECT TO authenticated, anon USING (true);

-- ALL policies allowing writes/mutations to authenticated admins (and service_role automatically)
CREATE POLICY admin_all_accounts ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_categories ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_transactions ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_transaction_entries ON public.transaction_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_investments ON public.investments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_snapshots ON public.net_worth_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_education ON public.education_content FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_goals ON public.financial_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY admin_all_fin_incidents ON public.financial_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);
