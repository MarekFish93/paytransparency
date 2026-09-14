---
phase: 01-ground-truth-and-governance
fixed_at: 2026-09-14T11:55:00Z
review_path: .planning/phases/01-ground-truth-and-governance/01-REVIEW.md
iteration: 1
findings_in_scope: 18
fixed: 18
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-09-14
**Source review:** `.planning/phases/01-ground-truth-and-governance/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 18
- Fixed: 18
- Skipped: 0

All five blockers and all thirteen warnings are fixed. No finding was found to be
wrong on inspection; every one reproduced against the running code before being
touched. One further defect was found *while* fixing CR-03/CR-04 and is fixed in the
same commit (see CR-04 below).

**Verification environment.** Every gate below was run **twice**: once in the isolated
worktree where the edits were made, and again **in the main checkout after the worktree
was torn down**. The figures in this report are the main-checkout run, so they are
reproducible from the tree you are reading:

```
pnpm typecheck            tsc -b, clean
pnpm test                 14 files, 411 tests passed   (was 13 files, 315 tests)
pnpm vitest run --config vitest.live.config.ts
                          1 file, 2 tests passed
pnpm validate:country-data  PASSED — 0 error, 0 warning, 0 schema issue
pnpm verify:sources         PASSED — 0 data defect, 0 promised-but-unexercised,
                                     86 not exercised (no retrieval layer)
pnpm rederive:vectors       10 of 10 vectors agree; 45 ambiguities (baseline 45);
                            153 citation key(s) resolved against 66 corpus entries
