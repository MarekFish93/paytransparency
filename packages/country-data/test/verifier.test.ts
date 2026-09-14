/**
 * The failure taxonomy, proved against seven REAL captured responses, offline.
 *
 * Every fixture in this suite is a recording of a live request made at execution time —
 * status line, response headers, body — not a plausible-looking invention. That matters
 * most for the two recognition branches: a hand-written challenge interstitial would make
 * the recognition predicate test itself, which proves nothing.
 *
 * The suite never touches the network. Live assertions live in `verifier.live.test.ts`
 * and run nightly, because a contributor's pull request must not go red when a third
 * party has an outage.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { Source, SourceVerification, type Source as SourceT } from '../src/schema.ts';
import {
  isChallengeInterstitial,
  MAX_BODY_BYTES,
  overrideUnreachable,
  verifySource,
  verifySourceLive,
  type FetchLike,
  type VerifierResponse,
} from '../src/verifier.ts';
import { byteFloorFor, STRATEGY_TABLE } from '../src/source-strategy.ts';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(here, 'fixtures');

/** A recorded HTTP response: status line, headers, blank line, body. */
type Captured = { status: number; headers: Record<string, string>; body: string };

function loadCapture(name: string): Captured {
  const raw = readFileSync(resolve(FIXTURES, name), 'utf8');
  const split = raw.indexOf('\n\n');
  if (split < 0) throw new Error(`${name} is not a response envelope (no header/body separator)`);
  const head = raw.slice(0, split).split('\n');
  const body = raw.slice(split + 2);

  const statusLine = head[0] ?? '';
  const match = /^HTTP\/[\d.]+ (\d{3})/.exec(statusLine);
  if (match === null) throw new Error(`${name}: unparseable status line "${statusLine}"`);

  const headers: Record<string, string> = {};
  for (const line of head.slice(1)) {
    const at = line.indexOf(':');
    if (at < 0) continue;
    headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
  }
  return { status: Number(match[1]), headers, body };
}

const asResponse = (c: Captured): VerifierResponse => ({
  status: c.status,
  body: c.body,
  headers: c.headers,
  etag: c.headers['etag'] ?? null,
  lastModified: c.headers['last-modified'] ?? null,
});

const CAPTURES = {
  eurlex202: loadCapture('eurlex-frontend-202-empty.txt'),
  cellar404: loadCapture('cellar-404-unknown-celex.txt'),
  cellar400: loadCapture('cellar-400-bad-language.txt'),
  cellar304: loadCapture('cellar-304-revalidated.txt'),
  slovLexShell: loadCapture('slov-lex-spa-shell.html'),
  maltaJsonLd: loadCapture('legislation-mt-jsonld.html'),
  etarInterstitial: loadCapture('e-tar-lt-403-interstitial.html'),
};

const CELLAR_XHTML = readFileSync(resolve(FIXTURES, 'cellar-art7-en.xhtml'), 'utf8');

/** Build a schema-valid Source. Parsed, not cast — a test source is a real source. */
function source(overrides: Partial<SourceT> & Pick<SourceT, 'url' | 'verification' | 'anchor'>) {
  return Source.parse({
    title: 'test source',
    publisher: 'test publisher',
    kind: 'official_journal',
    language: 'en',
    accessed_at: '2026-09-11',
    scope: null,
    ...overrides,
  });
}

const CELLAR_SOURCE = source({
  url: 'http://publications.europa.eu/resource/celex/32023L0970',
  verification: 'cellar',
  kind: 'eu_institution',
  anchor: 'within a reasonable period of time but in any event within two months',
  scope: { id: 'art_7', expected_subtitle: 'Right to information' },
});

/** A counting fetch stub. The call count IS the assertion in several tests below. */
function spyFetch(handler: FetchLike): { fetch: FetchLike; calls: () => number } {
  let calls = 0;
  const fetch: FetchLike = async (url, init) => {
    calls += 1;
    return handler(url, init);
  };
  return { fetch, calls: () => calls };
}

const respondWith = (c: Captured): FetchLike =>
  async () => ({
    status: c.status,
    headers: { get: (name: string) => c.headers[name.toLowerCase()] ?? null },
    text: async () => c.body,
  });

