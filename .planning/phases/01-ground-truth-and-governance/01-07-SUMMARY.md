---
phase: 01-ground-truth-and-governance
plan: 07
subsystem: directive-engine
tags: [golden-vectors, article-9, conventions, d-13, independent-rederivation]
status: complete

requires:
  - 01-06-frozen-contracts
  - 01-03-directive-corpus
provides:
  - Ten independently produced second-pass answer sets, one per golden vector
  - "`pnpm rederive:vectors` — a comparison gate that computes nothing and exits non-zero on any disagreement"
  - Three ambiguous conventions tightened to admit exactly one reading, plus six recorded despite agreement
  - "The engine-to-data link proved: every definitionCite resolves to a paragraph the stored corpus actually holds"
affects:
  - Phase 6 engine implementation, which is built against these vectors
  - "`EngineReport` contract — three D-16 amendments recommended, none applied"

tech-stack:
  added: []
  patterns:
    - "A verification tool that deliberately computes nothing, asserted by a test over its own source"
    - "Ambiguities recorded per vector and surfaced in the report even when the two answers agree"
    - "`resolutions` blocks making a settled disagreement auditable rather than a silently changed number"

key-files:
  created:
    - packages/directive-engine/vectors/v01-quartile-boundary-ties/rederived.json
    - packages/directive-engine/vectors/v02-n-mod-4-zero/rederived.json
    - packages/directive-engine/vectors/v03-n-mod-4-one/rederived.json
    - packages/directive-engine/vectors/v04-n-mod-4-two/rederived.json
    - packages/directive-engine/vectors/v05-n-mod-4-three/rederived.json
    - packages/directive-engine/vectors/v06-single-woman-category/rederived.json
    - packages/directive-engine/vectors/v07-all-male-category/rederived.json
    - packages/directive-engine/vectors/v08-negative-gap/rederived.json
    - packages/directive-engine/vectors/v09-zero-variable-components/rederived.json
    - packages/directive-engine/vectors/v10-unmapped-sex/rederived.json
    - packages/directive-engine/scripts/rederive.ts
    - packages/directive-engine/test/rederivation.test.ts
  modified:
    - packages/directive-engine/docs/CONVENTIONS.md
    - packages/directive-engine/test/vectors-wellformed.test.ts
    - packages/directive-engine/tsconfig.tools.json
    - pnpm-lock.yaml

key-decisions:
  - "Metric (e)'s single scalar is the MALE proportion minus the FEMALE proportion in percentage points, not an overall proportion — every other position in the report is a female-versus-male comparison"
  - "Metric (f)'s single scalar is the female share of the HIGHEST quartile band, attributable to the national guidance the quartile keys already cite"
  - "The Art. 10(1) five-percent trigger tests the MAGNITUDE of the gap; Art10Flag.gapPct carries the signed value so direction is not lost"
  - "Percentages are exact where the division terminates within four decimal places, otherwise half-up to four; rounding is applied once, to the final percentage"
  - "A suppressed metric reports value null and its category does not appear in art10Flags, because Art10Flag.gapPct would republish the withheld figure"
  - "An unmapped-sex row is RANKED in the quartile bands but not COUNTED in the sex proportions; populationN is the sexed population"
  - "Three EngineReport limitations were surfaced for a human D-16 decision rather than amended autonomously"

requirements-completed: [ENG-01, ENG-06]

