const {
  ApprovalWorkflow,
  ApprovalWorkflowStep,
  ApprovalRequest,
  ApprovalRequestStep,
  Employee,
  Department,
  User,
  Leave,
  LeaveAllocation,
  ExpenseClaim,
  OvertimeTicket,
  LoanAdvance,
  sequelize,
} = require("../config/db");
const { sendRealtimeNotification } = require("../socket");
const { Op } = require("sequelize");

// Helper to pad request number
const generateRequestNumber = async (module) => {
  const prefix = module ? module.substring(0, 3).toUpperCase() : "APP";
  const year = new Date().getFullYear();
  const count = await ApprovalRequest.count();
  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
};

/**
 * Resolve approver details for an employee
 */
const resolveApproverDetails = async (emp, approverType, approverRole, specificEmpId) => {
  let assignedToId = null;
  let assignedToName = null;

  if (approverType === "REPORTING_MANAGER") {
    assignedToId = emp?.reporting_manager_id || null;
    assignedToName = emp?.reporting_manager || "Reporting Manager";

    // If ID is missing, try looking up reporting manager by name
    if (!assignedToId && emp?.reporting_manager && emp.reporting_manager !== "N/A") {
      try {
        const mgr = await Employee.findOne({
          where: {
            [Op.or]: [
              sequelize.where(
                sequelize.fn("CONCAT", sequelize.col("first_name"), " ", sequelize.col("last_name")),
                emp.reporting_manager.trim()
              ),
              { first_name: emp.reporting_manager.trim() },
              { work_email: emp.reporting_manager.trim() },
            ],
          },
        });
        if (mgr) {
          assignedToId = mgr.employee_id;
          assignedToName = `${mgr.first_name || ""} ${mgr.last_name || ""}`.trim();
        }
      } catch (_) {}
    }
  } else if (approverType === "HOD") {
    assignedToId = emp?.hod_id || null;
    assignedToName = emp?.hod_name || "Department Head";

    if (!assignedToId && emp?.dept) {
      try {
        const deptRec = await Department.findOne({
          where: {
            [Op.or]: [
              { dept_name: emp.dept },
              { dept_code: emp.dept },
            ],
          },
        });
        if (deptRec && deptRec.hod_employee_id) {
          assignedToId = deptRec.hod_employee_id;
          assignedToName = deptRec.hod_name || assignedToName;
        }
      } catch (_) {}
    }
  } else if (approverType === "SPECIFIC_USER") {
    assignedToId = specificEmpId || null;
    if (assignedToId) {
      const specific = await Employee.findOne({ where: { employee_id: assignedToId } });
      if (specific) {
        assignedToName = `${specific.first_name || ""} ${specific.last_name || ""}`.trim();
      }
    }
  } else if (approverType === "ROLE") {
    assignedToId = null;
    const roleTitles = {
      hr: "HR Department",
      finance: "Finance & Accounts",
      accounts: "Accounts Department",
      management: "Executive Management",
      director: "Board of Directors",
      admin: "System Administration",
      manager: "Line Manager",
      hod: "Department Head",
    };
    assignedToName = roleTitles[approverRole?.toLowerCase()] || `${approverRole?.toUpperCase()} Team`;
  }

  return { assignedToId, assignedToName };
};

/**
 * Initiate a Sequential Multi-Level Approval Request
 */
