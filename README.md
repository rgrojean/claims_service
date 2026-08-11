# ClaimBridge — Claims Submission & Reconciliation Service

**Repo:** `claims-service` · **Owning team:** Revenue Cycle IT · **In production since:** 2018 (TypeScript rewrite 2021) · **Stack:** TypeScript / Node 18 / Postgres / SFTP batch

---

## What it is

ClaimBridge is the pipe between Riverbend Health's billing operation and the outside world of payers. It takes billable encounters from the revenue-cycle workqueue, enriches them with patient and coverage data, generates X12 837P claim files, and delivers them nightly to the clearinghouse over SFTP. On the return path it ingests 835 remittance files, matches payments back to submitted claims, and flags mismatches for the billing team's work queue.

It is not a user-facing product. Its "users" are the ~30 billing specialists who live in the exception queue it produces, and its real constituency is cash flow: about $1.4M in claims value moves through the nightly batch. When ClaimBridge misbehaves, nobody sees an error page — accounts receivable ages.

## History

ClaimBridge began in 2018 as a set of Node scripts wrapped around the clearinghouse's SFTP drop, written by a contractor during the previous clearinghouse migration. A 2021 rewrite moved it to TypeScript and Postgres and gave it a proper ingestion/reconciliation model, but the rewrite intentionally preserved the original claim-enrichment logic ("if it bills correctly, don't re-derive it"), so parts of the enrichment path are 2018 logic in 2021 syntax. Revenue Cycle IT is a small team (3 engineers) with deep EDI knowledge and a conservative change culture: claims that go out wrong come back as denials 30 days later, so the team's bias is to touch the enrichment path as rarely as possible.

## Architecture

```
workqueue (billable encounters)
        │
        ▼
  enrichment  ──► PIS v2 (per-patient fetch)
        │         coverage service (eligibility)
        ▼
  837P generator ──► batch/outbox ──► SFTP to clearinghouse (nightly 01:30)
        ▲
  835 ingester ◄── SFTP from clearinghouse (daily)
        │
        ▼
  reconciliation ──► exception queue (billing team)
```

Single service, batch-oriented. Nothing in ClaimBridge runs in a request/response path with a human waiting; everything is jobs. The nightly submission window (01:30) and the reconciliation run (06:00) are the two moments that matter.

## How ClaimBridge consumes the Patient Identity Service

During enrichment, ClaimBridge calls `GET /v2/patients/{patientId}` once per claim and reads more of the payload than any other consumer:

- `name` — split on the comma into last/first for the 837 `NM1` subscriber and patient segments (`NM1*IL*1*GARCIA*MARIA`). The split logic (`enrich/name.ts`) dates to 2018 and handles exactly one comma; suffixes and multi-part surnames are a known, quietly tolerated source of payer rejections.
- `dob`, `gender`, `address` — mapped into `DMG` and `N3/N4` segments.
- `ssn` — used two ways. First, a subset of payers — workers' compensation carriers and certain Medicaid crossover configurations — are configured with `subscriberIdSource: "ssn"` in `config/payers.yaml`, and for those claims the SSN is written into the subscriber identification segment because that is what the payer's companion guide demands. Second, the 835 reconciliation matcher uses SSN as a tiebreaker: when a remit comes back without a clean claim reference (it happens more than anyone would like), the matcher falls back to matching on member ID, then SSN, then name+DOB, in that order (`reconcile/matcher.ts`).

The PIS response is consumed as plain JSON — no generated client, no schema validation. The 2018 pattern was `const p = await fetchPatient(id)` followed by direct property access, and the 2021 rewrite kept it. Missing fields historically surfaced as `undefined` flowing into an 837 segment and a payer rejection three days later, which is why the enrichment step now has a handful of defensive `if (!p.x)` checks — added incident by incident, not systematically.

## Data storage

Postgres holds `claims`, `claim_lines`, `remits`, and `reconciliation_exceptions`. The `claims` table stores a snapshot of the enrichment output — including the subscriber identifiers as submitted, SSN included where used — because reconciliation and audit both need to know exactly what went out the door, not what identity data looks like today. Retention on submitted-claim snapshots is 7 years per billing compliance policy.

## Testing & CI

Moderate and uneven. The 837 generator has good tests (golden-file comparisons against known-correct claim files — the team's proudest asset). Enrichment has thin tests with hand-built patient objects. Reconciliation matching has tests for the happy path and two incident-derived regression tests. CI runs typecheck and tests on PR; there is no staging clearinghouse, so the true test of a change is the first nightly batch after deploy — which is exactly why the team is conservative.

## Operational notes

The nightly batch is the heartbeat: a missed 01:30 window means a day's claims slip, so the on-call runbook is organized around "the batch didn't go" and "the batch went but the clearinghouse rejected the file." Payer companion-guide changes arrive by email and become `payers.yaml` edits; the workers' comp SSN requirement was last re-confirmed during the 2024 clearinghouse re-credentialing. The team is aware of the enterprise data-minimization initiative and has an open architecture question in their backlog — "claims identity handling post-PIS-changes" — with no design attached to it yet.
