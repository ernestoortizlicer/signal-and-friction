-- ════════════════════════════════════════════════════════════
-- The 20260622000100_curriculum_injections.sql seed already ran against
-- the live database, so editing that file's text does not change what's
-- already stored — this migration corrects the live row directly.
-- ════════════════════════════════════════════════════════════
--
-- Debate 05.A referenced the old $2,800 DFY price (now $2,000, see
-- functions/api/leads/submit.ts) and asserted unconditional access to a
-- client's PostHog session recordings, which S&F does not have unless the
-- client explicitly grants it — the same class of fabricated data-access
-- claim being eliminated across the diagnostic pipeline and deliverables.

UPDATE public.curriculum_injections
SET
    challenger = 'ChatGPT, Claude, and Gemini can review a funnel and generate a friction hypothesis in minutes. Within 24 months, every B2B SaaS founder will have AI tools capable of producing a diagnostic document at zero marginal cost. High-ticket consulting fees are therefore on a structural decline curve. Why train practitioners to charge $2,000 for a deliverable that AI will soon produce for $0?',
    sf_position = 'This objection conflates output generation with clinical judgment. An AI tool can produce a document that resembles a friction hypothesis. It cannot run a live session recording audit against a specific client''s funnel unless the client grants that access, isolate a causal variable from a confounded dataset, apply the Isolation Gate Framework under time pressure, and deliver a signed intervention recommendation with a practitioner''s professional reputation behind it. The practitioner''s value is not the document — it is the signature on the document, and the discipline of stating what is measured, modeled, or still pending. Clients paying $2,000 are buying accountability, not text.',
    updated_at = now()
WHERE debate_code = '05.A';
