<!-- GSD:project-start source:PROJECT.md -->

## Project

**paytransparency — "Ask about your pay"**

A free, no-signup, privacy-first web toolkit that lets any employee in the EU actually use
their new rights under the Pay Transparency Directive (EU) 2023/970: generate a
legally-grounded pay-information request under Article 7, see what the pay gap has cost them
over a career, and check whether a salary range in a job ad is honest. Underneath sits an
open-source Directive 2023/970 engine that also powers a second door for employers — an
in-browser Article 9 gender-pay-gap calculator for HR. Both doors live on one domain: the
worker-facing side is the traffic engine, the employer-facing side is the lead engine for
Járnhaus.

**Core Value:** A worker on a phone, with no account and no data ever leaving their browser, gets a correctly
cited, legally-grounded artefact in a language they can send — and can trust every legal
statement on the page because it carries a source and a verified date.

### Constraints

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
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## ⚠️ Read This First: Two Findings That Change the Plan

### 1. "Astro 5" is now two majors behind, and it costs you the CSP feature

| Release | Version | Published |
|---------|---------|-----------|
| Astro 5 final patch | `5.18.2` | 2026-05-26 |
| Astro 6.0.0 | `6.0.0` | 2026-03-10 |
| Astro 7.0.0 | `7.0.0` | 2026-06-22 |
| Astro latest | **`7.3.2`** | current `latest` tag |

- **`security.csp` is a stable, top-level config option `Since v6.0.0`.** Verified in `withastro/docs` `configuration-reference.mdx` line 632–638.
- In Astro 5 the same feature is **`experimental.csp`**, and it took a **breaking rename inside the 5.x line** (5.x changelog: `Astro.insertDirective` → `Astro.csp.insertDirective`, marked "BREAKING CHANGES only to the experimental CSP feature").
- `@astrojs/cloudflare@14.3.1` peer-requires `astro: ^7.2.0`. The Astro 5 line is served by `@astrojs/cloudflare@12.6.13` (peer `^5.7.0`).

### 2. OG image generation will not fit on the Workers Free plan

| Limit | Free | Paid |
|-------|------|------|
| CPU time **per invocation** | **10 ms** | 30 s default, 5 min max |
| Requests | 100,000/day | 10M/mo included |
| Script size | 64 MiB uncompressed | 64 MiB uncompressed |
| Startup (global scope) | 1 s | 1 s |

## Recommended Stack

### Core Technologies

| Technology | Version | Licence | Purpose | Why Recommended |
|------------|---------|---------|---------|-----------------|
| `astro` | **7.3.2** | MIT | Site framework, static output | Current major. `security.csp` is stable from 6.0.0 — this is the single feature the project's headline claim depends on. Engines: Node `>=22.12.0`. |
| `typescript` | **7.0.2** | Apache-2.0 | Types + engine emit | Current stable (published 2026-07-08); the native compiler. Fallback pin if emit surprises appear: `5.9.3`. |
| `@astrojs/react` | **6.0.5** | MIT | React islands | Peer `react ^17\|\|^18\|\|^19` — unchanged across majors, so island code is portable. |
| `react` / `react-dom` | **19.3.0** | MIT | Island runtime | — |
| `tailwindcss` + `@tailwindcss/vite` | **4.3.3** | MIT | Styling | Tailwind 4 as locked. The Vite plugin (not PostCSS) is the correct v4 integration. Peer: `vite ^5.2 \|\| ^6 \|\| ^7 \|\| ^8`. |
| `pnpm` | **12.3.4** | MIT | Package manager + workspaces | Catalogs (since 10.12.1) solve cross-package version drift with zero extra tooling. |
| `wrangler` | **4.130.0** | MIT OR Apache-2.0 | Deploy the OG Worker | — |

### Module D — Client-Side Spreadsheet Parsing (payroll CSV/XLSX)

| Library | Version | Licence | Verdict | Measured bundle (min+brotli) | Web Worker | Network egress |
|---------|---------|---------|---------|------------------------------|------------|----------------|
| **`papaparse`** | **5.7.0** | MIT | ✅ **USE — CSV** | **6.7 KB** | Yes (see caveat) | None. `download` option unused. |
| **`read-excel-file`** | **9.3.10** | MIT | ✅ **USE — XLSX** | **14.8 KB** | **Yes, first-class** | None |
| `xlsx` (SheetJS, npm) | 0.18.5 | Apache-2.0 | ❌ **DISQUALIFIED** | ~250 KB+ | Manual | None, but see below |
| `exceljs` | 4.4.0 | MIT | ❌ Reject | Very large | Manual | None |
| `@react-pdf`-adjacent wasm parsers | — | varied | ❌ Not needed | — | — | — |

