/**
 * Whole-article extraction from the Cellar ELI-structured XHTML.
 *
 * This generalises plan 01-01's single-paragraph extractor to D-04's shape: the cited
 * article stored IN FULL, with every addressable unit tagged by the publisher's own id.
 * Quotations without retrievable context are what produced the four inherited citation
 * errors, so the context travels with the quotation.
 *
 * Three rules govern everything below, and each exists because breaking it produced a
 * silent wrong answer rather than a loud failure:
 *
 *   1. SCOPE FIRST, ALWAYS. Locate the `art_N` subtree before reading any content. The
 *      operative phrases of this Directive also occur in its recitals tens of thousands
 *      of characters earlier, and recital (25) refers to "Article 10 TFEU" — an article
 *      of a different instrument entirely. A string search cannot tell them apart; a
 *      structural id can, and that is the only thing that can.
 *   2. NEVER LOCATE BY WORDING. Not by article title, not by operative phrase. The
 *      authentic document separates "Article" from its number with U+00A0, so the
 *      obvious hand-typed anchor matches zero times in a perfect document.
 *   3. STORE RAW. `normaliseForMatch` exists for COMPARISON and is imported, never
 *      re-implemented. Normalising on the way into storage would silently rewrite the
 *      Official Journal — U+00A0 between a paragraph number and its first word and
 *      U+2019 in "workers’ pay" are authentic OJ typography, not noise.
 */
import { SourceDefect, scopeToElement, scopeToSubdivision, textOf } from './verifier.ts';

export const CELEX = '32023L0970';

/** Matches the publisher's paragraph ids: three digits, a dot, three digits. */
const PARAGRAPH_ID = /<div id="(\d{3}\.\d{3})"/g;

/**
 * A lettered sub-point inside a paragraph, e.g. Art. 3(1)(h) 'category of workers'.
 *
 * The Cellar XHTML gives these no `id` of their own: each is a `<table>` whose first
 * cell holds the publisher's own label — `(a)`, `(b)` … — and whose second cell holds
 * the text. The label is therefore still the DOCUMENT's, not ours; we read it out of
 * the markup rather than counting siblings, so a document that skips a letter cannot
 * silently shift every subsequent key by one.
 */
export type ExtractedSubPoint = {
  /** The publisher's own label, without brackets: `h`. */
  label: string;
  /** `32023L0970#003.001(h)`. */
  citationKey: string;
  rawHtml: string;
  rawText: string;
};

export type ExtractedParagraph = {
  /** The publisher's own id: `007.004`. */
  id: string;
  /** `32023L0970#007.004`. Language-invariant. */
  citationKey: string;
  article: number;
  paragraph: number;
  rawHtml: string;
  /** RAW: U+00A0 and U+2019 preserved exactly as published. */
  rawText: string;
  /** Keyed by the publisher's own letter. Empty for a paragraph with no sub-points. */
  subPoints: Record<string, ExtractedSubPoint>;
};

export type ExtractedArticle = {
  /** `art_7`. */
  articleId: string;
  article: number;
  /**
   * The text of `art_N.tit_1`. This is also what the verifier asserts to confirm WHICH
   * LANGUAGE a response is in: the Cellar 200 carries an empty `Content-Language`
   * header, so nothing else in the response identifies the language.
   */
  titleText: string;
  rawHtml: string;
  /** The whole article, RAW. */
  rawText: string;
  /** Ordered by document position — insertion order is the contract. */
  paragraphs: Record<string, ExtractedParagraph>;
};

/**
 * `32023L0970#007.004`, or `32023L0970#003.001(h)` for a lettered sub-point.
 *
 * There is deliberately NO language parameter. The publisher's ids are byte-identical
 * across every language version — research confirmed `art_7` → `007.001 … 007.006` in
 * the Polish expression as well as the English — so a Polish letter and an English page
 * cite the same provision with no mapping table between them. Introducing a
 * language-specific key here would create exactly the translation layer the structural
 * ids exist to make unnecessary.
 */
