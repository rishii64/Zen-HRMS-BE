const {
  FeedbackCycle360,
  FeedbackAssignment360,
  FeedbackSummary360,
  Employee,
  User,
  sequelize
} = require("../config/db");
const { Op } = require("sequelize");
const { sendRealtimeNotification } = require("../socket");

const DEFAULT_COMPETENCIES = [
  {
    key: "functional",
    name: "Functional & Technical Mastery",
    description: "Demonstrates deep domain knowledge, deliverable precision, and technical problem solving.",
    weight: 20
  },
  {
    key: "collaboration",
    name: "Teamwork & Cross-Functional Synergy",
    description: "Collaborates proactively with peers and other departments, shares knowledge, and unblocks colleagues.",
    weight: 20
  },
  {
    key: "communication",
    name: "Communication & Stakeholder Management",
    description: "Communicates transparently, listens actively, and manages internal and external stakeholder expectations.",
    weight: 20
  },
  {
    key: "leadership",
    name: "Leadership, Mentorship & Empathy",
    description: "Inspires others, gives constructive feedback, supports team growth, and acts with emotional intelligence.",
    weight: 20
  },
  {
    key: "ownership",
    name: "Ownership, Accountability & Agility",
    description: "Takes end-to-end responsibility, adapts swiftly to change, and delivers reliably under pressure.",
    weight: 20
  }
];