#### `papaparse@5.7.0` — CSV — MIT

- **Zero dependencies.** Verified: `npm view papaparse dependencies` returns empty.
- **6.9 KB gzip / 6.7 KB brotli** measured on a realistic `Papa.parse(file, {header:true, skipEmptyLines:true})` bundle. The published `papaparse.min.js` is 18,874 bytes raw.
- Streams large files via `step` / `chunk` callbacks — a 200 MB payroll CSV never lands in memory whole.
- Actively maintained: 5.6.0 → 5.7.0 all shipped August 2026.
- **Zero egress:** the only network-touching feature is `download: true` (fetch a CSV from a URL). Never set it. Nothing else in the library opens a connection.

#### `read-excel-file@9.3.10` — XLSX — MIT

- Deps: `saxen` (streaming SAX), `fflate@^0.8.3`, `worker-f`, `unzipper-esm`. All small, all MIT-family, **`fflate ^0.8.3` is above the vulnerable range** (see satori note below).
- **16.7 KB gzip / 14.8 KB brotli** measured on `import readXlsxFile from 'read-excel-file/web-worker'`. Published browser bundle is 47,996 bytes raw / 14,062 gzip.
- **Web Workers are the default, not an add-on.** From its README: *"Renamed the default export to `read-excel-file/browser`, and it uses Web Workers now."* It spawns workers internally to avoid freezing the UI on large files. For full control there is a `read-excel-file/web-worker` export that does *not* spawn its own worker, so you can host it inside yours — this is the export to use.
- Has a schema/typed-column mapping API, which maps well onto a payroll import: declare `{ 'Gross Pay': { prop: 'basicPay', type: Number, required: true } }` and get validation errors per row for free.
- **Zero egress.** No `fetch`, no CDN, no telemetry.
- **Known gap: `.xls` (legacy binary BIFF) is not supported — only `.xlsx`.** HR exports from old systems are sometimes `.xls`. Handle this in the UI: detect the magic bytes, and tell the user to re-save as `.xlsx` or CSV. Do **not** pull in SheetJS just to cover this.

#### ❌ `xlsx` (SheetJS) — DISQUALIFIED on two independent grounds

#### ❌ `exceljs@4.4.0` — Reject

#### Zero-egress verdict for Module D

### OG Image Generation at the Edge

| Library | Version | Licence | Verdict |
|---------|---------|---------|---------|
| **`satori`** | **0.33.4** (2026-08-24) | **MPL-2.0** | ✅ Use — layout → SVG |
| **`@resvg/resvg-wasm`** | **2.6.2** | **MPL-2.0** | ✅ Use — SVG → PNG |
| `@cf-wasm/og` | 0.5.0 | MIT (wraps MPL-2.0) | ⚠️ Convenient, but see the font trap |
| `workers-og` | 0.0.27 | — | ❌ Last published 2025-06-12. Stale. |
| `@vercel/og` | 1.0.2 | MPL-2.0 | ❌ Next.js-coupled |
| Cloudflare **Browser Run** (was Browser Rendering) | — | service | ❌ Wrong tool here — see below |

#### The font-loading pattern (satori needs raw buffers)

- **`import resvgWasm from '...wasm'`** — Wrangler compiles the module at deploy time. Do **not** `fetch()` the wasm at runtime: that is network egress from the Worker and it will fight your own CSP philosophy.
- **`initWasm` is lazy, inside `fetch`**, not at module scope. Top-level instantiation of a 2.5 MB module risks the **1-second startup limit** (error `10021`). The module stays warm across requests on the same isolate.
- **Aggressive immutable caching** is the main mitigation for the CPU cost. The share-card URL is deterministic from its params, so every repeat share is a cache hit and costs zero CPU. Put the OG worker behind Cloudflare's cache and this becomes affordable even at viral volume.

#### CJK / diacritic coverage for Polish

