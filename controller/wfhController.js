const {
  WorkFromHome,
  User,
  Employee,
  ApprovalRequest,
  sequelize,
} = require("../config/db");
const { initiateApprovalRequest } = require("../services/approvalEngine");
const { sendRealtimeNotification } = require("../socket");
const { Op } = require("sequelize");
const { getISTDateStr } = require("../utils/timezone");

const WfhController = {
  // POST /api/auth/wfh/apply
  async applyWFH(req, res) {
    try {
      const { employee_id, role, name } = req.user;
      const {
        start_date,
        end_date,
        day_type = "Full Day",
        reason,
        work_plan,
        emergency_contact,
      } = req.body;

      if (!start_date || !end_date) {
        return res.status(400).json({ error: "Start date and End date are required" });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: "Reason for Work From Home is required" });
      }

      if (end_date < start_date) {
        return res.status(400).json({ error: "End date cannot be earlier than start date" });
      }

      // 1. Fetch user & employee profile
      const [user, emp] = await Promise.all([
        User.findOne({ where: { employee_id } }),
        Employee.findOne({ where: { employee_id } }),
      ]);

      let empName = name || (user ? user.name : null);
      if (!empName || empName === "Employee") {
        if (emp) {
          empName = emp.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_name;
        }
      }
      if (!empName) empName = "Employee";

      let empDept = user?.dept || emp?.dept || emp?.department || "General";
      if (!empDept || empDept === "Other" || empDept === "General") {
        empDept = emp?.dept || emp?.department || "General";
      }

      // 2. Compute total days
      let computedDays = 1.0;
      if (day_type === "First Half" || day_type === "Second Half") {
        computedDays = 0.5;
      } else {
        const sD = new Date(start_date + "T12:00:00+05:30");
        const eD = new Date(end_date + "T12:00:00+05:30");
        const diffTime = Math.abs(eD - sD);
        computedDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      // 3. Check for active/pending overlapping requests
      const existingOverlap = await WorkFromHome.findOne({
        where: {
          employee_id,
          status: { [Op.in]: ["Pending", "Approved"] },
          [Op.and]: [
            { start_date: { [Op.lte]: end_date } },
            { end_date: { [Op.gte]: start_date } },
          ],
        },
      });

      if (existingOverlap) {
        return res.status(400).json({
          error: `You already have an existing ${existingOverlap.status.toLowerCase()} WFH request (${existingOverlap.request_no}: ${existingOverlap.start_date} to ${existingOverlap.end_date}) overlapping this date range.`,
        });
      }

      // 4. Generate unique request number
      const year = new Date().getFullYear();
      const count = await WorkFromHome.count();
      const seq = String(count + 1).padStart(4, "0");
      const request_no = `WFH-${year}-${seq}`;

      // 5. Create WorkFromHome record
      const newWfh = await WorkFromHome.create({
        request_no,
        employee_id,
        employee_name: empName,
        department: empDept,
        start_date,
        end_date,
        day_type: day_type || "Full Day",
        total_days: computedDays,
        reason: reason.trim(),
        work_plan: work_plan ? work_plan.trim() : "",
        emergency_contact: emergency_contact || user?.phone || emp?.phone || "",
        status: "Pending",
      });

      // 6. Initiate Sequential Multi-Level Approval (Employee ➔ Reporting Manager ➔ HOD ➔ HR)
      try {
        await initiateApprovalRequest({
          module: "WORK_FROM_HOME",
          entity_id: newWfh.id,
          employee_id,
          title: `Work From Home (${computedDays} Day${computedDays > 1 ? "s" : ""})`,
          description: `${reason.trim()} | Deliverables: ${work_plan ? work_plan.trim() : "Standard operational deliverables"}`,
          days: computedDays,
          metadata: {
            request_no,
            start_date,
            end_date,
            day_type,
            total_days: computedDays,
            reason: reason.trim(),
            work_plan: work_plan ? work_plan.trim() : "",
            emergency_contact: emergency_contact || "",
          },
          created_by: empName || employee_id,
        });
      } catch (apprErr) {
        console.warn("Sequential approval initiation warning for WFH:", apprErr.message);
      }

      // 7. Realtime socket notification to Reporting Manager, HOD & HR
      const reportingMgr = user?.reporting_manager || emp?.reporting_manager;
      sendRealtimeNotification({
        recipient_id: reportingMgr || "ALL",
        recipient_role: reportingMgr ? undefined : "hod",
        title: "New Work From Home Application 🏠",
        message: `${empName} applied for Work From Home (${start_date} to ${end_date}, ${computedDays} day(s)). Reason: ${reason.trim()}.`,
        type: "approval",
        category: "Approvals",
        link: "/approvals",
        priority: "normal",
        source_module: "wfh",
        created_by: empName || employee_id,
      }).catch((e) => console.warn("Socket WFH apply notification error:", e.message));

      return res.status(201).json({
        success: true,
        message: "Work From Home request submitted successfully! Routed to Reporting Manager / HOD for approval.",
        data: newWfh,
      });
    } catch (err) {
      console.error("Apply WFH error:", err);
      return res.status(500).json({ error: "Failed to submit Work From Home request" });
    }
  },

  // GET /api/auth/wfh/my-requests
  async getMyWFHRequests(req, res) {
    try {
      const { employee_id } = req.user;
      const requests = await WorkFromHome.findAll({
        where: { employee_id },
        order: [["id", "DESC"]],
      });
      return res.json({ success: true, data: requests });
    } catch (err) {
      console.error("Get my WFH requests error:", err);
      return res.status(500).json({ error: "Failed to fetch WFH requests" });
    }
  },

  // GET /api/auth/wfh/all
  async getAllWFHRequests(req, res) {
    try {
      const { dept, status, from, to } = req.query;
      const { role, employee_id } = req.user;

      let whereClause = {};

      const isHrAdminOrAccounts = ["hr", "admin", "hrmanager", "accounts", "payroll", "management", "ceo", "coo"].includes(role);
      const isSupervisor = ["hod", "manager", "teamlead"].includes(role);

      if (isHrAdminOrAccounts) {
        if (dept && dept !== "All") {
          whereClause.department = { [Op.iLike]: dept.trim() };
        }
      } else if (isSupervisor) {
        let userDept = req.user.dept;
        if (!userDept || userDept === "Other" || userDept === "General") {
          const emp = await Employee.findOne({ where: { employee_id } });
          if (emp?.dept) userDept = emp.dept;
        }
        const targetDept = (dept && dept !== "All") ? dept : userDept;
        if (targetDept) {
          whereClause[Op.or] = [
            { department: { [Op.iLike]: targetDept.trim() } },
            { employee_id },
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

      if (from && to) {
        whereClause[Op.and] = [
          { start_date: { [Op.lte]: to } },
          { end_date: { [Op.gte]: from } },
        ];
      }

      const requests = await WorkFromHome.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
      });

      return res.json({ success: true, data: requests });
    } catch (err) {
      console.error("Get all WFH requests error:", err);
      return res.status(500).json({ error: "Failed to fetch WFH requests" });
    }
  },

  // GET /api/auth/wfh/:id
  async getWFHById(req, res) {
    try {
      const { id } = req.params;
      const wfh = await WorkFromHome.findByPk(id);
      if (!wfh) {
        return res.status(404).json({ error: "Work From Home request not found" });
      }
      return res.json({ success: true, data: wfh });
    } catch (err) {
      console.error("Get WFH by id error:", err);
      return res.status(500).json({ error: "Failed to fetch WFH request" });
    }
  },

  // DELETE /api/auth/wfh/:id/cancel
  async cancelWFH(req, res) {
    try {
      const { id } = req.params;
      const { employee_id } = req.user;

      const wfh = await WorkFromHome.findByPk(id);
      if (!wfh) {
        return res.status(404).json({ error: "Work From Home request not found" });
      }

      if (wfh.employee_id !== employee_id && !["hr", "admin"].includes(req.user.role)) {
        return res.status(403).json({ error: "Unauthorized to cancel this request" });
      }

      if (wfh.status !== "Pending") {
        return res.status(400).json({ error: `Cannot cancel a request that is already ${wfh.status}` });
      }

      await wfh.update({
        status: "Cancelled",
        approval_remarks: "Cancelled by employee",
      });

      // Update associated ApprovalRequest if any
      try {
        await ApprovalRequest.update(
          {
            status: "CANCELLED",
            final_decision: "CANCELLED",
            final_remarks: "Cancelled by applicant",
          },
          {
            where: {
              module: "WORK_FROM_HOME",
              entity_id: String(wfh.id),
            },
          }
        );
      } catch (apprErr) {
        console.warn("Could not cancel approval request:", apprErr.message);
      }

      return res.json({ success: true, message: "Work From Home request cancelled successfully" });
    } catch (err) {
      console.error("Cancel WFH error:", err);
      return res.status(500).json({ error: "Failed to cancel WFH request" });
    }
  },
};

module.exports = WfhController;
