/**
 * The frozen provenance primitives.
 *
 * The central idea: no legal fact in this package is a bare scalar. Every one is a
 * `Fact<T>` envelope, so it is structurally impossible to express a value without its
 * provenance — "unknown renders as pending verification, never a guess" becomes a parse
 * error rather than a UI convention somebody eventually forgets.
 *
 * Two unions are frozen here at exactly five members each. Both are load-bearing:
 *
 *   `FactStatus` separates three claims that "we have no national citation" was
 *   collapsing into one — `pending_verification` (we have not checked),
 *   `directive_default` (we checked and national law adds nothing) and
 *   `directive_fallback` (we are deliberately suppressing a national citation and citing
 *   the Directive instead). D-07 rates `directive_fallback` one-way: Phases 3 and 5 both
 *   branch on it.
 *
 *   `SourceVerification` records HOW a source was checked. `manual-attest` is a
 *   first-class peer, not an exception: it records the *absence* of machine verification
 *   honestly, which is strictly better than a green produced by a fetch that never saw
 *   the statute. Rated costly, not one-way — see the plan's `<reversibility>` note.
 *
 * Zod is a devDependency. This package ships JSON plus generated `.d.ts`; a consumer
 * pays no runtime cost.
 */
import { z } from 'zod';

/** `YYYY-MM-DD`. Deliberately not `z.date()` — these are calendar dates, not instants. */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date, YYYY-MM-DD');

export const SourceKind = z.enum([
  'official_journal', // Dziennik Ustaw, Gazzetta Ufficiale — tier 1
  'legislature', // parliament bill tracker — tier 1
  'ministry', // ministry / government portal — tier 1
  'equality_body', // national equality body — tier 1
  'eu_institution', // Publications Office, Commission, Eurostat, EIGE — tier 1
  'law_firm', // Littler, iusLaboris, Morgan Lewis — tier 2
  'press', // trade press — tier 2
]);
export type SourceKind = z.infer<typeof SourceKind>;

/**
 * How a source is checked. Frozen at five members.
 *
 * - `cellar`        — publications.europa.eu. 200/304, `art_N` subtree present,
 *                     normalised anchor INSIDE that subtree, ETag recorded.
 * - `html-anchor`   — server-rendered registers. 200, byte floor, normalised anchor.
 * - `jsonld`        — legislation.mt. 200, `application/ld+json` parses,
 *                     `legislationIdentifier` equals the stored ELI.
 * - `metadata-only` — sources whose operative text lives in a linked PDF. Asserts the
 *                     title anchor only and RECORDS that the wording was not verified.
 * - `manual-attest` — slov-lex.sk (client-rendered shell), e-tar.lt (WAF interstitial).
 *                     No fetch at all. Requires a dated human attestation.
 *
 * Only `cellar` is implemented in plan 01-01; plan 01-02 fills the other four against
 * this already-frozen discriminant.
 */
export const SourceVerification = z.enum([
  'cellar',
  'html-anchor',
  'jsonld',
  'metadata-only',
  'manual-attest',
]);
export type SourceVerification = z.infer<typeof SourceVerification>;

/** Freshness class. TTLs live in `freshness.ts`. */
export const Volatility = z.enum(['stable', 'volatile', 'pending', 'statistical']);
export type Volatility = z.infer<typeof Volatility>;

/**
 * Frozen at five members. `directive_fallback` is D-07's explicit
 * "national citation suppressed, Directive article cited instead" state.
 */
export const FactStatus = z.enum([
  'verified',
  'directive_default',
  'directive_fallback',
  'pending_verification',
  'not_applicable',
]);
export type FactStatus = z.infer<typeof FactStatus>;

const CELLAR_HOST = 'publications.europa.eu';

const isIpLiteralHost = (host: string): boolean =>
  /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');

/**
 * Returns the reasons a source URL is unacceptable, or an empty array.
 *
 * `https://` is required, with ONE exception: the Cellar canonical resource URI is
 * served over plain http and content-negotiated, and forbidding it would block the
 * project's only primary source (threat T-1-04, disposition accept — the response is
 * pinned by ETag and Last-Modified and re-verified nightly, so a substituted body
 * surfaces as a drift review task).
 */
export function sourceUrlIssues(raw: string): string[] {
  const issues: string[] = [];
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return ['source url is not a parseable absolute URL'];
  }

  const isCellarHttp = u.protocol === 'http:' && u.hostname === CELLAR_HOST;
  if (u.protocol !== 'https:' && !isCellarHttp) {
    issues.push(
      `source url must use https:// (the only http:// exception is ${CELLAR_HOST}, whose canonical resource URI is content-negotiated over http)`,
    );
  }
  if (u.username !== '' || u.password !== '') {
    issues.push('source url must not carry credentials');
  }
  if (u.port !== '') {
    issues.push(`source url must not carry a non-standard port (:${u.port})`);
  }
  if (isIpLiteralHost(u.hostname)) {
    issues.push('source url host must be a domain name, not an IP literal');
  }
  for (const key of u.searchParams.keys()) {
    const k = key.toLowerCase();
    if (k.startsWith('utm_') || k === 'fbclid') {
      issues.push(`source url must not carry the tracking parameter "${key}"`);
    }
  }
  return issues;
}

const SourceUrl = z.string().superRefine((value, ctx) => {
  for (const message of sourceUrlIssues(value)) {
    ctx.addIssue({ code: 'custom', message });
  }
});