const initiateApprovalRequest = async ({
  module,
  entity_id,
  employee_id,
  title,
  description,
  amount = 0,
  days = 0,
  metadata = {},
  created_by = "System",
}) => {
  try {
    const numAmount = parseFloat(amount) || 0;
    const numDays = parseFloat(days) || 0;

    // 1. Fetch employee profile
    const emp = await Employee.findOne({ where: { employee_id } });
    const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : employee_id;
    const empDept = emp?.dept || "General";
    const empDesig = emp?.designation || "Employee";
    const empEmail = emp?.work_email || emp?.email || "";

    // 2. Find matching workflow configuration (scoped to department, or fallback to 'ALL')
    let workflow = await ApprovalWorkflow.findOne({
      where: {
        module,
        is_active: true,
        [Op.or]: [{ department: empDept }, { department: "ALL" }],
      },
      include: [{ model: ApprovalWorkflowStep, as: "steps" }],
      order: [
        ["department", "DESC"], // prefer specific dept over 'ALL'
        [{ model: ApprovalWorkflowStep, as: "steps" }, "level_order", "ASC"],
      ],
    });

    // Fallback: any active workflow for module
    if (!workflow) {
      workflow = await ApprovalWorkflow.findOne({
        where: { module, is_active: true },
        include: [{ model: ApprovalWorkflowStep, as: "steps" }],
        order: [[{ model: ApprovalWorkflowStep, as: "steps" }, "level_order", "ASC"]],
      });
    }

    // 3. Default Step Definitions if no workflow in DB
    let stepDefs = workflow?.steps || [];
    if (!stepDefs || stepDefs.length === 0) {
      if (module === "LEAVE") {
        stepDefs = [
          { level_order: 1, level_name: "Reporting Manager Endorsement", approver_type: "REPORTING_MANAGER", approver_role: "manager", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: true },
          { level_order: 2, level_name: "Department Head (HOD) Approval", approver_type: "HOD", approver_role: "hod", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: true },
          { level_order: 3, level_name: "HR Operations Final Sanction", approver_type: "ROLE", approver_role: "hr", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: false },
        ];
      } else if (module === "EXPENSE_CLAIM") {
        stepDefs = [
          { level_order: 1, level_name: "Line Manager Verification", approver_type: "REPORTING_MANAGER", approver_role: "manager", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: true },
          { level_order: 2, level_name: "Department Head (HOD) Clearance", approver_type: "HOD", approver_role: "hod", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: true },
          { level_order: 3, level_name: "Finance & Accounts Audit", approver_type: "ROLE", approver_role: "finance", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: false },
        ];
      } else {
        stepDefs = [
          { level_order: 1, level_name: "Reporting Manager Review", approver_type: "REPORTING_MANAGER", approver_role: "manager", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: true },
          { level_order: 2, level_name: "Department Head Approval", approver_type: "HOD", approver_role: "hod", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: true },
          { level_order: 3, level_name: "HR Approval & Records", approver_type: "ROLE", approver_role: "hr", condition_type: "ALWAYS", is_mandatory: true, can_auto_skip: false },
        ];
      }
    }

    // 4. Evaluate conditional rules & build sequential request steps
    const plannedSteps = [];
    let orderIndex = 1;

    for (const stepDef of stepDefs) {
      // Evaluate condition
      if (stepDef.condition_type === "AMOUNT_GREATER_THAN" && numAmount <= (stepDef.condition_value || 0)) {
        continue; // skip conditional step
      }
      if (stepDef.condition_type === "DAYS_GREATER_THAN" && numDays <= (stepDef.condition_value || 0)) {
        continue; // skip conditional step
      }

      // Resolve approver
      const { assignedToId, assignedToName } = await resolveApproverDetails(
        emp,
        stepDef.approver_type,
        stepDef.approver_role,
        stepDef.specific_employee_id
      );

      // Check auto-skip (e.g. if applicant is the approver themselves)
      const isSelfApprover = assignedToId && assignedToId.toLowerCase() === employee_id.toLowerCase();
      const shouldAutoSkip = isSelfApprover && (stepDef.can_auto_skip !== false);

      plannedSteps.push({
        level_order: orderIndex++,
        level_name: stepDef.level_name,
        approver_type: stepDef.approver_type,
        approver_role: stepDef.approver_role || null,
        assigned_to_id: assignedToId,
        assigned_to_name: assignedToName,
        status: shouldAutoSkip ? "SKIPPED" : "WAITING",
        decision: shouldAutoSkip ? "AUTO_SKIPPED" : null,
        comments: shouldAutoSkip ? "Auto-skipped: Applicant is the assigned approver for this level" : null,
        action_date: shouldAutoSkip ? new Date() : null,
      });
    }

    // Ensure at least one step exists
    if (plannedSteps.length === 0) {
      plannedSteps.push({
        level_order: 1,
        level_name: "HR Administration Review",
        approver_type: "ROLE",
        approver_role: "hr",
        assigned_to_id: null,
        assigned_to_name: "HR Department",
        status: "WAITING",
      });
    }

    // Find first active (non-skipped) step
    const firstActiveIndex = plannedSteps.findIndex((s) => s.status !== "SKIPPED");
    if (firstActiveIndex >= 0) {
      plannedSteps[firstActiveIndex].status = "PENDING";
    }

    const currentPendingStep = plannedSteps[firstActiveIndex] || plannedSteps[0];
    const isAllAutoSkipped = plannedSteps.every((s) => s.status === "SKIPPED");

    // 5. Create Request and Request Steps in DB
    const requestNumber = await generateRequestNumber(module);

    const appRequest = await ApprovalRequest.create({
      request_number: requestNumber,
      module,
      entity_id: String(entity_id || ""),
      workflow_id: workflow?.id || null,
      employee_id,
      employee_name: empName,
      employee_email: empEmail,
      department: empDept,
      designation: empDesig,
      title: title || `${module} Request`,
      description: description || "",
      amount: numAmount,
      days: numDays,
      total_levels: plannedSteps.length,
      current_level: currentPendingStep.level_order,
      current_level_name: currentPendingStep.level_name,
      current_approver_id: currentPendingStep.assigned_to_id,
      current_approver_name: currentPendingStep.assigned_to_name,
      current_approver_role: currentPendingStep.approver_role,
      status: isAllAutoSkipped ? "APPROVED" : "PENDING",
      final_decision: isAllAutoSkipped ? "APPROVED" : null,
      final_decision_date: isAllAutoSkipped ? new Date() : null,
      metadata: metadata || {},
    });

    const stepRecords = [];
    for (const pStep of plannedSteps) {
      const stepRec = await ApprovalRequestStep.create({
        request_id: appRequest.id,
        level_order: pStep.level_order,
        level_name: pStep.level_name,
        approver_type: pStep.approver_type,
        approver_role: pStep.approver_role,
        assigned_to_id: pStep.assigned_to_id,
        assigned_to_name: pStep.assigned_to_name,
        status: pStep.status,
        decision: pStep.decision,
        comments: pStep.comments,
        action_date: pStep.action_date,
      });
      stepRecords.push(stepRec);
    }

    // 6. Real-time notification to the first pending approver
    if (!isAllAutoSkipped && currentPendingStep) {
      const targetEmpId = currentPendingStep.assigned_to_id;
      const targetRole = currentPendingStep.approver_role || (currentPendingStep.approver_type === "HOD" ? "hod" : "manager");

      sendRealtimeNotification({
        recipient_id: targetEmpId || "ALL",
        recipient_role: targetEmpId ? undefined : targetRole,
        title: `Pending Approval: ${appRequest.title}`,
        message: `${empName} (${empDept}) submitted a ${module.toLowerCase().replace(/_/g, " ")} request. Stage: Level ${currentPendingStep.level_order} - ${currentPendingStep.level_name}.`,
        type: "approval",
        category: "Approvals",
        link: "/approvals",
        priority: "high",
        source_module: module.toLowerCase(),
        created_by: empName,
      }).catch((e) => console.warn("Socket approval notify error:", e.message));
    }

    return {
      request: appRequest,
      steps: stepRecords,
    };
  } catch (err) {
    console.error("Error initiating sequential approval:", err);
    throw err;
  }
};

