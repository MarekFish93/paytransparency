/**
 * `resolve()` — RED SKELETON.
 *
 * The precedence ladder, the corpus lookup and the computed `deviates` flag are written
 * failing in `test/resolve.test.ts` first. This file exists so those tests fail on their
 * own assertions rather than on a module-resolution error.
 */
import type { DirectiveQuotation, Fact, Source } from './schema.ts';
import type { Freshness } from './freshness.ts';

/**
 * Four members, because "we checked and national law adds nothing", "we are deliberately
 * citing the Directive instead" and "we have not checked" are three different claims.
 */
export type Provenance = 'national' | 'directive_default' | 'directive_fallback' | 'unknown';

/**
 * The per-field Directive fallback citation keys, enumerable in one place so plan 01-05's
 * referential pass never has to scrape this module. Authoring a key is a declaration of
 * intent, NOT a claim that the corpus already holds it — plan 01-03 fills the corpus in
 * this plan's own wave.
 */
export const DIRECTIVE_FALLBACK_KEYS = {
  'article_7.legal_basis': '32023L0970#007.001',
  'article_7.response_deadline': '32023L0970#007.004',
  'article_7.employer_reminder_duty': '32023L0970#007.003',
  'article_7_2': '32023L0970#007.002',
} as const;

export type DirectiveFallbackField = keyof typeof DIRECTIVE_FALLBACK_KEYS;

export type DirectiveCorpus = Record<string, Fact<DirectiveQuotation>>;

export type ResolvedFact<T> = {
  value: T | DirectiveQuotation | null;
  provenance: Provenance;
  deviates: boolean;
  sources: Source[];
  verifiedAt: string | null;
  ageDays: number | null;
  freshness: Freshness;
  label: string;
};

export type ResolveOptions = {
  field?: DirectiveFallbackField;
  today?: string;
};

/** RED skeleton — always reports unknown. */
export function resolve<T>(
  _fact: Fact<T>,
  _corpus: DirectiveCorpus,
  _options: ResolveOptions = {},
): ResolvedFact<T> {
  return {
    value: null,
    provenance: 'unknown',
    deviates: false,
    sources: [],
    verifiedAt: null,
    ageDays: null,
    freshness: 'stale',
    label: '',
  };
}
