---
phase: 01-ground-truth-and-governance
plan: 05
type: execute
wave: 4
depends_on: [01-02-verifier-strategies, 01-03-directive-corpus, 01-04-country-schema-and-seeding, 01-07-vector-rederivation]
files_modified:
  - packages/country-data/src/lint.ts
  - packages/country-data/scripts/validate.ts
  - packages/country-data/scripts/verify-sources.ts
  - packages/country-data/test/lint.test.ts
  - packages/country-data/proposed/README.md
  - .github/workflows/legal-data.yml
  - .github/CODEOWNERS
  - .github/PULL_REQUEST_TEMPLATE.md
  - CONTRIBUTING.md
  - SECURITY.md
  - REPORTING-LEGAL-ERRORS.md
  - CHANGELOG-legal.md
  - README.md
  - docs/POLISH-UPL-GATE.md
  - docs/BAD-PR-DRILL.md
autonomous: false
requirements: [LEGAL-08, LEGAL-10]

estimate:
  tokens: 68000
  raw_tokens: 68000
  tasks: 4
  confidence: low

must_haves:
  truths:
    - "Two contributor pull requests touching the same proposed file each pass CI independently; the verification job is read-only, never writes to the data directory, and merge order is decided by a maintainer — so concurrent contributions cannot race each other into the live dataset"
    - "A pull request into the proposed directory runs schema validation, the allowlist check and the anchor assertion, but a proposed file carrying a verified status fails the lint — merging alone cannot make the site more confident, only a maintainer promotion can"
    - "Each of the five bad-pull-request shapes is rejected by CI before merge, evidenced by five real pull-request links: a fabricated statute number, a source on a non-allowlisted domain, a source URL returning an accepted-but-empty response, a silent deadline change disguised as a typo fix, and a correct allowlisted live source cited for the wrong provision"
    - "The repository is public only after all five drill pull requests have been shown to be rejected, and only after the placeholder name has been replaced by a decided one"
    - "A statute or journal-reference pattern appearing anywhere in a country record must sit inside a fact with status verified carrying at least one source, so an unsourced statute string cannot be expressed at all"
    - "A pull request that advances a fact's verified_at without changing its value fails the lint, so a date cannot move without a value moving"
    - "Every country record path and every letter path carries a code owner with required review, and no path in the legal dataset can be merged by automation alone"
    - "The launch-country freshness hard gate runs as its own named CI job so a stale launch-country legally-operative fact blocks the build, while a stale fact anywhere else produces a warning annotation and the build continues"
    - "The Polish unauthorised-practice question is written down as a named, dated gate stating precisely what needs a Polish-qualified answer, what the current low-confidence position is, and what ships only once it is cleared"
  artifacts:
    - path: "packages/country-data/src/lint.ts"
      provides: "The policy-lint layer L1 through L8 on top of schema parse"
      exports: ["lintAll", "L1_fileCoverage", "L2_verifiedHasSource", "L3_pendingIsNull", "L4_noUnsourcedStatute", "L5_urlHygiene", "L6_linkLiveness", "L7_letterCoverage", "L8_freshness", "L9_proposedCannotVerify"]
    - path: ".github/workflows/legal-data.yml"
      provides: "The pull-request profile with named jobs for schema and lint, the offline suite, and the launch-country freshness gate"
      contains: "freshness-gate"
    - path: ".github/CODEOWNERS"
      provides: "Required maintainer review on the legal dataset and the letters package"
    - path: ".github/PULL_REQUEST_TEMPLATE.md"
      provides: "The structured contribution template demanding source, original-language quotation, English gloss, entry-into-force date and the draft checkbox"
    - path: "REPORTING-LEGAL-ERRORS.md"
      provides: "The low-friction legal-error channel with a response target and a documented rollback procedure"
    - path: "CHANGELOG-legal.md"
      provides: "The public correction log — dated entries stating what was wrong, when it was fixed and who reported it"
    - path: "docs/POLISH-UPL-GATE.md"
      provides: "The written Phase 5 blocking gate: the question, the current position, its confidence, and what ships only once cleared"
    - path: "docs/BAD-PR-DRILL.md"
      provides: "The five drill cases with their five rejected pull-request links as evidence"
      contains: "wrong provision"
  key_links:
    - from: ".github/workflows/legal-data.yml"
      to: "packages/country-data/scripts/validate.ts"
      via: "the schema-and-lint job runs the validate script, which runs lintAll over the data and proposed directories"
      pattern: "validate:country-data|lintAll"
    - from: "packages/country-data/src/lint.ts"
      to: "packages/country-data/src/allowlist.ts"
      via: "L5 url hygiene delegates host checking to assertFetchable so there is one allowlist implementation"
      pattern: "assertFetchable"
    - from: "packages/country-data/src/lint.ts"
      to: "packages/country-data/src/freshness.ts"
      via: "L8 delegates to freshnessGate so the launch-country hard-fail rule exists in exactly one place"
      pattern: "freshnessGate"
    - from: "docs/BAD-PR-DRILL.md"
      to: ".github/workflows/legal-data.yml"
      via: "each drill case names the lint rule or job that rejected it, so the drill documents which gate has teeth"
      pattern: "L[1-9]_"
  prohibitions:
    - "MUST NOT list the EUR-Lex web front-end host in any allowlist, contribution document, pull-request template example or drill fixture as a citable source — it cannot be machine-verified, and presenting it as acceptable teaches every future contributor to cite something the gate can never confirm"
    - "MUST NOT allow a merge into the live dataset to be performed by automation, by a bot approval, or by a trusted-contributor carve-out on the two-person rule for a status or deadline change"
    - "MUST NOT advance a fact's verified_at in a change that alters no value — a date that moves on its own makes the page look more trustworthy while being less so, and it must be a mechanical rule rather than a hope about review attention"
    - "MUST NOT make the repository public before all five drill pull requests have been shown rejected and the placeholder name has been replaced — publishing cannot be undone, and the history and any mistake in it are public from that moment"
    - "MUST NOT state or imply in any contributor-facing document that the project gives legal advice, that a user has a claim, or that an employer is in breach; the project reports facts and assembles the user's own words, and never evaluates an individual case"
