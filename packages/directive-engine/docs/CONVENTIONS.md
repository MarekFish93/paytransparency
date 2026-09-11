# Calculation conventions — one recorded decision per key

Directive (EU) 2023/970 **fixes** some of the choices an Article 9 calculation has to make,
is **silent** on others, and for a few sets **no value at all**. This document records one
decision per key of the `Conventions` type in `src/types.ts`, in the same order, so that
nothing the project chose can be mistaken for something the Directive settled.

> Every reference to "Article 9" in this document is Article 9 of Directive (EU) 2023/970,
> never Article 9 of the GDPR.

**Four elements are required under every heading, and a missing one fails
`test/conventions-documented.test.ts`:**

1. **The Directive's position**, in exactly one of three words — **fixed**, **silent**, or
   **none** — on a line of its own.
2. **The quoted authentic text** that fixes it, wherever it is fixed.
3. **The project's recorded default**, and whether an override is accepted.
4. **Where that default came from**, on its own line beginning `Default origin:`.

**Position and origin are orthogonal and must never be conflated.** The position describes
what the *Directive* says. The origin describes where *this project's own default* came
from. Without the second, a convention borrowed from a real national guidance document and
a convention this project invented read identically to an auditor — and an invented default
that cannot be told apart from a sourced one is the same repudiation risk one level down. An
invented default is legitimate as long as it is documented and overridable. An
unattributable one is not.

**The origin line takes one of exactly four forms, and nothing else parses:**

| Form | Meaning |
|---|---|
| `directive_text` | The default is what the Directive's own wording dictates, including a null default that encodes the Directive's explicit absence of a value. No project judgement was added. |
| `external_guidance: <document> — <url>` | Borrowed from a named, citable external guidance document. The name **and** the URL are both required. |
| `project_invented` | This project chose it and **no external source supplies it**. Said in those words, so a reader is never left to assume a source exists. |
| `no_default` | No default value is recorded at all. The caller supplies the value, or a missing value throws. |

A decision whose position word is **silent** may **not** declare `directive_text`: a project
default cannot cite the Directive's silence as its own source. That single cross-check is
what makes the rule mechanical rather than a matter of drafting care.

**Two points that look like conventions are not convention keys** and deliberately have no
heading here — the **category of workers** (a Directive-fixed definition, not a choice) and
**currency** (a v1 scope statement). Both are narrated in `ENGINE-REPORT.md`, next to the
metric each constrains. Putting them here would leave thirteen headings against eleven keys
and make the ordered-equality test unsatisfiable by construction.

---

## denominator

**Type:** `'male_mean' | 'male_median'` — the mean-based metrics take the former, the
median-based ones the latter.

Directive position: **fixed**

> "'gender pay gap' means the difference in average pay levels between female and male
> workers of an employer expressed as a percentage of the average pay level of **male
> workers**" — Art. 3(1)(c) (`32023L0970#003.001`)

> "'median gender pay gap' means the difference between the median pay level of female and
> median pay level of male workers of an employer expressed as a percentage of the median
> pay level of **male workers**" — Art. 3(1)(e) (`32023L0970#003.001`)

**Recorded default:** the male figure, always. **No override is accepted.** Dividing by the
female figure, by the overall mean, or by the midpoint `((M+F)/2)` each produces a number
that is not the Art. 9(1)(a) or 9(1)(c) figure, however reasonable it looks. `conventionSource`
reports `directive` for this key in every report.

Default origin: directive_text

## medianRule

**Type:** `'interpolated' | 'lower_of_two'` — which value an even headcount takes.

Directive position: **silent**

Art. 3(1)(e) defines the median pay level as "the pay level at which half of the workers of
an employer earn more and half of them earn less". With an even headcount there are two such
values and the Directive does not say which one to take, or whether to interpolate between
them.

**Recorded default:** `lower_of_two`. An override to `interpolated` is accepted, and both
behaviours are carried in the golden vectors rather than one being treated as the answer.

**This is a project convention, not a rule.** No external guidance document that could be
named and linked was found stating a lower-of-two rule for this Directive; the UK guidance
that settles the quartile questions below takes the *mean of the two middle values* instead,
which is the `interpolated` behaviour. Recording `lower_of_two` as this project's default
while attributing it to that document would be a false attribution, so it is recorded as
invented. The choice is defensible — it never manufactures a pay level no worker actually
received — but nothing external supplies it.

Default origin: project_invented

## quartileTieRule

**Type:** `'ukgov_proportional' | 'stable_sort'` — where workers sitting on exactly the same
pay value at a quartile boundary go.

