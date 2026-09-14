# Project brief: paytransparency — "Ask about your pay"

> Paste this whole file as the first message of a new Claude Code session, then run your GSD
> project-initialisation command (e.g. `/gsd-new-project` or whatever `@opengsd/gsd-core`
> exposes in your setup) and point it at this brief. Sections 9–11 are written to map
> directly onto GSD phases, HITL decisions and definition of done.
>
> **Naming note, added 2026-09-14.** This brief was written under the working codename
> "Jafn" (Old Norse for *equal / even*), recorded at the time as a placeholder pending HITL
> decision H1. That decision has since been taken: the project is **`paytransparency`**,
> named after the Directive rather than after a verdict about pay. The rest of this brief is
> left as written, as the historical record of what was originally asked for.

---

## 1. One-liner

A free, no-signup, privacy-first toolkit for **employees anywhere in the EU** to use their new
rights under the Pay Transparency Directive (EU) 2023/970:

1. generate a legally-grounded **pay-information request** (Article 7) in their country's language,
2. see **what the pay gap has cost them over a career** (shareable card),
3. rate the honesty of **salary ranges in job ads** ("range-o-meter").

Under the hood sits an **open-source Directive 2023/970 engine** that also powers a second door
for employers: an in-browser **Article 9 gender-pay-gap calculator** for HR. Both doors live on one
domain. The B2C side is the traffic engine; the B2B side is the lead engine for Járnhaus
(custom internal tools, SaaS replacement, agentic development).

## 2. Why this, why now

- The Directive gives every EU worker the right to ask for their own pay level and the average pay
  levels, broken down by sex, for workers doing the same work or work of equal value — once a year,
  with an employer response deadline of two months. Employers must also remind workers of this right
  annually.
- Every vendor on the market (beqom, Syndio, Papaya, Evenpay, Cleira, Figures…) builds tooling for
  the **employer** to answer requests. The only worker-side artefact found is a set of text templates
  on EIGE's site. Nobody builds for the worker because the worker doesn't pay. That is the gap.
- Distribution flywheel: workers send requests → HR has a 2-month statutory deadline → HR searches
  for tooling → lands on our Article 9 calculator → Járnhaus CTA. One product, two audiences.
- Timing: transposition deadline was 7 June 2026. Only a handful of states made it; a second wave
  lands 1 January 2027; Poland's full act is still in parliament. Each national go-live is a
  free news cycle.

## 3. Users and jobs-to-be-done

| Persona | Job | Door |
|---|---|---|
| Employee in any EU state (mobile, arrives from TikTok/LinkedIn/Reddit/press) | "Am I underpaid? What can I legally ask, and how?" | B2C |
| Job seeker | "Is this salary range real or a 1–99 999 joke?" | B2C |
| HR / comp & ben in a 100–1 000 employee company | "Compute the seven Article 9 metrics from our payroll export, find categories ≥5%, before the regulator does." | B2B |
| Journalist / HR creator / union | "Give me a number and a tool I can link." | Amplifier |

## 4. Product scope

### Module A — Article 7 request generator (B2C, core)

- **Country selector** → shows: transposition status (in force / from date / draft / pending),
  legal basis (national article where known, else Directive Art. 7), response deadline
  (2 months unless national law says otherwise), frequency (annual), anti-retaliation note, and the
  national equality body to escalate to.
- **Inputs** (never leave the browser): name, employer, job title / category, what is requested
  (own pay level; average pay by sex for same/equal-value work; criteria for pay, pay levels and
  progression). Optional: works-council / union route where national law channels requests that way.
- **Output**: letter in the country's official language(s) + English, formal register, with
  statutory citation and a "please respond within N" line. Copy, download (`.txt`, `.pdf`,
  `.docx`), `mailto:` link. Optional `.ics` reminder for the response deadline.
- **Disclaimer**: informational tool, not legal advice; links to the national equality body.
- Pending-country mode (e.g. Poland today): explain what is in force already (recruitment
  provisions), what is coming, and offer "notify me when it lands" via a local-only bookmark
  page — **no email capture, no accounts** in v1.

