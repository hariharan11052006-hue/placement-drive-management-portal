const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query('SELECT * FROM activity_log ORDER BY created_at DESC');
  return result.rows;
};

const getByAction = async (action) => {
  const result = await pool.query('SELECT * FROM activity_log WHERE action = $1 ORDER BY created_at DESC', [action]);
  return result.rows;
};

const create = async (log) => {
  const result = await pool.query(
    `INSERT INTO activity_log (id, "date", "time", action, "user", "role", details, ip, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [log.id, log.date, log.time, log.action, log.user, log.role, log.details, log.ip || '127.0.0.1', log.createdAt || new Date()]
  );
  return result.rows[0];
};

const createMany = async (logs) => {
  if (!logs || logs.length === 0) return [];
  const values = logs.map((l, i) => `$${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9}`).join(',');
  const params = logs.flatMap(l => [l.id, l.date, l.time, l.action, l.user, l.role, l.details, l.ip || '127.0.0.1', l.createdAt || new Date()]);
  const result = await pool.query(`INSERT INTO activity_log (id, "date", "time", action, "user", "role", details, ip, created_at) VALUES ${values}`, params);
  return result.rows;
};

module.exports = { getAll, getByAction, create, createMany };
