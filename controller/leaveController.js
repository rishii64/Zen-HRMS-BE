const {
  Leave,
  User,
  Employee,
  LeaveAllocation,
  LeaveCarryForwardLog,
  LeavePolicy,
  sequelize
} = require("../config/db");
const { Op } = require("sequelize");
const { getISTDateStr } = require("../utils/timezone");

// Standard Leave Code Helper
const resolveLeaveCode = (typeOrCode) => {
  if (!typeOrCode) return "CL";
  const str = String(typeOrCode).trim().toLowerCase();
  if (str === "el" || str.includes("earned")) return "EL";
  if (str === "pl" || str.includes("privilege") || str.includes("priviledge")) return "PL";
  if (str === "cl" || str.includes("casual")) return "CL";
  if (str === "sl" || str.includes("sick")) return "SL";
  if (str === "ml" || str.includes("maternity")) return "ML";
  if (str === "pat" || str === "ptl" || str.includes("paternity")) return "PAT";
  if (str === "co" || str.includes("comp")) return "CO";
  if (str === "hl" || str.includes("holiday")) return "HL";
  if (str === "lwp" || str.includes("unpaid") || str.includes("without pay")) return "LWP";
  return "CL";
};

const resolveLeaveName = (code) => {
  switch (code) {
    case "EL": return "Earned Leave";
    case "PL": return "Privilege Leave";
    case "CL": return "Casual Leave";
    case "SL": return "Sick Leave";
    case "ML": return "Maternity Leave";
    case "PAT": return "Paternity Leave";
    case "CO": return "Comp Off";
    case "HL": return "Holidays";
    case "LWP": return "Unpaid Leave";
    default: return "Casual Leave";
  }
};

