// Infosys-specific career parser.
//
// careers.infosys.com publishes JobPosting JSON-LD; the generic parser handles
// it. Kept as a dedicated seam so Infosys page-structure tweaks stay isolated.
const { parse: genericParse } = require('./genericCareerParser');

const parse = (ctx) => genericParse(ctx);

module.exports = { name: 'infosys', parse };
