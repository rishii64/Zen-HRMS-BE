const { Attendance, User, Employee, Schedule, sequelize } = require("../config/db");
const { Op } = require("sequelize");
const { getISTParts, getISTDateStr, getISTTimeStr } = require("../utils/timezone");
const { autoClockOutExpiredAttendance } = require("../services/autoClockOutService");

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

      if (range === "week") {
        const d = new Date(`${istNow.dateStr}T12:00:00+05:30`);
        const dayOfWeek = d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        dateCondition = {
          [Op.between]: [getISTDateStr(start), getISTDateStr(end)]
        };
      } else if (range === "month") {
        const startStr = `${istNow.year}-${String(istNow.month).padStart(2, "0")}-01`;
        const lastDay = new Date(istNow.year, istNow.month, 0).getDate();
        const endStr = `${istNow.year}-${String(istNow.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        dateCondition = {
          [Op.between]: [startStr, endStr]
        };
      } else if (range === "year") {
        const startStr = `${istNow.year}-01-01`;
        const endStr = `${istNow.year}-12-31`;
        dateCondition = {
          [Op.between]: [startStr, endStr]
        };
      } else {
        dateCondition = date || todayStr;
      }

      let whereClause = {
        date: dateCondition,
      };

      // Enforce visibility rules
      if (scope === "my" || emp_id) {
        // Specifically requested personal/target attendance logs
        const targetEmpId = (emp_id && (role === "hr" || role === "admin")) ? emp_id : employee_id;
        whereClause.employee_id = { [Op.iLike]: targetEmpId.trim() };
      } else if (role === "hr" || role === "admin" || role === "hrmanager") {
        // HR/Admin can see all, with optional filter by dept
        if (dept && dept !== "All") {
          whereClause.dept = { [Op.iLike]: dept.trim() };
        }
      } else if (role === "hod" || role === "accounts" || role === "manager" || role === "payroll") {
        // HOD/Accounts/Manager see department logs only
        const filterDept = (dept && dept !== "All") ? dept : (resolvedDept && resolvedDept !== "Other" && resolvedDept !== "General" ? resolvedDept : null);
        if (filterDept) {
          whereClause.dept = { [Op.iLike]: filterDept.trim() };
        }
      } else {
        // Employees can only view their own attendance log history
        whereClause.employee_id = { [Op.iLike]: employee_id.trim() };
      }

      // Automatically finalize any unclosed attendance logs past assigned shift & 14hr session
      await autoClockOutExpiredAttendance().catch((e) =>
        console.warn("[getAttendance Auto Clock-Out Check Warning]:", e.message)
      );

      const records = await Attendance.findAll({
        where: whereClause,
        order: [["date", "DESC"], ["id", "DESC"]],
      });

      // Enrich records with shift information from Schedule table and employee profile details
      let enrichedRecords = records;
      try {
        const dates = [...new Set(records.map(r => r.date).filter(Boolean))];
        const empIds = [...new Set(records.map(r => (r.employee_id || "").trim()).filter(Boolean))];

        let scheduleMap = {};
        if (dates.length > 0) {
          const schedules = await Schedule.findAll({
            where: {
              date: { [Op.in]: dates }
            }
          });
          schedules.forEach(s => {
            const key = `${(s.employee_id || "").toLowerCase().trim()}_${s.date}`;
            scheduleMap[key] = s;
          });
        }

        // Fetch User and Employee profiles for accurate designation and profile photo
        let profileMap = {};
        if (empIds.length > 0) {
          const users = await User.findAll({
            where: {
              employee_id: { [Op.in]: empIds }
            },
            attributes: ["employee_id", "designation", "dept", "profile_photo"]
          });
          users.forEach(u => {
            const key = (u.employee_id || "").toLowerCase().trim();
            profileMap[key] = {
              designation: u.designation,
              dept: u.dept,
              profile_photo: u.profile_photo
            };
          });

          const employees = await Employee.findAll({
            where: {
              employee_id: { [Op.in]: empIds }
            },
            attributes: ["employee_id", "designation", "dept", "profile_photo"]
          });
          employees.forEach(e => {
            const key = (e.employee_id || "").toLowerCase().trim();
            if (!profileMap[key]) {
              profileMap[key] = {
                designation: e.designation,
                dept: e.dept,
                profile_photo: e.profile_photo
              };
            } else {
              if (!profileMap[key].designation && e.designation) {
                profileMap[key].designation = e.designation;
              }
              if (!profileMap[key].profile_photo && e.profile_photo) {
                profileMap[key].profile_photo = e.profile_photo;
              }
            }
          });
        }

        enrichedRecords = records.map(r => {
          const plain = r.toJSON ? r.toJSON() : { ...r };
          const eKey = (plain.employee_id || "").toLowerCase().trim();
          const sKey = `${eKey}_${plain.date}`;
          const matchedSchedule = scheduleMap[sKey];
          const matchedProfile = profileMap[eKey];

          plain.shift_name = matchedSchedule?.shift_name || "General Shift";
          plain.shift_start = matchedSchedule?.start_time || "10:00";
          plain.shift_end = matchedSchedule?.end_time || "19:00";
          plain.designation = matchedProfile?.designation || plain.designation || "Staff";
          plain.profile_photo = matchedProfile?.profile_photo || plain.profile_photo || null;
          if (matchedProfile?.dept && (!plain.dept || plain.dept === "General")) {
            plain.dept = matchedProfile.dept;
          }
          return plain;
        });
      } catch (enrichErr) {
        console.warn("Could not enrich attendance with schedules and profiles:", enrichErr.message);
      }

      return res.json({ success: true, data: enrichedRecords });
    } catch (err) {
      console.error("Get attendance error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve attendance records" });
    }
  },

  // GET /api/auth/attendance/today-status
  async getTodayStatus(req, res) {
    try {
      const { employee_id } = req.user;

      // Automatically clock-out if assigned shift ended and 14hr session threshold elapsed
      await autoClockOutExpiredAttendance({ employee_id }).catch((e) =>
        console.warn("[getTodayStatus Auto Clock-Out Warning]:", e.message)
      );

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

      let record = await Attendance.findOne({
        where: { employee_id, date }
      });

      if (record) {
        await record.update({
          name: resolvedName,
          dept: resolvedDept,
          check_in: check_in || record.check_in,
          check_out: check_out || record.check_out,
          status,
          notes: notes || record.notes,
          work_hours: work_hours || record.work_hours,
        });
      } else {
        record = await Attendance.create({
          employee_id,
          name: resolvedName,
          dept: resolvedDept,
          date,
          check_in: check_in || null,
          check_out: check_out || null,
          status,
          notes: notes || null,
          work_hours: work_hours || 0
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

  // POST /api/auth/attendance/auto-clock-out
  async autoClockOut(req, res) {
    try {
      const { employee_id } = req.user;
      const { forceIfShiftEnded } = req.body || {};

      const result = await autoClockOutExpiredAttendance({
        employee_id,
        forceIfShiftEnded: forceIfShiftEnded !== undefined ? forceIfShiftEnded : true,
      });

      return res.json({
        success: true,
        message: result.updatedCount > 0
          ? "Employee automatically clocked out successfully."
          : "No unclosed shift pending clock-out.",
        ...result,
      });
    } catch (err) {
      console.error("Auto clock-out error:", err.message);
      return res.status(500).json({ error: "Failed to perform automatic clock-out" });
    }
  },
};

module.exports = AttendanceController;