```

`pnpm-lock.yaml` was **not touched**. (`pnpm install` inside the worktree rewrote it once
as a side effect of its "broken lockfile" warning about the two YAML documents; that
change was reverted with `git checkout --` before any edit, and the file does not appear
in the diff.)

The nightly workflow was **rehearsed end to end against the live Publications Office**, not
reasoned about — see CR-04.

---

## Fixed Issues

### CR-01: Every URL field outside `sources[]` is unvalidated

**Files modified:** `packages/country-data/src/schema.ts`, `src/country.ts`, `src/lint.ts`,
`src/allowlist.ts`, `src/index.ts`, `data/_allowlist.json`, `test/schema.test.ts`,
`test/lint.test.ts`
**Commit:** `cc918b0`

**Applied fix:** Tightened the schema first, so the invalid state cannot be represented,
and kept the lint as a second wall (it also reads hand-edited and `proposed/` JSON that has
not been through `parse`).

- `SafeUrl` and `HarvestedUrl` in `schema.ts`, over one parameterised `urlIssues`.
  `sourceUrlIssues` keeps its signature and its message text.
- Every URL-bearing field is now typed: `equality_body.value[].url` / `.complaint_url` /
  `.art20_designation_source`, `labour_inspectorate.url`, `filing_authority.url`,
  `reporting.template.url`, `article_7.legal_basis` url, `national_act.url`,
  `draft_asserting_sources[]`, `discovery_hints[].national_link`.
- `isIpLiteralHost` now also rejects a bare-decimal host, matching `allowlist.ts`.
- L5 walks every string leaf with the key that owns it, classified by a rule about **names**
  (`/(^|_)(url|uri|link|source|sources)$/`) rather than a list of dotted paths — a list of
  paths is what went stale and produced this bug.

**The distinction you asked me to decide and state — scheme hygiene vs allowlist
membership.** I split it three ways rather than two:

| Tier | Rule | Applies to | Severity |
|---|---|---|---|
| 1 | scheme/shape (`sourceUrlIssues` / `harvestedUrlIssues`) | **every** URL, no exception | error |
| 2 | **fetch**-allowlist (`assertFetchable`) | `sources[].url`, `draft_asserting_sources[]` | error |
| 3 | **link**-allowlist (`assertLinkable`, new) | the fields the site presents as an official link | error |

Tier 3 is a **new, second list** (`linkable` in `_allowlist.json`), not a reuse of the fetch
list. Reasoning: `byCountry` answers *"what host may a CI runner connect to"* — an SSRF
question (T-1-07) where every entry widens the outbound surface. A complaint form is never
fetched by CI, so adding it there to permit a link would buy a phishing control by paying in
forgery surface. `linkable` answers the phishing question (T-1-08) and nothing else. Every
fetch-allowlisted host is linkable already.

All 27 `linkable` entries are **empty**, which is the honest state rather than a gap: every
field the list governs is `null` in all 27 records today. A host arrives there the same way a
register does — a maintainer adds it, with evidence, in a reviewed diff — instead of arriving
unnoticed inside a 600-line country record. I did **not** invent any host.

`discovery_hints[].national_link` is held to **tier 1 only**. It is harvested verbatim from
the Commission's NIM register, its provenance *is* that register, 18 of the 93 ELIs it
publishes today are plain `http:`, and the 7 hosts it names are national registers nobody has
curated. Rewriting a register's own identifier to clear a lint would falsify provenance, and
holding it to a curated list would make the rule red on 93 legitimate links — which is how a
gate gets disabled. `HarvestedUrl` tolerates `http:` **and nothing else**: `javascript:`,
`data:`, `file:`, credentials, IP literals, ports and tracking parameters are all rejected.

A fourth thing that cannot go stale: a `javascript:`/`data:`/`vbscript:`/`file:` scheme is
rejected on **every string leaf regardless of key name**, with leading control characters
stripped first (browsers strip them before resolving a scheme).

The review's exact payload is asserted rejected at parse **and** at lint, plus the look-alike
host, the off-convention key, the harvested `http:` ELI, and a whole-committed-tree clean
assertion so widening the rule cannot later be paid for by weakening it.

`country.schema.json` was re-emitted **byte-identical**: a zod refinement adds nothing to
JSON Schema output. Worth knowing — the editor squiggles do **not** catch this class; parse
does.

---

### CR-02: The freshness gate and the unchanged-bump rule deadlock

**Files modified:** `packages/country-data/src/freshness.ts`, `src/schema.ts`, `src/index.ts`,
`test/freshness.test.ts`, `.github/workflows/legal-data.yml`
**Commit:** `81ed359`

**Applied fix:** The exemption is keyed on **evidence**, with no flag, marker or override —
there is deliberately no way to assert "trust me, I checked". `evidenceReread(before, after)`
requires all three of:

1. the fact cites at least one source;
2. **every** source carried over from the previous revision has an `accessed_at` that moved
   strictly forward ("every", not "at least one" — re-reading the easy source and bumping the
   date is the same defect in a smaller costume); a source new in this revision is itself the
   fresh evidence;
3. the new `verified_at` is **not later than** the most recent `accessed_at` — you cannot
   verify a fact on a day after the last day you read its source. This is what stops
   `accessed_at` being nudged one day to unlock an arbitrary date.

Neither gate is weakened. Proved against the real implementations, on your scenario:

```
before:  freshnessGate ['article_7.legal_basis'], gate red
honest:  freshnessGate [],  unchangedBumps []                       <- was impossible
theatre: freshnessGate [],  unchangedBumps ['article_7.legal_basis']
nudge:   freshnessGate [],  unchangedBumps ['article_7.legal_basis']
```

Supporting tightening: `accessed_at` may not be in the future. That date is now load-bearing
rather than bookkeeping; without the check one `accessed_at: '2099-01-01'` would satisfy "read
again" for seventy years.

`legal-data.yml`'s freshness-gate failure text now names the move that actually works and
states that a re-confirmation of an **unchanged** value is legitimate.

**Stated honestly, because it is a real limit:** nothing visible in two JSON revisions proves
a human opened the page. What this establishes is that the bump is an explicit, dated,
per-source claim sitting in the diff a reviewer reads, rather than a one-character change to a
field nobody looks at. The machine-checked half of "was it really re-read" is `verify:sources`,
which dispatches the source against a real response — and CR-03/CR-04 made that half exist.

Eight new cases assert each gate as a **pair** (before *and* after the commit), because
asserting only the bump rule would pass against a fix that broke the freshness gate instead —
which is the shape these two kept failing in. One case asserts the **absence** of an escape
hatch.

---

### CR-03: No live source verification exists

**Files modified:** `packages/country-data/scripts/verify-sources.ts`, `scripts/validate.ts`,
`src/lint.ts`, `test/lint.test.ts`
**Commit:** `473763a` (wiring in `4a56bac`)

**Applied fix:**

- **`--require-exercised [strategies]`** (default `cellar`): a source whose strategy the run
  *promised* to supply a body for, and which is still queued, is now a failure. Scoped
  deliberately — the 38 `metadata-only` sources cite the Publications Office SPARQL endpoint,
  which returns zero triples for the CELEX URI and times out at 60 s. A gate demanding those
  be exercised would be red forever and disabled within a month.
- Everything outside that set is still **reported**, per source, as a `::warning::`
  annotation. The summary is now `0 data defect, N promised-but-unexercised, M not exercised`
  instead of a bare `PASSED`.
- **`--report <file>`** writes the evidence; **`validate.ts --profile <p> --exercised <f>`**
  reads it. The profile is selectable, not hardcoded; the default is unchanged, so nothing a
  contributor runs locally or in the PR workflow changes.
- **`L6_linkLiveness` on the nightly profile now reports**: errors for `unmet`, warnings for
  `unreachable`, and a skip *naming the missing evidence file* when nothing was supplied. It
  still retrieves nothing — this module is read-only and offline by construction, and a rule
  reporting on retrieval it did not observe is the vacuous gate the skip was hiding.
- The pull-request branch is unchanged, wording included. **L6 does not fire on pull
  requests.**
- `RuleReport.checked` makes a rule's own coverage visible in the summary.

Measured on the committed tree:

```
--profile nightly --exercised (fixtures only)
  L6   WARN   (0 error, 86 warning) (12 of 106 sources checked)