/**
 * Process Approver Decision (APPROVE / REJECT / CHANGES_REQUESTED)
 */
const processApprovalAction = async ({
  requestId,
  approverUser,
  decision,
  comments = "",
}) => {
  try {
    const validDecisions = ["APPROVE", "REJECT", "CHANGES_REQUESTED"];
    if (!validDecisions.includes(decision)) {
      throw new Error(`Invalid decision '${decision}'. Must be one of: ${validDecisions.join(", ")}`);
    }

    // Load request with steps
    const request = await ApprovalRequest.findByPk(requestId, {
      include: [{ model: ApprovalRequestStep, as: "steps" }],
      order: [[{ model: ApprovalRequestStep, as: "steps" }, "level_order", "ASC"]],
    });

    if (!request) {
      throw new Error("Approval request not found");
    }

    if (request.status !== "PENDING" && request.status !== "CHANGES_REQUESTED") {
      throw new Error(`Request is already ${request.status}. No further actions can be taken.`);
    }

    const steps = request.steps || [];
    const currentStep = steps.find((s) => s.status === "PENDING");

    if (!currentStep) {
      throw new Error("No pending step found for this approval request.");
    }

    // Authorization verification
    const approverEmpId = approverUser?.employee_id || approverUser?.id || "";
    const approverRole = (approverUser?.role || "").toLowerCase().trim();
    const approverName = approverUser?.name || `${approverUser?.first_name || ""} ${approverUser?.last_name || ""}`.trim() || approverEmpId;

    const isAdmin = ["admin", "superadmin", "management", "ceo", "coo"].includes(approverRole);
    let isAuthorized = isAdmin;

    if (!isAuthorized) {
      if (currentStep.assigned_to_id && currentStep.assigned_to_id.toLowerCase() === approverEmpId.toLowerCase()) {
        isAuthorized = true;
      } else if (currentStep.approver_type === "ROLE" && currentStep.approver_role) {
        isAuthorized = approverRole === currentStep.approver_role.toLowerCase() || (currentStep.approver_role === "finance" && ["finance", "accounts"].includes(approverRole));
      } else if (currentStep.approver_type === "HOD" && ["hod", "manager"].includes(approverRole)) {
        isAuthorized = true;
      } else if (currentStep.approver_type === "REPORTING_MANAGER" && ["manager", "teamlead", "hod"].includes(approverRole)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new Error(`You are not authorized to act on Level ${currentStep.level_order} (${currentStep.level_name}). Assigned to: ${currentStep.assigned_to_name || currentStep.approver_role}.`);
    }

    const now = new Date();

    // 1. REJECT DECISION
    if (decision === "REJECT") {
      await currentStep.update({
        status: "REJECTED",
        decision: "REJECTED",
        comments: comments || "Rejected by approver",
        acted_by_id: approverEmpId,
        acted_by_name: approverName,
        acted_by_role: approverRole,
        action_date: now,
      });

      // Mark all remaining waiting steps as CANCELLED
      for (const remainingStep of steps.filter((s) => s.level_order > currentStep.level_order && s.status === "WAITING")) {
        await remainingStep.update({ status: "CANCELLED", decision: "TERMINATED" });
      }

      await request.update({
        status: "REJECTED",
        final_decision: "REJECTED",
        final_decision_date: now,
        final_decision_by: approverName,
        final_remarks: comments || "Rejected",
      });

      // Sync underlying module
      await syncUnderlyingEntityStatus(request.module, request.entity_id, "REJECTED", approverName, comments);

      // Notify employee of rejection
      sendRealtimeNotification({
        recipient_id: request.employee_id,
        title: `${request.title} Rejected ❌`,
        message: `Your request was rejected at Level ${currentStep.level_order} (${currentStep.level_name}) by ${approverName}. Remarks: ${comments || "Not approved"}.`,
        type: "approval",
        category: "Approvals",
        link: request.module === "LEAVE" ? "/leave" : request.module === "EXPENSE_CLAIM" ? "/claims" : "/approvals",
        priority: "high",
        source_module: request.module.toLowerCase(),
        created_by: approverName,
      }).catch((e) => console.warn("Socket rejection notify error:", e.message));

      return {
        success: true,
        message: `Request rejected at Level ${currentStep.level_order} (${currentStep.level_name})`,
        request,
      };
    }

    // 2. CHANGES_REQUESTED DECISION
    if (decision === "CHANGES_REQUESTED") {
      await currentStep.update({
        status: "CHANGES_REQUESTED",
        decision: "CHANGES_REQUESTED",
        comments: comments || "Modifications requested",
        acted_by_id: approverEmpId,
        acted_by_name: approverName,
        acted_by_role: approverRole,
        action_date: now,
      });

      await request.update({
        status: "CHANGES_REQUESTED",
        final_remarks: comments,
      });

      sendRealtimeNotification({
        recipient_id: request.employee_id,
        title: `Modifications Requested: ${request.title} 📝`,
        message: `${approverName} requested changes at Level ${currentStep.level_order}: "${comments}". Please update and resubmit.`,
        type: "approval",
        category: "Approvals",
        link: request.module === "LEAVE" ? "/leave" : request.module === "EXPENSE_CLAIM" ? "/claims" : "/approvals",
        priority: "high",
        source_module: request.module.toLowerCase(),
        created_by: approverName,
      }).catch((e) => console.warn("Socket changes requested notify error:", e.message));

      return {
        success: true,
        message: "Modifications requested from employee",
        request,
      };
    }

    // 3. APPROVE DECISION
    await currentStep.update({
      status: "APPROVED",
      decision: "APPROVED",
      comments: comments || "Approved",
      acted_by_id: approverEmpId,
      acted_by_name: approverName,
      acted_by_role: approverRole,
      action_date: now,
    });

    // Check next sequential step
    const nextStep = steps.find((s) => s.level_order > currentStep.level_order && s.status === "WAITING");

    if (nextStep) {
      // Advance to next step
      await nextStep.update({ status: "PENDING" });

      await request.update({
        current_level: nextStep.level_order,
        current_level_name: nextStep.level_name,
        current_approver_id: nextStep.assigned_to_id,
        current_approver_name: nextStep.assigned_to_name,
        current_approver_role: nextStep.approver_role,
        status: "PENDING",
      });

      // Partial sync for underlying entity (e.g. claim approved by manager)
      if (request.module === "EXPENSE_CLAIM" && currentStep.level_order === 1) {
        try {
          await ExpenseClaim.update(
            { status: "APPROVED_BY_MANAGER", manager_decision: "APPROVED", manager_action_date: now },
            { where: { id: request.entity_id } }
          );
        } catch (_) {}
      }

      // Notify next approver
      const targetEmpId = nextStep.assigned_to_id;
      const targetRole = nextStep.approver_role || (nextStep.approver_type === "HOD" ? "hod" : "manager");

      sendRealtimeNotification({
        recipient_id: targetEmpId || "ALL",
        recipient_role: targetEmpId ? undefined : targetRole,
        title: `Pending Approval: ${request.title}`,
        message: `${request.employee_name} (${request.department}) request endorsed at Level ${currentStep.level_order}. Awaiting your Level ${nextStep.level_order} action (${nextStep.level_name}).`,
        type: "approval",
        category: "Approvals",
        link: "/approvals",
        priority: "high",
        source_module: request.module.toLowerCase(),
        created_by: approverName,
      }).catch((e) => console.warn("Socket next approver notify error:", e.message));

      // Notify employee of progress
      sendRealtimeNotification({
        recipient_id: request.employee_id,
        title: `Approval Progress: ${request.title} ⏩`,
        message: `Level ${currentStep.level_order} (${currentStep.level_name}) approved by ${approverName}. Progressing to Level ${nextStep.level_order} (${nextStep.level_name}).`,
        type: "approval",
        category: "Approvals",
        link: "/approvals",
        priority: "normal",
        source_module: request.module.toLowerCase(),
        created_by: approverName,
      }).catch((e) => console.warn("Socket progress notify error:", e.message));

      return {
        success: true,
        message: `Level ${currentStep.level_order} approved. Routed to Level ${nextStep.level_order} (${nextStep.level_name}).`,
        isFinal: false,
        request,
      };
    } else {
      // All levels successfully completed!
      await request.update({
        status: "APPROVED",
        final_decision: "APPROVED",
        final_decision_date: now,
        final_decision_by: approverName,
        final_remarks: comments || "Fully approved across all sequential levels",
      });

      // Complete underlying module execution
      await syncUnderlyingEntityStatus(request.module, request.entity_id, "APPROVED", approverName, comments);

      // Notify employee of final approval
      sendRealtimeNotification({
        recipient_id: request.employee_id,
        title: `Fully Approved! ${request.title} 🎉`,
        message: `Congratulations! Your request has successfully completed all sequential approval levels and is officially approved.`,
        type: "approval",
        category: "Approvals",
        link: request.module === "LEAVE" ? "/leave" : request.module === "EXPENSE_CLAIM" ? "/claims" : "/approvals",
        priority: "high",
        source_module: request.module.toLowerCase(),
        created_by: approverName,
      }).catch((e) => console.warn("Socket final approval notify error:", e.message));

      return {
        success: true,
        message: "Request successfully approved through all sequential levels!",
        isFinal: true,
        request,
      };
    }
  } catch (err) {
    console.error("Error processing approval action:", err);
    throw err;
  }
};

/**
 * Synchronize final status with underlying business records (Leave, Claim, OT)
 */
const syncUnderlyingEntityStatus = async (module, entityId, decision, approverName, comments) => {
  if (!entityId) return;

  try {
    if (module === "LEAVE") {
      const leave = await Leave.findByPk(entityId);
      if (leave) {
        const isApproved = decision === "APPROVED";
        await leave.update({
          status: isApproved ? "Approved" : "Rejected",
          approver: approverName,
          comments: comments || (isApproved ? "Approved via multi-level workflow" : "Rejected via multi-level workflow"),
        });

        // If approved, update LeaveAllocation balances
        if (isApproved && leave.employee_id) {
          try {
            const year = new Date(leave.start_date).getFullYear();
            const alloc = await LeaveAllocation.findOne({
              where: {
                employee_id: leave.employee_id,
                year,
              },
            });
            if (alloc) {
              const days = parseFloat(leave.total_days) || 1;
              const newUsed = (parseFloat(alloc.used_days) || 0) + days;
              const totalAllocated = (parseFloat(alloc.allocated_days) || 0) + (parseFloat(alloc.carried_forward) || 0);
              const newBalance = Math.max(0, totalAllocated - newUsed);
              await alloc.update({ used_days: newUsed, balance: newBalance });
            }
          } catch (allocErr) {
            console.warn("Could not sync leave allocation on multi-level approval:", allocErr.message);
          }
        }
      }
    } else if (module === "EXPENSE_CLAIM") {
      const claim = await ExpenseClaim.findByPk(entityId);
      if (claim) {
        if (decision === "APPROVED") {
          await claim.update({
            status: "APPROVED_BY_FINANCE",
            approved_amount: claim.total_amount,
            finance_approver_name: approverName,
            finance_action_date: new Date(),
            finance_comments: comments || "Approved via multi-level sequential chain",
          });
        } else {
          await claim.update({
            status: "REJECTED_BY_FINANCE",
            finance_approver_name: approverName,
            finance_action_date: new Date(),
            finance_comments: comments || "Rejected",
          });
        }
      }
    } else if (module === "OVERTIME") {
      const ot = await OvertimeTicket.findByPk(entityId);
      if (ot) {
        await ot.update({
          status: decision === "APPROVED" ? "Approved" : "Rejected",
          manager_approval_name: approverName,
          manager_approval_date: new Date(),
          manager_remarks: comments,
        });
      }
    } else if (module === "LOAN" || module === "SALARY_ADVANCE") {
      const loan = await LoanAdvance.findByPk(entityId);
      if (loan) {
        if (decision === "APPROVED") {
          await loan.update({
            status: "APPROVED",
            finance_id: approverName,
            finance_name: approverName,
            finance_decision: "APPROVED",
            finance_comments: comments || "Approved via multi-level approval chain",
            finance_action_date: new Date(),
          });
        } else {
          await loan.update({
            status: "REJECTED",
            finance_id: approverName,
            finance_name: approverName,
            finance_decision: "REJECTED",
            finance_comments: comments || "Rejected via multi-level approval chain",
            finance_action_date: new Date(),
          });
        }
      }
    }
  } catch (syncErr) {
    console.warn(`Could not sync underlying entity for ${module} ${entityId}:`, syncErr.message);
  }
};

module.exports = {
  generateRequestNumber,
  resolveApproverDetails,
  initiateApprovalRequest,
  processApprovalAction,
  syncUnderlyingEntityStatus,
};
