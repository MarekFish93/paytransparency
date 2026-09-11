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
import type { DirectiveArticle, DirectiveQuotation, Fact, Source } from './schema.ts';
import { elapsedDays, freshnessOf, type Freshness } from './freshness.ts';

export type Provenance = 'national' | 'directive_default' | 'directive_fallback' | 'unknown';

/**
 * The per-field Directive fallback citation keys, enumerable in ONE place so plan 01-05's
 * referential pass has somewhere to look rather than having to scrape this module.
 *
 * These are PARAGRAPH-level keys — `<CELEX>#<article>.<paragraph>`, the publisher's own
 * ids and language-invariant. The corpus plan 01-03 wrote is keyed one level coarser, by
 * ARTICLE and language (`<CELEX>#<article>@<lang3>`), because an article is what is
 * retrieved and verified in a single fetch. `directiveArticleKey` below is the mapping
 * between the two, and `resolve()` selects the paragraph inside the article it finds.
 *
 * The key shape here is deliberately unchanged by that: what a letter cites is a
 * paragraph, and a field's declaration should name the provision it means, not the unit
 * the retrieval happened to use.
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

/**
 * `data/_directive.json`, parsed: `<CELEX>#<article>@<lang3>` → the whole cited article
 * in that language, as a `Fact` carrying its own Cellar source and verification date.
 *
 * Keyed by ARTICLE, not by paragraph: one fetch retrieves and verifies one article, so
 * one article is the unit that can honestly carry a provenance. A paragraph's provenance
 * IS its article's — see the fallback branch of `resolve()`.
 */
export type DirectiveCorpus = Record<string, Fact<DirectiveArticle>>;

/**
 * The language a fallback is quoted in when the caller does not say.
 *
 * Named and exported rather than buried in the lookup, because "which language did that
 * citation come from" is a provenance question a caller must be able to answer. The
 * corpus carries eleven authentic language versions; serving one under another's name
 * would be the same class of error as citing the wrong article.
 */
export const DEFAULT_DIRECTIVE_LANGUAGE = 'eng';

/** `32023L0970#007.004` → `32023L0970`, `007`, `007.004`, 4. Null if not that shape. */
function parseParagraphKey(citationKey: string): {
  celex: string;
  articleId: string;
  paragraphId: string;
  paragraphNumber: number;
} | null {
  const match = /^(3\d{4}[A-Z]\d{4})#((\d{3})\.(\d{3}))$/.exec(citationKey);
  if (match === null) return null;
  return {
    celex: match[1] as string,
    articleId: match[3] as string,
    paragraphId: match[2] as string,
    paragraphNumber: Number(match[4]),
  };
}

/**
 * The corpus key holding the article a paragraph-level citation lives in.
 *
 * `32023L0970#007.004` + `eng` → `32023L0970#007@eng`. The same shape
 * `scripts/fetch-directive.ts#corpusKey` writes; both are pinned against the committed
 * corpus by their own tests, so the two cannot drift apart unnoticed.
 *
 * Returns null for anything that is not a bare paragraph key — a lettered sub-point such
 * as `32023L0970#003.001(h)` included, since a sub-point is not a quotable unit here.
 */
export function directiveArticleKey(citationKey: string, language: string): string | null {
  const parts = parseParagraphKey(citationKey);
  if (parts === null) return null;
  return `${parts.celex}#${parts.articleId}@${language}`;
}


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
  /**
   * ISO-639-3, as the corpus keys it (`eng`, `pol`, `slk`, …). Which authentic language
   * version a Directive fallback is quoted from; defaults to `DEFAULT_DIRECTIVE_LANGUAGE`.
   *
   * A language the corpus does not hold throws rather than falling back to English: a
   * Polish page showing English text, or the reverse, is a provenance failure, not a
   * cosmetic one. It has no effect on a `national` or `directive_default` resolution,
   * which quote no Directive text.
   */
  language?: string;
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const isRecordLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * A corpus entry written to the article-keyed shape plan 01-03 established, rather than
 * the single paragraph-shaped fact plan 01-01 seeded. `DirectiveFile` still parses both,
 * so a hand-edited file can hold the old shape; this guard is what turns that into the
 * loud failure below instead of a silent `undefined` in a rendered citation.
 */
