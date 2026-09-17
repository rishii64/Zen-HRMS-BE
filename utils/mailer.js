const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST
    ? {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    }
    : {
      service: "gmail",
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    }
);

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"HRMS Portal" <${process.env.SMTP_MAIL}>`,
    to: email,
    subject: "Password Reset OTP - HRMS Portal",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #ea580c; text-align: center;">HRMS Password Reset</h2>
        <p>You requested a password reset for your HRMS account. Your 6-digit One-Time Password (OTP) is :</p>
        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1e3a8a;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This OTP is valid for <strong>5 minutes</strong>. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">&copy; 2026 Zentelex HRMS. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendCredentialsEmail = async (email, name, employeeCode, password) => {
  const portalUrl =
    process.env.PORTAL_URL ||
    process.env.FRONTEND_URL ||
    "https://hrms.zentelex.com/login";

  const mailOptions = {
    from: `"Zentelex HRMS" <${process.env.SMTP_MAIL}>`,
    to: email,
    subject: `Welcome to Zentelex - Your HRMS Login Credentials (${employeeCode})`,
    text: `Dear ${name},

Welcome to Zentelex HRMS! Your official employee account has been successfully created.

Your HRMS Login Credentials:
----------------------------------------
Portal URL: ${portalUrl}
Employee Code / ID: ${employeeCode}
Password: ${password}
----------------------------------------

Please note: Your Employee Code (${employeeCode}) is your official identifier. Use this code to sign in to the portal and for all daily attendance clock-in/out, leave applications, payroll, and profile services.

Best regards,
HR Operations Team
Zentelex HRMS`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
          <h2 style="color: #0f172a; margin: 0 0 6px; font-size: 22px; font-weight: 700;">Welcome to Zentelex HRMS</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Your Official Enterprise Employee Portal</p>
        </div>

        <div style="padding: 20px 0;">
          <p style="font-size: 15px; margin: 0 0 12px; color: #334155;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
            Your official HRMS account has been created by the HR Department. You can now access your daily attendance, schedule, payslips, leave applications, and company records.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ea580c; letter-spacing: 0.5px; margin-bottom: 12px;">
              Your Login Credentials
            </div>
            
            <div style="margin-bottom: 10px; font-size: 14px;">
              <span style="color: #64748b; display: inline-block; width: 150px; font-weight: 500;">Portal URL:</span>
              <a href="${portalUrl}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${portalUrl}</a>
            </div>

            <div style="margin-bottom: 10px; font-size: 14px;">
              <span style="color: #64748b; display: inline-block; width: 150px; font-weight: 500;">Employee ID / Code:</span>
              <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #1e3a8a; background-color: #e0f2fe; padding: 2px 8px; border-radius: 4px; border: 1px solid #bae6fd;">${employeeCode}</span>
            </div>

            <div style="margin-bottom: 6px; font-size: 14px;">
              <span style="color: #64748b; display: inline-block; width: 150px; font-weight: 500;">Temporary Password:</span>
              <span style="font-family: 'Courier New', monospace; font-size: 15px; font-weight: bold; color: #334155; background-color: #f1f5f9; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">${password}</span>
            </div>
          </div>

          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
            <strong>Important:</strong> Your <strong>Employee Code (${employeeCode})</strong> is your primary login identifier across all HRMS services. Please use it to log in and mark your daily check-in / check-out.
          </div>

          <div style="text-align: center; margin: 24px 0 16px;">
            <a href="${portalUrl}" style="background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
              Sign In to HRMS Portal
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 16px 0 0;">
            For security reasons, please change your password after logging in for the first time by visiting your profile settings.
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0 16px;" />
        <div style="text-align: center; font-size: 11px; color: #94a3b8;">
          &copy; 2026 Zentelex HRMS • Human Resource Management System
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendCredentialsEmail };
