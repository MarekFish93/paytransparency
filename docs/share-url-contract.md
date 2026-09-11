# The share-URL contract — version `1`

**Status:** frozen at contract version `1`. Implemented once, in
`packages/directive-engine/src/share-url-contract.ts`, and imported by both the result
page and the card renderer so the card can never contradict the page the worker just read.

A share URL is the **only** place in this product where a figure derived from what the
worker typed deliberately leaves their browser. It is also a public artefact that cannot
be un-transmitted: it persists in social-media caches, in the edge worker's request log,
and in the analytics beacon's page-URL field. **Narrowing a band later cannot retract what
was already sent, and widening one breaks every link already shared.** The version
identifier in the URL is what makes a future change additive — it does not undo the first
transmission.

The three numbers here — the band edges, the rounding rule and the k-anonymity floor —
were chosen by a **human at a blocking checkpoint**, not by an agent, for exactly that
reason. See §8.

---

## 1. The transmitted parameter set

Exhaustive and **closed**. A parameter not on this list appearing in a transmitted URL is
a defect, not a feature.

| Key | Value | Why it is safe to transmit |
|---|---|---|
| `v` | the contract version, currently `1` | A constant. Makes a future band change additive. |
| `gap` | the gap percentage, rounded to whole points, signed | One integer out of a few dozen, shared with millions of workers. |
| `band` | a band identifier from §2 | A band, never a figure. |
| `lang` | the locale tag, e.g. `en`, `pl` | The language the card renders in. |

**Never transmitted, under any circumstances: country, sector, seniority, age, employer,
salary, pay, income, date of birth, or any date.** Country plus sector plus seniority is a
near-unique fingerprint long before a salary is involved, and each of the three servers in
§4 sees every transmitted parameter.

`TRANSMITTED_KEYS` is the frozen list, and `test/share-url-contract.test.ts` asserts it in
**both** directions: no key naming a forbidden signal may join it, and no key outside it
may appear in a constructed URL.

## 2. The bucket boundary table (version `1`)

Eight bands on a roughly logarithmic scale. Each band is half-open as
`(minExclusive, maxInclusive]` — see §3 for what that means at a boundary.

| Band id | Lifetime total | Label on the card | Modelled population | Narrowest cell |
|---|---|---|---|---|
| `upto-10k` | ≤ €10,000 | up to €10k | 4,800,000 | 400,000 |
| `10k-20k` | €10,000 – €20,000 | €10k–€20k | 3,200,000 | 266,666 |
| `20k-40k` | €20,000 – €40,000 | €20k–€40k | 3,800,000 | 316,666 |
| `40k-75k` | €40,000 – €75,000 | €40k–€75k | 3,400,000 | 283,333 |
| `75k-125k` | €75,000 – €125,000 | €75k–€125k | 2,200,000 | 183,333 |
| `125k-200k` | €125,000 – €200,000 | €125k–€200k | 1,400,000 | 116,666 |
| `200k-300k` | €200,000 – €300,000 | €200k–€300k | 600,000 | 50,000 |
| `over-300k` | **over €300,000, open-ended** | over €300k | 600,000 | 50,000 |

**The top band is open-ended and must stay open-ended.** That was the explicit condition
attached to the choice of this table. A closed top band would be most identifying exactly
where the population is thinnest — the one place a shared card could plausibly single
someone out.

The floor band claims a zero and a negative lifetime total as well, which is why it is
labelled "up to €10k" rather than "under €10k". A negative gap is a real result and the
band label must not lie about it.

## 3. The rounding rule, stated numerically

**Whole percentage points, ties away from zero.**

```
roundGapPct(14.5)   ===  15
roundGapPct(-14.5)  === -15
roundGapPct(13.5)   ===  14
roundGapPct(-3.4)   ===  -3
```

This is deliberately **not** the language default. `Math.round(-14.5)` is `-14` — half-up
toward positive infinity — which rounds a positive and a negative tie by different
amounts. A gender pay gap carries a sign: a negative gap means women are paid more on
average, and the card has to be able to say so. An asymmetric rule would systematically
understate the gap in one direction only. `-0` is normalised to `0`, so `gap=-0` can never
reach a URL.

