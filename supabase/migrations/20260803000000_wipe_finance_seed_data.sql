-- ════════════════════════════════════════════════════════════
-- MIGRATION: Wipe Finance seed/demo data, keep the real chart of accounts
-- Migration ID: 20260803000000_wipe_finance_seed_data
--
-- Confirmed via a live SELECT that every row in transactions,
-- transaction_entries, investments, and financial_goals is seed data
-- from 2026-06-18 — an initial balance adjustment, a payment tied to a
-- project UUID that no longer exists, a fake MacBook/VOO portfolio, and
-- a $1.25M runway goal. None of it was entered by Ernesto. The 9 rows in
-- `accounts` (Checking, Consulting Revenue, expense accounts, etc.) are
-- the real chart of accounts and are explicitly NOT touched here — they
-- stay so real income/expenses can be recorded against them going
-- forward.
--
-- transaction_entries is deleted explicitly before transactions rather
-- than relied on to cascade, so this is correct regardless of whether
-- the FK was defined with ON DELETE CASCADE.
-- ════════════════════════════════════════════════════════════

BEGIN;

DELETE FROM public.transaction_entries;
DELETE FROM public.transactions;
DELETE FROM public.investments;
DELETE FROM public.financial_goals;

-- Sanity check: accounts should be the only non-empty table below.
SELECT 'accounts' AS table_name, count(*) FROM public.accounts
UNION ALL SELECT 'transactions', count(*) FROM public.transactions
UNION ALL SELECT 'transaction_entries', count(*) FROM public.transaction_entries
UNION ALL SELECT 'investments', count(*) FROM public.investments
UNION ALL SELECT 'financial_goals', count(*) FROM public.financial_goals;

COMMIT;
