---
phase: 01-ground-truth-and-governance
plan: 02
subsystem: legal-data
tags: [verifier, allowlist, ssrf, fixtures, cellar, jsonld, manual-attest, github-actions, etag]

requires:
  - "01-01: the frozen Fact/Source/SourceVerification primitives and the cellar reference implementation"
provides:
  - "The five-strategy verification table with byte floors single-sourced in one file"
  - "manual-attest as a first-class no-fetch state requiring a named, in-window attestation"
  - "The pre-fetch per-country allowlist guard with punycode exact/one-label host matching and redirect-hop re-checking"
  - "Seven committed real-response fixtures that make the whole gate deterministic and offline"
  - "The data-defect versus transport-failure split with three retries, doubling backoff, and a non-defaultable recorded override"
  - "The challenge-interstitial recognition predicate, matched on markers present in two real captures"
  - "The nightly live profile: ETag-keyed cache on outage, review task on drift, never an auto-update"
affects: [01-03, 01-04, 01-05, 01-06, 02, 03, 05]

actuals:
  tokens: 46700
  tasks: 3
  commits: 7
plan_head_before: 1c9408d1931727ef395800f31ec535f8c279cdf8

tech-stack:
  added: []
  patterns:
    - "Strategy table as data: byte floors and assertion sets live in one file, so loosening one is a single visible diff"
    - "Response fixtures stored as raw HTTP envelopes (status line, headers, blank line, body) — recordings, not inventions"
    - "Pure classifier plus thin live driver: every disposition is decided from bytes, which is what makes the gate provable offline"
    - "Machine-readable DefectReason beside the human message, so a workflow can branch on a cause"
    - "Byte counts measured in UTF-8 bytes, never String.length"

key-files:
  created:
    - packages/country-data/src/allowlist.ts
    - packages/country-data/src/source-strategy.ts
    - packages/country-data/data/allowlist.json
    - packages/country-data/test/allowlist.test.ts
    - packages/country-data/test/verifier.test.ts
    - packages/country-data/test/verifier.live.test.ts
    - packages/country-data/test/fixtures/eurlex-frontend-202-empty.txt
    - packages/country-data/test/fixtures/cellar-404-unknown-celex.txt
    - packages/country-data/test/fixtures/cellar-400-bad-language.txt
    - packages/country-data/test/fixtures/cellar-304-revalidated.txt
    - packages/country-data/test/fixtures/slov-lex-spa-shell.html
    - packages/country-data/test/fixtures/legislation-mt-jsonld.html
    - packages/country-data/test/fixtures/e-tar-lt-403-interstitial.html
    - .github/workflows/nightly.yml
    - vitest.live.config.ts
  modified:
    - packages/country-data/src/verifier.ts
    - packages/country-data/src/index.ts
    - packages/country-data/scripts/fetch-directive.ts

key-decisions:
  - "The jsonld strategy's anchor IS the stored ELI identifier — chosen per source to assert what that source actually serves, which keeps the frozen Source shape from 01-01 unchanged"
  - "vitest.live.config.ts exists because vitest APPENDS --exclude rather than replacing it and filters an explicit path through the exclusion too: a separate config is the only mechanism that can run the live suite at all"
  - "Byte floors are compared against UTF-8 byte length, not String.length — the two diverge on any non-ASCII document (the Slovak shell is 1354 bytes and 1346 code units)"
  - "The allowlist guard lives on the fetch path where a request can actually be issued, and verifySource re-states it whenever a caller supplies a country code"
  - "index.ts now transitively imports node:fs through the allowlist; recorded as a build-time-only constraint rather than weakened"

requirements-completed: [LEGAL-09, LEGAL-10]

