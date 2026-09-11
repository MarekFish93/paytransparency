---
phase: 01-ground-truth-and-governance
plan: 02
type: execute
wave: 2
depends_on: [01-01-cellar-spine]
files_modified:
  - packages/country-data/src/verifier.ts
  - packages/country-data/src/source-strategy.ts
  - packages/country-data/src/allowlist.ts
  - packages/country-data/data/allowlist.json
  - packages/country-data/test/verifier.test.ts
  - packages/country-data/test/verifier.live.test.ts
  - packages/country-data/test/allowlist.test.ts
  - packages/country-data/test/fixtures/eurlex-frontend-202-empty.txt
  - packages/country-data/test/fixtures/cellar-404-unknown-celex.txt
  - packages/country-data/test/fixtures/cellar-400-bad-language.txt
  - packages/country-data/test/fixtures/cellar-304-revalidated.txt
  - packages/country-data/test/fixtures/slov-lex-spa-shell.html
  - packages/country-data/test/fixtures/legislation-mt-jsonld.html
  - packages/country-data/test/fixtures/e-tar-lt-403-interstitial.html
  - .github/workflows/nightly.yml
autonomous: true
requirements: [LEGAL-09, LEGAL-10]

estimate:
  tokens: 62000
  raw_tokens: 62000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A zero-byte body on a 200 disposes data_defect; a zero-byte body on a 304 disposes revalidated and skips every body check; a body present but below the strategy's byte floor disposes data_defect"
    - "Anchor comparison runs on NFC-normalised text with U+00A0, U+202F and U+2009 folded to U+0020 and whitespace runs collapsed, so an ASCII-spaced anchor matches the authentic non-breaking-space form; the stored body and the stored quotation remain unnormalised"
    - "Each of the seven captured real responses — 202 with an empty body, a Cellar 404, a Cellar 400 on a bad language, a 304, a client-rendered shell, a JSON-LD landing page, and a 403 challenge interstitial — produces its correct disposition with no network access"
    - "A 403 whose body carries a challenge-interstitial signature is classified as an anti-automation gate rather than as a generic client error: it disposes data_defect with a named reason and a message directing the maintainer to manual-attest, because the Lithuanian register behind that interstitial is one of the two launch-country sources the phase has already decided cannot be verified by fetch"
    - "A source whose host is not on that country's allowlist is rejected BEFORE any fetch is attempted, so a hostile source_url in a contributor pull request never becomes an outbound request from a CI runner"
    - "The verifier distinguishes a data defect from a transport failure: DNS failure, timeout and 5xx retry three times with backoff and then dispose source_unreachable; empty-200, missing anchor and 4xx dispose data_defect immediately with no retry"
    - "A source_unreachable disposition blocks the merge under its own distinct status and can be overridden by a named maintainer, with the override recorded in the run output rather than silently applied"
    - "The nightly live job restores the last successful body from an ETag-keyed cache when Cellar is unreachable and emits a warning rather than a failure; a changed ETag emits a review task and never an automatic content update"
  artifacts:
    - path: "packages/country-data/src/source-strategy.ts"
      provides: "The per-source strategy table: which assertions each of the five strategies makes and its byte floor"
      exports: ["strategyFor", "STRATEGY_TABLE", "byteFloorFor"]
    - path: "packages/country-data/src/allowlist.ts"
      provides: "Pre-fetch host guard: per-country allowlist lookup, scheme and shape checks"
      exports: ["isAllowlisted", "assertFetchable", "AllowlistViolation"]
    - path: "packages/country-data/data/allowlist.json"
      provides: "Per-country allowed source hosts plus the all-countries EU institution set"
      contains: "publications.europa.eu"
    - path: "packages/country-data/test/verifier.test.ts"
      provides: "Fixture-driven, offline disposition tests for all seven captured response shapes"
    - path: "packages/country-data/test/fixtures/e-tar-lt-403-interstitial.html"
      provides: "The Lithuanian register's challenge-interstitial 403, captured so the anti-automation branch is proved offline rather than assumed"
    - path: "packages/country-data/test/verifier.live.test.ts"
      provides: "Network-dependent Cellar assertions, excluded from the PR profile and run only nightly"
    - path: ".github/workflows/nightly.yml"
      provides: "The live-source profile plus ETag-keyed caching and drift detection"
  key_links:
    - from: "packages/country-data/src/verifier.ts"
      to: "packages/country-data/src/allowlist.ts"
      via: "verifySource calls assertFetchable before issuing any request"
      pattern: "assertFetchable"
    - from: "packages/country-data/src/verifier.ts"
      to: "packages/country-data/src/source-strategy.ts"
      via: "dispatch on Source.verification through STRATEGY_TABLE, including the no-fetch manual-attest branch"
      pattern: "STRATEGY_TABLE|strategyFor"
    - from: ".github/workflows/nightly.yml"
      to: "packages/country-data/test/verifier.live.test.ts"
      via: "the nightly job is the only place the live suite runs; the PR profile excludes it"
      pattern: "verifier\\.live\\.test\\.ts"
  prohibitions:
    - "MUST NOT include the EUR-Lex web front-end host in any allowlist entry, and MUST NOT accept it as a machine-verifiable source_url — it answers every non-browser request with an accepted-but-empty response, so a verifier pointed at it either stays red forever or gets 'fixed' by weakening the very assertions that protect a worker"
    - "MUST NOT let any source reach a green disposition on evidence the verifier did not read: an accepted-but-empty body, a revalidation with no body, a client-rendered shell, or an anchor matched outside the cited provision's subtree"
    - "MUST NOT issue an outbound request to a host that is not on the allowlist, and MUST NOT follow a redirect to a host that is not on the allowlist — a contributor-supplied URL is untrusted input to a CI runner"
    - "MUST NOT lower a byte floor, broaden an anchor, or delete a strategy's assertion in order to turn a red gate green; a source that defeats automation is recorded manual-attest with a dated human attestation"
