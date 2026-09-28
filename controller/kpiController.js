const { KpiTemplate, KpiAssignment, KpiGoalItem, Employee, User, sequelize } = require("../config/db");
const { Op } = require("sequelize");

const KPI_DEFAULT_SEEDS = [
  // Engineering / Product
  {
    department: "Engineering",
    designation: "All",
    title: "Sprint Delivery & Velocity",
    description: "On-time delivery of committed sprint user stories and milestone deliverables.",
    target_metric: 95,
    unit: "%",
    default_weight: 30,
  },
  {
    department: "Engineering",
    designation: "All",
    title: "Code Quality & Test Coverage",
    description: "Maintain unit test coverage, zero critical SonarQube/lint vulnerabilities, and thorough PR reviews.",
    target_metric: 85,
    unit: "%",
    default_weight: 25,
  },
  {
    department: "Engineering",
    designation: "All",
    title: "Bug Resolution SLA",
    description: "Resolve P1/P2 production incidents and QA bug reports within agreed turnaround SLAs.",
    target_metric: 98,
    unit: "%",
    default_weight: 25,
  },
  {
    department: "Engineering",
    designation: "All",
    title: "Technical Documentation & Mentorship",
    description: "Author system architecture docs and mentor junior engineers or lead internal knowledge shares.",
    target_metric: 4,
    unit: "Sessions",
    default_weight: 20,
  },

  // Sales & Business Development
  {
    department: "Sales",
    designation: "All",
    title: "Quarterly Revenue Quota",
    description: "Achieve targeted quarterly closed-won revenue run rate.",
    target_metric: 100,
    unit: "% Target",
    default_weight: 40,
  },
  {
    department: "Sales",
    designation: "All",
    title: "Lead Conversion Pipeline",
    description: "Convert qualified inbound and outbound leads into active enterprise negotiations.",
    target_metric: 25,
    unit: "% Conversion",
    default_weight: 25,
  },
  {
    department: "Sales",
    designation: "All",
    title: "Client Retention & Account Expansion",
    description: "Prevent churn and identify cross-sell or up-sell opportunities in existing key accounts.",
    target_metric: 90,
    unit: "% Retention",
    default_weight: 20,
  },
  {
    department: "Sales",
    designation: "All",
    title: "CRM Hygiene & Activity Tracking",
    description: "Log client meetings, call notes, and deal stages timely in corporate CRM.",
    target_metric: 100,
    unit: "% Logged",
    default_weight: 15,
  },

  // Human Resources
  {
    department: "Human Resources",
    designation: "All",
    title: "Talent Acquisition Time-to-Fill",
    description: "Average days to source, interview, and close qualified candidates for vacant positions.",
    target_metric: 30,
    unit: "Days",
    default_weight: 30,
  },
  {
    department: "Human Resources",
    designation: "All",
    title: "Employee Retention & Culture Score",
    description: "Quarterly employee pulse happiness index and reduction in voluntary attrition.",
    target_metric: 88,
    unit: "% Satisfaction",
    default_weight: 30,
  },
  {
    department: "Human Resources",
    designation: "All",
    title: "Onboarding & Compliance Completion",
    description: "Ensure 100% document verification, statutory enrollments, and background checks within 15 days.",
    target_metric: 100,
    unit: "%",
    default_weight: 25,
  },
  {
    department: "Human Resources",
    designation: "All",
    title: "Training & Development Hours",
    description: "Deliver organization-wide compliance and skill enhancement workshops.",
    target_metric: 20,
    unit: "Hours/Quarter",
    default_weight: 15,
  },

  // Marketing
  {
    department: "Marketing",
    designation: "All",
    title: "Marketing Qualified Leads (MQLs)",
    description: "Generate verified inbound marketing leads through digital campaigns and SEO.",
    target_metric: 250,
    unit: "MQLs",
    default_weight: 35,
  },
  {
    department: "Marketing",
    designation: "All",
    title: "Brand Reach & Engagement Rate",
    description: "Growth in social media followers, website traffic, and organic engagement rate.",
    target_metric: 20,
    unit: "% Growth",
    default_weight: 25,
  },
  {
    department: "Marketing",
    designation: "All",
    title: "Customer Acquisition Cost (CAC)",
    description: "Optimize paid acquisition channels to reduce blended CAC within budget.",
    target_metric: 100,
    unit: "% Under Budget",
    default_weight: 20,
  },
  {
    department: "Marketing",
    designation: "All",
    title: "Content Production & Collateral",
    description: "Deliver case studies, product whitepapers, and promotional webinars on schedule.",
    target_metric: 12,
    unit: "Assets",
    default_weight: 20,
  },
];

