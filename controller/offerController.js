const {
  RecruitmentOffer,
  RecruitmentCandidate,
  RecruitmentRequisition,
  User,
  sequelize
} = require("../config/db");
const { Op } = require("sequelize");
const crypto = require("crypto");
const { sendMail } = require("../utils/mailer");

// Helper to pad number
const pad = (num, size = 4) => {
  let s = String(num);
  while (s.length < size) s = "0" + s;
  return s;
};

// Helper: Calculate standard Indian Salary Breakdown from Annual CTC
const computeSalaryStructure = (annualCtc, bonus = 0) => {
  const ctc = parseFloat(annualCtc) || 0;
  const annualBonus = parseFloat(bonus) || 0;
  const fixedAnnual = Math.max(0, ctc - annualBonus);
  const monthlyGross = parseFloat((fixedAnnual / 12).toFixed(2));

  // 50% Basic
  const monthlyBasic = parseFloat((monthlyGross * 0.5).toFixed(2));
  // 40% of Basic as HRA (Metro standard is 50%, Non-metro 40%)
  const monthlyHra = parseFloat((monthlyBasic * 0.4).toFixed(2));
  // Statutory Conveyance & Medical allowances
  const monthlyConveyance = monthlyGross >= 25000 ? 1600 : 800;
  const monthlyMedical = monthlyGross >= 25000 ? 1250 : 500;

  // Employer PF contribution (12% of basic, capped at 1800 per month for statutory)
  const monthlyEmployerPf = parseFloat(Math.min(1800, monthlyBasic * 0.12).toFixed(2));
  const annualEmployerPf = parseFloat((monthlyEmployerPf * 12).toFixed(2));

  // Special Allowance balances the gross
  const allocated = monthlyBasic + monthlyHra + monthlyConveyance + monthlyMedical;
  const monthlySpecial = parseFloat(Math.max(0, monthlyGross - allocated).toFixed(2));

  return {
    annual_ctc: ctc,
    monthly_gross: monthlyGross,
    monthly_basic: monthlyBasic,
    monthly_hra: monthlyHra,
    monthly_conveyance: monthlyConveyance,
    monthly_medical: monthlyMedical,
    monthly_special_allowance: monthlySpecial,
    employer_pf_monthly: monthlyEmployerPf,
    employer_pf_annual: annualEmployerPf,
    annual_performance_bonus: annualBonus,
  };
};