--require-exercised cellar with no bodies
  54 errors, exit 1
--profile nightly --exercised (after the real nightly probe)
  L6   WARN   (0 error, 32 warning) (66 of 106 sources checked)
```

The 11 % coverage is now in the summary a maintainer reads, not buried in a count under the
word PASSED.

---

### CR-04: Nightly drift reads 1 of 11 languages and picks its ETag by key order

**Files modified:** `.github/workflows/nightly.yml`,
`packages/country-data/scripts/verify-sources.ts`, `test/verify-sources.test.ts` (new)
**Commit:** `4a56bac`

**Applied fix:** One request per language, a per-language stored ETag, and an annotation that
names only that language's citation keys. The "one ETag per language" invariant is **asserted**
rather than assumed — a language holding two throws, because silently picking one is the defect
being fixed. The cache key is a sha256 over every language's ETag, so **nothing depends on key
order in `_directive.json`**. Also wires the `--bodies` hand-off (CR-03) and fixes WR-09 in the
same block.

**Rehearsed end to end against the live Publications Office from this machine:**

```
11 expressions fetched; every live ETag matches its stored counterpart
verify:sources --bodies … --require-exercised cellar
  -> PASSED, 0 data defect, 0 promised-but-unexercised, 32 not exercised
validate --profile nightly --exercised …
  -> L6 WARN (0 error, 32 warning) (66 of 106 sources checked)
```

All 66 corpus citations in all 11 languages were verified against a live body — the first time
any of them has been.

**A further defect found while wiring it, fixed in the same commit:** `suppliedBody` matched
bodies by **language alone**, so the first live run handed the Cellar English expression to the
38 `metadata-only` sources citing the SPARQL endpoint. Each reported `anchor_absent` against a
document it had never cited — **32 fabricated data defects**, and a maintainer sent to look for
a missing anchor in the wrong document. Bodies are now matched by **strategy and host**; the
`fresh.xhtml` catch-all is gone; an empty file counts as no body at all.

---

### CR-05: `textOf()` folds `&#160;` to an ASCII space on the storage path

**Files modified:** `packages/country-data/src/verifier.ts`, `test/directive-text.test.ts`
**Commit:** `561a372` (with WR-01)

**Applied fix:** Both instances written as **escapes**, never literals — that is the actual
fix. A literal U+00A0 is indistinguishable from U+0020 on screen, so reviewer attention is not
a control, and an escape survives every editor and every copy-paste.

