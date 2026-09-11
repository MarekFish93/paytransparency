---
phase: 01-ground-truth-and-governance
plan: 06
type: execute
wave: 2
depends_on: [01-01-cellar-spine]
files_modified:
  - packages/directive-engine/package.json
  - packages/directive-engine/tsconfig.json
  - packages/directive-engine/README.md
  - packages/directive-engine/src/types.ts
  - packages/directive-engine/src/share-url-contract.ts
  - packages/directive-engine/docs/CONVENTIONS.md
  - packages/directive-engine/docs/ENGINE-REPORT.md
  - docs/share-url-contract.md
  - packages/directive-engine/vectors/v01-quartile-boundary-ties/input.json
  - packages/directive-engine/vectors/v01-quartile-boundary-ties/conventions.json
  - packages/directive-engine/vectors/v01-quartile-boundary-ties/expected.json
  - packages/directive-engine/vectors/v02-n-mod-4-zero/input.json
  - packages/directive-engine/vectors/v02-n-mod-4-zero/conventions.json
  - packages/directive-engine/vectors/v02-n-mod-4-zero/expected.json
  - packages/directive-engine/vectors/v03-n-mod-4-one/input.json
  - packages/directive-engine/vectors/v03-n-mod-4-one/conventions.json
  - packages/directive-engine/vectors/v03-n-mod-4-one/expected.json
  - packages/directive-engine/vectors/v04-n-mod-4-two/input.json
  - packages/directive-engine/vectors/v04-n-mod-4-two/conventions.json
  - packages/directive-engine/vectors/v04-n-mod-4-two/expected.json
  - packages/directive-engine/vectors/v05-n-mod-4-three/input.json
  - packages/directive-engine/vectors/v05-n-mod-4-three/conventions.json
  - packages/directive-engine/vectors/v05-n-mod-4-three/expected.json
  - packages/directive-engine/vectors/v06-single-woman-category/input.json
  - packages/directive-engine/vectors/v06-single-woman-category/conventions.json
  - packages/directive-engine/vectors/v06-single-woman-category/expected.json
  - packages/directive-engine/vectors/v07-all-male-category/input.json
  - packages/directive-engine/vectors/v07-all-male-category/conventions.json
  - packages/directive-engine/vectors/v07-all-male-category/expected.json
  - packages/directive-engine/vectors/v08-negative-gap/input.json
  - packages/directive-engine/vectors/v08-negative-gap/conventions.json
  - packages/directive-engine/vectors/v08-negative-gap/expected.json
  - packages/directive-engine/vectors/v09-zero-variable-components/input.json
  - packages/directive-engine/vectors/v09-zero-variable-components/conventions.json
  - packages/directive-engine/vectors/v09-zero-variable-components/expected.json
  - packages/directive-engine/vectors/v10-unmapped-sex/input.json
  - packages/directive-engine/vectors/v10-unmapped-sex/conventions.json
  - packages/directive-engine/vectors/v10-unmapped-sex/expected.json
  - packages/directive-engine/test/vectors-wellformed.test.ts
  - packages/directive-engine/test/conventions-documented.test.ts
  - packages/directive-engine/test/share-url-contract.test.ts
autonomous: false
requirements: [ENG-01, ENG-06, GAP-06]

estimate:
  tokens: 72000
  raw_tokens: 72000
  tasks: 4
  confidence: low

