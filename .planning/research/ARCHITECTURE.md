# Architecture Research

**Domain:** Static, client-side, privacy-first EU compliance toolkit (Astro 5 monorepo + publishable compliance engine)
**Researched:** 2026-09-10
**Confidence:** MEDIUM (vendor docs read directly; see Sources note on tiering)

> **Headline finding.** The proposed monorepo shape is broadly right, but two things in the brief
> do not survive contact with the evidence:
>
> 1. **The OG share card as specified breaks the zero-egress claim.** Putting salary inputs in a
>    URL query string sends them to Cloudflare's HTTP logs *and* to Slack's, LinkedIn's, Meta's and
>    X's crawlers, *and* renders them in plain text in every group chat the link is pasted into.
>    See [The share-card question, answered](#the-share-card-question-answered-directly).
> 2. **A satori + resvg-wasm Worker does not fit the Cloudflare free plan.** Free-plan Workers get
>    10 ms CPU per HTTP request; a 1200×630 satori render is orders of magnitude above that. The
>    recommended fix (build-time bucketed cards) happens to also solve (1).
>
> Everything else below is structure in service of one testable invariant: **no byte a user typed
> ever appears in an outbound request.**

---

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│  BUILD TIME  (GitHub Actions → Cloudflare Pages build)                     │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ country-data │  │   letters    │  │ adapters-*│  │ directive-engine │  │
│  │  27 × JSON   │  │  templates   │  │   (MIT)   │  │  (MIT, 0 deps)   │  │
│  │  + Zod schema│  │  (country ×  │  │           │  │                  │  │
│  │  + validator │  │   language)  │  │           │  │  golden vectors  │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  └────────┬─────────┘  │
│         │  validate + freshness gates      │                 │            │
│         └────────────┬───────────┬─────────┴─────────────────┘            │
│                      ▼           ▼                                        │
│              ┌───────────────────────────┐   ┌────────────────────────┐   │
│              │  Astro build (apps/web)   │──▶│ static OG card set     │   │
│              │  27 × N-locale pages,     │   │ locale × country ×     │   │
│              │  islands, catalogues      │   │ bucket → .png          │   │
│              └───────────┬───────────────┘   └────────────────────────┘   │
└──────────────────────────┼────────────────────────────────────────────────┘
                           │ deploy (immutable assets)
╔══════════════════════════▼════════════════════════════════════════════════╗
║              ══════ NETWORK BOUNDARY ══════                               ║
║   Everything above is public, pre-computed, contains no user data.        ║
║   Everything below runs on the user's device. Nothing crosses upward.     ║
╚══════════════════════════┬════════════════════════════════════════════════╝
                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  BROWSER  (Cloudflare Pages serves static HTML/JS/PNG; no origin logic)    │
├───────────────────────────────────────────────────────────────────────────┤
│  MAIN THREAD                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────────────────┐  │
│  │ Module A  │ │ Module B  │ │ Module C  │ │ Module D (shell only)    │  │
│  │ letter    │ │ career    │ │ range-o-  │ │ file picker → Worker     │  │
│  │ generator │ │ gap calc  │ │ meter     │ │ report render ← Worker   │  │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───────────┬──────────────┘  │
│        │             │             │                   │                  │
│        │  in-memory React state · location.hash · opt-in localStorage     │
│        │             │             │                   │ postMessage      │
│  ──────┼─────────────┼─────────────┼───────────────────┼────────────────  │
│  WEB WORKER  (served with `Content-Security-Policy: default-src 'none'`)  │
│  ┌─────▼─────────────▼─────────────▼───────────────────▼───────────────┐  │
│  │  payroll.worker.ts                                                   │  │
│  │  File → stream parse (papaparse / SheetJS) → normalise →             │  │
│  │  directive-engine.computeArticle9() → EngineReport (few KB)          │  │
│  │  Raw payroll rows NEVER leave this scope.                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  EGRESS ALLOWLIST (enforced by CSP, verified by the egress oracle test):  │
│    · GET  self-origin static assets                                       │
│    · POST cloudflareinsights.com  — counts only, no payload               │
│    · (nothing else — `form-action 'none'`, `connect-src` pinned)          │
└───────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Must NOT |
|-----------|----------------|----------|
| `directive-engine` | Article 9 metrics, Article 10 threshold, small-group suppression. Pure arithmetic over normalised rows. Emits numbers + enum codes. | Import `country-data`. Contain a user-facing string. Know a country exists. Have a runtime dependency. |
| `country-data` | The 27 national legal-fact records + Directive defaults + Zod schema + `resolve()` + the validator CLI. Facts and proper nouns only. | Contain explanatory prose. Contain letter text. Depend on the engine. |
| `letters` | Article 7 letter templates keyed `(country, language)`, snapshot-tested, native-speaker reviewed. | Contain legal facts (it interpolates them from `country-data`). Fall back across countries. |
| `adapter-kit` | The `CountryAdapter` contract, the static registry, and the conformance test suite. | Contain any national logic. |
| `adapters-*` | Map an `EngineReport` to one national reporting template. Pure, deterministic. | Touch raw payroll rows. Fetch. Read the clock. |
| `apps/web` | Astro site, i18n catalogues, React islands, exports, the Worker harness, the CSP, the egress oracle. | Be depended on by anything. |
| `og-cards` (build step) | Pre-render the finite set of share cards as static PNGs. | Accept user input at runtime. |

---

## 1. Package Boundaries

### The dependency DAG (this *is* the licence boundary)

```
                    directive-engine        ← MIT · zero runtime deps · zero inbound edges
                       ▲          ▲
              (types)  │          │ (types: EngineReport)
                       │      adapter-kit   ← MIT · zero runtime deps
                       │          ▲
                       │      adapters-*    ← MIT
        country-data ──┘          ▲            (reads country-data.reporting via context)
             ▲   ▲                │
             │   └── letters ─────┤         ← MIT (types + facts only)
             │           ▲        │
             └───────────┴────────┴──── apps/web   ← AGPL-3.0 · sink node
```

**The one rule, and it is mechanically checkable:**

> An edge may only point from a *less* permissive package to a *more* permissive one.
> `apps/web (AGPL) → letters (MIT)` is legal. Any edge into `apps/web` is a build failure.

Because AGPL obligations flow to works that *include* AGPL code, and `directive-engine` has zero
inbound edges in the graph, it is structurally impossible for AGPL code to end up inside the npm
tarball. The licence boundary is not a policy document — it is a topological property of the graph,
and a lint rule can assert it.

### Verdict on the proposed split

**Keep the proposed four-package split. Add one package. Do not split `country-data`.**

| Question | Verdict | Why |
|----------|---------|-----|
| Split `country-data` into legal-status vs letters? | **Already split — keep it that way.** `letters` is prose; `country-data` is facts. | They have different *contributors* (a Lithuanian lawyer vs a Lithuanian native speaker), different *review gates* (source verification vs register/tone HITL), different *test styles* (schema + freshness lint vs snapshot), and different *change cadence*. Merging them would force one review process onto two unlike artefacts. |
| Split `country-data` into legal-status vs reporting-template facts? | **No — same package, separate top-level blocks.** | The unit of *verification* and the unit of *contribution* is the country, not the concern. A PR saying "Greece: Law 5316 published 6 Jul 2026" should touch exactly one file, reviewed by one person with Greek legal knowledge. Splitting by concern makes every country update a two-file PR across two review queues. Use `transposition` / `article_7` / `enforcement` / `reporting` blocks inside one file instead. |
| One file per country, or one big `countries.json`? | **One file per country. Non-negotiable.** | 27 parallel community PRs against one file is a permanent merge-conflict machine. Per-file also gives free `CODEOWNERS` routing per country. Astro's `glob()` loader handles a directory of JSON natively. |
| Add a package? | **Yes: `packages/adapter-kit`.** | The plugin contract must not live inside the engine (it would drag reporting concerns into the MIT lead magnet) nor inside `apps/web` (adapters would then be AGPL-tainted and unpublishable). It needs its own MIT, zero-dep home, and it carries the conformance suite that gates community PRs. |

### Why `directive-engine` must not import `country-data`

This is the boundary most likely to be violated under time pressure, and the most expensive to undo.

The engine takes *parameters*, not a country:

```ts
// packages/directive-engine/src/index.ts — MIT, zero deps
export const DIRECTIVE_DEFAULTS = {
  thresholdPct: 5,        // Art. 10
  minGroupSizePerSex: 6,  // small-group suppression
} as const;

export interface Article9Options {
  thresholdPct?: number;
  minGroupSizePerSex?: number;
}

export function computeArticle9(rows: PayrollRow[], opts?: Article9Options): EngineReport;
```

`apps/web` reads a national override out of `country-data` and passes it in. Three consequences:

- The npm package versions on *its own* cadence. Legal facts change monthly; the maths does not.
  A coupled engine would need a release every time an equality body renames itself.
- The engine can be adopted by beqom, Syndio or a random HR consultancy without inheriting your
  legal-data maintenance liability — which is exactly what makes it a lead magnet rather than a
  liability.
- If your legal data is wrong, you have shipped a bug in *the app*, not in a package other people
  depend on. That containment matters a great deal for a project whose entire trust position is
  "every legal statement carries a source".

### Keeping the licence boundary honest in one repo

Five mechanisms, in increasing order of strength:

1. **Per-package `LICENSE` + SPDX `license` field.** Root `LICENSE` is `AGPL-3.0-only`; a root
   `LICENSING.md` states the per-directory map explicitly. Necessary, weakest.
2. **Data licensed separately from code.** Legal facts are not copyrightable, but a *compilation*
   of them can attract the EU sui generis database right (Directive 96/9/EC). Publish
   `packages/country-data/data/**` under **CC0-1.0** (or CC-BY-4.0 if attribution matters to you)
   and the loader/schema code under MIT, declared in a `LICENSE-DATA` file. This removes any doubt
   that a journalist or union can reuse the table — which is a stated goal.
3. **Graph lint in CI.** `dependency-cruiser` (or `eslint-plugin-boundaries`) with a rule set
   derived from the SPDX ids: a package whose `license` is `MIT` may not resolve an import to a
   package whose `license` is not in the permissive allowlist. Fails the PR.
4. **A zero-deps assertion test.** `packages/directive-engine/test/no-deps.test.ts` reads its own
   `package.json` and asserts `dependencies` and `peerDependencies` are empty objects. Cheap,
   catches the accidental `npm i lodash`.
5. **The tarball smoke test — the strongest guarantee.** In CI: `npm pack` the engine, extract the
   tarball into a clean temp directory with an empty `node_modules`, `tsc` it, and run the golden
   vectors against it. If the tarball builds and passes standalone, it provably contains no code
   from anywhere else in the repo. Run the same test for `adapter-kit` and each `adapters-*`.
   Combine with a `files` allowlist in `package.json` so nothing is shipped by accident.

Mechanism 5 is the one to write first. It converts "we are careful about imports" into a fact the
build asserts every time.

---

## 2. The `country-data` Schema

### The central idea: every legal fact is an envelope, not a value

The requirement "unknown values must render as *pending verification* rather than a guess" cannot
be met by a UI convention — someone will forget. It has to be impossible to express a value without
its provenance. So no field in a country file is a bare scalar. Every one is a `Fact<T>`:

```ts
// packages/country-data/src/schema.ts
import { z } from 'zod';

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SourceKind = z.enum([
  'official_journal',  // Dziennik Ustaw, Gazzetta Ufficiale — tier 1
  'legislature',       // parliament bill tracker — tier 1
  'ministry',          // ministry / government portal — tier 1
  'equality_body',     // national equality body — tier 1
  'eu_institution',    // EUR-Lex, Commission, Eurostat, EIGE — tier 1
  'law_firm',          // Littler, iusLaboris, Morgan Lewis — tier 2
  'press',             // trade press — tier 2
]);

export const Source = z.object({
  url: z.string().url().startsWith('https://'),
  title: z.string().min(3),
  publisher: z.string().min(2),
  kind: SourceKind,
  language: z.string(),            // BCP-47, e.g. "pl", "en"
  published_at: IsoDate.optional(),
  accessed_at: IsoDate,
  archive_url: z.string().url().optional(),   // web.archive.org snapshot
});

export const FactStatus = z.enum([
  'verified',            // value is real, sourced, dated
  'directive_default',   // no national deviation found → Directive 2023/970 applies
  'pending_verification',// we do not know → UI must say so, value MUST be null
  'not_applicable',      // structurally absent in this state (e.g. no works councils)
]);

export const Fact = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    value: inner.nullable(),
    status: FactStatus,
    sources: z.array(Source).default([]),
    verified_at: IsoDate.nullable().default(null),
    note_key: z.string().optional(),   // i18n key, NOT prose
  }).superRefine((f, ctx) => {
    if (f.status === 'verified') {
      if (f.value === null)        ctx.addIssue({ code: 'custom', message: 'verified fact must have a value' });
      if (f.sources.length === 0)  ctx.addIssue({ code: 'custom', message: 'verified fact must cite ≥1 source' });
      if (!f.verified_at)          ctx.addIssue({ code: 'custom', message: 'verified fact must have verified_at' });
    }
    if (f.status === 'pending_verification' && f.value !== null) {
      ctx.addIssue({ code: 'custom', message: 'pending fact must have value: null — never a guess' });
    }
    if (f.verified_at && f.verified_at > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({ code: 'custom', message: 'verified_at is in the future' });
    }
  });
```

Four properties fall out of this shape for free:

- **Per-field attribution and dates** — the requirement is satisfied structurally, not by discipline.
- **"Pending verification" is unforgeable** — `status: 'pending_verification'` forces `value: null`,
  so a renderer that tries to print the value prints nothing. The type system makes the UI branch.
- **National deviation is explicit** — `directive_default` vs `verified` distinguishes "the Directive's
  two months applies" from "national law independently says two months" from "we haven't checked".
  All three currently collapse to "2 months" in the brief, and they are not the same claim.
- **Evidence tiering** — `SourceKind` lets CI and the UI distinguish "per the Official Journal" from
  "as reported by Littler". Given the seed table is largely law-firm trackers, this matters: the site
  can be honest about which facts are primary-sourced without softening the ones that are.

### The country record

```jsonc
// packages/country-data/data/pl.json
{
  "$schema": "../country.schema.json",
  "schema_version": "1.0.0",

  "country": {
    "code": "PL",
    "name_en": "Poland",
    "official_languages": ["pl"],
    "letter_languages": ["pl", "en"],   // which letter templates must exist
    "currency": "PLN"
  },

  "transposition": {
    "status": {
      "value": "partial",               // in_force | partial | draft | pending | unknown
      "status": "verified",
      "sources": [{
        "url": "https://www.littler.com/...",
        "title": "EU Pay Transparency Directive: transposition tracker",
        "publisher": "Littler", "kind": "law_firm", "language": "en",
        "published_at": "2026-06-15", "accessed_at": "2026-09-10"
      }],
      "verified_at": "2026-09-10"
    },
    "in_force_from":   { "value": null, "status": "pending_verification", "sources": [], "verified_at": null },
    "expected_from":   { "value": null, "status": "pending_verification", "sources": [], "verified_at": null },
    "partial_in_force": {
      "value": [{
        "scope": "recruitment",
        "from": "2025-12-24",
        "summary_key": "pl.partial.recruitment"   // i18n key → catalogue, not prose here
      }],
      "status": "verified",
      "sources": [ /* … */ ],
      "verified_at": "2026-09-10"
    },
    "national_act": {
      "value": {
        "short_title": null,
        "official_title": null,
        "journal_ref": null,             // e.g. "Dz.U. 2026 poz. ____"
        "adopted_at": null,
        "url": null
      },
      "status": "pending_verification", "sources": [], "verified_at": null
    },
    "extension_requested": { "value": false, "status": "verified", "sources": [ /* … */ ], "verified_at": "2026-09-10" }
  },

  "article_7": {
    "legal_basis": {
      "value": { "instrument": "directive", "citation": "Directive (EU) 2023/970", "article": "7",
                 "url": "https://eur-lex.europa.eu/eli/dir/2023/970/oj" },
      "status": "directive_default",
      "sources": [ /* EUR-Lex, kind: eu_institution */ ],
      "verified_at": "2026-09-10"
    },
    "response_deadline": {
      "value": { "amount": 2, "unit": "month", "from": "receipt" },   // unit: day|working_day|month
      "status": "directive_default", "sources": [ /* … */ ], "verified_at": "2026-09-10"
    },
    "request_frequency": {
      "value": { "times": 1, "per": "year" },
      "status": "directive_default", "sources": [ /* … */ ], "verified_at": "2026-09-10"
    },
    "channel": {
      "value": { "direct": true, "works_council": false, "trade_union": false, "mandatory": null },
      "status": "pending_verification", "sources": [], "verified_at": null
    },
    "employer_reminder_duty": { "value": true, "status": "directive_default", "sources": [ /* … */ ], "verified_at": "2026-09-10" },
    "language_requirement":   { "value": null, "status": "pending_verification", "sources": [], "verified_at": null }
  },

  "enforcement": {
    "anti_retaliation": {
      "value": { "citation": "Directive (EU) 2023/970 Art. 24", "summary_key": "antiretaliation.directive_default" },
      "status": "directive_default", "sources": [ /* … */ ], "verified_at": "2026-09-10"
    },
    "burden_of_proof_reversal": { "value": true, "status": "directive_default", "sources": [ /* … */ ], "verified_at": "2026-09-10" },
    "equality_body": {
      "value": {
        "name_local": "Rzecznik Praw Obywatelskich",   // proper noun — rendered verbatim, never translated
        "name_en": "Commissioner for Human Rights",
        "url": "https://bip.brpo.gov.pl/", "complaint_url": null,
        "email": null, "phone": null
      },
      "status": "verified", "sources": [ /* kind: equality_body */ ], "verified_at": "2026-09-10"
    },
    "labour_inspectorate": { "value": null, "status": "pending_verification", "sources": [], "verified_at": null },
    "penalties": {
      "value": { "max_amount": 60000, "currency": "PLN", "basis": "draft", "summary_key": "pl.penalties.draft" },
      "status": "verified", "sources": [ /* … */ ], "verified_at": "2026-09-10"
    }
  },

  "reporting": {
    "thresholds": {
      "value": [
        { "min_employees": 250, "max_employees": null, "frequency": "annual",    "first_report": "2027-06-07", "reference_year_offset": -1 },
        { "min_employees": 150, "max_employees": 249,  "frequency": "triennial", "first_report": "2027-06-07", "reference_year_offset": -1 },
        { "min_employees": 100, "max_employees": 149,  "frequency": "triennial", "first_report": "2031-06-07", "reference_year_offset": -1 }
      ],
      "status": "directive_default", "sources": [ /* … */ ], "verified_at": "2026-09-10"
    },
    "filing_deadline":  { "value": null, "status": "pending_verification", "sources": [], "verified_at": null },
    "filing_authority": { "value": null, "status": "pending_verification", "sources": [], "verified_at": null },
    "template":         { "value": null, "status": "pending_verification", "sources": [], "verified_at": null },
    "adapter_id": null                                 // ← set to "pl" when packages/adapters-pl ships
  },

  "meta": {
    "maintainers": ["@handle"],
    "review_interval_days": 90,
    "last_full_review": "2026-09-10"
  }
}
```

Plus one shared file, `data/_directive.json`, holding the Directive's own defaults in the same
`Fact` shape, so `directive_default` facts resolve against a single sourced record instead of the
string "2 months" being copy-pasted 27 times.

### The `resolve()` function — "two months unless national law says otherwise", in one place

```ts
export type Provenance = 'national' | 'directive_default' | 'unknown';

export function resolve<T>(fact: Fact<T>, fallback: Fact<T>): {
  value: T | null;
  provenance: Provenance;
  deviates: boolean;                  // true when national ≠ Directive → UI highlights it
  sources: Source[];
  verifiedAt: string | null;
  ageDays: number | null;
  freshness: 'fresh' | 'ageing' | 'stale';
}
```

Every renderer calls `resolve()`. Nothing in the UI reads `fact.value` directly. `deviates` is what
drives the "⚠ Poland's deadline is not the Directive's default" callout, and it is computed, never
hand-authored.

### Validation approach — recommendation

**Zod as the single source of truth; emit JSON Schema as a committed build artefact; validate in CI
with a policy-lint layer on top.**

| Option | Verdict |
|--------|---------|
| **Zod** ✅ | Astro's content collections consume Zod natively, so the schema is written once and reused as the Content Layer schema. `z.infer` gives types with no codegen. `superRefine` expresses the cross-field invariants above (value-null-iff-not-verified, sources-required-when-verified, no-future-dates) that raw JSON Schema handles only awkwardly. Keep it a **devDependency** of `country-data`: the package *ships* JSON + generated `.d.ts`, so consumers pay no runtime cost and the zero-dep spirit survives. |
| **JSON Schema (Ajv)** ⚠️ Use as an *output*, not the source | Generate `country.schema.json` via `z.toJSONSchema()` and commit it. Each data file's `$schema` pointer then gives contributors autocomplete and inline red squiggles in VS Code with **no toolchain install** — which is decisive for community PRs from lawyers rather than engineers. Ajv's 7×-faster validation is irrelevant for 27 small files. |
| **TypeBox** ❌ | Its main advantage is emitting real JSON Schema, which the Zod-plus-emit path already delivers. Choosing it would mean a second schema language alongside Astro's Zod collections. ~3M weekly downloads vs Zod's ~20M means a smaller pool of contributors who can read it. |

**The CI gate is two layers, and the second is where the value is.**

`pnpm validate:country-data` runs:

| # | Check | On PR | Nightly | Severity |
|---|-------|:-----:|:-------:|----------|
| S | Zod schema parse for all 27 files | ✔ | ✔ | error |
| L1 | Exactly 27 files, one per ISO-3166-1 alpha-2 EU code, filename matches `country.code` | ✔ | ✔ | error |
| L2 | Every `verified` fact: ≥1 source, `verified_at` set, not in the future | ✔ | ✔ | error |
| L3 | Every `pending_verification` fact: `value === null` | ✔ | ✔ | error |
| L4 | **Anti-hallucination:** any string matching a statute/journal pattern (`\bDz\.?U\.?\b`, `Art\.\s*\d+`, `Law \d{4}`, `\d{4}/\d+/(EU|EC)`) must sit inside a `Fact` with `status: 'verified'` and ≥1 source | ✔ | ✔ | error |
| L5 | Source URLs are `https://`, contain no tracking params (`utm_*`, `fbclid`, …) | ✔ | ✔ | error |
| L6 | Source URLs return 2xx/3xx (HEAD) | ✖ *(flaky/slow)* | ✔ | warn → issue |
| L7 | Letter coverage: every country with `article_7.legal_basis.status !== 'pending_verification'` has an EN template in `packages/letters` | ✔ | ✔ | error |
| L8 | Freshness: `verified_at` age vs `meta.review_interval_days` | warn | **error** | see below |

**On freshness, resist the obvious design.** "Fail the build when a fact is older than N months"
sounds right and is a trap: it means an unrelated typo fix on a Tuesday cannot deploy because
Estonia's verification lapsed on Monday. The site going dark is strictly worse than the site saying
"last verified 7 months ago". So:

- **Staleness is computed at render time**, from `verified_at` vs the build date. A stale fact
  *automatically* degrades in the UI (see §6) with no human action. Correctness is preserved by
  the renderer, not by the gate.
- **The hard gate lives on the nightly scheduled build and on PRs that touch `country-data`.**
  There it fails loudly and opens an issue. On unrelated PRs it is a warning.

That split gives you nagging without brittleness, which is the actual goal.

---

## 3. The Country-Adapter Plugin Interface

Design constraint: a contributor in Lisbon should be able to add Portugal's reporting template by
opening a PR that touches **one new directory and one manifest line**, and be unable to break the
engine, see payroll data, or introduce non-determinism.

```ts
// packages/adapter-kit/src/contract.ts — MIT, zero deps
import type { EngineReport, CountryCode } from './types';

export interface CountryAdapter {
  readonly id: string;                    // 'pl'
  readonly country: CountryCode;          // 'PL'
  readonly version: string;               // semver of THIS adapter
  readonly enginePeer: string;            // semver range of EngineReport it targets, e.g. '^1'
  readonly targets: readonly ReportTarget[];   // 'xlsx' | 'csv' | 'xml' | 'web_form' | 'pdf_annex'

  /** Extra columns the national template needs that the engine does not compute.
   *  The UI reads this to ask for them — the engine is NEVER extended per country. */
  readonly dataRequirements: readonly FieldRequirement[];

  /** Pure predicate. Explains refusal instead of throwing. */
  supports(report: EngineReport): { ok: true } | { ok: false; reasons: string[] };

  /** Pure. Same inputs → byte-identical output. */
  map(report: EngineReport, ctx: AdapterContext): AdapterOutput;
}

export interface AdapterContext {
  readonly countryData: Readonly<CountryRecord['reporting']>;  // filing authority, deadline, template spec
  readonly locale: string;
  readonly now: Date;            // INJECTED — adapters must not call Date.now()
  readonly extras: Readonly<Record<string, Primitive>>;        // answers to dataRequirements
  readonly t: (key: string, vars?: Record<string, Primitive>) => string;
}

export interface AdapterOutput {
  readonly sheets?: readonly TabularSheet[];   // xlsx / csv targets
  readonly xml?: string;
  readonly fields?: Readonly<Record<string, Primitive>>;  // web-form targets
  readonly warnings: readonly AdapterWarning[];
  /** Engine metrics with no slot in the national template.
   *  MUST be non-null. The UI surfaces it so nothing silently disappears. */
  readonly unmapped: readonly string[];
}
```

**Five rules that make community contribution safe:**

1. **Adapters consume `EngineReport`, never `PayrollRow[]`.** This is the load-bearing boundary. It
   means adapter code physically cannot touch personal data, so an adapter PR is reviewable by
   someone who has never seen a payroll file, and an adapter bug can never leak a salary. It also
   means adapter fixtures are safe to commit to a public repo.
2. **Adapters are pure.** No `fetch`, no `fs`, no `Date.now()`, no `Math.random()`. Enforced by an
   ESLint `no-restricted-globals` rule in the adapter workspace *and* by a conformance test that
   runs `map()` twice and asserts deep equality.
3. **Registration is static, never dynamic.** `adapter-kit/src/registry.generated.ts` is codegen'd
   from a workspace scan; adding an adapter means adding a package and re-running codegen. Dynamic
   `import()` of community code at runtime would require loosening the CSP and would put arbitrary
   third-party code inside the page that claims zero egress. That trade is not available to you.
4. **`EngineReport` is versioned** (`{ reportVersion: 1, … }`) and adapters declare `enginePeer`.
   An engine major bump makes adapters fail loudly at build time instead of silently mis-mapping a
   regulatory filing — which is the one failure mode that could genuinely harm a user.
5. **Capability negotiation replaces engine forks.** If Slovakia's template wants headcount by
   contract type, the adapter declares it in `dataRequirements`; the UI collects it; `ctx.extras`
   delivers it. The engine stays 27-country-agnostic forever.

**The conformance suite is the gate.** `adapter-kit/testing` exports golden `EngineReport` fixtures
covering the nasty cases — a category with one sex only, a category under six per sex, zero variable
pay, a negative gap, a single-employee company, non-ASCII category names — so every adapter's test
file is three lines:

```ts
import { runConformance } from '@jafn/adapter-kit/testing';
import { adapter } from '../src';
runConformance(adapter);   // determinism, purity, unmapped-completeness, snapshot of every fixture
```

A PR adding an adapter cannot merge without this passing. `CONTRIBUTING.md` documents exactly this
three-line file, and `adapters-pl` is the reference implementation people copy.

---

## 4. Data Flow, Module by Module

### The invariant, stated testably

> For a sentinel value the user typed, no outbound request may contain it in its URL, headers, or
> body — and the set of outbound request origins must be a subset of the allowlist.

That is a Playwright assertion, not a promise. Build it as the **egress oracle** (see §8), before
the first module ships.

### CSP (`apps/web/public/_headers`)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; worker-src 'self'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'
  Referrer-Policy: no-referrer
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=(), interest-cohort=()

/workers/*
  Content-Security-Policy: default-src 'none'
```

Three notes:

- **`form-action 'none'`** is doing real work here. It structurally forbids any form POST to
  anywhere, which is a machine-checkable expression of the product's headline claim. Nothing in this
  site needs a form submission.
- **`Referrer-Policy: no-referrer`** closes the side channel where a full URL (including whatever is
  in a query string) leaks in the `Referer` header of any outbound subresource — and note that
  Cloudflare Web Analytics collects `Referer` host *and*, via GraphQL, referer path.
- **`/workers/*` with `default-src 'none'`** genuinely prevents the payroll worker from making
  network requests: a dedicated worker's CSP comes from its own script's response headers. This
  converts "the worker doesn't call fetch" from a code-review claim into a browser-enforced one.
  *Confidence: MEDIUM — verify with a spike that Cloudflare Pages `_headers` applies to the worker
  script path and that Chrome/Safari/Firefox all enforce it.*

**One honesty correction to the brief.** PROJECT.md says Cloudflare Web Analytics means "no
third-party origin in the CSP". That is not quite true: the beacon script is served from
`static.cloudflareinsights.com` and posts to `cloudflareinsights.com`. Those are Cloudflare-operated
and cookieless, and the collected dimensions are Country, Host, **Path** (not query string),
Referer, device, browser, OS — no payload. That is a defensible position, but the README should say
"one first-party-operated analytics origin, cookieless, path-only" rather than "no third-party
origin", because a hostile reader will open the network tab and check.

### Module A — Article 7 letter generator

```
[user types name, employer, job title, selections]
        │
        ▼  React island state (in-memory only)
   ┌──────────────────────────────────────────┐
   │ letters.render(country, language, vars)   │  ← template from packages/letters
   │   + resolve(country_data.article_7.*)     │  ← facts baked in at build
   └──────────────┬───────────────────────────┘
                  ▼
   Blob (txt | docx | pdf | ics)  →  URL.createObjectURL  →  <a download>
                  │
                  └─▶ mailto:  (see caveat)
════════════════ NETWORK BOUNDARY — nothing crosses ════════════════
Analytics: count("letter_generated") only. No country, no length, no payload.
```

- **Persistence:** default to nothing. Offer an explicit "remember on this device" toggle backed by
  `localStorage` with a visible "clear" button and a badge showing when a draft is stored. Never
  `sessionStorage`-by-default silently — the user should know.
- **Exports:** all client-side, all lazy-loaded on first click so they cost nothing on the Lighthouse
  run. `docx` for `.docx`; `pdf-lib` with an embedded subsetted font for `.pdf` (**not** an
  html-to-canvas rasteriser — it bloats, it blurs, and it defeats text selection); `.ics` hand-rolled
  in ~40 lines with no dependency.
- **`mailto:` caveat, worth surfacing in the UI.** A `mailto:` link hands the body to the OS default
  handler. If that handler is webmail, the letter body travels to Gmail/Outlook — the user's own
  choice, but not "nothing leaves the browser". Also `mailto:` has a practical ~2000-character URL
  ceiling that a formal letter will exceed. **Recommendation:** make "download + attach" the primary
  action and `mailto:` a secondary one that pre-fills only the *subject and recipient*, with the body
  copied to the clipboard and a one-line note explaining why.

### Module B — Career gap calculator

```
[country, sector, gross pay, years] ── React state ──▶ pure fn ──▶ result
                    │                                              │
                    ▼ (deep-link / restore)                        ▼
            location.hash  ← NEVER sent to a server by any browser
                                                          [Share] (see §4.1)
════════════════ NETWORK BOUNDARY ════════════════
Eurostat figures are baked in at build time as static JSON. Zero runtime fetch.
```

**Use `location.hash`, not `location.search`, for calculator state.** The fragment is never
transmitted in an HTTP request — not to Cloudflare, not to a proxy, not in a `Referer`. It gives you
back/forward, refresh-survival and "send yourself the link" with zero egress. This one-character
difference is the whole ballgame, and it is the reason the share card needs a separate mechanism
(crawlers cannot read a fragment).

### Module C — Range-o-meter

```
[pasted range text] ── React state ──▶ pure parser + scorer ──▶ score + explanation
════════════════ NETWORK BOUNDARY — nothing crosses ════════════════
```

**The "parse a job-ad URL" feature is the one requirement that cannot be built without breaking the
claim.** Fetching an arbitrary URL from the browser requires the portal to send permissive CORS
headers (essentially none do), so the only implementations are a server-side proxy — forbidden — or
a browser extension. Recommendation: **v1 ships paste-only**, and the URL field is either dropped or
replaced with a "paste the ad text" affordance. If a URL path is ever wanted, build it as a
bookmarklet or extension that reads the page the user is already on, which keeps egress at zero and
sidesteps the per-portal ToS review entirely.

### Module D — Payroll CSV/XLSX

```
<input type="file">  ── File handle (no bytes read on main thread) ──┐
                                                                     ▼
╔═══════════════ WEB WORKER  (CSP: default-src 'none') ═══════════════╗
║  file.stream() ──▶ papaparse (chunk) / SheetJS ──▶ normalise rows   ║
║        ──▶ directive-engine.computeArticle9(rows, opts)             ║
║        ──▶ EngineReport  (aggregates only, a few KB)                ║
║  Raw rows are never postMessage'd back. Worker is terminated after. ║
╚═════════════════════════════════════════════════════════════════════╝
                        │ postMessage(EngineReport)
                        ▼
   [report UI]  →  adapters-*.map(report, ctx)  →  xlsx/xml/csv Blob
   [report UI]  →  pdf-lib / JSON.stringify     →  Blob → <a download>
════════════════ NETWORK BOUNDARY — nothing crosses ════════════════
Analytics: count("report_generated"). Not the row count. Not the company size.
```

Post-processing hygiene: `URL.revokeObjectURL` after download, `worker.terminate()` after the report
lands, drop the `File` reference, and offer an explicit "clear" that reloads the island.

### 4.1 The share-card question, answered directly

**Question: is putting the inputs in a URL genuinely consistent with the zero-egress claim?**

**No. It is not.** Not "mostly", not "with caveats" — the mechanism as specified sends a user's
salary to at least five parties, and a compensation analyst auditing your README will find it in
under a minute.

Where the query string actually goes:

| Path | What receives the data | Evidence |
|------|------------------------|----------|
| 1 | **Cloudflare's HTTP request log.** The zone HTTP-requests dataset field `ClientRequestURI` is documented as "URI requested by the client, which includes the full path **and query string** of the requested URL" (`ClientRequestPath` is the query-free variant). Every request to the page *and* to the OG worker is recorded this way. | Cloudflare docs, read directly |
| 2 | **Every social platform the link is pasted into.** Unfurling is server-side: the platform crawler fetches the shared page URL, parses OG tags, then a *second* fetcher (Slack-ImgProxy on Slack) fetches the `og:image` URL. Slack, LinkedIn, Facebook and X all do this. So the salary lands in Slack's, LinkedIn's and Meta's logs. | Search + vendor behaviour docs |
| 3 | **Every recipient's client that auto-previews**, including WhatsApp, which fetches and caches the preview per device. | Same |
| 4 | **Every human who sees the link.** `?pay=8400&years=12` is human-readable. Pasting it in a group chat discloses the salary to the group *even if nobody clicks*. This is the leak the engineering framing usually misses and the one users will actually feel. |
| 5 | **Browser history, sync, and any link-scanning security product** in the recipient's mail or chat stack. |

Signing or encrypting the parameters (Vercel publishes a "Secure URL / encrypting parameters" guide
precisely because unsigned image params are a known problem) fixes *abuse* — it does not fix any of
paths 1–5 for the sharer's own data, because the ciphertext still traverses and is still logged, and
path 4 only improves to "opaque blob".

**Compounding problem:** the dynamic Worker doesn't fit the platform anyway. Cloudflare Workers get
**10 ms CPU per HTTP request on the free plan** (5 min on paid, 30 s default), 128 MB per isolate
covering JS heap *and* WebAssembly. A 1200×630 satori + resvg-wasm render is far above 10 ms. So the
dynamic card forces the Workers Paid plan *and* introduces a per-request cost that scales with
exactly the viral spike you are engineering for.

#### The alternative — and it is better on every axis

**Primary path: render the card on the device, share the *file*.**

```
[result] ─▶ OffscreenCanvas / canvas 1200×630 ─▶ toBlob() ─▶ File
                                                   │
                          navigator.canShare({files}) ? navigator.share({files, text, url})
                                                   : <a download="my-pay-gap.png">
```

The image never touches a network. The `url` field carries a **clean, parameterless** link to the
calculator, so the share is still clickable and attributable. `navigator.share` with files requires
a secure context, transient activation (a real click) and the `web-share` permissions policy; it is
well supported on the mobile browsers that carry viral traffic and degrades to a download elsewhere.
Since the brief's traffic is explicitly mobile-first, this is the right primary.

**Secondary path (for link-shares that must unfurl): build-time bucketed static cards.**

If a preview image is needed when someone pastes a plain link, pre-render a *finite grid* of cards
at build time and address it with a coarse, non-identifying key:

```
/s/{locale}/{country}/{sectorCode}/{band}.png     ← a static PNG, emitted by the build
share URL:  https://…/gap?c=PL&s=J&b=7#pay=8400&yrs=12
                          └────┬────┘  └──────┬──────┘
                    query: coarse, public,   fragment: the real inputs,
                    3 enum values only        NEVER transmitted
```

- `band` is a wide bucket of the headline loss (e.g. 12 bands), never a salary.
- The precise numbers live **after the `#`**, so the crawler and Cloudflare see `c=PL&s=J&b=7` and
  nothing else, while the recipient's browser restores the full result client-side.
- Card count is `locales × 27 × ~10 sectors × 12 bands` — bounded, cacheable forever, immutable,
  and generated by the same satori pipeline at **build** time where the 10 ms CPU limit does not
  apply.
- **The Cloudflare Worker disappears entirely.** No paid plan, no per-request cost, no cold start,
  no abuse surface, no signing scheme, no CPU ceiling under a viral spike. The brief's only
  server-side component is deleted.

**What the claim then becomes — and it is a stronger claim, not a weaker one:**

> Nothing you type ever leaves your device. If you choose to share, you share a picture your own
> browser drew — or a link that says only your country, your sector, and a rough band. Never your
> salary.

That is defensible in a Show HN thread, provable by the egress oracle, and it removes the single
piece of infrastructure that could embarrass the project.

**If the dynamic Worker is kept anyway** (e.g. for precise per-user numbers on the card), the
non-negotiable minimum is: Workers Paid plan; params restricted to a closed enum set validated
server-side; no free-text; `Cache-Control: public, immutable, max-age=31536000`; a documented note
in the privacy policy that share URLs are logged by Cloudflare and by any platform they are pasted
into; and `Referrer-Policy: no-referrer`. Even then, path 4 (humans reading the URL) remains, which
is why it should not be the default.

---

## 5. Where Computation Runs

**The rule is about provenance, not size.**

> Anything derived from a user-supplied **file** runs in a Web Worker, unconditionally.
> Anything derived from a handful of typed **numbers** runs on the main thread.

| Workload | Where | Why |
|----------|-------|-----|
| CSV/XLSX parse (Module D) | **Worker, always** | Not a size decision. You cannot know the size before reading it, so a threshold requires reading the file first — on the main thread — which is the thing you were avoiding. More importantly the Worker is an *audit-surface* reduction: one reviewable file holds all payroll bytes, and its own CSP (`default-src 'none'`) makes egress from that scope browser-enforced. |
| `computeArticle9()` over parsed rows | **Same Worker** | Keeping the rows in the worker means only the ~few-KB `EngineReport` crosses `postMessage`. Moving rows back to the main thread would double memory and put payroll data in the scope that *does* have network access. |
| Adapter `map()` | Main thread | Operates on `EngineReport` only — no personal data, small, synchronous. |
| PDF/XLSX export generation | Worker if the report is large, otherwise main thread | Not privacy-critical (input is already aggregated); decide on measured jank. |
| Module B career-gap maths | **Main thread** | A dozen arithmetic ops. A worker adds startup latency and a message round-trip to something that completes in microseconds, and would make the input feel laggier, not smoother. |
| Module C range parsing | **Main thread** | Regex over a short string. |
| Letter templating (Module A) | **Main thread** | String interpolation. |
| Share-card canvas render | **Worker via `OffscreenCanvas`** if available, else main thread | A 1200×630 raster can take tens of ms; `OffscreenCanvas` keeps the tap responsive. Graceful fallback. |

**For the record, since the question asks for a threshold:** the honest numeric answer is that
~2,000 CSV rows parse in well under one frame, and even 10,000 rows of CSV is not the problem — the
expensive path is XLSX, where ZIP inflation plus SheetJS cell-object construction can reach hundreds
of milliseconds at 10k rows, and where memory, not CPU, is the first wall. Papa Parse's own docs are
explicit that `worker: true` "will keep your page reactive, but may be slightly slower", and that
"streaming is necessary for large files which would otherwise crash the browser" — i.e. worker mode
buys responsiveness and `chunk`/`step` streaming buys a memory ceiling. Use **both**: worker mode
plus chunked streaming, with a progress bar driven by chunk callbacks. Since you need the worker for
the privacy argument regardless, the perf threshold question never has to be answered.

**Do not add Comlink.** The protocol here is four messages (`parse`, `progress`, `result`, `error`).
A hand-rolled ~60-line typed message channel keeps the privacy-critical path dependency-free and
reviewable, which is worth more than the ergonomics.

**Honest caveat:** a Worker is not a sandbox against your own code — it is an audit-surface
reduction plus, with the per-path CSP, a real browser-enforced network block. State it that way in
the README; overstating it is the kind of claim that gets picked apart.

---

## 6. Build-Time vs Runtime

### What is baked in

**All of `country-data`. All of `letters`. All Eurostat figures. All share cards. There is no runtime
data fetch of any kind.**

```ts
// apps/web/src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { CountryRecord } from '@jafn/country-data/schema';   // the same Zod schema CI uses

export const collections = {
  countries: defineCollection({
    loader: glob({ pattern: '*.json', base: '../../packages/country-data/data' }),
    schema: CountryRecord,
  }),
};
```

Astro 5's Content Layer resolves build-time collections at build and persists them; the `glob()`
loader handles a directory of JSON with one entry per file, which matches the one-file-per-country
decision exactly. Using the *same* Zod schema in `content.config.ts` and in the CI validator means a
data file that would break the site cannot merge.

**Payload discipline:** do not ship 27 records to every client. Each `/[locale]/[country]/` page is
prerendered and passes *only its own* record as an island prop. The country switcher gets a separate
build-emitted `/data/countries.index.json` carrying `{code, name, status}` only — ~2 KB.

### How a legal-fact update reaches production

```
contributor edits packages/country-data/data/gr.json
        │
        ▼  PR
CI: Zod parse · L1–L5 · L7 · L8(error, because country-data touched) · letters snapshots
        │
        ▼  merge to main
Cloudflare Pages build hook → astro build → 27 × N pages + card grid → deploy
        │
   ┌────┴─────────────────────────────────────────────────┐
   │ ALSO: GitHub Actions cron, nightly 03:00 UTC          │
   │  · re-run L6 (source URLs still resolve)              │
   │  · re-run L8 as an ERROR → open/refresh an issue      │
   │  · trigger a rebuild so "verified N days ago"         │
   │    counters and staleness chips stay accurate         │
   └───────────────────────────────────────────────────────┘
```

The nightly rebuild is not optional. Without it, a page rendered "verified 12 days ago" stays
frozen at 12 days forever, and the freshness promise quietly becomes a lie.

### How freshness surfaces in the UI

One component, used for every legal statement on the site, with no bypass:

```
Response deadline: 2 months
└─ Directive default (Art. 7(1)) · EUR-Lex · verified 12 days ago        ← fresh
└─ Per national law, Act X Art. 12 · Dziennik Ustaw · verified 4 mo ago  ← ageing (subdued chip)
└─ ⚠ Re-verification due — last checked 7 months ago                      ← stale (amber)
└─ Pending verification — we have not confirmed this for Croatia yet      ← status !== verified
     [Help us verify → opens a GitHub issue template]
```

Rules:

- Rendering goes through `resolve()`; nothing reads `fact.value` directly. An ESLint rule forbids
  member access on `.value` outside `packages/country-data`.
- Staleness is derived at build from `verified_at` vs build date against
  `meta.review_interval_days` (default 90 warn / 180 stale). No stored flag to go out of sync.
- Tier-2-only facts (sources are all `law_firm`/`press`) render "as reported by Littler", never
  "per national law". This is the difference between a reference journalists cite and one they
  correct you on.
- The "Help us verify" affordance turns a gap into a contribution funnel — which is how a
  27-country data set stays alive with one maintainer.

---

## 7. i18n Architecture

**There are four locale surfaces and they should deliberately NOT share one catalogue.**

| Surface | Lives in | Keyed by | Review gate | Why separate |
|---------|----------|----------|-------------|--------------|
| UI strings | `apps/web/src/i18n/{lang}.json` | `lang` | translator | Small, flat, changes with every feature |
| Letter templates | `packages/letters/{country}/{lang}.md` | **`(country, lang)`** | **native-speaker legal-register HITL** | Whole documents, formal register, snapshot-tested, changes only when law changes |
| Country data prose | *nowhere* — only `*_key` i18n keys + tagged proper nouns | — | legal source verification | Facts are language-neutral; this is what lets a locale ship without touching data |
| OG card strings | `packages/og-cards/strings/{lang}.json` | `lang` | translator | The card renderer inlines its own strings *and its own font subset*; it cannot import the app catalogue |

**The `(country, language)` key for letters is the critical one and the brief already implies it
without naming it.** An English letter for Italy must cite *Italian* law. So:

```
resolve(country, lang):
  packages/letters/{country}/{lang}.md
    → fallback: packages/letters/{country}/en.md
    → NEVER:    packages/letters/{otherCountry}/{lang}.md
```

Falling back across countries would produce a Polish-language letter citing Slovak statutes — a
silent, plausible-looking, legally wrong artefact. Make the resolver throw rather than cross that
line, and let L7 in CI guarantee an `en.md` exists for every country whose `article_7.legal_basis`
is not pending.

**Astro supplies routing only.** `i18n.locales`, `i18n.defaultLocale`,
`i18n.routing.prefixDefaultLocale`, `i18n.fallback` + `fallbackType`, and the `astro:i18n` helpers
(`getRelativeLocaleUrl()` and friends) handle URLs. Message catalogues, UI-string translation, date
and currency formatting (use `Intl`), and the language switcher are all yours to build. Budget for
that explicitly — it is a common Astro planning miss.

**Adding a locale touches exactly three things:**

1. `apps/web/src/i18n/{lang}.json` — the catalogue.
2. `astro.config.mjs` — add to `i18n.locales`.
3. Optionally `packages/letters/{country}/{lang}.md` per country you want covered.

**Zero changes to `directive-engine`. Zero changes to `country-data`. Zero changes to adapters.**

That guarantee holds because of one rule, which should be a CI check:

> `directive-engine` and `adapters-*` must not contain a single user-facing string. Every output is
> a number, a boolean, or a stable `SCREAMING_SNAKE` enum code (`ABOVE_THRESHOLD`,
> `SMALL_GROUP_SUPPRESSED`, `INSUFFICIENT_DATA`). Translation happens at the presentation layer.

Two operational notes: catalogue completeness is a CI gate for *shipped* locales (missing key =
error) but a warning for locales listed in `draft_locales`, so a translation can land incrementally
behind a flag. And **fonts are a real card constraint** — Polish, Lithuanian, Czech and Maltese
diacritics need coverage in the subset embedded in the card renderer; satori accepts only
`ttf`/`otf`/`woff` and the practical asset budget is tight, so subset per locale rather than
shipping one universal font.

---

## 8. Suggested Build Order

Ordered by dependency, with the two non-obvious placements called out.

| # | Deliverable | Blocks | Notes |
|---|-------------|--------|-------|
| **0** | **`country-data` schema: `Fact<T>`, `Source`, `resolve()`, `_directive.json`, Zod → JSON Schema emit, validator CLI with L1–L8** | *Everything* | The `Fact` envelope is the decision that is expensive to change later, because it is the shape every renderer, template and test consumes. Build it before any UI. Seed all 27 files immediately — most fields `pending_verification` — so the shape is exercised against reality on day one. |
| **0b** | **Article 9/10 golden vectors + the frozen `EngineReport` type. Data only, no engine code.** | engine, adapters, Module D | **Non-obvious placement #1.** The vectors are hand-computed worked examples signed off by a human. They are simultaneously the spec, the test suite, the README's audit exhibit, and the thing a compensation analyst reviews. They are cheap to write early and they de-risk the entire B2B door. Freezing `EngineReport` here lets adapter work proceed in parallel with engine implementation later. |
| **1** | Monorepo skeleton, pnpm workspaces, per-package licences, the graph lint, the tarball smoke test, **and the egress oracle Playwright harness** | all | **Non-obvious placement #2.** Write the zero-egress test *before there is anything to leak*. A test harness that types a sentinel value, records every request via CDP, and asserts the sentinel appears nowhere and the origin set is a subset of the allowlist — is trivial to write against an empty site and near-impossible to retrofit credibly. Its JSON output *is* the README's privacy proof, generated rather than hand-screenshotted. |
| **2** | Web shell: Astro + Tailwind, i18n routing + catalogues (EN/PL), Content Layer wiring, `<FactSource>` / freshness rendering, the 27 country pages | A, B, C, D | Proves the whole data layer end to end with **no user input at all** — so the first deploy is one where the egress claim is trivially true and the CSP/Lighthouse/Playwright gates get established on easy mode. |
| **3** | Module B calculator (main thread, `location.hash` state) + Eurostat data bake + the honesty-framing copy (Marek HITL) | share card | First shareable artefact; drives Wave 1. |
| **3b** | Share cards: **build-time bucketed static grid first.** Dynamic Worker only if the bucketed version demonstrably fails. | — | See §4.1. Doing this first likely deletes the Worker from the project entirely, which removes the paid-plan dependency and the whole class of URL-privacy problems. |
| **4** | `packages/letters` + Module A + exports (`.txt`/`.docx`/`.pdf`/`.ics`) + pending-country mode | — | Gated on `country-data.article_7` + `enforcement` being *verified* for the launch countries (PL, SK, IT, LT, MT). English-for-any-state falls out of the `(country, en)` template key. |
| **5** | `directive-engine` implementation, TDD against the 0b vectors + the payroll Worker harness + per-path CSP | Module D, adapters | Now purely mechanical: the spec already exists and is executable. |
| **6** | Module D UI: file picker → Worker → report → PDF/JSON export + Járnhaus CTA + README privacy proof + npm publish | adapters | |
| **7** | `adapter-kit` (contract, static registry, conformance suite) + `adapters-pl` as the reference + `adapters-nl` as the proof the interface generalises | community PRs | Two adapters, not one. One adapter always fits its own interface; the second is what finds the abstraction bugs. |
| **8** | Module C (paste-only) | — | Smallest module; safe to sequence late. |
| **9** | Remaining locales (SK, IT, LT, then the 1 Jan 2027 wave) + remaining adapters | — | Each is now a catalogue + templates PR touching no engine code. |

**Critical-path summary:** `0 → 1 → 2` is a hard chain. `0b` unblocks `5`, `6` and `7`
simultaneously and should therefore start as early as `0`. `3`/`3b` and `4` are independent of the
engine entirely, so the B2C launch (Waves 1–2) never waits on Module D.

---

## Anti-Patterns

### Anti-Pattern 1: `directive-engine` importing `country-data`

**What people do:** `computeArticle9(rows, 'PL')` — it reads so much better.
**Why it's wrong:** couples the npm package's release cadence to monthly legal-fact churn; makes
every adopter inherit your legal-data liability; means a wrong deadline in a JSON file is now a bug
in a package other companies depend on; and puts an inbound edge on the node whose zero inbound
edges *are* the licence boundary.
**Do this instead:** `computeArticle9(rows, { thresholdPct, minGroupSizePerSex })` with
`DIRECTIVE_DEFAULTS` exported. `apps/web` reads the national override and passes it.

### Anti-Pattern 2: User data in the query string

**What people do:** `?pay=8400&years=12` because it makes the OG card trivial.
**Why it's wrong:** Cloudflare's `ClientRequestURI` log field includes the query string; every
social platform's crawler fetches the URL server-side; every recipient's client previews it; and
every human in the chat can read the salary without clicking.
**Do this instead:** precise values after `#` (never transmitted), coarse enums before `?` for the
card key, and a client-rendered PNG shared as a file for the primary path. See §4.1.

### Anti-Pattern 3: One `countries.json`

**What people do:** a single 8,000-line file, because loading it is one import.
**Why it's wrong:** 27 concurrent community PRs against one file is a permanent merge-conflict
generator; diffs are unreviewable; `CODEOWNERS` cannot route by country; a schema error takes down
all 27 countries instead of one.
**Do this instead:** one file per country, `glob()` loader, per-country `CODEOWNERS`.

### Anti-Pattern 4: `if (country === 'PL')` outside an adapter

**What people do:** one special case for Poland's works-council routing, then twelve more.
**Why it's wrong:** national behaviour ends up smeared across the codebase where no lawyer will
ever find it, and adding a country stops being a data change.
**Do this instead:** country behaviour is either a field in `country-data` (data-driven) or lives in
`adapters-{cc}` (code-driven). A lint rule banning ISO-country string literals in `apps/web` and
`packages/directive-engine` makes this enforceable.

### Anti-Pattern 5: Rendering a tier-2 source as if it were the statute

**What people do:** "Poland's deadline is 2 months" sourced from a law-firm tracker, rendered
identically to a fact sourced from Dziennik Ustaw.
**Why it's wrong:** the entire trust position is "every legal statement carries a source and a
date". A journalist who finds one law-firm-sourced claim presented as statutory will discount all of
them.
**Do this instead:** `SourceKind` tiering, and a UI that says "as reported by Littler (June 2026)"
when that is what the evidence supports.

### Anti-Pattern 6: A hard CI failure on stale facts

**What people do:** fail the build when any `verified_at` exceeds N months.
**Why it's wrong:** an unrelated CSS fix cannot deploy because Croatia lapsed overnight. The site
going dark is worse than the site being candid about its own staleness.
**Do this instead:** compute staleness at render time so the UI degrades automatically; make the
hard gate fire on the nightly cron and on PRs that touch `country-data`.

### Anti-Pattern 7: Dynamic `import()` of community adapter code

**What people do:** a "plugin system" that loads adapters at runtime.
**Why it's wrong:** requires loosening the CSP that is the product's headline claim, and puts
unreviewed third-party code inside the page holding payroll data.
**Do this instead:** static, codegen'd registry; adapters are compiled in, reviewed by PR, and
gated by the conformance suite.

### Anti-Pattern 8: A CDN font in the card renderer

**What people do:** `fetch('https://fonts.gstatic.com/…')` inside the OG pipeline.
**Why it's wrong:** adds a third-party origin, makes renders non-deterministic, and breaks the
"no third-party" story on the one surface most likely to be inspected.
**Do this instead:** vendor subsetted `.ttf`/`.otf` per locale into the build.

---

## Scaling Considerations

The traffic profile is *spiky and mobile* — a press pickup or a Reddit front page, not steady load.

| Scale | What to do |
|-------|------------|
| Launch → 100k visits/day | Nothing. Static assets on Cloudflare Pages with immutable caching absorb this at zero marginal cost. There is no origin to fall over. |
| Viral spike (Poland's act publishes) | Still nothing — **provided the OG card is a static asset**. This is the strongest practical argument for §4.1's recommendation: a dynamic satori Worker is the only component whose cost and latency scale with the spike, and it is the one component you can delete. |
| 27 countries × 10+ locales of content | The build gets slower, not the site. Watch Astro build time as `locales × countries × card grid` grows; if the card grid becomes the bottleneck, generate it incrementally and cache by content hash in CI. |
| Community-maintained data at scale | The bottleneck is **review capacity**, not compute. Invest in `CODEOWNERS` per country, the "Help us verify" issue-template funnel, and a validator whose error messages tell a non-engineer exactly what to fix. |

**First bottleneck in practice:** Module D's XLSX parsing on a low-end Android phone — ZIP inflation
plus cell-object construction against a 128 MB-ish practical budget. Mitigate with chunked streaming
and a row-count warning, not by moving work off-device.

**Second bottleneck:** the maintainer's time re-verifying 27 countries every 90 days. The freshness
system exists to make that degradation *visible and safe* rather than to prevent it.

---

## Integration Points

### External services

| Service | Integration | Notes |
|---------|-------------|-------|
| Cloudflare Pages | Static hosting + `_headers` for CSP (incl. the per-path worker CSP) | No functions if §4.1 is adopted |
| Cloudflare Web Analytics | Cookieless beacon; dimensions are Country, Host, **Path**, Referer, device, browser, OS | Query strings are *not* collected here — but they are in the zone HTTP log. Counts only, never payloads. Correct the README's "no third-party origin" phrasing. |
| Cloudflare Workers | **Recommend: none.** Only if a dynamic card survives review — then Paid plan required (free = 10 ms CPU/request) | 64 MiB script, 128 MB isolate incl. WASM |
| Eurostat | Manual/scripted pull at build time, committed as versioned JSON with its own `Fact` provenance | Never fetched at runtime |
| npm | `directive-engine`, `adapter-kit`, `adapters-*` published MIT via CI on tag | Tarball smoke test gates the publish |
| GitHub Actions | PR validation, nightly freshness + link check, nightly rebuild trigger | |

### Internal boundaries

| Boundary | Communication | Rule |
|----------|---------------|------|
| `apps/web` ↔ payroll Worker | `postMessage`, hand-rolled 4-message typed protocol | Only `EngineReport` returns. Never rows. |
| `directive-engine` ↔ adapters | `EngineReport` type, versioned via `reportVersion` + `enginePeer` | Adapters never see `PayrollRow` |
| `country-data` ↔ UI | `resolve(fact, directiveDefault)` only | Lint forbids `.value` access outside the package |
| `letters` ↔ `country-data` | Templates interpolate resolved facts | Templates hold no facts of their own |
| build ↔ runtime | Astro Content Layer, build-time collections | Zero runtime data fetch, anywhere |

---

## Sources

**Read directly (primary vendor/standards documentation):**

- Cloudflare — [Zone HTTP requests log fields](https://developers.cloudflare.com/logs/reference/log-fields/zone/http_requests/) — `ClientRequestURI` includes the query string; `ClientRequestPath` does not.
- Cloudflare — [Workers Trace Events log fields](https://developers.cloudflare.com/logs/reference/log-fields/account/workers_trace_events/)
- Cloudflare — [Workers platform limits](https://developers.cloudflare.com/workers/platform/limits/) — 10 ms CPU free / 5 min paid; 128 MB isolate incl. WASM; 64 MiB script.
- Cloudflare — [Web Analytics dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/) — Country, Host, Path, Referer, device, browser, OS, navigation type.
- Astro — [Internationalization](https://docs.astro.build/en/guides/internationalization/) — routing only; no message catalogue.
- Astro — [Content collections / Content Layer](https://docs.astro.build/en/guides/content-collections/) — `glob()` vs `file()` loaders, Zod schemas, build-time resolution.
- Papa Parse — [Docs](https://www.papaparse.com/docs) — `worker` option semantics; streaming necessity for large files.
- Vercel — [OG image generation](https://vercel.com/docs/og-image-generation) — satori + resvg; 1200×630; ttf/otf/woff only; flexbox subset; 500 KB bundle; "Secure URL / encrypting parameters" guide.
- MDN — [`navigator.share()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) — file sharing, secure context, transient activation, `canShare()`, "Limited availability".

**Search-derived:**

- Link unfurling is server-side for Slack (crawler + separate `Slack-ImgProxy` fetch of `og:image`), LinkedIn, Facebook and X; WhatsApp fetches and caches per device.
- Zod vs TypeBox vs Ajv comparisons (PkgPulse, 2026): TypeBox emits real JSON Schema; Ajv ~7× faster than Zod; Zod ~20M weekly downloads vs TypeBox ~3M.

**Note on confidence tiering.** The GSD `classify-confidence` seam tiers `webfetch` as LOW and
verified `websearch` as MEDIUM, because it classifies by *provider* rather than by *source*. Most of
the load-bearing findings above come from reading Cloudflare's, Astro's, Vercel's and MDN's own
documentation directly, which are primary sources; the seam's provider-based tiering under-rates
them. The two findings genuinely at MEDIUM and worth a confirming spike are: (a) that a Cloudflare
Pages `_headers` rule reliably applies a `Content-Security-Policy` to a Web Worker *script path* and
that all target browsers enforce it, and (b) real-world `navigator.canShare({files})` coverage on
the specific mobile browsers carrying the launch traffic.

---
*Architecture research for: static privacy-first EU compliance toolkit*
*Researched: 2026-09-10*
