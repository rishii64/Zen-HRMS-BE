// Migration: add delegation columns to recruitment_requisitions
// Load .env manually without dotenv module
const fs2 = require("fs");
const envLines = fs2.readFileSync("d:/Work-Rishi/HRMS-mine/backend/.env", "utf-8").split("\n");
envLines.forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && k.trim()) process.env[k.trim()] = v.join("=").trim();
});
const { Sequelize } = require("sequelize");

async function migrate() {
  // Use the same DB connection from env
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not set in .env");
  }
  
  const sequelize = new Sequelize(dbUrl, {
    dialect: "postgres",
    logging: false,
    dialectOptions: { ssl: false },
  });

  try {
    await sequelize.authenticate();
    console.log("DB connected");

    const qi = sequelize.getQueryInterface();

    // Check if columns already exist
    const tableDesc = await qi.describeTable("recruitment_requisitions");

    if (!tableDesc.delegated_finalizer_id) {
      await qi.addColumn("recruitment_requisitions", "delegated_finalizer_id", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
      console.log("Added: delegated_finalizer_id");
    } else {
      console.log("Already exists: delegated_finalizer_id");
    }

    if (!tableDesc.delegated_finalizer_name) {
      await qi.addColumn("recruitment_requisitions", "delegated_finalizer_name", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
      console.log("Added: delegated_finalizer_name");
    } else {
      console.log("Already exists: delegated_finalizer_name");
    }

    if (!tableDesc.delegated_at) {
      await qi.addColumn("recruitment_requisitions", "delegated_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      console.log("Added: delegated_at");
    } else {
      console.log("Already exists: delegated_at");
    }

    console.log("\nMigration complete!");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
