---
phase: 01-ground-truth-and-governance
plan: 07
type: execute
wave: 3
depends_on: [01-06-frozen-contracts, 01-03-directive-corpus]
files_modified:
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
  - packages/directive-engine/docs/CONVENTIONS.md
autonomous: true
requirements: [ENG-01, ENG-06]

estimate:
  tokens: 44000
  raw_tokens: 44000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "Every one of the ten golden vectors has a second, independently produced set of answers, derived from its input rows and its own conventions block alone — the re-deriving pass never reads the first pass's answers, its working, or any summary that quotes them"
    - "A disagreement between the two passes is treated as a defect in the WORDING of a convention, not as an arithmetic mistake in either pass; the fix goes to the convention document, and both passes are then redone for that vector"
    - "The comparison tool reports a per-vector, per-metric verdict of agree or disagree and exits non-zero when any vector disagrees, so a disagreement cannot be missed by being buried in output"
    - "The comparison tool computes no metric of its own — it compares two authored files — so the vectors are never validated against an implementation that shares their assumptions"
    - "After any convention re-wording, the convention document still satisfies the documented-conventions test: every key has exactly one recorded decision, and the document's heading order still equals the type's key order"
    - "A vector whose disagreement is resolved carries a recorded note naming which convention was ambiguous and what the wording now says, so the resolution is auditable rather than a silently changed number"
    - "Every definitionCite in the report type and in both answer files of every vector RESOLVES against the stored Directive corpus — the key names an entry that actually exists in packages/country-data/data/_directive.json. Plan 06 could only assert the key shape, because plan 03 was filling that corpus in its own wave; this plan runs after both and is where the engine-to-data link stops being a convention and becomes a checked fact"
  artifacts:
    - path: "packages/directive-engine/vectors/v01-quartile-boundary-ties/rederived.json"
      provides: "The independent second-pass answers for the quartile-tie vector"
    - path: "packages/directive-engine/scripts/rederive.ts"
      provides: "A comparison and reporting tool over the two authored answer files — it computes nothing"
      exports: ["compareVectors", "VectorVerdict"]
    - path: "packages/directive-engine/test/rederivation.test.ts"
      provides: "Assertions that all ten vectors have both answer files and that every metric position agrees"
    - path: "packages/directive-engine/docs/CONVENTIONS.md"
      provides: "The convention decisions, re-worded wherever a disagreement proved one ambiguous"
  key_links:
    - from: "packages/directive-engine/scripts/rederive.ts"
      to: "packages/directive-engine/vectors/v01-quartile-boundary-ties/expected.json"
      via: "the comparison reads both authored answer files per vector and produces a per-metric verdict"
      pattern: "rederived\\.json|expected\\.json"
    - from: "packages/directive-engine/test/rederivation.test.ts"
      to: "packages/directive-engine/docs/CONVENTIONS.md"
      via: "a resolved disagreement must leave a recorded note naming the re-worded convention, asserted by the test"
      pattern: "CONVENTION_KEYS"
    - from: "packages/directive-engine/test/rederivation.test.ts"
      to: "packages/country-data/data/_directive.json"
      via: "every definitionCite in types.ts, in every expected.json and in every rederived.json is looked up in the stored corpus and must be found — the resolve half of the link plan 06 could only assert as a shape"
      pattern: "definitionCite"
  prohibitions:
    - "MUST NOT read, open, grep, or infer the contents of any expected answer file, any working section, or any prior summary quoting an answer, while producing the re-derivation — the whole value of the second pass is that it has not seen the first"
    - "MUST NOT write code that computes an Article 9 metric in order to produce or check the re-derivation; a second pass that shares an implementation with the first is not a second pass, and an engine written now would be written against the specification it is meant to satisfy"
    - "MUST NOT resolve a disagreement by editing whichever number looks wrong; a disagreement means a convention is ambiguously worded, and the fix goes to the convention document followed by redoing both passes for that vector"
    - "MUST NOT quietly drop a vector that proves hard to re-derive — a vector too large or too ambiguous to recompute by hand is itself the finding, and it is recorded rather than removed"
