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

import { AllowlistViolation, assertFetchable, assertLinkable } from './allowlist.ts';
import { EU_COUNTRY_CODES, factAt, FACT_PATHS, isLaunchCountry } from './country.ts';
import {
  assertNoUnchangedBump,
  freshnessGate,
  freshnessOf,
  staleEtagClaims,
} from './freshness.ts';
import { harvestedUrlIssues, sourceUrlIssues } from './schema.ts';
import type { Volatility } from './schema.ts';

/** The nine numbered policy rules, in report order. */
export const RULE_IDS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'] as const;

/**
 * `BUMP` is not a numbered rule: L1–L9 each judge the tree as it stands, while this rule
 * judges a CHANGE. It is reported alongside them because a maintainer reading the summary
 * needs one list, not two.
 *
 * It carries two findings families, both instances of one principle — a claim may not
 * move without the evidence for it moving:
 *
 *   - `verified_at` advanced while neither the value nor the cited source's `accessed_at`
 *     did (CR-02);
 *   - a source's `anchor` or `scope` changed while its `etag` did not, so the next
 *     conditional GET 304s past the new claim without ever checking it (WR-06).
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
  /**
   * How many subjects the rule actually examined, where "ok" is ambiguous without it.
   *
   * `L6 ok` and `L6 ok (0 of 106 sources checked)` are very different claims, and a rule
   * that transitions from an honest SKIP straight to a green asserting nothing is the
   * failure mode this field exists to make visible. Undefined where the count adds
   * nothing (L1 reports the file set in its own findings).
   */
  checked?: { examined: number; ofTotal: number; unit: string };
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

/**
 * What `verify:sources --report` observed. L6's ONLY input, and the reason it can fire.
 *
 * Structurally identical to `ExercisedReport` in `scripts/verify-sources.ts`, restated
 * here rather than imported because `src/` must not depend on `scripts/`. The split
 * between `unmet` and `unreachable` is made by the script, so the policy about which
 * strategies a run promised to cover lives in exactly one place.
 */
export type ExercisedEvidence = {
  covers: readonly string[];
  exercised: readonly string[];
  attested: readonly string[];
  unmet: readonly string[];
  unreachable: readonly string[];
  awaiting_promotion: readonly string[];
};

