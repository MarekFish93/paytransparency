---
status: partial
phase: 01-ground-truth-and-governance
source: [01-VERIFICATION.md]
started: 2026-09-14T10:45:00Z
updated: 2026-09-14T10:45:00Z
---

## Current Test

number: 1
name: Art. 10(1) — reconcile two artefacts that disagree about whether the five-percent question is decided
expected: |
  One recorded position, stated identically in CONVENTIONS.md and AMBIGUITY-BASELINE.json,
  naming the human who accepted it. CONVENTIONS.md § denominator already decides it:
  "Reading now governing: MAGNITUDE", with Art10Flag.gapPct carrying the SIGNED value so
  direction is not lost. Both v08-negative-gap passes already emit
  art10Flags [{category:'Research', gapPct:-25, threshold:5}] — magnitude is in force in
  the executable spec Phase 6 will be built against. Only AMBIGUITY-BASELINE.json still
  calls it "an open convention question, not an accepted state".
awaiting: user response

## Tests

### 1. Art. 10(1) signed-vs-magnitude — reconcile the contradiction
expected: Accept the magnitude reading recorded in CONVENTIONS.md and correct AMBIGUITY-BASELINE.json to match, or choose signed and change CONVENTIONS.md plus both v08 vector files. Decides whether an employer owes a joint pay assessment when women out-earn men by 25%.
result: [pending]

### 2. Bad-PR drill evidence provenance
expected: Accept docs/BAD-PR-DRILL.md as the record, or re-run the drill publicly on MarekFish93/paytransparency. The verifier independently reconstructed cases 1, 2, 3 and 5 offline and each rejected as transcribed — the mechanism is proved; only "five real PRs went through CI" rests on the private archive.
result: pass
accepted: |
  Accepted as disclosed. The drill MECHANISM was independently reconstructed offline by the verifier for cases 1, 2, 3 and 5 against the committed tree, each rejecting exactly as transcribed. Only the claim 'five real PRs went through CI' rests on the private archive, and that limitation is stated in docs/BAD-PR-DRILL.md rather than implied away. WINDOWS entry stays OPEN.

### 3. Does Phase 1 discharge Phase 5's stated dependency?
expected: ROADMAP records Phase 5 as depending on "Phase 1 (verified Art. 6, 7 and 12(3) data for the launch countries)". 27 of 567 facts are verified, all transposition.status; 540 pending_verification. No launch country has a verified article_7.legal_basis, response_deadline or article_12_3. Either accept that Phase 1 owed the SCHEMA plus Directive fallback (its own SC2 permits pending), with promotion scheduled as maintainer work before Phase 5 — or rule Phase 1 incomplete until those promotions happen. D-06 reserves promotion to a human who has read the source.
result: [pending]

### 4. Launch-country freshness gate is proved but unexercisable
expected: Accept that the gate is proved by construction rather than by the dataset. The verifier synthesised a verified-but-stale PL response_deadline: freshnessGate returned 1 failure ("256 days ago, past the 90-day volatile window") and 0 once verified_at moved forward. It cannot fire on real data until a D-06 promotion happens.
result: pass
accepted: |
  Accepted. The gate is proved by construction: the verifier synthesised a verified-but-stale PL response_deadline and freshnessGate returned 1 failure ('256 days ago, past the 90-day volatile window'), then 0 once verified_at moved forward. It cannot be exercised by real data until a D-06 promotion happens, which is a consequence of D-06, not a defect. WINDOWS entry stays OPEN.

### 5. SC4 wording vs the rule that shipped
expected: Recorded acceptance of D-10, or a change. SC4 says "a build fails when ANY fact is older than its freshness window". Measured: at 2026-12-10 all 27 verified country facts warn — L8 reports 27 warnings, 0 errors, build does not fail. The only staleness path that fails a build is the Directive corpus gate (warns 2027-06-12, errors 2027-09-11).
result: pass
accepted: |
  Accepted. D-10 deliberately narrows SC4's 'any fact' to a hard-fail on launch-country legally-operative facts, with everything else degrading rather than darkening. REQUIREMENTS.md LEGAL-08 already carries the narrowed wording; this records the acceptance explicitly rather than leaving a verifier to absorb it.

### 6. REQUIREMENTS.md traceability is stale
expected: Move each ID to Complete or leave Pending with a stated reason. 10 of 13 still Pending. Genuinely Partial: LEGAL-06 (fields exist, no equality body named for any state), LEGAL-08 (data half done, UI degrade is Phase 3), LEGAL-02 (all 27 covered, every status value is "unknown" x15 or "no_measure_notified" x12).
result: pass
accepted: |
  Done in this session. LEGAL-01, LEGAL-03, LEGAL-04, LEGAL-10, ENG-01 and ENG-06 moved to
  Complete — each carries an explicit "or pending" / fallback clause its own wording, which the
  shipped mechanism satisfies. LEGAL-02, LEGAL-05, LEGAL-06 and LEGAL-08 recorded as PARTIAL
  with per-ID reasons, not as Complete: the machinery is proved but 540 of 567 country facts
  remain pending_verification because D-06 reserves promotion to a human who has read the
  source. Evidence gathered by reading the records, not the summaries: transposition.status is
  `unknown` x15 / `no_measure_notified` x12, and 0 of 27 states name an equality body.

### 7. Branch protection with enforce_admins=false
expected: Accept the single-maintainer rationale in WINDOWS #12, with a trigger to flip enforce_admins true when a second maintainer exists. Verified live: required checks [schema-and-lint, offline-suite, freshness-gate], require_code_owner_reviews=true, allow_force_pushes=false, allow_deletions=false, required_conversation_resolution=true.
result: pass
accepted: |
  Accepted with a trigger. Verified live on master: required checks [schema-and-lint, offline-suite, freshness-gate], require_code_owner_reviews=true, allow_force_pushes=false, allow_deletions=false, required_conversation_resolution=true. With a single maintainer, enforce_admins=true makes the repository unmergeable. Flip it the day a second maintainer exists. WINDOWS entry stays OPEN as the reminder.

## Summary

total: 7
passed: 5
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
