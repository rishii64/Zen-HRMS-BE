const { Schedule, User, Employee } = require("../config/db");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");

const ScheduleController = {
  // GET /api/auth/schedule
  async getSchedule(req, res) {
    try {
      const { dept, week_start, date } = req.query;
      const { role, employee_id } = req.user;

      // Find user details to check department & permissions
      const currentUser = await User.findOne({ where: { employee_id } });
      if (!currentUser) {
        return res.status(404).json({ error: "User profile not found" });
      }

      const userDept = currentUser.dept || "Other";
      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isHodOrManager = role === "hod" || role === "manager" || role === "accounts";

      let whereClause = {};

      // 1. Department Visibility Rules
      if (isHrOrAdmin) {
        // HR / Admin has ROOT Schedule Access (Can view all, or filter by requested dept)
        if (dept && dept !== "All") {
          whereClause.dept = { [Op.iLike]: dept.trim() };
        }
      } else if (isHodOrManager) {
        // HOD / Team Lead manages their department schedule
        const targetDept = (dept && dept !== "All") ? dept : userDept;
        whereClause.dept = { [Op.iLike]: targetDept.trim() };
      } else {
        // Employees view schedule of their department
        const targetDept = (dept && dept !== "All") ? dept : userDept;
        whereClause.dept = { [Op.iLike]: targetDept.trim() };
      }

      // 2. Week/Date Filtering
      if (week_start) {
        whereClause.week_start = week_start;
      }
      if (date) {
        whereClause.date = date;
      }
      if (req.query.from && req.query.to) {
        whereClause.date = { [Op.between]: [req.query.from, req.query.to] };
      }

      const schedules = await Schedule.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "role", "dept", "designation", "weekly_off"]
          }
        ],
        order: [["date", "ASC"], ["employee_id", "ASC"]]
      });

      return res.json({ success: true, data: schedules });
    } catch (err) {
      console.error("Get schedule error:", err.message);
      return res.status(500).json({ error: "Failed to fetch schedule records" });
    }
  },

  // POST /api/auth/schedule/create
  async createSchedule(req, res) {
    try {
      const { role, employee_id: creatorId } = req.user;
      const {
        employee_id,
        name,
        dept,
        designation,
        shift_name,
        start_time,
        end_time,
        date,
        week_start,
        notes
      } = req.body;

      if (!employee_id || !date || !shift_name) {
        return res.status(400).json({ error: "Employee ID, Date, and Shift Name are required" });
      }

      const creator = await User.findOne({ where: { employee_id: creatorId } });
      const targetUser = await User.findOne({ where: { employee_id } });

      if (!targetUser) {
        return res.status(404).json({ error: "Target employee not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isHodOrManager = role === "hod" || role === "manager";

      // Permission Enforcement
      if (!isHrOrAdmin && !isHodOrManager) {
        return res.status(403).json({ error: "Only HOD, HR, or Admin can assign schedules" });
      }

      if (isHodOrManager && !isHrOrAdmin) {
        // HOD can only assign to their department
        if (targetUser.dept && creator.dept && targetUser.dept.toLowerCase() !== creator.dept.toLowerCase()) {
          return res.status(403).json({ error: "HOD can only assign schedules within their department" });
        }
      }

      const resolvedDept = dept || targetUser.dept || "General";
      const resolvedName = name || targetUser.name;
      const resolvedDesignation = designation || targetUser.designation || "Staff";

      const isOff = (shift_name || "").toLowerCase().includes("off");
      const resolvedStartTime = isOff ? "—" : (start_time || "10:00");
      const resolvedEndTime = isOff ? "—" : (end_time || "19:00");

      // Find or create schedule for employee + date
      let schedule = await Schedule.findOne({
        where: {
          employee_id,
          date
        }
      });

      if (schedule) {
        await schedule.update({
          name: resolvedName,
          dept: resolvedDept,
          designation: resolvedDesignation,
          shift_name,
          start_time: resolvedStartTime,
          end_time: resolvedEndTime,
          week_start: week_start || null,
          is_rotational_off: isOff,
          created_by: creator?.name || creatorId,
          notes: notes || null
        });
      } else {
        schedule = await Schedule.create({
          employee_id,
          name: resolvedName,
          dept: resolvedDept,
          designation: resolvedDesignation,
          shift_name,
          start_time: resolvedStartTime,
          end_time: resolvedEndTime,
          date,
          week_start: week_start || null,
          status: "Published",
          is_rotational_off: isOff,
          created_by: creator?.name || creatorId,
          notes: notes || null
        });
      }

      return res.status(201).json({
        success: true,
        message: "Shift schedule assigned successfully",
        schedule
      });
    } catch (err) {
      console.error("Create schedule error:", err.message);
      return res.status(500).json({ error: "Failed to save shift schedule" });
    }
  },

  // POST /api/auth/schedule/assign-rotational
  async assignRotationalWeekOff(req, res) {
    try {
      const { role, employee_id: creatorId } = req.user;
      const {
        employee_ids,
        rotational_off_day,
        shift_name = "General Shift",
        start_time = "10:00",
        end_time = "19:00",
        start_date,
        end_date,
        set_as_default = true,
        notes = "Rotational Week Off"
      } = req.body;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isHodOrManager = role === "hod" || role === "manager";

      if (!isHrOrAdmin && !isHodOrManager) {
        return res.status(403).json({ error: "Only HOD, HR, or Admin can assign rotational schedules" });
      }

      if (!rotational_off_day || !start_date || !end_date) {
        return res.status(400).json({ error: "Rotational off day, start date, and end date are required" });
      }

      const creator = await User.findOne({ where: { employee_id: creatorId } });
      const creatorDept = creator ? (creator.dept || "General") : "General";

      // 1. Resolve target employees
      let targetEmpCodes = Array.isArray(employee_ids) ? employee_ids : (employee_ids ? [employee_ids] : []);
      let targetUsers = [];

      if (targetEmpCodes.length === 0 || targetEmpCodes.includes("all")) {
        let userWhere = {};
        if (!isHrOrAdmin) {
          userWhere.dept = { [Op.iLike]: creatorDept.trim() };
        }
        targetUsers = await User.findAll({ where: userWhere });
      } else {
        targetUsers = await User.findAll({
          where: {
            employee_id: { [Op.in]: targetEmpCodes }
          }
        });
      }

      if (targetUsers.length === 0) {
        return res.status(404).json({ error: "No matching employees found for rotational schedule assignment" });
      }

      // Check department boundary if HOD
      if (isHodOrManager && !isHrOrAdmin) {
        const outsideDept = targetUsers.some(
          (u) => u.dept && u.dept.toLowerCase() !== creatorDept.toLowerCase()
        );
        if (outsideDept) {
          return res.status(403).json({ error: "HOD can only assign rotational schedules within their department" });
        }
      }

      // 2. Prepare date range & day mapping
      const targetOffDay = rotational_off_day.trim().toLowerCase();
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

      const datesToProcess = [];
      const cur = new Date(start_date + "T12:00:00+05:30");
      const endD = new Date(end_date + "T12:00:00+05:30");

      while (cur <= endD) {
        const dStr = cur.toISOString().split("T")[0];
        const dayOfWeekIndex = cur.getDay();
        const dayOfWeekName = dayNames[dayOfWeekIndex];
        datesToProcess.push({
          dateStr: dStr,
          dayName: dayOfWeekName,
          isRotationalOff: dayOfWeekName === targetOffDay
        });
        cur.setDate(cur.getDate() + 1);
      }

      let totalUpdated = 0;

      for (const u of targetUsers) {
        // Map to Employee and User tables: update default weekly_off
        if (set_as_default) {
          await User.update(
            { weekly_off: rotational_off_day },
            { where: { employee_id: u.employee_id } }
          );
          await Employee.update(
            { weekly_off: rotational_off_day },
            { where: { employee_id: u.employee_id } }
          );
        }

        // Upsert schedule records for each date in the period
        for (const item of datesToProcess) {
          const shiftForDay = item.isRotationalOff ? "Week Off" : (shift_name || "General Shift");
          const sTime = item.isRotationalOff ? "—" : (start_time || "10:00");
          const eTime = item.isRotationalOff ? "—" : (end_time || "19:00");
          const dayNotes = item.isRotationalOff ? (notes || "Rotational Week Off") : null;

          let sched = await Schedule.findOne({
            where: {
              employee_id: u.employee_id,
              date: item.dateStr
            }
          });

          if (sched) {
            await sched.update({
              name: u.name,
              dept: u.dept || "General",
              designation: u.designation || "Staff",
              shift_name: shiftForDay,
              start_time: sTime,
              end_time: eTime,
              is_rotational_off: item.isRotationalOff,
              created_by: creator?.name || creatorId,
              notes: dayNotes
            });
          } else {
            await Schedule.create({
              employee_id: u.employee_id,
              name: u.name,
              dept: u.dept || "General",
              designation: u.designation || "Staff",
              shift_name: shiftForDay,
              start_time: sTime,
              end_time: eTime,
              date: item.dateStr,
              status: "Published",
              is_rotational_off: item.isRotationalOff,
              created_by: creator?.name || creatorId,
              notes: dayNotes
            });
          }
          totalUpdated++;
        }
      }

      return res.json({
        success: true,
        message: `Successfully assigned rotational week-off (${rotational_off_day}) for ${targetUsers.length} employee(s) across ${datesToProcess.length} days`,
        employees_updated: targetUsers.length,
        schedules_count: totalUpdated
      });
    } catch (err) {
      console.error("Assign rotational schedule error:", err.message);
      return res.status(500).json({ error: "Failed to assign rotational schedule" });
    }
  },

  // POST /api/auth/schedule/bulk-upload
  async bulkUploadSchedule(req, res) {
    try {
      const { role, employee_id: creatorId } = req.user;
      const { schedules } = req.body; // Array of schedule items

      if (!Array.isArray(schedules) || schedules.length === 0) {
        return res.status(400).json({ error: "No schedule records provided for bulk upload" });
      }

      const creator = await User.findOne({ where: { employee_id: creatorId } });
      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isHodOrManager = role === "hod" || role === "manager";

      if (!isHrOrAdmin && !isHodOrManager) {
        return res.status(403).json({ error: "Only HOD, HR, or Admin can upload schedules" });
      }

      const createdList = [];

      for (const item of schedules) {
        if (!item.employee_id || !item.date || !item.shift_name) continue;

        let schedule = await Schedule.findOne({
          where: {
            employee_id: item.employee_id,
            date: item.date
          }
        });

        if (schedule) {
          await schedule.update({
            name: item.name || schedule.name,
            dept: item.dept || schedule.dept,
            designation: item.designation || schedule.designation,
            shift_name: item.shift_name,
            start_time: item.start_time || "10:00",
            end_time: item.end_time || "19:00",
            created_by: creator ? creator.name : creatorId
          });
        } else {
          schedule = await Schedule.create({
            employee_id: item.employee_id,
            name: item.name || "Employee",
            dept: item.dept || "General",
            designation: item.designation || "Staff",
            shift_name: item.shift_name,
            start_time: item.start_time || "10:00",
            end_time: item.end_time || "19:00",
            date: item.date,
            status: "Published",
            created_by: creator ? creator.name : creatorId
          });
        }
        createdList.push(schedule);
      }

      return res.json({
        success: true,
        message: `Successfully uploaded ${createdList.length} shift schedules`,
        schedules: createdList
      });
    } catch (err) {
      console.error("Bulk upload schedule error:", err.message);
      return res.status(500).json({ error: "Failed to process bulk schedule upload" });
    }
  },

  // DELETE /api/auth/schedule/:id
  async deleteSchedule(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isHodOrManager = role === "hod" || role === "manager";

      if (!isHrOrAdmin && !isHodOrManager) {
        return res.status(403).json({ error: "Only HOD, HR, or Admin can delete schedule records" });
      }

      const schedule = await Schedule.findByPk(id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule record not found" });
      }

      await schedule.destroy();
      return res.json({ success: true, message: "Shift schedule deleted successfully" });
    } catch (err) {
      console.error("Delete schedule error:", err.message);
      return res.status(500).json({ error: "Failed to delete schedule" });
    }
  }
};

module.exports = ScheduleController;
