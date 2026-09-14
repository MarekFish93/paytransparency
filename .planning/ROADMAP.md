# Roadmap: JAFN — "Ask about your pay"

## Overview

The project's risk is not in its engineering — the stack is settled and boring — it is in the
legal substrate the product's value rests on. So the journey runs from truth outward, and from
zero user input outward. It begins with a verification phase, not a coding phase: every Directive
article re-pulled from EUR-Lex primary text, all 27 member-state files seeded behind a `Fact<T>`
envelope that makes "pending verification" unforgeable, the community-contribution gates built
before the repo is public, and the three decisions that are expensive to change later — the
share-card URL contract, the calculation-convention taxonomy, and the golden vectors that are the
engine's spec — recorded as data rather than left as defaults. A design system lands next so the
status taxonomy and the share-card family are decided once instead of four times. Then the site
appears in its easiest possible form — 27 country pages with no input field anywhere — which is
where the CSP, Lighthouse, WCAG and zero-egress gates get established while they are trivially
satisfiable, so every later phase inherits a green baseline instead of trying to reach one. The
worker-facing doors then ship in ascending order of consequence: two calculators whose inputs stay
in the browser, then the Article 7 letter, which is the first artefact a worker sends to their own
employer and therefore the first that needs a duty-of-care layer. Only then does the employer side
arrive — the MIT engine, built purely mechanically against vectors that already exist, and the
Article 9 calculator on top of it, ending with the npm publish, the privacy proof and the Wave 1
press material.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Ground Truth and Governance** - Re-verified Directive text, 27 seeded country files, the CI gates that stop a wrong statute reaching a worker, and the decisions too expensive to change later
- [ ] **Phase 2: Design System** - One visual language, one status taxonomy and one share-card family, decided once and inherited by every later phase
- [ ] **Phase 3: Shell, Country Pages and the Zero-Egress Proof** - A deployed site with no input field anywhere, where the privacy claim is machine-proved and the quality gates are set on easy mode
- [ ] **Phase 4: Career Gap and Range-o-meter** - Two B2C calculators whose inputs never leave the browser, plus the honest framing and the bucketed share-card family
- [ ] **Phase 5: Article 7 Letter Generator** - The flagship worker artefact, correctly cited per country, with the duty-of-care layer around the act of sending it
- [ ] **Phase 6: directive-engine and the Payroll Worker** - The MIT engine built against the frozen vectors, published auditable, with payroll bytes confined to a Worker
- [ ] **Phase 7: Article 9 Calculator and Launch** - The employer door end to end, the npm publish, the privacy proof and the Wave 1 press material

## Phase Details

### Phase 1: Ground Truth and Governance

**Goal**: Every fact the product will assert is verified against a primary source, and every decision that is expensive to change later is recorded as data rather than left as a default
**Depends on**: Nothing (first phase)
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05, LEGAL-06, LEGAL-07, LEGAL-08, LEGAL-09, LEGAL-10, ENG-01, ENG-06, GAP-06
**Success Criteria** (what must be TRUE):

  1. Every Directive article the product cites — 3, 6, 7, 9, 10 and 12 — is quoted from EUR-Lex primary text and stored alongside the data, so no worker-facing claim rests on a reader proxy or a vendor page
  2. All 27 member-state files exist, each field carrying a source URL and a `verified_at` date or rendering as "pending verification": transposition status, legal basis, the two-month backstop wording, Art. 12(3) routing, the equality body and the anti-retaliation provision
  3. A contributor's pull request putting a wrong statute in the data is rejected before merge by schema validation, a per-country source-domain allowlist and a verifier that fails an empty 200 as loudly as it fails a 404 — tested with a deliberately bad PR before the repo is public
  4. A build fails when any fact is older than its freshness window, and the freshness window varies by how volatile the fact is
  5. Golden vectors and a frozen `EngineReport` type exist as reviewed data with no engine code written, and every calculation convention plus the share-URL parameter contract is a recorded decision the engine and the card must be given rather than assume

**Plans**: 7/7 plans executed in 3 waves

Plans:
**Wave 1**

