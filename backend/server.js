require('dotenv').config();
const { execSync } = require('child_process');
const express = require('express');
const cors = require('cors');
let bcrypt;
try { bcrypt = require('bcrypt'); } catch (_) { bcrypt = require('bcryptjs'); }
const jwt = require('jsonwebtoken');
const { calculateEligibility } = require('./services/eligibility');
const { generateId, getAll, getById, findItem, create, update, remove } = require('./utils/db');
const corsMiddleware = require('./middleware/cors');
const { authenticateToken, requireRole } = require('./middleware/auth');
const pool = require('./db/pool');
const config = require('./config');

const app = express();

if (process.env.MIGRATE_ON_START === 'true') {
  console.log('Running one-time migration...');
  try {
    execSync('node db/migrate.js', { stdio: 'inherit', cwd: __dirname });
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed. Server will not start.');
    process.exit(1);
  }
}

async function repairCompanyIds() {
  try {
    const result = await pool.query(
      `UPDATE drives SET "company_id" = c.id FROM companies c WHERE TRIM(drives.company) = TRIM(c.name) AND drives.company_id IS DISTINCT FROM c.id RETURNING drives.id, drives.company, drives."company_id", c.id as matched_company_id`
    );
    console.log('company_id repair completed: ' + result.rows.length + ' drives updated.');
    if (result.rows.length > 0) {
      for (const r of result.rows.slice(0, 5)) {
        console.log('  ' + r.company + ' -> ' + r.matched_company_id);
      }
    }
  } catch (err) {
    console.error('company_id repair failed:', err.message);
  }
}

const PORT = process.env.PORT || 5000;
const JWT_SECRET = config.jwtSecret;
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);

app.use(corsMiddleware);
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const loginAttempts = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 20;
  let entry = loginAttempts.get(ip);
  if (!entry || now - entry.start > windowMs) entry = { start: now, count: 0 };
  entry.count += 1;
  loginAttempts.set(ip, entry);
  if (entry.count > max) return res.status(429).json({ message: 'Too many login attempts. Try again later.' });
  next();
}

function getRole(user) {
  if (!user) return null;
  if (user.role) return user.role;
  if (Array.isArray(user.roles) && user.roles[0]) return user.roles[0];
  return null;
}
function isAdmin(req) { return getRole(req.user) === 'admin'; }

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, (err, user) => { if (!err) req.user = user; next(); });
}

async function findStudentForUser(user) {
  if (!user) return null;
  if (user.id) { const byId = await getById('students.json', user.id); if (byId) return byId; }
  if (user.email) { const byEmail = await findItem('students.json', s => String(s.email).toLowerCase() === String(user.email).toLowerCase()); if (byEmail) return byEmail; }
  return null;
}

function sanitizeUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

async function addActivityLog(action, user, details, req) {
  try {
    const email = (user && user.email) || 'system';
    const role = (user && (user.role || (user.roles && user.roles[0]))) || 'unknown';
    await create('activityLog.json', { id: generateId(), date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString(), action, user: email, role, details: String(details || ''), ip: req.ip || '127.0.0.1' });
  } catch (_) {}
}

