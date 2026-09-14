/**
 * The country record.
 *
 * This composes the frozen `Fact<T>` primitives from `schema.ts` into the full record a
 * worker's country page and letter are built from. `schema.ts` makes it impossible to
 * express a *value* without its provenance; this file makes it impossible to express the
 * three claims that would put a wrong statute in a letter:
 *
 *   1. **An agent cannot promote.** A launch country's legally-operative field with
 *      `status: 'verified'` and a null `verified_by` fails parse (D-06). The register
 *      names the haystack with impeccable provenance; choosing the needle is a judgement
 *      reserved to a human.
 *   2. **Art. 12(3) is a condition, not a route.** A bare boolean at `article_12_3` fails
 *      parse with an explanatory message, because a boolean is exactly the modelling
 *      error the roadmap's phrasing invites. The Article restricts *who may see* the
 *      information where a disclosure would identify an individual worker; it does not
 *      divert every Art. 7 request. It is stored separately from the Art. 7(2) standing
 *      right, which is unconditional in every state.
 *   3. **A Directive fallback cites the Directive.** A `directive_fallback` fact (D-07)
 *      must carry the publisher's own citation key and must NOT carry a national
 *      citation string.
 *
 * **This module deliberately reads no data file.** The `directive_fallback` rule asserts
 * the citation-key SHAPE and the phase's cited article set, never corpus membership:
 * plan 01-03 fills `data/_directive.json` in this plan's own wave, so a parse-time
 * assertion that a key RESOLVES would fail for any key 01-03 had not yet written, and
 * weakening it to make it pass would hide the check. Plan 01-05 owns the resolve half —
 * a cross-artefact referential pass in wave 4, when the complete corpus and all 27
 * records exist together.
 */
import { z } from 'zod';

import { Fact, HarvestedUrl, IsoDate, SafeUrl, Source } from './schema.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * The 27 member states, ISO-3166-1 alpha-2, in the EU's own protocol order.
 *
 * Greece is `GR`. `EL` is the EU *statistical* code (Eurostat, NUTS) and is not an ISO
 * country code — a record naming `EL` is rejected, and a missing `GR` fails coverage.
 */
export const EU_COUNTRY_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
] as const;

export type CountryCode = (typeof EU_COUNTRY_CODES)[number];

/** D-05: the five states whose legally-operative fields are verified to source at v1. */
export const LAUNCH_COUNTRIES = ['PL', 'SK', 'IT', 'LT', 'MT'] as const;

export type LaunchCountry = (typeof LAUNCH_COUNTRIES)[number];

export const isLaunchCountry = (code: string): boolean =>
  (LAUNCH_COUNTRIES as readonly string[]).includes(code);

/**
 * D-06: the fields only a maintainer may flip to `verified`, and only by recording
 * `verified_by`. These are also the fields `freshnessGate` hard-fails the build on for a
 * launch country (D-10) — the same set, because they are the same claim: this is what a
 * worker's letter actually asserts to their employer.
 */
export const LEGALLY_OPERATIVE_FIELDS = [
  'article_7.legal_basis',
  'article_7.response_deadline',
  'article_12_3',
] as const;

export type LegallyOperativeField = (typeof LEGALLY_OPERATIVE_FIELDS)[number];

/**
 * The Directive articles this phase retrieves and cites (D-04 / LEGAL-07). A
 * `directive_fallback` citation key naming any other article is rejected: the corpus
 * will never hold it, so the citation would render blank in Phase 3.
 */
export const CITED_ARTICLES = [3, 6, 7, 9, 10, 12] as const;

/**
 * The publisher's own citation-key shape: CELEX id, `#`, the three-digit article id, a
 * dot, the three-digit paragraph id — e.g. `32023L0970#007.004`. Language-invariant, and
 * identical to the shape `DirectiveQuotation` enforces in `schema.ts`.
 */
export const CITATION_KEY_SHAPE = /^3\d{4}[A-Z]\d{4}#(\d{3})\.(\d{3})$/;

const CitationKey = z
  .string()
  .regex(
    CITATION_KEY_SHAPE,
    'a Directive citation key must be the publisher\'s own id, e.g. "32023L0970#007.004" — never a hand-rolled reference such as "Directive 2023/970 Art. 7(4)"',
  )
  .superRefine((value, ctx) => {
    const match = CITATION_KEY_SHAPE.exec(value);
    if (match === null) return;
    const article = Number(match[1]);
    if (!(CITED_ARTICLES as readonly number[]).includes(article)) {
      ctx.addIssue({
        code: 'custom',
        message: `citation key ${value} names Article ${article}, which is outside this phase's cited set (${CITED_ARTICLES.join(', ')}) — the Directive corpus will never hold it, so the citation would render blank`,
      });
    }
  });

