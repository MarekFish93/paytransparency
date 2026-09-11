---
phase: 01-ground-truth-and-governance
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - pnpm-workspace.yaml
  - .npmrc
  - .gitignore
  - tsconfig.base.json
  - vitest.config.ts
  - README.md
  - packages/country-data/package.json
  - packages/country-data/tsconfig.json
  - packages/country-data/src/schema.ts
  - packages/country-data/src/verifier.ts
  - packages/country-data/src/freshness.ts
  - packages/country-data/scripts/fetch-directive.ts
  - packages/country-data/data/_directive.json
  - packages/country-data/test/spine.test.ts
  - packages/country-data/test/fixtures/cellar-art7-en.xhtml
  - packages/country-data/test/fixtures/cellar-art7-recital-decoy.xhtml
  - .github/workflows/cellar-reachability.yml
  - .github/workflows/legal-data.yml
autonomous: true
requirements: [LEGAL-01, LEGAL-04, LEGAL-09]

estimate:
  tokens: 70000
  raw_tokens: 70000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A GitHub Actions runner reaches http://publications.europa.eu/resource/celex/32023L0970 and receives HTTP 200 with an element carrying id=\"art_7\" — D-01's conditional is discharged with CI evidence, not workstation evidence"
    - "The authentic Art. 7(4) two-month wording is stored in packages/country-data/data/_directive.json as a Fact envelope carrying a Source with url, anchor, verification strategy, etag, accessed_at, and a verified_at date — the value cannot exist in the file without its provenance"
    - "The verifier disposes the stored fact's source as verified only after asserting status 200, a non-empty body, the presence of the id=\"art_7\" subtree, and the normalised anchor INSIDE that subtree"
    - "A deliberately broken copy of that same fact — anchor text present in the document but only inside a recital, outside the art_7 subtree — is disposed data_defect by the verifier and turns the CI job red"
    - "When verified_at equals today's date the fact is fresh; when the elapsed days equal the volatility class TTL exactly the fact is stale (boundary is inclusive on the stale side)"
    - "A Fact with status 'verified' and sources: [] fails Zod parse; a Fact with status 'pending_verification' and a non-null value fails Zod parse"
    - "Fact.sources preserves authored array order through parse and re-serialisation, and sources[0] is the primary citation the UI and letters will quote"
  artifacts:
    - path: "packages/country-data/src/schema.ts"
      provides: "Frozen Fact<T>, Source and FactStatus primitives with the five-member status union and five-member verification union"
      exports: ["Fact", "Source", "FactStatus", "SourceVerification", "Volatility", "IsoDate"]
      contains: "directive_fallback"
    - path: "packages/country-data/src/verifier.ts"
      provides: "The fail-loud source verifier: assertion order, normalisation, subtree scoping, disposition enum"
      exports: ["verifySource", "normaliseForMatch", "SourceDefect", "Disposition"]
    - path: "packages/country-data/src/freshness.ts"
      provides: "Volatility-class TTL table and the fresh/ageing/stale computation"
      exports: ["TTL_DAYS", "freshnessOf"]
    - path: "packages/country-data/scripts/fetch-directive.ts"
      provides: "Cellar content-negotiated retrieval plus id-scoped article/paragraph extraction"
      exports: ["fetchExpression", "extractParagraph"]
    - path: "packages/country-data/data/_directive.json"
      provides: "The one seeded Directive fact — Art. 7(4) EN — in Fact envelope shape"
      contains: "007.004"
    - path: ".github/workflows/cellar-reachability.yml"
      provides: "The D-01 conditional probe: proves Cellar answers from a GitHub Actions runner"
    - path: ".github/workflows/legal-data.yml"
      provides: "The PR-profile CI gate that runs the offline spine test"
    - path: "packages/country-data/test/spine.test.ts"
      provides: "End-to-end offline proof: fixture -> extract -> verify -> Fact -> freshness"
    - path: "pnpm-workspace.yaml"
      provides: "Workspace globs and the version catalog pinning zod and vitest"
      contains: "catalog"
  key_links:
    - from: "packages/country-data/scripts/fetch-directive.ts"
      to: "packages/country-data/data/_directive.json"
      via: "extractParagraph writes the raw quotation plus the resolved pinned URI and ETag into the Fact envelope"
      pattern: "007\\.004"
    - from: "packages/country-data/src/verifier.ts"
      to: "packages/country-data/src/schema.ts"
      via: "verifySource dispatches on Source.verification and asserts Source.anchor"
      pattern: "verification|anchor"
    - from: ".github/workflows/legal-data.yml"
      to: "packages/country-data/test/spine.test.ts"
      via: "the PR job runs the offline spine test, so a broken fact turns the gate red"
      pattern: "spine\\.test\\.ts"
  prohibitions:
    - "MUST NOT write a statute number, deadline, authority name or citation into any data file that was not read out of a retrieved primary source in this task — an unknown field is value: null with status 'pending_verification', never a plausible guess"
    - "MUST NOT let the verifier dispose a source as verified on evidence it did not actually read — an empty body, a 202, a 304 treated as content, a client-rendered shell, or an anchor matched outside the cited article's subtree must never reach a green disposition"
    - "MUST NOT weaken a byte floor, broaden an anchor, or drop the subtree scope in order to make a red gate go green; a source that cannot be machine-verified is recorded as manual-attest, not as verified"
---

<objective>
Prove the whole legal-data spine end to end on ONE fact before anything is seeded at scale: a GitHub
Actions runner reaches the Publications Office Cellar API, the authentic Art. 7(4) two-month wording
is retrieved by the publisher's own structural ids, stored inside a `Fact` envelope that cannot hold
a value without provenance, verified by a fail-loud verifier that scopes its anchor to the cited
article, evaluated against a volatility-class freshness window, and gated in CI — with a
deliberately broken copy of that same fact proving the gate bites.

Purpose: D-01 carries an explicit conditional — Cellar reachability from CI is UNKNOWN and, if it
fails, the retrieval method returns to the user rather than being silently substituted. Everything
else in this phase is built on that one unproven fact. Proving the spine on one fact also catches an
architectural dead-end after one commit instead of after twenty-seven country files.

Output: a pnpm workspace, the frozen `Fact`/`Source`/`FactStatus` primitives, a working Cellar
retrieval + extraction path, the verifier and freshness core, one seeded Directive fact, and two CI
workflows.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/phases/01-ground-truth-and-governance/01-CONTEXT.md
@.planning/phases/01-ground-truth-and-governance/01-RESEARCH.md
@.planning/phases/01-ground-truth-and-governance/01-VALIDATION.md
@.planning/research/ARCHITECTURE.md
@.planning/research/STACK.md
</context>

