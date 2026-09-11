---
phase: 01-ground-truth-and-governance
plan: 04
type: execute
wave: 2
depends_on: [01-01-cellar-spine]
files_modified:
  - packages/country-data/src/country.ts
  - packages/country-data/src/resolve.ts
  - packages/country-data/src/freshness.ts
  - packages/country-data/scripts/seed-from-nim.ts
  - packages/country-data/scripts/emit-json-schema.ts
  - packages/country-data/country.schema.json
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
  - packages/country-data/test/schema.test.ts
  - packages/country-data/test/coverage.test.ts
  - packages/country-data/test/resolve.test.ts
  - packages/country-data/test/freshness.test.ts
  - .planning/REQUIREMENTS.md
autonomous: true
requirements: [LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05, LEGAL-06, LEGAL-08]

estimate:
  tokens: 88000
  raw_tokens: 88000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Exactly 27 data files exist, one per EU member state ISO-3166-1 alpha-2 code; a 28th file, a duplicate code, or a filename stem that differs from the record's own country code fails coverage.test.ts. Greece is GR, not the EU statistical code EL, and both a file named for the statistical code and a missing GR file fail"
    - "A member state that has notified no implementing measure stores discovery_hints as an empty array and a transposition status value meaning that no implementing measure was notified to the Commission as at the query date — never null, and never a claim that the state has not transposed"
    - "discovery_hints are sorted by notification date ascending then by CELEX id ascending, so re-running the seed produces a byte-identical file and a real change is the only thing that shows up in a diff"
    - "When a national legal basis is verified and is identical in substance to the Directive default, the fact stays status verified with deviates false; it is never collapsed into directive_default, because 'national law independently says this' and 'the Directive applies here' are different claims"
    - "A country with no verified national basis resolves to directive_fallback with the Directive article as the citation and an explicit label, never to null and never to a national citation"
    - "resolve() precedence is fixed and total: a verified national value wins, then directive_fallback, then pending_verification; a record carrying both a national value and a fallback marker resolves to the national value"
    - "A national response deadline of exactly two months resolves with deviates false; one month or ten weeks resolves with deviates true"
    - "A country whose response-deadline fact is pending_verification resolves to the Directive's own two-month backstop wording under directive_fallback — never to an empty value, never to null rendered as a blank, and never to a national deadline string"
    - statement: "Where a country record carries more than one response deadline scoped to different request types, the resolved deadline is the one whose scope matches the request, and a tie resolves to the longer period"
      verification: backstop
    - "The Art. 12(3) position is stored as a condition with the bodies it routes to, never as a boolean route; a record whose art_12_3 field is a bare boolean fails schema parse"
    - "The Art. 12(3) condition and the Art. 7(2) standing right are independent fields; neither suppresses the other, and a state may carry both"
    - "A state that has not been checked for the Art. 12(3) option stores the field as pending_verification with value null, and resolve() reports it as unknown rather than as 'the option was not taken'"
    - "The nightly full-set verification job and a pull-request verification job may run at the same time against the same country file without either writing to the data directory; both are read-only and emit reports"
    - "A country whose equality body has not been traced to a primary Art. 20 designation stores the field as pending_verification with value null and the candidate domain recorded as a discovery hint — reachability of a domain is not evidence of designation"
    - "An equality body's local-language name is stored and rendered verbatim in NFC, never translated, transliterated or case-folded; comparison between a stored name and a source name is NFC equality on the raw string"
    - statement: "Where a member state has designated more than one body under Art. 20 of Directive 2006/54/EC, the equality_body value holds all of them and every one renders"
      verification: backstop
    - statement: "Where more than one equality body is designated, the rendered order is the order in which the designating instrument lists them, and that order is stable across builds"
      verification: backstop
    - "A stale fact degrades rather than darkening the site: the country page reads 'last confirmed on {date} — status may have changed' and the stale value is suppressed from any share card or letter citation; the build hard-fails only when a launch-country legally-operative fact is past its freshness window"
    - "An agent may draft a launch-country legally-operative fact into proposed/ but may not set it verified; only a maintainer promotion into data/ sets verified_by, and a proposed/ file carrying status verified fails validation"
  artifacts:
    - path: "packages/country-data/src/country.ts"
      provides: "The country record schema: transposition, legal basis, deadline, Art. 12(3) condition, Art. 7(2) standing right, equality body, anti-retaliation, discovery hints"
      exports: ["CountryRecord", "TranspositionStatus", "LegalBasis", "Art12_3Position", "Art7_2Standing", "EqualityBody", "DiscoveryHint", "EU_COUNTRY_CODES", "LAUNCH_COUNTRIES"]
      contains: "EU_COUNTRY_CODES"
    - path: "packages/country-data/src/resolve.ts"
      provides: "The single place 'two months unless national law verifiably says otherwise' is decided"
      exports: ["resolve", "Provenance", "ResolvedFact"]
    - path: "packages/country-data/scripts/seed-from-nim.ts"
      provides: "One SPARQL pull over the Commission National Implementing Measures register, deduplicated, sentinel-cleaned, written as discovery hints"
      exports: ["seedFromNim", "dedupeNimRows", "nullSentinel"]
    - path: "packages/country-data/country.schema.json"
      provides: "Emitted, committed JSON Schema so a lawyer contributor gets inline validation with no toolchain install"
    - path: "packages/country-data/proposed/MT.json"
      provides: "An agent-drafted launch-country proposal awaiting maintainer promotion, with sources and anchors but status pending_verification"
    - path: "packages/country-data/test/coverage.test.ts"
      provides: "The 27-file, one-per-code, filename-matches-record assertions"
    - path: ".planning/REQUIREMENTS.md"
      provides: "LEGAL-05, LEGAL-08 and LTR-16 reworded to match the authentic Art. 12(3) text and decision D-10"
  key_links:
    - from: "packages/country-data/scripts/seed-from-nim.ts"
      to: "packages/country-data/data/PL.json"
      via: "SPARQL rows land as discovery_hints with status pending_verification; nothing is promoted to legal_basis by the script"
      pattern: "discovery_hints"
    - from: "packages/country-data/src/resolve.ts"
      to: "packages/country-data/data/_directive.json"
      via: "a directive_fallback resolution reads the Directive citation from the corpus by citation key rather than repeating a string 27 times"
      pattern: "32023L0970#"
    - from: "packages/country-data/src/freshness.ts"
      to: "packages/country-data/src/country.ts"
      via: "the hard-fail branch is gated on LAUNCH_COUNTRIES membership and on the legally-operative field set"
      pattern: "LAUNCH_COUNTRIES"
  prohibitions:
    - "MUST NOT write a statute number, journal reference, deadline, equality-body designation or authority name into any country record that was not read out of a primary source in this run; an unknown field is value null with status pending_verification and the candidate domain recorded as a hint, never a plausible-looking guess"
    - "MUST NOT allow an agent, a script, or a contributor pull request to set a launch-country legally-operative field to verified; the register names the haystack with impeccable provenance, and choosing the needle is a judgement reserved to a maintainer who records verified_by"
    - "MUST NOT model the Art. 12(3) option as a boolean route, and MUST NOT collapse it with the Art. 7(2) standing right; the first is conditional on a disclosure identifying an individual worker, the second is unconditional in every state"
    - "MUST NOT treat a domain being reachable as evidence that it is the body designated under Art. 20 of Directive 2006/54/EC; an unverified equality body stays pending_verification with the domain as a hint"
    - "MUST NOT bump verified_at on a record whose value did not change — a date that moves without a value moving is provenance theatre and makes the page look more trustworthy while being less so"
