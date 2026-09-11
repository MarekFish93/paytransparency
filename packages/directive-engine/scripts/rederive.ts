/**
 * `rederive:vectors` — compare the two independently produced passes over every golden
 * vector and exit non-zero if any of them disagree.
 *
 * THIS TOOL COMPUTES NOTHING. It opens each vector's two AUTHORED answer files and
 * compares them position by position. It never opens the worker-rows file, and it
 * contains no arithmetic over worker rows — both asserted in
 * `test/rederivation.test.ts`, the first by checking that this source does not contain
 * that filename ANYWHERE, comments included. That is why the rows file is referred to
 * by description throughout and never by name: a blunt whole-file assertion is far
 * harder to subvert than one that trusts a comment-stripper.
 *
 * That restraint is the whole point. A tool that recomputed the metrics would be
 * checking the vectors against an implementation that shares their assumptions, so a
 * misread convention would appear in the answers AND in the checker and the two would
 * agree with each other all the way to production. D-13 asks for a second HUMAN-scale
 * derivation, and the only honest machine role here is a differ.
 *
 * "Article 9" is always Article 9 of Directive (EU) 2023/970, never Article 9 of the GDPR.
 *
 * Run: `pnpm rederive:vectors`
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { CITATION_KEY_PATTERN, METRIC_DEFINITIONS, METRIC_KEYS } from '../src/types.ts';

const VECTORS_DIR = fileURLToPath(new URL('../vectors', import.meta.url));

/**
 * The two AUTHORED answer files, and the only per-vector files this tool opens.
 *
 * The worker-rows file is deliberately absent from this list. A test asserts this
 * module's source does not even contain that filename, so a future edit cannot quietly
 * start deriving answers from the rows instead of comparing the two authored passes.
 */
export const ANSWER_FILES = ['expected.json', 'rederived.json'] as const;

/**
 * The language the citation keys resolve in.
 *
 * `definitionCite` is language-invariant by design — the Publications Office's own
 * article and paragraph ids are identical across expressions — so a citation names a
 * paragraph, and the language is the corpus lookup's concern rather than the citation's.
 */
export const CITATION_LANGUAGE = 'eng';

/** The per-metric fields compared. `value` is compared with Object.is, so null !== 0. */
const COMPARED_FIELDS = ['value', 'definitionCite', 'populationN', 'excludedN', 'suppressed', 'unreliable'] as const;

export interface PositionVerdict {
  /** `a` … `f`, or `g:<category>` for the per-category metric. */
  position: string;
  agrees: boolean;
  /** The named fields that differ — empty when the position agrees. */
  differences: string[];
  first: unknown;
  second: unknown;
}

export interface RecordedAmbiguity {
  conventionKey?: string;
  issue?: string;
  chosen?: string;
}

export interface VectorVerdict {
  vector: string;
  agrees: boolean;
  positions: PositionVerdict[];
  /** Whole-report differences: `art10Flags`, `warnings`, or a missing answer file. */
  differences: string[];
  /**
   * Every ambiguity the second pass recorded, surfaced even when the answers agree.
   * An ambiguity whose two readings happened to produce the same number is still an
   * ambiguity, and burying it because the verdict was green is threat T-1-22.
   */
  ambiguities: RecordedAmbiguity[];
}

type Answers = Record<string, unknown>;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** The vector directories, sorted, so the report order is stable across machines. */
export function listVectors(): string[] {
  return readdirSync(VECTORS_DIR)
    .filter((entry) => statSync(join(VECTORS_DIR, entry)).isDirectory())
    .sort();
}

