/**
 * Seed all 27 member states from the Commission's National Implementing Measures register.
 *
 * **The register is an authoritative discovery index, not a curated answer.** It names the
 * haystack with impeccable provenance — dated, machine-readable, and citing the official
 * journal — but choosing the needle is legal judgement. Slovakia notified its 2001 State
 * Statistics Act; eight of Poland's ten notified items are Marshal of the Sejm
 * announcements republishing consolidated texts. So this script promotes NOTHING:
 *
 *   - every register row lands as a `discovery_hint`,
 *   - `transposition.status` is set from what was actually observed, with the query as its
 *     source — `no_measure_notified` where nothing was notified, which is a statement
 *     about the register on the query date and NEVER a claim that the state has not
 *     transposed,
 *   - every legally-operative field is written `pending_verification` with value null for
 *     all 27 states, including the launch five.
 *
 * A human promotes exactly one measure to `legal_basis` and records `verified_by` (D-06).
 * The five launch countries get a DRAFT in `proposed/` to make that reading cheap.
 *
 * Runs ONCE, off both the pull-request and the nightly paths: the SPARQL endpoint was
 * observed timing out at 60 seconds on a complex query, and this is a one-off discovery
 * pull whose result is committed.
 *
 * Runs under Node's native type stripping — `node packages/country-data/scripts/seed-from-nim.ts` —
 * so only erasable syntax is used.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import {
  EU_COUNTRY_CODES,
  LAUNCH_COUNTRIES,
  type CountryCode,
} from '../src/country.ts';

// ---------------------------------------------------------------------------
// The query
// ---------------------------------------------------------------------------

export const SPARQL_ENDPOINT = 'http://publications.europa.eu/webapi/rdf/sparql';

export const DIRECTIVE_CELEX = '32023L0970';

/**
 * The NIM pull.
 *
 * Two details are load-bearing and were each found the hard way:
 *
 *  - **The CELEX literal must be typed `xsd:string`.** An untyped literal returns nothing.
 *
 *  - **`?celex` must be filtered to this Directive's own NIM id space (`72023L0970…`).**
 *    A national act is notified as an implementing measure for MANY directives, and
 *    `cdm:resource_legal_id_celex` on a NIM lists every one of them: one Czech act carried
 *    154 CELEX ids, including `71978L0660CZE_211450`. Without the filter the result is
 *    1,832 rows and deduplicating on (celex, title) does not collapse them at all, because
 *    the celex is what varies. With it the result is 233 rows, one per notified measure,
 *    matching `COUNT(DISTINCT ?nim)` exactly.
 */
export const NIM_QUERY = `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT ?c ?nim ?title ?eli ?oj ?ojn ?ojd ?notif ?celex WHERE {
  ?w   cdm:resource_legal_id_celex "${DIRECTIVE_CELEX}"^^<http://www.w3.org/2001/XMLSchema#string> .
  ?nim cdm:measure_national_implementing_implements_resource_legal ?w .
  ?nim cdm:work_created_by_agent ?c .
  ?nim cdm:work_title ?title .
  ?nim cdm:resource_legal_id_celex ?celex .
  FILTER(STRSTARTS(STR(?celex), "7${DIRECTIVE_CELEX.slice(1)}"))
  OPTIONAL { ?nim cdm:measure_national_implementing_national_website_link   ?eli   }
  OPTIONAL { ?nim cdm:measure_national_implementing_name_official_journal   ?oj    }
  OPTIONAL { ?nim cdm:measure_national_implementing_number_official_journal ?ojn   }
  OPTIONAL { ?nim cdm:measure_national_implementing_date_official_journal   ?ojd   }
  OPTIONAL { ?nim cdm:measure_national_implementing_date_notification       ?notif }
}`;

export type NimRow = {
  country: CountryCode;
  nim: string;
  celex: string;
  title: string;
  national_link: string | null;
  official_journal: string | null;
  oj_number: string | null;
  oj_date: string | null;
  notified_at: string | null;
};

