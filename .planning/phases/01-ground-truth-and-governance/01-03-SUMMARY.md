---
phase: 01-ground-truth-and-governance
plan: 03
subsystem: legal-data
tags: [directive-2023-970, cellar, eur-lex, eli, provenance, i18n, zod, vitest, extraction]

requires:
  - phase: 01-01-cellar-spine
    provides: "The proven Cellar retrieval path (fetchExpression, SourceDefect, normaliseForMatch, scopeToSubdivision, textOf), the Fact<T> envelope, the vitest harness and the art_7 fixture"
provides:
  - "packages/country-data/src/extract.ts — extractArticle / listParagraphIds / citationKey: whole-article extraction scoped to the eli-subdivision subtree, with per-paragraph and per-sub-point id tagging"
  - "packages/country-data/data/_directive.json — the 66-entry corpus: Articles 3, 6, 7, 9, 10, 12 in eleven authentic language versions, each with its own pinned expression URI, ETag and Last-Modified"
  - "fetchCorpus / SERVED_LANGUAGES / CITED_ARTICLES / BCP47 / corpusKey in scripts/fetch-directive.ts"
  - "DirectiveArticle / DirectiveParagraph / DirectiveSubPoint / CitationKey schemas; DirectiveFile widened to a union"
  - "packages/country-data/test/directive-text.test.ts — 17 cases including the eight named regression locks"
  - "The language-invariant citation key 32023L0970#NNN.NNN, resolvable in every language with no mapping table"
affects: [01-04-country-schema-and-seeding, 01-05-governance-gates, 03-ui, 05-letters, 06-directive-engine]

actuals:
  tokens: 198112
  tasks: 3
  commits: 4
  plan_head_before: 1c9408d1931727ef395800f31ec535f8c279cdf8

tech-stack:
  added: []
  patterns:
    - "Scope-first extraction: locate the publisher's structural id, bound the subtree, then read content — never search for wording"
    - "Machine-derived anchors proved distinctive by a negative search, rather than hand-typed 'verbatim' phrases in languages the author cannot read"
    - "Raw storage with normalisation reserved for comparison, spelled out character-class by character-class because JavaScript's \\s matches U+00A0"
    - "Regression locks proved to bite by injecting the error they guard against, not merely by passing"

key-files:
  created:
    - packages/country-data/src/extract.ts
    - packages/country-data/data/_directive.json
    - packages/country-data/test/directive-text.test.ts
    - packages/country-data/test/fixtures/cellar-art3-en.xhtml
    - packages/country-data/test/fixtures/cellar-art12-en.xhtml
    - packages/country-data/test/fixtures/cellar-art7-pl.xhtml
  modified:
    - packages/country-data/scripts/fetch-directive.ts
    - packages/country-data/src/schema.ts
    - packages/country-data/src/index.ts
    - packages/country-data/test/spine.test.ts

key-decisions:
  - "Anchors are cut from the retrieved bytes and proved to occur exactly once in the document's text, rather than hand-authored — 66 hand-typed phrases across eleven languages would certify themselves"
  - "Corpus entries are keyed 32023L0970#007@eng (article per language) while the language-invariant citation key 32023L0970#007.004 lives on each tagged paragraph — so 66 entries and a resolvable paragraph key coexist"
  - "DirectiveFile widened to a union of the article-shaped and the plan-01 paragraph-shaped Fact, so consumers written against the seed keep parsing"
  - "The cross-language numeric lock is scoped to Article 12 and Art. 12(3), where it holds exactly; the single authentic Lithuanian divergence in Art. 3 is recorded rather than hidden by loosening the rule"
  - "Art. 7(4) moved from a top-level entry to a tagged paragraph inside the English Article 7 entry; citation key, raw bytes, anchor and scope all unchanged"

patterns-established:
  - "dropDanglingTag: a subtree slice that stops at the next element's class attribute leaves a partial opening tag that survives the tag stripper and would be stored as Official Journal text"
  - "Fresh /g regex per call in listParagraphIds — a module-level one carries lastIndex and answers differently the second time"
  - "Sub-points split on the publisher's own label markup, so a document that skips a letter cannot shift every subsequent key by one"

