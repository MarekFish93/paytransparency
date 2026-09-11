import { defineConfig } from 'vitest/config';

/**
 * The NIGHTLY-ONLY live profile.
 *
 * `vitest.config.ts` excludes `**\/*.live.test.ts` so no contributor's pull request ever
 * depends on a third party being up. That exclusion cannot be lifted from the command
 * line — vitest APPENDS `--exclude` to the configured list rather than replacing it, and
 * an explicit file path is filtered by the exclusion too — so the only way to run the
 * live suite is a config that does not exclude it. This is that config, and it is
 * referenced from exactly one place: the `live-sources` job in
 * `.github/workflows/nightly.yml`.
 *
 * It is deliberately the INVERSE of the default profile rather than a superset: it runs
 * the live suite and nothing else, so a nightly failure names a live source rather than
 * re-reporting the offline suite `directive-drift` already runs.
 */
export default defineConfig({
  test: {
    include: ['**/test/**/*.live.test.ts'],
    // `.claude/worktrees` holds LIVE executor worktrees — full checkouts of other
    // branches — so without this a local run re-reports a sibling agent's in-progress
    // copy as a live-source failure. CI never has them; only local runs are misled.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.tsbuild/**', '**/.claude/worktrees/**'],
    watch: false,
    // The Publications Office is not fast, and a per-file timeout that fires on a slow
    // but successful response is a false alarm — the one failure mode this whole split
    // exists to prevent.
    testTimeout: 60_000,
  },
});
