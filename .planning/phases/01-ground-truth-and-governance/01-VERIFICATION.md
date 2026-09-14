---
phase: 01-ground-truth-and-governance
verified: 2026-09-14T10:55:00Z
uat_resolved: 2026-09-14T10:50:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".github/CODEOWNERS"
  - ".github/workflows/cellar-reachability.yml"
  - ".github/workflows/legal-data.yml"
  - ".github/workflows/nightly.yml"
  - ".planning/REQUIREMENTS.md"
  - ".planning/ROADMAP.md"
  - ".planning/WINDOWS.md"
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
  - ".planning/phases/01-ground-truth-and-governance/01-UAT.md"
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
covered_digest: "v1:sha256:f92c45856ff3c188cbd9619689abb823627293c900bfcdfbc587984d5bafe3b0"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  trigger: "covered_digest stale — .planning/REQUIREMENTS.md, .planning/ROADMAP.md, .planning/WINDOWS.md, 01-UAT.md and AMBIGUITY-BASELINE.json changed after the initial report"
  gaps_closed:
    - "Human item 1 — Art. 10(1) magnitude reading DECIDED; AMBIGUITY-BASELINE.json and CONVENTIONS.md now agree. Re-checked by reading both files: the § denominator contradiction is gone."
    - "Human item 2 — bad-PR drill evidence accepted as disclosed; WINDOWS #11 stays open."
    - "Human item 3 — Phase 5 dependency reframed as a maintainer prerequisite; obligation relocated, not dissolved (Phase 5 SC1 and SC2 still require the national citation and the equality body), and recorded as WINDOWS #13 (open)."
    - "Human item 4 — unexercisable freshness hard gate accepted; re-proved by construction this pass."
    - "Human item 5 — D-10 narrowing of ROADMAP SC4 accepted explicitly."
    - "Human item 6 — REQUIREMENTS.md traceability updated; each of the six Complete calls and four Partial calls independently re-tested against the records this pass (see Traceability Audit)."
    - "Human item 7 — enforce_admins=false accepted with a trigger; WINDOWS #12 stays open."
  gaps_remaining: []
  regressions: []
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
  - truth: "Launch-country Art. 6, 7 and 12(3) facts remain pending_verification (WINDOWS #13)"
    addressed_in: "Maintainer prerequisite before Phase 5"
    evidence: "ROADMAP Phase 5 dependency line, reworded 2026-09-14: 'Art. 6, 7 and 12(3) facts for the launch countries (PL, SK, IT, LT, MT) must be promoted from pending_verification before letters ship. D-06 reserves that promotion to a human who has read the primary source, so no phase can discharge it.' Phase 5 SC1 and SC2 still require the national citation and the equality body, so the obligation survives the rewording."
advisory:
  - finding: "resolve(fact, corpus, {field}) throws MissingDirectiveCitation when `field` is a field path outside DIRECTIVE_FALLBACK_KEYS (e.g. 'article_12_3'), because fallbackKeyFor returns `undefined` and the `key !== null` guard lets undefined through to quoteParagraph. The intended answer is provenance: 'unknown'."
    category: other
    reason: "Unreachable from a typed caller — ResolveOptions declares `field?: DirectiveFallbackField`, and every current caller is TypeScript. A Phase 3 renderer that iterates field-path strings and casts would crash a country page instead of rendering 'pending verification'. Resolved by narrowing the guard to `typeof key === 'string'`. New scope, non-blocking, no must-have depends on it; raised so Phase 3 does not discover it in a template loop."
    evidence_status: "reproduced deterministically this pass (stack trace from resolve.ts:347 → quoteParagraph resolve.ts:223); not blocking, file unmodified since the prior verification"
behavior_unverified_items: []
coincidental_reliance_items: []
---

# Phase 1: Ground Truth and Governance — Verification Report

**Phase Goal:** Every fact the product will assert is verified against a primary source, and every decision that is expensive to change later is recorded as data rather than left as a default
**Verified:** 2026-09-14T10:55:00Z (re-verification after UAT resolution)
**Status:** passed
**Re-verification:** Yes — after the seven human-verification items were answered and the planning artefacts were updated

## Verification method

Every claim below was checked by executing code against the committed tree, by reconstructing
the drill defects independently, or by reading live GitHub Actions logs. Nothing in this report
is taken from a SUMMARY. Where a SUMMARY claim and the tree disagreed, the tree is recorded.

The re-verification pass re-ran every evidence command, re-exercised the two behaviour-dependent
invariants (the empty-200-versus-404 disposition and both freshness gates) rather than carrying
the earlier result forward, and audited the orchestrator-authored requirement traceability
against the 27 country records directly. The working tree was clean at the start and is clean at
the end; every probe ran from the scratchpad and wrote nothing into the repository.

