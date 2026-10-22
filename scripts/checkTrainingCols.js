const db = require("../config/db");

async function check() {
  try {
    const [cols] = await db.sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'training_programs';"
    );
    console.log("training_programs columns:", cols.map((c) => c.column_name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