---

<objective>
Independently re-derive every golden vector's answers from its input rows and its conventions alone,
compare the two passes, and treat any disagreement as evidence that a convention is ambiguously worded
rather than as an arithmetic slip.

Purpose: D-13 requires that a golden vector be proved correct by a hand computation and then
independently re-derived by a pass that has not seen the first answer. A reviewer checking the artefact
that produced an answer is precisely the failure mode being avoided — they check the arithmetic, not
the premise. The bug worth finding here is an ambiguous convention, and finding it now costs one plan;
finding it in Phase 6 means every engine test already agrees with a wrong number.

Output: ten independently produced answer files, a comparison tool that computes nothing, and a
convention document re-worded wherever the two passes proved it could be read two ways.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/phases/01-ground-truth-and-governance/01-CONTEXT.md
@packages/directive-engine/src/types.ts
@packages/directive-engine/docs/CONVENTIONS.md

**Deliberately excluded from this plan's context, and it must stay excluded:**
`01-06-SUMMARY.md`, every `packages/directive-engine/vectors/*/expected.json`, and any other file
quoting a first-pass answer. This exclusion is the mechanism that makes the second pass independent —
this plan is executed by a different agent with a different context window precisely so that the first
pass's answers are not in it. Do not add any of them to the context, and do not read them during
task 1.
</context>

<flagged_assumptions>
## Planner assumption surfaced, not silently resolved

**Independence is structural but not enforceable.** Executing this plan in a separate wave with a
separate agent and an explicitly reduced context is the strongest independence available inside a
single repository: the first pass's answers are on disk and nothing but the instruction in task 1 stops
them being read. That instruction is therefore load-bearing, and the human check in task 2 exists to
confirm it held. If a future run wants stronger independence, the honest move is a second human, not a
cleverer prompt — recorded here rather than claimed as solved.

The related unresolved ENG-01 edge is surfaced in `01-06-frozen-contracts-PLAN.md` and is not
re-litigated here.
</flagged_assumptions>

<tasks>

<task type="auto">
  <name>Task 1: Re-derive all ten vectors from the rows and the conventions alone</name>
  <precondition>Every `packages/directive-engine/vectors/*/input.json` and `*/conventions.json` exists and parses (produced by plan 06), and `packages/directive-engine/docs/CONVENTIONS.md` records a decision for every convention key</precondition>
  <files>packages/directive-engine/vectors/v01-quartile-boundary-ties/rederived.json, packages/directive-engine/vectors/v02-n-mod-4-zero/rederived.json, packages/directive-engine/vectors/v03-n-mod-4-one/rederived.json, packages/directive-engine/vectors/v04-n-mod-4-two/rederived.json, packages/directive-engine/vectors/v05-n-mod-4-three/rederived.json, packages/directive-engine/vectors/v06-single-woman-category/rederived.json, packages/directive-engine/vectors/v07-all-male-category/rederived.json, packages/directive-engine/vectors/v08-negative-gap/rederived.json, packages/directive-engine/vectors/v09-zero-variable-components/rederived.json, packages/directive-engine/vectors/v10-unmapped-sex/rederived.json</files>
  <read_first>
    - packages/directive-engine/src/types.ts — the `EngineReport` metric positions and the `Conventions` key list, so the second pass knows what it must produce
    - packages/directive-engine/docs/CONVENTIONS.md — the recorded decision per convention key; this document plus the rows is the COMPLETE input to the re-derivation
    - packages/directive-engine/vectors/*/input.json — the worker rows, one vector at a time
    - packages/directive-engine/vectors/*/conventions.json — that vector's own complete conventions block
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-13 — the independent re-derivation rule, why slowness per vector is intentional, and why a committed spreadsheet was rejected

    **Explicitly NOT to be read in this task, under any circumstance:** any `expected.json`, any
    `working` section inside one, `01-06-SUMMARY.md`, or any commit message or note quoting a computed
    answer. If one is opened by accident, stop and say so in the plan summary rather than continuing —
    an admitted contamination is recoverable by a third pass, a concealed one is not.
  </read_first>
  <action>