requirements-completed: [LEGAL-07]

coverage:
  - id: D1
    description: "Articles 3, 6, 7, 9, 10 and 12 stored in full with every paragraph tagged by the publisher's own id, in eleven authentic language versions"
    requirement: LEGAL-07
    verification:
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#article coverage"
        status: pass
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#holds the Article 7 paragraph-id set identically in all eleven languages"
        status: pass
      - kind: other
        ref: "pnpm fetch:directive — reports 6 articles, 11 languages, 66 entries, 11 distinct pinned URIs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every stored quotation resolves to a pinned expression URI and the ETag it was read from, on the publisher's own host"
    requirement: LEGAL-07
    verification:
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#article coverage"
        status: pass
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#records eleven DISTINCT pinned expression URIs, none derivable from another"
        status: pass
    human_judgment: false
  - id: D3
    description: "Whole-article extraction by structural id with per-paragraph and per-sub-point tagging, throwing rather than storing an empty quotation"
    verification:
      - kind: unit
        ref: "packages/country-data/test/directive-text.test.ts#returns the whole art_7 subtree with its six paragraphs, and does not bleed into Article 8"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/directive-text.test.ts#captures Article 3's lettered sub-points as addressable units, not one flattened blob"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/directive-text.test.ts#throws SourceDefect naming the missing id rather than returning an empty result"
        status: pass
    human_judgment: false
  - id: D4
    description: "The four inherited citation errors each fail a named regression test if they return"
    requirement: LEGAL-04
    verification:
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#no annual frequency cap"
        status: pass
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#Art. 6 is not Art. 7"
        status: pass
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#two-month backstop verbatim"
        status: pass
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#no numeric small-group threshold"
        status: pass
      - kind: other
        ref: "mutation harness — each inherited error injected into the corpus in turn; all four named cases went red on their own mutation and green on restore"
        status: pass
    human_judgment: false
  - id: D5
    description: "The standing right (Art. 7(2)) and the optional identifiability measure (Art. 12(3)) are stored and asserted as distinct provisions"
    requirement: LEGAL-04
    verification:
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#7(2) and 12(3) are distinct"
        status: pass
    human_judgment: false
  - id: D6
    description: "The recital reference to an article of a different instrument is proved not to have been captured as this Directive's Article 10"
    verification:
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#Article 10 is not Article 10 TFEU"
        status: pass
    human_judgment: false
  - id: D7
    description: "Stored quotations are the raw bytes Cellar returned — byte-equal on re-extraction, unequal to a hand-typed ASCII anchor, equal only after normalisation"
    requirement: LEGAL-04
    verification:
      - kind: integration
        ref: "packages/country-data/test/directive-text.test.ts#re-extraction is byte-equal to storage, while a hand-typed ASCII anchor is not"
        status: pass
    human_judgment: false
  - id: D8
    description: "The stored Polish and Slovak, Italian, Lithuanian, Maltese, German, Dutch, Czech, Swedish and Danish quotations are authentic wording a native speaker would recognise as the Official Journal text of their language"
    verification: []
    human_judgment: true
    rationale: "Provenance is machine-proved (pinned URI, ETag, byte equality, art_N.tit_1 language confirmation) but no automated check can confirm that the text READS correctly to a native speaker. CLAUDE.md requires a native-speaker review as a HITL step per language; this corpus is the artefact that review will read."

duration: 22min
completed: 2026-09-11
status: complete
---

# Phase 01 Plan 03: Directive Corpus Summary

**Articles 3, 6, 7, 9, 10 and 12 of Directive (EU) 2023/970 re-pulled from Publications Office primary text into a 66-entry corpus across eleven authentic language versions, paragraph-tagged by the publisher's own ELI ids, with eight named regression locks proved to bite by injecting each inherited citation error.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-11T13:33:00Z
- **Completed:** 2026-09-11T13:55:00Z
- **Tasks:** 3
- **Files modified:** 10 (6 created, 4 modified)

## Accomplishments