<assumption_delta_decision>
## Assumption-Delta: what is now the primary noun

Three singular assumptions in the phase brief turn out to be plural. Recording the promote/add-alongside
call once, here, because this plan is where the generalised shapes get frozen into types that Phases 3,
5 and 6 all read.

**1. Noun: the verification strategy of a source (was: "a fetched-and-anchored URL").**
The brief and LEGAL-09 assume one verification act — fetch, assert 200, assert non-empty, assert
anchor. Research reproduced six response shapes where that single act either fails on a correct
document or greens on an incorrect one, and two launch-country registers (a client-rendered shell and
a WAF interstitial) that defeat server-side fetching entirely.
**Decision: `promote`.** `Source.verification` becomes a REQUIRED discriminant on every `Source`, with
`'cellar' | 'html-anchor' | 'jsonld' | 'metadata-only' | 'manual-attest'`. The old fetch-and-anchor
rule is demoted to the behaviour of the `cellar` and `html-anchor` variants. `manual-attest` is a
first-class peer, not an exception — it records the *absence* of machine verification honestly, which
is strictly better than a green produced by a fetch that never saw the statute. The five-member union
is authored in full in this plan even though only `cellar` is implemented here; the other four
implementations arrive in plan 02 against an already-frozen discriminant.

**2. Noun: the provenance state of a legal fact (was: "verified or not").**
`FactStatus` was four members. Three distinct claims were collapsing into "we have no national
citation": *we have not checked* (`pending_verification`), *we checked and national law adds nothing*
(`directive_default`), and *we are deliberately suppressing a national citation and citing the
Directive instead* (`directive_fallback`, D-07).
**Decision: `promote`.** The five-member union is the primary representation; "verified vs not" is
demoted to a predicate over it. D-07 rates this `one-way` and the user has already taken that door,
so no checkpoint is inserted — the rating is recorded and the union is frozen here.

**3. Noun: the Art. 12(3) position of a member state (was: "routed via representatives: yes/no").**
The roadmap's open question reads Art. 12(3) as a blanket routing rule. The authentic text makes the
restriction conditional on the disclosure identifying an individual worker, and Art. 7(2) is a
separate, unconditional standing right in every state.
**Decision: `promote`.** The primary representation is a *condition* with the bodies it routes to;
"the worker is routed to X" is demoted to a derived consequence evaluated per request. Plan 04 owns
the field shape and the REQUIREMENTS.md rewording of LEGAL-05; this plan only records that the
country record must not carry a boolean here.

**Suggested (not required) contract test for a future phase:** a type-level or parse-level test
asserting that `FactStatus` has five members and `SourceVerification` has five members, so a later
phase that re-collapses either union to the singular assumption goes red rather than quietly losing a
distinction.

## Prohibitions dismissed with reason (not silently dropped)

Four project-wide prohibitions from `.claude/CLAUDE.md` were recalled and dismissed for this phase
because the surface they guard does not exist yet: no `'unsafe-inline'` anywhere (no CSP is authored
before Phase 3), no CJK webfont (no font is shipped before Phase 2/3), no SheetJS (no spreadsheet
parsing before Phase 6), no `<ClientRouter />` (no Astro app before Phase 3). Each is recorded here so
the dismissal is auditable; each re-arms in the phase that creates its surface.
</assumption_delta_decision>

<tasks>

<task type="auto">
  <name>Task 1: Bootstrap the workspace and discharge D-01 by proving Cellar answers from GitHub Actions</name>
  <precondition>`gh auth status` reports a logged-in github.com account (the CI reachability proof requires pushing a workflow and reading its run conclusion)</precondition>
  <reversibility rating="reversible">Creating a private GitHub repository under a placeholder name is undoable by deleting it; the public-visibility flip and the final name are gated separately in plan 05.</reversibility>
  <files>package.json, pnpm-workspace.yaml, .npmrc, .gitignore, tsconfig.base.json, vitest.config.ts, README.md, packages/country-data/package.json, packages/country-data/tsconfig.json, .github/workflows/cellar-reachability.yml</files>
  <read_first>
    - .claude/CLAUDE.md — the locked stack table (Node engines, TypeScript 7.0.2) and the licensing split (MIT for directive-engine, AGPL for the web app)
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Environment Availability" — the UNKNOWN row for GitHub Actions egress to publications.europa.eu, and assumption A1 which makes this the phase's first task
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Package Legitimacy Audit" — the pin decisions for zod and vitest
    - .planning/phases/01-ground-truth-and-governance/01-CONTEXT.md § "EUR-Lex Ground Truth" — D-01 and its conditional, D-02 and its recorded build-availability concern
    - .planning/research/ARCHITECTURE.md § 2 — the package layout country-data is expected to have
  </read_first>
  <action>
Create the pnpm workspace root. Root `package.json`: `"name": "jafn"`, `"private": true`, `"type": "module"`, `"packageManager": "pnpm@12.3.4"`, `"engines": { "node": ">=22.12.0" }`, and scripts `test` (runs `vitest run`), `typecheck` (runs `tsc -b`), plus four script names the later plans fill. Author every script name AND its exact target path now, so no later plan has to edit this file and the command surface is fixed from the start: `fetch:directive` runs `node packages/country-data/scripts/fetch-directive.ts`; `seed:nim` runs `node packages/country-data/scripts/seed-from-nim.ts`; `verify:sources` runs `node packages/country-data/scripts/verify-sources.ts`; `validate:country-data` runs `node packages/country-data/scripts/validate.ts`; and `rederive:vectors` runs `node packages/directive-engine/scripts/rederive.ts`. Write every one of those scripts in erasable TypeScript so it runs under the installed Node runtime's native type stripping — no enums, no namespaces, no parameter properties — and add no script-runner dependency. The repo licence is AGPL-3.0-only at the root; `packages/directive-engine` will declare MIT for itself in plan 06.

`pnpm-workspace.yaml`: `packages:` globs `packages/*` and `apps/*`, plus a `catalog:` block pinning `zod: 4.5.4`, `vitest: 4.1.11`, `typescript: 7.0.2`. Use `zod@4.5.4` — NOT 4.6.x — per the legitimacy audit: 4.6.2 was published one day before research and returned verdict SUS with reason too-new; 4.5.4 is the last release with meaningful soak. Pin `vitest@4.1.11` via the `V4` dist-tag value, not `latest` (which is 5.0.0 and raises the Node floor).

