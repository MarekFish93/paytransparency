# The Polish unauthorised-practice gate

**Status:** OPEN — blocking
**Blocks:** the Polish-language letter (Phase 5)
**Owner:** Marek Rybka (@MarekFish93)
**Opened:** 2026-09-14
**Review by:** 2026-12-01, and in any case before Phase 5 begins
**Confidence in the current position:** **LOW**

This file records a question. It deliberately does **not** answer it. Decision D-08 placed
the answer outside this phase's scope because it is an external, paid, calendar-bound
dependency, and because the copy it constrains does not exist until Phase 5.

Writing the question down — with an owner, a date and an honest confidence marker — is the
deliverable. An answer is not.

---

## The question that needs a Polish-qualified answer

> Does a free, no-signup web tool that (a) states what Polish law provides on pay
> transparency, citing the official source and the date it was verified, (b) assembles a
> letter in Polish from information the user typed, for the user to send to their own
> employer, and (c) is operated by a commercial entity that also sells a related paid
> service to employers — require any licence, or breach any restriction, under Polish law?

Four sub-questions, each of which could be answered differently:

1. **Unauthorised practice.** Is any of the above a reserved activity?
2. **Protected titles.** What may the tool call itself without implying it is an *adwokat*
   or a *radca prawny*? Does a Polish-language phrase like *"pomoc prawna"* or
   *"informacja prawna"* carry an implication that *"legal information"* does not?
3. **Consumer and unfair commercial practices.** The worker-facing side is free and funnels
   to a paid employer-facing service. What must the Polish copy disclose, and where, for
   that relationship not to be a misleading commercial practice?
4. **Wording.** What exact Polish disclaimer wording discharges the above? A translated
   English disclaimer is not an answer to this.

---

## The current position, and why its confidence is LOW

Recorded exactly as it stands. **It is search-derived and has not been checked by anyone
qualified in Polish law.** It is written here so that it can be challenged, not relied on.

**Poland is the opposite shape to Germany.**

- **Out-of-court legal advice is not a reserved activity in Poland.** Commercial provision
  of legal information and the preparation of simple documents does not require a licence;
  *doradcy prawni* operate on general freedom-of-business grounds.
  *Confidence: LOW. Source: Polish legal-practice commentary, secondary.*
- **The practitioner titles are protected.** The tool may not call itself, or imply it is,
  an *adwokat* or a *radca prawny*.
  *Confidence: LOW. Secondary.*
- **Court representation is separately restricted** (art. 87 k.p.c.). The project does not
  represent anyone before a court, so this is not expected to bite — but it is recorded
  because "not expected to bite" is a conclusion somebody should check rather than assume.
  *Confidence: LOW. Secondary.*

**The sharper Polish exposure is consumer and unfair-commercial-practices, not
unauthorised practice.** A free tool that overstates what it does is a misleading
commercial practice regardless of whether any legal-services licence is engaged — and this
project funnels to a paid service. That makes the *framing* of the Polish copy, and the
disclosure of the commercial relationship, the thing most likely to be wrong.
*Confidence: LOW.*

**Why the confidence is recorded as LOW and must not be softened.** Every line above came
from a web search, not from a Polish-qualified lawyer. The whole architecture of this
project treats a search-derived legal claim as `pending_verification` rather than as a
finding; applying a weaker standard to the project's own legal exposure than to a worker's
country page would be incoherent. If a future edit to this file raises the confidence
marker without citing a Polish-qualified opinion, that edit is the bug.

---

## Contrast: why Germany is the binding constraint elsewhere, and why that does not settle Poland

Recorded here only to prevent a plausible-looking cross-application.

The German test — § 2(1) RDG — has two cumulative elements: a **concrete third-party
matter** and a **legal examination of the individual case**. The favourable precedent (BGH,
9 September 2021, I ZR 113/20, the *smartlaw* contract generator) held that a document
generator driven by a user's own form answers is not an unauthorised legal service.

That precedent is **German, narrow, and not authority for anything in Poland.** It is noted
because it shapes the product's design rule, not because it answers this gate.

---

## The design rule that holds in the meantime

This applies now, in every jurisdiction, and is not waiting on this gate:

**The product reports facts and assembles the user's own words. It never evaluates an
individual case.**

Banned output shapes: "you are being underpaid", "your employer is in breach", "you have a
claim worth X", "you should file with {equality body}", and any conditional branch whose
predicate is a legal characterisation of the user's facts.

Allowed: "In {country}, the law provides {X}. Source: {url}, as recorded on {date}." /
"Workers who want to escalate can contact {body}."

Holding that line is what keeps this gate a question about *wording* rather than a question
about *whether the product is lawful*.

---

## What ships only once this gate is cleared

**The Polish-language letter.** Concretely, blocked until cleared:

- the `pl` letter template in `packages/letters`, and every artefact it produces — the
  `.txt`, the `.pdf`, the `.docx`, the `mailto:` body and the `.ics` description;
- the Polish disclaimer wording, in all four placements (adjacent to the primary call to
  action above the fold on a 375 px viewport; inside every generated artefact; on the
  country page beside the legal-basis block; and in the package description);
- any Polish marketing copy describing what the tool does.

**Not blocked** — these ship regardless, because they are not the Polish letter:

- the English letter, including for a Polish worker. D-07's Directive-fallback path means a
  worker in a country with no verified national basis gets a correctly cited,
  explicitly-labelled Directive citation in English.
- the Polish *country page* stating what the law provides with its source and date. That is
  reporting a fact, which is the safe-harbour shape in every jurisdiction surveyed.

---

## What clearing it requires

1. A written opinion from a Polish-qualified lawyer (*radca prawny* or *adwokat*) answering
   the four sub-questions above.
2. The **exact Polish disclaimer wording** that opinion endorses — not a translation of the
   English one.
3. Whatever the opinion says about disclosing the commercial relationship between the free
   worker-facing tool and the paid employer-facing service.

When that exists: replace the position section above with the opinion's conclusions, change
the confidence marker, cite the opinion and its date, set **Status: CLEARED**, and record
the change in [`../CHANGELOG-legal.md`](../CHANGELOG-legal.md).

**Until then this gate stays OPEN, and the Polish letter does not ship.** Not "ships with a
stronger disclaimer". Does not ship.

---

## A note on what this file is not

This file does not give legal advice, to anybody, about anything. It is an internal record
of a question this project has not answered, kept in public because a tracked unknown is
more honest than an untracked risk.
