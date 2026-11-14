const {
  ApprovalWorkflow,
  ApprovalWorkflowStep,
  ApprovalRequest,
  ApprovalRequestStep,
  Employee,
  Department,
  User,
  sequelize,
} = require("../config/db");
const {
  initiateApprovalRequest,
  processApprovalAction,
} = require("../services/approvalEngine");
const { Op } = require("sequelize");

const ApprovalController = {
  /**
   * GET /api/auth/approvals/inbox
   * Retrieve all requests awaiting the logged-in user's approval
   */
  async getPendingApprovals(req, res) {
    try {
      const user = req.user || {};
      const empId = String(user.employee_id || user.id || "").trim();
      const role = String(user.role || "").toLowerCase().trim();
      const userDept = String(user.dept || user.department || "").trim();

      const isAdmin = ["admin", "superadmin", "management", "ceo", "coo"].includes(role);
      const isHR = ["hr", "hrmanager"].includes(role);
      const isFinance = ["finance", "accounts"].includes(role);
      const isHOD = ["hod"].includes(role);
      const isManager = ["manager", "teamlead"].includes(role);

      // Fetch pending steps matching user's permissions
      const stepWhere = { status: "PENDING" };
      const orConditions = [];

      // 1. Direct assignment to this employee ID
      if (empId) {
        orConditions.push({ assigned_to_id: empId });
        orConditions.push({ assigned_to_id: empId.toUpperCase() });
        orConditions.push({ assigned_to_id: empId.toLowerCase() });
      }

      // 2. Role-based matching
      if (isHR) {
        orConditions.push({ approver_role: "hr" });
      }
      if (isFinance) {
        orConditions.push({ approver_role: "finance" });
        orConditions.push({ approver_role: "accounts" });
      }
      if (isHOD) {
        orConditions.push({ approver_type: "HOD" });
        orConditions.push({ approver_role: "hod" });
      }
      if (isManager) {
        orConditions.push({ approver_type: "REPORTING_MANAGER" });
        orConditions.push({ approver_role: "manager" });
      }

      // 3. Admin / Leadership can see all pending steps
      if (!isAdmin && orConditions.length > 0) {
        stepWhere[Op.or] = orConditions;
      }

      // Find requests that have a pending step
      const requests = await ApprovalRequest.findAll({
        where: { status: "PENDING" },
        include: [
          {
            model: ApprovalRequestStep,
            as: "steps",
            required: true,
            where: isAdmin ? { status: "PENDING" } : stepWhere,
          },
        ],
        order: [["created_at", "DESC"]],
      });

      // Also reload complete step chain for each request so front-end has the full stepper
      const fullRequests = await Promise.all(
        requests.map(async (r) => {
          const allSteps = await ApprovalRequestStep.findAll({
            where: { request_id: r.id },
            order: [["level_order", "ASC"]],
          });
          const json = r.toJSON();
          json.steps = allSteps;
          return json;
        })
      );

      return res.json({
        success: true,
        count: fullRequests.length,
        data: fullRequests,
      });
    } catch (err) {
      console.error("Error fetching approval inbox:", err);
      return res.status(500).json({ error: "Failed to load approval inbox" });
    }
  },

  /**
   * GET /api/auth/approvals/my-requests
   * Retrieve all requests submitted by the logged-in employee
   */
  async getMySubmittedRequests(req, res) {
    try {
      const user = req.user || {};
      const empId = String(user.employee_id || user.id || "").trim();

      const requests = await ApprovalRequest.findAll({
        where: { employee_id: empId },
        include: [
          {
            model: ApprovalRequestStep,
            as: "steps",
          },
        ],
        order: [
          ["created_at", "DESC"],
          [{ model: ApprovalRequestStep, as: "steps" }, "level_order", "ASC"],
        ],
      });

      return res.json({
        success: true,
        count: requests.length,
        data: requests,
      });
    } catch (err) {
      console.error("Error fetching my requests:", err);
      return res.status(500).json({ error: "Failed to load requests" });
    }
  },

  /**
   * GET /api/auth/approvals/history
   * Retrieve historical requests approved/rejected by this user
   */
  async getApprovalHistory(req, res) {
    try {
      const user = req.user || {};
      const empId = String(user.employee_id || user.id || "").trim();
      const role = String(user.role || "").toLowerCase().trim();
      const isAdmin = ["admin", "superadmin", "management", "ceo"].includes(role);

      let whereSteps = {
        status: { [Op.in]: ["APPROVED", "REJECTED"] },
      };

      if (!isAdmin) {
        whereSteps[Op.or] = [
          { acted_by_id: empId },
          { assigned_to_id: empId },
          { approver_role: role },
        ];
      }

      const steps = await ApprovalRequestStep.findAll({
        where: whereSteps,
        attributes: ["request_id"],
      });

      const requestIds = [...new Set(steps.map((s) => s.request_id))];

      const requests = await ApprovalRequest.findAll({
        where: { id: { [Op.in]: requestIds } },
        include: [
          {
            model: ApprovalRequestStep,
            as: "steps",
          },
        ],
        order: [
          ["updated_at", "DESC"],
          [{ model: ApprovalRequestStep, as: "steps" }, "level_order", "ASC"],
        ],
      });

      return res.json({
        success: true,
        count: requests.length,
        data: requests,
      });
    } catch (err) {
      console.error("Error fetching approval history:", err);
      return res.status(500).json({ error: "Failed to load approval history" });
    }
  },

  /**
   * GET /api/auth/approvals/entity/:module/:entityId
   * Fetch approval details & multi-level stepper for any entity (e.g. Leave, Claim)
   */
  async getEntityApproval(req, res) {
    try {
      const { module, entityId } = req.params;

      const request = await ApprovalRequest.findOne({
        where: {
          module: module.toUpperCase(),
          entity_id: String(entityId),
        },
        include: [
          {
            model: ApprovalRequestStep,
            as: "steps",
          },
        ],
        order: [[{ model: ApprovalRequestStep, as: "steps" }, "level_order", "ASC"]],
      });

      if (!request) {
        return res.json({ success: true, exists: false, data: null });
      }

      return res.json({
        success: true,
        exists: true,
        data: request,
      });
    } catch (err) {
      console.error("Error fetching entity approval:", err);
      return res.status(500).json({ error: "Failed to load entity approval details" });
    }
  },

  /**
   * GET /api/auth/approvals/:id
   * Get single approval request by ID
   */
  async getApprovalRequestById(req, res) {
    try {
      const { id } = req.params;
      const request = await ApprovalRequest.findByPk(id, {
        include: [
          {
            model: ApprovalRequestStep,
            as: "steps",
          },
        ],
        order: [[{ model: ApprovalRequestStep, as: "steps" }, "level_order", "ASC"]],
      });

      if (!request) {
        return res.status(404).json({ error: "Approval request not found" });
      }

      return res.json({
        success: true,
        data: request,
      });
    } catch (err) {
      console.error("Error fetching approval request:", err);
      return res.status(500).json({ error: "Failed to load approval request" });
    }
  },

  /**
   * POST /api/auth/approvals/:id/action
   * Approver acts on the current level: APPROVE, REJECT, CHANGES_REQUESTED
   */
  async submitApprovalAction(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments } = req.body;

      if (!decision) {
        return res.status(400).json({ error: "Decision ('APPROVE', 'REJECT', 'CHANGES_REQUESTED') is required" });
      }

      const result = await processApprovalAction({
        requestId: id,
        approverUser: req.user,
        decision,
        comments,
      });

      return res.json(result);
    } catch (err) {
      console.error("Submit approval action error:", err.message);
      return res.status(400).json({ error: err.message || "Failed to process approval action" });
    }
  },

  // =========================================================================
  // WORKFLOW CONFIGURATION CRUD (Admin / HR)
  // =========================================================================

  /**
   * GET /api/auth/approvals/workflows
   * List all configured sequential workflows
   */
  async getAllWorkflows(req, res) {
    try {
      const workflows = await ApprovalWorkflow.findAll({
        include: [
          {
            model: ApprovalWorkflowStep,
            as: "steps",
          },
        ],
        order: [
          ["module", "ASC"],
          ["department", "ASC"],
          [{ model: ApprovalWorkflowStep, as: "steps" }, "level_order", "ASC"],
        ],
      });

      return res.json({
        success: true,
        count: workflows.length,
        data: workflows,
      });
    } catch (err) {
      console.error("Error loading workflows:", err);
      return res.status(500).json({ error: "Failed to load approval workflows" });
    }
  },

  /**
   * POST /api/auth/approvals/workflows
   * Create new workflow configuration with sequential steps
   */
  async createWorkflow(req, res) {
    try {
      const {
        module,
        workflow_name,
        description,
        department = "ALL",
        min_amount = 0,
        min_days = 0,
        is_active = true,
        allow_auto_skip = true,
        notify_on_each_step = true,
        steps = [],
      } = req.body;

      if (!module || !workflow_name) {
        return res.status(400).json({ error: "Module and Workflow Name are required" });
      }

      const creator = req.user?.name || "HR Admin";

      const workflow = await ApprovalWorkflow.create({
        module: module.toUpperCase(),
        workflow_name,
        description,
        department: department || "ALL",
        min_amount: parseFloat(min_amount) || 0,
        min_days: parseFloat(min_days) || 0,
        is_active: Boolean(is_active),
        allow_auto_skip: Boolean(allow_auto_skip),
        notify_on_each_step: Boolean(notify_on_each_step),
        created_by: creator,
        updated_by: creator,
      });

      if (Array.isArray(steps) && steps.length > 0) {
        const stepRecords = steps.map((s, idx) => ({
          workflow_id: workflow.id,
          level_order: s.level_order || idx + 1,
          level_name: s.level_name || `Level ${idx + 1}`,
          approver_type: s.approver_type || "REPORTING_MANAGER",
          approver_role: s.approver_role || null,
          specific_employee_id: s.specific_employee_id || null,
          specific_employee_name: s.specific_employee_name || null,
          condition_type: s.condition_type || "ALWAYS",
          condition_value: parseFloat(s.condition_value) || 0,
          is_mandatory: s.is_mandatory !== false,
          can_auto_skip: s.can_auto_skip !== false,
          sla_hours: parseInt(s.sla_hours, 10) || 48,
        }));

        await ApprovalWorkflowStep.bulkCreate(stepRecords);
      }

      const fullWf = await ApprovalWorkflow.findByPk(workflow.id, {
        include: [{ model: ApprovalWorkflowStep, as: "steps" }],
        order: [[{ model: ApprovalWorkflowStep, as: "steps" }, "level_order", "ASC"]],
      });

      return res.status(201).json({
        success: true,
        message: "Approval workflow created successfully",
        data: fullWf,
      });
    } catch (err) {
      console.error("Create workflow error:", err);
      return res.status(500).json({ error: "Failed to create workflow: " + err.message });
    }
  },

  /**
   * PUT /api/auth/approvals/workflows/:id
   * Update workflow and rebuild steps
   */
  async updateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const {
        workflow_name,
        description,
        department,
        min_amount,
        min_days,
        is_active,
        allow_auto_skip,
        notify_on_each_step,
        steps,
      } = req.body;

      const workflow = await ApprovalWorkflow.findByPk(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      await workflow.update({
        workflow_name: workflow_name !== undefined ? workflow_name : workflow.workflow_name,
        description: description !== undefined ? description : workflow.description,
        department: department !== undefined ? department : workflow.department,
        min_amount: min_amount !== undefined ? parseFloat(min_amount) : workflow.min_amount,
        min_days: min_days !== undefined ? parseFloat(min_days) : workflow.min_days,
        is_active: is_active !== undefined ? Boolean(is_active) : workflow.is_active,
        allow_auto_skip: allow_auto_skip !== undefined ? Boolean(allow_auto_skip) : workflow.allow_auto_skip,
        notify_on_each_step: notify_on_each_step !== undefined ? Boolean(notify_on_each_step) : workflow.notify_on_each_step,
        updated_by: req.user?.name || "HR Admin",
      });

      // If new steps array provided, replace existing steps
      if (Array.isArray(steps)) {
        await ApprovalWorkflowStep.destroy({ where: { workflow_id: workflow.id } });

        const stepRecords = steps.map((s, idx) => ({
          workflow_id: workflow.id,
          level_order: s.level_order || idx + 1,
          level_name: s.level_name || `Level ${idx + 1}`,
          approver_type: s.approver_type || "REPORTING_MANAGER",
          approver_role: s.approver_role || null,
          specific_employee_id: s.specific_employee_id || null,
          specific_employee_name: s.specific_employee_name || null,
          condition_type: s.condition_type || "ALWAYS",
          condition_value: parseFloat(s.condition_value) || 0,
          is_mandatory: s.is_mandatory !== false,
          can_auto_skip: s.can_auto_skip !== false,
          sla_hours: parseInt(s.sla_hours, 10) || 48,
        }));

        await ApprovalWorkflowStep.bulkCreate(stepRecords);
      }

      const fullWf = await ApprovalWorkflow.findByPk(workflow.id, {
        include: [{ model: ApprovalWorkflowStep, as: "steps" }],
        order: [[{ model: ApprovalWorkflowStep, as: "steps" }, "level_order", "ASC"]],
      });

      return res.json({
        success: true,
        message: "Workflow updated successfully",
        data: fullWf,
      });
    } catch (err) {
      console.error("Update workflow error:", err);
      return res.status(500).json({ error: "Failed to update workflow: " + err.message });
    }
  },

  /**
   * DELETE /api/auth/approvals/workflows/:id
   */
  async deleteWorkflow(req, res) {
    try {
      const { id } = req.params;
      const workflow = await ApprovalWorkflow.findByPk(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      await ApprovalWorkflowStep.destroy({ where: { workflow_id: id } });
      await workflow.destroy();

      return res.json({ success: true, message: "Workflow deleted successfully" });
    } catch (err) {
      console.error("Delete workflow error:", err);
      return res.status(500).json({ error: "Failed to delete workflow" });
    }
  },

  /**
   * POST /api/auth/approvals/workflows/reset-defaults
   * Reset / reseed the standard enterprise sequential workflows
   */
  async resetDefaultWorkflows(req, res) {
    try {
      // Clear existing workflows and steps
      await ApprovalWorkflowStep.destroy({ where: {} });
      await ApprovalWorkflow.destroy({ where: {} });

      // 1. Leave Sequential Approval (Employee -> Reporting Manager -> HOD -> HR)
      const leaveWf = await ApprovalWorkflow.create({
        module: "LEAVE",
        workflow_name: "Standard Sequential Leave Approval",
        description: "Sequential 3-level leave endorsement: Employee ➔ Reporting Manager ➔ Department Head (HOD) ➔ HR Sanction",
        department: "ALL",
        is_active: true,
        allow_auto_skip: true,
        notify_on_each_step: true,
        created_by: "System",
      });

      await ApprovalWorkflowStep.bulkCreate([
        {
          workflow_id: leaveWf.id,
          level_order: 1,
          level_name: "Reporting Manager Endorsement",
          approver_type: "REPORTING_MANAGER",
          approver_role: "manager",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: true,
          sla_hours: 24,
        },
        {
          workflow_id: leaveWf.id,
          level_order: 2,
          level_name: "Department Head (HOD) Approval",
          approver_type: "HOD",
          approver_role: "hod",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: true,
          sla_hours: 48,
        },
        {
          workflow_id: leaveWf.id,
          level_order: 3,
          level_name: "HR Operations Final Sanction",
          approver_type: "ROLE",
          approver_role: "hr",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: false,
          sla_hours: 48,
        },
      ]);

      // 2. Expense Claims Sequential Approval (Employee -> Reporting Manager -> HOD -> Finance -> Management)
      const claimWf = await ApprovalWorkflow.create({
        module: "EXPENSE_CLAIM",
        workflow_name: "Sequential Expense & Travel Reimbursement",
        description: "Sequential approval chain: Employee ➔ Line Manager ➔ HOD ➔ Finance Audit ➔ Management (>₹10,000)",
        department: "ALL",
        is_active: true,
        allow_auto_skip: true,
        notify_on_each_step: true,
        created_by: "System",
      });

      await ApprovalWorkflowStep.bulkCreate([
        {
          workflow_id: claimWf.id,
          level_order: 1,
          level_name: "Line Manager Verification",
          approver_type: "REPORTING_MANAGER",
          approver_role: "manager",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: true,
          sla_hours: 24,
        },
        {
          workflow_id: claimWf.id,
          level_order: 2,
          level_name: "Department Head (HOD) Clearance",
          approver_type: "HOD",
          approver_role: "hod",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: true,
          sla_hours: 48,
        },
        {
          workflow_id: claimWf.id,
          level_order: 3,
          level_name: "Finance & Accounts Audit",
          approver_type: "ROLE",
          approver_role: "finance",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: false,
          sla_hours: 48,
        },
        {
          workflow_id: claimWf.id,
          level_order: 4,
          level_name: "Executive Management Sign-Off",
          approver_type: "ROLE",
          approver_role: "management",
          condition_type: "AMOUNT_GREATER_THAN",
          condition_value: 10000,
          is_mandatory: false,
          can_auto_skip: false,
          sla_hours: 72,
        },
      ]);

      // 3. Overtime Approval
      const otWf = await ApprovalWorkflow.create({
        module: "OVERTIME",
        workflow_name: "Overtime (OT) Sequential Regularization",
        description: "Sequential OT approval: Employee ➔ Reporting Manager ➔ HOD ➔ HR",
        department: "ALL",
        is_active: true,
        allow_auto_skip: true,
        notify_on_each_step: true,
        created_by: "System",
      });

      await ApprovalWorkflowStep.bulkCreate([
        {
          workflow_id: otWf.id,
          level_order: 1,
          level_name: "Reporting Manager Verification",
          approver_type: "REPORTING_MANAGER",
          approver_role: "manager",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: true,
          sla_hours: 24,
        },
        {
          workflow_id: otWf.id,
          level_order: 2,
          level_name: "Department Head Approval",
          approver_type: "HOD",
          approver_role: "hod",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: true,
          sla_hours: 48,
        },
        {
          workflow_id: otWf.id,
          level_order: 3,
          level_name: "HR Payroll Regularization",
          approver_type: "ROLE",
          approver_role: "hr",
          condition_type: "ALWAYS",
          is_mandatory: true,
          can_auto_skip: false,
          sla_hours: 48,
        },
      ]);

      return res.json({
        success: true,
        message: "Default sequential approval workflows restored successfully!",
      });
    } catch (err) {
      console.error("Reset workflows error:", err);
      return res.status(500).json({ error: "Failed to reset workflows" });
    }
  },
};

module.exports = ApprovalController;