async function createNotification({ userId = null, recipient = 'all', type = 'general', title = '', message = '', driveId = null }) {
  try {
    return await create('notifications.json', { id: generateId(), userId: userId || null, recipient: userId || recipient || 'all', type, title: title || message || type, message: message || title || '', driveId: driveId || null, read: false, createdAt: new Date().toISOString() });
  } catch (_) { return null; }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DRIVE_STATUSES = ['draft', 'published', 'open', 'closed', 'cancelled'];
const REG_STATUSES = ['REGISTERED', 'APPLIED', 'SHORTLISTED', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
const NOTIF_TYPES = ['general', 'new_drive', 'application_submitted', 'shortlisted', 'rejected', 'selected', 'schedule_created', 'schedule_changed', 'deadline_approaching', 'drive_cancelled'];

function normalizeStatus(s) {
  if (!s) return s;
  const low = String(s).toLowerCase();
  return low === 'open' ? 'published' : low;
}
function isDriveOpen(drive) {
  if (!drive) return false;
  return String(drive.status || '').toLowerCase() === 'published' || String(drive.status || '').toLowerCase() === 'open';
}
function isDeadlinePassed(drive) {
  if (!drive || !drive.deadline) return false;
  const d = new Date(drive.deadline);
  if (isNaN(d)) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return d < today;
}
function parseSkillsInput(v) {
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(/[,;|/\n]+/).map(s => s.trim()).filter(Boolean);
  return [];
}
function parseDeptInput(v) {
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}
function parseGradYearsInput(v, fallbackKeys) {
  const out = [];
  const push = (x) => {
    if (x === null || x === undefined || x === '') return;
    if (Array.isArray(x)) return x.forEach(push);
    if (typeof x === 'string' && x.includes(',')) return x.split(',').map(s => s.trim()).forEach(push);
    const n = parseInt(x, 10);
    if (!isNaN(n)) out.push(n);
  };
  push(v);
  if (fallbackKeys) fallbackKeys.forEach(push);
  return Array.from(new Set(out));
}

function validateDriveBody(body, isUpdate) {
  const errors = []; const b = body || {};
  if (!isUpdate) {
    if (!b.company || !String(b.company).trim()) errors.push('Company is required.');
    if (!b.role || !String(b.role).trim()) errors.push('Job role is required.');
  } else {
    if (b.company !== undefined && !String(b.company).trim()) errors.push('Company cannot be empty.');
    if (b.role !== undefined && !String(b.role).trim()) errors.push('Job role cannot be empty.');
  }
  if (b.minCgpa !== undefined && b.minCgpa !== '' && b.minCgpa !== null) { const n = parseFloat(b.minCgpa); if (isNaN(n) || n < 0 || n > 10) errors.push('Minimum CGPA must be between 0 and 10.'); }
  if (b.maxBacklogs !== undefined && b.maxBacklogs !== '' && b.maxBacklogs !== null) { const n = parseInt(b.maxBacklogs, 10); if (isNaN(n) || n < 0) errors.push('Maximum backlogs cannot be negative.'); }
  if (b.minTenthPercentage !== undefined && b.minTenthPercentage !== '' && b.minTenthPercentage !== null) { const n = parseFloat(b.minTenthPercentage); if (isNaN(n) || n < 0 || n > 100) errors.push('Minimum 10th percentage must be between 0 and 100.'); }
  if (b.minTwelfthPercentage !== undefined && b.minTwelfthPercentage !== '' && b.minTwelfthPercentage !== null) { const n = parseFloat(b.minTwelfthPercentage); if (isNaN(n) || n < 0 || n > 100) errors.push('Minimum 12th percentage must be between 0 and 100.'); }
  if (b.maxApplicants !== undefined && b.maxApplicants !== '' && b.maxApplicants !== null) { const n = parseInt(b.maxApplicants, 10); if (isNaN(n) || n < 1) errors.push('Maximum applicants must be at least 1.'); }
  if (b.openings !== undefined && b.openings !== '' && b.openings !== null) { const n = parseInt(b.openings, 10); if (isNaN(n) || n < 0) errors.push('Openings cannot be negative.'); }
  if (b.status !== undefined && b.status !== '' && b.status !== null) { if (!DRIVE_STATUSES.includes(String(b.status).toLowerCase())) errors.push(`Status must be one of: ${DRIVE_STATUSES.join(', ')}.`); }
  if (b.driveDate !== undefined && b.driveDate !== '' && b.driveDate !== null && isNaN(new Date(b.driveDate))) errors.push('Drive date is invalid.');
  if (b.deadline !== undefined && b.deadline !== '' && b.deadline !== null && isNaN(new Date(b.deadline))) errors.push('Deadline is invalid.');
  if (b.minimumSkillsRequired !== undefined && b.minimumSkillsRequired !== '' && b.minimumSkillsRequired !== null) { const n = parseInt(b.minimumSkillsRequired, 10); if (isNaN(n) || n < 1) errors.push('Minimum matching skills must be at least 1.'); }
  return errors;
}

function buildDriveFromBody(body, existing) {
  const b = body || {}; const base = existing ? { ...existing } : {};
  const writable = ['company', 'companyId', 'role', 'description', 'package', 'salary', 'location', 'postedDate', 'postedAt', 'driveDate', 'deadline', 'maxApplicants', 'maximumApplicants', 'minCgpa', 'maxBacklogs', 'eligibleDepartments', 'departments', 'eligibleGraduationYears', 'graduationYears', 'graduationYear', 'minTenthPercentage', 'minTwelfthPercentage', 'requiredSkills', 'skills', 'minimumSkillsRequired', 'minimumMatchingSkills', 'selectionProcess', 'recruitmentProcess', 'status', 'openings', 'workMode', 'jobType', 'stipend', 'interviewLocation', 'genderEligibility', 'bondDetails', 'preferredSkills'];
  for (const k of writable) { if (b[k] !== undefined) base[k] = b[k]; }
  if (base.company) base.company = String(base.company).trim();
  if (base.role) base.role = String(base.role).trim();
  const skillsList = b.requiredSkills !== undefined || b.skills !== undefined ? parseSkillsInput(b.requiredSkills !== undefined && (Array.isArray(b.requiredSkills) ? b.requiredSkills.length : String(b.requiredSkills || '').trim()) ? b.requiredSkills : b.skills) : (existing ? (existing.requiredSkills && existing.requiredSkills.length ? existing.requiredSkills : (existing.skills || [])) : []);
  base.requiredSkills = skillsList; base.skills = skillsList;
  if (b.eligibleDepartments !== undefined || b.departments !== undefined) { base.eligibleDepartments = parseDeptInput(b.eligibleDepartments !== undefined ? b.eligibleDepartments : b.departments); } else if (!base.eligibleDepartments && base.departments) { base.eligibleDepartments = parseDeptInput(base.departments); } else if (!Array.isArray(base.eligibleDepartments)) { base.eligibleDepartments = parseDeptInput(base.eligibleDepartments); }
  const gradYears = parseGradYearsInput(b.eligibleGraduationYears !== undefined ? b.eligibleGraduationYears : (b.graduationYears !== undefined ? b.graduationYears : b.graduationYear), existing && b.eligibleGraduationYears === undefined && b.graduationYears === undefined && b.graduationYear === undefined ? [existing.eligibleGraduationYears, existing.graduationYears, existing.graduationYear] : []);
  if (b.eligibleGraduationYears !== undefined || b.graduationYears !== undefined || b.graduationYear !== undefined || existing) { base.eligibleGraduationYears = gradYears; base.graduationYear = gradYears.length === 1 ? gradYears[0] : (gradYears.length > 1 ? gradYears : (existing ? existing.graduationYear : null)); if (gradYears.length === 0) base.graduationYear = null; }
  const numOrNull = (v) => (v === undefined || v === '' || v === null ? null : (isNaN(parseFloat(v)) ? null : parseFloat(v)));
  const intOrNull = (v) => (v === undefined || v === '' || v === null ? null : (isNaN(parseInt(v, 10)) ? null : parseInt(v, 10)));
  if (b.minCgpa !== undefined) base.minCgpa = numOrNull(b.minCgpa);
  if (b.maxBacklogs !== undefined) base.maxBacklogs = intOrNull(b.maxBacklogs);
  if (b.minTenthPercentage !== undefined) base.minTenthPercentage = numOrNull(b.minTenthPercentage);
  if (b.minTwelfthPercentage !== undefined) base.minTwelfthPercentage = numOrNull(b.minTwelfthPercentage);
  if (b.maxApplicants !== undefined || b.maximumApplicants !== undefined) { const v = b.maxApplicants !== undefined ? b.maxApplicants : b.maximumApplicants; base.maxApplicants = intOrNull(v); }
  if (b.openings !== undefined) base.openings = intOrNull(b.openings);
  if (b.minimumSkillsRequired !== undefined || b.minimumMatchingSkills !== undefined) { const v = b.minimumSkillsRequired !== undefined && b.minimumSkillsRequired !== '' ? b.minimumSkillsRequired : b.minimumMatchingSkills; const n = parseInt(v, 10); base.minimumSkillsRequired = isNaN(n) ? (skillsList.length || 1) : Math.max(1, Math.min(n, Math.max(1, skillsList.length))); } else if (!existing) { base.minimumSkillsRequired = skillsList.length || 1; }
  if (b.status !== undefined && b.status !== '') base.status = String(b.status).toLowerCase();
  if (!base.status) base.status = 'draft';
  if (b.selectionProcess !== undefined) base.selectionProcess = Array.isArray(b.selectionProcess) ? b.selectionProcess : String(b.selectionProcess).split(',').map(s => s.trim()).filter(Boolean);
  if (b.recruitmentProcess !== undefined) base.recruitmentProcess = Array.isArray(b.recruitmentProcess) ? b.recruitmentProcess : String(b.recruitmentProcess).split(',').map(s => s.trim()).filter(Boolean);
  if (base.selectionProcess && !base.recruitmentProcess) base.recruitmentProcess = base.selectionProcess;
  if (base.recruitmentProcess && !base.selectionProcess) base.selectionProcess = base.recruitmentProcess;
  if (b.package !== undefined && base.salary === undefined) base.salary = b.package;
  if (b.salary !== undefined) base.salary = b.salary;
  if (base.package === undefined && base.salary !== undefined) base.package = base.salary;
  return base;
}

function validateCompanyBody(body, isUpdate) {
  const errors = []; const b = body || {};
  if (!isUpdate && (!b.name || !String(b.name).trim())) errors.push('Company name is required.');
  if (b.name !== undefined && !String(b.name).trim()) errors.push('Company name cannot be empty.');
  if (b.website && !/^https?:\/\/.+/i.test(String(b.website))) errors.push('Website must be a valid URL starting with http(s).');
  if (b.careersUrl && !/^https:\/\/.+/i.test(String(b.careersUrl))) errors.push('Careers URL must be a valid https URL.');
  return errors;
}

function validateScheduleBody(body) {
  const errors = []; const b = body || {};
  if (!b.driveId && !b.drive && !b.company) errors.push('Drive reference (driveId) or company is required.');
  if (!b.round && !b.type && !b.title) errors.push('Round / type is required (e.g. Aptitude, Technical, Interview).');
  if (!b.date) errors.push('Date is required.'); else if (isNaN(new Date(b.date))) errors.push('Date is invalid.');
  return errors;
}

// ---------- auth ----------
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const users = await getAll('users.json');
    const user = users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const valid = await bcrypt.compare(String(password), user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
    const accessToken = jwt.sign({ id: user.id, email: user.email, roles: [user.role] }, JWT_SECRET, { expiresIn: '1h' });
    await addActivityLog('LOGIN', user, 'User logged in successfully', req);
    res.json({ accessToken, user: sanitizeUser(user) });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, registerNumber, email, phone, password, college, department, graduationYear, cgpa, backlogs, tenthPercentage, twelfthPercentage, skills } = req.body || {};
    if (!name || !registerNumber || !email || !phone || !password || !department || graduationYear === undefined || cgpa === undefined || backlogs === undefined) return res.status(400).json({ message: 'Please fill all required fields.' });
    if (!EMAIL_RE.test(String(email))) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const cgpaNum = parseFloat(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) return res.status(400).json({ message: 'Please enter a valid CGPA (0 - 10).' });
    const backlogsNum = parseInt(backlogs, 10);
    if (isNaN(backlogsNum) || backlogsNum < 0) return res.status(400).json({ message: 'Please enter a valid number of backlogs.' });
    const gradYearNum = parseInt(graduationYear, 10);
    if (isNaN(gradYearNum) || gradYearNum < 2000 || gradYearNum > 2100) return res.status(400).json({ message: 'Please enter a valid graduation year.' });
    if (tenthPercentage !== undefined && tenthPercentage !== '' && tenthPercentage !== null) { const n = parseFloat(tenthPercentage); if (isNaN(n) || n < 0 || n > 100) return res.status(400).json({ message: '10th percentage must be between 0 and 100.' }); }
    if (twelfthPercentage !== undefined && twelfthPercentage !== '' && twelfthPercentage !== null) { const n = parseFloat(twelfthPercentage); if (isNaN(n) || n < 0 || n > 100) return res.status(400).json({ message: '12th percentage must be between 0 and 100.' }); }
    const users = await getAll('users.json');
    const students = await getAll('students.json');
    if (users.find(u => String(u.email).toLowerCase() === String(email).toLowerCase()) || students.find(s => String(s.email).toLowerCase() === String(email).toLowerCase())) return res.status(400).json({ message: 'Email already registered.' });
    if (students.find(s => String(s.registerNumber).toLowerCase() === String(registerNumber).toLowerCase())) return res.status(400).json({ message: 'Register number already registered.' });
    const skillList = parseSkillsInput(skills);
    const hashed = await bcrypt.hash(String(password), 10);
    const id = generateId();
    const newUser = { id, email: String(email).trim(), password: hashed, role: 'student' };
    await create('users.json', newUser);
    const optionalFilled = [phone, tenthPercentage, twelfthPercentage, skillList.length > 0, college].filter(v => v !== undefined && v !== '' && v !== null && v !== false).length;
    const newStudent = { id, name: String(name).trim(), registerNumber: String(registerNumber).trim(), email: String(email).trim(), phone: String(phone).trim(), college: college ? String(college).trim() : '', department: String(department).trim(), graduationYear: gradYearNum, cgpa: cgpaNum, backlogs: backlogsNum, tenthPercentage: tenthPercentage === undefined || tenthPercentage === '' || tenthPercentage === null ? null : parseFloat(tenthPercentage), twelfthPercentage: twelfthPercentage === undefined || twelfthPercentage === '' || twelfthPercentage === null ? null : parseFloat(twelfthPercentage), skills: skillList, resume: '', profileCompletion: Math.min(100, 60 + optionalFilled * 8), createdAt: new Date().toISOString() };
    await create('students.json', newStudent);
    await addActivityLog('STUDENT_REGISTER', { email, role: 'student' }, `New student registered: ${name} (${registerNumber})`, req);
    await createNotification({ userId: id, recipient: id, type: 'general', title: 'Welcome!', message: 'Your placement account was created. Complete your profile to check eligibility.' });
    res.status(201).json({ message: 'Registration successful!' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await getById('users.json', req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user.id, email: user.email, role: user.role });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---------- drives ----------
app.get('/api/drives', optionalAuth, async (req, res) => {
  let drives = await getAll('drives.json');
  const { department, role, location, workMode, eligibleOnly, graduationYear, search, minSalary, sortBy, includeAll, status } = req.query;
  const admin = isAdmin(req);
  if (!(admin && includeAll === 'true')) {
    if (admin && status) drives = drives.filter(d => String(d.status).toLowerCase() === String(status).toLowerCase());
    else if (!admin && status) { drives = drives.filter(d => isDriveOpen(d) && String(d.status).toLowerCase() === String(status).toLowerCase()); if (!['published', 'open'].includes(String(status).toLowerCase())) drives = []; }
    else drives = drives.filter(isDriveOpen);
  }
  if (search) { const s = String(search).toLowerCase(); drives = drives.filter(d => String(d.company || '').toLowerCase().includes(s) || String(d.role || '').toLowerCase().includes(s) || String(d.location || '').toLowerCase().includes(s)); }
  if (department) { const dep = String(department).toLowerCase(); drives = drives.filter(d => { const list = Array.isArray(d.eligibleDepartments) ? d.eligibleDepartments : (Array.isArray(d.departments) ? d.departments : []); if (!list.length) return true; return list.some(x => String(x).toLowerCase() === dep || String(x).toLowerCase().includes(dep)); }); }
  if (role) drives = drives.filter(d => String(d.role || '').toLowerCase().includes(String(role).toLowerCase()));
  if (location) drives = drives.filter(d => String(d.location || '').toLowerCase().includes(String(location).toLowerCase()));
  if (workMode) drives = drives.filter(d => String(d.workMode || '') === String(workMode));
  if (minSalary) { const minSal = parseInt(minSalary, 10); drives = drives.filter(d => { const sal = parseInt(d.salary, 10); return !isNaN(sal) && sal >= minSal; }); }
  if (graduationYear) { const gy = parseInt(graduationYear, 10); if (!isNaN(gy)) drives = drives.filter(d => { const years = []; if (Array.isArray(d.eligibleGraduationYears)) years.push(...d.eligibleGraduationYears); if (Array.isArray(d.graduationYears)) years.push(...d.graduationYears); if (d.graduationYear !== undefined && d.graduationYear !== null && d.graduationYear !== '') { if (Array.isArray(d.graduationYear)) years.push(...d.graduationYear); else years.push(parseInt(d.graduationYear, 10)); } if (!years.length) return true; return years.map(Number).includes(gy); }); }
  if (eligibleOnly === 'true') { if (!req.user) return res.status(401).json({ message: 'Authentication required for eligibility filter' }); const student = await findStudentForUser(req.user); drives = student ? drives.filter(d => calculateEligibility(student, d).eligible) : []; }
  if (sortBy === 'deadline') drives.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); else if (sortBy === 'salary') drives.sort((a, b) => parseInt(b.salary, 10) - parseInt(a.salary, 10)); else if (sortBy === 'newest') drives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(drives);
});

app.get('/api/drives/eligible', authenticateToken, async (req, res) => {
  const drives = (await getAll('drives.json')).filter(isDriveOpen);
  const student = await findStudentForUser(req.user);
  const result = drives.map(d => {
    if (!student) return { ...d, eligible: false, eligibilityReasons: [{ criterion: 'Profile', required: '', actual: '', message: 'Student profile not found. Please update your profile to check eligibility.' }], skillMatch: { matchedSkills: [], missingSkills: [], matchedCount: 0, minimumRequired: 0 }, checks: {} };
    const r = calculateEligibility(student, d);
    return { ...d, eligible: r.eligible, eligibilityReasons: r.reasons, skillMatch: { matchedSkills: r.matchedSkills, missingSkills: r.missingSkills, matchedCount: r.skillMatchCount, minimumRequired: r.minimumSkillsRequired }, checks: r.checks };
  });
  res.json(result);
});

app.get('/api/drives/:id', optionalAuth, async (req, res) => {
  const drives = await getAll('drives.json');
  const drive = drives.find(d => String(d.id) === String(req.params.id));
  if (!drive) return res.status(404).json({ message: 'Drive not found' });
  if (!isDriveOpen(drive) && !isAdmin(req)) { if (String(drive.status).toLowerCase() === 'draft') return res.status(404).json({ message: 'Drive not found' }); }
  res.json(drive);
});

app.post('/api/drives', authenticateToken, requireRole('admin'), async (req, res) => {
  const errors = validateDriveBody(req.body, false);
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });
  const drives = await getAll('drives.json');
  const companies = await getAll('companies.json');
  const normalized = buildDriveFromBody(req.body, null);
  const now = new Date().toISOString();
  const newDrive = { id: generateId(), ...normalized, createdAt: now, updatedAt: now, createdBy: req.user.email };
  const comp = companies.find(c => String(c.name).toLowerCase() === String(newDrive.company).toLowerCase());
  if (comp) { newDrive.companyId = comp.id; await update('companies.json', comp.id, { totalDrives: drives.filter(d => String(d.company).toLowerCase() === String(comp.name).toLowerCase()).length + 1 }); }
  await create('drives.json', newDrive);
  await addActivityLog('DRIVE_CREATED', req.user, `Created drive: ${newDrive.company} - ${newDrive.role}`, req);
  if (isDriveOpen(newDrive)) await createNotification({ recipient: 'all', type: 'new_drive', title: `New drive: ${newDrive.company}`, message: `${newDrive.company} - ${newDrive.role} is now open. Deadline: ${newDrive.deadline || 'TBA'}`, driveId: newDrive.id });
  res.status(201).json(newDrive);
});