const neverCalled: FetchLike = async () => {
  throw new Error('the fetch implementation was invoked when it must not have been');
};

/** No-op sleep so the retry tests assert the retry COUNT, not the wall clock. */
const noSleep = async (): Promise<void> => undefined;

describe('the captured fixtures are real recordings', () => {
  it('records an accepted-but-empty response whose body is exactly zero bytes', () => {
    expect(CAPTURES.eurlex202.status).toBe(202);
    expect(Buffer.byteLength(CAPTURES.eurlex202.body, 'utf8')).toBe(0);
    // res.ok is true for 202 — this is why the verifier asserts status === 200 exactly.
    expect(CAPTURES.eurlex202.headers['content-length']).toBe('0');
  });

  it('records the Cellar 404 body verbatim and the 400 at its observed size', () => {
    expect(CAPTURES.cellar404.status).toBe(404);
    expect(CAPTURES.cellar404.body).toBe("Resource [system 'celex' - id '32023L9999'] not found.");
    expect(CAPTURES.cellar400.status).toBe(400);
    expect(Buffer.byteLength(CAPTURES.cellar400.body, 'utf8')).toBe(205);
  });

  it('records a 304 with a zero-length body and an empty Content-Language', () => {
    expect(CAPTURES.cellar304.status).toBe(304);
    expect(CAPTURES.cellar304.body).toBe('');
    expect(CAPTURES.cellar304.headers['etag']).toBe('"Con-20231213063525000"');
    expect(CAPTURES.cellar304.headers['content-language']).toBe('');
  });

  it('records the client-rendered shell at 1354 bytes with a tag manager as its first tag', () => {
    expect(CAPTURES.slovLexShell.status).toBe(200);
    expect(Buffer.byteLength(CAPTURES.slovLexShell.body, 'utf8')).toBe(1354);
    const firstScript = CAPTURES.slovLexShell.body.indexOf('<script');
    expect(firstScript).toBeGreaterThan(-1);
    expect(CAPTURES.slovLexShell.body.slice(firstScript, firstScript + 200)).toContain(
      'googletagmanager.com',
    );
  });

  it('records the Malta landing page with its schema.org Legislation block', () => {
    expect(CAPTURES.maltaJsonLd.status).toBe(200);
    expect(CAPTURES.maltaJsonLd.body).toContain('application/ld+json');
    expect(CAPTURES.maltaJsonLd.body).toContain('"@type": "Legislation"');
    expect(CAPTURES.maltaJsonLd.body).toContain('"legislationDate": "2026-06-05"');
    expect(CAPTURES.maltaJsonLd.body).toContain('"legislationIdentifier": "eli/ln/2026/173"');
    // The operative wording is NOT on this page. That is the whole point of `jsonld`.
    expect(CAPTURES.maltaJsonLd.body).not.toContain('two months');
  });

  it('records the Lithuanian register 403 as the challenge interstitial it is', () => {
    expect(CAPTURES.etarInterstitial.status).toBe(403);
    expect(CAPTURES.etarInterstitial.body).toContain('<title>Just a moment...</title>');
    expect(CAPTURES.etarInterstitial.headers['cf-mitigated']).toBe('challenge');
  });
});

describe('the strategy table', () => {
  it('has exactly five keys, matching the five SourceVerification members', () => {
    const keys = Object.keys(STRATEGY_TABLE).sort();
    expect(keys).toEqual([...SourceVerification.options].sort());
    expect(keys).toHaveLength(5);
  });

  it('marks manual-attest as the one strategy that issues no request', () => {
    expect(STRATEGY_TABLE['manual-attest'].requiresFetch).toBe(false);
    for (const key of ['cellar', 'html-anchor', 'jsonld', 'metadata-only'] as const) {
      expect(STRATEGY_TABLE[key].requiresFetch).toBe(true);
    }
  });

  it('is the single source of every byte floor', () => {
    expect(byteFloorFor('cellar')).toBe(100000);
    expect(byteFloorFor('html-anchor')).toBe(20000);
    expect(byteFloorFor('jsonld')).toBe(5000);
    expect(byteFloorFor('metadata-only')).toBe(5000);
  });

  it('records which strategies cannot see the operative wording', () => {
    expect(STRATEGY_TABLE['jsonld'].assertsOperativeWording).toBe(false);
    expect(STRATEGY_TABLE['metadata-only'].assertsOperativeWording).toBe(false);
    expect(STRATEGY_TABLE['cellar'].assertsOperativeWording).toBe(true);
  });
});

