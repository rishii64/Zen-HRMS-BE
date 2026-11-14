const { Op } = require("sequelize");
const { InfoSecCampaign, InfoSecAcknowledgment, Employee } = require("../config/db");
const { sendRealtimeNotification } = require("../socket");
const { sendInfoSecCampaignEmail } = require("../utils/mailer");

/**
 * checkAndTriggerInfoSecReminders
 * Daily background routine that scans active campaigns, flags overdue acknowledgments,
 * and sends automated alerts at 7, 3, and 1 day prior to campaign deadline.
 */
const checkAndTriggerInfoSecReminders = async () => {
  try {
    console.log("[InfoSec Scheduler] Scanning active awareness campaigns and compliance deadlines...");

    const activeCampaigns = await InfoSecCampaign.findAll({
      where: { status: "Active" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const camp of activeCampaigns) {
      if (!camp.end_date) continue;

      const endDate = new Date(camp.end_date);
      endDate.setHours(0, 0, 0, 0);
      const diffMs = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // 1. Check for overdue transitions
      if (daysRemaining < 0) {
        const [overdueCount] = await InfoSecAcknowledgment.update(
          { status: "Overdue" },
          {
            where: {
              campaign_id: camp.id,
              status: { [Op.in]: ["Pending", "In Progress"] },
            },
          }
        );
        if (overdueCount > 0) {
          console.log(`[InfoSec Scheduler] Marked ${overdueCount} acknowledgments as Overdue for campaign "${camp.title}".`);
        }
        continue;
      }

      // 2. Automated scheduled reminder checkpoints: 7 days, 3 days, 1 day prior
      if ([7, 3, 1].includes(daysRemaining)) {
        console.log(`[InfoSec Scheduler] Triggering ${daysRemaining}-day compliance alerts for "${camp.title}"...`);

        const pendingAcks = await InfoSecAcknowledgment.findAll({
          where: {
            campaign_id: camp.id,
            status: { [Op.in]: ["Pending", "In Progress", "Overdue"] },
          },
        });

        for (const ack of pendingAcks) {
          // Dashboard Notification
          await sendRealtimeNotification({
            recipient_id: ack.employee_id,
            title: `InfoSec Acknowledgment Due in ${daysRemaining} Day(s)`,
            message: `Mandatory cybersecurity training & acknowledgment for "${camp.title}" must be completed before ${camp.end_date}.`,
            type: "announcement",
            category: "Announcements",
            priority: daysRemaining === 1 ? "urgent" : "high",
            link: "/infosec",
            source_module: "infosec_awareness",
            created_by: "System InfoSec Monitor",
          });

          // Email Notification
          if (ack.employee_email) {
            sendInfoSecCampaignEmail({
              to: ack.employee_email,
              employeeName: ack.employee_name,
              employeeId: ack.employee_id,
              campaignTitle: camp.title,
              campaignCategory: camp.category,
              deadline: camp.end_date,
              daysRemaining,
              isReminder: true,
            }).catch((e) => console.warn(`Email alert error for ${ack.employee_email}:`, e.message));
          }
        }
      }
    }
  } catch (err) {
    console.error("[InfoSec Scheduler] Execution error:", err.message);
  }
};

let schedulerIntervalId = null;

const initInfoSecScheduler = () => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
  }

  // Initial check 15 seconds after server boot
  setTimeout(() => {
    checkAndTriggerInfoSecReminders().catch((err) => {
      console.error("[InfoSec Scheduler] Boot check error:", err.message);
    });
  }, 15000);

  // Daily 24-hour interval
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  schedulerIntervalId = setInterval(() => {
    checkAndTriggerInfoSecReminders().catch((err) => {
      console.error("[InfoSec Scheduler] Recurring check error:", err.message);
    });
  }, TWENTY_FOUR_HOURS);

  console.log("[InfoSec Scheduler] Service initialized (24h recurring compliance monitor).");
};

module.exports = {
  checkAndTriggerInfoSecReminders,
  initInfoSecScheduler,
};