- **The corpus exists.** 66 `Fact` entries — six cited articles times eleven authentic language versions — each holding the whole article raw, every paragraph tagged by the publisher's own id (`007.004`), and Article 3's and Article 9's lettered sub-points addressable on their own (`32023L0970#003.001(h)`).
- **Every entry is traceable to bytes.** Each carries its language's own pinned expression URI, ETag and `Last-Modified`. All eleven URIs are distinct and were *discovered* by content negotiation, never computed — the manifestation sequence segment is `.0006.` for English and `.0018.` for Polish, which is not alphabetically related to the language code.
- **All 66 stored sources verify end to end.** Run against a live re-fetch, every one disposes `verified`, including the `art_N.tit_1` language confirmation that exists because the Cellar 200 carries an empty `Content-Language` header.
- **The citation key is language-invariant and proved so.** `32023L0970#007.004` resolves against the Polish expression and the English one; the Article 7 paragraph-id set is identical across all eleven languages, asserted by set equality.
- **The four inherited errors are locked, and the locks were shown to bite.** Each error was injected into the corpus in turn and the matching named case required to fail. All eight went red on their own mutation and green again on restore.
- **The extractor is one implementation, not two.** `extractParagraph` became a thin wrapper over `extractArticle`, so the package holds a single scoping rule; plan 01-01's spine test still passes.

## Task Commits

1. **Task 1: Generalise extraction to a whole article with tagged paragraphs** — `876e1ed` (test, RED) → `c65bb98` (feat, GREEN)
2. **Task 2: Pull the six-article corpus across eleven languages** — `0a74cd4` (feat)
3. **Task 3: Regression-lock the four inherited citation errors** — `da8feab` (test)

## Provenance — the eleven pinned expression URIs

Recorded so a later drift review has something to diff against. All under CELEX `32023L0970`, resource `cellar/5bbb9daf-f470-11ed-a05c-01aa75ed71a1`.

| lang (ISO-639-3) | manifestation segment | ETag | Last-Modified |
|---|---|---|---|
| `eng` | `.0006.03/DOC_1` | `"Con-20231213063525000"` | Wed, 13 Dec 2023 05:35:25 GMT |
| `pol` | `.0018.03/DOC_1` | `"Con-20241016035353000"` | Wed, 16 Oct 2024 01:53:53 GMT |
| `slk` | `.0021.03/DOC_1` | `"Con-20241016035352000"` | Wed, 16 Oct 2024 01:53:52 GMT |
| `ita` | `.0013.03/DOC_1` | `"Con-20241016035352000"` | Wed, 16 Oct 2024 01:53:52 GMT |
| `lit` | `.0015.03/DOC_1` | `"Con-20241016035352000"` | Wed, 16 Oct 2024 01:53:52 GMT |
| `mlt` | `.0016.03/DOC_1` | `"Con-20241016035353000"` | Wed, 16 Oct 2024 01:53:53 GMT |
| `deu` | `.0004.03/DOC_1` | `"Con-20241016035352000"` | Wed, 16 Oct 2024 01:53:52 GMT |
| `nld` | `.0017.03/DOC_1` | `"Con-20241016035352000"` | Wed, 16 Oct 2024 01:53:52 GMT |
| `ces` | `.0002.03/DOC_1` | `"Con-20241016035352000"` | Wed, 16 Oct 2024 01:53:52 GMT |
| `swe` | `.0024.03/DOC_1` | `"Con-20241016035352000"` | Wed, 16 Oct 2024 01:53:52 GMT |
| `dan` | `.0003.03/DOC_1` | `"Con-20241016035351000"` | Wed, 16 Oct 2024 01:53:51 GMT |

Full form: `http://publications.europa.eu/resource/cellar/5bbb9daf-f470-11ed-a05c-01aa75ed71a1{segment}`.

**The English ETag is unchanged from plan 01-01** (`"Con-20231213063525000"`, 13 Dec 2023). The other ten carry a later consolidation date (16 Oct 2024) — this is the Publications Office's own per-manifestation revision, not drift introduced here. The English body re-fetched **byte-identical** to the fixture plan 01-01 committed, verified before either new fixture was written.

