// Company career sync service
// ---------------------------
// Deterministic, conservative, safe automatic syncing of official company
// career pages into Placement Drives.
//
// SAFETY / CORRECTNESS CONTRACT (must never be violated):
//  1. SSRF guard: only https; redirect chains must stay on the company's
//     registered careers host; no IP-literal/link-local/private target.
//  2. robots.txt honoured for the PlacementDriveSyncBot UA; failure to verify
//     -> manual_required, never a guess.
//  3. We never invent a requirement. Unconfident extracts stay null so the
//     drive stores "Not specified" and eligibility never blocks on a guess.
//  4. Dedupe on a stable syncKey per company; re-sync updates (never dups);
//     manualOverride fields are always preserved.
//  5. No-longer-listed jobs are closed (syncStatus no-longer-listed), existing
//     registrations kept.
//  6. Single scheduler instance with cooldowns + one-at-a-time execution.

const fs = require('fs-extra');
const path = require('path');

const { singleString, cleanText, stripTags, escapeRegex, flattenLocation,
        formatSalary, mapEmploymentType, workModeFromDescription, splitPreferred,
        extractJobSkills, extractEligibility } = require('./parsers/helpers');
const { getParser } = require('./parsers');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SYNC_USER_AGENT = 'PlacementDriveSyncBot/1.0 (+https://placement-drive-management-portal.local; admin sync)';
const FETCH_TIMEOUT_MS = 12000;
const ROBOTS_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const SEQUENTIAL_DELAY_MS = 800;
const MANUAL_COOLDOWN_MS = 60 * 1000;
const AUTO_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const ROBOTS_ALLOW_MIN = null; // no min; absence of robots.txt => allowed

const readData = (file) => {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  return fs.readJsonSync(p);
};
const writeData = (file, data) => {
  const p = path.join(DATA_DIR, file);
  fs.writeJsonSync(p, data, { spaces: 2 });
};

// Host helpers
const hostOf = (url) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch (_) { return null; } };

// SSRF + scheme guard. careersUrl must be https and match the recorded host.
const assertSafeUrl = (href, allowedHost) => {
  let u;
  try { u = new URL(href); } catch (_) { return { ok: false, reason: 'Invalid URL.' }; }
  if (u.protocol !== 'https:') return { ok: false, reason: 'Only https URLs are supported.' };
  const host = hostOf(href);
  if (!host || host !== allowedHost) return { ok: false, reason: 'Careers host mismatch (SSRF guard).' };
  if (!/^[a-z0-9.-]+$/.test(host) || host.startsWith('.')) return { ok: false, reason: 'Suspicious careers host.' };
  return { ok: true, url: u.href, host };
};

// robots.txt parsing (RFC 9309-style, minimal but correct for common files)
const parseRobots = (text) => {
  const lines = String(text || '').split(/\r?\n/);
  const groups = [];
  let group = null;
  for (const raw of lines) {
    const line = raw.split('#')[0].trim();
    if (!line) continue;
    const eq = line.indexOf(':');
    if (eq === -1) continue;
    const field = line.slice(0, eq).trim().toLowerCase();
    const value = line.slice(eq + 1).trim();
    if (field === 'user-agent') {
      group = { agents: [value.toLowerCase()], disallow: [], allow: [] };
      groups.push(group);
    } else if (group) {
      if (field === 'disallow') group.disallow.push(value);
      else if (field === 'allow') group.allow.push(value);
    }
  }
  return groups;
};

const ruleMatcher = (rules, pathname) => {
  const matches = [];
  for (const r of rules) {
    if (r.pattern === '') { matches.push({ type: r.type, len: 0, pattern: r.pattern }); continue; }
    if (pathname.startsWith(r.pattern)) matches.push({ type: r.type, len: r.pattern.length, pattern: r.pattern });
  }
  if (matches.length === 0) return true;
  matches.sort((a, b) => b.len - a.len || (a.type === 'allow' ? -1 : 1));
  return matches[0].type === 'allow';
};

