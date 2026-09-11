/**
 * The pre-fetch allowlist guard — RED-phase stub.
 *
 * The signatures below are the contract `allowlist.test.ts` is written against. The
 * bodies are deliberately PERMISSIVE, so every rejection test fails on its own
 * behavioural assertion ("expected to throw, but it returned") rather than on a module
 * that will not load. A stub that threw would make every test fail for the same
 * non-behavioural reason, which proves nothing about the behaviour being specified.
 *
 * Plan 01-02 Task 1 GREEN replaces these bodies.
 */

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

/** Boolean form. Never throws. */
export function isAllowlisted(_url: string, _countryCode: string): boolean {
  return true;
}

/** Throwing form. Runs BEFORE any request is issued. */
export function assertFetchable(_url: string, _countryCode: string): void {
  return;
}

/** Re-checks every hop of a redirect chain, including the origin request. */
export function assertRedirectChain(_chain: readonly string[], _countryCode: string): void {
  return;
}
