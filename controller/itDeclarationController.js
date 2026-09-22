const { User, Employee, ITDeclaration, sequelize } = require("../config/db");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");
const { calculateTax } = require("../utils/taxCalculator");

// Helper to determine financial year from date or month string
const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0 = Jan, 2 = Mar, 3 = Apr
  const year = today.getFullYear();
  if (month < 3) {
    // Jan, Feb, Mar belong to FY (Year-1)-(Year)
    return `${year - 1}-${year}`;
  }
  return `${year}-${year + 1}`;
};

const getAssessmentYear = (fy) => {
  const parts = fy.split("-");
  if (parts.length === 2) {
    const y1 = parseInt(parts[0], 10);
    const y2 = parseInt(parts[1], 10);
    return `${y1 + 1}-${y2 + 1}`;
  }
  return "2026-2027";
};

const safeJsonParse = (str, fallback = {}) => {
  if (!str) return fallback;
  if (typeof str === "object") return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

const ITDeclarationController = {
  // GET /api/auth/it-declaration/my?financial_year=2025-2026
  async getMyDeclaration(req, res) {
    try {
      const empId = req.user.employee_id;
      const requestedFY = req.query.financial_year || getCurrentFinancialYear();

      // Find user & profile details
      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee account not found" });
      }

      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      // Parse current salary structure
      let salaryStructure = safeJsonParse(user.salary_structure, null);
      const monthlyGross = parseFloat(user.current_salary) || 0;
      const annualGross = monthlyGross * 12;

      let annualBasic = 0;
      let annualHRA = 0;

      if (salaryStructure && salaryStructure.earnings) {
        const basic = parseFloat(salaryStructure.earnings.basic) || 0;
        const hra = parseFloat(salaryStructure.earnings.hra) || 0;
        annualBasic = basic * 12;
        annualHRA = hra * 12;
      } else {
        annualBasic = Math.round(annualGross * 0.40);
        annualHRA = Math.round(annualGross * 0.40);
      }

      // Parse PAN from bank details or employee profile
      let panNumber = "";
      if (user.bank_details) {
        const bank = safeJsonParse(user.bank_details);
        panNumber = bank.pan || bank.pan_number || "";
      }
      if (!panNumber && emp && emp.pan_no) {
        panNumber = emp.pan_no;
      }

      // Query declaration for this financial year
      let declaration = await ITDeclaration.findOne({
        where: {
          employee_id: user.employee_id,
          financial_year: requestedFY,
        },
      });

      // Prepare response data
      let declarationData = null;
      if (declaration) {
        declarationData = {
          id: declaration.id,
          employee_id: declaration.employee_id,
          financial_year: declaration.financial_year,
          assessment_year: declaration.assessment_year,
          regime: declaration.regime || "new",
          status: declaration.status,
          submission_date: declaration.submission_date,
          verification_date: declaration.verification_date,
          verified_by: declaration.verified_by,
          remarks: declaration.remarks,
          section_80c: safeJsonParse(declaration.section_80c, {}),
          section_80ccd_1b: safeJsonParse(declaration.section_80ccd_1b, {}),
          section_80d: safeJsonParse(declaration.section_80d, {}),
          section_24_home_loan: safeJsonParse(declaration.section_24_home_loan, {}),
          section_hra: safeJsonParse(declaration.section_hra, {}),
          other_deductions: safeJsonParse(declaration.other_deductions, {}),
          other_income: safeJsonParse(declaration.other_income, {}),
          tax_computation: safeJsonParse(declaration.tax_computation, null),
          proof_attachments: safeJsonParse(declaration.proof_attachments, []),
          createdAt: declaration.createdAt,
          updatedAt: declaration.updatedAt,
        };
      }

      // Always run fresh live calculation
      const liveComputation = calculateTax({
        annualGrossSalary: annualGross,
        annualBasicSalary: annualBasic,
        annualHRA: annualHRA,
        section80c: declarationData?.section_80c || {},
        section80ccd: declarationData?.section_80ccd_1b || {},
        section80d: declarationData?.section_80d || {},
        section24: declarationData?.section_24_home_loan || {},
        hraDetails: declarationData?.section_hra || {},
        otherDeductions: declarationData?.other_deductions || {},
        otherIncome: declarationData?.other_income || {},
        financialYear: requestedFY,
      });

      return res.json({
        success: true,
        employee: {
          id: user.id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          dept: user.dept || (emp && emp.dept) || "General",
          designation: user.designation || (emp && emp.designation) || "Staff",
          current_salary: monthlyGross,
          annual_gross: annualGross,
          annual_basic: annualBasic,
          annual_hra: annualHRA,
          pan: panNumber,
        },
        financial_year: requestedFY,
        assessment_year: getAssessmentYear(requestedFY),
        declaration: declarationData,
        tax_computation: declarationData?.tax_computation || liveComputation,
        live_computation: liveComputation,
      });
    } catch (err) {
      console.error("Get my declaration error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch IT declaration" });
    }
  },

  // POST /api/auth/it-declaration/save
  async saveDeclaration(req, res) {
    try {
      const empId = req.user.employee_id;
      const {
        financial_year = getCurrentFinancialYear(),
        regime = "new",
        action = "draft", // "draft" | "submit"
        section_80c = {},
        section_80ccd_1b = {},
        section_80d = {},
        section_24_home_loan = {},
        section_hra = {},
        other_deductions = {},
        other_income = {},
      } = req.body;

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Compute annual gross, basic, and HRA
      let salaryStructure = safeJsonParse(user.salary_structure, null);
      const monthlyGross = parseFloat(user.current_salary) || 0;
      const annualGross = monthlyGross * 12;

      let annualBasic = Math.round(annualGross * 0.40);
      let annualHRA = Math.round(annualGross * 0.40);
      if (salaryStructure && salaryStructure.earnings) {
        if (salaryStructure.earnings.basic) annualBasic = parseFloat(salaryStructure.earnings.basic) * 12;
        if (salaryStructure.earnings.hra) annualHRA = parseFloat(salaryStructure.earnings.hra) * 12;
      }

      // Run verified calculation
      const computation = calculateTax({
        annualGrossSalary: annualGross,
        annualBasicSalary: annualBasic,
        annualHRA: annualHRA,
        section80c: section_80c,
        section80ccd: section_80ccd_1b,
        section80d: section_80d,
        section24: section_24_home_loan,
        hraDetails: section_hra,
        otherDeductions: other_deductions,
        otherIncome: other_income,
        financialYear: financial_year,
      });

      // Find or create existing record
      let declaration = await ITDeclaration.findOne({
        where: {
          employee_id: user.employee_id,
          financial_year,
        },
      });

      const isSubmitting = action.toLowerCase() === "submit";
      const newStatus = isSubmitting ? "Submitted" : (declaration?.status === "Approved" ? "Approved" : "Draft");

      const updatePayload = {
        employee_id: user.employee_id,
        financial_year,
        assessment_year: getAssessmentYear(financial_year),
        regime: regime.toLowerCase() === "old" ? "old" : "new",
        status: newStatus,
        section_80c: JSON.stringify(section_80c),
        section_80ccd_1b: JSON.stringify(section_80ccd_1b),
        section_80d: JSON.stringify(section_80d),
        section_24_home_loan: JSON.stringify(section_24_home_loan),
        section_hra: JSON.stringify(section_hra),
        other_deductions: JSON.stringify(other_deductions),
        other_income: JSON.stringify(other_income),
        tax_computation: JSON.stringify(computation),
      };

      if (isSubmitting) {
        updatePayload.submission_date = new Date();
      }

      if (declaration) {
        await declaration.update(updatePayload);
      } else {
        declaration = await ITDeclaration.create(updatePayload);
      }

      return res.json({
        success: true,
        message: isSubmitting
          ? "IT Declaration submitted successfully for payroll verification"
          : "IT Declaration draft saved successfully",
        declaration: {
          id: declaration.id,
          status: declaration.status,
          regime: declaration.regime,
          financial_year: declaration.financial_year,
          submission_date: declaration.submission_date,
          tax_computation: computation,
        },
      });
    } catch (err) {
      console.error("Save declaration error:", err);
      return res.status(500).json({ success: false, error: "Failed to save IT declaration" });
    }
  },

  // POST /api/auth/it-declaration/upload-proof
  async uploadProof(req, res) {
    try {
      const empId = req.user.employee_id;
      const file = req.file;
      const { declaration_id, category = "General", section = "section_80c" } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: "No document uploaded" });
      }

      let declaration = null;
      if (declaration_id) {
        declaration = await ITDeclaration.findByPk(declaration_id);
      }

      if (!declaration) {
        const currentFY = getCurrentFinancialYear();
        declaration = await ITDeclaration.findOne({
          where: { employee_id: empId, financial_year: currentFY },
        });
      }

      if (!declaration) {
        // Auto create draft declaration if not existing yet
        declaration = await ITDeclaration.create({
          employee_id: empId,
          financial_year: getCurrentFinancialYear(),
          assessment_year: getAssessmentYear(getCurrentFinancialYear()),
          status: "Draft",
        });
      }

      const existingProofs = safeJsonParse(declaration.proof_attachments, []);
      const newProofItem = {
        id: `proof_${Date.now()}_${Math.round(Math.random() * 1000)}`,
        filename: file.filename,
        original_name: file.originalname,
        category,
        section,
        size: file.size,
        mimetype: file.mimetype,
        upload_date: new Date().toISOString(),
        verified: false,
        approved_amount: null,
      };

      existingProofs.push(newProofItem);
      await declaration.update({
        proof_attachments: JSON.stringify(existingProofs),
      });

      return res.json({
        success: true,
        message: "Proof document uploaded successfully",
        proof: newProofItem,
        proofs: existingProofs,
      });
    } catch (err) {
      console.error("Upload proof error:", err);
      return res.status(500).json({ success: false, error: "Failed to upload proof document" });
    }
  },

  // DELETE /api/auth/it-declaration/delete-proof/:declarationId/:proofId
  async deleteProof(req, res) {
    try {
      const empId = req.user.employee_id;
      const userRole = req.user.role;
      const { declarationId, proofId } = req.params;

      const declaration = await ITDeclaration.findByPk(declarationId);
      if (!declaration) {
        return res.status(404).json({ success: false, error: "Declaration not found" });
      }

      // Check ownership or admin rights
      const isOwner = declaration.employee_id.toLowerCase() === empId.toLowerCase();
      const isAdmin = ["hr", "accounts", "admin", "payroll"].includes(userRole);
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, error: "Unauthorized to delete this proof" });
      }

      let proofs = safeJsonParse(declaration.proof_attachments, []);
      const proofToRemove = proofs.find((p) => p.id === proofId);

      if (proofToRemove && proofToRemove.filename) {
        const filePath = path.join(__dirname, "../uploads", proofToRemove.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn("Could not delete file from disk:", e.message);
          }
        }
      }

      proofs = proofs.filter((p) => p.id !== proofId);
      await declaration.update({ proof_attachments: JSON.stringify(proofs) });

      return res.json({
        success: true,
        message: "Proof document deleted successfully",
        proofs,
      });
    } catch (err) {
      console.error("Delete proof error:", err);
      return res.status(500).json({ success: false, error: "Failed to delete proof document" });
    }
  },

  // GET /api/auth/it-declaration/all (HR, Accounts, Admin)
  async getAllDeclarations(req, res) {
    try {
      const {
        financial_year = getCurrentFinancialYear(),
        status,
        regime,
        dept,
        search,
      } = req.query;

      // Find all matching declarations
      const whereClause = {
        financial_year,
      };

      if (status && status !== "all") {
        whereClause.status = status;
      }
      if (regime && regime !== "all") {
        whereClause.regime = regime;
      }

      // Query declarations with User details
      const declarations = await ITDeclaration.findAll({
        where: whereClause,
        order: [["updated_at", "DESC"]],
      });

      // Fetch all employees/users to enrich declarations list
      const users = await User.findAll({
        attributes: ["employee_id", "name", "email", "dept", "designation", "current_salary", "bank_details"],
      });

      const userMap = {};
      users.forEach((u) => {
        userMap[u.employee_id.toLowerCase()] = u;
      });

      const enrichedList = declarations.map((decl) => {
        const u = userMap[decl.employee_id.toLowerCase()] || {};
        const computation = safeJsonParse(decl.tax_computation, {});
        const proofs = safeJsonParse(decl.proof_attachments, []);
        const chosenRegime = decl.regime || "new";
        const chosenTaxDetails = chosenRegime === "old" ? computation.old_regime : computation.new_regime;

        return {
          id: decl.id,
          employee_id: decl.employee_id,
          name: u.name || decl.employee_id,
          email: u.email || "",
          dept: u.dept || "General",
          designation: u.designation || "Staff",
          current_salary: parseFloat(u.current_salary) || 0,
          financial_year: decl.financial_year,
          regime: chosenRegime,
          status: decl.status,
          submission_date: decl.submission_date,
          verification_date: decl.verification_date,
          verified_by: decl.verified_by,
          proofs_count: proofs.length,
          taxable_income: chosenTaxDetails?.net_taxable_income || 0,
          annual_tax: chosenTaxDetails?.total_annual_tax || 0,
          monthly_tds: chosenTaxDetails?.monthly_tds || 0,
          savings: computation.comparison?.savings || 0,
          recommended_regime: computation.comparison?.recommended_regime || "new",
        };
      });

      // Apply dept and search filters if requested
      let filtered = enrichedList;
      if (dept && dept !== "all") {
        filtered = filtered.filter((d) => (d.dept || "").toLowerCase() === dept.toLowerCase());
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.employee_id.toLowerCase().includes(q) ||
            d.name.toLowerCase().includes(q) ||
            d.email.toLowerCase().includes(q)
        );
      }

      // Calculate overview metrics across all declarations for this financial year
      const totalEmployeesCount = users.length;
      const allDeclarationsThisFY = await ITDeclaration.findAll({
        where: { financial_year },
        attributes: ["status", "regime"],
      });

      const stats = {
        total_employees: totalEmployeesCount,
        total_declared: allDeclarationsThisFY.length,
        submitted: allDeclarationsThisFY.filter((d) => d.status === "Submitted").length,
        approved: allDeclarationsThisFY.filter((d) => d.status === "Approved").length,
        drafts: allDeclarationsThisFY.filter((d) => d.status === "Draft").length,
        pending_review: allDeclarationsThisFY.filter((d) => ["Submitted", "Pending Verification"].includes(d.status)).length,
        new_regime_count: allDeclarationsThisFY.filter((d) => d.regime === "new").length,
        old_regime_count: allDeclarationsThisFY.filter((d) => d.regime === "old").length,
      };

      return res.json({
        success: true,
        financial_year,
        stats,
        declarations: filtered,
      });
    } catch (err) {
      console.error("Get all declarations error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch declarations list" });
    }
  },

  // GET /api/auth/it-declaration/:id
  async getDeclarationById(req, res) {
    try {
      const { id } = req.params;
      const declaration = await ITDeclaration.findByPk(id);

      if (!declaration) {
        return res.status(404).json({ success: false, error: "Declaration not found" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          declaration.employee_id.toLowerCase().trim()
        ),
      });

      let panNumber = "";
      if (user?.bank_details) {
        const bank = safeJsonParse(user.bank_details);
        panNumber = bank.pan || bank.pan_number || "";
      }

      return res.json({
        success: true,
        declaration: {
          id: declaration.id,
          employee_id: declaration.employee_id,
          name: user?.name || declaration.employee_id,
          email: user?.email || "",
          dept: user?.dept || "General",
          designation: user?.designation || "Staff",
          current_salary: user?.current_salary || 0,
          pan: panNumber,
          financial_year: declaration.financial_year,
          assessment_year: declaration.assessment_year,
          regime: declaration.regime,
          status: declaration.status,
          submission_date: declaration.submission_date,
          verification_date: declaration.verification_date,
          verified_by: declaration.verified_by,
          remarks: declaration.remarks,
          section_80c: safeJsonParse(declaration.section_80c, {}),
          section_80ccd_1b: safeJsonParse(declaration.section_80ccd_1b, {}),
          section_80d: safeJsonParse(declaration.section_80d, {}),
          section_24_home_loan: safeJsonParse(declaration.section_24_home_loan, {}),
          section_hra: safeJsonParse(declaration.section_hra, {}),
          other_deductions: safeJsonParse(declaration.other_deductions, {}),
          other_income: safeJsonParse(declaration.other_income, {}),
          tax_computation: safeJsonParse(declaration.tax_computation, {}),
          proof_attachments: safeJsonParse(declaration.proof_attachments, []),
        },
      });
    } catch (err) {
      console.error("Get declaration by ID error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch declaration" });
    }
  },

  // PATCH /api/auth/it-declaration/:id/review (HR, Accounts, Admin)
  async reviewDeclaration(req, res) {
    try {
      const { id } = req.params;
      const {
        status, // "Approved", "Rejected", "Pending Verification"
        remarks,
        approved_sections, // Optional updated verified figures
      } = req.body;

      const reviewerName = req.user.name || req.user.email || req.user.employee_id;

      const declaration = await ITDeclaration.findByPk(id);
      if (!declaration) {
        return res.status(404).json({ success: false, error: "Declaration not found" });
      }

      const updateData = {
        status: status || declaration.status,
        remarks: remarks !== undefined ? remarks : declaration.remarks,
        verified_by: reviewerName,
        verification_date: new Date(),
      };

      // If approved and approved_sections provided, update the values and re-run tax calculation
      if (approved_sections) {
        if (approved_sections.section_80c) updateData.section_80c = JSON.stringify(approved_sections.section_80c);
        if (approved_sections.section_80ccd_1b) updateData.section_80ccd_1b = JSON.stringify(approved_sections.section_80ccd_1b);
        if (approved_sections.section_80d) updateData.section_80d = JSON.stringify(approved_sections.section_80d);
        if (approved_sections.section_24_home_loan) updateData.section_24_home_loan = JSON.stringify(approved_sections.section_24_home_loan);
        if (approved_sections.section_hra) updateData.section_hra = JSON.stringify(approved_sections.section_hra);
        if (approved_sections.other_deductions) updateData.other_deductions = JSON.stringify(approved_sections.other_deductions);
      }

      // Re-run computation with latest numbers
      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          declaration.employee_id.toLowerCase().trim()
        ),
      });

      const monthlyGross = parseFloat(user?.current_salary) || 0;
      const annualGross = monthlyGross * 12;

      const updatedComputation = calculateTax({
        annualGrossSalary: annualGross,
        annualBasicSalary: Math.round(annualGross * 0.40),
        annualHRA: Math.round(annualGross * 0.40),
        section80c: safeJsonParse(updateData.section_80c || declaration.section_80c, {}),
        section80ccd: safeJsonParse(updateData.section_80ccd_1b || declaration.section_80ccd_1b, {}),
        section80d: safeJsonParse(updateData.section_80d || declaration.section_80d, {}),
        section24: safeJsonParse(updateData.section_24_home_loan || declaration.section_24_home_loan, {}),
        hraDetails: safeJsonParse(updateData.section_hra || declaration.section_hra, {}),
        otherDeductions: safeJsonParse(updateData.other_deductions || declaration.other_deductions, {}),
        otherIncome: safeJsonParse(declaration.other_income, {}),
        financialYear: declaration.financial_year,
      });

      updateData.tax_computation = JSON.stringify(updatedComputation);

      await declaration.update(updateData);

      return res.json({
        success: true,
        message: `Declaration ${status.toLowerCase()} successfully`,
        declaration: {
          id: declaration.id,
          status: declaration.status,
          verified_by: declaration.verified_by,
          verification_date: declaration.verification_date,
          tax_computation: updatedComputation,
        },
      });
    } catch (err) {
      console.error("Review declaration error:", err);
      return res.status(500).json({ success: false, error: "Failed to review declaration" });
    }
  },

  // POST /api/auth/it-declaration/calculate
  async calculateTaxPreview(req, res) {
    try {
      const {
        annualGrossSalary = 0,
        annualBasicSalary = 0,
        annualHRA = 0,
        section80c = {},
        section80ccd = {},
        section80d = {},
        section24 = {},
        hraDetails = {},
        otherDeductions = {},
        otherIncome = {},
        financialYear = getCurrentFinancialYear(),
      } = req.body;

      const result = calculateTax({
        annualGrossSalary,
        annualBasicSalary,
        annualHRA,
        section80c,
        section80ccd,
        section80d,
        section24,
        hraDetails,
        otherDeductions,
        otherIncome,
        financialYear,
      });

      return res.json({ success: true, computation: result });
    } catch (err) {
      console.error("Tax preview calculation error:", err);
      return res.status(500).json({ success: false, error: "Calculation failed" });
    }
  },
};

module.exports = ITDeclarationController;
