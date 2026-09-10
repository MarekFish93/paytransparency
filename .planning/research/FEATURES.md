# Feature Research

**Domain:** Worker-facing EU Pay Transparency Directive (2023/970) toolkit (Modules A/B/C) + free employer-facing Article 9 calculator (Module D)
**Researched:** 2026-09-10
**Confidence:** MEDIUM overall — see the sourcing note below

---

## Sourcing and verification note (read first)

Per the hard rule, nothing here invents a statute, deadline, authority or vendor capability.

**What I could verify directly (fetched the page myself):** beqom's product page, Syndio's EU PTD page, Syndio's transposition tracker structure, Figures' homepage, PayAnalytics' pay transparency page, Trusaic's EU guide, Justly's free calculator, salario.io's calculator, datarequests.org, the UK government gender pay gap service, SD Worx on minimum sample size, MDN's Web Share API page, Your Europe.

**What I could NOT verify and have marked accordingly:**

| Claim | Status | Why |
|---|---|---|
| Text of Articles 7 / 9 / 10 of Directive (EU) 2023/970 | **UNVERIFIED against primary source** | EUR-Lex (`eur-lex.europa.eu/eli/dir/2023/970/oj/eng` and the CELEX URL) returns an empty body to fetching. All Article content below is from **secondary** legal-commentary sources and **must be re-verified against EUR-Lex in Phase 0** before it reaches `country-data` or any letter template. |
| "EIGE hosts worker-side pay-request templates" (brief §2) | **UNVERIFIED** | The EIGE URLs tried returned 404 and search was intermittently unavailable. Do not repeat this claim publicly until someone lands on the actual EIGE page. |
| "fewer than six per sex" small-group suppression rule (PROJECT.md Module D) | **NOT A DIRECTIVE RULE** — see below | Verified the opposite: no EU-wide minimum exists. This is the single most important correction in this document. |
| My Data Done Right feature set | **UNVERIFIED** | The landing page returned only a title. |
| Vendor pricing | **NOT PUBLISHED** by any vendor examined | All are demo-gated. Any pricing claim in marketing copy would be unfounded. |

The GSD confidence seam classifies both `websearch` and `webfetch` as `LOW` transport. Where I fetched a **vendor's own page describing that vendor's own product**, I treat the capability claim as MEDIUM (the vendor is authoritative about what it sells, if optimistic). Where the claim is legal, I treat it as LOW pending EUR-Lex.

---

## Landscape summary by category

### 1. Article 9 employer calculators — the crowded side

The commercial market is real, enterprise-shaped, and demo-gated. What they actually ship:

