/**
 * The Directive corpus suite (LEGAL-04, LEGAL-07).
 *
 * Two halves, written in two tasks:
 *
 *   1. Extraction behaviour, asserted against committed fixtures — whole articles
 *      located by the publisher's own structural ids, with every addressable unit
 *      tagged rather than flattened into one blob.
 *   2. The regression locks (task 3) that keep the four inherited citation errors
 *      corrected, asserted against the STORED corpus rather than against a fixture:
 *      the point is that the data shipped to a worker is right, not that a captured
 *      sample was.
 *
 * Offline throughout. A third party's outage must never redden a contributor's pull
 * request; live retrieval belongs to the nightly `*.live.test.ts` profile.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { citationKey, extractArticle, listParagraphIds } from '../src/extract.ts';
import { SourceDefect } from '../src/verifier.ts';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): string => readFileSync(resolve(here, 'fixtures', name), 'utf8');

/** The whole English expression as retrieved in plan 01-01. */
const ART7_EN = fixture('cellar-art7-en.xhtml');
/** The `art_3` subtree, sliced from a live pull and proved identical to the above. */
const ART3_EN = fixture('cellar-art3-en.xhtml');
/** The `art_12` subtree, same provenance. */
const ART12_EN = fixture('cellar-art12-en.xhtml');

describe('extractArticle: whole articles by the publisher’s own ids', () => {
  it('returns the whole art_7 subtree with its six paragraphs, and does not bleed into Article 8', () => {
    const art7 = extractArticle(ART7_EN, 7);

    expect(art7.articleId).toBe('art_7');
    expect(art7.article).toBe(7);
    expect(art7.titleText).toBe('Right to information');

    // Exactly six, in ascending document order — the ids research enumerated.
    expect(Object.keys(art7.paragraphs)).toEqual([
      '007.001',
      '007.002',
      '007.003',
      '007.004',
      '007.005',
      '007.006',
    ]);

    // The whole article is present, not just the paragraph the letter quotes.
    expect(art7.rawText).toContain('Right to information');
    expect(art7.rawText).toContain('within a reasonable period of time');

    // Article 8 is "Accessibility of information". Its subject matter must not appear
    // in Article 7's stored text — a scope that runs on is how a quotation acquires
    // wording the cited provision does not have.
    expect(art7.rawText).not.toContain('Accessibility of information');
    expect(art7.rawText).not.toContain('format which is accessible to persons with disabilities');
    // Nor a dangling fragment of the next subdivision's opening tag.
    expect(art7.rawHtml).not.toMatch(/<[^>]*$/);
  });

  it('captures Article 3’s lettered sub-points as addressable units, not one flattened blob', () => {
    const art3 = extractArticle(ART3_EN, 3);

    expect(art3.titleText).toBe('Definitions');
    expect(Object.keys(art3.paragraphs).length).toBeGreaterThan(0);

    const definitions = art3.paragraphs['003.001'];
    expect(definitions).toBeDefined();

    // Article 3(1) runs (a) … (m). The labels come from the document's own markup.
    expect(Object.keys(definitions!.subPoints)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
    ]);

    // (h) 'category of workers' — the ENG-06 substrate — is retrievable on its own,
    // rather than only as a substring of the whole definitions paragraph.
    const categoryOfWorkers = definitions!.subPoints['h'];
    expect(categoryOfWorkers).toBeDefined();
    expect(categoryOfWorkers!.rawText).toContain('category of workers');
    expect(categoryOfWorkers!.rawText).toContain('work of equal value');
    // It must NOT have swallowed its neighbours: (g) and (i) are separate units.
    expect(categoryOfWorkers!.rawText).not.toContain('direct discrimination');
    expect(categoryOfWorkers!.citationKey).toBe('32023L0970#003.001(h)');
  });

  it('returns Article 12 in full, including the paragraph 3 identifiability provision', () => {
    const art12 = extractArticle(ART12_EN, 12);

    expect(art12.titleText).toBe('Data protection');
    expect(Object.keys(art12.paragraphs)).toEqual(['012.001', '012.002', '012.003']);

    const para3 = art12.paragraphs['012.003'];
    expect(para3).toBeDefined();

    // The condition, then the three bodies it routes to. Art. 12(3) is an OPTIONAL
    // Member State measure conditional on a disclosure identifying an individual
    // worker — not a blanket routing rule, and not Art. 7(2).
    expect(para3!.rawText).toContain('identifiable worker');
    expect(para3!.rawText).toContain('representatives');
    expect(para3!.rawText).toContain('labour inspectorate');
    expect(para3!.rawText).toContain('equality body');
  });

  it('throws SourceDefect naming the missing id rather than returning an empty result', () => {
    expect(() => extractArticle(ART7_EN, 99)).toThrow(SourceDefect);
    expect(() => extractArticle(ART7_EN, 99)).toThrow(/art_99/);
  });
});

describe('listParagraphIds: document order, stable across calls', () => {
  it('returns the ids in document order and returns the same order twice', () => {
    const art9 = extractArticle(ART7_EN, 9);
    const first = listParagraphIds(art9.rawHtml);
    const second = listParagraphIds(art9.rawHtml);

    expect(first).toEqual([
      '009.001',
      '009.002',
      '009.003',
      '009.004',
      '009.005',
      '009.006',
      '009.007',
      '009.008',
      '009.009',
      '009.010',
    ]);
    expect(second).toEqual(first);
    // Document order, not lexical luck: the sorted copy must equal the original here,
    // and the assertion above pins the exact sequence the document carries.
    expect([...first].sort()).toEqual(first);
  });
});

describe('citationKey: the publisher’s id, language-invariant', () => {
  it('zero-pads to three-dot-three and prefixes the CELEX id', () => {
    expect(citationKey(7, 4)).toBe('32023L0970#007.004');
    expect(citationKey(7, 4).endsWith('#007.004')).toBe(true);
    expect(citationKey(12, 3)).toBe('32023L0970#012.003');
    expect(citationKey(3, 1, 'h')).toBe('32023L0970#003.001(h)');
  });

  it('is the same key whichever language version is being extracted', () => {
    // The key is built from the article and paragraph numbers alone. There is no
    // language parameter, because the publisher's ids are byte-identical across every
    // language version — which is what removes the need for a mapping table.
    const fromEnglishExtraction = extractArticle(ART7_EN, 7).paragraphs['007.004']?.citationKey;
    expect(fromEnglishExtraction).toBe(citationKey(7, 4));
    expect(citationKey(7, 4)).toBe('32023L0970#007.004');
  });
});
