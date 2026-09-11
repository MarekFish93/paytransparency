/**
 * `resolve()` — LEGAL-03. The single place "two months unless national law verifiably
 * says otherwise" is decided.
 *
 * ONE Directive citation key appears in this file: `32023L0970#007.004` — Art. 7(4),
 * the two-month backstop. Plan 01-01 seeded it as a standalone paragraph entry; plan
 * 01-03 restructured the corpus into 66 ARTICLE-keyed entries
 * (`<CELEX>#<article>@<lang3>`) across eleven languages, where the same provision lives
 * at `32023L0970#007@eng`.value.paragraphs['007.004']. `resolve()` maps between the two,
 * so the key a field declares is still the provision it means. The referential pass that
 * proves EVERY fallback key resolves against the complete corpus belongs to plan 01-05,
 * in wave 4.
 *
 * `-t "fallback"` is the filter `01-VALIDATION.md` binds LEGAL-03 to.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { DirectiveFile } from '../src/schema.ts';
import type { Fact, Source } from '../src/schema.ts';
import {
  DEFAULT_DIRECTIVE_LANGUAGE,
  DIRECTIVE_FALLBACK_KEYS,
  MissingDirectiveCitation,
  directiveArticleKey,
  resolve,
  type DirectiveCorpus,
  type Provenance,
} from '../src/resolve.ts';

/** The one key asserted here: Art. 7(4). Nothing else in the corpus is. */
const DEADLINE_KEY = '32023L0970#007.004';
const TODAY = '2026-09-11';

/**
 * Art. 7(4) IN FULL, in the two languages this file checks, written as escapes because
 * the OJ sets U+00A0 both after the paragraph number and at every typographic no-break
 * position ("request is<NBSP>made", "o<NBSP>których"), and a reviewer cannot tell those
 * from ordinary spaces in a literal. Storing them raw is D-04's rule; asserting them raw
 * is how a normalising refactor gets caught. Matching the WHOLE string is the point: a substring match such
 * as `/two months/` also passes when `resolve()` hands back the entire 1,823-character
 * Article 7, and that is precisely the failure a worker's letter must never carry.
 */
const ART_7_4_ENG =
  '4.\u00A0\u00A0\u00A0Employers shall provide the information referred to in paragraph 1 within a reasonable period of time but in any event within two months from the date on which the request is\u00A0made.';
const ART_7_4_POL =
  '4.\u00A0\u00A0\u00A0Pracodawcy udost\u0119pniaj\u0105 informacje, o\u00A0kt\u00F3rych mowa w\u00A0ust.\u00A01, w\u00A0rozs\u0105dnym terminie, a\u00A0w\u00A0ka\u017Cdym razie w\u00A0ci\u0105gu dw\u00F3ch miesi\u0119cy od dnia zwr\u00F3cenia si\u0119 o\u00A0te informacje.';

const corpus: DirectiveCorpus = DirectiveFile.parse(
  JSON.parse(readFileSync(new URL('../data/_directive.json', import.meta.url), 'utf8')),
) as DirectiveCorpus;

const nationalSource: Source = {
  url: 'https://dziennikustaw.gov.pl/DU/2026',
  title: 'Dziennik Ustaw — transposing act',
  publisher: 'Kancelaria Prezesa Rady Ministrów',
  kind: 'official_journal',
  verification: 'html-anchor',
  anchor: 'Kodeks pracy',
  language: 'pl',
  accessed_at: TODAY,
  scope: null,
};

type Deadline = {
  instrument: 'national';
  amount: number;
  unit: 'day' | 'working_day' | 'week' | 'month';
  from: 'request' | 'receipt';
  national_citation: string | null;
};

const nationalDeadline = (amount: number, unit: Deadline['unit']): Fact<Deadline> => ({
  value: { instrument: 'national', amount, unit, from: 'request', national_citation: 'Test Act, s. 4' },
  status: 'verified',
  sources: [nationalSource],
  verified_at: TODAY,
  verified_by: '@maintainer',
  volatility: 'volatile',
});

const pendingDeadline: Fact<Deadline> = {
  value: null,
  status: 'pending_verification',
  sources: [],
  verified_at: null,
  verified_by: null,
  volatility: 'volatile',
};

