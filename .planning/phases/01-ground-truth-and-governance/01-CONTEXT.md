# Phase 1: Ground Truth and Governance - Context

**Gathered:** 2026-09-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase builds the legal substrate the whole product rests on, and nothing else.

**In scope:**
- Re-pulling Directive (EU) 2023/970 Articles 3, 6, 7, 9, 10 and 12 from EUR-Lex primary text
- The `Fact<T>` provenance envelope and the `country-data` schema for all 27 member states
- Seeding all 27 country files, with the five launch countries verified to source
- The CI gates that stop a wrong statute reaching a worker (schema, source-domain allowlist, fail-loud verifier, freshness)
- Repo governance: `proposed/` promotion flow, CODEOWNERS, PR template, legal-error reporting, and the bad-PR drill
- Three decisions recorded as data with no code written: golden vectors, the frozen `EngineReport` type plus calculation conventions, and the share-URL parameter contract

**Out of scope:**
- Any engine code (Phase 6), any UI (Phase 3), any letter copy (Phase 5), any design work (Phase 2)
- Resolving the Polish UPL question — recorded here as a gate, answered before Phase 5

**Requirements:** LEGAL-01 … LEGAL-10, ENG-01, ENG-06, GAP-06

</domain>

<decisions>
## Implementation Decisions

### EUR-Lex Ground Truth

- **D-01:** Directive primary text is retrieved through the EUR-Lex **Cellar REST / SPARQL machine API**, not by scraping the EUR-Lex HTML site and not by a manual human pull. Rationale: the HTML site was observed returning empty 200 responses to every researcher; Cellar serves stable URIs in machine-readable formats and is designed for programmatic access. — **Reversibility:** costly — the retrieval layer, its error taxonomy and the CI verifier's assertions are all built against this API's response shapes; swapping to another acquisition method means rewriting the verifier and re-deriving every stored quotation.
  - **Unproven.** Cellar has not been exercised from this environment. The researcher must confirm it responds, and from CI, before anything depends on it. If Cellar also fails, this decision must come back to the user rather than being silently replaced.

- **D-02:** Text is **fetched live at build time**; no committed snapshot artefact is kept. — **Reversibility:** costly — adding a committed snapshot later means introducing a hashing and drift-review process and re-anchoring every citation to it.
  - **Recorded concern (user decision, proceeding as instructed):** this makes the site unbuildable while Cellar is down, leaves no frozen artefact for a journalist to cite or for a drift job to diff against, and makes "did the text change under us?" unanswerable. Research Pitfall 2 §3 recommends a committed `source_snapshot_sha256` plus a text extract for exactly these reasons, and Pitfall 2 §7 recommends immutable dated snapshots because `country-data` will be cited. **The planner should treat build-availability under a Cellar outage as an explicit risk to mitigate** (e.g. CI caching of the last successful response), without reopening the decision.

- **D-03:** Retrieve and quote the authentic text in **English plus every served locale** — so a Polish letter quotes the authentic Polish wording of Art. 7 rather than a translation of the English. All 24 EUR-Lex language versions are equally authentic in law. — **Reversibility:** reversible — additional language versions are additional queries against the same CELEX id.

- **D-04:** Store **each cited article in full, with the operative sentence(s) tagged by id**. The letter and UI quote the tagged sentence; the full article is present so a quotation can be checked in context. Rationale: quotations without retrievable context are what produced the four inherited citation errors (Art. 6 vs Art. 7 subject matter, the false annual frequency limit, the two-month backstop wording, the German § 12 EntgTranspG threshold misapplied as a Directive rule). — **Reversibility:** costly — the tag ids become the citation keys used by letters and UI across Phases 3 and 5.

### Verification Scope

- **D-05:** Phase 1 closes with **the launch set deep and the remaining 22 structurally seeded**. All 27 files exist with the full field set and a real transposition status; **PL, SK, IT, LT and MT** have every field verified to source (legal basis, deadline, Art. 12(3) routing, equality body, anti-retaliation). The other 22 carry honest `pending verification` on the deep fields. Rationale: this is exactly the set that can get a letter at v1. — **Reversibility:** reversible — verification is additive per field.

- **D-06:** **An agent proposes, a human confirms.** An agent may find the official source and draft the `Fact<T>`, but a launch country's legally-operative fields (legal basis, deadline, Art. 12(3) routing) only flip to verified once a human has eyeballed the source. `verified_by` records which. Rationale: domain allowlist plus anchor assertion cannot distinguish the right domain citing the wrong article, and a hallucinated statute in a sent letter has no recovery path. — **Reversibility:** reversible — the gate can be relaxed per field later.

- **D-07:** A worker in a **pending country gets a Directive-only citation fallback, explicitly labelled**. Unverified national basis means the letter cites the Directive article itself and the country page says plainly that national transposition is pending or unconfirmed. The schema carries an **explicit "national citation suppressed, Directive fallback in use" state** rather than silently omitting a field. — **Reversibility:** one-way — this is a schema state that Phases 3 and 5 both branch on; removing it later means migrating every country record and both the country-page and letter-generation paths.
  - This also resolves a **documented ambiguity**: PROJECT.md's key decision says the English letter is available for "any EU state with that state's correct national citation" while its rationale names only SK/IT/LT/MT. The fallback state is what makes both readings true.