// Whether PlacementDriveSyncBot may fetch `path` on this host.
const isAllowedByRobots = async (baseUrl, ua) => {
  try {
    const { host } = assertSafeUrl(baseUrl, hostOf(baseUrl));
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ROBOTS_TIMEOUT_MS);
    let body = '';
    try {
      const resp = await fetch(robotsUrl, { headers: { 'User-Agent': ua, Accept: 'text/plain' }, signal: controller.signal, redirect: 'follow' });
      if (resp.ok) body = await resp.text();
    } finally { clearTimeout(timer); }
    if (!body) return true; // no robots.txt / empty => allowed (no rules)
    const groups = parseRobots(body);
    const relevant = groups.filter(g => g.agents.some(a => a === '*' || (ua || '').toLowerCase().includes(a))) || [];
    const rules = [];
    for (const g of relevant) { for (const d of g.disallow) rules.push({ type: 'disallow', pattern: d }); for (const a of g.allow) rules.push({ type: 'allow', pattern: a }); }
    if (rules.length === 0) return true;
    const pathToCheck = new URL(baseUrl).pathname;
    return ruleMatcher(rules, pathToCheck);
  } catch (_) { return null; } // unverifiable => require manual
};

// Fetch career page HTML with SSRF + robots + timeouts + size guard.
const fetchCareerPage = async (company) => {
  const careers = assertSafeUrl(company.careersUrl, company.syncHost || hostOf(company.careersUrl));
  if (!careers.ok) throw new Error(careers.reason);
  const allowed = await isAllowedByRobots(careers.url, SYNC_USER_AGENT);
  if (allowed === null) throw new Error('Could not verify robots.txt; manual sync required.');
  if (allowed === false) throw new Error('robots.txt disallows this sync; manual sync required.');
  let current = careers.url;
  let redirects = 0;
  while (true) {
    if (redirects > MAX_REDIRECTS) throw new Error('Too many redirects; manual sync required.');
    const guard = assertSafeUrl(current, careers.host);
    if (!guard.ok) throw new Error('Redirect left the careers host (SSRF guard); manual sync required.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(current, { headers: { 'User-Agent': SYNC_USER_AGENT, Accept: 'text/html,application/xhtml+xml' }, signal: controller.signal, redirect: 'manual' });
    } catch (e) {
      clearTimeout(timer);
      if (e && e.name === 'AbortError') throw new Error('Career page timed out; manual sync required.');
      throw new Error('Could not reach career page; manual sync required.');
    } finally { clearTimeout(timer); }
    if (resp.status >= 300 && resp.status < 400 && resp.headers.get('location')) {
      const loc = resp.headers.get('location');
      try { current = new URL(loc, current).href; } catch (_) { throw new Error('Invalid redirect target; manual sync required.'); }
      redirects++;
      continue;
    }
    if (resp.status === 403 || resp.status === 401) throw new Error('Careers site behind bot-check/login; manual sync required.');
    if (resp.status === 404) throw new Error('Career page not found; manual sync required.');
    if (!resp.ok) throw new Error('Careers site returned an error; manual sync required.');
    const contentType = String(resp.headers.get('content-type') || '');
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error('Career page is not HTML; manual sync required.');
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > MAX_HTML_BYTES) throw new Error('Career page too large; manual sync required.');
    return { html: buf.toString('utf8'), finalUrl: current };
  }
};

