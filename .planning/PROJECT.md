# JAFN — "Ask about your pay" (working codename)

> **Name is a Phase 0 decision (H1).** "Jafn" is Old Norse for *equal / even* and is a
> placeholder. The resolved direction is a **standalone brand on its own domain**, with a
> "built by Járnhaus" footer and Module D living under the same domain. The brand name and
> domain itself must be chosen and registered in Phase 0.

## What This Is

A free, no-signup, privacy-first web toolkit that lets any employee in the EU actually use
their new rights under the Pay Transparency Directive (EU) 2023/970: generate a
legally-grounded pay-information request under Article 7, see what the pay gap has cost them
over a career, and check whether a salary range in a job ad is honest. Underneath sits an
open-source Directive 2023/970 engine that also powers a second door for employers — an
in-browser Article 9 gender-pay-gap calculator for HR. Both doors live on one domain: the
worker-facing side is the traffic engine, the employer-facing side is the lead engine for
Járnhaus.

## Core Value

A worker on a phone, with no account and no data ever leaving their browser, gets a correctly
cited, legally-grounded artefact in a language they can send — and can trust every legal
statement on the page because it carries a source and a verified date.

## Business Context

- **Customer**: Workers use it for free; HR teams arriving through the Article 9 calculator are
  the commercial audience. Nobody pays for the product itself.
- **Revenue model**: No paid tier. Monetisation is inbound Járnhaus services — custom internal
  tools, SaaS replacement, agentic development — via the Module D CTA.
- **Success metric**: Letters generated, cards shared, and inbound Járnhaus enquiries through
  Module D. Explicitly **not** signups — there are none.
- **Strategy notes**: See `jafn-project-brief.md` in the repo root for the full distribution
  plan (waves, channels, press pitches) and the seeded legal-fact table.

## The Distribution Bet

Workers send Article 7 requests → HR faces a two-month statutory response deadline → HR
searches for tooling to answer → lands on the Article 9 calculator → Járnhaus CTA. One
product, two audiences, one flywheel.

Every vendor on the market (beqom, Syndio, Papaya, Evenpay, Cleira, Figures) builds for the
**employer** answering the request. The only worker-side artefact found in the market is a set
of text templates on EIGE's site. Nobody builds for the worker because the worker doesn't pay.
That is the gap this project occupies.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Module A — Article 7 request generator (B2C, core)**

- [ ] Country selector covering **all 27 member states**, showing transposition status (in force
      / from date / draft / pending), legal basis (national article where known, else Directive
      Art. 7), response deadline, anti-retaliation note, the national equality body to escalate
      to, and whether that state has taken the **Art. 12(3)** option of routing requests only via
      workers' representatives, the labour inspectorate or the equality body — which changes what
      the worker should even ask for
- [ ] **Deadline stated as the Directive states it**: Art. 7(4) is *"within a reasonable period of
      time but in any event within two months"*. Two months is a backstop, not the standard, and
      the letter must not present it as the standard. **Corrects the brief.**
- [ ] **No annual frequency limit is asserted.** Art. 7 places no frequency limit on the worker;
      Art. 7(3) is the *employer's* annual duty to remind workers the right exists. **Corrects the
      brief**, which conflated the two.
- [ ] Letter inputs never leave the browser: name, employer, job title/category, and what is
      requested — **cited to the correct article**: own pay level and average pay levels broken
      down by sex for same or equal-value work under **Art. 7**; criteria for pay, pay levels and
      pay progression under **Art. 6**. **Corrects the brief**, which cited Art. 7 for both; a
      letter mis-citing Art. 7 for the Art. 6 material is wrong on its face to any HR lawyer.
- [ ] Optional works-council / union route where national law channels requests that way
- [ ] Letter output in EN and PL, formal register, with statutory citation and a "please respond
      within N" line