## Goal Achievement

### Observable Truths — ROADMAP Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Articles 3, 6, 7, 9, 10, 12 quoted from EUR-Lex primary text and stored alongside the data | ✓ VERIFIED | `_directive.json` holds 66 entries = 6 articles × 11 languages (`ces dan deu eng ita lit mlt nld pol slk swe`), 308 tagged paragraphs, **zero** short-or-empty quotations. Every source is a pinned Cellar expression URI with ETag `"Con-20231213063525000"`, `scope.id`, `expected_subtitle` and anchor. No reader proxy or vendor host appears. Re-confirmed this pass: `rederive:vectors` resolved 153 citation keys against 66 corpus entries. |
| 2 | All 27 member-state files, every listed field carrying a source URL + `verified_at` or rendering "pending verification" | ✓ VERIFIED | 27 files AT…SK (GR not EL). 567 facts: 27 verified, 540 `pending_verification`. Re-walked every Fact envelope this pass: **0 violations** — every `verified` fact carries a non-empty `sources[]` and a past `verified_at`; every `pending_verification` fact holds `value: null`. `resolve()` returned a determinate provenance and a **non-empty label on all 135 resolutions** (5 fields × 27 states, 0 empty labels). |
| 3 | A wrong-statute PR is rejected by schema validation, a per-country allowlist, and a verifier failing an empty 200 as loudly as a 404 — drilled before going public | ✓ VERIFIED | Re-executed this pass: `200 + 0 bytes → data_defect/empty_body`; `404 → data_defect/client_error`; `200 + 31-byte shell → data_defect/below_byte_floor`; `500 → source_unreachable/server_error`. **Empty 200 and 404 share the same disposition.** `legal-data.yml` fires on `pull_request` and runs `validate:country-data --base` plus `verify:sources`; all three jobs are required checks on `master` with code-owner review. |
| 4 | A build fails when a fact is past its freshness window, and the window varies by volatility | ✓ VERIFIED | Re-executed this pass: `corpusFreshness` at 2026-09-14 → 0/0, at 2027-06-12 → 66 warnings, at 2027-09-11 → 66 errors. `freshnessGate` on a synthesised verified-but-stale PL `article_7.response_deadline` → 1 failure ("256 days ago, past the 90-day volatile window"), and 0 once `verified_at` moved forward. On real data it returns 0 failures at any date — the documented, UAT-accepted consequence of D-06 (WINDOWS, human item 4). |
| 5 | Golden vectors and a frozen `EngineReport` exist as reviewed data with no engine code; conventions and the share-URL contract are recorded decisions | ✓ VERIFIED | 10 vector directories present and unchanged by the UAT round. `packages/directive-engine/src` contains only `index.ts`, `types.ts`, `share-url-contract.ts`; the only arithmetic is `Math.floor`/`Math.round`/`Math.abs` inside the share-URL rounding rule — no median, quartile or gap computation. 11 `CONVENTION_KEYS` ↔ 11 `## ` headings, enforced by `conventions-documented.test.ts`. `pnpm rederive:vectors`: 10/10 agree, baseline 45 held. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Re-run evidence — this pass

| Command | Result | Status |
|---|---|---|
| `pnpm test` | 14 files, 411 tests passed, 1.09 s | ✓ PASS |
| `pnpm typecheck` | `tsc -b` clean, no output | ✓ PASS |
| `pnpm rederive:vectors` | `10 of 10 vectors agree; 45 recorded ambiguities surfaced (baseline 45)`; `153 citation key(s) resolved against 66 corpus entries` | ✓ PASS |
| `pnpm validate:country-data` | `PASSED — 0 error, 0 warning, 0 schema issue`; L1–L5, L8, L9 ok; L6/L7/BUMP SKIP with stated reasons; `Referential pass: ok — every Directive fallback citation key resolves` | ✓ PASS |
| `pnpm verify:sources` | `PASSED — 0 data defect, 0 promised-but-unexercised, 86 not exercised (no retrieval layer)` — the pull-request profile; the nightly profile reported 32 not exercised with 66 Cellar sources verified live | ✓ PASS |
| `verifySource` on four crafted responses | empty 200 and 404 both `data_defect` | ✓ PASS |
| `freshnessGate` / `corpusFreshness` time travel | as tabulated in truth 4 | ✓ PASS |
| `git status` before and after | clean both times | ✓ PASS |

## Traceability Audit — the six Complete calls, tested rather than accepted

The traceability in `.planning/REQUIREMENTS.md` was written by the orchestrator at UAT. Each call
was re-tested here against the records themselves. **All ten stand.**

