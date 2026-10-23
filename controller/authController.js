const { User, Employee, PasswordReset } = require("../config/db");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTPEmail } = require("../utils/mailer");

const VALID_ROLES = [
  "management",
  "hr",
  "employee",
  "accounts",
  "admin",
  "hrmanager",
  "hod",
  "manager",
  "teamlead",
  "payroll",
  "ceo",
  "coo",
  "cfo",
  "vp",
  "secretary"
];

const AuthController = {
  // POST /api/auth/register
  async register(req, res) {
    try {
      const { name, email, password, role, employee_id } = req.body;

      if (!name || !email || !password || !role || !employee_id) {
        return res.status(400).json({ error: "Name, email, password, role, and Employee ID are required" });
      }

      const normalizedRole = role.toLowerCase().trim();
      if (normalizedRole !== "hr" && normalizedRole !== "hrmanager" && normalizedRole !== "admin") {
        return res.status(403).json({ error: "Registration is restricted to HR/Admin roles only. Other employees are registered by HR." });
      }

      // Check if email already exists in users (case-insensitive)
      const existingUser = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase().trim()
        )
      });
      if (existingUser) {
        return res.status(409).json({ error: "Email is already registered" });
      }

      // Check if employee ID already registered in users (case-insensitive)
      const code = employee_id.trim();
      const existingEmpId = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          code.toLowerCase()
        )
      });
      if (existingEmpId) {
        return res.status(409).json({ error: "Employee ID is already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const normalizedEmail = email.toLowerCase().trim();

      // Create user
      const newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        work_email: normalizedEmail,
        password: passwordHash,
        role: normalizedRole,
        employee_id: code,
        is_active: true
      });

      // If user is an employee, create basic profile in employees table if not present
      if (normalizedRole === "employee") {
        const empProfile = await Employee.findOne({
          where: {
            [Op.or]: [
              { employee_id: code },
              sequelize.where(
                sequelize.fn("LOWER", sequelize.col("email")),
                normalizedEmail
              )
            ]
          }
        });

        if (!empProfile) {
          const nameParts = name.trim().split(/\s+/);
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          await Employee.create({
            employee_id: code,
            first_name: firstName,
            last_name: lastName,
            email: normalizedEmail,
            work_email: normalizedEmail,
            status: "Active",
            job_role: "employee"
          });
        }
      }

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        userId: newUser.id
      });
    } catch (err) {
      console.error("Register error:", err.message);
      return res.status(500).json({ error: "Registration failed. Please try again." });
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    try {
      const { employee_id, password, role } = req.body;

      if (!employee_id || !password) {
        return res.status(400).json({ error: "Employee ID and password are required" });
      }

      const normalizedRole = role ? role.toLowerCase().trim() : "";
      if (normalizedRole && !VALID_ROLES.includes(normalizedRole)) {
        return res.status(400).json({ error: "Invalid role selected" });
      }

      // Find user by employee_id (Employee Code) or email
      const loginIdentifier = employee_id.toLowerCase().trim();
      const user = await User.findOne({
        where: {
          [Op.or]: [
            sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), loginIdentifier),
            sequelize.where(sequelize.fn("LOWER", sequelize.col("email")), loginIdentifier)
          ]
        }
      });

      if (!user) {
        return res.status(404).json({ error: "User doesn't exist" });
      }

      // Check user active status
      if (!user.is_active) {
        return res.status(401).json({ error: "User account is deactivated. Please contact your administrator." });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid Employee ID or password" });
      }

      // Role compatibility verification
      let userRole = (user.role || "employee").toLowerCase().trim();
      if (userRole === "employees") userRole = "employee";

      if (normalizedRole) {
        const isAdminLeadership = ["admin", "management", "ceo", "coo", "cto", "cfo", "vp", "secretary"].includes(userRole);
        const isExactMatch = userRole === normalizedRole;
        const isEmployeeLogin = normalizedRole === "employee"; // Every person in the organization is an employee
        const isItMatch = userRole === "it" && ["it", "employee"].includes(normalizedRole);
        const isManagementMatch = ["management", "ceo", "coo", "cfo", "vp", "secretary"].includes(userRole) && ["management", "admin", "employee"].includes(normalizedRole);
        const isHodManager = ["hod", "manager", "teamlead"].includes(userRole) && ["hod", "manager", "teamlead", "management", "employee"].includes(normalizedRole);
        const isFinancePayroll = ["accounts", "payroll"].includes(userRole) && ["accounts", "payroll", "employee"].includes(normalizedRole);
        const isHrMatch = ["hr", "hrmanager"].includes(userRole) && ["hr", "hrmanager", "employee"].includes(normalizedRole);
        const isAdminMatch = userRole === "admin" && ["admin", "management", "employee"].includes(normalizedRole);

        if (!isAdminLeadership && !isExactMatch && !isEmployeeLogin && !isItMatch && !isManagementMatch && !isHodManager && !isFinancePayroll && !isHrMatch && !isAdminMatch) {
          return res.status(401).json({
            error: `Access Denied: This account is registered as '${user.role}'. Please select the appropriate role to log in.`
          });
        }
      }

      const canonicalRole = userRole === "employees" ? "employee" : userRole;

      // Ensure designation & department are synced from Employee table if needed
      let userDesignation = user.designation || "";
      let userDept = user.dept || "";
      if ((!userDesignation || !userDept) && user.employee_id) {
        try {
          const emp = await Employee.findOne({
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              user.employee_id.toLowerCase().trim()
            ),
            attributes: ["designation", "dept", "department"]
          });
          if (emp) {
            if (!userDesignation && emp.designation) {
              userDesignation = emp.designation;
              user.designation = userDesignation;
            }
            if (!userDept && (emp.dept || emp.department)) {
              userDept = emp.dept || emp.department;
              user.dept = userDept;
            }
            await user.save().catch(() => {});
          }
        } catch (_) {}
      }

      // Create JWT token including designation for RBAC
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: canonicalRole,
          dept: userDept || user.dept,
          employee_id: user.employee_id,
          designation: userDesignation || user.designation || "",
        },
        process.env.JWT_SECRET,
        { expiresIn: "14h" }
      );

      // Set token cookie
      const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
      res.cookie("token", token, {
        httpOnly: false,
        secure: isHttps,
        sameSite: "lax",
        path: "/",
        maxAge: 14 * 60 * 60 * 1000 // 14 hours
      });

      // Auto-register attendance check-in on portal login
      let autoAttendance = null;
      try {
        const AttendanceController = require("./attendanceController");
        if (user.employee_id && AttendanceController.performAutoCheckIn) {
          autoAttendance = await AttendanceController.performAutoCheckIn(user.employee_id);
        }
      } catch (attErr) {
        console.warn("Auto check-in on login warning:", attErr.message);
      }

      return res.json({
        success: true,
        message: "Login successful",
        token,
        attendance: autoAttendance,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: canonicalRole,
          employee_id: user.employee_id,
          employee_code: user.employee_id,
          dept: userDept || user.dept,
          designation: userDesignation || user.designation || "",
          profile_photo: user.profile_photo,
          tabs_enabled: user.tabs_enabled || false,
          enabled_tabs: user.enabled_tabs || "1,2,3,4",
          notice_acknowledged: Boolean(user.notice_acknowledged)
        }
      });
    } catch (err) {
      console.error("Login error:", err.message);
      return res.status(500).json({ error: "Login failed. Please try again." });
    }
  },

  // POST /api/auth/change-password or PATCH /api/auth/users/:id/password
  async changePassword(req, res) {
    try {
      const id = req.params.id || req.user?.id;
      if (!id) {
        return res.status(401).json({ error: "Unauthorized. User ID not found." });
      }

      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long." });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // If updating own password or currentPassword is supplied, verify it
      if (currentPassword !== undefined || !req.params.id) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Current password is required." });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: "Current password is incorrect." });
        }
        if (currentPassword === newPassword) {
          return res.status(400).json({ error: "New password cannot be the same as your current password." });
        }
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      user.password = passwordHash;
      await user.save();

      return res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
      console.error("Change password error:", err.message);
      return res.status(500).json({ error: "Failed to update password. Please try again." });
    }
  },

  // POST /api/auth/forgot-password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if email exists in users
      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase().trim()
        )
      });
      if (!user) {
        return res.status(404).json({ error: "Email is not registered" });
      }

      // Generate a 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      // OTP valid for 5 minutes
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      const normalizedEmail = email.toLowerCase().trim();

      // Save OTP record to database
      await PasswordReset.destroy({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          normalizedEmail
        )
      });

      await PasswordReset.create({
        email: normalizedEmail,
        otp: otp.trim(),
        expires_at: expiresAt
      });

      // Send the OTP via email
      let emailSent = true;
      try {
        await sendOTPEmail(normalizedEmail, otp);
      } catch (mailErr) {
        console.warn(`[OTP Service] Failed to send email to ${normalizedEmail}:`, mailErr.message);
        console.info(`[DEVELOPER NOTICE] Generated OTP for ${normalizedEmail}: ${otp}`);
        emailSent = false;
      }

      return res.json({
        success: true,
        message: emailSent
          ? "A verification OTP has been sent to your registered email"
          : "OTP generated successfully (Email transmission failed, check server console for OTP)"
      });
    } catch (err) {
      console.error("Forgot password error:", err.message);
      return res.status(500).json({ error: "Failed to process forgot password request. Please try again." });
    }
  },

  // POST /api/auth/verify-otp
  async verifyOTP(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: "Email, OTP, and new password are required" });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }

      // Retrieve latest OTP record
      const record = await PasswordReset.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase().trim()
        ),
        order: [["createdAt", "DESC"]]
      });

      if (!record || record.otp !== otp.trim()) {
        return res.status(400).json({ error: "Invalid OTP code" });
      }

      // Check expiration
      if (new Date(record.expires_at) < new Date()) {
        return res.status(400).json({ error: "OTP has expired. Please request a new one." });
      }

      // Find user to obtain user ID
      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase().trim()
        )
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      user.password = passwordHash;
      await user.save();

      // Clear the used OTP record
      await PasswordReset.destroy({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase().trim()
        )
      });

      return res.json({
        success: true,
        message: "Your password has been reset successfully"
      });
    } catch (err) {
      console.error("Verify OTP error:", err.message);
      return res.status(500).json({ error: "Failed to reset password. Please try again." });
    }
  },

  // GET /api/auth/users
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: ["id", "name", "email", "role", "employee_id", "is_active", "created_at"],
        order: [["id", "ASC"]]
      });
      return res.json(users);
    } catch (err) {
      console.error("Get users error:", err.message);
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  // PATCH /api/auth/users/:id/status
  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (is_active === undefined) {
        return res.status(400).json({ error: "is_active status is required" });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.is_active = !!is_active;
      await user.save();

      return res.json({ success: true, message: "User status updated successfully" });
    } catch (err) {
      console.error("Toggle status error:", err.message);
      return res.status(500).json({ error: "Failed to update user status" });
    }
  },

  // DELETE /api/auth/users/:id
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await user.destroy();
      return res.json({ success: true, message: "User deleted successfully" });
    } catch (err) {
      console.error("Delete user error:", err.message);
      return res.status(500).json({ error: "Failed to delete user" });
    }
  },

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      let empId = req.user?.employee_id;
      if (!empId) {
        const rawToken = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
        if (rawToken) {
          try {
            const decoded = jwt.verify(rawToken, process.env.JWT_SECRET, { ignoreExpiration: true });
            empId = decoded?.employee_id;
          } catch (_) {}
        }
      }
      if (empId) {
        const AttendanceController = require("./attendanceController");
        if (AttendanceController.performAutoCheckOut) {
          await AttendanceController.performAutoCheckOut(empId);
        }
      }
    } catch (outErr) {
      console.warn("Auto check-out on logout warning:", outErr.message);
    }

    const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.clearCookie("token", {
      path: "/",
      secure: isHttps,
      sameSite: "lax"
    });
    return res.json({ success: true, message: "Logged out successfully" });
  },

  // POST /api/auth/acknowledge-notice
  async acknowledgeNotice(req, res) {
    try {
      const userId = req.user?.id;
      const employeeId = req.user?.employee_id;
      if (!userId && !employeeId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await User.update(
        { notice_acknowledged: true },
        {
          where: userId ? { id: userId } : { employee_id: employeeId }
        }
      );

      return res.json({ success: true, message: "Attendance notice acknowledged permanently" });
    } catch (err) {
      console.error("Acknowledge notice error:", err.message);
      return res.status(500).json({ error: "Failed to acknowledge notice" });
    }
  }
};

module.exports = AuthController;
