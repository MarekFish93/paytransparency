/**
 * The policy lint — LEGAL-03, LEGAL-08, LEGAL-10.
 *
 * Schema parse says a record is WELL FORMED. These nine rules say it is ACCEPTABLE.
 * The distinction matters because the schema cannot see across files (L1), cannot see
 * the allowlist (L5), cannot see the base branch (the unchanged-bump rule) and cannot
 * see the Directive corpus (`assertFallbackKeysResolve`).
 *
 * Offline by construction: every case below is built in memory or read from the
 * committed tree. Nothing here retrieves a legal source, because this suite runs on the
 * pull-request profile and a contributor's pull request must never be red because a
 * third party had an outage.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AllowlistViolation } from '../src/allowlist.ts';
import { EU_COUNTRY_CODES } from '../src/country.ts';
import {
  L1_fileCoverage,
  L2_verifiedHasSource,
  L3_pendingIsNull,
  L4_noUnsourcedStatute,
  L5_urlHygiene,
  L6_linkLiveness,
  L7_letterCoverage,
  L8_freshness,
  L9_proposedCannotVerify,
  lintAll,
  RULE_IDS,
  type ExercisedEvidence,
  type LintFile,
} from '../src/lint.ts';
import { assertFallbackKeysResolve, loadRecords } from '../scripts/validate.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const DATA_DIR = resolve(pkgRoot, 'data');
const PROPOSED_DIR = resolve(pkgRoot, 'proposed');

/** Injected everywhere a date is needed, so a boundary is not a moving target. */
const TODAY = '2026-09-14';

// ---------------------------------------------------------------------------
// Builders. Deliberately minimal: the lint reads parsed JSON, not zod output, so a
// fixture only needs the shape the rule under test actually walks.
// ---------------------------------------------------------------------------

type FactFixture = {
  value: unknown;
  status: string;
  sources: unknown[];
  verified_at: string | null;
  verified_by: string | null;
  volatility: string;
};

function fact(over: Partial<FactFixture> = {}): FactFixture {
  return {
    value: null,
    status: 'pending_verification',
    sources: [],
    verified_at: null,
    verified_by: null,
    volatility: 'volatile',
    ...over,
  };
}

function source(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    url: 'https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20230000001',
    title: 'Internetowy System Aktów Prawnych entry',
    publisher: 'Kancelaria Sejmu',
    kind: 'national_register',
    verification: 'html-anchor',
    anchor: 'ustawa o jawnosci wynagrodzen',
    language: 'pl',
    accessed_at: '2026-09-11',
    scope: null,
    ...over,
  };
}

function record(code: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    $schema: '../country.schema.json',
    schema_version: '1.0.0',
    country: { code, name_en: code, official_languages: ['en'], letter_languages: ['en'] },
    transposition: { status: fact() },
    article_7: { legal_basis: fact(), response_deadline: fact() },
    article_12_3: fact(),
    discovery_hints: [],
    ...over,
  };
}

const file = (path: string, rec: unknown): LintFile => ({ path, record: rec });

/** The 27 well-formed files L1 is happy with. */
function fullDataSet(): LintFile[] {
  return EU_COUNTRY_CODES.map((code) => file(`data/${code}.json`, record(code)));
}

const messagesOf = (report: { findings: readonly { message: string }[] }): string =>
  report.findings.map((f) => f.message).join('\n');

const stemOfPath = (path: string): string => (path.split('/').pop() ?? path).replace('.json', '');

// ---------------------------------------------------------------------------
// L1 — file coverage
// ---------------------------------------------------------------------------

