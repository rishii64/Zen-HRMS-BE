const { Op } = require("sequelize");
const {
  AttendanceRegularization,
  Attendance,
  Employee,
  User,
  Notification,
  sequelize,
} = require("../config/db");
const { getISTDateStr } = require("../utils/timezone");

// Roles permitted to review & approve regularizations
const HR_AND_MANAGEMENT_ROLES = [
  "hr",
  "admin",
  "hod",
  "manager",
  "teamlead",
  "ceo",
  "coo",
  "hrmanager",
  "accounts",
  "payroll",
];

const verifyApprovalAccess = (req, res) => {
  const role = (req.user?.role || "").toLowerCase().trim();
  if (!HR_AND_MANAGEMENT_ROLES.includes(role)) {
    res.status(403).json({
      success: false,
      error: "Access denied. Attendance regularizations and reversals are managed by HR and authorized leads.",
    });
    return false;
  }
  return true;
};

// Helper: Calculate decimal hours between "HH:MM" and "HH:MM"
const calculateHoursBetween = (inStr, outStr) => {
  if (!inStr || !outStr) return 9.0;
  try {
    const [inH, inM] = inStr.split(":").map(Number);
    const [outH, outM] = outStr.split(":").map(Number);
    if (isNaN(inH) || isNaN(outH)) return 9.0;

    let diffMinutes = (outH * 60 + (inM ? inM : 0)) - (inH * 60 + (inM ? inM : 0));
    // If night shift crosses midnight
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    const hours = diffMinutes / 60;
    return parseFloat(Math.max(0, hours).toFixed(2));
  } catch {
    return 9.0;
  }
};

/**
 * 1. Helper: Lookup current punch on a selected date
 */
exports.getAttendanceForDate = async (req, res) => {
  try {
    const employee_id = req.query.employee_id || req.user?.employee_id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, error: "Date is required." });
    }

    const att = await Attendance.findOne({
      where: {
        employee_id: { [Op.iLike]: (employee_id || "").trim() },
        date: date.trim(),
      },
      raw: true,
    });

    return res.status(200).json({
      success: true,
      exists: Boolean(att),
      data: att
        ? {
            id: att.id,
            check_in: att.check_in || "—",
            check_out: att.check_out || "—",
            work_hours: att.work_hours || 0,
            status: att.status || "Present",
            notes: att.notes || "",
            late_count: att.late_count || 0,
          }
        : null,
    });
  } catch (error) {
    console.error("Error looking up attendance date:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to look up attendance date: " + error.message,
    });
  }
};

/**
 * 2. Employee: Submit Attendance Regularization & Reversal Request
 */
exports.applyRegularization = async (req, res) => {
  try {
    const employee_id = req.user?.employee_id;
    const employee_name = req.user?.name || "Staff Member";
    const department = req.user?.dept || "General";

    if (!employee_id) {
      return res.status(401).json({
        success: false,
        error: "Authenticated employee profile not found.",
      });
    }

    const {
      attendance_date,
      request_type = "MISSED_PUNCH",
      requested_check_in = "09:30",
      requested_check_out = "18:30",
      requested_status = "Present",
      reason,
    } = req.body || {};

    if (!attendance_date) {
      return res.status(400).json({
        success: false,
        error: "Attendance date is mandatory.",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: "Please provide a clear reason for the attendance discrepancy or missed punch.",
      });
    }

    const todayIST = getISTDateStr();
    if (attendance_date > todayIST) {
      return res.status(400).json({
        success: false,
        error: "You cannot request regularization for future dates.",
      });
    }

    // Check if a PENDING request already exists for this employee and date
    const pendingExisting = await AttendanceRegularization.findOne({
      where: {
        employee_id: { [Op.iLike]: employee_id.trim() },
        attendance_date: attendance_date.trim(),
        status: "PENDING",
      },
    });

    if (pendingExisting) {
      return res.status(400).json({
        success: false,
        error: `A pending regularization request (${pendingExisting.request_no}) already exists for ${attendance_date}. Please await HR review.`,
      });
    }

    // Lookup existing attendance punch record if any
    const existingAtt = await Attendance.findOne({
      where: {
        employee_id: { [Op.iLike]: employee_id.trim() },
        date: attendance_date.trim(),
      },
    });

    const calculatedHours = calculateHoursBetween(requested_check_in, requested_check_out);

    // Optional supporting proof file
    let supportingDocUrl = null;
    if (req.file) {
      supportingDocUrl = `/uploads/${req.file.filename}`;
    }

    // Generate unique request number
    const requestNo = `REG-${Date.now().toString().slice(-6)}`;

    const newRequest = await AttendanceRegularization.create({
      request_no: requestNo,
      employee_id: employee_id.trim(),
      employee_name: employee_name.trim(),
      department: department.trim(),
      attendance_date: attendance_date.trim(),
      request_type,
      original_check_in: existingAtt?.check_in || "—",
      original_check_out: existingAtt?.check_out || "—",
      original_status: existingAtt?.status || "Absent",
      requested_check_in: requested_check_in.trim(),
      requested_check_out: requested_check_out.trim(),
      requested_status: requested_status.trim(),
      calculated_work_hours: calculatedHours,
      reason: reason.trim(),
      supporting_doc_url: supportingDocUrl,
      status: "PENDING",
      attendance_id: existingAtt?.id || null,
    });

    // Notify HR / Admins
    try {
      if (Notification) {
        await Notification.create({
          user_id: "HR",
          title: "New Attendance Regularization Request",
          message: `${employee_name} (${employee_id}) requested regularization for ${attendance_date}: "${reason.slice(0, 80)}"`,
          type: "ATTENDANCE_REGULARIZATION",
          link: "/attendance-regularization",
          status: "UNREAD",
        });
      }
    } catch {
      // Non-blocking notification
    }

    return res.status(201).json({
      success: true,
      message: "Attendance regularization request submitted to HR successfully.",
      data: newRequest,
    });
  } catch (error) {
    console.error("Error submitting attendance regularization:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to submit regularization request: " + error.message,
    });
  }
};

