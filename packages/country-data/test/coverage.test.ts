/**
 * The seeded dataset — LEGAL-02, plus the promotion boundary D-06 and D-11 make structural.
 *
 * Offline by construction: this reads the committed files, never the register. The seed is
 * a one-off discovery pull whose result is committed precisely so that a contributor's
 * pull request is never red because a third party's SPARQL endpoint is slow.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { CountryRecord, EU_COUNTRY_CODES, LAUNCH_COUNTRIES, FACT_PATHS, factAt } from '../src/country.ts';
import { ProposedCountryRecord } from '../src/country.ts';
import { sourceUrlIssues } from '../src/schema.ts';
import { dedupeNimRows, nullSentinel, classifyHint, type NimRow } from '../scripts/seed-from-nim.ts';

const DATA_DIR = new URL('../data/', import.meta.url);
const PROPOSED_DIR = new URL('../proposed/', import.meta.url);

/** The query date the committed seed carries. */
const QUERY_DATE = '2026-09-11';

/**
 * The twelve states the register showed with no notified measure as at the query date.
 * This is a statement about the Commission's register, NOT a claim that these states have
 * not transposed.
 */
const NO_MEASURE_NOTIFIED = ['HR', 'CY', 'DK', 'FI', 'FR', 'DE', 'HU', 'IE', 'LV', 'LU', 'NL', 'PT'];

/**
 * The eleven probed national source domains from `01-RESEARCH.md` § "Governance Gates"
 * point 1, plus the three that section lists for every country. `eur-lex.europa.eu` is
 * deliberately absent: it answers 202 with a zero-byte body to every non-browser request,
 * so a source URL pointing at it could never be machine-verified.
 *
 * Allowlist ENFORCEMENT is plan 01-05's url-hygiene rule, which runs over the whole
 * committed dataset on every pull request. This assertion is the authoring-time half.
 */
const PROBE_TABLE_HOSTS = new Set([
  // PL
  'dziennikustaw.gov.pl',
  'isap.sejm.gov.pl',
  'bip.brpo.gov.pl',
  // SK
  'slov-lex.sk',
  'snslp.sk',
  // IT
  'gazzettaufficiale.it',
  'normattiva.it',
  // LT
  'e-tar.lt',
  'lygybe.lt',
  // MT
  'legislation.mt',
  'ncpe.gov.mt',
  // all
  'publications.europa.eu',
  'curia.europa.eu',
  'ec.europa.eu',
]);

const stripWww = (host: string): string => host.replace(/^www\./, '');

/**
 * `data/` also holds the shared Directive corpus, `_directive.json`, which plan 01-01
 * created and plan 01-03 fills. Underscore-prefixed files are shared records, not country
 * records, and are excluded here by that convention.
 */
const countryFileNames = (): string[] =>
  readdirSync(DATA_DIR)
    .filter((name) => name.endsWith('.json') && !name.startsWith('_'))
    .sort();

const readJson = (dir: URL, name: string): unknown =>
  JSON.parse(readFileSync(new URL(name, dir), 'utf8'));

const messagesOf = (result: {
  success: boolean;
  error?: { issues: { message: string; path: PropertyKey[] }[] };
}): string =>
  result.success
    ? ''
    : (result.error?.issues ?? []).map((i) => `${i.path.join('.')}: ${i.message}`).join(' | ');

