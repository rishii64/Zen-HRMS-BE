const { Department, JobGrade, Designation, Employee, User, Attendance, Payroll, sequelize } = require("../config/db");
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

  // ==========================================
  // INTERACTIVE ORG CHART & REPORTING TREE
  // ==========================================

  // GET /api/auth/organization/tree
  // Returns complete visual company reporting tree with roots, children hierarchy, node stats
  async getOrgTree(req, res) {
    try {
      const [employees, users, departments, grades] = await Promise.all([
        Employee.findAll({
          include: [
            { model: Department, as: "departmentProfile", attributes: ["id", "dept_code", "dept_name", "hod_employee_id", "hod_name"] },
            { model: Designation, as: "designationProfile", attributes: ["id", "title", "code", "job_family", "is_hod_role"] },
            { model: JobGrade, as: "gradeProfile", attributes: ["id", "grade_code", "grade_name", "rank_level", "min_salary", "max_salary"] }
          ],
          order: [["id", "ASC"]]
        }),
        User.findAll({
          attributes: ["employee_id", "name", "email", "profile_photo", "role", "designation", "dept", "reporting_manager_id", "hod_id", "hod_name"]
        }),
        Department.findAll({
          order: [["dept_name", "ASC"]]
        }),
        JobGrade.findAll({
          order: [["rank_level", "ASC"]]
        })
      ]);

      const userMap = {};
      users.forEach((u) => {
        if (u.employee_id) userMap[u.employee_id] = u;
      });

      const nodeMap = {};
      employees.forEach((emp) => {
        const user = userMap[emp.employee_id] || {};
        const name = user.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id;
        const deptName = emp.departmentProfile?.dept_name || emp.dept || user.dept || "General";
        const rankLevel = emp.gradeProfile?.rank_level || 1;
        const gradeCode = emp.gradeProfile?.grade_code || `L${rankLevel}`;
        const desigTitle = emp.designationProfile?.title || emp.designation || user.designation || "Staff";
        const isHod = !!(
          emp.hod_id === emp.employee_id ||
          user.hod_id === emp.employee_id ||
          emp.departmentProfile?.hod_employee_id === emp.employee_id ||
          emp.designationProfile?.is_hod_role ||
          /hod|head|general manager|chro|ceo|coo|cto|cfo|vp/i.test(desigTitle)
        );

        nodeMap[emp.employee_id] = {
          id: emp.id,
          employee_id: emp.employee_id,
          name,
          email: emp.email || user.email || "",
          avatar: emp.profile_photo || user.profile_photo || "",
          role: user.role || emp.job_role || "employee",
          department_id: emp.department_id || emp.departmentProfile?.id || null,
          department_name: deptName,
          dept_code: emp.departmentProfile?.dept_code || "GEN",
          designation: desigTitle,
          designation_id: emp.designation_id,
          rank_level: rankLevel,
          grade_code: gradeCode,
          grade_name: emp.gradeProfile?.grade_name || `Level ${rankLevel}`,
          reporting_manager_id: emp.reporting_manager_id || user.reporting_manager_id || null,
          reporting_manager_name: null,
          hod_id: emp.hod_id || user.hod_id || emp.departmentProfile?.hod_employee_id || null,
          hod_name: emp.hod_name || user.hod_name || emp.departmentProfile?.hod_name || null,
          work_location: emp.work_location || "Kolkata",
          employment_type: emp.employment_type || "Permanent",
          status: emp.status || "Active",
          current_salary: emp.current_salary ? parseFloat(emp.current_salary) : 0,
          is_hod: isHod,
          direct_reports_count: 0,
          total_reports_count: 0,
          children: []
        };
      });

      // Find top executive (highest rank or CEO/CHRO/MD)
      let topExec = null;
      Object.values(nodeMap).forEach((n) => {
        if (!topExec || n.rank_level > topExec.rank_level) {
          topExec = n;
        }
      });

      // Map managers' names and resolve legacy records where ID was omitted but name was provided
      Object.values(nodeMap).forEach((n) => {
        let mgrId = n.reporting_manager_id;
        if (!mgrId) {
          const empRec = employees.find((e) => (e.employee_id || "").toLowerCase() === (n.employee_id || "").toLowerCase());
          const userRec = userMap[n.employee_id];
          const mName = (empRec?.reporting_manager || userRec?.reporting_manager || "").trim().toLowerCase();
          if (mName && mName !== "n/a" && mName !== "none") {
            const matchedNode = Object.values(nodeMap).find((node) => node.name && node.name.toLowerCase().trim() === mName);
            if (matchedNode) {
              mgrId = matchedNode.employee_id;
              n.reporting_manager_id = mgrId;
            }
          }
        }
        if (mgrId && nodeMap[mgrId]) {
          n.reporting_manager_name = nodeMap[mgrId].name;
        }
      });

      // Assemble hierarchy
      const roots = [];

      // Helper to prevent circular dependencies in live tree display
      const wouldCauseCycle = (childId, parentId) => {
        let curr = parentId;
        const seen = new Set([childId]);
        while (curr) {
          if (seen.has(curr)) return true;
          seen.add(curr);
          curr = nodeMap[curr]?.reporting_manager_id;
        }
        return false;
      };

      Object.values(nodeMap).forEach((node) => {
        const mgrId = node.reporting_manager_id;
        if (mgrId && nodeMap[mgrId] && mgrId !== node.employee_id && !wouldCauseCycle(node.employee_id, mgrId)) {
          nodeMap[mgrId].children.push(node);
          nodeMap[mgrId].direct_reports_count++;
        } else {
          // If no manager or self, fallback to top executive if available and not top exec themselves
          if (!mgrId && topExec && node.employee_id !== topExec.employee_id && !wouldCauseCycle(node.employee_id, topExec.employee_id)) {
            topExec.children.push(node);
            topExec.direct_reports_count++;
            node.reporting_manager_id = topExec.employee_id;
            node.reporting_manager_name = topExec.name;
          } else {
            roots.push(node);
          }
        }
      });

      // Helper to compute total nested reports count and max tree depth
      let maxDepth = 1;
      const computeMetrics = (node, depth = 1) => {
        if (depth > maxDepth) maxDepth = depth;
        let count = 0;
        node.children.forEach((child) => {
          count += 1 + computeMetrics(child, depth + 1);
        });
        node.total_reports_count = count;
        // Sort children by rank_level descending
        node.children.sort((a, b) => b.rank_level - a.rank_level || a.name.localeCompare(b.name));
        return count;
      };

      roots.forEach((root) => computeMetrics(root, 1));
      roots.sort((a, b) => b.rank_level - a.rank_level);

      // Department summaries
      const deptSummaryMap = {};
      Object.values(nodeMap).forEach((n) => {
        const d = n.department_name;
        if (!deptSummaryMap[d]) {
          deptSummaryMap[d] = {
            name: d,
            code: n.dept_code,
            count: 0,
            hod_name: null,
            hod_id: null,
            members: []
          };
        }
        deptSummaryMap[d].count++;
        deptSummaryMap[d].members.push({ employee_id: n.employee_id, name: n.name, designation: n.designation, rank_level: n.rank_level });
        if (n.is_hod && (!deptSummaryMap[d].hod_id || n.rank_level > 8)) {
          deptSummaryMap[d].hod_name = n.name;
          deptSummaryMap[d].hod_id = n.employee_id;
        }
      });

      return res.json({
        success: true,
        roots,
        all_nodes: Object.values(nodeMap),
        total_nodes: Object.keys(nodeMap).length,
        max_depth: maxDepth,
        departments_summary: Object.values(deptSummaryMap),
        top_executive: topExec ? { employee_id: topExec.employee_id, name: topExec.name, designation: topExec.designation } : null
      });
    } catch (err) {
      console.error("Get org tree error:", err);
      return res.status(500).json({ error: "Failed to construct organization tree: " + err.message });
    }
  },

  // GET /api/auth/organization/department-hierarchy
  // Returns department-by-department hierarchy with HOD, sub-teams, and rank breakdown
  async getDepartmentHierarchy(req, res) {
    try {
      const [departments, employees, users, grades] = await Promise.all([
        Department.findAll({ order: [["dept_name", "ASC"]] }),
        Employee.findAll({
          include: [
            { model: Designation, as: "designationProfile", attributes: ["id", "title", "code", "job_family", "is_hod_role"] },
            { model: JobGrade, as: "gradeProfile", attributes: ["id", "grade_code", "grade_name", "rank_level", "min_salary", "max_salary"] }
          ]
        }),
        User.findAll({ attributes: ["employee_id", "name", "email", "profile_photo", "role"] }),
        JobGrade.findAll({ order: [["rank_level", "ASC"]] })
      ]);

      const userMap = {};
      users.forEach((u) => {
        if (u.employee_id) userMap[u.employee_id] = u;
      });

      // Group employees by department_id and dept name
      const deptEmployeesMap = {};
      employees.forEach((emp) => {
        const deptKey = emp.department_id || emp.dept || "Unassigned";
        if (!deptEmployeesMap[deptKey]) deptEmployeesMap[deptKey] = [];
        const user = userMap[emp.employee_id] || {};
        deptEmployeesMap[deptKey].push({
          id: emp.id,
          employee_id: emp.employee_id,
          name: user.name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id,
          email: emp.email || user.email || "",
          avatar: emp.profile_photo || user.profile_photo || "",
          designation: emp.designationProfile?.title || emp.designation || "Staff",
          rank_level: emp.gradeProfile?.rank_level || 1,
          grade_code: emp.gradeProfile?.grade_code || "L1",
          reporting_manager_id: emp.reporting_manager_id,
          employment_type: emp.employment_type || "Permanent",
          work_location: emp.work_location || "Kolkata",
          current_salary: emp.current_salary ? parseFloat(emp.current_salary) : 0,
          status: emp.status || "Active"
        });
      });

      const hierarchy = departments.map((dept) => {
        const deptEmps = (deptEmployeesMap[dept.id] || []).concat(deptEmployeesMap[dept.dept_name] || []);
        // Deduplicate
        const uniqueEmps = Array.from(new Map(deptEmps.map((e) => [e.employee_id, e])).values());

        // Sort by rank descending
        uniqueEmps.sort((a, b) => b.rank_level - a.rank_level || a.name.localeCompare(b.name));

        // Rank level distribution
        const rankCounts = {
          executive: uniqueEmps.filter((e) => e.rank_level >= 11).length,
          senior_leadership: uniqueEmps.filter((e) => e.rank_level >= 8 && e.rank_level <= 10).length,
          management: uniqueEmps.filter((e) => e.rank_level >= 4 && e.rank_level <= 7).length,
          staff: uniqueEmps.filter((e) => e.rank_level <= 3).length
        };

        const totalSalary = uniqueEmps.reduce((acc, curr) => acc + (curr.current_salary || 0), 0);

        // Identify HOD: either explicit hod_employee_id, or highest rank member
        let hodInfo = null;
        if (dept.hod_employee_id) {
          const found = uniqueEmps.find((e) => e.employee_id === dept.hod_employee_id);
          if (found) {
            hodInfo = found;
          } else {
            const externalUser = userMap[dept.hod_employee_id];
            hodInfo = {
              employee_id: dept.hod_employee_id,
              name: dept.hod_name || externalUser?.name || dept.hod_employee_id,
              designation: "Department Head",
              rank_level: 10
            };
          }
        } else if (uniqueEmps.length > 0) {
          hodInfo = uniqueEmps[0];
        }

        return {
          id: dept.id,
          dept_code: dept.dept_code,
          dept_name: dept.dept_name,
          description: dept.description,
          parent_dept_id: dept.parent_dept_id,
          is_active: dept.is_active,
          total_headcount: uniqueEmps.length,
          active_headcount: uniqueEmps.filter((e) => e.status === "Active").length,
          total_payroll: totalSalary,
          avg_salary: uniqueEmps.length ? Math.round(totalSalary / uniqueEmps.length) : 0,
          hod: hodInfo,
          rank_breakdown: rankCounts,
          employees: uniqueEmps
        };
      });

      return res.json({
        success: true,
        departments: hierarchy,
        total_departments: hierarchy.length,
        total_staff: hierarchy.reduce((acc, d) => acc + d.total_headcount, 0)
      });
    } catch (err) {
      console.error("Get department hierarchy error:", err);
      return res.status(500).json({ error: "Failed to fetch department hierarchy: " + err.message });
    }
  },

  // PUT /api/auth/organization/reporting-manager
  // Reassign an employee's reporting manager with circular loop prevention
  async reassignReportingManager(req, res) {
    try {
      const { employee_id, new_reporting_manager_id } = req.body;

      if (!employee_id) {
        return res.status(400).json({ error: "employee_id is required" });
      }

      if (employee_id === new_reporting_manager_id) {
        return res.status(400).json({ error: "An employee cannot report to themselves." });
      }

      // Check if employee exists
      const emp = await Employee.findOne({ where: { employee_id } });
      if (!emp) {
        return res.status(404).json({ error: `Employee ${employee_id} not found.` });
      }

      let managerName = null;
      if (new_reporting_manager_id) {
        const mgr = await Employee.findOne({ where: { employee_id: new_reporting_manager_id } });
        if (!mgr) {
          return res.status(404).json({ error: `Target reporting manager ${new_reporting_manager_id} not found.` });
        }
        managerName = `${mgr.first_name || ""} ${mgr.last_name || ""}`.trim();

        // Circular hierarchy check: Traverse up new_reporting_manager's chain
        let curr = mgr;
        const visited = new Set([employee_id]);
        while (curr && curr.reporting_manager_id) {
          if (visited.has(curr.reporting_manager_id)) {
            return res.status(400).json({
              error: `Circular reporting relationship detected: ${mgr.employee_id} is already in the reporting chain under ${employee_id}.`
            });
          }
          visited.add(curr.employee_id);
          curr = await Employee.findOne({ where: { employee_id: curr.reporting_manager_id } });
        }
      }

      // Update Employee and User
      await Employee.update(
        { reporting_manager_id: new_reporting_manager_id || null, reporting_manager: managerName || "N/A" },
        { where: sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), employee_id.toLowerCase().trim()) }
      );
      await User.update(
        { reporting_manager_id: new_reporting_manager_id || null, reporting_manager: managerName || "N/A" },
        { where: sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), employee_id.toLowerCase().trim()) }
      );

      return res.json({
        success: true,
        message: `Reporting manager for ${employee_id} updated to ${managerName || "None (Top Level Root)"}.`,
        employee_id,
        new_reporting_manager_id: new_reporting_manager_id || null,
        new_reporting_manager_name: managerName || "None"
      });
    } catch (err) {
      console.error("Reassign reporting manager error:", err);
      return res.status(500).json({ error: "Failed to update reporting manager: " + err.message });
    }
  },

  // PUT /api/auth/organization/hod
  // Reassign an employee's Department Head / HOD
  async reassignHod(req, res) {
    try {
      const { employee_id, new_hod_id } = req.body;
      if (!employee_id) {
        return res.status(400).json({ error: "employee_id is required" });
      }

      const emp = await Employee.findOne({ where: { employee_id } });
      if (!emp) {
        return res.status(404).json({ error: `Employee ${employee_id} not found.` });
      }

      let hodName = null;
      if (new_hod_id) {
        const hEmp = await Employee.findOne({ where: { employee_id: new_hod_id } });
        const hUser = !hEmp ? await User.findOne({ where: { employee_id: new_hod_id } }) : null;
        if (!hEmp && !hUser) {
          return res.status(404).json({ error: `Target HOD ${new_hod_id} not found.` });
        }
        hodName = hEmp ? `${hEmp.first_name || ""} ${hEmp.last_name || ""}`.trim() || hEmp.name : hUser.name;
      }

      await Employee.update(
        { hod_id: new_hod_id || null, hod_name: hodName || "N/A" },
        { where: sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), employee_id.toLowerCase().trim()) }
      );
      await User.update(
        { hod_id: new_hod_id || null, hod_name: hodName || "N/A" },
        { where: sequelize.where(sequelize.fn("LOWER", sequelize.col("employee_id")), employee_id.toLowerCase().trim()) }
      );

      return res.json({
        success: true,
        message: `Department Head for ${employee_id} updated to ${hodName || "None"}.`,
        employee_id,
        new_hod_id: new_hod_id || null,
        new_hod_name: hodName || "None"
      });
    } catch (err) {
      console.error("Reassign HOD error:", err);
      return res.status(500).json({ error: "Failed to update HOD: " + err.message });
    }
  },

  // GET /api/auth/organization/analytics
  // Multi-dimensional HR, Attendance, and Payroll analytics formatted for Chart.js
  async getVisualAnalytics(req, res) {
    try {
      const [employees, departments, grades, attendances, payrolls] = await Promise.all([
        Employee.findAll({
          include: [
            { model: Department, as: "departmentProfile", attributes: ["id", "dept_code", "dept_name"] },
            { model: Designation, as: "designationProfile", attributes: ["id", "title"] },
            { model: JobGrade, as: "gradeProfile", attributes: ["id", "grade_code", "grade_name", "rank_level", "min_salary", "max_salary"] }
          ],
          where: { status: "Active" },
          raw: false
        }),
        Department.findAll({ order: [["dept_name", "ASC"]] }),
        JobGrade.findAll({ order: [["rank_level", "ASC"]] }),
        Attendance.findAll({
          order: [["date", "DESC"]],
          limit: 300,
          raw: true
        }),
        Payroll.findAll({
          order: [["id", "DESC"]],
          limit: 50,
          raw: true
        })
      ]);

      // 1. Workforce Demographics (Department Headcount)
      const deptColors = [
        "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899",
        "#06b6d4", "#6366f1", "#14b8a6", "#f97316", "#64748b"
      ];
      const deptCountMap = {};
      departments.forEach((d) => { deptCountMap[d.dept_name] = 0; });
      employees.forEach((emp) => {
        const dName = emp.departmentProfile?.dept_name || emp.dept || "General";
        deptCountMap[dName] = (deptCountMap[dName] || 0) + 1;
      });

      const deptLabels = Object.keys(deptCountMap).filter((k) => deptCountMap[k] > 0);
      const deptCounts = deptLabels.map((k) => deptCountMap[k]);

      // 2. Rank Level Distribution (L1 to L11)
      const rankLabels = [
        "L1 Intern", "L2 Executive", "L3 Sr. Executive", "L4 Asst. Mgr",
        "L5 Deputy Mgr", "L6 Manager", "L7 Sr. Manager", "L8 AGM",
        "L9 DGM", "L10 GM", "L11 CXO/VP"
      ];
      const rankCounts = new Array(11).fill(0);
      employees.forEach((emp) => {
        const r = emp.gradeProfile?.rank_level || 1;
        if (r >= 1 && r <= 11) {
          rankCounts[r - 1]++;
        }
      });

      // 3. Employment Type Distribution
      const empTypeMap = { Permanent: 0, Probation: 0, Intern: 0, Contract: 0 };
      employees.forEach((emp) => {
        const t = emp.employment_type || "Permanent";
        empTypeMap[t] = (empTypeMap[t] || 0) + 1;
      });

      // 4. Work Location Distribution
      const locMap = {};
      employees.forEach((emp) => {
        const loc = emp.work_location || "Kolkata";
        locMap[loc] = (locMap[loc] || 0) + 1;
      });

      // 5. Attendance Analytics (14-day trends)
      const dateMap = {};
      attendances.forEach((att) => {
        if (!att.date) return;
        const dStr = typeof att.date === "string" ? att.date.slice(0, 10) : new Date(att.date).toISOString().slice(0, 10);
        if (!dateMap[dStr]) {
          dateMap[dStr] = { present: 0, late: 0, absent: 0, half_day: 0, leave: 0 };
        }
        const s = (att.status || "").toLowerCase();
        if (s.includes("late")) dateMap[dStr].late++;
        else if (s.includes("present")) dateMap[dStr].present++;
        else if (s.includes("half")) dateMap[dStr].half_day++;
        else if (s.includes("leave")) dateMap[dStr].leave++;
        else dateMap[dStr].absent++;
      });

      // Sort dates chronologically and take last 14 dates
      const sortedDates = Object.keys(dateMap).sort().slice(-14);
      const attDatesFormatted = sortedDates.map((d) => {
        const parts = d.split("-");
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
      const attPresentData = sortedDates.map((d) => dateMap[d].present);
      const attLateData = sortedDates.map((d) => dateMap[d].late);
      const attAbsentData = sortedDates.map((d) => dateMap[d].absent);
      const attLeaveData = sortedDates.map((d) => dateMap[d].leave);

      // Department Attendance Compliance
      const deptAttMap = {};
      attendances.forEach((att) => {
        const dName = att.dept || "General";
        if (!deptAttMap[dName]) deptAttMap[dName] = { total: 0, attended: 0 };
        deptAttMap[dName].total++;
        const s = (att.status || "").toLowerCase();
        if (s.includes("present") || s.includes("late")) {
          deptAttMap[dName].attended++;
        }
      });
      const deptAttLabels = Object.keys(deptAttMap).filter((d) => deptAttMap[d].total >= 2);
      const deptAttRates = deptAttLabels.map((d) => Math.round((deptAttMap[d].attended / deptAttMap[d].total) * 100));

      // 6. Payroll & Compensation Analytics
      const deptSalaryMap = {};
      employees.forEach((emp) => {
        const dName = emp.departmentProfile?.dept_name || emp.dept || "General";
        const sal = emp.current_salary ? parseFloat(emp.current_salary) : 0;
        deptSalaryMap[dName] = (deptSalaryMap[dName] || 0) + sal;
      });

      const payrollDeptLabels = Object.keys(deptSalaryMap).filter((k) => deptSalaryMap[k] > 0);
      const payrollDeptValues = payrollDeptLabels.map((k) => deptSalaryMap[k]);

      // Job Grade Salary Band Ranges
      const gradeSalaryData = grades.map((g) => ({
        grade: g.grade_code,
        name: g.grade_name,
        rank: g.rank_level,
        min: parseFloat(g.min_salary) || 0,
        max: parseFloat(g.max_salary) || 0
      }));

      // Deductions Breakdown from finalized Payrolls
      let totalGross = 0;
      let totalNet = 0;
      let totalTax = 0;
      let totalPfEsi = 0;
      payrolls.forEach((p) => {
        totalGross += parseFloat(p.gross_pay) || 0;
        totalNet += parseFloat(p.net_salary) || 0;
        try {
          const tax = typeof p.tax_deductions === "string" ? JSON.parse(p.tax_deductions) : p.tax_deductions;
          if (tax?.total_tax) totalTax += parseFloat(tax.total_tax) || 0;
          const stat = typeof p.statutory_deductions === "string" ? JSON.parse(p.statutory_deductions) : p.statutory_deductions;
          if (stat?.total_statutory) totalPfEsi += parseFloat(stat.total_statutory) || 0;
        } catch (_) {}
      });

      const totalMonthlyPayroll = Object.values(deptSalaryMap).reduce((a, b) => a + b, 0);

      return res.json({
        success: true,
        summary: {
          total_employees: employees.length,
          total_departments: departments.length,
          monthly_payroll_run_rate: totalMonthlyPayroll,
          avg_monthly_salary: employees.length ? Math.round(totalMonthlyPayroll / employees.length) : 0,
          overall_attendance_rate: attendances.length
            ? Math.round((attendances.filter((a) => (a.status || "").toLowerCase().includes("present")).length / attendances.length) * 100)
            : 95
        },
        workforce: {
          department_headcount: {
            labels: deptLabels,
            data: deptCounts,
            colors: deptColors.slice(0, deptLabels.length)
          },
          rank_distribution: {
            labels: rankLabels,
            data: rankCounts
          },
          employment_types: {
            labels: Object.keys(empTypeMap),
            data: Object.values(empTypeMap),
            colors: ["#10b981", "#f59e0b", "#3b82f6", "#64748b"]
          },
          locations: {
            labels: Object.keys(locMap),
            data: Object.values(locMap),
            colors: ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981"]
          }
        },
        attendance: {
          daily_trends: {
            labels: attDatesFormatted.length ? attDatesFormatted : ["Day 1", "Day 2", "Day 3"],
            present: attPresentData.length ? attPresentData : [8, 9, 8],
            late: attLateData.length ? attLateData : [1, 0, 1],
            absent: attAbsentData.length ? attAbsentData : [0, 0, 0],
            leave: attLeaveData.length ? attLeaveData : [0, 0, 0]
          },
          department_compliance: {
            labels: deptAttLabels.length ? deptAttLabels : deptLabels,
            data: deptAttRates.length ? deptAttRates : deptLabels.map(() => 95)
          }
        },
        payroll: {
          department_costs: {
            labels: payrollDeptLabels,
            data: payrollDeptValues,
            colors: deptColors.slice(0, payrollDeptLabels.length)
          },
          grade_salary_bands: gradeSalaryData,
          deductions_overview: {
            labels: ["Net Payout", "Statutory (PF/ESI)", "Income Tax (TDS)", "Other Deductions"],
            data: [
              totalNet > 0 ? Math.round(totalNet) : 80000,
              totalPfEsi > 0 ? Math.round(totalPfEsi) : 8000,
              totalTax > 0 ? Math.round(totalTax) : 6000,
              4000
            ],
            colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]
          }
        }
      });
    } catch (err) {
      console.error("Get visual analytics error:", err);
      return res.status(500).json({ error: "Failed to generate visual analytics: " + err.message });
    }
  },
};

module.exports = OrganizationController;