Work one vector at a time. For each, read only that vector's `input.json` and `conventions.json`,
together with the recorded decisions in the convention document, and compute every metric position by
hand.

Write the result to that vector's `rederived.json` in the same structural shape the report type
defines: a value per metric position, a `definitionCite` per metric, `populationN`, `excludedN`, the
privacy-suppression flag and the statistical-reliability flag kept separate, plus any warnings the
conventions require. Include a `working` field showing the intermediate steps — the sorted pay list,
the quartile split points, the per-category counts — so a reviewer can follow this pass's reasoning
independently of the other one.

Do not write, import, or run code that computes a metric. Two reasons, and both matter. A second pass
that shares an implementation with the first is not a second pass, it is the same pass run twice. And
an Article 9 implementation written now would be written against the very specification it is meant to
satisfy, which is the ordering ENG-01 exists to prevent.

Where a convention's recorded wording does not determine an answer — the likely candidates are the
even-count median rule, the quartile tie rule, the remainder side, and the treatment of a row whose sex
value the vector's own mapping does not cover — do NOT pick a reading and move on. Record the ambiguity
in that vector's `rederived.json` under an `ambiguities` field, naming the convention key and both
readings, and produce the answer under the reading you judge the wording most nearly supports. An
ambiguity recorded here is the finding this whole plan exists to produce; an ambiguity resolved by
quiet preference is the finding being destroyed.