coverage:
  - deliverable: "Ten independently produced second-pass answer sets, derived without reading the first pass"
    verification:
      - kind: command
        ref: "node -e '...' over vectors/*/rederived.json — 10 of 10 parse with working and ambiguities"
        status: pass
      - kind: test
        ref: "packages/directive-engine/test/vectors-wellformed.test.ts"
        status: pass
    human_judgment: true
    rationale: "Whether the second pass genuinely reasoned independently rather than paraphrasing the first is a judgement no assertion can make. The plan's own human-check asks for it; see Independence below, which reports one partial contamination honestly."
  - deliverable: "A comparison tool that computes nothing and gates on disagreement"
    verification:
      - kind: test
        ref: "packages/directive-engine/test/rederivation.test.ts#the comparison tool computes nothing"
        status: pass
      - kind: command
        ref: "pnpm rederive:vectors — exit 0, 10 of 10 agree, 45 ambiguities surfaced"
        status: pass
    human_judgment: false
  - deliverable: "Three ambiguous conventions tightened so each admits exactly one reading"
    verification:
      - kind: test
        ref: "packages/directive-engine/test/conventions-documented.test.ts"
        status: pass
    human_judgment: true
    rationale: "Whether a re-worded convention now admits exactly ONE reading is a judgement about prose. The test proves the document's structural invariants survived, not that the wording is unambiguous."
  - deliverable: "Every definitionCite resolves against the stored Directive corpus at paragraph granularity"
    verification:
      - kind: test
        ref: "packages/directive-engine/test/rederivation.test.ts#every definitionCite resolves against the stored Directive corpus"
        status: pass
    human_judgment: false

duration: 26 min
completed: 2026-09-11

actuals:
  tokens: 96000
  tasks: 2
  commits: 6
  plan_head_before: ffe8ecd7388a5c8129cccfb4d73b6d56ecfdd5a4
---

# Phase 1 Plan 07: Independent Vector Re-derivation Summary

Ten golden vectors re-derived by hand from their rows and conventions alone; the two passes
disagreed on exactly three things, all three already flagged as ambiguous by the second pass
before it saw the first, and every one was fixed in the convention wording rather than in a number.

## Per-vector verdict

Final state: **10 of 10 agree**, `pnpm rederive:vectors` exits 0.

Before the convention fixes, **every one of the ten vectors disagreed**. The disagreements were
confined to three positions:

| Vector | metric (e) | metric (f) | art10Flags | Everything else |
|---|---|---|---|---|
| v01 quartile-boundary-ties | 0 vs 100 | 50 vs 66.6667 | agreed | agreed |
| v02 n-mod-4-zero | 0 vs 100 | 0 vs 50 | agreed | agreed |
| v03 n-mod-4-one | 0 vs 100 | 0 vs 66.6667 | agreed | agreed |
| v04 n-mod-4-two | 0 vs 100 | 0 vs 66.6667 | agreed | agreed |
| v05 n-mod-4-three | 0 vs 100 | 50 vs 66.6667 | agreed (both empty) | agreed |
| v06 single-woman-category | 0 vs 100 | 0 vs 100 | agreed | agreed |
| v07 all-male-category | 0 vs 100 | 0 vs 100 | agreed | agreed |
| v08 negative-gap | 0 vs 100 | 100 vs 0 | **[Research −25] vs []** | agreed |
| v09 zero-variable-components | **agreed (0)** | 0 vs 100 | agreed | agreed |
| v10 unmapped-sex | 0 vs 100 | 0 vs 100 | agreed | agreed |

(First value is the first pass, second is the re-derivation.)

**What agreed is the more important result.** Across all ten vectors the two passes matched
exactly on metrics (a), (b), (c), (d) and every per-category (g) entry, on every `populationN`,
`excludedN`, `suppressed` and `unreliable` field, and on every warning code. That includes:

- Every quartile band membership on all ten vectors — the same remainder distribution (3/2/2/2,
  3/3/2/2, 3/3/3/2, 2/2/1/1), the same handling of the single-sex ties, and the same fractional
  proportional split of v01's 2F:1M tie straddling Q1/Q2 (1.3333 F and 0.6667 M into Q1). The two
  passes reported *different bands* from *identical bands*.
- v06's suppressed Engineering entry: `null`, `suppressed: true`, `unreliable: true`, with both
  warning codes and with Engineering omitted from `art10Flags`.
