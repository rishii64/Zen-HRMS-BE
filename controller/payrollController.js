const { User, Employee, Payroll, Attendance, Leave, Holiday, ITDeclaration } = require("../config/db");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const { getISTParts } = require("../utils/timezone");

const PayrollController = {
  // GET /api/auth/payroll/data/:employeeId?month=March-2026
  async getPayrollData(req, res) {
    try {
      const empId = req.params.employeeId || req.query.employee_id;
      const monthYear = req.query.month || new Date().toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

      if (!empId) {
        return res.status(400).json({ success: false, error: "Employee code is required" });
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

      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
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

      let hasCustomStructure = false;
      if (parsedStructure && parsedStructure.earnings) {
        hasCustomStructure = true;
        const e = parsedStructure.earnings;
        const d = parsedStructure.deductions || {};
        const adj = parsedStructure.adjustments || {};
        basic = e.basic != null ? parseFloat(e.basic) : 0;
        hra = e.hra != null ? parseFloat(e.hra) : 0;
        allowance = e.allowance != null ? parseFloat(e.allowance) : 0;
        conveyance = e.conveyance != null ? parseFloat(e.conveyance) : 0;
        medical = e.medical != null ? parseFloat(e.medical) : 0;

        pt = d.professional_tax != null ? parseFloat(d.professional_tax) : 0;
        it = d.income_tax != null ? parseFloat(d.income_tax) : 0;
        pf = d.pf != null ? parseFloat(d.pf) : 0;
        esi = d.esi != null ? parseFloat(d.esi) : 0;
        mediclaim = d.mediclaim != null ? parseFloat(d.mediclaim) : 0;
        tds = d.tds != null ? parseFloat(d.tds) : 0;
        lop = d.lop != null ? parseFloat(d.lop) : 0;

        // Adjustments: Advance (max 1L), Loan (1L-10L), Insurance - Permanent employees only
        if (isPermanent) {
          advanceAmount = Math.min(100000, Math.max(0, parseFloat(adj.advance_amount) || 0));
          advanceDeduction = Math.min(advanceAmount, Math.max(0, parseFloat(adj.advance_deduction || d.advance_deduction) || 0));
          if (parseFloat(adj.loan_amount) > 0) {
            loanAmount = Math.min(1000000, Math.max(100000, parseFloat(adj.loan_amount) || 0));
          }
          loanEmi = Math.max(0, parseFloat(adj.loan_emi || d.loan_emi) || 0);
          insuranceDeduction = Math.max(0, parseFloat(adj.insurance_deduction || d.insurance) || 0);
        }

        const totalSalary = (basic + hra + allowance + conveyance + medical) || currentSalary;
        if (totalSalary > 21000) {
          if (!mediclaim && esi) mediclaim = esi;
          esi = 0;
        } else {
          if (!esi && mediclaim) esi = mediclaim;
          mediclaim = 0;
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
        if (currentSalary <= 21000) {
          esi = Math.round(currentSalary * 0.0075);
          mediclaim = 0;
        } else {
          esi = 0;
          mediclaim = currentSalary > 25000 ? 750 : 500;
        }
        pt = currentSalary > 15000 ? 200 : 0;
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

      // Formula: (attendance + leaves + holidays - absents)
      const rawPaidDays = presentDays + leaveDays + holidayDays - absentDays;
      const paidDays = Math.max(0, Math.min(workingDays, rawPaidDays));
      const lopDays = Math.max(0, workingDays - paidDays);

      const totalFixed = basic + hra + allowance + conveyance + medical;
      const isEsiEligible = (totalFixed || currentSalary) <= 21000;
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

      const effectiveLop = savedData ? (parseFloat(savedData.lop_deduction) || 0) : calculatedLopAmount;

      const totalStatutory =
        (hasCustomStructure ? pf : (pf || Math.round(basic * 0.12))) +
        (isEsiEligible ? (hasCustomStructure ? esi : (esi || Math.round((totalFixed || currentSalary) * 0.0075))) : (hasCustomStructure ? mediclaim : (mediclaim || ((totalFixed || currentSalary) > 25000 ? 750 : 500)))) +
        (hasCustomStructure ? pt : (pt || (currentSalary > 15000 ? 200 : 0))) +
        (isPermanent ? insuranceDeduction : 0) +
        (isPermanent ? advanceDeduction : 0) +
        (isPermanent ? loanEmi : 0);

      return res.json({
        success: true,
        employee: {
          id: user.id,
          employee_code: user.employee_id,
          name: user.name,
          email: user.email,
          dept: user.dept || (emp && emp.dept) || "Engineering",
          designation: user.designation || (emp && emp.designation) || "Software Engineer",
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
            advance_amount: isPermanent ? advanceAmount : 0,
            advance_deduction: isPermanent ? advanceDeduction : 0,
            loan_amount: isPermanent ? loanAmount : 0,
            loan_emi: isPermanent ? loanEmi : 0,
            insurance_deduction: isPermanent ? insuranceDeduction : 0,
            gratuity_accrual: isPermanent ? gratuityAccrual : 0,
            total_gratuity: isPermanent ? totalGratuity : 0,
            tenure_years: tenureYears,
          },
          tax_deductions: {
            taxable_pay: Math.max(0, basic + hra + allowance + conveyance + medical - effectiveLop),
            tds: tds || 0,
            other_tax: it || 0,
            total_tax: (tds || 0) + (it || 0),
          },
          statutory_deductions: {
            pf: hasCustomStructure ? pf : (pf || Math.round(basic * 0.12)),
            esi: isEsiEligible ? (hasCustomStructure ? esi : (esi || Math.round((totalFixed || currentSalary) * 0.0075))) : 0,
            mediclaim: !isEsiEligible ? (hasCustomStructure ? mediclaim : (mediclaim || ((totalFixed || currentSalary) > 25000 ? 750 : 500))) : 0,
            pt: hasCustomStructure ? pt : (pt || (currentSalary > 15000 ? 200 : 0)),
            insurance: isPermanent ? insuranceDeduction : 0,
            advance_deduction: isPermanent ? advanceDeduction : 0,
            loan_emi: isPermanent ? loanEmi : 0,
            others: 0,
            total_statutory: totalStatutory,
          },
        },
        latest_salary_structure: {
          basic,
          hra,
          allowance,
          conveyance,
          medical,
          total_fixed: totalFixed,
          pf: hasCustomStructure ? pf : (pf || Math.round(basic * 0.12)),
          esi: isEsiEligible ? (hasCustomStructure ? esi : (esi || Math.round((totalFixed || currentSalary) * 0.0075))) : 0,
          mediclaim: !isEsiEligible ? (hasCustomStructure ? mediclaim : (mediclaim || ((totalFixed || currentSalary) > 25000 ? 750 : 500))) : 0,
          pt: hasCustomStructure ? pt : (pt || (currentSalary > 15000 ? 200 : 0)),
          insurance: isPermanent ? insuranceDeduction : 0,
          advance_deduction: isPermanent ? advanceDeduction : 0,
          loan_emi: isPermanent ? loanEmi : 0,
          tds: tds || 0,
          it: it || 0,
          lop: lop || 0,
        },
        has_structure_update: savedData
          ? Math.abs((savedData.fixed_pay?.total_fixed || 0) - (basic + hra + allowance + conveyance + medical)) > 1
          : false,
        saved_payroll: savedData,
        it_declaration: itDeclarationInfo,
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
      return res.json({ success: true, records });
    } catch (err) {
      console.error("Get all payrolls error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch payroll records" });
    }
  },
};

module.exports = PayrollController;
