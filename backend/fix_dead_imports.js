const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// Remove dead Pool and pool imports (they are unused - all DB ops go through utils/db.js)
const deadImport1 = "const { Pool } = require('pg');\n";
const deadImport2 = "const pool = require('./db/pool');\n";

if (c.includes(deadImport1)) {
  c = c.replace(deadImport1, '');
  console.log('Removed: const { Pool } = require(pg)');
} else {
  console.log('Dead Pool import not found (may already be removed)');
}

if (c.includes(deadImport2)) {
  c = c.replace(deadImport2, '');
  console.log('Removed: const pool = require(./db/pool)');
} else {
  console.log('Dead pool require not found (may already be removed)');
}

fs.writeFileSync('server.js', c);
console.log('server.js fixed.');
