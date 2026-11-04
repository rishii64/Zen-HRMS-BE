const {
  Notification,
  Leave,
  RecruitmentRequisition,
  ExpenseClaim,
  HrEvent,
  Holiday,
  Employee,
  Transfer,
  Promotion,
  OvertimeTicket,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");

const NotificationController = {
  // GET /api/auth/notifications
  async getNotifications(req, res) {
    try {
      const user = req.user || {};
      const userEmpId = String(user.employee_id || user.employee_code || user.id || "").trim();
      const userRole = String(user.role || "").toLowerCase().trim();
      const isLeadership = [
        "hr",
        "admin",
        "hod",
        "manager",
        "management",
        "ceo",
        "coo",
        "cto",
        "cfo",
        "vp",
        "hrmanager",
      ].includes(userRole);

      // 1. Fetch persisted database notifications
      const whereConditions = [
        { recipient_id: "ALL" },
        { recipient_id: "" },
      ];
      if (userEmpId) {
        whereConditions.push({ recipient_id: userEmpId });
      }
      if (userRole) {
        whereConditions.push({ recipient_role: "all" });
        whereConditions.push({ recipient_role: userRole });
      }

      let dbNotifs = [];
      try {
        dbNotifs = await Notification.findAll({
          where: { [Op.or]: whereConditions },
          order: [["created_at", "DESC"]],
          limit: 40,
        });
      } catch (dbErr) {
        console.warn("Could not query notifications table:", dbErr.message);
      }

      // Format DB notifications and check individual read state for broadcast alerts
      const formattedDbNotifs = dbNotifs.map((n) => {
        const plain = n.toJSON ? n.toJSON() : { ...n };
        const readByArray = (plain.read_by || "").split(",").map((s) => s.trim().toLowerCase());
        const isReadByUser =
          plain.is_read ||
          (userEmpId && readByArray.includes(userEmpId.toLowerCase()));

        return {
          id: plain.id,
          title: plain.title,
          message: plain.message,
          type: plain.type || "info",
          category: plain.category || "General",
          link: plain.link || null,
          priority: plain.priority || "normal",
          is_read: Boolean(isReadByUser),
          created_at: plain.created_at || plain.createdAt || new Date(),
          source: "database",
        };
      });

      // 2. Real-Time Dynamic Alerts Synthesis
      const dynamicAlerts = [];

      // A. Approvals: Pending Requisitions (for HR / Leadership)
      if (isLeadership) {
        try {
          const pendingReqsCount = await RecruitmentRequisition.count({
            where: {
              status: {
                [Op.in]: [
                  "PENDING_CHRO_APPROVAL",
                  "PENDING_CEO_COO_APPROVAL",
                  "SOURCING_CANDIDATES",
                ],
              },
            },
          });
          if (pendingReqsCount > 0) {
            dynamicAlerts.push({
              id: "dyn-req-pending",
              title: "Job Requisition Authorizations",
              message: `${pendingReqsCount} workforce candidate requisition(s) currently awaiting approval or active`,
              type: "approval",
              category: "Approvals",
              link: "/requisition",
              priority: "high",
              is_read: false,
              created_at: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
              source: "live_requisition",
            });
          }
        } catch (_) {}

        // B. Approvals: Pending Expense / Reimbursement Claims
        try {
          const pendingClaimsCount = await ExpenseClaim.count({
            where: {
              status: {
                [Op.in]: ["Submitted", "Pending Approval", "Manager Approved"],
              },
            },
          });
          if (pendingClaimsCount > 0) {
            dynamicAlerts.push({
              id: "dyn-claims-pending",
              title: "Expense Claims Awaiting Review",
              message: `${pendingClaimsCount} travel & expense reimbursement claim(s) submitted for approval`,
              type: "claim",
              category: "Approvals",
              link: "/claims",
              priority: "normal",
              is_read: false,
              created_at: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
              source: "live_claims",
            });
          }
        } catch (_) {}

        // D. Transfers & Deputations Pending Review
        try {
          const pendingTransfersCount = await Transfer.count({
            where: { status: "Pending" },
          });
          if (pendingTransfersCount > 0) {
            dynamicAlerts.push({
              id: "dyn-transfers-pending",
              title: "Transfers & Deputations Pending Review",
              message: `${pendingTransfersCount} employee transfer or deputation workflow order(s) awaiting review & authorization`,
              type: "transfer",
              category: "Approvals",
              link: "/transfers",
              priority: "high",
              is_read: false,
              created_at: new Date(Date.now() - 30 * 60 * 1000),
              source: "live_transfers",
            });
          }
        } catch (_) {}

        // E. Promotions & Grade Progression Proposals Pending Review
        try {
          const pendingPromotionsCount = await Promotion.count({
            where: { status: "Pending" },
          });
          if (pendingPromotionsCount > 0) {
            dynamicAlerts.push({
              id: "dyn-promotions-pending",
              title: "Promotions & Progressions Awaiting Review",
              message: `${pendingPromotionsCount} employee promotion & grade progression proposal(s) awaiting authorization`,
              type: "promotion",
              category: "Approvals",
              link: "/promotions",
              priority: "high",
              is_read: false,
              created_at: new Date(Date.now() - 25 * 60 * 1000),
              source: "live_promotions",
            });
          }
        } catch (_) {}

        // C. Leaves: Pending Employee Leave Requests
        try {
          const pendingLeavesCount = await Leave.count({
            where: {
              status: { [Op.iLike]: "Pending" },
            },
          });
          if (pendingLeavesCount > 0) {
            dynamicAlerts.push({
              id: "dyn-leaves-pending",
              title: "Leave Requests Pending Review",
              message: `${pendingLeavesCount} employee leave application(s) awaiting manager or HR action`,
              type: "leave",
              category: "Leaves",
              link: "/hr/leaves",
              priority: "high",
              is_read: false,
              created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
              source: "live_leaves",
            });
          }
        } catch (_) {}
      }

      // D. Leaves: Current Employee's Own Recent Leave Updates
      if (userEmpId) {
        try {
          const myRecentLeaves = await Leave.findAll({
            where: {
              employee_id: { [Op.iLike]: userEmpId },
              status: { [Op.in]: ["Approved", "Rejected", "Pending"] },
            },
            order: [["id", "DESC"]],
            limit: 2,
            raw: true,
          });

          myRecentLeaves.forEach((l) => {
            const isApproved = (l.status || "").toLowerCase() === "approved";
            const isRejected = (l.status || "").toLowerCase() === "rejected";
            if (isApproved || isRejected) {
              dynamicAlerts.push({
                id: `dyn-my-leave-${l.id}`,
                title: `Leave Request ${l.status}`,
                message: `Your ${l.leave_type || "Leave"} application (${l.start_date || ""} to ${l.end_date || ""}) was ${l.status.toLowerCase()}`,
                type: "leave",
                category: "Leaves",
                link: "/leave",
                priority: isApproved ? "normal" : "high",
                is_read: false,
                created_at: l.updated_at || l.created_at || new Date(),
                source: "my_leaves",
              });
            }
          });
        } catch (_) {}

        // Promotion Updates for Current Employee
        try {
          const myPromotions = await Promotion.findAll({
            where: {
              employee_id: { [Op.iLike]: userEmpId },
              status: { [Op.in]: ["Approved", "Effective"] },
            },
            order: [["id", "DESC"]],
            limit: 1,
            raw: true,
          });

          myPromotions.forEach((p) => {
            dynamicAlerts.push({
              id: `dyn-my-promo-${p.id}`,
              title: "Promotion & Progression Authorized! 🎉",
              message: `Congratulations! Your promotion to ${p.target_designation} (${p.target_grade_code}) has been ${p.status.toLowerCase()}.`,
              type: "promotion",
              category: "Growth",
              link: "/promotions",
              priority: "high",
              is_read: false,
              created_at: p.updatedAt || p.createdAt || new Date(),
              source: "my_promotions",
            });
          });
        } catch (_) {}
      }

      // E. Announcements: Upcoming HR Events & Townhalls
      try {
        const upcomingEvents = await HrEvent.findAll({
          order: [["event_date", "ASC"]],
          limit: 2,
          raw: true,
        });
        upcomingEvents.forEach((ev) => {
          dynamicAlerts.push({
            id: `dyn-event-${ev.id}`,
            title: `HR Event: ${ev.title}`,
            message: `${ev.event_type || "Corporate Event"} scheduled on ${ev.event_date || "Upcoming"} at ${ev.location || "Headquarters"}`,
            type: "announcement",
            category: "Announcements",
            link: "/hr-events",
            priority: "normal",
            is_read: false,
            created_at: ev.created_at || new Date(Date.now() - 2 * 3600 * 1000),
            source: "live_events",
          });
        });
      } catch (_) {}

      // F. Announcements: Upcoming Holidays or Assigned Working Days
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const upcomingHolidays = await Holiday.findAll({
          where: {
            date: { [Op.gte]: todayStr },
          },
          order: [["date", "ASC"]],
          limit: 2,
          raw: true,
        });

        upcomingHolidays.forEach((h) => {
          const isWorkingDay = Boolean(h.is_working_day || h.type === "Working Day");
          dynamicAlerts.push({
            id: `dyn-hol-${h.id}`,
            title: isWorkingDay ? `Assigned Working Day: ${h.name}` : `Upcoming Holiday: ${h.name}`,
            message: isWorkingDay
              ? `${h.name} on ${h.date} is an assigned working day (Company Open)`
              : `Company branches closed for ${h.name} on ${h.date}`,
            type: "announcement",
            category: "Announcements",
            link: "/holidays",
            priority: isWorkingDay ? "high" : "normal",
            is_read: false,
            created_at: h.created_at || new Date(Date.now() - 4 * 3600 * 1000),
            source: "live_holidays",
          });
        });
      } catch (_) {}

      // 3. Merge, Deduplicate and Sort
      const combined = [...dynamicAlerts, ...formattedDbNotifs];
      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const unreadCount = combined.filter((n) => !n.is_read).length;

      return res.json({
        success: true,
        count: combined.length,
        unreadCount,
        data: combined,
      });
    } catch (err) {
      console.error("Get notifications error:", err.message);
      return res.status(500).json({ error: "Failed to load notifications" });
    }
  },

  // PUT /api/auth/notifications/:id/read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const user = req.user || {};
      const userEmpId = String(user.employee_id || user.employee_code || user.id || "").trim();

      // If dynamic alert (prefixed with dyn-), we acknowledge success
      if (String(id).startsWith("dyn-")) {
        return res.json({ success: true, message: "Marked as read" });
      }

      const notif = await Notification.findByPk(id);
      if (!notif) {
        return res.json({ success: true, message: "Marked as read" });
      }

      if (notif.recipient_id === "ALL" || notif.recipient_role) {
        const readSet = new Set((notif.read_by || "").split(",").map((s) => s.trim()).filter(Boolean));
        if (userEmpId) readSet.add(userEmpId);
        await notif.update({ read_by: Array.from(readSet).join(",") });
      } else {
        await notif.update({ is_read: true });
      }

      return res.json({ success: true, message: "Notification marked as read" });
    } catch (err) {
      console.error("Mark notification as read error:", err.message);
      return res.status(500).json({ error: "Failed to mark notification as read" });
    }
  },

  // PUT /api/auth/notifications/read-all
  async markAllAsRead(req, res) {
    try {
      const user = req.user || {};
      const userEmpId = String(user.employee_id || user.employee_code || user.id || "").trim();
      const userRole = String(user.role || "").toLowerCase().trim();

      // 1. Direct recipient notifications
      if (userEmpId) {
        await Notification.update(
          { is_read: true },
          { where: { recipient_id: userEmpId } }
        );
      }

      // 2. Broadcast notifications -> append userEmpId to read_by
      if (userEmpId) {
        const broadcasts = await Notification.findAll({
          where: {
            [Op.or]: [
              { recipient_id: "ALL" },
              { recipient_role: "all" },
              { recipient_role: userRole },
            ],
          },
        });

        for (const b of broadcasts) {
          const readSet = new Set((b.read_by || "").split(",").map((s) => s.trim()).filter(Boolean));
          readSet.add(userEmpId);
          await b.update({ read_by: Array.from(readSet).join(",") });
        }
      }

      return res.json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
      console.error("Mark all notifications as read error:", err.message);
      return res.status(500).json({ error: "Failed to mark all as read" });
    }
  },

  // DELETE /api/auth/notifications/:id
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      if (String(id).startsWith("dyn-")) {
        return res.json({ success: true, message: "Notification dismissed" });
      }

      const notif = await Notification.findByPk(id);
      if (notif) {
        await notif.destroy();
      }

      return res.json({ success: true, message: "Notification removed" });
    } catch (err) {
      console.error("Delete notification error:", err.message);
      return res.status(500).json({ error: "Failed to delete notification" });
    }
  },

  // DELETE /api/auth/notifications/clear-all
  async clearAll(req, res) {
    try {
      const user = req.user || {};
      const userEmpId = String(user.employee_id || user.employee_code || user.id || "").trim();

      if (userEmpId) {
        await Notification.destroy({
          where: { recipient_id: userEmpId },
        });
      }

      return res.json({ success: true, message: "Notifications cleared" });
    } catch (err) {
      console.error("Clear notifications error:", err.message);
      return res.status(500).json({ error: "Failed to clear notifications" });
    }
  },

  // POST /api/auth/notifications/broadcast
  async broadcastNotification(req, res) {
    try {
      const {
        title,
        message,
        category = "Announcements",
        type = "announcement",
        link = null,
        priority = "normal",
        recipient_id = "ALL",
        recipient_role = "all",
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }

      const creator = req.user?.name || req.user?.employee_id || "HR Admin";

      const created = await Notification.create({
        title: title.trim(),
        message: message.trim(),
        category,
        type,
        link,
        priority,
        recipient_id,
        recipient_role,
        is_read: false,
        created_by: creator,
      });

      return res.status(201).json({
        success: true,
        message: "Notification broadcasted successfully",
        data: created,
      });
    } catch (err) {
      console.error("Broadcast notification error:", err.message);
      return res.status(500).json({ error: "Failed to broadcast notification" });
    }
  },
};

module.exports = NotificationController;

