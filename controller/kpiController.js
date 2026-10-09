const {
  KpiTemplate,
  KpiAssignment,
  KpiGoalItem,
  PerformanceReview,
  ReviewQuestionItem,
  Employee,
  User,
  sequelize,
} = require("../config/db");
const { Op } = require("sequelize");

const OFFICIAL_QUESTIONNAIRE_SET = [
  // ── 1. JOB KNOWLEDGE (Weightage : 2 -> 20% Total, 4.0% each) ──
  {
    question_key: "jk_1",
    title: "Level of professional knowledge in relation to job requirements",
    description: "Evaluates depth and proficiency of professional expertise required to execute core responsibilities.",
    category: "JOB KNOWLEDGE",
    weightage: 4.0,
  },
  {
    question_key: "jk_2",
    title: "Familiarity with job and related functions",
    description: "Understanding of internal processes, functional scope, tooling, and inter-departmental workflows.",
    category: "JOB KNOWLEDGE",
    weightage: 4.0,
  },
  {
    question_key: "jk_3",
    title: "Foresight & vision in anticipating work needs",
    description: "Ability to forecast upcoming requirements, risks, bottlenecks, and prepare contingency actions proactively.",
    category: "JOB KNOWLEDGE",
    weightage: 4.0,
  },
  {
    question_key: "jk_4",
    title: "Keeping abreast of the latest developments relating to one's functional area and the industry in general",
    description: "Continuous learning and application of evolving industry standards, tools, and best practices.",
    category: "JOB KNOWLEDGE",
    weightage: 4.0,
  },
  {
    question_key: "jk_5",
    title: "Ability to analyse problems in its various aspects",
    description: "Critical thinking, root cause analysis, and multi-dimensional problem solving capability.",
    category: "JOB KNOWLEDGE",
    weightage: 4.0,
  },

  // ── 2. JOB PERFORMANCE (Weightage : 2 -> 20% Total, 2.0% each) ──
  {
    question_key: "jp_1",
    title: "Urgency to get things done; productivity orientation",
    description: "Drive to deliver results quickly with high momentum and output orientation.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_2",
    title: "Attention to detail",
    description: "Meticulousness, thoroughness, and avoidance of careless errors in day-to-day deliverables.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_3",
    title: "Ability to prioritise work",
    description: "Effectively distinguishing high-impact priorities from urgent non-critical distractions.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_4",
    title: "Willingness to take responsibility and be accountable",
    description: "Owning outcomes, standing behind delivered work, and being accountable for successes and failures.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_5",
    title: "Acceptance of additional responsibility; responding to the need of the hour",
    description: "Stepping up willingly when emergencies arise or additional responsibilities are assigned.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_6",
    title: "Self starting ability",
    description: "Demonstrating drive and autonomy without needing continuous prompt or supervision.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_7",
    title: "Loyalty & commitment – Sincerity in performing work in the overall interest of the company",
    description: "Dedication to organizational mission and putting company interest ahead of personal convenience.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_8",
    title: "Customer orientation - internal and external",
    description: "Delivering exceptional value and prompt response to both internal stakeholders and external clients.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_9",
    title: "Cross-functional interest",
    description: "Active curiosity and collaboration across departments beyond one's immediate role.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },
  {
    question_key: "jp_10",
    title: "Value addition to management in areas not directly related to oneself",
    description: "Sharing strategic ideas, cost efficiencies, and constructive suggestions outside core scope.",
    category: "JOB PERFORMANCE",
    weightage: 2.0,
  },

  // ── 3. PERSONALITY (Weightage : 2 -> 20% Total, 2.0% each) ──
  {
    question_key: "pers_1",
    title: "Openness - being frank and candid in accepting and giving suggestions, ideas, opinions; accepting errors",
    description: "Transparent, honest communication and humbleness in acknowledging mistakes.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_2",
    title: "Empathy - to understand and appreciate other's feelings",
    description: "Demonstrating compassion, emotional intelligence, and respect for colleagues' perspectives.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_3",
    title: "Integrity - honesty and uprightness of character",
    description: "Uncompromising adherence to moral principles, truthfulness, and ethical conduct.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_4",
    title: "Flexibility- ability to change on the basis of feedback and to respond quickly to different people / situations",
    description: "Adaptable mindset, positive receipt of constructive critique, and agility in shifting gears.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_5",
    title: "Perseverance - to endure hardships and continue activity in the face of difficulty",
    description: "Grit and persistence through complex challenges, unexpected roadblocks, or difficult situations.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_6",
    title: "Creativity / Innovativeness - to produce new ideas deviating from traditional patterns of thinking",
    description: "Originality and fresh perspectives to overcome stagnancy or improve status quo.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_7",
    title: "Capacity to withstand stress",
    description: "Maintaining composure, clarity of thought, and productivity under tight deadlines and pressure.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_8",
    title: "Dependability – is consistent in habits – both punctual and regular in work and shows personal / organisational discipline",
    description: "Reliable attendance, punctuality, task completion reliability, and steadfast work ethic.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_9",
    title: "Evenness of temper",
    description: "Emotional stability, patience, calmness, and professionalism during disagreements or high tension.",
    category: "PERSONALITY",
    weightage: 2.0,
  },
  {
    question_key: "pers_10",
    title: "Adaptability – identifying oneself with the culture of the organisation in terms of values, beliefs and customs",
    description: "Alignment with corporate ethos, culture, camaraderie, and organizational harmony.",
    category: "PERSONALITY",
    weightage: 2.0,
  },

  // ── 4. LEADERSHIP SKILLS (Weightage : 4 -> 40% Total, 4.0% each) ──
  {
    question_key: "lead_1",
    title: "Ability to get work done through delegation",
    description: "Empowering teammates with clear ownership, appropriate authority, and accountability.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_2",
    title: "Ability to inspire and motivate subordinates and command respect from them",
    description: "Leading by example, rallying the team towards common vision, and building authentic trust.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_3",
    title: "Interpersonal skills – rapport with juniors, peers, seniors",
    description: "Fostering healthy working relationships across hierarchical levels with warmth and respect.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_4",
    title: "Ability to reprimand without incurring resentment",
    description: "Providing firm corrective feedback constructively without damaging morale or relationships.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_5",
    title: "Concern for welfare of subordinates",
    description: "Demonstrating genuine care for team members' well-being, work-life balance, and growth.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_6",
    title: "Guidance and encouragement provided to subordinates to develop their full potential and providing constructive feedback to them; grooming one’s own successor",
    description: "Mentoring, succession planning, identifying high potentials, and elevating teammates' skills.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_7",
    title: "Objectivity, impartiality and thoroughness in evaluating, performance, ability and potential of subordinates",
    description: "Fairness, meritocracy, data-backed assessment without favoritism or bias.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_8",
    title: "Communication – sells ideas in a persuasive and logical manner",
    description: "Articulating ideas convincingly, presenting structured rationale, and gaining stakeholder buy-in.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_9",
    title: "Ability to take hard decisions",
    description: "Courage to make tough calls decisively when necessary in the interest of the organisation.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
  {
    question_key: "lead_10",
    title: "Flexibility to go along with a decision after it is taken",
    description: "Disagree and commit: fully supporting and executing collective decisions once finalized.",
    category: "LEADERSHIP SKILLS",
    weightage: 4.0,
  },
];

const DEMO_QUESTIONNAIRE_SET = OFFICIAL_QUESTIONNAIRE_SET;

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

  // =========================================================================
  // 6. QUESTIONNAIRE REVIEWS (6-Months Probation & Annual Appraisal Lifecycle)
  // Hierarchy: Employee Self -> TL (if avail) -> Manager (if avail) -> HOD -> HR
  // =========================================================================

  async getDemoQuestions(req, res) {
    return res.json({ success: true, questions: DEMO_QUESTIONNAIRE_SET });
  },

  async initiateReview(req, res) {
    const t = await sequelize.transaction();
    try {
      const {
        employee_id,
        review_type = "probation", // "probation" | "appraisal"
        cycle_name,
        tl_id,
        tl_name,
        manager_id,
        manager_name,
        hod_id,
        hod_name,
        questions,
      } = req.body;

      if (!employee_id) {
        await t.rollback();
        return res.status(400).json({ error: "employee_id is required" });
      }

      // Look up employee
      const emp = await Employee.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
      });

      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
      });

      const department = emp?.dept || emp?.department || user?.dept || "General";
      const designation = emp?.designation || user?.designation || "Staff";
      const joiningDate = emp?.joining_date || user?.joining_date || null;

      // Auto-detect hierarchy if not provided
      // 1. Team Lead
      let detectedTlId = tl_id || null;
      let detectedTlName = tl_name || null;
      if (!detectedTlId && detectedTlName !== "None") {
        const tlUser = await User.findOne({
          where: {
            role: "teamlead",
            dept: department,
            is_active: true,
          },
        });
        if (tlUser && tlUser.employee_id !== employee_id) {
          detectedTlId = tlUser.employee_id;
          detectedTlName = tlUser.name;
        }
      }

      // 2. Manager
      let detectedMgrId = manager_id || null;
      let detectedMgrName = manager_name || null;
      if (!detectedMgrId && detectedMgrName !== "None") {
        const repMgrName = emp?.reporting_manager || user?.reporting_manager;
        if (repMgrName && repMgrName !== "N/A" && repMgrName !== "None") {
          const mgrUser = await User.findOne({
            where: {
              [Op.or]: [
                { name: { [Op.iLike]: `%${repMgrName.trim()}%` } },
                { employee_id: { [Op.iLike]: repMgrName.trim() } },
              ],
              is_active: true,
            },
          });
          if (mgrUser && mgrUser.employee_id !== employee_id) {
            detectedMgrId = mgrUser.employee_id;
            detectedMgrName = mgrUser.name;
          } else {
            detectedMgrName = repMgrName;
          }
        } else {
          const deptMgr = await User.findOne({
            where: {
              role: "manager",
              dept: department,
              is_active: true,
            },
          });
          if (deptMgr && deptMgr.employee_id !== employee_id) {
            detectedMgrId = deptMgr.employee_id;
            detectedMgrName = deptMgr.name;
          }
        }
      }

      // 3. HOD
      let detectedHodId = hod_id || null;
      let detectedHodName = hod_name || null;
      if (!detectedHodId) {
        const hodUser = await User.findOne({
          where: {
            role: "hod",
            dept: department,
            is_active: true,
          },
        });
        if (hodUser && hodUser.employee_id !== employee_id) {
          detectedHodId = hodUser.employee_id;
          detectedHodName = hodUser.name;
        }
      }

      // Compute probation dates if probation review
      let probStart = joiningDate;
      let probEnd = null;
      if (joiningDate) {
        const d = new Date(joiningDate);
        d.setMonth(d.getMonth() + 6);
        probEnd = d.toISOString().split("T")[0];
      }

      const defaultCycleName =
        cycle_name ||
        (review_type === "probation"
          ? `6-Month Probation Review (${new Date().getFullYear()})`
          : `Annual Appraisal January ${new Date().getFullYear()}`);

      // Create Review
      const review = await PerformanceReview.create(
        {
          employee_id,
          review_type,
          cycle_name: defaultCycleName,
          department,
          designation,
          probation_start_date: probStart,
          probation_end_date: probEnd,
          tl_id: detectedTlId,
          tl_name: detectedTlName,
          manager_id: detectedMgrId,
          manager_name: detectedMgrName,
          hod_id: detectedHodId,
          hod_name: detectedHodName,
          current_stage: "self",
          status: "Pending_Self",
          initiated_at: new Date(),
        },
        { transaction: t }
      );

      // Create question items (use demo set or provided custom set)
      const questionList =
        Array.isArray(questions) && questions.length > 0
          ? questions
          : DEMO_QUESTIONNAIRE_SET;

      const questionItems = questionList.map((q) => ({
        review_id: review.id,
        question_key: q.question_key || `q_${Math.random().toString(36).substring(2, 7)}`,
        title: q.title,
        description: q.description || "",
        category: q.category || "General",
        weightage: parseFloat(q.weightage) || 20,
      }));

      await ReviewQuestionItem.bulkCreate(questionItems, { transaction: t });
      await t.commit();

      const created = await PerformanceReview.findByPk(review.id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
      });

      return res.status(201).json({
        success: true,
        message: `${review_type === "probation" ? "6-Month Probation" : "Annual Appraisal"} questionnaire successfully sent to employee for self-rating.`,
        review: created,
      });
    } catch (err) {
      await t.rollback();
      console.error("Initiate review error:", err.message);
      return res.status(500).json({ error: "Failed to initiate performance review questionnaire" });
    }
  },

  async submitSelfRating(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { employee_id } = req.user;
      const { answers = [], self_remarks = "", is_final_submit = false } = req.body;

      const review = await PerformanceReview.findOne({
        where: { id },
        include: [{ model: ReviewQuestionItem, as: "questions" }],
        transaction: t,
      });

      if (!review) {
        await t.rollback();
        return res.status(404).json({ error: "Review not found" });
      }

      let totalWeighted = 0;
      let totalWeight = 0;

      for (const a of answers) {
        const qItem = review.questions.find((q) => q.id === a.id);
        if (qItem) {
          const selfRating = a.self_rating !== undefined ? parseFloat(a.self_rating) : qItem.self_rating;
          const selfComment = a.self_comment !== undefined ? a.self_comment : qItem.self_comment;

          await qItem.update(
            {
              self_rating: selfRating,
              self_comment: selfComment,
            },
            { transaction: t }
          );

          if (selfRating && qItem.weightage) {
            totalWeighted += selfRating * (parseFloat(qItem.weightage) / 100);
            totalWeight += parseFloat(qItem.weightage);
          }
        }
      }

      const selfScore = totalWeight > 0 ? parseFloat((totalWeighted * (100 / totalWeight)).toFixed(2)) : null;

      const updates = {
        self_overall_score: selfScore,
        self_remarks: self_remarks || review.self_remarks,
      };

      if (is_final_submit) {
        updates.self_submitted_at = new Date();

        // Determine next stage in order: TL -> Manager -> HOD
        if (review.tl_id || (review.tl_name && review.tl_name !== "N/A" && review.tl_name !== "None")) {
          updates.current_stage = "tl";
          updates.status = "Pending_TL";
        } else if (review.manager_id || (review.manager_name && review.manager_name !== "N/A" && review.manager_name !== "None")) {
          updates.current_stage = "manager";
          updates.status = "Pending_Manager";
        } else {
          updates.current_stage = "hod";
          updates.status = "Pending_HOD";
        }
      }

      await review.update(updates, { transaction: t });
      await t.commit();

      const refreshed = await PerformanceReview.findByPk(review.id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
      });

      return res.json({
        success: true,
        message: is_final_submit
          ? `Self-rating submitted! Advanced to ${refreshed.current_stage.toUpperCase()} for evaluation.`
          : "Self-rating draft saved successfully.",
        review: refreshed,
      });
    } catch (err) {
      await t.rollback();
      console.error("Submit self rating error:", err.message);
      return res.status(500).json({ error: "Failed to submit self assessment" });
    }
  },

  async submitTlReview(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { answers = [], tl_recommendation = "", tl_remarks = "" } = req.body;

      const review = await PerformanceReview.findByPk(id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
        transaction: t,
      });

      if (!review) {
        await t.rollback();
        return res.status(404).json({ error: "Review not found" });
      }

      let totalWeighted = 0;
      let totalWeight = 0;

      for (const a of answers) {
        const qItem = review.questions.find((q) => q.id === a.id);
        if (qItem) {
          const rating = a.tl_rating !== undefined ? parseFloat(a.tl_rating) : qItem.tl_rating;
          const comment = a.tl_comment !== undefined ? a.tl_comment : qItem.tl_comment;

          await qItem.update({ tl_rating: rating, tl_comment: comment }, { transaction: t });

          if (rating && qItem.weightage) {
            totalWeighted += rating * (parseFloat(qItem.weightage) / 100);
            totalWeight += parseFloat(qItem.weightage);
          }
        }
      }

      const tlScore = totalWeight > 0 ? parseFloat((totalWeighted * (100 / totalWeight)).toFixed(2)) : null;

      // Next stage: Manager (if available) -> HOD
      let nextStage = "hod";
      let nextStatus = "Pending_HOD";

      if (review.manager_id || (review.manager_name && review.manager_name !== "N/A" && review.manager_name !== "None")) {
        nextStage = "manager";
        nextStatus = "Pending_Manager";
      }

      await review.update(
        {
          tl_overall_score: tlScore,
          tl_recommendation: tl_recommendation || review.tl_recommendation,
          tl_remarks: tl_remarks || review.tl_remarks,
          tl_reviewed_at: new Date(),
          current_stage: nextStage,
          status: nextStatus,
        },
        { transaction: t }
      );

      await t.commit();

      const refreshed = await PerformanceReview.findByPk(review.id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
      });

      return res.json({
        success: true,
        message: `TL review submitted! Advanced to ${nextStage.toUpperCase()} for evaluation.`,
        review: refreshed,
      });
    } catch (err) {
      await t.rollback();
      console.error("Submit TL review error:", err.message);
      return res.status(500).json({ error: "Failed to submit TL review" });
    }
  },

  async submitManagerReview(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { answers = [], manager_recommendation = "", manager_remarks = "" } = req.body;

      const review = await PerformanceReview.findByPk(id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
        transaction: t,
      });

      if (!review) {
        await t.rollback();
        return res.status(404).json({ error: "Review not found" });
      }

      let totalWeighted = 0;
      let totalWeight = 0;

      for (const a of answers) {
        const qItem = review.questions.find((q) => q.id === a.id);
        if (qItem) {
          const rating = a.manager_rating !== undefined ? parseFloat(a.manager_rating) : qItem.manager_rating;
          const comment = a.manager_comment !== undefined ? a.manager_comment : qItem.manager_comment;

          await qItem.update({ manager_rating: rating, manager_comment: comment }, { transaction: t });

          if (rating && qItem.weightage) {
            totalWeighted += rating * (parseFloat(qItem.weightage) / 100);
            totalWeight += parseFloat(qItem.weightage);
          }
        }
      }

      const mgrScore = totalWeight > 0 ? parseFloat((totalWeighted * (100 / totalWeight)).toFixed(2)) : null;

      await review.update(
        {
          manager_overall_score: mgrScore,
          manager_recommendation: manager_recommendation || review.manager_recommendation,
          manager_remarks: manager_remarks || review.manager_remarks,
          manager_reviewed_at: new Date(),
          current_stage: "hod",
          status: "Pending_HOD",
        },
        { transaction: t }
      );

      await t.commit();

      const refreshed = await PerformanceReview.findByPk(review.id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
      });

      return res.json({
        success: true,
        message: "Manager review submitted! Advanced to HOD for final departmental review.",
        review: refreshed,
      });
    } catch (err) {
      await t.rollback();
      console.error("Submit Manager review error:", err.message);
      return res.status(500).json({ error: "Failed to submit Manager review" });
    }
  },

  async submitHodApproval(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const {
        answers = [],
        hod_decision, // "confirm_permanent" | "extend_probation_3m" | "recommend_promotion" | "recommend_increment" | "needs_pip"
        hod_remarks = "",
      } = req.body;

      const review = await PerformanceReview.findByPk(id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
        transaction: t,
      });

      if (!review) {
        await t.rollback();
        return res.status(404).json({ error: "Review not found" });
      }

      let totalWeighted = 0;
      let totalWeight = 0;

      for (const a of answers) {
        const qItem = review.questions.find((q) => q.id === a.id);
        if (qItem) {
          const rating = a.hod_rating !== undefined ? parseFloat(a.hod_rating) : qItem.hod_rating;
          const comment = a.hod_comment !== undefined ? a.hod_comment : qItem.hod_comment;

          await qItem.update({ hod_rating: rating, hod_comment: comment }, { transaction: t });

          if (rating && qItem.weightage) {
            totalWeighted += rating * (parseFloat(qItem.weightage) / 100);
            totalWeight += parseFloat(qItem.weightage);
          }
        }
      }

      const hodScore = totalWeight > 0 ? parseFloat((totalWeighted * (100 / totalWeight)).toFixed(2)) : null;

      await review.update(
        {
          hod_overall_score: hodScore,
          hod_decision: hod_decision || review.hod_decision,
          hod_remarks: hod_remarks || review.hod_remarks,
          hod_approved_at: new Date(),
          current_stage: "hr",
          status: "Pending_HR",
        },
        { transaction: t }
      );

      await t.commit();

      const refreshed = await PerformanceReview.findByPk(review.id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
      });

      return res.json({
        success: true,
        message: `HOD review and recommendation submitted! Questionnaire sent back to HR for final confirmation.`,
        review: refreshed,
      });
    } catch (err) {
      await t.rollback();
      console.error("Submit HOD approval error:", err.message);
      return res.status(500).json({ error: "Failed to submit HOD approval" });
    }
  },

  async submitHrDecision(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const {
        hr_decision, // "confirm_permanent" | "extend_probation_3m" | "reject" | "approve_appraisal"
        hr_remarks = "",
        final_score,
      } = req.body;

      const review = await PerformanceReview.findByPk(id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
        transaction: t,
      });

      if (!review) {
        await t.rollback();
        return res.status(404).json({ error: "Review not found" });
      }

      const score = final_score !== undefined
        ? parseFloat(final_score)
        : (review.hod_overall_score || review.manager_overall_score || review.self_overall_score || 4.5);

      let finalStatus = "Confirmed_Permanent";
      if (hr_decision === "extend_probation_3m") {
        finalStatus = "Probation_Extended_3M";
      } else if (hr_decision === "reject") {
        finalStatus = "Rejected";
      } else if (hr_decision === "approve_appraisal") {
        finalStatus = "HR_Approved_Appraisal";
      }

      await review.update(
        {
          final_score: score,
          hr_decision,
          hr_remarks: hr_remarks || review.hr_remarks,
          current_stage: "completed",
          status: finalStatus,
          hr_completed_at: new Date(),
        },
        { transaction: t }
      );

      // Execute Employment Actions
      const formattedScore = score.toFixed(1);

      if (hr_decision === "confirm_permanent") {
        // Update employee and user status to Permanent!
        await Employee.update(
          {
            status: "Permanent",
            kpi: formattedScore,
          },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              review.employee_id.toLowerCase().trim()
            ),
            transaction: t,
          }
        );

        await User.update(
          {
            status: "Permanent",
            kpi: formattedScore,
          },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              review.employee_id.toLowerCase().trim()
            ),
            transaction: t,
          }
        );
      } else if (hr_decision === "extend_probation_3m") {
        // Extend probation by 3 months
        let newEndDate = null;
        if (review.probation_end_date) {
          const d = new Date(review.probation_end_date);
          d.setMonth(d.getMonth() + 3);
          newEndDate = d.toISOString().split("T")[0];
        } else {
          const d = new Date();
          d.setMonth(d.getMonth() + 3);
          newEndDate = d.toISOString().split("T")[0];
        }

        await review.update({ probation_end_date: newEndDate }, { transaction: t });

        await Employee.update(
          {
            status: "Probation (Extended)",
            kpi: formattedScore,
          },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              review.employee_id.toLowerCase().trim()
            ),
            transaction: t,
          }
        );
      } else if (hr_decision === "approve_appraisal") {
        await Employee.update(
          { kpi: formattedScore },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              review.employee_id.toLowerCase().trim()
            ),
            transaction: t,
          }
        );
        await User.update(
          { kpi: formattedScore },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              review.employee_id.toLowerCase().trim()
            ),
            transaction: t,
          }
        );
      } else if (hr_decision === "reject") {
        await Employee.update(
          { status: "Probation Rejected" },
          {
            where: sequelize.where(
              sequelize.fn("LOWER", sequelize.col("employee_id")),
              review.employee_id.toLowerCase().trim()
            ),
            transaction: t,
          }
        );
      }

      await t.commit();

      const refreshed = await PerformanceReview.findByPk(review.id, {
        include: [{ model: ReviewQuestionItem, as: "questions" }],
      });

      return res.json({
        success: true,
        message: `HR final decision recorded: ${finalStatus}. Employee record updated successfully!`,
        review: refreshed,
      });
    } catch (err) {
      await t.rollback();
      console.error("Submit HR decision error:", err.message);
      return res.status(500).json({ error: "Failed to submit HR decision" });
    }
  },

  async getMyReviews(req, res) {
    try {
      const { employee_id } = req.user;
      const reviews = await PerformanceReview.findAll({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("employee_id")),
          employee_id.toLowerCase().trim()
        ),
        order: [["created_at", "DESC"]],
        include: [{ model: ReviewQuestionItem, as: "questions" }],
      });
      return res.json({ success: true, reviews });
    } catch (err) {
      console.error("Get my reviews error:", err.message);
      return res.status(500).json({ error: "Failed to fetch employee reviews" });
    }
  },

  async getPendingReviews(req, res) {
    try {
      const { role, employee_id } = req.user;
      const user = await User.findOne({ where: { employee_id } });
      const dept = user?.dept || "General";

      let where = {};

      if (["hr", "admin"].includes(role)) {
        // HR sees all pending
      } else if (role === "hod") {
        where = {
          [Op.or]: [
            { current_stage: "hod", department: dept },
            { hod_id: employee_id, current_stage: "hod" },
          ],
        };
      } else if (role === "manager") {
        where = {
          [Op.or]: [
            { current_stage: "manager", manager_id: employee_id },
            { current_stage: "manager", department: dept },
          ],
        };
      } else if (role === "teamlead") {
        where = {
          [Op.or]: [
            { current_stage: "tl", tl_id: employee_id },
            { current_stage: "tl", department: dept },
          ],
        };
      } else {
        where = { employee_id, current_stage: "self" };
      }

      const reviews = await PerformanceReview.findAll({
        where,
        order: [["updated_at", "DESC"]],
        include: [
          { model: ReviewQuestionItem, as: "questions" },
          { model: User, as: "employee", attributes: ["name", "email", "dept", "designation", "profile_photo"] },
        ],
      });

      return res.json({ success: true, reviews });
    } catch (err) {
      console.error("Get pending reviews error:", err.message);
      return res.status(500).json({ error: "Failed to fetch pending reviews" });
    }
  },

  async getAllReviews(req, res) {
    try {
      const { review_type, department, status, stage } = req.query;
      const where = {};
      if (review_type && review_type !== "All") where.review_type = review_type;
      if (department && department !== "All") where.department = department;
      if (status && status !== "All") where.status = status;
      if (stage && stage !== "All") where.current_stage = stage;

      const reviews = await PerformanceReview.findAll({
        where,
        order: [["created_at", "DESC"]],
        include: [
          { model: ReviewQuestionItem, as: "questions" },
          { model: User, as: "employee", attributes: ["name", "email", "dept", "designation", "profile_photo"] },
          { model: Employee, as: "employeeProfile", attributes: ["joining_date", "current_salary", "status", "reporting_manager"] },
        ],
      });

      return res.json({ success: true, reviews });
    } catch (err) {
      console.error("Get all reviews error:", err.message);
      return res.status(500).json({ error: "Failed to fetch reviews" });
    }
  },

  async getReviewById(req, res) {
    try {
      const { id } = req.params;
      const review = await PerformanceReview.findByPk(id, {
        include: [
          { model: ReviewQuestionItem, as: "questions" },
          { model: User, as: "employee", attributes: ["name", "email", "dept", "designation", "profile_photo"] },
          { model: Employee, as: "employeeProfile" },
        ],
      });
      if (!review) return res.status(404).json({ error: "Review not found" });
      return res.json({ success: true, review });
    } catch (err) {
      console.error("Get review by ID error:", err.message);
      return res.status(500).json({ error: "Failed to retrieve review" });
    }
  },

  async deleteReview(req, res) {
    try {
      const { id } = req.params;
      const review = await PerformanceReview.findByPk(id);
      if (!review) return res.status(404).json({ error: "Review not found" });
      await review.destroy();
      return res.json({ success: true, message: "Review deleted successfully" });
    } catch (err) {
      console.error("Delete review error:", err.message);
      return res.status(500).json({ error: "Failed to delete review" });
    }
  },

  async getHierarchyOptions(req, res) {
    try {
      const { department } = req.query;
      const where = { is_active: true };
      if (department && department !== "All") {
        where.dept = department;
      }

      const users = await User.findAll({
        where,
        attributes: [
          "id",
          "employee_id",
          "name",
          "role",
          "dept",
          "designation",
          "employment_type",
          "status",
          "reporting_manager",
        ],
        order: [["name", "ASC"]],
      });

      const teamLeads = users.filter((u) => u.role === "teamlead" || u.designation?.toLowerCase().includes("lead"));
      const managers = users.filter((u) => u.role === "manager" || u.designation?.toLowerCase().includes("manager"));
      const hods = users.filter((u) => u.role === "hod" || u.designation?.toLowerCase().includes("hod") || u.designation?.toLowerCase().includes("head"));

      return res.json({
        success: true,
        teamLeads,
        managers,
        hods,
        allUsers: users,
      });
    } catch (err) {
      console.error("Get hierarchy options error:", err.message);
      return res.status(500).json({ error: "Failed to fetch hierarchy options" });
    }
  },

  async getEligibleEmployees(req, res) {
    try {
      const users = await User.findAll({
        where: { is_active: true },
        attributes: [
          "id",
          "employee_id",
          "name",
          "role",
          "dept",
          "designation",
          "status",
          "employment_type",
          "joining_date",
          "reporting_manager",
          "profile_photo",
        ],
        order: [
          ["employment_type", "ASC"], // Probation first
          ["name", "ASC"],
        ],
      });

      const employees = users.map((u) => ({
        id: u.id,
        employee_id: u.employee_id,
        employee_code: u.employee_id,
        name: u.name,
        role: u.role,
        dept: u.dept,
        department: u.dept,
        designation: u.designation,
        status: u.status || "Active",
        employment_type: u.employment_type || "Permanent",
        joining_date: u.joining_date,
        reporting_manager: u.reporting_manager,
        profile_photo: u.profile_photo,
      }));

      return res.json({
        success: true,
        employees,
      });
    } catch (err) {
      console.error("Get eligible employees error:", err.message);
      return res.status(500).json({ error: "Failed to fetch eligible employees" });
    }
  },
};

module.exports = KpiController;