app.put('/api/drives/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const errors = validateDriveBody(req.body, true);
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });
  const drives = await getAll('drives.json');
  const companies = await getAll('companies.json');
  const index = drives.findIndex(d => String(d.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Drive not found' });
  const prevStatus = drives[index].status;
  const normalized = buildDriveFromBody(req.body, drives[index]);
  const comp = companies.find(c => String(c.name).toLowerCase() === String(normalized.company).toLowerCase());
  if (comp) { normalized.companyId = comp.id; }
drives[index] = { ...drives[index], ...normalized, id: drives[index].id, createdAt: drives[index].createdAt, createdBy: drives[index].createdBy, updatedAt: new Date().toISOString() };
  await update('drives.json', req.params.id, { ...normalized, updatedAt: new Date().toISOString() });
  await addActivityLog('DRIVE_UPDATED', req.user, `Updated drive: ${drives[index].company} - ${drives[index].role}`, req);
  if (prevStatus !== drives[index].status) {
    if (isDriveOpen(drives[index])) await createNotification({ recipient: 'all', type: 'new_drive', title: `Drive published: ${drives[index].company}`, message: `${drives[index].company} - ${drives[index].role} is now open.`, driveId: drives[index].id });
    if (String(drives[index].status).toLowerCase() === 'cancelled') {
      const regs = (await getAll('registrations.json')).filter(r => String(r.driveId) === String(drives[index].id));
      const students = await getAll('students.json');
      for (const r of regs) { const st = students.find(s => String(s.id) === String(r.studentId)); if (st) await createNotification({ userId: st.id, recipient: st.id, type: 'drive_cancelled', title: `Drive cancelled: ${drives[index].company}`, message: `${drives[index].company} - ${drives[index].role} was cancelled.`, driveId: drives[index].id }); }
    }
  }
  res.json(drives[index]);
});

