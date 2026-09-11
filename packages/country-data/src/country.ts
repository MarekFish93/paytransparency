/**
 * The country record — RED SKELETON.
 *
 * Shape placeholders only. None of the invariants that make a wrong statute
 * unexpressible are here yet: the launch-country human-confirm rule (D-06), the
 * Art. 12(3) condition-not-a-route rule, the draft-means-the-source-said-draft rule,
 * the `directive_fallback` citation-key rule (D-07) and the NFC rule for equality-body
 * names are all written failing in `test/schema.test.ts` first.
 */
import { z } from 'zod';

/**
 * The 27 member states, ISO-3166-1 alpha-2. Greece is `GR` — the EU statistical code
 * `EL` is not an ISO code and must never appear as a country code here.
 */
export const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

/** D-05: the five states whose legally-operative fields are verified to source at v1. */
export const LAUNCH_COUNTRIES = ['PL', 'SK', 'IT', 'LT', 'MT'] as const;

/** D-06: the fields only a maintainer may flip to verified, and only with `verified_by`. */
export const LEGALLY_OPERATIVE_FIELDS = [
  'article_7.legal_basis',
  'article_7.response_deadline',
  'article_12_3',
] as const;

/** RED skeleton — structural placeholder with no invariants. */
export const CountryRecord = z.looseObject({
  country: z.looseObject({ code: z.string() }),
});
