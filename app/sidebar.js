import { docPreviewUrl } from './data.js';

const CATEGORY_LABELS = {
  forms: 'Forms',
  instructions: 'Instructions',
  publications: 'Publications',
};

export function renderYearSelect(manifest, currentYear, onChange) {
  const select = document.getElementById('year-select');
  select.innerHTML = '';
  if (!manifest.years.length) {
    const opt = document.createElement('option');
    opt.textContent = 'No years available';
    select.appendChild(opt);
    select.disabled = true;
    return;
  }
  select.disabled = false;
  // Most recent year first.
  [...manifest.years].sort().reverse().forEach((year) => {
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    if (year === currentYear) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = () => onChange(select.value);
}

// Groups a category's docs by `family` (a form and its own instructions
// share one), preserving the order families first appear in — this keeps
// e.g. Schedule C's form and instructions adjacent without needing a full
// topic taxonomy.
function groupByFamily(files) {
  const order = [];
  const groups = new Map();
  for (const doc of files) {
    const key = doc.family || doc.code;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(doc);
  }
  return order.map((key) => groups.get(key));
}

export function renderDocTree(manifest, year) {
  const tree = document.getElementById('doc-tree');
  tree.innerHTML = '';
  const docs = manifest.docsByYear[year];
  if (!docs) {
    tree.innerHTML = '<p class="empty-note">No documents indexed for this year yet.</p>';
    return;
  }

  // Flat code -> doc lookup across all categories, so "See also" links can
  // resolve to a doc that lives in a different category.
  const docsByCode = new Map();
  for (const category of ['forms', 'instructions', 'publications']) {
    for (const doc of docs[category] || []) docsByCode.set(doc.code, doc);
  }

  for (const category of ['forms', 'instructions', 'publications']) {
    const files = docs[category] || [];
    const section = document.createElement('div');
    section.className = 'doc-category';
    const heading = document.createElement('h3');
    heading.textContent = `${CATEGORY_LABELS[category]} (${files.length})`;
    section.appendChild(heading);

    if (!files.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = 'None indexed yet.';
      section.appendChild(empty);
    }

    for (const family of groupByFamily(files)) {
      const familyGroup = document.createElement('div');
      familyGroup.className = 'doc-family';
      for (const doc of family) {
        familyGroup.appendChild(renderDocItem(doc, docsByCode));
      }
      section.appendChild(familyGroup);
    }
    tree.appendChild(section);
  }
}

function renderDocItem(doc, docsByCode) {
  const wrapper = document.createElement('div');

  const btn = document.createElement('button');
  btn.className = 'doc-item';
  btn.innerHTML = `<span class="doc-number">${escapeHtml(doc.number)}</span><span class="doc-title">${escapeHtml(doc.title)}</span>`;
  btn.addEventListener('click', () => openPreview(doc));
  wrapper.appendChild(btn);

  const related = (doc.related || [])
    .map((code) => docsByCode.get(code))
    .filter(Boolean);
  if (related.length) {
    const seeAlso = document.createElement('div');
    seeAlso.className = 'see-also';
    seeAlso.appendChild(document.createTextNode('See also: '));
    related.forEach((rel, i) => {
      const link = document.createElement('button');
      link.className = 'see-also-link';
      link.textContent = rel.number;
      link.addEventListener('click', () => openPreview(rel));
      seeAlso.appendChild(link);
      if (i < related.length - 1) seeAlso.appendChild(document.createTextNode(', '));
    });
    wrapper.appendChild(seeAlso);
  }

  return wrapper;
}

function openPreview(doc) {
  const app = document.getElementById('app');
  const panel = document.getElementById('preview-panel');
  const frame = document.getElementById('preview-frame');
  const title = document.getElementById('preview-title');
  title.textContent = `${doc.number} — ${doc.title}`;
  frame.src = docPreviewUrl(doc.file);
  panel.hidden = false;
  app.classList.add('with-preview');
}

export function wirePreviewClose() {
  document.getElementById('preview-close').addEventListener('click', () => {
    document.getElementById('preview-panel').hidden = true;
    document.getElementById('app').classList.remove('with-preview');
    document.getElementById('preview-frame').src = '';
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
