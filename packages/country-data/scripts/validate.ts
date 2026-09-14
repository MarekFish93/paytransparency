/**
 * `validate:country-data` — the entry point the pull-request gate runs.
 *
 * Three layers, in order, because each only makes sense on top of the one below:
 *
 *   1. SCHEMA PARSE — is each file well formed? `CountryRecord` for `data/`,
 *      `ProposedCountryRecord` for `proposed/`.
 *   2. THE POLICY LINT — is it acceptable? `lintAll`, L1 through L9 plus the
 *      unchanged-bump rule.
 *   3. THE REFERENTIAL PASS — do the Directive fallback citation keys actually RESOLVE
 *      against the stored corpus? `assertFallbackKeysResolve`.
 *
 * READ-ONLY. This script never writes to the data directory, and that is a correctness
 * property rather than an implementation detail: it is what lets a nightly full-set run
 * and a pull-request run execute at the same time, against the same files, without
 * racing. Two contributor pull requests touching the same proposed file therefore pass
 * CI independently, and merge order stays a maintainer's decision rather than a race.
 *
 * Runs under Node's native type stripping — `node packages/country-data/scripts/validate.ts` —
 * so only erasable syntax is used.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CountryRecord, ProposedCountryRecord } from '../src/country.ts';
import {
  lintAll,
  RULE_IDS,
  type LintFile,
  type LintReport,
  type RuleReport,
} from '../src/lint.ts';
import { directiveArticleKey, DIRECTIVE_FALLBACK_KEYS } from '../src/resolve.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const DATA_DIR = resolve(pkgRoot, 'data');
const PROPOSED_DIR = resolve(pkgRoot, 'proposed');

/**
 * Every country or proposal record in `dir`, sorted by path so a report is stable.
 *
 * Files whose stem begins with `_` are the SHARED, non-country records (`_allowlist`,
 * `_directive`) — `data/`'s own convention, and the same rule `coverage.test.ts` counts
 * the 27 member-state files by.
 */
export function loadRecords(dir: string): LintFile[] {
  const label = dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? dir;
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
    .sort()
    .map((name) => ({
      path: `${label}/${name}`,
      record: JSON.parse(readFileSync(resolve(dir, name), 'utf8')) as unknown,
      repoPath: `packages/country-data/${label}/${name}`,
    }));
}

/**
 * The same records as they stand on `baseRef`, keyed by the label the lint uses.
 *
 * This is what arms the unchanged-bump rule. Without it `lintAll` has nothing to compare
 * against and reports BUMP as a skip — which is honest, but means the rule cannot catch
 * anything on a pull request. `git show` is read-only and touches no working-tree file.
 *
 * A file that does not exist on the base (a newly added country) is simply absent from the
 * result: there is no previous date for it to have advanced from.
 */
