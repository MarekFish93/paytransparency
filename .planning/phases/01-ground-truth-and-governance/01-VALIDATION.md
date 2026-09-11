---
phase: "1"
slug: "ground-truth-and-governance"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-11"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (`V4` dist-tag; VERIFIED via `npm view vitest dist-tags`) |
| **Config file** | none — Wave 0 creates `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run --dir packages/country-data` |
| **Full suite command** | `pnpm -r test` |
| **Estimated runtime** | ~15 seconds (fixture-driven; no network on the PR profile) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run --dir packages/country-data`
- **After every plan wave:** Run `pnpm -r test`
- **Before `/gsd-verify-work`:** Full suite green, plus the nightly live-source job green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this table binds each phase requirement to its
automated command and its Wave 0 dependency. The planner must carry each row into the
owning task's `<verify><automated>` block.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | ≥1 | LEGAL-01 | — | A `verified` fact without a source / `verified_at` fails schema parse | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "verified requires source"` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-01 | — | A `pending_verification` fact with a non-null value fails | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "pending must be null"` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-02 | — | Exactly 27 files, one per EU ISO-3166-1 alpha-2 code, filename matches `country.code` | unit | `pnpm vitest run packages/country-data/test/coverage.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-03 | — | `directive_fallback` status resolves to a Directive citation, never a national one | unit | `pnpm vitest run packages/country-data/test/resolve.test.ts -t "fallback"` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-04 | — | The stored Art. 7(4) quotation matches the Cellar text byte-for-byte in EN and PL | integration | `pnpm vitest run packages/country-data/test/directive-text.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-05 | — | Art. 12(3) modelled as a condition, not a boolean route | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "art_12_3"` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-06 | — | A human-confirm field cannot be satisfied by a register notification alone | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "human confirm"` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-07 | — | All six articles (3, 6, 7, 9, 10, 12) present with paragraph ids, in every served locale | integration | `pnpm vitest run packages/country-data/test/directive-text.test.ts -t "article coverage"` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-08 | — | Launch-country stale volatile fact fails; non-launch stale fact warns | unit | `pnpm vitest run packages/country-data/test/freshness.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | **LEGAL-09** | T-1-01 | 202/empty, 404, 400, 304, missing anchor, recital-scoped anchor, SPA shell each produce the correct classification | unit, **fixture-driven, no network** | `pnpm vitest run packages/country-data/test/verifier.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-09 | T-1-01 | Cellar responds 200 with `art_7` present | integration, **network (nightly only)** | `pnpm vitest run packages/country-data/test/verifier.live.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | LEGAL-10 | T-1-02 | The five bad-PR shapes each fail CI | e2e | **manual (D-12)** — evidenced by five rejected PR links | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | ENG-01 | — | Every golden vector file parses and declares a complete `Conventions` block | unit | `pnpm vitest run packages/directive-engine/test/vectors-wellformed.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | ENG-06 | — | Every `Conventions` key has a recorded decision in the convention doc | unit | `pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | ≥1 | GAP-06 | T-1-03 | The share-URL contract's transmitted set contains no country/sector/seniority/age key | unit | `pnpm vitest run packages/directive-engine/test/share-url-contract.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**The LEGAL-09 verifier tests must be fixture-driven and offline.** The six real responses
observed during research — the EUR-Lex `202`/empty, the Cellar `404` body, the `400` bad-language,
the `304`, the `slov-lex.sk` SPA shell, the `legislation.mt` JSON-LD — are captured as committed
fixtures. That makes the gate deterministic on every PR and confines network flakiness to the
nightly job. It is also the only way to test the empty-202 path without depending on EUR-Lex
continuing to misbehave.

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` + `pnpm-workspace.yaml` with catalogs — no manifest exists yet
- [ ] `packages/country-data/test/fixtures/` — the six captured HTTP responses
- [ ] `packages/country-data/test/schema.test.ts` — stubs for LEGAL-01, LEGAL-05, LEGAL-06
- [ ] `packages/country-data/test/coverage.test.ts` — stubs for LEGAL-02
- [ ] `packages/country-data/test/resolve.test.ts` — stubs for LEGAL-03
- [ ] `packages/country-data/test/freshness.test.ts` — stubs for LEGAL-08
- [ ] `packages/country-data/test/verifier.test.ts` — stubs for LEGAL-09 (offline)
- [ ] `packages/country-data/test/verifier.live.test.ts` — stubs for LEGAL-09 (nightly)
- [ ] `packages/country-data/test/directive-text.test.ts` — stubs for LEGAL-04, LEGAL-07
- [ ] `packages/directive-engine/test/vectors-wellformed.test.ts` — stubs for ENG-01
- [ ] `packages/directive-engine/test/conventions-documented.test.ts` — stubs for ENG-06
- [ ] `packages/directive-engine/test/share-url-contract.test.ts` — stubs for GAP-06
- [ ] Framework install: `pnpm add -D -w vitest@4.1.11 zod@4.5.4`
- [ ] `.github/workflows/legal-data.yml` (PR profile, offline) and `nightly.yml` (live profile)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The bad-PR drill | LEGAL-10 | Requires opening real pull requests against the repo and observing CI reject them; cannot be self-tested inside the suite it is testing (D-12) | Open five PRs before the repo is public — (1) invented statute number, (2) source on a non-allowlisted domain, (3) source URL returning an empty 200, (4) a fact past its freshness window, (5) a correct, allowlisted source cited for the **wrong provision**. Each must be rejected by CI. Record the five PR links as evidence. |
| Cellar reachability from GitHub Actions | LEGAL-09 | Research proved Cellar reachable from the workstation only; CI egress is a different network path and D-01's conditional depends on it | Run the live verifier once in a GitHub Actions job before any dependent work. If it fails, D-01's conditional fires and returns to the user. This should be the phase's first task. |
| Polish UPL position | (gates Phase 5) | Needs a Polish-qualified legal check; not machine-verifiable | Out of scope for Phase 1 automation — recorded as a Phase 5 gate. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
