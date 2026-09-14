# Legal correction log

**Every correction to a legal fact in this repository is recorded here, publicly, with a
date.**

This log exists because an error in this dataset is inevitable — twenty-seven member states,
eleven language versions, and a Directive still being transposed. What is not inevitable is
how the error is handled. An error that is publicly logged costs a little credibility once.
An error that is found to have been quietly corrected costs all of it, permanently.

If you are a journalist, a union officer or a lawyer deciding whether to link to this
project, this is the file to read first. It is the only honest evidence of how corrections
are actually handled, as opposed to how a policy page says they will be.

To report an error, see [REPORTING-LEGAL-ERRORS.md](REPORTING-LEGAL-ERRORS.md). You do not
need to be a lawyer, and you do not need to be sure.

## Entry format

Newest first. One entry per correction:

```markdown
## YYYY-MM-DD — {Country or "Directive"}: {one-line summary}

- **What was wrong:** the value as it stood, and what it should have said.
- **Who was affected:** whether the wrong value was ever shown to users, whether it could
  have reached a generated letter, and over what dates.
- **What it says now:** the corrected value, its official source, and the date it was
  verified.
- **Reported by:** the reporter, or "internal" — or "anonymous, by request".
- **Fixed in:** the commit or pull-request link.
- **How it got through:** which gate should have caught it and did not, and what changed so
  that the next one of these is caught. Omit only when the answer is genuinely "no gate
  could have caught this".
```

The last field is the one that makes this log useful rather than decorative. A correction
that does not say what let the error through is a correction that will be repeated.

## Entries

<!-- Newest first. Add new entries directly below this line. -->

## 2026-09-14 — Governance: two gates were found inert and were armed before the repository was opened

- **What was wrong:** no legal fact was wrong. Two *controls* were. The unchanged-bump rule
  — which refuses a `verified_at` that advances while its value stands still — was reported
  in every pull request summary but ran against nothing, because no caller supplied the
  base-branch revision to compare with. And a source URL returning an accepted-but-empty
  response was reported as `queued (not exercised)` rather than as a defect, because no
  committed fixture stood in for the host. Both read as green.
- **Who was affected:** nobody. The repository was private throughout and no incorrect legal
  fact reached any user. Recorded here because a control that silently stopped working is
  exactly the failure this log exists to surface, and finding it before publication rather
  than after is the only difference between this entry and a much worse one.
- **What it says now:** `validate:country-data` takes `--base <ref>` and CI passes the pull
  request's base commit, so the unchanged-bump rule compares real revisions; the captured
  accepted-but-empty, challenge-interstitial and client-shell responses are registered by
  host, so citing any of those hosts is a deterministic offline failure. Both fixes are in
  `8abccad`.
- **Reported by:** internal — found while preparing the bad-pull-request drill, on the
  principle that a drill against an inert gate proves nothing.
- **Fixed in:** `8abccad`.
- **How it got through:** both gates were unit-tested and both unit tests passed. What was
  missing was the *wiring* — the rule was correct and was never invoked with real inputs. A
  passing unit test says a rule works when called; it says nothing about whether CI calls
  it. The drill is what exposed the difference, and case 4 now demonstrates it directly: the
  same defect on the same commit passed the `push` run and failed the `pull_request` run.

## 2026-09-14 — Governance: five deliberately bad pull requests were rejected by the gates before the repository was opened

- **What was wrong:** nothing in the dataset. This entry records a deliberate exercise, so
  that this log opens with a real, dated event rather than an empty template.
- **Who was affected:** nobody. The repository was private throughout, and all five pull
  requests were closed without merging.
- **What it says now:** unchanged. Each of the five defects was rejected by CI before it
  could be merged. The evidence — the defect, the rule expected to catch it, the rule that
  actually caught it, the pull-request link and the failure message — is in
  [`docs/BAD-PR-DRILL.md`](docs/BAD-PR-DRILL.md), including the one case where the actual
  rejecter differed from the expected one and the two rules the drill did **not** prove.
- **Reported by:** internal — planned as a deliverable, on the principle that until each
  gate has been shown to reject, "the gates work" is an assertion.
- **Fixed in:** pull requests
  [#1](https://github.com/MarekFish93/paytransparency/pull/1),
  [#2](https://github.com/MarekFish93/paytransparency/pull/2),
  [#3](https://github.com/MarekFish93/paytransparency/pull/3),
  [#4](https://github.com/MarekFish93/paytransparency/pull/4) and
  [#5](https://github.com/MarekFish93/paytransparency/pull/5), all closed, none merged.
- **How it got through:** it did not, which is the result the exercise was run to establish.
  The drill covered a fabricated statute number, a source on a non-allowlisted domain, a
  source URL returning an accepted-but-empty response, a silent date change disguised as a
  typo fix, and a correct, allowlisted, live source cited for the wrong provision. The last
  of those was added because it is the failure this project's research encountered most
  often, and it is the one a domain allowlist and a byte floor cannot see.