- [x] 01-01-cellar-spine-PLAN.md — Prove the whole legal-data spine end to end on one fact: Cellar reachable from CI, Art. 7(4) retrieved by structural id, stored with provenance, verified, freshness-evaluated, and a deliberately broken copy rejected

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-verifier-strategies-PLAN.md — The five-strategy verification table, the pre-fetch allowlist guard, six captured response fixtures, the data-defect versus transport-failure split, and the nightly live profile with ETag-keyed caching
- [x] 01-03-directive-corpus-PLAN.md — Articles 3, 6, 7, 9, 10 and 12 in full across eleven authentic language versions, paragraph-tagged by the publisher's own ids, with the four inherited citation errors regression-locked
- [x] 01-04-country-schema-and-seeding-PLAN.md — The country record schema and emitted JSON Schema, all 27 states seeded from the Commission register, five launch countries drafted for maintainer promotion, and staleness that degrades rather than darkens
- [x] 01-06-frozen-contracts-PLAN.md — The frozen `EngineReport` with its amendment path, one recorded decision per calculation convention, the versioned share-URL contract, and ten hand-computed golden vectors

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-07-vector-rederivation-PLAN.md — Every golden vector independently re-derived by a separate agent, compared, with each disagreement fixed in the convention wording rather than in a number

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-05-governance-gates-PLAN.md — Nine policy lint rules on top of schema parse, the full governance document set, the written Polish gate, five rejected bad-PR drill cases, and the repository made public

**Open questions to resolve in this phase:**

- Which member states have taken the Art. 12(3) option of routing requests only via workers' representatives, the labour inspectorate or the equality body — a per-country field, needed during seeding because it changes what a worker should even ask for
- The Polish UPL position (no reserved monopoly on out-of-court advice, protected titles, art. 87 k.p.c. representation limits) is LOW confidence and search-derived; it needs a Polish-qualified check, and that check gates the Polish letter in Phase 5

### Phase 2: Design System

**Goal**: The visual language, the status taxonomy and the share-card family are decided once, on a phone-viewable canvas, so no later phase re-decides them
**Depends on**: Phase 1 (the share-card URL parameter contract must exist before the card family can be designed; the status vocabulary must match the states the data can actually hold)
**Requirements**: DSN-01, DSN-02, DSN-03, DSN-04, DSN-05, DSN-06, DSN-07
**Success Criteria** (what must be TRUE):

  1. A reviewer can open the design on a phone and see tokens, type scale and component language as a reviewable canvas before any shell code exists
  2. A single status vocabulary covering in force / from date / draft / pending / pending verification reads identically wherever a status appears — country selector, country page, letter preview and share card
  3. The share card is reviewed as a family across country and band on one canvas, and every member of that family stays legible at social-thumbnail size
  4. Every label, button and card holds Polish copy running 20–30% longer than English without truncating or breaking layout
  5. The Article 7 multi-step flow, the pending-country explainer and the Module D column mapper can be clicked through as interactive sketches, and each later frontend phase has a `UI-SPEC.md` contract to inherit rather than a visual language to re-invent

**Plans**: TBD
**UI hint**: yes

### Phase 3: Shell, Country Pages and the Zero-Egress Proof

**Goal**: The site is deployed and public in its easiest possible form — 27 country pages, no input field anywhere — with the privacy claim machine-proved and the quality gates established while they are trivially satisfiable
**Depends on**: Phase 1 (the data and its schema), Phase 2 (the design system)
**Requirements**: LEGAL-11, LEGAL-12, PRIV-01, PRIV-02, PRIV-03, PRIV-04, PRIV-05, I18N-01, I18N-02, I18N-03, QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):

  1. Anyone can open a country page for any of the 27 member states in English or Polish and see its status, legal basis, deadline and equality body, each showing its source and verified date — with "draft" wherever the source says draft and "pending verification" wherever nothing has been checked, never a guessed value
  2. A Playwright oracle types sentinel values against the deployed URL, records every request, and reports that no request carried a sentinel and that every outbound origin was inside the allowlist — and a deliberate-leak test turns it red
  3. That oracle's JSON output is what the README publishes as the privacy proof, regenerated on every deploy rather than screenshotted once
  4. A strict CSP is verified in-browser on a real preview deployment, with no third-party scripts, no remotely-fetched fonts, and analytics that is same-origin, cookieless and carries counts only
  5. The deployed site scores Lighthouse 100 across all four categories, meets WCAG AA, works mobile-first, and every CTA is exercised by a Playwright smoke suite that gates the deploy — and locale switching leaves no cookie behind

**Plans**: TBD
**UI hint**: yes

**Architectural decisions that belong in this phase, not later:**

- Header-and-meta CSP is enforced by browsers as an **intersection** — a hand-written `_headers` `script-src` will silently block Astro's own hashed hydration scripts. Astro owns `script-src` and `style-src` via the meta tag; `_headers` omits both directives entirely
- `<ClientRouter />` is incompatible with `security.csp` — decide now, not after four modules assume view transitions

**Open question to resolve in this phase:**

- Whether Cloudflare Pages `_headers` reliably applies a CSP to a Web Worker script path, and whether target browsers enforce it — a one-hour spike here, because it decides whether Phase 6's "the worker cannot call fetch" is a code-review claim or a browser-enforced one

