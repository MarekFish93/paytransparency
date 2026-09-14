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
  evidenceReread,
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
    // 83 days: at or past 75% of the 90-day volatile TTL, still inside it.
    const descriptor = degradationFor('2026-06-20', 'volatile', TODAY);
    expect(freshnessOf('2026-06-20', 'volatile', TODAY)).toBe('ageing');
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
    // 89 days. The TTL boundary is inclusive on the stale side, so 90 would fail: the
    // window that expires "some time after" its stated length is not a window.
    expect(freshnessGate([withStaleLegalBasis('PL', '2026-06-14')], TODAY)).toHaveLength(0);
    expect(freshnessGate([withStaleLegalBasis('PL', '2026-06-13')], TODAY)).toHaveLength(1);
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

// ---------------------------------------------------------------------------
// CR-02 — the freshness gate and the unchanged-bump rule used to be mutually exclusive
// ---------------------------------------------------------------------------

/**
 * The deadlock, and the proof that it is gone.
 *
 * `freshnessGate` hard-fails a launch country's legally-operative fact past its TTL, and
 * the only way to clear that is to move `verified_at` forward. `unchangedBumps` rejected
 * any fact whose date moved while its value did not. A re-verification confirming the law
 * has NOT changed — the usual outcome — is exactly that commit, so the only commit which
 * cleared one gate was precisely the commit the other rejected. The routine re-verification
 * the `freshness-gate` job's own failure text demands was mechanically impossible in CI.
 *
 * Every case below is asserted as a PAIR: what each gate says before the commit and what
 * each says after it. Asserting only the bump rule would pass against a fix that broke the
 * freshness gate instead, which is the shape the two gates kept failing in.
 */
describe('freshness: routine re-verification clears the gate without tripping the bump rule', () => {
  const STALE_DATE = '2026-01-01';

  /** A launch-country legally-operative fact, stale on TODAY, citing one source. */
  const plLegalBasis = (verifiedAt: string, accessedAt: string, value?: unknown): Json => ({
    country: { code: 'PL' },
    article_7: {
      legal_basis: {
        value: value ?? { instrument: 'national', short_title: 'Ustawa' },
        status: 'verified',
        sources: [{ url: 'https://isap.sejm.gov.pl/x', accessed_at: accessedAt }],
        verified_at: verifiedAt,
        verified_by: 'marek',
        volatility: 'volatile',
      },
    },
  });

  const before = () => plLegalBasis(STALE_DATE, STALE_DATE);

  test('the fact really is stale before the commit \u2014 otherwise the rest proves nothing', () => {
    expect(freshnessGate([before()], TODAY).map((f) => f.field)).toEqual([
      'article_7.legal_basis',
    ]);
  });

  test('re-reading the source and re-confirming the same value clears BOTH gates', () => {
    // This is the commit that was impossible: the value is byte-identical, the date moved,
    // and the cited source's own accessed_at moved with it.
    const after = plLegalBasis(TODAY, TODAY);
    expect(freshnessGate([after], TODAY)).toHaveLength(0);
    expect(unchangedBumps(before(), after)).toHaveLength(0);
    expect(() => assertNoUnchangedBump(before(), after)).not.toThrow();
  });

  test('bumping the date while the source is untouched is still rejected', () => {
    // The shape the rule exists to catch, unweakened: a silent deadline change disguised
    // as a typo fix moves nothing but the date.
    const after = plLegalBasis(TODAY, STALE_DATE);
    expect(freshnessGate([after], TODAY)).toHaveLength(0);
    const bumps = unchangedBumps(before(), after);
    expect(bumps).toHaveLength(1);
    expect(bumps[0]?.message).toMatch(/was not read again/);
    // The message must send the maintainer to the evidence, not to the TTL.
    expect(bumps[0]?.message).toMatch(/do not extend the TTL/);
  });

  test('nudging accessed_at by a day does not unlock an arbitrary verified_at', () => {
    // A fact cannot have been verified on a day after the last day its source was read.
    const after = plLegalBasis(TODAY, '2026-01-02');
    const bumps = unchangedBumps(before(), after);
    expect(bumps).toHaveLength(1);
    expect(bumps[0]?.message).toMatch(/later than the most recent accessed_at/);
  });

  test('re-reading one of two cited sources is not re-verification', () => {
    // "Every source", not "at least one": re-reading the easy source and bumping the date
    // is the same defect in a smaller costume.
    const twoSources = (verifiedAt: string, firstAccessed: string, secondAccessed: string): Json => {
      const record = plLegalBasis(verifiedAt, firstAccessed);
      const fact = (record['article_7'] as Json)['legal_basis'] as Json;
      (fact['sources'] as unknown[]).push({
        url: 'https://dziennikustaw.gov.pl/y',
        accessed_at: secondAccessed,
      });
      return record;
    };
    const previous = twoSources(STALE_DATE, STALE_DATE, STALE_DATE);
    expect(unchangedBumps(previous, twoSources(TODAY, TODAY, STALE_DATE))).toHaveLength(1);
    expect(unchangedBumps(previous, twoSources(TODAY, TODAY, TODAY))).toHaveLength(0);
  });

  test('a fact citing no source cannot be re-verified into freshness', () => {
    const previous = plLegalBasis(STALE_DATE, STALE_DATE);
    ((previous['article_7'] as Json)['legal_basis'] as Json)['sources'] = [];
    const after = plLegalBasis(TODAY, TODAY);
    ((after['article_7'] as Json)['legal_basis'] as Json)['sources'] = [];
    expect(unchangedBumps(previous, after)[0]?.message).toMatch(/cites no source/);
  });

  test('there is no flag, marker or override that exempts a bump', () => {
    // The exemption is keyed on EVIDENCE and on nothing a human can simply assert. This
    // asserts the ABSENCE of the escape hatch a person under deadline reaches for first.
    const after = plLegalBasis(TODAY, STALE_DATE);
    const fact = (after['article_7'] as Json)['legal_basis'] as Json;
    for (const escape of ['reverified', 'reverified_at', 'override', 'skip_bump_check']) {
      fact[escape] = true;
      expect(`${escape}: ${unchangedBumps(before(), after).length}`).toBe(`${escape}: 1`);
      delete fact[escape];
    }
  });

  test('evidenceReread reports WHY, so a failure is actionable rather than a puzzle', () => {
    const stale = (plLegalBasis(STALE_DATE, STALE_DATE)['article_7'] as Json)[
      'legal_basis'
    ] as Record<string, unknown>;
    const fresh = (plLegalBasis(TODAY, TODAY)['article_7'] as Json)['legal_basis'] as Record<
      string,
      unknown
    >;
    expect(evidenceReread(stale, fresh)).toEqual({
      reread: true,
      why: `every cited source was read again, most recently ${TODAY}`,
    });
    expect(evidenceReread(stale, stale).reread).toBe(false);
  });
});
