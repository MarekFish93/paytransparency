/**
 * The country record schema — LEGAL-01, LEGAL-02, LEGAL-05, LEGAL-06.
 *
 * These assertions are the point at which "pending verification is unforgeable" stops
 * being a UI convention and becomes a parse error. Each one names a way a wrong statute
 * could otherwise reach a letter a worker sends to their own employer.
 *
 * The `describe` titles are load-bearing: `01-VALIDATION.md` selects cases by
 * `-t "verified requires source"`, `-t "pending must be null"`, `-t "human confirm"`
 * and `-t "art_12_3"`. Renaming one silently unbinds a requirement from its test.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  CITATION_KEY_SHAPE,
  CountryRecord,
  EU_COUNTRY_CODES,
  LAUNCH_COUNTRIES,
  LEGALLY_OPERATIVE_FIELDS,
} from '../src/country.ts';
import { DirectiveQuotation } from '../src/schema.ts';
import type { Source } from '../src/schema.ts';

const QUERY_DATE = '2026-09-11';

/** A source that is structurally valid without claiming machine-verified wording. */
const source = (overrides: Partial<Source> = {}): Source => ({
  url: 'http://publications.europa.eu/resource/nim/202603933',
  title: 'National implementing measure notified for Directive (EU) 2023/970',
  publisher: 'Publications Office of the European Union',
  kind: 'eu_institution',
  verification: 'metadata-only',
  anchor: '32023L0970',
  language: 'en',
  accessed_at: QUERY_DATE,
  scope: null,
  ...overrides,
});

type Json = Record<string, unknown>;

/** A pending fact: value null, no sources, no date. The honest default everywhere. */
const pending = (volatility: string): Json => ({
  value: null,
  status: 'pending_verification',
  sources: [],
  verified_at: null,
  verified_by: null,
  volatility,
});

/**
 * A minimal record that parses. Every legally-operative field is pending, which is
 * exactly the shape the seeder writes for all 27 states.
 */
function baseRecord(code = 'EE'): Json {
  return {
    $schema: '../country.schema.json',
    schema_version: '1.0.0',
    country: {
      code,
      name_en: 'Estonia',
      official_languages: ['et'],
      letter_languages: ['en'],
      currency: 'EUR',
    },
    transposition: {
      status: {
        value: 'unknown',
        status: 'verified',
        sources: [source()],
        verified_at: QUERY_DATE,
        verified_by: null,
        volatility: 'volatile',
      },
      in_force_from: pending('volatile'),
      expected_from: pending('volatile'),
      partial_in_force: pending('volatile'),
      national_act: pending('volatile'),
      draft_asserting_sources: [],
    },
    article_7: {
      legal_basis: pending('volatile'),
      response_deadline: pending('volatile'),
      channel: pending('volatile'),
      employer_reminder_duty: pending('volatile'),
      language_requirement: pending('volatile'),
    },
    article_12_3: pending('volatile'),
    article_7_2: pending('volatile'),
    enforcement: {
      anti_retaliation: pending('volatile'),
      burden_of_proof_reversal: pending('volatile'),
      equality_body: pending('stable'),
      labour_inspectorate: pending('stable'),
      penalties: pending('volatile'),
    },
    reporting: {
      thresholds: pending('stable'),
      filing_deadline: pending('volatile'),
      filing_authority: pending('stable'),
      template: pending('stable'),
      adapter_id: null,
    },
    discovery_hints: [],
    meta: { maintainers: [], review_interval_days: 90, last_full_review: null },
  };
}

const verifiedLegalBasis = (verifiedBy: string | null): Json => ({
  value: {
    instrument: 'national',
    short_title: 'Test Act',
    official_title: 'An Act transposing Directive (EU) 2023/970',
    journal_ref: null,
    article: null,
    adopted_at: null,
    in_force_from: null,
    url: null,
  },
  status: 'verified',
  sources: [source()],
  verified_at: QUERY_DATE,
  verified_by: verifiedBy,
  volatility: 'volatile',
});

const messagesOf = (result: { success: boolean; error?: { issues: { message: string }[] } }): string =>
  result.success ? '' : (result.error?.issues ?? []).map((i) => i.message).join(' | ');

describe('the country record: verified requires source', () => {
  test('rejects a verified legal basis citing no source', () => {
    const record = baseRecord();
    const basis = verifiedLegalBasis(null);
    basis['sources'] = [];
    (record['article_7'] as Json)['legal_basis'] = basis;
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toMatch(/must cite at least one source/);
  });

  test('rejects a verified legal basis with no verified_at date', () => {
    const record = baseRecord();
    const basis = verifiedLegalBasis(null);
    basis['verified_at'] = null;
    (record['article_7'] as Json)['legal_basis'] = basis;
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toMatch(/verified_at/);
  });

  test('accepts a verified legal basis carrying a source and a date', () => {
    const record = baseRecord();
    (record['article_7'] as Json)['legal_basis'] = verifiedLegalBasis(null);
    expect(CountryRecord.safeParse(record).success).toBe(true);
  });
});

