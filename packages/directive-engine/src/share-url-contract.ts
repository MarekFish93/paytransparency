/**
 * The share-URL contract, implemented ONCE.
 *
 * The result page and the card renderer both import from here, so the card can never
 * contradict the page the worker just read. Without this file, "the engine and the card
 * round identically" would be a sentence in a document rather than a property, and the
 * first time they disagreed the worker would be the one to notice.
 *
 * The three numbers below — the band edges, the rounding rule, and the k-anonymity floor
 * — were chosen by a human at a blocking checkpoint, not by an agent, because they are
 * one-way: a transmitted URL persists in social-media caches, in the edge worker's
 * request log and in the analytics beacon, so narrowing a band later cannot retract what
 * was already sent and widening one breaks links already shared.
 *
 * Everything here is pure, takes no dependency, and computes no Article 9 metric.
 *
 * The full specification, including the worked adversarial read, is `docs/share-url-contract.md`
 * at the repository root.
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

/**
 * The conservative eligible base the population estimates are modelled from: EU workers
 * employed by organisations inside the Directive's Article 9 reporting scope.
 *
 * Deliberately far below any plausible real figure. A k-anonymity floor is only worth
 * having if the number underneath it errs downwards — an optimistic base would let a
 * band pass the floor on arithmetic that reality does not support.
 *
 * MODELLED, NOT VERIFIED. See `docs/share-url-contract.md` §6 for the derivation and the
 * pending-verification note: a sourced figure must replace this before the card ships.
 */
export const MODELLED_ELIGIBLE_BASE = 20_000_000;

/**
 * Eight bands on a roughly logarithmic scale, chosen at the checkpoint (option
 * `medium-8`) with the top band OPEN-ENDED as the explicit condition of that choice.
 *
 * A closed top band is more identifying precisely where the population thins, which was
 * the stated weakness of this option; `over-300k` therefore has no upper edge and never
 * acquires one. Each band is half-open as `(minExclusive, maxInclusive]`, so a total
 * sitting exactly on a boundary is claimed by the band BELOW it.
 *
 * The floor band is labelled "up to €10k" rather than "under €10k" because it also
 * claims a zero and a negative lifetime total — a negative gap is a real result, and the
 * card has to be able to carry it without the band label lying about it.
 */
