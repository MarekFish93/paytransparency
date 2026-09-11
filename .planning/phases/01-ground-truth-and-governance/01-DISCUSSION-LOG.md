# Phase 1: Ground Truth and Governance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-11
**Phase:** 1-Ground Truth and Governance
**Areas discussed:** EUR-Lex ground truth, Verification scope at close, How hard the gates bite, The frozen decisions (all four offered areas selected)

---

## EUR-Lex Ground Truth

### Q1 — How should the Directive's primary text be pulled and anchored?

| Option | Description | Selected |
|--------|-------------|----------|
| Human pull + committed snapshot | Marked as recommended. One manual retrieval, committed with a SHA-256; CI only asserts the committed hash. Zero CI fragility, highest provenance, bounded cost across 6 articles | |
| Automated CELEX fetch in CI | Fetch CELEX HTML at build time with retries across alternate URL forms; bets the build on the endpoint already observed returning empty 200s | |
| Cellar / SPARQL machine API | Stable URIs and machine-readable formats designed for programmatic access; likely more reliable than scraping but unproven here | ✓ |
| You decide | Claude picks during research/planning based on what actually responds | |

**User's choice:** Cellar / SPARQL machine API
**Notes:** Flagged back to the user that this converts retrieval from a one-afternoon manual job into a real build-and-test task, and that the researcher must confirm Cellar responds from CI before anything depends on it.

### Q2 — Once Cellar returns the text, commit it or fetch fresh each time?

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch once, commit the snapshot | Marked as recommended. Cellar as acquisition method, committed hashed extract as the citable artefact; offline builds, stable permalinks, scheduled diff opens a review task | |
| Fetch live at build time | Always current by construction; build depends on external availability, no stable artefact to cite or diff, silent content change flows through unreviewed | ✓ |
| Commit snapshot, no drift job | Fetch once, commit, stop — cheapest, but nothing detects consolidated-text changes | |

**User's choice:** Fetch live at build time
**Notes:** Concern recorded rather than relitigated — no frozen artefact to cite or diff, and build availability now depends on Cellar. Carried forward into the gates area and written into CONTEXT.md D-02 as a risk for the planner to mitigate (e.g. CI caching of the last successful response).

### Q3 — Which language versions do we retrieve and quote?

| Option | Description | Selected |
|--------|-------------|----------|
| EN + every served locale | Marked as recommended. Polish letters quote authentic Polish wording rather than a translation of the English; cheap because it is the same CELEX id | ✓ |
| EN only | Simplest and defensible since English is authentic too, but a Polish letter citing English statutory wording reads as less serious | |
| EN + PL now, others later | Matches the locale roadmap, but SK/IT/LT/MT workers get an English letter at v1 regardless | |

**User's choice:** EN + every served locale
**Notes:** Context given that all 24 EUR-Lex language versions are equally authentic in law.

### Q4 — What granularity of Directive text gets stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Full article + tagged operative sentences | Marked as recommended. Letter and UI quote the tagged sentence; full text present so a quotation can be checked in context. Guards against the four inherited errors | ✓ |
| Operative sentences only | Smallest payload, but quotation without retrievable context is what produced the Art. 6 / Art. 7 conflation | |
| Full articles only | Honest and simple, but the letter then quotes a whole article or hardcodes a sentence somewhere untracked | |

**User's choice:** Full article + tagged operative sentences

---

## Verification Scope at Close

### Q1 — What must Phase 1 deliver as *verified* across the 27 states?

| Option | Description | Selected |
|--------|-------------|----------|
| Launch set deep, rest structurally seeded | Marked as recommended. All 27 exist with a real transposition status; PL/SK/IT/LT/MT fully verified; other 22 honestly pending. Matches who can get a letter at v1 | ✓ |
| All 27 fully verified | A genuine reference from day one, but roughly 160 field-level verifications across 24 languages blocking every downstream phase | |
| Transposition status only, everywhere | Fastest to Phase 2, but Phase 5 needs deadline/routing/equality body per country anyway — moves the same work later | |
| Poland deep, 26 structurally seeded | Tightest possible phase, but breaks the stated v1 promise for Bratislava, Rome, Vilnius and Valletta | |

**User's choice:** Launch set deep, rest structurally seeded

### Q2 — Who may set a launch-country field to 'verified'?

