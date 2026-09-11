/**
 * `@jafn/directive-engine` — Directive (EU) 2023/970 Article 9, as a contract.
 *
 * MIT, and ZERO runtime dependencies, ever. That is the condition of this package's
 * role as the open-source lead magnet and it is enforced in CI; the surrounding web
 * application is AGPL and the boundary is proved mechanically.
 *
 * There is deliberately no Article 9 metric arithmetic here yet. What exists is the
 * frozen report contract, the recorded calculation conventions, the golden vectors the
 * engine must later reproduce, and the share-URL contract — which is executable because
 * "the result page and the share card round identically" has to be a property rather
 * than a sentence in a document.
 */
export {
  DIRECTIVE_CELEX,
  CITATION_KEY_PATTERN,
  CITED_ARTICLES,
  CONVENTION_KEYS,
  CONVENTION_KEYS_ARE_EXHAUSTIVE,
  METRIC_KEYS,
  METRIC_DEFINITIONS,
  ART10_THRESHOLD_PCT,
  ENGINE_CODES,
} from './types.ts';

export type {
  CitedArticle,
  MetricValue,
  Denominator,
  MedianRule,
  QuartileTieRule,
  QuartileRemainder,
  PayBasis,
  PartialPeriodPolicy,
  JoinerLeaverPolicy,
  SexCode,
  PayComponentClass,
  ReferencePeriod,
  Conventions,
  ConventionKey,
  ConventionOrigin,
  ConventionSource,
  Exact,
  MetricKey,
  SelfPublishableMetricKey,
  AuthorityOnlyMetricKey,
  MetricDefinition,
  Metrics,
  Art10Flag,
  PublishableSets,
  EngineWarning,
  EngineCode,
  EngineReport,
} from './types.ts';
