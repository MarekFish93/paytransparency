/**
 * The fail-loud source verifier.
 *
 * A verifier that passes on an empty 200 is worse than no verifier at all, because it
 * manufactures confidence. Every assertion below exists because research reproduced a
 * response shape that either greened an incorrect document or reddened a correct one:
 *
 *   1. The EUR-Lex web front end answers `202 Accepted` with a ZERO-length body, and
 *      `res.ok` is `true` for 202. `if (!res.ok) throw` passes it. Hence the exact
 *      `status === 200` check rather than a 2xx range.
 *   2. "within a reasonable period of time" occurs in a RECITAL about joint pay
 *      assessments, at a byte offset far below Art. 7(4). An unscoped anchor verifies
 *      text that is not the cited provision. Hence: scope FIRST, assert second.
 *   3. A legitimate `304` has a zero-length body. A byte floor applied before status
 *      dispatch turns a successful cache revalidation into a hard failure. Hence 304 is
 *      handled before any body check.
 *   4. "Article 7" with an ASCII space occurs ZERO times in the authentic document;
 *      "Article 7" occurs once. A verifier anchored on the obvious string fails on
 *      a perfect document. Hence normalisation for MATCHING only — storage stays raw.
 *   5. The Cellar 200 carries an EMPTY `Content-Language`. The server does not tell you
 *      which language it gave you. Hence the subtitle check.
 *   6. `slov-lex.sk` answers 200 with a 1,354-byte client-rendered shell and `e-tar.lt`
 *      answers 403 with a challenge interstitial. Neither can be verified by fetch, so
 *      neither is retried and neither is "fixed" by lowering a floor: they are recorded
 *      `manual-attest`, which states the absence of machine verification honestly.
 *
 * Two entry points, deliberately separate:
 *
 *   `verifySource`     — PURE. Classifies a response somebody else obtained. Every
 *                        disposition in the taxonomy is decided here, which is what lets
 *                        the whole gate be proved offline from committed fixtures.
 *   `verifySourceLive` — the build-time driver: the pre-fetch allowlist guard, the
 *                        retry-with-backoff loop, redirect re-checking, then
 *                        `verifySource` on whatever came back.
 *
 * This module is BUILD-TIME ONLY: `allowlist.ts` reads its data with `node:fs`, so the
 * package barrel is not browser-bundler-safe today. When the web app first imports
 * `@jafn/country-data` in a client bundle, move the verifier behind a `./verify` subpath
 * export rather than weakening the guard.
 */
import type { Source, SourceVerification, Volatility } from './schema.ts';
import { freshnessOf } from './freshness.ts';
import { byteFloorFor, strategyFor, STRATEGY_TABLE } from './source-strategy.ts';
import { assertFetchable, AllowlistViolation } from './allowlist.ts';

/**
 * The outcome of a verification attempt.
 *
 * `data_defect` and `source_unreachable` are deliberately different (D-09): a gate that
 * goes red on someone else's outage gets disabled within a month, which is worse than no
 * gate. A defect is a hard fail; unreachable is "not disproven" and is override-able.
 */
export type Disposition =
  | 'verified'
  | 'revalidated'
  | 'data_defect'
  | 'source_unreachable'
  | 'attested';

/** Thrown when retrieved bytes do not contain what the citation claims they contain. */
export class SourceDefect extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceDefect';
  }
}

/**
 * Per-strategy minimum body size — a DERIVED VIEW of `STRATEGY_TABLE`, which is the
 * single source. Floors are declared in `source-strategy.ts` and nowhere else, so
 * lowering one to turn a red gate green is a single visible diff in a single file.
 */
export const BYTE_FLOOR: Record<SourceVerification, number> = Object.fromEntries(
  (Object.keys(STRATEGY_TABLE) as SourceVerification[]).map((key) => [key, byteFloorFor(key)]),
) as Record<SourceVerification, number>;

/**
 * Upper bound on an accepted body (threat T-1-05). The extractor is string-slicing with
 * `indexOf` — never a DOM, never `eval`, never a regex over the whole body — but an
 * unbounded remote body is still an unbounded allocation at build time.
 */
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