describe('the country record: pending must be null', () => {
  test('rejects a pending_verification response deadline carrying a value', () => {
    const record = baseRecord();
    (record['article_7'] as Json)['response_deadline'] = {
      value: { instrument: 'national', amount: 2, unit: 'month', from: 'request', national_citation: null },
      status: 'pending_verification',
      sources: [],
      verified_at: null,
      verified_by: null,
      volatility: 'volatile',
    };
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toMatch(/never a plausible guess/);
  });

  test('accepts a pending_verification response deadline with value null', () => {
    expect(CountryRecord.safeParse(baseRecord()).success).toBe(true);
  });
});

describe('the country record: human confirm', () => {
  test('rejects a launch-country verified legal basis with a null verified_by', () => {
    const record = baseRecord('PL');
    (record['country'] as Json)['name_en'] = 'Poland';
    (record['article_7'] as Json)['legal_basis'] = verifiedLegalBasis(null);
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toMatch(/verified_by/);
  });

  test('accepts the same verified legal basis for a non-launch country', () => {
    const record = baseRecord('EE');
    (record['article_7'] as Json)['legal_basis'] = verifiedLegalBasis(null);
    expect(CountryRecord.safeParse(record).success).toBe(true);
  });

  test('accepts a launch-country verified legal basis once a human is named', () => {
    const record = baseRecord('PL');
    (record['country'] as Json)['name_en'] = 'Poland';
    (record['article_7'] as Json)['legal_basis'] = verifiedLegalBasis('@maintainer');
    expect(CountryRecord.safeParse(record).success).toBe(true);
  });

  test('covers every legally-operative field, not just the legal basis', () => {
    for (const field of LEGALLY_OPERATIVE_FIELDS) {
      expect(field).toMatch(/^(article_7\.|article_12_3)/);
    }
    expect([...LEGALLY_OPERATIVE_FIELDS]).toEqual([
      'article_7.legal_basis',
      'article_7.response_deadline',
      'article_12_3',
    ]);
  });
});

describe('the country record: art_12_3', () => {
  test('rejects a bare boolean and explains that the option is a condition, not a route', () => {
    const record = baseRecord();
    (record['article_12_3'] as Json)['value'] = true;
    (record['article_12_3'] as Json)['status'] = 'verified';
    (record['article_12_3'] as Json)['sources'] = [source()];
    (record['article_12_3'] as Json)['verified_at'] = QUERY_DATE;
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toMatch(/condition/i);
    expect(messagesOf(result)).toMatch(/not a (blanket )?rout/i);
  });

  test('accepts a condition object naming the three bodies', () => {
    const record = baseRecord();
    record['article_12_3'] = {
      value: {
        option_taken: true,
        condition: 'disclosure_identifies_individual_worker',
        bodies: ['workers_representatives', 'labour_inspectorate', 'equality_body'],
        national_citation: 'Test Act, s. 12',
      },
      status: 'verified',
      sources: [source()],
      verified_at: QUERY_DATE,
      verified_by: '@maintainer',
      volatility: 'volatile',
    };
    const result = CountryRecord.safeParse(record);
    expect(messagesOf(result)).toBe('');
    expect(result.success).toBe(true);
  });

  test('is independent of the Art. 7(2) standing right — a record may carry both', () => {
    const record = baseRecord();
    record['article_12_3'] = {
      value: {
        option_taken: false,
        condition: 'disclosure_identifies_individual_worker',
        bodies: [],
        national_citation: null,
      },
      status: 'verified',
      sources: [source()],
      verified_at: QUERY_DATE,
      verified_by: '@maintainer',
      volatility: 'volatile',
    };
    record['article_7_2'] = {
      value: {
        instrument: 'national',
        available: true,
        through: ['workers_representatives', 'equality_body'],
        national_citation: 'Test Act, s. 7',
      },
      status: 'verified',
      sources: [source()],
      verified_at: QUERY_DATE,
      verified_by: '@maintainer',
      volatility: 'volatile',
    };
    const result = CountryRecord.safeParse(record);
    expect(messagesOf(result)).toBe('');
    expect(result.success).toBe(true);
  });

  test('rejects option_taken true with no body named', () => {
    const record = baseRecord();
    record['article_12_3'] = {
      value: {
        option_taken: true,
        condition: 'disclosure_identifies_individual_worker',
        bodies: [],
        national_citation: null,
      },
      status: 'verified',
      sources: [source()],
      verified_at: QUERY_DATE,
      verified_by: '@maintainer',
      volatility: 'volatile',
    };
    expect(CountryRecord.safeParse(record).success).toBe(false);
  });
});