## Per-article anchors chosen

Anchors are **cut from the retrieved bytes** and each is proved to occur **exactly once** in that document's text before being stored. The English and Polish are reproduced below; the other nine were derived by the same deterministic rule from their own authentic text.

| article | anchor (`eng`) | anchor (`pol`) |
|---|---|---|
| 3 | `For the purposes of this Directive, the following definitions apply: (a) 'pay'` | `Do celów niniejszej dyrektywy stosuje się następujące definicje: a)` |
| 6 | `Employers shall make easily accessible to their workers the criteria that are` | `Pracodawcy zapewniają swoim pracownikom łatwy dostęp do kryteriów, które są` |
| 7 | `Workers shall have the right to request and receive in writing, in accordance` | `Pracownicy mają prawo do występowania o informacje oraz do otrzymywania na` |
| 9 | `Member States shall ensure that employers provide the following information` | `Państwa członkowskie zapewniają, aby pracodawcy dostarczali następujące` |
| 10 | `Member States shall take appropriate measures to ensure that employers who are` | `Państwa członkowskie podejmują odpowiednie środki w celu zapewnienia, aby` |
| 12 | `To the extent that any information provided pursuant to measures taken under` | `W zakresie, w jakim informacje przekazane zgodnie ze środkami podjętymi na` |

## The Art. 7(4) byte-equality constants

For plan 05's PR template, as the worked example of a correct citation. These are the exact strings compared with **strict** equality in `directive-text.test.ts`. ` ` is a no-break space — authentic Official Journal typography, not noise.

**English** (4 × U+00A0, 185 characters):

```
4.   Employers shall provide the information referred to in paragraph 1 within a reasonable period of time but in any event within two months from the date on which the request is made.
```

**Polish** (11 × U+00A0, 166 characters):

```
4.   Pracodawcy udostępniają informacje, o których mowa w ust. 1, w rozsądnym terminie, a w każdym razie w ciągu dwóch miesięcy od dnia zwrócenia się o te informacje.
```

The comparison is deliberately **not** normalising. A normalising comparison here accepts a re-typed quotation, which is exactly the failure the case exists to catch (threat T-1-12). The companion assertion proves both directions: the raw stored form does **not** equal the hand-typed ASCII-spaced sentence, and the normalised form does.

## The regression locks, and the evidence they bite

A suite written against data that is already correct cannot demonstrate a red phase by existing. So each error was **injected into the corpus** and the case that guards it required to fail:

| named case | error injected | result |
|---|---|---|
| `no annual frequency cap` | "once a year" spliced into Art. 7(1) | **red** |
| `Art. 6 is not Art. 7` | Art. 7's title copied onto Art. 6 | **red** |
| `two-month backstop verbatim` | U+00A0 folded to ASCII in EN 007.004 | **red** |
| `no numeric small-group threshold` | "in a group of fewer than 6 workers" spliced into Art. 12(3) | **red** |
| `Article 10 is not Article 10 TFEU` | recital 25's TFEU sentence stored as Article 10 | **red** |
| `7(2) and 12(3) are distinct` | Art. 7(2) overwritten with Art. 12(3) in all 11 languages | **red** |
| `article coverage` | `32023L0970#009@lit` deleted | **red** |
| `encoding contract` | whole corpus normalised on write | **red** |

The corpus was restored **byte-identical** afterwards (verified).

### How each of the four is locked

1. **No annual frequency cap.** No cap phrasing occurs in Article 7 in English. The paragraph that *does* mention an annual basis is reached by its id `007.003`, never by keyword, and is asserted to be the **employer's** duty to inform. Across all eleven languages Article 7 carries no integer beyond `1..7` — its own paragraph numbers and internal cross-references — so a "12 months" rendered numerically in any translation breaks it.
2. **Art. 6 is not Art. 7.** Titles differ in all eleven languages. Article 6 carries the pay-setting-and-progression criteria wording and Article 7 does not; Article 7 carries the individual-and-average-pay-level wording and Article 6 does not.
3. **The two-month backstop.** Strict byte equality in EN and PL against the constants above.
4. **No numeric small-group threshold.** Art. 12(3) is reached by structural id, is asserted to state a *condition* and to name *three bodies*, and contains no spelled-out group size. Across all eleven languages its integer set is exactly `{3, 7, 9, 10, 29}` — paragraph number plus article cross-references. A six-person threshold in any language, in any script, adds an integer and fails.

