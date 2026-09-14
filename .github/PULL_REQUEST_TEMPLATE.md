<!--
Thank you for contributing. Please read this before deleting it.

This template asks for five specific things. They are FIELDS, not prose, because prose is
easy to skip and a field that is empty is visibly empty. Every one of them is checked by
CI or by a maintainer who will open your source and read it.

If your pull request does not touch `packages/country-data`, delete the "Legal data"
section entirely and just describe your change.

There is NO GUARANTEED INCLUSION TIMELINE. A non-conforming patch sits until it conforms
rather than being merged to be nice. See CONTRIBUTING.md — slow merges are a feature here.
-->

## What this changes

<!-- One or two sentences. What is different after this is merged? -->

---

## Legal data

<!-- Delete this whole section if you are not touching packages/country-data. -->

**Country:** <!-- ISO 3166-1 alpha-2, e.g. PL. Greece is GR; EL is the EU statistical code and is not an ISO code. -->

**Field:** <!-- The dotted path, e.g. article_7.response_deadline -->

### 1. Official source URL

<!--
Must be on that country's allowlist in packages/country-data/data/_allowlist.json.
CI rejects anything else and tells you which host it saw.

Do NOT cite eur-lex.europa.eu. It answers a non-browser request with an accepted status
and a zero-byte body, so a source pointing at it can never be machine-verified — it would
be a citation nobody, including us, can check. Cite publications.europa.eu instead.

Do NOT cite a law-firm commentary, a news article, a blog, or a PDF you re-hosted.
-->

```
<!-- the URL -->
```

### 2. The operative sentence, quoted in the ORIGINAL language

<!--
Verbatim. Do not normalise it. Leave the no-break spaces, the typographic apostrophes and
the diacritics exactly as the official text published them — we assert against the raw
string, and a "tidied" quotation stops matching the document it came from.
-->

```
<!-- the quotation -->
```

### 3. English gloss

<!-- Your own translation of the sentence above. It is read by maintainers, not shipped. -->

### 4. Date of entry into force

<!-- YYYY-MM-DD. If the instrument is not yet in force, say so and give the expected date. -->

### 5. Does the source itself say DRAFT?

- [ ] The source describes this as a draft, a bill, or a measure in parliament.

<!--
This is not a formality. Where the underlying source says "draft", the site must say
"draft" too. Ticking this box is paired with a schema rule: a `transposition.status` of
`draft` must cite at least one source listed in `draft_asserting_sources`, so your tick is
ASSERTED BY CI rather than trusted. If you tick it and the sources do not back it, the
schema-and-lint job fails and tells you which URL is missing.
-->

---

## A worked example of a good citation

This is what the maintainers are looking for. It is the two-month response deadline in
Article 7(4) of the Directive, as it is actually stored in this repository.

> **Country:** — (this one is the Directive itself, not a national measure)
>
> **Field:** `article_7.response_deadline`
>
> **1. Official source URL**
> ```
> http://publications.europa.eu/resource/cellar/5bbb9daf-f470-11ed-a05c-01aa75ed71a1.0006.03/DOC_1
> ```
> The Publications Office Cellar resource. It is on the all-countries allowlist, it serves
> the authentic Official Journal text with the publisher's own subdivision ids, and the
> anchor is asserted INSIDE `art_7` rather than across the whole document — which is what
> stops a string that appears in a recital being accepted as the article.
>
> **2. The operative sentence, quoted in the ORIGINAL language**
> ```
> 4.   Employers shall provide the information referred to in paragraph 1 within a reasonable period of time but in any event within two months from the date on which the request is made.
> ```
> Note the three spaces after `4.` — that is what the Official Journal published, and it is
> preserved rather than tidied.
>
> **3. English gloss**
> This is already the authentic English version; no gloss is needed. For a national measure
> in Polish, Slovak, Italian or Lithuanian, translate it here.
>
> **4. Date of entry into force**
> The Directive was **published** on `2023-05-17`, and its **transposition deadline** is
> `2026-06-07` — both machine-read from the Directive's own Cellar metadata and committed.
> Its own date of entry into force has **not** been retrieved from primary text in this
> repository, so it is recorded as *pending verification* rather than computed from the
> publication date.
>
> That last sentence is the example worth copying. The entry-into-force date follows a
> rule you could look up in thirty seconds, and stating it from memory would almost
> certainly be right. We still do not, because "almost certainly right" is exactly the
> shape of the four inherited errors this project had to correct at the start. **Unknown is
> `null` plus "pending verification" — never a plausible guess.** If you do not have the
> date from the official source in front of you, say so here and a maintainer will find it.
>
> **5. Does the source itself say DRAFT?**
> No.
>
> Citation key: `32023L0970#007.004`.

Two things that example does NOT do, and which are the two most common ways a well-meant
contribution fails:

- It does not say **"employers must reply within two months, so your employer is in
  breach"**. This project reports what the law says and assembles the words a worker chose;
  it never evaluates anybody's situation.
- It does not cite a source whose page merely *mentions* Article 7(4). The anchor has to be
  inside the provision being cited. A correct, allowlisted, live source cited for the wrong
  provision is the failure our own research hit most often, and CI is built to catch it.

---

## Checklist

- [ ] `pnpm validate:country-data` passes locally.
- [ ] `pnpm vitest run --dir packages/country-data` passes locally.
- [ ] I have not set any `status` to `verified`. (If this lands in `proposed/`, CI rejects
      it outright — rule L9. Promotion into `data/` is a maintainer action that records who
      read the source.)
- [ ] I have not advanced a `verified_at` without changing the value it dates.
- [ ] Nothing I have written states or implies that this project gives legal advice, that a
      user has a claim, or that an employer is in breach.
