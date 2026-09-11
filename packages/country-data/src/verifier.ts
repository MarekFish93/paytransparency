/**
 * The fail-loud source verifier.
 *
 * A verifier that passes on an empty 200 is worse than no verifier at all, because it
 * manufactures confidence. Every assertion below exists because research reproduced a
 * response shape that either greened an incorrect document or reddened a correct one:
 *
 *   1. The eur-lex.europa.eu web front end answers `202 Accepted` with a ZERO-length
 *      body, and `res.ok` is `true` for 202. `if (!res.ok) throw` passes it. Hence the
 *      exact `status === 200` check rather than a 2xx range.
 *   2. "within a reasonable period of time" occurs in a RECITAL about joint pay
 *      assessments, at a byte offset far below Art. 7(4). An unscoped anchor verifies
 *      text that is not the cited provision. Hence: scope FIRST, assert second.
 *   3. A legitimate `304` has a zero-length body. A byte floor applied before status
 *      dispatch turns a successful cache revalidation into a hard failure. Hence 304 is
 *      handled before any body check.
 *   4. "Article 7" with an ASCII space occurs ZERO times in the authentic document;
 *      "Article 7" occurs once. A verifier anchored on the obvious string fails on
 *      a perfect document. Hence normalisation for MATCHING only — storage stays raw.
 *   5. The Cellar 200 carries an EMPTY `Content-Language`. The server does not tell you
 *      which language it gave you. Hence the subtitle check.
 */
import type { Source } from './schema.ts';

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
 * Per-strategy minimum body size. The authentic EN Cellar expression is 193,564 bytes;
 * 100,000 leaves generous headroom while still rejecting a truncated or stub response.
 *
 * This floor must never be weakened to turn a red gate green. A source that cannot be
 * machine-verified is recorded as `manual-attest`, not as `verified`.
 */
export const BYTE_FLOOR: Record<string, number> = {
  cellar: 100000,
  'html-anchor': 2000,
  jsonld: 500,
  'metadata-only': 500,
};

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
    .replace(/[   ]/g, ' ')
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
  etag?: string | null;
  lastModified?: string | null;
};

export type VerifyResult = {
  disposition: Disposition;
  /** Human-readable, and on a defect it quotes what was actually there. */
  message: string;
  etag?: string | null;
};

const NOT_IMPLEMENTED = (strategy: string): VerifyResult => {
  throw new Error(
    `verifySource: the "${strategy}" strategy is not implemented in plan 01-01. ` +
      `Its signature is fixed; plan 01-02 fills it. Refusing to fall through to another ` +
      `strategy's assertions, which would green a source on evidence they do not apply to.`,
  );
};

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
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&#8217;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/**
 * Verify one source against one response.
 *
 * The assertion ORDER is the whole design. Reordering it reintroduces a reproduced
 * failure: body checks before the 304 branch break cache revalidation, an anchor
 * assertion before the subtree scope verifies a recital.
 */