coverage:
  - id: D1
    description: "Seven reproduced response shapes each produce their correct disposition, offline, from committed recordings of live responses"
    requirement: "LEGAL-09"
    verification:
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect and names the anti-automation gate, not a retry"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect with no retry attempted"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect: the server does not fall back, so a 400 is a caller defect"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes revalidated, and the body checks never execute"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect under html-anchor and names the floor it failed"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes verified when legislationIdentifier equals the stored ELI"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect with reason anti_automation_gate and names manual-attest"
        status: pass
    human_judgment: false
  - id: D2
    description: "A challenge interstitial is recognised as an anti-automation gate rather than reclassifying every 403, proved in both directions"
    requirement: "LEGAL-09"
    verification:
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#leaves a 403 with a plain body on the generic branch"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#exposes the recognition as one predicate matched on the captured markers"
        status: pass
    human_judgment: false
  - id: D3
    description: "manual-attest is a first-class no-fetch state: no request is issued, and attested requires a named attester inside the freshness window"
    requirement: "LEGAL-09"
    verification:
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#performs no fetch at all"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes attested only with a named attester and a verified_at inside the window"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect when nobody attested it"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect when the attestation is past its freshness window"
        status: pass
    human_judgment: false
  - id: D4
    description: "No outbound request leaves a CI runner for a host that is not on the requesting country's allowlist, redirect hops included"
    requirement: "LEGAL-10"
    verification:
      - kind: unit
        ref: "packages/country-data/test/allowlist.test.ts#rejects a host absent from the requesting country, naming both host and country"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/allowlist.test.ts#matches exactly or one label deep, never on a raw suffix"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#disposes data_defect without issuing a request for a non-allowlisted host"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#re-checks the redirect target and refuses to follow off the allowlist"
        status: pass
    human_judgment: false
  - id: D5
    description: "The EUR-Lex web front end is provably absent from the allowlist data, asserted against the parsed JSON rather than source text"
    requirement: "LEGAL-10"
    verification:
      - kind: unit
        ref: "packages/country-data/test/allowlist.test.ts#contains the EUR-Lex web front end nowhere, asserted against the parsed data"
        status: pass
    human_judgment: false
  - id: D6
    description: "A transport failure is distinguishable from a data defect: three retries with doubling backoff then source_unreachable, zero retries on a defect"
    requirement: "LEGAL-09"
    verification:
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#retries a DNS failure three times, then disposes source_unreachable"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#retries a 503 three times, then disposes source_unreachable"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#backs off between retries rather than hammering the source"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#retries zero times — a standing posture is not an outage"
        status: pass
    human_judgment: false
  - id: D7
    description: "A source_unreachable override is recorded, never implicit: it requires a named maintainer and a reason, and refuses any other disposition"
    requirement: "LEGAL-09"
    verification:
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#records the maintainer, the reason and a timestamp on the result"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#throws on an empty maintainer identifier"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#throws on an empty reason"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/verifier.test.ts#refuses to override anything that is not source_unreachable"
        status: pass
    human_judgment: false
  - id: D8
    description: "The live suite runs only at night: it is not collected by the offline PR profile, and it passes against the live Cellar expression"
    requirement: "LEGAL-09"
    verification:
      - kind: command
        ref: "pnpm vitest run --dir packages/country-data --reporter=verbose | grep -c verifier.live.test.ts -> 0"
        status: pass
      - kind: integration
        ref: "pnpm vitest run --config vitest.live.config.ts -> 2 passed (live ETag \"Con-20231213063525000\", conditional GET -> 304)"
        status: pass
    human_judgment: false
  - id: D9
    description: "A Cellar outage yields a cached warning and a changed ETag yields a review task, never an automatic content update"
    requirement: "LEGAL-09"
    verification: []
    human_judgment: true
    rationale: "The workflow's branch structure is asserted statically (two jobs, the needs edge, an actions/cache step keyed on the stored ETag, a changed-ETag failure branch, no step writing under data/), but its runtime behaviour cannot be dispatched from this worktree: `gh workflow run nightly.yml` returns HTTP 404 until the file is on the default branch. Re-run it after the phase branch merges. Recorded in .planning/WINDOWS.md as an open unrun-verify."
  - id: D10
    description: "The five bad-PR shapes each fail CI (LEGAL-10's full evidence)"
    verification: []
    human_judgment: true
    rationale: "This plan supplies the machinery for two of the five shapes (a non-allowlisted source, and a source returning an accepted-but-empty response). LEGAL-10's evidence is five real rejected pull requests, which plan 01-05 Task 4 owns and which cannot be self-tested inside the suite it is testing (D-12)."

