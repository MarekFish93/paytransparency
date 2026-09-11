---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 1
total_count: 2
last_updated: 2026-09-11T11:54:42.911Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | packages/country-data/src/verifier.ts |  | verifySource implements the cellar strategy only; html-anchor, jsonld and metadata-only throw not-implemented against a frozen signature (plan 01-02 fills them) | fixed |  | 2026-09-11T11:16:20.879Z | 2026-09-11T11:54:42.911Z |
| 2 | 01 | unrun-verify | .github/workflows/nightly.yml |  | nightly.yml dispatch verification could not run: gh workflow run returns HTTP 404 until the file is on the default branch. Re-run 'gh workflow run nightly.yml' after the phase branch merges. | open |  | 2026-09-11T11:54:27.074Z |  |

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
  }
]
````