app.delete('/api/drives/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const drives = await getAll('drives.json');
  const index = drives.findIndex(d => String(d.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Drive not found' });
  const deleted = drives.splice(index, 1);
  await remove('drives.json', req.params.id);
  await addActivityLog('DRIVE_DELETED', req.user, `Deleted drive: ${deleted[0].company} - ${deleted[0].role}`, req);
  res.json({ message: 'Drive deleted' });
});

app.put('/api/drives/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  const { status } = req.body || {};
  if (!status || !DRIVE_STATUSES.includes(String(status).toLowerCase())) return res.status(400).json({ message: `Status must be one of: ${DRIVE_STATUSES.join(', ')}.` });
  const drives = await getAll('drives.json');
  const index = drives.findIndex(d => String(d.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Drive not found' });
  drives[index].status = String(status).toLowerCase(); drives[index].updatedAt = new Date().toISOString();
  await update('drives.json', req.params.id, { status: String(status).toLowerCase(), updatedAt: new Date().toISOString() });
  await addActivityLog('DRIVE_STATUS_CHANGED', req.user, `Changed ${drives[index].company} status to ${status}`, req);
  if (isDriveOpen(drives[index])) await createNotification({ recipient: 'all', type: 'new_drive', title: `Drive ${status}: ${drives[index].company}`, message: `${drives[index].company} - ${drives[index].role} is now ${status}.`, driveId: drives[index].id });
  if (String(status).toLowerCase() === 'cancelled') {
    const regs = (await getAll('registrations.json')).filter(r => String(r.driveId) === String(drives[index].id));
    for (const r of regs) await createNotification({ userId: r.studentId, recipient: r.studentId, type: 'drive_cancelled', title: `Drive cancelled: ${drives[index].company}`, message: `${drives[index].company} was cancelled.`, driveId: drives[index].id });
  }
  res.json(drives[index]);
});

app.post('/api/drives/:id/duplicate', authenticateToken, requireRole('admin'), async (req, res) => {
  const drives = await getAll('drives.json');
  const original = drives.find(d => String(d.id) === String(req.params.id));
  if (!original) return res.status(404).json({ message: 'Drive not found' });
  const now = new Date().toISOString();
  const duplicate = { ...original, id: generateId(), company: `${original.company} (Copy)`, status: 'draft', createdAt: now, updatedAt: now, createdBy: req.user.email };
  delete duplicate.syncKey;
  await create('drives.json', duplicate);
  await addActivityLog('DRIVE_DUPLICATED', req.user, `Duplicated drive: ${original.company} - ${original.role}`, req);
  res.status(201).json(duplicate);
});

app.get('/api/drives/:id/eligibility', authenticateToken, async (req, res) => {
  const drives = await getAll('drives.json');
  const drive = drives.find(d => String(d.id) === String(req.params.id));
  if (!drive) return res.status(404).json({ message: 'Drive not found' });
  const student = await findStudentForUser(req.user);
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  const eligibility = calculateEligibility(student, drive);
  res.json({ eligible: eligibility.eligible, reasons: eligibility.reasons, drive, student: { id: student.id, name: student.name, email: student.email, department: student.department, graduationYear: student.graduationYear, cgpa: student.cgpa, backlogs: student.backlogs, skills: student.skills }, skillMatch: { matchedSkills: eligibility.matchedSkills, missingSkills: eligibility.missingSkills, matchedCount: eligibility.skillMatchCount, minimumRequired: eligibility.minimumSkillsRequired }, checks: eligibility.checks });
});

app.post('/api/skills/normalize', authenticateToken, async (req, res) => {
  try { const { normalizeSkillList } = require('./services/skillMatching'); res.json({ skills: normalizeSkillList(req.body && req.body.skills) }); } catch (e) { res.status(500).json({ message: 'Skill normalization failed' }); }
});

// ---------- applications ----------
function getRegistrationBlockReason(drive, student, registrations) {
  if (!drive) return 'Drive not found';
  if (!isDriveOpen(drive)) { const s = String(drive.status || '').toLowerCase(); if (s === 'draft') return 'Registration is not open yet (drive is in draft).'; if (s === 'closed') return 'Registration closed (drive is closed).'; if (s === 'cancelled') return 'Registration closed (drive was cancelled).'; return 'Registration closed'; }
  if (isDeadlinePassed(drive)) return 'Application deadline has passed.';
  if (!student) return 'Student profile not found. Please update your profile first.';
  const { eligible, reasons } = calculateEligibility(student, drive);
  if (!eligible) return null;
  const existing = registrations.find(r => String(r.driveId) === String(drive.id) && String(r.studentId) === String(student.id));
  if (existing) return 'Already registered';
  if (drive.maxApplicants !== undefined && drive.maxApplicants !== null && drive.maxApplicants !== '') { const max = parseInt(drive.maxApplicants, 10); if (!isNaN(max)) { const count = registrations.filter(r => String(r.driveId) === String(drive.id)).length; if (count >= max) return 'Maximum applicants reached for this drive.'; } }
  return null;
}

app.post('/api/drives/:id/register', authenticateToken, async (req, res) => {
  const drives = await getAll('drives.json');
  const drive = drives.find(d => String(d.id) === String(req.params.id));
  if (!drive) return res.status(404).json({ message: 'Drive not found' });
  const student = await findStudentForUser(req.user);
  const registrations = await getAll('registrations.json');
  if (!isDriveOpen(drive)) { const s = String(drive.status || '').toLowerCase(); if (s === 'draft') return res.status(400).json({ message: 'Registration is not open yet (drive is in draft).' }); if (s === 'closed') return res.status(400).json({ message: 'Registration closed (drive is closed).' }); if (s === 'cancelled') return res.status(400).json({ message: 'Registration closed (drive was cancelled).' }); return res.status(400).json({ message: 'Registration closed' }); }
  if (isDeadlinePassed(drive)) return res.status(400).json({ message: 'Application deadline has passed.' });
  if (!student) return res.status(400).json({ message: 'Student profile not found. Please update your profile first.' });
  const { eligible, reasons } = calculateEligibility(student, drive);
  if (!eligible) return res.status(400).json({ message: 'You are not eligible for this drive', eligibilityReasons: reasons, reasons });
  const existing = registrations.find(r => String(r.driveId) === String(req.params.id) && String(r.studentId) === String(student.id));
  if (existing) return res.status(400).json({ message: 'Already registered' });
  if (drive.maxApplicants !== undefined && drive.maxApplicants !== null && drive.maxApplicants !== '') { const max = parseInt(drive.maxApplicants, 10); if (!isNaN(max)) { const count = registrations.filter(r => String(r.driveId) === String(req.params.id)).length; if (count >= max) return res.status(400).json({ message: 'Maximum applicants reached for this drive.' }); } }
  const registration = { id: generateId(), studentId: student.id, driveId: String(req.params.id), registeredAt: new Date().toISOString(), status: 'REGISTERED', notes: '' };
  await create('registrations.json', registration);
  await addActivityLog('REGISTERED', { email: student.email, role: 'student' }, `Registered for ${drive.company} - ${drive.role}`, req);
  await createNotification({ userId: student.id, recipient: student.id, type: 'application_submitted', title: `Applied: ${drive.company}`, message: `Your application for ${drive.company} - ${drive.role} was submitted.`, driveId: drive.id });
  res.status(201).json(registration);
});

app.get('/api/registrations', authenticateToken, requireRole('admin'), async (req, res) => { res.json(await getAll('registrations.json')); });

app.get('/api/registrations/my', authenticateToken, async (req, res) => {
  const registrations = await getAll('registrations.json');
  const student = await findStudentForUser(req.user);
  const sid = student ? String(student.id) : String(req.user.id);
  res.json(registrations.filter(r => String(r.studentId) === sid || String(r.studentId) === String(req.user.id)));
});

function normalizeRegStatus(s) { if (!s) return s; const u = String(s).toUpperCase(); return u === 'APPLIED' ? 'REGISTERED' : u; }

app.put('/api/registrations/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  const { status, notes } = req.body || {};
  if (!status || !REG_STATUSES.map(s => s.toUpperCase()).includes(String(status).toUpperCase())) return res.status(400).json({ message: `Status must be one of: Applied, Shortlisted, Rejected, Selected, Withdrawn.` });
  const registrations = await getAll('registrations.json');
  const reg = registrations.find(r => String(r.id) === String(req.params.id));
  if (!reg) return res.status(404).json({ message: 'Registration not found' });
  const oldStatus = reg.status; reg.status = normalizeRegStatus(status); reg.updatedAt = new Date().toISOString();
  if (notes !== undefined) reg.notes = String(notes);
  await update('registrations.json', req.params.id, { status: normalizeRegStatus(status), updatedAt: new Date().toISOString(), notes: notes !== undefined ? String(notes) : reg.notes });
  await addActivityLog('STATUS_CHANGED', req.user, `Changed ${reg.studentId} status from ${oldStatus} to ${reg.status} (drive ${reg.driveId})`, req);
  const drives = await getAll('drives.json');
  const drive = drives.find(d => String(d.id) === String(reg.driveId));
  const label = drive ? `${drive.company} - ${drive.role}` : 'your application';
  if (reg.status === 'SHORTLISTED') await createNotification({ userId: reg.studentId, recipient: reg.studentId, type: 'shortlisted', title: `Shortlisted: ${drive ? drive.company : ''}`, message: `You were shortlisted for ${label}.`, driveId: reg.driveId });
  else if (reg.status === 'SELECTED') await createNotification({ userId: reg.studentId, recipient: reg.studentId, type: 'selected', title: `Selected: ${drive ? drive.company : ''}`, message: `Congratulations! You were selected for ${label}.`, driveId: reg.driveId });
  else if (reg.status === 'REJECTED') await createNotification({ userId: reg.studentId, recipient: reg.studentId, type: 'rejected', title: `Update: ${drive ? drive.company : ''}`, message: `Your application for ${label} was not shortlisted.`, driveId: reg.driveId });
  res.json(reg);
});

app.delete('/api/registrations/:id', authenticateToken, async (req, res) => {
  const registrations = await getAll('registrations.json');
  const idx = registrations.findIndex(r => String(r.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: 'Registration not found' });
  const reg = registrations[idx]; const student = await findStudentForUser(req.user);
  const own = student ? String(reg.studentId) === String(student.id) : String(reg.studentId) === String(req.user.id);
  if (!isAdmin(req) && !own) return res.status(403).json({ message: 'Access denied' });
  if (isAdmin(req)) { await remove('registrations.json', req.params.id); await addActivityLog('REGISTRATION_DELETED', req.user, `Deleted registration ${reg.id}`, req); return res.json({ message: 'Registration deleted' }); }
  reg.status = 'WITHDRAWN'; reg.updatedAt = new Date().toISOString();
  await update('registrations.json', req.params.id, { status: 'WITHDRAWN', updatedAt: new Date().toISOString() });
  await addActivityLog('WITHDRAWN', { email: (student && student.email) || req.user.email, role: 'student' }, `Withdrew application for drive ${reg.driveId}`, req);
  res.json(reg);
});

app.post('/api/registrations/bulk-shortlist', authenticateToken, requireRole('admin'), async (req, res) => {
  const { ids, notes } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids must be a non-empty array.' });
  const registrations = await getAll('registrations.json');
  let count = 0;
  for (const id of ids) { const reg = registrations.find(r => String(r.id) === String(id)); if (reg) { reg.status = 'SHORTLISTED'; reg.updatedAt = new Date().toISOString(); if (notes) reg.notes = String(notes); count++; await createNotification({ userId: reg.studentId, recipient: reg.studentId, type: 'shortlisted', title: 'Shortlisted', message: 'You were shortlisted. Check your applications.', driveId: reg.driveId }); } }
  for (const r of registrations) { if (r.status === 'SHORTLISTED' || r.status === 'REJECTED') await update('registrations.json', r.id, { status: r.status, updatedAt: r.updatedAt, notes: r.notes || '' }); }
  await addActivityLog('BULK_SHORTLIST', req.user, `Bulk shortlisted ${count} students`, req);
  res.json({ message: `${count} students shortlisted` });
});

app.post('/api/registrations/bulk-reject', authenticateToken, requireRole('admin'), async (req, res) => {
  const { ids, notes } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids must be a non-empty array.' });
  const registrations = await getAll('registrations.json');
  let count = 0;
  for (const id of ids) { const reg = registrations.find(r => String(r.id) === String(id)); if (reg) { reg.status = 'REJECTED'; reg.updatedAt = new Date().toISOString(); if (notes) reg.notes = String(notes); count++; await createNotification({ userId: reg.studentId, recipient: reg.studentId, type: 'rejected', title: 'Application update', message: 'Your application was not shortlisted.', driveId: reg.driveId }); } }
  for (const r of registrations) { if (r.status === 'SHORTLISTED' || r.status === 'REJECTED') await update('registrations.json', r.id, { status: r.status, updatedAt: r.updatedAt, notes: r.notes || '' }); }
  await addActivityLog('BULK_REJECT', req.user, `Bulk rejected ${count} students`, req);
  res.json({ message: `${count} students rejected` });
});

// ---------- students ----------
app.get('/api/students', authenticateToken, requireRole('admin'), async (req, res) => { res.json(await getAll('students.json')); });

app.get('/api/students/me', authenticateToken, async (req, res) => {
  const student = await findStudentForUser(req.user);
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  res.json(student);
});

app.get('/api/students/me/dashboard', authenticateToken, async (req, res) => {
  const student = await findStudentForUser(req.user);
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  const drives = (await getAll('drives.json')).filter(isDriveOpen);
  const registrations = await getAll('registrations.json');
  const myRegs = registrations.filter(r => String(r.studentId) === String(student.id) || String(r.studentId) === String(req.user.id));
  const regDriveIds = new Set(myRegs.map(r => String(r.driveId)));
  const withDrive = myRegs.map(r => ({ ...r, drive: drives.find(d => String(d.id) === String(r.driveId)) || null })).sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  const upcomingBase = drives.filter(d => { if (!d.driveDate) return true; const dd = new Date(d.driveDate); if (isNaN(dd)) return true; const today = new Date(); today.setHours(0, 0, 0, 0); dd.setHours(0, 0, 0, 0); return dd >= today; }).sort((a, b) => new Date(a.driveDate) - new Date(b.driveDate));
  const upcomingDrives = upcomingBase.slice(0, 5).map(d => { const e = calculateEligibility(student, d); return { ...d, eligible: e.eligible, eligibilityReasons: e.reasons, skillMatch: { matchedSkills: e.matchedSkills, missingSkills: e.missingSkills, matchedCount: e.skillMatchCount, minimumRequired: e.minimumSkillsRequired }, checks: e.checks, applied: regDriveIds.has(String(d.id)) }; });
  const eligibleCount = drives.filter(d => calculateEligibility(student, d).eligible).length;
  const norm = (s) => String(s || '').toUpperCase();
  res.json({ student: { id: student.id, name: student.name, email: student.email, profileCompletion: student.profileCompletion || 0 }, counts: { available: drives.length, eligible: eligibleCount, registered: myRegs.length, shortlisted: myRegs.filter(r => norm(r.status) === 'SHORTLISTED').length, selected: myRegs.filter(r => norm(r.status) === 'SELECTED').length, rejected: myRegs.filter(r => norm(r.status) === 'REJECTED').length, upcoming: upcomingBase.length }, upcomingDrives, recentApplications: withDrive.slice(0, 5) });
});

app.get('/api/students/:id/applications', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  const registrations = await getAll('registrations.json');
  const drives = await getAll('drives.json');
  const student = (await getAll('students.json')).find(s => String(s.id) === String(req.params.id));
  const regs = registrations.filter(r => String(r.studentId) === String(req.params.id)).map(r => { const drive = drives.find(d => String(d.id) === String(r.driveId)) || null; let eligibility = null; if (student && drive) { const e = calculateEligibility(student, drive); eligibility = { eligible: e.eligible, reasons: e.reasons, skillMatch: { matchedSkills: e.matchedSkills, missingSkills: e.missingSkills, matchedCount: e.skillMatchCount, minimumRequired: e.minimumSkillsRequired }, checks: e.checks }; } return { ...r, drive, eligibility }; }).sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  res.json(regs);
});

