/**
 * `resolve()` — the single place "two months unless national law verifiably says
 * otherwise" is decided.
 *
 * Every renderer calls this. Nothing in the UI reads `fact.value` directly, because a
 * renderer that did would have to re-decide the precedence question for itself, and the
 * twenty-eighth renderer would get it wrong.
 *
 * `Provenance` has four members rather than three, because "we checked and national law
 * adds nothing", "we are deliberately citing the Directive instead" (D-07) and "we have
 * not checked" are three different claims and the page must be able to say which.
 */
import type { DirectiveQuotation, Fact, Source } from './schema.ts';
import { elapsedDays, freshnessOf, type Freshness } from './freshness.ts';

export type Provenance = 'national' | 'directive_default' | 'directive_fallback' | 'unknown';

/**
 * The per-field Directive fallback citation keys, enumerable in ONE place so plan 01-05's
 * referential pass has somewhere to look rather than having to scrape this module.
 *
 * Authoring a key is a declaration of intent, not a claim that the corpus already holds
 * it: plan 01-03 fills `data/_directive.json` in this plan's own wave, and only
 * `32023L0970#007.004` — Art. 7(4), the two-month backstop — is present from wave 1 and
 * exercised by this plan's tests.
 *
 * Fields absent from this table are absent deliberately. `article_12_3` has no Directive
 * default: the Article says the option EXISTS, not that a given state took it, so a state
 * that has not been checked is `unknown`, never "the option was not taken".
 * `enforcement.equality_body` is the same shape of gap — Art. 3(1)(l) defines what an
 * equality body is, not which body a state designated under Art. 20 of Directive
 * 2006/54/EC.
 */
export const DIRECTIVE_FALLBACK_KEYS = {
  /** Art. 7(1) — the right to request and receive pay information in writing. */
  'article_7.legal_basis': '32023L0970#007.001',
  /** Art. 7(4) — "within a reasonable period of time but in any event within two months". */
  'article_7.response_deadline': '32023L0970#007.004',
  /** Art. 7(3) — the employer's annual duty to inform workers of the right. */
  'article_7.employer_reminder_duty': '32023L0970#007.003',
  /** Art. 7(2) — the standing right to request through a representative or equality body. */
  article_7_2: '32023L0970#007.002',
} as const;

export type DirectiveFallbackField = keyof typeof DIRECTIVE_FALLBACK_KEYS;

/** `data/_directive.json`, parsed: citation key → the Directive fact carrying its text. */
export type DirectiveCorpus = Record<string, Fact<DirectiveQuotation>>;

export type ResolvedFact<T> = {
  /**
   * The national value when `provenance` is `national` or `directive_default`; the
   * Directive quotation itself when `directive_fallback`; null when `unknown`. A
   * renderer branches on `provenance`, never on the shape of this.
   */
  value: T | DirectiveQuotation | null;
  provenance: Provenance;
  /** Computed, never authored — this is what drives the "⚠ not the Directive default" callout. */
  deviates: boolean;
  sources: Source[];
  verifiedAt: string | null;
  ageDays: number | null;
  freshness: Freshness;
  /** i18n key, NOT prose. Always non-empty, so a page can never render a blank provenance. */
  label: string;
};

