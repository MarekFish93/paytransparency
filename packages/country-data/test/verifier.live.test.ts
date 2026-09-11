/**
 * The ONLY network-touching suite in this repository.
 *
 * It is excluded from the default run by the `**\/*.live.test.ts` pattern in
 * `vitest.config.ts`, and it is run — by explicit path, which is the only way past that
 * exclusion — solely by `.github/workflows/nightly.yml`. A contributor's pull request
 * must never turn red because the Publications Office was briefly unavailable: a gate
 * that goes red on someone else's outage gets disabled within a month, and a disabled
 * gate is worse than no gate.
 *
 * What it proves that the offline suite cannot: that the assumptions the fixtures were
 * recorded under still hold against the live source — the status, the conditional-GET
 * contract, and the presence of the cited article's own structural id.
 *
 * SPARQL is deliberately absent. The public endpoint returned zero triples for the CELEX
 * URI and timed out at 60 s on a realistic query; it is a one-off discovery tool whose
 * result is committed (plan 01-04 owns it), never a retrieval layer on any recurring path.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DirectiveFile } from '../src/schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

const CELEX = '32023L0970';
const CELEX_URI = `http://publications.europa.eu/resource/celex/${CELEX}`;
// Plan 01-03 re-keyed the corpus from a single paragraph-level fact to the six-article,
// eleven-language corpus: entries are `<CELEX>#<article>@<lang3>`, and the publisher's
// paragraph ids live inside `value.paragraphs`. The provenance this suite checks is
// ARTICLE-level — the whole article is retrieved and verified in one fetch — so the source
// is read from the article entry, while the paragraph id is kept to name what is cited.
const ARTICLE_KEY = `${CELEX}#007@eng`;
const PARAGRAPH_ID = '007.004';
const CITATION_KEY = `${CELEX}#${PARAGRAPH_ID}`;

/** The stored expression, read from the committed data — not hard-coded here. */
function storedSource() {
  const parsed = DirectiveFile.parse(
    JSON.parse(readFileSync(resolve(pkgRoot, 'data', '_directive.json'), 'utf8')),
  );
  const fact = parsed[ARTICLE_KEY];
  if (fact === undefined) throw new Error(`${ARTICLE_KEY} missing from _directive.json`);
  // Assert the cited paragraph is actually present, so a corpus that silently lost
  // Art. 7(4) fails here rather than passing on the article's provenance alone.
  const paragraphs = (fact.value as { paragraphs?: Record<string, unknown> }).paragraphs;
  if (paragraphs?.[PARAGRAPH_ID] === undefined) {
    throw new Error(`${CITATION_KEY} missing from ${ARTICLE_KEY} in _directive.json`);
  }
  const source = fact.sources[0];
  if (source === undefined) throw new Error('the stored fact cites no source');
  return source;
}

const CELLAR_HEADERS = {
  Accept: 'application/xhtml+xml',
  'Accept-Language': 'eng',
};

/** 60 s: the Publications Office is not fast, and a flaky timeout is a false alarm. */
const TIMEOUT = 60_000;

describe('Cellar, live', () => {
  it(
    'answers 200 for the CELEX URI with an ETag, a Last-Modified and the art_7 subtree',
    { timeout: TIMEOUT },
    async () => {
      const res = await fetch(CELEX_URI, { headers: CELLAR_HEADERS, redirect: 'follow' });

      // Exactly 200, never merely `res.ok`: the EUR-Lex web front end answers 202 with a
      // zero-length body and `res.ok` is true for 202.
      expect(res.status).toBe(200);

      const etag = res.headers.get('etag');
      const lastModified = res.headers.get('last-modified');
      expect(etag).toBeTruthy();
      expect(lastModified).toBeTruthy();

      const body = await res.text();
      expect(Buffer.byteLength(body, 'utf8')).toBeGreaterThan(100000);
      expect(body).toContain('id="art_7"');

      // Recorded in the run log so the nightly job's drift annotation can name it.
      process.stdout.write(
        `live ETag: ${etag}\nlive Last-Modified: ${lastModified}\nresolved: ${res.url}\n`,
      );
    },
  );

  it(
    'answers 304 to a conditional request carrying the stored ETag',
    { timeout: TIMEOUT },
    async () => {
      const source = storedSource();
      expect(source.etag).toBeTruthy();

      const res = await fetch(source.url, {
        headers: { ...CELLAR_HEADERS, 'If-None-Match': source.etag as string },
        redirect: 'follow',
      });

      // A 304 is the cheap path that makes nightly re-verification affordable, and it
      // legitimately carries a zero-length body — which is why the verifier handles 304
      // before any body check.
      expect(res.status).toBe(304);
    },
  );
});