duration: 27 min
completed: 2026-09-11
status: complete
---

# Phase 01 Plan 02: Verifier Strategies Summary

**The tracer's single Cellar path is now a five-strategy table with a complete failure taxonomy, pinned offline by seven recordings of real responses — an accepted-but-empty 202, a Cellar 404, a 400, a 304, a client-rendered shell, a JSON-LD landing page and a Cloudflare challenge interstitial — behind a per-country pre-fetch allowlist, with transport failure separated from data defect and a nightly live profile that caches on outage and opens a review task on drift.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-09-11T11:28:00Z
- **Completed:** 2026-09-11T11:55:30Z
- **Tasks:** 3 of 3
- **Files created/modified:** 18
- **Test count:** 31 → 89 offline, plus 2 nightly-only

## The seven fixtures, with observed sizes

Every fixture is a recording of a request made during this execution, stored as a raw HTTP
response envelope — status line, response headers, blank line, body. Nothing below the blank
line was written by hand. This matters most for the two recognition branches: a hand-written
challenge interstitial would make the predicate test itself.

| Fixture | Status | Body bytes | Envelope bytes | What it pins |
|---|---:|---:|---:|---|
| `eurlex-frontend-202-empty.txt` | 202 | **0** | 573 | `res.ok` is true, body is empty, `x-amzn-waf-action: challenge` |
| `cellar-404-unknown-celex.txt` | 404 | 54 | 208 | `Resource [system 'celex' - id '32023L9999'] not found.` |
| `cellar-400-bad-language.txt` | 400 | 205 | 361 | No silent language fallback — a 400 is a caller defect |
| `cellar-304-revalidated.txt` | 304 | **0** | 248 | A legitimate revalidation has no body; `content-language` is empty |
| `slov-lex-spa-shell.html` | 200 | 1354 | 1876 | Client-rendered shell; first tag is a Google Tag Manager script |
| `legislation-mt-jsonld.html` | 200 | 61563 | 64020 | `"@type": "Legislation"`, `legislationIdentifier: "eli/ln/2026/173"`, `legislationDate: "2026-06-05"`; **no operative wording** |
| `e-tar-lt-403-interstitial.html` | 403 | 5504 | 7335 | `<title>Just a moment...</title>`, `cf-mitigated: challenge` |

Three of these reproduce research's measurements exactly: the 400 at 205 bytes, the Slovak
shell at 1,354 bytes, and the Malta JSON-LD triple. The 404 body is verbatim.

**One capture needed care.** The EUR-Lex front end answered `202` with a **2,035-byte AWS WAF
challenge page** when the request carried `Accept: text/html`, and `202` with a **zero-byte**
body when it carried no `Accept` header at all — the shape research recorded. Both were
reproduced twice across four URL forms. The zero-byte form is the one committed, because the
plan's acceptance criterion is a body section of exactly zero bytes and because a machine
client sends no `Accept`. Both forms carry `x-amzn-waf-action: challenge`, so the recognition
predicate catches either.

## The interstitial recognition predicate

`isChallengeInterstitial(body, headers)` matches **only** markers present in the two captured
challenges. Any one of these is sufficient:

**Headers**
- `cf-mitigated: challenge` — Cloudflare, from `e-tar-lt-403-interstitial.html`
- `x-amzn-waf-action: challenge` — AWS WAF, from `eurlex-frontend-202-empty.txt`

**Body**
- `<title>Just a moment...</title>` — the Cloudflare interstitial title, verbatim
- `_cf_chl_opt` — the Cloudflare challenge options object
- `challenges.cloudflare.com` — the challenge widget origin
- `awsWafCookieDomainList` — the AWS WAF challenge bootstrap

