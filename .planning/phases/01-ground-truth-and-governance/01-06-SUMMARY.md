---
phase: 01-ground-truth-and-governance
plan: 06
subsystem: directive-engine
tags: [directive-engine, article-9, conventions, golden-vectors, share-url, k-anonymity, mit, zero-dependencies, tdd]

requires:
  - "01-01: the pnpm workspace, the catalog pins, tsconfig.base.json with erasableSyntaxOnly, the root solution tsconfig, and the citation-key shape 32023L0970#007.004"
provides:
  - "packages/directive-engine — MIT, zero runtime dependencies, registered in the workspace and the root solution tsconfig"
  - "The frozen EngineReport contract as types only, with a written amendment path"
  - "CONVENTION_KEYS: eleven calculation conventions in one fixed order, compile-time proved exhaustive against the Conventions type"
  - "One recorded decision per convention key, each stating the Directive's position AND, separately, its own default's origin"
  - "The share-URL contract implemented once: eight bands, ties away from zero, a 25,000 k-anonymity floor"
  - "docs/share-url-contract.md — the versioned specification with a worked adversarial read"
  - "Ten self-contained golden vectors with hand-computed first-pass answers and their working shown"
  - "Three test suites: 20 + 19 + 12 cases, all offline"
affects: [01-07, 02, 04, 06]

actuals:
  tokens: 78000
  tasks: 3
  commits: 7
plan_head_before: 1c9408d1931727ef395800f31ec535f8c279cdf8

tech-stack:
  added: []
  patterns:
    - "Data-before-code: the vectors and the report type are the executable specification, and no Article 9 arithmetic exists to be written against itself"
    - "Position and origin as orthogonal, separately parsed fields — what the Directive says, and where the project's own default came from"
    - "Refuse rather than default: a convention the Directive does not settle throws with a named code"
    - "One implementation of a shared rule, imported by every consumer, so two surfaces cannot disagree"
    - "A k-anonymity floor as a numeric assertion rather than an aesthetic judgement about bucket width"
    - "RED skeletons that are wrong in the specific way the contract exists to prevent"

key-files:
  created:
    - packages/directive-engine/package.json
    - packages/directive-engine/tsconfig.json
    - packages/directive-engine/tsconfig.tools.json
    - packages/directive-engine/README.md
    - packages/directive-engine/src/types.ts
    - packages/directive-engine/src/index.ts
    - packages/directive-engine/src/share-url-contract.ts
    - packages/directive-engine/docs/CONVENTIONS.md
    - packages/directive-engine/docs/ENGINE-REPORT.md
    - packages/directive-engine/test/conventions-documented.test.ts
    - packages/directive-engine/test/share-url-contract.test.ts
    - packages/directive-engine/test/vectors-wellformed.test.ts
    - docs/share-url-contract.md
    - packages/directive-engine/vectors/ (ten directories, three JSON files each)
  modified:
    - tsconfig.json
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The share-URL numbers were fixed by a human at a blocking checkpoint: eight roughly logarithmic bands, gap to the nearest whole percentage point, k-anonymity floor 25,000, top band open-ended as the explicit condition of the choice"
  - "Rounding ties go AWAY FROM ZERO, not the language default's half-up, because a gap carries a sign and asymmetry would understate it in one direction only"
  - "medianRule's default origin is project_invented, not external_guidance — the guidance that settles the quartile questions takes the mean of the two middle values, so attributing lower_of_two to it would be a false attribution"
  - "quartileRemainder with a remainder of two or three distributes one per quarter from the lowest upward, not all into the first"
  - "A zero numerator is a zero; a zero denominator with a real difference is a null; an all-one-sex category is a null"
  - "Art. 10(1) triggers on the MAGNITUDE of the difference, so a negative gap flags and keeps its sign; a suppressed category emits no flag"
  - "packages/directive-engine is private: true — the repository is private and the D-12 public flip is gated in plan 01-05, so an accidental npm publish of a pre-freeze contract is a one-way risk not worth carrying"

requirements-completed: [GAP-06]