export function verifySource(source: Source, response: VerifierResponse): VerifyResult {
  if (source.verification === 'manual-attest') {
    // No fetch is performed at all. The honest answer for a client-rendered shell
    // (slov-lex.sk) or a WAF interstitial (e-tar.lt): record that a human looked.
    return {
      disposition: 'attested',
      message: `manual-attest: ${source.url} is not machine-verifiable; the fact must carry a dated human attestation in verified_by`,
    };
  }

  if (source.verification !== 'cellar') {
    return NOT_IMPLEMENTED(source.verification);
  }

  // 1. Transport error — the request never completed. Not disproven, just unreached.
  if (response.transportError != null && response.transportError !== '') {
    return {
      disposition: 'source_unreachable',
      message: `transport error reaching ${source.url}: ${response.transportError}`,
    };
  }

  const status = response.status;
  if (status === undefined) {
    return {
      disposition: 'source_unreachable',
      message: `no HTTP status recorded for ${source.url}`,
    };
  }

  // 2. 304 BEFORE any body check — a legitimate revalidation has a zero-length body.
  if (status === 304) {
    return {
      disposition: 'revalidated',
      message: `304 Not Modified for ${source.url}; content unchanged since ETag ${source.etag ?? '(none recorded)'}`,
      etag: source.etag ?? null,
    };
  }

  // 3. 4xx is a defect; 5xx is transport.
  if (status >= 400 && status < 500) {
    return {
      disposition: 'data_defect',
      message: `${status} for ${source.url} — the cited resource is not there. This is a data defect, not an outage.`,
    };
  }
  if (status >= 500) {
    return {
      disposition: 'source_unreachable',
      message: `${status} from ${source.url} — server-side failure, retry with backoff`,
    };
  }

  // 4. Anything else that is not exactly 200 — notably 202 with an empty body.
  if (status !== 200) {
    return {
      disposition: 'data_defect',
      message:
        status === 202
          ? `202 with empty body — this source is behind an anti-automation gate; it cannot be verified by fetch. Use manual-attest or an alternative source.`
          : `expected HTTP status exactly 200, got ${status} for ${source.url}`,
    };
  }

  // 5. Body size: empty, below the strategy floor, or implausibly large.
  const body = response.body ?? '';
  if (body.length === 0) {
    return {
      disposition: 'data_defect',
      message: `200 with a zero-length body from ${source.url} — a 200 is not evidence; the bytes are`,
    };
  }
  if (body.length > MAX_BODY_BYTES) {
    return {
      disposition: 'data_defect',
      message: `body from ${source.url} is ${body.length} bytes, above the ${MAX_BODY_BYTES}-byte cap`,
    };
  }
  const floor = BYTE_FLOOR[source.verification] ?? 0;
  if (body.length < floor) {
    return {
      disposition: 'data_defect',
      message: `body from ${source.url} is ${body.length} bytes, below the ${floor}-byte floor for the "${source.verification}" strategy`,
    };
  }

  // 6/7. Scope FIRST. The anchor is asserted inside the cited subdivision and nowhere else.
  const scope = source.scope;
  if (scope === null) {
    return {
      disposition: 'data_defect',
      message: `cellar source ${source.url} carries no scope id — refusing to assert an anchor across the whole document`,
    };
  }
  const subtree = scopeToSubdivision(body, scope.id);
  if (subtree === null) {
    return {
      disposition: 'data_defect',
      message: `id="${scope.id}" absent from a 200 response of ${body.length} bytes — this is a data defect, not an outage`,
    };
  }

  // 8. Assert the anchor INSIDE the scope. On failure, show what was actually there.
  const haystack = normaliseForMatch(textOf(subtree));
  const needle = normaliseForMatch(source.anchor);
  if (!haystack.includes(needle)) {
    const window = haystack.slice(0, 200);
    return {
      disposition: 'data_defect',
      message:
        `anchor not found inside the id="${scope.id}" subtree of ${source.url}.\n` +
        `  looked for: ${needle}\n` +
        `  scope began: ${window}`,
    };
  }

  // 9. Confirm the language from the subdivision's own subtitle. `Content-Language` is
  //    empty on this server, so nothing else in the response identifies the language.
  if (scope.expected_subtitle !== null) {
    const titleSubtree = scopeToElement(subtree, `${scope.id}.tit_1`);
    const titleText = titleSubtree === null ? '' : normaliseForMatch(textOf(titleSubtree));
    const expected = normaliseForMatch(scope.expected_subtitle);
    if (!titleText.includes(expected)) {
      return {
        disposition: 'data_defect',
        message:
          `language confirmation failed for ${source.url}: id="${scope.id}.tit_1" reads "${titleText}", ` +
          `expected to contain "${expected}" for language "${source.language}"`,
      };
    }
  }

  return {
    disposition: 'verified',
    message: `anchor confirmed inside id="${scope.id}" of ${source.url} (${body.length} bytes, ETag ${response.etag ?? source.etag ?? '(none)'})`,
    etag: response.etag ?? source.etag ?? null,
  };
}
