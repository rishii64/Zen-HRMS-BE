const {
  LoanAdvance,
  LoanRepaymentLog,
  Employee,
  User,
  ApprovalRequest,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");
const { sendRealtimeNotification } = require("../socket");
const { initiateApprovalRequest, processApprovalAction } = require("../services/approvalEngine");

// Helper to get company loan interest rate from system settings
let tablesEnsured = false;
const ensureLoanTablesExist = async () => {
  if (tablesEnsured) return;
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS loans_advances (
        id SERIAL PRIMARY KEY,
        application_number VARCHAR(50) NOT NULL UNIQUE,
        employee_id VARCHAR(50) NOT NULL,
        employee_name VARCHAR(150) NOT NULL,
        employee_email VARCHAR(255),
        department VARCHAR(100),
        designation VARCHAR(100),
        type VARCHAR(50) NOT NULL DEFAULT 'SALARY_ADVANCE',
        principal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        interest_rate FLOAT NOT NULL DEFAULT 0,
        interest_type VARCHAR(50) DEFAULT 'REDUCING_BALANCE',
        tenure_months INTEGER NOT NULL DEFAULT 1,
        monthly_emi DECIMAL(12, 2) NOT NULL DEFAULT 0,
        total_interest DECIMAL(12, 2) NOT NULL DEFAULT 0,
        total_repayable DECIMAL(12, 2) NOT NULL DEFAULT 0,
        remaining_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(12, 2) DEFAULT 0,
        paid_installments INTEGER DEFAULT 0,
        total_installments INTEGER NOT NULL DEFAULT 1,
        purpose VARCHAR(255) NOT NULL,
        reason_details TEXT,
        repayment_start_month VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
        repayment_schedule JSONB,
        manager_id VARCHAR(50),
        manager_name VARCHAR(150),
        manager_decision VARCHAR(50),
        manager_comments TEXT,
        manager_action_date TIMESTAMPTZ,
        finance_id VARCHAR(50),
        finance_name VARCHAR(150),
        finance_decision VARCHAR(50),
        finance_comments TEXT,
        finance_action_date TIMESTAMPTZ,
        disbursement_date DATE,
        disbursement_mode VARCHAR(50) DEFAULT 'Bank Transfer',
        disbursement_ref VARCHAR(100),
        disbursed_by VARCHAR(150),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS loan_repayment_logs (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loans_advances(id) ON DELETE CASCADE,
        employee_id VARCHAR(50) NOT NULL,
        month_year VARCHAR(20) NOT NULL,
        installment_number INTEGER NOT NULL,
        emi_amount DECIMAL(12, 2) NOT NULL,
        principal_component DECIMAL(12, 2) NOT NULL,
        interest_component DECIMAL(12, 2) NOT NULL DEFAULT 0,
        remaining_balance_after DECIMAL(12, 2) NOT NULL,
        payment_source VARCHAR(50) DEFAULT 'PAYROLL_DEDUCTION',
        payroll_id INTEGER,
        deduction_date DATE NOT NULL DEFAULT CURRENT_DATE,
        remarks VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_loan_emp ON loans_advances (employee_id);
      CREATE INDEX IF NOT EXISTS idx_loan_status ON loans_advances (status);
      CREATE INDEX IF NOT EXISTS idx_loan_type ON loans_advances (type);
      CREATE INDEX IF NOT EXISTS idx_repayment_loan_id ON loan_repayment_logs (loan_id);
      CREATE INDEX IF NOT EXISTS idx_repayment_emp ON loan_repayment_logs (employee_id);
    `);
    tablesEnsured = true;
  } catch (e) {
    console.warn("ensureLoanTablesExist note:", e.message);
  }
};

// Auto-trigger table creation
ensureLoanTablesExist();

const getCompanyInterestRate = async () => {
  try {
    const [rows] = await sequelize.query("SELECT value FROM system_settings WHERE key = 'company_loan_interest_rate' LIMIT 1");
    if (rows && rows.length > 0 && rows[0].value) {
      return parseFloat(rows[0].value) || 8.5;
    }
  } catch (e) {
    console.warn("Could not fetch company_loan_interest_rate:", e.message);
  }
  return 8.5;
};

// Helper: Calculate month string + offset
const addMonthsToMonthStr = (startMonthStr, offset) => {
  let [year, month] = startMonthStr.split("-").map(Number);
  if (!year || !month) {
    const d = new Date();
    year = d.getFullYear();
    month = d.getMonth() + 1;
  }
  const date = new Date(year, month - 1 + offset, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${monthNames[date.getMonth()]} ${y}`;
  return { month_year: `${y}-${m}`, month_label: label };
};

// Core financial amortization calculator
const calculateAmortization = (principal, tenureMonths, annualInterestRate, startMonthStr) => {
  const P = Math.max(0, parseFloat(principal) || 0);
  const N = Math.max(1, parseInt(tenureMonths, 10) || 1);
  const rate = Math.max(0, parseFloat(annualInterestRate) || 0);

  let monthlyEmi = 0;
  let totalInterest = 0;
  let totalRepayable = 0;

  if (rate === 0) {
    // 0% Interest (e.g. Salary Advance)
    monthlyEmi = Math.round((P / N) * 100) / 100;
    totalInterest = 0;
    totalRepayable = P;
  } else {
    // Standard Reducing Balance Loan Formula:
    // EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
    const r = rate / (12 * 100);
    const compound = Math.pow(1 + r, N);
    const emiRaw = (P * r * compound) / (compound - 1);
    monthlyEmi = Math.round(emiRaw * 100) / 100;
    totalRepayable = Math.round(monthlyEmi * N * 100) / 100;
    totalInterest = Math.round(Math.max(0, totalRepayable - P) * 100) / 100;
  }

  // Generate Amortization Schedule
  const schedule = [];
  let currentBalance = P;
  const r = rate > 0 ? rate / (12 * 100) : 0;

  for (let i = 1; i <= N; i++) {
    const { month_year, month_label } = addMonthsToMonthStr(startMonthStr, i - 1);
    const interestComponent = rate > 0 ? Math.round(currentBalance * r * 100) / 100 : 0;
    let principalComponent = Math.round((monthlyEmi - interestComponent) * 100) / 100;

    // Last month adjustment to clear rounding diffs
    if (i === N || principalComponent > currentBalance) {
      principalComponent = currentBalance;
    }

    const closingBalance = Math.max(0, Math.round((currentBalance - principalComponent) * 100) / 100);

    schedule.push({
      installment_no: i,
      month_year,
      month_label,
      opening_balance: currentBalance,
      emi: Math.round((principalComponent + interestComponent) * 100) / 100,
      principal_component: principalComponent,
      interest_component: interestComponent,
      closing_balance: closingBalance,
      status: "SCHEDULED",
    });

    currentBalance = closingBalance;
  }

  return {
    principal: P,
    interest_rate: rate,
    tenure_months: N,
    monthly_emi: monthlyEmi,
    total_interest: totalInterest,
    total_repayable: totalRepayable,
    schedule,
  };
};

const loanAdvanceController = {
  // 1. Calculate EMI Preview (Simulator)
  async calculateEmiPreview(req, res) {
    try {
      const {
        amount,
        tenure_months,
        type = "SALARY_ADVANCE",
        interest_rate,
        start_month,
      } = req.query;

      const companyRate = await getCompanyInterestRate();
      const isAdvance = type.toUpperCase() === "SALARY_ADVANCE";
      const finalRate = isAdvance ? 0 : (interest_rate !== undefined ? parseFloat(interest_rate) : companyRate);

      // Default start month: next calendar month
      const istDate = new Date();
      istDate.setMonth(istDate.getMonth() + 1);
      const defaultStartMonth = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, "0")}`;
      const effectiveStart = start_month || defaultStartMonth;

      const calc = calculateAmortization(amount, tenure_months, finalRate, effectiveStart);

      return res.json({
        success: true,
        type: isAdvance ? "SALARY_ADVANCE" : "LOAN",
        preview: calc,
      });
    } catch (err) {
      console.error("Calculate EMI preview error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to calculate EMI preview" });
    }
  },

  // 2. Apply for Loan or Salary Advance
  async applyLoanAdvance(req, res) {
    try {
      await ensureLoanTablesExist();
      const {
        employee_id,
        type = "SALARY_ADVANCE",
        principal_amount,
        tenure_months,
        purpose,
        reason_details,
        repayment_start_month,
        interest_rate,
      } = req.body;

      const targetEmpId = employee_id || req.user?.employee_id || req.user?.id;
      if (!targetEmpId) {
        return res.status(400).json({ success: false, error: "Employee ID is required" });
      }

      // Lookup Employee Profile
      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          String(targetEmpId).trim().toLowerCase()
        ),
      });

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          String(targetEmpId).trim().toLowerCase()
        ),
      });

      if (!emp && !user) {
        return res.status(404).json({ success: false, error: "Employee profile not found" });
      }

      const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : user.name;
      const empEmail = emp?.work_email || user?.email;
      const empDept = emp?.dept || user?.dept || "General";
      const empDesig = emp?.designation || user?.designation || "Staff";
      const isPermanent = (emp?.employment_type || user?.employment_type || "permanent").toLowerCase() === "permanent";

      const P = parseFloat(principal_amount) || 0;
      const N = parseInt(tenure_months, 10) || 1;
      const isAdvance = type.toUpperCase() === "SALARY_ADVANCE";

      // Validations
      if (isAdvance) {
        if (P <= 0 || P > 100000) {
          return res.status(400).json({ success: false, error: "Salary advance amount must be between ₹1,000 and ₹1,00,000" });
        }
        if (N < 1 || N > 6) {
          return res.status(400).json({ success: false, error: "Salary advance tenure must be between 1 and 6 months" });
        }
      } else {
        if (P < 100000 || P > 1000000) {
          return res.status(400).json({ success: false, error: "Company loan amount must be between ₹1,00,000 and ₹10,00,000" });
        }
        if (N < 6 || N > 60) {
          return res.status(400).json({ success: false, error: "Company loan tenure must be between 6 and 60 months" });
        }
        if (!isPermanent) {
          return res.status(400).json({ success: false, error: "Company loans are strictly reserved for permanent confirmed employees" });
        }
      }

      if (!purpose || !purpose.trim()) {
        return res.status(400).json({ success: false, error: "Purpose for application is required" });
      }

      // Check active loan policy: Only 1 active loan of same type at a time
      const existingActive = await LoanAdvance.findOne({
        where: {
          employee_id: String(targetEmpId).trim(),
          type: isAdvance ? "SALARY_ADVANCE" : "LOAN",
          status: { [Op.in]: ["PENDING_APPROVAL", "APPROVED", "DISBURSED", "ACTIVE"] },
          remaining_balance: { [Op.gt]: 0 },
        },
      });

      if (existingActive) {
        return res.status(400).json({
          success: false,
          error: `You already have an active or pending ${isAdvance ? "Salary Advance" : "Company Loan"} (${existingActive.application_number}) with an outstanding balance of ₹${parseFloat(existingActive.remaining_balance).toLocaleString("en-IN")}.`,
        });
      }

      // Calculate Amortization
      const companyDefaultRate = await getCompanyInterestRate();
      const finalRate = isAdvance
        ? 0
        : (interest_rate !== undefined && !isNaN(parseFloat(interest_rate))
            ? parseFloat(interest_rate)
            : companyDefaultRate);
      const currentYear = new Date().getFullYear();
      const istDate = new Date();
      istDate.setMonth(istDate.getMonth() + 1);
      const defaultStartMonth = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, "0")}`;
      const effectiveStart = repayment_start_month || defaultStartMonth;

      const calc = calculateAmortization(P, N, finalRate, effectiveStart);

      // Generate Application Number: ADV-2026-0001 or LOAN-2026-0001
      const prefix = isAdvance ? "ADV" : "LOAN";
      const countTotal = await LoanAdvance.count({ where: { type: isAdvance ? "SALARY_ADVANCE" : "LOAN" } });
      const seq = String(countTotal + 1).padStart(4, "0");
      const appNumber = `${prefix}-${currentYear}-${seq}`;

      // Create Record
      const newLoan = await LoanAdvance.create({
        application_number: appNumber,
        employee_id: String(targetEmpId).trim(),
        employee_name: empName,
        employee_email: empEmail,
        department: empDept,
        designation: empDesig,
        type: isAdvance ? "SALARY_ADVANCE" : "LOAN",
        principal_amount: P,
        interest_rate: finalRate,
        interest_type: "REDUCING_BALANCE",
        tenure_months: N,
        monthly_emi: calc.monthly_emi,
        total_interest: calc.total_interest,
        total_repayable: calc.total_repayable,
        remaining_balance: calc.total_repayable,
        paid_amount: 0,
        paid_installments: 0,
        total_installments: N,
        purpose: purpose.trim(),
        reason_details: reason_details || null,
        repayment_start_month: effectiveStart,
        status: "PENDING_APPROVAL",
        repayment_schedule: calc.schedule,
        manager_id: emp?.reporting_manager_id || null,
        manager_name: emp?.reporting_manager || null,
      });

      // Initiate Multi-Level Sequential Approval Workflow
      let approvalReq = null;
      try {
        approvalReq = await initiateApprovalRequest({
          module: "LOAN",
          entityId: newLoan.id,
          employee: emp || { employee_id: targetEmpId, first_name: empName, dept: empDept },
          title: `${isAdvance ? "Salary Advance" : "Company Loan"} - ₹${P.toLocaleString("en-IN")} (${empName})`,
          amount: P,
          meta: {
            application_number: appNumber,
            tenure_months: N,
            monthly_emi: calc.monthly_emi,
            purpose: purpose.trim(),
            type: isAdvance ? "SALARY_ADVANCE" : "LOAN",
          },
        });
      } catch (apprErr) {
        console.warn("Could not initiate approval workflow for loan:", apprErr.message);
      }

      // Realtime notification to employee
      sendRealtimeNotification({
        recipient_id: String(targetEmpId).trim(),
        title: `${isAdvance ? "Salary Advance" : "Company Loan"} Submitted 📋`,
        message: `Your application (${appNumber}) for ₹${P.toLocaleString("en-IN")} has been submitted and routed for multi-level approval.`,
        type: "loan",
        category: "Loans & Advances",
        link: "/loans",
        priority: "medium",
        source_module: "loans",
        created_by: empName,
      }).catch((e) => console.warn("Socket notify loan error:", e.message));

      return res.status(201).json({
        success: true,
        message: `${isAdvance ? "Salary Advance" : "Company Loan"} application submitted successfully!`,
        loan: newLoan,
        approval_request: approvalReq,
      });
    } catch (err) {
      console.error("Apply loan/advance error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to submit loan application" });
    }
  },

  // 3. Get Logged-in Employee's Loans & Advances
  async getMyLoansAdvances(req, res) {
    try {
      await ensureLoanTablesExist();
      const empId = req.user?.employee_id || req.user?.id || req.query.employee_id;
      if (!empId) {
        return res.status(400).json({ success: false, error: "Employee ID is required" });
      }

      const loans = await LoanAdvance.findAll({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("LoanAdvance.employee_id")),
          String(empId).trim().toLowerCase()
        ),
        include: [
          {
            model: LoanRepaymentLog,
            as: "repaymentLogs",
            required: false,
          },
        ],
        order: [["id", "DESC"]],
      });

      // Compute statistics
      let totalAvailed = 0;
      let activeOutstanding = 0;
      let monthlyEmiTotal = 0;
      let completedCount = 0;
      let activeCount = 0;

      loans.forEach((l) => {
        const principal = parseFloat(l.principal_amount) || 0;
        const remaining = parseFloat(l.remaining_balance) || 0;
        const emi = parseFloat(l.monthly_emi) || 0;

        if (["APPROVED", "DISBURSED", "ACTIVE", "COMPLETED"].includes(l.status)) {
          totalAvailed += principal;
        }
        if (["ACTIVE", "DISBURSED"].includes(l.status) && remaining > 0) {
          activeOutstanding += remaining;
          monthlyEmiTotal += emi;
          activeCount += 1;
        }
        if (l.status === "COMPLETED" || (remaining <= 0 && l.paid_amount > 0)) {
          completedCount += 1;
        }
      });

      return res.json({
        success: true,
        loans,
        summary: {
          total_availed: totalAvailed,
          active_outstanding: activeOutstanding,
          monthly_emi_total: monthlyEmiTotal,
          active_count: activeCount,
          completed_count: completedCount,
          total_applications: loans.length,
        },
      });
    } catch (err) {
      console.error("Get my loans error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch loans" });
    }
  },

  // 4. Get All Loans & Advances (HR / Finance / Admin View)
  async getAllLoansAdvances(req, res) {
    try {
      await ensureLoanTablesExist();
      const { status, type, department, search } = req.query;
      const whereClause = {};

      if (status && status !== "ALL") {
        whereClause.status = status;
      }
      if (type && type !== "ALL") {
        whereClause.type = type;
      }
      if (department && department !== "ALL") {
        whereClause.department = department;
      }
      if (search && search.trim()) {
        const s = `%${search.trim().toLowerCase()}%`;
        whereClause[Op.or] = [
          sequelize.where(sequelize.fn("LOWER", sequelize.col("LoanAdvance.employee_name")), { [Op.like]: s }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("LoanAdvance.employee_id")), { [Op.like]: s }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("LoanAdvance.application_number")), { [Op.like]: s }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("LoanAdvance.purpose")), { [Op.like]: s }),
        ];
      }

      const loans = await LoanAdvance.findAll({
        where: whereClause,
        include: [
          {
            model: LoanRepaymentLog,
            as: "repaymentLogs",
            required: false,
          },
        ],
        order: [["id", "DESC"]],
      });

      // Overall Company Loan Statistics
      const allRecords = await LoanAdvance.findAll();
      let totalDisbursed = 0;
      let totalOutstanding = 0;
      let totalMonthlyRecovery = 0;
      let pendingSanctionCount = 0;

      allRecords.forEach((l) => {
        const principal = parseFloat(l.principal_amount) || 0;
        const remaining = parseFloat(l.remaining_balance) || 0;
        const emi = parseFloat(l.monthly_emi) || 0;

        if (["DISBURSED", "ACTIVE", "COMPLETED"].includes(l.status)) {
          totalDisbursed += principal;
        }
        if (["ACTIVE", "DISBURSED"].includes(l.status) && remaining > 0) {
          totalOutstanding += remaining;
          totalMonthlyRecovery += emi;
        }
        if (l.status === "PENDING_APPROVAL") {
          pendingSanctionCount += 1;
        }
      });

      const companyInterestRate = await getCompanyInterestRate();

      return res.json({
        success: true,
        loans,
        summary: {
          total_disbursed: totalDisbursed,
          total_outstanding: totalOutstanding,
          total_monthly_recovery: totalMonthlyRecovery,
          pending_sanctions: pendingSanctionCount,
          company_interest_rate: companyInterestRate,
          total_records: loans.length,
        },
      });
    } catch (err) {
      console.error("Get all loans error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to fetch loans" });
    }
  },

  // 5. Get Single Loan Details with Approval History
  async getLoanDetails(req, res) {
    try {
      await ensureLoanTablesExist();
      const { id } = req.params;
      const loan = await LoanAdvance.findOne({
        where: {
          [Op.or]: [
            { id: isNaN(parseInt(id, 10)) ? 0 : parseInt(id, 10) },
            { application_number: String(id).trim() },
          ],
        },
        include: [
          {
            model: LoanRepaymentLog,
            as: "repaymentLogs",
            required: false,
          },
        ],
      });

      if (!loan) {
        return res.status(404).json({ success: false, error: "Loan/Advance application not found" });
      }

      // Fetch Approval Request and Steps if exists
      let approvalDetails = null;
      try {
        approvalDetails = await ApprovalRequest.findOne({
          where: {
            module: "LOAN",
            entity_id: String(loan.id),
          },
          include: ["steps"],
        });
      } catch (apprErr) {
        console.warn("Approval details query warning:", apprErr.message);
      }

      return res.json({
        success: true,
        loan,
        approval_request: approvalDetails,
      });
    } catch (err) {
      console.error("Get loan details error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to get loan details" });
    }
  },

  // 6. Review Loan / Advance (Manager / HOD / Finance Approval)
  async reviewLoanAdvance(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments } = req.body;
      const approverUser = req.user || {
        employee_id: req.headers.employee_id || "HR-ADMIN",
        name: req.headers.user_name || "Approver",
        role: req.headers.role || "finance",
      };

      const loan = await LoanAdvance.findByPk(id);
      if (!loan) {
        return res.status(404).json({ success: false, error: "Loan/Advance application not found" });
      }

      // Check if sequential approval request exists
      const apprReq = await ApprovalRequest.findOne({
        where: {
          module: "LOAN",
          entity_id: String(loan.id),
          status: { [Op.in]: ["PENDING", "IN_PROGRESS"] },
        },
      });

      if (apprReq) {
        const result = await processApprovalAction(apprReq.id, approverUser, decision, comments);
        return res.json(result);
      }

      // Fallback Direct Review
      const isApproved = decision === "APPROVED";
      await loan.update({
        status: isApproved ? "APPROVED" : "REJECTED",
        finance_id: approverUser.employee_id,
        finance_name: approverUser.name,
        finance_decision: isApproved ? "APPROVED" : "REJECTED",
        finance_comments: comments || (isApproved ? "Approved by reviewer" : "Rejected by reviewer"),
        finance_action_date: new Date(),
      });

      sendRealtimeNotification({
        recipient_id: loan.employee_id,
        title: `${loan.type === "SALARY_ADVANCE" ? "Salary Advance" : "Loan"} ${loan.status} ${isApproved ? "✅" : "❌"}`,
        message: `Your application (${loan.application_number}) has been ${loan.status.toLowerCase()} by ${approverUser.name}.`,
        type: "loan",
        category: "Loans & Advances",
        link: "/loans",
        priority: "high",
        source_module: "loans",
        created_by: approverUser.name,
      }).catch((e) => console.warn("Socket review loan notify error:", e.message));

      return res.json({
        success: true,
        message: `Application ${loan.application_number} successfully ${isApproved ? "approved" : "rejected"}!`,
        loan,
      });
    } catch (err) {
      console.error("Review loan error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to review loan application" });
    }
  },

  // 7. Disburse Loan / Advance (Finance & Accounts Action)
  async disburseLoanAdvance(req, res) {
    try {
      const { id } = req.params;
      const { disbursement_mode = "Bank Transfer", disbursement_ref, disbursement_date, comments } = req.body;
      const financeUser = req.user || { name: req.headers.user_name || "Finance Accounts" };

      const loan = await LoanAdvance.findByPk(id);
      if (!loan) {
        return res.status(404).json({ success: false, error: "Loan/Advance application not found" });
      }

      if (loan.status !== "APPROVED") {
        return res.status(400).json({
          success: false,
          error: `Cannot disburse loan in '${loan.status}' status. It must be in 'APPROVED' status before disbursement.`,
        });
      }

      const dDate = disbursement_date || new Date().toISOString().split("T")[0];

      await loan.update({
        status: "ACTIVE",
        disbursement_date: dDate,
        disbursement_mode,
        disbursement_ref: disbursement_ref || `TXN-${Date.now()}`,
        disbursed_by: financeUser.name || "Finance Operations",
        finance_comments: comments || loan.finance_comments,
        remaining_balance: loan.total_repayable,
        paid_amount: 0,
        paid_installments: 0,
      });

      // Realtime notification to employee
      sendRealtimeNotification({
        recipient_id: loan.employee_id,
        title: `Funds Disbursed! ${loan.type === "SALARY_ADVANCE" ? "Salary Advance" : "Loan"} Credited 💰`,
        message: `₹${parseFloat(loan.principal_amount).toLocaleString("en-IN")} has been disbursed via ${disbursement_mode} (Ref: ${loan.disbursement_ref}). Monthly deductions of ₹${parseFloat(loan.monthly_emi).toLocaleString("en-IN")} will begin from ${loan.repayment_start_month}.`,
        type: "loan",
        category: "Loans & Advances",
        link: "/loans",
        priority: "high",
        source_module: "loans",
        created_by: "Finance & Accounts",
      }).catch((e) => console.warn("Socket disburse loan notify error:", e.message));

      return res.json({
        success: true,
        message: `Loan ${loan.application_number} marked as DISBURSED & ACTIVE. Payroll auto-deduction scheduled.`,
        loan,
      });
    } catch (err) {
      console.error("Disburse loan error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to disburse loan" });
    }
  },

  // 8. Record Manual Repayment / Pre-payment / Settlement
  async recordManualRepayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, remarks, payment_source = "MANUAL_PAYMENT" } = req.body;

      const loan = await LoanAdvance.findByPk(id);
      if (!loan) {
        return res.status(404).json({ success: false, error: "Loan/Advance not found" });
      }

      const repayAmt = Math.round(parseFloat(amount) * 100) / 100;
      if (isNaN(repayAmt) || repayAmt <= 0) {
        return res.status(400).json({ success: false, error: "Valid repayment amount is required" });
      }

      const currentBalance = parseFloat(loan.remaining_balance) || 0;
      if (repayAmt > currentBalance + 1) {
        return res.status(400).json({
          success: false,
          error: `Repayment amount (₹${repayAmt}) exceeds current remaining balance (₹${currentBalance})`,
        });
      }

      const newBalance = Math.max(0, Math.round((currentBalance - repayAmt) * 100) / 100);
      const newPaidAmount = Math.round(((parseFloat(loan.paid_amount) || 0) + repayAmt) * 100) / 100;
      const nextInstallmentNo = (loan.paid_installments || 0) + 1;

      const istDate = new Date();
      const currentMonthYear = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, "0")}`;

      // Create repayment log
      const log = await LoanRepaymentLog.create({
        loan_id: loan.id,
        employee_id: loan.employee_id,
        month_year: currentMonthYear,
        installment_number: nextInstallmentNo,
        emi_amount: repayAmt,
        principal_component: repayAmt,
        interest_component: 0,
        remaining_balance_after: newBalance,
        payment_source,
        deduction_date: new Date().toISOString().split("T")[0],
        remarks: remarks || `Manual repayment of ₹${repayAmt}`,
      });

      // Update schedule status if matched
      let schedule = Array.isArray(loan.repayment_schedule) ? [...loan.repayment_schedule] : [];
      const scheduledIdx = schedule.findIndex((s) => s.status === "SCHEDULED");
      if (scheduledIdx !== -1) {
        schedule[scheduledIdx].status = "PAID";
        schedule[scheduledIdx].paid_date = new Date().toISOString().split("T")[0];
      }

      const isCompleted = newBalance <= 0;
      await loan.update({
        remaining_balance: newBalance,
        paid_amount: newPaidAmount,
        paid_installments: nextInstallmentNo,
        status: isCompleted ? "COMPLETED" : loan.status,
        repayment_schedule: schedule,
      });

      return res.json({
        success: true,
        message: `Repayment of ₹${repayAmt.toLocaleString("en-IN")} recorded successfully! ${isCompleted ? "Loan is now fully COMPLETED! 🎉" : `Remaining balance: ₹${newBalance.toLocaleString("en-IN")}`}`,
        repayment_log: log,
        loan,
      });
    } catch (err) {
      console.error("Record manual repayment error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to record repayment" });
    }
  },

  // 9. Cancel Loan Application (Before Disbursement)
  async cancelLoanAdvance(req, res) {
    try {
      const { id } = req.params;
      const loan = await LoanAdvance.findByPk(id);
      if (!loan) {
        return res.status(404).json({ success: false, error: "Loan/Advance application not found" });
      }

      if (loan.status !== "PENDING_APPROVAL" && loan.status !== "APPROVED") {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel loan in '${loan.status}' status. Active or completed loans must be settled via repayment.`,
        });
      }

      await loan.update({ status: "CANCELLED" });

      return res.json({
        success: true,
        message: `Application ${loan.application_number} has been cancelled.`,
        loan,
      });
    } catch (err) {
      console.error("Cancel loan error:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to cancel loan application" });
    }
  },
};

module.exports = loanAdvanceController;