---

<objective>
Build the governance that stops a wrong statute reaching a worker, prove each gate rejects by driving
five deliberately bad pull requests through it, and only then make the repository public.

Purpose: `country-data` is designed to be community-maintained by pull request, which is right
strategically and dangerous operationally. A well-meaning contributor updates a country's status from a
social-media post, a maintainer merges it on a Friday, and a worker sends a letter citing a law that
was never enacted. There is no reputational recovery path as cheap as prevention, because the artefact
— a letter to an employer — has already been sent. The drill is a deliverable rather than a check:
until each gate has been shown to reject, "the gates work" is an assertion.

Output: the nine-rule policy lint on top of schema parse, the pull-request profile wired end to end,
the full governance document set including the legal-error channel and the public correction log, the
written Polish gate, five rejected drill pull requests with their links, and a public repository.
</objective>

<ordering_note>
## Why this plan is the phase's last wave, not its third

This plan moved from wave 3 to wave 4 and took `01-07-vector-rederivation` as a dependency. Two reasons,
and the second is the load-bearing one.

**Mechanically:** task 4's go-public gate runs `pnpm validate:country-data && pnpm vitest run` over the
whole repository. Plan 07 concurrently writes `packages/directive-engine/test/rederivation.test.ts` and
ten `rederived.json` files into that same tree. No `files_modified` entry overlaps, so the wave guard
could not see the collision — but a half-written test file turns this plan's gate red for a reason that
has nothing to do with governance, and that gate immediately precedes an irreversible publish. Scoping
the verify to `--dir packages/country-data` would have hidden the collision at the cost of dropping the
engine contract from the last check before publication, which is the wrong trade at this particular gate.

**Substantively:** D-13 requires every golden vector to be independently re-derived, and plan 07 is where
that happens. Publishing the repository before the re-derivation has run would make public a set of
vectors whose answers have been computed exactly once. D-12 places the go-public step at phase close;
wave 4 is what phase close actually means once plan 07 exists.

The cost is that wave 3 now holds only plan 07. That is accepted: a wave that cannot genuinely run in
parallel is not a wave, and this plan was always the phase's serial tail.
</ordering_note>

<scope_note>
## Four tasks is deliberate — recorded rather than left silent

