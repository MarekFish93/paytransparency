---
phase: 01-ground-truth-and-governance
plan: 04
subsystem: legal-data
tags: [zod, json-schema, sparql, nim-register, provenance, freshness, art-12-3, transposition]

requires:
  - "01-01: the frozen Fact<T> / Source / FactStatus / SourceVerification primitives and the volatility-class freshness core"
provides:
  - "The full country record schema: transposition, Art. 7 block, the Art. 12(3) condition, the Art. 7(2) standing right, equality bodies as an array, discovery hints"
  - "Four structural invariants a wrong statute cannot get past: launch-country verified_by (D-06), Art. 12(3) as a condition not a boolean, draft-means-the-source-said-draft, and the D-07 Directive-fallback citation rule"
  - "resolve(): a total, ordered precedence over four provenances, with a computed `deviates` and a loud failure on a missing citation key"
  - "DIRECTIVE_FALLBACK_KEYS — the single enumerable table plan 01-05's referential pass reads"
  - "country.schema.json, emitted and committed, so a lawyer contributor gets inline validation with no toolchain install"
  - "27 seeded country records with a real, sourced transposition status and every legally-operative field honestly pending"
  - "Five launch-country drafts in proposed/, each naming its per-source verification strategy, none verified"
  - "D-10 in code: degradationFor, freshnessGate and assertNoUnchangedBump"
  - "LEGAL-05, LEGAL-08 and LTR-16 reworded to match the authentic Art. 12(3) text and decision D-10"
  - "Evidence closing the research's Slovakia 21-versus-33 discrepancy, and a correction to the register query the research got wrong"
affects: [01-05, 02, 03, 05, 06, 07]

actuals:
  tokens: 157159
  hand_authored_tokens: 35956
  tasks: 3
  commits: 8
plan_head_before: 1c9408d1931727ef395800f31ec535f8c279cdf8

tech-stack:
  added: []
  patterns:
    - "Record-level superRefine as the promotion boundary: an agent cannot make the site more confident"
    - "Assert the citation-key SHAPE at parse time; assert that it RESOLVES in a later, whole-dataset pass"
    - "Pipe a permissive guard in front of a union so a modelling error gets an explanatory message, not a type mismatch"
    - "Seed scripts write discovery hints, never facts; the register is an index, not an answer"
    - "Order-stable deduplication so a re-run is byte-identical and only a real change shows in a diff"
    - "Scope the hard gate; degrade everything else"

key-files:
  created:
    - packages/country-data/src/country.ts
    - packages/country-data/src/resolve.ts
    - packages/country-data/scripts/seed-from-nim.ts
    - packages/country-data/scripts/emit-json-schema.ts
    - packages/country-data/country.schema.json
    - packages/country-data/test/schema.test.ts
    - packages/country-data/test/resolve.test.ts
    - packages/country-data/test/coverage.test.ts
    - packages/country-data/test/freshness.test.ts
    - packages/country-data/data/AT.json
    - packages/country-data/data/BE.json
    - packages/country-data/data/BG.json
    - packages/country-data/data/HR.json
    - packages/country-data/data/CY.json
    - packages/country-data/data/CZ.json
    - packages/country-data/data/DK.json
    - packages/country-data/data/EE.json
    - packages/country-data/data/FI.json
    - packages/country-data/data/FR.json
    - packages/country-data/data/DE.json
    - packages/country-data/data/GR.json
    - packages/country-data/data/HU.json
    - packages/country-data/data/IE.json
    - packages/country-data/data/IT.json
    - packages/country-data/data/LV.json
    - packages/country-data/data/LT.json
    - packages/country-data/data/LU.json
    - packages/country-data/data/MT.json
    - packages/country-data/data/NL.json
    - packages/country-data/data/PL.json
    - packages/country-data/data/PT.json
    - packages/country-data/data/RO.json
    - packages/country-data/data/SK.json
    - packages/country-data/data/SI.json
    - packages/country-data/data/ES.json
    - packages/country-data/data/SE.json
    - packages/country-data/proposed/PL.json
    - packages/country-data/proposed/SK.json
    - packages/country-data/proposed/IT.json
    - packages/country-data/proposed/LT.json
    - packages/country-data/proposed/MT.json
  modified:
    - packages/country-data/src/freshness.ts
    - packages/country-data/src/index.ts
    - .planning/REQUIREMENTS.md
    - .planning/WINDOWS.md

