/**
 * The share URL is the one place in this product where a derived figure deliberately
 * leaves the browser, and it cannot be un-transmitted: it persists in social-media
 * caches, in the edge worker's request log, and in the analytics beacon's page-URL
 * field. Narrowing a band later does not retract what was already sent; widening one
 * breaks every link already shared.
 *
 * So this suite asserts the contract in BOTH directions — nothing forbidden may join
 * the transmitted set, and nothing outside the set may appear in a constructed URL —
 * and it asserts the numbers, not the prose: the tie direction is named explicitly
 * rather than inherited from the language's default, and every band is checked against
 * the k-anonymity floor rather than eyeballed for width.
 *
 * Offline. Reads only files in this repository and constructs strings.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildShareUrl,
  bucketLifetime,
  cellEstimate,
  GAP_VALUES_PER_BAND,
  K_ANONYMITY_FLOOR,
  roundGapPct,
  SHARE_BUCKETS,
  SHARE_CONTRACT_VERSION,
  TRANSMITTED_KEYS,
  transmittedKeysOf,
} from '../src/share-url-contract.ts';

const SPEC_DOC = fileURLToPath(new URL('../../../docs/share-url-contract.md', import.meta.url));
const CONTRACT_SRC = fileURLToPath(new URL('../src/share-url-contract.ts', import.meta.url));

function readArtefact(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Any key name touching one of these is disqualifying. They are the signals that turn a
 * shared statistic back into a person: a country plus a sector plus a seniority is a
 * near-unique fingerprint long before a salary is involved.
 */
const FORBIDDEN_KEY_SIGNALS = /country|sector|seniorit|age|employer|salary|pay|income|birth|date/i;

/** The finite edges between adjacent bands. */
const boundaries = SHARE_BUCKETS.map((b) => b.maxInclusive).filter((m): m is number => m !== null);

const specDoc = readArtefact(SPEC_DOC);

describe('the transmitted parameter set is closed in both directions', () => {
  it('names nothing that could identify a person — no country, sector, seniority, age, employer, salary or date', () => {
    const offenders = TRANSMITTED_KEYS.filter((key) => FORBIDDEN_KEY_SIGNALS.test(key));
    expect(offenders).toEqual([]);
    expect(TRANSMITTED_KEYS.length).toBeGreaterThan(0);
  });

  it('puts no key in a constructed share URL that is not on the list', () => {
    const url = buildShareUrl('https://example.test/og', {
      gapPct: 13.6,
      lifetimeTotalEur: 64_200,
      locale: 'pl',
      privateState: { grossPay: '7777.77', years: '11' },
    });
    expect(transmittedKeysOf(url).sort()).toEqual([...TRANSMITTED_KEYS].sort());
  });

  it('keeps the worker’s own inputs after the fragment marker, where the request line never carries them', () => {
    const url = buildShareUrl('https://example.test/og', {
      gapPct: 13.6,
      lifetimeTotalEur: 64_200,
      locale: 'pl',
      privateState: { grossPay: '7777.77', years: '11' },
    });
    const transmitted = url.split('#')[0] ?? '';
    expect(transmitted).not.toContain('7777.77');
    expect(url).toContain('#');
    expect(url.slice(url.indexOf('#'))).toContain('7777.77');
  });

  it('carries the contract version in the constructed URL, so a future boundary change is additive', () => {
    const url = buildShareUrl('https://example.test/og', { gapPct: 14, lifetimeTotalEur: 60_000, locale: 'en' });
    expect(transmittedKeysOf(url)).toContain('v');
    expect(url).toContain(`v=${SHARE_CONTRACT_VERSION}`);
  });
});