A tie is asserted at an exact tie value in the test suite, naming the expected number. A
rounding rule that is whatever the platform happens to do is not a recorded decision.

**Boundary semantics, likewise numeric.** A total sitting exactly on a band edge is
claimed by the band **below** it — boundaries are inclusive on the lower side and
exclusive on the upper:

```
bucketLifetime(20_000) -> '10k-20k'    // the boundary belongs to the lower band
bucketLifetime(19_999) -> '10k-20k'
bucketLifetime(20_001) -> '20k-40k'
bucketLifetime(0)      -> 'upto-10k'   // never undefined
bucketLifetime(3_000_000) -> 'over-300k'
```

## 4. The fragment contract

**Everything after the `#` is never sent in the HTTP request line.** It does not reach the
edge worker, it does not reach the recipient's platform when the card is unfurled, and it
does not reach the analytics beacon.

So the split is:

| Position | Contents | Who sees it |
|---|---|---|
| Query string | `v`, `gap`, `band`, `lang` — §1, and nothing else | The edge worker, the recipient's platform, the analytics beacon, any CDN log |
| **Fragment** | the worker's own inputs, so *their* copy of the link restores *their* page | The worker's browser, and nothing else |

The worker's real gross pay, years worked, country and everything else they typed live
**here and only here**.

Three independent servers observe the query string, and it is worth being precise about
why, because each is a surprise to somebody:

- **An edge function is a server.** The OG worker receives every query parameter and
  Cloudflare records request URLs at the edge regardless of application code.
- **The recipient's platform fetches the URL server-side.** LinkedIn, Slack and WhatsApp
  all unfurl a shared link by requesting it, so the parameters reach the *recipient's*
  platform too, not only the sender's.
- **The analytics beacon reports the page URL.** A URL carrying inputs puts those inputs
  in the beacon, whatever the analytics product promises about payloads.

Request logging is disabled for the OG route, and that is stated in the README rather than
only here.

## 5. The preview obligation

**The worker sees the exact transmitted URL, in full, before pressing Share.** Not a
summary of it, not a description of it — the string itself, character for character.

This is a product requirement that Phase 4 must satisfy and Phase 2's card family must
leave room for. It is recorded in the contract rather than in a UI backlog because it is
half of what makes the privacy claim true: the other half is that sharing is an explicit
act the worker takes, never a side effect of viewing a result.

The honest form of the claim, for the privacy page: *"Nothing leaves your browser unless
you press Share, and then only the rounded figures visible on the card."*

## 6. The k-anonymity floor

**25,000.** Every band must plausibly cover at least twenty-five thousand workers, and so
must the narrowest *transmitted cell* — one band crossed with one rounded gap value, which
is the unit an observer actually sees.

Without a floor, "wide buckets" is an aesthetic judgement and Phase 2's card family cannot
be reviewed against it. With one, a proposed band either clears the number or it does not.

**How the estimates in §2 were derived:**

1. A deliberately conservative eligible base of **20,000,000** EU workers in organisations
   inside the Directive's Article 9 reporting scope. The real figure is considerably
   higher; a floor is only worth having if the number underneath it errs downwards.
2. A share of that base per band, thinning toward the tail: 24 / 16 / 19 / 17 / 11 / 7 / 3
   / 3 per cent, summing to 100.
3. The narrowest cell = band population ÷ **12**, the modelled number of distinct
   whole-point gap values a single lifetime band plausibly spreads over. Twelve rather
   than the full realistic gap range because the lifetime total is itself a function of
   the gap, so the two are correlated and a band does not spread across every gap value.

The thinnest cell in the table is 50,000 — twice the floor. If a future boundary cannot
clear 25,000, **widen the boundary; do not lower the floor.**

> **PENDING VERIFICATION.** These population figures are **modelled, not sourced.** They
> are a defensible conservative floor and they are explicitly not a statistic. A figure
> traceable to Eurostat and to the Directive's own scope thresholds must replace this
> model before the card ships in Phase 4, and if the sourced figure puts any band below
> 25,000 the table is widened rather than the floor lowered. Recorded here rather than
> asserted as fact, per the project rule that an unknown is a stated unknown and never a
> plausible guess.

