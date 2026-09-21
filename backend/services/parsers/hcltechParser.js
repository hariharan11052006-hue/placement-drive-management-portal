// HCLTech careers (careers.hcltech.com) — official. Delegates to the generic
// JSON-LD/JobPosting parser (entry-level roles are published as JobPosting).
// Kept as a dedicated seam so HCL-specific section parsing can be layered
// later without touching the generic pipeline.
const generic = require('./parsers/genericCareerParser');
const parser = (ctx) => generic.parse(ctx);
module.exports = { name: 'hcltech', parse: parser };
