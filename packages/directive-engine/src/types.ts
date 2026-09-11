/**
 * `@jafn/directive-engine` — the frozen Article 9 report contract.
 *
 * TYPES ONLY. No Article 9 metric arithmetic is written in this phase. The golden
 * vectors under `vectors/` and this file together are the executable specification the
 * engine must later satisfy; an implementation written now would be written against
 * itself, and the vectors would then be testing the code against the code.
 *
 * "Article 9" here always means Article 9 of Directive (EU) 2023/970, never Article 9
 * of the GDPR. The two will be confused in issues and support threads unless the
 * Directive is named in full every time.
 *
 * The contract is FROZEN with a recorded amendment path — see `docs/ENGINE-REPORT.md`.
 * An amendment is permitted; a silent divergence between this file, the convention
 * document and the vectors is not.
 */

// ---------------------------------------------------------------------------
// Citation keys
// ---------------------------------------------------------------------------

/** CELEX id of Directive (EU) 2023/970. */
export const DIRECTIVE_CELEX = '32023L0970';

/**
 * The citation-key shape plan 01 fixed: the CELEX id, a hash separator, the
 * publisher's own three-digit article id, a dot, and the three-digit paragraph id —
 * `32023L0970#003.001`.
 *
 * These are the Publications Office's own ids, verified language-invariant: the Polish
 * expression of the Directive carries the identical `art_7` / `007.004` ids. They are
 * never a tagging scheme invented here, and an article is never located by searching
 * for the string "Article 7" (which does not occur with an ASCII space in the
 * authentic text).
 *
 * Kept byte-identical to the pattern in `@jafn/country-data`'s schema. It is
 * duplicated rather than imported because this package ships MIT with zero runtime
 * dependencies and country-data is AGPL; a drift between the two is caught by the
 * corpus-resolution assertion plan 07 owns.
 */
export const CITATION_KEY_PATTERN = /^3\d{4}[A-Z]\d{4}#\d{3}\.\d{3}$/;

/**
 * The articles this phase cites, as the publisher's three-digit article ids.
 *
 * 003 — the Art. 3(1) definitions that fix the denominator, the median, the quartile
 *       construction and the category of workers.
 * 007 — the worker-side right to information (plan 01-01's seeded fact).
 * 009 — the employer-side reporting obligation and its seven metrics.
 * 010 — the joint pay assessment and its five-percent trigger.
 * 012 — the only EU-level identifiability provision, which sets no numeric threshold.
 */
export const CITED_ARTICLES = ['003', '007', '009', '010', '012'] as const;

export type CitedArticle = (typeof CITED_ARTICLES)[number];

// ---------------------------------------------------------------------------
// MetricValue
// ---------------------------------------------------------------------------

/**
 * One reported figure with the provenance that makes it defensible.
 *
 * `suppressed` and `unreliable` are SEPARATE and must stay separate. An HR user has to
 * be able to tell "we cannot show this because it would identify someone" from "this
 * number is too noisy to trust". Collapsing them into one flag loses the distinction
 * the export has to carry to an authority.
 */
export interface MetricValue {
  /** `null` where the metric has no defensible value — never a zero standing in for one. */
  value: number | null;
  /** A citation key matching {@link CITATION_KEY_PATTERN} into the stored Directive corpus. */
  definitionCite: string;
  /** Workers counted in this figure. */
  populationN: number;
  /** Workers present in the input but excluded from this figure, e.g. an unmapped sex value. */
  excludedN: number;
  /** Privacy suppression: showing the figure would disclose an identifiable worker's pay. */
  suppressed: boolean;
  /** Statistical reliability: the figure is computable but too noisy to rely on. */
  unreliable: boolean;
}

// ---------------------------------------------------------------------------
// Conventions
// ---------------------------------------------------------------------------

/** Art. 3(1)(c) and 3(1)(e) both express the difference over the MALE figure. Not a choice. */
export type Denominator = 'male_mean' | 'male_median';

