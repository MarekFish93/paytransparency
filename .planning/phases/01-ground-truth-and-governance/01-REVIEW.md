---
phase: 01-ground-truth-and-governance
reviewed: 2026-09-14T00:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - packages/country-data/src/lint.ts
  - packages/country-data/src/verifier.ts
  - packages/country-data/src/allowlist.ts
  - packages/country-data/src/resolve.ts
  - packages/country-data/src/extract.ts
  - packages/country-data/src/freshness.ts
  - packages/country-data/src/source-strategy.ts
  - packages/country-data/src/schema.ts
  - packages/country-data/src/country.ts
  - packages/country-data/src/index.ts
  - packages/country-data/scripts/validate.ts
  - packages/country-data/scripts/verify-sources.ts
  - packages/country-data/scripts/emit-json-schema.ts
  - packages/country-data/scripts/fetch-directive.ts
  - packages/country-data/scripts/seed-from-nim.ts
  - packages/directive-engine/src/types.ts
  - packages/directive-engine/src/share-url-contract.ts
  - packages/directive-engine/src/index.ts
  - packages/directive-engine/scripts/rederive.ts
  - packages/country-data/test/lint.test.ts
  - packages/country-data/test/verifier.test.ts
  - packages/country-data/test/verifier.live.test.ts
  - packages/country-data/test/allowlist.test.ts
  - packages/country-data/test/spine.test.ts
  - packages/country-data/test/resolve.test.ts
  - packages/country-data/test/freshness.test.ts
  - packages/country-data/test/schema.test.ts
  - packages/country-data/test/directive-text.test.ts
  - packages/country-data/test/coverage.test.ts
  - packages/directive-engine/test/share-url-contract.test.ts
  - packages/directive-engine/test/rederivation.test.ts
  - packages/directive-engine/test/conventions-documented.test.ts
  - packages/directive-engine/test/vectors-wellformed.test.ts
  - .github/workflows/legal-data.yml
  - .github/workflows/cellar-reachability.yml
  - .github/workflows/nightly.yml
  - vitest.config.ts
  - vitest.live.config.ts
findings:
  critical: 5
  warning: 13
  info: 8
  total: 26
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-09-14
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

This is careful, unusually well-reasoned code, and most of the traps the phase set out to
avoid are genuinely avoided: the byte floors are measured with `Buffer.byteLength`, the
Cellar anchor really is asserted inside the `art_N` subtree, `extract.ts#flattenAsciiWhitespace`
correctly spells out ASCII-only character classes rather than trusting `\s`, both vitest
globs are root-relative and match real files (`vitest run` collects the suites; the
`--dir packages/country-data` re-rooting hazard is handled), and `assertFetchable` gets
the label-boundary rule right.

The defects are not in the arithmetic. They are in the **gap between what the comments
claim a gate does and what the gate does**, and that gap is wide enough to matter on a
repository that went public today:

1. **The URL gate covers roughly a third of the URLs in the record.** L5 and the schema
   only validate strings inside `sources[]`. Every other URL field — including the
   equality body's `complaint_url` that a worker will be told to click — is an unchecked
   `z.string()`. I proved a `javascript:` URL and an off-allowlist phishing URL passing
   both `CountryRecord.safeParse` and `lintAll` with zero findings.
2. **Live source verification does not exist anywhere in this system.** The nightly
   workflow never runs `verify:sources`; `--bodies` is dead code; `validate.ts` hardcodes
   `profile: 'pull-request'` so L6 can never be anything but a SKIP. `pnpm verify:sources`
   exits 0 today with 94 of 106 sources reported "queued (not exercised)".
3. **Drift detection covers 1 of 11 authentic language expressions**, and picks its
   comparison ETag by JSON key order.
4. **The freshness gate and the unchanged-bump rule are mutually exclusive.** I proved
   that the only commit which clears `freshness-gate` after a fact goes stale is exactly
   the commit `assertNoUnchangedBump` rejects. The routine re-verification workflow is
   mechanically impossible in CI.
5. **The U+00A0 trap has recurred a fourth time**, dormant: `textOf()` folds `&#160;` to
   an ASCII space while its own docblock insists in capitals that it does not.

The domain-context worry about vacuous gates is well founded. L6 is structurally
unreachable, L7 is vacuous in both of its states, and `verify:sources` reports PASSED
while exercising 11% of its input.