key-decisions:
  - "The NIM query must filter ?celex to this Directive's own id space (72023L0970…). The research's deduplication advice does not work without it: a national act is notified for many directives and carries a CELEX id for each — one Czech act carried 154 — so the unfiltered result is 1,832 rows that (celex, title) does not collapse at all"
  - "A state with notified measures gets transposition.status.value = 'unknown', not 'in_force'. The register records THAT measures were notified, not what they say; the measures themselves are in discovery_hints"
  - "transposition.draft_asserting_sources replaces the planned says_draft flag on Source. Source is frozen by plan 01-01, and a Fact's sources array strips any added key, so the flag could not live there"
  - "Nothing in proposed/ is verified, including the transposition status the register does support. A single unqualified rule beats one with a carve-out a contributor would widen"
  - "DIRECTIVE_FALLBACK_KEYS deliberately omits article_12_3 and enforcement.equality_body: the Directive says the Art. 12(3) option exists, not that a state took it, and Art. 3(1)(l) defines what an equality body is, not which body a state designated. Both resolve to `unknown`, never to 'the option was not taken'"
  - "country.currency is null for Bulgaria. Its euro-adoption date was not verified against a primary source in this run, and the project's rule is that unknown is null, never a plausible guess"
  - "A national source is cited only where the register itself supplied the link (MT, LT). Italy, Poland and Slovakia name the domain a maintainer must check instead — no deep URL is invented"

requirements-completed: [LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05, LEGAL-06, LEGAL-08]

