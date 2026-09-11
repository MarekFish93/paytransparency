/**
 * Volatility-class freshness windows.
 *
 * `verified_at` is only a control if something acts on it. This module is that
 * something: it turns a date into one of three dispositions that Phase 3 renders and
 * Phase 5 suppresses on (D-10 — a stale fact degrades the UI and is suppressed from any
 * share card or letter citation; the build hard-fails only for launch countries).
 */
import { LAUNCH_COUNTRIES, LEGALLY_OPERATIVE_FIELDS } from './country.ts';
import type { Volatility } from './schema.ts';

/**
 * Days a fact of each class stays trustworthy.
 *
 * | Class         | Fields                                                        | TTL  |
 * |---------------|---------------------------------------------------------------|------|
 * | `stable`      | equality-body name/URL, Directive article ids and quotations   | 365d |
 * | `volatile`    | transposition status, national legal basis, deadline, Art.12(3)|  90d |
 * | `pending`     | anything whose source says "draft" / "in parliament"           |  30d |
 * | `statistical` | Eurostat GPG (Phase 4)                                         | none |
 *
 * `statistical` is `null` deliberately: its freshness is governed by the publisher's
 * `next_expected_release`, not by elapsed days. Callers handling statistical facts must
 * apply that rule themselves — this function cannot, and says so rather than guessing.
 *
 * Directive quotations are `stable` on evidence, not by assumption: the Cellar
 * expression's `Last-Modified` is 13 Dec 2023 and has not moved since.
 */
export const TTL_DAYS = {
  stable: 365,
  volatile: 90,
  pending: 30,
  statistical: null,
} as const satisfies Record<Volatility, number | null>;

export type Freshness = 'fresh' | 'ageing' | 'stale';

/** Fraction of the TTL at which a fact starts reporting `ageing`. */
export const AGEING_AT = 0.75;

const DAY_MS = 86_400_000;

/** Whole days between two `YYYY-MM-DD` calendar dates, computed in UTC. */
export function elapsedDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw new RangeError(`elapsedDays expects YYYY-MM-DD dates, got "${from}" and "${to}"`);
  }
  return Math.round((b - a) / DAY_MS);
}

/**
 * Classify a fact's freshness.
 *
 * The TTL boundary is INCLUSIVE ON THE STALE SIDE: at exactly `TTL_DAYS` elapsed the
 * fact is `stale`, not `fresh`. A window that expires "some time after" its stated
 * length is not a window.
 *
 * A `null` `verified_at` is `stale` — never checked is not the same as recently checked,
 * and the safe reading of "we have no date" is "do not rely on this".
 */
export function freshnessOf(
  verifiedAt: string | null,
  volatility: Volatility,
  today: string,
): Freshness {
  if (verifiedAt === null) return 'stale';

  const ttl = TTL_DAYS[volatility];
  // No elapsed-day TTL: freshness is governed by next_expected_release (Phase 4).
  if (ttl === null) return 'fresh';

  const elapsed = elapsedDays(verifiedAt, today);
  if (elapsed >= ttl) return 'stale';
  if (elapsed >= ttl * AGEING_AT) return 'ageing';
  return 'fresh';
}

// ---------------------------------------------------------------------------
// D-10 — staleness degrades the UI; the build fails only for the launch five
// ---------------------------------------------------------------------------

/**
 * What a renderer should do with a fact, given its age.
 *
 * The three flags are deliberately separate. A privacy or reliability suppression is a
 * different claim from a staleness suppression, and Phase 3 (the country page) and Phase 5
 * (the letter) branch on them independently — collapsing them into one boolean would force
 * the letter generator to re-derive the distinction, and it would get it wrong.
 */
export type DegradationDescriptor = {
  render: 'normal' | 'degraded';
  lastConfirmed: string | null;
  ageDays: number | null;
  freshness: Freshness;
  suppressFromShareCard: boolean;
  suppressFromLetterCitation: boolean;
};

/** One launch-country legally-operative fact that is past its window. Hard-fails the build. */
export type FreshnessFailure = {
  country: string;
  field: string;
  ageDays: number | null;
  ttlDays: number | null;
  volatility: Volatility;
  message: string;
};

/** One `verified_at` that advanced while its value stood still. */
export type UnchangedBump = { country: string; field: string; message: string };

type FactLike = {
  value?: unknown;
  status?: unknown;
  verified_at?: unknown;
  volatility?: unknown;
};

const isRecordLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Accepts a `Fact`, a bare `YYYY-MM-DD`, or null — a renderer holds any of the three. */
function verifiedAtOf(fact: FactLike | string | null | undefined): string | null {
  if (typeof fact === 'string') return fact;
  if (fact === null || fact === undefined) return null;
  return typeof fact.verified_at === 'string' ? fact.verified_at : null;
}

/**
 * What the UI does with a fact of this age.
 *
 * A stale fact **degrades**: the country page reads that it was last confirmed on a stated
 * date and the status may have changed, and the call to action still works. The stale
 * value is suppressed from any share card and from any letter citation — those two
 * artefacts leave the site and cannot be corrected after the fact, so a value that is no
 * longer confirmed must not travel inside them.
 *
 * `ageing` renders normally. It is the nagging state, not the degraded one.
 */