## 7. A worked adversarial read

Take the most specific card this contract can produce. A worker in the `over-300k` band —
the thinnest one — shares a card reading **"~14% gap · over €300k over a career"**. The
edge worker's log records:

```
2026-09-11T13:58:02Z  203.0.113.44  GET /og?v=1&gap=14&band=over-300k&lang=pl  referer=https://www.linkedin.com/  ua=LinkedInBot/1.0
```

**What this line reveals.** Somebody, at that minute, from that IP, using a Polish-language
page, shared a card saying a fourteen per cent gap and a career total above three hundred
thousand euro. Combining every field in the line: a Polish-reading person whose modelled
cell holds on the order of **50,000 workers**, requested via LinkedIn's unfurl bot at a
known timestamp.

**What it does not reveal, and cannot.** Not their salary — `band` is one of eight strings
and the finest it ever gets is "over €300k", which is unbounded above. Not their years
worked, not their employer, not their sector, not their seniority, not their age, not
their country: `lang=pl` is the language the card renders in, and Polish is read well
beyond Poland. Not even their own screen's numbers — the unrounded gap and the real
lifetime total stayed in the fragment, which LinkedIn's bot never sent.

**Does it survive combination with referrer, timestamp and IP?** This is the question the
band table has to answer honestly, so: the referrer adds a platform, not a person. The
timestamp narrows nothing on its own — a viral card produces many shares per minute, and
a quiet one produces an IP that is usually a mobile carrier NAT or LinkedIn's own
fetcher rather than the worker. The IP is the strongest field in the line, and it is worth
saying plainly that **an IP address plus a timestamp is identifying** in the hands of
someone who can subpoena a carrier — but that is true of any request to any website, and
it is the reason request logging is disabled for this route rather than something the band
table could fix.

What the band table *does* fix is the part that would be unique to this product: the line
above tells an observer who already has the IP **nothing about the person's pay that they
did not already have from the IP**. The derived figures add a cell of fifty thousand
people, not a fingerprint. That is the specific property this contract exists to hold.

**Where it would stop holding.** Two changes would break it, and both are prohibited: a
closed top band, which would put a hard ceiling on the thinnest population in the table;
and a gap rounded to a decimal place, which would multiply the number of distinct cells by
ten and take the thinnest cell from 50,000 to 5,000 — below the floor. The finer option
was rejected at the checkpoint for exactly this reason.

## 8. The recorded decision

**Decision:** eight roughly logarithmic lifetime bands, gap rounded to the nearest whole
percentage point, k-anonymity floor of 25,000.

**Chosen by:** a human, at a blocking checkpoint in plan 01-06. D-15 fixed the *principle*
— wide buckets only, no country, sector, seniority or age signal, previewed before Share —
and left the numbers open. The numbers are the one-way part, so an agent did not pick them.

**Condition attached to the choice:** the top band **must** be open-ended. The stated
weakness of this option was that a whole-point gap combined with a narrow high-end band is
more identifying where fewer workers sit; it was accepted on the explicit condition that
the top band is unbounded. `test/share-url-contract.test.ts` asserts that condition
mechanically, so it cannot be lost to a later edit.

**Rejected alternatives, and why:** a coarser five-band table with five-point gap rounding
was rejected as costing more share value than its extra headroom was worth — the
worker-facing side is the project's traffic engine, and a card that says very little does
not get shared. A finer twelve-band table with one-decimal rounding was rejected because
its own analysis conceded it would not survive the adversarial read in §7, which is the
exact threat this contract exists to survive.

**Default origin:** a human decision under D-15. The band edges and the share allocation in
§6 are **project-invented** and are not borrowed from any external document; the
constraints they satisfy — no raw salary, no country or sector signal, wide buckets,
preview before Share — come from D-15 and from the project's own privacy constraint.

## Amending this contract

Changing a band edge, the rounding rule or the floor requires a **new contract version**.
Bump `SHARE_CONTRACT_VERSION`, add the new table alongside the old one rather than
replacing it, and keep resolving `v=1` links against the version `1` table for as long as
they exist in the wild. A card rendered from a link shared two years ago must still mean
what it meant when it was shared.
