// Deterministic, conservative text-extraction helpers shared by every company
// career parser and the company sync service.
//
// RULES THAT MUST NEVER BE VIOLATED:
//  * We never GUESS a value. If a number/date/skill cannot be extracted with
//    confidence we return null (or an empty array) so the drive stores a
//    clear "Not specified" and eligibility never blocks on invented criteria.
//  * Everything here is pure Node (no external deps) and runnable in tests.
//  * Output MUST be JSON-serialisable (no functions, no circular refs).

const singleString = (value) => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(singleString).filter(Boolean).join(', ') || null;
  if (typeof value === 'object') return null;
  return String(value).trim() || null;
};

const cleanText = (value) => singleString(value);

const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const escapeRegex = (str) => String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const collectJobPostings = (node, jobs, depth = 0, maxDepth = 8) => {
  if (depth > maxDepth || node === null || node === undefined) return;
  if (Array.isArray(node)) { for (const n of node) collectJobPostings(n, jobs, depth + 1, maxDepth); return; }
  if (typeof node === 'object' && !Array.isArray(node)) {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.includes('JobPosting')) { jobs.push(node); return; }
    for (const key of Object.keys(node)) collectJobPostings(node[key], jobs, depth + 1, maxDepth);
  }
};

const extractJsonLdJobs = (html) => {
  const jobs = [];
  const scripts = String(html || '').match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of scripts) {
    const body = block.replace(/^\s*<script[^>]*>\s*/i, '').replace(/\s*<\/script>\s*$/i, '');
    let data = null;
    try { data = JSON.parse(body.trim()); } catch (_) { continue; }
    collectJobPostings(data, jobs);
  }
  return jobs;
};

const extractJobAnchors = (html, sourceUrl, host) => {
  const anchors = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m = null;
  while ((m = re.exec(String(html || ''))) !== null) {
    const href = m[1];
    if (!href || /^(javascript:|mailto:|tel:)/i.test(href)) continue;
    const lower = href.toLowerCase();
    if (!/(job|career|position|opening|vacanc|apply|recruit|hiring)/.test(lower)) continue;
    let absolute = null;
    try {
      absolute = /^https?:\/\//i.test(href) ? href : new URL(href, sourceUrl).href;
    } catch (_) { continue; }
    if (host && new URL(absolute).host !== host) continue;
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    anchors.push({ applyUrl: absolute, title: stripTags(m[2]).slice(0, 300) || null });
  }
  return anchors;
};

const flattenLocation = (node) => {
  const pick = (o) => {
    if (!o) return null;
    if (Array.isArray(o)) { const parts = o.map(pick).filter(Boolean); return Array.from(new Set(parts)).join(', '); }
    if (typeof o === 'string') return cleanText(o);
    if (typeof o === 'object') {
      const name = cleanText(o.name);
      const adr = cleanText(o.address) || [cleanText(o.addressLocality), cleanText(o.addressRegion), cleanText(o.addressCountry)].filter(Boolean).join(', ');
      if (adr) return adr;
      if (name) return name;
      return cleanText(o['@id']);
    }
    return null;
  };
  return node ? pick(node) : null;
};

const formatSalary = (baseSalary) => {
  const fmt = (o) => {
    if (!o || typeof o !== 'object') return null;
    const curr = cleanText(o.currency) || '';
    const val = (v) => (v === null || v === undefined) ? null : String(v);
    if (o['@type'] === 'MonetaryAmount') {
      const cur = cleanText(o.currency) || '';
      if (o.minValue !== undefined && o.maxValue !== undefined) return `${String(o.minValue)} - ${String(o.maxValue)}${cur ? ' ' + cur : ''}`;
      if (o.value && typeof o.value === 'object') return fmt(o.value);
      if (o.value !== undefined && o.value !== null) return `${String(o.value)}${cur ? ' ' + cur : ''}`;
    }
    return null;
  };
  if (baseSalary === null || baseSalary === undefined) return null;
  if (typeof baseSalary === 'string') return cleanText(baseSalary);
  if (typeof baseSalary === 'object') return fmt(baseSalary);
  return null;
};

const mapEmploymentType = (employmentType) => {
  const t = String(employmentType || '').toLowerCase().replace(/[\s_-]+/g, '-').trim();
  if (!t) return null;
  if (t.includes('full')) return 'Full-time';
  if (t.includes('part')) return 'Part-time';
  if (t.includes('contract')) return 'Contract';
  if (t.includes('temp')) return 'Temporary';
  if (t.includes('intern')) return 'Internship';
  return null;
};

const workModeFromDescription = (text) => {
  const t = String(text || '').toLowerCase();
  if (/(work from home|remote|wfh)/.test(t)) return 'Remote';
  if (/(hybrid|flexible)/.test(t)) return 'Hybrid';
  if (/(on[- ]site|office|in[- ]office)/.test(t)) return 'On-site';
  return null;
};

const splitPreferred = (value) => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map(splitPreferred).flat().filter(Boolean).map(s => s.trim());
  if (typeof value === 'string' && value.includes(',')) return value.split(',').map(s => s.trim()).filter(Boolean);
  return [cleanText(value)].filter(Boolean);
};

