const { User, Employee, Attendance, Resignation } = require("../config/db");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendCredentialsEmail } = require("../utils/mailer");

const resolveTargetEmpId = (req, empId) => {
  if (!empId || empId.toLowerCase().trim() === "me") {
    if (req.user && req.user.employee_id) return req.user.employee_id;
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith("Bearer ")) 
      ? authHeader.split(" ")[1] 
      : (req.cookies && req.cookies.token);
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.employee_id) return decoded.employee_id;
      } catch (_) {}
    }
  }
  return empId;
};

const EmployeeController = {
  // GET /api/auth/employees
  async getAllEmployees(req, res) {
    try {
      const users = await User.findAll({
        order: [["id", "ASC"]]
      });

      const employees = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        employee_code: user.employee_id,
        job_role: user.role,
        status: user.status || (user.is_active ? "Active" : "Inactive"),
        current_salary: user.current_salary,
        dept: user.dept,
        designation: user.designation,
        joining_date: user.joining_date,
        reporting_manager: user.reporting_manager,
        phone_no: user.phone_no,
        kpi: user.kpi,
        tabs_enabled: user.tabs_enabled,
        enabled_tabs: user.enabled_tabs,
        document_status: user.document_status || "Not Uploaded",
        doc_resume: user.doc_resume,
        doc_id: user.doc_id,
        doc_cert: user.doc_cert,
        profile_photo: user.profile_photo,
        profile_pic: user.profile_photo,
        salary_structure: user.salary_structure
      }));

      return res.json({ success: true, data: employees });
    } catch (err) {
      console.error("Get all employees error:", err.message);
      return res.status(500).json({ error: "Failed to fetch employees" });
    }
  },

  // POST /api/auth/employees/add
  async addEmployee(req, res) {
    try {
      const {
        employee_code,
        name,
        email,
        password,
        job_role,
        status,
        current_salary,
        dept,
        designation,
        joining_date,
        reporting_manager,
        phone_no,
        kpi,
        tabs_enabled,
        enabled_tabs
      } = req.body;

      if (!employee_code || !name || !email || !dept || !designation || !current_salary || !joining_date || !reporting_manager || !phone_no) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Check if employee code or email already exists
      const existingUserByCode = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_code.toLowerCase().trim()
        )
      });
      if (existingUserByCode) {
        return res.status(400).json({ error: "Employee ID is already registered" });
      }

      const existingUserByEmail = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase().trim()
        )
      });
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email is already registered" });
      }

      const defaultPassword = password || "User@123";
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      // Convert array to comma-separated string if it is an array
      let tabsString = "";
      if (Array.isArray(enabled_tabs)) {
        tabsString = enabled_tabs.join(",");
      } else if (typeof enabled_tabs === "string") {
        tabsString = enabled_tabs;
      }

      const isActive = status === "Active";

      const newUser = await User.create({
        employee_id: employee_code.trim(),
        name: name.trim(),
        email: email.trim(),
        password: passwordHash,
        role: job_role ? job_role.toLowerCase().trim() : "employee",
        is_active: isActive,
        status: status || (isActive ? "Active" : "Inactive"),
        current_salary: current_salary ? parseFloat(current_salary) : null,
        dept: dept ? dept.trim() : null,
        designation: designation ? designation.trim() : null,
        joining_date: joining_date || null,
        reporting_manager: reporting_manager ? reporting_manager.trim() : "N/A",
        phone_no: phone_no ? phone_no.trim() : null,
        kpi: kpi ? kpi.trim() : null,
        tabs_enabled: tabs_enabled === true || tabs_enabled === "true",
        enabled_tabs: tabsString || "1,2,3,4"
      });

      // Sync to employees table
      try {
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        await Employee.create({
          employee_id: employee_code.trim(),
          first_name: firstName,
          last_name: lastName,
          email: email.trim(),
          status: status || "Active",
          job_role: job_role || "employee",
          dept: dept ? dept.trim() : null,
          designation: designation ? designation.trim() : null,
          current_salary: current_salary ? parseFloat(current_salary) : null,
          joining_date: joining_date || null,
          reporting_manager: reporting_manager ? reporting_manager.trim() : "N/A",
          phone_no: phone_no ? phone_no.trim() : null,
          kpi: kpi ? kpi.trim() : null,
          tabs_enabled: tabs_enabled === true || tabs_enabled === "true",
          enabled_tabs: tabsString || "1,2,3,4"
        });
      } catch (err) {
        console.error("Failed to create employee profile in employees table:", err.message);
      }

      // Send welcome email with login credentials
      let emailSent = false;
      let emailError = null;
      try {
        await sendCredentialsEmail(email.trim(), name.trim(), employee_code.trim(), defaultPassword);
        emailSent = true;
      } catch (mailErr) {
        emailError = mailErr.message;
        console.error("Failed to send welcome credentials email:", mailErr.message);
      }

      return res.status(201).json({
        success: true,
        message: emailSent
          ? `Employee added successfully! Login credentials with Employee Code (${employee_code.trim()}) have been sent to ${email.trim()}.`
          : `Employee added successfully. (Note: Email delivery failed: ${emailError || "Check SMTP settings"}). Please share Employee Code: ${employee_code.trim()} with the user.`,
        email_sent: emailSent,
        employee: {
          id: newUser.id,
          employee_code: newUser.employee_id,
          name: newUser.name,
          email: newUser.email,
          job_role: newUser.role,
          tabs_enabled: newUser.tabs_enabled,
          enabled_tabs: newUser.enabled_tabs
        }
      });
    } catch (err) {
      console.error("Add employee error:", err.message);
      return res.status(500).json({ error: "Failed to add employee" });
    }
  },

  // POST /api/auth/employees/update
  async updateEmployee(req, res) {
    try {
      const {
        employee_code,
        name,
        email,
        job_role,
        status,
        current_salary,
        dept,
        designation,
        joining_date,
        reporting_manager,
        phone_no,
        kpi,
        tabs_enabled,
        enabled_tabs
      } = req.body;

      if (!employee_code || !name || !email || !dept || !designation || !current_salary || !joining_date || !reporting_manager || !phone_no) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_code.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Convert array to comma-separated string if it is an array
      let tabsString = "";
      if (Array.isArray(enabled_tabs)) {
        tabsString = enabled_tabs.join(",");
      } else if (typeof enabled_tabs === "string") {
        tabsString = enabled_tabs;
      }

      const isActive = status === "Active";

      await user.update({
        name: name.trim(),
        email: email.trim(),
        role: job_role ? job_role.toLowerCase().trim() : "employee",
        is_active: isActive,
        status: status || (isActive ? "Active" : "Inactive"),
        current_salary: current_salary ? parseFloat(current_salary) : null,
        dept: dept ? dept.trim() : null,
        designation: designation ? designation.trim() : null,
        joining_date: joining_date || null,
        reporting_manager: reporting_manager ? reporting_manager.trim() : "N/A",
        phone_no: phone_no ? phone_no.trim() : null,
        kpi: kpi ? kpi.trim() : null,
        tabs_enabled: tabs_enabled === true || tabs_enabled === "true",
        enabled_tabs: tabsString || "1,2,3,4"
      });

      // Sync to employees table
      try {
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const [emp, created] = await Employee.findOrCreate({
          where: { employee_id: employee_code.trim() },
          defaults: {
            first_name: firstName,
            last_name: lastName,
            email: email.trim(),
            status: status || "Active",
            job_role: job_role || "employee",
            dept: dept ? dept.trim() : null,
            designation: designation ? designation.trim() : null,
            current_salary: current_salary ? parseFloat(current_salary) : null,
            joining_date: joining_date || null,
            reporting_manager: reporting_manager ? reporting_manager.trim() : "N/A",
            phone_no: phone_no ? phone_no.trim() : null,
            kpi: kpi ? kpi.trim() : null,
            tabs_enabled: tabs_enabled === true || tabs_enabled === "true",
            enabled_tabs: tabsString || "1,2,3,4"
          }
        });

        if (!created) {
          await emp.update({
            first_name: firstName,
            last_name: lastName,
            email: email.trim(),
            status: status || "Active",
            job_role: job_role || "employee",
            dept: dept ? dept.trim() : null,
            designation: designation ? designation.trim() : null,
            current_salary: current_salary ? parseFloat(current_salary) : null,
            joining_date: joining_date || null,
            reporting_manager: reporting_manager ? reporting_manager.trim() : "N/A",
            phone_no: phone_no ? phone_no.trim() : null,
            kpi: kpi ? kpi.trim() : null,
            tabs_enabled: tabs_enabled === true || tabs_enabled === "true",
            enabled_tabs: tabsString || "1,2,3,4"
          });
        }
      } catch (err) {
        console.error("Failed to sync employee update to employees table:", err.message);
      }

      // Sync to attendance table
      try {
        const targetDept = (job_role === "hr" || job_role === "hrmanager" || job_role === "admin") ? "HR" : (dept ? dept.trim() : "Other");
        await Attendance.update(
          { dept: targetDept },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              employee_code.toLowerCase().trim()
            )
          }
        );
      } catch (err) {
        console.error("Failed to sync department update to attendance table:", err.message);
      }

      return res.json({
        success: true,
        message: "Employee updated successfully",
        employee: {
          id: user.id,
          employee_code: user.employee_id,
          name: user.name,
          email: user.email,
          job_role: user.role,
          tabs_enabled: user.tabs_enabled,
          enabled_tabs: user.enabled_tabs
        }
      });
    } catch (err) {
      console.error("Update employee error:", err.message);
      return res.status(500).json({ error: "Failed to update employee" });
    }
  },

  // POST /api/auth/employees/delete
  async deleteEmployee(req, res) {
    try {
      const { employee_code } = req.body;
      if (!employee_code) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      await User.destroy({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_code.toLowerCase().trim()
        )
      });

      try {
        await Employee.destroy({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            employee_code.toLowerCase().trim()
          )
        });
      } catch (err) {
        console.error("Failed to delete from employees table:", err.message);
      }

      return res.json({ success: true, message: "Employee deleted successfully" });
    } catch (err) {
      console.error("Delete employee error:", err.message);
      return res.status(500).json({ error: "Failed to delete employee" });
    }
  },

  // POST /api/auth/employees/toggle-tabs
  async toggleEmployeeTabs(req, res) {
    try {
      const { employee_code, tabs_enabled } = req.body;
      if (!employee_code) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_code.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const isEnabled = tabs_enabled === true || tabs_enabled === "true";
      await user.update({ tabs_enabled: isEnabled });

      try {
        const emp = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            employee_code.toLowerCase().trim()
          )
        });
        if (emp) {
          await emp.update({ tabs_enabled: isEnabled });
        }
      } catch (err) {
        console.error("Failed to sync toggle-tabs to employees table:", err.message);
      }

      return res.json({
        success: true,
        message: isEnabled ? "All tabs enabled for employee" : "Employee tabs restricted",
        tabs_enabled: user.tabs_enabled
      });
    } catch (err) {
      console.error("Toggle employee tabs error:", err.message);
      return res.status(500).json({ error: "Failed to toggle employee tabs" });
    }
  },

  // POST /api/auth/employees/update-tabs
  async updateEmployeeTabs(req, res) {
    try {
      const { employee_code, enabled_tabs } = req.body;
      if (!employee_code) {
        return res.status(400).json({ error: "Employee ID is required" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_code.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ error: "Employee not found" });
      }

      let tabsString = "";
      if (Array.isArray(enabled_tabs)) {
        tabsString = enabled_tabs.join(",");
      } else if (typeof enabled_tabs === "string") {
        tabsString = enabled_tabs;
      }

      await user.update({ enabled_tabs: tabsString });

      try {
        const emp = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            employee_code.toLowerCase().trim()
          )
        });
        if (emp) {
          await emp.update({ enabled_tabs: tabsString });
        }
      } catch (err) {
        console.error("Failed to sync enabled_tabs to employees table:", err.message);
      }

      return res.json({
        success: true,
        message: "Employee tabs updated successfully",
        enabled_tabs: user.enabled_tabs
      });
    } catch (err) {
      console.error("Update employee tabs error:", err.message);
      return res.status(500).json({ error: "Failed to update employee tabs" });
    }
  },

  // GET /api/auth/employee/:empId
  async getEmployeeByCode(req, res) {
    try {
      const { empId } = req.params;
      const targetCode = resolveTargetEmpId(req, empId);
      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          targetCode.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      // Check for resignation records to determine exit/relieving date
      let resignation = null;
      try {
        resignation = await Resignation.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            targetCode.toLowerCase().trim()
          ),
          order: [["id", "DESC"]]
        });
      } catch (err) {
        console.warn("Could not fetch resignation details for employee:", err.message);
      }

      // Employee status: Active, Inactive, Resigned
      const statusValue = user.status || (user.is_active ? "Active" : "Inactive");
      const isStatusActive = String(statusValue).toLowerCase() === "active";
      const isResigned = String(statusValue).toLowerCase() === "resigned" || (
        !isStatusActive && resignation && ["Approved", "Accepted", "Completed", "Relieved"].includes(resignation.status)
      );

      const relievingDate = isResigned
        ? (resignation?.hr_confirmed_lwd || resignation?.last_working_date || user.updated_at || user.updatedAt)
        : null;

      const employee = {
        id: user.id,
        name: user.name,
        first_name: user.name,
        email: user.email,
        employee_id: user.employee_id,
        role: user.role,
        is_active: user.is_active,
        status: statusValue,
        current_salary: user.current_salary,
        department: user.dept,
        designation: user.designation,
        joining_date: user.joining_date,
        reporting_manager: user.reporting_manager,
        phone_no: user.phone_no,
        phone: user.phone_no,
        kpi: user.kpi,
        tabs_enabled: user.tabs_enabled,
        enabled_tabs: user.enabled_tabs,
        dob: user.dob,
        gender: user.gender,
        nationality: user.nationality,
        address_current: user.address_current,
        address_permanent: user.address_permanent,
        emergency_contact_name: user.emergency_contact_name,
        emergency_contact_phone: user.emergency_contact_phone,
        education: user.education,
        family_details: user.family_details,
        certifications: user.certifications,
        passport_visa: user.passport_visa,
        bank_details: user.bank_details,
        doc_resume: user.doc_resume,
        doc_id: user.doc_id,
        doc_cert: user.doc_cert,
        profile_photo: user.profile_photo,
        blood_group: user.blood_group,
        religion: user.religion,
        total_experience: user.total_experience,
        previous_experience: user.previous_experience || user.total_experience || "",
        is_resigned: isResigned,
        relieving_date: relievingDate,
        last_working_date: resignation?.last_working_date || relievingDate,
        resignation_status: resignation?.status || (isResigned ? "Resigned" : null),
        marital_status: user.marital_status,
        document_status: user.document_status || "Not Uploaded"
      };

      return res.json({ success: true, employee });
    } catch (err) {
      console.error("Get employee profile error:", err.message);
      return res.status(500).json({ success: false, error: "Failed to retrieve employee profile" });
    }
  },

  // POST /api/auth/employee/:empId/profile
  async updateDetailedProfile(req, res) {
    try {
      const { empId } = req.params;
      const targetCode = resolveTargetEmpId(req, empId);
      const {
        dob,
        gender,
        nationality,
        address_current,
        address_permanent,
        emergency_contact_name,
        emergency_contact_phone,
        education,
        family_details,
        certifications,
        passport_visa,
        bank_details,
        blood_group,
        religion,
        total_experience,
        previous_experience,
        marital_status
      } = req.body;

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          targetCode.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      const files = req.files || {};
      const doc_resume = files.doc_resume ? files.doc_resume[0].filename : null;
      const doc_id = files.doc_id ? files.doc_id[0].filename : null;
      const doc_cert = files.doc_cert ? files.doc_cert[0].filename : null;
      const profile_photo = files.profile_photo ? files.profile_photo[0].filename : null;

      const updateData = {
        dob: dob || user.dob,
        gender: gender || user.gender,
        nationality: nationality || user.nationality,
        address_current: address_current || user.address_current,
        address_permanent: address_permanent || user.address_permanent,
        emergency_contact_name: emergency_contact_name || user.emergency_contact_name,
        emergency_contact_phone: emergency_contact_phone || user.emergency_contact_phone,
        education: education || user.education,
        family_details: family_details || user.family_details,
        certifications: certifications || user.certifications,
        passport_visa: passport_visa || user.passport_visa,
        bank_details: bank_details || user.bank_details,
        blood_group: blood_group || user.blood_group,
        religion: religion || user.religion,
        total_experience: total_experience || previous_experience || user.total_experience,
        previous_experience: previous_experience !== undefined ? previous_experience : (user.previous_experience || user.total_experience),
        marital_status: marital_status || user.marital_status
      };

      if (doc_resume) updateData.doc_resume = doc_resume;
      if (doc_id) updateData.doc_id = doc_id;
      if (doc_cert) updateData.doc_cert = doc_cert;
      if (profile_photo) updateData.profile_photo = profile_photo;

      let currentStatus = user.document_status || "Not Uploaded";
      if (doc_resume || doc_id || doc_cert) {
        currentStatus = "Pending Verification";
      } else if (currentStatus === "Not Uploaded" && (user.doc_resume || user.doc_id || user.doc_cert)) {
        currentStatus = "Pending Verification";
      }
      updateData.document_status = currentStatus;

      await user.update(updateData);

      // Sync to employees table
      try {
        const emp = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            targetCode.toLowerCase().trim()
          )
        });
        if (emp) {
          await emp.update(updateData);
        }
      } catch (err) {
        console.error("Failed to sync detailed profile update to employees table:", err.message);
      }

      return res.json({
        success: true,
        message: "Detailed profile updated successfully",
        profile_photo: user.profile_photo,
        employee: {
          id: user.id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          designation: user.designation,
          dept: user.dept,
          profile_photo: user.profile_photo,
          document_status: user.document_status
        }
      });
    } catch (err) {
      console.error("Update detailed profile error:", err.message);
      return res.status(500).json({ success: false, error: "Failed to update detailed profile" });
    }
  },

  // POST /api/auth/employees/verify-documents
  async verifyEmployeeDocuments(req, res) {
    try {
      const { employee_code, document_status } = req.body;
      if (!employee_code || !document_status) {
        return res.status(400).json({ error: "Employee ID and verification status are required" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_code.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ error: "Employee not found" });
      }

      await user.update({ document_status });

      try {
        const emp = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            employee_code.toLowerCase().trim()
          )
        });
        if (emp) {
          await emp.update({ document_status });
        }
      } catch (err) {
        console.error("Failed to sync verification status to employees table:", err.message);
      }

      return res.json({
        success: true,
        message: `Employee document status updated to ${document_status} successfully`,
        document_status
      });
    } catch (err) {
      console.error("Verify employee documents error:", err.message);
      return res.status(500).json({ error: "Failed to update document verification status" });
    }
  },

  // GET /api/auth/employees/:empId/salary or /api/salary/:code
  async getSalaryStructure(req, res) {
    try {
      const empId = req.params.empId || req.params.code || req.query.employee_code;
      if (!empId) {
        return res.status(400).json({ success: false, error: "Employee code is required" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      let parsedStructure = null;
      if (user.salary_structure) {
        try {
          parsedStructure = typeof user.salary_structure === "string"
            ? JSON.parse(user.salary_structure)
            : user.salary_structure;
        } catch (e) {
          parsedStructure = null;
        }
      }

      const currentSalary = parseFloat(user.current_salary) || 0;

      let basic = 0;
      let da = 0;
      let hra = 0;
      let allowance = 0;
      let conveyance = 0;
      let medical = 0;

      let professional_tax = 0;
      let income_tax = 0;
      let pf = 0;
      let esi = 0;
      let tds = 0;
      let lop = 0;

      if (parsedStructure && parsedStructure.earnings) {
        const e = parsedStructure.earnings;
        const d = parsedStructure.deductions || {};
        basic = parseFloat(e.basic) || 0;
        da = parseFloat(e.da) || 0;
        hra = parseFloat(e.hra) || 0;
        allowance = parseFloat(e.allowance) || 0;
        conveyance = parseFloat(e.conveyance) || 0;
        medical = parseFloat(e.medical) || 0;

        professional_tax = parseFloat(d.professional_tax) || 0;
        income_tax = parseFloat(d.income_tax) || 0;
        pf = parseFloat(d.pf) || 0;
        esi = parseFloat(d.esi) || 0;
        tds = parseFloat(d.tds) || 0;
        lop = parseFloat(d.lop) || 0;
      } else {
        // Standard default breakdown based on currentSalary
        if (currentSalary > 0) {
          basic = Math.round(currentSalary * 0.40);
          da = Math.round(currentSalary * 0.10);
          hra = Math.round(currentSalary * 0.40);
          conveyance = Math.round(currentSalary * 0.05) || 1600;
          medical = Math.round(currentSalary * 0.05) || 1250;
          const assigned = basic + da + hra + conveyance + medical;
          allowance = Math.max(0, currentSalary - assigned);

          pf = Math.round(basic * 0.12);
          esi = currentSalary <= 21000 ? Math.round(currentSalary * 0.0075) : 0;
          professional_tax = currentSalary > 15000 ? 200 : 0;
          income_tax = 0;
          tds = 0;
          lop = 0;
        }
      }

      const gross_salary = basic + da + hra + allowance + conveyance + medical;
      const total_deductions = professional_tax + income_tax + pf + esi + tds + lop;
      const net_salary = Math.max(0, gross_salary - total_deductions);

      return res.json({
        success: true,
        employee_code: user.employee_id,
        name: user.name,
        current_salary: user.current_salary,
        salary: {
          earnings: {
            basic,
            da,
            hra,
            allowance,
            conveyance,
            medical
          },
          deductions: {
            professional_tax,
            income_tax,
            pf,
            esi,
            tds,
            lop
          },
          gross_salary,
          total_deductions,
          net_salary
        }
      });
    } catch (err) {
      console.error("Get salary structure error:", err);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  // POST /api/auth/employees/:empId/salary or /api/salary/:code
  async updateSalaryStructure(req, res) {
    try {
      const empId = req.params.empId || req.params.code || req.body.employee_code;
      if (!empId) {
        return res.status(400).json({ success: false, error: "Employee code is required" });
      }

      // Check role permissions: only HR or Admin can edit
      const userRole = (req.headers.role || (req.user && req.user.role) || req.body.role || "").toLowerCase();
      const isAuthorized = ["hr", "hrmanager", "admin"].includes(userRole);
      if (!isAuthorized) {
        return res.status(403).json({ success: false, error: "Access denied: Only HR can edit salary structure" });
      }

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          empId.toLowerCase().trim()
        )
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "Employee not found" });
      }

      const {
        basic = 0,
        da = 0,
        hra = 0,
        allowance = 0,
        conveyance = 0,
        medical = 0,
        professional_tax = 0,
        income_tax = 0,
        pf = 0,
        esi = 0,
        tds = 0,
        lop = 0
      } = req.body;

      const numBasic = Math.max(0, parseFloat(basic) || 0);
      const numDa = Math.max(0, parseFloat(da) || 0);
      const numHra = Math.max(0, parseFloat(hra) || 0);
      const numAllowance = Math.max(0, parseFloat(allowance) || 0);
      const numConveyance = Math.max(0, parseFloat(conveyance) || 0);
      const numMedical = Math.max(0, parseFloat(medical) || 0);

      const numPT = Math.max(0, parseFloat(professional_tax) || 0);
      const numIT = Math.max(0, parseFloat(income_tax) || 0);
      const numPf = Math.max(0, parseFloat(pf) || 0);
      const numEsi = Math.max(0, parseFloat(esi) || 0);
      const numTds = Math.max(0, parseFloat(tds) || 0);
      const numLop = Math.max(0, parseFloat(lop) || 0);

      const gross_salary = numBasic + numDa + numHra + numAllowance + numConveyance + numMedical;
      const total_deductions = numPT + numIT + numPf + numEsi + numTds + numLop;
      const net_salary = Math.max(0, gross_salary - total_deductions);

      const structureData = {
        earnings: {
          basic: numBasic,
          da: numDa,
          hra: numHra,
          allowance: numAllowance,
          conveyance: numConveyance,
          medical: numMedical
        },
        deductions: {
          professional_tax: numPT,
          income_tax: numIT,
          pf: numPf,
          esi: numEsi,
          tds: numTds,
          lop: numLop
        },
        gross_salary,
        total_deductions,
        net_salary,
        updated_at: new Date().toISOString()
      };

      const structureJson = JSON.stringify(structureData);

      await user.update({
        salary_structure: structureJson,
        current_salary: gross_salary
      });

      // Sync to Employee table if exists
      try {
        const emp = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            empId.toLowerCase().trim()
          )
        });
        if (emp) {
          await emp.update({
            salary_structure: structureJson,
            current_salary: gross_salary
          });
        }
      } catch (syncErr) {
        console.warn("Could not sync salary_structure to Employee model:", syncErr.message);
      }

      return res.json({
        success: true,
        message: "Salary structure updated successfully",
        employee_code: user.employee_id,
        current_salary: gross_salary,
        salary: structureData
      });
    } catch (err) {
      console.error("Update salary structure error:", err);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
};

module.exports = EmployeeController;