describe('the country record: country codes', () => {
  test('EU_COUNTRY_CODES has exactly 27 members, includes GR and excludes EL, UK and GB', () => {
    expect(EU_COUNTRY_CODES).toHaveLength(27);
    expect(new Set(EU_COUNTRY_CODES).size).toBe(27);
    expect(EU_COUNTRY_CODES).toContain('GR');
    for (const notAMember of ['EL', 'UK', 'GB']) {
      expect(EU_COUNTRY_CODES as readonly string[]).not.toContain(notAMember);
    }
  });

  test('LAUNCH_COUNTRIES is exactly PL, SK, IT, LT, MT', () => {
    expect([...LAUNCH_COUNTRIES]).toEqual(['PL', 'SK', 'IT', 'LT', 'MT']);
  });

  test('rejects the EU statistical code EL in place of GR', () => {
    expect(CountryRecord.safeParse(baseRecord('EL')).success).toBe(false);
  });

  test('accepts GR', () => {
    expect(CountryRecord.safeParse(baseRecord('GR')).success).toBe(true);
  });

  test('rejects a country code outside the 27-member set', () => {
    for (const outsider of ['UK', 'GB', 'NO', 'CH']) {
      expect(CountryRecord.safeParse(baseRecord(outsider)).success).toBe(false);
    }
  });
});

describe('the country record: draft means the source said draft', () => {
  test('rejects a draft transposition status with no source flagged as saying draft', () => {
    const record = baseRecord();
    ((record['transposition'] as Json)['status'] as Json)['value'] = 'draft';
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toMatch(/draft/i);
  });

  test('accepts a draft status when a cited source is flagged as saying draft', () => {
    const record = baseRecord();
    const transposition = record['transposition'] as Json;
    (transposition['status'] as Json)['value'] = 'draft';
    transposition['draft_asserting_sources'] = [source().url];
    expect(CountryRecord.safeParse(record).success).toBe(true);
  });

  test('rejects a draft flag pointing at a source the fact does not cite', () => {
    const record = baseRecord();
    const transposition = record['transposition'] as Json;
    (transposition['status'] as Json)['value'] = 'draft';
    transposition['draft_asserting_sources'] = ['https://example.org/not-cited'];
    expect(CountryRecord.safeParse(record).success).toBe(false);
  });
});

describe('the country record: directive_fallback', () => {
  const fallbackDeadline = (extra: Json = {}): Json => ({
    value: {
      instrument: 'directive_fallback',
      directive_citation_key: '32023L0970#007.004',
      label_key: 'fallback.article_7_4_two_months',
      ...extra,
    },
    status: 'directive_fallback',
    sources: [],
    verified_at: null,
    verified_by: null,
    volatility: 'volatile',
  });

  test('accepts a fallback whose citation key matches the publisher id shape', () => {
    const record = baseRecord();
    (record['article_7'] as Json)['response_deadline'] = fallbackDeadline();
    const result = CountryRecord.safeParse(record);
    expect(messagesOf(result)).toBe('');
    expect(result.success).toBe(true);
  });

  test('rejects a fallback that also carries a national citation string', () => {
    const record = baseRecord();
    (record['article_7'] as Json)['response_deadline'] = fallbackDeadline({
      national_citation: 'Kodeks pracy art. 183c',
    });
    expect(CountryRecord.safeParse(record).success).toBe(false);
  });

  test('rejects a citation key naming an article outside the phase cited set', () => {
    const record = baseRecord();
    (record['article_7'] as Json)['response_deadline'] = {
      ...fallbackDeadline(),
      value: {
        instrument: 'directive_fallback',
        directive_citation_key: '32023L0970#024.001',
        label_key: 'fallback.invented',
      },
    };
    expect(CountryRecord.safeParse(record).success).toBe(false);
  });

  /**
   * `schema.ts` froze the citation-key regex on `DirectiveQuotation`; `country.ts`
   * restates it as `CITATION_KEY_SHAPE` because a fallback value is not a quotation. The
   * two must never drift, or a key the corpus accepts would be rejected here (or worse,
   * the reverse). Proved by behaviour rather than by comparing regex sources.
   */
  test('the record and the frozen Directive quotation agree on the citation-key shape', () => {
    const quotation = (key: string): unknown => ({
      text: 'Employers shall provide the information referred to in paragraph 1 within two months.',
      citation_key: key,
      article: 7,
      paragraph: 4,
    });
    for (const key of ['32023L0970#007.004', '32023L0970#012.003']) {
      expect(CITATION_KEY_SHAPE.test(key)).toBe(true);
      expect(DirectiveQuotation.safeParse(quotation(key)).success).toBe(true);
    }
    for (const key of ['Directive 2023/970 Art. 7(4)', '32023L0970#7.4', '32023L0970-007.004']) {
      expect(CITATION_KEY_SHAPE.test(key)).toBe(false);
      expect(DirectiveQuotation.safeParse(quotation(key)).success).toBe(false);
    }
  });

  test('rejects a hand-rolled citation key that is not the publisher id shape', () => {
    const record = baseRecord();
    (record['article_7'] as Json)['response_deadline'] = {
      ...fallbackDeadline(),
      value: {
        instrument: 'directive_fallback',
        directive_citation_key: 'Directive 2023/970 Art. 7(4)',
        label_key: 'fallback.article_7_4_two_months',
      },
    };
    expect(CountryRecord.safeParse(record).success).toBe(false);
  });
});