describe('coverage: exactly 27 member states', () => {
  test('data/ holds exactly 27 country files', () => {
    expect(countryFileNames()).toHaveLength(27);
  });

  test('the filename stems are exactly the 27 EU codes, with no extra and no duplicate', () => {
    const stems = countryFileNames().map((n) => n.replace(/\.json$/, ''));
    expect(new Set(stems).size).toBe(27);
    expect([...stems].sort()).toEqual([...EU_COUNTRY_CODES].sort());
  });

  test('Greece is GR — neither the statistical code EL nor a missing file', () => {
    const stems = countryFileNames().map((n) => n.replace(/\.json$/, ''));
    expect(stems).toContain('GR');
    expect(stems).not.toContain('EL');
  });

  test('the only non-country file in data/ is the shared Directive corpus', () => {
    const others = readdirSync(DATA_DIR).filter((n) => n.endsWith('.json') && n.startsWith('_'));
    expect(others).toEqual(['_directive.json']);
  });

  test('every file parses against the record schema and its stem matches its own code', () => {
    for (const name of countryFileNames()) {
      const result = CountryRecord.safeParse(readJson(DATA_DIR, name));
      expect(`${name}: ${messagesOf(result)}`).toBe(`${name}: `);
      const parsed = result.success ? result.data : null;
      expect(parsed?.country.code).toBe(name.replace(/\.json$/, ''));
    }
  });
});

describe('coverage: the script promoted nothing', () => {
  test('no legally-operative field in data/ reads verified', () => {
    for (const name of countryFileNames()) {
      const record = readJson(DATA_DIR, name);
      for (const path of [
        'article_7.legal_basis',
        'article_7.response_deadline',
        'article_12_3',
        'enforcement.equality_body',
      ]) {
        const fact = factAt(record, path);
        expect(`${name}/${path}: ${fact?.status}`).toBe(`${name}/${path}: pending_verification`);
        expect(fact?.value).toBeNull();
      }
    }
  });

  test('the Art. 12(3) option is unknown in every one of the 27, launch five included', () => {
    for (const name of countryFileNames()) {
      const fact = factAt(readJson(DATA_DIR, name), 'article_12_3');
      expect(fact?.value).toBeNull();
      expect(fact?.status).toBe('pending_verification');
    }
  });

  test('no equality body is claimed from a reachable domain alone', () => {
    for (const name of countryFileNames()) {
      const fact = factAt(readJson(DATA_DIR, name), 'enforcement.equality_body');
      expect(fact?.value).toBeNull();
      expect(fact?.verified_by).toBeNull();
    }
  });

  test('no legal basis was promoted with a date preceding the Directive', () => {
    // Pitfall 4's warning sign: a `legal_basis` older than the Directive it transposes is
    // the tell that a script guessed. Nothing is promoted, so there is nothing to date.
    for (const name of countryFileNames()) {
      expect(factAt(readJson(DATA_DIR, name), 'article_7.legal_basis')?.value).toBeNull();
    }
  });
});

describe('coverage: transposition status is real, sourced and honest', () => {
  test('every file cites the register, verified on the query date', () => {
    for (const name of countryFileNames()) {
      const fact = factAt(readJson(DATA_DIR, name), 'transposition.status');
      expect(fact?.status).toBe('verified');
      expect(fact?.sources.length).toBeGreaterThan(0);
      expect(fact?.verified_at).toBe(QUERY_DATE);
      expect(fact?.sources[0]?.accessed_at).toBe(QUERY_DATE);
    }
  });

  test('the twelve states with no notified measure carry no hints and say so', () => {
    for (const code of NO_MEASURE_NOTIFIED) {
      const record = readJson(DATA_DIR, `${code}.json`) as { discovery_hints: unknown[] };
      expect(record.discovery_hints).toHaveLength(0);
      expect(factAt(record, 'transposition.status')?.value).toBe('no_measure_notified');
    }
    expect(NO_MEASURE_NOTIFIED).toHaveLength(12);
  });

  test('no_measure_notified is never stored as a claim that the state has not transposed', () => {
    for (const code of NO_MEASURE_NOTIFIED) {
      const fact = factAt(readJson(DATA_DIR, `${code}.json`), 'transposition.status');
      expect(fact?.value).not.toBe('pending');
      expect(fact?.value).not.toBe('draft');
      // The note the UI renders names the register and the date, not the state's conduct.
      expect(String((fact as { note_key?: string } | null)?.note_key)).toMatch(/as_at_query_date/);
    }
  });

  test('the fifteen states with notified measures carry hints and an honest unknown status', () => {
    const withHints = countryFileNames().filter(
      (n) => (readJson(DATA_DIR, n) as { discovery_hints: unknown[] }).discovery_hints.length > 0,
    );
    expect(withHints).toHaveLength(15);
    for (const name of withHints) {
      expect(factAt(readJson(DATA_DIR, name), 'transposition.status')?.value).toBe('unknown');
    }
  });
});

