/**
 * D-13's second half: a golden vector is proved by a hand computation and then
 * independently re-derived by a pass that has not seen the first answer.
 *
 * Two properties are asserted here and they must never be conflated:
 *
 *  - the COMPARISON is correct — a null and a zero disagree, a flag difference alone is
 *    a disagreement, and a difference in the `working` prose is not. A comparison that
 *    softened any of these into an approximate match would report agreement where the
 *    two passes actually said different things.
 *  - the COMPARISON COMPUTES NOTHING. It reads two authored files. If it recomputed a
 *    metric from `input.json` it would be validating the vectors against an
 *    implementation that shares their assumptions, which is threat T-1-30 and the exact
 *    circularity the whole exercise exists to avoid.
 *
 * It also closes the engine-to-data link: every `definitionCite` in the report type and
 * in all twenty answer files is looked up in the stored Directive corpus and must be
 * found. Plan 06 could only assert the key SHAPE, because it ran in the same wave as the
 * corpus pull and the corpus held a single entry at its start.
 *
 * The whole suite is offline and reads only files in this repository.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CITATION_KEY_PATTERN, METRIC_DEFINITIONS, METRIC_KEYS } from '../src/types.ts';
import {
  ANSWER_FILES,
  collectCitations,
  compareVectors,
  corpusKeyFor,
  listVectors,
  readAnswers,
  type VectorVerdict,
} from '../scripts/rederive.ts';

const RE_DERIVE_SRC = fileURLToPath(new URL('../scripts/rederive.ts', import.meta.url));
const CORPUS = fileURLToPath(new URL('../../country-data/data/_directive.json', import.meta.url));

/** A minimal pair of answer files, so a comparison rule can be exercised in isolation. */
function pair(
  first: Record<string, unknown>,
  second: Record<string, unknown>,
): { expected: Record<string, unknown>; rederived: Record<string, unknown> } {
  const base = {
    a: { value: 10, definitionCite: '32023L0970#003.001', populationN: 4, excludedN: 0, suppressed: false, unreliable: false },
  };
  return {
    expected: { vector: 'vXX', metrics: { ...base, ...first }, art10Flags: [], warnings: [], working: { note: 'first pass' } },
    rederived: { vector: 'vXX', metrics: { ...base, ...second }, art10Flags: [], warnings: [], working: { note: 'second pass' }, ambiguities: [] },
  };
}

const metric = (over: Record<string, unknown> = {}) => ({
  value: 5,
  definitionCite: '32023L0970#003.001',
  populationN: 4,
  excludedN: 0,
  suppressed: false,
  unreliable: false,
  ...over,
});