## Critical Issues

### CR-01: Every URL field outside `sources[]` is unvalidated — `javascript:` and phishing URLs pass the full gate

**File:** `packages/country-data/src/lint.ts:523-570`, `packages/country-data/src/country.ts:138-148,227-233,263-269,379-430`

**Issue:** `L5_urlHygiene`'s walk only calls `visitSource` for `key === 'sources'`. Every
other URL in the record is typed `z.string().nullable()` (or bare `z.string()`) with no
scheme check, no `sourceUrlIssues`, and no allowlist membership:

- `enforcement.equality_body.value[].url`, `.complaint_url`, `.art20_designation_source`
- `enforcement.labour_inspectorate.value.url`
- `reporting.template.value.url` (not even nullable), `reporting.filing_authority.value.url`
- `article_7.legal_basis.value.url` (`NationalLegalBasis.url`)
- `transposition.national_act.value.url`
- `transposition.draft_asserting_sources[]` (array of bare URL strings)
- `discovery_hints[].national_link` — populated from the register by `safeLink`, which
  explicitly permits `http:` and any host

Proven against the real code: a record whose equality body carries
`url: 'javascript:alert(document.cookie)'` and
`complaint_url: 'http://phish.example/steal?utm_source=x'`, whose reporting template carries
`url: 'javascript:void(fetch("//evil"))'`, and whose `draft_asserting_sources` names
`http://evil.example/not-a-source`, returns `CountryRecord.safeParse` → **success**,
`L5_urlHygiene` → **0 findings**, `L4_noUnsourcedStatute` → **0 findings**, full `lintAll`
→ **no URL error of any kind**.

These are precisely the fields Phase 3 renders as links — "file a complaint with your
equality body here". The repository is public and D-11 invites community pull requests
into `proposed/`, which is held to the same schema and the same lint. A contributor-supplied
`javascript:` href is stored XSS; a contributor-supplied look-alike host is a phishing page
presented to a worker under the site's own "official body" label. The threat model already
names contributor-supplied URLs (T-1-07/T-1-08); this is the same untrusted input arriving
through a field nobody wired to the guard.

**Fix:** Introduce one URL schema and use it everywhere a URL is stored, then extend L5 to
walk it.

```ts
// schema.ts — one shared shape, reused by Source AND by every value-level url field.
export const SafeUrl = z.string().superRefine((value, ctx) => {
  for (const message of sourceUrlIssues(value)) ctx.addIssue({ code: 'custom', message });
});

// country.ts
export const EqualityBodyEntry = z.strictObject({
  name_local: z.string().min(2),
  name_en: z.string().min(2).nullable(),
  url: SafeUrl.nullable(),
  complaint_url: SafeUrl.nullable(),
  art20_designation_source: SafeUrl.nullable(),
});
// ...same for NationalLegalBasis.url, NationalAct.url, labour_inspectorate.url,
// reporting.template.url, reporting.filing_authority.url, DiscoveryHint.national_link,
// and transposition.draft_asserting_sources: z.array(SafeUrl).
```

In `lint.ts`, add a `URL_FIELDS` list (dotted paths) alongside `FACT_PATHS` and run both
`sourceUrlIssues` and `assertFetchable(url, country)` over it inside L5, so a link the site
presents as official must sit on that country's allowlist — the same rule its citations
already obey. Add a regression test with the exact payload above asserting L5 reports it.

---

### CR-02: The freshness gate and the unchanged-bump rule deadlock every routine re-verification

**File:** `packages/country-data/src/freshness.ts:201-227` and `:240-280`; `.github/workflows/legal-data.yml:153-189`

**Issue:** `freshnessGate` hard-fails a launch country's legally-operative fact once
`elapsedDays(verified_at, today) >= TTL` (90 days for `volatile`). The only way to clear it
is to move `verified_at` forward. `unchangedBumps` errors on any fact whose `verified_at`
moved while `JSON.stringify(value)` did not change. A re-verification that confirms the law
has **not** changed — which is what re-verification usually confirms — is exactly that
commit. There is no exemption, no `reverified` marker, no override.

Proven against the real implementations on a real record (`data/PL.json`, `article_7.legal_basis`
verified 2026-01-01, today 2026-09-14):