Task 3 is a `checkpoint:decision` (the repository name), not a fourth unit of implementation work, and
task 4 is the bad-PR drill, which D-12 and CONTEXT.md § "Specific Ideas" both make a DELIVERABLE rather
than a check — it cannot be folded into task 1 or 2 without losing the property that the gates were
proved to reject before a stranger's pull request arrived. The estimate (68000 tokens) is inside budget.
The shape is being kept.
</scope_note>

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
@.planning/research/PITFALLS.md
@.planning/research/ARCHITECTURE.md
@.planning/phases/01-ground-truth-and-governance/01-01-SUMMARY.md
@.planning/phases/01-ground-truth-and-governance/01-02-SUMMARY.md
@.planning/phases/01-ground-truth-and-governance/01-03-SUMMARY.md
@.planning/phases/01-ground-truth-and-governance/01-04-SUMMARY.md
@.planning/phases/01-ground-truth-and-governance/01-07-SUMMARY.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The policy lint on top of schema parse, wired into the pull-request profile</name>
  <files>packages/country-data/src/lint.ts, packages/country-data/scripts/validate.ts, packages/country-data/scripts/verify-sources.ts, packages/country-data/test/lint.test.ts, .github/workflows/legal-data.yml</files>
  <read_first>
    - packages/country-data/src/country.ts — `EU_COUNTRY_CODES`, `LAUNCH_COUNTRIES` and the record schema the lint runs on top of
    - packages/country-data/src/allowlist.ts — `assertFetchable`, which L5 must delegate to rather than re-implement
    - packages/country-data/src/freshness.ts — `freshnessGate` and `assertNoUnchangedBump`, which L8 and the bump rule delegate to
    - packages/country-data/src/verifier.ts — `verifySource` and the `Disposition` union the source-verification script consumes
    - .planning/research/ARCHITECTURE.md § 2 "The CI gate is two layers" — the L1 through L8 table with its on-pull-request and nightly columns and its severities
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Governance Gates" — the three refinements, in particular the distinct CI profile for the proposed directory
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-10 and D-11 — the freshness split and the additive-by-default promotion boundary
    - .github/workflows/legal-data.yml — the offline pull-request profile authored in plan 01, which this extends
  </read_first>
  <behavior>
    - Test L1: a data directory with 26 files, with 28 files, with a duplicate code, or with a filename stem that differs from the record's own country code each fails with the offending path named
    - Test L2: a verified fact with no source, with no verified_at, or with a verified_at in the future each fails
    - Test L3: a pending_verification fact with a non-null value fails
    - Test L4: a string matching a statute or journal-reference pattern sitting in a fact that is not verified, or in a verified fact with no source, fails — and the passing case is the same string inside a verified, sourced fact
    - Test L5: a source URL that is not https, that carries a tracking parameter, or whose host is not on that country's allowlist fails, and the failure comes from `assertFetchable` rather than from a second host implementation
    - Test L8: a stale launch-country legally-operative verified fact fails; a stale non-launch fact produces a warning and does not fail
    - Test L9: a file in the proposed directory carrying any fact with status verified fails, with the message stating that promotion is a maintainer action
    - Test: `assertNoUnchangedBump` is invoked by the lint, and a record pair differing only in verified_at fails
    - Test: running the lint twice over an unchanged tree produces identical output, and the lint never writes to the data directory — asserted by comparing a directory listing and modification times before and after
  </behavior>
  <action>
`packages/country-data/src/lint.ts` implements the policy layer above schema parse. Export each rule
individually so a failure names the rule that caught it, and export `lintAll` as the aggregate. The
rules, following the architecture table:
 - **L1 file coverage** — exactly 27 files, one per code, filename stem equal to the record's own code
 - **L2 verified facts** — at least one source, a verified_at set, not in the future
 - **L3 pending facts** — value strictly null
 - **L4 anti-hallucination** — any string matching a statute or journal-reference pattern must sit
   inside a fact whose status is verified with at least one source. Cover the Polish journal
   abbreviation, an article-number form, a year-and-number law form, and the EU directive-number form.
   This is the rule that makes a plausible-looking invented citation inexpressible rather than merely
   discouraged
 - **L5 url hygiene** — delegate to `assertFetchable` for scheme, host, credentials, port, IP literal
   and tracking parameters. Do not re-implement host matching here; one allowlist implementation only
 - **L6 link liveness** — nightly only, never on a pull request, because a third party's outage must
   not turn a contributor's pull request red
 - **L7 letter coverage** — every country whose legal basis is not pending must have an English letter
   template. The letters package does not exist until Phase 5, so this rule is authored now and
   short-circuits to a pass with a recorded skip reason when the package is absent. Do not delete the
   rule and do not fake a pass — a recorded skip is the honest state and it arms itself automatically
 - **L8 freshness** — delegate to `freshnessGate`; hard-fail only for a launch-country legally-operative
   verified fact, warn for everything else
 - **L9 proposed cannot verify** — a file under the proposed directory carrying any fact with status
   verified fails. This is what makes the promotion boundary structural rather than a matter of review
   discipline: a contributor gets a merged pull request, and merging alone cannot make the site more
   confident
Also invoke `assertNoUnchangedBump` across the changed-file set so a date cannot advance without a value
advancing.

`packages/country-data/scripts/validate.ts` is the entry point for `validate:country-data`: parse every
file in the data and proposed directories against the schema, then run `lintAll`, then print a per-rule
summary and exit non-zero on any error-severity failure. It is READ-ONLY — it must never write to the
data directory, which is what lets a nightly full-set run and a pull-request run execute at the same
time against the same files without racing.

`packages/country-data/scripts/verify-sources.ts` is the entry point for `verify:sources`: for each
changed source, dispatch through `verifySource` on its declared strategy and report the disposition.
On the pull-request profile it runs against committed fixtures only; the network dispositions belong to
the nightly job.

