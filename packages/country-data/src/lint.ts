/**
 * The policy lint — L1 through L9, layered on top of schema parse.
 *
 * RED SKELETON. The signatures exist so the suite loads and fails on its assertions
 * rather than on module resolution; the rules are implemented in the GREEN commit.
 */

export const RULE_IDS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'] as const;
export type RuleId = (typeof RULE_IDS)[number] | 'BUMP';

export type Severity = 'error' | 'warning';

export type LintFinding = {
  rule: RuleId;
  severity: Severity;
  path: string;
  message: string;
  cause?: unknown;
};

export type RuleReport = {
  rule: RuleId;
  title: string;
  severity: Severity;
  findings: LintFinding[];
  skipped: boolean;
  skipReason: string | null;
};

export type LintFile = { path: string; record: unknown };

export type LintOptions = {
  today?: string;
  profile?: 'pull-request' | 'nightly';
  lettersDir?: string;
  previous?: Record<string, unknown>;
};

export type LintReport = {
  rules: RuleReport[];
  errors: LintFinding[];
  warnings: LintFinding[];
  ok: boolean;
};

const empty = (rule: RuleId, title: string): RuleReport => ({
  rule,
  title,
  severity: 'error',
  findings: [],
  skipped: false,
  skipReason: null,
});

export function L1_fileCoverage(_files: readonly LintFile[]): RuleReport {
  return empty('L1', 'file coverage');
}

export function L2_verifiedHasSource(
  _files: readonly LintFile[],
  _options: LintOptions = {},
): RuleReport {
  return empty('L2', 'verified facts carry their justification');
}

export function L3_pendingIsNull(_files: readonly LintFile[]): RuleReport {
  return empty('L3', 'pending facts hold null');
}

export function L4_noUnsourcedStatute(_files: readonly LintFile[]): RuleReport {
  return empty('L4', 'a statute string must be evidenced');
}

export function L5_urlHygiene(_files: readonly LintFile[]): RuleReport {
  return empty('L5', 'url hygiene');
}

export function L6_linkLiveness(
  _files: readonly LintFile[],
  _options: LintOptions = {},
): RuleReport {
  return empty('L6', 'link liveness');
}

export function L7_letterCoverage(
  _files: readonly LintFile[],
  _options: LintOptions = {},
): RuleReport {
  return empty('L7', 'letter coverage');
}

export function L8_freshness(_files: readonly LintFile[], _options: LintOptions = {}): RuleReport {
  return empty('L8', 'freshness');
}

export function L9_proposedCannotVerify(_files: readonly LintFile[]): RuleReport {
  return empty('L9', 'a proposed file cannot carry a verified fact');
}

export function lintAll(
  _input: { data: readonly LintFile[]; proposed: readonly LintFile[] },
  _options: LintOptions = {},
): LintReport {
  return { rules: [], errors: [], warnings: [], ok: true };
}