If a vector turns out to be too large or too tangled to recompute by hand, record that in
`ambiguities` as well and move on. A vector that cannot be re-derived is itself a defect in the vector,
because D-13's whole method depends on the vectors staying small enough to follow on paper. Do not
shrink the vector to make it re-derivable — that is plan 06's answer file being edited by the back
door.
  </action>
  <acceptance_criteria>
    - Ten `rederived.json` files exist, one per vector directory, each parsing as JSON
    - Every `rederived.json` covers all seven metric positions with a `definitionCite` per metric
    - Every `rederived.json` contains a `working` field with the intermediate steps written out
    - Every `rederived.json` contains an `ambiguities` field, which is an empty array when the conventions determined every answer
    - `packages/directive-engine/src` gained no file that computes a metric, and no metric-computing code was added anywhere in the package
    - No `rederived.json` is byte-identical to its sibling `expected.json` in its `working` field — two independent hand computations may agree on answers but will not produce identical prose, and identical working is the signature of a copy
  </acceptance_criteria>
  <verify>
    <automated>node --input-type=module -e "import fs from 'node:fs'; const d='packages/directive-engine/vectors'; const v=fs.readdirSync(d).filter(x=>fs.statSync(d+'/'+x).isDirectory()); const ok=v.filter(x=>{try{const j=JSON.parse(fs.readFileSync(d+'/'+x+'/rederived.json','utf8'));return !!j.working && Array.isArray(j.ambiguities)}catch{return false}}); process.stdout.write(v.length+' '+ok.length)"</automated>
    <fails_when>prints two numbers that are not both `10` — a vector has no re-derivation, or one is missing its working section or its ambiguities array</fails_when>
    <automated>pnpm vitest run packages/directive-engine/test/vectors-wellformed.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed` — adding the re-derivation files broke the structural assertions plan 06 established</fails_when>
  </verify>
  <done>Ten independently produced answer sets exist, each with its working shown and its ambiguities named, produced without reading the first pass and without writing any metric-computing code.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Compare the two passes and fix the convention wording wherever they disagree</name>
  <files>packages/directive-engine/scripts/rederive.ts, packages/directive-engine/test/rederivation.test.ts, packages/directive-engine/docs/CONVENTIONS.md</files>
  <read_first>
    - packages/directive-engine/vectors/*/rederived.json — the second pass from task 1
    - packages/directive-engine/vectors/*/expected.json — the first pass; reading these is correct and required NOW, and was forbidden during task 1
    - packages/directive-engine/docs/CONVENTIONS.md — the decisions being tested by the comparison, and re-worded where a disagreement proves one ambiguous
    - packages/directive-engine/test/conventions-documented.test.ts — the invariants any re-wording must continue to satisfy
    - packages/directive-engine/src/types.ts — `CONVENTION_KEYS`, the metric positions the comparison iterates, and the exported citation-key pattern
    - packages/country-data/data/_directive.json — the Directive corpus plan 03 filled, which is what every `definitionCite` must now be looked up in. Read the KEY SET only; nothing in this plan needs the quotations themselves
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-13 and D-16 — the disagreement-means-ambiguous-convention rule, and the amendment path a re-wording must follow
  </read_first>
  <behavior>
    - Test: `compareVectors` returns a per-vector, per-metric verdict, and the aggregate verdict is a disagreement when any single metric position differs
    - Test: a null value in one pass and a zero in the other is reported as a DISAGREEMENT, not as an approximate match — the all-male-category vector is precisely where that distinction matters
    - Test: a difference in the privacy-suppression flag alone is a disagreement even when the metric values match, because the two suppression flags are separate claims
    - Test: a difference in the `working` prose alone is NOT a disagreement — two independent hand computations may explain themselves differently and still agree
    - Test: a non-empty `ambiguities` array in any `rederived.json` is surfaced in the report even when the answers happen to agree, because an ambiguity that produced the same answer by luck is still an ambiguity
    - Test: `compareVectors` contains no arithmetic over the input rows — it reads two authored files and compares them
    - Test: after a re-wording, `conventions-documented.test.ts` still passes with every key carrying exactly one decision and the heading order still matching the key order
    - Test: every `definitionCite` appearing in the report type, in any `expected.json` and in any `rederived.json` is present as a key in the stored Directive corpus, and a deliberately altered key fails the assertion by naming the key and the file it came from. This is the resolve assertion plan 06 deferred: it could only check the key SHAPE, because the corpus was being filled in its own wave and held a single entry at its start
  </behavior>
  <action>
Write `packages/directive-engine/scripts/rederive.ts` as a COMPARISON tool. It reads each vector's two
authored answer files, compares them position by position, and emits a per-vector report and an
aggregate verdict, exiting non-zero when any vector disagrees. It performs no arithmetic over the input
rows — if it computed anything, it would be validating the vectors against an implementation that
shares their assumptions, which is the thing this whole exercise avoids. Wire it to the
`rederive:vectors` script name declared in plan 01.

Comparison rules that carry meaning and must not be softened into an approximate match:
 - a null and a zero disagree
 - a present value and an absent one disagree
 - the privacy-suppression flag and the statistical-reliability flag are compared separately, and a
   difference in either alone is a disagreement
 - `excludedN` is compared, because a silently dropped worker is exactly the failure the unmapped-sex
   vector exists to catch
 - the `working` prose is NOT compared

Then resolve. For every disagreement, and for every recorded ambiguity even where the answers happened
to agree, the fix goes to `packages/directive-engine/docs/CONVENTIONS.md`: re-word the decision so it
determines exactly one answer, state which reading was chosen and why, and note that the wording was
tightened because two independent passes read it differently. Do NOT edit either answer file to make
the numbers match. A disagreement is evidence about the wording, and editing a number discards the
evidence while keeping the ambiguity.

After any re-wording, follow the recorded amendment path from the frozen-contract document: the
convention document, the report type and the affected vectors change TOGETHER in one coordinated
change, and both passes are redone for each affected vector. A re-worded convention with a stale vector
is a worse state than the disagreement it replaced.

`packages/directive-engine/test/rederivation.test.ts` asserts the behaviours above and asserts the end
state: every vector has both answer files and every metric position agrees. That final assertion is
what makes the vectors an executable specification Phase 6 can be built against.

It also closes the engine-to-data link. Collect every `definitionCite` from the report type and from
both answer files of all ten vectors, load the key set from `packages/country-data/data/_directive.json`,
and assert every collected key is present in it. Fail with the offending key AND the file it came from,
because a citation key that resolves nowhere is how the engine and the legal corpus drift apart without
either side going red. Plan 06 deliberately asserted only the key shape — it runs in the same wave as
the corpus pull and would have been testing against a corpus of one entry — so this is the first point
in the phase where the assertion can be made honestly. If a key does not resolve, the fix is to correct
the citation, never to add an entry to the corpus to match it: the corpus is what the publisher served,
and editing it to satisfy a test is the failure mode the whole phase exists to prevent.
  </action>
  <acceptance_criteria>
    - `compareVectors` reports a verdict per vector and per metric position, and the process exits non-zero when any vector disagrees
    - The comparison treats null versus zero as a disagreement, asserted with a crafted pair
    - The comparison ignores `working` differences, asserted with a crafted pair differing only in prose
    - Every recorded ambiguity appears in the report, including ones whose answers agreed
    - `packages/directive-engine/scripts/rederive.ts` reads no `input.json` and performs no arithmetic over worker rows
    - Every convention that was re-worded carries a note stating that two independent passes read it differently, and names the reading now chosen
    - `pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts` still passes after the re-wording
    - Every `definitionCite` in the report type and in all twenty answer files resolves to a key present in `packages/country-data/data/_directive.json`, and an altered key fails the assertion with both the key and its source file named
    - No entry was added to `packages/country-data/data/_directive.json` by this plan — an unresolved citation is fixed in the citation, never by extending the corpus to match it
    - At the end state, `pnpm rederive:vectors` exits zero with all ten vectors agreeing
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/directive-engine/test/rederivation.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 8 cases are reported (one of the eight comparison behaviours was not registered)</fails_when>
    <automated>pnpm rederive:vectors</automated>
    <fails_when>non-zero exit, or the printed report names any vector with verdict `disagree`, or the report covers fewer than 10 vectors</fails_when>
    <automated>pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed` — a convention re-wording broke the one-decision-per-key or the heading-order invariant</fails_when>
  </verify>
  <verify>
    <human-check>
      <test>Read the comparison report and, for each vector whose two passes disagreed or which recorded an ambiguity, read the convention decision as it now stands and ask whether it determines exactly one answer for that vector's rows. Then confirm from the two `working` sections that the second pass reasoned independently rather than restating the first.</test>
      <expected>Every re-worded convention now admits exactly one reading for the case that exposed it, and the two working sections reason in visibly different ways while reaching the same answers. No disagreement was resolved by changing a number. If any working section reads as a restatement of the other, the independence did not hold and that vector needs a third pass by a different agent before Phase 6 builds against it.</expected>
      <why_human>Whether a convention's wording is genuinely unambiguous, and whether two pieces of reasoning are independent rather than one being a paraphrase of the other, are both judgements no assertion can make. These vectors become the engine's specification in Phase 6, and by then every engine test will agree with whatever they say.</why_human>
    </human-check>
  </verify>
  <done>All ten vectors agree across two independently produced passes, every ambiguity the exercise exposed has been fixed in the convention wording rather than in a number, and the convention document still carries exactly one decision per key.</done>
