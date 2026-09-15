const { Resignation, User, Employee } = require("../config/db");
const { Op } = require("sequelize");

const ResignationController = {
  // GET /api/auth/resignation
  async getResignations(req, res) {
    try {
      const { dept, status, search } = req.query;
      const { role, employee_id } = req.user;

      const user = await User.findOne({ where: { employee_id } });
      const emp = await Employee.findOne({ where: { employee_id } });

      let userDept = (user && user.dept) ? user.dept : (emp ? emp.dept || emp.department : "General");

      let whereClause = {};

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager" || role === "accounts" || role === "payroll";
      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead";

      if (isHrOrAdmin) {
        if (dept && dept !== "All") {
          whereClause.dept = { [Op.iLike]: dept.trim() };
        }
      } else if (isLeadOrManager) {
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

      if (search && search.trim()) {
        const query = `%${search.trim()}%`;
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
          [Op.or]: [
            { name: { [Op.iLike]: query } },
            { employee_id: { [Op.iLike]: query } },
            { designation: { [Op.iLike]: query } },
            { reason: { [Op.iLike]: query } }
          ]
        });
      }

      const resignations = await Resignation.findAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
      });

      return res.json({ success: true, data: resignations });
    } catch (err) {
      console.error("Get resignations error:", err.message);
      return res.status(500).json({ error: "Failed to fetch resignation records" });
    }
  },

  // GET /api/auth/resignation/my
  async getMyResignation(req, res) {
    try {
      const { employee_id } = req.user;

      const all = await Resignation.findAll({
        where: { employee_id },
        order: [["created_at", "DESC"]]
      });

      // Find current active resignation (not cancelled/rejected or latest)
      const active = all.find(r => r.status !== "Cancelled" && r.status !== "Rejected") || all[0] || null;

      return res.json({
        success: true,
        data: {
          active,
          history: all
        }
      });
    } catch (err) {
      console.error("Get my resignation error:", err.message);
      return res.status(500).json({ error: "Failed to fetch user resignation details" });
    }
  },

  // GET /api/auth/resignation/:id
  async getResignationById(req, res) {
    try {
      const { id } = req.params;
      const { employee_id, role } = req.user;

      const record = await Resignation.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager" || role === "accounts" || role === "payroll";
      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead";

      if (record.employee_id !== employee_id && !isHrOrAdmin && !isLeadOrManager) {
        return res.status(403).json({ error: "Unauthorized to view this resignation record" });
      }

      return res.json({ success: true, data: record });
    } catch (err) {
      console.error("Get resignation by id error:", err.message);
      return res.status(500).json({ error: "Failed to fetch resignation record" });
    }
  },

  // POST /api/auth/resignation/apply
  async applyResignation(req, res) {
    try {
      const { employee_id, name } = req.user;
      const {
        last_working_date,
        notice_period,
        reason,
        reason_details,
        schedule_exit_interview,
        interview_preferred_date,
        interview_mode,
        handover_person_id,
        handover_person_name,
        handover_target_date,
        handover_note,
        reassign_items_to_id,
        reassign_items_to_name,
        email_forwarding_to_id,
        email_forwarding_to_name,
        ack_claims_expenses,
        ack_final_pay,
        ack_return_assets,
        is_draft
      } = req.body;

      if (!is_draft) {
        if (!last_working_date || !reason) {
          return res.status(400).json({ error: "Last working date and reason for resignation are required" });
        }
        if (!ack_claims_expenses || !ack_final_pay || !ack_return_assets) {
          return res.status(400).json({ error: "Please acknowledge all clearance and final pay terms before submission" });
        }
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
        empDept = emp.dept || emp.department || "General";
      }

      const empEmail = user ? user.email : (emp ? emp.email : "");
      const empDesig = user ? user.designation : (emp ? emp.designation : "");
      const empJoining = user ? user.joining_date : (emp ? emp.joining_date : null);

      // Check if user already has an active pending/draft resignation
      const existingDraft = await Resignation.findOne({
        where: {
          employee_id,
          status: "Draft"
        }
      });

      const initialStatus = is_draft ? "Draft" : "Pending Manager Approval";

      let resignationRecord;
      if (existingDraft) {
        resignationRecord = await existingDraft.update({
          name: empName,
          email: empEmail,
          dept: empDept,
          designation: empDesig,
          joining_date: empJoining,
          last_working_date: last_working_date || existingDraft.last_working_date,
          notice_period: notice_period || "1 month",
          reason: reason || existingDraft.reason || "Career Growth",
          reason_details: reason_details || "",
          schedule_exit_interview: !!schedule_exit_interview,
          interview_preferred_date: interview_preferred_date || "",
          interview_mode: interview_mode || "In person",
          handover_person_id: handover_person_id || "",
          handover_person_name: handover_person_name || "",
          handover_target_date: handover_target_date || null,
          handover_note: handover_note || "",
          reassign_items_to_id: reassign_items_to_id || "",
          reassign_items_to_name: reassign_items_to_name || "",
          email_forwarding_to_id: email_forwarding_to_id || "",
          email_forwarding_to_name: email_forwarding_to_name || "",
          ack_claims_expenses: !!ack_claims_expenses,
          ack_final_pay: !!ack_final_pay,
          ack_return_assets: !!ack_return_assets,
          status: initialStatus,
        });
      } else {
        resignationRecord = await Resignation.create({
          employee_id,
          name: empName,
          email: empEmail,
          dept: empDept,
          designation: empDesig,
          joining_date: empJoining,
          last_working_date: last_working_date || new Date().toISOString().split("T")[0],
          notice_period: notice_period || "1 month",
          reason: reason || "Career Growth",
          reason_details: reason_details || "",
          schedule_exit_interview: !!schedule_exit_interview,
          interview_preferred_date: interview_preferred_date || "",
          interview_mode: interview_mode || "In person",
          handover_person_id: handover_person_id || "",
          handover_person_name: handover_person_name || "",
          handover_target_date: handover_target_date || null,
          handover_note: handover_note || "",
          reassign_items_to_id: reassign_items_to_id || "",
          reassign_items_to_name: reassign_items_to_name || "",
          email_forwarding_to_id: email_forwarding_to_id || "",
          email_forwarding_to_name: email_forwarding_to_name || "",
          ack_claims_expenses: !!ack_claims_expenses,
          ack_final_pay: !!ack_final_pay,
          ack_return_assets: !!ack_return_assets,
          status: initialStatus,
        });
      }

      return res.status(201).json({
        success: true,
        message: is_draft
          ? "Resignation draft saved successfully!"
          : "Resignation submitted successfully! It has been routed to your Team Lead / Department Manager for review.",
        data: resignationRecord
      });
    } catch (err) {
      console.error("Apply resignation error:", err.message);
      return res.status(500).json({ error: "Failed to submit resignation form" });
    }
  },

  // PATCH /api/auth/resignation/:id/manager-action
  async managerReview(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments, recommended_lwd } = req.body;
      const { employee_id, name, role } = req.user;

      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead" || role === "hr" || role === "admin";
      if (!isLeadOrManager) {
        return res.status(403).json({ error: "Only Department Leads, Managers, or HR can review resignations" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isApproved = decision === "Approved";
      const nextStatus = isApproved ? "Pending HR Approval" : "Rejected";

      await resignation.update({
        status: nextStatus,
        manager_id: employee_id,
        manager_name: name || "Manager",
        manager_decision: decision,
        manager_comments: comments || "",
        manager_action_date: new Date(),
        manager_recommended_lwd: recommended_lwd || resignation.last_working_date,
      });

      return res.json({
        success: true,
        message: isApproved
          ? "Resignation recommended and routed to HR for final approval."
          : "Resignation has been rejected by Manager.",
        data: resignation
      });
    } catch (err) {
      console.error("Manager review error:", err.message);
      return res.status(500).json({ error: "Failed to process manager review" });
    }
  },

  // PATCH /api/auth/resignation/:id/hr-action
  async hrReview(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments, confirmed_lwd, exit_interview_status, exit_interview_date } = req.body;
      const { employee_id, name, role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (!isHrOrAdmin) {
        return res.status(403).json({ error: "Only HR Managers or Admins can perform final resignation approval" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isApproved = decision === "Approved";
      const finalStatus = isApproved ? "Approved" : "Rejected";

      await resignation.update({
        status: finalStatus,
        hr_id: employee_id,
        hr_name: name || "HR Head",
        hr_decision: decision,
        hr_comments: comments || "",
        hr_action_date: new Date(),
        hr_confirmed_lwd: confirmed_lwd || resignation.manager_recommended_lwd || resignation.last_working_date,
        exit_interview_status: exit_interview_status || (resignation.schedule_exit_interview ? "Scheduled" : "Not Scheduled"),
        exit_interview_date: exit_interview_date || resignation.interview_preferred_date,
      });

      return res.json({
        success: true,
        message: isApproved
          ? "Resignation approved by HR! Clearance and relieving workflow initiated."
          : "Resignation rejected by HR.",
        data: resignation
      });
    } catch (err) {
      console.error("HR review error:", err.message);
      return res.status(500).json({ error: "Failed to process HR approval" });
    }
  },

  // PATCH /api/auth/resignation/:id/clearance
  async updateClearance(req, res) {
    try {
      const { id } = req.params;
      const { clearance_it_status, clearance_finance_status, clearance_admin_status, clearance_hr_status } = req.body;
      const { role } = req.user;

      const isAuthorized = role === "hr" || role === "admin" || role === "accounts" || role === "payroll" || role === "hod";
      if (!isAuthorized) {
        return res.status(403).json({ error: "Not authorized to update clearance checklist" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const updates = {};
      if (clearance_it_status) updates.clearance_it_status = clearance_it_status;
      if (clearance_finance_status) updates.clearance_finance_status = clearance_finance_status;
      if (clearance_admin_status) updates.clearance_admin_status = clearance_admin_status;
      if (clearance_hr_status) updates.clearance_hr_status = clearance_hr_status;

      await resignation.update(updates);

      return res.json({
        success: true,
        message: "Clearance checklist updated successfully",
        data: resignation
      });
    } catch (err) {
      console.error("Update clearance error:", err.message);
      return res.status(500).json({ error: "Failed to update clearance status" });
    }
  },

  // DELETE /api/auth/resignation/:id/cancel
  async cancelResignation(req, res) {
    try {
      const { id } = req.params;
      const { employee_id, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin";
      if (resignation.employee_id !== employee_id && !isHrOrAdmin) {
        return res.status(403).json({ error: "You can only withdraw your own resignation" });
      }

      if (resignation.status === "Approved") {
        return res.status(400).json({ error: "Approved resignations cannot be cancelled directly. Please contact HR." });
      }

      await resignation.update({ status: "Cancelled" });

      return res.json({
        success: true,
        message: "Resignation withdrawn successfully",
        data: resignation
      });
    } catch (err) {
      console.error("Cancel resignation error:", err.message);
      return res.status(500).json({ error: "Failed to cancel resignation" });
    }
  }
};

module.exports = ResignationController;
