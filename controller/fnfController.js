const {
  FnfSettlement,
  Resignation,
  User,
  Employee,
  LeaveAllocation,
  Payroll,
  sequelize
} = require("../config/db");
const { Op } = require("sequelize");

// Helper to calculate difference in days
const diffDays = (d1, d2) => {
  if (!d1 || !d2) return 0;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper to parse notice period string into integer days
const parseNoticePeriodDays = (str) => {
  if (!str) return 30;
  const s = String(str).toLowerCase().trim();
  if (s.includes("3 month") || s.includes("90")) return 90;
  if (s.includes("2 month") || s.includes("60")) return 60;
  if (s.includes("1.5 month") || s.includes("45")) return 45;
  if (s.includes("1 month") || s.includes("30")) return 30;
  if (s.includes("15 day") || s.includes("2 week")) return 15;
  const num = parseInt(s, 10);
  return isNaN(num) ? 30 : num;
};

// Pad number helper
const pad = (num, size = 4) => {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
};

module.exports = {
  // GET /api/auth/fnf
  // Returns all F&F settlements with optional status/search filters
  async getSettlements(req, res) {
    try {
      const { status, dept, year, search } = req.query;
      let where = {};

      if (status && status !== "All") {
        where.status = status;
      }
      if (dept && dept !== "All") {
        where.dept = dept;
      }
      if (search) {
        where[Op.or] = [
          { employee_id: { [Op.iLike]: `%${search}%` } },
          { employee_name: { [Op.iLike]: `%${search}%` } },
          { designation: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const settlements = await FnfSettlement.findAll({
        where,
        order: [["created_at", "DESC"]],
      });

      return res.json({
        success: true,
        count: settlements.length,
        data: settlements,
      });
    } catch (err) {
      console.error("Get F&F settlements error:", err.message);
      return res.status(500).json({ error: "Failed to fetch F&F settlements" });
    }
  },

  // GET /api/auth/fnf/my
  // Returns logged-in employee's F&F settlement and letters
  async getMySettlement(req, res) {
    try {
      const empId = req.user.employee_id;
      const settlement = await FnfSettlement.findOne({
        where: { employee_id: empId },
        order: [["created_at", "DESC"]],
      });

      if (!settlement) {
        return res.json({
          success: true,
          data: null,
          message: "No F&F settlement record found for your account.",
        });
      }

      return res.json({
        success: true,
        data: settlement,
      });
    } catch (err) {
      console.error("Get my F&F settlement error:", err.message);
      return res.status(500).json({ error: "Failed to fetch your F&F settlement" });
    }
  },

  // GET /api/auth/fnf/eligible-resignations
  // Returns approved resignations and employees eligible for F&F settlement
  async getEligibleResignations(req, res) {
    try {
      // Find resignations that are not cancelled or withdrawn
      const resignations = await Resignation.findAll({
        where: {
          status: { [Op.notIn]: ["Cancelled", "Withdrawn"] },
        },
        order: [["created_at", "DESC"]],
      });

      // Find all existing F&F records to flag already settled ones
      const existingFnf = await FnfSettlement.findAll({
        attributes: ["id", "resignation_id", "employee_id", "status"],
      });

      const fnfMap = {};
      existingFnf.forEach((f) => {
        if (f.resignation_id) fnfMap[f.resignation_id] = f;
        if (f.employee_id) fnfMap[f.employee_id] = f;
      });

      const resignationEmpIds = new Set();
      const result = resignations.map((r) => {
        resignationEmpIds.add(r.employee_id);
        const fnf = fnfMap[r.id] || fnfMap[r.employee_id];
        return {
          id: r.id,
          employee_id: r.employee_id,
          name: r.name,
          email: r.email,
          dept: r.dept,
          designation: r.designation,
          joining_date: r.joining_date,
          resignation_date: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : null,
          last_working_date: r.hr_confirmed_lwd || r.last_working_date,
          notice_period: r.notice_period || "1 month",
          clearance_overall_status: r.clearance_overall_status,
          status: r.status,
          is_resignation: true,
          has_fnf: !!fnf,
          fnf_status: fnf ? fnf.status : "Not Started",
          fnf_id: fnf ? fnf.id : null,
        };
      });

      // Also include active / exiting users from User table so HR can settle any employee
      try {
        const users = await User.findAll({
          where: {
            role: { [Op.ne]: "superadmin" },
          },
          order: [["name", "ASC"]],
        });

        users.forEach((u) => {
          if (!resignationEmpIds.has(u.employee_id)) {
            const fnf = fnfMap[u.employee_id];
            result.push({
              id: `emp_${u.employee_id}`,
              employee_id: u.employee_id,
              name: u.name,
              email: u.email,
              dept: u.dept || "General",
              designation: u.designation || "Staff",
              joining_date: u.joining_date,
              resignation_date: null,
              last_working_date: new Date().toISOString().split("T")[0],
              notice_period: "1 month",
              clearance_overall_status: "Direct Settlement",
              status: u.status || "Active",
              is_resignation: false,
              has_fnf: !!fnf,
              fnf_status: fnf ? fnf.status : "Not Started",
              fnf_id: fnf ? fnf.id : null,
            });
          }
        });
      } catch (userErr) {
        console.warn("Could not append users to eligible list:", userErr.message);
      }

      return res.json({
        success: true,
        count: result.length,
        data: result,
      });
    } catch (err) {
      console.error("Get eligible resignations error:", err.message);
      return res.status(500).json({ error: "Failed to fetch eligible resignations" });
    }
  },

  // GET /api/auth/fnf/preview/:resignationId
  // Automatically computes draft F&F settlement based on employee master, leaves, facilities, and resignation details
  async previewSettlement(req, res) {
    try {
      const { resignationId } = req.params;
      let resignation = null;
      let empId = null;

      if (typeof resignationId === "string" && resignationId.startsWith("emp_")) {
        empId = resignationId.replace("emp_", "");
      } else if (!isNaN(resignationId)) {
        resignation = await Resignation.findByPk(parseInt(resignationId, 10));
        if (resignation) {
          empId = resignation.employee_id;
        } else {
          const u = await User.findByPk(parseInt(resignationId, 10));
          if (u) empId = u.employee_id;
        }
      } else {
        empId = resignationId;
      }

      if (empId && !resignation) {
        resignation = await Resignation.findOne({
          where: { employee_id: empId },
          order: [["created_at", "DESC"]],
        });
      }

      const user = empId ? await User.findOne({ where: { employee_id: empId } }) : null;
      const emp = empId ? await Employee.findOne({ where: { employee_id: empId } }) : null;

      if (!user && !emp && !resignation) {
        return res.status(404).json({ error: "Employee or resignation record not found" });
      }

      const empName = user?.name || (emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : null) || resignation?.name || "Employee";
      const empDept = user?.dept || emp?.dept || resignation?.dept || "General";
      const empDesig = user?.designation || emp?.designation || resignation?.designation || "Staff";
      const joiningDate = user?.joining_date || emp?.joining_date || resignation?.joining_date;
      const lwd = resignation?.hr_confirmed_lwd || resignation?.last_working_date || new Date().toISOString().split("T")[0];
      const resDate = resignation?.created_at
        ? new Date(resignation.created_at).toISOString().split("T")[0]
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Salary baseline
      const monthlyGross = parseFloat(user?.current_salary || emp?.current_salary || 50000);
      const monthlyBasic = parseFloat((monthlyGross * 0.5).toFixed(2)); // Standard 50% basic
      const perDayRate = parseFloat((monthlyGross / 26).toFixed(2)); // Standard India 26 working days
      const basicPerDayRate = parseFloat((monthlyBasic / 26).toFixed(2));

      // Notice Period calculation
      const noticePeriodDays = parseNoticePeriodDays(resignation?.notice_period || "1 month");
      let noticeServedDays = noticePeriodDays;
      if (resDate && lwd) {
        const diff = diffDays(resDate, lwd);
        noticeServedDays = Math.min(noticePeriodDays, diff);
      }
      const noticeShortfallDays = Math.max(0, noticePeriodDays - noticeServedDays);
      const noticeRecoveryAmount = parseFloat((noticeShortfallDays * perDayRate).toFixed(2));

      // Final month worked days (up to LWD)
      let workedDays = 0;
      if (lwd) {
        const lwdObj = new Date(lwd);
        workedDays = lwdObj.getDate(); // Days worked in the month of LWD
      }
      const unpaidSalaryAmount = parseFloat((workedDays * perDayRate).toFixed(2));

      // Live Leave Encashment Calculation:
      // Fetch unutilized Earned Leave (EL) & Privilege Leave (PL) balance from LeaveAllocation
      const currentYear = lwd ? new Date(lwd).getFullYear() : new Date().getFullYear();
      let encashableDays = 0;

      try {
        const allocations = await LeaveAllocation.findAll({
          where: {
            employee_id: empId,
            year: currentYear,
            leave_code: { [Op.in]: ["EL", "PL"] },
          },
        });

        allocations.forEach((a) => {
          encashableDays += parseFloat(a.balance || 0);
        });
      } catch (leaveErr) {
        console.warn("Could not fetch leave allocation for encashment:", leaveErr.message);
      }

      // If no allocation found, use 0 or sensible statutory balance
      const leaveEncashmentAmount = parseFloat((encashableDays * basicPerDayRate).toFixed(2));

      // Statutory Gratuity Calculation (Payment of Gratuity Act, 1972)
      let tenureYears = 0;
      let gratuityEligible = false;
      let gratuityAmount = 0;

      if (joiningDate && lwd) {
        const jD = new Date(joiningDate);
        const lD = new Date(lwd);
        const msDiff = lD - jD;
        tenureYears = parseFloat((msDiff / (1000 * 60 * 60 * 24 * 365.25)).toFixed(2));

        // 4.5+ years rounds up to 5 years for statutory gratuity eligibility
        if (tenureYears >= 4.5) {
          gratuityEligible = true;
          // Formula: (15 * Last Drawn Basic * Completed Tenure Years) / 26
          gratuityAmount = parseFloat(((15 * monthlyBasic * Math.round(tenureYears)) / 26).toFixed(2));
        }
      }

      // Outstanding loans and advance salary from recent Payroll
      let loanRecovery = 0;
      let advanceRecovery = 0;
      try {
        const lastPayroll = await Payroll.findOne({
          where: { employee_id: empId },
          order: [["id", "DESC"]],
        });

        if (lastPayroll && lastPayroll.adjustments) {
          const adj = typeof lastPayroll.adjustments === "string" ? JSON.parse(lastPayroll.adjustments) : lastPayroll.adjustments;
          loanRecovery = parseFloat(adj.loan_amount || adj.loan_emi || 0);
          advanceRecovery = parseFloat(adj.advance_amount || 0);
        }
      } catch (payErr) {
        console.warn("Could not fetch last payroll adjustments:", payErr.message);
      }

      // Statutory Deductions
      const statutoryPf = parseFloat(Math.min(1800, monthlyBasic * 0.12).toFixed(2));
      const statutoryEsi = monthlyGross <= 21000 ? parseFloat((monthlyGross * 0.0075).toFixed(2)) : 0;
      const statutoryPt = 200; // Standard state PT
      const taxTds = 0; // TDS adjustment

      // Bank Details
      const bankName = emp?.bank_name || user?.bank_name || "State Bank of India";
      const bankAccountNo = emp?.bank_account_no || user?.bank_account_no || "XXXXXXXX1234";
      const ifscCode = emp?.ifsc_code || user?.ifsc_code || "SBIN0001234";

      // Sum totals
      const totalEarnings = parseFloat((unpaidSalaryAmount + leaveEncashmentAmount + gratuityAmount).toFixed(2));
      const totalDeductions = parseFloat((noticeRecoveryAmount + loanRecovery + advanceRecovery + statutoryPf + statutoryEsi + statutoryPt + taxTds).toFixed(2));
      const netPayable = parseFloat((totalEarnings - totalDeductions).toFixed(2));
      const settlementType = netPayable >= 0 ? "PAYABLE_TO_EMPLOYEE" : "RECOVERABLE_FROM_EMPLOYEE";

      return res.json({
        success: true,
        preview: {
          resignation_id: resignation ? resignation.id : null,
          employee_id: empId,
          employee_name: empName,
          dept: empDept,
          designation: empDesig,
          joining_date: joiningDate,
          resignation_date: resDate,
          last_working_date: lwd,
          settlement_date: new Date().toISOString().split("T")[0],
          status: "Draft",
          monthly_gross: monthlyGross,
          monthly_basic: monthlyBasic,
          per_day_rate: perDayRate,
          notice_period_days: noticePeriodDays,
          notice_served_days: noticeServedDays,
          notice_shortfall_days: noticeShortfallDays,
          notice_waiver_granted: false,
          notice_recovery_amount: noticeRecoveryAmount,
          unpaid_salary_days: workedDays,
          unpaid_salary_amount: unpaidSalaryAmount,
          leave_encashment_days: encashableDays,
          leave_encashment_rate: basicPerDayRate,
          leave_encashment_amount: leaveEncashmentAmount,
          gratuity_eligible: gratuityEligible,
          tenure_years: tenureYears,
          gratuity_amount: gratuityAmount,
          bonus_incentive_amount: 0,
          reimbursement_amount: 0,
          other_earnings: 0,
          other_earnings_remarks: "",
          total_earnings: totalEarnings,
          loan_outstanding_recovery: loanRecovery,
          advance_salary_recovery: advanceRecovery,
          asset_damage_recovery: 0,
          statutory_pf: statutoryPf,
          statutory_esi: statutoryEsi,
          statutory_pt: statutoryPt,
          tax_tds_deduction: taxTds,
          other_deductions: 0,
          other_deductions_remarks: "",
          total_deductions: totalDeductions,
          net_payable_amount: netPayable,
          settlement_type: settlementType,
          payment_status: "Pending",
          payment_mode: "Bank Transfer",
          bank_name: bankName,
          bank_account_no: bankAccountNo,
          ifsc_code: ifscCode,
          remarks: "Automated F&F settlement preview calculated per statutory guidelines.",
          conduct_remarks: "Exemplary",
        },
      });
    } catch (err) {
      console.error("Preview F&F settlement error:", err.message);
      return res.status(500).json({ error: "Failed to generate settlement preview: " + err.message });
    }
  },

  // POST /api/auth/fnf/calculate
  // Real-time recalculation of settlement with user overrides (e.g. notice waiver, adjusted leave days)
  async calculateSettlement(req, res) {
    try {
      const data = req.body;

      const monthlyGross = parseFloat(data.monthly_gross || 0);
      const monthlyBasic = parseFloat(data.monthly_basic || monthlyGross * 0.5);
      const perDayRate = parseFloat(data.per_day_rate || monthlyGross / 26);
      const basicPerDayRate = parseFloat(data.leave_encashment_rate || monthlyBasic / 26);

      // Notice recovery
      const noticeShortfall = parseInt(data.notice_shortfall_days || 0, 10);
      const noticeWaiver = !!data.notice_waiver_granted;
      const noticeRecovery = noticeWaiver ? 0 : parseFloat((noticeShortfall * perDayRate).toFixed(2));

      // Unpaid salary
      const unpaidDays = parseFloat(data.unpaid_salary_days || 0);
      const unpaidSalary = parseFloat((unpaidDays * perDayRate).toFixed(2));

      // Leave encashment
      const encashDays = parseFloat(data.leave_encashment_days || 0);
      const encashAmount = parseFloat((encashDays * basicPerDayRate).toFixed(2));

      // Gratuity
      const gratuityEligible = !!data.gratuity_eligible;
      const tenureYears = parseFloat(data.tenure_years || 0);
      let gratuity = parseFloat(data.gratuity_amount || 0);
      if (gratuityEligible && (!gratuity || data.auto_recalc_gratuity)) {
        gratuity = parseFloat(((15 * monthlyBasic * Math.round(tenureYears)) / 26).toFixed(2));
      }

      const bonus = parseFloat(data.bonus_incentive_amount || 0);
      const reimbursement = parseFloat(data.reimbursement_amount || 0);
      const otherEarnings = parseFloat(data.other_earnings || 0);

      const totalEarnings = parseFloat((unpaidSalary + encashAmount + gratuity + bonus + reimbursement + otherEarnings).toFixed(2));

      // Deductions
      const loanRec = parseFloat(data.loan_outstanding_recovery || 0);
      const advanceRec = parseFloat(data.advance_salary_recovery || 0);
      const assetDamage = parseFloat(data.asset_damage_recovery || 0);
      const pf = parseFloat(data.statutory_pf || 0);
      const esi = parseFloat(data.statutory_esi || 0);
      const pt = parseFloat(data.statutory_pt || 0);
      const tds = parseFloat(data.tax_tds_deduction || 0);
      const otherDed = parseFloat(data.other_deductions || 0);

      const totalDeductions = parseFloat((noticeRecovery + loanRec + advanceRec + assetDamage + pf + esi + pt + tds + otherDed).toFixed(2));
      const netPayable = parseFloat((totalEarnings - totalDeductions).toFixed(2));
      const settlementType = netPayable >= 0 ? "PAYABLE_TO_EMPLOYEE" : "RECOVERABLE_FROM_EMPLOYEE";

      return res.json({
        success: true,
        calculated: {
          monthly_gross: monthlyGross,
          monthly_basic: monthlyBasic,
          per_day_rate: perDayRate,
          notice_shortfall_days: noticeShortfall,
          notice_waiver_granted: noticeWaiver,
          notice_recovery_amount: noticeRecovery,
          unpaid_salary_days: unpaidDays,
          unpaid_salary_amount: unpaidSalary,
          leave_encashment_days: encashDays,
          leave_encashment_rate: basicPerDayRate,
          leave_encashment_amount: encashAmount,
          gratuity_eligible: gratuityEligible,
          tenure_years: tenureYears,
          gratuity_amount: gratuity,
          bonus_incentive_amount: bonus,
          reimbursement_amount: reimbursement,
          other_earnings: otherEarnings,
          total_earnings: totalEarnings,
          loan_outstanding_recovery: loanRec,
          advance_salary_recovery: advanceRec,
          asset_damage_recovery: assetDamage,
          statutory_pf: pf,
          statutory_esi: esi,
          statutory_pt: pt,
          tax_tds_deduction: tds,
          other_deductions: otherDed,
          total_deductions: totalDeductions,
          net_payable_amount: netPayable,
          settlement_type: settlementType,
        },
      });
    } catch (err) {
      console.error("Recalculate settlement error:", err.message);
      return res.status(500).json({ error: "Failed to recalculate settlement" });
    }
  },

  // POST /api/auth/fnf/save
  // Creates or updates an F&F settlement record
  async saveSettlement(req, res) {
    try {
      const data = req.body;
      const hrName = req.user?.name || "HR Admin";

      if (!data.employee_id) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      if (!data.last_working_date) {
        return res.status(400).json({ error: "Last working date is required" });
      }

      // Check if settlement already exists
      let settlement = null;
      const cleanResignationId = data.resignation_id && !isNaN(data.resignation_id) ? parseInt(data.resignation_id, 10) : null;
      if (data.id) {
        settlement = await FnfSettlement.findByPk(data.id);
      } else if (cleanResignationId) {
        settlement = await FnfSettlement.findOne({ where: { resignation_id: cleanResignationId } });
      } else if (data.employee_id) {
        settlement = await FnfSettlement.findOne({ where: { employee_id: data.employee_id } });
      }

      const payload = {
        ...data,
        resignation_id: cleanResignationId,
        prepared_by: data.prepared_by || hrName,
        settlement_date: data.settlement_date || new Date().toISOString().split("T")[0],
      };

      if (settlement) {
        await settlement.update(payload);
      } else {
        settlement = await FnfSettlement.create(payload);
      }

      return res.json({
        success: true,
        message: `F&F settlement saved successfully (${settlement.status})`,
        data: settlement,
      });
    } catch (err) {
      console.error("Save F&F settlement error:", err.message);
      return res.status(500).json({ error: "Failed to save F&F settlement: " + err.message });
    }
  },

  // PATCH /api/auth/fnf/:id/finalize
  // Finalizes the settlement & auto-generates official Relieving and Experience letter references
  async finalizeSettlement(req, res) {
    try {
      const { id } = req.params;
      const hrName = req.user?.name || "HR Admin";
      const settlement = await FnfSettlement.findByPk(id);

      if (!settlement) {
        return res.status(404).json({ error: "Settlement record not found" });
      }

      const year = new Date().getFullYear();
      const refCode = pad(settlement.id, 4);

      const relievingRef = `ZTL/REL/${year}/${refCode}`;
      const experienceRef = `ZTL/EXP/${year}/${refCode}`;
      const today = new Date().toISOString().split("T")[0];

      await settlement.update({
        status: "Finalized",
        approved_by: hrName,
        settlement_date: today,
        relieving_letter_issued: true,
        relieving_letter_ref_no: relievingRef,
        relieving_letter_date: today,
        experience_letter_issued: true,
        experience_letter_ref_no: experienceRef,
        experience_letter_date: today,
      });

      // Update linked Resignation overall status if present
      if (settlement.resignation_id) {
        const resignation = await Resignation.findByPk(settlement.resignation_id);
        if (resignation) {
          await resignation.update({
            status: "Completed",
            clearance_overall_status: "Completed",
            clearance_finance_status: "Cleared",
            clearance_hr_status: "Cleared",
          });
        }
      }

      return res.json({
        success: true,
        message: `F&F Settlement finalized successfully. Relieving (${relievingRef}) and Experience (${experienceRef}) letters generated.`,
        data: settlement,
      });
    } catch (err) {
      console.error("Finalize F&F settlement error:", err.message);
      return res.status(500).json({ error: "Failed to finalize F&F settlement: " + err.message });
    }
  },

  // PATCH /api/auth/fnf/:id/disburse
  // Marks payment as disbursed / paid
  async disburseSettlement(req, res) {
    try {
      const { id } = req.params;
      const { payment_date, payment_mode, payment_reference, remarks } = req.body;

      const settlement = await FnfSettlement.findByPk(id);
      if (!settlement) {
        return res.status(404).json({ error: "Settlement record not found" });
      }

      await settlement.update({
        status: "Paid",
        payment_status: "Paid",
        payment_date: payment_date || new Date().toISOString().split("T")[0],
        payment_mode: payment_mode || settlement.payment_mode || "Bank Transfer",
        payment_reference: payment_reference || `PAY-FNF-${pad(settlement.id, 4)}`,
        remarks: remarks || settlement.remarks,
      });

      return res.json({
        success: true,
        message: "Full & Final settlement disbursed successfully",
        data: settlement,
      });
    } catch (err) {
      console.error("Disburse F&F settlement error:", err.message);
      return res.status(500).json({ error: "Failed to disburse settlement" });
    }
  },

  // GET /api/auth/fnf/letter/:type/:id
  // Returns complete metadata for generating Relieving Letter, Experience Letter, or F&F Statement
  async getExitLetterData(req, res) {
    try {
      const { type, id } = req.params; // type = 'relieving' | 'experience' | 'statement'
      const settlement = await FnfSettlement.findByPk(id);

      if (!settlement) {
        return res.status(404).json({ error: "Settlement record not found" });
      }

      const user = await User.findOne({ where: { employee_id: settlement.employee_id } });
      const emp = await Employee.findOne({ where: { employee_id: settlement.employee_id } });

      const letterData = {
        company: {
          name: "Zentelex Pvt. Ltd.",
          tagline: "Engineering Excellence & Innovation",
          address: "Salt Lake Sector V, Kolkata, West Bengal - 700091",
          cin: "U72200WB2020PTC239871",
          email: "hr@zentelex.com",
          website: "www.zentelex.com",
          authorized_signatory: "Rishi Kumar",
          signatory_title: "Head of Human Resources",
        },
        settlement: settlement.toJSON(),
        employee: {
          employee_id: settlement.employee_id,
          name: settlement.employee_name,
          dept: settlement.dept,
          designation: settlement.designation,
          email: user?.email || emp?.email,
          joining_date: settlement.joining_date,
          resignation_date: settlement.resignation_date,
          last_working_date: settlement.last_working_date,
          tenure_years: settlement.tenure_years,
          conduct_remarks: settlement.conduct_remarks || "Exemplary",
        },
        type,
        ref_no:
          type === "relieving"
            ? settlement.relieving_letter_ref_no || `ZTL/REL/${new Date().getFullYear()}/${pad(settlement.id, 4)}`
            : type === "experience"
            ? settlement.experience_letter_ref_no || `ZTL/EXP/${new Date().getFullYear()}/${pad(settlement.id, 4)}`
            : `ZTL/FNF/${new Date().getFullYear()}/${pad(settlement.id, 4)}`,
        issue_date:
          type === "relieving"
            ? settlement.relieving_letter_date || settlement.settlement_date || new Date().toISOString().split("T")[0]
            : type === "experience"
            ? settlement.experience_letter_date || settlement.settlement_date || new Date().toISOString().split("T")[0]
            : settlement.settlement_date || new Date().toISOString().split("T")[0],
      };

      return res.json({
        success: true,
        data: letterData,
      });
    } catch (err) {
      console.error("Get exit letter data error:", err.message);
      return res.status(500).json({ error: "Failed to fetch exit letter data" });
    }
  },

  // DELETE /api/auth/fnf/:id
  async deleteSettlement(req, res) {
    try {
      const { id } = req.params;
      const settlement = await FnfSettlement.findByPk(id);

      if (!settlement) {
        return res.status(404).json({ error: "Settlement record not found" });
      }

      if (settlement.status === "Finalized" || settlement.status === "Paid") {
        return res.status(400).json({ error: "Cannot delete finalized or paid settlements." });
      }

      await settlement.destroy();
      return res.json({ success: true, message: "Draft settlement deleted successfully" });
    } catch (err) {
      console.error("Delete settlement error:", err.message);
      return res.status(500).json({ error: "Failed to delete settlement" });
    }
  },
};