/**
 * Fold the typographic variation that makes a correct document look wrong.
 *
 * Used for COMPARISON ONLY. The stored quotation keeps its authentic bytes: U+00A0
 * between a paragraph number and its first word, U+2019 in "workers’ pay". Normalising
 * on the way into storage would silently rewrite the Official Journal.
 */
export const normaliseForMatch = (s: string): string =>
  s
    // U+00A0 no-break space, U+202F narrow no-break space, U+2009 thin space.
    .replace(/[   ]/g, ' ')
    // Curly quotes folded to ASCII for MATCHING only, so a hand-typed anchor still matches.
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();

/** What the verifier was handed. Synthesised in tests; built from `fetch` in CI. */
export type VerifierResponse = {
  /** Set when the request never completed: DNS failure, timeout, connection reset. */
  transportError?: string | null;
  status?: number;
  body?: string;
  /** Lower-cased response headers. The challenge recognition reads two of them. */
  headers?: Record<string, string>;
  etag?: string | null;
  lastModified?: string | null;
};

/** Machine-readable cause. A message is for a human; this is for a workflow. */
export type DefectReason =
  | 'allowlist_violation'
  | 'anti_automation_gate'
  | 'client_error'
  | 'server_error'
  | 'transport_error'
  | 'no_status'
  | 'unexpected_status'
  | 'empty_body'
  | 'below_byte_floor'
  | 'body_too_large'
  | 'too_many_redirects'
  | 'no_scope_id'
  | 'scope_absent'
  | 'anchor_absent'
  | 'language_unconfirmed'
  | 'jsonld_absent'
  | 'jsonld_unparseable'
  | 'eli_mismatch'
  | 'attestation_missing'
  | 'attestation_stale';

/** A maintainer's recorded decision to proceed despite an unreachable source (D-09). */
export type UnreachableOverride = { maintainer: string; reason: string; at: string };

export type VerifyResult = {
  disposition: Disposition;
  /** Human-readable, and on a defect it quotes what was actually there. */
  message: string;
  reason?: DefectReason | null;
  etag?: string | null;
  /** What this strategy did NOT machine-verify. Never implied by a bare `verified`. */
  notes?: string[];
  override?: UnreachableOverride;
};

/** The attestation and country facts `verifySource` cannot read off a `Source`. */
export type VerifyContext = {
  countryCode?: string;
  verified_by?: string | null;
  verified_at?: string | null;
  volatility?: Volatility;
  /** `YYYY-MM-DD`. Injected in tests so a freshness boundary is not a moving target. */
  today?: string;
};

const defect = (reason: DefectReason, message: string): VerifyResult => ({
  disposition: 'data_defect',
  reason,
  message,
});

/**
 * The body's size in UTF-8 BYTES, not in UTF-16 code units.
 *
 * `String.prototype.length` counts code units, and every floor in `STRATEGY_TABLE` is
 * stated in bytes. The two diverge the moment a document is not pure ASCII: the Slovak
 * shell fixture is 1,354 bytes and 1,346 code units, and a Polish or Lithuanian register
 * page diverges much further. Measuring in one unit and reporting in the other would put
 * a wrong number in the message a maintainer acts on, and would move the floor a source
 * is actually held to depending on its language. `Buffer.byteLength` does not allocate,
 * so it is also the right tool for a size cap whose job is to bound allocation.
 */
function byteLengthOf(body: string): number {
  return Buffer.byteLength(body, 'utf8');
}

/**
 * Does this body/header pair carry a challenge-interstitial signature?
 *
 * Matched ONLY on markers present in the two captured fixtures — the Cloudflare
 * challenge `e-tar.lt` serves and the AWS WAF challenge the EUR-Lex front end serves.
 * Keeping the signature in one exported predicate, tested against real recordings, is
 * what stops this from becoming a blanket reclassification of every 403: a 403 with a
 * plain body matches nothing here and stays on the generic branch.
 *
 * Why it matters that this is a distinct branch: a maintainer reading "404 — the cited
 * resource is not there" goes looking for a broken URL. A maintainer reading "this host
 * answers automated requests with a challenge; record a `manual-attest` attestation"
 * does the thing that actually resolves it.
 */
