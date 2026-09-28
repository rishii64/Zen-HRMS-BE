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
        work_email: user.work_email || user.email,
        personal_email: user.personal_email || "",
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
        pan_no: user.pan_no || "",
        aadhaar_no: user.aadhaar_no || "",
        driving_license: user.driving_license || "",
        doc_resume: user.doc_resume,
        doc_id: user.doc_id,
        doc_cert: user.doc_cert,
        doc_pan: user.doc_pan,
        doc_aadhaar: user.doc_aadhaar,
        doc_payslips: user.doc_payslips,
        doc_exp_cert: user.doc_exp_cert,
        doc_last_company: user.doc_last_company,
        uploaded_documents: user.uploaded_documents,
        last_company_details: user.last_company_details,
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
        work_email,
        personal_email,
        pan_no,
        aadhaar_no,
        request_documents,
        document_status,
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

      const primaryEmail = (work_email || email || "").toLowerCase().trim();
      const normalizedPersonalEmail = personal_email ? personal_email.toLowerCase().trim() : null;
      const normalizedWorkEmail = primaryEmail;
      const normalizedEmployeeCode = employee_code ? employee_code.trim() : "";
      const normalizedPanNo = pan_no ? pan_no.toUpperCase().trim() : null;
      const normalizedAadhaarNo = aadhaar_no ? aadhaar_no.trim() : null;
      const docStatus = document_status || (request_documents ? "Pending Upload" : "Not Uploaded");

      if (!normalizedEmployeeCode || !name || !primaryEmail || !dept || !designation || !current_salary || !joining_date || !reporting_manager || !phone_no) {
        return res.status(400).json({ error: "All required fields must be filled (including Work Email)" });
      }

      // Check if employee code or email already exists
      const existingUserByCode = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          normalizedEmployeeCode.toLowerCase()
        )
      });
      if (existingUserByCode) {
        return res.status(400).json({ error: "Employee ID is already registered" });
      }

      const existingUserByEmail = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          primaryEmail
        )
      });
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Work email is already registered" });
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
        employee_id: normalizedEmployeeCode,
        name: name.trim(),
        email: primaryEmail,
        work_email: normalizedWorkEmail,
        personal_email: normalizedPersonalEmail,
        pan_no: normalizedPanNo,
        aadhaar_no: normalizedAadhaarNo,
        document_status: docStatus,
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
          employee_id: normalizedEmployeeCode,
          first_name: firstName,
          last_name: lastName,
          email: primaryEmail,
          work_email: normalizedWorkEmail,
          personal_email: normalizedPersonalEmail,
          pan_no: normalizedPanNo,
          aadhaar_no: normalizedAadhaarNo,
          document_status: docStatus,
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

      // Send welcome email with login credentials to work email
      let emailSent = false;
      let emailError = null;
      try {
        await sendCredentialsEmail(primaryEmail, name.trim(), normalizedEmployeeCode, defaultPassword);
        emailSent = true;
      } catch (mailErr) {
        emailError = mailErr.message;
        console.error("Failed to send welcome credentials email:", mailErr.message);
      }

      return res.status(201).json({
        success: true,
        message: emailSent
          ? `Employee added successfully! Login credentials with Employee Code (${normalizedEmployeeCode}) have been sent to ${primaryEmail}.`
          : `Employee added successfully. (Note: Email delivery failed: ${emailError || "Check SMTP settings"}). Please share Employee Code: ${normalizedEmployeeCode} with the user.`,
        email_sent: emailSent,
        employee: {
          id: newUser.id,
          employee_code: newUser.employee_id,
          name: newUser.name,
          email: newUser.email,
          work_email: newUser.work_email,
          personal_email: newUser.personal_email,
          pan_no: newUser.pan_no,
          aadhaar_no: newUser.aadhaar_no,
          document_status: newUser.document_status,
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
        work_email,
        personal_email,
        pan_no,
        aadhaar_no,
        request_documents,
        document_status,
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

      const primaryEmail = (work_email || email || "").toLowerCase().trim();
      const normalizedPersonalEmail = personal_email !== undefined ? (personal_email ? personal_email.toLowerCase().trim() : null) : undefined;

      if (!employee_code || !name || !primaryEmail || !dept || !designation || !current_salary || !joining_date || !reporting_manager || !phone_no) {
        return res.status(400).json({ error: "All required fields must be filled (including Work Email)" });
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

      const userUpdateFields = {
        name: name.trim(),
        ...(primaryEmail ? { email: primaryEmail, work_email: primaryEmail } : {}),
        ...(normalizedPersonalEmail !== undefined ? { personal_email: normalizedPersonalEmail } : {}),
        ...(pan_no !== undefined ? { pan_no: pan_no ? pan_no.toUpperCase().trim() : null } : {}),
        ...(aadhaar_no !== undefined ? { aadhaar_no: aadhaar_no ? aadhaar_no.trim() : null } : {}),
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
      };

      if (document_status !== undefined) {
        userUpdateFields.document_status = document_status;
      } else if (request_documents && (!user.document_status || user.document_status === "Not Uploaded")) {
        userUpdateFields.document_status = "Pending Upload";
      }

      if (tabs_enabled !== undefined) {
        userUpdateFields.tabs_enabled = tabs_enabled === true || tabs_enabled === "true";
      }

      if (enabled_tabs !== undefined && enabled_tabs !== null) {
        let tabsString = "";
        if (Array.isArray(enabled_tabs)) {
          tabsString = enabled_tabs.join(",");
        } else if (typeof enabled_tabs === "string") {
          tabsString = enabled_tabs;
        }
        userUpdateFields.enabled_tabs = tabsString;
      }

      await user.update(userUpdateFields);

      // Sync to employees table
      try {
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const empDefaults = {
          first_name: firstName,
          last_name: lastName,
          email: primaryEmail || user.email,
          work_email: primaryEmail || user.work_email || user.email,
          personal_email: normalizedPersonalEmail !== undefined ? normalizedPersonalEmail : user.personal_email,
          pan_no: userUpdateFields.pan_no !== undefined ? userUpdateFields.pan_no : user.pan_no,
          aadhaar_no: userUpdateFields.aadhaar_no !== undefined ? userUpdateFields.aadhaar_no : user.aadhaar_no,
          document_status: userUpdateFields.document_status !== undefined ? userUpdateFields.document_status : user.document_status,
          status: status || "Active",
          job_role: job_role || "employee",
          dept: dept ? dept.trim() : null,
          designation: designation ? designation.trim() : null,
          current_salary: current_salary ? parseFloat(current_salary) : null,
          joining_date: joining_date || null,
          reporting_manager: reporting_manager ? reporting_manager.trim() : "N/A",
          phone_no: phone_no ? phone_no.trim() : null,
          kpi: kpi ? kpi.trim() : null,
          tabs_enabled: userUpdateFields.tabs_enabled !== undefined ? userUpdateFields.tabs_enabled : user.tabs_enabled,
          enabled_tabs: userUpdateFields.enabled_tabs !== undefined ? userUpdateFields.enabled_tabs : user.enabled_tabs
        };

        const [emp, created] = await Employee.findOrCreate({
          where: { employee_id: employee_code.trim() },
          defaults: empDefaults
        });

        if (!created) {
          const empUpdateFields = {
            first_name: firstName,
            last_name: lastName,
            ...(primaryEmail ? { email: primaryEmail, work_email: primaryEmail } : {}),
            ...(normalizedPersonalEmail !== undefined ? { personal_email: normalizedPersonalEmail } : {}),
            ...(userUpdateFields.pan_no !== undefined ? { pan_no: userUpdateFields.pan_no } : {}),
            ...(userUpdateFields.aadhaar_no !== undefined ? { aadhaar_no: userUpdateFields.aadhaar_no } : {}),
            ...(userUpdateFields.document_status !== undefined ? { document_status: userUpdateFields.document_status } : {}),
            status: status || "Active",
            job_role: job_role || "employee",
            dept: dept ? dept.trim() : null,
            designation: designation ? designation.trim() : null,
            current_salary: current_salary ? parseFloat(current_salary) : null,
            joining_date: joining_date || null,
            reporting_manager: reporting_manager ? reporting_manager.trim() : "N/A",
            phone_no: phone_no ? phone_no.trim() : null,
            kpi: kpi ? kpi.trim() : null,
          };
          if (userUpdateFields.tabs_enabled !== undefined) {
            empUpdateFields.tabs_enabled = userUpdateFields.tabs_enabled;
          }
          if (userUpdateFields.enabled_tabs !== undefined) {
            empUpdateFields.enabled_tabs = userUpdateFields.enabled_tabs;
          }
          await emp.update(empUpdateFields);
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
        work_email: user.work_email || user.email,
        personal_email: user.personal_email || "",
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
        document_status: user.document_status || "Not Uploaded",
        pan_no: user.pan_no || "",
        aadhaar_no: user.aadhaar_no || "",
        driving_license: user.driving_license || "",
        doc_pan: user.doc_pan,
        doc_aadhaar: user.doc_aadhaar,
        doc_payslips: user.doc_payslips,
        doc_exp_cert: user.doc_exp_cert,
        doc_last_company: user.doc_last_company,
        uploaded_documents: user.uploaded_documents,
        last_company_details: user.last_company_details
      };

      return res.json({ success: true, employee, data: employee });
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
        personal_email,
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
        marital_status,
        pan_no,
        aadhaar_no,
        driving_license,
        last_company_details
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

      // Group incoming files by fieldname (supports upload.any() array or upload.fields() object)
      let filesList = [];
      if (Array.isArray(req.files)) {
        filesList = req.files;
      } else if (req.files && typeof req.files === "object") {
        Object.values(req.files).forEach((arr) => {
          if (Array.isArray(arr)) filesList.push(...arr);
        });
      }
      const filesByField = {};
      filesList.forEach((f) => {
        if (!filesByField[f.fieldname]) filesByField[f.fieldname] = [];
        filesByField[f.fieldname].push(f);
      });

      const doc_resume = filesByField.doc_resume ? filesByField.doc_resume[0].filename : null;
      const doc_id = filesByField.doc_id ? filesByField.doc_id[0].filename : null;
      const doc_cert = filesByField.doc_cert ? filesByField.doc_cert[0].filename : null;
      const profile_photo = filesByField.profile_photo ? filesByField.profile_photo[0].filename : null;
      const doc_pan = filesByField.doc_pan ? filesByField.doc_pan[0].filename : null;
      const doc_aadhaar = filesByField.doc_aadhaar ? filesByField.doc_aadhaar[0].filename : null;

      // Handle multiple file uploads for payslips, experience certificates, last company docs
      const payslipsArr = filesByField.doc_payslips ? filesByField.doc_payslips.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        uploaded_at: new Date().toISOString()
      })) : null;

      const expCertArr = filesByField.doc_exp_cert ? filesByField.doc_exp_cert.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        uploaded_at: new Date().toISOString()
      })) : null;

      const lastCompanyArr = filesByField.doc_last_company ? filesByField.doc_last_company.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        uploaded_at: new Date().toISOString()
      })) : null;

      const genericDocsArr = filesByField.uploaded_documents ? filesByField.uploaded_documents.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        uploaded_at: new Date().toISOString()
      })) : null;

      let updatedPayslips = user.doc_payslips;
      if (req.body.doc_payslips && typeof req.body.doc_payslips === 'string' && req.body.doc_payslips.startsWith('[')) {
        updatedPayslips = req.body.doc_payslips;
      } else if (payslipsArr && payslipsArr.length > 0) {
        try {
          const prev = user.doc_payslips ? JSON.parse(user.doc_payslips) : [];
          const combined = Array.isArray(prev) ? [...prev, ...payslipsArr] : payslipsArr;
          updatedPayslips = JSON.stringify(combined);
        } catch {
          updatedPayslips = JSON.stringify(payslipsArr);
        }
      }

      let updatedExpCert = user.doc_exp_cert;
      if (req.body.doc_exp_cert && typeof req.body.doc_exp_cert === 'string' && req.body.doc_exp_cert.startsWith('[')) {
        updatedExpCert = req.body.doc_exp_cert;
      } else if (expCertArr && expCertArr.length > 0) {
        try {
          const prev = user.doc_exp_cert ? JSON.parse(user.doc_exp_cert) : [];
          const combined = Array.isArray(prev) ? [...prev, ...expCertArr] : expCertArr;
          updatedExpCert = JSON.stringify(combined);
        } catch {
          updatedExpCert = JSON.stringify(expCertArr);
        }
      }

      let updatedLastCompanyDocs = user.doc_last_company;
      if (req.body.doc_last_company && typeof req.body.doc_last_company === 'string' && req.body.doc_last_company.startsWith('[')) {
        updatedLastCompanyDocs = req.body.doc_last_company;
      } else if (lastCompanyArr && lastCompanyArr.length > 0) {
        try {
          const prev = user.doc_last_company ? JSON.parse(user.doc_last_company) : [];
          const combined = Array.isArray(prev) ? [...prev, ...lastCompanyArr] : lastCompanyArr;
          updatedLastCompanyDocs = JSON.stringify(combined);
        } catch {
          updatedLastCompanyDocs = JSON.stringify(lastCompanyArr);
        }
      }

      let updatedUploadedDocs = user.uploaded_documents;
      if (req.body.uploaded_documents && typeof req.body.uploaded_documents === 'string' && req.body.uploaded_documents.startsWith('[')) {
        updatedUploadedDocs = req.body.uploaded_documents;
      } else if (genericDocsArr && genericDocsArr.length > 0) {
        try {
          const prev = user.uploaded_documents ? JSON.parse(user.uploaded_documents) : [];
          const combined = Array.isArray(prev) ? [...prev, ...genericDocsArr] : genericDocsArr;
          updatedUploadedDocs = JSON.stringify(combined);
        } catch {
          updatedUploadedDocs = JSON.stringify(genericDocsArr);
        }
      }

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

      if (pan_no !== undefined) updateData.pan_no = pan_no ? pan_no.toUpperCase().trim() : null;
      if (aadhaar_no !== undefined) updateData.aadhaar_no = aadhaar_no ? aadhaar_no.trim() : null;
      if (driving_license !== undefined) updateData.driving_license = driving_license ? driving_license.trim() : null;
      if (last_company_details !== undefined) updateData.last_company_details = last_company_details;

      if (personal_email !== undefined) {
        updateData.personal_email = personal_email ? personal_email.toLowerCase().trim() : null;
      }

      if (doc_resume) updateData.doc_resume = doc_resume;
      if (doc_id) updateData.doc_id = doc_id;
      if (doc_cert) updateData.doc_cert = doc_cert;
      if (profile_photo) updateData.profile_photo = profile_photo;
      if (doc_pan) updateData.doc_pan = doc_pan;
      if (doc_aadhaar) updateData.doc_aadhaar = doc_aadhaar;
      if (updatedPayslips !== undefined) updateData.doc_payslips = updatedPayslips;
      if (updatedExpCert !== undefined) updateData.doc_exp_cert = updatedExpCert;
      if (updatedLastCompanyDocs !== undefined) updateData.doc_last_company = updatedLastCompanyDocs;
      if (updatedUploadedDocs !== undefined) updateData.uploaded_documents = updatedUploadedDocs;

      let currentStatus = user.document_status || "Not Uploaded";
      const hasAnyNewDoc = doc_resume || doc_id || doc_cert || doc_pan || doc_aadhaar ||
        (payslipsArr && payslipsArr.length) || (expCertArr && expCertArr.length) ||
        (lastCompanyArr && lastCompanyArr.length) || (genericDocsArr && genericDocsArr.length);

      if (hasAnyNewDoc) {
        currentStatus = "Pending Verification";
      } else if (currentStatus === "Not Uploaded" && (user.doc_resume || user.doc_id || user.doc_cert || user.doc_pan || user.doc_aadhaar)) {
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
          work_email: user.work_email,
          personal_email: user.personal_email,
          designation: user.designation,
          dept: user.dept,
          profile_photo: user.profile_photo,
          document_status: user.document_status,
          pan_no: user.pan_no,
          aadhaar_no: user.aadhaar_no,
          driving_license: user.driving_license,
          last_company_details: user.last_company_details,
          doc_pan: user.doc_pan,
          doc_aadhaar: user.doc_aadhaar,
          doc_payslips: user.doc_payslips,
          doc_exp_cert: user.doc_exp_cert,
          doc_last_company: user.doc_last_company,
          uploaded_documents: user.uploaded_documents
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
      let mediclaim = 0;
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
        mediclaim = parseFloat(d.mediclaim) || 0;
        tds = parseFloat(d.tds) || 0;
        lop = parseFloat(d.lop) || 0;

        if (basic > 15000) {
          if (!mediclaim && esi) mediclaim = esi;
          esi = 0;
        } else {
          if (!esi && mediclaim) esi = mediclaim;
          mediclaim = 0;
        }
      } else {
        // Standard default breakdown based on currentSalary
        if (currentSalary > 0) {
          basic = Math.round(currentSalary * 0.45);
          da = 0;
          hra = Math.round(currentSalary * 0.40);
          conveyance = Math.round(currentSalary * 0.05) || 1600;
          medical = Math.round(currentSalary * 0.05) || 1250;
          const assigned = basic + da + hra + conveyance + medical;
          allowance = Math.max(0, currentSalary - assigned);

          pf = Math.round(basic * 0.12);
          if (basic <= 15000) {
            esi = currentSalary <= 21000 ? Math.round(currentSalary * 0.0075) : 0;
            mediclaim = 0;
          } else {
            esi = 0;
            mediclaim = currentSalary > 25000 ? 750 : 500;
          }
          professional_tax = currentSalary > 15000 ? 200 : 0;
          income_tax = 0;
          tds = 0;
          lop = 0;
        }
      }

      const gross_salary = basic + da + hra + allowance + conveyance + medical;
      const total_deductions = professional_tax + income_tax + pf + (basic <= 15000 ? esi : mediclaim) + tds + lop;
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
            esi: basic <= 15000 ? esi : 0,
            mediclaim: basic > 15000 ? mediclaim : 0,
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
        mediclaim = 0,
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

      // Map ESI if basic <= 15000; Map Mediclaim if basic > 15000
      let numEsi = 0;
      let numMediclaim = 0;
      if (numBasic <= 15000) {
        numEsi = Math.max(0, parseFloat(esi || mediclaim) || 0);
        numMediclaim = 0;
      } else {
        numMediclaim = Math.max(0, parseFloat(mediclaim || esi) || 0);
        numEsi = 0;
      }

      const numTds = Math.max(0, parseFloat(tds) || 0);
      const numLop = Math.max(0, parseFloat(lop) || 0);

      const gross_salary = numBasic + numDa + numHra + numAllowance + numConveyance + numMedical;
      const total_deductions = numPT + numIT + numPf + numEsi + numMediclaim + numTds + numLop;
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
          mediclaim: numMediclaim,
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