</task>

</tasks>

<artifacts_this_phase_produces>
## Artifacts this phase produces

See `01-01-cellar-spine-PLAN.md` → "Artifacts this phase produces" for the phase-wide list. This plan
specifically creates: ten `rederived.json` files, one per vector directory; the comparison tool
`packages/directive-engine/scripts/rederive.ts` exporting `compareVectors` and `VectorVerdict`, wired
to the `rederive:vectors` script name; and the test file
`packages/directive-engine/test/rederivation.test.ts`. It also amends
`packages/directive-engine/docs/CONVENTIONS.md` wherever a disagreement proved a decision ambiguous.
None of these exists before this phase.
</artifacts_this_phase_produces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| First-pass answers on disk → the second pass | The independence the whole method rests on is an instruction, not a sandbox |
| Golden vectors → the Phase 6 engine | Once the engine is built, every engine test agrees with whatever these vectors say |
| Convention wording → an HR user's filed report | An ambiguous convention becomes a number an employer defends to an authority |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-1-23 | Tampering | A wrong golden vector becoming the engine's specification | high | mitigate | Two independently produced answer sets per vector, compared position by position with null-versus-zero and flag differences treated as disagreements; a disagreement is fixed in the convention wording rather than in a number, and both passes are redone for the affected vector. |
| T-1-29 | Spoofing | The second pass copying the first rather than deriving it | high | mitigate | Structural separation — a separate plan, a separate wave, a separate agent, and a context block that explicitly excludes the first pass's summary and answer files — plus a `working` field per pass and a human check comparing the two lines of reasoning. Residual risk is recorded honestly in the flagged assumptions rather than claimed as closed. |
| T-1-22 | Repudiation | An ambiguous convention presented to an auditor as settled | high | mitigate | Every recorded ambiguity is surfaced in the report even when the two passes happened to agree, and every re-wording carries a note stating that two independent passes read the decision differently and which reading was chosen. |
| T-1-30 | Tampering | The comparison tool computing metrics and so validating the vectors against shared assumptions | medium | mitigate | The tool reads only the two authored answer files, never `input.json`, and a test asserts it performs no arithmetic over worker rows. |
| T-1-31 | Tampering | A `definitionCite` that resolves nowhere letting the engine contract and the legal corpus drift apart silently | medium | mitigate | Every citation key in the type and in all twenty answer files is looked up in the stored corpus and must be found, failing with the key and its source file named. The corpus may not be extended to make a key resolve — an unresolved citation is fixed in the citation. Plan 06 could only assert the key shape because it runs in the corpus pull's own wave. |
| T-1-SC | Tampering | npm installs | high | mitigate | No package is installed by this plan; `packages/directive-engine` keeps its empty dependencies object and the audited, pinned dev toolchain from plan 01 is unchanged. |
</threat_model>

