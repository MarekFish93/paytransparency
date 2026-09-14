# The bad-pull-request drill

**Five deliberately defective pull requests were driven through this repository's gates
before it was made public. All five were rejected by CI. None was merged.**

This document is the evidence. Until a gate has been *seen* to reject, "the gates work" is
an assertion, and an assertion is not what this project can offer a worker who is about to
send a letter to their employer citing a law.

The drill was run on **2026-09-14**, while the repository was still private. Each pull
request carried exactly one defect so the rejection would be attributable to a single rule.
Each was closed without merging, with no bypass, no admin override and no auto-merge.

## Read this before you read the evidence

**The five pull requests and their CI runs are not in this repository, and you cannot
verify them yourself.** That is a real limitation, and it would be dishonest for a document
about gate integrity to gloss it.

Here is what happened. The drill ran in the repository that became this one's private
archive. Before publication, a sweep of the full history found that an earlier commit
published a personal email address as a contact route. The branch was rewritten to remove
it — but a rewrite is not sufficient once a pull request has existed against the
contaminated commit: GitHub retains `refs/pull/N/head` independently of the branch, those
refs survive both branch deletion and history rewriting, and on a public repository anyone
can fetch them. Deleting the branches would not have helped, and a closed pull request
cannot be deleted through the API.

So the clean history was pushed to a **new** repository — this one — and the original was
kept **private** as the archive. The five pull requests, their workflow runs and their logs
live there. They are intact; they are not public.

**What this means for you as a reader:** the quoted failure output below is transcribed
from those runs, and you are taking our word for the transcription. What you *can* verify
independently, right now, in this repository, is everything the transcription is about:

```bash
pnpm install --frozen-lockfile
pnpm vitest run packages/country-data/test/lint.test.ts   # 37 cases: L1-L9, BUMP, determinism
pnpm validate:country-data                                 # every rule identifier, on the real tree
pnpm verify:sources                                        # every committed source, offline
```

Every rule quoted below is exercised by that suite against committed fixtures — including
the recital decoy that case 5 turned red. If you want to re-run the drill itself, the
defects are described precisely enough to reconstruct all five in a fork, and doing so is a
better check on us than trusting this page.

We would rather publish an evidence document with a stated hole in it than one that implies
a verifiability it does not have.

| # | Defect | Expected rejecter | Actual rejecter |
|---|---|---|---|
| 1 | A fabricated statute number in an unsourced fact | L4 anti-hallucination | **L4** — as expected (2 findings) |
| 2 | A source on a non-allowlisted domain | L5 url hygiene | **L5** — as expected |
| 3 | A source URL returning an accepted-but-empty response | verifier data defect | **verifier** — `anti_automation_gate` |
| 4 | A silent date change disguised as a typo fix | freshness-gate + unchanged-bump | **unchanged-bump only** — see the finding |
| 5 | A correct, allowlisted, live source cited for the wrong provision | subtree-scoped anchor assertion | **subtree-scoped anchor assertion** — `anchor_absent` |

---

## Case 1 — a fabricated statute number

**Defect.** Added to Croatia (a non-launch country) an `article_7.legal_basis` naming an
instrument that does not exist — `journal_ref: "NN 147/2026"`, `article: "Art. 23.a"` —
inside a fact with `status: "directive_default"` carrying **no source**. Titled as an
ordinary data contribution.

**Expected:** the anti-hallucination rule, in `schema-and-lint`.

**Actual:** exactly that. Two findings, one per fabricated string:

```
L4   FAIL   a statute or journal reference must be evidenced (2 error, 0 warning)

x [L4] data/HR.json.article_7.legal_basis.value.journal_ref reads "NN 147/2026", which
  matches year-and-number law reference, but it sits inside the unsourced
  "directive_default" fact at .article_7.legal_basis. A statute, journal or directive
  reference must sit inside a verified fact carrying at least one source — an unsourced
  citation is inexpressible here, not merely discouraged
x [L4] data/HR.json.article_7.legal_basis.value.article reads "Art. 23.a", ...
```

**Reading it as a first-time contributor.** The message names the file, the exact field, the
offending string, which pattern matched, and what to do instead. It does not merely say
"validation failed".

---

## Case 2 — a source on a non-allowlisted domain

