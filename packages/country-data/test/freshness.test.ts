/**
 * D-10 — LEGAL-08. Staleness degrades the UI; the build hard-fails only for the launch five.
 *
 * A global freshness gate is the obvious design and it is a trap: an unrelated typo fix on
 * a Tuesday must not be undeployable because Estonia's verification lapsed on Monday. A
 * site that goes dark is strictly worse than a site that says when it was last confirmed.
 *
 * The three-state boundary plan 01-01 fixed is deliberately re-asserted here: 364 days on
 * the stable class is `ageing`, 365 is `stale`. `freshnessOf` is NOT changed by this file.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { LAUNCH_COUNTRIES } from '../src/country.ts';
import {
  TTL_DAYS,
  assertNoUnchangedBump,
  degradationFor,
  freshnessGate,
  freshnessOf,
  unchangedBumps,
} from '../src/freshness.ts';

const TODAY = '2026-09-11';
/** 91 days before TODAY — one day past the 90-day volatile TTL. */
const NINETY_ONE_DAYS_AGO = '2026-06-12';

type Json = Record<string, unknown>;

const readRecord = (code: string): Json =>
  JSON.parse(
    readFileSync(new URL(`../data/${code}.json`, import.meta.url), 'utf8'),
  ) as Json;

/** Put a verified, stale legal basis on a record so the gate has something to bite on. */
function withStaleLegalBasis(code: string, verifiedAt: string | null, status = 'verified'): Json {
  const record = readRecord(code);
  (record['article_7'] as Json)['legal_basis'] = {
    value:
      status === 'verified'
        ? {
            instrument: 'national',
            short_title: 'Test Act',
            official_title: 'An Act transposing Directive (EU) 2023/970',
            journal_ref: null,
            article: null,
            adopted_at: null,
            in_force_from: null,
            url: null,
          }
        : null,
    status,
    sources: [],
    verified_at: verifiedAt,
    verified_by: status === 'verified' ? '@maintainer' : null,
    volatility: 'volatile',
  };
  return record;
}

const factOf = (verifiedAt: string | null, status = 'verified'): Json => ({
  value: status === 'verified' ? 'something' : null,
  status,
  sources: [],
  verified_at: verifiedAt,
  verified_by: null,
  volatility: 'volatile',
});

describe('freshness: staleness degrades rather than darkening the site', () => {
  test('a 91-day-old volatile fact on a non-launch country degrades and does not fail the build', () => {
    const descriptor = degradationFor(factOf(NINETY_ONE_DAYS_AGO), 'volatile', TODAY);
    expect(descriptor.render).toBe('degraded');
    expect(descriptor.lastConfirmed).toBe(NINETY_ONE_DAYS_AGO);

    const failures = freshnessGate([withStaleLegalBasis('EE', NINETY_ONE_DAYS_AGO)], TODAY);
    expect(failures).toHaveLength(0);
  });

  test('a stale fact is suppressed from the share card and from any letter citation', () => {
    const descriptor = degradationFor(factOf(NINETY_ONE_DAYS_AGO), 'volatile', TODAY);
    expect(descriptor.suppressFromShareCard).toBe(true);
    expect(descriptor.suppressFromLetterCitation).toBe(true);
  });

  test('the two suppression flags are separate fields from the render flag', () => {
    const descriptor = degradationFor(factOf(TODAY), 'volatile', TODAY);
    expect(descriptor.render).toBe('normal');
    expect(descriptor.suppressFromShareCard).toBe(false);
    expect(descriptor.suppressFromLetterCitation).toBe(false);
    // Phase 3 and Phase 5 branch on these independently, so they must not be one boolean.
    expect(Object.keys(descriptor).sort()).toEqual([
      'ageDays',
      'freshness',
      'lastConfirmed',
      'render',
      'suppressFromLetterCitation',
      'suppressFromShareCard',
    ]);
  });

  test('an ageing fact still renders normally — only stale degrades', () => {
    const descriptor = degradationFor('2026-07-20', 'volatile', TODAY);
    expect(freshnessOf('2026-07-20', 'volatile', TODAY)).toBe('ageing');
    expect(descriptor.render).toBe('normal');
    expect(descriptor.suppressFromShareCard).toBe(false);
  });
});