### Phase 4: Career Gap and Range-o-meter

**Goal**: A worker can see what the pay gap has cost them and share it honestly, and a job seeker can check whether a salary range is straight — with every input staying in the browser
**Depends on**: Phase 3 (deployed shell, i18n, quality gates), Phase 2 (share-card family, result-screen design)
**Requirements**: GAP-01, GAP-02, GAP-03, GAP-04, GAP-05, GAP-07, GAP-08, GAP-09, RNG-01, RNG-02, RNG-03, RNG-04
**Success Criteria** (what must be TRUE):

  1. A worker enters country, sector, current gross pay and years worked and sees both what the gap has cost so far and a projection to retirement, with every assumption stated on the page rather than buried
  2. Before the worker can share anything, they are told plainly that the unadjusted gap is not the same as discrimination and what the Directive actually targets, and can open a methodology page documenting the calculation, its data vintage and its limits
  3. A shared card is served from the build-time family, is legible at social-thumbnail size in every locale, and the URL that gets transmitted carries only coarse bucketed values — the real inputs stay after the fragment marker and are never sent
  4. A worker on mobile shares a locally-rendered card image through the native share sheet, and one whose browser cannot gets a copy-link path that is a designed fallback rather than a dead button
  5. A job seeker pastes a salary range and gets an honesty score against a published, versioned rubric covering presence, spread ratio, gross-versus-net clarity, currency and period ambiguity, and B2B-versus-employment-contract ambiguity — with nothing they pasted stored or transmitted

**Plans**: TBD
**UI hint**: yes

**Resolved before this phase starts:** job-ad URL parsing is out of v1 (no portal sends permissive CORS, and a proxy would mean egress). The URL field is dropped, not left as a broken affordance.

**Open question to resolve in this phase:**

- Real `navigator.canShare({files})` support on the specific mobile browsers carrying launch traffic — this decides whether client-side card rendering is the primary share path or a progressive enhancement over copy-link

### Phase 5: Article 7 Letter Generator

**Goal**: A worker in any member state gets a correctly cited, legally-grounded letter they can send — and is walked through what sending it means before it is handed over
**Depends on**: Phase 3 (shell, country data rendering), Phase 1 (the country schema, the verification gates and the Directive fallback), Phase 2 (the multi-step flow sketch). **Maintainer prerequisite, not a phase deliverable:** Art. 6, 7 and 12(3) facts for the launch countries (PL, SK, IT, LT, MT) must be promoted from `pending_verification` before letters ship. D-06 reserves that promotion to a human who has read the primary source, so no phase can discharge it — Phase 1 delivered the machine and the fallback, and until promotion a letter correctly cites the Directive article itself rather than a national one. Recorded 2026-09-14 at phase-01 UAT.
**Requirements**: LTR-01, LTR-02, LTR-03, LTR-04, LTR-05, LTR-06, LTR-07, LTR-08, LTR-09, LTR-10, LTR-11, LTR-12, LTR-13, LTR-14, LTR-15, LTR-16, LTR-17, I18N-04
**Success Criteria** (what must be TRUE):

  1. A worker selects their country, sees its status, legal basis, response deadline, anti-retaliation note and equality body, and — where that state took the Art. 12(3) option — is routed to workers' representatives or the equality body rather than direct to the employer
  2. The generated letter cites Art. 7 for own pay level and average pay levels by sex, and Art. 6 for pay-setting and progression criteria; it is available in English for any of the 27 states carrying that state's own citation, and in Polish in formal register that a native speaker has reviewed for legal register — with every template snapshot-tested per locale so a data change shows up as a diff of the worker-visible letter
  3. Before the letter is handed over, the worker is warned that Art. 7(6) lets an employer require information about others' pay be used only to exercise the equal-pay right, and — in a small organisation — that their own request may identify them and their comparison group; the not-legal-advice disclaimer and the equality-body link travel inside every exported artefact, not just on the page
  4. The worker can copy the letter, download it as `.txt`, `.pdf` and `.docx` with Polish diacritics rendering correctly in the PDF, and open it in their mail client — and none of what they typed is ever transmitted
  5. The worker can download an `.ics` reminder, return later to a browser-local countdown on the response deadline, and generate an escalation letter once it lapses; a worker in a country where the law is still pending instead sees what is already in force, what is coming and when, and can save a local-only bookmark with no email captured

**Plans**: TBD
**UI hint**: yes

### Phase 6: directive-engine and the Payroll Worker

