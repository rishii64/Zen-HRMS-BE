const {
  TrainingProgram,
  TrainingSession,
  TrainingEnrollment,
  TrainingAssessment,
  AssessmentSubmission,
  TrainingFeedback,
  EmployeeCertification,
  Employee,
  User,
  Onboarding,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");

// Helper: Normalize user role & resolve departmental leadership from designation
const getEffectiveRole = (req) => {
  const raw = (req.user?.role || "").toLowerCase().trim();
  const canonical = raw === "employees" ? "employee" : raw;
  if (canonical === "employee") {
    const desig = (req.user?.designation || "").toLowerCase().trim();
    if (/\b(hod|head|department head|head of)\b/i.test(desig)) return "hod";
    if (/\b(manager|mgr|agm|dgm|gm|director)\b/i.test(desig)) return "manager";
    if (/\b(lead|tl|supervisor)\b/i.test(desig) || desig.includes("team lead") || desig.includes("tech lead")) return "teamlead";
  }
  return canonical;
};

// Helper: Check if user has HR or elevated management role
const isHROrAdmin = (role) => {
  return [
    "hr",
    "admin",
    "management",
    "hrmanager",
    "ceo",
    "coo",
    "cto",
    "cfo",
    "vp",
    "secretary",
  ].includes(role);
};

// Helper: Check if user has departmental leadership role (TL, HOD, Manager, AGM, DGM, etc.)
const isHODOrManager = (role, req = null) => {
  if (["hod", "manager", "teamlead"].includes(role)) return true;
  const desig = String(req?.user?.designation || "").toLowerCase().trim();
  return (
    /\b(hod|head|manager|mgr|lead|tl|agm|dgm|gm|director|supervisor)\b/i.test(desig) ||
    desig.includes("team lead") ||
    desig.includes("tech lead") ||
    desig.includes("department head") ||
    desig.includes("head of")
  );
};

// Helper: Clean and sanitize date fields so empty strings or "Invalid date" never break PostgreSQL
const cleanDate = (val) => {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (
      !trimmed ||
      trimmed === "Invalid date" ||
      trimmed === "Invalid Date" ||
      trimmed === "null" ||
      trimmed === "undefined"
    ) {
      return null;
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;
    return trimmed.split("T")[0];
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split("T")[0];
  }
  return null;
};

// ============================================================================
// 1. DASHBOARD & SUMMARY STATS
// ============================================================================
exports.getTrainingDashboardStats = async (req, res) => {
  try {
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;
    const userDept = req.user?.dept || null;

    let totalPrograms = 0;
    let completedPrograms = 0;
    let upcomingSessions = 0;
    let pendingApprovals = 0;
    let myAssignedTrainings = 0;
    let myCompletedTrainings = 0;
    let myPendingAssessments = 0;
    let complianceRate = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    // Common query filter for upcoming sessions
    const upcomingSessionsCount = await TrainingSession.count({
      where: {
        session_date: { [Op.gte]: todayStr },
        status: { [Op.ne]: "Cancelled" },
      },
    });
    upcomingSessions = upcomingSessionsCount;

    if (isHROrAdmin(role)) {
      totalPrograms = await TrainingProgram.count({
        where: { status: { [Op.ne]: "Archived" } },
      });
      completedPrograms = await TrainingProgram.count({
        where: { status: "Completed" },
      });
      pendingApprovals = await EmployeeCertification.count({
        where: { status: { [Op.in]: ["Submitted", "Under Review"] } },
      });
      const pendingDeptProposals = await TrainingProgram.count({
        where: { proposal_status: "Pending Approval" },
      });

      const totalMandatory = await TrainingEnrollment.count();
      const completedMandatory = await TrainingEnrollment.count({
        where: { completion_status: "Completed" },
      });
      complianceRate =
        totalMandatory > 0
          ? Math.round((completedMandatory / totalMandatory) * 100)
          : 100;

      return res.json({
        success: true,
        data: {
          role,
          totalPrograms,
          completedPrograms,
          upcomingSessions,
          pendingApprovals,
          pendingDeptProposals,
          complianceRate,
        },
      });
    }

    if (isHODOrManager(role)) {
      // HOD / Manager scope
      totalPrograms = await TrainingProgram.count({
        where: {
          [Op.or]: [
            { type: "HR" },
            { department: userDept || "" },
            { created_by_id: empId },
          ],
          status: { [Op.ne]: "Archived" },
        },
      });
      const pendingDeptProposals = await TrainingProgram.count({
        where: {
          created_by_id: empId,
          proposal_status: "Pending Approval",
        },
      });

      return res.json({
        success: true,
        data: {
          role,
          totalPrograms,
          upcomingSessions,
          pendingDeptProposals,
          department: userDept,
        },
      });
    }

    // Standard Employee stats
    if (empId) {
      myAssignedTrainings = await TrainingEnrollment.count({
        where: { employee_id: empId },
      });
      myCompletedTrainings = await TrainingEnrollment.count({
        where: {
          employee_id: empId,
          completion_status: "Completed",
        },
      });
      myPendingAssessments = await TrainingEnrollment.count({
        where: {
          employee_id: empId,
          assessment_status: "Pending",
        },
      });
      const myCertificationsCount = await EmployeeCertification.count({
        where: { employee_id: empId },
      });

      return res.json({
        success: true,
        data: {
          role: "employee",
          myAssignedTrainings,
          myCompletedTrainings,
          myPendingAssessments,
          myCertificationsCount,
          upcomingSessions,
        },
      });
    }

    return res.json({
      success: true,
      data: { totalPrograms: 0, upcomingSessions: 0 },
    });
  } catch (error) {
    console.error("getTrainingDashboardStats error:", error);
    res.status(500).json({ error: "Failed to fetch training dashboard stats" });
  }
};

// ============================================================================
// 2. TRAINING PROGRAMS (HR & DEPARTMENTAL)
// ============================================================================
exports.getTrainingPrograms = async (req, res) => {
  try {
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;
    const userDept = req.user?.dept || "";
    const {
      type, // "HR", "DEPARTMENTAL"
      category,
      delivery_mode,
      department,
      status,
      search,
    } = req.query;

    const where = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (delivery_mode) where.delivery_mode = delivery_mode;
    if (status) where.status = status;

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } },
        { trainer_name: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Role-based scope enforcement
    if (isHROrAdmin(role)) {
      if (department) where.department = department;
    } else if (isHODOrManager(role)) {
      // HODs can see all HR programs + Departmental programs for their dept
      if (type === "DEPARTMENTAL") {
        where[Op.or] = [
          { department: userDept },
          { created_by_id: empId },
        ];
      }
    } else {
      // Employees only see Published, Approved, or In Progress trainings
      where.status = { [Op.in]: ["Published", "In Progress", "Completed"] };
      where.proposal_status = "Approved";
      if (type === "DEPARTMENTAL" && userDept) {
        where[Op.or] = [
          { department: null },
          { department: userDept },
          { target_audience_type: "ALL" },
        ];
      }
    }

    const programs = await TrainingProgram.findAll({
      where,
      include: [
        {
          model: TrainingSession,
          as: "sessions",
          required: false,
        },
        {
          model: TrainingAssessment,
          as: "assessment",
          attributes: [
            "id",
            "title",
            "duration_minutes",
            "total_marks",
            "pass_percentage",
            "max_attempts",
            "is_active",
          ],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Attach enrollment stats to each program
    const enriched = await Promise.all(
      programs.map(async (p) => {
        const plain = p.toJSON();
        const enrollCount = await TrainingEnrollment.count({
          where: { program_id: p.id },
        });
        const completedCount = await TrainingEnrollment.count({
          where: { program_id: p.id, completion_status: "Completed" },
        });
        plain.enrolled_count = enrollCount;
        plain.completed_count = completedCount;
        return plain;
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("getTrainingPrograms error:", error);
    res.status(500).json({ error: "Failed to fetch training programs" });
  }
};

exports.getTrainingProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;

    const program = await TrainingProgram.findByPk(id, {
      include: [
        {
          model: TrainingSession,
          as: "sessions",
        },
        {
          model: TrainingAssessment,
          as: "assessment",
        },
      ],
    });

    if (!program) {
      return res.status(404).json({ error: "Training program not found" });
    }

    const plain = program.toJSON();

    // If assessment exists and user is employee, mask correct answers from questions
    if (plain.assessment && !isHROrAdmin(role) && plain.created_by_id !== empId) {
      if (Array.isArray(plain.assessment.questions)) {
        plain.assessment.questions = plain.assessment.questions.map((q) => {
          const { correct_answer, explanation, ...safeQ } = q;
          return safeQ;
        });
      }
    }

    // Attach current user's enrollment record if employee
    if (empId) {
      const userEnrollment = await TrainingEnrollment.findOne({
        where: { program_id: id, employee_id: empId },
      });
      plain.user_enrollment = userEnrollment;
    }

    res.json({ success: true, data: plain });
  } catch (error) {
    console.error("getTrainingProgramById error:", error);
    res.status(500).json({ error: "Failed to fetch program details" });
  }
};

exports.createTrainingProgram = async (req, res) => {
  try {
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;
    const empName = req.user?.name || "HR Administrator";
    const userDept = req.user?.dept || "";

    const {
      title,
      description,
      objectives,
      type = "HR",
      category = "Technical",
      delivery_mode = "Offline",
      department,
      target_audience_type = "ALL",
      target_employee_ids = [],
      is_mandatory = false,
      is_onboarding_mandatory = false,
      duration_hours = 2.0,
      completion_criteria,
      trainer_type = "INTERNAL",
      trainer_employee_id,
      trainer_name,
      trainer_email,
      trainer_bio,
      venue,
      meeting_link,
      session_instructions,
      learning_materials = [],
      start_date,
      end_date,
      due_date,
      capacity = 50,
      assessment_required = false,
      feedback_required = true,
      certificate_provided = true,
      company_logo_url: bodyLogoUrl,
      // Optional initial session details
      initial_session_date,
      initial_session_start_time,
      initial_session_end_time,
    } = req.body;

    const company_logo_url = req.file ? `/uploads/${req.file.filename}` : (bodyLogoUrl || null);

    if (!title) {
      return res.status(400).json({ error: "Training title is required" });
    }

    // Generate unique code TRN-YYYY-XXX
    const currentYear = new Date().getFullYear();
    let num = (await TrainingProgram.count()) + 1;
    let code = `TRN-${currentYear}-${String(num).padStart(3, "0")}`;
    while (await TrainingProgram.findOne({ where: { code } })) {
      num++;
      code = `TRN-${currentYear}-${String(num).padStart(3, "0")}`;
    }

    // Permissions logic:
    // HODs/Managers can directly create departmental training for their department; HR oversees all programs
    let initialStatus = "Published";
    let proposalStatus = "Approved";
    let targetDept = department;

    if (type === "DEPARTMENTAL") {
      if (!isHROrAdmin(role)) {
        if (!isHODOrManager(role)) {
          return res.status(403).json({
            error: "Only authorized HODs, Managers, or HR can create departmental training",
          });
        }
        // HOD creates directly for their own department; immediately published
        targetDept = userDept || department;
        initialStatus = "Published";
        proposalStatus = "Approved";
      }
    } else {
      // Only HR can create company-wide HR training
      if (!isHROrAdmin(role)) {
        return res.status(403).json({
          error: "Only HR administrators can create central HR training programs",
        });
      }
    }

    const program = await TrainingProgram.create({
      code,
      title,
      description,
      objectives,
      type,
      category,
      delivery_mode,
      department: targetDept,
      target_audience_type,
      target_employee_ids,
      is_mandatory: Boolean(is_mandatory),
      is_onboarding_mandatory: Boolean(is_onboarding_mandatory),
      duration_hours: parseFloat(duration_hours) || 2.0,
      completion_criteria,
      trainer_type,
      trainer_employee_id,
      trainer_name,
      trainer_email,
      trainer_bio,
      venue,
      meeting_link,
      session_instructions,
      learning_materials,
      status: initialStatus,
      proposal_status: proposalStatus,
      created_by_id: empId,
      created_by_name: empName,
      created_by_role: role,
      approved_by_id: isHROrAdmin(role) || isHODOrManager(role) ? empId : null,
      approved_by_name: isHROrAdmin(role) || isHODOrManager(role) ? empName : null,
      approved_at: new Date(),
      start_date: cleanDate(start_date),
      end_date: cleanDate(end_date),
      due_date: cleanDate(due_date),
      capacity: parseInt(capacity, 10) || 50,
      assessment_required: Boolean(assessment_required),
      feedback_required: Boolean(feedback_required),
      certificate_provided: Boolean(certificate_provided),
      company_logo_url,
    });

    // Create initial session if date provided
    const validSessionDate = cleanDate(initial_session_date || start_date);
    if (validSessionDate) {
      await TrainingSession.create({
        program_id: program.id,
        batch_name: "Batch 1 - Initial Session",
        session_date: validSessionDate,
        start_time: initial_session_start_time || "10:00 AM",
        end_time: initial_session_end_time || "01:00 PM",
        venue_or_link: delivery_mode === "Online" ? meeting_link : venue,
        trainer_name: trainer_name || empName,
        capacity: parseInt(capacity, 10) || 50,
        status: "Scheduled",
      });
    }

    // Auto-enroll target employees if target_audience_type is DEPARTMENT or specific employee ids
    if (proposalStatus === "Approved") {
      let targetEmployees = [];
      if ((target_audience_type === "DEPARTMENT" || type === "DEPARTMENTAL") && targetDept) {
        targetEmployees = await Employee.findAll({
          where: {
            dept: targetDept,
            status: { [Op.in]: ["Active", "active"] },
          },
        });
      } else if (
        Array.isArray(target_employee_ids) &&
        target_employee_ids.length > 0
      ) {
        targetEmployees = await Employee.findAll({
          where: { employee_id: { [Op.in]: target_employee_ids } },
        });
      }

      if (targetEmployees.length > 0) {
        const enrollmentRecords = targetEmployees.map((emp) => ({
          program_id: program.id,
          employee_id: emp.employee_id,
          employee_name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id,
          employee_email: emp.email || emp.work_email,
          department: emp.dept,
          enrollment_type: "MANUAL_ASSIGNMENT",
          due_date,
          assessment_status: Boolean(assessment_required) ? "Pending" : "Not Applicable",
        }));
        await TrainingEnrollment.bulkCreate(enrollmentRecords, {
          ignoreDuplicates: true,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Training program created and published successfully.",
      data: program,
    });
  } catch (error) {
    console.error("createTrainingProgram error:", error);
    res.status(500).json({ error: "Failed to create training program" });
  }
};

exports.updateTrainingProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;

    const program = await TrainingProgram.findByPk(id);
    if (!program) {
      return res.status(404).json({ error: "Training program not found" });
    }

    // Check authorization: HR or creator
    if (!isHROrAdmin(role) && program.created_by_id !== empId) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }

    const updateData = { ...req.body };
    if (updateData.start_date !== undefined) updateData.start_date = cleanDate(updateData.start_date);
    if (updateData.end_date !== undefined) updateData.end_date = cleanDate(updateData.end_date);
    if (updateData.due_date !== undefined) updateData.due_date = cleanDate(updateData.due_date);
    if (req.file) {
      updateData.company_logo_url = `/uploads/${req.file.filename}`;
    }

    await program.update(updateData);

    if (updateData.company_logo_url) {
      await TrainingEnrollment.update(
        { company_logo_url: updateData.company_logo_url },
        { where: { program_id: id } }
      );
    }

    res.json({
      success: true,
      message: "Training program updated successfully",
      data: program,
    });
  } catch (error) {
    console.error("updateTrainingProgram error:", error);
    res.status(500).json({ error: "Failed to update training program" });
  }
};

exports.uploadProgramLogo = async (req, res) => {
  try {
    const { programId } = req.params;
    const role = getEffectiveRole(req);

    if (!isHROrAdmin(role) && !isHODOrManager(role, req)) {
      return res.status(403).json({ error: "Only HR or Managers can customize the training company logo" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const logoUrl = `/uploads/${req.file.filename}`;

    const program = await TrainingProgram.findByPk(programId);
    if (!program) {
      return res.status(404).json({ error: "Training program not found" });
    }

    await program.update({ company_logo_url: logoUrl });

    // Propagate logo to any existing enrollments for this program so certificates reflect it
    await TrainingEnrollment.update(
      { company_logo_url: logoUrl },
      { where: { program_id: programId } }
    );

    res.json({
      success: true,
      message: "Company logo uploaded and updated successfully",
      data: { company_logo_url: logoUrl },
    });
  } catch (error) {
    console.error("uploadProgramLogo error:", error);
    res.status(500).json({ error: "Failed to upload company logo" });
  }
};

exports.deleteTrainingProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getEffectiveRole(req);

    if (!isHROrAdmin(role)) {
      return res.status(403).json({ error: "Only HR administrators can delete training programs" });
    }

    const program = await TrainingProgram.findByPk(id);
    if (!program) {
      return res.status(404).json({ error: "Training program not found" });
    }

    await program.destroy();

    res.json({ success: true, message: "Training program deleted successfully" });
  } catch (error) {
    console.error("deleteTrainingProgram error:", error);
    res.status(500).json({ error: "Failed to delete training program" });
  }
};

// Workflow: HR review of Departmental training requests
exports.reviewDepartmentalProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;
    const empName = req.user?.name || "HR Reviewer";

    if (!isHROrAdmin(role)) {
      return res.status(403).json({
        error: "Only HR administrators can review departmental training proposals",
      });
    }

    const { decision, rejection_reason } = req.body; // "Approved", "Rejected", "Changes Requested"

    const program = await TrainingProgram.findByPk(id);
    if (!program) {
      return res.status(404).json({ error: "Training program not found" });
    }

    if (decision === "Approved") {
      await program.update({
        proposal_status: "Approved",
        status: "Published",
        approved_by_id: empId,
        approved_by_name: empName,
        approved_at: new Date(),
        rejection_reason: null,
      });
    } else if (decision === "Rejected") {
      await program.update({
        proposal_status: "Rejected",
        status: "Cancelled",
        rejection_reason: rejection_reason || "Proposal rejected by HR",
      });
    } else if (decision === "Changes Requested") {
      await program.update({
        proposal_status: "Changes Requested",
        rejection_reason: rejection_reason || "Modifications requested by HR",
      });
    }

    res.json({
      success: true,
      message: `Departmental proposal marked as ${decision}`,
      data: program,
    });
  } catch (error) {
    console.error("reviewDepartmentalProposal error:", error);
    res.status(500).json({ error: "Failed to review departmental proposal" });
  }
};

// ============================================================================
// 3. SESSIONS & ATTENDANCE
// ============================================================================
exports.addSession = async (req, res) => {
  try {
    const { programId } = req.params;
    const {
      batch_name,
      session_date,
      start_time,
      end_time,
      venue_or_link,
      trainer_name,
      capacity,
    } = req.body;

    const program = await TrainingProgram.findByPk(programId);
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    const session = await TrainingSession.create({
      program_id: programId,
      batch_name: batch_name || "New Batch",
      session_date,
      start_time: start_time || "10:00 AM",
      end_time: end_time || "12:00 PM",
      venue_or_link: venue_or_link || program.venue || program.meeting_link,
      trainer_name: trainer_name || program.trainer_name,
      capacity: capacity || program.capacity || 50,
      status: "Scheduled",
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error("addSession error:", error);
    res.status(500).json({ error: "Failed to add training session" });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { attendance_status, attendance_notes } = req.body; // "Attended", "Absent", "Excused"
    const empName = req.user?.name || "Evaluator";

    const enrollment = await TrainingEnrollment.findByPk(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment record not found" });
    }

    const updates = {
      attendance_status,
      attendance_marked_at: new Date(),
      attendance_marked_by: empName,
      attendance_notes,
    };

    if (attendance_status === "Attended") {
      // If program has no assessment, attendance completes training!
      const program = await TrainingProgram.findByPk(enrollment.program_id);
      if (program && !program.assessment_required) {
        updates.completion_status = "Completed";
        updates.completed_at = new Date();
        updates.certificate_issued = program.certificate_provided;
        if (program.certificate_provided && !enrollment.certificate_number) {
          updates.certificate_number = `CERT-${enrollment.employee_id}-${Date.now().toString().slice(-4)}`;
        }
      } else {
        updates.completion_status = "In Progress";
        updates.assessment_status = "Pending";
      }
    }

    await enrollment.update(updates);

    res.json({
      success: true,
      message: `Attendance marked as ${attendance_status}`,
      data: enrollment,
    });
  } catch (error) {
    console.error("markAttendance error:", error);
    res.status(500).json({ error: "Failed to record attendance" });
  }
};

exports.bulkMarkAttendance = async (req, res) => {
  try {
    const { attendanceRecords } = req.body; // Array of { enrollment_id, attendance_status, notes }
    const empName = req.user?.name || "Evaluator";

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ error: "No attendance records provided" });
    }

    for (const rec of attendanceRecords) {
      const enrollment = await TrainingEnrollment.findByPk(rec.enrollment_id);
      if (enrollment) {
        const updates = {
          attendance_status: rec.attendance_status || "Attended",
          attendance_marked_at: new Date(),
          attendance_marked_by: empName,
          attendance_notes: rec.notes || "",
        };

        if (rec.attendance_status === "Attended") {
          const program = await TrainingProgram.findByPk(enrollment.program_id);
          if (program && !program.assessment_required) {
            updates.completion_status = "Completed";
            updates.completed_at = new Date();
            updates.certificate_issued = program.certificate_provided;
            if (program.certificate_provided && !enrollment.certificate_number) {
              updates.certificate_number = `CERT-${enrollment.employee_id}-${Date.now().toString().slice(-4)}`;
            }
          } else {
            updates.completion_status = "In Progress";
            updates.assessment_status = "Pending";
          }
        }

        await enrollment.update(updates);
      }
    }

    res.json({
      success: true,
      message: `Successfully updated attendance for ${attendanceRecords.length} employees`,
    });
  } catch (error) {
    console.error("bulkMarkAttendance error:", error);
    res.status(500).json({ error: "Failed to process bulk attendance" });
  }
};

// ============================================================================
// 4. ENROLLMENTS & ASSIGNMENTS
// ============================================================================
exports.assignTraining = async (req, res) => {
  try {
    const { programId } = req.params;
    const { employee_ids, department, assign_all, due_date } = req.body;

    const program = await TrainingProgram.findByPk(programId);
    if (!program) {
      return res.status(404).json({ error: "Training program not found" });
    }

    let targetEmployees = [];

    if (assign_all) {
      targetEmployees = await Employee.findAll({
        where: { status: "Active" },
      });
    } else if (department) {
      targetEmployees = await Employee.findAll({
        where: { dept: department, status: "Active" },
      });
    } else if (Array.isArray(employee_ids) && employee_ids.length > 0) {
      targetEmployees = await Employee.findAll({
        where: { employee_id: { [Op.in]: employee_ids } },
      });
    }

    if (targetEmployees.length === 0) {
      return res.status(400).json({ error: "No eligible employees found to assign" });
    }

    // Filter out already enrolled employees to prevent duplicates
    const existingEnrollments = await TrainingEnrollment.findAll({
      where: {
        program_id: programId,
        employee_id: { [Op.in]: targetEmployees.map((e) => e.employee_id) },
      },
      attributes: ["employee_id"],
    });
    const existingEmpIds = new Set(existingEnrollments.map((e) => e.employee_id));
    const newEmployees = targetEmployees.filter((e) => !existingEmpIds.has(e.employee_id));

    if (newEmployees.length === 0) {
      return res.json({
        success: true,
        message: "All selected employees are already enrolled in this program.",
      });
    }

    const records = newEmployees.map((emp) => ({
      program_id: programId,
      employee_id: emp.employee_id,
      employee_name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id,
      employee_email: emp.email || emp.work_email,
      department: emp.dept,
      enrollment_type: program.is_onboarding_mandatory
        ? "AUTO_ONBOARDING"
        : "MANUAL_ASSIGNMENT",
      due_date: due_date || program.due_date,
      assessment_status: program.assessment_required ? "Pending" : "Not Applicable",
    }));

    await TrainingEnrollment.bulkCreate(records);

    res.json({
      success: true,
      message: `Training assigned to ${newEmployees.length} employee(s) successfully.`,
    });
  } catch (error) {
    console.error("assignTraining error:", error);
    res.status(500).json({ error: "Failed to assign training" });
  }
};

exports.getProgramEnrollments = async (req, res) => {
  try {
    const { programId } = req.params;

    const enrollments = await TrainingEnrollment.findAll({
      where: { program_id: programId },
      include: [
        {
          model: TrainingSession,
          as: "session",
          attributes: ["id", "batch_name", "session_date", "start_time", "end_time"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, data: enrollments });
  } catch (error) {
    console.error("getProgramEnrollments error:", error);
    res.status(500).json({ error: "Failed to fetch program enrollments" });
  }
};

// Employee personal dashboard: My Training
exports.getMyTrainings = async (req, res) => {
  try {
    const empId = req.user?.employee_id;
    if (!empId) {
      return res.status(400).json({ error: "Employee ID not identified in session" });
    }

    const enrollments = await TrainingEnrollment.findAll({
      where: { employee_id: empId },
      include: [
        {
          model: TrainingProgram,
          as: "program",
          where: {
            status: { [Op.in]: ["Published", "In Progress", "Completed"] },
            proposal_status: "Approved",
          },
          required: true,
          include: [
            {
              model: TrainingSession,
              as: "sessions",
            },
            {
              model: TrainingAssessment,
              as: "assessment",
              attributes: [
                "id",
                "title",
                "duration_minutes",
                "total_marks",
                "pass_percentage",
                "max_attempts",
                "is_active",
              ],
            },
          ],
        },
        {
          model: TrainingSession,
          as: "session",
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Also fetch latest exam submission for each enrolled program to track attendance & publishing
    const enriched = await Promise.all(
      enrollments.map(async (enr) => {
        const plain = enr.toJSON();
        const submission = await AssessmentSubmission.findOne({
          where: {
            program_id: enr.program_id,
            employee_id: empId,
          },
          order: [["created_at", "DESC"]],
        });
        plain.submission = submission;
        plain.has_attended_exam = Boolean(submission) || (enr.assessment_attempts_used > 0);
        plain.published_submission = (submission && submission.is_published) ? submission : null;
        if (plain.certificate_issued && !plain.certificate_number) {
          plain.certificate_number = `CERT-${empId}-${enr.id.slice(0, 6).toUpperCase()}`;
          enr.update({ certificate_number: plain.certificate_number }).catch(() => {});
        }
        return plain;
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error("getMyTrainings error:", error);
    res.status(500).json({ error: "Failed to fetch employee trainings" });
  }
};

// ============================================================================
// 5. POST-TRAINING ASSESSMENTS
// ============================================================================
exports.getAssessmentForProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;

    const assessment = await TrainingAssessment.findOne({
      where: { program_id: programId },
    });

    if (!assessment) {
      return res.json({
        success: true,
        data: null,
        message: "No assessment configured for this program",
      });
    }

    const plain = assessment.toJSON();
    plain.max_attempts = 1;

    // Check employee single-attempt status
    if (empId) {
      const existingSubmission = await AssessmentSubmission.findOne({
        where: { assessment_id: assessment.id, employee_id: empId },
      });
      plain.already_attended = Boolean(existingSubmission);
      plain.attempts_used = existingSubmission ? 1 : 0;
      plain.attempts_remaining = existingSubmission ? 0 : 1;

      // If student taking exam, mask correct answers and explanations
      if (!isHROrAdmin(role)) {
        if (existingSubmission) {
          plain.questions = []; // Already completed; no retakes allowed
        } else if (Array.isArray(plain.questions)) {
          plain.questions = plain.questions.map((q) => {
            const { correct_answer, explanation, ...safeQ } = q;
            return safeQ;
          });
        }
      }
    }

    res.json({ success: true, data: plain });
  } catch (error) {
    console.error("getAssessmentForProgram error:", error);
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
};

exports.createOrUpdateAssessment = async (req, res) => {
  try {
    const { programId } = req.params;
    const role = getEffectiveRole(req);

    if (!isHROrAdmin(role) && !isHODOrManager(role)) {
      return res.status(403).json({
        error: "Only HR or authorized managers can configure assessments",
      });
    }

    const {
      title,
      instructions,
      duration_minutes = 30,
      total_marks = 100,
      pass_percentage = 60,
      questions = [],
      is_active = true,
    } = req.body;

    // Strict single attempt rule
    const max_attempts = 1;
    const allow_retake = false;

    let assessment = await TrainingAssessment.findOne({
      where: { program_id: programId },
    });

    if (assessment) {
      await assessment.update({
        title,
        instructions,
        duration_minutes: parseInt(duration_minutes, 10),
        total_marks: parseFloat(total_marks),
        pass_percentage: parseFloat(pass_percentage),
        max_attempts,
        questions,
        is_active: Boolean(is_active),
        allow_retake,
      });
    } else {
      assessment = await TrainingAssessment.create({
        program_id: programId,
        title: title || "Post-Training Assessment",
        instructions,
        duration_minutes: parseInt(duration_minutes, 10),
        total_marks: parseFloat(total_marks),
        pass_percentage: parseFloat(pass_percentage),
        max_attempts,
        questions,
        is_active: Boolean(is_active),
        allow_retake,
      });

      // Mark assessment_required on program
      await TrainingProgram.update(
        { assessment_required: true },
        { where: { id: programId } }
      );
    }

    res.json({
      success: true,
      message: "Assessment saved successfully",
      data: assessment,
    });
  } catch (error) {
    console.error("createOrUpdateAssessment error:", error);
    res.status(500).json({ error: "Failed to configure assessment" });
  }
};

exports.submitAssessment = async (req, res) => {
  try {
    const { programId } = req.params;
    const empId = req.user?.employee_id;
    const empName = req.user?.name || "Employee";
    const { answers, started_at } = req.body; // Array of { question_id, employee_answer }

    const assessment = await TrainingAssessment.findOne({
      where: { program_id: programId },
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Strict rule: After attending exam once, employees cannot retake them
    const existingSubmission = await AssessmentSubmission.findOne({
      where: { assessment_id: assessment.id, employee_id: empId },
    });

    if (existingSubmission) {
      return res.status(400).json({
        error: "You have already attended and submitted this examination. Retakes are strictly not permitted.",
      });
    }

    const currentAttempt = 1;

    // Evaluate answers
    let autoEvaluatedScore = 0;
    let hasDescriptive = false;
    const evaluatedAnswers = (assessment.questions || []).map((q) => {
      const submitted = (answers || []).find((a) => a.question_id === q.id);
      const empAnswer = submitted ? submitted.employee_answer : null;

      if (q.type === "MCQ" || q.type === "TRUE_FALSE") {
        const isCorrect =
          empAnswer !== null &&
          String(empAnswer).trim().toLowerCase() ===
            String(q.correct_answer).trim().toLowerCase();
        const marksAwarded = isCorrect ? parseFloat(q.marks) || 0 : 0;
        autoEvaluatedScore += marksAwarded;

        return {
          question_id: q.id,
          question: q.question,
          type: q.type,
          employee_answer: empAnswer,
          is_correct: isCorrect,
          marks_awarded: marksAwarded,
          max_marks: parseFloat(q.marks) || 0,
        };
      }

      // Descriptive questions require manual grading
      hasDescriptive = true;
      return {
        question_id: q.id,
        question: q.question,
        type: q.type,
        employee_answer: empAnswer,
        is_correct: null,
        marks_awarded: 0,
        max_marks: parseFloat(q.marks) || 0,
        evaluator_feedback: "",
      };
    });

    const totalPossibleMarks = assessment.total_marks || 100;
    let totalScore = autoEvaluatedScore;
    let percentage = (totalScore / totalPossibleMarks) * 100;
    let passStatus = "Pending Evaluation";

    if (!hasDescriptive) {
      passStatus = percentage >= assessment.pass_percentage ? "Passed" : "Failed";
    }

    const submission = await AssessmentSubmission.create({
      assessment_id: assessment.id,
      program_id: programId,
      employee_id: empId,
      employee_name: empName,
      attempt_number: currentAttempt,
      answers: evaluatedAnswers,
      auto_evaluated_score: autoEvaluatedScore,
      manual_evaluated_score: 0,
      total_score: totalScore,
      percentage: Math.round(percentage * 10) / 10,
      pass_status: passStatus,
      requires_manual_grading: hasDescriptive,
      is_published: false, // Results require HR release per requirement 2.E!
      started_at,
      submitted_at: new Date(),
    });

    // Update enrollment status
    const enrollment = await TrainingEnrollment.findOne({
      where: { program_id: programId, employee_id: empId },
    });

    if (enrollment) {
      const newAttempts = (enrollment.assessment_attempts_used || 0) + 1;
      const updates = {
        assessment_attempts_used: newAttempts,
      };

      if (!hasDescriptive) {
        updates.assessment_status = passStatus;
        updates.assessment_score = Math.round(percentage * 10) / 10;
        if (passStatus === "Passed") {
          updates.completion_status = "Completed";
          updates.completed_at = new Date();
          updates.certificate_issued = true;
          if (!enrollment.certificate_number) {
            updates.certificate_number = `CERT-${empId}-${Date.now().toString().slice(-4)}`;
          }
        }
      } else {
        updates.assessment_status = "Under Evaluation";
      }
      await enrollment.update(updates);
    }

    res.json({
      success: true,
      message: hasDescriptive
        ? "Assessment submitted successfully. Descriptive answers will be evaluated by your trainer/HR."
        : `Assessment submitted! You scored ${percentage.toFixed(1)}%. Result is pending official release.`,
      data: {
        submission_id: submission.id,
        attempt_number: currentAttempt,
        requires_manual_grading: hasDescriptive,
      },
    });
  } catch (error) {
    console.error("submitAssessment error:", error);
    res.status(500).json({ error: "Failed to submit assessment" });
  }
};

exports.evaluateDescriptiveAnswers = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;
    const empName = req.user?.name || "Evaluator";

    if (!isHROrAdmin(role) && !isHODOrManager(role)) {
      return res.status(403).json({ error: "Only authorized evaluators can grade assessments" });
    }

    const { manualEvaluations } = req.body; // Array of { question_id, marks_awarded, feedback }

    const submission = await AssessmentSubmission.findByPk(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const assessment = await TrainingAssessment.findByPk(submission.assessment_id);
    let additionalScore = 0;

    const updatedAnswers = (submission.answers || []).map((ans) => {
      const evalItem = (manualEvaluations || []).find((e) => e.question_id === ans.question_id);
      if (evalItem && ans.type === "DESCRIPTIVE") {
        const marks = parseFloat(evalItem.marks_awarded) || 0;
        additionalScore += marks;
        return {
          ...ans,
          marks_awarded: marks,
          is_correct: marks > 0,
          evaluator_feedback: evalItem.feedback || "",
        };
      }
      return ans;
    });

    const finalTotal = submission.auto_evaluated_score + additionalScore;
    const totalPossible = assessment ? assessment.total_marks || 100 : 100;
    const percentage = (finalTotal / totalPossible) * 100;
    const passPercentage = assessment ? assessment.pass_percentage || 60 : 60;
    const passStatus = percentage >= passPercentage ? "Passed" : "Failed";

    await submission.update({
      answers: updatedAnswers,
      manual_evaluated_score: additionalScore,
      total_score: finalTotal,
      percentage: Math.round(percentage * 10) / 10,
      pass_status: passStatus,
      requires_manual_grading: false,
      evaluated_by_id: empId,
      evaluated_by_name: empName,
      evaluated_at: new Date(),
    });

    res.json({
      success: true,
      message: "Descriptive answers evaluated and scores updated successfully",
      data: submission,
    });
  } catch (error) {
    console.error("evaluateDescriptiveAnswers error:", error);
    res.status(500).json({ error: "Failed to evaluate descriptive answers" });
  }
};

// HR controls result publication to employees
exports.publishResults = async (req, res) => {
  try {
    const { programId } = req.params;
    const role = getEffectiveRole(req);
    const empName = req.user?.name || "HR Admin";

    if (!isHROrAdmin(role)) {
      return res.status(403).json({
        error: "Only HR administrators can release or publish assessment results",
      });
    }

    const { submission_ids, publish_all = true } = req.body;

    let companyLogoUrl = req.body?.company_logo_url || null;
    if (req.file) {
      companyLogoUrl = `/uploads/${req.file.filename}`;
    }

    if (companyLogoUrl) {
      await TrainingProgram.update(
        { company_logo_url: companyLogoUrl },
        { where: { id: programId } }
      );
    } else {
      const curProg = await TrainingProgram.findByPk(programId);
      if (curProg?.company_logo_url) {
        companyLogoUrl = curProg.company_logo_url;
      }
    }

    const where = { program_id: programId };
    if (!publish_all && Array.isArray(submission_ids) && submission_ids.length > 0) {
      where.id = { [Op.in]: submission_ids };
    }

    const [updatedCount] = await AssessmentSubmission.update(
      {
        is_published: true,
        published_at: new Date(),
        published_by: empName,
      },
      { where }
    );

    // Also synchronize enrollment completion status for all passed submissions
    const submissions = await AssessmentSubmission.findAll({ where });
    for (const sub of submissions) {
      if (sub.pass_status === "Passed") {
        const enr = await TrainingEnrollment.findOne({
          where: {
            program_id: sub.program_id,
            employee_id: sub.employee_id,
          },
        });
        const certNum = enr?.certificate_number || `CERT-${sub.employee_id}-${Math.floor(1000 + Math.random() * 9000)}`;
        const enrollUpdate = {
          assessment_status: "Passed",
          assessment_score: sub.percentage,
          completion_status: "Completed",
          completed_at: new Date(),
          certificate_issued: true,
          certificate_number: certNum,
        };
        if (companyLogoUrl) {
          enrollUpdate.company_logo_url = companyLogoUrl;
        }
        await TrainingEnrollment.update(enrollUpdate, {
          where: {
            program_id: sub.program_id,
            employee_id: sub.employee_id,
          },
        });
      } else if (sub.pass_status === "Failed") {
        await TrainingEnrollment.update(
          {
            assessment_status: "Failed",
            assessment_score: sub.percentage,
          },
          {
            where: {
              program_id: sub.program_id,
              employee_id: sub.employee_id,
            },
          }
        );
      }
    }

    res.json({
      success: true,
      message: `Released and published ${updatedCount} assessment results to employees.`,
      data: {
        published_count: updatedCount,
        company_logo_url: companyLogoUrl,
      },
    });
  } catch (error) {
    console.error("publishResults error:", error);
    res.status(500).json({ error: "Failed to publish assessment results" });
  }
};

exports.getSubmissionsForProgram = async (req, res) => {
  try {
    const { programId } = req.params;
    const role = getEffectiveRole(req);

    if (!isHROrAdmin(role) && !isHODOrManager(role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const submissions = await AssessmentSubmission.findAll({
      where: { program_id: programId },
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error("getSubmissionsForProgram error:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

// ============================================================================
// 6. EMPLOYEE FEEDBACK
// ============================================================================
exports.submitFeedback = async (req, res) => {
  try {
    const { programId } = req.params;
    const empId = req.user?.employee_id;
    const empName = req.user?.name || "Employee";

    const {
      content_quality_rating = 5,
      trainer_effectiveness_rating = 5,
      relevance_to_job_rating = 5,
      overall_satisfaction_rating = 5,
      suggestions,
      is_anonymous = false,
    } = req.body;

    const enrollment = await TrainingEnrollment.findOne({
      where: { program_id: programId, employee_id: empId },
    });

    const feedback = await TrainingFeedback.create({
      program_id: programId,
      enrollment_id: enrollment ? enrollment.id : null,
      employee_id: empId,
      employee_name: is_anonymous ? "Anonymous" : empName,
      content_quality_rating: parseInt(content_quality_rating, 10),
      trainer_effectiveness_rating: parseInt(trainer_effectiveness_rating, 10),
      relevance_to_job_rating: parseInt(relevance_to_job_rating, 10),
      overall_satisfaction_rating: parseInt(overall_satisfaction_rating, 10),
      suggestions,
      is_anonymous: Boolean(is_anonymous),
    });

    if (enrollment) {
      await enrollment.update({ feedback_submitted: true });
    }

    res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been recorded.",
      data: feedback,
    });
  } catch (error) {
    console.error("submitFeedback error:", error);
    res.status(500).json({ error: "Failed to submit training feedback" });
  }
};

exports.getProgramFeedback = async (req, res) => {
  try {
    const { programId } = req.params;
    const role = getEffectiveRole(req);

    // Allow HR, HOD, Managers, or enrolled employees to view feedback
    if (!isHROrAdmin(role) && !isHODOrManager(role, req)) {
      const isEnrolled = await TrainingEnrollment.findOne({
        where: { program_id: programId, employee_id: req.user?.employee_id },
      });
      if (!isEnrolled) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const feedbacks = await TrainingFeedback.findAll({
      where: { program_id: programId },
      order: [["created_at", "DESC"]],
    });

    // Aggregates
    const count = feedbacks.length;
    let avgContent = 0;
    let avgTrainer = 0;
    let avgRelevance = 0;
    let avgOverall = 0;

    if (count > 0) {
      avgContent =
        feedbacks.reduce((acc, f) => acc + (f.content_quality_rating || 0), 0) / count;
      avgTrainer =
        feedbacks.reduce((acc, f) => acc + (f.trainer_effectiveness_rating || 0), 0) / count;
      avgRelevance =
        feedbacks.reduce((acc, f) => acc + (f.relevance_to_job_rating || 0), 0) / count;
      avgOverall =
        feedbacks.reduce((acc, f) => acc + (f.overall_satisfaction_rating || 0), 0) / count;
    }

    const avgContentRounded = Math.round(avgContent * 10) / 10;
    const avgTrainerRounded = Math.round(avgTrainer * 10) / 10;
    const avgRelevanceRounded = Math.round(avgRelevance * 10) / 10;
    const avgOverallRounded = Math.round(avgOverall * 10) / 10;

    res.json({
      success: true,
      data: {
        feedbacks,
        summary: {
          total_responses: count,
          avg_content_quality: avgContentRounded,
          avg_trainer_effectiveness: avgTrainerRounded,
          avg_job_relevance: avgRelevanceRounded,
          avg_overall_satisfaction: avgOverallRounded,
        },
        // Top-level aliases for direct frontend compatibility
        total_responses: count,
        avg_content_quality: avgContentRounded,
        avg_trainer_effectiveness: avgTrainerRounded,
        avg_job_relevance: avgRelevanceRounded,
        avg_relevance: avgRelevanceRounded,
        avg_overall_satisfaction: avgOverallRounded,
        avg_satisfaction: avgOverallRounded,
      },
    });
  } catch (error) {
    console.error("getProgramFeedback error:", error);
    res.status(500).json({ error: "Failed to fetch feedback summary" });
  }
};

// ============================================================================
// 6B. ISSUED INTERNAL CERTIFICATES & DETAILS
// ============================================================================
exports.getAllIssuedCertificates = async (req, res) => {
  try {
    const role = getEffectiveRole(req);
    const userDept = req.user?.dept || "";

    if (!isHROrAdmin(role) && !isHODOrManager(role, req)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { programId, department } = req.query;
    const where = {
      [Op.or]: [
        { certificate_issued: true },
        { completion_status: "Completed" },
        { assessment_status: "Passed" },
      ],
    };

    if (programId) where.program_id = programId;
    if (department && isHROrAdmin(role)) where.department = department;
    else if (isHODOrManager(role, req) && userDept) where.department = userDept;

    const enrollments = await TrainingEnrollment.findAll({
      where,
      include: [
        {
          model: TrainingProgram,
          as: "program",
          attributes: [
            "id",
            "code",
            "title",
            "category",
            "duration_hours",
            "delivery_mode",
            "trainer_name",
            "department",
            "company_logo_url",
          ],
        },
      ],
      order: [["completed_at", "DESC"], ["created_at", "DESC"]],
    });

    for (const enr of enrollments) {
      if (!enr.certificate_number) {
        enr.certificate_number = `CERT-${enr.employee_id}-${Math.floor(1000 + Math.random() * 9000)}`;
        await enr.save();
      }
    }

    res.json({ success: true, data: enrollments });
  } catch (error) {
    console.error("getAllIssuedCertificates error:", error);
    res.status(500).json({ error: "Failed to fetch issued certificates" });
  }
};

exports.getCertificateById = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;

    const enrollment = await TrainingEnrollment.findByPk(enrollmentId, {
      include: [
        {
          model: TrainingProgram,
          as: "program",
        },
      ],
    });

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment record not found" });
    }

    if (!isHROrAdmin(role) && !isHODOrManager(role, req) && enrollment.employee_id !== empId) {
      return res.status(403).json({ error: "Access denied to this certificate" });
    }

    if (!enrollment.certificate_number) {
      enrollment.certificate_number = `CERT-${enrollment.employee_id}-${Math.floor(1000 + Math.random() * 9000)}`;
      await enrollment.save();
    }

    const prog = enrollment.program || {};

    res.json({
      success: true,
      data: {
        enrollment_id: enrollment.id,
        certificate_number: enrollment.certificate_number,
        employee_id: enrollment.employee_id,
        employee_name: enrollment.employee_name,
        department: enrollment.department,
        program_id: enrollment.program_id,
        program_code: prog.code || "TRN",
        program_title: prog.title || "Corporate Training",
        category: prog.category || "Professional Development",
        delivery_mode: prog.delivery_mode || "Blended",
        duration_hours: prog.duration_hours || 1,
        trainer_name: prog.trainer_name || "Lead Corporate Trainer",
        company_logo_url: enrollment.company_logo_url || prog.company_logo_url || null,
        completion_status: enrollment.completion_status,
        completed_at: enrollment.completed_at || enrollment.updated_at,
        assessment_score: enrollment.assessment_score,
        assessment_status: enrollment.assessment_status,
        attendance_status: enrollment.attendance_status,
        issue_date: enrollment.completed_at || enrollment.updated_at || new Date(),
      },
    });
  } catch (error) {
    console.error("getCertificateById error:", error);
    res.status(500).json({ error: "Failed to fetch certificate details" });
  }
};

// ============================================================================
// 7. EMPLOYEE UPSKILLING & EXTERNAL CERTIFICATIONS (SECTION 4)
// ============================================================================
exports.submitCertification = async (req, res) => {
  try {
    const empId = req.user?.employee_id;
    const empName = req.user?.name || "Employee";
    const userDept = req.user?.dept || "";

    const {
      source_type = "EXTERNAL", // "EXTERNAL", "INTERNAL_HR", "DEPARTMENTAL"
      internal_program_id,
      course_name,
      provider_institution,
      skills_acquired,
      start_date,
      completion_date,
      duration_hours = 0,
      credential_id,
      verification_url,
      issue_date,
      expiry_date,
      status = "Submitted", // "Draft" or "Submitted"
    } = req.body;

    const validCompletionDate = cleanDate(completion_date);
    if (!course_name || !provider_institution || !validCompletionDate) {
      return res.status(400).json({
        error: "Course name, provider institution, and valid completion date are required",
      });
    }

    let certificateFileUrl = null;
    let certificateFileName = null;

    if (req.file) {
      certificateFileName = req.file.originalname;
      certificateFileUrl = `/api/uploads/${req.file.filename}`;
    }

    const certification = await EmployeeCertification.create({
      employee_id: empId,
      employee_name: empName,
      department: userDept,
      source_type,
      internal_program_id: internal_program_id || null,
      course_name,
      provider_institution,
      skills_acquired: skills_acquired || null,
      start_date: cleanDate(start_date),
      completion_date: validCompletionDate,
      duration_hours: parseFloat(duration_hours) || 0,
      credential_id: credential_id || null,
      verification_url: verification_url || null,
      issue_date: cleanDate(issue_date),
      expiry_date: cleanDate(expiry_date),
      certificate_file_url: certificateFileUrl,
      certificate_file_name: certificateFileName,
      status: status || "Submitted", // "Draft", "Submitted"
      is_verified: false, // Uploaded cert is NEVER auto-verified!
      history: [
        {
          action: status === "Draft" ? "Created Draft" : "Submitted for Review",
          by: empName,
          at: new Date().toISOString(),
          comments: "Initial submission by employee",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message:
        status === "Draft"
          ? "Certification saved as draft"
          : "Certification submitted successfully for HR verification",
      data: certification,
    });
  } catch (error) {
    console.error("submitCertification error:", error);
    res.status(500).json({ error: "Failed to submit certification" });
  }
};

exports.getMyCertifications = async (req, res) => {
  try {
    const empId = req.user?.employee_id;
    if (!empId) {
      return res.status(400).json({ error: "Employee ID missing in session" });
    }

    const certs = await EmployeeCertification.findAll({
      where: { employee_id: empId },
      include: [
        {
          model: TrainingProgram,
          as: "internalProgram",
          attributes: ["id", "code", "title", "category"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, data: certs });
  } catch (error) {
    console.error("getMyCertifications error:", error);
    res.status(500).json({ error: "Failed to fetch employee certifications" });
  }
};

// HR Review Queue
exports.getAllCertificationsQueue = async (req, res) => {
  try {
    const role = getEffectiveRole(req);
    if (!isHROrAdmin(role)) {
      return res.status(403).json({
        error: "Only HR administrators can access the certification approval queue",
      });
    }

    const { status, department, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      where[Op.or] = [
        { course_name: { [Op.iLike]: `%${search}%` } },
        { employee_name: { [Op.iLike]: `%${search}%` } },
        { employee_id: { [Op.iLike]: `%${search}%` } },
        { provider_institution: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const queue = await EmployeeCertification.findAll({
      where,
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, data: queue });
  } catch (error) {
    console.error("getAllCertificationsQueue error:", error);
    res.status(500).json({ error: "Failed to fetch certification queue" });
  }
};

exports.reviewCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const role = getEffectiveRole(req);
    const empId = req.user?.employee_id;
    const empName = req.user?.name || "HR Reviewer";

    if (!isHROrAdmin(role)) {
      return res.status(403).json({
        error: "Only HR administrators can review and approve employee certifications",
      });
    }

    const { status, review_comments, rejection_reason, is_verified } = req.body;
    // status: "Approved" | "Rejected" | "Changes Requested" | "Under Review"

    const cert = await EmployeeCertification.findByPk(id);
    if (!cert) {
      return res.status(404).json({ error: "Certification record not found" });
    }

    const currentHistory = Array.isArray(cert.history) ? [...cert.history] : [];
    currentHistory.push({
      action: `Status changed to ${status}`,
      by: empName,
      at: new Date().toISOString(),
      comments: review_comments || rejection_reason || "",
    });

    await cert.update({
      status,
      is_verified: status === "Approved" ? Boolean(is_verified) : false,
      reviewed_by_id: empId,
      reviewed_by_name: empName,
      reviewed_at: new Date(),
      review_comments,
      rejection_reason: status === "Rejected" ? rejection_reason : null,
      history: currentHistory,
    });

    res.json({
      success: true,
      message: `Certification record marked as ${status}`,
      data: cert,
    });
  } catch (error) {
    console.error("reviewCertification error:", error);
    res.status(500).json({ error: "Failed to review certification" });
  }
};

// ============================================================================
// 8. ONBOARDING INTEGRATION (SECTION 5)
// ============================================================================
exports.getOnboardingTrainingStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Fetch all mandatory onboarding training programs
    const mandatoryPrograms = await TrainingProgram.findAll({
      where: {
        is_onboarding_mandatory: true,
        status: { [Op.ne]: "Archived" },
      },
      include: [
        {
          model: TrainingSession,
          as: "sessions",
        },
      ],
    });

    // Check enrollment status for this employee
    const enrollments = await TrainingEnrollment.findAll({
      where: { employee_id: employeeId },
    });

    const enriched = mandatoryPrograms.map((prog) => {
      const enr = enrollments.find((e) => e.program_id === prog.id);
      let status = "Not Assigned";

      if (enr) {
        if (enr.completion_status === "Completed") {
          status = "Completed";
        } else if (enr.completion_status === "In Progress") {
          status = "In Progress";
        } else if (enr.due_date && new Date(enr.due_date) < new Date()) {
          status = "Overdue";
        } else {
          status = "Assigned";
        }
      }

      return {
        program_id: prog.id,
        code: prog.code,
        title: prog.title,
        category: prog.category,
        delivery_mode: prog.delivery_mode,
        duration_hours: prog.duration_hours,
        status,
        due_date: enr?.due_date || prog.due_date,
        enrollment_id: enr?.id || null,
        attendance_status: enr?.attendance_status || "Pending",
        assessment_status: enr?.assessment_status || "Pending",
        certificate_issued: enr?.certificate_issued || false,
      };
    });

    const total = enriched.length;
    const completed = enriched.filter((i) => i.status === "Completed").length;
    const isAllCompleted = total > 0 && completed === total;

    res.json({
      success: true,
      data: {
        employee_id: employeeId,
        trainings: enriched,
        total_mandatory: total,
        completed_mandatory: completed,
        is_all_completed: isAllCompleted,
      },
    });
  } catch (error) {
    console.error("getOnboardingTrainingStatus error:", error);
    res.status(500).json({ error: "Failed to fetch onboarding training status" });
  }
};

exports.assignOnboardingMandatoryTrainings = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const role = getEffectiveRole(req);

    if (!isHROrAdmin(role)) {
      return res.status(403).json({
        error: "Only HR administrators can assign onboarding mandatory trainings",
      });
    }

    const employee = await Employee.findOne({
      where: { employee_id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee record not found" });
    }

    const mandatoryPrograms = await TrainingProgram.findAll({
      where: { is_onboarding_mandatory: true, status: "Published" },
    });

    if (mandatoryPrograms.length === 0) {
      return res.json({
        success: true,
        message: "No mandatory onboarding programs currently active",
      });
    }

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14); // 2-week due date window

    const records = mandatoryPrograms.map((prog) => ({
      program_id: prog.id,
      employee_id: employee.employee_id,
      employee_name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.employee_id,
      employee_email: employee.email || employee.work_email,
      department: employee.dept,
      enrollment_type: "AUTO_ONBOARDING",
      due_date: prog.due_date || defaultDueDate.toISOString().split("T")[0],
      assessment_status: prog.assessment_required ? "Pending" : "Not Applicable",
    }));

    await TrainingEnrollment.bulkCreate(records, {
      ignoreDuplicates: true,
    });

    res.json({
      success: true,
      message: `Assigned ${records.length} mandatory onboarding training programs to ${employee.employee_id}.`,
    });
  } catch (error) {
    console.error("assignOnboardingMandatoryTrainings error:", error);
    res.status(500).json({ error: "Failed to assign onboarding mandatory trainings" });
  }
};

// ============================================================================
// 9. REPORTS & EXPORTS (SECTION 8)
// ============================================================================
exports.getTrainingReportsData = async (req, res) => {
  try {
    const role = getEffectiveRole(req);
    const userDept = req.user?.dept || "";

    if (!isHROrAdmin(role) && !isHODOrManager(role)) {
      return res.status(403).json({ error: "Access denied to training reports" });
    }

    const { start_date, end_date, department } = req.query;

    const progWhere = {};
    if (department && isHROrAdmin(role)) {
      progWhere.department = department;
    } else if (isHODOrManager(role)) {
      progWhere[Op.or] = [
        { department: userDept },
        { department: null },
      ];
    }

    const programs = await TrainingProgram.findAll({
      where: progWhere,
      order: [["created_at", "DESC"]],
    });

    const enrollments = await TrainingEnrollment.findAll({
      where: isHODOrManager(role) && userDept ? { department: userDept } : {},
    });

    const submissions = await AssessmentSubmission.findAll();
    const feedbacks = await TrainingFeedback.findAll();
    const certifications = await EmployeeCertification.findAll({
      where: isHODOrManager(role) && userDept ? { department: userDept } : {},
    });

    // Summary calculations
    const totalTrainings = programs.length;
    const completedTrainings = programs.filter((p) => p.status === "Completed").length;
    const totalEnrolled = enrollments.length;
    const totalAttended = enrollments.filter((e) => e.attendance_status === "Attended").length;
    const totalCompleted = enrollments.filter((e) => e.completion_status === "Completed").length;

    const attendanceRate =
      totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0;
    const completionRate =
      totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter((s) => s.pass_status === "Passed").length;
    const passPercentage =
      totalSubmissions > 0
        ? Math.round((passedSubmissions / totalSubmissions) * 100)
        : 0;

    // Feedback rating average
    const avgFeedbackRating =
      feedbacks.length > 0
        ? Math.round(
            (feedbacks.reduce((a, b) => a + (b.overall_satisfaction_rating || 0), 0) /
              feedbacks.length) *
              10
          ) / 10
        : 5.0;

    // Department breakdown
    const deptStats = {};
    enrollments.forEach((e) => {
      const d = e.department || "General";
      if (!deptStats[d]) {
        deptStats[d] = {
          department: d,
          enrolled: 0,
          attended: 0,
          completed: 0,
        };
      }
      deptStats[d].enrolled++;
      if (e.attendance_status === "Attended") deptStats[d].attended++;
      if (e.completion_status === "Completed") deptStats[d].completed++;
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalTrainings,
          completedTrainings,
          totalEnrolled,
          totalAttended,
          totalCompleted,
          attendanceRate,
          completionRate,
          totalSubmissions,
          passedSubmissions,
          passPercentage,
          avgFeedbackRating,
          totalCertificationsApproved: certifications.filter((c) => c.status === "Approved").length,
          totalCertificationsPending: certifications.filter((c) => c.status === "Submitted").length,
        },
        department_breakdown: Object.values(deptStats),
        programs_list: programs.map((p) => ({
          id: p.id,
          code: p.code,
          title: p.title,
          type: p.type,
          category: p.category,
          delivery_mode: p.delivery_mode,
          department: p.department || "All Departments",
          trainer_name: p.trainer_name,
          status: p.status,
          start_date: p.start_date,
          end_date: p.end_date,
        })),
        certifications_list: certifications.map((c) => ({
          id: c.id,
          employee_id: c.employee_id,
          employee_name: c.employee_name,
          course_name: c.course_name,
          provider_institution: c.provider_institution,
          source_type: c.source_type,
          completion_date: c.completion_date,
          status: c.status,
          is_verified: c.is_verified,
        })),
        feedbacks_list: feedbacks.map((f) => {
          const prog = programs.find((p) => p.id === f.program_id);
          return {
            id: f.id,
            program_id: f.program_id,
            program_title: prog?.title || "Training Program",
            program_code: prog?.code || "TRN",
            employee_id: f.employee_id,
            employee_name: f.employee_name,
            content_quality_rating: f.content_quality_rating,
            trainer_effectiveness_rating: f.trainer_effectiveness_rating,
            relevance_to_job_rating: f.relevance_to_job_rating,
            overall_satisfaction_rating: f.overall_satisfaction_rating,
            suggestions: f.suggestions,
            is_anonymous: f.is_anonymous,
            created_at: f.created_at || f.createdAt,
          };
        }),
      },
    });
  } catch (error) {
    console.error("getTrainingReportsData error:", error);
    res.status(500).json({ error: "Failed to generate training reports" });
  }
};