## Files Created/Modified

- `packages/country-data/src/extract.ts` — **created.** `extractArticle`, `listParagraphIds`, `citationKey`, and `extractParagraph` as a thin wrapper so the package holds one scoping implementation.
- `packages/country-data/data/_directive.json` — **regenerated.** 474 KB, 66 entries. Committed so a change to the authentic text arrives as a reviewable diff (D-02: generated-and-committed, *not* a source snapshot — no content hash, no `data/snapshots/`).
- `packages/country-data/scripts/fetch-directive.ts` — **extended.** `CITED_ARTICLES`, `SERVED_LANGUAGES`, `BCP47`, `corpusKey`, `chooseAnchor`, `fetchCorpus`.
- `packages/country-data/src/schema.ts` — **extended.** `CitationKey`, `DirectiveSubPoint`, `DirectiveParagraph`, `DirectiveArticle`, `DirectiveArticleFact`; `DirectiveFile` widened to a union.
- `packages/country-data/src/index.ts` — **extended.** Re-exports the extractor.
- `packages/country-data/test/directive-text.test.ts` — **created.** 17 cases.
- `packages/country-data/test/spine.test.ts` — **adapted.** Follows Art. 7(4) to its new home; its decoy block now cites the deadline wording explicitly.
- `packages/country-data/test/fixtures/cellar-art3-en.xhtml`, `cellar-art12-en.xhtml` — **created.** Article subtrees sliced from a live pull and proved byte-identical to the same slice of plan 01-01's committed fixture.
- `packages/country-data/test/fixtures/cellar-art7-pl.xhtml` — **created.** The Polish expression, written from the same body the corpus was built from.

All new fixtures are covered by the existing `.gitattributes` rules (`*.xhtml -text` and `packages/country-data/test/fixtures/** -text`), so no line-ending translation can rewrite a retrieved Official Journal document.

## Decisions Made

- **Anchors are machine-derived, not hand-authored.** Sixty-six "verbatim" phrases in languages the author does not read would certify themselves — the precise failure this corpus exists to prevent. Each anchor is cut from the retrieved bytes and proved to occur exactly once in that document's text, so it cannot match a recital.
- **Entry key `32023L0970#007@eng`, paragraph key `32023L0970#007.004`.** The plan required *both* exactly 66 entries (6 × 11) *and* a resolvable `#007.004` citation key. Article-per-language entries carrying paragraph-level citation keys satisfy both, and keep the citation key language-invariant where it belongs — on the provision, not on the language.
- **`DirectiveFile` widened to a union rather than replaced.** Four plans are running in this wave against the seeded paragraph shape; a union keeps them all parsing instead of turning a schema widening into a coordinated breaking change.
- **The cross-language numeric lock is scoped to where it actually holds.** Article-level integer-set invariance holds for Articles 6, 7, 9, 10 and 12 in all eleven languages. It does *not* hold for Article 3 in Lithuanian, where the median-pay-level definition is rendered "po 50 procentų" (50 per cent) against the English "half of the workers". That single authentic divergence is asserted *explicitly* in the test rather than the rule being loosened to hide it — a loosened rule would also hide an inserted threshold.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The anchor uniqueness check searched the tagged markup, not the document's text**

