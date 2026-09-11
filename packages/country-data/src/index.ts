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

export { TTL_DAYS, AGEING_AT, elapsedDays, freshnessOf } from './freshness.ts';
export type { Freshness } from './freshness.ts';

export {
  EU_COUNTRY_CODES,
  LAUNCH_COUNTRIES,
  LEGALLY_OPERATIVE_FIELDS,
  CITED_ARTICLES,
  CITATION_KEY_SHAPE,
  FACT_PATHS,
  isLaunchCountry,
  factAt,
  CountryRecord,
  ProposedCountryRecord,
  Proposal,
  DirectiveFallbackRef,
  LegalBasis,
  NationalLegalBasis,
  LegalBasisValue,
  NationalDeadline,
  ResponseDeadlineValue,
  DeadlineUnit,
  Art12_3Body,
  Art12_3Condition,
  Art12_3Value,
  Art12_3Position,
  Art7_2Standing,
  Art7_2StandingValue,
  EqualityBody,
  EqualityBodyEntry,
  EqualityBodyValue,
  TranspositionStatus,
  TranspositionStatusValue,
  DiscoveryHint,
  DiscoveryHintKind,
} from './country.ts';
export type { CountryCode, LaunchCountry, LegallyOperativeField, FactPath } from './country.ts';

export { resolve, DIRECTIVE_FALLBACK_KEYS, MissingDirectiveCitation } from './resolve.ts';
export type {
  Provenance,
  ResolvedFact,
  ResolveOptions,
  DirectiveCorpus,
  DirectiveFallbackField,
} from './resolve.ts';
