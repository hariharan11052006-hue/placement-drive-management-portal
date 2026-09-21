const { calculateSkillMatch } = require('./skillMatching');

const normalize = (value) => String(value == null ? '' : value).trim().toLowerCase();

const DEPARTMENT_ALIASES = {
  'cse': 'computer_science',
  'cs': 'computer_science',
  'computer science': 'computer_science',
  'computer science engineering': 'computer_science',
  'computer science and engineering': 'computer_science',
  'b.e computer science': 'computer_science',
  'b.tech computer science': 'computer_science',
  'be computer science': 'computer_science',
  'btech computer science': 'computer_science',
  'b.sc computer science': 'computer_science',
  'bsc computer science': 'computer_science',
  'bs computer science': 'computer_science',
  'it': 'information_technology',
  'information technology': 'information_technology',
  'b.tech it': 'information_technology',
  'ece': 'electronics_communication',
  'electronics': 'electronics_communication',
  'electronics and communication': 'electronics_communication',
  'electronics and communication engineering': 'electronics_communication',
  'b.e ece': 'electronics_communication',
  'eee': 'electrical',
  'electrical': 'electrical',
  'electrical engineering': 'electrical',
  'electrical and electronics engineering': 'electrical',
  'mechanical': 'mechanical',
  'mechanical engineering': 'mechanical',
  'civil': 'civil',
  'civil engineering': 'civil',
  'mba': 'mba',
  'commerce': 'commerce',
  'mathematics': 'mathematics',
  'maths': 'mathematics',
  'statistics': 'statistics',
  'bca': 'bca',
  'bsc': 'bsc',
  'b.sc': 'bsc'
};

const normalizeDepartment = (value) => {
  const key = normalize(value);
  return DEPARTMENT_ALIASES[key] || key;
};

const departmentsMatch = (driveDepartments, studentDepartment) => {
  if (!Array.isArray(driveDepartments) || driveDepartments.length === 0) return true;
  const studentDept = normalizeDepartment(studentDepartment);
  return driveDepartments.some(d => normalizeDepartment(d) === studentDept);
};

const getDriveSkills = (drive) => {
  if (!drive) return [];
  if (Array.isArray(drive.requiredSkills) && drive.requiredSkills.length) return drive.requiredSkills;
  if (Array.isArray(drive.skills) && drive.skills.length) return drive.skills;
  if (typeof drive.requiredSkills === 'string' && drive.requiredSkills.trim()) return drive.requiredSkills.split(/[,;|/]+/).map(s => s.trim()).filter(Boolean);
  if (typeof drive.skills === 'string' && drive.skills.trim()) return drive.skills.split(/[,;|/]+/).map(s => s.trim()).filter(Boolean);
  return [];
};