coverage:
  - id: D1
    description: "Every legal fact in a country record carries a source and a verified_at or is pending_verification with value null — enforced at parse time, not by convention"
    requirement: "LEGAL-01"
    verification:
      - kind: unit
        ref: "packages/country-data/test/schema.test.ts#the country record: verified requires source > rejects a verified legal basis citing no source"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/schema.test.ts#the country record: pending must be null > rejects a pending_verification response deadline carrying a value"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exactly 27 files, one per EU ISO-3166-1 alpha-2 code, Greece as GR, each filename stem equal to its own record's country code, each parsing against the schema"
    requirement: "LEGAL-02"
    verification:
      - kind: unit
        ref: "packages/country-data/test/coverage.test.ts#coverage: exactly 27 member states > the filename stems are exactly the 27 EU codes, with no extra and no duplicate"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/coverage.test.ts#coverage: exactly 27 member states > every file parses against the record schema and its stem matches its own code"
        status: pass
    human_judgment: false
  - id: D3
    description: "A country with no verified national basis resolves to directive_fallback with the Directive citation drawn from the corpus by key, an explicit label, and never a national citation string"
    requirement: "LEGAL-03"
    verification:
      - kind: unit
        ref: "packages/country-data/test/resolve.test.ts#resolve: fallback > a pending response deadline falls back to the Directive two-month backstop"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/resolve.test.ts#resolve: fallback > a fallback lookup that misses fails loudly with the key named"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/resolve.test.ts#resolve: precedence is total > returns four distinct provenance values across four crafted facts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Art. 7(4) two-month backstop is what a pending country's deadline resolves to, and a national two months does not deviate while one month and ten weeks do"
    requirement: "LEGAL-04"
    verification:
      - kind: unit
        ref: "packages/country-data/test/resolve.test.ts#resolve: deviates is computed, never authored > a national deadline of exactly two months does not deviate"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/resolve.test.ts#resolve: deviates is computed, never authored > a national deadline of ten weeks deviates"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Art. 12(3) position is a condition with the bodies it routes to; a bare boolean fails parse with a message naming the modelling error; it is independent of the Art. 7(2) standing right"
    requirement: "LEGAL-05"
    verification:
      - kind: unit
        ref: "packages/country-data/test/schema.test.ts#the country record: art_12_3 > rejects a bare boolean and explains that the option is a condition, not a route"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/schema.test.ts#the country record: art_12_3 > is independent of the Art. 7(2) standing right — a record may carry both"
        status: pass
    human_judgment: false
  - id: D6
    description: "A human-confirm field cannot be satisfied by a register notification alone, and an equality body stays pending until its Art. 20 designation is traced; the value holds every designated body, in instrument order, verbatim in NFC"
    requirement: "LEGAL-06"
    verification:
      - kind: unit
        ref: "packages/country-data/test/schema.test.ts#the country record: human confirm > rejects a launch-country verified legal basis with a null verified_by"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/schema.test.ts#the country record: equality body > holds an array, so a state designating two bodies renders both"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/coverage.test.ts#coverage: the script promoted nothing > no equality body is claimed from a reachable domain alone"
        status: pass
    human_judgment: false
  - id: D7
    description: "A stale fact degrades the UI and is suppressed from any share card or letter citation; the build hard-fails only for a launch-country legally-operative verified fact past its window"
    requirement: "LEGAL-08"
    verification:
      - kind: unit
        ref: "packages/country-data/test/freshness.test.ts#freshness: the build fails only for the launch five > the same 91-day-old legal basis on a launch country fails the gate"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/freshness.test.ts#freshness: staleness degrades rather than darkening the site > a 91-day-old volatile fact on a non-launch country degrades and does not fail the build"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/freshness.test.ts#freshness: the build fails only for the launch five > a stale launch-country fact that is pending_verification does not fail the gate"
        status: pass
    human_judgment: false
  - id: D8
    description: "The seed promoted nothing: every legally-operative field in all 27 files is pending_verification with value null, and no proposal carries a verified fact"
    verification:
      - kind: unit
        ref: "packages/country-data/test/coverage.test.ts#coverage: the script promoted nothing > no legally-operative field in data/ reads verified"
        status: pass
      - kind: unit
        ref: "packages/country-data/test/coverage.test.ts#coverage: the maintainer-promotion queue > every proposal parses and carries no verified fact"
        status: pass
      - kind: command
        ref: "node --input-type=module -e '…proposed/ file count and verified-status grep…' -> 5 0"
        status: pass
    human_judgment: false
  - id: D9
    description: "country.schema.json is emitted and committed, constraining country.code to an enum of 27, so a contributor gets inline validation with no toolchain install"
    verification:
      - kind: command
        ref: "node packages/country-data/scripts/emit-json-schema.ts && node -e '…count \"GR\" in the emitted schema…' -> 1, enum length 27"
        status: pass
    human_judgment: false
  - id: D10
    description: "The seed is byte-idempotent: hints deduplicated order-stably and sorted by notification date then CELEX, so only a real change shows in a diff"
    verification:
      - kind: unit
        ref: "packages/country-data/test/coverage.test.ts#coverage: discovery hints are ordered so a re-run has no diff > dedupeNimRows is idempotent and order-stable over a raw fixture"
        status: pass
      - kind: command
        ref: "pnpm seed:nim run three times; git diff over data/ and proposed/ empty each time"
        status: pass
    human_judgment: false
  - id: D11
    description: "The five launch countries are drafted into the promotion queue with their per-source verification strategies named, and are ready for a maintainer to read the cited sources and promote"
    verification:
      - kind: unit
        ref: "packages/country-data/test/coverage.test.ts#coverage: the maintainer-promotion queue > every proposal names its verification strategy, and SK and LT name manual-attest"
        status: pass
    human_judgment: true
    rationale: "Automation proves the drafts exist, cite a live source, name a strategy and are not verified. It cannot confirm that the measure each names is the Art. 7 transposition vehicle — that is the reading D-06 reserves to a human, and the checklist for it is in this summary."
  - id: D12
    description: "LEGAL-05, LEGAL-08 and LTR-16 read as the implementation actually behaves"
    verification:
      - kind: command
        ref: "grep -c 'identifiable worker' .planning/REQUIREMENTS.md -> 3 (LEGAL-05, LTR-16, and the change note)"
        status: pass
      - kind: command
        ref: "grep -c 'A build fails when any fact' .planning/REQUIREMENTS.md -> 0"
        status: pass
    human_judgment: false

duration: 27 min
completed: 2026-09-11
status: complete
---

# Phase 01 Plan 04: Country Schema and Seeding Summary

**All 27 member states now exist as parsed, schema-valid records whose every legally-operative field is honestly pending — because the schema makes an agent-set `verified` a parse error, the Art. 12(3) option a condition rather than a boolean route, and a Directive fallback a cited key rather than a blank.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-09-11T13:36Z
- **Completed:** 2026-09-11T14:03Z
- **Tasks:** 3 of 3
- **Files created or modified:** 44
- **Suite:** 125 passed across five files, up from 31; `spine.test.ts` still collected at its original 31, unchanged.

## Accomplishments