A 403 carrying a plain body matches nothing here and stays on the generic `client_error`
branch — asserted in both directions, so the branch is a recognition rather than a blanket
reclassification of every 403. This exists because a maintainer reading *"404 — the cited
resource is not there"* goes looking for a broken URL, while a maintainer reading *"this host
answers automated requests with a challenge; record a `manual-attest` attestation"* does the
thing that actually resolves it.

## The five strategies and their byte floors

Declared in `packages/country-data/src/source-strategy.ts` and nowhere else. `byteFloorFor()`
is the only way a floor reaches a call site, so lowering one is a single visible diff in a
single file — the review signal Pitfall 5 says to watch for.

| Strategy | Byte floor | Fetches | Scope | Asserts operative wording |
|---|---:|:---:|---|:---:|
| `cellar` | **100000** | yes | `subdivision_id` (`art_N`) | yes |
| `html-anchor` | **20000** | yes | `whole_body` | yes |
| `jsonld` | **5000** | yes | `jsonld_block` | **no** |
| `metadata-only` | **5000** | yes | `whole_body` | **no** |
| `manual-attest` | **0** | **no** | `none` | **no** |

The `html-anchor` floor of 20,000 sits far above the 1,354-byte shell it must reject and far
below the smallest real register page research measured (`gazzettaufficiale.it`, 43,368 bytes).

## The override call signature

For plan 05's governance documentation, verbatim:

```ts
overrideUnreachable(
  result: VerifyResult,
  maintainer: string,
  reason: string,
  now: Date = new Date(),
): VerifyResult
```

Returns `{ ...result, override: { maintainer, reason, at: now.toISOString() } }`.

Throws `TypeError` when:
- `result.disposition !== 'source_unreachable'` — a data defect is not an outage and may not be waved through;
- `maintainer.trim() === ''` — an anonymous override is not an audit record;
- `reason.trim() === ''` — "overridden" on its own tells a later reader nothing.

There is **no default parameter anywhere on this path**. An override that can be applied
implicitly is not an override, it is a silent bypass.

## D-02: mitigated without reopening the decision

The recorded build-availability risk is addressed by **cache-on-outage plus review-on-drift**.
The decision itself — fetch live at build time, keep no committed snapshot — is **unchanged**.

- **Outage** (transport failure or 5xx): the `live-sources` job restores the last successful
  body from an `actions/cache` entry whose key carries the stored ETag, emits a `::warning::`
  annotation naming the cache hit, and **does not fail**. The live suite is skipped, because
  re-running an assertion against a source that is down turns somebody else's downtime into
  our red build.
- **Drift** (a 200 whose ETag differs from the stored one): the job **fails** with an
  `::error::` annotation naming the old ETag, the new ETag and the affected citation keys.
  Nothing is updated. Auto-updating legal text from a diff nobody read is the failure this
  rule exists to prevent.
- **No step in either job writes to `packages/country-data/data/`.** The only thing that
  changes a stored legal fact is a human-authored commit.
- `directive-drift` (`needs: live-sources`) substitutes the freshly fetched body for the
  committed fixture **in the runner's ephemeral checkout** and re-runs the offline suite, so a
  content change surfaces as a failing assertion naming the provision rather than as a silent
  data change.

There is no discovery query on either path. The RDF query endpoint returned zero triples for
the CELEX URI and timed out at 60 s; plan 01-04 owns it as a one-off whose result is committed.

## Task Commits

1. **Task 1 — the pre-fetch allowlist guard (TDD)** — `300ab7c` (test, RED) → `61db246` (feat, GREEN) → `c45cffa` (refactor)
2. **Task 2 — the five-strategy table and the failure taxonomy (TDD)** — `6fa7102` (test, RED) → `dfce14b` (feat, GREEN) → `54e19b5` (refactor)
3. **Task 3 — the nightly live profile** — `bd0dc2a` (feat)

