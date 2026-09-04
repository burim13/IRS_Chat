// Curated scope for "the rest" of the catalog: documents relevant to
// individual and small-business tax filing, not the full ~3,129-document
// IRS catalog (which is mostly estate/gift, exempt orgs, excise, payroll,
// and international forms this app has no reason to index).
//
// Each entry issues ONE search against irs.gov's live current-forms listing
// (https://www.irs.gov/forms-instructions-and-publications?find=<query>),
// which conveniently returns a form, its instructions, and every language
// variant together. `keep` lists the exact (English-only) Product Number
// strings from that result set to actually catalog — discover.js filters
// out everything else (translations, unrelated partial matches) and warns
// about any `keep` entry it couldn't find, so a wrong guess here is
// reported instead of silently missing.

module.exports.SEARCHES = [
  { query: '1040', keep: [
    'Form 1040', 'Instruction 1040',
    'Form 1040-SR',
    'Form 1040-ES',
    'Form 1040-X', 'Instruction 1040-X',
    'Form 1040 (Schedule 1)',
    'Form 1040 (Schedule 2)',
    'Form 1040 (Schedule 3)',
    'Form 1040 (Schedule A)', 'Instruction 1040 (Schedule A)',
    'Form 1040 (Schedule B)', 'Instruction 1040 (Schedule B)',
    'Form 1040 (Schedule C)', 'Instruction 1040 (Schedule C)',
    'Form 1040 (Schedule D)', 'Instruction 1040 (Schedule D)',
    'Form 1040 (Schedule E)', 'Instruction 1040 (Schedule E)',
    'Form 1040 (Schedule EIC)',
    'Form 1040 (Schedule F)', 'Instruction 1040 (Schedule F)',
    'Form 1040 (Schedule H)', 'Instruction 1040 (Schedule H)',
    'Form 1040 (Schedule J)', 'Instruction 1040 (Schedule J)',
    'Form 1040 (Schedule R)', 'Instruction 1040 (Schedule R)',
    'Form 1040 (Schedule SE)', 'Instruction 1040 (Schedule SE)',
    'Form 1040 (Schedule 8812)', 'Instruction 1040 (Schedule 8812)',
  ] },
  { query: '17', keep: ['Publication 17'] },
  { query: '225', keep: ['Publication 225'] },
  { query: '463', keep: ['Publication 463'] },
  { query: '334', keep: ['Publication 334'] },
  { query: '587', keep: ['Publication 587'] },
  { query: '501', keep: ['Publication 501'] },
  { query: '502', keep: ['Publication 502'] },
  { query: '503', keep: ['Publication 503'] },
  { query: '504', keep: ['Publication 504'] },
  { query: '505', keep: ['Publication 505'] },
  { query: '525', keep: ['Publication 525'] },
  { query: '526', keep: ['Publication 526'] },
  { query: '527', keep: ['Publication 527'] },
  { query: '529', keep: ['Publication 529'] },
  // Pubs 535 and 536 were discontinued by the IRS (content folded into
  // other instructions/publications) - not in the current listing anymore.
  { query: '537', keep: ['Publication 537'] },
  { query: '544', keep: ['Publication 544'] },
  { query: '550', keep: ['Publication 550'] },
  { query: '551', keep: ['Publication 551'] },
  { query: '554', keep: ['Publication 554'] },
  { query: '559', keep: ['Publication 559'] },
  { query: '575', keep: ['Publication 575'] },
  { query: '590-A', keep: ['Publication 590-A'] },
  { query: '590-B', keep: ['Publication 590-B'] },
  { query: '596', keep: ['Publication 596'] },
  { query: '936', keep: ['Publication 936'] },
  { query: '946', keep: ['Publication 946'] },
  { query: '969', keep: ['Publication 969'] },
  { query: '970', keep: ['Publication 970'] },
  { query: '2106', keep: ['Form 2106'] },
  { query: '2210', keep: ['Form 2210', 'Instruction 2210'] },
  { query: '2441', keep: ['Form 2441'] },
  { query: '3903', keep: ['Form 3903'] },
  { query: '4562', keep: ['Form 4562', 'Instruction 4562'] },
  { query: '4684', keep: ['Form 4684', 'Instruction 4684'] },
  { query: '4797', keep: ['Form 4797', 'Instruction 4797'] },
  { query: '4868', keep: ['Form 4868'] },
  { query: '4952', keep: ['Form 4952'] },
  { query: '5329', keep: ['Form 5329', 'Instruction 5329'] },
  { query: '5695', keep: ['Form 5695', 'Instruction 5695'] },
  { query: '6198', keep: ['Form 6198'] },
  { query: '6251', keep: ['Form 6251', 'Instruction 6251'] },
  { query: '6252', keep: ['Form 6252'] },
  { query: '8283', keep: ['Form 8283', 'Instruction 8283'] },
  { query: '8582', keep: ['Form 8582', 'Instruction 8582'] },
  { query: '8606', keep: ['Form 8606', 'Instruction 8606'] },
  { query: '8829', keep: ['Form 8829', 'Instruction 8829'] },
  { query: '8863', keep: ['Form 8863', 'Instruction 8863'] },
  { query: '8889', keep: ['Form 8889', 'Instruction 8889'] },
  { query: '8949', keep: ['Form 8949', 'Instruction 8949'] },
  { query: '8959', keep: ['Form 8959'] },
  { query: '8960', keep: ['Form 8960', 'Instruction 8960'] },
  { query: '8962', keep: ['Form 8962', 'Instruction 8962'] },
  { query: '8995', keep: ['Form 8995', 'Form 8995-A', 'Instruction 8995-A'] },
  { query: '9465', keep: ['Form 9465'] },
  { query: 'SS-4', keep: ['Form SS-4', 'Instruction SS-4'] },
  { query: 'W-9', keep: ['Form W-9'] },
  // The IRS combined the 1099-MISC and 1099-NEC instructions into one document.
  { query: '1099-NEC', keep: ['Form 1099-NEC', 'Instruction 1099-MISC and 1099-NEC'] },
  { query: '1099-MISC', keep: ['Form 1099-MISC', 'Instruction 1099-MISC and 1099-NEC'] },
];

// Editorial cross-links surfaced as "See also" in the sidebar, keyed by the
// `family` derived from a product number (see discover.js). Not every form
// needs one - only where a publication or related form isn't already
// grouped into the same family.
module.exports.RELATED = {
  '1040schedulec': ['334', '463', '4562', '8829', '1040schedulese'],
  '1040schedulese': ['334', '1040schedulec'],
  '1040schedulea': ['502', '526', '936'],
  '1040scheduleb': ['550'],
  '1040scheduled': ['550', '8949'],
  '1040schedulee': ['527'],
  '1040schedulef': ['225'],
  '8949': ['550', '1040scheduled'],
  '4562': ['946', '1040schedulec'],
  '8829': ['587', '1040schedulec'],
  '2106': ['463'],
  '8606': ['590a', '590b'],
  '8863': ['970'],
  '5695': ['529'],
};
