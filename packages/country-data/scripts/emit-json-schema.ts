/**
 * Emit `packages/country-data/country.schema.json` from the Zod record schema.
 *
 * Zod is the single source of truth and JSON Schema is an OUTPUT, not the other way
 * round: `superRefine` expresses the cross-field invariants (launch-country
 * human-confirm, draft-means-the-source-said-draft, the Directive fallback rule) that raw
 * JSON Schema handles only awkwardly.
 *
 * The emitted file is COMMITTED, and every data and proposal file carries a `$schema`
 * pointer at it. That is the decisive affordance for D-11's community flow: a lawyer
 * contributor gets autocomplete and inline red squiggles in their editor with **no
 * toolchain install**. It cannot express the refinements above — CI does that — but it
 * catches the shape errors that make up most of a first-time contribution's diff.
 *
 * `io: 'output'` rather than `'input'`: the Art. 12(3) value sits behind a pipe whose
 * input side is deliberately permissive (so a bare boolean can be rejected with an
 * explanatory message), and the input projection of a pipe is that permissive side. The
 * output projection is the real shape, which is what a contributor needs to see.
 *
 * Runs under Node's native type stripping — `node packages/country-data/scripts/emit-json-schema.ts` —
 * with no script-runner dependency, so only erasable syntax is used.
 */
import { writeFileSync } from 'node:fs';
import { z } from 'zod';

import { CountryRecord, EU_COUNTRY_CODES } from '../src/country.ts';

const OUT = new URL('../country.schema.json', import.meta.url);

export function emitJsonSchema(): string {
  const schema = z.toJSONSchema(CountryRecord, { io: 'output', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;

  schema['$id'] = 'https://github.com/MarekFish93/paytransparency/packages/country-data/country.schema.json';
  schema['title'] = 'Pay Transparency country record';
  schema['description'] =
    'One EU member state\'s legal-data record. Every legal fact is a Fact<T> envelope: a value cannot exist without the source and date that justify it. Unknown is value:null with status:"pending_verification" — never a guess. Cross-field invariants (launch-country verified_by, Art. 12(3) as a condition, the Directive fallback citation rule) are enforced by CI, not by this file.';

  return `${JSON.stringify(schema, null, 2)}\n`;
}

const json = emitJsonSchema();
writeFileSync(OUT, json, 'utf8');

// Fail loudly rather than committing a schema that would validate a typo'd country code.
const parsed = JSON.parse(json) as Record<string, unknown>;
const codes = JSON.stringify(parsed).match(/"GR"/g);
if (codes === null) {
  throw new Error(
    'the emitted schema does not constrain country.code — a typo\'d code would validate',
  );
}

process.stdout.write(
  `country.schema.json emitted: ${json.length} bytes, ${EU_COUNTRY_CODES.length} country codes constrained\n`,
);