## TDD Gate Compliance

Both TDD tasks ran the full RED → GREEN → REFACTOR cycle, each RED verified through
`gsd-tools check tdd-red-evidence`.

- **Task 1 RED** — `300ab7c`. Verdict **`RED_EVIDENCE_OK`**: exit 1, `14 failed | 6 passed` of 20,
  target test *"rejects a host absent from the requesting country, naming both host and country"*
  failing on its own behavioural assertion. `src/allowlist.ts` was committed as a deliberately
  **permissive** stub with the frozen signatures, so every rejection test failed on "expected to
  throw, but it returned" rather than on a module that would not load — a load crash is
  `INVALID_RED` and proves nothing about the behaviour being specified. The 6 that passed are the
  data-shape assertions and the accept cases, which a permissive stub satisfies trivially.
- **Task 1 GREEN** — `61db246`. 20 passed.
- **Task 1 REFACTOR** — `c45cffa`. The scheme violation message interpolated a literal through a
  template expression to dodge the string; now a sentence. 51 passed, unchanged.
- **Task 2 RED** — `6fa7102`. Verdict **`RED_EVIDENCE_OK`**: exit 1, `25 failed | 13 passed` of 38,
  target test *"disposes data_defect and names the anti-automation gate, not a retry"* failing
  because the stub has no reason codes and no recognition. The strategy table and the seven
  fixtures landed in this commit as the specification's data half; their own assertions passed
  immediately, which is honest — data is not behaviour.
- **Task 2 GREEN** — `dfce14b`. 38 passed, 89 across the offline suite.
- **Task 2 REFACTOR** — `54e19b5`. `byteLengthOf` single-sourced across the verifier and the
  retrieval script. 89 passed, unchanged.

Vitest emits nested TAP, which the evidence checker's `node --test` parser reads as zero tests
and one file-named failure. The RED records were therefore normalised to the flat
`ok N - <name>` / `# tests|pass|fail` shape before verification; the counts are vitest's own.

## Deviations from Plan

### Auto-fixed

**1. [Rule 1 - Bug] Byte floors were compared against UTF-16 code units, not bytes**
- **Found during:** Task 2 GREEN, by the shell fixture's own assertion.
- **Issue:** `body.length` counts code units. Every floor in the strategy table is stated in
  bytes, and the message told the maintainer "N bytes" while reporting code units. The two
  diverge on any non-ASCII document: the Slovak shell is **1,354 bytes and 1,346 code units**,
  and the authentic Cellar expression is **193,564 bytes and 192,706 code units** — an 858-unit
  gap. A Polish or Lithuanian register page diverges further. The effect is that the floor a
  source is actually held to moved with its language, and a reported figure disagreed with the
  `content-length` recorded beside it.
- **Fix:** `byteLengthOf()` (`Buffer.byteLength`, which does not allocate — the right tool for a
  cap whose job is to bound allocation) is used for the empty check, the 5 MB cap, the floor
  comparison and every size reported in a message.
- **Committed in:** `dfce14b`, extended to `scripts/fetch-directive.ts` in `54e19b5`.

**2. [Rule 1 - Bug] The retrieval script's D-01 evidence line reported code units as bytes**
- **Found during:** Task 2 REFACTOR, following the same thread.
- **Issue:** `fetch-directive.ts` printed `body bytes: ${res.body.length}` next to a
  `content-length`-derived figure, so its own report was internally inconsistent — it would have
  printed `192706` beside a header saying `193564`.
- **Fix:** `byteLengthOf` imported from `verifier.ts`, never redeclared, for the same reason
  `MAX_BODY_BYTES` already was.
- **Committed in:** `54e19b5`.

**3. [Rule 3 - Blocker] `vitest.live.config.ts` added; the exclusion cannot be lifted from the CLI**
- **Found during:** Task 3.
- **Issue:** The plan says to run the live suite "explicitly by path so the config exclusion is
  bypassed only here". It is not bypassed: vitest filters an explicit path through `exclude` and
  **appends** a CLI `--exclude` to the configured list rather than replacing it. Both were tried
  and both reported `No test files found, exiting with code 1`.
