const {
  ExpenseClaim,
  ExpenseClaimItem,
  Employee,
  User,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");
const path = require("path");

// Helper: Format sequential claim code (CLM-YYYY-XXXX)
const generateClaimNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `CLM-${currentYear}-`;

  const latestClaim = await ExpenseClaim.findOne({
    where: {
      claim_number: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["createdAt", "DESC"]],
  });

  let nextSeq = 1;
  if (latestClaim && latestClaim.claim_number) {
    const parts = latestClaim.claim_number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  let s = String(nextSeq);
  while (s.length < 4) s = "0" + s;
  return `${prefix}${s}`;
};

// Helper: Determine if user is in a leadership/management role
const isManagerOrHod = (user = {}) => {
  const role = (user.role || "").toLowerCase().trim();
  if (["admin", "hr", "hrmanager", "ceo", "coo", "cto", "cfo", "vp", "management", "hod", "manager", "teamlead"].includes(role)) {
    return true;
  }
  const d = (user.designation || "").toLowerCase().trim();
  return /\b(hod|head|manager|mgr|lead|tl|agm|dgm|gm|director|supervisor)\b/i.test(d);
};

// Helper: Determine if user is in Finance/Accounts
const isFinanceOrAccounts = (user = {}) => {
  const role = (user.role || "").toLowerCase().trim();
  if (["accounts", "payroll", "finance", "cfo", "admin", "hr", "hrmanager", "ceo", "coo", "management"].includes(role)) {
    return true;
  }
  const d = (user.designation || "").toLowerCase().trim();
  return /\b(finance|account|accountant|accounts|audit|billing)\b/i.test(d);
};

// Helper: Determine if user is HR / Admin oversight
const isHROversight = (user = {}) => {
  const role = (user.role || "").toLowerCase().trim();
  return ["hr", "hrmanager", "admin", "ceo", "coo", "management"].includes(role);
};

const claimController = {
  // =========================================================================
  // 1. EMPLOYEE SELF-SERVICE: CREATE / SUBMIT CLAIM
  // =========================================================================
  async createClaim(req, res) {
    const t = await sequelize.transaction();
    try {
      const empId = req.user?.employee_id;
      if (!empId) {
        await t.rollback();
        return res.status(401).json({ error: "Unauthorized: Missing employee ID" });
      }

      // Fetch employee profile
      let emp = await Employee.findOne({ where: { employee_id: empId } });
      const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : (req.user?.name || "Employee");
      const empEmail = emp?.email || req.user?.email || "";
      const dept = emp?.department || req.user?.department || "General";
      const desig = emp?.designation || req.user?.designation || "Staff";

      const {
        title,
        claim_type = "TRAVEL",
        travel_start_date,
        travel_end_date,
        travel_destination,
        purpose,
        currency = "INR",
        items = [],
        supporting_documents = [],
        is_draft = false,
      } = req.body;

      if (!title || !title.trim()) {
        await t.rollback();
        return res.status(400).json({ error: "Claim title / summary is required" });
      }

      if (!is_draft && (!items || items.length === 0)) {
        await t.rollback();
        return res.status(400).json({ error: "At least one itemized expense bill must be provided to submit a claim" });
      }

      // Calculate total amount from items
      let total = 0;
      const formattedItems = (items || []).map((item) => {
        const amt = parseFloat(item.amount) || 0;
        total += amt;
        return {
          expense_date: item.expense_date || new Date().toISOString().split("T")[0],
          category: item.category || "General Expense",
          merchant_name: item.merchant_name || null,
          description: item.description || null,
          bill_number: item.bill_number || null,
          amount: amt,
          approved_amount: amt,
          tax_amount: parseFloat(item.tax_amount) || 0,
          receipt_url: item.receipt_url || null,
          receipt_filename: item.receipt_filename || null,
          status: "PENDING",
        };
      });

      const claimNumber = await generateClaimNumber();
      const status = is_draft ? "DRAFT" : "SUBMITTED";
      const current_stage = is_draft ? "MANAGER" : "MANAGER";

      // Detect Line Manager / HOD if available
      let managerId = emp?.reporting_manager_id || null;
      let managerName = emp?.reporting_manager || null;

      const claim = await ExpenseClaim.create(
        {
          claim_number: claimNumber,
          employee_id: empId,
          employee_name: empName,
          employee_email: empEmail,
          department: dept,
          designation: desig,
          title: title.trim(),
          claim_type,
          travel_start_date: travel_start_date || null,
          travel_end_date: travel_end_date || null,
          travel_destination: travel_destination || null,
          purpose: purpose || null,
          total_amount: total,
          approved_amount: total,
          currency,
          status,
          current_stage,
          manager_id: managerId,
          manager_name: managerName,
          manager_decision: "PENDING",
          supporting_documents: supporting_documents || [],
        },
        { transaction: t }
      );

      if (formattedItems.length > 0) {
        const itemsWithClaimId = formattedItems.map((item) => ({
          ...item,
          claim_id: claim.id,
        }));
        await ExpenseClaimItem.bulkCreate(itemsWithClaimId, { transaction: t });
      }

      await t.commit();

      const created = await ExpenseClaim.findByPk(claim.id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
      });

      return res.status(201).json({
        success: true,
        message: is_draft
          ? `Claim saved as draft (${claimNumber})`
          : `Claim submitted successfully (${claimNumber}) and routed for manager review`,
        data: created,
      });
    } catch (err) {
      await t.rollback();
      console.error("Create claim error:", err);
      return res.status(500).json({ error: "Failed to create claim: " + err.message });
    }
  },

  // =========================================================================
  // 2. EMPLOYEE SELF-SERVICE: GET OWN CLAIMS
  // =========================================================================
  async getMyClaims(req, res) {
    try {
      const empId = req.user?.employee_id;
      if (!empId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { status, claim_type, search } = req.query;
      const where = { employee_id: empId };

      if (status && status !== "ALL") {
        where.status = status;
      }
      if (claim_type && claim_type !== "ALL") {
        where.claim_type = claim_type;
      }
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [
          { claim_number: { [Op.iLike]: term } },
          { title: { [Op.iLike]: term } },
          { purpose: { [Op.iLike]: term } },
          { travel_destination: { [Op.iLike]: term } },
        ];
      }

      const claims = await ExpenseClaim.findAll({
        where,
        include: [{ model: ExpenseClaimItem, as: "items" }],
        order: [["createdAt", "DESC"]],
      });

      // Employee metrics summary
      const allMyClaims = await ExpenseClaim.findAll({
        where: { employee_id: empId },
        attributes: ["status", "total_amount", "approved_amount"],
      });

      let totalClaimed = 0;
      let totalApproved = 0;
      let inReview = 0;
      let totalDisbursed = 0;

      allMyClaims.forEach((c) => {
        const amt = parseFloat(c.total_amount) || 0;
        const appAmt = parseFloat(c.approved_amount) || 0;
        totalClaimed += amt;

        if (c.status === "SUBMITTED" || c.status === "APPROVED_BY_MANAGER") {
          inReview += amt;
        } else if (c.status === "APPROVED_BY_FINANCE") {
          totalApproved += appAmt;
        } else if (c.status === "PAID") {
          totalDisbursed += appAmt;
        }
      });

      return res.json({
        success: true,
        stats: {
          total_count: allMyClaims.length,
          total_claimed_amount: totalClaimed,
          in_review_amount: inReview,
          approved_unpaid_amount: totalApproved,
          disbursed_amount: totalDisbursed,
        },
        data: claims,
      });
    } catch (err) {
      console.error("Get my claims error:", err);
      return res.status(500).json({ error: "Failed to fetch claims: " + err.message });
    }
  },

  // =========================================================================
  // 3. GET CLAIM BY ID (WITH FULL AUDIT DETAILS)
  // =========================================================================
  async getClaimById(req, res) {
    try {
      const { id } = req.params;
      const claim = await ExpenseClaim.findByPk(id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
      });

      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      // Check permission: Own claim, Line Manager / HOD, Finance, or HR Oversight
      const isOwner = claim.employee_id === req.user?.employee_id;
      const isManager = isManagerOrHod(req.user);
      const isFinance = isFinanceOrAccounts(req.user);
      const isHR = isHROversight(req.user);

      if (!isOwner && !isManager && !isFinance && !isHR) {
        return res.status(403).json({ error: "Access denied to this claim dossier" });
      }

      return res.json({ success: true, data: claim });
    } catch (err) {
      console.error("Get claim by id error:", err);
      return res.status(500).json({ error: "Failed to fetch claim details: " + err.message });
    }
  },

  // =========================================================================
  // 4. UPDATE DRAFT OR REJECTED CLAIM
  // =========================================================================
  async updateClaim(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const claim = await ExpenseClaim.findByPk(id, { transaction: t });

      if (!claim) {
        await t.rollback();
        return res.status(404).json({ error: "Claim not found" });
      }

      const empId = req.user?.employee_id;
      if (claim.employee_id !== empId && !isHROversight(req.user)) {
        await t.rollback();
        return res.status(403).json({ error: "You can only edit your own claim" });
      }

      if (!["DRAFT", "REJECTED_BY_MANAGER", "REJECTED_BY_FINANCE"].includes(claim.status)) {
        await t.rollback();
        return res.status(400).json({
          error: `Claim in status '${claim.status}' cannot be modified. Only Draft or Rejected claims can be edited.`,
        });
      }

      const {
        title,
        claim_type,
        travel_start_date,
        travel_end_date,
        travel_destination,
        purpose,
        items = [],
        supporting_documents,
        submit_now = false,
      } = req.body;

      let total = 0;
      const formattedItems = (items || []).map((item) => {
        const amt = parseFloat(item.amount) || 0;
        total += amt;
        return {
          claim_id: claim.id,
          expense_date: item.expense_date || new Date().toISOString().split("T")[0],
          category: item.category || "General Expense",
          merchant_name: item.merchant_name || null,
          description: item.description || null,
          bill_number: item.bill_number || null,
          amount: amt,
          approved_amount: amt,
          tax_amount: parseFloat(item.tax_amount) || 0,
          receipt_url: item.receipt_url || null,
          receipt_filename: item.receipt_filename || null,
          status: "PENDING",
        };
      });

      // Replace items
      await ExpenseClaimItem.destroy({ where: { claim_id: claim.id }, transaction: t });
      if (formattedItems.length > 0) {
        await ExpenseClaimItem.bulkCreate(formattedItems, { transaction: t });
      }

      const newStatus = submit_now ? "SUBMITTED" : "DRAFT";
      const newStage = submit_now ? "MANAGER" : "MANAGER";

      await claim.update(
        {
          title: title || claim.title,
          claim_type: claim_type || claim.claim_type,
          travel_start_date: travel_start_date || claim.travel_start_date,
          travel_end_date: travel_end_date || claim.travel_end_date,
          travel_destination: travel_destination || claim.travel_destination,
          purpose: purpose || claim.purpose,
          total_amount: total,
          approved_amount: total,
          status: newStatus,
          current_stage: newStage,
          supporting_documents: supporting_documents || claim.supporting_documents,
          manager_decision: "PENDING",
          manager_comments: null,
          finance_decision: "PENDING",
          finance_comments: null,
        },
        { transaction: t }
      );

      await t.commit();

      const updated = await ExpenseClaim.findByPk(claim.id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
      });

      return res.json({
        success: true,
        message: submit_now ? "Claim updated and submitted for manager approval" : "Claim draft saved",
        data: updated,
      });
    } catch (err) {
      await t.rollback();
      console.error("Update claim error:", err);
      return res.status(500).json({ error: "Failed to update claim: " + err.message });
    }
  },

  // =========================================================================
  // 5. CANCEL CLAIM (EMPLOYEE)
  // =========================================================================
  async cancelClaim(req, res) {
    try {
      const { id } = req.params;
      const claim = await ExpenseClaim.findByPk(id);

      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      if (claim.employee_id !== req.user?.employee_id && !isHROversight(req.user)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (claim.status === "PAID") {
        return res.status(400).json({ error: "Cannot cancel an already disbursed/settled claim" });
      }

      await claim.update({
        status: "CANCELLED",
        current_stage: "REJECTED",
      });

      return res.json({
        success: true,
        message: `Claim ${claim.claim_number} cancelled`,
        data: claim,
      });
    } catch (err) {
      console.error("Cancel claim error:", err);
      return res.status(500).json({ error: "Failed to cancel claim: " + err.message });
    }
  },

  // =========================================================================
  // 6. DELETE DRAFT CLAIM
  // =========================================================================
  async deleteClaim(req, res) {
    try {
      const { id } = req.params;
      const claim = await ExpenseClaim.findByPk(id);

      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      if (claim.employee_id !== req.user?.employee_id && !isHROversight(req.user)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (claim.status !== "DRAFT") {
        return res.status(400).json({ error: "Only Draft claims can be permanently deleted" });
      }

      await ExpenseClaimItem.destroy({ where: { claim_id: claim.id } });
      await claim.destroy();

      return res.json({ success: true, message: "Draft claim deleted successfully" });
    } catch (err) {
      console.error("Delete claim error:", err);
      return res.status(500).json({ error: "Failed to delete claim: " + err.message });
    }
  },

  // =========================================================================
  // 7. MANAGER / HOD APPROVAL QUEUE
  // =========================================================================
  async getManagerPendingClaims(req, res) {
    try {
      const user = req.user;
      const isGlobalHR = isHROversight(user);
      const where = {
        status: "SUBMITTED",
        current_stage: "MANAGER",
      };

      // If not global HR/Admin, restrict to manager's department or direct reportees
      if (!isGlobalHR) {
        const dept = user.department;
        const managerId = user.employee_id;
        where[Op.or] = [
          { manager_id: managerId },
          { department: dept },
        ];
      }

      const claims = await ExpenseClaim.findAll({
        where,
        include: [{ model: ExpenseClaimItem, as: "items" }],
        order: [["createdAt", "ASC"]],
      });

      return res.json({
        success: true,
        count: claims.length,
        data: claims,
      });
    } catch (err) {
      console.error("Get manager pending claims error:", err);
      return res.status(500).json({ error: "Failed to fetch manager pending claims: " + err.message });
    }
  },

  // =========================================================================
  // 8. MANAGER / HOD REVIEW ACTION (APPROVE / REJECT)
  // =========================================================================
  async managerReviewClaim(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { decision, comments, item_adjustments } = req.body;

      if (!["APPROVED", "REJECTED"].includes(decision)) {
        await t.rollback();
        return res.status(400).json({ error: "Decision must be either 'APPROVED' or 'REJECTED'" });
      }

      const claim = await ExpenseClaim.findByPk(id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
        transaction: t,
      });

      if (!claim) {
        await t.rollback();
        return res.status(404).json({ error: "Claim not found" });
      }

      if (claim.status !== "SUBMITTED" || claim.current_stage !== "MANAGER") {
        await t.rollback();
        return res.status(400).json({
          error: `Claim is currently not pending manager review (Current: ${claim.status})`,
        });
      }

      // Check authorization: Assigned Manager, HOD of department, or HR/Admin
      const isAssigned = claim.manager_id && claim.manager_id === req.user?.employee_id;
      const isDeptHod = req.user?.department && req.user.department === claim.department && isManagerOrHod(req.user);
      const isHR = isHROversight(req.user);

      if (!isAssigned && !isDeptHod && !isHR) {
        await t.rollback();
        return res.status(403).json({ error: "You are not authorized to review claims for this department" });
      }

      const reviewerId = req.user?.employee_id || "MGR-01";
      const reviewerName = req.user?.name || "Manager Reviewer";

      // If items adjusted during review
      let approvedSum = 0;
      if (item_adjustments && Array.isArray(item_adjustments)) {
        for (const adj of item_adjustments) {
          const item = claim.items.find((i) => i.id === adj.id);
          if (item) {
            const adjApproved = adj.status === "REJECTED" ? 0 : (parseFloat(adj.approved_amount) || parseFloat(item.amount));
            await item.update(
              {
                status: adj.status || "APPROVED",
                approved_amount: adjApproved,
                remarks: adj.remarks || null,
              },
              { transaction: t }
            );
            approvedSum += adjApproved;
          }
        }
      } else {
        // Default: All items approved as submitted
        for (const item of claim.items) {
          await item.update(
            {
              status: decision === "APPROVED" ? "APPROVED" : "REJECTED",
              approved_amount: decision === "APPROVED" ? parseFloat(item.amount) : 0,
            },
            { transaction: t }
          );
          if (decision === "APPROVED") approvedSum += parseFloat(item.amount);
        }
      }

      if (decision === "APPROVED") {
        await claim.update(
          {
            status: "APPROVED_BY_MANAGER",
            current_stage: "FINANCE",
            approved_amount: approvedSum,
            manager_id: reviewerId,
            manager_name: reviewerName,
            manager_decision: "APPROVED",
            manager_decision_at: new Date(),
            manager_comments: comments || "Approved by Line Manager / HOD",
          },
          { transaction: t }
        );
      } else {
        await claim.update(
          {
            status: "REJECTED_BY_MANAGER",
            current_stage: "REJECTED",
            approved_amount: 0,
            manager_id: reviewerId,
            manager_name: reviewerName,
            manager_decision: "REJECTED",
            manager_decision_at: new Date(),
            manager_comments: comments || "Rejected by Line Manager / HOD",
          },
          { transaction: t }
        );
      }

      await t.commit();

      const updated = await ExpenseClaim.findByPk(claim.id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
      });

      return res.json({
        success: true,
        message: decision === "APPROVED"
          ? "Claim approved by manager and routed to Finance for verification & settlement"
          : "Claim rejected by manager",
        data: updated,
      });
    } catch (err) {
      await t.rollback();
      console.error("Manager review error:", err);
      return res.status(500).json({ error: "Failed to process manager review: " + err.message });
    }
  },

  // =========================================================================
  // 9. FINANCE / ACCOUNTS VERIFICATION QUEUE
  // =========================================================================
  async getFinancePendingClaims(req, res) {
    try {
      const { stage = "ALL" } = req.query;
      let where;

      if (stage === "PENDING_AUDIT") {
        where = { status: "APPROVED_BY_MANAGER", current_stage: "FINANCE" };
      } else if (stage === "PENDING_PAYOUT") {
        where = { status: "APPROVED_BY_FINANCE", current_stage: "PAYMENT" };
      } else if (stage === "DISBURSED") {
        where = { status: "PAID" };
      } else {
        // ALL finance actionable
        where = {
          status: {
            [Op.in]: ["APPROVED_BY_MANAGER", "APPROVED_BY_FINANCE", "PAID"],
          },
        };
      }

      const claims = await ExpenseClaim.findAll({
        where,
        include: [{ model: ExpenseClaimItem, as: "items" }],
        order: [["createdAt", "DESC"]],
      });

      // Finance KPI stats
      const allFinanceClaims = await ExpenseClaim.findAll({
        where: {
          status: {
            [Op.in]: ["APPROVED_BY_MANAGER", "APPROVED_BY_FINANCE", "PAID"],
          },
        },
        attributes: ["status", "total_amount", "approved_amount"],
      });

      let pendingAuditCount = 0;
      let pendingAuditAmount = 0;
      let pendingPayoutCount = 0;
      let pendingPayoutAmount = 0;
      let disbursedAmount = 0;

      allFinanceClaims.forEach((c) => {
        const appAmt = parseFloat(c.approved_amount) || parseFloat(c.total_amount) || 0;
        if (c.status === "APPROVED_BY_MANAGER") {
          pendingAuditCount++;
          pendingAuditAmount += appAmt;
        } else if (c.status === "APPROVED_BY_FINANCE") {
          pendingPayoutCount++;
          pendingPayoutAmount += appAmt;
        } else if (c.status === "PAID") {
          disbursedAmount += appAmt;
        }
      });

      return res.json({
        success: true,
        stats: {
          pending_audit_count: pendingAuditCount,
          pending_audit_amount: pendingAuditAmount,
          pending_payout_count: pendingPayoutCount,
          pending_payout_amount: pendingPayoutAmount,
          total_disbursed_amount: disbursedAmount,
        },
        data: claims,
      });
    } catch (err) {
      console.error("Get finance pending claims error:", err);
      return res.status(500).json({ error: "Failed to fetch finance claims: " + err.message });
    }
  },

  // =========================================================================
  // 10. FINANCE / ACCOUNTS VERIFICATION ACTION (APPROVE / REJECT)
  // =========================================================================
  async financeReviewClaim(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { decision, comments, approved_amount, item_adjustments } = req.body;

      if (!["APPROVED", "REJECTED"].includes(decision)) {
        await t.rollback();
        return res.status(400).json({ error: "Decision must be either 'APPROVED' or 'REJECTED'" });
      }

      const claim = await ExpenseClaim.findByPk(id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
        transaction: t,
      });

      if (!claim) {
        await t.rollback();
        return res.status(404).json({ error: "Claim not found" });
      }

      if (claim.status !== "APPROVED_BY_MANAGER" || claim.current_stage !== "FINANCE") {
        await t.rollback();
        return res.status(400).json({
          error: `Claim is not ready for finance verification (Current: ${claim.status}, Stage: ${claim.current_stage})`,
        });
      }

      const reviewerId = req.user?.employee_id || "FIN-01";
      const reviewerName = req.user?.name || "Finance Controller";

      let finalApprovedSum = 0;
      if (item_adjustments && Array.isArray(item_adjustments)) {
        for (const adj of item_adjustments) {
          const item = claim.items.find((i) => i.id === adj.id);
          if (item) {
            const adjApproved = adj.status === "REJECTED" ? 0 : (parseFloat(adj.approved_amount) || parseFloat(item.amount));
            await item.update(
              {
                status: adj.status || "APPROVED",
                approved_amount: adjApproved,
                remarks: adj.remarks || item.remarks,
              },
              { transaction: t }
            );
            finalApprovedSum += adjApproved;
          }
        }
      } else if (approved_amount !== undefined && approved_amount !== null) {
        finalApprovedSum = parseFloat(approved_amount) || 0;
      } else {
        finalApprovedSum = parseFloat(claim.approved_amount) || parseFloat(claim.total_amount) || 0;
      }

      if (decision === "APPROVED") {
        await claim.update(
          {
            status: "APPROVED_BY_FINANCE",
            current_stage: "PAYMENT", // Ready for payout / disbursement
            approved_amount: finalApprovedSum,
            finance_id: reviewerId,
            finance_name: reviewerName,
            finance_decision: "APPROVED",
            finance_decision_at: new Date(),
            finance_comments: comments || "Bills and receipts audited and verified by Finance",
          },
          { transaction: t }
        );
      } else {
        await claim.update(
          {
            status: "REJECTED_BY_FINANCE",
            current_stage: "REJECTED",
            finance_id: reviewerId,
            finance_name: reviewerName,
            finance_decision: "REJECTED",
            finance_decision_at: new Date(),
            finance_comments: comments || "Rejected by Finance / Accounts",
          },
          { transaction: t }
        );
      }

      await t.commit();

      const updated = await ExpenseClaim.findByPk(claim.id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
      });

      return res.json({
        success: true,
        message: decision === "APPROVED"
          ? "Claim verified and approved by Finance. Queued for payment disbursement."
          : "Claim rejected by Finance",
        data: updated,
      });
    } catch (err) {
      await t.rollback();
      console.error("Finance review error:", err);
      return res.status(500).json({ error: "Failed to process finance review: " + err.message });
    }
  },

  // =========================================================================
  // 11. FINANCE / ACCOUNTS DISBURSEMENT (PAYOUT SETTLEMENT)
  // =========================================================================
  async disburseClaim(req, res) {
    try {
      const { id } = req.params;
      const {
        payment_mode = "BANK_TRANSFER",
        payment_reference,
        payment_notes,
      } = req.body;

      const claim = await ExpenseClaim.findByPk(id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
      });

      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      if (claim.status !== "APPROVED_BY_FINANCE" || claim.current_stage !== "PAYMENT") {
        return res.status(400).json({
          error: `Claim cannot be disbursed in status '${claim.status}' (Must be 'APPROVED_BY_FINANCE')`,
        });
      }

      const disburserId = req.user?.employee_id || "FIN-PAY-01";
      const disburserName = req.user?.name || "Accounts Settlement Desk";

      await claim.update({
        status: "PAID",
        current_stage: "COMPLETED",
        payment_mode,
        payment_reference: payment_reference || `PAY-${Date.now()}`,
        disbursed_at: new Date(),
        disbursed_by_id: disburserId,
        disbursed_by_name: disburserName,
        payment_notes: payment_notes || `Reimbursement settled via ${payment_mode}`,
      });

      return res.json({
        success: true,
        message: `Claim ${claim.claim_number} successfully disbursed and marked as PAID!`,
        data: claim,
      });
    } catch (err) {
      console.error("Disburse claim error:", err);
      return res.status(500).json({ error: "Failed to disburse claim: " + err.message });
    }
  },

  // =========================================================================
  // 12. HR GLOBAL OVERSIGHT: ALL CLAIMS REGISTER & KPI METRICS
  // =========================================================================
  async getAllClaims(req, res) {
    try {
      const {
        status,
        stage,
        department,
        claim_type,
        employee_id,
        search,
        start_date,
        end_date,
      } = req.query;

      const where = {};

      if (status && status !== "ALL") where.status = status;
      if (stage && stage !== "ALL") where.current_stage = stage;
      if (department && department !== "ALL") where.department = department;
      if (claim_type && claim_type !== "ALL") where.claim_type = claim_type;
      if (employee_id) where.employee_id = employee_id;

      if (start_date && end_date) {
        where.createdAt = {
          [Op.between]: [new Date(start_date), new Date(end_date + "T23:59:59.999Z")],
        };
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [
          { claim_number: { [Op.iLike]: term } },
          { employee_name: { [Op.iLike]: term } },
          { employee_id: { [Op.iLike]: term } },
          { title: { [Op.iLike]: term } },
          { department: { [Op.iLike]: term } },
        ];
      }

      const claims = await ExpenseClaim.findAll({
        where,
        include: [{ model: ExpenseClaimItem, as: "items" }],
        order: [["createdAt", "DESC"]],
      });

      // Overall Organization KPI metrics
      const allCompanyClaims = await ExpenseClaim.findAll({
        attributes: ["status", "current_stage", "total_amount", "approved_amount", "department", "claim_type"],
      });

      let totalCount = allCompanyClaims.length;
      let totalAmountClaimed = 0;
      let pendingManagerCount = 0;
      let pendingFinanceCount = 0;
      let totalApprovedAmount = 0;
      let totalDisbursedAmount = 0;
      let rejectedCount = 0;

      const deptSpending = {};
      const typeSpending = {};

      allCompanyClaims.forEach((c) => {
        const total = parseFloat(c.total_amount) || 0;
        const app = parseFloat(c.approved_amount) || 0;
        totalAmountClaimed += total;

        if (c.status === "SUBMITTED") {
          pendingManagerCount++;
        } else if (c.status === "APPROVED_BY_MANAGER") {
          pendingFinanceCount++;
        } else if (c.status === "APPROVED_BY_FINANCE") {
          totalApprovedAmount += app;
        } else if (c.status === "PAID") {
          totalDisbursedAmount += app;
          // Track department spending
          const d = c.department || "Other";
          deptSpending[d] = (deptSpending[d] || 0) + app;
          // Track claim type spending
          const t = c.claim_type || "OTHER";
          typeSpending[t] = (typeSpending[t] || 0) + app;
        } else if (c.status === "REJECTED_BY_MANAGER" || c.status === "REJECTED_BY_FINANCE") {
          rejectedCount++;
        }
      });

      return res.json({
        success: true,
        stats: {
          total_claims: totalCount,
          total_amount_claimed: totalAmountClaimed,
          pending_manager_count: pendingManagerCount,
          pending_finance_count: pendingFinanceCount,
          total_approved_amount: totalApprovedAmount,
          total_disbursed_amount: totalDisbursedAmount,
          rejected_count: rejectedCount,
          department_spending: deptSpending,
          type_spending: typeSpending,
        },
        data: claims,
      });
    } catch (err) {
      console.error("Get all claims error:", err);
      return res.status(500).json({ error: "Failed to fetch company claims registry: " + err.message });
    }
  },

  // =========================================================================
  // 13. HR OVERRIDE / SPECIAL ACTION
  // =========================================================================
  async hrOverrideClaim(req, res) {
    try {
      const { id } = req.params;
      const { action, notes, reassign_manager_id, reassign_manager_name } = req.body;

      const claim = await ExpenseClaim.findByPk(id, {
        include: [{ model: ExpenseClaimItem, as: "items" }],
      });

      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }

      const hrId = req.user?.employee_id || "HR-ADMIN-01";
      const hrName = req.user?.name || "HR Director";

      if (action === "FORCE_APPROVE_TO_FINANCE") {
        await claim.update({
          status: "APPROVED_BY_MANAGER",
          current_stage: "FINANCE",
          approved_amount: claim.total_amount,
          manager_id: hrId,
          manager_name: `${hrName} (HR Override)`,
          manager_decision: "APPROVED",
          manager_decision_at: new Date(),
          manager_comments: notes || "Bypassed / Approved by HR Oversight",
          hr_override_id: hrId,
          hr_override_name: hrName,
          hr_override_notes: notes || "Bypassed to Finance by HR",
        });
      } else if (action === "FORCE_APPROVE_TO_PAYOUT") {
        await claim.update({
          status: "APPROVED_BY_FINANCE",
          current_stage: "PAYMENT",
          approved_amount: claim.approved_amount || claim.total_amount,
          finance_id: hrId,
          finance_name: `${hrName} (HR Override)`,
          finance_decision: "APPROVED",
          finance_decision_at: new Date(),
          finance_comments: notes || "Approved for Payout by HR Oversight",
          hr_override_id: hrId,
          hr_override_name: hrName,
          hr_override_notes: notes || "Sanctioned for payout by HR",
        });
      } else if (action === "REASSIGN_MANAGER") {
        if (!reassign_manager_id) {
          return res.status(400).json({ error: "Please provide the new manager ID" });
        }
        await claim.update({
          manager_id: reassign_manager_id,
          manager_name: reassign_manager_name || reassign_manager_id,
          hr_override_id: hrId,
          hr_override_name: hrName,
          hr_override_notes: `Reassigned review to ${reassign_manager_name || reassign_manager_id}. Note: ${notes || ""}`,
        });
      } else if (action === "ADD_NOTE") {
        await claim.update({
          hr_override_id: hrId,
          hr_override_name: hrName,
          hr_override_notes: notes,
        });
      } else {
        return res.status(400).json({ error: "Invalid HR override action: " + action });
      }

      return res.json({
        success: true,
        message: "HR oversight action applied successfully",
        data: claim,
      });
    } catch (err) {
      console.error("HR override claim error:", err);
      return res.status(500).json({ error: "Failed to apply HR action: " + err.message });
    }
  },

  // =========================================================================
  // 14. RECEIPT UPLOAD ENDPOINT
  // =========================================================================
  async uploadReceipt(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No receipt file uploaded" });
      }

      const fileUrl = `/api/uploads/${req.file.filename}`;
      return res.json({
        success: true,
        message: "Receipt uploaded successfully",
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (err) {
      console.error("Upload receipt error:", err);
      return res.status(500).json({ error: "Failed to upload receipt: " + err.message });
    }
  },
};

module.exports = claimController;