describe('the country record: equality body', () => {
  const bodies = (value: unknown): Json => ({
    value,
    status: 'verified',
    sources: [source({ kind: 'equality_body' })],
    verified_at: QUERY_DATE,
    verified_by: '@maintainer',
    volatility: 'stable',
  });

  test('holds an array, so a state designating two bodies renders both', () => {
    const record = baseRecord();
    (record['enforcement'] as Json)['equality_body'] = bodies([
      {
        name_local: 'Rzecznik Praw Obywatelskich',
        name_en: 'Commissioner for Human Rights',
        url: null,
        complaint_url: null,
        art20_designation_source: null,
      },
      {
        name_local: 'Pełnomocnik Rządu do Spraw Równego Traktowania',
        name_en: 'Government Plenipotentiary for Equal Treatment',
        url: null,
        complaint_url: null,
        art20_designation_source: null,
      },
    ]);
    const result = CountryRecord.safeParse(record);
    expect(messagesOf(result)).toBe('');
    expect(result.success).toBe(true);
    const parsed = result.success ? result.data : null;
    expect(parsed?.enforcement.equality_body.value).toHaveLength(2);
  });

  test('preserves the designating instrument order across a parse round trip', () => {
    const record = baseRecord();
    const ordered = ['Body A', 'Body B', 'Body C'].map((name_local) => ({
      name_local,
      name_en: null,
      url: null,
      complaint_url: null,
      art20_designation_source: null,
    }));
    (record['enforcement'] as Json)['equality_body'] = bodies(ordered);
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(true);
    const names = result.success
      ? (result.data.enforcement.equality_body.value ?? []).map((b) => b.name_local)
      : [];
    expect(names).toEqual(['Body A', 'Body B', 'Body C']);
  });

  test('rejects a local name that is not stored in NFC', () => {
    const record = baseRecord();
    // U+0105 (ą) decomposes to a + U+0328; U+00F3 (ó) to o + U+0301. The NFD form of
    // this name is therefore a different byte string from the NFC form a source serves.
    const decomposed = 'Pełnomocnik Rządu do Spraw Równego Traktowania'.normalize('NFD');
    expect(decomposed).not.toBe(decomposed.normalize('NFC'));
    (record['enforcement'] as Json)['equality_body'] = bodies([
      {
        name_local: decomposed,
        name_en: null,
        url: null,
        complaint_url: null,
        art20_designation_source: null,
      },
    ]);
    const result = CountryRecord.safeParse(record);
    expect(result.success).toBe(false);
    expect(messagesOf(result)).toMatch(/NFC/);
  });
});

describe('the country record: no per-worker annual request frequency', () => {
  test('the schema declares no field capping how often a worker may ask', () => {
    const src = readFileSync(new URL('../src/country.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/request_frequency/);
    expect(src).toMatch(/employer_reminder_duty/);
  });

  /**
   * Plan 01-03 fills `data/_directive.json` in this plan's own wave. A parse-time
   * assertion that a citation key RESOLVES would fail for every key 01-03 had not yet
   * written, and weakening it to make it pass would hide the check. So the schema asserts
   * the citation-key SHAPE and never reads the corpus — which means no file read and no
   * JSON import in this module at all.
   */
  test('the schema never reads the Directive corpus at parse time', () => {
    const src = readFileSync(new URL('../src/country.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/readFile/);
    expect(src).not.toMatch(/node:fs/);
    expect(src).not.toMatch(/require\s*\(/);
    expect(src).not.toMatch(/from\s+['"][^'"]+\.json['"]/);
    expect(src).not.toMatch(/import\s*\(/);
  });
});