export function degradationFor(
  fact: FactLike | string | null | undefined,
  volatility: Volatility,
  today: string,
): DegradationDescriptor {
  const verifiedAt = verifiedAtOf(fact);
  const freshness = freshnessOf(verifiedAt, volatility, today);
  const stale = freshness === 'stale';
  return {
    render: stale ? 'degraded' : 'normal',
    lastConfirmed: verifiedAt,
    ageDays: verifiedAt === null ? null : elapsedDays(verifiedAt, today),
    freshness,
    suppressFromShareCard: stale,
    suppressFromLetterCitation: stale,
  };
}

/**
 * The gate is scoped to exactly `LAUNCH_COUNTRIES` × `LEGALLY_OPERATIVE_FIELDS`, imported
 * from their one definition rather than restated here.
 *
 * `country.ts` imports nothing from this module, so the edge is one-way and there is no
 * cycle. Restating the two lists locally would work today and drift the first time a
 * launch country is added.
 */
const GATED_COUNTRIES: readonly string[] = LAUNCH_COUNTRIES;
const GATED_FIELDS: readonly string[] = LEGALLY_OPERATIVE_FIELDS;

function factAtPath(record: unknown, path: string): FactLike | null {
  let node: unknown = record;
  for (const segment of path.split('.')) {
    if (!isRecordLike(node)) return null;
    node = node[segment];
  }
  return isRecordLike(node) && 'status' in node ? (node as FactLike) : null;
}

const codeOf = (record: unknown): string =>
  isRecordLike(record) && isRecordLike(record['country']) && typeof record['country']['code'] === 'string'
    ? record['country']['code']
    : '';

/**
 * The hard gate. It fails only when ALL FOUR of these hold:
 *
 *   1. the country is one of the launch five,
 *   2. the field is legally operative — legal basis, response deadline, Art. 12(3),
 *   3. the fact's status is `verified`, and
 *   4. the elapsed days are at or above the class TTL.
 *
 * Condition 3 is the one worth spelling out: a `pending_verification` fact has no value to
 * go stale, and gating on it would block the build before the maintainer promotion D-06
 * reserves has happened — the phase would be unable to ship itself.
 *
 * Everything else warns, and degrades in the UI with its last-confirmed date. That split is
 * what gives nagging without brittleness: an unrelated typo fix on a Tuesday must not be
 * undeployable because a non-launch country's verification lapsed on Monday.
 */
export function freshnessGate(records: unknown[], today: string): FreshnessFailure[] {
  const failures: FreshnessFailure[] = [];
  for (const record of records) {
    const country = codeOf(record);
    if (!GATED_COUNTRIES.includes(country)) continue;
    for (const field of GATED_FIELDS) {
      const fact = factAtPath(record, field);
      if (fact === null || fact.status !== 'verified') continue;
      const volatility = (typeof fact.volatility === 'string' ? fact.volatility : 'volatile') as Volatility;
      const verifiedAt = verifiedAtOf(fact);
      if (freshnessOf(verifiedAt, volatility, today) !== 'stale') continue;
      const ageDays = verifiedAt === null ? null : elapsedDays(verifiedAt, today);
      const ttlDays = TTL_DAYS[volatility];
      failures.push({
        country,
        field,
        ageDays,
        ttlDays,
        volatility,
        message: `${country} ${field} was last confirmed ${
          verifiedAt ?? 'never'
        } — ${ageDays ?? 'unknown'} days ago, past the ${ttlDays ?? 'n/a'}-day ${volatility} window. A launch country's legally-operative fact must be re-verified before this ships`,
      });
    }
  }
  return failures;
}

/**
 * Every field whose `verified_at` moved while its `value` did not.
 *
 * A date that advances without a value advancing makes the page look more trustworthy
 * while being less so, and it is the exact shape of a "silent deadline change disguised as
 * a typo fix". Making it mechanical is the point — the alternative is a hope about review
 * attention. Plan 01-05 wires this into the pull-request lint.
 *
 * Walks the record structurally rather than from a fixed path list, so a field added to
 * the schema later cannot escape the rule by not being on a list somebody forgot.
 */
export function unchangedBumps(previous: unknown, next: unknown): UnchangedBump[] {
  const bumps: UnchangedBump[] = [];
  const country = codeOf(next) || codeOf(previous);

  const walk = (before: unknown, after: unknown, path: string): void => {
    if (!isRecordLike(before) || !isRecordLike(after)) return;
    const isFact = 'status' in after && 'verified_at' in after && 'value' in after;
    if (isFact) {
      const beforeDate = before['verified_at'] ?? null;
      const afterDate = after['verified_at'] ?? null;
      if (
        beforeDate !== afterDate &&
        JSON.stringify(before['value'] ?? null) === JSON.stringify(after['value'] ?? null)
      ) {
        bumps.push({
          country,
          field: path,
          message: `${path} moved verified_at from ${String(beforeDate)} to ${String(
            afterDate,
          )} while its value did not change — a date that moves without a value moving is provenance theatre`,
        });
      }
      return;
    }
    for (const key of Object.keys(after)) {
      if (key in before) walk(before[key], after[key], path === '' ? key : `${path}.${key}`);
    }
  };

  walk(previous, next, '');
  return bumps;
}

/** `unchangedBumps`, as a gate. Throws naming every offending field. */
export function assertNoUnchangedBump(previous: unknown, next: unknown): void {
  const bumps = unchangedBumps(previous, next);
  if (bumps.length === 0) return;
  throw new Error(
    `verified_at bumped without a value change:\n${bumps.map((b) => `  - ${b.message}`).join('\n')}`,
  );
}
