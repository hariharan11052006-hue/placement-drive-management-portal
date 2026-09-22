const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query('SELECT * FROM drives ORDER BY created_at DESC');
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query('SELECT * FROM drives WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getByCompany = async (company) => {
  const result = await pool.query('SELECT * FROM drives WHERE company = $1', [company]);
  return result.rows;
};

const getByStatus = async (status) => {
  const result = await pool.query('SELECT * FROM drives WHERE status = $1 ORDER BY created_at DESC', [status]);
  return result.rows;
};

const create = async (drive) => {
  const result = await pool.query(
    `INSERT INTO drives (id, company, company_id, role, description, location, drive_date, deadline, salary, stipend, work_mode, job_type, skills, min_cgpa, max_backlogs, eligible_departments, graduation_year, openings, max_applicants, gender_eligibility, interview_location, recruitment_process, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING *`,
    [
      drive.id, drive.company, drive.companyId, drive.role, drive.description, drive.location,
      drive.driveDate, drive.deadline, drive.salary, drive.stipend, drive.workMode, drive.jobType,
      drive.skills, drive.minCgpa, drive.maxBacklogs, drive.eligibleDepartments,
      drive.graduationYear, drive.openings, drive.maxApplicants, drive.genderEligibility,
      drive.interviewLocation, drive.recruitmentProcess, drive.status, drive.createdAt || new Date(), drive.updatedAt || new Date()
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
    `UPDATE drives SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM drives WHERE id = $1', [id]);
};

module.exports = { getAll, getById, getByCompany, getByStatus, create, update, deleteById };
