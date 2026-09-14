---
phase: 01-ground-truth-and-governance
plan: 05
subsystem: infra
tags: [governance, ci, lint, codeowners, contributing, upl, drill, naming]

requires:
  - phase: 01-02-verifier-strategies
    provides: verifySource, the five-strategy table, the byte floors and the captured response fixtures
  - phase: 01-03-directive-corpus
    provides: the 66-entry article-keyed Directive corpus and the per-article anchor strings
  - phase: 01-04-country-schema-and-seeding
    provides: the 27 seeded records, the five proposals, DIRECTIVE_FALLBACK_KEYS and the emitted JSON Schema
  - phase: 01-07-vector-rederivation
    provides: the independently re-derived golden vectors, so nothing published had been computed only once
provides:
  - The nine-rule policy lint L1-L9 plus the unchanged-bump rule, on top of schema parse
  - assertFallbackKeysResolve — the cross-artefact referential pass, checked in every corpus language
  - validate:country-data and verify:sources as entry points, both read-only and offline
  - The three named CI jobs schema-and-lint, offline-suite and freshness-gate
  - The full contributor governance set, the legal-error channel and the public correction log
  - docs/POLISH-UPL-GATE.md — the Phase 5 blocking gate, with its LOW confidence recorded
  - docs/BAD-PR-DRILL.md — five rejected pull requests with their evidence
  - The project name paytransparency, applied across repo, packages, scope and docs
affects: [phase-2-design, phase-3-ui, phase-5-letters, phase-6-engine]

actuals:
  tokens: 44222
  tasks: 3.5
  commits: 6
plan_head_before: 37d0564737441b35acc3ed9ab410cc83cc9826c6

tech-stack:
  added: []
  patterns:
    - "Policy lint layered above schema parse: rules that need more than one record, or an artefact the parse cannot see, live outside the schema"
    - "Delegation pinned by the delegate's own error type or wording, so a second implementation cannot be introduced silently"
    - "A rule that cannot run records a SKIP with a stated reason; it is never counted as a pass"
    - "Evidence-bearing containers: a statute string is legal only inside a source, a register hint, a sourced proposal, or a verified+sourced fact"

key-files:
  created:
    - packages/country-data/src/lint.ts
    - packages/country-data/scripts/validate.ts
    - packages/country-data/scripts/verify-sources.ts
    - packages/country-data/test/lint.test.ts
    - .github/CODEOWNERS
    - .github/PULL_REQUEST_TEMPLATE.md
    - CONTRIBUTING.md
    - SECURITY.md
    - REPORTING-LEGAL-ERRORS.md
    - CHANGELOG-legal.md
    - packages/country-data/proposed/README.md
    - docs/POLISH-UPL-GATE.md
    - docs/BAD-PR-DRILL.md
  modified:
    - .github/workflows/legal-data.yml
    - packages/country-data/test/spine.test.ts
    - README.md
    - package.json
    - packages/country-data/package.json
    - packages/directive-engine/package.json
    - packages/country-data/country.schema.json

key-decisions:
  - "Project named paytransparency, after the Directive rather than after a verdict — fairpay and equalpay editorialise, which would contradict the rule that this project never evaluates an individual case"
  - "L4 permits a statute string only inside an evidence-bearing container, so an unsourced citation is inexpressible rather than discouraged"
  - "assertFallbackKeysResolve checks EVERY corpus language, not just eng — resolve() refuses to serve English under another language's name, so an eng-only pass would green-light a blank citation on nine locales"
  - "A Proposal is not a Fact: it carries drafted_by, never verified_by, so its manual-attest sources report as awaiting promotion rather than as defects"
  - "Cellar fixtures are selected by LANGUAGE over whole-expression captures; the per-article fixtures are subtree slices and must never be fed to a whole-response byte floor"
  - "spine.test.ts's offline guard was made stricter, not weaker, to admit fetch-depth: enumerated run commands and first-party-only actions were added"

patterns-established:
  - "Gate hardening precedes the drill: a drill against an inert gate proves nothing"
  - "Record the difference, never edit the expectation — a gate that catches a defect for the wrong reason is a finding"
  - "Claim only what was evidenced: docs/BAD-PR-DRILL.md has a 'what the drill did not prove' section"

requirements-completed: []

