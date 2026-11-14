const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const {
  CandidatePreJoining,
  RecruitmentCandidate,
  Onboarding,
  RecruitmentOffer,
  Employee,
  User,
} = require("../config/db");

// Allowed HR roles
const HR_ALLOWED_ROLES = [
  "hr",
  "admin",
  "management",
  "ceo",
  "coo",
  "hrmanager",
  "accounts",
  "payroll",
];

const verifyHrAccess = (req, res) => {
  const role = (req.user?.role || "").toLowerCase().trim();
  if (!HR_ALLOWED_ROLES.includes(role)) {
    res.status(403).json({
      success: false,
      error: "Access denied. Pre-joining portal management is restricted to HR and Administrators.",
    });
    return false;
  }
  return true;
};

// 7 days in milliseconds
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 1. HR: Generate Pre-Joining Link (Valid for 7 days)
 */
exports.generatePreJoiningLink = async (req, res) => {
  try {
    if (!verifyHrAccess(req, res)) return;

    const {
      candidate_name,
      candidate_email,
      phone,
      designation,
      department,
      joining_date,
      work_location,
      candidate_id,
      onboarding_id,
      offer_id,
    } = req.body || {};

    if (!candidate_name || !candidate_email) {
      return res.status(400).json({
        success: false,
        error: "Candidate name and candidate email are required.",
      });
    }

    // Check if an active unexpired link already exists for this email
    const existing = await CandidatePreJoining.findOne({
      where: {
        candidate_email: candidate_email.toLowerCase().trim(),
        expires_at: { [Op.gt]: new Date() },
        status: { [Op.in]: ["PENDING_UPLOAD", "SUBMITTED", "UNDER_REVIEW"] },
      },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: "An active pre-joining portal link already exists for this candidate.",
        data: existing,
        token: existing.token,
        expires_at: existing.expires_at,
        alreadyActive: true,
      });
    }

    // Generate secure 64-char hex token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

    const record = await CandidatePreJoining.create({
      token,
      candidate_name: candidate_name.trim(),
      candidate_email: candidate_email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      designation: designation ? designation.trim() : "New Team Member",
      department: department ? department.trim() : "General",
      joining_date: joining_date || null,
      work_location: work_location || "Headquarters",
      candidate_id: candidate_id || null,
      onboarding_id: onboarding_id || null,
      offer_id: offer_id || null,
      expires_at: expiresAt,
      status: "PENDING_UPLOAD",
      created_by_name: req.user?.name || "HR Team",
      created_by_id: req.user?.id ? String(req.user.id) : null,
    });

    return res.status(201).json({
      success: true,
      message: "Pre-joining portal link generated successfully. Link is valid for 7 days.",
      data: record,
      token: record.token,
      expires_at: record.expires_at,
    });
  } catch (error) {
    console.error("Error generating pre-joining link:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate pre-joining link: " + error.message,
    });
  }
};

/**
 * 2. Public: Fetch Candidate Portal Details & Validate 7-Day Expiration
 */
exports.publicGetPortalData = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: "Link token is missing." });
    }

    const record = await CandidatePreJoining.findOne({
      where: { token },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        notFound: true,
        error: "Invalid pre-joining link. Please check the URL or contact HR.",
      });
    }

    const now = new Date();
    const isExpired = now > new Date(record.expires_at);

    // Auto-update status to EXPIRED if past 7 days and still pending upload
    if (isExpired && record.status === "PENDING_UPLOAD") {
      await record.update({ status: "EXPIRED" });
    }

    if (isExpired) {
      return res.status(200).json({
        success: false,
        expired: true,
        message:
          "This pre-joining upload link has expired (validity was 7 days from issue). Please contact your HR representative to request a renewed upload link.",
        data: {
          id: record.id,
          candidate_name: record.candidate_name,
          candidate_email: record.candidate_email,
          designation: record.designation,
          joining_date: record.joining_date,
          expires_at: record.expires_at,
          status: "EXPIRED",
        },
      });
    }

    // Return safe data for candidate to fill / preview
    return res.status(200).json({
      success: true,
      expired: false,
      data: {
        id: record.id,
        token: record.token,
        candidate_name: record.candidate_name,
        candidate_email: record.candidate_email,
        phone: record.phone,
        designation: record.designation,
        department: record.department,
        joining_date: record.joining_date,
        work_location: record.work_location,
        expires_at: record.expires_at,
        status: record.status,
        submitted_at: record.submitted_at,
        personal_details: record.personal_details || {},
        bank_details: record.bank_details || {},
        kyc_documents: record.kyc_documents || {},
        prior_employment: record.prior_employment || {},
        educational_documents: record.educational_documents || {},
        digital_signature_name: record.digital_signature_name,
        declaration_agreed: record.declaration_agreed,
      },
    });
  } catch (error) {
    console.error("Error fetching public pre-joining portal:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load candidate portal: " + error.message,
    });
  }
};

