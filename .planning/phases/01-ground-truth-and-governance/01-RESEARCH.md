# Phase 1: Ground Truth and Governance - Research

**Researched:** 2026-09-11
**Domain:** Legal-data provenance engineering — primary-source retrieval, schema-enforced provenance, CI verification gates, and frozen data contracts
**Confidence:** HIGH on retrieval, verifier design and transposition status (all fetched live this session); MEDIUM on national statute selection; LOW/UNKNOWN on Art. 12(3) national options

> **Provenance legend used throughout.** `[VERIFIED: …]` = fetched or executed in this session, with the observed output quoted. `[CITED: …]` = taken from an official document or an in-repo source-of-truth file read this session. `[ASSUMED]` = training knowledge or inference, not proven here. This phase's entire success criterion is that no fact rests on an unverified source, so **the tags are the deliverable, not decoration.**

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Directive primary text is retrieved through the EUR-Lex **Cellar REST / SPARQL machine API**, not by scraping the EUR-Lex HTML site and not by a manual human pull. Rationale: the HTML site was observed returning empty 200 responses to every researcher; Cellar serves stable URIs in machine-readable formats and is designed for programmatic access. — **Reversibility:** costly — the retrieval layer, its error taxonomy and the CI verifier's assertions are all built against this API's response shapes; swapping to another acquisition method means rewriting the verifier and re-deriving every stored quotation.
  - **Unproven.** Cellar has not been exercised from this environment. The researcher must confirm it responds, and from CI, before anything depends on it. If Cellar also fails, this decision must come back to the user rather than being silently replaced.

- **D-02:** Text is **fetched live at build time**; no committed snapshot artefact is kept. — **Reversibility:** costly — adding a committed snapshot later means introducing a hashing and drift-review process and re-anchoring every citation to it.
  - **Recorded concern (user decision, proceeding as instructed):** this makes the site unbuildable while Cellar is down, leaves no frozen artefact for a journalist to cite or for a drift job to diff against, and makes "did the text change under us?" unanswerable. Research Pitfall 2 §3 recommends a committed `source_snapshot_sha256` plus a text extract for exactly these reasons, and Pitfall 2 §7 recommends immutable dated snapshots because `country-data` will be cited. **The planner should treat build-availability under a Cellar outage as an explicit risk to mitigate** (e.g. CI caching of the last successful response), without reopening the decision.

- **D-03:** Retrieve and quote the authentic text in **English plus every served locale** — so a Polish letter quotes the authentic Polish wording of Art. 7 rather than a translation of the English. All 24 EUR-Lex language versions are equally authentic in law. — **Reversibility:** reversible — additional language versions are additional queries against the same CELEX id.

- **D-04:** Store **each cited article in full, with the operative sentence(s) tagged by id**. The letter and UI quote the tagged sentence; the full article is present so a quotation can be checked in context. Rationale: quotations without retrievable context are what produced the four inherited citation errors (Art. 6 vs Art. 7 subject matter, the false annual frequency limit, the two-month backstop wording, the German § 12 EntgTranspG threshold misapplied as a Directive rule). — **Reversibility:** costly — the tag ids become the citation keys used by letters and UI across Phases 3 and 5.

- **D-05:** Phase 1 closes with **the launch set deep and the remaining 22 structurally seeded**. All 27 files exist with the full field set and a real transposition status; **PL, SK, IT, LT and MT** have every field verified to source (legal basis, deadline, Art. 12(3) routing, equality body, anti-retaliation). The other 22 carry honest `pending verification` on the deep fields. Rationale: this is exactly the set that can get a letter at v1. — **Reversibility:** reversible — verification is additive per field.

- **D-06:** **An agent proposes, a human confirms.** An agent may find the official source and draft the `Fact<T>`, but a launch country's legally-operative fields (legal basis, deadline, Art. 12(3) routing) only flip to verified once a human has eyeballed the source. `verified_by` records which. Rationale: domain allowlist plus anchor assertion cannot distinguish the right domain citing the wrong article, and a hallucinated statute in a sent letter has no recovery path. — **Reversibility:** reversible — the gate can be relaxed per field later.

- **D-07:** A worker in a **pending country gets a Directive-only citation fallback, explicitly labelled**. Unverified national basis means the letter cites the Directive article itself and the country page says plainly that national transposition is pending or unconfirmed. The schema carries an **explicit "national citation suppressed, Directive fallback in use" state** rather than silently omitting a field. — **Reversibility:** one-way — this is a schema state that Phases 3 and 5 both branch on; removing it later means migrating every country record and both the country-page and letter-generation paths.
  - This also resolves a **documented ambiguity**: PROJECT.md's key decision says the English letter is available for "any EU state with that state's correct national citation" while its rationale names only SK/IT/LT/MT. The fallback state is what makes both readings true.

- **D-08:** The **Polish UPL question is recorded in Phase 1 as a tracked blocking gate on Phase 5**, not resolved here. Phase 1 writes down precisely what needs a Polish-qualified answer, what the current LOW-confidence position is, and what ships only once it is cleared. Rationale: it is an external, paid, calendar-bound dependency, and the copy it constrains does not exist until Phase 5. — **Reversibility:** reversible.

- **D-09:** The verifier **distinguishes a data defect from a transport failure**. Empty-200, a missing expected anchor string, or a 404 is a **hard fail** — that is a data defect. A transport failure (DNS, timeout, 5xx) retries with backoff and, if it still fails, blocks the merge under a distinct **"source unreachable, not disproven"** status with a one-click maintainer override that is recorded in the audit log. Rationale: a gate that goes red on someone else's outage gets disabled within a month, which is worse than no gate. — **Reversibility:** reversible.

- **D-10:** **Staleness degrades the UI; the build fails only for launch countries.** A stale volatile field makes the country page read "last confirmed on {date} — status may have changed" and **suppresses the stale value from any share card or letter citation**. The build hard-fails only when a *launch-country* legally-operative field is stale. — **Reversibility:** costly — the degraded state is rendered by Phase 3 and consumed by Phase 5.
  - **Requirements conflict to fix:** `LEGAL-08` currently reads *"A build fails when any fact's `verified_at` is older than the agreed freshness window"*, which contradicts this. **The planner must reword LEGAL-08 in `.planning/REQUIREMENTS.md` to match**, rather than leaving a requirement the implementation knowingly violates.

- **D-11:** Community contributions are **additive-by-default via `proposed/`**. PRs land in `proposed/` and a maintainer promotes them into the live dataset. A contributor gets a merged PR; merging alone cannot make the site more confident — only maintainer promotion can. Adopt the Public Suffix List posture that slow merges are a feature. — **Reversibility:** costly — the promotion flow shapes the repo layout, CODEOWNERS and every contributor-facing doc.

- **D-12:** The **repo goes public at Phase 1 close, after the deliberately-bad-PR drill**. Each gate must be proven to reject: a fabricated statute number, a non-allowlisted source (e.g. a law-firm blog), a URL that returns an empty 200, and a silent deadline change disguised as a typo fix. — **Reversibility:** one-way — publishing a repository cannot be undone; the history and any mistakes in it are public from that moment.

- **D-13:** A golden vector is proved correct by a **hand-computed worked example, then independently re-derived** from the conventions alone by a pass that has not seen the first answer. A disagreement means the *convention* is ambiguous — which is the bug worth finding in Phase 1 rather than Phase 6. Slowness per vector is intentional: it forces vectors to stay small enough to follow on paper. — **Reversibility:** reversible — but a wrong vector is `one-way` in effect, because every engine test written in Phase 6 will then agree with it.

- **D-14:** Where a calculation convention is **underdetermined by the Directive** (part-time normalisation is the clearest case; Art. 9 does not settle it), the engine **picks a documented default, accepts an explicit override, and records in every `EngineReport` which convention produced the number**. Rationale: an HR user must be able to defend the figure to their own auditor, and a disagreement should be a parameter rather than a bug report. — **Reversibility:** one-way — the "which convention was used" field is part of the frozen `EngineReport` contract that Module D, the adapters and the published npm package all consume; adding it later breaks a published type.

- **D-15:** The **share-URL contract transmits wide buckets only, with no country, sector, seniority or age signal** — a bucketed lifetime total and a rounded gap percentage, previewed to the worker before they press Share. Real inputs stay in the fragment and are never transmitted. Rationale: the OG Worker sees every transmitted parameter in its request, and the params must survive an adversarial read of that log. Accepts a less specific card (no country name on it) as the price. — **Reversibility:** one-way — share-card URLs are public artefacts that persist in social-media caches and Worker logs; narrowing a bucket later cannot retract what was already transmitted, and widening one breaks existing shared links.

- **D-16:** The `EngineReport` type is **frozen with a recorded amendment path**. It is a contract Phase 6 must satisfy, but an amendment is permitted when written up with a reason and applied to the convention doc and the golden vectors **together**. Rationale: building the engine will surface something a data-only design could not see, and the alternative is silent drift or an ugly workaround. — **Reversibility:** costly.

### Claude's Discretion

None — the user made an explicit choice on every question. D-01 carries a conditional: if Cellar proves unreachable from CI, the retrieval method returns to the user rather than being substituted by an agent.

### Deferred Ideas (OUT OF SCOPE)