describe('failure mode 1 — the accepted-but-empty response', () => {
  it('disposes data_defect and names the anti-automation gate, not a retry', () => {
    const result = verifySource(CELLAR_SOURCE, asResponse(CAPTURES.eurlex202));
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('anti_automation_gate');
    expect(result.message).toContain('anti-automation gate');
    expect(result.message).toContain('manual-attest');
  });

  it('retries zero times — a standing posture is not an outage', async () => {
    const spy = spyFetch(respondWith(CAPTURES.eurlex202));
    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl: spy.fetch,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('data_defect');
    expect(result.retries).toBe(0);
    expect(spy.calls()).toBe(1);
  });
});

describe('failure mode 2 — a Cellar 404', () => {
  it('disposes data_defect with no retry attempted', async () => {
    const spy = spyFetch(respondWith(CAPTURES.cellar404));
    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl: spy.fetch,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('client_error');
    expect(result.retries).toBe(0);
    expect(spy.calls()).toBe(1);
    expect(result.message).toContain('404');
  });
});

describe('failure mode 3 — a Cellar 400 on an invalid Accept-Language', () => {
  it('disposes data_defect: the server does not fall back, so a 400 is a caller defect', () => {
    const result = verifySource(CELLAR_SOURCE, asResponse(CAPTURES.cellar400));
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('client_error');
    expect(result.disposition).not.toBe('source_unreachable');
  });
});

describe('failure mode 4 — a 304 with a zero-length body', () => {
  it('disposes revalidated, and the body checks never execute', () => {
    // The body is zero bytes and the cellar floor is 100,000. If any body check ran,
    // this would be data_defect. Passing IS the proof that 304 precedes them.
    const result = verifySource(CELLAR_SOURCE, asResponse(CAPTURES.cellar304));
    expect(result.disposition).toBe('revalidated');
    expect(result.etag).toBe('"Con-20231213063525000"');
    expect(byteFloorFor('cellar')).toBeGreaterThan(
      Buffer.byteLength(CAPTURES.cellar304.body, 'utf8'),
    );
  });
});

describe('failure mode 5 — the client-rendered shell', () => {
  const SHELL_SOURCE = source({
    url: 'https://www.slov-lex.sk/',
    verification: 'html-anchor',
    anchor: 'rovnaká odmena za rovnakú prácu',
    language: 'sk',
  });

  it('disposes data_defect under html-anchor and names the floor it failed', () => {
    const result = verifySource(SHELL_SOURCE, asResponse(CAPTURES.slovLexShell));
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('below_byte_floor');
    expect(result.message).toContain('20000');
    expect(result.message).toContain('1354');
  });

  it('is not rescued by a 200 — the status was never the problem', () => {
    expect(CAPTURES.slovLexShell.status).toBe(200);
  });
});

describe('failure mode 6 — the Malta JSON-LD landing page', () => {
  const MT_SOURCE = source({
    url: 'https://legislation.mt/eli/ln/2026/173/eng/pdf',
    verification: 'jsonld',
    anchor: 'eli/ln/2026/173',
    language: 'en',
  });

  it('disposes verified when legislationIdentifier equals the stored ELI', () => {
    const result = verifySource(MT_SOURCE, asResponse(CAPTURES.maltaJsonLd));
    expect(result.disposition).toBe('verified');
    // The operative wording is deliberately NOT asserted — it is not on that page.
    expect(result.notes?.join(' ')).toContain('operative wording');
  });

  it('disposes data_defect when the stored ELI does not match', () => {
    const wrong = source({
      url: 'https://legislation.mt/eli/ln/2026/173/eng/pdf',
      verification: 'jsonld',
      anchor: 'eli/ln/2025/999',
      language: 'en',
    });
    const result = verifySource(wrong, asResponse(CAPTURES.maltaJsonLd));
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('eli_mismatch');
  });
});