- **Pending verification is now a parse error, not a UI convention.** A launch country's legal basis, response deadline or Art. 12(3) position cannot read `verified` without naming the human who read the source. A file in `proposed/` cannot carry a verified fact at all. Both are `superRefine` rules, so merging a pull request cannot make the site more confident — only a maintainer promotion can.
- **The Art. 12(3) option is modelled as the Article actually reads it.** A bare boolean at `article_12_3` fails parse with a message that names the error rather than the type mismatch: the Article restricts *who may see* information where a disclosure would directly or indirectly reveal the pay of an identifiable worker. It is a separate field from the Art. 7(2) standing right, and a record may carry both.
- **All 27 states were seeded from the Commission's own register, and nothing was promoted.** 233 distinct notified measures landed as `discovery_hints`. Every legally-operative field in every file — launch five included — is `pending_verification` with value null.
- **The register query the research recorded does not work, and the fix is in the script.** See "A correction to the research" below; without it the result is 1,832 rows that the prescribed deduplication does not collapse at all.
- **Staleness degrades 22 states and hard-fails the build for five.** The gate fires only when the country is a launch country *and* the field is legally operative *and* the fact is `verified` *and* the age is at or past the class TTL. A stale fact elsewhere degrades with its last-confirmed date and keeps working.

## Task Commits

| Task | Phase | Commit | What |
|---|---|---|---|
| 1 | RED | `0dc87d7` | 45 cases for the record schema and `resolve()`; 25 failing |
| 1 | GREEN | `ba56e3e` | `country.ts`, `resolve.ts`, `emit-json-schema.ts`, `country.schema.json` |
| 1 | REFACTOR | `316f4e2` | citation-key shape pinned against the frozen primitive |
| 2 | — | `ee4e601` | `seed-from-nim.ts`, 27 data files, 5 proposals, `coverage.test.ts` |
| 3 | RED | `2ad2923` | 16 cases for the D-10 behaviour; 9 failing |
| 3 | GREEN | `053a849` | `degradationFor`, `freshnessGate`, `assertNoUnchangedBump`, three requirement rewordings |
| 3 | REFACTOR | `79b893e` | gate scope imported rather than restated |

## TDD Gate Compliance

Both `tdd="true"` tasks ran the full cycle, and both RED phases were machine-verified.

| Task | RED verdict | Evidence |
|---|---|---|
| 1 | **`RED_EVIDENCE_OK`** (`target_test_failed`) | exit 1, `45 tests / 20 pass / 25 fail`. Target: *the country record: human confirm > rejects a launch-country verified legal basis with a null verified_by*. It failed on its own assertion (`expected true to be false`) against a deliberately invariant-free skeleton — not a syntax error, not zero-test discovery, not a fixture crash. |
| 3 | **`RED_EVIDENCE_OK`** (`target_test_failed`) | exit 1, `16 tests / 7 pass / 9 fail`. Target: *freshness: the build fails only for the launch five > the same 91-day-old legal basis on a launch country fails the gate*. It failed on `expected [] to have a length of 1`. |

Both RED commits carry passing cases, which is honest rather than a gate violation: Task 1's 20 are the `Fact` envelope invariants plan 01-01 already froze plus the two constant tables, and Task 3's 7 are plan 01-01's `freshnessOf` boundary, deliberately re-asserted in the new file so that extending the module cannot silently move it.

`gsd-tools check tdd-red-evidence` reads a node:test-style `# tests / # pass / # fail` summary that vitest does not emit. Those three lines were **counted** from the vitest TAP body (`^ok` and `^not ok`), never asserted by hand.

## The live register result — closing the research's discrepancy

`01-RESEARCH.md` carries an internal contradiction: its per-state table records **Slovakia 21** and **Sweden 33**, while its summary prose says Slovakia notified 33. The table carried the VERIFIED tag; the prose did not.

**The live query settles it in the table's favour.** `COUNT(DISTINCT ?nim)` and the full row pull agree with each other and with the table, on 2026-09-11:

| State | Measures | State | Measures | State | Measures |
|---|---:|---|---:|---|---:|
| AT | 17 | GR | 5 | PL | 10 |
| BE | 6 | IT | 1 | RO | 27 |
| BG | 12 | LT | 25 | **SK** | **21** |
| CZ | 31 | MT | 1 | SI | 16 |
| EE | 18 | ES | 10 | **SE** | **33** |

**233 distinct notified measures across 15 states.** The prose appears to have carried Sweden's 33 across to Slovakia's row.

**Twelve states had notified no implementing measure as at the query date 2026-09-11:** HR, CY, DK, FI, FR, DE, HU, IE, LV, LU, NL, PT.

Their records store `transposition.status.value = "no_measure_notified"`, `status: "verified"`, sourced to the register query, with `note_key: "transposition.no_measure_notified_as_at_query_date"`. That is a statement about the Commission's register on a stated date. It is **not** a claim that these states have not transposed, and `coverage.test.ts` asserts the stored value is never `pending` or `draft` so the UI cannot render it as one.