- **Monorepo/package layout and the brand name** — PROJECT.md records the brand name and domain as deferred to a Phase 0 decision that has not been made. Phase 1 creates the repo the community first sees, so a placeholder will be needed; the naming decision itself is not in this phase's scope. Raise before the repo goes public (D-12).
- **Legal-error reporting channel and public correction log** — `REPORTING-LEGAL-ERRORS.md`, the SLA, the rollback procedure and `CHANGELOG-legal.md` (research Pitfall 2 §6, Pitfall 9 §10). Set aside in discussion; they belong with the governance work in this phase and the planner should fold them in, but no user decision was taken on their shape.
- **Art. 12(3) routing survey depth for the 22 pending states** — D-05 requires it verified for launch countries only. How far the survey goes for the rest was not decided.
- **Committed source snapshots for citation permalinks** — research Pitfall 2 §7 recommends `data/snapshots/{date}/` so a journalist's citation stays honest after a correction. Excluded by D-02's live-fetch decision; revisit if the build-availability risk materialises.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEGAL-01 | Every legal fact carries a source URL and `verified_at`, or renders as "pending verification" | `Fact<T>` envelope already designed in `.planning/research/ARCHITECTURE.md` §2; §Schema below adds the two schema states D-06 and D-07 require |
| LEGAL-02 | 27 member states with transposition status | **§Transposition Reality** — an authoritative, machine-readable NIM register was found and queried this session; 15 states have notified measures, 12 have not |
| LEGAL-03 | Legal basis — national article where verified, else the Directive article | **§Transposition Reality** gives titles, OJ references and ELI links per state from a primary EU source; §Pitfall 4 explains why picking *which* notified measure is the basis is a human call |
| LEGAL-04 | Two-month backstop wording | **§Directive Ground Truth** — Art. 7(4) quoted verbatim from Cellar primary text, in EN and PL |
| LEGAL-05 | Art. 12(3) routing option per state | **§Directive Ground Truth** — Art. 12(3) quoted verbatim; **§Open Question 1** records that no machine-readable per-state answer exists |
| LEGAL-06 | Equality body + anti-retaliation provision | **§Open Question 2** — Art. 3(1)(l) defines the equality body by reference to Dir. 2006/54/EC Art. 20; no single primary register found |
| LEGAL-07 | Articles 3, 6, 7, 9, 10, 12 re-verified against EUR-Lex primary text | **§Directive Ground Truth** — done in this session; retrieval method, pinned URIs and paragraph-level citation keys all verified |
| LEGAL-08 | Build fails on stale facts | **§Freshness** — mechanism; **note the D-10 rewording the planner must apply** |
| LEGAL-09 | Verifier asserts non-empty body + anchor string | **§The Verifier** — the exact failure reproduced, characterised, and four *additional* failure modes found that the stated rule does not catch |
| LEGAL-10 | Contributor PR gated by CI schema validation and source checking | **§Governance Gates** — allowlist, `proposed/` flow, bad-PR drill |
| ENG-01 | Golden vectors + frozen `EngineReport` as data before code | **§Frozen Contracts** |
| ENG-06 | Every calculation convention documented | **§Frozen Contracts** — the convention taxonomy, grounded in Art. 3(1) definitions quoted verbatim this session |
| GAP-06 | Transmitted URL carries only derived, rounded, non-identifying values | **§Share-URL Contract** |
</phase_requirements>

## Summary

**D-01 is proven correct, and the evidence is stronger than the decision assumed.** The EUR-Lex web front-end is not intermittently broken — it returns `HTTP 202` with a zero-byte body to *every* non-browser request including its own homepage, which is a blanket anti-automation posture, not an outage. The Publications Office **Cellar REST API on `publications.europa.eu` is fully open**, returns the authentic OJ text in ~320 ms, carries `ETag` and `Last-Modified`, honours conditional GET, and — the finding that most changes the plan — serves the text as **ELI-structured XHTML with per-article and per-paragraph ids (`art_7`, `007.004`) that are byte-identical across all language versions.** D-04's "operative sentence tagged by id" does not need an invented tagging scheme; the publisher already supplies one, and it aligns EN↔PL for free.

**The verifier rule as currently written in CLAUDE.md and LEGAL-09 is necessary but not sufficient, and would produce false failures on good documents.** Five distinct failure modes were reproduced this session that a `status 200 + non-empty body + anchor string` check either misses or misfires on: the EUR-Lex response is **202**, not 200, and `res.ok` is `true` for it; the authentic OJ text contains **no ASCII `"Article 7"` anywhere** — it is always `Article\u00A07` with a non-breaking space, so the obvious anchor fails on a perfect document; the phrase `"within a reasonable period of time"` also appears in a **recital about a different article**, so an unscoped anchor can verify the wrong text; a legitimate `304 Not Modified` has a zero-length body and would trip the byte floor; and two of the five launch countries' own registers defeat server-side fetching entirely — `slov-lex.sk` is a 1,354-byte client-rendered SPA shell and `e-tar.lt` sits behind a Cloudflare interstitial returning 403. The verifier needs a **per-source strategy**, not one global fetcher.

**The 27-country seeding is far less speculative than the phase brief assumes, and differently shaped.** The Cellar RDF carries the Commission's National Implementing Measures register for this Directive, queryable by SPARQL: **15 member states have notified transposing measures and 12 have notified nothing** (HR, CY, DK, FI, FR, DE, HU, IE, LV, LU, NL, PT). Malta and Italy each notified exactly one clean instrument — Malta's with a working national ELI link. But Slovakia notified 33 measures including its 2001 State Statistics Act, and Poland notified 10 of which eight are `Obwieszczenie` consolidated-text republications. So the register is an **authoritative discovery index with primary provenance, not a curated answer** — which is precisely the shape D-06's "agent proposes, human confirms" was designed for, and it should be the seeding pipeline's backbone.

**Primary recommendation:** Build the retrieval layer on Cellar content negotiation against `http://publications.europa.eu/resource/celex/32023L0970` with `Accept: application/xhtml+xml` + `Accept-Language: <iso639-3>`, record the resolved per-language pinned expression URI and `ETag` as the citable source, extract citations by the publisher's own `art_N` / `NNN.NNN` ids rather than by string matching, and make the verifier a **per-source strategy table** (`html-anchor` | `jsonld` | `metadata-only` | `manual-attest`) rather than one fetch-and-grep. Seed all 27 country files from a SPARQL pass over the NIM register, which lands every state at an honest, sourced status on day one.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Directive text retrieval + article extraction | Build-time Node script (`packages/country-data/scripts/`) | — | Runs in CI and locally; never at request time (D-02 live-fetch is at *build*, not in the browser) |
| `Fact<T>` schema + cross-field invariants | `packages/country-data/src/schema.ts` (devDependency Zod) | Emitted `country.schema.json` for editor tooling | Package *ships* JSON + `.d.ts`; consumers pay no runtime cost `[CITED: .planning/research/ARCHITECTURE.md:423]` |
| Source verification (fetch, anchor, allowlist) | CI job (GitHub Actions) | Nightly scheduled run | PR-time for changed files only; nightly for the full set — the split that makes the gate survive (Pitfall 9, D-09) |
| Freshness computation | **Render time** (Phase 3 UI) for degradation; **CI** for the launch-country hard gate | — | D-10: staleness degrades the UI, build fails only for launch countries |
| Golden vectors + `EngineReport` type | `packages/directive-engine/` as **data and types only** | — | ENG-01: no engine code in Phase 1; the type is the contract Phase 6 must satisfy |
| Share-URL parameter contract | A versioned spec document + a TS type in a shared location | Consumed by Phase 2 design and the OG Worker | D-15: the contract must exist before the card family is designed |
| Governance (CODEOWNERS, PR template, `proposed/`) | Repo root + `.github/` | — | Must be in place *before* D-12 makes the repo public |

## Directive Ground Truth

### Retrieval — verified working, end to end

| Property | Observation | Tag |
|---|---|---|
| Canonical request | `GET http://publications.europa.eu/resource/celex/32023L0970` with `Accept: application/xhtml+xml`, `Accept-Language: eng` | `[VERIFIED: curl, this session]` |
| Response | `303 See Other` → `200`, `193564` bytes, `application/xhtml+xml;charset=UTF-8` | `[VERIFIED: curl -w "code=%{http_code} size=%{size_download}"]` |
| Latency | `0.320s / 0.319s / 0.338s` across three consecutive calls | `[VERIFIED: curl -w time_total ×3]` |
| Pinned expression URI (EN) | `http://publications.europa.eu/resource/cellar/5bbb9daf-f470-11ed-a05c-01aa75ed71a1.0006.03/DOC_1` | `[VERIFIED: Location header of the 303]` |
| `ETag` | `"Con-20231213063525000"` | `[VERIFIED: response headers]` |
| `Last-Modified` | `Wed, 13 Dec 2023 05:35:25 GMT` | `[VERIFIED: response headers]` |
| Conditional GET | `If-None-Match: "Con-20231213063525000"` → `304`, 0 bytes | `[VERIFIED: curl]` |
| Encoding | strict UTF-8; `determine workers\xe2\x80\x99 pay` (U+2019) | `[VERIFIED: python bytes inspection]` |
| Generator provenance | `<!-- CONVEX # converter_version:9.15.0 # generated_on:20231208-1052 # ELI version:0.10 -->` | `[VERIFIED: first 300 bytes of the response]` |

**All ten locales on the roadmap retrieved successfully** with `Accept-Language` as ISO-639-3: `pol 200/210436`, `slk 200/203344`, `ita 200/207979`, `lit 200/202767`, `mlt 200/206190`, `deu 200/209738`, `nld 200/203278`, `ces 200/203809`, `swe 200/198410`, `dan 200/198351`. `[VERIFIED: curl loop, this session]`

**Per-language pinned URIs differ only in a sequence segment** — `.0006.` = EN, `.0018.` = PL, `.0013.` = IT — and are directly fetchable with no content negotiation: a bare `GET` of the `.0013.` URI returned `200 / 207979` with `<p class="oj-sti-art">Oggetto`. `[VERIFIED: curl]`
**That segment is a manifestation sequence index, not a language code — it must be *discovered* once per language via content negotiation and then recorded, never computed.** `[VERIFIED: the three observed values are non-alphabetical relative to their language codes]`

### Error taxonomy — every branch D-09 needs, confirmed distinguishable

| Condition | Observed response | Tag |
|---|---|---|
| Valid CELEX + valid language | `200`, full body | `[VERIFIED]` |
| Unknown CELEX (`32023L9999`) | `404`, body `Resource [system 'celex' - id '32023L9999'] not found.` | `[VERIFIED: curl]` |
| Invalid `Accept-Language: zzz` | `400`, 205 bytes — **no silent fallback to a default language** | `[VERIFIED: curl]` |
| Missing/invalid `Accept` | `400`, 197 bytes | `[VERIFIED: curl]` |
| Unchanged content | `304`, 0 bytes | `[VERIFIED: curl]` |

**`Content-Language` on the 200 response is empty.** `[VERIFIED: response headers]` The server does not tell you which language it gave you. The verifier **must** confirm the language from the body (see §The Verifier).

### Structural citation keys — the finding that most changes the plan

The Cellar XHTML is ELI-structured. Article 7 is delivered as:

```html
<div class="eli-subdivision" id="art_7">
   <p id="d1e1109-21-1" class="oj-ti-art">Article&#160;7</p>
   <div class="eli-title" id="art_7.tit_1">
      <p class="oj-sti-art">Right to information</p>
   </div>
   <div id="007.001">
      <p class="oj-normal">1.&#160;&#160;&#160;Workers shall have the right to request and receive in writing, …</p>
   </div>
   …
```
`[VERIFIED: raw XHTML slice around id="art_7", this session]`

- 333 `id` attributes in the document; `art_1` … `art_20`+, each with `art_N.tit_1`. `[VERIFIED: regex count]`
- Paragraph ids in `art_7`: `007.001, 007.002, 007.003, 007.004, 007.005, 007.006`. `[VERIFIED]`
- **The Polish document carries the identical ids**: `art_7` → `007.001 … 007.006`, and `art_1, art_2, 002.001, 002.002, 002.003, art_3, 003.001, …`. `[VERIFIED: same extraction run against the `pol` response]`

**Consequence for D-04:** the citation key is `32023L0970#007.004`. It is the publisher's own id, it is language-invariant, and a letter rendering in Polish resolves the same key against the Polish expression. Do **not** invent a tagging scheme, and do **not** locate articles by searching for `"Article 7"`.

### The four inherited errors — all four confirmed corrected against primary text

| Inherited claim | Authentic text, quoted verbatim from Cellar | Tag |
|---|---|---|
| Art. 7 exercisable "once a year" | **The string `once a year` does not occur in the document.** Art. 7(3): *"Employers shall inform all workers, on an annual basis, of their right to receive the information referred to in paragraph 1 and of the steps that the worker is to undertake to exercise that right."* — an **employer** duty, not a cap on worker requests. | `[VERIFIED: negative string search returned -1; Art. 7(3) extracted from div id="007.003"]` |
| Art. 7 covers pay-setting criteria | Art. 6, *"Transparency of pay setting and pay progression policy"*, 6(1): *"Employers shall make easily accessible to their workers the criteria that are used to determine workers' pay, pay levels and pay progression. Those criteria shall be objective and gender neutral."* Art. 7 is *"Right to information"*, 7(1): *"…information on their individual pay level and the average pay levels, broken down by sex, for categories of workers performing the same work as them or work of equal value to theirs."* | `[VERIFIED: extracted from id="art_6" / id="art_7"]` |
| Deadline is "2 months" | Art. 7(4), verbatim: *"Employers shall provide the information referred to in paragraph 1 within a reasonable period of time but in any event within two months from the date on which the request is made."* — note the raw bytes are `4.\xa0\xa0\xa0Employers … the request is\xa0made.` | `[VERIFIED: repr() of the raw slice from div id="007.004"]` |
| Six-person small-group threshold | **No such threshold appears in the Directive.** Art. 12(3) is the only EU-level identifiability provision and it is an optional Member State measure (quoted below). | `[VERIFIED: Art. 12 extracted in full; no numeric threshold present]` |

**Polish authentic Art. 7(4)**, for the PL letter (D-03): *"4. Pracodawcy udostępniają informacje, o których mowa w ust. 1, w rozsądnym terminie, a w każdym razie w ciągu dwóch miesięcy od dnia zwrócenia się o te informacje."* `[VERIFIED: div id="007.004" of the Polish expression]`

### Art. 12(3) — verbatim, and a scope correction the roadmap needs

> *"3.   Member States may decide that, where the disclosure of information pursuant to Articles 7, 9 and 10 would lead to the disclosure, either directly or indirectly, of the pay of an identifiable worker, only the workers' representatives, the labour inspectorate or the equality body shall have access to that information. The workers' representatives or the equality body shall advise workers regarding a possible claim under this Directive without disclosing actual pay levels of individual workers performing the same work or work of equal value. For the purposes of monitoring pursuant to Article 29, the information shall be made available without restriction."*

`[VERIFIED: extracted in full from div id="art_12", this session]`

**The roadmap's open question is phrased more broadly than the Article.** It reads *"routing requests only via workers' representatives, the labour inspectorate or the equality body"* as if it were a blanket routing rule. The Article makes the restriction **conditional on the disclosure identifying an individual worker**. A state that took the option has not diverted all Art. 7 requests; it has restricted *who may see the information* in the identifiability case. **LEGAL-05 and LTR-16 should be reworded to match**, and the `country-data` field should model a condition, not a boolean route. `[VERIFIED against the quoted text]`

Also note Art. 12(3) routes to **workers' representatives, the labour inspectorate, or the equality body** — three bodies. Art. 7(2) separately gives the worker a *standing* right to request *through* their representatives or an equality body in any state. These are different mechanisms and must not be collapsed. `[VERIFIED: Art. 7(2) and Art. 12(3) both extracted]`

### Art. 3(1) definitions and Art. 9(1) metrics — the ENG-06 substrate

Verbatim from `id="art_3"` `[VERIFIED]`:

- (c) *"'gender pay gap' means the difference in average pay levels between female and male workers of an employer expressed as a percentage of the average pay level of male workers"*
- (d) *"'median pay level' means the pay level at which half of the workers of an employer earn more and half of them earn less"*
- (e) *"'median gender pay gap' means the difference between the median pay level of female and median pay level of male workers of an employer expressed as a percentage of the median pay level of male workers"*
- (f) *"'quartile pay band' means each of four equal groups of workers into which they are divided according to their pay levels, from the lowest to the highest"*
- (h) *"'category of workers' means workers performing the same work or work of equal value grouped in a non-arbitrary manner based on the non-discriminatory and objective gender-neutral criteria referred to in Article 4(4), by the workers' employer and, where applicable, in cooperation with the workers' representatives"*
- (k) *"'labour inspectorate' means the body or bodies responsible … for control and inspection functions in the labour market"*
- (l) *"'equality body' means the body or bodies designated pursuant to Article 20 of Directive 2006/54/EC"*

Art. 9(1)(a)–(g) and Art. 9(2)–(6) were extracted in full and match `.planning/research/PITFALLS.md` §Pitfall 6 exactly, including 9(6): *"The accuracy of the information shall be confirmed by the employer's management, after consulting workers' representatives. Workers' representatives shall have access to the methodologies applied by the employer."* `[VERIFIED]` **Pitfall 6's Art. 9 block needs no correction** — it may be treated as primary.

### Transposition deadline

`j.0:date_transposition` = **`2026-06-07`** and `j.0:directive_date_transposition` = **`2026-06-07`**, machine-readable from the Directive's own Cellar RDF. `[VERIFIED: regex extraction from the 3,484,824-byte RDF object]`

## Transposition Reality — the 27-country seeding

### The register exists, is authoritative, and is queryable

The Commission's **National Implementing Measures (NIM)** register is exposed in Cellar. A single SPARQL query returns notified measures per member state for this Directive.

**Working query** `[VERIFIED: returned 200 in 0.16s]`:

```sparql
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT ?ctry (COUNT(DISTINCT ?nim) AS ?n) WHERE {
  ?w   cdm:resource_legal_id_celex "32023L0970"^^<http://www.w3.org/2001/XMLSchema#string> .
  ?nim cdm:measure_national_implementing_implements_resource_legal ?w .
  ?nim cdm:work_created_by_agent ?ctry .
} GROUP BY ?ctry ORDER BY ?ctry
```

Endpoint: `http://publications.europa.eu/webapi/rdf/sparql`, with `format=application/sparql-results+json`.

### Result, as at 2026-09-11

| Notified measures | Member states |
|---|---|
| **15 states with ≥1 notified measure** | `AUT 17 · BEL 6 · BGR 12 · CZE 31 · ESP 10 · EST 18 · GRC 5 · ITA 1 · LTU 25 · MLT 1 · POL 10 · ROU 27 · SVK 21 · SVN 16 · SWE 33` |
| **12 states with none** | **HR, CY, DK, FI, FR, DE, HU, IE, LV, LU, NL, PT** |

`[VERIFIED: SPARQL result, this session; counts are of distinct `nim` resources]`

**All five launch countries (PL, SK, IT, LT, MT) have notified measures.** That is the single most important de-risking fact for D-05.

### Launch-country legal-basis candidates, from primary EU metadata

| State | `work_title` | Official journal | Notified | National link | Tag |
|---|---|---|---|---|---|
| **MT** | *Equal Pay (Transparency and Reporting) Regulations, 2026* | The Malta government gazette no. **21,661** of 2026-06-05 | 2026-06-11 | `https://legislation.mt/eli/ln/2026/173/eng` | `[VERIFIED: SPARQL, all fields of nim/202603933]` |
| **IT** | *DECRETO LEGISLATIVO 7 maggio 2026, n. 96.* | *Gazzetta Ufficiale della Repubblica Italiana* no. **125** del 1 giugno 2026 | 2026-06-04 | none supplied | `[VERIFIED: SPARQL]` |
| **PL** | *Ustawa z dnia 4 czerwca 2025 r. o zmianie ustawy – Kodeks pracy* | *Dziennik Ustaw*, 2025-06-23 | 2026-06-03 | none supplied | `[VERIFIED: SPARQL]` |
| **PL** | *Ustawa z dnia 11 marca 2026 r. o zmianie ustawy o Państwowej Inspekcji Pracy oraz niektórych innych ustaw* | *Dziennik Ustaw*, 2026-04-07 | 2026-06-03 | none supplied | `[VERIFIED: SPARQL]` |
| **LT** | *Lietuvos Respublikos darbo kodekso 23, 26, 39, 40, 41, 42, 48, 51, 52, 65, 71, 79, 140, 147, 148, 196, 217, 219, 226 straipsnių … įstatymas*, entry into force **2026-06-07** | — | — | `https://www.e-tar.lt/portal/lt/legalAct/2ab448a0584211f180c9c618618421ed` | `[VERIFIED: SPARQL]` |
| **SK** | 21 measures, **none of which is obviously the Art. 7 vehicle** — the list is dominated by consolidated versions of pre-existing acts | — | — | — | `[VERIFIED: SPARQL; see the caution below]` |

Malta's full record also carries `resource_legal_date_entry-into-force = 2026-06-05`, `measure_national_implementing_type_act = Regulation`, `resource_legal_id_celex = 72023L0970MLT_202603933`, `measure_national_implementing_reference_commission = MNE(2026)03933`. `[VERIFIED: full property dump of the Malta NIM]`

### The caution that must reach the planner

**The NIM register is a notification dump, not a curated answer.** Observed `[VERIFIED: SPARQL title listings]`:

- **SK** notified *Zákon č. 540/2001 Z. z. o štátnej štatistike* (the 2001 State Statistics Act) and *Zákon č. 73/1998 Z. z.* (police service) among its 21.
- **LT** notified the 1999 *Moterų ir vyrų lygių galimybių įstatymas* (in force 1999-03-01) and a 2009 ministerial order alongside the 2026 Labour Code amendment.
- **PL**'s 10 include eight `Obwieszczenie` — Marshal of the Sejm announcements republishing consolidated texts — which are **not transposing amendments**.

So: the register **names the haystack with impeccable provenance**; choosing the needle is legal judgment. This maps exactly onto D-06. **The seeding pipeline should be: SPARQL pull → auto-populate `status: pending_verification` with the NIM set attached as `discovery_hints` → human promotes one measure to `legal_basis` with `verified_by`.** A contributor or agent must never be able to promote.

**Deduplicate on `work_title` + `resource_legal_id_celex`, not on `nim` id** — the raw result contained 1,832 rows for 226 distinct measures because of the OPTIONAL cross-product. `[VERIFIED: node dedup pass]`

### Data-quality traps in the register

- **`1001-01-01` is Cellar's null-date sentinel.** It appeared as a `transposition_deadline_transmitted` value and as the Italian `measure_national_implementing_date_official_journal`. The ingest must map it to `null`, never store it. `[VERIFIED: observed in two separate result sets]`
- **`build_info` returns the literal `$BUILD_INFO$`** — an unsubstituted template placeholder in the Publications Office's own data. Treat any `$…$` literal as null. `[VERIFIED: Malta property dump]`
- **`measure_national_implementing_national_website_link` is absent for IT and PL** but present for MT and LT. National source URLs must be allowed to be null with a named domain to check later, per the phase brief's own instruction.

## The Verifier

### The exact failure, reproduced and characterised

CLAUDE.md warns of "empty 200 responses". The reality is worse and more specific:

```
$ node -e 'const r=await fetch("https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0970");
           const b=await r.text(); console.log(r.status, r.ok, b.length)'
status: 202 | res.ok: true | body length: 0 | content-type: text/html; charset=UTF-8
```
`[VERIFIED: node fetch, this session]`