Extend `.github/workflows/legal-data.yml` with three named jobs, keeping the whole profile offline:
 - `schema-and-lint` — runs `validate:country-data`
 - `offline-suite` — runs the full fixture-driven test suite
 - `freshness-gate` — runs the launch-country hard gate as its own job, so a stale launch-country fact
   is visibly its own failure rather than one assertion buried in a suite
Add a job-level condition so a pull request touching only the proposed directory runs the same three
jobs — the proposed profile is not a weaker profile, it simply cannot produce a verified status, which
L9 enforces.
  </action>
  <acceptance_criteria>
    - `lintAll` returns a result carrying, per rule, a severity and a list of offending paths; a failure message names the rule identifier
    - L4 fails on a record containing an article-number string inside a pending fact, and passes on the identical string inside a verified, sourced fact
    - L5's failure for a non-allowlisted host is produced by `assertFetchable`, asserted by the error being an instance of `AllowlistViolation`
    - L7 records a skip with a stated reason when the letters package is absent, and the skip is reported rather than counted as a pass
    - L9 fails for a proposed file with a verified fact and passes for the five proposal files as authored in plan 04
    - `validate:country-data` exits non-zero when any error-severity rule fails, and zero when only warnings fire
    - Running `validate:country-data` leaves every file in the data directory with an unchanged modification time
    - `.github/workflows/legal-data.yml` defines jobs named exactly `schema-and-lint`, `offline-suite` and `freshness-gate`, and still performs no external fetch
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/lint.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 9 cases are reported (one of the nine lint behaviours was not registered)</fails_when>
    <automated>pnpm validate:country-data</automated>
    <fails_when>non-zero exit on the current clean tree, or the printed per-rule summary omits any of the rule identifiers L1 through L9</fails_when>
    <automated>gh run list --workflow=legal-data.yml --limit 1 --json conclusion,jobs --jq '.[0].conclusion'</automated>
    <fails_when>prints anything other than `success`, or prints nothing (the workflow has not run since the jobs were added)</fails_when>
  </verify>
  <done>Schema parse plus nine named policy rules run on every pull request, the promotion boundary is enforced by a rule rather than by review discipline, and the launch-country freshness gate is its own visible job.</done>
</task>

<task type="auto">
  <name>Task 2: The contributor-facing governance set, the legal-error channel, and the written Polish gate</name>
  <files>.github/CODEOWNERS, .github/PULL_REQUEST_TEMPLATE.md, CONTRIBUTING.md, SECURITY.md, REPORTING-LEGAL-ERRORS.md, CHANGELOG-legal.md, packages/country-data/proposed/README.md, docs/POLISH-UPL-GATE.md, README.md</files>
  <read_first>
    - .planning/research/PITFALLS.md § "Pitfall 9" — the eleven-point governance list including the structured template, the two-person rule, default-to-unverified, additive-by-default and the precedent to copy
    - .planning/research/PITFALLS.md § "Pitfall 2" points 5, 6 and 7 — the expiry-visible-in-the-artefact rule, the public correction log and the rollback procedure
    - .planning/research/PITFALLS.md § "Pitfall 3" — the unauthorised-practice analysis, the German statutory test, the favourable but narrow precedent, and the Polish position with its stated low confidence
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Governance Gates" — the three refinements and the posture to copy
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-08, D-11 and the Deferred Ideas block — the Polish gate, the additive-by-default flow, and the instruction that the legal-error channel and correction log belong with this phase's governance work
    - .planning/phases/01-ground-truth-and-governance/01-04-SUMMARY.md — the five proposal files and their verification strategies, which the proposed-directory guide describes
    - README.md — the stub authored in plan 01, which this extends
  </read_first>
  <action>
`.github/CODEOWNERS` requires maintainer review on `packages/country-data/**` and on `packages/letters/**`
(authored now so Phase 5 inherits it rather than adding it late). Pair it with branch protection
requiring the `schema-and-lint`, `offline-suite` and `freshness-gate` checks, and with auto-merge
disabled. No path in the legal dataset may be merged by automation alone, and there is no
trusted-contributor carve-out on the two-person rule for a status or a deadline change.

`.github/PULL_REQUEST_TEMPLATE.md` demands, as fields a contributor fills rather than prose they might
skip: the official source URL; a quotation of the operative sentence in the ORIGINAL language; an
English gloss; the date of entry into force; and a checkbox for whether the source itself says draft —
which pairs with the schema rule requiring a draft status to carry a source flagged as saying draft, so
the contributor's tick is asserted by CI rather than trusted. Include a worked example using the
correctly cited two-month provision from the Directive corpus, so the first thing a contributor sees is
what a good citation looks like. Do not use an unverifiable domain in the example.