export function isChallengeInterstitial(
  body: string,
  headers: Record<string, string> = {},
): boolean {
  const header = (name: string): string => (headers[name] ?? '').toLowerCase();
  // Cloudflare sets `cf-mitigated: challenge`; AWS WAF sets `x-amzn-waf-action: challenge`.
  if (header('cf-mitigated') === 'challenge') return true;
  if (header('x-amzn-waf-action') === 'challenge') return true;

  const markers = [
    '<title>Just a moment...</title>', // Cloudflare interstitial, verbatim
    '_cf_chl_opt', // Cloudflare challenge options object
    'challenges.cloudflare.com', // the challenge widget origin
    'awsWafCookieDomainList', // AWS WAF challenge bootstrap
  ];
  return markers.some((marker) => body.includes(marker));
}

/**
 * Record a maintainer's decision to proceed despite `source_unreachable` (D-09).
 *
 * Deliberately NOT a default parameter anywhere: an override that can be applied
 * implicitly is not an override, it is a silent bypass. Both arguments are required and
 * non-empty, and the result carries the maintainer, the reason and the moment into the
 * run output.
 */
export function overrideUnreachable(
  result: VerifyResult,
  maintainer: string,
  reason: string,
  now: Date = new Date(),
): VerifyResult {
  if (result.disposition !== 'source_unreachable') {
    throw new TypeError(
      `overrideUnreachable applies only to a source_unreachable result, not "${result.disposition}" — a data defect is not an outage and may not be waved through`,
    );
  }
  if (maintainer.trim() === '') {
    throw new TypeError('overrideUnreachable requires a named maintainer; an anonymous override is not an audit record');
  }
  if (reason.trim() === '') {
    throw new TypeError('overrideUnreachable requires a reason; "overridden" on its own tells a later reader nothing');
  }
  return {
    ...result,
    override: { maintainer, reason, at: now.toISOString() },
  };
}

/**
 * Slice the document down to one subdivision.
 *
 * The Cellar XHTML delivers each article as `<div class="eli-subdivision" id="art_N">`,
 * so a subdivision runs from its own id to the start of the next `eli-subdivision`.
 */
export function scopeToSubdivision(xhtml: string, id: string): string | null {
  const attr = xhtml.indexOf(`id="${id}"`);
  if (attr < 0) return null;
  // Back up to the '<' that opens the element carrying the id. Slicing from the attribute
  // itself leaves a tag fragment the tag stripper cannot remove, and that fragment would
  // then be stored as though it were Official Journal text.
  const open = xhtml.lastIndexOf('<', attr);
  const start = open < 0 ? attr : open;
  // + 10 clears the `id="..."` match itself so the next-subdivision search moves forward.
  const end = xhtml.indexOf('class="eli-subdivision"', attr + 10);
  return xhtml.slice(start, end < 0 ? undefined : end);
}

/**
 * Slice out a single element by id, stopping at its first closing tag.
 *
 * Used for leaf elements such as `art_7.tit_1`, where `scopeToSubdivision` would run on
 * to the end of the enclosing article — which would make the language check pass on any
 * document that merely mentions the expected subtitle somewhere inside the article.
 */
export function scopeToElement(xhtml: string, id: string): string | null {
  const attr = xhtml.indexOf(`id="${id}"`);
  if (attr < 0) return null;
  const open = xhtml.lastIndexOf('<', attr);
  const start = open < 0 ? attr : open;
  const close = xhtml.indexOf('</div>', attr);
  return xhtml.slice(start, close < 0 ? undefined : close);
}

/**
 * Strip tags and decode the handful of entities the OJ XHTML actually uses.
 *
 * `&#160;` decodes to U+00A0, NOT to an ASCII space — look closely at the replacement
 * below. The no-break space between a paragraph number and its first word is authentic
 * Official Journal typography; folding it here would rewrite the statute on the way into
 * storage. Folding happens only in `normaliseForMatch`, which is used for comparison.
 */
