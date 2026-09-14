# `@paytransparency/directive-engine`

The Article 9 report contract for **Directive (EU) 2023/970** — the EU Pay Transparency
Directive — as data.

**MIT.** **Zero runtime dependencies, ever.** Both are enforced in CI. The surrounding web
application is AGPL; this package is deliberately separate so that anyone can use the
contract, the conventions and the golden vectors without taking the application's licence.

> "Article 9" in this package always means Article 9 of Directive (EU) 2023/970, never
> Article 9 of the GDPR. The two are confused constantly in HR tooling discussions.

## What is here, and what is deliberately not

There is **no Article 9 metric arithmetic in this package yet.** That is the design, not an
omission. The golden vectors and the frozen report type are the executable specification the
engine must later satisfy; an implementation written alongside them would be written against
itself, and the vectors would be testing the code against the code rather than against the
Directive.

| Artefact | What it is |
|---|---|
| `src/types.ts` | The frozen `EngineReport` contract, types only |
| `docs/ENGINE-REPORT.md` | The contract narrated, plus the recorded **amendment path** |
| `docs/CONVENTIONS.md` | One recorded decision per calculation convention |
| `vectors/` | Ten hand-computed golden vectors, each self-contained |
| `src/share-url-contract.ts` | The share-URL bucket table and rounding rule, implemented once |

The one piece of executable code is the share-URL contract. It exists because the result
page and the share card must round identically, and a rounding rule that lives only in a
document is a sentence rather than a property. Its two entry points are pure, take no
dependency, and compute no Article 9 metric.

## The convention document is the point

The Directive **fixes** some calculation choices, is **silent** on others, and for a few sets
**no value at all**. Vendors routinely assert their own convention as if it were law —
full-time-equivalent normalisation and a six-person suppression threshold are the two
clearest cases, and neither is in the Directive.

Every convention therefore carries a recorded decision stating the Directive's position in one
of three words, and — separately, on its own line — where this project's own default came
from: the Directive's text, a named and linked external guidance document, explicitly
project-invented, or no default at all. That second line exists so that an auditor can tell a
borrowed convention from an invented one. Both are legitimate; being unable to tell them apart
is not.

Where the Directive states nothing and no defensible default exists — part-time and
full-time-equivalent normalisation above all — this package records **no default and throws**.
An HR user has to be able to defend the figure to their own auditor.

## Status

Pre-1.0 and not yet published. The contract is frozen with a written amendment path; see
`docs/ENGINE-REPORT.md`.
