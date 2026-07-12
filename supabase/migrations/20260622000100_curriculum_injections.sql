-- ── CURRICULUM INJECTIONS — S&F CERTIFIED PRACTITIONER PROGRAM ──
-- Stores the 12 Socratic Debate Logs from CERTIFIED_CURRICULUM.md
-- in a queryable relational format for runtime retrieval and updates.

CREATE TABLE IF NOT EXISTS public.curriculum_injections (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id     TEXT         NOT NULL CHECK (module_id IN ('M01','M02','M03','M04','M05','M06')),
    debate_index  INT          NOT NULL CHECK (debate_index IN (1, 2)),
    debate_code   TEXT         NOT NULL UNIQUE,   -- e.g. '01.A', '05.B'
    challenger    TEXT         NOT NULL,
    sf_position   TEXT         NOT NULL,
    autopsy       TEXT         NOT NULL,
    corporate_entity_note TEXT,                   -- populated for M05 debates only
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (module_id, debate_index)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_injections_module
    ON public.curriculum_injections (module_id);

-- ── SEED: 12 DEBATES (M01–M06, 2 per module) ──

INSERT INTO public.curriculum_injections
    (module_id, debate_index, debate_code, challenger, sf_position, autopsy)
VALUES

-- ── MODULE 01 ──
('M01', 1, '01.A',
 'Every decade, the same human behavior patterns get a new academic wrapper — cognitive biases in the 1970s, behavioral economics in the 1990s, neuromarketing in the 2010s. This is intellectual rebranding, not new science. Why should a practitioner treat the Signal/Friction framework as anything other than the same pattern with a new label?',
 'The challenge is valid as a historical observation but fails as an operational critique. The practitioner''s value is not in the theoretical origin of the framework — it is in the diagnostic precision the framework enables on a per-engagement basis. A thermometer does not become less useful because Fahrenheit and Celsius both measure the same physical phenomenon. The Signal/Friction distinction is valuable precisely because it translates behavioral economic theory into a decision rule a non-academic client can act on within 72 hours. Whether the intellectual provenance is Kahneman, Thaler, or Cialdini is irrelevant to whether the friction point at Step 3 of a SaaS trial is costing the client $40,000 per month.',
 'The real risk is not intellectual rebranding — it is practitioner drift toward framework performance rather than diagnostic precision. A certified practitioner who uses S&F vocabulary without running the 5-Layer Audit has inverted the relationship. The framework exists to produce a specific document. The document exists to produce a client decision. If those outputs are absent, the framework is decoration.'),

('M01', 2, '01.B',
 'Real funnels are chaotic systems. Traffic source quality, device mix, seasonality, sales team performance, product release timing — all of these confound any attempt to identify a single causal friction point. The Isolation Gate Framework assumes a level of variable control that does not exist in production environments.',
 'Correct — and this is the precise reason why correlation-based audits using standard GA4 dashboards are clinically worthless. The S&F methodology does not claim to produce a randomized controlled trial. It claims to produce a defensible probability assignment: this variable, under these conditions, is the most likely causal contributor to this specific pattern of drop-off. That is a different epistemic claim than certainty. The Isolation Gate Index exists to surface the confidence level explicitly, not to manufacture certainty that does not exist. The practitioner delivers a graded hypothesis, not a guarantee. The client''s decision to act on that hypothesis is an informed risk allocation, not a blind bet.',
 'The deeper issue this debate reveals: most competitors sell certainty they cannot deliver. S&F sells precision within an honest epistemic framework. This is not a vulnerability — it is the primary trust architecture that enables zero-call client relationships. Clients who understand the confidence-interval model make better decisions and produce better case study data.'),

-- ── MODULE 02 ──
('M02', 1, '02.A',
 'PostHog, FullStory, and Hotjar democratize session data. Any founder can watch session recordings for a week and identify where users drop off. The diagnostic tools do most of the work. What exactly does a certified practitioner add that a $50/month SaaS subscription does not already provide?',
 'The tools produce data. The practitioner produces a decision. These are not the same output. A PostHog funnel showing 68% drop-off at Step 3 of an onboarding flow is a measurement. A Friction Hypothesis Document that identifies the specific cognitive load element responsible for that drop-off — with a confidence-graded intervention recommendation — is a clinical judgment. The tool cannot tell the client whether the drop-off is caused by a UX misalignment, a trust signal gap, a messaging mismatch, or a product-market fit problem at the feature level. The practitioner''s value is not data collection — it is diagnostic precision under time pressure.',
 'This debate reliably surfaces the commodity trap. Practitioners who position themselves as "PostHog experts" or "session recording analysts" are competing on tool familiarity, which AI and SaaS commoditize. The S&F certified practitioner positions as a diagnostic clinician who uses tools as instruments, not as the primary deliverable.'),

('M02', 2, '02.B',
 'Elite consulting firms charge premium fees for faster turnaround. McKinsey does not take 72 hours — they take 2 weeks for a full diagnostic. If speed is a premium signal, why anchor the S&F certification exam to 72 hours specifically?',
 'The 72-hour window is not a speed limit — it is a clinical constraint that eliminates scope inflation. In a zero-deadline environment, consultants add more data, more frameworks, more sections, and more caveats until the deliverable becomes a report rather than a decision instrument. The 72-hour window forces a discipline that produces a higher-quality output for the client: one finding, one intervention, one recommendation. The McKinsey 2-week engagement produces a 60-slide deck with 14 workstreams. The S&F 72-hour engagement produces a single lever to pull with a predicted outcome. The client can implement the S&F recommendation by Monday.',
 'The 72-hour constraint is a product design decision, not an operational limitation. It is the mechanism by which S&F enforces scope discipline at the certification level, ensuring that all licensed practitioners deliver the same clinical format. This consistency is what makes the S&F Certified™ badge a signal of quality rather than a participation trophy.'),

-- ── MODULE 03 ──
('M03', 1, '03.A',
 'If practitioners learn from 5 canonical cases, they will pattern-match every new client to one of those 5 archetypes and apply the pre-packaged solution. This produces diagnostic mimicry, not clinical reasoning. The case study library is a crutch that atrophies the practitioner''s independent judgment.',
 'Pattern recognition is not mimicry — it is the definition of expertise. A cardiologist who recognizes an ST-elevation MI pattern on an EKG and administers aspirin immediately is not being intellectually lazy. They are applying a validated pattern library to save a life. The alternative — treating every cardiac event as a unique philosophical problem — produces worse outcomes, not better ones. The S&F case library is not a solution template. It is a pattern vocabulary that enables the practitioner to ask better questions faster. The diagnostic reasoning still happens. The case library accelerates the early hypothesis phase, which is where most consultants waste billable hours.',
 'The real risk this debate surfaces is different from the stated one. The risk is not mimicry — it is premature pattern closure. A practitioner who matches a client to CS-03 (B2B checkout cognitive load) in the first hour and stops auditing has made an epistemological error. The case library is a starting hypothesis generator, not a diagnostic terminus.'),

('M03', 2, '03.B',
 '"This is just like CS-02" is a lazy analogy, not clinical pattern recognition. The difference between a master diagnostician and a mediocre consultant is precisely this: the master holds the pattern lightly and updates on new evidence. How does the S&F curriculum produce that discipline rather than reinforcing the lazy version?',
 'The Isolation Gate Index is the mechanism. Every hypothesis generated by pattern recognition must pass through the IGI before entering the deliverable. The IGI requires the practitioner to specify the evidence base for the pattern match, the alternative explanations considered and rejected, and the confidence level assigned to the final hypothesis. A pattern recognition claim that cannot survive the IGI is not a diagnosis — it is an anecdote. The curriculum teaches IGI application explicitly in Module 02 and reinforces it in Module 03''s annotated autopsy format, where students must document their rejected hypotheses alongside their accepted ones.',
 'This debate reveals the most important habit a certified practitioner must develop: the discipline of the null hypothesis. Before committing to a friction diagnosis, the practitioner must explicitly state what would falsify it. This habit does not emerge from the case studies themselves — it emerges from the annotation protocol that structures how the student engages with each case. The autopsy format is the curriculum''s primary mechanism for producing this discipline.'),

-- ── MODULE 04 ──
('M04', 1, '04.A',
 'A lawyer passes a multi-day bar exam. A doctor completes a multi-year residency. You are certifying practitioners with a single 72-hour exercise. The certification window is insufficient to assess competency across the full range of client situations a practitioner will encounter.',
 'The comparison to bar exams and medical residencies inverts the scope of what is being certified. S&F certification licenses one methodology — not a full professional domain. A practitioner certified in the Signal & Friction Method™ is licensed to deliver one type of diagnostic using one protocol. The 72-hour exam tests precisely that capability: can this person produce a clinical-quality S&F deliverable under time pressure? If yes, they are certified. The certification does not claim to validate general consulting competency, business strategy expertise, or product management judgment. Scope precision is not a limitation — it is the architecture of the certification''s credibility.',
 'The deeper issue is what makes a certification signal valuable. A certification that claims to validate everything validates nothing — it becomes a diploma, not a license. The S&F exam is narrowly scoped by design. The practitioner who passes it can demonstrate one specific capability at a professional standard. That narrow scope is what makes the badge defensible in a client conversation.'),

('M04', 2, '04.B',
 'If past case studies are part of the curriculum, a candidate could reconstruct a previous diagnostic output and submit it as their own work. The exam is not proctored. Academic integrity cannot be enforced asynchronously.',
 'Each exam brief is generated from a unique anonymized client dataset with a randomized friction pattern combination. The brief includes specific funnel metrics, session volume data, and stakeholder language that cannot be matched to any published case study. Additionally, the deliverable format requires traceable citations to the specific data points in the brief — a submission that does not directly reference the provided dataset fails on the Evidence Rigor dimension with a score of 0 out of 20. That alone produces a failing grade below the remediation threshold.',
 'This debate surfaces a more fundamental design principle: the exam''s integrity does not depend on preventing cheating — it depends on making the exam non-fakeable. A practitioner who submits copied work produces a deliverable that cannot be traced to the provided data, which fails a specific grading criterion. The system is self-enforcing.'),

-- ── MODULE 05 ──
('M05', 1, '05.A',
 'ChatGPT, Claude, and Gemini can review a funnel and generate a friction hypothesis in minutes. Within 24 months, every B2B SaaS founder will have AI tools capable of producing a diagnostic document at zero marginal cost. High-ticket consulting fees are therefore on a structural decline curve. Why train practitioners to charge $2,000 for a deliverable that AI will soon produce for $0?',
 'This objection conflates output generation with clinical judgment. An AI tool can produce a document that resembles a friction hypothesis. It cannot run a live session recording audit against a specific client''s funnel unless the client grants that access, isolate a causal variable from a confounded dataset, apply the Isolation Gate Framework under time pressure, and deliver a signed intervention recommendation with a practitioner''s professional reputation behind it. The practitioner''s value is not the document — it is the signature on the document, and the discipline of stating what is measured, modeled, or still pending. Clients paying $2,000 are buying accountability, not text.',
 'This debate is the most common objection a certified practitioner will face in the first 12 months post-certification. The correct response is not to argue about AI capability — it is to demonstrate the gap between AI-generated output and clinical-quality diagnostic output in a real client context. The practitioner who can show a prospect the difference between what GPT-4 produced and what the S&F diagnostic produced has already won the conversation.'),

('M05', 2, '05.B',
 'Is a US legal entity just tax theater for international clients? The Wyoming LLC recommendation is a common internet marketing trope packaged as sophisticated tax advice.',
 'Incorrect. It is a strict operational isolation architecture. While a Wyoming LLC is the standard recommendation for multi-member asset protection structures, for solo-practitioner digital distribution a New Mexico LLC represents the peak of financial velocity and lean carrying costs: it delivers matching structural anonymity and liability shields at a $50 initialization floor with absolute zero state-level annual reporting fees or recurring franchise taxes. Federal compliance (FinCEN BOI / IRS Form 5472) remains the identical single-point ledger. The curriculum presents this as a starting framework — not as legal advice — and requires validation by a qualified tax attorney in the practitioner''s jurisdiction before implementation.',
 'The deeper issue: the curriculum must be precise about the difference between education and advice. Module 05 teaches the practitioner to ask the right questions and understand the structural options — not to self-administer legal or tax strategy. A practitioner who understands the NM LLC model can have a productive 30-minute call with a tax attorney. Without that fluency, the same call costs 4x more and produces worse decisions.'),

-- ── MODULE 06 ──
('M06', 1, '06.A',
 'The recertification requirement ensures a recurring revenue stream for S&F, not practitioner quality. If the initial certification is rigorous enough, a practitioner who passed at 75+ does not need to be re-evaluated annually. The recertification is a toll, not a standard.',
 'Methodology without update atrophies. A practitioner certified in 2024 on a framework designed for 2024-era funnel patterns will be operating on a stale protocol by 2026 — specifically because AI tool proliferation, platform algorithm changes, and evolving B2B buyer behavior create new friction archetypes at a rate that makes static certification epistemologically dishonest. The annual recertification requirement is the mechanism by which S&F guarantees that all active licenses reflect current diagnostic standards.',
 'This debate is also a pricing objection in disguise. The practitioner who challenges recertification on principle is often asking whether the quarterly Signal Drops deliver enough new value to justify the renewal cost. The correct response is to demonstrate the delta between a 2-year-old S&F protocol and a current-quarter protocol on a real diagnostic. If that delta is zero, the recertification is theater. If it is material — which the quarterly case studies and friction pattern updates are designed to ensure — the recertification is infrastructure.'),

('M06', 2, '06.B',
 'When 10 practitioners use the S&F framework, quality is maintainable. When 500 practitioners use it, interpretation drift and localization errors degrade the standard until "S&F Certified™" means something different to every practitioner. Methodology licensing at scale has a well-documented quality decay problem. What prevents it here?',
 'Three mechanisms enforce standard fidelity at scale. First, the 100-point grading rubric is applied to every exam and recertification submission by the same grading protocol — it is not peer-graded or self-assessed. Second, the annual recertification submission must include a real client diagnostic graded against the current rubric, not the rubric at initial certification, ensuring drift is detected at the individual level before it compounds. Third, the Diagnostic Accuracy Drift metric is tracked at cohort level — if a cohort shows systematic drift on a specific rubric dimension, the curriculum for that dimension is updated in the next quarterly Signal Drop.',
 'Methodology dilution is a real risk, and the primary defense against it is not policing practitioners — it is making the rubric the anchor, not the practitioner''s interpretation of the framework. As long as every deliverable is graded against the same document, interpretation drift is measurable. The practitioner who is drifting receives a lower recertification score and targeted feedback on the specific dimension where the drift occurred.')

ON CONFLICT (module_id, debate_index) DO UPDATE SET
    debate_code   = EXCLUDED.debate_code,
    challenger    = EXCLUDED.challenger,
    sf_position   = EXCLUDED.sf_position,
    autopsy       = EXCLUDED.autopsy,
    updated_at    = now();

-- Update M05.B with the explicit NM LLC corporate entity note
UPDATE public.curriculum_injections
SET corporate_entity_note = 'New Mexico LLC: $50 initialization floor. Zero state-level annual reporting fees. Zero recurring franchise taxes. Structural anonymity equal to Wyoming. Liability isolation identical. Federal single-point ledger: FinCEN BOI + IRS Form 5472. Optimal for solo-practitioner digital-distribution consulting at sub-$200K annual revenue. Not legal advice — validate with qualified tax counsel in practitioner''s jurisdiction.'
WHERE debate_code = '05.B';

-- Enable RLS (admin-only read; no public exposure of IP)
ALTER TABLE public.curriculum_injections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin service role full access"
    ON public.curriculum_injections
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
