# Pitfalls Research

**Domain:** Worker-facing EU legal-tech (statutory request generation across 27 jurisdictions) + employer-facing regulatory calculator, client-side only, community-maintained legal data
**Researched:** 2026-09-10
**Confidence:** MEDIUM overall — see "How to read confidence" below

---

## How to read confidence in this document

Per `gsd_run query classify-confidence`, **every finding obtained over `webfetch`/`websearch` is transport-tier LOW**, regardless of how authoritative the underlying document is. That is the correct default for this project and it is exactly the discipline `country-data` needs. I therefore tag each substantive claim two ways:

| Tag | Meaning |
|---|---|
| **[PRIMARY]** | Quoted from an official/legislative source (EUR-Lex, gesetze-im-internet.de, ec.europa.eu, gov.uk, ftc.gov). Substantively authoritative; transport still LOW → re-verify at build time. |
| **[SECONDARY]** | Vendor blog, law-firm note, aggregated search result. Directional only. **Never ship as a legal fact.** |
| **[UNVERIFIED]** | Could not be confirmed in this session. Flagged, not filled in. |

**Retrieval note:** `eur-lex.europa.eu` was **not directly fetchable** in this session (empty responses on every URL form tried, `curl` blocked). All Directive quotations below were retrieved through a reader proxy (`r.jina.ai`) against the EUR-Lex CELEX document. They are internally consistent and consistent with the Commission FAQ, but **Phase 0 must re-pull them from EUR-Lex itself**. This retrieval fragility is itself a pitfall (see Pitfall 2, "Build-time verification that cannot actually run").

---

## Critical Pitfalls

### Pitfall 1: Shipping inherited legal errors — the project brief already contains four

**What goes wrong:**
Legal-information sites do not usually get facts wrong by inventing them. They get them wrong by *inheriting* a plausible-sounding paraphrase from a law-firm blog or vendor guide, and never diffing it against the statute. The error then propagates: into the letter, into the share card, into press coverage that cites you, into the `country-data` JSON that other people npm-install.

This project is already carrying at least four such inherited errors. I found them by comparing `PROJECT.md`/`jafn-project-brief.md` against the Directive text:

| Claim in the brief | What the Directive actually says | Source |
|---|---|---|
| Article 7 right is exercisable **"once a year"** / "frequency (annual)" | **No frequency limit exists in Article 7.** Art. 7(3) imposes an *employer* duty to inform workers **annually of the right**. The brief conflates the employer's reminder duty with a cap on worker requests. | [PRIMARY] Art. 7(1)–(6); explicit "NO SUCH WORDING FOUND" check run against Art. 7 and recitals |
| Article 7 covers "criteria for pay, pay levels and **progression**" | Those criteria are **Article 6** ("Transparency of pay setting and pay progression policy"): *"Employers shall make easily accessible to their workers the criteria that are used to determine workers' pay, pay levels and pay progression."* Art. 7 covers own pay level + average by sex per category. A letter citing Art. 7 for the criteria is **mis-cited**. | [PRIMARY] Art. 6(1), Art. 7(1) |
| Response deadline is "**2 months**" | Art. 7(4): *"within a reasonable period of time but in any event within two months from the date on which the request is made."* Two months is a **backstop, not the standard**. A letter that says "you have two months" understates the worker's position. | [PRIMARY] Art. 7(4) |
| Module D "flags small groups (**fewer than six per sex** in a category)" | **The Directive sets no such threshold anywhere.** The six-person rule is **German national law**, § 12 EntgTranspG: *"das Vergleichsentgelt nicht anzugeben, wenn die Vergleichstätigkeit von weniger als sechs Beschäftigten des jeweils anderen Geschlechts ausgeübt wird"* — and it applies to the **individual information right**, not to Art. 9 reporting. Hard-coding it EU-wide is a double error (wrong jurisdiction, wrong obligation). | [PRIMARY] § 12 EntgTranspG; Directive Art. 12(3) is the only EU-level identifiability provision and it is an **optional Member State** safeguard |

**Why it happens:**
The seed table in `jafn-project-brief.md` §6 sources almost every Directive-level fact to vendor content (mirro.io, papayaglobal.com, deel.com, axiosanalytics.com, ey.com, varico.pl). Vendor content is written to sell software, is not proofread against the OJ text, and copies from other vendor content. I confirmed this drift live: two vendor pages consulted for the Art. 9 metrics both asserted an FTE-normalisation rule and a six-person suppression rule that **do not appear in the Directive**, and one listed *statutory sick pay* as an includable component when the Commission FAQ says statutory social-security benefits are **not pay** (citing *Bilka-Kaufhaus* C-170/84). [SECONDARY vendors vs. PRIMARY FAQ]

**Consequences (documented analogue):**
FTC v. DoNotPay — final order February 2025, complaint September 2024 under "Operation AI Comply". The FTC's stated ground was that DoNotPay *"did not test whether its 'AI lawyer' operated to the level of a human lawyer"* and *"did not hire or retain attorneys to test the quality and accuracy of its service's law-related features."* Outcome: $193,000 monetary relief, mandatory notice to 2021–2023 subscribers, and a prohibition on claiming the service performs like a real lawyer without substantiation. [PRIMARY — ftc.gov press release] Note what was punished: **not** wrong law, but **unsubstantiated accuracy claims**. A site whose headline promise is "every legal statement carries a source and a verified date" is making exactly that kind of claim and must be able to evidence it.

**How to avoid:**
1. **Ban vendor sources as authorities.** `country-data` schema gets a `source_tier` enum: `official_journal | national_register | equality_body | court | commission_guidance | secondary`. CI **fails** if any field's only source is `secondary`. Vendor pages may appear as `discovery_hint`, never as `source`.
2. **Diff-against-statute review.** Every Directive-level assertion in copy, letters and README gets a `// cite:` comment naming article and paragraph, and a review task that opens the OJ text side-by-side. The four errors above were found in one hour of exactly this.
3. **Delete "annual frequency" from Module A entirely** unless a *national* provision imposes one (some may — that is a per-country field, `request_frequency_limit: null` by default).
4. **Split the Art. 6 request from the Art. 7 request** in the letter builder. They are different rights with different citations; bundling them under one citation is the mis-citation.
5. **Change the deadline string** to "without undue delay and in any event within two months" (or the national equivalent).
6. **Move the six-person rule** out of the engine core and into `country-data`/adapters as `min_comparison_group_size: number | null`, defaulting to `null`, populated only where national law says so (DE: 6, per § 12 EntgTranspG).

**Warning signs:**
- A `sources` array whose entries are all `.com` domains.
- Any legal string in a message catalogue with no `// cite:` neighbour.
- A number appearing in copy that does not appear anywhere in `country-data`.
- Reviewers approving legal PRs in under a minute.

**Phase to address:** **Phase 0** (schema + source-tier rules + re-verify §6 table), enforced continuously in Phases 2 and 3.

---

### Pitfall 2: `verified_at` that is a decoration, not a control

**What goes wrong:**
`verified_at` gets stamped once during seeding, then never moves. Twelve months later the site is confidently displaying a 2026 transposition status with a 2026 date next to it, and a journalist cites it. The date makes the page *look* more trustworthy while making it *less* trustworthy — the classic failure of provenance theatre.

The second failure mode is the opposite: a blanket TTL (say 90 days) turns the whole dataset red at once, the team ignores it, and the badge becomes noise.

The third is what happened to me in this session: **the verification step could not run.** EUR-Lex was unfetchable from this environment. A build-time verifier that silently no-ops, or that "passes" because it got an empty 200, is worse than no verifier.

**Why it happens:**
Freshness is modelled as a single timestamp on a whole record, when the real unit of volatility is the individual field. `status: "in force"` for Malta is stable for years; `full_act_status` for Poland changes with every parliamentary reading; `eurostat_gpg` changes annually and was **provisional** for 2024 (Eurostat states 2024 figures are *"provisional until benchmark figures … become available in December 2026"*) [PRIMARY — Eurostat Statistics Explained].

**How to avoid — a `verified_at` policy that actually works:**

1. **Per-field provenance, not per-file.** Each fact is `{ value, source_url, source_tier, verified_at, verified_by, volatility }`.
2. **Volatility classes drive TTL**, not a global constant:

   | Class | Example fields | TTL | On expiry |
   |---|---|---|---|
   | `stable` | equality body name/URL, Directive article numbers | 365 d | warn in CI |
   | `volatile` | transposition status, national legal basis, deadline | 90 d | **UI degrades** to "last confirmed on {date} — status may have changed", CTA still works |
   | `pending` | anything where the source says "draft"/"in parliament" | 30 d | UI shows "draft — check before relying"; banner on the country page |
   | `statistical` | Eurostat GPG, sector gaps | until next release date, stored as `next_expected_release` | block the share card from rendering a stale year |

3. **Content hash of the source, not just the URL.** Store `source_snapshot_sha256` and `source_snapshot_path` (a committed text extract). A scheduled job re-fetches and diffs. A changed hash is a **review task**, not an auto-update — auto-updating legal text from a diff is how you ship a parliamentary amendment nobody read.
4. **Verifier must fail loudly.** Assert on (a) HTTP 200, (b) non-empty body above a byte floor, (c) presence of an expected anchor string (e.g. the article number). Empty-200 → hard fail. In this session, three different EUR-Lex URL forms returned empty content that a naive checker would have scored as "verified".
5. **Never auto-flip to unverified silently.** Expiry must be visible in the artefact too: the generated PDF/DOCX footer carries "Legal basis as recorded on {verified_at}. Check {source_url} before relying on this."
6. **Publish a public correction log** (`CHANGELOG-legal.md`) with dated entries: what was wrong, when it was fixed, who reported it. This is what turns an inevitable error from a credibility loss into a credibility gain, and it is what journalists and unions will look for before linking.
7. **Immutable dated snapshots for citation.** `country-data` will be cited. Ship `data/snapshots/2026-11-01/` permalinks so a journalist's citation stays honest even after you correct the live file.

**Warning signs:**
- Any `verified_at` equal to the repo's initial-commit date on more than a handful of records.
- The verification job's runtime dropping (it is short-circuiting).
- `verified_at` bumped in a PR that changes no `value`.
- No `next_expected_release` on the Eurostat fields.

**Phase to address:** **Phase 0** (schema + verifier + fail-loud tests), re-checked before every launch wave.

---

### Pitfall 3: Crossing the unauthorised-practice line — and doing it worst in Germany

**What goes wrong:**
The tool stops being a template and becomes advice. The trigger is not the disclaimer; it is whether the system performs a **legal assessment of the user's individual situation**. Adding "based on your answers, you likely have a claim" or "your employer is probably in breach" moves the product across the line in the strictest jurisdictions.

**The German test is the binding constraint.** § 2(1) RDG [PRIMARY — gesetze-im-internet.de]:

> *"Rechtsdienstleistung ist jede Tätigkeit in konkreten fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des Einzelfalls erfordert."*

