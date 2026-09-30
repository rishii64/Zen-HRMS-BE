const { Attendance, User, Employee, Schedule, sequelize } = require("../config/db");
const { Op } = require("sequelize");
const { getISTParts, getISTDateStr, getISTTimeStr } = require("../utils/timezone");

const getTodayDateStr = () => {
  return getISTDateStr();
};

// Helper to resolve an employee's assigned schedule and determine check-in status
const resolveShiftAndStatus = async (employee_id, today, utcToday, now) => {
  try {
    // 1. Check for a schedule specifically assigned for today
    let schedule = await Schedule.findOne({
      where: {
        [Op.and]: [
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            employee_id.toLowerCase().trim()
          ),
          { date: { [Op.or]: [today, utcToday] } }
        ]
      },
      order: [["id", "DESC"]]
    });

    // 2. If no specific schedule for today, check the most recent schedule assignment
    if (!schedule) {
      schedule = await Schedule.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
        order: [["date", "DESC"], ["id", "DESC"]]
      });
    }

    // Default company shift: General Shift (10:00 AM - 19:00 PM)
    let shiftStartHour = 10;
    let shiftStartMinute = 0;
    let shiftEndHour = 19;
    let shiftEndMinute = 0;
    let shiftName = "General Shift";

    if (schedule) {
      if (schedule.shift_name) shiftName = schedule.shift_name;
      if (schedule.start_time) {
        const parts = schedule.start_time.split(":");
        const pHour = parseInt(parts[0], 10);
        const pMin = parseInt(parts[1] || "0", 10);
        if (!isNaN(pHour)) {
          shiftStartHour = pHour;
          shiftStartMinute = isNaN(pMin) ? 0 : pMin;
        }
      }
      if (schedule.end_time) {
        const parts = schedule.end_time.split(":");
        const pHour = parseInt(parts[0], 10);
        const pMin = parseInt(parts[1] || "0", 10);
        if (!isNaN(pHour)) {
          shiftEndHour = pHour;
          shiftEndMinute = isNaN(pMin) ? 0 : pMin;
        }
      }
    }

    const GRACE_MINUTES = 15;
    const ist = getISTParts(now);
    const currentHour = ist.hour;
    const currentMinute = ist.minute;
    const checkInMinutes = currentHour * 60 + currentMinute;
    const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;

    let isLate = false;
    // Handle night shifts crossing midnight (shift start >= 18:00 and check-in early morning next day)
    if (shiftStartHour >= 18 && currentHour < 6) {
      const adjustedCheckInMinutes = (currentHour + 24) * 60 + currentMinute;
      isLate = adjustedCheckInMinutes > (shiftStartMinutes + GRACE_MINUTES);
    } else {
      // If employee logs in before or at shift start time: always ON TIME (Present, late_count = 0)
      // If employee logs in within grace period: ON TIME (Present, late_count = 0)
      // If employee logs in after shift start time + grace period: Late Present (late_count = 1)
      isLate = checkInMinutes > (shiftStartMinutes + GRACE_MINUTES);
    }

    const status = isLate ? "Late Present" : "Present";
    const late_count = isLate ? 1 : 0;

    return {
      status,
      late_count,
      shift_name: shiftName,
      shift_start: `${String(shiftStartHour).padStart(2, "0")}:${String(shiftStartMinute).padStart(2, "0")}`,
      shift_end: `${String(shiftEndHour).padStart(2, "0")}:${String(shiftEndMinute).padStart(2, "0")}`,
      schedule
    };
  } catch (err) {
    console.error("Error resolving shift timing:", err.message);
    // Safe fallback to General Shift (10:00 AM) using IST
    const ist = getISTParts(now);
    const currentHour = ist.hour;
    const currentMinute = ist.minute;
    const checkInMinutes = currentHour * 60 + currentMinute;
    const isLate = checkInMinutes > (10 * 60 + 15);
    return {
      status: isLate ? "Late Present" : "Present",
      late_count: isLate ? 1 : 0,
      shift_name: "General Shift",
      shift_start: "10:00",
      shift_end: "19:00",
      schedule: null
    };
  }
};