// Build the drive payload from a parsed job, strictly conservative.
const buildDrivePayload = (company, job, sourceUrl) => {
  const skills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  const preferred = Array.isArray(job.preferredSkills) ? job.preferredSkills : [];
  const allSkills = Array.from(new Set([...skills, ...preferred].filter(Boolean)));
  const now = new Date().toISOString();
  return {
    company: singleString(company.name),
    role: singleString(job.title) || singleString(job.role) || 'Not specified',
    description: singleString(job.description) || null,
    location: singleString(job.location) || 'Not specified',
    workMode: singleString(job.workMode) || 'Not specified',
    jobType: singleString(job.jobType) || 'Not specified',
    salary: singleString(job.salary) || 'Not specified',
    requiredSkills: skills,
    preferredSkills: preferred,
    skills: allSkills,
    minimumSkillsRequired: skills.length,
    minCgpa: typeof job.minCgpa === 'number' ? job.minCgpa : null,
    maxBacklogs: typeof job.maxBacklogs === 'number' ? job.maxBacklogs : null,
    minTenthPercentage: typeof job.minTenthPercentage === 'number' ? job.minTenthPercentage : null,
    minTwelfthPercentage: typeof job.minTwelfthPercentage === 'number' ? job.minTwelfthPercentage : null,
    graduationYear: typeof job.graduationYear === 'number' ? job.graduationYear : null,
    graduationYearStart: null,
    experience: typeof job.experience === 'number' ? job.experience : null,
    departments: Array.isArray(job.departments) ? job.departments : [],
    driveDate: singleString(job.datePosted) || null,
    deadline: singleString(job.deadline) || null,
    status: 'draft',
    sourceType: 'official',
    sourceUrl,
    officialApplyUrl: singleString(job.applyUrl) || singleString(job.sourceUrl) || null,
    registrationUrl: singleString(job.applyUrl) || null,
    externalJobId: singleString(job.externalJobId) || null,
    syncKey: `${String(company.id)}|${String(job.externalJobId || job.applyUrl || '')}`,
    syncStatus: 'synced',
    syncHistory: [{ status: 'synced', at: now }],
    lastSyncedAt: now,
    updatedAt: now,
    createdAt: now,
    manualOverride: {}
  };
};

// Upsert a drive. Dedupe by syncKey; preserve manualOverride fields.
const upsertDrive = (drives, payload, manualOverride) => {
  const idx = drives.findIndex(d => d.syncKey === payload.syncKey && d.syncStatus !== 'closed-by-sync');
  if (idx !== -1) {
    const existing = drives[idx];
    const next = { ...existing, ...payload, updatedAt: new Date().toISOString(), lastSyncedAt: payload.lastSyncedAt, syncStatus: 'synced' };
    if (existing.manualOverride && typeof existing.manualOverride === 'object') {
      for (const f of Object.keys(existing.manualOverride)) if (existing.manualOverride[f] && payload[f] !== undefined && f in next) next[f] = existing[f];
    }
    drives[idx] = next;
    return { drive: next, created: false };
  }
  const drive = { id: Date.now().toString(), ...payload };
  drives.push(drive);
  return { drive, created: true };
};

// Close drives that the company no longer lists (job gone).
const closeNoLongerListed = (drives, company, activeSyncKeys, manualOverride) => {
  const now = new Date().toISOString();
  let closed = 0;
  for (const d of drives) {
    if (d.sourceType !== 'official' || String(d.sourceCompanyId || '') !== String(company.id || '')) continue;
    if (d.syncStatus === 'no-longer-listed') continue;
    if (d.manualOverride && d.manualOverride.status) continue;
    if (activeSyncKeys.has(d.syncKey)) continue;
    if (d.status !== 'draft' && d.status !== 'published') continue;
    d.status = 'closed';
    d.syncStatus = 'no-longer-listed';
    d.updatedAt = now;
    closed++;
  }
  return closed;
};

const runCompanySync = async (company, { browserMode = false } = {}) => {
  const now = new Date().toISOString();
  try {
    const { html, finalUrl } = await fetchCareerPage(company);
    const parser = getParser(company);
    const result = parser.parse({ html, sourceUrl: finalUrl, company });
    const jobs = Array.isArray(result && result.jobs) ? result.jobs : [];
    if (jobs.length === 0) throw new Error('No job postings found on the page.');
    const drives = readData('drives.json');
    const activeSyncKeys = new Set();
    let created = 0, updated = 0;
    for (const job of jobs) {
      const payload = buildDrivePayload(company, job, finalUrl);
      payload.sourceCompanyId = company.id;
      const key = payload.syncKey;
      const existed = drives.some(d => d.syncKey === key && d.syncStatus !== 'closed-by-sync');
      const res = upsertDrive(drives, payload, {});
      activeSyncKeys.add(key);
      if (res.created) created++; else updated++;
    }
    const closedCount = closeNoLongerListed(drives, company, activeSyncKeys, {});
    writeData('drives.json', drives);
    company.syncStatus = 'synced';
    company.syncMode = company.syncMode || 'hybrid';
    company.lastSyncedAt = now;
    company.jobsFound = jobs.length;
    company.lastError = null;
    writeData('companies.json', readData('companies.json').map(c => c.id === company.id ? company : c));
    return { companyId: company.id, jobsFound: jobs.length, created, updated, closed: closedCount, syncedAt: now, status: 'synced', parser: result.parser };
  } catch (err) {
    company.syncStatus = 'manual_required';
    company.lastError = singleString(err && err.message) || 'Sync failed';
    company.lastSyncedAt = company.lastSyncedAt || now;
    writeData('companies.json', readData('companies.json').map(c => c.id === company.id ? company : c));
    return { companyId: company.id, status: 'manual_required', error: company.lastError };
  }
};

