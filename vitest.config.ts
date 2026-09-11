import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Deliberately root-relative rather than `packages/*/test/**`: CI and the plan's
    // verification both invoke `vitest run --dir packages/country-data`, which re-roots
    // the glob. A `packages/*`-prefixed include silently matches nothing under `--dir`
    // and vitest exits 0-files — a green run that asserted nothing.
    include: ['**/test/**/*.test.ts'],
    // The network-dependent suite never runs on the PR profile. A third party's outage
    // must not be able to turn a contributor's pull request red; live-source
    // verification belongs to the nightly job.
    // `.claude/worktrees` holds LIVE executor worktrees — full checkouts of other
    // branches. Without this, a local run collects every test twice (once from the real
    // tree, once from a sibling agent's in-progress copy) and reports failures belonging
    // to a branch that was never merged. CI never has them, so only local runs are
    // misled — which is worse, not better.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.tsbuild/**',
      '**/.claude/worktrees/**',
      '**/*.live.test.ts',
    ],
    watch: false,
  },
});