describe('L1 file coverage', () => {
  it('accepts exactly 27 files, one per member state', () => {
    const report = L1_fileCoverage(fullDataSet());
    expect(report.rule).toBe('L1');
    expect(report.findings).toHaveLength(0);
  });

  it('fails on 26 files, naming the missing code', () => {
    const files = fullDataSet();
    // Drop whichever state sorts last rather than naming one: the assertion must survive
    // a reordering of EU_COUNTRY_CODES, and hardcoding a code is how it would not.
    const dropped = files.pop();
    expect(dropped).toBeDefined();
    const report = L1_fileCoverage(files);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(messagesOf(report)).toContain(stemOfPath(dropped!.path));
  });

  it('fails on 28 files, naming the extra path', () => {
    const files = [...fullDataSet(), file('data/XX.json', record('XX'))];
    const report = L1_fileCoverage(files);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(messagesOf(report)).toContain('data/XX.json');
  });

  it('fails on a duplicate country code, naming both paths', () => {
    const files = fullDataSet();
    files[1] = file('data/PL-copy.json', record('PL'));
    const report = L1_fileCoverage(files);
    expect(messagesOf(report)).toContain('data/PL-copy.json');
  });

  it("fails when the filename stem differs from the record's own country code", () => {
    const files = fullDataSet();
    files[0] = file('data/AT.json', record('BE'));
    const report = L1_fileCoverage(files);
    expect(messagesOf(report)).toMatch(/AT\.json/);
    expect(messagesOf(report)).toMatch(/BE/);
  });
});

// ---------------------------------------------------------------------------
// L2 / L3 — the fact envelope, across files rather than one at a time
// ---------------------------------------------------------------------------

describe('L2 verified facts carry their justification', () => {
  it('fails a verified fact with no source', () => {
    const rec = record('PL', {
      article_7: {
        legal_basis: fact({ value: { instrument: 'national' }, status: 'verified', verified_at: '2026-09-01', verified_by: 'marek' }),
      },
    });
    const report = L2_verifiedHasSource([file('data/PL.json', rec)], { today: TODAY });
    expect(report.rule).toBe('L2');
    expect(messagesOf(report)).toMatch(/source/i);
  });

  it('fails a verified fact with no verified_at', () => {
    const rec = record('PL', {
      article_7: {
        legal_basis: fact({ value: { instrument: 'national' }, status: 'verified', sources: [source()], verified_by: 'marek' }),
      },
    });
    const report = L2_verifiedHasSource([file('data/PL.json', rec)], { today: TODAY });
    expect(messagesOf(report)).toMatch(/verified_at/);
  });

  it('fails a verified fact whose verified_at is in the future', () => {
    const rec = record('PL', {
      article_7: {
        legal_basis: fact({
          value: { instrument: 'national' },
          status: 'verified',
          sources: [source()],
          verified_at: '2027-01-01',
          verified_by: 'marek',
        }),
      },
    });
    const report = L2_verifiedHasSource([file('data/PL.json', rec)], { today: TODAY });
    expect(messagesOf(report)).toMatch(/future/i);
  });

  it('accepts a verified fact that carries a source and a past date', () => {
    const rec = record('PL', {
      article_7: {
        legal_basis: fact({
          value: { instrument: 'national' },
          status: 'verified',
          sources: [source()],
          verified_at: '2026-09-01',
          verified_by: 'marek',
        }),
      },
    });
    const report = L2_verifiedHasSource([file('data/PL.json', rec)], { today: TODAY });
    expect(report.findings).toHaveLength(0);
  });
});

