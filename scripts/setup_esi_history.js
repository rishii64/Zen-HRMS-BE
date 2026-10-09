const { sequelize } = require("../config/db");

async function setupEsiHistory() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS esi_slab_history (
        id SERIAL PRIMARY KEY,
        threshold NUMERIC(12, 2) NOT NULL,
        effective_from VARCHAR(50),
        effective_to VARCHAR(50),
        contribution_period VARCHAR(100),
        benefit_period VARCHAR(100),
        changed_by VARCHAR(100),
        notes TEXT,
        affected_count INT DEFAULT 0,
        applied_to_all BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const [existing] = await sequelize.query("SELECT COUNT(*) as count FROM esi_slab_history");
    if (parseInt(existing[0].count, 10) === 0) {
      await sequelize.query(`
        INSERT INTO esi_slab_history (threshold, effective_from, effective_to, contribution_period, benefit_period, changed_by, notes, affected_count, applied_to_all, created_at)
        VALUES 
          (10000, '01-Apr-2004', '30-Apr-2010', '1st Apr - 30th Sep / 1st Oct - 31st Mar', '1st Jan - 30th Jun / 1st Jul - 31st Dec', 'ESIC Statutory Gazette', 'Historical Statutory Ceiling under Section 2(9) of the ESI Act, 1948', 0, true, '2010-04-30 00:00:00+05:30'),
          (15000, '01-May-2010', '31-Dec-2016', '1st Apr - 30th Sep / 1st Oct - 31st Mar', '1st Jan - 30th Jun / 1st Jul - 31st Dec', 'ESIC Statutory Gazette', 'Gazette Notification S.O. 941(E) wage ceiling revision', 0, true, '2016-12-31 00:00:00+05:30'),
          (21000, '01-Jan-2017', 'Present', '1st Apr - 30th Sep / 1st Oct - 31st Mar', '1st Jan - 30th Jun / 1st Jul - 31st Dec', 'ESIC Statutory Gazette', 'Central Government Gazette Notification S.O. 4233(E) standard national wage ceiling', 2, true, '2017-01-01 00:00:00+05:30');
      `);
    }
    const [rows] = await sequelize.query("SELECT * FROM esi_slab_history ORDER BY id ASC");
    console.log("ESI HISTORY READY. Total rows:", rows.length);
    process.exit(0);
  } catch (err) {
    console.error("Setup error:", err);
    process.exit(1);
  }
}

setupEsiHistory();