module.exports = {
  // GET /api/auth/offers
  // Lists all offers with search and filter
  async getOffers(req, res) {
    try {
      const { status, approval_status, department, search } = req.query;
      let where = {};

      if (status && status !== "ALL") {
        where.offer_status = status;
      }
      if (approval_status && approval_status !== "ALL") {
        where.approval_status = approval_status;
      }
      if (department && department !== "ALL" && department !== "All") {
        where.department = department;
      }
      if (search) {
        where[Op.or] = [
          { offer_code: { [Op.iLike]: `%${search}%` } },
          { candidate_name: { [Op.iLike]: `%${search}%` } },
          { candidate_email: { [Op.iLike]: `%${search}%` } },
          { designation: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const offers = await RecruitmentOffer.findAll({
        where,
        include: [
          {
            model: RecruitmentCandidate,
            as: "candidate",
            attributes: ["id", "candidate_name", "email", "phone", "current_company", "experience_years", "interview_stage"],
          },
          {
            model: RecruitmentRequisition,
            as: "requisition",
            attributes: ["id", "requisition_code", "position", "department", "max_salary"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Summary counts
      const allOffers = await RecruitmentOffer.findAll({ attributes: ["offer_status", "approval_status"] });
      const stats = {
        total: allOffers.length,
        pending_approval: allOffers.filter(o => o.approval_status === "PENDING_HOD_APPROVAL" || o.approval_status === "PENDING_MANAGEMENT_APPROVAL").length,
        approved: allOffers.filter(o => o.approval_status === "APPROVED" && o.offer_status === "APPROVED").length,
        sent: allOffers.filter(o => o.offer_status === "SENT_TO_CANDIDATE").length,
        accepted: allOffers.filter(o => o.offer_status === "ACCEPTED").length,
        declined: allOffers.filter(o => o.offer_status === "DECLINED").length,
      };

      return res.json({
        success: true,
        count: offers.length,
        stats,
        data: offers,
      });
    } catch (err) {
      console.error("Get offers error:", err);
      return res.status(500).json({ error: "Failed to fetch offers: " + err.message });
    }
  },

  // GET /api/auth/offers/:id
  async getOfferById(req, res) {
    try {
      const { id } = req.params;
      const offer = await RecruitmentOffer.findByPk(id, {
        include: [
          {
            model: RecruitmentCandidate,
            as: "candidate",
          },
          {
            model: RecruitmentRequisition,
            as: "requisition",
          },
        ],
      });

      if (!offer) {
        return res.status(404).json({ error: "Offer record not found" });
      }

      return res.json({ success: true, data: offer });
    } catch (err) {
      console.error("Get offer by id error:", err);
      return res.status(500).json({ error: "Failed to fetch offer details: " + err.message });
    }
  },

  // POST /api/auth/offers/calculate-structure
  async calculateStructure(req, res) {
    try {
      const { annual_ctc, bonus } = req.body;
      if (!annual_ctc) {
        return res.status(400).json({ error: "Annual CTC is required" });
      }
      const breakdown = computeSalaryStructure(annual_ctc, bonus);
      return res.json({ success: true, breakdown });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  // POST /api/auth/offers
  // Create a new offer
  async createOffer(req, res) {
    try {
      const {
        candidate_id,
        requisition_id,
        annual_ctc,
        joining_date,
        offer_expiry_date,
        work_location = "Kolkata HQ",
        reporting_manager,
        employment_type = "Full Time (Probation)",
        probation_period_months = 6,
        notice_period_days = 30,
        annual_performance_bonus = 0,
        other_benefits_notes,
        terms_conditions,
        official_signatory_name = "Ms. Priyanka Mukherjee",
        official_signatory_title = "Head - Human Resources",
        submit_for_approval = false,
      } = req.body;

      if (!candidate_id || !requisition_id) {
        return res.status(400).json({ error: "Candidate and Requisition are required" });
      }
      if (!annual_ctc || !joining_date) {
        return res.status(400).json({ error: "Annual CTC and Joining Date are required" });
      }

      const candidate = await RecruitmentCandidate.findByPk(candidate_id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const requisition = await RecruitmentRequisition.findByPk(requisition_id);
      if (!requisition) {
        return res.status(404).json({ error: "Requisition not found" });
      }

      // Check if candidate already has an active offer
      const existing = await RecruitmentOffer.findOne({
        where: {
          candidate_id,
          offer_status: { [Op.notIn]: ["DECLINED", "EXPIRED"] },
        },
      });
      if (existing) {
        return res.status(400).json({
          error: `Candidate already has an active offer (${existing.offer_code} - ${existing.offer_status})`,
        });
      }

      // Compute unique offer code
      const count = await RecruitmentOffer.count();
      const year = new Date().getFullYear();
      const offer_code = `ZTL/OFF/${year}/${pad(count + 1, 4)}`;

      // Generate random secure token for candidate digital acceptance
      const acceptance_token = crypto.randomBytes(24).toString("hex");

      // Auto-compute salary structure
      const salary = computeSalaryStructure(annual_ctc, annual_performance_bonus);

      // Default expiry date: 7 days from now if not given
      const expiry = offer_expiry_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Determine initial approval status
      const initialApprovalStatus = submit_for_approval ? "PENDING_HOD_APPROVAL" : "DRAFT";
      const initialApprovalStage = submit_for_approval ? "HOD" : "DRAFT";
      const initialOfferStatus = submit_for_approval ? "APPROVAL_PENDING" : "DRAFT";

      const offer = await RecruitmentOffer.create({
        offer_code,
        candidate_id,
        requisition_id,
        candidate_name: candidate.candidate_name,
        candidate_email: candidate.email,
        candidate_phone: candidate.phone,
        department: requisition.department,
        designation: requisition.position,
        reporting_manager: reporting_manager || requisition.hod_name || "Department Head",
        work_location,
        employment_type,
        probation_period_months: parseInt(probation_period_months, 10) || 6,
        notice_period_days: parseInt(notice_period_days, 10) || 30,
        joining_date,
        offer_expiry_date: expiry,
        annual_ctc: salary.annual_ctc,
        monthly_gross: salary.monthly_gross,
        monthly_basic: salary.monthly_basic,
        monthly_hra: salary.monthly_hra,
        monthly_special_allowance: salary.monthly_special_allowance,
        monthly_conveyance: salary.monthly_conveyance,
        monthly_medical: salary.monthly_medical,
        annual_performance_bonus: salary.annual_performance_bonus,
        employer_pf_annual: salary.employer_pf_annual,
        other_benefits_notes: other_benefits_notes || "Comprehensive Mediclaim coverage for self & family, Annual Performance Bonus.",
        salary_breakdown_json: salary,
        terms_conditions: terms_conditions || "Standard corporate terms apply including background verification contingency, 6 months probation, and 30 days notice period.",
        approval_status: initialApprovalStatus,
        current_approval_stage: initialApprovalStage,
        offer_status: initialOfferStatus,
        acceptance_token,
        official_signatory_name,
        official_signatory_title,
        created_by_id: req.user?.employee_id || null,
        created_by_name: req.user?.name || "HR Recruiter",
      });

      // Update candidate stage
      await candidate.update({
        interview_stage: submit_for_approval ? "OFFER_PREPARED" : "SELECTED",
      });

      return res.status(201).json({
        success: true,
        message: submit_for_approval
          ? "Offer created and submitted for HOD approval!"
          : "Offer drafted successfully",
        data: offer,
      });
    } catch (err) {
      console.error("Create offer error:", err);
      return res.status(500).json({ error: "Failed to create offer: " + err.message });
    }
  },

  // PUT /api/auth/offers/:id
  async updateOffer(req, res) {
    try {
      const { id } = req.params;
      const offer = await RecruitmentOffer.findByPk(id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      if (offer.offer_status === "SENT_TO_CANDIDATE" || offer.offer_status === "ACCEPTED") {
        return res.status(400).json({ error: "Cannot modify offer after it has been released to candidate" });
      }

      const {
        annual_ctc,
        joining_date,
        offer_expiry_date,
        work_location,
        reporting_manager,
        employment_type,
        probation_period_months,
        notice_period_days,
        annual_performance_bonus,
        other_benefits_notes,
        terms_conditions,
        submit_for_approval,
      } = req.body;

      let updates = { ...req.body };

      if (annual_ctc) {
        const salary = computeSalaryStructure(annual_ctc, annual_performance_bonus || offer.annual_performance_bonus);
        updates = {
          ...updates,
          ...salary,
          salary_breakdown_json: salary,
        };
      }

      if (submit_for_approval && offer.approval_status !== "APPROVED") {
        updates.approval_status = "PENDING_HOD_APPROVAL";
        updates.current_approval_stage = "HOD";
        updates.offer_status = "APPROVAL_PENDING";
        updates.hod_decision = "PENDING";
        updates.management_decision = "PENDING";
      }

      await offer.update(updates);

      return res.json({
        success: true,
        message: "Offer updated successfully",
        data: offer,
      });
    } catch (err) {
      console.error("Update offer error:", err);
      return res.status(500).json({ error: "Failed to update offer: " + err.message });
    }
  },

  // POST /api/auth/offers/:id/approve
  // Handles HOD or Management decision in approval chain
  async approveOffer(req, res) {
    try {
      const { id } = req.params;
      const { decision, comments } = req.body; // decision: "APPROVED" | "REJECTED"
      const approverName = req.user?.name || "Approver";
      const approverId = req.user?.employee_id || "EMP";

      if (!decision || !["APPROVED", "REJECTED"].includes(decision)) {
        return res.status(400).json({ error: "Decision must be APPROVED or REJECTED" });
      }

      const offer = await RecruitmentOffer.findByPk(id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      const stage = offer.current_approval_stage;

      if (stage === "HOD") {
        if (decision === "APPROVED") {
          await offer.update({
            hod_id: approverId,
            hod_name: approverName,
            hod_decision: "APPROVED",
            hod_decision_at: new Date(),
            hod_comments: comments || "Approved by Department Head",
            current_approval_stage: "MANAGEMENT",
            approval_status: "PENDING_MANAGEMENT_APPROVAL",
          });
          return res.json({
            success: true,
            message: "HOD approved. Offer routed to Management / Executive for final sign-off.",
            data: offer,
          });
        } else {
          await offer.update({
            hod_id: approverId,
            hod_name: approverName,
            hod_decision: "REJECTED",
            hod_decision_at: new Date(),
            hod_comments: comments || "Rejected by HOD",
            current_approval_stage: "REJECTED",
            approval_status: "REJECTED",
            offer_status: "DRAFT",
          });
          return res.json({
            success: true,
            message: "Offer rejected by HOD and returned to HR for revisions.",
            data: offer,
          });
        }
      } else if (stage === "MANAGEMENT" || stage === "COMPLETED") {
        if (decision === "APPROVED") {
          await offer.update({
            management_id: approverId,
            management_name: approverName,
            management_decision: "APPROVED",
            management_decision_at: new Date(),
            management_comments: comments || "Approved by Management",
            current_approval_stage: "COMPLETED",
            approval_status: "APPROVED",
            offer_status: "APPROVED", // Ready to send to candidate!
          });
          return res.json({
            success: true,
            message: "Management approval completed! Offer is now verified and ready to release to the candidate.",
            data: offer,
          });
        } else {
          await offer.update({
            management_id: approverId,
            management_name: approverName,
            management_decision: "REJECTED",
            management_decision_at: new Date(),
            management_comments: comments || "Rejected by Management",
            current_approval_stage: "REJECTED",
            approval_status: "REJECTED",
            offer_status: "DRAFT",
          });
          return res.json({
            success: true,
            message: "Offer rejected by Management.",
            data: offer,
          });
        }
      } else {
        return res.status(400).json({
          error: `Offer is currently not in an approvable stage (current: ${stage}, approval_status: ${offer.approval_status})`,
        });
      }
    } catch (err) {
      console.error("Approve offer error:", err);
      return res.status(500).json({ error: "Failed to process approval: " + err.message });
    }
  },

  // POST /api/auth/offers/:id/send
  // Release offer to candidate
  async sendOfferToCandidate(req, res) {
    try {
      const { id } = req.params;
      const offer = await RecruitmentOffer.findByPk(id, {
        include: [{ model: RecruitmentCandidate, as: "candidate" }],
      });

      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      if (offer.approval_status !== "APPROVED") {
        return res.status(400).json({
          error: "Cannot release offer to candidate before full approval chain is completed (Current: " + offer.approval_status + ")",
        });
      }

      // Ensure acceptance token exists
      if (!offer.acceptance_token) {
        offer.acceptance_token = crypto.randomBytes(24).toString("hex");
      }

      await offer.update({
        offer_status: "SENT_TO_CANDIDATE",
        sent_to_candidate_at: new Date(),
        sent_by_id: req.user?.employee_id || null,
        sent_by_name: req.user?.name || "HR Recruiter",
      });

      if (offer.candidate) {
        await offer.candidate.update({
          interview_stage: "OFFERED",
        });
      }

      // Candidate portal link
      const acceptanceUrl = `${req.headers.origin || "http://localhost:5173"}/offer-acceptance/${offer.acceptance_token}`;

      // Email dispatch to candidate
      let emailSent = false;
      try {
        await sendMail({
          to: offer.candidate_email,
          subject: `Employment Offer: ${offer.designation} at Zentelex Pvt. Ltd.`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 20px;">Congratulations, ${offer.candidate_name}!</h1>
                <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.9;">Formal Employment Offer Letter</p>
              </div>
              <div style="padding: 24px;">
                <p>Dear <strong>${offer.candidate_name}</strong>,</p>
                <p>We are delighted to extend an offer of employment for the position of <strong>${offer.designation}</strong> in the <strong>${offer.department}</strong> department at Zentelex Pvt. Ltd.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; color: #64748b;">Annual CTC:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right;">Rs. ${parseFloat(offer.annual_ctc).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; color: #64748b;">Proposed Joining Date:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right;">${offer.joining_date}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; color: #64748b;">Work Location:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right;">${offer.work_location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Offer Validity Until:</td>
                    <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #e11d48;">${offer.offer_expiry_date}</td>
                  </tr>
                </table>

                <p>Please review your complete compensation annexure, download your formal Offer Letter, and confirm your digital acceptance via our secure candidate portal below:</p>
                
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${acceptanceUrl}" style="background-color: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
                    View &amp; Accept Offer Online
                  </a>
                </div>

                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                  Or copy and paste this link in your browser:<br/>
                  <a href="${acceptanceUrl}" style="color: #4f46e5;">${acceptanceUrl}</a>
                </p>
              </div>
              <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                Zentelex Pvt. Ltd. • Human Resources Department
              </div>
            </div>
          `,
        });
        emailSent = true;
      } catch (mailErr) {
        console.warn("Could not dispatch candidate email notification:", mailErr.message);
      }

      return res.json({
        success: true,
        message: "Offer letter released to candidate!",
        emailSent,
        acceptanceUrl,
        data: offer,
      });
    } catch (err) {
      console.error("Send offer error:", err);
      return res.status(500).json({ error: "Failed to release offer: " + err.message });
    }
  },

  // GET /api/auth/offers/candidate-view/:token (Public)
  async getCandidateOfferByToken(req, res) {
    try {
      const { token } = req.params;
      const offer = await RecruitmentOffer.findOne({
        where: { acceptance_token: token },
        attributes: [
          "id",
          "offer_code",
          "candidate_name",
          "candidate_email",
          "department",
          "designation",
          "reporting_manager",
          "work_location",
          "employment_type",
          "probation_period_months",
          "notice_period_days",
          "joining_date",
          "offer_expiry_date",
          "annual_ctc",
          "monthly_gross",
          "monthly_basic",
          "monthly_hra",
          "monthly_special_allowance",
          "monthly_conveyance",
          "monthly_medical",
          "annual_performance_bonus",
          "employer_pf_annual",
          "other_benefits_notes",
          "salary_breakdown_json",
          "terms_conditions",
          "offer_status",
          "candidate_decision",
          "candidate_decided_at",
          "candidate_signature_name",
          "candidate_confirmed_joining_date",
          "official_signatory_name",
          "official_signatory_title",
        ],
      });

      if (!offer) {
        return res.status(404).json({ error: "Invalid or expired offer acceptance link." });
      }

      const isExpired = new Date(offer.offer_expiry_date) < new Date(new Date().toISOString().split("T")[0]) && offer.offer_status === "SENT_TO_CANDIDATE";

      return res.json({
        success: true,
        isExpired,
        data: offer,
      });
    } catch (err) {
      console.error("Get candidate offer error:", err);
      return res.status(500).json({ error: "Failed to retrieve offer details" });
    }
  },

  // POST /api/auth/offers/candidate-respond/:token (Public)
  async candidateRespondOffer(req, res) {
    try {
      const { token } = req.params;
      const { decision, signature_name, confirmed_joining_date, comments } = req.body;

      if (!decision || !["ACCEPTED", "DECLINED"].includes(decision)) {
        return res.status(400).json({ error: "Response must be ACCEPTED or DECLINED" });
      }

      const offer = await RecruitmentOffer.findOne({
        where: { acceptance_token: token },
        include: [{ model: RecruitmentCandidate, as: "candidate" }],
      });

      if (!offer) {
        return res.status(404).json({ error: "Invalid offer link." });
      }

      if (offer.candidate_decision !== "PENDING" && offer.offer_status !== "SENT_TO_CANDIDATE") {
        return res.status(400).json({
          error: `Offer response has already been submitted on ${offer.candidate_decided_at ? new Date(offer.candidate_decided_at).toLocaleDateString() : ""} (Status: ${offer.offer_status})`,
        });
      }

      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "";

      if (decision === "ACCEPTED") {
        if (!signature_name || !signature_name.trim()) {
          return res.status(400).json({ error: "Please enter your full legal name as your digital signature." });
        }

        await offer.update({
          offer_status: "ACCEPTED",
          candidate_decision: "ACCEPTED",
          candidate_decided_at: new Date(),
          candidate_signature_name: signature_name.trim(),
          candidate_confirmed_joining_date: confirmed_joining_date || offer.joining_date,
          candidate_comments: comments || "Offer accepted digitally.",
          candidate_ip_address: clientIp,
          candidate_user_agent: userAgent.substring(0, 255),
        });

        if (offer.candidate) {
          await offer.candidate.update({
            interview_stage: "JOINED",
          });
        }

        return res.json({
          success: true,
          message: "Congratulations! Your digital acceptance has been verified and recorded. Welcome to Zentelex!",
          data: offer,
        });
      } else {
        await offer.update({
          offer_status: "DECLINED",
          candidate_decision: "DECLINED",
          candidate_decided_at: new Date(),
          candidate_comments: comments || "Candidate declined the offer.",
          candidate_ip_address: clientIp,
        });

        if (offer.candidate) {
          await offer.candidate.update({
            interview_stage: "REJECTED",
          });
        }

        return res.json({
          success: true,
          message: "Thank you for notifying us. Your response has been recorded.",
          data: offer,
        });
      }
    } catch (err) {
      console.error("Candidate respond error:", err);
      return res.status(500).json({ error: "Failed to submit offer response: " + err.message });
    }
  },

  // DELETE /api/auth/offers/:id
  async deleteOffer(req, res) {
    try {
      const { id } = req.params;
      const offer = await RecruitmentOffer.findByPk(id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }

      if (offer.offer_status === "ACCEPTED" || offer.offer_status === "SENT_TO_CANDIDATE") {
        return res.status(400).json({ error: "Cannot delete offer in sent/accepted status" });
      }

      await offer.destroy();
      return res.json({ success: true, message: "Offer deleted successfully" });
    } catch (err) {
      console.error("Delete offer error:", err);
      return res.status(500).json({ error: "Failed to delete offer: " + err.message });
    }
  },
};