// Scheduler (single instance, cooldown, one company at a time)
let schedulerHandle = null;
let syncInProgress = false;
let lastManualRunAt = null;

const startScheduler = ({ now = false } = {}) => {
  if (typeof global.__companySyncSchedulerStarted !== 'undefined') return;
  const tick = async () => {
    if (syncInProgress) return;
    syncInProgress = true;
    try {
      const companies = readData('companies.json').filter(c => c.syncEnabled);
      for (const c of companies) {
        if (!c.syncEnabled) continue;
        await runCompanySync(c);
        await new Promise(r => setTimeout(r, SEQUENTIAL_DELAY_MS));
      }
    } finally { syncInProgress = false; }
  };
  schedulerHandle = setInterval(tick, AUTO_COOLDOWN_MS);
  if (now) setTimeout(tick, 2000);
  global.__companySyncSchedulerStarted = true;
};

const runManualSync = async (companyId) => {
  if (syncInProgress) return { inProgress: true };
  if (lastManualRunAt && (Date.now() - lastManualRunAt) < MANUAL_COOLDOWN_MS) return { throttled: true };
  lastManualRunAt = Date.now();
  syncInProgress = true;
  try {
    const companies = readData('companies.json');
    if (companyId) {
      const company = companies.find(c => String(c.id) === String(companyId));
      if (!company) return { notFound: true };
      return await runCompanySync(company);
    }
    const results = [];
    for (const c of companies.filter(x => x.syncEnabled)) {
      results.push(await runCompanySync(c));
      await new Promise(r => setTimeout(r, SEQUENTIAL_DELAY_MS));
    }
    return { results };
  } finally { syncInProgress = false; }
};

const getSyncStatus = (companyId) => {
  const c = readData('companies.json').find(x => String(x.id) === String(companyId));
  if (!c) return null;
  return {
    id: c.id, name: c.name, syncEnabled: !!c.syncEnabled, syncMode: c.syncMode || 'hybrid',
    syncStatus: c.syncStatus || 'pending', lastSyncedAt: c.lastSyncedAt || null,
    jobsFound: c.jobsFound || 0, lastError: c.lastError || null, inProgress: syncInProgress
  };
};

const getSyncOverview = () => {
  const companies = readData('companies.json');
  const drives = readData('drives.json');
  const officialDraft = drives.filter(d => d.sourceType === 'official' && d.status === 'draft').length;
  const officialPublished = drives.filter(d => d.sourceType === 'official' && d.status === 'published').length;
  const closed = drives.filter(d => d.syncStatus === 'no-longer-listed').length;
  return {
    companies: companies.map(c => ({ id: c.id, name: c.name, careersUrl: c.careersUrl || null, ...getSyncStatus(c.id) })),
    totals: {
      officialDrives: officialDraft + officialPublished,
      draft: officialDraft,
      published: officialPublished,
      closedNoLongerListed: closed,
      syncEnabled: companies.filter(c => c.syncEnabled).length,
      manualRequired: companies.filter(c => c.syncStatus === 'manual_required').length
    },
    inProgress: syncInProgress
  };
};

module.exports = {
  runCompanySync, runManualSync, startScheduler, getSyncStatus, getSyncOverview,
  fetchCareerPage, buildDrivePayload, upsertDrive, isAllowedByRobots, assertSafeUrl
};