---

<objective>
Turn the frozen `Fact` primitives into a complete country record, seed all 27 member states from the
Commission's own National Implementing Measures register so every state starts at an honest, sourced
status, draft the five launch countries into a maintainer-promotion queue, and make staleness degrade
the UI rather than darken the site.

Purpose: this is where "pending verification is unforgeable" stops being a UI convention and becomes a
parse error. It is also where the phase's two hardest honesty problems land: the register is an
authoritative discovery index and not a curated answer, and the Art. 12(3) option is a condition rather
than a routing rule. Getting either wrong ships a wrong statute inside a letter a worker sends to their
own employer, which has no recovery path.

Output: the country record schema and its emitted JSON Schema, 27 seeded data files, five drafted
launch-country proposals, the resolution function, the D-10 freshness behaviour, and three corrected
requirement statements.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/phases/01-ground-truth-and-governance/01-CONTEXT.md
@.planning/phases/01-ground-truth-and-governance/01-RESEARCH.md
@.planning/phases/01-ground-truth-and-governance/01-VALIDATION.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@.planning/phases/01-ground-truth-and-governance/01-01-SUMMARY.md
@packages/country-data/src/schema.ts
@packages/country-data/src/freshness.ts
</context>

<flagged_assumptions>
## Planner assumptions surfaced, not silently resolved

**Unresolved edge — LEGAL-08, classification `unclassified`.** The deterministic edge probe could not
classify LEGAL-08 into any of its eight shape categories, and this plan does NOT auto-resolve it with a
backstop. The reason it resists classification is real: LEGAL-08 as written describes a build outcome
("a build fails"), not a data shape, and decision D-10 changes that outcome conditionally — degrade for
most facts, hard-fail for launch-country legally-operative facts. Two questions stay open and are
recorded here for a human rather than answered by the planner:
 1. Is a fact whose `verified_at` is null (never verified) "past its freshness window"? This plan
    implements it as stale, because `freshnessOf` returns stale for a null date — but the requirement
    text does not say so, and treating "never checked" and "checked long ago" identically may be wrong
    for the UI copy Phase 3 writes.
 2. Does the hard-fail apply to a launch-country legally-operative fact that is `pending_verification`
    (so it has no value to be stale), or only to one that was once verified and has since lapsed? This
    plan implements the second reading, so a phase that has not yet had its maintainer promotion does
    not block its own build. A reviewer who disagrees should say so before Phase 3 consumes the
    behaviour.

