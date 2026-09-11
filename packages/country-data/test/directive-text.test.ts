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
import { DirectiveFile } from '../src/schema.ts';
import { SourceDefect, normaliseForMatch, scopeToSubdivision, textOf } from '../src/verifier.ts';
import { CITED_ARTICLES, SERVED_LANGUAGES, corpusKey } from '../scripts/fetch-directive.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const fixture = (name: string): string => readFileSync(resolve(here, 'fixtures', name), 'utf8');

/** The whole English expression as retrieved in plan 01-01. */
const ART7_EN = fixture('cellar-art7-en.xhtml');
/** The `art_3` subtree, sliced from a live pull and proved identical to the above. */
const ART3_EN = fixture('cellar-art3-en.xhtml');
/** The `art_12` subtree, same provenance. */
const ART12_EN = fixture('cellar-art12-en.xhtml');
/** The whole Polish expression. */
const ART7_PL = fixture('cellar-art7-pl.xhtml');

/**
 * The STORED corpus — what actually ships to a worker.
 *
 * Every inherited-error regression below asserts against this, not against a fixture.
 * A fixture-based assertion proves that a captured sample was right; the claim that has
 * to hold is that the data in the package is right.
 */
const CORPUS = DirectiveFile.parse(
  JSON.parse(readFileSync(resolve(pkgRoot, 'data', '_directive.json'), 'utf8')),
);

/** The stored article entry for one (article, language) pair. */
const stored = (article: number, lang: string) => {
  const fact = CORPUS[corpusKey(article, lang)];
  if (fact === undefined) throw new Error(`${corpusKey(article, lang)} missing from the corpus`);
  if (fact.value === null || !('paragraphs' in fact.value)) {
    throw new Error(`${corpusKey(article, lang)} is not an article-shaped fact`);
  }
  return fact.value;
};

const storedParagraph = (article: number, lang: string, id: string) => {
  const paragraph = stored(article, lang).paragraphs[id];
  if (paragraph === undefined) {
    throw new Error(`paragraph ${id} missing from ${corpusKey(article, lang)}`);
  }
  return paragraph;
};

/** The distinct integers appearing in a stored text, ascending. */
const integersIn = (text: string): number[] =>
  [...new Set((text.match(/\d+/g) ?? []).map(Number))].sort((a, b) => a - b);

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
    const fromPolishExtraction = extractArticle(ART7_PL, 7).paragraphs['007.004']?.citationKey;
    expect(fromEnglishExtraction).toBe(citationKey(7, 4));
    expect(fromPolishExtraction).toBe(citationKey(7, 4));
    expect(citationKey(7, 4)).toBe('32023L0970#007.004');

    // The whole paragraph-id set is identical across the two language versions — the
    // property that makes the key language-invariant in the first place.
    expect(listParagraphIds(extractArticle(ART7_PL, 7).rawHtml)).toEqual(
      listParagraphIds(extractArticle(ART7_EN, 7).rawHtml),
    );
  });
});

/* ════════════════════════════════════════════════════════════════════════════
 * The regression locks.
 *
 * Four citation errors reached this project through a secondary brief and were
 * corrected at initialisation against primary text. A correction that is only written
 * down comes back. Each case below fails if its error returns.
 *
 * Two authoring rules make these real rather than decorative:
 *
 *   - They assert against the STORED corpus, because the claim is about the data that
 *     ships, not about a captured sample.
 *   - They identify every provision by its STRUCTURAL ID, never by searching for its
 *     wording. Searching for wording is what produced the errors in the first place:
 *     the deadline phrase also occurs in a recital about joint pay assessments, and a
 *     bare "Article 10" reference in recital 25 points at the TFEU.
 * ════════════════════════════════════════════════════════════════════════════ */

