const STOPWORDS = new Set([
  'and', 'with', 'in', 'on', 'of', 'the', 'a', 'an', 'my', 'i', 'im', 'i have', 'have', 'has', 'had',
  'know', 'knows', 'knowing', 'basic', 'basics', 'fundamental', 'fundamentals', 'core', 'advanced',
  'good', 'using', 'use', 'used', 'skills', 'skill', 'working', 'work', 'some', 'including', 'such',
  'like', 'as', 'to', 'from', 'for', 'do', 'can', 'about', 'within', 'also', 'well', 'very', 'more',
  'plus', 'etc', 'familiar', 'familiar with', 'experienced', 'experience', 'proficient', 'proficiency',
  'beginner', 'intermediate', 'level', 'language', 'languages', 'programming', 'knowledge', 'meaningful'
]);

const FILLER_PREFIXES = [
  'basic ', 'basics of ', 'basic knowledge of ', 'knowledge of ', 'fundamentals of ',
  'core ', 'advanced ', 'exposure to ', 'familiar with ', 'beginner friendly '
];

const FILLER_SUFFIXES = [
  ' basics', ' programming', ' programming language', ' language', ' fundamentals', ' skill', ' skills'
];

const CANONICALS = [
  { name: 'Java', aliases: ['java', 'core java', 'java programming', 'java language', 'java basics'] },
  { name: 'Python', aliases: ['python', 'python programming', 'python language'] },
  { name: 'JavaScript', aliases: ['javascript', 'js', 'java script', 'java-script', 'javascript basics'] },
  { name: 'React', aliases: ['react', 'reactjs', 'react js', 'react.js'] },
  { name: 'Angular', aliases: ['angular', 'angularjs', 'angular js'] },
  { name: 'HTML', aliases: ['html', 'html5', 'html 5', 'hypertext markup language'] },
  { name: 'CSS', aliases: ['css', 'css3', 'css 3', 'cascading style sheets'] },
  { name: 'SQL', aliases: ['sql', 'sql database', 'structured query language'] },
  { name: 'MySQL', aliases: ['mysql'] },
  { name: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { name: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { name: 'Node.js', aliases: ['node', 'nodejs', 'node js', 'node.js'] },
  { name: 'C++', aliases: ['c++', 'cpp', 'c plus plus'] },
  { name: 'C#', aliases: ['c#', 'c sharp', 'csharp', 'c-sharp'] },
  { name: 'C', aliases: ['c', 'c language'] },
  { name: 'Git', aliases: ['git', 'github', 'git version control'] },
  { name: 'Data Structures', aliases: ['data structures', 'data structure', 'ds'] },
  { name: 'Algorithms', aliases: ['algorithms', 'algorithm'] },
  { name: 'Object Oriented Programming', aliases: ['oop', 'object oriented programming', 'object-oriented programming'] },
  { name: 'Machine Learning', aliases: ['machine learning', 'ml'] },
  { name: 'Deep Learning', aliases: ['deep learning'] },
  { name: 'Docker', aliases: ['docker'] },
  { name: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { name: 'AWS', aliases: ['aws', 'amazon web services'] },
  { name: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { name: 'Linux', aliases: ['linux'] },
  { name: 'Excel', aliases: ['excel', 'microsoft excel'] },
  { name: 'Power BI', aliases: ['power bi', 'powerbi'] },
  { name: 'Networking', aliases: ['networking', 'network'] },
  { name: 'Statistics', aliases: ['statistics', 'stats'] },
  { name: 'Communication', aliases: ['communication', 'communication skills'] },
  { name: 'Problem Solving', aliases: ['problem solving', 'problem-solving'] },
  { name: 'Marketing', aliases: ['marketing'] },
  { name: 'Analytics', aliases: ['analytics', 'data analytics'] },
  { name: 'AutoCAD', aliases: ['autocad', 'auto cad'] },
  { name: 'SolidWorks', aliases: ['solidworks', 'solid works'] },
  { name: 'MATLAB', aliases: ['matlab'] },
  { name: 'Simulink', aliases: ['simulink'] },
  { name: 'Embedded Systems', aliases: ['embedded systems', 'embedded system', 'embedded'] },
  { name: 'Verilog', aliases: ['verilog'] },
  { name: 'VLSI', aliases: ['vlsi'] },
  { name: 'Spring', aliases: ['spring', 'spring boot', 'springboot'] },
  { name: 'Django', aliases: ['django'] },
  { name: 'TensorFlow', aliases: ['tensorflow', 'tensor flow'] },
  { name: 'TypeScript', aliases: ['typescript', 'ts'] },
  { name: 'Flutter', aliases: ['flutter'] },
  { name: 'Kotlin', aliases: ['kotlin'] },
  { name: 'Swift', aliases: ['swift'] },
  { name: 'Ruby', aliases: ['ruby'] },
  { name: 'PHP', aliases: ['php'] },
  { name: 'Go', aliases: ['go', 'golang'] },
  { name: 'R', aliases: ['r', 'r language'] },
  { name: 'Data Science', aliases: ['data science'] },
  { name: 'Data Analysis', aliases: ['data analysis'] },
  { name: 'Frontend Development', aliases: ['frontend development', 'front-end development'] },
  { name: 'Backend Development', aliases: ['backend development', 'back-end development'] },
  { name: 'Full Stack Development', aliases: ['full stack development', 'full-stack development'] },
  { name: 'Customer Service', aliases: ['customer service'] },
  { name: 'Domain Knowledge', aliases: ['domain knowledge'] },
  { name: 'Leadership', aliases: ['leadership'] },
  { name: 'Google Analytics', aliases: ['google analytics'] },
  { name: 'Cloud Computing', aliases: ['cloud computing', 'cloud'] },
  { name: 'Tableau', aliases: ['tableau'] },
  { name: 'Jira', aliases: ['jira'] },
  { name: 'Selenium', aliases: ['selenium'] },
  { name: 'SAP', aliases: ['sap'] },
  { name: 'Salesforce', aliases: ['salesforce'] },
  { name: 'Ethical Hacking', aliases: ['ethical hacking', 'hacking'] }
];

function expandAliases(aliases) {
  const out = new Set();
  aliases.forEach(raw => {
    const base = raw.trim().toLowerCase();
    if (!base) return;
    out.add(base);
    FILLER_PREFIXES.forEach(p => out.add(p + base));
    FILLER_SUFFIXES.forEach(s => out.add(base + s));
  });
  return [...out];
}

const ALIAS_MAP = new Map();
const FUZZY_INDEX = [];
CANONICALS.forEach(c => {
  const expanded = expandAliases(c.aliases);
  expanded.forEach(a => {
    if (!ALIAS_MAP.has(a)) ALIAS_MAP.set(a, c.name);
  });
  if (/^[a-z0-9#.+]{1,13}$/.test(c.name.toLowerCase())) {
    FUZZY_INDEX.push({ token: c.name.toLowerCase(), name: c.name });
  }
  c.aliases.forEach(a => {
    const t = a.toLowerCase();
    if (t.length >= 2 && t.length <= 13 && !/\s/.test(t)) FUZZY_INDEX.push({ token: t, name: c.name });
  });
});
const UNIQUE_FUZZY = [];
const seenFuzzy = new Set();
FUZZY_INDEX.forEach(f => {
  if (!seenFuzzy.has(f.token)) {
    seenFuzzy.add(f.token);
    UNIQUE_FUZZY.push(f);
  }
});

function splitChunks(input) {
  if (Array.isArray(input)) {
    const out = [];
    input.forEach(x => out.push(...splitChunks(x)));
    return out;
  }
  if (input === null || input === undefined) return [];
  return String(input)
    .split(/[,;|\/\r\n]+|\band\b/gi)
    .map(s => s.trim())
    .filter(Boolean);
}

function preprocess(phrase) {
  let s = ' ' + String(phrase).toLowerCase().trim() + ' ';
  s = s.replace(/c\s*\+\s*\+/g, ' cpp ');
  s = s.replace(/c\s*#/g, ' csharp ');
  s = s.replace(/c\s*plus\s*plus/g, ' cpp ');
  s = s.replace(/c\s*sharp/g, ' csharp ');
  s = s.replace(/node\s*\.?\s*js/g, ' nodejs ');
  s = s.replace(/react\s*\.?\s*js/g, ' reactjs ');
  s = s.replace(/java\s*[- ]?\s*script/g, ' javascript ');
  s = s.replace(/asp\s*\.?\s*net/g, ' aspnet ');
  s = s.replace(/html\s*5/g, ' html5 ');
  s = s.replace(/css\s*3/g, ' css3 ');
  s = s.replace(/power\s*\.?\s*bi/g, ' powerbi ');
  return s;
}

function tokenize(phrase) {
  return preprocess(phrase).split(/[^a-z0-9#.+]+/).filter(Boolean);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

function fuzzyLimit(len) {
  if (len <= 1) return 1000;
  if (len === 2) return 0;
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return Math.min(3, Math.floor(len / 3) + 1);
}

function fuzzyMatch(token) {
  if (!token || token.length < 3) return null;
  let best = null;
  let bestDist = Infinity;
  for (const f of UNIQUE_FUZZY) {
    const d = levenshtein(token, f.token);
    const limit = fuzzyLimit(token.length);
    if (d <= limit && (d < bestDist || (d === bestDist && f.token.length === token.length))) {
      best = f.name;
      bestDist = d;
    }
  }
  return best;
}

function isMeaningfulToken(t) {
  return t.length >= 2 && !STOPWORDS.has(t) && /^[a-z0-9#.+]+$/.test(t);
}

function literalKeys(runTokens) {
  const keys = [];
  const meaningful = runTokens.filter(isMeaningfulToken);
  if (meaningful.length === 0) return keys;
  keys.push(meaningful.join(' '));
  meaningful.forEach(t => keys.push(t));
  return keys;
}

function extractSkills(input) {
  const keys = new Set();
  const chunks = splitChunks(input);
  for (const chunk of chunks) {
    const tokens = tokenize(chunk);
    if (tokens.length === 0) continue;
    const consumed = new Array(tokens.length).fill(false);
    for (let i = 0; i < tokens.length; ) {
      let skipped = true;
      for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
        const phrase = tokens.slice(i, i + len).join(' ');
        const canonical = ALIAS_MAP.get(phrase);
        if (canonical) {
          keys.add('skill:' + canonical);
          for (let k = i; k < i + len; k++) consumed[k] = true;
          i += len;
          skipped = false;
          break;
        }
      }
      if (skipped) i++;
    }
    tokens.forEach((t, idx) => {
      if (consumed[idx]) return;
      const f = fuzzyMatch(t);
      if (f) {
        keys.add('skill:' + f);
        consumed[idx] = true;
      }
    });
    let run = [];
    const flush = () => {
      if (run.length > 0) {
        literalKeys(run).forEach(l => keys.add('lit:' + l));
        run = [];
      }
    };
    tokens.forEach((t, idx) => {
      if (consumed[idx]) flush();
      else run.push(t);
    });
    flush();
  }
  return keys;
}

function extractRequired(input) {
  const chunks = splitChunks(input);
  const entries = [];
  const seen = new Set();
  for (const chunk of chunks) {
    const keys = extractSkills(chunk);
    for (const key of keys) {
      if (!seen.has(key)) {
        seen.add(key);
        entries.push({
          key,
          label: key.startsWith('skill:') ? key.slice(6) : chunk
        });
      }
    }
  }
  return entries;
}

function effectiveMinimum(minimum, count) {
  if (count === 0) return 0;
  if (minimum === undefined || minimum === null || minimum === '') return count;
  const n = parseInt(minimum, 10);
  if (isNaN(n)) return count;
  return Math.max(1, Math.min(n, count));
}

function calculateSkillMatch(studentSkills, requiredSkills, minimumRequired) {
  const studentKeys = extractSkills(studentSkills);
  const requiredEntries = extractRequired(requiredSkills);
  const min = effectiveMinimum(minimumRequired, requiredEntries.length);
  const matched = [];
  const missing = [];
  requiredEntries.forEach(en => {
    if (studentKeys.has(en.key)) matched.push(en.label);
    else missing.push(en.label);
  });
  const eligible = matched.length >= min;
  return {
    eligible,
    matchedSkills: matched,
    missingSkills: missing,
    matchedCount: matched.length,
    minimumRequired: min
  };
}

function normalizeSkillList(input) {
  const keys = extractSkills(input);
  return [...keys].map(k => (k.startsWith('skill:') ? k.slice(6) : k.slice(4)));
}

module.exports = { calculateSkillMatch, normalizeSkillList, extractSkills };