// ---------------------------------------------------------------------------
// Field value shapes
// ---------------------------------------------------------------------------

/**
 * D-07's explicit "national citation suppressed, Directive article cited instead" value.
 *
 * `strictObject` is load-bearing: it is what makes a smuggled `national_citation` key a
 * parse error rather than a silently stripped field.
 */
export const DirectiveFallbackRef = z.strictObject({
  instrument: z.literal('directive_fallback'),
  directive_citation_key: CitationKey,
  /** i18n key for the explicit "we are citing the Directive here" label. NOT prose. */
  label_key: z.string().min(3),
});
export type DirectiveFallbackRef = z.infer<typeof DirectiveFallbackRef>;

/**
 * Reject a bare boolean *before* the union reports "expected object", so the issue
 * message names the modelling error rather than the type mismatch.
 */
const rejectBareBoolean = <S extends z.ZodType>(inner: S, field: string, why: string) =>
  z
    .any()
    .superRefine((value, ctx) => {
      if (typeof value === 'boolean') {
        ctx.addIssue({ code: 'custom', message: `${field} is a condition, not a route: ${why}` });
      }
    })
    .pipe(inner);

export const NationalLegalBasis = z.strictObject({
  instrument: z.literal('national'),
  short_title: z.string().min(3),
  official_title: z.string().min(3),
  /** e.g. "Dz.U. 2026 poz. 123", "GU n. 125 del 1 giugno 2026". */
  journal_ref: z.string().min(3).nullable(),
  article: z.string().min(1).nullable(),
  adopted_at: IsoDate.nullable(),
  in_force_from: IsoDate.nullable(),
  url: SafeUrl.nullable(),
});
export type NationalLegalBasis = z.infer<typeof NationalLegalBasis>;

export const LegalBasisValue = z.union([NationalLegalBasis, DirectiveFallbackRef]);
export const LegalBasis = Fact(LegalBasisValue);
export type LegalBasis = z.infer<typeof LegalBasis>;

export const DeadlineUnit = z.enum(['day', 'working_day', 'week', 'month']);

export const NationalDeadline = z.strictObject({
  instrument: z.literal('national'),
  amount: z.number().int().positive(),
  unit: DeadlineUnit,
  from: z.enum(['request', 'receipt']),
  national_citation: z.string().min(3).nullable(),
});
export type NationalDeadline = z.infer<typeof NationalDeadline>;

export const ResponseDeadlineValue = z.union([NationalDeadline, DirectiveFallbackRef]);

/** The three bodies Art. 12(3) names, and only those three. */
export const Art12_3Body = z.enum([
  'workers_representatives',
  'labour_inspectorate',
  'equality_body',
]);

/**
 * Art. 12(3), verbatim: *"Member States may decide that, where the disclosure of
 * information pursuant to Articles 7, 9 and 10 would lead to the disclosure, either
 * directly or indirectly, of the pay of an identifiable worker, only the workers'
 * representatives, the labour inspectorate or the equality body shall have access to
 * that information."*
 *
 * The restriction is CONDITIONAL on identifiability. `condition` is a literal rather than
 * a free string because there is exactly one condition in the Article, and a record that
 * could name another would be asserting something the Directive does not say.
 */
export const Art12_3Condition = z.strictObject({
  option_taken: z.boolean(),
  condition: z.literal('disclosure_identifies_individual_worker'),
  bodies: z.array(Art12_3Body),
  national_citation: z.string().min(3).nullable(),
});
export type Art12_3Condition = z.infer<typeof Art12_3Condition>;

export const Art12_3Value = rejectBareBoolean(
  z.union([Art12_3Condition, DirectiveFallbackRef]),
  'article_12_3',
  "Art. 12(3) restricts who may see the information where a disclosure would directly or indirectly reveal the pay of an identifiable worker. It does not divert every Art. 7 request. Model it as { option_taken, condition, bodies }",
);
export const Art12_3Position = Fact(Art12_3Value);
export type Art12_3Position = z.infer<typeof Art12_3Position>;

