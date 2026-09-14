/**
 * The spine test: one Directive fact proved through every layer, offline.
 *
 * This suite must never reach the network. A third party's outage turning a
 * contributor's pull request red is how a gate gets disabled, and a disabled gate is
 * worse than no gate. Live-source verification belongs to the nightly job (plan 01-02),
 * whose files end in `.live.test.ts` and are excluded from this profile by
 * `vitest.config.ts`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DirectiveFact,
  DirectiveFile,
  DirectiveQuotation,
  Fact,
  FactStatus,
  SourceVerification,
  type Source,
} from '../src/schema.ts';
import { normaliseForMatch, verifySource, type VerifierResponse } from '../src/verifier.ts';
import { freshnessOf, TTL_DAYS } from '../src/freshness.ts';
import { extractParagraph, SourceDefect } from '../scripts/fetch-directive.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

const FIXTURE = readFileSync(resolve(here, 'fixtures', 'cellar-art7-en.xhtml'), 'utf8');
const DIRECTIVE = JSON.parse(readFileSync(resolve(pkgRoot, 'data', '_directive.json'), 'utf8')) as unknown;

const CITATION_KEY = '32023L0970#007.004';

/**
 * The English Article 7 corpus entry.
 *
 * Plan 01-01 seeded `_directive.json` with ONE paragraph-shaped fact keyed
 * `32023L0970#007.004`. Plan 01-03 filled the corpus with D-04's article-shaped facts —
 * six articles times eleven authentic language versions — and Art. 7(4) now lives as a
 * tagged paragraph inside the English Article 7 entry rather than as a top-level record.
 * Its citation key, its raw bytes, its anchor and its scope are unchanged; only where it
 * sits in the file moved. The assertions below follow it there rather than pinning a
 * file layout the corpus was always going to replace.
 */
const ARTICLE_KEY = '32023L0970#007@eng';

/** The authentic Art. 7(4) deadline wording, as published. */
const ANCHOR = 'within a reasonable period of time but in any event within two months';

/** Build a synthesised 200 from the fixture — no network, deterministic. */
const respond = (overrides: Partial<VerifierResponse> = {}): VerifierResponse => ({
  status: 200,
  body: FIXTURE,
  etag: '"Con-20231213063525000"',
  lastModified: 'Wed, 13 Dec 2023 05:35:25 GMT',
  ...overrides,
});

const storedFact = () => {
  const parsed = DirectiveFile.parse(DIRECTIVE);
  const fact = parsed[ARTICLE_KEY];
  if (fact === undefined) throw new Error(`${ARTICLE_KEY} missing from _directive.json`);
  if (fact.value === null || !('paragraphs' in fact.value)) {
    throw new Error(`${ARTICLE_KEY} is not an article-shaped fact`);
  }
  return { ...fact, value: fact.value };
};

/** The Art. 7(4) paragraph, as stored inside the English Article 7 entry. */
const storedParagraph = () => {
  const paragraph = storedFact().value.paragraphs['007.004'];
  if (paragraph === undefined) throw new Error(`007.004 missing from ${ARTICLE_KEY}`);
  return paragraph;
};

const storedSource = (): Source => {
  const source = storedFact().sources[0];
  if (source === undefined) throw new Error('the stored fact cites no source');
  return source;
};

describe('the frozen unions', () => {
  it('freezes FactStatus at exactly five members, including directive_fallback', () => {
    expect(FactStatus.options).toEqual([
      'verified',
      'directive_default',
      'directive_fallback',
      'pending_verification',
      'not_applicable',
    ]);
  });

  it('freezes SourceVerification at exactly five members, including manual-attest', () => {
    expect(SourceVerification.options).toEqual([
      'cellar',
      'html-anchor',
      'jsonld',
      'metadata-only',
      'manual-attest',
    ]);
  });
});

