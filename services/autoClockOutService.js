const { Attendance, Schedule, sequelize } = require("../config/db");
const { Op } = require("sequelize");
const { getISTParts } = require("../utils/timezone");

/**
 * Automatically clocks out employees who forgot to clock out after their assigned shift ended
 * once the 14-hour session threshold has been reached (or on prior days' unclosed records).
 * 
 * @param {Object} [options]
 * @param {string} [options.employee_id] Optional employee ID filter
 * @param {boolean} [options.forceIfShiftEnded] If true, auto-clockout as long as shift has ended (used on explicit 14hr session expiry)
 * @returns {Promise<{ success: boolean, updatedCount: number, updatedRecords: Array }>}
 */
async function autoClockOutExpiredAttendance({ employee_id, forceIfShiftEnded = false } = {}) {
  try {
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
        const checkInTime = record.check_in ? record.check_in.substring(0, 8) : "10:00:00";

        // 1. Resolve employee's assigned shift schedule
        let schedule = null;
        try {
          schedule = await Schedule.findOne({
            where: {
              [Op.and]: [
                sequelize.where(
                  sequelize.fn("LOWER", sequelize.col("employee_id")),
                  record.employee_id.toLowerCase().trim()
                ),
                { date: recordDate }
              ]
            },
            order: [["id", "DESC"]]
          });

          if (!schedule) {
            schedule = await Schedule.findOne({
              where: sequelize.where(
                sequelize.fn("LOWER", sequelize.col("employee_id")),
                record.employee_id.toLowerCase().trim()
              ),
              order: [["date", "DESC"], ["id", "DESC"]]
            });
          }
        } catch (schErr) {
          console.warn(`[Auto Clock-Out] Schedule fetch warning for ${record.employee_id}:`, schErr.message);
        }

        // Assigned shift timings (default General Shift: 10:00 to 19:00)
        let shiftStart = schedule?.start_time || "10:00";
        let shiftEnd = schedule?.end_time || "19:00";

        // Standardize to HH:MM:SS format
        if (shiftStart.length === 5) shiftStart += ":00";
        if (shiftEnd.length === 5) shiftEnd += ":00";

        const checkInDateTime = new Date(`${recordDate}T${checkInTime}+05:30`);
        let shiftEndDateTime = new Date(`${recordDate}T${shiftEnd}+05:30`);

        // Handle overnight shifts crossing midnight (e.g. 20:00 to 05:00)
        const startHour = parseInt(shiftStart.split(":")[0], 10);
        const endHour = parseInt(shiftEnd.split(":")[0], 10);
        if (endHour < startHour) {
          shiftEndDateTime.setDate(shiftEndDateTime.getDate() + 1);
        }

        const shiftEndMs = shiftEndDateTime.getTime();
        const checkInMs = checkInDateTime.getTime();

        // Condition 1: Has the assigned shift ended?
        const shiftHasEnded = nowMs >= shiftEndMs;

        // Condition 2: Has the 14-hour session completed?
        // (Either >= 14h since check-in, or record is from a previous calendar day, or explicitly forced on 14h portal session expiry)
        const hoursSinceCheckIn = (nowMs - checkInMs) / (1000 * 60 * 60);
        const isPast14Hours = hoursSinceCheckIn >= 14 || recordDate < todayStr || forceIfShiftEnded;

        if (shiftHasEnded && isPast14Hours) {
          // Calculate work hours up to shift end
          const durationMs = Math.max(0, shiftEndMs - checkInMs);
          const workHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

          await record.update({
            check_out: shiftEnd,
            work_hours: workHours,
          });

          updatedRecords.push({
            id: record.id,
            employee_id: record.employee_id,
            date: record.date,
            check_in: record.check_in,
            check_out: shiftEnd,
            work_hours: workHours,
          });

          console.log(`[Auto Clock-Out] Auto clocked-out ${record.employee_id} (${recordDate}) at assigned shift end ${shiftEnd} (${workHours} hrs)`);
        }
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
  initAutoClockOutJob,
};