- **You need a Latin Extended-A subset, not just `latin`.** Fontsource and Google Fonts split these: the `latin` subset alone will render `ł` and `ę` as tofu. Take the **`latin-ext`** subset.
- **CJK is not required.** The locale roadmap (EN, PL → SK, IT, LT → DE, NL, CS, SV, DA) is entirely Latin. Slovak (`ľ ĺ ŕ ô ä`), Czech (`ř ů ě`), Lithuanian (`ą č ę ė į š ų ū ž`) and Danish/Swedish (`å æ ø`) are all covered by `latin-ext` plus Latin-1. **Do not ship a CJK font** — that is a multi-megabyte mistake solving a problem you do not have.
- **Recommended face:** **Inter** (`@fontsource/inter@5.3.0`, **OFL-1.1**). Excellent `latin-ext` coverage, designed for UI. **Lato** (OFL-1.1) is a defensible alternative and was designed by a Polish typographer with first-class Polish diacritic shapes.
- **Subset at build time** with `subset-font@2.7.0` (BSD-3-Clause) or `pyftsubset`. A Latin+Latin-Ext-A TTF subset lands around 40–70 KB. Keeps the Worker startup fast and gives you an exact, auditable byte count.

#### Newer first-party Cloudflare alternative

#### ⚠️ `@cf-wasm/og@0.5.0` — the font trap

#### ⚠️ satori's transitive `fflate` advisory

# pnpm-workspace.yaml

### Client-Side PDF and DOCX Generation

#### PDF: use `jspdf@4.2.1` (MIT) — and this contradicts the usual advice