// ---------------------------------------------------------------------------
// Data-quality traps in the register
// ---------------------------------------------------------------------------

/** The Publications Office's own null-date sentinel. */
export const NULL_DATE_SENTINEL = '1001-01-01';

/**
 * Map the register's null markers to `null`.
 *
 * Two were observed in the Office's own data: the date sentinel `1001-01-01` (it appears
 * as the Italian `date_official_journal`), and an unsubstituted build-info template
 * placeholder wrapped in dollar signs (`$BUILD_INFO$`). Storing either would put a
 * literal lie in a country record.
 */
export function nullSentinel(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed === NULL_DATE_SENTINEL) return null;
  if (/^\$[^$]*\$$/.test(trimmed)) return null;
  return trimmed;
}

/** How many optional fields a row actually carries — used to break duplicate ties. */
const filledCount = (row: NimRow): number =>
  [row.national_link, row.official_journal, row.oj_number, row.oj_date, row.notified_at].filter(
    (v) => v !== null,
  ).length;

/**
 * Deduplicate on (CELEX, title) and sort deterministically.
 *
 * Exported so the deduplication is testable independently of the network. Two properties
 * matter and both are asserted in `coverage.test.ts`:
 *
 *  - **Idempotent** — `dedupe(dedupe(x))` equals `dedupe(x)`.
 *  - **Order-stable** — the result does not depend on the order the endpoint returned
 *    rows in, so a re-run produces a byte-identical file and a real change is the only
 *    thing that shows up in a diff. Where two rows share a key, the one carrying more
 *    optional fields wins, ties broken by serialisation — never by arrival order.
 *
 * The sort is notification date ascending, then CELEX id ascending.
 */
