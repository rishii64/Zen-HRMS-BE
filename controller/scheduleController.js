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

      const schedules = await Schedule.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "role", "dept", "designation"]
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
          start_time: start_time || "10:00",
          end_time: end_time || "19:00",
          week_start: week_start || null,
          created_by: creator.name || creatorId,
          notes: notes || null
        });
      } else {
        schedule = await Schedule.create({
          employee_id,
          name: resolvedName,
          dept: resolvedDept,
          designation: resolvedDesignation,
          shift_name,
          start_time: start_time || "10:00",
          end_time: end_time || "19:00",
          date,
          week_start: week_start || null,
          status: "Published",
          created_by: creator.name || creatorId,
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
