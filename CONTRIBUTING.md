# Contributing

Thank you for wanting to help. Please read this before you open a pull request — it will
save you rework, and it explains why this repository is slower and stricter than most.

## The posture, stated plainly

The downstream artefact of this project is **a letter a worker sends to their own
employer**. That act is irreversible and, in a small team, self-identifying. If the legal
basis in that letter is wrong, the letter has already been sent by the time anyone notices.

So this repository is modelled on the [Public Suffix List][psl] rather than on a typical
application repo: a community-maintained data file with real downstream safety
consequences. That means validation records, evidence, verbose rationale, strict
formatting, maintainer review — and **no guaranteed inclusion timeline**.

A non-conforming patch sits indefinitely rather than being merged to be nice.
**Slow merges are a feature.** If your pull request has been open for a while and CI is
green, it is not lost; it is waiting for a human to open your source and read it.

[psl]: https://github.com/publicsuffix/list/blob/master/CONTRIBUTING.md

## What this project does and does not do

This matters for contributions, not just for the website, because the rule is enforced in
review on every document and every string in the repository.

**The project reports facts and assembles the user's own words. It never evaluates an
individual case.**

Allowed:

> "In Poland, the law provides X. Source: {url}, as recorded on {date}."
> "Workers who want to escalate can contact {body}."

Not allowed, anywhere — in data, in a letter template, in the README, in a comment:

> "You are being underpaid."
> "Your employer is in breach."
> "You have a claim worth X."
> "You should file with {equality body}."

If a pull request introduces a conditional whose predicate is a **legal characterisation of
the user's facts** rather than a country code or a user's own selection, it will be asked
to change. Nothing in this repository may state or imply that the project gives legal
advice.

## The two-directory flow

This is the part most people are surprised by, so it is worth being direct about it.

```
packages/country-data/proposed/   <-- your contribution lands here
packages/country-data/data/       <-- a maintainer promotes it to here
```

**Contributions land in `proposed/`.** A maintainer then promotes them into the live
dataset in a separate, maintainer-authored commit.

**Promotion is the only act that can set a `verified` status.** This is enforced by a lint
rule (L9), not by review discipline: any file under `proposed/` carrying a fact with
`status: "verified"` fails CI, with a message saying so.

The consequence is deliberate and it is the point:

> **You get a merged pull request. Merging alone cannot make the site more confident.**

Your contribution is real, it is attributed, and it is in the history. What it cannot do is
raise the confidence the site expresses to a worker — only a maintainer who has opened your
source and read the provision can do that, and when they do, the record names them in
`verified_by`.

`proposed/` has **exactly the same CI profile** as `data/`. It is not a weaker lane: same
schema, same allowlist, same anchor assertion, same freshness gate. It simply cannot
produce a `verified` status.

See [`packages/country-data/proposed/README.md`](packages/country-data/proposed/README.md)
for what a proposal file contains and the exact steps a maintainer follows to promote one.

## Before you open a pull request

```bash
corepack enable
pnpm install --frozen-lockfile

pnpm validate:country-data      # schema parse, policy lint L1-L9, referential pass
pnpm verify:sources             # dispatch every committed source through the verifier
pnpm vitest run                 # the full offline suite
pnpm typecheck
```

All four are offline. None of them retrieves a legal source, so none of them can go red
because a third party had an outage.

## What CI will check, and why each gate exists

| Rule | What it rejects | Why |
|---|---|---|
| **L1** | Not exactly 27 files; a filename that disagrees with the record's own `country.code` | A copied file with an un-edited code serves one state's law on another's page |
| **L2** | A `verified` fact with no source, no date, or a future date | A date is a control, not a decoration |
| **L3** | A `pending_verification` fact holding a value | Unknown is `null` — never a plausible guess |
| **L4** | A statute, journal or directive reference that is not inside a verified, sourced fact | Makes an invented citation *inexpressible*, not merely discouraged |
| **L5** | A source URL that is not https, carries tracking parameters, or is not on that country's allowlist | The single highest-leverage gate |
| **L6** | *(nightly only)* A source that no longer resolves | A contributor's pull request must never be red because someone else had an outage |
| **L7** | A country whose law we state but for which no letter template exists | A country whose law we state is a country a worker can write to |
| **L8** | A launch country's legally-operative fact past its freshness window | Everything else warns and degrades in the UI instead |
| **L9** | A `verified` fact inside `proposed/` | Promotion is a maintainer act, structurally |
| **BUMP** | A `verified_at` that advanced while its value stood still | A date that moves without a value moving is provenance theatre |

Plus a cross-artefact referential pass: every Directive fallback citation key must name an
entry that actually exists in the stored corpus, in **every** language the corpus holds.

### The allowlist, and one host that is deliberately not on it

`source_url` must be on the allowlist for that country — the official journal, the
parliament, the ministry, the equality body, or the EU institution set. A pull request
citing a law-firm blog fails CI with a message naming the host.

**`eur-lex.europa.eu` is deliberately excluded.** It answers a non-browser request with an
accepted status and a zero-byte body, so a source pointing at it can never be
machine-verified — the verifier would be reporting green for bytes it never read. Cite
`publications.europa.eu` instead, which serves the authentic Official Journal text.

To propose a host be added to the allowlist, open an issue rather than a pull request, and
say what it is, who operates it, and which provision you want to cite from it.

## Review rules

- **Every path in the legal dataset has a code owner with required review.** See
  [`.github/CODEOWNERS`](.github/CODEOWNERS).
- **No path in the legal dataset may be merged by automation alone.** Auto-merge is
  disabled and there is no bot-approval route.
- **A change to a transposition `status` or to a statutory deadline needs two people**, one
  of whom must be a maintainer. There is **no trusted-contributor carve-out** on this rule.
  A frequent contributor is exactly the person whose pull request gets skimmed.
- Cosmetic fields — an equality body's phone number, a title's capitalisation — need one
  reviewer.

## Reporting problems

| You found | Go to |
|---|---|
| A legal fact that is wrong, out of date, or cited to the wrong provision | [`REPORTING-LEGAL-ERRORS.md`](REPORTING-LEGAL-ERRORS.md) |
| A security vulnerability | [`SECURITY.md`](SECURITY.md) |
| A bug, or a feature idea | GitHub issues |

Every correction to a legal fact is written up in
[`CHANGELOG-legal.md`](CHANGELOG-legal.md) with a date, what was wrong, and who reported
it. If you report one, you will be credited there unless you ask not to be.

## Licensing

| Path | Licence |
|---|---|
| Repository root and `apps/**` | `AGPL-3.0-only` |
| `packages/country-data` | `AGPL-3.0-only` |
| `packages/directive-engine` | `MIT` (declared per-package) |

By contributing you agree your contribution is licensed under the licence that governs the
path you changed.