export const SHARE_BUCKETS: readonly ShareBucket[] = [
  { id: 'upto-10k', minExclusive: null, maxInclusive: 10_000, label: 'up to €10k', populationEstimate: 4_800_000 },
  { id: '10k-20k', minExclusive: 10_000, maxInclusive: 20_000, label: '€10k–€20k', populationEstimate: 3_200_000 },
  { id: '20k-40k', minExclusive: 20_000, maxInclusive: 40_000, label: '€20k–€40k', populationEstimate: 3_800_000 },
  { id: '40k-75k', minExclusive: 40_000, maxInclusive: 75_000, label: '€40k–€75k', populationEstimate: 3_400_000 },
  { id: '75k-125k', minExclusive: 75_000, maxInclusive: 125_000, label: '€75k–€125k', populationEstimate: 2_200_000 },
  { id: '125k-200k', minExclusive: 125_000, maxInclusive: 200_000, label: '€125k–€200k', populationEstimate: 1_400_000 },
  { id: '200k-300k', minExclusive: 200_000, maxInclusive: 300_000, label: '€200k–€300k', populationEstimate: 600_000 },
  { id: 'over-300k', minExclusive: 300_000, maxInclusive: null, label: 'over €300k', populationEstimate: 600_000 },
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

/**
 * Round a gap percentage to whole percentage points, ties AWAY FROM ZERO.
 *
 * Numerically: `roundGapPct(14.5) === 15`, `roundGapPct(-14.5) === -15`,
 * `roundGapPct(13.5) === 14`.
 *
 * This is deliberately NOT `Math.round`, which is half-up toward +Infinity and would
 * return -14 for -14.5. A gender pay gap carries a sign — a negative gap means women are
 * paid more on average, which is a real result the card must be able to state plainly —
 * and an asymmetric rule would systematically understate the gap in one direction only.
 * Away-from-zero treats +x.5 and -x.5 identically in magnitude.
 *
 * `-0` is normalised to `0`, so a small negative gap never reaches a URL as `gap=-0`.
 */
export function roundGapPct(gapPct: number): number {
  assertFinite(gapPct, 'gapPct');
  const magnitude = Math.round(Math.abs(gapPct));
  if (magnitude === 0) return 0;
  return gapPct < 0 ? -magnitude : magnitude;
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

/**
 * Strip any query and fragment a base URL already carries, returning just the part before
 * them.
 *
 * Hand-rolled rather than `new URL(base)` on purpose: `tsconfig.json` sets `types: []` for
 * this package because nothing under `src/` may touch an environment global — it is
 * consumed in the browser by the result page and by the card renderer. Adding the `DOM`
 * lib to type `URL` would pull in `window` and `document` with it and weaken that guard for
 * one string split.
 *
 * The fragment marker is found FIRST, because a `?` after a `#` is part of the fragment,
 * not a query.
 */
function baseWithoutQueryOrFragment(base: string): string {
  const hashAt = base.indexOf('#');
  const beforeHash = hashAt === -1 ? base : base.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  return queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
}

/**
 * Build the share URL. The query carries only {@link TRANSMITTED_KEYS}; inputs go after `#`.
 *
 * ANY QUERY OR FRAGMENT ON `base` IS DISCARDED, and that is the contract rather than a
 * convenience. This used to be `${base}?${query}${fragment}`, which assumed a base with
 * neither:
 *
 *   - a base of `https://site/og?lang=pl` produced `https://site/og?lang=pl?v=1&gap=…`,
 *     where `band` and `gap` land inside the VALUE of `lang` and the card renderer reading
 *     `band` gets nothing;
 *   - a base carrying a fragment put the worker's private state after an existing `#`,
 *     i.e. inside another fragment's value. That is the half that matters: the fragment is
 *     where the salary figures live, and the entire zero-egress promise rests on them
 *     being parseable by the worker's own browser and by nothing else.
 *
 * Discarding rather than merging is what makes the transmitted set genuinely CLOSED:
 * `transmittedKeysOf(buildShareUrl(anyBase, input))` is exactly `TRANSMITTED_KEYS`, for
 * every base, with no unreviewed parameter riding along in a URL this contract claims to
 * have enumerated.
 */
export function buildShareUrl(base: string, input: ShareInput): string {
  const values: Record<TransmittedKey, string> = {
    v: String(SHARE_CONTRACT_VERSION),
    gap: String(roundGapPct(input.gapPct)),
    band: bucketLifetime(input.lifetimeTotalEur).id,
    lang: input.locale,
  };

  // Key order is the contract's, not the caller's: TRANSMITTED_KEYS is what a reviewer
  // reads the URL against.
  const query = TRANSMITTED_KEYS.map((key) => `${key}=${encodeURIComponent(values[key])}`).join('&');

  const entries = Object.entries(input.privateState ?? {});
  const fragment = entries.length
    ? `#${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
    : '';

  return `${baseWithoutQueryOrFragment(base)}?${query}${fragment}`;
}

/**
 * The parameter names actually present in a URL's query — the closed-set check, in both
 * directions.
 *
 * NEVER THROWS. This is a validator run over arbitrary, possibly hostile text, and it used
 * to call `decodeURIComponent` on it directly — which raises `URIError` on a malformed
 * escape such as `?%ZZ=1`. A validator that throws instead of reporting is one `try` away
 * from a caller that swallows the error and concludes "no forbidden keys", which is the
 * worst possible outcome for a check whose whole job is to prove nothing private is in the
 * query string. A key that cannot be decoded is REPORTED, raw, so the closed-set comparison
 * sees it and rejects it.
 */
export function transmittedKeysOf(url: string): string[] {
  const afterFragment = url.split('#')[0] ?? '';
  const query = afterFragment.slice(afterFragment.indexOf('?') + 1);
  if (!afterFragment.includes('?') || query === '') return [];
  return query.split('&').map((pair) => {
    const raw = pair.split('=')[0] ?? '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  });
}
