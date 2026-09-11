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
  verifySourceLive,
  isChallengeInterstitial,
  overrideUnreachable,
  normaliseForMatch,
  scopeToSubdivision,
  scopeToElement,
  jsonLdBlocks,
  textOf,
  SourceDefect,
  BYTE_FLOOR,
  MAX_BODY_BYTES,
} from './verifier.ts';
export type {
  Disposition,
  DefectReason,
  FetchLike,
  LiveOptions,
  LiveResult,
  UnreachableOverride,
  VerifierResponse,
  VerifyContext,
  VerifyResult,
} from './verifier.ts';

export { STRATEGY_TABLE, strategyFor, byteFloorFor } from './source-strategy.ts';
export type { ScopeRule, StrategyAssertion, StrategyEntry } from './source-strategy.ts';

/**
 * The pre-fetch allowlist guard. Build-time only — it reads `data/allowlist.json` with
 * `node:fs`, which is why this barrel is not browser-bundler-safe. The first client
 * bundle that needs `@jafn/country-data` should get a data-only subpath export rather
 * than a weaker guard.
 */
export { isAllowlisted, assertFetchable, assertRedirectChain, AllowlistViolation } from './allowlist.ts';
export type { AllowlistData, AllowlistViolationReason } from './allowlist.ts';

export { TTL_DAYS, AGEING_AT, elapsedDays, freshnessOf } from './freshness.ts';
export type { Freshness } from './freshness.ts';