**Register-count discrepancy in the research.** `01-RESEARCH.md` states a per-state count table listing
Slovakia at 21 notified measures and Sweden at 33, while its own summary prose says Slovakia notified
33. The table carries the VERIFIED tag and the prose does not. The seed script takes its counts from the
live query, not from either figure, and the summary for this plan must record what the live query
actually returned so the discrepancy is closed with evidence rather than by preference.
</flagged_assumptions>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The country record schema, the resolution function, and the emitted JSON Schema</name>
  <reversibility rating="one-way">The country record shape and the `directive_fallback` resolution state are what Phase 3's country pages and Phase 5's letter generator both branch on, and what community pull requests are authored against once the repository is public; changing either later means migrating every country record and both consuming paths. D-07 already took this door, so the rating is recorded and no checkpoint re-asks it.</reversibility>
  <files>packages/country-data/src/country.ts, packages/country-data/src/resolve.ts, packages/country-data/scripts/emit-json-schema.ts, packages/country-data/country.schema.json, packages/country-data/test/schema.test.ts, packages/country-data/test/resolve.test.ts</files>
  <read_first>
    - packages/country-data/src/schema.ts — the frozen `Fact`, `Source`, `FactStatus`, `SourceVerification` and `Volatility` primitives this composes
    - .planning/research/ARCHITECTURE.md § 2 "The country record" — the full field layout, and § "The resolve() function" — the signature and the `deviates` semantics
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Schema and Provenance" — amendments A, B, C, D and the validator-stack verdict on emitting and committing the JSON Schema
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Art. 12(3) — verbatim, and a scope correction the roadmap needs" — the authentic text, the identifiability condition, the three bodies, and the distinction from Art. 7(2)
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-06 and D-07 — who may set verified, and the explicit suppressed-national-citation state
    - .planning/research/PITFALLS.md § "Pitfall 2" — the per-field volatility model and the warning signs of provenance theatre
  </read_first>
  <behavior>
    - Test "verified requires source": a fact with status verified and an empty sources array fails parse with a message naming the missing citation; a verified fact with no verified_at fails parse
    - Test "pending must be null": a fact with status pending_verification and a non-null value fails parse
    - Test "human confirm": a launch-country legally-operative field with status verified and a null verified_by fails parse; the same field in a non-launch country passes
    - Test "art_12_3": a record whose art_12_3 value is a bare boolean fails parse; a record whose art_12_3 value is a condition object with the three bodies passes; art_12_3 and art_7_2 are independent and a record may carry both
    - Test "fallback": resolve() on a record with no verified national basis returns provenance directive_fallback, a citation drawn from the Directive corpus by citation key, and never a national citation string
    - Test: resolve() returns provenance national with deviates false when the verified national deadline is exactly two months, and deviates true when it is one month
    - Test: resolve() precedence is total — a record holding both a verified national value and a fallback marker returns the national value
    - Test: a country code outside the 27-member set fails parse
  </behavior>
  <action>
`packages/country-data/src/country.ts` composes the frozen primitives into the record. Export
`EU_COUNTRY_CODES` as the frozen 27-member tuple in this exact order: AT, BE, BG, HR, CY, CZ, DK, EE,
FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE. Greece is `GR` — the
ISO-3166-1 alpha-2 code — not the EU statistical code, and the record must reject the statistical form.
Export `LAUNCH_COUNTRIES` as PL, SK, IT, LT, MT (D-05).

Record shape, following ARCHITECTURE.md §2 and amended by this phase's decisions:
 - `country`: `{ code, name_en, official_languages, letter_languages, currency }`
 - `transposition`: `Fact` fields `status` (value in `in_force`, `partial`, `draft`, `pending`,
   `no_measure_notified`, `unknown`), `in_force_from`, `expected_from`, `partial_in_force`,
   `national_act`
 - `article_7`: `legal_basis`, `response_deadline`, `channel`, `employer_reminder_duty`,
   `language_requirement`. Do NOT carry a `request_frequency` field asserting an annual cap — no such
   cap on the worker exists in the authentic text; the annual obligation in Article 7 is an employer
   duty to inform, and it belongs to `employer_reminder_duty`
 - `article_12_3`: a `Fact` whose value is a CONDITION object, never a boolean:
   `{ option_taken: boolean, condition: 'disclosure_identifies_individual_worker', bodies: Array<'workers_representatives' | 'labour_inspectorate' | 'equality_body'>, national_citation }`.
   A bare boolean at this position must fail parse — make that a `superRefine` with an explanatory
   message, because a boolean is exactly the modelling error the roadmap's phrasing invites
 - `article_7_2`: a separate `Fact` for the unconditional standing right to request through a
   representative or an equality body, which exists in every state independently of the option above
 - `enforcement`: `anti_retaliation`, `burden_of_proof_reversal`, `equality_body`,
   `labour_inspectorate`, `penalties`. `equality_body.value` is an ARRAY of body objects, each
   `{ name_local, name_en, url, complaint_url, art20_designation_source }` — an array because a state
   may designate more than one body under Art. 20 of Directive 2006/54/EC, and a singular field would
   force a silent choice
 - `reporting`: thresholds, filing deadline, filing authority, template, adapter id
 - `discovery_hints`: an ordered array of `{ celex, title, official_journal, oj_number, oj_date, notified_at, national_link, source_query_at }`
 - `meta`: maintainers, review interval, last full review