describe('coverage: the register traps are handled', () => {
  test('no null-date sentinel and no unsubstituted template placeholder is stored', () => {
    for (const name of [...countryFileNames(), ...readdirSync(PROPOSED_DIR)]) {
      const raw = readFileSync(
        new URL(name, countryFileNames().includes(name) ? DATA_DIR : PROPOSED_DIR),
        'utf8',
      );
      expect(`${name}: ${raw.includes('1001-01-01')}`).toBe(`${name}: false`);
      expect(`${name}: ${/\$[A-Za-z_]+\$/.test(raw)}`).toBe(`${name}: false`);
    }
  });

  test('Italy’s sentinel official-journal date is stored as null, not as the year 1001', () => {
    const it = readJson(DATA_DIR, 'IT.json') as {
      discovery_hints: { oj_date: string | null; oj_number: string | null }[];
    };
    expect(it.discovery_hints).toHaveLength(1);
    expect(it.discovery_hints[0]?.oj_date).toBeNull();
    expect(it.discovery_hints[0]?.oj_number).toBe('125 del 1 giugno 2026');
  });

  test('nullSentinel maps both observed markers and leaves real values alone', () => {
    expect(nullSentinel('1001-01-01')).toBeNull();
    expect(nullSentinel('$BUILD_INFO$')).toBeNull();
    expect(nullSentinel('  ')).toBeNull();
    expect(nullSentinel(undefined)).toBeNull();
    expect(nullSentinel('2026-06-05')).toBe('2026-06-05');
    expect(nullSentinel(' 21,661 ')).toBe('21,661');
  });
});

describe('coverage: discovery hints are ordered so a re-run has no diff', () => {
  test('hints are sorted by notification date then CELEX, ascending', () => {
    for (const name of countryFileNames()) {
      const record = readJson(DATA_DIR, name) as {
        discovery_hints: { celex: string; notified_at: string | null }[];
      };
      const keys = record.discovery_hints.map((h) => `${h.notified_at ?? ''}|${h.celex}`);
      expect(`${name}: ${JSON.stringify(keys)}`).toBe(`${name}: ${JSON.stringify([...keys].sort())}`);
    }
  });

  test('eight of Poland’s ten notified items are marked consolidated republications', () => {
    const pl = readJson(DATA_DIR, 'PL.json') as { discovery_hints: { kind: string }[] };
    expect(pl.discovery_hints).toHaveLength(10);
    const consolidated = pl.discovery_hints.filter((h) => h.kind === 'consolidated_republication');
    expect(consolidated).toHaveLength(8);
    expect(pl.discovery_hints.filter((h) => h.kind === 'transposing_candidate')).toHaveLength(2);
  });

  test('Slovakia’s 2001 State Statistics Act is marked a pre-existing act, not a candidate', () => {
    const sk = readJson(DATA_DIR, 'SK.json') as {
      discovery_hints: { title: string; kind: string }[];
    };
    const statistics = sk.discovery_hints.find((h) => /540\/2001/.test(h.title));
    expect(statistics).toBeDefined();
    expect(statistics?.kind).not.toBe('transposing_candidate');
  });

  test('dedupeNimRows is idempotent and order-stable over a raw fixture', () => {
    const row = (celex: string, title: string, notif: string | null, link: string | null): NimRow => ({
      country: 'PL',
      nim: `urn:${celex}`,
      celex,
      title,
      national_link: link,
      official_journal: 'Dziennik Ustaw',
      oj_number: null,
      oj_date: null,
      notified_at: notif,
    });
    // The raw shape the endpoint returns: the same measure repeated by the OPTIONAL
    // cross-product, some rows carrying more optional fields than others.
    const raw: NimRow[] = [
      row('72023L0970POL_1', 'Ustawa A', '2026-06-03', null),
      row('72023L0970POL_2', 'Ustawa B', '2026-06-02', null),
      row('72023L0970POL_1', 'Ustawa A', '2026-06-03', 'https://example.gov.pl/a'),
      row('72023L0970POL_3', 'Ustawa C', null, null),
      row('72023L0970POL_1', 'Ustawa A', '2026-06-03', null),
    ];
    const once = dedupeNimRows(raw);
    expect(once).toHaveLength(3);
    expect(dedupeNimRows(once)).toEqual(once);
    expect(dedupeNimRows([...raw].reverse())).toEqual(once);
    // The richer of the duplicate rows wins, never the one that happened to arrive first.
    expect(once.find((r) => r.celex === '72023L0970POL_1')?.national_link).toBe(
      'https://example.gov.pl/a',
    );
    // Null notification dates sort first, then date ascending, then CELEX ascending.
    expect(once.map((r) => r.celex)).toEqual([
      '72023L0970POL_3',
      '72023L0970POL_2',
      '72023L0970POL_1',
    ]);
  });

  test('classifyHint never promotes a row the candidate table does not name', () => {
    expect(classifyHint('Obwieszczenie Marszałka Sejmu', '2025-06-23', [], 'X')).toBe(
      'consolidated_republication',
    );
    expect(classifyHint('Zákon č. 540/2001 Z. z. o štátnej štatistike', '2001-12-20', [], 'X')).toBe(
      'pre_existing_act',
    );
    expect(classifyHint('Ustawa z dnia 4 czerwca 2025 r.', '2025-06-23', ['X'], 'X')).toBe(
      'transposing_candidate',
    );
    expect(classifyHint('Something recent', '2026-06-05', [], 'X')).toBe('unclassified');
  });
});

