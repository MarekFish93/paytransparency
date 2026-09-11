/**
 * Every calculation convention carries a recorded decision, and every recorded default
 * names where it came from.
 *
 * Two separate properties are asserted here and they must never be conflated:
 *
 *  - the DIRECTIVE POSITION says what the Directive itself does — fixed, silent, or no
 *    value at all. A silence recorded as a rule is threat T-1-22: a project convention
 *    presented to an auditor as EU law.
 *  - the DEFAULT ORIGIN says where THIS PROJECT'S default came from. Without it, a
 *    convention borrowed from a real national guidance document and one the project
 *    invented read identically to an auditor. An invented default is legitimate as long
 *    as it is documented and overridable; an unattributable one is not.
 *
 * The whole suite is offline and reads only files in this repository.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CITATION_KEY_PATTERN,
  CITED_ARTICLES,
  CONVENTION_KEYS,
  METRIC_DEFINITIONS,
  METRIC_KEYS,
} from '../src/types.ts';

const CONVENTIONS_DOC = fileURLToPath(new URL('../docs/CONVENTIONS.md', import.meta.url));
const ENGINE_REPORT_DOC = fileURLToPath(new URL('../docs/ENGINE-REPORT.md', import.meta.url));
const TYPES_SRC = fileURLToPath(new URL('../src/types.ts', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));

/**
 * Read a file that the artefact under test is supposed to have produced.
 *
 * A missing file yields an empty string rather than throwing, so the failure surfaces as
 * the behavioural assertion it actually is ("expected 0 decisions, got 11") rather than
 * as an ENOENT stack trace that says nothing about the contract.
 */
