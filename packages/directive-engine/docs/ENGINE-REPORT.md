# `EngineReport` — the frozen contract

`EngineReport` in `src/types.ts` is the shape every consumer of this package is built
against: the employer-facing calculator, the national adapters, and the published npm
package. It is **frozen**, and the amendment path at the end of this document is what keeps
that freeze survivable rather than a trap.

Nothing here computes anything. The type and the golden vectors under `vectors/` are the
executable specification the engine must later satisfy. An implementation written alongside
them would be written against itself.

> "Article 9" throughout this document is Article 9 of Directive (EU) 2023/970, never
> Article 9 of the GDPR.

---

## What every figure carries

A bare number is not shippable. Every figure in the report is a `MetricValue` and carries:

| Field | Why it is in the contract |
|---|---|
| `value` | `null` where there is no defensible figure — never a zero standing in for one |
| `definitionCite` | A citation key into the stored Directive corpus, so the number and the text cannot drift apart |
| `populationN` | How many workers are in this figure |
| `excludedN` | How many were in the input and are not in this figure |
| `suppressed` | Withheld because showing it would identify a worker |
| `unreliable` | Computable, but too noisy to rely on |

**`suppressed` and `unreliable` are separate and stay separate.** "We cannot show this because
it would identify someone" and "this number is too noisy to trust" are different statements to
an authority, and an HR user must be able to tell which one they are looking at. Collapsing
them into one flag destroys the distinction the export exists to carry.

### Citation keys resolve at paragraph granularity

`definitionCite` is written in the shape plan 01 fixed — the CELEX id, a hash, the publisher's
own three-digit article id, a dot, the three-digit paragraph id: `32023L0970#003.001`. These
are the Publications Office's own ids and they are language-invariant, so a report rendered in
Polish resolves the same key against the Polish expression of the Directive.

They resolve at **paragraph** granularity, because that is the granularity the publisher's ids
have. Art. 3(1)(c) and Art. 3(1)(f) are both inside `003.001`. The lettered sub-point a reader
actually needs is carried alongside, in `METRIC_DEFINITIONS[key].point`, and narrated below.
That field is documentation: nothing resolves against it, and it is never presented as a key.

---

## The seven Art. 9(1) metrics

| Key | Figure | Definition | Cite |
|---|---|---|---|
| `a` | the gender pay gap | Art. 3(1)(c) | `32023L0970#003.001` |
| `b` | the gender pay gap in complementary or variable components | Art. 3(1)(c) over the components defined at Art. 3(1)(a) | `32023L0970#003.001` |
| `c` | the median gender pay gap | Art. 3(1)(e) | `32023L0970#003.001` |
| `d` | the median gender pay gap in complementary or variable components | Art. 3(1)(e) over the same components | `32023L0970#003.001` |
| `e` | the proportion of female and male workers receiving complementary or variable components | Art. 9(1)(e) — defined by its own enumeration | `32023L0970#009.001` |
| `f` | the proportion of female and male workers in each quartile pay band | Art. 3(1)(f) | `32023L0970#003.001` |
| `g` | the gender pay gap by categories of workers, broken down by basic and by complementary or variable components | Art. 3(1)(h) | `32023L0970#003.001` |

### Metric (g), and the category of workers — fixed by the Directive, not a convention

Metric `g` is keyed by the employer's own category name, and that is a direct consequence of
the Directive's own definition:

> "'category of workers' means workers performing the same work or work of equal value
> grouped in a non-arbitrary manner based on the
> non-discriminatory and objective gender-neutral criteria referred to in Article 4(4),
> by the workers' employer and, where applicable, in cooperation with the workers'
> representatives" — Art. 3(1)(h) (`32023L0970#003.001`)

This is **fixed**, so it is not a convention key and has no decision in `CONVENTIONS.md`. It is
recorded here because it constrains two things at once: metric `g` is keyed by a name the
employer supplied, and the required input therefore includes a category column. **The engine
must refuse to infer a category from a job title.** Auto-grouping by job title would raise an
Art. 10(1) five-percent flag on a category the employer never defined, against criteria the
employer never agreed — the most damaging thing this package could do to the user it is meant
to serve. The input requirement is carried operationally in the `componentMap` decision.

### Currency — a v1 scope statement, not a convention

The Directive does not address currency. Currency is recorded **per country** in
`country-data`, and **there is no cross-currency aggregation in v1**: a report covers one
employer in one currency, and figures in different currencies are never summed or compared in
a single metric. This is a scope decision about what this version does, not a calculation
choice the Directive left open, so it has no decision in `CONVENTIONS.md` either.

---

## Article 10 and the publication split

`art10Flags` records categories at or over the Art. 10(1) average-difference threshold of five
percentage points. A flag is **one of three cumulative conditions**, not the whole test: Art.
10(1) also requires that the difference is not justified on objective gender-neutral criteria
and that it has not been remedied within six months of the report's submission. Both are
employer judgements the engine cannot make, and the report must never imply that a flag is a
finding.

`publishable` splits the metrics per Art. 9(7): the employer **may** self-publish (a)–(f);
(g) goes to the national monitoring body. Getting this backwards creates a disclosure problem
for the customer, so the split is structural in the type rather than a rendering choice in an
exporter.

## `draft` is the literal `true`

Art. 9(6): "The accuracy of the information shall be confirmed by the employer's management,
after consulting workers' representatives. Workers' representatives shall have access to the
methodologies applied by the employer."

Nothing this package produces is a filing. `draft` is typed as the literal `true` rather than
as a boolean, so no caller can flip it. Every export carries the full methodology annex — every
convention chosen, and `conventionSource` saying where each came from — because that annex is
precisely what Art. 9(6) entitles the workers' representatives to see.

## `conventions` and `conventionSource` are always echoed

Every report states the conventions it used and, per key, whether the value came from the
Directive, from the caller, or from a national adapter's default. A disagreement with a
vendor's output or a national template then resolves to a parameter rather than to a bug
report, and the figure stays defensible to the user's own auditor.

---

## Amendment path

The contract is frozen. It is **not** immutable, and pretending otherwise would produce either
silent drift or an ugly workaround the first time building the engine surfaces something a
data-only design could not see.

An amendment is permitted when **all four** of the following hold:

1. It is **written up with a stated reason** — what the engine work surfaced, and why the
   existing shape cannot carry it.
2. It is applied to **`src/types.ts`**, **`docs/CONVENTIONS.md`** and the golden vectors under
   **`vectors/`** *together*, in one change. A change to one of the three alone is drift, and
   `test/conventions-documented.test.ts` and `test/vectors-wellformed.test.ts` are the two
   gates that make that mechanical rather than a matter of reviewer attention.
3. Adding a convention key means adding it to the `Conventions` type, to `CONVENTION_KEYS` in
   the same position, to `CONVENTIONS.md` as a level-2 decision in the same position with all
   four required elements, and to **every** vector's `conventions.json`. There is no partial
   acceptance and no default fill.
4. Any vector whose expected values change is **re-derived independently**, by a pass that has
   not seen the previous answer. A disagreement between the two passes is a defect in the
   *wording of a convention*, and the fix goes to the convention document — never to either
   number.

A coordinated amendment is a change. An uncoordinated one is a migration, and that is exactly
what the freeze exists to prevent.
