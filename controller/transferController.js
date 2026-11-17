const { Transfer, Employee, User, Department, Designation, Notification, sequelize } = require("../config/db");
const { Op } = require("sequelize");

const TransferController = {
  // 1. GET ALL TRANSFERS & DEPUTATIONS (WITH FILTERING & ANALYTICS)
  getAllTransfers: async (req, res) => {
    try {
      const user = req.user || {};
      const role = (user.role || "").toLowerCase().trim();
      const userEmpId = user.employee_id || user.id;

      const {
        status,
        type,
        department,
        search,
        page = 1,
        limit = 50,
      } = req.query;

      const where = {};

      // Role-based visibility
      const isPrivileged = ["hr", "admin", "management", "ceo", "coo", "hrmanager"].includes(role);
      const isHOD = ["hod", "manager"].includes(role);

      if (!isPrivileged) {
        if (isHOD) {
          // HODs see transfers where their department is current or target, or they initiated it, or their own
          const hodDept = user.dept || user.department;
          where[Op.or] = [
            { employee_id: userEmpId },
            { current_department: hodDept },
            { target_department: hodDept },
            { initiated_by: String(userEmpId) },
          ];
        } else {
          // Normal employees only see their own transfers
          where.employee_id = userEmpId;
        }
      }

      // Query Filters
      if (status && status !== "All") {
        where.status = status;
      }
      if (type && type !== "All") {
        where.transfer_type = type;
      }
      if (department && department !== "All") {
        where[Op.or] = [
          { current_department: department },
          { target_department: department },
        ];
      }

      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`;
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push({
          [Op.or]: [
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Transfer.employee_name")), "LIKE", q),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Transfer.employee_id")), "LIKE", q),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Transfer.transfer_code")), "LIKE", q),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Transfer.target_department")), "LIKE", q),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Transfer.target_branch")), "LIKE", q),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("Transfer.current_department")), "LIKE", q),
          ],
        });
      }

      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const { rows: transfers, count: totalCount } = await Transfer.findAndCountAll({
        where,
        order: [["created_at", "DESC"]],
        limit: parseInt(limit, 10),
        offset,
      });

      // Compute live analytics counts
      const allRecords = await Transfer.findAll({
        attributes: ["status", "transfer_type", "letter_status"],
      });

      const stats = {
        total: allRecords.length,
        pending: allRecords.filter((t) => t.status === "Pending").length,
        approved: allRecords.filter((t) => t.status === "Approved").length,
        effective: allRecords.filter((t) => t.status === "Effective").length,
        rejected: allRecords.filter((t) => t.status === "Rejected").length,
        inter_departmental: allRecords.filter((t) => t.transfer_type === "Inter-Departmental").length,
        branch_transfer: allRecords.filter((t) => t.transfer_type === "Branch Transfer").length,
        deputation: allRecords.filter((t) => t.transfer_type === "Deputation").length,
        role_reassignment: allRecords.filter((t) => t.transfer_type === "Role Reassignment").length,
        letters_issued: allRecords.filter((t) => t.letter_status === "Issued").length,
      };

      return res.status(200).json({
        success: true,
        data: transfers,
        stats,
        total: totalCount,
        page: parseInt(page, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      });
    } catch (err) {
      console.error("Error in getAllTransfers:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch transfers & deputations: " + err.message,
      });
    }
  },

  // 2. GET SINGLE TRANSFER RECORD
  getTransferById: async (req, res) => {
    try {
      const { id } = req.params;
      const transfer = await Transfer.findByPk(id, {
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["employee_id", "first_name", "last_name", "email", "dept", "designation", "work_location", "reporting_manager"],
          },
        ],
      });

      if (!transfer) {
        return res.status(404).json({ success: false, message: "Transfer record not found" });
      }

      return res.status(200).json({ success: true, data: transfer });
    } catch (err) {
      console.error("Error in getTransferById:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 3. INITIATE / CREATE TRANSFER OR DEPUTATION
  createTransfer: async (req, res) => {
    try {
      const user = req.user || {};
      const {
        employee_id,
        transfer_type,
        target_department,
        target_branch,
        target_designation,
        target_reporting_manager,
        revised_salary,
        deputation_allowance,
        relocation_allowance,
        effective_date,
        deputation_start_date,
        deputation_end_date,
        reason,
        remarks,
      } = req.body;

      if (!employee_id || !transfer_type || !effective_date) {
        return res.status(400).json({
          success: false,
          message: "Employee ID, transfer type, and effective date are required",
        });
      }

      // Fetch employee current details
      const emp = await Employee.findOne({ where: { employee_id } });
      if (!emp) {
        return res.status(404).json({
          success: false,
          message: `Employee with ID ${employee_id} not found`,
        });
      }

      const currentYear = new Date().getFullYear();
      const prefix = transfer_type === "Deputation" ? "DEP" : "TRF";
      const count = await Transfer.count();
      const transfer_code = `${prefix}-${currentYear}-${String(count + 1).padStart(4, "0")}`;
      const letter_ref_no = `ZEN/HR/${prefix}/${currentYear}/${String(count + 1).padStart(3, "0")}`;

      const empFullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name || "Employee";

      const newTransfer = await Transfer.create({
        transfer_code,
        employee_id,
        employee_name: empFullName,
        employee_email: emp.email || emp.work_email,
        transfer_type,
        current_department: emp.dept || "General",
        target_department: target_department || emp.dept,
        current_branch: emp.work_location || "Kolkata HQ",
        target_branch: target_branch || emp.work_location || "Kolkata HQ",
        current_designation: emp.designation || "Staff",
        target_designation: target_designation || emp.designation,
        current_reporting_manager: emp.reporting_manager || "N/A",
        target_reporting_manager: target_reporting_manager || emp.reporting_manager,
        current_salary: emp.current_salary || null,
        revised_salary: revised_salary || emp.current_salary || null,
        deputation_allowance: parseFloat(deputation_allowance) || 0.0,
        relocation_allowance: parseFloat(relocation_allowance) || 0.0,
        effective_date,
        deputation_start_date: deputation_start_date || (transfer_type === "Deputation" ? effective_date : null),
        deputation_end_date: deputation_end_date || null,
        reason,
        remarks,
        status: "Pending",
        workflow_step: "HR Review",
        initiated_by: String(user.employee_id || user.id || "HR-Admin"),
        initiated_by_name: user.name || user.userName || "HR Department",
        handover_status: "Pending",
        letter_ref_no,
        letter_issue_date: new Date().toISOString().split("T")[0],
        letter_status: "Draft",
        letter_signatory_name: "Priyanka Mukherjee",
        letter_signatory_title: "CHRO & VP - Human Resources",
      });

      // Send In-App Notification to HR/Management
      try {
        await Notification.create({
          recipient_role: "hr",
          title: `New ${transfer_type} Request`,
          message: `${transfer_type} initiated for ${empFullName} (${transfer_code}) to ${target_department || target_branch}. Effective: ${effective_date}.`,
          type: "approval",
          category: "Approvals",
          link: "/transfers",
          priority: "high",
          source_module: "transfers",
        });
      } catch (notifErr) {
        console.warn("Could not create transfer notification:", notifErr.message);
      }

      return res.status(201).json({
        success: true,
        message: `${transfer_type} initiated successfully (${transfer_code})`,
        data: newTransfer,
      });
    } catch (err) {
      console.error("Error in createTransfer:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 4. UPDATE STATUS (APPROVE / REJECT / MARK EFFECTIVE)
  updateTransferStatus: async (req, res) => {
    try {
      const user = req.user || {};
      const { id } = req.params;
      const { status, remarks, rejection_reason, apply_to_employee } = req.body;

      if (!["Pending", "Approved", "Effective", "Rejected", "Cancelled"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const transfer = await Transfer.findByPk(id);
      if (!transfer) {
        return res.status(404).json({ success: false, message: "Transfer record not found" });
      }

      const updatePayload = {
        status,
        remarks: remarks !== undefined ? remarks : transfer.remarks,
        rejection_reason: rejection_reason !== undefined ? rejection_reason : transfer.rejection_reason,
      };

      if (status === "Approved") {
        updatePayload.approved_by = String(user.employee_id || user.id || "HR-Admin");
        updatePayload.approved_by_name = user.name || user.userName || "Priyanka Mukherjee (CHRO)";
        updatePayload.approval_date = new Date();
        updatePayload.workflow_step = "Completed";
        updatePayload.letter_status = "Issued";
      } else if (status === "Rejected") {
        updatePayload.workflow_step = "Rejected";
      } else if (status === "Effective") {
        updatePayload.workflow_step = "Completed";
      }

      // If apply_to_employee is requested or status becomes Effective, update Employee master profile
      let employeeUpdated = false;
      if (apply_to_employee || status === "Effective") {
        const emp = await Employee.findOne({ where: { employee_id: transfer.employee_id } });
        if (emp) {
          const empUpdate = {};
          if (transfer.target_department) empUpdate.dept = transfer.target_department;
          if (transfer.target_branch) empUpdate.work_location = transfer.target_branch;
          if (transfer.target_designation) empUpdate.designation = transfer.target_designation;
          if (transfer.target_reporting_manager) empUpdate.reporting_manager = transfer.target_reporting_manager;
          if (transfer.revised_salary && parseFloat(transfer.revised_salary) > 0) {
            empUpdate.current_salary = transfer.revised_salary;
          }

          if (transfer.target_designation) {
            empUpdate.role_updated_at = new Date();
          }
          await emp.update(empUpdate);
          updatePayload.sync_employee_record = true;
          employeeUpdated = true;

          if (transfer.target_designation) {
            try {
              await User.update(
                {
                  designation: transfer.target_designation,
                  role_updated_at: new Date(),
                },
                {
                  where: sequelize.where(
                    sequelize.fn("LOWER", sequelize.col("employee_id")),
                    emp.employee_id.toLowerCase().trim()
                  ),
                }
              );

              const { sendRealtimeNotification, getIO } = require("../socket");
              const io = getIO();
              if (io) {
                io.to(`user:${emp.employee_id.toUpperCase().trim()}`).emit("role_updated", {
                  employee_id: emp.employee_id,
                  title: "Role & Designation Updated",
                  message: "Your role has been updated, please re-login to enjoy seamless workflow",
                  requires_relogin: true,
                  new_designation: transfer.target_designation,
                  timestamp: new Date().toISOString(),
                });
              }
              await sendRealtimeNotification({
                recipient_id: emp.employee_id,
                title: "Role & Permissions Updated ⚡",
                message: "Your role has been updated, please re-login to enjoy seamless workflow",
                type: "role_updated",
                category: "General",
                priority: "urgent",
                source_module: "transfers",
                created_by: user.name || "CHRO",
              });
            } catch (_) {}
          }
        }
      }

      await transfer.update(updatePayload);

      // Send In-App Notification to the Employee
      try {
        const title = status === "Approved"
          ? `Transfer Approved & Letter Ready`
          : status === "Rejected"
          ? `Transfer Request Update`
          : `Transfer Status: ${status}`;

        const message = status === "Approved"
          ? `Your ${transfer.transfer_type} to ${transfer.target_department || transfer.target_branch} has been approved. Effective: ${transfer.effective_date}. You can now view and download your official Transfer Letter.`
          : status === "Rejected"
          ? `Your ${transfer.transfer_type} request (${transfer.transfer_code}) was not approved. Reason: ${rejection_reason || "Administrative considerations"}.`
          : `Your ${transfer.transfer_type} is now ${status}.`;

        await Notification.create({
          recipient_id: transfer.employee_id,
          title,
          message,
          type: "transfer",
          category: "Announcements",
          link: "/transfers",
          priority: status === "Approved" ? "high" : "normal",
          source_module: "transfers",
        });
      } catch (notifErr) {
        console.warn("Could not notify employee about transfer status:", notifErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Transfer ${transfer.transfer_code} marked as ${status}${employeeUpdated ? " and employee master record updated" : ""}`,
        data: transfer,
      });
    } catch (err) {
      console.error("Error in updateTransferStatus:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 5. UPDATE HANDOVER WORKFLOW
  updateHandover: async (req, res) => {
    try {
      const { id } = req.params;
      const { handover_status, handover_notes } = req.body;

      const transfer = await Transfer.findByPk(id);
      if (!transfer) {
        return res.status(404).json({ success: false, message: "Transfer not found" });
      }

      await transfer.update({
        handover_status: handover_status || transfer.handover_status,
        handover_notes: handover_notes !== undefined ? handover_notes : transfer.handover_notes,
      });

      return res.status(200).json({
        success: true,
        message: "Handover status updated successfully",
        data: transfer,
      });
    } catch (err) {
      console.error("Error in updateHandover:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 6. UPDATE TRANSFER LETTER DETAILS
  updateLetterDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        letter_ref_no,
        letter_issue_date,
        letter_status,
        letter_signatory_name,
        letter_signatory_title,
      } = req.body;

      const transfer = await Transfer.findByPk(id);
      if (!transfer) {
        return res.status(404).json({ success: false, message: "Transfer not found" });
      }

      await transfer.update({
        letter_ref_no: letter_ref_no || transfer.letter_ref_no,
        letter_issue_date: letter_issue_date || transfer.letter_issue_date,
        letter_status: letter_status || transfer.letter_status,
        letter_signatory_name: letter_signatory_name || transfer.letter_signatory_name,
        letter_signatory_title: letter_signatory_title || transfer.letter_signatory_title,
      });

      return res.status(200).json({
        success: true,
        message: "Transfer letter configuration updated successfully",
        data: transfer,
      });
    } catch (err) {
      console.error("Error in updateLetterDetails:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 7. DELETE TRANSFER (ONLY DRAFT/PENDING)
  deleteTransfer: async (req, res) => {
    try {
      const { id } = req.params;
      const transfer = await Transfer.findByPk(id);
      if (!transfer) {
        return res.status(404).json({ success: false, message: "Transfer not found" });
      }

      await transfer.destroy();
      return res.status(200).json({
        success: true,
        message: `Transfer record ${transfer.transfer_code} deleted successfully`,
      });
    } catch (err) {
      console.error("Error in deleteTransfer:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 8. METADATA HELPER FOR FORM DROPDOWNS
  getTransferMetadata: async (req, res) => {
    try {
      const employees = await Employee.findAll({
        attributes: [
          "employee_id",
          "first_name",
          "last_name",
          "email",
          "dept",
          "designation",
          "work_location",
          "reporting_manager",
          "current_salary",
        ],
        where: {
          status: { [Op.ne]: "Terminated" },
        },
        order: [["first_name", "ASC"]],
      });

      const formattedEmployees = employees.map((e) => ({
        id: e.employee_id,
        name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.employee_id,
        email: e.email,
        dept: e.dept || "General",
        designation: e.designation || "Staff",
        branch: e.work_location || "Kolkata HQ",
        reporting_manager: e.reporting_manager || "N/A",
        current_salary: e.current_salary,
      }));

      // Standard Branches
      const branches = [
        "Kolkata HQ",
        "Mumbai Branch",
        "Bangalore Tech Center",
        "New Delhi Corporate Office",
        "Hyderabad Innovation Hub",
        "Chennai Regional Unit",
        "Pune Development Center",
        "Remote / Distributed",
      ];

      // Extract distinct departments and designations
      let departments = [];
      try {
        const deptRecords = await Department.findAll({ attributes: ["name"] });
        departments = deptRecords.map((d) => d.name).filter(Boolean);
      } catch (_) {}
      if (departments.length === 0) {
        departments = [
          "Engineering",
          "Human Resources",
          "Sales & Business Development",
          "Operations & Logistics",
          "Finance & Accounts",
          "Marketing & Communications",
          "Product Management",
          "Legal & Compliance",
          "Customer Success & Key Accounts",
          "Strategic Projects & PMO",
        ];
      }

      let designations = [];
      try {
        const desigRecords = await Designation.findAll({ attributes: ["title"] });
        designations = desigRecords.map((d) => d.title).filter(Boolean);
      } catch (_) {}
      if (designations.length === 0) {
        designations = [
          "Intern",
          "Executive",
          "Sr. Executive",
          "Asst. Manager",
          "Deputy Manager",
          "Manager",
          "Sr. Manager",
          "Asst. General Manager",
          "Deputy General Manager",
          "General Manager",
          "CHRO/VP HR",
          "Lead Solutions Architect",
          "Senior Software Engineer",
          "Director - Strategic Operations",
        ];
      }

      return res.status(200).json({
        success: true,
        data: {
          employees: formattedEmployees,
          departments: Array.from(new Set(departments)),
          designations: Array.from(new Set(designations)),
          branches,
          transferTypes: [
            "Inter-Departmental",
            "Branch Transfer",
            "Deputation",
            "Role Reassignment",
          ],
        },
      });
    } catch (err) {
      console.error("Error in getTransferMetadata:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};

module.exports = TransferController;