- [ ] **English letter available for any EU member state, carrying that country's correct
      national legal basis, deadline and equality body** — so workers in Slovakia, Italy,
      Lithuania and Malta have a usable, correctly cited artefact at launch even before their
      own locale ships
- [ ] Exports: copy, `.txt`, `.pdf`, `.docx`, `mailto:` link
- [ ] Optional `.ics` reminder for the response deadline
- [ ] Pending-country mode (Poland today): explain what is already in force, what is coming, and
      offer "notify me when it lands" as a local-only bookmark page — no email capture
- [ ] Disclaimer on every generated artefact: informational tool, not legal advice; link to the
      national equality body. Scoped against **Germany's RDG** — § 2(1) captures activity needing
      legal examination of an individual case, while BGH I ZR 113/20 (smartlaw) held a
      form-driven document generator is not a Rechtsdienstleistung. Stay on the generator side of
      that line; § 7 permits unions and associations, which is why representative-first routing is
      legally easier and not merely polite.
- [ ] **Art. 7(6) duty-of-care warning at generation time**: employers may lawfully require that
      information obtained *other than the worker's own pay* is used only to exercise the equal-pay
      right. A worker who posts received category averages publicly may breach that requirement.
      The tool must say so before it hands over the letter, not in a footer.
- [ ] **Identifiability warning for small employers** — in a small team, a worker's own request can
      identify them and the comparison group; the UI must say this plainly rather than assume the
      anti-retaliation provisions make it moot.

**Module B — Career gap calculator + share card (B2C, virality)**

- [ ] Inputs: country, sector (NACE section), current gross pay, age or years worked, optional
      custom gap override
- [ ] Calculation from Eurostat unadjusted gender pay gap by country and sector, applied over
      years already worked and projected to retirement age; show both "so far" and "by
      retirement"; model kept simple and documented, no econometrics
- [ ] Honesty layer explaining that the unadjusted gap is not the same as discrimination, and
      what the Directive actually targets (per-category gap ≥5% → joint pay assessment). This
      must not be embarrassable by an economist.
- [ ] Share card: 1200×630, **default approach is build-time bucketed static cards** addressed by
      coarse, non-identifying params (country × band), with real inputs kept after the `#` —
      fragments are never transmitted. A dynamic edge-rendered card must justify itself against
      this default rather than being assumed. **Superseded the brief's original design**: research
      confirmed Cloudflare logs `ClientRequestURI` including the query string, and that Slack,
      LinkedIn, Facebook and X all unfurl server-side — so a salary in a query string is published
      to those logs, not merely "not stored". Signing params fixes abuse, not disclosure.
- [ ] Share-URL parameter contract agreed as a Phase 1 acceptance criterion, before any card is
      built: only derived, rounded, non-identifying values may appear in a transmitted URL
- [ ] Localised share card; copy-link and native share sheet on mobile

**Module C — Range-o-meter (B2C, in v1)**

- [ ] Paste a salary range → honesty score covering presence, spread ratio (max/min), gross vs
      net clarity, currency/period ambiguity, and employment-type ambiguity (B2B vs employment
      contract, which matters acutely in PL)
- [ ] Job-ad URL parsing is **unresolved and must be rescoped or dropped before Phase 4**:
      research found it cannot be done client-side at all, because no job portal sends permissive
      CORS. Options are a bookmarklet, a browser extension, or paste-only. Paste-only is the
      assumption until decided.
- [ ] Calculator only: no stored submissions, no rankings, no named employers

**Module D — Article 9 calculator for employers (B2B door)**

- [ ] CSV/XLSX upload processed entirely client-side; nothing leaves the browser
- [ ] Computes the seven Article 9(1) metrics: mean and median gender pay gap; mean and median
      gap in complementary/variable components; proportion of each sex receiving
      complementary/variable components; proportion of each sex in each pay quartile; gap by
      category of workers split into basic and complementary/variable
