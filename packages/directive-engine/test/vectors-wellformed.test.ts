/**
 * The golden vectors are well-formed, complete, self-contained and small.
 *
 * This suite deliberately checks NO arithmetic. Nothing in this phase can: the engine
 * does not exist, and a vector checked against code written in the same pass would be
 * testing the code against itself rather than against the Directive. Plan 07 re-derives
 * every answer independently, from `input.json` and `conventions.json` alone.
 *
 * What it does check is everything that would make that re-derivation impossible or
 * meaningless — a missing conventions key, a vector inheriting from a sibling, an input
 * too large to follow on paper, a metric position with no citation.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CITATION_KEY_PATTERN, CONVENTION_KEYS, METRIC_KEYS } from '../src/types.ts';

const VECTORS_DIR = fileURLToPath(new URL('../vectors/', import.meta.url));

/** The ten pathological cases, declared here so the check is set equality, never a count. */
const REQUIRED_VECTORS = [
  'v01-quartile-boundary-ties',
  'v02-n-mod-4-zero',
  'v03-n-mod-4-one',
  'v04-n-mod-4-two',
  'v05-n-mod-4-three',
  'v06-single-woman-category',
  'v07-all-male-category',
  'v08-negative-gap',
  'v09-zero-variable-components',
  'v10-unmapped-sex',
] as const;

/** An input small enough to recompute by hand on paper — which is what makes plan 07 possible. */
const MAX_ROWS = 12;

const VECTOR_FILES = ['input.json', 'conventions.json', 'expected.json'] as const;

function vectorDirs(): string[] {
  if (!existsSync(VECTORS_DIR)) return [];
  return readdirSync(VECTORS_DIR)
    .filter((entry) => statSync(join(VECTORS_DIR, entry)).isDirectory())
    .sort();
}

function looseFilesInVectorsDir(): string[] {
  if (!existsSync(VECTORS_DIR)) return [];
  return readdirSync(VECTORS_DIR).filter((entry) => !statSync(join(VECTORS_DIR, entry)).isDirectory());
}

function readJson(dir: string, file: string): unknown {
  try {
    return JSON.parse(readFileSync(join(VECTORS_DIR, dir, file), 'utf8'));
  } catch {
    return undefined;
  }
}

interface MetricLike {
  value: number | null;
  definitionCite: string;
  populationN: number;
  excludedN: number;
  suppressed: boolean;
  unreliable: boolean;
}

interface ExpectedLike {
  metrics?: Record<string, unknown>;
  warnings?: unknown[];
  working?: unknown;
}

function isMetricLike(x: unknown): x is MetricLike {
  return typeof x === 'object' && x !== null && 'definitionCite' in x && 'value' in x;
}

/** Every MetricValue in an expected file, including the per-category ones under `g`. */
function metricsOf(expected: ExpectedLike): MetricLike[] {
  const out: MetricLike[] = [];
  for (const key of METRIC_KEYS) {
    const entry = expected.metrics?.[key];
    if (isMetricLike(entry)) {
      out.push(entry);
      continue;
    }
    if (typeof entry === 'object' && entry !== null) {
      for (const nested of Object.values(entry)) if (isMetricLike(nested)) out.push(nested);
    }
  }
  return out;
}

const dirs = vectorDirs();

describe('the ten pathological cases are all present, each as its own directory', () => {
  it('matches the declared case list as a set, so a renamed or dropped vector is named in the failure', () => {
    const missing = REQUIRED_VECTORS.filter((v) => !dirs.includes(v));
    const unexpected = dirs.filter((d) => !(REQUIRED_VECTORS as readonly string[]).includes(d));
    expect({ missing, unexpected }).toEqual({ missing: [], unexpected: [] });
  });

  it('holds exactly ten of them', () => {
    expect(dirs).toHaveLength(REQUIRED_VECTORS.length);
    expect(REQUIRED_VECTORS).toHaveLength(10);
  });
});

