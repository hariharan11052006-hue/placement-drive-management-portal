const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDataDir() {
  fs.ensureDirSync(DATA_DIR);
}

function readCollection(file) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  try {
    const data = fs.readJsonSync(filePath);
    if (Array.isArray(data)) return data;
    // If file contains an object (should not happen for collections), wrap safely
    if (data === null || data === undefined) return [];
    return Array.isArray(data) ? data : [];
  } catch (_) {
    // Invalid JSON -> return empty instead of crashing; caller can decide.
    // Preserve corrupt file by renaming to .corrupt backup.
    try {
      const backup = filePath + '.corrupt-' + Date.now();
      fs.copySync(filePath, backup);
    } catch (_) {}
    return [];
  }
}

function writeCollection(file, data) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, file);
  const tmpPath = filePath + '.tmp';
  // Atomic write: write temp then rename
  fs.writeJsonSync(tmpPath, data, { spaces: 2 });
  fs.moveSync(tmpPath, filePath, { overwrite: true });
}

function generateId(prefix) {
  if (crypto.randomUUID) {
    return (prefix ? prefix + '-' : '') + crypto.randomUUID();
  }
  return (prefix ? prefix + '-' : '') + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

module.exports = { DATA_DIR, ensureDataDir, readCollection, writeCollection, generateId };