- [ ] Flags every category at or above the 5% Article 10 threshold
- [ ] Flags small groups for suppression or aggregation using a **configurable, documented
      threshold emitted in the JSON export** — and presents the privacy flag separately from the
      statistical-reliability flag. **Corrects the brief**: the Directive sets no EU-wide minimum
      group size; working guidance sits at 3–5, and the "six" figure traces (unverified) to
      Germany's Advisory Commission. Presenting 6 as law is the fastest way for a comp analyst to
      discredit the tool. The six-person figure is **§ 12 EntgTranspG — German national law
      governing the individual information right, not Art. 9 reporting**: wrong jurisdiction and
      wrong obligation. Whether any member state mandates its own threshold is a `country-data`
      field, not a global constant.
- [ ] Report export as PDF and JSON
- [ ] Country adapters exposed as a plugin interface so the community can add member states
- [ ] Járnhaus CTA: "Need this wired into your HRIS / payroll, or a custom internal tool?"

**Engine and data packages**

- [ ] `packages/directive-engine` — pure TypeScript, zero runtime deps, Article 9 metrics and
      Article 10 threshold logic, golden test vectors, published to npm under MIT
- [ ] `packages/country-data` — one JSON per member state (status, effective dates, legal basis,
      deadlines, equality body, sources, `verified_at`), all 27 seeded at v1
- [ ] `packages/letters` — Article 7 templates per country/language, snapshot-tested
- [ ] **Zero-egress oracle**: a Playwright test asserting no request carries user data, written
      in Phase 1 before there is anything to leak. Its JSON output *is* the README privacy proof —
      generated and re-run on every deploy, not a hand-taken screenshot that rots.

**Design system (settled early, inherited by every later phase)**

- [ ] Design tokens, type scale and component language, delivered as a reviewable
      Claude Design canvas (an Artifact link openable on a phone, since the traffic is mobile)
- [ ] **Status taxonomy** — a single visual vocabulary for "in force" / "from date" / "draft" /
      "pending" / "pending verification", used identically by the country selector, the country
      pages, the letter preview and the share card. This recurs in every module and is expensive
      to change late.
- [ ] **Share-card system, not a share card** — if the build-time bucketed approach holds, the
      deliverable is a family of cards (country × band) that must all read at LinkedIn thumbnail
      size. Designed and reviewed as a set, on one canvas.
- [ ] Interaction design for the multi-step flows proved as throwaway interactive HTML
      (`/gsd-sketch`), not static mockups: the Article 7 flow, the pending-country explainer,
      and the Module D column mapper
- [ ] Polish text-length slack designed in from the start (PL runs ~20–30% longer than EN)
- [ ] Legal disclaimers, citations and `verified_at` stamps given a readable, deliberate place
      in the type scale — they are legally load-bearing, not fine print to hide

**Cross-cutting**

- [ ] EN and PL interface locales live at v1
- [ ] Strict CSP, cookieless analytics, no third-party scripts
- [ ] Lighthouse 100/100/100/100, WCAG AA, mobile-first
- [ ] Playwright smoke test exercising every CTA on the deployed URL before any deploy

### Out of Scope

- **Accounts, signups, and any server-side storage of salary data** — the zero-egress claim is
  the product's headline and its entire trust position; storing anything would forfeit it
- **Legal advice** — the tool is informational; every artefact carries a disclaimer and a link
  to the national equality body
- **Adjusted-gap econometrics** — v1 uses the documented unadjusted Eurostat gap; anything more
  invites an argument the project cannot win and does not need
- **Job-portal scraping** — parse only where a portal's terms permit it
- **Public "wall of shame" naming employers or portals (H3)** — needs a moderation queue,
  takedown process and legal review; deferred out of v1 so Module C stays storage-free
- **Aggregate submission statistics for Module C** — would require server storage, breaking the
  "nothing leaves the browser" claim
