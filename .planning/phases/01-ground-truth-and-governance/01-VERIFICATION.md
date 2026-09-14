---
phase: 01-ground-truth-and-governance
verified: 2026-09-14T10:30:43Z
uat_resolved: 2026-09-14T10:50:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".github/CODEOWNERS"
  - ".github/workflows/cellar-reachability.yml"
  - ".github/workflows/legal-data.yml"
  - ".github/workflows/nightly.yml"
  - ".planning/REQUIREMENTS.md"
  - ".planning/phases/01-ground-truth-and-governance/01-01-SUMMARY.md"
  - ".planning/phases/01-ground-truth-and-governance/01-01-cellar-spine-PLAN.md"
  - ".planning/phases/01-ground-truth-and-governance/01-02-SUMMARY.md"
  - ".planning/phases/01-ground-truth-and-governance/01-02-verifier-strategies-PLAN.md"
  - ".planning/phases/01-ground-truth-and-governance/01-03-SUMMARY.md"
  - ".planning/phases/01-ground-truth-and-governance/01-03-directive-corpus-PLAN.md"
  - ".planning/phases/01-ground-truth-and-governance/01-04-SUMMARY.md"
  - ".planning/phases/01-ground-truth-and-governance/01-04-country-schema-and-seeding-PLAN.md"
  - ".planning/phases/01-ground-truth-and-governance/01-05-SUMMARY.md"
  - ".planning/phases/01-ground-truth-and-governance/01-05-governance-gates-PLAN.md"
  - ".planning/phases/01-ground-truth-and-governance/01-06-SUMMARY.md"
  - ".planning/phases/01-ground-truth-and-governance/01-06-frozen-contracts-PLAN.md"
  - ".planning/phases/01-ground-truth-and-governance/01-07-SUMMARY.md"
  - ".planning/phases/01-ground-truth-and-governance/01-07-vector-rederivation-PLAN.md"
  - "docs/BAD-PR-DRILL.md"
  - "docs/POLISH-UPL-GATE.md"
  - "docs/share-url-contract.md"
  - "packages/country-data/data/_allowlist.json"
  - "packages/country-data/data/_directive.json"
  - "packages/country-data/scripts/fetch-directive.ts"
  - "packages/country-data/scripts/seed-from-nim.ts"
  - "packages/country-data/scripts/validate.ts"
  - "packages/country-data/scripts/verify-sources.ts"
  - "packages/country-data/src/allowlist.ts"
  - "packages/country-data/src/country.ts"
  - "packages/country-data/src/extract.ts"
  - "packages/country-data/src/freshness.ts"
  - "packages/country-data/src/lint.ts"
  - "packages/country-data/src/resolve.ts"
  - "packages/country-data/src/schema.ts"
  - "packages/country-data/src/source-strategy.ts"
  - "packages/country-data/src/verifier.ts"
  - "packages/directive-engine/AMBIGUITY-BASELINE.json"
  - "packages/directive-engine/docs/CONVENTIONS.md"
  - "packages/directive-engine/scripts/rederive.ts"
  - "packages/directive-engine/src/share-url-contract.ts"
  - "packages/directive-engine/src/types.ts"
covered_digest: "v1:sha256:dc48bdc98f64f76bb9d342e43ca3432c6cc400dbcdd52f31d8bca1e36a4af8f8"
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "A stale fact degrades in the UI to 'last confirmed on {date} — status may have changed' (LEGAL-08, UI half)"
    addressed_in: "Phase 3"
    evidence: "Phase 3 success criterion 1: '…each showing its source and verified date — with \"draft\" wherever the source says draft and \"pending verification\" wherever nothing has been checked, never a guessed value'"
  - truth: "L7 letter coverage has never rejected anything — it reports SKIP because packages/letters does not exist"
    addressed_in: "Phase 5"
    evidence: "Phase 5 success criterion 2: '…every template snapshot-tested per locale so a data change shows up as a diff of the worker-visible letter'"
  - truth: "Share-URL bucket population estimates are MODELLED, not Eurostat-sourced (WINDOWS #5)"
    addressed_in: "Phase 4"
    evidence: "Phase 4 success criterion 3: 'the URL that gets transmitted carries only coarse bucketed values' — the ledger entry itself scopes the Eurostat grounding to 'before the card ships in Phase 4'"
  - truth: "The single-number reduction on metrics (e), (f) and (g) forced by the frozen MetricValue (WINDOWS #6)"
    addressed_in: "Phase 6"
    evidence: "Phase 6 success criterion 1: 'reproduce every golden vector'; the ledger entry states 'Phase 6 must confirm it or amend the contract through the recorded amendment path'"
  - truth: "The @paytransparency npm scope is unproven against an unauthenticated registry (WINDOWS #8)"
    addressed_in: "Phase 6"
    evidence: "Phase 6 success criterion 1: 'A compensation analyst can install directive-engine from npm under MIT'"