/**
 * 3. Employee: Get My Submitted Regularization Requests
 */
exports.getMyRegularizations = async (req, res) => {
  try {
    const employee_id = req.user?.employee_id;
    if (!employee_id) {
      return res.status(401).json({ success: false, error: "Unauthorized employee." });
    }

    const { status } = req.query;
    const where = {
      employee_id: { [Op.iLike]: employee_id.trim() },
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    const requests = await AttendanceRegularization.findAll({
      where,
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    // Compute stats
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    const reversed = requests.filter((r) => r.status === "REVERSED").length;

    return res.status(200).json({
      success: true,
      data: requests,
      stats: { total, pending, approved, rejected, reversed },
    });
  } catch (error) {
    console.error("Error fetching my regularizations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load regularization requests: " + error.message,
    });
  }
};

/**
 * 4. HR / Lead: Get All Regularization Requests Across Organization
 */
exports.getAllRegularizations = async (req, res) => {
  try {
    if (!verifyApprovalAccess(req, res)) return;

    const { status, search, department, startDate, endDate, limit = 50, page = 1 } = req.query;
    const userRole = (req.user?.role || "").toLowerCase().trim();
    const userDept = req.user?.dept;

    const where = {};

    // HOD / Lead scope restriction: only see own department unless HR / Admin
    if (userRole === "hod" || userRole === "manager") {
      if (userDept && userDept !== "General" && userDept !== "All") {
        where.department = userDept;
      }
    } else if (department && department !== "All") {
      where.department = department;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (startDate && endDate) {
      where.attendance_date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.attendance_date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.attendance_date = { [Op.lte]: endDate };
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { employee_id: { [Op.iLike]: q } },
        { employee_name: { [Op.iLike]: q } },
        { request_no: { [Op.iLike]: q } },
        { reason: { [Op.iLike]: q } },
      ];
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const { count, rows } = await AttendanceRegularization.findAndCountAll({
      where,
      order: [
        // Pending first, then newest
        [sequelize.literal("CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END"), "ASC"],
        ["createdAt", "DESC"],
      ],
      limit: parseInt(limit, 10),
      offset,
      raw: true,
    });

    // Count stats across all
    const baseStatsWhere = (userRole === "hod" || userRole === "manager") && userDept && userDept !== "All"
      ? { department: userDept }
      : {};

    const pendingCount = await AttendanceRegularization.count({ where: { ...baseStatsWhere, status: "PENDING" } });
    const approvedCount = await AttendanceRegularization.count({ where: { ...baseStatsWhere, status: "APPROVED" } });
    const rejectedCount = await AttendanceRegularization.count({ where: { ...baseStatsWhere, status: "REJECTED" } });
    const reversedCount = await AttendanceRegularization.count({ where: { ...baseStatsWhere, status: "REVERSED" } });
    const totalCount = await AttendanceRegularization.count({ where: baseStatsWhere });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / parseInt(limit, 10)),
      },
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        reversed: reversedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching all regularizations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load regularizations desk: " + error.message,
    });
  }
};