/**
 * 3. Public: Upload Single Document for Pre-Joining Portal
 */
exports.publicUploadDoc = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: "Link token is required." });
    }

    const record = await CandidatePreJoining.findOne({ where: { token } });
    if (!record) {
      return res.status(404).json({ success: false, error: "Candidate pre-joining record not found." });
    }

    if (new Date() > new Date(record.expires_at)) {
      return res.status(403).json({
        success: false,
        expired: true,
        error: "This upload link has expired. Uploads are closed.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file provided for upload." });
    }

    const filename = req.file.filename;
    const fileUrl = `/uploads/${filename}`;

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully.",
      fileUrl,
      filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Error in public document upload:", error);
    return res.status(500).json({
      success: false,
      error: "File upload failed: " + error.message,
    });
  }
};

/**
 * 4. Public: Submit Complete Pre-Joining Details & Declaration
 */
exports.publicSubmitPortal = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: "Link token is missing." });
    }

    const record = await CandidatePreJoining.findOne({ where: { token } });
    if (!record) {
      return res.status(404).json({ success: false, error: "Candidate pre-joining record not found." });
    }

    if (new Date() > new Date(record.expires_at)) {
      await record.update({ status: "EXPIRED" });
      return res.status(403).json({
        success: false,
        expired: true,
        error: "This pre-joining upload link has expired (7-day validity passed). Contact HR.",
      });
    }

    const {
      personal_details = {},
      bank_details = {},
      kyc_documents = {},
      prior_employment = {},
      educational_documents = {},
      digital_signature_name,
      declaration_agreed,
    } = req.body || {};

    if (!digital_signature_name || !declaration_agreed) {
      return res.status(400).json({
        success: false,
        error: "Digital signature and declaration agreement are required before final submission.",
      });
    }

    // Required fields check: PAN and Aadhaar
    if (!kyc_documents.pan_number || !kyc_documents.aadhaar_number) {
      return res.status(400).json({
        success: false,
        error: "PAN number and Aadhaar number are mandatory for verification.",
      });
    }

    // Required fields check: Bank Account & IFSC
    if (!bank_details.account_number || !bank_details.ifsc_code) {
      return res.status(400).json({
        success: false,
        error: "Bank Account Number and IFSC Code are mandatory for payroll processing.",
      });
    }

    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    await record.update({
      personal_details,
      bank_details,
      kyc_documents,
      prior_employment,
      educational_documents,
      digital_signature_name: digital_signature_name.trim(),
      declaration_agreed: Boolean(declaration_agreed),
      status: "SUBMITTED",
      submitted_at: new Date(),
      submission_ip: String(clientIp),
      submission_user_agent: String(userAgent),
    });

    return res.status(200).json({
      success: true,
      message: "Pre-joining documents submitted successfully! Your submission has been received by HR.",
      data: {
        id: record.id,
        candidate_name: record.candidate_name,
        submitted_at: record.submitted_at,
        status: record.status,
      },
    });
  } catch (error) {
    console.error("Error in candidate portal submission:", error);
    return res.status(500).json({
      success: false,
      error: "Submission failed: " + error.message,
    });
  }
};

/**
 * 5. HR: Get All Pre-Joining Records (With Search & Status Filters)
 */