function readArtefact(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

interface Decision {
  key: string;
  body: string;
}

/** Split the convention document into its level-2 decisions, in document order. */
function parseDecisions(doc: string): Decision[] {
  const out: Decision[] = [];
  let current: Decision | undefined;
  for (const line of doc.split(/\r?\n/)) {
    const heading = /^##[ \t]+(.*\S)[ \t]*$/.exec(line);
    if (heading) {
      current = { key: heading[1] ?? '', body: '' };
      out.push(current);
      continue;
    }
    if (current) current.body += `${line}\n`;
  }
  return out;
}

function linesStartingWith(body: string, prefix: string): string[] {
  return body.split(/\r?\n/).filter((line) => line.startsWith(prefix));
}

const POSITION_PREFIX = 'Directive position:';
const ORIGIN_PREFIX = 'Default origin:';

type Position = 'fixed' | 'silent' | 'none';
type OriginForm = 'directive_text' | 'external_guidance' | 'project_invented' | 'no_default';

function classifyPosition(line: string): Position | null {
  const match = /^Directive position:[ \t]*\*\*(fixed|silent|none)\*\*[ \t]*$/.exec(line);
  const word = match?.[1];
  return word === 'fixed' || word === 'silent' || word === 'none' ? word : null;
}

interface Origin {
  form: OriginForm | null;
  /** Non-null only for a well-formed `external_guidance` line naming BOTH a document and a URL. */
  document: string | null;
  url: string | null;
}

function classifyOrigin(line: string): Origin {
  const raw = line.slice(ORIGIN_PREFIX.length).trim();
  if (raw === 'directive_text') return { form: 'directive_text', document: null, url: null };
  if (raw === 'project_invented') return { form: 'project_invented', document: null, url: null };
  if (raw === 'no_default') return { form: 'no_default', document: null, url: null };
  if (raw.startsWith('external_guidance:')) {
    const rest = raw.slice('external_guidance:'.length).trim();
    const sep = rest.lastIndexOf(' — ');
    if (sep < 0) return { form: 'external_guidance', document: null, url: null };
    const name = rest.slice(0, sep).trim();
    const url = rest.slice(sep + ' — '.length).trim();
    const wellFormed = name.length > 0 && /^https?:\/\/\S+$/.test(url);
    return {
      form: 'external_guidance',
      document: wellFormed ? name : null,
      url: wellFormed ? url : null,
    };
  }
  return { form: null, document: null, url: null };
}

/** Strip block comments and whole-line `//` comments so prose cannot satisfy a code check. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const conventionsDoc = readArtefact(CONVENTIONS_DOC);
const engineReportDoc = readArtefact(ENGINE_REPORT_DOC);
const decisions = parseDecisions(conventionsDoc);
const byKey = new Map(decisions.map((d) => [d.key, d]));

describe('CONVENTIONS.md — one recorded decision per convention key', () => {
  it('carries exactly the eleven CONVENTION_KEYS as its decision headings, with no missing and no orphan key', () => {
    const documented = decisions.map((d) => d.key);
    const declared = [...CONVENTION_KEYS];

    const missing = declared.filter((k) => !documented.includes(k));
    const orphaned = documented.filter((k) => !declared.includes(k as never));

    expect({ missing, orphaned }).toEqual({ missing: [], orphaned: [] });
    expect(documented).toHaveLength(declared.length);
  });

  it('lists the decisions in the same order as CONVENTION_KEYS, so a key cannot be appended to one without the other', () => {
    expect(decisions.map((d) => d.key)).toEqual([...CONVENTION_KEYS]);
  });

  it('states exactly one Directive position per decision, in one of the three recognised words', () => {
    const offenders = decisions
      .map((d) => {
        const lines = linesStartingWith(d.body, POSITION_PREFIX);
        const positions = lines.map(classifyPosition);
        const ok = positions.length === 1 && positions[0] !== null;
        return ok ? null : { key: d.key, lines };
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(decisions.length).toBeGreaterThan(0);
  });

  it('carries exactly one Default origin line per decision, in one of the four recognised forms', () => {
    const offenders = decisions
      .map((d) => {
        const lines = linesStartingWith(d.body, ORIGIN_PREFIX);
        const forms = lines.map((l) => classifyOrigin(l).form);
        const ok = forms.length === 1 && forms[0] !== null;
        return ok ? null : { key: d.key, lines };
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
    expect(decisions.length).toBeGreaterThan(0);
  });

  it('names both a document and a URL on every external_guidance origin', () => {
    const offenders = decisions
      .flatMap((d) => linesStartingWith(d.body, ORIGIN_PREFIX).map((l) => ({ key: d.key, origin: classifyOrigin(l), line: l })))
      .filter((x) => x.origin.form === 'external_guidance')
      .filter((x) => x.origin.document === null || x.origin.url === null)
      .map((x) => ({ key: x.key, line: x.line }));

    expect(offenders).toEqual([]);
  });

  it('never lets a decision whose Directive position is silent claim directive_text as its own default origin', () => {
    const offenders = decisions
      .map((d) => {
        const position = linesStartingWith(d.body, POSITION_PREFIX).map(classifyPosition)[0] ?? null;
        const origin = linesStartingWith(d.body, ORIGIN_PREFIX).map((l) => classifyOrigin(l).form)[0] ?? null;
        return position === 'silent' && origin === 'directive_text' ? d.key : null;
      })
      .filter((x) => x !== null);

    expect(offenders).toEqual([]);
  });

  it('attributes joinerLeaverPolicy as project_invented in those words, so an invented default is distinguishable from the borrowed one under quartileTieRule', () => {
    const body = byKey.get('joinerLeaverPolicy')?.body ?? '';
    const origin = linesStartingWith(body, ORIGIN_PREFIX).map(classifyOrigin)[0];
    expect(origin?.form).toBe('project_invented');
    expect(body).toMatch(/project convention/i);
  });

  it('attributes quartileTieRule to a named external guidance document with a URL, not to the Directive', () => {
    const body = byKey.get('quartileTieRule')?.body ?? '';
    const origin = linesStartingWith(body, ORIGIN_PREFIX).map(classifyOrigin)[0];
    expect(origin?.form).toBe('external_guidance');
    expect(origin?.document ?? '').not.toBe('');
    expect(origin?.url ?? '').toMatch(/^https?:\/\//);
    expect(linesStartingWith(body, POSITION_PREFIX).map(classifyPosition)[0]).toBe('silent');
  });

  it('records no default and a throwing behaviour for partialPeriodPolicy — the flagship case the Directive does not settle', () => {
    const body = byKey.get('partialPeriodPolicy')?.body ?? '';
    expect(linesStartingWith(body, ORIGIN_PREFIX).map((l) => classifyOrigin(l).form)[0]).toBe('no_default');
    expect(body).toMatch(/no default/i);
    expect(body).toMatch(/throw/i);
    expect(body).toContain('E_CONVENTION_REQUIRED');
  });

  it('records a null default for minGroupSize and records that no EU-level numeric threshold exists', () => {
    const body = byKey.get('minGroupSize')?.body ?? '';
    expect(body).toMatch(/`null`/);
    expect(body).toMatch(/no EU-level numeric threshold/i);
    expect(body).toMatch(/§ ?12 EntgTranspG/);
  });
});

describe('types.ts — the frozen contract, and citation keys in the shape plan 01 fixed', () => {
  it('declares a definitionCite for every Art. 9(1) metric position', () => {
    expect(Object.keys(METRIC_DEFINITIONS).sort()).toEqual([...METRIC_KEYS].sort());
    for (const key of METRIC_KEYS) {
      expect(METRIC_DEFINITIONS[key].definitionCite).not.toBe('');
    }
  });

  it('writes every definitionCite in the exported citation-key shape, checked against the exported pattern rather than a re-typed literal', () => {
    const offenders = METRIC_KEYS.filter((k) => !CITATION_KEY_PATTERN.test(METRIC_DEFINITIONS[k].definitionCite)).map(
      (k) => ({ metric: k, cite: METRIC_DEFINITIONS[k].definitionCite }),
    );
    expect(offenders).toEqual([]);
    expect(METRIC_KEYS).toHaveLength(7);
  });

  it('names an article from this phase’s cited set in every definitionCite', () => {
    const offenders = METRIC_KEYS.map((k) => {
      const cite = METRIC_DEFINITIONS[k].definitionCite;
      const article = cite.slice(cite.indexOf('#') + 1).split('.')[0] ?? '';
      return (CITED_ARTICLES as readonly string[]).includes(article) ? null : { metric: k, cite, article };
    }).filter((x) => x !== null);

    expect(offenders).toEqual([]);
  });

  it('computes nothing — the file carries types and constants only, with no callable body', () => {
    const code = stripComments(readArtefact(TYPES_SRC));
    expect(code).not.toBe('');
    expect(code).not.toMatch(/\bfunction\b/);
    expect(code).not.toMatch(/=>/);
    expect(code).not.toMatch(/\breturn\b/);
  });

  it('keeps privacy suppression and statistical reliability as two separate fields on MetricValue', () => {
    const code = readArtefact(TYPES_SRC);
    expect(code).toMatch(/^\s*suppressed: boolean;$/m);
    expect(code).toMatch(/^\s*unreliable: boolean;$/m);
  });

  it('declares draft as the literal true, not as a boolean', () => {
    expect(readArtefact(TYPES_SRC)).toMatch(/^\s*draft: true;$/m);
  });
});

describe('the package ships MIT with no runtime dependencies', () => {
  it('declares the MIT licence and an empty dependencies object', () => {
    const pkg = JSON.parse(readArtefact(PACKAGE_JSON) || '{}') as {
      license?: string;
      dependencies?: Record<string, string>;
    };
    expect(pkg.license).toBe('MIT');
    expect(pkg.dependencies).toEqual({});
  });
});

describe('ENGINE-REPORT.md — the narrative, the two non-key points, and the amendment path', () => {
  it('carries the Directive-fixed category-of-workers definition alongside the per-category metric', () => {
    expect(engineReportDoc).toMatch(/category of workers/i);
    expect(engineReportDoc).toContain('non-discriminatory and objective gender-neutral criteria');
  });

  it('carries the per-country currency scope statement, which is a v1 scope decision and not a convention key', () => {
    expect(engineReportDoc).toMatch(/currency/i);
    expect(engineReportDoc).toMatch(/no cross-currency aggregation/i);
  });

  it('records an amendment path naming all three artefacts that must change together', () => {
    expect(engineReportDoc).toMatch(/##\s+Amendment path/);
    expect(engineReportDoc).toContain('src/types.ts');
    expect(engineReportDoc).toContain('docs/CONVENTIONS.md');
    expect(engineReportDoc).toContain('vectors/');
  });
});