/**
 * 5. HR / Manager: Approve Regularization & Sync Attendance Record
 */
exports.approveRegularization = async (req, res) => {
  try {
    if (!verifyApprovalAccess(req, res)) return;

    const { id } = req.params;
    const { review_remarks } = req.body || {};

    const reg = await AttendanceRegularization.findByPk(id);
    if (!reg) {
      return res.status(404).json({ success: false, error: "Regularization request not found." });
    }

    if (reg.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: `Cannot approve. This request is already marked as ${reg.status}.`,
      });
    }

    const reviewerName = req.user?.name || "HR Administrator";
    const reviewerId = req.user?.id ? String(req.user.id) : "HR";
    const todayStr = getISTDateStr();

    // 1. Update Regularization Record
    await reg.update({
      status: "APPROVED",
      reviewed_by_id: reviewerId,
      reviewed_by_name: reviewerName,
      reviewed_at: new Date(),
      review_remarks: review_remarks ? review_remarks.trim() : "Approved and regularized by HR.",
    });

    // 2. Synchronize / Insert / Update Attendance Record
    const calcHours = calculateHoursBetween(reg.requested_check_in, reg.requested_check_out);
    const auditNote = `[Regularized by ${reviewerName} on ${todayStr}: ${reg.request_type.replace(/_/g, " ")}]`;

    let attendanceRecord = null;
    if (reg.attendance_id) {
      attendanceRecord = await Attendance.findByPk(reg.attendance_id);
    }
    if (!attendanceRecord) {
      attendanceRecord = await Attendance.findOne({
        where: {
          employee_id: { [Op.iLike]: reg.employee_id.trim() },
          date: reg.attendance_date,
        },
      });
    }

    if (attendanceRecord) {
      const existingNotes = attendanceRecord.notes || "";
      const updatedNotes = existingNotes
        ? `${existingNotes} | ${auditNote}`
        : auditNote;

      await attendanceRecord.update({
        check_in: reg.requested_check_in,
        check_out: reg.requested_check_out,
        work_hours: calcHours,
        status: reg.requested_status || "Present",
        late_count: 0,
        notes: updatedNotes,
      });
    } else {
      // Find employee details to populate name and dept
      const emp = await Employee.findOne({
        where: { employee_id: { [Op.iLike]: reg.employee_id.trim() } },
      });

      attendanceRecord = await Attendance.create({
        employee_id: reg.employee_id.trim(),
        name: emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || reg.employee_name : reg.employee_name,
        dept: emp?.dept || reg.department || "General",
        date: reg.attendance_date,
        check_in: reg.requested_check_in,
        check_out: reg.requested_check_out,
        work_hours: calcHours,
        status: reg.requested_status || "Present",
        late_count: 0,
        notes: auditNote,
      });

      await reg.update({ attendance_id: attendanceRecord.id });
    }

    // 3. Send Notification to Employee
    try {
      if (Notification) {
        await Notification.create({
          user_id: reg.employee_id,
          title: "Attendance Regularization Approved",
          message: `Your attendance for ${reg.attendance_date} has been regularized as ${reg.requested_status || "Present"} (${reg.requested_check_in} - ${reg.requested_check_out}) by ${reviewerName}.`,
          type: "ATTENDANCE_REGULARIZATION",
          link: "/attendance",
          status: "UNREAD",
        });
      }
    } catch {
      // Non-blocking notification
    }

    return res.status(200).json({
      success: true,
      message: `Regularization request ${reg.request_no} approved. Attendance record for ${reg.attendance_date} updated successfully.`,
      data: reg,
      attendance: attendanceRecord,
    });
  } catch (error) {
    console.error("Error approving regularization:", error);
    return res.status(500).json({
      success: false,
      error: "Approval failed: " + error.message,
    });
  }
};

/**
 * 6. HR / Manager: Reject Regularization Request
 */
