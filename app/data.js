// Fetches manifest.json and per-year index.json files from /irs-docs.

const DOCS_ROOT = 'irs-docs';
const indexCache = new Map();

export async function loadManifest() {
  const res = await fetch(`${DOCS_ROOT}/manifest.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load manifest.json (${res.status})`);
  return res.json();
}

export async function loadYearIndex(year) {
  if (indexCache.has(year)) return indexCache.get(year);
  const res = await fetch(`${DOCS_ROOT}/${year}/index.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load index for ${year} (${res.status})`);
  const data = await res.json();
  indexCache.set(year, data);
  return data;
}

export function docPreviewUrl(file) {
  return `${DOCS_ROOT}/${file}`;
}