`superRefine` invariants on the record, on top of the fact-level ones already in `schema.ts`:
 - `country.code` must be a member of `EU_COUNTRY_CODES`, and the record is rejected otherwise
 - for a country in `LAUNCH_COUNTRIES`, any of `article_7.legal_basis`, `article_7.response_deadline`
   or `article_12_3` with status verified must carry a non-null `verified_by` (D-06)
 - `transposition.status.value` of `draft` requires at least one source whose own `says_draft` flag is
   true — where the underlying source says draft, the data must say draft, and a contributor ticks that
   box rather than a reviewer hoping
 - a fact with status `directive_fallback` must have a `value` that resolves to a citation key present
   in the Directive corpus, and must NOT carry a national citation string

`packages/country-data/src/resolve.ts` exports `resolve(fact, fallback)` returning
`{ value, provenance, deviates, sources, verifiedAt, ageDays, freshness, label }`. `Provenance` is
`'national' | 'directive_default' | 'directive_fallback' | 'unknown'` — four members, because
"we checked and national law adds nothing", "we are deliberately citing the Directive instead" and
"we have not checked" are three different claims and the UI must be able to say which. Precedence is
total and ordered: a verified national value, then `directive_fallback`, then `pending_verification`
as unknown. `deviates` is computed, never authored. Every renderer calls `resolve`; nothing reads
`fact.value` directly.

`packages/country-data/scripts/emit-json-schema.ts` converts the Zod record schema to JSON Schema and
writes `packages/country-data/country.schema.json`, which is COMMITTED. Every data file carries a
`$schema` pointer at it, so a lawyer contributor gets inline validation in an editor with no toolchain
install — that is the decisive affordance for the community flow, and it is why Zod is the source of
truth and JSON Schema is an output rather than the other way round.