`.npmrc`: `enable-pre-post-scripts=false` and `resolution-mode=highest`. `.gitignore`: `node_modules/`, `dist/`, `.turbo/`, `*.tsbuildinfo`, `coverage/`.

`tsconfig.base.json`: `"target": "ES2023"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`, `"noUncheckedIndexedAccess": true`, `"declaration": true`, `"verbatimModuleSyntax": true`. ESM only — do not emit a dual ESM/CJS build.

`vitest.config.ts` at the root: `test.include` covering `packages/*/test/**/*.test.ts`, `test.exclude` covering `**/*.live.test.ts` so the network-dependent suite never runs on the PR profile, and no watch mode.

`packages/country-data/package.json`: name `@jafn/country-data`, `"type": "module"`, `"license": "AGPL-3.0-only"`, `exports` mapping `.` to the built `dist/index.js` with `types` listed FIRST in the exports object, and `zod` declared under `devDependencies` only — this package ships JSON plus generated `.d.ts`, so a consumer must pay no runtime cost. `packages/country-data/tsconfig.json` extends `tsconfig.base.json`.

`README.md`: a short stub naming the project, the AGPL/MIT split, and a one-line statement that no salary data reaches a server. Do not write the privacy proof here — that is Phase 3.

Enable corepack (`corepack enable`) so the pinned pnpm major resolves, then install with `pnpm add -D -w vitest@4.1.11 zod@4.5.4 typescript@7.0.2`. Commit the lockfile.

`.github/workflows/cellar-reachability.yml`: a single job on `workflow_dispatch` and `push`, `runs-on: ubuntu-latest`, no checkout of secrets, that curls `http://publications.europa.eu/resource/celex/32023L0970` with `Accept: application/xhtml+xml` and `Accept-Language: eng`, following redirects, and asserts THREE things, failing the step on any of them: the final HTTP status is exactly 200 (not merely 2xx — a 202 with an empty body must not pass), the downloaded size is greater than 100000 bytes, and the body contains `id="art_7"`. Echo the resolved final URL and the `ETag` response header into the job log so the pinned expression URI and ETag are recorded as CI evidence. Do not add a retry loop to this job — its purpose is to answer a yes/no question, and a retry would mask a hard failure.

Create the GitHub remote so the workflow can run: `gh repo create MarekFish93/jafn --private --source=. --remote=origin --push`. The name `jafn` is a PLACEHOLDER — the brand/domain decision is deferred in CONTEXT.md and is gated before the repo goes public in plan 05. The repository must be created PRIVATE; D-12 makes it public only at phase close, after the bad-PR drill.

Then run the workflow and read its conclusion. If the run concludes anything other than `success`, STOP: do not proceed to task 2, do not substitute another retrieval method, and report that D-01's conditional has fired and the retrieval method must return to the user. Substituting a retrieval method here would silently invalidate every decision built on D-01.
  </action>
  <acceptance_criteria>
    - `pnpm-workspace.yaml` contains a `catalog:` block whose `zod` entry is exactly `4.5.4` and whose `vitest` entry is exactly `4.1.11`
    - Root `package.json` contains `"packageManager": "pnpm@12.3.4"` and an `engines.node` value of `>=22.12.0`
    - `packages/country-data/package.json` lists `zod` under `devDependencies` and lists nothing under `dependencies`
    - `vitest.config.ts` excludes `**/*.live.test.ts` from the default run
    - `git remote get-url origin` prints a github.com URL, and `gh repo view --json visibility --jq .visibility` prints `PRIVATE`
    - `gh run list --workflow=cellar-reachability.yml --limit 1 --json conclusion --jq '.[0].conclusion'` prints `success`
    - The workflow run log contains a line carrying an `ETag` value beginning `"Con-` and a line carrying the resolved `publications.europa.eu/resource/cellar/` expression URI
  </acceptance_criteria>
  <verify>
    <automated>gh run list --workflow=cellar-reachability.yml --limit 1 --json conclusion --jq '.[0].conclusion'</automated>
    <fails_when>prints anything other than the single word `success`, or prints nothing at all (no run was recorded, meaning the workflow never dispatched)</fails_when>
    <automated>pnpm typecheck</automated>
    <fails_when>non-zero exit, or stderr contains `error TS`</fails_when>
  </verify>
  <done>The workspace installs and typechecks, a private GitHub remote exists, and a GitHub Actions runner has proved with a recorded ETag that Cellar answers 200 with the art_7 subtree present — D-01's conditional is discharged.</done>
</task>

<task type="tracer">
  <name>Task 2: One fact end-to-end — Art. 7(4) from Cellar to a verified, freshness-evaluated Fact</name>
  <reversibility rating="one-way">The five-member `FactStatus` union (including `directive_fallback`) and the five-member `Source.verification` union become the shape Phases 3, 5 and 6 branch on and the community PRs against; collapsing either later means migrating every country record and both the country-page and letter-generation paths. D-07 and the research verifier design already took this door — the rating is recorded, not re-asked.</reversibility>
  <files>packages/country-data/src/schema.ts, packages/country-data/src/verifier.ts, packages/country-data/src/freshness.ts, packages/country-data/scripts/fetch-directive.ts, packages/country-data/data/_directive.json, packages/country-data/test/fixtures/cellar-art7-en.xhtml, packages/country-data/test/spine.test.ts</files>
  <read_first>
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Directive Ground Truth" — the retrieval table, the structural citation keys (`art_7`, `007.004`), and the verbatim Art. 7(4) text in EN and PL
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "The Verifier" — the six reproduced failure modes and the nine-step assertion order
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Schema and Provenance" — amendments A, B, C and D to the Fact envelope, and the freshness TTL table
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Code Examples" — the fetchExpression and extractParagraph shapes, and the normaliseForMatch mapping
    - .planning/research/ARCHITECTURE.md § 2 — the original Fact<T>, Source and SourceKind definitions this amends
    - .claude/CLAUDE.md — the legal-content rule and the article-level accuracy rule (Art. 6 vs Art. 7; no annual frequency limit on the worker; the German six-person threshold is not a Directive rule)
  </read_first>
  <action>
Wire ONE path through every layer. No second fact, no second article, no second language, no second source strategy.

