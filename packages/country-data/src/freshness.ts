/**
 * Volatility-class freshness windows.
 *
 * `verified_at` is only a control if something acts on it. This module is that
 * something: it turns a date into one of three dispositions that Phase 3 renders and
 * Phase 5 suppresses on (D-10 — a stale fact degrades the UI and is suppressed from any
 * share card or letter citation; the build hard-fails only for launch countries).
 */
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
// D-10 — RED SKELETON
// ---------------------------------------------------------------------------

/** RED skeleton. The D-10 degradation, gate and unchanged-bump rules are not here yet. */
export type DegradationDescriptor = {
  render: 'normal' | 'degraded';
  lastConfirmed: string | null;
  ageDays: number | null;
  freshness: Freshness;
  suppressFromShareCard: boolean;
  suppressFromLetterCitation: boolean;
};

export type FreshnessFailure = {
  country: string;
  field: string;
  ageDays: number | null;
  ttlDays: number | null;
  volatility: Volatility;
  message: string;
};

export type UnchangedBump = { country: string; field: string; message: string };

/** RED skeleton — always reports a normal render. */
export function degradationFor(
  _fact: unknown,
  _volatility: Volatility,
  _today: string,
): DegradationDescriptor {
  return {
    render: 'normal',
    lastConfirmed: null,
    ageDays: null,
    freshness: 'fresh',
    suppressFromShareCard: false,
    suppressFromLetterCitation: false,
  };
}

/** RED skeleton — never fails. */
export function freshnessGate(_records: unknown[], _today: string): FreshnessFailure[] {
  return [];
}

/** RED skeleton — never reports a bump. */
export function unchangedBumps(_previous: unknown, _next: unknown): UnchangedBump[] {
  return [];
}

/** RED skeleton — never throws. */
export function assertNoUnchangedBump(_previous: unknown, _next: unknown): void {}