## A correction to the research the plan must inherit

The research prescribes: *"Deduplicate on `work_title` + `resource_legal_id_celex`, not on `nim` id — the raw result contained 1,832 rows for 226 distinct measures."*

**Run against the live endpoint, that deduplication collapses nothing.** The raw result is 1,832 rows and deduplicating on (celex, title) leaves 1,832 rows, because **the celex is what varies**: `cdm:resource_legal_id_celex` on a NIM lists an id for *every* directive that measure implements. One Czech act — `Zákon č. 303/2013 Sb.` — carried 154 of them, including `71978L0660CZE_211450` for Directive 78/660.

The fix is one line in the query, and it is in `seed-from-nim.ts` with the reasoning attached:

```sparql
FILTER(STRSTARTS(STR(?celex), "72023L0970"))
```

Filtered, the result is **233 rows, 233 distinct `?nim`, 233 distinct (celex, title)** — matching `COUNT(DISTINCT ?nim)` exactly. The OPTIONAL cross-product the research blamed turns out not to be the cause at all.

## The five launch-country proposals

All five live in `packages/country-data/proposed/`. None carries a verified fact — not even the transposition status the register does support, because a single unqualified rule is stronger than one with a carve-out.

| State | Candidate, read from the live register | Strategy | Register host a maintainer must check | Settled? |
|---|---|---|---|---|
| **MT** | `72023L0970MLT_202603933` — *Equal Pay (Transparency and Reporting) Regulations, 2026*, Malta government gazette **21,661** of 2026-06-05, notified 2026-06-11 | `jsonld` | `legislation.mt` | yes |
| **IT** | `72023L0970ITA_202603759` — *DECRETO LEGISLATIVO 7 maggio 2026, n. 96.*, Gazzetta Ufficiale **125 del 1 giugno 2026**, notified 2026-06-04 | `html-anchor` | `gazzettaufficiale.it` | yes |
| **PL** | `72023L0970POL_202603677` — *Ustawa z dnia 4 czerwca 2025 r. o zmianie ustawy - Kodeks pracy*, **and** `72023L0970POL_202603683` — *Ustawa z dnia 11 marca 2026 r. o zmianie ustawy o Państwowej Inspekcji Pracy…* | `html-anchor` | `dziennikustaw.gov.pl` | **no — both listed as candidates, `proposed_value` is null** |
| **SK** | `72023L0970SVK_202603903` — *Zákon č. 76/2026 Z. z. o rovnakom odmeňovaní mužov a žien za rovnakú prácu alebo za prácu rovnakej hodnoty*, Zbierka zákonov SR 2026-05-08, notified 2026-06-06 | `manual-attest` | `slov-lex.sk` | yes |
| **LT** | `72023L0970LTU_202603656` — *Lietuvos Respublikos darbo kodekso 23, 26, 39, … straipsnių … įstatymas*, Teisės aktų registras 2026-08785 of 2026-05-25, notified 2026-06-08 | `manual-attest` | `e-tar.lt` | yes |

**MT's anchor asserts `eli/ln/2026/173` and the title, not the operative wording** — `legislation.mt` serves schema.org JSON-LD carrying the ELI and title but not the substantive text, so an anchor asserting "two months" would fail on a perfectly good source.

**SK and LT are `manual-attest` and attest nothing yet.** `slov-lex.sk` is a client-rendered shell whose statute text never appears in the HTTP response; `e-tar.lt` sits behind a challenge interstitial returning 403. A dated human attestation is the honest record; a green produced by a fetch that never saw the statute is not.

**No deep national URL is invented.** A national `Source` is cited only where the register itself supplied the link — Malta and Lithuania. Italy, Poland and Slovakia supplied none, so their proposals cite only the NIM record and name the domain a maintainer must go to.

### The distinct source-host inventory

Flattened from the parsed JSON across all 32 written files, so plan 01-05's url-hygiene rule has a stated expectation to meet rather than a divergence to discover:

```
e-tar.lt
legislation.mt
publications.europa.eu
```

All three are in the eleven-domain probe table (with the shared `publications.europa.eu` / `curia.europa.eu` / `ec.europa.eu` line). `eur-lex.europa.eu` appears nowhere, and `coverage.test.ts` asserts it never will. Host matching strips a leading `www.` — the register supplies Lithuania's link as `www.e-tar.lt`.

## The three reworded requirements, before and after

CONTEXT.md D-10 instructs the rewording explicitly, and the Art. 12(3) scope correction comes from the authentic text quoted in research. This is a visible decision, not a silent edit.

