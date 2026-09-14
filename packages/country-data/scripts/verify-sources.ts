/**
 * `verify:sources` — dispatch every committed source through `verifySource` on its own
 * declared strategy, and report the disposition.
 *
 * THIS SCRIPT NEVER OPENS A CONNECTION. That is deliberate and load-bearing, not an
 * oversight. Retrieval lives in the nightly workflow, which probes Cellar in a step of
 * its own and hands the body here via `--bodies <dir>`; on the pull-request profile the
 * responses come from the committed fixtures. Keeping the retrieval verb outside this
 * file means the pull-request profile cannot accidentally acquire network access by
 * somebody adding a flag, and it means a contributor's pull request can never be red
 * because a third party had an outage.
 *
 * Three outcomes per source, and the third is the point:
 *
 *   - DISPATCHED — a response was available (a committed fixture, or a body the nightly
 *     job placed in `--bodies`), so `verifySource` ran and the disposition is real.
 *   - ATTESTED   — the strategy makes no request at all (`manual-attest`), so the result
 *     is fully determined offline: a dated human attestation, or a defect if it is
 *     missing or stale.
 *   - QUEUED     — no response was available offline. Reported as NOT EXERCISED rather
 *     than as a pass. A verifier that reports green for bytes it never read is exactly
 *     the failure this project's constraints forbid.
 *
 * The allowlist pre-flight runs for every source regardless, because it needs no
 * response: a source URL that could never legally be retrieved is a data defect now, not
 * a surprise at 03:17 tomorrow.
 *
 * Runs under Node's native type stripping — `node packages/country-data/scripts/verify-sources.ts` —
 * so only erasable syntax is used.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AllowlistViolation, assertFetchable } from '../src/allowlist.ts';
import { strategyFor } from '../src/source-strategy.ts';
import { verifySource, type VerifierResponse, type VerifyResult } from '../src/verifier.ts';
import type { Source } from '../src/schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const DATA_DIR = resolve(pkgRoot, 'data');
const PROPOSED_DIR = resolve(pkgRoot, 'proposed');
const FIXTURES = resolve(pkgRoot, 'test', 'fixtures');

const isRecordLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** One source, with everything the verifier needs that the source itself cannot carry. */
type Candidate = {
  /** `data/PL.json#article_7.legal_basis.sources[0]` — what a maintainer opens. */
  where: string;
  /** The country whose allowlist governs this URL. */
  country: string;
  source: Source;
  verified_by: string | null;
  verified_at: string | null;
  /**
   * The source belongs to a `Proposal` rather than to a `Fact`.
   *
   * A proposal carries `drafted_by`/`drafted_at`, never `verified_by`, and by D-11 it
   * CANNOT be verified where it sits — only a maintainer's promotion into `data/` sets
   * that. Dispatching it as though it were a fact would report every proposal's
   * manual-attest source as an unattested defect, which is not a defect at all: it is
   * the promotion boundary working as designed.
   */
  awaitingPromotion: boolean;
};

type Outcome = {
  candidate: Candidate;
  mode: 'dispatched' | 'attested' | 'queued';
  result: VerifyResult | null;
  note: string;
};

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

function collectFrom(record: unknown, file: string, country: string): Candidate[] {
  const out: Candidate[] = [];
  const walk = (node: unknown, path: string, awaitingPromotion: boolean): void => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`, awaitingPromotion));
      return;
    }
    if (!isRecordLike(node)) return;

    if (Array.isArray(node['sources'])) {
      const verified_by = typeof node['verified_by'] === 'string' ? node['verified_by'] : null;
      const verified_at = typeof node['verified_at'] === 'string' ? node['verified_at'] : null;
      (node['sources'] as unknown[]).forEach((source, i) => {
        if (!isRecordLike(source) || typeof source['url'] !== 'string') return;
        out.push({
          where: `${file}#${path === '' ? '(root)' : path}.sources[${i}]`,
          country,
          source: source as unknown as Source,
          verified_by,
          verified_at,
          awaitingPromotion,
        });
      });
    }

    for (const key of Object.keys(node)) {
      if (key === 'sources') continue;
      walk(node[key], `${path}.${key}`, awaitingPromotion || key === 'proposals');
    }
  };
  walk(record, '', false);
  return out;
}