coverage:
  - id: D1
    description: "Every convention key carries a recorded decision stating the Directive's position in one of exactly three words, and a decision stating none of them fails"
    requirement: "ENG-06"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#states exactly one Directive position per decision, in one of the three recognised words"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#carries exactly the eleven CONVENTION_KEYS as its decision headings, with no missing and no orphan key"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#lists the decisions in the same order as CONVENTION_KEYS, so a key cannot be appended to one without the other"
        status: pass
    human_judgment: false
  - id: D2
    description: "A borrowed convention and an invented one are distinguishable by an auditor: each decision names its default's origin in one of four forms, an external_guidance origin names both a document and a URL, and a silent position may not claim directive_text"
    requirement: "ENG-06"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#carries exactly one Default origin line per decision, in one of the four recognised forms"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#names both a document and a URL on every external_guidance origin"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#never lets a decision whose Directive position is silent claim directive_text as its own default origin"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#attributes joinerLeaverPolicy as project_invented in those words, so an invented default is distinguishable from the borrowed one under quartileTieRule"
        status: pass
    human_judgment: false
  - id: D3
    description: "The part-time case records no default and throws; the suppression threshold records a null default and that no EU-level numeric threshold exists"
    requirement: "ENG-06"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#records no default and a throwing behaviour for partialPeriodPolicy — the flagship case the Directive does not settle"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#records a null default for minGroupSize and records that no EU-level numeric threshold exists"
        status: pass
    human_judgment: false
  - id: D4
    description: "EngineReport is frozen as types only — no metric arithmetic, suppression and reliability as two separate flags, draft as the literal true — with an amendment path naming all three artefacts that must change together"
    requirement: "ENG-01"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#computes nothing — the file carries types and constants only, with no callable body"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#keeps privacy suppression and statistical reliability as two separate fields on MetricValue"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#declares draft as the literal true, not as a boolean"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/conventions-documented.test.ts#records an amendment path naming all three artefacts that must change together"
        status: pass
    human_judgment: false
  - id: D5
    description: "The transmitted share-URL parameter set is closed in both directions and the worker's own inputs never reach the request line"
    requirement: "GAP-06"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#names nothing that could identify a person — no country, sector, seniority, age, employer, salary or date"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#puts no key in a constructed share URL that is not on the list"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#keeps the worker’s own inputs after the fragment marker, where the request line never carries them"
        status: pass
    human_judgment: false
  - id: D6
    description: "The bucket table and the rounding rule exist once, boundaries are claimed by the band below, the top band is open-ended, and the rounding tie direction is asserted numerically rather than inherited from the language"
    requirement: "GAP-06"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#returns the LOWER of the two adjacent bands at every boundary value in the table"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#leaves the top band open-ended, which is the condition the bucket choice was accepted on"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#rounds a tie away from zero, symmetrically: 14.5 to 15 and -14.5 to -15"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#reports a negative gap as negative rather than clamping it to zero"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#imports nothing from outside the package"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every band clears the 25,000 k-anonymity floor, as does the narrowest transmitted cell, and the specification carries all seven elements including a worked adversarial read"
    requirement: "GAP-06"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#declares a population estimate at or above the floor for every band"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#keeps the narrowest transmitted cell — one band crossed with one rounded gap value — above the floor too"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/share-url-contract.test.ts#carries all seven required elements as numbered sections"
        status: pass
      - kind: command
        ref: "grep -c 'adversarial' docs/share-url-contract.md -> 2"
        status: pass
    human_judgment: false
  - id: D8
    description: "Ten self-contained golden vectors, each with its own complete conventions block, each small enough to recompute on paper, covering the ten pathological cases"
    requirement: "ENG-01"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/vectors-wellformed.test.ts#matches the declared case list as a set, so a renamed or dropped vector is named in the failure"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/vectors-wellformed.test.ts#declares every CONVENTION_KEYS entry, with no key missing and no extra key"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/vectors-wellformed.test.ts#inherits nothing — no shared default file exists and no block references one"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/vectors-wellformed.test.ts#holds twelve worker rows or fewer"
        status: pass
      - kind: command
        ref: "node -e '<vector count and three-file probe>' -> 10 0"
        status: pass
    human_judgment: false
  - id: D9
    description: "The two cases where silence produces a confidently wrong number are pinned: an all-one-sex category is null with a warning, and an unmapped sex value is counted in excludedN rather than dropped"
    requirement: "ENG-01"
    verification:
      - kind: unit
        ref: "packages/directive-engine/test/vectors-wellformed.test.ts#v07 expects a null value with a recorded warning rather than a zero or a division by zero"
        status: pass
      - kind: unit
        ref: "packages/directive-engine/test/vectors-wellformed.test.ts#v10 declares a sexMapping that does not cover one of its own rows, and counts that row rather than dropping it"
        status: pass
    human_judgment: false
  - id: D10
    description: "The ten first-pass expected values are arithmetically correct against the Directive's definitions and each vector's own conventions"
    verification: []
    human_judgment: true
    rationale: "Nothing here can prove this, by design. The structural suite asserts completeness and shape; it deliberately checks no arithmetic, because the engine does not exist and a checker written now would be the engine testing itself. Plan 01-07 re-derives all ten independently from input.json and conventions.json alone and diffs the two passes. Until that runs, the numbers are one careful pass by hand, not a verified result."
  - id: D11
    description: "The five reading decisions that vector authoring forced — metric populations, quartile ranking basis, the single-number reduction on (e)/(f)/(g), the zero-versus-null rule, and unmapped-worker handling — are the right readings of the Directive"
    verification: []
    human_judgment: true
    rationale: "These are interpretive choices recorded in ENGINE-REPORT.md rather than facts a test can settle. They were made to be re-derivable, not to be correct by assertion; plan 01-07 disagreeing with any of them is the designed outcome and means the wording needs fixing, not the number."

