const { sequelize } = require("../config/db");

async function setupCompanyGroups() {
  try {
    console.log("Connecting to database and running company/group migrations...");
    await sequelize.authenticate();

    // 1. Alter users table
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';
    `);

    // 2. Alter employees table
    await sequelize.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';
    `);

    // 3. Populate existing 4 users with representative multi-group company & location data
    // Employee 1: Biswajit Bag -> TATA Steel (Kolkata)
    await sequelize.query(`
      UPDATE users 
      SET group_name = 'TATA Company', company_name = 'TATA Steel', work_location = 'Kolkata' 
      WHERE employee_id = 'HOD-BB-01' AND (company_name IS NULL OR company_name = '' OR company_name = 'TATA Steel');
      
      UPDATE employees 
      SET group_name = 'TATA Company', company_name = 'TATA Steel', work_location = 'Kolkata' 
      WHERE employee_id = 'HOD-BB-01' AND (company_name IS NULL OR company_name = '' OR company_name = 'TATA Steel');
    `);

    // Employee 2: Rishi Mitra -> TATA Steel (Kolkata)
    await sequelize.query(`
      UPDATE users 
      SET group_name = 'TATA Company', company_name = 'TATA Steel', work_location = 'Kolkata' 
      WHERE employee_id = 'EMP-RM-66' AND (company_name IS NULL OR company_name = '' OR company_name = 'TATA Steel');
      
      UPDATE employees 
      SET group_name = 'TATA Company', company_name = 'TATA Steel', work_location = 'Kolkata' 
      WHERE employee_id = 'EMP-RM-66' AND (company_name IS NULL OR company_name = '' OR company_name = 'TATA Steel');
    `);

    // Employee 3: Priyanka Mukherjee -> TCS (Mumbai)
    await sequelize.query(`
      UPDATE users 
      SET group_name = 'TATA Company', company_name = 'TCS', work_location = 'Mumbai' 
      WHERE employee_id = 'HR-PM-02';
      
      UPDATE employees 
      SET group_name = 'TATA Company', company_name = 'TCS', work_location = 'Mumbai' 
      WHERE employee_id = 'HR-PM-02';
    `);

    // Employee 4: Siddeshwar Nayak -> TATA Motors (Pune)
    await sequelize.query(`
      UPDATE users 
      SET group_name = 'TATA Company', company_name = 'TATA Motors', work_location = 'Pune' 
      WHERE employee_id = 'ACC-SN-01';
      
      UPDATE employees 
      SET group_name = 'TATA Company', company_name = 'TATA Motors', work_location = 'Pune' 
      WHERE employee_id = 'ACC-SN-01';
    `);

    // Fill any null values across all users & employees
    await sequelize.query(`
      UPDATE users SET group_name = 'TATA Company' WHERE group_name IS NULL OR group_name = '';
      UPDATE users SET company_name = 'TATA Steel' WHERE company_name IS NULL OR company_name = '';
      UPDATE users SET work_location = 'Kolkata' WHERE work_location IS NULL OR work_location = '';

      UPDATE employees SET group_name = 'TATA Company' WHERE group_name IS NULL OR group_name = '';
      UPDATE employees SET company_name = 'TATA Steel' WHERE company_name IS NULL OR company_name = '';
      UPDATE employees SET work_location = 'Kolkata' WHERE work_location IS NULL OR work_location = '';
    `);

    const [rows] = await sequelize.query(`
      SELECT employee_id, name, group_name, company_name, work_location FROM users ORDER BY id ASC
    `);

    console.log("Migration successful! Current user allocations:");
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

setupCompanyGroups();
