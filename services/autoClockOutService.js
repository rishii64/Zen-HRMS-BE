const { Attendance, sequelize } = require("../config/db");
const { Op } = require("sequelize");
const { getISTParts } = require("../utils/timezone");

/**
 * Standardize any time string into 24-hour "HH:MM:SS" format.
 * Handles "10:00", "10:00:00", "09:30 AM", "09:30:00 PM", etc.
 */
function normalizeTimeTo24h(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "10:00:00";
  const trimmed = timeStr.trim();
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const seconds = ampmMatch[3] || "00";
    const ampm = ampmMatch[4] ? ampmMatch[4].toUpperCase() : null;

    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
  }
  return trimmed.substring(0, 8);
}

/**
 * Automatically clocks out employees who forgot to clock out after their assigned shift ended:
 * - Employee can log out anytime — do NOT clock them out with assigned shift time.
 * - If an employee does not clock out or forgets to clock out after assigned shift ends,
 *   they remain active until the 14-hour session token expiration time.
 * - When the 14-hour session expires, they are logged out from the portal and clocked out
 *   with the clock-out time set to the EXACT logout time (14h session expiration time).
 * 
 * @param {Object} [options]
 * @param {string} [options.employee_id] Optional employee ID filter
 * @param {boolean} [options.forceIfSessionExpired] If true, auto-clockout immediately with current IST logout time
 * @param {boolean} [options.forceIfShiftEnded] Backward compatibility alias for forceIfSessionExpired
 * @returns {Promise<{ success: boolean, updatedCount: number, updatedRecords: Array }>}
 */
async function autoClockOutExpiredAttendance({
  employee_id,
  forceIfSessionExpired = false,
  forceIfShiftEnded = false,
} = {}) {
  try {
    const shouldForce = forceIfSessionExpired || forceIfShiftEnded;
    const istNow = getISTParts();
    const todayStr = istNow.dateStr;
    const nowTimeStr = istNow.timeStr;
    const nowMs = new Date(`${todayStr}T${nowTimeStr}+05:30`).getTime();

    const whereClause = {
      check_in: { [Op.ne]: null },
      [Op.or]: [
        { check_out: null },
        { check_out: "" },
        { check_out: "—" },
      ],
    };

    if (employee_id) {
      whereClause.employee_id = employee_id;
    }

    const openRecords = await Attendance.findAll({
      where: whereClause,
      order: [["date", "ASC"], ["id", "ASC"]],
    });

    if (!openRecords || openRecords.length === 0) {
      return { success: true, updatedCount: 0, updatedRecords: [] };
    }

    const updatedRecords = [];

    for (const record of openRecords) {
      try {
        const recordDate = record.date;
        const checkInTime = normalizeTimeTo24h(record.check_in);
        const checkInDateTime = new Date(`${recordDate}T${checkInTime}+05:30`);
        const checkInMs = checkInDateTime.getTime();

        const hoursSinceCheckIn = (nowMs - checkInMs) / (1000 * 60 * 60);

        // Condition for 14-hour session expiration / clock-out:
        // 1. Explicitly triggered by portal 14h token expiry (shouldForce)
        // 2. 14 hours have elapsed since check-in (hoursSinceCheckIn >= 14)
        // 3. Unclosed record from a previous date (recordDate < todayStr)
        const isSessionExpired = shouldForce || hoursSinceCheckIn >= 14 || recordDate < todayStr;

        // If 14-hour session has not expired and not forced, DO NOT clock out.
        // The employee remains logged in and can continue working past assigned shift end.
        if (!isSessionExpired) {
          continue;
        }

        // Determine clock-out time:
        // - Live portal session termination: use current IST logout time (nowTimeStr)
        // - Background cleanup for expired session: use exact 14h token expiration time
        let clockOutTime = nowTimeStr;
        let workHours = 14.00;

        if (shouldForce) {
          // Live portal session termination: clock-out time is exact current logout time
          clockOutTime = nowTimeStr;
          const durationMs = Math.max(0, nowMs - checkInMs);
          workHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));
        } else {
          // Background cleanup: 14h session expiration timestamp
          const sessionExpiryMs = checkInMs + 14 * 60 * 60 * 1000;
          const expiryParts = getISTParts(sessionExpiryMs);
          clockOutTime = expiryParts.timeStr;
          workHours = 14.00;
        }

        await record.update({
          check_out: clockOutTime,
          work_hours: workHours,
        });

        updatedRecords.push({
          id: record.id,
          employee_id: record.employee_id,
          date: record.date,
          check_in: record.check_in,
          check_out: clockOutTime,
          work_hours: workHours,
        });

        console.log(`[Auto Clock-Out] Auto clocked-out ${record.employee_id} (${recordDate}) on 14h session termination at logout time ${clockOutTime} (${workHours} hrs)`);
      } catch (recErr) {
        console.error(`[Auto Clock-Out] Error processing record #${record.id}:`, recErr.message);
      }
    }

    return {
      success: true,
      updatedCount: updatedRecords.length,
      updatedRecords,
    };
  } catch (err) {
    console.error("[Auto Clock-Out Service Error]:", err.message);
    return { success: false, error: err.message, updatedCount: 0 };
  }
}

