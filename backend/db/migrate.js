const fs = require('fs-extra');
const path = require('path');
const pool = require('./pool');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function readJSON(file) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  return fs.readJsonSync(filePath);
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "role" VARCHAR(20) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        logo VARCHAR(500),
        website VARCHAR(500),
        official_website VARCHAR(500),
        careers_url VARCHAR(500),
        industry VARCHAR(255),
        location VARCHAR(255),
        description TEXT,
        hr_contact VARCHAR(255),
        total_drives INTEGER DEFAULT 0,
        sync_enabled BOOLEAN DEFAULT true,
        sync_mode VARCHAR(50),
        source_type VARCHAR(50),
        sync_status VARCHAR(50),
        last_synced_at TIMESTAMP,
        jobs_found INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS drives (
        id VARCHAR PRIMARY KEY,
        company VARCHAR(255) NOT NULL,
        company_id VARCHAR REFERENCES companies(id),
        "role" VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        drive_date DATE,
        deadline DATE,
        salary VARCHAR(100),
        stipend VARCHAR(100),
        work_mode VARCHAR(50),
        job_type VARCHAR(50),
        skills TEXT[],
        min_cgpa DECIMAL(3,1),
        max_backlogs INTEGER,
        eligible_departments TEXT[],
        graduation_year INTEGER,
        openings INTEGER,
        max_applicants INTEGER,
        gender_eligibility VARCHAR(50),
        interview_location VARCHAR(255),
        recruitment_process TEXT[],
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        register_number VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        college VARCHAR(255),
        department VARCHAR(255),
        graduation_year INTEGER,
        cgpa DECIMAL(3,2),
        backlogs INTEGER DEFAULT 0,
        skills TEXT[],
        resume VARCHAR(500),
        profile_completion INTEGER DEFAULT 0,
        tenth_percentage DECIMAL(5,2),
        twelfth_percentage DECIMAL(5,2),
        programming_languages TEXT[],
        certifications TEXT[],
        projects TEXT[],
        internships TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id VARCHAR PRIMARY KEY,
        student_id VARCHAR REFERENCES students(id),
        drive_id VARCHAR REFERENCES drives(id),
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'REGISTERED',
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id),
        recipient VARCHAR(255),
        "type" VARCHAR(50),
        title VARCHAR(255),
        message TEXT,
        drive_id VARCHAR REFERENCES drives(id),
        "read" BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id VARCHAR PRIMARY KEY,
        drive_id VARCHAR REFERENCES drives(id),
        round VARCHAR(50),
        "type" VARCHAR(50),
        "date" DATE,
        "time" VARCHAR(50),
        location VARCHAR(255),
        duration VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id VARCHAR PRIMARY KEY,
        "date" VARCHAR(20),
        "time" VARCHAR(20),
        action VARCHAR(100),
        "user" VARCHAR(255),
        "role" VARCHAR(50),
        details TEXT,
        ip VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('All tables created successfully.');

    // Insert companies
    const companies = await readJSON('companies.json');
    if (companies.length > 0) {
      for (const c of companies) {
        await client.query(`
          INSERT INTO companies (id, name, logo, website, official_website, careers_url, industry, location, description, hr_contact, total_drives, sync_enabled, sync_mode, source_type, sync_status, last_synced_at, jobs_found, error_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `, [
          c.id, c.name, c.logo, c.website, c.officialWebsite, c.careersUrl, c.industry, c.location,
          c.description, c.hrContact, c.totalDrives, c.syncEnabled, c.syncMode, c.sourceType,
          c.syncStatus, c.lastSyncedAt, c.jobsFound, c.errorMessage, c.createdAt
        ]);
      }
      console.log(`Inserted ${companies.length} companies.`);
    }

    // Insert users
    const users = await readJSON('users.json');
    if (users.length > 0) {
      for (const u of users) {
        await client.query(`
          INSERT INTO users (id, email, password, "role", created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [u.id, u.email, u.password, u.role, u.createdAt || new Date()]);
      }
      console.log(`Inserted ${users.length} users.`);
    }

    // Insert drives
    const drives = await readJSON('drives.json');
    if (drives.length > 0) {
      for (const d of drives) {
         const companyId = companies.find(c => c.name.trim() === d.company.trim())?.id || null;
        await client.query(`
          INSERT INTO drives (id, company, company_id, "role", description, location, drive_date, deadline, salary, stipend, work_mode, job_type, skills, min_cgpa, max_backlogs, eligible_departments, graduation_year, openings, max_applicants, gender_eligibility, interview_location, recruitment_process, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           ON CONFLICT (id) DO UPDATE SET company = EXCLUDED.company, "role" = EXCLUDED."role", "company_id" = EXCLUDED."company_id", status = EXCLUDED.status
         `, [
           d.id, d.company, companyId, d.role, d.description, d.location, d.driveDate, d.deadline,
           d.salary, d.stipend, d.workMode, d.jobType, d.skills, d.minCgpa, d.maxBacklogs,
           d.eligibleDepartments, d.graduationYear, d.openings, d.maxApplicants, d.genderEligibility,
           d.interviewLocation, d.recruitmentProcess, d.status, d.createdAt, d.updatedAt
         ]);
      }
      console.log(`Inserted ${drives.length} drives.`);
    }

    // Insert students
    const students = await readJSON('students.json');
    if (students.length > 0) {
      for (const s of students) {
        await client.query(`
          INSERT INTO students (id, name, register_number, email, phone, college, department, graduation_year, cgpa, backlogs, skills, resume, profile_completion, tenth_percentage, twelfth_percentage, programming_languages, certifications, projects, internships, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO NOTHING
        `, [
          s.id, s.name, s.registerNumber, s.email, s.phone, s.college, s.department, s.graduationYear,
          s.cgpa, s.backlogs, s.skills, s.resume, s.profileCompletion, s.tenthPercentage, s.twelfthPercentage,
          s.programmingLanguages, s.certifications, s.projects, s.internships, s.createdAt
        ]);
      }
      console.log(`Inserted ${students.length} students.`);
    }

    // Insert registrations
    const registrations = await readJSON('registrations.json');
    if (registrations.length > 0) {
      for (const r of registrations) {
        await client.query(`
          INSERT INTO registrations (id, student_id, drive_id, registered_at, status, notes, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [r.id, r.studentId, r.driveId, r.registeredAt, r.status, r.notes, r.updatedAt]);
      }
      console.log(`Inserted ${registrations.length} registrations.`);
    }

    // Insert notifications
    const notifications = await readJSON('notifications.json');
    if (notifications.length > 0) {
      for (const n of notifications) {
        await client.query(`
          INSERT INTO notifications (id, user_id, recipient, "type", title, message, drive_id, "read", created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING
        `, [n.id, n.userId, n.recipient, n.type, n.title, n.message, n.driveId, n.read, n.createdAt]);
      }
      console.log(`Inserted ${notifications.length} notifications.`);
    }

    // Insert schedules
    const schedules = await readJSON('schedules.json');
    if (schedules.length > 0) {
      for (const s of schedules) {
        await client.query(`
          INSERT INTO schedules (id, drive_id, round, "type", "date", "time", location, duration, notes, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [s.id, s.driveId, s.round, s.type, s.date, s.time, s.location, s.duration, s.notes, s.createdAt]);
      }
      console.log(`Inserted ${schedules.length} schedules.`);
    }

    // Insert activity logs
    const activityLogs = await readJSON('activityLog.json');
    if (activityLogs.length > 0) {
      for (const a of activityLogs) {
        await client.query(`
          INSERT INTO activity_log (id, "date", "time", action, "user", "role", details, ip, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [a.id, a.date, a.time, a.action, a.user, a.role, a.details, a.ip, a.createdAt]);
      }
      console.log(`Inserted ${activityLogs.length} activity logs.`);
    }

    // Repair company_id for all existing drives
    for (const d of drives) {
      const companyId = companies.find(c => c.name.trim().toLowerCase() === d.company.trim().toLowerCase())?.id || null;
      if (companyId) {
        await client.query(`UPDATE drives SET "company_id" = $1 WHERE id = $2`, [companyId, d.id]);
      }
    }
    console.log(`Repaired company_id for ${drives.length} drives.`);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
