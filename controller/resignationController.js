const { Resignation, User, Employee } = require("../config/db");
const { Op } = require("sequelize");

const DEFAULT_EXIT_QUESTIONS = [
  {
    id: 1,
    category: "Reason for Leaving",
    question: "What is your primary reason for deciding to leave the organization?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 2,
    category: "Management & Leadership",
    question: "How would you describe your overall experience working with your immediate team lead / manager?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 3,
    category: "Tools & Resources",
    question: "Did you feel you were provided with adequate tools, technology, and training to perform your job effectively?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 4,
    category: "Career Growth",
    question: "How would you rate the opportunities for professional learning, advancement, and skill development provided to you?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 5,
    category: "Company Culture",
    question: "What are your thoughts on the organizational culture, team collaboration, and work environment?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 6,
    category: "Work-Life Balance",
    question: "Did the company support and maintain a fair balance between your work responsibilities and personal life?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 7,
    category: "Compensation & Benefits",
    question: "How satisfied were you with your overall compensation, benefits package, and employee recognition?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 8,
    category: "Role Expectations",
    question: "Were your daily responsibilities, targets, and job expectations clearly communicated throughout your tenure?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 9,
    category: "Key Highlights",
    question: "What did you enjoy the most about working here, and what do you consider your greatest accomplishment?",
    rating: 0,
    answer: "",
    notes: ""
  },
  {
    id: 10,
    category: "Suggestions & Future Rehire",
    question: "What key improvements would you recommend for the management, and would you recommend this company or return in the future?",
    rating: 0,
    answer: "",
    notes: ""
  }
];