```ts
.replace(/&#160;|&#xa0;|&nbsp;/gi, '\u00a0')     // textOf     (was '\u0020', an ASCII space)
.replace(/[\u00a0\u202f\u2009]/g, ' ')           // normalise  (was three ASCII spaces)
```

Also, per the review's own CR-05 patch: `&#xa0;` and `&rsquo;` recognised, entity matching made
case-insensitive, and `&amp;` moved **last** so source text published as `&amp;lt;` stays
`&lt;` instead of becoming `<` (IN-09 — a stored-text mutation on the same path; Info tier, but
it is the same line region and the CR-05 patch prescribes it).

Tests assert the **code point numerically** (`codePointAt(0) === 0x00a0`), never by string
equality — a string-equality assertion passes when both sides are equally wrong, which is how
this survived three previous fixes. The two pre-existing literal U+00A0 assertions in
`directive-text.test.ts` were rewritten as escapes for the same reason. `normaliseForMatch` is
asserted on single characters so the later `\s+` collapse cannot mask a broken class.

---

### WR-01: `normaliseForMatch`'s no-break-space class is three ASCII spaces

**Commit:** `561a372` — see CR-05 above.

---

### WR-02: L7 is vacuous in both states and assumes a letters layout

**Files modified:** `packages/country-data/src/lint.ts`, `test/lint.test.ts`
**Commit:** `e255c11`

**Applied fix:** `RuleReport.checked` now carries L7's count and `renderRule` prints it:
`L7 ok (0 of 27 countries checked)` and `L7 ok (5 of 27 countries checked)` are very different
claims. `lettersTemplatesDir` is an explicit option, defaulting to `<lettersDir>/templates`
when that exists; the search is recursive and matches on the basename, so a Phase 5 layout that
nests by locale arms the rule instead of reporting 27 missing templates; the finding names the
directory it actually looked in.

---

### WR-03: The Directive corpus's own freshness is gated by nothing

**Files modified:** `packages/country-data/src/freshness.ts`, `src/lint.ts`, `src/index.ts`,
`scripts/validate.ts`, `test/freshness.test.ts`, `.github/workflows/legal-data.yml`
**Commit:** `0320ac8`

**Applied fix:** `corpusFreshness(corpus, today)` warns at `ageing` and fails at `stale`. Wired
in two places so it cannot be filtered out again: `L8_freshness` takes `options.corpus`
(`validate.ts` passes the corpus it already loads), and a `Directive corpus freshness gate`
step in `legal-data.yml` gives it a red check with its own name.

Measured across the timeline: silent on 2026-09-14 and 2027-06-11; **66 warnings from
2027-06-12** ("91 day(s) left"); 66 errors on 2027-09-11. A gate that first speaks on the day
the citations disappear is not notice.

Worth recording: the first draft of the CI failure message named the corpus-pull script by its
`fetch:`-prefixed alias and `spine.test.ts`'s offline-workflow guard turned **red — correctly**.
The guard works; the message was reworded rather than the guard relaxed.

---

### WR-04: `MAX_BODY_BYTES` is checked after the body is already in memory

**Files modified:** `packages/country-data/src/verifier.ts`, `scripts/fetch-directive.ts`,
`test/verifier.test.ts`
**Commit:** `c076ece`

**Applied fix:** Two checks, both before anything is allocated: a declared `Content-Length`
above the cap is refused without reading a byte, and a response with no usable declared length
is read through `readBodyCapped`, which streams and **cancels** at the cap. `FetchLike` gains an
optional `body?: ReadableStream<Uint8Array>`; a real `fetch` Response has one, a test double
does not and falls back to `text()` — safe precisely there, because those bytes are already
local and bounded. The post-read measurement stays as the backstop for a fixture-supplied
response. `fetch-directive.ts` had the identical ordering and is fixed the same way.

Tests assert the **distinguishing** behaviour, not the outcome: the Content-Length case asserts
`text()` was called **zero** times, and the streaming case serves an **infinite** stream —
finishing at all proves the read stopped at the cap.

---

### WR-05: A `cellar` source with `expected_subtitle: null` gets a green