Write these scripts in erasable TypeScript so they run under the installed Node runtime's native type
stripping — no enums, no namespaces, no parameter properties — and add no script-runner dependency.
  </action>
  <acceptance_criteria>
    - `EU_COUNTRY_CODES` has exactly 27 members, includes `GR`, and does not include `EL`, `UK` or `GB`
    - `LAUNCH_COUNTRIES` is exactly PL, SK, IT, LT, MT
    - `packages/country-data/src/country.ts` contains no field named for a per-worker annual request frequency
    - A record literal whose `article_12_3.value` is `true` fails `safeParse`, and the issue message explains that the option is a condition rather than a route
    - A record literal for `PL` with `article_7.legal_basis.status` verified and `verified_by` null fails `safeParse`; the same literal for `EE` passes
    - A record literal with `transposition.status.value` `draft` and no source flagged as saying draft fails `safeParse`
    - `resolve()` returns four distinct `provenance` values across four crafted records
    - `packages/country-data/country.schema.json` exists, parses as JSON, and declares `country.code` as an enum of 27 values
    - `pnpm vitest run packages/country-data/test/schema.test.ts -t "verified requires source"` selects and passes; the same for `-t "pending must be null"`, `-t "human confirm"` and `-t "art_12_3"`
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/schema.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 8 cases are reported (a named behaviour above was not registered)</fails_when>
    <automated>pnpm vitest run packages/country-data/test/resolve.test.ts -t "fallback"</automated>
    <fails_when>reports `0 passed` or `no tests found` — the VALIDATION.md filter for LEGAL-03 no longer selects a case</fails_when>
    <automated>node packages/country-data/scripts/emit-json-schema.ts && node -e "const s=JSON.parse(require('fs').readFileSync('packages/country-data/country.schema.json','utf8'));const e=JSON.stringify(s).match(/\"GR\"/g);process.stdout.write(e?String(e.length):'0')"</automated>
    <fails_when>prints `0` (the emitted schema does not constrain country codes, so a typo'd code would validate), or the emit step exits non-zero</fails_when>
  </verify>
  <done>A country record cannot express a value without its provenance, cannot model the identifiability option as a boolean, cannot let an agent mark a launch-country field verified, and resolves to one of four explicit provenances.</done>
</task>

<task type="auto">
  <name>Task 2: Seed all 27 states from the Commission register, and draft the five launch countries into the promotion queue</name>
  <files>packages/country-data/scripts/seed-from-nim.ts, packages/country-data/data/AT.json, packages/country-data/data/BE.json, packages/country-data/data/BG.json, packages/country-data/data/HR.json, packages/country-data/data/CY.json, packages/country-data/data/CZ.json, packages/country-data/data/DK.json, packages/country-data/data/EE.json, packages/country-data/data/FI.json, packages/country-data/data/FR.json, packages/country-data/data/DE.json, packages/country-data/data/GR.json, packages/country-data/data/HU.json, packages/country-data/data/IE.json, packages/country-data/data/IT.json, packages/country-data/data/LV.json, packages/country-data/data/LT.json, packages/country-data/data/LU.json, packages/country-data/data/MT.json, packages/country-data/data/NL.json, packages/country-data/data/PL.json, packages/country-data/data/PT.json, packages/country-data/data/RO.json, packages/country-data/data/SK.json, packages/country-data/data/SI.json, packages/country-data/data/ES.json, packages/country-data/data/SE.json, packages/country-data/proposed/PL.json, packages/country-data/proposed/SK.json, packages/country-data/proposed/IT.json, packages/country-data/proposed/LT.json, packages/country-data/proposed/MT.json, packages/country-data/test/coverage.test.ts</files>
  <read_first>
    - packages/country-data/src/country.ts — the record shape every seeded file must satisfy, and the launch-country invariant
    - packages/country-data/src/allowlist.ts — the per-country host allowlist a proposed source must pass
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Transposition Reality" — the working SPARQL query, the per-state counts, the launch-country candidate table, the caution that the register is a discovery index, and the three data-quality traps
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Code Examples" → "Seeding the 27 files from the NIM register" — the full query with its OPTIONAL clauses and the deduplication instruction
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Open Questions" 1 and 2 — why the Art. 12(3) option and the equality-body designation are UNKNOWN rather than findings
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-05, D-06, D-07, D-11 — the launch-set depth, the promotion boundary, the fallback state, and the additive-by-default flow
    - .planning/research/PITFALLS.md § "Pitfall 9" — the governance the data layer needs, in particular default-to-unverified
  </read_first>
  <action>
`packages/country-data/scripts/seed-from-nim.ts` runs the National Implementing Measures query ONCE
against the Publications Office SPARQL endpoint with `format=application/sparql-results+json`, a
generous timeout, and the CELEX literal typed as `xsd:string` — an untyped literal returns nothing.
Keep this off both the pull-request path and the nightly path: the endpoint was observed timing out at
60 seconds on a complex query, and this is a one-off discovery pull whose result is committed.

Post-processing, in this order:
 1. Deduplicate on the pair of measure CELEX id and work title, NOT on the measure resource id — the
    OPTIONAL clauses produce a cross-product that inflated a 226-measure result to roughly 1,832 rows.
    Export `dedupeNimRows` so the deduplication is testable independently of the network.
 2. Map the Publications Office null-date sentinel `1001-01-01` to null, and map any literal wrapped in
    dollar signs — an unsubstituted build-info template placeholder was observed in the Office's own
    data — to null. Export `nullSentinel` for the same reason.
 3. Group by member state and write each row as a `discovery_hint`, sorted by notification date
    ascending then by CELEX id ascending, so a re-run produces a byte-identical file.
 4. Set `transposition.status` from the register with a real source: a state with at least one notified
    measure gets a status sourced to the query with `verified` and the query date as `verified_at`; a
    state with none gets value `no_measure_notified`, also `verified`, also sourced. The value means
    exactly what was observed — that no implementing measure had been notified to the Commission as at
    the query date — and must not be recorded or rendered as a claim that the state has not transposed.
 5. Every legally-operative field — `article_7.legal_basis`, `article_7.response_deadline`,
    `article_12_3`, `article_7_2`, `enforcement.equality_body`, `enforcement.anti_retaliation` —
    is written as `pending_verification` with value null for ALL 27 states. The script promotes nothing.
    The register names the haystack with impeccable provenance; choosing the needle is legal judgement,
    and a `legal_basis` whose date precedes the Directive is the warning sign that the script guessed.
 6. Write a `$schema` pointer in every file at the committed `country.schema.json`.

Then, for the five launch countries only, draft proposals into `packages/country-data/proposed/`. A
proposal has the same record shape but carries `proposed_value` alongside the still-`pending_verification`
fact, plus the sources and anchors a maintainer will check. Draft from the candidate evidence the
register supplies, and record the verification strategy each source needs:
 - MT — the 2026 equal-pay transparency regulations, notified with a working national ELI link, whose
   landing page serves a schema.org JSON-LD block. Strategy `jsonld`, anchoring on the legislation
   identifier and the title, explicitly NOT on the operative wording, because the substantive text is
   not on that page
 - IT — the May 2026 legislative decree, with its Gazzetta Ufficiale number and date. No national link
   was supplied by the register; strategy `html-anchor` against the allowlisted Italian registers
 - PL — two candidate acts, a 2025 Labour Code amendment and a 2026 labour-inspection amendment. Eight
   of Poland's ten notified items are consolidated-text republications and are NOT transposing
   amendments; mark them as such in the hints and propose neither candidate as settled. Strategy
   `html-anchor` against the allowlisted Polish journal
 - SK — strategy `manual-attest`. The national register is a client-rendered shell whose statute text
   never appears in the HTTP response, and several of its notified measures are consolidated versions
   of pre-existing acts including a 2001 statistics statute. A dated human attestation is the honest
   record; a fetch that never saw the statute is not
 - LT — strategy `manual-attest`. The national register sits behind a challenge interstitial returning
   403. The register lists a 2026 Labour Code amendment alongside a 1999 equal-opportunities act and a
   2009 ministerial order; propose the candidate, attest nothing

For the Art. 12(3) option and the equality-body designation, write `pending_verification` in every one
of the 27 files including the launch five, and record candidate domains as discovery hints only. No
machine-readable per-state answer exists for the option — the register records that measures were
notified, not what they say — and reachability of a national body's website is not evidence that it is
the body designated under Art. 20 of Directive 2006/54/EC. These stay unknown, which the phase brief
says is the correct output.

`packages/country-data/test/coverage.test.ts` asserts the file set: exactly 27 files in the data
directory, one per code in `EU_COUNTRY_CODES`, each filename stem equal to its own record's
`country.code`, no extra file, no duplicate; every file parses against the record schema; the twelve
states observed with no notified measure carry an empty `discovery_hints` array and the
no-measure-notified status; and re-running `dedupeNimRows` over a fixture of raw rows is idempotent and
order-stable.
  </action>
  <acceptance_criteria>
    - `packages/country-data/data/` contains exactly 27 `.json` files and their stems sorted equal `EU_COUNTRY_CODES` sorted
    - Every one of the 27 parses against the record schema emitted in task 1
    - No file in `data/` has any of `article_7.legal_basis`, `article_7.response_deadline`, `article_12_3`, `enforcement.equality_body` with status `verified` — the script promoted nothing
    - Every file's `transposition.status` has status `verified`, a non-empty sources array, and a `verified_at` equal to the query date
    - The twelve states with no notified measure have `discovery_hints` length 0 and `transposition.status.value` of `no_measure_notified`
    - No `discovery_hint` anywhere contains the string `1001-01-01` or a value wrapped in dollar signs
    - Running the seed twice produces no diff other than the recorded query timestamp
    - `packages/country-data/proposed/` contains exactly five files, one per launch country; none carries any fact with status `verified`; each names its verification strategy, and the SK and LT proposals name `manual-attest`
    - Every source URL in every seeded and proposed file passes `assertFetchable` for its own country
  </acceptance_criteria>
  <verify>
    <automated>pnpm seed:nim</automated>
    <fails_when>non-zero exit, or stderr contains `timeout`, or the script reports a member-state count other than 27</fails_when>
    <automated>pnpm vitest run packages/country-data/test/coverage.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or the reported file count is not 27</fails_when>
    <automated>node --input-type=module -e "import fs from 'node:fs'; const p='packages/country-data/proposed'; const f=fs.readdirSync(p).filter(x=>x.endsWith('.json')); const bad=f.filter(x=>/[\"']status[\"']\s*:\s*[\"']verified[\"']/.test(fs.readFileSync(p+'/'+x,'utf8'))); process.stdout.write(f.length+' '+bad.length)"</automated>
    <fails_when>prints anything other than `5 0` — either the five launch-country proposals are not all present, or a proposal carries a verified status an agent is not permitted to set</fails_when>
  </verify>
  <done>All 27 member states exist with a real, sourced transposition status and honest pending fields; the five launch countries are drafted into the promotion queue with their per-source verification strategies named; nothing was promoted by a script.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Staleness degrades the UI, the build fails only for launch countries, and three requirement statements are corrected</name>
  <files>packages/country-data/src/freshness.ts, packages/country-data/test/freshness.test.ts, .planning/REQUIREMENTS.md</files>
  <read_first>
    - packages/country-data/src/freshness.ts — the TTL table and `freshnessOf` authored in plan 01, which this extends with the degradation and hard-fail branches
    - packages/country-data/src/country.ts — `LAUNCH_COUNTRIES` and the legally-operative field set the hard gate is scoped to
    - .planning/REQUIREMENTS.md — the current LEGAL-05, LEGAL-08 and LTR-16 statements being corrected
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md D-10 — staleness degrades, the build fails only for launch countries, and the explicit instruction that the planner must reword LEGAL-08 rather than leave a requirement the implementation knowingly violates
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Freshness windows" — the four volatility classes, their TTLs, and the proposed LEGAL-08 text
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Art. 12(3)" and § "Open Questions" 5 — why LEGAL-05 and LTR-16 overstate the Article
    - .planning/research/ARCHITECTURE.md § 2 "On freshness, resist the obvious design" — why a global hard gate is a trap
  </read_first>
  <behavior>
    - Test: a volatile fact on a non-launch country, 91 days old, produces a degraded render descriptor carrying the last-confirmed date and does NOT fail the build
    - Test: the same fact on a launch country fails the freshness gate with a message naming the country, the field and the age
    - Test: a stale fact is flagged as suppressed from share-card and letter citation, and the suppression flag is separate from the degraded-render flag
    - Test: a stable-class fact at 364 days is ageing, at 365 days is stale, and at 366 days is stale — the boundary day is stale
    - Test: a fact with a null verified_at is stale regardless of volatility class
    - Test: a stale fact on a launch country whose status is pending_verification does NOT fail the gate — there is no value to be stale, and the maintainer promotion has not happened yet
    - Test: a non-legally-operative launch-country field that is stale degrades and does not fail the gate
  </behavior>
  <action>
Extend `packages/country-data/src/freshness.ts` with the D-10 behaviour, keeping `freshnessOf`
unchanged so the plan 01 spine test does not regress.

Add `degradationFor(fact, volatility, today)` returning
`{ render: 'normal' | 'degraded', lastConfirmed, suppressFromShareCard: boolean, suppressFromLetterCitation: boolean }`.
A stale fact degrades: the country page reads that it was last confirmed on a stated date and the
status may have changed, the call to action still works, and the stale value is suppressed from any
share card and from any letter citation. Keep the two suppression flags separate from the render flag
and from each other — a privacy or reliability suppression is a different claim from a staleness
suppression, and Phase 3 and Phase 5 branch on them independently.

Add `freshnessGate(records, today)` returning the list of hard failures. It fails ONLY when all four of
these hold: the country is in `LAUNCH_COUNTRIES`; the field is legally operative — legal basis,
response deadline, or the Art. 12(3) position; the fact's status is `verified` (a pending fact has no
value to go stale, and gating on it would block the build before the maintainer promotion that D-06
reserves); and the elapsed days are at or above the class TTL. Anything else warns. This is the split
that gives nagging without brittleness: an unrelated typo fix on a Tuesday must not be undeployable
because a non-launch country's verification lapsed on Monday, and a site that goes dark is strictly
worse than a site that says when it was last confirmed.

