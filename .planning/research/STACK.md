# Stack Research

**Domain:** Static, client-side, privacy-first EU-regulatory web toolkit + open-source TypeScript compliance engine
**Researched:** 2026-09-10
**Confidence:** HIGH for library selection and versions (every version below read live from the npm registry on 2026-09-10, plus real bundle measurements taken locally with esbuild). MEDIUM for Cloudflare Workers CPU behaviour of satori+resvg (documented limits verified; actual render cost not benchmarked).

**Method note.** Versions were not taken from training data. Every package version, licence, dependency tree and publish date below came from live `npm view` / `registry.npmjs.org` calls. Bundle sizes are measured, not estimated: each library was installed and bundled with `esbuild --bundle --minify --format=esm --platform=browser` against realistic usage code, then gzipped and brotli-compressed. Platform limits came from `developers.cloudflare.com`; Astro behaviour came from the Astro docs source in `withastro/docs` and the `astro` package changelog. Security findings came from `npm audit` against real lockfiles.

---

## ⚠️ Read This First: Two Findings That Change the Plan

### 1. "Astro 5" is now two majors behind, and it costs you the CSP feature

The stack lock says Astro 5. Verified reality on 2026-09-10:

| Release | Version | Published |
|---------|---------|-----------|
| Astro 5 final patch | `5.18.2` | 2026-05-26 |
| Astro 6.0.0 | `6.0.0` | 2026-03-10 |
| Astro 7.0.0 | `7.0.0` | 2026-06-22 |
| Astro latest | **`7.3.2`** | current `latest` tag |

This matters far beyond version hygiene, because of requirement 8 (strict CSP):

- **`security.csp` is a stable, top-level config option `Since v6.0.0`.** Verified in `withastro/docs` `configuration-reference.mdx` line 632–638.
- In Astro 5 the same feature is **`experimental.csp`**, and it took a **breaking rename inside the 5.x line** (5.x changelog: `Astro.insertDirective` → `Astro.csp.insertDirective`, marked "BREAKING CHANGES only to the experimental CSP feature").
- `@astrojs/cloudflare@14.3.1` peer-requires `astro: ^7.2.0`. The Astro 5 line is served by `@astrojs/cloudflare@12.6.13` (peer `^5.7.0`).

**Recommendation: build on Astro 7.3.2, not Astro 5.** The locked decision was "Astro + TS + Tailwind 4 + React islands on Cloudflare Pages", and Astro 7 satisfies that decision completely — this is not a re-selection of the framework, it is choosing the currently-supported major of the framework already chosen. Astro 5 is a greenfield project starting on an unmaintained branch whose flagship security feature is experimental. `@astrojs/react`, `@tailwindcss/vite` and the whole island model are unchanged across 5→7 (`@astrojs/react` peer deps are identical at 4.x, 5.x and 6.x).

If Astro 5 is genuinely immovable, then: pin `astro@5.18.2`, use `experimental.csp` (5.9+), and expect to hand-maintain the CSP.

**Confidence:** HIGH.

### 2. OG image generation will not fit on the Workers Free plan

Verified against `developers.cloudflare.com/workers/platform/pricing/` and `/workers/platform/limits/`:

| Limit | Free | Paid |
|-------|------|------|
| CPU time **per invocation** | **10 ms** | 30 s default, 5 min max |
| Requests | 100,000/day | 10M/mo included |
| Script size | 64 MiB uncompressed | 64 MiB uncompressed |
| Startup (global scope) | 1 s | 1 s |

A satori layout pass plus a resvg raster of a 1200×630 PNG is a triple-digit-millisecond CPU operation. **10 ms is not survivable.** Budget **Workers Paid, $5/month minimum**, from day one. This is a real (small) line item that the roadmap should carry rather than discover on launch day.

Good news on the same page: the **64 MiB uncompressed script limit now applies to both plans**. The old 1 MB/3 MB/10 MB *compressed* limits are gone. The resvg wasm binary is 2,478,606 bytes raw / 950,547 bytes gzipped (measured by unpacking the tarball) — a complete non-issue against 64 MiB. Do **not** plan around wasm size. Plan around the **1-second startup limit** instead: instantiate wasm lazily inside the fetch handler, not at module top level.

**Confidence:** HIGH on the limits; MEDIUM on the exact CPU cost of a render.

---

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

**Do not install `@astrojs/cloudflare`.** The site is 100% prerendered. An adapter turns on SSR machinery you do not want, drags the Cloudflare runtime into the site build, and complicates the CSP story. Ship `output: 'static'`, upload `dist/`, and run the OG generator as a **separate Worker with its own `wrangler.toml`**. This also keeps the 2.5 MB wasm entirely out of the website's build artifact.

### Module D — Client-Side Spreadsheet Parsing (payroll CSV/XLSX)

**This is the highest-stakes choice in the project.** Whatever parses payroll goes into the browser tab that holds real salary data.

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

> **CSP caveat, verified by reading the source.** `papaparse.js` line 52 constructs its worker via `URL.createObjectURL(new Blob([...]))`. Setting `worker: true` therefore requires `worker-src blob:` in your CSP — which weakens the policy for no good reason.
>
> **Do not use `worker: true`.** Instead put Papa inside *your own* module worker:
> ```ts
> // parse.worker.ts
> import Papa from 'papaparse';
> self.onmessage = (e) => { Papa.parse(e.data, { header: true, chunk: ... }); };
> // caller
> new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
> ```
> This gets you off the main thread with `worker-src 'self'` only.

#### `read-excel-file@9.3.10` — XLSX — MIT

