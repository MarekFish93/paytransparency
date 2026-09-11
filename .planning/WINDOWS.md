---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 1
total_count: 4
last_updated: 2026-09-11T12:11:23.044Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | packages/country-data/src/verifier.ts |  | verifySource implements the cellar strategy only; html-anchor, jsonld and metadata-only throw not-implemented against a frozen signature (plan 01-02 fills them) | fixed |  | 2026-09-11T11:16:20.879Z | 2026-09-11T11:54:42.911Z |
| 2 | 01 | unrun-verify | .github/workflows/nightly.yml |  | nightly.yml dispatch verification could not run: gh workflow run returns HTTP 404 until the file is on the default branch. Re-run 'gh workflow run nightly.yml' after the phase branch merges. | open |  | 2026-09-11T11:54:27.074Z |  |
| 3 | 01 | unmet-truth | docs/share-url-contract.md |  | Share-URL bucket population estimates are MODELLED, not sourced; a Eurostat-grounded figure must replace them before the card ships in Phase 4, widening any band that falls under the 25,000 k-anonymity floor | open |  | 2026-09-11T12:11:18.365Z |  |
| 4 | 01 | unmet-truth | packages/directive-engine/docs/ENGINE-REPORT.md |  | The single-number reduction on metrics (e), (f) and (g) is an authoring decision forced by the frozen MetricValue carrying one nullable number; Phase 6 must confirm it or amend the contract through the recorded amendment path | open |  | 2026-09-11T12:11:23.044Z |  |

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
    "id": 4,
    "kind": "unmet-truth",
    "phase": "01",
    "file": "packages/directive-engine/docs/ENGINE-REPORT.md",
    "line": null,
    "description": "The single-number reduction on metrics (e), (f) and (g) is an authoring decision forced by the frozen MetricValue carrying one nullable number; Phase 6 must confirm it or amend the contract through the recorded amendment path",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T12:11:23.044Z",
    "resolved_at": null
  }
]
````