export function readAnswers(vector: string): { expected: Answers | undefined; rederived: Answers | undefined } {
  const read = (file: string): Answers | undefined => {
    try {
      const parsed: unknown = JSON.parse(readFileSync(join(VECTORS_DIR, vector, file), 'utf8'));
      return isObject(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  };
  return { expected: read(ANSWER_FILES[0]), rederived: read(ANSWER_FILES[1]) };
}

/**
 * Compare one metric position across the two passes.
 *
 * `Object.is` rather than `==` or a tolerance: a null and a zero are DIFFERENT CLAIMS —
 * "no defensible value exists" against "the difference is zero" — and the all-male
 * category vector is built precisely on that distinction. A tolerant comparison here
 * would report the two passes as agreeing when they said opposite things.
 */
function comparePosition(position: string, first: unknown, second: unknown): PositionVerdict {
  if (!isObject(first) || !isObject(second)) {
    const differences = first === undefined || second === undefined ? ['present'] : ['shape'];
    return { position, agrees: false, differences, first, second };
  }
  const differences = COMPARED_FIELDS.filter((field) => !Object.is(first[field], second[field])).map(String);
  return { position, agrees: differences.length === 0, differences, first, second };
}

/**
 * Every metric position present in EITHER pass.
 *
 * Either, not both: a position one pass answered and the other did not is a
 * disagreement and must appear in the verdict. A position neither pass mentions is not
 * part of these answers at all and is not invented here — the requirement that a real
 * vector carry all seven positions belongs to the vector tests, not to the differ.
 */
function positionKeys(first: Answers, second: Answers): string[] {
  const keys: string[] = [];
  const metricsOf = (a: Answers): Record<string, unknown> => (isObject(a.metrics) ? a.metrics : {});
  for (const key of METRIC_KEYS) {
    if (key !== 'g') {
      if (metricsOf(first)[key] !== undefined || metricsOf(second)[key] !== undefined) keys.push(key);
      continue;
    }
    const categories = new Set([
      ...Object.keys(isObject(metricsOf(first).g) ? (metricsOf(first).g as Answers) : {}),
      ...Object.keys(isObject(metricsOf(second).g) ? (metricsOf(second).g as Answers) : {}),
    ]);
    for (const category of [...categories].sort()) keys.push(`g:${category}`);
  }
  return keys;
}

function positionValue(answers: Answers, position: string): unknown {
  const metrics = isObject(answers.metrics) ? answers.metrics : {};
  if (!position.startsWith('g:')) return metrics[position];
  const g = isObject(metrics.g) ? metrics.g : {};
  return g[position.slice(2)];
}

/**
 * Whole-report claims compared as normalised JSON.
 *
 * `art10Flags` is compared in full, because a category flagged by one pass and not the
 * other is a disagreement about whether an employer owes a joint pay assessment.
 * `warnings` is compared by CODE ONLY: the codes are the contract, and the detail string
 * is prose the two passes are expected to word differently — the same reason `working`
 * is not compared at all.
 */
function compareReportLevel(first: Answers, second: Answers): string[] {
  const differences: string[] = [];
  const flags = (a: Answers): string => JSON.stringify(Array.isArray(a.art10Flags) ? a.art10Flags : []);
  const codes = (a: Answers): string =>
    JSON.stringify((Array.isArray(a.warnings) ? a.warnings : []).map((w) => (isObject(w) ? w.code : w)).sort());
  if (flags(first) !== flags(second)) differences.push('art10Flags');
  if (codes(first) !== codes(second)) differences.push('warnings');
  return differences;
}

/**
 * Compare the two authored passes over one vector.
 *
 * The `working` sections are NOT compared. Two independent hand computations may explain
 * themselves in completely different shapes and still have reached the same answers —
 * and if they explained themselves identically, that would be evidence of a copy rather
 * than of agreement.
 */
export function compareVectors(vector: string, first: unknown, second: unknown): VectorVerdict {
  const ambiguitiesOf = (a: unknown): RecordedAmbiguity[] =>
    isObject(a) && Array.isArray(a.ambiguities) ? (a.ambiguities as RecordedAmbiguity[]) : [];

  if (!isObject(first) || !isObject(second)) {
    return {
      vector,
      agrees: false,
      positions: [],
      differences: [first === undefined ? 'expected.json missing' : 'rederived.json missing'],
      ambiguities: ambiguitiesOf(second),
    };
  }

  const positions = positionKeys(first, second).map((position) =>
    comparePosition(position, positionValue(first, position), positionValue(second, position)),
  );
  const differences = compareReportLevel(first, second);

  return {
    vector,
    agrees: positions.every((p) => p.agrees) && differences.length === 0,
    positions,
    differences,
    ambiguities: ambiguitiesOf(second),
  };
}

// ---------------------------------------------------------------------------
// The engine-to-data link
// ---------------------------------------------------------------------------

export interface CollectedCitation {
  cite: string;
  /** The artefact the key came from, so a failure names the file to fix. */
  source: string;
}

/**
 * The corpus key an article-and-paragraph citation resolves through.
 *
 * The stored corpus is keyed by ARTICLE and language — `32023L0970#003@eng` — while a
 * `definitionCite` names a PARAGRAPH — `32023L0970#003.001`. The paragraph then has to be
 * found inside that entry. Resolving only as far as the article would let a citation to a
 * paragraph that does not exist pass, which is exactly the silent drift the check exists
 * to stop.
 */
export function corpusKeyFor(cite: string): string {
  const [celex, paragraph] = cite.split('#');
  const article = (paragraph ?? '').split('.')[0] ?? '';
  return `${celex}#${article}@${CITATION_LANGUAGE}`;
}

/** Every citation key in the report type and in both answer files of every vector. */
export function collectCitations(): CollectedCitation[] {
  const out: CollectedCitation[] = [];

  for (const key of METRIC_KEYS) {
    out.push({ cite: METRIC_DEFINITIONS[key].definitionCite, source: `packages/directive-engine/src/types.ts (metric ${key})` });
  }

  const walk = (node: unknown, source: string): void => {
    if (typeof node === 'string') {
      if (CITATION_KEY_PATTERN.test(node)) out.push({ cite: node, source });
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, source);
      return;
    }
    if (isObject(node)) {
      for (const [key, value] of Object.entries(node)) {
        // `working` and `ambiguities` are prose; a citation quoted inside an explanation
        // is a reference, not a claim the report makes, and must not be collected.
        if (key === 'working' || key === 'ambiguities' || key === 'resolutions') continue;
        walk(value, source);
      }
    }
  };

  for (const vector of listVectors()) {
    const answers = readAnswers(vector);
    walk(answers.expected, `packages/directive-engine/vectors/${vector}/expected.json`);
    walk(answers.rederived, `packages/directive-engine/vectors/${vector}/rederived.json`);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function report(): number {
  const vectors = listVectors();
  const verdicts = vectors.map((vector) => {
    const { expected, rederived } = readAnswers(vector);
    return compareVectors(vector, expected, rederived);
  });

  process.stdout.write(`Golden vector re-derivation — ${verdicts.length} vectors, two independently authored passes each\n\n`);

  for (const verdict of verdicts) {
    process.stdout.write(`${verdict.agrees ? 'agree   ' : 'DISAGREE'}  ${verdict.vector}\n`);
    for (const position of verdict.positions.filter((p) => !p.agrees)) {
      process.stdout.write(`            metric ${position.position}: ${position.differences.join(', ')}\n`);
      process.stdout.write(`              expected.json  ${JSON.stringify(position.first)}\n`);
      process.stdout.write(`              rederived.json ${JSON.stringify(position.second)}\n`);
    }
    for (const difference of verdict.differences) {
      process.stdout.write(`            ${difference} differs\n`);
    }
    for (const ambiguity of verdict.ambiguities) {
      process.stdout.write(`            ambiguity [${ambiguity.conventionKey ?? 'unnamed key'}] ${ambiguity.issue ?? ''}\n`);
    }
  }

  const unresolved = collectCitations().filter(({ cite }) => !CITATION_KEY_PATTERN.test(cite));
  const disagreeing = verdicts.filter((v) => !v.agrees);

  let ambiguities = 0;
  for (const verdict of verdicts) ambiguities += verdict.ambiguities.length;

  process.stdout.write(
    `\n${verdicts.length - disagreeing.length} of ${verdicts.length} vectors agree; ` +
      `${ambiguities} recorded ambiguit${ambiguities === 1 ? 'y' : 'ies'} surfaced.\n`,
  );

  if (unresolved.length) {
    process.stdout.write(`\nMalformed citation keys:\n`);
    for (const { cite, source } of unresolved) process.stdout.write(`  ${cite}  <- ${source}\n`);
  }

  if (disagreeing.length) {
    process.stdout.write(
      `\nA disagreement is evidence that a CONVENTION IS AMBIGUOUSLY WORDED, not that a\n` +
        `number is wrong. Fix docs/CONVENTIONS.md so the decision admits one reading, then\n` +
        `redo BOTH passes for the affected vector. Do not edit an answer file to match.\n`,
    );
  }

  return disagreeing.length || unresolved.length ? 1 : 0;
}

// Run the report only when invoked as a script. `pathToFileURL` rather than string
// surgery on argv: a Windows path produces `file:///C:/...` with three slashes, and a
// hand-built `file://C:/...` would never match, silently turning the CLI into a no-op
// that exits zero — the worst possible failure for a gate.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(report());
}
