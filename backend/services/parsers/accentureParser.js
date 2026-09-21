// Accenture Careers (accenture.com) — official. The careers listings surface
// as JobPosting JSON-LD / structured data, and when not available the generic
// anchor fallback applies. Kept as a dedicated seam.
const generic = require('./parsers/genericCareerParser');
const parser = (ctx) => generic.parse(ctx);
module.exports = { name: 'accenture', parse: parser };