describe('L3 pending facts hold null', () => {
  it('fails a pending_verification fact carrying a value', () => {
    const rec = record('PL', {
      article_7: { response_deadline: fact({ value: { amount: 1, unit: 'month' } }) },
    });
    const report = L3_pendingIsNull([file('data/PL.json', rec)]);
    expect(report.rule).toBe('L3');
    expect(messagesOf(report)).toMatch(/null/);
  });

  it('accepts a pending_verification fact holding null', () => {
    const report = L3_pendingIsNull([file('data/PL.json', record('PL'))]);
    expect(report.findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// L4 — the anti-hallucination rule. The one that makes a plausible-looking invented
// citation inexpressible rather than merely discouraged.
// ---------------------------------------------------------------------------

describe('L4 a statute string must be evidenced', () => {
  const withBasis = (f: FactFixture) => record('PL', { article_7: { legal_basis: f } });

  it('fails an article-number string sitting in a fact that is not verified', () => {
    const report = L4_noUnsourcedStatute([
      file('data/PL.json', withBasis(fact({ value: { citation: 'art. 183c § 1' }, status: 'draft' }))),
    ]);
    expect(report.rule).toBe('L4');
    expect(messagesOf(report)).toContain('art. 183c');
  });

  it('fails the identical string inside a verified fact with no source', () => {
    const report = L4_noUnsourcedStatute([
      file(
        'data/PL.json',
        withBasis(fact({ value: { citation: 'art. 183c § 1' }, status: 'verified', verified_at: '2026-09-01', verified_by: 'marek' })),
      ),
    ]);
    expect(messagesOf(report)).toContain('art. 183c');
  });

  it('passes the identical string inside a verified, sourced fact', () => {
    const report = L4_noUnsourcedStatute([
      file(
        'data/PL.json',
        withBasis(
          fact({
            value: { citation: 'art. 183c § 1' },
            status: 'verified',
            sources: [source()],
            verified_at: '2026-09-01',
            verified_by: 'marek',
          }),
        ),
      ),
    ]);
    expect(report.findings).toHaveLength(0);
  });

  it('catches the Polish journal abbreviation, a year-and-number law and a CELEX id', () => {
    for (const invented of ['Dz.U. 2026 poz. 1477', 'Legea nr. 167/2026', '32026L0451']) {
      const report = L4_noUnsourcedStatute([
        file('data/PL.json', withBasis(fact({ value: { citation: invented }, status: 'draft' }))),
      ]);
      expect(messagesOf(report), invented).toContain(invented);
    }
  });

  it('does not fire on the register-harvested discovery hints in the committed tree', () => {
    const report = L4_noUnsourcedStatute(loadRecords(DATA_DIR));
    expect(report.findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// L5 — url hygiene, delegated to the ONE allowlist implementation
// ---------------------------------------------------------------------------

describe('L5 url hygiene', () => {
  const withSource = (s: Record<string, unknown>) =>
    record('PL', {
      article_7: {
        legal_basis: fact({
          value: { instrument: 'national' },
          status: 'verified',
          sources: [s],
          verified_at: '2026-09-01',
          verified_by: 'marek',
        }),
      },
    });

  it('fails a non-https source url', () => {
    const report = L5_urlHygiene([file('data/PL.json', withSource(source({ url: 'http://isap.sejm.gov.pl/x' })))]);
    expect(report.rule).toBe('L5');
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('fails a source url carrying a tracking parameter', () => {
    const report = L5_urlHygiene([
      file('data/PL.json', withSource(source({ url: 'https://isap.sejm.gov.pl/x?utm_source=newsletter' }))),
    ]);
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('fails a non-allowlisted host, and the failure comes from assertFetchable', () => {
    const report = L5_urlHygiene([
      file('data/PL.json', withSource(source({ url: 'https://lawfirm-commentary.example/pay-transparency' }))),
    ]);
    const [finding] = report.findings;
    expect(finding).toBeDefined();
    // The delegation is the assertion: one allowlist implementation, not two.
    expect(finding?.cause).toBeInstanceOf(AllowlistViolation);
    expect((finding?.cause as AllowlistViolation).reason).toBe('host_not_allowlisted');
    expect((finding?.cause as AllowlistViolation).host).toBe('lawfirm-commentary.example');
  });

  it('accepts an allowlisted https source url', () => {
    const report = L5_urlHygiene([file('data/PL.json', withSource(source()))]);
    expect(report.findings).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // CR-01 — the two thirds of the record's URLs this rule used to walk straight past
  // -------------------------------------------------------------------------

  /** A record carrying the named value at the named equality-body field. */
  const withEqualityBody = (entry: Record<string, unknown>) =>
    record('PL', {
      enforcement: {
        equality_body: fact({
          value: [{ name_local: 'RPO', name_en: null, ...entry }],
          status: 'verified',
          sources: [source()],
          verified_at: '2026-09-01',
          verified_by: 'marek',
        }),
      },
    });

  it('reports the exact payload the review proved passed with zero findings', () => {
    const rec = record('PL', {
      transposition: {
        status: fact({ value: 'draft', status: 'verified', sources: [source()], verified_at: '2026-09-01' }),
        draft_asserting_sources: ['http://evil.example/not-a-source'],
      },
      enforcement: {
        equality_body: fact({
          value: [
            {
              name_local: 'RPO',
              name_en: null,
              url: 'javascript:alert(document.cookie)',
              complaint_url: 'http://phish.example/steal?utm_source=x',
              art20_designation_source: null,
            },
          ],
          status: 'verified',
          sources: [source()],
          verified_at: '2026-09-01',
          verified_by: 'marek',
        }),
      },
      reporting: {
        template: fact({
          value: { url: 'javascript:void(fetch("//evil"))', format: 'xlsx' },
          status: 'verified',
          sources: [source()],
          verified_at: '2026-09-01',
          verified_by: 'marek',
        }),
      },
    });

    const report = L5_urlHygiene([file('data/PL.json', rec)]);
    const messages = messagesOf(report);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(messages).toContain('equality_body.value[0].url');
    expect(messages).toContain('equality_body.value[0].complaint_url');
    expect(messages).toContain('reporting.template.value.url');
    expect(messages).toContain('draft_asserting_sources[0]');
  });

  it('rejects a javascript: url on ANY string leaf, whatever the key is called', () => {
    // The backstop that cannot go stale: URL_BEARING_KEY is a naming convention, and a
    // stored javascript: string is stored XSS whichever field it arrived in.
    const rec = record('PL', { reporting: { adapter_id: '\tjavascript:alert(1)' } });
    expect(messagesOf(L5_urlHygiene([file('data/PL.json', rec)]))).toMatch(/stored XSS/);
  });

  it('rejects an off-allowlist host presented as the equality body, via assertLinkable', () => {
    const report = L5_urlHygiene([
      file('data/PL.json', withEqualityBody({ url: 'https://rzecznik-praw.example/', complaint_url: null, art20_designation_source: null })),
    ]);
    const [found] = report.findings;
    expect(found?.cause).toBeInstanceOf(AllowlistViolation);
    expect((found?.cause as AllowlistViolation).reason).toBe('host_not_allowlisted');
    // The message must send the contributor to the reviewed allowlist file, not tell
    // them to delete the link.
    expect(found?.message).toContain('_allowlist.json');
  });

  it('rejects a look-alike of an allowlisted host \u2014 the label-boundary rule, delegated', () => {
    const report = L5_urlHygiene([
      file('data/PL.json', withEqualityBody({ url: 'https://evil-brpo.gov.pl.attacker.example/', complaint_url: null, art20_designation_source: null })),
    ]);
    expect(report.findings.length).toBeGreaterThan(0);
    expect((report.findings[0]?.cause as AllowlistViolation).reason).toBe('host_not_allowlisted');
  });

  it('accepts an equality-body link on that country\u2019s own allowlisted host', () => {
    const report = L5_urlHygiene([
      file('data/PL.json', withEqualityBody({ url: 'https://bip.brpo.gov.pl/', complaint_url: 'https://bip.brpo.gov.pl/pl/wniosek', art20_designation_source: null })),
    ]);
    expect(messagesOf(report)).toBe('');
  });

  it('holds discovery_hints[].national_link to scheme hygiene but not to a curated list', () => {
    const hint = (national_link: string) => ({
      celex: '32023L0970',
      title: 'A notified measure',
      official_journal: null,
      oj_number: null,
      oj_date: null,
      notified_at: null,
      national_link,
      kind: 'unclassified',
      source_query_at: '2026-09-11',
    });

    // Harvested verbatim from the Commission register: plain http on an uncurated
    // national host is the register's own identifier, not a defect of ours.
    const harvested = record('AT', { discovery_hints: [hint('http://www.ris.bka.gv.at/x')] });
    expect(messagesOf(L5_urlHygiene([file('data/AT.json', harvested)]))).toBe('');

    const scripted = record('AT', { discovery_hints: [hint('javascript:alert(1)')] });
    expect(messagesOf(L5_urlHygiene([file('data/AT.json', scripted)]))).toMatch(/stored XSS/);
  });

  it('is clean on the whole committed tree', () => {
    // The rule now walks 93 harvested links and 27 source URLs. If widening it had made
    // the committed tree red, the pressure would be to weaken the rule rather than fix
    // the data \u2014 which is how the original narrow walk survived review.
    const report = L5_urlHygiene(loadRecords(DATA_DIR));
    expect(messagesOf(report)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// L6 / L7 — the two rules that record a SKIP rather than faking a pass
// ---------------------------------------------------------------------------

describe('L6 link liveness never runs on a pull request', () => {
  it('records a skip with a stated reason on the pull-request profile', () => {
    const report = L6_linkLiveness(fullDataSet(), { profile: 'pull-request' });
    expect(report.rule).toBe('L6');
    expect(report.skipped).toBe(true);
    expect(report.skipReason).toMatch(/nightly/i);
    expect(report.findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CR-03 — L6 could not produce a finding under ANY input. Both branches skipped.
// ---------------------------------------------------------------------------

describe('L6 link liveness can actually fire on the nightly profile', () => {
  const evidence = (over: Partial<ExercisedEvidence> = {}): ExercisedEvidence => ({
    covers: ['cellar'],
    exercised: [],
    attested: [],
    unmet: [],
    unreachable: [],
    awaiting_promotion: [],
    ...over,
  });

  it('is not a rule that can only ever skip \u2014 there is an input that makes it FAIL', () => {
    // The whole of CR-03 in one assertion. Before this, `L6_linkLiveness` returned
    // `skipped(...)` on BOTH branches: no input existed that produced a finding, while the
    // summary listed it among the nine rules as though one could.
    const report = L6_linkLiveness(fullDataSet(), {
      profile: 'nightly',
      exercised: evidence({ unmet: ['data/PL.json#.transposition.status.sources[0]'] }),
    });
    expect(report.skipped).toBe(false);
    expect(report.findings.filter((f) => f.severity === 'error')).toHaveLength(1);
    expect(messagesOf(report)).toContain('data/PL.json#.transposition.status.sources[0]');
    // And it must not tell the maintainer to narrow the requirement to clear it.
    expect(messagesOf(report)).toMatch(/do not resolve this by narrowing/i);
  });

  it('reports an unexercised source as a WARNING when no retrieval layer supplies it', () => {
    // 86 sources reported `queued (not exercised)` under the word PASSED and never reached
    // an annotation. They are not errors — no retrieval layer exists for a SPARQL endpoint
    // that returns zero triples — but they must be visible.
    const report = L6_linkLiveness(fullDataSet(), {
      profile: 'nightly',
      exercised: evidence({ unreachable: ['data/AT.json#.transposition.status.sources[0]'] }),
    });
    expect(report.findings.filter((f) => f.severity === 'warning')).toHaveLength(1);
    expect(report.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
    expect(messagesOf(report)).toMatch(/never as a pass/i);
  });

  it('skips rather than passes when the nightly profile is selected with no evidence', () => {
    // The honest state during an outage: the probe step did not run, so there is nothing
    // to report on. A green here would be a rule reporting on retrieval it never observed.
    const report = L6_linkLiveness(fullDataSet(), { profile: 'nightly' });
    expect(report.skipped).toBe(true);
    expect(report.skipReason).toMatch(/--exercised/);
    expect(report.skipReason).toMatch(/will not report a pass it did not earn/);
  });

  it('makes its own coverage visible, so "ok" is never mistaken for "checked everything"', () => {
    const report = L6_linkLiveness(fullDataSet(), {
      profile: 'nightly',
      exercised: evidence({ exercised: ['a', 'b'], attested: ['c'], unreachable: ['d', 'e'] }),
    });
    expect(report.checked).toEqual({ examined: 3, ofTotal: 5, unit: 'sources' });
  });
});

describe('L7 letter coverage arms itself when the letters package arrives', () => {
  it('records a skip with a stated reason while packages/letters is absent', () => {
    const report = L7_letterCoverage(fullDataSet(), { lettersDir: resolve(pkgRoot, '..', 'letters') });
    expect(report.rule).toBe('L7');
    expect(report.skipped).toBe(true);
    expect(report.skipReason).toMatch(/letters/i);
  });

  // -------------------------------------------------------------------------
  // WR-02 — the rule flips from an honest SKIP to a green that asserts nothing
  // -------------------------------------------------------------------------

  it('reports HOW MANY countries it examined, so a vacuous green is visible', () => {
    // The day `packages/letters` appears, L7 `continue`s past every country whose
    // `article_7.legal_basis` is pending — and all 27 are pending today. Without the count
    // it would go straight from SKIP to `L7 ok` having checked nothing at all.
    const templates = mkdtempSync(resolve(tmpdir(), 'letters-'));
    try {
      const report = L7_letterCoverage(fullDataSet(), { lettersDir: templates });
      expect(report.skipped).toBe(false);
      expect(report.findings).toHaveLength(0);
      expect(report.checked).toEqual({ examined: 0, ofTotal: 27, unit: 'countries' });
    } finally {
      rmSync(templates, { recursive: true, force: true });
    }
  });

  it('takes the template directory as an option rather than guessing the layout', () => {
    // `readdirSync(lettersDir).filter(e => e.isFile())` expected `pl.en.md` to sit directly
    // in the package root, beside package.json and README.md — which no real letters
    // package will do.
    const root = mkdtempSync(resolve(tmpdir(), 'letters-'));
    const templates = resolve(root, 'templates');
    try {
      mkdirSync(templates);
      writeFileSync(resolve(templates, 'pl.en.md'), '# letter');

      const verified = record('PL', {
        article_7: {
          legal_basis: fact({
            value: { instrument: 'national' },
            status: 'verified',
            sources: [source()],
            verified_at: '2026-09-01',
            verified_by: 'marek',
          }),
        },
      });
      const files = [file('data/PL.json', verified)];

      // Found under the conventional `templates/` subdirectory…
      const conventional = L7_letterCoverage(files, { lettersDir: root });
      expect(messagesOf(conventional)).toBe('');
      expect(conventional.checked?.examined).toBe(1);

      // …and under an explicitly named one.
      expect(messagesOf(L7_letterCoverage(files, { lettersDir: root, lettersTemplatesDir: templates }))).toBe('');

      // The search is recursive and matches on the basename, so a Phase 5 layout that
      // nests by locale still arms the rule rather than reporting 27 missing templates.
      const nested = resolve(templates, 'en');
      mkdirSync(nested);
      writeFileSync(resolve(nested, 'sk.en.md'), '# letter');
      expect(
        messagesOf(L7_letterCoverage([file('data/SK.json', { ...verified, country: { code: 'SK' } })], { lettersDir: root })),
      ).toBe('');

      // A directory genuinely holding no template still reports, and names where it looked.
      const empty = mkdtempSync(resolve(tmpdir(), 'letters-empty-'));
      try {
        const missing = L7_letterCoverage(files, { lettersDir: root, lettersTemplatesDir: empty });
        expect(messagesOf(missing)).toMatch(/no English letter template/);
        expect(messagesOf(missing)).toContain(empty);
      } finally {
        rmSync(empty, { recursive: true, force: true });
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails a country with a non-pending legal basis and no English template once the package exists', () => {
    const rec = record('PL', {
      article_7: {
        legal_basis: fact({
          value: { instrument: 'national' },
          status: 'verified',
          sources: [source()],
          verified_at: '2026-09-01',
          verified_by: 'marek',
        }),
      },
    });
    const report = L7_letterCoverage([file('data/PL.json', rec)], {
      // A directory that exists but holds no template, standing in for Phase 5's package.
      lettersDir: pkgRoot,
    });
    expect(report.skipped).toBe(false);
    expect(messagesOf(report)).toContain('PL');
  });
});

// ---------------------------------------------------------------------------
// L8 — the freshness split, delegated to freshnessGate
// ---------------------------------------------------------------------------

describe('L8 freshness', () => {
  const staleBasis = () =>
    fact({
      value: { instrument: 'national' },
      status: 'verified',
      sources: [source()],
      // volatile TTL is 90 days; this is far past it.
      verified_at: '2025-01-01',
      verified_by: 'marek',
    });

  it('hard-fails a stale launch-country legally-operative verified fact', () => {
    const rec = record('PL', { article_7: { legal_basis: staleBasis() } });
    const report = L8_freshness([file('data/PL.json', rec)], { today: TODAY });
    expect(report.rule).toBe('L8');
    const errors = report.findings.filter((f) => f.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    // The wording is freshnessGate's own — one implementation of the hard rule, not two.
    expect(messagesOf(report)).toContain('last confirmed');
  });

  it('warns rather than fails for a stale fact outside the launch set', () => {
    const rec = record('AT', { article_7: { legal_basis: staleBasis() } });
    const report = L8_freshness([file('data/AT.json', rec)], { today: TODAY });
    expect(report.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
    expect(report.findings.filter((f) => f.severity === 'warning').length).toBeGreaterThan(0);
  });

  it('leaves lintAll green when only warnings fire — validate exits zero on a warning', () => {
    const rec = record('AT', { article_7: { legal_basis: staleBasis() } });
    const report = lintAll({ data: [file('data/AT.json', rec)], proposed: [] }, { today: TODAY });
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.errors.filter((f) => f.rule === 'L8')).toHaveLength(0);
    // `ok` is derived from errors alone. A stale non-launch fact nags; it does not block.
    expect(report.rules.find((r) => r.rule === 'L8')?.findings.some((f) => f.severity === 'warning')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// L9 — the promotion boundary, made structural
// ---------------------------------------------------------------------------

describe('L9 a proposed file cannot carry a verified fact', () => {
  it('fails a proposed file with a verified fact, stating that promotion is a maintainer action', () => {
    const rec = record('PL', {
      article_7: {
        legal_basis: fact({
          value: { instrument: 'national' },
          status: 'verified',
          sources: [source()],
          verified_at: '2026-09-01',
          verified_by: 'marek',
        }),
      },
    });
    const report = L9_proposedCannotVerify([file('proposed/PL.json', rec)]);
    expect(report.rule).toBe('L9');
    expect(messagesOf(report)).toMatch(/maintainer/i);
    expect(messagesOf(report)).toMatch(/promot/i);
  });

  it('passes the five proposal files as authored in plan 04', () => {
    const proposed = loadRecords(PROPOSED_DIR);
    expect(proposed).toHaveLength(5);
    expect(L9_proposedCannotVerify(proposed).findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// The unchanged-bump rule — a date cannot move without a value moving
// ---------------------------------------------------------------------------

describe('the lint invokes assertNoUnchangedBump across the changed-file set', () => {
  it('fails a record pair differing only in verified_at', () => {
    const before = record('PL', {
      article_7: {
        legal_basis: fact({
          value: { instrument: 'national' },
          status: 'verified',
          sources: [source()],
          verified_at: '2026-06-01',
          verified_by: 'marek',
        }),
      },
    });
    const after = JSON.parse(JSON.stringify(before)) as Record<string, unknown>;
    (after['article_7'] as Record<string, FactFixture>)['legal_basis']!.verified_at = '2026-09-01';

    const report = lintAll(
      { data: [file('data/PL.json', after)], proposed: [] },
      { today: TODAY, previous: { 'data/PL.json': before } },
    );
    const bump = report.rules.find((r) => r.rule === 'BUMP');
    expect(bump).toBeDefined();
    expect(bump?.findings.length).toBeGreaterThan(0);
    // assertNoUnchangedBump's own wording — proof of delegation, not a re-implementation.
    expect(messagesOf(bump!)).toContain('provenance theatre');
    expect(report.ok).toBe(false);
  });

  it('says nothing when the value moved with the date', () => {
    const before = record('PL', {
      article_7: {
        legal_basis: fact({
          value: { instrument: 'national', citation_note: 'a' },
          status: 'verified',
          sources: [source()],
          verified_at: '2026-06-01',
          verified_by: 'marek',
        }),
      },
    });
    const after = JSON.parse(JSON.stringify(before)) as Record<string, unknown>;
    const basis = (after['article_7'] as Record<string, FactFixture>)['legal_basis']!;
    basis.verified_at = '2026-09-01';
    (basis.value as Record<string, unknown>)['citation_note'] = 'b';

    const report = lintAll(
      { data: [file('data/PL.json', after)], proposed: [] },
      { today: TODAY, previous: { 'data/PL.json': before } },
    );
    expect(report.rules.find((r) => r.rule === 'BUMP')?.findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// lintAll over the real tree: deterministic, and READ-ONLY
// ---------------------------------------------------------------------------

describe('lintAll over the committed tree', () => {
  const run = () =>
    lintAll(
      { data: loadRecords(DATA_DIR), proposed: loadRecords(PROPOSED_DIR) },
      { today: TODAY, profile: 'pull-request', lettersDir: resolve(pkgRoot, '..', 'letters') },
    );

  it('reports every rule identifier L1 through L9', () => {
    const ids = run().rules.map((r) => r.rule);
    for (const id of RULE_IDS) expect(ids).toContain(id);
    expect(ids).toContain('L9');
  });

  it('produces no error-severity finding on the clean tree', () => {
    const report = run();
    expect(report.errors, JSON.stringify(report.errors, null, 2)).toHaveLength(0);
    expect(report.ok).toBe(true);
  });

  it('is deterministic and never writes to the data directory', () => {
    const mtimesBefore = readdirSync(DATA_DIR)
      .map((f) => `${f}:${statSync(resolve(DATA_DIR, f)).mtimeMs}`)
      .sort();
    const first = JSON.stringify(run());
    const second = JSON.stringify(run());
    const mtimesAfter = readdirSync(DATA_DIR)
      .map((f) => `${f}:${statSync(resolve(DATA_DIR, f)).mtimeMs}`)
      .sort();

    expect(second).toBe(first);
    expect(mtimesAfter).toEqual(mtimesBefore);
  });
});

// ---------------------------------------------------------------------------
// The cross-artefact referential pass. Plan 04 could assert only the key SHAPE,
// because plan 03 was filling the corpus in plan 04's own wave. This is the resolve
// half, and it runs before the irreversible go-public step.
//
// VALIDATION.md's LEGAL-03 wave-4 row selects this case by the exact string
// "fallback keys resolve". Renaming it unasserts the deferral.
// ---------------------------------------------------------------------------

describe('fallback keys resolve', () => {
  const corpus = JSON.parse(readFileSync(resolve(DATA_DIR, '_directive.json'), 'utf8')) as Record<
    string,
    unknown
  >;

  it('passes over the real tree — every fallback key names an entry the corpus holds', () => {
    expect(() =>
      assertFallbackKeysResolve(corpus, [...loadRecords(DATA_DIR), ...loadRecords(PROPOSED_DIR)]),
    ).not.toThrow();
  });

  it('fails when a record carries a directive_fallback key the corpus does not hold', () => {
    const rec = record('PL', {
      article_7: {
        response_deadline: fact({
          status: 'directive_fallback',
          value: {
            instrument: 'directive_fallback',
            directive_citation_key: '32023L0970#099.001',
          },
        }),
      },
    });
    expect(() => assertFallbackKeysResolve(corpus, [file('data/PL.json', rec)])).toThrow(
      /32023L0970#099\.001/,
    );
    // The message must name the CARRYING RECORD as well as the key — a key alone does
    // not tell a maintainer which file to open.
    expect(() => assertFallbackKeysResolve(corpus, [file('data/PL.json', rec)])).toThrow(
      /data\/PL\.json/,
    );
  });

  it('fails when the fallback table itself names an absent entry', () => {
    const holed = { ...corpus };
    delete holed['32023L0970#007@eng'];
    expect(() => assertFallbackKeysResolve(holed, loadRecords(DATA_DIR))).toThrow(
      /32023L0970#007/,
    );
  });

  it('fails when the key resolves to an article that holds no such paragraph', () => {
    const rec = record('PL', {
      article_7: {
        response_deadline: fact({
          status: 'directive_fallback',
          value: {
            instrument: 'directive_fallback',
            directive_citation_key: '32023L0970#007.099',
          },
        }),
      },
    });
    expect(() => assertFallbackKeysResolve(corpus, [file('data/PL.json', rec)])).toThrow(
      /007\.099/,
    );
  });
});