describe('extraction by the publisher’s own structural ids', () => {
  it('extracts 007.004 from inside the art_7 subtree', () => {
    const extracted = extractParagraph(FIXTURE, 7, 4);
    expect(extracted.citationKey).toBe(CITATION_KEY);
    expect(extracted.article).toBe(7);
    expect(extracted.paragraph).toBe(4);
    expect(normaliseForMatch(extracted.text)).toContain(ANCHOR);
  });

  it('preserves U+00A0 between the paragraph number and the first word', () => {
    const extracted = extractParagraph(FIXTURE, 7, 4);
    // The authentic bytes are `4.\xa0\xa0\xa0Employers`. Storing an ASCII space here
    // would be rewriting the Official Journal.
    expect(extracted.text).toMatch(/^4\.\u00A0+Employers/);
    expect(extracted.text).toContain('\u00A0');
  });

  it('throws SourceDefect for an article id absent from the document', () => {
    expect(() => extractParagraph(FIXTURE, 99, 1)).toThrow(SourceDefect);
    expect(() => extractParagraph(FIXTURE, 99, 1)).toThrow(/art_99/);
  });

  it('throws SourceDefect for a paragraph id absent from inside the located article', () => {
    // Article 7 exists and has paragraphs 007.001 through 007.006; 007.009 does not.
    expect(() => extractParagraph(FIXTURE, 7, 9)).toThrow(SourceDefect);
    expect(() => extractParagraph(FIXTURE, 7, 9)).toThrow(/007\.009/);
  });
});

describe('normalisation is for matching only', () => {
  it('matches an ASCII-spaced anchor only after normalisation, never before', () => {
    // "Article 7" with an ASCII space occurs ZERO times in the authentic document;
    // the U+00A0 form occurs once. A verifier anchored on the obvious string would
    // fail on a perfect document — this is the failure normalisation exists to prevent.
    const asciiForm = 'Article 7';
    expect(FIXTURE.includes(asciiForm)).toBe(false);
    expect(FIXTURE.includes('Article\u00A07')).toBe(true);
    expect(normaliseForMatch(FIXTURE)).toContain(asciiForm);
  });
});

describe('the stored fact', () => {
  it('parses against the Fact schema and resolves the seeded Art. 7(4) citation key', () => {
    const parsed = DirectiveFile.parse(DIRECTIVE);
    expect(Object.keys(parsed)).toContain(ARTICLE_KEY);
    // The key plan 01-01 froze still resolves — it is now the paragraph's own key
    // inside the article entry, which is what makes it language-invariant.
    expect(storedParagraph().citation_key).toBe(CITATION_KEY);
  });

  it('carries full provenance: verified, stable, anchored, with a recorded ETag', () => {
    const fact = storedFact();
    const source = storedSource();
    expect(fact.status).toBe('verified');
    expect(fact.volatility).toBe('stable');
    expect(source.anchor.length).toBeGreaterThan(0);
    expect(source.etag).toBeTruthy();
    expect(source.verification).toBe('cellar');
    expect(source.scope?.id).toBe('art_7');
  });

  it('stores the quotation raw, with the authentic U+00A0 separator', () => {
    expect(storedFact().value).not.toBeNull();
    expect(storedParagraph().raw_text).toContain('\u00A0');
    expect(storedParagraph().raw_text).toMatch(/^4\.\u00A0+Employers/);
  });
});

describe('the verifier', () => {
  it('disposes the stored source verified against a synthesised 200', () => {
    const result = verifySource(storedSource(), respond());
    expect(result.disposition).toBe('verified');
  });

  it('disposes a 202 with an empty body data_defect, not verified', () => {
    // res.ok is true for 202 — `if (!res.ok) throw` would let this through.
    const result = verifySource(storedSource(), { status: 202, body: '' });
    expect(result.disposition).toBe('data_defect');
  });

  it('disposes a 304 revalidated without touching the body', () => {
    const result = verifySource(storedSource(), { status: 304, body: '' });
    expect(result.disposition).toBe('revalidated');
  });

  it('disposes a transport error source_unreachable, not data_defect', () => {
    const result = verifySource(storedSource(), { transportError: 'ETIMEDOUT' });
    expect(result.disposition).toBe('source_unreachable');
  });
});