| Option | Raw | Gzip | **Brotli** | Built-in TTF embed | Built-in word wrap |
|--------|-----|------|-----------|--------------------|--------------------|
| **`jspdf@4.2.1`** | 816 KB | 248 KB | **208 KB** | ✅ yes | ✅ `splitTextToSize` |
| `@cantoo/pdf-lib@2.9.2` core only | 707 KB | 282 KB | 224 KB | ❌ | ❌ |
| `@pdf-lib/fontkit@1.1.1` alone | 985 KB | 384 KB | **276 KB** | — | — |
| **pdf-lib + fontkit (what you'd actually ship)** | 1.66 MB | 653 KB | **488 KB** | ✅ | ❌ |

- **`optionalDependencies` are a bloat trap.** `jspdf@4.2.1` declares optional deps on `canvg`, `core-js`, `dompurify`, `html2canvas`. These are only pulled in by the `.html()` and SVG APIs. **Never call `doc.html()`.** Install with `--omit=optional` (or pnpm `neverBuiltDependencies`) and add a bundle-size CI assertion. Verified: none of them appear in the 208 KB brotli bundle above.
- Runtime deps are `@babel/runtime`, `fflate ^0.8.1` (above the vulnerable range — clean), `fast-png`. `npm audit` on jsPDF alone: clean.
- **Base64 VFS inflates the font by ~33%.** Pre-subset the TTF to Latin + Latin-Ext-A before base64-ing it. A 50 KB subset becomes a ~67 KB string — acceptable inside a lazily-imported chunk, unacceptable in the entry bundle.
- Licence **MIT**, confirmed from `package/LICENSE`: *"(c) 2010-2025 James Hall … (c) 2015-2025 yWorks GmbH"*.

#### DOCX: use `docx@9.7.1` (MIT)

- Measured **103.5 KB gzip / 89.7 KB brotli** for a realistic `Document`/`Packer.toBlob()` bundle.
- Last published 2026-05-27. Actively maintained.
- Deps: `jszip ^3.10.1`, `nanoid ^5`, `xml`, `xml-js`, `hash.js`, `@types/node`. **`npm audit` on `docx@9.7.1`: zero vulnerabilities** — the jszip path-traversal advisory affects the jszip 2.x line, and docx resolves clean on 3.x.
- Browser-native: README states *"Works for Node and on the Browser"*, `Packer.toBlob()` returns a Blob ready for an object URL.
- Zero egress: it assembles OOXML and zips it in memory. No fetch.
- `lodash.merge` — *Prototype Pollution* (two separate advisories)
- `jszip` — *Path Traversal via `loadAsync`*

### `.ics` Calendar File Generation

| Option | Version | Licence | Measured brotli | Verdict |
|--------|---------|---------|-----------------|---------|
| **Hand-rolled** | — | yours | **~0 KB** | ✅ **Use** |
| `ics` | 3.12.0 | ISC | 21.4 KB | Fallback only |
| `ical-generator` | 11.1.1 | MIT | — | ❌ Node-oriented |

### i18n: `astro:i18n` for routing + Paraglide JS for messages

| Layer | Choice | Version | Licence |
|-------|--------|---------|---------|
| Routing | **`astro:i18n` built-in** | (Astro 7.3.2) | MIT |
| Messages | **`@inlang/paraglide-js`** | **2.25.1** | MIT |

#### Why Paraglide over i18next

| | Paraglide 2.25.1 | i18next 26.4.2 + react-i18next 17.0.13 |
|---|---|---|
| Runtime library shipped | **0 KB** (compiles to plain functions) | **17.4 KB brotli** (measured) |
| Message payload | Tree-shaken per message | Whole JSON catalogue per locale |
| Runtime deps in output | **none** | i18next core + react bindings |
| Type safety | Generated `.d.ts`, params typed | String keys, untyped params |
| Works in React islands | **Yes — identical import** | Yes, via Context/hook |
| Licence | MIT | MIT |

- **`strategy: ['url', 'baseLocale']`.** The default is `['cookie', 'globalVariable', 'baseLocale']`. **Drop `cookie`** — the project promises cookieless, and a locale cookie would be an embarrassing contradiction in a privacy audit even though it is functionally harmless. URL-based locale is also the only strategy that works correctly on a fully static CDN.
- **`experimentalStaticLocale`.** Without it, Paraglide tree-shakes unused *messages* but **every locale's strings still land in the shared bundle** — so 10 locales means 10× the string payload in one file. `experimentalStaticLocale` enables compile-time locale constants and true per-locale splitting, but the docs state it *"only works in SSR/SSG environment without client-side routing."* **That is precisely this project** (static output, and you must avoid `<ClientRouter />` for CSP reasons anyway — see below). At EN+PL the default is fine; **turn this on before the SK/IT/LT wave**, and flag it as a roadmap item rather than a v1 blocker. **Confidence: HIGH on the mechanism; MEDIUM on `experimentalStaticLocale` stability, since it is flagged experimental.**

### Monorepo Tooling

| Tool | Version | Licence | Verdict |
|------|---------|---------|---------|
| **`pnpm` workspaces** | **12.3.4** | MIT | ✅ **Use** |
| **pnpm catalogs** | (since 10.12.1) | MIT | ✅ **Use** |
| `turbo` | 2.10.12 | MIT | ⏳ Add later, if CI hurts |
| `nx` | 23.2.1 | MIT | ❌ Disproportionate |

# pnpm-workspace.yaml

### Testing

| Tool | Version | Licence | Purpose |
|------|---------|---------|---------|
| **`vitest`** | **4.1.11** | MIT | Engine golden vectors, letter snapshots |
| **`@playwright/test`** | **1.63.0** | Apache-2.0 | CTA smoke suite vs deployed URL |

### Strict CSP on Cloudflare Pages

#### Does Astro require inline-script allowances? Yes — and `security.csp` solves it.

#### Cloudflare Web Analytics fits inside `connect-src 'self'` — the H5 decision pays off exactly as hoped

- Script: **`https://static.cloudflareinsights.com/beacon.min.js`** → needs `script-src https://static.cloudflareinsights.com`.
- Data endpoint: with **automatic setup on a proxied domain, the beacon reports to your own domain's `/cdn-cgi/rum`** — a *same-origin* POST. With manual setup it reports to `cloudflareinsights.com`.
- **Automatic injection breaks if you send `Cache-Control: public, no-transform`** — Cloudflare's proxy cannot rewrite the payload. Check your `_headers` for `no-transform`.
- The snippet is an *external* script with a `data-cf-beacon` attribute, not an inline script — so it needs an origin allowance, not a hash.

#### Belt and braces: also set the header via `_headers`

# apps/web/public/_headers

#### The one place "zero egress" needs an honest asterisk

- Put only **rounded, derived** figures in the URL (a gap percentage and a bucketed lifetime total), never raw salary.
- Make sharing an **explicit user action** with a preview of exactly what the URL contains.
- **Disable Worker request logging** for the OG route, and say so in the README.
- State it in the privacy section: *"Nothing leaves your browser unless you press Share, and then only the rounded figures visible on the card."*

### npm Publishing: `directive-engine` (MIT, zero runtime deps)

| Option | Version | Licence | Verdict |
|--------|---------|---------|---------|
| **plain `tsc`** | (typescript 7.0.2) | Apache-2.0 | ✅ **Use** |
| `tsdown` | 0.23.0 | MIT | ⏳ Promising, pre-1.0 |
| `tsup` | 8.5.1 | MIT | ❌ Slowing down |
| `unbuild` | 3.6.1 | MIT | ❌ Overkill |

- **`publint@0.3.24`** (MIT) — catches broken `exports` maps, wrong `types` ordering, missing files.
- **`@arethetypeswrong/cli@0.18.5`** (MIT) — catches type-resolution failures under `node16`/`bundler` resolution. This is the tool that catches the class of bug that makes a package unusable for half its audience.

## Installation

# --- root ---

# --- apps/web ---

# Module D — spreadsheet parsing (lazy-loaded, zero egress)

# Module A — document export (lazy-loaded behind the download buttons)

#   .ics: hand-rolled in packages/letters — no dependency

# --- og-worker (separate wrangler project) ---

# --- build-time font subsetting ---

# packages/directive-engine: NO runtime dependencies. Ever. Enforced in CI.

## Alternatives Considered

| Recommended | Alternative | When the alternative would win |
|-------------|-------------|-------------------------------|
| `read-excel-file` | SheetJS via `cdn.sheetjs.com` | You need `.xls`, `.ods`, formula evaluation or XLSX *writing*, and can defend a non-npm registry in your supply chain. Not this project. |
| `papaparse` | `csv-parse` / hand-rolled | Node-side parsing, or you need full RFC 4180 edge cases papaparse punts on. Papa is better in the browser. |
| `jspdf` | `@cantoo/pdf-lib` + `@pdf-lib/fontkit` | You must *modify* an existing PDF (fill forms, merge, stamp). pdf-lib's editing model is genuinely better; it just costs 2.3× the bytes for pure generation. |
| `jspdf` | `@react-pdf/renderer` | You want React-component page layout and bundle size does not matter. Also audit its remote-font default first. |
| `docx` | server-side LibreOffice/Pandoc | Never here — that is a server, and a server is out of scope. |
| hand-rolled `.ics` | `ics@3.12.0` | Recurring events, VALARM, attendees, timezone handling. A one-off all-day deadline needs none of it. |
| Paraglide | `i18next` + `react-i18next` | You need runtime-loaded translations (user-supplied locales, CMS-driven strings) or ICU plural rules Paraglide cannot express. Neither applies. |
| pnpm workspaces | `turbo@2.10.12` | CI wall-clock > ~3 min, or > ~10 packages. Add it *then*; it is a 20-line config. |
| plain `tsc` | `tsdown@0.23.0` | You start bundling dependencies, or need to ship a browser-optimised build. Revisit after tsdown 1.0. |
| satori + resvg | Cloudflare **Browser Run** `/screenshot` | Your card needs real CSS/webfonts/JS that satori cannot render. Costs an order of magnitude more CPU and gives non-deterministic output. |
| Astro `security.csp` | hand-written `_headers` only | You need a nonce-based policy with per-request nonces — which requires SSR, which you do not have. |

## What NOT to Use

| ❌ Package | Version | Reason | Severity |
|-----------|---------|--------|----------|
| **`xlsx` (SheetJS from npm)** | 0.18.5 | Frozen since **2022-03-24**; `npm audit` **HIGH** × 2 (prototype pollution + ReDoS); patches exist only on a non-npm registry. Not deprecated on npm, so it installs silently — a trap. | **Disqualifying** |
| **`html-docx-js`** | 0.3.1 | `npm audit` **HIGH** (lodash.merge prototype pollution ×2, jszip path traversal). Abandoned. Produces `altChunk` HTML that renders inconsistently across Word/LibreOffice/Docs. | **Disqualifying** |
| **`@react-pdf/renderer`** | 4.9.0 | 13 runtime deps incl. `pdfkit`, `prop-types`, `@babel/runtime`. Its `Font.register({src:'https://…'})` API makes **remote font fetching the documented happy path** — a footgun on a zero-egress product. | High |
| **`pdf-lib`** | 1.17.1 | Last published **2021-11-06**. Unmaintained. Use `@cantoo/pdf-lib@2.9.2` if you need the API. | High |
| **`exceljs`** | 4.4.0 | Last release **2023-10-19**; `npm audit` moderate via `uuid`; 21.8 MB unpacked for a read-only need. | Medium |
| **`@cf-wasm/og`'s `GoogleFont`** | 0.5.0 | Fetches fonts from Google at Worker runtime. Use `CustomFont` only, or wire satori directly. | High (config) |
| **`workers-og`** | 0.0.27 | Last published 2025-06-12. Stale wrapper; use satori directly. | Medium |
| **`astro-i18next`** | 1.0.0-beta.21 | Perpetual beta, predates Astro's built-in i18n, abandoned. | Medium |
| **`jspdf`'s `.html()` API** | — | Drags in `html2canvas` + `canvg` + `dompurify` + `core-js`. Install with `--omit=optional` and never call it. | Medium |
| **`<ClientRouter />`** | — | Astro docs: **incompatible with `security.csp`**. Also blocks Paraglide's `experimentalStaticLocale`. Use the native View Transition API. | High (architectural) |
| **Papaparse `worker: true`** | — | Spawns a `blob:` URL worker → forces `worker-src blob:`. Host Papa in your own module worker instead. | Medium (CSP) |
| **`'unsafe-inline'` anywhere** | — | Astro silently stops emitting hashes for any directive containing it, downgrading that directive wholesale. | High |
| **Any CJK webfont** | — | The entire locale roadmap is Latin. `latin` + `latin-ext` covers PL, SK, CS, LT, DE, NL, SV, DA, IT. | Medium (perf) |
| **`vitest@5.0.0`** | 5.0.0 | Released 2026-09-03, no patch release yet, raises the Node floor. Revisit at 5.1. | Low |
| **Dual ESM/CJS for the engine** | — | `require(esm)` is stable (Node 25.4.0; unflagged since 20.19/22.12) and the engine is fully synchronous. Dual buys the dual-package hazard for nothing. | Low |

## Measured Bundle Budget

| Chunk | Loaded when | gzip | **brotli** |
|-------|-------------|------|-----------|
| Astro + Tailwind shell | always | — | ~0 (islands only) |
| Paraglide messages (EN+PL) | always | ~0 runtime | ~0 runtime |
| React island runtime | on first island | ~45 KB | ~40 KB |
| `papaparse` | file picker touched | 7.3 KB | **6.7 KB** |
| `read-excel-file` | `.xlsx` chosen | 16.7 KB | **14.8 KB** |
| `jspdf` + subset font | "Download PDF" clicked | 248 KB | **208 KB** + ~50 KB font |
| `docx` | "Download DOCX" clicked | 103.5 KB | **89.7 KB** |
| `.ics` writer | "Add reminder" clicked | ~0 | **~0** |

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| All package versions & licences | **HIGH** | Live `npm view` / `registry.npmjs.org` on 2026-09-10 |
| Bundle sizes | **HIGH** | Measured locally with esbuild + gzip + brotli, not estimated |
| SheetJS disqualification | **HIGH** | `dist-tags` frozen at 0.18.5 (2022-03-24) + two HIGH advisories from real `npm audit` |
| `html-docx-js` disqualification | **HIGH** | HIGH advisories from real `npm audit` |
| jsPDF beats pdf-lib **here** | **HIGH** | 208 KB vs 488 KB brotli measured; `Subset`/`Identity-H` confirmed in jsPDF source |
| Astro `security.csp` stable since 6.0.0 | **HIGH** | `withastro/docs` `configuration-reference.mdx` `<Since v="6.0.0" />` |
| CF Web Analytics fits `connect-src 'self'` | **HIGH** | CF Web Analytics FAQ: automatic setup posts to own-domain `/cdn-cgi/rum` |
| Workers limits (64 MiB, 10 ms free CPU, 1 s startup) | **HIGH** | `developers.cloudflare.com/workers/platform/{limits,pricing}` |
| satori font constraints (no WOFF2, ArrayBuffer) | **HIGH** | satori README, quoted verbatim |
| Paraglide as the island-friendly choice | **HIGH** | Official Astro guide; identical import in `.astro` and React confirmed |
| `require(esm)` stable → ESM-only is safe | **HIGH** | Node docs: *"v25.4.0: no longer experimental"* |
| **satori+resvg CPU cost vs 10 ms free tier** | **MEDIUM** | Limits verified; actual render CPU **not benchmarked**. Verify with `wrangler dev --remote` in Phase 1. |
| Paraglide `experimentalStaticLocale` | **MEDIUM** | Documented, but flagged experimental. Fine at 2 locales; validate before the 5-locale wave. |
| `fflate` override on satori being drop-in | **MEDIUM** | 0.7→0.8 is API-compatible, but **not tested here**. Cover with a Playwright OG render test. |
| Cloudflare Pages long-term status | **MEDIUM** | Not deprecated, but CF's docs push Workers Static Assets and Pages lacks features (Cron, gradual deploys, Workers Logs). Consider Workers Static Assets for a greenfield build. |

## Gaps to Resolve in Phase 0/1

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
