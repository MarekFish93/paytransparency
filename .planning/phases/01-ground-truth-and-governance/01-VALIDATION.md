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
| **Config file** | none yet — wave 1 (plan `01-01`) creates `vitest.config.ts` |
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
automated command and to the plan and task that authors the test file. The planner must carry each row
into the owning task's `<verify><automated>` block.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Test File Authored By | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Task 1 | 01-04 | 2 | LEGAL-01 | — | A `verified` fact without a source / `verified_at` fails schema parse | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "verified requires source"` | 01-04 T1 (TDD) | ⬜ pending |
| Task 1 | 01-04 | 2 | LEGAL-01 | — | A `pending_verification` fact with a non-null value fails | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "pending must be null"` | 01-04 T1 (TDD) | ⬜ pending |
| Task 2 | 01-04 | 2 | LEGAL-02 | — | Exactly 27 files, one per EU ISO-3166-1 alpha-2 code, filename matches `country.code` | unit | `pnpm vitest run packages/country-data/test/coverage.test.ts` | 01-04 T2 | ⬜ pending |
| Task 1 | 01-04 | 2 | LEGAL-03 | — | `directive_fallback` status resolves to a Directive citation, never a national one — asserted in wave 2 against `32023L0970#007.004` only, the single corpus entry present from wave 1, because `01-03` is filling the corpus in the same wave | unit | `pnpm vitest run packages/country-data/test/resolve.test.ts -t "fallback"` | 01-04 T1 (TDD) | ⬜ pending |
| Task 1 | 01-05 | 4 | LEGAL-03 | — | Every `directive_fallback` citation key — in `DIRECTIVE_FALLBACK_KEYS` and in every record under data/ and proposed/ — RESOLVES against the complete 66-entry corpus; the resolve half `01-04` could only assert as a shape | unit | `pnpm vitest run packages/country-data/test/lint.test.ts -t "fallback keys resolve"` | 01-05 T1 (TDD) | ⬜ pending |
| Task 3 | 01-03 | 2 | LEGAL-04 | — | The stored Art. 7(4) quotation matches the Cellar text byte-for-byte in EN and PL | integration | `pnpm vitest run packages/country-data/test/directive-text.test.ts` | 01-03 T3 (TDD) | ⬜ pending |
| Task 1 | 01-04 | 2 | LEGAL-05 | — | Art. 12(3) modelled as a condition, not a boolean route | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "art_12_3"` | 01-04 T1 (TDD) | ⬜ pending |
| Task 1 | 01-04 | 2 | LEGAL-06 | — | A human-confirm field cannot be satisfied by a register notification alone | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "human confirm"` | 01-04 T1 (TDD) | ⬜ pending |
| Task 3 | 01-03 | 2 | LEGAL-07 | — | All six articles (3, 6, 7, 9, 10, 12) present with paragraph ids, in every served locale | integration | `pnpm vitest run packages/country-data/test/directive-text.test.ts -t "article coverage"` | 01-03 T3 (TDD) | ⬜ pending |
| Task 3 | 01-04 | 2 | LEGAL-08 | — | Launch-country stale volatile fact fails; non-launch stale fact warns | unit | `pnpm vitest run packages/country-data/test/freshness.test.ts` | 01-04 T3 (TDD) | ⬜ pending |
| Task 2 | 01-02 | 2 | **LEGAL-09** | T-1-01 | 202/empty, 404, 400, 304, 403 challenge interstitial, missing anchor, recital-scoped anchor, SPA shell each produce the correct classification | unit, **fixture-driven, no network** | `pnpm vitest run packages/country-data/test/verifier.test.ts` | 01-02 T2 (TDD) | ⬜ pending |
| Task 3 | 01-02 | 2 | LEGAL-09 | T-1-01 | Cellar responds 200 with `art_7` present | integration, **network (nightly only)** | `pnpm vitest run packages/country-data/test/verifier.live.test.ts` | 01-02 T3 | ⬜ pending |
| Task 4 | 01-05 | 4 | LEGAL-10 | T-1-02 | The five bad-PR shapes each fail CI | e2e | **manual (D-12)** — evidenced by five rejected PR links | n/a — manual | ⬜ pending |
| Task 3 | 01-06 | 2 | ENG-01 | — | Every golden vector file parses and declares a complete `Conventions` block | unit | `pnpm vitest run packages/directive-engine/test/vectors-wellformed.test.ts` | 01-06 T3 (TDD) | ⬜ pending |
| Task 1 | 01-06 | 2 | ENG-06 | T-1-22b | Every `Conventions` key has a recorded decision in the convention doc, and every decision names its default's origin — Directive text, a named and linked external guidance document, explicitly project-invented, or no default — so a borrowed convention and an invented one are distinguishable | unit | `pnpm vitest run packages/directive-engine/test/conventions-documented.test.ts` | 01-06 T1 (TDD) | ⬜ pending |
| Task 2 | 01-06 | 2 | GAP-06 | T-1-03 | The share-URL contract's transmitted set contains no country/sector/seniority/age key | unit | `pnpm vitest run packages/directive-engine/test/share-url-contract.test.ts` | 01-06 T2 (TDD) | ⬜ pending |