Directive position: **silent**

The quartile construction itself IS fixed, and it is quoted here because it is what the tie
rule operates inside:

> "'quartile pay band' means each of **four equal groups of workers** into which they are
> divided according to their pay levels, from the lowest to the highest" — Art. 3(1)(f)
> (`32023L0970#003.001`)

Four equal groups of **workers**: rank by pay and split by headcount, never by pay range.
Splitting the pay range into four bands is a different metric and is wrong.

What the Directive does not settle is where workers on exactly the same pay value at a
boundary go. A naive slice puts identically-paid people in different quartiles according to
sort stability, which makes the metric non-deterministic.

**Recorded default:** `ukgov_proportional` — distribute the tied workers across the adjacent
quarters so that the proportion of men and women receiving that pay value is the same in each
of the pay quarters. An override to `stable_sort` is accepted so a national adapter can fix
the rule differently.

**This is a project convention borrowed from national guidance, and it is labelled as one.**
It is not a Directive rule and must never be presented to an authority as one.

Default origin: external_guidance: UK Government, Gender pay gap reporting: making your calculations — https://www.gov.uk/government/publications/gender-pay-gap-reporting-guidance-for-employers/making-your-calculations

## quartileRemainder

**Type:** `'to_lower' | 'to_upper'` — which quarter takes the leftover when the headcount does
not divide by four.

Directive position: **silent**

Art. 3(1)(f) requires four equal groups; 103 workers do not form four equal groups, and the
Directive says nothing about the one, two or three workers left over.

**Recorded default:** `to_lower` — leftover workers go to the lower quarter. An override to
`to_upper` is accepted. The golden vectors exercise headcounts leaving each of the four
possible remainders on division by four, so this key is never exercised only in its easy state.

**What "the lower quarter" means when the remainder is two or three**, because the phrase is
singular and the question is otherwise unanswerable: the leftover workers are distributed
**one per quarter, starting from the lowest**, not all into the first quarter. A remainder of
two gives sizes `n/4+1, n/4+1, n/4, n/4`; a remainder of three gives `n/4+1, n/4+1, n/4+1,
n/4`. The alternative reading — all leftovers into the first quarter — puts four workers in
one quarter against two in each of the others at n=10, which is not four equal groups in any
sense Art. 3(1)(f) would recognise. Under `to_upper` the same distribution runs from the
highest quarter downwards.

**This is a project convention borrowed from the same national guidance document as
`quartileTieRule`**, which settles the boundary tie rule and the leftover side together. It is
labelled as a convention, not as a Directive rule.

Default origin: external_guidance: UK Government, Gender pay gap reporting: making your calculations — https://www.gov.uk/government/publications/gender-pay-gap-reporting-guidance-for-employers/making-your-calculations

## payBasis

**Type:** `'hourly' | 'fte_annualised' | 'as_paid'` — the basis the pay figures are expressed on.

Directive position: **silent**

The position word is **silent** because the part that needs a project decision is the part the
Directive leaves open. The Directive *does* fix the structure: Art. 9(1)(a)–(d) report the
ordinary basic wage or salary and the complementary or variable components separately, and
Art. 3(1) defines pay as "the ordinary basic or minimum wage or salary and any other
consideration … (complementary or variable components)". What is not settled at EU level is
which of an employer's own pay lines falls on which side, and on what basis the figures are
expressed.

**Recorded default: none.** The caller declares the basis. `conventionSource` reports `caller`
for this key, and the chosen basis is printed on every page of the export, because a figure
whose basis is not stated cannot be compared with anyone else's.

Default origin: no_default

## partialPeriodPolicy

**Type:** `'include' | 'exclude_reduced_pay'` — part-time and full-time-equivalent normalisation.

Directive position: **silent**

This is the flagship case and the reason the "refuse rather than default" rule exists at all.
The Directive states **no** normalisation rule. Employer-side vendors routinely assert
full-time-equivalent normalisation as though it were law; national guidance that addresses the
question at all solves it differently again, by excluding workers who were on reduced pay
during the period rather than by normalising them. Three defensible answers, none of them
the Directive's.

**Recorded default: none. There is no default, and a missing value throws** with the named
code `E_CONVENTION_REQUIRED`. The engine refuses to produce a number rather than pick one
silently, because an HR user has to be able to defend the figure to their own auditor, and
"the tool chose it" is not a defence.

Read together with `joinerLeaverPolicy` below: a joiner is also a partial period, and the two
keys must be applied together or the same worker is normalised twice.

Default origin: no_default

