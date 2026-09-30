const { RecruitmentRequisition, RecruitmentCandidate, User } = require("../config/db");
const { Op } = require("sequelize");
const { sendInterviewScheduleEmail } = require("../utils/mailer");

/**
 * Resolves user name, email, dept from token, request body, or DB lookup
 */
async function resolveUserInfo(reqUser = {}, fallbackBody = {}) {
  let name = reqUser.name || fallbackBody.name || fallbackBody.hod_name;
  let email = reqUser.email || fallbackBody.email || fallbackBody.hod_email;
  let dept = reqUser.dept || fallbackBody.dept || fallbackBody.department;

  if ((!name || !dept || !email) && reqUser.employee_id) {
    try {
      const dbUser = await User.findOne({
        where: { employee_id: reqUser.employee_id },
        attributes: ["name", "email", "dept"],
      });
      if (dbUser) {
        name = name || dbUser.name;
        email = email || dbUser.email;
        dept = dept || dbUser.dept;
      }
    } catch (e) {
      console.warn("Could not fetch user info from DB:", e.message);
    }
  }

  return {
    name: name || reqUser.employee_id || "Department Head",
    email: email || null,
    dept: dept || "General",
  };
}

const RecruitmentController = {
  // =========================================================================
  // 1. REQUISITION MANAGEMENT (HOD & HR)
  // =========================================================================

  /**
   * HOD (or HR/Admin) raises a requisition for candidate hiring
   * Required fields: position, experience_required, job_description, max_salary, joining_date_type, is_budgeted
   * If is_budgeted is false, auto-routes for CEO/COO approval
   */
  async createRequisition(req, res) {
    try {
      const {
        position,
        experience_required,
        job_description,
        max_salary,
        salary_frequency = "Per Annum (CTC)",
        joining_date_type = "Normal",
        tentative_joining_date,
        is_budgeted,
        department,
        vacancies_count = 1,
        reason_for_hiring,
        replacement_for_employee,
      } = req.body;

      if (!position || !position.trim()) {
        return res.status(400).json({ error: "Position/Designation is required" });
      }
      if (!experience_required || !experience_required.trim()) {
        return res.status(400).json({ error: "Experience required is required" });
      }
      if (!job_description || !job_description.trim()) {
        return res.status(400).json({ error: "Job Description (JD) is required" });
      }
      if (max_salary === undefined || max_salary === null || max_salary === "") {
        return res.status(400).json({ error: "Maximum salary for the position is required" });
      }

      // Parse budgeted status (can be boolean or string "Yes"/"No")
      let budgeted = true;
      if (typeof is_budgeted === "boolean") {
        budgeted = is_budgeted;
      } else if (typeof is_budgeted === "string") {
        budgeted = is_budgeted.toLowerCase() === "yes" || is_budgeted.toLowerCase() === "true";
      }

      // CEO/COO approval document handling for non-budgeted requisitions
      let approval_document_url = null;
      let approval_document_filename = null;

      if (!budgeted) {
        if (!req.file && !req.body.approval_document_url) {
          return res.status(400).json({
            error: "CEO/COO approval document (PDF) is required for non-budgeted requisitions. Please upload the approval PDF.",
          });
        }

        if (req.file) {
          const isPdf =
            req.file.mimetype === "application/pdf" ||
            req.file.originalname.toLowerCase().endsWith(".pdf");
          if (!isPdf) {
            return res.status(400).json({
              error: "Only PDF files are accepted for CEO/COO approval document (.pdf)",
            });
          }
          approval_document_url = `/api/uploads/${req.file.filename}`;
          approval_document_filename = req.file.originalname;
        } else if (req.body.approval_document_url) {
          approval_document_url = req.body.approval_document_url;
          approval_document_filename = req.body.approval_document_filename || "CEO_Approval.pdf";
        }
      }

      // Generate unique requisition code
      const currentYear = new Date().getFullYear();
      const count = await RecruitmentRequisition.count();
      const requisition_code = `REQ-${currentYear}-${String(count + 1).padStart(4, "0")}`;

      // Resolve HOD user details (name, email, department)
      const userInfo = await resolveUserInfo(req.user, req.body);
      const dept = (department && department.trim()) || userInfo.dept || "General";

      // If unbudgeted, require CEO/COO approval
      const budget_approval_status = budgeted
        ? "NOT_REQUIRED"
        : approval_document_url
        ? "APPROVED_BY_CEO"
        : "PENDING_CEO_COO";
      const status = budgeted || approval_document_url ? "SOURCING_CANDIDATES" : "PENDING_CEO_COO_APPROVAL";

      const requisition = await RecruitmentRequisition.create({
        requisition_code,
        department: dept,
        position: position.trim(),
        vacancies_count: parseInt(vacancies_count, 10) || 1,
        experience_required: experience_required.trim(),
        job_description: job_description.trim(),
        max_salary: parseFloat(max_salary),
        salary_frequency,
        joining_date_type: joining_date_type === "Immediate" ? "Immediate" : "Normal",
        tentative_joining_date: tentative_joining_date || null,
        is_budgeted: budgeted,
        budget_approval_status,
        approval_document_url,
        approval_document_filename,
        ceo_coo_comments: approval_document_filename
          ? `CEO/COO approval document attached by HOD: ${approval_document_filename}`
          : null,
        reason_for_hiring: reason_for_hiring || "Team Expansion",
        replacement_for_employee: replacement_for_employee || null,
        hod_id: req.user.employee_id || "HOD-01",
        hod_name: userInfo.name,
        hod_email: userInfo.email,
        status,
      });

      return res.status(201).json({
        success: true,
        message: budgeted
          ? "Requisition submitted successfully. HR can now source candidate resumes."
          : "Non-budgeted requisition submitted with CEO/COO approval document attached. HR can now proceed with sourcing.",
        data: requisition,
      });
    } catch (err) {
      console.error("Create requisition error:", err);
      return res.status(500).json({ error: "Failed to create recruitment requisition: " + err.message });
    }
  },

  /**
   * Get all requisitions with role-based filtering
   */
  async getRequisitions(req, res) {
    try {
      const { role, dept, employee_id } = req.user;
      const { status, is_budgeted, department, search } = req.query;

      const whereClause = {};

      // Role based filtering:
      // If HOD, show requisitions from their department or raised by them
      const isExecutiveOrHr = ["hr", "admin", "ceo", "coo", "hrmanager"].includes((role || "").toLowerCase());
      if (!isExecutiveOrHr && (role || "").toLowerCase() === "hod") {
        whereClause[Op.or] = [
          { hod_id: employee_id },
          { department: dept || "IT" },
        ];
      }

      if (status && status !== "ALL") {
        whereClause.status = status;
      }

      if (is_budgeted !== undefined && is_budgeted !== "ALL") {
        whereClause.is_budgeted = is_budgeted === "true" || is_budgeted === true;
      }

      if (department && department !== "ALL") {
        whereClause.department = department;
      }

      if (search && search.trim()) {
        const query = `%${search.trim()}%`;
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
          [Op.or]: [
            { requisition_code: { [Op.iLike]: query } },
            { position: { [Op.iLike]: query } },
            { department: { [Op.iLike]: query } },
            { hod_name: { [Op.iLike]: query } },
          ],
        });
      }

      const requisitions = await RecruitmentRequisition.findAll({
        where: whereClause,
        include: [
          {
            model: RecruitmentCandidate,
            as: "candidates",
            attributes: [
              "id",
              "candidate_name",
              "email",
              "phone",
              "current_company",
              "experience_years",
              "hod_selection_status",
              "interview_requested",
              "interview_stage",
              "resume_url",
              "createdAt",
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({
        success: true,
        data: requisitions,
      });
    } catch (err) {
      console.error("Get requisitions error:", err);
      return res.status(500).json({ error: "Failed to fetch requisitions" });
    }
  },

  /**
   * Get single requisition by ID with candidates
   */
  async getRequisitionById(req, res) {
    try {
      const { id } = req.params;
      const requisition = await RecruitmentRequisition.findByPk(id, {
        include: [
          {
            model: RecruitmentCandidate,
            as: "candidates",
            order: [["createdAt", "DESC"]],
          },
        ],
      });

      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }

      return res.json({
        success: true,
        data: requisition,
      });
    } catch (err) {
      console.error("Get requisition by id error:", err);
      return res.status(500).json({ error: "Failed to fetch requisition details" });
    }
  },

  /**
   * Update requisition details (e.g. JD, Max Salary, urgency)
   */
  async updateRequisition(req, res) {
    try {
      const { id } = req.params;
      const requisition = await RecruitmentRequisition.findByPk(id);

      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }

      const allowedUpdates = [
        "position",
        "experience_required",
        "job_description",
        "max_salary",
        "salary_frequency",
        "joining_date_type",
        "tentative_joining_date",
        "vacancies_count",
        "reason_for_hiring",
        "replacement_for_employee",
        "hr_assigned_id",
        "hr_assigned_name",
        "hr_notes",
        "status",
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          requisition[field] = req.body[field];
        }
      });

      await requisition.save();

      return res.json({
        success: true,
        message: "Requisition updated successfully",
        data: requisition,
      });
    } catch (err) {
      console.error("Update requisition error:", err);
      return res.status(500).json({ error: "Failed to update requisition" });
    }
  },

  // =========================================================================
  // 2. CEO / COO BUDGET APPROVAL WORKFLOW
  // =========================================================================

  /**
   * HR asks for CEO/COO approval for unbudgeted recruitment
   */
  async requestCeoApproval(req, res) {
    try {
      const { id } = req.params;
      const { note } = req.body;

      const requisition = await RecruitmentRequisition.findByPk(id);
      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }

      if (requisition.is_budgeted) {
        return res.status(400).json({ error: "This position is already budgeted. CEO approval is not required." });
      }

      requisition.budget_approval_status = "PENDING_CEO_COO";
      requisition.status = "PENDING_CEO_COO_APPROVAL";
      if (note) {
        requisition.hr_notes = note;
      }

      await requisition.save();

      return res.json({
        success: true,
        message: "Approval request successfully routed to CEO/COO.",
        data: requisition,
      });
    } catch (err) {
      console.error("Request CEO approval error:", err);
      return res.status(500).json({ error: "Failed to route for CEO approval" });
    }
  },

  /**
   * CEO / COO / Admin approves or rejects the unbudgeted requisition
   */
  async approveRejectBudget(req, res) {
    try {
      const { id } = req.params;
      const { action, comments } = req.body; // action: "APPROVED" or "REJECTED"

      const requisition = await RecruitmentRequisition.findByPk(id);
      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }

      const approverInfo = await resolveUserInfo(req.user, req.body);
      const approverRole = (req.user.role || "").toUpperCase();
      const approverName = approverInfo.name || "Executive Management";

      if (action === "APPROVED") {
        requisition.budget_approval_status = "APPROVED_BY_CEO";
        requisition.status = "SOURCING_CANDIDATES"; // HR can now start sourcing candidate resumes
        requisition.ceo_coo_approver_id = req.user.employee_id;
        requisition.ceo_coo_approver_name = approverName;
        requisition.ceo_coo_approver_role = approverRole;
        requisition.ceo_coo_decision_at = new Date();
        requisition.ceo_coo_comments = comments || "Budget approved by Executive Management";
      } else if (action === "REJECTED") {
        requisition.budget_approval_status = "REJECTED_BY_CEO";
        requisition.status = "REJECTED";
        requisition.ceo_coo_approver_id = req.user.employee_id;
        requisition.ceo_coo_approver_name = approverName;
        requisition.ceo_coo_approver_role = approverRole;
        requisition.ceo_coo_decision_at = new Date();
        requisition.ceo_coo_comments = comments || "Budget request rejected by Executive Management";
      } else {
        return res.status(400).json({ error: "Action must be APPROVED or REJECTED" });
      }

      await requisition.save();

      return res.json({
        success: true,
        message: `Requisition budget ${action.toLowerCase()} successfully`,
        data: requisition,
      });
    } catch (err) {
      console.error("Approve/reject budget error:", err);
      return res.status(500).json({ error: "Failed to process budget approval" });
    }
  },

  // =========================================================================
  // 3. CANDIDATE RESUME SOURCING & LISTING (HR)
  // =========================================================================

  /**
   * HR adds/lists a candidate resume under a requisition
   */
  async addCandidate(req, res) {
    try {
      const {
        requisition_id,
        candidate_name,
        email,
        phone,
        current_company,
        current_designation,
        experience_years,
        current_ctc,
        expected_ctc,
        notice_period,
        source = "HR Sourced",
        hr_screening_notes,
      } = req.body;

      if (!requisition_id) {
        return res.status(400).json({ error: "Requisition ID is required" });
      }
      if (!candidate_name || !candidate_name.trim()) {
        return res.status(400).json({ error: "Candidate name is required" });
      }
      if (!experience_years || !experience_years.trim()) {
        return res.status(400).json({ error: "Experience years is required" });
      }

      const requisition = await RecruitmentRequisition.findByPk(requisition_id);
      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }

      // Check if unbudgeted and not approved
      if (!requisition.is_budgeted && requisition.budget_approval_status !== "APPROVED_BY_CEO") {
        return res.status(400).json({
          error: "This unbudgeted requisition has not been approved by CEO/COO yet. Sourcing is blocked until approval.",
        });
      }

      // File upload handling
      let resume_url = null;
      let resume_filename = null;
      if (req.file) {
        resume_url = `/api/uploads/${req.file.filename}`;
        resume_filename = req.file.originalname;
      } else if (req.body.resume_url) {
        resume_url = req.body.resume_url;
        resume_filename = "Resume Link";
      }

      const hrInfo = await resolveUserInfo(req.user, req.body);

      const candidate = await RecruitmentCandidate.create({
        requisition_id,
        candidate_name: candidate_name.trim(),
        email: email && email.trim() ? email.trim() : null,
        phone: phone && phone.trim() ? phone.trim() : null,
        current_company: current_company ? current_company.trim() : null,
        current_designation: current_designation ? current_designation.trim() : null,
        experience_years: experience_years.trim(),
        current_ctc: current_ctc ? parseFloat(current_ctc) : null,
        expected_ctc: expected_ctc ? parseFloat(expected_ctc) : null,
        notice_period: notice_period || "30 Days",
        resume_url,
        resume_filename,
        source: source || "HR Sourced",
        hr_screening_notes: hr_screening_notes ? hr_screening_notes.trim() : null,
        hr_added_by_id: req.user.employee_id,
        hr_added_by_name: hrInfo.name || "HR Recruiter",
        hod_selection_status: "PENDING_REVIEW",
        interview_stage: "NOT_SCHEDULED",
      });

      // Update requisition status to HOD_REVIEW if it was in SOURCING_CANDIDATES
      if (requisition.status === "SOURCING_CANDIDATES") {
        requisition.status = "HOD_REVIEW";
        await requisition.save();
      }

      return res.status(201).json({
        success: true,
        message: "Candidate resume listed successfully in the recruitment portal for HOD review.",
        data: candidate,
      });
    } catch (err) {
      console.error("Add candidate error:", err);
      return res.status(500).json({ error: "Failed to add candidate: " + err.message });
    }
  },

  /**
   * Get candidates for a requisition or all
   */
  async getCandidates(req, res) {
    try {
      const { requisition_id, hod_selection_status, interview_stage } = req.query;
      const whereClause = {};

      if (requisition_id) {
        whereClause.requisition_id = requisition_id;
      }
      if (hod_selection_status && hod_selection_status !== "ALL") {
        whereClause.hod_selection_status = hod_selection_status;
      }
      if (interview_stage && interview_stage !== "ALL") {
        whereClause.interview_stage = interview_stage;
      }

      const candidates = await RecruitmentCandidate.findAll({
        where: whereClause,
        include: [
          {
            model: RecruitmentRequisition,
            as: "requisition",
            attributes: ["id", "requisition_code", "position", "department", "max_salary", "hod_name"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({
        success: true,
        data: candidates,
      });
    } catch (err) {
      console.error("Get candidates error:", err);
      return res.status(500).json({ error: "Failed to fetch candidates" });
    }
  },

  /**
   * Get single candidate by ID with requisition details
   */
  async getCandidateById(req, res) {
    try {
      const { candidate_id } = req.params;
      const candidate = await RecruitmentCandidate.findByPk(candidate_id, {
        include: [
          {
            model: RecruitmentRequisition,
            as: "requisition",
          },
        ],
      });

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      return res.json({
        success: true,
        data: candidate,
      });
    } catch (err) {
      console.error("Get candidate by id error:", err);
      return res.status(500).json({ error: "Failed to fetch candidate details" });
    }
  },

  /**
   * Submit interview evaluation & feedback for a candidate
   * Based on:
   * 1. personal appearance & behaviour
   * 2. domain knowledge
   * 3. education
   * 4. job role (dropdown: satisfactory, high, poor)
   */
  async submitCandidateEvaluation(req, res) {
    try {
      const { candidate_id } = req.params;
      const {
        round,
        personal_appearance_and_behaviour,
        personal_appearance_rating,
        domain_knowledge,
        domain_knowledge_rating,
        education,
        education_rating,
        job_role,
        detailed_feedback,
        recommendation,
        next_stage,
        next_interview_date,
        next_interview_time,
        next_interview_mode,
        next_interview_link,
      } = req.body;

      const candidate = await RecruitmentCandidate.findByPk(candidate_id, {
        include: [{ model: RecruitmentRequisition, as: "requisition" }],
      });

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const evaluatorInfo = await resolveUserInfo(req.user, req.body);
      const userRole = (req.user?.role || "hr").toLowerCase();

      // Normalize job_role to satisfactory / high / poor
      const validJobRoles = ["satisfactory", "high", "poor"];
      const normalizedJobRole = validJobRoles.includes(String(job_role).toLowerCase())
        ? String(job_role).toLowerCase()
        : "satisfactory";

      const evaluationItem = {
        id: "eval-" + Date.now(),
        round: round || candidate.interview_stage || "ROUND_1_HR",
        evaluator_id: req.user?.employee_id || req.user?.id || "N/A",
        evaluator_name: evaluatorInfo.name || "Evaluator",
        evaluator_role: userRole,
        evaluator_dept: evaluatorInfo.dept,
        evaluated_at: new Date().toISOString(),

        // The 4 core criteria
        personal_appearance_and_behaviour: personal_appearance_and_behaviour || "",
        personal_appearance_rating: Number(personal_appearance_rating) || 3,
        domain_knowledge: domain_knowledge || "",
        domain_knowledge_rating: Number(domain_knowledge_rating) || 3,
        education: education || "",
        education_rating: Number(education_rating) || 3,
        job_role: normalizedJobRole,

        detailed_feedback: detailed_feedback || "",
        recommendation: recommendation || "NEXT_ROUND",
        overall_score: Math.round(
          ((Number(personal_appearance_rating) || 3) +
            (Number(domain_knowledge_rating) || 3) +
            (Number(education_rating) || 3) +
            (normalizedJobRole === "high" ? 5 : normalizedJobRole === "poor" ? 2 : 4)) *
            5
        ),
      };

      const existingEvals = Array.isArray(candidate.interview_evaluations)
        ? [...candidate.interview_evaluations]
        : [];

      // Update if same round by same evaluator or role, else append
      const existingIdx = existingEvals.findIndex(
        (e) =>
          e.round === evaluationItem.round &&
          (e.evaluator_id === evaluationItem.evaluator_id || e.evaluator_role === evaluationItem.evaluator_role)
      );

      if (existingIdx >= 0) {
        existingEvals[existingIdx] = { ...existingEvals[existingIdx], ...evaluationItem };
      } else {
        existingEvals.push(evaluationItem);
      }

      candidate.interview_evaluations = existingEvals;

      // Update interview stage if specified
      if (next_stage) {
        candidate.interview_stage = next_stage;
      } else if (recommendation === "SELECTED") {
        candidate.interview_stage = "SELECTED";
      } else if (recommendation === "REJECTED") {
        candidate.interview_stage = "REJECTED";
      } else if (recommendation === "HOLD") {
        candidate.interview_stage = "ON_HOLD";
      } else if (recommendation === "NEXT_ROUND") {
        if (candidate.interview_stage === "ROUND_1_HR") candidate.interview_stage = "ROUND_2_TECH";
        else if (candidate.interview_stage === "ROUND_2_TECH") candidate.interview_stage = "ROUND_3_FINAL";
        else if (candidate.interview_stage === "ROUND_3_FINAL") candidate.interview_stage = "SELECTED";
        else if (candidate.interview_stage === "SCHEDULED") candidate.interview_stage = "ROUND_1_HR";
      }

      if (next_interview_date) candidate.interview_date = next_interview_date;
      if (next_interview_time) candidate.interview_time = next_interview_time;
      if (next_interview_mode) candidate.interview_mode = next_interview_mode;
      if (next_interview_link) candidate.interview_meeting_link = next_interview_link;

      await candidate.save();

      // If next round was scheduled with a date, trigger email
      if (next_interview_date) {
        try {
          const hrInfo = await resolveUserInfo(req.user, req.body);
          let hodEmail = candidate.requisition?.hod_email;
          let hodName = candidate.requisition?.hod_name;
          if (!hodEmail && candidate.requisition?.hod_id) {
            const hodUser = await User.findOne({
              where: { employee_id: candidate.requisition.hod_id },
              attributes: ["name", "email", "work_email"],
            });
            if (hodUser) {
              hodName = hodName || hodUser.name;
              hodEmail = hodUser.work_email || hodUser.email;
            }
          }

          await sendInterviewScheduleEmail({
            candidateName: candidate.candidate_name,
            candidateEmail: candidate.email,
            position: candidate.requisition?.position || "Position",
            department: candidate.requisition?.department || "General",
            requisitionCode: candidate.requisition?.requisition_code || "N/A",
            interviewRound: candidate.interview_stage || "SCHEDULED",
            interviewDate: candidate.interview_date,
            interviewTime: candidate.interview_time || "11:00 AM",
            interviewMode: candidate.interview_mode || "Online",
            meetingLink: candidate.interview_meeting_link || "Link will be shared shortly",
            interviewNotes: `Evaluated by ${evaluatorInfo.name} (${userRole.toUpperCase()}). Next round scheduled.`,
            hrName: hrInfo.name,
            hrEmail: hrInfo.email,
            hodName: hodName || "Department Head",
            hodEmail: hodEmail,
          });
        } catch (mErr) {
          console.warn("Could not dispatch schedule email on evaluation:", mErr.message);
        }
      }

      return res.json({
        success: true,
        message: "Candidate evaluation submitted successfully",
        data: candidate,
        evaluation: evaluationItem,
      });
    } catch (err) {
      console.error("Submit candidate evaluation error:", err);
      return res.status(500).json({ error: "Failed to submit candidate evaluation: " + err.message });
    }
  },

  // =========================================================================
  // 4. HOD CANDIDATE REVIEW & SHORTLISTING
  // =========================================================================

  /**
   * HOD selects/shortlists candidate and asks HR to proceed with the interview
   */
  async hodCandidateAction(req, res) {
    try {
      const { candidate_id } = req.params;
      const { action, feedback } = req.body;
      // action: "SHORTLIST_FOR_INTERVIEW" | "ON_HOLD" | "REJECT"

      const candidate = await RecruitmentCandidate.findByPk(candidate_id, {
        include: [{ model: RecruitmentRequisition, as: "requisition" }],
      });

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const decisionMaker = await resolveUserInfo(req.user, req.body);
      candidate.hod_decision_at = new Date();
      candidate.hod_decision_by_id = req.user.employee_id;
      candidate.hod_decision_by_name = decisionMaker.name;
      candidate.hod_feedback = feedback || null;

      if (action === "SHORTLIST_FOR_INTERVIEW" || action === "SHORTLIST") {
        candidate.hod_selection_status = "SHORTLISTED_FOR_INTERVIEW";
        candidate.interview_requested = true;
        candidate.interview_requested_at = new Date();
        candidate.interview_stage = "INTERVIEW_REQUESTED";

        // Also advance parent requisition status to INTERVIEWS_IN_PROGRESS
        if (candidate.requisition) {
          candidate.requisition.status = "INTERVIEWS_IN_PROGRESS";
          await candidate.requisition.save();
        }
      } else if (action === "ON_HOLD") {
        candidate.hod_selection_status = "ON_HOLD";
      } else if (action === "REJECT") {
        candidate.hod_selection_status = "REJECTED";
        candidate.interview_stage = "REJECTED";
      } else {
        return res.status(400).json({ error: "Invalid action. Must be SHORTLIST_FOR_INTERVIEW, ON_HOLD, or REJECT." });
      }

      await candidate.save();

      return res.json({
        success: true,
        message:
          action === "SHORTLIST_FOR_INTERVIEW" || action === "SHORTLIST"
            ? "Candidate shortlisted successfully! HR has been notified to proceed with the interview."
            : `Candidate status marked as ${candidate.hod_selection_status}.`,
        data: candidate,
      });
    } catch (err) {
      console.error("HOD candidate action error:", err);
      return res.status(500).json({ error: "Failed to record HOD selection: " + err.message });
    }
  },

  // =========================================================================
  // 5. INTERVIEW PROGRESSION & SCHEDULING (HR)
  // =========================================================================

  /**
   * HR schedules interview or advances candidate through interview stages
   */
  async updateInterviewStage(req, res) {
    try {
      const { candidate_id } = req.params;
      const {
        interview_stage,
        interview_date,
        interview_time,
        interview_mode,
        interview_meeting_link,
        interview_notes,
        candidate_email,
      } = req.body;

      const candidate = await RecruitmentCandidate.findByPk(candidate_id, {
        include: [{ model: RecruitmentRequisition, as: "requisition" }],
      });

      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      if (candidate_email && typeof candidate_email === "string" && candidate_email.trim()) {
        candidate.email = candidate_email.trim();
      }

      if (interview_stage) candidate.interview_stage = interview_stage;
      if (interview_date) candidate.interview_date = interview_date;
      if (interview_time) candidate.interview_time = interview_time;
      if (interview_mode) candidate.interview_mode = interview_mode;
      if (interview_meeting_link) candidate.interview_meeting_link = interview_meeting_link;
      if (interview_notes) candidate.interview_notes = interview_notes;

      // If scheduled, ensure stage reflects it
      if (interview_date && candidate.interview_stage === "INTERVIEW_REQUESTED") {
        candidate.interview_stage = "SCHEDULED";
      }

      await candidate.save();

      // Check if this is an interview scheduling or round advancement action
      const scheduledStages = [
        "SCHEDULED",
        "ROUND_1_HR",
        "ROUND_2_TECH",
        "ROUND_3_FINAL",
        "INTERVIEW_REQUESTED",
      ];

      const isInterviewMeeting =
        scheduledStages.includes(candidate.interview_stage) &&
        Boolean(candidate.interview_date || interview_date);

      let emailSent = false;
      let emailError = null;

      if (isInterviewMeeting) {
        try {
          // Resolve HR organizer details
          const hrInfo = await resolveUserInfo(req.user, req.body);
          let hrEmail = hrInfo.email;
          let hrName = hrInfo.name;

          if (!hrEmail && req.user?.employee_id) {
            try {
              const hrUser = await User.findOne({
                where: { employee_id: req.user.employee_id },
                attributes: ["name", "email", "work_email"],
              });
              if (hrUser) {
                hrEmail = hrUser.work_email || hrUser.email;
                hrName = hrName || hrUser.name;
              }
            } catch (e) {
              console.warn("Could not fetch HR user from DB:", e.message);
            }
          }

          // Resolve HOD details
          let hodName = candidate.requisition?.hod_name;
          let hodEmail = candidate.requisition?.hod_email;

          // Try looking up HOD user by hod_id from requisition
          if (!hodEmail && candidate.requisition?.hod_id) {
            try {
              const hodUser = await User.findOne({
                where: { employee_id: candidate.requisition.hod_id },
                attributes: ["name", "email", "work_email"],
              });
              if (hodUser) {
                hodName = hodName || hodUser.name;
                hodEmail = hodUser.work_email || hodUser.email;
              }
            } catch (e) {
              console.warn("Could not fetch HOD user by hod_id:", e.message);
            }
          }

          // Fallback: lookup HOD in the requisition department
          if (!hodEmail && candidate.requisition?.department) {
            try {
              const deptHod = await User.findOne({
                where: {
                  dept: candidate.requisition.department,
                  role: { [Op.or]: ["hod", "HOD", "Hod"] },
                },
                attributes: ["name", "email", "work_email"],
              });
              if (deptHod) {
                hodName = hodName || deptHod.name;
                hodEmail = deptHod.work_email || deptHod.email;
              }
            } catch (e) {
              console.warn("Could not fetch HOD user by dept:", e.message);
            }
          }

          const mailRes = await sendInterviewScheduleEmail({
            candidateName: candidate.candidate_name,
            candidateEmail: candidate.email,
            position: candidate.requisition?.position || "Position",
            department: candidate.requisition?.department || "General",
            requisitionCode: candidate.requisition?.requisition_code || "N/A",
            interviewRound: candidate.interview_stage || "SCHEDULED",
            interviewDate: candidate.interview_date || "To be confirmed",
            interviewTime: candidate.interview_time || "11:00 AM",
            interviewMode: candidate.interview_mode || "Online",
            meetingLink: candidate.interview_meeting_link || "Meeting link will be shared shortly",
            interviewNotes: candidate.interview_notes || "",
            hrName: hrName || "HR Department",
            hrEmail: hrEmail,
            hodName: hodName || "Department Head",
            hodEmail: hodEmail,
          });

          if (mailRes && (mailRes.messageId || mailRes.accepted?.length > 0)) {
            emailSent = true;
          }
        } catch (mErr) {
          console.error("Failed to send interview schedule email:", mErr.message);
          emailError = mErr.message;
        }
      }

      return res.json({
        success: true,
        message: "Candidate interview stage updated successfully",
        data: candidate,
        emailSent,
        emailError,
      });
    } catch (err) {
      console.error("Update interview stage error:", err);
      return res.status(500).json({ error: "Failed to update interview stage: " + err.message });
    }
  },

  /**
   * Delete candidate
   */
  async deleteCandidate(req, res) {
    try {
      const { candidate_id } = req.params;
      const candidate = await RecruitmentCandidate.findByPk(candidate_id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      await candidate.destroy();
      return res.json({ success: true, message: "Candidate deleted successfully" });
    } catch (err) {
      console.error("Delete candidate error:", err);
      return res.status(500).json({ error: "Failed to delete candidate" });
    }
  },

  // =========================================================================
  // 6. DASHBOARD & OVERVIEW STATS
  // =========================================================================

  /**
   * Get recruitment metrics & summary counts
   */
  async getRecruitmentStats(req, res) {
    try {
      const { role, dept, employee_id } = req.user;
      const isExecutiveOrHr = ["hr", "admin", "ceo", "coo", "hrmanager"].includes((role || "").toLowerCase());

      const reqWhere = {};
      if (!isExecutiveOrHr && (role || "").toLowerCase() === "hod") {
        reqWhere[Op.or] = [{ hod_id: employee_id }, { department: dept || "IT" }];
      }

      const totalRequisitions = await RecruitmentRequisition.count({ where: reqWhere });
      const pendingApproval = await RecruitmentRequisition.count({
        where: { ...reqWhere, status: "PENDING_CEO_COO_APPROVAL" },
      });
      const activeSourcing = await RecruitmentRequisition.count({
        where: { ...reqWhere, status: "SOURCING_CANDIDATES" },
      });
      const inHodReview = await RecruitmentRequisition.count({
        where: { ...reqWhere, status: "HOD_REVIEW" },
      });
      const interviewsActive = await RecruitmentRequisition.count({
        where: { ...reqWhere, status: "INTERVIEWS_IN_PROGRESS" },
      });

      // Candidate counts
      const candidateWhere = {};
      if (!isExecutiveOrHr && (role || "").toLowerCase() === "hod") {
        // Find matching requisition ids
        const myRequisitions = await RecruitmentRequisition.findAll({
          where: reqWhere,
          attributes: ["id"],
        });
        const reqIds = myRequisitions.map((r) => r.id);
        candidateWhere.requisition_id = { [Op.in]: reqIds };
      }

      const totalCandidates = await RecruitmentCandidate.count({ where: candidateWhere });
      const shortlistedForInterview = await RecruitmentCandidate.count({
        where: { ...candidateWhere, hod_selection_status: "SHORTLISTED_FOR_INTERVIEW" },
      });
      const pendingHodReview = await RecruitmentCandidate.count({
        where: { ...candidateWhere, hod_selection_status: "PENDING_REVIEW" },
      });

      return res.json({
        success: true,
        data: {
          totalRequisitions,
          pendingApproval,
          activeSourcing,
          inHodReview,
          interviewsActive,
          totalCandidates,
          shortlistedForInterview,
          pendingHodReview,
        },
      });
    } catch (err) {
      console.error("Recruitment stats error:", err);
      return res.status(500).json({ error: "Failed to fetch recruitment stats" });
    }
  },
};

module.exports = RecruitmentController;