describe('freshness', () => {
  const ttl = TTL_DAYS.stable;

  const plusDays = (iso: string, days: number): string =>
    new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

  it('is fresh when verified today', () => {
    expect(freshnessOf('2026-09-11', 'stable', '2026-09-11')).toBe('fresh');
  });

  // Every boundary asserted explicitly, because the window is the control: a window
  // that expires "some time after" its stated length is not a window.
  it('is stale when elapsed days equal the TTL exactly — the boundary day is stale', () => {
    const base = '2025-01-01';
    expect(freshnessOf(base, 'stable', plusDays(base, ttl))).toBe('stale');
  });

  it('is not yet stale one day below the TTL', () => {
    const base = '2025-01-01';
    // NOTE: at 364 of 365 days the fact is inside the window but well past the 75%
    // mark, so the honest answer is `ageing`. The plan's acceptance criterion phrases
    // this as "fresh", which is its two-state reading of a three-state function;
    // `ageing` IS the non-stale answer here. Asserted exactly so the distinction
    // cannot be lost in a later refactor.
    expect(freshnessOf(base, 'stable', plusDays(base, ttl - 1))).toBe('ageing');
    expect(freshnessOf(base, 'stable', plusDays(base, ttl - 1))).not.toBe('stale');
  });

  it('crosses from fresh to ageing at 75% of the TTL', () => {
    const base = '2025-01-01';
    // 75% of 365 is 273.75: day 273 is still fresh, day 274 is ageing.
    expect(freshnessOf(base, 'stable', plusDays(base, 273))).toBe('fresh');
    expect(freshnessOf(base, 'stable', plusDays(base, 274))).toBe('ageing');
  });

  it('treats a null verified_at as stale', () => {
    expect(freshnessOf(null, 'stable', '2026-09-11')).toBe('stale');
  });
});