### Module B — Career gap calculator + share card (B2C, virality)

- **Inputs**: country, sector (NACE section), current gross pay, age or years worked, optional
  custom gap override.
- **Calculation**: Eurostat unadjusted gender pay gap by country and sector, applied over the years
  already worked and projected to retirement age; show both "so far" and "by retirement". Keep the
  model simple and documented; no econometrics in v1.
- **Honesty layer**: explain clearly that the unadjusted gap is not the same as discrimination and
  what the Directive actually targets (per-category gap ≥5% → joint pay assessment). This tool must
  not be embarrassable by an economist.
- **Share card**: OG image (1200×630) rendered from URL params by an edge function; the URL itself
  carries the inputs (no server storage). Localised. Copy-link + native share sheet on mobile.

### Module C — Range-o-meter (B2C, phase 2)

- Paste a salary range (or a job-ad URL — **parse only if the portal allows it; no scraping in
  v1**) → honesty score: presence, spread ratio (max/min), gross vs net clarity, currency/period
  ambiguity, employment-type ambiguity (B2B vs employment in PL).
- v1 is **calculator only**. A public "wall of shame" ranking by portal/employer is a separate HITL
  decision (H3) because it needs moderation, takedown handling and a facts-only policy.

### Module D — Article 9 gap calculator for employers (B2B door)

- CSV/XLSX upload processed **entirely client-side**; nothing leaves the browser (this is the
  headline claim — enforce it in CSP and prove it in the README with a network-tab screenshot).
- Computes the seven Article 9(1) metrics: mean and median gender pay gap; mean and median gap in
  complementary/variable components; proportion of each sex receiving complementary/variable
  components; proportion of each sex in each pay quartile; gap by category of workers, split into
  basic and complementary/variable.
- Flags every category at or above the 5% Article 10 threshold; flags small groups (fewer than six
  per sex in a category) for suppression/aggregation.
- Exports a report (PDF + JSON). **Country adapters** are a plugin interface: each adapter maps the
  engine output to a national reporting template (start with PL, NL, LT, SK; keep the interface
  open so the community can add the rest).
- CTA: "Need this wired into your HRIS / payroll, or a custom internal tool? Járnhaus builds these."

### Explicit non-goals (v1)