describe('compareVectors — the comparison rules that carry meaning', () => {
  it('reports a verdict per metric position and an aggregate that disagrees when any single position differs', () => {
    const { expected, rederived } = pair({ b: metric({ value: 5 }) }, { b: metric({ value: 6 }) });
    const verdict: VectorVerdict = compareVectors('vXX', expected, rederived);

    expect(verdict.agrees).toBe(false);
    expect(verdict.positions.map((p) => p.position).sort()).toEqual(['a', 'b']);
    expect(verdict.positions.find((p) => p.position === 'a')?.agrees).toBe(true);
    expect(verdict.positions.find((p) => p.position === 'b')?.agrees).toBe(false);
  });

  it('treats a null in one pass and a zero in the other as a DISAGREEMENT, never an approximate match', () => {
    const { expected, rederived } = pair({ b: metric({ value: null }) }, { b: metric({ value: 0 }) });
    const verdict = compareVectors('vXX', expected, rederived);

    expect(verdict.agrees).toBe(false);
    const b = verdict.positions.find((p) => p.position === 'b');
    expect(b?.agrees).toBe(false);
    expect(b?.differences).toContain('value');
  });

  it('treats a present value and an absent one as a disagreement', () => {
    const { expected, rederived } = pair({ b: metric({ value: 5 }) }, {});
    const verdict = compareVectors('vXX', expected, rederived);

    expect(verdict.agrees).toBe(false);
    expect(verdict.positions.find((p) => p.position === 'b')?.agrees).toBe(false);
  });

  it('treats a difference in the privacy-suppression flag ALONE as a disagreement, even when the values match', () => {
    const { expected, rederived } = pair(
      { b: metric({ value: 5, suppressed: true }) },
      { b: metric({ value: 5, suppressed: false }) },
    );
    const verdict = compareVectors('vXX', expected, rederived);

    expect(verdict.agrees).toBe(false);
    const b = verdict.positions.find((p) => p.position === 'b');
    expect(b?.differences).toContain('suppressed');
    expect(b?.differences).not.toContain('unreliable');
  });

  it('compares the statistical-reliability flag separately from the suppression flag', () => {
    const { expected, rederived } = pair(
      { b: metric({ value: 5, unreliable: true }) },
      { b: metric({ value: 5, unreliable: false }) },
    );
    const verdict = compareVectors('vXX', expected, rederived);

    expect(verdict.agrees).toBe(false);
    const b = verdict.positions.find((p) => p.position === 'b');
    expect(b?.differences).toContain('unreliable');
    expect(b?.differences).not.toContain('suppressed');
  });

  it('treats a difference in excludedN as a disagreement — a silently dropped worker is what v10 exists to catch', () => {
    const { expected, rederived } = pair({ b: metric({ excludedN: 1 }) }, { b: metric({ excludedN: 0 }) });
    const verdict = compareVectors('vXX', expected, rederived);

    expect(verdict.agrees).toBe(false);
    expect(verdict.positions.find((p) => p.position === 'b')?.differences).toContain('excludedN');
  });

  it('does NOT treat a difference in the working prose as a disagreement — two hand computations may explain themselves differently', () => {
    const { expected, rederived } = pair({}, {});
    expected.working = { narrative: 'the first pass explains itself one way' };
    rederived.working = { entirelyDifferent: ['shape', 'and', 'wording'] };

    const verdict = compareVectors('vXX', expected, rederived);
    expect(verdict.agrees).toBe(true);
    expect(JSON.stringify(verdict)).not.toContain('entirelyDifferent');
  });

  it('surfaces a non-empty ambiguities array even when the two passes agree, because an ambiguity that agreed by luck is still an ambiguity', () => {
    const { expected, rederived } = pair({}, {});
    rederived.ambiguities = [{ conventionKey: 'medianRule', issue: 'two readings', chosen: 'one of them' }];

    const verdict = compareVectors('vXX', expected, rederived);
    expect(verdict.agrees).toBe(true);
    expect(verdict.ambiguities).toHaveLength(1);
    expect(verdict.ambiguities[0]?.conventionKey).toBe('medianRule');
  });

  it('compares art10Flags, so a category flagged by one pass and not the other is a disagreement', () => {
    const { expected, rederived } = pair({}, {});
    expected.art10Flags = [{ category: 'Research', gapPct: -25, threshold: 5 }];
    rederived.art10Flags = [];

    const verdict = compareVectors('vXX', expected, rederived);
    expect(verdict.agrees).toBe(false);
    expect(verdict.differences).toContain('art10Flags');
  });

  it('compares the warning CODES, so a missing warning is a disagreement', () => {
    const { expected, rederived } = pair({}, {});
    expected.warnings = [{ code: 'W_SEX_UNMAPPED', detail: 'one phrasing' }];
    rederived.warnings = [{ code: 'W_SEX_UNMAPPED', detail: 'an entirely different phrasing' }];

    expect(compareVectors('vXX', expected, rederived).agrees).toBe(true);

    rederived.warnings = [];
    const verdict = compareVectors('vXX', expected, rederived);
    expect(verdict.agrees).toBe(false);
    expect(verdict.differences).toContain('warnings');
  });
});