`CONTRIBUTING.md` states the posture plainly, copying the model of a community-maintained data file with
real downstream safety consequences: validation records, evidence, verbose rationale, strict
formatting, maintainer review, and NO guaranteed inclusion timeline. A non-conforming patch sits
indefinitely rather than being merged to be nice. Slow merges are a feature. Explain the two-directory
flow: contributions land in the proposed directory, a maintainer promotes them into the live dataset,
and the promotion is the only act that can set a verified status. Explain that a contributor gets a
merged pull request and that merging alone cannot make the site more confident.

`packages/country-data/proposed/README.md` is the operational guide: what a proposal file contains, the
five verification strategies and when each applies, why two of the launch-country registers require a
dated human attestation rather than a fetch, and the exact promotion steps a maintainer follows
including setting the confirming identifier.

`REPORTING-LEGAL-ERRORS.md` is the legal-error equivalent of a security policy: a low-friction channel,
a stated response target, what information to include, and a documented ROLLBACK procedure — revert,
redeploy, write a correction-log entry — with a target time. `SECURITY.md` covers ordinary security
reports and points legal-accuracy reports at the other file so the two do not collide.

`CHANGELOG-legal.md` opens the public correction log with its format: a dated entry per correction
stating what was wrong, when it was fixed and who reported it. This is what turns an inevitable error
from a credibility loss into a credibility gain, and it is the first thing a journalist or a union will
look for before linking.

`docs/POLISH-UPL-GATE.md` is the written Phase 5 blocking gate required by D-08. It must state, without
resolving anything: the precise question that needs a Polish-qualified answer; the current position and
that its confidence is LOW and search-derived — that out-of-court legal advice is not a reserved
activity, that the practitioner titles are protected, and that court representation is separately
restricted; the sharper Polish exposure being consumer and unfair-commercial-practices rather than
unauthorised practice, given the tool funnels to a paid service; exactly what ships only once the gate
is cleared, which is the Polish-language letter; and a named owner and a review date. Do not attempt to
answer it here and do not soften the recorded confidence.

Extend `README.md` with the contribution pointer, the licence split, and a one-paragraph statement of
the provenance model — every legal fact carries a source and a date, an unknown field says pending
verification, and the verifier fails an accepted-but-empty response as loudly as a not-found. Do not
write the privacy proof; that is generated in Phase 3.

Across every one of these documents, keep the project on the reporting side of the line: the product
reports facts and assembles the user's own words, and never evaluates an individual case. No document
may say or imply that a user has a claim, that an employer is in breach, or that the project gives
legal advice.
  </action>
  <acceptance_criteria>
    - `.github/CODEOWNERS` contains entries for `packages/country-data/**` and `packages/letters/**`
    - `.github/PULL_REQUEST_TEMPLATE.md` contains all five required fields and a draft checkbox, and its worked example cites a host that appears in `packages/country-data/data/allowlist.json`
    - `CONTRIBUTING.md` states that there is no guaranteed inclusion timeline and describes the two-directory promotion flow
    - `packages/country-data/proposed/README.md` names all five verification strategies and identifies which two launch countries require a dated human attestation
    - `REPORTING-LEGAL-ERRORS.md` contains a response target and a numbered rollback procedure
    - `CHANGELOG-legal.md` exists with a stated entry format
    - `docs/POLISH-UPL-GATE.md` records the question, the LOW confidence marker, what ships only once cleared, a named owner and a review date, and does not assert an answer
    - No governance document contains a claim that the project gives legal advice, that a user has a claim, or that an employer is in breach
  </acceptance_criteria>
  <verify>
    <automated>node --input-type=module -e "import fs from 'node:fs'; const req=['.github/CODEOWNERS','.github/PULL_REQUEST_TEMPLATE.md','CONTRIBUTING.md','SECURITY.md','REPORTING-LEGAL-ERRORS.md','CHANGELOG-legal.md','packages/country-data/proposed/README.md','docs/POLISH-UPL-GATE.md']; const missing=req.filter(f=>!fs.existsSync(f)); process.stdout.write(String(missing.length)+(missing.length?' '+missing.join(','):''))"</automated>
    <fails_when>prints anything other than `0` — the printed list names each governance document that was not created</fails_when>
    <automated>grep -c 'LOW' docs/POLISH-UPL-GATE.md</automated>
    <fails_when>prints `0` — the recorded confidence marker was softened or dropped, which would turn a tracked unknown into an apparent finding</fails_when>
  </verify>
  <done>The contributor-facing governance set exists, the legal-error channel and public correction log are open, and the Polish question is a named, dated, owned gate rather than an untracked risk.</done>
</task>