exports.rejectRegularization = async (req, res) => {
  try {
    if (!verifyApprovalAccess(req, res)) return;

    const { id } = req.params;
    const { review_remarks } = req.body || {};

    if (!review_remarks || !review_remarks.trim()) {
      return res.status(400).json({
        success: false,
        error: "A clear rejection reason must be provided.",
      });
    }

    const reg = await AttendanceRegularization.findByPk(id);
    if (!reg) {
      return res.status(404).json({ success: false, error: "Regularization request not found." });
    }

    if (reg.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: `Cannot reject. Request is already marked as ${reg.status}.`,
      });
    }

    const reviewerName = req.user?.name || "HR Administrator";
    const reviewerId = req.user?.id ? String(req.user.id) : "HR";

    await reg.update({
      status: "REJECTED",
      reviewed_by_id: reviewerId,
      reviewed_by_name: reviewerName,
      reviewed_at: new Date(),
      review_remarks: review_remarks.trim(),
    });

    // Notify Employee
    try {
      if (Notification) {
        await Notification.create({
          user_id: reg.employee_id,
          title: "Attendance Regularization Rejected",
          message: `Your regularization request for ${reg.attendance_date} was rejected by ${reviewerName}. Reason: ${review_remarks}`,
          type: "ATTENDANCE_REGULARIZATION",
          link: "/attendance-regularization",
          status: "UNREAD",
        });
      }
    } catch {
      // Non-blocking notification
    }

    return res.status(200).json({
      success: true,
      message: `Regularization request ${reg.request_no} rejected.`,
      data: reg,
    });
  } catch (error) {
    console.error("Error rejecting regularization:", error);
    return res.status(500).json({
      success: false,
      error: "Rejection failed: " + error.message,
    });
  }
};

/**
 * 7. HR: Reverse Attendance Discrepancy / Revert Regularization
 */
exports.reverseAttendance = async (req, res) => {
  try {
    if (!verifyApprovalAccess(req, res)) return;

    const { id } = req.params;
    const { reversal_target_status = "Absent", reversal_notes } = req.body || {};

    const reg = await AttendanceRegularization.findByPk(id);
    if (!reg) {
      return res.status(404).json({ success: false, error: "Regularization record not found." });
    }

    const reviewerName = req.user?.name || "HR Administrator";
    const reviewerId = req.user?.id ? String(req.user.id) : "HR";
    const todayStr = getISTDateStr();

    await reg.update({
      status: "REVERSED",
      reviewed_by_id: reviewerId,
      reviewed_by_name: reviewerName,
      reviewed_at: new Date(),
      review_remarks: reversal_notes ? `[REVERSED] ${reversal_notes.trim()}` : "[REVERSED] Regularization reversed by HR.",
    });

    // If attendance record was linked, revert it
    if (reg.attendance_id) {
      const att = await Attendance.findByPk(reg.attendance_id);
      if (att) {
        const auditNote = `[Attendance Reversal applied by ${reviewerName} on ${todayStr}: Status reverted to ${reversal_target_status}]`;
        const updatedNotes = att.notes ? `${att.notes} | ${auditNote}` : auditNote;

        await att.update({
          status: reversal_target_status,
          check_in: reversal_target_status === "Absent" ? null : att.check_in,
          check_out: reversal_target_status === "Absent" ? null : att.check_out,
          work_hours: reversal_target_status === "Absent" ? 0 : att.work_hours,
          notes: updatedNotes,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Attendance for ${reg.employee_name} on ${reg.attendance_date} has been reversed to ${reversal_target_status}.`,
      data: reg,
    });
  } catch (error) {
    console.error("Error in attendance reversal:", error);
    return res.status(500).json({
      success: false,
      error: "Reversal action failed: " + error.message,
    });
  }
};

/**
 * 8. Employee: Cancel / Delete Pending Regularization Request
 */
exports.cancelMyRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const employee_id = req.user?.employee_id;

    const reg = await AttendanceRegularization.findByPk(id);
    if (!reg) {
      return res.status(404).json({ success: false, error: "Request not found." });
    }

    if (reg.employee_id.toLowerCase() !== (employee_id || "").toLowerCase()) {
      return res.status(403).json({ success: false, error: "You can only cancel your own requests." });
    }

    if (reg.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel. Request is already ${reg.status}.`,
      });
    }

    await reg.destroy();
    return res.status(200).json({
      success: true,
      message: "Regularization request cancelled successfully.",
    });
  } catch (error) {
    console.error("Error cancelling regularization:", error);
    return res.status(500).json({
      success: false,
      error: "Cancellation failed: " + error.message,
    });
  }
};