| ID | Call | Independently tested how | Verdict |
|---|---|---|---|
| LEGAL-01 | Complete | Walked all 567 Fact envelopes across 27 files: 27 `verified` (each with non-empty `sources[]` and a past `verified_at`), 540 `pending_verification` (each with `value: null`), **0 violations**. The 27 verified sources use the Cellar `http:` resource URI — the single exemption `schema.ts` documents and enforces by hostname, not a lint hole. | **Complete holds.** The requirement's "or renders as pending verification" is discharged at the data layer; the UI half is LEGAL-11, separately mapped to Phase 3. |
| LEGAL-03 | Complete | `resolve()` on `article_7.legal_basis` for all 27 states → `directive_fallback` × 27, key `32023L0970#007.001`, returning the Art. 7(1) text verbatim with the corpus's own Cellar provenance and `verified_at`. The national branch is code path 1 and carries a direct passing test (`resolve.test.ts`: "a verified national value wins over an available Directive fallback"). | **Complete holds.** The argument put to me — "otherwise the Directive article" discharged by `DIRECTIVE_FALLBACK_KEYS` plus the referential pass — is exactly what the code does, and both halves of the disjunction are exercised. |
| LEGAL-04 | Complete | `resolve()` on `article_7.response_deadline` for all 27 → `directive_fallback` × 27, key `32023L0970#007.004`, text: *"…within a reasonable period of time but in any event within two months from the date on which the request is made."* Polish version returns the authentic `pol` expression, not English in its place. `deviates` is computed, with tests for one month, ten weeks and exactly two months. | **Complete holds.** |
| LEGAL-10 | Complete | `legal-data.yml` triggers on `pull_request`; `schema-and-lint` runs `validate:country-data --base <base sha>` then `verify:sources`; `offline-suite` runs typecheck, the country-data suite and `rederive:vectors`; `freshness-gate` runs both gates. All three are required checks on `master` with code-owner review (read live at the initial pass). CODEOWNERS, PR template, CONTRIBUTING and the five-case drill all present and substantive. | **Complete holds.** The caveat is disclosed, not hidden: the drill's PR/CI links live in a private archive (WINDOWS #11, open). The verifier reconstructed cases 1, 2, 3 and 5 offline; the gating mechanism is proved here. |
| ENG-01 | Complete | 10 vector directories; engine `src` is three files with no Art. 9 arithmetic; `CONVENTION_KEYS_ARE_EXHAUSTIVE` is a compile-time exhaustiveness proof; `rederive.ts` reads the two authored answer files and computes nothing. | **Complete holds.** "Exist as data before any engine code is written" is literally true of the tree. |
| ENG-06 | Complete | The requirement names four things. Each is present as its own decision heading: **denominator** (`## denominator`), **quartile construction by headcount** (`## quartileTieRule` + `## quartileRemainder`: *"Four equal groups of workers: rank by pay and split by headcount, never by pay range"*), **component treatment** (`## componentMap`), **part-time handling** (`## payBasis` `'hourly' \| 'fte_annualised' \| 'as_paid'` and `## partialPeriodPolicy` "part-time and full-time-equivalent normalisation"). 11 headings ↔ 11 keys, order-locked, with 12 named tests asserting one Directive position and one `Default origin:` per decision. | **Complete holds.** |

### The four Partial calls — is Partial the right word?

| ID | Call | Measured this pass | Verdict |
|---|---|---|---|
| LEGAL-02 | Partial | All 27 records carry a sourced, dated `transposition.status`. Values: `unknown` × 15, `no_measure_notified` × 12. **Zero** resolved to in_force/draft/from-date. | **Partial is right.** Coverage and the vocabulary are complete; the requirement asks for the *status*, and no state has one. Not Complete, and not failed — the stated reason matches the data exactly. |
| LEGAL-05 | Partial | `article_12_3` is modelled as a condition object (a bare boolean fails parse, with an explanatory message), sits in `LEGALLY_OPERATIVE_FIELDS`, and is stored separately from the unconditional Art. 7(2) right. All 27 resolve to `unknown`; 0 states state their option. | **Partial is right** — and it is a *downgrade* from the initial report's "SATISFIED (structure)", i.e. the orchestrator was stricter with itself than I had been. The "never as a blanket routing rule" clause is fully satisfied; the "states whether that state took the option" clause is not. |
| LEGAL-06 | Partial | `enforcement.equality_body` and `enforcement.anti_retaliation` exist and validate on all 27; **0 of 27** name an equality body or an anti-retaliation provision. Both resolve to `unknown` with a non-empty label, never a blank. | **Partial is right**, and the reason is accurate to the record. |
| LEGAL-08 | Partial | The data-side gate shipped per D-10 and was re-proved by construction this pass. The UI degrade has no surface to land on — Phase 3 owns it. | **Partial is right.** This is the ID whose own wording explicitly names the UI, which is what principally distinguishes it from LEGAL-01. The distinction is not a convenience: it tracks the requirement text. |