- v07's `null` for the all-male Warehouse category, with both flags `false`.
- v09's `0` rather than `null` for the degenerate component metrics, with `W_COMPONENTS_ALL_ZERO`.
- v10's `populationN: 5, excludedN: 1`, and independently, the reasoning that the unmapped row
  still occupies its place in the pay ranking.
- The rounding rule, which neither document recorded: both passes independently chose "exact where
  the division terminates within four decimal places, otherwise half-up to four".

## Ambiguities the second pass recorded

45 ambiguity entries across the ten files, reducing to nine distinct questions. **Three produced
an actual disagreement; six were recorded even though both passes happened to agree** — which is
the point of recording them, since agreement reached by two parties making the same unstated
assumption is not a specification.

| # | Convention key named | Question | Disagreed? |
|---|---|---|---|
| 1 | `componentMap` | What metric (e)'s single scalar denotes | **yes** |
| 2 | `quartileTieRule` | Which quartile band metric (f)'s single scalar reports | **yes** |
| 3 | `denominator` | Whether the Art. 10(1) trigger is signed or magnitude | **yes** |
| 4 | `componentMap` | Scope of metrics (a) and (c): total pay or basic only | no |
| 5 | `denominator` (no key exists) | Rounding and reported precision | no |
| 6 | `minGroupSize` | Whether suppression nulls the value; whether a suppressed category is flagged; that `unreliable` has no threshold of its own | no |
| 7 | `sexMapping` | Whether a one-sex category is also unreliable or suppressed | no |
| 8 | `componentMap` | Whether `W_COMPONENTS_ALL_ZERO` attaches to metric (e) | no |
| 9 | `sexMapping` | Whether an unmapped row is ranked; what `populationN` counts | no |

## Conventions tightened — before and after

Each is recorded in `docs/CONVENTIONS.md` under a **Settled by re-derivation (plan 01-07)**
heading naming both readings, which now governs, and why.

### 1. Metric (e)'s scalar — `componentMap`

- **Before:** nothing. `Metrics.e` is a single `MetricValue` and Art. 9(1)(e) names the proportion
  of female **and** male workers. The document did not say what the one scalar denotes.
- **Pass 1 read:** the percentage-point difference between the two proportions.
- **Pass 2 read:** the overall proportion of workers receiving a component.
- **Now reads:** the **MALE proportion minus the FEMALE proportion, in percentage points**,
  positive meaning men are the more likely to receive components.
- **Why:** every other metric position in the report is a female-versus-male comparison expressed
  against the male figure. A bare overall proportion would be the only figure in the report that is
  not a comparison. The re-derivation's counter-argument — that v09's "legitimate ZERO" only
  distinguishes it from the other nine under the proportion reading — was examined and rejected:
  v09's case text contrasts zero with **null**, not zero with a non-zero.

### 2. Metric (f)'s scalar — `quartileTieRule`

- **Before:** nothing. `Metrics.f` is a single `MetricValue` and Art. 9(1)(f) names eight figures.
- **Pass 1 read:** the highest band's female share.
- **Pass 2 read:** the lowest band's female share.
- **Now reads:** the **female share of the HIGHEST (fourth) quartile pay band**, as a percentage.
- **Why:** it is the headline quartile statistic in the same national guidance document
  `quartileTieRule` already borrows its tie rule from, so the choice is **attributable** rather than
  invented — which is the entire reason that document is cited. The argument for the lowest band was
  about which band these particular vectors exercise: test coverage, not meaning.

### 3. The Art. 10(1) trigger and a negative gap — `denominator`

This is the only disagreement in the set that changed an **outcome** rather than a number.

- **Before:** nothing. Art. 10(1) speaks of "a gender pay gap of at least 5 %" and the document did
  not say whether that reads the signed figure or its magnitude.
