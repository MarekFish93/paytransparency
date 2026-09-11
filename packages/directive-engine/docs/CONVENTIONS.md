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

### How to read the "settled by re-derivation" notes

*(A level-3 heading deliberately: every level-2 heading in this document is a convention
key, and `test/conventions-documented.test.ts` reads them as the ordered key list.)*

Several decisions below carry a note headed **Settled by re-derivation (plan 01-07)**.
Each records a question that D-13's independent second pass proved this document did not
answer: two passes read the same wording and produced different answers, or read it the
same way only by luck. The note states both readings, which one now governs, and why.

These notes exist because a convention that admits two readings is not a convention. The
disagreement is evidence about the WORDING, so it was fixed here and both passes were then
redone for the affected vectors — never by editing whichever number looked wrong, which
would have discarded the evidence and kept the ambiguity.

**Four of them record decisions the `Conventions` type has no key for**: how a percentage
is rounded, what the single scalar of metrics (e) and (f) denotes, whether the Art. 10(1)
trigger is signed, and how suppression interacts with the rest of the report. They are
recorded under the nearest existing key because this document must carry exactly the eleven
`CONVENTION_KEYS` headings in their fixed order, and a twelfth heading would break that
invariant by construction. **That is a workaround, not a design.** The honest fix is a
`Conventions` amendment adding keys for them under the D-16 path, and it is written up in
`01-07-SUMMARY.md` as a recommendation rather than applied here — amending a frozen
contract is a decision for a human, not a side effect of a re-derivation.

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

### Settled by re-derivation (plan 01-07): the gap is SIGNED, and the Art. 10(1) trigger tests its MAGNITUDE

Both passes agreed that the expression is signed — a category where women out-earn men
reports a negative figure, and the sign is never discarded. **They disagreed about whether a
negative figure can raise an Art. 10(1) flag**, and the negative-gap vector is where that
showed: one pass flagged a category at `-25`, the other left the flag list empty.

- **Reading now rejected:** signed. "A gender pay gap of at least 5 %" means at least
  *positive* five, so `-25` does not trigger.
- **Reading now governing:** **magnitude**. Art. 10(1) is engaged by a *difference* in
  average pay level of at least 5 %, and a difference of 25 % is a difference of 25 %
  whichever sex it favours. The signed reading would silently exempt every category in which
  men are the underpaid group, which the Directive's equal-pay principle does not permit.
  **`Art10Flag.gapPct` carries the SIGNED value**, so a consumer reading the flag sees both
  that the trigger fired and in which direction; the flag remains one of the three
  cumulative Art. 10(1) conditions and never asserts the other two.

This is a project convention about how a threshold is applied, not a Directive rule about
the threshold's existence, and it must not be presented to an authority as the latter.

### Settled by re-derivation (plan 01-07): rounding

Nothing in this document governed the precision of a reported percentage. The two passes
happened to choose the same rule independently, which is agreement by luck rather than by
specification — `200/3000` does not terminate, and an engine built against these vectors
could have rounded differently and still claimed to satisfy them.

**Recorded default: exact where the division terminates within four decimal places,
otherwise rounded half-up to four decimal places.** Rounding is applied ONCE, to the final
percentage, never to an intermediate mean or median. For a negative figure the magnitude is
rounded and the sign reapplied, so a gap and its mirror image are the same size. Two decimal
places was rejected because it would turn exact values such as `15.625` into rounded ones for
no reason.

**This is a project convention and it was invented here.** No external guidance document
supplies a precision rule for this Directive. It is stated plainly rather than left for a
reader to assume a source exists. The `Default origin:` line below attributes the DENOMINATOR
decision, which is the Directive's; this rounding rule is not, and is labelled as invented in
these words instead.

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

### Settled by re-derivation (plan 01-07): which band metric (f) reports

The two passes constructed **identical** quartile bands on all ten vectors — same sizes, same
remainder distribution, same fractional split of a straddling tie — and then reported
different numbers, because Art. 9(1)(f) is the proportion of female and male workers in EACH
of four bands (eight figures) while `Metrics.f` is a single `MetricValue` carrying one scalar.
One pass reported the lowest band's female share, the other the highest.

- **Reading now rejected:** the lowest band, on the ground that the remainder and tie rules
  land there in these particular vectors. That is an argument about test coverage, not about
  what the metric means.
- **Reading now governing:** **the female share of the HIGHEST (fourth) quartile pay band**,
  as a percentage. It is the figure the same national guidance document this key already
  borrows from treats as the headline quartile statistic, so the choice is attributable
  rather than invented — which is the whole reason that document is cited here.

**The scalar is lossy and this is recorded rather than hidden.** Seven of the eight figures
Art. 9(1)(f) asks for cannot be carried by the contract as it stands, and a national filing
would need all four bands. The full four-band composition is written out in each vector's
`working`, and extending `Metrics.f` to carry the bands is the D-16 amendment recommended in
`01-07-SUMMARY.md`.

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

### Settled by re-derivation (plan 01-07): an unmapped row is RANKED but not COUNTED

Both passes agreed and both flagged the wording as not having settled it, so it is recorded.
The rule above fixes the sex breakdown but says nothing about the quartile ranking, and the
two are different questions.

**An unmapped row still occupies its place in the pay ranking that builds the quartile
bands**, because Art. 3(1)(f) divides *workers* into four equal groups by pay level and an
unmapped worker is still a worker. It is excluded only from the female and male counts.
Striking the row from the ranking as well would move other workers between bands with nothing
in the report to show why — the same silent distortion the exclusion rule exists to prevent,
one metric along.