describe('the stored corpus', () => {
  it('article coverage', () => {
    // Set difference, so a missing cell names itself rather than reporting `66 !== 65`.
    const missing: string[] = [];
    const emptyParagraphs: string[] = [];
    for (const article of CITED_ARTICLES) {
      for (const lang of SERVED_LANGUAGES) {
        const key = corpusKey(article, lang);
        const fact = CORPUS[key];
        if (fact === undefined || fact.value === null || !('paragraphs' in fact.value)) {
          missing.push(key);
          continue;
        }
        if (Object.keys(fact.value.paragraphs).length === 0) emptyParagraphs.push(key);
      }
    }
    expect(missing).toEqual([]);
    expect(emptyParagraphs).toEqual([]);
    expect(Object.keys(CORPUS)).toHaveLength(CITED_ARTICLES.length * SERVED_LANGUAGES.length);

    // Every entry resolves to a pinned expression URI on the publisher's own host, with
    // the ETag it was read from. A quotation that cannot be traced back to the bytes it
    // came from is not a citation.
    for (const fact of Object.values(CORPUS)) {
      const source = fact.sources[0];
      expect(source).toBeDefined();
      expect(new URL(source!.url).host).toBe('publications.europa.eu');
      expect(source!.etag).toBeTruthy();
      expect(source!.verification).toBe('cellar');
      expect(source!.scope?.id).toMatch(/^art_\d+$/);
    }
  });

  it('holds the Article 7 paragraph-id set identically in all eleven languages', () => {
    const english = Object.keys(stored(7, 'eng').paragraphs).sort();
    for (const lang of SERVED_LANGUAGES) {
      expect(Object.keys(stored(7, lang).paragraphs).sort()).toEqual(english);
    }
    expect(english).toEqual(['007.001', '007.002', '007.003', '007.004', '007.005', '007.006']);
  });

  it('records eleven DISTINCT pinned expression URIs, none derivable from another', () => {
    const uris = SERVED_LANGUAGES.map((lang) => CORPUS[corpusKey(7, lang)]!.sources[0]!.url);
    expect(new Set(uris).size).toBe(SERVED_LANGUAGES.length);

    // The manifestation sequence segment is NOT a language code. Substituting `pol` for
    // `eng` in the English URI does not produce the Polish one, which is why the value
    // is discovered by content negotiation and recorded, never computed.
    const eng = CORPUS[corpusKey(7, 'eng')]!.sources[0]!.url;
    const pol = CORPUS[corpusKey(7, 'pol')]!.sources[0]!.url;
    expect(pol).not.toBe(eng.replace('eng', 'pol'));
    expect(pol).not.toBe(eng);
    // Observed: .0006. for English, .0018. for Polish — not alphabetically related.
    expect(eng).toContain('.0006.');
    expect(pol).toContain('.0018.');
  });
});