```
freshnessGate BEFORE re-verification: [ 'article_7.legal_basis' ]   # PR is red
freshnessGate AFTER  re-verification: [ ]                            # gate cleared
unchangedBumps on that exact commit:  [ 'article_7.legal_basis' ]    # PR is red again
```

The `freshness-gate` job's own failure text instructs the maintainer to do the blocked
thing: *"Re-verify the source and record who read it in `verified_by`; do NOT extend the TTL
to turn this green."* Under time pressure the only available moves are to weaken one of the
two gates or to fabricate a value change — both worse than either gate's absence.

**Fix:** Separate "the value changed" from "we looked again". A date bump is legitimate iff
the evidence moved:

```ts
// freshness.ts — inside walk(), before pushing a bump:
const evidenceMoved =
  JSON.stringify(before['sources'] ?? null) !== JSON.stringify(after['sources'] ?? null);
if (beforeDate !== afterDate && sameValue && !evidenceMoved) { /* push the bump */ }
```

`accessed_at` / `etag` / `last_modified` on the cited source all move on a genuine
re-verification and none of them moves on a "typo fix that quietly advances a date", which
is the shape the rule exists to catch. Add two tests: (a) a bump with an unchanged
`sources` array is rejected; (b) a bump accompanied by a moved `accessed_at` passes **and**
clears `freshnessGate` in the same commit.

---

### CR-03: No live source verification exists — `verify:sources` passes on 94 of 106 sources it never read, and the nightly job it defers to does not call it

**File:** `packages/country-data/scripts/verify-sources.ts:1-30,262-282,350-393`; `packages/country-data/src/lint.ts:584-608`; `packages/country-data/scripts/validate.ts:310-317`; `.github/workflows/nightly.yml`

**Issue:** Three claims in the source are false against the workflows as committed:

1. `verify-sources.ts` header: *"Retrieval lives in the nightly workflow, which probes
   Cellar in a step of its own and hands the body here via `--bodies <dir>`."* Grepping the
   whole repository, `verify:sources` appears in exactly one workflow — `legal-data.yml`
   (the offline PR profile) — and `--bodies` appears in no workflow at all.
   `suppliedBody()` (lines 262-282) is dead code.
2. `L6_linkLiveness`'s skip reason: *"The retrieval itself is verify:sources"* and, on the
   nightly branch, *"N sources are queued for live re-verification by verify:sources on
   this nightly run."* No such run exists. Worse, **both branches of L6 return
   `skipped(...)`** — L6 cannot produce a finding under any input — and `validate.ts:313`
   hardcodes `profile: 'pull-request'` with no CLI flag, so the nightly branch is
   unreachable from any caller except its own unit test.
3. Actual output of the gate as it stands today:

```
verify:sources — 106 committed sources, committed fixtures only
    94  queued (not exercised)
    12  verified
PASSED — 0 data defect
```

`main()` fails only on `data_defect`; `queued` is silently a pass. The gate that is
supposed to stop a wrong statute reaching a worker reports green having read 11% of its
input, and the honest "not exercised" label never reaches an exit code or a CI annotation.

**Fix:** Three changes, none large:

```ts
// verify-sources.ts main() — make the unexercised count visible and thresholdable.
const queued = outcomes.filter((o) => o.mode === 'queued' && !o.candidate.awaitingPromotion);
if (queued.length > 0) {
  process.stdout.write(`\n::warning::${queued.length} source(s) were NOT exercised\n`);
  for (const q of queued) process.stdout.write(`  ? ${q.candidate.where}\n`);
}
// and on the nightly profile (--require-exercised), exit 1 when any non-proposal source is queued.
```

Then either wire the nightly to it (`pnpm verify:sources --bodies "${CELLAR_CACHE_DIR}"`
after the probe step) or delete `suppliedBody`, `--bodies`, and L6 and say plainly in the
docs that link liveness is not implemented in Phase 1. A rule that cannot fire is worse
than an absent rule, because the summary prints it in the list of nine.

---

### CR-04: Nightly drift detection reads 1 of 11 language expressions and picks its comparison ETag by object-key order

**File:** `.github/workflows/nightly.yml:67-139`

**Issue:** The stored-ETag step collapses every source ETag in the corpus into a `Set` and
takes `[...etags][0]`. The committed corpus holds **4 distinct ETags across 11 languages**:

```
eng "Con-20231213063525000"
pol "Con-20241016035353000"   slk/ita/lit/deu/nld/ces/swe "Con-20241016035352000"
mlt "Con-20241016035353000"   dan "Con-20241016035351000"
```