- **Found during:** Task 2 (corpus pull)
- **Issue:** `chooseAnchor` measured "occurs exactly once" against `normaliseForMatch(wholeDocument)` — the raw XHTML, tags included. The verifier measures its anchor against `normaliseForMatch(textOf(subtree))`, tags stripped. Two different instruments. The consequence was visible: every candidate drawn from Article 3(1) reported zero occurrences in a document that plainly contains them, because the definitions span `<table>` markup, and the anchor silently fell through to a later paragraph. Worse in principle than the wrong anchor: the uniqueness claim was a claim about the markup, while the property that matters is about the text.
- **Fix:** Compute the haystack and the scope as `normaliseForMatch(textOf(...))`, matching the verifier exactly.
- **Files modified:** `packages/country-data/scripts/fetch-directive.ts`
- **Verification:** Every article's anchor now comes from its own first paragraph and is proved unique on the same instrument the verifier uses; all 66 stored sources dispose `verified` against a live re-fetch.
- **Committed in:** `0a74cd4`

**2. [Rule 3 - Blocking] The plan's 66-entry corpus and plan 01-01's "exactly one entry" spine assertion were mutually exclusive**

- **Found during:** Task 2
- **Issue:** The plan requires `_directive.json` to hold exactly 66 article-shaped entries and simultaneously requires `spine.test.ts` to keep passing. That test asserts `Object.keys(parsed)).toEqual([CITATION_KEY])` — exactly one paragraph-shaped entry — and `DirectiveFile` only admitted the paragraph shape. Both could not be true.
- **Fix:** Added `DirectiveArticle` / `DirectiveParagraph` / `DirectiveSubPoint` to `schema.ts` (which already carried the note "Plan 01-03 adds the rest") and widened `DirectiveFile` to a union. Adapted the three spine assertions that pinned the old file layout so they follow Art. 7(4) to its new home as a tagged paragraph — citation key, raw bytes, anchor and scope all unchanged, only its position in the file moved.
- **Files modified:** `packages/country-data/src/schema.ts`, `packages/country-data/test/spine.test.ts`
- **Verification:** `tsc -b` clean; all 48 cases across both files pass; the seeded key `32023L0970#007.004` still resolves and is asserted to.
- **Committed in:** `0a74cd4`

**3. [Rule 1 - Bug] The spine's decoy test stopped biting once it cited the corpus anchor**

- **Found during:** Task 2
- **Issue:** After `storedSource()` began returning the corpus source, the "gate bites" block went **green on the decoy** — a false pass on the suite's most important assertion. The corpus anchor for Article 7 is cut from Art. 7(1), and the decoy fixture leaves Art. 7(1) untouched: it removes the operative wording from Art. 7(4) only. An article-level anchor proves the *article* is present; it cannot prove every paragraph inside it is intact.
- **Fix:** The decoy block now cites the same live, allowlisted, above-floor source for the deadline wording it was built to defeat. Paragraph-level integrity across the corpus is asserted separately, by byte equality, in `directive-text.test.ts`.
- **Files modified:** `packages/country-data/test/spine.test.ts`
- **Verification:** All four decoy cases dispose `data_defect` again; the case that quotes the decoy's own markup back to the reviewer passes.
- **Committed in:** `0a74cd4`

**4. [Rule 1 - Bug] `scopeToSubdivision` leaves a dangling partial tag in the slice**

- **Found during:** Task 1
- **Issue:** The scope ends at the *attribute* `class="eli-subdivision"` of the next element, a few characters past its opening `<`. The surviving `<div` fragment has no closing `>`, so the tag stripper cannot remove it and it would be stored as though it were Official Journal text — the same class of defect as slicing from the `id="…"` attribute rather than the opening bracket, which plan 01-01 already corrected once.
- **Fix:** `dropDanglingTag` in `extract.ts`, applied to every scoped slice before any text is read. Handled locally rather than in `verifier.ts`, because plan 01-02 owns that file in this wave and the fragment is harmless to anchor matching (see *Deferred* below).
- **Files modified:** `packages/country-data/src/extract.ts`
- **Verification:** `expect(art7.rawHtml).not.toMatch(/<[^>]*$/)` in the extraction suite.
- **Committed in:** `c65bb98`

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking). **Impact on plan:** all four were necessary for correctness; two of them (1 and 3) were silent-correctness failures that reported green, which is the failure class this phase exists to eliminate. No scope creep — no new dependency, no new surface.

## Issues Encountered

