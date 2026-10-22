const { Leave, User, Employee } = require("../config/db");
const { Op } = require("sequelize");
const { getISTDateStr } = require("../utils/timezone");

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
      const userDesig = (req.user?.designation || user?.designation || "").toLowerCase().trim();
      const isLeadershipDesig =
        /\b(hod|head|manager|mgr|lead|tl|agm|dgm|gm|director|supervisor)\b/i.test(userDesig) ||
        userDesig.includes("team lead") ||
        userDesig.includes("tech lead") ||
        userDesig.includes("department head") ||
        userDesig.includes("head of");
      const isHodOrLead = role === "hod" || role === "manager" || role === "teamlead" || isLeadershipDesig;

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
      const targetEmpId = (req.query.employee_id && (req.user.role === "hr" || req.user.role === "admin" || req.user.role === "hrmanager"))
        ? req.query.employee_id
        : req.user.employee_id;
      const todayStr = getISTDateStr();

      const allLeaves = await Leave.findAll({
        where: { employee_id: targetEmpId }
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
        const days = parseFloat(l.total_days) || 1;
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

      const user = await User.findOne({ where: { employee_id: targetEmpId } });
      const emp = await Employee.findOne({ where: { employee_id: targetEmpId } });
      const gender = (emp && emp.gender) ? emp.gender : (user && user.gender ? user.gender : "Male");
      const isFemale = (gender || "").toLowerCase().startsWith("f");

      const rawEmpType = (user && user.employment_type) || (emp && emp.employment_type) || "Permanent";
      const isPermanent = String(rawEmpType).trim().toLowerCase() === "permanent";

      // POLICY RULES:
      // 1. All leaves are calculated YEARLY, not monthly.
      // 2. Paid leave entitlements (Sick 5, Earned 12, Holidays 10, Parental 90/5) are granted ONLY AFTER BEING PERMANENT.
      // 3. EXCEPTION: Non-permanent employees (Probation, Intern, Contractual, etc.) CAN also take Casual Leave (CL) (5 days yearly).
      const totalCasual = 5;
      const totalSick = isPermanent ? 5 : 0;
      const totalEarned = isPermanent ? 12 : 0;
      const totalHolidays = isPermanent ? 10 : 0;
      const totalMaternity = isPermanent ? (isFemale ? 90 : 0) : 0;
      const totalPaternity = isPermanent ? (!isFemale ? 5 : 0) : 0;

      const parentalRemaining = isPermanent
        ? (isFemale ? Math.max(0, 90 - usedMaternity) : Math.max(0, 5 - usedPaternity))
        : 0;

      const leavesRemaining = isPermanent
        ? Math.max(0, (totalCasual - usedCasual) + (totalSick - usedSick) + (totalEarned - usedEarned) + (totalHolidays - usedHolidays) + parentalRemaining)
        : Math.max(0, totalCasual - usedCasual);

      const balances = {
        gender,
        employment_type: rawEmpType,
        isPermanent,
        calculation_cycle: "Yearly",
        calculation_basis: "Yearly (not monthly) - Entitlements active only after permanent confirmation",
        casual: {
          code: "CL",
          name: "Casual Leave",
          total: totalCasual,
          used: usedCasual,
          remaining: Math.max(0, totalCasual - usedCasual),
          paid: true,
          isEligible: true,
          note: "5 Days Yearly (All Employees)"
        },
        sick: {
          code: "SL",
          name: "Sick Leave",
          total: totalSick,
          used: usedSick,
          remaining: Math.max(0, totalSick - usedSick),
          paid: isPermanent,
          isEligible: isPermanent,
          note: isPermanent ? "5 Days Yearly (Permanent Staff)" : "Permanent Employees Only"
        },
        earned: {
          code: "EL",
          name: "Earned Leave",
          total: totalEarned,
          used: usedEarned,
          remaining: Math.max(0, totalEarned - usedEarned),
          paid: isPermanent,
          isEligible: isPermanent,
          note: isPermanent ? "12 Days Yearly (Permanent Staff)" : "Permanent Employees Only"
        },
        holidays: {
          code: "HL",
          name: "Holidays",
          total: totalHolidays,
          used: usedHolidays,
          remaining: Math.max(0, totalHolidays - usedHolidays),
          paid: isPermanent,
          isEligible: isPermanent,
          note: isPermanent ? "10 Days Yearly (Permanent Staff)" : "Permanent Employees Only"
        },
        maternity: {
          code: "ML",
          name: "Maternity Leave",
          total: totalMaternity,
          used: usedMaternity,
          remaining: Math.max(0, totalMaternity - usedMaternity),
          paid: isPermanent,
          isEligible: isPermanent,
          note: isPermanent ? "90 Days Yearly (Permanent Staff)" : "Permanent Employees Only"
        },
        paternity: {
          code: "PL",
          name: "Paternity Leave",
          total: totalPaternity,
          used: usedPaternity,
          remaining: Math.max(0, totalPaternity - usedPaternity),
          paid: isPermanent,
          isEligible: isPermanent,
          note: isPermanent ? "5 Days Yearly (Permanent Staff)" : "Permanent Employees Only"
        },
        compOff: { code: "Comp Off", name: "Compensatory Off", total: usedCompOff, used: usedCompOff, remaining: 0, paid: true, isEligible: true },
        unpaid: { code: "LWP", name: "Unpaid Leave", total: "Unlimited", used: usedUnpaid, remaining: "Unlimited", paid: false, isEligible: true },
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

      // Check permanent status vs leave type
      const rawEmpType = (user && user.employment_type) || (emp && emp.employment_type) || "Permanent";
      const isPermanent = String(rawEmpType).trim().toLowerCase() === "permanent";
      const lt = (leave_type || "").toLowerCase();
      const isCasual = lt.includes("casual") || lt.includes("cl");
      const isComp = lt.includes("comp") || lt.includes("co");
      const isUnpaid = lt.includes("unpaid") || lt.includes("lwp") || lt.includes("without pay");

      if (!isPermanent && !isCasual && !isComp && !isUnpaid) {
        return res.status(400).json({
          error: `Non-permanent employees (${rawEmpType}) are only eligible for Casual Leave (CL). Other leave categories (Sick, Earned, Holidays, Parental) are calculated yearly and active only after permanent confirmation.`
        });
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
      const userDesig = (req.user?.designation || "").toLowerCase().trim();
      const isLeadershipDesig =
        /\b(hod|head|manager|mgr|lead|tl|agm|dgm|gm|director|supervisor)\b/i.test(userDesig) ||
        userDesig.includes("team lead") ||
        userDesig.includes("tech lead") ||
        userDesig.includes("department head") ||
        userDesig.includes("head of");
      const isHodOrLead = role === "hod" || role === "manager" || role === "teamlead" || isLeadershipDesig;

      if (!isHrOrAdmin && !isHodOrLead) {
        return res.status(403).json({ error: "Only HOD, Team Lead, or HR/Admin can approve/reject leaves" });
      }

      const leave = await Leave.findByPk(id);
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }

      const approverBadge = isLeadershipDesig ? (req.user?.designation || "LEAD").toUpperCase() : role.toUpperCase();
      await leave.update({
        status,
        approver: `${approverBadge}-${name || "Approver"}`,
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
