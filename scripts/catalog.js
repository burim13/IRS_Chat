// Catalog of IRS documents to fetch and index.
// To add more documents later, add another entry here — no other code changes needed
// as long as the doc follows the same irs-pdf/irs-prior URL convention.
//
// category must be one of: forms, instructions, publications
//
// family groups a form with its own instructions (e.g. Schedule C and the
// Instructions for Schedule C share a family) so the sidebar can keep them
// adjacent within a category. related lists other doc codes (any category)
// that are topically relevant but don't share a family — e.g. Pub 334
// covers many forms, so it's cross-linked via `related` rather than forced
// into one family bucket. The sidebar surfaces these as "See also" links.

module.exports = [
  {
    code: 'f1040',
    category: 'forms',
    number: 'Form 1040',
    title: 'U.S. Individual Income Tax Return',
    family: '1040',
  },
  {
    code: 'i1040gi',
    category: 'instructions',
    number: 'Instructions for Form 1040',
    title: 'Instructions for Form 1040 and Form 1040-SR',
    family: '1040',
  },
  {
    code: 'f1040sc',
    category: 'forms',
    number: 'Schedule C (Form 1040)',
    title: 'Profit or Loss From Business (Sole Proprietorship)',
    family: '1040sc',
    related: ['p334'],
  },
  {
    code: 'i1040sc',
    category: 'instructions',
    number: 'Instructions for Schedule C (Form 1040)',
    title: 'Instructions for Schedule C',
    family: '1040sc',
    related: ['p334'],
  },
  {
    code: 'p334',
    category: 'publications',
    number: 'Publication 334',
    title: 'Tax Guide for Small Business',
    family: '334',
    related: ['f1040sc', 'i1040sc'],
  },
];
