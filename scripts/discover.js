// Regenerates catalog.js from irs.gov's live current-forms listing, scoped
// to the curated searches in catalogConfig.js. Run this before download.js
// whenever the catalog might need refreshing (new form added to the
// config, or IRS renamed/replaced something).
//
// Usage: node discover.js

const fs = require('fs');
const path = require('path');
const { SEARCHES, RELATED } = require('./catalogConfig');

const SEARCH_URL = 'https://www.irs.gov/forms-instructions-and-publications';
const CATALOG_PATH = path.join(__dirname, 'catalog.js');

const CATEGORY_BY_PREFIX = {
  'Form': 'forms',
  'Instruction': 'instructions',
  'Publication': 'publications',
};

// English-only: translated products always carry a short trailing
// parenthetical language code, e.g. "(sp)", "(ZH-S)", "(FR)" - unlike a
// legitimate schedule reference like "(Schedule C)", which has a space.
const LANGUAGE_SUFFIX = /\s\([a-zA-Z-]{2,6}\)$/;

async function fetchResults(query) {
  const url = `${SEARCH_URL}?find=${encodeURIComponent(query)}&items_per_page=200`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    },
  });
  if (!res.ok) throw new Error(`Search failed for "${query}": HTTP ${res.status}`);
  const html = await res.text();
  return parseRows(html);
}

const HTML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(str) {
  return str.replace(/&(#(\d+)|#x([0-9a-fA-F]+)|([a-zA-Z]+));/g, (m, _all, dec, hex, name) => {
    if (dec) return String.fromCharCode(parseInt(dec, 10));
    if (hex) return String.fromCharCode(parseInt(hex, 16));
    return HTML_ENTITIES[name] ?? m;
  });
}

function parseRows(html) {
  const rows = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html))) {
    const row = rowMatch[1];
    const numberMatch = /picklist-number"[^>]*><a href="([^"]+)"[^>]*>([^<]*)</.exec(row);
    if (!numberMatch) continue;
    const titleMatch = /picklist-title">([^<]*)</.exec(row);
    rows.push({
      url: numberMatch[1].trim(),
      number: decodeEntities(numberMatch[2].trim().replace(/\s+/g, ' ')),
      title: decodeEntities((titleMatch ? titleMatch[1] : '').trim().replace(/\s+/g, ' ')),
    });
  }
  return rows;
}

function categoryFor(number) {
  const prefix = Object.keys(CATEGORY_BY_PREFIX).find((p) => number.startsWith(`${p} `));
  return prefix ? CATEGORY_BY_PREFIX[prefix] : null;
}

// "Form 1040 (Schedule C)" / "Instruction 1040 (Schedule C)" -> "1040schedulec"
// "Publication 334" -> "334"
function familyFor(number, category) {
  const prefix = category === 'forms' ? 'Form ' : category === 'instructions' ? 'Instruction ' : 'Publication ';
  return number
    .slice(prefix.length)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  const catalog = [];
  const seenCodes = new Set();

  for (const { query, keep } of SEARCHES) {
    console.log(`Searching "${query}"...`);
    let rows;
    try {
      rows = await fetchResults(query);
    } catch (err) {
      console.error(`  ${err.message}`);
      continue;
    }

    const englishRows = rows.filter((r) => !LANGUAGE_SUFFIX.test(r.number));
    const found = new Set();

    for (const target of keep) {
      const row = englishRows.find((r) => r.number.toLowerCase() === target.toLowerCase());
      if (!row) continue;
      found.add(target);

      const category = categoryFor(row.number);
      if (!category) {
        console.warn(`  skip "${row.number}": doesn't start with Form/Instruction/Publication`);
        continue;
      }
      const code = path.basename(row.url).replace(/\.pdf$/i, '');
      if (seenCodes.has(code)) continue;
      seenCodes.add(code);

      catalog.push({
        code,
        category,
        number: row.number,
        title: row.title,
        family: familyFor(row.number, category),
      });
    }

    for (const target of keep) {
      if (!found.has(target)) console.warn(`  NOT FOUND: "${target}" (check catalogConfig.js)`);
    }
  }

  // Apply editorial "See also" links, resolving each related family back to
  // the doc codes that belong to it.
  const codesByFamily = new Map();
  for (const doc of catalog) {
    if (!codesByFamily.has(doc.family)) codesByFamily.set(doc.family, []);
    codesByFamily.get(doc.family).push(doc.code);
  }
  for (const doc of catalog) {
    const relatedFamilies = RELATED[doc.family];
    if (!relatedFamilies) continue;
    const relatedCodes = relatedFamilies.flatMap((fam) => codesByFamily.get(fam) || []);
    if (relatedCodes.length) doc.related = relatedCodes;
  }

  writeCatalog(catalog);
  console.log(`\nDiscovered ${catalog.length} documents -> ${CATALOG_PATH}`);
}

function writeCatalog(catalog) {
  const body = catalog
    .map((doc) => {
      const fields = [
        `code: ${JSON.stringify(doc.code)}`,
        `category: ${JSON.stringify(doc.category)}`,
        `number: ${JSON.stringify(doc.number)}`,
        `title: ${JSON.stringify(doc.title)}`,
        `family: ${JSON.stringify(doc.family)}`,
      ];
      if (doc.related) fields.push(`related: ${JSON.stringify(doc.related)}`);
      return `  {\n    ${fields.join(',\n    ')},\n  },`;
    })
    .join('\n');

  const contents = `// AUTO-GENERATED by discover.js from catalogConfig.js - do not hand-edit.
// To change the catalog, edit catalogConfig.js and run: node discover.js

module.exports = [
${body}
];
`;
  fs.writeFileSync(CATALOG_PATH, contents);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