coverage:
  - id: D1
    description: "Schema parse plus nine named policy rules and the unchanged-bump rule gate every pull request, offline"
    requirement: LEGAL-10
    verification:
      - kind: unit
        ref: "packages/country-data/test/lint.test.ts (37 cases, L1-L9 + BUMP + determinism)"
        status: pass
      - kind: integration
        ref: "pnpm validate:country-data — exit 0, prints L1..L9 + BUMP"
        status: pass
      - kind: e2e
        ref: "legal-data.yml run 34820885894 — schema-and-lint, offline-suite, freshness-gate all success"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every Directive fallback citation key resolves against the stored corpus, in every language the corpus holds"
    requirement: LEGAL-03
    verification:
      - kind: unit
        ref: "packages/country-data/test/lint.test.ts#fallback keys resolve (4 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A contributor cannot raise the site's confidence by merging; only a maintainer promotion can"
    requirement: LEGAL-10
    verification:
      - kind: unit
        ref: "packages/country-data/test/lint.test.ts#L9 a proposed file cannot carry a verified fact"
        status: pass
    human_judgment: false
  - id: D4
    description: "The launch-country freshness hard gate runs as its own named CI job"
    requirement: LEGAL-08
    verification:
      - kind: e2e
        ref: "legal-data.yml job freshness-gate — 'ok — 27 records, no launch-country legally-operative fact is past its window'"
        status: pass
    human_judgment: true
    rationale: "The job runs and passes, but it has never been SEEN to fail. It cannot be proved to have teeth until a maintainer promotion under D-06 creates a verified launch-country legally-operative fact that can go stale."
  - id: D5
    description: "All five bad-pull-request shapes were rejected by CI before merge, with evidence"
    requirement: LEGAL-10
    verification:
      - kind: e2e
        ref: "PRs #1-#5, all closed, none merged; per-case failing job and rule recorded in docs/BAD-PR-DRILL.md"
        status: pass
    human_judgment: true
    rationale: "The drill is a deliverable, not a check. Whether each failure message would actually help a first-time lawyer-contributor is a judgement no assertion can make, and this is the last review before the history becomes permanently public."
  - id: D6
    description: "The contributor governance set, the legal-error channel and the public correction log exist and are open"
    requirement: LEGAL-10
    verification:
      - kind: integration
        ref: "19/19 assertions: all eight documents exist, five PR-template fields + draft checkbox, response target, numbered rollback, no document asserts legal advice/a claim/a breach"
        status: pass
    human_judgment: true
    rationale: "Prose quality and tone in contributor-facing legal documents is a human judgement; the assertions prove structure and the absence of banned claims, not that the writing lands."
  - id: D7
    description: "The Polish unauthorised-practice question is a named, dated, owned Phase 5 gate with its LOW confidence recorded rather than softened"
    verification:
      - kind: integration
        ref: "grep -c 'LOW' docs/POLISH-UPL-GATE.md = 7; question, owner, review date and ships-only-once-cleared all asserted present; no answer asserted"
        status: pass
    human_judgment: false
  - id: D8
    description: "The repository is public under a decided name"
    requirement: LEGAL-03
    verification: []
    human_judgment: true
    rationale: "NOT DONE. The name is decided and applied; the repository is deliberately still PRIVATE, awaiting the human review of the drill evidence that the plan's own ordering requires before the irreversible publish."

duration: 47 min
completed: 2026-09-14
status: halted
---

# Phase 01 Plan 05: Governance Gates Summary

**Nine-rule policy lint plus a cross-artefact referential pass gating every pull request offline, the full contributor governance set, and five deliberately bad pull requests driven through CI and rejected — with the repository deliberately still private, awaiting the human review that precedes publication.**

## Performance

- **Duration:** 47 min
- **Tasks:** 3 complete, 1 partial (task 4 halted at its `<human-check>`)
- **Files created/modified:** 28
- **Commits:** 6

## Accomplishments

- **The policy lint.** `L1_fileCoverage`, `L2_verifiedHasSource`, `L3_pendingIsNull`, `L4_noUnsourcedStatute`, `L5_urlHygiene`, `L6_linkLiveness`, `L7_letterCoverage`, `L8_freshness`, `L9_proposedCannotVerify`, plus the unchanged-bump rule, aggregated by `lintAll`. L5 delegates to `assertFetchable`, L8 to `freshnessGate`, BUMP to `assertNoUnchangedBump` — each pinned by the delegate's own error type or wording, so a second implementation cannot appear silently.
- **The referential pass.** `assertFallbackKeysResolve` resolves every key in `DIRECTIVE_FALLBACK_KEYS` and every `directive_fallback` value under `data/` and `proposed/` against the 66-entry corpus, naming both the key and the carrying record on failure. This is the resolve half plan 04 could only assert as a shape.
- **The pull-request profile.** `schema-and-lint`, `offline-suite` and `freshness-gate` as named jobs, with no `paths:` filter, so a proposed-only pull request runs the same three.
- **The governance set.** CODEOWNERS, PR template, CONTRIBUTING, SECURITY, REPORTING-LEGAL-ERRORS, CHANGELOG-legal, the proposed-directory guide and the Polish UPL gate.
- **The drill.** Five real pull requests, five rejections, none merged — see `docs/BAD-PR-DRILL.md`.
- **The naming decision applied.** `paytransparency` across the repository, the three package manifests, the npm scope, the emitted JSON Schema and every contributor-facing document.