| Option | Description | Selected |
|--------|-------------|----------|
| Agent proposes, human confirms deep fields | Marked as recommended. Agent drafts the Fact<T>; legally-operative launch fields need human eyes before flipping to verified; verified_by records which | ✓ |
| Agent verification sufficient if CI gates pass | Much faster and fully automatable; bets that allowlist + anchor assertion is strong enough — but the right domain can still be the wrong article | |
| Human confirms every field, all countries | Maximum safety, but makes the structural seed nearly as expensive as full verification | |

**User's choice:** Agent proposes, human confirms deep fields

### Q3 — What can a worker in one of the 22 pending countries get?

| Option | Description | Selected |
|--------|-------------|----------|
| Directive-only fallback, clearly labelled | Marked as recommended. Letter cites the Directive article; schema carries an explicit suppressed-national-citation state rather than silently omitting | ✓ |
| No letter until the country is verified | Safest and simplest, but most of the EU hits a dead end and the 27-country reference converts into nothing actionable | |
| Letter with a visible 'unverified' warning | Maximum reach, but puts an unverified statute into a document sent to an employer — the exact failure this phase prevents | |

**User's choice:** Directive-only fallback, clearly labelled
**Notes:** Question explicitly surfaced a documented ambiguity — PROJECT.md's key decision says the English letter serves "any EU state with that state's correct national citation" while its rationale names only PL/SK/IT/LT/MT. The fallback state reconciles both readings.

### Q4 — Does Phase 1 resolve the Polish UPL question or record it?

| Option | Description | Selected |
|--------|-------------|----------|
| Record as a blocking gate, resolve before Phase 5 | Marked as recommended. Writes down precisely what needs a Polish-qualified answer and what ships only once cleared; no paid calendar dependency on the first phase | ✓ |
| Resolve it in Phase 1 | Removes the legal unknown that could invalidate the flagship module, but puts an external paid dependency on the critical path for copy that does not exist yet | |
| Treat it as a Phase 5 concern entirely | Keeps this phase purely about data and gates, but an untracked legal blocker found at Phase 5 is how launches slip | |

**User's choice:** Record as a blocking gate, resolve before Phase 5

---

## How Hard the Gates Bite

### Q1 — A source fetch fails in CI. What happens?

| Option | Description | Selected |
|--------|-------------|----------|
| Distinguish unreachable from wrong | Marked as recommended. Empty-200 / wrong anchor / 404 hard-fails as a data defect; transport failure retries then blocks under a distinct "unreachable, not disproven" status with a recorded maintainer override | ✓ |
| Fail closed, no exceptions | Impossible to quietly weaken, but with EUR-Lex empty-200s and 27 governments' sites the repo will spend real time red for non-data reasons | |
| Warn on transport, fail on content | Never blocks on someone else's outage, but a source dead for six months just keeps warning and the warning becomes wallpaper | |

**User's choice:** Distinguish unreachable from wrong
**Notes:** Framed against the live-fetch decision from the EUR-Lex area, which put external network on two critical paths.

### Q2 — When a fact goes stale past its TTL, does the build fail or does the UI degrade?

| Option | Description | Selected |
|--------|-------------|----------|
| Degrade the UI, fail the build only on launch countries | Marked as recommended. Stale volatile fields degrade the country page and are suppressed from share cards and letter citations; hard build failure reserved for launch-country legally-operative fields | ✓ |
| Build fails on any stale fact — LEGAL-08 literally | Unambiguous, but 90-day TTLs across 27 states make the site undeployable on a schedule and pressure TTLs toward meaninglessness | |
| Never fail the build, always degrade | Maximum availability and the most honest UI, but LEGAL-08 becomes false as written with no hard stop on a stale statutory deadline | |

**User's choice:** Degrade the UI, fail the build only on launch countries
**Notes:** This question existed because REQUIREMENTS.md LEGAL-08 and research Pitfall 2 directly contradict each other. Consequence recorded: LEGAL-08 must be reworded in `.planning/REQUIREMENTS.md` rather than left contradicting the implementation.

### Q3 — How do community contributions land?

| Option | Description | Selected |
|--------|-------------|----------|
| Additive-by-default via proposed/ | Marked as recommended. PRs land in proposed/ and a maintainer promotes; merging alone cannot make the site more confident. Public Suffix List posture — slow merges are a feature | ✓ |
| Direct edits, gated by CI + CODEOWNERS | Simpler repo and faster corrections, but every gate is automated except human review and a merge goes live immediately | |
| Direct edits, two-person rule on everything | Strong and simple to explain, but throttles a phone-number fix at the same rate as a statutory deadline | |