`[...etags][0]` resolves to the English one **only** because `fetch-directive.ts` emits the
file language-outer with `eng` first, so `Object.keys()[0]` is `32023L0970#003@eng`. Any
re-sort of `_directive.json` (an obvious tidy-up; alphabetically `#003@ces` sorts first)
makes the job compare the live **English** ETag against the stored **Czech** ETag and
report `Directive expression drifted — review required` every single night. A gate that is
red for a reason nobody can act on gets disabled, which is the exact failure mode this
repository's comments are written against.

Second, more serious half: the probe sends `Accept-Language: eng` and nothing else. The
Polish, Slovak, Italian, Lithuanian and Maltese expressions — the authentic texts a launch
country's letter quotes — are **never** compared against the live source. The annotation
nevertheless prints `Affected citation keys: ${CITATION_KEYS}`, which is all 66 entries,
overstating coverage by an order of magnitude to the maintainer reading it at 9am.

**Fix:** Key the comparison by language and loop over every language the corpus holds.

```bash
# emit etag_<lang3> per language from _directive.json, then:
for LANG in eng pol slk ita lit mlt deu nld ces swe dan; do
  curl -sS -L --max-time 90 -H 'Accept: application/xhtml+xml' -H "Accept-Language: ${LANG}" \
       -D "${CELLAR_CACHE_DIR}/headers-${LANG}.txt" -o "${CELLAR_CACHE_DIR}/fresh-${LANG}.xhtml" ...
  # compare against the stored ETag FOR THAT LANGUAGE; name only that language's keys in the annotation
done
```

Until that lands, narrow the annotation to the `@eng` keys so it does not claim coverage it
does not have.

---

### CR-05: `textOf()` folds `&#160;`/`&nbsp;` to an ASCII space on the STORAGE path, while its docblock states it does not

**File:** `packages/country-data/src/verifier.ts:280-297` (replacement at line 291)

**Issue:** The docblock says, in capitals and with an instruction to look closely:

> `&#160;` decodes to U+00A0, **NOT** to an ASCII space — look closely at the replacement
> below. […] folding it here would rewrite the statute on the way into storage.

Code-point dump of line 291 (`.replace(/&#160;|&nbsp;/g, ' ')`):

```
... 2f 67 2c 20 27 20 27 29      →  the replacement literal is  0x20  (ASCII space)
```

There is no U+00A0 anywhere on that line. `textOf` is on the storage path:
`extract.ts:128 rawTextOf → textOf`, whose output is stored verbatim as
`DirectiveArticle.raw_text`, `DirectiveParagraph.raw_text` and `DirectiveSubPoint.raw_text`
by `fetch-directive.ts#toFact`. This is the U+00A0 trap the domain context says already
recurred three times, present a fourth time — and the comment actively tells a reviewer it
is handled.

It is currently **dormant**, and I verified that honestly: the Cellar XHTML emits literal
U+00A0 rather than the entity (`cellar-art7-en.xhtml`: 646 raw U+00A0, 0 occurrences of
`&#160;`; `data/_directive.json` preserves 4,514 escaped ` `). But `textOf` is also the
storage-adjacent reader for `html-anchor` and `metadata-only` sources on national registers,
where `&nbsp;` is ordinary HTML output, and nothing prevents the Publications Office from
serving an entity-encoded variant under content negotiation. The protection this project
paid for three times does not exist.

**Fix:**

```ts
export function textOf(xhtml: string): string {
  return xhtml
    .replace(/<[^>]*>/g, '')
    .replace(/&#160;|&#xa0;|&nbsp;/gi, ' ')   // U+00A0, not ' '
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');                        // LAST — see IN-09
}
```

Add a test that pins the byte, not the rendering:

```ts
expect([...textOf('<p>Article&#160;7</p>')].map((c) => c.codePointAt(0)))
  .toContain(0x00a0);
```

---

## Warnings

### WR-01: `normaliseForMatch`'s no-break-space class contains three ASCII spaces, not the three code points its comment names

**File:** `packages/country-data/src/verifier.ts:93-94`