- **D-08:** The **Polish UPL question is recorded in Phase 1 as a tracked blocking gate on Phase 5**, not resolved here. Phase 1 writes down precisely what needs a Polish-qualified answer, what the current LOW-confidence position is, and what ships only once it is cleared. Rationale: it is an external, paid, calendar-bound dependency, and the copy it constrains does not exist until Phase 5. — **Reversibility:** reversible.

### CI Gates and Governance

- **D-09:** The verifier **distinguishes a data defect from a transport failure**. Empty-200, a missing expected anchor string, or a 404 is a **hard fail** — that is a data defect. A transport failure (DNS, timeout, 5xx) retries with backoff and, if it still fails, blocks the merge under a distinct **"source unreachable, not disproven"** status with a one-click maintainer override that is recorded in the audit log. Rationale: a gate that goes red on someone else's outage gets disabled within a month, which is worse than no gate. — **Reversibility:** reversible.

- **D-10:** **Staleness degrades the UI; the build fails only for launch countries.** A stale volatile field makes the country page read "last confirmed on {date} — status may have changed" and **suppresses the stale value from any share card or letter citation**. The build hard-fails only when a *launch-country* legally-operative field is stale. — **Reversibility:** costly — the degraded state is rendered by Phase 3 and consumed by Phase 5.
  - **Requirements conflict to fix:** `LEGAL-08` currently reads *"A build fails when any fact's `verified_at` is older than the agreed freshness window"*, which contradicts this. **The planner must reword LEGAL-08 in `.planning/REQUIREMENTS.md` to match**, rather than leaving a requirement the implementation knowingly violates.

- **D-11:** Community contributions are **additive-by-default via `proposed/`**. PRs land in `proposed/` and a maintainer promotes them into the live dataset. A contributor gets a merged PR; merging alone cannot make the site more confident — only maintainer promotion can. Adopt the Public Suffix List posture that slow merges are a feature. — **Reversibility:** costly — the promotion flow shapes the repo layout, CODEOWNERS and every contributor-facing doc.

- **D-12:** The **repo goes public at Phase 1 close, after the deliberately-bad-PR drill**. Each gate must be proven to reject: a fabricated statute number, a non-allowlisted source (e.g. a law-firm blog), a URL that returns an empty 200, and a silent deadline change disguised as a typo fix. — **Reversibility:** one-way — publishing a repository cannot be undone; the history and any mistakes in it are public from that moment.

### Frozen Decisions (data, no code)

- **D-13:** A golden vector is proved correct by a **hand-computed worked example, then independently re-derived** from the conventions alone by a pass that has not seen the first answer. A disagreement means the *convention* is ambiguous — which is the bug worth finding in Phase 1 rather than Phase 6. Slowness per vector is intentional: it forces vectors to stay small enough to follow on paper. — **Reversibility:** reversible — but a wrong vector is `one-way` in effect, because every engine test written in Phase 6 will then agree with it.

- **D-14:** Where a calculation convention is **underdetermined by the Directive** (part-time normalisation is the clearest case; Art. 9 does not settle it), the engine **picks a documented default, accepts an explicit override, and records in every `EngineReport` which convention produced the number**. Rationale: an HR user must be able to defend the figure to their own auditor, and a disagreement should be a parameter rather than a bug report. — **Reversibility:** one-way — the "which convention was used" field is part of the frozen `EngineReport` contract that Module D, the adapters and the published npm package all consume; adding it later breaks a published type.

- **D-15:** The **share-URL contract transmits wide buckets only, with no country, sector, seniority or age signal** — a bucketed lifetime total and a rounded gap percentage, previewed to the worker before they press Share. Real inputs stay in the fragment and are never transmitted. Rationale: the OG Worker sees every transmitted parameter in its request, and the params must survive an adversarial read of that log. Accepts a less specific card (no country name on it) as the price. — **Reversibility:** one-way — share-card URLs are public artefacts that persist in social-media caches and Worker logs; narrowing a bucket later cannot retract what was already transmitted, and widening one breaks existing shared links.

- **D-16:** The `EngineReport` type is **frozen with a recorded amendment path**. It is a contract Phase 6 must satisfy, but an amendment is permitted when written up with a reason and applied to the convention doc and the golden vectors **together**. Rationale: building the engine will surface something a data-only design could not see, and the alternative is silent drift or an ugly workaround. — **Reversibility:** costly.

### Claude's Discretion

None — the user made an explicit choice on every question. D-01 carries a conditional: if Cellar proves unreachable from CI, the retrieval method returns to the user rather than being substituted by an agent.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements and scope
- `.planning/ROADMAP.md` §"Phase 1: Ground Truth and Governance" — goal, the five success criteria, and the two open questions the phase must resolve
- `.planning/REQUIREMENTS.md` — LEGAL-01 … LEGAL-10, ENG-01, ENG-06, GAP-06. **Note:** LEGAL-08 needs rewording per D-10
- `.planning/PROJECT.md` §Constraints — the legal-content rule for agents, the article-level accuracy rule, the privacy constraint
- `.planning/PROJECT.md` §"Key Decisions" — the 27-state coverage decision, the English-letter decision (ambiguity resolved by D-07), the MIT/AGPL split

