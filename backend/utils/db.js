const pool = require('../db/pool');

const camelToSnake = (str) => str.replace(/[A-Z]/g, m => '_' + m.toLowerCase());

const columnMap = {
  'users.json': {},
  'students.json': {},
  'companies.json': {},
  'drives.json': {},
  'registrations.json': {},
  'notifications.json': {},
  'schedules.json': {},
  'activityLog.json': {}
};

const generateId = (prefix) => {
  if (global.crypto && global.crypto.randomUUID) {
    return (prefix ? prefix + '-' : '') + global.crypto.randomUUID();
  }
  return (prefix ? prefix + '-' : '') + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
};

const getAll = async (file) => {
  const tableMap = {
    'users.json': 'users',
    'students.json': 'students',
    'companies.json': 'companies',
    'drives.json': 'drives',
    'registrations.json': 'registrations',
    'notifications.json': 'notifications',
    'schedules.json': 'schedules',
    'activityLog.json': 'activity_log'
  };
  const table = tableMap[file];
  if (!table) return [];
  const result = await pool.query(`SELECT * FROM ${table}`);
  return result.rows;
};

const getById = async (file, id) => {
  const tableMap = {
    'users.json': 'users',
    'students.json': 'students',
    'companies.json': 'companies',
    'drives.json': 'drives',
    'registrations.json': 'registrations',
    'notifications.json': 'notifications',
    'schedules.json': 'schedules',
    'activityLog.json': 'activity_log'
  };
  const table = tableMap[file];
  if (!table) return null;
  const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

const findItem = async (file, fn) => {
  const rows = await getAll(file);
  return rows.find(fn) || null;
};

const create = async (file, item) => {
  const tableMap = {
    'users.json': 'users',
    'students.json': 'students',
    'companies.json': 'companies',
    'drives.json': 'drives',
    'registrations.json': 'registrations',
    'notifications.json': 'notifications',
    'schedules.json': 'schedules',
    'activityLog.json': 'activity_log'
  };
  const table = tableMap[file];
  if (!table) return null;
  const keys = Object.keys(item);
  const snakeKeys = keys.map(k => camelToSnake(k));
  const columns = snakeKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = Object.values(item);
  const result = await pool.query(
    `INSERT INTO ${table} (${snakeKeys.map(k => `"${k}"`).join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    values
  );
  return result.rows[0];
};

const update = async (file, id, updates) => {
  const tableMap = {
    'users.json': 'users',
    'students.json': 'students',
    'companies.json': 'companies',
    'drives.json': 'drives',
    'registrations.json': 'registrations',
    'notifications.json': 'notifications',
    'schedules.json': 'schedules',
    'activityLog.json': 'activity_log'
  };
  const table = tableMap[file];
  if (!table) return null;
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;
  const snakeKeys = keys.map(k => camelToSnake(k));
  const setClause = snakeKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return result.rows[0] || null;
};

const remove = async (file, id) => {
  const tableMap = {
    'users.json': 'users',
    'students.json': 'students',
    'companies.json': 'companies',
    'drives.json': 'drives',
    'registrations.json': 'registrations',
    'notifications.json': 'notifications',
    'schedules.json': 'schedules',
    'activityLog.json': 'activity_log'
  };
  const table = tableMap[file];
  if (!table) return;
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
};

const count = async (file) => {
  const tableMap = {
    'users.json': 'users',
    'students.json': 'students',
    'companies.json': 'companies',
    'drives.json': 'drives',
    'registrations.json': 'registrations',
    'notifications.json': 'notifications',
    'schedules.json': 'schedules',
    'activityLog.json': 'activity_log'
  };
  const table = tableMap[file];
  if (!table) return 0;
  const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
  return parseInt(result.rows[0].count);
};

module.exports = { generateId, getAll, getById, findItem, create, update, remove, count };
