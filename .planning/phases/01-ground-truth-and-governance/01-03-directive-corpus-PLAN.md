---
phase: 01-ground-truth-and-governance
plan: 03
type: execute
wave: 2
depends_on: [01-01-cellar-spine]
files_modified:
  - packages/country-data/src/extract.ts
  - packages/country-data/scripts/fetch-directive.ts
  - packages/country-data/data/_directive.json
  - packages/country-data/test/directive-text.test.ts
  - packages/country-data/test/fixtures/cellar-art7-pl.xhtml
  - packages/country-data/test/fixtures/cellar-art3-en.xhtml
  - packages/country-data/test/fixtures/cellar-art12-en.xhtml
autonomous: true
requirements: [LEGAL-07, LEGAL-04]

estimate:
  tokens: 52000
  raw_tokens: 52000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Articles 3, 6, 7, 9, 10 and 12 are each stored in full, with every paragraph tagged by the publisher's own id, in all eleven retrieved language versions — and each stored quotation resolves back to a pinned Cellar expression URI and the ETag it was read from"
    - "A request for a CELEX id that does not exist returns 404 and the fetch throws SourceDefect; an article id absent from the returned document throws rather than storing an empty quotation, so no article is ever stored with empty text"
    - "Stored quotations are the raw UTF-8 bytes Cellar returned, with U+00A0 and U+2019 preserved; equality against a re-fetch is byte equality on the raw form, and equality against a human-typed anchor is on the NFC-normalised, non-breaking-space-folded form"
    - "The citation key is the publisher's own structural id — the CELEX id, a hash, and the paragraph id — and the identical key resolves in every language version, so a Polish letter and an English page cite the same provision without a language-specific mapping table"
    - "Art. 7(4) stores the two-month backstop wording verbatim in every retrieved language; the stored English form is the exact sentence beginning with the reasonable-period phrase and ending at the two-month limit"
    - "The four inherited citation errors are each proved corrected against primary text by an assertion that fails if the error returns: no annual frequency cap on the worker's right, Art. 6 subject matter distinct from Art. 7, the deadline stated as the Directive states it, and no numeric small-group threshold anywhere in the Directive"
    - "Art. 12(3) and Art. 7(2) are stored as separate provisions with separate citation keys, and a test asserts neither quotation is substitutable for the other"
    - "A named regression case proves the recital reference to an article of a different instrument was not captured as this Directive's Article 10 — the collision is asserted to exist in the source document and asserted to be absent from the stored entry, so structural-id extraction is proved to be what separates them rather than assumed to be"
  artifacts:
    - path: "packages/country-data/src/extract.ts"
      provides: "Whole-article extraction with per-paragraph id tagging, scoped to the eli-subdivision subtree"
      exports: ["extractArticle", "listParagraphIds", "citationKey"]
    - path: "packages/country-data/scripts/fetch-directive.ts"
      provides: "The corpus pull: six articles across eleven language versions, resolving and recording one pinned expression URI per language"
      exports: ["fetchExpression", "fetchCorpus", "SERVED_LANGUAGES", "CITED_ARTICLES"]
    - path: "packages/country-data/data/_directive.json"
      provides: "The Directive corpus as Fact records: full articles, tagged paragraphs, per-language pinned URIs and ETags"
      contains: "32023L0970#007.004"
    - path: "packages/country-data/test/directive-text.test.ts"
      provides: "Article coverage, encoding, citation-key language invariance and the four inherited-error regressions"
  key_links:
    - from: "packages/country-data/scripts/fetch-directive.ts"
      to: "packages/country-data/src/extract.ts"
      via: "fetchCorpus calls extractArticle once per (article, language) pair and keys the result by citationKey"
      pattern: "extractArticle|citationKey"
    - from: "packages/country-data/data/_directive.json"
      to: "packages/country-data/src/verifier.ts"
      via: "every stored Source carries verification 'cellar' plus the anchor the verifier asserts inside the art_N subtree"
      pattern: "\"verification\":\\s*\"cellar\""
    - from: "packages/country-data/test/directive-text.test.ts"
      to: "packages/country-data/data/_directive.json"
      via: "the article-coverage case asserts the full six-article by eleven-language matrix is populated"
      pattern: "CITED_ARTICLES|SERVED_LANGUAGES"
  prohibitions:
    - "MUST NOT conflate the Directive's articles with one another: Art. 6 is pay-setting and progression criteria, Art. 7 is the right to information, Art. 7(2) is an unconditional standing right to request through a representative or equality body in every state, and Art. 12(3) is an optional Member State measure conditional on a disclosure identifying an individual worker — none is a restatement of another"
    - "MUST NOT restate as a Directive rule either an annual cap on how often a worker may exercise the right to information, or any numeric small-group threshold — neither appears in the authentic text, and both entered the project through a secondary brief"
    - "MUST NOT locate an article or a paragraph by searching for its title or its wording; use the publisher's structural ids, because the operative phrases also occur in recitals and the article headings carry a non-breaking space that no hand-typed anchor reproduces"
    - "MUST NOT store a quotation that was normalised, translated, re-typed or reflowed — only bytes that came back from the primary source in this run may be stored as a quotation"