describe('bucketLifetime — boundaries are claimed by the band below them', () => {
  it('returns the LOWER of the two adjacent bands at every boundary value in the table', () => {
    const offenders = boundaries
      .map((edge, index) => {
        const expected = SHARE_BUCKETS[index];
        const actual = bucketLifetime(edge);
        return actual.id === expected?.id ? null : { edge, expected: expected?.id, actual: actual.id };
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(boundaries.length).toBeGreaterThan(0);
  });

  it('moves to the next band one euro above a boundary and stays below one euro under it', () => {
    const offenders = boundaries
      .map((edge, index) => {
        const below = bucketLifetime(edge - 1).id;
        const above = bucketLifetime(edge + 1).id;
        const wantBelow = SHARE_BUCKETS[index]?.id;
        const wantAbove = SHARE_BUCKETS[index + 1]?.id;
        return below === wantBelow && above === wantAbove ? null : { edge, below, wantBelow, above, wantAbove };
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
  });

  it('names a band for zero and for ten times the largest boundary — never undefined, never out of range', () => {
    const largest = Math.max(...boundaries);
    const floor = bucketLifetime(0);
    const ceiling = bucketLifetime(largest * 10);

    expect(floor.id).toBe(SHARE_BUCKETS[0]?.id);
    expect(ceiling.id).toBe(SHARE_BUCKETS[SHARE_BUCKETS.length - 1]?.id);
    expect(ceiling.maxInclusive).toBeNull();
  });

  it('leaves the top band open-ended, which is the condition the bucket choice was accepted on', () => {
    const top = SHARE_BUCKETS[SHARE_BUCKETS.length - 1];
    expect(top?.maxInclusive).toBeNull();
    expect(SHARE_BUCKETS.filter((b) => b.maxInclusive === null)).toHaveLength(1);
    expect(SHARE_BUCKETS[0]?.minExclusive).toBeNull();
  });

  it('lays the table out in ascending, gapless, non-overlapping order', () => {
    const offenders = SHARE_BUCKETS.slice(1)
      .map((bucket, i) => {
        const previous = SHARE_BUCKETS[i];
        return bucket.minExclusive === previous?.maxInclusive ? null : { id: bucket.id, after: previous?.id };
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(SHARE_BUCKETS).toHaveLength(8);
  });
});

describe('roundGapPct — the tie direction is a recorded decision, not the language default', () => {
  it('rounds a tie away from zero, symmetrically: 14.5 to 15 and -14.5 to -15', () => {
    expect(roundGapPct(14.5)).toBe(15);
    expect(roundGapPct(-14.5)).toBe(-15);
    expect(roundGapPct(13.5)).toBe(14);
    // Math.round(-14.5) is -14 — half-up toward +Infinity. A gap whose sign carries
    // meaning must not be rounded asymmetrically, or the card systematically understates
    // the gap in one direction only.
    expect(roundGapPct(-14.5)).not.toBe(Math.round(-14.5));
  });

  it('reports a negative gap as negative rather than clamping it to zero', () => {
    expect(roundGapPct(-3.4)).toBe(-3);
    expect(roundGapPct(-3.6)).toBe(-4);
    expect(roundGapPct(-0.4)).toBe(0);
    expect(Object.is(roundGapPct(-0.4), -0)).toBe(false);
  });

  it('rounds to whole percentage points, never to a decimal', () => {
    const samples = [0, 0.49, 1.2, 7.77, 13.6, 22.4, -6.5, 31.09];
    for (const sample of samples) expect(Number.isInteger(roundGapPct(sample))).toBe(true);
  });
});

describe('k-anonymity — wide bands as a checkable property, not an aesthetic judgement', () => {
  it('declares a population estimate at or above the floor for every band', () => {
    const offenders = SHARE_BUCKETS.filter((b) => b.populationEstimate < K_ANONYMITY_FLOOR).map((b) => ({
      id: b.id,
      populationEstimate: b.populationEstimate,
    }));
    expect(offenders).toEqual([]);
    expect(K_ANONYMITY_FLOOR).toBe(25_000);
  });

  it('keeps the narrowest transmitted cell — one band crossed with one rounded gap value — above the floor too', () => {
    const offenders = SHARE_BUCKETS.filter((b) => cellEstimate(b) < K_ANONYMITY_FLOOR).map((b) => ({
      id: b.id,
      cell: cellEstimate(b),
    }));
    expect(offenders).toEqual([]);
    expect(GAP_VALUES_PER_BAND).toBeGreaterThan(1);
  });
});

describe('the implementation exists once, and takes no dependency', () => {
  it('imports nothing from outside the package', () => {
    const code = readArtefact(CONTRACT_SRC);
    expect(code).not.toBe('');
    const specifiers = [...code.matchAll(/^\s*(?:import|export)[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1] ?? '');
    const external = specifiers.filter((s) => !s.startsWith('./') && !s.startsWith('../'));
    expect(external).toEqual([]);
  });
});

describe('docs/share-url-contract.md — the versioned specification', () => {
  it('carries all seven required elements as numbered sections', () => {
    const missing = [1, 2, 3, 4, 5, 6, 7].filter((n) => !new RegExp(`^## ${n}\\.`, 'm').test(specDoc));
    expect(missing).toEqual([]);
  });

  it('carries a worked adversarial read of an actual log line — the element most likely to be dropped', () => {
    expect(specDoc).toMatch(/adversarial/i);
    expect(specDoc).toMatch(/\/og\?v=1&gap=/);
  });

  it('states the tie direction numerically rather than in prose, and names the k-anonymity floor', () => {
    expect(specDoc).toContain('roundGapPct(-14.5)');
    expect(specDoc).toContain('25,000');
    expect(specDoc).toMatch(new RegExp(`version\\s*\`?${SHARE_CONTRACT_VERSION}`, 'i'));
  });

  it('publishes the same band identifiers the implementation transmits', () => {
    const missing = SHARE_BUCKETS.filter((b) => !specDoc.includes(b.id)).map((b) => b.id);
    expect(missing).toEqual([]);
  });
});

describe('WR-10 — the base is not assumed to be bare, and the validator never throws', () => {
  const input = { gapPct: 12.4, lifetimeTotalEur: 42_000, locale: 'pl' };

  it('replaces a query the base already carries rather than appending a second one', () => {
    // `${base}?${query}` on `https://site/og?lang=en` produced
    // `https://site/og?lang=en?v=1&gap=…`, where `band` and `gap` end up inside the VALUE
    // of `lang` and the card renderer reading `band` gets nothing.
    const url = buildShareUrl('https://site/og?lang=en&tracking=1', input);
    expect(url.match(/\?/g)).toHaveLength(1);
    expect(transmittedKeysOf(url)).toEqual([...TRANSMITTED_KEYS]);
    expect(url).toContain('lang=pl');
    expect(url).not.toContain('tracking');
  });

  it('never nests the worker\u2019s private state inside another fragment', () => {
    // The half that matters: the fragment is where the salary figures live, and the whole
    // zero-egress promise rests on them being parseable by the worker's own browser.
    const url = buildShareUrl('https://site/og#already=here', {
      ...input,
      privateState: { salary: '54000' },
    });
    expect(url.match(/#/g)).toHaveLength(1);
    expect(url.slice(url.indexOf('#') + 1)).toBe('salary=54000');
    expect(url).not.toContain('already=here');
  });

  it('handles a base carrying both, and one where the ? sits after the #', () => {
    expect(buildShareUrl('https://site/og?a=1#b=2', input)).toBe(
      `https://site/og?v=${SHARE_CONTRACT_VERSION}&gap=12&band=${bucketLifetime(42_000).id}&lang=pl`,
    );
    // A `?` after a `#` is part of the fragment, not a query — so the split must find the
    // fragment marker first.
    expect(buildShareUrl('https://site/og#f?notaquery', input)).toContain('https://site/og?v=');
  });

  it('the transmitted set stays closed for every shape of base', () => {
    for (const base of [
      'https://site/og',
      'https://site/og?lang=en',
      'https://site/og#x=1',
      'https://site/og?lang=en#x=1',
      'https://site/og?',
      'https://site/og#',
    ]) {
      expect(`${base} -> ${transmittedKeysOf(buildShareUrl(base, input)).join(',')}`).toBe(
        `${base} -> ${[...TRANSMITTED_KEYS].join(',')}`,
      );
    }
  });

  it('reports a malformed escape instead of throwing out of the check', () => {
    // `transmittedKeysOf` is a validator run over arbitrary, possibly hostile text.
    // `decodeURIComponent('%ZZ')` raises URIError, and a validator that throws is one
    // `try` away from a caller that swallows it and concludes "no forbidden keys" — the
    // worst outcome for a check whose job is to prove nothing private is in the query.
    expect(() => transmittedKeysOf('https://site/og?%ZZ=1')).not.toThrow();
    expect(transmittedKeysOf('https://site/og?%ZZ=1')).toEqual(['%ZZ']);

    // And the undecodable key is REPORTED, so the closed-set comparison sees and rejects it.
    const keys = transmittedKeysOf('https://site/og?v=1&%E0%A4%A=x');
    expect(keys).toContain('%E0%A4%A');
    expect(keys.every((key) => (TRANSMITTED_KEYS as readonly string[]).includes(key))).toBe(false);
  });
});
