/**
 * The pre-fetch allowlist guard.
 *
 * A `source_url` in a community pull request is untrusted input that decides what host a
 * CI runner connects to (threat T-1-07). The guard therefore runs BEFORE any request is
 * issued, and again on every redirect hop — an allowlisted host that redirects to an
 * arbitrary one is the same SSRF with one more step (T-1-08).
 *
 * Offline by construction: nothing in this file touches the network.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  AllowlistViolation,
  assertFetchable,
  assertRedirectChain,
  isAllowlisted,
} from '../src/allowlist.ts';
import { sourceUrlIssues } from '../src/schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');

/**
 * The DATA is the subject of two of these tests, so it is read and parsed here rather
 * than imported through the module under test. An assertion about the allowlist's
 * contents that runs through the allowlist's own code can be satisfied by changing that
 * code; an assertion against the parsed file cannot.
 */
const ALLOWLIST = JSON.parse(
  readFileSync(resolve(pkgRoot, 'data', 'allowlist.json'), 'utf8'),
) as { all: string[]; byCountry: Record<string, string[]> };

/** The 27 EU member states, ISO-3166-1 alpha-2. Greece is `GR`, not the EU's `EL`. */
const EU27 = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
];

/** The five launch countries are the only entries seeded with a national register. */
const LAUNCH = ['PL', 'SK', 'IT', 'LT', 'MT'];

const violationFor = (url: string, country: string): AllowlistViolation => {
  try {
    assertFetchable(url, country);
  } catch (error) {
    if (error instanceof AllowlistViolation) return error;
    throw error;
  }
  throw new Error(`expected assertFetchable(${url}, ${country}) to throw, but it returned`);
};

describe('the allowlist data', () => {
  it('carries the Cellar host in the all-countries set', () => {
    expect(ALLOWLIST.all).toContain('publications.europa.eu');
  });

  it('holds exactly 27 country keys, with the 22 non-launch entries empty', () => {
    const keys = Object.keys(ALLOWLIST.byCountry).sort();
    expect(keys).toHaveLength(27);
    expect(keys).toEqual([...EU27].sort());

    const nonLaunch = keys.filter((code) => !LAUNCH.includes(code));
    expect(nonLaunch).toHaveLength(22);
    for (const code of nonLaunch) {
      expect(ALLOWLIST.byCountry[code]).toEqual([]);
    }
  });

  it('contains the EUR-Lex web front end nowhere, asserted against the parsed data', () => {
    // Not a grep over source text: a comment mentioning the host would satisfy that, and
    // a host hiding in a nested value would escape it. Flatten every host VALUE instead.
    const hosts = [...ALLOWLIST.all, ...Object.values(ALLOWLIST.byCountry).flat()];
    expect(hosts.length).toBeGreaterThan(3);
    for (const host of hosts) {
      expect(typeof host).toBe('string');
      expect(host.toLowerCase()).not.toContain('eur-lex');
    }
  });
});

describe('assertFetchable — host membership', () => {
  it('rejects a host absent from the requesting country, naming both host and country', () => {
    const violation = violationFor('https://www.littler.com/x', 'PL');
    expect(violation).toBeInstanceOf(AllowlistViolation);
    expect(violation.reason).toBe('host_not_allowlisted');
    expect(violation.host).toBe('www.littler.com');
    expect(violation.country).toBe('PL');
    expect(violation.message).toContain('www.littler.com');
    expect(violation.message).toContain('PL');
  });

  it('is per-country, not global: a Polish register is not fetchable for Slovakia', () => {
    expect(() => assertFetchable('https://dziennikustaw.gov.pl/x', 'SK')).toThrow(
      AllowlistViolation,
    );
    expect(() => assertFetchable('https://dziennikustaw.gov.pl/x', 'PL')).not.toThrow();
  });

  it('accepts the all-countries set for every one of the 27 member states', () => {
    for (const code of EU27) {
      for (const host of ['publications.europa.eu', 'curia.europa.eu', 'ec.europa.eu']) {
        expect(() => assertFetchable(`https://${host}/x`, code)).not.toThrow();
        expect(isAllowlisted(`https://${host}/x`, code)).toBe(true);
      }
    }
  });

  it('matches exactly or one label deep, never on a raw suffix', () => {
    // A registered lookalike ending in an allowlisted name is the T-1-08 spoof.
    expect(() => assertFetchable('https://legislation.mt.evil.example/x', 'MT')).toThrow(
      AllowlistViolation,
    );
    expect(() => assertFetchable('https://evil-legislation.mt/x', 'MT')).toThrow(
      AllowlistViolation,
    );
    // One label of subdomain is the real-world shape (`www.`) and is allowed.
    expect(() => assertFetchable('https://www.legislation.mt/x', 'MT')).not.toThrow();
    // Two labels deep is not.
    expect(() => assertFetchable('https://a.b.legislation.mt/x', 'MT')).toThrow(
      AllowlistViolation,
    );
  });

  it('rejects an unknown country code rather than falling back to the all set', () => {
    expect(() => assertFetchable('https://publications.europa.eu/x', 'XX')).toThrow(
      AllowlistViolation,
    );
  });
});