- **Pass 1 read:** magnitude — Research flagged at `gapPct: −25`.
- **Pass 2 read:** signed — `−25` is not "at least 5", so no flag.
- **Now reads:** **magnitude**; `Art10Flag.gapPct` carries the **signed** value.
- **Why:** Art. 10(1) is engaged by a *difference* in average pay level of at least 5 %, and a
  difference of 25 % is a difference of 25 % whichever sex it favours. The signed reading would
  silently exempt every category in which men are the underpaid group. The re-derivation's objection
  — that a bare `gapPct` in an Art. 10 context invites being read as a disadvantage to women — is
  answered by preserving the sign in the flag, not by refusing to raise it.

### 4–9. Recorded despite agreement

Summarised, all in `CONVENTIONS.md`:

- **`componentMap`** — metrics (a), (c), (f), (g) run over **total pay**; (b) and (d) over the
  complementary components alone. The `payBasis` sentence saying Art. 9(1)(a)–(d) report the two
  sides "separately" is what made a basic-only reading available and is now explicitly disclaimed.
- **`denominator`** — rounding: exact where the division terminates within four decimal places,
  otherwise half-up to four; applied **once**, to the final percentage, never to an intermediate
  mean or median; for a negative figure the magnitude is rounded and the sign reapplied. Labelled
  `project_invented` in words, since the heading's `Default origin:` line attributes the denominator
  decision only.
- **`minGroupSize`** — a suppressed metric reports `value: null`; a suppressed category does **not**
  appear in `art10Flags`; `unreliable` currently shares suppression's condition because no separate
  statistical threshold is recorded anywhere.
- **`sexMapping`** — a one-sex category is `null` with `W_CATEGORY_ALL_ONE_SEX` and **both** flags
  `false`; an unmapped row is **ranked but not counted**, `populationN` is the sexed population, and
  an unmapped value is not `other` or `undisclosed`.
- **`componentMap`** — `W_COMPONENTS_ALL_ZERO` attaches to metrics (b) and (d) only.

## Citation keys collected and resolved

**153 citation occurrences** collected from the report type and from all twenty answer files,
reducing to **two distinct keys**. Both resolve, at paragraph granularity:

| Key | Corpus entry | Paragraph present |
|---|---|---|
| `32023L0970#003.001` | `32023L0970#003@eng` | yes |
| `32023L0970#009.001` | `32023L0970#009@eng` | yes |

The corpus is keyed by **article** and language (`32023L0970#003@eng`) while a `definitionCite`
names a **paragraph** (`32023L0970#003.001`), so resolution goes through the article entry and then
looks the paragraph up inside `value.paragraphs`. Resolving only as far as the article would let
`32023L0970#003.999` pass — asserted directly in the test. Citations quoted inside `working`,
`ambiguities` or `resolutions` prose are deliberately not collected: a reference is not a claim the
report makes.

**No entry was added to `packages/country-data/data/_directive.json`.** The file is untouched by
this plan; `git status` confirms it. This is the plan's own prohibition — an unresolved citation is
fixed in the citation, never by extending the corpus to match it.

## Did the independence instruction hold? — one partial contamination, reported

**It held for every answer. It did not hold completely for the conventions, and that is reported
here rather than concealed.**

What held:

- No `expected.json` was opened, grepped or otherwise read before all ten `rederived.json` files
  were written and committed (commit `5a52f33`). The first read of a first-pass answer is in the
  Task 2 work that follows it.
- `01-06-SUMMARY.md` was **not read at any point in this plan**. The executor's own
  `required_reading` listed it, and the plan's `<context>` block forbids it; the plan's prohibition
  was treated as governing and the conflict is reported here.
- No metric-computing code was written, imported or run. All arithmetic was done by hand and is
  written out in each vector's `working`.

**The contamination.** The orchestrator's dispatch prompt carried an `<upstream_context>` section
quoting two convention facts settled by plan 06: that `medianRule`'s origin is recorded
`project_invented` rather than `external_guidance`, and that `quartileRemainder`'s "leftovers to the
lower quarter" means one per quarter from the lowest upward rather than all into the first. Both
were in context before Task 1 began.