describe('resolve: fallback', () => {
  test('a pending response deadline falls back to the Directive two-month backstop', () => {
    const resolved = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.provenance).toBe('directive_fallback');
    expect(resolved.value).not.toBeNull();
    const quotation = resolved.value as { citation_key: string; text: string };
    expect(quotation.citation_key).toBe(DEADLINE_KEY);
    expect(quotation.text).toMatch(/two months/);
  });

  test('the fallback citation is drawn from the corpus, never from a national citation', () => {
    const resolved = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(JSON.stringify(resolved.value)).not.toMatch(/Test Act/);
    expect(resolved.sources.every((s) => s.url.includes('publications.europa.eu'))).toBe(true);
  });

  test('a fallback resolution carries an explicit label, never a blank', () => {
    const resolved = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.label).toBe('provenance.directive_fallback');
    expect(resolved.label.length).toBeGreaterThan(0);
  });

  test('a fallback lookup that misses fails loudly with the key named', () => {
    expect(() =>
      resolve(pendingDeadline, {}, { field: 'article_7.response_deadline', today: TODAY }),
    ).toThrowError(DEADLINE_KEY);
  });

  test('the resolved value is paragraph 007.004 ALONE, never the whole of Article 7', () => {
    const resolved = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    const quotation = resolved.value as { citation_key: string; text: string };
    // Exact, whole-string equality. Not a substring, not a regex.
    expect(quotation.text).toBe(ART_7_4_ENG);
    expect(quotation.citation_key).toBe(DEADLINE_KEY);
    // And positively NOT the article. Article 7 in English runs 1,823 characters and
    // opens at paragraph 1, so either of these failing means the whole article leaked.
    const article = corpus[directiveArticleKey(DEADLINE_KEY, DEFAULT_DIRECTIVE_LANGUAGE) as string];
    const articleText = (article?.value as { raw_text: string }).raw_text;
    expect(quotation.text).not.toBe(articleText);
    expect(quotation.text.length).toBeLessThan(articleText.length / 5);
    expect(quotation.text.startsWith('4.')).toBe(true);
    // Paragraph 1's opening words are in the article and must NOT be in the quotation.
    expect(quotation.text).not.toMatch(/Workers shall have the right to request/);
  });

  test('the quotation is the language the caller asked for, never English in its place', () => {
    const pl = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
      language: 'pol',
    });
    const polish = pl.value as { citation_key: string; text: string };
    expect(polish.text).toBe(ART_7_4_POL);
    // The citation key is language-invariant: the same provision, cited identically.
    expect(polish.citation_key).toBe(DEADLINE_KEY);
    expect(polish.text).not.toBe(ART_7_4_ENG);
  });

  test('the default language is explicit, and eng is what it resolves to', () => {
    expect(DEFAULT_DIRECTIVE_LANGUAGE).toBe('eng');
    const implicit = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    const explicit = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
      language: DEFAULT_DIRECTIVE_LANGUAGE,
    });
    expect(implicit.value).toEqual(explicit.value);
  });

  test('a language the corpus does not hold throws rather than serving English', () => {
    const french = (): unknown =>
      resolve(pendingDeadline, corpus, {
        field: 'article_7.response_deadline',
        today: TODAY,
        language: 'fra',
      });
    expect(french).toThrowError(MissingDirectiveCitation);
    expect(french).toThrowError(DEADLINE_KEY);
  });

  test('a paragraph absent from its article fails loudly and names the paragraph key', () => {
    const articleKey = directiveArticleKey(DEADLINE_KEY, DEFAULT_DIRECTIVE_LANGUAGE) as string;
    const entry = corpus[articleKey] as unknown as {
      value: { paragraphs: Record<string, unknown> };
    };
    const withoutDeadline = { ...entry.value.paragraphs };
    delete withoutDeadline['007.004'];
    const gapped = {
      ...corpus,
      [articleKey]: { ...entry, value: { ...entry.value, paragraphs: withoutDeadline } },
    } as unknown as DirectiveCorpus;

    // Not the article text, not a neighbouring paragraph, not null — a throw.
    try {
      resolve(pendingDeadline, gapped, { field: 'article_7.response_deadline', today: TODAY });
      expect.unreachable('a missing paragraph must throw, never degrade to the article text');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingDirectiveCitation);
      expect((error as MissingDirectiveCitation).citationKey).toBe(DEADLINE_KEY);
      expect((error as MissingDirectiveCitation).field).toBe('article_7.response_deadline');
      expect((error as Error).message).toMatch(/007\.004/);
    }
  });

  test('directiveArticleKey maps a paragraph key onto a key the corpus actually holds', () => {
    expect(directiveArticleKey(DEADLINE_KEY, 'eng')).toBe('32023L0970#007@eng');
    expect(directiveArticleKey(DEADLINE_KEY, 'pol')).toBe('32023L0970#007@pol');
    // A lettered sub-point is not a quotable unit here, and says so rather than guessing.
    expect(directiveArticleKey('32023L0970#003.001(h)', 'eng')).toBeNull();
    for (const key of Object.values(DIRECTIVE_FALLBACK_KEYS)) {
      const articleKey = directiveArticleKey(key, DEFAULT_DIRECTIVE_LANGUAGE);
      expect(`${key} -> ${articleKey}`).toBe(`${key} -> 32023L0970#007@eng`);
      expect(corpus[articleKey as string]).toBeDefined();
    }
  });

  test('DIRECTIVE_FALLBACK_KEYS is the single enumerable table plan 01-05 will check', () => {
    expect(DIRECTIVE_FALLBACK_KEYS['article_7.response_deadline']).toBe(DEADLINE_KEY);
    expect(Object.keys(DIRECTIVE_FALLBACK_KEYS).length).toBeGreaterThan(1);
    for (const key of Object.values(DIRECTIVE_FALLBACK_KEYS)) {
      expect(key).toMatch(/^3\d{4}[A-Z]\d{4}#\d{3}\.\d{3}$/);
    }
  });
});