app.get('/api/students/:id/drives', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  const registrations = await getAll('registrations.json');
  const drives = await getAll('drives.json');
  const driveIds = new Set(registrations.filter(r => String(r.studentId) === String(req.params.id)).map(r => String(r.driveId)));
  res.json(drives.filter(d => driveIds.has(String(d.id))));
});

app.get('/api/admin/registered-students', authenticateToken, requireRole('admin'), async (req, res) => {
  const registrations = await getAll('registrations.json');
  const drives = await getAll('drives.json');
  const students = await getAll('students.json');
  const { search, drive, driveId, company, department, status, eligibility, sortBy, sortOrder } = req.query;
  let rows = registrations.map(reg => { const student = students.find(s => String(s.id) === String(reg.studentId)) || null; const driveObj = drives.find(d => String(d.id) === String(reg.driveId)) || null; const e = (student && driveObj) ? calculateEligibility(student, driveObj) : { eligible: false, reasons: [] }; return { registrationId: reg.id, registrationDate: reg.registeredAt, applicationStatus: reg.status, notes: reg.notes || '', eligibilityStatus: e.eligible ? 'Eligible' : 'Not Eligible', eligibilityReasons: e.reasons, studentName: student?.name || 'Unknown', registerNumber: student?.registerNumber || '—', email: student?.email || '—', phone: student?.phone || '—', department: student?.department || '—', graduationYear: student?.graduationYear ?? '—', cgpa: student?.cgpa ?? '—', backlogs: student?.backlogs ?? '—', skills: student?.skills || [], resume: student?.resume || '', studentId: student?.id || reg.studentId, company: driveObj?.company || '—', jobRole: driveObj?.role || '—', driveName: driveObj ? `${driveObj.company} - ${driveObj.role}` : '—', driveDate: driveObj?.driveDate || null, deadline: driveObj?.deadline || null, driveId: driveObj?.id || reg.driveId }; });
  if (search) { const s = String(search).toLowerCase(); rows = rows.filter(r => String(r.studentName).toLowerCase().includes(s) || String(r.email).toLowerCase().includes(s) || String(r.registerNumber).toLowerCase().includes(s) || String(r.company).toLowerCase().includes(s)); }
  if (driveId) rows = rows.filter(r => String(r.driveId) === String(driveId));
  if (drive) rows = rows.filter(r => String(r.driveName).toLowerCase().includes(String(drive).toLowerCase()) || String(r.driveId) === String(drive));
  if (company) rows = rows.filter(r => String(r.company).toLowerCase().includes(String(company).toLowerCase()));
  if (department) rows = rows.filter(r => String(r.department).toLowerCase() === String(department).toLowerCase());
  if (status) rows = rows.filter(r => String(r.applicationStatus).toUpperCase() === String(status).toUpperCase());
  if (eligibility) { const want = String(eligibility).toLowerCase(); if (want === 'eligible') rows = rows.filter(r => r.eligibilityStatus === 'Eligible'); else if (want === 'not_eligible' || want === 'not eligible' || want === 'ineligible') rows = rows.filter(r => r.eligibilityStatus !== 'Eligible'); }
  const order = String(sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
  rows.sort((a, b) => { if (sortBy === 'student') return order * String(a.studentName).localeCompare(String(b.studentName)); if (sortBy === 'company') return order * String(a.company).localeCompare(String(b.company)); if (sortBy === 'status') return order * String(a.applicationStatus).localeCompare(String(b.applicationStatus)); return order * (new Date(a.registrationDate) - new Date(b.registrationDate)) * -1 * -1; });
  if (!sortBy) rows.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
  res.json(rows);
});

app.get('/api/students/:id', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  const student = await getById('students.json', req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(student);
});

const STUDENT_ALLOWED = ['name', 'phone', 'college', 'department', 'graduationYear', 'cgpa', 'backlogs', 'tenthPercentage', 'twelfthPercentage', 'skills', 'programmingLanguages', 'certifications', 'projects', 'internships', 'resume'];
app.put('/api/students/:id', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  const students = await getAll('students.json');
  const index = students.findIndex(s => String(s.id) === String(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Student not found' });
  const body = req.body || {};
  if (body.email !== undefined && String(body.email).toLowerCase() !== String(students[index].email).toLowerCase()) return res.status(400).json({ message: 'Email cannot be changed.' });
  if (body.id !== undefined || body.role !== undefined || body.registerNumber !== undefined) { if (body.registerNumber !== undefined && String(body.registerNumber) !== String(students[index].registerNumber)) return res.status(400).json({ message: 'Register number cannot be changed.' }); }
  const patch = {};
  for (const k of STUDENT_ALLOWED) if (body[k] !== undefined) patch[k] = body[k];
  if (patch.name !== undefined && !String(patch.name).trim()) return res.status(400).json({ message: 'Name cannot be empty.' });
  if (patch.cgpa !== undefined && patch.cgpa !== '' && patch.cgpa !== null) { const n = parseFloat(patch.cgpa); if (isNaN(n) || n < 0 || n > 10) return res.status(400).json({ message: 'CGPA must be between 0 and 10.' }); patch.cgpa = n; }
  if (patch.backlogs !== undefined && patch.backlogs !== '' && patch.backlogs !== null) { const n = parseInt(patch.backlogs, 10); if (isNaN(n) || n < 0) return res.status(400).json({ message: 'Backlogs cannot be negative.' }); patch.backlogs = n; }
  if (patch.graduationYear !== undefined && patch.graduationYear !== '' && patch.graduationYear !== null) { const n = parseInt(patch.graduationYear, 10); if (isNaN(n) || n < 2000 || n > 2100) return res.status(400).json({ message: 'Graduation year is invalid.' }); patch.graduationYear = n; }
  for (const k of ['tenthPercentage', 'twelfthPercentage']) { if (patch[k] !== undefined && patch[k] !== '' && patch[k] !== null) { const n = parseFloat(patch[k]); if (isNaN(n) || n < 0 || n > 100) return res.status(400).json({ message: `${k} must be between 0 and 100.` }); patch[k] = n; } else if (patch[k] === '') patch[k] = null; }
  for (const k of ['skills', 'programmingLanguages', 'certifications', 'projects', 'internships']) { if (patch[k] !== undefined && typeof patch[k] === 'string') patch[k] = patch[k].split(',').map(s => s.trim()).filter(Boolean); }
  students[index] = { ...students[index], ...patch, id: students[index].id, email: students[index].email, registerNumber: students[index].registerNumber, updatedAt: new Date().toISOString() };
  const s = students[index]; let score = 50;
  if (s.phone) score += 5; if (s.college) score += 5; if (s.tenthPercentage !== null && s.tenthPercentage !== undefined) score += 10; if (s.twelfthPercentage !== null && s.twelfthPercentage !== undefined) score += 10; if (s.skills && s.skills.length) score += 10; if (s.resume) score += 10;
  s.profileCompletion = Math.min(100, score);
  await update('students.json', req.params.id, { ...patch, profileCompletion: s.profileCompletion, updatedAt: new Date().toISOString() });
  await addActivityLog('PROFILE_UPDATED', { email: s.email, role: 'student' }, `Updated profile for ${s.name}`, req);
  res.json(s);
});

// ---------- dashboard ----------
app.get('/api/dashboard/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  const drives = await getAll('drives.json');
  const registrations = await getAll('registrations.json');
  const students = await getAll('students.json');
  const companies = await getAll('companies.json');
  const norm = (s) => String(s || '').toUpperCase();
  const totalStudents = students.length;
  const activeDrives = drives.filter(isDriveOpen).length;
  const upcomingDrives = drives.filter(d => isDriveOpen(d) && d.driveDate && new Date(d.driveDate) > new Date()).length;
  const closedDrives = drives.filter(d => String(d.status).toLowerCase() === 'closed').length;
  const normReg = (st) => norm(st) === 'APPLIED' ? 'REGISTERED' : norm(st);
  res.json({ totalStudents, totalCompanies: companies.length, totalDrives: drives.length, activeDrives, upcomingDrives, closedDrives, totalRegistrations: registrations.length, applied: registrations.filter(r => ['REGISTERED', 'APPLIED'].includes(normReg(r.status))).length, shortlisted: registrations.filter(r => norm(r.status) === 'SHORTLISTED').length, selected: registrations.filter(r => norm(r.status) === 'SELECTED').length, rejected: registrations.filter(r => norm(r.status) === 'REJECTED').length, withdrawn: registrations.filter(r => norm(r.status) === 'WITHDRAWN').length, notRegistered: Math.max(0, totalStudents - new Set(registrations.map(r => String(r.studentId))).size) });
});

app.get('/api/dashboard/charts', authenticateToken, requireRole('admin'), async (req, res) => {
  const drives = await getAll('drives.json');
  const registrations = await getAll('registrations.json');
  const students = await getAll('students.json');
  const norm = (s) => String(s || '').toUpperCase();
  const companyRegs = {};
  drives.forEach(d => { const count = registrations.filter(r => String(r.driveId) === String(d.id)).length; companyRegs[d.company] = (companyRegs[d.company] || 0) + count; });
  const deptRegs = {};
  registrations.forEach(r => { const st = students.find(s => String(s.id) === String(r.studentId)); const dept = (st && st.department) || 'Unknown'; deptRegs[dept] = (deptRegs[dept] || 0) + 1; });
  const selectionStats = { registered: registrations.filter(r => ['REGISTERED', 'APPLIED'].includes(norm(r.status) === 'APPLIED' ? 'REGISTERED' : norm(r.status))).length, shortlisted: registrations.filter(r => norm(r.status) === 'SHORTLISTED').length, selected: registrations.filter(r => norm(r.status) === 'SELECTED').length, rejected: registrations.filter(r => norm(r.status) === 'REJECTED').length };
  const byMonth = {};
  registrations.forEach(r => { const d = new Date(r.registeredAt); if (isNaN(d)) return; const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; byMonth[key] = (byMonth[key] || 0) + 1; });
  const monthlyActivity = Object.keys(byMonth).sort().slice(-6).map(k => { const [y, m] = k.split('-'); const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return { month: `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`, count: byMonth[k] }; });
  res.json({ companyRegs, deptRegs, selectionStats, monthlyActivity });
});

app.get('/api/applications', authenticateToken, async (req, res) => {
  const registrations = await getAll('registrations.json');
  const drives = await getAll('drives.json');
  const student = await findStudentForUser(req.user);
  const sid = student ? String(student.id) : String(req.user.id);
  const myRegs = registrations.filter(r => String(r.studentId) === sid || String(r.studentId) === String(req.user.id));
  res.json(myRegs.map(reg => ({ ...reg, drive: drives.find(d => String(d.id) === String(reg.driveId)) || null })));
});

// ---------- companies ----------
app.get('/api/companies', authenticateToken, requireRole('admin'), async (req, res) => {
  const companies = await getAll('companies.json');
  const drives = await getAll('drives.json');
  res.json(companies.map(c => ({ ...c, totalDrives: drives.filter(d => String(d.company).toLowerCase() === String(c.name).toLowerCase()).length })));
});

app.post('/api/companies', authenticateToken, requireRole('admin'), async (req, res) => {
  const errors = validateCompanyBody(req.body, false);
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });
  const b = req.body || {}; const now = new Date().toISOString();
  const newCompany = { id: generateId(), name: String(b.name).trim(), website: b.website ? String(b.website).trim() : '', officialWebsite: b.officialWebsite ? String(b.officialWebsite).trim() : (b.website ? String(b.website).trim() : ''), careersUrl: b.careersUrl ? String(b.careersUrl).trim() : '', industry: b.industry ? String(b.industry).trim() : '', location: b.location ? String(b.location).trim() : '', description: b.description ? String(b.description).trim() : '', requirements: b.requirements ? String(b.requirements).trim() : '', skills: parseSkillsInput(b.skills), hrContact: b.hrContact ? String(b.hrContact).trim() : '', logo: b.logo ? String(b.logo).trim() : '', totalDrives: 0, syncEnabled: !!b.syncEnabled, syncMode: b.syncMode || 'hybrid', syncStatus: 'pending', lastSyncedAt: null, jobsFound: 0, lastError: null, createdAt: now, updatedAt: now };
  await create('companies.json', newCompany);
  await addActivityLog('COMPANY_ADDED', req.user, `Added company: ${newCompany.name}`, req);
  res.status(201).json(newCompany);
});