**User's choice:** Additive-by-default via proposed/

### Q4 — When does the repo go public?

| Option | Description | Selected |
|--------|-------------|----------|
| At Phase 1 close, after the bad-PR drill | Marked as recommended. Opens once each gate is proven to reject a fake statute, a law-firm blog source, an empty-200 URL and a silent deadline change | ✓ |
| Hold private until launch (Phase 7) | The first-hour audit finds a finished product, but the gates ship having never met a real contributor and the licence split has no adoption runway | |
| Public from the start | Best for credibility and early contributors, but inverts the stated criterion — gates would meet real PRs before meeting a deliberately bad one | |

**User's choice:** At Phase 1 close, after the bad-PR drill

---

## The Frozen Decisions

### Q1 — How does a golden vector get proved correct?

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-computed worked example, independently re-derived | Marked as recommended. Second derivation from the conventions alone, without seeing the first answer; disagreement reveals an ambiguous convention. Slowness forces vectors to stay small | ✓ |
| Cross-check against an existing official calculator | Strongest provenance where such a tool exists, but availability varies by member state and may not cover all seven Article 9 metrics | |
| Spreadsheet-derived, reviewed | Fast and auditable, but a formula error reviews as cleanly as a correct one and the reviewer checks the artefact that produced the answer | |

**User's choice:** Hand-computed worked example, independently re-derived
**Notes:** Framed on the premise that a wrong golden vector does not fail a test — it defines the wrong answer and every later test agrees with it.

### Q2 — What happens where a convention is underdetermined by the Directive?

| Option | Description | Selected |
|--------|-------------|----------|
| Documented default, overridable, report which was used | Marked as recommended. HR can defend the figure to their auditor; disagreement becomes a parameter not a bug report. Costs a field in the frozen EngineReport type | ✓ |
| Pick one, no override | Simplest engine and nothing for a user to get wrong, but an employer under contrary national guidance gets an unusable number | |
| Refuse to compute where underdetermined | Maximally honest and impossible to misquote, but part-time workers exist in nearly every payroll so most real uploads would blank out | |

**User's choice:** Documented default, overridable, report which was used
**Notes:** Part-time normalisation given as the clearest case Art. 9 does not settle.

### Q3 — How coarse must the transmitted share-card values be?

| Option | Description | Selected |
|--------|-------------|----------|
| Wide buckets, no country or job signal | Marked as recommended. Bucketed lifetime total and rounded gap percentage only, previewed before Share; survives an adversarial read of the Worker request log. Costs card specificity | ✓ |
| Buckets plus country | Better shareability and press value, but country + narrow gap bucket + timestamp in a Worker log starts to fingerprint | |
| Finer buckets for a better card | Stronger emotional payload — the distribution bet — but each narrowing is a step toward reconstructable params | |

**User's choice:** Wide buckets, no country or job signal

### Q4 — How literally is the EngineReport type frozen?

| Option | Description | Selected |
|--------|-------------|----------|
| Frozen with a recorded amendment path | Marked as recommended. A contract Phase 6 must satisfy, amendable with a written reason applied to the convention doc and the vectors together | ✓ |
| Hard freeze — Phase 6 conforms | Maximum protection for Module D and the adapters, but a genuine modelling mistake gets worked around rather than fixed | |
| Treat it as a draft until Phase 6 | Most honest about present knowledge, but a draft type unblocks nothing, which defeats the reason it sits in Phase 1 | |

**User's choice:** Frozen with a recorded amendment path

---

## Claude's Discretion

None — the user made an explicit choice on every question, and the "You decide" option offered on the EUR-Lex retrieval question was not taken.

One conditional carried into CONTEXT.md: if the Cellar API proves unreachable from CI, the retrieval method (D-01) returns to the user rather than being substituted by an agent.

## Deferred Ideas

- Monorepo/package layout and the brand name — still an unmade Phase 0 decision; needed before the repo goes public
- Legal-error reporting channel, public correction log, rollback procedure (`REPORTING-LEGAL-ERRORS.md`, `CHANGELOG-legal.md`)
- Art. 12(3) routing survey depth for the 22 pending states
- Committed source snapshots for citation permalinks — excluded by the live-fetch decision; revisit if build availability becomes a problem

These were offered as a further discussion round and the user chose to proceed to context instead.
