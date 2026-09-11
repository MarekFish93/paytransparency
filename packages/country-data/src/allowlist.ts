/**
 * The pre-fetch allowlist guard.
 *
 * A `source_url` authored in a community pull request decides what host a CI runner
 * connects to. That makes it untrusted input to an outbound request — threat T-1-07,
 * server-side request forgery — and the standard control is an allowlist enforced
 * BEFORE the request, not a check on the response after it.
 *
 * Two properties are load-bearing and easy to lose in a refactor:
 *
 *   1. The list is PER COUNTRY. A Polish register is not evidence for a Slovak fact, so
 *      `dziennikustaw.gov.pl` is fetchable for `PL` and rejected for `SK`. Only the EU
 *      institution set is shared by all 27.
 *   2. Host matching is EXACT or ONE label deep, on the punycode host — never a suffix
 *      match on the raw string. `legislation.mt.evil.example` and `evil-legislation.mt`
 *      both end in an allowlisted name and both are hostile (T-1-08).
 *
 * The guard also runs again on every redirect hop: an allowlisted host that redirects to
 * an arbitrary one is the same forgery with one more step.
 *
 * Relationship to `schema.ts`'s `sourceUrlIssues`: that is the PARSE-time lint (the L5
 * rule — https, no tracking parameters, no credentials), applied when a data file is
 * read. This is the PRE-FETCH gate, applied when a request is about to be issued. This
 * guard is strictly stronger — it adds host membership and reason codes — and
 * `allowlist.test.ts` pins that relationship so the two controls cannot drift apart.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Why a URL may not be fetched. Each cause is distinct so a failure names itself. */
export type AllowlistViolationReason =
  | 'unparseable_url'
  | 'unknown_country'
  | 'host_not_allowlisted'
  | 'scheme_not_https'
  | 'credentials_in_url'
  | 'non_default_port'
  | 'ip_literal_host'
  | 'tracking_parameter';

/** Thrown before any request is issued. Carries the facts a maintainer needs. */
export class AllowlistViolation extends Error {
  readonly host: string;
  readonly country: string;
  readonly reason: AllowlistViolationReason;

  constructor(
    message: string,
    details: { host: string; country: string; reason: AllowlistViolationReason },
  ) {
    super(message);
    this.name = 'AllowlistViolation';
    this.host = details.host;
    this.country = details.country;
    this.reason = details.reason;
  }
}

export type AllowlistData = {
  /** Hosts permitted for every country: the EU institution set. */
  all: string[];
  /** ISO-3166-1 alpha-2 → that country's national registers. */
  byCountry: Record<string, string[]>;
};

/**
 * The data is read from `data/_allowlist.json` at module load rather than embedded
 * here, so the file a maintainer edits is the file the guard enforces — no second copy
 * to drift. The path resolves identically from `src/` (vitest, `node --experimental-
 * strip-types`) and from `dist/` (the published package, which ships `data/` alongside).
 *
 * The leading underscore is `data/`'s own convention for a SHARED, non-country record:
 * every `*.json` in that directory without it is one of the 27 member-state files, and
 * `coverage.test.ts` counts them by exactly that rule. `_directive.json` is the other.
 *
 * This module is BUILD-TIME only and is deliberately NOT re-exported from the package
 * barrel: `node:fs` has no business in a browser bundle.
 */
const DATA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', '_allowlist.json');

export const ALLOWLIST: AllowlistData = JSON.parse(
  readFileSync(DATA_PATH, 'utf8'),
) as AllowlistData;

/**
 * The one documented `http:` exception. The Cellar canonical resource URI is served over
 * plain http and content-negotiated; forbidding it would block the project's only
 * primary source. Pinned by ETag and re-verified nightly (threat T-1-04, accepted).
 */
const HTTP_EXEMPT_HOST = 'publications.europa.eu';

/** Query parameter names that leak a maintainer's identity into a committed source_url. */
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'mc_eid']);
const TRACKING_PREFIX = 'utm_';

const DEFAULT_PORTS: Record<string, string> = { 'http:': '80', 'https:': '443' };

/**
 * An IPv4 literal, an IPv6 literal (which `URL` surfaces bracketed), or a bare-decimal
 * host such as `http://2130706433/`, which resolves to 127.0.0.1.
 */