<verification>
- Ten `rederived.json` files exist, each with a `working` section and an `ambiguities` array
- `pnpm rederive:vectors` exits zero and reports all ten vectors agreeing
- `pnpm vitest run packages/directive-engine/test/rederivation.test.ts` passes with at least eight cases
- Every `definitionCite` in the report type and in all twenty answer files resolves to a key present in `packages/country-data/data/_directive.json`, and the corpus itself was not extended to make one resolve
- `pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts` still passes after any re-wording
- `packages/directive-engine` still declares an empty dependencies object and contains no Article 9 metric arithmetic
- Human check recorded above: independence of the two passes and unambiguity of the re-worded conventions, harvested at end of phase
</verification>

<success_criteria>
1. Every golden vector carries two independently produced answer sets, the second derived without reading the first.
2. The comparison computes nothing and treats null-versus-zero, flag differences and excluded-worker counts as real disagreements.
3. Every disagreement and every recorded ambiguity was resolved by tightening a convention's wording, never by editing a number.
4. The convention document still carries exactly one decision per key in the frozen order.
5. No Article 9 metric arithmetic was written in this phase.
6. Every citation key the engine contract and the vectors carry resolves against the stored Directive corpus — the link plan 06 could only assert as a shape is now a checked fact.
</success_criteria>

<output>
Create `.planning/phases/01-ground-truth-and-governance/01-07-SUMMARY.md` when done.
Record in it: the per-vector verdict, every ambiguity recorded by the second pass with the convention
key it named, the distinct citation keys collected from the type and the answer files together with the
confirmation that every one resolved against the stored corpus, the before-and-after wording of each
convention that was tightened, and an explicit
statement of whether the independence instruction held — including any accidental exposure to the first
pass's answers, which must be reported rather than concealed.
</output>