export function dedupeNimRows(rows: NimRow[]): NimRow[] {
  const byKey = new Map<string, NimRow>();
  for (const row of rows) {
    const key = `${row.celex}||${row.title}`;
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, row);
      continue;
    }
    const better =
      filledCount(row) > filledCount(existing) ||
      (filledCount(row) === filledCount(existing) &&
        JSON.stringify(row) < JSON.stringify(existing));
    if (better) byKey.set(key, row);
  }
  return [...byKey.values()].sort((a, b) => {
    const an = a.notified_at ?? '';
    const bn = b.notified_at ?? '';
    if (an !== bn) return an < bn ? -1 : 1;
    return a.celex < b.celex ? -1 : a.celex > b.celex ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// Country identity
// ---------------------------------------------------------------------------

/**
 * The register answers in ISO-3166-1 alpha-3; the records are keyed alpha-2.
 * Greece is `GRC` → `GR`, never the EU statistical code `EL`.
 */
const ALPHA3_TO_ALPHA2: Record<string, CountryCode> = {
  AUT: 'AT', BEL: 'BE', BGR: 'BG', HRV: 'HR', CYP: 'CY', CZE: 'CZ', DNK: 'DK',
  EST: 'EE', FIN: 'FI', FRA: 'FR', DEU: 'DE', GRC: 'GR', HUN: 'HU', IRL: 'IE',
  ITA: 'IT', LVA: 'LV', LTU: 'LT', LUX: 'LU', MLT: 'MT', NLD: 'NL', POL: 'PL',
  PRT: 'PT', ROU: 'RO', SVK: 'SK', SVN: 'SI', ESP: 'ES', SWE: 'SE',
};

type CountryMeta = {
  name_en: string;
  official_languages: string[];
  letter_languages: string[];
  currency: string | null;
};

/**
 * Country identity, not legal facts — no statute, deadline or authority lives here.
 *
 * `currency` is `null` for Bulgaria on purpose. Its euro-adoption date is not something
 * this run verified against a primary source, and the project's rule is that an unknown
 * is null rather than a plausible guess. It is recorded in the plan summary as a field a
 * maintainer should fill.
 */
const COUNTRY_META: Record<CountryCode, CountryMeta> = {
  AT: { name_en: 'Austria', official_languages: ['de'], letter_languages: ['en'], currency: 'EUR' },
  BE: { name_en: 'Belgium', official_languages: ['nl', 'fr', 'de'], letter_languages: ['en'], currency: 'EUR' },
  BG: { name_en: 'Bulgaria', official_languages: ['bg'], letter_languages: ['en'], currency: null },
  HR: { name_en: 'Croatia', official_languages: ['hr'], letter_languages: ['en'], currency: 'EUR' },
  CY: { name_en: 'Cyprus', official_languages: ['el'], letter_languages: ['en'], currency: 'EUR' },
  CZ: { name_en: 'Czechia', official_languages: ['cs'], letter_languages: ['en'], currency: 'CZK' },
  DK: { name_en: 'Denmark', official_languages: ['da'], letter_languages: ['en'], currency: 'DKK' },
  EE: { name_en: 'Estonia', official_languages: ['et'], letter_languages: ['en'], currency: 'EUR' },
  FI: { name_en: 'Finland', official_languages: ['fi', 'sv'], letter_languages: ['en'], currency: 'EUR' },
  FR: { name_en: 'France', official_languages: ['fr'], letter_languages: ['en'], currency: 'EUR' },
  DE: { name_en: 'Germany', official_languages: ['de'], letter_languages: ['en'], currency: 'EUR' },
  GR: { name_en: 'Greece', official_languages: ['el'], letter_languages: ['en'], currency: 'EUR' },
  HU: { name_en: 'Hungary', official_languages: ['hu'], letter_languages: ['en'], currency: 'HUF' },
  IE: { name_en: 'Ireland', official_languages: ['ga', 'en'], letter_languages: ['en'], currency: 'EUR' },
  IT: { name_en: 'Italy', official_languages: ['it'], letter_languages: ['it', 'en'], currency: 'EUR' },
  LV: { name_en: 'Latvia', official_languages: ['lv'], letter_languages: ['en'], currency: 'EUR' },
  LT: { name_en: 'Lithuania', official_languages: ['lt'], letter_languages: ['lt', 'en'], currency: 'EUR' },
  LU: { name_en: 'Luxembourg', official_languages: ['lb', 'fr', 'de'], letter_languages: ['en'], currency: 'EUR' },
  MT: { name_en: 'Malta', official_languages: ['mt', 'en'], letter_languages: ['en'], currency: 'EUR' },
  NL: { name_en: 'Netherlands', official_languages: ['nl'], letter_languages: ['en'], currency: 'EUR' },
  PL: { name_en: 'Poland', official_languages: ['pl'], letter_languages: ['pl', 'en'], currency: 'PLN' },
  PT: { name_en: 'Portugal', official_languages: ['pt'], letter_languages: ['en'], currency: 'EUR' },
  RO: { name_en: 'Romania', official_languages: ['ro'], letter_languages: ['en'], currency: 'RON' },
  SK: { name_en: 'Slovakia', official_languages: ['sk'], letter_languages: ['sk', 'en'], currency: 'EUR' },
  SI: { name_en: 'Slovenia', official_languages: ['sl'], letter_languages: ['en'], currency: 'EUR' },
  ES: { name_en: 'Spain', official_languages: ['es'], letter_languages: ['en'], currency: 'EUR' },
  SE: { name_en: 'Sweden', official_languages: ['sv'], letter_languages: ['en'], currency: 'SEK' },
};

// ---------------------------------------------------------------------------
// Hint classification
// ---------------------------------------------------------------------------

/** The date Directive (EU) 2023/970 was published in the Official Journal. */
const DIRECTIVE_PUBLISHED = '2023-05-17';

/**
 * Classify a register row by what the row itself says — never by inference about the law.
 *
 * `consolidated_republication` is the flag that keeps eight of Poland's ten notified items
 * from reading as transposing amendments: an `Obwieszczenie` is a Marshal of the Sejm
 * announcement republishing a consolidated text. `pre_existing_act` is purely arithmetic —
 * an official-journal date preceding the Directive's own publication. That is Pitfall 4's
 * warning sign made mechanical; it is a statement about the row, not about the statute.
 */
export function classifyHint(
  title: string,
  ojDate: string | null,
  candidateCelexIds: readonly string[],
  celex: string,
): 'transposing_candidate' | 'consolidated_republication' | 'pre_existing_act' | 'unclassified' {
  if (candidateCelexIds.includes(celex)) return 'transposing_candidate';
  if (/^Obwieszczenie\b/i.test(title) || /consolidated version/i.test(title)) {
    return 'consolidated_republication';
  }
  if (ojDate !== null && ojDate < DIRECTIVE_PUBLISHED) return 'pre_existing_act';
  return 'unclassified';
}

// ---------------------------------------------------------------------------
// The launch-country promotion queue
// ---------------------------------------------------------------------------

type LaunchDraft = {
  /** Register CELEX ids a maintainer should read, strongest first. */
  candidate_celex: string[];
  /** How the NATIONAL instrument must be verified — not how the register was read. */
  verification_strategy: 'cellar' | 'html-anchor' | 'jsonld' | 'metadata-only' | 'manual-attest';
  /** The domain a maintainer must check, drawn from the phase's probed source set. */
  national_register_host: string;
  rationale_key: string;
  /** True when the register does not settle which measure is the vehicle. */
  unsettled: boolean;
  /** Anchor for the national source, where the register supplied a national link. */
  national_anchor: string | null;
  national_language: string;
};

/**
 * Per-launch-country drafting instructions. Every CELEX id here was read out of the live
 * register in this run; none is invented.
 */
const LAUNCH_DRAFTS: Record<string, LaunchDraft> = {
  MT: {
    candidate_celex: ['72023L0970MLT_202603933'],
    // legislation.mt serves schema.org JSON-LD carrying legislationIdentifier and title.
    // It does NOT serve the operative wording, so the anchor asserts the ELI and the
    // title — an anchor asserting "two months" would fail on a perfectly good source.
    verification_strategy: 'jsonld',
    national_register_host: 'legislation.mt',
    rationale_key: 'proposed.mt.equal_pay_regulations_2026',
    unsettled: false,
    national_anchor: 'eli/ln/2026/173',
    national_language: 'en',
  },
  IT: {
    candidate_celex: ['72023L0970ITA_202603759'],
    verification_strategy: 'html-anchor',
    national_register_host: 'gazzettaufficiale.it',
    rationale_key: 'proposed.it.decreto_legislativo_96_2026',
    unsettled: false,
    // The register supplied no national link for Italy, so there is no national source to
    // anchor against yet — a maintainer must locate it on the register named above.
    national_anchor: null,
    national_language: 'it',
  },
  PL: {
    candidate_celex: ['72023L0970POL_202603677', '72023L0970POL_202603683'],
    verification_strategy: 'html-anchor',
    national_register_host: 'dziennikustaw.gov.pl',
    rationale_key: 'proposed.pl.two_candidates_neither_settled',
    // Two candidate acts, and the register does not say which carries Art. 7. Eight of the
    // other ten notified items are consolidated-text republications.
    unsettled: true,
    national_anchor: null,
    national_language: 'pl',
  },
  SK: {
    candidate_celex: ['72023L0970SVK_202603903'],
    // slov-lex.sk is a client-rendered shell whose statute text never appears in the HTTP
    // response. A dated human attestation is the honest record; a fetch that never saw the
    // statute is not.
    verification_strategy: 'manual-attest',
    national_register_host: 'slov-lex.sk',
    rationale_key: 'proposed.sk.equal_pay_act_76_2026',
    unsettled: false,
    national_anchor: null,
    national_language: 'sk',
  },
  LT: {
    candidate_celex: ['72023L0970LTU_202603656'],
    // e-tar.lt sits behind a challenge interstitial returning 403. Propose the candidate,
    // attest nothing.
    verification_strategy: 'manual-attest',
    national_register_host: 'e-tar.lt',
    rationale_key: 'proposed.lt.labour_code_amendment_2026',
    unsettled: false,
    national_anchor: 'Lietuvos Respublikos darbo kodekso',
    national_language: 'lt',
  },
};

// ---------------------------------------------------------------------------
// Record construction
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

const REGISTER_URL = `${SPARQL_ENDPOINT}`;

const registerSource = (queryDate: string): Json => ({
  url: REGISTER_URL,
  title:
    'Commission National Implementing Measures register, queried for Directive (EU) 2023/970',
  publisher: 'Publications Office of the European Union',
  kind: 'eu_institution',
  // The register serves metadata — that measures were notified — not what they say. This
  // strategy records that the operative wording was NOT machine-verified, which is the
  // only honest label for it.
  verification: 'metadata-only',
  anchor: DIRECTIVE_CELEX,
  language: 'en',
  accessed_at: queryDate,
  scope: null,
});

const nimSource = (row: NimRow, queryDate: string): Json => ({
  url: `http://publications.europa.eu/resource/celex/${row.celex}`,
  title: row.title.slice(0, 300),
  publisher: 'Publications Office of the European Union',
  kind: 'eu_institution',
  verification: 'metadata-only',
  anchor: row.celex,
  language: 'en',
  accessed_at: queryDate,
  scope: null,
});

const pending = (volatility: string, noteKey?: string): Json => {
  const fact: Json = {
    value: null,
    status: 'pending_verification',
    sources: [],
    verified_at: null,
    verified_by: null,
    volatility,
  };
  if (noteKey !== undefined) fact['note_key'] = noteKey;
  return fact;
};

/**
 * Build one country record.
 *
 * Every legally-operative field is `pending_verification` with value null. That is not a
 * placeholder to be filled in later by this script — it is the output, and D-06 reserves
 * the filling to a human.
 */
export function buildRecord(code: CountryCode, hints: NimRow[], queryDate: string): Json {
  const meta = COUNTRY_META[code];
  const notified = hints.length > 0;
  const draft = LAUNCH_DRAFTS[code];
  const candidateIds = draft?.candidate_celex ?? [];

  return {
    $schema: '../country.schema.json',
    schema_version: '1.0.0',
    country: {
      code,
      name_en: meta.name_en,
      official_languages: meta.official_languages,
      letter_languages: meta.letter_languages,
      currency: meta.currency,
    },
    transposition: {
      status: {
        // What was OBSERVED, and nothing more. For a state with notified measures the
        // register records THAT measures exist, not what they say, so the transposition
        // status itself remains unknown — the measures are in discovery_hints.
        value: notified ? 'unknown' : 'no_measure_notified',
        status: 'verified',
        sources: [registerSource(queryDate)],
        verified_at: queryDate,
        verified_by: null,
        volatility: 'volatile',
        note_key: notified
          ? 'transposition.measures_notified_substance_unconfirmed'
          : 'transposition.no_measure_notified_as_at_query_date',
      },
      in_force_from: pending('volatile'),
      expected_from: pending('volatile'),
      partial_in_force: pending('volatile'),
      national_act: pending('volatile'),
      draft_asserting_sources: [],
    },
    article_7: {
      legal_basis: pending('volatile', 'pending.legal_basis_requires_human_promotion'),
      response_deadline: pending('volatile', 'pending.deadline_falls_back_to_article_7_4'),
      channel: pending('volatile'),
      employer_reminder_duty: pending('volatile'),
      language_requirement: pending('volatile'),
    },
    // No machine-readable per-state answer exists: the register records that measures were
    // notified, not what they say. Unknown is the correct output.
    article_12_3: pending('volatile', 'pending.art_12_3_option_not_checked'),
    article_7_2: pending('volatile'),
    enforcement: {
      anti_retaliation: pending('volatile'),
      burden_of_proof_reversal: pending('volatile'),
      // Reachability of a national body's website is not evidence that it is the body
      // designated under Art. 20 of Directive 2006/54/EC.
      equality_body: pending('stable', 'pending.art20_designation_not_traced'),
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
    discovery_hints: hints.map((row) => ({
      celex: row.celex,
      title: row.title,
      official_journal: row.official_journal,
      oj_number: row.oj_number,
      oj_date: row.oj_date,
      notified_at: row.notified_at,
      national_link: row.national_link,
      kind: classifyHint(row.title, row.oj_date, candidateIds, row.celex),
      source_query_at: queryDate,
    })),
    meta: {
      maintainers: [],
      review_interval_days: 90,
      last_full_review: null,
    },
  };
}

/** The draft a maintainer promotes — never a fact, and never verified here. */
export function buildProposal(code: CountryCode, hints: NimRow[], queryDate: string): Json {
  const draft = LAUNCH_DRAFTS[code];
  if (draft === undefined) throw new Error(`no launch draft for ${code}`);

  const byCelex = new Map(hints.map((h) => [h.celex, h]));
  const candidates = draft.candidate_celex.map((celex) => {
    const row = byCelex.get(celex);
    if (row === undefined) {
      throw new Error(
        `candidate ${celex} for ${code} is not in the live register result — the draft table has drifted from the register and must be re-read, never guessed`,
      );
    }
    return row;
  });

  const sources: Json[] = candidates.map((row) => nimSource(row, queryDate));
  const primary = candidates[0];
  if (primary === undefined) throw new Error(`no candidate for ${code}`);

  // Only where the register itself supplied a national link is a national source cited.
  // Italy, Poland and Slovakia supplied none, so none is invented — the domain a
  // maintainer must check is named in `national_register_host` instead.
  if (draft.national_anchor !== null && primary.national_link !== null) {
    sources.push({
      url: primary.national_link,
      title: primary.title.slice(0, 300),
      publisher: draft.national_register_host,
      kind: 'official_journal',
      verification: draft.verification_strategy,
      anchor: draft.national_anchor,
      language: draft.national_language,
      accessed_at: queryDate,
      scope: null,
    });
  }

  const proposedValue = draft.unsettled
    ? null
    : {
        instrument: 'national',
        short_title: primary.title.slice(0, 120),
        official_title: primary.title,
        journal_ref:
          primary.official_journal === null
            ? null
            : [primary.official_journal, primary.oj_number].filter((p) => p !== null).join(' no. '),
        article: null,
        adopted_at: primary.oj_date,
        in_force_from: null,
        url: primary.national_link,
      };

  const record = buildRecord(code, hints, queryDate) as Json;

  // A proposal file is a DRAFT of a record, not a copy of the live one, so nothing in it
  // is verified — including the transposition status, which the register does support but
  // which `data/<CC>.json` is the place to assert. The register source stays attached as
  // the lead it is. This is what makes "a proposed/ file carrying status verified fails
  // validation" a single, unqualified rule rather than one with a carve-out a contributor
  // would eventually widen (D-11).
  const transposition = record['transposition'] as Json;
  const seededStatus = transposition['status'] as Json;
  transposition['status'] = {
    value: null,
    status: 'pending_verification',
    sources: seededStatus['sources'],
    verified_at: null,
    verified_by: null,
    volatility: 'volatile',
    note_key: 'proposed.transposition_status_is_asserted_in_data_not_here',
  };

  record['proposals'] = [
    {
      field: 'article_7.legal_basis',
      proposed_value: proposedValue,
      candidates: draft.unsettled
        ? candidates.map((row) => ({
            celex: row.celex,
            title: row.title,
            note_key: 'proposed.candidate_not_settled_by_register',
          }))
        : [],
      rationale_key: draft.rationale_key,
      verification_strategy: draft.verification_strategy,
      national_register_host: draft.national_register_host,
      sources,
      drafted_by: 'agent:gsd-executor/01-04',
      drafted_at: queryDate,
      status: 'awaiting_maintainer_promotion',
    },
  ];
  return record;
}

// ---------------------------------------------------------------------------
// Fetch and write
// ---------------------------------------------------------------------------

type SparqlBinding = Record<string, { value: string } | undefined>;

export function parseBindings(bindings: SparqlBinding[]): NimRow[] {
  const rows: NimRow[] = [];
  for (const b of bindings) {
    const alpha3 = (b['c']?.value ?? '').split('/').pop() ?? '';
    const code = ALPHA3_TO_ALPHA2[alpha3];
    if (code === undefined) {
      throw new Error(
        `the register returned country "${alpha3}", which is not one of the 27 member states — refusing to guess a mapping`,
      );
    }
    const celex = nullSentinel(b['celex']?.value);
    const title = nullSentinel(b['title']?.value);
    if (celex === null || title === null) continue;
    rows.push({
      country: code,
      nim: b['nim']?.value ?? '',
      celex,
      title,
      national_link: safeLink(nullSentinel(b['eli']?.value)),
      official_journal: nullSentinel(b['oj']?.value),
      oj_number: nullSentinel(b['ojn']?.value),
      oj_date: nullSentinel(b['ojd']?.value),
      notified_at: nullSentinel(b['notif']?.value),
    });
  }
  return rows;
}

/** Drop a national link that is not a plain credential-free http(s) URL. */
function safeLink(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username !== '' || u.password !== '') return null;
    return raw;
  } catch {
    return null;
  }
}

export async function fetchNimRows(): Promise<NimRow[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set('format', 'application/sparql-results+json');
  url.searchParams.set('query', NIM_QUERY);

  // A generous timeout: a complex query against this endpoint was observed taking 60s.
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (res.status !== 200) {
    throw new Error(`the NIM register answered ${res.status}, expected 200 — nothing written`);
  }
  const body = (await res.json()) as { results?: { bindings?: SparqlBinding[] } };
  const bindings = body.results?.bindings ?? [];
  if (bindings.length === 0) {
    throw new Error('the NIM register returned zero rows — refusing to seed an empty dataset');
  }
  return parseBindings(bindings);
}

const stringify = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export async function seedFromNim(queryDate: string): Promise<{
  queryDate: string;
  measureCount: number;
  perCountry: Record<string, number>;
}> {
  const rows = dedupeNimRows(await fetchNimRows());

  const byCountry = new Map<CountryCode, NimRow[]>();
  for (const code of EU_COUNTRY_CODES) byCountry.set(code, []);
  for (const row of rows) byCountry.get(row.country)?.push(row);

  const dataDir = new URL('../data/', import.meta.url);
  const proposedDir = new URL('../proposed/', import.meta.url);
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(proposedDir, { recursive: true });

  const perCountry: Record<string, number> = {};
  for (const code of EU_COUNTRY_CODES) {
    const hints = dedupeNimRows(byCountry.get(code) ?? []);
    perCountry[code] = hints.length;
    writeFileSync(new URL(`${code}.json`, dataDir), stringify(buildRecord(code, hints, queryDate)), 'utf8');
    if ((LAUNCH_COUNTRIES as readonly string[]).includes(code)) {
      writeFileSync(
        new URL(`${code}.json`, proposedDir),
        stringify(buildProposal(code, hints, queryDate)),
        'utf8',
      );
    }
  }

  return { queryDate, measureCount: rows.length, perCountry };
}

const isEntryPoint = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;
if (isEntryPoint) {
  const queryDate = process.env['SEED_QUERY_DATE'] ?? new Date().toISOString().slice(0, 10);
  const result = await seedFromNim(queryDate);
  const withMeasures = Object.entries(result.perCountry).filter(([, n]) => n > 0);
  process.stdout.write(
    [
      `NIM seed complete for ${EU_COUNTRY_CODES.length} member states, query date ${result.queryDate}`,
      `${result.measureCount} distinct notified measures across ${withMeasures.length} states`,
      `no measure notified: ${Object.entries(result.perCountry)
        .filter(([, n]) => n === 0)
        .map(([c]) => c)
        .join(', ')}`,
      withMeasures.map(([c, n]) => `${c}:${n}`).join(' '),
      '',
    ].join('\n'),
  );
}
