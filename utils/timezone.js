/**
 * Timezone Utility for HRMS (Indian Standard Time - Asia/Kolkata)
 * Ensures consistent IST date and time handling regardless of host server environment (e.g. AWS EC2 UTC).
 */

const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Extract decomposed date and time components in IST.
 * @param {Date|string|number} [date=new Date()]
 * @returns {{
 *   year: number,
 *   month: number,
 *   day: number,
 *   hour: number,
 *   minute: number,
 *   second: number,
 *   dateStr: string, // YYYY-MM-DD
 *   timeStr: string, // HH:MM:SS (24-hour)
 *   time12Str: string // hh:mm:ss AM/PM
 * }}
 */
function getISTParts(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date passed to getISTParts");
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const p = {};
  for (const { type, value } of parts) {
    p[type] = value;
  }

  // Certain environments/engines may return "24" for midnight with hour12: false
  let hour = p.hour;
  if (hour === "24") hour = "00";

  const dateStr = `${p.year}-${p.month}-${p.day}`;
  const timeStr = `${hour}:${p.minute}:${p.second}`;

  // 12-hour formatted time with AM/PM
  const hNum = parseInt(hour, 10);
  const ampm = hNum >= 12 ? "PM" : "AM";
  const h12 = hNum % 12 || 12;
  const time12Str = `${String(h12).padStart(2, "0")}:${p.minute}:${p.second} ${ampm}`;

  return {
    year: parseInt(p.year, 10),
    month: parseInt(p.month, 10),
    day: parseInt(p.day, 10),
    hour: hNum,
    minute: parseInt(p.minute, 10),
    second: parseInt(p.second, 10),
    dateStr,
    timeStr,
    time12Str,
  };
}

/**
 * Returns current date string in IST ("YYYY-MM-DD").
 * @param {Date|string|number} [date=new Date()]
 * @returns {string}
 */
function getISTDateStr(date = new Date()) {
  return getISTParts(date).dateStr;
}

/**
 * Returns current 24-hour time string in IST ("HH:MM:SS").
 * @param {Date|string|number} [date=new Date()]
 * @returns {string}
 */
function getISTTimeStr(date = new Date()) {
  return getISTParts(date).timeStr;
}

module.exports = {
  IST_TIMEZONE,
  getISTParts,
  getISTDateStr,
  getISTTimeStr,
};