describe('freshness: the build fails only for the launch five', () => {
  test('the same 91-day-old legal basis on a launch country fails the gate', () => {
    const failures = freshnessGate([withStaleLegalBasis('PL', NINETY_ONE_DAYS_AGO)], TODAY);
    expect(failures).toHaveLength(1);
    const failure = failures[0];
    expect(failure?.country).toBe('PL');
    expect(failure?.field).toBe('article_7.legal_basis');
    expect(failure?.ageDays).toBe(91);
    expect(failure?.message).toMatch(/PL/);
    expect(failure?.message).toMatch(/article_7\.legal_basis/);
    expect(failure?.message).toMatch(/91/);
  });

  test('a stale launch-country fact that is pending_verification does not fail the gate', () => {
    // There is no value to be stale, and gating on it would block the build before the
    // maintainer promotion D-06 reserves.
    const failures = freshnessGate(
      [withStaleLegalBasis('PL', NINETY_ONE_DAYS_AGO, 'pending_verification')],
      TODAY,
    );
    expect(failures).toHaveLength(0);
  });

  test('a stale non-legally-operative launch-country field degrades and does not fail the gate', () => {
    const record = readRecord('PL');
    (record['enforcement'] as Json)['labour_inspectorate'] = {
      value: { name_local: 'Państwowa Inspekcja Pracy', name_en: null, url: null },
      status: 'verified',
      sources: [],
      verified_at: '2020-01-01',
      verified_by: '@maintainer',
      volatility: 'stable',
    };
    expect(freshnessGate([record], TODAY)).toHaveLength(0);
    expect(degradationFor('2020-01-01', 'stable', TODAY).render).toBe('degraded');
  });

  test('the gate is scoped to exactly the launch five and the three operative fields', () => {
    const records = [...LAUNCH_COUNTRIES].map((code) =>
      withStaleLegalBasis(code, NINETY_ONE_DAYS_AGO),
    );
    const failures = freshnessGate(records, TODAY);
    expect(failures.map((f) => f.country).sort()).toEqual([...LAUNCH_COUNTRIES].sort());
    expect(new Set(failures.map((f) => f.field))).toEqual(new Set(['article_7.legal_basis']));
  });

  test('a launch-country fact one day inside its window does not fail the gate', () => {
    const failures = freshnessGate([withStaleLegalBasis('PL', '2026-06-13')], TODAY);
    expect(failures).toHaveLength(0);
  });
});

describe('freshness: the boundary plan 01-01 fixed is unchanged', () => {
  test('the stable class is ageing at 364 days, stale at 365 and stale at 366', () => {
    expect(TTL_DAYS.stable).toBe(365);
    expect(freshnessOf('2025-09-12', 'stable', '2026-09-11')).toBe('ageing'); // 364
    expect(freshnessOf('2025-09-11', 'stable', '2026-09-11')).toBe('stale'); // 365
    expect(freshnessOf('2025-09-10', 'stable', '2026-09-11')).toBe('stale'); // 366
  });

  test('a null verified_at is stale in every volatility class', () => {
    for (const volatility of ['stable', 'volatile', 'pending', 'statistical'] as const) {
      expect(freshnessOf(null, volatility, TODAY)).toBe('stale');
    }
  });

  test('a null verified_at degrades, with no last-confirmed date to show', () => {
    const descriptor = degradationFor(factOf(null), 'volatile', TODAY);
    expect(descriptor.render).toBe('degraded');
    expect(descriptor.lastConfirmed).toBeNull();
    expect(descriptor.ageDays).toBeNull();
  });
});

describe('freshness: a date cannot move without a value moving', () => {
  const recordWith = (verifiedAt: string, value: unknown): Json => {
    const record = readRecord('EE');
    (record['article_7'] as Json)['response_deadline'] = {
      value,
      status: 'verified',
      sources: [],
      verified_at: verifiedAt,
      verified_by: null,
      volatility: 'volatile',
    };
    return record;
  };
  const twoMonths = {
    instrument: 'national',
    amount: 2,
    unit: 'month',
    from: 'request',
    national_citation: null,
  };
  const oneMonth = { ...twoMonths, amount: 1 };

  test('fails when only verified_at differs between two otherwise identical records', () => {
    const previous = recordWith('2026-06-01', twoMonths);
    const next = recordWith('2026-09-11', twoMonths);
    expect(() => assertNoUnchangedBump(previous, next)).toThrowError(/verified_at/);
    expect(unchangedBumps(previous, next)).toHaveLength(1);
    expect(unchangedBumps(previous, next)[0]?.field).toBe('article_7.response_deadline');
  });

  test('passes when the value moved with the date', () => {
    const previous = recordWith('2026-06-01', twoMonths);
    const next = recordWith('2026-09-11', oneMonth);
    expect(() => assertNoUnchangedBump(previous, next)).not.toThrow();
    expect(unchangedBumps(previous, next)).toHaveLength(0);
  });

  test('passes when neither the date nor the value moved', () => {
    const previous = recordWith('2026-06-01', twoMonths);
    const next = recordWith('2026-06-01', twoMonths);
    expect(unchangedBumps(previous, next)).toHaveLength(0);
  });

  test('catches a date set on a field whose value is still null — provenance theatre', () => {
    const previous = readRecord('EE');
    const next = readRecord('EE');
    (next['article_12_3'] as Json)['verified_at'] = '2026-09-11';
    expect(unchangedBumps(previous, next)).toHaveLength(1);
  });
});
