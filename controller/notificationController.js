const { Notification, sequelize } = require("../config/db");
const { Op } = require("sequelize");
const { sendRealtimeNotification } = require("../socket");

const NotificationController = {
  // GET /api/auth/notifications
  async getNotifications(req, res) {
    try {
      const user = req.user || {};
      const userEmpId = String(user.employee_id || user.employee_code || user.id || "").trim();
      const userRole = String(user.role || "").toLowerCase().trim();
      const userDept = String(user.dept || user.department || "").toLowerCase().trim();

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

      // Fetch genuine persisted database notifications matching user, role, department or broadcast
      const whereConditions = [
        { recipient_id: "ALL" },
        { recipient_id: "" },
        { recipient_role: "all" },
      ];

      if (userEmpId) {
        whereConditions.push({ recipient_id: userEmpId });
        whereConditions.push({ recipient_id: userEmpId.toUpperCase() });
        whereConditions.push({ recipient_id: userEmpId.toLowerCase() });
      }

      if (userRole) {
        whereConditions.push({ recipient_role: userRole });
        if (["admin", "superadmin", "hrmanager", "hr_manager", "hr_executive"].includes(userRole)) {
          whereConditions.push({ recipient_role: "hr" });
        }
        if (["admin", "superadmin"].includes(userRole)) {
          whereConditions.push({ recipient_role: "hod" });
          whereConditions.push({ recipient_role: "manager" });
          whereConditions.push({ recipient_role: "finance" });
        }
      }

      if (isLeadership) {
        whereConditions.push({ recipient_role: "leadership" });
      }

      let dbNotifs = [];
      try {
        dbNotifs = await Notification.findAll({
          where: { [Op.or]: whereConditions },
          order: [["created_at", "DESC"]],
          limit: 60,
        });
      } catch (dbErr) {
        console.warn("Could not query notifications table:", dbErr.message);
      }

      // Format notifications and determine read state (individual vs broadcast)
      const formattedNotifs = dbNotifs.map((n) => {
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
          source_module: plain.source_module || "system",
          created_by: plain.created_by,
        };
      });

      const unreadCount = formattedNotifs.filter((n) => !n.is_read).length;

      return res.json({
        success: true,
        count: formattedNotifs.length,
        unreadCount,
        data: formattedNotifs,
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

      const notif = await Notification.findByPk(id);
      if (!notif) {
        return res.json({ success: true, message: "Marked as read" });
      }

      const isBroadcast =
        notif.recipient_id === "ALL" ||
        notif.recipient_role === "all" ||
        notif.recipient_role;

      if (isBroadcast && userEmpId) {
        const readSet = new Set(
          (notif.read_by || "").split(",").map((s) => s.trim()).filter(Boolean)
        );
        readSet.add(userEmpId.toLowerCase());
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
          {
            where: {
              [Op.or]: [
                { recipient_id: userEmpId },
                { recipient_id: userEmpId.toLowerCase() },
                { recipient_id: userEmpId.toUpperCase() },
              ],
            },
          }
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
          const readSet = new Set(
            (b.read_by || "").split(",").map((s) => s.trim()).filter(Boolean)
          );
          readSet.add(userEmpId.toLowerCase());
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
          where: {
            [Op.or]: [
              { recipient_id: userEmpId },
              { recipient_id: userEmpId.toLowerCase() },
              { recipient_id: userEmpId.toUpperCase() },
            ],
          },
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

      const created = await sendRealtimeNotification({
        title: title.trim(),
        message: message.trim(),
        category,
        type,
        link,
        priority,
        recipient_id,
        recipient_role,
        source_module: "announcements",
        created_by: creator,
      });

      return res.status(201).json({
        success: true,
        message: "Notification broadcasted successfully via sockets",
        data: created,
      });
    } catch (err) {
      console.error("Broadcast notification error:", err.message);
      return res.status(500).json({ error: "Failed to broadcast notification" });
    }
  },
};

module.exports = NotificationController;
