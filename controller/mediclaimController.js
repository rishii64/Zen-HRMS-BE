const {
  MediclaimPolicy,
  MediclaimClaim,
  MediclaimHighlight,
  MediclaimHospital,
  Employee,
  User,
  sequelize
} = require("../config/db");
const { Op } = require("sequelize");

const DEFAULT_HIGHLIGHTS = [
  {
    title: "In-Patient Hospitalization",
    badge: "100% Covered",
    badge_color: "emerald",
    description: "Boarding, nursing care, doctor visits, medicines, oxygen, blood, surgical appliances up to the sum insured.",
    icon: "building",
    order_index: 1,
  },
  {
    title: "Pre & Post Hospitalization",
    badge: "30 & 60 Days",
    badge_color: "blue",
    description: "Medical expenses incurred 30 days before admission and up to 60 days post-discharge (consultations, scans, tests).",
    icon: "calendar",
    order_index: 2,
  },
  {
    title: "Day Care Treatments (500+ procedures)",
    badge: "Included",
    badge_color: "indigo",
    description: "Procedures requiring less than 24h hospitalization due to advanced technology (Cataract, Dialysis, Chemotherapy, Radiotherapy).",
    icon: "stethoscope",
    order_index: 3,
  },
  {
    title: "Maternity & Newborn Cover",
    badge: "Up to ₹75,000",
    badge_color: "rose",
    description: "Normal delivery up to ₹50,000 and Caesarean (C-section) up to ₹75,000. Newborn baby covered from Day 1.",
    icon: "heart",
    order_index: 4,
  },
  {
    title: "Room Rent & ICU Limits",
    badge: "Single Private / No ICU Cap",
    badge_color: "amber",
    description: "Single private A/C room allowed or 1% of Sum Insured per day. ICU charges covered without sub-limits.",
    icon: "shield",
    order_index: 5,
  },
];

const DEFAULT_HOSPITALS = [
  { name: "Apollo Hospitals & Heart Centre", city: "Mumbai", area: "CBD Belapur", helpline: "+91 22 3350 3350", hospital_type: "Super Specialty", cashless: true },
  { name: "Fortis Hiranandani Hospital", city: "Navi Mumbai", area: "Vashi", helpline: "+91 22 3919 9222", hospital_type: "Multi Specialty", cashless: true },
  { name: "Kokilaben Dhirubhai Ambani Hospital", city: "Mumbai", area: "Andheri West", helpline: "+91 22 4269 6969", hospital_type: "Quaternary Care", cashless: true },
  { name: "Lilavati Hospital & Research Centre", city: "Mumbai", area: "Bandra West", helpline: "+91 22 2675 1000", hospital_type: "Multi Specialty", cashless: true },
  { name: "Manipal Hospital", city: "Bengaluru", area: "Old Airport Rd", helpline: "+91 80 2502 4444", hospital_type: "Multi Specialty", cashless: true },
  { name: "Max Super Specialty Hospital", city: "Delhi NCR", area: "Saket", helpline: "+91 11 2651 5050", hospital_type: "Super Specialty", cashless: true },
  { name: "Medanta - The Medicity", city: "Gurugram", area: "Sector 38", helpline: "+91 124 414 1414", hospital_type: "Multi Specialty", cashless: true },
  { name: "IRIS MULTISPECIALITY HOSPITAL", city: "Kolkata", area: "Vidyasagar Colony", helpline: "+91 124 414 1414", hospital_type: "Multi Specialty", cashless: true },
];

const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  if (typeof str === "object") return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

