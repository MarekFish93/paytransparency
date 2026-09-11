/**
 * The per-source verification strategy table.
 *
 * There is no single fetcher that can verify every legal source, and pretending
 * otherwise is how a verifier ends up green on bytes it never read. Research probed
 * eleven national registers and found four materially different response shapes plus one
 * shape that cannot be verified by fetch at all. Each `Source` therefore carries a
 * `verification` discriminant, and this table says what that discriminant asserts.
 *
 * `manual-attest` is a first-class peer, not an escape hatch. It records the ABSENCE of
 * machine verification honestly, which is strictly better than a green produced by a
 * request that never saw the statute — the "verifier that passes on an empty 200" the
 * project constraint forbids.
 *
 * The byte floors live here and ONLY here. Nothing may pass a floor as a literal at a
 * call site, so lowering one to turn a red gate green is a single visible diff in a
 * single file — the review signal Pitfall 5 says to watch for ("a byte floor that has
 * been lowered in a commit").
 */
import type { SourceVerification } from './schema.ts';

/** The named assertions a strategy makes, in the order the verifier applies them. */
export type StrategyAssertion =
  | 'status_200_or_304'
  | 'status_200'
  | 'byte_floor'
  | 'subtree_scope_present'
  | 'anchor_inside_scope'
  | 'anchor_in_body'
  | 'language_from_subtitle'
  | 'record_etag'
  | 'jsonld_block_parses'
  | 'legislation_identifier_equals_eli'
  | 'title_anchor_only'
  | 'attestation_present_and_fresh';

/**
 * Where the anchor is asserted.
 *
 * - `subdivision_id` — inside the publisher's own `art_N` subtree, never across the
 *   document. An unscoped anchor matched a RECITAL 26,000 characters before Art. 7(4).
 * - `whole_body`     — the whole server-rendered page.
 * - `jsonld_block`   — the parsed `application/ld+json` object.
 * - `none`           — nothing is fetched, so nothing is scoped.
 */
export type ScopeRule = 'subdivision_id' | 'whole_body' | 'jsonld_block' | 'none';

export type StrategyEntry = {
  /** Minimum accepted body size, in bytes. */
  byteFloor: number;
  /** Whether the strategy issues an outbound request at all. */
  requiresFetch: boolean;
  scopeRule: ScopeRule;
  assertions: StrategyAssertion[];
  /**
   * False when the strategy CANNOT see the operative wording. The verifier records this
   * on its result rather than letting a green imply a check that was never made.
   */
  assertsOperativeWording: boolean;
  /** Why this strategy exists, in one line, for the maintainer who meets it in a diff. */
  rationale: string;
};

export const STRATEGY_TABLE: Record<SourceVerification, StrategyEntry> = {
  /**
   * `publications.europa.eu`. The authentic EN expression is 193,564 bytes, so 100,000
   * leaves generous headroom while still rejecting a truncated or stub response.
   */
  cellar: {
    byteFloor: 100000,
    requiresFetch: true,
    scopeRule: 'subdivision_id',
    assertions: [
      'status_200_or_304',
      'byte_floor',
      'subtree_scope_present',
      'anchor_inside_scope',
      'language_from_subtitle',
      'record_etag',
    ],
    assertsOperativeWording: true,
    rationale:
      'The Publications Office serves the Official Journal XHTML with the publisher’s own subdivision ids, so the anchor can be asserted inside the cited article and the language confirmed from its subtitle — the 200 carries an EMPTY Content-Language header, so nothing else in the response identifies the language.',
  },

  /**
   * Server-rendered national registers. The smallest real page research measured was
   * `gazzettaufficiale.it` at 43,368 bytes; the client-rendered shell it must reject is
   * 1,354 bytes. 20,000 sits far above the shell and far below every real page.
   */
  'html-anchor': {
    byteFloor: 20000,
    requiresFetch: true,
    scopeRule: 'whole_body',
    assertions: ['status_200', 'byte_floor', 'anchor_in_body'],
    assertsOperativeWording: true,
    rationale:
      'Registers that render their statute text server-side (dziennikustaw.gov.pl, normattiva.it, gazzettaufficiale.it) put the operative wording in the HTTP response, so a normalised anchor over the body is real evidence.',
  },

  /**
   * `legislation.mt`. The landing page carries a schema.org `Legislation` block with the
   * ELI identifier, but NOT the operative wording: research probed "two months",
   * "equality body" and "National Commission" and all three were absent. The observed
   * JSON-LD block is 4,541 bytes inside a 61,563-byte page.
   */
  jsonld: {
    byteFloor: 5000,
    requiresFetch: true,
    scopeRule: 'jsonld_block',
    assertions: [
      'status_200',
      'byte_floor',
      'jsonld_block_parses',
      'legislation_identifier_equals_eli',
    ],
    assertsOperativeWording: false,
    rationale:
      'The Maltese register publishes structured metadata, not the statute body. Asserting the operative wording here would fail on a perfectly good source; asserting the ELI identifier succeeds and is what that page actually serves.',
  },

  /**
   * Sources whose operative text lives in a linked PDF. The title is on the landing
   * page; the wording is not. The result RECORDS that, rather than implying a check that
   * never happened.
   */
  'metadata-only': {
    byteFloor: 5000,
    requiresFetch: true,
    scopeRule: 'whole_body',
    assertions: ['status_200', 'byte_floor', 'title_anchor_only'],
    assertsOperativeWording: false,
    rationale:
      'A landing page that links a PDF can prove the instrument exists and is titled what the citation says; it cannot prove the wording. Recording that gap is the honest result.',
  },

  /**
   * The two launch-country registers that defeat server-side fetching:
   * `slov-lex.sk` answers 200 with a 1,354-byte client-rendered shell whose first tag is
   * a tag-manager script and whose statute text is never in the HTTP response, and
   * `e-tar.lt` answers 403 with a challenge interstitial. No request is made at all.
   */
  'manual-attest': {
    byteFloor: 0,
    requiresFetch: false,
    scopeRule: 'none',
    assertions: ['attestation_present_and_fresh'],
    assertsOperativeWording: false,
    rationale:
      'No fetch can see these documents. A dated human attestation records the absence of machine verification; a green produced by a request that never saw the statute would be a lie.',
  },
};

/** The strategy entry for a discriminant. */
export function strategyFor(verification: SourceVerification): StrategyEntry {
  return STRATEGY_TABLE[verification];
}

/** The byte floor for a discriminant. The ONLY way a floor may reach a call site. */
export function byteFloorFor(verification: SourceVerification): number {
  return STRATEGY_TABLE[verification].byteFloor;
}
