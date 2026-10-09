const { User, Employee, Payroll, Attendance, Leave, Holiday, ITDeclaration } = require("../config/db");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { getISTParts } = require("../utils/timezone");

const getGlobalEsiThreshold = async () => {
  try {
    const [rows] = await sequelize.query("SELECT value FROM system_settings WHERE key = 'global_esi_threshold' LIMIT 1");
    if (rows && rows.length > 0 && rows[0].value) {
      return parseFloat(rows[0].value) || 21000;
    }
  } catch (e) {
    console.warn("Could not read system_settings for ESI threshold:", e.message);
  }
  return 21000;
};


const MEDICLAIM_ROLE_TIERS = [
  { tier: 7, limit: 2000000, label: "CEO (₹20 Lakhs)" },
  { tier: 6, limit: 700000, label: "Vice President (₹7 Lakhs)" },
  { tier: 5, limit: 600000, label: "General Manager (₹6 Lakhs)" },
  { tier: 4, limit: 500000, label: "Deputy General Manager (₹5 Lakhs)" },
  { tier: 3, limit: 400000, label: "Manager (₹4 Lakhs)" },
  { tier: 2, limit: 300000, label: "Assistant Manager (₹3 Lakhs)" },
  { tier: 1, limit: 200000, label: "Executive (₹2 Lakhs)" },
];

function getMediclaimLimitByDesignation(designation, role) {
  const text = `${designation || ""} ${role || ""}`.toLowerCase().trim();

  // Tier 7: CEO (20 Lakhs)
  if (
    text.includes("ceo") ||
    text.includes("chief executive") ||
    text.includes("managing director") ||
    text.includes("founder") ||
    (text.includes("president") && !text.includes("vice"))
  ) {
    return { limit: 2000000, label: "CEO", maxAmountStr: "20 Lakhs", tier: 7 };
  }

  // Tier 6: Vice President (7 Lakhs)
  if (
    text.includes("vice president") ||
    text.includes("vp") ||
    text.includes("svp") ||
    text.includes("avp")
  ) {
    return { limit: 700000, label: "Vice President", maxAmountStr: "7 Lakhs", tier: 6 };
  }

  // Tier 4: Deputy General Manager (5 Lakhs) - checked before GM
  if (
    text.includes("deputy general manager") ||
    text.includes("dgm") ||
    text.includes("dy. general manager") ||
    text.includes("dy general manager") ||
    text.includes("agm") ||
    text.includes("associate general manager")
  ) {
    return { limit: 500000, label: "Deputy General Manager", maxAmountStr: "5 Lakhs", tier: 4 };
  }

  // Tier 5: General Manager (6 Lakhs)
  if (text.includes("general manager") || text.includes("gm")) {
    return { limit: 600000, label: "General Manager", maxAmountStr: "6 Lakhs", tier: 5 };
  }

  // Tier 2: Assistant Manager (3 Lakhs) - checked before Manager
  if (
    text.includes("assistant manager") ||
    text.includes("asst manager") ||
    text.includes("asst. manager") ||
    text.includes("associate manager") ||
    text.includes("deputy manager")
  ) {
    return { limit: 300000, label: "Assistant Manager", maxAmountStr: "3 Lakhs", tier: 2 };
  }

  // Tier 3: Manager (4 Lakhs)
  if (
    text.includes("manager") ||
    text.includes("lead") ||
    text.includes("tech lead") ||
    text.includes("team lead") ||
    text.includes("hod") ||
    text.includes("head")
  ) {
    return { limit: 400000, label: "Manager", maxAmountStr: "4 Lakhs", tier: 3 };
  }

  // Tier 1: Upto Executive (2 Lakhs) - default
  return { limit: 200000, label: "Executive", maxAmountStr: "2 Lakhs", tier: 1 };
}

const getCompanyLoanInterestRate = async () => {
  try {
    const [rows] = await sequelize.query("SELECT value FROM system_settings WHERE key = 'company_loan_interest_rate' LIMIT 1");
    if (rows && rows.length > 0 && rows[0].value) {
      return parseFloat(rows[0].value) || 8.5;
    }
  } catch (e) {}
  return 8.5;
};

