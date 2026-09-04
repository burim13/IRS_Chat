// Extracts text from each downloaded PDF for a given year, chunks it,
// embeds each chunk with a local model, and writes:
//   /irs-docs/{year}/index.json   (chunks + embeddings for that year)
//   /irs-docs/manifest.json       (years + files available, for the sidebar)
//
// Usage: node build-index.js <year>

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const catalog = require('./catalog');

const YEAR = process.argv[2] || process.env.TAX_YEAR;
if (!YEAR || !/^\d{4}$/.test(YEAR)) {
  console.error('Usage: node build-index.js <4-digit-year>');
  process.exit(1);
}

const DOCS_ROOT = path.join(__dirname, '..', 'irs-docs');
const CATEGORIES = ['forms', 'instructions', 'publications'];
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// --- PDF text extraction, per page -----------------------------------------

async function extractPages(pdfPath) {
  const pages = [];
  const render_page = (pageData) =>
    pageData.getTextContent({ normalizeWhitespace: true }).then((textContent) => {
      const text = textContent.items.map((item) => item.str).join(' ');
      pages.push(text);
      return text;
    });
  const buffer = fs.readFileSync(pdfPath);
  await pdfParse(buffer, { pagerender: render_page });
  return pages;
}

// --- Chunking ---------------------------------------------------------------

function chunkText(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  if (!clean) return chunks;
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

// --- Main --------------------------------------------------------------------

async function main() {
  const { pipeline } = await import('@xenova/transformers');
  console.log(`Loading embedding model ${MODEL_NAME}...`);
  const embedder = await pipeline('feature-extraction', MODEL_NAME);

  async function embed(text) {
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  const yearDir = path.join(DOCS_ROOT, YEAR);
  const chunks = [];
  let chunkId = 0;

  for (const doc of catalog) {
    const pdfPath = path.join(yearDir, doc.category, `${doc.code}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      console.warn(`skip ${doc.code}: not downloaded (${pdfPath})`);
      continue;
    }
    console.log(`Extracting ${doc.code}...`);
    const pages = await extractPages(pdfPath);
    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageChunks = chunkText(pages[pageNum]);
      for (const text of pageChunks) {
        const embedding = await embed(text);
        chunks.push({
          id: `${YEAR}-${doc.code}-${chunkId++}`,
          code: doc.code,
          category: doc.category,
          number: doc.number,
          title: doc.title,
          year: YEAR,
          page: pageNum + 1,
          text,
          embedding,
        });
      }
    }
    console.log(`  -> ${pages.length} pages, ${chunks.filter((c) => c.code === doc.code).length} chunks`);
  }

  fs.writeFileSync(path.join(yearDir, 'index.json'), JSON.stringify(chunks));
  console.log(`\nWrote ${chunks.length} chunks to ${path.join(yearDir, 'index.json')}`);

  writeManifest();
}

// Scans the whole irs-docs tree so the manifest reflects every year present,
// not just the one this run just built.
function writeManifest() {
  const years = fs
    .readdirSync(DOCS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}$/.test(e.name))
    .map((e) => e.name)
    .sort();

  const docsByYear = {};
  for (const year of years) {
    docsByYear[year] = {};
    for (const category of CATEGORIES) {
      const dir = path.join(DOCS_ROOT, year, category);
      const files = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'))
        : [];
      docsByYear[year][category] = files.map((file) => {
        const code = file.replace(/\.pdf$/i, '');
        const catalogEntry = catalog.find((d) => d.code === code) || {};
        return {
          code,
          file: `${year}/${category}/${file}`,
          number: catalogEntry.number || code,
          title: catalogEntry.title || '',
        };
      });
    }
  }

  const manifest = { years, docsByYear };
  fs.writeFileSync(path.join(DOCS_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Wrote manifest for years: ${years.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
