const { AdminTask } = require("../config/db");
const { Op } = require("sequelize");

const INITIAL_DEFAULT_TASKS = [
  {
    title: "Air Conditioning Servicing - 3rd Floor East Wing",
    category: "Facilities & Maintenance",
    description: "Scheduled servicing and cooling gas refill for floor AC units before summer peak.",
    requester_name: "Floor Admin",
    requester_id: "ADMIN-01",
    dept: "Operations",
    priority: "High",
    status: "In Progress",
    due_date: "2026-10-18",
    assigned_to: "CoolAir Services Vendor",
    notes: "Vendor technician visiting on Thursday at 2:00 PM.",
  },
  {
    title: "Quarterly Stationery & Printer Paper Restock",
    category: "Stationery & Supplies",
    description: "Procure A4 reams, blue/black ball pens, marker sets, and filing folders for all departments.",
    requester_name: "Priyanka Mukherjee",
    requester_id: "HR-PM-02",
    dept: "HR",
    priority: "Medium",
    status: "Pending",
    due_date: "2026-10-20",
    assigned_to: "Admin Team",
    notes: "Purchase order submitted to OfficePlus Stationery.",
  },
  {
    title: "Dispatch Signed Vendor Contracts via Bluedart Express",
    category: "Logistics & Dispatch",
    description: "Urgent physical dispatch of signed tripartite agreement to Kolkata Corporate HQ.",
    requester_name: "Legal Officer",
    requester_id: "LEG-01",
    dept: "Legal Cell",
    priority: "Urgent",
    status: "Pending",
    due_date: "2026-10-14",
    assigned_to: "Admin Team",
    notes: "Tracking AWB to be shared with sender once booked.",
  },
  {
    title: "Pantry & Coffee Machine Descaling / Bean Refill",
    category: "Pantry & Catering",
    description: "Deep cleaning of 2nd & 4th floor automated coffee machines and restocking beans & green tea.",
    requester_name: "Admin Office",
    requester_id: "ADM-02",
    dept: "Administration",
    priority: "Medium",
    status: "Completed",
    due_date: "2026-10-10",
    assigned_to: "Café Bliss Supplies",
    notes: "Completed by maintenance team on Oct 10 morning.",
  },
  {
    title: "Client Delegation Welcome Badges & Parking Reservations",
    category: "Events & Celebrations",
    description: "Prepare 5 visitor security passes, reserved visitor parking slots 12-14, and executive meeting room setup.",
    requester_name: "Executive Secretary",
    requester_id: "MGT-SEC-01",
    dept: "Management",
    priority: "High",
    status: "In Progress",
    due_date: "2026-10-16",
    assigned_to: "Security & Admin Desk",
    notes: "Boardroom reserved from 10:00 AM to 3:00 PM.",
  },
  {
    title: "Physical Employee ID Card Batch Printing (October Joiners)",
    category: "ID & Access Passes",
    description: "Print NFC proximity cards and lanyards for 8 newly joined staff members across departments.",
    requester_name: "HR Operations",
    requester_id: "HR-PM-02",
    dept: "HR",
    priority: "Medium",
    status: "Pending",
    due_date: "2026-10-22",
    assigned_to: "Admin Print Desk",
    notes: "Photos and employee codes synced from HR portal.",
  },
];

let memoryTasks = INITIAL_DEFAULT_TASKS.map((t, idx) => ({ id: idx + 1, ...t, created_at: new Date() }));
let nextMemoryId = memoryTasks.length + 1;