describe('the comparison tool computes nothing', () => {
  const source = readFileSync(RE_DERIVE_SRC, 'utf8');

  it('never reads input.json — it compares two authored answer files and nothing else', () => {
    expect(source).not.toContain('input.json');
    expect(ANSWER_FILES).toEqual(['expected.json', 'rederived.json']);
  });

  it('performs no arithmetic over worker rows — no division, and no summing or averaging helper', () => {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    expect(code).not.toContain('/ 4');
    expect(code).not.toMatch(/\breduce\(/);
    expect(code).not.toMatch(/\bMath\.(round|abs|floor|ceil)\b/);
    expect(code).not.toMatch(/\b(mean|median|quartile|gapPctOf|computeMetric)\b/i);
  });
});

describe('the end state — all ten vectors carry two independently produced passes that agree', () => {
  const vectors = listVectors();

  it('finds exactly the ten vectors, each with BOTH answer files present', () => {
    expect(vectors).toHaveLength(10);
    for (const v of vectors) {
      const answers = readAnswers(v);
      expect(answers.expected, `${v} is missing expected.json`).toBeTypeOf('object');
      expect(answers.rederived, `${v} is missing rederived.json`).toBeTypeOf('object');
    }
  });

  /**
   * `compareVectors` only enumerates positions that at least one pass answered, so a
   * position BOTH passes omitted would agree vacuously. That completeness requirement
   * belongs here, on the real vectors, rather than inside the differ.
   */
  it('answers all seven Art. 9(1) metric positions in both passes of every vector', () => {
    const offenders = vectors.flatMap((v) => {
      const answers = readAnswers(v);
      return ANSWER_FILES.map((file, i) => {
        const pass = i === 0 ? answers.expected : answers.rederived;
        const metrics = (pass as { metrics?: Record<string, unknown> })?.metrics ?? {};
        const missing = METRIC_KEYS.filter((k) => metrics[k] === undefined);
        return missing.length ? { vector: v, file, missing } : null;
      }).filter((x) => x !== null);
    });

    expect(offenders).toEqual([]);
  });

  it('agrees on every metric position of every vector — this is what makes the vectors an executable specification', () => {
    const disagreeing = vectors
      .map((v) => {
        const { expected, rederived } = readAnswers(v);
        const verdict = compareVectors(v, expected, rederived);
        return verdict.agrees
          ? null
          : {
              vector: v,
              differences: verdict.differences,
              positions: verdict.positions.filter((p) => !p.agrees).map((p) => ({ position: p.position, differences: p.differences })),
            };
      })
      .filter((x) => x !== null);

    expect(disagreeing).toEqual([]);
  });

  it('records, on every vector whose reading was settled by this plan, a note naming the convention and what the wording now says', () => {
    const offenders = vectors
      .map((v) => {
        const { rederived } = readAnswers(v);
        const resolutions = (rederived as { resolutions?: unknown }).resolutions;
        if (!Array.isArray(resolutions) || resolutions.length === 0) return { vector: v, reason: 'no resolutions recorded' };
        const malformed = resolutions.filter(
          (r) => typeof r !== 'object' || r === null || !('conventionKey' in r) || !('nowReads' in r),
        );
        return malformed.length ? { vector: v, reason: 'a resolution names no convention key or no new wording' } : null;
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
  });
});

describe('every definitionCite resolves against the stored Directive corpus', () => {
  const corpus = JSON.parse(readFileSync(CORPUS, 'utf8')) as Record<
    string,
    { value?: { paragraphs?: Record<string, unknown> } }
  >;

  /**
   * A citation resolves when the corpus holds the ARTICLE entry it names AND that entry
   * carries the PARAGRAPH it names. Checking only the article would let
   * `32023L0970#003.999` pass, which is precisely the drift this assertion exists to stop.
   */
  function resolves(cite: string): boolean {
    const paragraphId = cite.slice(cite.indexOf('#') + 1);
    const entry = corpus[corpusKeyFor(cite)];
    return entry?.value?.paragraphs?.[paragraphId] !== undefined;
  }

  it('collects every citation from the report type and from all twenty answer files', () => {
    const citations = collectCitations();
    expect(citations.length).toBeGreaterThan(0);
    for (const { cite } of citations) expect(cite).toMatch(CITATION_KEY_PATTERN);
    for (const key of METRIC_KEYS) {
      expect(citations.some((c) => c.cite === METRIC_DEFINITIONS[key].definitionCite)).toBe(true);
    }
    expect(citations.some((c) => c.source.includes('rederived.json'))).toBe(true);
    expect(citations.some((c) => c.source.includes('expected.json'))).toBe(true);
  });

  it('resolves every one of them to a paragraph the corpus actually holds', () => {
    const unresolved = collectCitations()
      .filter(({ cite }) => !resolves(cite))
      .map(({ cite, source }) => ({ cite, source }));

    expect(unresolved).toEqual([]);
  });

  it('fails an altered key, naming BOTH the key and the file it came from', () => {
    const altered = { cite: '32023L0970#003.999', source: 'packages/directive-engine/vectors/vXX/rederived.json' };
    expect(resolves(altered.cite)).toBe(false);
    expect(altered.source).toContain('rederived.json');
    expect(corpusKeyFor(altered.cite)).toBe('32023L0970#003@eng');
  });
});