export type ResolveOptions = {
  /** Which field is being resolved — selects the fallback key and the deviation rule. */
  field?: DirectiveFallbackField;
  /** `YYYY-MM-DD`. Injected so a test is not a function of the day it runs. */
  today?: string;
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const isRecordLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * What the Directive itself says, per field, so `deviates` can be computed rather than
 * hand-authored. A field with no rule here reports `deviates: false` — the honest reading
 * of "we have no Directive yardstick for this" is not "it differs".
 */
const DIRECTIVE_EQUIVALENCE: Partial<Record<DirectiveFallbackField, (value: unknown) => boolean>> =
  {
    // Art. 7(4): two months. One month, ten weeks or sixty days all deviate.
    'article_7.response_deadline': (value) =>
      isRecordLike(value) && value['amount'] === 2 && value['unit'] === 'month',
    // Art. 7(3): an annual duty. A state that informs workers less often deviates.
    'article_7.employer_reminder_duty': (value) =>
      isRecordLike(value) && value['annual'] === true,
  };

/**
 * Thrown when a Directive fallback names a citation key the corpus does not hold.
 *
 * Failing loudly here is the point: the alternative is a Phase 3 country page rendering a
 * blank where a Directive citation belongs, and a worker sending a letter that cites
 * nothing. Plan 01-05's referential pass exists to make sure this never fires in
 * production — but it must be able to fire.
 */
export class MissingDirectiveCitation extends Error {
  readonly citationKey: string;
  readonly field: string | null;

  constructor(citationKey: string, field: string | null) {
    super(
      `Directive citation key ${citationKey} is not in the corpus${
        field === null ? '' : ` (resolving ${field})`
      } — data/_directive.json must hold it before this field can render`,
    );
    this.name = 'MissingDirectiveCitation';
    this.citationKey = citationKey;
    this.field = field;
  }
}

/** The citation key a fallback resolution should use, or null when there is no default. */
function fallbackKeyFor<T>(fact: Fact<T>, field: DirectiveFallbackField | undefined): string | null {
  if (isRecordLike(fact.value)) {
    const own = fact.value['directive_citation_key'];
    if (typeof own === 'string') return own;
  }
  return field === undefined ? null : DIRECTIVE_FALLBACK_KEYS[field];
}

/**
 * Resolve one fact against the Directive corpus.
 *
 * Precedence is total and ordered:
 *   1. a verified national value,
 *   2. `directive_default` — checked, and national law adds nothing,
 *   3. `directive_fallback` — the national citation is deliberately suppressed (D-07),
 *      including a `pending_verification` fact for a field the Directive itself answers,
 *   4. `unknown`.
 *
 * A fact holding BOTH a verified national value and an available fallback resolves
 * national: the fallback exists because the national answer is missing, not beside it.
 */
export function resolve<T>(
  fact: Fact<T>,
  corpus: DirectiveCorpus,
  options: ResolveOptions = {},
): ResolvedFact<T> {
  const today = options.today ?? todayIso();
  const field = options.field;

  const own = {
    sources: fact.sources,
    verifiedAt: fact.verified_at,
    ageDays: fact.verified_at === null ? null : elapsedDays(fact.verified_at, today),
    freshness: freshnessOf(fact.verified_at, fact.volatility, today),
  };

  // 1. A verified national value wins, even when a Directive fallback is available.
  if (fact.status === 'verified' && fact.value !== null) {
    const equivalent = field === undefined ? undefined : DIRECTIVE_EQUIVALENCE[field];
    return {
      ...own,
      value: fact.value,
      provenance: 'national',
      deviates: equivalent === undefined ? false : !equivalent(fact.value),
      label: 'provenance.national',
    };
  }

  // 2. Checked, and national law adds nothing. By definition it cannot deviate.
  if (fact.status === 'directive_default') {
    return {
      ...own,
      value: fact.value,
      provenance: 'directive_default',
      deviates: false,
      label: 'provenance.directive_default',
    };
  }

  // A field that is structurally absent in this state is not a gap to fill.
  if (fact.status === 'not_applicable') {
    return {
      ...own,
      value: null,
      provenance: 'unknown',
      deviates: false,
      label: 'provenance.not_applicable',
    };
  }

  // 3. The Directive fallback (D-07), explicitly labelled — never a silent omission.
  const key = fallbackKeyFor(fact, field);
  if (key !== null) {
    const entry = corpus[key];
    if (entry === undefined) {
      throw new MissingDirectiveCitation(key, field ?? null);
    }
    return {
      value: entry.value,
      provenance: 'directive_fallback',
      deviates: false,
      // The fallback's provenance IS the Directive's provenance: the Cellar source and
      // the date that text was last confirmed, not the country record's.
      sources: entry.sources,
      verifiedAt: entry.verified_at,
      ageDays: entry.verified_at === null ? null : elapsedDays(entry.verified_at, today),
      freshness: freshnessOf(entry.verified_at, entry.volatility, today),
      label: 'provenance.directive_fallback',
    };
  }

  // 4. We have not checked. The page says so; it does not guess.
  if (fact.status === 'directive_fallback') {
    // Unreachable through the schema — a directive_fallback fact always carries a key —
    // but a hand-edited file could get here, and a blank citation must never ship.
    throw new MissingDirectiveCitation('(none recorded)', field ?? null);
  }
  return {
    ...own,
    value: null,
    provenance: 'unknown',
    deviates: false,
    label: 'provenance.unknown',
  };
}