Two cumulative elements: a **concrete third-party matter** and a **legal examination of the individual case**. § 3 RDG makes independent out-of-court legal services permitted **only** where a statute allows it (prohibition with permission reservation). § 20 RDG carries administrative fines.

Three carve-outs matter here [PRIMARY]:
- **§ 2(3) no. 5 RDG**: *"die an die Allgemeinheit gerichtete Darstellung und Erörterung von Rechtsfragen und Rechtsfällen in den Medien"* is **not** a Rechtsdienstleistung. This is the safe harbour a public explainer sits in.
- **§ 6 RDG**: unpaid legal services are permitted (with supervision requirements outside personal relationships).
- **§ 7 RDG**: trade unions and interest associations may provide legal services to members within their statutory purpose — which is why the union-route feature is legally *easier* than the direct route, not just politically nicer.

**The precedent is favourable but narrow.** BGH, judgment of 9 September 2021, **I ZR 113/20** (Wolters Kluwer "smartlaw" contract generator): a document generator where the user fills a form and answers yes/no questions and the software emits a contract is **not** an unauthorised legal service, because it does not give legal advice on a concrete individual matter. The Hamburg bar's reaction — that the RDG's protection becomes meaningless if complex contracts can be produced by anyone as long as it is automated — is a fair summary of the residual risk. [SECONDARY — LTO, Anwaltsblatt, WBS reporting on I ZR 113/20; **the judgment text itself was not retrieved in this session — Phase 0 should pull it from bundesgerichtshof.de**]

**Poland is the opposite shape.** Out-of-court legal advice is **not** a reserved activity; commercial provision of legal information and preparation of simple documents does not require a licence, and *doradcy prawni* operate on general freedom-of-business grounds. The real Polish constraints are (a) **protected titles** — you may not call yourself or imply you are an *adwokat* or *radca prawny*, and (b) **court representation** is restricted (art. 87 k.p.c.). [SECONDARY — Polish legal-practice commentary; **needs a Polish-qualified check in Phase 0**] The larger Polish exposure is therefore **consumer/unfair-commercial-practices**, not UPL: a free tool that overstates what it does is still a misleading commercial practice if it funnels to a paid service (Module D → Járnhaus).

**How to avoid:**
1. **Design rule, enforced in code review:** the product may *report* facts and *assemble* the user's own words. It must never *evaluate*. Concretely — **ban** these output shapes:
   - "You are being underpaid" / "Your employer is in breach"
   - "You have a claim worth X"
   - "You should file with {equality body}"
   - Any conditional branch whose predicate is a legal characterisation of the user's facts.
   **Allow:** "In {country}, the law provides {X}. Source: {url}, as at {date}." / "Workers who want to escalate can contact {body}."
2. **Module B's number is the sharpest edge.** "The gap cost you €142,000" is a factual-looking claim about *the user's own situation*. Frame it as a population statistic applied arithmetically, never as a finding about the user (see Pitfall 5).
3. **Module C's "honesty score" is a judgement about a third party** (the employer/portal). Keep it mechanical, criterion-by-criterion, with the raw inputs shown — no aggregate verdict word like "dishonest". This is also why the H3 wall-of-shame deferral is correct.
4. **Disclaimer placement — four locations, not one:**
   - **Before generation**, adjacent to the primary CTA, not in a footer. Must be visible without scrolling on a 375 px viewport.
   - **Inside every artefact** — `.txt`, `.pdf`, `.docx`, the `mailto:` body, and the `.ics` description. An artefact travels away from the site; the disclaimer must travel with it.
   - **On the country page**, next to the legal-basis block, with the `verified_at`.
   - **In the npm README and package description** for `directive-engine` — an HR team may use the output for a statutory filing.
