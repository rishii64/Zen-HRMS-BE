const { HrEvent, Employee, User } = require("../config/db");
const { sendHREventAnnouncementEmail } = require("../utils/mailer");
const { Op } = require("sequelize");

const getEvents = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    const userRole = (req.user?.role || "").toLowerCase().trim();

    const isHrOrAdmin = [
      "hr",
      "admin",
      "management",
      "hrmanager",
      "ceo",
      "coo",
      "cto",
      "cfo",
      "vp",
      "secretary",
    ].includes(userRole);

    const where = {};

    // Standard employees only see published/sent events
    if (!isHrOrAdmin) {
      where.status = "Sent";
    } else if (status && status !== "All") {
      where.status = status;
    }

    if (category && category !== "All") {
      where.event_category = category;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { event_name: { [Op.iLike]: q } },
        { company_name: { [Op.iLike]: q } },
        { branch_location: { [Op.iLike]: q } },
        { address: { [Op.iLike]: q } },
        { content: { [Op.iLike]: q } },
      ];
    }

    const events = await HrEvent.findAll({
      where,
      order: [
        ["event_date", "ASC"],
        ["id", "DESC"],
      ],
    });

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (err) {
    console.error("Error fetching HR Events:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve HR events",
      error: err.message,
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await HrEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "HR Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error("Error fetching HR Event by ID:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve HR event",
      error: err.message,
    });
  }
};

const createEvent = async (req, res) => {
  try {
    const {
      company_name,
      branch_location,
      address,
      event_name,
      event_category,
      event_date,
      start_time,
      end_time,
      content,
      sign_off,
      target_audience,
      status,
      theme,
    } = req.body;

    if (!event_name || !event_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Event name / title is required",
      });
    }

    if (!event_date) {
      return res.status(400).json({
        success: false,
        message: "Event date is required",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Event content / agenda is required",
      });
    }

    const newEvent = await HrEvent.create({
      company_name: (company_name || req.user?.company_name || "TATA Steel").trim(),
      branch_location: (branch_location || req.user?.work_location || "Kolkata HQ").trim(),
      address: (address || "").trim(),
      event_name: event_name.trim(),
      event_category: (event_category || "Event").trim(),
      event_date,
      start_time: (start_time || "10:00 AM").trim(),
      end_time: (end_time || "01:00 PM").trim(),
      content: content.trim(),
      sign_off: (sign_off || "HR Team").trim(),
      target_audience: (target_audience || "All Employees").trim(),
      status: (status || "Draft").trim(),
      theme: (theme || "purple").trim(),
      created_by_id: req.user?.employee_id || req.user?.id || "HR",
      created_by_name: req.user?.name || "HR Manager",
      created_by_role: req.user?.role || "hr",
      emails_sent_count: 0,
    });

    return res.status(201).json({
      success: true,
      message: "HR Event saved successfully",
      data: newEvent,
    });
  } catch (err) {
    console.error("Error creating HR Event:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create HR event",
      error: err.message,
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await HrEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "HR Event not found",
      });
    }

    const {
      company_name,
      branch_location,
      address,
      event_name,
      event_category,
      event_date,
      start_time,
      end_time,
      content,
      sign_off,
      target_audience,
      status,
      theme,
    } = req.body;

    await event.update({
      company_name: company_name !== undefined ? company_name.trim() : event.company_name,
      branch_location: branch_location !== undefined ? branch_location.trim() : event.branch_location,
      address: address !== undefined ? address.trim() : event.address,
      event_name: event_name !== undefined ? event_name.trim() : event.event_name,
      event_category: event_category !== undefined ? event_category.trim() : event.event_category,
      event_date: event_date || event.event_date,
      start_time: start_time !== undefined ? start_time.trim() : event.start_time,
      end_time: end_time !== undefined ? end_time.trim() : event.end_time,
      content: content !== undefined ? content.trim() : event.content,
      sign_off: sign_off !== undefined ? sign_off.trim() : event.sign_off,
      target_audience: target_audience !== undefined ? target_audience.trim() : event.target_audience,
      status: status !== undefined ? status.trim() : event.status,
      theme: theme !== undefined ? theme.trim() : event.theme,
    });

    return res.status(200).json({
      success: true,
      message: "HR Event updated successfully",
      data: event,
    });
  } catch (err) {
    console.error("Error updating HR Event:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update HR event",
      error: err.message,
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await HrEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "HR Event not found",
      });
    }

    await event.destroy();

    return res.status(200).json({
      success: true,
      message: "HR Event deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting HR Event:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete HR event",
      error: err.message,
    });
  }
};

const broadcastEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await HrEvent.findByPk(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "HR Event not found",
      });
    }

    // 1. Fetch active employees
    const activeEmployees = await Employee.findAll({
      where: { status: "Active" },
      attributes: ["employee_id", "first_name", "last_name", "work_email", "email"],
    });

    // 2. Collect valid employee email addresses
    const recipientSet = new Set();
    activeEmployees.forEach((emp) => {
      const wEmail = (emp.work_email || "").trim().toLowerCase();
      const pEmail = (emp.email || "").trim().toLowerCase();
      const target = wEmail.includes("@") && wEmail.includes(".") ? wEmail : pEmail;
      if (target && target.includes("@") && target.includes(".")) {
        recipientSet.add(target);
      }
    });

    const recipients = Array.from(recipientSet);

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active employee emails found to broadcast to.",
      });
    }

    // 3. Send email broadcast via nodemailer
    let emailSent = false;
    let mailError = null;

    try {
      await sendHREventAnnouncementEmail({
        recipients,
        eventName: event.event_name,
        eventCategory: event.event_category,
        companyName: event.company_name,
        branchLocation: event.branch_location,
        address: event.address,
        eventDate: event.event_date,
        startTime: event.start_time,
        endTime: event.end_time,
        content: event.content,
        signOff: event.sign_off,
        theme: event.theme || "purple",
      });
      emailSent = true;
    } catch (sendErr) {
      console.warn("Email broadcast error (SMTP check):", sendErr.message);
      mailError = sendErr.message;
    }

    // 4. Update Event status
    await event.update({
      status: "Sent",
      sent_at: new Date(),
      emails_sent_count: recipients.length,
    });

    return res.status(200).json({
      success: true,
      message: `HR Event broadcasted successfully to ${recipients.length} employee work emails!`,
      sentCount: recipients.length,
      emailSent,
      mailError: mailError ? `Notice: ${mailError}` : null,
      data: event,
    });
  } catch (err) {
    console.error("Error broadcasting HR Event:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to broadcast HR event",
      error: err.message,
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  broadcastEvent,
};
