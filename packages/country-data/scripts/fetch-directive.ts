/**
 * Build-time retrieval of Directive (EU) 2023/970 primary text from the Publications
 * Office Cellar API (D-01). devDependency-only: nothing here ships to a browser.
 *
 * Run with Node's native type stripping, no script runner:
 *   node packages/country-data/scripts/fetch-directive.ts
 *
 * D-01 is discharged: a GitHub Actions runner reached this endpoint and received
 * 200 / 193,564 bytes with the `art_7` subtree present. See
 * `.github/workflows/cellar-reachability.yml`.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MAX_BODY_BYTES,
  SourceDefect,
  normaliseForMatch,
  scopeToSubdivision,
  textOf,
} from '../src/verifier.ts';

// Re-exported so a caller can reach the retrieval helpers and the verifier primitives
// they depend on from one module. `MAX_BODY_BYTES` is IMPORTED, never redeclared: two
// copies of a byte cap drift, and a silently loosened cap is the same class of failure
// as a weakened byte floor.
export { SourceDefect, normaliseForMatch, MAX_BODY_BYTES };

export const CELEX = '32023L0970';
export const BASE = `http://publications.europa.eu/resource/celex/${CELEX}`;

export type FetchUnchanged = { unchanged: true; etag: string };
export type FetchFresh = {
  unchanged: false;
  body: string;
  etag: string | null;
  lastModified: string | null;
  /**
   * `res.url` after the 303. For EN this resolves to
   * `http://publications.europa.eu/resource/cellar/5bbb9daf-…-01aa75ed71a1.0006.03/DOC_1`.
   *
   * Recorded as a CITATION only. Always fetch via the CELEX id plus `Accept-Language`:
   * the `.0006.` segment is a manifestation SEQUENCE INDEX, not a language code, and it
   * is not derivable from the language (EN is `.0006.`, PL `.0018.`, IT `.0013.` — the
   * ordering is not alphabetical). It must be discovered once per language and recorded,
   * never computed.
   */
  pinnedUri: string;
};

/**
 * GET the Directive in one language.
 *
 * `lang3` is ISO-639-3 — verified working for eng, pol, slk, ita, lit, mlt, deu, nld,
 * ces, swe, dan. An invalid value returns 400 with NO silent fallback to a default
 * language, which is exactly the behaviour a verifier wants.
 */
export async function fetchExpression(
  lang3: string,
  knownEtag?: string,
): Promise<FetchUnchanged | FetchFresh> {
  const headers: Record<string, string> = {
    Accept: 'application/xhtml+xml',
    'Accept-Language': lang3,
  };
  if (knownEtag !== undefined) headers['If-None-Match'] = knownEtag;

  const res = await fetch(BASE, { headers, redirect: 'follow' });

  // 304 BEFORE any body check: a legitimate revalidation carries zero bytes, and a byte
  // floor applied first would turn a successful cache hit into a hard failure.
  if (res.status === 304) {
    if (knownEtag === undefined) {
      throw new SourceDefect('304 received without having sent If-None-Match');
    }
    return { unchanged: true, etag: knownEtag };
  }

  // MUST be an exact 200. `res.ok` is true for 202, and the eur-lex.europa.eu web front
  // end answers 202 with a zero-length body — so `if (!res.ok) throw` lets it through.
  if (res.status !== 200) {
    throw new SourceDefect(
      res.status === 202
        ? `202 with empty body for ${BASE} (${lang3}) — this source is behind an anti-automation gate; it cannot be verified by fetch. Use manual-attest or an alternative source.`
        : `expected 200, got ${res.status} for ${BASE} (${lang3})`,
    );
  }

  const body = await res.text();
  if (body.length === 0) {
    throw new SourceDefect(`empty body on a 200 for ${BASE} (${lang3}) — a 200 is not evidence`);
  }
  if (body.length > MAX_BODY_BYTES) {
    throw new SourceDefect(
      `body for ${BASE} (${lang3}) is ${body.length} bytes, above the ${MAX_BODY_BYTES}-byte cap`,
    );
  }

  return {
    unchanged: false,
    body,
    etag: res.headers.get('etag'),
    lastModified: res.headers.get('last-modified'),
    pinnedUri: res.url,
  };
}

export type ExtractedParagraph = {
  /** `32023L0970#007.004`. The publisher's own id — language-invariant. */
  citationKey: string;
  /** The paragraph's raw XHTML. */
  html: string;
  /** The paragraph's text, RAW: U+00A0 and U+2019 preserved exactly as published. */
  text: string;
  article: number;
  paragraph: number;
};

/**
 * Locate one paragraph by the publisher's own structural ids.
 *
 * Scope FIRST, always. "within a reasonable period of time" also occurs in a recital
 * about joint pay assessments, at a byte offset far below Art. 7(4); an unscoped search
 * would extract the recital and every downstream layer would agree with it.
 *
 * Do not locate an article by searching for its title text: "Article 7" with an ASCII
 * space occurs ZERO times in the authentic document.
 */