/**
 * Art. 7(2): the worker's standing right to request through a representative or an
 * equality body. Unconditional, and present in every state independently of whether that
 * state took the Art. 12(3) option. Kept a separate field precisely so neither can
 * suppress the other.
 */
export const NationalArt7_2Standing = z.strictObject({
  instrument: z.literal('national'),
  available: z.boolean(),
  through: z.array(z.enum(['workers_representatives', 'equality_body'])),
  national_citation: z.string().min(3).nullable(),
});

export const Art7_2StandingValue = z.union([NationalArt7_2Standing, DirectiveFallbackRef]);
export const Art7_2Standing = Fact(Art7_2StandingValue);
export type Art7_2Standing = z.infer<typeof Art7_2Standing>;

/**
 * One body designated under Art. 20 of Directive 2006/54/EC, which Art. 3(1)(l) of this
 * Directive defines the equality body by reference to.
 *
 * `name_local` is a proper noun: stored and rendered verbatim in NFC, never translated,
 * transliterated or case-folded. `art20_designation_source` is null until the designation
 * itself has been traced — a reachable national website is not evidence of designation.
 */
export const EqualityBodyEntry = z.strictObject({
  name_local: z.string().min(2),
  name_en: z.string().min(2).nullable(),
  url: SafeUrl.nullable(),
  complaint_url: SafeUrl.nullable(),
  art20_designation_source: SafeUrl.nullable(),
});
export type EqualityBodyEntry = z.infer<typeof EqualityBodyEntry>;

/**
 * An ARRAY, because a member state may designate more than one body under Art. 20, and a
 * singular field would force a silent choice between them. Order is the order the
 * designating instrument lists them, and it survives parse unchanged.
 */
export const EqualityBodyValue = z.array(EqualityBodyEntry).min(1);
export const EqualityBody = Fact(EqualityBodyValue);
export type EqualityBody = z.infer<typeof EqualityBody>;

/**
 * `no_measure_notified` means exactly what the Commission register showed on the query
 * date: no implementing measure had been notified. It is NOT a claim that the state has
 * not transposed, and must never be rendered as one.
 */
export const TranspositionStatusValue = z.enum([
  'in_force',
  'partial',
  'draft',
  'pending',
  'no_measure_notified',
  'unknown',
]);
export type TranspositionStatusValue = z.infer<typeof TranspositionStatusValue>;

export const TranspositionStatus = Fact(TranspositionStatusValue);
export type TranspositionStatus = z.infer<typeof TranspositionStatus>;

export const NationalAct = z.strictObject({
  short_title: z.string().nullable(),
  official_title: z.string().nullable(),
  journal_ref: z.string().nullable(),
  adopted_at: IsoDate.nullable(),
  url: SafeUrl.nullable(),
});

export const PartialInForceValue = z.array(
  z.strictObject({ scope: z.string().min(2), from: IsoDate, summary_key: z.string().min(3) }),
);

/**
 * How a notified measure relates to the Directive, as far as the register alone can say.
 * `consolidated_republication` is the flag that stops eight of Poland's ten notified
 * items reading as transposing amendments — they are Marshal of the Sejm announcements
 * republishing consolidated texts.
 */
export const DiscoveryHintKind = z.enum([
  'transposing_candidate',
  'consolidated_republication',
  'pre_existing_act',
  'unclassified',
]);

/**
 * One row of the Commission's National Implementing Measures register, stored as what it
 * is: a lead, with impeccable provenance, that a human must still read.
 */
export const DiscoveryHint = z.strictObject({
  celex: z.string().min(3),
  title: z.string().min(3),
  official_journal: z.string().nullable(),
  oj_number: z.string().nullable(),
  oj_date: IsoDate.nullable(),
  notified_at: IsoDate.nullable(),
  /**
   * HARVESTED, not authored: the ELI the Commission register itself published. Typed
   * `HarvestedUrl` rather than `SafeUrl` because 18 of the 93 ELIs the register serves
   * today are plain `http:`, and rewriting a register's own identifier to make a lint go
   * green would be falsifying provenance. Every other hygiene rule still applies — a
   * `javascript:` or `data:` link is a parse error here exactly as it is everywhere else.
   */
  national_link: HarvestedUrl.nullable(),
  kind: DiscoveryHintKind,
  source_query_at: IsoDate,
});
export type DiscoveryHint = z.infer<typeof DiscoveryHint>;

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