export function loadBaseRecords(baseRef: string, files: readonly LintFile[]): Record<string, unknown> {
  const previous: Record<string, unknown> = {};
  for (const file of files) {
    if (file.repoPath === undefined) continue;
    try {
      const raw = execFileSync('git', ['show', `${baseRef}:${file.repoPath}`], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      previous[file.path] = JSON.parse(raw) as unknown;
    } catch {
      // Absent on the base, or the ref is unreachable. Either way there is nothing to
      // compare, and a missing comparison must not be reported as a violation.
    }
  }
  return previous;
}

const isRecordLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Every `directive_fallback` citation key a record carries, with the dotted path that
 * carries it. Walks structurally rather than from a fixed field list, so a field added
 * to the schema later cannot escape the pass by not being on a list somebody forgot.
 */
function citationKeysIn(record: unknown): { path: string; key: string }[] {
  const out: { path: string; key: string }[] = [];
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`));
      return;
    }
    if (!isRecordLike(node)) return;
    const own = node['directive_citation_key'];
    if (typeof own === 'string') out.push({ path: path === '' ? '(root)' : path, key: own });
    for (const k of Object.keys(node)) walk(node[k], `${path}.${k}`);
  };
  walk(record, '');
  return out;
}

/** The languages the corpus holds, derived from its own keys rather than restated. */
function corpusLanguages(corpus: Record<string, unknown>): string[] {
  const langs = new Set<string>();
  for (const key of Object.keys(corpus)) {
    const at = key.lastIndexOf('@');
    if (at !== -1) langs.add(key.slice(at + 1));
  }
  return [...langs].sort();
}

/**
 * Does one paragraph-level citation key resolve inside the article-keyed corpus, in the
 * given language? Returns the reason it does not, or null when it does.
 *
 * The three failure modes are distinct and all three matter:
 *   - the corpus holds no such article in that language;
 *   - it holds the article but not that paragraph;
 *   - it holds the paragraph under a DIFFERENT citation key, which means the corpus and
 *     the fallback table disagree about which provision this is.
 */
function resolutionFailure(
  corpus: Record<string, unknown>,
  key: string,
  language: string,
): string | null {
  const articleKey = directiveArticleKey(key, language);
  if (articleKey === null) {
    return `"${key}" is not a paragraph-level citation key of the form <CELEX>#<article>.<paragraph>, so no corpus entry can hold it`;
  }

  const entry = corpus[articleKey];
  if (entry === undefined) {
    return `data/_directive.json holds no entry ${articleKey}`;
  }
  if (!isRecordLike(entry) || !isRecordLike(entry['value'])) {
    return `data/_directive.json entry ${articleKey} is not a fact carrying an article value`;
  }
  const paragraphs = entry['value']['paragraphs'];
  if (!isRecordLike(paragraphs)) {
    return `data/_directive.json entry ${articleKey} is not article-shaped, so its paragraphs cannot be indexed`;
  }

  const paragraphId = key.slice(key.indexOf('#') + 1);
  const paragraph = paragraphs[paragraphId];
  if (paragraph === undefined) {
    return `data/_directive.json entry ${articleKey} holds no paragraph ${paragraphId} — it has ${
      Object.keys(paragraphs).join(', ') || '(none)'
    }`;
  }
  if (isRecordLike(paragraph) && paragraph['citation_key'] !== key) {
    return `data/_directive.json entry ${articleKey} stores paragraph ${paragraphId} under the citation key ${String(
      paragraph['citation_key'],
    )} — the corpus and the fallback table disagree about which provision this is`;
  }
  return null;
}

/**
 * The CROSS-ARTEFACT referential pass. Not a numbered policy rule, and deliberately so:
 * L1 through L9 each judge one record in isolation, while this one needs two artefacts
 * to exist at the same moment — the 27 records and the 66-entry Directive corpus.
 *
 * It collects every citation key in `DIRECTIVE_FALLBACK_KEYS` together with every
 * `directive_fallback` value in every file under `data/` and `proposed/`, and fails
 * naming BOTH the key and the record that carries it. A key alone does not tell a
 * maintainer which file to open.
 *
 * WHY IT LIVES HERE rather than in plan 04: plan 04 ran in the same wave as plan 03, the
 * corpus's only writer, where a legal-basis fallback key genuinely did not exist yet.
 * Plan 04 therefore asserted the key SHAPE; this asserts that the keys RESOLVE. This is
 * the first point at which the complete corpus and all 27 records exist together, and it
 * runs upstream of the irreversible go-public step — which is the whole reason the
 * deferral was safe.
 *
 * Every language the corpus holds is checked, not just English. A Polish page renders the
 * Polish authentic text, and `resolve()` throws rather than serving English in its place;
 * a pass that only checked `eng` would green-light a blank citation on nine pages.
 */