---

<objective>
Expand the tracer's single `cellar` verification path into the full per-source strategy table and the
complete failure taxonomy, so the gate is right on every real response shape research reproduced —
and cannot be fixed by weakening.

Purpose: the rule stated in LEGAL-09 and `.claude/CLAUDE.md` (200 plus a non-empty body plus an
expected anchor) fails on good documents and passes on bad ones. Seven failure modes were reproduced
against real endpoints. A gate that goes red for the wrong reason gets disabled within a month, which
is worse than no gate; a gate that goes green for the wrong reason certifies a false legal fact to a
worker.

Output: a five-strategy verification table with `manual-attest` as a first-class state, a pre-fetch
allowlist guard, seven committed fixtures that make the whole gate deterministic and offline, the
data-defect versus transport-failure split with a recorded override, and the nightly live profile
with ETag-keyed caching.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/phases/01-ground-truth-and-governance/01-CONTEXT.md
@.planning/phases/01-ground-truth-and-governance/01-RESEARCH.md
@.planning/phases/01-ground-truth-and-governance/01-VALIDATION.md
@.planning/phases/01-ground-truth-and-governance/01-01-SUMMARY.md
@packages/country-data/src/verifier.ts
@packages/country-data/src/schema.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The pre-fetch allowlist guard — a contributor URL never becomes an unvetted CI request</name>
  <files>packages/country-data/data/allowlist.json, packages/country-data/src/allowlist.ts, packages/country-data/test/allowlist.test.ts</files>
  <read_first>
    - packages/country-data/src/schema.ts — the `Source` shape frozen in plan 01, including the url constraints already applied there
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Governance Gates" point 1 — the per-country allowlist and the eleven probed domains with their observed responses
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "The Verifier" → "The exact failure, reproduced and characterised" — why the EUR-Lex web front end must be excluded rather than retried
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Security Domain" — the SSRF row and its standard control
    - .planning/research/ARCHITECTURE.md § 2 lint table rows L4 and L5
  </read_first>
  <behavior>
    - Test 1: `assertFetchable` throws `AllowlistViolation` for a host absent from the requesting country's list, and the thrown message names both the host and the country
    - Test 2: the all-countries set (`publications.europa.eu`, `curia.europa.eu`, `ec.europa.eu`) is accepted for every one of the 27 country codes
    - Test 3: the EUR-Lex web front-end host is absent from every entry in `allowlist.json`, asserted by reading the parsed JSON and searching all host values — not by grepping source text
    - Test 4: a URL carrying credentials (`user:pass@`), a non-standard port, an IP-literal host, or a `utm_source`/`fbclid` query parameter is rejected even when its host is allowlisted
    - Test 5: `http://` is rejected for every host except `publications.europa.eu`, which is the one canonical content-negotiated resource URI served over http
    - Test 6: a redirect target host is re-checked; an allowlisted host that redirects to a non-allowlisted host is rejected
  </behavior>
  <action>
