# Decision Log — Atomic Prospect Promotion

**DATE:** 2026-08-13

## QUESTION

What should own the `Prospect → Opportunity` transition when production already provisions one project from each new client, while the Prospecting UI also attempted to provision the same project?

## EVIDENCE

- Production has `trigger_client_created` on `public.clients`; its function creates one `beta_projects` row for each new client.
- `beta_projects.client_id` is unique.
- Prospecting previously created a client and then attempted another project write, producing two authorities for one side effect and a misleading failure path.
- Multi-request browser orchestration can leave partial state if one request succeeds and a later request fails.

## OPTIONS

1. Keep both paths and treat duplicate errors as harmless.
2. Make the browser the project-provisioning authority.
3. Keep database-trigger provisioning as the single project authority and expose one atomic, idempotent promotion command that locks the candidate, creates the client, verifies the provisioned project and marks the candidate promoted in the same transaction.

## DECISION

Choose option 3.

`public.promote_prospect_candidate(candidate_id, founder_contact, contact_email)` is the only Prospecting promotion command.

Required properties:
- concurrent clicks/retries for the same prospect are serialized;
- only scanned prospects can transition;
- an already-promoted prospect returns the existing client/project instead of duplicating them;
- `trigger_client_created` remains the one project-provisioning authority;
- absence of the provisioned project makes the transaction fail as a whole;
- the candidate becomes promoted only inside that same transaction;
- execution permission is explicit;
- the frontend requires both `client_id` and `project_id` before displaying success.

## CONFIDENCE

High on the transactional design and production schema assumptions already observed. Runtime smoke testing on preview is still unknown because that environment lacks the full Prospecting schema and the safety wrapper rejected the temporary validation harness. Migration execution therefore remains a deployment gate rather than being represented as already validated.

## COST

Small SQL surface plus one frontend call-site change. The benefit is elimination of partial state, duplicate provisioning and misleading operator warnings.

## REVERSIBLE?

Yes at the code-contract level. Returning to multi-request browser orchestration would be a deliberate regression and should not be done.

## REVISIT CONDITION

Revisit if client creation becomes a broader business command shared by multiple acquisition channels. At that point promotion should move behind one server-side application service while preserving the same transaction and idempotency contract.