export function extractParagraph(xhtml: string, article: number, para: number): ExtractedParagraph {
  const artId = `art_${article}`;
  const paraId = `${String(article).padStart(3, '0')}.${String(para).padStart(3, '0')}`;

  const scope = scopeToSubdivision(xhtml, artId);
  if (scope === null) {
    throw new SourceDefect(`article container id="${artId}" absent from the document`);
  }

  const pAttr = scope.indexOf(`id="${paraId}"`);
  if (pAttr < 0) {
    throw new SourceDefect(
      `paragraph id="${paraId}" absent from inside id="${artId}" — the article is present but the cited paragraph is not`,
    );
  }
  // Back up to the '<' opening the div that carries the id. Slicing from the attribute
  // leaves an `id="007.004">` fragment that the tag stripper cannot remove, and it would
  // be stored as though it were part of the quotation.
  const pOpen = scope.lastIndexOf('<', pAttr);
  const pStart = pOpen < 0 ? pAttr : pOpen;

  // A paragraph runs from its own id to the start of the next sibling paragraph div,
  // or to the end of the article scope for the last paragraph.
  const rest = scope.slice(pStart);
  const nextIdx = rest.slice(1).search(/<div id="\d{3}\.\d{3}"/);
  const html = nextIdx < 0 ? rest : rest.slice(0, nextIdx + 1);

  return {
    citationKey: `${CELEX}#${paraId}`,
    html,
    // RAW. Normalisation is for matching only — normalising into storage would silently
    // rewrite the Official Journal. Only ASCII whitespace is collapsed and trimmed:
    // JavaScript's `\s` matches U+00A0, so the obvious `.replace(/\s+/g,' ').trim()`
    // would destroy the authentic no-break spaces this fact exists to preserve.
    text: textOf(html)
      .replace(/[ \t\r]*\n[ \t\r]*/g, ' ')
      .replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, ''),
    article,
    paragraph: para,
  };
}

/**
 * Seed `data/_directive.json` with Art. 7(4) EN.
 *
 * This writes ONE fact. The remaining articles and locales are plan 01-03.
 */
async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = resolve(here, '..');

  const res = await fetchExpression('eng');
  if (res.unchanged) throw new SourceDefect('unexpected 304 on an unconditional GET');

  const extracted = extractParagraph(res.body, 7, 4);
  const today = new Date().toISOString().slice(0, 10);
  const anchor = 'within a reasonable period of time but in any event within two months';

  // Fail loudly rather than write an unverifiable fact: the anchor must be present in
  // the paragraph we are about to store, or the extraction found the wrong thing.
  if (!normaliseForMatch(extracted.text).includes(normaliseForMatch(anchor))) {
    throw new SourceDefect(
      `the Art. 7(4) anchor is absent from the extracted paragraph. Extracted: ${extracted.text}`,
    );
  }

  const fact = {
    [extracted.citationKey]: {
      value: {
        text: extracted.text,
        citation_key: extracted.citationKey,
        article: extracted.article,
        paragraph: extracted.paragraph,
      },
      status: 'verified',
      volatility: 'stable',
      verified_at: today,
      verified_by: null,
      sources: [
        {
          url: res.pinnedUri,
          title: 'Directive (EU) 2023/970 — Article 7, Right to information',
          publisher: 'Publications Office of the European Union',
          kind: 'eu_institution',
          verification: 'cellar',
          anchor,
          language: 'en',
          published_at: '2023-05-17',
          accessed_at: today,
          etag: res.etag ?? undefined,
          last_modified: res.lastModified ?? undefined,
          scope: { id: 'art_7', expected_subtitle: 'Right to information' },
        },
      ],
    },
  };

  const outPath = resolve(pkgRoot, 'data', '_directive.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(fact, null, 2)}\n`, 'utf8');

  const fixturePath = resolve(pkgRoot, 'test', 'fixtures', 'cellar-art7-en.xhtml');
  mkdirSync(dirname(fixturePath), { recursive: true });
  writeFileSync(fixturePath, res.body, 'utf8');

  process.stdout.write(
    [
      `pinned expression URI: ${res.pinnedUri}`,
      `ETag:                  ${res.etag}`,
      `Last-Modified:         ${res.lastModified}`,
      `body bytes:            ${res.body.length}`,
      `citation key:          ${extracted.citationKey}`,
      `wrote:                 ${outPath}`,
      `wrote fixture:         ${fixturePath}`,
      '',
    ].join('\n'),
  );
}

// Run `main` only when this file is the entry point, so the exported functions stay
// importable from the spine test without firing a network fetch.
const entry = process.argv[1];
if (entry !== undefined && fileURLToPath(import.meta.url) === resolve(entry)) {
  await main();
}
