const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query('SELECT * FROM schedules ORDER BY created_at DESC');
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query('SELECT * FROM schedules WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getByDriveId = async (driveId) => {
  const result = await pool.query('SELECT * FROM schedules WHERE drive_id = $1 ORDER BY "date", "time"', [driveId]);
  return result.rows;
};

const create = async (schedule) => {
  const result = await pool.query(
    `INSERT INTO schedules (id, drive_id, round, "type", "date", "time", location, duration, notes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [schedule.id, schedule.driveId, schedule.round, schedule.type, schedule.date, schedule.time, schedule.location, schedule.duration, schedule.notes || '', schedule.createdAt || new Date()]
  );
  return result.rows[0];
};

const update = async (id, updates) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE schedules SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
};

module.exports = { getAll, getById, getByDriveId, create, update, deleteById };