export function textOf(xhtml: string): string {
  return xhtml
    .replace(/<[^>]*>/g, '')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&#8217;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/** Every `application/ld+json` block in a document, raw. */
export function jsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const start = match.index + match[0].length;
    const end = html.indexOf('</script>', start);
    if (end < 0) break;
    blocks.push(html.slice(start, end));
  }
  return blocks;
}

/** The `legislationIdentifier` of the first schema.org `Legislation` node, if any. */
function legislationIdentifierOf(parsed: unknown): string | null {
  const visit = (node: unknown): string | null => {
    if (Array.isArray(node)) {
      for (const entry of node) {
        const found = visit(entry);
        if (found !== null) return found;
      }
      return null;
    }
    if (node === null || typeof node !== 'object') return null;
    const record = node as Record<string, unknown>;
    const identifier = record['legislationIdentifier'];
    if (typeof identifier === 'string' && identifier.trim() !== '') return identifier;
    const graph = record['@graph'];
    if (graph !== undefined) return visit(graph);
    return null;
  };
  return visit(parsed);
}

/** The note a strategy that cannot read the statute body must carry on a green result. */
const wordingNote = (verification: SourceVerification): string =>
  `the operative wording was not machine-verified: the "${verification}" strategy asserts metadata only, because the statute body is not in this response`;

/**
 * Verify one source against one response.
 *
 * The assertion ORDER is the whole design. Reordering it reintroduces a reproduced
 * failure: body checks before the 304 branch break cache revalidation, an anchor
 * assertion before the subtree scope verifies a recital, and a byte floor before the
 * status dispatch turns a 202 challenge into "too small" instead of "gated".
 */