exports.getAllPreJoiningLinks = async (req, res) => {
  try {
    if (!verifyHrAccess(req, res)) return;

    const { status, search, limit = 50, page = 1 } = req.query;

    const where = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { candidate_name: { [Op.iLike]: q } },
        { candidate_email: { [Op.iLike]: q } },
        { designation: { [Op.iLike]: q } },
        { department: { [Op.iLike]: q } },
      ];
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const { count, rows } = await CandidatePreJoining.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      offset,
    });

    const now = new Date();

    // Attach countdown metrics
    const enriched = rows.map((r) => {
      const expDate = new Date(r.expires_at);
      const isPast = now > expDate;
      const msLeft = expDate - now;
      const hoursLeft = isPast ? 0 : Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
      const daysLeft = isPast ? 0 : Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));

      // Count uploaded documents
      let docsCount = 0;
      if (r.kyc_documents?.aadhaar_doc_url) docsCount += 1;
      if (r.kyc_documents?.pan_doc_url) docsCount += 1;
      if (r.kyc_documents?.photo_url) docsCount += 1;
      if (r.bank_details?.cheque_doc_url) docsCount += 1;
      if (r.prior_employment?.relieving_letter_url) docsCount += 1;
      if (r.prior_employment?.experience_cert_url) docsCount += 1;
      if (r.educational_documents?.marksheet_doc_url) docsCount += 1;

      return {
        ...r.toJSON(),
        isExpired: isPast,
        hoursLeft,
        daysLeft,
        docsCount,
      };
    });

    // Summary statistics
    const totalCount = await CandidatePreJoining.count();
    const pendingCount = await CandidatePreJoining.count({ where: { status: "PENDING_UPLOAD" } });
    const submittedCount = await CandidatePreJoining.count({ where: { status: "SUBMITTED" } });
    const verifiedCount = await CandidatePreJoining.count({ where: { status: "VERIFIED" } });
    const expiredCount = await CandidatePreJoining.count({
      where: {
        [Op.or]: [
          { status: "EXPIRED" },
          { expires_at: { [Op.lt]: now }, status: "PENDING_UPLOAD" },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      data: enriched,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / parseInt(limit, 10)),
      },
      stats: {
        total: totalCount,
        pending: pendingCount,
        submitted: submittedCount,
        verified: verifiedCount,
        expired: expiredCount,
      },
    });
  } catch (error) {
    console.error("Error fetching pre-joining links:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load pre-joining links: " + error.message,
    });
  }
};

/**
 * 6. HR: Get Pre-Joining Record by ID (Full Details & Document URLs)
 */
exports.getPreJoiningById = async (req, res) => {
  try {
    if (!verifyHrAccess(req, res)) return;

    const { id } = req.params;
    const record = await CandidatePreJoining.findByPk(id);

    if (!record) {
      return res.status(404).json({ success: false, error: "Record not found." });
    }

    const now = new Date();
    const expDate = new Date(record.expires_at);
    const isPast = now > expDate;
    const msLeft = expDate - now;
    const hoursLeft = isPast ? 0 : Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));

    return res.status(200).json({
      success: true,
      data: {
        ...record.toJSON(),
        isExpired: isPast,
        hoursLeft,
      },
    });
  } catch (error) {
    console.error("Error fetching pre-joining record:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load pre-joining details: " + error.message,
    });
  }
};

/**
 * 7. HR: Regenerate / Extend Pre-Joining Link (Resets 7-day validity)
 */
exports.regeneratePreJoiningLink = async (req, res) => {
  try {
    if (!verifyHrAccess(req, res)) return;

    const { id } = req.params;
    const record = await CandidatePreJoining.findByPk(id);

    if (!record) {
      return res.status(404).json({ success: false, error: "Record not found." });
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + SEVEN_DAYS_MS);

    await record.update({
      token: newToken,
      expires_at: newExpiresAt,
      status: record.status === "EXPIRED" ? "PENDING_UPLOAD" : record.status,
      created_by_name: req.user?.name || record.created_by_name,
    });

    return res.status(200).json({
      success: true,
      message: "Pre-joining portal link regenerated with fresh 7-day validity.",
      data: record,
      token: record.token,
      expires_at: record.expires_at,
    });
  } catch (error) {
    console.error("Error regenerating pre-joining link:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to regenerate pre-joining link: " + error.message,
    });
  }
};

/**
 * 8. HR: Verify or Reject Submitted Candidate Documents
 */
exports.verifyPreJoiningDocs = async (req, res) => {
  try {
    if (!verifyHrAccess(req, res)) return;

    const { id } = req.params;
    const { status, remarks } = req.body || {};

    if (!["VERIFIED", "REJECTED", "UNDER_REVIEW"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be 'VERIFIED', 'REJECTED', or 'UNDER_REVIEW'.",
      });
    }

    const record = await CandidatePreJoining.findByPk(id);
    if (!record) {
      return res.status(404).json({ success: false, error: "Record not found." });
    }

    await record.update({
      status,
      verification_remarks: remarks || null,
      verified_at: new Date(),
      verified_by_name: req.user?.name || "HR Administrator",
    });

    return res.status(200).json({
      success: true,
      message: `Documents marked as ${status} successfully.`,
      data: record,
    });
  } catch (error) {
    console.error("Error verifying pre-joining documents:", error);
    return res.status(500).json({
      success: false,
      error: "Verification update failed: " + error.message,
    });
  }
};

/**
 * 9. HR: 1-Click Sync/Import to Onboarding Checklist and Employee Profile
 */