duration: 71 min
completed: 2026-09-11
status: complete
---

# Phase 01 Plan 06: Frozen Contracts Summary

**Three contracts that later phases are built against rather than refactor — the `EngineReport` type with a written amendment path, eleven recorded calculation decisions that keep a project convention distinguishable from a Directive rule and from a borrowed one, and a versioned share-URL contract whose bands and rounding rule exist exactly once — plus ten hand-computed golden vectors, and no Article 9 arithmetic anywhere.**

## Performance

- **Duration:** 71 min across two sessions, split by a blocking-human checkpoint
- **Tasks:** 3 of 3 implementation tasks, plus the checkpoint
- **Files created:** 43 (13 source/doc/test files + 30 vector JSON files)
- **Commits:** 7, measured as `git rev-list --count 1c9408d..HEAD`

## Accomplishments

- **`packages/directive-engine` exists, MIT, with an empty `dependencies` object** and is registered in both the workspace and the root solution `tsconfig.json`. The shipped project sets `types: []` deliberately: nothing under `src/` may touch a Node global, because the share-URL contract runs in the browser.
- **The convention document's real innovation is the second line.** Every decision states the Directive's position (**fixed** / **silent** / **none**) *and, separately*, where the project's own default came from. Those two are orthogonal and the suite enforces the one cross-check that makes the rule mechanical: a decision whose position is `silent` may not claim `directive_text` as its default's origin. Without the origin line, a convention borrowed from real national guidance and one invented here read identically to an auditor.
- **The part-time case records no default and throws.** Vendors assert full-time-equivalent normalisation as though it were law; national guidance solves it a third way, by excluding reduced-pay workers instead of normalising them. Three defensible answers, none of them the Directive's — so the engine refuses rather than picks.
- **The share-URL rounding rule is not the language default, and the test says so out loud.** `Math.round(-14.5)` is `-14`: half-up toward positive infinity, which rounds a positive and a negative tie by different amounts. A gender pay gap carries a sign, so ties go away from zero and the test asserts both `roundGapPct(-14.5) === -15` *and* that this differs from `Math.round`.
- **"Wide buckets" became a number.** Every band declares a population estimate checked against the 25,000 floor, and so does the narrowest *transmitted cell* — one band crossed with one rounded gap value, which is the unit an observer actually sees. The thinnest cell is 50,000.
- **The adversarial read argues the case instead of asserting it**, including the part that is uncomfortable: an IP plus a timestamp is identifying regardless of what this contract does. What the band table fixes is that the derived figures add a cell of fifty thousand people rather than a fingerprint.
- **Ten vectors, every answer computed by hand with its working shown** — the sorted pay list, the quartile split points, the per-category means, and the exact fraction wherever the division does not terminate.

## The share-URL decision, as recorded

