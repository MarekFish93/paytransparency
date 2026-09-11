# Requirements: JAFN — "Ask about your pay"

**Defined:** 2026-09-10
**Core Value:** A worker on a phone, with no account and no data ever leaving their browser, gets a correctly cited, legally-grounded artefact in a language they can send — and can trust every legal statement on the page because it carries a source and a verified date.

> Requirements marked **[research]** were surfaced by project research and are not in the
> original brief. Requirements marked **[corrects brief]** replace something the brief got wrong.

## v1 Requirements

### Legal data layer

- [ ] **LEGAL-01**: Every legal fact in `country-data` carries a source URL and a `verified_at` date, or renders as "pending verification"
- [ ] **LEGAL-02**: `country-data` covers all 27 member states with transposition status (in force / from date / draft / pending)
- [ ] **LEGAL-03**: Each country record states the legal basis — the national article where verified, otherwise the Directive article
- [ ] **LEGAL-04**: Each country record states the response deadline as *"within a reasonable period of time but in any event within two months"* unless national law verifiably sets a different period **[corrects brief]**
- [ ] **LEGAL-05**: Each country record states whether that state took the Art. 12(3) option of routing requests only via workers' representatives, the labour inspectorate or the equality body **[research]**
- [ ] **LEGAL-06**: Each country record names the national equality body and the applicable anti-retaliation provision
- [x] **LEGAL-07**: Directive Articles 3, 6, 7, 9, 10 and 12 are re-verified against EUR-Lex primary text, with quotations stored alongside the data **[research]**
- [ ] **LEGAL-08**: A build fails when any fact's `verified_at` is older than the agreed freshness window
- [x] **LEGAL-09**: The fact verifier asserts a non-empty response body and an expected anchor string, not merely HTTP 200 **[research]**
- [ ] **LEGAL-10**: A contributor can correct or add a country fact by pull request, gated by CI schema validation and source checking
- [ ] **LEGAL-11**: The UI never displays a guessed value — an unknown field renders as "pending verification"
- [ ] **LEGAL-12**: Where the underlying source says "draft", the UI says "draft"

### Module A — Article 7 request generator

- [ ] **LTR-01**: Worker selects their country and sees its status, legal basis, response deadline, anti-retaliation note and equality body
- [ ] **LTR-02**: Worker enters their details and those details are never transmitted
- [ ] **LTR-03**: Generated letter cites **Art. 7** for own pay level and average pay levels by sex, and **Art. 6** for pay-setting and progression criteria **[corrects brief]**
- [ ] **LTR-04**: Worker in any member state can generate an English letter carrying that state's own legal basis, deadline and equality body
- [ ] **LTR-05**: Worker in Poland can generate the letter in Polish, in formal register
- [ ] **LTR-06**: Worker can copy the letter, download it as `.txt`, `.pdf` and `.docx`, and open it in their mail client
- [ ] **LTR-07**: Generated PDF embeds a subsetted font covering Polish diacritics (`ą ć ę ł ń ś ź ż`)
- [ ] **LTR-08**: Worker can download an `.ics` reminder for the response deadline
- [ ] **LTR-09**: Worker can return to a browser-local countdown tracking when the deadline lapses **[research]**
- [ ] **LTR-10**: Worker can generate an escalation letter once the deadline has lapsed **[research]**
- [ ] **LTR-11**: Worker is warned, before the letter is delivered to them, that Art. 7(6) permits an employer to require that information about others' pay is used only to exercise the equal-pay right **[research]**
- [ ] **LTR-12**: Worker in a small organisation is warned that their request may identify them and their comparison group **[research]**
- [ ] **LTR-13**: Worker in a country where the law is pending sees what is already in force, what is coming, and when
- [ ] **LTR-14**: Worker can save a local-only bookmark to check back when their country's law lands — with no email capture
- [ ] **LTR-15**: Every generated artefact carries the not-legal-advice disclaimer and a link to the national equality body
- [ ] **LTR-16**: Where Art. 12(3) applies, the letter is routed to workers' representatives or the equality body rather than direct to the employer
- [ ] **LTR-17**: Every letter template is snapshot-tested per locale

### Module B — Career gap calculator and share card

