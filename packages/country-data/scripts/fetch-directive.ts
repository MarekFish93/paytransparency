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
  byteLengthOf,
  normaliseForMatch,
  textOf,
} from '../src/verifier.ts';
import { CELEX, citationKey, extractArticle, extractParagraph, listParagraphIds } from '../src/extract.ts';

// Re-exported so a caller can reach the retrieval helpers and the verifier primitives
// they depend on from one module. `MAX_BODY_BYTES` is IMPORTED, never redeclared: two
// copies of a byte cap drift, and a silently loosened cap is the same class of failure
// as a weakened byte floor. `byteLengthOf` is imported for the same reason — this script
// and the verifier must agree on what "bytes" means, and `String.length` is not it.
export { SourceDefect, normaliseForMatch, MAX_BODY_BYTES, byteLengthOf };

// `extractParagraph` moved to `src/extract.ts` in plan 01-03, where it became a thin
// wrapper over `extractArticle` so the package holds exactly ONE scoping implementation.
// It is re-exported from its original module path so plan 01-01's spine test — which
// imports it from here — keeps passing unchanged.
export { CELEX, citationKey, extractArticle, extractParagraph, listParagraphIds };

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
  const bodyBytes = byteLengthOf(body);
  if (bodyBytes === 0) {
    throw new SourceDefect(`empty body on a 200 for ${BASE} (${lang3}) — a 200 is not evidence`);
  }
  if (bodyBytes > MAX_BODY_BYTES) {
    throw new SourceDefect(
      `body for ${BASE} (${lang3}) is ${bodyBytes} bytes, above the ${MAX_BODY_BYTES}-byte cap`,
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

/**
 * The articles this product cites (LEGAL-07).
 *
 * Fixed, and deliberately not "every article": each entry is a provision the
 * worker-facing or employer-facing surface quotes, and every one must be re-pullable
 * from primary text. Art. 3 definitions and Art. 9 metrics are the ENG-06 substrate;
 * Art. 6 and Art. 7 are the pair the original brief conflated; Art. 10 is the joint pay
 * assessment; Art. 12 carries the identifiability provision that the same brief replaced
 * with a six-person threshold that does not exist anywhere in the Directive.
 */
export const CITED_ARTICLES = [3, 6, 7, 9, 10, 12] as const;

/**
 * The authentic language versions held (D-03).
 *
 * ISO-639-3, which is what the Cellar API's `Accept-Language` speaks. An authentic-text
 * language is NOT the same thing as a shipped interface locale: the interface is English
 * and Polish at launch, but all twenty-four language versions of the Directive are
 * equally authentic in law, and D-03 chose to hold every served locale so that a Polish
 * letter quotes authentic Polish wording rather than a translation of the English.
 *
 * Every code below was retrieved successfully during research. An invalid code returns
 * 400 with no silent fallback to a default language, so a typo here fails loudly rather
 * than quietly storing English text under another language's key.
 */
export const SERVED_LANGUAGES = [
  'eng',
  'pol',
  'slk',
  'ita',
  'lit',
  'mlt',
  'deu',
  'nld',
  'ces',
  'swe',
  'dan',
] as const;

export type ServedLanguage = (typeof SERVED_LANGUAGES)[number];

/**
 * ISO-639-3 (what Cellar speaks) → BCP-47 (what `Source.language` and a browser speak).
 *
 * A table, not a derivation: `slk`→`sk` and `ces`→`cs` do not follow the same rule as
 * `eng`→`en`, and a truncation that happens to work for nine of eleven codes is a bug
 * waiting for the tenth.
 */
export const BCP47: Record<ServedLanguage, string> = {
  eng: 'en',
  pol: 'pl',
  slk: 'sk',
  ita: 'it',
  lit: 'lt',
  mlt: 'mt',
  deu: 'de',
  nld: 'nl',
  ces: 'cs',
  swe: 'sv',
  dan: 'da',
};

/** The date the Directive was published in the Official Journal. */
const PUBLISHED_AT = '2023-05-17';

/** Structural shape of what `extractArticle` returns. */
type ExtractedArticleShape = ReturnType<typeof extractArticle>;

/** `32023L0970#007@eng` — one article in one authentic language version. */
export const corpusKey = (article: number, lang3: string): string =>
  `${CELEX}#${String(article).padStart(3, '0')}@${lang3}`;

/**
 * Choose the anchor the verifier will assert for one article, in one language.
 *
 * The anchor is NOT hand-authored. Eleven languages times six articles is sixty-six
 * anchors, and a hand-typed "verbatim" phrase in a language the author does not read is
 * exactly the failure this corpus exists to prevent — it would certify itself. So the
 * anchor is cut from the retrieved bytes and then PROVED distinctive by a negative
 * search over the whole document: a candidate that also occurs outside the `art_N`
 * subtree is rejected, because an anchor that matches a recital verifies text that is
 * not the cited provision (threat T-1-11, and the reproduced "Article 10 TFEU"
 * collision in recital 25).
 *
 * Deterministic by construction — same document in, same anchor out — so a re-run is
 * idempotent rather than churning the committed file.
 */
function chooseAnchor(
  wholeDocument: string,
  article: ExtractedArticleShape,
  lang3: string,
): string {
  // The haystack must be measured on the SAME instrument the verifier uses —
  // `normaliseForMatch(textOf(...))`, tags stripped. Searching the tagged markup instead
  // silently misses every phrase that spans a tag boundary, which in this document means
  // every lettered definition in Article 3: the uniqueness claim would then be a claim
  // about the markup rather than about the text, and an anchor is asserted against text.
  const haystack = normaliseForMatch(textOf(wholeDocument));
  const scoped = normaliseForMatch(textOf(article.rawHtml));

  const candidates: string[] = [];
  for (const paragraph of Object.values(article.paragraphs)) {
    // Drop the leading paragraph marker ("4.   ") so the anchor reads as a phrase of the
    // provision rather than as its numbering, which repeats across every article.
    const body = normaliseForMatch(textOf(paragraph.rawHtml)).replace(/^\d+\.\s*/, '');
    if (body.length <= 40) continue;
    // Widening windows: the shortest distinctive phrase first, falling back to more of
    // the sentence when a short one also occurs elsewhere in the document.
    for (const width of [80, 120, 200, 400]) {
      const cut = body.slice(0, Math.min(width, body.length));
      // Trim to a word boundary so the anchor never ends mid-word.
      const boundary = cut.length < body.length ? cut.lastIndexOf(' ') : cut.length;
      const candidate = cut.slice(0, boundary > 40 ? boundary : cut.length).trim();
      if (candidate.length >= 40) candidates.push(candidate);
    }
  }

  for (const candidate of candidates) {
    if (!scoped.includes(candidate)) continue;
    // Exactly once in the WHOLE document: the occurrence inside the cited article, and
    // nowhere else. Two `indexOf` calls rather than a regex — the candidate is arbitrary
    // retrieved text and would have to be escaped to be safe in a pattern.
    const first = haystack.indexOf(candidate);
    if (first < 0) continue;
    if (haystack.indexOf(candidate, first + 1) >= 0) continue;
    return candidate;
  }

  throw new SourceDefect(
    `no candidate anchor for Article ${article.article} (${lang3}) occurs exactly once in the document — ` +
      `refusing to store a fact whose anchor cannot distinguish the provision from a recital`,
  );
}

export type LanguagePull = {
  lang3: ServedLanguage;
  body: string;
  /** Discovered by content negotiation, never computed from the language code. */
  pinnedUri: string;
  etag: string | null;
  lastModified: string | null;
  articles: Map<number, ExtractedArticleShape>;
  anchors: Map<number, string>;
};

/**
 * Pull every cited article in every served language.
 *
 * ONE request per language, not one per article: the whole expression comes back in a
 * single body, and six requests per language would be six chances for a rate limiter to
 * hand back a partial corpus that still looked complete.
 */
export async function fetchCorpus(): Promise<LanguagePull[]> {
  const pulls: LanguagePull[] = [];

  for (const lang3 of SERVED_LANGUAGES) {
    const res = await fetchExpression(lang3);
    if (res.unchanged) {
      throw new SourceDefect(`unexpected 304 on an unconditional GET for ${lang3}`);
    }

    const articles = new Map<number, ExtractedArticleShape>();
    const anchors = new Map<number, string>();
    for (const article of CITED_ARTICLES) {
      // Throws SourceDefect naming the id when the article or its title is absent —
      // it never returns an empty result that would be stored as an empty quotation.
      const extracted = extractArticle(res.body, article);
      if (listParagraphIds(extracted.rawHtml).length === 0) {
        throw new SourceDefect(
          `Article ${article} (${lang3}) extracted with zero tagged paragraphs — refusing to store it`,
        );
      }
      articles.set(article, extracted);
      anchors.set(article, chooseAnchor(res.body, extracted, lang3));
    }

    pulls.push({
      lang3,
      body: res.body,
      pinnedUri: res.pinnedUri,
      etag: res.etag,
      lastModified: res.lastModified,
      articles,
      anchors,
    });

    process.stdout.write(
      `  ${lang3}: ${res.body.length} bytes, ETag ${res.etag ?? '(none)'}, pinned ${res.pinnedUri}\n`,
    );
  }

  return pulls;
}

/** Serialise one (article, language) pair into its `Fact` record. */
function toFact(pull: LanguagePull, article: number, today: string): Record<string, unknown> {
  const extracted = pull.articles.get(article);
  if (extracted === undefined) {
    throw new SourceDefect(`Article ${article} missing from the ${pull.lang3} pull`);
  }
  const anchor = pull.anchors.get(article);
  if (anchor === undefined) {
    throw new SourceDefect(`no anchor for Article ${article} (${pull.lang3})`);
  }

  const paragraphs: Record<string, unknown> = {};
  for (const [id, paragraph] of Object.entries(extracted.paragraphs)) {
    const subPoints: Record<string, unknown> = {};
    for (const [label, sub] of Object.entries(paragraph.subPoints)) {
      subPoints[label] = { citation_key: sub.citationKey, raw_text: sub.rawText };
    }
    paragraphs[id] = {
      citation_key: paragraph.citationKey,
      raw_text: paragraph.rawText,
      sub_points: subPoints,
    };
  }

  return {
    value: {
      article,
      language: pull.lang3,
      title: extracted.titleText,
      raw_text: extracted.rawText,
      paragraphs,
    },
    status: 'verified',
    volatility: 'stable',
    // D-06: an agent proposes, a human confirms. Machine retrieval from the publisher's
    // own API is not a human eyeballing the source, so this stays null rather than
    // recording a confirmation that did not happen.
    verified_by: null,
    verified_at: today,
    sources: [
      {
        url: pull.pinnedUri,
        title: `Directive (EU) 2023/970 — Article ${article}, ${extracted.titleText}`,
        publisher: 'Publications Office of the European Union',
        kind: 'eu_institution',
        verification: 'cellar',
        anchor,
        language: BCP47[pull.lang3],
        published_at: PUBLISHED_AT,
        accessed_at: today,
        etag: pull.etag ?? undefined,
        last_modified: pull.lastModified ?? undefined,
        scope: { id: `art_${article}`, expected_subtitle: extracted.titleText },
      },
    ],
  };
}

/**
 * Write the corpus, and capture the fixtures the offline suite compares against.
 *
 * `data/_directive.json` is a GENERATED file that is COMMITTED, so a change to the
 * authentic text arrives as a reviewable diff rather than as a silent build-time
 * substitution. It is NOT a source snapshot (D-02): there is no content hash, no
 * `data/snapshots/` directory, and the build re-fetches and re-verifies against the live
 * source rather than trusting the committed copy.
 */
async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = resolve(here, '..');
  const today = new Date().toISOString().slice(0, 10);

  process.stdout.write(
    `fetching ${CITED_ARTICLES.length} articles across ${SERVED_LANGUAGES.length} languages\n`,
  );
  const pulls = await fetchCorpus();

  // Every pinned URI must be distinct. They are DISCOVERED per language, never derived:
  // the manifestation sequence segment (.0006. for EN, .0018. for PL, .0013. for IT) is
  // not alphabetically related to the language code, so computing one would silently
  // fetch a different language's document under the right key.
  const uris = new Set(pulls.map((p) => p.pinnedUri));
  if (uris.size !== pulls.length) {
    throw new SourceDefect(
      `expected ${pulls.length} distinct pinned expression URIs, got ${uris.size} — two languages resolved to one manifestation`,
    );
  }

  const corpus: Record<string, unknown> = {};
  for (const pull of pulls) {
    for (const article of CITED_ARTICLES) {
      corpus[corpusKey(article, pull.lang3)] = toFact(pull, article, today);
    }
  }

  const expected = CITED_ARTICLES.length * SERVED_LANGUAGES.length;
  if (Object.keys(corpus).length !== expected) {
    throw new SourceDefect(
      `expected ${expected} corpus entries, built ${Object.keys(corpus).length}`,
    );
  }

  const outPath = resolve(pkgRoot, 'data', '_directive.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');

  // Fixtures: the English expression the offline suite already uses, and the Polish one
  // the language-invariance assertions need. Written from the SAME bodies the corpus was
  // built from, so a fixture can never disagree with the data it is asserted against.
  for (const [lang3, name] of [
    ['eng', 'cellar-art7-en.xhtml'],
    ['pol', 'cellar-art7-pl.xhtml'],
  ] as const) {
    const pull = pulls.find((p) => p.lang3 === lang3);
    if (pull === undefined) continue;
    const fixturePath = resolve(pkgRoot, 'test', 'fixtures', name);
    mkdirSync(dirname(fixturePath), { recursive: true });
    writeFileSync(fixturePath, pull.body, 'utf8');
    process.stdout.write(`wrote fixture:         ${fixturePath}\n`);
  }

  process.stdout.write(
    [
      `articles:              ${CITED_ARTICLES.length}`,
      `languages:             ${SERVED_LANGUAGES.length}`,
      `entries:               ${Object.keys(corpus).length}`,
      `distinct pinned URIs:  ${uris.size}`,
      `wrote:                 ${outPath}`,
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