- **Paid tier** — the B2B door's monetisation is Járnhaus services, not subscriptions
- **SK, IT, LT interface locales at v1 (deferred to v2)** — each locale carries a
  native-speaker review HITL step; those countries are served by the English letter with their
  own national citation until their locale ships
- **Full Maltese localisation (H4)** — English is an official language in Malta, so MT is served
  in EN with Maltese legal citations
- **A database of any kind** — Cloudflare Pages plus edge functions for OG rendering only

## Context

**Regulatory ground truth.** Article 7 gives every EU worker the right to request their own pay
level and the average pay levels broken down by sex for workers doing the same work or work of
equal value, once a year, with a two-month employer response deadline; Article 7(3) obliges
employers to remind workers of this right annually. Article 9 defines the seven reporting
metrics; Article 10 sets the ≥5% per-category threshold which, unjustified and unremedied
within six months, triggers a joint pay assessment. Reporting obligations phase in: 250+
employees annually from 7 June 2027 (on 2026 data), 150–249 every three years from 7 June 2027,
100–149 from 7 June 2031.

**Transposition state as of 10 September 2026 — every fact below must be re-verified during
Phase 0 and carries a source URL and `verified_at` in `country-data`:**

- In force on the 7 June 2026 deadline: Slovakia, Italy, Lithuania, Malta
- Slovakia: pay-gap report filing deadline of 15 April in the national draft
- Lithuania: implementing regulations 17 July 2026, in force 31 July 2026; data submitted to Sodra
- Greece: Law 5316 published 6 July 2026, full transposition
- Estonia: partial transposition in force 13 July 2026
- 1 January 2027 wave: Netherlands, Sweden, Czech Republic, Denmark
- Netherlands: draft reporting form, template and data spec published 9 July 2026, consultation
  to 11 September 2026
- Belgium: requested a six-month extension from the Commission (June 2026)
- Germany: Bundestag press notice on transposition 16 July 2026 — initial steps only
- Ireland: will miss the deadline; phased implementation; job-evaluation toolkit commissioned
- Poland: recruitment provisions in force since 24 December 2025 (salary information before the
  interview at the latest, salary-history ban, gender-neutral job titles); the full act is still
  in parliament; an April 2026 draft moves entry into force to six months after publication;
  drafts carry fines up to 60 000 PLN. Classified as partially transposed by Littler in June 2026.
- Eurostat unadjusted gender pay gap, EU average 11.1% (2024 reference year) — cross-check
  directly on Eurostat, not on secondary sources

Where the underlying source says "draft", the UI must say "draft" too.

**Timing as opportunity.** Each national go-live is a free news cycle. Poland's full act is the
single biggest expected spike — the site should be live before publication in Dziennik Ustaw.

**Prior art in the house.** jarnhaus.dev runs the same stack, so the shell is a known quantity
and research effort belongs on the legal data layer and the engine instead.

**Hard-won operational rule.** A previous Járnhaus launch shipped a page whose CTAs had not been
exercised end to end. Playwright smoke coverage on every CTA is a deploy gate, not a nicety.

## Constraints

- **Privacy**: No salary data may reach a server, ever — enforced in CSP (`connect-src 'self'`
  plus analytics only) and proved in the README. This is the product's entire trust position.
- **Tech stack**: Astro 7.3.2 + TypeScript + Tailwind 4, React islands for interactive modules,
  deployed on Cloudflare Pages. Locked, not a Phase 0 question. The major was raised from 5 to 7
  on research evidence: `security.csp` only became stable in Astro 6 (it is `experimental.csp` in
  5.x and was renamed breakingly within that line), and the zero-egress claim depends on it.
  `@astrojs/react` peer deps are byte-identical across majors, so islands port unchanged.
- **Edge functions**: Cloudflare Workers used *only* for OG image generation (satori +
  resvg-wasm). Nothing else runs server-side. No database.
- **Licensing**: MIT for `directive-engine` (maximise npm adoption — it is the B2B lead magnet);
  AGPL for the web app (prevent hosted clones).