## Task Commits

1. **Task 1 RED** — `e30711b` (test)
2. **Task 1 GREEN** — `7ba2502` (feat)
3. **Task 2** — `88a2c75` (docs)
4. **Task 3 decision applied** — `cd8c5cf` (chore)
5. **Pre-drill gate hardening** — `8abccad` (fix)
6. **Task 4 drill evidence** — `1b29de7` (docs)

No REFACTOR commit: the GREEN implementation needed no cleanup, and `tdd.md` commits REFACTOR only on change.

## Decisions Made

- **`paytransparency`**, decided by the human at the task 3 checkpoint. Named after the Directive rather than after a verdict; `fairpay` and `equalpay` were rejected because they editorialise, which would contradict the rule — asserted 19 ways in task 2 — that no document claims a user has a claim or an employer is in breach.
- **L4's scope** is every string in a record except those inside an evidence-bearing container (a `Source`, a register-harvested `DiscoveryHint`, a sourced `Proposal`, or a `verified`+sourced / `directive_fallback` fact). Calibrated empirically against the committed tree first: a naive "no statute strings anywhere" rule produced 23 false positives on register-harvested titles and source anchors.
- **`assertFallbackKeysResolve` checks every corpus language.** `resolve()` throws rather than serving English under another language's name, so an `eng`-only pass would have green-lit a blank citation on nine locales.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cellar fixtures were subtree slices fed to a whole-response byte floor**
- **Found during:** Task 1, first `verify:sources` run
- **Issue:** `cellar-art3-en.xhtml` (16 KB) and `cellar-art12-en.xhtml` (1.7 KB) are subtree *slices* used by the extraction tests, not HTTP responses. Selecting them by article produced two `below_byte_floor` data defects that did not exist — the kind of false red that invites someone to "fix" it by lowering the floor.
- **Fix:** fixtures are now selected by **language** over whole-expression captures only, with the reason written at the call site.
- **Commit:** `7ba2502`

**2. [Rule 1 - Bug] A Proposal was being dispatched as a Fact**
- **Found during:** Task 1, same run
- **Issue:** `proposals[].sources` were verified as though they were facts, so every `manual-attest` proposal reported `attestation_missing`. A proposal carries `drafted_by`, never `verified_by`, and by D-11 cannot be verified where it sits — that is the promotion boundary working, not a defect.
- **Fix:** proposals report as awaiting promotion; the allowlist pre-flight, which genuinely belongs at proposal time, still runs on them.
- **Commit:** `7ba2502`

**3. [Rule 2 - Missing Critical] The unchanged-bump rule was inert in CI**
- **Found during:** Task 4, preparing the drill
- **Issue:** `lintAll` reported `BUMP SKIP` on every pull request because nothing supplied the base-branch revision. The plan's own must-have — "a pull request that advances a fact's `verified_at` without changing its value fails the lint" — was unenforceable.
- **Fix:** `validate:country-data --base <ref>` retrieves each record as it stands on the base via `git show`; the workflow passes the PR base SHA and checks out with `fetch-depth: 0`.
- **Verification:** drill case 4 proves it. The identical defect on the identical commit **passed** the `push` run (`BUMP SKIP`) and **failed** the `pull_request` run (`BUMP FAIL`).
- **Commit:** `8abccad`

**4. [Rule 2 - Missing Critical] An accepted-but-empty source reported "queued", not a defect**
- **Found during:** Task 4, designing drill case 3
- **Issue:** `eur-lex.europa.eu` is kept off the allowlist because it answers with a zero-byte body — but the allowlist is a file a contributor can edit. Someone who widened it would have got a green, because no committed fixture stood in for the host.
- **Fix:** the captured `202`/empty, `403` interstitial and client-shell envelopes are registered by host, so citing any of them is a deterministic offline `data_defect`.
- **Verification:** drill case 3. `L5` reported **ok** (the allowlist had been widened) and the verifier caught it anyway.
- **Commit:** `8abccad`