| | |
|---|---|
| **Chosen** | `medium-8` — eight roughly logarithmic lifetime bands |
| **Band edges** | €10k, €20k, €40k, €75k, €125k, €200k, €300k |
| **Top band** | `over-300k`, **open-ended** — the binding condition of the choice |
| **Rounding** | whole percentage points, ties away from zero: `14.5 → 15`, `-14.5 → -15`, `13.5 → 14` |
| **k-anonymity floor** | 25,000 — on the band *and* on the narrowest band-by-gap cell |
| **Decided by** | a human, at a blocking checkpoint. D-15 fixed the principle and left the numbers open; the numbers are the one-way part |
| **Origin** | project-invented. The edges and the population shares are not borrowed from any external document; the constraints they satisfy come from D-15 and the project's privacy constraint |

`coarse-5` was rejected as costing more share value than its headroom was worth — the worker-facing side is the traffic engine. `fine-12` was rejected because its own analysis conceded it would not survive an adversarial log read, which is the exact threat the contract exists to survive.

## The eleven convention keys, in their frozen order

`denominator`, `medianRule`, `quartileTieRule`, `quartileRemainder`, `payBasis`, `partialPeriodPolicy`, `joinerLeaverPolicy`, `sexMapping`, `componentMap`, `minGroupSize`, `referencePeriod`.

`CONVENTION_KEYS_ARE_EXHAUSTIVE` is a compile-time proof that this tuple is exactly the key set of `Conventions` — neither a subset nor a superset — so adding a field without adding its key stops the build before any test runs.

Recorded origins: `directive_text` for `denominator`, `minGroupSize` and `referencePeriod`; `external_guidance` (named document plus URL) for `quartileTieRule` and `quartileRemainder`; `project_invented` for `medianRule` and `joinerLeaverPolicy`; `no_default` for `payBasis`, `partialPeriodPolicy`, `sexMapping` and `componentMap`.

## The ten vectors

Names, row counts and the conventions each exercises. **No computed answer appears here** — plan 01-07 re-derives all ten from `input.json` and `conventions.json` alone and must not be able to read an answer in this file.

| Vector | Rows | What it exercises |
|---|---|---|
| `v01-quartile-boundary-ties` | 8 | `quartileTieRule` with a 2F:1M tied group spanning the Q1/Q2 boundary; two categories |
| `v02-n-mod-4-zero` | 8 | the control — remainder 0, no ties, so neither the tie rule nor the remainder rule fires |
| `v03-n-mod-4-one` | 9 | `quartileRemainder` with one leftover; the two sexes take different `medianRule` branches in one report |
| `v04-n-mod-4-two` | 10 | `quartileRemainder` with two leftovers, over a single-sex tie spanning Q1/Q2 |
| `v05-n-mod-4-three` | 11 | `quartileRemainder` with three leftovers; the only vector whose gap sits **below** the Art. 10 trigger |
| `v06-single-woman-category` | 8 | `minGroupSize` set to 2 by an adapter — suppression and unreliability as two separate flags |
| `v07-all-male-category` | 6 | a category with no women: null plus a warning, never a zero |
| `v08-negative-gap` | 6 | women paid more; the sign survives the denominator, the median and the Art. 10 trigger |
| `v09-zero-variable-components` | 6 | `componentMap` where every variable component is zero; a tie sitting entirely inside one quarter |
| `v10-unmapped-sex` | 6 | a `sexMapping` that does not cover one row; `excludedN` rather than a silent drop |

All ten carry a complete eleven-key `Conventions` block of their own. There is no shared default file and the suite asserts that none exists.

## TDD Gate Compliance

All three tasks ran the full RED → GREEN → REFACTOR cycle, and every RED was verified with `gsd-tools check tdd-red-evidence` before any production edit.

| Task | RED | Verdict | GREEN | REFACTOR |
|---|---|---|---|---|
| 1 — conventions | `fe93098` — 20 registered, 11 failing | `RED_EVIDENCE_OK` | `c56876b` — 20/20 | `81703c5` |
| 2 — share URL | `98f67b3` — 19 registered, 12 failing | `RED_EVIDENCE_OK` | `eae2777` — 19/19 | none needed |
| 3 — vectors | `cdc6c63` — 12 registered, 7 failing | `RED_EVIDENCE_OK` | `e6a2047` — 12/12 | none needed |

Every RED failure was a behavioural assertion, never a missing module or a fixture crash. Task 2's RED is worth noting: rather than commit an absent file, the skeleton was made **wrong in the two specific ways the contract exists to prevent** — `roundGapPct` delegating to `Math.round`, and a single placeholder band with a population estimate of zero — so the failing tests demonstrate the hazard rather than merely the absence.