const DEFAULT_CLEARANCE_STEPS = [
  {
    id: "dept",
    name: "Department Clearance",
    dept_key: "Department",
    order: 1,
    status: "Pending",
    cleared_by: null,
    cleared_by_name: null,
    cleared_at: null,
    remarks: "",
    is_custom: false,
    checklist: [
      { item: "Project handover completed & signed off", done: false },
      { item: "Source code, credentials & docs transferred", done: false },
      { item: "Department assets returned", done: false }
    ]
  },
  {
    id: "library",
    name: "Library Clearance",
    dept_key: "Library",
    order: 2,
    status: "Pending",
    cleared_by: null,
    cleared_by_name: null,
    cleared_at: null,
    remarks: "",
    is_custom: false,
    checklist: [
      { item: "All borrowed books & journals returned", done: false },
      { item: "Library membership card surrendered", done: false },
      { item: "No library fines or outstanding dues", done: false }
    ]
  },
  {
    id: "it",
    name: "IT Clearance",
    dept_key: "IT",
    order: 3,
    status: "Pending",
    cleared_by: null,
    cleared_by_name: null,
    cleared_at: null,
    remarks: "",
    is_custom: false,
    checklist: [
      { item: "Company laptop, charger & peripherals returned", done: false },
      { item: "Email, Slack & VPN credentials revoked", done: false },
      { item: "Cloud repositories & internal access deactivated", done: false }
    ]
  },
  {
    id: "admin",
    name: "Admin Clearance",
    dept_key: "Admin",
    order: 4,
    status: "Pending",
    cleared_by: null,
    cleared_by_name: null,
    cleared_at: null,
    remarks: "",
    is_custom: false,
    checklist: [
      { item: "Physical ID card & access badge returned", done: false },
      { item: "Desk & drawer keys returned", done: false },
      { item: "Parking pass & company transport tag surrendered", done: false }
    ]
  },
  {
    id: "hr",
    name: "HR Clearance",
    dept_key: "HR",
    order: 5,
    status: "Pending",
    cleared_by: null,
    cleared_by_name: null,
    cleared_at: null,
    remarks: "",
    is_custom: false,
    checklist: [
      { item: "Statutory documents & records verified", done: false },
      { item: "Medical insurance delisting initiated", done: false },
      { item: "Confidentiality & NDA obligations reminded", done: false }
    ]
  },
  {
    id: "accounts",
    name: "Accounts Clearance",
    dept_key: "Accounts",
    order: 6,
    status: "Pending",
    cleared_by: null,
    cleared_by_name: null,
    cleared_at: null,
    remarks: "",
    is_custom: false,
    checklist: [
      { item: "Pending travel & petty cash advances settled", done: false },
      { item: "Pending reimbursements processed", done: false },
      { item: "Full & final salary arrears calculated", done: false }
    ]
  }
];

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

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isClearanceDept = role === "accounts" || role === "payroll" || role === "it" || role === "library" || role === "admin";
      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead";

      if (isHrOrAdmin) {
        // HR/Admin has full oversight of all resignations across all stages
        if (dept && dept !== "All") {
          whereClause.dept = { [Op.iLike]: dept.trim() };
        }
      } else if (isClearanceDept) {
        // Clearance roles need to see clearance in progress or their department's queue
        if (role === "accounts" || role === "payroll") {
          whereClause[Op.or] = [
            { employee_id },
            { clearance_raised: true },
            { dept: { [Op.iLike]: "Accounts" } }
          ];
        } else {
          whereClause[Op.or] = [
            { employee_id },
            { clearance_raised: true },
            { dept: { [Op.iLike]: userDept.trim() } }
          ];
        }
      } else if (isLeadOrManager) {
        const targetDept = (dept && dept !== "All") ? dept : (userDept && userDept !== "Other" && userDept !== "General" ? userDept : null);
        const orConditions = [
          { employee_id },
          { tl_id: employee_id },
          { manager_id: employee_id },
          { hod_id: employee_id },
          { handover_person_id: employee_id }
        ];
        if (targetDept) {
          orConditions.push({ dept: { [Op.iLike]: targetDept.trim() } });
        }
        whereClause[Op.or] = orConditions;
      } else {
        whereClause[Op.or] = [
          { employee_id },
          { handover_person_id: employee_id }
        ];
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

      // Find current active resignation (not cancelled/rejected/withdrawn or latest)
      const active = all.find(r => r.status !== "Cancelled" && r.status !== "Withdrawn" && r.status !== "Rejected") || all[0] || null;

      // Also check if current employee has any pending handovers assigned to them by HOD
      const assignedHandovers = await Resignation.findAll({
        where: {
          handover_person_id: employee_id,
          status: { [Op.notIn]: ["Cancelled", "Rejected", "Separation Completed"] }
        },
        order: [["created_at", "DESC"]]
      });

      return res.json({
        success: true,
        data: {
          active,
          history: all,
          assignedHandovers
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

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead";
      const isClearanceDept = role === "accounts" || role === "payroll" || role === "it" || role === "library" || role === "admin";
      const isHandoverAssignee = record.handover_person_id === employee_id;

      if (record.employee_id !== employee_id && !isHandoverAssignee && !isHrOrAdmin && !isLeadOrManager && !isClearanceDept) {
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
        tl_id: requested_tl_id,
        tl_name: requested_tl_name,
        manager_id: requested_manager_id,
        manager_name: requested_manager_name,
        hod_id: requested_hod_id,
        hod_name: requested_hod_name,
        is_draft
      } = req.body;

      if (!is_draft) {
        if (!last_working_date || !reason) {
          return res.status(400).json({ error: "Last working date and reason for resignation are required" });
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

      const empEmail = user ? (user.work_email || user.email) : (emp ? (emp.work_email || emp.email) : "");
      const empDesig = user ? user.designation : (emp ? emp.designation : "");
      const empJoining = user ? user.joining_date : (emp ? emp.joining_date : null);

      // Resolve Hierarchical Reviewers: TL -> Manager -> HOD -> HR
      let assigned_tl_id = requested_tl_id || null;
      let assigned_tl_name = requested_tl_name || null;
      let assigned_manager_id = requested_manager_id || null;
      let assigned_manager_name = requested_manager_name || null;
      let assigned_hod_id = requested_hod_id || null;
      let assigned_hod_name = requested_hod_name || null;

      // 1. Look up Team Lead (TL) if not explicitly supplied
      if (!assigned_tl_id) {
        const tlUser = await User.findOne({
          where: {
            dept: { [Op.iLike]: empDept.trim() },
            role: "teamlead",
            employee_id: { [Op.ne]: employee_id }
          }
        });
        if (tlUser) {
          assigned_tl_id = tlUser.employee_id;
          assigned_tl_name = tlUser.name;
        }
      }

      // 2. Look up Manager (Reporting Manager) if not explicitly supplied
      if (!assigned_manager_id) {
        const repManagerName = emp?.reporting_manager || user?.reporting_manager;
        if (repManagerName && repManagerName !== "N/A" && repManagerName !== "Admin") {
          const mgrUser = await User.findOne({
            where: {
              name: { [Op.iLike]: repManagerName.trim() },
              employee_id: { [Op.ne]: employee_id }
            }
          });
          if (mgrUser) {
            assigned_manager_id = mgrUser.employee_id;
            assigned_manager_name = mgrUser.name;
          } else {
            assigned_manager_name = repManagerName;
          }
        } else {
          const mgrUser = await User.findOne({
            where: {
              dept: { [Op.iLike]: empDept.trim() },
              role: "manager",
              employee_id: { [Op.ne]: employee_id }
            }
          });
          if (mgrUser) {
            assigned_manager_id = mgrUser.employee_id;
            assigned_manager_name = mgrUser.name;
          }
        }
      }

      // 3. Look up Department Head (HOD)
      if (!assigned_hod_id) {
        const hodUser = await User.findOne({
          where: {
            dept: { [Op.iLike]: empDept.trim() },
            role: "hod",
            employee_id: { [Op.ne]: employee_id }
          }
        });
        if (hodUser) {
          assigned_hod_id = hodUser.employee_id;
          assigned_hod_name = hodUser.name;
        }
      }

      // Determine initial stage in the hierarchical chain:
      // TL (if available) -> Manager (if available) -> HOD (final approval) -> HR
      let initialStatus = "Draft";
      let initialStage = "DRAFT";

      if (!is_draft) {
        if (assigned_tl_id) {
          initialStatus = "Pending TL Review";
          initialStage = "PENDING_TL";
        } else if (assigned_manager_id) {
          initialStatus = "Pending Manager Review";
          initialStage = "PENDING_MANAGER";
        } else if (assigned_hod_id) {
          initialStatus = "Pending HOD Approval";
          initialStage = "PENDING_HOD";
        } else {
          initialStatus = "Pending HR Approval";
          initialStage = "PENDING_HR";
        }
      }

      // Initial Notification Events
      const initialNotifications = [];
      if (!is_draft) {
        // Notification to HR (HR copy & monitoring from day 1)
        initialNotifications.push({
          id: Date.now(),
          target: "HR",
          recipient: "HR Department",
          type: "RESIGNATION_FILED",
          title: "New Resignation Filed (HR Copy)",
          message: `${empName} (${employee_id} - ${empDept}) has submitted a resignation. Current stage: ${initialStatus}. HR copy recorded for monitoring.`,
          created_at: new Date().toISOString()
        });

        // Notification to First Reviewer
        const firstReviewer = assigned_tl_name ? `TL ${assigned_tl_name}` : (assigned_manager_name ? `Manager ${assigned_manager_name}` : "HOD");
        initialNotifications.push({
          id: Date.now() + 1,
          target: assigned_tl_id ? "TL" : (assigned_manager_id ? "MANAGER" : "HOD"),
          recipient: firstReviewer,
          type: "APPROVAL_REQUESTED",
          title: "Resignation Approval Pending Your Review",
          message: `Resignation submitted by ${empName} (${employee_id}) requires your recommendation/approval.`,
          created_at: new Date().toISOString()
        });
      }

      const existingDraft = await Resignation.findOne({
        where: {
          employee_id,
          status: "Draft"
        }
      });

      const payload = {
        employee_id,
        name: empName,
        email: empEmail,
        dept: empDept,
        designation: empDesig,
        joining_date: empJoining,
        last_working_date: last_working_date || new Date().toISOString().split("T")[0],
        notice_period: notice_period || "1 month",
        reason: reason || "Better Career Opportunity",
        reason_details: reason_details || "",
        schedule_exit_interview: false,
        interview_preferred_date: null,
        interview_mode: null,
        handover_status: "NOT_ASSIGNED",
        handover_person_id: null,
        handover_person_name: null,
        handover_target_date: null,
        handover_note: null,
        reassign_items_to_id: null,
        reassign_items_to_name: null,
        email_forwarding_to_id: null,
        email_forwarding_to_name: null,
        ack_claims_expenses: false,
        ack_final_pay: false,
        ack_return_assets: false,
        tl_id: assigned_tl_id,
        tl_name: assigned_tl_name,
        manager_id: assigned_manager_id,
        manager_name: assigned_manager_name,
        hod_id: assigned_hod_id,
        hod_name: assigned_hod_name,
        approval_stage: initialStage,
        status: initialStatus,
        notifications: initialNotifications
      };

      let resignationRecord;
      if (existingDraft) {
        resignationRecord = await existingDraft.update(payload);
      } else {
        resignationRecord = await Resignation.create(payload);
      }

      return res.status(201).json({
        success: true,
        message: is_draft
          ? "Resignation draft saved successfully!"
          : `Resignation submitted successfully! Routed to ${assigned_tl_name ? `TL ${assigned_tl_name}` : (assigned_manager_name ? `Manager ${assigned_manager_name}` : "Department Head")} with HR copy dispatched for live monitoring.`,
        data: resignationRecord
      });
    } catch (err) {
      console.error("Apply resignation error:", err.message);
      return res.status(500).json({ error: "Failed to submit resignation form" });
    }
  },

  // PATCH /api/auth/resignation/:id/tl-action
  async tlReview(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments, recommended_lwd } = req.body;
      const { employee_id, name, role } = req.user;

      const isAuthorized = role === "teamlead" || role === "manager" || role === "hod" || role === "hr" || role === "admin";
      if (!isAuthorized) {
        return res.status(403).json({ error: "Only Team Leads, Managers, or HR can review at the TL stage" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isApproved = decision === "Approved";
      let nextStatus;
      let nextStage;

      if (isApproved) {
        // Move to Manager if available, otherwise directly to HOD
        if (resignation.manager_id || resignation.manager_name) {
          nextStatus = "Pending Manager Review";
          nextStage = "PENDING_MANAGER";
        } else {
          nextStatus = "Pending HOD Approval";
          nextStage = "PENDING_HOD";
        }
      } else {
        nextStatus = "Rejected by TL";
        nextStage = "REJECTED";
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: isApproved ? (resignation.manager_id ? "MANAGER" : "HOD") : "EMPLOYEE",
        recipient: isApproved ? (resignation.manager_name || "Manager") : resignation.name,
        type: "TL_DECISION",
        title: isApproved ? "TL Endorsement - Routed to Manager" : "Resignation Rejected by TL",
        message: isApproved
          ? `Team Lead ${name || "TL"} has approved and recommended ${resignation.name}'s resignation with comments: "${comments || "Recommended"}". Next: ${nextStatus}.`
          : `Team Lead ${name || "TL"} has rejected ${resignation.name}'s resignation. Reason: ${comments || "Not recommended"}`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        status: nextStatus,
        approval_stage: nextStage,
        tl_id: employee_id,
        tl_name: name || "Team Lead",
        tl_decision: decision,
        tl_comments: comments || "",
        tl_action_date: new Date(),
        tl_recommended_lwd: recommended_lwd || resignation.last_working_date,
        notifications
      });

      return res.json({
        success: true,
        message: isApproved
          ? `Resignation endorsed by TL and routed to ${nextStatus}.`
          : "Resignation has been rejected by Team Lead.",
        data: resignation
      });
    } catch (err) {
      console.error("TL review error:", err.message);
      return res.status(500).json({ error: "Failed to process TL review" });
    }
  },

  // PATCH /api/auth/resignation/:id/manager-action
  async managerReview(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments, recommended_lwd } = req.body;
      const { employee_id, name, role } = req.user;

      const isAuthorized = role === "manager" || role === "hod" || role === "teamlead" || role === "hr" || role === "admin";
      if (!isAuthorized) {
        return res.status(403).json({ error: "Only Managers, Department Heads, or HR can review at the Manager stage" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isApproved = decision === "Approved";
      const nextStatus = isApproved ? "Pending HOD Approval" : "Rejected by Manager";
      const nextStage = isApproved ? "PENDING_HOD" : "REJECTED";

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: isApproved ? "HOD" : "EMPLOYEE",
        recipient: isApproved ? (resignation.hod_name || "Department Head") : resignation.name,
        type: "MANAGER_DECISION",
        title: isApproved ? "Manager Endorsement - Routed to HOD" : "Resignation Rejected by Manager",
        message: isApproved
          ? `Manager ${name || "Manager"} has approved ${resignation.name}'s resignation. Forwarded to HOD for final departmental approval.`
          : `Manager ${name || "Manager"} has rejected ${resignation.name}'s resignation. Reason: ${comments || "Not approved"}`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        status: nextStatus,
        approval_stage: nextStage,
        manager_id: employee_id,
        manager_name: name || "Manager",
        manager_decision: decision,
        manager_comments: comments || "",
        manager_action_date: new Date(),
        manager_recommended_lwd: recommended_lwd || resignation.tl_recommended_lwd || resignation.last_working_date,
        notifications
      });

      return res.json({
        success: true,
        message: isApproved
          ? "Resignation recommended and routed to Department Head (HOD) for final department approval."
          : "Resignation has been rejected by Manager.",
        data: resignation
      });
    } catch (err) {
      console.error("Manager review error:", err.message);
      return res.status(500).json({ error: "Failed to process manager review" });
    }
  },

  // PATCH /api/auth/resignation/:id/hod-action
  async hodReview(req, res) {
    try {
      const { id } = req.params;
      const {
        decision,
        comments,
        recommended_lwd,
        handover_person_id,
        handover_person_name,
        handover_target_date,
        handover_note,
        handover_docs_checklist
      } = req.body;
      const { employee_id, name, role } = req.user;

      const isAuthorized = role === "hod" || role === "hr" || role === "admin";
      if (!isAuthorized) {
        return res.status(403).json({ error: "Only Department Heads (HOD) or HR can perform HOD final approval" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isApproved = decision === "Approved";
      let nextStatus = "Rejected by HOD";
      let nextStage = "REJECTED";
      let handoverStatus = "NOT_ASSIGNED";

      if (isApproved) {
        if (!handover_person_id || !handover_person_name) {
          return res.status(400).json({
            error: "Please assign an employee for the handover of the resigned employee's documents and tasks."
          });
        }
        nextStatus = "Pending Handover Completion";
        nextStage = "HANDOVER_IN_PROGRESS";
        handoverStatus = "ASSIGNED";
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      if (isApproved) {
        // 1. Notification to Resigning Employee
        notifications.push({
          id: Date.now(),
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "HOD_HANDOVER_ASSIGNED",
          title: "HOD Approved - Handover Assigned",
          message: `Department Head ${name || "HOD"} has approved your resignation and assigned ${handover_person_name} to take over your documents, projects, and work handover. Please complete your handover documentation.`,
          created_at: new Date().toISOString()
        });

        // 2. Notification to Assigned Handover Employee
        notifications.push({
          id: Date.now() + 1,
          target: "ASSIGNEE",
          recipient: handover_person_name,
          type: "HANDOVER_ASSIGNED_TO_YOU",
          title: "Handover Assigned by Department Head",
          message: `You have been assigned by HOD ${name || "HOD"} to receive documents and work handover from ${resignation.name} (Resignation #${resignation.id}). Please follow up and verify handover completion.`,
          created_at: new Date().toISOString()
        });

        // 3. Notification to HR for live monitoring
        notifications.push({
          id: Date.now() + 2,
          target: "HR",
          recipient: "HR Department",
          type: "HOD_APPROVAL_AND_HANDOVER",
          title: "HOD Approved & Handover Assigned (HR Monitoring)",
          message: `HOD ${name || "HOD"} approved ${resignation.name}'s resignation and assigned ${handover_person_name} for handover. Resignation is pending handover confirmation before final HR approval.`,
          created_at: new Date().toISOString()
        });
      } else {
        notifications.push({
          id: Date.now(),
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "HOD_DECISION",
          title: "Resignation Rejected by HOD",
          message: `Department Head ${name || "HOD"} has rejected ${resignation.name}'s resignation. Reason: ${comments || "Not approved"}`,
          created_at: new Date().toISOString()
        });
      }

      const defaultChecklist = [
        { item: "Project files, repositories & documentation handover", done: false },
        { item: "Client / internal communication & active contacts handover", done: false },
        { item: "Pending tasks & deliverables status documentation", done: false },
        { item: "Access credentials & team physical materials transfer", done: false }
      ];

      await resignation.update({
        status: nextStatus,
        approval_stage: nextStage,
        hod_id: employee_id,
        hod_name: name || "Department Head",
        hod_decision: decision,
        hod_comments: comments || "",
        hod_action_date: new Date(),
        hod_recommended_lwd: recommended_lwd || resignation.manager_recommended_lwd || resignation.last_working_date,
        handover_status: handoverStatus,
        handover_person_id: isApproved ? handover_person_id : null,
        handover_person_name: isApproved ? handover_person_name : null,
        handover_target_date: isApproved ? (handover_target_date || recommended_lwd || resignation.last_working_date) : null,
        handover_note: isApproved ? (handover_note || "") : null,
        handover_assigned_by_id: isApproved ? employee_id : null,
        handover_assigned_by_name: isApproved ? (name || "Department Head") : null,
        handover_assigned_date: isApproved ? new Date() : null,
        handover_docs_checklist: isApproved ? (Array.isArray(handover_docs_checklist) && handover_docs_checklist.length > 0 ? handover_docs_checklist : defaultChecklist) : [],
        notifications
      });

      return res.json({
        success: true,
        message: isApproved
          ? `Department Head approved resignation and assigned handover to ${handover_person_name}! Resignation is now pending handover completion.`
          : "Resignation has been rejected by Department Head.",
        data: resignation
      });
    } catch (err) {
      console.error("HOD review error:", err.message);
      return res.status(500).json({ error: "Failed to process HOD review" });
    }
  },

  // PATCH /api/auth/resignation/:id/submit-handover
  async submitHandover(req, res) {
    try {
      const { id } = req.params;
      const { remarks, checklist } = req.body;
      const { employee_id, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isResigningEmployee = resignation.employee_id === employee_id;

      if (!isResigningEmployee && !isHrOrAdmin) {
        return res.status(403).json({ error: "Only the resigning employee can submit handover documentation" });
      }

      if (resignation.handover_status === "CONFIRMED_BY_ASSIGNEE") {
        return res.status(400).json({ error: "Handover has already been confirmed as completed" });
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "ASSIGNEE",
        recipient: resignation.handover_person_name || "Handover Assignee",
        type: "HANDOVER_SUBMITTED",
        title: "Handover Submitted - Verification Required",
        message: `${resignation.name} has completed and submitted their handover documentation. Please verify and confirm handover completion.`,
        created_at: new Date().toISOString()
      });

      notifications.push({
        id: Date.now() + 1,
        target: "HR",
        recipient: "HR Department",
        type: "HANDOVER_SUBMITTED_HR_MONITOR",
        title: "Handover Submitted (HR Monitoring)",
        message: `${resignation.name} has submitted handover to ${resignation.handover_person_name}. Awaiting confirmation by ${resignation.handover_person_name} before advancing to final HR approval.`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        handover_status: "SUBMITTED_BY_EMPLOYEE",
        handover_employee_remarks: remarks || "Handover documentation completed and submitted",
        handover_employee_completed_at: new Date(),
        handover_docs_checklist: Array.isArray(checklist) ? checklist : resignation.handover_docs_checklist,
        status: "Awaiting Handover Confirmation",
        approval_stage: "HANDOVER_SUBMITTED",
        notifications
      });

      return res.json({
        success: true,
        message: "Handover submitted successfully! Awaiting confirmation from the assigned employee.",
        data: resignation
      });
    } catch (err) {
      console.error("Submit handover error:", err.message);
      return res.status(500).json({ error: "Failed to submit handover" });
    }
  },

  // PATCH /api/auth/resignation/:id/confirm-handover
  async confirmHandover(req, res) {
    try {
      const { id } = req.params;
      const { decision, remarks, checklist } = req.body;
      const { employee_id, name, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isAssignedPerson = resignation.handover_person_id === employee_id;
      const isHOD = role === "hod" || resignation.hod_id === employee_id;

      if (!isAssignedPerson && !isHOD && !isHrOrAdmin) {
        return res.status(403).json({
          error: `Only the HOD-assigned employee (${resignation.handover_person_name || "Assignee"}) or HOD can confirm handover completion.`
        });
      }

      const isConfirmed = decision === "Confirmed";
      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];

      if (isConfirmed) {
        notifications.push({
          id: Date.now(),
          target: "HR",
          recipient: "HR Department",
          type: "HANDOVER_CONFIRMED_READY_FOR_HR",
          title: "Handover Confirmed Complete - Ready for Final HR Sign-off",
          message: `Handover for ${resignation.name} has been verified and confirmed complete by ${name || "Assignee"}. The resignation is now unlocked and awaiting final HR approval.`,
          created_at: new Date().toISOString()
        });

        notifications.push({
          id: Date.now() + 1,
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "HANDOVER_CONFIRMED",
          title: "Handover Confirmed Complete",
          message: `Your handover has been verified and confirmed complete by ${name || "Assignee"}. Your resignation has now advanced to HR for final sign-off.`,
          created_at: new Date().toISOString()
        });

        await resignation.update({
          handover_status: "CONFIRMED_BY_ASSIGNEE",
          handover_assignee_remarks: remarks || "Handover verified and confirmed in full",
          handover_assignee_confirmed_at: new Date(),
          handover_docs_checklist: Array.isArray(checklist) ? checklist : resignation.handover_docs_checklist,
          status: "Pending HR Approval",
          approval_stage: "PENDING_HR",
          notifications
        });

        return res.json({
          success: true,
          message: "Handover confirmed successfully! Resignation has advanced to HR for final sign-off.",
          data: resignation
        });
      } else {
        // Revision requested by assignee
        notifications.push({
          id: Date.now(),
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "HANDOVER_REVISION_REQUESTED",
          title: "Handover Revision Requested",
          message: `${name || "Assignee"} has requested revisions on your handover. Notes: ${remarks || "Please check missing items"}`,
          created_at: new Date().toISOString()
        });

        await resignation.update({
          handover_status: "ASSIGNED",
          handover_assignee_remarks: remarks || "Revision requested",
          status: "Pending Handover Completion",
          approval_stage: "HANDOVER_IN_PROGRESS",
          notifications
        });

        return res.json({
          success: true,
          message: "Handover revision requested. Employee notified to update documents.",
          data: resignation
        });
      }
    } catch (err) {
      console.error("Confirm handover error:", err.message);
      return res.status(500).json({ error: "Failed to confirm handover" });
    }
  },

  // PATCH /api/auth/resignation/:id/hr-action
  async hrReview(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments, confirmed_lwd } = req.body;
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

      // ENFORCE HANDOVER COMPLETION: HR cannot approve until assigned employee confirms handover completion!
      if (isApproved && resignation.handover_status && resignation.handover_status !== "CONFIRMED_BY_ASSIGNEE" && resignation.handover_status !== "NOT_ASSIGNED" && !resignation.clearance_raised) {
        return res.status(400).json({
          error: `Cannot grant final HR approval. The resignation is pending handover confirmation by the assigned employee (${resignation.handover_person_name || "Assignee"}). HR can monitor until confirmation is complete.`
        });
      }

      const finalStatus = isApproved ? "Approved" : "Rejected by HR";
      const finalStage = isApproved ? "HR_APPROVED" : "REJECTED";
      const resolvedLwd = confirmed_lwd || resignation.hod_recommended_lwd || resignation.manager_recommended_lwd || resignation.last_working_date;

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "EMPLOYEE",
        recipient: resignation.name,
        type: "HR_FINAL_DECISION",
        title: isApproved ? "Resignation Approved by HR" : "Resignation Rejected by HR",
        message: isApproved
          ? `HR Head ${name || "HR"} has granted final approval for your resignation! Confirmed Last Working Date: ${resolvedLwd}. HR will now raise the clearance form across serial departments.`
          : `HR Head ${name || "HR"} has rejected your resignation. Reason: ${comments || "Rejected by HR"}`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        status: finalStatus,
        approval_stage: finalStage,
        hr_id: employee_id,
        hr_name: name || "HR Head",
        hr_decision: decision,
        hr_comments: comments || "",
        hr_action_date: new Date(),
        hr_confirmed_lwd: resolvedLwd,
        notifications
      });

      return res.json({
        success: true,
        message: isApproved
          ? "Resignation approved by HR! You can now raise the serial clearance form."
          : "Resignation rejected by HR.",
        data: resignation
      });
    } catch (err) {
      console.error("HR review error:", err.message);
      return res.status(500).json({ error: "Failed to process HR approval" });
    }
  },

  // POST /api/auth/resignation/:id/raise-clearance
  async raiseClearance(req, res) {
    try {
      const { id } = req.params;
      const { custom_departments = [], ordered_departments = [] } = req.body;
      const { employee_id, name, role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (!isHrOrAdmin) {
        return res.status(403).json({ error: "Only HR or Admin can raise the clearance form" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      if (resignation.status !== "Approved" && resignation.approval_stage !== "HR_APPROVED") {
        return res.status(400).json({ error: "Clearance form can only be raised after HR has approved the resignation" });
      }

      // Build serial clearance steps (using HR's custom ordered arrangement if provided)
      let steps = [];
      if (Array.isArray(ordered_departments) && ordered_departments.length > 0) {
        steps = ordered_departments.map((dept, index) => {
          const deptKey = typeof dept === "string" ? dept.trim() : (dept.dept_key || dept.name || `Dept_${index + 1}`).trim();
          const deptId = (typeof dept === "object" && dept.id) ? dept.id : `dept_${deptKey.toLowerCase().replace(/\s+/g, "_")}`;
          const deptName = (typeof dept === "object" && dept.name) ? dept.name : `${deptKey} Clearance`;
          const defaultStep = DEFAULT_CLEARANCE_STEPS.find(s => s.id === deptId || s.dept_key.toLowerCase() === deptKey.toLowerCase());

          return {
            id: deptId,
            name: deptName,
            dept_key: deptKey,
            order: index + 1,
            status: "Pending",
            cleared_by: null,
            cleared_by_name: null,
            cleared_at: null,
            remarks: "",
            is_custom: Boolean(dept.is_custom),
            checklist: (dept.checklist && dept.checklist.length > 0) ? dept.checklist : (defaultStep ? defaultStep.checklist : [
              { item: `${deptKey} assets & physical materials surrendered`, done: false },
              { item: `No dues sign-off from ${deptKey} department`, done: false }
            ])
          };
        });
      } else {
        // Fallback to default steps + custom departments
        steps = JSON.parse(JSON.stringify(DEFAULT_CLEARANCE_STEPS));
        if (resignation.dept) {
          steps[0].name = `${resignation.dept} Department Clearance`;
          steps[0].dept_key = resignation.dept;
        }

        if (Array.isArray(custom_departments) && custom_departments.length > 0) {
          custom_departments.forEach((deptName) => {
            const trimmed = deptName.trim();
            if (trimmed && !steps.some(s => s.dept_key.toLowerCase() === trimmed.toLowerCase())) {
              const nextOrder = steps.length + 1;
              steps.push({
                id: `custom_${trimmed.toLowerCase().replace(/\s+/g, "_")}`,
                name: `${trimmed} Clearance`,
                dept_key: trimmed,
                order: nextOrder,
                status: "Pending",
                cleared_by: null,
                cleared_by_name: null,
                cleared_at: null,
                remarks: "",
                is_custom: true,
                checklist: [
                  { item: `${trimmed} assets & handovers surrendered`, done: false },
                  { item: `No dues clearance from ${trimmed}`, done: false }
                ]
              });
            }
          });
        }
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "CLEARANCE_PIPELINE",
        recipient: steps[0].dept_key,
        type: "CLEARANCE_RAISED",
        title: "Clearance Form Raised - Step 1 Active",
        message: `Clearance form raised by HR ${name || "HR"}. Step 1 (${steps[0].name}) is now ACTIVE in serial order.`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        clearance_raised: true,
        clearance_raised_by: name || "HR",
        clearance_raised_date: new Date(),
        clearance_steps: steps,
        clearance_overall_status: "In Progress",
        approval_stage: "CLEARANCE_IN_PROGRESS",
        status: "Clearance In Progress",
        notifications
      });

      return res.json({
        success: true,
        message: "Clearance form raised successfully! Serial department clearance pipeline initiated.",
        data: resignation
      });
    } catch (err) {
      console.error("Raise clearance error:", err.message);
      return res.status(500).json({ error: "Failed to raise clearance form" });
    }
  },

  // POST /api/auth/resignation/:id/add-clearance-dept
  async addCustomClearanceDept(req, res) {
    try {
      const { id } = req.params;
      const { department_name } = req.body;
      const { name, role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (!isHrOrAdmin) {
        return res.status(403).json({ error: "Only HR or Admin can add custom departments to clearance" });
      }

      if (!department_name || !department_name.trim()) {
        return res.status(400).json({ error: "Department name is required" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const steps = Array.isArray(resignation.clearance_steps) ? [...resignation.clearance_steps] : [];
      const trimmed = department_name.trim();

      if (steps.some(s => s.dept_key.toLowerCase() === trimmed.toLowerCase())) {
        return res.status(400).json({ error: `${trimmed} is already included in the clearance pipeline` });
      }

      const nextOrder = steps.length + 1;
      const newStep = {
        id: `custom_${trimmed.toLowerCase().replace(/\s+/g, "_")}`,
        name: `${trimmed} Clearance`,
        dept_key: trimmed,
        order: nextOrder,
        status: "Pending",
        cleared_by: null,
        cleared_by_name: null,
        cleared_at: null,
        remarks: "",
        is_custom: true,
        checklist: [
          { item: `${trimmed} assets & handovers surrendered`, done: false },
          { item: `No dues clearance from ${trimmed}`, done: false }
        ]
      };

      steps.push(newStep);

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: trimmed,
        recipient: `${trimmed} Department`,
        type: "CUSTOM_DEPT_ADDED",
        title: `Clearance Pipeline: Added ${trimmed}`,
        message: `${trimmed} has been added by HR ${name || "HR"} to the serial clearance pipeline for ${resignation.name}.`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        clearance_steps: steps,
        notifications
      });

      return res.json({
        success: true,
        message: `Department "${trimmed}" added to clearance pipeline successfully!`,
        data: resignation
      });
    } catch (err) {
      console.error("Add custom clearance dept error:", err.message);
      return res.status(500).json({ error: "Failed to add department to clearance" });
    }
  },

  // PATCH /api/auth/resignation/:id/clear-dept
  async clearDepartmentStep(req, res) {
    try {
      const { id } = req.params;
      const { step_id, remarks, checklist } = req.body;
      const { employee_id, name, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (resignation.employee_id === employee_id && !isHrOrAdmin) {
        return res.status(403).json({ error: "Employees cannot clear their own clearance pipeline steps" });
      }

      if (!resignation.clearance_raised || !Array.isArray(resignation.clearance_steps)) {
        return res.status(400).json({ error: "Clearance form has not been raised for this resignation" });
      }

      const steps = [...resignation.clearance_steps];
      const targetIndex = steps.findIndex(s => s.id === step_id || s.order === Number(step_id));

      if (targetIndex === -1) {
        return res.status(404).json({ error: "Clearance step not found in pipeline" });
      }

      const targetStep = steps[targetIndex];

      // SERIAL ORDER CHECK: All previous steps (order < targetStep.order) MUST be Cleared!
      for (let i = 0; i < targetIndex; i++) {
        if (steps[i].status !== "Cleared") {
          return res.status(400).json({
            error: `Serial order violation: Cannot clear "${targetStep.name}" until Step ${steps[i].order} ("${steps[i].name}") is cleared first.`
          });
        }
      }

      // Mark this step as Cleared
      targetStep.status = "Cleared";
      targetStep.cleared_by = employee_id;
      targetStep.cleared_by_name = name || "Authorized Officer";
      targetStep.cleared_at = new Date().toISOString();
      targetStep.remarks = remarks || "Cleared with no outstanding dues";
      if (Array.isArray(checklist)) {
        targetStep.checklist = checklist;
      }

      // Sync legacy boolean columns for backward compatibility
      const legacyUpdates = {};
      if (targetStep.id === "it") legacyUpdates.clearance_it_status = "Cleared";
      if (targetStep.id === "admin") legacyUpdates.clearance_admin_status = "Cleared";
      if (targetStep.id === "hr") legacyUpdates.clearance_hr_status = "Cleared";
      if (targetStep.id === "accounts") legacyUpdates.clearance_finance_status = "Cleared";

      // Check if all steps in the serial chain are now cleared
      const allCleared = steps.every(s => s.status === "Cleared");
      let nextStage = resignation.approval_stage;
      let nextStatus = resignation.status;

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];

      if (allCleared) {
        // As per workflow: After final accounts clearance, flow moves to HR for final clearance & Exit Interview schedule!
        nextStage = "CLEARANCE_COMPLETED";
        nextStatus = "Clearance Completed - Pending Exit Interview";

        notifications.push({
          id: Date.now(),
          target: "HR",
          recipient: "HR Department",
          type: "ALL_CLEARANCES_COMPLETED",
          title: "All Serial Clearances Completed!",
          message: `All department clearances (including Accounts) have been cleared for ${resignation.name}. Workflow has advanced to HR for final clearance & Exit Interview schedule.`,
          created_at: new Date().toISOString()
        });
      } else {
        const nextActiveStep = steps.find(s => s.status === "Pending");
        if (nextActiveStep) {
          notifications.push({
            id: Date.now(),
            target: nextActiveStep.dept_key,
            recipient: `${nextActiveStep.name} Officer`,
            type: "NEXT_STEP_ACTIVE",
            title: `Step ${nextActiveStep.order} Active: ${nextActiveStep.name}`,
            message: `Previous clearance step "${targetStep.name}" was cleared by ${name}. Step ${nextActiveStep.order} (${nextActiveStep.name}) is now ACTIVE in serial order.`,
            created_at: new Date().toISOString()
          });
        }
      }

      await resignation.update({
        clearance_steps: steps,
        clearance_overall_status: allCleared ? "Completed" : "In Progress",
        approval_stage: nextStage,
        status: nextStatus,
        notifications,
        ...legacyUpdates
      });

      return res.json({
        success: true,
        message: allCleared
          ? `Final clearance completed! Flow has moved to HR for final clearance & Exit Interview scheduling.`
          : `Clearance for "${targetStep.name}" marked as Cleared (Green). Next step in serial order unlocked.`,
        data: resignation
      });
    } catch (err) {
      console.error("Clear department step error:", err.message);
      return res.status(500).json({ error: "Failed to process department clearance" });
    }
  },

  // POST /api/auth/resignation/:id/raise-exit-interview
  async raiseExitInterview(req, res) {
    try {
      const { id } = req.params;
      const {
        interview_date,
        interview_time,
        interview_interviewer,
        interview_mode,
        interview_location,
        interview_notes,
        custom_questions
      } = req.body;
      const { name, role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (!isHrOrAdmin) {
        return res.status(403).json({ error: "Only HR or Admin can raise and schedule the exit interview" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const questionsToUse = Array.isArray(custom_questions) && custom_questions.length > 0
        ? custom_questions
        : JSON.parse(JSON.stringify(DEFAULT_EXIT_QUESTIONS));

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "EMPLOYEE",
        recipient: resignation.name,
        type: "EXIT_INTERVIEW_RAISED",
        title: "Exit Interview Form Raised & Scheduled",
        message: `Your Exit Interview has been raised by HR ${name || "HR"}. Scheduled for ${interview_date || "Upcoming"} at ${interview_time || "10:30 AM"}. Mode: ${interview_mode || "In person"}. Please review the 10 questions.`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        exit_interview_raised: true,
        exit_interview_raised_by: name || "HR Head",
        exit_interview_raised_date: new Date(),
        exit_interview_status: "Scheduled",
        exit_interview_date: interview_date || resignation.last_working_date,
        exit_interview_time: interview_time || "11:00 AM",
        exit_interview_interviewer: interview_interviewer || name || "HR Manager",
        exit_interview_mode: interview_mode || "In person",
        exit_interview_location: interview_location || "HR Conference Room / Google Meet",
        exit_interview_notes: interview_notes || "",
        exit_interview_questions: questionsToUse,
        approval_stage: "EXIT_INTERVIEW_SCHEDULED",
        status: "Exit Interview Scheduled",
        notifications
      });

      return res.json({
        success: true,
        message: "Exit Interview Form raised and scheduled successfully! Employee notified with the set of 10 questions.",
        data: resignation
      });
    } catch (err) {
      console.error("Raise exit interview error:", err.message);
      return res.status(500).json({ error: "Failed to raise exit interview" });
    }
  },

  // PATCH /api/auth/resignation/:id/submit-exit-interview
  async submitExitInterview(req, res) {
    try {
      const { id } = req.params;
      const { questions, feedback, completion_notes, mark_completed } = req.body;
      const { name, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (!isHrOrAdmin) {
        return res.status(403).json({ error: "Only HR or Admin can conduct and finalize the exit interview" });
      }

      const isCompleted = mark_completed !== undefined ? !!mark_completed : true;

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      if (isCompleted) {
        notifications.push({
          id: Date.now(),
          target: "ALL",
          recipient: resignation.name,
          type: "SEPARATION_COMPLETED",
          title: "Separation Workflow Fully Completed",
          message: `Exit interview conducted by ${name || "HR"} and 10 questions completed. Final separation concluded.`,
          created_at: new Date().toISOString()
        });
      }

      await resignation.update({
        exit_interview_questions: Array.isArray(questions) ? questions : resignation.exit_interview_questions,
        exit_interview_feedback: feedback || resignation.exit_interview_feedback,
        exit_interview_notes: completion_notes || resignation.exit_interview_notes,
        exit_interview_status: isCompleted ? "Completed" : "Scheduled",
        approval_stage: isCompleted ? "COMPLETED" : resignation.approval_stage,
        status: isCompleted ? "Separation Completed" : resignation.status,
        notifications
      });

      return res.json({
        success: true,
        message: isCompleted
          ? "Exit interview successfully recorded and separation process marked as Completed!"
          : "Exit interview answers saved successfully.",
        data: resignation
      });
    } catch (err) {
      console.error("Submit exit interview error:", err.message);
      return res.status(500).json({ error: "Failed to record exit interview responses" });
    }
  },

  // PATCH /api/auth/resignation/:id/clearance (Legacy compatibility)
  async updateClearance(req, res) {
    try {
      const { id } = req.params;
      const { clearance_it_status, clearance_finance_status, clearance_admin_status, clearance_hr_status } = req.body;

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
        message: "Clearance status updated successfully",
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
      const { employee_id, role, name } = req.user;
      const { reason } = req.body || {};

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (resignation.employee_id !== employee_id && !isHrOrAdmin) {
        return res.status(403).json({ error: "You can only withdraw your own resignation" });
      }

      if (resignation.status === "Approved" || resignation.approval_stage === "COMPLETED") {
        return res.status(400).json({ error: "Approved or completed resignations cannot be cancelled directly. Please contact HR." });
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "HR",
        recipient: "HR Team",
        type: "RESIGNATION_WITHDRAWN",
        title: "Resignation Withdrawn by Employee",
        message: `Resignation submitted by ${resignation.name} (${resignation.employee_id}) has been withdrawn/cancelled. Reason: ${reason || "Withdrawn by employee"}. All active workflows have been terminated.`,
        created_at: new Date().toISOString()
      });

      await resignation.update({
        status: "Withdrawn",
        approval_stage: "CANCELLED",
        withdrawn_at: new Date(),
        withdrawn_by: name || (resignation.employee_id === employee_id ? resignation.name : `HR (${employee_id})`),
        withdrawal_reason: reason || "Withdrawn by employee",
        notifications
      });

      return res.json({
        success: true,
        message: "Resignation withdrawn successfully",
        data: resignation
      });
    } catch (err) {
      console.error("Cancel resignation error:", err.message);
      return res.status(500).json({ error: "Failed to cancel resignation" });
    }
  },

  // GET /api/auth/resignation/employee/:id/history
  async getEmployeeResignationHistory(req, res) {
    try {
      const { id } = req.params; // employee_id
      const { employee_id, role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead";

      if (id !== employee_id && !isHrOrAdmin && !isLeadOrManager) {
        return res.status(403).json({ error: "Unauthorized to view this employee's resignation history" });
      }

      const history = await Resignation.findAll({
        where: { employee_id: id },
        order: [["created_at", "DESC"]]
      });

      return res.json({
        success: true,
        data: history
      });
    } catch (err) {
      console.error("Get employee resignation history error:", err.message);
      return res.status(500).json({ error: "Failed to fetch employee resignation history" });
    }
  }
};

module.exports = ResignationController;