behavior_unverified_items: []
coincidental_reliance_items: []
human_verification:
  - test: "Decide the Art. 10(1) five-percent question, then reconcile the two artefacts that currently disagree about whether it is decided. packages/directive-engine/docs/CONVENTIONS.md § denominator says 'Reading now governing: MAGNITUDE'. packages/directive-engine/AMBIGUITY-BASELINE.json and 01-REVIEW-FIX.md both say it is 'carried forward as an open convention question, not as an accepted state'."
    expected: "One recorded position, stated identically in both files, naming the human who accepted it. Both golden-vector passes for v08-negative-gap currently emit art10Flags [{category:'Research', gapPct:-25, threshold:5}], i.e. the MAGNITUDE reading is already in force in the executable specification Phase 6 will be built against."
    why_human: "Whether a difference of 25% favouring women engages Art. 10(1) decides whether an employer owes a joint pay assessment. That is a legal judgement, not an assertion. It is also the one recorded ambiguity where the two readings change an OUTCOME rather than a number."
  - test: "Decide whether the bad-PR drill evidence is sufficient given that the five pull requests and their CI runs live in the private archive MarekFish93/paytransparency-archive and cannot be checked from the public repository (WINDOWS #11)."
    expected: "Either accept the transcription in docs/BAD-PR-DRILL.md as the record, or re-run the drill publicly on MarekFish93/paytransparency so the run links are fetchable. Note that this verifier independently reconstructed drill cases 1, 2, 3 and 5 offline against the committed tree and each rejected exactly as transcribed — so the MECHANISM is proved here; only the 'five real PRs went through CI' claim rests on trust."
    why_human: "A judgement about what standard of evidence a public trust artefact should meet. The repository is already public, so the decision is whether to close the hole or accept it as disclosed."
  - test: "Decide whether Phase 1 discharges Phase 5's stated dependency. The ROADMAP records Phase 5 as depending on 'Phase 1 (verified Art. 6, 7 and 12(3) data for the launch countries)'. Across all 27 country files, 27 of 567 facts are verified — every one of them transposition.status — and 540 are pending_verification. No launch country (PL, SK, IT, LT, MT) has a verified article_7.legal_basis, article_7.response_deadline or article_12_3."
    expected: "Either a recorded acceptance that Phase 1's contract was the SCHEMA plus the Directive fallback (which Phase 1 SC2 permits with 'or rendering as pending verification'), with launch-country promotion scheduled as maintainer work before Phase 5; or a decision that Phase 1 is not complete until those promotions happen. D-06 reserves promotion to a human who has read the source, so no agent can close this."
    why_human: "The roadmap dependency line and Phase 1's own success criterion say different things about what Phase 1 owed. Only the maintainer can decide which governs, and only the maintainer can perform the promotions."
  - test: "Confirm the launch-country freshness hard gate is acceptable as an unexercised gate (WINDOWS #7). It cannot fire on the current dataset at ANY future date, because LEGALLY_OPERATIVE_FIELDS (article_7.legal_basis, article_7.response_deadline, article_12_3) are pending_verification in all 27 records."
    expected: "Acceptance that the gate is proved by construction, not by the dataset. This verifier proved it fires by synthesising a verified-but-stale PL article_7.response_deadline: freshnessGate returned 1 failure naming '256 days ago, past the 90-day volatile window', and returned 0 once verified_at was moved forward. It will not be exercised by real data until a D-06 promotion happens."
    why_human: "Whether an unexercised-but-proved gate is acceptable at this point in the project is a risk judgement."
  - test: "Decide whether ROADMAP Phase 1 success criterion 4 — 'a build fails when ANY fact is older than its freshness window' — is satisfied by the narrower rule that actually shipped, and record the acceptance."
    expected: "Recorded acceptance of decision D-10 (already reflected in the REQUIREMENTS.md rewording of LEGAL-08), or a change. Measured on the committed tree: at 2026-12-10 all 27 verified country facts pass their 90-day volatile window and L8 reports 27 WARNINGS and 0 errors — the build does not fail. The only staleness path that currently fails a build is the Directive corpus gate, which flips 66 entries to error on 2027-09-11 (warns from 2027-06-12)."
    why_human: "A deliberate, documented narrowing of a roadmap success criterion. It should be accepted explicitly rather than absorbed by a verifier."
  - test: "Update .planning/REQUIREMENTS.md. Ten of this phase's thirteen requirement IDs are still '- [ ]' in the checklist and 'Pending' in the traceability table: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05, LEGAL-06, LEGAL-08, LEGAL-10, ENG-01, ENG-06. Only LEGAL-07, LEGAL-09 and GAP-06 are marked Complete."
    expected: "Each ID moved to Complete, or left Pending with a stated reason. Several are genuinely Partial and should say so: LEGAL-06 (fields exist; no equality body is named for any state), LEGAL-08 (data half done; UI degrade is Phase 3), LEGAL-02 (all 27 covered; every status value is 'unknown' ×15 or 'no_measure_notified' ×12, none yet resolved to in_force/draft)."
    why_human: "Traceability is the accounting mechanism; a verifier should not silently mark requirements complete on the maintainer's behalf."
  - test: "Confirm branch protection is acceptable with enforce_admins=false (WINDOWS #12). Verified live on MarekFish93/paytransparency master: required checks [schema-and-lint, offline-suite, freshness-gate], require_code_owner_reviews=true, 1 approving review, allow_force_pushes=false, allow_deletions=false, required_conversation_resolution=true, enforce_admins=false."
    expected: "Accept the single-maintainer rationale recorded in WINDOWS #12, with a trigger to flip enforce_admins to true when a second maintainer exists."
    why_human: "A governance trade-off between an enforceable floor and an unmergeable repository."