/**
 * The structural scope a strategy asserts inside. For `cellar` this is the publisher's
 * own subdivision id (`art_7`) — never a title string, because locating an article by
 * searching for the words "Article 7" both misses the authentic document (which uses
 * U+00A0 between the word and the number) and matches recitals that merely refer to it.
 *
 * `expected_subtitle` carries the per-locale article subtitle found at `<id>.tit_1`. The
 * Cellar 200 response has an EMPTY `Content-Language` header, so this is the only way to
 * confirm the server returned the language that was asked for.
 */
export const SourceScope = z.object({
  id: z.string().min(3),
  expected_subtitle: z.string().min(3).nullable().default(null),
});
export type SourceScope = z.infer<typeof SourceScope>;

export const Source = z.object({
  url: SourceUrl,
  title: z.string().min(3),
  publisher: z.string().min(2),
  kind: SourceKind,
  /** REQUIRED discriminant. See `SourceVerification`. */
  verification: SourceVerification,
  /**
   * The string the verifier asserts is present. Chosen per source: it must assert what
   * THAT source actually serves. legislation.mt, for example, serves its title and ELI
   * identifier on the landing page but not the operative wording — an anchor asserting
   * the wording would fail on a perfectly good source.
   */
  anchor: z.string().min(8),
  /** BCP-47 of the source document, e.g. `en`, `pl`. */
  language: z.string().min(2),
  published_at: IsoDate.optional(),
  accessed_at: IsoDate,
  etag: z.string().optional(),
  last_modified: z.string().optional(),
  scope: SourceScope.nullable().default(null),
});
export type Source = z.infer<typeof Source>;

/** The envelope, minus the `value` whose type varies per field. */
export type FactEnvelope = {
  status: FactStatus;
  sources: Source[];
  verified_at: string | null;
  verified_by: string | null;
  volatility: Volatility;
  note_key?: string | undefined;
};

export type Fact<T> = FactEnvelope & { value: T | null };

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/**
 * `Fact(inner)` builds the envelope schema for a value of shape `inner`.
 *
 * The invariants below are what make "pending verification" unforgeable. They are
 * enforced at parse time, so a hand-edited JSON file in a contributor's pull request
 * cannot carry a value without the provenance that justifies it.
 */
export const Fact = <S extends z.ZodType>(inner: S) =>
  z
    .object({
      value: inner.nullable(),
      status: FactStatus,
      sources: z.array(Source).default([]),
      verified_at: IsoDate.nullable().default(null),
      /** Who eyeballed the source (D-06: an agent proposes, a human confirms). */
      verified_by: z.string().nullable().default(null),
      volatility: Volatility,
      /** i18n key, NOT prose. */
      note_key: z.string().optional(),
    })
    .superRefine((raw, ctx) => {
      // `inner` is generic, so Zod cannot narrow `value` for us here. The envelope
      // fields are fully known, and `value`'s only role in these invariants is
      // null vs non-null, so a local view of the parsed object is enough.
      const f = raw as FactEnvelope & { value: unknown };

      if (f.status === 'verified') {
        if (f.value === null) {
          ctx.addIssue({ code: 'custom', message: 'a verified fact must have a value' });
        }
        if (f.sources.length === 0) {
          ctx.addIssue({ code: 'custom', message: 'a verified fact must cite at least one source' });
        }
        if (f.verified_at === null) {
          ctx.addIssue({ code: 'custom', message: 'a verified fact must have a verified_at date' });
        }
      }

      if (f.status === 'pending_verification' && f.value !== null) {
        ctx.addIssue({
          code: 'custom',
          message: 'a pending_verification fact must have value: null — never a plausible guess',
        });
      }

      if (f.verified_at !== null && f.verified_at > todayIso()) {
        ctx.addIssue({ code: 'custom', message: `verified_at ${f.verified_at} is in the future` });
      }

      f.sources.forEach((source, i) => {
        if (source.verification !== 'manual-attest' && source.anchor.trim().length === 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['sources', i, 'anchor'],
            message: `a "${source.verification}" source must carry a non-empty anchor — a source with nothing to assert cannot back a verified fact`,
          });
        }
        if (source.verification === 'manual-attest' && f.verified_by === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['verified_by'],
            message:
              'a manual-attest source records the absence of machine verification, so its fact must name the human who attested it in verified_by',
          });
        }
        if (source.verification === 'cellar' && source.scope === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['sources', i, 'scope'],
            message:
              'a cellar source must carry a scope id — the anchor is asserted INSIDE the cited subdivision, never across the whole document',
          });
        }
      });
    });

/** The one Directive value shape seeded in plan 01-01. Plan 01-03 adds the rest. */
export const DirectiveQuotation = z.object({
  /** RAW, unnormalised. U+00A0 and U+2019 are preserved exactly as the OJ published them. */
  text: z.string().min(20),
  /** The publisher's own key, e.g. `32023L0970#007.004`. Language-invariant. */
  citation_key: z.string().regex(/^3\d{4}[A-Z]\d{4}#\d{3}\.\d{3}$/),
  article: z.number().int().positive(),
  paragraph: z.number().int().positive(),
});
export type DirectiveQuotation = z.infer<typeof DirectiveQuotation>;

export const DirectiveFact = Fact(DirectiveQuotation);
export const DirectiveFile = z.record(z.string(), DirectiveFact);
