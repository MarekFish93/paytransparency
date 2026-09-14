# Reporting a legal error

**If something on this site or in this dataset states the law wrongly, tell us. You do not
need to be a lawyer, you do not need a GitHub account, and you do not need to be sure.**

This is the most important page in the repository. A wrong statute here becomes a letter a
worker has already sent to their employer, and there is no recovery path for that as cheap
as fixing it fast.

## How to report

Whichever is least friction for you. They all reach the same place.

| Route | Use it when |
|---|---|
| **[Report a legal error](https://github.com/MarekFish93/paytransparency/issues/new?template=legal-error.yml)** — a short form | Default route. It asks for the country, what it says now, what it should say, and your source. Only the first question is required. |
| **[Private security advisory](https://github.com/MarekFish93/paytransparency/security/advisories/new)** | You would rather the report not be public while it is assessed. |
| **Open a pull request** | You already know the correct answer and the official source. See [CONTRIBUTING.md](CONTRIBUTING.md). |

A report in two sentences with no citation is worth far more to us than a report you never
sent because you were not certain. **Report it and let us check.**

> **A gap we have not closed, stated rather than papered over.**
> All three routes above need a GitHub account. If you have no account **and** you want your
> report kept private, this project does not serve you today. We are not going to list an
> email address that does not exist to imply otherwise. A project alias is the intended fix
> and is not in place yet; until it is, the honest answer is that this gap is real. If it is
> blocking you, open a public issue with as little detail as you are comfortable giving and
> say that you would rather continue privately — a maintainer will find a way.

## Response target

| Stage | Target |
|---|---|
| Acknowledgement that we have read it | **2 working days** |
| An assessment: confirmed, not confirmed, or still checking | **5 working days** |
| If confirmed AND the fact is currently shown to users | **Corrected or suppressed within 24 hours of confirmation** |
| A dated entry in [`CHANGELOG-legal.md`](CHANGELOG-legal.md) | With the fix, always |

These are targets, not contractual commitments. They are published so that you can see when
we have missed one.

**While a report is being assessed, the disputed fact is suppressed rather than shown.**
The site is built to say "pending verification" gracefully; a fact under live dispute is
better shown as unknown than shown as confident.

## What to include

Only the first line is essential.

1. **Which country and which field** — for example, "Poland, the response deadline" or just
   "the Malta page, the bit about the equality body".
2. **What it says now**, and what you believe it should say.
3. **Where you got that from** — a link to the official journal, the parliament, the
   ministry or the equality body, if you have one. If you only know "I'm a lawyer in
   Slovakia and that act was repealed", that is still useful; say so.
4. **Whether anything is currently relying on it** — most urgently, whether the wrong fact
   appears in a letter someone might send today.

If you would rather not be named, say so and we will record the correction without
attributing it.

## What happens next

1. **Acknowledged.** You get a reply saying we have it.
2. **Assessed.** A maintainer opens the official source and reads the provision. This is a
   human step by design: a domain allowlist and an anchor assertion cannot tell the right
   domain citing the wrong article from the right domain citing the right one.
3. **Suppressed, if it is live.** If the disputed fact is currently shown to users, it is
   set back to `pending_verification` first and corrected second. Being briefly silent is
   better than being confidently wrong.
4. **Corrected**, with the source and the date, and `verified_by` naming the person who
   read it.
5. **Logged**, publicly, in [`CHANGELOG-legal.md`](CHANGELOG-legal.md): what was wrong, when
   it was fixed, and who reported it.

## Rollback procedure

This is what a maintainer does when a wrong fact is already live. It is written down so it
can be followed at 23:00 by someone who is not thinking clearly.

**Target: a wrong live fact is off the site within 60 minutes of confirmation. The correct
value can follow at whatever pace the evidence requires.**

1. **Identify the commit.**
   `git log --oneline -- packages/country-data/data/<CC>.json`
2. **Revert it.** `git revert <sha>` — a revert, never a force-push. The wrong value stays
   in the history where it can be audited; it is the *current* value that must change.
3. **If the previous value was also wrong, or there is no good previous value: suppress
   rather than restore.** Set the field to `status: "pending_verification"`, `value: null`,
   `verified_by: null` and add a `note_key` explaining that it is under correction. The
   country page then reads "pending verification" and the letter falls back to citing the
   Directive article itself. This is the designed degraded state — use it.
4. **Run the gates.** `pnpm validate:country-data && pnpm vitest run`.
5. **Merge and redeploy.** Normal review still applies; a rollback is not a bypass. If you
   are the only maintainer awake, merge it and have it reviewed retrospectively — and say
   in the pull request that that is what happened.
6. **Write the changelog entry the same day.** Not "when things calm down". The entry is
   part of the fix, not paperwork after it.
7. **Reply to the reporter** telling them what changed.

**What not to do:** do not force-push, do not amend history, do not delete the issue, and
do not quietly correct the value without a changelog entry. An error that is publicly
logged costs a little credibility once. An error that is found to have been quietly
corrected costs all of it, permanently.

## What this file is not for

- **Security vulnerabilities** -> [`SECURITY.md`](SECURITY.md).
- **"Is my employer breaking the law?"** -> We cannot answer that, and it is not a question
  this project is able to take. This project reports what the law says and assembles the
  words you chose; it does not assess anyone's situation. Your national equality body,
  a trade union, a worker representative or a qualified lawyer can advise you. The country
  pages name the equality body for each state.
