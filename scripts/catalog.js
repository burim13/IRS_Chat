// Catalog of IRS documents to fetch and index.
// To add more documents later, add another entry here — no other code changes needed
// as long as the doc follows the same irs-pdf/irs-prior URL convention.
//
// category must be one of: forms, instructions, publications

module.exports = [
  {
    code: 'f1040',
    category: 'forms',
    number: 'Form 1040',
    title: 'U.S. Individual Income Tax Return',
  },
  {
    code: 'i1040gi',
    category: 'instructions',
    number: 'Instructions for Form 1040',
    title: 'Instructions for Form 1040 and Form 1040-SR',
  },
  {
    code: 'f1040sc',
    category: 'forms',
    number: 'Schedule C (Form 1040)',
    title: 'Profit or Loss From Business (Sole Proprietorship)',
  },
  {
    code: 'i1040sc',
    category: 'instructions',
    number: 'Instructions for Schedule C (Form 1040)',
    title: 'Instructions for Schedule C',
  },
  {
    code: 'p334',
    category: 'publications',
    number: 'Publication 334',
    title: 'Tax Guide for Small Business',
  },
];