exports.syncToOnboarding = async (req, res) => {
  try {
    if (!verifyHrAccess(req, res)) return;

    const { id } = req.params;
    const record = await CandidatePreJoining.findByPk(id);

    if (!record) {
      return res.status(404).json({ success: false, error: "Record not found." });
    }

    const {
      candidate_email,
      personal_details = {},
      bank_details = {},
      kyc_documents = {},
      prior_employment = {},
      educational_documents = {},
    } = record;

    let syncedOnboarding = false;
    let syncedEmployee = false;

    // 1. Find or sync to Onboarding record
    let onboarding = null;
    if (record.onboarding_id) {
      onboarding = await Onboarding.findByPk(record.onboarding_id);
    }
    if (!onboarding && record.candidate_id) {
      onboarding = await Onboarding.findOne({ where: { candidate_id: record.candidate_id } });
    }
    if (!onboarding && candidate_email) {
      const cand = await RecruitmentCandidate.findOne({
        where: { email: candidate_email.toLowerCase() },
      });
      if (cand) {
        onboarding = await Onboarding.findOne({ where: { candidate_id: cand.id } });
      }
    }

    if (onboarding) {
      // Build updated documents checklist
      const currentDocs = onboarding.documents || {};
      const updatedDocs = {
        ...currentDocs,
        aadhaar_doc: kyc_documents.aadhaar_doc_url || currentDocs.aadhaar_doc,
        pan_doc: kyc_documents.pan_doc_url || currentDocs.pan_doc,
        photo: kyc_documents.photo_url || currentDocs.photo,
        bank_cheque: bank_details.cheque_doc_url || currentDocs.bank_cheque,
        relieving_letter: prior_employment.relieving_letter_url || currentDocs.relieving_letter,
        experience_cert: prior_employment.experience_cert_url || currentDocs.experience_cert,
        education_marksheet: educational_documents.marksheet_doc_url || currentDocs.education_marksheet,
        verified_via_prejoining: true,
        prejoining_id: record.id,
      };

      await onboarding.update({
        documents: updatedDocs,
      });
      syncedOnboarding = true;
    }

    // 2. Find and update Employee record (if matching email exists)
    if (candidate_email) {
      const emp = await Employee.findOne({
        where: {
          [Op.or]: [
            { email: { [Op.iLike]: candidate_email.toLowerCase() } },
            { work_email: { [Op.iLike]: candidate_email.toLowerCase() } },
          ],
        },
      });

      if (emp) {
        const empUpdate = {};
        if (kyc_documents.pan_number) empUpdate.pan_no = kyc_documents.pan_number;
        if (kyc_documents.aadhaar_number) empUpdate.aadhaar_no = kyc_documents.aadhaar_number;
        if (kyc_documents.photo_url) empUpdate.profile_photo = kyc_documents.photo_url;
        if (personal_details.blood_group) empUpdate.blood_group = personal_details.blood_group;
        if (personal_details.emergency_contact_phone) {
          empUpdate.emergency_contact = `${personal_details.emergency_contact_name || "Contact"} (${personal_details.emergency_contact_phone})`;
        }
        if (bank_details.account_number) {
          empUpdate.bank_details = JSON.stringify({
            bankName: bank_details.bank_name || "",
            accountNumber: bank_details.account_number || "",
            ifscCode: bank_details.ifsc_code || "",
            accountHolderName: bank_details.account_holder_name || record.candidate_name,
            branchName: bank_details.branch_name || "",
            chequeDoc: bank_details.cheque_doc_url || "",
          });
        }

        await emp.update(empUpdate);
        syncedEmployee = true;
      }
    }

    await record.update({
      synced_to_onboarding: true,
      synced_at: new Date(),
      status: "VERIFIED",
    });

    return res.status(200).json({
      success: true,
      message: `Documents synchronized successfully! (Onboarding: ${syncedOnboarding ? "Updated" : "Created/Linked"}, Employee Profile: ${syncedEmployee ? "Updated" : "Pending Profile Creation"})`,
      syncedOnboarding,
      syncedEmployee,
    });
  } catch (error) {
    console.error("Error syncing pre-joining documents:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to synchronize documents: " + error.message,
    });
  }
};

/**
 * 10. HR: Delete Pre-Joining Link Record
 */
exports.deletePreJoiningLink = async (req, res) => {
  try {
    if (!verifyHrAccess(req, res)) return;

    const { id } = req.params;
    const record = await CandidatePreJoining.findByPk(id);

    if (!record) {
      return res.status(404).json({ success: false, error: "Record not found." });
    }

    await record.destroy();
    return res.status(200).json({
      success: true,
      message: "Pre-joining record deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting pre-joining link:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete record: " + error.message,
    });
  }
};