const countryRecordShape = {
  /** Relative pointer at the committed JSON Schema — a lawyer contributor's red squiggles. */
  $schema: z.string().min(3),
  schema_version: z.string().min(3),

  country: z.strictObject({
    code: z.enum(EU_COUNTRY_CODES),
    name_en: z.string().min(3),
    official_languages: z.array(z.string().min(2)).min(1),
    /** Which letter templates must exist for this state (LTR-04, LTR-05). */
    letter_languages: z.array(z.string().min(2)).min(1),
    /** ISO-4217, or null where the current currency has not been verified. */
    currency: z.string().length(3).nullable(),
  }),

  transposition: z.strictObject({
    status: TranspositionStatus,
    in_force_from: Fact(IsoDate),
    expected_from: Fact(IsoDate),
    partial_in_force: Fact(PartialInForceValue),
    national_act: Fact(NationalAct),
    /**
     * URLs, drawn from `status.sources`, whose own wording says "draft".
     *
     * This lives beside the `Fact` rather than as a `says_draft` flag inside `Source`
     * because `Source` is frozen by plan 01-01 and a `Fact`'s `sources` array would strip
     * an added key. The invariant is the same one either way: where the underlying source
     * says draft, the data must say draft, and a contributor ticks the box rather than a
     * reviewer hoping.
     */
    draft_asserting_sources: z.array(SafeUrl),
  }),

  article_7: z.strictObject({
    legal_basis: LegalBasis,
    response_deadline: Fact(ResponseDeadlineValue),
    channel: Fact(
      z.strictObject({
        direct: z.boolean(),
        works_council: z.boolean(),
        trade_union: z.boolean(),
        mandatory: z.boolean().nullable(),
      }),
    ),
    /**
     * Art. 7(3): the EMPLOYER's annual duty to inform workers of the right. There is
     * deliberately no field capping how often a worker may ask — no such cap exists in
     * the authentic text, and inventing one was one of the four inherited errors.
     */
    employer_reminder_duty: Fact(
      z.union([
        z.strictObject({
          instrument: z.literal('national'),
          annual: z.boolean(),
          national_citation: z.string().min(3).nullable(),
        }),
        DirectiveFallbackRef,
      ]),
    ),
    language_requirement: Fact(
      z.strictObject({ languages: z.array(z.string().min(2)), mandatory: z.boolean() }),
    ),
  }),

  /** Art. 12(3) — a condition with the bodies it routes to. Never a boolean. */
  article_12_3: Art12_3Position,

  /** Art. 7(2) — the unconditional standing right. Independent of the field above. */
  article_7_2: Art7_2Standing,

  enforcement: z.strictObject({
    anti_retaliation: Fact(
      z.strictObject({ citation: z.string().min(3), summary_key: z.string().min(3) }),
    ),
    burden_of_proof_reversal: Fact(z.boolean()),
    equality_body: EqualityBody,
    labour_inspectorate: Fact(
      z.strictObject({
        name_local: z.string().min(2),
        name_en: z.string().min(2).nullable(),
        url: SafeUrl.nullable(),
      }),
    ),
    penalties: Fact(
      z.strictObject({
        max_amount: z.number().nullable(),
        currency: z.string().length(3).nullable(),
        basis: z.string().min(3),
        summary_key: z.string().min(3),
      }),
    ),
  }),

  reporting: z.strictObject({
    thresholds: Fact(
      z.array(
        z.strictObject({
          min_employees: z.number().int().positive(),
          max_employees: z.number().int().positive().nullable(),
          frequency: z.enum(['annual', 'triennial']),
          first_report: IsoDate,
          reference_year_offset: z.number().int(),
        }),
      ),
    ),
    filing_deadline: Fact(
      z.strictObject({
        month: z.number().int().min(1).max(12),
        day: z.number().int().min(1).max(31),
      }),
    ),
    filing_authority: Fact(
      z.strictObject({
        name_local: z.string().min(2),
        name_en: z.string().min(2).nullable(),
        url: SafeUrl.nullable(),
      }),
    ),
    template: Fact(z.strictObject({ url: SafeUrl, format: z.string().min(2) })),
    /** Set to e.g. "pl" when `packages/adapters-pl` ships. */
    adapter_id: z.string().nullable(),
  }),

  discovery_hints: z.array(DiscoveryHint),

  meta: z.strictObject({
    maintainers: z.array(z.string()),
    review_interval_days: z.number().int().positive(),
    last_full_review: IsoDate.nullable(),
  }),
};