- **Legal-content rule for agents**: every legal fact in `country-data` must carry a source URL
  and `verified_at`, verified by web search at build time. Agents must never invent a statute
  number, deadline or authority. Unknown → `null` plus "pending verification" in the UI, never a
  guess. **The verifier must assert a non-empty body and an expected anchor string** — EUR-Lex
  was observed returning empty 200 responses during research, and a verifier that "passes" on an
  empty 200 is worse than no verifier at all.
- **Article-level accuracy**: the Directive's own articles must not be conflated. Four errors
  inherited from the original brief were corrected at initialization (Art. 6 vs Art. 7 subject
  matter; no annual frequency limit on the worker; the two-month backstop wording; the German
  § 12 EntgTranspG six-person threshold misapplied as a Directive rule). Phase 0 must re-pull the
  Directive from EUR-Lex primary text — all research quotations reached us via a reader proxy.
- **Analytics**: Cloudflare Web Analytics — cookieless, no third-party origin in the CSP, counts
  only ("letter_generated", "card_shared"), never payloads.
- **Quality gate**: Lighthouse 100/100/100/100, WCAG AA, mobile-first (viral traffic is mobile),
  Playwright smoke on all CTAs green before any deploy.
- **i18n**: Astro i18n routing with message catalogues. RTL not needed. Locale priority after
  v1: SK, IT, LT (in force), then DE, NL, CS, SV, DA (1 Jan 2027 wave), then the rest.
- **Design process**: A design-system phase lands early and every later phase inherits it rather
  than re-deciding the visual language. Tooling split by what each is actually good at:
  **Claude Design canvas** for anything whose output is a picture or where variants must be
  compared at a glance (above all the share-card family and the career-gap result screen);
  **`/gsd-sketch`** for surfaces where behaviour *is* the design and a static mockup would lie
  (the Article 7 multi-step flow, the pending-country explainer, the Module D column mapper);
  **`UI-SPEC.md`** via `/gsd-ui-phase` as the binding contract underneath both; and
  **`/gsd-ui-review`** as the retroactive audit. `workflow.ui_phase` and `ui_safety_gate` are
  enabled in config.
- **Design constraints that invalidate mockups if ignored**: Polish runs ~20–30% longer than
  English, so every label, button and card needs slack; legal disclaimers and citations are long
  and must stay readable rather than be shrunk away; Lighthouse 100 caps the font and image
  budget; the share card must survive being rendered as a LinkedIn thumbnail.
- **Process**: Spec-driven — every module gets a spec with acceptance criteria before code.
  `directive-engine` is TDD with golden vectors: build the worked example first, then the code.
  Letters are snapshot-tested per locale. A native-speaker review is a HITL step per language.
  Module B's honest-framing copy is reviewed by Marek before launch.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1 includes all four modules (A, B, C, D) + engine, not just A/B/D | All three B2C doors launch together, so Wave 1 press has the full story and the range-o-meter rides the same traffic rather than waiting for a second launch | — Pending |
