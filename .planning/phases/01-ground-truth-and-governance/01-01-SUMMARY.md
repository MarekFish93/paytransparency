---
phase: 01-ground-truth-and-governance
plan: 01
subsystem: legal-data
tags: [zod, vitest, typescript, pnpm-workspaces, cellar, eur-lex, provenance, github-actions]

requires: []
provides:
  - "D-01 discharged with CI evidence: a GitHub Actions runner reaches the Publications Office Cellar API and receives 200 with the art_7 subtree present"
  - "The frozen Fact<T> / Source / FactStatus / SourceVerification primitives, five members each on both unions"
  - "A working Cellar retrieval and id-scoped extraction path (fetchExpression, extractParagraph, normaliseForMatch)"
  - "The fail-loud verifier: nine-step assertion order, subtree scoping, five-member Disposition union"
  - "The volatility-class freshness core (TTL_DAYS, freshnessOf)"
  - "One seeded Directive fact — Art. 7(4) EN — in full Fact envelope shape"
  - "Two CI workflows: the D-01 reachability probe and the offline PR-profile gate"
  - "A recital-decoy fixture proving the subtree scoping actually bites"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 02, 03, 05, 06]

actuals:
  tokens: 122022
  tasks: 3
  commits: 6
plan_head_before: fce395c23456661d7c65f788d7b11f38259a022d

tech-stack:
  added:
    - "pnpm 12.3.4 workspaces with a version catalog"
    - "zod 4.5.4 (devDependency only)"
    - "vitest 4.1.11"
    - "typescript 7.0.2"
    - "@types/node 24.13.1"
  patterns:
    - "Provenance envelope: no legal value may exist without its source and date"
    - "Scope-first verification: assert an anchor inside the cited subdivision, never across the document"
    - "Store raw, normalise only for matching"
    - "Offline PR profile, live verification deferred to a nightly job"
    - "ESM-only, erasable TypeScript so build scripts run under Node's native type stripping"

key-files:
  created:
    - packages/country-data/src/schema.ts
    - packages/country-data/src/verifier.ts
    - packages/country-data/src/freshness.ts
    - packages/country-data/src/index.ts
    - packages/country-data/scripts/fetch-directive.ts
    - packages/country-data/data/_directive.json
    - packages/country-data/test/spine.test.ts
    - packages/country-data/test/fixtures/cellar-art7-en.xhtml
    - packages/country-data/test/fixtures/cellar-art7-recital-decoy.xhtml
    - .github/workflows/cellar-reachability.yml
    - .github/workflows/legal-data.yml
    - pnpm-workspace.yaml
    - tsconfig.base.json
    - .gitattributes
  modified:
    - package.json
    - vitest.config.ts
    - tsconfig.json
    - packages/country-data/tsconfig.json

key-decisions:
  - "D-01 is discharged with CI evidence, not workstation evidence — GitHub Actions run 34591089211 recorded ETag \"Con-20231213063525000\" and the resolved cellar expression URI"
  - "Source.verification is a required five-member discriminant; manual-attest is a first-class peer that records the absence of machine verification honestly"
  - "FactStatus is frozen at five members; directive_fallback (D-07) separates deliberate suppression from not-yet-checked and from no-national-deviation"
  - "Source.scope was added so the verifier can scope structurally — without it, subtree scoping is impossible from a Source alone"
  - "The freshness boundary is inclusive on the stale side; ageing is a distinct third state at 75% of TTL"
  - "The repository is PRIVATE under MarekFish93/jafn; `jafn` is a PLACEHOLDER name gated before the D-12 public flip in plan 01-05"

patterns-established:
  - "Fact envelope: value is nullable and superRefine forbids a value without provenance, so pending_verification is unforgeable"
  - "Publisher ids as citation keys (32023L0970#007.004) — language-invariant, never a hand-rolled tagging scheme"
  - "Per-strategy byte floors and a shared 5 MB body cap, single-sourced so they cannot drift"
  - "Decoy fixtures as the proof that a gate bites, kept above the byte floor so only the intended assertion can catch them"

requirements-completed: [LEGAL-01, LEGAL-04, LEGAL-09]

