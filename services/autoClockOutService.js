/**
 * autoClockOutService.js
 * 
 * Auto-checkout and auto-clockout workflows have been completely removed.
 * Attendance check-in and check-out are strictly manual actions performed by employees or HR.
 * Automatic logout from the portal is governed solely by 14-hour session token expiry.
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
 * Disabled: returns zero records, does not modify any attendance rows.
 */
async function autoClockOutExpiredAttendance() {
  return { success: true, updatedCount: 0, updatedRecords: [] };
}

/**
 * Disabled: portal logout no longer touches or clocks out attendance records.
 */
async function clockOutOnPortalLogout() {
  return { success: true, clockedOut: false };
}

/**
 * Disabled: no background interval worker.
 */
function initAutoClockOutJob() {
  // No-op: auto clock-out background job is completely disabled
}

module.exports = {
  autoClockOutExpiredAttendance,
  clockOutOnPortalLogout,
  initAutoClockOutJob,
  normalizeTimeTo24h,
};