const LeaveController = {
  // ==========================================
  // 1. LEAVE RECORDS & REQUESTS (CRUD)
  // ==========================================

  // GET /api/auth/leave
  async getLeaves(req, res) {
    try {
      const { dept, status, leave_type, range, year } = req.query;
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
        if (dept && dept !== "All") {
          whereClause.dept = { [Op.iLike]: dept.trim() };
        }
      } else if (isHodOrLead) {
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
        whereClause.employee_id = employee_id;
      }

      if (status && status !== "All") {
        whereClause.status = status;
      }

      if (leave_type && leave_type !== "All") {
        whereClause.leave_type = leave_type;
      }

      if (year && parseInt(year, 10)) {
        const y = parseInt(year, 10);
        whereClause.start_date = {
          [Op.between]: [`${y}-01-01`, `${y}-12-31`]
        };
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
      const targetYear = parseInt(req.query.year, 10) || new Date().getFullYear();

      // Fetch user profile info
      const user = await User.findOne({ where: { employee_id: targetEmpId } });
      const emp = await Employee.findOne({ where: { employee_id: targetEmpId } });
      const gender = (emp && emp.gender) ? emp.gender : (user && user.gender ? user.gender : "Male");
      const isFemale = (gender || "").toLowerCase().startsWith("f");
      const rawEmpType = (user && user.employment_type) || (emp && emp.employment_type) || "Permanent";
      const isPermanent = String(rawEmpType).trim().toLowerCase() === "permanent";

      // 1. Check if employee has dedicated LeaveAllocation records for this year
      let allocations = await LeaveAllocation.findAll({
        where: {
          employee_id: targetEmpId,
          year: targetYear
        }
      });

      // 2. If no allocations exist for this year, create default allocations from LeavePolicy
      if (!allocations || allocations.length === 0) {
        const policies = await LeavePolicy.findAll({ where: { is_active: true } });
        const defaultList = policies.length > 0 ? policies : [
          { leave_code: "CL", leave_name: "Casual Leave", default_annual_quota: 5, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0 },
          { leave_code: "SL", leave_name: "Sick Leave", default_annual_quota: 5, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0 },
          { leave_code: "EL", leave_name: "Earned Leave", default_annual_quota: 12, can_carry_forward: true, carry_forward_max_years: 3, max_stack_limit: 45 },
          { leave_code: "PL", leave_name: "Privilege Leave", default_annual_quota: 15, can_carry_forward: true, carry_forward_max_years: 3, max_stack_limit: 45 },
          { leave_code: "ML", leave_name: "Maternity Leave", default_annual_quota: 90, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0 },
          { leave_code: "PAT", leave_name: "Paternity Leave", default_annual_quota: 5, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0 },
          { leave_code: "CO", leave_name: "Comp Off", default_annual_quota: 0, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0 }
        ];

        const initialRows = defaultList.map(p => {
          const isEligible = p.employment_type_eligibility === "Permanent" ? isPermanent : true;
          const quota = isEligible ? parseFloat(p.default_annual_quota || 0) : (p.leave_code === "CL" ? 5 : 0);
          return {
            employee_id: targetEmpId,
            employee_name: user?.name || emp?.name || "Employee",
            dept: user?.dept || emp?.dept || "General",
            year: targetYear,
            leave_type: p.leave_name,
            leave_code: p.leave_code,
            allocated_days: quota,
            carried_forward: 0,
            used_days: 0,
            lapsed_days: 0,
            balance: quota,
            can_carry_forward: !!p.can_carry_forward,
            max_stack_limit: p.max_stack_limit || 45,
            carry_forward_max_years: p.carry_forward_max_years || 3,
            allocated_by: "System Initial",
          };
        });

        try {
          allocations = await LeaveAllocation.bulkCreate(initialRows, { ignoreDuplicates: true });
        } catch (initErr) {
          console.warn("Auto-seed initial allocation error:", initErr.message);
        }
      }

      // 3. Count used leaves from the Leave table for this year
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear}-12-31`;
      const allLeaves = await Leave.findAll({
        where: {
          employee_id: targetEmpId,
          start_date: { [Op.between]: [yearStart, yearEnd] }
        }
      });

      const usedMap = {
        CL: 0, SL: 0, EL: 0, PL: 0, ML: 0, PAT: 0, CO: 0, HL: 0, LWP: 0
      };
      let totalTaken = 0;
      let upcomingCount = 0;

      allLeaves.forEach((l) => {
        const days = parseFloat(l.total_days) || 1;
        const code = resolveLeaveCode(l.leave_type);
        const isApproved = l.status === "Approved";

        if (l.start_date >= todayStr || l.status === "Pending" || l.status === "Processing") {
          upcomingCount += 1;
        }

        if (isApproved) {
          usedMap[code] = (usedMap[code] || 0) + days;
          if (code !== "LWP") {
            totalTaken += days;
          }
        }
      });

      // Build structured dictionary from allocations
      const allocDict = {};
      (allocations || []).forEach(a => {
        allocDict[a.leave_code] = a;
      });

      const getCat = (code, fallbackName, defaultQuota, canCF = false) => {
        const rec = allocDict[code];
        const allocated = rec ? parseFloat(rec.allocated_days) : defaultQuota;
        const carried = (canCF && rec) ? parseFloat(rec.carried_forward) : 0;
        const used = usedMap[code] !== undefined ? usedMap[code] : (rec ? parseFloat(rec.used_days) : 0);
        const lapsed = rec ? parseFloat(rec.lapsed_days) : 0;
        const total = allocated + carried;
        const remaining = Math.max(0, total - used);

        return {
          code,
          name: rec ? rec.leave_type : fallbackName,
          allocated,
          carried_forward: carried,
          total,
          used,
          remaining,
          lapsed_days: lapsed,
          can_carry_forward: canCF,
          max_stack_limit: canCF ? (rec?.max_stack_limit || 45) : 0,
          carry_forward_max_years: canCF ? (rec?.carry_forward_max_years || 3) : 0,
          paid: code !== "LWP",
          isEligible: (code === "CL" || code === "CO" || code === "LWP") ? true : isPermanent,
          note: canCF
            ? `Carry-forward up to 3 years (stacking up to 45 leaves, excess lapsed)`
            : (code === "CL" ? "Annual Quota (non-carry-forwardable)" : (isPermanent ? "Annual Quota" : "Permanent Staff Only"))
        };
      };

      const casual = getCat("CL", "Casual Leave", 5, false);
      const sick = getCat("SL", "Sick Leave", isPermanent ? 5 : 0, false);
      const earned = getCat("EL", "Earned Leave", isPermanent ? 12 : 0, true);
      const privilege = getCat("PL", "Privilege Leave", isPermanent ? 15 : 0, true);
      const maternity = getCat("ML", "Maternity Leave", (isPermanent && isFemale) ? 90 : 0, false);
      const paternity = getCat("PAT", "Paternity Leave", (isPermanent && !isFemale) ? 5 : 0, false);
      const compOff = getCat("CO", "Compensatory Off", 0, false);
      const holidays = getCat("HL", "Holidays", isPermanent ? 10 : 0, false);
      const unpaid = {
        code: "LWP",
        name: "Unpaid Leave",
        allocated: 0,
        carried_forward: 0,
        total: "Unlimited",
        used: usedMap["LWP"] || 0,
        remaining: "Unlimited",
        paid: false,
        isEligible: true,
        can_carry_forward: false
      };

      const leavesRemaining =
        casual.remaining +
        sick.remaining +
        earned.remaining +
        privilege.remaining +
        holidays.remaining +
        (isFemale ? maternity.remaining : paternity.remaining);

      const balances = {
        employee_id: targetEmpId,
        year: targetYear,
        gender,
        employment_type: rawEmpType,
        isPermanent,
        calculation_cycle: `Annual Calendar Year (${targetYear})`,
        carry_forward_rule: "Only Earned Leaves (EL) & Privilege Leaves (PL) carry forward up to 3 years (max stack 45 leaves). Beyond 45 leaves or 3 years will be lapsed.",
        casual,
        sick,
        earned,
        privilege,
        holidays,
        maternity,
        paternity,
        compOff,
        unpaid,
        summary: {
          totalTaken,
          leavesRemaining,
          absentDays: usedMap["LWP"] || 0,
          upcomingLeaves: upcomingCount,
          totalEarnedPrivilegeStacked: (earned.carried_forward || 0) + (privilege.carried_forward || 0),
          totalEarnedPrivilegeAvailable: earned.remaining + privilege.remaining,
          totalLapsedDays: (earned.lapsed_days || 0) + (privilege.lapsed_days || 0)
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

      // Check permanent status vs leave category
      const rawEmpType = (user && user.employment_type) || (emp && emp.employment_type) || "Permanent";
      const isPermanent = String(rawEmpType).trim().toLowerCase() === "permanent";
      const leaveCode = resolveLeaveCode(leave_type);

      if (!isPermanent && leaveCode !== "CL" && leaveCode !== "CO" && leaveCode !== "LWP") {
        return res.status(400).json({
          error: `Non-permanent employees (${rawEmpType}) are only eligible for Casual Leave (CL). Other categories (Earned, Privilege, Sick) require permanent status.`
        });
      }

      // Check available balance in LeaveAllocation if not unpaid
      const leaveYear = new Date(start_date).getFullYear();
      if (leaveCode !== "LWP") {
        const alloc = await LeaveAllocation.findOne({
          where: {
            employee_id,
            year: leaveYear,
            leave_code: leaveCode
          }
        });

        if (alloc) {
          const available = parseFloat(alloc.balance || 0);
          if (available < computedDays) {
            return res.status(400).json({
              error: `Insufficient leave balance for ${leave_type} (${leaveCode}). Available: ${available} day(s), Requested: ${computedDays} day(s).`
            });
          }
        }
      }

      const newLeave = await Leave.create({
        employee_id,
        name: empName,
        dept: empDept,
        leave_type: resolveLeaveName(leaveCode),
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

      const prevStatus = leave.status;
      const approverBadge = isLeadershipDesig ? (req.user?.designation || "LEAD").toUpperCase() : role.toUpperCase();

      await leave.update({
        status,
        approver: `${approverBadge}-${name || "Approver"}`,
        comments: comments || leave.comments,
      });

      // Synchronize used_days and balance in LeaveAllocation
      try {
        const leaveYear = new Date(leave.start_date).getFullYear();
        const leaveCode = resolveLeaveCode(leave.leave_type);
        const days = parseFloat(leave.total_days) || 1;

        if (leaveCode !== "LWP") {
          const alloc = await LeaveAllocation.findOne({
            where: {
              employee_id: leave.employee_id,
              year: leaveYear,
              leave_code: leaveCode
            }
          });

          if (alloc) {
            let updatedUsed = parseFloat(alloc.used_days) || 0;

            if (status === "Approved" && prevStatus !== "Approved") {
              updatedUsed += days;
            } else if (prevStatus === "Approved" && (status === "Rejected" || status === "Cancelled")) {
              updatedUsed = Math.max(0, updatedUsed - days);
            }

            const totalEntitled = (parseFloat(alloc.allocated_days) || 0) + (parseFloat(alloc.carried_forward) || 0);
            const newBal = Math.max(0, totalEntitled - updatedUsed);

            await alloc.update({
              used_days: updatedUsed,
              balance: newBal
            });
          }
        }
      } catch (syncErr) {
        console.warn("Leave balance sync warning on status update:", syncErr.message);
      }

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

      const prevStatus = leave.status;
      await leave.update({ status: "Cancelled" });

      if (prevStatus === "Approved") {
        try {
          const leaveYear = new Date(leave.start_date).getFullYear();
          const leaveCode = resolveLeaveCode(leave.leave_type);
          const days = parseFloat(leave.total_days) || 1;

          if (leaveCode !== "LWP") {
            const alloc = await LeaveAllocation.findOne({
              where: {
                employee_id: leave.employee_id,
                year: leaveYear,
                leave_code: leaveCode
              }
            });

            if (alloc) {
              const updatedUsed = Math.max(0, (parseFloat(alloc.used_days) || 0) - days);
              const totalEntitled = (parseFloat(alloc.allocated_days) || 0) + (parseFloat(alloc.carried_forward) || 0);
              await alloc.update({
                used_days: updatedUsed,
                balance: Math.max(0, totalEntitled - updatedUsed)
              });
            }
          }
        } catch (syncErr) {
          console.warn("Failed to revert balance on cancellation:", syncErr.message);
        }
      }

      return res.json({
        success: true,
        message: "Leave request cancelled successfully",
        data: leave
      });
    } catch (err) {
      console.error("Cancel leave error:", err.message);
      return res.status(500).json({ error: "Failed to cancel leave request" });
    }
  },

  // ==========================================
  // 2. DYNAMIC LEAVE ALLOCATION & CARRY-FORWARD ENGINE
  // ==========================================

  // GET /api/auth/leave/allocations
  // HR / Admin views allocations across employees for a selected year
  async getAllocations(req, res) {
    try {
      const year = parseInt(req.query.year, 10) || new Date().getFullYear();
      const { dept, search, employee_id } = req.query;

      let userWhere = {};
      if (employee_id) {
        userWhere.employee_id = employee_id;
      }
      if (dept && dept !== "All") {
        userWhere.dept = { [Op.iLike]: dept.trim() };
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        userWhere[Op.or] = [
          { name: { [Op.iLike]: q } },
          { employee_id: { [Op.iLike]: q } },
          { email: { [Op.iLike]: q } }
        ];
      }

      const users = await User.findAll({
        where: userWhere,
        attributes: ["id", "employee_id", "name", "email", "dept", "designation", "employment_type", "gender"],
        order: [["employee_id", "ASC"]]
      });

      const empIds = users.map(u => u.employee_id);

      const existingAllocations = await LeaveAllocation.findAll({
        where: {
          employee_id: { [Op.in]: empIds },
          year
        }
      });

      // Group allocations by employee_id
      const allocMap = {};
      existingAllocations.forEach(a => {
        if (!allocMap[a.employee_id]) allocMap[a.employee_id] = {};
        allocMap[a.employee_id][a.leave_code] = a;
      });

      // Format response for each user
      const result = users.map(u => {
        const empAlloc = allocMap[u.employee_id] || {};
        const isPerm = (u.employment_type || "").toLowerCase() === "permanent";
        const empGender = (u.gender || "").trim().toLowerCase();
        const isFemale = empGender.startsWith("f") || empGender === "female";
        const isMale = empGender.startsWith("m") || empGender === "male";

        // Standard categories
        const categories = ["CL", "SL", "EL", "PL", "ML", "PAT", "CO"].map(code => {
          const rec = empAlloc[code];
          const isCF = code === "EL" || code === "PL";

          let defaultQuota = 0;
          if (code === "CL") {
            defaultQuota = 5;
          } else if (isPerm) {
            if (code === "SL") defaultQuota = 5;
            else if (code === "EL") defaultQuota = 12;
            else if (code === "PL") defaultQuota = 15;
            else if (code === "ML" && isFemale) defaultQuota = 90;
            else if (code === "PAT" && isMale) defaultQuota = 5;
          }

          let allocatedDays = rec ? parseFloat(rec.allocated_days) : defaultQuota;
          let balanceDays = rec ? parseFloat(rec.balance) : defaultQuota;

          // Statutory gender guard:
          // If non-female employee has ML allocated from earlier unconstrained bulk runs, enforce 0 unless explicitly marked as special exception
          if (code === "ML" && !isFemale) {
            if (!rec?.notes || !rec.notes.includes("Custom Male ML Exception")) {
              allocatedDays = 0;
              balanceDays = 0;
            }
          }

          // If non-male employee has PAT allocated, enforce 0
          if (code === "PAT" && !isMale) {
            if (!rec?.notes || !rec.notes.includes("Custom Female PAT Exception")) {
              allocatedDays = 0;
              balanceDays = 0;
            }
          }

          return {
            leave_code: code,
            leave_type: resolveLeaveName(code),
            allocated_days: allocatedDays,
            carried_forward: rec ? parseFloat(rec.carried_forward) : 0,
            used_days: rec ? parseFloat(rec.used_days) : 0,
            lapsed_days: rec ? parseFloat(rec.lapsed_days) : 0,
            balance: balanceDays,
            can_carry_forward: isCF,
            max_stack_limit: isCF ? 45 : 0,
            carry_forward_max_years: isCF ? 3 : 0,
            notes: rec?.notes || ""
          };
        });

        const totalAllocated = categories.reduce((sum, c) => sum + c.allocated_days, 0);
        const totalCarried = categories.reduce((sum, c) => sum + c.carried_forward, 0);
        const totalUsed = categories.reduce((sum, c) => sum + c.used_days, 0);
        const totalLapsed = categories.reduce((sum, c) => sum + c.lapsed_days, 0);
        const totalBalance = categories.reduce((sum, c) => sum + c.balance, 0);

        return {
          employee_id: u.employee_id,
          name: u.name,
          email: u.email,
          dept: u.dept || "General",
          designation: u.designation || "Staff",
          employment_type: u.employment_type || "Permanent",
          gender: u.gender || "Male",
          year,
          categories,
          summary: {
            total_allocated: totalAllocated,
            total_carried_forward: totalCarried,
            total_used: totalUsed,
            total_lapsed: totalLapsed,
            total_balance: totalBalance,
            stacked_carry_forward: (empAlloc["EL"]?.carried_forward || 0) + (empAlloc["PL"]?.carried_forward || 0)
          }
        };
      });

      return res.json({
        success: true,
        year,
        count: result.length,
        data: result
      });
    } catch (err) {
      console.error("Get allocations error:", err.message);
      return res.status(500).json({ error: "Failed to fetch leave allocations" });
    }
  },

  // POST /api/auth/leave/allocate/individual
  // HR sets or adjusts leave quotas for an individual employee
  async allocateIndividual(req, res) {
    try {
      const { employee_id, year, allocations, notes } = req.body;
      const hrName = req.user?.name || "HR Admin";

      if (!employee_id) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      const targetYear = parseInt(year, 10) || new Date().getFullYear();
      const user = await User.findOne({ where: { employee_id } });
      const emp = await Employee.findOne({ where: { employee_id } });

      if (!user && !emp) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const empName = user?.name || emp?.name || "Employee";
      const empDept = user?.dept || emp?.dept || "General";

      if (!Array.isArray(allocations) || allocations.length === 0) {
        return res.status(400).json({ error: "Allocations array is required" });
      }

      // Validate carry forward constraints: Only EL & PL can carry forward, capped at 45 leaves
      for (const item of allocations) {
        const code = resolveLeaveCode(item.leave_code);
        const carried = parseFloat(item.carried_forward || 0);

        if (code !== "EL" && code !== "PL" && carried > 0) {
          return res.status(400).json({
            error: `Only Earned Leaves (EL) & Privilege Leaves (PL) can be carry-forwarded. ${code} cannot carry forward leaves.`
          });
        }

        if ((code === "EL" || code === "PL") && carried > 45) {
          return res.status(400).json({
            error: `Carry-forward limit exceeded for ${code}. Leaves can only be stacked up to a maximum of 45 leaves (3 years limit). Excess must be lapsed.`
          });
        }
      }

      const updatedRecords = [];

      for (const item of allocations) {
        const code = resolveLeaveCode(item.leave_code);
        const isCF = code === "EL" || code === "PL";
        const allocatedDays = Math.max(0, parseFloat(item.allocated_days || 0));
        const carriedForward = isCF ? Math.min(45, Math.max(0, parseFloat(item.carried_forward || 0))) : 0;
        const lapsedDays = Math.max(0, parseFloat(item.lapsed_days || 0));

        // Find existing to preserve used_days count
        const existing = await LeaveAllocation.findOne({
          where: {
            employee_id,
            year: targetYear,
            leave_code: code
          }
        });

        const usedDays = existing ? parseFloat(existing.used_days || 0) : 0;
        const balance = Math.max(0, (allocatedDays + carriedForward) - usedDays);

        const [record] = await LeaveAllocation.upsert({
          employee_id,
          employee_name: empName,
          dept: empDept,
          year: targetYear,
          leave_type: resolveLeaveName(code),
          leave_code: code,
          allocated_days: allocatedDays,
          carried_forward: carriedForward,
          used_days: usedDays,
          lapsed_days: lapsedDays,
          balance,
          can_carry_forward: isCF,
          max_stack_limit: isCF ? 45 : 0,
          carry_forward_max_years: isCF ? 3 : 0,
          notes: item.notes || notes || null,
          allocated_by: hrName,
        });

        updatedRecords.push(record);
      }

      return res.json({
        success: true,
        message: `Leave allocation updated successfully for ${empName} (${employee_id}) for year ${targetYear}`,
        data: updatedRecords
      });
    } catch (err) {
      console.error("Allocate individual error:", err.message);
      return res.status(500).json({ error: "Failed to update individual leave allocation: " + err.message });
    }
  },

  // POST /api/auth/leave/allocate/bulk
  // HR bulk-allocates leaves to a group of employees (by department, employment type, or selected IDs)
  async allocateBulk(req, res) {
    try {
      const {
        target_type, // "ALL" | "DEPARTMENT" | "EMPLOYMENT_TYPE" | "SPECIFIC_EMPLOYEES"
        target_value, // department name, employment type, or array of employee_ids
        year,
        quotas, // [{ leave_code: "EL", allocated_days: 12 }, { leave_code: "PL", allocated_days: 15 }, ...]
        preserve_carried_forward = true,
        notes
      } = req.body;

      const hrName = req.user?.name || "HR Admin";
      const targetYear = parseInt(year, 10) || new Date().getFullYear();

      if (!quotas || !Array.isArray(quotas) || quotas.length === 0) {
        return res.status(400).json({ error: "Quotas array with leave codes and allocated days is required" });
      }

      // Determine matching employees
      let whereClause = { status: "Active" };
      if (target_type === "DEPARTMENT" && target_value) {
        whereClause.dept = { [Op.iLike]: String(target_value).trim() };
      } else if (target_type === "EMPLOYMENT_TYPE" && target_value) {
        whereClause.employment_type = { [Op.iLike]: String(target_value).trim() };
      } else if (target_type === "SPECIFIC_EMPLOYEES" && Array.isArray(target_value) && target_value.length > 0) {
        whereClause.employee_id = { [Op.in]: target_value };
      }

      const users = await User.findAll({
        where: whereClause,
        attributes: ["employee_id", "name", "dept", "employment_type", "gender"]
      });

      if (users.length === 0) {
        return res.status(404).json({ error: "No matching active employees found for the selected criteria" });
      }

      let updatedCount = 0;

      for (const u of users) {
        // Resolve employee gender accurately (User table first, fallback to Employee table)
        let empGender = (u.gender || "").trim().toLowerCase();
        if (!empGender) {
          const empRec = await Employee.findOne({
            where: { employee_id: u.employee_id },
            attributes: ["gender"]
          });
          if (empRec && empRec.gender) {
            empGender = empRec.gender.trim().toLowerCase();
          }
        }
        const isFemale = empGender.startsWith("f") || empGender === "female";
        const isMale = empGender.startsWith("m") || empGender === "male";

        for (const q of quotas) {
          const code = resolveLeaveCode(q.leave_code);
          const isCF = code === "EL" || code === "PL";
          const allocatedDays = Math.max(0, parseFloat(q.allocated_days || 0));

          // Gender rule 1: Maternity Leave (ML)
          if (code === "ML") {
            const targetGender = (q.target_gender || "FEMALE_ONLY").toUpperCase();
            if (targetGender === "FEMALE_ONLY" && !isFemale) {
              // Automatically reset any erroneous ML allocation for male staff from prior runs
              const existingML = await LeaveAllocation.findOne({
                where: {
                  employee_id: u.employee_id,
                  year: targetYear,
                  leave_code: "ML"
                }
              });
              if (existingML && parseFloat(existingML.allocated_days || 0) > 0) {
                await existingML.update({
                  allocated_days: 0,
                  balance: 0,
                  notes: "Reset: Maternity Leave is statutory for female employees only."
                });
              }
              continue; // Do not allocate Maternity Leave to male staff
            }
          }

          // Gender rule 2: Paternity Leave (PAT)
          if (code === "PAT") {
            const targetGender = (q.target_gender || "MALE_ONLY").toUpperCase();
            if (targetGender === "MALE_ONLY" && !isMale) {
              const existingPAT = await LeaveAllocation.findOne({
                where: {
                  employee_id: u.employee_id,
                  year: targetYear,
                  leave_code: "PAT"
                }
              });
              if (existingPAT && parseFloat(existingPAT.allocated_days || 0) > 0) {
                await existingPAT.update({
                  allocated_days: 0,
                  balance: 0,
                  notes: "Reset: Paternity Leave is statutory for male employees only."
                });
              }
              continue; // Do not allocate Paternity Leave to female staff
            }
          }

          const existing = await LeaveAllocation.findOne({
            where: {
              employee_id: u.employee_id,
              year: targetYear,
              leave_code: code
            }
          });

          let carriedForward = 0;
          let usedDays = 0;
          let lapsedDays = 0;

          if (existing) {
            carriedForward = (isCF && preserve_carried_forward) ? parseFloat(existing.carried_forward || 0) : 0;
            usedDays = parseFloat(existing.used_days || 0);
            lapsedDays = parseFloat(existing.lapsed_days || 0);
          }

          // Cap carry forward at 45
          carriedForward = isCF ? Math.min(45, carriedForward) : 0;
          const balance = Math.max(0, (allocatedDays + carriedForward) - usedDays);

          await LeaveAllocation.upsert({
            employee_id: u.employee_id,
            employee_name: u.name,
            dept: u.dept || "General",
            year: targetYear,
            leave_type: resolveLeaveName(code),
            leave_code: code,
            allocated_days: allocatedDays,
            carried_forward: carriedForward,
            used_days: usedDays,
            lapsed_days: lapsedDays,
            balance,
            can_carry_forward: isCF,
            max_stack_limit: isCF ? 45 : 0,
            carry_forward_max_years: isCF ? 3 : 0,
            notes: notes || `Bulk allocated for ${targetYear}`,
            allocated_by: hrName,
          });
        }
        updatedCount++;
      }

      return res.json({
        success: true,
        message: `Successfully allocated leaves to ${updatedCount} employees for year ${targetYear}`,
        count: updatedCount
      });
    } catch (err) {
      console.error("Bulk allocate error:", err.message);
      return res.status(500).json({ error: "Failed to perform bulk leave allocation: " + err.message });
    }
  },

  // POST /api/auth/leave/process-carry-forward
  // Executes Year-End Roll-Over:
  // ONLY Earned Leaves (EL) & Privilege Leaves (PL) carry forward up to 3 years (stacking up to 45 leaves).
  // Beyond 45 leaves or 3 years are lapsed.
  async processCarryForward(req, res) {
    try {
      const {
        from_year,
        to_year,
        target_type = "ALL", // "ALL" | "DEPARTMENT" | "SPECIFIC_EMPLOYEES"
        target_value
      } = req.body;

      const hrName = req.user?.name || "HR System";
      const fromY = parseInt(from_year, 10);
      const toY = parseInt(to_year, 10);

      if (!fromY || !toY || toY <= fromY) {
        return res.status(400).json({ error: "Valid from_year and to_year (where to_year > from_year) are required." });
      }

      let userWhere = { status: "Active" };
      if (target_type === "DEPARTMENT" && target_value) {
        userWhere.dept = { [Op.iLike]: String(target_value).trim() };
      } else if (target_type === "SPECIFIC_EMPLOYEES" && Array.isArray(target_value)) {
        userWhere.employee_id = { [Op.in]: target_value };
      }

      const users = await User.findAll({
        where: userWhere,
        attributes: ["employee_id", "name", "dept", "employment_type"]
      });

      if (users.length === 0) {
        return res.status(404).json({ error: "No matching employees found to process carry forward" });
      }

      const summaryList = [];
      let totalCarriedForwardAll = 0;
      let totalLapsedAll = 0;

      for (const u of users) {
        // Fetch all allocations for from_year
        const prevAllocations = await LeaveAllocation.findAll({
          where: {
            employee_id: u.employee_id,
            year: fromY
          }
        });

        // Track employee roll-over summary
        const empRollSummary = {
          employee_id: u.employee_id,
          name: u.name,
          dept: u.dept,
          carried_el: 0,
          lapsed_el: 0,
          carried_pl: 0,
          lapsed_pl: 0,
          lapsed_non_carry_forward: 0
        };

        for (const prev of prevAllocations) {
          const code = prev.leave_code;
          const isCF = code === "EL" || code === "PL";
          const unutilized = Math.max(0, (parseFloat(prev.allocated_days) || 0) + (parseFloat(prev.carried_forward) || 0) - (parseFloat(prev.used_days) || 0));

          if (!isCF) {
            // Non-carry-forwardable leaves (Casual, Sick, etc.) LAPSE at year end
            empRollSummary.lapsed_non_carry_forward += unutilized;
            continue;
          }

          // Handle Earned Leave (EL) and Privilege Leave (PL)
          // 1. Check historical 3-year logs for leaves expiring this cycle
          // Leaves originating 3 years prior to to_year (i.e. from_year - 2) expire now
          const expiryThresholdYear = toY - 3; // Leaves from <= expiryThresholdYear expire
          const expiredOldLogs = await LeaveCarryForwardLog.findAll({
            where: {
              employee_id: u.employee_id,
              leave_code: code,
              from_year: { [Op.lte]: expiryThresholdYear }
            }
          });

          let expiredAgeDays = 0;
          expiredOldLogs.forEach(log => {
            // If any portion of old leaves was never consumed
            expiredAgeDays += Math.max(0, parseFloat(log.actual_carried_forward || 0));
          });

          // Unutilized after age expiration
          const unutilizedAfterAge = Math.max(0, unutilized - expiredAgeDays);

          // 2. Fetch current cumulative carry-forward balance stacked so far
          const existingToYearAlloc = await LeaveAllocation.findOne({
            where: {
              employee_id: u.employee_id,
              year: toY,
              leave_code: code
            }
          });

          // 3. Stacking calculation: Cap total accumulated carry forward at 45 leaves
          const maxCap = 45;
          let candidateTotal = unutilizedAfterAge;
          let excessLapsed = 0;
          let actualCarried = candidateTotal;

          if (candidateTotal > maxCap) {
            excessLapsed = candidateTotal - maxCap;
            actualCarried = maxCap;
          }

          const totalLapsedThisYear = expiredAgeDays + excessLapsed;

          // 4. Update or create LeaveAllocation for to_year
          const defaultAnnualQuota = code === "EL" ? 12 : 15;
          const freshAllocated = existingToYearAlloc ? parseFloat(existingToYearAlloc.allocated_days) : defaultAnnualQuota;
          const existingUsed = existingToYearAlloc ? parseFloat(existingToYearAlloc.used_days || 0) : 0;
          const newBal = Math.max(0, (freshAllocated + actualCarried) - existingUsed);

          await LeaveAllocation.upsert({
            employee_id: u.employee_id,
            employee_name: u.name,
            dept: u.dept || "General",
            year: toY,
            leave_type: resolveLeaveName(code),
            leave_code: code,
            allocated_days: freshAllocated,
            carried_forward: actualCarried,
            used_days: existingUsed,
            lapsed_days: totalLapsedThisYear,
            balance: newBal,
            can_carry_forward: true,
            max_stack_limit: 45,
            carry_forward_max_years: 3,
            notes: `Year-end roll-over from ${fromY} to ${toY}. Carried: ${actualCarried}, Lapsed: ${totalLapsedThisYear} (Cap 45 / Max 3 Yrs).`,
            allocated_by: hrName,
          });

          // 5. Create audit log entry
          await LeaveCarryForwardLog.create({
            employee_id: u.employee_id,
            employee_name: u.name,
            dept: u.dept,
            leave_code: code,
            leave_type: resolveLeaveName(code),
            from_year: fromY,
            to_year: toY,
            unutilized_balance: unutilized,
            eligible_carry_forward: unutilizedAfterAge,
            years_carried: 1,
            excess_lapsed: totalLapsedThisYear,
            actual_carried_forward: actualCarried,
            total_stacked: actualCarried,
            expiry_year: fromY + 3,
            notes: `Carried forward from ${fromY} to ${toY}. Stacked: ${actualCarried}/45. Excess/expired lapsed: ${totalLapsedThisYear}.`,
            processed_by: hrName,
          });

          if (code === "EL") {
            empRollSummary.carried_el = actualCarried;
            empRollSummary.lapsed_el = totalLapsedThisYear;
          } else if (code === "PL") {
            empRollSummary.carried_pl = actualCarried;
            empRollSummary.lapsed_pl = totalLapsedThisYear;
          }

          totalCarriedForwardAll += actualCarried;
          totalLapsedAll += totalLapsedThisYear;
        }

        summaryList.push(empRollSummary);
      }

      return res.json({
        success: true,
        message: `Carry-forward roll-over completed from ${fromY} to ${toY} for ${summaryList.length} employees.`,
        summary: {
          total_employees: summaryList.length,
          from_year: fromY,
          to_year: toY,
          total_carried_forward_days: totalCarriedForwardAll,
          total_lapsed_days: totalLapsedAll,
          rule: "Only Earned Leaves (EL) & Privilege Leaves (PL) carry forward up to 3 years (stacking up to 45 leaves, excess lapsed). Casual & Sick leaves lapse."
        },
        data: summaryList
      });
    } catch (err) {
      console.error("Process carry forward error:", err.message);
      return res.status(500).json({ error: "Failed to process carry-forward roll-over: " + err.message });
    }
  },

  // GET /api/auth/leave/carry-forward-history/:employeeId
  async getCarryForwardHistory(req, res) {
    try {
      const { employeeId } = req.params;
      const history = await LeaveCarryForwardLog.findAll({
        where: { employee_id: employeeId },
        order: [["to_year", "DESC"], ["created_at", "DESC"]]
      });

      return res.json({
        success: true,
        employee_id: employeeId,
        data: history
      });
    } catch (err) {
      console.error("Get carry forward history error:", err.message);
      return res.status(500).json({ error: "Failed to fetch carry forward history" });
    }
  },

  // GET /api/auth/leave/policies
  async getLeavePolicies(req, res) {
    try {
      const policies = await LeavePolicy.findAll({
        order: [["id", "ASC"]]
      });
      return res.json({ success: true, data: policies });
    } catch (err) {
      console.error("Get leave policies error:", err.message);
      return res.status(500).json({ error: "Failed to fetch leave policies" });
    }
  },

  // PUT /api/auth/leave/policies/:code
  async updateLeavePolicy(req, res) {
    try {
      const { code } = req.params;
      const { default_annual_quota, can_carry_forward, carry_forward_max_years, max_stack_limit, is_active, description } = req.body;

      const policy = await LeavePolicy.findOne({ where: { leave_code: code.toUpperCase() } });
      if (!policy) {
        return res.status(404).json({ error: "Leave policy not found" });
      }

      await policy.update({
        default_annual_quota: default_annual_quota !== undefined ? parseFloat(default_annual_quota) : policy.default_annual_quota,
        can_carry_forward: can_carry_forward !== undefined ? !!can_carry_forward : policy.can_carry_forward,
        carry_forward_max_years: carry_forward_max_years !== undefined ? parseInt(carry_forward_max_years, 10) : policy.carry_forward_max_years,
        max_stack_limit: max_stack_limit !== undefined ? parseInt(max_stack_limit, 10) : policy.max_stack_limit,
        is_active: is_active !== undefined ? !!is_active : policy.is_active,
        description: description !== undefined ? description : policy.description,
      });

      return res.json({
        success: true,
        message: `Leave policy ${code} updated successfully`,
        data: policy
      });
    } catch (err) {
      console.error("Update leave policy error:", err.message);
      return res.status(500).json({ error: "Failed to update leave policy" });
    }
  },

  // POST /api/auth/leave/cleanup-gender-allocations
  // Statutory cleanup: resets any erroneous ML (for males) or PAT (for females)
  async cleanupGenderAllocations(req, res) {
    try {
      const { year } = req.body;
      const targetYear = parseInt(year, 10) || new Date().getFullYear();

      const users = await User.findAll({
        attributes: ["employee_id", "name", "gender"]
      });

      let cleanedCount = 0;

      for (const u of users) {
        let empGender = (u.gender || "").trim().toLowerCase();
        if (!empGender) {
          const empRec = await Employee.findOne({
            where: { employee_id: u.employee_id },
            attributes: ["gender"]
          });
          if (empRec && empRec.gender) {
            empGender = empRec.gender.trim().toLowerCase();
          }
        }

        const isFemale = empGender.startsWith("f") || empGender === "female";
        const isMale = empGender.startsWith("m") || empGender === "male";

        // If male has ML > 0, reset to 0
        if (!isFemale) {
          const ml = await LeaveAllocation.findOne({
            where: { employee_id: u.employee_id, year: targetYear, leave_code: "ML" }
          });
          if (ml && parseFloat(ml.allocated_days || 0) > 0) {
            await ml.update({
              allocated_days: 0,
              balance: 0,
              notes: "Corrected: Maternity Leave is statutory for female employees only."
            });
            cleanedCount++;
          }
        }

        // If female has PAT > 0, reset to 0
        if (!isMale) {
          const pat = await LeaveAllocation.findOne({
            where: { employee_id: u.employee_id, year: targetYear, leave_code: "PAT" }
          });
          if (pat && parseFloat(pat.allocated_days || 0) > 0) {
            await pat.update({
              allocated_days: 0,
              balance: 0,
              notes: "Corrected: Paternity Leave is statutory for male employees only."
            });
            cleanedCount++;
          }
        }
      }

      return res.json({
        success: true,
        message: `Successfully audited and cleaned up ${cleanedCount} gender-incompatible leave allocation records for year ${targetYear}.`,
        cleanedCount
      });
    } catch (err) {
      console.error("Cleanup gender allocations error:", err.message);
      return res.status(500).json({ error: "Failed to clean up gender allocations" });
    }
  }
};

module.exports = LeaveController;