<task type="checkpoint:decision" gate="blocking-human">
  <decision>Choose the public repository name and the project brand before the repository becomes public</decision>
  <context>
    The repository was created under the placeholder name recorded in the plan 01 summary, privately, so
    a workflow could run. CONTEXT.md defers the brand and domain decision out of this phase's scope
    while noting that Phase 1 creates the repository the community first sees, and that the naming must
    be raised before the repository goes public.

    This is the last moment it is cheap. Once the repository is public the name is in clone URLs, in
    search-engine indexes, in any link shared, and in the npm scope the MIT engine will later publish
    under. Renaming afterwards leaves a redirect and a trail of stale links, and the engine's package
    name in particular becomes a published contract that cannot be withdrawn.

    Three things are being decided together, because they should agree: the GitHub repository name, the
    npm scope for the MIT engine package, and the working project name used across the contributor-
    facing documents written in the previous task.
  </context>
  <options>
    <option id="keep-placeholder">
      <name>Keep the placeholder as the real name</name>
      <pros>Zero work, zero risk of a half-applied rename across documents, workflows and package manifests. The name is already consistent everywhere.</pros>
      <cons>The brand decision is made by default rather than by choice, and it is the name a journalist, a union and a first-time contributor will all read first. Changing it later costs redirects and stale links.</cons>
    </option>
    <option id="rename-now">
      <name>Rename the repository, the npm scope and the documents together, then go public</name>
      <pros>The decision is made deliberately while it is still free. One coordinated change across the repository name, the package scope, the workspace package names and every contributor-facing document.</pros>
      <cons>Requires the brand decision to be made now, which CONTEXT.md deferred. Touches several files and a published-nowhere-yet package scope, so it must be applied completely or not at all.</cons>
    </option>
    <option id="defer-and-stay-private">
      <name>Decide the name later and keep the repository private past this phase</name>
      <pros>Removes the naming pressure entirely and keeps every option open.</pros>
      <cons>Contradicts the recorded decision that the repository goes public at this phase's close, and the bad-pull-request drill is specifically the thing that was meant to happen before the repository is public — deferring means the drill's evidence sits unused while the governance ages.</cons>
    </option>
  </options>
  <resume-signal>Reply with `keep-placeholder`, `defer-and-stay-private`, or `rename-now` together with the repository name and the npm scope to use.</resume-signal>
</task>

<task type="auto">
  <name>Task 4: Drive five deliberately bad pull requests through the gates, record the evidence, and go public</name>
  <reversibility rating="one-way">Publishing a repository cannot be undone — the history, and any mistake in it, are public from that moment, and a clone taken in the first minute survives any later deletion. D-12 already took this door deliberately; the preceding checkpoint settles the name it is taken under, and this task's ordering makes the drill a precondition rather than a follow-up.</reversibility>
  <precondition>`gh repo view --json visibility --jq .visibility` prints `PRIVATE` and `gh run list --workflow=legal-data.yml --limit 1 --json conclusion --jq '.[0].conclusion'` prints `success` — the drill is only meaningful against gates that are currently green on a clean tree</precondition>
  <files>docs/BAD-PR-DRILL.md, CHANGELOG-legal.md</files>
  <read_first>
    - packages/country-data/src/lint.ts — the nine rules, so each drill case can name the rule expected to catch it
    - .github/workflows/legal-data.yml — the three job names, so the drill records which job went red
    - packages/country-data/test/fixtures/eurlex-frontend-202-empty.txt — the captured accepted-but-empty response used to construct drill case 3 without depending on a third party continuing to misbehave
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-12 — the four specified drill cases and the decision that the repository goes public at phase close, after the drill
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Governance Gates" point 3 — the fifth case and why the subtree-scoping rule is what catches it
    - .planning/phases/01-ground-truth-and-governance/01-03-SUMMARY.md — the per-article anchor strings, so case 5's anchor can be built to match a recital rather than the cited article
  </read_first>
  <action>
Open five real pull requests against the repository, one per drill case, each on its own branch, each
containing exactly the one defect it is testing so the rejection is attributable to a single rule. For
each, wait for the checks to complete, capture the failing job name and the rule identifier from the
log, then CLOSE the pull request without merging. Do not merge any of them, and do not use a bypass.

The five cases:
 1. **A fabricated statute number.** Add to a non-launch country record an article reference that does
    not exist, inside a fact that is not verified and carries no source. Expected rejection: the
    anti-hallucination rule, in the schema-and-lint job.
 2. **A source on a non-allowlisted domain.** Add a source citing a law-firm commentary site for a
    country whose allowlist does not include it. Expected rejection: the url-hygiene rule, raising an
    allowlist violation naming the host and the country.
 3. **A source URL returning an accepted-but-empty response.** Point a source at a host that answers a
    non-browser request with an accepted status and a zero-byte body, using the captured fixture so the
    case is deterministic and does not depend on a third party continuing to behave that way. Expected
    rejection: a data-defect disposition from the verifier, with the message stating the source sits
    behind an anti-automation gate and cannot be verified by fetch.
 4. **A silent deadline change disguised as a typo fix.** Change a launch-country response deadline from
    the two-month value to a shorter period, with a commit message describing it as a typo fix and with
    no source change and no verified_at change. Expected rejection: the freshness-gate job and the
    unchanged-bump rule. Record whether the diff made the worker-visible consequence obvious to a
    reviewer, because letter snapshot tests — which arrive in Phase 5 — are what will make that
    consequence a letter diff rather than a JSON diff, and this drill is where that gap is measured.
 5. **A correct, allowlisted, live source cited for the wrong provision.** Cite the Publications Office
    with an anchor whose text really does appear in the document, but only inside a recital rather than
    inside the cited article. This is the case research found most often and the one the four specified
    cases do not cover. Expected rejection: the subtree-scoped anchor assertion, disposing data defect —
    which is what proves the scoping actually works rather than merely existing.

