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

/** Why a date bump was, or was not, backed by evidence that the source was re-read. */
export type RereadVerdict = { reread: boolean; why: string };

/** One source whose claim changed while the ETag that would 304 past it stayed put. */
export type StaleEtagClaim = { country: string; field: string; url: string; message: string };

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

type SourceLike = { url?: unknown; accessed_at?: unknown };

const sourcesOf = (fact: Record<string, unknown>): SourceLike[] =>
  Array.isArray(fact['sources']) ? (fact['sources'] as SourceLike[]) : [];

const accessedAtOf = (source: SourceLike): string | null =>
  typeof source.accessed_at === 'string' ? source.accessed_at : null;

const urlOf = (source: SourceLike): string | null =>
  typeof source.url === 'string' ? source.url : null;

/**
 * Was the cited evidence actually re-read between these two revisions?
 *
 * THIS FUNCTION IS THE WHOLE OF THE DEADLOCK FIX, so it is worth stating what it is and
 * what it deliberately is not.
 *
 * The deadlock: `freshnessGate` hard-fails a launch country's legally-operative fact once
 * it passes its TTL, and the only way to clear that is to move `verified_at` forward.
 * `unchangedBumps` used to reject ANY fact whose `verified_at` moved while
 * `JSON.stringify(value)` did not. But a re-verification that confirms the law has NOT
 * changed — which is what re-verification usually confirms — is exactly that commit. The
 * two rules were mutually exclusive: the only commit that cleared `freshness-gate` was
 * precisely the commit `assertNoUnchangedBump` rejected, and the gate's own failure text
 * instructed the maintainer to make it. Under time pressure the available moves were to
 * weaken one gate or to fabricate a value change, both worse than either gate's absence.
 *
 * The exemption is keyed on EVIDENCE, never on a flag, a marker or an override. There is
 * deliberately no way for a human to assert "trust me, I checked": that would re-open the
 * hole the rule exists to close, and it is the first thing a person under deadline reaches
 * for. What counts as evidence is that the CITED SOURCE'S OWN `accessed_at` moved forward
 * — a claim about a specific document read on a specific day, sitting in the diff next to
 * the date it justifies, rather than a mood.
 *
 * Three conditions, all required:
 *
 *   1. The fact cites at least one source. A verified fact with no sources cannot be
 *      re-verified, and `Fact`'s own invariant already forbids it.
 *   2. EVERY source carried over from the previous revision has an `accessed_at` that moved
 *      strictly FORWARD. "Every", not "at least one", because re-reading the easy source
 *      and bumping the date is the same defect in a smaller costume. A source that is new
 *      in this revision is itself fresh evidence and needs no predecessor.
 *   3. The new `verified_at` is not LATER than the most recent `accessed_at`. You cannot
 *      have verified a fact on a day after the last day you read its source. This is the
 *      condition that stops `accessed_at` being nudged by one day to unlock an arbitrary
 *      `verified_at`.
 *
 * What this does NOT claim: that the human really opened the page. Nothing visible in two
 * JSON revisions can establish that, and pretending otherwise would be exactly the vacuous
 * gate this codebase keeps auditing itself for. What it does establish is that the bump is
 * an explicit, dated, per-source assertion localised in the diff a reviewer reads, rather
 * than a one-character change to a field nobody looks at. The machine-checked half of
 * "was it really re-read" lives in `verify:sources`, which dispatches the source against a
 * real response; this is the half that can run offline on a contributor's pull request.
 */
export function evidenceReread(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): RereadVerdict {
  const afterSources = sourcesOf(after);
  if (afterSources.length === 0) {
    return { reread: false, why: 'the fact cites no source, so there is nothing to re-read' };
  }

  const beforeByUrl = new Map<string, SourceLike>();
  for (const source of sourcesOf(before)) {
    const url = urlOf(source);
    if (url !== null) beforeByUrl.set(url, source);
  }

  const accessedDates: string[] = [];
  for (const source of afterSources) {
    const url = urlOf(source);
    const accessed = accessedAtOf(source);
    if (accessed === null) {
      return {
        reread: false,
        why: `a cited source carries no accessed_at, so nothing records when it was last read`,
      };
    }
    accessedDates.push(accessed);

    const previousSource = url === null ? undefined : beforeByUrl.get(url);
    // A source that did not exist in the previous revision IS the new evidence.
    if (previousSource === undefined) continue;

    const previousAccessed = accessedAtOf(previousSource);
    if (previousAccessed !== null && accessed <= previousAccessed) {
      return {
        reread: false,
        why: `${url ?? 'a cited source'} still records accessed_at ${previousAccessed}, so it was not read again`,
      };
    }
  }

  const latestAccessed = accessedDates.reduce((a, b) => (a > b ? a : b));
  const afterDate = typeof after['verified_at'] === 'string' ? after['verified_at'] : null;
  if (afterDate !== null && afterDate > latestAccessed) {
    return {
      reread: false,
      why: `verified_at ${afterDate} is later than the most recent accessed_at ${latestAccessed} — a fact cannot be verified after the last day its source was read`,
    };
  }

  return { reread: true, why: `every cited source was read again, most recently ${latestAccessed}` };
}

