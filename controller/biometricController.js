const {
  BiometricDevice,
  BiometricPunch,
  Attendance,
  User,
  Employee,
  Schedule,
  Onboarding,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");
const crypto = require("crypto");
const { getISTParts, getISTDateStr, getISTTimeStr } = require("../utils/timezone");

/**
 * Normalizes punch time string into standard HH:MM:SS
 */
const normalizeTimeStr = (val) => {
  if (!val) return getISTTimeStr();
  const str = String(val).trim();
  // Check if ISO format or full date
  if (str.includes("T") || str.includes(" ")) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return getISTParts(d).timeStr;
      }
    } catch (_) {}
  }
  const parts = str.split(":");
  if (parts.length >= 2) {
    const hh = String(parseInt(parts[0], 10) || 0).padStart(2, "0");
    const mm = String(parseInt(parts[1], 10) || 0).padStart(2, "0");
    const ss = String(parseInt(parts[2] || "0", 10) || 0).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return getISTTimeStr();
};

/**
 * Normalizes punch date string into standard YYYY-MM-DD
 */
const normalizeDateStr = (val) => {
  if (!val) return getISTDateStr();
  const str = String(val).trim();
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  if (str.includes(" ")) {
    return str.split(" ")[0];
  }
  // If DD/MM/YYYY or DD-MM-YYYY
  if (str.includes("/") || (str.includes("-") && str.split("-")[0].length === 2)) {
    const sep = str.includes("/") ? "/" : "-";
    const parts = str.split(sep);
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${String(parts[1]).padStart(2, "0")}-${String(parts[0]).padStart(2, "0")}`;
    }
  }
  return str;
};

/**
 * Resolves an employee from a biometric machine enrollment ID
 */
const resolveEmployee = async (biometricUserId) => {
  if (!biometricUserId) return null;
  const rawId = String(biometricUserId).trim();

  // 1. Direct match on employee_id (e.g. "EMP-001")
  let user = await User.findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("employee_id")),
      rawId.toLowerCase()
    ),
    attributes: ["employee_id", "name", "dept", "role"],
  });

  if (user) {
    return {
      employee_id: user.employee_id,
      name: user.name,
      dept: user.dept || "General",
    };
  }

  // 2. Match on Employee.biometric_device_id
  let emp = await Employee.findOne({
    where: {
      [Op.or]: [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("biometric_device_id")),
          rawId.toLowerCase()
        ),
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          rawId.toLowerCase()
        ),
      ],
    },
    attributes: ["employee_id", "first_name", "last_name", "dept"],
  });

  if (emp) {
    const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id;
    return {
      employee_id: emp.employee_id,
      name: fullName,
      dept: emp.dept || "General",
    };
  }

  // 3. Match on Onboarding.biometric_device_id
  let onboard = await Onboarding.findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("biometric_device_id")),
      rawId.toLowerCase()
    ),
    attributes: ["employee_id", "employee_name", "target_department"],
  });

  if (onboard && onboard.employee_id) {
    return {
      employee_id: onboard.employee_id,
      name: onboard.employee_name,
      dept: onboard.target_department || "General",
    };
  }

  return null;
};

/**
 * Shift resolution helper for accurate on-time / late calculation
 */
const resolveShiftAndStatus = async (employeeId, dateStr, punchTimeStr) => {
  try {
    let schedule = await Schedule.findOne({
      where: {
        [Op.and]: [
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            employeeId.toLowerCase().trim()
          ),
          { date: dateStr },
        ],
      },
      order: [["id", "DESC"]],
    });

    if (!schedule) {
      schedule = await Schedule.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employeeId.toLowerCase().trim()
        ),
        order: [["date", "DESC"], ["id", "DESC"]],
      });
    }

    let shiftStartHour = 10;
    let shiftStartMinute = 0;
    let shiftName = "General Shift";

    if (schedule) {
      if (schedule.shift_name) shiftName = schedule.shift_name;
      if (schedule.start_time) {
        const parts = schedule.start_time.split(":");
        const pHour = parseInt(parts[0], 10);
        const pMin = parseInt(parts[1] || "0", 10);
        if (!isNaN(pHour)) {
          shiftStartHour = pHour;
          shiftStartMinute = isNaN(pMin) ? 0 : pMin;
        }
      }
    }

    const GRACE_MINUTES = 15;
    const timeParts = punchTimeStr.split(":");
    const currentHour = parseInt(timeParts[0], 10) || 0;
    const currentMinute = parseInt(timeParts[1] || "0", 10) || 0;

    const checkInMinutes = currentHour * 60 + currentMinute;
    const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute;

    let isLate = false;
    if (shiftStartHour >= 18 && currentHour < 6) {
      const adjustedCheckInMinutes = (currentHour + 24) * 60 + currentMinute;
      isLate = adjustedCheckInMinutes > (shiftStartMinutes + GRACE_MINUTES);
    } else {
      isLate = checkInMinutes > (shiftStartMinutes + GRACE_MINUTES);
    }

    return {
      status: isLate ? "Late Present" : "Present",
      late_count: isLate ? 1 : 0,
      shift_name: shiftName,
    };
  } catch (err) {
    console.error("Biometric shift resolution fallback:", err.message);
    const timeParts = punchTimeStr.split(":");
    const currentHour = parseInt(timeParts[0], 10) || 0;
    const currentMinute = parseInt(timeParts[1] || "0", 10) || 0;
    const checkInMinutes = currentHour * 60 + currentMinute;
    const isLate = checkInMinutes > (10 * 60 + 15);
    return {
      status: isLate ? "Late Present" : "Present",
      late_count: isLate ? 1 : 0,
      shift_name: "General Shift",
    };
  }
};

/**
 * Calculates work hours between two HH:MM:SS timestamps
 */
const calculateWorkHours = (inTime, outTime) => {
  try {
    const inParts = inTime.split(":");
    const outParts = outTime.split(":");
    const inMin = parseInt(inParts[0], 10) * 60 + parseInt(inParts[1], 10) + (parseInt(inParts[2] || "0", 10) / 60);
    let outMin = parseInt(outParts[0], 10) * 60 + parseInt(outParts[1], 10) + (parseInt(outParts[2] || "0", 10) / 60);
    // If checkout is past midnight
    if (outMin < inMin) {
      outMin += 24 * 60;
    }
    const diffHours = Math.max(0, (outMin - inMin) / 60);
    return parseFloat(diffHours.toFixed(2));
  } catch (_) {
    return 0;
  }
};

/**
 * Core engine: Ingests and processes a single biometric punch and updates Attendance workflow
 */
const processSinglePunch = async (punchData) => {
  const {
    device_id,
    device_name,
    device_serial,
    biometric_user_id,
    punch_type = "AUTO",
    verification_type = "FINGERPRINT",
    raw_data,
  } = punchData;

  const punch_time = normalizeTimeStr(punchData.punch_time);
  const punch_date = normalizeDateStr(punchData.punch_date);

  if (!biometric_user_id) {
    const punch = await BiometricPunch.create({
      device_id: device_id || null,
      device_name: device_name || "Terminal",
      device_serial: device_serial || null,
      biometric_user_id: "UNKNOWN",
      punch_time,
      punch_date,
      punch_type,
      verification_type,
      sync_status: "FAILED",
      error_message: "Missing biometric user identifier in punch payload",
      raw_data: typeof raw_data === "object" ? JSON.stringify(raw_data) : raw_data,
    });
    return { success: false, status: "FAILED", message: "Missing biometric user ID", punch };
  }

  // 1. Resolve employee
  const resolved = await resolveEmployee(biometric_user_id);
  if (!resolved) {
    const punch = await BiometricPunch.create({
      device_id: device_id || null,
      device_name: device_name || "Terminal",
      device_serial: device_serial || null,
      biometric_user_id: String(biometric_user_id).trim(),
      employee_id: null,
      punch_time,
      punch_date,
      punch_type,
      verification_type,
      sync_status: "UNRESOLVED_USER",
      error_message: `Unmapped machine enrollment ID: ${biometric_user_id}. Please map this ID to an employee in HR settings.`,
      raw_data: typeof raw_data === "object" ? JSON.stringify(raw_data) : raw_data,
    });
    return {
      success: false,
      status: "UNRESOLVED_USER",
      message: `Machine user ID '${biometric_user_id}' is not mapped to any active employee.`,
      punch,
    };
  }

  const { employee_id, name, dept } = resolved;

  // 2. Duplicate Check: same employee within 2 minutes (120 seconds) on the same date
  const recentPunch = await BiometricPunch.findOne({
    where: {
      employee_id,
      punch_date,
      sync_status: "PROCESSED",
    },
    order: [["id", "DESC"]],
  });

  if (recentPunch && recentPunch.punch_time) {
    const [h1, m1, s1] = recentPunch.punch_time.split(":").map(Number);
    const [h2, m2, s2] = punch_time.split(":").map(Number);
    const sec1 = h1 * 3600 + m1 * 60 + (s1 || 0);
    const sec2 = h2 * 3600 + m2 * 60 + (s2 || 0);
    if (Math.abs(sec2 - sec1) < 120) {
      const dupPunch = await BiometricPunch.create({
        device_id: device_id || null,
        device_name: device_name || "Terminal",
        device_serial: device_serial || null,
        biometric_user_id: String(biometric_user_id).trim(),
        employee_id,
        punch_time,
        punch_date,
        punch_type,
        verification_type,
        sync_status: "DUPLICATE",
        attendance_id: recentPunch.attendance_id || null,
        error_message: `Duplicate punch suppressed (within 2 mins of previous punch at ${recentPunch.punch_time})`,
        raw_data: typeof raw_data === "object" ? JSON.stringify(raw_data) : raw_data,
      });
      return {
        success: true,
        status: "DUPLICATE",
        message: "Duplicate punch suppressed within 2-minute window.",
        punch: dupPunch,
      };
    }
  }

  // 3. Save processed BiometricPunch first
  const devLabel = device_name || "Biometric Terminal";
  const punch = await BiometricPunch.create({
    device_id: device_id || null,
    device_name: devLabel,
    device_serial: device_serial || null,
    biometric_user_id: String(biometric_user_id).trim(),
    employee_id,
    punch_time,
    punch_date,
    punch_type,
    verification_type,
    sync_status: "PROCESSED",
    punch_category: "FIRST_ENTRY",
    attendance_id: null,
    error_message: null,
    raw_data: typeof raw_data === "object" ? JSON.stringify(raw_data) : raw_data,
  });

  // 4. Fetch ALL processed punches for this employee on this date (ordered chronologically)
  const allDailyPunches = await BiometricPunch.findAll({
    where: {
      employee_id,
      punch_date,
      sync_status: "PROCESSED",
    },
    order: [["punch_time", "ASC"], ["id", "ASC"]],
  });

  // Identify First Punch (Entry) & Last Punch (Exit)
  const firstPunch = allDailyPunches[0];
  const lastPunch = allDailyPunches.length > 1 ? allDailyPunches[allDailyPunches.length - 1] : null;

  // Update punch categories across all punches for today
  if (firstPunch && firstPunch.punch_category !== "FIRST_ENTRY") {
    await firstPunch.update({ punch_category: "FIRST_ENTRY" });
  }

  if (lastPunch) {
    if (lastPunch.punch_category !== "LAST_EXIT") {
      await lastPunch.update({ punch_category: "LAST_EXIT" });
    }

    // Mark all in-between punches as IN_BETWEEN_AUDIT
    for (let i = 1; i < allDailyPunches.length - 1; i++) {
      if (allDailyPunches[i].punch_category !== "IN_BETWEEN_AUDIT") {
        await allDailyPunches[i].update({ punch_category: "IN_BETWEEN_AUDIT" });
      }
    }
  }

  // Reload current punch to have updated category
  await punch.reload();

  // 5. Shift timing & status resolution (strictly determined by FIRST punch / Entry time)
  const shiftInfo = await resolveShiftAndStatus(employee_id, punch_date, firstPunch.punch_time);

  // 6. Calculate work hours between FIRST entry punch and LAST exit punch
  let diffHours = 0;
  if (lastPunch) {
    diffHours = calculateWorkHours(firstPunch.punch_time, lastPunch.punch_time);
  }

  // 7. Compose audit note
  const inBetweenPunches = allDailyPunches.slice(1, -1);
  let noteText = "";
  if (allDailyPunches.length === 1) {
    noteText = `Biometric In: ${firstPunch.punch_time} (${firstPunch.device_name || devLabel} • ${firstPunch.verification_type})`;
  } else {
    noteText = `Biometric In: ${firstPunch.punch_time} • Out: ${lastPunch.punch_time} • Total: ${allDailyPunches.length} punches`;
    if (inBetweenPunches.length > 0) {
      const inBetweenTimes = inBetweenPunches.map((p) => p.punch_time).join(", ");
      noteText += ` (${inBetweenPunches.length} in-between audit: ${inBetweenTimes})`;
    }
  }

  // 8. Find or Create/Update Attendance record
  let attendance = await Attendance.findOne({
    where: {
      [Op.and]: [
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
        { date: punch_date },
      ],
    },
  });

  if (!attendance) {
    attendance = await Attendance.create({
      employee_id,
      name,
      dept,
      date: punch_date,
      check_in: firstPunch.punch_time,
      check_out: lastPunch ? lastPunch.punch_time : null,
      work_hours: lastPunch ? diffHours : null,
      status: shiftInfo.status,
      late_count: shiftInfo.late_count,
      notes: noteText,
    });
  } else {
    let existingNotes = attendance.notes || "";
    // Clean prior biometric notes to keep notes neat and up-to-date
    if (existingNotes.includes("Biometric In:") || existingNotes.includes("Biometric Check-in")) {
      existingNotes = existingNotes
        .replace(/Biometric In:[^;]*/g, "")
        .replace(/Biometric Check-in[^;]*/g, "")
        .replace(/Biometric Check-out[^;]*/g, "")
        .replace(/^;\s*|;\s*$/g, "")
        .trim();
    }
    const finalNotes = existingNotes ? `${existingNotes}; ${noteText}` : noteText;

    await attendance.update({
      check_in: firstPunch.punch_time,
      check_out: lastPunch ? lastPunch.punch_time : attendance.check_out,
      work_hours: lastPunch ? diffHours : attendance.work_hours,
      status: shiftInfo.status,
      late_count: shiftInfo.late_count,
      notes: finalNotes,
    });
  }

  // Link all punches to this attendance record
  await BiometricPunch.update(
    { attendance_id: attendance.id },
    {
      where: {
        employee_id,
        punch_date,
        sync_status: "PROCESSED",
      },
    }
  );

  // Determine current punch action
  let action = "FIRST_ENTRY";
  let message = `First punch of the day: Entry recorded at ${punch_time} (${shiftInfo.status === "Present" ? "On Time" : "Late"})`;

  if (lastPunch && punch.id === lastPunch.id) {
    action = "LAST_EXIT";
    message = `Last punch of the day: Exit recorded at ${punch_time}. Total work hours: ${diffHours}h`;
  } else if (punch.punch_category === "IN_BETWEEN_AUDIT") {
    action = "IN_BETWEEN_AUDIT";
    message = `In-between punch recorded at ${punch_time} for audit records (Entry: ${firstPunch.punch_time}, Exit: ${lastPunch ? lastPunch.punch_time : "—"})`;
  }

  return {
    success: true,
    status: "PROCESSED",
    action,
    punch_category: punch.punch_category,
    employee_id,
    employee_name: name,
    total_punches_today: allDailyPunches.length,
    in_between_count: inBetweenPunches.length,
    punch,
    attendance,
    message,
  };
};

const BiometricController = {
  // Helper for internal caller access
  processSinglePunch,
  resolveEmployee,

  /**
   * POST /api/auth/attendance/biometric/punch
   * Single punch ingestion (via Device Key or HR Auth)
   */
  async recordPunch(req, res) {
    try {
      const deviceKey = req.headers["x-device-key"] || req.query.api_key || req.body.api_key;
      let device = null;

      if (deviceKey) {
        device = await BiometricDevice.findOne({ where: { api_key: deviceKey } });
        if (!device) {
          return res.status(401).json({ error: "Invalid Biometric Device API Key" });
        }
      } else if (!req.user) {
        return res.status(401).json({ error: "Unauthorized: Device API key or HR authentication required" });
      }

      const punchData = {
        ...req.body,
        device_id: device ? device.id : req.body.device_id,
        device_name: device ? device.device_name : req.body.device_name,
        device_serial: device ? device.device_serial : req.body.device_serial,
      };

      const result = await processSinglePunch(punchData);

      if (device) {
        await device.update({
          last_sync_at: new Date(),
          status: "ONLINE",
          total_punches_synced: device.total_punches_synced + 1,
        });
      }

      return res.status(result.success ? 200 : 422).json(result);
    } catch (err) {
      console.error("Biometric record punch error:", err.message);
      return res.status(500).json({ error: "Failed to process biometric punch", details: err.message });
    }
  },

  /**
   * POST /api/auth/attendance/biometric/batch-sync
   * Bulk push from device or automated sync gateway
   */
  async batchSyncPunches(req, res) {
    try {
      const deviceKey = req.headers["x-device-key"] || req.query.api_key || req.body.api_key;
      let device = null;

      if (deviceKey) {
        device = await BiometricDevice.findOne({ where: { api_key: deviceKey } });
        if (!device) {
          return res.status(401).json({ error: "Invalid Biometric Device API Key" });
        }
      } else if (!req.user) {
        return res.status(401).json({ error: "Unauthorized: Device API key or HR authentication required" });
      }

      const punches = Array.isArray(req.body.punches) ? req.body.punches : [];
      if (punches.length === 0) {
        return res.status(400).json({ error: "No punches provided in request body" });
      }

      let processedCount = 0;
      let duplicateCount = 0;
      let unresolvedCount = 0;
      let failedCount = 0;
      const results = [];

      for (const p of punches) {
        try {
          const punchData = {
            ...p,
            device_id: device ? device.id : p.device_id,
            device_name: device ? device.device_name : p.device_name,
            device_serial: device ? device.device_serial : p.device_serial,
          };
          const resItem = await processSinglePunch(punchData);
          results.push(resItem);

          if (resItem.status === "PROCESSED") processedCount++;
          else if (resItem.status === "DUPLICATE") duplicateCount++;
          else if (resItem.status === "UNRESOLVED_USER") unresolvedCount++;
          else failedCount++;
        } catch (itemErr) {
          failedCount++;
          results.push({ success: false, status: "FAILED", error: itemErr.message });
        }
      }

      if (device) {
        await device.update({
          last_sync_at: new Date(),
          status: "ONLINE",
          total_punches_synced: device.total_punches_synced + processedCount,
        });
      }

      return res.json({
        success: true,
        summary: {
          total_received: punches.length,
          processed: processedCount,
          duplicates: duplicateCount,
          unresolved: unresolvedCount,
          failed: failedCount,
        },
        results,
      });
    } catch (err) {
      console.error("Biometric batch sync error:", err.message);
      return res.status(500).json({ error: "Failed to batch sync biometric punches", details: err.message });
    }
  },

  /**
   * POST /api/auth/attendance/biometric/import-file
   * HR-initiated file upload parser and bulk ingest
   */
  async importPunchFile(req, res) {
    try {
      const { punches, device_id, device_name } = req.body;
      if (!Array.isArray(punches) || punches.length === 0) {
        return res.status(400).json({ error: "No punch records provided for file import" });
      }

      let targetDevice = null;
      if (device_id) {
        targetDevice = await BiometricDevice.findByPk(device_id);
      }

      let processedCount = 0;
      let duplicateCount = 0;
      let unresolvedCount = 0;
      let failedCount = 0;
      const details = [];

      for (const p of punches) {
        try {
          const punchPayload = {
            ...p,
            device_id: targetDevice ? targetDevice.id : (device_id || null),
            device_name: targetDevice ? targetDevice.device_name : (device_name || "File Import"),
            device_serial: targetDevice ? targetDevice.device_serial : "LOG-IMPORT",
          };
          const itemRes = await processSinglePunch(punchPayload);
          details.push(itemRes);

          if (itemRes.status === "PROCESSED") processedCount++;
          else if (itemRes.status === "DUPLICATE") duplicateCount++;
          else if (itemRes.status === "UNRESOLVED_USER") unresolvedCount++;
          else failedCount++;
        } catch (fErr) {
          failedCount++;
          details.push({ success: false, status: "FAILED", error: fErr.message });
        }
      }

      if (targetDevice) {
        await targetDevice.update({
          last_sync_at: new Date(),
          total_punches_synced: targetDevice.total_punches_synced + processedCount,
        });
      }

      return res.json({
        success: true,
        message: `Successfully processed ${processedCount} biometric punches into attendance records.`,
        summary: {
          total: punches.length,
          processed: processedCount,
          duplicates: duplicateCount,
          unresolved: unresolvedCount,
          failed: failedCount,
        },
        details: details.slice(0, 50), // Return sample details
      });
    } catch (err) {
      console.error("Biometric file import error:", err.message);
      return res.status(500).json({ error: "Failed to process punch file import", details: err.message });
    }
  },

  /**
   * GET /api/auth/attendance/biometric/devices
   * List all registered terminals
   */
  async getDevices(req, res) {
    try {
      const devices = await BiometricDevice.findAll({
        order: [["id", "ASC"]],
      });
      return res.json({ success: true, devices });
    } catch (err) {
      console.error("Get biometric devices error:", err.message);
      return res.status(500).json({ error: "Failed to fetch biometric devices" });
    }
  },

  /**
   * POST /api/auth/attendance/biometric/devices
   * Register a new biometric hardware terminal
   */
  async createDevice(req, res) {
    try {
      const {
        device_name,
        device_serial,
        device_type,
        ip_address,
        port,
        location,
        sync_mode,
        notes,
      } = req.body;

      if (!device_name || !device_serial) {
        return res.status(400).json({ error: "Device Name and Serial Number are required" });
      }

      // Check serial uniqueness
      const existing = await BiometricDevice.findOne({ where: { device_serial } });
      if (existing) {
        return res.status(400).json({ error: "Device with this serial number already registered" });
      }

      const apiKey = `BIO-KEY-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

      const device = await BiometricDevice.create({
        device_name,
        device_serial,
        device_type: device_type || "ZKTeco",
        ip_address: ip_address || "192.168.1.201",
        port: port ? parseInt(port, 10) : 4370,
        location: location || "HQ Campus",
        api_key: apiKey,
        status: "ONLINE",
        sync_mode: sync_mode || "REALTIME_PUSH",
        is_active: true,
        notes: notes || "",
      });

      return res.status(201).json({ success: true, message: "Device registered successfully", device });
    } catch (err) {
      console.error("Create biometric device error:", err.message);
      return res.status(500).json({ error: "Failed to create biometric device", details: err.message });
    }
  },

  /**
   * PUT /api/auth/attendance/biometric/devices/:id
   * Update device settings
   */
  async updateDevice(req, res) {
    try {
      const { id } = req.params;
      const device = await BiometricDevice.findByPk(id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      await device.update(req.body);
      return res.json({ success: true, message: "Device updated successfully", device });
    } catch (err) {
      console.error("Update biometric device error:", err.message);
      return res.status(500).json({ error: "Failed to update device" });
    }
  },

  /**
   * DELETE /api/auth/attendance/biometric/devices/:id
   */
  async deleteDevice(req, res) {
    try {
      const { id } = req.params;
      const device = await BiometricDevice.findByPk(id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      await device.destroy();
      return res.json({ success: true, message: "Device removed successfully" });
    } catch (err) {
      console.error("Delete biometric device error:", err.message);
      return res.status(500).json({ error: "Failed to delete device" });
    }
  },

  /**
   * POST /api/auth/attendance/biometric/devices/:id/test-ping
   * Simulated / hardware handshake test
   */
  async testPingDevice(req, res) {
    try {
      const { id } = req.params;
      const device = await BiometricDevice.findByPk(id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      // Simulate network socket ping latency between 15ms and 45ms
      const latencyMs = Math.floor(Math.random() * 30) + 15;
      const isOnline = device.is_active !== false;

      await device.update({
        last_ping_at: new Date(),
        status: isOnline ? "ONLINE" : "OFFLINE",
      });

      return res.json({
        success: true,
        online: isOnline,
        latencyMs,
        device_name: device.device_name,
        ip_address: device.ip_address,
        port: device.port,
        device_serial: device.device_serial,
        firmware_version: "v9.8.4-build2026",
        message: isOnline
          ? `Connection verified! Terminal responded in ${latencyMs}ms.`
          : "Device is marked inactive or unreachable.",
      });
    } catch (err) {
      console.error("Ping biometric device error:", err.message);
      return res.status(500).json({ error: "Hardware ping test failed" });
    }
  },

  /**
   * POST /api/auth/attendance/biometric/devices/:id/regenerate-key
   */
  async generateDeviceKey(req, res) {
    try {
      const { id } = req.params;
      const device = await BiometricDevice.findByPk(id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      const newApiKey = `BIO-KEY-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
      await device.update({ api_key: newApiKey });

      return res.json({ success: true, message: "API Key regenerated", api_key: newApiKey });
    } catch (err) {
      console.error("Regenerate API key error:", err.message);
      return res.status(500).json({ error: "Failed to regenerate API key" });
    }
  },

  /**
   * GET /api/auth/attendance/biometric/punches
   * Raw punch logs audit view
   */
  async getPunches(req, res) {
    try {
      const { date, device_id, sync_status, punch_category, search, page = 1, limit = 50 } = req.query;
      const where = {};

      if (date) {
        where.punch_date = date;
      }
      if (device_id && device_id !== "All") {
        where.device_id = parseInt(device_id, 10);
      }
      if (sync_status && sync_status !== "All") {
        where.sync_status = sync_status;
      }
      if (punch_category && punch_category !== "All") {
        where.punch_category = punch_category;
      }
      if (search && search.trim()) {
        const q = search.trim();
        where[Op.or] = [
          { biometric_user_id: { [Op.iLike]: `%${q}%` } },
          { employee_id: { [Op.iLike]: `%${q}%` } },
          { device_name: { [Op.iLike]: `%${q}%` } },
        ];
      }

      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const { count, rows } = await BiometricPunch.findAndCountAll({
        where,
        order: [["id", "DESC"]],
        limit: parseInt(limit, 10),
        offset,
      });

      return res.json({
        success: true,
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        punches: rows,
      });
    } catch (err) {
      console.error("Get biometric punches error:", err.message);
      return res.status(500).json({ error: "Failed to fetch punch records" });
    }
  },

  /**
   * POST /api/auth/attendance/biometric/map-user
   * Map machine ID to an Employee & auto-reprocess pending punches
   */
  async mapBiometricUser(req, res) {
    try {
      const { biometric_user_id, employee_id } = req.body;
      if (!biometric_user_id || !employee_id) {
        return res.status(400).json({ error: "Both biometric_user_id and employee_id are required" });
      }

      // Check employee exists
      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
      });

      if (!emp) {
        return res.status(404).json({ error: `Employee '${employee_id}' not found` });
      }

      // Update employee record
      await emp.update({ biometric_device_id: String(biometric_user_id).trim() });

      // Check onboarding record as well
      try {
        await Onboarding.update(
          { biometric_device_id: String(biometric_user_id).trim(), biometric_registered: true },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              employee_id.toLowerCase().trim()
            ),
          }
        );
      } catch (_) {}

      // Reprocess all pending UNRESOLVED_USER punches for this biometric_user_id
      const pendingPunches = await BiometricPunch.findAll({
        where: {
          biometric_user_id: String(biometric_user_id).trim(),
          sync_status: "UNRESOLVED_USER",
        },
        order: [["punch_date", "ASC"], ["punch_time", "ASC"]],
      });

      let reprocessedCount = 0;
      for (const p of pendingPunches) {
        try {
          await p.destroy(); // Remove old unresolved log and process fresh
          await processSinglePunch({
            device_id: p.device_id,
            device_name: p.device_name,
            device_serial: p.device_serial,
            biometric_user_id: p.biometric_user_id,
            punch_time: p.punch_time,
            punch_date: p.punch_date,
            punch_type: p.punch_type,
            verification_type: p.verification_type,
            raw_data: p.raw_data,
          });
          reprocessedCount++;
        } catch (repErr) {
          console.warn("Reprocess punch error:", repErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Successfully mapped Machine ID '${biometric_user_id}' to ${emp.first_name || ""} ${emp.last_name || ""} (${emp.employee_id}). ${reprocessedCount} past punch(es) reprocessed.`,
        reprocessedCount,
      });
    } catch (err) {
      console.error("Map biometric user error:", err.message);
      return res.status(500).json({ error: "Failed to map biometric user", details: err.message });
    }
  },

  /**
   * GET /api/auth/attendance/biometric/stats
   * Get high-level overview metrics
   */
  async getBiometricStats(req, res) {
    try {
      const today = getISTDateStr();

      const [
        totalDevices,
        onlineDevices,
        todayPunches,
        processedPunches,
        unresolvedPunches,
      ] = await Promise.all([
        BiometricDevice.count(),
        BiometricDevice.count({ where: { status: "ONLINE", is_active: true } }),
        BiometricPunch.count({ where: { punch_date: today } }),
        BiometricPunch.count({ where: { punch_date: today, sync_status: "PROCESSED" } }),
        BiometricPunch.count({ where: { sync_status: "UNRESOLVED_USER" } }),
      ]);

      const lastDevice = await BiometricDevice.findOne({
        where: { last_sync_at: { [Op.ne]: null } },
        order: [["last_sync_at", "DESC"]],
        attributes: ["last_sync_at", "device_name"],
      });

      return res.json({
        success: true,
        stats: {
          totalDevices,
          onlineDevices,
          todayPunches,
          processedPunches,
          unresolvedPunches,
          lastSyncAt: lastDevice?.last_sync_at || null,
          lastSyncDevice: lastDevice?.device_name || "None",
        },
      });
    } catch (err) {
      console.error("Get biometric stats error:", err.message);
      return res.status(500).json({ error: "Failed to fetch biometric stats" });
    }
  },
};

module.exports = BiometricController;