### Legal-data governance and provenance
- `.planning/research/PITFALLS.md` §"Pitfall 2: `verified_at` that is a decoration, not a control" — the `Fact<T>` field list, the four volatility classes and their TTLs, the four-part fail-loud verifier assertion, the correction-log and snapshot recommendations
- `.planning/research/PITFALLS.md` §"Pitfall 9: Community PRs putting a wrong statute in front of a worker" — the eleven-point governance list: schema-first CI, source-domain allowlist, link liveness plus anchor assertion, CODEOWNERS, two-person rule, structured PR template, default-to-unverified, additive-by-default `proposed/`, letter snapshot tests, `REPORTING-LEGAL-ERRORS.md`, and the Public Suffix List precedent
- `.planning/research/PITFALLS.md` §"Pitfall 1: Shipping inherited legal errors" — the four corrected citation errors this phase must verify stay corrected
- `.planning/research/PITFALLS.md` §"Pitfall 6: Getting the Article 9 metrics wrong" — constrains D-13 and D-14
- `.planning/research/PITFALLS.md` §"Pitfall 7: The zero-egress claim gets broken by the project's own architecture" — constrains D-15

### Project origin
- `jafn-project-brief.md` — the original brief. **Read with care:** it is the source of the four corrected citation errors and must not be treated as authoritative on any Directive article

### Engine and share-card contracts
- `.planning/research/STACK.md` §"OG Image Generation at the Edge" and §"The one place 'zero egress' needs an honest asterisk" — the share-URL constraints D-15 implements
- `.planning/research/ARCHITECTURE.md` — package layout expectations for `country-data` and `directive-engine`

### External (primary sources, to be retrieved in this phase)
- Directive (EU) 2023/970, CELEX `32023L0970`, via the EUR-Lex Cellar REST/SPARQL API — Articles 3, 6, 7, 9, 10, 12, in EN plus each served locale

</canonical_refs>

<code_context>
## Existing Code Insights

**Greenfield.** The repository contains `.planning/` and `jafn-project-brief.md` and nothing else — no source, no package manifest, no CI.

### Reusable Assets
None. Every pattern in this phase is being established for the first time.

### Established Patterns
None in code. The binding constraints come from `.planning/PROJECT.md` §Constraints and the locked stack in `.planning/research/STACK.md` (pnpm workspaces with catalogs, TypeScript, ESM-only, `directive-engine` with zero runtime dependencies enforced in CI).

### Integration Points
This phase creates the repo skeleton that every later phase builds into:
- `packages/country-data` — the 27 seeded files, the `Fact<T>` schema, the `proposed/` staging directory
- The golden vectors and frozen `EngineReport` type, consumed by `directive-engine` (Phase 6) and Module D
- The share-URL parameter contract, consumed by the design system (Phase 2) and the OG Worker
- The CI workflow that every later phase's gates are added to

</code_context>

<specifics>
## Specific Ideas

- **The Public Suffix List as the governance model** — the closest analogue to a community-maintained data file with real downstream safety consequences. Its posture (validation records, evidence, verbose rationale, maintainer review, no guaranteed inclusion timeline, non-conforming patches sit indefinitely) is the one to copy, per research Pitfall 9 §11.
- **The bad-PR drill is a deliverable, not a check** — four specific attacks must each be shown to be rejected: fabricated statute number, non-allowlisted source domain, empty-200 URL, silent deadline change disguised as a typo fix.
- **Independent re-derivation, not review** — for golden vectors the second pass must not see the first answer. A reviewer checking the artefact that produced the answer is the failure mode being avoided (which is also why a committed spreadsheet was rejected).

</specifics>

<deferred>
## Deferred Ideas

- **Monorepo/package layout and the brand name** — PROJECT.md records the brand name and domain as deferred to a Phase 0 decision that has not been made. Phase 1 creates the repo the community first sees, so a placeholder will be needed; the naming decision itself is not in this phase's scope. Raise before the repo goes public (D-12).
- **Legal-error reporting channel and public correction log** — `REPORTING-LEGAL-ERRORS.md`, the SLA, the rollback procedure and `CHANGELOG-legal.md` (research Pitfall 2 §6, Pitfall 9 §10). Set aside in discussion; they belong with the governance work in this phase and the planner should fold them in, but no user decision was taken on their shape.
- **Art. 12(3) routing survey depth for the 22 pending states** — D-05 requires it verified for launch countries only. How far the survey goes for the rest was not decided.
- **Committed source snapshots for citation permalinks** — research Pitfall 2 §7 recommends `data/snapshots/{date}/` so a journalist's citation stays honest after a correction. Excluded by D-02's live-fetch decision; revisit if the build-availability risk materialises.

</deferred>

---

*Phase: 1-Ground Truth and Governance*
*Context gathered: 2026-09-11*