Add `assertNoUnchangedBump(previous, next)` which fails when a record's `verified_at` moved while its
`value` did not. A date that advances without a value advancing makes the page look more trustworthy
while being less so, and this must be a mechanical rule rather than a hope about review attention.
Plan 05 wires it into the pull-request lint.

Then correct three requirement statements in `.planning/REQUIREMENTS.md`. Flag this in the plan summary
as a visible decision, not a silent edit — CONTEXT.md D-10 explicitly instructs the rewording, and the
Art. 12(3) scope correction comes from the authentic text quoted in research.

 - **LEGAL-08** becomes: a stale fact degrades in the UI to a statement that it was last confirmed on a
   given date and the status may have changed, and is suppressed from any share card or letter
   citation; the build hard-fails only when a launch-country legally-operative fact is past its
   freshness window.
 - **LEGAL-05** becomes: each country record states whether that state took the Art. 12(3) option —
   under which, where a disclosure would directly or indirectly reveal the pay of an identifiable
   worker, only the workers' representatives, the labour inspectorate or the equality body have access
   to that information — modelled as a condition with the bodies it routes to, never as a blanket
   routing rule. Keep the research marker on the requirement.
 - **LTR-16** becomes: where the Art. 12(3) condition is met, the letter routes to the workers'
   representatives, the labour inspectorate or the equality body rather than direct to the employer;
   where it is not met, the Art. 7 request proceeds directly, and the separate Art. 7(2) standing right
   to request through a representative or an equality body is offered in every state. Add the
   corrects-brief marker, because this replaces a statement the brief got wrong.