export function citationKey(article: number, paragraph: number, subPoint?: string): string {
  const id = `${String(article).padStart(3, '0')}.${String(paragraph).padStart(3, '0')}`;
  return subPoint === undefined ? `${CELEX}#${id}` : `${CELEX}#${id}(${subPoint})`;
}

/**
 * The paragraph ids inside a scoped article subtree, in DOCUMENT order.
 *
 * Document order, not sorted order: sorting would agree with the document for a
 * well-behaved article and quietly disagree for one that is not, which is the kind of
 * difference that only shows up in a citation dispute.
 */
export function listParagraphIds(scopeHtml: string): string[] {
  const ids: string[] = [];
  // A fresh regex per call: a module-level /g regex carries `lastIndex` between calls,
  // so the second call on the same input would start mid-string and return a different
  // answer. The plan's stability case exists precisely to catch that.
  const re = new RegExp(PARAGRAPH_ID.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(scopeHtml)) !== null) {
    const id = match[1];
    if (id !== undefined) ids.push(id);
  }
  return ids;
}

/**
 * Collapse only ASCII whitespace runs, and trim only ASCII whitespace.
 *
 * JavaScript's `\s` MATCHES U+00A0. The obvious `.replace(/\s+/g, ' ').trim()` therefore
 * destroys the authentic no-break separators that this corpus exists to preserve — a
 * silent-correctness failure that reports green. Every character class below is spelled
 * out so the omission of U+00A0 is visible rather than inferred.
 */
const flattenAsciiWhitespace = (s: string): string =>
  s.replace(/[ \t\r]*\n[ \t\r]*/g, ' ').replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');

const rawTextOf = (html: string): string => flattenAsciiWhitespace(textOf(html));

/**
 * Drop a trailing partial tag left by a slice that stopped inside the next element.
 *
 * `scopeToSubdivision` ends at the next `class="eli-subdivision"` ATTRIBUTE, which is a
 * few characters past that element's opening `<`. The dangling `<div` survives the tag
 * stripper (it has no closing `>`) and would otherwise be stored as though it were
 * Official Journal text — the same class of defect as slicing from the `id="…"`
 * attribute instead of the opening bracket.
 */
const dropDanglingTag = (html: string): string => {
  const lastOpen = html.lastIndexOf('<');
  if (lastOpen < 0) return html;
  if (html.indexOf('>', lastOpen) >= 0) return html;
  return html.slice(0, lastOpen);
};

/** `(a)` … `(m)`: the publisher's own sub-point label cell. */
const SUBPOINT_LABEL = /<p class="oj-normal">\(([a-z]+)\)<\/p>/g;

/**
 * Split a paragraph's lettered sub-points into addressable units.
 *
 * Each sub-point is a sibling `<table>`; the unit runs from the `<table>` that opens the
 * labelled row to the start of the next such table, or to the end of the paragraph for
 * the last one. Splitting on the label's own markup means the boundaries come from the
 * document rather than from an assumption about its layout.
 */
function extractSubPoints(
  paragraphHtml: string,
  article: number,
  paragraph: number,
): Record<string, ExtractedSubPoint> {
  const re = new RegExp(SUBPOINT_LABEL.source, 'g');
  const hits: { label: string; tableStart: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(paragraphHtml)) !== null) {
    const label = match[1];
    if (label === undefined) continue;
    // Back up to the `<table>` that opens this labelled row. Without it the slice would
    // begin mid-markup and the label cell would land inside the stored text.
    const tableStart = paragraphHtml.lastIndexOf('<table', match.index);
    hits.push({ label, tableStart: tableStart < 0 ? match.index : tableStart });
  }

  const subPoints: Record<string, ExtractedSubPoint> = {};
  hits.forEach((hit, i) => {
    const next = hits[i + 1];
    const rawHtml = paragraphHtml.slice(hit.tableStart, next === undefined ? undefined : next.tableStart);
    // Strip the leading `(h)` label cell from the stored text: the label is carried in
    // its own field and in the citation key, and repeating it inside the quotation
    // would make a verbatim comparison against the OJ sentence fail.
    const withoutLabel = rawHtml.replace(new RegExp(`<p class="oj-normal">\\(${hit.label}\\)</p>`), '');
    subPoints[hit.label] = {
      label: hit.label,
      citationKey: citationKey(article, paragraph, hit.label),
      rawHtml,
      rawText: rawTextOf(withoutLabel),
    };
  });
  return subPoints;
}

