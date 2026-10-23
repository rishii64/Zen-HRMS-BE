const db = require("../config/db");

async function migrate() {
  try {
    console.log("Migrating training_programs & training_enrollments to support company_logo_url...");
    await db.sequelize.query(
      "ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS company_logo_url TEXT;"
    );
    await db.sequelize.query(
      "ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS company_logo_url TEXT;"
    );
    console.log("Migration successful: company_logo_url column added to training_programs and training_enrollments.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();