Update the document's last-updated line to record that LEGAL-05, LEGAL-08 and LTR-16 were reworded in
Phase 1 planning, naming D-10 and the Art. 12(3) scope correction as the reasons. Change nothing else
in that file: the traceability table, the phase totals and the coverage counts are unaffected, because
no requirement moved phase and none was added or removed.
  </action>
  <acceptance_criteria>
    - `degradationFor` on a 91-day-old volatile fact returns render `degraded`, a non-null `lastConfirmed`, and both suppression flags true
    - `freshnessGate` returns an empty failure list for a 91-day-old volatile legal-basis fact on `EE`, and a one-item failure list for the same fact on `PL`
    - `freshnessGate` returns an empty failure list for a stale `PL` fact whose status is `pending_verification`
    - `freshnessOf` at 364, 365 and 366 days on the stable class returns `ageing`, `stale`, `stale`
    - `assertNoUnchangedBump` fails when only `verified_at` differs between two otherwise identical records, and passes when the value also changed
    - `.planning/REQUIREMENTS.md` LEGAL-08 no longer contains the phrase asserting that a build fails when any fact is older than the window
    - `.planning/REQUIREMENTS.md` LEGAL-05 text contains the identifiability condition and names all three bodies
    - `.planning/REQUIREMENTS.md` LTR-16 text distinguishes the conditional routing from the unconditional standing right
    - `.planning/REQUIREMENTS.md` still lists 85 v1 requirements and its traceability table still maps every one to exactly one phase
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/freshness.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or fewer than 7 cases are reported (one of the seven behaviours was not registered)</fails_when>
    <automated>grep -c 'identifiable worker' .planning/REQUIREMENTS.md</automated>
    <fails_when>prints `0` or `1` — the Art. 12(3) scope correction must appear in both LEGAL-05 and LTR-16, so a count below 2 means one of the two rewordings was not applied</fails_when>
    <automated>pnpm vitest run --dir packages/country-data</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or the reporter output omits `spine.test.ts` (the plan 01 tracer regressed when freshness.ts was extended)</fails_when>
  </verify>
  <verify>
    <human-check>
      <test>Open `packages/country-data/proposed/` and, for each of PL, SK, IT, LT and MT, follow the cited source to the national register and read the provision the proposal names. Then promote the proposal into `packages/country-data/data/<CC>.json`, setting `status: 'verified'` and `verified_by` to your own identifier, for exactly those fields you personally read.</test>
      <expected>Each promoted launch-country record carries `verified_by` set to a human identifier on its legal basis, response deadline and Art. 12(3) position. Fields you could not confirm from a primary source stay `pending_verification` with value null — including the equality-body designation, which requires tracing the Art. 20 designation and not merely finding a reachable national body website. SK and LT carry a dated attestation rather than a fetch result.</expected>
      <why_human>D-06 reserves this act to a human: a domain allowlist plus an anchor assertion cannot distinguish the right domain citing the wrong article, and a hallucinated statute inside a letter a worker has already sent to their employer has no recovery path. The agent has done everything it is permitted to do — found the source, drafted the fact, run the verifier against it — and the only remaining step is the confirming eyes the decision reserves.</why_human>
    </human-check>
  </verify>
  <done>Staleness degrades the UI for 22 states and hard-fails the build for the launch five, a date cannot move without a value moving, and the three requirement statements the implementation would otherwise contradict are corrected.</done>