export function verifySource(
  source: Source,
  response: VerifierResponse,
  context: VerifyContext = {},
): VerifyResult {
  const strategy = strategyFor(source.verification);

  // manual-attest: no request is made at all. The honest answer for a client-rendered
  // shell (slov-lex.sk) or a challenge interstitial (e-tar.lt) — record that a human
  // looked, and when.
  if (!strategy.requiresFetch) {
    const attester = context.verified_by ?? null;
    if (attester === null || attester.trim() === '') {
      return defect(
        'attestation_missing',
        `manual-attest: ${source.url} is not machine-verifiable, so its fact must name the human who read it in verified_by — an unattested manual-attest source is an unverified claim`,
      );
    }
    const volatility = context.volatility ?? 'volatile';
    const today = context.today ?? new Date().toISOString().slice(0, 10);
    const freshness = freshnessOf(context.verified_at ?? null, volatility, today);
    if (freshness === 'stale') {
      return defect(
        'attestation_stale',
        `manual-attest: the attestation for ${source.url} by "${attester}" (verified_at ${context.verified_at ?? 'never'}) is past its "${volatility}" freshness window as at ${today}`,
      );
    }
    return {
      disposition: 'attested',
      message: `manual-attest: ${source.url} cannot be verified by fetch; attested by "${attester}" on ${context.verified_at ?? 'an unrecorded date'} (${freshness})`,
      notes: [wordingNote(source.verification)],
    };
  }

  // 0. The allowlist guard. `verifySourceLive` always supplies a country and runs the
  //    guard BEFORE issuing a request; this branch re-states the same rule for a caller
  //    that classifies a response it obtained by other means.
  if (context.countryCode !== undefined) {
    const violation = allowlistViolationFor(source.url, context.countryCode);
    if (violation !== null) {
      return defect('allowlist_violation', violation);
    }
  }

  // 1. Transport error — the request never completed. Not disproven, just unreached.
  if (response.transportError != null && response.transportError !== '') {
    return {
      disposition: 'source_unreachable',
      reason: 'transport_error',
      message: `transport error reaching ${source.url}: ${response.transportError}`,
    };
  }

  const status = response.status;
  if (status === undefined) {
    return {
      disposition: 'source_unreachable',
      reason: 'no_status',
      message: `no HTTP status recorded for ${source.url}`,
    };
  }

  const headers = response.headers ?? {};
  const body = response.body ?? '';

  // 2. 304 BEFORE any body check — a legitimate revalidation has a zero-length body.
  if (status === 304) {
    const etag = response.etag ?? source.etag ?? null;
    return {
      disposition: 'revalidated',
      message: `304 Not Modified for ${source.url}; content unchanged since ETag ${etag ?? '(none recorded)'}`,
      etag,
    };
  }

  // 3. 4xx is a defect; 5xx is transport. The ONE recognised sub-case: a 403 carrying a
  //    challenge-interstitial signature is an anti-automation gate, not a broken URL.
  if (status >= 400 && status < 500) {
    if (status === 403 && isChallengeInterstitial(body, headers)) {
      return defect(
        'anti_automation_gate',
        `403 from ${source.url} carrying a challenge-interstitial signature — this host answers automated requests with a challenge and cannot be verified by fetch. Record it as a "manual-attest" source with a dated human attestation; the URL is not broken.`,
      );
    }
    return defect(
      'client_error',
      `${status} for ${source.url} — the cited resource is not there. This is a data defect, not an outage.`,
    );
  }
  if (status >= 500) {
    return {
      disposition: 'source_unreachable',
      reason: 'server_error',
      message: `${status} from ${source.url} — server-side failure, retry with backoff`,
    };
  }

  // 4. Anything else that is not exactly 200 — notably 202 with an empty body.
  if (status !== 200) {
    if (status === 202 || isChallengeInterstitial(body, headers)) {
      return defect(
        'anti_automation_gate',
        `${status} with a ${byteLengthOf(body)}-byte body from ${source.url} — an accepted-but-empty response is an anti-automation gate, not an outage: res.ok is true for ${status} and retrying will never succeed. This source cannot be verified by fetch; use "manual-attest" or an alternative source.`,
      );
    }
    return defect(
      'unexpected_status',
      `expected HTTP status exactly 200, got ${status} for ${source.url}`,
    );
  }

  // 5. Body size: empty, below the strategy floor, or implausibly large.
  const bodyBytes = byteLengthOf(body);
  if (bodyBytes === 0) {
    return defect(
      'empty_body',
      `200 with a zero-length body from ${source.url} — a 200 is not evidence; the bytes are`,
    );
  }
  if (bodyBytes > MAX_BODY_BYTES) {
    return defect(
      'body_too_large',
      `body from ${source.url} is ${bodyBytes} bytes, above the ${MAX_BODY_BYTES}-byte cap`,
    );
  }
  const floor = byteFloorFor(source.verification);
  if (bodyBytes < floor) {
    return defect(
      'below_byte_floor',
      `body from ${source.url} is ${bodyBytes} bytes, below the ${floor}-byte floor for the "${source.verification}" strategy — a client-rendered shell passes a status check and fails here, which is the point. Do NOT lower the floor: record the source as "manual-attest" instead.`,
    );
  }

  // 6-9. Strategy-specific assertions, on the normalised-for-matching text only.
  switch (source.verification) {
    case 'cellar':
      return verifyCellar(source, body, response);
    case 'html-anchor':
      return verifyHtmlAnchor(source, body);
    case 'jsonld':
      return verifyJsonLd(source, body);
    case 'metadata-only':
      return verifyMetadataOnly(source, body);
    default:
      // Unreachable: `manual-attest` returned above and the union is frozen at five.
      return defect(
        'unexpected_status',
        `no assertion set for the "${source.verification}" strategy`,
      );
  }
}

/** The allowlist reason string for a URL, or null when it is fetchable. */
function allowlistViolationFor(url: string, countryCode: string): string | null {
  try {
    assertFetchable(url, countryCode);
    return null;
  } catch (error) {
    if (error instanceof AllowlistViolation) return error.message;
    throw error;
  }
}

