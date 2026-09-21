// Wipro careers (careers.wipro.com) — official. Entry-level roles are exposed
// as JobPosting JSON-LD; the generic parser already understands that format.
const generic = require('./parsers/genericCareerParser');
const parser = (ctx) => generic.parse(ctx);
module.exports = { name: 'wipro', parse: parser };
