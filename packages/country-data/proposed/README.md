# `proposed/` — the maintainer-promotion queue

**A contribution lands here. A maintainer promotes it into `data/`. Promotion is the only
act that can set a `verified` status.**

That is not a review convention; it is a lint rule. Rule **L9** fails any file in this
directory carrying a fact with `status: "verified"`, with a message saying that promotion
is a maintainer action. So a contributor gets a merged pull request — real, attributed, in
the history — and **merging alone cannot make the site more confident**. Only a maintainer
who has opened the source and read the provision can do that, and when they do, the record
names them.

This directory has **exactly the same CI profile** as `data/`: same schema, same allowlist,
same anchor assertion, same freshness gate. It is not a weaker lane. It simply cannot
produce a `verified` status.

## What a proposal file contains

A proposal file is a **draft of a record, not a copy of the live one**. It has the same
shape as a country record, plus a required `proposals` array. Everything in it is
unverified — including `transposition.status`, which is asserted in `data/<CC>.json` and
not here.

Each entry in `proposals` carries:

| Field | What it is |
|---|---|
| `field` | The dotted path being proposed, e.g. `article_7.legal_basis` |
| `proposed_value` | The draft value. **A draft, never a fact.** The record's own field stays `pending_verification` with `value: null` until promotion. |
| `candidates` | Where the register does not settle which instrument is the vehicle, every measure it could be — each with its CELEX id, title and a note key |
| `rationale_key` | An i18n key explaining the reasoning. Not prose. |
| `verification_strategy` | How the NATIONAL instrument must be checked. One of the five below. |
| `national_register_host` | The domain a maintainer must go to, or `null` where the register supplied no national link |
| `sources` | At least one. A proposal with no source cannot exist. |
| `drafted_by` / `drafted_at` | Who drafted it and when. A proposal has `drafted_by`; it never has `verified_by`. |
| `status` | Always `awaiting_maintainer_promotion` |

**No deep national URL is ever invented.** Where the register supplied no national link,
the proposal cites only the register record and names the domain a maintainer must visit.
A plausible-looking URL that nobody has opened is worse than no URL, because it looks
checked.

## The five verification strategies, and when each applies

There is no single retrieval that can verify every legal source, and pretending otherwise
is how a verifier ends up green on bytes it never read. Research probed eleven national
registers and found four materially different response shapes — plus one shape that cannot
be verified by retrieval at all.

| Strategy | Byte floor | Asserts the operative wording? | When it applies |
|---|---|---|---|
| **`cellar`** | 100,000 | **Yes** | `publications.europa.eu`. Serves the Official Journal XHTML with the publisher's own subdivision ids, so the anchor is asserted **inside the cited article's subtree** and the language is confirmed from the article subtitle — the response carries an empty `Content-Language` header, so nothing else identifies the language. |
| **`html-anchor`** | 20,000 | **Yes** | Registers that render the statute text server-side: `dziennikustaw.gov.pl`, `normattiva.it`, `gazzettaufficiale.it`. The operative wording is in the response, so a normalised anchor over the body is real evidence. |
| **`jsonld`** | 5,000 | No | `legislation.mt`. The landing page carries a schema.org `Legislation` block with the ELI identifier but **not** the statute body — "two months", "equality body" and "National Commission" were all probed and all absent. Asserting the wording here would fail a perfectly good source; asserting the ELI identifier succeeds and is what that page actually serves. |
| **`metadata-only`** | 5,000 | No | A landing page that links a PDF. It can prove the instrument exists and is titled what the citation says; it cannot prove the wording. The result **records that gap** rather than implying a check that never happened. |
| **`manual-attest`** | — | No | The registers that defeat retrieval entirely. **No request is made at all.** A dated human attestation records the absence of machine verification. |

`manual-attest` is a first-class peer, not an escape hatch. A green produced by a request
that never saw the statute is a lie; a recorded "a human read this on this date" is not.

## The two launch countries that require a dated human attestation

**Slovakia (`slov-lex.sk`) and Lithuania (`e-tar.lt`).** Both launch countries, both
`manual-attest`, and both for a concrete, measured reason:

- **`slov-lex.sk`** answers 200 with a **1,354-byte client-rendered shell** whose first tag
  is a tag-manager script. The statute text is never in the HTTP response. A naive checker
  sees a 200 and a body and scores it verified.
- **`e-tar.lt`** answers **403 with a challenge interstitial**. There is no body to assert
  against at all.

For these two, a maintainer opens the register in a browser, reads the provision, and
records `verified_by` with the date. That is the honest record. Lowering a byte floor or
broadening an anchor to make either of these go green would be turning a real gate into a
decorative one — and the byte floors live in exactly one file
(`src/source-strategy.ts`) precisely so that doing it is a single visible diff.

The other three launch countries at the time of writing: **Italy** (`html-anchor`,
`gazzettaufficiale.it`), **Poland** (`html-anchor`, `dziennikustaw.gov.pl`) and **Malta**
(`jsonld`, `legislation.mt`).

## Promoting a proposal — the exact steps

This is a maintainer action. Follow it in order; step 3 is the one that cannot be delegated
to CI.

1. **Read the proposal.** Open `packages/country-data/proposed/<CC>.json` and read the
   `proposals` entry: the candidate CELEX id, the title, the journal reference, and the
   sources cited.
2. **Follow the source.** Where a national link is present, follow it. Where it is not, go
   to the `national_register_host` named in the proposal and locate the instrument by its
   title and journal reference.
3. **Read the provision and satisfy yourself it is the Article 7 transposition vehicle.**
   Not a consolidated republication. Not a pre-existing act the state considers already
   compliant. Not an amending act that touches a neighbouring article.

   **This step is why the whole flow exists.** A domain allowlist plus an anchor assertion
   cannot distinguish the right domain citing the wrong article, and a hallucinated statute
   in a sent letter has no recovery path. Nothing automated can replace it.
4. **Write the value into `data/<CC>.json`** — not into the proposal file. Set:
   - `value` to the confirmed value,
   - `status` to `verified`,
   - `sources` to the source you actually opened, with its `verification` strategy, its
     `anchor`, and for a `cellar` source its `scope.id`,
   - `verified_at` to today,
   - **`verified_by` to the confirming identifier** — your own name or handle. For a launch
     country's legally-operative field the schema **requires** this and rejects the record
     without it. That is the D-06 gate: an agent proposes, a human confirms, and the record
     says which human.
5. **Remove the promoted entry from the proposal file**, or delete the file if it was its
   last entry. A proposal that has been promoted and left in place will be promoted twice.
6. **Run the gates.** `pnpm validate:country-data && pnpm verify:sources && pnpm vitest run`.
7. **Open the promotion as its own pull request**, separate from the contributor's. A
   status or deadline change needs two people, one of whom is a maintainer, and there is no
   trusted-contributor carve-out on that rule.

## Why contributions are additive by default

Because the alternative is that the fastest path to changing what a worker cites runs
through a stranger's pull request on a Friday afternoon. This flow deliberately makes the
contribution easy and the *confidence* hard, and it keeps those two things in different
commits authored by different people.

See [`../../../CONTRIBUTING.md`](../../../CONTRIBUTING.md) for the contributor-facing half.