/** 6/7/8/9 for `cellar`: scope FIRST, then the anchor, then the language. */
function verifyCellar(source: Source, body: string, response: VerifierResponse): VerifyResult {
  const scope = source.scope;
  if (scope === null) {
    return defect(
      'no_scope_id',
      `cellar source ${source.url} carries no scope id — refusing to assert an anchor across the whole document`,
    );
  }
  const subtree = scopeToSubdivision(body, scope.id);
  if (subtree === null) {
    return defect(
      'scope_absent',
      `id="${scope.id}" absent from a 200 response of ${byteLengthOf(body)} bytes — this is a data defect, not an outage`,
    );
  }

  const haystack = normaliseForMatch(textOf(subtree));
  const needle = normaliseForMatch(source.anchor);
  if (!haystack.includes(needle)) {
    // Report BOTH: the raw markup a reviewer can diff against the document, and the
    // readable rendering the matcher actually compared. A citation dispute is settled
    // on the document's bytes, so a normalised, tag-stripped paraphrase is not enough
    // evidence on its own — it is not what is in the file.
    return defect(
      'anchor_absent',
      `anchor not found inside the id="${scope.id}" subtree of ${source.url}.\n` +
        `  looked for:  ${needle}\n` +
        `  scope began (verbatim): ${subtree.slice(0, 200)}\n` +
        `  scope began (as matched): ${haystack.slice(0, 200)}`,
    );
  }

  // 9. Confirm the language from the subdivision's own subtitle. `Content-Language` is
  //    empty on this server, so nothing else in the response identifies the language.
  if (scope.expected_subtitle !== null) {
    const titleSubtree = scopeToElement(subtree, `${scope.id}.tit_1`);
    const titleText = titleSubtree === null ? '' : normaliseForMatch(textOf(titleSubtree));
    const expected = normaliseForMatch(scope.expected_subtitle);
    if (!titleText.includes(expected)) {
      return defect(
        'language_unconfirmed',
        `language confirmation failed for ${source.url}: id="${scope.id}.tit_1" reads "${titleText}", ` +
          `expected to contain "${expected}" for language "${source.language}"`,
      );
    }
  }

  const etag = response.etag ?? source.etag ?? null;
  return {
    disposition: 'verified',
    message: `anchor confirmed inside id="${scope.id}" of ${source.url} (${byteLengthOf(body)} bytes, ETag ${etag ?? '(none)'})`,
    etag,
  };
}

/** `html-anchor`: a server-rendered register really does serve the wording. */
function verifyHtmlAnchor(source: Source, body: string): VerifyResult {
  const haystack = normaliseForMatch(textOf(body));
  const needle = normaliseForMatch(source.anchor);
  if (!haystack.includes(needle)) {
    return defect(
      'anchor_absent',
      `anchor not found in the ${byteLengthOf(body)}-byte body of ${source.url}.\n` +
        `  looked for:  ${needle}\n` +
        `  body began (as matched): ${haystack.slice(0, 200)}`,
    );
  }
  return {
    disposition: 'verified',
    message: `anchor confirmed in the body of ${source.url} (${byteLengthOf(body)} bytes)`,
  };
}

/**
 * `jsonld`: the landing page publishes structured metadata, not the statute.
 *
 * The anchor for a `jsonld` source IS the stored ELI identifier — chosen per source to
 * assert what that source actually serves. Asserting the operative wording here would
 * fail on a perfectly good document, because the wording is not on the page.
 */
function verifyJsonLd(source: Source, body: string): VerifyResult {
  const blocks = jsonLdBlocks(body);
  if (blocks.length === 0) {
    return defect(
      'jsonld_absent',
      `no application/ld+json block in the ${byteLengthOf(body)}-byte body of ${source.url}`,
    );
  }

  let identifier: string | null = null;
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch (error) {
      return defect(
        'jsonld_unparseable',
        `an application/ld+json block in ${source.url} does not parse: ${(error as Error).message}`,
      );
    }
    identifier = legislationIdentifierOf(parsed);
    if (identifier !== null) break;
  }

  if (identifier === null) {
    return defect(
      'jsonld_absent',
      `the application/ld+json in ${source.url} carries no legislationIdentifier`,
    );
  }

  if (normaliseForMatch(identifier) !== normaliseForMatch(source.anchor)) {
    return defect(
      'eli_mismatch',
      `legislationIdentifier mismatch for ${source.url}: the page says "${identifier}", the stored ELI says "${source.anchor}"`,
    );
  }

  return {
    disposition: 'verified',
    message: `legislationIdentifier "${identifier}" confirmed in the JSON-LD of ${source.url} (${byteLengthOf(body)} bytes)`,
    notes: [wordingNote(source.verification)],
  };
}