**Issue:** The comment reads `// U+00A0 no-break space, U+202F narrow no-break space, U+2009 thin space.`
The class beneath it dumps as `5b 20 20 20 5d` — `[` followed by **three 0x20 ASCII spaces**
and `]`. It folds nothing the comment claims. Matching still works today only by accident:
the later `.replace(/\s+/g, ' ')` on line 99 does the folding, because JavaScript's `\s`
happens to include U+00A0, U+2009 and U+202F. Anyone who removes that collapse in a
tidy-up — reasonably, having read line 94 as the real mechanism — silently breaks anchor
matching against every authentic document.

**Fix:** `.replace(/[   ]/g, ' ')` — escaped, so the code points are visible
in the diff and cannot be re-typed as spaces by an editor. Add
`expect(normaliseForMatch('Article 7')).toBe('Article 7')` as a unit test that does not
depend on the `\s+` line.

### WR-02: L7 is vacuous in both of its states and assumes a letters layout that will not exist

**File:** `packages/country-data/src/lint.ts:622-660`

**Issue:** Today it SKIPs (`packages/letters` absent). The day that directory is created it
flips to `ok` while checking **zero** countries: the loop `continue`s on any country whose
`article_7.legal_basis` is `pending_verification`, and all 27 records are pending today
(confirmed — `validate` reports L2/L3 clean with every operative field pending). So the rule
transitions from an honest SKIP straight to a green that asserts nothing. Separately,
`readdirSync(lettersDir).filter(e => e.isFile())` expects `pl.en.md` to sit directly in the
package root, which is where `package.json` and `README.md` live — no real letters package
will put templates there.

**Fix:** Make the rule's own coverage visible (`findings` plus a `checked: N` count rendered
by `renderRule`, so `L7 ok (0 countries checked)` is distinguishable from `L7 ok (5 checked)`),
and take the template directory as an explicit option (`lettersTemplatesDir`) rather than
inferring the layout.

### WR-03: The Directive corpus's own freshness is gated by nothing, and goes stale on 2027-09-11

**File:** `packages/country-data/scripts/validate.ts:49-59`; `packages/country-data/src/lint.ts:676-725`; `packages/country-data/src/freshness.ts:201-227`

**Issue:** `loadRecords` filters `!name.startsWith('_')`, so `_directive.json` never reaches
L8 or `freshnessGate`; the `freshness-gate` CI job applies the same filter. `verifySource`
checks freshness only on the `manual-attest` branch. The corpus facts are
`volatility: 'stable'` (365 days) with `verified_at: 2026-09-11`, so on 2027-09-11 every one
of the 66 entries becomes `stale`. `resolve()` then reports `freshness: 'stale'` for every
`directive_fallback`, and D-10 says a stale value is suppressed from share cards and letter
citations — so the Art. 7(4) two-month citation silently drops out of every letter with no
gate having warned in advance.

**Fix:** Include `_directive.json` in a corpus-specific freshness check (its own job, or an
L8 branch over the corpus), warning at `ageing` (0.75 × 365 = day 274) and failing before
the TTL rather than after it.

### WR-04: `MAX_BODY_BYTES` is checked after the whole body is already in memory

**File:** `packages/country-data/src/verifier.ts:77-82,465-470`, `:803`

**Issue:** The docblock states the cap exists because *"an unbounded remote body is still an
unbounded allocation at build time"* (T-1-05). `verifySourceLive` does `body = await res.text()`
at line 803 — the full allocation — and `verifySource` measures it afterwards at line 458.
The cap detects an oversized body; it does not prevent allocating one. `fetch-directive.ts:97-106`
has the identical ordering.

**Fix:** Reject on `Content-Length` before reading, and stream-cap the read for responses
that omit it:

```ts
const declared = Number(res.headers.get('content-length') ?? '0');
if (declared > MAX_BODY_BYTES) return defect('body_too_large', ...);  // before .text()
```

### WR-05: A `cellar` source with `expected_subtitle: null` gets a green with no language evidence at all

**File:** `packages/country-data/src/verifier.ts:542-555`; `packages/country-data/src/schema.ts:147-151`

**Issue:** `SourceScope.expected_subtitle` defaults to `null`, and `verifyCellar` runs the
language confirmation only `if (scope.expected_subtitle !== null)`. The module's own reason
for that check is that the Cellar 200 carries an **empty** `Content-Language` — so with a
null subtitle nothing in the response identifies the language, and the result is still
`disposition: 'verified'` with no note recording the gap. The schema already requires
`scope` for `cellar` (country.ts-adjacent refinement in `schema.ts:256-263`) but not
`expected_subtitle`.

