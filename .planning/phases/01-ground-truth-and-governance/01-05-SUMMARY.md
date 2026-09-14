---
phase: 01-ground-truth-and-governance
plan: 05
subsystem: infra
tags: [governance, ci, lint, codeowners, contributing, upl, drill, naming, disclosure]

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
  - docs/BAD-PR-DRILL.md — five rejected pull requests, with a stated limit on their verifiability
  - The project name paytransparency, applied across repo, packages, scope and docs
  - A PUBLIC repository at MarekFish93/paytransparency with branch protection on master
affects: [phase-2-design, phase-3-ui, phase-4-share-card, phase-5-letters, phase-6-engine]

actuals:
  tokens: 52010
  tasks: 4
  commits: 9
plan_head_before: 37d0564737441b35acc3ed9ab410cc83cc9826c6

tech-stack:
  added: []
  patterns:
    - "Policy lint layered above schema parse: rules that need more than one record, or an artefact the parse cannot see, live outside the schema"
    - "Delegation pinned by the delegate's own error type or wording, so a second implementation cannot be introduced silently"
    - "A rule that cannot run records a SKIP with a stated reason; it is never counted as a pass"
    - "Evidence-bearing containers: a statute string is legal only inside a source, a register hint, a sourced proposal, or a verified+sourced fact"
    - "A pre-flight full-history sweep before every irreversible action, re-run against the corrected artefact rather than the corrected intention"

key-files:
  created:
    - packages/country-data/src/lint.ts
    - packages/country-data/scripts/validate.ts
    - packages/country-data/scripts/verify-sources.ts
    - packages/country-data/test/lint.test.ts
    - .github/CODEOWNERS
    - .github/PULL_REQUEST_TEMPLATE.md
    - .github/ISSUE_TEMPLATE/legal-error.yml
    - .github/ISSUE_TEMPLATE/config.yml
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
  - "spine.test.ts's offline guard was made stricter, not weaker, to admit fetch-depth: enumerated run commands and first-party-only actions were added. Accepted on review."
  - "Published from a FRESH repository, with the original kept private as the drill archive, because a history rewrite cannot remove content from refs/pull/N/head"
  - "Branch protection sets enforce_admins=false: a solo maintainer who cannot bypass cannot merge at all, and an unmergeable repository gets its protection switched off"

patterns-established:
  - "Gate hardening precedes the drill: a drill against an inert gate proves nothing"
  - "Record the difference, never edit the expectation — a gate that catches a defect for the wrong reason is a finding"
  - "Claim only what was evidenced, and state where the evidence cannot be checked"
  - "Re-run a verification against the corrected artefact, not the corrected intention"

requirements-completed: [LEGAL-03, LEGAL-08, LEGAL-10]

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
        ref: "legal-data.yml on MarekFish93/paytransparency@fc9fa39 — schema-and-lint, offline-suite, freshness-gate all success"
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
        ref: "Five PRs in the PRIVATE archive MarekFish93/paytransparency-archive, all closed, none merged; per-case failing job and rule transcribed in docs/BAD-PR-DRILL.md"
        status: pass
    human_judgment: true
    rationale: "Reviewed and approved by a human before publication. The evidence is NOT publicly verifiable — the runs live in the private archive — and docs/BAD-PR-DRILL.md states that limit plainly rather than implying otherwise."
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
    description: "The repository is public under a decided name, with branch protection requiring the three named checks and auto-merge disabled"
    requirement: LEGAL-03
    verification:
      - kind: integration
        ref: "gh repo view --json visibility -> public; default_branch master; allow_auto_merge false"
        status: pass
      - kind: integration
        ref: "branches/master/protection read back -> contexts [schema-and-lint, offline-suite, freshness-gate], strict true, force_push false, deletions false, code-owner review true"
        status: pass
    human_judgment: false
  - id: D9
    description: "Nothing published carries a secret, a credential or content that should not be public"
    verification:
      - kind: integration
        ref: "Full-history sweep of the exact push candidate: 82 commits, 4,287,100 bytes of patches + messages + identities; 13 secret classes clean; 0 commit trees containing the address; verdict CLEAN"
        status: pass
      - kind: integration
        ref: "Post-push sweep of the new remote: 0 PRs, 0 refs/pull/*/head, 0 hits on origin/master"
        status: pass
    human_judgment: false