const AttendanceController = {
  // GET /api/auth/attendance
  async getAttendance(req, res) {
    try {
      const { date, dept, range, scope, emp_id } = req.query;
      const { role, employee_id } = req.user;

      // Find user details to check department
      const user = await User.findOne({ where: { employee_id } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Resolve department from User model or fallback to Employee model
      let resolvedDept = user.dept;
      if (!resolvedDept || resolvedDept === "Other" || resolvedDept === "General") {
        const emp = await Employee.findOne({ where: { employee_id } });
        if (emp && (emp.dept || emp.department)) {
          resolvedDept = emp.dept || emp.department;
        }
      }

      const istNow = getISTParts();
      const todayStr = istNow.dateStr;
      let dateCondition;
      let startDateStr = todayStr;
      let endDateStr = todayStr;

      if (req.query.from && req.query.to) {
        startDateStr = req.query.from;
        endDateStr = req.query.to;
        dateCondition = {
          [Op.between]: [startDateStr, endDateStr]
        };
      } else if (range === "week") {
        const baseDate = (date && typeof date === "string" && !isNaN(new Date(date).getTime())) ? date : istNow.dateStr;
        const d = new Date(`${baseDate}T12:00:00+05:30`);
        const dayOfWeek = d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        startDateStr = getISTDateStr(start);
        endDateStr = getISTDateStr(end);
        dateCondition = {
          [Op.between]: [startDateStr, endDateStr]
        };
      } else if (range === "month") {
        let targetYear = istNow.year;
        let targetMonth = istNow.month;
        if (date && typeof date === "string" && date.includes("-")) {
          const parts = date.split("-");
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
            targetYear = y;
            targetMonth = m;
          }
        }
        startDateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        endDateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        dateCondition = {
          [Op.between]: [startDateStr, endDateStr]
        };
      } else if (range === "year") {
        let targetYear = istNow.year;
        if (date && typeof date === "string" && date.includes("-")) {
          const y = parseInt(date.split("-")[0], 10);
          if (!isNaN(y) && y > 2000) targetYear = y;
        }
        startDateStr = `${targetYear}-01-01`;
        endDateStr = `${targetYear}-12-31`;
        dateCondition = {
          [Op.between]: [startDateStr, endDateStr]
        };
      } else if (range === "day") {
        startDateStr = date || todayStr;
        endDateStr = date || todayStr;
        dateCondition = date || todayStr;
      } else {
        startDateStr = date || todayStr;
        endDateStr = date || todayStr;
        dateCondition = date || todayStr;
      }

      let whereClause = {
        date: dateCondition,
      };

      // Enforce visibility rules
      let empWhere = { status: { [Op.ne]: "Terminated" } };

      if (scope === "my" || emp_id) {
        // Specifically requested personal/target attendance logs
        const isSupervisor = role === "hr" || role === "admin" || role === "hrmanager" || role === "hod" || role === "manager" || role === "teamlead";
        const targetEmpId = (emp_id && isSupervisor) ? emp_id : employee_id;
        whereClause.employee_id = { [Op.iLike]: targetEmpId.trim() };
        empWhere.employee_id = { [Op.iLike]: targetEmpId.trim() };
      } else if (role === "hr" || role === "admin" || role === "hrmanager") {
        // HR/Admin can see all, with optional filter by dept
        if (dept && dept !== "All") {
          whereClause.dept = { [Op.iLike]: dept.trim() };
          empWhere.dept = { [Op.iLike]: dept.trim() };
        }
      } else if (role === "hod" || role === "accounts" || role === "manager" || role === "payroll") {
        // HOD/Accounts/Manager see department logs only
        const filterDept = (dept && dept !== "All") ? dept : (resolvedDept && resolvedDept !== "Other" && resolvedDept !== "General" ? resolvedDept : null);
        if (filterDept) {
          whereClause.dept = { [Op.iLike]: filterDept.trim() };
          empWhere.dept = { [Op.iLike]: filterDept.trim() };
        }
      } else {
        // Employees can only view their own attendance log history
        whereClause.employee_id = { [Op.iLike]: employee_id.trim() };
        empWhere.employee_id = { [Op.iLike]: employee_id.trim() };
      }

      const records = await Attendance.findAll({
        where: whereClause,
        order: [["date", "DESC"], ["id", "DESC"]],
      });

      // Enrich records with shift information from Schedule table and employee profile details
      let enrichedRecords = records;
      let synthesizedRecords = [];

      try {
        // 1. Fetch all employees in scope
        const activeEmployees = await Employee.findAll({
          where: empWhere,
          attributes: ["id", "employee_id", "first_name", "last_name", "dept", "designation", "profile_photo", "weekly_off", "joining_date"]
        });

        const activeUsers = await User.findAll({
          where: empWhere,
          attributes: ["id", "employee_id", "name", "dept", "designation", "profile_photo", "weekly_off"]
        });

        const employeeCatalog = new Map();
        activeEmployees.forEach(e => {
          const key = (e.employee_id || "").toLowerCase().trim();
          const fullName = `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.employee_id;
          employeeCatalog.set(key, {
            employee_id: e.employee_id,
            name: fullName,
            dept: e.dept || "General",
            designation: e.designation || "Staff",
            profile_photo: e.profile_photo || null,
            weekly_off: e.weekly_off || "Sunday",
            joining_date: e.joining_date || null
          });
        });

        activeUsers.forEach(u => {
          const key = (u.employee_id || "").toLowerCase().trim();
          if (!employeeCatalog.has(key)) {
            employeeCatalog.set(key, {
              employee_id: u.employee_id,
              name: u.name,
              dept: u.dept || "General",
              designation: u.designation || "Staff",
              profile_photo: u.profile_photo || null,
              weekly_off: u.weekly_off || "Sunday",
              joining_date: null
            });
          }
        });

        // 2. Fetch all schedules in this date window
        const schedules = await Schedule.findAll({
          where: {
            date: { [Op.between]: [startDateStr, endDateStr] }
          }
        });

        const scheduleMap = {};
        schedules.forEach(s => {
          const key = `${(s.employee_id || "").toLowerCase().trim()}_${s.date}`;
          scheduleMap[key] = s;
        });

        // 3. Enrich existing punched records
        enrichedRecords = records.map(r => {
          const plain = r.toJSON ? r.toJSON() : { ...r };
          const eKey = (plain.employee_id || "").toLowerCase().trim();
          const sKey = `${eKey}_${plain.date}`;
          const matchedSchedule = scheduleMap[sKey];
          const matchedProfile = employeeCatalog.get(eKey);

          plain.shift_name = matchedSchedule?.shift_name || "General Shift";
          plain.shift_start = matchedSchedule?.start_time || "10:00";
          plain.shift_end = matchedSchedule?.end_time || "19:00";
          plain.designation = matchedProfile?.designation || plain.designation || "Staff";
          plain.profile_photo = matchedProfile?.profile_photo || plain.profile_photo || null;
          if (matchedProfile?.dept && (!plain.dept || plain.dept === "General")) {
            plain.dept = matchedProfile.dept;
          }
          plain.notes = plain.notes !== undefined ? plain.notes : (r.notes || null);
          return plain;
        });

        // 4. Synthesize absent, week-off and roster days for all dates in range
        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

        const dateList = [];
        const curD = new Date(startDateStr + "T12:00:00+05:30");
        const maxD = new Date(endDateStr + "T12:00:00+05:30");

        while (curD <= maxD) {
          dateList.push(getISTDateStr(curD));
          curD.setDate(curD.getDate() + 1);
        }

        const existingAttendanceMap = new Set();
        records.forEach(r => {
          const k = `${(r.employee_id || "").toLowerCase().trim()}_${r.date}`;
          existingAttendanceMap.add(k);
        });

        for (const [eKey, emp] of employeeCatalog.entries()) {
          for (const dStr of dateList) {
            const mapKey = `${eKey}_${dStr}`;
            if (existingAttendanceMap.has(mapKey)) {
              continue; // employee has actual punch record
            }

            if (emp.joining_date && dStr < emp.joining_date) {
              continue; // don't synthesize absents prior to joining date
            }

            const matchedSchedule = scheduleMap[mapKey];
            const dObj = new Date(dStr + "T12:00:00+05:30");
            const dayName = dayNames[dObj.getDay()];
            const empWeeklyOff = (emp.weekly_off || "Sunday").toLowerCase().trim();
            const isFuture = dStr > todayStr;

            let status = isFuture ? "Scheduled" : "Absent";
            let shiftName = "General Shift";
            let shiftStart = "10:00";
            let shiftEnd = "19:00";
            let notes = isFuture ? "Upcoming Scheduled Shift" : "No check-in recorded (Absent)";

            if (matchedSchedule) {
              shiftName = matchedSchedule.shift_name || "General Shift";
              shiftStart = matchedSchedule.start_time || "10:00";
              shiftEnd = matchedSchedule.end_time || "19:00";

              if (shiftName.toLowerCase().includes("off")) {
                status = "Week Off";
                shiftStart = "—";
                shiftEnd = "—";
                notes = matchedSchedule.notes || "Scheduled Rotational Week Off";
              } else {
                status = isFuture ? "Scheduled" : "Absent";
                notes = matchedSchedule.notes || (isFuture ? "Upcoming Scheduled Shift" : "No check-in recorded (Absent)");
              }
            } else {
              // Check employee's weekly_off setting
              if (dayName === empWeeklyOff) {
                status = "Week Off";
                shiftName = "Week Off";
                shiftStart = "—";
                shiftEnd = "—";
                notes = "Weekly Off";
              } else {
                status = isFuture ? "Scheduled" : "Absent";
                shiftName = "General Shift";
                shiftStart = "10:00";
                shiftEnd = "19:00";
                notes = isFuture ? "Upcoming Scheduled Shift" : "No check-in recorded (Absent)";
              }
            }

            synthesizedRecords.push({
              id: `syn-${emp.employee_id}-${dStr}`,
              employee_id: emp.employee_id,
              name: emp.name,
              dept: emp.dept,
              designation: emp.designation,
              profile_photo: emp.profile_photo,
              date: dStr,
              check_in: null,
              check_out: null,
              work_hours: 0,
              late_count: 0,
              status,
              shift_name: shiftName,
              shift_start: shiftStart,
              shift_end: shiftEnd,
              notes,
              is_synthesized: true
            });
          }
        }
      } catch (enrichErr) {
        console.warn("Could not enrich attendance with schedules and profiles:", enrichErr.message);
      }

      // Combine real logs and synthesized records, ordered by date descending
      const combinedRecords = [...enrichedRecords, ...synthesizedRecords].sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return (a.employee_id || "").localeCompare(b.employee_id || "");
      });

      return res.json({ success: true, data: combinedRecords });
    } catch (err) {
      console.error("Get attendance error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve attendance records" });
    }
  },

  // GET /api/auth/attendance/today-status
  async getTodayStatus(req, res) {
    try {
      const { employee_id } = req.user;

      const istNow = getISTParts();
      const today = istNow.dateStr;
      const utcToday = new Date().toISOString().split("T")[0];

      let record = await Attendance.findOne({
        where: {
          employee_id,
          date: { [Op.or]: [today, utcToday] },
        },
      });

      // Find schedule if any
      let schedule = null;
      try {
        schedule = await Schedule.findOne({
          where: {
            [Op.and]: [
              sequelize.where(
                sequelize.fn("LOWER", sequelize.col("employee_id")),
                employee_id.toLowerCase().trim()
              ),
              { date: { [Op.or]: [today, utcToday] } }
            ]
          },
          order: [["id", "DESC"]]
        });
        if (!schedule) {
          schedule = await Schedule.findOne({
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              employee_id.toLowerCase().trim()
            ),
            order: [["date", "DESC"], ["id", "DESC"]]
          });
        }
      } catch (sErr) {
        console.warn("Could not fetch schedule for today status:", sErr.message);
      }

      let plainRecord = record ? (record.toJSON ? record.toJSON() : { ...record }) : null;
      if (plainRecord) {
        plainRecord.shift_name = schedule?.shift_name || "General Shift";
        plainRecord.shift_start = schedule?.start_time || "10:00";
        plainRecord.shift_end = schedule?.end_time || "19:00";
      }

      return res.json({
        success: true,
        checkedIn: !!record?.check_in,
        checkedOut: !!record?.check_out,
        record: plainRecord,
        schedule: schedule || null,
      });
    } catch (err) {
      console.error("Get today status error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve today's status" });
    }
  },

  // POST /api/auth/attendance/check-in
  async checkIn(req, res) {
    try {
      const { employee_id } = req.user;
      const istNow = getISTParts();
      const today = istNow.dateStr;
      const utcToday = new Date().toISOString().split("T")[0];
      const timeStr = istNow.timeStr; // "HH:MM:SS" in IST!

      const user = await User.findOne({ where: { employee_id } });
      if (!user) {
        return res.status(404).json({ error: "User profile not found" });
      }

      let record = await Attendance.findOne({
        where: {
          employee_id,
          date: { [Op.or]: [today, utcToday] },
        },
      });

      if (record && record.check_in) {
        return res.status(400).json({ error: "Already checked in today" });
      }

      // Check shift timing and determine if on-time (Present) or late (Late Present) in IST
      const shiftInfo = await resolveShiftAndStatus(employee_id, today, utcToday, new Date());
      const status = shiftInfo.status;
      const late_count = shiftInfo.late_count;

      const resolvedDept = (user.role === "hr" || user.role === "hrmanager" || user.role === "admin") ? "HR" : (user.dept || "Other");

      if (!record) {
        record = await Attendance.create({
          employee_id,
          name: user.name,
          dept: resolvedDept,
          date: today,
          check_in: timeStr,
          status,
          late_count,
        });
      } else {
        await record.update({
          date: today,
          check_in: timeStr,
          status,
          late_count,
        });
      }

      const responseRecord = record.toJSON ? record.toJSON() : { ...record };
      responseRecord.shift_name = shiftInfo.shift_name;
      responseRecord.shift_start = shiftInfo.shift_start;
      responseRecord.shift_end = shiftInfo.shift_end;

      return res.json({
        success: true,
        message: `Checked in successfully at ${timeStr} (${status === "Present" ? "On Time" : "Late"})`,
        record: responseRecord,
      });
    } catch (err) {
      console.error("Check-in error:", err.message);
      return res.status(500).json({ error: "Failed to record check-in" });
    }
  },

  // POST /api/auth/attendance/check-out
  async checkOut(req, res) {
    try {
      const { employee_id } = req.user;
      const istNow = getISTParts();
      const today = istNow.dateStr;
      const utcToday = new Date().toISOString().split("T")[0];
      const timeStr = istNow.timeStr; // "HH:MM:SS" in IST!

      const record = await Attendance.findOne({
        where: {
          employee_id,
          date: { [Op.or]: [today, utcToday] },
        },
      });

      if (!record || !record.check_in) {
        return res.status(400).json({ error: "Please check in before checking out" });
      }

      if (record.check_out) {
        return res.status(400).json({ error: "Already checked out today" });
      }

      // Calculate work hours using IST timestamps
      const inDate = new Date(`${record.date}T${record.check_in}+05:30`);
      const outDate = new Date(`${today}T${timeStr}+05:30`);
      const diffMs = Math.max(0, outDate - inDate);
      const diffHrs = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));

      await record.update({
        check_out: timeStr,
        work_hours: diffHrs,
      });

      return res.json({
        success: true,
        message: `Checked out successfully at ${timeStr}. Work duration: ${diffHrs} hours.`,
        record,
      });
    } catch (err) {
      console.error("Check-out error:", err.message);
      return res.status(500).json({ error: "Failed to record check-out" });
    }
  },

  // POST /api/auth/attendance/mark
  async markManualAttendance(req, res) {
    try {
      const { role, employee_id: creatorId } = req.user;
      const {
        employee_id,
        name,
        dept,
        date,
        check_in,
        check_out,
        status,
        notes,
        work_hours
      } = req.body;

      if (!employee_id || !date || !status) {
        return res.status(400).json({ error: "Employee ID, Date, and Status are required" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isHodOrManager = role === "hod" || role === "manager";

      if (!isHrOrAdmin && !isHodOrManager) {
        return res.status(403).json({ error: "Only HR, Admin, or Team Leads can mark attendance manually" });
      }

      const targetUser = await User.findOne({ where: { employee_id } });
      const resolvedName = name || (targetUser ? targetUser.name : "Employee");
      const resolvedDept = dept || (targetUser ? targetUser.dept : "General");

      let record = null;
      if (req.body.id) {
        record = await Attendance.findByPk(req.body.id);
      }
      if (!record) {
        record = await Attendance.findOne({
          where: {
            employee_id: { [Op.iLike]: employee_id.trim() },
            date,
          },
        });
      }

      if (record) {
        await record.update({
          name: resolvedName,
          dept: resolvedDept,
          check_in: check_in || record.check_in,
          check_out: check_out || record.check_out,
          status,
          notes: notes !== undefined ? notes : record.notes,
          work_hours: work_hours || record.work_hours,
        });
      } else {
        record = await Attendance.create({
          employee_id: employee_id.trim(),
          name: resolvedName,
          dept: resolvedDept,
          date,
          check_in: check_in || null,
          check_out: check_out || null,
          status,
          notes: notes || null,
          work_hours: work_hours || 0,
        });
      }

      return res.json({
        success: true,
        message: "Attendance marked successfully",
        record
      });
    } catch (err) {
      console.error("Mark manual attendance error:", err.message);
      return res.status(500).json({ error: "Failed to mark manual attendance" });
    }
  },

  // POST /api/auth/attendance/auto-clock-out (Feature disabled)
  async autoClockOut(req, res) {
    return res.json({
      success: true,
      updatedCount: 0,
      message: "Auto clock-out feature has been disabled.",
    });
  },

  // POST /api/auth/attendance/portal-logout (Feature disabled - logout no longer clocks out)
  async portalLogout(req, res) {
    return res.json({
      success: true,
      clockedOut: false,
      message: "Portal logout processed cleanly.",
    });
  },
};

module.exports = AttendanceController;
