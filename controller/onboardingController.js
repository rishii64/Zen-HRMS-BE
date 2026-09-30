const { Onboarding, Employee, User, RecruitmentCandidate } = require("../config/db");
const { Op } = require("sequelize");

/**
 * Resolves user details from req.user or request body
 */
async function resolveUserInfo(reqUser = {}, fallbackBody = {}) {
  let name = reqUser.name || fallbackBody.name || fallbackBody.evaluator_name;
  let email = reqUser.email || fallbackBody.email;
  let dept = reqUser.dept || fallbackBody.dept || fallbackBody.department;

  if ((!name || !dept) && reqUser.employee_id) {
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
    name: name || reqUser.employee_id || "HR Officer",
    email: email || null,
    dept: dept || "Human Resources",
  };
}

const OnboardingController = {
  // =========================================================================
  // 1. LIST & FETCH ONBOARDING RECORDS
  // =========================================================================

  /**
   * Get all onboarding records with stage, status, and department filtering
   */
  async getAllOnboardings(req, res) {
    try {
      const { stage, status, department, search } = req.query;
      const userRole = (req.user?.role || "").toLowerCase();
      const userDept = req.user?.dept;

      const whereClause = {};

      if (stage && stage !== "ALL") {
        whereClause.current_stage = stage;
      }

      if (status && status !== "ALL") {
        whereClause.overall_status = status;
      }

      if (department && department !== "ALL") {
        whereClause[Op.or] = [
          { target_department: { [Op.iLike]: `%${department}%` } },
          { assigned_department: { [Op.iLike]: `%${department}%` } },
        ];
      }

      // HOD filter (can see their department's onboardings + probation evaluations)
      if (userRole === "hod" && userDept && !department) {
        whereClause[Op.or] = [
          { target_department: { [Op.iLike]: `%${userDept}%` } },
          { assigned_department: { [Op.iLike]: `%${userDept}%` } },
          { assigned_hod_id: req.user.employee_id },
        ];
      }

      if (search) {
        whereClause[Op.or] = [
          { employee_name: { [Op.iLike]: `%${search}%` } },
          { employee_id: { [Op.iLike]: `%${search}%` } },
          { personal_email: { [Op.iLike]: `%${search}%` } },
          { email_address: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const records = await Onboarding.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
      });

      return res.json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (err) {
      console.error("Error fetching onboardings:", err);
      return res.status(500).json({ error: "Failed to fetch onboarding records" });
    }
  },

  /**
   * Get single onboarding record by ID or employee_id
   */
  async getOnboardingById(req, res) {
    try {
      const { id } = req.params;

      let record = null;
      // Check if UUID or employee code
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      if (isUUID) {
        record = await Onboarding.findByPk(id, {
          include: [
            { model: Employee, as: "employee", required: false },
            { model: RecruitmentCandidate, as: "candidate", required: false },
          ],
        });
      } else {
        record = await Onboarding.findOne({
          where: { employee_id: id },
          include: [
            { model: Employee, as: "employee", required: false },
            { model: RecruitmentCandidate, as: "candidate", required: false },
          ],
        });
      }

      if (!record) {
        return res.status(404).json({ error: "Onboarding record not found" });
      }

      return res.json({ success: true, data: record });
    } catch (err) {
      console.error("Error fetching onboarding details:", err);
      return res.status(500).json({ error: "Failed to fetch onboarding details" });
    }
  },

  /**
   * Get onboarding record for logged-in employee self-service view
   */
  async getMyOnboarding(req, res) {
    try {
      const employeeId = req.user?.employee_id;
      if (!employeeId) {
        return res.status(400).json({ error: "Employee ID missing from user session" });
      }

      const record = await Onboarding.findOne({
        where: { employee_id: employeeId },
      });

      return res.json({ success: true, data: record || null });
    } catch (err) {
      console.error("Error fetching my onboarding:", err);
      return res.status(500).json({ error: "Failed to fetch personal onboarding status" });
    }
  },

  /**
   * Initiate new onboarding record (HR / Admin)
   */
  async initiateOnboarding(req, res) {
    try {
      const {
        candidate_id,
        employee_id,
        employee_name,
        personal_email,
        phone,
        designation,
        target_department,
        joining_date,
      } = req.body;

      if (!employee_name || !employee_name.trim()) {
        return res.status(400).json({ error: "Employee / Candidate name is required" });
      }

      // Check if already exists for this employee_id or candidate_id
      if (employee_id) {
        const existing = await Onboarding.findOne({ where: { employee_id } });
        if (existing) {
          return res.status(400).json({
            error: `Onboarding process already active for employee code ${employee_id}`,
            data: existing,
          });
        }
      }

      if (candidate_id) {
        const existing = await Onboarding.findOne({ where: { candidate_id } });
        if (existing) {
          return res.status(400).json({
            error: "Onboarding process already active for this recruitment candidate",
            data: existing,
          });
        }
      }

      const newRecord = await Onboarding.create({
        candidate_id: candidate_id || null,
        employee_id: employee_id || null,
        employee_name: employee_name.trim(),
        personal_email: personal_email ? personal_email.toLowerCase().trim() : null,
        phone: phone || null,
        designation: designation || "Trainee",
        target_department: target_department || "General",
        joining_date: joining_date || new Date().toISOString().split("T")[0],
        current_stage: "JOINING",
        overall_status: "IN_PROGRESS",
      });

      // If tied to recruitment candidate, update stage
      if (candidate_id) {
        try {
          await RecruitmentCandidate.update(
            { interview_stage: "JOINED" },
            { where: { id: candidate_id } }
          );
        } catch (e) {
          console.warn("Could not update candidate interview stage:", e.message);
        }
      }

      return res.status(201).json({
        success: true,
        message: "Onboarding process initiated successfully",
        data: newRecord,
      });
    } catch (err) {
      console.error("Error initiating onboarding:", err);
      return res.status(500).json({ error: "Failed to initiate onboarding process" });
    }
  },

  // =========================================================================
  // 2. STAGE A: JOINING — ASSET & IDENTITY ISSUANCE
  // =========================================================================

  /**
   * Update Joining asset issuance: email, id card, biometric, laptop, bag, stationery, etc.
   */
  async updateJoiningAssets(req, res) {
    try {
      const { id } = req.params;
      const {
        email_issued,
        email_address,
        email_issued_date,
        id_card_issued,
        id_card_number,
        id_card_issued_date,
        biometric_registered,
        biometric_device_id,
        biometric_registered_date,
        laptop_issued,
        laptop_serial_no,
        laptop_model,
        laptop_issued_date,
        bag_issued,
        bag_type,
        bag_issued_date,
        stationery_issued,
        stationery_details,
        stationery_issued_date,
        additional_assets,
        joining_remarks,
        mark_completed,
      } = req.body;

      const record = await Onboarding.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: "Onboarding record not found" });
      }

      if (email_issued !== undefined) record.email_issued = !!email_issued;
      if (email_address !== undefined) record.email_address = email_address;
      if (email_issued_date !== undefined) record.email_issued_date = email_issued_date;

      if (id_card_issued !== undefined) record.id_card_issued = !!id_card_issued;
      if (id_card_number !== undefined) record.id_card_number = id_card_number;
      if (id_card_issued_date !== undefined) record.id_card_issued_date = id_card_issued_date;

      if (biometric_registered !== undefined) record.biometric_registered = !!biometric_registered;
      if (biometric_device_id !== undefined) record.biometric_device_id = biometric_device_id;
      if (biometric_registered_date !== undefined) record.biometric_registered_date = biometric_registered_date;

      if (laptop_issued !== undefined) record.laptop_issued = !!laptop_issued;
      if (laptop_serial_no !== undefined) record.laptop_serial_no = laptop_serial_no;
      if (laptop_model !== undefined) record.laptop_model = laptop_model;
      if (laptop_issued_date !== undefined) record.laptop_issued_date = laptop_issued_date;

      if (bag_issued !== undefined) record.bag_issued = !!bag_issued;
      if (bag_type !== undefined) record.bag_type = bag_type;
      if (bag_issued_date !== undefined) record.bag_issued_date = bag_issued_date;

      if (stationery_issued !== undefined) record.stationery_issued = !!stationery_issued;
      if (stationery_details !== undefined) record.stationery_details = stationery_details;
      if (stationery_issued_date !== undefined) record.stationery_issued_date = stationery_issued_date;

      if (additional_assets !== undefined) record.additional_assets = additional_assets;
      if (joining_remarks !== undefined) record.joining_remarks = joining_remarks;

      // Check if all primary items are issued or user requested completion
      const allPrimaryIssued =
        record.email_issued &&
        record.id_card_issued &&
        record.biometric_registered &&
        record.laptop_issued &&
        record.bag_issued &&
        record.stationery_issued;

      if (mark_completed || allPrimaryIssued) {
        record.joining_completed = true;
        record.joining_completed_at = new Date();
        if (record.current_stage === "JOINING") {
          record.current_stage = "DOCUMENTATION";
        }
      }

      await record.save();

      // If work email was issued and employee exists, sync to Employee table
      if (record.employee_id && record.email_address) {
        try {
          await Employee.update(
            { work_email: record.email_address },
            { where: { employee_id: record.employee_id } }
          );
        } catch (e) {
          console.warn("Could not sync work_email to employee:", e.message);
        }
      }

      return res.json({
        success: true,
        message: "Joining assets updated successfully",
        data: record,
      });
    } catch (err) {
      console.error("Error updating joining assets:", err);
      return res.status(500).json({ error: "Failed to update joining assets" });
    }
  },

  // =========================================================================
  // 3. STAGE B: DOCUMENTATION PROCESS
  // =========================================================================

  /**
   * Update Documentation verification checklist and overall doc status
   */
  async updateDocumentation(req, res) {
    try {
      const { id } = req.params;
      const { documents, documentation_remarks, documentation_status, mark_verified } = req.body;

      const record = await Onboarding.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: "Onboarding record not found" });
      }

      const userInfo = await resolveUserInfo(req.user, req.body);

      if (Array.isArray(documents)) {
        record.documents = documents;
      }

      if (documentation_remarks !== undefined) {
        record.documentation_remarks = documentation_remarks;
      }

      // Check if all documents are marked VERIFIED
      const allVerified =
        Array.isArray(record.documents) &&
        record.documents.length > 0 &&
        record.documents.every((doc) => doc.status === "VERIFIED");

      if (mark_verified || documentation_status === "VERIFIED" || allVerified) {
        record.documentation_status = "VERIFIED";
        record.documentation_completed_at = new Date();
        record.documentation_verified_by_id = req.user?.employee_id || req.user?.id || "HR";
        record.documentation_verified_by_name = userInfo.name;

        // Auto-advance stage to TRAINING if currently in DOCUMENTATION
        if (record.current_stage === "DOCUMENTATION") {
          record.current_stage = "TRAINING";
        }
      } else if (documentation_status) {
        record.documentation_status = documentation_status;
      }

      await record.save();

      return res.json({
        success: true,
        message: "Documentation process updated successfully",
        data: record,
      });
    } catch (err) {
      console.error("Error updating documentation:", err);
      return res.status(500).json({ error: "Failed to update documentation process" });
    }
  },

  /**
   * Upload single document attachment (Aadhaar, PAN, certificates, etc.)
   */
  async uploadDocumentFile(req, res) {
    try {
      const { id } = req.params;
      const { doc_key, doc_number } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "File upload is required" });
      }

      const record = await Onboarding.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: "Onboarding record not found" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const currentDocs = Array.isArray(record.documents) ? [...record.documents] : [];

      const idx = currentDocs.findIndex((d) => d.key === doc_key);
      if (idx >= 0) {
        currentDocs[idx] = {
          ...currentDocs[idx],
          doc_url: fileUrl,
          number: doc_number || currentDocs[idx].number,
          status: "SUBMITTED",
          updated_at: new Date().toISOString(),
        };
      } else {
        currentDocs.push({
          key: doc_key,
          label: doc_key.toUpperCase(),
          doc_url: fileUrl,
          number: doc_number || "",
          status: "SUBMITTED",
          updated_at: new Date().toISOString(),
        });
      }

      record.documents = currentDocs;
      record.documentation_status = "IN_PROGRESS";
      await record.save();

      return res.json({
        success: true,
        message: "Document uploaded successfully",
        fileUrl,
        data: record,
      });
    } catch (err) {
      console.error("Error uploading document:", err);
      return res.status(500).json({ error: "Failed to upload document file" });
    }
  },

  // =========================================================================
  // 4. STAGE C: INTRO & TRAINING (HR, ADMIN, POS, DEPT)
  // =========================================================================

  /**
   * Update one of the 4 training modules: "hr", "admin", "pos", "dept"
   */
  async updateTrainingModule(req, res) {
    try {
      const { id } = req.params;
      const {
        module_key, // "hr" | "admin" | "pos" | "dept"
        status, // "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
        trainer_name,
        mentor_name,
        department_name,
        scheduled_date,
        completed_date,
        score,
        feedback,
      } = req.body;

      if (!["hr", "admin", "pos", "dept"].includes(module_key)) {
        return res.status(400).json({
          error: "Invalid module_key. Must be one of: 'hr', 'admin', 'pos', 'dept'",
        });
      }

      const record = await Onboarding.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: "Onboarding record not found" });
      }

      const fieldName = `${module_key}_training`;
      const currentModule = record[fieldName] || {};

      const updatedModule = {
        ...currentModule,
        status: status || currentModule.status || "IN_PROGRESS",
        trainer_name: trainer_name !== undefined ? trainer_name : currentModule.trainer_name,
        mentor_name: mentor_name !== undefined ? mentor_name : currentModule.mentor_name,
        department_name: department_name !== undefined ? department_name : currentModule.department_name,
        scheduled_date: scheduled_date !== undefined ? scheduled_date : currentModule.scheduled_date,
        completed_date: status === "COMPLETED" ? completed_date || new Date().toISOString().split("T")[0] : currentModule.completed_date,
        score: score !== undefined ? Number(score) : currentModule.score,
        feedback: feedback !== undefined ? feedback : currentModule.feedback,
      };

      record[fieldName] = updatedModule;

      // Check if all 4 training modules are completed
      const hrDone = (module_key === "hr" ? updatedModule.status : record.hr_training?.status) === "COMPLETED";
      const adminDone = (module_key === "admin" ? updatedModule.status : record.admin_training?.status) === "COMPLETED";
      const posDone = (module_key === "pos" ? updatedModule.status : record.pos_training?.status) === "COMPLETED";
      const deptDone = (module_key === "dept" ? updatedModule.status : record.dept_training?.status) === "COMPLETED";

      if (hrDone && adminDone && posDone && deptDone) {
        record.trainings_completed = true;
        if (record.current_stage === "TRAINING") {
          // Training completed! Next stage is Department Assignment
          record.current_stage = "DEPT_ASSIGNMENT";
        }
      }

      await record.save();

      return res.json({
        success: true,
        message: `${module_key.toUpperCase()} training module updated successfully`,
        data: record,
      });
    } catch (err) {
      console.error("Error updating training module:", err);
      return res.status(500).json({ error: "Failed to update training module" });
    }
  },

  // =========================================================================
  // 5. STAGE D: DEPARTMENT ASSIGNMENT (Unlocked after Dept Training)
  // =========================================================================

  /**
   * Assign employee to respective department after department training is completed
   * Initializes the 6-Month Probation Period
   */
  async assignDepartment(req, res) {
    try {
      const { id } = req.params;
      const {
        assigned_department,
        assigned_hod_id,
        assigned_hod_name,
        assigned_reporting_manager,
        assigned_date,
        assignment_notes,
        probation_period_months = 6,
      } = req.body;

      const record = await Onboarding.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: "Onboarding record not found" });
      }

      // Check requirement: Department Training MUST be completed before assignment
      if (record.dept_training?.status !== "COMPLETED") {
        return res.status(400).json({
          error: "Department Training must be COMPLETED before assigning the employee to their respective department.",
        });
      }

      if (!assigned_department || !assigned_department.trim()) {
        return res.status(400).json({ error: "Assigned department is required" });
      }

      const assignDate = assigned_date || new Date().toISOString().split("T")[0];

      // Calculate 6-month probation end date
      const probStart = new Date(assignDate);
      const probEnd = new Date(assignDate);
      probEnd.setMonth(probEnd.getMonth() + Number(probation_period_months));

      record.is_assigned_to_dept = true;
      record.assigned_department = assigned_department.trim();
      record.assigned_hod_id = assigned_hod_id || null;
      record.assigned_hod_name = assigned_hod_name || null;
      record.assigned_reporting_manager = assigned_reporting_manager || null;
      record.assigned_date = assignDate;
      record.assignment_notes = assignment_notes || null;

      // Initialize 6 Months Probation
      record.probation_start_date = assignDate;
      record.probation_end_date = probEnd.toISOString().split("T")[0];
      record.probation_period_months = Number(probation_period_months);
      record.probation_status = "IN_PROBATION";
      record.current_stage = "PROBATION_EVALUATION";

      await record.save();

      // If employee record exists, update dept and reporting_manager in Employee table
      if (record.employee_id) {
        try {
          await Employee.update(
            {
              dept: assigned_department.trim(),
              reporting_manager: assigned_reporting_manager || assigned_hod_name || "N/A",
            },
            { where: { employee_id: record.employee_id } }
          );
        } catch (e) {
          console.warn("Could not sync department to employee profile:", e.message);
        }
      }

      return res.json({
        success: true,
        message: `Employee successfully assigned to ${assigned_department}. 6-Month Probation period started.`,
        data: record,
      });
    } catch (err) {
      console.error("Error assigning department:", err);
      return res.status(500).json({ error: "Failed to assign department" });
    }
  },

  // =========================================================================
  // 6. STAGE E: 6-MONTH PROBATION REVIEW & HOD PERMANENT / REJECT DECISION
  // =========================================================================

  /**
   * Department Head (HOD) performs analysis and chooses Permanent or Reject
   */
  async submitProbationDecision(req, res) {
    try {
      const { id } = req.params;
      const {
        hod_performance_rating, // 1 to 5
        hod_kpi_rating, // 1 to 5
        hod_discipline_rating, // 1 to 5
        hod_culture_fit_rating, // 1 to 5
        hod_analysis_remarks,
        hod_decision, // "PERMANENT" | "REJECTED" | "EXTENDED"
        hod_decision_reason,
        hod_extension_months,
      } = req.body;

      if (!["PERMANENT", "REJECTED", "EXTENDED"].includes(hod_decision)) {
        return res.status(400).json({
          error: "Decision must be 'PERMANENT', 'REJECTED', or 'EXTENDED'",
        });
      }

      const record = await Onboarding.findByPk(id);
      if (!record) {
        return res.status(404).json({ error: "Onboarding record not found" });
      }

      if (!record.is_assigned_to_dept) {
        return res.status(400).json({
          error: "Employee has not been assigned to a department yet. Cannot perform probation review.",
        });
      }

      const userInfo = await resolveUserInfo(req.user, req.body);

      record.hod_analysis_completed = true;
      record.hod_performance_rating = hod_performance_rating ? Number(hod_performance_rating) : null;
      record.hod_kpi_rating = hod_kpi_rating ? Number(hod_kpi_rating) : null;
      record.hod_discipline_rating = hod_discipline_rating ? Number(hod_discipline_rating) : null;
      record.hod_culture_fit_rating = hod_culture_fit_rating ? Number(hod_culture_fit_rating) : null;
      record.hod_analysis_remarks = hod_analysis_remarks || null;

      record.hod_decision = hod_decision;
      record.hod_decision_reason = hod_decision_reason || null;
      record.hod_decision_date = new Date();
      record.hod_decision_by_id = req.user?.employee_id || req.user?.id || "HOD";
      record.hod_decision_by_name = userInfo.name;

      if (hod_decision === "PERMANENT") {
        record.probation_status = "CONFIRMED_PERMANENT";
        record.overall_status = "COMPLETED";
        record.current_stage = "COMPLETED";

        // Update employee status to permanent in Employee table
        if (record.employee_id) {
          try {
            await Employee.update(
              { status: "Active" },
              { where: { employee_id: record.employee_id } }
            );
          } catch (e) {
            console.warn("Could not update employee status:", e.message);
          }
        }
      } else if (hod_decision === "REJECTED") {
        record.probation_status = "REJECTED";
        record.overall_status = "REJECTED";
        record.current_stage = "REJECTED";

        if (record.employee_id) {
          try {
            await Employee.update(
              { status: "Probation Rejected" },
              { where: { employee_id: record.employee_id } }
            );
          } catch (e) {
            console.warn("Could not update employee status:", e.message);
          }
        }
      } else if (hod_decision === "EXTENDED") {
        const extMonths = Number(hod_extension_months) || 3;
        record.hod_extension_months = extMonths;
        record.probation_status = "EXTENDED";

        if (record.probation_end_date) {
          const currentEnd = new Date(record.probation_end_date);
          currentEnd.setMonth(currentEnd.getMonth() + extMonths);
          record.probation_end_date = currentEnd.toISOString().split("T")[0];
        }
      }

      await record.save();

      return res.json({
        success: true,
        message: `HOD decision submitted: Employee ${
          hod_decision === "PERMANENT"
            ? "confirmed as Permanent"
            : hod_decision === "REJECTED"
            ? "rejected after probation review"
            : `probation extended by ${record.hod_extension_months} months`
        }`,
        data: record,
      });
    } catch (err) {
      console.error("Error submitting probation decision:", err);
      return res.status(500).json({ error: "Failed to submit probation decision" });
    }
  },

  // =========================================================================
  // 7. DASHBOARD METRICS & PIPELINE STATS
  // =========================================================================

  /**
   * Get onboarding pipeline counts
   */
  async getOnboardingStats(req, res) {
    try {
      const total = await Onboarding.count();
      const inJoining = await Onboarding.count({ where: { current_stage: "JOINING" } });
      const inDocs = await Onboarding.count({ where: { current_stage: "DOCUMENTATION" } });
      const inTraining = await Onboarding.count({ where: { current_stage: "TRAINING" } });
      const inDeptAssignment = await Onboarding.count({ where: { current_stage: "DEPT_ASSIGNMENT" } });
      const inProbation = await Onboarding.count({ where: { probation_status: "IN_PROBATION" } });
      const confirmedPermanent = await Onboarding.count({ where: { probation_status: "CONFIRMED_PERMANENT" } });
      const rejected = await Onboarding.count({ where: { probation_status: "REJECTED" } });

      return res.json({
        success: true,
        data: {
          total,
          inJoining,
          inDocs,
          inTraining,
          inDeptAssignment,
          inProbation,
          confirmedPermanent,
          rejected,
        },
      });
    } catch (err) {
      console.error("Error fetching onboarding stats:", err);
      return res.status(500).json({ error: "Failed to fetch onboarding stats" });
    }
  },
};

module.exports = OnboardingController;
