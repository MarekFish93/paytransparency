---
schema_version: 1
open_count: 7
waived_count: 0
fixed_count: 1
total_count: 8
last_updated: 2026-09-14T08:20:15.905Z
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
  }
]
````
