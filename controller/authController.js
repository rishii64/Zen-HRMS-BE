const { User, Employee, PasswordReset } = require("../config/db");
const { Op } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTPEmail } = require("../utils/mailer");

const VALID_ROLES = ["hr", "employee", "accounts", "hod"];

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

      // Create user
      const newUser = await User.create({
        name: name.trim(),
        email: email.trim(),
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
                email.toLowerCase().trim()
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
            email: email.trim(),
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

      if (!employee_id || !password || !role) {
        return res.status(400).json({ error: "Employee ID, password, and role are required" });
      }

      const normalizedRole = role.toLowerCase().trim();
      if (!VALID_ROLES.includes(normalizedRole)) {
        return res.status(400).json({ error: "Invalid role selected" });
      }

      // Find user by employee_id (Employee Code) or email, and role
      const loginIdentifier = employee_id.toLowerCase().trim();
      const user = await User.findOne({
        where: {
          [Op.and]: [
            {
              [Op.or]: [
                sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), loginIdentifier),
                sequelize.where(sequelize.fn("LOWER", sequelize.col("email")), loginIdentifier)
              ]
            },
            sequelize.where(sequelize.fn("LOWER", sequelize.col("role")), normalizedRole)
          ]
        }
      });

      if (!user) {
        // Check if the employee code or email is registered at all (across any role)
        const anyUser = await User.findOne({
          where: {
            [Op.or]: [
              sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), loginIdentifier),
              sequelize.where(sequelize.fn("LOWER", sequelize.col("email")), loginIdentifier)
            ]
          }
        });
        if (!anyUser) {
          return res.status(404).json({ error: "User doesn't exist" });
        }
        return res.status(401).json({ error: "Invalid Employee ID, password, or role" });
      }

      // Check user active status
      if (!user.is_active) {
        return res.status(401).json({ error: "User account is deactivated. Please contact your administrator." });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid Employee ID, password, or role" });
      }

      // Create JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Set cookie (optional fallback)
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          employee_id: user.employee_id,
          employee_code: user.employee_id,
          dept: user.dept,
          designation: user.designation,
          profile_photo: user.profile_photo,
          tabs_enabled: user.tabs_enabled || false,
          enabled_tabs: user.enabled_tabs || "1,2,3,4"
        }
      });
    } catch (err) {
      console.error("Login error:", err.message);
      return res.status(500).json({ error: "Login failed. Please try again." });
    }
  },

  // PATCH /api/auth/users/:id/password
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
      }

      const user = await User.findByPk(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      user.password = passwordHash;
      await user.save();

      return res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      console.error("Change password error:", err.message);
      return res.status(500).json({ error: "Failed to update password" });
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

      // Save OTP record to database
      await PasswordReset.destroy({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase().trim()
        )
      });

      await PasswordReset.create({
        email: email.trim(),
        otp: otp.trim(),
        expires_at: expiresAt
      });

      // Send the OTP via email
      let emailSent = true;
      try {
        await sendOTPEmail(email, otp);
      } catch (mailErr) {
        console.warn(`[OTP Service] Failed to send email to ${email}:`, mailErr.message);
        console.info(`[DEVELOPER NOTICE] Generated OTP for ${email}: ${otp}`);
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
  }
};

module.exports = AuthController;
