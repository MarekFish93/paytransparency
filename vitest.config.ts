import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    // The network-dependent suite never runs on the PR profile. A third
    // party's outage must not be able to turn a contributor's PR red;
    // live-source verification belongs to the nightly job.
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.live.test.ts'],
    watch: false,
  },
});