app.put('/api/companies/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const errors = validateCompanyBody(req.body, true);
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });
  const b = req.body || {}; const allowed = ['name', 'website', 'officialWebsite', 'careersUrl', 'industry', 'location', 'description', 'requirements', 'skills', 'hrContact', 'logo', 'syncEnabled', 'syncMode'];
  const updates = {};
  for (const k of allowed) { if (b[k] !== undefined) { if (k === 'skills') updates[k] = parseSkillsInput(b[k]); else if (k === 'syncEnabled') updates[k] = !!b[k]; else updates[k] = typeof b[k] === 'string' ? b[k].trim() : b[k]; } }
  updates.updatedAt = new Date().toISOString();
  await update('companies.json', req.params.id, updates);
  await addActivityLog('COMPANY_UPDATED', req.user, `Updated company`, req);
  res.json(await getById('companies.json', req.params.id));
});

app.delete('/api/companies/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  await remove('companies.json', req.params.id);
  await addActivityLog('COMPANY_DELETED', req.user, `Deleted company`, req);
  res.json({ message: 'Company deleted' });
});

app.get('/api/companies/sync/overview', authenticateToken, requireRole('admin'), async (req, res) => {
  try { const { getSyncOverview } = require('./services/companySyncService'); res.json(getSyncOverview()); } catch (e) { res.status(500).json({ message: 'Sync overview unavailable' }); }
});

