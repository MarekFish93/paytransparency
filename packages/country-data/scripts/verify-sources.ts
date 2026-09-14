/**
 * `verify:sources` — dispatch every committed source through `verifySource` on its own
 * declared strategy, and report the disposition.
 *
 * THIS SCRIPT NEVER OPENS A CONNECTION. That is deliberate and load-bearing, not an
 * oversight. Retrieval lives in the nightly workflow (`nightly.yml`, step "Hand the
 * fetched bodies to the verifier"), which probes Cellar in a step of its own and hands
 * the bodies here via `--bodies <dir>`; on the pull-request profile the responses come
 * from the committed fixtures. Keeping the retrieval verb outside this file means the
 * pull-request profile cannot accidentally acquire network access by somebody adding a
 * flag, and it means a contributor's pull request can never be red because a third
 * party had an outage.
 *
 * THAT WIRING IS LOAD-BEARING AND WAS ONCE ABSENT. For one revision this header
 * described a `--bodies` hand-off that appeared in no workflow: `suppliedBody` was dead
 * code, the only caller was the offline pull-request profile, and the script reported
 * `PASSED — 0 data defect` having exercised 12 of 106 sources. `queued` was silently a
 * pass. If you are about to remove the nightly step, delete `--bodies` with it and say
 * plainly in the docs that live verification is not implemented — do not leave a hand-off
 * described here that nothing performs.
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
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
export type Candidate = {
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

export type Outcome = {
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

/** The record's own declared country code, or `''` when it has none. */
function declaredCodeOf(record: unknown): string {
  if (!isRecordLike(record)) return '';
  const country = record['country'];
  if (!isRecordLike(country)) return '';
  return typeof country['code'] === 'string' ? country['code'] : '';
}

/**
 * Which country's allowlist governs a file's sources.
 *
 * THE RECORD'S OWN `country.code` WINS, not the filename. This used to be
 * `name.replace(/\.json$/i, '')`, and the two entry points then disagreed about what
 * country a file is: L1 asserts filename and `country.code` agree, but L1 lives in
 * `validate:country-data` and `legal-data.yml` runs the two as independent steps in the
 * same job, so L1's verdict does not gate this script. The scenario L1's own comment
 * describes — "a contributor copies SK.json to CZ.json and forgets country.code" — is
 * exactly the case where it matters: the Slovak sources would be evaluated against
 * Czechia's empty register list, or the reverse.
 *
 * A disagreement is reported here too rather than trusted silently, so a mis-named file is
 * a named defect in whichever entry point the maintainer happens to run first.
 */
export function countryForFile(record: unknown, fileName: string): { country: string; mismatch: string | null } {
  const stem = fileName.replace(/\.json$/i, '');
  const declared = declaredCodeOf(record);
  if (declared === '') {
    return {
      country: stem,
      mismatch: `${fileName} declares no country.code, so its sources are being checked against the allowlist for "${stem}" — the filename — which nothing verifies`,
    };
  }
  if (declared !== stem) {
    return {
      country: declared,
      mismatch: `${fileName} declares country.code "${declared}" — its sources are checked against that country's allowlist, not "${stem}"'s. One of the two is wrong (L1 says which); until it is fixed this file is being read as ${declared}`,
    };
  }
  return { country: declared, mismatch: null };
}

/** Naming disagreements found while collecting. Reported by `main`, never swallowed. */
const collectionWarnings: string[] = [];