**Schema (`packages/country-data/src/schema.ts`).** Author the frozen primitives with Zod. `IsoDate` is a `YYYY-MM-DD` regex. `SourceKind` keeps the seven members from ARCHITECTURE.md §2 (`official_journal`, `legislature`, `ministry`, `equality_body`, `eu_institution`, `law_firm`, `press`). Add the four research amendments now, in full, even though only one is exercised by this task:
 - `FactStatus` has exactly FIVE members: `verified`, `directive_default`, `directive_fallback`, `pending_verification`, `not_applicable`. `directive_fallback` means "national citation deliberately suppressed, the Directive article is cited instead" (D-07) and is a different claim from both `pending_verification` (we do not know) and `directive_default` (we checked and national law adds nothing).
 - `SourceVerification` has exactly FIVE members: `cellar`, `html-anchor`, `jsonld`, `metadata-only`, `manual-attest`.
 - `Source` gains required `verification: SourceVerification` and required `anchor: string` (min length 8), plus optional `etag: string` and `last_modified: string`. `url` must be `https://` OR `http://publications.europa.eu/` — the Cellar canonical resource URI is served over http and content-negotiated, and forbidding it would block the project's only primary source. Reject URLs carrying credentials, a non-standard port, an IP-literal host, or any `utm_*`/`fbclid` query parameter.
 - `Fact<T>` gains required `volatility: 'stable' | 'volatile' | 'pending' | 'statistical'` and `verified_by: string | null` (default null).
 - `superRefine` invariants: `verified` requires a non-null `value`, at least one source, and a `verified_at`; `pending_verification` requires `value === null`; `verified_at` may not be in the future; a `Source` whose `verification` is not `manual-attest` must carry a non-empty `anchor`; a `Source` whose `verification` is `manual-attest` must carry a non-null `verified_by` on its parent fact.
 - Do NOT add `source_snapshot_sha256` or `source_snapshot_path` — committed snapshots are excluded by D-02.

**Retrieval (`packages/country-data/scripts/fetch-directive.ts`).** `fetchExpression(lang3, knownEtag?)` GETs `http://publications.europa.eu/resource/celex/32023L0970` with `Accept: application/xhtml+xml` and `Accept-Language: <ISO-639-3>`, following redirects. Handle 304 BEFORE any body check and return an `unchanged` result. Require `status === 200` exactly — a 202 sets `res.ok` true and must be rejected explicitly with a message naming the anti-automation gate and pointing at `manual-attest`. Return the body, the `etag`, the `last-modified` and `res.url` as the pinned expression URI. Record the pinned URI as a citation only — always fetch via the CELEX id plus `Accept-Language`, never by computing a manifestation sequence segment, because that segment is a sequence index and is not derivable from the language code.
`extractParagraph(xhtml, article, para)` locates `id="art_N"`, slices forward to the next `class="eli-subdivision"` to form the scope, then locates `id="NNN.PPP"` INSIDE that scope. Scope first, always. Throw a named `SourceDefect` when either id is absent. The citation key is `32023L0970#NNN.PPP` — use the publisher's ids; do not invent a tagging scheme and do not locate an article by searching for its title text.
Store the extracted text RAW (U+00A0 and U+2019 preserved). Export `normaliseForMatch` which maps U+00A0, U+202F and U+2009 to a space, normalises curly quotes to ASCII for matching only, applies NFC normalisation, collapses whitespace runs and trims — used for comparison only, never for storage.

**Verifier (`packages/country-data/src/verifier.ts`).** Export a `Disposition` union: `verified`, `revalidated`, `data_defect`, `source_unreachable`, `attested`. `verifySource(source, response)` implements the assertion order for the `cellar` strategy only in this task, and throws a clearly-named not-implemented error for the other four strategies so plan 02 fills them against a fixed signature: transport error → `source_unreachable`; 304 → `revalidated` with body checks skipped; 4xx → `data_defect`; 5xx → `source_unreachable`; any status other than 200 after those branches → `data_defect`; empty body or body under the strategy byte floor (100000 for `cellar`) → `data_defect`; then normalise, then scope to the `art_N` subtree, then assert the anchor inside that scope, then confirm the language by matching the expected per-locale article subtitle from `id="art_N.tit_1"` because the `Content-Language` response header is empty. A missing anchor produces a `data_defect` whose message includes the 200 characters surrounding the scope start, so a reviewer sees what was there instead.

**Freshness (`packages/country-data/src/freshness.ts`).** `TTL_DAYS` maps `stable` to 365, `volatile` to 90, `pending` to 30, `statistical` to null. `freshnessOf(verifiedAt, volatility, today)` returns `fresh` when elapsed days are strictly below the TTL, and `stale` when elapsed days are greater than or equal to the TTL — the boundary day is stale, not fresh. Return `ageing` when elapsed days are at or above 75 percent of the TTL and still below it. A null `verified_at` is `stale`.

**The one fact (`packages/country-data/data/_directive.json`).** Run the fetch for `eng`, extract `007.004` inside `art_7`, and write a single `Fact` entry keyed `32023L0970#007.004` holding: the raw quotation as `value.text`, `value.citation_key`, `value.article` 7 and `value.paragraph` 4, `status: 'verified'`, `volatility: 'stable'`, `verified_at` set to today, `verified_by: null`, and one `Source` with `kind: 'eu_institution'`, `verification: 'cellar'`, the anchor string `within a reasonable period of time but in any event within two months`, the recorded `etag` and `last_modified`, the resolved pinned expression URI, and `accessed_at`. Write nothing else into this file — the remaining articles and locales are plan 03.