**Defect.** Added a Lexology commentary article as a source for Slovenia's transposition
status. Lexology is on neither Slovenia's register list nor the all-countries EU set.

**Expected:** the url-hygiene rule, raising an allowlist violation naming the host and the
country.

**Actual:** exactly that.

```
L5   FAIL   url hygiene — https, no tracking, allowlisted host (1 error, 0 warning)

x [L5] data/SI.json#.transposition.status.sources[1] — refusing to fetch www.lexology.com
  — it is on neither the all-countries set nor the "SI" register list for country "SI":
  host_not_allowlisted
```

**A correction made during the drill, recorded rather than hidden.** The first attempt used
`kind: "commentary"`, which is not a valid `SourceKind`, so schema parse *also* failed and
the pull request was rejected by two layers rather than one. That made the case less
informative, not more: it left open whether L5 alone has teeth. The case was corrected to
`kind: "law_firm"` — a *valid* kind — and re-run. The second run reports
`FAILED — 1 error, 0 warning, 0 schema issue`: the record parses perfectly, and the
allowlist rule alone refuses it. That is the stronger claim, and it is the one now evidenced.

---

## Case 3 — a source URL returning an accepted-but-empty response

**Defect.** Cited the EUR-Lex web front end on the Estonian record. Because that host is
deliberately absent from the allowlist, the pull request *also* widened
`data/_allowlist.json` to admit it — which is precisely what a contributor does when a gate
blocks them and they believe the gate is the problem.

**Expected:** a data-defect disposition from the verifier, stating that the source sits
behind an anti-automation gate and cannot be verified by retrieval.

**Actual:** exactly that — and note that `L5` reported **ok**, because the allowlist had
been widened. The allowlist did not save us here; the verifier did.

```
L5   ok     url hygiene — https, no tracking, allowlisted host

[anti_automation_gate] 202 with a 0-byte body from
https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32023L0970 — an
accepted-but-empty response is an anti-automation gate, not an outage: res.ok is true for
202 and retrying will never succeed. This source cannot be verified by fetch; use
"manual-attest" ...

FAILED — 1 data defect
```

**Why this case is deterministic.** The response is the **captured** 202/zero-byte envelope
in `packages/country-data/test/fixtures/eurlex-frontend-202-empty.txt`, registered by host,
not a live request. The case therefore does not depend on a third party continuing to
misbehave, and the pull-request profile stays entirely offline.

**This gate was armed during this task.** Before the fix, a source on a host with no
committed fixture reported `queued (not exercised)` — honest, but green. A contributor who
widened the allowlist would have got a pass. See "Gates that were inert" below.

---

## Case 4 — a silent date change disguised as a typo fix

**Defect.** Advanced `transposition.status.verified_at` on Poland — a launch country — from
`2026-09-11` to `2026-09-12`, leaving the value untouched, under the commit message
*"correct a typo in the PL transposition verification date"*.

**Expected:** the `freshness-gate` job **and** the unchanged-bump rule.

**Actual — and this is a finding, not a match:**

```
BUMP FAIL   a date cannot move without a value moving (1 error, 0 warning)
x [BUMP] data/PL.json: verified_at bumped without a value change:
    - transposition.status moved verified_at from 2026-09-11 to 2026-09-12 while its
      value did not change — a date that moves without a value moving is provenance theatre

freshness-gate   success
```

**The `freshness-gate` job passed, and it was right to.** That job hard-fails only a launch
country's legally-operative fact that is past its TTL. A date moving *forward* makes a fact
fresher, not staler, so freshness has nothing to say about it. The plan's expectation that
both would fire was wrong about the mechanism; the defect is caught, by exactly one rule,
and the expectation is recorded here as stated rather than edited to match the result.

**The specified variant could not be built, and why that matters.** The plan's case 4 was to
change a launch country's response deadline "from the two-month value to a shorter period".
**There is no such value to change.** Every launch country's `article_7.response_deadline` is
still `pending_verification` with `value: null`, because D-06 reserves promotion to a human
who has read the source, and that promotion has not happened. Attempting the literal variant
would have been caught by **L3** (a pending fact may not hold a value) — a real rejection,
but of a different defect. The date-bump variant was used instead because it exercises the
rule the plan actually names, on a launch country, against the one verified fact that exists.