- [ ] **GAP-01**: Worker enters country, sector, current gross pay and years worked
- [ ] **GAP-02**: Worker sees what the gap has cost them so far, derived from Eurostat unadjusted gap by country and sector
- [ ] **GAP-03**: Worker sees a projection to retirement, with its assumptions stated on the page
- [ ] **GAP-04**: Worker is told plainly that the unadjusted gap is not the same as discrimination, and what the Directive actually targets
- [ ] **GAP-05**: Worker can share a result card, served from a build-time family of bucketed static cards **[corrects brief]**
- [x] **GAP-06**: Any transmitted URL carries only derived, rounded, non-identifying values; real inputs stay in the fragment, which is never transmitted **[corrects brief]**
- [ ] **GAP-07**: Worker on mobile can share a locally-rendered card image through the native share sheet
- [ ] **GAP-08**: The card is legible at social-thumbnail size in every locale
- [ ] **GAP-09**: A methodology page documents the calculation, its data vintage and its limits

### Module C — Range-o-meter

- [ ] **RNG-01**: Job seeker pastes a salary range and receives an honesty score
- [ ] **RNG-02**: The scoring rubric is published and versioned as the project's own documented opinion, since no external standard exists **[research]**
- [ ] **RNG-03**: Scoring covers presence, spread ratio, gross-versus-net clarity, currency and period ambiguity, and employment-type ambiguity (B2B versus employment contract)
- [ ] **RNG-04**: Nothing the user pastes is stored or transmitted

### Module D — Article 9 calculator for employers

- [ ] **EMP-01**: HR user uploads a payroll CSV or XLSX and it is parsed entirely in the browser
- [ ] **EMP-02**: HR user maps their own column names to the engine's expected fields **[research]**
- [ ] **EMP-03**: HR user sees a validation report identifying dirty data before any metric is computed **[research]**
- [ ] **EMP-04**: HR user receives the seven Article 9(1) metrics
- [ ] **EMP-05**: Every category at or above the Article 10 five-percent threshold is flagged
- [ ] **EMP-06**: Small-group suppression uses a configurable, documented threshold that is emitted in the export **[corrects brief]**
- [ ] **EMP-07**: The privacy suppression flag is presented separately from the statistical-reliability flag **[research]**
- [ ] **EMP-08**: The tool refuses to infer worker categories from job titles, because Art. 3(1)(h) makes categories employer-defined **[research]**
- [ ] **EMP-09**: HR user exports a PDF report and a JSON payload, the JSON carrying the methodology and every convention applied
- [ ] **EMP-10**: The export is marked a draft requiring management confirmation, per Art. 9(6) **[research]**
- [ ] **EMP-11**: The tool distinguishes the metrics that may be self-published from those that may not, per Art. 9(7) **[research]**
- [ ] **EMP-12**: HR user sees the Járnhaus CTA on the results screen
- [ ] **EMP-13**: Parsing runs off the main thread and does not freeze the browser on a realistic payroll file
- [ ] **EMP-14**: Unparseable or ambiguous input fails visibly rather than producing a confidently wrong metric

### Engine

- [ ] **ENG-01**: Golden test vectors and a frozen `EngineReport` type exist as data before any engine code is written **[research]**
- [ ] **ENG-02**: `directive-engine` has zero runtime dependencies
- [ ] **ENG-03**: `directive-engine` is published to npm under MIT with tests and an auditable README
- [ ] **ENG-04**: The engine throws on a missing calculation convention rather than silently defaulting **[research]**
- [ ] **ENG-05**: CI proves the MIT/AGPL boundary by packing the engine, building it in a clean directory and running the golden vectors **[research]**
- [ ] **ENG-06**: Every calculation convention is documented — denominator, quartile construction by headcount, component treatment, part-time handling

### Design system

- [ ] **DSN-01**: Design tokens, type scale and component language exist as a reviewable canvas before the shell is built
- [ ] **DSN-02**: A single status taxonomy covers in force / from date / draft / pending / pending verification, used identically everywhere
- [ ] **DSN-03**: The share card is designed as a family across country and band, reviewed as a set
- [ ] **DSN-04**: Every label, button and card tolerates Polish text running 20–30% longer than English
- [ ] **DSN-05**: Disclaimers, citations and `verified_at` stamps have a readable, deliberate place in the type scale
- [ ] **DSN-06**: The Article 7 flow, the pending-country explainer and the Module D column mapper are proved as interactive sketches before implementation
- [ ] **DSN-07**: Every frontend phase carries a `UI-SPEC.md` inheriting the design system rather than re-deciding it

### Privacy

