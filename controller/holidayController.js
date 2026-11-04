const { Holiday, Attendance, sequelize } = require("../config/db");
const { Op } = require("sequelize");

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

      // Find dates where employee check-in / punches actually exist
      let workedDatesSet = new Set();
      try {
        const punchDates = await Attendance.findAll({
          attributes: [
            [sequelize.fn("DISTINCT", sequelize.col("date")), "date"]
          ],
          where: {
            status: { [Op.in]: ["Present", "Late Present", "Half Day", "On Time", "PRESENT", "LATE"] }
          },
          raw: true
        });
        punchDates.forEach(p => {
          if (p.date) workedDatesSet.add(String(p.date));
        });
      } catch (attErr) {
        console.warn("Could not query attendance punch dates for holidays:", attErr.message);
      }

      // Filter by year in JS or query if requested
      const formatted = holidays.map((h) => {
        const plain = h.toJSON ? h.toJSON() : { ...h };
        const dObj = new Date(`${plain.date}T12:00:00+05:30`);
        const dayName = DAY_NAMES[dObj.getDay()] || plain.day || "Day";
        const mShort = MONTH_NAMES[dObj.getMonth()] || plain.month || "JAN";
        const dNum = dObj.getDate() || plain.day_num || 1;
        const fullDateTitle = dObj.toLocaleDateString("en-US", { month: "long", day: "numeric" });

        const isAssignedWorkingDay = Boolean(
          plain.is_working_day ||
          plain.type === "Working Day" ||
          workedDatesSet.has(String(plain.date))
        );

        return {
          id: plain.id,
          name: plain.name,
          day: dayName,
          date: fullDateTitle,
          dateStr: plain.date,
          month: mShort,
          dayNum: dNum,
          type: isAssignedWorkingDay ? "Working Day" : (plain.type || "Public"),
          dept: plain.dept || "All",
          is_working_day: isAssignedWorkingDay,
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
      const { name, date, type = "Public", dept = "All", notes = "", is_working_day = false } = req.body;
      const creatorName = req.user?.name || req.user?.employee_id || "Management";

      if (!name || !date) {
        return res.status(400).json({ error: "Holiday name and date are required" });
      }

      const dObj = new Date(`${date}T12:00:00+05:30`);
      const dayName = DAY_NAMES[dObj.getDay()] || "Day";
      const mShort = MONTH_NAMES[dObj.getMonth()] || "JAN";
      const dNum = dObj.getDate() || 1;

      const workingDayBool = Boolean(is_working_day || type === "Working Day");

      // Upsert by date
      let existing = await Holiday.findOne({ where: { date } });
      if (existing) {
        await existing.update({
          name: name.trim(),
          day: dayName,
          month: mShort,
          day_num: dNum,
          type: workingDayBool ? "Working Day" : (type || "Public"),
          dept: dept || "All",
          is_working_day: workingDayBool,
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
        type: workingDayBool ? "Working Day" : (type || "Public"),
        dept: dept || "All",
        is_working_day: workingDayBool,
        created_by: creatorName,
        notes,
      });

      return res.json({ success: true, message: "Holiday added successfully", data: created });
    } catch (err) {
      console.error("Add holiday error:", err.message);
      return res.status(500).json({ error: "Failed to save holiday" });
    }
  },

  // PUT /api/auth/holidays/:id/toggle-working-day
  async toggleWorkingDay(req, res) {
    try {
      const { id } = req.params;
      const holiday = await Holiday.findByPk(id);
      if (!holiday) {
        return res.status(404).json({ error: "Holiday not found" });
      }

      const currentStatus = Boolean(holiday.is_working_day || holiday.type === "Working Day");
      const nextStatus = !currentStatus;

      await holiday.update({
        is_working_day: nextStatus,
        type: nextStatus ? "Working Day" : "Company"
      });

      return res.json({
        success: true,
        message: nextStatus ? "Marked as Assigned Working Day" : "Reverted to Holiday Off-Day",
        data: {
          id: holiday.id,
          name: holiday.name,
          date: holiday.date,
          is_working_day: nextStatus,
          type: holiday.type
        }
      });
    } catch (err) {
      console.error("Toggle working day error:", err.message);
      return res.status(500).json({ error: "Failed to toggle working day status" });
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
