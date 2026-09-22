const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace("await update('registrations.json', registrations.map(r => r.id), registrations.map(r => r));", "for (const r of registrations) { if (r.status === 'SHORTLISTED' || r.status === 'REJECTED') await update('registrations.json', r.id, { status: r.status, updatedAt: r.updatedAt, notes: r.notes || '' }); }");
fs.writeFileSync('server.js', c);
console.log('Fixed bulk routes');