| Standalone brand on its own domain, "built by Járnhaus" footer, Module D on the same domain (H1) | The B2C side needs its own identity to be shareable and press-linkable; keeping Module D on the domain preserves the worker → HR → Járnhaus flywheel | — Pending |
| Brand name and domain deferred to a Phase 0 decision | "Jafn" was always a placeholder; naming deserves its own deliberate moment before anything is registered or printed on a share card | — Pending |
| MIT for `directive-engine`, AGPL for the web app (H2) | The engine is the B2B lead magnet, so adoption and stars matter more than copyleft; the app is the traffic asset and should not be trivially cloned and monetised | — Pending |
| Astro 7.3.2 + TS + Tailwind 4 + React islands on Cloudflare Pages, locked now | Stack shape matches jarnhaus.dev so it is a known quantity; the major was raised from 5 to 7 because `security.csp` is stable only from Astro 6 and the zero-egress claim rests on it. Astro 5's last patch was 5.18.2 (May 2026) | — Pending |
| SheetJS (`xlsx`) rejected for `read-excel-file` | The npm copy has been frozen at 0.18.5 since March 2022 with two HIGH advisories, patched only via SheetJS's own CDN — unacceptable distribution provenance for a product sold on auditability | — Pending |
| jsPDF over pdf-lib for client-side PDF | Measured: 208 KB brotli with built-in TTF subsetting versus 488 KB and no word wrap. Polish diacritics force font embedding either way, and pdf-lib's standard fonts cannot encode them | — Pending |
| EN + PL interface locales at v1; SK, IT, LT deferred | Each locale carries a native-speaker review HITL step; Wave 1 is Poland, and deferring four reviews is the difference between launching and not | — Pending |
| English letter available for any EU state with that state's correct national citation | Keeps Module A genuinely useful in Slovakia, Italy, Lithuania and Malta at launch despite EN/PL-only interface — otherwise the letter generator serves only a country where the law is still pending | — Pending |
| `country-data` covers all 27 member states at v1 | It is JSON with sources, not translated prose — cheap to seed, and it makes the site a linkable reference for journalists and unions from day one, plus the asset the community maintains by PR | — Pending |
| No public wall of shame in v1 (H3) | Naming employers needs a moderation queue, takedown handling and legal review; excluding it keeps Module C storage-free and the zero-egress claim absolute | — Pending |
| Cloudflare Web Analytics over Plausible (H5) | Free, same vendor as hosting, no third-party origin in the CSP — the tighter CSP is worth more than richer custom events for a project whose headline claim is zero egress | — Pending |
| Cut the "by retirement" projection before the "so far" figure, if Module B must shrink | The retrospective number is a defensible arithmetic statement; the projection multiplies every assumption and is where an economist would attack | — Pending |
| Module D refuses to infer worker categories from job titles | Art. 3(1)(h) makes "category of workers" employer-defined — inferring it would produce confidently wrong statutory metrics | — Pending |
| Malta served in English with Maltese legal citations (H4) | English is an official language in Malta; a full MT localisation needs a hard-to-source native-speaker review for ~530k people | — Pending |
| A design-system phase lands early; later phases inherit it via `/gsd-ui-phase` | The status taxonomy and the share-card family recur in every module and are expensive to change late — deciding the visual language four times is the failure mode being avoided | — Pending |
| Claude Design canvas for visual surfaces, `/gsd-sketch` for interactive flows | They answer different questions: a canvas compares many artboards at a glance (right for a share-card *family*), a sketch proves real responsive and interaction behaviour in a browser (right for multi-step flows and the column mapper) | — Pending |

## Definition of Done for v1

- A visitor from a phone in Warsaw can, without an account, get a career-gap number and share it
  as a card, check whether a job ad's salary range is honest, and see exactly what is already in
  force in Poland and what is pending.
- A visitor from Bratislava, Rome, Vilnius or Valletta can generate and download an Article 7
  letter in English carrying their own country's correct legal basis, deadline and equality body.
- An HR person can upload a payroll CSV and get the seven Article 9 metrics with ≥5% flags —
  with zero network requests carrying user data.
- `directive-engine` is on npm under MIT with golden-vector tests and a README a compensation
  analyst can audit.
- Every legal statement on the site has a source and a verified date; anything unverified says
  "pending verification" rather than guessing.
- All CTAs exercised by Playwright on the deployed URL; Lighthouse 100/100/100/100; CSP verified.
- Show HN, Product Hunt and Polish press drafts exist and have been reviewed.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Business Context check — customer, revenue model, success metric still accurate?
4. Audit Out of Scope — reasons still valid?
5. Update Context with current state (transposition status above will have moved)

---
*Last updated: 2026-09-10 after initialization*
