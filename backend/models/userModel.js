const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const create = async (user) => {
  const result = await pool.query(
    'INSERT INTO users (id, email, password, "role", created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [user.id, user.email, user.password, user.role || 'student', user.createdAt || new Date()]
  );
  return result.rows[0];
};

const update = async (id, updates) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
};

module.exports = { getAll, getById, getByEmail, create, update, deleteById };