Write `docs/BAD-PR-DRILL.md` recording, per case: the defect introduced, the rule or job expected to
catch it, the rule or job that actually caught it, the pull-request link, and the failure message. Where
the actual differs from the expected, record the difference rather than editing the expectation — a gate
that catches a defect for the wrong reason is a finding, and a gate that lets one through is a blocker
that stops this task.

Add the first entry to `CHANGELOG-legal.md` describing the drill itself, so the correction log opens
with a dated, real entry rather than an empty template.

Then, and only then, complete the go-public step. Apply the naming decision taken at the preceding
checkpoint across the repository name, the workspace package names, the MIT package's npm scope and
every contributor-facing document, in one coordinated change — a half-applied rename is worse than
either option. Confirm the branch protection requiring the three named checks is active and that
auto-merge is disabled. Then set the repository visibility to public.
  </action>
  <acceptance_criteria>
    - Five pull requests exist in the repository's history, each closed and none merged, and `docs/BAD-PR-DRILL.md` records all five links
    - Each of the five recorded cases names both the expected and the actual rejecting rule or job
    - Case 5 is recorded as rejected by the subtree-scoped anchor assertion, not by the byte floor and not by the allowlist
    - `CHANGELOG-legal.md` contains a dated entry describing the drill
    - Branch protection on the default branch requires the `schema-and-lint`, `offline-suite` and `freshness-gate` checks, and auto-merge is disabled
    - The naming decision from the checkpoint is applied consistently: no contributor-facing document, package manifest or workflow still carries the superseded name
    - `gh repo view --json visibility --jq .visibility` prints `PUBLIC`
  </acceptance_criteria>
  <verify>
    <automated>gh pr list --state closed --limit 20 --json number,title,mergedAt --jq '[.[] | select(.mergedAt == null)] | length'</automated>
    <fails_when>prints a number below 5, or prints `0` — fewer than five drill pull requests were driven through the gates, or one of them was merged</fails_when>
    <automated>gh repo view --json visibility --jq .visibility</automated>
    <fails_when>prints `PRIVATE` — the go-public step did not complete; note that this command must NOT be run before the five drill pull requests are recorded as rejected</fails_when>
    <automated>pnpm validate:country-data && pnpm vitest run</automated>
    <fails_when>non-zero exit, or the test summary line reports `0 passed` — the drill branches left a defect behind in the default branch</fails_when>
  </verify>
  <verify>
    <human-check>
      <test>Read `docs/BAD-PR-DRILL.md` end to end and open each of the five pull-request links. For each, confirm the failing check is the one the document names, and read the failure message as a first-time contributor would.</test>
      <expected>Each of the five defects was rejected before merge, by an identifiable rule, with a message that tells a contributor what was wrong and what to do instead — not merely that something failed. Case 5 in particular was caught by the anchor being outside the cited article's subtree, which is the only rule that can catch it. If any case was rejected for the wrong reason, or the message would not help a contributor, record it as a finding rather than adjusting the document.</expected>
      <why_human>The drill is a deliverable rather than a check: its purpose is to establish that the gates have teeth before a stranger's pull request arrives, and whether a failure message is usable by a first-time lawyer-contributor is a judgement no assertion can make. This is also the last review before the repository and its whole history become permanently public.</why_human>
    </human-check>
  </verify>
  <done>All five bad-pull-request shapes were rejected before merge with their evidence recorded, the correction log opens with a real entry, the naming decision is applied consistently, and the repository is public.</done>
</task>

</tasks>

<artifacts_this_phase_produces>
## Artifacts this phase produces