describe('assertFetchable — URL shape', () => {
  it('rejects credentials in the URL even on an allowlisted host', () => {
    expect(violationFor('https://user:pass@dziennikustaw.gov.pl/x', 'PL').reason).toBe(
      'credentials_in_url',
    );
  });

  it('rejects a non-default port even on an allowlisted host', () => {
    expect(violationFor('https://dziennikustaw.gov.pl:8443/x', 'PL').reason).toBe(
      'non_default_port',
    );
  });

  it('rejects an IP-literal host', () => {
    expect(violationFor('https://93.184.216.34/x', 'PL').reason).toBe('ip_literal_host');
    expect(violationFor('https://[2606:2800:220:1:248:1893:25c8:1946]/x', 'PL').reason).toBe(
      'ip_literal_host',
    );
  });

  it('rejects tracking parameters on an otherwise allowlisted URL', () => {
    for (const param of ['utm_source=x', 'utm_campaign=x', 'fbclid=x', 'gclid=x', 'mc_eid=x']) {
      expect(violationFor(`https://dziennikustaw.gov.pl/x?${param}`, 'PL').reason).toBe(
        'tracking_parameter',
      );
    }
  });

  it('rejects an unparseable URL instead of letting it reach a fetch', () => {
    expect(violationFor('not a url', 'PL').reason).toBe('unparseable_url');
  });
});

describe('assertFetchable — scheme', () => {
  it('rejects http:// for every allowlisted host except the Cellar resource URI', () => {
    const httpAllowed = 'publications.europa.eu';
    const hosts = [...ALLOWLIST.all, ...Object.values(ALLOWLIST.byCountry).flat()];
    for (const host of hosts) {
      if (host === httpAllowed) continue;
      const country =
        Object.entries(ALLOWLIST.byCountry).find(([, list]) => list.includes(host))?.[0] ?? 'PL';
      expect(violationFor(`http://${host}/x`, country).reason).toBe('scheme_not_https');
    }
  });

  it('accepts the one documented http:// exception, the content-negotiated Cellar URI', () => {
    expect(() =>
      assertFetchable('http://publications.europa.eu/resource/celex/32023L0970', 'PL'),
    ).not.toThrow();
  });

  it('names the scheme in the violation for a plain-http national register', () => {
    const violation = violationFor('http://dziennikustaw.gov.pl/x', 'PL');
    expect(violation.reason).toBe('scheme_not_https');
    expect(violation.message).toContain('http:');
  });
});

describe('assertRedirectChain — every hop is re-checked', () => {
  it('rejects an allowlisted host that redirects to a non-allowlisted one', () => {
    const chain = ['https://dziennikustaw.gov.pl/x', 'https://evil.example/x'];
    const error = (() => {
      try {
        assertRedirectChain(chain, 'PL');
      } catch (e) {
        return e;
      }
      return null;
    })();
    expect(error).toBeInstanceOf(AllowlistViolation);
    expect((error as AllowlistViolation).host).toBe('evil.example');
  });

  it('accepts a redirect chain whose every hop stays allowlisted', () => {
    expect(() =>
      assertRedirectChain(
        [
          'http://publications.europa.eu/resource/celex/32023L0970',
          'http://publications.europa.eu/resource/cellar/5bbb9daf.0006.03/DOC_1',
        ],
        'PL',
      ),
    ).not.toThrow();
  });
});

describe('isAllowlisted', () => {
  it('answers with a boolean and never throws', () => {
    expect(isAllowlisted('https://publications.europa.eu/x', 'PL')).toBe(true);
    expect(isAllowlisted('https://www.littler.com/x', 'PL')).toBe(false);
    expect(isAllowlisted('not a url', 'PL')).toBe(false);
  });
});

describe('the guard is strictly stronger than the schema lint', () => {
  it('rejects everything sourceUrlIssues rejects, and more', () => {
    // schema.ts's `sourceUrlIssues` is the PARSE-time lint (ARCHITECTURE L5). This guard
    // is the PRE-FETCH gate. They are separate controls with separate jobs, so this test
    // pins the relationship rather than leaving the two free to drift apart.
    const rejectedByLint = [
      'http://dziennikustaw.gov.pl/x',
      'https://user:pass@dziennikustaw.gov.pl/x',
      'https://dziennikustaw.gov.pl:8443/x',
      'https://93.184.216.34/x',
      'https://dziennikustaw.gov.pl/x?utm_source=y',
    ];
    for (const url of rejectedByLint) {
      expect(sourceUrlIssues(url).length).toBeGreaterThan(0);
      expect(isAllowlisted(url, 'PL')).toBe(false);
    }
    // ...and more: a well-shaped https URL the lint is happy with, on a host that is not
    // this country's register.
    expect(sourceUrlIssues('https://www.littler.com/x')).toEqual([]);
    expect(isAllowlisted('https://www.littler.com/x', 'PL')).toBe(false);
  });
});
