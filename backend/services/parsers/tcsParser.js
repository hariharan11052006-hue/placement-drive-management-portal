// TCS-specific career parser.
//
// careers.tcs.com publishes JobPosting JSON-LD, which the generic parser
// reads first. This module hooks the same pipeline but is intentionally a
// seam where TCS-specific section parsing can be layered later without
// touching the generic parser (requirement: generic first, company-specific
// only when necessary).
const { parse: genericParse } = require('./genericCareerParser');

const parse = (ctx) => genericParse(ctx);

module.exports = { name: 'tcs', parse };