describe('failure mode 7 — the challenge interstitial is recognised, not reclassified', () => {
  const LT_SOURCE = source({
    url: 'https://www.e-tar.lt/portal/lt/legalActSearch',
    verification: 'html-anchor',
    anchor: 'darbo užmokesčio skaidrumas',
    language: 'lt',
  });

  it('disposes data_defect with reason anti_automation_gate and names manual-attest', () => {
    const result = verifySource(LT_SOURCE, asResponse(CAPTURES.etarInterstitial));
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('anti_automation_gate');
    expect(result.message).toContain('manual-attest');
  });

  it('leaves a 403 with a plain body on the generic branch', () => {
    const plain: VerifierResponse = {
      status: 403,
      body: 'Forbidden',
      headers: { 'content-type': 'text/plain' },
    };
    const result = verifySource(LT_SOURCE, plain);
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('client_error');
    expect(result.reason).not.toBe('anti_automation_gate');
  });

  it('exposes the recognition as one predicate matched on the captured markers', () => {
    expect(
      isChallengeInterstitial(CAPTURES.etarInterstitial.body, CAPTURES.etarInterstitial.headers),
    ).toBe(true);
    expect(isChallengeInterstitial(CAPTURES.eurlex202.body, CAPTURES.eurlex202.headers)).toBe(true);
    expect(isChallengeInterstitial('Forbidden', { 'content-type': 'text/plain' })).toBe(false);
    expect(isChallengeInterstitial(CELLAR_XHTML, {})).toBe(false);
  });
});

describe('manual-attest — a first-class no-fetch state', () => {
  const ATTEST_SOURCE = source({
    url: 'https://www.slov-lex.sk/',
    verification: 'manual-attest',
    anchor: 'zákon o rovnakej odmene',
    language: 'sk',
  });

  it('performs no fetch at all', async () => {
    const spy = spyFetch(neverCalled);
    const result = await verifySourceLive(ATTEST_SOURCE, {
      countryCode: 'SK',
      fetchImpl: spy.fetch,
      sleep: noSleep,
      context: { verified_by: 'marek', verified_at: '2026-09-01', volatility: 'volatile' },
    });
    expect(spy.calls()).toBe(0);
    expect(result.disposition).toBe('attested');
  });

  it('disposes attested only with a named attester and a verified_at inside the window', () => {
    const ok = verifySource(
      ATTEST_SOURCE,
      {},
      { verified_by: 'marek', verified_at: '2026-09-01', volatility: 'volatile', today: '2026-09-11' },
    );
    expect(ok.disposition).toBe('attested');
    expect(ok.message).toContain('marek');
  });

  it('disposes data_defect when nobody attested it', () => {
    const result = verifySource(
      ATTEST_SOURCE,
      {},
      { verified_by: null, verified_at: '2026-09-01', volatility: 'volatile', today: '2026-09-11' },
    );
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('attestation_missing');
  });

  it('disposes data_defect when the attestation is past its freshness window', () => {
    const result = verifySource(
      ATTEST_SOURCE,
      {},
      { verified_by: 'marek', verified_at: '2026-01-01', volatility: 'volatile', today: '2026-09-11' },
    );
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('attestation_stale');
  });
});

describe('metadata-only records what it did not verify', () => {
  it('passes on a title anchor and says the wording was not machine-verified', () => {
    const src = source({
      url: 'https://gazzettaufficiale.it/some/landing',
      verification: 'metadata-only',
      anchor: 'Equal Pay (Transparency and Reporting) Regulations',
      language: 'en',
    });
    const result = verifySource(src, asResponse(CAPTURES.maltaJsonLd));
    expect(result.disposition).toBe('verified');
    expect(result.notes?.join(' ')).toContain('not machine-verified');
  });
});