app.post('/api/companies/:id/sync/preview', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const companies = await getAll('companies.json');
    const company = companies.find(c => String(c.id) === String(req.params.id));
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (!company.careersUrl) return res.status(400).json({ message: 'No careers URL configured for this company. Add a careers URL or enter requirements manually.', manualEntry: true });
    const { fetchCareerPage, getParser } = require('./services/companySyncService');
    let parserMod; try { parserMod = require('./services/parsers'); } catch (_) { parserMod = null; }
    const { html, finalUrl } = await fetchCareerPage(company);
    const getP = parserMod && parserMod.getParser ? parserMod.getParser : require('./services/parsers').getParser;
    const parser = getP(company);
    const result = parser.parse({ html, sourceUrl: finalUrl, company });
    const jobs = Array.isArray(result && result.jobs) ? result.jobs : [];
    let normalizeSkillList = (x) => parseSkillsInput(x);
    try { normalizeSkillList = require('./services/skillMatching').normalizeSkillList; } catch (_) {}
    const preview = jobs.slice(0, 20).map(j => ({ title: j.title || j.role || 'Untitled', role: j.role || j.title || '', description: j.description || '', location: j.location || 'Not specified', salary: j.salary || 'Not specified', requiredSkills: normalizeSkillList(j.requiredSkills || []), preferredSkills: normalizeSkillList(j.preferredSkills || []), minCgpa: j.minCgpa ?? null, maxBacklogs: j.maxBacklogs ?? null, minTenthPercentage: j.minTenthPercentage ?? null, minTwelfthPercentage: j.minTwelfthPercentage ?? null, graduationYear: j.graduationYear ?? null, departments: j.departments || [], applyUrl: j.applyUrl || null, sourceUrl: finalUrl, parser: result.parser || 'generic' }));
    res.json({ companyId: company.id, sourceUrl: finalUrl, parser: result.parser || 'generic', jobsFound: jobs.length, jobs: preview, note: 'Review carefully. Approving creates a DRAFT drive — never auto-publishes.' });
  } catch (e) { res.status(200).json({ companyId: req.params.id, status: 'manual_required', error: (e && e.message) || 'Sync failed. Enter requirements manually.', manualEntry: true, jobs: [] }); }
});

app.post('/api/companies/:id/sync/approve', authenticateToken, requireRole('admin'), async (req, res) => {
  const companies = await getAll('companies.json');
  const company = companies.find(c => String(c.id) === String(req.params.id));
  if (!company) return res.status(404).json({ message: 'Company not found' });
  const { job } = req.body || {};
  if (!job || typeof job !== 'object') return res.status(400).json({ message: 'job payload is required. Preview first, then approve.' });
  const drives = await getAll('drives.json');
  const now = new Date().toISOString();
  const skills = parseSkillsInput(job.requiredSkills);
  const newDrive = { id: generateId(), company: company.name, role: String(job.role || job.title || 'Not specified'), description: String(job.description || `Opening at ${company.name}. Review and complete before publishing.`), location: String(job.location || 'Not specified'), workMode: String(job.workMode || 'Not specified'), jobType: String(job.jobType || 'Full-time'), salary: String(job.salary || 'Not specified'), package: String(job.salary || 'Not specified'), requiredSkills: skills, skills, minimumSkillsRequired: skills.length || 1, minCgpa: job.minCgpa ?? null, maxBacklogs: job.maxBacklogs ?? null, minTenthPercentage: job.minTenthPercentage ?? null, minTwelfthPercentage: job.minTwelfthPercentage ?? null, eligibleDepartments: Array.isArray(job.departments) ? job.departments : [], eligibleGraduationYears: job.graduationYear ? [job.graduationYear] : [], graduationYear: job.graduationYear ?? null, driveDate: job.datePosted || null, deadline: job.deadline || null, status: 'draft', sourceType: 'official', sourceUrl: job.sourceUrl || company.careersUrl || null, officialApplyUrl: job.applyUrl || null, syncStatus: 'synced', lastSyncedAt: now, createdAt: now, updatedAt: now, createdBy: req.user.email };
  await create('drives.json', newDrive);
  await addActivityLog('DRIVE_SYNC_APPROVED', req.user, `Approved synced job for ${company.name} as draft ${newDrive.id}`, req);
  res.status(201).json(newDrive);
});

// ---------- schedules ----------
app.get('/api/schedules', authenticateToken, requireRole('admin'), async (req, res) => { res.json(await getAll('schedules.json')); });

app.post('/api/schedules', authenticateToken, requireRole('admin'), async (req, res) => {
  const errors = validateScheduleBody(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join(' ') });
  const b = req.body || {}; const now = new Date().toISOString();
  const newSchedule = { id: generateId(), driveId: b.driveId ? String(b.driveId) : (b.drive ? String(b.drive) : null), company: b.company ? String(b.company) : '', round: b.round ? String(b.round) : (b.type ? String(b.type) : (b.title ? String(b.title) : '')), type: b.type ? String(b.type) : (b.round ? String(b.round) : ''), date: b.date, time: b.time ? String(b.time) : '', location: b.location ? String(b.location) : (b.venue ? String(b.venue) : ''), venue: b.venue ? String(b.venue) : (b.location ? String(b.location) : ''), meetingLink: b.meetingLink ? String(b.meetingLink) : (b.meetingUrl ? String(b.meetingUrl) : ''), instructions: b.instructions ? String(b.instructions) : '', createdAt: now, updatedAt: now };
  const drives = await getAll('drives.json');
  if (newSchedule.driveId) { const d = drives.find(x => String(x.id) === String(newSchedule.driveId)); if (!d) return res.status(400).json({ message: 'Drive not found for driveId.' }); if (!newSchedule.company) newSchedule.company = d.company; }
  await create('schedules.json', newSchedule);
  await addActivityLog('SCHEDULE_CREATED', req.user, `Created schedule ${newSchedule.round} for ${newSchedule.company || newSchedule.driveId}`, req);
  try { const regs = await getAll('registrations.json'); const target = newSchedule.driveId ? regs.filter(r => String(r.driveId) === String(newSchedule.driveId)) : regs; const seen = new Set(); for (const r of target) { if (seen.has(String(r.studentId))) continue; seen.add(String(r.studentId)); await createNotification({ userId: r.studentId, recipient: r.studentId, type: 'schedule_created', title: `Schedule: ${newSchedule.round}`, message: `${newSchedule.round} on ${newSchedule.date} ${newSchedule.time || ''} for ${newSchedule.company || ''}.`, driveId: newSchedule.driveId }); } } catch (_) {}
  res.status(201).json(newSchedule);
});