- **TDD's red phase does not exist for a data-regression suite.** Task 3's assertions describe properties of data that Task 2 had already made correct, so there was no honest module-not-found red to record. Rather than manufacture one, each inherited error was injected into the corpus and the guarding case required to fail. That is stronger evidence than a red phase would have been: it proves the locks catch the specific error, not merely that they run.
- **The `latin-ext` assumption held.** All eleven language versions round-tripped through UTF-8, `textOf` and strict byte comparison with no mojibake — including Lithuanian `ą č ę ė į š ų ū ž`, Maltese, Czech `ř ů ě` and Danish `å æ ø`.

## Deferred

Recorded rather than fixed, because the file belongs to a sibling plan running in the same wave:

- **`scopeToSubdivision` in `src/verifier.ts` returns a slice ending in a partial `<div` fragment.** Harmless where it is used today — `verifySource` only searches the slice for an anchor, and a four-character tag fragment cannot create a false match. `extract.ts` compensates locally with `dropDanglingTag`. The tidy fix is one `lastIndexOf('<', end)` in `scopeToSubdivision`, but `verifier.ts` is plan 01-02's lane this wave. Worth folding in when that plan next touches the function.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data path was introduced. Every one of the 66 entries carries real retrieved text, a real pinned URI and a real ETag; `verified_by` is `null` by design (D-06: machine retrieval is not a human eyeballing the source), which the schema models explicitly rather than as an absence.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or trust-boundary schema change beyond what the plan's threat register already covers. Extraction remains `indexOf` slicing with no DOM, no `eval` and no whole-body regex (T-1-05), and no package was installed (T-1-SC).

## User Setup Required

None — no external service configuration required. The corpus is pulled from a public, unauthenticated Publications Office endpoint at build time.

## Verification Evidence

| plan verification item | result |
|---|---|
| `pnpm fetch:directive` reports 6 articles across 11 languages | **pass** — `articles: 6`, `languages: 11`, `entries: 66`, `distinct pinned URIs: 11` |
| 66 entries, every one with non-empty `raw_text` and non-null `etag` | **pass** — the plan's own `node -e` check prints `66 66` |
| `directive-text.test.ts` passes with at least 13 cases | **pass** — 17 cases |
| `-t "article coverage"` selects and passes | **pass** — `1 passed \| 16 skipped` |
| `-t "Article 10 is not Article 10 TFEU"` selects exactly one case | **pass** — `1 passed \| 16 skipped` |
| `pnpm vitest run --dir packages/country-data` passes with the spine still collected | **pass** — 2 files, 48 tests |
| `tsc -b` | **pass** — clean |
| idempotency: a second `pnpm fetch:directive` changes nothing | **pass** — byte-identical output across two consecutive runs |
| all 66 stored sources verify against a live re-fetch | **pass** — 66/66 dispose `verified` |

## Self-Check: PASSED

All files listed under `key-files.created` exist on disk; all four task commits resolve in `git log`.

## Next Phase Readiness

- **Ready for 01-04.** `32023L0970#007.004` resolves for the `directive_fallback` assertions, and the full 66-entry corpus is present for 01-05's `fallback keys resolve` case — which VALIDATION.md anticipated would only be assertable as a shape in wave 2.
- **Ready for 01-05.** The Art. 7(4) constants above are the worked example the PR template can quote.
- **Ready for 01-06 / Phase 6.** Art. 3(1)(c)–(h) definitions and Art. 9(1)(a)–(g) metrics are stored as individually addressable sub-points — the ENG-06 substrate.
- **LEGAL-04 is not yet marked complete**, and correctly so: plans 01-01, 01-03 and 01-04 all declare it, and 01-04 is still running. Its Article-7(4)-wording half is discharged here and asserted by `two-month backstop verbatim`; its "each country record states the deadline" half belongs to 01-04. The shared-ID gate will release it when the last declaring plan finishes.
- **One open HITL item:** a native-speaker review per language (coverage entry D8). Provenance is machine-proved; readability to a native speaker is not machine-checkable, and CLAUDE.md requires that review before the letters ship.

---
*Phase: 01-ground-truth-and-governance*
*Completed: 2026-09-11*