**Test File Authored By.** This column names the plan and task that CREATES the test file, not a wave-0
prerequisite. Only `01-01` runs in wave 1, and it delivers the harness — the workspace, `vitest.config.ts`,
the framework install, the frozen primitives, `test/spine.test.ts`, the two Cellar fixtures and the
pull-request workflow — and nothing else. Every other test file in this table is TDD-authored by its own
plan inside the same task that implements against it, which is why no row can honestly be ticked as a
wave-1 deliverable. The one exception is LEGAL-10, whose evidence is five real pull requests rather than
a file. `(TDD)` marks a task carrying `tdd="true"`, where the file is written failing before the
implementation exists.

**Task ID convention.** `Task N` is the number carried in that task's own `<name>` heading inside the
plan, which is the string a reader searches for. Checkpoint tasks carry no number of their own, and the
two plans that contain one number their remaining tasks differently — `01-05` counts past its checkpoint
(its drill task is named `Task 4`), `01-06` does not (its vectors task is named `Task 3`). Following the
heading rather than the element position is what keeps both rows correct.

**Wave numbering** is the plan's `wave` frontmatter value as authored: wave 1 is `01-01`; wave 2 is
`01-02`, `01-03`, `01-04` and `01-06`; wave 3 is `01-07`; wave 4 is `01-05`, which carries the go-public
step and therefore runs after every other plan including the vector re-derivation.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**The LEGAL-09 verifier tests must be fixture-driven and offline.** The seven real responses
observed during research — the EUR-Lex `202`/empty, the Cellar `404` body, the `400` bad-language,
the `304`, the `slov-lex.sk` SPA shell, the `legislation.mt` JSON-LD, and the `e-tar.lt` `403` challenge
interstitial — are captured as committed fixtures. That makes the gate deterministic on every PR and confines network flakiness to the
nightly job. It is also the only way to test the empty-202 path without depending on EUR-Lex
continuing to misbehave.

---

## Wave 0 Requirements

Wave 0 here IS wave 1, and wave 1 is plan `01-01` alone. This list therefore contains only what
`01-01` actually delivers — it is the sign-off for "the harness exists and runs", nothing more. The
per-requirement test files are NOT wave-0 prerequisites; each is TDD-authored by its owning plan in the
same task that implements against it, and they are listed separately below so no executor waits for a
stub that was never going to be there.

**Delivered by wave 1 (plan `01-01`) — these gate every later plan:**