app.put('/api/schedules/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const allowed = ['driveId', 'drive', 'company', 'round', 'type', 'title', 'date', 'time', 'location', 'venue', 'meetingLink', 'meetingUrl', 'instructions'];
  const updates = {};
  for (const k of allowed) { if (req.body[k] !== undefined) { if (k === 'drive') updates.driveId = String(req.body[k]); else if (k === 'title' && !req.body.round && !req.body.type) updates.round = String(req.body[k]); else if (k === 'meetingUrl') updates.meetingLink = String(req.body[k]); else updates[k] = req.body[k]; } }
  if (updates.date && isNaN(new Date(updates.date))) return res.status(400).json({ message: 'Date is invalid.' });
  updates.updatedAt = new Date().toISOString();
  await update('schedules.json', req.params.id, updates);
  await addActivityLog('SCHEDULE_UPDATED', req.user, `Updated schedule ${req.params.id}`, req);
  res.json(await getById('schedules.json', req.params.id));
});

app.delete('/api/schedules/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  await remove('schedules.json', req.params.id);
  await addActivityLog('SCHEDULE_DELETED', req.user, `Deleted schedule ${req.params.id}`, req);
  res.json({ message: 'Schedule deleted' });
});

app.get('/api/schedules/my', authenticateToken, async (req, res) => {
  const schedules = await getAll('schedules.json');
  const student = await findStudentForUser(req.user);
  if (isAdmin(req)) return res.json(schedules);
  if (!student) return res.json([]);
  const registrations = await getAll('registrations.json');
  const myDriveIds = new Set(registrations.filter(r => String(r.studentId) === String(student.id)).map(r => String(r.driveId)));
  const drives = await getAll('drives.json');
  const myCompanies = new Set([...myDriveIds].map(id => { const d = drives.find(x => String(x.id) === String(id)); return d ? String(d.company).toLowerCase() : null; }).filter(Boolean));
  const relevant = schedules.filter(s => { if (s.driveId) return myDriveIds.has(String(s.driveId)); if (s.company && myCompanies.has(String(s.company).toLowerCase())) return true; return false; });
  res.json(relevant);
});

// ---------- notifications ----------
app.get('/api/notifications', authenticateToken, async (req, res) => {
  const notifications = await getAll('notifications.json');
  if (isAdmin(req)) return res.json(notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  const student = await findStudentForUser(req.user);
  const ids = new Set([String(req.user.id), student ? String(student.id) : null].filter(Boolean));
  const mine = notifications.filter(n => { if (n.recipient === 'all') return true; if (n.userId && ids.has(String(n.userId))) return true; if (n.recipient && ids.has(String(n.recipient))) return true; return false; }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(mine);
});

app.post('/api/notifications', authenticateToken, requireRole('admin'), async (req, res) => {
  const { title, message, recipient, userId, type, driveId } = req.body || {};
  if (!title && !message) return res.status(400).json({ message: 'Title or message is required.' });
  if (type && !NOTIF_TYPES.includes(String(type))) return res.status(400).json({ message: `Type must be one of: ${NOTIF_TYPES.join(', ')}.` });
  const n = await createNotification({ userId: userId ? String(userId) : null, recipient: userId ? String(userId) : (recipient || 'all'), type: type || 'general', title: title || message, message: message || title, driveId: driveId || null });
  await addActivityLog('NOTIFICATION_SENT', req.user, `Sent notification: ${n ? n.title : ''}`, req);
  res.status(201).json(n);
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  const notifications = await getAll('notifications.json');
  const student = await findStudentForUser(req.user);
  const ids = new Set([String(req.user.id), student ? String(student.id) : null].filter(Boolean));
  let count = 0;
  for (const n of notifications) { const mine = isAdmin(req) ? true : (n.recipient === 'all' || (n.userId && ids.has(String(n.userId))) || (n.recipient && ids.has(String(n.recipient)))); if (mine && !n.read) { n.read = true; count++; } }
  // Update all notifications in DB
  const unreadNotifs = notifications.filter(n => { const mine = isAdmin(req) ? true : (n.recipient === 'all' || (n.userId && ids.has(String(n.userId))) || (n.recipient && ids.has(String(n.recipient)))); return mine && !n.read; });
  for (const n of unreadNotifs) { await update('notifications.json', n.id, { read: true }); }
  res.json({ message: `${count} notifications marked as read` });
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const notif = await getById('notifications.json', req.params.id);
  if (!notif) return res.status(404).json({ message: 'Notification not found' });
  if (!isAdmin(req)) { const student = await findStudentForUser(req.user); const ids = new Set([String(req.user.id), student ? String(student.id) : null].filter(Boolean)); const mine = notif.recipient === 'all' || (notif.userId && ids.has(String(notif.userId))) || (notif.recipient && ids.has(String(notif.recipient))); if (!mine) return res.status(403).json({ message: 'Access denied' }); }
  await update('notifications.json', req.params.id, { read: true });
  res.json(await getById('notifications.json', req.params.id));
});

// ---------- activity log / reports ----------
app.get('/api/activity-log', authenticateToken, requireRole('admin'), async (req, res) => {
  let logs = await getAll('activityLog.json');
  logs = logs.sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
  const limit = parseInt(req.query.limit, 10);
  if (!isNaN(limit) && limit > 0) logs = logs.slice(0, limit);
  res.json(logs);
});

app.get('/api/reports/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  const drives = await getAll('drives.json');
  const registrations = await getAll('registrations.json');
  const students = await getAll('students.json');
  const norm = (s) => String(s || '').toUpperCase();
  res.json({ totalStudents: students.length, totalDrives: drives.length, totalRegistrations: registrations.length, selected: registrations.filter(r => norm(r.status) === 'SELECTED').length, shortlisted: registrations.filter(r => norm(r.status) === 'SHORTLISTED').length, rejected: registrations.filter(r => norm(r.status) === 'REJECTED').length, registered: registrations.filter(r => ['REGISTERED', 'APPLIED'].includes(norm(r.status))).length, withdrawn: registrations.filter(r => norm(r.status) === 'WITHDRAWN').length });
});

app.get('/api/reports/registrations', authenticateToken, requireRole('admin'), async (req, res) => {
  const registrations = await getAll('registrations.json');
  const drives = await getAll('drives.json');
  const students = await getAll('students.json');
  res.json(registrations.map(reg => { const drive = drives.find(d => String(d.id) === String(reg.driveId)); const student = students.find(s => String(s.id) === String(reg.studentId)); return { studentName: student?.name, registerNumber: student?.registerNumber, department: student?.department, cgpa: student?.cgpa, company: drive?.company, role: drive?.role, registeredAt: reg.registeredAt, status: reg.status }; }));
});

app.get('/api/reports/company-wise', authenticateToken, requireRole('admin'), async (req, res) => {
  const registrations = await getAll('registrations.json');
  const drives = await getAll('drives.json');
  const companyData = {};
  registrations.forEach(reg => { const drive = drives.find(d => String(d.id) === String(reg.driveId)); if (drive) { if (!companyData[drive.company]) companyData[drive.company] = { total: 0, selected: 0, shortlisted: 0, rejected: 0, registered: 0 }; companyData[drive.company].total++; const s = String(reg.status).toUpperCase(); if (s === 'SELECTED') companyData[drive.company].selected++; else if (s === 'SHORTLISTED') companyData[drive.company].shortlisted++; else if (s === 'REJECTED') companyData[drive.company].rejected++; else companyData[drive.company].registered++; } });
  res.json(companyData);
});

// ---------- error handling for missing functions ----------
async function requireSelfOrAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  const student = await findStudentForUser(req.user);
  if (student && String(student.id) === String(req.params.id)) return next();
  if (req.user.id === req.params.id) return next();
  return res.status(403).json({ message: 'Access denied' });
}

// Start server
repairCompanyIds().catch(err => console.error('Repair startup failed:', err.message));
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
