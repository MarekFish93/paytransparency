/**
 * `resolve()` — LEGAL-03. The single place "two months unless national law verifiably
 * says otherwise" is decided.
 *
 * ONE Directive citation key appears in this file: `32023L0970#007.004`. It is the
 * single corpus entry plan 01-01 wrote in wave 1 and plan 01-03 preserves, so every
 * assertion here holds whether or not 01-03 has finished filling the corpus alongside
 * this plan. The referential pass that proves EVERY fallback key resolves against the
 * complete 66-entry corpus belongs to plan 01-05, in wave 4.
 *
 * `-t "fallback"` is the filter `01-VALIDATION.md` binds LEGAL-03 to.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { DirectiveFile } from '../src/schema.ts';
import type { Fact, Source } from '../src/schema.ts';
import {
  DIRECTIVE_FALLBACK_KEYS,
  resolve,
  type DirectiveCorpus,
  type Provenance,
} from '../src/resolve.ts';

/** The one key present in the corpus from wave 1. Nothing else is asserted here. */
const DEADLINE_KEY = '32023L0970#007.004';
const TODAY = '2026-09-11';

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