Write the tests first against the behaviours above, then implement.

`packages/country-data/data/allowlist.json` is the data. Shape: an `all` array of hosts permitted for
every country, and a `byCountry` map keyed by ISO-3166-1 alpha-2. Seed exactly the hosts research
probed, and no others:
 - `all`: `publications.europa.eu`, `curia.europa.eu`, `ec.europa.eu`
 - `PL`: `dziennikustaw.gov.pl`, `isap.sejm.gov.pl`, `bip.brpo.gov.pl`
 - `SK`: `slov-lex.sk`, `snslp.sk`
 - `IT`: `gazzettaufficiale.it`, `normattiva.it`
 - `LT`: `e-tar.lt`, `lygybe.lt`
 - `MT`: `legislation.mt`, `ncpe.gov.mt`
The other 22 countries get an empty `byCountry` array — they are permitted only the `all` set until a
maintainer adds their national register with evidence. An empty list is the honest starting state, not
a gap.

The EUR-Lex web front end is deliberately ABSENT from this file and must stay absent. It answers every
non-browser request with an accepted-but-empty response — including its own homepage, the ELI form and
the PDF form, across three retries with a cookie jar and a browser user agent. That is a standing
anti-automation posture, not an outage, so the retry branch would never succeed and classifying it as
unreachable would be wrong: it is permanently unverifiable by fetch. `publications.europa.eu` is the
substitute and is already in the `all` set. Note this exclusion as a comment in the JSON file's sibling
documentation, not as the excluded host string inside `allowlist.json` itself.
<!-- planner-discipline-allow: eur-lex.europa.eu -->

`packages/country-data/src/allowlist.ts` exports `isAllowlisted(url, countryCode)` returning a boolean,
`assertFetchable(url, countryCode)` throwing a named `AllowlistViolation` carrying `{ host, country, reason }`,
and the `AllowlistViolation` class itself. `assertFetchable` runs BEFORE any request is issued, and is
called again on each redirect hop with the redirect target. Reject, with a distinct `reason` for each:
a host not in `all` nor in `byCountry[code]`; a scheme other than `https:` (with the single documented
`http:` exception for `publications.europa.eu`); a URL whose `username` or `password` is non-empty; a
port other than the scheme default; a host that parses as an IPv4 or IPv6 literal; and any query
parameter whose name starts with `utm_` or equals `fbclid`, `gclid` or `mc_eid`.