---

# Phase 1: Ground Truth and Governance — Verification Report

**Phase Goal:** Every fact the product will assert is verified against a primary source, and every decision that is expensive to change later is recorded as data rather than left as a default
**Verified:** 2026-09-14T10:30:43Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Verification method

Every claim below was checked by executing code against the committed tree, by reconstructing
the drill defects independently, or by reading live GitHub Actions logs. Nothing in this report
is taken from a SUMMARY. Where a SUMMARY claim and the tree disagreed, the tree is recorded.

The working tree was clean at the start and is clean at the end; the one file mutated during
testing (`AMBIGUITY-BASELINE.json`, to prove the ratchet) was restored and `git status` confirms
no diff.

## Goal Achievement

### Observable Truths — ROADMAP Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Articles 3, 6, 7, 9, 10, 12 quoted from EUR-Lex primary text and stored alongside the data | ✓ VERIFIED | `_directive.json` holds 66 entries = 6 articles × 11 languages (`ces dan deu eng ita lit mlt nld pol slk swe`), 308 tagged paragraphs, **zero** short-or-empty quotations. Every source is a pinned Cellar expression URI (`publications.europa.eu/resource/cellar/5bbb9daf-…0006.03/DOC_1`) with ETag `"Con-20231213063525000"`, `scope.id`, `expected_subtitle` and anchor. No reader proxy or vendor host appears. |
| 2 | All 27 member-state files, every listed field carrying a source URL + `verified_at` or rendering "pending verification" | ✓ VERIFIED | 27 files AT…SK (GR not EL). 567 facts: 27 verified, 540 `pending_verification`. `resolve()` returns a determinate provenance and a non-empty i18n label for every listed field — `directive_fallback` for the two-month backstop and Art. 7(2), `unknown` for Art. 12(3) / equality body / anti-retaliation, `national` for transposition status. See the scope note below. |
| 3 | A wrong-statute PR is rejected by schema validation, a per-country allowlist, and a verifier failing an empty 200 as loudly as a 404 — drilled before going public | ✓ VERIFIED | All four mechanisms exercised by this verifier, offline, against the committed tree. `verifySource` returns `data_defect` for **both** a 200/zero-byte body (`empty_body`) and a 404 (`client_error`). Drill cases 1, 2, 3, 5 reconstructed and each rejected exactly as transcribed. Live branch protection requires all three named checks plus code-owner review. Drill-evidence provenance routed to human verification. |
| 4 | A build fails when a fact is past its freshness window, and the window varies by volatility | ✓ VERIFIED | `TTL_DAYS = {stable:365, volatile:90, pending:30, statistical:null}` — the window varies. `corpusFreshness` moves 66 entries from 0 findings → 66 warnings (2027-06-12) → 66 errors (2027-09-11), and the CI step sets exit 1. `freshnessGate` fires on a synthesised stale launch-country operative fact and clears when the date moves forward. Scope narrowing (D-10) recorded below and routed to human acceptance. |
| 5 | Golden vectors and a frozen `EngineReport` exist as reviewed data with no engine code; conventions and the share-URL contract are recorded decisions | ✓ VERIFIED | 10 vector directories × 4 files; 6–11 rows each (hand-computable); 7 metric positions each; 0 vectors share a `working` section. `types.ts` is types + constants only — no Art. 9 arithmetic anywhere in `packages/directive-engine/src`. 11 `CONVENTION_KEYS`, 11 matching `## ` headings, 13 `Default origin:` lines. `pnpm rederive:vectors`: 10/10 agree, 153 citation keys resolved against 66 corpus entries. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/country-data/src/schema.ts` | Frozen `Fact`/`Source` primitives | ✓ VERIFIED | 446 lines. Rejects `verified` + empty sources, and `pending_verification` + non-null value (both tested live). |
| `packages/country-data/src/verifier.ts` | Fail-loud verifier, ordered assertions | ✓ VERIFIED | 1035 lines. Dispatch order proved: 304 before body check → 4xx/403-interstitial → non-200 → empty → cap → floor → strategy. |
| `packages/country-data/src/source-strategy.ts` | Per-strategy byte floors | ✓ VERIFIED | Cellar floor 100 000 B, html-anchor 20 000 B; a 31-byte shell disposes `below_byte_floor`. |
| `packages/country-data/src/allowlist.ts` + `data/_allowlist.json` | Pre-fetch per-country host guard | ✓ VERIFIED | `all: [publications.europa.eu, curia.europa.eu, ec.europa.eu]`, `byCountry` covers all 27. `eur-lex.europa.eu` absent — prohibition honoured. |
| `packages/country-data/src/freshness.ts` | Volatility TTLs + gates | ✓ VERIFIED | 526 lines; both gates fire under time travel / synthesis. |
| `packages/country-data/src/lint.ts` | L1–L9 + BUMP | ✓ VERIFIED | 1090 lines. L4, L5, L8, L9 each produced the expected finding on a crafted defect. L6 nightly branch reachable (see below). |
| `packages/country-data/src/country.ts` | Country schema | ✓ VERIFIED | 680 lines. Art. 12(3) as a condition object — a bare boolean fails parse. |
| `packages/country-data/src/resolve.ts` | Precedence + Directive fallback | ✓ VERIFIED | `DIRECTIVE_FALLBACK_KEYS` resolves to real corpus quotations; `unknown` never renders blank. |
| `packages/country-data/scripts/validate.ts` | `validate:country-data` entry | ✓ VERIFIED | `--profile` now selects (was hardcoded); `--exercised` supplies L6 evidence; `--base` arms BUMP. |
| `packages/country-data/scripts/verify-sources.ts` | Per-source dispatch | ✓ VERIFIED | 641 lines; `--bodies`, `--require-exercised`, `--report` all wired and exercised in a real nightly run. |
| `packages/country-data/data/_directive.json` | 66-entry corpus | ✓ VERIFIED | See truth 1. |
| 27 × `packages/country-data/data/XX.json` | One per member state | ✓ VERIFIED | L1 ok; filename ↔ record code asserted. |
| `packages/country-data/proposed/*.json` | Agent drafts awaiting promotion | ✓ VERIFIED | IT, LT, MT, PL, SK + README. L9 rejects a verified fact planted in `proposed/`. |
| `packages/directive-engine/src/types.ts` | Frozen `EngineReport`, types only | ✓ VERIFIED | 380 lines, no arithmetic. `CONVENTION_KEYS_ARE_EXHAUSTIVE` is a compile-time exhaustiveness proof. |
| `packages/directive-engine/src/share-url-contract.ts` | Closed transmitted set | ✓ VERIFIED | 240 lines; behavioural test below. |
| `packages/directive-engine/docs/CONVENTIONS.md` | One decision per key | ✓ VERIFIED | 11 `## ` headings matching `CONVENTION_KEYS` order. |
| `packages/directive-engine/vectors/v01…v10` | Ten pathological vectors | ✓ VERIFIED | All ten present with `input`/`conventions`/`expected`/`rederived`. |
| `packages/directive-engine/scripts/rederive.ts` | Comparison tool, computes nothing | ✓ VERIFIED | 453 lines; reads only the two authored answer files. |
| `packages/directive-engine/AMBIGUITY-BASELINE.json` | Ambiguity ratchet | ✓ VERIFIED | Proved to exit 1 on a rise (see spot-checks). |
| `.github/workflows/legal-data.yml` | PR profile, 3 named jobs | ✓ VERIFIED | All three are required checks on `master`. |
| `.github/workflows/nightly.yml` | Live profile | ✓ VERIFIED | Ran successfully 2026-09-14T10:23:57Z; every conditional step executed. |
| `.github/workflows/cellar-reachability.yml` | D-01 conditional probe | ✓ VERIFIED | CI log: `PASS: Cellar answers 200 from a GitHub Actions runner with the art_7 subtree present.` |
| `.github/CODEOWNERS` | Required maintainer review | ✓ VERIFIED | Covers data, proposed, letters (pre-declared), workflows and each gate source file. |
| `docs/BAD-PR-DRILL.md` | Five drill cases | ⚠️ PARTIAL | Substantive and unusually candid; evidence links are in a private archive. Routed to human verification. |
| `docs/POLISH-UPL-GATE.md` | Named dated blocking gate | ✓ VERIFIED | 152 lines; blocks the Polish letter (Phase 5), review-by 2026-12-01, confidence stated LOW per claim. |
| `docs/share-url-contract.md` | Versioned share-URL spec | ✓ VERIFIED | 252 lines. |
| `CHANGELOG-legal.md`, `REPORTING-LEGAL-ERRORS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md` | Governance surface | ✓ VERIFIED | 93 / 114 / 160 / 56 / 149 lines — all substantive, none a stub. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `scripts/fetch-directive.ts` | `data/_directive.json` | pinned URI + ETag into the Fact envelope | ✓ WIRED | CI-probed URI/ETag/bytes (`193564`) match the stored source byte for byte. |
| `src/verifier.ts` | `src/allowlist.ts` | `assertFetchable` before any request | ✓ WIRED | Lexology source rejected pre-fetch with `host_not_allowlisted`. |
| `src/verifier.ts` | `src/source-strategy.ts` | dispatch through `STRATEGY_TABLE` | ✓ WIRED | Byte floor per strategy observed in the disposition message. |
| `src/lint.ts` L5 | `src/allowlist.ts` | one allowlist implementation | ✓ WIRED | L5 message is the allowlist's own reason string. |
| `src/lint.ts` L8 | `src/freshness.ts` | `freshnessGate` in one place | ✓ WIRED | L8 hard/soft split matches `freshnessGate` + `GATED_FIELDS`. |
| `scripts/validate.ts` | `data/_directive.json` | referential pass over fallback keys | ✓ WIRED | "Referential pass: ok — every Directive fallback citation key resolves". |
| `.github/workflows/nightly.yml` | `scripts/verify-sources.ts` | `--bodies` hand-off | ✓ WIRED | **Previously dead.** `suppliedBody` looks for `cellar-<iso3>.xhtml`; the probe writes `cellar-${LANG}.xhtml` from the `@([a-z]{3})` citation-key suffix. Names match; the real run exercised 66 sources. |
| `.github/workflows/nightly.yml` | `scripts/validate.ts --profile nightly` | L6's only reachable caller | ✓ WIRED | Real CI log: `L6 WARN … (0 error, 32 warning) (66 of 106 sources checked)`. |
| `test/rederivation.test.ts` | `data/_directive.json` | every `definitionCite` resolved | ✓ WIRED | `153 citation key(s) resolved against 66 corpus entries`. |
| `docs/BAD-PR-DRILL.md` | `.github/workflows/legal-data.yml` | each case names its rejecter | ✓ WIRED | Each named rejecter reproduced independently. |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| `data/_directive.json` | `value.raw_text`, `value.paragraphs` | Cellar XHTML via `extract.ts` | Yes — 308 paragraphs, none empty | ✓ FLOWING |
| `resolve()` | `ResolvedFact.value` | country record → corpus by citation key | Yes — Art. 7(4) EN and PL quotations returned verbatim | ✓ FLOWING |
| `buildShareUrl()` | query string | `roundGapPct` + `bucketLifetime` | Yes — derived values only | ✓ FLOWING |
| `L6_linkLiveness` | `ExercisedEvidence` | `verify:sources --report` | Yes — 66/106 in the real nightly run | ✓ FLOWING |
| `freshnessGate` | failures | record `verified_at` × `TTL_DAYS` | Mechanism yes; **no current record can trigger it** | ⚠️ STATIC (see human item 4) |
| 27 country records | legal_basis / deadline / Art. 12(3) / equality body / anti-retaliation | maintainer promotion (D-06) | **No** — 540/567 facts are `pending_verification` | ⚠️ STATIC by design (see human item 3) |

### Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| Full test suite | `pnpm test` | 14 files, 411 tests passed, 1.13 s | ✓ PASS |
| Schema + lint + referential pass | `pnpm validate:country-data` | `PASSED — 0 error, 0 warning, 0 schema issue`; L6/L7/BUMP report SKIP with stated reasons | ✓ PASS |
| Offline source dispatch | `pnpm verify:sources` | `PASSED — 0 data defect, 0 promised-but-unexercised, 86 not exercised` | ✓ PASS |
| Vector re-derivation | `pnpm rederive:vectors` | `10 of 10 vectors agree; 45 recorded ambiguities (baseline 45)`; `153 citation key(s) resolved against 66 corpus entries` | ✓ PASS |
| **Empty 200 vs 404** | `verifySource` on six crafted responses | 200+0 B → `data_defect/empty_body`; 404 → `data_defect/client_error`; 202+0 B → `data_defect/anti_automation_gate`; 31 B shell → `data_defect/below_byte_floor`; 304+0 B → `revalidated`; 500 → `source_unreachable`. **Empty 200 and 404 share the same disposition.** | ✓ PASS |
| Drill case 1 — fabricated statute | crafted HR record through `lintAll` | L4, 2 findings, messages match the drill transcript | ✓ PASS |
| Drill case 2 — non-allowlisted host | Lexology (`kind: law_firm`, valid) on SI | L5, 1 error, `host_not_allowlisted` | ✓ PASS |
| Drill case 3 — accepted-but-empty | `fixtureFor` host registration | `eur-lex.europa.eu` maps to the captured 202/0-byte envelope regardless of allowlist state | ✓ PASS |
| Drill case 5 — right source, wrong provision | recital decoy fixture (194 355 B) scoped `art_7` | `data_defect/anchor_absent`; the authentic anchor in the same document returns `verified` | ✓ PASS |
| L9 — proposed cannot be verified | verified `article_7.legal_basis` planted in `proposed/MT.json` | 1 finding naming the field and the promotion path | ✓ PASS |
| Schema invariants | three crafted mutations | bare-boolean Art. 12(3) → reject; verified + empty sources → reject; pending + non-null value → reject | ✓ PASS |
| Freshness — corpus | `corpusFreshness` at four dates | 0 / 66 warn (2027-06-12) / 66 error (2027-09-11) / 66 error | ✓ PASS |
| Freshness — launch hard gate | synthesised stale PL operative fact | 1 failure, "256 days ago, past the 90-day volatile window"; 0 once refreshed | ✓ PASS |
| Freshness — soft half | `lintAll` L8 at 2026-12-10 | 27 warnings, **0 errors** — build continues | ✓ PASS (documents the narrowing) |
| Ambiguity ratchet | baseline lowered to 44 | `RECORDED AMBIGUITIES ROSE from 44 to 45`, exit 1 | ✓ PASS |
| Share-URL privacy | `buildShareUrl` with salary 52000, country PL, birthYear in a base carrying its own query and fragment | `?v=1&gap=12&band=40k-75k&lang=…`; `transmittedKeysOf` = exactly `[v, gap, band, lang]`; no salary, no country in the query; pre-existing query and fragment discarded | ✓ PASS |
| Engine code ordering (ENG-01) | grep for metric arithmetic in `packages/directive-engine/src` | Only `Math.round`/`Math.floor` inside `share-url-contract.ts` (the deliberately-permitted rounding rule). No median, quartile, or gap computation. | ✓ PASS |

### CI Evidence (read from live GitHub Actions logs, not from SUMMARYs)

| Workflow | Run | Result | What it proves |
|---|---|---|---|
| `cellar-reachability` | 34832965697 (2026-09-14T10:23:54Z) | success, 8 s | D-01 discharged with **runner** evidence: `PASS: Cellar answers 200 from a GitHub Actions runner with the art_7 subtree present.` Resolved URI, ETag `"Con-20231213063525000"`, `body bytes: 193564` — all identical to what `_directive.json` stores. |
| `legal-data` | 34832965664 | success — `schema-and-lint` 10 s, `offline-suite` 13 s, `freshness-gate` 9 s | All three required checks green on the current tree; `rederive:vectors` runs inside `offline-suite`, so the ambiguity ratchet gates merges. |
| `nightly` | 34832970892 (workflow_dispatch, 2026-09-14T10:23:57Z) | success, 22 s + 11 s | **Every conditional step executed**, so the probe classified all 11 language expressions as `fresh`. `verify:sources --bodies .cache/cellar --require-exercised cellar` reported `106 committed sources … PASSED — 0 data defect, 0 promised-but-unexercised, 32 not exercised`. `validate --profile nightly --exercised` reported `L6 WARN … (66 of 106 sources checked)`. |

**This materially corrects two premises supplied to this verification.** The `86 not exercised`
figure is the **pull-request** profile, where the only bodies are committed fixtures. On the
nightly profile the figure is **32**, and all **66** Cellar corpus sources were verified against
bodies fetched live from the Publications Office that night, with zero data defects. And L6 is not
merely reachable in principle — it has **already run in CI** and reported per-source findings.
What remains true is narrower: L6 has never produced an *error*, and `freshness-gate` has never
gone red.

### Requirements Coverage

| Requirement | Source plan | Substantive status | Evidence |
|---|---|---|---|
| LEGAL-01 | 01-01, 01-04 | ✓ SATISFIED | Schema rejects a verified fact with no source; `resolve()` labels every unverified field. 567 facts all carry a determinate status. |
| LEGAL-02 | 01-04 | ⚠️ PARTIAL | All 27 covered with a sourced, dated `transposition.status`. Values are `unknown` ×15 and `no_measure_notified` ×12 — the vocabulary supports in_force/draft, but no state is yet resolved to one. |
| LEGAL-03 | 01-04, 01-05 | ✓ SATISFIED | `resolve(PL.article_7.legal_basis)` → `directive_fallback` with the Art. 7(1) quotation; national value would win if verified. |
| LEGAL-04 | 01-01, 01-03, 01-04 | ✓ SATISFIED | `32023L0970#007.004` stored verbatim in all 11 languages; fallback returns it for a country with no national deadline. A test asserts the exact English sentence. |
| LEGAL-05 | 01-04 | ✓ SATISFIED (structure) | Art. 12(3) is a condition object with routing bodies; a bare boolean fails parse; independent of Art. 7(2). Value pending for all 27. |
| LEGAL-06 | 01-04 | ⚠️ PARTIAL | `enforcement.equality_body` and `enforcement.anti_retaliation` exist on all 27 with `note_key: pending.art20_designation_not_traced`. **No state names its equality body.** Phase 1 SC2 permits pending; Phase 3/5 render it. |
| LEGAL-07 | 01-03 | ✓ SATISFIED | 6 articles × 11 languages; four inherited-error regressions plus the Art. 10 TFEU collision each have a named test. |
| LEGAL-08 | 01-04, 01-05 | ⚠️ PARTIAL | Data half verified (gate + `resolve().freshness`). UI degrade deferred to Phase 3. Scope narrowing to launch-country operative fields is the D-10 rewording already recorded in REQUIREMENTS.md. |
| LEGAL-09 | 01-01, 01-02 | ✓ SATISFIED | Non-empty body **and** subtree-scoped anchor both asserted; empty 200 disposes `data_defect`. |
| LEGAL-10 | 01-02, 01-05 | ✓ SATISFIED | PR template, CONTRIBUTING, CODEOWNERS, three required checks, live branch protection, proposed/ path with L9. |
| ENG-01 | 01-06, 01-07 | ✓ SATISFIED | 10 vectors + frozen type exist; no Art. 9 arithmetic anywhere in the engine `src`. |
| ENG-06 | 01-06 | ✓ SATISFIED | 11 keys × 1 decision × Directive position × `Default origin:`, enforced by `conventions-documented.test.ts`. |
| GAP-06 | 01-06 | ✓ SATISFIED | Transmitted set closed at `[v, gap, band, lang]`; raw inputs go after `#`; base query/fragment discarded. |

**Orphaned requirements:** none. Every ID that REQUIREMENTS.md maps to Phase 1 is claimed by at
least one plan.

**Traceability defect:** ten of the thirteen are still `- [ ]` / `Pending` in REQUIREMENTS.md.
Routed to human verification item 6.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD` / `FIXME` / `XXX` across `src/`, `scripts/`, `test/`, `.github/`, `docs/` | — | **None found.** |
| — | — | `TODO` / `HACK` / `PLACEHOLDER` | — | **None found.** |
| `packages/directive-engine/docs/CONVENTIONS.md` vs `AMBIGUITY-BASELINE.json` | § denominator / `accepted` | Two committed artefacts state opposite things about whether the Art. 10(1) reading is settled | ⚠️ Warning | A reader of one concludes the question is decided; a reader of the other concludes it is open. The MAGNITUDE reading is already in force in both v08 answer files. Human item 1. |
| `packages/directive-engine/docs/CONVENTIONS.md` | § preamble | Four decisions with no `Conventions` key are filed under the nearest existing key, self-labelled "a workaround, not a design" | ℹ️ Info | Disclosed in the document itself with the D-16 amendment path named as the honest fix. |

### Scope note — what "verified against a primary source" currently covers

The phase goal says *every fact the product will assert* is verified against a primary source.
On the committed tree that is true of the **Directive corpus** — 66 entries, live-verified from
CI against the Publications Office with zero data defects — and of the **provenance machinery**.
It is not yet true of **national** facts: 540 of 567 country facts are `pending_verification`,
and the 27 that are verified all carry `transposition.status` sourced from the Commission NIM
register, 15 of them with the value `unknown`.

That is not a defect of this phase. Phase 1 SC2 explicitly permits *"or rendering as 'pending
verification'"*, D-06 reserves promotion to a human who has read the source, and the product
cannot assert a fact it does not hold — `resolve()` returns `provenance: unknown` with a
non-empty label rather than a blank or a guess. The mechanism is what Phase 1 owed and the
mechanism is present, wired and proved. But the ROADMAP's Phase 5 dependency line reads
*"Phase 1 (verified Art. 6, 7 and 12(3) data for the launch countries)"*, and that specific
promise is not discharged. It is raised as human item 3 rather than as a gap, because closing it
requires a human act that the phase's own design forbids an agent from performing.

### Deferred Items

| # | Item | Addressed in | Evidence |
|---|---|---|---|
| 1 | Stale-fact UI degradation (LEGAL-08 UI half) | Phase 3 | SC1: "each showing its source and verified date — with … 'pending verification' wherever nothing has been checked" |
| 2 | L7 letter coverage has never rejected | Phase 5 | SC2: "every template snapshot-tested per locale" |
| 3 | Share-URL bucket estimates are modelled, not Eurostat-sourced | Phase 4 | SC3 + WINDOWS #5's own "before the card ships in Phase 4" |
| 4 | Single-number reduction on metrics (e), (f), (g) | Phase 6 | SC1 "reproduce every golden vector"; WINDOWS #6 names Phase 6 |
| 5 | `@paytransparency` npm scope unproven | Phase 6 | SC1 "install `directive-engine` from npm under MIT" |

### Human Verification Required

Seven items, recorded in full in the frontmatter. In priority order:

#### 1. The Art. 10(1) five-percent reading — and a contradiction between two committed files

`CONVENTIONS.md` § denominator: *"Reading now governing: **magnitude**."*
`AMBIGUITY-BASELINE.json`: *"carried forward as an open convention question, not as an accepted state."*

Both `v08-negative-gap/expected.json` and `rederived.json` already emit
`art10Flags: [{category: "Research", gapPct: -25, threshold: 5}]` — the magnitude reading is in
force in the executable specification Phase 6 will be built against. Decide it, then make the two
files say the same thing. This decides whether an employer owes a joint pay assessment.

#### 2. Drill evidence provenance
The mechanisms are proved here — this verifier reconstructed four of the five cases offline and
each rejected as transcribed. Only "five real PRs went through CI" rests on trust.

#### 3. Phase 5's stated dependency on verified launch-country data
Not discharged; requires D-06 maintainer promotions. Decide whether that is Phase 1 work or
scheduled work before Phase 5.

#### 4. `freshness-gate` cannot fire on the current dataset
Proved by synthesis, never by data. Accept or schedule.

#### 5. ROADMAP SC4's "any fact" versus the shipped launch-country-only hard gate
At 2026-12-10 all 27 verified country facts go stale and produce **27 warnings, 0 errors**.
Accept D-10 explicitly.

#### 6. REQUIREMENTS.md traceability is stale
Ten of thirteen IDs still Pending; three are genuinely Partial and should say so.

#### 7. `enforce_admins=false`
Verified live. Accept the single-maintainer rationale with a trigger to flip it.

### Gaps Summary

**No gaps.** No must-have truth failed, no artifact is missing or a stub, no key link is unwired,
and no debt marker exists in any file this phase touched.

The two claims most at risk of being narrative rather than fact were checked hardest and both
held. The verifier genuinely fails an empty 200 with the same disposition it gives a 404 — this
was executed, not read. And the CR-03 fix did make live verification reachable: a real nightly
run on 2026-09-14 fetched all eleven language expressions from the Publications Office, handed
them to the verifier through `--bodies`, exercised 66 of 106 sources with zero data defects, and
drove L6's nightly branch to report per-source findings. Two of the premises this verification
was handed — "86 not exercised" and "L6 has never fired" — are the pull-request-profile view;
the nightly view is 32 and L6 has fired.

What holds the phase back from `passed` is not defective work. It is that the most consequential
remaining decisions are ones only a human can take: a legal question about Art. 10(1) whose two
records currently contradict each other, a promotion path that the phase's own governance
deliberately forbids agents from walking, and three honest disclosures that need explicit
acceptance rather than silent absorption. The phase built the machine for verifying facts and
proved it works; the facts themselves are, by design, still waiting on a maintainer who has read
the source.

---

_Verified: 2026-09-14T10:30:43Z_
_Verifier: Claude (gsd-verifier)_

---

## UAT resolution — 2026-09-14

All seven `human_verification` items were put to the maintainer and answered. Status moved
`human_needed` → `passed` on that basis. Recorded in `01-UAT.md` (status: complete, 7/7).

| # | Item | Outcome |
|---|------|---------|
| 1 | Art. 10(1) signed vs magnitude | **MAGNITUDE governs.** Accepted on the ground already recorded in `CONVENTIONS.md`: the signed reading would silently exempt every category in which men are the underpaid group. `Art10Flag.gapPct` keeps the SIGNED value so direction is never lost. `AMBIGUITY-BASELINE.json` corrected to say DECIDED; `CONVENTIONS.md` and both `v08` vectors unchanged — they already implemented it. `pnpm rederive:vectors` re-run after the edit: 10/10 agree, baseline 45 held. |
| 2 | Drill evidence provenance | Accepted as disclosed. The mechanism was independently reconstructed offline for cases 1, 2, 3 and 5; only "five real PRs went through CI" rests on the private archive, and `docs/BAD-PR-DRILL.md` says so. WINDOWS entry stays OPEN. |
| 3 | Phase 5 dependency | **Phase 1 owed the machine, not the facts.** Its own SC2 permits "or rendering as pending verification", and D-06 reserves promotion to a human who has read the primary source — so no phase can discharge it. ROADMAP Phase 5's dependency line reworded to name the promotion as a maintainer prerequisite rather than a Phase 1 deliverable. Logged as an open WINDOWS entry. Until promotion, `resolve()` falls back to the Directive article, so a letter cites Art. 7(1) and the two-month deadline correctly, just not country-specifically. |
| 4 | Freshness gate unexercisable | Accepted. Proved by construction (synthesised stale PL fact → 1 failure, then 0 after moving `verified_at`); cannot fire on real data until a D-06 promotion happens. WINDOWS entry stays OPEN. |
| 5 | SC4 wording vs D-10 | Accepted. D-10 deliberately narrows "any fact" to a hard-fail on launch-country legally-operative facts; everything else degrades rather than darkens. |
| 6 | REQUIREMENTS.md traceability | Updated. Six IDs moved to Complete — each carries an explicit "or pending" / fallback clause its own wording satisfies. **LEGAL-02, LEGAL-05, LEGAL-06 and LEGAL-08 recorded as PARTIAL, not Complete**, with per-ID reasons: the machinery is proved, but 540 of 567 country facts remain `pending_verification` by design. Evidence read from the records, not the summaries: `transposition.status` is `unknown` ×15 / `no_measure_notified` ×12, and 0 of 27 states name an equality body. |
| 7 | `enforce_admins=false` | Accepted with a trigger: flip it the day a second maintainer exists. WINDOWS entry stays OPEN as the reminder. |

**Post-UAT re-verification** (source unchanged by any of the above; only planning artefacts and
one JSON description field moved): `pnpm test` 411 passed, `pnpm rederive:vectors` 10/10 agree
with baseline 45 held, `pnpm typecheck` clean.

**Five items above remain OPEN in the ledger on purpose.** They are honest limitations, not
defects to tidy away, and `/gsd-ship` will keep blocking while they stand.