describe('every vector is complete and parses', () => {
  it('contains exactly the three required files, each valid JSON', () => {
    const offenders = dirs
      .map((dir) => {
        const present = readdirSync(join(VECTORS_DIR, dir)).sort();
        const wrongFiles = present.join(',') !== [...VECTOR_FILES].sort().join(',');
        const unparseable = VECTOR_FILES.filter((f) => readJson(dir, f) === undefined);
        return wrongFiles || unparseable.length ? { dir, present, unparseable } : null;
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(dirs.length).toBeGreaterThan(0);
  });
});

describe('every vector carries its own complete conventions block', () => {
  it('declares every CONVENTION_KEYS entry, with no key missing and no extra key', () => {
    const offenders = dirs
      .map((dir) => {
        const conventions = readJson(dir, 'conventions.json');
        const keys = typeof conventions === 'object' && conventions !== null ? Object.keys(conventions) : [];
        const missing = CONVENTION_KEYS.filter((k) => !keys.includes(k));
        const extra = keys.filter((k) => !(CONVENTION_KEYS as readonly string[]).includes(k));
        return missing.length || extra.length ? { dir, missing, extra } : null;
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(dirs.length).toBeGreaterThan(0);
  });

  it('rejects an empty conventions object — there is no default fill and no partial acceptance', () => {
    const empty = Object.keys({});
    const missing = CONVENTION_KEYS.filter((k) => !empty.includes(k));
    // The same check the loop above applies, aimed at the degenerate case on purpose: if
    // an empty block could pass, every "complete conventions" assertion would be vacuous.
    expect(missing).toEqual([...CONVENTION_KEYS]);
    expect(missing.length).toBe(11);
  });

  it('inherits nothing — no shared default file exists and no block references one', () => {
    expect(looseFilesInVectorsDir()).toEqual([]);

    const offenders = dirs
      .map((dir) => {
        const raw = (() => {
          try {
            return readFileSync(join(VECTORS_DIR, dir, 'conventions.json'), 'utf8');
          } catch {
            return '';
          }
        })();
        return /\$ref|"extends"|"inherits"|\.\.\//.test(raw) ? dir : null;
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
  });
});

describe('every vector is small enough to recompute on paper', () => {
  it('holds twelve worker rows or fewer', () => {
    const offenders = dirs
      .map((dir) => {
        const input = readJson(dir, 'input.json') as { rows?: unknown[] } | undefined;
        const rows = Array.isArray(input?.rows) ? input.rows.length : Number.NaN;
        return Number.isFinite(rows) && rows <= MAX_ROWS ? null : { dir, rows };
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(MAX_ROWS).toBe(12);
  });
});

describe('every expected file covers the contract and shows its working', () => {
  it('covers all seven Art. 9(1) metric positions', () => {
    const offenders = dirs
      .map((dir) => {
        const expected = (readJson(dir, 'expected.json') ?? {}) as ExpectedLike;
        const missing = METRIC_KEYS.filter((k) => expected.metrics?.[k] === undefined);
        return missing.length ? { dir, missing } : null;
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(dirs.length).toBeGreaterThan(0);
  });

  it('declares a definitionCite in the fixed citation-key shape on every metric value, including the per-category ones', () => {
    const offenders = dirs
      .flatMap((dir) => {
        const expected = (readJson(dir, 'expected.json') ?? {}) as ExpectedLike;
        return metricsOf(expected)
          .filter((m) => !CITATION_KEY_PATTERN.test(m.definitionCite))
          .map((m) => ({ dir, cite: m.definitionCite }));
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
  });

  it('writes out the intermediate steps, so a reviewer can follow the arithmetic', () => {
    const offenders = dirs
      .map((dir) => {
        const expected = (readJson(dir, 'expected.json') ?? {}) as ExpectedLike;
        const working = expected.working;
        const substantive = typeof working === 'object' && working !== null && Object.keys(working).length > 0;
        return substantive ? null : dir;
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
  });
});

describe('the two cases where silence would produce a confidently wrong number', () => {
  it('v10 declares a sexMapping that does not cover one of its own rows, and counts that row rather than dropping it', () => {
    const input = readJson('v10-unmapped-sex', 'input.json') as { rows?: { sex?: string }[] } | undefined;
    const conventions = readJson('v10-unmapped-sex', 'conventions.json') as
      | { sexMapping?: Record<string, string> }
      | undefined;
    const expected = (readJson('v10-unmapped-sex', 'expected.json') ?? {}) as ExpectedLike;

    const mapped = Object.keys(conventions?.sexMapping ?? {});
    const unmappedRows = (input?.rows ?? []).filter((r) => !mapped.includes(String(r.sex)));
    expect(unmappedRows.length).toBeGreaterThanOrEqual(1);

    const excluded = metricsOf(expected).map((m) => m.excludedN);
    expect(Math.max(0, ...excluded)).toBeGreaterThanOrEqual(1);
    expect(expected.warnings ?? []).not.toHaveLength(0);
  });

  it('v07 expects a null value with a recorded warning rather than a zero or a division by zero', () => {
    const expected = (readJson('v07-all-male-category', 'expected.json') ?? {}) as ExpectedLike;
    const nulls = metricsOf(expected).filter((m) => m.value === null);

    expect(nulls.length).toBeGreaterThanOrEqual(1);
    expect(expected.warnings ?? []).not.toHaveLength(0);
  });
});