function collectDir(dir: string): Candidate[] {
  const label = dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? dir;
  const out: Candidate[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    const record = JSON.parse(readFileSync(resolve(dir, name), 'utf8')) as unknown;
    const country = name.replace(/\.json$/i, '');
    out.push(...collectFrom(record, `${label}/${name}`, country));
  }
  return out;
}

/**
 * The Directive corpus. Its sources are shared rather than national, so they are
 * governed by the all-countries half of the allowlist — `publications.europa.eu` is in
 * `all`, so any member-state code resolves the same set. `PL` is used as the lookup key
 * and carries no national meaning here.
 */
function collectCorpus(): Candidate[] {
  const corpus = JSON.parse(readFileSync(resolve(DATA_DIR, '_directive.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  const out: Candidate[] = [];
  for (const key of Object.keys(corpus).sort()) {
    const entry = corpus[key];
    if (!isRecordLike(entry) || !Array.isArray(entry['sources'])) continue;
    const verified_by = typeof entry['verified_by'] === 'string' ? entry['verified_by'] : null;
    const verified_at = typeof entry['verified_at'] === 'string' ? entry['verified_at'] : null;
    (entry['sources'] as unknown[]).forEach((source, i) => {
      if (!isRecordLike(source) || typeof source['url'] !== 'string') return;
      out.push({
        where: `data/_directive.json#${key}.sources[${i}]`,
        country: 'PL',
        source: source as unknown as Source,
        verified_by,
        verified_at,
        awaitingPromotion: false,
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Responses, from committed bytes only
// ---------------------------------------------------------------------------

/** A recorded HTTP response: status line, headers, blank line, body. */
function loadEnvelope(path: string): VerifierResponse | null {
  const raw = readFileSync(path, 'utf8');
  const split = raw.indexOf('\n\n');
  if (split < 0) return null;
  const head = raw.slice(0, split).split('\n');
  const match = /^HTTP\/[\d.]+ (\d{3})/.exec(head[0] ?? '');
  if (match === null) return null;
  const headers: Record<string, string> = {};
  for (const line of head.slice(1)) {
    const at = line.indexOf(':');
    if (at < 0) continue;
    headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
  }
  return {
    status: Number(match[1]),
    body: raw.slice(split + 2),
    headers,
    etag: headers['etag'] ?? null,
    lastModified: headers['last-modified'] ?? null,
  };
}

/**
 * The WHOLE-EXPRESSION Cellar captures, by BCP-47 language.
 *
 * Keyed by language and not by article on purpose. A Cellar request returns the entire
 * language expression of the Directive; the verifier then scopes the anchor to the cited
 * article's subtree. `cellar-art3-en.xhtml` and `cellar-art12-en.xhtml` are SUBTREE
 * SLICES sliced from a live pull for the extraction tests — 16 KB and 1.7 KB — not
 * responses. Feeding a slice to a strategy whose 100,000-byte floor is calibrated against
 * the 193,564-byte expression reports a data defect that does not exist, and would invite
 * somebody to "fix" it by lowering the floor. The floor is right; the slice is not a
 * response.
 */
const WHOLE_EXPRESSION_BY_LANGUAGE: Record<string, string> = {
  en: 'cellar-art7-en.xhtml',
  pl: 'cellar-art7-pl.xhtml',
};

/**
 * The committed fixture that stands in for a live response, chosen by what the source
 * actually asks for rather than by host alone: a Cellar source is scoped to one article
 * in one language, so a Polish citation must not be checked against the English body.
 *
 * A source with no registered fixture is QUEUED, never assumed.
 */
function fixtureFor(candidate: Candidate): VerifierResponse | null {
  const { source } = candidate;
  const host = new URL(source.url).hostname.toLowerCase();

  if (source.verification === 'cellar') {
    const name = WHOLE_EXPRESSION_BY_LANGUAGE[source.language.toLowerCase()];
    if (name === undefined) return null;
    const path = resolve(FIXTURES, name);
    if (!existsSync(path)) return null;
    return {
      status: 200,
      body: readFileSync(path, 'utf8'),
      headers: {},
      etag: source.etag ?? null,
      lastModified: source.last_modified ?? null,
    };
  }

  if (host === 'legislation.mt' || host.endsWith('.legislation.mt')) {
    return loadEnvelope(resolve(FIXTURES, 'legislation-mt-jsonld.html'));
  }

  return null;
}

/** A body the nightly job already retrieved, named after the source's scope + language. */
function suppliedBody(candidate: Candidate, bodiesDir: string): VerifierResponse | null {
  const { source } = candidate;
  const scope = source.scope === null ? 'body' : source.scope.id;
  for (const name of [
    `${scope}-${source.language.toLowerCase()}.xhtml`,
    `${scope}-${source.language.toLowerCase()}.html`,
    'fresh.xhtml',
  ]) {
    const path = resolve(bodiesDir, name);
    if (existsSync(path)) {
      return {
        status: 200,
        body: readFileSync(path, 'utf8'),
        headers: {},
        etag: source.etag ?? null,
        lastModified: source.last_modified ?? null,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export function dispatch(candidate: Candidate, bodiesDir: string | null): Outcome {
  // Pre-flight. Needs no response, so it runs for every source including the queued ones.
  try {
    assertFetchable(candidate.source.url, candidate.country);
  } catch (error) {
    if (!(error instanceof AllowlistViolation)) throw error;
    return {
      candidate,
      mode: 'dispatched',
      result: { disposition: 'data_defect', reason: 'allowlist_violation', message: error.message },
      note: 'rejected before any request could be issued',
    };
  }

  // D-11: a proposal cannot be verified where it sits. Dispatching it as a fact would
  // report every proposal's manual-attest source as an unattested defect — which is the
  // promotion boundary working, not a defect. The allowlist pre-flight above is the check
  // that genuinely belongs at proposal time, and it has already run.
  if (candidate.awaitingPromotion) {
    return {
      candidate,
      mode: 'queued',
      result: null,
      note: 'awaiting maintainer promotion — a proposal carries drafted_by, never verified_by, and only promotion into data/ can verify it (D-11)',
    };
  }

  const context = {
    countryCode: candidate.country,
    verified_by: candidate.verified_by,
    verified_at: candidate.verified_at,
  };

  if (!strategyFor(candidate.source.verification).requiresFetch) {
    return {
      candidate,
      mode: 'attested',
      result: verifySource(candidate.source, {}, context),
      note: 'no request is made by this strategy — the result is fully determined offline',
    };
  }

  const response =
    (bodiesDir === null ? null : suppliedBody(candidate, bodiesDir)) ?? fixtureFor(candidate);

  if (response === null) {
    return {
      candidate,
      mode: 'queued',
      result: null,
      note: `no committed fixture or supplied body stands in for this ${candidate.source.verification} source — NOT exercised here; the network disposition belongs to the nightly job`,
    };
  }

  return {
    candidate,
    mode: 'dispatched',
    result: verifySource(candidate.source, response, context),
    note: bodiesDir === null ? 'against the committed fixture' : 'against the supplied body',
  };
}

function main(): number {
  const args = process.argv.slice(2);
  const bodiesAt = args.indexOf('--bodies');
  const bodiesDir = bodiesAt === -1 ? null : (args[bodiesAt + 1] ?? null);
  if (bodiesAt !== -1 && (bodiesDir === null || !existsSync(bodiesDir))) {
    process.stderr.write(`--bodies requires an existing directory (got ${String(bodiesDir)})\n`);
    return 1;
  }

  const candidates = [...collectDir(DATA_DIR), ...collectDir(PROPOSED_DIR), ...collectCorpus()];
  process.stdout.write(
    `verify:sources — ${candidates.length} committed sources, ${
      bodiesDir === null ? 'committed fixtures only' : `bodies from ${bodiesDir}`
    }\n\n`,
  );

  const outcomes = candidates.map((c) => dispatch(c, bodiesDir));
  const defects = outcomes.filter((o) => o.result?.disposition === 'data_defect');

  const byDisposition = new Map<string, number>();
  for (const outcome of outcomes) {
    const key = outcome.result === null ? 'queued (not exercised)' : outcome.result.disposition;
    byDisposition.set(key, (byDisposition.get(key) ?? 0) + 1);
  }
  for (const [key, count] of [...byDisposition].sort()) {
    process.stdout.write(`  ${String(count).padStart(4)}  ${key}\n`);
  }

  if (defects.length > 0) {
    process.stdout.write('\nData defects:\n');
    for (const defect of defects) {
      process.stdout.write(
        `  x ${defect.candidate.where}\n      [${defect.result?.reason ?? 'unknown'}] ${
          defect.result?.message ?? ''
        }\n`,
      );
    }
  }

  process.stdout.write(
    `\n${defects.length === 0 ? 'PASSED' : 'FAILED'} — ${defects.length} data defect\n`,
  );
  return defects.length === 0 ? 0 : 1;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && resolve(invokedPath) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