- [ ] **PRIV-01**: A Playwright oracle asserts that no request carries user data, using planted sentinel values against the deployed URL **[research]**
- [ ] **PRIV-02**: The oracle's output is the README privacy proof, regenerated on every deploy
- [ ] **PRIV-03**: A strict CSP ships and is verified in-browser, accounting for header-and-meta intersection
- [ ] **PRIV-04**: Analytics is same-origin, cookieless and counts-only, never carrying payloads or query strings
- [ ] **PRIV-05**: No third-party scripts and no remotely-fetched fonts

### Internationalisation

- [ ] **I18N-01**: EN and PL are live at launch
- [ ] **I18N-02**: A new locale can be added without touching the engine
- [ ] **I18N-03**: Locale selection uses no cookie, preserving the cookieless claim **[research]**
- [ ] **I18N-04**: Every shipped language passes a native-speaker review of its legal register

### Quality gates

- [ ] **QUAL-01**: Lighthouse scores 100 across all four categories
- [ ] **QUAL-02**: The site meets WCAG AA
- [ ] **QUAL-03**: A Playwright smoke suite exercises every CTA on the deployed URL and gates the deploy
- [ ] **QUAL-04**: Every surface works mobile-first

### Launch

- [ ] **LNCH-01**: README carries the generated privacy proof and is auditable by a compensation analyst
- [ ] **LNCH-02**: Show HN, Product Hunt and Polish press drafts exist and have been reviewed
- [ ] **LNCH-03**: Demo material exists for the letter generator and the share card

## v2 Requirements

Deferred. Tracked, not in the current roadmap.

### Locales

- **V2-LOC-01**: SK, IT and LT interface and letter locales
- **V2-LOC-02**: DE, NL, CS, SV and DA locales for the 1 January 2027 wave
- **V2-LOC-03**: Remaining member-state locales

### National reporting adapters

- **V2-ADP-01**: Reference adapter plus a documented plugin interface
- **V2-ADP-02**: PL, NL, LT and SK reporting-template adapters
- **V2-ADP-03**: National small-group suppression thresholds outside Germany

### Module C extensions

- **V2-RNG-01**: Bookmarklet or extension reading a job ad in the user's own page context, avoiding both CORS and egress
- **V2-RNG-02**: Ranking over official published filings — not over unverified user submissions

### Other

- **V2-OTH-01**: Embeddable widget for unions and women's organisations
- **V2-OTH-02**: Works-council and union routing beyond the Art. 12(3) cases

## Out of Scope

| Feature | Reason |
|---------|--------|
| Accounts and signups | The zero-egress claim is the entire trust position |
| Server-side storage of salary data | Same — and there is no database in the architecture |
| Legal advice | Informational only; keeps the tool inside Germany's RDG § 2(3) safe harbour and the smartlaw precedent |
| Adjusted-gap econometrics | Invites an argument the project cannot win and does not need |
| Job-ad URL parsing in v1 | Impossible client-side — no portal sends permissive CORS, and a proxy would mean egress |
| Job-portal scraping | Terms-of-service and legal exposure, no upside |
| Public wall of shame over user submissions | Needs a moderation queue, takedown process and legal review |
| Aggregate Module C submission statistics | Would require server storage, breaking the headline claim |
| Paid tier | Monetisation is Járnhaus services |
| Full Maltese localisation | English is an official language in Malta |
| Dynamic edge-rendered share cards | Leaks inputs to edge and crawler logs, and exceeds the Workers free-tier CPU limit |
| A database | No component of the product needs one |
| Citing any retaliation-prevalence statistic | Research found no verifiable source; the project does not publish numbers it cannot source |

## Traceability