describe('the envelope invariants', () => {
  const base = {
    status: 'verified' as const,
    verified_at: '2026-09-11',
    verified_by: null,
    volatility: 'stable' as const,
  };

  const sourceLiteral = (url: string): unknown => ({
    url,
    title: 'Directive (EU) 2023/970',
    publisher: 'Publications Office of the European Union',
    kind: 'eu_institution',
    verification: 'cellar',
    anchor: ANCHOR,
    language: 'en',
    accessed_at: '2026-09-11',
    scope: { id: 'art_7', expected_subtitle: 'Right to information' },
  });

  it('rejects a verified fact citing no source', () => {
    const result = DirectiveFact.safeParse({
      ...base,
      value: { text: ANCHOR, citation_key: CITATION_KEY, article: 7, paragraph: 4 },
      sources: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a pending_verification fact carrying a value', () => {
    const result = DirectiveFact.safeParse({
      ...base,
      status: 'pending_verification',
      value: { text: ANCHOR, citation_key: CITATION_KEY, article: 7, paragraph: 4 },
      sources: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a source URL that is neither https nor the Cellar http exception', () => {
    const result = DirectiveFact.safeParse({
      ...base,
      value: { text: ANCHOR, citation_key: CITATION_KEY, article: 7, paragraph: 4 },
      sources: [sourceLiteral('http://example.org/statute')],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a source URL carrying a tracking parameter', () => {
    const result = DirectiveFact.safeParse({
      ...base,
      value: { text: ANCHOR, citation_key: CITATION_KEY, article: 7, paragraph: 4 },
      sources: [sourceLiteral('https://dziennikustaw.gov.pl/DU/2026/1?utm_source=x')],
    });
    expect(result.success).toBe(false);
  });

  it('preserves the authored order of sources through parse and re-serialisation', () => {
    const urls = [
      'http://publications.europa.eu/resource/celex/32023L0970',
      'https://dziennikustaw.gov.pl/DU/2026/1',
      'https://normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2026;1',
    ];
    const parsed = Fact(DirectiveQuotation).parse({
      ...base,
      value: { text: ANCHOR, citation_key: CITATION_KEY, article: 7, paragraph: 4 },
      sources: urls.map(sourceLiteral),
    });
    expect(parsed.sources.map((s) => s.url)).toEqual(urls);
    // sources[0] is the primary citation the UI and the letters quote.
    expect(parsed.sources[0]?.url).toBe(urls[0]);

    const roundTripped = Fact(DirectiveQuotation).parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped.sources.map((s) => s.url)).toEqual(urls);
  });
});

/**
 * The proof of teeth.
 *
 * Everything above shows the spine works on a good document. These four cases show it
 * REJECTS the failure research found most often: a correct, allowlisted, live,
 * above-floor source cited for the WRONG PROVISION.
 *
 * The decoy carries the deadline phrase exactly once, inside a recital, before the first
 * eli-subdivision. Its art_7 subtree is structurally valid and still has id="007.004" —
 * the provision exists, it simply no longer carries the operative wording. Nothing about
 * the status, the size or the host is wrong. Only the scoping can catch it.
 *
 * The remaining four bad-PR shapes are drilled against real pull requests in plan 01-05.
 */
describe('the gate bites: a recital-scoped anchor on an allowlisted, live source', () => {
  const DECOY = readFileSync(resolve(here, 'fixtures', 'cellar-art7-recital-decoy.xhtml'), 'utf8');

  const decoyResponse = (): VerifierResponse => ({
    status: 200,
    body: DECOY,
    etag: '"Con-20231213063525000"',
    lastModified: 'Wed, 13 Dec 2023 05:35:25 GMT',
  });

  /**
   * The stored Article 7 source, cited for the DEADLINE wording.
   *
   * The corpus anchor plan 01-03 derives for Article 7 is cut from Art. 7(1), and the
   * decoy leaves Art. 7(1) untouched — it removes the operative wording from Art. 7(4)
   * only. An article-level anchor proves the ARTICLE is present; it cannot prove every
   * paragraph inside it is intact. So this block cites the same live, allowlisted,
   * above-floor source for the paragraph the decoy actually attacks, which is the shape
   * research found most often and the one the scoping rule exists to reject. Paragraph-
   * level integrity across the corpus is asserted separately, by byte equality, in
   * `directive-text.test.ts`.
   */
  const deadlineCitation = (): Source => ({ ...storedSource(), anchor: ANCHOR });

  it('disposes data_defect when the anchor lives only in a recital', () => {
    const result = verifySource(deadlineCitation(), decoyResponse());
    // The literal disposition, not merely "something threw": a test that accepts any
    // throw would also pass if the verifier crashed for an unrelated reason.
    expect(result.disposition).toBe('data_defect');
    expect(result.disposition).not.toBe('verified');
  });

  it('rejects it despite a 200, a body far above the floor, and an allowlisted host', () => {
    const response = decoyResponse();
    // None of the three signals a naive verifier would trust is wrong here.
    expect(response.status).toBe(200);
    expect(DECOY.length).toBeGreaterThan(100000);
    expect(storedSource().url).toContain('publications.europa.eu');
    // The phrase IS present in the document — just not in the cited provision.
    expect(DECOY).toContain('within a reasonable period of time');

    expect(verifySource(deadlineCitation(), response).disposition).toBe('data_defect');
  });

  it('reports what was actually at the art_7 scope start, verbatim', () => {
    const result = verifySource(deadlineCitation(), decoyResponse());
    // A reviewer must be able to read the decoy's own markup out of the failure
    // message. A normalised, tag-stripped rendering is not what is in the document,
    // and a citation dispute is settled on the document's bytes.
    const scopeStart = DECOY.slice(DECOY.lastIndexOf('<', DECOY.indexOf('id="art_7"')));
    expect(result.message).toContain(scopeStart.slice(0, 60));
  });

  it('disposes data_defect for a correct art_7 subtree truncated below the byte floor', () => {
    // Truncating the GOOD fixture: the subtree is right, the bytes are not.
    const truncated = FIXTURE.slice(0, 50000);
    const result = verifySource(storedSource(), { status: 200, body: truncated });
    expect(result.disposition).toBe('data_defect');
    expect(result.message).toMatch(/floor/);
  });
});

/**
 * The PR profile's defining property, asserted rather than merely documented.
 *
 * `legal-data.yml` must never retrieve a legal source over the network. A gate that goes
 * red on somebody else's outage gets disabled within a month, and a disabled gate is
 * worse than no gate. This assertion lives here rather than as a step inside the
 * workflow because a step that greps its own file for these verbs would match its own
 * pattern and fail permanently.
 */
describe('the PR-profile workflow stays offline', () => {
  const WORKFLOW = readFileSync(
    resolve(pkgRoot, '..', '..', '.github', 'workflows', 'legal-data.yml'),
    'utf8',
  );

  /**
   * The retrieval verbs, checked where retrieval can actually happen.
   *
   * `curl`, `wget` and `Invoke-WebRequest` are forbidden ANYWHERE in the file — there is no
   * legitimate use of any of them here.
   *
   * `fetch` carries one documented exception: `fetch-depth:`, which is `actions/checkout`'s
   * CLONE DEPTH option and retrieves no legal source. It is required by the unchanged-bump
   * rule, which compares each record against the same record on the pull request's base
   * commit — a shallow clone has no base commit to compare against, so without it that rule
   * silently degrades to a skip. The header of `legal-data.yml` already states that access
   * to GitHub's own runner infrastructure is permitted; a clone depth is exactly that.
   *
   * Narrowing the exception to that one token, rather than dropping `fetch` from the list,
   * is deliberate: a bare `fetch(` or a `pnpm fetch` would still fail this.
   */
  it('performs no network retrieval of any legal source', () => {
    for (const verb of ['curl', 'wget', 'Invoke-WebRequest']) {
      expect(WORKFLOW, `"${verb}" must not appear in the PR profile`).not.toContain(verb);
    }
    const fetchOccurrences = [...WORKFLOW.matchAll(/fetch/g)].map((m) =>
      WORKFLOW.slice(m.index, m.index + 'fetch-depth'.length),
    );
    for (const occurrence of fetchOccurrences) {
      expect(occurrence, 'the only permitted "fetch" is the fetch-depth clone option').toBe(
        'fetch-depth',
      );
    }
  });

  /**
   * Stronger than the verb check above, and the one that would actually catch a retrieval
   * smuggled in under a name the verb list does not know: every `run:` command in this
   * workflow must be one of a small, enumerated set. A step that retrieved a legal source
   * would have to appear here first.
   */
  it('runs only enumerated commands — nothing that could retrieve a legal source', () => {
    const PERMITTED = [
      'corepack enable',
      'pnpm install --frozen-lockfile',
      'pnpm typecheck',
      'pnpm validate:country-data',
      'pnpm verify:sources',
      'pnpm vitest run --dir packages/country-data',
      // The freshness gate and the base-ref branch run node/sh inline; both are asserted
      // by the verb check above and neither may introduce a new external command.
      'set -euo pipefail',
      'node --input-type=module -e',
      'if [ -n "${BASE_REF:-}" ]; then',
      'else',
      'fi',
    ];
    const commandLines = WORKFLOW.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('run: ') || line.startsWith('pnpm ') || line.startsWith('corepack '))
      .map((line) => line.replace(/^run: \|?/, '').trim())
      .filter((line) => line.length > 0);

    for (const line of commandLines) {
      expect(
        PERMITTED.some((allowed) => line.startsWith(allowed)),
        `unenumerated command in legal-data.yml: "${line}"`,
      ).toBe(true);
    }
  });

  /**
   * Only first-party GitHub actions. A third-party action is arbitrary code with the
   * runner's token, and this workflow gates what a worker cites to their employer.
   */
  it('uses only first-party actions', () => {
    const uses = [...WORKFLOW.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1]);
    expect(uses.length).toBeGreaterThan(0);
    for (const action of uses) {
      expect(action, `third-party action in the PR profile: ${action}`).toMatch(
        /^actions\/(checkout|setup-node)@v\d+$/,
      );
    }
  });

  it('installs from the committed lockfile rather than re-resolving versions', () => {
    // A floating resolve would quietly swap out the versions the legitimacy audit
    // cleared — zod 4.5.4 rather than the one-day-old 4.6.x it rejected as too new.
    expect(WORKFLOW).toContain('pnpm install --frozen-lockfile');
  });

  it('runs the offline suite that the decoy fixture turns red', () => {
    expect(WORKFLOW).toContain('pnpm vitest run --dir packages/country-data');
  });
});

/**
 * Every CLI script must recognise being invoked as a script, on every platform.
 *
 * `seed-from-nim.ts` guarded its entry point with a hand-built
 * `file:///${argv[1].replace(/\/g, '/')}` template. That is correct only on Windows: a
 * POSIX `process.argv[1]` is already `/home/runner/...`, so the template produced
 * `file:////home/...` with four slashes and never matched `import.meta.url`. `pnpm
 * seed:nim` on Linux exited 0 having done nothing — the silent no-op `rederive.ts`'s own
 * comment calls "the worst possible failure for a gate".
 *
 * Asserted across the whole scripts directory rather than on the one file that had the
 * bug, so the next script cannot be written the same way.
 */
describe('every CLI script guards its entry point portably', () => {
  const SCRIPTS = [
    resolve(pkgRoot, 'scripts', 'seed-from-nim.ts'),
    resolve(pkgRoot, 'scripts', 'validate.ts'),
    resolve(pkgRoot, 'scripts', 'verify-sources.ts'),
    resolve(pkgRoot, 'scripts', 'fetch-directive.ts'),
    resolve(pkgRoot, 'scripts', 'emit-json-schema.ts'),
    resolve(pkgRoot, '..', 'directive-engine', 'scripts', 'rederive.ts'),
  ];

  it.each(SCRIPTS)('%s builds no file:// URL by hand', (path) => {
    const source = readFileSync(path, 'utf8');
    const executable = source
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    expect(executable).not.toMatch(/`file:\/\/\//);
  });

  it.each(SCRIPTS)('%s has an entry-point guard at all', (path) => {
    // A script with no guard runs its side effects on import — which is how importing a
    // function for a test came to rewrite a committed file.
    const source = readFileSync(path, 'utf8');
    expect(source).toMatch(
      /pathToFileURL\(process\.argv\[1\]\)|resolve\(fileURLToPath\(import\.meta\.url\)\)|fileURLToPath\(import\.meta\.url\) === resolve\(/,
    );
  });
});

/**
 * The emitted JSON Schema is a COMMITTED artefact a contributor's editor reads. Two
 * defects in the emitter, both of which produced a green over a bad output.
 */
describe('emit-json-schema validates before it writes, and means what it checks', () => {
  it('rejects a schema whose country.code enum is wrong, however its prose reads', async () => {
    const { assertConstrainsCountryCode } = await import('../scripts/emit-json-schema.ts');

    // The exact document the previous probe accepted: `JSON.stringify(parsed).match(/"GR"/g)`
    // is satisfied by any occurrence of the two characters GR between quotes ANYWHERE —
    // including inside the long `description` string the emitter itself writes. A check its
    // own prose can satisfy is not a check.
    const decoy = JSON.stringify({
      description: 'Codes such as "GR" are constrained by this schema.',
      properties: { country: { properties: { code: { enum: ['XX'] } } } },
    });
    expect(() => assertConstrainsCountryCode(decoy)).toThrowError(/EU_COUNTRY_CODES/);

    const missing = JSON.stringify({ properties: { country: { properties: { code: {} } } } });
    expect(() => assertConstrainsCountryCode(missing)).toThrowError(/enum/);
  });

  it('accepts the committed schema', async () => {
    const { assertConstrainsCountryCode } = await import('../scripts/emit-json-schema.ts');
    const committed = readFileSync(resolve(pkgRoot, 'country.schema.json'), 'utf8');
    expect(() => assertConstrainsCountryCode(committed)).not.toThrow();
  });

  it('importing the module does not rewrite the committed schema', async () => {
    // There was no entry-point guard, so importing `emitJsonSchema` for a test wrote the
    // file as a side effect of the import — and wrote it BEFORE validating it.
    const before = readFileSync(resolve(pkgRoot, 'country.schema.json'), 'utf8');
    await import('../scripts/emit-json-schema.ts');
    expect(readFileSync(resolve(pkgRoot, 'country.schema.json'), 'utf8')).toBe(before);
  });
});