**No Complete is over-claimed and no Partial is a euphemism.** The traceability table, the
checklist boxes (`[x]` for the six Complete, `[ ]` for the four Partial) and the per-ID reason
table are mutually consistent, and each reason is reproducible from the records.

### The other three artefacts changed after the initial report

| Artefact | Claim | Checked | Verdict |
|---|---|---|---|
| `AMBIGUITY-BASELINE.json` | Art. 10(1) now DECIDED; count still 45; no vector changed | `git diff` touches **one line** — the `accepted` description. `"count": 45` unchanged, the 45-item array unchanged, `recorded_at` unchanged. Text now reads *"It is now DECIDED, not carried forward: the MAGNITUDE reading governs, as recorded in docs/CONVENTIONS.md (denominator)"* and names the accepting human and date. `CONVENTIONS.md` § denominator reads *"Reading now governing: magnitude"*. `pnpm rederive:vectors` re-run: 10/10 agree, baseline 45 held. | ✓ **The contradiction the initial report flagged is gone**, and it was closed by correcting the file that was wrong rather than by weakening the one that was right. |
| `.planning/ROADMAP.md` Phase 5 dependency | Rewording relocates the obligation, does not dissolve it | The line now names the promotion a **"Maintainer prerequisite, not a phase deliverable"** and says the facts **"must be promoted from `pending_verification` before letters ship"**. Phase 5's Success Criteria are unchanged and still demand the national citation (SC2: *"carrying that state's own citation"*) and the equality body and Art. 12(3) routing (SC1). The only ROADMAP change in the whole diff is this one line. | ✓ **Relocated, not dissolved.** Phase 5 still cannot be verified without those promotions; what changed is who owes them, which is the correct reading of D-06. |
| `.planning/WINDOWS.md` | New entry records the promotion obligation and is OPEN | Entry **#13**, kind `unmet-truth`, file `packages/country-data/data/`, status `open`, recorded 2026-09-14T10:44:30Z: *"Launch-country Art. 6, 7 and 12(3) facts (PL, SK, IT, LT, MT) remain pending_verification… Owed before Phase 5 ships letters."* Ledger arithmetic re-checked from the JSON block: 13 entries, 12 open, 1 fixed — matching the frontmatter counts. | ✓ **Recorded and open.** |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/country-data/src/schema.ts` | Frozen `Fact`/`Source` primitives | ✓ VERIFIED | 446 lines. Rejects `verified` + empty sources, and `pending_verification` + non-null value. The one `http:` exception is hostname-scoped to the Cellar resource URI and carries its reasoning in the source. |
| `packages/country-data/src/verifier.ts` | Fail-loud verifier, ordered assertions | ✓ VERIFIED | 1035 lines. Dispatch order re-proved this pass on four crafted responses. |
| `packages/country-data/src/source-strategy.ts` | Per-strategy byte floors | ✓ VERIFIED | Cellar floor 100 000 B, html-anchor 20 000 B; a 31-byte shell disposes `below_byte_floor`. |
| `packages/country-data/src/allowlist.ts` + `data/_allowlist.json` | Pre-fetch per-country host guard | ✓ VERIFIED | `all: [publications.europa.eu, curia.europa.eu, ec.europa.eu]`, `byCountry` covers all 27. `eur-lex.europa.eu` absent — prohibition honoured. |
| `packages/country-data/src/freshness.ts` | Volatility TTLs + gates | ✓ VERIFIED | 526 lines; both gates re-fired under time travel and synthesis this pass. |
| `packages/country-data/src/lint.ts` | L1–L9 + BUMP | ✓ VERIFIED | 1090 lines; L1–L5, L8, L9 green on the tree, L6/L7/BUMP skip with stated reasons. |
| `packages/country-data/src/country.ts` | Country schema | ✓ VERIFIED | 680 lines. Art. 12(3) as a condition object — a bare boolean fails parse; `LEGALLY_OPERATIVE_FIELDS` and `LAUNCH_COUNTRIES` exported as data. |
| `packages/country-data/src/resolve.ts` | Precedence + Directive fallback | ✓ VERIFIED | Total ordered precedence; 135 resolutions this pass returned a determinate provenance and a non-empty label. See the advisory on the untyped-field edge. |
| `packages/country-data/scripts/validate.ts` | `validate:country-data` entry | ✓ VERIFIED | `--profile`, `--exercised`, `--base` all wired. |
| `packages/country-data/scripts/verify-sources.ts` | Per-source dispatch | ✓ VERIFIED | 641 lines; exercised in a real nightly run. |
| `packages/country-data/data/_directive.json` | 66-entry corpus | ✓ VERIFIED | See truth 1. |
| 27 × `packages/country-data/data/XX.json` | One per member state | ✓ VERIFIED | L1 ok; filename ↔ record code asserted; 567 facts re-walked this pass. |
| `packages/country-data/proposed/*.json` | Agent drafts awaiting promotion | ✓ VERIFIED | IT, LT, MT, PL, SK + README. L9 rejects a verified fact planted in `proposed/`. |
| `packages/directive-engine/src/types.ts` | Frozen `EngineReport`, types only | ✓ VERIFIED | 380 lines, no arithmetic. `CONVENTION_KEYS_ARE_EXHAUSTIVE` is a compile-time exhaustiveness proof. |
| `packages/directive-engine/src/share-url-contract.ts` | Closed transmitted set | ✓ VERIFIED | 240 lines; transmitted set exactly `[v, gap, band, lang]`. |
| `packages/directive-engine/docs/CONVENTIONS.md` | One decision per key | ✓ VERIFIED | 11 `## ` headings matching `CONVENTION_KEYS` order; § denominator now agrees with the baseline. |
| `packages/directive-engine/vectors/v01…v10` | Ten pathological vectors | ✓ VERIFIED | All ten present, unchanged by the UAT round. |
| `packages/directive-engine/scripts/rederive.ts` | Comparison tool, computes nothing | ✓ VERIFIED | 453 lines; reads only the two authored answer files. |
| `packages/directive-engine/AMBIGUITY-BASELINE.json` | Ambiguity ratchet | ✓ VERIFIED | Count 45 and the 45-item array unchanged; only `accepted` was rewritten. Ratchet proved to exit 1 on a rise at the initial pass. |
| `.github/workflows/legal-data.yml` | PR profile, 3 named jobs | ✓ VERIFIED | Triggers on `pull_request` and `push`; all three jobs are required checks on `master`. |
| `.github/workflows/nightly.yml` | Live profile | ✓ VERIFIED | Ran successfully 2026-09-14T10:23:57Z; every conditional step executed. |
| `.github/workflows/cellar-reachability.yml` | D-01 conditional probe | ✓ VERIFIED | CI log: `PASS: Cellar answers 200 from a GitHub Actions runner with the art_7 subtree present.` |
| `.github/CODEOWNERS` | Required maintainer review | ✓ VERIFIED | Covers data, proposed, letters (pre-declared), workflows and each gate source file. |
| `docs/BAD-PR-DRILL.md` | Five drill cases | ✓ VERIFIED (accepted as disclosed) | Mechanism independently reconstructed for cases 1, 2, 3, 5. The private-archive limitation is stated in the document and carried as WINDOWS #11 (open), accepted at UAT. |
| `docs/POLISH-UPL-GATE.md` | Named dated blocking gate | ✓ VERIFIED | 152 lines; blocks the Polish letter (Phase 5), review-by 2026-12-01. |
| `docs/share-url-contract.md` | Versioned share-URL spec | ✓ VERIFIED | 252 lines. |
| `.planning/phases/01-.../01-UAT.md` | The seven answers | ✓ VERIFIED | `status: complete`, 7/7 pass, each with a written `accepted:` rationale naming the ground for the decision rather than a bare "ok". |
| `CHANGELOG-legal.md`, `REPORTING-LEGAL-ERRORS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md` | Governance surface | ✓ VERIFIED | 93 / 114 / 160 / 56 / 149 lines — all substantive, none a stub. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `scripts/fetch-directive.ts` | `data/_directive.json` | pinned URI + ETag into the Fact envelope | ✓ WIRED | CI-probed URI/ETag/bytes (`193564`) match the stored source byte for byte. |
| `src/verifier.ts` | `src/allowlist.ts` | `assertFetchable` before any request | ✓ WIRED | Lexology source rejected pre-fetch with `host_not_allowlisted`. |
| `src/verifier.ts` | `src/source-strategy.ts` | dispatch through `STRATEGY_TABLE` | ✓ WIRED | Byte floor per strategy observed in the disposition message. |
| `src/lint.ts` L5 | `src/allowlist.ts` | one allowlist implementation | ✓ WIRED | L5 message is the allowlist's own reason string. |
| `src/lint.ts` L8 | `src/freshness.ts` | `freshnessGate` in one place | ✓ WIRED | L8 hard/soft split matches `freshnessGate` + `GATED_FIELDS`. |
| `scripts/validate.ts` | `data/_directive.json` | referential pass over fallback keys | ✓ WIRED | Re-run this pass: "Referential pass: ok — every Directive fallback citation key resolves". |
| `src/resolve.ts` | `data/_directive.json` | `DIRECTIVE_FALLBACK_KEYS` → paragraph quotation | ✓ WIRED | 54 fallback resolutions this pass (2 fields × 27 states), every one returning non-empty Art. 7(1)/7(4) text with the corpus's own provenance. |
| `.github/workflows/nightly.yml` | `scripts/verify-sources.ts` | `--bodies` hand-off | ✓ WIRED | The real run exercised 66 sources. |
| `.github/workflows/nightly.yml` | `scripts/validate.ts --profile nightly` | L6's only reachable caller | ✓ WIRED | Real CI log: `L6 WARN … (66 of 106 sources checked)`. |
| `test/rederivation.test.ts` | `data/_directive.json` | every `definitionCite` resolved | ✓ WIRED | `153 citation key(s) resolved against 66 corpus entries`. |
| `docs/BAD-PR-DRILL.md` | `.github/workflows/legal-data.yml` | each case names its rejecter | ✓ WIRED | Each named rejecter reproduced independently. |
| `.planning/ROADMAP.md` Phase 5 | `.planning/WINDOWS.md` #13 | the promotion obligation | ✓ WIRED | The reworded dependency names the obligation; the ledger carries it open. Neither one can quietly drop it without the other showing the gap. |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| `data/_directive.json` | `value.raw_text`, `value.paragraphs` | Cellar XHTML via `extract.ts` | Yes — 308 paragraphs, none empty | ✓ FLOWING |
| `resolve()` | `ResolvedFact.value` | country record → corpus by citation key | Yes — Art. 7(1) and 7(4) returned verbatim in EN and PL this pass | ✓ FLOWING |
| `buildShareUrl()` | query string | `roundGapPct` + `bucketLifetime` | Yes — derived values only | ✓ FLOWING |
| `L6_linkLiveness` | `ExercisedEvidence` | `verify:sources --report` | Yes — 66/106 in the real nightly run | ✓ FLOWING |
| `freshnessGate` | failures | record `verified_at` × `TTL_DAYS` | Mechanism yes; no current record can trigger it (0 failures even at 2030-01-01) | ⚠️ STATIC by design — WINDOWS, UAT item 4 accepted |
| 27 country records | legal_basis / deadline / Art. 12(3) / equality body / anti-retaliation | maintainer promotion (D-06) | No — 540/567 facts are `pending_verification` | ⚠️ STATIC by design — WINDOWS #13, UAT item 3 accepted |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | `TBD` / `FIXME` / `XXX` across `src/`, `scripts/`, `test/`, `.github/`, `docs/` | — | **None found** (re-scanned this pass). |
| — | — | `TODO` / `HACK` / `PLACEHOLDER` | — | **None found.** |
| `packages/directive-engine/docs/CONVENTIONS.md` vs `AMBIGUITY-BASELINE.json` | § denominator / `accepted` | Two committed artefacts stated opposite things about the Art. 10(1) reading | **RESOLVED** | Was ⚠️ Warning at the initial pass. The baseline now states the magnitude reading is DECIDED and cites `CONVENTIONS.md`; both files now say the same thing. |
| `packages/country-data/src/resolve.ts` | 347 / 223 | An unknown `field` string reaches `quoteParagraph` as `undefined` and throws instead of resolving `unknown` | 📋 Advisory (ℹ️ Info) | Unreachable from a typed caller; raised for Phase 3, where a template loop over field paths would be the first plausible way in. Not a gap — no must-have depends on it and the file is unchanged since the prior verification. |
| `packages/directive-engine/docs/CONVENTIONS.md` | § preamble | Four decisions with no `Conventions` key filed under the nearest existing key, self-labelled "a workaround, not a design" | ℹ️ Info | Disclosed in the document itself with the D-16 amendment path named as the honest fix. |