- **Fix:** A dedicated nightly-only config that includes `**/test/**/*.live.test.ts` and nothing
  else. It is referenced from exactly one place — the `live-sources` job — so the plan's intent
  (the exclusion is lifted only in the nightly job) holds, through the only mechanism vitest
  offers. The default profile is untouched.
- **Committed in:** `bd0dc2a`.

**4. [Rule 3 - Blocker] `src/index.ts` extended beyond the plan's `files_modified`**
- **Issue:** The plan's new exports (`STRATEGY_TABLE`, `strategyFor`, `byteFloorFor`,
  `overrideUnreachable`, `verifySourceLive`, `isChallengeInterstitial`, the allowlist symbols)
  were unreachable through the package barrel, and `BYTE_FLOOR` — which `index.ts` already
  exported — moved to being a derived view of the table.
- **Fix:** Barrel extended; `BYTE_FLOOR` kept as a derived view so existing consumers are
  unaffected and the table stays the single source.
- **Committed in:** `dfce14b`.

**5. [design note, no code change] The package barrel is no longer browser-bundler-safe**
- `allowlist.ts` reads `data/allowlist.json` with `node:fs` at module load, so that the file a
  maintainer edits is the file the guard enforces — no second copy to drift. `verifier.ts`
  imports it, and `index.ts` re-exports both, so the barrel now transitively pulls in `node:fs`.
  The alternative — an import attribute on the JSON — is blocked by the shipped project's
  `rootDir: "src"`, and embedding the data in TypeScript would create the second copy the
  single-source rule exists to prevent.
- Recorded rather than papered over, in the module docstring and in `index.ts`: the first client
  bundle that needs `@jafn/country-data` should get a data-only subpath export, **not** a weaker
  guard. Nothing imports the barrel yet, so this costs nothing today.

---

**Total deviations:** 4 auto-fixed (2 × Rule 1 bug, 2 × Rule 3 blocker), plus 1 recorded design
constraint.

**Impact:** Deviations 1 and 2 were silent-correctness failures of exactly the kind this phase
exists to catch — a gate measuring in one unit and reporting in another, where the divergence
grows with how non-English the document is. They were caught because a fixture assertion named
a real byte count rather than whatever the implementation happened to produce.

## Decisions Made

- **The `jsonld` anchor IS the stored ELI identifier.** The `Source` shape was frozen in 01-01
  and is not in this plan's blast radius. Research's own conclusion — *"the anchor must be chosen
  per source and must assert what that source actually serves"* — makes this the natural reading:
  `legislation.mt` serves its ELI and title, not its operative wording, so the anchor asserts the
  ELI and the result carries an explicit note that the wording was **not** machine-verified.
- **The allowlist guard lives on the fetch path.** `verifySourceLive` is the only code that can
  issue a request, and it runs `assertFetchable` before the first one and again on every redirect
  hop. `verifySource` re-states the same rule whenever a caller supplies a `countryCode`, so a
  caller classifying a response obtained by other means is held to it too.
- **Reasons are machine-readable and separate from messages.** `DefectReason` lets the nightly
  workflow and plan 05's governance branch on a cause without parsing prose.
- **`assertRedirectChain` was added** alongside `assertFetchable`. The plan's behaviour 6
  requires a redirect target to be re-checked; a chain helper makes the requirement testable
  without a network, and `verifySourceLive` uses the same per-hop check for real.
- **The allowlist is a strict superset of `schema.ts`'s `sourceUrlIssues`.** They are different
  controls — a parse-time lint versus a pre-fetch gate — so the duplication is deliberate, and a
  test pins the superset relationship so the two cannot drift apart.

## Known Stubs