- [ ] `pnpm-workspace.yaml` with catalogs, root `package.json`, `.npmrc`, `tsconfig.base.json` — no manifest exists yet
- [ ] `vitest.config.ts` at the repository root
- [ ] Framework install: `pnpm add -D -w vitest@4.1.11 zod@4.5.4`
- [ ] `packages/country-data/package.json` and `tsconfig.json`, plus the frozen primitives `src/schema.ts`, `src/verifier.ts`, `src/freshness.ts` that every later test imports
- [ ] `packages/country-data/test/spine.test.ts` — the first executable test, which is what proves the harness runs at all
- [ ] `packages/country-data/test/fixtures/cellar-art7-en.xhtml` and `cellar-art7-recital-decoy.xhtml` — the two Cellar fixtures wave 1 captures
- [ ] `.github/workflows/legal-data.yml` (pull-request profile, offline) and `.github/workflows/cellar-reachability.yml`

**Authored by their owning plan, NOT by wave 1 — do not expect a stub:**

| Test file or fixture set | Owner | Wave |
|--------------------------|-------|------|
| `test/fixtures/` — the seven captured HTTP responses (`eurlex-frontend-202-empty`, `cellar-404-unknown-celex`, `cellar-400-bad-language`, `cellar-304-revalidated`, `slov-lex-spa-shell`, `legislation-mt-jsonld`, `e-tar-lt-403-interstitial`) | `01-02` T2 | 2 |
| `test/verifier.test.ts` (LEGAL-09, offline) | `01-02` T2 | 2 |
| `test/verifier.live.test.ts` (LEGAL-09, nightly) and `.github/workflows/nightly.yml` | `01-02` T3 | 2 |
| `test/allowlist.test.ts` | `01-02` T1 | 2 |
| `test/directive-text.test.ts` (LEGAL-04, LEGAL-07) | `01-03` T3 | 2 |
| `test/schema.test.ts` (LEGAL-01, LEGAL-05, LEGAL-06) and `test/resolve.test.ts` (LEGAL-03) | `01-04` T1 | 2 |
| `test/coverage.test.ts` (LEGAL-02) | `01-04` T2 | 2 |
| `test/freshness.test.ts` (LEGAL-08) | `01-04` T3 | 2 |
| `directive-engine/test/conventions-documented.test.ts` (ENG-06) | `01-06` T1 | 2 |
| `directive-engine/test/share-url-contract.test.ts` (GAP-06) | `01-06` T2 | 2 |
| `directive-engine/test/vectors-wellformed.test.ts` (ENG-01) | `01-06` T3 | 2 |
| `directive-engine/test/rederivation.test.ts` | `01-07` T2 | 3 |
| `country-data/test/lint.test.ts` | `01-05` T1 | 4 |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The bad-PR drill | LEGAL-10 | Requires opening real pull requests against the repo and observing CI reject them; cannot be self-tested inside the suite it is testing (D-12) | Open five PRs before the repo is public — (1) invented statute number, (2) source on a non-allowlisted domain, (3) source URL returning an accepted-but-empty response, (4) **a silent deadline change disguised as a typo fix** — a launch-country response deadline shortened from the two-month value, described in the commit message as a typo fix, with no source change and no `verified_at` change, rejected by the freshness gate *and* the unchanged-bump rule (D-12), (5) a correct, allowlisted, live source cited for the **wrong provision**. Each must be rejected by CI. Record the five PR links as evidence. |
| Cellar reachability from GitHub Actions | LEGAL-09 | Research proved Cellar reachable from the workstation only; CI egress is a different network path and D-01's conditional depends on it | Run the live verifier once in a GitHub Actions job before any dependent work. If it fails, D-01's conditional fires and returns to the user. This should be the phase's first task. |
| Polish UPL position | (gates Phase 5) | Needs a Polish-qualified legal check; not machine-verifiable | Out of scope for Phase 1 automation — recorded as a Phase 5 gate. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] The wave-1 harness list above is complete, and every test file not on it names the plan and task that authors it
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