**Files modified:** `packages/country-data/src/schema.ts`, `src/verifier.ts`,
`test/schema.test.ts`, `test/verifier.test.ts`
**Commit:** `182ca6f`

**Applied fix:** Fixed at both layers so they cannot disagree: `schema.ts` rejects a cellar
source with a null `expected_subtitle` at parse, and `verifier.ts` returns
`language_unconfirmed` rather than skipping, so a hand-built source fails visibly instead of
being verified by absence of a finding. All 66 committed cellar sources already carry a
subtitle, so nothing in the tree changes.

---

### WR-06: A 304 revalidates the document but never re-asserts the anchor

**Files modified:** `packages/country-data/src/freshness.ts`, `src/verifier.ts`, `src/lint.ts`,
`src/index.ts`, `test/freshness.test.ts`
**Commit:** `a3c293f`

**Applied fix:** Three layers. `staleEtagClaims(previous, next)` reports any source whose
`anchor` or `scope` changed while its `etag` did not — wired into the BUMP rule, which already
holds the base-branch comparison, and the message names the fix (clear `etag` in the same
commit) not just the fault. `LiveOptions.revalidate: false` drops `If-None-Match` so a caller
that doubts the stored **claim** rather than the document can force a full read. The 304 result
now carries a `notes` entry stating the anchor and scope were not re-asserted.

The BUMP rule's title becomes *"a claim cannot move without its evidence moving"*, which is the
one principle both its families express.

---

### WR-07: `seed-from-nim.ts`'s entry-point guard never matches on Linux

**Files modified:** `packages/country-data/scripts/seed-from-nim.ts`, `test/spine.test.ts`
**Commit:** `4b5380e` (with WR-08)

**Applied fix:** `pathToFileURL(process.argv[1]).href`, matching the three siblings. Asserted
**across the whole scripts directory** rather than on the one file that had the bug: every CLI
script builds no `file://` URL by hand, and every one has a guard at all.

---

### WR-08: `emit-json-schema.ts` writes before validating, and runs on import

**Files modified:** `packages/country-data/scripts/emit-json-schema.ts`, `test/spine.test.ts`
**Commit:** `4b5380e`

**Applied fix:** Validate first, then write (`writeJsonSchema`). Assert the `country.code`
**enum deep-equals `EU_COUNTRY_CODES`**, not `JSON.stringify(parsed).match(/"GR"/g)` — which any
occurrence of the two characters `GR` between quotes anywhere satisfies, including inside the
long `description` string the emitter itself writes. A check its own prose can satisfy is not a
check. Plus an entry-point guard. Tests include the decoy document the old probe accepted, and
an assertion that importing the emitter leaves `country.schema.json` byte-identical.

---

### WR-09: The nightly probe drops `set -e` and reports a header failure as drift

**Commit:** `4a56bac` — same block as CR-04.

**Applied fix:** `set -euo pipefail`; an empty ETag is classified as an **outage**, not drift; a
zero-byte 200 is a defect ("a verifier that passes on an empty 200 is worse than no verifier");
a failing `cp` fails the step instead of reporting `outcome=fresh` for bodies it did not cache.

---

### WR-10: `buildShareUrl` assumes a bare base; `transmittedKeysOf` throws

**Files modified:** `packages/directive-engine/src/share-url-contract.ts`,
`test/share-url-contract.test.ts`
**Commit:** `44eda34`

**Applied fix:** Any query or fragment on the base is **discarded**, which is the contract
rather than a convenience: it makes the transmitted set genuinely closed, so
`transmittedKeysOf(buildShareUrl(anyBase, input))` is exactly `TRANSMITTED_KEYS` for every base.
The fragment marker is located first, because a `?` after a `#` is part of the fragment.

Hand-rolled rather than `new URL(base)`: this package sets `types: []` because nothing under
`src/` may touch an environment global — it is consumed in the browser — and adding the `DOM`
lib to type `URL` would pull in `window` and `document` with it and weaken that guard for one
string split.

`transmittedKeysOf` no longer throws; an undecodable key is reported raw so the closed-set
comparison sees and rejects it.

