const pool = require('../db/pool');

const getAll = async () => {
  const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
  return result.rows;
};

const getById = async (id) => {
  const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getByName = async (name) => {
  const result = await pool.query('SELECT * FROM companies WHERE LOWER(name) = LOWER($1)', [name]);
  return result.rows[0] || null;
};

const create = async (company) => {
  const result = await pool.query(
    `INSERT INTO companies (id, name, logo, website, official_website, careers_url, industry, location, description, hr_contact, total_drives, sync_enabled, sync_mode, source_type, sync_status, last_synced_at, jobs_found, error_message, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
    [
      company.id, company.name, company.logo, company.website, company.officialWebsite,
      company.careersUrl, company.industry, company.location, company.description, company.hrContact,
      company.totalDrives, company.syncEnabled, company.syncMode, company.sourceType,
      company.syncStatus, company.lastSyncedAt, company.jobsFound, company.errorMessage,
      company.createdAt || new Date()
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
    `UPDATE companies SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const deleteById = async (id) => {
  await pool.query('DELETE FROM companies WHERE id = $1', [id]);
};

module.exports = { getAll, getById, getByName, create, update, deleteById };