### LEGAL-08

> **Before:** A build fails when any fact's `verified_at` is older than the agreed freshness window

> **After:** A stale fact degrades in the UI to "last confirmed on {date} — status may have changed" and is suppressed from any share card or letter citation; the build hard-fails only when a **launch-country** legally-operative fact is past its freshness window

### LEGAL-05

> **Before:** Each country record states whether that state took the Art. 12(3) option of routing requests only via workers' representatives, the labour inspectorate or the equality body **[research]**

> **After:** Each country record states whether that state took the Art. 12(3) option — under which, where a disclosure would directly or indirectly reveal the pay of an identifiable worker, only the workers' representatives, the labour inspectorate or the equality body have access to that information — modelled as a condition with the bodies it routes to, never as a blanket routing rule **[research]**

### LTR-16

> **Before:** Where Art. 12(3) applies, the letter is routed to workers' representatives or the equality body rather than direct to the employer

> **After:** Where the Art. 12(3) condition is met — a disclosure would directly or indirectly reveal the pay of an identifiable worker — the letter routes to the workers' representatives, the labour inspectorate or the equality body rather than direct to the employer; where it is not met the Art. 7 request proceeds directly, and the separate Art. 7(2) standing right to request through a representative or an equality body is offered in every state **[corrects brief]**

The document's last-updated line records all three and their reasons. **Nothing else in the file changed:** 85 v1 requirements before and after, 85 traceability rows before and after, no requirement moved phase, and the phase totals and coverage counts are untouched.

## Maintainer-promotion checklist — the end-of-phase human review

This is the `<human-check>` the plan defers to the end of the phase. It is the one act D-06 reserves to a person: a domain allowlist plus an anchor assertion cannot distinguish the right domain citing the wrong article, and a hallucinated statute inside a letter a worker has already sent to their employer has no recovery path.

For each of **PL, SK, IT, LT, MT**:

- [ ] Open `packages/country-data/proposed/<CC>.json` and read the `proposals[0]` block: the candidate CELEX id, the title, the journal reference, and the sources cited.
- [ ] Follow the cited source. Where a national link is present (MT, LT), follow that; where it is not (IT, PL, SK), go to the `national_register_host` named in the proposal and locate the instrument by its title and journal reference.
- [ ] Read the provision the proposal names, and satisfy yourself it is the **Art. 7 transposition vehicle** — not a consolidated republication, not a pre-existing act the state considers already compliant.
- [ ] **PL specifically:** decide between the two candidates, or record that both are in play. Eight of Poland's ten notified items are `Obwieszczenie` consolidated republications and are flagged as such in the hints; neither candidate is proposed as settled.
- [ ] **SK and LT specifically:** record a **dated attestation** naming yourself. Neither register can be fetched, so `verified_by` plus your attestation is the whole provenance.
- [ ] Promote into `packages/country-data/data/<CC>.json`, setting `status: 'verified'` and `verified_by` to your own identifier **only for the fields you personally read**: `article_7.legal_basis`, `article_7.response_deadline`, `article_12_3`.
- [ ] Leave everything you could not confirm at `pending_verification` with value null. That includes `enforcement.equality_body`, which needs the **Art. 20 designation under Directive 2006/54/EC** traced — a reachable national body website is not evidence of designation.
- [ ] Re-run `pnpm vitest run --dir packages/country-data`. The schema will reject a promotion that sets `verified` without `verified_by`, and `freshnessGate` will start counting the 90-day volatile window from the date you record.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1 — Bug] The research's NIM deduplication key does not deduplicate**

- **Found during:** Task 2
- **Issue:** `01-RESEARCH.md` prescribes deduplicating on `work_title` + `resource_legal_id_celex`. Against the live endpoint that leaves all 1,832 raw rows, because `cdm:resource_legal_id_celex` on a NIM lists an id for every directive the measure implements, so the celex is the field that varies. One Czech act carried 154 CELEX ids.
- **Fix:** Added `FILTER(STRSTARTS(STR(?celex), "72023L0970"))` to the query, scoping the id to this Directive's own NIM id space. The result is 233 rows, 233 distinct `?nim`, matching `COUNT(DISTINCT ?nim)` exactly. The reasoning is a comment on `NIM_QUERY` so it cannot be "simplified" away.
- **Commit:** `ee4e601`

**2. [Rule 3 — Blocker] `Source` is frozen, so the planned `says_draft` flag could not live on it**