- It is **202 Accepted**, not 200. `res.ok` is `true` for 202, so `if (!res.ok) throw` passes it. A check written as `status === 200` would *correctly* reject it — but only by accident.
- It is **not specific to the document**: `https://eur-lex.europa.eu/homepage.html` also returned `202 / 0 bytes`, as did the ELI form `/eli/dir/2023/970/oj` and the PDF form. `[VERIFIED: curl, four URL shapes]`
- It **does not resolve on retry or with a session**: three consecutive attempts with a cookie jar (3 cookies set) and a Chrome UA all returned `202 / 0`. `[VERIFIED]`
- Therefore this is a **blanket anti-automation posture on the `eur-lex.europa.eu` web front-end**, not an outage. Retry-with-backoff (D-09's transport-failure branch) will never succeed against it, and classifying it as "source unreachable" would be wrong: it is permanently unreachable by this method. **`eur-lex.europa.eu` must be excluded from the fetchable-source allowlist entirely**, with `publications.europa.eu` substituted. `[VERIFIED — this is an inference from four verified observations, but the observations are direct]`

### Four more failure modes the stated rule does not handle

| # | Failure | Evidence | Consequence |
|---|---|---|---|
| 1 | **NBSP in the anchor.** `"Article 7"` with an ASCII space occurs **0 times** in the authentic document; `"Article\u00A07"` occurs once. Same for Article 12: ASCII form 0 occurrences, NBSP form 1. | `[VERIFIED: python count of both forms]` | A verifier anchored on the obvious string **fails on a perfect document**. This is the exact "gate goes red for no reason, gets disabled" failure D-09 exists to prevent. **Normalise `\u00A0 → ' '` and collapse whitespace before asserting; store the raw text unnormalised.** |
| 2 | **Anchor matches the wrong place.** `"within a reasonable period of time"` matched at offset 29,475 — inside a **recital about joint pay assessments** (*"Joint pay assessments should lead, within a reasonable period of time, to the elimination of gender-based pay discrimination…"*) — long before the Art. 7(4) occurrence. Likewise `"Article 10"` matched a recital reference to **Article 10 TFEU**. | `[VERIFIED: offset search + raw slice]` | An unscoped anchor can verify text that is not the cited provision. **Scope every assertion to the `art_N` subtree first, then assert inside it.** |
| 3 | **A legitimate `304` has a zero-length body.** | `[VERIFIED: If-None-Match → 304, 0 bytes]` | A byte floor applied before status dispatch turns a successful cache revalidation into a hard data-defect failure. **Handle 304 before the body checks.** |
| 4 | **Two launch-country registers cannot be verified by fetch at all.** `slov-lex.sk` returns **1,354 bytes** — a client-rendered SPA shell whose first tag is a Google Tag Manager script; the statute text is never in the HTTP response. `e-tar.lt` returns **403** with `<title>Just a moment...</title>` — a Cloudflare interstitial. | `[VERIFIED: curl + body inspection of both]` | A single global fetcher cannot verify SK or LT sources. |

### Two more, from the launch-country sources

- **`legislation.mt` returns 200 with schema.org JSON-LD** (`"@type": "Legislation"`, `"legislationDate": "2026-06-05"`, `"legislationIdentifier": "eli/ln/2026/173"`) and the title *Equal Pay (Transparency and Reporting) Regulations*. But the substantive wording is **not** on the landing page: `"two months"`, `"equality body"` and `"National Commission"` all returned `False`. `[VERIFIED: anchor probe]` **An anchor asserting the operative wording would fail; an anchor asserting the title and ELI identifier succeeds.** The anchor must be chosen per source and must assert what that source actually serves.
- **`isap.sejm.gov.pl` returns `302` with a zero-length body** at the root. `dziennikustaw.gov.pl` returned `200 / 48,745`. `bip.brpo.gov.pl` returned `200 / 470,758`. `gazzettaufficiale.it` `200 / 43,368`, `normattiva.it` `200 / 46,848`, `snslp.sk` `200 / 59,842`, `lygybe.lt` `200 / 163,904`, `ncpe.gov.mt` `200 / 556,336`. `[VERIFIED: curl probe of eleven national domains]`

### Recommended verifier design

**A per-source strategy table, not one fetcher.** Each `Source` carries a `verification` discriminant:

| Strategy | When | What it asserts |
|---|---|---|
| `cellar` | `publications.europa.eu` | 200/304; `art_N` subtree present; normalised anchor inside that subtree; `ETag` recorded |
| `html-anchor` | Server-rendered registers (`dziennikustaw.gov.pl`, `normattiva.it`, `gazzettaufficiale.it`) | 200; body ≥ byte floor; normalised anchor present |
| `jsonld` | `legislation.mt` | 200; `application/ld+json` block parses; `legislationIdentifier` equals the stored ELI |
| `metadata-only` | Sources whose text lives in a linked PDF | 200; title anchor only; explicitly records that operative wording was **not** machine-verified |
| `manual-attest` | `slov-lex.sk` (SPA), `e-tar.lt` (WAF) | **No fetch.** Requires `verified_by` + a dated human attestation; CI asserts the attestation exists and is within its freshness window, nothing more |

`manual-attest` is the honest answer to sources that defeat automation. It is strictly better than a green check produced by a fetch that never saw the statute — which is precisely the "verifier that passes on an empty 200" the project constraint forbids.

**The assertion order that avoids every observed false failure:**

1. Transport error (DNS/timeout/connection reset) → **retry ×3 with backoff** → `source_unreachable` (D-09 soft block, override-able).
2. `304` → **pass**, record revalidation, skip body checks.
3. `4xx`/`5xx` → `4xx` is a data defect (hard fail); `5xx` is transport (soft block).
4. **`status !== 200` after the above → hard fail.** Explicitly reject `202` with the message *"202 with empty body — this source is behind an anti-automation gate; it cannot be verified by fetch. Use `manual-attest` or an alternative source."*
5. `content-length === 0` or body below the per-strategy byte floor → hard fail.
6. Normalise: `\u00A0`, `\u202F`, `\u2009` → space; collapse runs of whitespace; normalise `‘’“”` to ASCII quotes **for matching only**.
7. Scope to the structural subtree where the strategy defines one.
8. Assert the anchor inside the scope. Absent → hard fail with the surrounding 200 characters printed, so the reviewer can see what was there instead.
9. For `cellar`: assert the language by checking a language-specific subtitle (e.g. `art_7.tit_1` text equals the expected per-locale string), because `Content-Language` is empty.

**Cellar outage mitigation for D-02** (the recorded concern, without reopening the decision): the verifier stores `ETag` + `Last-Modified` per source and uses GitHub Actions `actions/cache` keyed on the ETag. A build during a Cellar outage restores the cached body and emits a **warning**, not a failure; a build that finds a *changed* ETag emits a **review task**, never an auto-update. This gives drift detection and outage tolerance while keeping the fetch live.

## Schema and Provenance

The `Fact<T>` envelope in `.planning/research/ARCHITECTURE.md` §2 is sound and should be adopted essentially as written `[CITED: .planning/research/ARCHITECTURE.md:203-262]`. Four amendments are required by decisions taken after it was written:

| # | Amendment | Driven by |
|---|---|---|
| A | Add `verified_by: string \| null` to `Fact`, and a `superRefine` rule: for a **launch country**, a legally-operative field (`legal_basis`, `deadline`, `art_12_3`) with `status: 'verified'` **must** have a non-null `verified_by`. | D-06 |
| B | Add a fifth `FactStatus` member — `'directive_fallback'` — meaning *"national citation deliberately suppressed; the Directive article is cited instead"*. This is **not** the same as `pending_verification` (we don't know) or `directive_default` (we checked and national law adds nothing). Three distinct claims, three states. | D-07 |
| C | Add `verification: 'cellar' \| 'html-anchor' \| 'jsonld' \| 'metadata-only' \| 'manual-attest'` and `anchor: string` to `Source`. A `Source` with no `anchor` cannot back a `verified` fact. | §The Verifier |
| D | Add `volatility: 'stable' \| 'volatile' \| 'pending' \| 'statistical'` per fact, and `etag` / `last_modified` per `Source`. | Pitfall 2, D-10 |

**Do not** add `source_snapshot_sha256` / `source_snapshot_path` — that is deferred by D-02.

### Validator stack

| Choice | Verdict | Evidence |
|---|---|---|
| **Zod, as devDependency, source of truth** | ✅ Adopt | ARCHITECTURE.md's reasoning holds: Astro content collections consume Zod natively, `z.infer` gives types with no codegen, and `superRefine` expresses the cross-field invariants (amendments A–C above) that raw JSON Schema handles only awkwardly `[CITED: .planning/research/ARCHITECTURE.md:423]` |
| **Emit `country.schema.json`, commit it** | ✅ Adopt | Gives lawyer-contributors inline validation in VS Code via `$schema` with **no toolchain install** — decisive for D-11's community flow |
| **Ajv for runtime JSON Schema validation** | ❌ Not needed | 27 small files; Zod parse is ample. Ajv is `8.20.0`, MIT, 201M weekly downloads, verdict `OK` `[VERIFIED: npm view + gsd package-legitimacy]` — keep it as a documented fallback only |
| **TypeBox** | ❌ Reject | Second schema language alongside Astro's Zod collections `[CITED: .planning/research/ARCHITECTURE.md:425]` |

**Zod version caution.** `zod@4.6.2` was published **2026-09-10**, one day before this research. The legitimacy seam returns verdict **`SUS`** with reason `too-new` `[VERIFIED: gsd query package-legitimacy check]`. `4.6.0` and `4.6.1` landed 2026-09-09. The last release with meaningful soak time is **`4.5.4`**; `4.5.0` is 2026-08-28 and `4.4.0` is 2026-04-29 `[VERIFIED: npm view zod time]`. Zod is MIT with **zero dependencies** `[VERIFIED: npm view zod dependencies license — empty deps]`. **Recommend pinning `zod@4.5.4`** and revisiting 4.6.x once it has soaked, rather than adopting a one-day-old release into the project's provenance-critical path.

### Freshness windows

Volatility classes and TTLs per Pitfall 2 §2 `[CITED: .planning/research/PITFALLS.md:75-82]`:

| Class | Fields | TTL | On expiry |
|---|---|---|---|
| `stable` | equality-body name/URL, Directive article ids, Directive quotations | 365 d | warn |
| `volatile` | transposition status, national legal basis, deadline, Art. 12(3) | 90 d | UI degrades (D-10); **hard-fail the build only for launch countries** |
| `pending` | anything whose source says "draft"/"in parliament" | 30 d | UI shows "draft — check before relying" |
| `statistical` | Eurostat GPG (Phase 4, not this phase) | until `next_expected_release` | block the share card |

**Directive quotations are `stable`, and the `Last-Modified: 13 Dec 2023` on the Cellar expression is the evidence** `[VERIFIED: response header]` — the authentic text has not moved in nearly three years. Conditional GET makes re-verification nearly free, so re-verify nightly regardless of TTL and let the ETag carry the cost.

**LEGAL-08 rewording the planner must apply**, per D-10 — proposed text:

> **LEGAL-08**: A stale fact degrades in the UI to "last confirmed on {date} — status may have changed" and is suppressed from any share card or letter citation; the build hard-fails when a **launch-country** legally-operative fact is past its freshness window.

## Governance Gates

Adopt Pitfall 9's eleven points `[CITED: .planning/research/PITFALLS.md:404-416]`. Three refinements from this session's evidence:

1. **The source-domain allowlist must be per-country and must exclude `eur-lex.europa.eu`.** That domain is unfetchable (202/empty) and a `source_url` pointing at it can never be machine-verified. Allow `publications.europa.eu` instead. Per-country allowlists, seeded from what was probed: PL → `dziennikustaw.gov.pl`, `isap.sejm.gov.pl`, `bip.brpo.gov.pl`; SK → `slov-lex.sk`, `snslp.sk`; IT → `gazzettaufficiale.it`, `normattiva.it`; LT → `e-tar.lt`, `lygybe.lt`; MT → `legislation.mt`, `ncpe.gov.mt`; all → `publications.europa.eu`, `curia.europa.eu`, `ec.europa.eu`. `[VERIFIED: all eleven domains probed; reachability recorded in §The Verifier]`
2. **`proposed/` needs a distinct CI profile.** A PR into `proposed/` runs schema + allowlist + anchor but **cannot** set `status: 'verified'` — enforced by a lint rule, not by review discipline. Promotion into `data/` is a separate maintainer-authored commit that sets `verified_by`. This is what makes D-11's "merging alone cannot make the site more confident" structural.
3. **The bad-PR drill (D-12) needs a fifth case.** The four specified — fabricated statute, non-allowlisted source, empty-200 URL, silent deadline change — do not cover the failure this session actually found most often: **a correct, allowlisted, live source cited for the wrong provision.** Add: *a PR citing `publications.europa.eu` with an anchor that matches text in a recital rather than the cited article.* The subtree-scoping rule (§Verifier failure mode 2) is what catches it, and the drill is how you prove the scoping works.

**Public Suffix List as the posture model** — validation records, evidence, verbose rationale, maintainer review, no guaranteed inclusion timeline, non-conforming patches sit indefinitely `[CITED: .planning/research/PITFALLS.md:416]`.

## Frozen Contracts (data, no code)

### `EngineReport` — what must be in the frozen type

Driven by D-14 ("which convention produced the number" is part of the contract) and Pitfall 6's sixteen traps `[CITED: .planning/research/PITFALLS.md:268-286]`. Minimum shape:

```ts
interface MetricValue {
  value: number | null;
  definitionCite: string;        // 'Art. 3(1)(c)' — resolves to a stored quotation id, e.g. '003.001'
  populationN: number;
  excludedN: number;
  suppressed: boolean;           // privacy suppression (Art. 12(3) / national threshold)
  unreliable: boolean;           // statistical reliability — SEPARATE flag, per EMP-07
}

interface Conventions {          // every field REQUIRED — no defaults (ENG-04)
  denominator: 'male_mean' | 'male_median';      // fixed by Art. 3(1)(c)/(e)
  medianRule: 'interpolated' | 'lower_of_two';   // Directive silent
  quartileTieRule: 'ukgov_proportional' | 'stable_sort';
  quartileRemainder: 'to_lower' | 'to_upper';
  payBasis: 'hourly' | 'fte_annualised' | 'as_paid';
  partialPeriodPolicy: 'include' | 'exclude_reduced_pay';
  joinerLeaverPolicy: 'employed_at_period_end' | 'any_pay_in_period';
  sexMapping: Record<string, 'F' | 'M' | 'other' | 'undisclosed'>;
  componentMap: Record<string, 'basic' | 'complementary_variable' | 'excluded'>;
  minGroupSize: number | null;   // null by default — NO EU threshold exists
  referencePeriod: { from: string; to: string };  // must be a calendar year
}

interface EngineReport {
  engineVersion: string;
  directiveTextVersion: string;  // the Cellar ETag the citations were verified against
  conventions: Conventions;      // D-14: always echoed back
  conventionSource: Record<keyof Conventions, 'directive' | 'caller' | 'adapter_default'>;  // D-14
  metrics: { a: MetricValue; b: MetricValue; c: MetricValue; d: MetricValue;
             e: MetricValue; f: MetricValue; g: Record<string, MetricValue> };
  art10Flags: Array<{ category: string; gapPct: number; threshold: 5 }>;
  publishable: { selfPublishable: ('a'|'b'|'c'|'d'|'e'|'f')[]; authorityOnly: 'g'[] };  // Art. 9(7)
  draft: true;                   // Art. 9(6) — always a draft requiring management confirmation
  warnings: Array<{ code: string; detail: string }>;
}
```

`definitionCite` resolving to the stored Directive quotation id is what makes the engine and the data layer non-driftable — and the ids are the publisher's own (`003.001`), verified language-invariant this session.

### Calculation conventions that must be *recorded as decisions* in Phase 1

| Convention | Directive position | Recommended recorded default |
|---|---|---|
| Denominator | **Fixed** — Art. 3(1)(c)/(e): *"as a percentage of the average pay level of male workers"* / *"of male workers"* `[VERIFIED]` | `male_mean` / `male_median`. Not a choice. |
| Quartiles by count, not range | **Fixed** — Art. 3(1)(f): *"four equal groups of workers"* `[VERIFIED]` | Rank by pay, split by headcount. Not a choice. |
| Category of workers | **Fixed** — Art. 3(1)(h): employer-defined `[VERIFIED]` | Require a `category` column. **Refuse to infer.** |
| Reference period | **Fixed** — Art. 9(2)–(4): *"relating to the previous calendar year"* `[VERIFIED]` | Reject non-calendar-year ranges. |
| Even-count median | **Silent** | `lower_of_two` as the documented default; both in the vectors |
| Quartile boundary ties | **Silent** | `ukgov_proportional` + remainder to lower quarter, **labelled a convention, not the Directive** `[CITED: PITFALLS.md:275 citing gov.uk]` |
| Part-time / FTE | **Silent** | **No default — throw.** This is ENG-04's flagship case. Vendors assert FTE normalisation as if it were law; the Directive states none `[CITED: PITFALLS.md:279]` |
| Small-group suppression | **No EU threshold exists** `[VERIFIED: Art. 12(3) is the only identifiability provision and sets no number]` | `null`. DE = 6 via § 12 EntgTranspG, as `country-data`, for the **individual information right**, not Art. 9. |
| Currency | Not addressed | Record per country; no cross-currency aggregation in v1 |

### Golden vectors — D-13's independent re-derivation

Pathological cases each vector set must include `[CITED: PITFALLS.md:289]`: ties across a quartile boundary; n mod 4 ∈ {0,1,2,3}; a category with one woman; an all-male category; a negative gap; zero variable components; a worker with unmapped `sex`. Each vector file declares its full `Conventions` block; there is **no** single canonical `expected.json`.

**D-13 mechanics the plan must make real:** the re-deriving pass must receive the conventions and the input rows **and nothing else** — not the first pass's output, not the worked-example artefact. Practically this means two separate task invocations with the answer withheld, and a third task that diffs them. A disagreement is a defect in the *convention wording*, and the fix is to the convention doc, not to either number.

### Share-URL parameter contract (GAP-06 / D-15)

Constraints verified in research `[CITED: .planning/research/PITFALLS.md:308-359]`: an edge function is a server and has request logs; social platforms fetch the shared URL server-side so the *recipient's* platform also sees the parameters; Cloudflare Web Analytics reports the page URL, so a URL carrying inputs puts inputs in the beacon.

The contract must therefore specify, as data:

1. **The transmitted parameter set** — exhaustive and closed. Per D-15: a bucketed lifetime total and a rounded gap percentage. **No country, sector, seniority or age.** A parameter not on the list is a CSP-level bug.
2. **Bucket boundaries as an explicit table with a version id.** D-15 is one-way: narrowing a bucket later cannot retract what was transmitted, and widening one breaks cached links. The version id in the URL is what makes a future change additive.
3. **The rounding rule** for the gap percentage, stated numerically.
4. **The fragment contract** — which fields live after `#`, with the note that fragments are not sent in the HTTP request line.
5. **The preview obligation** — the worker sees the exact transmitted URL before pressing Share (D-15).
6. **The k-anonymity floor** — the minimum population each bucket must cover for the card to be non-identifying. Without this, "wide buckets" is an aesthetic judgment rather than a checkable property, and Phase 4's card family cannot be reviewed against it.
7. **A worked adversarial read** — one paragraph showing what a Worker log line looks like and what it does and does not reveal. This is the artefact that answers the top Hacker News comment.

## Common Pitfalls

### Pitfall 1: Anchoring on a string that does not exist in the authentic text
**What goes wrong:** The verifier asserts `"Article 7"` and fails every build. **Why:** the OJ uses `Article\u00A07`; ASCII `"Article 7"` occurs **zero** times `[VERIFIED]`. **Avoid:** normalise NBSP and narrow spaces before matching; store raw. **Warning sign:** an anchor that "mysteriously" never matches.

### Pitfall 2: Anchoring on a string that exists in the *wrong* place
**What goes wrong:** `"within a reasonable period of time"` matches a recital about joint pay assessments 26,000 characters before Art. 7(4); `"Article 10"` matches a recital citing Article 10 **TFEU** `[VERIFIED]`. **Avoid:** scope to the `art_N` subtree before asserting. **Warning sign:** a green verifier on a citation a reviewer knows is wrong.

### Pitfall 3: Treating `res.ok` as success
**What goes wrong:** `202 / 0 bytes / res.ok === true` `[VERIFIED]`. **Avoid:** assert `status === 200` explicitly, after the 304 branch. **Warning sign:** a verification job whose runtime drops.

### Pitfall 4: Treating the NIM register as the answer
**What goes wrong:** the pipeline auto-promotes Slovakia's 2001 State Statistics Act to `legal_basis` because the Commission register lists it `[VERIFIED]`. **Avoid:** register entries land as `discovery_hints`; only a human sets `legal_basis` with `verified_by` (D-06). **Warning sign:** a `legal_basis` whose date precedes the Directive.

### Pitfall 5: A verifier that cannot see the text it claims to verify
**What goes wrong:** `slov-lex.sk` returns a 1,354-byte SPA shell; the check passes the byte floor, finds no anchor, and gets "fixed" by lowering the floor `[VERIFIED]`. **Avoid:** `manual-attest` as a first-class strategy that records the absence of machine verification. **Warning sign:** a byte floor that has been lowered in a commit.

### Pitfall 6: Conflating Art. 7(2) with Art. 12(3)
**What goes wrong:** LTR-16 routes every request through representatives in a state that took the Art. 12(3) option. **Why:** Art. 12(3) is conditional on identifiability; Art. 7(2) is an unconditional standing right in all states `[VERIFIED: both quoted]`. **Avoid:** model Art. 12(3) as a condition, not a route.

### Pitfall 7: `verified_at` bumped without a value change
**Warning signs** from Pitfall 2 `[CITED: PITFALLS.md:98-102]`: `verified_at` equal to the initial-commit date on many records; the verification job's runtime dropping; `verified_at` bumped in a PR that changes no `value`. Make the last one a CI rule, not a review hope.

### Pitfall 8: SPARQL treated as the retrieval layer
**What goes wrong:** the public SPARQL endpoint returned **zero triples** for `<http://publications.europa.eu/resource/celex/32023L0970>` while the REST API returned a 3.5 MB RDF description of the same resource `[VERIFIED]`. It indexes by **cellar UUID**, and the CELEX literal must be typed `^^xsd:string` — untyped returns nothing `[VERIFIED: both forms tried]`. A complex query also timed out at 60 s on the first attempt `[VERIFIED]`. **Avoid:** REST content negotiation is the retrieval layer; SPARQL is for one-off discovery (the NIM pull) with a generous timeout and a cached result.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Locating an article in the OJ text | A regex over `"Article N"` | The publisher's `id="art_N"` / `id="NNN.NNN"` ELI ids | Language-invariant, unambiguous, and immune to the NBSP and recital traps — all three proved this session |
| Per-language text acquisition | A translation step, or one language scraped and the rest inferred | `Accept-Language` content negotiation; all 24 versions are equally authentic | D-03; verified for ten locales |
| Transposition status research | 27 hand-run web searches | One SPARQL query against the Commission NIM register | Authoritative, dated, machine-readable, and it names the OJ reference |
| Drift detection | A diffing job over scraped HTML | `ETag` + `If-None-Match` conditional GET | Verified working; a 304 is a free "unchanged" |
| Cross-field provenance invariants | Review discipline | Zod `superRefine` | "Pending verification is unforgeable" must be structural `[CITED: ARCHITECTURE.md:245-262]` |
| Contributor-facing validation | A CONTRIBUTING.md instruction to run a CLI | Committed `country.schema.json` + `$schema` pointer | Lawyers get red squiggles in VS Code with no toolchain install |
| Median / quartile conventions | Picking one silently | An explicit required `Conventions` input that throws when absent | ENG-04; the Directive is genuinely silent and vendors disagree |

**Key insight:** almost every hand-rolled solution in this phase is a *string-matching* solution, and every string-matching approach tried in this session failed in at least one way on the authentic text. The structured data is already there; use it.

## Runtime State Inventory

Not applicable — this is a **greenfield** phase. The repository contains `.planning/` and `jafn-project-brief.md` and nothing else `[CITED: 01-CONTEXT.md:113]`; no source, no package manifest, no CI, no deployed service, no datastore.

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | None — no datastore exists in the project at all (no database is in the architecture) | None |
| Live service config | None — nothing is deployed yet. Phase 1 creates the first CI workflow | None |
| OS-registered state | None | None |
| Secrets / env vars | None. Phase 1 needs no secrets: Cellar requires no API key `[VERIFIED: all requests this session were unauthenticated]` | None |
| Build artifacts | None | None |

## Code Examples

### Retrieving and pinning an article (build-time Node, zero runtime deps in the shipped package)

```ts
// packages/country-data/scripts/fetch-directive.ts  — devDependency-only, build time
const CELEX = '32023L0970';
const BASE  = `http://publications.europa.eu/resource/celex/${CELEX}`;

// ISO-639-3 — verified working for eng, pol, slk, ita, lit, mlt, deu, nld, ces, swe, dan
export async function fetchExpression(lang3: string, knownEtag?: string) {
  const headers: Record<string, string> = {
    Accept: 'application/xhtml+xml',
    'Accept-Language': lang3,
  };
  if (knownEtag) headers['If-None-Match'] = knownEtag;

  const res = await fetch(BASE, { headers, redirect: 'follow' });

  if (res.status === 304) return { unchanged: true as const, etag: knownEtag! };
  // MUST be an exact 200 check: eur-lex.europa.eu answers 202 with an empty body and res.ok === true
  if (res.status !== 200) {
    throw new SourceDefect(`expected 200, got ${res.status} for ${BASE} (${lang3})`);
  }
  const body = await res.text();
  if (body.length === 0) throw new SourceDefect('empty body on a 200');

  return {
    unchanged: false as const,
    body,
    etag: res.headers.get('etag')!,          // "Con-20231213063525000"
    lastModified: res.headers.get('last-modified')!,
    pinnedUri: res.url,                      // …/cellar/5bbb9daf-…-01aa75ed71a1.0006.03/DOC_1
  };
}
```
`[VERIFIED: every status code, header name and value in this example was observed this session]`

### Extracting a citation by the publisher's own id

```ts
// Article container: <div class="eli-subdivision" id="art_7">
// Paragraph:         <div id="007.004">
export function extractParagraph(xhtml: string, article: number, para: number) {
  const artId  = `art_${article}`;
  const paraId = `${String(article).padStart(3, '0')}.${String(para).padStart(3, '0')}`;

  const start = xhtml.indexOf(`id="${artId}"`);
  if (start < 0) throw new SourceDefect(`article container ${artId} absent`);
  // scope FIRST — "within a reasonable period of time" also occurs in a recital
  const end   = xhtml.indexOf('class="eli-subdivision"', start + 10);
  const scope = xhtml.slice(start, end < 0 ? undefined : end);

  const pStart = scope.indexOf(`id="${paraId}"`);
  if (pStart < 0) throw new SourceDefect(`paragraph ${paraId} absent inside ${artId}`);
  return { citationKey: `${CELEX}#${paraId}`, html: scope.slice(pStart, /* … */) };
}

// Normalise ONLY for matching; store raw.
// The authentic text uses U+00A0 between "Article" and its number, and after paragraph numbers.
export const normaliseForMatch = (s: string) =>
  s.replace(/[\u00A0\u202F\u2009]/g, ' ')
   .replace(/[‘’]/g, "'")
   .replace(/[“”]/g, '"')
   .replace(/\s+/g, ' ')
   .trim();
```
`[VERIFIED: the id scheme, the NBSP positions and the recital collision were each observed directly]`

### Seeding the 27 files from the NIM register

```bash
curl -sS -G "http://publications.europa.eu/webapi/rdf/sparql" \
  --data-urlencode "format=application/sparql-results+json" \
  --data-urlencode 'query=
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT ?c ?title ?eli ?oj ?ojn ?ojd ?notif ?celex WHERE {
  ?w   cdm:resource_legal_id_celex "32023L0970"^^<http://www.w3.org/2001/XMLSchema#string> .
  ?nim cdm:measure_national_implementing_implements_resource_legal ?w .
  ?nim cdm:work_created_by_agent ?c .
  ?nim cdm:work_title ?title .
  ?nim cdm:resource_legal_id_celex ?celex .
  OPTIONAL { ?nim cdm:measure_national_implementing_national_website_link   ?eli   }
  OPTIONAL { ?nim cdm:measure_national_implementing_name_official_journal   ?oj    }
  OPTIONAL { ?nim cdm:measure_national_implementing_number_official_journal ?ojn   }
  OPTIONAL { ?nim cdm:measure_national_implementing_date_official_journal   ?ojd   }
  OPTIONAL { ?nim cdm:measure_national_implementing_date_notification       ?notif }
}'
# Deduplicate on (celex, title) — OPTIONAL cross-product yields ~1832 rows for 226 measures.
# Map 1001-01-01 -> null. Map any $…$ literal -> null.
# Every result lands as a discovery_hint with status: 'pending_verification'.
# A human promotes exactly one to legal_basis and sets verified_by.  (D-06)
```
`[VERIFIED: this query shape returned 200 / 1,099,677 bytes covering 15 countries this session]`

## State of the Art

| Old approach | Current approach | Impact |
|---|---|---|
| Scrape `eur-lex.europa.eu/legal-content/...` | Content-negotiate `publications.europa.eu/resource/celex/...` | The former is 202/empty to every non-browser client; the latter is open, fast and structured `[VERIFIED]` |
| Locate provisions by string search | Use ELI `art_N` / `NNN.NNN` ids | Language-invariant and collision-free `[VERIFIED]` |
| Hand-research transposition status per country | Query the Commission NIM register | Authoritative and dated `[VERIFIED]` |
| One global link-checker | Per-source verification strategy | Two of five launch-country registers defeat server-side fetch `[VERIFIED]` |

**Deprecated / to avoid:**
- `eur-lex.europa.eu` as a `source_url` for any machine-verified fact — permanently unfetchable by this method `[VERIFIED]`.
- The public SPARQL endpoint as the retrieval layer — incomplete index, slow on complex queries `[VERIFIED]`.

## Package Legitimacy Audit

Phase 1 installs a small, dev-only toolchain. Verified against the npm registry this session.

| Package | Registry | Age | Downloads | Source repo | Verdict | Disposition |
|---|---|---|---|---|---|---|
| `zod` | npm | 4.6.2 published 2026-09-10 (**1 day**) | 154.9M/wk | github.com/colinhacks/zod | **SUS** (`too-new`) | **Pin `4.5.4`** (2026-08-28) instead of `latest`. MIT, zero runtime deps. |
| `ajv` | npm | 8.20.0, 2026-04-24 | 201.2M/wk | github.com/ajv-validator/ajv | OK | Approved — documented fallback only, not required |
| `ajv-formats` | npm | 3.0.1, 2024-03-30 | 70.6M/wk | github.com/ajv-validator/ajv-formats | OK | Approved — fallback only |
| `@cfworker/json-schema` | npm | 2025-01-31 | 4.2M/wk | github.com/cfworker/cfworker | OK | Not needed this phase |
| `typescript` | npm | 7.0.2 | — | — | OK | Approved — locked in CLAUDE.md |
| `vitest` | npm | `V4` dist-tag = **4.1.11**; `latest` = 5.0.0 (2026-09-05) | — | — | OK | **Pin 4.1.11 via the `V4` tag** — STACK.md's rejection of 5.0.0 holds, and a maintained `V4` dist-tag exists `[VERIFIED: npm view vitest dist-tags]` |

`[VERIFIED: gsd query package-legitimacy check --ecosystem npm; npm view for versions, dates and licences]`

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `zod@4.6.2` — mitigated by pinning `4.5.4`. If the planner chooses 4.6.x anyway, insert a `checkpoint:human-verify` before the install.

**No runtime dependencies are added by this phase.** `packages/directive-engine` must have zero runtime deps `[CITED: REQUIREMENTS.md:85 ENG-02]`; `packages/country-data` ships JSON + generated `.d.ts` with Zod as a devDependency only `[CITED: .planning/research/ARCHITECTURE.md:423]`.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | Build scripts, validators | ✓ | v24.13.1 `[VERIFIED]` | CLAUDE.md requires ≥22.12.0 for Astro 7 — satisfied |
| `curl` | Source probing | ✓ | `/mingw64/bin/curl` `[VERIFIED]` | Node `fetch` |
| `git` | Repo | ✓ | `/mingw64/bin/git` `[VERIFIED]` | — |
| Python 3 | Ad-hoc extraction during research | ✓ | Python 3.12 `[VERIFIED]` | Not needed at build time |
| Cellar REST (`publications.europa.eu`) | Directive text (D-01) | ✓ | ~320 ms, no auth `[VERIFIED]` | **None — D-01 has no substitute.** Mitigate with ETag-keyed CI cache |
| Cellar SPARQL | NIM seeding | ✓ but slow/flaky — one 60 s timeout observed `[VERIFIED]` | — | Run once, commit the result as `discovery_hints`; do not put it on the PR path |
| `eur-lex.europa.eu` | — | ✗ **202 / 0 bytes to everything** `[VERIFIED]` | — | Cellar. Remove from every allowlist |
| `slov-lex.sk` | SK legal basis | ⚠ SPA shell, 1,354 bytes `[VERIFIED]` | — | `manual-attest` |
| `e-tar.lt` | LT legal basis | ⚠ 403 Cloudflare interstitial `[VERIFIED]` | — | `manual-attest` |
| `legislation.mt` | MT legal basis | ✓ 200 / 61,392 with JSON-LD `[VERIFIED]` | — | — |
| `dziennikustaw.gov.pl` | PL legal basis | ✓ 200 / 48,745 `[VERIFIED]` | — | — |
| `gazzettaufficiale.it` / `normattiva.it` | IT legal basis | ✓ 200 `[VERIFIED]` | — | — |
| GitHub Actions egress to `publications.europa.eu` | The whole CI gate | **UNKNOWN** | — | **D-01's conditional is unresolved until this is proven from CI** |

**Missing dependencies with no fallback:**
- **Whether GitHub Actions runners can reach `publications.europa.eu`.** D-01 says the researcher must confirm Cellar responds *"and from CI"*. This session proved the first half from a Windows workstation and **could not prove the second**. **This must be the first task in the phase** — a five-line workflow that curls the CELEX URI and asserts a 200 — and if it fails, D-01's conditional fires and the retrieval method returns to the user.

**Missing dependencies with fallback:**
- `slov-lex.sk`, `e-tar.lt` — covered by `manual-attest`.
- `eur-lex.europa.eu` — fully replaced by Cellar.

## Validation Architecture

### Test framework
| Property | Value |
|---|---|
| Framework | **Vitest 4.1.11** (`V4` dist-tag) `[VERIFIED: npm view vitest dist-tags]` |
| Config file | none — **Wave 0** creates `vitest.config.ts` |
| Quick run command | `pnpm vitest run --dir packages/country-data` |
| Full suite command | `pnpm -r test` |

### Phase requirements → test map
| Req | Behavior | Type | Automated command | Exists? |
|---|---|---|---|---|
| LEGAL-01 | A `verified` fact without a source / `verified_at` fails schema parse | unit | `pnpm vitest run packages/country-data/test/schema.test.ts -t "verified requires source"` | ❌ Wave 0 |
| LEGAL-01 | A `pending_verification` fact with a non-null value fails | unit | `… -t "pending must be null"` | ❌ Wave 0 |
| LEGAL-02 | Exactly 27 files, one per EU ISO-3166-1 alpha-2 code, filename matches `country.code` | unit | `… packages/country-data/test/coverage.test.ts` | ❌ Wave 0 |
| LEGAL-03 | `directive_fallback` status resolves to a Directive citation, never a national one | unit | `… test/resolve.test.ts -t "fallback"` | ❌ Wave 0 |
| LEGAL-04 | The stored Art. 7(4) quotation matches the Cellar text byte-for-byte in EN and PL | integration | `pnpm vitest run packages/country-data/test/directive-text.test.ts` | ❌ Wave 0 |
| LEGAL-05 | Art. 12(3) modelled as a condition, not a boolean route | unit | `… test/schema.test.ts -t "art_12_3"` | ❌ Wave 0 |
| LEGAL-07 | All six articles (3, 6, 7, 9, 10, 12) present with paragraph ids, in every served locale | integration | `… test/directive-text.test.ts -t "article coverage"` | ❌ Wave 0 |
| LEGAL-08 | Launch-country stale volatile fact fails; non-launch stale fact warns | unit | `… test/freshness.test.ts` | ❌ Wave 0 |
| **LEGAL-09** | **202/empty, 404, 400, 304, missing anchor, recital-scoped anchor, SPA shell each produce the correct classification** | unit, **fixture-driven, no network** | `… test/verifier.test.ts` | ❌ Wave 0 |
| LEGAL-09 | Cellar responds 200 with `art_7` present | integration, **network** | `… test/verifier.live.test.ts` (nightly only) | ❌ Wave 0 |
| LEGAL-10 | The four (five, per §Governance) bad-PR shapes each fail CI | e2e | The bad-PR drill — **manual, D-12**, evidenced by four rejected PR links | ❌ Wave 0 |
| ENG-01 | Every golden vector file parses and declares a complete `Conventions` block | unit | `pnpm vitest run packages/directive-engine/test/vectors-wellformed.test.ts` | ❌ Wave 0 |
| ENG-06 | Every `Conventions` key has a recorded decision in the convention doc | unit | `… test/conventions-documented.test.ts` | ❌ Wave 0 |
| GAP-06 | The share-URL contract's transmitted set contains no country/sector/seniority/age key | unit | `… test/share-url-contract.test.ts` | ❌ Wave 0 |

**The LEGAL-09 verifier tests must be fixture-driven and offline.** Capture the six real responses observed this session — the 202/empty, the 404 body, the 400, the 304, the `slov-lex.sk` shell, the `legislation.mt` JSON-LD — as committed fixtures. That makes the gate deterministic on every PR, and confines network flakiness to the nightly job. It is also the only way to test the empty-202 path without depending on EUR-Lex continuing to misbehave.

### Sampling rate
- **Per task commit:** `pnpm vitest run --dir packages/country-data`
- **Per wave merge:** `pnpm -r test`
- **Phase gate:** full suite green, plus the nightly live-source job green, before `/gsd-verify-work`

### Wave 0 gaps
- [ ] `vitest.config.ts` + `pnpm-workspace.yaml` with catalogs — no manifest exists yet
- [ ] `packages/country-data/test/fixtures/` — the six captured HTTP responses
- [ ] `packages/country-data/test/schema.test.ts`, `coverage.test.ts`, `resolve.test.ts`, `freshness.test.ts`, `verifier.test.ts`, `directive-text.test.ts`
- [ ] `packages/directive-engine/test/vectors-wellformed.test.ts`, `conventions-documented.test.ts`
- [ ] Framework install: `pnpm add -D -w vitest@4.1.11 zod@4.5.4`
- [ ] `.github/workflows/legal-data.yml` (PR profile) and `nightly.yml` (live profile)

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` `[VERIFIED: .planning/config.json]`. Phase 1 ships no user-facing surface, so most categories are structurally inapplicable — but the build-time fetcher and the community PR path are both real attack surfaces.

### Applicable ASVS categories
| Category | Applies | Standard control |
|---|---|---|
| V2 Authentication | no | No auth surface; Cellar needs no key `[VERIFIED]` |
| V3 Session Management | no | No sessions |
| V4 Access Control | **yes** | CODEOWNERS + branch protection + the `proposed/`→`data/` promotion boundary are the access-control model for the legal dataset (D-11) |
| V5 Input Validation | **yes** | Zod parse of all 27 files; URL scheme and domain allowlist; **the fetched Cellar body is untrusted input to the extractor** |
| V6 Cryptography | no | No secrets, no crypto in this phase |
| V14 Configuration | **yes** | Pinned dependency versions; no `postinstall` in the toolchain `[VERIFIED: legitimacy check returned `postinstall: null` for every package]` |

### Known threat patterns
| Pattern | STRIDE | Mitigation |
|---|---|---|
| Malicious `source_url` in a community PR (SSRF from the CI verifier) | Information disclosure | Per-country domain allowlist enforced **before** any fetch; `https://` only; reject credentials-in-URL, non-standard ports, and IP-literal hosts |
| A PR adding a plausible-looking statute number | Tampering | The L4 anti-hallucination lint + `verified_by` + the two-person rule on `status`/`deadline` `[CITED: PITFALLS.md:408]` |
| A PR that silently changes a deadline as a "typo fix" | Tampering | Letter snapshot tests make the worker-visible diff appear in the PR `[CITED: PITFALLS.md:412]`; bad-PR drill case 4 (D-12) |
| **A correct, allowlisted source cited for the wrong provision** | Tampering | Subtree-scoped anchor assertion; **bad-PR drill case 5** (new, §Governance) |
| Untrusted HTML from Cellar parsed by the extractor | Tampering / DoS | Treat the body as data only — never `eval`, never a DOM with script execution; cap the accepted body size; the extractor is string-slicing, not a browser |
| Tracking parameters leaking a maintainer's identity via a committed `source_url` | Information disclosure | L5 lint strips `utm_*`, `fbclid` `[CITED: ARCHITECTURE.md:438]` |
| Supply-chain: a one-day-old `zod` release in the provenance-critical path | Tampering | Pin `4.5.4`; lockfile committed; no `postinstall` scripts |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | GitHub Actions runners can reach `publications.europa.eu` | Environment Availability | **High.** D-01's conditional fires and the retrieval method must return to the user. **Make this the phase's first task.** |
| A2 | The `.0006.` / `.0018.` / `.0013.` manifestation segments remain stable across future Cellar republications | Directive Ground Truth | Medium — a pinned URI 404s. Mitigated by always resolving via CELEX + `Accept-Language` and treating the pinned URI as a recorded citation, not the fetch target |
| A3 | The `art_N` / `NNN.NNN` id scheme holds for all 24 language versions (ten were checked; PL structurally verified in detail) | Directive Ground Truth | Low — extraction fails loudly rather than silently |
| A4 | The Polish 11 March 2026 PIP-amendment act is the Art. 7 transposition vehicle | Transposition Reality | **High if asserted.** It is **not** asserted — it is a `discovery_hint` requiring D-06 human confirmation. The risk is only that a planner treats it as settled |
| A5 | `1001-01-01` is a null sentinel rather than a real (if absurd) date | Transposition Reality | Low — observed twice in contexts where a real date is impossible |
| A6 | 12 states having notified nothing means transposition is genuinely incomplete there, rather than a notification lag | Transposition Reality | Medium — the `country-data` value must be *"no implementing measure notified to the Commission as at {date}"*, which is exactly what was observed, **not** "has not transposed" |
| A7 | The NIM counts (e.g. `SVK 21`) are counts of distinct notified measures | Transposition Reality | Low — `COUNT(DISTINCT ?nim)` was used |
| A8 | `zod@4.5.4` is stable enough for the provenance path | Schema | Low — 2 weeks of soak; downgrade is trivial |
| A9 | Vitest's `V4` dist-tag will continue to receive patches | Validation Architecture | Low |

**Every `[ASSUMED]`-class item above is recorded here precisely because this phase's success criterion is that nothing rests on an unverified source. A1 and A6 are the two that change what the plan must do.**

## Open Questions

1. **Which member states took the Art. 12(3) option** (the roadmap's open question, LEGAL-05)
   - **What we know:** the Article text, verbatim `[VERIFIED]`. The option is **conditional on identifiability**, not a blanket routing rule — the roadmap's phrasing overstates it. 15 states have notified measures with titles and, for MT and LT, working ELI links `[VERIFIED]`.
   - **What is unclear:** **no machine-readable per-state answer exists.** The NIM register records *that* measures were notified, not *what they say*. Nothing in the Cellar metadata encodes Member State options.
   - **Recommendation:** answerable only by reading each national instrument. Scope it to the five launch countries (D-05), model it as a condition, and seed the other 22 as `pending_verification` with the NIM discovery hints attached. **Do not let an agent fill this field** — it is a legally-operative field under D-06.

2. **The national equality body and anti-retaliation provision per state** (LEGAL-06)
   - **What we know:** Art. 3(1)(l) defines it as *"the body or bodies designated pursuant to Article 20 of Directive 2006/54/EC"* `[VERIFIED]`. Candidate national bodies probed live: `bip.brpo.gov.pl` (PL, 200), `snslp.sk` (SK, 200), `lygybe.lt` (LT, 200), `ncpe.gov.mt` (MT, 200) `[VERIFIED: reachable]`.
   - **What is unclear:** **I did not verify that any of these is the Art. 20 designated body** — reachability is not designation. No single authoritative EU register of Art. 20 designations was located in this session.
   - **Recommendation:** this is an **UNKNOWN**, not a finding. Treat the four domains as `discovery_hints` only. The Art. 20 designation should be traced through each state's own notification or the Commission's equality-body reporting; if no primary source is found, the field stays `pending_verification` with the domain named — which the phase brief explicitly says is the correct output.

3. **Cellar reachability from GitHub Actions** — see Assumption A1. First task of the phase.

4. **The Polish UPL position** (D-08) — out of scope to resolve here. Phase 1's deliverable is the written gate: what needs a Polish-qualified answer, the current LOW-confidence position (no reserved monopoly on out-of-court advice; protected titles `adwokat`/`radca prawny`; art. 87 k.p.c. representation limits) `[CITED: .planning/research/PITFALLS.md:130 — marked SECONDARY and "needs a Polish-qualified check"]`, and what ships only once cleared.

5. **LEGAL-08 and LEGAL-05 both need rewording** — LEGAL-08 per D-10 (text proposed in §Freshness), LEGAL-05 per the Art. 12(3) scope correction. Both are planner tasks against `.planning/REQUIREMENTS.md`, not research gaps.

## Sources

### Primary (HIGH confidence — fetched and inspected this session)
- `http://publications.europa.eu/resource/celex/32023L0970` — Directive (EU) 2023/970 authentic OJ text, XHTML, in `eng`, `pol`, `slk`, `ita`, `lit`, `mlt`, `deu`, `nld`, `ces`, `swe`, `dan`. Articles 3, 6, 7, 9, 10, 12 extracted; structural ids, encoding, ETag, Last-Modified and error taxonomy all recorded.
- `http://publications.europa.eu/resource/celex/32023L0970` as `application/rdf+xml` (3,484,824 bytes) — `date_transposition`, NIM linkage.
- `http://publications.europa.eu/webapi/rdf/sparql` — NIM register queries (per-country counts; titles, OJ references, ELI links, notification dates).
- `http://publications.europa.eu/resource/nim/202603890`, `…/202603933` — full NIM property dumps (Estonia, Malta).
- `https://legislation.mt/eli/ln/2026/173/eng` — Malta LN 173/2026, schema.org JSON-LD.
- Negative/failure evidence: `eur-lex.europa.eu` (four URL shapes, three retries with a cookie jar); `slov-lex.sk`; `e-tar.lt`; plus eight further national domains probed.
- npm registry via `npm view` and `gsd query package-legitimacy check` — versions, dates, licences, dependency sets, postinstall scripts.

### Secondary (MEDIUM confidence — in-repo research read this session)
- `.planning/research/PITFALLS.md` — Pitfalls 1, 2, 6, 7, 9 (its Art. 9 / Art. 3 quotations were independently re-verified above and match).
- `.planning/research/ARCHITECTURE.md` — §2 `country-data` schema, validation approach, L1–L8 lint table.
- `.planning/research/STACK.md`, `.claude/CLAUDE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `01-CONTEXT.md`, `.planning/config.json`.

### Tertiary (LOW confidence)
- None relied upon. No WebSearch result was used as an authority in this document.

## Metadata

**Confidence breakdown:**
- Directive ground truth & retrieval: **HIGH** — every claim is a quotation from, or an observed response of, the Publications Office API, fetched this session
- Verifier design: **HIGH** — all six failure modes were reproduced, not theorised
- Transposition status: **HIGH** on what the Commission register contains; **MEDIUM** on what it means (A6), and deliberately **not** a claim about which measure is the legal basis (A4)
- Schema & freshness: **MEDIUM-HIGH** — builds on in-repo research plus this session's amendments
- Art. 12(3) per state, equality bodies: **UNKNOWN** — honestly unresolved, and the phase brief says that is the correct output
- CI reachability of Cellar: **UNKNOWN** — A1, the phase's first task

**Research date:** 2026-09-11
**Valid until:** 2026-10-11 for the transposition figures (the 12 non-notifying states are past the 2026-06-07 deadline and will move); 2027-03-11 for the Directive text and retrieval mechanics (`Last-Modified` has not changed since 2023-12-13)