/** `metadata-only`: the title is provable, the wording is not, and the result says so. */
function verifyMetadataOnly(source: Source, body: string): VerifyResult {
  const haystack = normaliseForMatch(textOf(body));
  const needle = normaliseForMatch(source.anchor);
  if (!haystack.includes(needle)) {
    return defect(
      'anchor_absent',
      `title anchor not found in the ${byteLengthOf(body)}-byte body of ${source.url}.\n` +
        `  looked for:  ${needle}\n` +
        `  body began (as matched): ${haystack.slice(0, 200)}`,
    );
  }
  return {
    disposition: 'verified',
    message: `title anchor confirmed on the landing page of ${source.url} (${byteLengthOf(body)} bytes)`,
    notes: [wordingNote(source.verification)],
  };
}

/* ------------------------------------------------------------------------- *
 * The live driver: the only code path in this package that issues a request.
 * ------------------------------------------------------------------------- */

/** The shape `verifySourceLive` needs from a fetcher. The global `fetch` satisfies it. */
export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; redirect: 'manual' },
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

export type LiveOptions = {
  /** ISO-3166-1 alpha-2. The allowlist is per country; there is no global list. */
  countryCode: string;
  fetchImpl: FetchLike;
  context?: VerifyContext;
  /** Re-attempts after a transport failure or a 5xx. Default 3. */
  maxRetries?: number;
  /** First backoff delay in milliseconds; doubles each retry. Default 500. */
  baseBackoffMs?: number;
  maxRedirects?: number;
  /** Injectable so a retry test asserts the COUNT, not the wall clock. */
  sleep?: (ms: number) => Promise<void>;
};