5. **Disclaimer wording — what it must actually contain** (a bare "not legal advice" does almost nothing):
   - what the tool *is* ("a template generator that inserts information you typed into a standard letter"),
   - what it explicitly does **not** do ("it does not assess your situation, does not tell you whether you are underpaid, and does not check whether your employer is complying"),
   - that the legal basis shown is as recorded on a stated date with a link to the source,
   - who *can* advise: the **national equality body**, worker representatives, trade unions, and a qualified lawyer — named per country from `country-data`,
   - jurisdiction-appropriate phrasing: DE copy should say *"keine Rechtsdienstleistung im Sinne des § 2 RDG"* is being provided and point to the § 2(3) Nr. 5 framing; PL copy should say *"nie stanowi porady prawnej"* and must **not** use the words *adwokat*/*radca prawny* to describe the tool.
6. **No lawyer-adjacent branding.** No wig/gavel/scales iconography, no "AI lawyer", no "legal assistant", no first-person legal voice ("I advise you to…"). The FTC order is precisely about branding claims outrunning substantiation.
7. **Germany-specific gate:** because DE is a Wave-4 locale, treat the German launch as requiring a German lawyer's sign-off on the DE copy and disclaimer — cheaper than the alternative and a one-off cost.

**Warning signs:**
- A design ticket phrased as "tell the user whether they should send it".
- Any `if` in the letter builder keyed on a *legal conclusion* rather than a *country code* or a *user selection*.
- Marketing copy drafts containing "know if you're underpaid", "find out if your employer is breaking the law".
- The disclaimer living only in the footer component.

**Phase to address:** **Phase 0** (design rule + disclaimer content spec as an ADR), **Phase 1** (Module B framing), **Phase 2** (artefact-embedded disclaimers), **Phase 4** (Module C scoring language), **Phase 5** (DE locale legal review).

---

### Pitfall 4: Encouraging an irreversible act against the user's employer without a duty-of-care layer

**What goes wrong:**
The product's core conversion event is a worker sending a letter to their own employer. That is irreversible, identity-revealing, and — in a small team — self-identifying. A tool optimised for "letters generated" is optimised for pushing people over that threshold. If the tool's growth metric and the user's interest diverge, the tool has a duty-of-care problem, and the first press story about someone who lost their job after using it will be the project's defining story.

**What the law actually gives (and does not):**
- Art. 25 "Victimisation and protection against less favourable treatment" [PRIMARY]: *"Workers and their workers' representatives shall not be treated less favourably on the ground that they have exercised their rights relating to equal pay…"* and Member States must introduce measures protecting against *"dismissal or other adverse treatment … as a reaction to a complaint within the employer's organisation or to any administrative procedure or court proceedings"*.
- This is **ex post**. It is a remedy after detriment, dependent on national transposition, national limitation periods (Art. 21), burden-of-proof rules (Art. 18) and access to evidence (Art. 20). It does not stop anything happening.
- **Art. 7(6) is the one nobody puts in a template** [PRIMARY]: *"Employers may require workers who have obtained information pursuant to this Article, other than information concerning their own pay or pay level, not to use that information for any purpose other than to exercise their right to equal pay."* A worker who receives category averages and posts them on LinkedIn may be in breach of a lawful employer requirement. **The tool must warn about this at the moment the request is generated**, or it is setting users up.
- **Art. 12(3) is the identifiability escape hatch** [PRIMARY]: Member States *may* decide that where disclosure would reveal an identifiable worker's pay, only workers' representatives, the labour inspectorate or the equality body get the information, and *"shall advise workers regarding a possible claim … without disclosing actual pay levels"*. Whether a state has taken this option is a **per-country field** and changes what the worker should even ask for.
- The Commission FAQ confirms the assistance channel: *"All relevant associations, organizations, equality bodies and workers' representatives … should be able to act both on behalf of and in support of a worker (with that person's approval)."* [PRIMARY — EC FAQ on the Pay Transparency Directive, 6 Aug 2026]

**Evidence on what happens in practice:** I could not find quantitative retaliation-incidence data for pay enquiries in the EU in this session. [UNVERIFIED] The available literature is US pay-secrecy research (LSE/JELS, IWPR, NWLC) which documents the prevalence of pay-secrecy policies rather than retaliation rates. **Do not cite a retaliation statistic you cannot source.** The honest UI line is qualitative: "the law protects you from retaliation; that protection works after the fact, so think about timing and about who else knows."

**How to avoid — the duty-of-care layer, as concrete UI:**
1. **A "before you send" step that is not skippable and is not a modal you can dismiss with X.** Three questions, all answered locally:
   - *"Roughly how many people do the same work as you, or work of equal value?"* → if the answer is "fewer than 5" or "I'm not sure", surface the identifiability warning **and** the Art. 12(3) country note **and** push the representative/equality-body route to the top.
   - *"Do you have a works council, union representative, or employee representative?"* → if yes, offer the Art. 7(2) route **first**, and generate a letter addressed to the representative rather than the employer.
   - *"Are you currently in probation, notice, a restructuring, or a performance process?"* → do not advise; simply show the equality-body contact and a "you may want to talk to them first" line. **No legal conclusion.**
2. **Reframe the primary CTA.** "Generate the letter" not "Send it now". No countdown, no scarcity, no "X people sent theirs today". Growth pressure is the mechanism by which duty of care erodes.
3. **Small-employer mode.** When the user indicates a small comparison group, change the *default request*: ask for own pay level + the criteria (Art. 6) + the existence of a pay structure, and make the category averages an explicit opt-in with the identifiability warning attached. In a five-person team, "average pay of men doing your job" is one person's salary.
4. **Ship the Art. 7(6) warning in the artefact.** One line in the generated letter's accompanying notes: "If your employer asks you to use this information only for enforcing your equal-pay rights, that request may be lawful under Article 7(6) of the Directive. Do not publish figures you receive."
5. **Evidence-preservation guidance, factual only.** "Keep a copy of what you sent and the date. Send from a channel you will still have access to if you leave." (i.e. *not* only a work email.) The `mailto:` default should nudge toward a personal address in the From guidance and the `.ics` reminder should live in the user's own calendar.
6. **Escalation path always visible**, per country, from `country-data`: equality body, labour inspectorate, union federation. This is also the UPL-safe answer to every "what should I do" question.
7. **Do not offer a "send anonymously" affordance.** Art. 7 requires an identified worker; an anonymity feature would be a false promise and a genuine safety hazard.

**What union/NGO tools do (pattern, not citation):** the consistent shape in worker-side tooling from unions and equality NGOs is *representative-first* — the tool routes to a human (rep, union officer, equality-body caseworker) rather than to the employer, precisely because the human absorbs the identifiability and retaliation risk. Germany's § 7 RDG carve-out for unions exists for the same reason. **Mirroring that shape is both the safer product and the easier legal position.** [SECONDARY/inference — no specific tool inventory was verifiable in this session; treat as a design hypothesis to validate with two or three unions before launch]

**Warning signs:**
- Analytics dashboard where `letter_generated` is the north-star metric with no counterweight.
- Design review where the "before you send" step is described as friction to be reduced.
- Copy containing "your employer must" without "and here is what to do if they don't".
- No small-employer branch in the letter builder.

**Phase to address:** **Phase 2** (Module A) as a first-class requirement, not a polish item. The `Art. 7(6)` warning and the representative route belong in the Phase 2 acceptance criteria. Country-level Art. 12(3) flags are **Phase 0** `country-data` fields.

---

### Pitfall 5: A career-gap number an economist can dismantle in one tweet

**What goes wrong:**
"The gender pay gap has cost you €187,000" is a causal claim dressed as arithmetic. The unadjusted gap does not support it, and the people most likely to amplify the card are also the people most likely to be quote-tweeted by an economist. One good takedown converts the project's biggest traffic asset into its biggest liability, and the takedown lands on the *tool*, not on the Directive.

**Every criticism an economist will make, and the specific defusal:**

| # | Criticism | Why it lands | Defusal |
|---|---|---|---|
| 1 | The unadjusted gap is not discrimination | **Eurostat says so itself**: the unadjusted GPG is *"broader than discrimination"*; differences arise from *"(1) differences in average characteristics of male and female employees and (2) differences in financial returns for the same characteristics"* [PRIMARY] | Quote Eurostat verbatim, on the card's landing page, above the fold. Using the statistic's own custodian's caveat is unanswerable. |
| 2 | Composition: occupation, sector, seniority, firm | The EU aggregate mixes a nurse and a trader | Offer the **sector (NACE) gap** as the default where available, and say plainly that even the sectoral gap is not adjusted for job level. |
| 3 | Hours | **The Eurostat GPG is on gross HOURLY earnings** [PRIMARY]. Multiplying an hourly gap by an *annual* salary silently assumes identical hours. | Say it: "this applies an hourly-pay gap to your annual pay, which assumes you and the comparison group work the same hours." Do **not** switch to the Gender Overall Earnings Gap to make the number bigger — that indicator bundles employment rates and hours and is even less about *your* pay. |
| 4 | Coverage | Eurostat GPG covers **enterprises with 10+ employees**, **NACE Rev. 2 sections B–S excluding O (public administration and defence)**; Czechia includes 1+ [PRIMARY] | Hard gate: if the user's sector is **O**, or they say "public sector", or their employer is small, the calculator must say the statistic **does not cover them** and offer the national figure or nothing. Producing a number for a civil servant from an indicator that excludes public administration is an unforced error. |
| 5 | Provisional data | 2024 figures are *"provisional until benchmark figures … become available in December 2026"*; SES runs every 4 years, intermediate years are national estimates [PRIMARY] | Print the reference year and "provisional" on the card itself. Set a `next_expected_release` and a calendar task for December 2026. |
| 6 | Negative gaps exist | **Luxembourg's 2024 GPG is −0.8%** [PRIMARY]; range to Estonia at 18.8% | The UI must handle a negative gap without absurdity ("the gap cost you −€400"). Design the copy for the negative case *first*. |
| 7 | Cross-sectional → longitudinal fallacy | A 2024 snapshot describes today's 25-year-olds and today's 60-year-olds, not one person's life path. Applying it across 40 years assumes the gap was and will be constant. | Never call it "what you lost". Call it what it is: **"if a gap of X% had applied to your pay for every year you have worked"** — an explicitly conditional, arithmetic statement. |
| 8 | Age profile | The gap widens with age/parenthood in most member states; a flat gap under-states early and over-states late — and the direction of the error is not knowable without a model you have ruled out | State that the model is flat and why: "we deliberately use one flat number rather than an age profile, because a more complex model would imply more precision than the data supports." |
| 9 | Compounding | The tempting move — compound the "lost" amount at an investment return to make it bigger — is where credibility dies | **Do not compound at an investment return.** If you must project forward, the only defensible arithmetic is: constant real terms, no growth, no discounting, clearly labelled "in today's money". State "we do not add investment returns or salary growth." |
| 10 | Nominal vs real | Summing 20 years of nominal euros is meaningless across an inflationary decade | Do the whole calculation in **today's money** and say so. One sentence. |
| 11 | Discounting | An economist will ask for a discount rate for the projection | Pre-empt: "future amounts are not discounted; they are shown in today's money, which is the same thing as a 0% real discount rate. If you prefer a different assumption, the formula is on this page." |
| 12 | Retirement age | Hard-coding 65 is wrong in most member states and changes over time | Make retirement age a per-country field in `country-data` with a source, or make it a user input with a documented default. If unsourced → `null` → no "by retirement" figure for that country. |
| 13 | The counterfactual | "What you would have earned as a man" is not what the statistic measures | Never use the male-counterfactual phrasing. |
| 14 | The Directive doesn't target this | Art. 10(1) triggers on *"a difference in the average pay level between female and male workers of at least 5% in any category of workers"* that is unjustified and unremedied within six months [PRIMARY] — i.e. **within-category**, at **employer level** | This is the honesty layer's payoff: "the number above is a national average. What the law actually acts on is a ≥5% gap *inside your employer, inside your job category*. That is what the letter asks about." This converts the criticism into the CTA. |

**How to avoid — structural, not cosmetic:**
- **The share card must carry its own caveat.** OG images get screenshotted and travel without the page. The 1200×630 must contain, legibly at thumbnail size: the reference year, "unadjusted", the country, and "national average — not a measure of discrimination". If it does not fit, the number is too prominent.
- **Publish the formula.** A `/methodology` page with the exact arithmetic, the Eurostat dataset code, the reference year, and the full caveat list. Link it from the card and the card's landing page. An economist who finds the methodology page usually writes a different tweet.
- **Pre-mortem it.** Before launch, hand the calculator to someone hostile and ask them to write the takedown. Fix whatever they write. `PROJECT.md` already requires Marek's review of the framing copy — make the hostile-review an explicit second gate.
- **Prefer "so far" over "by retirement."** The retrospective number is a defensible arithmetic statement about the past. The projection multiplies every assumption. If launch pressure forces a cut, cut the projection.
- **Do not let the number be the headline of the press pitch.** The brief's Wave 1 plan says "pitch the career-gap number, not the tool". That maximises pickup *and* maximises the attack surface on the weakest artefact. Pitch **the right** ("EU workers can now ask their employer what colleagues doing the same job earn — here is the letter") with the number as supporting colour.

**Warning signs:**
- The word "lost", "cost you", "owed", "stolen" in Module B copy.
- Any compounding/interest term in the calculator source.
- No branch handling a negative gap.
- Sector selector offering NACE section O.
- The methodology page not existing on the day the card ships.

**Phase to address:** **Phase 1** (Module B) — the honesty layer is a blocking acceptance criterion, and the `/methodology` page ships with the calculator or the calculator does not ship.

---

### Pitfall 6: Getting the Article 9 metrics wrong in front of the exact audience that can check

**What goes wrong:**
A compensation analyst runs their payroll export through Module D, compares to their vendor's output or their national template, gets a different number, and the project loses the B2B audience permanently. Worse: an HR team files a number the tool produced.

**What the Directive actually says (all [PRIMARY], verbatim):**

Art. 9(1) — *"Member States shall ensure that employers provide the following information concerning their organisation":*
- (a) the gender pay gap;
- (b) the gender pay gap in complementary or variable components;
- (c) the median gender pay gap;
- (d) the median gender pay gap in complementary or variable components;
- (e) the proportion of female and male workers receiving complementary or variable components;
- (f) the proportion of female and male workers in each quartile pay band;
- (g) the gender pay gap between workers by categories of workers broken down by ordinary basic wage or salary and complementary or variable components.

Art. 3(1) definitions:
- `gender pay gap` = *"the difference in average pay levels between female and male workers of an employer expressed as a percentage of the average pay level of male workers"*
- `median pay level` = *"the pay level at which half of the workers of an employer earn more and half of them earn less"*
- `median gender pay gap` = *"the difference between the median pay level of female and median pay level of male workers of an employer expressed as a percentage of the median pay level of male workers"*
- `quartile pay band` = *"each of four equal groups of workers into which they are divided according to their pay levels, from the lowest to the highest"*
- `category of workers` = *"workers performing the same work or work of equal value grouped in a non-arbitrary manner based on the non-discriminatory and objective gender-neutral criteria referred to in Article 4(4), by the workers' employer and, where applicable, in cooperation with the workers' representatives"*
- `pay` = *"the ordinary basic or minimum wage or salary and any other consideration, whether in cash or in kind, which a worker receives directly or indirectly (complementary or variable components) in respect of his or her employment from his or her employer"*

Art. 9(2)–(7): 250+ report by 7 June 2027 and **every year**; 150–249 by 7 June 2027 and **every three years**; 100–149 by 7 June 2031 and every three years; all *"relating to the previous calendar year"*. **9(6): *"The accuracy of the information shall be confirmed by the employer's management, after consulting workers' representatives. Workers' representatives shall have access to the methodologies applied by the employer."*** **9(7): points (a)–(g) go to the national authority; the employer *may* publish only (a)–(f).**

Art. 10(1): joint pay assessment where **all three** conditions hold — ≥5% average difference in any category, not justified on objective gender-neutral criteria, and not remedied within six months of submission.

**The traps, one by one:**

| # | Trap | The correct behaviour |
|---|---|---|
| 1 | **Denominator.** Using `(M−F)/((M+F)/2)` or `/F` or `/overall mean`. | Art. 3(1)(c)/(e) fix the denominator as the **male** average / **male** median. Golden vector must include an asymmetric case that catches every wrong denominator. |
| 2 | **Median of gaps vs gap of medians.** Computing median gaps per category then taking a median. | Compute male median and female median separately, then difference over male median. |
| 3 | **Even-count medians.** No convention specified. | Pick one (linear interpolation vs lower-of-two), **document it**, expose it as an engine option, and put both in the golden vectors. |
| 4 | **Quartiles: equal groups, not equal ranges.** Splitting the pay *range* into four bands. | Art. 3(1)(f): *"four equal groups of workers"*. Rank by pay level, split by **count**. |
| 5 | **Quartile boundary ties.** The Directive is silent. Naive `slice()` puts identical-paid people in different quartiles based on sort stability — a non-deterministic metric. | Adopt an explicit, documented rule. The UK convention (a defensible reference implementation): sort high→low, split into four; where employees on a boundary receive the **same** hourly pay, distribute so *"the proportion of men and women receiving that hourly pay should be the same in each of the pay quarters"*; leftover employees go to the **lower** quarter [PRIMARY — gov.uk]. **Label it as a convention, not as the Directive.** Expose `quartileTieRule` as an option so national adapters can override. |
| 6 | **Non-divisible headcounts.** 103 employees into 4 groups. | Same gov.uk rule: leftovers to the lower quarter. Document; golden-vector n = 4k, 4k+1, 4k+2, 4k+3. |
| 7 | **"Complementary or variable components" is not enumerated.** Vendor lists (bonus, overtime, shift premium, travel, housing, sick pay) are **interpretation** [SECONDARY]. | Commission FAQ [PRIMARY] gives real boundaries: **employer contributions to occupational schemes always count** (they are actual pay for current workers in the period); benefits in kind may need a monetary value assigned; **statutory social security benefits are not pay** (citing *Bilka-Kaufhaus* C-170/84); and items *"not subject to any eligibility criteria and … collectively paid to all employees without any exceptions"* (lunch vouchers, laptops, gym membership) *"may not be useful to include"*. Note this **contradicts** the vendor page that listed statutory sick pay as includable. Make component classification a **user-declared mapping**, never inferred from a column name. |
| 8 | **Category of workers is employer-defined.** Deriving categories from job titles in the CSV. | Art. 3(1)(h) + the FAQ: *"It is up to employers to define categories of work of equal value, based on a combination of weighted criteria in cooperation with workers' representatives where they exist"*, using at minimum **skills, effort, responsibility, working conditions** (Art. 4(4)). **Module D must require a `category` column supplied by the employer and must refuse to guess.** Auto-grouping by job title would be the single most damaging feature in the product — it produces an Art. 10 5% flag on a category the employer never defined. |
| 9 | **Pro-rating part-time / partial-year.** The Directive is **silent**; vendors assert FTE normalisation as if it were law [SECONDARY]. UK solves it differently again by excluding *"full-pay relevant employees"* who were on reduced pay in the period [PRIMARY — gov.uk]. | Do **not** hard-code. Expose `payBasis: 'hourly' | 'fte_annualised' | 'as_paid'` and `partialPeriodPolicy` as required, explicit inputs with no default. The report must print the chosen convention on every page. Where a national adapter fixes the rule, the adapter sets it. |
| 10 | **Reference period.** Using "current headcount" or a rolling 12 months. | Art. 9(2)–(4): *"relating to the previous calendar year"*. Reject uploads whose date range does not match a calendar year, or warn loudly. |
| 11 | **Joiners/leavers.** Whether a March leaver is in the population. | Commission FAQ: reporting concerns *"current workers employed in the organisation"* in *"a given reporting period"* with *"actual pay"* (Recital 22). Make inclusion policy an explicit input; do not default silently. |
| 12 | **Sex field.** Metrics are defined over "female and male workers". Real payroll has `M/F/X/undisclosed/blank`, and gov.uk updated its guidance on **21 May 2026 following a Supreme Court ruling on the definition of sex** [PRIMARY — gov.uk change note]. | Require an explicit mapping step. Surface counts of unmapped/other/blank. **Never silently drop them** — a dropped 4% changes the gap. Report them as a separate line in the output ("N workers excluded from the sex-based metrics"). |
| 13 | **Small groups.** There is **no EU-level threshold** (see Pitfall 1). | `min_group_size` per country, `null` by default; DE = 6 via § 12 EntgTranspG; Art. 12(3) restricted-access flag per country. Show suppression as an explicit, counted action in the report. |
| 14 | **Art. 9(7) publication split.** Publishing (g). | Only (a)–(f) may be self-published; (g) goes to the authority. The PDF export needs two modes: **internal/authority** (all seven) and **publishable** (a)–(f). Getting this wrong causes a *disclosure* problem for the customer. |
| 15 | **Presenting output as a filing.** | Art. 9(6): accuracy is confirmed by **management after consulting workers' representatives**, who get access to the **methodologies**. Module D's export must be titled a *draft* and must include a full methodology annex (every convention chosen), because that annex is what Art. 9(6) entitles the reps to see. This is a **feature**, and it is a genuine differentiator against vendors that hide the method. |
| 16 | **"Article 9" collision.** The Directive's Art. 9 and GDPR's Art. 9 (special categories) will be confused in docs, issues and support threads. | Always write "Art. 9 of Directive (EU) 2023/970" in full in docs and UI. Cheap; prevents a real class of confusion in an HR audience. |

**Where employer-side vendors and national guidance disagree — confirmed in this session:**
- Vendor A and Vendor B both stated an **FTE-normalisation rule**; the Directive states none. [SECONDARY vs PRIMARY]
- One vendor listed **statutory sick pay** as an includable variable component; the Commission FAQ says statutory social-security benefits are **not pay**. [SECONDARY vs PRIMARY]
- One vendor stated a **six-per-gender suppression rule**; that is German national law for a different obligation. [SECONDARY vs PRIMARY]
- UK guidance excludes reduced-pay employees from the hourly-pay metrics but includes **all** relevant employees for the bonus metrics — i.e. **different populations for different metrics within one report**. Nothing in Art. 9 mandates that, but any analyst who has done UK reporting will expect to be asked. [PRIMARY gov.uk]

**Prevention:**
- **TDD with golden vectors, per convention set** — not one canonical vector. Each vector file declares its `{denominator, medianRule, quartileTieRule, payBasis, partialPeriodPolicy, componentMap}` and the engine must reproduce it exactly. Include the pathological cases: ties across a quartile boundary, n mod 4 ≠ 0, a category with 1 woman, an all-male category, a negative gap, zero variable components, and a worker with `sex` unmapped.
- **The engine returns provenance with every metric**: `{ value, definitionCite: 'Art. 3(1)(c)', assumptions: {...}, populationN, excludedN, suppressed: boolean }`. A number without its assumption set is not shippable.
- **Refuse rather than default.** Any convention the Directive does not fix must be an explicit caller input. `directive-engine` should throw on a missing convention, not pick one.
- **Publish a comparison harness**: run the same fixture through the engine under the UK convention, the DE convention, and the "plain Directive" convention, and show the three different answers in the README. That turns the divergence from an embarrassment into the project's most credible artefact.

**Warning signs:**
- A single `expected.json` golden file.
- Any default value on a convention option.
- A `guessCategory()` or `inferCategory()` function.
- Test fixtures with round headcounts divisible by 4.
- The word "the" in "the gender pay gap for this file" in the UI.

**Phase to address:** **Phase 3** (engine + Module D), with the convention taxonomy decided in **Phase 0** as an ADR. Golden vectors are written **before** the code, per the brief's own working agreement.

---

### Pitfall 7: The zero-egress claim gets broken by the project's own architecture, not by a third party

**What goes wrong:**
"No salary data may reach a server, ever" is the headline claim and the entire trust position. It is also, as currently specified, **already contradicted in two places in the brief**:

1. **The OG share card.** `PROJECT.md`: *"Share card: 1200×630 OG image rendered from URL params by an edge function; the URL itself carries the inputs, so nothing is stored server-side."* An edge function **is a server**. It receives the user's country, sector, gross pay and years worked as URL parameters. Cloudflare will have request logs. "Not stored by us" ≠ "never leaves the browser". A compensation analyst auditing the README will find this in thirty seconds, and it will be the top Hacker News comment.
2. **Cloudflare Web Analytics.** It reports the **page URL**. If the share page's URL carries the salary inputs, the salary inputs are in the analytics beacon. `PROJECT.md` says analytics carries *"counts only … never payloads"* — but the URL *is* a payload here.
3. **Module C's job-ad URL parsing.** *"Parse a job-ad URL only where the portal's terms allow it"* — fetching a third-party URL from the browser is blocked by CORS, so it needs a proxy, i.e. a server, i.e. egress, i.e. `connect-src` beyond `'self'`.

**Other ways the claim breaks in practice:**

| Vector | How it leaks | Mitigation |
|---|---|---|
| Third-party fonts | Google Fonts sends the visitor's IP to a US server. **LG München I, 20.01.2022, 3 O 17493/20** awarded **€100** damages for exactly this, and triggered a mass-Abmahnung wave in Germany. [PRIMARY-ish — GDPRhub summary of the judgment; verify on dejure/rewis in Phase 0] | Self-host every font as a build asset. `font-src 'self'`. |
| Analytics beacon URLs | Query strings and fragments in the reported URL | Put share inputs in the **fragment** (`#`) — fragments are not sent to the server in the HTTP request line — or, better, in a client-decoded opaque blob, and strip/replace the reported URL before the beacon fires. |
| Error reporting SDKs | Sentry-style SDKs capture breadcrumbs, DOM snapshots, form values, and the URL | Do not install one. If you need error visibility, log to the console and ask users to paste. |
| Source maps | Uploading maps to an error service is egress; serving them publicly is not a leak but is a supply-chain surface | Do not upload. Decide deliberately whether to serve them. |
| `Referer` on outbound links | Any link from a page whose URL carries inputs leaks the whole URL to the destination | `Referrer-Policy: no-referrer` at the document level **and** `rel="noreferrer"` on outbound anchors. |
| Prefetch / speculation rules / `<link rel=preconnect>` | Silently opens connections to origins you thought you had removed | Explicitly disable speculation rules; audit `<link>` tags in CI. |
| CDN / edge logs | Cloudflare access logs record full request URLs at the edge regardless of your app code | Design so the sensitive part **never appears in a request URL**. Then check and document Cloudflare's log retention settings for the zone. |
| Social platform OG fetchers | LinkedIn/Slack/WhatsApp fetch the shared URL server-side — so the *recipient's* platform also sees the parameters | Same fix: the OG image must not need the raw inputs (see below). |
| Form autofill / password managers | Not egress, but browser extensions can read the DOM | Out of your control; do not claim otherwise. |
| Service worker / cache | Caching a URL with inputs persists them on the device | Exclude those routes from any SW cache. |
| `.pdf`/`.docx` generation | Any server-side rendering service is total egress of the letter body | Generate entirely in-browser (`pdf-lib` / `docx`), never via a Worker. |

**How to avoid:**
1. **Resolve the OG contradiction in Phase 0 as an ADR.** Three viable options, in preference order:
   - **(a) Render the card client-side** (`canvas`/`OffscreenCanvas` → PNG blob) and let the user download and attach it. No server, no OG meta tag, weaker virality. Fully honest.
   - **(b) Render server-side but only from non-identifying, coarse inputs**: country + sector + **a rounded gap bucket**, never the user's pay or years. The card says "In {country}, the {sector} pay gap is X%" — the shareable claim is the *statistic*, not the user's salary. Keeps OG virality, keeps the claim true.
   - **(c) Keep raw params but restate the claim** to "no salary data is stored" — **do not do this**; it forfeits the differentiator that the whole project is built on.
   Recommend **(b)**.
2. **Rewrite the claim to be precisely true and put the precise version everywhere.** Something like: *"Nothing you type is sent anywhere. The letter builder, the calculator and the payroll analysis all run in your browser; the only network requests this site makes are for its own static files."* Then list the exceptions explicitly and prominently (analytics beacon: page path + referrer; share card: coarse country/sector/gap only, if option (b)).
3. **Prove it mechanically, in CI, on every deploy — not with a screenshot.** A network-tab screenshot is a claim about one moment. The brief's Playwright gate is already mandatory; extend it:
   - `page.route('**', ...)` intercepting **all** requests during a full end-to-end run of every module (letter generated, card rendered, XLSX uploaded and analysed, range checked).
   - Assert every request URL matches an **allowlist regex**, and that no request URL, POST body, or header contains any of the sentinel values typed by the test (`"7777.77"`, `"ZZTESTEMPLOYER"`, `"Testowa Nazwiskowa"`).
   - Run it against the **deployed** URL, not the dev server.
   - Fail the deploy on any violation. This is a regression test for the product's headline claim; treat it like one.
4. **CSP as enforcement, and check the header in CI**: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://<analytics-origin-if-any>; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`. Assert the served header string in the smoke test — a CSP that drifted in a config change is invisible otherwise.
5. **Dependency egress audit.** Any npm dep that can make a network call in the browser is a risk. Add a CI check that greps the built bundle for `fetch(`, `XMLHttpRequest`, `navigator.sendBeacon`, `new Image().src`, `import(` with a remote specifier, and requires an allowlist annotation for each hit.
6. **Publish the proof as a page, not a README image.** A `/privacy/proof` page with: the CSP header (live), the allowlist, the CI job link, the last run's green result, and instructions for reproducing it in devtools. This is the artefact that wins the Hacker News thread.
7. **Analytics: prefer zero.** Cloudflare Web Analytics is defensible, but the strongest position — given that the entire brand is zero-egress — is no client-side analytics at all, deriving counts from Cloudflare's own edge request counts on distinct static paths (e.g. a 1-byte `/e/letter-generated.gif` fetched on the event, carrying nothing). Weigh this in the H5 decision; the current H5 rationale (tighter CSP) already points this way.

**Warning signs:**
- Any `connect-src` entry beyond `'self'`.
- A URL in the address bar containing a salary while a share button is visible.
- A new dependency with `axios`/`node-fetch`/telemetry in its dep tree.
- The word "stored" appearing in the privacy claim (the claim is about *transmission*).
- A Worker route that accepts anything other than country/sector/bucket.

**Phase to address:** **Phase 0** (ADR resolving the OG card + the Module C URL-parse contradiction), **Phase 1** (share card + the CI egress assertion, shipped together), **Phase 3** (XLSX path included in the assertion), **Phase 4** (Module C — likely means dropping URL parsing entirely).

---

### Pitfall 8: Silent parse failures on real payroll exports

**What goes wrong:**
The engine is correct and the answer is still wrong, because the file was misread. A real payroll export is not a tidy CSV. The failure is silent: `45 000,00` parses as `45` or `NaN`, `NaN` propagates or is dropped, and the tool prints a confident 22.4% gap that is an artefact of a decimal comma.

**The specific failure modes on real EU payroll files:**

| Input reality | Naive behaviour | Correct behaviour |
|---|---|---|
| `45 000,00` (PL/DE/IT decimal comma, NBSP or thin-space thousands) | `parseFloat` → `45` | Locale-aware parse; **reject** ambiguous values rather than guess; show the user the parsed value for the first 5 rows and require confirmation |
| `1,234.56` vs `1.234,56` — the same file can contain both if columns came from different systems | Half the column silently wrong | Detect per column, not per file; if a column contains both patterns, hard error |
| Excel date serials vs text dates; the 1900 vs 1904 epoch | Off-by-4-years hire dates → wrong partial-year handling | Read with `cellDates`, surface the detected epoch, show parsed dates back |
| Multi-row headers (a merged title row, then the real header on row 3) | Header row read as data; every column named `__EMPTY_3` | Header-row detection with a **user confirmation step**, not autodetection alone |
| Merged cells (department spanning 12 rows) | Value only on the first row, `null` on the rest → 11 workers with no category | Detect merges explicitly and either forward-fill **with the user's consent** or refuse |
| Trailing total/subtotal rows | A phantom worker earning the payroll sum → destroys the mean and the top quartile | Outlier and structural checks: flag any row > 5× the 99th percentile; flag rows where the name/ID column is empty |
| Blank rows, hidden rows, filtered rows, multiple sheets | Wrong sheet analysed | Sheet picker is mandatory; show row counts including hidden |
| Currency symbols, `PLN`, `€`, `(1,234)` for negatives | `NaN` or sign flipped | Explicit currency column or per-file currency declaration; refuse mixed currencies |
| `M`/`K` (Polish *mężczyzna/kobieta*), `Mann/Frau`, `1/2`, `m/f/d` | Everything unmapped → dropped | Mandatory sex-value mapping UI showing distinct values and counts |
| Encoding: CP1250 CSV from an older PL system | Mojibake in names/categories → categories split in two | Encoding detection with a preview; offer CP1250/ISO-8859-2 alongside UTF-8 |

**How to avoid — "fail visibly" as an architecture, not a try/catch:**
1. **A mandatory mapping-and-confirmation step between upload and calculation.** The user must see and confirm: sheet, header row, column→field mapping, sex-value mapping, currency, decimal convention, pay-component classification, and reference period. This is not friction — it is the product. Vendors that skip it are the ones producing wrong numbers.
2. **A parse report before any metric is shown**, with: rows read, rows usable, rows excluded and **why** (grouped, with examples), distinct values per categorical column, min/median/max of each numeric column. If exclusions exceed a threshold (say 2%), **block** the calculation behind an explicit "I understand" acknowledgement.
3. **No `NaN` may reach the engine.** `directive-engine` should validate its input and **throw** on a non-finite pay value, a missing category, or an unmapped sex — never coerce, never skip. The UI catches and explains.
4. **Round-trip echo.** Show the user the first five parsed rows *as the engine sees them* (numbers as numbers, dates as ISO). Most decimal-comma disasters are caught here in two seconds.
5. **Reconciliation checksum.** Ask the user for the total payroll cost for the period (one number they already know) and show the parsed total next to it. A mismatch catches merged cells, subtotal rows and decimal errors at once. This single feature is worth more than any amount of parser cleverness.
6. **Test corpus of deliberately hostile fixtures**, committed: a PL export with commas and NBSPs, a DE export with a merged department column, a file with a subtotal row, a file with two header rows, a CP1250 CSV, a file with `m/f/d`, a 60k-row file. These are snapshot-tested.

**Phase to address:** **Phase 3** (Module D). The mapping step and the parse report belong in the Phase 3 acceptance criteria, not in a "polish" backlog.

---

### Pitfall 9: Community PRs putting a wrong statute in front of a worker

**What goes wrong:**
`country-data` is explicitly designed to be community-maintained by PR, and `PROJECT.md` frames it as *"the asset the community maintains by PR"*. That is right strategically and dangerous operationally. A well-meaning contributor updates Croatia's status from a LinkedIn post; a maintainer merges it on a Friday; a Croatian worker sends a letter citing a law that has not been enacted. Or worse: a drive-by PR changes a deadline from 2 months to 30 days and it looks like a typo fix.

There is no reputational recovery path that is as cheap as prevention here, because the artefact — a letter to an employer — has already been sent.

**How to avoid — the governance the data layer needs:**
1. **Schema-first, CI-enforced.** JSON Schema with: required `source_url`, required `source_tier` (enum), required `verified_at` (ISO date, not in the future, not older than the field's TTL), required `volatility`. CI fails on schema violation. Non-negotiable.
2. **Source-domain allowlist.** `source_url` must match an allowlist of official domains per country (official journal, parliament, ministry, equality body, EUR-Lex, CURIA). A PR citing a law-firm blog fails CI with a message explaining why. This is the single highest-leverage gate.
3. **Link liveness + anchor assertion in CI.** Fetch each changed `source_url`; require HTTP 200, a body above a byte floor, **and** the presence of an expected string (the article number, the *Dziennik Ustaw* reference, the statute name). Empty-200 is a failure (see Pitfall 2).
4. **`CODEOWNERS` on `packages/country-data/**` and `packages/letters/**`** with required review; **no auto-merge, ever**; branch protection requiring the legal-data CI job.
5. **Two-person rule for `status` and `deadline` fields.** A PR that changes a transposition status or a statutory deadline requires two approvals, one of which must be a maintainer. Cosmetic fields (equality-body phone number) need one.
6. **Structured PR template** demanding: the official source, a quotation of the operative sentence **in the original language**, an English gloss, the date of entry into force, and whether the source says "draft". The brief's own rule — *"Where the underlying source says 'draft', the UI must say 'draft' too"* — should be a checkbox the contributor ticks and a CI assertion (`status: draft` requires `source_says_draft: true`).
7. **Default to unverified.** A new country field with no `source_tier: official` renders as "pending verification" in the UI and **suppresses the letter's national citation**, falling back to the Directive article. A contributor cannot make the site more confident by merging; only a maintainer's verification can.
8. **Contributions are additive-by-default.** New PRs land in `proposed/` and are promoted by a maintainer. Contributors get the satisfaction of a merged PR without the site changing until review.
9. **Snapshot tests on the letters.** Every locale's letter is snapshot-tested; a `country-data` change that alters letter text shows up as a letter diff in the PR, so reviewers see the *worker-visible consequence*, not just a JSON diff. This is the most important review affordance in the repo.
10. **A `SECURITY.md`-equivalent for legal errors** — `REPORTING-LEGAL-ERRORS.md` with a low-friction channel, an SLA, and a public correction log. Also: a documented **rollback** procedure (revert + redeploy + changelog entry) with a target time.
11. **Precedent to copy:** the Public Suffix List is the closest analogue — community PRs to a data file with real downstream safety consequences. Its policy demands validation records, evidence, verbose rationale, strict formatting, a stakeholder threshold, maintainer review, and explicitly offers **no guaranteed inclusion timeline**; non-conforming patches sit indefinitely rather than being merged to be nice. [PRIMARY-ish — publicsuffix/list CONTRIBUTING] Adopt the same posture: **slow merges are a feature.**

**Warning signs:**
- A PR touching `country-data` with a green CI and one approving review from a bot.
- `source_url` pointing at `.com` domains in merged history.
- The letters snapshot test being updated in the same commit as the data change with no explanation.
- Any "trusted contributor" carve-out on the two-person rule.

**Phase to address:** **Phase 0** (schema, CI gates, CODEOWNERS, PR template — before the repo is public), reinforced in **Phase 2** (letters snapshot tests).

---

### Pitfall 10: Translation that is grammatical, native, and legally wrong

**What goes wrong:**
The Polish letter reads fluently and still fails, because legal Polish is a register with fixed formulae and because the terms must match the **statute's own words**, not a good dictionary equivalent. Three distinct failure layers, and "native speaker review" only reliably catches the first:

| Layer | Failure | Only caught by |
|---|---|---|
| **Fluency** | Calques from English word order; "Drogi Pracodawco" | Any native speaker |
| **Register** | Using informal or business-casual register where legal correspondence requires the formal opening/closing and performative verbs (*zwracam się z wnioskiem o…*, *na podstawie art. … ust. …*, *Z poważaniem*). A letter in the wrong register reads as unserious to an HR/legal reader and undermines the worker. | A native speaker **who writes formal correspondence** |
| **Legal terminology** | Using a dictionary equivalent instead of the statute's term — e.g. rendering "basic wage or salary" with a plausible synonym rather than the term the Kodeks pracy actually uses; rendering "category of workers" with a word that means something else in Polish employment law; translating "worker" as an employment-contract-only term in a country where B2B contracting is widespread (acutely relevant in PL). | A native speaker **who has read the national statute** |

A fourth failure mode specific to this project: **the English-letter-for-any-member-state promise.** A letter in English carrying a Slovak or Lithuanian statutory citation must get the *citation format* right (§ vs Art., paragraph/subsection notation, the official short title of the act). A wrong citation format signals to the recipient that the letter is generated, which is the opposite of the intended effect.

**How to avoid — a review process worth the name:**
1. **Terminology glossary first, per language, sourced from the statute.** Before any letter is drafted, build `packages/letters/glossary/{lang}.json` mapping each Directive concept to the **exact term used in the national implementing act or labour code**, each with a source URL and the quoted sentence it came from. The letter template may only use glossary terms for those concepts, and a lint rule enforces it.
2. **Two-person review, ISO 17100 shape.** The recognised standard for translation services requires translation by a qualified translator followed by **revision by a second, different qualified person** comparing source and target. [SECONDARY — the standard's structure; verify the exact clause reference if you cite it publicly] Apply the same shape: draft → independent revision by a second native speaker → sign-off recorded in the repo (`packages/letters/REVIEWS.md`: language, reviewer, date, commit SHA reviewed).
3. **The reviewer brief must be explicit**, or you get a proofread instead of a review. Ask for, in writing: (a) does the register match formal employment correspondence in this country; (b) does every legal term match the statute — check against the glossary; (c) would an HR/legal recipient treat this as a serious request; (d) is the citation format conventional here; (e) are there national conventions this omits (e.g. a *works council* route, a required addressing convention, a date format); (f) anything that would embarrass a worker who sent it.
4. **Back-translation for the legal sentences only.** Full back-translation is theatre, but back-translating the two or three operative sentences (the request and the citation) and diffing against the English catches the terminology failures that fluency review misses.
5. **Sign-off is a gate with an expiry.** Record the reviewed commit SHA. If `packages/letters/{lang}` changes after sign-off, the locale is marked `review_stale` and CI warns. A `country-data` change that alters the citation invalidates the letter review for that country.
6. **Never ship an LLM-drafted legal letter without the two-person review**, and never let an LLM invent a citation format. This is the same rule as the legal-facts rule; the letters package is legal content.
7. **The deferral decisions are correct and should be enforced as gates.** EN + PL at v1, with SK/IT/LT served by English letters carrying correct national citations, is the right call precisely *because* the review is the bottleneck. But note: the English letter still needs the **citation** reviewed by someone who reads Slovak/Italian/Lithuanian law, even though the prose is English. Budget one short review per country, not zero.

**Warning signs:**
- A locale merged with no entry in `REVIEWS.md`.
- Reviewer feedback consisting only of typo fixes.
- A glossary file that is empty or was written after the templates.
- The phrase "we'll have a Polish speaker look at it" without a defined brief.

**Phase to address:** **Phase 2** (Module A letters, EN/PL) with the glossary built in **Phase 0** alongside `country-data`; **Phase 5** for the Wave-3 locales.

---

### Pitfall 11: The `.ics` deadline is a legal calculation, and it will be wrong

**What goes wrong:**
The optional `.ics` reminder encodes a date. That date is the output of a legal calculation — "two months from the date on which the request is made" (Art. 7(4)) — and calendar-month arithmetic is full of traps: 31 December + 2 months; whether the clock starts on sending or receipt; whether national law converts to working days; whether a national public holiday extends it; the user's timezone versus the employer's. A wrong date in a calendar file is the "wrong deadline" failure mode from Pitfall 1, shipped as a file the user keeps for two months.

**How to avoid:**
- Model it as `{ basis: 'calendar_months' | 'days' | 'working_days', value: number, starts_from: 'sent' | 'received' | 'unknown', source_url, verified_at }` per country, with `starts_from: 'unknown'` as the default.
- Where `starts_from` is unknown, the reminder must fire **earlier** and be labelled "approximate — the two-month period may run from when your employer received the request".
- Use a date library with explicit calendar-month semantics (`Temporal` / `date-fns` `addMonths`, which clamps end-of-month) and unit-test 31 Dec, 31 Jan, 29 Feb, and a leap year.
- Set the event as an **all-day** event in floating time to avoid timezone shifts across the DST boundary.
- Put the caveat in the event **description**, not only on the page.
- Frame the event neutrally ("Two months since your pay-information request") rather than as a call to action.

**Phase to address:** **Phase 2**.

---

### Pitfall 12: Launch reception — fearmongering, lead-gen accusations, and the audit that happens in the first hour

**What goes wrong:**
The distribution plan is the project's biggest asset and its biggest exposure. Three specific reception risks:

1. **The zero-egress audit.** Someone on Hacker News will open devtools within minutes of the Show HN. If the share-card URL carries a salary to an edge function while the headline says "nothing leaves your browser", that is the thread. (See Pitfall 7 — this is why the OG ADR is a **Phase 0** blocker, not a Phase 1 detail.)
2. **The legal audit.** A European lawyer will check one citation. If Article 7 is cited for the pay-criteria right (Pitfall 1), or the "once a year" limit is asserted, the top comment is "the author hasn't read the Directive" — and every other legal claim on the site is then presumed wrong.
3. **The lead-gen accusation.** A free worker-facing tool that funnels HR to a consultancy is a legitimate model, but concealing it is what gets punished. The brief's flywheel (worker → HR → Járnhaus CTA) is exactly the shape people are primed to be cynical about.
4. **The fearmongering accusation.** A calculator that tells individuals a large sum of money was taken from them, based on a population statistic, with a share button — that is the archetype of the thing r/Polska and Wykop will call *pisanie pod tezę*. In the Polish context specifically, "gender pay gap" framing draws hostility that "your legal right to ask what colleagues earn" does not.

**How to avoid:**
- **Lead with the open-source engine on HN**, as the brief already plans — but make the *first link* in the post the `/privacy/proof` page and the golden-vector README, not the marketing page. The HN audience rewards auditability over polish.
- **Be first to state the limitations.** A "What this tool does not do" section, above the fold on the landing page and quoted verbatim in the Show HN text: it doesn't tell you if you're underpaid, it doesn't check your employer, the career number is a national average not a finding about you, some countries haven't transposed yet, here's the correction log. Pre-empting the criticism converts the critic into a contributor.
- **Disclose the business model in the first paragraph, everywhere.** "This is free and always will be. It's built by Járnhaus, who build internal tools for companies; the employer-side calculator has a link to us. That's the whole model." Voluntary disclosure defuses; discovered disclosure detonates.
- **Keep the Járnhaus CTA below the Module D output**, never in the worker-facing flow, and never in the generated artefacts. A CTA in a worker's letter would be indefensible.
- **Polish framing:** lead with the *right* and the *deadline* ("Twój pracodawca ma obowiązek odpowiedzieć"), keep the gap number as supporting context, and pitch consumer-finance press on the legal change rather than the gap. Have the honest-framing copy reviewed by someone who reads Wykop before it goes out.
- **Have the correction log live on day one**, with at least one entry (e.g. "2026-xx-xx: corrected the Article 7 citation for the pay-criteria right to Article 6"). A correction log with entries reads as rigour; an empty one reads as new.
- **Do not launch a country before its `country-data` is `source_tier: official`.** A wave that ships a country on a law-firm blog citation is the wave that produces the correction.
- **Pre-brief two unions or NGOs.** A link from an equality body or union is worth more than any press hit and immunises against the fearmongering charge, because those organisations will have reviewed the framing.

**Warning signs:**
- The Show HN draft leading with the career-gap number.
- The landing page having no "what this doesn't do" section.
- Módule D's CTA appearing anywhere a worker can reach.
- Launch scheduled before the CI egress assertion is green on the deployed URL.

**Phase to address:** **Phase 0** (business-model disclosure copy, OG ADR), **Phase 1** (framing copy, "what this doesn't do"), **Phase 3** (Show HN material), and the launch checklist itself.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Seed `country-data` from vendor/law-firm sources with a promise to verify later | All 27 states at launch, site is instantly a linkable reference | The reference becomes the citation of record for journalists; a wrong entry is quoted back at you and lives in npm caches. Retrofitting `source_tier` after publication means auditing 27 files under time pressure | **Never for `status`, `legal_basis`, `deadline`.** Acceptable for `equality_body.phone` and other cosmetic fields, marked `source_tier: secondary` and shown as such |
| One "canonical" golden vector for the engine | Fast TDD start | Bakes one convention set in as truth; national adapters then fight the core; every disagreement with a vendor looks like a bug | Never — write per-convention vectors from day one, it costs one extra fixture file |
| Default values for calculation conventions (FTE, median rule, tie rule) | Module D "just works" on any upload | The tool silently produces a number under assumptions the user never saw and cannot reproduce; Art. 9(6) methodology disclosure becomes impossible | Never in `directive-engine`. Acceptable in the *web UI* as a pre-selected option that is visible and changeable |
| Auto-detect the payroll file's header row / sex column / decimal convention without confirmation | Fewer clicks | Silent wrong numbers, which is the one failure this project cannot survive with an HR audience | Only as a **pre-fill** for a confirmation step |
| Ship the OG card with raw salary params and soften the privacy wording | Virality on day one | Forfeits the differentiator; one devtools screenshot on HN | Never |
| Skip the second-reviewer step for a locale to make a launch date | Ships the locale | A legally wrong letter in a language nobody on the team reads; you will not find out from users, you will find out from an employer's lawyer | Never — cut the locale instead (the brief already sets this precedent for SK/IT/LT) |
| Client-side XLSX parsing on the main thread | Simpler code | UI freeze on the first real 40k-row export; on mobile, a tab crash with no error | Acceptable only behind a hard file-size gate (e.g. < 2 MB) with a Worker path above it |
| AGPL app + MIT engine in one monorepo without boundary enforcement | Fast setup | Code drifts across the boundary; an MIT-published package ends up containing AGPL-derived code, or vice versa. Untangling after npm publication is genuinely painful | Never without a CI check on import direction (`apps/web` may import `packages/*`; `packages/directive-engine` may import nothing from the app) and a per-package `LICENSE` file |
| Publishing `country-data` to npm alongside the engine | One install for consumers | Consumers pin an old version and ship stale legal facts under your name | Acceptable **only** with a build-time staleness warning baked into the package (`console.warn` if `verified_at` older than TTL) and a documented "always fetch fresh" recommendation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Eurostat (GPG data) | Hard-coding 11.1% and a year; ignoring dataset flags | Store per-country and per-sector values with the **reference year**, the **provisional/definitive** status, and Eurostat's flags (`:` not available, `u` low reliability, `e` estimated, `b` break in series). A `u`-flagged or `:` cell must **suppress** the calculation for that cell, not fall back to the EU average silently. Record `next_expected_release` (2024 figures are provisional to December 2026) |
| Eurostat sector breakdown | Assuming every country × NACE section cell exists | Many cells are missing or unreliable. Build a coverage matrix at build time; the sector selector must only offer sectors with a usable cell for the selected country. Exclude NACE **O** entirely (out of the indicator's scope) |
| Cloudflare Web Analytics | Assuming "cookieless" means "payload-free" | It reports the page URL. Ensure no route that can contain user input is ever the reported URL; strip or rewrite before the beacon fires; assert this in the CI egress test |
| Cloudflare Workers (OG rendering) | Treating an edge function as "not a server" | It is a server with request logs. Only coarse, non-identifying params may reach it (see Pitfall 7). Document the zone's log-retention setting |
| Cloudflare Pages headers/CSP | Setting CSP once and assuming it persists through config changes | Assert the exact response header string in the Playwright smoke test on the deployed URL |
| SheetJS / XLSX in the browser | Parsing on the main thread; sparse mode on large sheets; assuming `parseFloat` works | Use a Web Worker (SheetJS documents Workers precisely to avoid freezing the tab), dense mode for large sheets, `cellDates`, and a locale-aware numeric parser. SheetJS notes browser **string-length limits** are hit by very large files [PRIMARY-ish — docs.sheetjs.com/docs/demos/bigdata/worker]. **[UNVERIFIED]** exact V8 string/heap limits — measure on target devices rather than citing a number |
| PDF/DOCX generation | Using a hosted rendering service | Generate in-browser (`pdf-lib`, `docx`). Any hosted renderer is total egress of the letter body |
| `mailto:` links | Assuming the whole letter fits | `mailto:` bodies are length-limited and vary by client; long letters truncate silently. Cap the body, and always offer copy/download as the primary path with `mailto:` as convenience |
| `.ics` files | Timezone-bound events; naive month arithmetic | All-day floating event; clamped calendar-month arithmetic; caveat in the description (Pitfall 11) |
| Job-portal URL parsing (Module C) | Fetching a third-party URL "client-side" | CORS makes this impossible without a proxy, and a proxy is egress. Either drop it or make it an explicit, disclosed, opt-in server call outside the zero-egress claim — recommend dropping it for v1 |
| npm publish (`directive-engine`) | Publishing legal-adjacent code with no accuracy statement | README must state: which Directive articles are implemented, which conventions are *not* fixed by the Directive and must be supplied by the caller, and that output is a draft requiring Art. 9(6) management confirmation |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| Main-thread XLSX parse | Tab unresponsive, "page isn't responding" dialog, no error | Web Worker + transferable `ArrayBuffer`; progress events; a cancel button | Noticeable ~5–10k rows on desktop; a frozen tab well below that on a mid-range Android |
| Whole-file `readAsArrayBuffer` on mobile | Silent tab reload with no error (iOS kills the tab, no JS exception fires) | File-size gate with a clear message before reading; suggest desktop for large files; feature-detect and degrade | Mobile Safari tab memory ceilings — **[UNVERIFIED]** exact figures; measure on a real mid-range device, do not cite a number |
| Sparse (default) sheet objects for large ranges | Memory blows up well before the file size suggests | SheetJS dense mode for large sheets | Tens of thousands of rows × wide sheets |
| Sorting the whole workforce repeatedly per metric | Slow on large files, and quartile results depend on sort stability | Sort once, reuse the ordering; use an explicit, deterministic comparator with a documented tie-break | 50k+ rows; correctness issue at **any** size |
| Rendering a per-row parse report into the DOM | Freeze on the report, after surviving the parse | Aggregate by reason; show counts + 3 examples per reason; virtualise if you must list rows | ~2k excluded rows |
| Rendering all 27 country pages' data into one bundle | Slow first load, hurts the Lighthouse 100 gate | Per-country JSON fetched on selection (still `'self'`), or Astro static per-country routes | Whole-dataset bundling at ~27 files |
| Share-card OG generation on every request | Worker CPU limits, slow social unfurls | Cache by the coarse param tuple (country/sector/bucket) — which is only possible if you adopt option (b) in Pitfall 7 | Viral spike, which is the scenario you are building for |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Salary or employer name in a URL that is transmitted (path/query) | The zero-egress claim is false; edge logs, analytics, `Referer`, and social unfurlers all see it | Fragment-only or coarse-bucket params; `Referrer-Policy: no-referrer`; CI assertion (Pitfall 7) |
| Employer name typed into the letter appearing in an analytics event | A worker's employer + intent to make a pay claim is genuinely sensitive; combined with IP it is identifying | Analytics events must be **names only**, never properties. Enforce by lint rule on the analytics call signature (no second argument) |
| Any error-reporting SDK | Captures URLs, DOM, form values — i.e. exactly the data you promised never leaves | Do not install one |
| Third-party fonts/scripts/CDNs | IP transmission to a third country; **LG München I, 3 O 17493/20 (20.01.2022) awarded €100** for Google Fonts embedding, followed by a mass-warning-letter wave in Germany | Self-host everything; `default-src 'none'` baseline; SRI where any external resource is unavoidable |
| Persisting user input in `localStorage`/IndexedDB without saying so | A shared or work device retains the draft letter; the "no storage" impression is broken locally | Either don't persist, or persist explicitly with a visible "clear" control and a stated retention |
| The "notify me when it lands" local bookmark page | Sounds like it stores an email; if implemented via a URL it may leak intent | Implement as a pure client-side bookmark/`.ics`; never accept an email field at all, not even a disabled one |
| Rendering user-supplied employer/job text into PDF/DOCX/HTML | Injection into the generated document, and XSS in the preview | Escape on render; treat all letter inputs as untrusted; never `innerHTML` |
| XLSX as an untrusted input | Formula injection into any CSV/XLSX **export** (a cell starting `=`, `+`, `-`, `@` executing in the analyst's Excel) | Prefix exported text cells with `'` or reject leading formula characters; this matters because Module D exports JSON/PDF that analysts re-import |
| Zip-bomb / pathological XLSX | Tab crash or hang | Size gate + Worker + timeout with a cancel path |
| `country-data` supply chain | A malicious or careless PR changes a statute or an equality-body URL to a phishing site | Source-domain allowlist, CODEOWNERS, two-person rule, no auto-merge (Pitfall 9). Equality-body URLs are a phishing target — treat them as security-relevant, not cosmetic |
| Publishing `.map` files or uploading them | Supply-chain/egress surface | Deliberate decision, documented |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Presenting a national average as a statement about the user | The user believes a specific sum was taken from them; when challenged they cannot defend it and feel foolish; the project looks manipulative | Conditional, arithmetic framing + visible methodology (Pitfall 5) |
| A single "generate & send" flow with no reflection point | A worker in a five-person team sends an identifying request during a restructuring | Non-skippable "before you send" step; representative-first routing for small groups (Pitfall 4) |
| Footer-only disclaimer | The disclaimer is not seen and does not travel with the artefact | Four placements including inside every generated file (Pitfall 3) |
| "Draft"/"pending" status shown in the same visual weight as "in force" | A worker cites a law that does not exist yet | Distinct, non-colour-only treatment (WCAG AA); the letter's citation **falls back to the Directive article** when national status ≠ in force; the country page states plainly what is and is not in force |
| Hiding the `verified_at` behind a tooltip | The freshness signal, which is the trust position, is invisible | Show the date inline next to the legal basis, in the letter, and on the country page |
| Module D showing a number before the mapping is confirmed | An analyst screenshots a wrong number | Metrics are gated behind the confirmation step; no preview number |
| A single headline gap figure in Module D | Reads as "the" answer; invites a dispute with the vendor's number | Show all seven metrics with population counts, exclusions and the assumption set on the same screen |
| Country selector listing 27 states identically | A worker in a non-transposed state gets a letter that looks as authoritative as one from Malta | Group and label by status; pending-country mode explains what *is* in force (PL recruitment provisions) and what is not |
| Share button adjacent to the biggest number | Optimises for spreading the least defensible artefact | Put the share affordance after the honesty layer, and make the card carry its caveats |
| Mobile: a payroll-upload CTA on a phone | HR user starts on mobile, tab dies mid-parse | Detect and say so: "this works best on a desktop; large files may not load on a phone" |
| No visible correction/report-an-error path | A user who spots a legal error has nowhere to go and posts publicly instead | "Report a legal error" link on every country page, pointing at the issue template |

---

## "Looks Done But Isn't" Checklist

- [ ] **Article 7 letter:** cites Art. 7 for pay levels **and Art. 6 separately** for the pay/progression criteria — verify no artefact cites Art. 7 for the criteria
- [ ] **Article 7 letter:** deadline phrased as "without undue delay and in any event within two months", not a flat two months — verify against Art. 7(4)
- [ ] **Article 7 letter:** carries the **Art. 7(6)** warning about not reusing the received information — verify it is in the artefact, not only on the page
- [ ] **Article 7 flow:** offers the workers'-representative / equality-body route (Art. 7(2)) and reflects any national Art. 12(3) restriction — verify per country
- [ ] **Article 7 flow:** no "once a year" claim anywhere — verify by grep
- [ ] **Disclaimer:** present in `.txt`, `.pdf`, `.docx`, `mailto:` body **and** `.ics` description — verify by opening each generated file
- [ ] **`verified_at`:** the verifier actually fetched something (non-empty body, expected anchor string) — verify by deliberately breaking a URL and confirming CI goes red
- [ ] **`country-data`:** every `status`/`legal_basis`/`deadline` has `source_tier: official` — verify CI fails on a `secondary`-only field
- [ ] **Draft handling:** every country whose source says "draft" renders "draft" and suppresses the national citation in the letter — verify with a fixture
- [ ] **Module B:** handles a **negative** gap (Luxembourg) and a **missing sector cell** without producing a number — verify both
- [ ] **Module B:** blocks or warns for public-sector / NACE O and for employers under 10 employees (outside the indicator's coverage) — verify
- [ ] **Module B:** share card image itself contains reference year + "unadjusted" + "national average" — verify at thumbnail size
- [ ] **Module B:** `/methodology` page exists and is linked from the card's landing page — verify the link works from a cold share
- [ ] **Module D:** refuses to run without an employer-supplied `category` column — verify no inference path exists
- [ ] **Module D:** every convention (median rule, quartile tie rule, pay basis, partial-period policy, component map) is printed in the export — verify in the PDF
- [ ] **Module D:** export has separate **authority** (a)–(g) and **publishable** (a)–(f) modes per Art. 9(7) — verify
- [ ] **Module D:** export is labelled a draft and references the Art. 9(6) management-confirmation requirement — verify
- [ ] **Module D:** unmapped/blank/other sex values are reported as an explicit exclusion count, never silently dropped — verify with a fixture containing `m/f/d`
- [ ] **Module D:** decimal-comma, merged-cell, subtotal-row, CP1250 and two-header-row fixtures all either parse correctly or **fail visibly** — verify each
- [ ] **Zero-egress:** Playwright run against the **deployed** URL asserts no request carries a sentinel salary/employer value, across all four modules — verify by planting a deliberate leak and confirming CI goes red
- [ ] **Zero-egress:** CSP response header asserted by string on the deployed URL — verify
- [ ] **Zero-egress:** no third-party origin in fonts, scripts, styles, images — verify by `default-src 'none'` and a green run
- [ ] **Zero-egress:** the public claim wording matches what the CI test actually proves — verify by reading them side by side
- [ ] **Letters:** every shipped locale has a `REVIEWS.md` entry with reviewer, date and reviewed commit SHA, and the SHA is current — verify
- [ ] **Letters:** English letters for SK/IT/LT/MT have had their **citation format** checked by someone who reads that jurisdiction — verify
- [ ] **Governance:** a test PR from a non-maintainer account with a `.com` source and a changed deadline is **blocked** by CI and by branch protection — verify by actually doing it
- [ ] **Licensing:** `directive-engine` has no import path back into `apps/web`; each package has its own LICENSE — verify with a CI import-boundary check
- [ ] **Launch:** correction log page live; "what this tool does not do" section live; business model disclosed above the fold — verify

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Wrong legal fact discovered post-launch | **MEDIUM** | Correct the data; redeploy; add a dated entry to `CHANGELOG-legal.md`; if letters were generated with the wrong citation, publish a plain-language notice on the affected country page explaining what was wrong and what a worker who already sent one should do (contact the equality body — not advice, a pointer); notify anyone who linked the dataset |
| Wrong legal fact already shipped in a published npm `country-data` version | **HIGH** | Publish a patched version; **deprecate** the bad version with `npm deprecate` and a message naming the field; the built-in staleness warning (see Technical Debt) is what limits the blast radius — which is why it must exist before the first publish |
| Zero-egress claim shown to be false | **HIGH** | Do not argue. Same-day: disable the offending path, restate the claim precisely, publish a post-mortem with the CI test that now covers it. The claim is the brand; a fast, technical, unqualified correction is the only recovery |
| Module D produces a number that disagrees with a vendor / national template | **LOW–MEDIUM** if the assumption set is printed on the export; **HIGH** if it isn't | With provenance: point to the convention, show the comparison harness, offer the matching option. Without: you are arguing about an unreproducible number with the audience you were trying to win |
| Economist takedown of the career-gap number | **MEDIUM** | Reply with the Eurostat caveat you already quoted and the methodology page you already published; if the criticism is right, change the copy the same day and log it. Recovery cost is near zero **if** the methodology page pre-existed and near-total if it didn't |
| A worker reports retaliation after using the tool | **HIGH — reputational and human** | Have the response prepared before launch: the equality-body and union contacts for that country, a plain statement of Art. 25, and no legal advice. Review whether the "before you send" step failed to surface the risk, and change it. Do not be improvising this on the day |
| Bad community PR merged into `country-data` | **LOW** if caught in hours | Revert, redeploy, changelog entry, and tighten the specific gate that let it through. Publish the gate change — it is evidence the governance works |
| Accused of being a lead-gen funnel | **LOW** if the model was disclosed up front; **MEDIUM** otherwise | Point at the disclosure. If it wasn't disclosed, disclose now, prominently, and accept the hit |
| Locale shipped without a real review, error found | **MEDIUM–HIGH** | Pull the locale (fall back to the English letter with the national citation), commission the review, re-ship. Pulling a locale is survivable; defending a bad one is not |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---|---|---|
| 1 — Inherited legal errors (4 already present) | **Phase 0** | The four listed errors are fixed in `PROJECT.md`/brief/specs; `source_tier` CI gate red on a `secondary`-only legal field; grep for "once a year" returns nothing |
| 2 — `verified_at` as decoration | **Phase 0** | Break a source URL → CI red; expire a field → UI degrades visibly; empty-200 → CI red |
| 3 — UPL boundary / disclaimers | **Phase 0** (ADR) → **1, 2, 4, 5** | No conditional branch keyed on a legal characterisation; disclaimer present in every generated artefact; DE copy reviewed by a German lawyer before the DE locale ships |
| 4 — Retaliation duty of care | **Phase 2** | "Before you send" step is non-skippable; small-group branch changes the default request; Art. 7(6) warning in the artefact; representative route reachable in ≤ 2 taps |
| 5 — Career-gap number | **Phase 1** | `/methodology` live with the calculator; negative-gap and missing-cell cases handled; NACE O blocked; hostile pre-mortem review completed and its findings closed |
| 6 — Art. 9 calculation traps | **Phase 0** (convention ADR) → **Phase 3** | Per-convention golden vectors pass, including ties/n mod 4/1-woman-category/negative gap; engine throws on a missing convention; comparison harness in the README |
| 7 — Zero-egress breakage | **Phase 0** (OG ADR) → **1, 3, 4** | Deployed-URL Playwright egress assertion green with planted sentinels; CSP header asserted; deliberate-leak test goes red |
| 8 — Silent parse failures | **Phase 3** | Every hostile fixture parses correctly or fails visibly; reconciliation checksum implemented; no `NaN` reaches the engine (engine throws) |
| 9 — Community PRs to legal facts | **Phase 0** (before the repo is public) | A deliberately bad test PR is blocked by CI and branch protection; letters snapshot diff appears in a `country-data` PR |
| 10 — Translation / legal register | **Phase 0** (glossary) → **Phase 2** (EN/PL) → **Phase 5** (Wave 3) | Glossary terms sourced from statutes with quotations; `REVIEWS.md` entry per locale with a current commit SHA; back-translation of operative sentences diffed |
| 11 — `.ics` deadline arithmetic | **Phase 2** | Unit tests for 31 Dec / 29 Feb / leap years; all-day floating event; caveat in the description |
| 12 — Launch reception | **Phase 0** (disclosure copy) → **Phase 1** (framing) → **Phase 3** (Show HN) → launch | "What this doesn't do" live; correction log live with ≥1 entry; business model above the fold; no country launched on a `secondary` citation |

---

## Sources

**Primary / official (substantively authoritative; transport tier LOW — re-verify at build time)**

- Directive (EU) 2023/970 — Articles 3(1), 6, 7, 9, 10, 12, 25 and the Art. 20–30 headings, retrieved via a reader proxy against EUR-Lex CELEX 32023L0970. Canonical URL: https://eur-lex.europa.eu/eli/dir/2023/970/oj/eng — **direct fetch failed in this session; Phase 0 must re-pull from EUR-Lex**
- European Commission, *Frequently asked questions on the Pay Transparency Directive (2023/970)*, 6 August 2026 — https://commission.europa.eu/document/download/828ecf2a-e13d-4346-bdca-7eccbbfe28d3_en (pay elements, occupational pension contributions, universal benefits, statutory social security not being pay, category-of-workers definition, GDPR/Art. 12(3), assistance channels). Note its own disclaimer: preliminary views of Commission services, not an official EC position; only the CJEU may authoritatively interpret EU law
- European Commission, EU action for equal pay — https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/gender-equality/equal-pay/eu-action-equal-pay_en
- Eurostat, *Gender pay gap statistics* (Statistics Explained) — https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Gender_pay_gap_statistics (11.1% EU 2024, provisional to Dec 2026; LU −0.8%, EE 18.8%; hourly basis; 10+ employee enterprises; NACE B–S excl. O; "broader than discrimination")
- § 2 RDG (Begriff der Rechtsdienstleistung) — https://www.gesetze-im-internet.de/rdg/__2.html
- RDG §§ 3, 6, 7, 8, 20 — https://www.gesetze-im-internet.de/rdg/BJNR284010007.html
- § 12 EntgTranspG (Reichweite; "weniger als sechs Beschäftigten des jeweils anderen Geschlechts") — https://www.gesetze-im-internet.de/entgtranspg/__12.html
- UK Government, *Gender pay gap reporting: making your calculations* — https://www.gov.uk/government/publications/gender-pay-gap-reporting-guidance-for-employers/making-your-calculations (quartile method, boundary tie rule, leftover-to-lower-quarter, full-pay vs all relevant employees; updated 21 May 2026 following a Supreme Court ruling on the definition of sex)
- FTC, *FTC Finalizes Order with DoNotPay That Prohibits Deceptive "AI Lawyer" Claims…*, February 2025 — https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires
- FTC, DoNotPay case page — https://www.ftc.gov/legal-library/browse/cases-proceedings/donotpay
- Public Suffix List CONTRIBUTING (governance analogue for community-maintained safety-relevant data) — https://github.com/publicsuffix/list/blob/master/CONTRIBUTING.md
- SheetJS, *Web Workers* demo (large-file handling, browser length limits) — https://docs.sheetjs.com/docs/demos/bigdata/worker/

**Secondary (directional only — must not be shipped as legal facts)**

- BGH, 9 September 2021, **I ZR 113/20** (smartlaw contract generator) — reported by LTO (https://www.lto.de/recht/juristen/b/bgh-izr11320-vertragsgenerator-smartlaw-legal-tech-keine-unzulaessige-rechtsdienstleistung-rdg-rechtsberatung), Anwaltsblatt (https://anwaltsblatt.anwaltverein.de/de/themen/recht-gesetz/bgh-erlaubt-smartlaw), WBS Legal. **Judgment text not retrieved — pull from bundesgerichtshof.de in Phase 0**
- LG München I, 20 January 2022, **3 O 17493/20** (Google Fonts, €100 damages) — GDPRhub summary; dejure.org; rewis.io. **Judgment text not retrieved (403) — verify in Phase 0**
- Polish out-of-court legal-advice regime (no reserved monopoly; title protection; art. 87 k.p.c. for court representation) — Polish legal-practice commentary via search. **Needs a Polish-qualified check**
- Polish Kodeks pracy recruitment pay-transparency amendment in force 24 December 2025 (act of 4 June 2025, published in Dziennik Ustaw 23 June 2025) — secondary Polish sources; **article numbers and Dz.U. reference not verified**
- Vendor guides on Art. 9 calculation (deel.com, axiosanalytics.com) — used only as evidence that vendor guidance **diverges** from the Directive and the Commission FAQ (FTE normalisation, statutory sick pay, six-person suppression)
- Pay-secrecy and retaliation literature (LSE/JELS, IWPR, NWLC, ScienceDirect) — prevalence of pay secrecy, **not** retaliation-rate data

**Explicitly unverified — do not assert these without further work**

- Any quantitative retaliation-incidence figure for EU pay enquiries
- Any specific browser memory/string-length limit for XLSX parsing (measure on target devices instead)
- The exact fine tiers in § 20 RDG
- ISO 17100's precise clause structure, if cited publicly
- National small-group / suppression thresholds outside Germany (IE, AT, SE, FR, LT, NL) — needed for Phase 5 adapters
- Whether any Member State has taken the Art. 12(3) restricted-access option, and which — needed per country in `country-data`

---
*Pitfalls research for: EU pay-transparency legal-tech (worker-facing request generation + employer-facing Article 9 calculation), client-side only, community-maintained legal data*
*Researched: 2026-09-10*