Host matching is exact or a single-label subdomain of an allowlisted host — never a suffix match on the
raw string, which would let a lookalike registered domain ending in an allowlisted name through. Compare
the punycode-encoded host, so a homograph host does not match by visual similarity.
  </action>
  <acceptance_criteria>
    - `packages/country-data/data/allowlist.json` parses as JSON and its `all` array contains `publications.europa.eu`
    - A test reads the parsed `allowlist.json`, flattens every host value across `all` and `byCountry`, and asserts none of them contains the substring `eur-lex` — the assertion is made against parsed data, never against source text
    - `assertFetchable('https://www.littler.com/x', 'PL')` throws `AllowlistViolation` with `reason` naming the host as not allowlisted
    - `assertFetchable('https://dziennikustaw.gov.pl/x', 'SK')` throws — a per-country allowlist, not a global one
    - `assertFetchable('http://publications.europa.eu/resource/celex/32023L0970', 'PL')` does not throw
    - `assertFetchable('http://dziennikustaw.gov.pl/x', 'PL')` throws with `reason` naming the scheme
    - `assertFetchable('https://legislation.mt.evil.example/x', 'MT')` throws — suffix lookalikes do not match
    - `byCountry` has exactly 27 keys, and the 22 non-launch entries are empty arrays
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/allowlist.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 6 test cases are reported (a behaviour above was not registered)</fails_when>
  </verify>
  <done>Every source URL is host-checked against its own country's allowlist before any request leaves a CI runner, and the EUR-Lex web front end is provably absent from the data.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The five-strategy table and the complete failure taxonomy, proved offline against seven real captured responses</name>
  <files>packages/country-data/src/source-strategy.ts, packages/country-data/src/verifier.ts, packages/country-data/test/verifier.test.ts, packages/country-data/test/fixtures/eurlex-frontend-202-empty.txt, packages/country-data/test/fixtures/cellar-404-unknown-celex.txt, packages/country-data/test/fixtures/cellar-400-bad-language.txt, packages/country-data/test/fixtures/cellar-304-revalidated.txt, packages/country-data/test/fixtures/slov-lex-spa-shell.html, packages/country-data/test/fixtures/legislation-mt-jsonld.html, packages/country-data/test/fixtures/e-tar-lt-403-interstitial.html</files>
  <read_first>
    - packages/country-data/src/verifier.ts — the `Disposition` union and the nine-step assertion order authored in plan 01, and the not-implemented stubs for the four remaining strategies
    - packages/country-data/src/allowlist.ts — `assertFetchable`, which this task wires in as step zero
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "The Verifier" — the reproduced 202/empty characterisation, the four additional failure modes, the two launch-country source findings, the strategy table, and the numbered assertion order
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Common Pitfalls" 1, 2, 3 and 5 — the NBSP anchor, the recital collision, `res.ok` on a 202, and the lowered byte floor
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-09 — the data-defect versus transport-failure split and the recorded maintainer override
    - .planning/phases/01-ground-truth-and-governance/01-VALIDATION.md — the LEGAL-09 rows and the instruction that these tests are fixture-driven and offline
  </read_first>
  <behavior>
    - Test 1: an accepted-but-empty response (status 202, zero-byte body, `res.ok` true) disposes `data_defect`, and the message states that the source sits behind an anti-automation gate and directs the reader to `manual-attest` or an alternative source
    - Test 2: a Cellar 404 whose body reads `Resource [system 'celex' - id '...'] not found.` disposes `data_defect` with no retry attempted
    - Test 3: a Cellar 400 on an invalid `Accept-Language` disposes `data_defect` — the server does not silently fall back to a default language, so a 400 is a caller defect and not a transport failure
    - Test 4: a 304 with a zero-length body disposes `revalidated` and the body checks never execute
    - Test 5: the 1354-byte client-rendered shell disposes `data_defect` under the `html-anchor` strategy, and the message names the byte floor it failed
    - Test 6: the Malta landing page disposes `verified` under the `jsonld` strategy when its `legislationIdentifier` equals the stored ELI, and `data_defect` when it does not — the operative wording is deliberately NOT asserted, because it is not on that page
    - Test 7: a `manual-attest` source performs no fetch at all, and disposes `attested` only when the parent fact carries a non-null `verified_by` and a `verified_at` inside its freshness window; otherwise `data_defect`
    - Test 8: a simulated DNS failure and a simulated 503 each retry three times with increasing delay and then dispose `source_unreachable`; an empty-200 retries zero times
    - Test 9: the Lithuanian register's 403 challenge interstitial disposes `data_defect` with reason `anti_automation_gate` and a message naming `manual-attest` as the strategy that source needs — NOT the generic 4xx message, because a maintainer reading the generic message would go looking for a broken URL instead of recording an attestation. A 403 whose body carries no interstitial signature still disposes `data_defect` with the generic reason, so the branch is a recognition and not a blanket reclassification of every 403
  </behavior>
  <action>
Capture the seven fixtures first, from the responses research already characterised, so the suite is
deterministic and has no network dependency. Each `.txt` fixture stores the status line, the response
headers and the body exactly as observed, so the test constructs a response object from a real record
rather than from an invented one. Byte sizes to reproduce: the accepted-but-empty response is zero
bytes; the Cellar 404 body is the quoted not-found sentence; the 400 is 205 bytes; the 304 is zero
bytes; the client-rendered shell is 1354 bytes and its first tag is a tag-manager script; the Malta
page is a landing page carrying a schema.org JSON-LD block with `"@type": "Legislation"`,
`"legislationDate": "2026-06-05"` and `"legislationIdentifier": "eli/ln/2026/173"`. The seventh is the
Lithuanian register's 403: capture the status line, the headers and the interstitial body exactly as the
challenge served them, so the recognition test runs against a real record rather than an invented one.
If the live interstitial cannot be re-captured at execution time, record that in the plan summary and
capture the closest response the register actually returns — do not hand-write a plausible body, because
a hand-written signature would make the recognition branch test itself.

