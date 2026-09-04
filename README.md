# IRS Document Research Chat

A static, client-side chat app that answers tax questions using **only** the official IRS
forms, instructions, and publications indexed in this repository — never the model's own
knowledge. Hosted entirely on GitHub Pages; a GitHub Action is the only "server-side" piece,
and it runs periodically to pull documents from irs.gov and rebuild the search index.

## How it works

1. A GitHub Action (`.github/workflows/update-docs.yml`) downloads PDFs from irs.gov into
   `irs-docs/{year}/{forms,instructions,publications}/`, extracts their text, chunks it,
   embeds each chunk with a small local model, and writes `irs-docs/{year}/index.json` plus
   a top-level `irs-docs/manifest.json` describing what's available.
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

## Milestone 1 (current)

Tax year 2025 only, five documents: Form 1040, Schedule C, Pub 334, and their instructions.
See `scripts/catalog.js` to add more documents — each entry is `{ code, category, number,
title }`, where `code` is the irs.gov filename stem (e.g. `f1040`).

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

- `index.json` grows with the number of chunks (~14 MB for the 5-document milestone set);
  at full catalog scale this may need splitting per category or quantizing embeddings.
- The download script tries `irs-prior/{code}--{year}.pdf` then falls back to
  `irs-pdf/{code}.pdf` (current revision) — good enough for milestone 1's fixed catalog, but
  scaling to "all forms for a year" will need to parse the `/prior-year-forms-and-instructions?find=`
  results table instead of a hardcoded catalog.
- Cosine similarity threshold (`SIMILARITY_THRESHOLD` in `app/chat.js`) is a rough cutoff
  tuned by eye — revisit once there's more document variety to test against.
