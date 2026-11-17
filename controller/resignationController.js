const { sequelize, Resignation, User, Employee, Department } = require("../config/db");
const { sendRealtimeNotification } = require("../socket");
const { Op } = require("sequelize");

const isLeadershipUser = (user = {}) => {
  const role = (user.role || "").toLowerCase().trim();
  if (["hod", "manager", "teamlead"].includes(role)) return true;
  const desig = (user.designation || "").toLowerCase().trim();
  return (
    /\b(hod|head|manager|mgr|lead|tl|agm|dgm|gm|director|supervisor)\b/i.test(desig) ||
    desig.includes("team lead") ||
    desig.includes("tech lead") ||
    desig.includes("department head") ||
    desig.includes("head of")
  );
};

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

const DEFAULT_KT_TASKS = [
  {
    id: "kt_codebase_arch",
    title: "System Architecture, Services & Source Repositories",
    category: "Codebase & Systems",
    priority: "High",
    description: "Detailed code walkthrough of all active repositories, architectural diagrams, branching strategies, and CI/CD deployment pipelines.",
    deliverable_url: "",
    due_date: "",
    status: "Pending", // Pending, In Progress, Completed, Blocked
    notes: "",
    completed_at: null
  },
  {
    id: "kt_creds_access",
    title: "Credentials, Secrets & Cloud Access Handoff",
    category: "Credentials & Access",
    priority: "Critical",
    description: "Transfer and rotation of staging/production credentials, cloud infrastructure keys (AWS/GCP), API secret keys, database logins, and third-party SaaS accounts.",
    deliverable_url: "",
    due_date: "",
    status: "Pending",
    notes: "",
    completed_at: null
  },
  {
    id: "kt_runbooks_sop",
    title: "Operational Runbooks, Crons & SOP Documentation",
    category: "Documentation & SOPs",
    priority: "High",
    description: "Documentation of operational procedures, scheduled batch jobs/crons, database backup/recovery routines, and incident troubleshooting runbooks.",
    deliverable_url: "",
    due_date: "",
    status: "Pending",
    notes: "",
    completed_at: null
  },
  {
    id: "kt_client_vendor",
    title: "Key Stakeholders, Clients & Vendor Contacts Handover",
    category: "Client / Vendor Relations",
    priority: "Medium",
    description: "Formal introduction and handoff of external client contacts, vendor accounts, support escalation points, and internal partner communication channels.",
    deliverable_url: "",
    due_date: "",
    status: "Pending",
    notes: "",
    completed_at: null
  },
  {
    id: "kt_inflight_backlog",
    title: "In-Flight Sprint Tasks, Backlog Items & Known Defects",
    category: "In-Flight Tasks & Deliverables",
    priority: "High",
    description: "Status breakdown of active sprint commitments, open pull requests, backlog priority items, pending bug fixes, and critical edge cases.",
    deliverable_url: "",
    due_date: "",
    status: "Pending",
    notes: "",
    completed_at: null
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

// Helper: Populate actual assigned Reporting Manager and HOD for every resignation
// and auto-advance flow to the next consecutive authorized personnel if an approver is not available
async function populateAndAutoAdvanceResignations(records) {
  if (!records || !records.length) return records;
  const isArray = Array.isArray(records);
  const list = isArray ? records : [records];
  const empIds = [...new Set(list.map((r) => r.employee_id).filter(Boolean))];

  const [users, emps, departments] = await Promise.all([
    User.findAll({
      where: { employee_id: { [Op.in]: empIds } },
      attributes: [
        "employee_id",
        "name",
        "dept",
        "reporting_manager_id",
        "reporting_manager",
        "hod_id",
        "hod_name",
        "department_id",
      ],
    }),
    Employee.findAll({
      where: { employee_id: { [Op.in]: empIds } },
      attributes: [
        "employee_id",
        "reporting_manager_id",
        "reporting_manager",
        "hod_id",
        "hod_name",
        "department_id",
      ],
    }),
    Department.findAll({
      attributes: ["id", "dept_name", "dept_code", "hod_employee_id", "hod_name"],
    }),
  ]);

  const userMap = {};
  users.forEach((u) => {
    if (u.employee_id) userMap[u.employee_id.toLowerCase().trim()] = u;
  });

  const empMap = {};
  emps.forEach((e) => {
    if (e.employee_id) empMap[e.employee_id.toLowerCase().trim()] = e;
  });

  const deptById = {};
  const deptByName = {};
  departments.forEach((d) => {
    if (d.id) deptById[d.id] = d;
    if (d.dept_name) deptByName[d.dept_name.toLowerCase().trim()] = d;
  });

  // Collect any referenced supervisor IDs to resolve their actual names
  const extraSupervisorIds = new Set();
  users.forEach((u) => {
    if (u.reporting_manager_id) extraSupervisorIds.add(u.reporting_manager_id);
    if (u.hod_id) extraSupervisorIds.add(u.hod_id);
  });
  emps.forEach((e) => {
    if (e.reporting_manager_id) extraSupervisorIds.add(e.reporting_manager_id);
    if (e.hod_id) extraSupervisorIds.add(e.hod_id);
  });
  departments.forEach((d) => {
    if (d.hod_employee_id) extraSupervisorIds.add(d.hod_employee_id);
  });
  list.forEach((r) => {
    if (r.manager_id) extraSupervisorIds.add(r.manager_id);
    if (r.hod_id) extraSupervisorIds.add(r.hod_id);
  });

  const missingIds = [...extraSupervisorIds].filter((id) => {
    if (!id || typeof id !== "string") return false;
    const clean = id.toLowerCase().trim();
    return clean && clean !== "n/a" && clean !== "none" && !userMap[clean];
  });

  if (missingIds.length > 0) {
    try {
      const allCasedIds = [...new Set([
        ...missingIds,
        ...missingIds.map((i) => i.toUpperCase()),
        ...missingIds.map((i) => i.toLowerCase())
      ])];
      const [extraUsers, extraEmps] = await Promise.all([
        User.findAll({
          where: { employee_id: { [Op.in]: allCasedIds } },
          attributes: ["employee_id", "name", "dept"]
        }),
        Employee.findAll({
          where: { employee_id: { [Op.in]: allCasedIds } },
          attributes: ["employee_id", "first_name", "last_name", "dept"]
        })
      ]);
      extraUsers.forEach((u) => {
        if (u.employee_id) userMap[u.employee_id.toLowerCase().trim()] = u;
      });
      extraEmps.forEach((e) => {
        if (e.employee_id) empMap[e.employee_id.toLowerCase().trim()] = e;
      });
    } catch (_) {}
  }

  const processed = [];

  for (const r of list) {
    const row = typeof r.toJSON === "function" ? r.toJSON() : { ...r };
    const empKey = (row.employee_id || "").toLowerCase().trim();
    const u = userMap[empKey] || {};
    const e = empMap[empKey] || {};

    // 1. Resolve actual assigned reporting manager
    let assignedMgrId = e.reporting_manager_id || u.reporting_manager_id || row.manager_id || null;
    let assignedMgrName = null;

    if (assignedMgrId) {
      const cleanMgrId = assignedMgrId.toLowerCase().trim();
      if (cleanMgrId === "n/a" || cleanMgrId === "none" || cleanMgrId === empKey) {
        assignedMgrId = null;
      } else {
        const mgrUser = userMap[cleanMgrId];
        const mgrEmp = empMap[cleanMgrId];
        if (mgrUser && mgrUser.name) {
          assignedMgrName = mgrUser.name;
        } else if (mgrEmp) {
          assignedMgrName = `${mgrEmp.first_name || ""} ${mgrEmp.last_name || ""}`.trim() || mgrEmp.name;
        } else {
          assignedMgrName = e.reporting_manager || u.reporting_manager || row.manager_name || null;
        }
      }
    } else {
      assignedMgrName = e.reporting_manager || u.reporting_manager || row.manager_name || null;
    }

    if (
      assignedMgrName === "N/A" ||
      assignedMgrName === "None" ||
      assignedMgrName === "Management" ||
      assignedMgrName === "Reporting Manager"
    ) {
      if (!assignedMgrId) assignedMgrName = null;
    }

    // 2. Resolve actual assigned Department Head (HOD)
    let assignedHodId = e.hod_id || u.hod_id || row.hod_id || null;
    let assignedHodName = null;

    const deptId = e.department_id || u.department_id;
    const dRec = deptById[deptId] || deptByName[(row.dept || "").toLowerCase().trim()] || null;
    if (!assignedHodId && dRec && dRec.hod_employee_id) {
      assignedHodId = dRec.hod_employee_id;
    }

    if (assignedHodId) {
      const cleanHodId = assignedHodId.toLowerCase().trim();
      if (cleanHodId === "n/a" || cleanHodId === "none" || cleanHodId === empKey) {
        assignedHodId = null;
      } else {
        const hodUser = userMap[cleanHodId];
        const hodEmp = empMap[cleanHodId];
        if (hodUser && hodUser.name) {
          assignedHodName = hodUser.name;
        } else if (hodEmp) {
          assignedHodName = `${hodEmp.first_name || ""} ${hodEmp.last_name || ""}`.trim() || hodEmp.name;
        } else if (dRec && dRec.hod_name) {
          assignedHodName = dRec.hod_name;
        } else {
          assignedHodName = e.hod_name || u.hod_name || row.hod_name || null;
        }
      }
    } else {
      assignedHodName = e.hod_name || u.hod_name || row.hod_name || null;
    }

    if (assignedHodName === "Department Head" && !assignedHodId) {
      assignedHodName = null;
    }

    // Set assigned supervisors on row
    row.assigned_manager_id = assignedMgrId;
    row.assigned_manager_name = assignedMgrName;
    row.assigned_hod_id = assignedHodId;
    row.assigned_hod_name = assignedHodName;

    let needUpdate = false;
    const updateFields = {};

    // Synchronize row and DB with the REAL assigned manager name & ID
    if (assignedMgrId) {
      if (row.manager_id !== assignedMgrId || row.manager_name !== assignedMgrName) {
        row.manager_id = assignedMgrId;
        row.manager_name = assignedMgrName;
        updateFields.manager_id = assignedMgrId;
        updateFields.manager_name = assignedMgrName;
        needUpdate = true;
      }
    } else {
      if (row.manager_id !== null) {
        row.manager_id = null;
        updateFields.manager_id = null;
        needUpdate = true;
      }
      row.manager_name = assignedMgrName;
    }

    // Synchronize row and DB with the REAL assigned HOD name & ID
    if (assignedHodId) {
      if (row.hod_id !== assignedHodId || row.hod_name !== assignedHodName) {
        row.hod_id = assignedHodId;
        row.hod_name = assignedHodName;
        updateFields.hod_id = assignedHodId;
        updateFields.hod_name = assignedHodName;
        needUpdate = true;
      }
    } else {
      if (row.hod_id !== null) {
        row.hod_id = null;
        updateFields.hod_id = null;
        needUpdate = true;
      }
      row.hod_name = assignedHodName;
    }

    // If waiting for Manager, but employee has NO assigned manager:
    if (
      row.status === "Pending Manager Review" &&
      (!assignedMgrId || assignedMgrId.toLowerCase() === empKey)
    ) {
      if (assignedHodId && assignedHodId.toLowerCase() !== empKey) {
        row.status = "Pending HOD Approval";
        row.approval_stage = "PENDING_HOD";
        updateFields.status = "Pending HOD Approval";
        updateFields.approval_stage = "PENDING_HOD";
        updateFields.manager_decision = "Bypassed";
        updateFields.manager_comments = "Bypassed directly to HOD (No reporting manager assigned)";
        needUpdate = true;
      } else {
        row.status = "Pending HR Approval";
        row.approval_stage = "PENDING_HR";
        updateFields.status = "Pending HR Approval";
        updateFields.approval_stage = "PENDING_HR";
        updateFields.manager_decision = "Bypassed";
        updateFields.hod_decision = "Bypassed";
        updateFields.manager_comments = "Bypassed directly to HR (No reporting manager assigned)";
        updateFields.hod_comments = "Bypassed directly to HR (No HOD assigned)";
        needUpdate = true;
      }
    }
    // If waiting for HOD, but employee has NO assigned HOD:
    else if (
      row.status === "Pending HOD Approval" &&
      (!assignedHodId || assignedHodId.toLowerCase() === empKey)
    ) {
      row.status = "Pending HR Approval";
      row.approval_stage = "PENDING_HR";
      updateFields.status = "Pending HR Approval";
      updateFields.approval_stage = "PENDING_HR";
      updateFields.hod_decision = "Bypassed";
      updateFields.hod_comments = "Bypassed directly to HR (No HOD assigned)";
      needUpdate = true;
    }

    if (needUpdate && r.update) {
      try {
        await r.update(updateFields);
      } catch (_) {}
    }

    processed.push(row);
  }

  return isArray ? processed : processed[0];
}

// Helper: Verify if user belongs to the respective department of a serial clearance step
function isUserAuthorizedForDeptStep(step, resignation, user) {
  if (!step || !resignation || !user) return false;

  const userEmpId = String(user.employee_id || user.id || "").trim().toLowerCase();
  const resigningEmpId = String(resignation.employee_id || "").trim().toLowerCase();
  const userNameClean = String(user.name || "").trim().toLowerCase();

  // 1. Resigning employee can never clear their own pipeline steps
  if (userEmpId && resigningEmpId && userEmpId === resigningEmpId) {
    return false;
  }

  // 2. CRITICAL PREVENT CROSS-CLEARANCE:
  // A person from one department who already cleared a different step cannot clear subsequent steps!
  // E.g. If Tech manager cleared Tech clearance, they cannot clear Admin, HR, Accounts, etc.
  const steps = Array.isArray(resignation.clearance_steps) ? resignation.clearance_steps : [];
  const hasClearedOtherStep = steps.some(
    (s) => (s.id !== step.id && s.order !== step.order) && (
      (s.cleared_by && String(s.cleared_by).trim().toLowerCase() === userEmpId) ||
      (s.cleared_by_name && userNameClean && String(s.cleared_by_name).trim().toLowerCase() === userNameClean)
    )
  );

  const assignedEmpId = String(step.assigned_emp_id || "").trim().toLowerCase();
  if (hasClearedOtherStep && (!assignedEmpId || assignedEmpId !== userEmpId)) {
    return false;
  }

  // 3. Specific employee assigned by HR (mapped by employee ID)
  // If an approver is explicitly assigned, ONLY that employee ID is authorized!
  // HR and other departments cannot give clearance on their behalf.
  if (assignedEmpId) {
    return userEmpId === assignedEmpId;
  }

  // 4. Fallback: If no specific employee was mapped, verify STRICT department membership
  // Note: Software role 'admin' is superuser authorization in HRMS, NOT physical Admin & Facilities!
  const userRole = String(user.role || user.job_role || "").trim().toLowerCase();
  const userDept = String(user.dept || user.department || "").trim().toLowerCase();
  const userDesig = String(user.designation || "").trim().toLowerCase();
  const stepId = String(step.id || "").trim().toLowerCase();
  const stepDeptKey = String(step.dept_key || "").trim().toLowerCase();
  const stepName = String(step.name || "").trim().toLowerCase();
  const resDept = String(resignation.dept || "").trim().toLowerCase();
  const resMgrId = String(resignation.manager_id || resignation.reporting_manager_id || "").trim().toLowerCase();
  const resHodId = String(resignation.hod_id || "").trim().toLowerCase();

  const matchDept = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1 === d2 || d1.includes(d2) || d2.includes(d1);
  };

  // Home Department Step (e.g. "IT Department Clearance" or step.id === "dept")
  const isHomeDeptStep = stepId === "dept" ||
                         (resDept && (matchDept(stepDeptKey, resDept) || matchDept(stepName, resDept)));
  if (isHomeDeptStep) {
    if (resHodId && userEmpId === resHodId) return true;
    if (resMgrId && userEmpId === resMgrId) return true;
    if (resDept && matchDept(userDept, resDept)) return true;
    return false;
  }

  // Admin / Facilities Clearance Step
  // Physical office administration, facilities, desk keys, access cards.
  // Tech / Software engineering personnel must NEVER be authorized for Admin clearance!
  const isAdminStep = stepId === "admin" || stepDeptKey.includes("admin") || stepDeptKey.includes("facilities") || stepName.includes("admin");
  if (isAdminStep) {
    if (userDept.includes("tech") || userDept.includes("engineer") || userDept.includes("develop") || userDept.includes("software")) {
      return false;
    }
    if (userDept.includes("admin") || userDept.includes("facilities") || userDept.includes("operations") || userDesig.includes("admin") || userDesig.includes("facilities")) {
      return true;
    }
    return false;
  }

  // HR / Human Resources Clearance Step
  const isHrStep = stepId === "hr" || stepDeptKey === "hr" || stepDeptKey.includes("human") || stepName.includes("hr clearance") || stepName.includes("human resources");
  if (isHrStep) {
    if (userDept.includes("tech") || userDept.includes("engineer") || userDept.includes("develop")) {
      return false;
    }
    if (userRole === "hr" || userRole === "hrmanager" || userRole === "chro" || userDept.includes("hr") || userDept.includes("human") || userDesig.includes("hr") || userDesig.includes("chro")) {
      return true;
    }
    return false;
  }

  // Accounts / Finance Clearance Step
  const isAccountsStep = stepId === "accounts" || stepDeptKey.includes("account") || stepDeptKey.includes("finance") || stepDeptKey.includes("payroll") || stepName.includes("accounts");
  if (isAccountsStep) {
    if (userDept.includes("tech") || userDept.includes("engineer") || userDept.includes("develop")) {
      return false;
    }
    if (userRole === "accounts" || userRole === "finance" || userRole === "payroll" || userDept.includes("account") || userDept.includes("finance") || userDept.includes("payroll") || userDesig.includes("account") || userDesig.includes("finance") || userDesig.includes("payroll")) {
      return true;
    }
    return false;
  }

  // IT Clearance Step (hardware, system credentials, laptops)
  const isItStep = stepId === "it" || stepDeptKey === "it" || stepDeptKey.includes("information tech") || stepName.includes("it clearance");
  if (isItStep) {
    if (userRole === "it" || userDept.includes("it") || userDept.includes("information tech") || userDesig.includes("it ") || userDesig.includes("network") || userDesig.includes("system admin")) {
      return true;
    }
    return false;
  }

  // Custom Department Step (e.g. Library, Legal, etc.)
  if (stepDeptKey && userDept && matchDept(userDept, stepDeptKey)) {
    return true;
  }

  return false;
}

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
      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead" || isLeadershipUser(req.user);

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
        const empIdClean = (employee_id || "").trim();
        const orConditions = [
          { employee_id: { [Op.iLike]: empIdClean } },
          { tl_id: { [Op.iLike]: empIdClean } },
          { manager_id: { [Op.iLike]: empIdClean } },
          { hod_id: { [Op.iLike]: empIdClean } },
          { handover_person_id: { [Op.iLike]: empIdClean } }
        ];
        if (targetDept) {
          orConditions.push({ dept: { [Op.iLike]: targetDept.trim() } });
        }
        whereClause[Op.or] = orConditions;
      } else {
        const empIdClean = (employee_id || "").trim();
        whereClause[Op.or] = [
          { employee_id: { [Op.iLike]: empIdClean } },
          { handover_person_id: { [Op.iLike]: empIdClean } }
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

      const populated = await populateAndAutoAdvanceResignations(resignations);

      return res.json({ success: true, data: populated });
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
      const empIdClean = (employee_id || "").trim();
      const assignedHandovers = await Resignation.findAll({
        where: {
          handover_person_id: { [Op.iLike]: empIdClean },
          status: { [Op.notIn]: ["Cancelled", "Rejected", "Separation Completed"] }
        },
        order: [["created_at", "DESC"]]
      });

      const populatedActive = active ? (await populateAndAutoAdvanceResignations([active]))[0] : null;
      const populatedHistory = await populateAndAutoAdvanceResignations(all);

      return res.json({
        success: true,
        data: {
          active: populatedActive,
          history: populatedHistory,
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
      const isLeadOrManager = role === "hod" || role === "manager" || role === "teamlead" || isLeadershipUser(req.user);
      const isClearanceDept = role === "accounts" || role === "payroll" || role === "it" || role === "library" || role === "admin";
      const isHandoverAssignee = record.handover_person_id === employee_id;

      if (record.employee_id !== employee_id && !isHandoverAssignee && !isHrOrAdmin && !isLeadOrManager && !isClearanceDept) {
        return res.status(403).json({ error: "Unauthorized to view this resignation record" });
      }

      const populated = await populateAndAutoAdvanceResignations([record]);
      return res.json({ success: true, data: populated[0] });
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

      // 2. Look up Manager (Reporting Manager) if not explicitly supplied or resolve true name
      if (!assigned_manager_id) {
        const repManagerId = emp?.reporting_manager_id || user?.reporting_manager_id;
        if (repManagerId && repManagerId.toLowerCase() !== employee_id.toLowerCase() && repManagerId !== "N/A" && repManagerId !== "None") {
          assigned_manager_id = repManagerId.trim();
        } else {
          const repManagerName = emp?.reporting_manager || user?.reporting_manager;
          if (repManagerName && repManagerName !== "N/A" && repManagerName !== "Admin" && repManagerName !== "Management" && repManagerName !== "None") {
            const mgrUser = await User.findOne({
              where: {
                name: { [Op.iLike]: repManagerName.trim() },
                employee_id: { [Op.ne]: employee_id }
              }
            });
            if (mgrUser) {
              assigned_manager_id = mgrUser.employee_id;
              assigned_manager_name = mgrUser.name;
            }
          }
        }
      }

      if (assigned_manager_id) {
        try {
          const mgrUser = await User.findOne({
            where: { employee_id: { [Op.iLike]: assigned_manager_id.trim() } }
          });
          if (mgrUser) {
            assigned_manager_id = mgrUser.employee_id;
            assigned_manager_name = mgrUser.name;
          } else {
            const mgrEmp = await Employee.findOne({
              where: { employee_id: { [Op.iLike]: assigned_manager_id.trim() } }
            });
            if (mgrEmp) {
              assigned_manager_id = mgrEmp.employee_id;
              assigned_manager_name = `${mgrEmp.first_name || ""} ${mgrEmp.last_name || ""}`.trim() || mgrEmp.name;
            }
          }
        } catch (_) {}
      }

      // 3. Look up Department Head (HOD)
      if (!assigned_hod_id) {
        const hodEmpId = emp?.hod_id || user?.hod_id;
        if (hodEmpId && hodEmpId.toLowerCase() !== employee_id.toLowerCase() && hodEmpId !== "N/A" && hodEmpId !== "None") {
          assigned_hod_id = hodEmpId.trim();
        } else {
          if (emp?.department_id || user?.department_id) {
            try {
              const dRec = await Department.findByPk(emp?.department_id || user?.department_id);
              if (dRec && dRec.hod_employee_id) {
                assigned_hod_id = dRec.hod_employee_id.trim();
                assigned_hod_name = dRec.hod_name || null;
              }
            } catch (_) {}
          }
          if (!assigned_hod_id) {
            const repHodName = emp?.hod_name || user?.hod_name;
            if (repHodName && repHodName !== "Department Head" && repHodName !== "N/A" && repHodName !== "None") {
              const hodUser = await User.findOne({
                where: {
                  name: { [Op.iLike]: repHodName.trim() },
                  employee_id: { [Op.ne]: employee_id }
                }
              });
              if (hodUser) {
                assigned_hod_id = hodUser.employee_id;
                assigned_hod_name = hodUser.name;
              } else {
                assigned_hod_name = repHodName;
              }
            }
          }
        }
      }

      if (assigned_hod_id) {
        try {
          const hodUser = await User.findOne({
            where: { employee_id: { [Op.iLike]: assigned_hod_id.trim() } }
          });
          if (hodUser) {
            assigned_hod_id = hodUser.employee_id;
            assigned_hod_name = hodUser.name;
          } else {
            const hodEmp = await Employee.findOne({
              where: { employee_id: { [Op.iLike]: assigned_hod_id.trim() } }
            });
            if (hodEmp) {
              assigned_hod_id = hodEmp.employee_id;
              assigned_hod_name = `${hodEmp.first_name || ""} ${hodEmp.last_name || ""}`.trim() || hodEmp.name;
            }
          }
        } catch (_) {}
      }

      // Determine initial stage in the hierarchical chain:
      // TL (if available) -> Manager (if available) -> HOD (if available) -> HR
      let initialStatus = "Draft";
      let initialStage = "DRAFT";
      let managerDecision = null;
      let managerComments = null;
      let hodDecision = null;
      let hodComments = null;

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
          managerDecision = "Bypassed";
          managerComments = "Bypassed directly to HOD (No reporting manager assigned)";
        } else {
          initialStatus = "Pending HR Approval";
          initialStage = "PENDING_HR";
          managerDecision = "Bypassed";
          managerComments = "Bypassed directly to HR (No reporting manager assigned)";
          hodDecision = "Bypassed";
          hodComments = "Bypassed directly to HR (No Department Head assigned)";
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
        manager_decision: managerDecision,
        manager_comments: managerComments,
        hod_id: assigned_hod_id,
        hod_name: assigned_hod_name,
        hod_decision: hodDecision,
        hod_comments: hodComments,
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

      let routedToMsg = "HR Department";
      if (initialStatus === "Pending TL Review") routedToMsg = `TL ${assigned_tl_name || "Team Lead"}`;
      else if (initialStatus === "Pending Manager Review") routedToMsg = `Manager ${assigned_manager_name || "Reporting Manager"}`;
      else if (initialStatus === "Pending HOD Approval") routedToMsg = `Department Head ${assigned_hod_name || "HOD"}`;

      if (!is_draft) {
        const targetApproverId = assigned_manager_id || assigned_tl_id || assigned_hod_id;
        if (targetApproverId) {
          sendRealtimeNotification({
            recipient_id: targetApproverId,
            title: "New Resignation Notice Submitted",
            message: `${empName || employee_id} (${dept}) submitted resignation notice. Reason: ${reason || "Career transition"}.`,
            type: "resignation",
            category: "Resignation",
            link: "/resignation",
            priority: "high",
            source_module: "resignation",
            created_by: empName || employee_id,
          }).catch((e) => console.warn("Socket resignation notify error:", e.message));
        }

        // Also notify HR
        sendRealtimeNotification({
          recipient_role: "hr",
          title: `Resignation Notice: ${empName || employee_id}`,
          message: `${empName || employee_id} (${dept}) submitted resignation notice. Target: ${routedToMsg}.`,
          type: "resignation",
          category: "Resignation",
          link: "/resignation",
          priority: "high",
          source_module: "resignation",
          created_by: empName || employee_id,
        }).catch((e) => console.warn("Socket resignation HR notify error:", e.message));
      }

      return res.status(201).json({
        success: true,
        message: is_draft
          ? "Resignation draft saved successfully!"
          : `Resignation submitted successfully! Routed to ${routedToMsg} with HR copy dispatched for live monitoring.`,
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

      const isAuthorized = role === "teamlead" || role === "manager" || role === "hod" || role === "hr" || role === "admin" || isLeadershipUser(req.user);
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
        // Move to Manager if available, otherwise consecutive fallback directly to HOD or HR
        if (resignation.manager_id && resignation.manager_id !== "N/A" && resignation.manager_id !== "None") {
          nextStatus = "Pending Manager Review";
          nextStage = "PENDING_MANAGER";
        } else if (resignation.hod_id && resignation.hod_id !== "N/A" && resignation.hod_id !== "None") {
          nextStatus = "Pending HOD Approval";
          nextStage = "PENDING_HOD";
        } else {
          nextStatus = "Pending HR Approval";
          nextStage = "PENDING_HR";
        }
      } else {
        nextStatus = "Rejected by TL";
        nextStage = "REJECTED";
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: isApproved ? (nextStage === "PENDING_MANAGER" ? "MANAGER" : (nextStage === "PENDING_HOD" ? "HOD" : "HR")) : "EMPLOYEE",
        recipient: isApproved ? (resignation.manager_name || resignation.hod_name || "HR Department") : resignation.name,
        type: "TL_DECISION",
        title: isApproved ? `TL Endorsement - Routed to ${nextStatus}` : "Resignation Rejected by TL",
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

      const isAuthorized = role === "manager" || role === "hod" || role === "teamlead" || role === "hr" || role === "admin" || isLeadershipUser(req.user);
      if (!isAuthorized) {
        return res.status(403).json({ error: "Only Managers, Department Heads, or HR can review at the Manager stage" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isApproved = decision === "Approved";
      let nextStatus;
      let nextStage;
      let extraUpdate = {};

      if (isApproved) {
        // If HOD is available, route to HOD; otherwise consecutive fallback directly to HR
        const hasHod = resignation.hod_id && resignation.hod_id !== "N/A" && resignation.hod_id !== "None";
        if (hasHod) {
          nextStatus = "Pending HOD Approval";
          nextStage = "PENDING_HOD";
        } else {
          nextStatus = "Pending HR Approval";
          nextStage = "PENDING_HR";
          extraUpdate = {
            hod_decision: "Bypassed",
            hod_comments: "Bypassed directly to HR (No Department Head assigned)"
          };
        }
      } else {
        nextStatus = "Rejected by Manager";
        nextStage = "REJECTED";
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: isApproved ? (nextStage === "PENDING_HR" ? "HR" : "HOD") : "EMPLOYEE",
        recipient: isApproved ? (nextStage === "PENDING_HR" ? "HR Department" : (resignation.hod_name || "Department Head")) : resignation.name,
        type: "MANAGER_DECISION",
        title: isApproved ? `Manager Endorsement - Routed to ${nextStatus}` : "Resignation Rejected by Manager",
        message: isApproved
          ? `Manager ${name || "Manager"} has approved ${resignation.name}'s resignation. Next stage: ${nextStatus}.`
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
        ...extraUpdate,
        notifications
      });

      // Send real-time notification to employee and HOD
      sendRealtimeNotification({
        recipient_id: resignation.employee_id,
        title: isApproved ? "Resignation Endorsed by Manager" : "Resignation Rejected by Manager",
        message: isApproved
          ? `Manager ${name || "Manager"} approved your resignation notice. Next stage: ${nextStatus}.`
          : `Manager ${name || "Manager"} rejected your resignation notice. Reason: ${comments || "Not approved"}.`,
        type: "resignation",
        category: "Resignation",
        link: "/resignation",
        priority: isApproved ? "normal" : "high",
        source_module: "resignation",
        created_by: name || "Manager",
      }).catch((e) => console.warn("Socket manager review notify error:", e.message));

      return res.json({
        success: true,
        message: isApproved
          ? `Resignation recommended and routed to ${nextStatus}.`
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

      const isAuthorized = role === "hod" || role === "hr" || role === "admin" || isLeadershipUser(req.user);
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

      // Send real-time notification to employee
      sendRealtimeNotification({
        recipient_id: resignation.employee_id,
        title: isApproved ? "Resignation Approved by Department Head" : "Resignation Rejected by HOD",
        message: isApproved
          ? `HOD ${name || "HOD"} approved your resignation notice. Handover assigned to ${handover_person_name || "team member"}.`
          : `HOD ${name || "HOD"} rejected your resignation notice. Reason: ${comments || "Not approved"}.`,
        type: "resignation",
        category: "Resignation",
        link: "/resignation",
        priority: isApproved ? "normal" : "high",
        source_module: "resignation",
        created_by: name || "HOD",
      }).catch((e) => console.warn("Socket HOD review notify error:", e.message));

      if (isApproved && handover_person_id) {
        // Notify handover assignee
        sendRealtimeNotification({
          recipient_id: handover_person_id,
          title: "New Handover Assignment",
          message: `You have been assigned handover responsibilities for ${resignation.name}'s resignation transition.`,
          type: "resignation",
          category: "Resignation",
          link: "/resignation",
          priority: "high",
          source_module: "resignation",
          created_by: name || "HOD",
        }).catch((e) => console.warn("Socket handover notify error:", e.message));
      }

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
      const userCodeClean = (employee_id || "").trim().toLowerCase();
      const isAssignedPerson = resignation.handover_person_id && (resignation.handover_person_id.trim().toLowerCase() === userCodeClean);
      const isHOD = role === "hod" || (resignation.hod_id && resignation.hod_id.trim().toLowerCase() === userCodeClean);
      const isManager = resignation.manager_id && (resignation.manager_id.trim().toLowerCase() === userCodeClean);

      if (!isAssignedPerson && !isHOD && !isManager && !isHrOrAdmin) {
        return res.status(403).json({
          error: `Only the HOD-assigned team lead, manager, or colleague (${resignation.handover_person_name || "Assignee"}), reporting manager, or HOD can confirm handover completion.`
        });
      }

      const isConfirmed = decision === "Confirmed";
      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];

      if (isConfirmed) {
        notifications.push({
          id: Date.now(),
          target: "ADMIN",
          recipient: "Admin Office",
          type: "HANDOVER_CONFIRMED_READY_FOR_ADMIN",
          title: "Handover Confirmed Complete - Ready for Admin Sign-off",
          message: `Handover for ${resignation.name} has been verified and confirmed complete by ${name || "Assignee"}. The resignation is now awaiting Admin Operations & Kit/Facilities sign-off.`,
          created_at: new Date().toISOString()
        });

        notifications.push({
          id: Date.now() + 1,
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "HANDOVER_CONFIRMED",
          title: "Handover Confirmed Complete",
          message: `Your handover has been verified and confirmed complete by ${name || "Assignee"}. Your resignation has now advanced to Admin Operations for kit, facilities and tasks sign-off.`,
          created_at: new Date().toISOString()
        });

        await resignation.update({
          handover_status: "CONFIRMED_BY_ASSIGNEE",
          handover_assignee_remarks: remarks || "Handover verified and confirmed in full",
          handover_assignee_confirmed_at: new Date(),
          handover_docs_checklist: Array.isArray(checklist) ? checklist : resignation.handover_docs_checklist,
          status: "Pending Admin Approval",
          approval_stage: "PENDING_ADMIN",
          notifications
        });

        return res.json({
          success: true,
          message: "Handover confirmed successfully! Resignation has advanced to Admin for Operations & Kit sign-off.",
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

  // PATCH /api/auth/resignation/:id/admin-action
  async adminReview(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments } = req.body;
      const { employee_id, name, role } = req.user;

      const isAdminOrHr = role === "admin" || role === "hr" || role === "hrmanager";
      if (!isAdminOrHr) {
        return res.status(403).json({ error: "Only Admin (Operations) or HR can perform Admin approval" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const isApproved = decision === "Approved";
      const nextStatus = isApproved ? "Pending HR Approval" : "Rejected by Admin";
      const nextStage = isApproved ? "PENDING_HR" : "REJECTED";

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      if (isApproved) {
        notifications.push({
          id: Date.now(),
          target: "HR",
          recipient: "HR Department",
          type: "ADMIN_APPROVAL_COMPLETED",
          title: "Admin Approval Granted - Ready for Final HR Sign-off",
          message: `Admin ${name || "Admin"} has approved ${resignation.name}'s resignation (Unofficial tasks, event logistics & joining kit/assets verified). Resignation has advanced to HR for final sign-off.`,
          created_at: new Date().toISOString()
        });
        notifications.push({
          id: Date.now() + 1,
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "ADMIN_APPROVED",
          title: "Admin Approval Granted",
          message: `Admin ${name || "Admin"} has approved your resignation request. Notes: "${comments || "Admin & Joining Kit Sign-off Complete"}". Now awaiting final HR sign-off.`,
          created_at: new Date().toISOString()
        });
      } else {
        notifications.push({
          id: Date.now(),
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "ADMIN_REJECTED",
          title: "Resignation Rejected by Admin",
          message: `Admin ${name || "Admin"} has rejected your resignation request. Reason: ${comments || "Not approved by Admin"}`,
          created_at: new Date().toISOString()
        });
      }

      await resignation.update({
        status: nextStatus,
        approval_stage: nextStage,
        admin_id: employee_id,
        admin_name: name || "Admin Officer",
        admin_decision: decision,
        admin_comments: comments || "",
        admin_action_date: new Date(),
        notifications
      });

      return res.json({
        success: true,
        message: isApproved
          ? "Admin approval granted successfully! Resignation has advanced to HR for final sign-off."
          : "Resignation has been rejected by Admin.",
        data: resignation
      });
    } catch (err) {
      console.error("Admin review error:", err.message);
      return res.status(500).json({ error: "Failed to process Admin review" });
    }
  },

  // PATCH /api/auth/resignation/:id/hr-action
  async hrReview(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments, confirmed_lwd } = req.body;
      const { employee_id, name, role } = req.user;

      const isHr = role === "hr" || role === "hrmanager";
      if (!isHr) {
        return res.status(403).json({ error: "Only HR Managers can perform final resignation approval" });
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

      // ENFORCE ADMIN APPROVAL: Admin must approve unofficial tasks & joining kit before final HR approval
      if (isApproved && resignation.status === "Pending Admin Approval" && resignation.admin_decision !== "Approved") {
        return res.status(400).json({
          error: "Cannot grant final HR approval. The resignation is pending Admin approval for unofficial tasks & joining kit sign-off."
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

      // Send real-time notification to employee
      sendRealtimeNotification({
        recipient_id: resignation.employee_id,
        title: isApproved ? "Resignation Approved by HR" : "Resignation Rejected by HR",
        message: isApproved
          ? `HR Head ${name || "HR"} has granted final approval for your resignation! Confirmed LWD: ${resolvedLwd}.`
          : `HR Head ${name || "HR"} has rejected your resignation notice. Reason: ${comments || "Not approved"}.`,
        type: "resignation",
        category: "Resignation",
        link: "/resignation",
        priority: isApproved ? "normal" : "high",
        source_module: "resignation",
        created_by: name || "HR Head",
      }).catch((e) => console.warn("Socket HR review notify error:", e.message));

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
            assigned_emp_id: (typeof dept === "object" && dept.assigned_emp_id) ? String(dept.assigned_emp_id).trim() : null,
            assigned_emp_name: (typeof dept === "object" && dept.assigned_emp_name) ? String(dept.assigned_emp_name).trim() : null,
            assigned_emp_designation: (typeof dept === "object" && dept.assigned_emp_designation) ? String(dept.assigned_emp_designation).trim() : null,
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
                assigned_emp_id: null,
                assigned_emp_name: null,
                assigned_emp_designation: null,
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
      const firstStepOfficer = steps[0]?.assigned_emp_name ? ` (Assigned to: ${steps[0].assigned_emp_name} - ${steps[0].assigned_emp_id})` : "";
      notifications.push({
        id: Date.now(),
        target: "CLEARANCE_PIPELINE",
        recipient: steps[0]?.assigned_emp_id || steps[0]?.dept_key,
        type: "CLEARANCE_RAISED",
        title: "Clearance Form Raised - Step 1 Active",
        message: `Clearance form raised by HR ${name || "HR"}. Step 1 (${steps[0].name}) is now ACTIVE in serial order${firstStepOfficer}.`,
        created_at: new Date().toISOString()
      });

      const updatedSteps = JSON.parse(JSON.stringify(steps));
      resignation.changed("clearance_steps", true);
      resignation.changed("notifications", true);

      await Resignation.update({
        clearance_raised: true,
        clearance_raised_by: name || "HR",
        clearance_raised_date: new Date(),
        clearance_steps: updatedSteps,
        clearance_overall_status: "In Progress",
        approval_stage: "CLEARANCE_IN_PROGRESS",
        status: "Clearance In Progress",
        notifications
      }, { where: { id: resignation.id } });

      const refreshed = await Resignation.findByPk(id);
      const populated = await populateAndAutoAdvanceResignations([refreshed]);

      return res.json({
        success: true,
        message: "Clearance form raised successfully! Serial department clearance pipeline initiated.",
        data: populated[0]
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
      const { department_name, assigned_emp_id, assigned_emp_name, assigned_emp_designation } = req.body;
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
        assigned_emp_id: assigned_emp_id ? String(assigned_emp_id).trim() : null,
        assigned_emp_name: assigned_emp_name ? String(assigned_emp_name).trim() : null,
        assigned_emp_designation: assigned_emp_designation ? String(assigned_emp_designation).trim() : null,
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
        recipient: assigned_emp_id || `${trimmed} Department`,
        type: "CUSTOM_DEPT_ADDED",
        title: `Clearance Pipeline: Added ${trimmed}`,
        message: `${trimmed} has been added by HR ${name || "HR"} to the serial clearance pipeline for ${resignation.name}${assigned_emp_name ? ` (Assigned to: ${assigned_emp_name})` : ""}.`,
        created_at: new Date().toISOString()
      });

      const updatedSteps = JSON.parse(JSON.stringify(steps));
      resignation.changed("clearance_steps", true);
      resignation.changed("notifications", true);

      await Resignation.update({
        clearance_steps: updatedSteps,
        notifications
      }, { where: { id: resignation.id } });

      const refreshed = await Resignation.findByPk(id);
      const populated = await populateAndAutoAdvanceResignations([refreshed]);

      return res.json({
        success: true,
        message: `Department "${trimmed}" added to clearance pipeline successfully!`,
        data: populated[0]
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

      // Fetch user profile from database to get their actual department and designation
      const userProfile = await User.findOne({
        where: {
          [Op.or]: [
            { employee_id: employee_id || "" },
            { id: req.user.id || 0 }
          ]
        }
      });

      const effectiveUser = {
        employee_id,
        name,
        role: (userProfile?.role || role || "").toLowerCase().trim(),
        dept: (userProfile?.dept || req.user?.dept || "").trim(),
        designation: (userProfile?.designation || req.user?.designation || "").trim(),
        is_hod: userProfile?.is_hod || false
      };

      const userEmpIdClean = (employee_id || "").trim().toLowerCase();
      const resEmpIdClean = (resignation.employee_id || "").trim().toLowerCase();

      if (userEmpIdClean && resEmpIdClean && userEmpIdClean === resEmpIdClean) {
        return res.status(403).json({ error: "Resigning employees cannot clear their own clearance pipeline steps" });
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

      // 1. SERIAL ORDER CHECK: All previous steps (order < targetStep.order) MUST be Cleared!
      for (let i = 0; i < targetIndex; i++) {
        if (steps[i].status !== "Cleared") {
          return res.status(400).json({
            error: `Serial order violation: Cannot clear "${targetStep.name}" until Step ${steps[i].order} ("${steps[i].name}") is cleared first.`
          });
        }
      }

      // 1.5 KT HANDOVER VERIFICATION CHECK:
      // If clearing Department Clearance (step.id === 'dept' or dept_key === 'Department'),
      // Knowledge Transfer must be signed off by the recipient and verified before Department Clearance can be granted!
      const isDeptStep = targetStep.id === "dept" || (targetStep.dept_key && targetStep.dept_key.toLowerCase() === "department");
      if (isDeptStep) {
        const isKtVerified = resignation.kt_status === "VERIFIED" || resignation.handover_status === "CONFIRMED_BY_ASSIGNEE";
        if (!isKtVerified) {
          return res.status(400).json({
            error: `Department Clearance blocked: Knowledge Transfer (KT) tasks must be completed, signed off by recipient (${resignation.handover_person_name || "Assignee"}), and verified before Department Clearance can be granted.`
          });
        }
      }

      // 2. DEPARTMENT PERMISSION CHECK: Only the designated officer from that specific department can give clearance!
      // HR cannot give clearance on behalf of another department.
      const isAuthorized = isUserAuthorizedForDeptStep(targetStep, resignation, effectiveUser);
      if (!isAuthorized) {
        const assignedLabel = targetStep.assigned_emp_name ? `${targetStep.assigned_emp_name} (${targetStep.assigned_emp_id})` : (targetStep.dept_key || targetStep.name);
        return res.status(403).json({
          error: `Permission denied: Clearance for "${targetStep.name}" can only be granted by the designated officer from ${targetStep.dept_key || targetStep.name} (${assignedLabel}). HR and other departments cannot give clearance on their behalf.`
        });
      }

      // Mark this step as Cleared
      targetStep.status = "Cleared";
      targetStep.cleared_by = employee_id;
      targetStep.cleared_by_name = name || targetStep.assigned_emp_name || "Authorized Officer";
      targetStep.cleared_by_dept = effectiveUser.dept || targetStep.dept_key;
      targetStep.cleared_at = new Date().toISOString();
      targetStep.remarks = remarks || "Cleared with no outstanding dues";
      if (Array.isArray(checklist)) {
        targetStep.checklist = checklist;
      }
      if (isDeptStep && Array.isArray(targetStep.checklist)) {
        targetStep.checklist = targetStep.checklist.map(ci => {
          if (ci.item && ci.item.toLowerCase().includes("handover")) {
            return { ...ci, done: true };
          }
          return ci;
        });
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
          const nextOfficerInfo = nextActiveStep.assigned_emp_name ? ` (Assigned to: ${nextActiveStep.assigned_emp_name} - ${nextActiveStep.assigned_emp_id})` : "";
          notifications.push({
            id: Date.now(),
            target: nextActiveStep.dept_key,
            recipient: nextActiveStep.assigned_emp_id || `${nextActiveStep.name} Officer`,
            type: "NEXT_STEP_ACTIVE",
            title: `Step ${nextActiveStep.order} Active: ${nextActiveStep.name}`,
            message: `Previous clearance step "${targetStep.name}" was cleared by ${name}. Step ${nextActiveStep.order} (${nextActiveStep.name}) is now ACTIVE in serial order${nextOfficerInfo}.`,
            created_at: new Date().toISOString()
          });
        }
      }

      const updatedSteps = JSON.parse(JSON.stringify(steps));
      resignation.changed("clearance_steps", true);
      resignation.changed("notifications", true);

      await Resignation.update({
        clearance_steps: updatedSteps,
        clearance_overall_status: allCleared ? "Completed" : "In Progress",
        approval_stage: nextStage,
        status: nextStatus,
        notifications,
        ...legacyUpdates
      }, { where: { id: resignation.id } });

      const refreshed = await Resignation.findByPk(id);
      const populated = await populateAndAutoAdvanceResignations([refreshed]);

      return res.json({
        success: true,
        message: allCleared
          ? `Final clearance completed! Flow has moved to HR for final clearance & Exit Interview scheduling.`
          : `Clearance for "${targetStep.name}" marked as Cleared (Green). Next step in serial order unlocked.`,
        data: populated[0]
      });
    } catch (err) {
      console.error("Clear department step error:", err.message);
      return res.status(500).json({ error: "Failed to process department clearance" });
    }
  },

  // PATCH /api/auth/resignation/:id/reassign-step-approver
  async reassignStepApprover(req, res) {
    try {
      const { id } = req.params;
      const { step_id, assigned_emp_id, assigned_emp_name, assigned_emp_designation } = req.body;
      const { name, role } = req.user;

      const isHrOrAdmin = role === "hr" || role === "admin" || role === "hrmanager";
      if (!isHrOrAdmin) {
        return res.status(403).json({ error: "Only HR or Admin can assign or change clearance approvers" });
      }

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
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
      if (targetStep.status === "Cleared") {
        return res.status(400).json({ error: `Cannot reassign approver for "${targetStep.name}" because it has already been cleared.` });
      }

      const resigningEmpId = String(resignation.employee_id || "").trim().toLowerCase();
      if (assigned_emp_id && String(assigned_emp_id).trim().toLowerCase() === resigningEmpId) {
        return res.status(400).json({ error: "Cannot assign the resigning employee as the clearance approver." });
      }

      targetStep.assigned_emp_id = assigned_emp_id ? String(assigned_emp_id).trim() : null;
      targetStep.assigned_emp_name = assigned_emp_name ? String(assigned_emp_name).trim() : null;
      targetStep.assigned_emp_designation = assigned_emp_designation ? String(assigned_emp_designation).trim() : null;

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "CLEARANCE_PIPELINE",
        recipient: assigned_emp_id || targetStep.dept_key,
        type: "APPROVER_ASSIGNED",
        title: `Clearance Approver Assigned: ${targetStep.name}`,
        message: `HR ${name || "HR"} assigned ${assigned_emp_name || assigned_emp_id} to authorize clearance for ${targetStep.name}.`,
        created_at: new Date().toISOString()
      });

      const updatedSteps = JSON.parse(JSON.stringify(steps));
      resignation.changed("clearance_steps", true);
      resignation.changed("notifications", true);

      await Resignation.update({
        clearance_steps: updatedSteps,
        notifications
      }, { where: { id: resignation.id } });

      const refreshed = await Resignation.findByPk(id);
      const populated = await populateAndAutoAdvanceResignations([refreshed]);

      return res.json({
        success: true,
        message: `Clearance approver for ${targetStep.name} updated to ${assigned_emp_name || assigned_emp_id} successfully!`,
        data: populated[0]
      });
    } catch (err) {
      console.error("Reassign step approver error:", err.message);
      return res.status(500).json({ error: "Failed to reassign clearance approver" });
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
  },

  // ==========================================
  // Knowledge Transfer (KT) Tracking Module Methods
  // ==========================================

  // GET /api/auth/resignation/:id/kt
  async getKtDetails(req, res) {
    try {
      const { id } = req.params;
      const { employee_id, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isOwner = (resignation.employee_id || "").trim().toLowerCase() === userClean;
      const isRecipient = resignation.handover_person_id && (resignation.handover_person_id.trim().toLowerCase() === userClean);
      const isManager = (resignation.manager_id || "").trim().toLowerCase() === userClean;
      const isHod = (resignation.hod_id || "").trim().toLowerCase() === userClean;
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin" || role === "hod" || isLeadershipUser(req.user);

      if (!isOwner && !isRecipient && !isManager && !isHod && !isCorporate) {
        return res.status(403).json({ error: "Unauthorized to access Knowledge Transfer details" });
      }

      let tasks = Array.isArray(resignation.kt_tasks) && resignation.kt_tasks.length > 0 ? resignation.kt_tasks : [];
      if (tasks.length === 0) {
        tasks = DEFAULT_KT_TASKS.map(t => ({
          ...t,
          due_date: resignation.handover_target_date || resignation.last_working_date || ""
        }));
      }

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === "Completed").length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return res.json({
        success: true,
        data: {
          resignation_id: resignation.id,
          employee_id: resignation.employee_id,
          employee_name: resignation.name,
          dept: resignation.dept,
          designation: resignation.designation,
          handover_person_id: resignation.handover_person_id,
          handover_person_name: resignation.handover_person_name,
          target_date: resignation.handover_target_date || resignation.last_working_date,
          kt_tasks: tasks,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          progress_percentage: progressPercentage,
          kt_status: resignation.kt_status || "NOT_STARTED",
          kt_recipient_feedback: resignation.kt_recipient_feedback,
          kt_recipient_rating: resignation.kt_recipient_rating,
          kt_recipient_signed_at: resignation.kt_recipient_signed_at,
          kt_recipient_signed_by_id: resignation.kt_recipient_signed_by_id,
          kt_recipient_signed_by_name: resignation.kt_recipient_signed_by_name,
          kt_manager_verification_notes: resignation.kt_manager_verification_notes,
          kt_manager_verified_at: resignation.kt_manager_verified_at,
          kt_manager_verified_by_id: resignation.kt_manager_verified_by_id,
          kt_manager_verified_by_name: resignation.kt_manager_verified_by_name,
          kt_certificate_number: resignation.kt_certificate_number,
          can_manage_tasks: isOwner || isCorporate || isManager,
          can_recipient_signoff: isRecipient || isCorporate,
          can_manager_verify: isManager || isHod || isCorporate
        }
      });
    } catch (err) {
      console.error("Get KT details error:", err.message);
      return res.status(500).json({ error: "Failed to fetch KT details" });
    }
  },

  // POST /api/auth/resignation/:id/kt/tasks
  async updateKtTasks(req, res) {
    try {
      const { id } = req.params;
      const { tasks, reset_to_default } = req.body;
      const { employee_id, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isOwner = (resignation.employee_id || "").trim().toLowerCase() === userClean;
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin" || isLeadershipUser(req.user);

      if (!isOwner && !isCorporate) {
        return res.status(403).json({ error: "Only the resigning employee or supervisor can manage KT tasks" });
      }

      if (resignation.kt_status === "VERIFIED") {
        return res.status(400).json({ error: "Knowledge Transfer has already been verified and locked" });
      }

      let updatedTasks = [];
      if (reset_to_default) {
        updatedTasks = DEFAULT_KT_TASKS.map(t => ({
          ...t,
          due_date: resignation.handover_target_date || resignation.last_working_date || ""
        }));
      } else if (Array.isArray(tasks)) {
        updatedTasks = tasks.map((t, idx) => ({
          id: t.id || `kt_${Date.now()}_${idx}`,
          title: (t.title || "Untitled Task").trim(),
          category: (t.category || "General").trim(),
          priority: t.priority || "Medium",
          description: (t.description || "").trim(),
          deliverable_url: (t.deliverable_url || "").trim(),
          due_date: t.due_date || resignation.handover_target_date || "",
          status: t.status || "Pending",
          notes: (t.notes || "").trim(),
          completed_at: t.status === "Completed" ? (t.completed_at || new Date().toISOString()) : null
        }));
      }

      let newStatus = resignation.kt_status;
      if (newStatus === "NOT_STARTED" || !newStatus) {
        newStatus = "IN_PROGRESS";
      }

      resignation.changed("kt_tasks", true);
      await resignation.update({
        kt_tasks: updatedTasks,
        kt_status: newStatus
      });

      return res.json({
        success: true,
        message: "KT task checklist updated successfully!",
        data: {
          kt_tasks: updatedTasks,
          kt_status: newStatus
        }
      });
    } catch (err) {
      console.error("Update KT tasks error:", err.message);
      return res.status(500).json({ error: "Failed to update KT tasks" });
    }
  },

  // POST /api/auth/resignation/:id/kt/tasks/add
  async addKtTask(req, res) {
    try {
      const { id } = req.params;
      const { title, category, priority, description, deliverable_url, due_date, notes } = req.body;
      const { employee_id, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isOwner = (resignation.employee_id || "").trim().toLowerCase() === userClean;
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin" || isLeadershipUser(req.user);

      if (!isOwner && !isCorporate) {
        return res.status(403).json({ error: "Only the resigning employee or supervisor can add KT tasks" });
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Task title is required" });
      }

      let currentTasks = Array.isArray(resignation.kt_tasks) && resignation.kt_tasks.length > 0
        ? [...resignation.kt_tasks]
        : DEFAULT_KT_TASKS.map(t => ({ ...t, due_date: resignation.handover_target_date || resignation.last_working_date || "" }));

      const newTask = {
        id: `kt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: title.trim(),
        category: (category || "General").trim(),
        priority: priority || "Medium",
        description: (description || "").trim(),
        deliverable_url: (deliverable_url || "").trim(),
        due_date: due_date || resignation.handover_target_date || "",
        status: "Pending",
        notes: (notes || "").trim(),
        completed_at: null
      };

      currentTasks.push(newTask);

      resignation.changed("kt_tasks", true);
      await resignation.update({
        kt_tasks: currentTasks,
        kt_status: resignation.kt_status === "NOT_STARTED" ? "IN_PROGRESS" : resignation.kt_status
      });

      return res.json({
        success: true,
        message: `KT task "${newTask.title}" added successfully!`,
        data: newTask,
        kt_tasks: currentTasks
      });
    } catch (err) {
      console.error("Add KT task error:", err.message);
      return res.status(500).json({ error: "Failed to add KT task" });
    }
  },

  // PATCH /api/auth/resignation/:id/kt/tasks/:taskId
  async updateSingleKtTask(req, res) {
    try {
      const { id, taskId } = req.params;
      const { status, deliverable_url, notes, due_date, title, category, priority } = req.body;
      const { employee_id, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isOwner = (resignation.employee_id || "").trim().toLowerCase() === userClean;
      const isRecipient = resignation.handover_person_id && (resignation.handover_person_id.trim().toLowerCase() === userClean);
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin" || isLeadershipUser(req.user);

      if (!isOwner && !isRecipient && !isCorporate) {
        return res.status(403).json({ error: "Unauthorized to update this KT task" });
      }

      let currentTasks = Array.isArray(resignation.kt_tasks) && resignation.kt_tasks.length > 0
        ? [...resignation.kt_tasks]
        : DEFAULT_KT_TASKS.map(t => ({ ...t, due_date: resignation.handover_target_date || resignation.last_working_date || "" }));

      const taskIndex = currentTasks.findIndex(t => String(t.id) === String(taskId));
      if (taskIndex === -1) {
        return res.status(404).json({ error: "KT task not found" });
      }

      const task = { ...currentTasks[taskIndex] };
      if (title !== undefined) task.title = title.trim();
      if (category !== undefined) task.category = category.trim();
      if (priority !== undefined) task.priority = priority;
      if (deliverable_url !== undefined) task.deliverable_url = deliverable_url.trim();
      if (notes !== undefined) task.notes = notes.trim();
      if (due_date !== undefined) task.due_date = due_date;

      if (status !== undefined) {
        task.status = status;
        if (status === "Completed") {
          task.completed_at = new Date().toISOString();
        } else {
          task.completed_at = null;
        }
      }

      currentTasks[taskIndex] = task;

      resignation.changed("kt_tasks", true);
      await resignation.update({
        kt_tasks: currentTasks
      });

      return res.json({
        success: true,
        message: "KT task updated successfully!",
        data: task,
        kt_tasks: currentTasks
      });
    } catch (err) {
      console.error("Update single KT task error:", err.message);
      return res.status(500).json({ error: "Failed to update KT task" });
    }
  },

  // DELETE /api/auth/resignation/:id/kt/tasks/:taskId
  async deleteKtTask(req, res) {
    try {
      const { id, taskId } = req.params;
      const { employee_id, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isOwner = (resignation.employee_id || "").trim().toLowerCase() === userClean;
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin" || isLeadershipUser(req.user);

      if (!isOwner && !isCorporate) {
        return res.status(403).json({ error: "Only the resigning employee or supervisor can delete KT tasks" });
      }

      if (resignation.kt_status === "VERIFIED") {
        return res.status(400).json({ error: "Knowledge Transfer is already verified and locked" });
      }

      let currentTasks = Array.isArray(resignation.kt_tasks) ? [...resignation.kt_tasks] : [];
      currentTasks = currentTasks.filter(t => String(t.id) !== String(taskId));

      resignation.changed("kt_tasks", true);
      await resignation.update({ kt_tasks: currentTasks });

      return res.json({
        success: true,
        message: "KT task removed",
        kt_tasks: currentTasks
      });
    } catch (err) {
      console.error("Delete KT task error:", err.message);
      return res.status(500).json({ error: "Failed to delete KT task" });
    }
  },

  // POST /api/auth/resignation/:id/kt/submit
  async submitKtForSignoff(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const { employee_id, name, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isOwner = (resignation.employee_id || "").trim().toLowerCase() === userClean;
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin";

      if (!isOwner && !isCorporate) {
        return res.status(403).json({ error: "Only the resigning employee can submit Knowledge Transfer for sign-off" });
      }

      let tasks = Array.isArray(resignation.kt_tasks) && resignation.kt_tasks.length > 0
        ? resignation.kt_tasks
        : DEFAULT_KT_TASKS.map(t => ({ ...t, due_date: resignation.handover_target_date || resignation.last_working_date || "" }));

      const incomplete = tasks.filter(t => t.status !== "Completed");
      if (incomplete.length > 0) {
        return res.status(400).json({
          error: `Cannot submit for sign-off: ${incomplete.length} KT task(s) are still incomplete (${incomplete.map(i => i.title).join(", ")}). Please complete or update all tasks before formal sign-off.`
        });
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "ASSIGNEE",
        recipient: resignation.handover_person_name || "Handover Recipient",
        type: "KT_SUBMITTED_FOR_SIGNOFF",
        title: "Knowledge Transfer Submitted for Your Sign-off",
        message: `${resignation.name} has completed all ${tasks.length} Knowledge Transfer deliverables and submitted them for your formal verification and sign-off.`,
        created_at: new Date().toISOString()
      });

      resignation.changed("kt_tasks", true);
      resignation.changed("notifications", true);

      await resignation.update({
        kt_tasks: tasks,
        kt_status: "SUBMITTED",
        handover_status: "SUBMITTED_BY_EMPLOYEE",
        handover_employee_remarks: notes || resignation.handover_employee_remarks || "Knowledge Transfer checklist submitted for recipient review.",
        handover_employee_completed_at: new Date(),
        notifications
      });

      // Send real-time notification to recipient
      if (resignation.handover_person_id) {
        sendRealtimeNotification({
          recipient_id: resignation.handover_person_id,
          title: "Knowledge Transfer (KT) Ready for Review",
          message: `${resignation.name} has submitted all KT deliverables. Please review and provide sign-off.`,
          type: "resignation",
          category: "Resignation",
          link: "/resignation",
          priority: "high",
          source_module: "resignation",
          created_by: name || "Resigning Employee"
        }).catch(e => console.warn("KT submit notify error:", e.message));
      }

      return res.json({
        success: true,
        message: "Knowledge Transfer successfully submitted for recipient sign-off!",
        data: {
          kt_status: "SUBMITTED",
          handover_status: "SUBMITTED_BY_EMPLOYEE"
        }
      });
    } catch (err) {
      console.error("Submit KT error:", err.message);
      return res.status(500).json({ error: "Failed to submit Knowledge Transfer" });
    }
  },

  // POST /api/auth/resignation/:id/kt/recipient-signoff
  async recipientKtSignoff(req, res) {
    try {
      const { id } = req.params;
      const { decision, feedback, rating } = req.body;
      const { employee_id, name, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isRecipient = resignation.handover_person_id && (resignation.handover_person_id.trim().toLowerCase() === userClean);
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin" || role === "hod";

      if (!isRecipient && !isCorporate) {
        return res.status(403).json({
          error: `Only designated handover recipient (${resignation.handover_person_name || "Assignee"}) or HR can submit KT recipient sign-off.`
        });
      }

      const isAccepted = decision === "ACCEPT" || decision === "Confirmed";
      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];

      if (isAccepted) {
        notifications.push({
          id: Date.now(),
          target: "MANAGER",
          recipient: resignation.manager_name || "Reporting Manager",
          type: "KT_RECIPIENT_ACCEPTED",
          title: "KT Signed Off by Recipient - Ready for Manager Verification",
          message: `${resignation.handover_person_name || name} has reviewed and accepted the Knowledge Transfer from ${resignation.name} (Comprehension Score: ${rating || 5}/5). Pending Manager Handover Verification before clearance.`,
          created_at: new Date().toISOString()
        });

        notifications.push({
          id: Date.now() + 1,
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "KT_ACCEPTED_BY_RECIPIENT",
          title: "Knowledge Transfer Accepted by Recipient!",
          message: `${resignation.handover_person_name || name} has signed off on your Knowledge Transfer handover with score ${rating || 5}/5. Now awaiting Manager verification.`,
          created_at: new Date().toISOString()
        });

        resignation.changed("notifications", true);
        await resignation.update({
          kt_status: "RECIPIENT_ACCEPTED",
          kt_recipient_feedback: feedback || "All KT deliverables reviewed and accepted in full.",
          kt_recipient_rating: Number(rating) || 5,
          kt_recipient_signed_at: new Date(),
          kt_recipient_signed_by_id: employee_id,
          kt_recipient_signed_by_name: name || "Handover Recipient",
          notifications
        });

        // Notify manager
        if (resignation.manager_id) {
          sendRealtimeNotification({
            recipient_id: resignation.manager_id,
            title: "KT Handover Ready for Verification",
            message: `${resignation.name}'s KT has been accepted by ${resignation.handover_person_name || name}. Please conduct final handover verification.`,
            type: "resignation",
            category: "Resignation",
            link: "/resignation",
            priority: "normal",
            source_module: "resignation",
            created_by: name || "Recipient"
          }).catch(e => console.warn("KT accepted notify error:", e.message));
        }

        return res.json({
          success: true,
          message: "Knowledge Transfer signed off and accepted! Awaiting Manager Handover Verification.",
          data: {
            kt_status: "RECIPIENT_ACCEPTED",
            kt_recipient_rating: Number(rating) || 5
          }
        });
      } else {
        // Revision requested
        notifications.push({
          id: Date.now(),
          target: "EMPLOYEE",
          recipient: resignation.name,
          type: "KT_REVISION_REQUESTED",
          title: "KT Revision Requested by Handover Recipient",
          message: `${resignation.handover_person_name || name} requested revisions on your Knowledge Transfer deliverables. Feedback: ${feedback || "Please clarify documentation and credentials."}`,
          created_at: new Date().toISOString()
        });

        resignation.changed("notifications", true);
        await resignation.update({
          kt_status: "REVISION_REQUESTED",
          kt_recipient_feedback: feedback || "Revision requested on deliverables",
          notifications
        });

        // Notify employee
        sendRealtimeNotification({
          recipient_id: resignation.employee_id,
          title: "Knowledge Transfer Needs Revision",
          message: `Recipient ${resignation.handover_person_name || name} requested updates: ${feedback || "Please check deliverables."}`,
          type: "resignation",
          category: "Resignation",
          link: "/resignation",
          priority: "high",
          source_module: "resignation",
          created_by: name || "Recipient"
        }).catch(e => console.warn("KT revise notify error:", e.message));

        return res.json({
          success: true,
          message: "Revision requested. Resigning employee has been notified to make updates.",
          data: { kt_status: "REVISION_REQUESTED" }
        });
      }
    } catch (err) {
      console.error("Recipient KT sign-off error:", err.message);
      return res.status(500).json({ error: "Failed to process recipient sign-off" });
    }
  },

  // POST /api/auth/resignation/:id/kt/verify-handover
  async verifyKtHandover(req, res) {
    try {
      const { id } = req.params;
      const { verification_notes } = req.body;
      const { employee_id, name, role } = req.user;

      const resignation = await Resignation.findByPk(id);
      if (!resignation) {
        return res.status(404).json({ error: "Resignation record not found" });
      }

      const userClean = (employee_id || "").trim().toLowerCase();
      const isManager = (resignation.manager_id || "").trim().toLowerCase() === userClean;
      const isHod = (resignation.hod_id || "").trim().toLowerCase() === userClean;
      const isCorporate = role === "hr" || role === "hrmanager" || role === "admin" || role === "hod" || isLeadershipUser(req.user);

      if (!isManager && !isHod && !isCorporate) {
        return res.status(403).json({
          error: "Only Reporting Manager, Department Head (HOD), or HR can verify Knowledge Transfer handover."
        });
      }

      // Update serial clearance step 1 (Department Clearance) checklist if steps exist
      let updatedSteps = resignation.clearance_steps;
      if (Array.isArray(updatedSteps)) {
        updatedSteps = updatedSteps.map(step => {
          if (step.id === "dept" || (step.dept_key && step.dept_key.toLowerCase() === "department")) {
            const updatedChecklist = Array.isArray(step.checklist) ? step.checklist.map(ci => {
              if (ci.item && ci.item.toLowerCase().includes("handover")) {
                return { ...ci, done: true };
              }
              return ci;
            }) : step.checklist;
            return { ...step, checklist: updatedChecklist };
          }
          return step;
        });
        resignation.changed("clearance_steps", true);
      }

      const notifications = Array.isArray(resignation.notifications) ? [...resignation.notifications] : [];
      notifications.push({
        id: Date.now(),
        target: "EMPLOYEE",
        recipient: resignation.name,
        type: "KT_HANDOVER_VERIFIED",
        title: "Handover Verified",
        message: `Manager ${name || "Manager"} has officially verified your Knowledge Transfer deliverables. Department clearance is now unlocked!`,
        created_at: new Date().toISOString()
      });

      notifications.push({
        id: Date.now() + 1,
        target: "HR",
        recipient: "HR Department",
        type: "KT_VERIFIED_HR_AUDIT",
        title: "Handover Verified by Manager",
        message: `Manager ${name} has verified Knowledge Transfer for ${resignation.name}. Department Clearance can now proceed.`,
        created_at: new Date().toISOString()
      });

      resignation.changed("notifications", true);

      await resignation.update({
        kt_status: "VERIFIED",
        kt_manager_verification_notes: verification_notes || "Handover deliverables and recipient sign-off verified complete and approved.",
        kt_manager_verified_at: new Date(),
        kt_manager_verified_by_id: employee_id,
        kt_manager_verified_by_name: name || "Reporting Manager",
        kt_certificate_number: null,
        handover_status: "CONFIRMED_BY_ASSIGNEE",
        handover_assignee_confirmed_at: new Date(),
        handover_assignee_remarks: verification_notes || "Handover verified and confirmed complete",
        clearance_steps: updatedSteps,
        notifications
      });

      // Send real-time notification to employee
      sendRealtimeNotification({
        recipient_id: resignation.employee_id,
        title: "Handover Verified",
        message: "Your Knowledge Transfer deliverables have been officially verified. Department Clearance is unlocked!",
        type: "resignation",
        category: "Resignation",
        link: "/resignation",
        priority: "normal",
        source_module: "resignation",
        created_by: name || "Manager"
      }).catch(e => console.warn("KT verify notify error:", e.message));

      return res.json({
        success: true,
        message: "Handover verified successfully! Department Clearance is now unlocked.",
        data: {
          kt_status: "VERIFIED",
          kt_manager_verified_at: new Date(),
          kt_manager_verified_by_name: name || "Reporting Manager"
        }
      });
    } catch (err) {
      console.error("Verify KT handover error:", err.message);
      return res.status(500).json({ error: "Failed to verify KT handover" });
    }
  }
};

module.exports = ResignationController;