export function assertFallbackKeysResolve(
  corpus: Record<string, unknown>,
  files: readonly LintFile[],
): void {
  const languages = corpusLanguages(corpus);
  if (languages.length === 0) {
    throw new Error(
      'the Directive corpus holds no language-keyed entries — every directive_fallback citation would render blank',
    );
  }

  const problems: string[] = [];

  const check = (key: string, carrier: string): void => {
    for (const language of languages) {
      const failure = resolutionFailure(corpus, key, language);
      if (failure !== null) problems.push(`  - ${carrier} cites ${key}: ${failure}`);
    }
  };

  for (const [field, key] of Object.entries(DIRECTIVE_FALLBACK_KEYS)) {
    check(key, `DIRECTIVE_FALLBACK_KEYS["${field}"]`);
  }

  for (const file of files) {
    for (const { path, key } of citationKeysIn(file.record)) {
      check(key, `${file.path}#${path}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Directive fallback citation keys do not resolve against data/_directive.json:\n${problems.join(
        '\n',
      )}\n\nA key that resolves to nothing renders as a blank citation on a country page, and a worker's letter then cites nothing.`,
    );
  }
}

// ---------------------------------------------------------------------------
// The CLI
// ---------------------------------------------------------------------------

/** Schema parse. Returns the messages; an empty array is a pass. */
function parseAll(files: readonly LintFile[], proposed: boolean): string[] {
  const schema = proposed ? ProposedCountryRecord : CountryRecord;
  const messages: string[] = [];
  for (const file of files) {
    const result = schema.safeParse(file.record);
    if (result.success) continue;
    for (const issue of result.error.issues) {
      messages.push(`  - ${file.path}#${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  }
  return messages;
}

function renderRule(rule: RuleReport): string {
  if (rule.skipped) {
    return `  ${rule.rule.padEnd(4)} SKIP   ${rule.title} — ${rule.skipReason ?? 'no reason recorded'}`;
  }
  const errors = rule.findings.filter((f) => f.severity === 'error').length;
  const warnings = rule.findings.filter((f) => f.severity === 'warning').length;
  const verdict = errors > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'ok';
  const counts = errors > 0 || warnings > 0 ? ` (${errors} error, ${warnings} warning)` : '';
  return `  ${rule.rule.padEnd(4)} ${verdict.padEnd(6)} ${rule.title}${counts}`;
}

function render(report: LintReport): string {
  const lines = ['', 'Policy lint:', ...report.rules.map(renderRule)];
  if (report.warnings.length > 0) {
    lines.push('', 'Warnings:');
    for (const w of report.warnings) lines.push(`  ! [${w.rule}] ${w.message}`);
  }
  if (report.errors.length > 0) {
    lines.push('', 'Errors:');
    for (const e of report.errors) lines.push(`  x [${e.rule}] ${e.message}`);
  }
  return `${lines.join('\n')}\n`;
}

function main(): number {
  // `--base <ref>` arms the unchanged-bump rule. CI passes the pull request's base branch;
  // a local run without it reports BUMP as a skip, which is the honest state when there is
  // no change to judge.
  const args = process.argv.slice(2);
  const baseAt = args.indexOf('--base');
  const baseRef = baseAt === -1 ? null : (args[baseAt + 1] ?? null);

  const data = loadRecords(DATA_DIR);
  const proposed = loadRecords(PROPOSED_DIR);
  const corpus = JSON.parse(readFileSync(resolve(DATA_DIR, '_directive.json'), 'utf8')) as Record<
    string,
    unknown
  >;

  process.stdout.write(
    `validate:country-data — ${data.length} country records, ${proposed.length} proposals, ${
      Object.keys(corpus).length
    } Directive corpus entries\n`,
  );

  const schemaIssues = [...parseAll(data, false), ...parseAll(proposed, true)];
  if (schemaIssues.length > 0) {
    process.stdout.write(`\nSchema parse: FAIL\n${schemaIssues.join('\n')}\n`);
  } else {
    process.stdout.write('\nSchema parse: ok\n');
  }

  const previous =
    baseRef === null ? undefined : loadBaseRecords(baseRef, [...data, ...proposed]);
  if (baseRef !== null) {
    process.stdout.write(
      `Base for the unchanged-bump rule: ${baseRef} (${
        Object.keys(previous ?? {}).length
      } files retrieved)\n`,
    );
  }

  const report = lintAll(
    { data, proposed },
    {
      profile: 'pull-request',
      lettersDir: resolve(pkgRoot, '..', 'letters'),
      ...(previous === undefined ? {} : { previous }),
    },
  );
  process.stdout.write(render(report));

  // Every numbered rule must appear in the summary. A rule that silently stopped being
  // reported is a rule that silently stopped running.
  const reported = new Set(report.rules.map((r) => r.rule));
  const missing = RULE_IDS.filter((id) => !reported.has(id));
  if (missing.length > 0) {
    process.stdout.write(`\nReferential pass: NOT RUN — rules missing from the summary: ${missing.join(', ')}\n`);
    return 1;
  }

  let referentialError: string | null = null;
  try {
    assertFallbackKeysResolve(corpus, [...data, ...proposed]);
    process.stdout.write('\nReferential pass: ok — every Directive fallback citation key resolves\n');
  } catch (error) {
    referentialError = error instanceof Error ? error.message : String(error);
    process.stdout.write(`\nReferential pass: FAIL\n${referentialError}\n`);
  }

  const failed = schemaIssues.length > 0 || !report.ok || referentialError !== null;
  process.stdout.write(
    `\n${failed ? 'FAILED' : 'PASSED'} — ${report.errors.length} error, ${
      report.warnings.length
    } warning, ${schemaIssues.length} schema issue\n`,
  );
  return failed ? 1 : 0;
}

/**
 * Run only when invoked as a script. The suite imports `assertFallbackKeysResolve` and
 * `loadRecords` from here, and an import that ran the whole validation as a side effect
 * would make every test file pay for it.
 */
const invokedPath = process.argv[1];
if (invokedPath !== undefined && resolve(invokedPath) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