- Deps: `saxen` (streaming SAX), `fflate@^0.8.3`, `worker-f`, `unzipper-esm`. All small, all MIT-family, **`fflate ^0.8.3` is above the vulnerable range** (see satori note below).
- **16.7 KB gzip / 14.8 KB brotli** measured on `import readXlsxFile from 'read-excel-file/web-worker'`. Published browser bundle is 47,996 bytes raw / 14,062 gzip.
- **Web Workers are the default, not an add-on.** From its README: *"Renamed the default export to `read-excel-file/browser`, and it uses Web Workers now."* It spawns workers internally to avoid freezing the UI on large files. For full control there is a `read-excel-file/web-worker` export that does *not* spawn its own worker, so you can host it inside yours — this is the export to use.
- Has a schema/typed-column mapping API, which maps well onto a payroll import: declare `{ 'Gross Pay': { prop: 'basicPay', type: Number, required: true } }` and get validation errors per row for free.
- **Zero egress.** No `fetch`, no CDN, no telemetry.
- **Known gap: `.xls` (legacy binary BIFF) is not supported — only `.xlsx`.** HR exports from old systems are sometimes `.xls`. Handle this in the UI: detect the magic bytes, and tell the user to re-save as `.xlsx` or CSV. Do **not** pull in SheetJS just to cover this.

#### ❌ `xlsx` (SheetJS) — DISQUALIFIED on two independent grounds

Both verified directly, not recalled:

1. **The npm package is abandoned at `0.18.5`, published 2022-03-24.** `dist-tags` on `registry.npmjs.org/xlsx` is `{"latest":"0.18.5"}` and has not moved in four and a half years. SheetJS moved distribution to their own registry (`cdn.sheetjs.com`); the npm copy is a fossil. It is *not* formally deprecated, which makes it a trap — `npm i xlsx` succeeds silently and installs 2022 code.
2. **That fossil carries two HIGH-severity advisories.** `npm audit` against a real lockfile returns:
   - `xlsx` **high** — *"Prototype Pollution in sheetJS"*
   - `xlsx` **high** — *"SheetJS Regular Expression Denial of Service (ReDoS)"*

   Both are fixed only in versions that exist exclusively on `cdn.sheetjs.com`. There is no patched version reachable from npm.

**Licence note:** the code itself is Apache-2.0 — OSI-approved and compatible with both MIT and AGPL. The problem is not the licence, it is the *distribution*. To get patched SheetJS you must add a non-npm registry to `.npmrc`, which for this project means: a supply-chain source that your `npm audit`, your provenance story, your Dependabot and your "auditable by a compensation analyst" README cannot cleanly account for. **For a product whose entire trust position is auditability, that is disqualifying.** Reject.

(The republished forks — `@e965/xlsx@0.20.3`, `xlsx-republish@0.20.3`, `node-xlsx@0.24.0` — do carry patched code under Apache-2.0. They are third-party mirrors of a vendor that deliberately left npm. Do not stake the trust claim on a mirror.)

#### ❌ `exceljs@4.4.0` — Reject

Last release 2023-10-19; the only newer artifact is a `4.4.1-prerelease.0` from Dec 2024. 21.8 MB unpacked. `npm audit`: **moderate** via `uuid` (*"Missing buffer bounds check in v3/v5/v6"*). It is a read+write library where you only need read, and it is effectively unmaintained. No reason to take it over `read-excel-file` at 1/40th the size.

#### Zero-egress verdict for Module D

`papaparse` + `read-excel-file` together are **21.5 KB brotli**, have a combined transitive tree of four small packages, contain no `fetch`/`XMLHttpRequest`/`importScripts` against remote origins, and load no CDN assets. Both can be lazy-loaded behind the file-picker so they cost the landing page nothing. This combination *is* the zero-egress claim, and it is small enough to be audited by hand — which is exactly what the README needs to promise.

### OG Image Generation at the Edge

| Library | Version | Licence | Verdict |
|---------|---------|---------|---------|
| **`satori`** | **0.33.4** (2026-08-24) | **MPL-2.0** | ✅ Use — layout → SVG |
| **`@resvg/resvg-wasm`** | **2.6.2** | **MPL-2.0** | ✅ Use — SVG → PNG |
| `@cf-wasm/og` | 0.5.0 | MIT (wraps MPL-2.0) | ⚠️ Convenient, but see the font trap |
| `workers-og` | 0.0.27 | — | ❌ Last published 2025-06-12. Stale. |
| `@vercel/og` | 1.0.2 | MPL-2.0 | ❌ Next.js-coupled |
| Cloudflare **Browser Run** (was Browser Rendering) | — | service | ❌ Wrong tool here — see below |

**Licence flag:** satori and resvg are **MPL-2.0**, which is *weak copyleft at file granularity*. This is fine — it is OSI-approved, compatible with an AGPL app, and imposes no obligation on your own files. But it is a copyleft licence, so note it: they live in `apps/web`'s Worker, and **must never be pulled into `packages/directive-engine`** (MIT, zero runtime deps). They won't be — just don't let a shared "utils" package become the leak path.

`@resvg/resvg-wasm@2.6.2` has **zero dependencies**. `latest` is 2.6.2; a `2.7.0-alpha.2` exists from 2026-01-28 but has not been promoted — stay on stable.

#### The font-loading pattern (satori needs raw buffers)

From the satori README, verified verbatim:

> *"Satori currently supports three font formats: TTF, OTF and WOFF. **Note that WOFF2 is not supported at the moment.** You must specify the font if any text is rendered with Satori, and pass the font data as ArrayBuffer (web) or Buffer (Node.js)."*

This is the #1 gotcha. Almost every modern font distribution (`@fontsource/*`, Google Fonts CSS) serves **WOFF2**, which satori will reject. You must ship a **TTF or OTF**.

Correct pattern for Cloudflare Workers — bake the font into the bundle, never fetch it:

```ts
// og-worker/src/index.ts
import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';   // module import, not fetch
import interRegular from './fonts/inter-latin-ext-400.ttf'; // configure as ArrayBuffer

let ready: Promise<void> | undefined;
const init = () => (ready ??= initWasm(resvgWasm));  // lazy: keeps startup under 1s

export default {
  async fetch(req: Request) {
    await init();
    const svg = await satori(tree, {
      width: 1200, height: 630,
      fonts: [{ name: 'Inter', data: interRegular, weight: 400, style: 'normal' }],
    });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
      .render().asPng();
    return new Response(png, {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  },
};
```