Every v1 requirement maps to exactly one phase. See `.planning/ROADMAP.md` for phase goals and
success criteria.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEGAL-01 | Phase 1 | Pending |
| LEGAL-02 | Phase 1 | Pending |
| LEGAL-03 | Phase 1 | Pending |
| LEGAL-04 | Phase 1 | Pending |
| LEGAL-05 | Phase 1 | Pending |
| LEGAL-06 | Phase 1 | Pending |
| LEGAL-07 | Phase 1 | Complete |
| LEGAL-08 | Phase 1 | Pending |
| LEGAL-09 | Phase 1 | Complete |
| LEGAL-10 | Phase 1 | Pending |
| LEGAL-11 | Phase 3 | Pending |
| LEGAL-12 | Phase 3 | Pending |
| LTR-01 | Phase 5 | Pending |
| LTR-02 | Phase 5 | Pending |
| LTR-03 | Phase 5 | Pending |
| LTR-04 | Phase 5 | Pending |
| LTR-05 | Phase 5 | Pending |
| LTR-06 | Phase 5 | Pending |
| LTR-07 | Phase 5 | Pending |
| LTR-08 | Phase 5 | Pending |
| LTR-09 | Phase 5 | Pending |
| LTR-10 | Phase 5 | Pending |
| LTR-11 | Phase 5 | Pending |
| LTR-12 | Phase 5 | Pending |
| LTR-13 | Phase 5 | Pending |
| LTR-14 | Phase 5 | Pending |
| LTR-15 | Phase 5 | Pending |
| LTR-16 | Phase 5 | Pending |
| LTR-17 | Phase 5 | Pending |
| GAP-01 | Phase 4 | Pending |
| GAP-02 | Phase 4 | Pending |
| GAP-03 | Phase 4 | Pending |
| GAP-04 | Phase 4 | Pending |
| GAP-05 | Phase 4 | Pending |
| GAP-06 | Phase 1 | Complete |
| GAP-07 | Phase 4 | Pending |
| GAP-08 | Phase 4 | Pending |
| GAP-09 | Phase 4 | Pending |
| RNG-01 | Phase 4 | Pending |
| RNG-02 | Phase 4 | Pending |
| RNG-03 | Phase 4 | Pending |
| RNG-04 | Phase 4 | Pending |
| EMP-01 | Phase 7 | Pending |
| EMP-02 | Phase 7 | Pending |
| EMP-03 | Phase 7 | Pending |
| EMP-04 | Phase 7 | Pending |
| EMP-05 | Phase 7 | Pending |
| EMP-06 | Phase 7 | Pending |
| EMP-07 | Phase 7 | Pending |
| EMP-08 | Phase 7 | Pending |
| EMP-09 | Phase 7 | Pending |
| EMP-10 | Phase 7 | Pending |
| EMP-11 | Phase 7 | Pending |
| EMP-12 | Phase 7 | Pending |
| EMP-13 | Phase 6 | Pending |
| EMP-14 | Phase 7 | Pending |
| ENG-01 | Phase 1 | Pending |
| ENG-02 | Phase 6 | Pending |
| ENG-03 | Phase 6 | Pending |
| ENG-04 | Phase 6 | Pending |
| ENG-05 | Phase 6 | Pending |
| ENG-06 | Phase 1 | Pending |
| DSN-01 | Phase 2 | Pending |
| DSN-02 | Phase 2 | Pending |
| DSN-03 | Phase 2 | Pending |
| DSN-04 | Phase 2 | Pending |
| DSN-05 | Phase 2 | Pending |
| DSN-06 | Phase 2 | Pending |
| DSN-07 | Phase 2 | Pending |
| PRIV-01 | Phase 3 | Pending |
| PRIV-02 | Phase 3 | Pending |
| PRIV-03 | Phase 3 | Pending |
| PRIV-04 | Phase 3 | Pending |
| PRIV-05 | Phase 3 | Pending |
| I18N-01 | Phase 3 | Pending |
| I18N-02 | Phase 3 | Pending |
| I18N-03 | Phase 3 | Pending |
| I18N-04 | Phase 5 | Pending |
| QUAL-01 | Phase 3 | Pending |
| QUAL-02 | Phase 3 | Pending |
| QUAL-03 | Phase 3 | Pending |
| QUAL-04 | Phase 3 | Pending |
| LNCH-01 | Phase 7 | Pending |
| LNCH-02 | Phase 7 | Pending |
| LNCH-03 | Phase 7 | Pending |

**Phase totals:**

| Phase | Name | Requirements |
|-------|------|--------------|
| 1 | Ground Truth and Governance | 13 |
| 2 | Design System | 7 |
| 3 | Shell, Country Pages and the Zero-Egress Proof | 14 |
| 4 | Career Gap and Range-o-meter | 12 |
| 5 | Article 7 Letter Generator | 18 |
| 6 | directive-engine and the Payroll Worker | 5 |
| 7 | Article 9 Calculator and Launch | 16 |

**Coverage:**

- v1 requirements: 85 total
- Mapped to phases: 85
- Unmapped: 0
- Duplicated across phases: 0

---
*Requirements defined: 2026-09-10*
*Last updated: 2026-09-10 after roadmap creation (traceability populated)*