---

### WR-11: `verify:sources` resolves a country from the filename

**Files modified:** `packages/country-data/scripts/verify-sources.ts`,
`test/verify-sources.test.ts`
**Commit:** `70c5964`

**Applied fix:** `countryForFile` prefers the record's own `country.code`, falls back to the
stem only when the record declares nothing, and **reports the disagreement** as a warning
annotation rather than trusting it silently — so a mis-named file is a named defect in
whichever entry point the maintainer happens to run first.

---

### WR-12: A corrupted capture silently downgrades a defect fixture to a pass

**Files modified:** `packages/country-data/scripts/verify-sources.ts`,
`test/verify-sources.test.ts`
**Commit:** `70c5964`

**Applied fix:** `loadEnvelope` throws, naming the file and the reason, and saying what the
fixture is for: a gate, not an optimisation. A test loads all four registered captures from the
committed tree — the assertion that would have caught a corrupted one at review time.

---

### WR-13: 45 recorded ambiguities and `rederive:vectors` exits 0

**Files modified:** `packages/directive-engine/scripts/rederive.ts`,
`AMBIGUITY-BASELINE.json` (new), `test/rederivation.test.ts`,
`packages/country-data/test/spine.test.ts`, `.github/workflows/legal-data.yml`
**Commit:** `c0c1002`

**Applied fix:**

- `AMBIGUITY-BASELINE.json` records the count as a **ratchet**, with a note saying what was
  accepted and why. `report()` exits 1 when the count **rises**, and asks for the baseline to be
  lowered in the same commit when it falls, so the ratchet cannot slip back up unnoticed. A file
  rather than a constant, so accepting a new ambiguity is a reviewed diff carrying a note.
  It lives in the package root because `vectors-wellformed.test.ts` asserts `vectors/` holds no
  loose file — that guard stops a shared default conventions block being inherited, and it is
  right.
- `report()` now **resolves** every citation against the Directive corpus, article and
  paragraph, which is what `corpusKeyFor`'s docblock described and the script did not perform.
  `153 citation key(s) resolved against 66 corpus entries` is the first run in which that
  sentence is true. Where the corpus is not on disk it says so rather than assuming. The shape
  check is kept with its narrower scope stated honestly.
- `pnpm rederive:vectors` is now a step in `legal-data.yml`, added to `spine.test.ts`'s
  enumerated-command allowlist with a note on why it is offline.

Ratchet proved in both directions: baseline 44 → exit 1 naming the Art. 10(1) reading;
baseline 46 → exit 0 asking for the baseline to be lowered.

The substantive ambiguity is **carried forward as an open convention question, not closed**:

> `[denominator]` Whether the Art. 10(1) five-percent trigger tests the signed gap or its
> magnitude. `v08-negative-gap` is the only vector where the two readings give different
> **outcomes** rather than different numbers.

That decides whether an employer owes a joint pay assessment. It is recorded in
`AMBIGUITY-BASELINE.json` as accepted-for-now with that wording, and it needs a human decision
in `docs/CONVENTIONS.md`. **This is the one item I flag for you rather than claim as resolved.**

---

## Skipped Issues

None.

## Out of scope

The 8 Info findings (IN-01 … IN-09, excluding IN-09) were not in scope
(`fix_scope: Critical + Warning`) and were not touched. **IN-09** (`&amp;` decoded before
`&lt;`/`&gt;`/`&quot;`) *was* fixed, because it is the same line region as CR-05 and the
review's own CR-05 patch prescribes the reordering.

## Items needing human judgement

1. **The Art. 10(1) signed-gap-versus-magnitude reading** (WR-13). Recorded and gated, not
   decided. It changes an outcome, not a number.
2. **`_allowlist.json`'s `linkable` section is empty** (CR-01). That is correct today — every
   field it governs is null. The first real equality-body or complaint URL will need a host
   added there with evidence; the gate will say so.
3. **`--require-exercised cellar` will make the nightly red** if the Publications Office
   changes any language expression, which is the intent. The local rehearsal was green on
   2026-09-14 for all 11 languages.

---

_Fixed: 2026-09-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
