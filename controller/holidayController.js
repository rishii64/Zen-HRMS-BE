const { Holiday, Attendance, Employee, sequelize } = require("../config/db");
const { Op } = require("sequelize");

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_BRANCH_LIST = [
  "All",
  "Kolkata",
  "Mumbai",
  "Bengaluru",
  "Delhi NCR",
  "Odisha",
  "International - Dubai",
  "International - London"
];

const HolidayController = {
  // GET /api/auth/holidays
  async getHolidays(req, res) {
    try {
      const { year, location, branch, dept, strict } = req.query;
      const targetLoc = (location || branch || "").trim();

      const holidays = await Holiday.findAll({
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

      // Collect unique branches across all records
      const branchSet = new Set(DEFAULT_BRANCH_LIST);
      const branchStats = {};
      DEFAULT_BRANCH_LIST.forEach(b => {
        branchStats[b] = 0;
      });

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

        const branchLoc = plain.branch_location || "All";
        branchSet.add(branchLoc);
        branchStats[branchLoc] = (branchStats[branchLoc] || 0) + 1;

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
          branch_location: branchLoc,
          is_working_day: isAssignedWorkingDay,
          notes: plain.notes || "",
          created_by: plain.created_by || null,
        };
      });

      // Filter by year if requested
      let filtered = year ? formatted.filter((h) => h.dateStr.startsWith(String(year))) : formatted;

      // Filter by department if requested
      if (dept && dept.toLowerCase() !== "all") {
        filtered = filtered.filter(h =>
          !h.dept || h.dept.toLowerCase() === "all" || h.dept.toLowerCase() === dept.toLowerCase()
        );
      }

      // Filter by branch/location
      if (targetLoc && targetLoc.toLowerCase() !== "all" && targetLoc.toLowerCase() !== "all branches") {
        const targetLower = targetLoc.toLowerCase();
        if (strict === "true") {
          // Strict: only holidays explicitly assigned to target branch
          filtered = filtered.filter(h => (h.branch_location || "All").toLowerCase() === targetLower);
        } else {
          // Normal: holidays applicable to this branch = Universal "All" + branch-specific holidays
          filtered = filtered.filter(h => {
            const hLoc = (h.branch_location || "All").toLowerCase();
            return (
              hLoc === "all" ||
              hLoc === "all branches" ||
              hLoc === targetLower ||
              hLoc.includes(targetLower) ||
              targetLower.includes(hLoc)
            );
          });
        }
      }

      return res.json({
        success: true,
        data: filtered,
        total: filtered.length,
        branches: Array.from(branchSet),
        branchStats,
        activeLocation: targetLoc || "All"
      });
    } catch (err) {
      console.error("Get holidays error:", err.message);
      return res.status(500).json({ error: "Failed to load holiday calendar" });
    }
  },

  // GET /api/auth/holidays/branches
  // Returns summary breakdown of all configured branches, total holidays and upcoming holiday per branch
  async getBranchSummary(req, res) {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const holidays = await Holiday.findAll({
        order: [["date", "ASC"]],
        raw: true
      });

      const branchMap = {};
      DEFAULT_BRANCH_LIST.forEach(b => {
        branchMap[b] = {
          branch: b,
          totalHolidays: 0,
          workingDaysAssigned: 0,
          upcomingHoliday: null
        };
      });

      holidays.forEach(h => {
        const branchLoc = h.branch_location || "All";
        if (!branchMap[branchLoc]) {
          branchMap[branchLoc] = {
            branch: branchLoc,
            totalHolidays: 0,
            workingDaysAssigned: 0,
            upcomingHoliday: null
          };
        }

        const bObj = branchMap[branchLoc];
        bObj.totalHolidays++;
        if (h.is_working_day || h.type === "Working Day") {
          bObj.workingDaysAssigned++;
        }

        if (!bObj.upcomingHoliday && h.date >= todayStr && !h.is_working_day && h.type !== "Working Day") {
          bObj.upcomingHoliday = {
            name: h.name,
            date: h.date,
            day: h.day,
            type: h.type
          };
        }
      });

      // Calculate effective holiday count for each specific branch (Branch Specific + Universal "All")
      const universalCount = branchMap["All"] ? branchMap["All"].totalHolidays : 0;
      const branchSummaryList = Object.values(branchMap).map(b => ({
        ...b,
        effectiveTotal: b.branch === "All" ? b.totalHolidays : b.totalHolidays + universalCount
      }));

      return res.json({
        success: true,
        data: branchSummaryList,
        defaultBranches: DEFAULT_BRANCH_LIST
      });
    } catch (err) {
      console.error("Get branch summary error:", err.message);
      return res.status(500).json({ error: "Failed to load branch holiday summary" });
    }
  },

  // POST /api/auth/holidays
  async addHoliday(req, res) {
    try {
      const {
        name,
        date,
        type = "Public",
        dept = "All",
        branch_location,
        location,
        branch,
        notes = "",
        is_working_day = false
      } = req.body;

      const creatorName = req.user?.name || req.user?.employee_id || "Management";
      const finalBranch = String(branch_location || location || branch || "All").trim();

      if (!name || !date) {
        return res.status(400).json({ error: "Holiday name and date are required" });
      }

      const dObj = new Date(`${date}T12:00:00+05:30`);
      const dayName = DAY_NAMES[dObj.getDay()] || "Day";
      const mShort = MONTH_NAMES[dObj.getMonth()] || "JAN";
      const dNum = dObj.getDate() || 1;

      const workingDayBool = Boolean(is_working_day || type === "Working Day");

      // Upsert by date AND branch_location
      let existing = await Holiday.findOne({
        where: {
          date,
          branch_location: finalBranch
        }
      });

      if (existing) {
        await existing.update({
          name: name.trim(),
          day: dayName,
          month: mShort,
          day_num: dNum,
          type: workingDayBool ? "Working Day" : (type || "Public"),
          dept: dept || "All",
          branch_location: finalBranch,
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
        branch_location: finalBranch,
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
          branch_location: holiday.branch_location,
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