const getDriveDepartments = (drive) => {
  if (!drive) return [];
  const raw = drive.eligibleDepartments !== undefined ? drive.eligibleDepartments : drive.departments;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

const getDriveGradYears = (drive) => {
  if (!drive) return [];
  const out = [];
  const pushVal = (v) => {
    if (v === null || v === undefined || v === '') return;
    if (Array.isArray(v)) return v.forEach(pushVal);
    if (typeof v === 'string' && v.includes(',')) return v.split(',').map(s => s.trim()).forEach(pushVal);
    const n = parseInt(v, 10);
    if (!isNaN(n)) out.push(n);
  };
  pushVal(drive.eligibleGraduationYears);
  pushVal(drive.graduationYears);
  pushVal(drive.graduationYear);
  // Dedupe
  return Array.from(new Set(out));
};

const getDriveMinSkills = (drive, requiredCount) => {
  if (requiredCount === 0) return 0;
  const raw = drive.minimumSkillsRequired !== undefined && drive.minimumSkillsRequired !== '' && drive.minimumSkillsRequired !== null
    ? drive.minimumSkillsRequired
    : (drive.minimumMatchingSkills !== undefined ? drive.minimumMatchingSkills : (drive.minSkills !== undefined ? drive.minSkills : undefined));
  if (raw === undefined || raw === null || raw === '') return requiredCount;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return requiredCount;
  return Math.max(1, Math.min(n, requiredCount));
};

const getStudentSkills = (student) => {
  if (!student) return [];
  const combined = [];
  if (Array.isArray(student.skills)) combined.push(...student.skills);
  else if (typeof student.skills === 'string' && student.skills.trim()) combined.push(...student.skills.split(/[,;|/\n]+/));
  // Merge programmingLanguages as they count as skills for eligibility
  if (Array.isArray(student.programmingLanguages)) combined.push(...student.programmingLanguages);
  else if (typeof student.programmingLanguages === 'string' && student.programmingLanguages.trim()) combined.push(...String(student.programmingLanguages).split(/[,;|/\n]+/));
  return combined.map(s => String(s).trim()).filter(Boolean);
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(n) ? NaN : n;
};

const calculateEligibility = (student, drive) => {
  const reasons = [];
  const checks = {};
  if (!student) return { eligible: false, reasons: [{ criterion: 'Profile', required: '', actual: '', message: 'Student profile not found. Please update your profile to check eligibility.' }], matchedSkills: [], missingSkills: [], skillMatchCount: 0, minimumSkillsRequired: 0, minimumRequired: 0, checks: { profile: { pass: false } } };
  if (!drive) return { eligible: false, reasons: [], matchedSkills: [], missingSkills: [], skillMatchCount: 0, minimumSkillsRequired: 0, minimumRequired: 0, checks: {} };

  const sCgpa = toNumber(student.cgpa);
  const sBacklogs = student.backlogs === null || student.backlogs === undefined || student.backlogs === '' ? NaN : parseInt(student.backlogs, 10);

  // CGPA
  const reqCgpa = toNumber(drive.minCgpa);
  if (Number.isNaN(reqCgpa) === false) {
    if (Number.isNaN(sCgpa)) {
      reasons.push({ criterion: 'CGPA', required: reqCgpa, actual: student.cgpa, message: `CGPA requirement is ${reqCgpa} but your CGPA is not set.` });
      checks.cgpa = { pass: false, required: reqCgpa, actual: student.cgpa ?? null };
    } else if (sCgpa < reqCgpa) {
      reasons.push({ criterion: 'CGPA', required: reqCgpa, actual: sCgpa, message: `CGPA requirement: ${reqCgpa}. Student CGPA: ${sCgpa}.` });
      checks.cgpa = { pass: false, required: reqCgpa, actual: sCgpa };
    } else {
      checks.cgpa = { pass: true, required: reqCgpa, actual: sCgpa };
    }
  } else {
    checks.cgpa = { pass: true, required: null, actual: Number.isNaN(sCgpa) ? null : sCgpa };
  }

  // Backlogs
  const reqBacklogs = drive.maxBacklogs === null || drive.maxBacklogs === undefined || drive.maxBacklogs === '' ? NaN : parseInt(drive.maxBacklogs, 10);
  if (Number.isNaN(reqBacklogs) === false) {
    if (Number.isNaN(sBacklogs)) {
      reasons.push({ criterion: 'Backlogs', required: reqBacklogs, actual: student.backlogs, message: `Maximum allowed backlogs is ${reqBacklogs} but your backlogs count is not set.` });
      checks.backlogs = { pass: false, required: reqBacklogs, actual: null };
    } else if (sBacklogs > reqBacklogs) {
      reasons.push({ criterion: 'Backlogs', required: reqBacklogs, actual: sBacklogs, message: `Maximum allowed backlogs is ${reqBacklogs} but student has ${sBacklogs}.` });
      checks.backlogs = { pass: false, required: reqBacklogs, actual: sBacklogs };
    } else {
      checks.backlogs = { pass: true, required: reqBacklogs, actual: sBacklogs };
    }
  } else {
    checks.backlogs = { pass: true, required: null, actual: Number.isNaN(sBacklogs) ? null : sBacklogs };
  }

  // Department (supports eligibleDepartments / departments, empty = all)
  const deptList = getDriveDepartments(drive);
  if (!departmentsMatch(deptList, student.department)) {
    reasons.push({
      criterion: 'Department',
      required: deptList.join(', '),
      actual: student.department,
      message: `Department does not match. Eligible departments: ${deptList.join(', ')}. Your department: ${student.department || 'not set'}.`
    });
    checks.department = { pass: false, required: deptList, actual: student.department || null };
  } else {
    checks.department = { pass: true, required: deptList.length ? deptList : null, actual: student.department || null };
  }

  // Graduation year (supports single + arrays: eligibleGraduationYears / graduationYears / graduationYear)
  const gradYears = getDriveGradYears(drive);
  if (gradYears.length > 0) {
    const sGradYear = toNumber(student.graduationYear);
    if (Number.isNaN(sGradYear)) {
      reasons.push({ criterion: 'Graduation Year', required: gradYears.join(', '), actual: student.graduationYear, message: `Required graduation year is ${gradYears.join(' / ')} but yours is not set.` });
      checks.graduationYear = { pass: false, required: gradYears, actual: null };
    } else if (!gradYears.includes(sGradYear)) {
      reasons.push({ criterion: 'Graduation Year', required: gradYears.join(', '), actual: sGradYear, message: `Required graduation year: ${gradYears.join(' / ')}. Yours: ${sGradYear}.` });
      checks.graduationYear = { pass: false, required: gradYears, actual: sGradYear };
    } else {
      checks.graduationYear = { pass: true, required: gradYears, actual: sGradYear };
    }
  } else {
    const sGradYear = toNumber(student.graduationYear);
    checks.graduationYear = { pass: true, required: null, actual: Number.isNaN(sGradYear) ? null : sGradYear };
  }

  // Skills — single source: ANY N matching skills (configurable via minimumSkillsRequired)
  const requiredSkills = getDriveSkills(drive);
  const studentSkills = getStudentSkills(student);
  const minSkills = getDriveMinSkills(drive, requiredSkills.length);
  const skillMatch = calculateSkillMatch(studentSkills, requiredSkills, minSkills);
  if (!skillMatch.eligible) {
    reasons.push({
      criterion: 'Skills',
      required: requiredSkills.join(', '),
      actual: studentSkills.join(', '),
      message: requiredSkills.length === 0
        ? 'No skills configured.'
        : `Only ${skillMatch.matchedCount} of ${skillMatch.minimumRequired} required skills matched. Missing: ${skillMatch.missingSkills.length ? skillMatch.missingSkills.join(', ') : 'None'}. Matched: ${skillMatch.matchedSkills.length ? skillMatch.matchedSkills.join(', ') : 'None'}.`
    });
    checks.skills = { pass: false, required: requiredSkills, actual: studentSkills, matched: skillMatch.matchedSkills, missing: skillMatch.missingSkills, matchedCount: skillMatch.matchedCount, minimumRequired: skillMatch.minimumRequired };
  } else {
    checks.skills = { pass: true, required: requiredSkills, actual: studentSkills, matched: skillMatch.matchedSkills, missing: skillMatch.missingSkills, matchedCount: skillMatch.matchedCount, minimumRequired: skillMatch.minimumRequired };
  }

  const reqTenth = toNumber(drive.minTenthPercentage);
  if (Number.isNaN(reqTenth) === false) {
    const sTenth = toNumber(student.tenthPercentage);
    if (Number.isNaN(sTenth) || sTenth < reqTenth) {
      reasons.push({ criterion: '10th Percentage', required: reqTenth, actual: Number.isNaN(sTenth) ? null : sTenth, message: `10th percentage requirement is ${reqTenth} but yours is ${Number.isNaN(sTenth) ? 'not set' : sTenth}.` });
      checks.tenth = { pass: false, required: reqTenth, actual: Number.isNaN(sTenth) ? null : sTenth };
    } else {
      checks.tenth = { pass: true, required: reqTenth, actual: sTenth };
    }
  } else {
    const sTenth = toNumber(student.tenthPercentage);
    checks.tenth = { pass: true, required: null, actual: Number.isNaN(sTenth) ? null : sTenth };
  }

  const reqTwelfth = toNumber(drive.minTwelfthPercentage);
  if (Number.isNaN(reqTwelfth) === false) {
    const sTwelfth = toNumber(student.twelfthPercentage);
    if (Number.isNaN(sTwelfth) || sTwelfth < reqTwelfth) {
      reasons.push({ criterion: '12th Percentage', required: reqTwelfth, actual: Number.isNaN(sTwelfth) ? null : sTwelfth, message: `12th percentage requirement is ${reqTwelfth} but yours is ${Number.isNaN(sTwelfth) ? 'not set' : sTwelfth}.` });
      checks.twelfth = { pass: false, required: reqTwelfth, actual: Number.isNaN(sTwelfth) ? null : sTwelfth };
    } else {
      checks.twelfth = { pass: true, required: reqTwelfth, actual: sTwelfth };
    }
  } else {
    const sTwelfth = toNumber(student.twelfthPercentage);
    checks.twelfth = { pass: true, required: null, actual: Number.isNaN(sTwelfth) ? null : sTwelfth };
  }

  const eligible = reasons.length === 0;
  return {
    eligible,
    reasons,
    matchedSkills: skillMatch.matchedSkills,
    missingSkills: skillMatch.missingSkills,
    skillMatchCount: skillMatch.matchedCount,
    minimumSkillsRequired: skillMatch.minimumRequired,
    minimumRequired: skillMatch.minimumRequired,
    skillMatch: { matchedSkills: skillMatch.matchedSkills, missingSkills: skillMatch.missingSkills, matchedCount: skillMatch.matchedCount, minimumRequired: skillMatch.minimumRequired },
    checks
  };
};

module.exports = { calculateEligibility, normalizeDepartment, departmentsMatch, getDriveSkills, getDriveDepartments, getDriveGradYears };