Tasks 2 and 3 took no REFACTOR commit: no improvement beyond the cosmetic was available, and the cycle commits only on change.

## Decisions Made

Beyond the share-URL numbers above:

- **`medianRule` is attributed `project_invented`, not `external_guidance`.** The national guidance document that settles `quartileTieRule` and `quartileRemainder` takes the **mean of the two middle values** — the `interpolated` behaviour — so attributing this project's `lower_of_two` default to it would have been a false attribution. The plan permitted either outcome and required `project_invented` when no source could be named. This is exactly the distinction the origin line exists to preserve, tested on its first real use.
- **`quartileRemainder` needed a clarification before v04 and v05 could be derived at all.** "Leftovers to the lower quarter" is singular and says nothing about a remainder of two or three. Recorded: one per quarter from the lowest upward. The alternative — all leftovers into the first quarter — gives 4/2/2/2 at n=10, which is not four equal groups in any sense Art. 3(1)(f) would recognise.
- **`private: true` on the package.** Not required by the plan. The repository is private and the D-12 public flip is gated in plan 01-05; an accidental `npm publish` of a pre-freeze contract is one-way, and the flag costs nothing to remove when publication is deliberate.
- **Art. 10(1) triggers on magnitude.** The Article speaks of a difference of at least five per cent and does not say which sex it must favour, so `v08`'s −25% flags and the recorded `gapPct` keeps its sign. A **suppressed** category emits no flag at all: a figure that may not be shown cannot be the basis of a finding.

## Deviations from Plan

**1. [Rule 3 - Blocker] `gsd-tools check tdd-red-evidence` cannot parse vitest's TAP output**
- **Found during:** Task 1, RED gate
- **Issue:** The checker's parser is node:test-shaped and requires a `# tests / # pass / # fail` summary block. Vitest's default reporter is not TAP at all, and its `tap-flat` reporter emits the per-test `ok` / `not ok` lines but no summary block, so the checker returned `INVALID_RED (zero_tests_discovered)` on a run that had clearly discovered twenty tests. Its own `failing_tests` array was fully populated at the time, including the target test.
- **Fix:** A ten-line script derives the summary block **mechanically from the run's own `ok` / `not ok` plan lines** and appends it to the captured output. It throws if the TAP plan count disagrees with the line counts, so a mismatch cannot pass silently. No number was hand-entered, and the underlying TAP is the unmodified reporter output.
- **Verification:** All three RED records return `RED_EVIDENCE_OK`; the failing-test names in each record are the reporter's own strings.
- **Note:** This is a format adapter, not a workaround for a failing gate — the gate's substantive checks (nonzero exit, the named target test failing as a distinctly-named real test, no file-named load failure) all ran and all passed.

**2. [Rule 3 - Blocker] The worktree had no `node_modules`**
- **Found during:** Task 1, before the first test run
- **Fix:** `corepack pnpm install`. The lockfile was already up to date — `@jafn/directive-engine` adds a third workspace importer with zero dependencies — so nothing was resolved or downloaded and no pin moved. `corepack pnpm` rather than bare `corepack enable`, per plan 01-01's recorded `EPERM` on this workstation.

**3. [Rule 3 - Blocker] Added `src/index.ts` and `tsconfig.tools.json`, not in the plan's file list**
- **Found during:** Task 1
- **Issue:** Both are the fixes plan 01-01 already had to make in `country-data`: the package `exports` map pointing at `./dist/index.js` is dishonest without a barrel, and a single project with tests inside `rootDir` emits `dist/src/index.js` instead of `dist/index.js`.
- **Fix:** A barrel exporting the full public surface, and a separate tools project for the tests so the shipped project's `rootDir` stays `src`. The root `tsconfig.json` gained both references.

**4. [Rule 2 - Missing critical] `ENGINE_CODES.COMPONENTS_ALL_ZERO` added during Task 3**
- **Found during:** Task 3, authoring `v09`
- **Issue:** The zero-components case needed a warning code and none of the existing members meant the right thing. Reusing `W_GROUP_UNRELIABLE` would have said something false.
- **Fix:** A new member. `EngineWarning.code` is a `string` and `ENGINE_CODES` is a convenience constant, so the contract's shape did not change; the type, the convention narrative and the vectors changed in one commit, which is what the amendment path requires.

