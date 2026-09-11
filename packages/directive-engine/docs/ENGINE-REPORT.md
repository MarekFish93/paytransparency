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

## How the seven figures are read — the decisions authoring the vectors forced

Writing the golden vectors before the engine surfaced five questions the metric list does
not answer on its own. They are recorded here, with reasons, because plan 07 re-derives
every vector from the rows, the conventions and these documents alone — a rule that lives
only in someone's head cannot be re-derived, only re-run.

**1. Which pay figure each metric is over.** Metric (a) is the gap on **total pay** — the
ordinary basic wage or salary plus the complementary or variable components — because Art.
3(1) defines "pay" as exactly that sum, and (g) is the position that asks for the two sides
"broken down". Metrics (b) and (d) are over the **complementary or variable components
only**, computed across **all** workers including those receiving none, since metric (e)
exists separately to report how many receive them; excluding the zeros from (b) would make
(b) and (e) answer the same question twice and neither correctly.

**2. What ranks workers for the quartile bands.** **Total pay**, for the same reason: Art.
3(1)(f) divides workers "according to their pay levels", and "pay" is the Art. 3(1)
definition. Not basic pay alone, and never the pay *range* — four equal groups of workers,
split by headcount.

**3. The single-number reduction on (e), (f) and (g).** `MetricValue.value` is one nullable
number, but three of the seven positions are naturally multi-valued. Rather than amend the
frozen contract on the strength of vector authoring alone, each is reduced to the one number
that carries the comparison, with the full breakdown in the vector's `working`:

| Position | `value` is | Full breakdown lives in |
|---|---|---|
| (e) | the female proportion **minus** the male proportion, in percentage points | `working.proportionsReceivingComponents` |
| (f) | the proportion of **female** workers in the **upper** quartile, as a percentage | `working.quartiles` |
| (g) | the gap on total pay **within that category**, keyed by the employer's category name | `working.categories` |

This is a reduction, not a finding, and it is the most likely thing in this document to need
amending once the engine and the export exist. It is flagged as such deliberately: if Phase 6
needs the full vectors on the report itself, that is an amendment under the path below, and
the vectors change with it.

**4. A zero numerator is not a null; a zero denominator with a real difference is.** Where
the male figure **and** the female figure are both zero — every worker's variable components
are zero, say — the difference is zero, the answer "there is no difference between them" is
true, and the metric reports **`0`** with a `W_COMPONENTS_ALL_ZERO` warning recording that
the percentage expression is degenerate. Where the male figure is zero but the female figure
is not, the difference is real and cannot be expressed as a percentage of zero: the metric
reports **`null`** with a warning. And where a category contains workers of one sex only,
there is no comparison to make at all: **`null`** with `W_CATEGORY_ALL_ONE_SEX`, never a zero
and never a swallowed division by zero. A zero and a null say different things to an
authority and must not be interchangeable.

**5. Unmapped workers are counted, and quartile bands still contain them.** A row whose sex
value the declared `sexMapping` does not cover is counted in `excludedN` and raises
`W_SEX_UNMAPPED`; it is never dropped. It still occupies its place in the pay ranking, because
a quartile pay band is a division of the whole workforce by pay, but it contributes to neither
the female nor the male proportion within its band.

---

## Article 10 and the publication split

`art10Flags` records categories at or over the Art. 10(1) average-difference threshold of five
percentage points. A flag is **one of three cumulative conditions**, not the whole test: Art.
10(1) also requires that the difference is not justified on objective gender-neutral criteria
and that it has not been remedied within six months of the report's submission. Both are
employer judgements the engine cannot make, and the report must never imply that a flag is a
finding.

**The threshold is on the MAGNITUDE of the difference, not on its sign.** Art. 10(1) speaks of
a difference in average pay level of at least five per cent and does not restrict which sex it
favours, so a category whose gap is −7% is flagged exactly as one at +7% would be, and the
recorded `gapPct` keeps its sign. A **suppressed** category emits no flag: a figure that may
not be shown cannot be the basis of a finding, and the suppression is recorded instead.

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