**5. [Rule 3 - Blocking] `fetch-depth` collided with the workflow's offline guard**
- **Found during:** Task 4
- **Issue:** `spine.test.ts` forbade the substring `fetch` anywhere in `legal-data.yml`. `fetch-depth: 0` is a clone-depth option, not a legal-source retrieval, but the guard could not tell them apart.
- **Fix:** the guard was made **stricter**, not weaker. `curl`/`wget`/`Invoke-WebRequest` remain banned outright; `fetch` is permitted only as the exact token `fetch-depth` (a bare `fetch(` still fails); and two new assertions were added — every `run:` command must be one of an enumerated set, and only first-party `actions/checkout` and `actions/setup-node` may be used. Mutation-tested: a `curl` run step, a bare `fetch(` and a third-party action are each caught, and the command guard matches 11 real lines rather than passing vacuously.
- **Commit:** `8abccad`

**6. [Rule 1 - Bug] Drill case 2 was rejected by two layers rather than one**
- **Found during:** Task 4
- **Issue:** the first attempt used `kind: "commentary"`, which is not a valid `SourceKind`, so schema parse also failed. That left open whether L5 alone has teeth.
- **Fix:** corrected to the **valid** kind `law_firm` and re-run: `0 schema issues`, L5 alone refuses it. The weaker evidence was replaced rather than kept.
- **Commit:** recorded in `docs/BAD-PR-DRILL.md`

**7. [Rule 2 - Missing Critical] The rename extended past the eight enumerated files**
- **Found during:** Task 3 application
- **Issue:** `jafn-project-brief.md` and `.claude/CLAUDE.md` also carried the superseded name and are both publicly visible. Task 4's acceptance criterion requires that no contributor-facing document carries it.
- **Fix:** the brief was renamed to `project-brief.md` with a dated naming note, its body left as the historical record; CLAUDE.md's project header updated.
- **Commit:** `cd8c5cf`

---

**Total deviations:** 7 auto-fixed (3 bugs, 3 missing critical, 1 blocking).
**Impact:** four of the seven are gates that were documented but could not fire. Finding them before publication rather than after is the whole reason the drill is a deliverable rather than a check. No scope creep.

## Findings recorded rather than resolved

- **Drill case 4's expected `freshness-gate` co-rejection did not fire, and should not have.** A date moving *forward* makes a fact fresher, not staler. The plan's expectation was wrong about the mechanism; it is recorded as stated rather than edited to match.
- **Drill case 4's specified variant was unbuildable.** Every launch country's `article_7.response_deadline` is still `pending_verification` with `value: null`, because D-06 reserves promotion to a human. There is no two-month value to shorten. The literal variant would have been caught by L3.
- **The measured worker-visible gap.** Case 4's diff is a **single character** in a JSON date. A reviewer skimming a change described as a typo fix would very likely approve it. Phase 5's letter snapshot tests are what turn that into a letter diff.

## Issues Encountered

- **The npm scope is not proven free.** `npm org ls paytransparency` returns `404 Scope not found`, and both the unscoped name and a scoped package 404. That is *consistent with* availability but is not proof, because the query was unauthenticated. Both packages are `private: true` at `0.0.0`, so nothing is published and the scope is not yet claimed. Logged to `.planning/WINDOWS.md`; re-check with an authenticated `npm org` or a publish dry-run before the first publish.

## Known Stubs

None. `L6` and `L7` are not stubs: both are fully authored rules that record a SKIP with a stated reason because their preconditions (the nightly profile, and `packages/letters`) do not yet exist. Both arm themselves automatically. Logged to `.planning/WINDOWS.md` as `unrun-verify` so they are visible at ship time.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary was introduced. `validate.ts` gained a `git show` invocation, which is read-only, local, and takes a ref supplied by CI rather than by a contributor.

## User Setup Required

None.

## Next Phase Readiness

**This plan is HALTED at a designed stop, not complete.**

Done: tasks 1, 2 and 3, and task 4's drill. The repository is `MarekFish93/paytransparency`, renamed, with all gates green.

**Outstanding — the go-public step.** The plan's own ordering makes publication conditional on a human reading the five drill pull requests and judging whether each failure message would help a first-time contributor. `gh repo view --json visibility` reads **PRIVATE**, and must still read PRIVATE until that review happens. Publishing cannot be undone.

Also outstanding before publication: branch protection requiring the three named checks, and auto-merge disabled. These are repository settings rather than repository content, and they belong with the same human action.