/**
 * Extract one article in full, with every paragraph and sub-point tagged by its own id.
 *
 * Throws `SourceDefect` naming the missing id when the article is absent. It NEVER
 * returns an empty result: an article stored with empty text is a citation that looks
 * verified and says nothing, which is worse than a loud failure.
 */
export function extractArticle(xhtml: string, articleNumber: number): ExtractedArticle {
  const articleId = `art_${articleNumber}`;

  const scoped = scopeToSubdivision(xhtml, articleId);
  if (scoped === null) {
    throw new SourceDefect(`article container id="${articleId}" absent from the document`);
  }
  const rawHtml = dropDanglingTag(scoped);

  const titleHtml = scopeToElement(rawHtml, `${articleId}.tit_1`);
  if (titleHtml === null) {
    throw new SourceDefect(
      `id="${articleId}.tit_1" absent from inside id="${articleId}" — without the subtitle there is nothing to confirm which language this expression is in`,
    );
  }
  const titleText = rawTextOf(titleHtml);

  const ids = listParagraphIds(rawHtml);
  const paragraphs: Record<string, ExtractedParagraph> = {};

  ids.forEach((id, i) => {
    const attr = rawHtml.indexOf(`<div id="${id}"`);
    const nextId = ids[i + 1];
    const end = nextId === undefined ? rawHtml.length : rawHtml.indexOf(`<div id="${nextId}"`);
    const paragraphHtml = rawHtml.slice(attr, end < 0 ? undefined : end);

    const [articlePart, paragraphPart] = id.split('.');
    const article = Number(articlePart);
    const paragraph = Number(paragraphPart);

    paragraphs[id] = {
      id,
      citationKey: citationKey(article, paragraph),
      article,
      paragraph,
      rawHtml: paragraphHtml,
      rawText: rawTextOf(paragraphHtml),
      subPoints: extractSubPoints(paragraphHtml, article, paragraph),
    };
  });

  const rawText = rawTextOf(rawHtml);
  if (rawText.length === 0) {
    throw new SourceDefect(
      `id="${articleId}" is present but its text is empty — refusing to store an empty quotation`,
    );
  }

  return { articleId, article: articleNumber, titleText, rawHtml, rawText, paragraphs };
}

/**
 * One paragraph, by its own id.
 *
 * A thin wrapper over `extractArticle` so there is exactly ONE scoping implementation in
 * this package. Two copies of a scoping rule drift, and the drifted copy is the one that
 * silently stores a recital.
 */
export function extractParagraph(
  xhtml: string,
  article: number,
  para: number,
): { citationKey: string; html: string; text: string; article: number; paragraph: number } {
  const paraId = `${String(article).padStart(3, '0')}.${String(para).padStart(3, '0')}`;
  const extracted = extractArticle(xhtml, article).paragraphs[paraId];
  if (extracted === undefined) {
    throw new SourceDefect(
      `paragraph id="${paraId}" absent from inside id="art_${article}" — the article is present but the cited paragraph is not`,
    );
  }
  return {
    citationKey: extracted.citationKey,
    html: extracted.rawHtml,
    text: extracted.rawText,
    article: extracted.article,
    paragraph: extracted.paragraph,
  };
}