const extractJobSkills = ({ title, description, qualifications, skills }) => {
  const lower = [title, description, Array.isArray(qualifications) ? qualifications.join(' ') : qualifications, Array.isArray(skills) ? skills.join(' ') : skills].filter(Boolean).join(' ').toLowerCase();
  const required = [];
  const preferred = [];
  const tokens = lower.match(/[a-z][a-z0-9+#.-]{1,30}/g) || [];
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  const aliasMap = {
    'c++': ['c++', 'cpp'], 'javascript': ['javascript', 'js', 'es6'], 'node.js': ['nodejs', 'node.js', 'node js'],
    'react.js': ['react', 'reactjs', 'react.js', 'react js'], 'typescript': ['typescript'], 'python': ['python', 'py'],
    'aws': ['aws', 'amazon web services'], 'azure': ['azure'], 'sql': ['sql'],
    'html': ['html', 'html5'], 'css': ['css', 'css3'], 'java': ['java', 'core java'],
    'c#': ['c#', 'csharp'], 'c': ['c'], 'sql': ['sql', 'mysql'],
    'mongodb': ['mongodb', 'mongo'], 'git': ['git', 'github'],
    'agile': ['agile', 'scrum'], 'machine learning': ['machine learning', 'ml'],
    'docker': ['docker', 'docker'], 'kubernetes': ['kubernetes', 'k8s']
  };
  for (const [skill, aliases] of Object.entries(aliasMap)) {
    const count = aliases.reduce((acc, a) => acc + (freq[a] || 0), 0);
    if (count >= 2) required.push(skill);
    else if (count === 1) preferred.push(skill);
  }
  return { requiredSkills: Array.from(new Set(required)).slice(0, 10), preferredSkills: Array.from(new Set(preferred)).slice(0, 5) };
};

const extractEligibility = (text) => {
  const lower = String(text || '').toLowerCase();
  const el = {
    minCgpa: null, maxBacklogs: null, minTenthPercentage: null, minTwelfthPercentage: null,
    graduationYear: null, experience: null, departments: []
  };
  const cgpa = lower.match(/(?:cgpa|gpa)\s*(?:of\s*|>=?\s*|:)?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (cgpa && cgpa[1] && parseFloat(cgpa[1]) >= 5 && parseFloat(cgpa[1]) <= 10) el.minCgpa = parseFloat(cgpa[1]);
  const backlog = lower.match(/(?:backlog|arrear)\w*\s*(?:<=|<\s*=|:|\:)\s*([0-9]+)/);
  if (backlog && backlog[1]) el.maxBacklogs = parseInt(backlog[1], 10);
  if (/no backlog|backlog[s]*\s*(?:free|nil|none)|0 backlog|zero backlog/.test(lower)) el.maxBacklogs = 0;
  const tenth = lower.match(/(?:10th|tenth|ssc|class\s*10|x)[^\d]{0,20}([0-9]{2}(?:\.[0-9]+)?)\s*%/);
  const tenthEq = lower.match(/([0-9]{2}(?:\.[0-9]+)?)\s*%\s*(?:and above|or above|above)\s*(?:in)?\s*(?:10th|tenth|ssc)/);
  if (tenth && tenth[1]) { const v = parseFloat(tenth[1]); if (v >= 30 && v <= 100) el.minTenthPercentage = v; }
  if (tenthEq && tenthEq[1]) { const v = parseFloat(tenthEq[1]); if (v >= 30 && v <= 100) el.minTenthPercentage = v; }
  const twelfth = lower.match(/(?:12th|twelfth|hsc|inter|class\s*12|xii)[^\d]{0,20}([0-9]{2}(?:\.[0-9]+)?)\s*%/);
  const twelfthEq = lower.match(/([0-9]{2}(?:\.[0-9]+)?)\s*%\s*(?:and above|or above|above)\s*(?:in)?\s*(?:12th|twelfth|hsc)/);
  if (twelfth && twelfth[1]) { const v = parseFloat(twelfth[1]); if (v >= 30 && v <= 100) el.minTwelfthPercentage = v; }
  if (twelfthEq && twelfthEq[1]) { const v = parseFloat(twelfthEq[1]); if (v >= 30 && v <= 100) el.minTwelfthPercentage = v; }
  const yr = lower.match(/\b(202[0-9]|203[0-9])\s*(?:\bbatch\b|\bof\s+passing\b|\bpass\s*out\b)?/);
  if (yr && yr[1]) el.graduationYear = parseInt(yr[1], 10);
  const exp = lower.match(/(?:experience)\s*(?:of\s*|:\s*)?([0-9]+)\s*(\+?\s*(?:years|yrs)?)/);
  if (exp && exp[1]) el.experience = parseInt(exp[1], 10);
  const deptMap = { cse: 'CSE', 'computer science': 'CSE', 'information technology': 'IT', it: 'IT', ece: 'ECE', 'electronics': 'ECE', 'electronics and communication': 'ECE', eee: 'EEE', mech: 'MECH', 'mechanical': 'MECH', civil: 'CIVIL', mca: 'MCA', mba: 'MBA', bca: 'BCA', 'cs/it': 'CSE' };
  for (const [k, v] of Object.entries(deptMap)) {
    if (new RegExp(`\\b${k.replace(/[.+\-]/g, '\\$&')}\\b`).test(lower) && !el.departments.includes(v)) el.departments.push(v);
  }
  el.departments = el.departments.slice(0, 12);
  return el;
};

module.exports = {
  singleString, cleanText, stripTags, escapeRegex, collectJobPostings, extractJsonLdJobs,
  extractJobAnchors, flattenLocation, formatSalary, mapEmploymentType, workModeFromDescription,
  splitPreferred, extractJobSkills, extractEligibility
};
