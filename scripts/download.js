// Downloads the catalog's PDFs for a given tax year from irs.gov into
// /irs-docs/{year}/{category}/{code}.pdf
//
// Usage: node download.js <year>

const fs = require('fs');
const path = require('path');
const catalog = require('./catalog');

const YEAR = process.argv[2] || process.env.TAX_YEAR;
if (!YEAR || !/^\d{4}$/.test(YEAR)) {
  console.error('Usage: node download.js <4-digit-year>');
  process.exit(1);
}

const DOCS_ROOT = path.join(__dirname, '..', 'irs-docs');

// A specific-year URL is more correct for a specific year than the
// "current revision" one, so try it first and fall back to the
// current-revision URL for a year that hasn't been mirrored into
// irs-prior yet (e.g. the in-progress tax year).
function candidateUrls(code, year) {
  return [
    `https://www.irs.gov/pub/irs-prior/${code}--${year}.pdf`,
    `https://www.irs.gov/pub/irs-pdf/${code}.pdf`,
  ];
}

async function fetchPdf(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    },
    redirect: 'follow',
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  // A 404 page served with a 200 status would not start with %PDF-
  if (buf.slice(0, 4).toString('latin1') !== '%PDF') return null;
  return buf;
}

async function downloadOne(doc, year) {
  const destDir = path.join(DOCS_ROOT, year, doc.category);
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, `${doc.code}.pdf`);

  for (const url of candidateUrls(doc.code, year)) {
    try {
      const buf = await fetchPdf(url);
      if (buf) {
        fs.writeFileSync(destPath, buf);
        console.log(`OK   ${doc.code} <- ${url} (${buf.length} bytes)`);
        return { ...doc, year, sourceUrl: url, path: destPath, ok: true };
      }
      console.log(`miss ${doc.code} <- ${url}`);
    } catch (err) {
      console.log(`err  ${doc.code} <- ${url}: ${err.message}`);
    }
  }
  console.error(`FAIL ${doc.code}: no candidate URL succeeded for year ${year}`);
  return { ...doc, year, ok: false };
}

async function main() {
  const results = [];
  for (const doc of catalog) {
    results.push(await downloadOne(doc, YEAR));
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\nDownloaded ${results.length - failed.length}/${results.length} documents for ${YEAR}.`);
  if (failed.length) {
    console.error(`Failed: ${failed.map((f) => f.code).join(', ')}`);
  }
}

main();