/**
 * Every `Fact` in the record, by dotted path. Used by the record invariants below, by
 * `freshnessGate` and by `assertNoUnchangedBump` — one list, so a new field cannot be
 * added to the schema and silently escape all three.
 */
export const FACT_PATHS = [
  'transposition.status',
  'transposition.in_force_from',
  'transposition.expected_from',
  'transposition.partial_in_force',
  'transposition.national_act',
  'article_7.legal_basis',
  'article_7.response_deadline',
  'article_7.channel',
  'article_7.employer_reminder_duty',
  'article_7.language_requirement',
  'article_12_3',
  'article_7_2',
  'enforcement.anti_retaliation',
  'enforcement.burden_of_proof_reversal',
  'enforcement.equality_body',
  'enforcement.labour_inspectorate',
  'enforcement.penalties',
  'reporting.thresholds',
  'reporting.filing_deadline',
  'reporting.filing_authority',
  'reporting.template',
] as const;

export type FactPath = (typeof FACT_PATHS)[number];

type UnknownFact = {
  value: unknown;
  status: string;
  sources: Source[];
  verified_at: string | null;
  verified_by: string | null;
  volatility: string;
};

const isRecordLike = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Read a `Fact` out of a parsed record by dotted path. Never throws. */
export function factAt(record: unknown, path: string): UnknownFact | null {
  let node: unknown = record;
  for (const segment of path.split('.')) {
    if (!isRecordLike(node)) return null;
    node = node[segment];
  }
  return isRecordLike(node) && typeof node['status'] === 'string' ? (node as UnknownFact) : null;
}

/**
 * The record-level invariants. Kept a named function because the proposal schema applies
 * exactly the same set plus its own — a proposal that relaxed one of these would be a
 * back door into the live dataset.
 */
function countryRecordChecks(record: unknown, ctx: z.RefinementCtx): void {
  if (!isRecordLike(record)) return;
  const country = isRecordLike(record['country']) ? record['country'] : {};
  const code = typeof country['code'] === 'string' ? country['code'] : '';

  // 1. Membership. `z.enum` already rejects a non-member; this restates it with the
  //    message a contributor who typed the statistical code actually needs.
  if (!(EU_COUNTRY_CODES as readonly string[]).includes(code)) {
    ctx.addIssue({
      code: 'custom',
      path: ['country', 'code'],
      message: `"${code}" is not one of the 27 member-state ISO-3166-1 alpha-2 codes. Greece is GR; EL is the EU statistical code and is not an ISO code`,
    });
    return;
  }

  // 2. D-06 — an agent proposes, a human confirms. A launch country's legally-operative
  //    field cannot read `verified` without naming the human who read the source.
  if (isLaunchCountry(code)) {
    for (const path of LEGALLY_OPERATIVE_FIELDS) {
      const fact = factAt(record, path);
      if (fact === null) continue;
      if (fact.status === 'verified' && fact.verified_by === null) {
        ctx.addIssue({
          code: 'custom',
          path: path.split('.'),
          message: `${code} is a launch country, so a verified ${path} must record verified_by — only a maintainer who read the source may set this field (D-06)`,
        });
      }
    }
  }

  // 3. Where the underlying source says draft, the data must say draft.
  const transposition = isRecordLike(record['transposition']) ? record['transposition'] : {};
  const statusFact = factAt(record, 'transposition.status');
  const draftFlags = Array.isArray(transposition['draft_asserting_sources'])
    ? (transposition['draft_asserting_sources'] as unknown[]).filter(
        (u): u is string => typeof u === 'string',
      )
    : [];
  if (statusFact !== null && statusFact.value === 'draft') {
    if (draftFlags.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['transposition', 'draft_asserting_sources'],
        message:
          'a transposition status of "draft" requires at least one cited source flagged as saying draft — a reviewer hoping is not a control',
      });
    }
    const cited = new Set(statusFact.sources.map((s) => s.url));
    for (const url of draftFlags) {
      if (!cited.has(url)) {
        ctx.addIssue({
          code: 'custom',
          path: ['transposition', 'draft_asserting_sources'],
          message: `${url} is flagged as saying draft but is not among the sources transposition.status cites`,
        });
      }
    }
  }

  // 4. D-07 — a directive_fallback fact cites the Directive, and only the Directive.
  //    The citation-key SHAPE and the cited article set are asserted by `CitationKey`;
  //    whether the key RESOLVES is plan 01-05's wave-4 referential pass, deliberately
  //    not here (plan 01-03 is filling the corpus in this plan's own wave).
  for (const path of FACT_PATHS) {
    const fact = factAt(record, path);
    if (fact === null || fact.status !== 'directive_fallback') continue;
    const value = fact.value;
    if (!isRecordLike(value) || value['instrument'] !== 'directive_fallback') {
      ctx.addIssue({
        code: 'custom',
        path: path.split('.'),
        message: `${path} has status directive_fallback, so its value must be a Directive citation reference carrying directive_citation_key — never null, and never a national value`,
      });
    }
  }

  // 5. An Art. 12(3) option that was taken must name at least one body. "The option was
  //    taken, and nobody may see the information" is not a state the Article describes.
  const art123 = factAt(record, 'article_12_3');
  if (art123 !== null && isRecordLike(art123.value) && art123.value['option_taken'] === true) {
    const bodies = art123.value['bodies'];
    if (!Array.isArray(bodies) || bodies.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['article_12_3'],
        message:
          'article_12_3.option_taken is true but no body is named — Art. 12(3) restricts access TO the workers’ representatives, the labour inspectorate or the equality body, so at least one must be listed',
      });
    }
  }

  // 6. An equality body's local name is a proper noun stored verbatim in NFC. Comparison
  //    between a stored name and a source name is NFC equality on the raw string, so a
  //    decomposed form stored here would never match the source it came from.
  const equality = factAt(record, 'enforcement.equality_body');
  if (equality !== null && Array.isArray(equality.value)) {
    equality.value.forEach((entry, i) => {
      if (!isRecordLike(entry)) return;
      const name = entry['name_local'];
      if (typeof name === 'string' && name !== name.normalize('NFC')) {
        ctx.addIssue({
          code: 'custom',
          path: ['enforcement', 'equality_body', 'value', i, 'name_local'],
          message: `equality body name "${name}" is not in NFC — store the composed form so an NFC comparison against the designating source matches`,
        });
      }
    });
  }
}

