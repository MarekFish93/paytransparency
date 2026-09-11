# JAFN — ask about your pay

A free, no-signup toolkit that lets an employee in the EU use their rights under the
Pay Transparency Directive (EU) 2023/970, and an open-source Directive engine underneath it.

**No salary data reaches a server.** Every calculation runs in your browser; nothing you type is
transmitted. (The full privacy proof — CSP, headers, and the egress test that enforces it — lands
with the web app.)

## Licensing

| Path | Licence |
|------|---------|
| Repository root and `apps/**` | `AGPL-3.0-only` |
| `packages/country-data` | `AGPL-3.0-only` |
| `packages/directive-engine` | `MIT` (declared per-package) |

The engine is MIT so it can be adopted freely; the web app is AGPL so hosted clones stay open.

## Legal data

Every legal fact in `packages/country-data` carries a source URL and a `verified_at` date, verified
against primary text retrieved from the Publications Office Cellar API. A fact whose value is not
known is `null` with status `pending_verification` — never a guess.

## Status

Pre-release. The repository name `jafn` is a placeholder pending the brand decision.