/**
 * Clocks out an employee when they manually log out of the portal at ANY time.
 * Marks check_out at the exact logout time and computes accurate work hours.
 * NEVER sets check_out to assigned shift time.
 * 
 * @param {Object} options
 * @param {string} options.employee_id
 * @param {string} [options.logoutTime] Optional custom logout time in HH:MM:SS
 * @returns {Promise<{ success: boolean, clockedOut: boolean, check_out?: string, work_hours?: number, date?: string }>}
 */
async function clockOutOnPortalLogout({ employee_id, logoutTime: customLogoutTime } = {}) {
  if (!employee_id) {
    return { success: false, clockedOut: false, error: "employee_id is required" };
  }

  try {
    const istNow = getISTParts();
    const todayStr = istNow.dateStr;
    const logoutTime = customLogoutTime || istNow.timeStr; // HH:MM:SS
    const logoutMs = new Date(`${todayStr}T${logoutTime}+05:30`).getTime();

    // Find the latest unclosed attendance record for this employee
    const openRecord = await Attendance.findOne({
      where: {
        employee_id,
        check_in: { [Op.ne]: null },
        [Op.or]: [
          { check_out: null },
          { check_out: "" },
          { check_out: "—" },
        ],
      },
      order: [["date", "DESC"], ["id", "DESC"]],
    });

    if (!openRecord) {
      return { success: true, clockedOut: false, message: "No unclosed shift found." };
    }

    const recordDate = openRecord.date;
    const checkInTime = normalizeTimeTo24h(openRecord.check_in);
    const checkInMs = new Date(`${recordDate}T${checkInTime}+05:30`).getTime();

    // Calculate work hours up to exact logout time
    const durationMs = Math.max(0, logoutMs - checkInMs);
    const workHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

    await openRecord.update({
      check_out: logoutTime,
      work_hours: workHours,
    });

    console.log(`[Portal Logout] Clocked out ${employee_id} on portal logout at ${logoutTime} (${workHours} hrs)`);

    return {
      success: true,
      clockedOut: true,
      check_out: logoutTime,
      work_hours: workHours,
      date: recordDate,
    };
  } catch (err) {
    console.error("[clockOutOnPortalLogout Error]:", err.message);
    return { success: false, clockedOut: false, error: err.message };
  }
}

let autoClockOutTimer = null;

/**
 * Initializes the periodic background worker running every 5 minutes and on server boot.
 */
function initAutoClockOutJob() {
  // Run on startup after 5 seconds
  setTimeout(() => {
    autoClockOutExpiredAttendance().catch((err) =>
      console.error("[Auto Clock-Out Startup Job Error]:", err.message)
    );
  }, 5000);

  // Periodic run every 5 minutes
  if (!autoClockOutTimer) {
    autoClockOutTimer = setInterval(() => {
      autoClockOutExpiredAttendance().catch((err) =>
        console.error("[Auto Clock-Out Interval Job Error]:", err.message)
      );
    }, 5 * 60 * 1000);
  }
}

module.exports = {
  autoClockOutExpiredAttendance,
  clockOutOnPortalLogout,
  initAutoClockOutJob,
  normalizeTimeTo24h,
};