export type LintOptions = {
  /** `YYYY-MM-DD`. Injected so a freshness boundary is not a function of the day. */
  today?: string;
  /** L6 is nightly-only; on a pull request it records a skip. */
  profile?: 'pull-request' | 'nightly';
  /** The `verify:sources --report` evidence. Without it L6 skips rather than passing. */
  exercised?: ExercisedEvidence;
  /** Where `packages/letters` will live. L7 skips while it is absent. */
  lettersDir?: string;
  /**
   * Where the letter TEMPLATES live inside `lettersDir`, e.g. `packages/letters/templates`.
   *
   * Explicit rather than inferred. L7 used to call `readdirSync(lettersDir)` and expect
   * `pl.en.md` to sit directly in the package root, beside `package.json` and `README.md`
   * — which no real letters package will do. A rule that guesses another package's layout
   * will be wrong on the day that package is written, and its wrongness looks like a
   * missing template rather than like a wrong assumption.
   *
   * Defaults to `<lettersDir>/templates`, with `<lettersDir>` itself as the fallback when
   * that subdirectory does not exist, so an early Phase 5 layout still arms the rule.
   */
  lettersTemplatesDir?: string;
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
 * EVERY url in the record is https, carries no tracking parameter, and sits on a host
 * that country's allowlist names.
 *
 * "Every" is the load-bearing word and it was not always true. This rule used to visit
 * only `sources[]`, which is roughly a third of the URLs a record holds — so a community
 * pull request could put `javascript:alert(document.cookie)` in
 * `enforcement.equality_body.value[0].complaint_url`, the field the site renders under
 * the words "file a complaint with your equality body", and pass both schema parse and
 * the full lint with zero findings. The schema now types every one of those fields
 * `SafeUrl`, so the state is unrepresentable; this rule is the second wall, because the
 * lint also runs over `proposed/` records and over hand-edited JSON that has not been
 * through `CountryRecord.parse` yet.
 *
 * THREE TIERS, deliberately distinct — a single blanket rule would either be too weak to
 * stop a phishing host or too strong to express a legitimate national link:
 *
 *   1. SCHEME AND SHAPE (`sourceUrlIssues` / `harvestedUrlIssues`) applies to every URL
 *      in the record without exception, and is always an ERROR. A `javascript:` URL must
 *      be impossible to express anywhere.
 *   2. FETCH-ALLOWLIST membership (`assertFetchable`) applies to `sources[].url` and to
 *      `transposition.draft_asserting_sources[]`, which the record invariant already
 *      requires to be a subset of the cited source URLs. These are the URLs CI actually
 *      connects to, so they answer the forgery question (T-1-07).
 *   3. LINK-ALLOWLIST membership (`assertLinkable`) applies to the fields the SITE
 *      renders as an official link — the equality body, the labour inspectorate, the
 *      filing authority, the statute. That is the phishing question (T-1-08) and it has
 *      its own, wider list, because putting a complaint form on the FETCH list to permit
 *      a link would buy a phishing control by paying in outbound surface.
 *
 * `discovery_hints[].national_link` sits under tier 1 only. It is harvested verbatim
 * from the Commission's own register — its provenance IS that register — and the seven
 * hosts it names today are national registers nobody has curated. Holding it to a
 * curated list would make the rule red on 93 legitimate links in the committed tree,
 * which is how a gate gets disabled.
 *
 * The host halves DELEGATE to `allowlist.ts`. That is not tidiness: a second host matcher
 * here would have to re-derive the label-boundary rule that stops `evil-legislation.mt`
 * matching `legislation.mt`, and the second implementation is the one that gets it wrong.
 * The test asserts the delegation by requiring the finding's `cause` to be an
 * `AllowlistViolation`.
 */

/**
 * Which keys hold a URL. A rule about NAMES, not a list of dotted paths, because a list
 * of paths is exactly what went stale and produced this bug: a field added next year
 * called `appeal_url` is covered the day it is written, with no second edit here.
 *
 * `art20_designation_source` and `draft_asserting_sources` are why `source`/`sources` is
 * in the alternation.
 */
const URL_BEARING_KEY = /(^|_)(url|uri|link|source|sources)$/;

/** Keys held to scheme hygiene only, never to a curated host list. See the docblock. */
const HARVESTED_URL_KEYS: ReadonlySet<string> = new Set(['national_link']);

/** Keys whose host must be FETCHABLE (tier 2) rather than merely linkable (tier 3). */
const FETCHED_URL_KEYS: ReadonlySet<string> = new Set(['draft_asserting_sources', 'sources']);

/**
 * Schemes that are never a link, on ANY key, whatever it is called.
 *
 * This is the backstop that cannot go stale. `URL_BEARING_KEY` is a naming convention and
 * conventions get broken; a stored `javascript:` string is stored XSS regardless of which
 * field it arrived in, so it is rejected on every string leaf in the record. The leading
 * whitespace/control class is not decoration: browsers strip leading control characters
 * before resolving a scheme, so `"\u0009javascript:…"` is a live href.
 */
const DANGEROUS_SCHEME =
  /^[\s\u0000-\u001f]*(javascript|data|vbscript|file)[\s\u0000-\u001f]*:/i;

export function L5_urlHygiene(files: readonly LintFile[]): RuleReport {
  const findings: LintFinding[] = [];

  for (const file of files) {
    const country = codeOf(file.record);
    const seen = new Set<string>();

    /** Tier 2 or tier 3 host membership, whichever this key calls for. */
    const checkHost = (url: string, key: string, where: string): void => {
      const guard = FETCHED_URL_KEYS.has(key) ? assertFetchable : assertLinkable;
      try {
        guard(url, country);
      } catch (error) {
        if (!(error instanceof AllowlistViolation)) throw error;
        findings.push(finding('L5', 'error', where, `${where} — ${error.message}`, error));
      }
    };

    const visitSource = (source: unknown, where: string): void => {
      if (!isRecordLike(source)) return;
      const url = source['url'];
      if (typeof url !== 'string') return;
      if (seen.has(where)) return;
      seen.add(where);

      for (const issue of sourceUrlIssues(url)) {
        findings.push(finding('L5', 'error', where, `${where} — ${url}: ${issue}`));
      }
      checkHost(url, 'sources', where);
    };

    /**
     * Every string leaf, with the key that owns it. A string inside an array inherits the
     * array's key, which is what makes `draft_asserting_sources[0]` classifiable.
     */
    const visitString = (value: string, key: string, where: string): void => {
      if (DANGEROUS_SCHEME.test(value)) {
        findings.push(
          finding(
            'L5',
            'error',
            where,
            `${where} — ${JSON.stringify(value)}: a javascript:, data:, vbscript: or file: URL is never a link. Stored here it is stored XSS the moment the site renders the field`,
          ),
        );
        return;
      }
      if (!URL_BEARING_KEY.test(key)) return;
      if (seen.has(where)) return;
      seen.add(where);

      const harvested = HARVESTED_URL_KEYS.has(key);
      const issues = harvested ? harvestedUrlIssues(value) : sourceUrlIssues(value);
      for (const issue of issues) {
        findings.push(finding('L5', 'error', where, `${where} — ${value}: ${issue}`));
      }
      // An unparseable or off-scheme URL has already been reported; running the host
      // guard on it would report the same string twice under a less useful reason.
      if (issues.length > 0 || harvested) return;
      checkHost(value, key, where);
    };

    const walk = (node: unknown, path: string, key: string): void => {
      if (typeof node === 'string') {
        visitString(node, key, `${file.path}#${path}`);
        return;
      }
      if (Array.isArray(node)) {
        node.forEach((child, i) => walk(child, `${path}[${i}]`, key));
        return;
      }
      if (!isRecordLike(node)) return;
      for (const childKey of Object.keys(node)) {
        const child = node[childKey];
        if (childKey === 'sources' && Array.isArray(child)) {
          child.forEach((source, i) => visitSource(source, `${file.path}#${path}.sources[${i}]`));
          continue;
        }
        walk(child, `${path}.${childKey}`, childKey);
      }
    };

    walk(file.record, '', '');
  }

  return report('L5', 'url hygiene — https, no tracking, allowlisted host', findings);
}

// ---------------------------------------------------------------------------
// L6 — link liveness
// ---------------------------------------------------------------------------

/**
 * Nightly only, never on a pull request — and on the nightly profile it now REPORTS.
 *
 * A gate that goes red because a third party had an outage gets disabled within a month,
 * so the pull-request branch still records an honest skip and that stays.
 *
 * The nightly branch used to record a skip too. BOTH branches returned `skipped(...)`,
 * which meant L6 could not produce a finding under any input — and `validate.ts`
 * hardcoded `profile: 'pull-request'` anyway, so the nightly branch was unreachable from
 * every caller except its own unit test. A rule that cannot fire is worse than an absent
 * rule, because the summary prints it in the list of nine and a maintainer counts it.
 *
 * It still performs no retrieval: this module is READ-ONLY and offline by construction,
 * and a rule reporting on retrieval it did not observe is precisely the vacuous gate the
 * skip was hiding. Instead it consumes the evidence `verify:sources --report` wrote, and
 * turns it into findings in the one summary a maintainer reads at 9am:
 *
 *   - UNMET       (error)   the run promised a body for that strategy and none arrived.
 *   - UNREACHABLE (warning) no retrieval layer exists for that strategy at all. Visible,
 *                           because 86 sources reported as `queued (not exercised)` and
 *                           never reaching an annotation is how "PASSED" came to be
 *                           printed over 11% coverage.
 *   - no evidence (skip)    the nightly profile was selected but nothing was supplied.
 *                           Still a skip, never a pass — L6 will not report a green it
 *                           did not earn.
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
      'link liveness runs on the nightly profile only \u2014 a contributor\'s pull request must never be red because a third party had an outage. The retrieval itself is verify:sources.',
    );
  }

  const evidence = options.exercised;
  if (evidence === undefined) {
    // Deliberately not an error: the nightly may legitimately run during an outage, when
    // the probe step is skipped and no evidence exists. Deliberately not a pass either.
    let queued = 0;
    for (const file of files) {
      for (const { fact } of factsOf(file.record)) queued += fact.sources.length;
    }
    return skipped(
      'L6',
      'link liveness',
      `the nightly profile was selected but no verify:sources evidence was supplied \u2014 pass --exercised <report.json>, written by \`verify:sources --report\`. ${queued} record sources went unexamined. This rule retrieves nothing itself, and will not report a pass it did not earn.`,
    );
  }

  const findings: LintFinding[] = [];
  for (const where of evidence.unmet) {
    findings.push(
      finding(
        'L6',
        'error',
        where,
        `${where} was NOT exercised, although this run named [${evidence.covers.join(', ')}] as strategies it would supply a body for. Either the retrieval step did not run, or it wrote the body under a name suppliedBody does not look for \u2014 do not resolve this by narrowing --require-exercised`,
      ),
    );
  }
  for (const where of evidence.unreachable) {
    findings.push(
      finding(
        'L6',
        'warning',
        where,
        `${where} was not exercised: no retrieval layer supplies a body for its strategy on this profile. Reported as NOT EXERCISED, never as a pass`,
      ),
    );
  }

  const total =
    evidence.exercised.length +
    evidence.attested.length +
    evidence.unmet.length +
    evidence.unreachable.length +
    evidence.awaiting_promotion.length;

  return {
    ...report('L6', 'link liveness \u2014 nightly, from verify:sources evidence', findings),
    checked: {
      examined: evidence.exercised.length + evidence.attested.length,
      ofTotal: total,
      unit: 'sources',
    },
  };
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
      `packages/letters does not exist yet (Phase 5), so no country can have a template. The rule is authored and arms itself automatically when the directory appears \u2014 it is not faked into a pass.`,
    );
  }

  // Explicit, not inferred. See `LintOptions.lettersTemplatesDir`.
  const conventional = resolvePath(lettersDir, 'templates');
  const templatesDir =
    options.lettersTemplatesDir ?? (existsSync(conventional) ? conventional : lettersDir);

  const templates = new Set(
    readdirSync(templatesDir, { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile())
      .map((e) => e.name.toLowerCase()),
  );

  const findings: LintFinding[] = [];
  let examined = 0;
  for (const file of files) {
    const code = codeOf(file.record);
    const basis = factsOf(file.record).find((f) => f.path === 'article_7.legal_basis');
    if (basis === undefined || basis.fact.status === 'pending_verification') continue;
    examined += 1;
    const expected = `${code.toLowerCase()}.en.md`;
    if (!templates.has(expected)) {
      findings.push(
        finding(
          'L7',
          'error',
          file.path,
          `${code} has a non-pending article_7.legal_basis (status "${basis.fact.status}") but no English letter template \u2014 expected ${expected} under ${templatesDir}. A country whose law we state is a country a worker can write to`,
        ),
      );
    }
  }

  return {
    ...report('L7', 'letter coverage', findings),
    // The count is the whole point. The rule `continue`s past every country whose
    // `article_7.legal_basis` is `pending_verification`, and all 27 are pending today — so
    // the day `packages/letters` appears it would flip from an honest SKIP straight to a
    // green having examined ZERO countries. `L7 ok (0 of 27 countries checked)` and
    // `L7 ok (5 of 27 countries checked)` are very different claims, and only one of them
    // is worth the line it occupies in the summary.
    checked: { examined, ofTotal: files.length, unit: 'countries' },
  };
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
      'a claim cannot move without its evidence moving',
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

    // The same principle one level down, on the source rather than the fact: a claim that
    // moves while the ETag that would 304 past it stays put is a claim nothing will ever
    // check. See `staleEtagClaims`.
    for (const claim of staleEtagClaims(before, file.record)) {
      findings.push(finding('BUMP', 'error', file.path, `${file.path}: ${claim.message}`));
    }
  }

  return report('BUMP', 'a claim cannot move without its evidence moving', findings);
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