function collectDir(dir: string): Candidate[] {
  const label = dir.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? dir;
  const out: Candidate[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.json') || name.startsWith('_')) continue;
    const record = JSON.parse(readFileSync(resolve(dir, name), 'utf8')) as unknown;
    const { country, mismatch } = countryForFile(record, name);
    if (mismatch !== null) collectionWarnings.push(`${label}/${mismatch}`);
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

/**
 * A recorded HTTP response: status line, headers, blank line, body.
 *
 * THROWS rather than returning null on a capture it cannot parse, and that is the point.
 *
 * It used to return `null`, `fixtureFor` propagated the null, and `dispatch` turned that
 * into `mode: 'queued'` — a pass. The eur-lex 202-empty and e-tar 403-interstitial captures
 * are registered here precisely so that citing those hosts is a deterministic offline
 * FAILURE rather than a "queued, not exercised" that quietly passes. If either file were
 * corrupted, renamed, or had its blank line normalised away by an editor, that property
 * disappeared with no signal at all. A missing file already threw, from `readFileSync` — so
 * the two failure modes were inconsistent as well as one of them being silent.
 *
 * These fixtures are a GATE, not an optimisation. An unloadable one stops the run.
 */
export function loadEnvelope(path: string): VerifierResponse {
  const raw = readFileSync(path, 'utf8');
  const split = raw.indexOf('\n\n');
  if (split < 0) {
    throw new Error(
      `registered capture ${path} has no blank line separating headers from body, so it is not a parseable HTTP envelope. This fixture is a gate, not an optimisation — an editor that normalised the blank line away has disarmed it`,
    );
  }
  const head = raw.slice(0, split).split('\n');
  const match = /^HTTP\/[\d.]+ (\d{3})/.exec(head[0] ?? '');
  if (match === null) {
    throw new Error(
      `registered capture ${path} does not begin with an HTTP status line (found ${JSON.stringify(
        (head[0] ?? '').slice(0, 60),
      )}). This fixture is a gate, not an optimisation`,
    );
  }
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

  // The hosts whose RECORDED behaviour is itself the finding. Registering their captures
  // by host is what makes citing them a deterministic offline FAILURE rather than a
  // "queued, not exercised" that quietly passes.
  //
  // `eur-lex.europa.eu` answers a non-browser request with an accepted status and a
  // ZERO-BYTE body. It is deliberately absent from the allowlist for exactly that reason —
  // but the allowlist is a file a contributor can edit. Someone who hits the allowlist gate
  // and "fixes" it by widening the allowlist would otherwise get a green, because no
  // committed fixture stood in for the host and the source would report as not exercised.
  // With the capture registered, the verifier disposes `data_defect` on the empty body and
  // says why, whether or not the allowlist was widened. Belt and braces, deliberately.
  //
  // Using the CAPTURE rather than a live request also means the case does not depend on a
  // third party continuing to misbehave.
  if (host === 'eur-lex.europa.eu' || host.endsWith('.eur-lex.europa.eu')) {
    return loadEnvelope(resolve(FIXTURES, 'eurlex-frontend-202-empty.txt'));
  }

  if (host === 'e-tar.lt' || host.endsWith('.e-tar.lt')) {
    return loadEnvelope(resolve(FIXTURES, 'e-tar-lt-403-interstitial.html'));
  }

  if (host === 'slov-lex.sk' || host.endsWith('.slov-lex.sk')) {
    return loadEnvelope(resolve(FIXTURES, 'slov-lex-spa-shell.html'));
  }

  return null;
}

/**
 * `Source.language` is BCP-47 (`en`, `pl`) because that is what a browser speaks; the
 * Cellar API and the nightly probe speak ISO-639-3 (`eng`, `pol`). Only the languages the
 * committed corpus actually holds are mapped — an unmapped code falls through to the
 * BCP-47 name and then to `queued`, which is the honest outcome for a language nothing
 * retrieved.
 */
const ISO639_1_TO_3: Record<string, string> = {
  en: 'eng',
  pl: 'pol',
  sk: 'slk',
  it: 'ita',
  lt: 'lit',
  mt: 'mlt',
  de: 'deu',
  nl: 'nld',
  cs: 'ces',
  sv: 'swe',
  da: 'dan',
};

/**
 * A body the nightly job already retrieved, matched to the source it was fetched FOR.
 *
 * THE MATCH IS BY STRATEGY AND BY HOST, NOT BY LANGUAGE ALONE, and that is the whole of
 * this function's correctness. An earlier shape fell back to a bare `fresh.xhtml` /
 * `fresh-<lang>.xhtml` for any source, which handed the Cellar ENGLISH EXPRESSION to the
 * 38 `metadata-only` sources that cite the Publications Office SPARQL endpoint. Each then
 * reported `anchor_absent` against a document it had never cited — 32 fabricated data
 * defects, and a maintainer sent to look for a missing anchor in the wrong document. A
 * body fetched from one host is not evidence about another.
 *
 * An EMPTY file is treated as no body at all rather than as a body of length zero. A
 * verifier that passes on an empty 200 is worse than no verifier; here the equivalent is
 * reporting `queued` — honestly not exercised — rather than dispatching a zero-byte body
 * whose failure the byte floor would then blame on the publisher.
 */
export function suppliedBody(candidate: Candidate, bodiesDir: string): VerifierResponse | null {
  const { source } = candidate;
  const lang = source.language.toLowerCase();
  const lang3 = ISO639_1_TO_3[lang] ?? lang;

  const names: string[] = [];
  if (source.verification === 'cellar') {
    // The nightly probe writes ONE whole expression per language, named `cellar-<iso3>`.
    names.push(`cellar-${lang3}.xhtml`, `cellar-${lang}.xhtml`);
    if (source.scope !== null) {
      names.push(`${source.scope.id}-${lang}.xhtml`, `${source.scope.id}-${lang}.html`);
    }
  } else {
    // Named after the HOST. Nothing retrieves these today; the naming is declared so that
    // a future retrieval step has one obvious place to write, and so that a body for one
    // host can never be served to a source citing another.
    let host: string;
    try {
      host = new URL(source.url).hostname.toLowerCase();
    } catch {
      return null;
    }
    names.push(`${host}-${lang}.html`, `${host}-${lang}.xhtml`, `${host}-${lang}.txt`);
  }

  for (const name of names) {
    const path = resolve(bodiesDir, name);
    if (!existsSync(path)) continue;
    const body = readFileSync(path, 'utf8');
    if (body.length === 0) continue;
    return {
      status: 200,
      body,
      headers: {},
      etag: source.etag ?? null,
      lastModified: source.last_modified ?? null,
    };
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

/**
 * The strategies a caller claims its retrieval layer can supply bodies for.
 *
 * `--require-exercised cellar` says: this run fetched Cellar expressions, so a *cellar*
 * source that still ends up `queued` is a FAILURE, not a shrug. It deliberately does NOT
 * say that about `metadata-only` — those 38 sources cite the Publications Office SPARQL
 * endpoint, which returned zero triples for the CELEX URI and timed out at 60 s, so no
 * retrieval layer exists for them and a gate demanding one would be red forever and
 * disabled within a month.
 *
 * Everything outside the named set is still REPORTED, as a warning naming each source.
 * The failure this replaces was not "the gate was too lenient"; it was that 94 unexercised
 * sources reached neither an exit code nor a CI annotation, and the word PASSED was
 * printed underneath them.
 */
function parseCovers(args: string[]): string[] {
  const at = args.indexOf('--require-exercised');
  if (at === -1) return [];
  const raw = args[at + 1];
  if (raw === undefined || raw.startsWith('--')) return ['cellar'];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * The evidence file `--report` writes and `L6_linkLiveness` reads. It is the ONLY channel
 * between them: the lint is read-only and offline by construction, so it cannot retrieve
 * anything itself, and a rule that reports on retrieval it did not observe is exactly the
 * vacuous gate this file exists to stop.
 *
 * The split between `unmet` and `unreachable` is made HERE, not in the lint, so the policy
 * lives in one place — the `--require-exercised` flag — rather than being re-derived by a
 * second implementation that drifts.
 */
export type ExercisedReport = {
  generated_at: string;
  /** The strategies this run's retrieval layer claimed to supply. */
  covers: string[];
  /** `where` keys that a real response was checked against. */
  exercised: string[];
  /** `where` keys resolved offline by a dated human attestation. */
  attested: string[];
  /** Queued although this run PROMISED a body for that strategy. An error. */
  unmet: string[];
  /** Queued because no retrieval layer exists for that strategy. A warning. */
  unreachable: string[];
  /** Queued by design — a proposal cannot be verified where it sits (D-11). */
  awaiting_promotion: string[];
};

function main(): number {
  const args = process.argv.slice(2);
  const bodiesAt = args.indexOf('--bodies');
  const bodiesDir = bodiesAt === -1 ? null : (args[bodiesAt + 1] ?? null);
  if (bodiesAt !== -1 && (bodiesDir === null || !existsSync(bodiesDir))) {
    process.stderr.write(`--bodies requires an existing directory (got ${String(bodiesDir)})\n`);
    return 1;
  }
  const covers = parseCovers(args);
  const reportAt = args.indexOf('--report');
  const reportPath = reportAt === -1 ? null : (args[reportAt + 1] ?? null);
  if (reportAt !== -1 && (reportPath === null || reportPath.startsWith('--'))) {
    process.stderr.write('--report requires a file path\n');
    return 1;
  }

  const candidates = [...collectDir(DATA_DIR), ...collectDir(PROPOSED_DIR), ...collectCorpus()];
  process.stdout.write(
    `verify:sources — ${candidates.length} committed sources, ${
      bodiesDir === null ? 'committed fixtures only' : `bodies from ${bodiesDir}`
    }${covers.length === 0 ? '' : `, requiring [${covers.join(', ')}] to be exercised`}\n\n`,
  );

  if (collectionWarnings.length > 0) {
    process.stdout.write(
      `::warning title=${collectionWarnings.length} file(s) disagree with their own country.code::\n`,
    );
    for (const warning of collectionWarnings) process.stdout.write(`  ! ${warning}\n`);
    process.stdout.write('\n');
  }

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

  // A proposal is queued BY DESIGN (D-11: only promotion into data/ can verify it), so it
  // is never counted against coverage. Everything else that is queued was simply not read.
  const queued = outcomes.filter((o) => o.mode === 'queued' && !o.candidate.awaitingPromotion);
  const unmet = queued.filter((o) => covers.includes(o.candidate.source.verification));
  const unreachable = queued.filter((o) => !covers.includes(o.candidate.source.verification));

  if (unreachable.length > 0) {
    process.stdout.write(
      `\n::warning title=${unreachable.length} source(s) were NOT exercised::No response stood in for these sources on this profile. They are reported as not exercised, never as passes.\n`,
    );
    for (const o of unreachable) {
      process.stdout.write(`  ? ${o.candidate.where}  [${o.candidate.source.verification}]\n`);
    }
  }

  if (unmet.length > 0) {
    process.stdout.write(
      `\n::error title=${unmet.length} source(s) this run promised to exercise were not::--require-exercised named [${covers.join(', ')}], so a body was expected for each of these and none arrived. Either the retrieval step did not run, or it wrote under a name suppliedBody does not look for.\n`,
    );
    for (const o of unmet) {
      process.stdout.write(`  x ${o.candidate.where}  [${o.candidate.source.verification}]\n`);
    }
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

  if (reportPath !== null) {
    const report: ExercisedReport = {
      generated_at: new Date().toISOString(),
      covers,
      exercised: outcomes.filter((o) => o.mode === 'dispatched').map((o) => o.candidate.where),
      attested: outcomes.filter((o) => o.mode === 'attested').map((o) => o.candidate.where),
      unmet: unmet.map((o) => o.candidate.where),
      unreachable: unreachable.map((o) => o.candidate.where),
      awaiting_promotion: outcomes
        .filter((o) => o.mode === 'queued' && o.candidate.awaitingPromotion)
        .map((o) => o.candidate.where),
    };
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`\nEvidence written to ${reportPath} — L6 reads this, and only this.\n`);
  }

  const failures = defects.length + unmet.length;
  process.stdout.write(
    `\n${failures === 0 ? 'PASSED' : 'FAILED'} — ${defects.length} data defect, ${
      unmet.length
    } promised-but-unexercised, ${unreachable.length} not exercised (no retrieval layer)\n`,
  );
  return failures === 0 ? 0 : 1;
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && resolve(invokedPath) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