| Vendor | Verified capabilities (from their own pages) | Notable |
|---|---|---|
| **beqom / PayAnalytics** ([pay equity & transparency](https://www.beqom.com/products/pay-equity-and-pay-transparency), [PayAnalytics](https://www.payanalytics.com/product/pay-transparency)) | Multivariate regression to find statistically significant gaps; "Automated Right-to-Information (RTI) fulfillment" that maps regional data and generates a compliant statement; "Remediation actions" pushing personalised adjustment recommendations to HR and line managers; country-specific configuration for SLAs and **anonymisation**; all official EU languages; audit trails | The only vendor that explicitly names **anonymisation as a per-country configuration** — i.e. they too treat suppression as configurable, not fixed |
| **Syndio** ([EU PTD](https://synd.io/eu-pay-transparency-directive/), [tracker](https://synd.io/resources/eu-pay-transparency-directive-transposition-tracker/)) | PayEQ finds gaps ≥5% with remediation budgets; **"Article 7 Reports" generated instantly in any EU language**; Global Pay Reports; Article 6 pay-policies heatmap | Publishes a **free, ungated** transposition tracker and a free "where must we report" calculator as the top-of-funnel |
| **Trusaic** ([EU centre](https://trusaic.com/resources/global-pay-transparency-center/eu/)) | PayParity; Regulatory Pay Transparency Reporting; Salary Range Finder; automated RTI workflows | Also publishes a **free Member State Transposition Monitor** with an interactive map |
| **Figures** ([figures.hr](https://www.figures.hr/)) | 3.5M-datapoint benchmarking, pay-gap reporting, salary bands, 30+ HRIS integrations | Homepage enumerates **no** Article 9 metrics; a competitor review says it "stops before Article 10 compliance" |
| **Personio** (per third-party review) | Gap reporting inside the HRIS | Same review: "no job evaluation or Article 10 workflow" |
| **Axios Analytics** ([mid-market checklist](https://axiosanalytics.com/en/resources/best-eu-pay-transparency-software-2026)) | DACH-native, integrated Article 10 workflow, targets 250–2,000 employees | Publishes the most useful competitive artefact on the market — a 5-point buying checklist |

**The buying checklist (Axios), which is effectively the credibility bar for Module D:**
1. Gender-neutral job evaluation (grouping roles by skills / effort / responsibility / working conditions)
2. All seven Article 9 metrics
3. Article 10 remediation workflow (documented justification, modelled corrections, joint assessment)
4. Works Council documentation — auditable methodology trail
5. **Transparent methodology — reproducible rule-based logic an auditor or court can follow; avoid unexplained model outputs**

Point 5 is where a free, open-source, browser-only calculator *beats* the paid tools rather than merely imitating them. beqom's headline is multivariate regression; a works council in Germany cannot audit a regression. `directive-engine` with golden vectors and MIT source is the *more* defensible artefact for the specific job of "compute the seven numbers correctly."

**Free competition today is thin.** The closest free artefact found is [Justly's Google Sheets calculator](https://justly.company/templates/gender-pay-gap-calculator) — mean/median gap, bonus gap, quartiles, an "equality timer", explicit no-warranty disclaimer, and a caution that under ~30 employees the unadjusted gap is misleading. It is **UK-metric-shaped, not Article 9-shaped**. No free browser-only Article 9 calculator was found.

**On national report templates:** no vendor examined publishes what a national template actually looks like on a public page. The Netherlands draft form (brief §6) is the only concrete one referenced. Treat "country adapters" as a plugin *interface* shipped empty-ish at v1 rather than as four working adapters — see Anti-Features.

**On small-group suppression — the correction.** [SD Worx](https://www.sdworx.com/en-en/resources/payroll-reward/whats-minimum-sample-size-pay-gap-reporting-and-what-if-we-dont-meet-it) states the Directive sets **no EU-wide minimum group size**; employers must apply judgement aligned with GDPR, and the working guidance is to avoid publishing groups with **fewer than 3–5 people**, aggregating small groups into broader job families or masking figures. Secondary reporting attributes a **six-person** recommendation to Germany's Advisory Commission (unverified at source). Consequences for Module D:

- The threshold must be a **configurable parameter with a default and a visible rationale**, never a hard-coded "6" presented as law.
- The UI copy must say "below your chosen suppression threshold", not "below the legal minimum".
- The engine must expose `suppressionThreshold` in its API and in the JSON export so the output is reproducible.
- SD Worx also flags the *statistical* problem separately from the *privacy* problem: "small samples can distort results". Two distinct flags, not one.

### 2. Legal-request / rights-letter generators — the closest structural analogue

[**datarequests.org**](https://www.datarequests.org/) is the reference implementation and the thing Module A should be measured against. Verified features:

- Multiple generators for distinct statutory rights (access, erasure, rectification, marketing objection) — plus a **separate complaint/admonition generator** for the escalation step
- A **searchable company database** users can add to
- The letter is generated and **the user sends it themselves**; the site states "we never get to see your data"
- The one-month deadline is surfaced, with **follow-up reminders**
- Guidance on escalating to the supervisory authority

Two structural lessons:

1. **The escalation artefact is a separate generator, not a paragraph.** They shipped a complaint generator because the first letter frequently gets ignored. Module A's equivalent is a follow-up/escalation letter to the national equality body when the two months lapse. This is the highest-value Module A v1.x feature and the brief does not currently name it.
2. **The company database is the part that carries the maintenance cost and the legal risk.** Do not clone it — see Anti-Features.

**The trust boundary, empirically:** in February 2025 the FTC [finalised an order against DoNotPay](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires) — $193,000, a prohibition on advertising that the service performs like a real lawyer without evidence, and mandatory notice to past subscribers. The complaint noted the company never hired or retained attorneys and never tested whether output matched a lawyer's. This is the concrete precedent behind every disclaimer decision in this project: **the liability attaches to the marketing claim, not to the artefact.** A tool that says "this is a template, here is the statute, here is the authority to escalate to" is in a different category from one that says "get your money back automatically."

### 3. Viral calculators with share cards

No usable published research was retrievable on "why calculators go viral" (search was down repeatedly). What I *can* ground:

- Existing pay-gap calculators are unimpressive and beatable. [salario.io/pay-gap-calculator](https://salario.io/pay-gap-calculator/) takes two salaries, returns a dollar difference, a percentage and a cents-on-the-dollar figure; it contextualises with lifetime loss (a US figure of ~$400,000 from 22 to 62 at 84 cents) and — creditably — carries an explicit raw-vs-adjusted comparison table. **It has no share feature.** That is the gap Module B occupies.
- The honesty framing is already table stakes among the credible ones: salario.io shows raw (16% US) next to adjusted (5–7%); Justly explicitly warns that unadjusted figures mislead under ~30 employees; [PayAnalytics publishes an explainer on the two gaps](https://www.payanalytics.com/resources/articles/the-unadjusted-pay-gap-vs-the-adjusted-pay-gap). An economist dunking on this tool is a *solved* problem if the raw/adjusted distinction is shown **inside the share card**, not just on the page.
- **Web Share API is not Baseline.** Per [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share): HTTPS secure context required, transient user activation required, `web-share` permissions policy required; full support on Android Chrome/Firefox, **partial on iOS Safari**, inconsistent on desktop; `navigator.canShare()` must gate any file share; `AbortError` on user cancel must be swallowed silently. **A copy-link fallback is mandatory, not optional** — and since the brief's viral traffic is mobile, the share button must never render a dead end.

**The share-card design constraint the brief has not resolved** (this is the most important finding in this document — see Anti-Features A1): the plan is "the URL itself carries the inputs, so nothing is stored server-side." That is true about *storage* and false about *egress*. The URL goes to the Cloudflare Worker that renders the OG image, into that Worker's request logs, into the referrer chain, into LinkedIn's and Facebook's crawler logs, and into the DM of whoever the user shares it with. If the URL carries `salary=8400`, the user has published their salary to a social network. The zero-egress claim is the product's entire trust position and this is the one place it is structurally at risk.

### 4. Salary-range / job-ad transparency scoring

**No product was found that scores a job ad's salary range for honesty.** Searches surfaced only benchmarking tools (Ravio, Pave, Comprehensive.io, Payscale, Carta) — none score range quality. Treat this as "no evidence found", not proof of absence, but it is consistent with the brief's framing that Module C is novel.

Signals that are defensible:

| Signal | Grounding | Confidence |
|---|---|---|
| Range presence at all | Directive Art. 5 / national transposition | LOW (needs EUR-Lex) |
| Spread ratio (max/min) | Commentary consensus that e.g. "80k–180k technically complies while signalling the company is hiding the number". No authoritative numeric threshold found; typical band widths quoted in the 30–50% region were **not verifiable** | LOW — **publish the thresholds as an opinionated, documented heuristic, versioned, not as a legal test** |
| Gross vs net clarity | Real ambiguity in CEE markets | MEDIUM |
| Currency / period ambiguity | Mechanical | HIGH |
| **Employment-type ambiguity (B2B vs employment contract)** | **Verified and legally load-bearing in Poland:** the December 2025 recruitment provisions apply only to prospective *employees*; they do **not** cover B2B or civil-law contracts (umowa zlecenia / umowa o dzieło) — [IBA](https://www.ibanet.org/pay-transparency-in-Polish-recruitment), [Littler](https://www.littler.com/news-analysis/asap/polish-employers-receive-gift-eu-pay-transparency-obligations-recruitment) | MEDIUM — the strongest single signal in Module C, and a genuine PL-market differentiator |

**On naming employers:** the precedent is more nuanced than "wall of shame = bad". The UK government itself runs [gender-pay-gap.service.gov.uk](https://gender-pay-gap.service.gov.uk/), which names every employer over 250, publishes their figures, and offers **bulk download of all data**. Naming employers over *their own statutory filings* is normal and state-sanctioned. What is dangerous is naming employers over **unverified user submissions** — that is a defamation surface, a moderation queue and a takedown process. The brief's H3 exclusion is right, but the reasoning should be sharpened to that distinction, because it opens a safe v2 path: a directory built from *official* national pay-gap filings, never from user-pasted job ads.

### 5. Multilingual legal-content sites

Two models, and the vendors do it better than the institutions.

**Syndio's tracker** (verified structure) is the one to beat: a 27-row table with columns Member State / Status (a narrative sentence, not a tag) / Draft Legislation Y/N / Final Legislation Y/N / Effective Date; **hyperlinked government sources on nearly every entry**; a "New!" marker on recent changes; a visible "last updated on [date]" line; **completely ungated**. Trusaic ships the same thing as an interactive map. beqom ships one too.

**[Your Europe](https://europa.eu/youreurope/citizens/work/work-abroad/equal-treatment/index_en.htm)** — 24 languages, a country selector, and it positions itself as a **guide to national websites rather than the authority**. It shows **no last-checked dates** and **no explicit pending/unavailable state**. That absence is the opportunity: a per-fact `verified_at` badge is something even the EU's own portal does not do.

Design conclusions for the country pages:
- Separate `Draft` from `Final` as **distinct boolean-ish fields**, exactly as Syndio does, rather than collapsing into one status string. The brief's "in force / from date / draft / pending" should be a *derived* label over structured fields.
- The status narrative sentence carries more trust than the tag. Ship both.
- `verified_at` per fact, not per country — a country page can have a verified equality body and an unverified deadline.
- "Pending verification" needs a designed empty state that reads as *rigour*, not as *unfinished*. The pattern that works: `— pending verification` in muted type with a "why?" link to the methodology page, next to the facts that *are* verified with their sources. Rows of dashes with no explanation read as abandonment.

### 6. Anti-features — see the dedicated section below

---

## Feature Landscape

### Table Stakes (Users Expect These)

#### Cross-cutting

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Every legal fact carries a source URL + `verified_at` | It is the only defence against being wrong in 27 jurisdictions, and no competitor does it | MEDIUM | Data-model requirement in `country-data`, not a UI feature. Per-fact, not per-country |
| Explicit "not legal advice" disclaimer on page **and** on every generated artefact | FTC/DoNotPay: liability attaches to the claim. Justly ships a no-warranty line on a free spreadsheet | LOW | Must survive PDF/DOCX export, not just live on the page |
| Link to the national equality body on every country page | The escalation path is what makes a rights tool real rather than a form | LOW | Depends on `country-data` |
| Zero-egress proof (network-tab screenshot in README, CSP `connect-src 'self'`) | It is the headline claim; an HR auditor will check | MEDIUM | Conflicts with several attractive features — see Anti-Features |
| Mobile-first, works on a phone with one thumb | Viral traffic is mobile | MEDIUM | — |
| WCAG AA | A tool about equality that excludes disabled users is a story | MEDIUM | — |
| No signup, no email, no cookie banner | The entire positioning | LOW | Falls out of the architecture |

#### Module A — Article 7 request generator

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Country selector → status, legal basis, deadline, frequency, anti-retaliation note, equality body | This is the whole value; datarequests.org's equivalent | MEDIUM | Depends on `country-data` seeded and verified |
| Letter generated entirely client-side, user sends it themselves | datarequests.org's "we never get to see your data" is why people trust it | LOW | — |
| Statutory citation printed **in** the letter | A letter without a citation is a complaint; a letter with one is a request under law | LOW | Depends on verified `country-data`. If unverified → cite Directive Art. 7 and say so |
| Explicit "please respond by [date]" line with a computed date | The deadline is the mechanism. datarequests.org surfaces the one-month GDPR clock prominently | LOW | Date arithmetic from the national deadline; must degrade to "within two months" when the national rule is unverified |
| Copy + `.txt` + `.pdf` + `.docx` + `mailto:` | HR still runs on Word and email attachments; a copy button alone loses the formal-register user | MEDIUM | `.docx` client-side is the fiddly one |
| English letter for any member state carrying that state's citation | Already in the brief; correctly identified as table stakes rather than a nice-to-have | MEDIUM | Depends on all 27 seeded |
| Pending-country mode that says what **is** already in force | In Poland the honest answer is "the recruitment provisions, not the request right" — getting this wrong is the fastest way to lose credibility in the home market | MEDIUM | Needs distinct copy per partial-transposition state |

#### Module B — Career gap calculator + share card

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| A single big number the user did not know before | Every calculator in this space leads with one | LOW | — |
| Raw-vs-adjusted honesty framing **visible before the share action** | salario.io, Justly and PayAnalytics all already do this. Shipping without it is now *below* the category norm | LOW copy / HIGH judgement | Marek reviews per the brief. Put the caveat on the card, not only the page |
| Named data source and reference year on screen ("Eurostat, unadjusted, 2024 reference year") | Without it the number is folklore | LOW | Cross-check on Eurostat directly per the brief |
| Copy-link fallback alongside `navigator.share()` | Web Share API is not Baseline; partial on iOS Safari, inconsistent on desktop | LOW | `navigator.canShare()` gate; swallow `AbortError` |
| Localised OG card | An untranslated card does not get shared in PL | MEDIUM | Satori + resvg-wasm in a Worker |

#### Module C — Range-o-meter

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Paste a range, get a score, no submission stored | The whole point | LOW | — |
| Per-signal breakdown, not just a score | A bare score is unfalsifiable and gets dismissed; a breakdown is arguable and therefore trusted | MEDIUM | — |
| Published, versioned scoring rubric | Same reason `directive-engine` needs golden vectors | LOW | Put it in the repo |
| Employment-type flag (B2B / civil-law vs employment contract) | Verified: the PL recruitment obligation does not reach B2B or umowa zlecenia/o dzieło | MEDIUM | The strongest signal; needs careful PL copy |

#### Module D — Article 9 calculator

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| All seven Article 9(1) metrics | Axios's checklist item 2; the minimum bar to be taken seriously | HIGH | Per Trusaic: mean gap; median gap; mean gap in complementary/variable; median gap in complementary/variable; proportion of each sex receiving complementary/variable; proportion of each sex per quartile pay band; gap by category of workers. **Re-verify against EUR-Lex Art. 9(1)(a)–(g) before coding** |
| ≥5% per-category flag | Every vendor leads with it | LOW | Art. 10 trigger — re-verify |
| CSV/XLSX in, entirely client-side | The differentiator and the claim | MEDIUM | XLSX parsing client-side adds bundle weight |
| Column mapping UI (their header names → engine fields) | No payroll export matches your schema. Without this the tool fails on the first real file and the HR user leaves | MEDIUM | The single most under-specified requirement in the brief for Module D |
| Validation/error report before computing (missing sex, zero pay, duplicate IDs, unparseable numbers, decimal comma) | HR data is dirty; a tool that silently computes on garbage is a toy | MEDIUM | Decimal comma and `1 234,56` are real in PL/DE/FR |
| Small-group flag with a **configurable, documented** threshold | See the correction above — no EU-wide rule exists | MEDIUM | Default + rationale + expose in JSON export |
| Separate "too small to publish" (privacy) from "too small to be meaningful" (statistics) | SD Worx treats them as distinct concerns | LOW | Two flags |
| PDF + JSON export | PDF for the meeting, JSON for the audit trail | MEDIUM | JSON must include inputs' *shape*, the engine version and every parameter used |
| Reproducible, rule-based, published methodology | Axios's checklist item 5, and the only place a free tool clearly beats beqom's regression | MEDIUM | MIT engine + golden vectors *is* the feature |
| Quartile boundary rule stated explicitly | Justly documents "guidance for quartile adjustments when employee counts aren't evenly divisible by four" — this is where two tools disagree and someone calls you wrong | LOW | Document the tie-breaking rule in the README |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Worker-side letter generator at all** | No competitor found. Every vendor builds the employer's *answer* (beqom's "Automated RTI fulfillment", Syndio's "Article 7 Reports"); nobody builds the worker's *question* | MEDIUM | The whole thesis |
| **`verified_at` on individual facts, surfaced in the UI** | Neither Your Europe nor any vendor tracker does per-fact verification dates | MEDIUM | Makes the site linkable by journalists — which is the distribution plan |
| **All-27 `country-data` as MIT/open JSON** | Syndio, Trusaic and beqom all publish free HTML trackers as lead magnets. None publish **machine-readable, diffable, PR-able** data. That is the version journalists cite and the community maintains | MEDIUM | Cheap relative to its distribution value |
| **`directive-engine` on npm, MIT, golden vectors** | Directly answers Axios's checklist item 5 (auditable methodology for works councils) better than the paid tools do | HIGH | The B2B lead magnet and the Show HN hook |
| **Escalation letter generator** (second artefact when the deadline lapses) | datarequests.org shipped exactly this as their v2 headline. It converts a one-shot tool into a returning one, without accounts | MEDIUM | v1.x, not v1. Depends on Module A + equality-body data |
| **Employment-type detection in Module C** | Legally grounded and specific to the PL market the launch targets | MEDIUM | See table stakes |
| Free browser-only Article 9 calculator with zero upload | The credible free competition is a Google Sheet. "Your payroll never leaves your laptop" is a stronger objection-handler for HR than any feature | MEDIUM | Prove it in the README |
| `.ics` deadline reminder | The only zero-egress way to do a reminder. Everyone else needs your email | LOW | Genuinely clever; keep it |
| Range-o-meter rubric published and versioned | Turns an opinion into a citable standard | LOW | — |

### Anti-Features (Commonly Requested, Often Problematic)

The brief already excludes accounts, server-side salary storage, legal advice, adjusted-gap econometrics, scraping, a public wall of shame, aggregate Module C stats, a paid tier and a database. Below are the ones **not yet in the brief**, ordered by how attractive-and-dangerous they are.

| # | Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|---|
| **A1** | **Raw salary inputs encoded in the share-card URL** | It is the stated Module B design: "the URL itself carries the inputs, so nothing is stored server-side" | **This is the one place the zero-egress claim structurally breaks.** The URL reaches the OG Worker (and its request logs), the referrer chain, LinkedIn/Facebook/X crawler logs, and every recipient of the share. Publishing `salary=8400` to a social network is worse than storing it. A single journalist noticing this kills the headline claim | Put only **derived, rounded, non-identifying** values in the URL — e.g. a gap percentage bucket, a country code, a rounded lifetime figure to the nearest 5k. Never a raw salary, never an age. Keep raw inputs in local state only. Set the Worker to log nothing. Verify with the same network-tab discipline used for the README proof. **This should be a Phase 1 acceptance criterion.** |
| **A2** | **Company/employer database with autocomplete** | datarequests.org has one and it is genuinely useful; typing an employer's legal name and address correctly is the hardest part of the letter | Any lookup is a network request with the employer name in it, which breaks `connect-src 'self'` and hands you a "who is asking about whom" log. Bundling a registry client-side means shipping megabytes and going stale. Also a moderation surface once users can add entries | Free-text fields with good placeholder examples per country, plus a static link to the national business register (KRS, HRB, etc.) so the user looks it up themselves |
| **A3** | **AI chat / "explain my situation" assistant** | Obvious, cheap-looking, and every 2026 tool has one | The FTC's DoNotPay order is exactly this failure mode: unevidenced claims that a service performs like a lawyer, $193k, mandatory subscriber notice. It also requires a server, which breaks the architecture, and it will confidently invent a statute number — the one thing the project's own agent rules forbid | Deterministic, cited, template-driven output. If explanation is needed, write it once per country and cite it |
| **A4** | **Machine-translated letters into the remaining 20+ languages** | It looks like a one-day win to cover all 27 markets and it is very tempting before a press wave | A mistranslated statutory citation or an informal register in a formal legal letter makes the artefact worse than nothing, and the error is invisible to you. The brief already gates locales on native-speaker review — the trap is doing it for *letters* under launch pressure | The brief's own answer is right and should be defended: an **English letter with the correct national citation**. Ship MT never; ship reviewed locales on the wave schedule |
| **A5** | **Sending the letter on the user's behalf** (SMTP relay, "we'll email your employer") | The single biggest conversion lever — users drop off at "now copy this into your email" | Requires a server, a sender reputation, the user's employer's address on your infrastructure, and it converts "informational tool" into "acting for the user", which is the DoNotPay boundary | `mailto:` with the body pre-filled, plus copy and download. The user's own outbox is also better evidence for them if it escalates |
| **A6** | **Email reminders for the two-month deadline** | The natural follow-up to the deadline being the mechanism; it is also the return-visit driver | An email address is an account by another name, plus a mailing list, plus a processor, plus a privacy policy, plus a GDPR obligation of your own — on a site whose selling point is that it has none of that | `.ics` (already planned) and the local-only bookmark page. Both already in the brief; they are the correct answers and should be labelled as such |
| **A7** | **Four working national reporting-template adapters at v1** | Written into the brief for Module D (PL, NL, LT, SK) | Only one national template (the NL draft, still in consultation to 11 Sep 2026) is even known to exist publicly; the others are drafts or absent. Building four adapters against moving drafts burns Phase 3 and ships four things that will be wrong by January | Ship the **plugin interface** plus one reference adapter against the best-documented template, with a conformance test and a "how to add your country" doc. Adapters are the community contribution surface — that is their real job |
| **A8** | **"Are you being discriminated against?" verdict / risk score** | Users will ask for it and it would be the most shareable output imaginable | It is a legal conclusion about a specific person from four inputs. It is also exactly the claim the FTC penalised. And the honest answer is "the unadjusted gap cannot tell you this", which the honesty layer already has to say | The Directive's own test instead: per-category gap ≥5% unjustified → joint pay assessment. That is a statement about *employers*, cited, and defensible |
| **A9** | **Retaliation-risk assessment ("is it safe to send this?")** | A real and sympathetic user fear, and the anti-retaliation note invites the question | Answering it wrongly can cost someone their job. It is jurisdiction-, employer- and situation-specific and cannot be computed | State the anti-retaliation protection with its citation, name the equality body and the union/works-council route, and stop. Optionally link national trade-union confederations |
| **A10** | **Browser extension for job boards (Module C)** | The obvious distribution play — score every ad in place | Two store review processes, host permissions on job boards (a de facto scraping posture the brief already excludes), a permanent maintenance treadmill against DOM changes, and it moves user data into an extension context where the zero-egress proof no longer holds | A bookmarklet or a paste box. If distribution is the goal, the **embeddable widget** already in the brief's distribution plan is the safer surface — but scope it deliberately (see A11) |
| **A11** | **Embeddable widget shipped casually** | Named in the distribution plan; unions and media linking it is the growth story | An embed is a third-party script you now must version, CSP-document and support forever, and it inherits your zero-egress claim onto sites you do not control. Shipped as an afterthought it becomes the least-tested, most-visible surface | Ship an `<iframe>` embed with a documented, versioned URL contract and its own Playwright smoke test — or ship a static, linkable OG card and a "link to us" snippet at v1 and defer the real embed |
| **A12** | **Employer-response upload / "did they answer correctly?" checker** | Genuinely valuable and the natural sequel to sending a letter | It means accepting a document that contains colleagues' pay data. Even client-side, the *invitation to upload* is what a critic will screenshot, and it needs to be right about what a compliant answer looks like in 27 states | A printed **checklist** of what a compliant Article 7 answer must contain, per country, with citations. Same value, no upload, no claim |
| **A13** | **Server-side PDF/DOCX rendering** | Simpler and prettier than client-side generation, and the Worker already exists for OG images | Sending the letter body — name, employer, job title — to a Worker to render is the same class of breach as A1, and harder to spot because it looks like infrastructure | Client-side generation only. The Worker's *only* job stays OG images, as the constraint already says. Enforce it in CSP and in the smoke test |
| **A14** | **Leaderboards / counters ("12,431 letters generated")** | Powerful social proof and the brief's own success metric | Cloudflare Web Analytics counts are aggregate and not publicly queryable; building a public counter means an endpoint, which means state, which means the database the brief excludes | Report the metric in launch posts from the analytics dashboard, manually. Do not put a live counter on the site |
| **A15** | **A "gap" number for someone whose sector/country data is missing** | Falling back to the EU average of 11.1% keeps the funnel intact | A silently substituted number that the user believes is about *their* sector is the exact failure the `verified_at` discipline exists to prevent | Show the EU average **explicitly labelled as a fallback**, or show "pending verification" for that sector. Same rule as the legal facts |
| **A16** | **Naming employers from user-pasted job ads** | The H3 wall-of-shame temptation | Unverified user submissions about named parties = defamation surface + moderation + takedown + storage. Note the *distinction*: the UK government names every 250+ employer over their **own statutory filings** and offers bulk download — that is safe because the source is official | Keep H3 excluded for user submissions. The safe v2 path, if one is wanted, is a directory built **only** from official national pay-gap filings, with the filing linked |

---

## Feature Dependencies

```
packages/country-data (27 states, sources, verified_at)
    ├──requires──> Phase 0 verification pass against EUR-Lex + national sources
    ├──enables──> Module A country selector
    ├──enables──> Module A letter citations + computed deadline
    ├──enables──> .ics reminder (needs the national deadline)
    ├──enables──> escalation letter (needs the equality body)  [v1.x]
    └──enables──> the public country-status pages (the journalist/SEO asset)

packages/directive-engine (Art. 9 metrics, Art. 10 threshold, golden vectors)
    ├──requires──> EUR-Lex-verified Article 9(1)(a)-(g) definitions
    ├──requires──> a documented quartile boundary rule
    ├──requires──> a configurable suppressionThreshold parameter
    ├──enables──> Module D calculator
    ├──enables──> Module D PDF/JSON export (JSON must embed engine version + params)
    └──enables──> adapter plugin interface
                      └──enables──> national report adapters  [community / v1.x]

Module D CSV/XLSX upload
    ├──requires──> column mapping UI       (blocker: real payroll exports never match a schema)
    └──requires──> validation/error report (blocker: dirty data, decimal commas)

Module B share card
    ├──requires──> Eurostat gap data by country + NACE section
    ├──requires──> honesty-framing copy (Marek review)     [gate]
    ├──requires──> a URL parameter contract that excludes raw salary   [A1 - gate]
    └──requires──> navigator.canShare() gate + copy-link fallback

Module A letter exports (.pdf, .docx)
    └──requires──> client-side generation only  [conflicts with the OG Worker's existence - A13]

Module C
    └──requires──> a published, versioned scoring rubric (else the score is unfalsifiable)
    └──requires──> PL employment-type copy verified against the Dec-2025 provisions

CONFLICTS
  zero-egress claim  ──conflicts──> employer autocomplete (A2), AI chat (A3),
                                    email reminders (A6), live counters (A14),
                                    server-side rendering (A13)
  "no legal advice"  ──conflicts──> discrimination verdict (A8), retaliation score (A9)
  storage-free C     ──conflicts──> employer naming from user input (A16)
```

### Dependency Notes

- **`country-data` gates almost everything worker-facing.** Module A's selector, its citations, its deadline arithmetic, the `.ics` file and the escalation route all read from it. It is the critical path and it is a *verification* task, not a coding task. Phase 0 must finish it or Phase 2 stalls.
- **Column mapping gates Module D's usability, not its correctness.** The engine can be perfect and the tool still unusable if an HR user has to rename headers in Excel first. This is the requirement most likely to be discovered late.
- **The suppression threshold gates the JSON export's credibility.** If the parameter is not in the output, the report is not reproducible, which forfeits the one advantage the free tool has over beqom.
- **The share-URL contract gates the launch, not just Module B.** The privacy proof in the README is a single claim covering the whole site; A1 breaks it site-wide.
- **The honesty copy gates the share card.** Shipping the card before the raw-vs-adjusted framing is reviewed is the highest-variance mistake available, because virality is irreversible.

---

## MVP Definition

### Launch With (v1)

- [ ] `country-data` for all 27, every fact with a source URL + `verified_at`, unknowns as `null` + "pending verification" — *the critical-path asset and the linkable reference*
- [ ] Module A: country selector, client-side letter, statutory citation, computed response date, copy/`.txt`/`.pdf`/`.docx`/`mailto:`, disclaimer on the artefact, equality-body link
- [ ] Module A: English letter for any member state with that state's citation
- [ ] Module A: pending-country mode for Poland, accurate about what *is* in force
- [ ] Module B: gap number "so far" and "by retirement", named Eurostat source + reference year, raw-vs-adjusted honesty framing on page **and card**
- [ ] Module B: OG share card with a **derived-values-only URL contract**, `canShare()` gate, copy-link fallback
- [ ] Module C: paste-a-range score with per-signal breakdown, published rubric, employment-type flag
- [ ] Module D: seven Article 9 metrics, ≥5% flag, **column mapping**, **validation report**, configurable small-group flag, PDF + JSON export with engine version and parameters
- [ ] `directive-engine` on npm, MIT, golden vectors, auditable README
- [ ] `.ics` deadline reminder
- [ ] Zero-egress proof in the README; CSP verified; Playwright on every CTA

### Add After Validation (v1.x)

- [ ] **Escalation / follow-up letter generator** when the deadline lapses — *trigger: first reports of ignored requests, or 2 months after launch* — the datarequests.org v2 move, and the best return-visit driver that needs no account
- [ ] Checklist: "what a compliant Article 7 answer must contain" per country — *trigger: users asking whether the reply they got is adequate* (the safe form of A12)
- [ ] One reference national report adapter + conformance test + contributor doc — *trigger: the NL template exits consultation, or a first community PR*
- [ ] Works-council / union routing where national law channels requests that way — *trigger: per-country data confirms it*
- [ ] Versioned `<iframe>` embed with its own smoke test — *trigger: an actual union or newsroom asks to embed*

### Future Consideration (v2+)

- [ ] Directory of employers built **only** from official national pay-gap filings — defer until at least one member state publishes a filings register worth linking (the UK model, applied to EU states)
- [ ] Article 10 joint-pay-assessment workflow support in Module D — defer; it is a document-and-consult process, not a calculation, and it is where the paid vendors legitimately earn their money
- [ ] Gender-neutral job-evaluation helper (Axios checklist item 1) — defer; it is consulting work wearing a UI
- [ ] Additional locales on the wave schedule — defer per locale until a native-speaker review is booked

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| `country-data` verified, all 27 | HIGH | MEDIUM (verification-bound) | P1 |
| Module A letter + citation + deadline + exports | HIGH | MEDIUM | P1 |
| Derived-values-only share URL contract (A1 fix) | HIGH (existential) | LOW | P1 |
| Module B number + honesty framing | HIGH | LOW | P1 |
| Module D seven metrics + ≥5% flag | HIGH | HIGH | P1 |
| Module D column mapping | HIGH | MEDIUM | P1 |
| Module D validation/error report | HIGH | MEDIUM | P1 |
| `directive-engine` MIT + golden vectors | HIGH (B2B lead) | HIGH | P1 |
| Configurable suppression threshold + docs | MEDIUM | LOW | P1 |
| Copy-link fallback for share | MEDIUM | LOW | P1 |
| Module C score + rubric + employment type | MEDIUM | MEDIUM | P1 |
| `.ics` reminder | MEDIUM | LOW | P1 |
| Escalation letter generator | HIGH | MEDIUM | P2 |
| Compliant-answer checklist | MEDIUM | LOW | P2 |
| One reference national adapter | MEDIUM | MEDIUM | P2 |
| Works-council routing | MEDIUM | MEDIUM | P2 |
| Versioned embed | MEDIUM | MEDIUM | P2 |
| Official-filings employer directory | MEDIUM | HIGH | P3 |
| Article 10 workflow support | LOW (for us) | HIGH | P3 |
| Job-evaluation helper | LOW | HIGH | P3 |

---

## Competitor Feature Analysis

### Employer side (Module D)

| Feature | beqom / PayAnalytics | Syndio | Trusaic | Figures | Justly (free sheet) | Our approach |
|---|---|---|---|---|---|---|
| Seven Article 9 metrics | Implied, not enumerated publicly | Implied | **Enumerated publicly** | Not enumerated | UK-shaped, not Art. 9 | Enumerate them, compute them, golden-vector them |
| Methodology | Multivariate regression | PayEQ (proprietary) | PayParity (proprietary) | "insights" | Open spreadsheet formulas | **Open source, rule-based, auditable** — Axios's #5 |
| Small-group handling | Per-country anonymisation config | Not stated | Not stated | Not stated | Warns under ~30 employees | Configurable threshold, documented, in the JSON export; privacy flag ≠ statistics flag |
| Data location | Vendor cloud | Vendor cloud | Vendor cloud | Vendor cloud | User's Google Drive | **User's browser. Nothing leaves.** |
| Report output | Compliance reports, EU languages | Article 7 + Global Pay reports | Regulatory Pay Transparency Reporting | Analytics | Spreadsheet | PDF + reproducible JSON |
| National templates | "country-specific configurations" | Not shown publicly | Not shown publicly | — | — | Plugin interface + one reference adapter |
| Article 10 workflow | Yes | Yes | Yes | No (per Axios) | No | Out of scope — flag the trigger, don't run the process |
| Price | Demo-gated | Demo-gated | Demo-gated | Demo-gated | Free | Free |
| Free lead magnet | Tracker | **Ungated tracker + reporting calculator** | **Ungated tracker + map** | Blog | The sheet itself | The **whole calculator**, plus machine-readable `country-data` |

### Worker side (Modules A/B/C) — adjacent analogues

| Feature | datarequests.org | salario.io | Levels.fyi | UK GPG service | Our approach |
|---|---|---|---|---|---|
| Statutory letter generator | Yes, multiple rights | — | — | — | Yes, Article 7, 27 states |
| Client-side / "we never see your data" | Yes, stated | n/a | No (contribution-based) | n/a | Yes, and proven |
| Company database | Yes, user-extensible | — | Company pages | Official filings | **No** — free text + registry link (A2) |
| Deadline surfaced | Yes, one month + reminders | — | — | — | Computed date in the letter + `.ics` |
| Escalation artefact | **Yes, separate complaint generator** | — | — | — | v1.x |
| Share card | — | **No** | No | — | **Yes** — the open lane |
| Honesty framing on the gap | n/a | Yes, raw vs adjusted table | n/a | n/a | Yes, on the card too |
| Names employers | Yes (as request targets) | — | Yes (salary data) | Yes (official filings) | **No** in v1 (H3); official-filings-only path in v2 |

---

## Sources

**Employer-side vendors (fetched directly)**
- beqom — https://www.beqom.com/products/pay-equity-and-pay-transparency
- beqom / PayAnalytics — https://www.payanalytics.com/product/pay-transparency
- PayAnalytics, unadjusted vs adjusted gap — https://www.payanalytics.com/resources/articles/the-unadjusted-pay-gap-vs-the-adjusted-pay-gap
- Syndio — https://synd.io/eu-pay-transparency-directive/
- Syndio transposition tracker — https://synd.io/resources/eu-pay-transparency-directive-transposition-tracker/
- Trusaic EU guide (seven metrics enumerated) — https://trusaic.com/resources/global-pay-transparency-center/eu/
- Figures — https://www.figures.hr/
- Axios Analytics, mid-market buying checklist and vendor comparison — https://axiosanalytics.com/en/resources/best-eu-pay-transparency-software-2026
- Justly free gender + ethnicity pay gap calculator — https://justly.company/templates/gender-pay-gap-calculator

**Small-group suppression**
- SD Worx, minimum sample size for pay gap reporting — https://www.sdworx.com/en-en/resources/payroll-reward/whats-minimum-sample-size-pay-gap-reporting-and-what-if-we-dont-meet-it

**Directive content (SECONDARY — re-verify against EUR-Lex)**
- L&E Global, employer summary of Art. 7 / 9 / 10 — https://leglobal.law/2023/08/23/eu-the-eu-pay-transparency-directive-what-employers-need-to-know/
- Trusaic (as above) for the enumerated seven metrics
- EUR-Lex primary text — https://eur-lex.europa.eu/eli/dir/2023/970/oj/eng — **could not be fetched; verification outstanding**

**Poland**
- International Bar Association, pay transparency in Polish recruitment — https://www.ibanet.org/pay-transparency-in-Polish-recruitment
- Littler, Polish employers and recruitment obligations — https://www.littler.com/news-analysis/asap/polish-employers-receive-gift-eu-pay-transparency-obligations-recruitment

**Rights-letter generators and the trust boundary**
- datarequests.org — https://www.datarequests.org/
- FTC final order against DoNotPay (Feb 2025) — https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires
- FTC case page — https://www.ftc.gov/legal-library/browse/cases-proceedings/donotpay

**Worker-facing pay tools and share mechanics**
- salario.io pay gap calculator — https://salario.io/pay-gap-calculator/
- Levels.fyi — https://www.levels.fyi/
- MDN, Web Share API (`navigator.share`) — https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share

**Public pay-gap registers and multilingual legal presentation**
- UK Gender pay gap service — https://gender-pay-gap.service.gov.uk/
- Your Europe, equal treatment at work — https://europa.eu/youreurope/citizens/work/work-abroad/equal-treatment/index_en.htm

---
*Feature research for: EU Pay Transparency Directive worker toolkit + free Article 9 employer calculator*
*Researched: 2026-09-10*