const MediclaimController = {
  // GET /api/auth/mediclaim/my
  // Fetches current employee's policy, covered dependents, and claims history.
  // Automatically provisions a corporate group health policy if not already assigned.
  async getMyMediclaim(req, res) {
    try {
      const empId = req.user.employee_id;

      // Fetch employee profile details
      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      // Find or create policy
      let policy = await MediclaimPolicy.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      if (!policy) {
        const cleanEmpNum = empId.replace(/\D/g, "") || String(Math.floor(1000 + Math.random() * 9000));
        policy = await MediclaimPolicy.create({
          employee_id: empId,
          policy_number: `GHI-ZEN-${new Date().getFullYear()}-${cleanEmpNum.padStart(4, "0")}`,
          tpa_name: "Medi Assist TPA Services",
          insurance_company: "ICICI Lombard GIC Ltd",
          policy_start_date: `${new Date().getFullYear()}-04-01`,
          policy_end_date: `${new Date().getFullYear() + 1}-03-31`,
          sum_insured: 500000.0,
          plan_type: "Corporate Group Floater Plan (1+3)",
          emergency_helpline: "1800-425-9449 / 022-6692-2000",
          tpa_email: "claims@mediassist.in",
          status: "Active",
          enrolled_dependents: JSON.stringify([]),
        });
      }

      // Fetch employee's submitted claims
      const claims = await MediclaimClaim.findAll({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
        order: [["id", "DESC"]],
      });

      // Compute financial summary
      let totalClaimed = 0;
      let totalApproved = 0;
      let totalSettled = 0;

      const parsedClaims = claims.map((c) => {
        const claimObj = c.toJSON ? c.toJSON() : { ...c };
        claimObj.supporting_documents = safeJsonParse(claimObj.supporting_documents, []);
        totalClaimed += parseFloat(claimObj.claimed_amount) || 0;
        if (claimObj.approved_amount) {
          totalApproved += parseFloat(claimObj.approved_amount) || 0;
        }
        if (claimObj.settled_amount) {
          totalSettled += parseFloat(claimObj.settled_amount) || 0;
        }
        return claimObj;
      });

      const policyObj = policy.toJSON ? policy.toJSON() : { ...policy };
      policyObj.enrolled_dependents = safeJsonParse(policyObj.enrolled_dependents, []);

      const remainingCoverage = Math.max(0, policyObj.sum_insured - totalApproved);

      return res.json({
        success: true,
        policy: policyObj,
        claims: parsedClaims,
        employee: {
          name: emp?.name || `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim() || "Employee",
          employee_id: empId,
          dept: emp?.dept || emp?.department || "General",
          designation: emp?.designation || "Staff",
          email: emp?.email || "",
          phone: emp?.phone_no || emp?.phone || "",
          blood_group: emp?.blood_group || "N/A",
          gender: emp?.gender || "N/A",
          avatar: emp?.profile_photo || "",
        },
        summary: {
          sum_insured: policyObj.sum_insured,
          total_claimed: totalClaimed,
          total_approved: totalApproved,
          total_settled: totalSettled,
          remaining_coverage: remainingCoverage,
          dependents_count: policyObj.enrolled_dependents.length,
          claims_count: claims.length,
        },
      });
    } catch (err) {
      console.error("getMyMediclaim error:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve mediclaim details" });
    }
  },

  // POST /api/auth/mediclaim/dependents
  // Update enrolled dependents and nominee
  async updateDependents(req, res) {
    try {
      const empId = req.user.employee_id;
      const { enrolled_dependents, nominee_name, nominee_relation, nominee_contact } = req.body;

      let policy = await MediclaimPolicy.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      if (!policy) {
        return res.status(404).json({ success: false, error: "Mediclaim policy not found" });
      }

      if (Array.isArray(enrolled_dependents)) {
        policy.enrolled_dependents = JSON.stringify(enrolled_dependents);
      }
      if (nominee_name !== undefined) policy.nominee_name = nominee_name;
      if (nominee_relation !== undefined) policy.nominee_relation = nominee_relation;
      if (nominee_contact !== undefined) policy.nominee_contact = nominee_contact;

      await policy.save();

      const policyObj = policy.toJSON ? policy.toJSON() : { ...policy };
      policyObj.enrolled_dependents = safeJsonParse(policyObj.enrolled_dependents, []);

      return res.json({
        success: true,
        message: "Dependents and nominee updated successfully",
        policy: policyObj,
      });
    } catch (err) {
      console.error("updateDependents error:", err);
      return res.status(500).json({ success: false, error: "Failed to update dependents" });
    }
  },

  // POST /api/auth/mediclaim/upload-doc
  // Handles uploading of single supporting documents (Hospital Bills, Prescriptions, Reports)
  async uploadSupportingDocument(req, res) {
    try {
      const file = req.file;
      const { category = "Hospital Bill" } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: "No document attached" });
      }

      const docItem = {
        id: `doc_${Date.now()}_${Math.round(Math.random() * 1000)}`,
        filename: file.filename,
        original_name: file.originalname,
        category,
        size: file.size,
        mimetype: file.mimetype,
        upload_date: new Date().toISOString(),
        url: `/uploads/${file.filename}`,
      };

      return res.json({
        success: true,
        message: "Document uploaded successfully",
        document: docItem,
      });
    } catch (err) {
      console.error("uploadSupportingDocument error:", err);
      return res.status(500).json({ success: false, error: "Failed to upload document" });
    }
  },

  // POST /api/auth/mediclaim/claim/submit
  // Submits a new medical insurance claim with supporting document attachments
  async submitClaim(req, res) {
    try {
      const empId = req.user.employee_id;
      const {
        patient_name,
        patient_relation = "Self",
        hospital_name,
        hospital_city,
        hospital_type = "Network (Cashless)",
        admission_date,
        discharge_date,
        ailment_diagnosis,
        treatment_type = "Inpatient Hospitalization",
        claimed_amount,
        supporting_documents = [],
        remarks,
      } = req.body;

      if (!patient_name || !hospital_name || !hospital_city || !admission_date || !discharge_date || !ailment_diagnosis || !claimed_amount) {
        return res.status(400).json({
          success: false,
          error: "Please provide all required claim details (Patient Name, Hospital, Dates, Ailment, and Claim Amount)",
        });
      }

      // Fetch employee profile for name and department
      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        ),
      });

      const empName = emp?.name || `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim() || empId;
      const empDept = emp?.dept || emp?.department || "General";

      const claimNumber = `CLM-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const newClaim = await MediclaimClaim.create({
        claim_number: claimNumber,
        employee_id: empId,
        employee_name: empName,
        dept: empDept,
        patient_name: patient_name.trim(),
        patient_relation: patient_relation.trim(),
        hospital_name: hospital_name.trim(),
        hospital_city: hospital_city.trim(),
        hospital_type: hospital_type.trim(),
        admission_date,
        discharge_date,
        ailment_diagnosis: ailment_diagnosis.trim(),
        treatment_type,
        claimed_amount: parseFloat(claimed_amount) || 0.0,
        status: "Submitted",
        submission_date: new Date(),
        hr_remarks: remarks || null,
        supporting_documents: JSON.stringify(Array.isArray(supporting_documents) ? supporting_documents : []),
      });

      const claimObj = newClaim.toJSON ? newClaim.toJSON() : { ...newClaim };
      claimObj.supporting_documents = safeJsonParse(claimObj.supporting_documents, []);

      return res.status(201).json({
        success: true,
        message: `Claim ${claimNumber} submitted successfully with ${claimObj.supporting_documents.length} supporting document(s)`,
        claim: claimObj,
      });
    } catch (err) {
      console.error("submitClaim error:", err);
      return res.status(500).json({ success: false, error: "Failed to submit mediclaim claim" });
    }
  },

  // DELETE /api/auth/mediclaim/claim/:id/cancel
  // Allows employee to withdraw a claim if not yet approved or settled
  async cancelClaim(req, res) {
    try {
      const empId = req.user.employee_id;
      const { id } = req.params;

      const claim = await MediclaimClaim.findByPk(id);
      if (!claim) {
        return res.status(404).json({ success: false, error: "Claim record not found" });
      }

      if (claim.employee_id.toLowerCase().trim() !== empId.toLowerCase().trim()) {
        return res.status(403).json({ success: false, error: "Unauthorized to cancel this claim" });
      }

      if (["Approved", "Settled"].includes(claim.status)) {
        return res.status(400).json({ success: false, error: `Cannot withdraw a claim that is already ${claim.status}` });
      }

      claim.status = "Withdrawn";
      await claim.save();

      return res.json({
        success: true,
        message: `Claim ${claim.claim_number} withdrawn successfully`,
      });
    } catch (err) {
      console.error("cancelClaim error:", err);
      return res.status(500).json({ success: false, error: "Failed to cancel claim" });
    }
  },

  // GET /api/auth/mediclaim/all-claims
  // HR / Admin / Accounts management view: Lists all employee claims with search & status filters
  async getAllClaims(req, res) {
    try {
      const { status, search, dept } = req.query;

      const whereClause = {};

      if (status && status !== "All") {
        whereClause.status = status;
      }

      if (dept && dept !== "All") {
        whereClause.dept = dept;
      }

      if (search && search.trim()) {
        const searchTerm = `%${search.trim().toLowerCase()}%`;
        whereClause[Op.or] = [
          sequelize.where(sequelize.fn("LOWER", sequelize.col("claim_number")), { [Op.like]: searchTerm }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), { [Op.like]: searchTerm }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_name")), { [Op.like]: searchTerm }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("patient_name")), { [Op.like]: searchTerm }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("hospital_name")), { [Op.like]: searchTerm }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("ailment_diagnosis")), { [Op.like]: searchTerm }),
        ];
      }

      const claims = await MediclaimClaim.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
      });

      const parsedClaims = claims.map((c) => {
        const claimObj = c.toJSON ? c.toJSON() : { ...c };
        claimObj.supporting_documents = safeJsonParse(claimObj.supporting_documents, []);
        return claimObj;
      });

      return res.json({
        success: true,
        claims: parsedClaims,
        count: parsedClaims.length,
      });
    } catch (err) {
      console.error("getAllClaims error:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve company claims" });
    }
  },

  // PATCH /api/auth/mediclaim/claim/:id/review
  // HR / Admin review: Approve, Settle, Reject, or Request Info, set approved amount, and add remarks
  async reviewClaim(req, res) {
    try {
      const { id } = req.params;
      const {
        status,
        approved_amount,
        settled_amount,
        settlement_ref,
        hr_remarks,
        tpa_remarks,
      } = req.body;

      const claim = await MediclaimClaim.findByPk(id);
      if (!claim) {
        return res.status(404).json({ success: false, error: "Claim not found" });
      }

      if (status) claim.status = status;
      if (approved_amount !== undefined) claim.approved_amount = approved_amount !== null ? parseFloat(approved_amount) : null;
      if (settled_amount !== undefined) claim.settled_amount = settled_amount !== null ? parseFloat(settled_amount) : null;
      if (settlement_ref !== undefined) claim.settlement_ref = settlement_ref;
      if (hr_remarks !== undefined) claim.hr_remarks = hr_remarks;
      if (tpa_remarks !== undefined) claim.tpa_remarks = tpa_remarks;

      if (status === "Settled" && !claim.settlement_date) {
        claim.settlement_date = new Date();
      }

      await claim.save();

      const claimObj = claim.toJSON ? claim.toJSON() : { ...claim };
      claimObj.supporting_documents = safeJsonParse(claimObj.supporting_documents, []);

      return res.json({
        success: true,
        message: `Claim ${claim.claim_number} status updated to ${claim.status}`,
        claim: claimObj,
      });
    } catch (err) {
      console.error("reviewClaim error:", err);
      return res.status(500).json({ success: false, error: "Failed to review claim" });
    }
  },

  // GET /api/auth/mediclaim/stats
  // Aggregated overview stats for HR & Admin dashboards
  async getMediclaimStats(req, res) {
    try {
      const allClaims = await MediclaimClaim.findAll();
      const allPolicies = await MediclaimPolicy.findAll();

      let totalClaimed = 0;
      let totalApproved = 0;
      let totalSettled = 0;
      let pendingCount = 0;
      let approvedCount = 0;
      let settledCount = 0;
      let rejectedCount = 0;

      allClaims.forEach((c) => {
        totalClaimed += parseFloat(c.claimed_amount) || 0;
        if (c.approved_amount) totalApproved += parseFloat(c.approved_amount) || 0;
        if (c.settled_amount) totalSettled += parseFloat(c.settled_amount) || 0;

        if (["Submitted", "Under Review", "Query Raised", "Documents Verified"].includes(c.status)) {
          pendingCount++;
        } else if (c.status === "Approved") {
          approvedCount++;
        } else if (c.status === "Settled") {
          settledCount++;
        } else if (c.status === "Rejected") {
          rejectedCount++;
        }
      });

      const totalCoverage = allPolicies.reduce((sum, p) => sum + (parseFloat(p.sum_insured) || 0), 0);

      return res.json({
        success: true,
        stats: {
          total_enrolled: allPolicies.length,
          total_coverage: totalCoverage,
          total_claims: allClaims.length,
          total_claimed_amount: totalClaimed,
          total_approved_amount: totalApproved,
          total_settled_amount: totalSettled,
          pending_count: pendingCount,
          approved_count: approvedCount,
          settled_count: settledCount,
          rejected_count: rejectedCount,
        },
      });
    } catch (err) {
      console.error("getMediclaimStats error:", err);
      return res.status(500).json({ success: false, error: "Failed to compute stats" });
    }
  },

  // POST /api/auth/mediclaim/policy/manage
  // HR / Admin can update an employee's policy coverage or TPA details
  async managePolicy(req, res) {
    try {
      const { employee_id, sum_insured, tpa_name, insurance_company, policy_number, plan_type } = req.body;

      if (!employee_id) {
        return res.status(400).json({ success: false, error: "Employee ID is required" });
      }

      let policy = await MediclaimPolicy.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
      });

      if (!policy) {
        policy = await MediclaimPolicy.create({
          employee_id,
          policy_number: policy_number || `GHI-ZEN-${new Date().getFullYear()}-0001`,
          sum_insured: parseFloat(sum_insured) || 500000.0,
          tpa_name: tpa_name || "Medi Assist TPA Services",
          insurance_company: insurance_company || "ICICI Lombard GIC Ltd",
          plan_type: plan_type || "Corporate Group Floater Plan (1+3)",
        });
      } else {
        if (sum_insured !== undefined && sum_insured !== null) policy.sum_insured = parseFloat(sum_insured);
        if (tpa_name) policy.tpa_name = tpa_name;
        if (insurance_company) policy.insurance_company = insurance_company;
        if (policy_number) policy.policy_number = policy_number;
        if (plan_type) policy.plan_type = plan_type;
        await policy.save();
      }

      return res.json({
        success: true,
        message: "Policy coverage updated successfully",
        policy,
      });
    } catch (err) {
      console.error("managePolicy error:", err);
      return res.status(500).json({ success: false, error: "Failed to update employee policy" });
    }
  },

  // ========================================================
  // 1. COVERAGE HIGHLIGHTS MANAGEMENT (HR / Admin configurable)
  // ========================================================

  // GET /api/auth/mediclaim/highlights
  async getHighlights(req, res) {
    try {
      let list = await MediclaimHighlight.findAll({
        order: [["order_index", "ASC"], ["id", "ASC"]],
      });

      if (list.length === 0) {
        await MediclaimHighlight.bulkCreate(DEFAULT_HIGHLIGHTS);
        list = await MediclaimHighlight.findAll({
          order: [["order_index", "ASC"], ["id", "ASC"]],
        });
      }

      return res.json({ success: true, highlights: list });
    } catch (err) {
      console.error("getHighlights error:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve coverage highlights" });
    }
  },

  // POST /api/auth/mediclaim/highlights
  async saveHighlights(req, res) {
    try {
      const { highlights } = req.body;
      if (!Array.isArray(highlights)) {
        return res.status(400).json({ success: false, error: "Highlights array is required" });
      }

      await MediclaimHighlight.destroy({ where: {} });
      const formatted = highlights.map((h, idx) => ({
        title: h.title?.trim() || "Coverage Benefit",
        badge: h.badge?.trim() || "Covered",
        badge_color: h.badge_color || "emerald",
        description: h.description?.trim() || "",
        icon: h.icon || "shield",
        order_index: h.order_index !== undefined ? h.order_index : idx + 1,
      }));

      const created = await MediclaimHighlight.bulkCreate(formatted);
      return res.json({
        success: true,
        message: "Coverage highlights updated successfully",
        highlights: created,
      });
    } catch (err) {
      console.error("saveHighlights error:", err);
      return res.status(500).json({ success: false, error: "Failed to save coverage highlights" });
    }
  },

  // POST /api/auth/mediclaim/highlights/reset
  async resetHighlights(req, res) {
    try {
      await MediclaimHighlight.destroy({ where: {} });
      const created = await MediclaimHighlight.bulkCreate(DEFAULT_HIGHLIGHTS);
      return res.json({
        success: true,
        message: "Coverage highlights reset to default successfully",
        highlights: created,
      });
    } catch (err) {
      console.error("resetHighlights error:", err);
      return res.status(500).json({ success: false, error: "Failed to reset coverage highlights" });
    }
  },

  // ========================================================
  // 2. CASHLESS HOSPITAL DIRECTORY (HR Upload & Categorical City Filtering)
  // ========================================================

  // GET /api/auth/mediclaim/hospitals
  async getHospitals(req, res) {
    try {
      const { city, search } = req.query;

      const whereClause = {};
      if (city && city !== "All") {
        whereClause.city = sequelize.where(
          sequelize.fn("LOWER", sequelize.col("city")),
          city.toLowerCase().trim()
        );
      }

      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`;
        whereClause[Op.or] = [
          sequelize.where(sequelize.fn("LOWER", sequelize.col("name")), { [Op.like]: q }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("city")), { [Op.like]: q }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("area")), { [Op.like]: q }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("hospital_type")), { [Op.like]: q }),
          sequelize.where(sequelize.fn("LOWER", sequelize.col("helpline")), { [Op.like]: q }),
        ];
      }

      let hospitals = await MediclaimHospital.findAll({
        where: whereClause,
        order: [["city", "ASC"], ["name", "ASC"]],
      });

      // If database is completely empty, seed standard network hospitals
      const totalCount = await MediclaimHospital.count();
      if (totalCount === 0) {
        await MediclaimHospital.bulkCreate(DEFAULT_HOSPITALS);
        hospitals = await MediclaimHospital.findAll({
          where: whereClause,
          order: [["city", "ASC"], ["name", "ASC"]],
        });
      }

      // Group distinct cities with count from the whole directory
      const allHospitals = await MediclaimHospital.findAll({
        attributes: ["city"],
      });

      const cityCounts = {};
      allHospitals.forEach((h) => {
        if (h.city) {
          const c = h.city.trim();
          cityCounts[c] = (cityCounts[c] || 0) + 1;
        }
      });

      const distinctCities = Object.keys(cityCounts).sort().map((c) => ({
        name: c,
        count: cityCounts[c],
      }));

      return res.json({
        success: true,
        hospitals,
        cities: distinctCities,
        totalCount: allHospitals.length,
      });
    } catch (err) {
      console.error("getHospitals error:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve hospitals" });
    }
  },

  // POST /api/auth/mediclaim/hospitals/upload
  // Accepts bulk array from Excel/CSV upload
  async uploadHospitals(req, res) {
    try {
      const { hospitals, mode = "append" } = req.body;
      if (!Array.isArray(hospitals) || hospitals.length === 0) {
        return res.status(400).json({ success: false, error: "Please provide a valid list of hospitals to upload" });
      }

      if (mode === "replace") {
        await MediclaimHospital.destroy({ where: {} });
      }

      const cleanList = hospitals
        .filter((h) => h && (h.name || h["Hospital Name"]) && (h.city || h["City"]))
        .map((h) => {
          const name = (h.name || h["Hospital Name"] || "").toString().trim();
          const city = (h.city || h["City"] || "").toString().trim();
          const area = (h.area || h["Area"] || h["Area / Locality"] || "").toString().trim();
          const address = (h.address || h["Address"] || "").toString().trim();
          const helpline = (h.helpline || h["Helpline"] || h["Contact Helpline"] || "+91 1800 425 9449").toString().trim();
          const hospital_type = (h.hospital_type || h.type || h["Hospital Type"] || h["Type"] || "Multi Specialty").toString().trim();
          const cashlessRaw = h.cashless !== undefined ? h.cashless : (h["Cashless Available"] !== undefined ? h["Cashless Available"] : true);
          const cashless = cashlessRaw === true || cashlessRaw === "Yes" || cashlessRaw === "yes" || cashlessRaw === "true" || cashlessRaw === 1;

          return {
            name,
            city,
            area: area || null,
            address: address || null,
            helpline: helpline || "+91 1800 425 9449",
            hospital_type: hospital_type || "Multi Specialty",
            cashless,
          };
        });

      if (cleanList.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid hospital rows found in the uploaded data. Ensure 'Hospital Name' and 'City' columns exist.",
        });
      }

      const inserted = await MediclaimHospital.bulkCreate(cleanList);

      return res.json({
        success: true,
        message: `Successfully ${mode === "replace" ? "replaced directory with" : "added"} ${inserted.length} hospital(s)`,
        count: inserted.length,
      });
    } catch (err) {
      console.error("uploadHospitals error:", err);
      return res.status(500).json({ success: false, error: "Failed to upload hospital directory" });
    }
  },

  // POST /api/auth/mediclaim/hospitals
  async createHospital(req, res) {
    try {
      const { name, city, area, address, helpline, cashless, hospital_type } = req.body;
      if (!name || !city) {
        return res.status(400).json({ success: false, error: "Hospital name and city are required" });
      }

      const hosp = await MediclaimHospital.create({
        name: name.trim(),
        city: city.trim(),
        area: area ? area.trim() : null,
        address: address ? address.trim() : null,
        helpline: helpline ? helpline.trim() : "+91 1800 425 9449",
        cashless: cashless !== false,
        hospital_type: hospital_type ? hospital_type.trim() : "Multi Specialty",
      });

      return res.status(201).json({
        success: true,
        message: `Hospital "${hosp.name}" added successfully`,
        hospital: hosp,
      });
    } catch (err) {
      console.error("createHospital error:", err);
      return res.status(500).json({ success: false, error: "Failed to add hospital" });
    }
  },

  // DELETE /api/auth/mediclaim/hospitals/:id
  async deleteHospital(req, res) {
    try {
      const { id } = req.params;
      const hosp = await MediclaimHospital.findByPk(id);
      if (!hosp) {
        return res.status(404).json({ success: false, error: "Hospital not found" });
      }
      await hosp.destroy();
      return res.json({ success: true, message: `Hospital "${hosp.name}" removed successfully` });
    } catch (err) {
      console.error("deleteHospital error:", err);
      return res.status(500).json({ success: false, error: "Failed to delete hospital" });
    }
  },

  // ========================================================
  // 3. EMPLOYEE TOTAL HEALTH COVERAGE MANAGEMENT (HR Desk)
  // ========================================================

  // GET /api/auth/mediclaim/employees-coverage
  async getEmployeesCoverage(req, res) {
    try {
      const { search, dept } = req.query;

      const andConditions = [{ status: "Active" }];

      if (dept && dept !== "All") {
        andConditions.push(
          sequelize.where(
            sequelize.fn("LOWER", sequelize.col("Employee.dept")),
            dept.trim().toLowerCase()
          )
        );
      }

      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`;
        andConditions.push({
          [Op.or]: [
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Employee.employee_id")), { [Op.like]: q }),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Employee.first_name")), { [Op.like]: q }),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Employee.last_name")), { [Op.like]: q }),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Employee.email")), { [Op.like]: q }),
          ],
        });
      }

      const employees = await Employee.findAll({
        where: {
          [Op.and]: andConditions,
        },
        include: [
          {
            model: MediclaimPolicy,
            as: "mediclaimPolicy",
            required: false,
          },
        ],
        order: [["id", "ASC"]],
      });

      const list = employees.map((emp) => {
        const pol = emp.mediclaimPolicy;
        const cleanEmpNum = emp.employee_id.replace(/\D/g, "") || String(emp.id || 1000);
        return {
          id: emp.id,
          employee_id: emp.employee_id,
          name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id,
          email: emp.email || emp.work_email || "",
          department: emp.dept || emp.department || "General",
          designation: emp.designation || "Staff",
          profile_photo: emp.profile_photo || "",
          policy_id: pol?.id || null,
          policy_number: pol?.policy_number || `GHI-ZEN-${new Date().getFullYear()}-${cleanEmpNum.padStart(4, "0")}`,
          sum_insured: pol ? parseFloat(pol.sum_insured) : 500000.0,
          plan_type: pol?.plan_type || "Corporate Group Floater Plan (1+3)",
          tpa_name: pol?.tpa_name || "Medi Assist TPA Services",
          insurance_company: pol?.insurance_company || "ICICI Lombard GIC Ltd",
          status: pol?.status || "Active",
        };
      });

      // Fetch all distinct active departments for the filter dropdown
      const allDepts = await Employee.findAll({
        where: { status: "Active" },
        attributes: ["dept"],
        group: ["dept"],
      });
      const distinctDepts = allDepts
        .map((d) => d.dept)
        .filter(Boolean)
        .sort();

      return res.json({
        success: true,
        employees: list,
        departments: distinctDepts,
        count: list.length,
      });
    } catch (err) {
      console.error("getEmployeesCoverage error:", err);
      return res.status(500).json({ success: false, error: "Failed to retrieve employee coverage details" });
    }
  },
};

module.exports = MediclaimController;
