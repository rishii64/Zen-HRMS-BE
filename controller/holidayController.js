const { Holiday } = require("../config/db");

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const HolidayController = {
  // GET /api/auth/holidays
  async getHolidays(req, res) {
    try {
      const { year } = req.query;
      let whereClause = {};

      const holidays = await Holiday.findAll({
        where: whereClause,
        order: [["date", "ASC"]],
      });

      // Filter by year in JS or query if requested
      const formatted = holidays.map((h) => {
        const plain = h.toJSON ? h.toJSON() : { ...h };
        const dObj = new Date(`${plain.date}T12:00:00+05:30`);
        const dayName = DAY_NAMES[dObj.getDay()] || plain.day || "Day";
        const mShort = MONTH_NAMES[dObj.getMonth()] || plain.month || "JAN";
        const dNum = dObj.getDate() || plain.day_num || 1;
        const fullDateTitle = dObj.toLocaleDateString("en-US", { month: "long", day: "numeric" });

        return {
          id: plain.id,
          name: plain.name,
          day: dayName,
          date: fullDateTitle,
          dateStr: plain.date,
          month: mShort,
          dayNum: dNum,
          type: plain.type || "Public",
          dept: plain.dept || "All",
          notes: plain.notes || "",
          created_by: plain.created_by || null,
        };
      });

      const filtered = year ? formatted.filter((h) => h.dateStr.startsWith(String(year))) : formatted;

      return res.json({ success: true, data: filtered });
    } catch (err) {
      console.error("Get holidays error:", err.message);
      return res.status(500).json({ error: "Failed to load holiday calendar" });
    }
  },

  // POST /api/auth/holidays
  async addHoliday(req, res) {
    try {
      const { name, date, type = "Public", dept = "All", notes = "" } = req.body;
      const creatorName = req.user?.name || req.user?.employee_id || "Management";

      if (!name || !date) {
        return res.status(400).json({ error: "Holiday name and date are required" });
      }

      const dObj = new Date(`${date}T12:00:00+05:30`);
      const dayName = DAY_NAMES[dObj.getDay()] || "Day";
      const mShort = MONTH_NAMES[dObj.getMonth()] || "JAN";
      const dNum = dObj.getDate() || 1;

      // Upsert by date
      let existing = await Holiday.findOne({ where: { date } });
      if (existing) {
        await existing.update({
          name: name.trim(),
          day: dayName,
          month: mShort,
          day_num: dNum,
          type: type || "Public",
          dept: dept || "All",
          created_by: creatorName,
          notes: notes || existing.notes,
        });
        return res.json({ success: true, message: "Holiday updated successfully", data: existing });
      }

      const created = await Holiday.create({
        name: name.trim(),
        date,
        day: dayName,
        month: mShort,
        day_num: dNum,
        type: type || "Public",
        dept: dept || "All",
        created_by: creatorName,
        notes,
      });

      return res.json({ success: true, message: "Holiday added successfully", data: created });
    } catch (err) {
      console.error("Add holiday error:", err.message);
      return res.status(500).json({ error: "Failed to save holiday" });
    }
  },

  // DELETE /api/auth/holidays/:id
  async deleteHoliday(req, res) {
    try {
      const { id } = req.params;
      const found = await Holiday.findByPk(id);
      if (!found) {
        return res.status(404).json({ error: "Holiday not found" });
      }
      await found.destroy();
      return res.json({ success: true, message: "Holiday deleted successfully" });
    } catch (err) {
      console.error("Delete holiday error:", err.message);
      return res.status(500).json({ error: "Failed to delete holiday" });
    }
  },
};

module.exports = HolidayController;
