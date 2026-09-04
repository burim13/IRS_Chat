# IRS Document Research Chat

A static, client-side chat app that answers tax questions using **only** the official IRS
forms, instructions, and publications indexed in this repository — never the model's own
knowledge. Hosted entirely on GitHub Pages; a GitHub Action is the only "server-side" piece,
and it runs periodically to pull documents from irs.gov and rebuild the search index.

## How it works

1. A GitHub Action (`.github/workflows/update-docs.yml`) regenerates the document catalog
   from irs.gov's live listing (`discover.js`), downloads the matching PDFs into
   `irs-docs/{year}/{forms,instructions,publications}/` (`download.js`), extracts their
   text, chunks it, embeds each chunk with a small local model, and writes
   `irs-docs/{year}/index.json` plus a top-level `irs-docs/manifest.json` describing what's
   available (`build-index.js`).
2. The static site (`index.html` + `app/*.js`) asks for a Claude API key on first load,
   stores it in `localStorage` on that browser only, and uses it to call
   `api.anthropic.com` directly from the browser.
3. On each question, the app embeds the question client-side with the *same* local model
   used to build the index (`Xenova/all-MiniLM-L6-v2`, via `@xenova/transformers` loaded
   from a CDN — no server, no second API key), ranks the selected year's indexed chunks by
   cosine similarity, and — only if something clears a similarity threshold — sends those
   excerpts to Claude with a strict system prompt asking for a plain-English explanation.
   The "Exact language" excerpts shown to the user come directly from the index, never from
   the model, so they are guaranteed verbatim.

## Catalog scope

The catalog covers individual + small-business tax filing (the 1040 family and its
schedules, common credit/deduction forms, and the frequently-referenced publications) —
not IRS's full ~3,129-document listing, most of which is estate/gift, exempt orgs, excise,
payroll, and international forms this app has no reason to index. Currently 110 documents
for tax year 2025.

To change what's covered: edit the `SEARCHES` list in `scripts/catalogConfig.js` (each
entry issues one search against irs.gov's current-forms listing and keeps only the exact
English-language product numbers you list — anything not found is reported, not silently
dropped) and the `RELATED` map (editorial "See also" cross-links, keyed by the normalized
`family` discover.js derives from each product number). Then regenerate:

```bash
cd scripts
node discover.js       # rewrites catalog.js from catalogConfig.js
node download.js 2025
node build-index.js 2025
```

`catalog.js` itself is auto-generated — don't hand-edit it, edit `catalogConfig.js` instead.

## Local development

```bash
cd scripts
npm install
node download.js 2025
node build-index.js 2025
```

Then serve the repo root with any static file server (GitHub Pages needs no build step):

```bash
python -m http.server 8765
```

and open `http://localhost:8765`.

> Note: `@xenova/transformers` depends on `sharp`, which has no prebuilt binary for
> Windows-on-ARM. This only affects local dev on an ARM64 Windows machine — GitHub Actions
> runs on standard Linux x64 runners where `npm ci` installs `sharp` normally. If you hit
> this locally, see the stub described in `scripts/node_modules/sharp` (regenerate by
> deleting `node_modules` and running `npm install --ignore-scripts`, then dropping in a
> no-op `sharp/index.js` — it's never actually called for text-only embeddings).

## Running the Action manually

GitHub → Actions → "Update IRS documents and search index" → Run workflow → enter a year.

## Deploying

Enable GitHub Pages for this repo (Settings → Pages → Deploy from branch → `main` / root),
after pushing. No build step is required.

## Known limitations / next steps

- `index.json` is ~45 MB for the current 110-document/16,601-chunk catalog. Each chunk
  stores its embedding as base64-encoded Float32 (not a JSON number array) and doc metadata
  is de-duplicated into a separate `docs` array (see `scripts/build-index.js`) — without
  that, this same catalog would have landed in the 100MB+ range. If it needs to shrink
  further, quantizing embeddings to int8 (4x smaller than Float32) is the next lever, at a
  small cosine-similarity accuracy cost.
- The download script tries `irs-prior/{code}--{year}.pdf` then falls back to
  `irs-pdf/{code}.pdf` (current revision) — this covers every code in the catalog, including
  the in-progress tax year before it's mirrored into `irs-prior`.
- Cosine similarity threshold (`SIMILARITY_THRESHOLD` in `app/chat.js`) is a rough cutoff
  tuned by eye — revisit if it starts missing relevant matches or returning noise now that
  the corpus is much larger and more varied.
- `discover.js` matches product numbers exactly against `catalogConfig.js` — if the IRS
  renames or discontinues a document (it happened to Pubs 535 and 536), it's reported as
  "NOT FOUND" rather than silently missing; check the Action's logs occasionally.
