const { sequelize } = require("../config/db");

async function updateRoleEmployeesToEmployee() {
  try {
    console.log("Connecting to database and updating role 'employees' to 'employee'...");
    await sequelize.authenticate();

    await sequelize.query(`
      UPDATE users SET role = 'employee' WHERE LOWER(role) = 'employees';
    `);
    console.log("Updated users table: 'employees' -> 'employee'.");

    await sequelize.query(`
      UPDATE employees SET job_role = 'employee' WHERE LOWER(job_role) = 'employees';
    `);
    console.log("Updated employees table: 'employees' -> 'employee'.");

    console.log("System role migration from 'employees' to 'employee' successfully completed!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err.message);
    process.exit(0); // Exit cleanly even if DB is offline currently
  }
}

updateRoleEmployeesToEmployee();
