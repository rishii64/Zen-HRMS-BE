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

const sendHREventAnnouncementEmail = async ({
  recipients,
  eventName,
  eventCategory,
  companyName,
  branchLocation,
  address,
  eventDate,
  startTime,
  endTime,
  content,
  signOff,
  theme = "purple",
}) => {
  if (!recipients || recipients.length === 0) {
    return { success: false, reason: "No recipients provided" };
  }

  // Theme palettes matching the reference illustration
  const themeConfigs = {
    purple: {
      gradient: "linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #f59e0b 100%)",
      headerBg: "#1e1035",
      accent: "#9333ea",
      badgeBg: "#f3e8ff",
      badgeText: "#7e22ce",
      ticketHolo: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 50%, #fde047 100%)",
      ticketText: "#3b0764",
      border: "#d8b4fe",
    },
    emerald: {
      gradient: "linear-gradient(135deg, #059669 0%, #0d9488 50%, #06b6d4 100%)",
      headerBg: "#042f2e",
      accent: "#059669",
      badgeBg: "#d1fae5",
      badgeText: "#065f46",
      ticketHolo: "linear-gradient(135deg, #a7f3d0 0%, #99f6e4 50%, #bae6fd 100%)",
      ticketText: "#064e3b",
      border: "#6ee7b7",
    },
    blue: {
      gradient: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #06b6d4 100%)",
      headerBg: "#0f172a",
      accent: "#2563eb",
      badgeBg: "#dbeafe",
      badgeText: "#1e40af",
      ticketHolo: "linear-gradient(135deg, #bfdbfe 0%, #c7d2fe 50%, #a5f3fc 100%)",
      ticketText: "#1e3a8a",
      border: "#93c5fd",
    },
    sunset: {
      gradient: "linear-gradient(135deg, #ea580c 0%, #e11d48 50%, #f59e0b 100%)",
      headerBg: "#2a0800",
      accent: "#ea580c",
      badgeBg: "#ffedd5",
      badgeText: "#9a3412",
      ticketHolo: "linear-gradient(135deg, #fed7aa 0%, #fecdd3 50%, #fef08a 100%)",
      ticketText: "#7c2d12",
      border: "#fdba74",
    },
  };

  const currentTheme = themeConfigs[theme] || themeConfigs.purple;

  // Format date nicely (e.g., Monday, 26 October 2026)
  let formattedDate = eventDate;
  let shortMonth = "EVT";
  let dayNum = "26";
  try {
    const d = new Date(eventDate);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      shortMonth = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      dayNum = d.getDate();
    }
  } catch (_) { }

  // Helper to format time into 12-hour AM/PM IST format
  const formatTimeToIST = (timeStr) => {
    if (!timeStr) return "";
    const trimmed = String(timeStr).trim();
    if (!trimmed) return "";

    // If already in 12-hour format with AM/PM (e.g. "10:30 AM" or "1:30 PM")
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const ampm = ampmMatch[3].toUpperCase();
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${strHours}:${minutes} ${ampm}`;
    }

    // If in 24-hour format (e.g. "12:30", "17:30", "09:15", "17:30:00")
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match24) {
      let hours = parseInt(match24[1], 10);
      const minutes = match24[2];
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${strHours}:${minutes} ${ampm}`;
    }

    return trimmed;
  };

  const formattedStartTime = formatTimeToIST(startTime);
  const formattedEndTime = formatTimeToIST(endTime);
  let timeDisplay = "As scheduled";
  if (formattedStartTime && formattedEndTime) {
    timeDisplay = `${formattedStartTime} – ${formattedEndTime} (IST)`;
  } else if (formattedStartTime) {
    timeDisplay = `${formattedStartTime} (IST)`;
  } else if (formattedEndTime) {
    timeDisplay = `${formattedEndTime} (IST)`;
  }

  // Escape and format multi-line content for HTML
  const formattedContent = (content || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  const mailOptions = {
    from: `"${companyName || "Zentelex"} HR Team" <${process.env.SMTP_MAIL}>`,
    to: process.env.SMTP_MAIL,
    bcc: recipients,
    subject: `🎟️ [Official Invitation] ${eventName} — ${companyName || "Zentelex"} (${formattedDate})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; width: 100%; margin: 0 auto; padding: 0; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #0f172a; color: #ffffff; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); box-sizing: border-box; word-break: break-word; overflow-wrap: break-word;">
        
        <div style="background: ${currentTheme.gradient}; padding: 24px 16px 20px; text-align: center; color: #ffffff; box-sizing: border-box;">
          <div style="display: inline-block; padding: 4px 14px; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; max-width: 90%; word-break: break-word;">
            ★ ${eventCategory || "Company Event"} • OFFICIAL INVITATION ★
          </div>
          <h1 style="color: #ffffff; margin: 4px 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.25; word-break: break-word; overflow-wrap: break-word;">
            ${companyName || "Zentelex HRMS"}
          </h1>
          <p style="color: rgba(255, 255, 255, 0.85); font-size: 12px; margin: 0; font-weight: 500; word-break: break-word;">
            Human Resources Operations • Corporate Event Desk
          </p>
        </div>

        <div style="padding: 16px 12px 10px; background-color: #0b0f19; box-sizing: border-box;">
          <div style="background: ${currentTheme.ticketHolo}; border-radius: 16px; padding: 16px 12px; color: ${currentTheme.ticketText}; position: relative; border: 2px solid rgba(255,255,255,0.85); box-shadow: 0 6px 20px rgba(0,0,0,0.25); box-sizing: border-box; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
              <tr>
                <td style="vertical-align: top; width: 22px; font-size: 8px; font-weight: 900; letter-spacing: 2px; color: ${currentTheme.ticketText}; text-transform: uppercase; writing-mode: vertical-lr; transform: rotate(180deg); padding-right: 8px; border-right: 2px dashed rgba(0,0,0,0.2); word-break: normal; white-space: nowrap; box-sizing: border-box;">
                  YOU ARE INVITED
                </td>
                <td style="vertical-align: top; padding-left: 10px; word-break: break-word; overflow-wrap: break-word; box-sizing: border-box;">
                  <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; opacity: 0.85; margin-bottom: 4px; word-break: break-word;">
                    ✦ OFFICIAL ADMISSION PASS ✦
                  </div>
                  <h2 style="font-size: 17px; font-weight: 900; margin: 0 0 8px; line-height: 1.3; color: ${currentTheme.ticketText}; word-break: break-word; overflow-wrap: break-word;">
                    ${eventName}
                  </h2>
                  <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px; line-height: 1.4; word-break: break-word; overflow-wrap: break-word;">
                    📅 ${formattedDate}<br />⏰ ${timeDisplay}
                  </div>
                  <div style="font-size: 11px; font-weight: 600; opacity: 0.9; line-height: 1.35; word-break: break-word; overflow-wrap: break-word;">
                    📍 ${branchLocation || "Company Premises"}${address ? ` — ${address}` : ""}
                  </div>
                  
                  <table style="width: 100%; margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.15); border-collapse: collapse; table-layout: fixed;">
                    <tr>
                      <td style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; letter-spacing: 1px; color: ${currentTheme.ticketText}; text-align: left; white-space: nowrap; overflow: hidden;">
                        ||||||||||||||||||
                      </td>
                      <td style="font-size: 9px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: ${currentTheme.ticketText}; text-align: right; white-space: nowrap;">
                        #HR-VIP-2026
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <div style="padding: 20px 16px; background-color: #ffffff; color: #0f172a; box-sizing: border-box; word-break: break-word; overflow-wrap: break-word;">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 14px; margin-bottom: 20px; box-sizing: border-box;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 85px; font-weight: 600; vertical-align: top; font-size: 12px;">📅 Date:</td>
                <td style="padding: 6px 0 6px 6px; color: #0f172a; font-weight: 700; word-break: break-word; overflow-wrap: break-word; font-size: 13px;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 85px; font-weight: 600; vertical-align: top; font-size: 12px;">⏰ Time:</td>
                <td style="padding: 6px 0 6px 6px; color: ${currentTheme.accent}; font-weight: 700; word-break: break-word; overflow-wrap: break-word; font-size: 13px;">${timeDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 85px; font-weight: 600; vertical-align: top; font-size: 12px;">📍 Location:</td>
                <td style="padding: 6px 0 6px 6px; color: #0f172a; font-weight: 700; word-break: break-word; overflow-wrap: break-word; font-size: 13px;">${branchLocation || "Company Premises"}</td>
              </tr>
              ${address ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 85px; font-weight: 600; vertical-align: top; font-size: 12px;">🏢 Address:</td>
                <td style="padding: 6px 0 6px 6px; color: #334155; font-weight: 500; word-break: break-word; overflow-wrap: break-word; font-size: 12px; line-height: 1.4;">${address}</td>
              </tr>
              ` : ""}
            </table>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin: 0 0 8px;">
              Event Overview & Agenda
            </h3>
            <div style="background-color: #f8fafc; border-left: 4px solid ${currentTheme.accent}; border-radius: 8px; padding: 14px 14px; font-size: 13px; line-height: 1.6; color: #334155; word-break: break-word; overflow-wrap: break-word;">
              ${formattedContent}
            </div>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #cbd5e1; text-align: right;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-style: italic;">
              With warm regards,
            </p>
            <p style="margin: 4px 0 0; font-size: 17px; font-weight: 900; color: #0f172a; letter-spacing: -0.2px; word-break: break-word;">
              ${signOff || "HR Team"}
            </p>
            <p style="margin: 2px 0 0; font-size: 12px; font-weight: 700; color: ${currentTheme.accent}; word-break: break-word;">
              ${companyName || "Zentelex HRMS"}
            </p>
          </div>
        </div>

        <div style="background-color: #0b0f19; padding: 14px 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); word-break: break-word;">
          Official HR company invitation dispatched to all active employees.<br />
          &copy; 2026 ${companyName || "Zentelex HRMS"} &bull; Human Resources Operations Desk
        </div>
      </div>
    `,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Nodemailer sendHREventAnnouncementEmail error:", err.message);
    throw err;
  }
};

module.exports = {
  sendOTPEmail,
  sendCredentialsEmail,
  sendInterviewScheduleEmail,
  sendHREventAnnouncementEmail,
};

