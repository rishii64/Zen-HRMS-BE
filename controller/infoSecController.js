const crypto = require("crypto");
const { Op } = require("sequelize");
const {
  InfoSecCampaign,
  InfoSecAcknowledgment,
  Employee,
  User,
  sequelize,
} = require("../config/db");
const { sendRealtimeNotification } = require("../socket");
const { sendInfoSecCampaignEmail } = require("../utils/mailer");

const InfoSecController = {
  /**
   * getCampaigns
   * Returns list of awareness campaigns with compliance rates, deadline countdowns, and individual completion statuses.
   */
  getCampaigns: async (req, res) => {
    try {
      const userEmpId = req.user?.employee_id || req.user?.employeeCode;

      const campaigns = await InfoSecCampaign.findAll({
        order: [["created_at", "DESC"]],
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all acknowledgments for aggregate metrics
      const allAcks = await InfoSecAcknowledgment.findAll();

      // Index acknowledgments by campaign_id
      const acksByCampaign = {};
      allAcks.forEach((ack) => {
        if (!acksByCampaign[ack.campaign_id]) acksByCampaign[ack.campaign_id] = [];
        acksByCampaign[ack.campaign_id].push(ack);
      });

      // Index requesting user's acknowledgments
      const userAcksByCampaign = {};
      if (userEmpId) {
        allAcks
          .filter((a) => a.employee_id === userEmpId)
          .forEach((a) => {
            userAcksByCampaign[a.campaign_id] = a;
          });
      }

      const list = campaigns.map((camp) => {
        const cAcks = acksByCampaign[camp.id] || [];
        const totalAssigned = cAcks.length;
        const acknowledgedCount = cAcks.filter((a) => a.status === "Acknowledged").length;
        const pendingCount = cAcks.filter((a) => a.status === "Pending" || a.status === "In Progress").length;
        const overdueCount = cAcks.filter((a) => a.status === "Overdue").length;
        const complianceRate = totalAssigned > 0 ? Math.round((acknowledgedCount / totalAssigned) * 100) : 0;

        let daysRemaining = null;
        let isOverdue = false;
        if (camp.end_date) {
          const endDate = new Date(camp.end_date);
          endDate.setHours(0, 0, 0, 0);
          const diffMs = endDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          isOverdue = daysRemaining < 0;
        }

        const myAck = userAcksByCampaign[camp.id] || null;

        let myStatus = "Not Assigned";
        if (myAck) {
          myStatus = myAck.status;
          if (myStatus !== "Acknowledged" && isOverdue) {
            myStatus = "Overdue";
          }
        }

        return {
          id: camp.id,
          campaign_code: camp.campaign_code,
          title: camp.title,
          category: camp.category,
          description: camp.description,
          start_date: camp.start_date,
          end_date: camp.end_date,
          target_departments: camp.target_departments,
          status: camp.status,
          mandatory: camp.mandatory,
          passing_score: camp.passing_score,
          created_by: camp.created_by,
          created_at: camp.created_at,
          days_remaining: daysRemaining,
          is_overdue: isOverdue,
          metrics: {
            total_assigned: totalAssigned,
            acknowledged_count: acknowledgedCount,
            pending_count: pendingCount,
            overdue_count: overdueCount,
            compliance_rate: complianceRate,
          },
          my_acknowledgment: myAck
            ? {
                id: myAck.id,
                status: myStatus,
                quiz_score: myAck.quiz_score,
                quiz_attempts: myAck.quiz_attempts,
                quiz_passed: myAck.quiz_passed,
                acknowledged_at: myAck.acknowledged_at,
                certificate_issued: myAck.certificate_issued,
                certificate_number: myAck.certificate_number,
                compliance_hash: myAck.compliance_hash,
              }
            : null,
        };
      });

      // Global org-wide metrics
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter((c) => c.status === "Active").length;
      const totalAllAcks = allAcks.length;
      const totalAcknowledgedAll = allAcks.filter((a) => a.status === "Acknowledged").length;
      const orgComplianceRate = totalAllAcks > 0 ? Math.round((totalAcknowledgedAll / totalAllAcks) * 100) : 100;
      const totalPendingAll = allAcks.filter((a) => a.status === "Pending" || a.status === "In Progress").length;
      const totalOverdueAll = allAcks.filter((a) => a.status === "Overdue").length;

      return res.json({
        success: true,
        campaigns: list,
        metrics: {
          totalCampaigns,
          activeCampaigns,
          totalAssigned: totalAllAcks,
          totalAcknowledged: totalAcknowledgedAll,
          totalPending: totalPendingAll,
          totalOverdue: totalOverdueAll,
          orgComplianceRate,
        },
      });
    } catch (err) {
      console.error("getCampaigns error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch InfoSec campaigns" });
    }
  },

  /**
   * getCampaignDetails
   * Returns complete campaign content, training modules, phishing scenarios, quiz questions, and employee sign-off record.
   */
  getCampaignDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const userEmpId = req.user?.employee_id || req.user?.employeeCode;

      const campaign = await InfoSecCampaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      let trainingModules = [];
      try {
        trainingModules = campaign.training_modules ? JSON.parse(campaign.training_modules) : [];
      } catch (_) {
        trainingModules = [];
      }

      let quizData = { scenarios: [], questions: [] };
      try {
        quizData = campaign.quiz_questions ? JSON.parse(campaign.quiz_questions) : { scenarios: [], questions: [] };
      } catch (_) {
        quizData = { scenarios: [], questions: [] };
      }

      let myAck = null;
      if (userEmpId) {
        myAck = await InfoSecAcknowledgment.findOne({
          where: { campaign_id: campaign.id, employee_id: userEmpId },
        });
      }

      return res.json({
        success: true,
        campaign: {
          ...campaign.toJSON(),
          training_modules: trainingModules,
          quiz_questions: quizData,
        },
        myAcknowledgment: myAck,
      });
    } catch (err) {
      console.error("getCampaignDetails error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch campaign details" });
    }
  },

  /**
   * createCampaign
   * Creates a new InfoSec awareness campaign and initializes pending acknowledgment assignments for eligible employees.
   */
  createCampaign: async (req, res) => {
    try {
      const {
        title,
        category,
        description,
        start_date,
        end_date,
        target_departments,
        mandatory,
        passing_score,
        training_modules,
        quiz_questions,
        acknowledgment_statement,
      } = req.body;

      if (!title || !start_date || !end_date) {
        return res.status(400).json({ success: false, error: "Title, start date, and end date are required" });
      }

      const year = new Date(start_date).getFullYear();
      const codeSuffix = Math.floor(1000 + Math.random() * 9000);
      const categoryAbbr = (category || "PHISH").replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase();
      const campaign_code = `SEC-${year}-${categoryAbbr}-${codeSuffix}`;

      const createdBy = req.user?.name || req.user?.email || "InfoSec Compliance Officer";

      const campaign = await InfoSecCampaign.create({
        campaign_code,
        title,
        category: category || "Phishing & Social Engineering",
        description,
        start_date,
        end_date,
        target_departments: target_departments || "All",
        status: "Active",
        mandatory: mandatory !== undefined ? mandatory : true,
        passing_score: passing_score ? parseInt(passing_score, 10) : 80,
        training_modules: typeof training_modules === "object" ? JSON.stringify(training_modules) : training_modules,
        quiz_questions: typeof quiz_questions === "object" ? JSON.stringify(quiz_questions) : quiz_questions,
        acknowledgment_statement:
          acknowledgment_statement ||
          "I hereby certify and acknowledge that I have completed the mandatory Information Security Awareness Training and agree to adhere strictly to all cybersecurity, phishing defense, clean desk, and incident reporting protocols.",
        created_by: createdBy,
      });

      // Determine eligible employees
      const empWhere = { status: "Active" };
      if (target_departments && target_departments !== "All") {
        const deptArray = target_departments.split(",").map((d) => d.trim());
        empWhere.dept = { [Op.in]: deptArray };
      }

      const employees = await Employee.findAll({
        where: empWhere,
        attributes: ["id", "employee_id", "first_name", "last_name", "email", "work_email", "dept", "designation"],
      });

      // Initialize pending acknowledgments
      const acksToCreate = employees.map((emp) => ({
        campaign_id: campaign.id,
        employee_id: emp.employee_id,
        employee_name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id,
        employee_email: emp.email || emp.work_email || "",
        department: emp.dept || "General",
        designation: emp.designation || "Staff",
        status: "Pending",
        quiz_attempts: 0,
        quiz_passed: false,
      }));

      if (acksToCreate.length > 0) {
        await InfoSecAcknowledgment.bulkCreate(acksToCreate, { ignoreDuplicates: true });
      }

      // Broadcast real-time dashboard notification
      await sendRealtimeNotification({
        recipient_id: "ALL",
        title: "Mandatory InfoSec Campaign Launched",
        message: `New Information Security Awareness Campaign: "${campaign.title}". Mandatory completion deadline: ${campaign.end_date}.`,
        type: "announcement",
        category: "Announcements",
        priority: "high",
        link: "/infosec",
        source_module: "infosec_awareness",
        created_by: createdBy,
      });

      return res.status(201).json({
        success: true,
        message: `InfoSec campaign created and assigned to ${employees.length} employees successfully.`,
        campaign,
        assignedCount: employees.length,
      });
    } catch (err) {
      console.error("createCampaign error:", err);
      return res.status(500).json({ success: false, error: "Failed to create InfoSec campaign" });
    }
  },

  /**
   * updateCampaign
   * Updates an existing campaign metadata.
   */
  updateCampaign: async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await InfoSecCampaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      const updatable = [
        "title",
        "category",
        "description",
        "start_date",
        "end_date",
        "target_departments",
        "status",
        "mandatory",
        "passing_score",
        "acknowledgment_statement",
      ];

      updatable.forEach((field) => {
        if (req.body[field] !== undefined) {
          campaign[field] = req.body[field];
        }
      });

      if (req.body.training_modules !== undefined) {
        campaign.training_modules =
          typeof req.body.training_modules === "object"
            ? JSON.stringify(req.body.training_modules)
            : req.body.training_modules;
      }

      if (req.body.quiz_questions !== undefined) {
        campaign.quiz_questions =
          typeof req.body.quiz_questions === "object"
            ? JSON.stringify(req.body.quiz_questions)
            : req.body.quiz_questions;
      }

      await campaign.save();

      return res.json({
        success: true,
        message: "Campaign updated successfully",
        campaign,
      });
    } catch (err) {
      console.error("updateCampaign error:", err);
      return res.status(500).json({ success: false, error: "Failed to update campaign" });
    }
  },

  /**
   * deleteCampaign
   * Removes or archives a campaign and associated acknowledgments.
   */
  deleteCampaign: async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await InfoSecCampaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      await campaign.destroy();
      return res.json({ success: true, message: "Campaign deleted successfully" });
    } catch (err) {
      console.error("deleteCampaign error:", err);
      return res.status(500).json({ success: false, error: "Failed to delete campaign" });
    }
  },

  /**
   * getMyCompliance
   * Returns personal compliance standing, pending campaigns, and earned cybersecurity certificates for the logged-in user.
   */
  getMyCompliance: async (req, res) => {
    try {
      const userEmpId = req.user?.employee_id || req.user?.employeeCode;
      if (!userEmpId) {
        return res.status(400).json({ success: false, error: "Employee code not identified in session" });
      }

      const acks = await InfoSecAcknowledgment.findAll({
        where: { employee_id: userEmpId },
        include: [
          {
            model: InfoSecCampaign,
            as: "campaign",
            attributes: ["id", "campaign_code", "title", "category", "end_date", "status", "passing_score"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      const totalAssigned = acks.length;
      const acknowledgedCount = acks.filter((a) => a.status === "Acknowledged").length;
      const pendingCount = acks.filter((a) => a.status !== "Acknowledged").length;
      const complianceRate = totalAssigned > 0 ? Math.round((acknowledgedCount / totalAssigned) * 100) : 100;

      const certificates = acks
        .filter((a) => a.certificate_issued && a.status === "Acknowledged")
        .map((a) => ({
          id: a.id,
          campaign_id: a.campaign_id,
          campaign_title: a.campaign?.title || "InfoSec Awareness",
          campaign_category: a.campaign?.category || "Cybersecurity",
          certificate_number: a.certificate_number,
          compliance_hash: a.compliance_hash,
          quiz_score: a.quiz_score,
          acknowledged_at: a.acknowledged_at,
          employee_name: a.employee_name,
          employee_id: a.employee_id,
          department: a.department,
        }));

      return res.json({
        success: true,
        compliance: {
          totalAssigned,
          acknowledgedCount,
          pendingCount,
          complianceRate,
          isFullyCompliant: pendingCount === 0,
          acknowledgments: acks,
          certificates,
        },
      });
    } catch (err) {
      console.error("getMyCompliance error:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve employee compliance status" });
    }
  },

  /**
   * submitAcknowledgment
   * Evaluates the phishing / cybersecurity micro-quiz, records digital compliance sign-off, captures audit trail (IP & hash), and issues certificate.
   */
  submitAcknowledgment: async (req, res) => {
    try {
      const userEmpId = req.user?.employee_id || req.user?.employeeCode;
      const { campaign_id, answers, confirmation_agreed, notes } = req.body;

      if (!campaign_id) {
        return res.status(400).json({ success: false, error: "Campaign ID is required" });
      }

      if (!confirmation_agreed) {
        return res.status(400).json({
          success: false,
          error: "You must check and agree to the formal InfoSec compliance declaration to complete this acknowledgment.",
        });
      }

      const campaign = await InfoSecCampaign.findByPk(campaign_id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      // Parse questions
      let quizData = { questions: [] };
      try {
        quizData = campaign.quiz_questions ? JSON.parse(campaign.quiz_questions) : { questions: [] };
      } catch (_) {
        quizData = { questions: [] };
      }

      const questions = quizData.questions || [];
      const totalQuestions = questions.length;
      let correctCount = 0;

      // Grade answers
      if (totalQuestions > 0 && Array.isArray(answers)) {
        questions.forEach((q, idx) => {
          const userAns = answers[idx] !== undefined ? answers[idx] : answers[q.id];
          if (userAns !== undefined && parseInt(userAns, 10) === parseInt(q.correct_index, 10)) {
            correctCount++;
          }
        });
      } else {
        correctCount = totalQuestions;
      }

      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
      const passingScore = campaign.passing_score || 80;
      const passed = score >= passingScore;

      // Find or create employee acknowledgment record
      let ack = await InfoSecAcknowledgment.findOne({
        where: { campaign_id: campaign.id, employee_id: userEmpId },
      });

      if (!ack) {
        const emp = await Employee.findOne({ where: { employee_id: userEmpId } });
        ack = await InfoSecAcknowledgment.create({
          campaign_id: campaign.id,
          employee_id: userEmpId,
          employee_name: emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : userEmpId,
          employee_email: emp?.email || emp?.work_email || req.user?.email || "",
          department: emp?.dept || "General",
          designation: emp?.designation || "Staff",
          status: "Pending",
          quiz_attempts: 0,
        });
      }

      ack.quiz_attempts = (ack.quiz_attempts || 0) + 1;
      ack.quiz_score = score;
      ack.notes = notes || ack.notes || "";

      if (!passed) {
        await ack.save();
        return res.status(400).json({
          success: false,
          passed: false,
          score,
          correctCount,
          totalQuestions,
          passing_score: passingScore,
          message: `Your score of ${score}% is below the mandatory passing threshold of ${passingScore}%. Please review the security guidelines and attempt the knowledge check again.`,
        });
      }

      // Passed: Record formal digital sign-off and issue certificate
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "Web Browser Client";
      const complianceHash = `SEC-ACK-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      const certNumber = `CERT-INFOSEC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      ack.status = "Acknowledged";
      ack.quiz_passed = true;
      ack.acknowledged_at = new Date();
      ack.ip_address = String(clientIp).slice(0, 100);
      ack.user_agent = String(userAgent);
      ack.compliance_hash = complianceHash;
      ack.certificate_issued = true;
      ack.certificate_number = certNumber;

      await ack.save();

      // Dispatch real-time dashboard notification to employee
      await sendRealtimeNotification({
        recipient_id: userEmpId,
        title: "InfoSec Acknowledgment Completed",
        message: `Verified: You have successfully acknowledged "${campaign.title}" with a quiz score of ${score}%. Certificate #${certNumber} generated.`,
        type: "claim",
        category: "General",
        priority: "normal",
        link: "/infosec",
        source_module: "infosec_awareness",
        created_by: "System InfoSec Monitor",
      });

      return res.json({
        success: true,
        message: `Congratulations! InfoSec training and compliance acknowledgment completed successfully (Score: ${score}%).`,
        passed: true,
        score,
        correctCount,
        totalQuestions,
        certificate: {
          certificate_number: certNumber,
          compliance_hash: complianceHash,
          acknowledged_at: ack.acknowledged_at,
          employee_name: ack.employee_name,
          employee_id: ack.employee_id,
          campaign_title: campaign.title,
          campaign_code: campaign.campaign_code,
          score,
        },
      });
    } catch (err) {
      console.error("submitAcknowledgment error:", err);
      return res.status(500).json({ success: false, error: "Failed to submit InfoSec acknowledgment" });
    }
  },

  /**
   * getCampaignRoster
   * Returns organization-wide employee acknowledgment audit roster with status, scores, timestamps, and filters.
   */
  getCampaignRoster: async (req, res) => {
    try {
      const { campaign_id, status, department, search } = req.query;

      const where = {};
      if (campaign_id && campaign_id !== "All") {
        where.campaign_id = parseInt(campaign_id, 10);
      }
      if (status && status !== "All") {
        where.status = status;
      }
      if (department && department !== "All") {
        where.department = department;
      }
      if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        where[Op.or] = [
          sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_name")), "LIKE", term),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), "LIKE", term),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("certificate_number")), "LIKE", term),
        ];
      }

      const roster = await InfoSecAcknowledgment.findAll({
        where,
        include: [
          {
            model: InfoSecCampaign,
            as: "campaign",
            attributes: ["id", "campaign_code", "title", "category", "end_date", "status"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      return res.json({
        success: true,
        roster,
        count: roster.length,
      });
    } catch (err) {
      console.error("getCampaignRoster error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch compliance audit roster" });
    }
  },

  /**
   * sendReminders
   * Dispatches automated compliance reminders (real-time notification + email) to pending employees for a campaign.
   */
  sendReminders: async (req, res) => {
    try {
      const { id } = req.params; // campaign_id
      const { employee_id } = req.body;

      const campaign = await InfoSecCampaign.findByPk(id);
      if (!campaign) {
        return res.status(404).json({ success: false, error: "Campaign not found" });
      }

      const where = {
        campaign_id: campaign.id,
        status: { [Op.ne]: "Acknowledged" },
      };

      if (employee_id) {
        where.employee_id = String(employee_id).trim();
      }

      const pendingAcks = await InfoSecAcknowledgment.findAll({ where });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(campaign.end_date);
      endDate.setHours(0, 0, 0, 0);
      const daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));

      let remindersCount = 0;
      const processedEmpIds = new Set();

      for (const ack of pendingAcks) {
        const empCode = String(ack.employee_id || "").trim();
        if (!empCode || processedEmpIds.has(empCode)) continue;
        processedEmpIds.add(empCode);

        // Dashboard Notification
        await sendRealtimeNotification({
          recipient_id: empCode,
          title: "REMINDER: InfoSec Awareness Acknowledgment Required",
          message: `Action Required: Please complete your mandatory awareness training and sign the compliance acknowledgment for "${campaign.title}" before ${campaign.end_date} (${daysRemaining} days left).`,
          type: "announcement",
          category: "Announcements",
          priority: "high",
          link: "/infosec",
          source_module: "infosec_awareness",
          created_by: "InfoSec Compliance Officer",
        });

        // Email Notification
        if (ack.employee_email) {
          sendInfoSecCampaignEmail({
            to: ack.employee_email,
            employeeName: ack.employee_name,
            employeeId: empCode,
            campaignTitle: campaign.title,
            campaignCategory: campaign.category,
            deadline: campaign.end_date,
            daysRemaining,
            isReminder: true,
          }).catch((err) => {
            console.warn(`Could not dispatch reminder email to ${ack.employee_email}:`, err.message);
          });
        }

        remindersCount++;
      }

      return res.json({
        success: true,
        message: `Compliance reminder alerts dispatched to ${remindersCount} pending employee(s).`,
        count: remindersCount,
      });
    } catch (err) {
      console.error("sendReminders error:", err);
      return res.status(500).json({ success: false, error: "Failed to dispatch reminders" });
    }
  },

  /**
   * getAcknowledgmentCertificate
   * Returns verification payload for a generated completion certificate.
   */
  getAcknowledgmentCertificate: async (req, res) => {
    try {
      const { certNumber } = req.params;

      const ack = await InfoSecAcknowledgment.findOne({
        where: { certificate_number: certNumber },
        include: [
          {
            model: InfoSecCampaign,
            as: "campaign",
            attributes: ["id", "campaign_code", "title", "category", "start_date", "end_date"],
          },
        ],
      });

      if (!ack) {
        return res.status(404).json({ success: false, error: "Certificate not found or invalid" });
      }

      return res.json({
        success: true,
        certificate: {
          certificate_number: ack.certificate_number,
          compliance_hash: ack.compliance_hash,
          employee_name: ack.employee_name,
          employee_id: ack.employee_id,
          department: ack.department,
          designation: ack.designation,
          campaign_title: ack.campaign?.title,
          campaign_code: ack.campaign?.campaign_code,
          campaign_category: ack.campaign?.category,
          quiz_score: ack.quiz_score,
          acknowledged_at: ack.acknowledged_at,
          ip_address: ack.ip_address,
          status: "Verified & In-Force",
        },
      });
    } catch (err) {
      console.error("getAcknowledgmentCertificate error:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve certificate details" });
    }
  },
};

module.exports = InfoSecController;