coverage:
  - id: D1
    description: "D-01's conditional discharged: a GitHub Actions runner reaches Cellar and receives HTTP 200 with an element carrying id=\"art_7\""
    requirement: "LEGAL-09"
    verification:
      - kind: e2e
        ref: "gh run list --workflow=cellar-reachability.yml --limit 1 --json conclusion --jq '.[0].conclusion' -> success (run 34591089211)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The authentic Art. 7(4) two-month wording stored as a Fact envelope carrying url, anchor, verification strategy, etag, accessed_at and verified_at"
    requirement: "LEGAL-04"
    verification:
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#carries full provenance: verified, stable, anchored, with a recorded ETag"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#parses against the Fact schema and holds exactly one entry"
        status: pass
    human_judgment: false
  - id: D3
    description: "The verifier disposes a source verified only after asserting status 200, a non-empty body, the art_7 subtree, and the normalised anchor INSIDE that subtree"
    requirement: "LEGAL-09"
    verification:
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#disposes the stored source verified against a synthesised 200"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#disposes a 202 with an empty body data_defect, not verified"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#disposes a 304 revalidated without touching the body"
        status: pass
    human_judgment: false
  - id: D4
    description: "A recital-scoped anchor on an allowlisted, live, above-floor source is disposed data_defect and turns the CI job red"
    requirement: "LEGAL-09"
    verification:
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#disposes data_defect when the anchor lives only in a recital"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#rejects it despite a 200, a body far above the floor, and an allowlisted host"
        status: pass
      - kind: e2e
        ref: "gh run list --workflow=legal-data.yml --limit 1 -> success (run 34592836046)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Volatility-class freshness: fresh today, stale when elapsed days equal the TTL exactly (boundary inclusive on the stale side)"
    requirement: "LEGAL-01"
    verification:
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#is stale when elapsed days equal the TTL exactly — the boundary day is stale"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#crosses from fresh to ageing at 75% of the TTL"
        status: pass
    human_judgment: false
  - id: D6
    description: "Schema invariants: a verified Fact with sources: [] fails parse; a pending_verification Fact with a non-null value fails parse; source order is preserved"
    requirement: "LEGAL-01"
    verification:
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#rejects a verified fact citing no source"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#rejects a pending_verification fact carrying a value"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/spine.test.ts#preserves the authored order of sources through parse and re-serialisation"
        status: pass
    human_judgment: false
  - id: D7
    description: "The stored Art. 7(4) quotation is legally accurate and not conflated with Art. 6 or with the false annual frequency cap"
    verification: []
    human_judgment: true
    rationale: "Automation proves the bytes match what Cellar served and that the anchor sits inside id=\"art_7\". It cannot confirm that the wording a human will read in a letter is the right provision for the claim being made. A human must read the stored text against the Directive once before any letter quotes it."

duration: 31 min
completed: 2026-09-11
status: complete
---

# Phase 01 Plan 01: Cellar Spine Summary

**One Directive fact travels the whole legal-data spine — Cellar retrieval, id-scoped extraction, a provenance envelope that cannot hold a value without its source, a fail-loud scope-first verifier, a volatility-class freshness window, and two CI gates — with a recital decoy proving the gate bites.**

## Performance