It follows that `populationN` and the ranked headcount can differ. **`populationN` is the
sexed population — the workers the figure could actually report on** — with the unmapped rows
in `excludedN`. Reporting the ranked headcount would imply the female share has a denominator
that includes workers of no recorded sex.

**An unmapped value is not `other` or `undisclosed`.** Those `SexCode`s are for values an
employer's map deliberately assigns to them. A value the map does not mention at all is
unmapped, and the difference is the point of the warning.

### Settled by re-derivation (plan 01-07): a one-sex category is null, not unreliable

Both passes agreed. A category holding workers of one sex only reports `value: null` with
`W_CATEGORY_ALL_ONE_SEX`, and **`suppressed` and `unreliable` both stay `false`**. The metric
is not noisy and it is not withheld: it does not exist, because one of the two populations
being compared is empty. `unreliable` is documented as meaning the figure is *computable* but
too noisy to rely on, so setting it here would be a category error. Nor is this a division by
zero — the male denominator is well defined; it is the numerator that has no meaning. And the
value is never `0`, which would assert that women in that category are paid the same as men.

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

### Settled by re-derivation (plan 01-07): which components each metric runs over

Both passes independently read this the same way, but the wording admitted a second reading
and the two answers differ on nine of the ten vectors, so it is recorded rather than left to
luck.

- **Metrics (a), (c), (f) and (g) run over TOTAL pay** — every column mapped `basic` plus
  every column mapped `complementary_variable`, excluding only what is mapped `excluded`.
  Art. 3(1)(c) takes its meaning of "pay" from Art. 3(1)(a), which is the ordinary basic wage
  **and** any other consideration; and `METRIC_DEFINITIONS` restricts (b) and (d) to the
  components explicitly while leaving (a) and (c) unrestricted, an absence that is meaningful.
- **Metrics (b) and (d) run over the `complementary_variable` columns alone.**
- **Reading now rejected:** that (a)/(b) and (c)/(d) partition pay, so (a) covers the basic
  wage only. The sentence under `payBasis` saying Art. 9(1)(a)–(d) report the two sides
  "separately" describes that the components get their own metric positions, **not** that the
  headline gap excludes them. That sentence is the one that made the second reading available.
- Metrics (b) and (d) are computed over **all** workers, including those receiving no
  components at all. Excluding the zeros would answer metric (e)'s question instead of (b)'s.

### Settled by re-derivation (plan 01-07): what metric (e)'s single scalar denotes

Art. 9(1)(e) is the proportion of female **and** male workers receiving complementary or
variable components — two figures — while `Metrics.e` is a single `MetricValue` carrying one
scalar. The two passes read the scalar differently and disagreed on nine of the ten vectors.

- **Reading now rejected:** the overall proportion of workers receiving a component.
- **Reading now governing:** **the difference between the male and the female proportion, in
  PERCENTAGE POINTS**, positive meaning men are the more likely to receive components. Every
  other metric position in this report is a female-versus-male comparison expressed against
  the male figure, and a bare overall proportion would be the only figure in the report that
  is not a comparison — a consumer has no reason to expect that. The two per-sex proportions
  are written out in each vector's `working`.

**Known coverage gap, recorded rather than smoothed over.** Under this reading metric (e)
reads `0` in all ten vectors, because every vector gives both sexes the same access to
components. A metric position that never varies across the whole golden set is not specified
by it. An eleventh vector — a workforce in which only some workers receive components, split
unevenly by sex, and exercising the sign — is recommended in `01-07-SUMMARY.md`.

### Settled by re-derivation (plan 01-07): the scope of `W_COMPONENTS_ALL_ZERO`

Both passes agreed; the wording did not say so. The code attaches to metrics **(b) and (d)
only** — the ones whose percentage expression is degenerate, a difference of zero over a
denominator of zero. It does **not** attach to metric (e), whose zero in that case is an
ordinary, fully defined proportion. Marking (e) would suggest its zero is a value rescued by
a convention rather than a true one, which is the exact confusion the all-zero vector exists
to prevent. `EngineWarning` carries no metric field, so the affected positions are named in
the warning's `detail`.

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

### Settled by re-derivation (plan 01-07): what suppression actually does to a report

Both passes agreed on all three points below and both flagged that the wording did not state
them. Suppression is worth nothing if it is only a rendering hint, so the consequences are
recorded here rather than left to an exporter.

1. **A suppressed metric reports `value: null`.** A figure present in the JSON has been
   published to everyone who receives the JSON, so emitting it beside `suppressed: true`
   would make the suppression decorative. A figure that may not lawfully be shown is not a
   defensible value to emit.
2. **A suppressed category does NOT appear in `art10Flags`.** `Art10Flag.gapPct` is a plain
   number with no suppression flag of its own, so flagging the category would republish the
   withheld figure one field along. If an Art. 10(1) obligation genuinely survives
   suppression, the contract needs a way to say a category is over the trigger without saying
   by how much — a D-16 question written up in `01-07-SUMMARY.md`, not something a vector may
   settle silently.
3. **`unreliable` currently fires on the same small-group condition as suppression**, because
   no separate statistical threshold is recorded anywhere and there is nothing else to
   consult. This has an uncomfortable consequence, stated plainly: the two flags cannot differ
   in any vector in the current set, so the separation `MetricValue` insists on is asserted
   but never exercised by a case where one fires and the other does not. A reliability
   threshold of its own belongs in this document, and is recommended in the same write-up.

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