const PayrollController = {
  // GET /api/auth/payroll/data/:employeeId?month=March-2026
  async getPayrollData(req, res) {
    try {
      const rawEmpId = req.params.employeeId || req.query.employee_id;
      const monthYear = req.query.month || new Date().toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

      if (!rawEmpId) {
        return res.status(400).json({ success: false, error: "Employee code is required" });
      }
      const empId = String(rawEmpId).replace(/^#/, "").trim();

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase()
        ),
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase()
        ),
      });

      // Parse bank details if available
      let bankInfo = {
        name: "HDFC Bank",
        account: "50100234891234",
        ifsc: "HDFC0001234",
        pf_number: "WB/CAL/1029384/001",
        esi_number: "31000987650001001",
        pan: "ABCDE1234F",
        branch: "Main Branch",
        account_holder: user.name || "",
      };

      if (user.bank_details) {
        try {
          const parsed = typeof user.bank_details === "string" ? JSON.parse(user.bank_details) : user.bank_details;
          bankInfo = {
            name: parsed.bank_name || parsed.name || bankInfo.name,
            account: parsed.account_no || parsed.account || bankInfo.account,
            ifsc: parsed.ifsc_code || parsed.ifsc || bankInfo.ifsc,
            branch: parsed.branch_name || parsed.branch || bankInfo.branch,
            account_holder: parsed.account_holder || user.name || bankInfo.account_holder,
            pf_number: parsed.pf_number || bankInfo.pf_number,
            esi_number: parsed.esi_number || bankInfo.esi_number,
            pan: parsed.pan_number || parsed.pan || bankInfo.pan,
          };
        } catch {
          if (typeof user.bank_details === "string" && user.bank_details.trim()) {
            bankInfo.name = user.bank_details;
          }
        }
      }

      // Check if a finalized payroll record already exists for this month
      const existingPayroll = await Payroll.findOne({
        where: {
          employee_id: user.employee_id,
          month_year: monthYear
        }
      });

      // Parse salary structure
      let parsedStructure = null;
      if (user.salary_structure) {
        try {
          parsedStructure = typeof user.salary_structure === "string"
            ? JSON.parse(user.salary_structure)
            : user.salary_structure;
        } catch (e) {
          parsedStructure = null;
        }
      }

      // Check employee permanence (Permanent vs Intern vs Probation)
      const empType = (user.employment_type || (emp && emp.employment_type) || "Permanent").trim();
      const desig = (user.designation || (emp && emp.designation) || "").toLowerCase();
      const userRole = (user.role || "").toLowerCase();
      const userStatus = (user.status || "").toLowerCase();
      const isIntern = empType.toLowerCase() === "intern" || desig.includes("intern") || userRole.includes("intern") || userStatus.includes("intern");
      const isProbation = empType.toLowerCase() === "probation" || desig.includes("trainee") || desig.includes("probation") || userStatus.includes("probation");
      const isPermanent = !isIntern && !isProbation && (empType.toLowerCase() === "permanent" || userStatus === "active" || userStatus === "fulltime");
      const finalEmploymentType = isPermanent ? "Permanent" : (isIntern ? "Intern" : "Probation");

      const currentSalary = parseFloat(user.current_salary) || 0;

      // Base Fixed Pay breakdown (Dearness Allowance DA removed as requested)
      let basic = 0;
      let hra = 0;
      let allowance = 0;
      let conveyance = 0;
      let medical = 0;

      let pt = 0;
      let it = 0;
      let pf = 0;
      let esi = 0;
      let mediclaim = 0;
      let tds = 0;
      let lop = 0;

      let advanceAmount = 0;
      let advanceDeduction = 0;
      let loanAmount = 0;
      let loanEmi = 0;
      let insuranceDeduction = 0;

      const defaultFacilities = {
        advance: isPermanent,
        loan: isPermanent,
        insurance: isPermanent,
        gratuity: isPermanent
      };
      let facilities = defaultFacilities;
      if (user.facilities) {
        try {
          facilities = typeof user.facilities === "string" ? JSON.parse(user.facilities) : user.facilities;
        } catch (e) {
          facilities = defaultFacilities;
        }
      } else if (parsedStructure && parsedStructure.facilities) {
        facilities = parsedStructure.facilities;
      }

      const globalEsiThreshold = await getGlobalEsiThreshold();
      const empEsiThreshold = (user.esi_threshold != null && !isNaN(parseFloat(user.esi_threshold)))
        ? parseFloat(user.esi_threshold)
        : (parsedStructure?.esi_threshold != null ? parseFloat(parsedStructure.esi_threshold) : globalEsiThreshold);

      let d = null;
      let hasCustomStructure = false;
      if (parsedStructure && parsedStructure.earnings) {
        hasCustomStructure = true;
        const e = parsedStructure.earnings;
        d = parsedStructure.deductions || {};
        const adj = parsedStructure.adjustments || {};
        basic = e.basic != null ? parseFloat(e.basic) : 0;
        hra = e.hra != null ? parseFloat(e.hra) : 0;
        allowance = e.allowance != null ? parseFloat(e.allowance) : 0;
        conveyance = e.conveyance != null ? parseFloat(e.conveyance) : 0;
        medical = e.medical != null ? parseFloat(e.medical) : 0;

        // Auto-synchronize if employee current_salary was changed but structure components weren't updated
        const structGross = basic + hra + allowance + conveyance + medical;
        if (currentSalary > 0 && Math.abs(structGross - currentSalary) > 1) {
          basic = Math.round(currentSalary * 0.45);
          hra = Math.round(currentSalary * 0.40);
          conveyance = Math.round(currentSalary * 0.05) || 1600;
          medical = Math.round(currentSalary * 0.05) || 1250;
          allowance = Math.max(0, currentSalary - (basic + hra + conveyance + medical));
        }

        pt = d.professional_tax != null ? parseFloat(d.professional_tax) : 0;
        it = d.income_tax != null ? parseFloat(d.income_tax) : 0;
        pf = d.pf != null ? parseFloat(d.pf) : 0;
        esi = d.esi != null ? parseFloat(d.esi) : 0;
        mediclaim = d.mediclaim != null ? parseFloat(d.mediclaim) : 0;
        tds = d.tds != null ? parseFloat(d.tds) : 0;
        lop = d.lop != null ? parseFloat(d.lop) : 0;

        // Adjustments based on individual enabled facilities
        if (facilities.advance) {
          advanceAmount = Math.min(100000, Math.max(0, parseFloat(adj.advance_amount) || 0));
          advanceDeduction = Math.min(advanceAmount, Math.max(0, parseFloat(adj.advance_deduction || d.advance_deduction) || 0));
        }
        if (facilities.loan && parseFloat(adj.loan_amount) > 0) {
          loanAmount = Math.min(1000000, Math.max(100000, parseFloat(adj.loan_amount) || 0));
          loanEmi = Math.max(0, parseFloat(adj.loan_emi || d.loan_emi) || 0);
        }
        if (facilities.insurance) {
          insuranceDeduction = Math.max(0, parseFloat(adj.insurance_deduction || d.insurance) || 0);
        }
      } else if (currentSalary > 0) {
        // Standard default breakdown based on currentSalary without DA
        basic = Math.round(currentSalary * 0.45);
        hra = Math.round(currentSalary * 0.40);
        conveyance = Math.round(currentSalary * 0.05) || 1600;
        medical = Math.round(currentSalary * 0.05) || 1250;
        const assigned = basic + hra + conveyance + medical;
        allowance = Math.max(0, currentSalary - assigned);

        pf = Math.round(basic * 0.12);
        pt = currentSalary > 15000 ? 200 : 0;

        const adj = parsedStructure?.adjustments || {};
        if (facilities.advance) {
          advanceAmount = Math.min(100000, Math.max(0, parseFloat(adj.advance_amount) || 0));
          advanceDeduction = Math.min(advanceAmount, Math.max(0, parseFloat(adj.advance_deduction) || 0));
        }
        if (facilities.loan && parseFloat(adj.loan_amount) > 0) {
          loanAmount = Math.min(1000000, Math.max(100000, parseFloat(adj.loan_amount) || 0));
          loanEmi = Math.max(0, parseFloat(adj.loan_emi) || 0);
        }
        if (facilities.insurance) {
          insuranceDeduction = Math.max(0, parseFloat(adj.insurance_deduction) || 0);
        }
      }

      const totalSalary = (basic + hra + allowance + conveyance + medical) || currentSalary;
      let isEsiEligible = totalSalary <= empEsiThreshold;
      if (!facilities.insurance) {
        mediclaim = 0;
        insuranceDeduction = 0;
        esi = 0;
      } else if (hasCustomStructure) {
        // If employee has a custom structure with insurance enabled, strictly respect defined values
        if (isEsiEligible) {
          esi = d?.esi != null ? parseFloat(d.esi) : 0;
          mediclaim = 0;
        } else {
          mediclaim = d?.mediclaim != null ? parseFloat(d.mediclaim) : 0;
          esi = 0;
        }
      } else {
        // Standard default breakdown only when insurance is enabled and no custom structure exists
        if (isEsiEligible) {
          if (!esi) esi = Math.round(totalSalary * 0.0075);
          mediclaim = 0;
        } else {
          if (!mediclaim) mediclaim = totalSalary > 25000 ? 750 : 500;
          esi = 0;
        }
      }

      // Gratuity calculation (Payment of Gratuity Act, 1972) - Only Permanent
      let tenureYears = 0;
      if (user.joining_date || (emp && emp.joining_date)) {
        const joinDate = new Date(user.joining_date || emp.joining_date);
        const now = new Date();
        const diffTime = Math.max(0, now - joinDate);
        tenureYears = Math.round((diffTime / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
      }
      const gratuityAccrual = isPermanent ? Math.round((basic * 15) / (26 * 12)) : 0;
      const totalGratuity = isPermanent ? Math.round((15 * basic * tenureYears) / 26) : 0;

      // Calculate date range for the requested month
      const monthNames = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];
      const ist = getISTParts();
      let reqYear = ist.year;
      let reqMonthIdx = ist.month - 1;
      if (monthYear) {
        const parts = monthYear.trim().split(/\s+/);
        if (parts[0]) {
          const idx = monthNames.indexOf(parts[0].toLowerCase());
          if (idx !== -1) reqMonthIdx = idx;
        }
        if (parts[1] && !isNaN(parseInt(parts[1]))) {
          reqYear = parseInt(parts[1]);
        }
      }

      // Determine Financial Year for this payroll month (April-March)
      const payrollFY = reqMonthIdx < 3 ? `${reqYear - 1}-${reqYear}` : `${reqYear}-${reqYear + 1}`;
      let itDeclarationInfo = null;
      try {
        const itDecl = await ITDeclaration.findOne({
          where: {
            employee_id: user.employee_id,
            financial_year: payrollFY,
          },
        });
        if (itDecl) {
          const comp = typeof itDecl.tax_computation === "string" ? JSON.parse(itDecl.tax_computation || "{}") : (itDecl.tax_computation || {});
          const reg = itDecl.regime || "new";
          const regData = reg === "old" ? comp.old_regime : comp.new_regime;
          const calcMonthlyTds = regData?.monthly_tds;

          // If TDS is unset, or if the declaration is approved, use the calculated monthly TDS
          if (calcMonthlyTds !== undefined && (!hasCustomStructure || !tds || itDecl.status === "Approved")) {
            tds = calcMonthlyTds;
          }

          itDeclarationInfo = {
            id: itDecl.id,
            status: itDecl.status,
            regime: reg,
            financial_year: itDecl.financial_year,
            monthly_tds: calcMonthlyTds || 0,
            annual_tax: regData?.total_annual_tax || 0,
            taxable_income: regData?.net_taxable_income || 0,
          };
        }
      } catch (itErr) {
        console.warn("Payroll IT declaration lookup:", itErr.message);
      }

      const daysInMonth = new Date(reqYear, reqMonthIdx + 1, 0).getDate();
      const workingDays = Math.min(26, daysInMonth - 4);
      const weekOffs = Math.max(0, daysInMonth - workingDays);
      const startMonthStr = `${reqYear}-${String(reqMonthIdx + 1).padStart(2, "0")}-01`;
      const endMonthStr = `${reqYear}-${String(reqMonthIdx + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      const empCodes = [user.employee_id, empId];
      if (emp && emp.employee_id) empCodes.push(emp.employee_id);

      // Query real attendance logs for this employee in this month
      let attendanceRecords = [];
      try {
        attendanceRecords = await Attendance.findAll({
          where: {
            employee_id: { [Op.in]: empCodes },
            date: { [Op.between]: [startMonthStr, endMonthStr] }
          },
          order: [["date", "DESC"], ["id", "DESC"]]
        });
      } catch (attErr) {
        console.warn("Attendance query error:", attErr.message);
      }

      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let overtimeHours = 0;

      if (attendanceRecords && attendanceRecords.length > 0) {
        attendanceRecords.forEach(rec => {
          const st = (rec.status || "").toLowerCase();
          if (st.includes("present") || st.includes("half")) {
            presentDays += st.includes("half") ? 0.5 : 1;
          } else if (st.includes("absent") || st.includes("unpaid")) {
            absentDays += 1;
          }
          if (rec.late_count > 0 || st.includes("late")) {
            lateDays += 1;
          }
          if (rec.work_hours && parseFloat(rec.work_hours) > 8) {
            overtimeHours += Math.round((parseFloat(rec.work_hours) - 8) * 10) / 10;
          }
        });
      }

      // Query Approved Leaves for this employee in this month
      let leaveDays = 0;
      try {
        const approvedLeaves = await Leave.findAll({
          where: {
            employee_id: { [Op.in]: empCodes },
            status: "Approved",
            [Op.or]: [
              { start_date: { [Op.between]: [startMonthStr, endMonthStr] } },
              { end_date: { [Op.between]: [startMonthStr, endMonthStr] } },
            ]
          }
        });
        approvedLeaves.forEach(l => {
          const lStart = new Date(Math.max(new Date(l.start_date), new Date(startMonthStr)));
          const lEnd = new Date(Math.min(new Date(l.end_date), new Date(endMonthStr)));
          if (lEnd >= lStart) {
            const days = Math.round((lEnd - lStart) / (1000 * 60 * 60 * 24)) + 1;
            leaveDays += days;
          }
        });
      } catch (lErr) {
        console.warn("Leave query error:", lErr.message);
      }

      // Query Holidays in this month for employee's department
      let holidayDays = 0;
      try {
        const userDept = user.dept || (emp && emp.dept) || "All";
        const monthHolidays = await Holiday.findAll({
          where: {
            date: { [Op.between]: [startMonthStr, endMonthStr] },
            dept: { [Op.in]: ["All", "all", userDept] }
          }
        });
        holidayDays = monthHolidays.length;
      } catch (hErr) {
        console.warn("Holiday query error:", hErr.message);
      }

      // If no biometric attendance records exist yet, use standard working days fallback
      if (!attendanceRecords || attendanceRecords.length === 0) {
        presentDays = Math.max(0, workingDays - leaveDays - holidayDays);
        absentDays = 0;
      }

      // Formula: Paid days = attendance + leaves + holidays + week_offs - absents
      const rawPaidDays = presentDays + leaveDays + holidayDays + weekOffs - absentDays;
      const paidDays = Math.max(0, Math.min(daysInMonth, rawPaidDays));
      const lopDays = Math.max(0, daysInMonth - paidDays);

      const totalFixed = basic + hra + allowance + conveyance + medical;
      isEsiEligible = (totalFixed || currentSalary) <= empEsiThreshold;
      const dailyRate = daysInMonth > 0 ? (totalFixed / daysInMonth) : 0;
      const calculatedLopAmount = Math.round(lopDays * dailyRate);

      // Latest Shift timing record (from this month or most recent overall)
      let latestShiftRecord = attendanceRecords && attendanceRecords.length > 0 ? attendanceRecords[0] : null;
      if (!latestShiftRecord) {
        try {
          latestShiftRecord = await Attendance.findOne({
            where: { employee_id: { [Op.in]: empCodes } },
            order: [["date", "DESC"], ["id", "DESC"]]
          });
        } catch {}
      }

      const shiftTiming = {
        dateStr: latestShiftRecord
          ? new Date(latestShiftRecord.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
          : "Today",
        check_in: latestShiftRecord?.check_in ? latestShiftRecord.check_in.substring(0, 5) : "09:00",
        check_out: latestShiftRecord?.check_out ? latestShiftRecord.check_out.substring(0, 5) : "18:00",
        overtime_mins: latestShiftRecord?.work_hours && parseFloat(latestShiftRecord.work_hours) > 8
          ? Math.round((parseFloat(latestShiftRecord.work_hours) - 8) * 60)
          : 0,
        late_mins: (latestShiftRecord?.late_count > 0 || (latestShiftRecord?.status || "").toLowerCase().includes("late")) ? 15 : 0,
      };

      let savedData = null;
      if (existingPayroll) {
        try {
          savedData = {
            id: existingPayroll.id,
            fixed_pay: JSON.parse(existingPayroll.fixed_pay || "{}"),
            variable_pay: JSON.parse(existingPayroll.variable_pay || "{}"),
            gross_pay: parseFloat(existingPayroll.gross_pay) || 0,
            attendance_summary: JSON.parse(existingPayroll.attendance_summary || "{}"),
            lop_deduction: parseFloat(existingPayroll.lop_deduction) || 0,
            tax_deductions: JSON.parse(existingPayroll.tax_deductions || "{}"),
            statutory_deductions: JSON.parse(existingPayroll.statutory_deductions || "{}"),
            adjustments: JSON.parse(existingPayroll.adjustments || "{}"),
            total_deductions: parseFloat(existingPayroll.total_deductions) || 0,
            net_salary: parseFloat(existingPayroll.net_salary) || 0,
            status: existingPayroll.status,
            payment_date: existingPayroll.payment_date,
            payment_mode: existingPayroll.payment_mode,
            remarks: existingPayroll.remarks,
          };
          if (savedData.attendance_summary) {
            savedData.attendance_summary.late_days = savedData.attendance_summary.late_days ?? lateDays;
            savedData.attendance_summary.overtime_hours = savedData.attendance_summary.overtime_hours ?? overtimeHours;
          }
        } catch {
          savedData = null;
        }
      }

      const effectivePf = hasCustomStructure ? pf : (pf || Math.round(basic * 0.12));
      const effectiveEsi = !facilities.insurance
        ? 0
        : (isEsiEligible
            ? (hasCustomStructure ? esi : (esi || Math.round((totalFixed || currentSalary) * 0.0075)))
            : 0);
      const effectiveMediclaim = !facilities.insurance
        ? 0
        : (!isEsiEligible
            ? (hasCustomStructure ? mediclaim : (mediclaim || ((totalFixed || currentSalary) > 25000 ? 750 : 500)))
            : 0);
      const effectivePt = hasCustomStructure ? pt : (pt || (currentSalary > 15000 ? 200 : 0));

      const latest_salary_structure = {
        basic,
        hra,
        allowance,
        conveyance,
        medical,
        total_fixed: totalFixed,
        pf: effectivePf,
        esi: effectiveEsi,
        mediclaim: effectiveMediclaim,
        pt: effectivePt,
        insurance: isPermanent && facilities.insurance ? insuranceDeduction : 0,
        advance_deduction: isPermanent && facilities.advance ? advanceDeduction : 0,
        loan_emi: isPermanent && facilities.loan ? loanEmi : 0,
        tds: tds || 0,
        it: it || 0,
        lop: lop || 0,
      };

      const savedFpCheck = savedData?.fixed_pay || {};
      const savedStatCheck = savedData?.statutory_deductions || {};
      const isStructureRestructured = savedData
        ? (
            Math.abs((parseFloat(savedFpCheck.total_fixed) || 0) - totalFixed) > 1 ||
            Math.abs((parseFloat(savedFpCheck.basic) || 0) - basic) > 1 ||
            Math.abs((parseFloat(savedFpCheck.hra) || 0) - hra) > 1 ||
            Math.abs((parseFloat(savedFpCheck.allowance) || 0) - allowance) > 1 ||
            Math.abs((parseFloat(savedFpCheck.conveyance) || 0) - conveyance) > 1 ||
            Math.abs((parseFloat(savedFpCheck.medical) || 0) - medical) > 1 ||
            Math.abs((parseFloat(savedStatCheck.pf) || 0) - (latest_salary_structure.pf || 0)) > 1 ||
            Math.abs((parseFloat(savedStatCheck.esi) || 0) - (latest_salary_structure.esi || 0)) > 1 ||
            Math.abs((parseFloat(savedStatCheck.mediclaim) || 0) - (latest_salary_structure.mediclaim || 0)) > 1 ||
            Math.abs((parseFloat(savedStatCheck.pt) || 0) - (latest_salary_structure.pt || 0)) > 1
          )
        : false;
      const effectiveLop = (savedData && !isStructureRestructured) ? (parseFloat(savedData.lop_deduction) || 0) : calculatedLopAmount;

      const totalStatutory =
        effectivePf +
        effectiveEsi +
        effectiveMediclaim +
        effectivePt +
        (isPermanent && facilities.insurance ? insuranceDeduction : 0) +
        (isPermanent && facilities.advance ? advanceDeduction : 0) +
        (isPermanent && facilities.loan ? loanEmi : 0);

      return res.json({
        success: true,
        employee: {
          id: user.id,
          employee_code: user.employee_id,
          name: user.name,
          email: user.email,
          dept: user.dept || (emp && emp.dept) || "Engineering",
          designation: user.designation || (emp && emp.designation) || "Software Engineer",
          group_name: (user.group_name !== undefined && user.group_name !== null) ? user.group_name : ((emp && emp.group_name) || null),
          company_name: user.company_name || (emp && emp.company_name) || "TATA Steel",
          work_location: user.work_location || (emp && emp.work_location) || "Kolkata",
          joining_date: user.joining_date || (emp && emp.joining_date) || "2025-01-01",
          current_salary: user.current_salary,
          employment_type: finalEmploymentType,
          is_permanent: isPermanent,
          bank_details: bankInfo,
        },
        month_year: monthYear,
        shift_timing: shiftTiming,
        defaults: {
          employment_type: finalEmploymentType,
          is_permanent: isPermanent,
          fixed_pay: {
            basic,
            hra,
            allowance,
            conveyance,
            medical,
            total_fixed: totalFixed,
          },
          variable_pay: {
            bonus: 0,
            overtime_hours: overtimeHours,
            overtime_rate: 0,
            overtime: 0,
            incentive: 0,
            reimbursement: 0,
            total_variable: 0,
          },
          attendance_summary: {
            total_days: daysInMonth,
            working_days: workingDays,
            week_offs: weekOffs,
            present_days: presentDays,
            leave_days: leaveDays,
            holiday_days: holidayDays,
            absent_days: absentDays,
            paid_days: paidDays,
            late_days: lateDays,
            lop_days: lopDays,
            overtime_hours: overtimeHours,
            lop_amount: calculatedLopAmount,
          },
          adjustments: {
            is_permanent: isPermanent,
            employment_type: finalEmploymentType,
            advance_amount: isPermanent && facilities.advance ? advanceAmount : 0,
            advance_deduction: isPermanent && facilities.advance ? advanceDeduction : 0,
            loan_amount: isPermanent && facilities.loan ? loanAmount : 0,
            loan_emi: isPermanent && facilities.loan ? loanEmi : 0,
            insurance_deduction: isPermanent && facilities.insurance ? insuranceDeduction : 0,
            gratuity_accrual: isPermanent && facilities.gratuity ? gratuityAccrual : 0,
            total_gratuity: isPermanent && facilities.gratuity ? totalGratuity : 0,
            tenure_years: tenureYears,
            week_offs: weekOffs,
            working_days: workingDays,
            days_in_month: daysInMonth,
          },
          tax_deductions: {
            taxable_pay: Math.max(0, basic + hra + allowance + conveyance + medical - effectiveLop),
            tds: tds || 0,
            other_tax: it || 0,
            total_tax: (tds || 0) + (it || 0),
          },
          statutory_deductions: {
            pf: effectivePf,
            esi: effectiveEsi,
            mediclaim: effectiveMediclaim,
            pt: effectivePt,
            insurance: isPermanent && facilities.insurance ? insuranceDeduction : 0,
            advance_deduction: isPermanent && facilities.advance ? advanceDeduction : 0,
            loan_emi: isPermanent && facilities.loan ? loanEmi : 0,
            others: 0,
            total_statutory: totalStatutory,
          },
        },
        latest_salary_structure,
        has_structure_update: savedData
          ? (
              Math.abs((parseFloat(savedData.fixed_pay?.total_fixed) || 0) - (basic + hra + allowance + conveyance + medical)) > 1 ||
              Math.abs((parseFloat(savedData.fixed_pay?.basic) || 0) - basic) > 1 ||
              Math.abs((parseFloat(savedData.fixed_pay?.hra) || 0) - hra) > 1 ||
              Math.abs((parseFloat(savedData.fixed_pay?.allowance) || 0) - allowance) > 1 ||
              Math.abs((parseFloat(savedData.fixed_pay?.conveyance) || 0) - conveyance) > 1 ||
              Math.abs((parseFloat(savedData.fixed_pay?.medical) || 0) - medical) > 1 ||
              Math.abs((parseFloat(savedData.statutory_deductions?.pf) || 0) - (latest_salary_structure.pf || 0)) > 1 ||
              Math.abs((parseFloat(savedData.statutory_deductions?.esi) || 0) - (latest_salary_structure.esi || 0)) > 1 ||
              Math.abs((parseFloat(savedData.statutory_deductions?.mediclaim) || 0) - (latest_salary_structure.mediclaim || 0)) > 1 ||
              Math.abs((parseFloat(savedData.statutory_deductions?.pt) || 0) - (latest_salary_structure.pt || 0)) > 1
            )
          : false,
        saved_payroll: savedData,
        it_declaration: itDeclarationInfo,
        facilities: facilities || defaultFacilities,
        esi_threshold: empEsiThreshold,
        global_esi_threshold: globalEsiThreshold,
      });
    } catch (err) {
      console.error("Get payroll data error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch payroll data" });
    }
  },

  // POST /api/auth/payroll/finalize
  async finalizePayroll(req, res) {
    try {
      const {
        employee_id,
        month_year,
        fixed_pay,
        variable_pay,
        gross_pay,
        attendance_summary,
        lop_deduction,
        tax_deductions,
        statutory_deductions,
        adjustments,
        total_deductions,
        net_salary,
        status = "Finalized",
        payment_date,
        payment_mode = "Bank Transfer",
        remarks = "",
      } = req.body;

      if (!employee_id || !month_year) {
        return res.status(400).json({ success: false, error: "Employee ID and Month/Year are required" });
      }

      // Check if existing record
      let payroll = await Payroll.findOne({
        where: {
          employee_id: employee_id.trim(),
          month_year: month_year.trim(),
        },
      });

      const payload = {
        employee_id: employee_id.trim(),
        month_year: month_year.trim(),
        fixed_pay: typeof fixed_pay === "object" ? JSON.stringify(fixed_pay) : fixed_pay,
        variable_pay: typeof variable_pay === "object" ? JSON.stringify(variable_pay) : variable_pay,
        gross_pay: parseFloat(gross_pay) || 0,
        attendance_summary: typeof attendance_summary === "object" ? JSON.stringify(attendance_summary) : attendance_summary,
        lop_deduction: parseFloat(lop_deduction) || 0,
        tax_deductions: typeof tax_deductions === "object" ? JSON.stringify(tax_deductions) : tax_deductions,
        statutory_deductions: typeof statutory_deductions === "object" ? JSON.stringify(statutory_deductions) : statutory_deductions,
        adjustments: typeof adjustments === "object" ? JSON.stringify(adjustments) : adjustments,
        total_deductions: parseFloat(total_deductions) || 0,
        net_salary: parseFloat(net_salary) || 0,
        status,
        payment_date: payment_date || new Date().toISOString().split("T")[0],
        payment_mode,
        remarks,
      };

      if (payroll) {
        await payroll.update(payload);
      } else {
        payroll = await Payroll.create(payload);
      }

      return res.json({
        success: true,
        message: `Payroll for ${month_year} successfully ${status.toLowerCase()}!`,
        payroll,
      });
    } catch (err) {
      console.error("Finalize payroll error:", err);
      return res.status(500).json({ success: false, error: "Failed to finalize payroll" });
    }
  },

  // GET /api/auth/payroll/history/:employeeId
  async getPayrollHistory(req, res) {
    try {
      const empId = req.params.employeeId;
      if (!empId) {
        return res.status(400).json({ success: false, error: "Employee ID is required" });
      }

      const records = await Payroll.findAll({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
        order: [["id", "DESC"]],
      });

      return res.json({ success: true, records });
    } catch (err) {
      console.error("Get payroll history error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch payroll history" });
    }
  },

  // GET /api/auth/payroll/all?month=March 2026

  // GET /api/auth/payroll/settings
  async getPayrollSettings(req, res) {
    try {
      const globalEsi = await getGlobalEsiThreshold();
      const companyInterest = await getCompanyLoanInterestRate();

      // Ensure esi_slab_history table exists
      let historyRows = [];
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS esi_slab_history (
            id SERIAL PRIMARY KEY,
            threshold NUMERIC(12, 2) NOT NULL,
            effective_from VARCHAR(50),
            effective_to VARCHAR(50),
            contribution_period VARCHAR(100),
            benefit_period VARCHAR(100),
            changed_by VARCHAR(100),
            notes TEXT,
            affected_count INT DEFAULT 0,
            applied_to_all BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        const [rows] = await sequelize.query("SELECT * FROM esi_slab_history ORDER BY id DESC");
        historyRows = rows || [];
      } catch (tableErr) {
        console.warn("ESI history table check warning:", tableErr.message);
      }

      // Determine active contribution & benefit period based on current calendar month
      const istMonth = new Date().getMonth() + 1; // 1 to 12
      const isCycle1 = istMonth >= 4 && istMonth <= 9; // April to September
      const currentYear = new Date().getFullYear();

      const activeCycle = isCycle1
        ? {
            period_name: "1st Contribution Period (Summer / Monsoon Cycle)",
            contribution_period: `1st April ${currentYear} to 30th September ${currentYear}`,
            benefit_period: `1st January ${currentYear + 1} to 30th June ${currentYear + 1}`,
            status: "Active Ongoing Cycle",
          }
        : {
            period_name: "2nd Contribution Period (Winter / Spring Cycle)",
            contribution_period: istMonth >= 10
              ? `1st October ${currentYear} to 31st March ${currentYear + 1}`
              : `1st October ${currentYear - 1} to 31st March ${currentYear}`,
            benefit_period: istMonth >= 10
              ? `1st July ${currentYear + 1} to 31st December ${currentYear + 1}`
              : `1st July ${currentYear} to 31st December ${currentYear}`,
            status: "Active Ongoing Cycle",
          };

      // Retrieve all employees to compute affected employee count & roster
      const users = await User.findAll({
        attributes: ["id", "employee_id", "name", "dept", "designation", "current_salary", "esi_threshold", "employment_type"],
        order: [["id", "ASC"]],
      });

      const affectedEmployees = users.map((u) => {
        const curSal = parseFloat(u.current_salary) || 0;
        const empThresh = u.esi_threshold != null ? parseFloat(u.esi_threshold) : globalEsi;
        const isEligible = curSal <= empThresh;
        return {
          id: u.id,
          employee_code: u.employee_id,
          name: u.name,
          dept: u.dept || "General",
          designation: u.designation || "Staff",
          current_salary: curSal,
          esi_threshold: empThresh,
          is_esi_eligible: isEligible,
          monthly_esi_employee: isEligible ? Math.round(curSal * 0.0075) : 0,
          monthly_esi_employer: isEligible ? Math.round(curSal * 0.0325) : 0,
          total_esi_contribution: isEligible ? Math.round(curSal * 0.04) : 0,
          coverage_status: isEligible ? `Covered (≤ ₹${empThresh.toLocaleString("en-IN")})` : `Mediclaim (> ₹${empThresh.toLocaleString("en-IN")})`,
          active_period: activeCycle.contribution_period,
          benefit_period: activeCycle.benefit_period,
        };
      });

      const eligibleCount = affectedEmployees.filter((e) => e.is_esi_eligible).length;

      return res.json({
        success: true,
        settings: {
          global_esi_threshold: globalEsi,
          company_loan_interest_rate: companyInterest,
          statutory_ceiling: 21000,
          employee_contribution_rate: "0.75%",
          employer_contribution_rate: "3.25%",
          total_contribution_rate: "4.00%",
          active_cycle: activeCycle,
          statutory_cycles: [
            {
              cycle_number: 1,
              title: "1st Contribution Period",
              contribution_period: "1st April to 30th September (6 Months)",
              benefit_period: "1st January to 30th June of following year",
              description: "Covers summer/monsoon contributions. Medical and cash benefits payable in Jan-Jun.",
            },
            {
              cycle_number: 2,
              title: "2nd Contribution Period",
              contribution_period: "1st October to 31st March (6 Months)",
              benefit_period: "1st July to 31st December of following year",
              description: "Covers winter/spring contributions. Medical and cash benefits payable in Jul-Dec.",
            },
          ],
          rule_50_wage_ceiling_continuation:
            "Under Rule 50 of ESI (Central) Rules: If an employee's wage exceeds the statutory ceiling mid-period, the employee continues to be covered and deductions continue until the end of that contribution period.",
        },
        esi_history: historyRows,
        stats: {
          total_employees: users.length,
          esi_eligible_count: eligibleCount,
          mediclaim_count: users.length - eligibleCount,
        },
        affected_employees: affectedEmployees,
      });
    } catch (err) {
      console.error("Get payroll settings error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch payroll settings" });
    }
  },

  // POST /api/auth/payroll/settings
  async updatePayrollSettings(req, res) {
    try {
      const { global_esi_threshold, company_loan_interest_rate, apply_to_all, notes } = req.body;
      const prevEsi = await getGlobalEsiThreshold();
      const val = parseFloat(global_esi_threshold) || 21000;

      // Update global ESI threshold in system_settings
      await sequelize.query(
        `INSERT INTO system_settings (key, value, "updatedAt") 
         VALUES ('global_esi_threshold', :val, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = :val, "updatedAt" = NOW()`,
        { replacements: { val: String(val) } }
      );

      // Update company interest rate if provided
      if (company_loan_interest_rate !== undefined) {
        const intVal = parseFloat(company_loan_interest_rate) || 8.5;
        await sequelize.query(
          `INSERT INTO system_settings (key, value, "updatedAt") 
           VALUES ('company_loan_interest_rate', :intVal, NOW()) 
           ON CONFLICT (key) DO UPDATE SET value = :intVal, "updatedAt" = NOW()`,
          { replacements: { intVal: String(intVal) } }
        );
      }

      if (apply_to_all) {
        await User.update({ esi_threshold: val }, { where: {} });
        await Employee.update({ esi_threshold: val }, { where: {} });
      }

      // Count affected employees with gross <= new threshold
      const users = await User.findAll({ attributes: ["id", "current_salary"] });
      const affectedCount = users.filter((u) => (parseFloat(u.current_salary) || 0) <= val).length;

      // Determine active contribution & benefit cycle for history record
      const istMonth = new Date().getMonth() + 1;
      const isCycle1 = istMonth >= 4 && istMonth <= 9;
      const curYear = new Date().getFullYear();
      const contribPeriod = isCycle1
        ? `1st Apr ${curYear} - 30th Sep ${curYear}`
        : (istMonth >= 10 ? `1st Oct ${curYear} - 31st Mar ${curYear + 1}` : `1st Oct ${curYear - 1} - 31st Mar ${curYear}`);
      const benefitPeriod = isCycle1
        ? `1st Jan ${curYear + 1} - 30th Jun ${curYear + 1}`
        : (istMonth >= 10 ? `1st Jul ${curYear + 1} - 31st Dec ${curYear + 1}` : `1st Jul ${curYear} - 31st Dec ${curYear}`);

      const userRole = (req.headers.role || (req.user && req.user.role) || "Accounts Admin").toUpperCase();
      const changeNote = notes || (apply_to_all
        ? `Global ESI slab updated from ₹${prevEsi} to ₹${val} and enforced company-wide`
        : `Default ESI threshold updated from ₹${prevEsi} to ₹${val}`);

      try {
        await sequelize.query(
          `INSERT INTO esi_slab_history (threshold, effective_from, effective_to, contribution_period, benefit_period, changed_by, notes, affected_count, applied_to_all, created_at)
           VALUES (:threshold, :effective_from, 'Present', :contribution_period, :benefit_period, :changed_by, :notes, :affected_count, :applied_to_all, NOW())`,
          {
            replacements: {
              threshold: val,
              effective_from: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
              contribution_period: contribPeriod,
              benefit_period: benefitPeriod,
              changed_by: userRole,
              notes: changeNote,
              affected_count: affectedCount,
              applied_to_all: !!apply_to_all,
            },
          }
        );
      } catch (histErr) {
        console.warn("Could not insert ESI slab history row:", histErr.message);
      }

      return res.json({
        success: true,
        message: apply_to_all
          ? `Global ESI slab updated to ₹${val.toLocaleString("en-IN")} and applied to all employees.`
          : `Global default ESI slab updated to ₹${val.toLocaleString("en-IN")}.`,
        settings: {
          global_esi_threshold: val,
          apply_to_all: !!apply_to_all,
        },
      });
    } catch (err) {
      console.error("Update payroll settings error:", err);
      return res.status(500).json({ success: false, error: "Failed to update payroll settings" });
    }
  },


  // GET /api/auth/payroll/facilities (ALL employees for Excel Grid)
  async getAllEmployeeFacilities(req, res) {
    try {
      const users = await User.findAll({
        order: [["employee_id", "ASC"]],
      });

      const globalEsi = await getGlobalEsiThreshold();
      const companyInterest = await getCompanyLoanInterestRate();

      const records = users.map((user) => {
        const isPermanent = (user.employment_type || "Permanent").toLowerCase() === "permanent";
        const grossSalary = parseFloat(user.current_salary) || 0;

        let parsedStructure = {};
        if (user.salary_structure) {
          try {
            parsedStructure = typeof user.salary_structure === "string" ? JSON.parse(user.salary_structure) : user.salary_structure;
          } catch (e) {}
        }

        const defaultFacilities = {
          advance: isPermanent,
          loan: isPermanent,
          insurance: isPermanent,
          gratuity: isPermanent,
        };

        let facilities = defaultFacilities;
        if (user.facilities) {
          try {
            facilities = typeof user.facilities === "string" ? JSON.parse(user.facilities) : user.facilities;
          } catch (e) {}
        } else if (parsedStructure.facilities) {
          facilities = parsedStructure.facilities;
        }

        const adj = parsedStructure.adjustments || {};
        const basic = parsedStructure.earnings?.basic || Math.round(grossSalary * 0.4);

        // Tenure calculation for Gratuity
        let tenureYears = 0;
        if (user.joining_date) {
          const joinDate = new Date(user.joining_date);
          const now = new Date();
          const diffTime = Math.max(0, now - joinDate);
          tenureYears = Math.round((diffTime / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
        }

        const gratuityMonthly = isPermanent && facilities.gratuity ? Math.round((basic * 15) / (26 * 12)) : 0;
        const gratuityTotal = isPermanent && facilities.gratuity ? Math.round((15 * basic * tenureYears) / 26) : 0;

        // Mediclaim Role Tier condition check
        const mediTier = getMediclaimLimitByDesignation(user.designation, user.role);

        // ESI vs Mediclaim
        const empEsiThreshold = (user.esi_threshold != null && !isNaN(parseFloat(user.esi_threshold)))
          ? parseFloat(user.esi_threshold)
          : globalEsi;
        const isEsiEligible = grossSalary <= empEsiThreshold;
        const esiAmount = isEsiEligible ? Math.round(grossSalary * 0.0075) : 0;

        const advanceAmount = Math.min(100000, Math.max(0, parseFloat(adj.advance_amount) || 0));
        const advanceDeduction = Math.min(advanceAmount, Math.max(0, parseFloat(adj.advance_deduction) || 0));

        let loanAmount = parseFloat(adj.loan_amount) || 0;
        if (loanAmount > 0) {
          loanAmount = Math.min(1000000, Math.max(100000, loanAmount));
        }
        const loanInterestRate = adj.loan_interest_rate != null ? parseFloat(adj.loan_interest_rate) : companyInterest;
        const loanTenure = parseInt(adj.loan_tenure) || 24;
        const loanEmi = parseFloat(adj.loan_emi) || 0;

        const insuranceDeduction = facilities.insurance ? (parseFloat(adj.insurance_deduction) || 0) : 0;
        const mediclaimCoverage = facilities.insurance ? Math.min(mediTier.limit, parseFloat(adj.mediclaim_coverage) || mediTier.limit) : 0;
        const mediclaimDeduction = (!isEsiEligible && facilities.insurance)
          ? (parsedStructure?.deductions?.mediclaim != null
              ? parseFloat(parsedStructure.deductions.mediclaim)
              : (parseFloat(adj.mediclaim_deduction) || (grossSalary > 25000 ? 750 : 500)))
          : 0;

        const totalDeductions =
          (facilities.advance ? advanceDeduction : 0) +
          (facilities.loan ? loanEmi : 0) +
          (facilities.insurance ? insuranceDeduction : 0) +
          (isEsiEligible ? esiAmount : (facilities.insurance ? mediclaimDeduction : 0));

        const applicableContribution =
          (facilities.advance ? advanceAmount : 0) +
          (facilities.loan ? loanAmount : 0) +
          (facilities.gratuity ? gratuityMonthly : 0) +
          (facilities.insurance ? mediclaimCoverage : 0);

        return {
          employee_code: user.employee_id,
          name: user.name,
          department: user.dept || "General",
          designation: user.designation || user.role || "Staff",
          employment_type: user.employment_type || "Permanent",
          salary: grossSalary,
          basic_pay: basic,
          tenure_years: tenureYears,
          facilities: {
            advance: !!facilities.advance,
            loan: !!facilities.loan,
            insurance: !!facilities.insurance,
            gratuity: !!facilities.gratuity,
          },
          advance: {
            amount: advanceAmount,
            deduction: advanceDeduction,
            max_limit: 100000,
            enabled: !!facilities.advance,
          },
          loan: {
            amount: loanAmount,
            interest_rate: loanInterestRate,
            tenure_months: loanTenure,
            emi: loanEmi,
            min_limit: 100000,
            max_limit: 1000000,
            enabled: !!facilities.loan,
          },
          insurance: {
            deduction: insuranceDeduction,
            enabled: !!facilities.insurance,
          },
          gratuity: {
            monthly_accrual: gratuityMonthly,
            total_entitlement: gratuityTotal,
            tenure_years: tenureYears,
            is_eligible: isPermanent,
            enabled: !!facilities.gratuity,
          },
          esi: {
            threshold: empEsiThreshold,
            use_global: user.esi_threshold == null,
            is_eligible: isEsiEligible,
            amount: esiAmount,
            rate: 0.0075,
          },
          mediclaim: {
            max_coverage: mediTier.limit,
            tier_label: mediTier.label,
            max_amount_str: mediTier.maxAmountStr,
            coverage: mediclaimCoverage,
            deduction: mediclaimDeduction,
            is_active: !isEsiEligible && !!facilities.insurance,
          },
          applicable_contribution: applicableContribution,
          total_deductions: totalDeductions,
        };
      });

      return res.json({
        success: true,
        count: records.length,
        records,
        global_esi_threshold: globalEsi,
        company_interest_rate: companyInterest,
      });
    } catch (err) {
      console.error("Get all employee facilities error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch all employee facilities" });
    }
  },

  // POST /api/auth/payroll/facilities/batch (Batch updates from Excel Grid)
  async batchUpdateEmployeeFacilities(req, res) {
    try {
      const userRole = (req.user?.role || req.headers.role || "").toLowerCase();
      if (["hr", "hrmanager"].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: "Access Denied: HR has view-only access. Facilities and Statutory Benefits can only be configured by the Accounts Department."
        });
      }

      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ success: false, error: "Updates list is required" });
      }

      let updatedCount = 0;
      const errors = [];

      for (const item of updates) {
        const empId = item.employee_code || item.employee_id;
        if (!empId) continue;

        const user = await User.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            empId.toLowerCase().trim()
          ),
        });

        if (!user) {
          errors.push(`Employee ${empId} not found`);
          continue;
        }

        // Strict condition checks
        const adj = item.adjustments || {};
        if (adj.advance_amount && parseFloat(adj.advance_amount) > 100000) {
          errors.push(`Employee ${empId}: Advance payment exceeds ₹1,00,000 maximum limit`);
          continue;
        }

        if (adj.loan_amount && parseFloat(adj.loan_amount) > 0) {
          const lAmount = parseFloat(adj.loan_amount);
          if (lAmount < 100000 || lAmount > 1000000) {
            errors.push(`Employee ${empId}: Loan amount must be between ₹1,00,000 and ₹10,00,000`);
            continue;
          }
        }

        const mediTier = getMediclaimLimitByDesignation(user.designation, user.role);
        if (adj.mediclaim_coverage && parseFloat(adj.mediclaim_coverage) > mediTier.limit) {
          errors.push(`Employee ${empId}: Mediclaim coverage exceeds role limit of ₹${mediTier.maxAmountStr}`);
          continue;
        }

        let parsedStructure = {};
        if (user.salary_structure) {
          try {
            parsedStructure = typeof user.salary_structure === "string" ? JSON.parse(user.salary_structure) : user.salary_structure;
          } catch (e) {}
        }

        const updatedFacilities = item.facilities || user.facilities || { advance: true, loan: true, insurance: true, gratuity: true };
        const updatedAdjustments = {
          ...(parsedStructure.adjustments || {}),
          ...adj,
        };

        const finalEsiThreshold = item.use_global_esi
          ? null
          : (item.esi_threshold != null && !isNaN(parseFloat(item.esi_threshold)) ? parseFloat(item.esi_threshold) : null);

        parsedStructure.facilities = updatedFacilities;
        parsedStructure.adjustments = updatedAdjustments;
        parsedStructure.esi_threshold = finalEsiThreshold;

        const structureJson = JSON.stringify(parsedStructure);
        const facilitiesJson = JSON.stringify(updatedFacilities);

        await user.update({
          facilities: facilitiesJson,
          esi_threshold: finalEsiThreshold,
          salary_structure: structureJson,
        });

        try {
          const emp = await Employee.findOne({
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              empId.toLowerCase().trim()
            ),
          });
          if (emp) {
            await emp.update({
              facilities: facilitiesJson,
              esi_threshold: finalEsiThreshold,
              salary_structure: structureJson,
            });
          }
        } catch (syncErr) {}

        updatedCount++;
      }

      return res.json({
        success: true,
        message: `Successfully updated ${updatedCount} employee facilities records`,
        updatedCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      console.error("Batch update employee facilities error:", err);
      return res.status(500).json({ success: false, error: "Failed to batch update employee facilities" });
    }
  },

  // GET /api/auth/payroll/facilities/:employeeId
  async getEmployeeFacilities(req, res) {
    try {
      const empId = req.params.employeeId;
      if (!empId) {
        return res.status(400).json({ success: false, error: "Employee ID is required" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      const isPermanent = (user.employment_type || "Permanent").toLowerCase() === "permanent";
      const globalEsi = await getGlobalEsiThreshold();

      let parsedStructure = {};
      if (user.salary_structure) {
        try {
          parsedStructure = typeof user.salary_structure === "string" ? JSON.parse(user.salary_structure) : user.salary_structure;
        } catch (e) {}
      }

      const defaultFacilities = {
        advance: isPermanent,
        loan: isPermanent,
        insurance: isPermanent,
        gratuity: isPermanent,
      };

      let facilities = defaultFacilities;
      if (user.facilities) {
        try {
          facilities = typeof user.facilities === "string" ? JSON.parse(user.facilities) : user.facilities;
        } catch (e) {}
      } else if (parsedStructure.facilities) {
        facilities = parsedStructure.facilities;
      }

      const adjustments = parsedStructure.adjustments || {};
      const empEsiThreshold = (user.esi_threshold != null && !isNaN(parseFloat(user.esi_threshold)))
        ? parseFloat(user.esi_threshold)
        : (parsedStructure.esi_threshold != null ? parseFloat(parsedStructure.esi_threshold) : globalEsi);

      const grossSalary = parseFloat(user.current_salary) || 0;
      const isEsiEligible = grossSalary <= empEsiThreshold;

      return res.json({
        success: true,
        employee_id: user.employee_id,
        name: user.name,
        employment_type: user.employment_type || "Permanent",
        current_salary: grossSalary,
        facilities,
        esi_threshold: empEsiThreshold,
        global_esi_threshold: globalEsi,
        use_global_esi: user.esi_threshold == null,
        adjustments: {
          advance_amount: parseFloat(adjustments.advance_amount) || 0,
          advance_deduction: parseFloat(adjustments.advance_deduction) || 0,
          loan_amount: parseFloat(adjustments.loan_amount) || 0,
          loan_emi: parseFloat(adjustments.loan_emi) || 0,
          insurance_deduction: parseFloat(adjustments.insurance_deduction) || 0,
          total_gratuity: parseFloat(adjustments.total_gratuity) || 0,
          gratuity_accrual: parseFloat(adjustments.gratuity_accrual) || 0,
        },
        statutory: {
          is_esi_eligible: isEsiEligible,
          esi_deduction: (isEsiEligible && facilities.insurance)
            ? (parsedStructure?.deductions?.esi != null ? parseFloat(parsedStructure.deductions.esi) : Math.round(grossSalary * 0.0075))
            : 0,
          mediclaim_deduction: (!isEsiEligible && facilities.insurance)
            ? (parsedStructure?.deductions?.mediclaim != null ? parseFloat(parsedStructure.deductions.mediclaim) : (grossSalary > 25000 ? 750 : 500))
            : 0,
        }
      });
    } catch (err) {
      console.error("Get employee facilities error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch facilities" });
    }
  },

  // POST /api/auth/payroll/facilities/:employeeId
  // Accounts Department only (HR has view-only access)
  async updateEmployeeFacilities(req, res) {
    try {
      const empId = req.params.employeeId;
      if (!empId) {
        return res.status(400).json({ success: false, error: "Employee ID is required" });
      }

      // Check role: HR has view-only access
      const userRole = (req.user?.role || req.headers.role || "").toLowerCase();
      if (["hr", "hrmanager"].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: "Access Denied: HR has view-only access. Facilities and Statutory Benefits can only be configured by the Accounts Department."
        });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      const { facilities, adjustments, esi_threshold, use_global_esi } = req.body;

      // Strict condition checks for single employee update
      const adj = adjustments || {};
      if (adj.advance_amount && parseFloat(adj.advance_amount) > 100000) {
        return res.status(400).json({
          success: false,
          error: "Strict Condition Check: Advanced Payment cannot exceed ₹1,00,000 (1 Lakh).",
        });
      }
      if (adj.advance_amount && parseFloat(adj.advance_amount) < 0) {
        return res.status(400).json({
          success: false,
          error: "Strict Condition Check: Advanced Payment amount cannot be negative.",
        });
      }
      if (adj.advance_deduction && parseFloat(adj.advance_deduction) > parseFloat(adj.advance_amount || 0)) {
        return res.status(400).json({
          success: false,
          error: "Strict Condition Check: Monthly advance recovery deduction cannot exceed total principal advance.",
        });
      }

      if (adj.loan_amount && parseFloat(adj.loan_amount) > 0) {
        const lAmount = parseFloat(adj.loan_amount);
        if (lAmount < 100000 || lAmount > 1000000) {
          return res.status(400).json({
            success: false,
            error: "Strict Condition Check: Company Loan amount must be between ₹1,00,000 and ₹10,00,000 (1 to 10 Lakhs).",
          });
        }
      }

      const mediTier = getMediclaimLimitByDesignation(user.designation, user.role);
      if (adj.mediclaim_coverage && parseFloat(adj.mediclaim_coverage) > mediTier.limit) {
        return res.status(400).json({
          success: false,
          error: `Strict Condition Check: Mediclaim coverage exceeds maximum limit of ₹${mediTier.maxAmountStr} for role ${mediTier.label} (${user.designation || user.role}).`,
        });
      }

      let parsedStructure = {};
      if (user.salary_structure) {
        try {
          parsedStructure = typeof user.salary_structure === "string" ? JSON.parse(user.salary_structure) : user.salary_structure;
        } catch (e) {}
      }

      const updatedFacilities = facilities || (user.facilities ? (typeof user.facilities === "string" ? JSON.parse(user.facilities) : user.facilities) : {
        advance: true,
        loan: true,
        insurance: true,
        gratuity: true
      });

      const updatedAdjustments = {
        ...(parsedStructure.adjustments || {}),
        ...(adjustments || {}),
      };

      const finalEsiThreshold = use_global_esi
        ? null
        : (esi_threshold != null && !isNaN(parseFloat(esi_threshold)) ? parseFloat(esi_threshold) : null);

      parsedStructure.facilities = updatedFacilities;
      parsedStructure.adjustments = updatedAdjustments;
      parsedStructure.esi_threshold = finalEsiThreshold;

      const structureJson = JSON.stringify(parsedStructure);
      const facilitiesJson = JSON.stringify(updatedFacilities);

      await user.update({
        facilities: facilitiesJson,
        esi_threshold: finalEsiThreshold,
        salary_structure: structureJson,
      });

      try {
        const emp = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            empId.toLowerCase().trim()
          ),
        });
        if (emp) {
          await emp.update({
            facilities: facilitiesJson,
            esi_threshold: finalEsiThreshold,
            salary_structure: structureJson,
          });
        }
      } catch (syncErr) {
        console.warn("Employee facilities sync warning:", syncErr.message);
      }

      return res.json({
        success: true,
        message: "Employee facilities & statutory benefits updated successfully by Accounts Department",
        facilities: updatedFacilities,
        adjustments: updatedAdjustments,
        esi_threshold: finalEsiThreshold,
      });
    } catch (err) {
      console.error("Update employee facilities error:", err);
      return res.status(500).json({ success: false, error: "Failed to update facilities" });
    }
  },

  async getAllPayrolls(req, res) {
    try {
      const monthYear = req.query.month;
      const where = {};
      if (monthYear) {
        where.month_year = monthYear.trim();
      }
      const records = await Payroll.findAll({
        where,
        order: [["id", "DESC"]],
      });
      return res.json({ success: true, records, data: records, payrolls: records });
    } catch (err) {
      console.error("Get all payrolls error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch payroll records" });
    }
  },

  async getMonthlySummarySheet(req, res) {
    try {
      const monthYear = req.query.month || new Date().toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
      const monthNames = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december"
      ];
      const ist = getISTParts();
      let reqYear = ist.year;
      let reqMonthIdx = ist.month - 1;
      if (monthYear) {
        const parts = monthYear.trim().split(/[\s-]+/);
        if (parts[0]) {
          const idx = monthNames.indexOf(parts[0].toLowerCase());
          if (idx !== -1) reqMonthIdx = idx;
        }
        if (parts[1] && !isNaN(parseInt(parts[1]))) {
          reqYear = parseInt(parts[1]);
        }
      }

      const daysInMonth = new Date(reqYear, reqMonthIdx + 1, 0).getDate();
      const workingDays = Math.min(26, daysInMonth - 4);
      const weekOffs = Math.max(0, daysInMonth - workingDays);
      const startMonthStr = `${reqYear}-${String(reqMonthIdx + 1).padStart(2, "0")}-01`;
      const endMonthStr = `${reqYear}-${String(reqMonthIdx + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      const users = await User.findAll({ order: [["id", "ASC"]] });
      const employees = await Employee.findAll();
      const empMap = new Map();
      employees.forEach(e => {
        if (e.employee_id) empMap.set(e.employee_id.toLowerCase().trim(), e);
      });

      const holidays = await Holiday.findAll({
        where: { date: { [Op.between]: [startMonthStr, endMonthStr] } }
      });

      const attendances = await Attendance.findAll({
        where: { date: { [Op.between]: [startMonthStr, endMonthStr] } }
      });

      const leaves = await Leave.findAll({
        where: {
          status: "Approved",
          [Op.or]: [
            { start_date: { [Op.between]: [startMonthStr, endMonthStr] } },
            { end_date: { [Op.between]: [startMonthStr, endMonthStr] } }
          ]
        }
      });

      const payrollRecords = await Payroll.findAll({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("month_year")),
          monthYear.toLowerCase().trim()
        )
      });
      const payrollMap = new Map();
      payrollRecords.forEach(p => {
        if (p.employee_id) payrollMap.set(p.employee_id.toLowerCase().trim(), p);
      });

      const globalEsi = await getGlobalEsiThreshold();

      const summaryList = users.map(user => {
        const empCode = (user.employee_id || "").toLowerCase().trim();
        const empProfile = empMap.get(empCode);
        const payroll = payrollMap.get(empCode);

        // Attendance computation
        let attSummary = null;
        if (payroll && payroll.attendance_summary) {
          try {
            attSummary = typeof payroll.attendance_summary === "string" ? JSON.parse(payroll.attendance_summary) : payroll.attendance_summary;
          } catch {}
        }

        // Employee filter codes
        const codeMatches = [user.employee_id?.toLowerCase()].filter(Boolean);
        if (empProfile?.employee_id) codeMatches.push(empProfile.employee_id.toLowerCase());

        // Count user attendance records
        const userAtts = attendances.filter(a => a.employee_id && codeMatches.includes(a.employee_id.toLowerCase()));
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let overtimeHours = 0;
        userAtts.forEach(rec => {
          const st = (rec.status || "").toLowerCase();
          if (st.includes("present") || st.includes("half")) {
            presentDays += st.includes("half") ? 0.5 : 1;
          } else if (st.includes("absent") || st.includes("unpaid")) {
            absentDays += 1;
          }
          if (rec.late_count > 0 || st.includes("late")) {
            lateDays += 1;
          }
          if (rec.work_hours && parseFloat(rec.work_hours) > 8) {
            overtimeHours += Math.round((parseFloat(rec.work_hours) - 8) * 10) / 10;
          }
        });

        // Count user leaves
        const userLeaves = leaves.filter(l => l.employee_id && codeMatches.includes(l.employee_id.toLowerCase()));
        let leaveDays = 0;
        userLeaves.forEach(l => {
          const lStart = new Date(Math.max(new Date(l.start_date), new Date(startMonthStr)));
          const lEnd = new Date(Math.min(new Date(l.end_date), new Date(endMonthStr)));
          if (lEnd >= lStart) {
            leaveDays += Math.round((lEnd - lStart) / (1000 * 60 * 60 * 24)) + 1;
          }
        });

        // Count holidays for user dept
        const userDept = (user.dept || empProfile?.dept || "All").toLowerCase();
        const deptHolidays = holidays.filter(h => {
          const hd = (h.dept || "All").toLowerCase();
          return hd === "all" || hd === userDept;
        });
        const holidayDays = deptHolidays.length;

        if (userAtts.length === 0 && !attSummary) {
          presentDays = Math.max(0, workingDays - leaveDays - holidayDays);
          absentDays = 0;
        }

        const rawPaidDays = presentDays + leaveDays + holidayDays + weekOffs - absentDays;
        const paidDays = Math.max(0, Math.min(daysInMonth, rawPaidDays));
        const lopDays = Math.max(0, daysInMonth - paidDays);

        const attendance = {
          total_days: attSummary?.total_days ?? daysInMonth,
          working_days: attSummary?.working_days ?? workingDays,
          present_days: attSummary?.present_days ?? presentDays,
          leave_days: attSummary?.leave_days ?? leaveDays,
          absent_days: attSummary?.absent_days ?? absentDays,
          holiday_days: attSummary?.holiday_days ?? holidayDays,
          week_offs: attSummary?.week_offs ?? weekOffs,
          paid_days: attSummary?.paid_days ?? paidDays,
          lop_days: attSummary?.lop_days ?? lopDays,
          late_days: attSummary?.late_days ?? lateDays,
          overtime_hours: attSummary?.overtime_hours ?? overtimeHours,
        };

        const empType = (user.employment_type || empProfile?.employment_type || "Permanent").trim();
        const isPermanent = empType.toLowerCase() === "permanent";
        const userStatus = user.status || (user.is_active ? "Active" : "Inactive");

        // Pay numbers
        let basePay = 0;
        let grossPay = 0;
        let statutoryDeductions = 0;
        let isPaid = payroll ? (payroll.status === "Finalized") : false;

        let curSal = parseFloat(user.current_salary) || 25000;
        let ss = null;
        if (user.salary_structure) {
          try {
            ss = typeof user.salary_structure === "string" ? JSON.parse(user.salary_structure) : user.salary_structure;
          } catch {}
        }

        if (payroll) {
          let fp = {};
          try { fp = typeof payroll.fixed_pay === "string" ? JSON.parse(payroll.fixed_pay) : (payroll.fixed_pay || {}); } catch {}
          basePay = parseFloat(fp.total_fixed || fp.basic) || curSal;
          grossPay = parseFloat(payroll.gross_pay) || basePay;
          statutoryDeductions = parseFloat(payroll.total_deductions) || 0;
        } else if (ss) {
          const earn = ss.earnings || {};
          const ded = ss.deductions || {};
          basePay = (parseFloat(earn.basic) || 0) + (parseFloat(earn.hra) || 0) + (parseFloat(earn.conveyance) || 0) + (parseFloat(earn.medical) || 0) + (parseFloat(earn.allowance) || 0) || curSal;
          grossPay = basePay;
          statutoryDeductions = (parseFloat(ded.professional_tax) || 0) + (parseFloat(ded.income_tax) || 0) + (parseFloat(ded.pf) || 0) + (parseFloat(ded.esi) || 0) + (parseFloat(ded.mediclaim) || 0) + (parseFloat(ded.tds) || 0);
        } else {
          basePay = curSal;
          grossPay = curSal;
          const pf = Math.round(curSal * 0.45 * 0.12);
          const pt = curSal > 15000 ? 200 : 0;
          statutoryDeductions = pf + pt;
        }

        // ══ FACILITIES EVALUATION & DETECTION (SHOW IF TAKEN) ══
        const defaultFacilities = {
          advance: isPermanent,
          loan: isPermanent,
          insurance: isPermanent,
          gratuity: isPermanent,
        };

        let facilitiesToggles = defaultFacilities;
        if (user.facilities) {
          try {
            facilitiesToggles = typeof user.facilities === "string" ? JSON.parse(user.facilities) : user.facilities;
          } catch {}
        } else if (ss?.facilities) {
          facilitiesToggles = ss.facilities;
        }

        const adj = ss?.adjustments || {};
        const basic = ss?.earnings?.basic || Math.round(grossPay * 0.45);

        // Tenure calculation for Gratuity
        let tenureYears = 0;
        if (user.joining_date) {
          const joinDate = new Date(user.joining_date);
          const now = new Date();
          const diffTime = Math.max(0, now - joinDate);
          tenureYears = Math.round((diffTime / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
        }

        const gratuityMonthly = isPermanent && facilitiesToggles.gratuity ? Math.round((basic * 15) / (26 * 12)) : 0;
        const advanceAmount = Math.min(100000, Math.max(0, parseFloat(adj.advance_amount) || 0));
        const advanceDeduction = Math.min(advanceAmount, Math.max(0, parseFloat(adj.advance_deduction) || 0));

        let loanAmount = parseFloat(adj.loan_amount) || 0;
        if (loanAmount > 0) {
          loanAmount = Math.min(1000000, Math.max(100000, loanAmount));
        }
        const loanEmi = parseFloat(adj.loan_emi) || 0;

        const empEsiThresh = (user.esi_threshold != null && !isNaN(parseFloat(user.esi_threshold)))
          ? parseFloat(user.esi_threshold)
          : globalEsi;
        const isEsiEligible = grossPay <= empEsiThresh;

        const insuranceDeduction = facilitiesToggles.insurance ? (parseFloat(adj.insurance_deduction) || 0) : 0;
        const mediclaimDeduction = (!isEsiEligible && facilitiesToggles.insurance)
          ? (ss?.deductions?.mediclaim != null
              ? parseFloat(ss.deductions.mediclaim)
              : (parseFloat(adj.mediclaim_deduction) || (grossPay > 25000 ? 750 : 500)))
          : 0;

        // Add adjustment deductions if not already in statutory
        if (!payroll) {
          if (advanceDeduction > 0) statutoryDeductions += advanceDeduction;
          if (loanEmi > 0) statutoryDeductions += loanEmi;
          if (insuranceDeduction > 0) statutoryDeductions += insuranceDeduction;
          if (mediclaimDeduction > 0 && !ss?.deductions?.mediclaim) statutoryDeductions += mediclaimDeduction;
        }

        // List facilities taken
        const takenItems = [];
        if (advanceAmount > 0 || advanceDeduction > 0) {
          let str = `Advance: Rs. ${advanceAmount.toLocaleString("en-IN")}`;
          if (advanceDeduction > 0) str += ` (Rec: Rs. ${advanceDeduction.toLocaleString("en-IN")}/mo)`;
          takenItems.push(str);
        }
        if (loanAmount > 0 || loanEmi > 0) {
          let str = `Loan: Rs. ${loanAmount.toLocaleString("en-IN")}`;
          if (loanEmi > 0) str += ` (EMI: Rs. ${loanEmi.toLocaleString("en-IN")}/mo)`;
          takenItems.push(str);
        }
        if (facilitiesToggles.insurance && (mediclaimDeduction > 0 || insuranceDeduction > 0)) {
          const medAmt = mediclaimDeduction || insuranceDeduction;
          takenItems.push(`Mediclaim: Rs. ${medAmt.toLocaleString("en-IN")}/mo`);
        } else if (facilitiesToggles.insurance && !isEsiEligible) {
          takenItems.push("Mediclaim Enrolled");
        }
        if (isPermanent && facilitiesToggles.gratuity && gratuityMonthly > 0) {
          takenItems.push(`Gratuity: Rs. ${gratuityMonthly.toLocaleString("en-IN")}/mo`);
        }

        // Clean individual facility displays (ASCII-safe for PDF & Excel)
        let advanceDisplay = "-";
        if (advanceAmount > 0 || advanceDeduction > 0) {
          advanceDisplay = `Rs. ${advanceAmount.toLocaleString("en-IN")}${advanceDeduction > 0 ? ` (Rec: Rs. ${advanceDeduction.toLocaleString("en-IN")})` : ""}`;
        } else if (facilitiesToggles.advance) {
          advanceDisplay = "Enrolled";
        }

        let loanDisplay = "-";
        if (loanAmount > 0 || loanEmi > 0) {
          loanDisplay = `Rs. ${loanAmount.toLocaleString("en-IN")}${loanEmi > 0 ? ` (EMI: Rs. ${loanEmi.toLocaleString("en-IN")})` : ""}`;
        } else if (facilitiesToggles.loan) {
          loanDisplay = "Enrolled";
        }

        let insuranceDisplay = "-";
        if (mediclaimDeduction > 0 || insuranceDeduction > 0) {
          const medAmt = mediclaimDeduction || insuranceDeduction;
          insuranceDisplay = `Rs. ${medAmt.toLocaleString("en-IN")}/mo`;
        } else if (facilitiesToggles.insurance) {
          insuranceDisplay = isEsiEligible ? "ESI Eligible" : "Enrolled";
        }

        let gratuityDisplay = "-";
        if (isPermanent && facilitiesToggles.gratuity && gratuityMonthly > 0) {
          gratuityDisplay = `Rs. ${gratuityMonthly.toLocaleString("en-IN")}/mo`;
        } else if (isPermanent && facilitiesToggles.gratuity) {
          gratuityDisplay = "Accruing";
        }

        const hasFacilitiesTaken = takenItems.length > 0;
        const facilitiesTakenSummary = hasFacilitiesTaken ? takenItems.join("; ") : "None";

        // ══ PAYABLE SALARY ACCORDING TO PRESENT WORK DAYS ══
        const dailyRate = daysInMonth > 0 ? (grossPay / daysInMonth) : 0;
        const calculatedLop = Math.round(lopDays * dailyRate);
        const earnedGross = Math.max(0, Math.round((grossPay / daysInMonth) * paidDays));
        const effectiveLop = payroll ? (parseFloat(payroll.lop_deduction) || calculatedLop) : calculatedLop;

        let payableSalary = 0;
        if (payroll && payroll.status === "Finalized") {
          payableSalary = parseFloat(payroll.net_salary) || Math.max(0, grossPay - effectiveLop - statutoryDeductions);
        } else {
          payableSalary = Math.max(0, grossPay - effectiveLop - statutoryDeductions);
        }

        const totalDeductions = statutoryDeductions + effectiveLop;
        const netSalary = payableSalary;

        // Bank info
        let bankInfo = { name: "HDFC Bank", account: "N/A", ifsc: "N/A", pan: "" };
        if (user.bank_details) {
          try {
            const b = typeof user.bank_details === "string" ? JSON.parse(user.bank_details) : user.bank_details;
            bankInfo = {
              name: b.bank_name || b.name || "HDFC Bank",
              account: b.account_no || b.account || "N/A",
              ifsc: b.ifsc_code || b.ifsc || "N/A",
              pan: b.pan_number || b.pan || user.pan_no || "",
            };
          } catch {
            if (typeof user.bank_details === "string" && user.bank_details.trim()) {
              bankInfo.name = user.bank_details;
            }
          }
        }

        return {
          employee_code: user.employee_id,
          name: user.name,
          dept: user.dept || empProfile?.dept || "General",
          designation: user.designation || empProfile?.designation || "Staff",
          group_name: (user.group_name !== undefined && user.group_name !== null) ? user.group_name : (empProfile?.group_name || null),
          company_name: user.company_name || empProfile?.company_name || "TATA Steel",
          work_location: user.work_location || empProfile?.work_location || "Kolkata",
          email: user.email,
          phone_no: user.phone_no || "",
          employee_status: userStatus,
          employment_type: empType,
          attendance,
          base_pay: basePay,
          gross_pay: grossPay,
          overall_gross: grossPay,
          earned_gross: earnedGross,
          lop_days: lopDays,
          lop_amount: effectiveLop,
          daily_rate: Math.round(dailyRate * 100) / 100,
          statutory_deductions: statutoryDeductions,
          total_deductions: totalDeductions,
          payable_salary: payableSalary,
          net_salary: netSalary,
          is_paid: isPaid,
          status: isPaid ? "Paid" : "Unpaid",
          has_facilities_taken: hasFacilitiesTaken,
          facilities_taken: facilitiesTakenSummary,
          facility_advance: advanceDisplay,
          facility_loan: loanDisplay,
          facility_insurance: insuranceDisplay,
          facility_gratuity: gratuityDisplay,
          facilities: {
            advance_amount: advanceAmount,
            advance_deduction: advanceDeduction,
            loan_amount: loanAmount,
            loan_emi: loanEmi,
            insurance_deduction: insuranceDeduction,
            mediclaim_deduction: mediclaimDeduction,
            gratuity_accrual: gratuityMonthly,
            has_advance: advanceAmount > 0 || advanceDeduction > 0,
            has_loan: loanAmount > 0 || loanEmi > 0,
            has_insurance: facilitiesToggles.insurance,
            has_gratuity: isPermanent && !!facilitiesToggles.gratuity,
          },
          bank_name: bankInfo.name,
          account_no: bankInfo.account,
          ifsc: bankInfo.ifsc,
          pan: user.pan_no || bankInfo.pan || "",
          salary_structure: ss,
        };
      });

      return res.json({
        success: true,
        month_year: monthYear,
        summary: summaryList,
        total_employees: summaryList.length,
      });
    } catch (err) {
      console.error("Get monthly summary sheet error:", err);
      return res.status(500).json({ success: false, error: "Failed to generate monthly summary" });
    }
  },

  // POST /api/auth/payroll/assign-company
  async assignCompanyLocation(req, res) {
    try {
      const { employee_id, employee_ids, group_name, company_name, work_location } = req.body;
      const ids = employee_ids && Array.isArray(employee_ids) ? employee_ids : (employee_id ? [employee_id] : []);
      if (ids.length === 0) {
        return res.status(400).json({ success: false, error: "No employee IDs provided" });
      }

      const cleanIds = ids.map((id) => String(id).replace(/^#/, "").trim());
      const updatePayload = {};
      if (group_name !== undefined) updatePayload.group_name = (group_name && group_name.trim()) ? group_name.trim() : null;
      if (company_name !== undefined) updatePayload.company_name = company_name ? company_name.trim() : "TATA Steel";
      if (work_location !== undefined) updatePayload.work_location = work_location ? work_location.trim() : "Kolkata";

      await User.update(updatePayload, {
        where: {
          employee_id: { [Op.in]: cleanIds }
        }
      });

      await Employee.update(updatePayload, {
        where: {
          employee_id: { [Op.in]: cleanIds }
        }
      });

      return res.json({
        success: true,
        message: `Successfully updated organization details for ${cleanIds.length} employee(s)`,
        updated_ids: cleanIds,
        data: updatePayload
      });
    } catch (err) {
      console.error("Assign company location error:", err);
      return res.status(500).json({ success: false, error: "Failed to update company & location details" });
    }
  },

  // POST /api/auth/payroll/disburse-batch
  async disburseBatch(req, res) {
    try {
      const { employee_ids, month, payment_mode, payment_date } = req.body;
      if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
        return res.status(400).json({ success: false, error: "No employee IDs provided for disbursement" });
      }

      const monthYear = month || new Date().toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
      const payDate = payment_date || new Date().toISOString().split("T")[0];
      const payMode = payment_mode || "Bank Transfer";
      const cleanIds = employee_ids.map((id) => String(id).replace(/^#/, "").trim());

      const results = [];
      for (const empCode of cleanIds) {
        const user = await User.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            empCode.toLowerCase()
          )
        });
        if (!user) continue;

        let existing = await Payroll.findOne({
          where: {
            employee_id: user.employee_id,
            month_year: monthYear
          }
        });

        if (existing) {
          await existing.update({
            status: "Finalized",
            payment_date: payDate,
            payment_mode: payMode,
            remarks: `Batch Salary Disbursement processed on ${payDate} via ${payMode}`
          });
          results.push({ employee_id: user.employee_id, status: "Finalized", updated: true });
        } else {
          const curSal = parseFloat(user.current_salary) || 25000;
          let ss = null;
          if (user.salary_structure) {
            try { ss = typeof user.salary_structure === "string" ? JSON.parse(user.salary_structure) : user.salary_structure; } catch {}
          }
          const basePay = ss?.earnings ? (
            (parseFloat(ss.earnings.basic) || 0) +
            (parseFloat(ss.earnings.hra) || 0) +
            (parseFloat(ss.earnings.conveyance) || 0) +
            (parseFloat(ss.earnings.medical) || 0) +
            (parseFloat(ss.earnings.allowance) || 0)
          ) : curSal;

          const created = await Payroll.create({
            employee_id: user.employee_id,
            month_year: monthYear,
            gross_pay: basePay,
            lop_deduction: 0,
            total_deductions: Math.round(basePay * 0.12),
            net_salary: Math.max(0, basePay - Math.round(basePay * 0.12)),
            status: "Finalized",
            payment_date: payDate,
            payment_mode: payMode,
            remarks: `Batch Salary Disbursement processed on ${payDate} via ${payMode}`,
            fixed_pay: JSON.stringify({ basic: Math.round(basePay * 0.45), total_fixed: basePay }),
            attendance_summary: JSON.stringify({ total_days: 30, working_days: 26, present_days: 26, paid_days: 26, lop_days: 0 })
          });
          results.push({ employee_id: user.employee_id, status: "Finalized", created: true });
        }
      }

      return res.json({
        success: true,
        message: `Successfully disbursed salaries for ${results.length} employee(s)`,
        disbursed_count: results.length,
        records: results
      });
    } catch (err) {
      console.error("Batch disburse error:", err);
      return res.status(500).json({ success: false, error: "Failed to process batch salary disbursement" });
    }
  },
};

module.exports = PayrollController;