None. The 01-01 stub this plan existed to fill — `verifySource` implementing `cellar` only, with
`html-anchor`, `jsonld` and `metadata-only` throwing a named not-implemented error — is closed.
All five strategies are implemented and each has offline assertions against a real response.
`.planning/WINDOWS.md` entry 1 is marked `fixed`.

## Threat Flags

None beyond the plan's register. T-1-07 (SSRF from a contributor `source_url`), T-1-08 (lookalike
and homograph hosts), T-1-01 (failing open on empty-200, 304, shell HTML, a challenge interstitial
or a recital-scoped anchor), T-1-09 (a silent unreachable override) and T-1-10 (a third-party
outage reddening every pull request) are each implemented as specified and each carries at least
one asserted test. T-1-SC holds: **no package was installed by this plan** and the lockfile is
unchanged.

## Issues Encountered

**The nightly workflow's runtime behaviour could not be verified from this worktree.**
`gh workflow run nightly.yml` returns `HTTP 404: workflow nightly.yml not found on the default
branch` — GitHub cannot dispatch a workflow that is not yet on the default branch, and a worktree
executor must not push. The plan's own `fails_when` anticipates this. Its structure is asserted
statically (exactly two jobs, the `needs` edge, an `actions/cache` step keyed on the stored ETag,
a changed-ETag failure branch, no step writing under `data/`, no discovery-query reference), and
its dispatch is recorded in `.planning/WINDOWS.md` as an open `unrun-verify` to be run once the
phase branch merges.

## Next Phase Readiness

Ready for the rest of the phase. Downstream plans inherit:

- **`assertFetchable(url, countryCode)`** — call it before any new fetch path. `allowlist.json`
  has an empty array for all 22 non-launch countries; adding a national register there is the
  documented, evidence-bearing act.
- **`STRATEGY_TABLE`** — a new source picks a strategy from it rather than inventing assertions.
  Two of the five (`jsonld`, `metadata-only`) return a green that carries an explicit note about
  what was *not* verified; any UI rendering a verified fact should surface that note.
- **`overrideUnreachable`** — plan 05's governance documentation can describe it from the exact
  signature above.
- **The bad-PR drill (01-05 T4)** — shapes 2 (non-allowlisted source) and 3 (accepted-but-empty
  URL) are now mechanically rejected, with the reason codes `allowlist_violation` and
  `anti_automation_gate` to cite as evidence.
- **The nightly job** — once merged, dispatch it once and record the run URL, closing both
  `WINDOWS.md` entry 2 and coverage item D9.

## Self-Check: PASSED

- All 15 claimed created files and all 3 modified files verified present on disk.
- All 7 commits verified in `git log 1c9408d..HEAD`.
- `commits: 7` is **measured**, not narrated: `git rev-list --count 1c9408d..HEAD`.
- `actuals.tokens: 46700` is **measured** on the estimate's own scale: 186,800 diff bytes ÷ 4,
  against an estimate of 62,000.
- Plan-level verification re-run at close:
  - `pnpm vitest run --dir packages/country-data` → **89 passed**, 3 files, no network.
  - `--reporter=verbose | grep -c verifier.live.test.ts` → **0** (the live suite did not leak).
  - `pnpm vitest run packages/country-data/test/verifier.test.ts` → **38 passed** (≥ 8 required).
  - `pnpm vitest run packages/country-data/test/allowlist.test.ts` → **20 passed** (≥ 6 required).
  - `pnpm vitest run --config vitest.live.config.ts` → **2 passed**; live ETag
    `"Con-20231213063525000"` matches the stored value, conditional GET → 304.
  - `pnpm typecheck` → exit 0.
  - No host value in `allowlist.json` contains `eur-lex` (asserted against parsed data).
  - `legal-data.yml` contains no `curl`, `wget` or `fetch` — the PR profile stayed offline.
  - `nightly.yml` defines exactly `live-sources` and `directive-drift`; no write-shaped line
    touches `packages/country-data/data`; no discovery-query reference.
- One verification deferred and recorded: `gh workflow run nightly.yml` (post-merge).
