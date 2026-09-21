const {
  singleString, stripTags, escapeRegex, extractJsonLdJobs, extractJobAnchors,
  flattenLocation, formatSalary, mapEmploymentType, workModeFromDescription,
  splitPreferred, extractJobSkills, extractEligibility
} = require('./helpers');

const jobFromJsonLd = (raw, sourceUrl, company) => {
  const desc = singleString(raw.description) || singleString(raw.title) || '';
  const workMode = mapEmploymentType(raw.employmentType) === 'Internship' ? 'Internship' : (workModeFromDescription([desc, singleString(raw.description), raw.employmentType].join(' ')) || null);

  const job = {
    company: company.name,
    title: singleString(raw.title) || singleString(raw.jobTitle) || singleString(raw.name) || 'Untitled position',
    role: singleString(raw.title) || singleString(raw.jobTitle) || singleString(raw.name) || null,
    description: singleString(raw.description) || null,
    location: flattenLocation(raw.jobLocation) || singleString(raw.location) || null,
    workMode,
    jobType: mapEmploymentType(raw.employmentType),
    salary: formatSalary(raw.baseSalary) || null,
    applyUrl: singleString(raw.url) || null,
    externalJobId: singleString(raw.identifier) || singleString(raw['@id']) || null,
    sourceUrl,
    datePosted: singleString(raw.datePosted) || null,
    deadline: singleString(raw.validThrough) || null,
    employmentTypeRaw: singleString(raw.employmentType) || null,
    keywords: (raw.skills && Array.isArray(raw.skills) ? raw.skills.map(s => singleString(s)).filter(Boolean) : []) || null,
    isRemote: /(remote|work from home|wfh)/i.test(singleString(raw.description) || '')
  };
  const { requiredSkills, preferredSkills } = extractJobSkills({
    title: job.title,
    description: singleString(raw.description),
    qualifications: [singleString(raw.qualifications), singleString(raw.educationRequirements)].filter(Boolean).join(' '),
    skills: job.keywords
  });
  job.requiredSkills = requiredSkills;
  job.preferredSkills = preferredSkills;
  const eligibility = extractEligibility([singleString(raw.description), singleString(raw.qualifications), singleString(raw.educationRequirements)].join(' '));
  Object.assign(job, eligibility);
  return job;
};

const jobFromAnchor = (anchor, sourceUrl, company) => ({
  company: company.name,
  title: anchor.title || null,
  role: anchor.title || null,
  description: null,
  location: null,
  workMode: null,
  jobType: null,
  salary: null,
  applyUrl: anchor.applyUrl || null,
  externalJobId: anchor.applyUrl || null,
  sourceUrl,
  datePosted: null,
  deadline: null,
  employmentTypeRaw: null,
  keywords: null,
  isRemote: false,
  requiredSkills: [],
  preferredSkills: [],
  minCgpa: null, maxBacklogs: null, minTenthPercentage: null, minTwelfthPercentage: null,
  graduationYear: null, experience: null, departments: []
});

const wrapper = (job) => ({
  ...job,
  description: job.description || job.title || null,
  location: job.location || 'Not specified',
  workMode: job.workMode || 'Not specified',
  jobType: job.jobType || 'Not specified',
  salary: job.salary || 'Not specified'
});

const parse = ({ html, sourceUrl, company }) => {
  const jobs = [];
  try {
    const jsonLd = extractJsonLdJobs(String(html || ''));
    for (const raw of jsonLd) {
      const job = jobFromJsonLd(raw, sourceUrl, company);
      if (job.title) jobs.push(wrapper(job));
    }
  } catch (_) { /* fall through to anchor extraction */ }
  if (jobs.length === 0) {
    try {
      const anchors = extractJobAnchors(String(html || ''), sourceUrl);
      for (const a of anchors.slice(0, 30)) {
        const job = jobFromAnchor(a, sourceUrl, company);
        if (job.title) jobs.push(wrapper(job));
      }
    } catch (_) { /* keep whatever we found */ }
  }
  return { jobs, parser: 'generic' };
};

module.exports = { parse };
