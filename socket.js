const { Server } = require("socket.io");
const { Notification } = require("./config/db");

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    // Client authentication and room registration
    socket.on("authenticate", (userData) => {
      try {
        if (!userData) return;
        const empId = String(
          userData.employee_id ||
          userData.employee_code ||
          userData.employeeCode ||
          userData.id ||
          ""
        ).trim();
        const role = String(userData.role || "").toLowerCase().trim();
        const dept = String(userData.dept || userData.department || "").trim();

        socket.userData = { empId, role, dept };

        // 1. Join global broadcast channel
        socket.join("broadcast");
        socket.join("all");

        // 2. Join personal employee channel
        if (empId) {
          socket.join(`user:${empId}`);
          socket.join(`user:${empId.toLowerCase()}`);
          socket.join(`user:${empId.toUpperCase()}`);
        }

        // 3. Join role channel
        if (role) {
          socket.join(`role:${role}`);
          if (["admin", "hrmanager", "hr_executive", "hr_manager", "superadmin"].includes(role)) {
            socket.join("role:hr");
          }
          if (["admin", "superadmin"].includes(role)) {
            socket.join("role:hod");
            socket.join("role:manager");
            socket.join("role:finance");
          }
          if (
            [
              "hod",
              "manager",
              "teamlead",
              "hr",
              "hrmanager",
              "admin",
              "superadmin",
              "management",
              "ceo",
              "coo",
              "cto",
              "cfo",
              "vp",
              "secretary",
            ].includes(role)
          ) {
            socket.join("role:leadership");
          }
        }

        // 4. Join department channel
        if (dept) {
          socket.join(`dept:${dept.toLowerCase()}`);
        }

        socket.emit("authenticated", {
          status: "connected",
          empId,
          role,
          dept,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Socket authentication error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      // Disconnection handled gracefully
    });
  });

  return io;
};

const getIO = () => io;

/**
 * sendRealtimeNotification
 * Stores notification in the database and dispatches via Socket.IO in real-time
 */
const sendRealtimeNotification = async ({
  recipient_id = "ALL",
  recipient_role = null,
  department = null,
  title,
  message,
  type = "info", // "approval", "leave", "announcement", "onboarding", "resignation", "claim", "event", "info"
  category = "General", // "Approvals", "Leaves", "Announcements", "Onboarding", "Resignation", "Events", "General"
  link = null,
  priority = "normal", // "low", "normal", "high", "urgent"
  source_module = "system",
  created_by = "System",
}) => {
  try {
    if (!title || !message) return null;

    const notifRecord = await Notification.create({
      recipient_id: String(recipient_id || "ALL").trim(),
      recipient_role: recipient_role ? String(recipient_role).toLowerCase().trim() : null,
      title: String(title).trim(),
      message: String(message).trim(),
      type: String(type || "info").trim(),
      category: String(category || "General").trim(),
      link: link || null,
      priority: String(priority || "normal").trim(),
      is_read: false,
      read_by: "",
      source_module: source_module || "system",
      created_by: created_by || "System",
    });

    const plain = notifRecord.toJSON ? notifRecord.toJSON() : { ...notifRecord };
    const payload = {
      id: plain.id,
      title: plain.title,
      message: plain.message,
      type: plain.type,
      category: plain.category,
      link: plain.link,
      priority: plain.priority,
      is_read: false,
      created_at: plain.created_at || plain.createdAt || new Date(),
      source_module: plain.source_module,
      created_by: plain.created_by,
      recipient_id: plain.recipient_id,
      recipient_role: plain.recipient_role,
    };

    if (io) {
      const isBroadcast =
        !recipient_id ||
        recipient_id === "ALL" ||
        recipient_role === "all";

      if (isBroadcast) {
        io.to("broadcast").emit("notification", payload);
      } else {
        let sent = false;

        // Specific employee
        if (recipient_id && recipient_id !== "ALL") {
          io.to(`user:${recipient_id}`).emit("notification", payload);
          io.to(`user:${recipient_id.toLowerCase()}`).emit("notification", payload);
          io.to(`user:${recipient_id.toUpperCase()}`).emit("notification", payload);
          sent = true;
        }

        // Specific role
        if (recipient_role && recipient_role !== "all") {
          io.to(`role:${recipient_role.toLowerCase()}`).emit("notification", payload);
          sent = true;
        }

        // Department
        if (department) {
          io.to(`dept:${department.toLowerCase()}`).emit("notification", payload);
          sent = true;
        }

        // Fallback: emit globally if no specific room matched
        if (!sent) {
          io.emit("notification", payload);
        }
      }
    }

    return payload;
  } catch (err) {
    console.error("sendRealtimeNotification error:", err.message);
    return null;
  }
};

module.exports = {
  initSocket,
  getIO,
  sendRealtimeNotification,
};