Notes on that snippet:
- **`import resvgWasm from '...wasm'`** — Wrangler compiles the module at deploy time. Do **not** `fetch()` the wasm at runtime: that is network egress from the Worker and it will fight your own CSP philosophy.
- **`initWasm` is lazy, inside `fetch`**, not at module scope. Top-level instantiation of a 2.5 MB module risks the **1-second startup limit** (error `10021`). The module stays warm across requests on the same isolate.
- **Aggressive immutable caching** is the main mitigation for the CPU cost. The share-card URL is deterministic from its params, so every repeat share is a cache hit and costs zero CPU. Put the OG worker behind Cloudflare's cache and this becomes affordable even at viral volume.

#### CJK / diacritic coverage for Polish

Polish needs `ą ć ę ł ń ó ś ź ż` / `Ą Ć Ę Ł Ń Ó Ś Ź Ż`. All except `ó/Ó` (Latin-1) live in **Latin Extended-A**. So:

- **You need a Latin Extended-A subset, not just `latin`.** Fontsource and Google Fonts split these: the `latin` subset alone will render `ł` and `ę` as tofu. Take the **`latin-ext`** subset.
- **CJK is not required.** The locale roadmap (EN, PL → SK, IT, LT → DE, NL, CS, SV, DA) is entirely Latin. Slovak (`ľ ĺ ŕ ô ä`), Czech (`ř ů ě`), Lithuanian (`ą č ę ė į š ų ū ž`) and Danish/Swedish (`å æ ø`) are all covered by `latin-ext` plus Latin-1. **Do not ship a CJK font** — that is a multi-megabyte mistake solving a problem you do not have.
- **Recommended face:** **Inter** (`@fontsource/inter@5.3.0`, **OFL-1.1**). Excellent `latin-ext` coverage, designed for UI. **Lato** (OFL-1.1) is a defensible alternative and was designed by a Polish typographer with first-class Polish diacritic shapes.
- **Subset at build time** with `subset-font@2.7.0` (BSD-3-Clause) or `pyftsubset`. A Latin+Latin-Ext-A TTF subset lands around 40–70 KB. Keeps the Worker startup fast and gives you an exact, auditable byte count.

#### Newer first-party Cloudflare alternative

Cloudflare **Browser Rendering has been rebranded "Browser Run"** and exposes a **`/screenshot` REST endpoint** that renders raw HTML to an image, with a free tier. It is a genuine first-party alternative and worth knowing about.

**Do not use it here.** It boots headless Chrome per render, so cost and latency are an order of magnitude above satori, the output is not deterministic across Chrome versions (bad for a share card that must look identical when a journalist re-shares it), and it introduces a heavyweight dependency for a task satori does in a few hundred milliseconds. satori + resvg remains correct. **Confidence: HIGH.**

#### ⚠️ `@cf-wasm/og@0.5.0` — the font trap

This package (MIT wrapper around satori+resvg) genuinely saves setup, and its own docs are honest about the platform limits: *"you may hit the CPU time limit, 128 MB Memory limit or 3 MB script size limit (Workers Free Plan)"*.

But it ships a **`GoogleFont` class that fetches fonts from Google at runtime**. On a project whose headline claim is zero egress, a Worker quietly calling `fonts.googleapis.com` on every cold render is exactly the kind of thing that turns a Show HN into a correction thread. If you use this package, use **`CustomFont` only**, and add a test that asserts no outbound fetch. Otherwise wire satori + resvg directly — it is about 30 lines, shown above, and you own every byte.

#### ⚠️ satori's transitive `fflate` advisory

`satori@0.33.4` pins **`fflate` at exactly `0.7.3`**. That falls inside advisory **GHSA-px8p-9vwx-vf98** (moderate): *"fflate `unzipSync` can enter an infinite loop when parsing malformed ZIP64 archives"*, affected range `>=0.7.0 <0.7.5`.

Practical risk here is **low** — satori uses fflate to decompress *your own bundled fonts*, not attacker-supplied archives, and it runs in a Worker with a CPU cap that would kill any loop. But it will show up in `npm audit` and in any security review of the repo, so handle it deliberately:

```yaml
# pnpm-workspace.yaml
overrides:
  fflate: ^0.8.3
```

Then verify the OG worker still renders in the Playwright suite. `fflate` 0.8 is API-compatible with 0.7. **Confidence: HIGH on the advisory; MEDIUM on the override being drop-in — test it.**

### Client-Side PDF and DOCX Generation

#### PDF: use `jspdf@4.2.1` (MIT) — and this contradicts the usual advice

The received wisdom is "pdf-lib over jsPDF". **For this specific product that is wrong**, and the measurements show why. Real bundles, built with esbuild against realistic letter-generation code, minified:

| Option | Raw | Gzip | **Brotli** | Built-in TTF embed | Built-in word wrap |
|--------|-----|------|-----------|--------------------|--------------------|
| **`jspdf@4.2.1`** | 816 KB | 248 KB | **208 KB** | ✅ yes | ✅ `splitTextToSize` |
| `@cantoo/pdf-lib@2.9.2` core only | 707 KB | 282 KB | 224 KB | ❌ | ❌ |
| `@pdf-lib/fontkit@1.1.1` alone | 985 KB | 384 KB | **276 KB** | — | — |
| **pdf-lib + fontkit (what you'd actually ship)** | 1.66 MB | 653 KB | **488 KB** | ✅ | ❌ |

**pdf-lib + fontkit is 2.3× the brotli weight of jsPDF, and still leaves you to implement line wrapping by hand** via `font.widthOfTextAtSize()`. `@pdf-lib/fontkit` alone (276 KB brotli) is bigger than all of jsPDF — it carries full Unicode property tables.

And the decisive point: **Polish diacritics force font embedding either way.** pdf-lib's standard fonts use WinAnsiEncoding (CP1252), which does **not** contain `ą ć ę ł ń ś ź ż` — `drawText` throws `WinAnsi cannot encode`. So the fontkit dependency is mandatory, not optional. jsPDF has a TrueType parser, an `Identity-H` CMap writer **and a glyph subsetter built in** (verified in `jspdf.es.js`: `var Subset = function () {...}`, `font.metadata.subset.encode(font.metadata.glyIdsUsed, 1)`, 8 occurrences of `Identity-H`). Full Unicode, automatic subsetting, no extra package.

```ts
// letter-pdf.ts — dynamically imported on click, never in the initial bundle
const { jsPDF } = await import('jspdf');
const doc = new jsPDF({ unit: 'pt', format: 'a4' });
doc.addFileToVFS('SourceSerif.ttf', sourceSerifBase64);
doc.addFont('SourceSerif.ttf', 'SourceSerif', 'normal');   // → Identity-H, auto-subset
doc.setFont('SourceSerif').setFontSize(11);
doc.text(doc.splitTextToSize(letterBody, 475), 60, 80);
doc.save('artykul-7-wniosek.pdf');
```

**jsPDF caveats — all manageable, all worth writing down:**

- **`optionalDependencies` are a bloat trap.** `jspdf@4.2.1` declares optional deps on `canvg`, `core-js`, `dompurify`, `html2canvas`. These are only pulled in by the `.html()` and SVG APIs. **Never call `doc.html()`.** Install with `--omit=optional` (or pnpm `neverBuiltDependencies`) and add a bundle-size CI assertion. Verified: none of them appear in the 208 KB brotli bundle above.
- Runtime deps are `@babel/runtime`, `fflate ^0.8.1` (above the vulnerable range — clean), `fast-png`. `npm audit` on jsPDF alone: clean.
- **Base64 VFS inflates the font by ~33%.** Pre-subset the TTF to Latin + Latin-Ext-A before base64-ing it. A 50 KB subset becomes a ~67 KB string — acceptable inside a lazily-imported chunk, unacceptable in the entry bundle.
- Licence **MIT**, confirmed from `package/LICENSE`: *"(c) 2010-2025 James Hall … (c) 2015-2025 yWorks GmbH"*.

**❌ Do not use `pdf-lib@1.17.1`.** Last published **2021-11-06**. Five years unmaintained. If you must use the pdf-lib API, use the maintained fork **`@cantoo/pdf-lib@2.9.2`** (MIT, last published 2026-09-07) — but per the table above it costs you 2.3× the bytes.

**❌ Do not use `@react-pdf/renderer@4.9.0`.** Thirteen runtime dependencies including `pdfkit@0.20.1`, `prop-types`, `object-assign` and `@babel/runtime`. Worse for this project specifically: its `@react-pdf/font` API is built around `Font.register({ src: 'https://...' })` — **remote font URLs are the documented happy path**. On a zero-egress product that is a footgun pointed at the trust claim. Reject.

#### DOCX: use `docx@9.7.1` (MIT)

- Measured **103.5 KB gzip / 89.7 KB brotli** for a realistic `Document`/`Packer.toBlob()` bundle.
- Last published 2026-05-27. Actively maintained.
- Deps: `jszip ^3.10.1`, `nanoid ^5`, `xml`, `xml-js`, `hash.js`, `@types/node`. **`npm audit` on `docx@9.7.1`: zero vulnerabilities** — the jszip path-traversal advisory affects the jszip 2.x line, and docx resolves clean on 3.x.
- Browser-native: README states *"Works for Node and on the Browser"*, `Packer.toBlob()` returns a Blob ready for an object URL.
- Zero egress: it assembles OOXML and zips it in memory. No fetch.

> **Correction on the brief's premise: font embedding is NOT required for DOCX Polish diacritics.** OOXML is UTF-8 XML; `ą ć ę ł ń ó ś ź ż` are just characters in `<w:t>`. Rendering uses the *reader's* system font, and every Windows/macOS/Linux system font covers Polish. Set `w:rFonts` to a widely-available face (`Times New Roman` or `Calibri`) by name and stop there. **Do not embed fonts in the DOCX** — it inflates the file, and font EULAs for embedding are a licensing question you do not need. The hard font-embedding requirement is real for **PDF only**.

**❌ Do not use `html-docx-js@0.3.1` — DISQUALIFIED.** `npm audit` returns **high** severity:
- `lodash.merge` — *Prototype Pollution* (two separate advisories)
- `jszip` — *Path Traversal via `loadAsync`*

Last meaningful release was years ago; the transitive tree is stuck on abandoned versions. It also works by round-tripping HTML through Word's legacy `altChunk` mechanism, which produces documents that render inconsistently across Word/LibreOffice/Google Docs — unacceptable for a formal legal request a worker will actually send to their employer. Reject on both security and output-fidelity grounds.

### `.ics` Calendar File Generation

**Recommendation: hand-roll it in `packages/letters`. Do not add a dependency.**

| Option | Version | Licence | Measured brotli | Verdict |
|--------|---------|---------|-----------------|---------|
| **Hand-rolled** | — | yours | **~0 KB** | ✅ **Use** |
| `ics` | 3.12.0 | ISC | 21.4 KB | Fallback only |
| `ical-generator` | 11.1.1 | MIT | — | ❌ Node-oriented |

`ics@3.12.0` measures **24.2 KB gzip / 21.4 KB brotli** — and the bulk of that is `yup` (a full schema-validation library) plus `nanoid` and `runes2`. That is a disproportionate payload to emit one `VEVENT` on a mobile-first site chasing Lighthouse 100.

A single-`VEVENT` writer is roughly 40 lines, has zero dependencies, is trivially snapshot-testable alongside the letter templates, and lives naturally in `packages/letters` (which must stay dependency-light to sit next to the MIT engine).

**The pitfalls you must handle — these are why people reach for a library, and they are all easy once named:**

1. **CRLF line endings** — RFC 5545 requires `\r\n` between every content line. `\n` alone breaks Outlook.
2. **75-octet line folding** — lines longer than 75 *octets* must be folded with `\r\n ` (CRLF + single space). Fold on octets, not characters — a Polish employer name with diacritics is multi-byte in UTF-8 and naive character-counting will produce invalid output.
3. **Text escaping** — in `SUMMARY`/`DESCRIPTION`, escape `\` → `\\`, `;` → `\;`, `,` → `\,`, newline → `\n`.
4. **`UID` must be globally unique and stable.** Use `crypto.randomUUID()` + `@yourdomain`. Stable matters: if the user re-downloads, it should update rather than duplicate the event.
5. **`DTSTAMP` is mandatory** and must be UTC (`YYYYMMDDTHHMMSSZ`).
6. **Use `VALUE=DATE` for the deadline**, not a timestamp — "employer must respond by 12 November" is an all-day event, and a floating date avoids every timezone bug. This also means you ship **no VTIMEZONE block at all**, which removes the single biggest source of ICS complexity.
7. Serve as `text/calendar;charset=utf-8` via a Blob object URL with a `download` attribute.

Zero egress: trivially satisfied — it is string concatenation.

**Confidence: HIGH.**

### i18n: `astro:i18n` for routing + Paraglide JS for messages

Verified from the Astro i18n docs: **Astro's built-in i18n is routing only.** It gives you `getRelativeLocaleUrl()`, `getAbsoluteLocaleUrl()`, `getLocaleByPath()`, `Astro.currentLocale`, `Astro.preferredLocale`, plus config for `locales`, `defaultLocale`, `prefixDefaultLocale`, `fallback`/`fallbackType`, `routing: 'manual'` and `domains`. It provides **no message catalogue whatsoever** — that is explicitly a third-party concern.

So you need both layers.

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

**The React-island requirement is the deciding factor, and Paraglide handles it more cleanly than i18next.** Paraglide compiles each message into an exported ESM function. Both `.astro` files and React island components use the *exact same import*:

```ts
import { m } from '../paraglide/messages.js';
m.article7_request_heading();
m.deadline_notice({ days: 60 });
```

No provider, no context, no hook, no hydration boundary to cross. With i18next you must either mount an `I18nextProvider` around every island (and hydrate the catalogue into each island's props — real payload duplication across islands) or pass translated strings down as props from `.astro`, which is workable but fights you as the module count grows. Paraglide's model is: a function call is a function call, on the server or in the island.

Paraglide's own benchmark claims **47 KB vs 205 KB across 5 locales / 200 messages**. Given the roadmap explicitly plans EN+PL → SK, IT, LT → DE, NL, CS, SV, DA (10+ locales), that gap compounds exactly where this project is heading.

**Paraglide's own dependencies are all build-time** (`jiti`, `unplugin`, `commander`, `@inlang/sdk`, `valibot`, `consola`, `urlpattern-polyfill`). Verified: none of them reach the browser bundle. The emitted `src/paraglide/` output is dependency-free ESM you can read and commit.

**Astro setup** (adapt the official Astro guide to static output):

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';

export default defineConfig({
  output: 'static',
  i18n: {
    locales: ['en', 'pl'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },  // /  and  /pl/
    fallback: { pl: 'en' },
    fallbackType: 'rewrite',
  },
  security: { csp: { directives: [ /* see CSP section */ ] } },
  vite: {
    plugins: [
      tailwind(),
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/paraglide',
        emitTsDeclarations: true,
        strategy: ['url', 'baseLocale'],   // no cookies — matches the cookieless claim
        // experimentalStaticLocale: true, // see note
      }),
    ],
  },
});
```

Two configuration points that matter here:

- **`strategy: ['url', 'baseLocale']`.** The default is `['cookie', 'globalVariable', 'baseLocale']`. **Drop `cookie`** — the project promises cookieless, and a locale cookie would be an embarrassing contradiction in a privacy audit even though it is functionally harmless. URL-based locale is also the only strategy that works correctly on a fully static CDN.
- **`experimentalStaticLocale`.** Without it, Paraglide tree-shakes unused *messages* but **every locale's strings still land in the shared bundle** — so 10 locales means 10× the string payload in one file. `experimentalStaticLocale` enables compile-time locale constants and true per-locale splitting, but the docs state it *"only works in SSR/SSG environment without client-side routing."* **That is precisely this project** (static output, and you must avoid `<ClientRouter />` for CSP reasons anyway — see below). At EN+PL the default is fine; **turn this on before the SK/IT/LT wave**, and flag it as a roadmap item rather than a v1 blocker. **Confidence: HIGH on the mechanism; MEDIUM on `experimentalStaticLocale` stability, since it is flagged experimental.**

**❌ Do not use `astro-i18next`** — still `1.0.0-beta.21`, predates Astro's built-in i18n, effectively abandoned.
**❌ Do not use `@lingui/*`** — good library, but its macro-based extraction adds Babel to an otherwise Babel-free Vite build.

### Monorepo Tooling

**Recommendation: `pnpm` workspaces + catalogs. No Turborepo. No Nx. Not yet.**

| Tool | Version | Licence | Verdict |
|------|---------|---------|---------|
| **`pnpm` workspaces** | **12.3.4** | MIT | ✅ **Use** |
| **pnpm catalogs** | (since 10.12.1) | MIT | ✅ **Use** |
| `turbo` | 2.10.12 | MIT | ⏳ Add later, if CI hurts |
| `nx` | 23.2.1 | MIT | ❌ Disproportionate |

The workspace is **five packages and one app**: `directive-engine`, `country-data`, `letters`, `adapters-*`, `apps/web`. The dependency graph is close to a straight line — engine ← adapters ← web, with `country-data` and `letters` as leaves. There is no fan-out for a task orchestrator to exploit.

pnpm alone gives you: strict isolation (a package cannot import something it did not declare — which is how you *mechanically enforce* `directive-engine`'s zero-runtime-deps rule), `pnpm -r --filter` for scoped runs, `workspace:*` protocol, and topological ordering of `pnpm -r build` for free.

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'

catalog:
  typescript: ^7.0.2
  vitest: ^4.1.11
  '@playwright/test': ^1.63.0
  react: ^19.3.0
  react-dom: ^19.3.0

overrides:
  fflate: ^0.8.3     # GHSA-px8p-9vwx-vf98, pulled in by satori
```

Then every `package.json` writes `"typescript": "catalog:"`. **Catalogs are the single highest-value monorepo feature for this project** — they stop `directive-engine` and `apps/web` drifting onto different TypeScript versions, which is how golden-vector tests start passing locally and failing in CI.

**Turborepo is a premature optimisation here, but name the trigger:** add `turbo` when CI wall-clock exceeds ~3 minutes, or when you have more than about ten packages. Its value is remote caching and task-graph parallelism; with six packages and a Vitest suite that runs in seconds, `pnpm -r test && pnpm -r build` is faster than Turbo's own startup. Adding it later is a 20-line `turbo.json` — genuinely reversible, so defer without regret.

**Nx: no.** Generators, plugins, a daemon and a project graph for six packages. It also wants to own your build config, which conflicts with `directive-engine` publishing a hand-auditable artifact.

**CI enforcement of the zero-dep rule** — put this in the pipeline, do not rely on discipline:

```bash
node -e "const p=require('./packages/directive-engine/package.json');
  if (Object.keys(p.dependencies ?? {}).length) { console.error('directive-engine gained a runtime dep'); process.exit(1); }"
```

### Testing

| Tool | Version | Licence | Purpose |
|------|---------|---------|---------|
| **`vitest`** | **4.1.11** | MIT | Engine golden vectors, letter snapshots |
| **`@playwright/test`** | **1.63.0** | Apache-2.0 | CTA smoke suite vs deployed URL |

**Pin Vitest 4, not 5.** `vitest@5.0.0` is real and stable, but it shipped **2026-09-03 — one week ago** — and no `5.0.1` exists yet. It also raises the Node floor to `^22.12.0 || ^24 || >=26` (Vitest 4: `^20 || ^22 || >=24`). For a project whose test suite is the *evidence* behind a legal-compliance engine, running on a seven-day-old major is uncompensated risk. **Revisit at 5.1.** **Confidence: HIGH.**

**Golden-vector TDD for `directive-engine`.** The brief mandates worked-example-first. Structure it so the vectors are data, not code — a compensation analyst should be able to audit them without reading TypeScript:

```
packages/directive-engine/
  test/vectors/
    art9-mean-median-basic.json          # input rows + expected 7 metrics
    art9-quartiles-tie-handling.json
    art10-threshold-exactly-5pct.json    # boundary: is 5.0% "at or above"? (yes)
    art9-small-group-suppression.json    # <6 per sex per category
```

```ts
import { describe, it, expect } from 'vitest';
const vectors = import.meta.glob('./vectors/*.json', { eager: true });
describe.each(Object.entries(vectors))('%s', (name, v) => {
  it('matches the worked example', () => {
    expect(computeArticle9(v.input)).toStrictEqual(v.expected);
  });
});
```

`import.meta.glob` means **adding a vector file is adding a test** — no registration step, which is what keeps community-contributed vectors frictionless. Use `toStrictEqual`, not `toEqual`, so a stray `undefined` key cannot pass.

**Letter snapshots per locale.** Use `toMatchFileSnapshot()` rather than inline snapshots — it writes real `.txt` files a native-speaker reviewer can open, comment on and diff in a PR. That is the HITL step the brief requires, and it only works if the snapshot is a readable artifact:

```ts
for (const locale of ['en', 'pl'] as const) {
  for (const country of ALL_27) {
    it(`${country}/${locale}`, async () => {
      await expect(renderArticle7Letter({ country, locale, ...FIXTURE }))
        .toMatchFileSnapshot(`./__snapshots__/${country}.${locale}.txt`);
    });
  }
}
```

This makes "Slovakia's legal citation changed" a one-line reviewable diff instead of a silent regression.

**Playwright against the deployed Cloudflare Pages URL.** The brief calls this a deploy gate born of a past incident, so wire it as one:

```ts
// playwright.config.ts
export default defineConfig({
  use: { baseURL: process.env.DEPLOY_URL ?? 'http://localhost:4321' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },   // mobile-first: this one first
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Run it against the **Cloudflare preview deployment URL** on every PR and against production post-deploy. Two assertions matter more than the rest:

1. **Every CTA is exercised end-to-end** — clicked, and the resulting artifact verified (`download.suggestedFilename()`, PDF magic bytes `%PDF-`, DOCX magic bytes `PK\x03\x04`).
2. **A network-egress assertion that mechanically proves the headline claim.** This is the test that makes the README screenshot honest:

```ts
test('no user data leaves the browser', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', r => {
    const u = new URL(r.url());
    if (u.origin !== new URL(page.url()).origin &&
        !u.hostname.endsWith('cloudflareinsights.com')) offOrigin.push(r.url());
  });
  await page.goto('/pl/kalkulator-art-9');
  await page.setInputFiles('input[type=file]', 'fixtures/payroll.xlsx');
  await expect(page.getByTestId('mean-gap')).toBeVisible();
  expect(offOrigin, `unexpected egress: ${offOrigin.join(', ')}`).toEqual([]);
});
```

Make that test a required status check. It is the difference between claiming zero egress and proving it on every commit.

### Strict CSP on Cloudflare Pages

This is the requirement most likely to be discovered late, so here is the concrete answer.

#### Does Astro require inline-script allowances? Yes — and `security.csp` solves it.

Astro's island hydration emits inline `<script>` and `<style>` into the built HTML. Without help you would need `'unsafe-inline'`, which defeats the point. **`security.csp` (stable since Astro 6.0.0) hashes them for you** and injects a `<meta http-equiv="content-security-policy">` into every page's `<head>` at build time — including fully static pages, since the meta lands in the emitted HTML.

```js
// astro.config.mjs
security: {
  csp: {
    algorithm: 'SHA-256',                      // or SHA-384 / SHA-512
    directives: [
      "default-src 'none'",
      "connect-src 'self'",                    // the headline claim
      "img-src 'self' data:",
      "font-src 'self'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "worker-src 'self'",                     // your CSV/XLSX worker
      "object-src 'none'",
    ],
    scriptDirective: {
      resources: ["'self'", 'https://static.cloudflareinsights.com'],
    },
  },
},
```

`script-src` and `style-src` are generated automatically with per-page hashes; `directives` adds everything else. There is also a runtime API (`Astro.csp.insertDirective()`, `Astro.csp.insertStyleResource()`) for per-page additions, and Astro deduplicates config-level and runtime-level resources into one meta element.

**Four verified limitations you must design around:**

1. **`<ClientRouter />` view transitions are not supported.** Astro's docs recommend migrating to the native View Transition API instead. Decide this in Phase 1 — retrofitting is painful. (Convenient side effect: no client-side routing is also the precondition for Paraglide's `experimentalStaticLocale`.)
2. **Shiki is not supported** — it emits inline styles that cannot be hashed. Use `<Prism />` if you need syntax highlighting (you probably do not).
3. **External scripts and styles are not supported out of the box** — you must supply hashes or list origins via `scriptDirective.resources` / `styleDirective.resources`.
4. **It does not work in `dev`** (Vite injects its own inline scripts). **Test with `astro build && astro preview`**, and add a CI step that greps the built HTML for the meta tag. Otherwise you will ship a broken policy.

Also worth internalising: *"When `'unsafe-inline'` is included as a resource in a directive, Astro will not emit hashes on that directive"* — per spec, browsers ignore hashes when `'unsafe-inline'` is present, so Astro suppresses them to preserve the behaviour you asked for. **One stray `'unsafe-inline'` silently downgrades that whole directive.** Guard it with a test.

#### Cloudflare Web Analytics fits inside `connect-src 'self'` — the H5 decision pays off exactly as hoped

Verified from the Cloudflare Web Analytics FAQ:

- Script: **`https://static.cloudflareinsights.com/beacon.min.js`** → needs `script-src https://static.cloudflareinsights.com`.
- Data endpoint: with **automatic setup on a proxied domain, the beacon reports to your own domain's `/cdn-cgi/rum`** — a *same-origin* POST. With manual setup it reports to `cloudflareinsights.com`.

**Therefore: use the automatic (proxied) injection, and `connect-src 'self'` is sufficient.** No third-party origin in `connect-src` at all. This is a materially stronger privacy posture than Plausible could offer and validates decision H5 on the exact axis it was decided on.

Two operational notes:
- **Automatic injection breaks if you send `Cache-Control: public, no-transform`** — Cloudflare's proxy cannot rewrite the payload. Check your `_headers` for `no-transform`.
- The snippet is an *external* script with a `data-cf-beacon` attribute, not an inline script — so it needs an origin allowance, not a hash.

#### Belt and braces: also set the header via `_headers`

Verified from the Workers static-assets headers docs: the `_headers` file works, **max 100 rules, max 2,000 characters per line** — ample for a full CSP.

```
# apps/web/public/_headers
/*
  Content-Security-Policy: default-src 'none'; connect-src 'self'; img-src 'self' data:; font-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; worker-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(), camera=(), microphone=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
```

> **⚠️ Gotcha that will cost you an afternoon.** When a CSP arrives in **both** a header and a `<meta>` tag, browsers enforce **the intersection** — every policy must independently allow a resource. Astro's meta carries per-page script/style *hashes* that your static header cannot know. If your header says `script-src 'self'` and Astro's meta says `script-src 'self' 'sha256-…'`, the intersection is `'self'` and **your hashed inline hydration scripts are blocked**. Pick one of:
>
> - **(a) Recommended:** let Astro own `script-src`/`style-src` via the meta tag, and put only the *non-hash* directives in `_headers` — omitting `script-src` and `style-src` from the header entirely.
> - **(b)** Skip Astro's CSP feature and hand-manage everything in `_headers` with `'unsafe-inline'`. Do not do this.
>
> **Roll out with `Content-Security-Policy-Report-Only` first**, on a Cloudflare preview deployment, and read the console before switching to enforcing.

#### The one place "zero egress" needs an honest asterisk

**The Module B share-card URL carries the user's inputs as query params to a Cloudflare Worker.** That is, by design, user-derived data leaving the browser — and it is not covered by `connect-src`, because an OG image is loaded via `img-src` / fetched by the *sharing platform's* crawler, not by your page.

This is defensible and probably fine, but the README must say so plainly or a reviewer will find it and frame it as a gotcha. Mitigations to design in from Phase 1:

- Put only **rounded, derived** figures in the URL (a gap percentage and a bucketed lifetime total), never raw salary.
- Make sharing an **explicit user action** with a preview of exactly what the URL contains.
- **Disable Worker request logging** for the OG route, and say so in the README.
- State it in the privacy section: *"Nothing leaves your browser unless you press Share, and then only the rounded figures visible on the card."*

Getting ahead of this is worth more than the feature it qualifies.

### npm Publishing: `directive-engine` (MIT, zero runtime deps)

**Recommendation: plain `tsc`, ESM-only, published with Trusted Publishing.**

| Option | Version | Licence | Verdict |
|--------|---------|---------|---------|
| **plain `tsc`** | (typescript 7.0.2) | Apache-2.0 | ✅ **Use** |
| `tsdown` | 0.23.0 | MIT | ⏳ Promising, pre-1.0 |
| `tsup` | 8.5.1 | MIT | ❌ Slowing down |
| `unbuild` | 3.6.1 | MIT | ❌ Overkill |

**Why plain `tsc` and not a bundler.** The package is pure TypeScript with **zero runtime dependencies** — there is, by definition, nothing to bundle. A bundler's entire value proposition (resolving and inlining dependencies) is null here. What you gain by skipping it is the thing the brief actually asks for: *"a README a compensation analyst can audit."* `tsc` emits one readable `.js` per source file, with the same structure as the source. A reviewer can open `dist/article9.js` and check the median calculation. A minified rollup bundle destroys that, and auditability is the whole marketing position of this package.

Also: `tsup@8.5.1` last shipped 2025-11-12 and its cadence has clearly slowed; `tsdown@0.23.0` (Rolldown-based, from the Vite team) is the presumptive successor but is still **pre-1.0**. Neither is a good bet for the project's flagship artifact. Sidestep the question.

**Why ESM-only, not dual ESM/CJS.** The brief asks for dual, but the ground has moved and dual is now the wrong default. Verified from the Node.js docs:

> **`require()` of ESM: "Version 25.4.0: This feature is no longer experimental."** Unflagged since v22.12.0 / v20.19.0. Restriction: the module must be fully synchronous (no top-level `await`).

`directive-engine` is synchronous arithmetic over arrays. It has no top-level `await` and never will. So a CommonJS consumer on Node ≥20.19 can simply `require('@yourorg/directive-engine')` and it works. Meanwhile Astro 7 already requires Node ≥22.12.

Dual publishing costs you the **dual-package hazard** (two module instances, `instanceof` failures across the boundary), doubled build config, doubled `exports` maps, and a whole class of "are the types wrong" bugs. Ship ESM-only. If a real consumer on an old Node appears, add CJS then — you will have a name and a reason.

```jsonc
// packages/directive-engine/package.json
{
  "name": "@yourorg/directive-engine",
  "version": "1.0.0",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=20.19.0" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<org>/<repo>.git",
    "directory": "packages/directive-engine"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "prepublishOnly": "pnpm build && publint && attw --pack ."
  }
}
```

`repository.url` **must match the building repository, case-sensitively**, or provenance generation fails. In a monorepo, set `repository.directory` too.

**Validate before publishing**, both dev-only:
- **`publint@0.3.24`** (MIT) — catches broken `exports` maps, wrong `types` ordering, missing files.
- **`@arethetypeswrong/cli@0.18.5`** (MIT) — catches type-resolution failures under `node16`/`bundler` resolution. This is the tool that catches the class of bug that makes a package unusable for half its audience.

**Provenance / Trusted Publishing.** Verified from the npm docs:

> *"If you use trusted publishing, provenance attestations are automatically generated for your packages without requiring the `--provenance` flag."*

Requirements: `permissions: id-token: write`, a GitHub-hosted runner, and npm CLI ≥ 9.5.0.

```yaml
name: Publish directive-engine
on:
  release: { types: [published] }
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write          # required for OIDC provenance
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: '24.x'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @yourorg/directive-engine test    # golden vectors gate the publish
      - run: pnpm --filter @yourorg/directive-engine build
      - run: npm publish --provenance --access public
        working-directory: packages/directive-engine
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Configure Trusted Publishing in npm's package settings and drop `NODE_AUTH_TOKEN` entirely.** No long-lived token in repo secrets is both better security and a better story for a package whose selling point is trustworthiness. The green "Provenance" badge on npm is doing real marketing work for a lead-magnet package aimed at compliance professionals.

**Release management:** `@changesets/cli@3.0.2` (MIT) if you want changelog automation. Optional at one publishable package. (Beware: the bare `changesets` name on npm is a different, unrelated package — you want `@changesets/cli`.)

---

## Installation

```bash
# --- root ---
pnpm add -Dw astro@7.3.2 typescript@7.0.2 vitest@4.1.11 @playwright/test@1.63.0
pnpm add -Dw publint@0.3.24 @arethetypeswrong/cli@0.18.5 @changesets/cli@3.0.2

# --- apps/web ---
pnpm --filter web add react@19.3.0 react-dom@19.3.0
pnpm --filter web add -D @astrojs/react@6.0.5 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
pnpm --filter web add @inlang/paraglide-js@2.25.1

# Module D — spreadsheet parsing (lazy-loaded, zero egress)
pnpm --filter web add papaparse@5.7.0 read-excel-file@9.3.10
pnpm --filter web add -D @types/papaparse

# Module A — document export (lazy-loaded behind the download buttons)
pnpm --filter web add --omit=optional jspdf@4.2.1     # --omit=optional is load-bearing
pnpm --filter web add docx@9.7.1
#   .ics: hand-rolled in packages/letters — no dependency

# --- og-worker (separate wrangler project) ---
pnpm --filter og-worker add satori@0.33.4 @resvg/resvg-wasm@2.6.2
pnpm --filter og-worker add -D wrangler@4.130.0 @cloudflare/workers-types

# --- build-time font subsetting ---
pnpm add -Dw subset-font@2.7.0 @fontsource/inter@5.3.0

# packages/directive-engine: NO runtime dependencies. Ever. Enforced in CI.
```

---

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

---

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

---

## Measured Bundle Budget

All figures measured locally on 2026-09-10 with `esbuild --bundle --minify --format=esm --platform=browser`, against realistic usage code. **Everything below the line is dynamically imported** and costs the landing page nothing — critical for the Lighthouse 100 gate on mobile.

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

Enforce this with a bundle-size CI check. The rule that matters: **no export library may ever enter the entry chunk.** Every one of them sits behind a `await import()` inside a click handler.

---

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

---

## Gaps to Resolve in Phase 0/1

1. **Benchmark one OG render** with `wrangler dev --remote` and read the CPU figure. Confirms the Workers Paid requirement with a number instead of an inference. *(The only MEDIUM that could change a decision.)*
2. **Decide Astro 5 vs 7 explicitly, as a logged decision.** The stack lock predates Astro 7 and Astro 5's last patch (2026-05-26). This directly determines whether CSP is a stable feature or an experimental one.
3. **Decide Cloudflare Pages vs Workers Static Assets.** Pages is not deprecated, but Cloudflare's own docs enumerate features Pages lacks. Greenfield in late 2026 leans Workers Static Assets; either satisfies "deployed on Cloudflare."
4. **Prototype the `_headers` + Astro-meta CSP interaction on a real preview deployment** before building on it. The intersection semantics will bite, and it is a one-hour spike now versus a launch-day outage later.
5. **Verify a real payroll `.xlsx` through `read-excel-file`.** Get one anonymised export from an actual HRIS (Symfonia/enova/SAP for PL) — merged header cells and multi-row headers are where XLSX parsers actually fail, not in the format spec.
6. **Confirm the `fflate` override does not break OG rendering.**
7. **Write the share-card egress asterisk into the privacy copy now**, before Module B is built. It is far easier to design the URL payload correctly than to retrofit it after the first share card ships.