**The fixture and the spine test.** Save the retrieved EN XHTML slice covering at least the `art_7` subtree as `packages/country-data/test/fixtures/cellar-art7-en.xhtml` so the spine test runs offline and deterministically. `packages/country-data/test/spine.test.ts` asserts the whole path in one file: the fixture extracts `007.004` inside `art_7`; the extracted raw text contains U+00A0 between the paragraph number and the first word; an ASCII-spaced form of the anchor matches after `normaliseForMatch` and does NOT match before it; `_directive.json` parses against the `Fact` schema; `verifySource` disposes the stored source `verified` against a synthesised 200 response built from the fixture; and `freshnessOf` returns `fresh` for today and `stale` for a `verified_at` exactly 365 days old.
  </action>
  <acceptance_criteria>
    - `packages/country-data/src/schema.ts` defines `FactStatus` with exactly the five members `verified`, `directive_default`, `directive_fallback`, `pending_verification`, `not_applicable`
    - `packages/country-data/src/schema.ts` defines `SourceVerification` with exactly the five members `cellar`, `html-anchor`, `jsonld`, `metadata-only`, `manual-attest`
    - `packages/country-data/data/_directive.json` parses against the `Fact` schema and its single entry has `status` `verified`, `volatility` `stable`, a non-empty `sources[0].anchor` and a non-null `sources[0].etag`
    - The stored quotation text contains at least one U+00A0 codepoint (the authentic OJ separator), proving the raw form was stored unnormalised
    - `extractParagraph` throws `SourceDefect` when asked for an article id absent from the fixture, and when asked for a paragraph id absent from within the located article's scope
    - `freshnessOf` returns `stale` when elapsed days equal the class TTL exactly, and `fresh` when elapsed days are one lower
    - A `Fact` literal with `status: 'verified'` and `sources: []` fails `safeParse`; a `Fact` literal with `status: 'pending_verification'` and a non-null `value` fails `safeParse`
    - Parsing and re-serialising a `Fact` with three sources returns them in the authored order
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run packages/country-data/test/spine.test.ts</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or the summary line reports fewer than 8 passed assertions (the spine test asserts every layer and a short count means a layer was skipped)</fails_when>
    <automated>gh run list --workflow=legal-data.yml --limit 1 --json conclusion --jq '.[0].conclusion'</automated>
    <fails_when>prints anything other than `success`, or prints nothing (the PR-profile workflow has not run yet — push the branch first)</fails_when>
  </verify>
  <done>One Directive fact travels the full spine — Cellar retrieval, id-scoped extraction, provenance envelope, fail-loud verification, freshness evaluation, offline CI gate — and is committed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Prove the gate bites — a recital-scoped anchor on an allowlisted, live source is rejected</name>
  <files>packages/country-data/test/fixtures/cellar-art7-recital-decoy.xhtml, packages/country-data/test/spine.test.ts, .github/workflows/legal-data.yml</files>
  <read_first>
    - packages/country-data/src/verifier.ts — the assertion order and `Disposition` union authored in task 2
    - packages/country-data/test/spine.test.ts — the existing end-to-end assertions this extends
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "The Verifier" failure mode 2 — the recorded offset-29475 recital collision on the deadline wording, and the Article 10 TFEU collision
    - .planning/phases/01-ground-truth-and-governance/01-RESEARCH.md § "Governance Gates" point 3 — why the fifth bad-PR case exists and what proves the subtree scoping works
  </read_first>
  <behavior>
    - Test 1: a document where the anchor string appears ONLY inside a recital, with a well-formed but anchor-free `art_7` subtree, disposes `data_defect` — not `verified`
    - Test 2: the same document disposes `data_defect` even though the fetch status is 200, the body is far above the byte floor, and the host is on the allowlist — proving none of those three signals alone can green a source
    - Test 3: the rejection message includes the text surrounding the `art_7` scope start, so the reviewer can read what was actually there
    - Test 4: a document with a correct `art_7` subtree but a truncated body under the 100000-byte floor disposes `data_defect`, not `verified`
  </behavior>
  <action>
Write the failing tests first, then make them pass.

Build `packages/country-data/test/fixtures/cellar-art7-recital-decoy.xhtml` by taking the real EN fixture and moving the deadline wording out of `id="007.004"` into a recital paragraph that sits before the first `class="eli-subdivision"` block. The `art_7` subtree must remain structurally valid and must retain `id="007.004"` — the paragraph exists, it simply no longer carries the operative wording. This reproduces the exact failure research found most often: a correct, allowlisted, live source cited for the wrong provision. Keep the fixture above the byte floor so the byte floor cannot be the thing that catches it; only the subtree scoping may catch it.

Extend `spine.test.ts` with the four behaviours above. Assert the disposition value, not just that an error was thrown — a test that accepts any throw would also pass if the verifier crashed for an unrelated reason.

Then wire `.github/workflows/legal-data.yml` as the PR profile: `on: pull_request` and `on: push`, checkout, corepack enable, `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm vitest run --dir packages/country-data`. This job must be OFFLINE — it must not fetch any external source, so a third party's outage can never turn a contributor's pull request red. Network verification belongs to the nightly job, which plan 02 owns.