`packages/country-data/src/source-strategy.ts` holds `STRATEGY_TABLE` keyed by the five
`SourceVerification` members. Each entry declares `byteFloor`, `requiresFetch`, `scopeRule` and
`assertions`:
 - `cellar` — byte floor 100000; asserts 200 or 304, the `art_N` subtree present, the normalised anchor inside that subtree, the language confirmed from `art_N.tit_1`, and records the `ETag`
 - `html-anchor` — byte floor 20000; asserts 200, body at or above the floor, the normalised anchor present. Used for server-rendered registers such as the Polish and Italian journals
 - `jsonld` — byte floor 5000; asserts 200, an `application/ld+json` block that parses, and `legislationIdentifier` equal to the stored ELI. Does NOT assert operative wording, because the substantive text is not on the landing page
 - `metadata-only` — byte floor 5000; asserts 200 and a title anchor only, and records explicitly on the result that the operative wording was not machine-verified
 - `manual-attest` — `requiresFetch` false. No request is made. Asserts only that the parent fact carries a non-null `verified_by` and a `verified_at` within its freshness window. This is the honest answer for the two launch-country registers that defeat server-side fetching: a client-rendered shell whose statute text never appears in the HTTP response, and a register behind a challenge interstitial returning 403

`byteFloorFor` reads the table; nothing may pass a floor as a literal at a call site, so a future
loosening is a single visible diff in one file.

Extend `verifySource` in `packages/country-data/src/verifier.ts` to the full order, with
`assertFetchable` as step zero:
 0. Allowlist and URL-shape guard; a violation disposes `data_defect` with the allowlist reason and no request is issued
 1. Transport error — DNS failure, timeout, connection reset — retry three times with backoff, then dispose `source_unreachable`
 2. `304` — dispose `revalidated`, record the revalidation, skip every body check
 3. `4xx` — dispose `data_defect`, no retry. One recognised sub-case: a `403` whose body matches a
    challenge-interstitial signature carries reason `anti_automation_gate` and a message naming
    `manual-attest` as the strategy that source needs, so the failure reads as a decision to record an
    attestation rather than as a URL to go and fix. Keep the signature test in one exported predicate
    over the captured fixture, matched on the interstitial markers actually present in it, and leave
    every other `403` on the generic branch. `5xx` — treat as transport, go to step 1
 4. Any status other than 200 after the above — dispose `data_defect`. State explicitly in the message that an accepted-but-empty response is an anti-automation gate and cannot be verified by fetch
 5. Zero content length, or a body below the strategy's byte floor — dispose `data_defect` naming the floor
 6. Normalise for matching only: fold U+00A0, U+202F and U+2009 to a space, normalise curly quotes to ASCII, apply NFC, collapse whitespace runs, trim. Never store the normalised form
 7. Scope to the structural subtree where the strategy defines one
 8. Assert the anchor inside that scope; on absence dispose `data_defect` and include the 200 characters surrounding the scope start in the message
 9. For `cellar`, confirm the language from the article subtitle, because the `Content-Language` response header is empty on a 200