Assessment of the damage, stated plainly so a reader can judge it rather than take the conclusion:

- Both facts are **recorded in `docs/CONVENTIONS.md`**, which Task 1 names as required reading and
  as "the COMPLETE input to the re-derivation". The re-derivation would have read both regardless.
- Neither is an **answer**. Neither quotes a metric value, a quartile composition or a flag.
- The practical effect is nonetheless real: `quartileRemainder`'s one-per-quarter clarification was
  an ambiguity plan 06 found and resolved, and this pass therefore did **not** independently
  re-discover it. It is recorded here as a convention this pass cannot claim to have tested.

No contamination affects the three disagreements, which are the plan's substantive output.

**On whether the two passes reason independently** — the plan's human check. The two `working`
sections are structurally and stylistically different (a `step0`…`step11` narrative object against a
topic-keyed one) and reach the same answers by visibly different routes. But the passes also agree
on several unforced choices — the rounding rule to the decimal place, the fractional expression of
v01's proportional tie split — which is either convergence on the obvious answer or an unnoticed
common influence. **That judgement is a human's, and it is the plan's recorded human-check.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The committed `pnpm-lock.yaml` was two concatenated YAML documents**

- **Found during:** Task 1 verification, at the first attempt to run any test.
- **Issue:** The lockfile at the base commit held a stray first document (the pnpm self-install
  entry) joined to the real workspace lockfile by a `---` at line 101. pnpm rejects it outright with
  `ERR_PNPM_BROKEN_LOCKFILE: expected a single document in the stream, but found more`, so
  `pnpm install` fails in **any** fresh clone, worktree or CI runner. Existing checkouts never
  noticed because their `node_modules` was already populated — which is why a suite reported green
  at the base could coexist with a lockfile nothing could install from.
- **Fix:** dropped the stray first document. pnpm then reports "Lockfile is up to date, resolution
  step is skipped" against the remainder, confirming the second document was complete and correct.
  pnpm added the one missing importer entry, `packages/directive-engine: {}` — itself a confirmation
  that the package has zero dependencies.
- **No package version, specifier or resolution changed.** The diff is 101 deletions and 2 insertions.
- **Files modified:** `pnpm-lock.yaml`
- **Commit:** `e4b1f94`

**2. [Rule 3 — Blocking] `vectors-wellformed.test.ts` required exactly three files per vector**

- **Found during:** Task 1 verification.
- **Issue:** plan 06's structural test asserted each vector directory contains exactly
  `input.json`, `conventions.json`, `expected.json`. Adding `rederived.json` — this plan's entire
  deliverable, declared in its own frontmatter — failed it.
- **Fix:** `rederived.json` added as a **required** fourth file rather than tolerated as an optional
  extra, so a vector carrying only one set of answers now fails rather than passing quietly.
- **Files modified:** `packages/directive-engine/test/vectors-wellformed.test.ts`
- **Commit:** `5a52f33`

**3. [Rule 3 — Blocking] `scripts/` was outside every tsconfig project**

- **Found during:** Task 2, at `pnpm typecheck`.
- **Issue:** `tsconfig.tools.json` included `src` and `test` only, so importing `scripts/rederive.ts`
  from a test raised `TS6307`.
- **Fix:** added `scripts/**/*.ts` to the tools project — the development-only project, not the
  shipped one, so the published package's `rootDir` and `exports` are unaffected.
- **Files modified:** `packages/directive-engine/tsconfig.tools.json`
- **Commit:** `ed4ab03`

**4. [Rule 1 — Bug] The CLI's main-module guard could never match on Windows**

- **Found during:** Task 2, self-review before committing the tool.
- **Issue:** the entry guard compared `import.meta.url` against a hand-built
  `` `file://${argv[1]}` ``. A Windows path yields `file:///C:/...` with three slashes, so the guard
  would never fire and `pnpm rederive:vectors` would exit 0 having done nothing — silent success,
  the worst possible failure mode for a gate.