/** Which of the two middle values an even headcount takes. The Directive is silent. */
export type MedianRule = 'interpolated' | 'lower_of_two';

/** Where workers sitting on exactly the same pay value at a quartile boundary go. */
export type QuartileTieRule = 'ukgov_proportional' | 'stable_sort';

/** Which quarter the remainder goes to when the headcount does not divide by four. */
export type QuartileRemainder = 'to_lower' | 'to_upper';

/** Which of the employer's own pay lines fall on which side. Caller-declared; no default. */
export type PayBasis = 'hourly' | 'fte_annualised' | 'as_paid';

/** Part-time and full-time-equivalent normalisation. Caller-declared; no default; throws if absent. */
export type PartialPeriodPolicy = 'include' | 'exclude_reduced_pay';

/** Workers present for only part of the reference period. */
export type JoinerLeaverPolicy = 'employed_at_period_end' | 'any_pay_in_period';

/**
 * The codes the metrics are broken down by. `other` and `undisclosed` are first-class:
 * they are counted and reported, never silently dropped, because a silently dropped
 * worker is how a confidently wrong percentage is produced.
 */
export type SexCode = 'F' | 'M' | 'other' | 'undisclosed';

/** How one of the employer's own payroll columns maps onto the Directive's pay components. */
export type PayComponentClass = 'basic' | 'complementary_variable' | 'excluded';

/** Art. 9(2)-(4): the previous CALENDAR year. Both bounds are ISO `YYYY-MM-DD`. */
export interface ReferencePeriod {
  from: string;
  to: string;
}

/**
 * Every field is REQUIRED. No optionals, no defaults at the type level.
 *
 * The Directive is genuinely silent on several of these and vendors disagree with each
 * other about them, so an empty or partial Conventions block must fail rather than be
 * filled in by the engine. Where a default IS recorded, it lives in
 * `docs/CONVENTIONS.md` together with its origin, and the caller still has to state it.
 */
export interface Conventions {
  denominator: Denominator;
  medianRule: MedianRule;
  quartileTieRule: QuartileTieRule;
  quartileRemainder: QuartileRemainder;
  payBasis: PayBasis;
  partialPeriodPolicy: PartialPeriodPolicy;
  joinerLeaverPolicy: JoinerLeaverPolicy;
  sexMapping: Record<string, SexCode>;
  componentMap: Record<string, PayComponentClass>;
  /** `null` is the recorded default: NO EU-level numeric threshold exists. */
  minGroupSize: number | null;
  referencePeriod: ReferencePeriod;
}

/**
 * The convention keys in ONE fixed order.
 *
 * `docs/CONVENTIONS.md` carries its eleven decision headings in exactly this order and
 * `test/conventions-documented.test.ts` asserts the two ordered lists are equal, so a
 * key cannot be appended to one without the other.
 */
export const CONVENTION_KEYS = [
  'denominator',
  'medianRule',
  'quartileTieRule',
  'quartileRemainder',
  'payBasis',
  'partialPeriodPolicy',
  'joinerLeaverPolicy',
  'sexMapping',
  'componentMap',
  'minGroupSize',
  'referencePeriod',
] as const;

export type ConventionKey = (typeof CONVENTION_KEYS)[number];

/** `true` only when A and B are the same type in both directions. */
export type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Compile-time proof that {@link CONVENTION_KEYS} is exactly the key set of
 * {@link Conventions} — neither a subset nor a superset. Adding a field to Conventions
 * without adding its key here stops the build.
 */
const CONVENTION_KEYS_ARE_EXHAUSTIVE: Exact<ConventionKey, keyof Conventions> = true;

export { CONVENTION_KEYS_ARE_EXHAUSTIVE };

/**
 * Where the value actually used for a convention came from, per key.
 *
 * This is D-14 made structural: every report says which convention produced every
 * number, so a disagreement with a vendor or a national template is a parameter rather
 * than a bug report.
 */