export type LiveResult = VerifyResult & {
  /** Re-attempts actually made. A data defect is never retried, so this is 0. */
  retries: number;
  /** Total requests issued, redirect hops included. 0 for `manual-attest`. */
  fetchCalls: number;
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Response headers copied onto the `VerifierResponse`.
 *
 * Named explicitly rather than enumerated: a `FetchLike` only has to provide `get`, and
 * these six are every header any assertion in this module reads. `cf-mitigated` and
 * `x-amzn-waf-action` are the two the challenge recognition needs.
 */
const CAPTURED_HEADERS = [
  'etag',
  'last-modified',
  'content-language',
  'content-type',
  'cf-mitigated',
  'x-amzn-waf-action',
];

/** ISO-639-1 to ISO-639-2/B, for the Cellar `Accept-Language` the API actually wants. */
const ISO_639_2: Record<string, string> = {
  en: 'eng',
  pl: 'pol',
  sk: 'slk',
  it: 'ita',
  lt: 'lit',
  mt: 'mlt',
};

function requestHeadersFor(source: Source): Record<string, string> {
  const headers: Record<string, string> = {};
  if (source.verification === 'cellar') {
    headers['Accept'] = 'application/xhtml+xml';
    const lang = source.language.toLowerCase();
    headers['Accept-Language'] = lang.length === 3 ? lang : (ISO_639_2[lang] ?? lang);
  } else {
    headers['Accept'] = 'text/html';
  }
  // A stored ETag turns the nightly re-verification into a conditional GET, which is why
  // a 304 is a first-class disposition rather than an error.
  if (source.etag !== undefined) headers['If-None-Match'] = source.etag;
  return headers;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a source and classify what came back.
 *
 * The order is the plan's, and each step exists because of an observed response:
 *
 *   0. Allowlist guard — BEFORE any request, and again on every redirect hop. A
 *      contributor-supplied `source_url` decides what host a CI runner connects to
 *      (T-1-07); an allowlisted host redirecting to an arbitrary one is the same
 *      forgery with one more step (T-1-08).
 *   1. Transport failure or 5xx — retry three times with doubling backoff, then
 *      `source_unreachable`. Someone else's outage is not "this legal fact is wrong".
 *   2+. Everything else goes to `verifySource`, which never retries: an empty 200, a
 *      missing anchor and a 4xx are data defects, and retrying them is superstition.
 */
export async function verifySourceLive(
  source: Source,
  options: LiveOptions,
): Promise<LiveResult> {
  const context: VerifyContext = { ...options.context, countryCode: options.countryCode };
  const strategy = strategyFor(source.verification);

  // `manual-attest` issues no request at all — not a skipped fetch, an absent one.
  if (!strategy.requiresFetch) {
    return { ...verifySource(source, {}, context), retries: 0, fetchCalls: 0 };
  }

  // 0. The guard, before anything leaves the runner.
  const violation = allowlistViolationFor(source.url, options.countryCode);
  if (violation !== null) {
    return { ...defect('allowlist_violation', violation), retries: 0, fetchCalls: 0 };
  }

  const maxRetries = options.maxRetries ?? 3;
  const baseBackoffMs = options.baseBackoffMs ?? 500;
  const maxRedirects = options.maxRedirects ?? 5;
  const sleep = options.sleep ?? defaultSleep;
  const requestHeaders = requestHeadersFor(source);

  let retries = 0;
  let fetchCalls = 0;
  let lastTransport = 'unknown transport failure';

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      retries += 1;
      await sleep(baseBackoffMs * 2 ** (attempt - 1));
    }

    let url = source.url;
    let hops = 0;
    let status = 0;
    let body = '';
    let headers: Record<string, string> = {};
    let transportFailed = false;

    try {
      for (;;) {
        fetchCalls += 1;
        const res = await options.fetchImpl(url, { headers: requestHeaders, redirect: 'manual' });
        status = res.status;
        headers = {};
        for (const name of CAPTURED_HEADERS) {
          const value = res.headers.get(name);
          if (value !== null) headers[name] = value;
        }

        if (!REDIRECT_STATUSES.has(status)) {
          // A 304 legitimately carries no body, and reading one is not free.
          body = status === 304 ? '' : await res.text();
          break;
        }

        const location = res.headers.get('location');
        if (location === null) {
          body = await res.text();
          break;
        }

        const target = new URL(location, url).toString();
        const hopViolation = allowlistViolationFor(target, options.countryCode);
        if (hopViolation !== null) {
          return {
            ...defect(
              'allowlist_violation',
              `${url} redirected to a host that is not on the "${options.countryCode}" allowlist: ${hopViolation}`,
            ),
            retries,
            fetchCalls,
          };
        }

        hops += 1;
        if (hops > maxRedirects) {
          return {
            ...defect(
              'too_many_redirects',
              `${source.url} exceeded ${maxRedirects} redirect hops without reaching a document`,
            ),
            retries,
            fetchCalls,
          };
        }
        url = target;
      }
    } catch (error) {
      transportFailed = true;
      lastTransport = error instanceof Error ? error.message : String(error);
    }

    // 1. Transport failure and 5xx are the SAME class: the source was not reached.
    if (transportFailed || status >= 500) {
      if (!transportFailed) lastTransport = `HTTP ${status} from ${url}`;
      if (attempt < maxRetries) continue;
      return {
        disposition: 'source_unreachable',
        reason: transportFailed ? 'transport_error' : 'server_error',
        message: `${source.url} unreachable after ${attempt + 1} attempts (${retries} retries): ${lastTransport}. This blocks the merge under its own status — it is not a claim that the legal fact is wrong, and a named maintainer may override it with a recorded reason.`,
        retries,
        fetchCalls,
      };
    }

    const result = verifySource(
      source,
      {
        status,
        body,
        headers,
        etag: headers['etag'] ?? null,
        lastModified: headers['last-modified'] ?? null,
      },
      context,
    );
    return { ...result, retries, fetchCalls };
  }

  // The loop above always returns or continues; this is the type-checker's exit.
  return {
    disposition: 'source_unreachable',
    reason: 'transport_error',
    message: `${source.url} unreachable: ${lastTransport}`,
    retries,
    fetchCalls,
  };
}