---

<objective>
Pull Articles 3, 6, 7, 9, 10 and 12 of Directive (EU) 2023/970 from the Publications Office primary
text in all eleven retrieved language versions, store each article in full with every paragraph tagged
by the publisher's own id, and prove with regression assertions that the four citation errors the
project inherited stay corrected.

Purpose: this is the substrate every worker-facing legal claim rests on. Every Article quotation the
project has held until now arrived via a reader proxy, and the web front end the brief assumed is
usable answers every non-browser request with an accepted-but-empty response. LEGAL-07 exists because
nothing citing a statute may ship until the text has been re-pulled from a primary source and stored
with the data.

Output: `packages/country-data/data/_directive.json` holding the full six-article corpus across eleven
authentic language versions, the generalised extractor, and the regression suite that keeps the four
inherited errors from coming back.
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
@packages/country-data/src/schema.ts
@packages/country-data/scripts/fetch-directive.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Generalise extraction from one paragraph to a whole article with tagged paragraphs</name>
  <files>packages/country-data/src/extract.ts, packages/country-data/test/fixtures/cellar-art3-en.xhtml, packages/country-data/test/fixtures/cellar-art12-en.xhtml, packages/country-data/test/directive-text.test.ts</files>
  <read_first>
    - packages/country-data/scripts/fetch-directive.ts — `extractParagraph` and `normaliseForMatch` as authored in plan 01, which this generalises without changing their contract
    - packages/country-data/test/fixtures/cellar-art7-en.xhtml — the shape of a real captured article subtree
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Structural citation keys" — the id scheme, the paragraph id list for Article 7, and the confirmation that the Polish document carries identical ids
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Art. 3(1) definitions and Art. 9(1) metrics" — the lettered sub-point structure Article 3 uses, which differs from Article 7's numbered paragraphs
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-04 — full article stored, operative sentences tagged by id, and why quotations without retrievable context produced the inherited errors
  </read_first>
  <behavior>
    - Test 1: `extractArticle(xhtml, 7)` returns the whole `art_7` subtree as raw text plus a map of six paragraph ids to their raw texts, and does not bleed into the following article
    - Test 2: `extractArticle(xhtml, 3)` handles lettered sub-points — Article 3's definitions carry sub-lettered items inside a paragraph, and each addressable id is captured without flattening them into one blob
    - Test 3: `extractArticle(xhtml, 12)` returns the full article including paragraph 3, and the returned paragraph 3 text contains the identifiability condition and the three named bodies
    - Test 4: `extractArticle` on an article id absent from the document throws `SourceDefect` naming the missing id; it never returns an empty result
    - Test 5: `listParagraphIds` returns ids in document order, and the order is stable across two calls on the same input
    - Test 6: `citationKey(7, 4)` returns the CELEX-prefixed key with the zero-padded paragraph id, and the same call produces the same key regardless of which language version is being extracted
  </behavior>
  <action>
