const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getByUserId = async (userId) => {
  const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 OR recipient = $1 ORDER BY created_at DESC', [userId]);
  return result.rows;
};

const getUnreadByUserId = async (userId) => {
  const result = await pool.query('SELECT * FROM notifications WHERE (user_id = $1 OR recipient = $1) AND read = false ORDER BY created_at DESC', [userId]);
  return result.rows;
};

const create = async (notification) => {
  const result = await pool.query(
    `INSERT INTO notifications (id, user_id, recipient, type, title, message, drive_id, read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [notification.id, notification.userId, notification.recipient, notification.type, notification.title, notification.message, notification.driveId, notification.read || false, notification.createdAt || new Date()]
  );
  return result.rows[0];
};

const update = async (id, updates) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE notifications SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const markAllAsReadByUserId = async (userId) => {
  const result = await pool.query(
    `UPDATE notifications SET read = true WHERE user_id = $1 OR recipient = $1 AND read = false RETURNING *`,
    [userId]
  );
  return result.rowCount;
};

const markAsReadById = async (id) => {
  const result = await pool.query('UPDATE notifications SET read = true WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
};

module.exports = { getAll, getById, getByUserId, getUnreadByUserId, create, update, markAllAsReadByUserId, markAsReadById, deleteById };