**The worker-visible consequence — the measurement the drill was asked to take.** The diff
for this pull request is a **single character** in a JSON date. Nothing in it shows what a
worker would see. A reviewer skimming a one-character change described as a typo fix would
very likely approve it, and the mechanical rule is the only thing standing between that
review and a page claiming fresher provenance than it has. This is the gap that Phase 5's
letter snapshot tests close, by turning a data diff into a **letter** diff — so the reviewer
sees the sentence the worker would send, not the field that produced it. Until then, the
mechanical rule is the whole control.

---

## Case 5 — a correct, allowlisted, live source cited for the wrong provision

This is the case the four originally-specified cases did not cover, and the failure this
project's own research encountered most often.

**Defect.** Cited the Publications Office Cellar resource — an allowlisted host, a live
source, the authentic Official Journal text, far above the byte floor — scoped to `art_7`,
with the anchor `"Joint pay assessments should lead"`. That string genuinely appears in the
document. It appears in a **recital**, not in Article 7.

**Expected:** the subtree-scoped anchor assertion, disposing data defect.

**Actual:** exactly that — and, decisively, *nothing else caught it*:

```
L5   ok     url hygiene — https, no tracking, allowlisted host
offline-suite   success

[anchor_absent] anchor not found inside the id="art_7" subtree of
http://publications.europa.eu/resource/cellar/5bbb9daf-f470-11ed-a05c-01aa75ed71a1.0006.03/DOC_1

FAILED — 1 data defect
```

**Not the byte floor** (the body is 193,564 bytes, far above the 100,000-byte floor).
**Not the allowlist** (`publications.europa.eu` is on the all-countries set, and L5 reported
ok). **Not a status check** (200). The only thing that rejected it is the rule that asserts
the anchor *inside the cited subdivision's own subtree* rather than anywhere on the page.

That is the proof the scoping works rather than merely existing. An unscoped anchor would
have matched a recital roughly 26,000 characters before Article 7(4) and reported green —
and a worker's letter would have cited a recital as though it were the operative provision.

---

## Gates that were inert, and were armed before the drill

Two gates were documented and unit-tested but **could not fire in CI**. A drill against an
inert gate proves nothing, so both were fixed before any drill pull request was opened. Both
fixes are in `8abccad`.

**1. The unchanged-bump rule ran on nothing.** `lintAll` reported `BUMP SKIP` on every pull
request because no caller supplied the base-branch revision. `validate:country-data` now
accepts `--base <ref>` and retrieves each record as it stands on the base with `git show`
(read-only); the workflow passes the pull request's base SHA and checks out with
`fetch-depth: 0`, without which a shallow clone has no base commit to compare against.

**The drill proves the fix was load-bearing.** Case 4 triggered two runs of the same
workflow on the same commit:

| Trigger | Base available? | `schema-and-lint` |
|---|---|---|
| `push` | no — `BUMP SKIP` | **success** |
| `pull_request` | yes — `BUMP FAIL` | **failure** |

The identical defect passed one run and failed the other. Before the fix, only the passing
behaviour existed.

**2. An accepted-but-empty source reported "queued", not a defect.** No committed fixture
stood in for the host, so `verify:sources` reported it as not exercised — honest, but green.
The captured envelopes for `eur-lex.europa.eu`, `e-tar.lt` and `slov-lex.sk` are now
registered by host, so citing any of them is a deterministic offline failure whether or not
the allowlist was widened. Case 3 is the evidence.

---

## What the drill did not prove

Recorded so the gaps are tracked rather than implied away.

- **L6 (link liveness) and L7 (letter coverage) were not drilled.** Both correctly report a
  SKIP with a stated reason — L6 is nightly-only by design, and `packages/letters` does not
  exist until Phase 5. A skip is reported, never counted as a pass, but neither rule has yet
  been seen to reject anything.
- **The `freshness-gate` job has never been seen to fail.** It passed in all five cases, and
  correctly so. It will not have been proved to have teeth until a launch country holds a
  verified legally-operative fact that can go stale — which cannot happen until a maintainer
  promotion under D-06.
- **L1, L2, L3, L8 and L9 were not drilled.** All five are covered by unit tests in
  `packages/country-data/test/lint.test.ts`, including their negative cases, but a unit test
  and a pull request that CI actually rejected are different kinds of evidence, and this
  document claims only the second, and only for the five cases above.
