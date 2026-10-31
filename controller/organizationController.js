const { Department, JobGrade, Designation, Employee, User, sequelize } = require("../config/db");
const { Op } = require("sequelize");

const OrganizationController = {
  // GET /api/auth/organization/structure
  // Returns complete organization hierarchy: Departments -> Designations -> Grades + Headcounts
  async getOrganizationStructure(req, res) {
    try {
      const [departments, grades, designations, employeeCounts] = await Promise.all([
        Department.findAll({
          order: [["id", "ASC"]],
        }),
        JobGrade.findAll({
          order: [["rank_level", "ASC"]],
        }),
        Designation.findAll({
          include: [
            { model: JobGrade, as: "grade", attributes: ["grade_code", "grade_name", "rank_level", "min_salary", "max_salary", "notice_period_days"] },
            { model: Department, as: "department", attributes: ["id", "dept_code", "dept_name"] }
          ],
          order: [["title", "ASC"]],
        }),
        Employee.findAll({
          attributes: [
            "department_id",
            "designation_id",
            "grade_id",
            [sequelize.fn("COUNT", sequelize.col("id")), "count"]
          ],
          group: ["department_id", "designation_id", "grade_id"],
          raw: true,
        })
      ]);

      // Calculate total employees per department & designation
      const deptCountMap = {};
      const desigCountMap = {};
      const gradeCountMap = {};

      employeeCounts.forEach((row) => {
        const count = parseInt(row.count, 10) || 0;
        if (row.department_id) {
          deptCountMap[row.department_id] = (deptCountMap[row.department_id] || 0) + count;
        }
        if (row.designation_id) {
          desigCountMap[row.designation_id] = (desigCountMap[row.designation_id] || 0) + count;
        }
        if (row.grade_id) {
          gradeCountMap[row.grade_id] = (gradeCountMap[row.grade_id] || 0) + count;
        }
      });

      // Group designations by department (null = Global)
      const globalDesignations = [];
      const deptDesignationMap = {};

      designations.forEach((desig) => {
        const desigJson = desig.toJSON();
        desigJson.headcount = desigCountMap[desig.id] || 0;

        if (!desig.department_id) {
          globalDesignations.push(desigJson);
        } else {
          if (!deptDesignationMap[desig.department_id]) {
            deptDesignationMap[desig.department_id] = [];
          }
          deptDesignationMap[desig.department_id].push(desigJson);
        }
      });

      const structuredDepartments = departments.map((dept) => {
        const deptJson = dept.toJSON();
        deptJson.headcount = deptCountMap[dept.id] || 0;
        deptJson.designations = deptDesignationMap[dept.id] || [];
        return deptJson;
      });

      const structuredGrades = grades.map((g) => {
        const gJson = g.toJSON();
        gJson.headcount = gradeCountMap[g.id] || 0;
        return gJson;
      });

      return res.json({
        success: true,
        departments: structuredDepartments,
        global_designations: globalDesignations,
        grades: structuredGrades,
        total_departments: departments.length,
        total_designations: designations.length,
        total_grades: grades.length,
      });
    } catch (err) {
      console.error("Get organization structure error:", err);
      return res.status(500).json({ error: "Failed to fetch organization structure" });
    }
  },

  // ==========================================
  // DEPARTMENTS CRUD
  // ==========================================

  // GET /api/auth/departments
  async getDepartments(req, res) {
    try {
      const departments = await Department.findAll({
        order: [["id", "ASC"]],
      });
      return res.json({ success: true, data: departments });
    } catch (err) {
      console.error("Get departments error:", err);
      return res.status(500).json({ error: "Failed to fetch departments" });
    }
  },

  // POST /api/auth/departments
  async createDepartment(req, res) {
    try {
      const { dept_code, dept_name, description, hod_employee_id, hod_name } = req.body;

      if (!dept_name || !dept_code) {
        return res.status(400).json({ error: "Department code and name are required." });
      }

      const existing = await Department.findOne({
        where: {
          [Op.or]: [
            { dept_code: dept_code.trim().toUpperCase() },
            { dept_name: dept_name.trim() }
          ]
        }
      });

      if (existing) {
        return res.status(400).json({ error: "A department with this code or name already exists." });
      }

      const newDept = await Department.create({
        dept_code: dept_code.trim().toUpperCase(),
        dept_name: dept_name.trim(),
        description: description ? description.trim() : null,
        hod_employee_id: hod_employee_id ? hod_employee_id.trim() : null,
        hod_name: hod_name ? hod_name.trim() : null,
        is_active: true,
      });

      return res.status(201).json({ success: true, message: "Department created successfully.", data: newDept });
    } catch (err) {
      console.error("Create department error:", err);
      return res.status(500).json({ error: "Failed to create department" });
    }
  },

  // PUT /api/auth/departments/:id
  async updateDepartment(req, res) {
    try {
      const { id } = req.params;
      const { dept_code, dept_name, description, hod_employee_id, hod_name, is_active } = req.body;

      const dept = await Department.findByPk(id);
      if (!dept) {
        return res.status(404).json({ error: "Department not found." });
      }

      if (dept_code && dept_code.trim().toUpperCase() !== dept.dept_code) {
        const dupCode = await Department.findOne({ where: { dept_code: dept_code.trim().toUpperCase(), id: { [Op.ne]: id } } });
        if (dupCode) return res.status(400).json({ error: "Department code is already taken." });
      }

      if (dept_name && dept_name.trim() !== dept.dept_name) {
        const dupName = await Department.findOne({ where: { dept_name: dept_name.trim(), id: { [Op.ne]: id } } });
        if (dupName) return res.status(400).json({ error: "Department name is already taken." });
      }

      await dept.update({
        ...(dept_code ? { dept_code: dept_code.trim().toUpperCase() } : {}),
        ...(dept_name ? { dept_name: dept_name.trim() } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(hod_employee_id !== undefined ? { hod_employee_id: hod_employee_id || null } : {}),
        ...(hod_name !== undefined ? { hod_name: hod_name || null } : {}),
        ...(is_active !== undefined ? { is_active: !!is_active } : {}),
      });

      return res.json({ success: true, message: "Department updated successfully.", data: dept });
    } catch (err) {
      console.error("Update department error:", err);
      return res.status(500).json({ error: "Failed to update department" });
    }
  },

  // DELETE /api/auth/departments/:id
  async deleteDepartment(req, res) {
    try {
      const { id } = req.params;
      const dept = await Department.findByPk(id);
      if (!dept) {
        return res.status(404).json({ error: "Department not found." });
      }

      // Check if employees are assigned
      const assignedCount = await Employee.count({ where: { department_id: id } });
      if (assignedCount > 0) {
        // Soft delete / deactivate
        await dept.update({ is_active: false });
        return res.json({ success: true, message: `Department deactivated. ${assignedCount} active employees belong to it.` });
      }

      await dept.destroy();
      return res.json({ success: true, message: "Department deleted successfully." });
    } catch (err) {
      console.error("Delete department error:", err);
      return res.status(500).json({ error: "Failed to delete department" });
    }
  },

  // ==========================================
  // JOB GRADES CRUD
  // ==========================================

  // GET /api/auth/job-grades
  async getJobGrades(req, res) {
    try {
      const grades = await JobGrade.findAll({
        order: [["rank_level", "ASC"]],
      });
      return res.json({ success: true, data: grades });
    } catch (err) {
      console.error("Get job grades error:", err);
      return res.status(500).json({ error: "Failed to fetch job grades" });
    }
  },

  // POST /api/auth/job-grades
  async createJobGrade(req, res) {
    try {
      const { grade_code, grade_name, rank_level, min_salary, max_salary, notice_period_days, description } = req.body;

      if (!grade_code || !grade_name) {
        return res.status(400).json({ error: "Grade code and name are required." });
      }

      const existing = await JobGrade.findOne({ where: { grade_code: grade_code.trim().toUpperCase() } });
      if (existing) {
        return res.status(400).json({ error: "Job grade code already exists." });
      }

      const newGrade = await JobGrade.create({
        grade_code: grade_code.trim().toUpperCase(),
        grade_name: grade_name.trim(),
        rank_level: rank_level ? parseInt(rank_level, 10) : 1,
        min_salary: min_salary ? parseFloat(min_salary) : 0,
        max_salary: max_salary ? parseFloat(max_salary) : 0,
        notice_period_days: notice_period_days ? parseInt(notice_period_days, 10) : 30,
        description: description || null,
        is_active: true,
      });

      return res.status(201).json({ success: true, message: "Job grade created successfully.", data: newGrade });
    } catch (err) {
      console.error("Create job grade error:", err);
      return res.status(500).json({ error: "Failed to create job grade" });
    }
  },

  // PUT /api/auth/job-grades/:id
  async updateJobGrade(req, res) {
    try {
      const { id } = req.params;
      const { grade_code, grade_name, rank_level, min_salary, max_salary, notice_period_days, description, is_active } = req.body;

      const grade = await JobGrade.findByPk(id);
      if (!grade) {
        return res.status(404).json({ error: "Job grade not found." });
      }

      await grade.update({
        ...(grade_code ? { grade_code: grade_code.trim().toUpperCase() } : {}),
        ...(grade_name ? { grade_name: grade_name.trim() } : {}),
        ...(rank_level !== undefined ? { rank_level: parseInt(rank_level, 10) } : {}),
        ...(min_salary !== undefined ? { min_salary: parseFloat(min_salary) } : {}),
        ...(max_salary !== undefined ? { max_salary: parseFloat(max_salary) } : {}),
        ...(notice_period_days !== undefined ? { notice_period_days: parseInt(notice_period_days, 10) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(is_active !== undefined ? { is_active: !!is_active } : {}),
      });

      return res.json({ success: true, message: "Job grade updated successfully.", data: grade });
    } catch (err) {
      console.error("Update job grade error:", err);
      return res.status(500).json({ error: "Failed to update job grade" });
    }
  },

  // ==========================================
  // DESIGNATIONS CRUD
  // ==========================================

  // GET /api/auth/designations
  // Supports ?department_id= (returns dept specific + global designations)
  async getDesignations(req, res) {
    try {
      const { department_id, grade_id, is_active } = req.query;

      const whereClause = {};

      if (is_active !== undefined) {
        whereClause.is_active = is_active === "true" || is_active === true;
      }

      if (grade_id) {
        whereClause.grade_id = grade_id;
      }

      if (department_id) {
        // Return designations for this department OR global designations (department_id: null)
        whereClause[Op.or] = [
          { department_id: department_id },
          { department_id: null }
        ];
      }

      const designations = await Designation.findAll({
        where: whereClause,
        include: [
          {
            model: JobGrade,
            as: "grade",
            attributes: ["id", "grade_code", "grade_name", "rank_level", "min_salary", "max_salary", "notice_period_days"],
          },
          {
            model: Department,
            as: "department",
            attributes: ["id", "dept_code", "dept_name"],
          },
        ],
        order: [
          ["department_id", "ASC NULLS FIRST"],
          ["title", "ASC"],
        ],
      });

      return res.json({ success: true, data: designations });
    } catch (err) {
      console.error("Get designations error:", err);
      return res.status(500).json({ error: "Failed to fetch designations" });
    }
  },

  // POST /api/auth/designations
  async createDesignation(req, res) {
    try {
      const { title, code, department_id, grade_id, job_family, is_hod_role, description } = req.body;

      if (!title || !grade_id) {
        return res.status(400).json({ error: "Title and Job Grade (Grade ID) are required." });
      }

      // Generate code if not provided
      let desigCode = code ? code.trim().toUpperCase() : null;
      if (!desigCode) {
        const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8);
        desigCode = `${department_id ? `D${department_id}-` : "GEN-"}${cleanTitle}`;
      }

      // Check if duplicate code exists
      const existing = await Designation.findOne({ where: { code: desigCode } });
      if (existing) {
        desigCode = `${desigCode}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const newDesig = await Designation.create({
        title: title.trim(),
        code: desigCode,
        department_id: department_id ? parseInt(department_id, 10) : null,
        grade_id: parseInt(grade_id, 10),
        job_family: job_family ? job_family.trim() : "General",
        is_hod_role: !!is_hod_role,
        description: description || null,
        is_active: true,
      });

      // Fetch with associations for direct UI display
      const populated = await Designation.findByPk(newDesig.id, {
        include: [
          { model: JobGrade, as: "grade" },
          { model: Department, as: "department" },
        ],
      });

      return res.status(201).json({
        success: true,
        message: "Designation created successfully.",
        data: populated,
      });
    } catch (err) {
      console.error("Create designation error:", err);
      return res.status(500).json({ error: "Failed to create designation" });
    }
  },

  // PUT /api/auth/designations/:id
  async updateDesignation(req, res) {
    try {
      const { id } = req.params;
      const { title, code, department_id, grade_id, job_family, is_hod_role, description, is_active } = req.body;

      const desig = await Designation.findByPk(id);
      if (!desig) {
        return res.status(404).json({ error: "Designation not found." });
      }

      await desig.update({
        ...(title ? { title: title.trim() } : {}),
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        ...(department_id !== undefined ? { department_id: department_id ? parseInt(department_id, 10) : null } : {}),
        ...(grade_id !== undefined ? { grade_id: parseInt(grade_id, 10) } : {}),
        ...(job_family !== undefined ? { job_family: job_family.trim() } : {}),
        ...(is_hod_role !== undefined ? { is_hod_role: !!is_hod_role } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(is_active !== undefined ? { is_active: !!is_active } : {}),
      });

      const updated = await Designation.findByPk(id, {
        include: [
          { model: JobGrade, as: "grade" },
          { model: Department, as: "department" },
        ],
      });

      return res.json({ success: true, message: "Designation updated successfully.", data: updated });
    } catch (err) {
      console.error("Update designation error:", err);
      return res.status(500).json({ error: "Failed to update designation" });
    }
  },

  // DELETE /api/auth/designations/:id
  async deleteDesignation(req, res) {
    try {
      const { id } = req.params;
      const desig = await Designation.findByPk(id);
      if (!desig) {
        return res.status(404).json({ error: "Designation not found." });
      }

      const assignedCount = await Employee.count({ where: { designation_id: id } });
      if (assignedCount > 0) {
        await desig.update({ is_active: false });
        return res.json({ success: true, message: `Designation deactivated. ${assignedCount} active employees have this title.` });
      }

      await desig.destroy();
      return res.json({ success: true, message: "Designation deleted successfully." });
    } catch (err) {
      console.error("Delete designation error:", err);
      return res.status(500).json({ error: "Failed to delete designation" });
    }
  },
};

module.exports = OrganizationController;