duration: 78 min
completed: 2026-09-14
status: complete
---

# Phase 01 Plan 05: Governance Gates Summary

**Nine-rule policy lint plus a cross-artefact referential pass gating every pull request offline, the full contributor governance set, five deliberately bad pull requests driven through CI and rejected — and a public repository published from a freshly created, swept history after a pre-flight sweep found content that a branch rewrite alone could not remove.**

## Performance

- **Duration:** 78 min
- **Tasks:** 4 of 4
- **Files created/modified:** 30
- **Commits:** 9

## Accomplishments

- **The policy lint.** `L1_fileCoverage`, `L2_verifiedHasSource`, `L3_pendingIsNull`, `L4_noUnsourcedStatute`, `L5_urlHygiene`, `L6_linkLiveness`, `L7_letterCoverage`, `L8_freshness`, `L9_proposedCannotVerify`, plus the unchanged-bump rule, aggregated by `lintAll`. L5 delegates to `assertFetchable`, L8 to `freshnessGate`, BUMP to `assertNoUnchangedBump` — each pinned by the delegate's own error type or wording.
- **The referential pass.** `assertFallbackKeysResolve` resolves every key in `DIRECTIVE_FALLBACK_KEYS` and every `directive_fallback` value under `data/` and `proposed/` against the 66-entry corpus, in all eleven corpus languages.
- **The pull-request profile.** `schema-and-lint`, `offline-suite` and `freshness-gate` as named jobs, with no `paths:` filter, so a proposed-only pull request runs the same three.
- **The governance set**, plus a `legal-error` issue form so a reporter does not have to know what fields we need.
- **The drill.** Five real pull requests, five rejections, none merged.
- **Published.** `MarekFish93/paytransparency` is PUBLIC, `master` protected, auto-merge off.

## Task Commits

1. **Task 1 RED** — `e30711b` (test)
2. **Task 1 GREEN** — `7ba2502` (feat)
3. **Task 2** — `bc844a0` (docs)
4. **Task 3 decision applied** — `4764b0f` (chore)
5. **Pre-drill gate hardening** — `cab176f` (fix)
6. **Task 4 drill evidence** — `e6e8e54` (docs)
7. **Plan close-out (halted)** — `24efd33` (docs)
8. **GitHub-native reporting routes** — `dc07142` (docs)
9. **Verifiability limit stated** — `fc9fa39` (docs)

Commits 3–7 carry rewritten SHAs; see finding 8. No REFACTOR commit — the GREEN implementation needed no cleanup.

## Decisions Made

- **`paytransparency`**, decided by the human. Named after the Directive rather than after a verdict; `fairpay` and `equalpay` were rejected because they editorialise, which would contradict the rule — asserted 19 ways in task 2 — that no document claims a user has a claim or an employer is in breach.
- **L4's scope** is every string in a record except those inside an evidence-bearing container. Calibrated empirically first: a naive "no statute strings anywhere" rule produced 23 false positives on register-harvested titles and source anchors.
- **Published from a fresh repository** rather than from the original — see finding 9.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cellar fixtures were subtree slices fed to a whole-response byte floor**
- **Found during:** Task 1, first `verify:sources` run
- **Issue:** `cellar-art3-en.xhtml` (16 KB) and `cellar-art12-en.xhtml` (1.7 KB) are subtree *slices* used by the extraction tests, not HTTP responses. Selecting them by article produced two `below_byte_floor` data defects that did not exist — the kind of false red that invites someone to "fix" it by lowering the floor.
- **Fix:** fixtures selected by **language** over whole-expression captures only, with the reason at the call site.
- **Commit:** `7ba2502`

**2. [Rule 1 - Bug] A Proposal was being dispatched as a Fact**
- **Found during:** Task 1, same run
- **Issue:** `proposals[].sources` were verified as though they were facts, so every `manual-attest` proposal reported `attestation_missing`. A proposal carries `drafted_by`, never `verified_by`, and by D-11 cannot be verified where it sits — that is the promotion boundary working, not a defect.
- **Fix:** proposals report as awaiting promotion; the allowlist pre-flight still runs on them.
- **Commit:** `7ba2502`

**3. [Rule 2 - Missing Critical] The unchanged-bump rule was inert in CI**
- **Found during:** Task 4, preparing the drill
- **Issue:** `lintAll` reported `BUMP SKIP` on every pull request because nothing supplied the base-branch revision. The plan's own must-have was unenforceable.
- **Fix:** `validate:country-data --base <ref>` retrieves each record as it stands on the base via `git show`; the workflow passes the PR base SHA and checks out with `fetch-depth: 0`.
- **Verification:** drill case 4 proves the fix was load-bearing. The identical defect on the identical commit **passed** the `push` run (`BUMP SKIP`) and **failed** the `pull_request` run (`BUMP FAIL`).
- **Commit:** `cab176f`

**4. [Rule 2 - Missing Critical] An accepted-but-empty source reported "queued", not a defect**
- **Found during:** Task 4, designing drill case 3
- **Issue:** `eur-lex.europa.eu` is kept off the allowlist because it answers with a zero-byte body — but the allowlist is a file a contributor can edit. Someone who widened it would have got a green.
- **Fix:** the captured `202`/empty, `403` interstitial and client-shell envelopes are registered by host.
- **Verification:** drill case 3. `L5` reported **ok** (the allowlist had been widened) and the verifier caught it anyway.
- **Commit:** `cab176f`

**5. [Rule 3 - Blocking] `fetch-depth` collided with the workflow's offline guard**
- **Found during:** Task 4
- **Issue:** `spine.test.ts` forbade the substring `fetch` anywhere in `legal-data.yml`. `fetch-depth: 0` is a clone-depth option, not a legal-source retrieval.
- **Fix:** the guard was made **stricter**, not weaker. `curl`/`wget`/`Invoke-WebRequest` remain banned outright; `fetch` is permitted only as the exact token `fetch-depth`; two new assertions were added — enumerated `run:` commands, and first-party actions only. Mutation-tested: a `curl` run step, a bare `fetch(` and a third-party action are each caught, and the command guard matches 11 real lines rather than passing vacuously.
- **Reviewed:** surfaced explicitly at the checkpoint and **accepted** — a guard that blocks legitimate usage is one someone eventually deletes.
- **Commit:** `cab176f`

**6. [Rule 1 - Bug] Drill case 2 was rejected by two layers rather than one**
- **Found during:** Task 4
- **Issue:** the first attempt used `kind: "commentary"`, not a valid `SourceKind`, so schema parse also failed. That left open whether L5 alone has teeth.
- **Fix:** corrected to the **valid** kind `law_firm` and re-run: `0 schema issues`, L5 alone refuses it.

**7. [Rule 2 - Missing Critical] The rename extended past the eight enumerated files**
- **Found during:** Task 3 application
- **Issue:** `jafn-project-brief.md` and `.claude/CLAUDE.md` also carried the superseded name and are both publicly visible.
- **Fix:** the brief renamed to `project-brief.md` with a dated naming note, its body left as the historical record; CLAUDE.md's project header updated.
- **Commit:** `4764b0f`

**8. [Rule 2 - Missing Critical] An address supplied as identifying context was published as a contact channel**
- **Found during:** the pre-flight sweep before the irreversible publish
- **Issue:** `REPORTING-LEGAL-ERRORS.md` published the user's **personal** Gmail as the world-readable legal-error route. It had been supplied only as identifying context for authorship and attribution. **Nobody decided to publish it — I assumed it.** Once public it would be in history permanently, and a clone taken in the first minute survives any later correction.
- **Fix:** replaced with GitHub-native routes — a `legal-error` issue form and the private Security Advisory path — with **no substitute address invented**, and the remaining gap (no account *and* wants privacy) stated in the document rather than papered over. The branch was then rewritten: 0 hits across all trees, patches and messages.
- **Commit:** `dc07142`, plus the rewrite of `bc844a0`…`24efd33`

**9. [Rule 4 - Architectural] A history rewrite cannot remove content from `refs/pull/*/head`**
- **Found during:** re-running the sweep **after** the rewrite, rather than trusting it
- **Issue:** the branch was genuinely clean, but all five `refs/pull/1..5/head` still resolved to the contaminated commit. GitHub retains PR head refs independently of the branch; they survive branch deletion *and* history rewriting, are fetchable by anyone on a public repo, and a closed PR cannot be deleted via the API. Deleting the drill branches would not have helped.
- **Escalated, not auto-fixed** — this changed the publication strategy, which is a Rule 4 decision.
- **Resolution (human-approved):** the clean history was pushed to a **fresh** repository, published there, and the original kept **private** as the drill archive with all five PRs and their runs intact.
- **Commit:** `fc9fa39` records the consequence for readers.

---

**Total deviations:** 9 — 3 bugs, 5 missing-critical, 1 architectural.
**Impact:** six of the nine are controls or disclosures that were documented but did not hold. Finding them before publication rather than after is the entire reason the drill and the sweep are deliverables rather than checks. No scope creep.

## Findings recorded rather than resolved

- **Drill case 4's expected `freshness-gate` co-rejection did not fire, and should not have.** A date moving *forward* makes a fact fresher, not staler. The plan's expectation was wrong about the mechanism; recorded as stated rather than edited to match, on explicit instruction.
- **Drill case 4's specified variant was unbuildable.** Every launch country's `article_7.response_deadline` is still `pending_verification` with `value: null` under D-06, so there is no two-month value to shorten. The literal variant would have been caught by L3.
- **The measured worker-visible gap.** Case 4's diff is a **single character** in a JSON date. A reviewer skimming a change described as a typo fix would very likely approve it. Phase 5's letter snapshot tests are what turn that into a letter diff.
- **The structural lesson, which outlives this plan.** A pre-flight full-history sweep belongs before **every** one-way action — and it must be re-run **against the corrected artefact, not the corrected intention**. Finding 8 was caught only by the first rule; finding 9 only by the second. Phase 3 ships a zero-egress oracle and Phase 4 a share card; both have one-way moments where this class of mistake would be worse.

## Issues Encountered

- **The npm scope is not proven free.** `npm org ls paytransparency` returns `404 Scope not found` and both name forms 404 — consistent with availability, **not proof**, because the query was unauthenticated. Both packages are `private: true` at `0.0.0`. Re-check authenticated before the first publish.
- **`gh repo edit --visibility public` returned a network error but the write had taken.** Checking before retrying is what established that; a blind retry would have been harmless here and will not always be.

## Known Stubs

None. `L6` and `L7` are fully authored rules that record a SKIP with a stated reason because their preconditions do not yet exist, and both arm themselves automatically.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | `REPORTING-LEGAL-ERRORS.md` | Resolved before publication — see findings 8 and 9. Recorded because T-1-27 modelled "publishing exposes the entire history" as mitigated by the drill ordering alone; it did not model *content introduced by this plan itself*. Future one-way steps must sweep their own output, not only inherited history. |

## User Setup Required

None.

## Next Phase Readiness

**Complete.** `MarekFish93/paytransparency` is public; `master` requires `schema-and-lint`, `offline-suite` and `freshness-gate`, blocks force-pushes and deletions, requires code-owner review, and has auto-merge disabled. `MarekFish93/paytransparency-archive` stays private and holds the drill evidence.

**Carried forward as open items in `.planning/WINDOWS.md`** — four, all deliberately open:
1. The `@paytransparency` npm scope is not proven free.
2. `freshness-gate`, L6 and L7 have never rejected anything.
3. The drill evidence is not independently verifiable from the public repository.
4. `enforce_admins=false` on branch protection: with one maintainer, an admin who cannot bypass cannot merge at all. Flip it the day a second maintainer exists.
