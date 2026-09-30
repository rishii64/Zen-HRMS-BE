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
  const normalizedEmail = (email || "").toLowerCase().trim();
  const mailOptions = {
    from: `"HRMS Portal" <${process.env.SMTP_MAIL}>`,
    to: normalizedEmail,
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
  const normalizedEmail = (email || "").toLowerCase().trim();
  const portalUrl =
    process.env.PORTAL_URL ||
    process.env.FRONTEND_URL ||
    "https://hrms.zentelex.com/login";

  const mailOptions = {
    from: `"Zentelex HRMS" <${process.env.SMTP_MAIL}>`,
    to: normalizedEmail,
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

const sendInterviewScheduleEmail = async ({
  candidateName,
  candidateEmail,
  position,
  department,
  requisitionCode,
  interviewRound,
  interviewDate,
  interviewTime,
  interviewMode,
  meetingLink,
  interviewNotes,
  hrName,
  hrEmail,
  hodName,
  hodEmail,
}) => {
  const roundLabels = {
    SCHEDULED: "Interview Scheduled",
    ROUND_1_HR: "Round 1 — HR Screening",
    ROUND_2_TECH: "Round 2 — Technical (HOD)",
    ROUND_3_FINAL: "Round 3 — Final Round",
    INTERVIEW_REQUESTED: "Interview Requested",
  };
  const stageName = roundLabels[interviewRound] || interviewRound || "Interview Session";

  const isValidEmail = (e) =>
    typeof e === "string" && e.trim().includes("@") && e.trim().includes(".");

  const toRecipients = [];
  const ccRecipients = [];

  if (isValidEmail(candidateEmail)) {
    toRecipients.push(candidateEmail.trim().toLowerCase());
  }

  if (isValidEmail(hrEmail)) {
    const cleanHr = hrEmail.trim().toLowerCase();
    if (!toRecipients.includes(cleanHr)) {
      ccRecipients.push(cleanHr);
    }
  }

  if (isValidEmail(hodEmail)) {
    const cleanHod = hodEmail.trim().toLowerCase();
    if (!toRecipients.includes(cleanHod) && !ccRecipients.includes(cleanHod)) {
      ccRecipients.push(cleanHod);
    }
  }

  // If candidate email wasn't provided, send directly to HR and HOD
  if (toRecipients.length === 0) {
    if (ccRecipients.length > 0) {
      toRecipients.push(...ccRecipients);
      ccRecipients.length = 0;
    } else {
      console.warn("sendInterviewScheduleEmail: No valid email addresses found.");
      return { success: false, reason: "No valid email recipients" };
    }
  }

  const isOnlineLink =
    meetingLink &&
    (meetingLink.startsWith("http://") || meetingLink.startsWith("https://"));

  const mailOptions = {
    from: `"Zentelex Recruitment" <${process.env.SMTP_MAIL}>`,
    to: toRecipients.join(", "),
    cc: ccRecipients.length > 0 ? ccRecipients.join(", ") : undefined,
    subject: `Interview Invitation: ${position} — ${candidateName} (${stageName})`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 14px; background-color: #ffffff; color: #0f172a;">
        <div style="text-align: center; padding-bottom: 18px; border-bottom: 2px solid #f1f5f9;">
          <h2 style="color: #1e3a8a; margin: 0 0 6px; font-size: 22px; font-weight: 700;">Interview Scheduled</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Zentelex HRMS Recruitment Portal</p>
        </div>

        <div style="padding: 20px 0;">
          <p style="font-size: 15px; margin: 0 0 12px; color: #334155;">
            Dear <strong>${candidateName}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
            Your interview for the position of <strong>${position}</strong> has been officially scheduled. Please review the complete meeting details below:
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px 20px; margin: 18px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tr>
                <td style="padding: 7px 0; color: #64748b; width: 160px; font-weight: 500;">Position:</td>
                <td style="padding: 7px 0; color: #0f172a; font-weight: 700;">${position}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Interview Stage:</td>
                <td style="padding: 7px 0; color: #0f172a; font-weight: 700;">${stageName}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Interview Date:</td>
                <td style="padding: 7px 0; color: #0f172a; font-weight: 700;">${interviewDate}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Interview Time:</td>
                <td style="padding: 7px 0; color: #1e3a8a; font-weight: 700;">${interviewTime || "11:00 AM"}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Meeting Mode:</td>
                <td style="padding: 7px 0; color: #0f172a; font-weight: 600;">${interviewMode || "Online"}</td>
              </tr>
              <tr>
                <td style="padding: 7px 0; color: #64748b; font-weight: 500;">Meeting Link:</td>
                <td style="padding: 7px 0;">
                  ${isOnlineLink
        ? `<a href="${meetingLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600; word-break: break-all;">${meetingLink}</a>`
        : `<strong style="color: #0f172a;">${meetingLink || "Will be shared by the organizer"}</strong>`
      }
                </td>
              </tr>
            </table>
          </div>

          ${isOnlineLink
        ? `
            <div style="text-align: center; margin: 24px 0 16px;">
              <a href="${meetingLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);">
                Join Interview Meeting
              </a>
            </div>
          `
        : ""
      }

          <div style="background-color: #eff6ff; border-left: 2px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin: 18px 0; font-size: 10px; color: #1e40af; line-height: 1.5;">
            <strong>Preparation Advice:</strong> Please join the session 5 minutes prior to the scheduled time. Ensure a stable internet connection, operational webcam, and quiet environment.
          </div>

          <p style="font-size: 13px; color: #64748b; margin: 18px 0 0;">
            Warm regards,<br />
            <strong>HR Recruitment Team</strong><br />
            Zentelex HRMS
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0 14px;" />
        <div style="text-align: center; font-size: 11px; color: #94a3b8;">
          &copy; 2026 Zentelex HRMS • Recruitment & Talent Acquisition
        </div>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendCredentialsEmail, sendInterviewScheduleEmail };
