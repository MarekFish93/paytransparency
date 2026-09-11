/**
 * RED-PHASE SKELETON — the shapes are here, the recorded decision is not.
 *
 * `roundGapPct` deliberately delegates to the language's default rounding and
 * `SHARE_BUCKETS` holds a single placeholder band, so that
 * `test/share-url-contract.test.ts` fails on the two things that actually matter:
 * a rounding rule that is whatever the platform happens to do is not a recorded
 * decision, and a bucket table that has not been checked against a k-anonymity floor
 * is an aesthetic judgement rather than a checkable property.
 *
 * Both are replaced in the GREEN commit with the values chosen at the plan's
 * blocking-human checkpoint.
 */

/** Bumped whenever the bucket table or the rounding rule changes, so a change is additive. */
export const SHARE_CONTRACT_VERSION = 1;

/** The minimum population a transmitted band must cover for the card to be non-identifying. */
export const K_ANONYMITY_FLOOR = 25_000;

/** Modelled count of distinct whole-point gap values one lifetime band plausibly spreads over. */
export const GAP_VALUES_PER_BAND = 12;

/** Thrown-code prefix for a value that cannot be transmitted. */
export const SHARE_ERROR_NOT_FINITE = 'E_SHARE_VALUE_NOT_FINITE';

/**
 * The transmitted parameter set — exhaustive and CLOSED.
 *
 * A parameter not on this list appearing in a transmitted URL is a defect, not a
 * feature. Nothing naming a country, sector, seniority, age, employer, salary or date
 * may ever join it: the edge worker logs the request line, the recipient's platform
 * fetches the URL server-side when the card is unfurled, and the analytics beacon
 * reports the page URL.
 */
export const TRANSMITTED_KEYS = ['v', 'gap', 'band', 'lang'] as const;

export type TransmittedKey = (typeof TRANSMITTED_KEYS)[number];

/** One band of the lifetime-total bucket table. Half-open as `(minExclusive, maxInclusive]`. */
export interface ShareBucket {
  /** URL-safe identifier. This string, and only this string, is transmitted. */
  id: string;
  /** Exclusive lower edge in EUR; `null` on the floor band, which has no lower edge. */
  minExclusive: number | null;
  /** Inclusive upper edge in EUR; `null` on the open-ended ceiling band. */
  maxInclusive: number | null;
  /** Human-readable band, as it appears on the card. */
  label: string;
  /** Modelled count of EU workers whose lifetime total falls in this band. */
  populationEstimate: number;
}

/** RED placeholder — one band covering nothing in particular, with no population behind it. */
export const SHARE_BUCKETS: readonly ShareBucket[] = [
  { id: 'upto-10k', minExclusive: null, maxInclusive: 10_000, label: 'up to €10k', populationEstimate: 0 },
];

/** The narrowest transmitted cell: one band crossed with one rounded gap value. */
export function cellEstimate(bucket: ShareBucket): number {
  return Math.floor(bucket.populationEstimate / GAP_VALUES_PER_BAND);
}

function assertFinite(value: number, what: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${SHARE_ERROR_NOT_FINITE}: ${what} must be a finite number, received ${String(value)}`);
  }
}

/** RED placeholder — the language's default rounding, which is exactly what must NOT ship. */
export function roundGapPct(gapPct: number): number {
  assertFinite(gapPct, 'gapPct');
  return Math.round(gapPct);
}

/** The band a lifetime total falls in. Never `undefined`, never out of range. */
export function bucketLifetime(lifetimeTotalEur: number): ShareBucket {
  assertFinite(lifetimeTotalEur, 'lifetimeTotalEur');
  for (const bucket of SHARE_BUCKETS) {
    if (bucket.maxInclusive === null || lifetimeTotalEur <= bucket.maxInclusive) return bucket;
  }
  const last = SHARE_BUCKETS[SHARE_BUCKETS.length - 1];
  if (last === undefined) throw new RangeError('E_SHARE_NO_BUCKETS: the bucket table is empty');
  return last;
}

/** What the worker actually saw, before anything is rounded or bucketed. */
export interface ShareInput {
  /** The unrounded gap percentage on the result page. Rounded before transmission. */
  gapPct: number;
  /** The unrounded lifetime total in EUR. Bucketed before transmission. */
  lifetimeTotalEur: number;
  /** Locale tag, e.g. `en` or `pl`. */
  locale: string;
  /**
   * The worker's own inputs, so THEIR copy of the link restores THEIR page. These go
   * after the fragment marker and are never sent in the HTTP request line, so they
   * reach neither the edge worker, nor the recipient's platform, nor the beacon.
   */
  privateState?: Readonly<Record<string, string>>;
}

/** Build the share URL. The query carries only {@link TRANSMITTED_KEYS}; inputs go after `#`. */
export function buildShareUrl(base: string, input: ShareInput): string {
  const values: Record<TransmittedKey, string> = {
    v: String(SHARE_CONTRACT_VERSION),
    gap: String(roundGapPct(input.gapPct)),
    band: bucketLifetime(input.lifetimeTotalEur).id,
    lang: input.locale,
  };
  const query = TRANSMITTED_KEYS.map((key) => `${key}=${encodeURIComponent(values[key])}`).join('&');
  const entries = Object.entries(input.privateState ?? {});
  const fragment = entries.length
    ? `#${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
    : '';
  return `${base}?${query}${fragment}`;
}

/** The parameter names actually present in a URL's query — the closed-set check, in both directions. */
export function transmittedKeysOf(url: string): string[] {
  const afterFragment = url.split('#')[0] ?? '';
  const query = afterFragment.slice(afterFragment.indexOf('?') + 1);
  if (!afterFragment.includes('?') || query === '') return [];
  return query.split('&').map((pair) => decodeURIComponent(pair.split('=')[0] ?? ''));
}