Record in the plan summary that this task is the tracer's proof-of-teeth, and that the remaining four bad-PR shapes are drilled against real pull requests in plan 05.
  </action>
  <acceptance_criteria>
    - `packages/country-data/test/fixtures/cellar-art7-recital-decoy.xhtml` is larger than 100000 bytes and contains `id="007.004"`
    - The decoy fixture contains the deadline wording exactly once, and that occurrence is at a byte offset lower than the offset of `id="art_7"`
    - `verifySource` against the decoy returns disposition `data_defect`; the test asserts the literal disposition string and not merely that a throw occurred
    - The `data_defect` message produced by the decoy contains a substring of the decoy's own `art_7` scope
    - `.github/workflows/legal-data.yml` contains no `curl`, no `fetch`, and no step that reaches an external host other than the package registry
    - `pnpm vitest run --dir packages/country-data` passes locally and in the `legal-data.yml` run
  </acceptance_criteria>
  <verify>
    <automated>pnpm vitest run --dir packages/country-data</automated>
    <fails_when>non-zero exit, or the summary line reports `0 passed`, or the decoy test name is absent from the reporter output (the case was never registered)</fails_when>
    <automated>node -e "const f=require('fs').readFileSync('packages/country-data/test/fixtures/cellar-art7-recital-decoy.xhtml','utf8');const a=f.indexOf('id=\"art_7\"');const d=f.search(/within a reasonable period of time/);process.stdout.write(String(d>=0&&a>=0&&d<a))"</automated>
    <fails_when>prints `false` (the decoy's anchor is not positioned before the art_7 subtree, so the fixture does not reproduce the recital collision), or the command exits non-zero because a file is missing</fails_when>
  </verify>
  <done>A correct, allowlisted, live, above-floor source cited for the wrong provision is rejected by the verifier and turns the PR-profile CI job red.</done>
</task>

</tasks>

<artifacts_this_phase_produces>
## Artifacts this phase produces

Every symbol below is created by Phase 1 and does not exist anywhere in the repository beforehand.
The repo is greenfield: only `.claude/CLAUDE.md`, `jafn-project-brief.md` and `.planning/**` are
tracked at the start of this phase.

**Repository scaffolding (plan 01)**
`package.json`, `pnpm-workspace.yaml` (with a `catalog:` block), `.npmrc`, `.gitignore`,
`tsconfig.base.json`, `vitest.config.ts`, `README.md`, `packages/country-data/package.json`
(`@jafn/country-data`), `packages/country-data/tsconfig.json`.

**Types and schema symbols (plan 01, extended in plan 04)**
`IsoDate`, `SourceKind`, `SourceVerification`, `Source`, `FactStatus`, `Volatility`, `Fact`,
`CountryRecord`, `TranspositionStatus`, `LegalBasis`, `Art12_3Position`, `EqualityBody`,
`DiscoveryHint`, `Provenance`, `ResolvedFact`.

**Functions (plans 01–04)**
`fetchExpression`, `extractParagraph`, `extractArticle`, `normaliseForMatch`, `verifySource`,
`SourceDefect`, `Disposition`, `TTL_DAYS`, `freshnessOf`, `resolve`, `seedFromNim`,
`dedupeNimRows`, `nullSentinel`, `isAllowlisted`, `strategyFor`.

**Data files (plans 01, 03, 04)**
`packages/country-data/data/_directive.json`, and 27 country records
`packages/country-data/data/{AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE}.json`,
plus `packages/country-data/country.schema.json` (emitted, committed),
`packages/country-data/data/allowlist.json`.

**Engine contracts, data only, no engine code (plans 06–07)**
`MetricValue`, `Conventions`, `ConventionSource`, `EngineReport`, `Art10Flag`, `PublishableSets`,
`EngineWarning`, `ShareUrlContract`, `ShareBucket`, `roundGapPct`, `bucketLifetime`,
`SHARE_CONTRACT_VERSION`; `packages/directive-engine/vectors/*/input.json`,
`.../conventions.json`, `.../expected.json`, `.../rederived.json`;
`packages/directive-engine/docs/CONVENTIONS.md`, `packages/directive-engine/docs/ENGINE-REPORT.md`,
`docs/share-url-contract.md`.

**CI workflow job names (plans 01, 02, 05)**
`.github/workflows/cellar-reachability.yml` job `cellar-reachable`;
`.github/workflows/legal-data.yml` jobs `schema-and-lint`, `offline-suite`, `freshness-gate`;
`.github/workflows/nightly.yml` jobs `live-sources`, `directive-drift`.

**npm script names (plan 01, implemented in 02–06)**
`test`, `typecheck`, `fetch:directive`, `seed:nim`, `verify:sources`, `validate:country-data`,
`rederive:vectors`.

**Governance documents (plan 05)**
`.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/legal-data.yml`
lint steps `L1`–`L8`, `CONTRIBUTING.md`, `REPORTING-LEGAL-ERRORS.md`, `CHANGELOG-legal.md`,
`SECURITY.md`, `proposed/README.md`, `docs/POLISH-UPL-GATE.md`, `docs/BAD-PR-DRILL.md`.
</artifacts_this_phase_produces>

<source_audit>
## Multi-Source Coverage Audit

```
SOURCE    | ID       | Feature / Requirement / Decision                                   | Plan     | Status  | Notes
--------- | -------- | ------------------------------------------------------------------ | -------- | ------- | -----
GOAL      | —        | Every fact verified against a primary source                       | 01,03,04 | COVERED |
GOAL      | —        | Every expensive-to-change decision recorded as data                 | 06,07    | COVERED |
GOAL      | SC-1     | Articles 3,6,7,9,10,12 quoted from primary text, stored with data   | 01,03    | COVERED | 01 does Art.7(4); 03 does all six x all served locales
GOAL      | SC-2     | 27 files, each field sourced+dated or "pending verification"        | 04       | COVERED |
GOAL      | SC-3     | Bad contributor PR rejected before merge; drilled before public     | 02,05    | COVERED | 02 builds the gates, 05 drills five PR shapes
GOAL      | SC-4     | Build fails on stale facts, window varies by volatility             | 01,04,05 | COVERED | reworded per D-10; 01 owns the TTL table
GOAL      | SC-5     | Golden vectors + frozen EngineReport + share-URL contract as data   | 06,07    | COVERED |
REQ       | LEGAL-01 | Source URL + verified_at, or "pending verification"                | 01,04    | COVERED |
REQ       | LEGAL-02 | 27 states with transposition status                                 | 04       | COVERED |
REQ       | LEGAL-03 | Legal basis: national where verified, else Directive                | 04       | COVERED |
REQ       | LEGAL-04 | Two-month backstop wording                                          | 01,03,04 | COVERED |
REQ       | LEGAL-05 | Art. 12(3) position per state                                       | 04       | COVERED | reworded: a condition, not a route
REQ       | LEGAL-06 | Equality body + anti-retaliation provision                          | 04       | COVERED | stays pending_verification where no primary source found
REQ       | LEGAL-07 | Articles 3,6,7,9,10,12 re-verified against primary text             | 03       | COVERED |
REQ       | LEGAL-08 | Build fails on stale facts                                          | 04,05    | COVERED | reworded per D-10 in plan 04
REQ       | LEGAL-09 | Verifier asserts non-empty body + anchor, not merely 200            | 01,02    | COVERED |
REQ       | LEGAL-10 | Contributor PR gated by schema validation + source checking         | 02,05    | COVERED |
REQ       | ENG-01   | Golden vectors + frozen EngineReport as data before code            | 06,07    | COVERED |
REQ       | ENG-06   | Every calculation convention documented                             | 06       | COVERED |
REQ       | GAP-06   | Transmitted URL carries only derived, rounded, non-identifying vals | 06       | COVERED |
RESEARCH  | —        | Cellar REST as retrieval layer; SPARQL for one-off discovery only   | 01,04    | COVERED |
RESEARCH  | —        | Exclude eur-lex web front end from every allowlist                  | 02,05    | COVERED |
RESEARCH  | —        | Per-source verification strategy table incl. manual-attest          | 01,02    | COVERED |
RESEARCH  | —        | Six reproduced verifier failure modes as committed fixtures         | 01,02    | COVERED |
RESEARCH  | —        | Extract by publisher ids art_N / NNN.NNN, never by string search    | 01,03    | COVERED |
RESEARCH  | —        | NIM register as discovery index, never as the answer                | 04       | COVERED |
RESEARCH  | —        | Cellar null sentinels 1001-01-01 and $BUILD_INFO$ map to null       | 04       | COVERED |
RESEARCH  | —        | Fact envelope amendments A, B, C, D                                 | 01       | COVERED |
RESEARCH  | —        | Freshness TTL table by volatility class                             | 01,04    | COVERED |
RESEARCH  | —        | ETag-keyed CI cache as the D-02 outage mitigation                   | 02       | COVERED |
RESEARCH  | —        | Fifth bad-PR case: right source, wrong provision                    | 01,05    | COVERED | 01 proves the mechanism, 05 drills the PR
RESEARCH  | —        | zod pinned 4.5.4, vitest pinned 4.1.11                              | 01       | COVERED |
RESEARCH  | —        | Emit and commit country.schema.json for lawyer contributors         | 04       | COVERED |
RESEARCH  | —        | EngineReport minimum shape incl. conventionSource                   | 06       | COVERED |
RESEARCH  | —        | Share-URL contract: 7 required elements incl. k-anonymity floor     | 06       | COVERED |
RESEARCH  | OQ-4     | Polish UPL position recorded as a written Phase 5 gate              | 05       | COVERED |
CONTEXT   | D-01     | Cellar REST/SPARQL, with the CI-reachability conditional            | 01       | COVERED |
CONTEXT   | D-02     | Fetch live at build time, no committed snapshot                     | 01,02    | COVERED | outage mitigated by ETag cache in 02
CONTEXT   | D-03     | EN plus every served locale                                         | 03       | COVERED |
CONTEXT   | D-04     | Full article stored, operative sentences tagged by id               | 03       | COVERED |
CONTEXT   | D-05     | Launch set deep, remaining 22 structurally seeded                   | 04       | COVERED |
CONTEXT   | D-06     | Agent proposes, human confirms                                      | 04,05    | COVERED |
CONTEXT   | D-07     | Directive-only fallback, explicitly labelled                        | 01,04    | COVERED |
CONTEXT   | D-08     | Polish UPL recorded as a blocking Phase 5 gate                      | 05       | COVERED |
CONTEXT   | D-09     | Data defect vs transport failure, with recorded override            | 02       | COVERED |
CONTEXT   | D-10     | Staleness degrades UI; build fails only for launch countries        | 04       | COVERED |
CONTEXT   | D-11     | Additive-by-default via proposed/                                   | 05       | COVERED |
CONTEXT   | D-12     | Repo public at phase close, after the bad-PR drill                  | 05       | COVERED |
CONTEXT   | D-13     | Hand-computed then independently re-derived vectors                 | 06,07    | COVERED |
CONTEXT   | D-14     | Documented default, explicit override, convention echoed in report  | 06       | COVERED |
CONTEXT   | D-15     | Share URL transmits wide buckets only, previewed before Share       | 06       | COVERED |
CONTEXT   | D-16     | EngineReport frozen with a recorded amendment path                  | 06       | COVERED |
```

All rows COVERED. CONTEXT.md `## Deferred Ideas` are excluded from the audit by rule, with one
exception folded in deliberately: the deferred legal-error reporting channel and public correction
log, which CONTEXT.md says "belong with the governance work in this phase and the planner should
fold them in" — plan 05 covers them.
</source_audit>

<probe_coverage>
## Edge-probe coverage ledger (32 applicable edges, zero silent drops)

No SPEC supplied an `## Edge Coverage` section, so the deterministic edge probe's 32 proposed edges are
resolved here and authored into `must_haves` across the plan set. Each row names the plan whose
`must_haves.truths` carries its predicate. `explicit` rows are plain strings; `backstop` rows are
structured flat-scalar markers that abstain to human review at verify time when the verifier cannot
confirm them with explicit evidence; `unresolved` rows are surfaced as flagged planner assumptions in
the owning plan's `<flagged_assumptions>` block and are never auto-resolved.

| Requirement | Edge | Resolution | Verification | Owning plan |
|---|---|---|---|---|
| LEGAL-01 | adjacency | resolved | explicit | 01-01 |
| LEGAL-01 | empty | resolved | explicit | 01-01 |
| LEGAL-01 | ordering | resolved | explicit | 01-01 |
| LEGAL-02 | adjacency | resolved | explicit | 01-04 |
| LEGAL-02 | empty | resolved | explicit | 01-04 |
| LEGAL-02 | ordering | resolved | explicit | 01-04 |
| LEGAL-03 | adjacency | resolved | explicit | 01-04 |
| LEGAL-03 | empty | resolved | explicit | 01-04 |
| LEGAL-03 | ordering | resolved | explicit | 01-04 |
| LEGAL-04 | adjacency | resolved | explicit | 01-04 |
| LEGAL-04 | empty | resolved | explicit | 01-04 |
| LEGAL-04 | ordering | resolved | **backstop** | 01-04 |
| LEGAL-05 | adjacency | resolved | explicit | 01-04 |
| LEGAL-05 | empty | resolved | explicit | 01-04 |
| LEGAL-05 | ordering | resolved | explicit | 01-04 |
| LEGAL-05 | concurrency | resolved | explicit | 01-04 |
| LEGAL-06 | adjacency | resolved | **backstop** | 01-04 |
| LEGAL-06 | empty | resolved | explicit | 01-04 |
| LEGAL-06 | encoding | resolved | explicit | 01-04 |
| LEGAL-06 | ordering | resolved | **backstop** | 01-04 |
| LEGAL-07 | empty | resolved | explicit | 01-03 |
| LEGAL-07 | encoding | resolved | explicit | 01-03 |
| LEGAL-08 | unclassified | **unresolved** | — | 01-04 `<flagged_assumptions>` |
| LEGAL-09 | empty | resolved | explicit | 01-02 |
| LEGAL-09 | encoding | resolved | explicit | 01-02 |
| LEGAL-10 | concurrency | resolved | explicit | 01-05 |
| GAP-06 | boundary | resolved | explicit | 01-06 |
| GAP-06 | precision | resolved | explicit | 01-06 |
| ENG-01 | unclassified | **unresolved** | — | 01-06 `<flagged_assumptions>` |
| ENG-06 | adjacency | resolved | explicit | 01-06 |
| ENG-06 | empty | resolved | explicit | 01-06 |
| ENG-06 | ordering | resolved | explicit | 01-06 |

**Counts:** 32 applicable = 27 explicit + 3 backstop + 2 unresolved-and-flagged. Nothing dismissed,
nothing dropped.

The two edges the planning brief singled out as unusually load-bearing were given real answers rather
than backstops. The LEGAL-06 and LEGAL-07 **encoding** question — whose definition of equality applies
to a stored quotation — is answered in both directions: the stored form is raw bytes and compares by
byte equality against a re-fetch, while comparison against a hand-typed anchor is NFC-normalised with
the non-breaking space folded, which is the difference between a verifier that works and one that fails
on every correct document. The GAP-06 **precision** question is answered by a single shared rounding and
bucketing implementation with the tie direction stated numerically, so the card cannot contradict the
page.

## Prohibition-probe recall (descriptor-less, flagged-unverified)

The two-stage recall-then-precision protocol was run in-prompt over the thirteen phase requirements.
Stage 1 over-produced roughly ten candidates per requirement; stage 2 dropped the routine-engineering
items (owned by the edge probe or by ordinary review) and kept the values, safety, transparency and
privacy items. Eight bespoke prohibitions survived and are authored into the owning plans'
`must_haves.prohibitions` blocks, descriptor-less so each disposes flagged-unverified:

| # | Prohibition (abbreviated) | Category | Owning plans |
|---|---|---|---|
| P1 | No invented statute, deadline, authority or citation — unknown is null plus pending verification | safety | 01-01, 01-04 |
| P2 | The EUR-Lex web front-end host is on no allowlist and backs no machine-verified fact | safety | 01-02, 01-05 |
| P3 | No green disposition on evidence the verifier did not read | transparency | 01-01, 01-02 |
| P4 | No conflation of Art. 6 with Art. 7, or of the Art. 7(2) standing right with the Art. 12(3) condition; no annual cap and no numeric threshold restated as Directive rules | safety | 01-03, 01-04, 01-06 |
| P5 | No agent, script or contributor merge may flip a launch-country legally-operative field to verified | safety | 01-04, 01-05 |
| P6 | No country, sector, seniority, age or salary value in the transmitted part of a share URL | privacy | 01-06 |
| P7 | No silently defaulted calculation convention; the report always echoes which convention produced the number | transparency | 01-06, 01-07 |
| P8 | No `verified_at` advancing in a change that alters no value | transparency | 01-05 |

**Canon-referral breadcrumbs — recalled, not minted.** Server-side request forgery from the CI fetcher,
prototype pollution, path traversal, injection and GDPR retention are canon security and compliance
concerns owned by `/gsd-secure-phase` and by lint tooling; they are covered in each plan's
`<threat_model>` register and are deliberately not minted as prohibitions.

**Dismissed with reason — recorded, not silently dropped.** Four project-wide prohibitions from
`.claude/CLAUDE.md` do not bite in this phase because the surfaces they guard do not exist yet; the
dismissals and their reasons are in `<assumption_delta_decision>` above, and each re-arms in the phase
that creates its surface.
</probe_coverage>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Cellar HTTP response → extractor | Untrusted remote bytes enter a string-slicing extractor at build time and become a stored legal quotation |
| GitHub Actions runner → external network | The only outbound network path in this phase; a compromised or spoofed response becomes committed legal text |
| npm registry → local toolchain | Three dev-only packages enter the provenance-critical path |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-1-01 | Tampering | `verifySource` in `packages/country-data/src/verifier.ts` | high | mitigate | Nine-step assertion order with an exact `status === 200` check after the 304 branch, a 100000-byte floor, subtree scoping before anchor assertion, and a language confirmation from `art_N.tit_1` because `Content-Language` is empty. Task 3 proves a recital-scoped anchor is rejected. |
| T-1-04 | Spoofing | Cellar retrieval in `fetch-directive.ts` | medium | accept | The canonical Cellar resource URI is served over http and content-negotiated; forbidding http would block the project's only primary source. Risk is bounded because the response is recorded with its `ETag` and `Last-Modified` and re-verified nightly (plan 02), so a substituted body surfaces as a drift review task. Accepted at ASVS L1 for a build-time, secret-free, read-only fetch. |
| T-1-05 | Denial of service | Extractor parsing a very large remote body | low | mitigate | The extractor is string-slicing with `indexOf`, never a DOM, never `eval`, and never a regex over the whole body; cap the accepted body at 5 MB and reject above it as a data defect. |
| T-1-06 | Elevation of privilege | The private GitHub repository created in task 1 | medium | mitigate | Repository is created PRIVATE. Public visibility is a separate, gated step in plan 05 after the bad-PR drill (D-12). No secrets are added to the repository in this phase — Cellar requires no API key. |
| T-1-SC | Tampering | npm installs (`zod`, `vitest`, `typescript`) | high | mitigate | The research `## Package Legitimacy Audit` table is present and all three packages carry verdict OK at the pinned versions. `zod@4.6.2` returned SUS with reason too-new and is explicitly NOT installed; `zod@4.5.4` is the audited disposition. `enable-pre-post-scripts=false` blocks lifecycle scripts, and the lockfile is committed. No `[ASSUMED]` or `[SUS]` package is installed, so no blocking-human legitimacy checkpoint is required. |
</threat_model>

<verification>
- `gh run list --workflow=cellar-reachability.yml --limit 1 --json conclusion --jq '.[0].conclusion'` prints `success`, with the ETag and pinned expression URI visible in the run log
- `pnpm typecheck` exits zero
- `pnpm vitest run --dir packages/country-data` exits zero with the spine and decoy cases both present in the reporter output
- `packages/country-data/data/_directive.json` parses against the `Fact` schema and holds exactly one entry
- `.github/workflows/legal-data.yml` performs no external fetch
</verification>

<success_criteria>
1. D-01's conditional is discharged with CI evidence, or the plan halted and returned the decision to the user — never silently substituted.
2. One Directive fact exists end to end: retrieved by CELEX content negotiation, extracted by the publisher's own ids, stored with full provenance, verified, freshness-evaluated, and gated in CI.
3. A correct, allowlisted, live, above-floor source cited for the wrong provision is rejected.
4. `FactStatus` and `SourceVerification` are frozen at five members each, with `directive_fallback` and `manual-attest` present as first-class states.
</success_criteria>

<output>
Create `.planning/phases/01-ground-truth-and-governance/01-01-SUMMARY.md` when done.
Record in it: the resolved pinned expression URI, the recorded `ETag`, the GitHub Actions run URL that
discharged D-01, and the placeholder repository name so plan 05 can gate the rename.
</output>
</content>
</invoke>