function isIpLiteralHost(host: string): boolean {
  if (host.startsWith('[')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return /^\d+$/.test(host);
}

/** Normalise for comparison: lowercase, punycode (URL does this), no trailing root dot. */
function canonicalHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

/**
 * Exact, or exactly one label deeper. `www.legislation.mt` matches `legislation.mt`;
 * `a.b.legislation.mt` does not, and neither does `legislation.mt.evil.example` (which
 * does not end in `.legislation.mt` at all) nor `evil-legislation.mt` (which does not
 * end in a LABEL boundary). A raw `endsWith` would admit the last of those.
 */
function hostMatches(host: string, allowed: string): boolean {
  const a = canonicalHost(allowed);
  if (host === a) return true;
  if (!host.endsWith(`.${a}`)) return false;
  const prefix = host.slice(0, host.length - a.length - 1);
  return prefix.length > 0 && !prefix.includes('.');
}

/** The hosts this country may be fetched from: the shared EU set plus its own registers. */
export function allowedHostsFor(countryCode: string): string[] | null {
  const code = countryCode.toUpperCase();
  const byCountry = ALLOWLIST.byCountry[code];
  if (byCountry === undefined) return null;
  return [...ALLOWLIST.all, ...byCountry];
}

function violation(
  reason: AllowlistViolationReason,
  host: string,
  country: string,
  detail: string,
): AllowlistViolation {
  return new AllowlistViolation(
    `refusing to fetch ${detail} for country "${country}": ${reason}`,
    { host, country, reason },
  );
}

/**
 * Throwing form. Runs BEFORE any request is issued, and again on every redirect hop.
 *
 * Order matters only for the message a maintainer reads, not for the outcome: every
 * branch below rejects. The URL is parsed first because nothing else can be checked on
 * a string that is not a URL.
 */
export function assertFetchable(url: string, countryCode: string): void {
  const country = countryCode.toUpperCase();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw violation('unparseable_url', '', country, `"${url}" (not a parseable absolute URL)`);
  }

  const host = canonicalHost(parsed.hostname);

  const allowed = allowedHostsFor(country);
  if (allowed === null) {
    throw violation(
      'unknown_country',
      host,
      country,
      `${host} — "${country}" is not one of the 27 member-state codes in _allowlist.json`,
    );
  }

  if (parsed.username !== '' || parsed.password !== '') {
    throw violation('credentials_in_url', host, country, `${host} (the URL carries credentials)`);
  }

  if (isIpLiteralHost(parsed.hostname)) {
    throw violation(
      'ip_literal_host',
      host,
      country,
      `${parsed.hostname} (an IP literal, not a domain name)`,
    );
  }

  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && host === HTTP_EXEMPT_HOST)) {
    throw violation(
      'scheme_not_https',
      host,
      country,
      `${parsed.protocol}//${host} — https is required; the single exception is ${HTTP_EXEMPT_HOST}, whose canonical resource URI is content-negotiated over plain http`,
    );
  }

  const defaultPort = DEFAULT_PORTS[parsed.protocol];
  if (parsed.port !== '' && parsed.port !== defaultPort) {
    throw violation(
      'non_default_port',
      host,
      country,
      `${host}:${parsed.port} (a non-default port)`,
    );
  }

  for (const key of parsed.searchParams.keys()) {
    const k = key.toLowerCase();
    if (k.startsWith(TRACKING_PREFIX) || TRACKING_PARAMS.has(k)) {
      throw violation(
        'tracking_parameter',
        host,
        country,
        `${host} (the URL carries the tracking parameter "${key}")`,
      );
    }
  }

  if (!allowed.some((entry) => hostMatches(host, entry))) {
    throw violation(
      'host_not_allowlisted',
      host,
      country,
      `${host} — it is on neither the all-countries set nor the "${country}" register list`,
    );
  }
}

/** Boolean form. Never throws; every rejection reason collapses to `false`. */
export function isAllowlisted(url: string, countryCode: string): boolean {
  try {
    assertFetchable(url, countryCode);
    return true;
  } catch (error) {
    if (error instanceof AllowlistViolation) return false;
    throw error;
  }
}

/**
 * Re-check every hop of a redirect chain, origin request included.
 *
 * An allowlisted host that answers 302 to an arbitrary one defeats a guard applied only
 * to the URL a contributor wrote down. The fetch wrapper therefore follows redirects
 * manually and calls this on each `Location`.
 */
export function assertRedirectChain(chain: readonly string[], countryCode: string): void {
  for (const url of chain) {
    assertFetchable(url, countryCode);
  }
}