must_haves:
  truths:
    - "Every key of the Conventions block has a recorded decision in the convention document stating whether the Directive fixes it, is silent on it, or sets no value at all; conventions-documented.test.ts fails when a key exists in the type with no corresponding recorded decision, and when a decision exists for a key the type does not have"
    - "A pay value sitting exactly on a quartile boundary is assigned by the recorded quartile tie rule, and the remainder when the headcount does not divide by four goes to the recorded remainder side; both are labelled in the document as project conventions and not as Directive rules"
    - "An empty Conventions block, or any single missing key, fails vectors-wellformed.test.ts; there is no default fill and no partial acceptance, because the Directive is genuinely silent on several of these and vendors disagree"
    - "The Conventions keys are enumerated in one fixed order in the type and in the same order in the document, and conventions-documented.test.ts asserts the two orders are equal so a future key cannot be appended to one without the other"
    - "A lifetime total sitting exactly on a bucket boundary falls into the lower bucket — boundaries are inclusive on the lower side and exclusive on the upper — and a value below the first boundary or above the last falls into the named end buckets rather than out of range"
    - "The gap percentage transmitted in a share URL is produced by exactly one function, used by both the result page and the card renderer, so the card can never contradict the page; the rounding mode is stated numerically in the contract and asserted at a tie value"
    - "The transmitted parameter set is exhaustive and closed: a contract test enumerates it and fails if any key naming a country, sector, seniority, age, employer, salary or date is present, and fails if a key not on the list is added"
    - "Every golden vector directory carries its own input rows, its own complete Conventions block and its own expected values; there is no single canonical expected file shared across vectors, because the same input under different conventions is a different correct answer"
    - "The ten pathological cases are each present as their own vector: ties spanning a quartile boundary, headcounts leaving each of the four possible remainders on division by four, a category containing one woman, an all-male category, a negative gap, zero variable components, and a worker whose sex value is unmapped"
    - "Each vector is small enough to be recomputed by hand on paper, which is what makes independent re-derivation possible at all"
  artifacts:
    - path: "packages/directive-engine/src/types.ts"
      provides: "The frozen EngineReport contract as types only — no Article 9 arithmetic is written in this phase"
      exports: ["MetricValue", "Conventions", "ConventionSource", "EngineReport", "Art10Flag", "PublishableSets", "EngineWarning", "CONVENTION_KEYS"]
      contains: "conventionSource"
    - path: "packages/directive-engine/src/share-url-contract.ts"
      provides: "The single shared implementation of the transmitted parameter set, the bucket table and the rounding rule"
      exports: ["SHARE_CONTRACT_VERSION", "TRANSMITTED_KEYS", "SHARE_BUCKETS", "roundGapPct", "bucketLifetime"]
    - path: "packages/directive-engine/docs/CONVENTIONS.md"
      provides: "One recorded decision per Conventions key, each stating the Directive's position and the project's default"
    - path: "packages/directive-engine/docs/ENGINE-REPORT.md"
      provides: "The frozen contract narrative plus the recorded amendment path"
      contains: "amendment"
    - path: "docs/share-url-contract.md"
      provides: "The versioned share-URL specification: transmitted set, bucket table, rounding rule, fragment contract, preview obligation, k-anonymity floor, adversarial read"
    - path: "packages/directive-engine/vectors/v01-quartile-boundary-ties/expected.json"
      provides: "First-pass hand-computed expected values for the quartile-tie vector, to be independently re-derived in plan 07"
    - path: "packages/directive-engine/test/share-url-contract.test.ts"
      provides: "The closed transmitted-set assertion, the boundary cases and the rounding tie case"
  key_links:
    - from: "packages/directive-engine/src/types.ts"
      to: "packages/country-data/data/_directive.json"
      via: "every MetricValue.definitionCite is a citation key that must resolve against the stored Directive corpus, which is what makes the engine and the data layer non-driftable"
      pattern: "definitionCite"
    - from: "packages/directive-engine/docs/CONVENTIONS.md"
      to: "packages/directive-engine/src/types.ts"
      via: "conventions-documented.test.ts asserts the document's decision headings and the type's CONVENTION_KEYS are equal as ordered lists"
      pattern: "CONVENTION_KEYS"
    - from: "docs/share-url-contract.md"
      to: "packages/directive-engine/src/share-url-contract.ts"
      via: "the specification's bucket table and rounding rule are implemented once and imported by both the page and the card"
      pattern: "SHARE_BUCKETS|roundGapPct"
  prohibitions:
    - "MUST NOT silently default a calculation convention the Directive does not settle — part-time and full-time-equivalent normalisation in particular has no default and must throw with a named code, because vendors assert it as if it were law and an HR user has to be able to defend the figure to their own auditor"
    - "MUST NOT present a project convention as a Directive rule; every recorded decision states plainly whether the Directive fixes the point, is silent on it, or sets no value at all, and a silence recorded as a rule is the failure this document exists to prevent"
    - "MUST NOT place any country, sector, seniority, age, employer, salary figure or date in the transmitted part of a share URL — an edge function is a server with request logs, social platforms fetch the shared URL server-side so the recipient's platform sees the parameters too, and the analytics beacon reports the page URL"
    - "MUST NOT infer a worker category from a job title, and MUST NOT write a default small-group suppression threshold — categories are employer-defined by the Directive's own definition, and no EU-level numeric threshold exists"
    - "MUST NOT write Article 9 metric arithmetic in this phase; the vectors and the report type are the executable specification the engine must later satisfy, and an implementation written now would be written against itself"
---

<objective>
Record the three decisions that are expensive to change later as data with no engine code: the frozen
`EngineReport` contract with its amendment path, one recorded decision per calculation convention, and
the versioned share-URL parameter contract with its bucket table and rounding rule.

Purpose: each of these is a contract that other things are built against rather than a thing that can
be refactored. The engine, Module D, the national adapters and the published npm package all consume
`EngineReport`. The design system's share-card family (Phase 2) and the card renderer (Phase 4) both
consume the share-URL contract, and a share URL is a public artefact that persists in social-media
caches and edge-worker logs — narrowing a bucket later cannot retract what was already transmitted,
and widening one breaks existing links. Writing the vectors before the engine is what makes a
disagreement surface as an ambiguous convention rather than as a bug report in Phase 6.

Output: types, two contract documents, one specification document, ten golden vectors with
hand-computed first-pass expected values, and three test files.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/phases/01-ground-truth-and-governance/01-CONTEXT.md
@.planning/phases/01-ground-truth-and-governance/01-RESEARCH.md
@.planning/phases/01-ground-truth-and-governance/01-VALIDATION.md
@.planning/research/PITFALLS.md
@.planning/research/STACK.md
@.planning/phases/01-ground-truth-and-governance/01-01-SUMMARY.md
</context>

<flagged_assumptions>
## Planner assumptions surfaced, not silently resolved