describe('inherited error 1 — no annual frequency cap on the worker', () => {
  it('no annual frequency cap', () => {
    const art7 = stored(7, 'eng');

    // The brief claimed the Art. 7 right is exercisable "once a year". No such cap is in
    // the authentic text — the string does not occur at all.
    for (const cap of [
      'once a year',
      'once per year',
      'once every 12 months',
      'no more than once',
      'not more than once',
      'once in any',
    ]) {
      expect(normaliseForMatch(art7.raw_text).toLowerCase()).not.toContain(cap);
    }

    // The paragraph that DOES mention an annual basis is identified by its id, not by
    // searching for "annual" — and it is an EMPLOYER duty to inform, the mirror image
    // of a cap on the worker.
    const employerDuty = storedParagraph(7, 'eng', '007.003');
    expect(employerDuty.citation_key).toBe('32023L0970#007.003');
    expect(employerDuty.raw_text).toContain('Employers shall inform all workers');
    expect(employerDuty.raw_text).toContain('on an annual basis');
    expect(employerDuty.raw_text).toContain('of their right to receive the information');

    // And the paragraph that grants the right — also by id — imposes no frequency limit.
    const theRight = storedParagraph(7, 'eng', '007.001');
    expect(theRight.raw_text).toContain('Workers shall have the right to request');
    expect(theRight.raw_text.toLowerCase()).not.toContain('year');

    // Across every language: Article 7 carries no integer beyond its own paragraph
    // numbers and its internal cross-references. A "12 months" or a "once a year"
    // rendered numerically in any translation would break this.
    for (const lang of SERVED_LANGUAGES) {
      expect(integersIn(stored(7, lang).raw_text)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }
  });
});

describe('inherited error 2 — Article 6 is not Article 7', () => {
  it('Art. 6 is not Art. 7', () => {
    // Different titles in every language version.
    for (const lang of SERVED_LANGUAGES) {
      expect(stored(6, lang).title).not.toBe(stored(7, lang).title);
    }
    expect(stored(6, 'eng').title).toBe('Transparency of pay setting and pay progression policy');
    expect(stored(7, 'eng').title).toBe('Right to information');

    const art6 = stored(6, 'eng').raw_text;
    const art7 = stored(7, 'eng').raw_text;

    // Art. 6 is the pay-SETTING and progression criteria. Art. 7 is the right to
    // information about one's own and comparable pay levels. The brief merged them.
    // ASCII apostrophe on the needle: `normaliseForMatch` folds U+2019 to `'` on BOTH
    // sides, which is what lets a hand-typed phrase match authentic OJ typography.
    expect(normaliseForMatch(art6)).toContain(
      "the criteria that are used to determine workers' pay, pay levels and pay progression",
    );
    expect(normaliseForMatch(art7)).not.toContain('pay progression');

    expect(normaliseForMatch(art7)).toContain(
      'information on their individual pay level and the average pay levels, broken down by sex',
    );
    expect(normaliseForMatch(art6)).not.toContain('average pay levels');

    // Their citation keys cannot collide either.
    expect(citationKey(6, 1)).not.toBe(citationKey(7, 1));
  });
});

describe('inherited error 3 — the two-month backstop, verbatim', () => {
  /**
   * The authentic English Art. 7(4), byte for byte.
   *
   * Taken from the retrieved corpus, not re-typed: the U+00A0 after "4." (three of
   * them) and the one in "is made" are Official Journal typography. Compared with
   * STRICT equality and never through a normalising comparison — a lenient comparison
   * here would silently accept a re-typed quotation, which is the exact failure this
   * case exists to catch (threat T-1-12).
   */
  const ART7_4_EN =
    '4.   Employers shall provide the information referred to in paragraph 1 within a reasonable period of time but in any event within two months from the date on which the request is made.';

  /** The authentic Polish Art. 7(4), byte for byte. */
  const ART7_4_PL =
    '4.   Pracodawcy udostępniają informacje, o których mowa w ust. 1, w rozsądnym terminie, a w każdym razie w ciągu dwóch miesięcy od dnia zwrócenia się o te informacje.';

  it('two-month backstop verbatim', () => {
    expect(storedParagraph(7, 'eng', '007.004').raw_text).toBe(ART7_4_EN);
    expect(storedParagraph(7, 'pol', '007.004').raw_text).toBe(ART7_4_PL);

    // The constants themselves carry the authentic separators — a whitespace-normalised
    // corpus would fail the strict comparison above, and this pins why.
    expect(ART7_4_EN).toContain(' ');
    expect(ART7_4_PL).toContain(' ');
    expect((ART7_4_EN.match(/ /g) ?? []).length).toBe(4);

    // The deadline is stated as the Directive states it: a reasonable period, with two
    // months as the outer limit — not a flat "2 months".
    expect(normaliseForMatch(ART7_4_EN)).toContain(
      'within a reasonable period of time but in any event within two months',
    );

    // Every language stores paragraph 4, and none of them is empty.
    for (const lang of SERVED_LANGUAGES) {
      expect(storedParagraph(7, lang, '007.004').raw_text.length).toBeGreaterThan(20);
      expect(storedParagraph(7, lang, '007.004').citation_key).toBe('32023L0970#007.004');
    }
  });
});

describe('inherited error 4 — no numeric small-group threshold', () => {
  it('no numeric small-group threshold', () => {
    // The six-person threshold the brief carried is § 12 EntgTranspG, a German national
    // rule. Art. 12(3) is the Directive's ONLY identifiability provision, and it states
    // a CONDITION with no number attached.
    const identifiability = storedParagraph(12, 'eng', '012.003');
    expect(identifiability.citation_key).toBe('32023L0970#012.003');
    expect(normaliseForMatch(identifiability.raw_text)).toContain(
      'would lead to the disclosure, either directly or indirectly, of the pay of an identifiable worker',
    );
    // Three bodies, named.
    expect(identifiability.raw_text).toContain('workers’ representatives');
    expect(identifiability.raw_text).toContain('labour inspectorate');
    expect(identifiability.raw_text).toContain('equality body');
    // No spelled-out group size anywhere in it.
    for (const word of ['six', 'fewer than', 'at least', 'minimum of']) {
      expect(identifiability.raw_text.toLowerCase()).not.toContain(word);
    }

    // Across ALL eleven languages the identifiability paragraph carries exactly these
    // integers: its own paragraph number and the articles it cross-refers to. A
    // threshold inserted in any language — in any script — adds an integer and fails.
    for (const lang of SERVED_LANGUAGES) {
      expect(integersIn(storedParagraph(12, lang, '012.003').raw_text)).toEqual([3, 7, 9, 10, 29]);
    }

    // And across all 66 stored entries: the integers in each article are the same in
    // every language as in the English, with ONE verified exception recorded below.
    // Any newly introduced number, in any language, breaks this.
    const divergences: string[] = [];
    for (const article of CITED_ARTICLES) {
      const english = integersIn(stored(article, 'eng').raw_text).join(',');
      for (const lang of SERVED_LANGUAGES) {
        const theirs = integersIn(stored(article, lang).raw_text).join(',');
        if (theirs !== english) divergences.push(`art${article}/${lang}: ${theirs} vs eng ${english}`);
      }
    }
    // The single authentic divergence: the Lithuanian text renders the median-pay-level
    // definition in Art. 3(1)(d) as "po 50 procentų" (50 per cent) where the English
    // says "half of the workers". A real translation difference, recorded rather than
    // hidden by loosening the rule.
    expect(divergences).toEqual([
      'art3/lit: 1,2,3,4,20,24,25,43,50,54,78,85,92,1158,2000,2006,2019 vs eng 1,2,3,4,20,24,25,43,54,78,85,92,1158,2000,2006,2019',
    ]);
  });
});

describe('Art. 7(2) and Art. 12(3) are different mechanisms', () => {
  it('7(2) and 12(3) are distinct', () => {
    // Art. 7(2) is an UNCONDITIONAL standing right: in every Member State a worker may
    // request through their representatives or an equality body.
    // Art. 12(3) is an OPTIONAL Member State measure, conditional on the disclosure
    // identifying an individual worker, restricting WHO MAY SEE the information.
    // Neither is a restatement of the other, and collapsing them is research Pitfall 6.
    const standingRight = storedParagraph(7, 'eng', '007.002');
    const optionalMeasure = storedParagraph(12, 'eng', '012.003');

    expect(standingRight.citation_key).toBe('32023L0970#007.002');
    expect(optionalMeasure.citation_key).toBe('32023L0970#012.003');
    expect(standingRight.citation_key).not.toBe(optionalMeasure.citation_key);

    expect(standingRight.raw_text).not.toContain(optionalMeasure.raw_text);
    expect(optionalMeasure.raw_text).not.toContain(standingRight.raw_text);

    // The distinguishing words, in each: "shall have the possibility to request" (a
    // right the worker holds) against "Member States may decide" (an option the state
    // holds), conditioned on identifiability.
    expect(standingRight.raw_text).toContain('Workers shall have the possibility to request');
    expect(standingRight.raw_text.toLowerCase()).not.toContain('identifiable');
    expect(optionalMeasure.raw_text).toContain('Member States may decide');
    expect(optionalMeasure.raw_text).toContain('identifiable worker');

    // In every language the two stored texts are distinct strings, neither containing
    // the other.
    for (const lang of SERVED_LANGUAGES) {
      const a = storedParagraph(7, lang, '007.002').raw_text;
      const b = storedParagraph(12, lang, '012.003').raw_text;
      expect(a).not.toBe(b);
      expect(a.includes(b)).toBe(false);
      expect(b.includes(a)).toBe(false);
    }
  });
});

describe('the structural-id collision', () => {
  it('Article 10 is not Article 10 TFEU', () => {
    // Built from the FULL English expression, not from the extracted corpus: the point
    // is that the collision exists in the document the extractor reads. A case built the
    // other way round — searching the already-extracted corpus — cannot fail, because
    // extraction is what removed the collision.
    const documentText = normaliseForMatch(textOf(ART7_EN));

    // 1. The naive search a string-matching verifier would run.
    const naiveHits: number[] = [];
    let at = documentText.indexOf('Article 10');
    while (at >= 0) {
      naiveHits.push(at);
      at = documentText.indexOf('Article 10', at + 1);
    }
    expect(naiveHits.length).toBeGreaterThan(1);

    // 2. At least one of those hits is a reference to a DIFFERENT INSTRUMENT. Recital 25
    //    opens "Article 10 TFEU provides that…" — the Treaty on the Functioning of the
    //    European Union, not this Directive.
    const recital25 = scopeToSubdivision(ART7_EN, 'rct_25');
    expect(recital25).not.toBeNull();
    const recital25Text = normaliseForMatch(textOf(recital25!));
    expect(recital25Text).toContain('Article 10 TFEU');
    expect(recital25Text).toContain(
      'in defining and implementing its policies and activities, the Union is to aim to combat discrimination',
    );

    // 3. The collision is real: the recital's occurrence is one of the naive hits, and it
    //    is nowhere near the article. Structural ids are the only thing that separates
    //    them — the strings are identical.
    const recitalHitOffset = documentText.indexOf('Article 10 TFEU');
    expect(naiveHits).toContain(recitalHitOffset);

    // 4. The stored Article 10 was located by its structural id, and carries the
    //    Directive's own Article 10 — the joint pay assessment, not a treaty article.
    const art10 = stored(10, 'eng');
    expect(CORPUS[corpusKey(10, 'eng')]!.sources[0]!.scope?.id).toBe('art_10');
    expect(art10.title).toBe('Joint pay assessment');
    expect(art10.raw_text).not.toContain('TFEU');

    // 5. And it shares no sentence with that recital. Every sentence of the recital is
    //    absent from the stored article.
    const recitalSentences = recital25Text
      .split('. ')
      .map((s) => s.trim())
      .filter((s) => s.length > 40);
    expect(recitalSentences.length).toBeGreaterThan(0);
    const storedText = normaliseForMatch(art10.raw_text);
    for (const sentence of recitalSentences) {
      expect(storedText).not.toContain(sentence);
    }
  });
});

describe('the encoding contract', () => {
  it('re-extraction is byte-equal to storage, while a hand-typed ASCII anchor is not', () => {
    // Re-extracting from the retrieved body reproduces the stored bytes exactly. The
    // committed fixture IS the body the corpus was built from, and the corpus pull
    // proved it byte-identical to a live re-fetch; asserting the live leg here would
    // make a contributor's pull request depend on somebody else's uptime.
    const reExtracted = extractArticle(ART7_EN, 7);
    expect(reExtracted.rawText).toBe(stored(7, 'eng').raw_text);
    expect(reExtracted.paragraphs['007.004']?.rawText).toBe(
      storedParagraph(7, 'eng', '007.004').raw_text,
    );
    // Polish too — the same extractor, the same byte equality, a different script.
    expect(extractArticle(ART7_PL, 7).rawText).toBe(stored(7, 'pol').raw_text);

    // Both directions, explicitly. A test that asserted only the second half would pass
    // against a corpus that had been normalised on write — which is the failure mode.
    const handTypedAscii =
      '4. Employers shall provide the information referred to in paragraph 1 within a reasonable period of time but in any event within two months from the date on which the request is made.';
    const rawStored = storedParagraph(7, 'eng', '007.004').raw_text;

    expect(rawStored).not.toBe(handTypedAscii);
    expect(rawStored.includes(handTypedAscii)).toBe(false);
    expect(normaliseForMatch(rawStored)).toBe(normaliseForMatch(handTypedAscii));

    // The specific characters at stake: the no-break separators and the typographic
    // apostrophe, both authentic Official Journal typography.
    expect(rawStored).toContain(' ');
    expect(handTypedAscii).not.toContain(' ');
    expect(stored(7, 'eng').raw_text).toContain('’');
  });
});
