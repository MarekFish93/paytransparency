# Security Policy

## Reporting a vulnerability

Report security vulnerabilities through
**[GitHub Security Advisories](https://github.com/MarekFish93/paytransparency/security/advisories/new)**.
That channel is private until an advisory is published.

Please do **not** open a public issue for a vulnerability.

**Response target:** an acknowledgement within **3 working days**, and an assessment with a
planned fix or an explanation of why it is not a vulnerability within **14 days**.

Include, as far as you can: what you did, what happened, what you expected, and the
smallest reproduction you have. If you are unsure whether something counts, report it —
triage is cheap and a missed report is not.

## Reporting a LEGAL error — different file, different channel

**A wrong statute is not a security vulnerability, and it must not be reported here.**

It is a different failure with a different severity, a different fix and a different
audience. Routing it through a private security advisory would be actively harmful: the
whole point of our handling is that a legal correction is **published**, in a dated public
log, so that anyone who relied on the wrong fact can see that it changed and when.

If you have found a legal fact that is wrong, out of date, cited to the wrong provision, or
based on a draft that never passed, go to
**[REPORTING-LEGAL-ERRORS.md](REPORTING-LEGAL-ERRORS.md)**.

## What this project's attack surface actually is

Worth stating, because it is smaller and stranger than most:

- **There is no server that holds user data.** No account, no database, no session. Every
  calculation runs in the visitor's browser. A salary figure a user types is never
  transmitted.
- **There are no secrets in this repository, and there never will be.** The primary legal
  source — the Publications Office Cellar API — requires no key. If you believe you have
  found a credential in this repository or its history, that is a genuine finding and we
  want to hear about it immediately.
- **The highest-value target is the legal dataset, not the code.** An attacker who could
  land a plausible-looking wrong statute in `packages/country-data` would cause more harm
  than one who defaced the site, because the artefact — a letter — leaves the site and
  cannot be recalled. That is why the gates in
  [`CONTRIBUTING.md`](CONTRIBUTING.md) are as strict as they are, and why every one of
  them was proved to reject a deliberately bad pull request before this repository was made
  public. See [`docs/BAD-PR-DRILL.md`](docs/BAD-PR-DRILL.md).
- **A hostile `source_url` is a real threat.** A pull request could try to make a CI runner
  connect to an attacker-chosen host. Every URL is checked against a per-country allowlist
  before any request is issued and again on every redirect hop; the pull-request profile
  retrieves nothing at all.

## Supported versions

Pre-release. The default branch is the only supported version.
