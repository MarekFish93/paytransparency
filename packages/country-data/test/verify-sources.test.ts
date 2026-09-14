/**
 * `verify:sources` — the hand-off from the nightly probe, and the nightly probe itself.
 *
 * Two defects are pinned here, and both were the same shape: a gate that reported green
 * over bytes it had not read.
 *
 * CR-03 — the `--bodies <dir>` hand-off this script's header described appeared in no
 * workflow. `suppliedBody` was dead code and `pnpm verify:sources` printed
 * `PASSED — 0 data defect` having exercised 12 of 106 sources.
 *
 * CR-04 — the nightly collapsed every source ETag in the corpus into a `Set` and took
 * `[...etags][0]`. The committed corpus holds four distinct ETags across eleven
 * languages, and `[0]` resolved to the English one only because the file happens to be
 * written `eng`-first.
 *
 * Offline by construction. The workflow assertions read the committed YAML; the
 * `suppliedBody` assertions read a temporary directory this file writes and removes.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { suppliedBody, type Candidate } from '../scripts/verify-sources.ts';
import type { Source } from '../src/schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const NIGHTLY = readFileSync(
  resolve(pkgRoot, '..', '..', '.github', 'workflows', 'nightly.yml'),
  'utf8',
);

let bodies: string;

beforeAll(() => {
  bodies = mkdtempSync(resolve(tmpdir(), 'verify-sources-'));
  // Exactly what the nightly probe writes: one whole expression per language, named by
  // its ISO-639-3 code.
  writeFileSync(resolve(bodies, 'cellar-eng.xhtml'), '<html>the English expression</html>');
  writeFileSync(resolve(bodies, 'cellar-pol.xhtml'), '<html>wyrazenie polskie</html>');
  writeFileSync(resolve(bodies, 'cellar-dan.xhtml'), '');
});

afterAll(() => {
  rmSync(bodies, { recursive: true, force: true });
});

const source = (over: Partial<Source> = {}): Source =>
  ({
    url: 'http://publications.europa.eu/resource/cellar/5bbb9daf.0006.03/DOC_1',
    title: 'Directive (EU) 2023/970',
    publisher: 'Publications Office of the European Union',
    kind: 'eu_institution',
    verification: 'cellar',
    anchor: 'For the purposes of this Directive',
    language: 'en',
    accessed_at: '2026-09-11',
    scope: { id: 'art_7', expected_subtitle: 'Right to information' },
    ...over,
  }) as Source;

const candidate = (over: Partial<Source> = {}): Candidate => ({
  where: 'data/_directive.json#32023L0970#007@eng.sources[0]',
  country: 'PL',
  source: source(over),
  verified_by: 'marek',
  verified_at: '2026-09-11',
  awaitingPromotion: false,
});

describe('suppliedBody matches a fetched body to the source it was fetched FOR', () => {
  it('hands a cellar source the expression in ITS language', () => {
    expect(suppliedBody(candidate({ language: 'en' }), bodies)?.body).toContain(
      'the English expression',
    );
    expect(suppliedBody(candidate({ language: 'pl' }), bodies)?.body).toContain(
      'wyrazenie polskie',
    );
  });

  it('never hands a Polish citation the English body', () => {
    // The same class of error as comparing a live English ETag against a stored Czech one:
    // a body in the wrong language is not evidence for this citation.
    const polish = suppliedBody(candidate({ language: 'pl' }), bodies);
    expect(polish?.body).not.toContain('the English expression');
  });

  it('queues a language nothing retrieved, rather than falling back to another', () => {
    expect(suppliedBody(candidate({ language: 'sk' }), bodies)).toBeNull();
  });

  it('refuses to hand a NON-cellar source the cellar body, whatever its language', () => {
    // The bug this assertion exists for: an earlier shape fell back to `fresh-<lang>.xhtml`
    // for any source, so the 38 `metadata-only` sources citing the Publications Office
    // SPARQL endpoint were handed the Cellar English expression and each reported
    // `anchor_absent` against a document it had never cited — 32 fabricated data defects,
    // and a maintainer sent to look for a missing anchor in the wrong document.
    const nim = candidate({
      verification: 'metadata-only',
      url: 'http://publications.europa.eu/webapi/rdf/sparql',
      scope: null,
      language: 'en',
      anchor: '32023L0970',
    });
    expect(suppliedBody(nim, bodies)).toBeNull();
  });

  it('treats a zero-byte file as no body at all', () => {
    // A verifier that passes on an empty 200 is worse than no verifier. The offline
    // equivalent is dispatching a zero-byte body and letting the byte floor blame the
    // publisher for it; `queued` is the honest outcome.
    expect(suppliedBody(candidate({ language: 'da' }), bodies)).toBeNull();
  });
});

describe('the nightly probe compares every language, not whichever key sorts first', () => {
  it('no longer picks a comparison ETag out of a Set by index', () => {
    // Comment lines are excluded on purpose: the header explains the defect verbatim, and
    // that explanation is worth keeping. What must not survive is the EXECUTED form.
    const executable = NIGHTLY.split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');
    expect(executable).not.toContain('[...etags][0]');
  });

  it('sends one request per language and names the language on the comparison', () => {
    expect(NIGHTLY).toContain("for LANG in ${LANGUAGES//,/ }; do");
    expect(NIGHTLY).toContain('-H "Accept-Language: ${LANG}"');
    // The stored side of the comparison must be read FOR THAT LANGUAGE.
    expect(NIGHTLY).toContain('STORED_ETAG="$(stored_field "${LANG}" etag)"');
  });

  it('names only the affected language’s citation keys in the drift annotation', () => {
    // The previous annotation printed all 66 keys regardless of which expression it had
    // read, overstating coverage by an order of magnitude to the maintainer reading it.
    expect(NIGHTLY).toContain('CITATION_KEYS="$(stored_field "${LANG}" keys)"');
    expect(NIGHTLY).toMatch(/Directive \$\{LANG\} expression drifted/);
  });

  it('asserts one ETag per language rather than silently choosing one', () => {
    expect(NIGHTLY).toContain('distinct ETags');
  });

  it('runs under set -e and classifies an unreadable header as an outage, not drift', () => {
    // WR-09. Without `-e`, a grep that matched no ETag left LIVE_ETAG empty and the next
    // comparison told a maintainer the Official Journal text had changed.
    expect(NIGHTLY).toContain('set -euo pipefail');
    expect(NIGHTLY).not.toContain('set -uo pipefail');
    expect(NIGHTLY).toContain('treating as an outage, not as drift');
  });

  it('performs the --bodies hand-off the verifier documents', () => {
    // CR-03: `--bodies` appeared in no workflow at all, so `suppliedBody` was dead code.
    expect(NIGHTLY).toContain('--bodies "${CELLAR_CACHE_DIR}"');
    expect(NIGHTLY).toContain('--require-exercised cellar');
    expect(NIGHTLY).toContain('--profile nightly --exercised');
  });
});