- **Found during:** Task 1
- **Issue:** The plan requires *"`transposition.status.value` of `draft` requires at least one source whose own `says_draft` flag is true"*. `Source` is frozen by plan 01-01 and is not in this plan's `files_modified`; a `Fact`'s `sources: z.array(Source)` strips any added key, so an extended source would lose the flag at parse time.
- **Fix:** `transposition.draft_asserting_sources: string[]` beside the fact, holding URLs drawn from `status.sources`. The invariant is unchanged — a `draft` status requires at least one flagged source, and every flagged URL must be one the fact actually cites. Three cases in `schema.test.ts` cover it, including a flag pointing at an uncited source.
- **Commit:** `ba56e3e`

**3. [Rule 1 — Bug] `data/` already holds `_directive.json`, so "exactly 27 `.json` files" was false on arrival**

- **Found during:** Task 2
- **Issue:** The acceptance criterion reads *"`packages/country-data/data/` contains exactly 27 `.json` files"*. Plan 01-01 created the shared Directive corpus in that same directory and plan 01-03 is filling it, so the literal count is 28.
- **Fix:** Underscore-prefixed files are shared records, not country records, and are excluded by that convention. `coverage.test.ts` asserts exactly 27 country files **and** that the only underscore-prefixed file is `_directive.json` — so a stray shared file cannot hide behind the convention.
- **Commit:** `ee4e601`

**4. [Rule 1 — Bug] A verified transposition status in `proposed/` collided with the no-verified-facts rule**

- **Found during:** Task 2
- **Issue:** Task 2 requires every file's `transposition.status` to read `verified`, and separately requires no proposal to carry a verified fact. A proposal built as a copy of the seeded record satisfied the first and failed the second, and failed the plan's own `5 0` grep.
- **Fix:** A proposal is a **draft of a record, not a copy of the live one**, so nothing in it is verified — including the transposition status, which `data/<CC>.json` is the place to assert. The register source stays attached as the lead it is, with `note_key: proposed.transposition_status_is_asserted_in_data_not_here`.
- **Commit:** `ee4e601`

**5. [Rule 2 — Missing critical] `src/index.ts` did not export the new modules**

- **Found during:** Tasks 1 and 3
- **Issue:** `index.ts` is not in this plan's `files_modified`, but it is the package barrel, and Phase 3 consumes `@jafn/country-data` through it. An unexported `CountryRecord` or `resolve` would be unreachable.
- **Fix:** Appended two export blocks at the end of the file, away from plan 01-02's likely edit region.
- **Commits:** `ba56e3e`, `053a849`

**6. [Rule 1 — Bug] Four test fixtures were wrong**

- **Found during:** Tasks 1 and 3
- **Issue:** (a) The NFC case used `'Rzecznik Praw Obywatelskich'`, which is all-ASCII and therefore its own NFC form, so the "non-NFC" fixture was NFC. (b) The corpus-read case forbade the literal string `_directive.json` rather than an actual read, so a doc comment failed it. (c) The ageing case used a 53-day-old date, which is `fresh`. (d) The inside-the-window case used a 90-day-old date, which is `stale` because the TTL boundary is inclusive on the stale side.
- **Fix:** (a) a name carrying `ą` and `ó`, with an assertion that the NFD form really differs; (b) assert no `readFile`, no `node:fs`, no `require(`, no `.json` import specifier and no dynamic `import(`; (c) 83 days; (d) 89 days, with the 90-day case asserted to fail alongside it so the boundary is pinned from both sides.
- **Commits:** `ba56e3e`, `053a849`

**7. [housekeeping] The research's SK finding is superseded by the live register**

- **Found during:** Task 2
- **Issue:** The research records Slovakia's 21 measures as *"none of which is obviously the Art. 7 vehicle"*. The live pull contains `Zákon č. 76/2026 Z. z. o rovnakom odmeňovaní mužov a žien za rovnakú prácu alebo za prácu rovnakej hodnoty` — an equal-pay act by title, in the Zbierka zákonov of 2026-05-08.
- **Fix:** SK's proposal names it as the candidate, drafted from register metadata only, still `manual-attest` and still unverified. Recorded here rather than silently adopted.
- **Commit:** `ee4e601`

**Total deviations:** 7 — 4 × Rule 1 (bug), 1 × Rule 2 (missing critical), 1 × Rule 3 (blocker), 1 × housekeeping. No Rule 4 architectural decision arose.

