/**
 * The policy lint — L1 through L9, layered on top of schema parse.
 *
 * Schema parse answers "is this record WELL FORMED". These rules answer "is it
 * ACCEPTABLE". The distinction is the reason this module exists rather than another
 * `superRefine`: four of the nine rules cannot be expressed inside a per-record parse at
 * all. L1 is a statement about the SET of files. L5 needs the allowlist. L7 needs the
 * letters package. The unchanged-bump rule needs the BASE BRANCH. A rule that needs two
 * artefacts at once has no home inside a schema that sees one record.
 *
 * Every rule is exported individually, so a failure names the rule that caught it rather
 * than arriving as an undifferentiated "validation failed". `lintAll` is the aggregate.
 *
 * READ-ONLY, without exception. Nothing here writes, and that is what lets a nightly
 * full-set run and a pull-request run execute at the same time against the same files
 * without racing each other.
 *
 * Delegation, not re-implementation, in three places:
 *   - L5 → `assertFetchable`   (one allowlist implementation)
 *   - L8 → `freshnessGate`     (one launch-country hard rule)
 *   - BUMP → `assertNoUnchangedBump`
 * Each is asserted by its test through the delegate's own error type or wording, so a
 * second copy of any of the three cannot be introduced without turning the suite red.
 */
import { existsSync, readdirSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import { AllowlistViolation, assertFetchable } from './allowlist.ts';
import { EU_COUNTRY_CODES, factAt, FACT_PATHS, isLaunchCountry } from './country.ts';
import { assertNoUnchangedBump, freshnessGate, freshnessOf } from './freshness.ts';
import { sourceUrlIssues } from './schema.ts';
import type { Volatility } from './schema.ts';

/** The nine numbered policy rules, in report order. */
export const RULE_IDS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'] as const;

/**
 * `BUMP` is not a numbered rule: L1–L9 each judge the tree as it stands, while the
 * unchanged-bump rule judges a CHANGE. It is reported alongside them because a
 * maintainer reading the summary needs one list, not two.
 */
export type RuleId = (typeof RULE_IDS)[number] | 'BUMP';

export type Severity = 'error' | 'warning';

export type LintFinding = {
  rule: RuleId;
  severity: Severity;
  /** The offending file, and where in it — this is what a contributor opens. */
  path: string;
  message: string;
  /** The delegate's own error, where a rule delegates. L5 carries `AllowlistViolation`. */
  cause?: unknown;
};

export type RuleReport = {
  rule: RuleId;
  title: string;
  /** The rule's class. L8 is an `error` rule that also emits warnings below its class. */
  severity: Severity;
  findings: LintFinding[];
  /** A rule that could not run. Reported as a skip, never counted as a pass. */
  skipped: boolean;
  skipReason: string | null;
};

export type LintFile = {
  /** Short label used in messages, e.g. `data/PL.json`. */
  path: string;
  record: unknown;
  /**
   * Repository-relative path, e.g. `packages/country-data/data/PL.json`.
   *
   * Only the caller that read the file from disk knows this, and only the unchanged-bump
   * rule needs it — it is what lets CI retrieve the same file as it stands on the pull
   * request's base branch.
   */
  repoPath?: string;
};

export type LintOptions = {
  /** `YYYY-MM-DD`. Injected so a freshness boundary is not a function of the day. */
  today?: string;
  /** L6 is nightly-only; on a pull request it records a skip. */
  profile?: 'pull-request' | 'nightly';
  /** Where `packages/letters` will live. L7 skips while it is absent. */
  lettersDir?: string;
  /** Path → the same record on the base branch. Drives the unchanged-bump rule. */
  previous?: Record<string, unknown>;
};

export type LintReport = {
  rules: RuleReport[];
  errors: LintFinding[];
  warnings: LintFinding[];
  ok: boolean;
};

// ---------------------------------------------------------------------------
// Shared plumbing
// ---------------------------------------------------------------------------

const isRecordLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const todayIso = (): string => new Date().toISOString().slice(0, 10);

/** Widened once, so a 28th member state is one edit rather than two. */
const EU_CODES: readonly string[] = EU_COUNTRY_CODES;

/** The record's own declared country code, or `''` when it has none. */
function codeOf(record: unknown): string {
  if (!isRecordLike(record)) return '';
  const country = record['country'];
  if (!isRecordLike(country)) return '';
  return typeof country['code'] === 'string' ? country['code'] : '';
}

/** `data/PL.json` → `PL`. The filename stem, without directory or extension. */
function stemOf(path: string): string {
  const base = path.replace(/\\/g, '/').split('/').pop() ?? path;
  return base.replace(/\.json$/i, '');
}

function report(rule: RuleId, title: string, findings: LintFinding[] = []): RuleReport {
  return { rule, title, severity: 'error', findings, skipped: false, skipReason: null };
}

function skipped(rule: RuleId, title: string, reason: string): RuleReport {
  return { rule, title, severity: 'error', findings: [], skipped: true, skipReason: reason };
}

function finding(
  rule: RuleId,
  severity: Severity,
  path: string,
  message: string,
  cause?: unknown,
): LintFinding {
  return cause === undefined
    ? { rule, severity, path, message }
    : { rule, severity, path, message, cause };
}

type FactView = {
  value: unknown;
  status: string;
  sources: unknown[];
  verified_at: string | null;
  volatility: string;
};

/** Every `Fact` in a record, by dotted path, using the one `FACT_PATHS` list. */
function factsOf(record: unknown): { path: string; fact: FactView }[] {
  const out: { path: string; fact: FactView }[] = [];
  for (const path of FACT_PATHS) {
    const raw = factAt(record, path);
    if (raw === null) continue;
    out.push({
      path,
      fact: {
        value: raw.value,
        status: raw.status,
        sources: Array.isArray(raw.sources) ? (raw.sources as unknown[]) : [],
        verified_at: typeof raw.verified_at === 'string' ? raw.verified_at : null,
        volatility: typeof raw.volatility === 'string' ? raw.volatility : 'volatile',
      },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// L1 — file coverage
// ---------------------------------------------------------------------------

/**
 * Exactly 27 files, one per member state, each named after the code the record itself
 * declares.
 *
 * The third clause is the one that catches a real mistake: a contributor copies
 * `SK.json` to `CZ.json`, edits the content and forgets `country.code`. Schema parse is
 * perfectly happy — the record is a valid Slovak record — and the site then serves
 * Slovak law on the Czech page.
 */
export function L1_fileCoverage(files: readonly LintFile[]): RuleReport {
  const findings: LintFinding[] = [];
  const seen = new Map<string, string[]>();

  for (const file of files) {
    const stem = stemOf(file.path);
    const code = codeOf(file.record);
    if (code === '') {
      findings.push(finding('L1', 'error', file.path, `${file.path} declares no country.code`));
      continue;
    }
    if (stem !== code) {
      findings.push(
        finding(
          'L1',
          'error',
          file.path,
          `${file.path} is named for "${stem}" but the record declares country.code "${code}" — the filename and the record must agree, or the site serves one state's law on another's page`,
        ),
      );
    }
    const paths = seen.get(code) ?? [];
    paths.push(file.path);
    seen.set(code, paths);
  }

  for (const [code, paths] of seen) {
    if (paths.length > 1) {
      findings.push(
        finding(
          'L1',
          'error',
          paths.join(', '),
          `country code "${code}" is declared by ${paths.length} files: ${paths.join(', ')}`,
        ),
      );
    }
  }

  for (const code of EU_CODES) {
    if (!seen.has(code)) {
      findings.push(
        finding('L1', 'error', `data/${code}.json`, `no record for member state ${code}`),
      );
    }
  }

  for (const [code, paths] of seen) {
    if (!EU_CODES.includes(code)) {
      findings.push(
        finding(
          'L1',
          'error',
          paths.join(', '),
          `${paths.join(', ')} declares "${code}", which is not one of the 27 member-state codes`,
        ),
      );
    }
  }

  if (files.length !== EU_CODES.length) {
    findings.push(
      finding(
        'L1',
        'error',
        'data/',
        `expected exactly ${EU_CODES.length} country files, found ${files.length}`,
      ),
    );
  }

  return report('L1', 'file coverage — 27 files, one per member state', findings);
}


// ---------------------------------------------------------------------------
// L2 / L3 — the fact envelope
// ---------------------------------------------------------------------------

/**
 * A verified fact carries at least one source, a `verified_at`, and that date is not in
 * the future.
 *
 * The schema asserts the same three. This restates them at lint level deliberately: the
 * lint runs over `proposed/` too, and over files a contributor may have hand-edited past
 * a schema the editor never ran. A control that exists in exactly one place is a control
 * that a single mistake removes.
 */
export function L2_verifiedHasSource(
  files: readonly LintFile[],
  options: LintOptions = {},
): RuleReport {
  const today = options.today ?? todayIso();
  const findings: LintFinding[] = [];

  for (const file of files) {
    for (const { path, fact } of factsOf(file.record)) {
      if (fact.status !== 'verified') continue;
      const where = `${file.path}#${path}`;
      if (fact.sources.length === 0) {
        findings.push(
          finding('L2', 'error', where, `${where} is verified but cites no source`),
        );
      }
      if (fact.verified_at === null) {
        findings.push(
          finding('L2', 'error', where, `${where} is verified but carries no verified_at date`),
        );
      } else if (fact.verified_at > today) {
        findings.push(
          finding(
            'L2',
            'error',
            where,
            `${where} has verified_at ${fact.verified_at}, which is in the future (today is ${today})`,
          ),
        );
      }
      if (fact.value === null) {
        findings.push(finding('L2', 'error', where, `${where} is verified but holds no value`));
      }
    }
  }

  return report('L2', 'verified facts carry a source and a past date', findings);
}

/** A `pending_verification` fact holds `null` — never a plausible guess. */
export function L3_pendingIsNull(files: readonly LintFile[]): RuleReport {
  const findings: LintFinding[] = [];
  for (const file of files) {
    for (const { path, fact } of factsOf(file.record)) {
      if (fact.status !== 'pending_verification' || fact.value === null) continue;
      const where = `${file.path}#${path}`;
      findings.push(
        finding(
          'L3',
          'error',
          where,
          `${where} is pending_verification but holds a value — a pending fact must be null, never a plausible guess`,
        ),
      );
    }
  }
  return report('L3', 'pending facts hold null', findings);
}

// ---------------------------------------------------------------------------
// L4 — anti-hallucination
// ---------------------------------------------------------------------------

/**
 * The four statute and journal-reference shapes an invented citation takes.
 *
 * Deliberately broad. A false positive costs a contributor one line of explanation in a
 * pull request; a false negative puts a law that was never enacted into a letter a worker
 * sends to their employer. The asymmetry is total, and the rule is tuned for it.
 */
const STATUTE_PATTERNS: { name: string; pattern: RegExp }[] = [
  {
    // The Polish official journal and its position marker: `Dz.U. 2026 poz. 1477`,
    // `M.P. 2024 poz. 12`. Also the shape a fabricated Polish citation reaches for first.
    name: 'polish journal reference',
    pattern: /\b(?:Dz\.?\s?U\.|M\.?\s?P\.)|\bpoz\.\s*\d+/u,
  },
  {
    // An article or section number in any of the launch languages: `art. 183c`,
    // `Article 7`, `§ 12`, `artykuł 8`, `straipsnis 5`.
    name: 'article number',
    pattern:
      /(?:^|[^\p{L}])(?:art\.|arts\.|article|artikel|articolo|artykuł|článok|straipsnis|artikolu|§)\s*\.?\s*\d+/iu,
  },
  {
    // A year-and-number law: `Legea nr. 167/2026`, `Ley 9/2017`, `167/2026`, `2026/173`.
    name: 'year-and-number law reference',
    pattern: /\b\d{1,4}\/\d{4}\b|\b\d{4}\/\d{1,4}\b/u,
  },
  {
    // The EU forms: a CELEX id, and the prose citation of a directive.
    name: 'EU directive reference',
    pattern: /\b3\d{4}[A-Z]\d{4}\b|\bdirectives?\s*\(EU\)\s*\d{4}\/\d{1,4}/iu,
  },
];

/** Which patterns a string matches. Empty when it makes no legal-instrument claim. */
function statuteMatches(value: string): string[] {
  return STATUTE_PATTERNS.filter((p) => p.pattern.test(value)).map((p) => p.name);
}

/**
 * What a matching string is allowed to sit inside, and why.
 *
 * The rule is not "no statute strings"; it is "no UNEVIDENCED statute strings". Four
 * containers carry their own evidence and are therefore permitted:
 *
 *   - a `Source` — the source IS the instrument. Naming it is provenance, not a claim.
 *   - a `DiscoveryHint` — one row of the Commission's register, schema-required to carry
 *     a CELEX and the date it was queried. A lead with impeccable provenance, stored as
 *     exactly that.
 *   - a `Proposal` — schema-required to carry at least one source, and structurally
 *     incapable of raising the site's confidence (L9).
 *   - a `verified` fact carrying at least one source, or a `directive_fallback` fact,
 *     whose citation key is shape-checked at parse and RESOLVED by
 *     `assertFallbackKeysResolve`.
 *
 * Anywhere else — including a `draft` or `pending_verification` fact's value, and
 * including a verified fact with an empty `sources` array — an instrument reference is
 * inexpressible. That is the whole point of the rule: not discouraged, impossible.
 */
type Container =
  | { kind: 'none' }
  | { kind: 'source' }
  | { kind: 'discovery_hint' }
  | { kind: 'proposal'; sourced: boolean }
  | { kind: 'fact'; path: string; status: string; sourced: boolean };

function containerAllows(container: Container): boolean {
  switch (container.kind) {
    case 'source':
    case 'discovery_hint':
      return true;
    case 'proposal':
      return container.sourced;
    case 'fact':
      return (
        container.status === 'directive_fallback' ||
        (container.status === 'verified' && container.sourced)
      );
    case 'none':
      return false;
  }
}

function describeContainer(container: Container): string {
  switch (container.kind) {
    case 'source':
      return 'a source';
    case 'discovery_hint':
      return 'a discovery hint';
    case 'proposal':
      return 'a proposal carrying no source';
    case 'fact':
      return container.sourced
        ? `the "${container.status}" fact at ${container.path}`
        : `the unsourced "${container.status}" fact at ${container.path}`;
    case 'none':
      return 'no evidence-bearing container';
  }
}

export function L4_noUnsourcedStatute(files: readonly LintFile[]): RuleReport {
  const findings: LintFinding[] = [];

  for (const file of files) {
    const walk = (node: unknown, path: string, container: Container): void => {
      if (typeof node === 'string') {
        if (containerAllows(container)) return;
        const matched = statuteMatches(node);
        if (matched.length === 0) return;
        findings.push(
          finding(
            'L4',
            'error',
            `${file.path}#${path}`,
            `${file.path}${path} reads ${JSON.stringify(
              node,
            )}, which matches ${matched.join(' and ')}, but it sits inside ${describeContainer(
              container,
            )}. A statute, journal or directive reference must sit inside a verified fact carrying at least one source — an unsourced citation is inexpressible here, not merely discouraged`,
          ),
        );
        return;
      }
      if (!isRecordLike(node) && !Array.isArray(node)) return;

      if (Array.isArray(node)) {
        node.forEach((child, i) => walk(child, `${path}[${i}]`, container));
        return;
      }

      // Re-derive the container whenever we cross into one.
      let next = container;
      if ('status' in node && 'value' in node && 'sources' in node) {
        next = {
          kind: 'fact',
          path: path === '' ? '(root)' : path,
          status: typeof node['status'] === 'string' ? node['status'] : 'unknown',
          sourced: Array.isArray(node['sources']) && node['sources'].length > 0,
        };
      }

      for (const key of Object.keys(node)) {
        const child = node[key];
        const childPath = `${path}.${key}`;
        if (key === 'sources' || key === 'draft_asserting_sources') {
          walk(child, childPath, { kind: 'source' });
        } else if (key === 'discovery_hints') {
          walk(child, childPath, { kind: 'discovery_hint' });
        } else if (key === 'proposals' && Array.isArray(child)) {
          child.forEach((proposal, i) =>
            walk(proposal, `${childPath}[${i}]`, {
              kind: 'proposal',
              sourced:
                isRecordLike(proposal) &&
                Array.isArray(proposal['sources']) &&
                proposal['sources'].length > 0,
            }),
          );
        } else if (key === '$schema' || key === 'schema_version' || key === 'meta') {
          // Machinery, not a claim. `$schema` is a relative pointer at the committed
          // JSON Schema and `meta` is generation bookkeeping.
        } else {
          walk(child, childPath, next);
        }
      }
    };

    walk(file.record, '', { kind: 'none' });
  }

  return report('L4', 'a statute or journal reference must be evidenced', findings);
}

// ---------------------------------------------------------------------------
// L5 — url hygiene
// ---------------------------------------------------------------------------

/**
 * Every source URL is https, carries no tracking parameter, and sits on a host that
 * country's allowlist names.
 *
 * The host half DELEGATES to `assertFetchable`. That is not tidiness: a second host
 * matcher here would have to re-derive the label-boundary rule that stops
 * `evil-legislation.mt` matching `legislation.mt`, and the second implementation is the
 * one that gets it wrong. The test asserts the delegation by requiring the finding's
 * `cause` to be an `AllowlistViolation`.
 */
export function L5_urlHygiene(files: readonly LintFile[]): RuleReport {
  const findings: LintFinding[] = [];

  for (const file of files) {
    const country = codeOf(file.record);
    const seen = new Set<string>();

    const visitSource = (source: unknown, where: string): void => {
      if (!isRecordLike(source)) return;
      const url = source['url'];
      if (typeof url !== 'string') return;
      const key = `${where}::${url}`;
      if (seen.has(key)) return;
      seen.add(key);

      for (const issue of sourceUrlIssues(url)) {
        findings.push(finding('L5', 'error', where, `${where} — ${url}: ${issue}`));
      }

      try {
        assertFetchable(url, country);
      } catch (error) {
        if (!(error instanceof AllowlistViolation)) throw error;
        findings.push(finding('L5', 'error', where, `${where} — ${error.message}`, error));
      }
    };

    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((child, i) => walk(child, `${path}[${i}]`));
        return;
      }
      if (!isRecordLike(node)) return;
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (key === 'sources' && Array.isArray(child)) {
          child.forEach((source, i) => visitSource(source, `${file.path}#${path}.sources[${i}]`));
          continue;
        }
        walk(child, `${path}.${key}`);
      }
    };

    walk(file.record, '');
  }

  return report('L5', 'url hygiene — https, no tracking, allowlisted host', findings);
}

// ---------------------------------------------------------------------------
// L6 — link liveness
// ---------------------------------------------------------------------------

/**
 * Nightly only, never on a pull request.
 *
 * A gate that goes red because a third party had an outage gets disabled within a month,
 * and a disabled gate is worse than no gate at all. The retrieval itself belongs to
 * `verify:sources` on the nightly profile; what this rule contributes on a pull request
 * is the honest record that it did NOT run.
 */
export function L6_linkLiveness(
  files: readonly LintFile[],
  options: LintOptions = {},
): RuleReport {
  const profile = options.profile ?? 'pull-request';
  if (profile !== 'nightly') {
    return skipped(
      'L6',
      'link liveness',
      'link liveness runs on the nightly profile only — a contributor\'s pull request must never be red because a third party had an outage. The retrieval itself is verify:sources.',
    );
  }

  // On the nightly profile this rule enumerates what must be retrieved; the retrieval is
  // verify-sources' job, so the rule reports the workload rather than performing it.
  let count = 0;
  for (const file of files) {
    for (const { fact } of factsOf(file.record)) count += fact.sources.length;
  }
  return skipped(
    'L6',
    'link liveness',
    `${count} sources are queued for live re-verification by verify:sources on this nightly run`,
  );
}

// ---------------------------------------------------------------------------
// L7 — letter coverage
// ---------------------------------------------------------------------------

/**
 * Every country whose legal basis is not pending must have an English letter template.
 *
 * `packages/letters` does not exist until Phase 5. The rule is authored NOW and
 * short-circuits to a recorded SKIP while the package is absent — not deleted, and not
 * faked into a pass. A recorded skip is the honest state, and it arms itself
 * automatically on the day the directory appears.
 */
export function L7_letterCoverage(
  files: readonly LintFile[],
  options: LintOptions = {},
): RuleReport {
  const lettersDir = options.lettersDir;
  if (lettersDir === undefined || !existsSync(lettersDir)) {
    return skipped(
      'L7',
      'letter coverage',
      `packages/letters does not exist yet (Phase 5), so no country can have a template. The rule is authored and arms itself automatically when the directory appears — it is not faked into a pass.`,
    );
  }

  const templates = new Set(
    readdirSync(lettersDir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name.toLowerCase()),
  );

  const findings: LintFinding[] = [];
  for (const file of files) {
    const code = codeOf(file.record);
    const basis = factsOf(file.record).find((f) => f.path === 'article_7.legal_basis');
    if (basis === undefined || basis.fact.status === 'pending_verification') continue;
    const expected = `${code.toLowerCase()}.en.md`;
    if (!templates.has(expected)) {
      findings.push(
        finding(
          'L7',
          'error',
          file.path,
          `${code} has a non-pending article_7.legal_basis (status "${basis.fact.status}") but no English letter template — expected ${expected} in the letters package. A country whose law we state is a country a worker can write to`,
        ),
      );
    }
  }

  return report('L7', 'letter coverage', findings);
}

// ---------------------------------------------------------------------------
// L8 — freshness
// ---------------------------------------------------------------------------

/**
 * The D-10 split, delegated for the half that matters.
 *
 * The HARD half — a launch country's legally-operative verified fact past its TTL — is
 * `freshnessGate`'s, imported rather than restated, so the rule that can stop a release
 * exists in exactly one file. The SOFT half is computed here: everything else that is
 * stale warns and degrades in the UI with its last-confirmed date, because an unrelated
 * typo fix on a Tuesday must not be undeployable because a non-launch country's
 * verification lapsed on Monday.
 */
export function L8_freshness(files: readonly LintFile[], options: LintOptions = {}): RuleReport {
  const today = options.today ?? todayIso();
  const findings: LintFinding[] = [];

  for (const failure of freshnessGate(
    files.map((f) => f.record),
    today,
  )) {
    const file = files.find((f) => codeOf(f.record) === failure.country);
    findings.push(
      finding(
        'L8',
        'error',
        `${file?.path ?? failure.country}#${failure.field}`,
        failure.message,
      ),
    );
  }

  const hardFailed = new Set(
    findings.map((f) => f.path),
  );

  for (const file of files) {
    const code = codeOf(file.record);
    for (const { path, fact } of factsOf(file.record)) {
      if (fact.status !== 'verified') continue;
      const where = `${file.path}#${path}`;
      if (hardFailed.has(where)) continue;
      const volatility = fact.volatility as Volatility;
      if (freshnessOf(fact.verified_at, volatility, today) !== 'stale') continue;
      findings.push(
        finding(
          'L8',
          'warning',
          where,
          `${where} was last confirmed ${
            fact.verified_at ?? 'never'
          } and is past its ${volatility} window. ${
            isLaunchCountry(code)
              ? 'It is not a legally-operative field, so this warns rather than blocking'
              : `${code} is not a launch country, so this warns rather than blocking`
          } — the UI degrades it with its last-confirmed date`,
        ),
      );
    }
  }

  return report('L8', 'freshness — hard for launch-country operative facts, warn elsewhere', findings);
}

// ---------------------------------------------------------------------------
// L9 — the promotion boundary
// ---------------------------------------------------------------------------

/**
 * A file under `proposed/` may not carry a verified fact.
 *
 * This is what makes the promotion boundary STRUCTURAL rather than a matter of review
 * discipline. A contributor gets a merged pull request — a real one, with their name on
 * it — and merging alone cannot make the site more confident. Only a maintainer's
 * promotion into `data/`, which records `verified_by`, can do that.
 */
export function L9_proposedCannotVerify(files: readonly LintFile[]): RuleReport {
  const findings: LintFinding[] = [];
  for (const file of files) {
    for (const { path, fact } of factsOf(file.record)) {
      if (fact.status !== 'verified') continue;
      const where = `${file.path}#${path}`;
      findings.push(
        finding(
          'L9',
          'error',
          where,
          `${where} is verified, but it lives in proposed/. Merging alone cannot make the site more confident: promotion into data/ is a maintainer action that records verified_by. Leave this field pending_verification and describe the evidence in the proposal`,
        ),
      );
    }
  }
  return report('L9', 'a proposed file cannot carry a verified fact', findings);
}

// ---------------------------------------------------------------------------
// The unchanged-bump rule
// ---------------------------------------------------------------------------

/**
 * A `verified_at` that advanced while its value stood still.
 *
 * Delegated to `assertNoUnchangedBump` — literally invoked, and its thrown message
 * carried through, so the wording a maintainer reads is the wording the one
 * implementation produces. Catching a throw rather than reading a list is deliberate:
 * calling the ASSERT form is what pins the delegation, and a second copy of the walk
 * here would be exactly the drift the rule exists to prevent.
 */
function bumpRule(files: readonly LintFile[], options: LintOptions): RuleReport {
  const previous = options.previous;
  if (previous === undefined || Object.keys(previous).length === 0) {
    return skipped(
      'BUMP',
      'a date cannot move without a value moving',
      'no base-branch revision was supplied, so there is no change to judge. CI supplies it from the pull request base.',
    );
  }

  const findings: LintFinding[] = [];
  for (const file of files) {
    const before = previous[file.path];
    if (before === undefined) continue;
    try {
      assertNoUnchangedBump(before, file.record);
    } catch (error) {
      findings.push(
        finding(
          'BUMP',
          'error',
          file.path,
          `${file.path}: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    }
  }

  return report('BUMP', 'a date cannot move without a value moving', findings);
}

// ---------------------------------------------------------------------------
// The aggregate
// ---------------------------------------------------------------------------

/**
 * Every rule, over both directories, in report order.
 *
 * `data` and `proposed` are passed separately rather than concatenated because three
 * rules are directory-specific: L1 counts the live set and must not see proposals, and
 * L9 judges proposals and has nothing to say about the live set.
 */
export function lintAll(
  input: { data: readonly LintFile[]; proposed: readonly LintFile[] },
  options: LintOptions = {},
): LintReport {
  const all = [...input.data, ...input.proposed];

  const rules: RuleReport[] = [
    L1_fileCoverage(input.data),
    L2_verifiedHasSource(all, options),
    L3_pendingIsNull(all),
    L4_noUnsourcedStatute(all),
    L5_urlHygiene(all),
    L6_linkLiveness(all, options),
    L7_letterCoverage(input.data, options),
    L8_freshness(input.data, options),
    L9_proposedCannotVerify(input.proposed),
    bumpRule(all, options),
  ];

  const findings = rules.flatMap((r) => r.findings);
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  return { rules, errors, warnings, ok: errors.length === 0 };
}
