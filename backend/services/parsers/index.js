// Parser registry (generic-first by design).
//
// Every company that does not have a dedicated parser is handled by the
// conservative generic JSON-LD/JobPosting + anchor-fallback parser. Dedicated
// parsers are ONLY added when a site stops exposing standard job markup, and
// the registry stays additive. NEVER register a parser that guesses values -
// the generic contract (deterministic + conservative) applies to every entry.

const generic = require('./genericCareerParser');

// Company-specific parsers, keyed by slug. Empty today - every company uses
// the generic parser. Add entries here ONLY when a specific site breaks the
// generic path and needs a bespoke, still-conservative extractor.
const REGISTRY = {};

const slugOf = (company) => String((company && (company.slug || company.name || '')) || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')
  .replace(/^(the|placement)\b/, '')
  .trim();

const getParser = (company) => {
  const key = slugOf(company);
  return (REGISTRY[key] && REGISTRY[key].parse ? REGISTRY[key] : generic);
};

module.exports = { getParser, generic, REGISTRY };
