const { Leave, User, Employee } = require("../config/db");
const { Op } = require("sequelize");

const LeaveController = {
  // GET /api/auth/leave
  async getLeaves(req, res) {
    try {
      const { dept, status, leave_type, range } = req.query;
      const { role, employee_id } = req.user;

      const user = await User.findOne({ where: { employee_id } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let userDept = user.dept;
      if (!userDept || userDept === "Other" || userDept === "General") {
        const emp = await Employee.findOne({ where: { employee_id } });
        if (emp && (emp.dept || emp.department)) {
          userDept = emp.dept || emp.department;
        }
      }

      let whereClause = {};

      // RBAC Scoping: HR & Accounts view ALL leave requests; HOD & Leads view department leave requests
      const isHrAdminOrAccounts = role === "hr" || role === "admin" || role === "hrmanager" || role === "accounts" || role === "payroll";
      const isHodOrLead = role === "hod" || role === "manager" || role === "teamlead";

      if (isHrAdminOrAccounts) {
        // HR & Accounts see all leave requests across the organization
        if (dept && dept !== "All") {
          whereClause.dept = { [Op.iLike]: dept.trim() };
        }
      } else if (isHodOrLead) {
        // HOD / Department Head sees leave requests for their department OR their own leaves
        const targetDept = (dept && dept !== "All") ? dept : (userDept && userDept !== "Other" && userDept !== "General" ? userDept : null);
        if (targetDept) {
          whereClause[Op.or] = [
            { dept: { [Op.iLike]: targetDept.trim() } },
            { employee_id: employee_id }
          ];
        } else {
          whereClause.employee_id = employee_id;
        }
      } else {
        // Employee views their own leave requests
        whereClause.employee_id = employee_id;
      }

      if (status && status !== "All") {
        whereClause.status = status;
      }

      if (leave_type && leave_type !== "All") {
        whereClause.leave_type = leave_type;
      }

      const leaves = await Leave.findAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
      });

      return res.json({ success: true, data: leaves });
    } catch (err) {
      console.error("Get leaves error:", err.message);
      return res.status(500).json({ error: "Failed to fetch leave records" });
    }
  },

  // GET /api/auth/leave/balance
  async getLeaveBalance(req, res) {
    try {
      const { employee_id } = req.user;
      const todayStr = new Date().toISOString().split("T")[0];

      const allLeaves = await Leave.findAll({
        where: { employee_id }
      });

      let usedCasual = 0;
      let usedSick = 0;
      let usedEarned = 0;
      let usedHolidays = 0;
      let usedMaternity = 0;
      let usedPaternity = 0;
      let usedCompOff = 0;
      let usedUnpaid = 0;

      let totalTaken = 0;
      let upcomingCount = 0;

      allLeaves.forEach((l) => {
        const days = l.total_days || 1;
        const lt = (l.leave_type || "").toLowerCase();
        const isApproved = l.status === "Approved";

        if (l.start_date >= todayStr || l.status === "Pending" || l.status === "Processing") {
          upcomingCount += 1;
        }

        if (isApproved) {
          if (lt.includes("casual") || lt.includes("cl")) {
            usedCasual += days;
            totalTaken += days;
          } else if (lt.includes("sick") || lt.includes("sl")) {
            usedSick += days;
            totalTaken += days;
          } else if (lt.includes("earned") || lt.includes("el")) {
            usedEarned += days;
            totalTaken += days;
          } else if (lt.includes("holiday") || lt.includes("hl")) {
            usedHolidays += days;
            totalTaken += days;
          } else if (lt.includes("maternity") || lt.includes("ml")) {
            usedMaternity += days;
            totalTaken += days;
          } else if (lt.includes("paternity") || lt.includes("pl")) {
            usedPaternity += days;
            totalTaken += days;
          } else if (lt.includes("comp") || lt.includes("co")) {
            usedCompOff += days;
            totalTaken += days;
          } else if (lt.includes("unpaid") || lt.includes("lwp") || lt.includes("without pay")) {
            usedUnpaid += days;
          }
        }
      });

      const user = await User.findOne({ where: { employee_id } });
      const emp = await Employee.findOne({ where: { employee_id } });
      const gender = (emp && emp.gender) ? emp.gender : (user && user.gender ? user.gender : "Male");
      const isFemale = (gender || "").toLowerCase().startsWith("f");

      const parentalRemaining = isFemale ? Math.max(0, 90 - usedMaternity) : Math.max(0, 5 - usedPaternity);
      const leavesRemaining = Math.max(0, (5 - usedCasual) + (5 - usedSick) + (12 - usedEarned) + (10 - usedHolidays) + parentalRemaining);

      const balances = {
        gender,
        casual: { code: "CL", name: "Casual Leave", total: 5, used: usedCasual, remaining: Math.max(0, 5 - usedCasual), paid: true },
        sick: { code: "SL", name: "Sick Leave", total: 5, used: usedSick, remaining: Math.max(0, 5 - usedSick), paid: true },
        earned: { code: "EL", name: "Earned Leave", total: 12, used: usedEarned, remaining: Math.max(0, 12 - usedEarned), paid: true },
        holidays: { code: "HL", name: "Holidays", total: 10, used: usedHolidays, remaining: Math.max(0, 10 - usedHolidays), paid: true },
        maternity: { code: "ML", name: "Maternity Leave", total: 90, used: usedMaternity, remaining: Math.max(0, 90 - usedMaternity), paid: true },
        paternity: { code: "PL", name: "Paternity Leave", total: 5, used: usedPaternity, remaining: Math.max(0, 5 - usedPaternity), paid: true },
        compOff: { code: "Comp Off", name: "Compensatory Off", total: usedCompOff, used: usedCompOff, remaining: 0, paid: true },
        unpaid: { code: "LWP", name: "Unpaid Leave", total: "Unlimited", used: usedUnpaid, remaining: "Unlimited", paid: false },
        summary: {
          totalTaken,
          leavesRemaining,
          absentDays: usedUnpaid,
          upcomingLeaves: upcomingCount
        }
      };

      return res.json({ success: true, data: balances });
    } catch (err) {
      console.error("Get leave balance error:", err.message);
      return res.status(500).json({ error: "Failed to fetch leave balance" });
    }
  },

  // POST /api/auth/leave/apply
  async applyLeave(req, res) {
    try {
      const { employee_id, role, name } = req.user;
      const {
        leave_type,
        day_type,
        start_date,
        end_date,
        total_days,
        reason,
        emergency_contact
      } = req.body;

      if (!start_date || !end_date || !leave_type) {
        return res.status(400).json({ error: "Leave type, start date, and end date are required" });
      }

      const user = await User.findOne({ where: { employee_id } });
      const emp = await Employee.findOne({ where: { employee_id } });

      let empName = name || (user ? user.name : null);
      if (!empName || empName === "Employee") {
        if (emp) {
          empName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_name;
        }
      }
      if (!empName) empName = "Employee";

      let empDept = user ? user.dept : "General";
      if ((!empDept || empDept === "Other" || empDept === "General") && emp) {
        if (emp.dept || emp.department) {
          empDept = emp.dept || emp.department;
        }
      }

      let doc_url = null;
      if (req.file) {
        doc_url = `/uploads/${req.file.filename}`;
      }

      // Calculate days count
      let computedDays = parseFloat(total_days) || 1.0;
      if (day_type === "First Half" || day_type === "Second Half") {
        computedDays = 0.5;
      }

      const newLeave = await Leave.create({
        employee_id,
        name: empName,
        dept: empDept,
        leave_type: leave_type || "Casual Leave",
        day_type: day_type || "Full Day",
        start_date,
        end_date,
        total_days: computedDays,
        reason: reason || "",
        emergency_contact: emergency_contact || "",
        doc_url,
        status: "Pending",
      });

      return res.status(201).json({
        success: true,
        message: "Leave application submitted successfully!",
        data: newLeave
      });
    } catch (err) {
      console.error("Apply leave error:", err.message);
      return res.status(500).json({ error: "Failed to submit leave application" });
    }
  },

  // PATCH /api/auth/leave/:id/status
  async updateLeaveStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;
      const { name, role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isHodOrLead = role === "hod" || role === "manager" || role === "teamlead";

      if (!isHrOrAdmin && !isHodOrLead) {
        return res.status(403).json({ error: "Only HOD, Team Lead, or HR/Admin can approve/reject leaves" });
      }

      const leave = await Leave.findByPk(id);
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      await leave.update({
        status,
        approver: `${role.toUpperCase()}-${name || "Approver"}`,
        comments: comments || leave.comments,
      });

      return res.json({
        success: true,
        message: `Leave request ${status.toLowerCase()} successfully`,
        data: leave
      });
    } catch (err) {
      console.error("Update leave status error:", err.message);
      return res.status(500).json({ error: "Failed to update leave status" });
    }
  },

  // DELETE /api/auth/leave/:id/cancel
  async cancelLeave(req, res) {
    try {
      const { id } = req.params;
      const { employee_id, role } = req.user;

      const leave = await Leave.findByPk(id);
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin";
      if (leave.employee_id !== employee_id && !isHrOrAdmin) {
        return res.status(403).json({ error: "You can only cancel your own pending leave requests" });
      }

      await leave.update({ status: "Cancelled" });

      return res.json({
        success: true,
        message: "Leave request cancelled successfully",
        data: leave
      });
    } catch (err) {
      console.error("Cancel leave error:", err.message);
      return res.status(500).json({ error: "Failed to cancel leave request" });
    }
  }
};

module.exports = LeaveController;