Capture two more real fixtures alongside the existing Article 7 one: `cellar-art3-en.xhtml` covering
the `art_3` subtree (needed because Article 3's definitions are lettered sub-points, a different
structure from Article 7's numbered paragraphs) and `cellar-art12-en.xhtml` covering the `art_12`
subtree.

Write `packages/country-data/src/extract.ts`:
 - `extractArticle(xhtml, articleNumber)` locates `id="art_N"`, slices forward to the next occurrence of
   `class="eli-subdivision"` to bound the scope, and returns `{ articleId, titleText, rawHtml, rawText, paragraphs }`
   where `paragraphs` is an ordered map from paragraph id to raw text. Scope first, always: the operative
   phrases in this document also occur in recitals tens of thousands of characters earlier, and one
   recital reference is to an article of a different treaty entirely.
 - `listParagraphIds(scopeHtml)` returns the ids matching the three-digit-dot-three-digit form in
   document order.
 - `citationKey(article, paragraph)` returns the CELEX id, a hash character, and the paragraph id
   zero-padded to three-dot-three — the key form frozen in plan 01 and used by `definitionCite` in the
   engine contract. The key is language-invariant because the ids are byte-identical across language
   versions; do not build any language-specific mapping.
 - Title extraction reads `id="art_N.tit_1"`, which is also what the verifier uses to confirm which
   language a response is in, since the `Content-Language` response header comes back empty.
 - Store raw. Reuse `normaliseForMatch` from plan 01 for comparison only. Do not add a second
   normaliser.

Move `extractParagraph` to be a thin wrapper over `extractArticle` so there is exactly one scoping
implementation, and re-export it from `fetch-directive.ts` so plan 01's spine test keeps passing
unchanged.
  </action>
  <acceptance_criteria>
    - `extractArticle(art7Fixture, 7)` returns exactly six paragraph ids, in ascending document order
    - `extractArticle(art7Fixture, 7).rawText` does not contain any text belonging to Article 8
    - `extractArticle(art3Fixture, 3).paragraphs` is non-empty and the definitions text for the category-of-workers sub-point is retrievable as its own addressable unit rather than only as part of a single flattened string
    - `extractArticle(art12Fixture, 12).paragraphs` includes a paragraph whose raw text contains the three body names the identifiability provision routes to
    - `extractArticle(art7Fixture, 99)` throws `SourceDefect` and the thrown message contains `art_99`
    - `citationKey(7, 4)` returns a string ending `#007.004`
    - `pnpm vitest run packages/country-data/test/spine.test.ts` still passes — the plan 01 spine did not regress
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/directive-text.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 6 cases are reported (one of the six extraction behaviours was not registered)</fails_when>
    <automated>pnpm vitest run packages/country-data/test/spine.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed` — the plan 01 tracer regressed when `extractParagraph` was rewired</fails_when>
  </verify>
  <done>Whole articles extract by the publisher's ids with per-paragraph tagging, the language-invariant citation key is produced by one function, and the tracer still passes.</done>
</task>

<task type="auto">
  <name>Task 2: Pull the six-article corpus across eleven authentic language versions and store it with provenance</name>
  <files>packages/country-data/scripts/fetch-directive.ts, packages/country-data/data/_directive.json, packages/country-data/test/fixtures/cellar-art7-pl.xhtml</files>
  <read_first>
    - packages/country-data/src/extract.ts — `extractArticle`, `listParagraphIds`, `citationKey` from task 1
    - packages/country-data/src/schema.ts — the `Fact` and `Source` shapes every corpus entry must satisfy
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Directive Ground Truth" → "Retrieval" — the verified per-locale response sizes, the ISO-639-3 language codes, and the warning that the manifestation sequence segment must be discovered, never computed
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Error taxonomy" — the 400 on an invalid language and the empty `Content-Language` header
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-02 and D-03 — live fetch at build time with no committed source-snapshot artefact, and English plus every served locale
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Freshness windows" — why Directive quotations are the `stable` class and what the Last-Modified date evidences
  </read_first>
  <action>
Extend `packages/country-data/scripts/fetch-directive.ts` into the corpus pull.

Export `CITED_ARTICLES` as the fixed list 3, 6, 7, 9, 10, 12 — the articles the product cites, per
LEGAL-07. Export `SERVED_LANGUAGES` as the eleven ISO-639-3 codes research retrieved successfully:
`eng`, `pol`, `slk`, `ita`, `lit`, `mlt`, `deu`, `nld`, `ces`, `swe`, `dan`. Note in the module that an
authentic-text language is not the same thing as a shipped interface locale: the interface is English
and Polish at launch, but all twenty-four language versions of the Directive are equally authentic in
law, and D-03 chose to hold every served locale so a Polish letter quotes authentic Polish wording
rather than a translation of the English.

`fetchCorpus()` resolves ONE expression per language by content negotiation on the CELEX resource URI
with `Accept: application/xhtml+xml` and `Accept-Language: <iso639-3>`, recording that language's
resolved pinned expression URI, `ETag` and `Last-Modified` once. Then it extracts all six articles from
that single body. Do not issue one request per article. Do not compute a per-language URI from the
language code — the manifestation sequence segment observed for English, Polish and Italian is not
alphabetically related to the language code, so it is a value to discover and record, never to derive.

Writing `packages/country-data/data/_directive.json`: for each (article, language) pair write a `Fact`
whose `value` holds `{ article, language, title, raw_text, paragraphs }` where `paragraphs` maps the
publisher's paragraph id to its raw text, `status: 'verified'`, `volatility: 'stable'`, `verified_by: null`,
`verified_at` set to the run date, and one `Source` with `kind: 'eu_institution'`, `verification: 'cellar'`,
the resolved pinned expression URI, the recorded `etag` and `last_modified`, `accessed_at`, and an
`anchor` chosen per article as a distinctive phrase from that article's own text in that language —
never a phrase that also appears in a recital. Preserve the Article 7(4) entry plan 01 already wrote:
its citation key, anchor and ETag must be unchanged by this run, and a changed value there is a drift
signal, not a routine update.

Store raw bytes. Do not normalise, re-flow, strip the non-breaking spaces, or convert the curly
apostrophe. The authentic text separates an article heading from its number with a non-breaking space
and uses a typographic apostrophe in the possessive; both are part of the quotation.

`_directive.json` is a GENERATED file that is committed so that a change to the corpus appears as a
reviewable diff. It is not a source snapshot: there is no content hash field, no `data/snapshots/`
directory, and the build re-fetches and re-verifies against the live source rather than trusting the
committed copy. That is the shape D-02 chose, and the nightly ETag-keyed cache from plan 02 is what
keeps a Publications Office outage from turning the build dark.

Capture `packages/country-data/test/fixtures/cellar-art7-pl.xhtml` from the Polish expression so the
language-invariance assertions in task 3 run offline.

Wire the `fetch:directive` root script, declared in plan 01, to this entry point.
  </action>
  <acceptance_criteria>
    - `packages/country-data/data/_directive.json` contains exactly 66 Fact entries — six articles times eleven languages — and every one parses against the `Fact` schema
    - Every entry's `value.paragraphs` object is non-empty; no entry has an empty `raw_text`
    - Every entry's `sources[0].url` host is `publications.europa.eu`, and `sources[0].etag` is non-null
    - The eleven distinct pinned expression URIs differ from one another, and each is recorded rather than computed — asserted by checking that the URI for `pol` is not derivable by substituting the language code into the URI for `eng`
    - The Article 7 paragraph id set is identical across all eleven languages, asserted by set equality
    - The English Art. 7(4) raw text contains at least one U+00A0 codepoint and the entry's citation key ends `#007.004`
    - The Art. 7(4) entry written by plan 01 is byte-identical after this run except for `verified_at`
    - `pnpm fetch:directive` re-runs idempotently: a second run changes no field other than `accessed_at` and `verified_at`
  </acceptance_criteria>
  <verify>
    <automated>pnpm fetch:directive</automated>
    <fails_when>non-zero exit, or stderr contains `SourceDefect`, or the script prints a language count other than 11 or an article count other than 6</fails_when>
    <automated>node -e "const d=JSON.parse(require('fs').readFileSync('packages/country-data/data/_directive.json','utf8'));const e=Object.values(d);process.stdout.write(e.length+' '+e.filter(x=>x.value&&x.value.raw_text&&x.value.raw_text.length>0).length)"</automated>
    <fails_when>prints two numbers that are not both `66`, or exits non-zero because the file is absent or is not valid JSON</fails_when>
  </verify>
  <done>All six cited articles exist in full, paragraph-tagged, in eleven authentic language versions, each carrying its own pinned expression URI and ETag.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Regression-lock the four inherited citation errors and the Art. 7(2) versus Art. 12(3) distinction</name>
  <files>packages/country-data/test/directive-text.test.ts</files>
  <read_first>
    - packages/country-data/data/_directive.json — the corpus written in task 2, which these assertions read
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "The four inherited errors" — each error, the authentic text that corrects it, and the negative string search that proved one of them
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Art. 12(3) — verbatim, and a scope correction the roadmap needs" — the full quotation and the distinction from Art. 7(2)
    - .planning/research/PITFALLS.md § "Pitfall 1" — the four corrected citation errors this phase must verify stay corrected
    - .claude/CLAUDE.md § "Article-level accuracy" — the four errors named as binding project constraints
    - .planning/phases/01-ground-truth-and-governance/01-VALIDATION.md — the LEGAL-04 and LEGAL-07 rows and their named test filters
  </read_first>
  <behavior>
    - Test "article coverage": the stored corpus covers every article in `CITED_ARTICLES` for every language in `SERVED_LANGUAGES`, with a non-empty paragraph map for each — the matrix is asserted by set difference so a missing cell names itself
    - Test "no annual frequency cap": the English Article 7 text contains no phrasing imposing a yearly limit on how often a worker may exercise the right, and the Article 7 paragraph that does mention an annual basis is asserted to be an employer duty to inform, identified by its paragraph id rather than by keyword
    - Test "Art. 6 is not Art. 7": the Article 6 title text and the Article 7 title text are different strings, and the Article 6 text contains the pay-setting criteria wording while the Article 7 text does not
    - Test "two-month backstop verbatim": the English Art. 7(4) stored text equals the authentic sentence exactly, byte for byte including the non-breaking spaces, and the Polish Art. 7(4) stored text equals the authentic Polish sentence exactly
    - Test "no numeric small-group threshold": no stored article text in any language contains a numeric identifiability threshold; the identifiability provision is asserted to state a condition and to name three bodies, with no number
    - Test "7(2) and 12(3) are distinct": the two provisions have different citation keys and neither stored text is a substring of the other; a test comment records that one is an unconditional standing right in every state and the other is an optional Member State measure conditional on identifiability
    - Test "Article 10 is not Article 10 TFEU": a naive search of the full English expression for a bare reference to Article 10 returns at least one hit inside a recital, and that recital hit is asserted to be a reference to a different instrument entirely rather than to this Directive's Article 10; the stored Article 10 entry is asserted to have been located by its structural id, and its stored text is asserted NOT to contain the recital's surrounding sentence. This is the named regression case for the collision the research reproduced: the two are indistinguishable by string search and distinguishable only by structural id
    - Test "encoding contract": a re-fetch of the English Article 7 compares byte-equal to the stored raw text, while an ASCII-spaced hand-typed anchor compares equal only after NFC normalisation and non-breaking-space folding
  </behavior>
  <action>
Write the assertions above into `packages/country-data/test/directive-text.test.ts`. Name the coverage
case exactly `article coverage` so the VALIDATION.md filter `-t "article coverage"` selects it.

Two authoring rules make these assertions real rather than decorative.

First, assert against the STORED corpus, not against a fixture, for the four inherited-error cases —
the point is that the data shipped to a worker is correct, not that a captured sample was. Use the
offline fixtures only for the encoding case, which needs a controlled before-and-after pair.

Second, identify provisions by their structural ids, never by searching for their wording. The
employer-duty paragraph in Article 7 is identified by its paragraph id; the deadline paragraph is
identified by its paragraph id. Searching for wording is what produced the errors being regression-
locked: the deadline phrase also occurs in a recital about a different mechanism, and a bare article
reference in a recital points at a different treaty entirely.

Give that second collision its own named case rather than leaving it as prose. Name it exactly
`Article 10 is not Article 10 TFEU`. Build it from the full English expression body rather than from the
stored corpus, because the point is that the collision exists in the document the extractor reads: run
the naive search, assert it finds a recital hit, assert the recital hit is a reference to a different
instrument, then assert the stored Article 10 entry came from the structural id and shares no sentence
with that recital. A case built the other way round — searching the already-extracted corpus — cannot
fail, because the extraction is what removed the collision.

For the byte-equality case, embed the expected English and Polish Art. 7(4) sentences as test
constants taken verbatim from the retrieved corpus — including the non-breaking spaces and the
typographic apostrophe — and compare with strict equality, not with a normalising comparison. A
normalising comparison here would silently accept a re-typed quotation, which is the failure mode
these tests exist to catch.

For the encoding case, assert both directions explicitly: the raw stored form does not equal the
ASCII-spaced hand-typed anchor, and the normalised stored form does. A test that only asserts the
second half would pass against a corpus that had been normalised on write.
  </action>
  <acceptance_criteria>
    - The test named `article coverage` fails with a message naming the missing (article, language) pair when any cell of the six-by-eleven matrix is absent
    - The two-month case compares with strict equality against a constant containing at least one U+00A0, and fails if the stored text is whitespace-normalised
    - The small-group case asserts absence across all 66 stored entries, not only the English ones
    - The distinctness case asserts both that the citation keys differ and that neither stored text contains the other
    - A case named exactly `Article 10 is not Article 10 TFEU` exists, asserts the naive search finds a recital hit referring to a different instrument, and asserts the stored Article 10 text shares no sentence with it; `pnpm vitest run packages/country-data/test/directive-text.test.ts -t "Article 10 is not Article 10 TFEU"` selects exactly one case
    - The encoding case asserts the raw form does NOT match the hand-typed ASCII anchor and the normalised form DOES
    - `pnpm vitest run packages/country-data/test/directive-text.test.ts -t "article coverage"` selects at least one case and reports it passing
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/directive-text.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 14 cases are reported across tasks 1 and 3 (six extraction cases plus eight regression cases)</fails_when>
    <automated>pnpm vitest run packages/country-data/test/directive-text.test.ts -t "article coverage"</automated>
    <fails_when>the summary line reports `0 passed`, or reports `no tests found` — the filter matched nothing, which means the case was renamed and the VALIDATION.md row no longer selects it</fails_when>
  </verify>
  <done>Each of the four inherited citation errors, the conflation of the standing right with the optional identifiability measure, and the recital reference to an article of a different instrument, each fails a named test if it returns.</done>
</task>

</tasks>

<artifacts_this_phase_produces>
## Artifacts this phase produces

See `01-01-cellar-spine-PLAN.md` → "Artifacts this phase produces" for the phase-wide list. This plan
specifically creates: `extractArticle`, `listParagraphIds`, `citationKey`, `fetchCorpus`,
`SERVED_LANGUAGES`, `CITED_ARTICLES`; the populated corpus in `packages/country-data/data/_directive.json`
(66 Fact entries keyed by a CELEX-plus-paragraph-id citation key); the fixtures `cellar-art7-pl.xhtml`,
`cellar-art3-en.xhtml`, `cellar-art12-en.xhtml`; and the test file `directive-text.test.ts` with the
named case `article coverage`. None of these exists before this phase.
</artifacts_this_phase_produces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Cellar XHTML response → extractor → stored quotation | Untrusted remote bytes become the text a worker sends to their employer |
| Human authoring of a test constant | A hand-typed "verbatim" quotation can differ from the authentic text and then certify itself |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-1-11 | Tampering | `extractArticle` scoping in `packages/country-data/src/extract.ts` | high | mitigate | Extraction is bounded to the `eli-subdivision` subtree before any content is read, so a recital occurrence of an operative phrase can never be captured as the provision. Proved by the plan 01 decoy fixture and by identifying every provision in the regression suite by structural id rather than by wording. |
| T-1-12 | Tampering | A re-typed or normalised quotation entering `_directive.json` | high | mitigate | Quotations are stored as the raw bytes returned in the run; the two-month case compares with strict byte equality against a constant containing the authentic non-breaking spaces, so a re-typed quotation fails rather than passing a lenient comparison. |
| T-1-05 | Denial of service | Extractor over a very large remote body | low | mitigate | Extraction is `indexOf` slicing with no DOM, no script execution and no whole-body regex; the 5 MB accepted-body cap from plan 01 applies unchanged. |
| T-1-13 | Spoofing | A substituted response masquerading as the authentic OJ text | medium | accept | The response is recorded with its `ETag`, `Last-Modified` and resolved pinned expression URI, and re-verified nightly with a conditional request; a substituted body surfaces as an ETag drift review task rather than a silent update. Accepted at ASVS L1 for a secret-free, read-only, build-time fetch from an EU institutional source on the allowlist. |
| T-1-SC | Tampering | npm installs | high | mitigate | No package is installed by this plan; the audited, pinned set from plan 01 is unchanged. |
</threat_model>

<verification>
- `pnpm fetch:directive` completes and reports 6 articles across 11 languages
- `packages/country-data/data/_directive.json` holds 66 entries, every one with a non-empty `raw_text` and a non-null `etag`
- `pnpm vitest run packages/country-data/test/directive-text.test.ts` passes with at least 13 cases
- `pnpm vitest run packages/country-data/test/directive-text.test.ts -t "article coverage"` selects and passes
- `pnpm vitest run --dir packages/country-data` passes, with the plan 01 spine test still collected
</verification>

<success_criteria>
1. Articles 3, 6, 7, 9, 10 and 12 are stored in full from primary text, paragraph-tagged by the publisher's own ids, in eleven authentic language versions.
2. Every stored quotation resolves to a pinned expression URI and the ETag it was read from.
3. The citation key is language-invariant, so a Polish letter and an English page cite the same provision with no mapping table.
4. Each of the four inherited citation errors fails a named regression test if it returns.
5. The standing right to request through a representative and the optional identifiability measure are stored and asserted as distinct provisions.
</success_criteria>

<output>
Create `.planning/phases/01-ground-truth-and-governance/01-03-SUMMARY.md` when done.
Record in it: the eleven resolved pinned expression URIs with their ETags, the per-article anchor
strings chosen, and the exact English and Polish Art. 7(4) constants used in the byte-equality test so
plan 05's PR template can quote them as the worked example of a correct citation.
</output>