describe('resolve: precedence is total', () => {
  test('a verified national value wins over an available Directive fallback', () => {
    const resolved = resolve(nationalDeadline(2, 'month'), corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.provenance).toBe('national');
    const value = resolved.value as Deadline;
    expect(value.amount).toBe(2);
    expect(value.unit).toBe('month');
  });

  test('a pending fact with no Directive default for the field resolves to unknown', () => {
    const resolved = resolve(pendingDeadline, corpus, { today: TODAY });
    expect(resolved.provenance).toBe('unknown');
    expect(resolved.value).toBeNull();
  });

  test('returns four distinct provenance values across four crafted facts', () => {
    const directiveDefault: Fact<Deadline> = {
      value: { instrument: 'national', amount: 2, unit: 'month', from: 'request', national_citation: null },
      status: 'directive_default',
      sources: [nationalSource],
      verified_at: TODAY,
      verified_by: null,
      volatility: 'volatile',
    };
    const seen: Provenance[] = [
      resolve(nationalDeadline(2, 'month'), corpus, { field: 'article_7.response_deadline', today: TODAY }).provenance,
      resolve(directiveDefault, corpus, { field: 'article_7.response_deadline', today: TODAY }).provenance,
      resolve(pendingDeadline, corpus, { field: 'article_7.response_deadline', today: TODAY }).provenance,
      resolve(pendingDeadline, corpus, { today: TODAY }).provenance,
    ];
    expect(new Set(seen).size).toBe(4);
    expect(seen).toEqual(['national', 'directive_default', 'directive_fallback', 'unknown']);
  });
});

describe('resolve: deviates is computed, never authored', () => {
  test('a national deadline of exactly two months does not deviate', () => {
    const resolved = resolve(nationalDeadline(2, 'month'), corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.deviates).toBe(false);
  });

  test('a national deadline of one month deviates', () => {
    const resolved = resolve(nationalDeadline(1, 'month'), corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.deviates).toBe(true);
  });

  test('a national deadline of ten weeks deviates', () => {
    const resolved = resolve(nationalDeadline(10, 'week'), corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.deviates).toBe(true);
  });

  test('a directive_default resolution never deviates', () => {
    const directiveDefault: Fact<Deadline> = {
      ...nationalDeadline(2, 'month'),
      status: 'directive_default',
    };
    expect(
      resolve(directiveDefault, corpus, { field: 'article_7.response_deadline', today: TODAY }).deviates,
    ).toBe(false);
  });
});

describe('resolve: freshness travels with the resolution', () => {
  test('a freshly verified national fact reports fresh and a zero age', () => {
    const resolved = resolve(nationalDeadline(2, 'month'), corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.freshness).toBe('fresh');
    expect(resolved.ageDays).toBe(0);
  });

  test('a national fact ninety days old reports stale', () => {
    const resolved = resolve(nationalDeadline(2, 'month'), corpus, {
      field: 'article_7.response_deadline',
      today: '2026-12-10',
    });
    expect(resolved.ageDays).toBe(90);
    expect(resolved.freshness).toBe('stale');
  });

  test('a fallback resolution reports the Directive fact’s own provenance, not the country’s', () => {
    const resolved = resolve(pendingDeadline, corpus, {
      field: 'article_7.response_deadline',
      today: TODAY,
    });
    expect(resolved.verifiedAt).not.toBeNull();
    expect(resolved.sources.length).toBeGreaterThan(0);
  });
});