</task>

</tasks>

<artifacts_this_phase_produces>
## Artifacts this phase produces

See `01-01-cellar-spine-PLAN.md` → "Artifacts this phase produces" for the phase-wide list. This plan
specifically creates: `CountryRecord`, `TranspositionStatus`, `LegalBasis`, `Art12_3Position`,
`Art7_2Standing`, `EqualityBody`, `DiscoveryHint`, `EU_COUNTRY_CODES`, `LAUNCH_COUNTRIES`, `resolve`,
`Provenance`, `ResolvedFact`, `seedFromNim`, `dedupeNimRows`, `nullSentinel`, `degradationFor`,
`freshnessGate`, `assertNoUnchangedBump`; the emitted, committed `packages/country-data/country.schema.json`;
27 country data files and 5 proposal files; the test files `schema.test.ts`, `coverage.test.ts`,
`resolve.test.ts`, `freshness.test.ts`; and the corrected statements of LEGAL-05, LEGAL-08 and LTR-16
in `.planning/REQUIREMENTS.md`. None of these symbols or paths exists before this phase.
</artifacts_this_phase_produces>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| SPARQL register response → seeded country record | An external register's notification dump becomes the transposition status a worker reads |
| Agent-drafted proposal → promoted data record | The point where an unverified draft would become a legally-operative assertion |
| Country record → letter and share card | A stale or wrong field travels inside an artefact a worker sends to their employer |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-1-14 | Tampering | `seed-from-nim.ts` auto-promoting a register entry to `legal_basis` | high | mitigate | The script writes register rows only as `discovery_hints` and writes every legally-operative field as `pending_verification` with value null. A launch-country legally-operative field with status `verified` and a null `verified_by` fails `superRefine`, so the promotion boundary is structural rather than procedural. Asserted by a test over the seeded output. |
| T-1-15 | Spoofing | A plausible-looking statute number entering a country record | high | mitigate | The anti-hallucination invariant: any statute or journal-reference pattern must sit inside a fact whose status is `verified` with at least one source; combined with the pending-must-be-null rule, an unsourced statute string cannot be expressed. Plan 05 wires the pattern lint into CI. |
| T-1-16 | Information disclosure | A `source_url` in a seeded or proposed record pointing at an attacker-chosen host | high | mitigate | Every source URL in every seeded and proposed file is passed through `assertFetchable` for its own country before the file is written, and again by the pull-request lint in plan 05. |
| T-1-17 | Repudiation | `verified_at` advancing without a value change | medium | mitigate | `assertNoUnchangedBump` makes it a mechanical rule; plan 05 wires it into the pull-request lint so it is not a hope about review attention. |
| T-1-18 | Denial of service | A global freshness hard gate darkening the site on an unrelated change | medium | mitigate | `freshnessGate` fails only for launch-country legally-operative verified facts; everything else degrades in the UI with the last-confirmed date and keeps working (D-10). |
| T-1-19 | Tampering | SPARQL endpoint slowness or a partial result silently producing an incomplete seed | medium | mitigate | The seed runs once, off both the pull-request and nightly paths, and `coverage.test.ts` asserts all 27 files exist with matching stems — a partial result fails the suite rather than committing a gap. |
| T-1-SC | Tampering | npm installs | high | mitigate | No package is installed by this plan; the audited, pinned set from plan 01 is unchanged. |
</threat_model>

<verification>
- `pnpm seed:nim` completes and reports 27 member states
- `pnpm vitest run packages/country-data/test/coverage.test.ts` passes with a reported file count of 27
- `pnpm vitest run packages/country-data/test/schema.test.ts` passes, and each of the four VALIDATION.md filters selects at least one case
- `pnpm vitest run packages/country-data/test/resolve.test.ts -t "fallback"` passes
- `pnpm vitest run packages/country-data/test/freshness.test.ts` passes with at least seven cases
- `pnpm vitest run --dir packages/country-data` passes with the plan 01 spine test still collected
- `.planning/REQUIREMENTS.md` carries the three reworded statements and still totals 85 v1 requirements
- Human check recorded above: maintainer promotion of the five launch-country proposals, harvested at end of phase
</verification>

<success_criteria>
1. All 27 member states exist as parsed, schema-valid records with a real, sourced transposition status and no guessed values.
2. Every legally-operative field is `pending_verification` until a maintainer promotes it with `verified_by` — a script or an agent cannot make the site more confident.
3. The Art. 12(3) option is a condition with named bodies, stored separately from the Art. 7(2) standing right, and a boolean at that position fails parse.
4. Staleness degrades 22 states' pages and hard-fails the build only for the launch five.
5. LEGAL-05, LEGAL-08 and LTR-16 read as the implementation actually behaves, with the rewording recorded as a visible decision.
</success_criteria>

<output>
Create `.planning/phases/01-ground-truth-and-governance/01-04-SUMMARY.md` when done.
Record in it: the live per-state notified-measure counts the SPARQL query actually returned (closing the
research's 21-versus-33 discrepancy for Slovakia with evidence), the twelve states observed with no
notified measure and the query date, the five proposal files with their chosen verification strategies,
the exact before-and-after text of the three reworded requirements, and the maintainer-promotion
checklist for the end-of-phase human review.
</output>