describe('coverage: the maintainer-promotion queue', () => {
  const proposalFiles = (): string[] => readdirSync(PROPOSED_DIR).filter((n) => n.endsWith('.json')).sort();

  test('proposed/ holds exactly five files, one per launch country', () => {
    expect(proposalFiles()).toHaveLength(5);
    expect(proposalFiles().map((n) => n.replace(/\.json$/, '')).sort()).toEqual(
      [...LAUNCH_COUNTRIES].sort(),
    );
  });

  test('every proposal parses and carries no verified fact', () => {
    for (const name of proposalFiles()) {
      const result = ProposedCountryRecord.safeParse(readJson(PROPOSED_DIR, name));
      expect(`${name}: ${messagesOf(result)}`).toBe(`${name}: `);
      const record = readJson(PROPOSED_DIR, name);
      for (const path of FACT_PATHS) {
        expect(`${name}/${path}`).toBe(`${name}/${path}`);
        expect(factAt(record, path)?.status).not.toBe('verified');
      }
    }
  });

  test('the raw text of a proposal never contains a verified status', () => {
    for (const name of proposalFiles()) {
      const raw = readFileSync(new URL(name, PROPOSED_DIR), 'utf8');
      expect(`${name}: ${/["']status["']\s*:\s*["']verified["']/.test(raw)}`).toBe(`${name}: false`);
    }
  });

  test('every proposal names its verification strategy, and SK and LT name manual-attest', () => {
    const strategyOf = (code: string): string => {
      const record = readJson(PROPOSED_DIR, `${code}.json`) as {
        proposals: { verification_strategy: string }[];
      };
      return record.proposals[0]?.verification_strategy ?? '';
    };
    expect(strategyOf('SK')).toBe('manual-attest');
    expect(strategyOf('LT')).toBe('manual-attest');
    expect(strategyOf('MT')).toBe('jsonld');
    expect(strategyOf('IT')).toBe('html-anchor');
    expect(strategyOf('PL')).toBe('html-anchor');
  });

  test('Poland proposes neither candidate as settled', () => {
    const pl = readJson(PROPOSED_DIR, 'PL.json') as {
      proposals: { proposed_value: unknown; candidates: unknown[] }[];
    };
    expect(pl.proposals[0]?.proposed_value).toBeNull();
    expect(pl.proposals[0]?.candidates).toHaveLength(2);
  });

  test('every proposal cites at least one source and names a register host to check', () => {
    for (const name of proposalFiles()) {
      const record = readJson(PROPOSED_DIR, name) as {
        proposals: { sources: unknown[]; national_register_host: string | null }[];
      };
      for (const proposal of record.proposals) {
        expect(proposal.sources.length).toBeGreaterThan(0);
        expect(proposal.national_register_host).not.toBeNull();
      }
    }
  });

  test('a national source is cited only where the register itself supplied the link', () => {
    // Italy, Poland and Slovakia supplied no national link. No deep URL is invented for
    // them — the domain a maintainer must check is named instead.
    for (const code of ['IT', 'PL', 'SK']) {
      const record = readJson(PROPOSED_DIR, `${code}.json`) as {
        proposals: { sources: { url: string }[] }[];
      };
      for (const proposal of record.proposals) {
        for (const s of proposal.sources) {
          expect(`${code}: ${new URL(s.url).host}`).toBe(`${code}: publications.europa.eu`);
        }
      }
    }
    for (const code of ['MT', 'LT']) {
      const record = readJson(PROPOSED_DIR, `${code}.json`) as {
        proposals: { sources: { url: string }[] }[];
      };
      const hosts = record.proposals.flatMap((p) => p.sources.map((s) => stripWww(new URL(s.url).host)));
      expect(hosts.length).toBeGreaterThan(1);
    }
  });
});