- **Duration:** 31 min (continuation session; Task 1's local half was built in a prior session)
- **Started:** 2026-09-11T10:43:00Z
- **Completed:** 2026-09-11T11:13:41Z
- **Tasks:** 3 of 3
- **Files modified:** 24

## D-01: discharged

This was the load-bearing conditional of the whole phase. It is now answered, with CI evidence:

| Evidence | Value |
|---|---|
| Run URL | https://github.com/MarekFish93/jafn/actions/runs/34591089211 |
| Conclusion | `success` |
| Resolved pinned expression URI | `http://publications.europa.eu/resource/cellar/5bbb9daf-f470-11ed-a05c-01aa75ed71a1.0006.03/DOC_1` |
| `ETag` | `"Con-20231213063525000"` |
| `Last-Modified` | `Wed, 13 Dec 2023 05:35:25 GMT` |
| Body | `193564` bytes, `id="art_7"` present |

The CI figures match the workstation probe byte for byte, and match the values research recorded independently. No retrieval method was substituted; the conditional never fired.

**Repository:** `MarekFish93/jafn`, visibility `PRIVATE`. The name `jafn` is a **PLACEHOLDER**. The brand/domain decision is still deferred, and plan 01-05 must gate the rename *and* the D-12 public flip together — once the repository is public, its history is public with it.

## Accomplishments

- **D-01 discharged with CI evidence**, not workstation evidence. The distinction was the point: everything else in this phase is built on it.
- **Two unions frozen at five members each.** `FactStatus` gains `directive_fallback`, separating three claims that were collapsing into "we have no national citation". `SourceVerification` makes `manual-attest` a first-class peer — it records the *absence* of machine verification, which is strictly better than a green produced by a retrieval that never saw the statute.
- **The verifier's assertion order is the design.** 304 before any body check (a revalidation is legitimately zero bytes); exact `status === 200` (`res.ok` is `true` for the 202-with-empty-body the eur-lex front end serves); byte floor; normalise; **scope to the `art_N` subtree; then** assert the anchor; then confirm the language from `art_7.tit_1`, because the Cellar 200 carries an empty `Content-Language` header.
- **Storage stays raw.** The stored quotation keeps `4.\xa0\xa0\xa0Employers` exactly as the Official Journal published it. Normalisation exists only for matching — `"Article 7"` with an ASCII space occurs *zero* times in the authentic document.
- **The gate is proven to bite.** A 194,355-byte decoy, on an allowlisted host, answering 200, with a structurally valid `art_7` subtree that still carries `id="007.004"`, is disposed `data_defect` because the deadline wording lives only in a recital. Nothing about the status, size or host is wrong — only the scoping can catch it.

## Task Commits

1. **Task 1: Bootstrap the workspace and discharge D-01** — `948b2fa` (feat)
2. **Task 2: One fact end-to-end (tracer)** — `13ee524` (feat)
3. **Task 3: Prove the gate bites (TDD)** — `5017352` (test, RED) → `4d0cc82` (feat, GREEN) → `fa1556a` (refactor)
4. **CI fix surfaced by the first real workflow run** — `d36ee5d` (fix)

## TDD Gate Compliance

Task 3 ran the full RED → GREEN → REFACTOR cycle.

- **RED** — `5017352`. Verdict **`RED_EVIDENCE_OK`** from `gsd-tools check tdd-red-evidence`: exit 1, `1 failed | 27 passed`, and the single failure is the named target test (`reports what was actually at the art_7 scope start, verbatim`) failing on its own behavioural assertion — not a syntax error, zero-test discovery, fixture crash or unrelated assertion.
  Three of the four planned behaviours passed immediately, which is honest and expected: the subtree scoping was built by the Task 2 tracer, and Task 3's job is to *prove* it. The fourth failed for a real reason — the `data_defect` message quoted only a normalised, tag-stripped rendering of the scope, never the document's own bytes.
- **GREEN** — `4d0cc82`. The message now reports the scope start twice, verbatim and as-matched. 31 passed.
- **REFACTOR** — `fa1556a`. `MAX_BODY_BYTES` single-sourced from `verifier.ts` instead of being redeclared in `fetch-directive.ts`; five no-op `padEnd` calls removed from test literals. 31 passed, unchanged.

## Tracer Feedback Gate

Task 2 was `type="tracer"` with no `gate="blocking-human"`. Auto mode is off (`auto_advance: false`, `_auto_chain_active: false`), `human_verify_mode` is `end-of-phase`, and the tracer's `<verify>` carries only `<automated>` entries. Per the gate's branch order this resolves to: re-run the verify end-to-end, halt on failure, no checkpoint. The suite passed 24/24 on re-run — **⚡ tracer verified end-to-end, expanded.**

## Files Created/Modified

- `packages/country-data/src/schema.ts` — the frozen primitives. `Fact<T>`, `Source`, both five-member unions, the URL policy, and the `superRefine` invariants that make "pending verification" unforgeable.
- `packages/country-data/src/verifier.ts` — `verifySource`, the `Disposition` union, `normaliseForMatch`, `scopeToSubdivision`, `scopeToElement`, `textOf`, `SourceDefect`, `BYTE_FLOOR`, `MAX_BODY_BYTES`.
- `packages/country-data/src/freshness.ts` — `TTL_DAYS` (365/90/30/null) and `freshnessOf`.
- `packages/country-data/scripts/fetch-directive.ts` — `fetchExpression` and `extractParagraph`, plus the seeding entry point. Runs under Node's native type stripping with no script runner.
- `packages/country-data/data/_directive.json` — the one seeded fact, `32023L0970#007.004`.
- `packages/country-data/test/spine.test.ts` — 31 offline assertions across every layer.
- `packages/country-data/test/fixtures/cellar-art7-en.xhtml` — the retrieved EN expression, 193,564 bytes.
- `packages/country-data/test/fixtures/cellar-art7-recital-decoy.xhtml` — the proof-of-teeth decoy, 194,355 bytes.
- `.github/workflows/cellar-reachability.yml` — the D-01 probe.
- `.github/workflows/legal-data.yml` — the offline PR profile.
- `.gitattributes` — forces LF everywhere and marks the fixtures binary.

## Decisions Made

- **`Source.scope` was added** (`{ id, expected_subtitle }`). The plan requires the verifier to assert the anchor *inside* the `art_7` subtree, but `verifySource(source, response)` receives a `Source` and nothing else — without a structural scope on the `Source`, subtree scoping is physically impossible from that signature. A `superRefine` now rejects any `cellar` source that carries no scope, so the invariant is structural rather than conventional.
- **The EN fixture is committed in full.** D-02 excludes committed *snapshots* as a citation substrate; this is a test fixture in `test/fixtures/`, and it is what lets the PR profile run offline. It is not a data source and nothing cites it.
- **`legal-data.yml` ships only `offline-suite`.** The plan's artifact list also names `schema-and-lint` and `freshness-gate`, which belong to plans 01-02 and 01-05. They are deliberately not stubbed — an always-green placeholder job reads as coverage that does not exist.
- **The "stays offline" assertion lives in the test suite, not in a workflow step.** A step grepping its own file for `curl`/`fetch` would match its own pattern and fail permanently, and would also violate the plan's own acceptance criterion that the file contain neither word.

## Deviations from Plan

### Carried forward from Task 1's earlier session

**1. [Rule 3 - Blocker] `corepack enable` fails with `EPERM` on this Windows workstation**
- **Found during:** Task 1
- **Issue:** It tries to write shims into `C:\Program Files\nodejs\` and needs an elevated shell.
- **Fix:** `corepack prepare pnpm@12.3.4 --activate` plus `corepack pnpm …` invocations, which resolve the pinned pnpm 12.3.4 correctly. CI still uses plain `corepack enable`, which works on `ubuntu-latest`.
- **Note:** No package substitution was made; all four pins were confirmed on the registry before install.

**2. [Rule 3 - Blocker] Added root `tsconfig.json` and `packages/country-data/src/index.ts`**
- **Found during:** Task 1
- **Issue:** Not in the plan's `files_modified`. `tsc -b` needs a root solution file with project references, and failed `TS18003: No inputs were found` until the package had one real source file.
- **Fix:** Both added. The barrel is also required for the `exports` map's `./dist/index.js` to be honest; Task 2 extended it with the schema/verifier/freshness re-exports.

**3. [Rule 2 - Missing critical] Added `erasableSyntaxOnly: true` to `tsconfig.base.json`**
- **Found during:** Task 1
- **Fix:** Mechanically enforces the plan's own requirement that the build scripts run under Node's native type stripping with no script-runner dependency.

**4. [housekeeping] Added `.gsd/` to `.gitignore`**
- Run-scoped GSD runtime state, not project output.

### Auto-fixed in this session

**5. [Rule 1 - Bug] The package `exports` map pointed at a path `tsc` never emitted**
- **Found during:** Task 1 completion check
- **Issue:** `packages/country-data/package.json` mapped `.` to `./dist/index.js`, but the project's `rootDir: "."` made `tsc -b` emit `dist/src/index.js`. Every consumer of the package would have failed to resolve it.
- **Fix:** Split the package into two projects — `tsconfig.json` (shipped, `rootDir: src` → `dist/index.js`) and `tsconfig.tools.json` (scripts and tests, emitting to a gitignored `.tsbuild/`). Added `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` so the same source is valid for `node scripts/fetch-directive.ts`, for vitest, and for the `dist/` emit.
- **Verification:** `ls packages/country-data/dist` shows `index.js` / `index.d.ts` at the root; `pnpm typecheck` exits zero.
- **Committed in:** `13ee524`

**6. [Rule 1 - Bug] The extractor stored a tag fragment as though it were Official Journal text**
- **Found during:** Task 2
- **Issue:** Both `scopeToSubdivision` and `extractParagraph` sliced from the `id="…"` *attribute* rather than from the `<` that opens the element, so the stored quotation began `id="007.004"> 4.   Employers shall…` — a tag remnant the tag stripper could not remove, embedded in a legal quotation.
- **Fix:** Both now back up to the opening `<`. The stored text is now exactly `4.\xa0\xa0\xa0Employers shall provide…`, matching the verbatim text research recorded.
- **Verification:** `spine.test.ts#preserves U+00A0 between the paragraph number and the first word` asserts `/^4\.\u00A0+Employers/`.
- **Committed in:** `13ee524`

**7. [Rule 1 - Bug] `\s` matches U+00A0, so the obvious whitespace collapse destroyed the authentic separator**
- **Found during:** Task 2
- **Issue:** `textOf(html).replace(/\s+/g,' ').trim()` would have folded the no-break spaces the fact exists to preserve, and `.trim()` would strip a leading or trailing one.
- **Fix:** Collapse and trim only ASCII whitespace (`[ \t\r\n]`).
- **Committed in:** `13ee524`

**8. [Rule 2 - Missing critical] The language check scoped too loosely to be a check**
- **Found during:** Task 2
- **Issue:** Reusing `scopeToSubdivision` for `art_7.tit_1` ran to the end of the whole article, so the subtitle assertion would have passed on any document merely *mentioning* the expected subtitle anywhere inside Article 7.
- **Fix:** Added `scopeToElement`, which stops at the element's first closing tag.
- **Committed in:** `13ee524`

**9. [Rule 2 - Missing critical] Added `.gitattributes`**
- **Found during:** Task 2 staging
- **Issue:** Git warned `LF will be replaced by CRLF` on the retrieved XHTML fixture. Line-ending translation would silently rewrite a primary-source legal document and change the byte count the verifier's floor is asserted against — and CI (Linux) would see different bytes from a Windows contributor.
- **Fix:** `* text=auto eol=lf`, with the fixtures marked `-text` (binary) so they are never translated at all.
- **Committed in:** `13ee524`

**10. [Rule 1 - Bug] The vitest `include` glob matched nothing under `--dir`**
- **Found during:** Task 2
- **Issue:** `include: ['packages/*/test/**/*.test.ts']` silently matched zero files when invoked as `vitest run --dir packages/country-data` — the command the plan's own verification and `legal-data.yml` both use. A zero-file run is a green run that asserted nothing.
- **Fix:** Root-relative `include: ['**/test/**/*.test.ts']`, which resolves correctly from both roots.
- **Verification:** Both `pnpm test` and `pnpm vitest run --dir packages/country-data` report 31 passed.
- **Committed in:** `13ee524`

**11. [Rule 3 - Blocker] `@types/node@24.13.1` installed**
- **Found during:** Task 2
- **Issue:** `pnpm typecheck` could not resolve `URL`, `fetch`, `process` or `node:fs` with `lib: ["ES2023"]` and no node types.
- **Fix:** Installed as a root devDependency after checking the registry. `@types/node` is DefinitelyTyped, types-only, zero runtime bytes, and does not touch the no-runtime-dependency rule. Version 24.13.1 matches the local Node major and is three patches behind the 24.x tip, so it has soak.
- **Committed in:** `13ee524`

**12. [Rule 3 - Blocker] `setup-node`'s package-manager cache broke the first real CI run**
- **Found during:** Task 3 (first `legal-data.yml` run, `34592731115`, concluded `failure`)
- **Issue:** `package-manager-cache` defaults to `true` and probes for the `pnpm` executable *inside its own step*, which runs before corepack has provisioned one: `Unable to locate executable file: pnpm`.
- **Fix:** `package-manager-cache: false`, with a comment recording why it must stay false.
- **Verification:** Run `34592836046` concludes `success`.
- **Committed in:** `d36ee5d`

---

**Total deviations:** 12 auto-fixed (5 × Rule 1 bug, 4 × Rule 2 missing critical, 3 × Rule 3 blocker) — 4 carried forward from Task 1's earlier session, 8 found in this one.

**Impact:** Deviations 5, 6, 7, 8 and 10 were each a silent-correctness failure rather than a build break. Two of them (6 and 7) would have corrupted the stored legal text itself, and two (8 and 10) would have produced a verifier or a CI job that reported green while asserting nothing — precisely the "verifier that passes on an empty 200" failure the project constraint forbids. They are the reason this plan proves the spine on one fact before twenty-seven country files are seeded.

## Specification Conflict Recorded

The plan's Task 2 acceptance criteria contain an internal contradiction, resolved in favour of the more specific rule and recorded here rather than silently papered over.

- One criterion reads: *"`freshnessOf` returns `stale` when elapsed days equal the class TTL exactly, and `fresh` when elapsed days are one lower."*
- The same task's `<action>` reads: *"Return `ageing` when elapsed days are at or above 75 percent of the TTL and still below it."*

At 364 of 365 days both apply, and they disagree. The `must_haves.truths` entry makes only the first half of the claim (*"when the elapsed days equal the volatility class TTL exactly the fact is stale"*), which the implementation satisfies exactly. The three-state rule is implemented as written, and the test asserts every boundary explicitly — 273 `fresh`, 274 `ageing`, 364 `ageing` and not `stale`, 365 `stale` — so the distinction cannot be lost to a later refactor.

## Known Stubs

`verifySource` implements the `cellar` strategy only. The other four members of `SourceVerification` (`html-anchor`, `jsonld`, `metadata-only`, `manual-attest`) are **frozen in the discriminant but not implemented**, and the function throws a clearly-named not-implemented error for the three fetching strategies rather than falling through to another strategy's assertions. `manual-attest` returns an `attested` disposition without fetching, which is its correct terminal behaviour.

This is intentional and scoped: the plan states the five-member union is authored in full here so that **plan 01-02** fills the remaining implementations against an already-frozen signature. It is not a stub that prevents this plan's goal — the goal was to prove one fact through one strategy end to end.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change was introduced beyond the `<threat_model>` register. `T-1-05`'s 5 MB body cap and `T-1-01`'s nine-step assertion order are both implemented as specified; `T-1-06`'s private-repository requirement is satisfied and verified (`gh repo view --json visibility` → `PRIVATE`).

## Issues Encountered

None outstanding. The two CI failures encountered (the missing `workflow` token scope that halted the previous session, and `setup-node`'s package-manager cache) are both resolved and their fixes are committed.

## Next Phase Readiness

Ready for **01-02**. It inherits:

- A frozen `Source.verification` discriminant with four unimplemented members and a fixed `verifySource` signature to fill them against.
- A working `cellar` reference implementation to pattern the others on.
- The `Disposition` union, including the `source_unreachable` branch D-09's retry-and-override flow needs.
- A committed `ETag` (`"Con-20231213063525000"`) to key the outage-mitigation cache on.
- An offline PR profile to add the `schema-and-lint` and `freshness-gate` jobs to.

One thing plan 01-05 must not lose: the repository name `jafn` is a placeholder, and the rename has to be gated **together with** the D-12 public flip.

## Self-Check: PASSED

- All 23 claimed files verified present on disk with `[ -f ]`.
- All 6 commits verified in `git log` and pushed to `origin/master`.
- `commits: 6` is **measured**, not narrated: `git rev-list --count fce395c..HEAD`.
- Plan-level verification re-run at close: `cellar-reachability` → `success`; `legal-data` → `success`; `pnpm typecheck` → exit 0; `pnpm vitest run --dir packages/country-data` → 31 passed; `_directive.json` parses against the `Fact` schema and holds exactly one entry; `legal-data.yml` contains no `curl`, `wget` or `fetch`.
