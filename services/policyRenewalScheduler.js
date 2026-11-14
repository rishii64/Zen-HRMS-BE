const { Op } = require("sequelize");
const { MediclaimPolicy, Employee, User, Notification } = require("../config/db");
const { sendRealtimeNotification } = require("../socket");
const { sendPolicyRenewalEmail } = require("../utils/mailer");

/**
 * checkAndTriggerPolicyRenewalReminders
 * Evaluates active mediclaim policies against policy_end_date.
 * Triggers automated dashboard notifications & formatted emails at 30, 15, and 7 days prior to expiry.
 *
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, evaluates and reports without modifying DB flags
 * @returns {Promise<Object>} Summary statistics of reminders dispatched
 */
const checkAndTriggerPolicyRenewalReminders = async ({ dryRun = false } = {}) => {
  try {
    console.log(`[Policy Renewal Scheduler] Running automated policy expiry check (dryRun: ${dryRun})...`);

    const policies = await MediclaimPolicy.findAll({
      where: {
        status: { [Op.in]: ["Active", "active"] },
        policy_end_date: { [Op.ne]: null },
      },
    });

    // Cache employees to resolve names and emails
    const employees = await Employee.findAll({
      attributes: ["employee_id", "first_name", "last_name", "email", "work_email", "dept", "designation"],
    });
    const employeeMap = {};
    employees.forEach((emp) => {
      employeeMap[emp.employee_id] = emp;
    });

    const stats = {
      totalActivePolicies: policies.length,
      evaluatedAt: new Date().toISOString(),
      reminders30dSent: 0,
      reminders15dSent: 0,
      reminders7dSent: 0,
      policiesExpired: 0,
      details: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const policy of policies) {
      if (!policy.policy_end_date) continue;

      const endDate = new Date(policy.policy_end_date);
      endDate.setHours(0, 0, 0, 0);

      const diffMs = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const emp = employeeMap[policy.employee_id];
      const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : policy.employee_id;
      const empEmail = emp?.email || emp?.work_email || null;

      let triggeredInterval = null;

      // 1. 30-Day Reminder: Between 16 and 30 days remaining
      if (daysRemaining <= 30 && daysRemaining > 15 && !policy.renewal_reminder_30d_sent) {
        triggeredInterval = 30;

        // Dashboard Notification -> Employee
        await sendRealtimeNotification({
          recipient_id: policy.employee_id,
          title: "30-Day Policy Renewal Notice",
          message: `Your corporate mediclaim policy (${policy.policy_number}) is due for renewal in ${daysRemaining} days (valid till ${policy.policy_end_date}).`,
          type: "insurance",
          category: "Insurance",
          priority: "normal",
          link: "/mediclaim",
          source_module: "policy_renewal",
          created_by: "System Policy Renewal Scheduler",
        });

        // Dashboard Notification -> HR Desk
        await sendRealtimeNotification({
          recipient_id: "HR",
          recipient_role: "hr",
          title: `Group Policy Renewal (30d): ${empName}`,
          message: `Corporate group mediclaim policy #${policy.policy_number} for ${empName} (${policy.employee_id}) expires in ${daysRemaining} days on ${policy.policy_end_date}.`,
          type: "insurance",
          category: "Insurance",
          priority: "normal",
          link: "/mediclaim",
          source_module: "policy_renewal",
          created_by: "System Policy Renewal Scheduler",
        });

        // Email Notification
        if (empEmail) {
          await sendPolicyRenewalEmail({
            to: empEmail,
            employeeName: empName,
            employeeId: policy.employee_id,
            policyNumber: policy.policy_number,
            tpaName: policy.tpa_name,
            insuranceCompany: policy.insurance_company,
            sumInsured: policy.sum_insured,
            policyEndDate: policy.policy_end_date,
            daysRemaining,
            reminderInterval: 30,
          });
        }

        if (!dryRun) {
          policy.renewal_reminder_30d_sent = true;
          policy.last_renewal_reminder_date = new Date();
          policy.renewal_notes = `${policy.renewal_notes ? policy.renewal_notes + "\n" : ""}[${new Date().toISOString()}] Automated 30-day renewal notice dispatched (${daysRemaining}d left).`;
          await policy.save();
        }

        stats.reminders30dSent++;
      }

      // 2. 15-Day Reminder: Between 8 and 15 days remaining
      else if (daysRemaining <= 15 && daysRemaining > 7 && !policy.renewal_reminder_15d_sent) {
        triggeredInterval = 15;

        // Dashboard Notification -> Employee (High priority)
        await sendRealtimeNotification({
          recipient_id: policy.employee_id,
          title: "Action Required: Mediclaim Renewal (15 Days)",
          message: `Corporate mediclaim policy (${policy.policy_number}) will expire in ${daysRemaining} days (${policy.policy_end_date}). Review dependent coverage in the portal.`,
          type: "insurance",
          category: "Insurance",
          priority: "high",
          link: "/mediclaim",
          source_module: "policy_renewal",
          created_by: "System Policy Renewal Scheduler",
        });

        // Dashboard Notification -> HR Desk
        await sendRealtimeNotification({
          recipient_id: "HR",
          recipient_role: "hr",
          title: `Action Required: Group Policy Renewal (15d): ${empName}`,
          message: `Corporate policy #${policy.policy_number} for ${empName} (${policy.employee_id}) expires in ${daysRemaining} days. Contact broker/TPA for renewal endorsements.`,
          type: "insurance",
          category: "Insurance",
          priority: "high",
          link: "/mediclaim",
          source_module: "policy_renewal",
          created_by: "System Policy Renewal Scheduler",
        });

        // Email Notification
        if (empEmail) {
          await sendPolicyRenewalEmail({
            to: empEmail,
            employeeName: empName,
            employeeId: policy.employee_id,
            policyNumber: policy.policy_number,
            tpaName: policy.tpa_name,
            insuranceCompany: policy.insurance_company,
            sumInsured: policy.sum_insured,
            policyEndDate: policy.policy_end_date,
            daysRemaining,
            reminderInterval: 15,
          });
        }

        if (!dryRun) {
          policy.renewal_reminder_15d_sent = true;
          policy.last_renewal_reminder_date = new Date();
          policy.renewal_notes = `${policy.renewal_notes ? policy.renewal_notes + "\n" : ""}[${new Date().toISOString()}] Automated 15-day renewal reminder dispatched (${daysRemaining}d left).`;
          await policy.save();
        }

        stats.reminders15dSent++;
      }

      // 3. 7-Day Urgent Reminder: Between 0 and 7 days remaining
      else if (daysRemaining <= 7 && daysRemaining >= 0 && !policy.renewal_reminder_7d_sent) {
        triggeredInterval = 7;

        // Dashboard Notification -> Employee (Urgent priority)
        await sendRealtimeNotification({
          recipient_id: policy.employee_id,
          title: "URGENT: Mediclaim Expiry in 7 Days",
          message: `CRITICAL ALERT: Your corporate mediclaim policy (${policy.policy_number}) expires in ${daysRemaining} days (${policy.policy_end_date}).`,
          type: "insurance",
          category: "Insurance",
          priority: "urgent",
          link: "/mediclaim",
          source_module: "policy_renewal",
          created_by: "System Policy Renewal Scheduler",
        });

        // Dashboard Notification -> HR Desk
        await sendRealtimeNotification({
          recipient_id: "HR",
          recipient_role: "hr",
          title: `CRITICAL: Group Policy Expiry (7d): ${empName}`,
          message: `URGENT: Corporate policy #${policy.policy_number} for ${empName} (${policy.employee_id}) expires in ${daysRemaining} days on ${policy.policy_end_date}!`,
          type: "insurance",
          category: "Insurance",
          priority: "urgent",
          link: "/mediclaim",
          source_module: "policy_renewal",
          created_by: "System Policy Renewal Scheduler",
        });

        // Email Notification
        if (empEmail) {
          await sendPolicyRenewalEmail({
            to: empEmail,
            employeeName: empName,
            employeeId: policy.employee_id,
            policyNumber: policy.policy_number,
            tpaName: policy.tpa_name,
            insuranceCompany: policy.insurance_company,
            sumInsured: policy.sum_insured,
            policyEndDate: policy.policy_end_date,
            daysRemaining,
            reminderInterval: 7,
          });
        }

        if (!dryRun) {
          policy.renewal_reminder_7d_sent = true;
          policy.last_renewal_reminder_date = new Date();
          policy.renewal_notes = `${policy.renewal_notes ? policy.renewal_notes + "\n" : ""}[${new Date().toISOString()}] Automated 7-day critical expiry alert dispatched (${daysRemaining}d left).`;
          await policy.save();
        }

        stats.reminders7dSent++;
      }

      // 4. Mark Expired if past policy_end_date
      else if (daysRemaining < 0 && policy.status !== "Expired") {
        if (!dryRun) {
          policy.status = "Expired";
          policy.renewal_notes = `${policy.renewal_notes ? policy.renewal_notes + "\n" : ""}[${new Date().toISOString()}] Policy marked Expired automatically (${Math.abs(daysRemaining)} days overdue).`;
          await policy.save();
        }
        stats.policiesExpired++;
      }

      stats.details.push({
        policyId: policy.id,
        policyNumber: policy.policy_number,
        employeeId: policy.employee_id,
        employeeName: empName,
        policyEndDate: policy.policy_end_date,
        daysRemaining,
        triggeredInterval,
        remindersSent: {
          "30d": policy.renewal_reminder_30d_sent,
          "15d": policy.renewal_reminder_15d_sent,
          "7d": policy.renewal_reminder_7d_sent,
        },
        status: policy.status,
      });
    }

    console.log(
      `[Policy Renewal Scheduler] Check completed: 30d alerts=${stats.reminders30dSent}, 15d alerts=${stats.reminders15dSent}, 7d alerts=${stats.reminders7dSent}, expired=${stats.policiesExpired}`
    );

    return stats;
  } catch (err) {
    console.error("[Policy Renewal Scheduler] Execution error:", err);
    throw err;
  }
};

/**
 * initPolicyRenewalScheduler
 * Starts the recurring daily check service.
 */
let schedulerIntervalId = null;

const initPolicyRenewalScheduler = () => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
  }

  // Run initial check 10 seconds after server boot to allow full DB and socket init
  setTimeout(() => {
    checkAndTriggerPolicyRenewalReminders().catch((err) => {
      console.error("[Policy Renewal Scheduler] Initial boot check failed:", err.message);
    });
  }, 10000);

  // Recurring check every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  schedulerIntervalId = setInterval(() => {
    checkAndTriggerPolicyRenewalReminders().catch((err) => {
      console.error("[Policy Renewal Scheduler] Daily scheduled check failed:", err.message);
    });
  }, TWENTY_FOUR_HOURS);

  console.log("[Policy Renewal Scheduler] Service initialized (24h recurring interval).");
};

module.exports = {
  checkAndTriggerPolicyRenewalReminders,
  initPolicyRenewalScheduler,
};