export type ConventionOrigin = 'directive' | 'caller' | 'adapter_default';

export type ConventionSource = Record<ConventionKey, ConventionOrigin>;

// ---------------------------------------------------------------------------
// The seven Art. 9(1) metrics
// ---------------------------------------------------------------------------

export const METRIC_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

/** Art. 9(7): the employer may self-publish (a)-(f); (g) goes to the authority only. */
export type SelfPublishableMetricKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

export type AuthorityOnlyMetricKey = 'g';

/**
 * What each Art. 9(1) metric is and where its DEFINITION lives.
 *
 * `definitionCite` is a citation key into the stored corpus and therefore resolves at
 * PARAGRAPH granularity, because the publisher's own ids are per paragraph: Art. 3(1)(c)
 * and Art. 3(1)(f) are both inside `003.001`. `point` carries the sub-point a reader
 * needs and is narrated in `docs/ENGINE-REPORT.md`; it is documentation, not a key, and
 * nothing resolves against it.
 */
export interface MetricDefinition {
  readonly label: string;
  readonly definitionCite: string;
  readonly point: string;
  readonly selfPublishable: boolean;
}

export const METRIC_DEFINITIONS: Readonly<Record<MetricKey, MetricDefinition>> = {
  a: {
    label: 'the gender pay gap',
    definitionCite: '32023L0970#003.001',
    point: 'Art. 3(1)(c), enumerated at Art. 9(1)(a)',
    selfPublishable: true,
  },
  b: {
    label: 'the gender pay gap in complementary or variable components',
    definitionCite: '32023L0970#003.001',
    point: 'Art. 3(1)(c) over the complementary or variable components of pay defined at Art. 3(1)(a), enumerated at Art. 9(1)(b)',
    selfPublishable: true,
  },
  c: {
    label: 'the median gender pay gap',
    definitionCite: '32023L0970#003.001',
    point: 'Art. 3(1)(e), enumerated at Art. 9(1)(c)',
    selfPublishable: true,
  },
  d: {
    label: 'the median gender pay gap in complementary or variable components',
    definitionCite: '32023L0970#003.001',
    point: 'Art. 3(1)(e) over the complementary or variable components of pay defined at Art. 3(1)(a), enumerated at Art. 9(1)(d)',
    selfPublishable: true,
  },
  e: {
    label: 'the proportion of female and male workers receiving complementary or variable components',
    definitionCite: '32023L0970#009.001',
    point: 'Art. 9(1)(e) — the metric is defined by its own enumeration; Art. 3(1) carries no separate definition of it',
    selfPublishable: true,
  },
  f: {
    label: 'the proportion of female and male workers in each quartile pay band',
    definitionCite: '32023L0970#003.001',
    point: 'Art. 3(1)(f), enumerated at Art. 9(1)(f)',
    selfPublishable: true,
  },
  g: {
    label: 'the gender pay gap between workers by categories of workers, broken down by ordinary basic wage or salary and complementary or variable components',
    definitionCite: '32023L0970#003.001',
    point: 'Art. 3(1)(h), enumerated at Art. 9(1)(g)',
    selfPublishable: false,
  },
};

/**
 * The seven Art. 9(1) figures. (g) is keyed by the employer's own category name,
 * because a category of workers is employer-defined under Art. 3(1)(h) and is NEVER
 * inferred from a job title.
 */
export interface Metrics {
  a: MetricValue;
  b: MetricValue;
  c: MetricValue;
  d: MetricValue;
  e: MetricValue;
  f: MetricValue;
  g: Record<string, MetricValue>;
}

// ---------------------------------------------------------------------------
// Article 10 and the publication split
// ---------------------------------------------------------------------------

/** Art. 10(1): the average-difference trigger, in percentage points. */
export const ART10_THRESHOLD_PCT = 5;