**Fix:** Extend that same refinement:

```ts
if (source.verification === 'cellar' && (source.scope === null || source.scope.expected_subtitle === null)) {
  ctx.addIssue({ code: 'custom', path: ['sources', i, 'scope', 'expected_subtitle'],
    message: 'a cellar source must carry expected_subtitle — the Cellar 200 has an empty Content-Language, so the subdivision subtitle is the only language evidence in the response' });
}
```

### WR-06: A 304 revalidates the document but never re-asserts the anchor or the scope

**File:** `packages/country-data/src/verifier.ts:411-419,717-730`

**Issue:** `requestHeadersFor` sends `If-None-Match: source.etag`, and a 304 returns
`disposition: 'revalidated'` before any scope or anchor check. That is correct with respect
to the *document* — it has not changed — but the anchor and `scope.id` are **our data**, not
the server's. Editing `source.anchor` while leaving `source.etag` in place produces a source
whose claim is never machine-checked on any path that 304s, and nothing in the schema or the
lint requires `etag` to be cleared when `anchor` or `scope` changes. On the PR profile only
the `en`/`pl` Cellar sources have fixtures, so for the other 94 sources this is the only path
that would ever check them.

**Fix:** Drop `If-None-Match` whenever the stored `anchor`/`scope` differ from the base
branch's (the unchanged-bump plumbing in `validate.ts#loadBaseRecords` already retrieves the
base record), or add a lint rule: a diff that changes `anchor` or `scope` must also clear
`etag`.

### WR-07: `seed-from-nim.ts`'s entry-point guard never matches on Linux — the script is a silent no-op in CI

**File:** `packages/country-data/scripts/seed-from-nim.ts:661-662`

**Issue:**

```ts
const isEntryPoint = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
```

