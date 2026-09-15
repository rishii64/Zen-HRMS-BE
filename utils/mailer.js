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
  const mailOptions = {
    from: `"Zentelex HRMS" <${process.env.SMTP_MAIL}>`,
    to: email,
    subject: "Welcome to Zentelex - Your HRMS Account Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #1e3a8a; text-align: center;">Welcome to Zentelex HRMS</h2>
        <p>Dear ${name},</p>
        <p>Your HRMS account has been successfully created by the HR Department. Below are your login credentials:</p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; margin: 20px 0; border-radius: 8px; font-size: 14px;">
          <p style="margin: 5px 0;"><strong>Portal URL:</strong> <a href="http://localhost:3000/login">http://localhost:3000/login</a></p>
          <p style="margin: 5px 0;"><strong>Employee ID:</strong> <span style="font-family: monospace; font-weight: bold; color: #1e3a8a;">${employeeCode}</span></p>
          <p style="margin: 5px 0;"><strong>Password:</strong> <span style="font-family: monospace; font-weight: bold; color: #1e3a8a;">${password}</span></p>
        </div>
        <p>Please log in and update your password immediately by navigating to your profile's password change section.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">&copy; 2026 Zentelex HRMS. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendCredentialsEmail };
