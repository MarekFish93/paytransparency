---
schema_version: 1
open_count: 12
waived_count: 0
fixed_count: 1
total_count: 13
last_updated: 2026-09-14T10:44:30.777Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | packages/country-data/src/verifier.ts |  | verifySource implements the cellar strategy only; html-anchor, jsonld and metadata-only throw not-implemented against a frozen signature (plan 01-02 fills them) | fixed |  | 2026-09-11T11:16:20.879Z | 2026-09-11T11:54:42.911Z |
| 2 | 01 | unrun-verify | .github/workflows/nightly.yml |  | nightly.yml dispatch verification could not run: gh workflow run returns HTTP 404 until the file is on the default branch. Re-run 'gh workflow run nightly.yml' after the phase branch merges. | open |  | 2026-09-11T11:54:27.074Z |  |
| 3 | 01 | stub | packages/country-data/data/BG.json |  | Bulgaria's country.currency is null pending verification of its euro-adoption date; every other member state carries an ISO-4217 code | open |  | 2026-09-11T12:03:37.975Z |  |
| 4 | 01 | deviation | packages/country-data/src/country.ts |  | transposition.draft_asserting_sources replaces a says_draft flag on Source, because Source is frozen by plan 01-01 and a Fact's sources array strips added keys | open |  | 2026-09-11T12:03:42.330Z |  |
| 5 | 01 | unmet-truth | docs/share-url-contract.md |  | Share-URL bucket population estimates are MODELLED, not sourced; a Eurostat-grounded figure must replace them before the card ships in Phase 4, widening any band that falls under the 25,000 k-anonymity floor | open |  | 2026-09-11T12:11:18.365Z |  |
| 6 | 01 | unmet-truth | packages/directive-engine/docs/ENGINE-REPORT.md |  | The single-number reduction on metrics (e), (f) and (g) is an authoring decision forced by the frozen MetricValue carrying one nullable number; Phase 6 must confirm it or amend the contract through the recorded amendment path | open |  | 2026-09-11T12:11:23.044Z |  |
| 7 | 01 | unrun-verify | docs/BAD-PR-DRILL.md |  | L6 link-liveness and L7 letter-coverage report SKIP by design and have never been seen to reject; freshness-gate has never been seen to fail. Not provable until a maintainer promotion under D-06 creates a verified launch-country legally-operative fact. | open |  | 2026-09-14T08:20:09.333Z |  |
| 8 | 01 | deviation | packages/directive-engine/package.json |  | npm scope @paytransparency is unclaimed as far as an UNAUTHENTICATED registry query can show (npm org ls returns 404 Scope not found; both the unscoped name and a scoped package 404). That is consistent with availability but is not proof. Both packages are private:true and version 0.0.0, so nothing is published and the scope is not yet claimed. Re-check with an authenticated npm org / publish dry-run before the first publish. | open |  | 2026-09-14T08:20:15.905Z |  |
| 9 | 01 | deviation | REPORTING-LEGAL-ERRORS.md |  | An address supplied purely as identifying context (authorship/attribution) was reused as a world-readable support channel in a governance document. Nobody decided to publish it; it was assumed. Caught only because a full-history sweep was placed as a pre-flight on the irreversible publish. Structural lesson: the sweep belongs before EVERY one-way action, and identifying context is not publishable content. Phase 3's zero-egress oracle and Phase 4's share card are the next surfaces where this class of mistake would be worse. | open |  | 2026-09-14T08:39:57.506Z |  |
| 10 | 01 | deviation | docs/BAD-PR-DRILL.md |  | A git history rewrite is NOT sufficient to remove content once a pull request has existed against the contaminated commit. GitHub retains refs/pull/N/head independently of the branch; those refs survive branch deletion AND history rewriting, are fetchable by anyone on a public repo, and a closed PR cannot be deleted via the API. Verified empirically: after a clean rewrite, origin/ci branch returned 0 hits while all five refs/pull/N/head still resolved to the contaminated commit. Caught ONLY because the sweep was re-run against the corrected artefact rather than trusting the corrected intention. Resolution was a fresh repository; the original is kept private as the drill archive. | open |  | 2026-09-14T08:40:04.375Z |  |
| 11 | 01 | unrun-verify | docs/BAD-PR-DRILL.md |  | The public repository's drill evidence is NOT independently verifiable: the five pull requests and their CI runs live in the private archive MarekFish93/paytransparency-archive. A reader takes the transcribed failure output on trust. Stated plainly in the document itself rather than glossed, with the four commands a reader CAN run locally to exercise every rule the transcription is about. Closing this needs either a public re-run of the drill on the new repository or published run artefacts. | open |  | 2026-09-14T08:40:10.863Z |  |
| 12 | 01 | deviation | .github/CODEOWNERS |  | Branch protection on master has enforce_admins=false. With a single maintainer, an admin who cannot bypass cannot merge at all (no self-approval), and an unmergeable repository gets its protection switched off within a month. The three required checks, code-owner review, no force-push and no deletions ARE enforced; the documented two-person rule in CONTRIBUTING.md is therefore a policy commitment above a weaker mechanical floor. Flip enforce_admins to true as soon as a second maintainer exists. | open |  | 2026-09-14T08:40:17.118Z |  |
| 13 | 01 | unmet-truth | packages/country-data/data/ |  | Launch-country Art. 6, 7 and 12(3) facts (PL, SK, IT, LT, MT) remain pending_verification. D-06 reserves promotion to a human who has read the primary source; letters fall back to the Directive article until then. Owed before Phase 5 ships letters. Accepted at phase-01 UAT 2026-09-14 as maintainer work, not a phase gap. | open |  | 2026-09-14T10:44:30.777Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "01",
    "file": "packages/country-data/src/verifier.ts",
    "line": null,
    "description": "verifySource implements the cellar strategy only; html-anchor, jsonld and metadata-only throw not-implemented against a frozen signature (plan 01-02 fills them)",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-11T11:16:20.879Z",
    "resolved_at": "2026-09-11T11:54:42.911Z"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "01",
    "file": ".github/workflows/nightly.yml",
    "line": null,
    "description": "nightly.yml dispatch verification could not run: gh workflow run returns HTTP 404 until the file is on the default branch. Re-run 'gh workflow run nightly.yml' after the phase branch merges.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T11:54:27.074Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "stub",
    "phase": "01",
    "file": "packages/country-data/data/BG.json",
    "line": null,
    "description": "Bulgaria's country.currency is null pending verification of its euro-adoption date; every other member state carries an ISO-4217 code",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T12:03:37.975Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/country-data/src/country.ts",
    "line": null,
    "description": "transposition.draft_asserting_sources replaces a says_draft flag on Source, because Source is frozen by plan 01-01 and a Fact's sources array strips added keys",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T12:03:42.330Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "unmet-truth",
    "phase": "01",
    "file": "docs/share-url-contract.md",
    "line": null,
    "description": "Share-URL bucket population estimates are MODELLED, not sourced; a Eurostat-grounded figure must replace them before the card ships in Phase 4, widening any band that falls under the 25,000 k-anonymity floor",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T12:11:18.365Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "unmet-truth",
    "phase": "01",
    "file": "packages/directive-engine/docs/ENGINE-REPORT.md",
    "line": null,
    "description": "The single-number reduction on metrics (e), (f) and (g) is an authoring decision forced by the frozen MetricValue carrying one nullable number; Phase 6 must confirm it or amend the contract through the recorded amendment path",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T12:11:23.044Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/BAD-PR-DRILL.md",
    "line": null,
    "description": "L6 link-liveness and L7 letter-coverage report SKIP by design and have never been seen to reject; freshness-gate has never been seen to fail. Not provable until a maintainer promotion under D-06 creates a verified launch-country legally-operative fact.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-14T08:20:09.333Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 8,
    "kind": "deviation",
    "phase": "01",
    "file": "packages/directive-engine/package.json",
    "line": null,
    "description": "npm scope @paytransparency is unclaimed as far as an UNAUTHENTICATED registry query can show (npm org ls returns 404 Scope not found; both the unscoped name and a scoped package 404). That is consistent with availability but is not proof. Both packages are private:true and version 0.0.0, so nothing is published and the scope is not yet claimed. Re-check with an authenticated npm org / publish dry-run before the first publish.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-14T08:20:15.905Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "01",
    "file": "REPORTING-LEGAL-ERRORS.md",
    "line": null,
    "description": "An address supplied purely as identifying context (authorship/attribution) was reused as a world-readable support channel in a governance document. Nobody decided to publish it; it was assumed. Caught only because a full-history sweep was placed as a pre-flight on the irreversible publish. Structural lesson: the sweep belongs before EVERY one-way action, and identifying context is not publishable content. Phase 3's zero-egress oracle and Phase 4's share card are the next surfaces where this class of mistake would be worse.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-14T08:39:57.506Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 10,
    "kind": "deviation",
    "phase": "01",
    "file": "docs/BAD-PR-DRILL.md",
    "line": null,
    "description": "A git history rewrite is NOT sufficient to remove content once a pull request has existed against the contaminated commit. GitHub retains refs/pull/N/head independently of the branch; those refs survive branch deletion AND history rewriting, are fetchable by anyone on a public repo, and a closed PR cannot be deleted via the API. Verified empirically: after a clean rewrite, origin/ci branch returned 0 hits while all five refs/pull/N/head still resolved to the contaminated commit. Caught ONLY because the sweep was re-run against the corrected artefact rather than trusting the corrected intention. Resolution was a fresh repository; the original is kept private as the drill archive.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-14T08:40:04.375Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "docs/BAD-PR-DRILL.md",
    "line": null,
    "description": "The public repository's drill evidence is NOT independently verifiable: the five pull requests and their CI runs live in the private archive MarekFish93/paytransparency-archive. A reader takes the transcribed failure output on trust. Stated plainly in the document itself rather than glossed, with the four commands a reader CAN run locally to exercise every rule the transcription is about. Closing this needs either a public re-run of the drill on the new repository or published run artefacts.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-14T08:40:10.863Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "01",
    "file": ".github/CODEOWNERS",
    "line": null,
    "description": "Branch protection on master has enforce_admins=false. With a single maintainer, an admin who cannot bypass cannot merge at all (no self-approval), and an unmergeable repository gets its protection switched off within a month. The three required checks, code-owner review, no force-push and no deletions ARE enforced; the documented two-person rule in CONTRIBUTING.md is therefore a policy commitment above a weaker mechanical floor. Flip enforce_admins to true as soon as a second maintainer exists.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-14T08:40:17.118Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 13,
    "kind": "unmet-truth",
    "phase": "01",
    "file": "packages/country-data/data/",
    "line": null,
    "description": "Launch-country Art. 6, 7 and 12(3) facts (PL, SK, IT, LT, MT) remain pending_verification. D-06 reserves promotion to a human who has read the primary source; letters fall back to the Directive article until then. Owed before Phase 5 ships letters. Accepted at phase-01 UAT 2026-09-14 as maintainer work, not a phase gap.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-14T10:44:30.777Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
