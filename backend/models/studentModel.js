const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const getByRegisterNumber = async (registerNumber) => {
  const result = await pool.query('SELECT * FROM students WHERE register_number = $1', [registerNumber]);
  return result.rows[0] || null;
};

const create = async (student) => {
  const result = await pool.query(
    `INSERT INTO students (id, name, register_number, email, phone, college, department, graduation_year, cgpa, backlogs, skills, resume, profile_completion, tenth_percentage, twelfth_percentage, programming_languages, certifications, projects, internships, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
    [
      student.id, student.name, student.registerNumber, student.email, student.phone,
      student.college, student.department, student.graduationYear, student.cgpa, student.backlogs,
      student.skills, student.resume, student.profileCompletion, student.tenthPercentage,
      student.twelfthPercentage, student.programmingLanguages, student.certifications,
      student.projects, student.internships, student.createdAt || new Date()
    ]
  );
  return result.rows[0];
};

const update = async (id, updates) => {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = Object.values(updates);
  const result = await pool.query(
    `UPDATE students SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM students WHERE id = $1', [id]);
};

module.exports = { getAll, getById, getByEmail, getByRegisterNumber, create, update, deleteById };