const isDirectiveArticle = (value: unknown): value is DirectiveArticle =>
  isRecordLike(value) && isRecordLike(value['paragraphs']) && typeof value['article'] === 'number';

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

  constructor(citationKey: string, field: string | null, detail?: string) {
    super(
      `Directive citation key ${citationKey} is not in the corpus${
        field === null ? '' : ` (resolving ${field})`
      } — ${detail ?? 'data/_directive.json must hold it before this field can render'}`,
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
 * Look one PARAGRAPH-level citation key up in the ARTICLE-keyed corpus.
 *
 * Two steps, both of which must succeed loudly or not at all:
 *   1. `32023L0970#007.004` + `eng` → the corpus entry `32023L0970#007@eng`;
 *   2. that article's `paragraphs['007.004']` — the quoted unit.
 *
 * The returned `value` is the paragraph, projected onto `DirectiveQuotation`, which is
 * the shape every renderer is already written against. `entry` travels with it because
 * the provenance a caller must report is the article fact's, not the paragraph's.
 */
function quoteParagraph(
  key: string,
  corpus: DirectiveCorpus,
  field: string | null,
  language: string,
): { value: DirectiveQuotation; entry: Fact<DirectiveArticle> } {
  const parts = parseParagraphKey(key);
  const articleKey = directiveArticleKey(key, language);
  if (parts === null || articleKey === null) {
    throw new MissingDirectiveCitation(
      key,
      field,
      'it is not a paragraph-level citation key of the form <CELEX>#<article>.<paragraph>, so no corpus entry can hold it',
    );
  }

  const entry = corpus[articleKey];
  if (entry === undefined) {
    throw new MissingDirectiveCitation(
      key,
      field,
      `data/_directive.json holds no entry ${articleKey} — the corpus has no article ${Number(
        parts.articleId,
      )} in language "${language}", and English is NOT served in its place`,
    );
  }
  if (!isDirectiveArticle(entry.value)) {
    throw new MissingDirectiveCitation(
      key,
      field,
      `data/_directive.json entry ${articleKey} is not article-shaped, so its paragraphs cannot be indexed`,
    );
  }

  const paragraph = entry.value.paragraphs[parts.paragraphId];
  if (paragraph === undefined) {
    throw new MissingDirectiveCitation(
      key,
      field,
      `data/_directive.json entry ${articleKey} holds no paragraph ${parts.paragraphId} — it has ${
        Object.keys(entry.value.paragraphs).join(', ') || '(none)'
      }`,
    );
  }

  // The key the data carries must be the key that was asked for. They are derived
  // independently — one from the fallback table, one from the extraction — so a
  // disagreement means the corpus would have us cite a provision we never looked up.
  if (paragraph.citation_key !== key) {
    throw new MissingDirectiveCitation(
      key,
      field,
      `data/_directive.json entry ${articleKey} stores paragraph ${parts.paragraphId} under the citation key ${paragraph.citation_key} — the corpus and the fallback table disagree about which provision this is`,
    );
  }

  return {
    value: {
      text: paragraph.raw_text,
      citation_key: paragraph.citation_key,
      article: entry.value.article,
      paragraph: parts.paragraphNumber,
    },
    entry,
  };
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
  const language = options.language ?? DEFAULT_DIRECTIVE_LANGUAGE;

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
    const quotation = quoteParagraph(key, corpus, field ?? null, language);
    const entry = quotation.entry;
    return {
      // THE PARAGRAPH ALONE, never the article it sits in. A letter that asked for the
      // two-month deadline and got the whole of Article 7 is the silent-correctness
      // failure this module exists to prevent, and it would look like a success.
      value: quotation.value,
      provenance: 'directive_fallback',
      deviates: false,
      // The fallback's provenance IS the Directive's provenance: the Cellar source and
      // the date that text was last confirmed, not the country record's. It stays
      // ARTICLE-level because the article is what was retrieved and verified in one
      // fetch — there is no separate paragraph-level provenance to report, and
      // inventing one would be a claim nobody made.
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