### Requirements Coverage

| Requirement | Source plan | REQUIREMENTS.md status | Verifier finding | Evidence |
|---|---|---|---|---|
| LEGAL-01 | 01-01, 01-04 | Complete | ✓ SATISFIED | 567 envelopes walked, 0 violations; 27 verified carry source + date, 540 pending hold null. |
| LEGAL-02 | 01-04 | Partial | ⚠️ PARTIAL — call accurate | `unknown` × 15, `no_measure_notified` × 12; none in_force/draft. |
| LEGAL-03 | 01-04, 01-05 | Complete | ✓ SATISFIED | 27/27 `directive_fallback` → Art. 7(1); national branch tested. |
| LEGAL-04 | 01-01, 01-03, 01-04 | Complete | ✓ SATISFIED | 27/27 → `32023L0970#007.004`, two-month wording verbatim, EN and PL. |
| LEGAL-05 | 01-04 | Partial | ⚠️ PARTIAL — call accurate | Condition object enforced; 0/27 state the option. |
| LEGAL-06 | 01-04 | Partial | ⚠️ PARTIAL — call accurate | 0/27 name an equality body; fields exist and resolve to a labelled `unknown`. |
| LEGAL-07 | 01-03 | Complete | ✓ SATISFIED | 6 articles × 11 languages; the four inherited-error regressions and the Art. 10 TFEU collision each have a named test. |
| LEGAL-08 | 01-04, 01-05 | Partial | ⚠️ PARTIAL — call accurate | Data gate re-proved; UI degrade is Phase 3. |
| LEGAL-09 | 01-01, 01-02 | Complete | ✓ SATISFIED | Non-empty body **and** subtree-scoped anchor both asserted; empty 200 disposes `data_defect`. |
| LEGAL-10 | 01-02, 01-05 | Complete | ✓ SATISFIED | `pull_request` trigger → schema + lint + source check; three required checks; CODEOWNERS; drill. |
| ENG-01 | 01-06, 01-07 | Complete | ✓ SATISFIED | 10 vectors + frozen type; no Art. 9 arithmetic in engine `src`. |
| ENG-06 | 01-06 | Complete | ✓ SATISFIED | All four named conventions have their own decision heading; 12 tests enforce the structure. |
| GAP-06 | 01-06 | Complete | ✓ SATISFIED | Transmitted set closed at `[v, gap, band, lang]`; raw inputs go after `#`. |

