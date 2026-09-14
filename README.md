# paytransparency — ask about your pay

A free, no-signup toolkit that lets an employee in the EU use their rights under the
Pay Transparency Directive (EU) 2023/970, and an open-source Directive engine underneath it.

**No salary data reaches a server.** Every calculation runs in your browser; nothing you type is
transmitted. (The full privacy proof — CSP, headers, and the egress test that enforces it — lands
with the web app.)

## The provenance model

**Every legal statement carries a source and a date, or it does not appear.**

Each legal fact in `packages/country-data` is an envelope, not a bare value: the value, the
official source URL it came from, the date it was verified, who verified it, and how
volatile it is. A value cannot exist in this dataset without the provenance that justifies
it — that is enforced at parse time, not by convention. A fact we do not know is `null`
with status `pending_verification`, and the site says "pending verification" rather than
offering a plausible guess; where the national basis is unconfirmed, a worker's letter
cites the Directive article itself, explicitly labelled as doing so.

The verifier that establishes all this **fails an accepted-but-empty response as loudly as a
not-found**. That is not a detail. During research, one EU-facing endpoint answered every
non-browser request with an accepted status and a zero-byte body — a naive checker would
have scored three different URLs as "verified" having read nothing at all. A verifier that
passes on an empty response is worse than no verifier, because it manufactures confidence.
So every strategy asserts a status, a minimum body size, and an expected anchor string found
**inside the cited provision's own subtree** rather than anywhere on the page.

## Contributing

`packages/country-data` is community-maintained by pull request, and deliberately slow to
merge. Start with **[CONTRIBUTING.md](CONTRIBUTING.md)**.

| You want to | Read |
|---|---|
| Add or correct a legal fact | [CONTRIBUTING.md](CONTRIBUTING.md) and [`packages/country-data/proposed/README.md`](packages/country-data/proposed/README.md) |
| Report a legal fact that is wrong | [REPORTING-LEGAL-ERRORS.md](REPORTING-LEGAL-ERRORS.md) |
| Report a security vulnerability | [SECURITY.md](SECURITY.md) |
| See how corrections have been handled | [CHANGELOG-legal.md](CHANGELOG-legal.md) |
| See that the gates actually reject | [docs/BAD-PR-DRILL.md](docs/BAD-PR-DRILL.md) |

Contributions land in `proposed/` and a maintainer promotes them into the live dataset.
You get a merged pull request; merging alone cannot make the site more confident. Only a
maintainer who has opened the source and read the provision can do that.

## Licensing

| Path | Licence |
|------|---------|
| Repository root and `apps/**` | `AGPL-3.0-only` |
| `packages/country-data` | `AGPL-3.0-only` |
| `packages/directive-engine` | `MIT` (declared per-package) |

The engine is MIT so it can be adopted freely; the web app is AGPL so hosted clones stay open.

## What this project does not do

It reports what the law says and assembles the words you chose. **It does not assess your
situation**, does not tell you whether you are underpaid, and does not check whether your
employer is complying. It is not legal advice and it is not a substitute for it. Your
national equality body, a trade union, a worker representative or a qualified lawyer can
advise you.

## Status

Pre-release. The project is named **`paytransparency`**, after the Directive it implements.

The name was chosen deliberately over alternatives that editorialise. `fairpay` and
`equalpay` assert a verdict; this project reports what the law provides and never evaluates
anyone's situation, so a name that takes a position would contradict the first page of
[CONTRIBUTING.md](CONTRIBUTING.md). `paytransparency` also survives the locale roadmap —
PL, SK, IT, LT, then DE, NL, CS, SV, DA — without asking a reader to parse an English idiom.