- **Fix:** use `pathToFileURL(process.argv[1]).href`. Verified: the CLI prints its report and
  returns a real exit code.
- **Files modified:** `packages/directive-engine/scripts/rederive.ts`
- **Commit:** `ed4ab03`

**Total deviations:** 4 auto-fixed (3 blocking, 1 bug). **Impact:** two of them — the lockfile and
the well-formedness test — blocked all verification and would have blocked CI and every future fresh
clone. None changed a vector answer or a convention decision.

## Recommendations deliberately NOT applied — for a human D-16 decision

The re-derivation surfaced three limitations in the **frozen `EngineReport` contract** itself. Each
is written up here rather than amended, because D-16 makes a frozen-contract amendment a decision to
be taken deliberately, not a side effect of a verification plan.

1. **`Metrics.e` and `Metrics.f` cannot carry what Art. 9(1) asks for.** (e) needs two figures and
   (f) needs eight; both are single `MetricValue`s. The settled readings above make the scalars
   *defined*, not *sufficient* — **seven of (f)'s eight figures are unreportable**, and a national
   filing needs all four bands. The full compositions are preserved in each vector's `working`.
   Metric (g) has the same shape problem one level down: its label promises a breakdown by basic and
   complementary components that one `MetricValue` per category cannot hold.
2. **The `Conventions` type has no key for four decisions this plan had to record** — rounding,
   the (e)/(f) scalar semantics, the Art. 10(1) sign, and suppression's interaction with the rest of
   the report. They are filed under the nearest existing key because the document must carry exactly
   the eleven `CONVENTION_KEYS` headings in order. That is a workaround and is labelled as one.
3. **`unreliable` has no threshold of its own**, so it can only fire where suppression fires. The
   consequence is uncomfortable and is stated in the document: the separation `MetricValue` insists
   on is **asserted but never exercised** by any vector in which one flag fires and the other does not.

## Known gaps in the vector set

- **Metric (e) now reads `0` in all ten vectors.** Under the settled reading every vector gives both
  sexes identical access to components, so the position does not vary across the whole golden set
  and is therefore not specified by it. **An eleventh vector is recommended**: a workforce where only
  some workers receive components, split unevenly by sex, exercising a non-zero value *and its sign*
  — the sign is currently untested in either direction.
- **v10 cannot distinguish the two readings of the unmapped-row ranking question.** Under both the
  settled highest-band rule and the rejected lowest-band one, the reported scalar is the same whether
  the unmapped worker is ranked or struck. The rule is settled in the document, not by evidence from
  these rows.
- **Suppression is reachable in exactly one vector** (v06, the only one with a non-null
  `minGroupSize`), so every suppression behaviour recorded above rests on a single case.

These are recorded in `.planning/WINDOWS.md` where the ledger accepts them.

## Self-Check: PASSED

- All 12 created files verified present on disk.
- All 5 commits verified in `git log`: `e4b1f94`, `5a52f33`, `d54e525`, `ed4ab03`, `f64e98e`.
- `pnpm test` — **276 passed, 0 failed** (12 files). Base was 257; this plan adds 19.
- `pnpm typecheck` (`tsc -b`) — exit 0.
- `pnpm rederive:vectors` — exit 0, 10 of 10 vectors agree, 45 ambiguities surfaced.
- `pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts` — 20 passed.
- `packages/directive-engine/package.json` still declares `"dependencies": {}` and MIT.
- `packages/country-data/data/_directive.json` unmodified; no `expected.json` modified.

## Next

Phase 1 plan 07 complete. The golden vectors now carry two independently produced passes that
agree, and are ready to serve as Phase 6's executable specification — subject to the three
contract recommendations above, which should be decided before the engine is written against them.