/**
 * Every field whose `verified_at` moved while its `value` did not AND nothing shows the
 * source was read again.
 *
 * A date that advances without a value advancing makes the page look more trustworthy
 * while being less so, and it is the exact shape of a "silent deadline change disguised as
 * a typo fix". Making it mechanical is the point — the alternative is a hope about review
 * attention.
 *
 * The second clause is what keeps the rule compatible with routine re-verification rather
 * than mutually exclusive with it. See `evidenceReread` for why the exemption is keyed on
 * the cited source's own `accessed_at` and on nothing a human can simply assert.
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
      const sameValue =
        JSON.stringify(before['value'] ?? null) === JSON.stringify(after['value'] ?? null);
      if (beforeDate !== afterDate && sameValue) {
        const verdict = evidenceReread(before, after);
        if (!verdict.reread) {
          bumps.push({
            country,
            field: path,
            message: `${path} moved verified_at from ${String(beforeDate)} to ${String(
              afterDate,
            )} while its value did not change, and ${verdict.why}. A date that moves without either the value or the evidence moving is provenance theatre. To re-confirm an unchanged fact, record the day you read each cited source in that source's accessed_at — do not extend the TTL, and do not fabricate a value change`,
          });
        }
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

/**
 * Every source whose `anchor` or `scope` changed while its `etag` did not.
 *
 * `requestHeadersFor` sends `If-None-Match: source.etag`, and a 304 returns
 * `disposition: 'revalidated'` before any scope or anchor check. That is correct with
 * respect to the publisher's DOCUMENT — it has not changed — but `anchor` and `scope.id`
 * are OUR data, not the server's. Editing the anchor while leaving the ETag in place
 * produces a source whose claim is never machine-checked on any run that 304s, and on the
 * pull-request profile only the `en`/`pl` Cellar sources have fixtures, so for the other
 * 94 that is the only path that would ever check them.
 *
 * The rule is therefore: if you change what you are asserting, you give up the shortcut
 * that would let the server tell you not to look. Clearing `etag` costs one full read on
 * the next nightly and is the whole price.
 */
export function staleEtagClaims(previous: unknown, next: unknown): StaleEtagClaim[] {
  const claims: StaleEtagClaim[] = [];
  const country = codeOf(next) || codeOf(previous);

  const claimOf = (source: Record<string, unknown>): string =>
    JSON.stringify([source['anchor'] ?? null, source['scope'] ?? null]);

  const walk = (before: unknown, after: unknown, path: string): void => {
    if (!isRecordLike(before) || !isRecordLike(after)) return;

    if (Array.isArray(after['sources']) && Array.isArray(before['sources'])) {
      const beforeByUrl = new Map<string, Record<string, unknown>>();
      for (const source of before['sources'] as unknown[]) {
        if (isRecordLike(source) && typeof source['url'] === 'string') {
          beforeByUrl.set(source['url'], source);
        }
      }
      for (const source of after['sources'] as unknown[]) {
        if (!isRecordLike(source) || typeof source['url'] !== 'string') continue;
        const url = source['url'];
        const previousSource = beforeByUrl.get(url);
        if (previousSource === undefined) continue;
        if (claimOf(previousSource) === claimOf(source)) continue;
        // The claim moved. The ETag must not still be the one that would 304 past it.
        const etagAfter = source['etag'] ?? null;
        if (etagAfter !== null && etagAfter === (previousSource['etag'] ?? null)) {
          claims.push({
            country,
            field: path,
            url,
            message: `${path} changed the anchor or scope it asserts about ${url} while keeping etag ${String(
              etagAfter,
            )}. The next run sends that ETag as If-None-Match, the server answers 304, and the NEW claim is never checked against a single byte \u2014 a 304 revalidates the publisher's document, not our citation. Clear etag in the same commit that changes what it asserts`,
          });
        }
      }
    }

    for (const key of Object.keys(after)) {
      if (key === 'sources') continue;
      if (key in before) walk(before[key], after[key], path === '' ? key : `${path}.${key}`);
    }
  };

  walk(previous, next, '');
  return claims;
}
