const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
const old = "await update('registrations.json', registrations.map(r => r.id), registrations.map(r => r));";
const nw = "for (const r of registrations) { if (r.status === 'SHORTLISTED' || r.status === 'REJECTED') await update('registrations.json', r.id, { status: r.status, updatedAt: r.updatedAt, notes: r.notes || '' }); }";
if (c.includes(old)) {
  c = c.replace(old, nw);
  fs.writeFileSync('server.js', c);
  console.log('Fixed bulk-reject: replaced old array update');
} else {
  console.log('Pattern not found, checking...');
  const idx = c.indexOf('registrations.map');
  if (idx >= 0) {
    console.log('Found at index:', idx);
    console.log('Context:', c.substring(idx - 50, idx + 100));
  } else {
    console.log('No registrations.map found');
  }
}