describe('coverage: source URL hygiene and the host inventory', () => {
  /** Every `Source.url` across the 32 written files, read from the parsed JSON. */
  const allSourceUrls = (): { file: string; url: string }[] => {
    const out: { file: string; url: string }[] = [];
    const collect = (file: string, node: unknown): void => {
      if (Array.isArray(node)) {
        for (const item of node) collect(file, item);
        return;
      }
      if (typeof node !== 'object' || node === null) return;
      const obj = node as Record<string, unknown>;
      if (typeof obj['url'] === 'string' && typeof obj['anchor'] === 'string') {
        out.push({ file, url: obj['url'] });
      }
      for (const value of Object.values(obj)) collect(file, value);
    };
    for (const name of countryFileNames()) collect(`data/${name}`, readJson(DATA_DIR, name));
    for (const name of readdirSync(PROPOSED_DIR).filter((n) => n.endsWith('.json'))) {
      collect(`proposed/${name}`, readJson(PROPOSED_DIR, name));
    }
    return out;
  };

  test('32 files were written and every one of them contributes at least one source', () => {
    const files = new Set(allSourceUrls().map((s) => s.file));
    expect(files.size).toBe(32);
  });

  test('every source URL passes the plan-01 Source URL rules', () => {
    for (const { file, url } of allSourceUrls()) {
      expect(`${file} ${url}: ${sourceUrlIssues(url).join('; ')}`).toBe(`${file} ${url}: `);
    }
  });

  test('every distinct source host is drawn from the probed source set', () => {
    const hosts = new Set(allSourceUrls().map((s) => stripWww(new URL(s.url).host)));
    for (const host of hosts) {
      expect(`${host} in probe table: ${PROBE_TABLE_HOSTS.has(host)}`).toBe(
        `${host} in probe table: true`,
      );
    }
    // Recorded so plan 01-05's url-hygiene rule has a stated expectation to meet rather
    // than a divergence to discover.
    expect([...hosts].sort()).toEqual(['e-tar.lt', 'legislation.mt', 'publications.europa.eu']);
  });

  test('eur-lex.europa.eu appears nowhere — it answers 202 with an empty body', () => {
    for (const { file, url } of allSourceUrls()) {
      expect(`${file}: ${url.includes('eur-lex.europa.eu')}`).toBe(`${file}: false`);
    }
  });
});