const AdminTaskController = {
  // GET /api/auth/admin/tasks
  async getTasks(req, res) {
    try {
      const { status, category, priority, search } = req.query;

      if (!AdminTask) {
        let filtered = [...memoryTasks];
        if (status && status !== "All") filtered = filtered.filter(t => t.status === status);
        if (category && category !== "All") filtered = filtered.filter(t => t.category === category);
        if (priority && priority !== "All") filtered = filtered.filter(t => t.priority === priority);
        if (search && search.trim() !== "") {
          const s = search.trim().toLowerCase();
          filtered = filtered.filter(t =>
            (t.title && t.title.toLowerCase().includes(s)) ||
            (t.description && t.description.toLowerCase().includes(s)) ||
            (t.requester_name && t.requester_name.toLowerCase().includes(s)) ||
            (t.dept && t.dept.toLowerCase().includes(s))
          );
        }
        return res.status(200).json({ success: true, data: filtered });
      }

      // Seed sample tasks if table is empty
      const count = await AdminTask.count();
      if (count === 0) {
        await AdminTask.bulkCreate(INITIAL_DEFAULT_TASKS);
      }

      let whereClause = {};

      if (status && status !== "All") {
        whereClause.status = status;
      }
      if (category && category !== "All") {
        whereClause.category = category;
      }
      if (priority && priority !== "All") {
        whereClause.priority = priority;
      }
      if (search && search.trim() !== "") {
        const term = `%${search.trim().toLowerCase()}%`;
        whereClause[Op.or] = [
          { title: { [Op.iLike]: term } },
          { description: { [Op.iLike]: term } },
          { requester_name: { [Op.iLike]: term } },
          { dept: { [Op.iLike]: term } },
          { assigned_to: { [Op.iLike]: term } },
        ];
      }

      const tasks = await AdminTask.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
      });

      return res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (err) {
      console.error("Error fetching admin tasks, returning fallback:", err);
      return res.status(200).json({ success: true, data: memoryTasks });
    }
  },

  // POST /api/auth/admin/tasks
  async createTask(req, res) {
    try {
      const {
        title,
        category,
        description,
        requester_name,
        requester_id,
        dept,
        priority,
        status,
        due_date,
        assigned_to,
        notes,
      } = req.body;

      // Enforce role check: Only HR and Management can assign tasks to Admin
      const callerRole = (req.user?.role || req.headers.role || "").toLowerCase().trim();
      const allowedCreators = ["hr", "hrmanager", "management", "ceo", "coo", "cto", "cfo", "vp", "secretary"];
      if (callerRole && !allowedCreators.includes(callerRole)) {
        return res.status(403).json({ error: "Access Denied: Only HR and Management can assign tasks to Admin" });
      }

      if (!title || title.trim() === "") {
        return res.status(400).json({ error: "Task title is required" });
      }

      if (!AdminTask) {
        const item = {
          id: nextMemoryId++,
          title: title.trim(),
          category: category || "Facilities & Maintenance",
          description: description ? description.trim() : null,
          requester_name: requester_name ? requester_name.trim() : (req.user?.name || "Admin Staff"),
          requester_id: requester_id ? requester_id.trim() : (req.user?.employee_id || "ADMIN"),
          dept: dept ? dept.trim() : "General",
          priority: priority || "Medium",
          status: status || "Pending",
          due_date: due_date || null,
          assigned_to: assigned_to ? assigned_to.trim() : "Admin Team",
          notes: notes ? notes.trim() : null,
          created_at: new Date(),
        };
        memoryTasks.unshift(item);
        return res.status(201).json({ success: true, message: "Task created successfully", data: item });
      }

      const newTask = await AdminTask.create({
        title: title.trim(),
        category: category || "Facilities & Maintenance",
        description: description ? description.trim() : null,
        requester_name: requester_name ? requester_name.trim() : (req.user?.name || "Admin Staff"),
        requester_id: requester_id ? requester_id.trim() : (req.user?.employee_id || "ADMIN"),
        dept: dept ? dept.trim() : "General",
        priority: priority || "Medium",
        status: status || "Pending",
        due_date: due_date || null,
        assigned_to: assigned_to ? assigned_to.trim() : "Admin Team",
        notes: notes ? notes.trim() : null,
        completed_at: status === "Completed" ? new Date() : null,
      });

      return res.status(201).json({
        success: true,
        message: "Unofficial admin task created successfully",
        data: newTask,
      });
    } catch (err) {
      console.error("Error creating admin task:", err);
      return res.status(500).json({ error: "Failed to create admin task" });
    }
  },

  // PATCH /api/auth/admin/tasks/:id/status
  async updateTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      if (!AdminTask) {
        const item = memoryTasks.find(t => String(t.id) === String(id));
        if (!item) return res.status(404).json({ error: "Task not found" });
        item.status = status;
        item.completed_at = status === "Completed" ? new Date() : null;
        return res.status(200).json({ success: true, message: `Task status updated to ${status}`, data: item });
      }

      const task = await AdminTask.findByPk(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const completedAt = status === "Completed" ? new Date() : null;
      await task.update({
        status,
        completed_at: completedAt,
      });

      return res.status(200).json({
        success: true,
        message: `Task status updated to ${status}`,
        data: task,
      });
    } catch (err) {
      console.error("Error updating admin task status:", err);
      return res.status(500).json({ error: "Failed to update task status" });
    }
  },

  // PUT /api/auth/admin/tasks/:id
  async updateTask(req, res) {
    try {
      const { id } = req.params;

      if (!AdminTask) {
        const item = memoryTasks.find(t => String(t.id) === String(id));
        if (!item) return res.status(404).json({ error: "Task not found" });
        Object.assign(item, req.body);
        return res.status(200).json({ success: true, message: "Task updated successfully", data: item });
      }

      const task = await AdminTask.findByPk(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updateData = { ...req.body };
      if (updateData.status === "Completed" && !task.completed_at) {
        updateData.completed_at = new Date();
      } else if (updateData.status && updateData.status !== "Completed") {
        updateData.completed_at = null;
      }

      await task.update(updateData);

      return res.status(200).json({
        success: true,
        message: "Task updated successfully",
        data: task,
      });
    } catch (err) {
      console.error("Error updating admin task:", err);
      return res.status(500).json({ error: "Failed to update task" });
    }
  },

  // DELETE /api/auth/admin/tasks/:id
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      // Enforce role check: Only HR and Management can delete admin tasks
      const callerRole = (req.user?.role || req.headers.role || "").toLowerCase().trim();
      const allowedCreators = ["hr", "hrmanager", "management", "ceo", "coo", "cto", "cfo", "vp", "secretary"];
      if (callerRole && !allowedCreators.includes(callerRole)) {
        return res.status(403).json({ error: "Access Denied: Only HR and Management can delete admin tasks" });
      }

      if (!AdminTask) {
        memoryTasks = memoryTasks.filter(t => String(t.id) !== String(id));
        return res.status(200).json({ success: true, message: "Task deleted successfully" });
      }

      const task = await AdminTask.findByPk(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      await task.destroy();

      return res.status(200).json({
        success: true,
        message: "Task deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting admin task:", err);
      return res.status(500).json({ error: "Failed to delete task" });
    }
  },
};

module.exports = AdminTaskController;