**Unresolved edge — ENG-01, classification `unclassified`.** The deterministic edge probe could not
classify ENG-01 into any shape category, and this plan does NOT auto-resolve it with a backstop.
ENG-01 asserts an ordering between two artefacts ("vectors and the type exist before any engine code
is written"), which is a process property rather than a data shape, so no boundary, adjacency,
encoding or ordering question applies to it directly. Two open questions are recorded here for a
human rather than answered by the planner:
 1. What counts as "engine code" for the purpose of the ordering? This plan draws the line at Article 9
    metric arithmetic: the two pure share-URL contract functions ARE written here, because the rounding
    rule has to be implemented once or "the engine and the card round identically" is prose rather than
    a property. A reviewer who draws the line differently should say so before Phase 6.
 2. Is the ordering a phase-boundary property (nothing in `packages/directive-engine/src` computes a
    metric before Phase 6) or a commit-order property within Phase 6? This plan implements the first
    reading. Plan 05 does not add a CI rule enforcing either, because inventing an enforcement for an
    unclassified requirement would be the planner deciding it rather than surfacing it.
</flagged_assumptions>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Freeze the EngineReport contract and record one decision per calculation convention</name>
  <reversibility rating="costly">`EngineReport` is the contract Module D, the national adapters and the published npm package all consume, so a change touches every consumer — but D-16 froze it WITH a recorded amendment path, and an amendment applied to the type, the convention document and the vectors together is a coordinated change rather than a migration. That amendment path is what keeps this costly rather than one-way, so it must actually be written down.</reversibility>
  <files>packages/directive-engine/package.json, packages/directive-engine/tsconfig.json, packages/directive-engine/README.md, packages/directive-engine/src/types.ts, packages/directive-engine/docs/CONVENTIONS.md, packages/directive-engine/docs/ENGINE-REPORT.md, packages/directive-engine/test/conventions-documented.test.ts</files>
  <read_first>
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Frozen Contracts" → "`EngineReport` — what must be in the frozen type" — the minimum shape including conventionSource and the separate suppression and reliability flags
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Calculation conventions that must be recorded as decisions in Phase 1" — the nine-row table stating, per convention, whether the Directive fixes it or is silent
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Art. 3(1) definitions and Art. 9(1) metrics" — the verbatim definitions that fix the denominator, the quartile construction, the category definition and the reference period
    - .planning/research/PITFALLS.md § "Pitfall 6" — the sixteen Article 9 traps that constrain the contract
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-14 and D-16 — the documented-default-plus-override-plus-echo rule, and the frozen-with-an-amendment-path rule
    - .claude/CLAUDE.md — the MIT licence for this package and the zero-runtime-dependencies rule
  </read_first>
  <behavior>
    - Test: every key in `CONVENTION_KEYS` has a matching recorded decision heading in the convention document, asserted by set equality so a missing decision and an orphan decision both fail with the offending key named
    - Test: the ordered list of `CONVENTION_KEYS` equals the ordered list of decision headings in the document, so a key appended to one but not the other fails
    - Test: every recorded decision states one of exactly three Directive positions — fixed, silent, or no EU value exists — and a decision stating none of them fails
    - Test: the decision for part-time and full-time-equivalent normalisation records no default and records that a missing value throws
    - Test: the decision for small-group suppression records a null default and records that no EU-level numeric threshold exists
    - Test: every `MetricValue` position in the report type declares a `definitionCite`, and each cited key resolves against the stored Directive corpus
  </behavior>
  <action>
Create `packages/directive-engine` as a package that ships MIT with ZERO runtime dependencies. Its
`package.json` declares `"license": "MIT"`, `"type": "module"`, an `exports` map with `types` listed
first, `"files"` covering the built output, the vectors and the docs, and an EMPTY `dependencies`
object. ESM only — `require(esm)` is stable on the supported Node line and the package is fully
synchronous, so a dual build would buy the dual-package hazard for nothing. The root repository is
AGPL; this package is the MIT lead magnet, and the boundary is proved mechanically in Phase 6.

`packages/directive-engine/src/types.ts` holds TYPES ONLY. No Article 9 arithmetic is written in this
phase — the vectors and this type are the executable specification the engine must later satisfy, and
an implementation written now would be written against itself.
 - `MetricValue`: `value` nullable number; `definitionCite` a citation key resolving to a stored
   Directive quotation; `populationN`; `excludedN`; `suppressed` for privacy suppression; `unreliable`
   for statistical reliability. Keep those last two SEPARATE — an HR user must be able to tell "we
   cannot show this because it would identify someone" from "this number is too noisy to trust", and
   collapsing them into one flag loses the distinction the export has to carry.
 - `Conventions`: every field REQUIRED, no optionals and no defaults — `denominator`, `medianRule`,
   `quartileTieRule`, `quartileRemainder`, `payBasis`, `partialPeriodPolicy`, `joinerLeaverPolicy`,
   `sexMapping`, `componentMap`, `minGroupSize` nullable, `referencePeriod` as a from-to pair that must
   be a calendar year.
 - `CONVENTION_KEYS`: the ordered tuple of those key names, exported so the document and the type
   cannot drift apart.
 - `ConventionSource`: a record mapping each convention key to `directive`, `caller` or
   `adapter_default`. This is D-14 made structural — every report says which convention produced the
   number, so a disagreement is a parameter rather than a bug report.
 - `EngineReport`: `engineVersion`; `directiveTextVersion` carrying the Cellar ETag the citations were
   verified against; `conventions`; `conventionSource`; the seven Art. 9(1) metrics with the per-category
   one keyed by category; `art10Flags` with the five-percent threshold; `publishable` splitting the
   self-publishable set from the authority-only one; `draft` literally true, because the Directive
   requires management confirmation and the export is always a draft; and `warnings`.

`packages/directive-engine/docs/CONVENTIONS.md` records ONE decision per convention key, in
`CONVENTION_KEYS` order, each stating: the Directive's position in one of exactly three words —
**fixed**, **silent**, or **none** — the quoted text that fixes it where it is fixed, the project's
recorded default, and whether an override is accepted. The substance, from the authentic text:
 - denominator: **fixed** by the gender-pay-gap and median-gender-pay-gap definitions, which both
   express the difference as a percentage of the male figure. Not a choice.
 - quartile construction: **fixed** by the quartile-pay-band definition as four equal groups of
   workers. Rank by pay, split by headcount, never by pay range. Not a choice.
 - category of workers: **fixed** by the definition making categories employer-defined and grouped on
   non-discriminatory objective gender-neutral criteria. Require a category column; refuse to infer one
   from a job title.
 - reference period: **fixed** as the previous calendar year; reject any non-calendar-year range.
 - even-count median: **silent**. Record the lower-of-two rule as the documented default and carry both
   behaviours in the vectors.
 - quartile boundary ties and the remainder side: **silent**. Record a proportional allocation with the
   remainder to the lower quarter, labelled plainly as a project convention and attributed to the
   national guidance it is borrowed from, not to the Directive.
 - part-time and full-time-equivalent normalisation: **silent**, and this is the flagship case. Record
   NO default. A missing value throws with a named code. Vendors assert normalisation as if it were
   law; the Directive states none, and an HR user has to be able to defend the figure to their auditor.
 - small-group suppression: **none** — no EU-level numeric threshold exists anywhere in the Directive.
   Default null, emitted in the export. The six-person figure that reached this project through the
   brief is a German national rule attached to the individual information right, not an Article 9
   reporting rule, and it belongs in `country-data` rather than here.
 - currency: not addressed. Record per country; no cross-currency aggregation in v1.

`packages/directive-engine/docs/ENGINE-REPORT.md` narrates the contract and — the part that makes the
freeze survivable — writes down the AMENDMENT PATH: an amendment is permitted when it is written up
with a stated reason and applied to the type, the convention document and the golden vectors TOGETHER,
in one change. Building the engine will surface something a data-only design could not see, and the
alternative to a recorded path is silent drift or an ugly workaround.
  </action>
  <acceptance_criteria>
    - `packages/directive-engine/package.json` declares `"license": "MIT"` and an empty `dependencies` object
    - `packages/directive-engine/src/types.ts` contains no function body that computes a metric — the file exports types and the `CONVENTION_KEYS` tuple only
    - `CONVENTION_KEYS` has exactly the eleven key names of the `Conventions` type, and `conventions-documented.test.ts` compares it to the document headings as an ordered list
    - `MetricValue` declares `suppressed` and `unreliable` as two separate boolean fields
    - `EngineReport` declares `draft` as the literal `true`, not as a boolean
    - `packages/directive-engine/docs/CONVENTIONS.md` contains exactly eleven decision headings, each carrying one of the three position words
    - The part-time decision records no default value and records a throwing behaviour; the suppression decision records a null default
    - `packages/directive-engine/docs/ENGINE-REPORT.md` contains an amendment-path section naming all three artefacts that must change together
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 6 cases are reported (one of the six behaviours was not registered)</fails_when>
    <automated>pnpm typecheck</automated>
    <fails_when>non-zero exit, or stderr contains `error TS`</fails_when>
  </verify>
  <done>The report contract is frozen with a written amendment path, and every convention key carries a recorded decision that states plainly whether the Directive fixes it, is silent on it, or sets no value at all.</done>
</task>

<task type="checkpoint:decision" gate="blocking-human">
  <decision>Fix the share-URL bucket boundaries, the rounding rule, and the k-anonymity floor</decision>
  <context>
    D-15 decided the principle: a share URL transmits wide buckets only — a bucketed lifetime total and
    a rounded gap percentage — with no country, sector, seniority or age signal, previewed to the worker
    before they press Share. What D-15 did not fix is the actual numbers, and the numbers are the part
    that is one-way.

    A share URL is a public artefact. It persists in social-media caches, in the edge worker's request
    log, and in the analytics beacon's page-URL field. Narrowing a bucket later cannot retract what was
    already transmitted; widening one breaks every link already shared. A version identifier in the URL
    is what makes a future change additive rather than breaking, but the version identifier does not
    undo the first transmission.

    Three values are being fixed now and inherited by the Phase 2 card family and the Phase 4 renderer:
    the lifetime-total bucket boundaries, the rounding rule for the gap percentage, and the k-anonymity
    floor — the minimum population each bucket must cover for the card to be non-identifying. Without
    the third, "wide buckets" is an aesthetic judgement rather than a checkable property, and the card
    family cannot be reviewed against it.
  </context>
  <options>
    <option id="coarse-5">
      <name>Five coarse lifetime buckets, gap rounded to the nearest 5 percentage points, k-floor 100000</name>
      <pros>Maximum privacy headroom. Each bucket covers a very large population in every member state, so the adversarial read of a worker log line reveals almost nothing. Survives being combined with a referrer, a timestamp and an IP address.</pros>
      <cons>The card says very little. A worker whose figure sits just inside a boundary sees a number that feels wrong for their situation, which costs shares and invites "this tool is inaccurate" replies.</cons>
    </option>
    <option id="medium-8">
      <name>Eight buckets on a roughly logarithmic scale, gap rounded to the nearest whole percentage point, k-floor 25000</name>
      <pros>The card is specific enough to be worth sharing while each bucket still covers a large population. A logarithmic scale keeps the relative resolution even across the range instead of crowding the low end.</pros>
      <cons>A whole-percentage-point gap combined with a narrow high-end bucket is more identifying at the top of the range, where fewer workers sit. Needs the top bucket to be open-ended.</cons>
    </option>
    <option id="fine-12">
      <name>Twelve linear buckets, gap rounded to one decimal place, k-floor 5000</name>
      <pros>The card most closely matches what the worker actually saw on the page, so the two never look inconsistent.</pros>
      <cons>A one-decimal gap plus a narrow bucket is a meaningful fingerprint. Combined with the share timestamp and the referring platform this is the option that would not survive an adversarial read of a Worker log, which is the specific thing this contract exists to survive.</cons>
    </option>
  </options>
  <resume-signal>Reply with `coarse-5`, `medium-8`, `fine-12`, or your own boundary table and k-floor.</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write the share-URL contract as a versioned specification and as one shared implementation</name>
  <reversibility rating="one-way">A transmitted share URL cannot be un-transmitted: it persists in social-media caches, in the edge worker's request log and in the analytics beacon. Narrowing a bucket later does not retract what was already sent, and widening one breaks links already shared. The preceding checkpoint is where the boundaries themselves are chosen; this task records the chosen values.</reversibility>
  <files>docs/share-url-contract.md, packages/directive-engine/src/share-url-contract.ts, packages/directive-engine/test/share-url-contract.test.ts</files>
  <read_first>
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Share-URL parameter contract" — the seven elements the contract must specify as data, including the k-anonymity floor and the worked adversarial read
    - .planning/research/PITFALLS.md § "Pitfall 7" — why an edge function is a server, why the recipient's platform also fetches the URL, and why the analytics beacon reports the page URL
    - .planning/research/STACK.md § "The one place 'zero egress' needs an honest asterisk" — the rounded-and-bucketed rule, the explicit-user-action rule, the request-logging rule and the README wording
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-15 — the transmitted set, the preview obligation and the accepted cost of a less specific card
    - .claude/CLAUDE.md § Constraints — the privacy constraint that no salary data may reach a server, ever
  </read_first>
  <behavior>
    - Test: `TRANSMITTED_KEYS` is a closed, frozen list; a test enumerates it and fails if any key name matches country, sector, seniority, age, employer, salary, pay, income, birth or date
    - Test: the test also fails if a key is present in a constructed share URL that is not in `TRANSMITTED_KEYS`, so the set is closed in both directions
    - Test: `bucketLifetime` at a value exactly on a boundary returns the LOWER bucket; one unit below and one unit above return the adjacent buckets
    - Test: `bucketLifetime` below the first boundary returns the named floor bucket and above the last returns the named open-ended ceiling bucket, never undefined and never out of range
    - Test: `roundGapPct` at an exact tie value rounds in the direction the contract states, and the test names that direction explicitly rather than asserting whatever the implementation happens to do
    - Test: `roundGapPct` on a negative gap returns a negative rounded value rather than clamping to zero, because a negative gap is a real result the card must be able to show honestly
    - Test: every bucket in `SHARE_BUCKETS` declares a population estimate at or above the chosen k-anonymity floor
    - Test: `SHARE_CONTRACT_VERSION` is present in the constructed URL, so a future boundary change is additive
  </behavior>
  <action>
Use the boundaries, rounding rule and k-anonymity floor chosen at the preceding checkpoint. If the
checkpoint selected a named option, use that option's values verbatim; if it supplied a custom table,
use the supplied table.

`docs/share-url-contract.md` is the versioned specification and must contain all seven elements:
 1. **The transmitted parameter set** — exhaustive and closed. A bucketed lifetime total, a rounded gap
    percentage, a locale, and the contract version. No country, no sector, no seniority, no age. A
    parameter not on this list appearing in a transmitted URL is a defect, not a feature.
 2. **The bucket boundary table** with an explicit version identifier, so a later change is additive.
 3. **The rounding rule** for the gap percentage, stated numerically including the tie direction.
 4. **The fragment contract** — which fields live after the fragment marker, with the note that a
    fragment is not sent in the HTTP request line and therefore never reaches the edge worker, the
    recipient's platform, or the analytics beacon. The worker's real inputs live here and only here.
 5. **The preview obligation** — the worker sees the exact transmitted URL, in full, before pressing
    Share. This is a product requirement Phase 4 must satisfy, recorded here because it is part of the
    contract rather than a UI nicety.
 6. **The k-anonymity floor** — the minimum population each bucket must cover, so "wide buckets" is a
    checkable property and Phase 2's card family can be reviewed against it.
 7. **A worked adversarial read** — one paragraph showing an actual edge-worker log line for a shared
    card and stating precisely what it does and does not reveal about the person who shared it. This is
    the artefact that answers the sharpest question the project will be asked in public, and writing it
    now is what forces the boundaries to be honest.

`packages/directive-engine/src/share-url-contract.ts` implements the contract ONCE: `SHARE_BUCKETS` as
the boundary table, `roundGapPct` as the sole rounding function, `bucketLifetime` as the sole bucketing
function, `TRANSMITTED_KEYS` as the frozen closed set, and `SHARE_CONTRACT_VERSION`. Both the result
page and the card renderer import from here. This is deliberately the one piece of executable code in
this package before Phase 6: without it, "the engine and the card round identically" is a sentence in a
document rather than a property, and the first time they disagree the card will contradict the page the
worker just read. These two functions are pure, take no dependency, and compute no Article 9 metric, so
the zero-runtime-dependency property and the no-engine-code-yet property both hold.

State the rounding tie direction explicitly in both the document and the implementation, and assert it
at a tie value in the test. A rounding rule that is whatever the language's default happens to be is
not a recorded decision.
  </action>
  <acceptance_criteria>
    - `docs/share-url-contract.md` contains all seven numbered elements, including a worked adversarial read of a log line
    - `TRANSMITTED_KEYS` is frozen and contains no key whose name matches country, sector, seniority, age, employer, salary, pay, income, birth or date
    - `bucketLifetime` at each boundary value returns the lower of the two adjacent buckets, asserted for every boundary in `SHARE_BUCKETS`
    - `bucketLifetime` returns a named bucket for a value of zero and for a value ten times the largest boundary
    - `roundGapPct` at a tie value returns the value the document states, and the test asserts that specific number
    - `roundGapPct(-3.4)` returns a negative number
    - Every entry in `SHARE_BUCKETS` carries a population estimate greater than or equal to the chosen k-anonymity floor
    - `packages/directive-engine/src/share-url-contract.ts` imports nothing from outside the package
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/directive-engine/test/share-url-contract.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 8 cases are reported (one of the eight behaviours was not registered)</fails_when>
    <automated>grep -c 'adversarial' docs/share-url-contract.md</automated>
    <fails_when>prints `0` — the worked adversarial read is the element most likely to be dropped, and without it the boundaries were chosen without anyone modelling what a log line reveals</fails_when>
  </verify>
  <done>The transmitted parameter set is closed and enumerated, the buckets and the rounding rule exist once and are imported by everything that needs them, and the specification carries a worked adversarial read of what a shared URL actually reveals.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Author ten golden vectors with complete conventions and hand-computed first-pass answers</name>
  <files>packages/directive-engine/vectors/v01-quartile-boundary-ties/input.json, packages/directive-engine/vectors/v01-quartile-boundary-ties/conventions.json, packages/directive-engine/vectors/v01-quartile-boundary-ties/expected.json, packages/directive-engine/vectors/v02-n-mod-4-zero/input.json, packages/directive-engine/vectors/v02-n-mod-4-zero/conventions.json, packages/directive-engine/vectors/v02-n-mod-4-zero/expected.json, packages/directive-engine/vectors/v03-n-mod-4-one/input.json, packages/directive-engine/vectors/v03-n-mod-4-one/conventions.json, packages/directive-engine/vectors/v03-n-mod-4-one/expected.json, packages/directive-engine/vectors/v04-n-mod-4-two/input.json, packages/directive-engine/vectors/v04-n-mod-4-two/conventions.json, packages/directive-engine/vectors/v04-n-mod-4-two/expected.json, packages/directive-engine/vectors/v05-n-mod-4-three/input.json, packages/directive-engine/vectors/v05-n-mod-4-three/conventions.json, packages/directive-engine/vectors/v05-n-mod-4-three/expected.json, packages/directive-engine/vectors/v06-single-woman-category/input.json, packages/directive-engine/vectors/v06-single-woman-category/conventions.json, packages/directive-engine/vectors/v06-single-woman-category/expected.json, packages/directive-engine/vectors/v07-all-male-category/input.json, packages/directive-engine/vectors/v07-all-male-category/conventions.json, packages/directive-engine/vectors/v07-all-male-category/expected.json, packages/directive-engine/vectors/v08-negative-gap/input.json, packages/directive-engine/vectors/v08-negative-gap/conventions.json, packages/directive-engine/vectors/v08-negative-gap/expected.json, packages/directive-engine/vectors/v09-zero-variable-components/input.json, packages/directive-engine/vectors/v09-zero-variable-components/conventions.json, packages/directive-engine/vectors/v09-zero-variable-components/expected.json, packages/directive-engine/vectors/v10-unmapped-sex/input.json, packages/directive-engine/vectors/v10-unmapped-sex/conventions.json, packages/directive-engine/vectors/v10-unmapped-sex/expected.json, packages/directive-engine/test/vectors-wellformed.test.ts</files>
  <read_first>
    - packages/directive-engine/src/types.ts — the `Conventions` shape every vector must declare in full, and the `EngineReport` metric positions every expected file must cover
    - packages/directive-engine/docs/CONVENTIONS.md — the recorded decision per key, which is the ONLY input to the hand computation besides the rows
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Golden vectors — D-13's independent re-derivation" — the pathological case list and the mechanics of withholding the first answer
    - .planning/research/PITFALLS.md § "Pitfall 6" — the sixteen traps, which are what the pathological cases are chosen to catch
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-13 — the independent re-derivation rule and why slowness per vector is intentional
  </read_first>
  <behavior>
    - Test: every vector directory contains exactly the three files, and each parses as JSON
    - Test: every `conventions.json` declares every key in `CONVENTION_KEYS` with no key missing and no extra key; a vector with an empty conventions object fails
    - Test: no vector inherits a convention from a sibling or from a shared default file — each is self-contained, because the same rows under different conventions are a different correct answer
    - Test: every `input.json` has at most twelve worker rows, so the vector can be recomputed by hand on paper
    - Test: every `expected.json` covers all seven metric positions and declares a `definitionCite` per metric that resolves against the stored Directive corpus
    - Test: the ten pathological cases are all present, asserted by directory-name set equality against a declared list rather than by counting
    - Test: `v10-unmapped-sex` declares a `sexMapping` that does not cover one of its input rows, and its expected output records that row in `excludedN` rather than silently dropping it
    - Test: `v07-all-male-category` expects a null metric value with a recorded warning rather than a division-by-zero or a zero
  </behavior>
  <action>
Author ten vector directories, each holding `input.json` (worker rows), `conventions.json` (a COMPLETE
`Conventions` block) and `expected.json` (the hand-computed first-pass answers).

The ten pathological cases, one per directory:
 - `v01-quartile-boundary-ties` — several workers on exactly the same pay value spanning a quartile
   boundary, which is where the tie rule and the remainder side both become visible
 - `v02-n-mod-4-zero`, `v03-n-mod-4-one`, `v04-n-mod-4-two`, `v05-n-mod-4-three` — headcounts leaving
   each possible remainder on division by four, so the quartile remainder rule is exercised in all four
   states
 - `v06-single-woman-category` — a category containing exactly one woman, which is where privacy
   suppression and statistical unreliability have to be shown as two separate flags
 - `v07-all-male-category` — no women at all, so the gap has no denominator on one side; the expected
   value is null with a warning, never a zero and never a thrown error swallowed into a number
 - `v08-negative-gap` — women paid more on average than men, which is a real result the report must be
   able to state plainly
 - `v09-zero-variable-components` — every variable component is zero, so the complementary-component
   metrics have a legitimate zero rather than a missing value
 - `v10-unmapped-sex` — one worker whose sex value is not covered by the vector's own `sexMapping`; the
   expected output puts that row in `excludedN` and raises a warning, because silently dropping a
   worker is how a confidently wrong percentage gets produced

Keep every input to twelve rows or fewer. The smallness is the point: D-13 requires each answer to be
independently re-derived by a second pass working from the conventions and the rows alone, and a vector
too large to follow on paper cannot be re-derived, only re-run.

Compute each `expected.json` BY HAND from the rows and that vector's own conventions. Write down the
intermediate steps — the sorted pay list, the quartile split points, the per-category counts — as a
`working` field inside `expected.json`, so a reviewer can follow the arithmetic. Do NOT write code that
computes these values: code written now would be the engine, and the vector would then be testing the
code against itself rather than the code against the specification.

**Withholding, for plan 07.** Plan 07 is executed by a different agent with a different context and
re-derives every answer from `input.json` and `conventions.json` alone. To make that independence real,
keep each `expected.json` self-contained and do NOT mention any computed value in this plan's SUMMARY,
in a commit message, in `CONVENTIONS.md`, or in any file plan 07 reads. Record in the SUMMARY only the
vector names, the row counts and the conventions exercised — never an answer. A disagreement found in
plan 07 is a defect in the WORDING of a convention, and the fix goes to the convention document, not to
either number.

`packages/directive-engine/test/vectors-wellformed.test.ts` asserts the structural properties above.
It does NOT check arithmetic — nothing in this phase can, because the engine does not exist. It checks
that every vector is complete, self-contained, small, and covers every metric position.
  </action>
  <acceptance_criteria>
    - Exactly ten vector directories exist and their names equal the declared list as a set
    - Every directory contains exactly `input.json`, `conventions.json` and `expected.json`
    - Every `conventions.json` has exactly the eleven `CONVENTION_KEYS` and no others; removing one key from any vector makes `vectors-wellformed.test.ts` fail
    - No `conventions.json` is a partial object referencing a shared default, and no shared default file exists in the vectors directory
    - Every `input.json` has a rows array of length twelve or fewer
    - Every `expected.json` contains a `working` field with the intermediate steps written out
    - `v07-all-male-category` expects a null value with a non-empty warnings array
    - `v10-unmapped-sex` expects `excludedN` of at least one and a non-empty warnings array
    - No file under `packages/directive-engine/` other than the ten `expected.json` files contains any of the computed answers
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/directive-engine/test/vectors-wellformed.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 8 cases are reported (one of the eight structural behaviours was not registered)</fails_when>
    <automated>node --input-type=module -e "import fs from 'node:fs'; const d='packages/directive-engine/vectors'; const v=fs.readdirSync(d).filter(x=>fs.statSync(d+'/'+x).isDirectory()); const bad=v.filter(x=>!['input.json','conventions.json','expected.json'].every(f=>fs.existsSync(d+'/'+x+'/'+f))); process.stdout.write(v.length+' '+bad.length)"</automated>
    <fails_when>prints anything other than `10 0` — either the vector count is wrong or a directory is missing one of its three required files</fails_when>
  </verify>
  <done>Ten self-contained golden vectors exist, each small enough to recompute on paper, each declaring a complete conventions block, with first-pass answers hand-computed and their working shown.</done>
</task>

</tasks>

<artifacts_this_phase_produces>
## Artifacts this phase produces

See `01-01-cellar-spine-PLAN.md` → "Artifacts this phase produces" for the phase-wide list. This plan
specifically creates the `packages/directive-engine` package (MIT, zero runtime dependencies) and the
symbols `MetricValue`, `Conventions`, `CONVENTION_KEYS`, `ConventionSource`, `EngineReport`,
`Art10Flag`, `PublishableSets`, `EngineWarning`, `SHARE_CONTRACT_VERSION`, `TRANSMITTED_KEYS`,
`SHARE_BUCKETS`, `roundGapPct`, `bucketLifetime`; the documents
`packages/directive-engine/docs/CONVENTIONS.md`, `packages/directive-engine/docs/ENGINE-REPORT.md` and
`docs/share-url-contract.md`; ten vector directories each with three JSON files; and the test files
`vectors-wellformed.test.ts`, `conventions-documented.test.ts` and `share-url-contract.test.ts`. None
of these exists before this phase.
</artifacts_this_phase_produces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Result page → transmitted share URL | The one place in the whole product where a derived value deliberately leaves the browser |
| Transmitted URL → edge worker log, recipient platform, analytics beacon | Three independent servers observe every transmitted parameter |
| Convention document → engine implementation (Phase 6) | A silence recorded as a rule would propagate into every report an HR user files with an authority |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-1-03 | Information disclosure | The transmitted parameter set in `share-url-contract.ts` | high | mitigate | `TRANSMITTED_KEYS` is a frozen closed set asserted in both directions by `share-url-contract.test.ts`; the test fails on any key naming a country, sector, seniority, age, employer, salary or date, and fails on any key appearing in a constructed URL that is not on the list. Real inputs live only after the fragment marker, which is never sent in the request line. |
| T-1-20 | Information disclosure | Bucket width chosen without modelling what a log line reveals | high | mitigate | A k-anonymity floor is a required element of the contract, every bucket declares a population estimate asserted at or above it, and a worked adversarial read of an actual log line is a required section whose absence fails a verify command. The boundaries themselves are chosen at a blocking-human checkpoint rather than by an agent. |
| T-1-21 | Tampering | The result page and the card renderer rounding differently | medium | mitigate | One rounding function and one bucketing function exist, in one file, imported by both consumers; the tie direction is stated in the document and asserted at a tie value rather than inherited from a language default. |
| T-1-22 | Repudiation | A project convention presented to an auditor as a Directive rule | high | mitigate | Every recorded decision states the Directive's position in one of exactly three words and a decision stating none of them fails the documented-conventions test; the report type echoes `conventionSource` per key so every figure carries which convention produced it and where that convention came from. |
| T-1-23 | Tampering | A golden vector that is wrong becoming the engine's specification | high | mitigate | Each answer is hand-computed with its working shown, then independently re-derived in plan 07 by a different agent that never reads `expected.json`; a disagreement is treated as an ambiguous convention and fixed in the document rather than in either number. |
| T-1-SC | Tampering | npm installs | high | mitigate | No package is installed by this plan and `packages/directive-engine` declares an empty dependencies object; the audited, pinned dev toolchain from plan 01 is unchanged. |
</threat_model>

<verification>
- `pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts` passes with at least six cases
- `pnpm vitest run packages/directive-engine/test/share-url-contract.test.ts` passes with at least eight cases
- `pnpm vitest run packages/directive-engine/test/vectors-wellformed.test.ts` passes with at least eight cases
- `pnpm typecheck` exits zero
- `packages/directive-engine/package.json` declares MIT and an empty dependencies object
- `docs/share-url-contract.md` contains all seven required elements including the worked adversarial read
- Ten vector directories exist, each with exactly three files
</verification>

<success_criteria>
1. `EngineReport` is frozen as types only, with `conventionSource` echoing which convention produced every number, and with a written amendment path that keeps the freeze survivable.
2. Every calculation convention carries a recorded decision that states plainly whether the Directive fixes it, is silent on it, or sets no value at all — and the part-time case records no default at all.
3. The share-URL transmitted set is closed and enumerated, the bucket table and rounding rule exist once, and the specification carries a k-anonymity floor and a worked adversarial read.
4. Ten pathological golden vectors exist, each self-contained, each small enough to recompute on paper, with first-pass answers hand-computed and their working shown.
5. No Article 9 metric arithmetic was written in this phase.
</success_criteria>

<output>
Create `.planning/phases/01-ground-truth-and-governance/01-06-SUMMARY.md` when done.
Record in it: the chosen bucket boundaries, rounding rule and k-anonymity floor with the checkpoint
decision that selected them; the eleven convention keys in their frozen order; and, for each of the ten
vectors, its name, its row count and the conventions it exercises. Do NOT record any computed vector
answer — plan 07 re-derives them independently and must not be able to read them here.
</output>
</content>
