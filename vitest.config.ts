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
    exclude: ['**/node_modules/**', '**/dist/**', '**/.tsbuild/**', '**/*.live.test.ts'],
    watch: false,
  },
});