**Impact:** Deviation 1 is the load-bearing one. Following the research's instruction literally would have produced 1,832 hint rows spread across 15 countries — Czechia alone would have carried 1,394 hints, most of them naming directives from the 1970s. The seed would have "worked", committed, and looked plausible. Deviations 3 and 4 are specification collisions inside the plan itself rather than implementation errors, and both are resolved in favour of the stricter reading.

## Authentication Gates

None. The Publications Office endpoints require no key; every request in this run was unauthenticated.

## Flagged assumptions, answered

The plan surfaced two open questions on LEGAL-08 and asked for a human rather than a planner answer. The implementation takes these positions, and a reviewer who disagrees should say so before Phase 3 consumes them:

1. **Is a `verified_at` of null "past its freshness window"?** Implemented as **stale**, inherited unchanged from plan 01-01's `freshnessOf`. `degradationFor` degrades it with `lastConfirmed: null` and `ageDays: null`, so Phase 3 has the information to write "never confirmed" rather than "last confirmed on null".
2. **Does the hard-fail apply to a `pending_verification` launch-country fact?** Implemented as **no**. `freshnessGate` requires `status === 'verified'`. A pending fact has no value to be stale, and gating on it would fail the build before the maintainer promotion D-06 reserves — this phase could not ship itself. Asserted directly by *"a stale launch-country fact that is pending_verification does not fail the gate"*.

## Known Stubs

| Item | File | Why it is here |
|---|---|---|
| `country.currency` is `null` for Bulgaria | `packages/country-data/data/BG.json` | Its euro-adoption date was not verified against a primary source in this run. The project's rule is that an unknown is null rather than a plausible guess. Every other member state carries an ISO-4217 code. Logged to `.planning/WINDOWS.md`. |

**Not stubs, though a scanner will read them as such.** Every one of the 27 records carries `value: null` on `article_7.legal_basis`, `article_7.response_deadline`, `article_12_3`, `article_7_2`, `enforcement.equality_body` and `enforcement.anti_retaliation`. **That is this plan's output, not an omission.** The register names the haystack; D-06 reserves choosing the needle to a human, and the maintainer-promotion checklist above is how those nulls become values. A renderer never reads them directly — it calls `resolve()`, which returns `directive_fallback` with the Art. 7(4) citation for the deadline and an explicit `unknown` label elsewhere.

## Threat Flags

None. No new network endpoint, auth path or trust boundary was introduced beyond the plan's `<threat_model>`. The one outbound call this plan adds — `seed-from-nim.ts` to the Publications Office SPARQL endpoint — is T-1-19, and its mitigation is implemented: the seed runs once, off both the pull-request and nightly paths, and refuses to write on a non-200 or a zero-row result rather than committing a partial dataset.

## Notes for plan 01-05

- **`DIRECTIVE_FALLBACK_KEYS`** in `src/resolve.ts` is the single enumerable table the wave-4 referential pass should read. It currently holds four keys — `32023L0970#007.001`, `#007.004`, `#007.003`, `#007.002` — of which only `#007.004` exists in the corpus today. The other three are plan 01-03's to write.
- **The schema asserts the citation-key SHAPE and the phase's cited article set (3, 6, 7, 9, 10, 12), never corpus membership.** The resolve half is yours.
- **The distinct source-host inventory is `e-tar.lt`, `legislation.mt`, `publications.europa.eu`** (with `www.` stripped). If the url-hygiene rule sees a fourth host, something changed after this plan ran.
- **`assertNoUnchangedBump(previous, next)`** is ready to wire into the pull-request lint. It throws naming every field whose `verified_at` moved while its value did not, and walks the record structurally so a field added later cannot escape by not being on a list.
- **Bad-PR drill case 4** — the silent deadline change disguised as a typo fix — is covered by the combination of `freshnessGate` and `assertNoUnchangedBump`, both exported.
- **Proposals carry statute strings inside `proposals[].proposed_value`,** not inside a `Fact`. The T-1-15 anti-hallucination lint needs to treat a `Proposal` as a distinct case: it has its own `sources` array (min 1) and a `status` of `awaiting_maintainer_promotion`, so provenance is present, but the string does not sit in a `verified` fact.

## Issues Encountered

None outstanding.

## Next Phase Readiness

Ready for **01-05**. It inherits 27 parsed, schema-valid records, five drafted proposals, the emitted JSON Schema contributors will author against, the fallback-key table, and the two lint primitives the bad-PR drill needs.

One thing the phase must not lose: **the maintainer-promotion checklist above is the only route from `pending_verification` to `verified` for a launch country.** Until it is walked, the site correctly tells a Polish worker that national transposition is unconfirmed and cites Art. 7(4) of the Directive itself.