**5. [Rule 2 - Missing critical] `buildShareUrl` / `transmittedKeysOf` added beyond the plan's export list**
- **Found during:** Task 2
- **Issue:** Two of the plan's own required behaviours — "no key present in a *constructed* share URL that is not in `TRANSMITTED_KEYS`" and "`SHARE_CONTRACT_VERSION` is present in the constructed URL" — cannot be asserted without something that constructs one. Testing the closed set in one direction only would have left the more dangerous direction unguarded.
- **Fix:** Both added, pure and dependency-free. The URL is assembled with `encodeURIComponent` rather than `new URL()`, because `URL` is not in the `ES2023` lib the shipped project compiles against and pulling in Node or DOM types would have broken the browser-safety property that `types: []` encodes.

**Total deviations:** 5 auto-fixed (3 × Rule 3 blocker, 2 × Rule 2 missing critical).

**Impact:** Deviation 1 is the only one worth a second look by a reviewer, because a mis-adapted RED record would weaken a gate rather than break a build. The adapter is deliberately fail-loud on any inconsistency between the plan line and the counted lines.

## Known Stubs

**1. No Article 9 metric arithmetic exists in `packages/directive-engine`.** This is the plan's central prohibition, not an omission: the vectors and the report type are the executable specification, and an implementation written now would be written against itself. Resolved in Phase 6, which must reproduce all ten vectors.

**2. The share-URL population estimates are modelled, not sourced.** `docs/share-url-contract.md` §6 states the derivation — a conservative 20,000,000 eligible base, a per-band share, and a divisor of 12 for the band-by-gap cell — and carries an explicit **PENDING VERIFICATION** note. A figure traceable to Eurostat and the Directive's own scope thresholds must replace the model before the card ships in Phase 4, and if it puts any band under 25,000 the band is widened rather than the floor lowered. Recorded in `.planning/WINDOWS.md`.

**3. The single-number reduction on metrics (e), (f) and (g)** is an authoring decision forced by `MetricValue` carrying one nullable number. It is documented in `ENGINE-REPORT.md` and flagged there as the most likely thing in this plan to need amending once the engine and the export exist. Recorded in `.planning/WINDOWS.md`.

None of the three prevents this plan's goal. The first is the goal.

## Threat Flags

None. No new network endpoint, auth path or file-access pattern was introduced. The one trust boundary this plan touches — the transmitted share URL — is the subject of `T-1-03`, `T-1-20` and `T-1-21` in the plan's own register and all three mitigations are implemented and asserted. `T-1-SC` holds: no package was installed, the lockfile did not move, and `dependencies` is `{}`.

## Issues Encountered

None outstanding. The checkpoint pause was the designed flow, not a failure.

## Next Phase Readiness

Ready for **01-07**, which re-derives all ten vectors independently. It inherits:

- Ten `input.json` / `conventions.json` pairs, each self-contained and twelve rows or fewer.
- `docs/CONVENTIONS.md` and `docs/ENGINE-REPORT.md` as the *only* other inputs it needs — every interpretive rule the first pass applied is written in one of those two files, including the five that vector authoring forced. A rule that lived only in this executor's head would make re-derivation impossible rather than independent.
- A structural suite that already guarantees completeness, so 01-07 can spend its whole budget on arithmetic.

**What 01-07 must not do:** read any `expected.json`. A disagreement between the two passes is a defect in the *wording of a convention* and the fix goes to the document, never to either number.

`ENG-01` and `ENG-06` are **not** marked complete: plan 01-07 also declares them and has no SUMMARY yet, so the shared-ID gate correctly held them back. Only `GAP-06` was marked.

## Self-Check: PASSED

- All 13 named source, document and test files verified present with `ls`; all ten vector directories present, each with exactly its three JSON files (`10 0` from the plan's own probe).
- All 7 commits verified in `git log 1c9408d..HEAD`.
- `commits: 7` is **measured** (`git rev-list --count`), not narrated, against the ledger base recorded before the first commit.
- Plan-level verification re-run at close: conventions **20 passed**, share-URL **19 passed**, vectors **12 passed**, whole suite **82 passed**, `pnpm typecheck` exit 0, `package.json` reports `license=MIT deps={}`, `grep -c adversarial docs/share-url-contract.md` prints `2`.
- Acceptance criterion checked by grep: **no file under `packages/directive-engine/` other than the ten `expected.json` files contains any of the computed answers** — searched for every distinctive derived value across the package, zero hits outside the vectors' expected files.