describe('the data-defect versus transport-failure split (D-09)', () => {
  it('retries a DNS failure three times, then disposes source_unreachable', async () => {
    const spy = spyFetch(async () => {
      throw new TypeError('fetch failed: getaddrinfo ENOTFOUND publications.europa.eu');
    });
    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl: spy.fetch,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('source_unreachable');
    expect(result.retries).toBe(3);
    expect(spy.calls()).toBe(4);
  });

  it('retries a 503 three times, then disposes source_unreachable', async () => {
    const spy = spyFetch(async () => ({
      status: 503,
      headers: { get: () => null },
      text: async () => 'Service Unavailable',
    }));
    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl: spy.fetch,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('source_unreachable');
    expect(result.retries).toBe(3);
    expect(spy.calls()).toBe(4);
  });

  it('backs off between retries rather than hammering the source', async () => {
    const delays: number[] = [];
    await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl: async () => {
        throw new Error('connection reset');
      },
      sleep: async (ms: number) => {
        delays.push(ms);
      },
    });
    expect(delays).toHaveLength(3);
    expect(delays[1]).toBeGreaterThan(delays[0] as number);
    expect(delays[2]).toBeGreaterThan(delays[1] as number);
  });
});

describe('overrideUnreachable — recorded, never implicit', () => {
  const unreachable = {
    disposition: 'source_unreachable' as const,
    message: 'transport error',
  };

  it('records the maintainer, the reason and a timestamp on the result', () => {
    const result = overrideUnreachable(unreachable, 'marek', 'Publications Office outage, tracked');
    expect(result.override?.maintainer).toBe('marek');
    expect(result.override?.reason).toBe('Publications Office outage, tracked');
    expect(result.override?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws on an empty maintainer identifier', () => {
    expect(() => overrideUnreachable(unreachable, '', 'because')).toThrow();
    expect(() => overrideUnreachable(unreachable, '   ', 'because')).toThrow();
  });

  it('throws on an empty reason', () => {
    expect(() => overrideUnreachable(unreachable, 'marek', '')).toThrow();
    expect(() => overrideUnreachable(unreachable, 'marek', '  ')).toThrow();
  });

  it('refuses to override anything that is not source_unreachable', () => {
    expect(() =>
      overrideUnreachable(
        { disposition: 'data_defect', message: 'anchor absent' },
        'marek',
        'I disagree',
      ),
    ).toThrow();
  });
});

describe('step zero — the allowlist runs before any request', () => {
  it('disposes data_defect without issuing a request for a non-allowlisted host', async () => {
    const hostile = source({
      url: 'https://evil.example/statute',
      verification: 'html-anchor',
      anchor: 'plausible looking wording',
      language: 'pl',
    });
    const spy = spyFetch(neverCalled);
    const result = await verifySourceLive(hostile, {
      countryCode: 'PL',
      fetchImpl: spy.fetch,
      sleep: noSleep,
    });
    expect(spy.calls()).toBe(0);
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('allowlist_violation');
  });

  it('re-checks the redirect target and refuses to follow off the allowlist', async () => {
    const spy = spyFetch(async () => ({
      status: 302,
      headers: {
        get: (n: string) => (n.toLowerCase() === 'location' ? 'https://evil.example/x' : null),
      },
      text: async () => '',
    }));
    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl: spy.fetch,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('allowlist_violation');
    // The first hop was issued; the second was not.
    expect(spy.calls()).toBe(1);
  });
});

describe('the cellar path still bites after the taxonomy was wired in', () => {
  it('disposes verified on the authentic expression', () => {
    const result = verifySource(CELLAR_SOURCE, {
      status: 200,
      body: CELLAR_XHTML,
      etag: '"Con-20231213063525000"',
      headers: {},
    });
    expect(result.disposition).toBe('verified');
  });

  it('still disposes data_defect when the anchor lives outside the cited subdivision', () => {
    const recital = source({
      url: 'http://publications.europa.eu/resource/celex/32023L0970',
      verification: 'cellar',
      kind: 'eu_institution',
      anchor: 'Joint pay assessments should lead',
      scope: { id: 'art_7', expected_subtitle: 'Right to information' },
    });
    const result = verifySource(recital, { status: 200, body: CELLAR_XHTML, headers: {} });
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('anchor_absent');
  });
});

describe('WR-05 — a cellar source with no expected_subtitle proves nothing about language', () => {
  /**
   * The Cellar 200 carries an EMPTY `Content-Language` header. The subdivision's own
   * `<id>.tit_1` subtitle is the ONLY thing in the response that says which language
   * expression the server returned — which is why `verifyCellar` checks it.
   *
   * `expected_subtitle` defaults to null, and the check ran only `if (… !== null)`. So a
   * cellar source with a null subtitle fell through to `disposition: 'verified'` with no
   * language evidence of any kind and no note recording the gap. A Polish citation could
   * be dispositioned verified against the English expression.
   */
  const noSubtitle = source({
    url: 'http://publications.europa.eu/resource/celex/32023L0970',
    verification: 'cellar',
    kind: 'eu_institution',
    anchor: 'within a reasonable period of time but in any event within two months',
    scope: { id: 'art_7', expected_subtitle: null },
  });

  it('is a data defect, not a silent pass', () => {
    const result = verifySource(noSubtitle, { status: 200, body: CELLAR_XHTML, headers: {} });
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('language_unconfirmed');
    expect(result.message).toMatch(/empty Content-Language/);
  });

  it('the same source WITH a subtitle verifies, so the rule is not just refusing everything', () => {
    expect(
      verifySource(CELLAR_SOURCE, { status: 200, body: CELLAR_XHTML, headers: {} }).disposition,
    ).toBe('verified');
  });
});

describe('WR-04 — the byte cap prevents an allocation rather than reporting one', () => {
  /**
   * The docblock said the cap exists because "an unbounded remote body is still an
   * unbounded allocation at build time" (T-1-05). `verifySourceLive` did
   * `body = await res.text()` — the full allocation — and measured it afterwards. The cap
   * detected an oversized body; it did not prevent one.
   */
  const overCap = MAX_BODY_BYTES + 1;

  it('refuses a declared Content-Length above the cap without reading a byte', async () => {
    let textCalled = 0;
    const fetchImpl: FetchLike = async () => ({
      status: 200,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-length' ? String(overCap) : null),
      },
      text: async () => {
        textCalled += 1;
        return 'x'.repeat(overCap);
      },
    });

    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('body_too_large');
    expect(result.message).toMatch(/refused without reading the body/);
    // The assertion that distinguishes this fix from the bug: the body was never read.
    expect(textCalled).toBe(0);
  });

  it('cancels the stream at the cap when no usable Content-Length is sent', async () => {
    let cancelled = false;
    let chunksHandedOut = 0;
    const CHUNK = new Uint8Array(1024 * 1024);

    const fetchImpl: FetchLike = async () => ({
      status: 200,
      headers: { get: () => null },
      text: async () => {
        throw new Error('text() must not be reached when a stream is available');
      },
      body: {
        getReader: () => ({
          read: async () => {
            chunksHandedOut += 1;
            return { done: false, value: CHUNK };
          },
          cancel: async () => {
            cancelled = true;
          },
        }),
      } as unknown as ReadableStream<Uint8Array>,
    });

    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('data_defect');
    expect(result.reason).toBe('body_too_large');
    expect(cancelled).toBe(true);
    // The stream is infinite. Finishing at all proves the read stopped at the cap rather
    // than draining whatever the server chose to send.
    expect(chunksHandedOut).toBeLessThanOrEqual(MAX_BODY_BYTES / CHUNK.byteLength + 1);
  });

  it('still reads and verifies a normal streamed body', async () => {
    const bytes = new TextEncoder().encode(CELLAR_XHTML);
    let served = false;
    const fetchImpl: FetchLike = async () => ({
      status: 200,
      headers: { get: (name: string) => (name.toLowerCase() === 'etag' ? '"x"' : null) },
      text: async () => {
        throw new Error('text() must not be reached when a stream is available');
      },
      body: {
        getReader: () => ({
          read: async () => {
            if (served) return { done: true, value: undefined };
            served = true;
            return { done: false, value: bytes };
          },
          cancel: async () => undefined,
        }),
      } as unknown as ReadableStream<Uint8Array>,
    });

    const result = await verifySourceLive(CELLAR_SOURCE, {
      countryCode: 'PL',
      fetchImpl,
      sleep: noSleep,
    });
    expect(result.disposition).toBe('verified');
  });
});