/**
 * A category over the Art. 10(1) five-percent trigger.
 *
 * A flag is ONE of the three cumulative Art. 10(1) conditions, not the whole test: the
 * other two — that the difference is not justified on objective gender-neutral
 * criteria, and that it has not been remedied within six months — are employer
 * judgements the engine cannot make and must not imply.
 */
export interface Art10Flag {
  category: string;
  gapPct: number;
  threshold: 5;
}

/**
 * Art. 9(7): points (a)-(g) go to the national monitoring body; the employer MAY
 * publish only (a)-(f). Getting this wrong is a disclosure problem for the customer,
 * so the split is structural rather than a rendering choice in the exporter.
 */
export interface PublishableSets {
  selfPublishable: SelfPublishableMetricKey[];
  authorityOnly: AuthorityOnlyMetricKey[];
}

// ---------------------------------------------------------------------------
// Warnings and named codes
// ---------------------------------------------------------------------------

export interface EngineWarning {
  code: string;
  detail: string;
}

/**
 * Named codes, so a refusal or a warning is the same string everywhere — in the engine,
 * in the golden vectors' expected output, and in the UI copy that explains it.
 *
 * `E_` codes are refusals: the engine throws rather than producing a number it cannot
 * defend. `W_` codes accompany a value (or a deliberate `null`) in the report.
 */
export const ENGINE_CODES = {
  /** A convention with no recorded default was not supplied by the caller. */
  CONVENTION_REQUIRED: 'E_CONVENTION_REQUIRED',
  /** `referencePeriod` is not a calendar year. Art. 9(2)-(4) fixes it; there is no override. */
  REFERENCE_PERIOD_NOT_CALENDAR_YEAR: 'E_REFERENCE_PERIOD_NOT_CALENDAR_YEAR',
  /** A row's sex value is not covered by the declared `sexMapping`; counted in `excludedN`. */
  SEX_UNMAPPED: 'W_SEX_UNMAPPED',
  /** A category contains workers of one sex only, so the gap has no denominator. */
  CATEGORY_ALL_ONE_SEX: 'W_CATEGORY_ALL_ONE_SEX',
  /**
   * Both the male and the female figure are zero, so the difference is zero and the
   * percentage expression is degenerate. The metric reports `0`, not `null` — "there is
   * no difference between them" is a true answer, and a null would claim otherwise.
   */
  COMPONENTS_ALL_ZERO: 'W_COMPONENTS_ALL_ZERO',
  /** Withheld because publishing it would disclose an identifiable worker's pay. */
  GROUP_SUPPRESSED: 'W_GROUP_SUPPRESSED',
  /** Computable but too small to be statistically reliable. */
  GROUP_UNRELIABLE: 'W_GROUP_UNRELIABLE',
} as const;

export type EngineCode = (typeof ENGINE_CODES)[keyof typeof ENGINE_CODES];

// ---------------------------------------------------------------------------
// EngineReport
// ---------------------------------------------------------------------------

/**
 * The frozen contract. Module D, the national adapters and the published npm package
 * all consume this, so a change touches every consumer — which is why
 * `docs/ENGINE-REPORT.md` carries an amendment path rather than a prohibition.
 */
export interface EngineReport {
  engineVersion: string;
  /** The Cellar ETag the citations were verified against, e.g. `"Con-20231213063525000"`. */
  directiveTextVersion: string;
  /** D-14: the conventions actually used, always echoed back. */
  conventions: Conventions;
  /** D-14: where each of those values came from. */
  conventionSource: ConventionSource;
  metrics: Metrics;
  art10Flags: Art10Flag[];
  publishable: PublishableSets;
  /**
   * Art. 9(6): accuracy is confirmed by the employer's management after consulting
   * workers' representatives. Nothing this package produces is a filing, so the literal
   * `true` is part of the type rather than a boolean a caller could flip.
   */
  draft: true;
  warnings: EngineWarning[];
}