## joinerLeaverPolicy

**Type:** `'employed_at_period_end' | 'any_pay_in_period'` — workers present for only part of
the reference period.

Directive position: **silent**

Art. 9 requires the information to concern the employer's workers over the previous calendar
year and says nothing about a worker who joined in March or left in September.

**Recorded default:** `any_pay_in_period` — include them, at the pay actually received over
the period they were employed. An override to `employed_at_period_end` is accepted.

**This is a project convention and it was invented here.** No external guidance document
supplies it. It is stated plainly rather than left for a reader to assume a source exists:
the default is reasonable and it is overridable, which is what the documented-default rule
asks for, but it is this project's judgement and nothing more.

Applies together with `partialPeriodPolicy` above — a joiner is a partial period, and reading
the two keys separately double-counts the same worker's adjustment.

Default origin: project_invented

## sexMapping

**Type:** `Record<string, SexCode>` — the employer's own sex column values mapped onto
`'F' | 'M' | 'other' | 'undisclosed'`.

Directive position: **none**

The Directive requires every Art. 9(1) metric broken down by sex and prescribes **no coding
scheme whatsoever**. Real payroll carries `M`, `F`, `X`, `W`, `K`, `1`, `2`, blanks and
free text, and the correct mapping is an employer fact.

**Recorded default: none.** The caller declares the map. `conventionSource` reports `caller`.

**A row whose value the declared map does not cover goes to `excludedN` with a
`W_SEX_UNMAPPED` warning, and is never silently dropped.** A silently dropped worker is
exactly how a confidently wrong percentage is produced: four per cent of a workforce
disappearing without a trace moves the gap and leaves nothing in the report to notice.

Default origin: no_default

## componentMap

**Type:** `Record<string, PayComponentClass>` — the employer's own payroll columns mapped onto
`'basic' | 'complementary_variable' | 'excluded'`.

Directive position: **none**

Mapping an employer's payroll columns onto the Directive's pay components is
employer-specific, and no EU-level mapping exists. The boundaries that *are* settled are
substantive rather than structural — employer contributions to occupational schemes are pay
for workers in the period, statutory social-security benefits are not pay, and universally
granted non-discretionary items may add nothing useful — and none of them tells you what a
column called `ALLOW_3` is.

**Recorded default: none.** The caller declares the map, column by column. `conventionSource`
reports `caller`. The classification is **never inferred from a column name**.

**The category column is required input under the same rule.** A category of workers is
employer-defined by the Directive's own definition (narrated in `ENGINE-REPORT.md` beside
metric (g)), so the engine requires a supplied category column and **refuses to infer one
from a job title**. Auto-grouping by job title would raise an Art. 10 five-percent flag on a
category the employer never defined — the single most damaging thing this package could do.

Default origin: no_default

## minGroupSize

**Type:** `number | null` — the small-group suppression threshold.

Directive position: **none**

**No EU-level numeric threshold exists anywhere in the Directive.** Art. 12(3) is the only
identifiability provision, and it sets no number at all — it lets a Member State decide that
where disclosure would identify a worker, only the workers' representatives, the labour
inspectorate or the equality body may see the information.

**Recorded default: `null`**, and the `null` is emitted in the export rather than omitted, so
a reader can see that no threshold was applied rather than guess. A national adapter may set
a number; `conventionSource` then reports `adapter_default`. Suppression is always an explicit,
counted action carrying `W_GROUP_SUPPRESSED`, and it stays distinct from statistical
unreliability (`W_GROUP_UNRELIABLE`) in `MetricValue`.

**The six-person figure that reached this project through its own brief is a German national
rule.** § 12 EntgTranspG attaches it to the *individual* information right, not to Art. 9
reporting. It belongs in `country-data`, per country, and asserting it as a Directive rule was
one of the four inherited errors corrected at initialisation.

The `null` default adds no project judgement — it encodes the Directive's own absence of a
number — so its origin is the Directive's text.

Default origin: directive_text

## referencePeriod

**Type:** `{ from: string; to: string }` — ISO dates, and the range must be a calendar year.

Directive position: **fixed**

Art. 9(2)–(4) require the reported information to relate to the **previous calendar year**.
A rolling twelve months, a fiscal year, or a current-headcount snapshot are each a different
population and produce a different number.

**Recorded default:** none is needed — the caller supplies the year, and a range that is not a
calendar year is rejected with `E_REFERENCE_PERIOD_NOT_CALENDAR_YEAR`. **No override is
accepted;** `conventionSource` reports `directive`.

Default origin: directive_text