export const CountryRecord = z.object(countryRecordShape).superRefine(countryRecordChecks);
export type CountryRecord = z.infer<typeof CountryRecord>;

// ---------------------------------------------------------------------------
// The maintainer-promotion queue
// ---------------------------------------------------------------------------

/**
 * One agent-drafted field awaiting maintainer promotion (D-11).
 *
 * `proposed_value` is a draft, never a fact: the record's own field stays
 * `pending_verification` with value null until a human promotes it into `data/` and sets
 * `verified_by`. `verification_strategy` records how the NATIONAL instrument must be
 * checked — `manual-attest` where the register defeats fetching, which is strictly better
 * than a green produced by a retrieval that never saw the statute.
 */
export const Proposal = z.strictObject({
  field: z.string().min(3),
  proposed_value: z.unknown(),
  /** Candidate measures where the register does not settle which one is the vehicle. */
  candidates: z.array(
    z.strictObject({
      celex: z.string().min(3),
      title: z.string().min(3),
      note_key: z.string().min(3),
    }),
  ),
  rationale_key: z.string().min(3),
  verification_strategy: z.enum([
    'cellar',
    'html-anchor',
    'jsonld',
    'metadata-only',
    'manual-attest',
  ]),
  /** The domain a maintainer must check, drawn from the phase's probed source set. */
  national_register_host: z.string().min(3).nullable(),
  sources: z.array(Source).min(1),
  drafted_by: z.string().min(2),
  drafted_at: IsoDate,
  status: z.literal('awaiting_maintainer_promotion'),
});
export type Proposal = z.infer<typeof Proposal>;

export const ProposedCountryRecord = z
  .object({ ...countryRecordShape, proposals: z.array(Proposal).min(1) })
  .superRefine((record, ctx) => {
    countryRecordChecks(record, ctx);
    // The promotion boundary, made structural: an agent may draft into `proposed/` but
    // may not set anything verified there. Only a maintainer's promotion into `data/`
    // does that, and it records `verified_by`.
    for (const path of FACT_PATHS) {
      const fact = factAt(record, path);
      if (fact !== null && fact.status === 'verified') {
        ctx.addIssue({
          code: 'custom',
          path: path.split('.'),
          message: `a file in proposed/ may not carry a verified fact (${path}) — merging alone cannot make the site more confident; only a maintainer promotion into data/ can (D-11)`,
        });
      }
    }
  });
export type ProposedCountryRecord = z.infer<typeof ProposedCountryRecord>;
