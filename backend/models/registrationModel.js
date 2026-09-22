const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query(`
    SELECT r.*, s.name as student_name, s.register_number, d.company, d."role" as drive_role
    FROM registrations r
    LEFT JOIN students s ON r.student_id = s.id
    LEFT JOIN drives d ON r.drive_id = d.id
    ORDER BY r.registered_at DESC
  `);
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query(
    `SELECT r.*, s.name as student_name, s.register_number, d.company, d."role" as drive_role
     FROM registrations r
     LEFT JOIN students s ON r.student_id = s.id
     LEFT JOIN drives d ON r.drive_id = d.id
     WHERE r.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const getByStudentId = async (studentId) => {
  const result = await pool.query(
    `SELECT r.*, d.company, d."role" as drive_role, d.status as drive_status
     FROM registrations r
     LEFT JOIN drives d ON r.drive_id = d.id
     WHERE r.student_id = $1 ORDER BY r.registered_at DESC`,
    [studentId]
  );
  return result.rows;
};

const getByDriveId = async (driveId) => {
  const result = await pool.query(
    `SELECT r.*, s.name as student_name, s.email as student_email, s.cgpa, s.department
     FROM registrations r
     LEFT JOIN students s ON r.student_id = s.id
     WHERE r.drive_id = $1 ORDER BY r.registered_at DESC`,
    [driveId]
  );
  return result.rows;
};

const create = async (registration) => {
  const result = await pool.query(
    `INSERT INTO registrations (id, student_id, drive_id, registered_at, status, notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [registration.id, registration.studentId, registration.driveId, registration.registeredAt || new Date(), registration.status || 'REGISTERED', registration.notes || '', registration.updatedAt || new Date()]
  );
  return result.rows[0];
};

const update = async (id, updates) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE registrations SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM registrations WHERE id = $1', [id]);
};

module.exports = { getAll, getById, getByStudentId, getByDriveId, create, update, deleteById };
