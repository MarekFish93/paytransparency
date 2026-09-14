/**
 * `validate:country-data` — schema parse, then the policy lint, then the cross-artefact
 * referential pass.
 *
 * RED SKELETON. `loadRecords` is plumbing the suite needs in order to run at all;
 * `assertFallbackKeysResolve` is the behaviour under test and is implemented in the
 * GREEN commit.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { LintFile } from '../src/lint.ts';

/**
 * Every country or proposal record in `dir`, sorted by path so a report is stable.
 *
 * Files whose stem begins with `_` are the SHARED, non-country records (`_allowlist`,
 * `_directive`) — `data/`'s own convention, and the same rule `coverage.test.ts` counts
 * the 27 member-state files by.
 */
export function loadRecords(dir: string): LintFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
    .sort()
    .map((name) => ({
      path: `${dir.replace(/\\/g, '/').split('/').slice(-1)[0]}/${name}`,
      record: JSON.parse(readFileSync(resolve(dir, name), 'utf8')) as unknown,
    }));
}

export function assertFallbackKeysResolve(
  _corpus: Record<string, unknown>,
  _files: readonly LintFile[],
): void {
  // GREEN commit implements this.
}