`source_unreachable` is its own disposition and blocks a merge under its own distinct status — it is
not a hard data-defect failure, because a third party's outage must not read as "this legal fact is
wrong". Provide `overrideUnreachable(result, maintainer, reason)` which converts a `source_unreachable`
into a recorded override carrying the maintainer identifier, the reason and a timestamp, and which
throws if either argument is empty. The override is data on the result object, written into the run
output; it may never be applied implicitly by a default parameter.
  </action>
  <acceptance_criteria>
    - All seven fixtures exist and the accepted-but-empty fixture's body section is exactly zero bytes
    - The 403 interstitial fixture disposes `data_defect` with reason `anti_automation_gate` and a message containing the string `manual-attest`, while a 403 carrying a plain body disposes `data_defect` with the generic reason — both asserted, so the branch is a recognition rather than a reclassification of every 403
    - `STRATEGY_TABLE` has exactly five keys matching the five `SourceVerification` members, and `manual-attest` has `requiresFetch: false`
    - The test for the client-rendered shell asserts disposition `data_defect` and asserts the message contains the numeric byte floor `20000`
    - The `manual-attest` test asserts that no fetch function was invoked, using an injected fetch spy whose call count is asserted to be zero
    - The empty-200 test asserts the retry count is zero; the 503 test asserts the retry count is three
    - `overrideUnreachable` throws when called with an empty maintainer identifier or an empty reason
    - `pnpm vitest run packages/country-data/test/verifier.test.ts` runs with no network access available and still passes
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/verifier.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 9 test cases are reported (one of the nine captured behaviours was not registered)</fails_when>
    <automated>pnpm vitest run --dir packages/country-data</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or the reporter output omits `spine.test.ts` (the tracer's end-to-end proof regressed or stopped being collected)</fails_when>
  </verify>
  <done>Every one of the seven real response shapes produces its correct disposition offline, a challenge interstitial is recognised as an anti-automation gate rather than as a broken URL, `manual-attest` is a first-class no-fetch state, and a transport failure is distinguishable from a data defect with a recorded override path.</done>
</task>

<task type="auto">
  <name>Task 3: The nightly live profile, the ETag-keyed cache, and drift as a review task</name>
  <files>.github/workflows/nightly.yml, packages/country-data/test/verifier.live.test.ts</files>
  <read_first>
    - .github/workflows/legal-data.yml — the PR profile authored in plan 01, which this must stay disjoint from
    - vitest.config.ts — the exclusion pattern that keeps the live suite off the PR profile
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "The Verifier" → "Cellar outage mitigation for D-02" — the ETag-keyed cache, the warning-not-failure rule, and the review-task-not-auto-update rule
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-02 — the recorded build-availability concern the planner was told to mitigate without reopening the decision
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Environment Availability" — the observed SPARQL slowness and the instruction to keep SPARQL off the pull-request path
  </read_first>
  <action>
`packages/country-data/test/verifier.live.test.ts` is the only network-touching suite. It asserts that
Cellar answers 200 for CELEX `32023L0970` with `Accept: application/xhtml+xml` and
`Accept-Language: eng`, that the response carries an `ETag` and a `Last-Modified`, that `id="art_7"`
is present, and that a conditional request carrying the stored `ETag` in `If-None-Match` returns 304.
It must be excluded from the default run by the `**/*.live.test.ts` pattern already in
`vitest.config.ts`, so a contributor's pull request never depends on a third party being up.

`.github/workflows/nightly.yml` runs on a schedule and on `workflow_dispatch`, with two jobs:
 - `live-sources` — checkout, corepack enable, `pnpm install --frozen-lockfile`, then run the live
   suite explicitly by path so the config exclusion is bypassed only here. Before the run, restore a
   cache via `actions/cache` whose key includes the stored `ETag` of the Directive expression. When the
   live fetch fails with a transport error, restore the cached body, continue, and emit a WARNING
   annotation naming the cache hit — not a failure. A build must not go dark because the Publications
   Office is down. When the fetch succeeds but returns an `ETag` different from the stored one, do not
   update any stored quotation: open a review task by failing the job with an annotation that names the
   old and new ETag values and the affected citation keys. Auto-updating legal text from a diff nobody
   read is the failure this rule exists to prevent.
 - `directive-drift` — depends on `live-sources`; re-runs the full offline suite against the freshly
   fetched body so a content change surfaces as a test diff rather than as a silent data change.

Do not put the SPARQL discovery query on either the pull-request path or the nightly path. It was
observed timing out at 60 seconds and returning a large cross-product; it is a one-off discovery pull
whose result is committed, and plan 04 owns it.

Record in the plan summary that D-02's build-availability risk is mitigated by cache-on-outage plus
review-on-drift, and that the decision itself — fetch live, keep no committed snapshot — is unchanged.
  </action>
  <acceptance_criteria>
    - `packages/country-data/test/verifier.live.test.ts` is NOT collected by `pnpm vitest run --dir packages/country-data`, proved by the reporter output omitting its filename
    - `.github/workflows/nightly.yml` defines exactly two jobs named `live-sources` and `directive-drift`, and `directive-drift` declares `needs: live-sources`
    - The `live-sources` job contains an `actions/cache` step whose key expression includes an ETag value
    - The workflow contains no SPARQL endpoint reference and no `webapi/rdf/sparql` path
    - A changed-ETag branch exists that fails the job with an annotation; no step in either job writes to `packages/country-data/data/`
    - `.github/workflows/legal-data.yml` still contains no external fetch (the PR profile stayed offline)
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run --dir packages/country-data --reporter=verbose</automated>
    <fails_when>non-zero exit, or the reporter output contains `verifier.live.test.ts` (the live suite leaked into the offline PR profile), or the summary line reports `0 passed`</fails_when>
    <automated>gh workflow run nightly.yml && gh run list --workflow=nightly.yml --limit 1 --json conclusion --jq '.[0].conclusion'</automated>
    <fails_when>prints anything other than `success`, or prints nothing (the workflow did not dispatch, usually because the file is not on the default branch yet)</fails_when>
  </verify>
  <done>The live suite runs only at night, an outage yields a cached warning instead of a red build, and a changed ETag yields a review task instead of an automatic content update.</done>
</task>

</tasks>

<artifacts_this_phase_produces>
## Artifacts this phase produces

See `01-01-cellar-spine-PLAN.md` → "Artifacts this phase produces" for the phase-wide list. This plan
specifically creates: `strategyFor`, `STRATEGY_TABLE`, `byteFloorFor`, `isAllowlisted`,
`assertFetchable`, `AllowlistViolation`, `overrideUnreachable`; the data file
`packages/country-data/data/allowlist.json`; the seven response fixtures under
`packages/country-data/test/fixtures/`; the test files `verifier.test.ts`, `verifier.live.test.ts`,
`allowlist.test.ts`; and the workflow `.github/workflows/nightly.yml` with jobs `live-sources` and
`directive-drift`. None of these symbols or paths exists before this phase.
</artifacts_this_phase_produces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Contributor pull request → CI runner outbound network | A `source_url` authored by an untrusted contributor decides what host a CI runner connects to |
| Remote source response → disposition | Attacker-influenced or degraded bytes decide whether a legal fact is certified |
| Redirect chain | An allowlisted host can redirect to an arbitrary one |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-1-07 | Information disclosure | `verifySource` outbound fetch driven by a contributor-supplied `source_url` | high | mitigate | `assertFetchable` runs as step zero, before any request, and again on every redirect hop. Rejects non-allowlisted hosts, non-https schemes (one documented exception), credentials in the URL, non-default ports, IP-literal hosts and tracking parameters. Host matching is exact or single-label subdomain on the punycode host, never a raw suffix match. |
| T-1-08 | Spoofing | Lookalike or homograph source domain on an allowlisted-looking host | high | mitigate | Punycode-encoded exact/single-label matching; `legislation.mt.evil.example` is an asserted rejection case in `allowlist.test.ts`. |
| T-1-01 | Tampering | Verifier failing open on empty-200, 304, shell HTML, a challenge interstitial or a recital-scoped anchor | high | mitigate | Seven committed real-response fixtures pin every disposition offline; the `manual-attest` strategy records the absence of machine verification rather than faking its presence; byte floors live in one table so a loosening is a single visible diff. |
| T-1-09 | Repudiation | A maintainer silently overriding a `source_unreachable` block | medium | mitigate | `overrideUnreachable` requires a non-empty maintainer identifier and reason, throws otherwise, and writes the override onto the result and into the run output. No implicit default parameter can apply it. |
| T-1-10 | Denial of service | Third-party outage turning every contributor pull request red | medium | mitigate | The PR profile is fully offline and fixture-driven; all network verification is confined to the nightly job, which degrades to an ETag-keyed cache hit with a warning. |
| T-1-SC | Tampering | npm installs | high | mitigate | No new package is installed by this plan; the pinned, audited set from plan 01 is unchanged and the lockfile stays frozen (`--frozen-lockfile` in both workflows). |
</threat_model>

<verification>
- `pnpm vitest run --dir packages/country-data` passes with no network access, and its reporter output does not contain `verifier.live.test.ts`
- `pnpm vitest run packages/country-data/test/verifier.test.ts` reports at least eight cases passing
- `pnpm vitest run packages/country-data/test/allowlist.test.ts` reports at least six cases passing
- `gh run list --workflow=nightly.yml --limit 1 --json conclusion --jq '.[0].conclusion'` prints `success`
- No host value anywhere in `allowlist.json` contains the substring `eur-lex`
</verification>

<success_criteria>
1. All five verification strategies exist, with `manual-attest` performing no fetch and requiring a dated human attestation.
2. All seven reproduced response shapes dispose correctly, offline, on every pull request, and the challenge interstitial is named as an anti-automation gate rather than as a broken URL.
3. No outbound request leaves a CI runner for a host that is not on the requesting country's allowlist.
4. A transport failure blocks under its own status with a recorded, non-defaultable override; a data defect fails hard with no retry.
5. A Cellar outage yields a cached warning; a changed ETag yields a review task, never an automatic content update.
</success_criteria>

<output>
Create `.planning/phases/01-ground-truth-and-governance/01-02-SUMMARY.md` when done.
Record in it: the seven fixture filenames with their observed byte sizes, the interstitial markers the 403 recognition predicate matches on, the five strategy byte floors,
and the exact override call signature so plan 05's governance docs can describe it accurately.
</output>
