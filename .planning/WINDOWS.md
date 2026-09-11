---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 0
total_count: 3
last_updated: 2026-09-11T12:03:42.330Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | stub | packages/country-data/src/verifier.ts |  | verifySource implements the cellar strategy only; html-anchor, jsonld and metadata-only throw not-implemented against a frozen signature (plan 01-02 fills them) | open |  | 2026-09-11T11:16:20.879Z |  |
| 2 | 1 | stub | packages/country-data/data/BG.json |  | Bulgaria's country.currency is null pending verification of its euro-adoption date; every other member state carries an ISO-4217 code | open |  | 2026-09-11T12:03:37.975Z |  |
| 3 | 1 | deviation | packages/country-data/src/country.ts |  | transposition.draft_asserting_sources replaces a says_draft flag on Source, because Source is frozen by plan 01-01 and a Fact's sources array strips added keys | open |  | 2026-09-11T12:03:42.330Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "01",
    "file": "packages/country-data/src/verifier.ts",
    "line": null,
    "description": "verifySource implements the cellar strategy only; html-anchor, jsonld and metadata-only throw not-implemented against a frozen signature (plan 01-02 fills them)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T11:16:20.879Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "stub",
    "phase": "1",
    "file": "packages/country-data/data/BG.json",
    "line": null,
    "description": "Bulgaria's country.currency is null pending verification of its euro-adoption date; every other member state carries an ISO-4217 code",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T12:03:37.975Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "1",
    "file": "packages/country-data/src/country.ts",
    "line": null,
    "description": "transposition.draft_asserting_sources replaces a says_draft flag on Source, because Source is frozen by plan 01-01 and a Fact's sources array strips added keys",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-11T12:03:42.330Z",
    "resolved_at": null
  }
]
````