- No accounts, no server-side storage of any salary data, ever.
- No legal advice; no adjusted-gap econometrics; no job-portal scraping; no employer naming
  without the H3 decision; no paid tier in v1 (the B2B door's monetisation is Járnhaus services).

## 5. Architecture and constraints

- **Stack (recommended, confirm in Phase 0)**: Astro 5 + TypeScript + Tailwind 4, islands with
  React for the interactive modules — same stack as jarnhaus.dev, deployed on Cloudflare Pages.
  Edge functions (Cloudflare Workers) only for OG image generation (satori + resvg-wasm) and
  nothing else. No database.
- **Monorepo layout**:
  - `packages/directive-engine` — pure TypeScript, zero runtime deps, Article 9 metrics + Article
    10 threshold logic, golden test vectors, published to npm under an OSI licence (H2).
  - `packages/country-data` — one JSON per member state: status, effective dates, legal basis,
    deadlines, equality body, sources, `verified_at`. This is data, not prose, so it can be
    diffed and community-maintained.
  - `packages/letters` — Article 7 templates per country/language, snapshot-tested.
  - `packages/adapters-*` — national reporting-template adapters for Module D.
  - `apps/web` — the site.
- **Privacy**: strict CSP (`connect-src 'self'` plus analytics only), cookieless analytics
  (Cloudflare Web Analytics or Plausible), no third-party scripts. Analytics events are counts only
  ("letter_generated", "card_shared"), never payloads.
- **i18n**: Astro i18n routing; message catalogues; RTL not needed. Language priority:
  EN, PL, SK, IT, LT (countries in force + home market) → DE, NL, CS, SV, DA (1 Jan 2027 wave) →
  the rest. Maltese: English is an official language in Malta; treat MT as EN unless H4 says
  otherwise.
- **Quality bar**: Lighthouse 100/100/100/100, WCAG AA, mobile-first (the viral traffic is
  mobile), Playwright smoke test on every CTA before any deploy — never ship a page whose CTAs
  haven't been exercised end-to-end (this is a hard rule from a previous Járnhaus launch).
- **Legal-content rule for agents**: every legal fact in `country-data` must carry a source URL and
  `verified_at`. Agents must verify via web search at build time and must never invent a statute
  number, deadline or authority. Unknown → `null` + "pending verification" in the UI, not a guess.

## 6. Known facts to seed `country-data` (as of 10 Sep 2026 — re-verify every one)

| Area | Fact | Source to re-check |
|---|---|---|
| Directive | Art. 7 right to information: own pay level + average by sex for same/equal-value work; annual; 2-month response; annual reminder duty (Art. 7(3)) | mirro.io guide; papayaglobal.com guide |
| Directive | Art. 9: seven metrics; Art. 10: ≥5% per category without objective justification, not remedied in 6 months → joint pay assessment | deel.com "calculate every metric"; axiosanalytics.com |
| Directive | Reporting: 250+ annually from 7 Jun 2027 (2026 data); 150–249 every 3 years from 7 Jun 2027; 100–149 from 7 Jun 2031 | ey.com PL; varico.pl |
| EU stat | Eurostat unadjusted GPG, EU average 11.1% (2024 reference year) | justparity.com stats page → cross-check on Eurostat |
| On time (in force 7 Jun 2026) | Slovakia, Italy, Lithuania, Malta | morganlewis.com; littler.com |
| Slovakia | Pay-gap report filing deadline 15 April in the national draft | synd.io tracker |
| Lithuania | Implementing regulations 17 Jul 2026, in force 31 Jul 2026; data submitted to Sodra | iuslaboris.com |
| Greece | Law 5316 published 6 Jul 2026, full transposition | iuslaboris.com |
| Estonia | Partial transposition in force 13 Jul 2026 | iuslaboris.com |
| 1 Jan 2027 wave | Netherlands, Sweden, Czech Republic, Denmark | morganlewis.com |
| Netherlands | Draft reporting form/template/data spec published 9 Jul 2026, consultation to 11 Sep 2026 | iuslaboris.com |
| Belgium | Requested a 6-month extension from the Commission (June 2026) | beqom.com tracker |
| Germany | Bundestag press notice on transposition 16 Jul 2026 — initial steps only | iuslaboris.com |
| Ireland | Will miss the deadline; phased implementation; job-evaluation toolkit commissioned | littler.com |
| Poland | Recruitment provisions in force since 24 Dec 2025 (salary info before interview at the latest, salary-history ban, gender-neutral titles); full act still in parliament; April 2026 draft moves entry into force to 6 months after publication; fines in drafts up to 60 000 PLN | ifirma.pl; inforlex.pl; szkolenia-css.pl; varico.pl |
| Poland | Partially transposed per Littler's June 2026 classification | littler.com |

Where the table says "draft", the UI must say "draft" too.

## 7. Distribution plan (tracked as GSD tasks, not code)

**Pre-launch checklist**: domain (H1), README with the privacy proof, two 10-second demo GIFs
(letter generated; share card), OG cards for every locale, "Show HN" draft (lead with the open-source
engine), Product Hunt draft, one-paragraph press pitch per country in the local language.

**Wave 1 — Poland (first, home turf, law pending = tension)**: ship Module B + Module C
calculator + Module A in pending-country mode with a live "what's already in force" explainer.
Channels: LinkedIn (HR and pay-transparency posts are the most-shared HR content in PL right now),
r/Polska, Wykop, HR media (PulsHR, HRnews), consumer finance press (Business Insider Polska,
Money.pl, Bezprawnik) — pitch the career-gap number, not the tool. Ask unions and women's
organisations to link; offer an embeddable widget.

**Wave 2 — EU (in-force countries)**: Module A live for SK, IT, LT, MT. Channels: Show HN
(open-source engine), r/InternetIsBeautiful (after a niche-sub post lands — this is the FormulaBot
pattern: niche sub → IIB → creators), r/AskEurope, r/Slovakia, r/italy, r/lithuania, LinkedIn EN
comp & ben community, HR creators on TikTok/LinkedIn.

**Wave 3 — 1 Jan 2027 wave**: NL, SE, CZ, DK localisations shipped in December; re-launch on
their go-live date with country-specific press pitches.

**Wave 4 — each further transposition** (DE, BE, IE, PL full act…): a localisation + a news-cycle
post. Poland's full act is the biggest single spike — be live before publication in Dziennik Ustaw.

**Metrics that matter**: letters generated, cards shared, press/creator pickups, GitHub stars,
inbound to Járnhaus via the Module D CTA. Not signups (there are none).

## 8. Working agreements for the agent crew

- Spec-driven; every module gets a spec with acceptance criteria before code.
- `directive-engine`: TDD with golden vectors — build the worked example first, then the code.
- Letters: snapshot tests per locale; a native-speaker review task is a HITL step per language.
- Legal facts: source + `verified_at` or it doesn't ship.
- Deploy gate: Playwright smoke on all CTAs green, Lighthouse 100s, CSP verified.
- Keep the honest-framing copy (Module B) reviewed by Marek before launch.

## 9. Suggested GSD phases

| Phase | Goal | Key outputs |
|---|---|---|
| 0 — Research & decisions | Verify Section 6, pick stack, resolve H1–H4, Eurostat data pull | `country-data` seeded with sources; ADRs |
| 1 — Web shell + Module B | Site skeleton, i18n (EN, PL), career calculator, OG share card worker, analytics, deploy gate | Public site, first shareable thing |
| 2 — Module A | Country data UI, letter templates EN/PL/SK/IT/LT, exports, `.ics`, pending-country mode | Article 7 generator live |
| 3 — Module D + engine | `directive-engine` (Art. 9/10) with golden tests, CSV upload, report export, Járnhaus CTA, README privacy proof, npm publish | Employer door + Show HN material |
| 4 — Module C | Range-o-meter calculator | UGC-free version |
| 5 — Adapters + wave 3 | PL/NL/LT/SK adapters, DE/NL/CS/SV/DA locales, December re-launch prep | Ready for 1 Jan 2027 |

## 10. HITL decisions to put to Marek early

- **H1** Name and domain (standalone brand vs `*.jarnhaus.dev` subdomain). Recommendation:
  standalone brand for the B2C side, "built by Járnhaus" footer, Module D under the same domain.
- **H2** Licence for the engine and letters (MIT vs AGPL). Recommendation: MIT for the engine
  (maximise adoption/stars), AGPL for the web app if you want to prevent hosted clones.
- **H3** Public wall-of-shame for salary ranges: yes/no, and if yes, the moderation and takedown
  policy. Recommendation: not in v1.
- **H4** Maltese localisation: EN only vs full MT.
- **H5** Analytics vendor (Cloudflare Web Analytics vs Plausible).

## 11. Definition of done for v1 (end of Phase 3)

- A visitor from a phone in Warsaw, Bratislava, Rome or Vilnius can, without an account: get a
  career-gap number and share it as a card; generate and download an Article 7 letter in their
  language (or see exactly what's pending in Poland); and an HR person can upload a payroll CSV and
  get the seven Article 9 metrics with ≥5% flags — all with zero network requests carrying user
  data.
- `directive-engine` is on npm with tests and a README that a compensation analyst can audit.
- Every legal statement on the site has a source and a verified date.
- All CTAs exercised by Playwright on the deployed URL; Lighthouse 100/100/100/100.
- Show HN, Product Hunt and PL press drafts exist and were reviewed.
