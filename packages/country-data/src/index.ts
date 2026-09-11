/**
 * `@jafn/country-data` — the legal-data spine.
 *
 * Every legal fact in this package is a `Fact<T>` envelope: a value cannot exist here
 * without the source and date that justify it. Unknown is `value: null` with
 * `status: 'pending_verification'`, never a plausible guess.
 *
 * The package ships JSON plus generated `.d.ts`. Zod is a devDependency and a consumer
 * pays no runtime cost.
 */
export {
  Fact,
  FactStatus,
  Source,
  SourceKind,
  SourceScope,
  SourceVerification,
  Volatility,
  IsoDate,
  DirectiveQuotation,
  DirectiveFact,
  DirectiveFile,
  sourceUrlIssues,
} from './schema.ts';
export type { FactEnvelope } from './schema.ts';

export {
  verifySource,
  normaliseForMatch,
  scopeToSubdivision,
  scopeToElement,
  textOf,
  SourceDefect,
  BYTE_FLOOR,
  MAX_BODY_BYTES,
} from './verifier.ts';
export type { Disposition, VerifierResponse, VerifyResult } from './verifier.ts';

export {
  CELEX,
  citationKey,
  extractArticle,
  extractParagraph,
  listParagraphIds,
} from './extract.ts';
export type { ExtractedArticle, ExtractedParagraph, ExtractedSubPoint } from './extract.ts';

export { TTL_DAYS, AGEING_AT, elapsedDays, freshnessOf } from './freshness.ts';
export type { Freshness } from './freshness.ts';