const Feedback360Controller = {
  // GET /api/auth/feedback360/cycles
  // Returns all cycles with rater statistics
  async getCycles(req, res) {
    try {
      const cycles = await FeedbackCycle360.findAll({
        order: [["created_at", "DESC"]],
      });

      const enriched = await Promise.all(
        cycles.map(async (c) => {
          const plain = c.toJSON();
          const totalAssignments = await FeedbackAssignment360.count({ where: { cycle_id: c.id } });
          const submittedAssignments = await FeedbackAssignment360.count({
            where: { cycle_id: c.id, status: "Submitted" },
          });
          const evaluateesCount = await FeedbackSummary360.count({ where: { cycle_id: c.id } });

          const completionRate = totalAssignments > 0
            ? Math.round((submittedAssignments / totalAssignments) * 100)
            : 0;

          return {
            ...plain,
            totalAssignments,
            submittedAssignments,
            evaluateesCount,
            completionRate,
          };
        })
      );

      return res.json({ success: true, data: enriched });
    } catch (err) {
      console.error("getCycles error:", err);
      return res.status(500).json({ error: "Failed to load 360 feedback cycles" });
    }
  },

  // POST /api/auth/feedback360/cycles
  // Admin creates a new 360 cycle
  async createCycle(req, res) {
    try {
      const {
        cycle_code,
        title,
        description,
        start_date,
        due_date,
        allow_anonymous_peer = true,
        allow_anonymous_subordinate = true,
        allow_anonymous_stakeholder = false,
        min_raters_required = 3,
        competencies_config,
      } = req.body;

      if (!title || !due_date) {
        return res.status(400).json({ error: "Cycle title and due date are required" });
      }

      const code = cycle_code || `360-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const creatorName = req.user?.name || req.user?.employee_id || "HR Operations";

      const created = await FeedbackCycle360.create({
        cycle_code: code,
        title: title.trim(),
        description: description || "",
        start_date: start_date || new Date().toISOString().slice(0, 10),
        due_date,
        status: "Active",
        allow_anonymous_peer: Boolean(allow_anonymous_peer),
        allow_anonymous_subordinate: Boolean(allow_anonymous_subordinate),
        allow_anonymous_stakeholder: Boolean(allow_anonymous_stakeholder),
        min_raters_required: Number(min_raters_required) || 3,
        competencies_config: competencies_config
          ? (typeof competencies_config === "string" ? competencies_config : JSON.stringify(competencies_config))
          : JSON.stringify(DEFAULT_COMPETENCIES),
        created_by: creatorName,
      });

      return res.json({
        success: true,
        message: "360-Degree Feedback Cycle launched successfully",
        data: created,
      });
    } catch (err) {
      console.error("createCycle error:", err);
      return res.status(500).json({ error: "Failed to launch 360 feedback cycle" });
    }
  },

  // GET /api/auth/feedback360/employees
  // Returns employee list for rater nomination
  async getEmployeesForNomination(req, res) {
    try {
      const employees = await Employee.findAll({
        attributes: ["id", "employee_id", "first_name", "last_name", "dept", "designation", "work_location"],
        order: [["first_name", "ASC"]],
        raw: true,
      });

      const formatted = employees.map(e => ({
        employee_id: e.employee_id,
        name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.employee_id,
        dept: e.dept || "General",
        designation: e.designation || "Staff",
        location: e.work_location || "Kolkata",
      }));

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error("getEmployeesForNomination error:", err);
      return res.status(500).json({ error: "Failed to load employees for nomination" });
    }
  },

  // POST /api/auth/feedback360/nominate
  // Assigns raters (Self, Peer, Subordinate, Stakeholder, Manager) for an evaluatee
  async nominateRaters(req, res) {
    try {
      const { cycle_id, evaluatee_id, raters } = req.body;

      if (!cycle_id || !evaluatee_id || !Array.isArray(raters) || raters.length === 0) {
        return res.status(400).json({ error: "Cycle, evaluatee, and at least one rater are required" });
      }

      const cycle = await FeedbackCycle360.findByPk(cycle_id);
      if (!cycle) {
        return res.status(404).json({ error: "Cycle not found" });
      }

      const evalEmp = await Employee.findOne({ where: { employee_id: evaluatee_id } });
      const evalName = evalEmp ? `${evalEmp.first_name || ""} ${evalEmp.last_name || ""}`.trim() : evaluatee_id;
      const evalDept = evalEmp ? evalEmp.dept : "General";
      const evalDesig = evalEmp ? evalEmp.designation : "Staff";

      let createdCount = 0;

      for (const r of raters) {
        const raterEmpId = String(r.rater_id || "").trim();
        if (!raterEmpId) continue;

        const raterEmp = await Employee.findOne({ where: { employee_id: raterEmpId } });
        const raterName = raterEmp ? `${raterEmp.first_name || ""} ${raterEmp.last_name || ""}`.trim() : raterEmpId;
        const raterDept = raterEmp ? raterEmp.dept : "General";
        const raterDesig = raterEmp ? raterEmp.designation : "Staff";

        const relationship = r.rater_relationship || (raterEmpId === evaluatee_id ? "Self" : "Peer");

        let isAnon = false;
        if (relationship === "Peer" && cycle.allow_anonymous_peer) isAnon = true;
        if (relationship === "Subordinate" && cycle.allow_anonymous_subordinate) isAnon = true;
        if (relationship === "Stakeholder" && cycle.allow_anonymous_stakeholder) isAnon = true;
        if (r.is_anonymous !== undefined) isAnon = Boolean(r.is_anonymous);

        const existing = await FeedbackAssignment360.findOne({
          where: {
            cycle_id: cycle.id,
            evaluatee_id,
            rater_id: raterEmpId,
          },
        });

        if (!existing) {
          await FeedbackAssignment360.create({
            cycle_id: cycle.id,
            evaluatee_id,
            evaluatee_name: evalName,
            evaluatee_dept: evalDept,
            evaluatee_designation: evalDesig,
            rater_id: raterEmpId,
            rater_name: raterName,
            rater_dept: raterDept,
            rater_designation: raterDesig,
            rater_relationship: relationship,
            is_anonymous: isAnon,
            status: "Pending",
          });

          createdCount++;

          // Send real-time notification to rater (unless self)
          if (raterEmpId !== evaluatee_id) {
            sendRealtimeNotification({
              recipient_id: raterEmpId,
              title: "360° Feedback Request",
              message: `You have been nominated to provide 360-degree feedback for ${evalName} (${relationship} perspective).`,
              type: "approval",
              category: "Approvals",
              priority: "high",
              link: "/feedback360",
              source_module: "feedback360",
              created_by: "360 Feedback System",
            });
          }
        }
      }

      // Ensure summary record exists and update counts
      await Feedback360Controller._recalculateSummary(cycle.id, evaluatee_id);

      return res.json({
        success: true,
        message: `Successfully assigned ${createdCount} rater(s) for ${evalName}`,
      });
    } catch (err) {
      console.error("nominateRaters error:", err);
      return res.status(500).json({ error: "Failed to assign raters" });
    }
  },

  // GET /api/auth/feedback360/my-reviews
  // Returns pending and completed feedback assignments for logged-in user
  async getMyReviews(req, res) {
    try {
      const empId = req.user?.employee_id || req.user?.id;
      if (!empId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const reviews = await FeedbackAssignment360.findAll({
        where: { rater_id: empId },
        include: [{ model: FeedbackCycle360, as: "cycle", attributes: ["id", "title", "due_date", "status"] }],
        order: [["created_at", "DESC"]],
      });

      const pending = reviews.filter((r) => r.status === "Pending" || r.status === "Draft");
      const submitted = reviews.filter((r) => r.status === "Submitted");

      return res.json({
        success: true,
        data: {
          pending,
          submitted,
          totalAssigned: reviews.length,
          totalSubmitted: submitted.length,
        },
      });
    } catch (err) {
      console.error("getMyReviews error:", err);
      return res.status(500).json({ error: "Failed to load assigned reviews" });
    }
  },

  // POST /api/auth/feedback360/submit-review
  // Submits a 360 multi-rater review
  async submitReview(req, res) {
    try {
      const {
        assignment_id,
        competency_scores,
        strengths_feedback,
        growth_areas_feedback,
        general_comments,
      } = req.body;

      const empId = req.user?.employee_id || req.user?.id;

      const assignment = await FeedbackAssignment360.findByPk(assignment_id);
      if (!assignment) {
        return res.status(404).json({ error: "Feedback assignment not found" });
      }

      // Verify user owns this assignment
      if (assignment.rater_id !== empId && req.user?.role !== "admin") {
        return res.status(403).json({ error: "You are not authorized to submit this review" });
      }

      // Calculate overall score from competency map
      let scoreSum = 0;
      let scoreCount = 0;
      if (competency_scores && typeof competency_scores === "object") {
        Object.values(competency_scores).forEach((val) => {
          const num = parseFloat(val);
          if (!isNaN(num) && num > 0) {
            scoreSum += num;
            scoreCount++;
          }
        });
      }

      const overall = scoreCount > 0 ? parseFloat((scoreSum / scoreCount).toFixed(2)) : 4.0;

      await assignment.update({
        competency_scores: JSON.stringify(competency_scores || {}),
        overall_score: overall,
        strengths_feedback: strengths_feedback || "",
        growth_areas_feedback: growth_areas_feedback || "",
        general_comments: general_comments || "",
        status: "Submitted",
        submitted_at: new Date(),
      });

      // Recalculate synthesize summary report
      await Feedback360Controller._recalculateSummary(assignment.cycle_id, assignment.evaluatee_id);

      return res.json({
        success: true,
        message: "Your 360-degree feedback has been submitted successfully!",
        data: assignment,
      });
    } catch (err) {
      console.error("submitReview error:", err);
      return res.status(500).json({ error: "Failed to submit 360 review" });
    }
  },

  // GET /api/auth/feedback360/my-summary
  // Returns synthesized 360 report for the evaluatee
  async getMySummary(req, res) {
    try {
      const empId = req.user?.employee_id || req.user?.id;
      const { cycle_id } = req.query;

      let whereClause = { evaluatee_id: empId };
      if (cycle_id) {
        whereClause.cycle_id = cycle_id;
      }

      const summary = await FeedbackSummary360.findOne({
        where: whereClause,
        include: [{ model: FeedbackCycle360, as: "cycle" }],
        order: [["created_at", "DESC"]],
      });

      if (!summary) {
        return res.json({
          success: true,
          data: null,
          message: "No 360 feedback report available yet",
        });
      }

      return res.json({ success: true, data: summary });
    } catch (err) {
      console.error("getMySummary error:", err);
      return res.status(500).json({ error: "Failed to load your 360 summary report" });
    }
  },

  // GET /api/auth/feedback360/cycle/:id/summaries
  // Admin view of all evaluatees and synthesis progress in a cycle
  async getCycleSummaries(req, res) {
    try {
      const { id } = req.params;

      const summaries = await FeedbackSummary360.findAll({
        where: { cycle_id: id },
        order: [["composite_score", "DESC"]],
      });

      const assignments = await FeedbackAssignment360.findAll({
        where: { cycle_id: id },
        order: [["created_at", "ASC"]],
      });

      return res.json({
        success: true,
        data: {
          summaries,
          assignments,
        },
      });
    } catch (err) {
      console.error("getCycleSummaries error:", err);
      return res.status(500).json({ error: "Failed to load cycle synthesis records" });
    }
  },

  // POST /api/auth/feedback360/publish
  // Admin publishes report to employee
  async publishSummary(req, res) {
    try {
      const { summary_id, hr_summary_notes } = req.body;

      const summary = await FeedbackSummary360.findByPk(summary_id);
      if (!summary) {
        return res.status(404).json({ error: "Summary record not found" });
      }

      await summary.update({
        status: "Published_To_Employee",
        published_at: new Date(),
        hr_summary_notes: hr_summary_notes || summary.hr_summary_notes,
      });

      // Send real-time notification to employee
      sendRealtimeNotification({
        recipient_id: summary.evaluatee_id,
        title: "360° Feedback Report Published",
        message: `Your comprehensive multi-rater 360° feedback report has been reviewed by HR and is now ready to view.`,
        type: "promotion",
        category: "Announcements",
        priority: "normal",
        link: "/feedback360",
        source_module: "feedback360",
        created_by: "HR Management",
      });

      return res.json({
        success: true,
        message: "360 summary published to employee",
        data: summary,
      });
    } catch (err) {
      console.error("publishSummary error:", err);
      return res.status(500).json({ error: "Failed to publish report" });
    }
  },

  // POST /api/auth/feedback360/remind
  // Sends notification reminder to pending raters
  async sendReminders(req, res) {
    try {
      const { cycle_id, evaluatee_id } = req.body;

      const where = {
        cycle_id,
        status: { [Op.in]: ["Pending", "Draft"] },
      };
      if (evaluatee_id) {
        where.evaluatee_id = evaluatee_id;
      }

      const pending = await FeedbackAssignment360.findAll({ where });

      let remindedCount = 0;
      for (const p of pending) {
        await sendRealtimeNotification({
          recipient_id: p.rater_id,
          title: "REMINDER: 360° Feedback Due",
          message: `Please complete your pending 360° review for ${p.evaluatee_name} (${p.rater_relationship} perspective).`,
          type: "announcement",
          category: "Announcements",
          priority: "high",
          link: "/feedback360",
          source_module: "feedback360",
          created_by: "360 Feedback System",
        });
        remindedCount++;
      }

      return res.json({
        success: true,
        message: `Reminders sent to ${remindedCount} pending reviewer(s)`,
        count: remindedCount,
      });
    } catch (err) {
      console.error("sendReminders error:", err);
      return res.status(500).json({ error: "Failed to send reminders" });
    }
  },

  // Internal helper to synthesize scores and radar coordinates
  async _recalculateSummary(cycle_id, evaluatee_id) {
    try {
      const assignments = await FeedbackAssignment360.findAll({
        where: { cycle_id, evaluatee_id },
      });

      const totalAssigned = assignments.length;
      const submitted = assignments.filter((a) => a.status === "Submitted");
      const totalSubmitted = submitted.length;

      // Calculate averages by relationship
      const calcAvg = (rel) => {
        const matches = submitted.filter((a) => a.rater_relationship.toLowerCase() === rel.toLowerCase());
        if (matches.length === 0) return null;
        const sum = matches.reduce((acc, cur) => acc + (parseFloat(cur.overall_score) || 0), 0);
        return parseFloat((sum / matches.length).toFixed(2));
      };

      const selfScore = calcAvg("Self");
      const managerScore = calcAvg("Manager");
      const peerScore = calcAvg("Peer");
      const subScore = calcAvg("Subordinate");
      const stakeScore = calcAvg("Stakeholder");

      // Calculate composite score (weighted: manager 30%, peer 25%, subordinate 20%, stakeholder 15%, self 10%)
      const weights = [];
      if (managerScore !== null) weights.push({ score: managerScore, w: 0.30 });
      if (peerScore !== null) weights.push({ score: peerScore, w: 0.25 });
      if (subScore !== null) weights.push({ score: subScore, w: 0.20 });
      if (stakeScore !== null) weights.push({ score: stakeScore, w: 0.15 });
      if (selfScore !== null) weights.push({ score: selfScore, w: 0.10 });

      let composite = null;
      if (weights.length > 0) {
        const totalW = weights.reduce((acc, c) => acc + c.w, 0);
        const weightedSum = weights.reduce((acc, c) => acc + c.score * c.w, 0);
        composite = parseFloat((weightedSum / totalW).toFixed(2));
      }

      // Calculate competency radar data breakdown
      // For each competency key, compute average for Self, Manager, Peers, Subordinates, Stakeholders
      const compKeys = ["functional", "collaboration", "communication", "leadership", "ownership"];
      const radarBreakdown = compKeys.map((key) => {
        const getRelCompAvg = (rel) => {
          const list = submitted.filter((a) => a.rater_relationship.toLowerCase() === rel.toLowerCase());
          if (list.length === 0) return 0;
          let sum = 0, count = 0;
          list.forEach((a) => {
            try {
              const parsed = JSON.parse(a.competency_scores || "{}");
              if (parsed[key]) {
                sum += parseFloat(parsed[key]);
                count++;
              }
            } catch (_) {}
          });
          return count > 0 ? parseFloat((sum / count).toFixed(2)) : 0;
        };

        const compMeta = DEFAULT_COMPETENCIES.find((c) => c.key === key);
        return {
          competency: compMeta ? compMeta.name : key,
          key,
          Self: getRelCompAvg("Self"),
          Manager: getRelCompAvg("Manager"),
          Peers: getRelCompAvg("Peer"),
          Subordinates: getRelCompAvg("Subordinate"),
          Stakeholders: getRelCompAvg("Stakeholder"),
          Overall: parseFloat(
            (
              (getRelCompAvg("Self") +
                getRelCompAvg("Manager") +
                getRelCompAvg("Peer") +
                getRelCompAvg("Subordinate") +
                getRelCompAvg("Stakeholder")) /
              Math.max(1, [getRelCompAvg("Self"), getRelCompAvg("Manager"), getRelCompAvg("Peer"), getRelCompAvg("Subordinate"), getRelCompAvg("Stakeholder")].filter(v => v > 0).length)
            ).toFixed(2)
          ),
        };
      });

      // Aggregate qualitative strengths & growth themes
      const qualitative = {
        strengths: [],
        growthAreas: [],
        generalAdvice: [],
      };

      submitted.forEach((a) => {
        const authorLabel = a.is_anonymous ? `Anonymous ${a.rater_relationship}` : `${a.rater_relationship} Review`;
        if (a.strengths_feedback) {
          qualitative.strengths.push({
            role: a.rater_relationship,
            author: authorLabel,
            text: a.strengths_feedback,
          });
        }
        if (a.growth_areas_feedback) {
          qualitative.growthAreas.push({
            role: a.rater_relationship,
            author: authorLabel,
            text: a.growth_areas_feedback,
          });
        }
        if (a.general_comments) {
          qualitative.generalAdvice.push({
            role: a.rater_relationship,
            author: authorLabel,
            text: a.general_comments,
          });
        }
      });

      // Find or create summary
      const [summaryRecord] = await FeedbackSummary360.findOrCreate({
        where: { cycle_id, evaluatee_id },
        defaults: {
          cycle_id,
          evaluatee_id,
          evaluatee_name: assignments[0]?.evaluatee_name || evaluatee_id,
          evaluatee_dept: assignments[0]?.evaluatee_dept || "General",
          evaluatee_designation: assignments[0]?.evaluatee_designation || "Staff",
          status: "In_Progress",
        },
      });

      const nextStatus = totalSubmitted >= 3 && summaryRecord.status === "In_Progress"
        ? "Ready_For_Review"
        : summaryRecord.status;

      await summaryRecord.update({
        total_raters_assigned: totalAssigned,
        total_raters_submitted: totalSubmitted,
        self_avg_score: selfScore,
        manager_avg_score: managerScore,
        peer_avg_score: peerScore,
        subordinate_avg_score: subScore,
        stakeholder_avg_score: stakeScore,
        composite_score: composite,
        competency_radar_data: JSON.stringify(radarBreakdown),
        qualitative_summary: JSON.stringify(qualitative),
        status: nextStatus,
      });

      return summaryRecord;
    } catch (err) {
      console.warn("_recalculateSummary warning:", err.message);
      return null;
    }
  },
};

module.exports = Feedback360Controller;
