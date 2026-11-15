const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  // 1. 360 Feedback Cycle (Campaign)
  const FeedbackCycle360 = sequelize.define(
    "FeedbackCycle360",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cycle_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Active", // "Draft", "Active", "Closed", "Archived"
      },
      allow_anonymous_peer: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      allow_anonymous_subordinate: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Upward feedback of managers can be anonymous
      },
      allow_anonymous_stakeholder: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      min_raters_required: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      competencies_config: {
        type: DataTypes.TEXT, // JSON array of 5 core competencies and rating scale criteria
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "HR Operations",
      },
    },
    {
      tableName: "feedback_cycles_360",
      timestamps: true,
      underscored: true,
    }
  );

  // 2. Individual 360 Feedback Assignment / Review Submission
  const FeedbackAssignment360 = sequelize.define(
    "FeedbackAssignment360",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cycle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      evaluatee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      evaluatee_name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      evaluatee_dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      evaluatee_designation: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      rater_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      rater_name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      rater_dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      rater_designation: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      rater_relationship: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Peer", // "Self", "Peer", "Subordinate", "Stakeholder", "Manager"
      },
      is_anonymous: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Draft", "Submitted", "Declined"
      },
      overall_score: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true, // out of 5.00
      },
      competency_scores: {
        type: DataTypes.TEXT, // JSON map of competency scores: { functional: 4.5, teamwork: 4.8, leadership: 4.2, ... }
        allowNull: true,
      },
      strengths_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      growth_areas_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      general_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "feedback_assignments_360",
      timestamps: true,
      underscored: true,
    }
  );

  // 3. 360 Feedback Summary & Synthesis Report
  const FeedbackSummary360 = sequelize.define(
    "FeedbackSummary360",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cycle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      evaluatee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      evaluatee_name: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      evaluatee_dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      evaluatee_designation: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      total_raters_assigned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_raters_submitted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      self_avg_score: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
      },
      manager_avg_score: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
      },
      peer_avg_score: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
      },
      subordinate_avg_score: {
        type: DataTypes.DECIMAL(4, 2), // Upward feedback average
        allowNull: true,
      },
      stakeholder_avg_score: {
        type: DataTypes.DECIMAL(4, 2), // Cross-departmental average
        allowNull: true,
      },
      composite_score: {
        type: DataTypes.DECIMAL(4, 2), // Weighted composite multi-rater score
        allowNull: true,
      },
      competency_radar_data: {
        type: DataTypes.TEXT, // JSON structure formatted for radar/spider breakdown
        allowNull: true,
      },
      qualitative_summary: {
        type: DataTypes.TEXT, // JSON array of aggregated strengths and growth themes
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "In_Progress", // "In_Progress", "Ready_For_Review", "Published_To_Employee"
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hr_summary_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "feedback_summaries_360",
      timestamps: true,
      underscored: true,
    }
  );

  return {
    FeedbackCycle360,
    FeedbackAssignment360,
    FeedbackSummary360,
  };
};
