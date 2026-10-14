const { sequelize } = require("../config/db");

async function addAdminColumns() {
  try {
    console.log("Adding admin approval columns to resignations table...");
    await sequelize.authenticate();
    await sequelize.query(`
      ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_id VARCHAR(50);
      ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_name VARCHAR(100);
      ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_decision VARCHAR(50);
      ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_comments TEXT;
      ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_action_date TIMESTAMPTZ;
    `);
    console.log("Admin approval columns successfully added to resignations table!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

addAdminColumns();