On POSIX `process.argv[1]` is `/home/runner/work/.../seed-from-nim.ts`, so the template
produces `file:////home/...` — **four** slashes — which never equals `import.meta.url`.
`pnpm seed:nim` on Linux exits 0 having done nothing. The three sibling scripts use
`resolve(argv[1]) === resolve(fileURLToPath(import.meta.url))`, and `rederive.ts:327-331`
documents this precise hazard ("silently turning the CLI into a no-op that exits zero — the
worst possible failure for a gate") while using `pathToFileURL`.

**Fix:** `if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)`,
matching `rederive.ts`.

### WR-08: `emit-json-schema.ts` writes the file before validating it, and runs on import

**File:** `packages/country-data/scripts/emit-json-schema.ts:44-54`

**Issue:** The comment at line 47 reads *"Fail loudly rather than committing a schema that
would validate a typo'd country code"* — but `writeFileSync(OUT, json)` is line 45 and the
check is lines 48-54. The bad schema is already on disk when the throw happens, so a
subsequent `git add -A` commits exactly what the comment says it prevents. Two smaller
problems in the same block: the probe is `JSON.stringify(parsed).match(/"GR"/g)`, which any
occurrence of the two characters `GR` in quotes anywhere in the emitted document satisfies
(including the long `description` string this script writes); and unlike every other script
in the phase there is no entry-point guard, so importing `emitJsonSchema` for a test writes
the file as a side effect.

**Fix:** Validate first, then write; assert against the enum array rather than a substring
(`parsed…country.properties.code.enum` deep-equals `EU_COUNTRY_CODES`); and guard the
side effect behind the same `resolve(process.argv[1]) === …` check the other scripts use.

### WR-09: The nightly probe drops `set -e` and reports a header-parse failure as legal-text drift

**File:** `.github/workflows/nightly.yml:100-143`

**Issue:** `set -uo pipefail` without `-e`. If `grep -i '^etag:' headers.txt` matches nothing
(header casing change, a proxy stripping it, an empty `headers.txt`), `LIVE_ETAG` is the
empty string, the script does not abort, and the next comparison emits
`::error title=Directive expression drifted — review required::The Cellar ETag changed from
"Con-…" to .` A maintainer is told the Official Journal text changed when in fact the job
could not read a response header. In the final block a failing `cp` or `printf` likewise
does not fail the step, which then reports `outcome=fresh` for a body it did not cache.

**Fix:**

```bash
if [ -z "${LIVE_ETAG}" ]; then
  echo "::warning title=No ETag in the response::Cannot compare against the stored ETag; treating as an outage, not as drift."
  echo "outcome=cached" >> "$GITHUB_OUTPUT"; exit 0
fi
```

and `cp … || { echo '::error::failed to cache the fetched body'; exit 1; }`.

### WR-10: `buildShareUrl` assumes `base` carries no query or fragment; `transmittedKeysOf` throws on hostile input

**File:** `packages/directive-engine/src/share-url-contract.ts:157-178`

**Issue:** `return \`${base}?${query}${fragment}\`` unconditionally appends `?`. A base of
`https://site/og?lang=pl` yields `https://site/og?lang=pl?v=1&gap=…` — the `band` and `gap`
end up inside a value of `lang`, and the card renderer reading `band` gets nothing. A base
carrying a fragment puts the worker's private state after an existing `#`, i.e. inside
another fragment's value. Separately, `transmittedKeysOf` calls `decodeURIComponent` on
arbitrary attacker-supplied text and throws `URIError` on a malformed escape (`?%ZZ=1`);
a closed-set *validator* that throws instead of reporting is one `try` away from being
swallowed by a caller and reporting "no forbidden keys".

**Fix:** Build with `URL`/`URLSearchParams` (`const u = new URL(base); u.search = query; u.hash = fragment;`),
and wrap the decode: `try { return decodeURIComponent(raw); } catch { return raw; }` so a
malformed key is *reported* rather than throwing out of the check.

### WR-11: `verify:sources` resolves a record's allowlist country from the filename, not from `country.code`

**File:** `packages/country-data/scripts/verify-sources.ts:115-125`

**Issue:** `const country = name.replace(/\.json$/i, '')`. L1 asserts filename and
`country.code` agree, but L1 lives in a different entry point (`validate:country-data`) and
its result does not gate this script — `legal-data.yml` runs them as two independent steps
in the same job, and `verify:sources` will happily evaluate a mis-named file against the
wrong country's register list. The scenario L1's own comment describes ("a contributor copies
`SK.json` to `CZ.json` and forgets `country.code`") is exactly the case where this matters:
the Slovak sources would be checked against Czechia's empty allowlist, or vice versa.

**Fix:** Read `record.country.code` and fall back to the stem only when it is absent, or have
`dispatch` report a defect when the two disagree — one line, and it makes the two entry
points agree about what country a file is.

### WR-12: A corrupted or renamed capture silently downgrades the "belt and braces" defect fixtures to a pass

**File:** `packages/country-data/scripts/verify-sources.ts:164-184,210-259`

**Issue:** `loadEnvelope` returns `null` on any envelope it cannot parse (no `\n\n`, no
`HTTP/x.y NNN` status line), `fixtureFor` propagates the `null`, and `dispatch` turns that
into `mode: 'queued'` — a pass. The eur-lex 202-empty and e-tar 403-interstitial captures are
documented as deliberately registered so that citing those hosts is *"a deterministic offline
FAILURE rather than a 'queued, not exercised' that quietly passes"*. If either file is
corrupted, renamed, or has its blank line normalised away, that property disappears with no
signal. `readFileSync` also throws uncaught if the file is missing, which is a different and
louder failure — so the two failure modes are inconsistent.

**Fix:** Make a registered-but-unloadable fixture a hard error:

```ts
const envelope = loadEnvelope(path);
if (envelope === null) throw new Error(`registered capture ${path} is not a parseable HTTP envelope — this fixture is a gate, not an optimisation`);
```

### WR-13: 45 recorded ambiguities across 10 golden vectors, and `rederive:vectors` exits 0

**File:** `packages/directive-engine/scripts/rederive.ts:276-333`

**Issue:** The live run reports `10 of 10 vectors agree; 45 recorded ambiguities surfaced.`
and returns 0. The script's own header names burying an ambiguity behind a green verdict as
threat T-1-22; surfacing it in stdout is better than nothing, but nothing gates on the count
and no CI job runs this script at all (it is absent from all three workflows). One surfaced
ambiguity is substantive rather than presentational:

> `ambiguity [denominator] Whether the Art. 10(1) five-percent trigger tests the signed gap
> or its magnitude. This vector is the only one in the set where the two readings give
> different OUTCOMES rather than different numbers.`

That decides whether an employer owes a joint pay assessment. Separately, `report()` never
calls `corpusKeyFor` despite its docblock describing the resolution it performs — that check
exists only in `test/rederivation.test.ts:269` — and the `unresolved` filter at line 300 is
tautologically empty for everything `walk()` collected, since `walk` only pushes strings that
already matched `CITATION_KEY_PATTERN`.

**Fix:** Add `rederive:vectors` to a CI job; record a baseline ambiguity count and fail when
it rises; and either perform the corpus resolution in `report()` or delete `corpusKeyFor`'s
claim that the script does it.

## Info

### IN-01: L5's dedupe key can never collide

**File:** `packages/country-data/src/lint.ts:530-537`
`const key = \`${where}::${url}\`` where `where` already contains the file, path and array
index — so it is unique per source and `seen` never suppresses anything. Either key on the
URL alone (per file) or drop the `Set`.

### IN-02: `git show` is invoked without a `--` separator

**File:** `packages/country-data/scripts/validate.ts:76-79`
`execFileSync('git', ['show', \`${baseRef}:${file.repoPath}\`])` — `execFileSync` means no
shell injection, but a `baseRef` beginning with `-` is argv-injected as an option. Not
reachable today (`github.event.pull_request.base.sha`), but `['show', '--', ...]` costs
nothing.

### IN-03: `scopeToSubdivision` depends on attribute order in the publisher's markup

**File:** `packages/country-data/src/verifier.ts:251-262`
`end = xhtml.indexOf('class="eli-subdivision"', attr + 10)` assumes `class` precedes `id` on
the element. If the publisher ever emits `<div id="art_7" class="eli-subdivision">` the
search finds the element's *own* class and the scope collapses to a few characters. The
failure is loud (`anchor_absent` / `SourceDefect`), but the message points a maintainer at a
missing anchor rather than at a markup change. Match the opening tag instead of a bare
attribute offset.

### IN-04: `Art10Flag.threshold: 5` duplicates `ART10_THRESHOLD_PCT`

**File:** `packages/directive-engine/src/types.ts:284,292`
A literal type beside the exported constant; changing one leaves the other. Use
`threshold: typeof ART10_THRESHOLD_PCT`.

### IN-05: `compareVectors` can name the wrong missing answer file

**File:** `packages/directive-engine/scripts/rederive.ts:187-195`
`first === undefined ? 'expected.json missing' : 'rederived.json missing'` — if `expected` is
present but not an object (an array, a JSON scalar), the verdict blames `rederived.json`.

### IN-06: `process.exit(report())` can truncate buffered stdout

**File:** `packages/directive-engine/scripts/rederive.ts:332`
`process.exit` does not wait for asynchronous stdout drains; on a pipe the last lines of a
disagreement report can be lost. Set `process.exitCode` and let the event loop finish, as
`validate.ts` and `verify-sources.ts` already do.

### IN-07: `bucketLifetime` never reads `minExclusive`

**File:** `packages/directive-engine/src/share-url-contract.ts:130-138`
Correctness depends entirely on `SHARE_BUCKETS` being in ascending order, which is asserted
in the test but not by the function. A band inserted out of order silently mis-buckets every
total. An `if (SHARE_BUCKETS is not ascending) throw` at module load, or a `minExclusive`
check in the loop, makes the invariant local.

### IN-08: Workflows pin first-party actions by tag rather than commit SHA

**File:** `.github/workflows/legal-data.yml:63,67`; `nightly.yml:49,51,85,155,170,172,186`
`actions/checkout@v5` is a moving tag. `spine.test.ts` already enforces first-party-only,
which is the larger half; SHA pinning is the cheap remainder for a repository whose CI gates
what a worker cites to their employer.

### IN-09: `textOf` decodes `&amp;` before `&lt;`/`&gt;`/`&quot;`, so entities double-decode

**File:** `packages/country-data/src/verifier.ts:288-297`
Source text containing a literal `&lt;` (published as `&amp;lt;`) becomes `<` rather than
`&lt;`. Harmless on the current OJ corpus, but it is a stored-text mutation on the same path
as CR-05 — `&amp;` must be decoded **last**. The function also silently passes through every
entity it does not know (`&#8220;`, `&#8211;`, `&hellip;`), which would land raw inside a
stored quotation; consider failing loudly on any residual `&#\d+;` rather than storing it.

---

_Reviewed: 2026-09-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