**Orphaned requirements:** none. Every ID `REQUIREMENTS.md` maps to Phase 1 is claimed by at
least one plan, and every ID the plans claim is mapped.

**Traceability defect from the initial pass: CLOSED.** All thirteen IDs now carry a status and a
reason; nothing is left `Pending` without one.

### Scope note — what "verified against a primary source" currently covers

Unchanged from the initial pass, and worth restating because the UAT decisions turn on it.

On the committed tree the phase goal is true of the **Directive corpus** — 66 entries,
live-verified from CI against the Publications Office with zero data defects — and of the
**provenance machinery**. It is not yet true of **national** facts: 540 of 567 country facts are
`pending_verification`, and the 27 that are verified all carry `transposition.status` from the
Commission NIM register, 15 of them valued `unknown`.

Phase 1 SC2 explicitly permits *"or rendering as 'pending verification'"*, D-06 reserves
promotion to a human who has read the source, and the product cannot assert a fact it does not
hold — `resolve()` returns `provenance: unknown` with a non-empty label rather than a blank or a
guess. The maintainer ruled at UAT that Phase 1 owed the machine, not the facts; the facts are
now carried as an explicit, open, dated obligation in three places at once (ROADMAP Phase 5,
WINDOWS #13, and the four Partial requirement rows), which is a stronger record than the
implicit dependency line it replaced.

### Deferred Items

| # | Item | Addressed in | Evidence |
|---|---|---|---|
| 1 | Stale-fact UI degradation (LEGAL-08 UI half) | Phase 3 | SC1: "each showing its source and verified date — with … 'pending verification' wherever nothing has been checked" |
| 2 | L7 letter coverage has never rejected | Phase 5 | SC2: "every template snapshot-tested per locale" |
| 3 | Share-URL bucket estimates are modelled, not Eurostat-sourced | Phase 4 | SC3 + WINDOWS #5's own "before the card ships in Phase 4" |
| 4 | Single-number reduction on metrics (e), (f), (g) | Phase 6 | SC1 "reproduce every golden vector"; WINDOWS #6 names Phase 6 |
| 5 | `@paytransparency` npm scope unproven | Phase 6 | SC1 "install `directive-engine` from npm under MIT" |
| 6 | Launch-country Art. 6, 7 and 12(3) promotions | Maintainer prerequisite before Phase 5 | ROADMAP Phase 5 dependency line (reworded 2026-09-14) + WINDOWS #13, open |

### Advisory (New Scope, Unevidenced-Blocking)

| # | Finding | Category | Why Advisory |
|---|---|---|---|
| 1 | `resolve()` throws `MissingDirectiveCitation` when handed a `field` outside `DIRECTIVE_FALLBACK_KEYS` — `fallbackKeyFor` returns `undefined` and the `key !== null` guard admits it. The intended answer is `provenance: 'unknown'`. | other | New scope, non-blocking. `ResolveOptions.field` is typed `DirectiveFallbackField`, so no current caller can reach it; the file is unchanged since the prior verification and no must-have depends on it. Reproduced deterministically here so Phase 3 does not meet it inside a template loop. One-line fix: narrow the guard to `typeof key === 'string'`. |

### Human Verification Required

**None outstanding.** The seven items raised at the initial pass were put to the maintainer and
answered in full — see `01-UAT.md` (status: complete, 7/7) and the resolution table below. Each
answer was re-checked against the artefacts this pass rather than accepted on its own word, and
no new item emerged.

### Gaps Summary

**No gaps.** No must-have truth failed, no artifact is missing or a stub, no key link is unwired,
no debt marker exists in any file this phase touched, and no Complete requirement is over-claimed.

The re-verification was asked to attack one thing hardest: a requirement traceability written by
the orchestrator rather than by the verifier. It survives. The six Complete calls each rest on a
disjunction or fallback clause **in the requirement's own text**, and in every case the branch
being relied on was exercised — 27 of 27 states returning the Art. 7(1) and Art. 7(4) quotations
from the corpus with their own Cellar provenance, not merely a `DIRECTIVE_FALLBACK_KEYS` table
that exists. The four Partial calls are, if anything, stricter than my own initial report: LEGAL-05
was downgraded from "SATISFIED (structure)" to Partial by the orchestrator's own reading, which is
the opposite of the failure mode this pass was looking for.

The three substantive edits all hold up. The Art. 10(1) contradiction was closed by correcting the
file that was wrong rather than by softening the one that was right, and the count and every vector
are untouched. The Phase 5 rewording moves the promotion obligation from an implicit dependency
line to an explicit, named, dated maintainer prerequisite — while Phase 5's own success criteria
still demand the national citation and the equality body, so the obligation cannot be met by the
fallback. And the new WINDOWS entry records it as an open `unmet-truth` rather than closing it.

What the phase built was a machine for refusing to assert a fact it has not checked. That machine
was re-exercised end to end this pass — the verifier still fails an empty 200 exactly as loudly as
a 404, both freshness gates still fire under time travel and synthesis, and 135 resolutions all
returned a determinate provenance with a non-empty label. The facts themselves are, by design,
still waiting on a maintainer who has read the source, and that wait is now recorded in three
places instead of implied in one.

---

## UAT resolution — 2026-09-14

All seven `human_verification` items were put to the maintainer and answered. Recorded in
`01-UAT.md` (status: complete, 7/7). Each outcome was independently re-checked in the
re-verification pass above.

| # | Item | Outcome | Re-checked |
|---|------|---------|------------|
| 1 | Art. 10(1) signed vs magnitude | **MAGNITUDE governs.** The signed reading would silently exempt every category in which men are the underpaid group. `Art10Flag.gapPct` keeps the SIGNED value so direction is never lost. `AMBIGUITY-BASELINE.json` corrected to say DECIDED; `CONVENTIONS.md` and both `v08` vectors unchanged — they already implemented it. | ✓ Both files read; they now agree. Diff touches one line. Count 45 and all 45 vector entries unchanged. `rederive:vectors` 10/10, baseline 45 held. |
| 2 | Drill evidence provenance | Accepted as disclosed. Mechanism independently reconstructed offline for cases 1, 2, 3, 5; only "five real PRs went through CI" rests on the private archive, and the document says so. WINDOWS #11 stays OPEN. | ✓ WINDOWS #11 open. |
| 3 | Phase 5 dependency | **Phase 1 owed the machine, not the facts.** SC2 permits "or rendering as pending verification"; D-06 reserves promotion to a human. ROADMAP Phase 5 dependency line reworded to name the promotion a maintainer prerequisite. Logged as an open WINDOWS entry. | ✓ Rewording read in full: obligation relocated, not dissolved. Phase 5 SC1/SC2 unchanged and still require it. WINDOWS #13 open. |
| 4 | Freshness gate unexercisable | Accepted. Proved by construction; cannot fire on real data until a D-06 promotion happens. | ✓ Re-proved this pass: 1 failure on the synthesised stale PL fact, 0 after moving `verified_at`; 0 failures on real data even at 2030-01-01. |
| 5 | SC4 wording vs D-10 | Accepted. D-10 deliberately narrows "any fact" to a hard-fail on launch-country legally-operative facts; everything else degrades rather than darkens. | ✓ `LEGALLY_OPERATIVE_FIELDS` + `LAUNCH_COUNTRIES` are the gate's scope in code; L8 soft half warns. |
| 6 | REQUIREMENTS.md traceability | Updated. Six IDs moved to Complete; LEGAL-02, LEGAL-05, LEGAL-06 and LEGAL-08 recorded as PARTIAL with per-ID reasons. | ✓ Audited call by call against the 27 records — see the Traceability Audit. All ten stand. |
| 7 | `enforce_admins=false` | Accepted with a trigger: flip it the day a second maintainer exists. WINDOWS #12 stays OPEN as the reminder. | ✓ WINDOWS #12 open. |

**Six items remain OPEN in the ledger on purpose** (#7, #10, #11, #12, #13 and the modelled
share-URL population estimate). They are honest limitations, not defects to tidy away.

---

_Initial verification: 2026-09-14T10:30:43Z — status human_needed, 5/5 truths, 7 human items_
_Re-verified after UAT: 2026-09-14T10:55:00Z — status passed, 5/5 truths, 0 human items_
_Verifier: Claude (gsd-verifier)_