**Goal**: The arithmetic underneath the employer door is publicly auditable, installable on its own, and physically separated from anything that can reach the network
**Depends on**: Phase 1 (the golden vectors and the convention taxonomy are the executable spec). Independent of Phases 3–5 — the B2C launch never waits on this
**Requirements**: ENG-02, ENG-03, ENG-04, ENG-05, EMP-13
**Success Criteria** (what must be TRUE):

  1. A compensation analyst can install `directive-engine` from npm under MIT and reproduce every golden vector, from a README they can audit without reading the source
  2. The engine throws with a named code when a calculation convention is missing — denominator, median rule, quartile tie rule, part-time handling — rather than silently defaulting to one
  3. CI proves the MIT/AGPL boundary by packing the engine, building it in a clean directory with empty `node_modules` and running the vectors there, so zero runtime dependencies is a demonstrated property rather than a claim
  4. The README shows one fixture computed under three different conventions producing three different answers, turning the Directive's silences into the project's evidence of rigour
  5. A realistic payroll file is parsed off the main thread and only the small report crosses back, so the browser stays responsive and raw rows never reach a scope that has network access

**Plans**: TBD

**Open question to resolve in this phase:**

- Realistic payroll file sizes in the 100–1,000 employee segment — this sets the XLSX memory budget and decides how much of the Worker design is about audit-surface reduction versus actual throughput

### Phase 7: Article 9 Calculator and Launch

**Goal**: An HR person gets the seven Article 9 metrics from their own payroll file with zero network requests carrying their data — and the project is auditable and ready for Wave 1
**Depends on**: Phase 6 (the engine and the worker protocol), Phase 3 (shell and quality gates), Phase 2 (the column-mapper sketch)
**Requirements**: EMP-01, EMP-02, EMP-03, EMP-04, EMP-05, EMP-06, EMP-07, EMP-08, EMP-09, EMP-10, EMP-11, EMP-12, EMP-14, LNCH-01, LNCH-02, LNCH-03
**Success Criteria** (what must be TRUE):

  1. An HR user uploads a payroll CSV or XLSX, maps their own column names to the engine's fields, and sees a validation report and a round-trip echo of how their rows were actually read — before any metric is computed
  2. The HR user receives all seven Art. 9(1) metrics with every category at or above the five-percent Art. 10 threshold flagged, the privacy suppression flag presented separately from the statistical-reliability flag, and the tool refusing to infer worker categories from job titles because Art. 3(1)(h) makes them employer-defined
  3. Dirty, ambiguous or unparseable input fails visibly and says what it could not read, rather than producing a confidently wrong percentage
  4. The HR user exports a PDF marked as a draft requiring management confirmation per Art. 9(6), in a self-publishable mode and an authority-only mode per Art. 9(7), plus a JSON payload carrying the engine version, the suppression threshold and every convention applied — and sees the Járnhaus CTA below the output, never above it
  5. A visitor can audit the whole project from a README carrying the generated privacy proof, and the Show HN, Product Hunt and Polish press drafts plus demo material for the letter generator and the share card exist and have been reviewed

**Plans**: TBD
**UI hint**: yes

**Open question, scoped here but not blocking v1:**

- National small-group suppression thresholds outside Germany (IE, AT, SE, FR, LT, NL) are unverified. v1 ships a configurable threshold defaulting to null with the applied value emitted in the export; the resolved thresholds are needed before the v2 national adapters, not before this phase. Germany's six is § 12 EntgTranspG and belongs to the individual information right, not Art. 9 reporting

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Ground Truth and Governance | 7/7 | In Progress|  |
| 2. Design System | 0/TBD | Not started | - |
| 3. Shell, Country Pages and the Zero-Egress Proof | 0/TBD | Not started | - |
| 4. Career Gap and Range-o-meter | 0/TBD | Not started | - |
| 5. Article 7 Letter Generator | 0/TBD | Not started | - |
| 6. directive-engine and the Payroll Worker | 0/TBD | Not started | - |
| 7. Article 9 Calculator and Launch | 0/TBD | Not started | - |

## Deferred to v2

Not in this roadmap, tracked in REQUIREMENTS.md:

- `adapter-kit` plus national reporting adapters (V2-ADP-01, V2-ADP-02, V2-ADP-03) — only the NL draft template is publicly known to exist; adapter work is blocked on national templates being published as much as on engineering
- Remaining interface and letter locales (V2-LOC-01, V2-LOC-02, V2-LOC-03) — each carries a native-speaker review HITL step
- Module C bookmarklet or extension (V2-RNG-01), official-filings ranking (V2-RNG-02), embeddable widget (V2-OTH-01), works-council routing beyond Art. 12(3) (V2-OTH-02)

---
*Roadmap created: 2026-09-10*