See `01-01-cellar-spine-PLAN.md` → "Artifacts this phase produces" for the phase-wide list. This plan
specifically creates: `lintAll` and the nine named rules `L1_fileCoverage`, `L2_verifiedHasSource`,
`L3_pendingIsNull`, `L4_noUnsourcedStatute`, `L5_urlHygiene`, `L6_linkLiveness`, `L7_letterCoverage`,
`L8_freshness`, `L9_proposedCannotVerify`; the scripts `packages/country-data/scripts/validate.ts` and
`packages/country-data/scripts/verify-sources.ts`; the workflow jobs `schema-and-lint`, `offline-suite`
and `freshness-gate` in `.github/workflows/legal-data.yml`; and the documents `.github/CODEOWNERS`,
`.github/PULL_REQUEST_TEMPLATE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `REPORTING-LEGAL-ERRORS.md`,
`CHANGELOG-legal.md`, `packages/country-data/proposed/README.md`, `docs/POLISH-UPL-GATE.md` and
`docs/BAD-PR-DRILL.md`. None of these exists before this phase.
</artifacts_this_phase_produces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Untrusted contributor → the legal dataset | A stranger's pull request decides what a worker cites in a letter to their employer |
| Proposed directory → live data directory | The promotion boundary; the only act that may raise confidence |
| Private repository → public repository | A one-way disclosure of the entire history |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-1-02 | Tampering | A contributor pull request landing a wrong statute | high | mitigate | Nine named policy rules on top of schema parse, with the anti-hallucination rule making an unsourced statute string inexpressible; required code-owner review, the two-person rule on status and deadline changes with no trusted-contributor carve-out, and auto-merge disabled. Each rule is proved to reject by a real drill pull request. |
| T-1-24 | Elevation of privilege | A contributor raising confidence by merging | high | mitigate | The proposed-cannot-verify rule fails any proposed file carrying a verified status, so promotion is structurally a maintainer act; the contributor gets a merged pull request and the site's confidence is unchanged. |
| T-1-25 | Tampering | A deadline changed under cover of a typo-fix commit message | high | mitigate | The freshness gate plus the unchanged-bump rule, drilled as case 4. Recorded as a measured gap that Phase 5's letter snapshot tests close by turning a data diff into a worker-visible letter diff. |
| T-1-26 | Tampering | A correct, allowlisted, live source cited for the wrong provision | high | mitigate | The subtree-scoped anchor assertion, drilled as case 5 — the case the four originally specified cases did not cover, and the failure research encountered most often. |
| T-1-07 | Information disclosure | A hostile `source_url` making a CI runner connect to an attacker-chosen host | high | mitigate | The url-hygiene rule delegates to the single allowlist implementation, checked before any request and on every redirect hop; drilled as case 2. |
| T-1-27 | Information disclosure | Publishing the repository exposes its entire history permanently | high | mitigate | The go-public step is ordered strictly after the drill, is preceded by a blocking-human naming checkpoint, and is preceded by a human review of the drill evidence. No secret is ever added to this repository — the primary source requires no key — so the disclosure surface is code, data and history only. |
| T-1-28 | Repudiation | A correction made quietly with no public record | medium | mitigate | The public correction log with a stated entry format, opened with a real dated entry, plus a documented rollback procedure with a target time in the legal-error channel. |
| T-1-SC | Tampering | npm installs | high | mitigate | No package is installed by this plan; the audited, pinned set from plan 01 is unchanged and the workflows install with a frozen lockfile. |
</threat_model>

<verification>
- `pnpm vitest run packages/country-data/test/lint.test.ts` passes with at least nine cases
- `pnpm validate:country-data` exits zero on the clean tree and prints all nine rule identifiers
- `gh run list --workflow=legal-data.yml --limit 1 --json conclusion --jq '.[0].conclusion'` prints `success`
- All eight governance documents exist
- `docs/POLISH-UPL-GATE.md` retains its LOW confidence marker
- Five closed, unmerged drill pull requests exist with their links recorded, each naming the rule that rejected it
- `gh repo view --json visibility --jq .visibility` prints `PUBLIC`
- Human check recorded above: drill evidence reviewed before the repository was published, harvested at end of phase

**Manual-only, deferred beyond this phase:** the Polish unauthorised-practice question stays open by
decision and gates the Polish letter in Phase 5. `docs/POLISH-UPL-GATE.md` is this phase's deliverable
for it; an answer is not.
</verification>

<success_criteria>
1. Schema parse plus nine named policy rules gate every pull request, offline, with the launch-country freshness hard gate as its own job.
2. A contributor cannot raise the site's confidence by merging; only a maintainer promotion can.
3. All five bad-pull-request shapes — including the right-source-wrong-provision case the original four missed — were rejected before merge, with evidence.
4. The legal-error channel, the public correction log and the rollback procedure exist and are open.
5. The Polish question is a named, dated, owned Phase 5 gate with its low confidence recorded rather than softened.
6. The repository is public, under a decided name, with branch protection requiring the three checks and auto-merge disabled.
</success_criteria>

<output>
Create `.planning/phases/01-ground-truth-and-governance/01-05-SUMMARY.md` when done.
Record in it: the five drill pull-request links with the rule that rejected each and any case where the
actual rejecting rule differed from the expected one; the naming decision taken and every place it was
applied; the branch-protection configuration; and the named owner and review date on the Polish gate.
</output>