const KpiController = {
  // ==========================================
  // 1. MASTER TEMPLATES (HR / Admin / HOD)
  // ==========================================

  async getTemplates(req, res) {
    try {
      const { department } = req.query;
      const where = { is_active: true };

      if (department && department !== "All") {
        where.department = department;
      }

      // Check if templates exist, if empty seed default industry templates
      const count = await KpiTemplate.count();
      if (count === 0) {
        await KpiTemplate.bulkCreate(KPI_DEFAULT_SEEDS);
      }

      const templates = await KpiTemplate.findAll({
        where,
        order: [["department", "ASC"], ["title", "ASC"]],
      });

      return res.json({ success: true, templates });
    } catch (err) {
      console.error("Get KPI templates error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve KPI templates" });
    }
  },

  async createTemplate(req, res) {
    try {
      const { department, designation, title, description, target_metric, unit, default_weight } = req.body;
      if (!department || !title) {
        return res.status(400).json({ error: "Department and Title are required" });
      }

      const template = await KpiTemplate.create({
        department,
        designation: designation || "All",
        title,
        description: description || "",
        target_metric: parseFloat(target_metric) || 100,
        unit: unit || "%",
        default_weight: parseFloat(default_weight) || 25,
        is_active: true,
      });

      return res.status(201).json({ success: true, message: "KPI Template created", template });
    } catch (err) {
      console.error("Create KPI template error:", err.message);
      return res.status(500).json({ error: "Failed to create KPI template" });
    }
  },

  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await KpiTemplate.findByPk(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const { department, designation, title, description, target_metric, unit, default_weight, is_active } = req.body;
      await template.update({
        department: department !== undefined ? department : template.department,
        designation: designation !== undefined ? designation : template.designation,
        title: title !== undefined ? title : template.title,
        description: description !== undefined ? description : template.description,
        target_metric: target_metric !== undefined ? parseFloat(target_metric) : template.target_metric,
        unit: unit !== undefined ? unit : template.unit,
        default_weight: default_weight !== undefined ? parseFloat(default_weight) : template.default_weight,
        is_active: is_active !== undefined ? is_active : template.is_active,
      });

      return res.json({ success: true, message: "Template updated", template });
    } catch (err) {
      console.error("Update KPI template error:", err.message);
      return res.status(500).json({ error: "Failed to update KPI template" });
    }
  },

  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await KpiTemplate.findByPk(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      await template.update({ is_active: false });
      return res.json({ success: true, message: "Template removed" });
    } catch (err) {
      console.error("Delete KPI template error:", err.message);
      return res.status(500).json({ error: "Failed to delete KPI template" });
    }
  },

  // ==========================================
  // 2. GOAL ASSIGNMENT (HR Admin / HOD)
  // ==========================================

  async assignKpi(req, res) {
    const t = await sequelize.transaction();
    try {
      const { employee_id, cycle_name = "Q1 2026", goals = [] } = req.body;

      if (!employee_id || !Array.isArray(goals) || goals.length === 0) {
        await t.rollback();
        return res.status(400).json({ error: "employee_id and at least one goal are required" });
      }

      // Look up employee info
      let user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
      });

      if (!user) {
        user = await Employee.findOne({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("employee_id")),
            employee_id.toLowerCase().trim()
          ),
        });
      }

      const department = user?.dept || user?.department || "General";
      const designation = user?.designation || "Staff";

      // Calculate total weight
      const totalWeightage = goals.reduce((acc, g) => acc + (parseFloat(g.weightage) || 0), 0);

      // Find or create assignment for this cycle
      let assignment = await KpiAssignment.findOne({
        where: {
          employee_id,
          cycle_name,
        },
        transaction: t,
      });

      if (assignment) {
        // Clear previous goals if re-assigning
        await KpiGoalItem.destroy({ where: { assignment_id: assignment.id }, transaction: t });
        await assignment.update({
          department,
          designation,
          status: "Assigned",
          total_weightage: totalWeightage,
          self_overall_score: null,
          manager_overall_score: null,
          final_calibrated_score: null,
          submitted_at: null,
          reviewed_at: null,
          approved_at: null,
        }, { transaction: t });
      } else {
        assignment = await KpiAssignment.create({
          employee_id,
          cycle_name,
          department,
          designation,
          status: "Assigned",
          total_weightage: totalWeightage,
        }, { transaction: t });
      }

      // Create goal items
      const goalItems = goals.map((g) => ({
        assignment_id: assignment.id,
        title: g.title,
        description: g.description || "",
        target: parseFloat(g.target) || 100,
        unit: g.unit || "%",
        weightage: parseFloat(g.weightage) || 25,
        actual_achieved: 0,
      }));

      await KpiGoalItem.bulkCreate(goalItems, { transaction: t });
      await t.commit();

      const created = await KpiAssignment.findByPk(assignment.id, {
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      return res.status(201).json({
        success: true,
        message: `KPI goals assigned successfully for ${cycle_name}`,
        assignment: created,
      });
    } catch (err) {
      await t.rollback();
      console.error("Assign KPI error:", err.message);
      return res.status(500).json({ error: "Failed to assign KPI goals" });
    }
  },

  async bulkAssignDepartment(req, res) {
    try {
      const { department, cycle_name = "Q1 2026", template_ids } = req.body;
      if (!department) {
        return res.status(400).json({ error: "Department is required" });
      }

      // Fetch employees in this department
      let employees = await User.findAll({
        where: {
          [Op.or]: [
            { dept: department },
            { dept: { [Op.iLike]: department } },
          ],
        },
      });

      if (employees.length === 0) {
        employees = await Employee.findAll({
          where: {
            [Op.or]: [
              { dept: department },
              { dept: { [Op.iLike]: department } },
            ],
          },
        });
      }

      if (employees.length === 0) {
        return res.status(404).json({ error: `No active employees found in ${department}` });
      }

      // Resolve templates to use
      let templates = [];
      if (Array.isArray(template_ids) && template_ids.length > 0) {
        templates = await KpiTemplate.findAll({ where: { id: template_ids } });
      } else {
        templates = await KpiTemplate.findAll({ where: { department, is_active: true } });
      }

      if (templates.length === 0) {
        return res.status(400).json({ error: `No KPI templates found for ${department}. Create templates first.` });
      }

      const goals = templates.map((t) => ({
        title: t.title,
        description: t.description,
        target: t.target_metric,
        unit: t.unit,
        weightage: t.default_weight,
      }));

      let assignedCount = 0;
      for (const emp of employees) {
        try {
          let assignment = await KpiAssignment.findOne({
            where: { employee_id: emp.employee_id, cycle_name },
          });

          if (!assignment) {
            assignment = await KpiAssignment.create({
              employee_id: emp.employee_id,
              cycle_name,
              department: emp.department,
              designation: emp.designation,
              status: "Assigned",
              total_weightage: 100,
            });

            await KpiGoalItem.bulkCreate(
              goals.map((g) => ({ ...g, assignment_id: assignment.id }))
            );
            assignedCount++;
          }
        } catch (innerErr) {
          console.warn(`Bulk assign skipped for ${emp.employee_id}:`, innerErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Assigned KPI goals to ${assignedCount} employee(s) in ${department} for ${cycle_name}`,
        totalEmployees: employees.length,
        assignedCount,
      });
    } catch (err) {
      console.error("Bulk assign KPI error:", err.message);
      return res.status(500).json({ error: "Failed to bulk assign KPI" });
    }
  },

  // ==========================================
  // 3. EMPLOYEE SELF-ASSESSMENT (Employee)
  // ==========================================

  async getMyKpi(req, res) {
    try {
      const { employee_id } = req.user;
      const { cycle_name } = req.query;

      const where = { employee_id };
      if (cycle_name) where.cycle_name = cycle_name;

      const assignment = await KpiAssignment.findOne({
        where,
        order: [["created_at", "DESC"]],
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      return res.json({
        success: true,
        assignment: assignment || null,
      });
    } catch (err) {
      console.error("Get my KPI error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve your KPI goals" });
    }
  },

  async saveSelfAssessment(req, res) {
    try {
      const { employee_id } = req.user;
      const { assignment_id, goals = [], is_final_submit = false } = req.body;

      const assignment = await KpiAssignment.findOne({
        where: { id: assignment_id, employee_id },
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "KPI Assignment not found" });
      }

      if (assignment.status === "HR_Approved") {
        return res.status(400).json({ error: "Cannot modify an already finalized & approved KPI cycle." });
      }

      let totalWeightedScore = 0;
      let totalWeightCounted = 0;

      // Update goal items
      for (const g of goals) {
        const goalItem = assignment.goals.find((item) => item.id === g.id);
        if (goalItem) {
          const selfRating = g.self_rating !== undefined ? parseFloat(g.self_rating) : goalItem.self_rating;
          const actualAchieved = g.actual_achieved !== undefined ? parseFloat(g.actual_achieved) : goalItem.actual_achieved;
          const selfComment = g.self_comment !== undefined ? g.self_comment : goalItem.self_comment;

          await goalItem.update({
            self_rating: selfRating,
            actual_achieved: actualAchieved,
            self_comment: selfComment,
          });

          if (selfRating && goalItem.weightage) {
            totalWeightedScore += selfRating * (parseFloat(goalItem.weightage) / 100);
            totalWeightCounted += parseFloat(goalItem.weightage);
          }
        }
      }

      const overallSelfScore = totalWeightCounted > 0
        ? parseFloat((totalWeightedScore * (100 / totalWeightCounted)).toFixed(2))
        : null;

      const updates = {
        self_overall_score: overallSelfScore,
      };

      if (is_final_submit) {
        updates.status = "Self_Submitted";
        updates.submitted_at = new Date();
      }

      await assignment.update(updates);

      const refreshed = await KpiAssignment.findByPk(assignment.id, {
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      return res.json({
        success: true,
        message: is_final_submit
          ? "Self-assessment submitted to your HOD/Manager successfully!"
          : "KPI progress saved successfully.",
        assignment: refreshed,
      });
    } catch (err) {
      console.error("Save self assessment error:", err.message);
      return res.status(500).json({ error: "Failed to save self assessment" });
    }
  },

  // ==========================================
  // 4. HOD / MANAGER REVIEW (HOD)
  // ==========================================

  async getTeamReviews(req, res) {
    try {
      const { role, employee_id } = req.user;
      const { cycle_name, department } = req.query;

      // Find user's department if HOD
      let deptFilter = department;
      if (role === "hod" && !deptFilter) {
        const u = await User.findOne({ where: { employee_id } });
        if (u && u.dept) {
          deptFilter = u.dept;
        } else {
          const emp = await Employee.findOne({ where: { employee_id } });
          if (emp && (emp.dept || emp.department)) {
            deptFilter = emp.dept || emp.department;
          }
        }
      }

      const where = {};
      if (cycle_name) where.cycle_name = cycle_name;
      if (deptFilter && deptFilter !== "All") where.department = deptFilter;

      const assignments = await KpiAssignment.findAll({
        where,
        order: [["updated_at", "DESC"]],
        include: [
          { model: KpiGoalItem, as: "goals" },
          { model: User, as: "employee", attributes: ["name", "email", "dept", "designation", "profile_photo"] },
        ],
      });

      return res.json({ success: true, assignments });
    } catch (err) {
      console.error("Get team reviews error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve team KPI reviews" });
    }
  },

  async evaluateTeamMember(req, res) {
    try {
      const { id } = req.params;
      const { goals = [], manager_recommendation, manager_remarks } = req.body;

      const assignment = await KpiAssignment.findByPk(id, {
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "KPI Assignment not found" });
      }

      let totalWeightedScore = 0;
      let totalWeightCounted = 0;

      for (const g of goals) {
        const goalItem = assignment.goals.find((item) => item.id === g.id);
        if (goalItem) {
          const mgrRating = g.manager_rating !== undefined ? parseFloat(g.manager_rating) : goalItem.manager_rating;
          const mgrComment = g.manager_comment !== undefined ? g.manager_comment : goalItem.manager_comment;

          await goalItem.update({
            manager_rating: mgrRating,
            manager_comment: mgrComment,
          });

          if (mgrRating && goalItem.weightage) {
            totalWeightedScore += mgrRating * (parseFloat(goalItem.weightage) / 100);
            totalWeightCounted += parseFloat(goalItem.weightage);
          }
        }
      }

      const overallMgrScore = totalWeightCounted > 0
        ? parseFloat((totalWeightedScore * (100 / totalWeightCounted)).toFixed(2))
        : null;

      await assignment.update({
        manager_overall_score: overallMgrScore,
        manager_recommendation: manager_recommendation || assignment.manager_recommendation,
        manager_remarks: manager_remarks || assignment.manager_remarks,
        status: "HOD_Reviewed",
        reviewed_at: new Date(),
      });

      const refreshed = await KpiAssignment.findByPk(assignment.id, {
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      return res.json({
        success: true,
        message: "Manager evaluation submitted for HR final calibration.",
        assignment: refreshed,
      });
    } catch (err) {
      console.error("Evaluate team member error:", err.message);
      return res.status(500).json({ error: "Failed to submit manager evaluation" });
    }
  },

  // ==========================================
  // 5. HR CALIBRATION & APPROVAL (HR Admin)
  // ==========================================

  async getAllCompanyKpis(req, res) {
    try {
      const { cycle_name, department, status } = req.query;
      const where = {};

      if (cycle_name) where.cycle_name = cycle_name;
      if (department && department !== "All") where.department = department;
      if (status && status !== "All") where.status = status;

      const assignments = await KpiAssignment.findAll({
        where,
        order: [["created_at", "DESC"]],
        include: [
          { model: KpiGoalItem, as: "goals" },
          { model: User, as: "employee", attributes: ["name", "email", "dept", "designation", "profile_photo"] },
        ],
      });

      return res.json({ success: true, assignments });
    } catch (err) {
      console.error("Get all company KPIs error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve company KPI cycles" });
    }
  },

  async calibrateAndApprove(req, res) {
    try {
      const { id } = req.params;
      const { final_calibrated_score, hr_remarks } = req.body;

      const assignment = await KpiAssignment.findByPk(id, {
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      if (!assignment) {
        return res.status(404).json({ error: "KPI Assignment not found" });
      }

      // Use calibrated score or fallback to manager overall score
      const finalScore = final_calibrated_score !== undefined
        ? parseFloat(final_calibrated_score)
        : (assignment.manager_overall_score || assignment.self_overall_score || 4.5);

      await assignment.update({
        final_calibrated_score: finalScore,
        hr_remarks: hr_remarks || assignment.hr_remarks,
        status: "HR_Approved",
        approved_at: new Date(),
      });

      // Synchronize final score into Employee and User profile rating
      const formattedScore = finalScore.toFixed(1);
      try {
        await Employee.update(
          { kpi: formattedScore },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              assignment.employee_id.toLowerCase().trim()
            ),
          }
        );

        await User.update(
          { kpi: formattedScore },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              assignment.employee_id.toLowerCase().trim()
            ),
          }
        );

        console.log(`[KPI Calibration] Synced KPI score ${formattedScore} to employee ${assignment.employee_id}`);
      } catch (syncErr) {
        console.warn("KPI profile sync warning:", syncErr.message);
      }

      const refreshed = await KpiAssignment.findByPk(assignment.id, {
        include: [{ model: KpiGoalItem, as: "goals" }],
      });

      return res.json({
        success: true,
        message: `KPI Cycle approved and calibrated at ${formattedScore}/5.0! Profile updated.`,
        assignment: refreshed,
      });
    } catch (err) {
      console.error("Calibrate and approve error:", err.message);
      return res.status(500).json({ error: "Failed to finalize and calibrate KPI cycle" });
    }
  },
};

module.exports = KpiController;
