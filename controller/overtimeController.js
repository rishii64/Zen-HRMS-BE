const {
  OvertimeTicket,
  Employee,
  Attendance,
  Schedule,
  Payroll,
  Notification,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");

// Helper to parse "HH:mm" or "HH:mm:ss" into minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

// Calculate standard hourly rate from monthly gross salary
// Standard labor convention: 26 working days * 8 hours = 208 working hours per month
const calculateHourlyRate = (monthlySalary) => {
  const grossMonthly = parseFloat(monthlySalary) || 0.0;
  if (grossMonthly <= 0) return 100.0; // fallback standard rate
  const standardMonthlyHours = 26 * 8; // 208 hours
  return parseFloat((grossMonthly / standardMonthlyHours).toFixed(2));
};

const OvertimeController = {
  // 1. GET ALL OVERTIME TICKETS (WITH RBAC, SEARCH, FILTERS & KPIS)
  getAllOvertimeTickets: async (req, res) => {
    try {
      const user = req.user || {};
      const userEmpId = String(user.employee_id || user.employee_code || user.id || "").trim();
      const userRole = String(user.role || "").toLowerCase().trim();
      const userName = String(user.name || user.userName || "").trim();

      const isExecutiveOrHR = [
        "hr",
        "admin",
        "management",
        "ceo",
        "coo",
        "hrmanager",
      ].includes(userRole);

      const isManagerOrHod = [
        "hod",
        "manager",
        "teamlead",
      ].includes(userRole) || (user.designation || "").toLowerCase().includes("manager") || (user.designation || "").toLowerCase().includes("head");

      const {
        status,
        payout_status,
        month,
        employee_id,
        search,
        page = 1,
        limit = 50,
      } = req.query;

      const where = {};

      // Filter by status
      if (status && status !== "All") {
        where.status = status;
      }

      // Filter by payout status
      if (payout_status && payout_status !== "All") {
        where.payout_status = payout_status;
      }

      // Filter by month (attendance_date BETWEEN YYYY-MM-01 and YYYY-MM-LastDay)
      if (month && month !== "All") {
        const parts = String(month).trim().split("-");
        if (parts.length === 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(y) && !isNaN(m)) {
            const lastDay = new Date(y, m, 0).getDate();
            const startMonthStr = `${parts[0]}-${String(m).padStart(2, "0")}-01`;
            const endMonthStr = `${parts[0]}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
            where.attendance_date = {
              [Op.between]: [startMonthStr, endMonthStr],
            };
          }
        }
      }

      // Filter by specific employee
      if (employee_id) {
        where.employee_id = employee_id;
      }

      // Role-based visibility scoping:
      // Regular employees can only see their own OT tickets.
      // Reporting managers can see tickets where reporting_manager matches their name/ID, their department, or their own tickets.
      // HR/Admin can see all tickets across the entire organization.
      if (!isExecutiveOrHR) {
        if (isManagerOrHod) {
          where[Op.or] = [
            { employee_id: userEmpId },
            { reporting_manager_id: userEmpId },
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("OvertimeTicket.reporting_manager")),
              "LIKE",
              `%${userName.toLowerCase()}%`
            ),
          ];
        } else {
          where.employee_id = userEmpId;
        }
      }

      // Search filter
      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`;
        const searchConditions = [
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("OvertimeTicket.ticket_number")),
            "LIKE",
            q
          ),
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("OvertimeTicket.employee_name")),
            "LIKE",
            q
          ),
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("OvertimeTicket.employee_id")),
            "LIKE",
            q
          ),
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("OvertimeTicket.department")),
            "LIKE",
            q
          ),
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("OvertimeTicket.reason_for_ot")),
            "LIKE",
            q
          ),
        ];

        if (where[Op.or]) {
          where[Op.and] = [{ [Op.or]: searchConditions }];
        } else {
          where[Op.or] = searchConditions;
        }
      }

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const { rows: tickets, count: totalCount } =
        await OvertimeTicket.findAndCountAll({
          where,
          order: [["created_at", "DESC"]],
          limit: parseInt(limit, 10),
          offset,
        });

      // KPI Aggregation for Dashboard Header
      const statsQueryWhere = isExecutiveOrHR
        ? {}
        : isManagerOrHod
        ? {
            [Op.or]: [
              { employee_id: userEmpId },
              { reporting_manager_id: userEmpId },
              sequelize.where(
                sequelize.fn("LOWER", sequelize.col("OvertimeTicket.reporting_manager")),
                "LIKE",
                `%${userName.toLowerCase()}%`
              ),
            ],
          }
        : { employee_id: userEmpId };

      if (where.attendance_date) {
        statsQueryWhere.attendance_date = where.attendance_date;
      }

      const allStatsRecords = await OvertimeTicket.findAll({
        where: statsQueryWhere,
        attributes: [
          "status",
          "payout_status",
          "overtime_hours",
          "approved_hours",
          "estimated_payout",
          "approved_payout",
          "hourly_rate",
        ],
      });

      let totalOtHours = 0;
      let totalApprovedHours = 0;
      let totalEstimatedPayout = 0;
      let totalApprovedPayout = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      let syncedPayrollCount = 0;

      allStatsRecords.forEach((t) => {
        const estH = parseFloat(t.overtime_hours) || 0;
        const appH = parseFloat(t.approved_hours || t.overtime_hours) || 0;
        const estP = parseFloat(t.estimated_payout) || 0;
        const appP = parseFloat(t.approved_payout || t.estimated_payout) || 0;

        totalOtHours += estH;
        totalEstimatedPayout += estP;

        if (t.status === "Pending") pendingCount++;
        if (t.status === "Approved") {
          approvedCount++;
          totalApprovedHours += appH;
          totalApprovedPayout += appP;
        }
        if (t.status === "Rejected") rejectedCount++;
        if (t.payout_status === "Synced to Payroll" || t.payout_status === "Paid") {
          syncedPayrollCount++;
        }
      });

      const avgRate =
        allStatsRecords.length > 0
          ? (
              allStatsRecords.reduce(
                (sum, r) => sum + (parseFloat(r.hourly_rate) || 0),
                0
              ) / allStatsRecords.length
            ).toFixed(2)
          : "0.00";

      const stats = {
        total: allStatsRecords.length,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total_ot_hours: parseFloat(totalOtHours.toFixed(2)),
        total_approved_hours: parseFloat(totalApprovedHours.toFixed(2)),
        total_estimated_payout: parseFloat(totalEstimatedPayout.toFixed(2)),
        total_approved_payout: parseFloat(totalApprovedPayout.toFixed(2)),
        synced_to_payroll: syncedPayrollCount,
        avg_hourly_rate: avgRate,
      };

      return res.status(200).json({
        success: true,
        data: tickets,
        stats,
        total: totalCount,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
    } catch (err) {
      console.error("Error in getAllOvertimeTickets:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 2. DETECT HOURS WORKED BEYOND SHIFT END (AUTOMATIC OVERTIME SCANNER)
  getEligibleOvertimeShifts: async (req, res) => {
    try {
      const user = req.user || {};
      const targetEmpId = String(
        req.query.employee_id || user.employee_id || user.employee_code || user.id || ""
      ).trim();

      if (!targetEmpId) {
        return res
          .status(400)
          .json({ success: false, message: "Target Employee ID is required" });
      }

      // Fetch employee profile to obtain salary and reporting manager
      const emp = await Employee.findOne({ where: { employee_id: targetEmpId } });
      if (!emp) {
        return res
          .status(404)
          .json({ success: false, message: "Employee profile not found" });
      }

      const hourlyRate = calculateHourlyRate(emp.current_salary);

      // Determine date range:
      // If month parameter provided (e.g. "2026-11"), scope to that calendar month.
      // Otherwise, default to the active cycle (last 30 days up to today).
      const { month } = req.query;
      let dateCondition = {};

      if (month && month !== "All") {
        const [yearStr, monthStr] = month.split("-");
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        if (!isNaN(y) && !isNaN(m)) {
          const lastDay = new Date(y, m, 0).getDate();
          const startMonthStr = `${month}-01`;
          const endMonthStr = `${month}-${String(lastDay).padStart(2, "0")}`;
          dateCondition = { [Op.between]: [startMonthStr, endMonthStr] };
        }
      } else {
        const now = new Date();
        const past30 = new Date();
        past30.setDate(now.getDate() - 30);
        const startStr = past30.toISOString().split("T")[0];
        const todayStr = now.toISOString().split("T")[0];
        dateCondition = { [Op.between]: [startStr, todayStr] };
      }

      // Fetch attendance records with check_out within active date range
      const attendanceLogs = await Attendance.findAll({
        where: {
          employee_id: targetEmpId,
          date: dateCondition,
          check_out: { [Op.ne]: null },
        },
        order: [["date", "DESC"]],
      });

      // Fetch schedules for employee in this date range
      const schedules = await Schedule.findAll({
        where: {
          employee_id: targetEmpId,
          date: dateCondition,
        },
      });

      const scheduleMap = {};
      schedules.forEach((s) => {
        scheduleMap[s.date] = s;
      });

      // Fetch already submitted tickets for this employee to prevent duplicates
      const existingTickets = await OvertimeTicket.findAll({
        where: {
          employee_id: targetEmpId,
          attendance_date: dateCondition,
        },
      });

      const ticketMap = {};
      existingTickets.forEach((t) => {
        ticketMap[t.attendance_date] = t;
      });

      const detectedShifts = [];

      attendanceLogs.forEach((att) => {
        const attDate = att.date;
        const sched = scheduleMap[attDate];

        // Standard shift defaults: 10:00 to 19:00 (9 hours total, 8 hours standard work)
        const shiftStart = sched?.start_time || "10:00";
        const shiftEnd = sched?.end_time || "19:00";
        const shiftName = sched?.shift_name || "General Shift";

        const checkInTime = att.check_in || shiftStart;
        const checkOutTime = att.check_out;

        const checkOutMins = parseTimeToMinutes(checkOutTime);
        const shiftEndMins = parseTimeToMinutes(shiftEnd);
        const totalWorkHours = parseFloat(att.work_hours) || 0.0;

        // Glitch & Anomaly Filter:
        // Ignore corrupted rollover records (work hours > 14.0 or <= 0.5)
        if (totalWorkHours > 14.0 || totalWorkHours < 0.5) return;

        let otMinutes = 0;

        // Genuine Overtime Requirement:
        // 1. Employee must have punched out after shift end
        // 2. Employee must have worked at least the standard 8.0 hours
        if (checkOutMins !== null && shiftEndMins !== null && checkOutMins > shiftEndMins && totalWorkHours >= 8.0) {
          const otByClock = checkOutMins - shiftEndMins;
          const otByWorkHours = Math.round((totalWorkHours - 8.0) * 60);
          // Overtime is bounded by both clock and total work hours
          otMinutes = Math.min(otByClock, otByWorkHours);
        }

        // Only register if overtime is at least 15 minutes (0.25 hrs threshold)
        // and cap daily overtime at 6.0 hours (360 minutes max)
        if (otMinutes >= 15) {
          otMinutes = Math.min(otMinutes, 360);
          const otHours = parseFloat((otMinutes / 60).toFixed(2));
          const otMultiplier = 1.5; // standard 1.5x rate
          const estimatedPayout = parseFloat((otHours * hourlyRate * otMultiplier).toFixed(2));

          const existingTicket = ticketMap[attDate];
          const hasTicket = Boolean(existingTicket);

          detectedShifts.push({
            attendance_id: att.id,
            attendance_date: attDate,
            employee_id: targetEmpId,
            employee_name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name,
            department: emp.dept || "General",
            designation: emp.designation || "Staff",
            shift_name: shiftName,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            check_in: checkInTime,
            check_out: checkOutTime,
            total_work_hours: totalWorkHours,
            standard_hours: 8.0,
            overtime_minutes: otMinutes,
            overtime_hours: otHours,
            hourly_rate: hourlyRate,
            ot_multiplier: otMultiplier,
            estimated_payout: estimatedPayout,
            reporting_manager: emp.reporting_manager || "Management",
            has_ticket: hasTicket,
            is_already_ticketed: hasTicket, // for frontend compatibility
            ticket_id: existingTicket?.id || null,
            ticket_number: existingTicket?.ticket_number || null,
            ticket_status: existingTicket?.status || null,
            payout_status: existingTicket?.payout_status || null,
          });
        }
      });

      return res.status(200).json({
        success: true,
        data: detectedShifts,
        total_detected: detectedShifts.length,
        unclaimed_count: detectedShifts.filter((s) => !s.has_ticket).length,
      });
    } catch (err) {
      console.error("Error in getEligibleOvertimeShifts:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 3. CREATE / RAISE AN OVERTIME APPROVAL TICKET
  createOvertimeTicket: async (req, res) => {
    try {
      const user = req.user || {};
      const {
        employee_id,
        attendance_date,
        shift_name = "General Shift",
        shift_start = "10:00",
        shift_end = "19:00",
        check_in,
        check_out,
        total_work_hours,
        standard_hours = 8.0,
        overtime_hours,
        reason_for_ot,
        task_description,
        ot_multiplier = 1.5,
      } = req.body;

      const empId = String(
        employee_id || user.employee_id || user.employee_code || user.id || ""
      ).trim();

      if (!empId || !attendance_date || !overtime_hours || !reason_for_ot) {
        return res.status(400).json({
          success: false,
          message:
            "Employee ID, Attendance Date, Overtime Hours, and Reason for OT are required",
        });
      }

      // Check if ticket already exists for this date
      const existing = await OvertimeTicket.findOne({
        where: {
          employee_id: empId,
          attendance_date,
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `An overtime ticket (${existing.ticket_number}) is already on record for ${attendance_date} with status: ${existing.status}`,
        });
      }

      // Fetch employee profile
      const emp = await Employee.findOne({ where: { employee_id: empId } });
      if (!emp) {
        return res
          .status(404)
          .json({ success: false, message: `Employee ${empId} not found` });
      }

      const empFullName =
        `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name || empId;

      const hourlyRate = calculateHourlyRate(emp.current_salary);
      const otHoursNum = parseFloat(overtime_hours) || 0.0;
      const multiplierNum = parseFloat(ot_multiplier) || 1.5;
      const estimatedPayout = parseFloat(
        (otHoursNum * hourlyRate * multiplierNum).toFixed(2)
      );
      const overtimeMinutes = Math.round(otHoursNum * 60);

      // Generate Ticket Number: OT-YYYY-XXXX
      const currentYear = new Date().getFullYear();
      const count = await OvertimeTicket.count();
      const ticket_number = `OT-${currentYear}-${String(count + 1).padStart(4, "0")}`;

      // Resolve Reporting Manager
      const reportingManagerName = emp.reporting_manager || "Management";

      // Attempt to find reporting manager's employee_id
      let reportingManagerId = null;
      try {
        const mgrRecord = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn(
              "LOWER",
              sequelize.fn(
                "CONCAT",
                sequelize.col("first_name"),
                " ",
                sequelize.col("last_name")
              )
            ),
            "LIKE",
            `%${reportingManagerName.toLowerCase().trim()}%`
          ),
        });
        if (mgrRecord) {
          reportingManagerId = mgrRecord.employee_id;
        }
      } catch (_) {}

      const newTicket = await OvertimeTicket.create({
        ticket_number,
        employee_id: empId,
        employee_name: empFullName,
        department: emp.dept || "General",
        designation: emp.designation || "Staff",
        attendance_date,
        shift_name,
        shift_start,
        shift_end,
        check_in: check_in || shift_start,
        check_out: check_out || shift_end,
        total_work_hours: parseFloat(total_work_hours) || 8.0 + otHoursNum,
        standard_hours: parseFloat(standard_hours) || 8.0,
        overtime_hours: otHoursNum,
        overtime_minutes: overtimeMinutes,
        hourly_rate: hourlyRate,
        ot_multiplier: multiplierNum,
        estimated_payout: estimatedPayout,
        reason_for_ot,
        task_description: task_description || "",
        reporting_manager: reportingManagerName,
        reporting_manager_id: reportingManagerId,
        status: "Pending",
        payout_status: "Unpaid",
      });

      // Send In-App Notification to Reporting Manager and HR
      try {
        await Notification.create({
          recipient_id: reportingManagerId || "ALL",
          recipient_role: "manager",
          title: `Overtime Approval Request: ${empFullName}`,
          message: `${empFullName} raised OT ticket ${ticket_number} for ${otHoursNum} hrs beyond shift on ${attendance_date}. Reason: ${reason_for_ot}`,
          type: "overtime",
          category: "Approvals",
          link: "/overtime",
          priority: "high",
          source_module: "overtime",
        });
      } catch (notifErr) {
        console.warn("Could not send OT ticket notification:", notifErr.message);
      }

      return res.status(201).json({
        success: true,
        message: `Overtime ticket ${ticket_number} raised successfully and routed to ${reportingManagerName}`,
        data: newTicket,
      });
    } catch (err) {
      console.error("Error in createOvertimeTicket:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 4. REPORTING MANAGER REVIEW & DECISION (APPROVE OR REJECT WITH COMMENTS)
  reviewOvertimeTicket: async (req, res) => {
    try {
      const user = req.user || {};
      const { id } = req.params;
      const { action, approved_hours, manager_remarks } = req.body;

      if (!["Approved", "Rejected"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Action must be either 'Approved' or 'Rejected'",
        });
      }

      const ticket = await OvertimeTicket.findByPk(id);
      if (!ticket) {
        return res
          .status(404)
          .json({ success: false, message: "Overtime ticket not found" });
      }

      if (action === "Rejected" && (!manager_remarks || !manager_remarks.trim())) {
        return res.status(400).json({
          success: false,
          message: "Please provide proper feedback or comments when rejecting overtime",
        });
      }

      const reviewerId = String(user.employee_id || user.id || "MGR-01");
      const reviewerName = user.name || user.userName || "Reporting Manager";

      const updatePayload = {
        status: action,
        reviewed_by: reviewerId,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date(),
        manager_remarks: manager_remarks ? manager_remarks.trim() : "",
      };

      if (action === "Approved") {
        const finalHours =
          approved_hours !== undefined && parseFloat(approved_hours) > 0
            ? parseFloat(approved_hours)
            : parseFloat(ticket.overtime_hours);

        const finalPayout = parseFloat(
          (
            finalHours *
            parseFloat(ticket.hourly_rate) *
            parseFloat(ticket.ot_multiplier)
          ).toFixed(2)
        );

        updatePayload.approved_hours = finalHours;
        updatePayload.approved_payout = finalPayout;
      } else {
        updatePayload.approved_hours = 0.0;
        updatePayload.approved_payout = 0.0;
      }

      await ticket.update(updatePayload);

      // Send In-App Notification to the Employee with decision and comments
      try {
        const isApp = action === "Approved";
        const title = isApp
          ? `Overtime Request Approved! (${ticket.ticket_number})`
          : `Overtime Request Rejected (${ticket.ticket_number})`;

        const message = isApp
          ? `Your overtime request for ${ticket.attendance_date} has been approved for ${ticket.approved_hours} hrs (₹${ticket.approved_payout}). Remarks: ${ticket.manager_remarks || "Approved"}`
          : `Your overtime request for ${ticket.attendance_date} was rejected. Manager comments: ${ticket.manager_remarks}`;

        await Notification.create({
          recipient_id: ticket.employee_id,
          title,
          message,
          type: "overtime",
          category: isApp ? "Approvals" : "General",
          link: "/overtime",
          priority: isApp ? "high" : "normal",
          source_module: "overtime",
        });
      } catch (notifErr) {
        console.warn("Could not notify employee about OT decision:", notifErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Overtime ticket ${ticket.ticket_number} marked as ${action}`,
        data: ticket,
      });
    } catch (err) {
      console.error("Error in reviewOvertimeTicket:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 5. SYNC APPROVED OVERTIME WITH PAYROLL MODULE
  syncOvertimeWithPayroll: async (req, res) => {
    try {
      const { month_year, employee_id } = req.body;

      if (!month_year) {
        return res
          .status(400)
          .json({ success: false, message: "Payroll Month (e.g. 2026-11) is required" });
      }

      // Query all Approved OT tickets for that month
      let dateCondition;
      const parts = String(month_year).trim().split("-");
      if (parts.length === 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          const lastDay = new Date(y, m, 0).getDate();
          const startMonthStr = `${parts[0]}-${String(m).padStart(2, "0")}-01`;
          const endMonthStr = `${parts[0]}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
          dateCondition = { [Op.between]: [startMonthStr, endMonthStr] };
        }
      }
      if (!dateCondition) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid month format. Expected YYYY-MM" });
      }

      const where = {
        status: "Approved",
        attendance_date: dateCondition,
      };

      if (employee_id) {
        where.employee_id = employee_id;
      }

      const approvedTickets = await OvertimeTicket.findAll({ where });

      if (approvedTickets.length === 0) {
        return res.status(200).json({
          success: true,
          message: `No approved overtime tickets found for ${month_year} to sync`,
          synced_count: 0,
          total_payout: 0,
        });
      }

      // Group tickets by employee
      const employeeOtMap = {};
      approvedTickets.forEach((t) => {
        if (!employeeOtMap[t.employee_id]) {
          employeeOtMap[t.employee_id] = {
            total_hours: 0,
            total_payout: 0,
            tickets: [],
          };
        }
        const hrs = parseFloat(t.approved_hours || t.overtime_hours) || 0;
        const payout = parseFloat(t.approved_payout || t.estimated_payout) || 0;
        employeeOtMap[t.employee_id].total_hours += hrs;
        employeeOtMap[t.employee_id].total_payout += payout;
        employeeOtMap[t.employee_id].tickets.push(t);
      });

      let updatedPayrollsCount = 0;
      let grandTotalOtPayout = 0;

      for (const [empCode, otData] of Object.entries(employeeOtMap)) {
        grandTotalOtPayout += otData.total_payout;

        // Find or check Payroll record for that employee and month
        const payrollRecord = await Payroll.findOne({
          where: {
            employee_id: empCode,
            month_year: { [Op.like]: `%${month_year}%` },
          },
        });

        if (payrollRecord) {
          let varPay = {};
          try {
            varPay =
              typeof payrollRecord.variable_pay === "string"
                ? JSON.parse(payrollRecord.variable_pay)
                : payrollRecord.variable_pay || {};
          } catch (_) {}

          varPay.overtime_hours = parseFloat(otData.total_hours.toFixed(2));
          varPay.overtime = parseFloat(otData.total_payout.toFixed(2));

          const bonus = parseFloat(varPay.bonus) || 0;
          const incentive = parseFloat(varPay.incentive) || 0;
          const reimbursement = parseFloat(varPay.reimbursement) || 0;
          varPay.total_variable = parseFloat(
            (bonus + incentive + reimbursement + varPay.overtime).toFixed(2)
          );

          let fixedPay = {};
          try {
            fixedPay =
              typeof payrollRecord.fixed_pay === "string"
                ? JSON.parse(payrollRecord.fixed_pay)
                : payrollRecord.fixed_pay || {};
          } catch (_) {}

          const totalFixed = parseFloat(fixedPay.total_fixed) || parseFloat(payrollRecord.gross_pay) || 0;
          const newGross = parseFloat((totalFixed + varPay.total_variable).toFixed(2));
          const totalDeds = parseFloat(payrollRecord.total_deductions) || 0;
          const newNet = Math.max(0, parseFloat((newGross - totalDeds).toFixed(2)));

          await payrollRecord.update({
            variable_pay: JSON.stringify(varPay),
            gross_pay: newGross,
            net_salary: newNet,
          });

          updatedPayrollsCount++;
        }

        // Mark tickets as Synced
        for (const t of otData.tickets) {
          await t.update({
            payout_status: "Synced to Payroll",
            payroll_month: month_year,
            synced_at: new Date(),
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Successfully synchronized ${approvedTickets.length} approved OT ticket(s) across ${Object.keys(employeeOtMap).length} employee(s) for ${month_year} (Total: ₹${grandTotalOtPayout.toLocaleString("en-IN")})`,
        synced_count: approvedTickets.length,
        updated_payrolls: updatedPayrollsCount,
        total_payout: parseFloat(grandTotalOtPayout.toFixed(2)),
      });
    } catch (err) {
      console.error("Error in syncOvertimeWithPayroll:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 6. DELETE TICKET (ONLY DRAFT/PENDING BY OWNER OR HR)
  deleteOvertimeTicket: async (req, res) => {
    try {
      const { id } = req.params;
      const ticket = await OvertimeTicket.findByPk(id);
      if (!ticket) {
        return res
          .status(404)
          .json({ success: false, message: "Overtime ticket not found" });
      }

      if (ticket.status === "Approved") {
        return res.status(400).json({
          success: false,
          message: "Approved overtime tickets cannot be deleted directly",
        });
      }

      await ticket.destroy();
      return res.status(200).json({
        success: true,
        message: `Overtime ticket ${ticket.ticket_number} deleted successfully`,
      });
    } catch (err) {
      console.error("Error in deleteOvertimeTicket:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = OvertimeController;

