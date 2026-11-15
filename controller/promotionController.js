const {
  Promotion,
  Employee,
  JobGrade,
  Designation,
  Department,
  Notification,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");

const PromotionController = {
  // 1. GET ALL PROMOTIONS & PROGRESSIONS (WITH FILTERING & ANALYTICS)
  getAllPromotions: async (req, res) => {
    try {
      const user = req.user || {};
      const role = (user.role || "").toLowerCase().trim();
      const userEmpId = String(user.employee_id || user.id || "");

      const {
        status,
        type,
        department,
        search,
        page = 1,
        limit = 50,
      } = req.query;

      const where = {};

      const isPrivileged = [
        "hr",
        "admin",
        "management",
        "ceo",
        "coo",
        "hrmanager",
      ].includes(role);
      const isHOD = ["hod", "manager"].includes(role);

      if (!isPrivileged) {
        if (isHOD) {
          const hodDept = user.dept || user.department;
          where[Op.or] = [
            { employee_id: userEmpId },
            { department: hodDept },
            { initiated_by: userEmpId },
          ];
        } else {
          where.employee_id = userEmpId;
        }
      }

      // Query Filters
      if (status && status !== "All") {
        where.status = status;
      }
      if (type && type !== "All") {
        where.promotion_type = type;
      }
      if (department && department !== "All") {
        where.department = department;
      }

      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`;
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Promotion.employee_name")),
              "LIKE",
              q
            ),
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Promotion.employee_id")),
              "LIKE",
              q
            ),
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Promotion.promotion_code")),
              "LIKE",
              q
            ),
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Promotion.target_designation")),
              "LIKE",
              q
            ),
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Promotion.current_designation")),
              "LIKE",
              q
            ),
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Promotion.department")),
              "LIKE",
              q
            ),
          ],
        });
      }

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const { rows: promotions, count: totalCount } =
        await Promotion.findAndCountAll({
          where,
          order: [["created_at", "DESC"]],
          limit: parseInt(limit, 10),
          offset,
        });

      // Compute live progression analytics
      const allRecords = await Promotion.findAll({
        attributes: [
          "status",
          "promotion_type",
          "letter_status",
          "increment_percentage",
        ],
      });

      const hikes = allRecords
        .map((p) => parseFloat(p.increment_percentage))
        .filter((h) => !isNaN(h) && h > 0);
      const avgHike =
        hikes.length > 0
          ? (hikes.reduce((a, b) => a + b, 0) / hikes.length).toFixed(1)
          : "0.0";

      const stats = {
        total: allRecords.length,
        pending: allRecords.filter((p) => p.status === "Pending").length,
        approved: allRecords.filter((p) => p.status === "Approved").length,
        effective: allRecords.filter((p) => p.status === "Effective").length,
        rejected: allRecords.filter((p) => p.status === "Rejected").length,
        deferred: allRecords.filter((p) => p.status === "Deferred").length,
        merit_promotions: allRecords.filter(
          (p) => p.promotion_type === "Merit Promotion"
        ).length,
        grade_progressions: allRecords.filter(
          (p) => p.promotion_type === "Grade Progression"
        ).length,
        accelerated: allRecords.filter(
          (p) => p.promotion_type === "Accelerated Promotion"
        ).length,
        role_elevations: allRecords.filter(
          (p) => p.promotion_type === "Role Elevation"
        ).length,
        average_hike: avgHike,
        letters_issued: allRecords.filter((p) => p.letter_status === "Issued")
          .length,
      };

      return res.status(200).json({
        success: true,
        data: promotions,
        stats,
        total: totalCount,
        page: parseInt(page, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      });
    } catch (err) {
      console.error("Error in getAllPromotions:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch promotions & progressions: " + err.message,
      });
    }
  },

  // 2. GET SINGLE PROMOTION RECORD
  getPromotionById: async (req, res) => {
    try {
      const { id } = req.params;
      const promotion = await Promotion.findByPk(id, {
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: [
              "employee_id",
              "first_name",
              "last_name",
              "email",
              "dept",
              "designation",
              "current_salary",
              "work_location",
              "reporting_manager",
            ],
          },
        ],
      });

      if (!promotion) {
        return res
          .status(404)
          .json({ success: false, message: "Promotion record not found" });
      }

      return res.status(200).json({ success: true, data: promotion });
    } catch (err) {
      console.error("Error in getPromotionById:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 3. INITIATE / NOMINATE PROMOTION OR PROGRESSION
  createPromotion: async (req, res) => {
    try {
      const user = req.user || {};
      const {
        employee_id,
        promotion_type = "Merit Promotion",
        target_designation,
        target_grade_code,
        target_rank_level,
        revised_salary,
        increment_percentage,
        payout_basis,
        performance_rating,
        effective_date,
        justification,
        remarks,
      } = req.body;

      if (!employee_id || !target_designation || (!revised_salary && increment_percentage === undefined) || !effective_date) {
        return res.status(400).json({
          success: false,
          message:
            "Employee, Target Designation, Revised Salary or Hike %, and Effective Date are required",
        });
      }

      // Fetch employee profile
      const emp = await Employee.findOne({ where: { employee_id } });
      if (!emp) {
        return res.status(404).json({
          success: false,
          message: `Employee with ID ${employee_id} not found`,
        });
      }

      const rawSalary = parseFloat(emp.current_salary) || 0.0;

      // 1. Determine employee's true normalized baseline Annual CTC & Monthly salary
      let currentAnnual = 0.0;
      let currentMonthly = 0.0;

      if (rawSalary > 0 && rawSalary < 100) {
        // Stored in LPA metric
        currentAnnual = rawSalary * 100000;
        currentMonthly = Math.round(currentAnnual / 12);
      } else if (rawSalary > 250000) {
        // Stored as Annual CTC
        currentAnnual = rawSalary;
        currentMonthly = Math.round(rawSalary / 12);
      } else {
        // Stored as Monthly Gross (standard <= 250,000)
        currentMonthly = rawSalary;
        currentAnnual = rawSalary * 12;
      }

      const basis = payout_basis || "monthly";

      // 2. Dynamic Hike Calculation: handle increment_percentage and/or revised_salary
      let revisedSalaryNum = 0.0;
      let incrementAmount = 0.0;
      let finalIncrementPercentage = 0.0;

      if (
        increment_percentage !== undefined &&
        increment_percentage !== null &&
        !isNaN(parseFloat(increment_percentage)) &&
        (!revised_salary || parseFloat(revised_salary) <= 0)
      ) {
        finalIncrementPercentage = parseFloat(increment_percentage);
        incrementAmount = Math.round(currentAnnual * (finalIncrementPercentage / 100));
        revisedSalaryNum = currentAnnual + incrementAmount;
      } else {
        const inputRev = parseFloat(revised_salary) || 0.0;
        // Normalize revised salary if entered in LPA (< 100) or monthly
        if (inputRev > 0 && inputRev < 100) {
          revisedSalaryNum = inputRev * 100000;
        } else if (basis === "monthly" && inputRev > 0 && inputRev <= currentAnnual / 2) {
          revisedSalaryNum = inputRev * 12;
        } else {
          revisedSalaryNum = inputRev;
        }

        incrementAmount = Math.max(0, revisedSalaryNum - currentAnnual);
        finalIncrementPercentage =
          currentAnnual > 0
            ? parseFloat(((incrementAmount / currentAnnual) * 100).toFixed(2))
            : 0.0;
      }

      const currentYear = new Date().getFullYear();
      const prefix = promotion_type === "Grade Progression" ? "PROG" : "PRM";
      const count = await Promotion.count();
      const promotion_code = `${prefix}-${currentYear}-${String(count + 1).padStart(4, "0")}`;
      const letter_ref_no = `ZEN/HR/${prefix}/${currentYear}/${String(count + 1).padStart(3, "0")}`;

      const empFullName =
        `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
        emp.name ||
        "Employee";

      // Attempt to resolve target grade rank level if not provided
      let currentRank = 2;
      let targetRank = target_rank_level || 3;
      try {
        if (target_grade_code) {
          const targetGradeRecord = await JobGrade.findOne({
            where: { grade_code: target_grade_code },
          });
          if (targetGradeRecord) {
            targetRank = targetGradeRecord.rank_level;
          }
        }
      } catch (_) {}

      const newPromotion = await Promotion.create({
        promotion_code,
        employee_id,
        employee_name: empFullName,
        employee_email: emp.email || emp.work_email,
        department: emp.dept || "General",
        promotion_type,
        current_designation: emp.designation || "Staff",
        target_designation,
        current_grade_code: "L2",
        target_grade_code: target_grade_code || "L3",
        current_rank_level: currentRank,
        target_rank_level: targetRank,
        current_salary: currentAnnual,
        revised_salary: revisedSalaryNum,
        increment_amount: incrementAmount,
        increment_percentage: finalIncrementPercentage,
        payout_basis: basis,
        performance_rating: performance_rating || "Exceeds Expectations",
        effective_date,
        justification,
        remarks,
        status: "Pending",
        workflow_step: "HR Review",
        initiated_by: String(user.employee_id || user.id || "HR-Admin"),
        initiated_by_name: user.name || user.userName || "HR Department",
        letter_ref_no,
        letter_issue_date: new Date().toISOString().split("T")[0],
        letter_status: "Draft",
        letter_signatory_name: "Priyanka Mukherjee",
        letter_signatory_title: "CHRO & VP - Human Resources",
        sync_employee_record: false,
      });

      // Send In-App Notification to HR/Leadership
      try {
        await Notification.create({
          recipient_role: "hr",
          title: `New Promotion Nomination: ${empFullName}`,
          message: `${promotion_type} nominated for ${empFullName} to ${target_designation} with ${incrementPercentage}% salary revision. Effective: ${effective_date}.`,
          type: "approval",
          category: "Approvals",
          link: "/promotions",
          priority: "high",
          source_module: "promotions",
        });
      } catch (notifErr) {
        console.warn("Could not create promotion notification:", notifErr.message);
      }

      return res.status(201).json({
        success: true,
        message: `${promotion_type} order ${promotion_code} initiated successfully`,
        data: newPromotion,
      });
    } catch (err) {
      console.error("Error in createPromotion:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 4. UPDATE STATUS (APPROVE / REJECT / DEFER / MARK EFFECTIVE)
  updatePromotionStatus: async (req, res) => {
    try {
      const user = req.user || {};
      const { id } = req.params;
      const { status, remarks, rejection_reason, apply_to_employee } = req.body;

      if (!["Pending", "Approved", "Effective", "Rejected", "Deferred"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value" });
      }

      const promotion = await Promotion.findByPk(id);
      if (!promotion) {
        return res.status(404).json({ success: false, message: "Promotion record not found" });
      }

      const updatePayload = {
        status,
        remarks: remarks !== undefined ? remarks : promotion.remarks,
        rejection_reason: rejection_reason !== undefined ? rejection_reason : promotion.rejection_reason,
      };

      if (status === "Approved") {
        updatePayload.approved_by = String(user.employee_id || user.id || "HR-Admin");
        updatePayload.approved_by_name = user.name || user.userName || "Priyanka Mukherjee (CHRO)";
        updatePayload.approval_date = new Date();
        updatePayload.workflow_step = "Completed";
        updatePayload.letter_status = "Issued";
      } else if (status === "Rejected") {
        updatePayload.workflow_step = "Rejected";
      } else if (status === "Deferred") {
        updatePayload.workflow_step = "Deferred to Next Cycle";
      } else if (status === "Effective") {
        updatePayload.workflow_step = "Completed";
      }

      // If apply_to_employee requested or status is Effective, update Employee master record!
      let employeeUpdated = false;
      if (apply_to_employee || status === "Effective") {
        const emp = await Employee.findOne({ where: { employee_id: promotion.employee_id } });
        if (emp) {
          // If the employee's salary in Employee table was monthly (typical in this HRMS <= 250,000),
          // convert revised annual salary back to monthly for Employee.current_salary:
          const isMonthlyStorage = promotion.payout_basis === "monthly" || parseFloat(emp.current_salary) <= 250000;
          const newEmpSalary = isMonthlyStorage
            ? Math.round(parseFloat(promotion.revised_salary) / 12)
            : parseFloat(promotion.revised_salary);

          const empUpdate = {
            designation: promotion.target_designation,
            current_salary: newEmpSalary,
          };

          // Update grade_id if available
          try {
            if (promotion.target_grade_code) {
              const grade = await JobGrade.findOne({
                where: { grade_code: promotion.target_grade_code },
              });
              if (grade) {
                empUpdate.grade_id = grade.id;
              }
            }
          } catch (_) {}

          // Automatically recalculate and sync salary_structure for monthly gross
          if (newEmpSalary > 0) {
            let existingStructure = null;
            if (emp.salary_structure) {
              try {
                existingStructure =
                  typeof emp.salary_structure === "string"
                    ? JSON.parse(emp.salary_structure)
                    : emp.salary_structure;
              } catch (_) {}
            }
            const newBasic = Math.round(newEmpSalary * 0.45);
            const newHra = Math.round(newEmpSalary * 0.40);
            const newConveyance = Math.round(newEmpSalary * 0.05) || 1600;
            const newMedical = Math.round(newEmpSalary * 0.05) || 1250;
            const assigned = newBasic + newHra + newConveyance + newMedical;
            const newAllowance = Math.max(0, newEmpSalary - assigned);

            const existingDeds = existingStructure?.deductions || {};
            const pt =
              existingDeds.professional_tax != null
                ? parseFloat(existingDeds.professional_tax)
                : newEmpSalary > 15000
                ? 200
                : 0;
            const it = existingDeds.income_tax != null ? parseFloat(existingDeds.income_tax) : 0;
            const pf =
              existingDeds.pf != null ? parseFloat(existingDeds.pf) : Math.round(newBasic * 0.12);
            const totalDeds =
              pt +
              it +
              pf +
              (parseFloat(existingDeds.mediclaim) || 0) +
              (parseFloat(existingDeds.insurance) || 0);

            const updatedStructure = {
              ...(existingStructure || {}),
              employment_type: emp.employment_type || "Permanent",
              is_permanent: emp.is_permanent !== false,
              earnings: {
                basic: newBasic,
                hra: newHra,
                allowance: newAllowance,
                conveyance: newConveyance,
                medical: newMedical,
              },
              deductions: {
                ...(existingDeds || {}),
                professional_tax: pt,
                income_tax: it,
                pf: pf,
              },
              gross_salary: newEmpSalary,
              total_deductions: totalDeds,
              net_salary: Math.max(0, newEmpSalary - totalDeds),
              updated_at: new Date().toISOString(),
            };
            empUpdate.salary_structure = JSON.stringify(updatedStructure);
          }

          await emp.update(empUpdate);
          updatePayload.sync_employee_record = true;
          employeeUpdated = true;
        }
      }

      await promotion.update(updatePayload);

      // In-App Notification to the Employee
      try {
        const title =
          status === "Approved"
            ? `Congratulations! Promotion & Salary Increment Approved`
            : status === "Rejected"
            ? `Promotion Review Update`
            : status === "Deferred"
            ? `Promotion Review Deferred`
            : `Promotion Order Status: ${status}`;

        const message =
          status === "Approved"
            ? `You have been promoted to ${promotion.target_designation} with a revised annual salary of ₹${parseFloat(promotion.revised_salary).toLocaleString("en-IN")}. Your official Promotion Letter is now ready!`
            : status === "Rejected"
            ? `Your promotion nomination (${promotion.promotion_code}) was not approved. Feedback: ${rejection_reason || "Cycle quotas"}.`
            : status === "Deferred"
            ? `Your progression review has been deferred to the subsequent review cycle.`
            : `Your promotion order ${promotion.promotion_code} is now ${status}.`;

        await Notification.create({
          recipient_id: promotion.employee_id,
          title,
          message,
          type: "promotion",
          category: "Announcements",
          link: "/promotions",
          priority: status === "Approved" ? "high" : "normal",
          source_module: "promotions",
        });
      } catch (notifErr) {
        console.warn("Could not notify employee about promotion:", notifErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Promotion ${promotion.promotion_code} marked as ${status}${employeeUpdated ? " and employee master record updated" : ""}`,
        data: promotion,
      });
    } catch (err) {
      console.error("Error in updatePromotionStatus:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 5. UPDATE LETTER CONFIGURATION
  updateLetterDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        letter_ref_no,
        letter_issue_date,
        letter_status,
        letter_signatory_name,
        letter_signatory_title,
      } = req.body;

      const promotion = await Promotion.findByPk(id);
      if (!promotion) {
        return res.status(404).json({ success: false, message: "Promotion not found" });
      }

      await promotion.update({
        letter_ref_no: letter_ref_no || promotion.letter_ref_no,
        letter_issue_date: letter_issue_date || promotion.letter_issue_date,
        letter_status: letter_status || promotion.letter_status,
        letter_signatory_name: letter_signatory_name || promotion.letter_signatory_name,
        letter_signatory_title: letter_signatory_title || promotion.letter_signatory_title,
      });

      return res.status(200).json({
        success: true,
        message: "Promotion letter configuration updated successfully",
        data: promotion,
      });
    } catch (err) {
      console.error("Error in updateLetterDetails:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 6. DELETE PROMOTION (ONLY DRAFT/PENDING)
  deletePromotion: async (req, res) => {
    try {
      const { id } = req.params;
      const promotion = await Promotion.findByPk(id);
      if (!promotion) {
        return res.status(404).json({ success: false, message: "Promotion not found" });
      }

      await promotion.destroy();
      return res.status(200).json({
        success: true,
        message: `Promotion order ${promotion.promotion_code} deleted successfully`,
      });
    } catch (err) {
      console.error("Error in deletePromotion:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 7. METADATA HELPER FOR FORM DROPDOWNS & SALARY BANDS
  getPromotionMetadata: async (req, res) => {
    try {
      const employees = await Employee.findAll({
        attributes: [
          "employee_id",
          "first_name",
          "last_name",
          "email",
          "dept",
          "designation",
          "current_salary",
          "grade_id",
        ],
        where: {
          status: { [Op.ne]: "Terminated" },
        },
        order: [["first_name", "ASC"]],
      });

      const formattedEmployees = employees.map((e) => {
        const rawSalary = parseFloat(e.current_salary) || 0.0;
        let detectedBasis = "monthly";
        let annualSalary = 0.0;
        let monthlySalary = 0.0;

        if (rawSalary > 0 && rawSalary < 100) {
          detectedBasis = "lpa";
          annualSalary = rawSalary * 100000;
          monthlySalary = Math.round(annualSalary / 12);
        } else if (rawSalary > 250000) {
          detectedBasis = "annual";
          annualSalary = rawSalary;
          monthlySalary = Math.round(annualSalary / 12);
        } else {
          detectedBasis = "monthly";
          monthlySalary = rawSalary;
          annualSalary = rawSalary * 12;
        }

        return {
          id: e.employee_id,
          name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.employee_id,
          email: e.email,
          dept: e.dept || "General",
          designation: e.designation || "Staff",
          current_salary: rawSalary,
          detected_basis: detectedBasis,
          monthly_salary: monthlySalary,
          annual_salary: annualSalary,
        };
      });

      // Fetch Grades
      let grades = [];
      try {
        grades = await JobGrade.findAll({
          order: [["rank_level", "ASC"]],
          attributes: [
            "id",
            "grade_code",
            "grade_name",
            "rank_level",
            "min_salary",
            "max_salary",
          ],
        });
      } catch (_) {}

      // Fetch Designations
      let designations = [];
      try {
        const desigRecords = await Designation.findAll({ attributes: ["title"] });
        designations = desigRecords.map((d) => d.title).filter(Boolean);
      } catch (_) {}

      if (designations.length === 0) {
        designations = [
          "Intern",
          "Executive",
          "Sr. Executive",
          "Asst. Manager",
          "Deputy Manager",
          "Manager",
          "Sr. Manager",
          "Asst. General Manager",
          "Deputy General Manager",
          "General Manager",
          "Director of Technology & Engineering",
          "Vice President - Global Sales & Enterprise",
          "Chief Human Resources Officer & Board Director",
          "CHRO/VP HR",
        ];
      }

      return res.status(200).json({
        success: true,
        data: {
          employees: formattedEmployees,
          grades,
          designations: Array.from(new Set(designations)),
          promotionTypes: [
            "Merit Promotion",
            "Grade Progression",
            "Accelerated Promotion",
            "Role Elevation",
          ],
        },
      });
    } catch (err) {
      console.error("Error in getPromotionMetadata:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = PromotionController;

