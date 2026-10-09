const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PerformanceReview = sequelize.define(
    "PerformanceReview",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      review_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "probation", // "probation" | "appraisal"
      },
      cycle_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "6-Month Probation Review",
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      probation_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      probation_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      tl_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      tl_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manager_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      manager_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hod_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hod_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      current_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "self", // "self" | "tl" | "manager" | "hod" | "hr" | "completed"
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending_Self",
        // "Pending_Self" | "Pending_TL" | "Pending_Manager" | "Pending_HOD" | "Pending_HR" | "Confirmed_Permanent" | "Probation_Extended_3M" | "HR_Approved_Appraisal" | "Rejected"
      },
      self_overall_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      tl_overall_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      manager_overall_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      hod_overall_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      final_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      self_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tl_recommendation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      tl_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      manager_recommendation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manager_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hod_decision: {
        type: DataTypes.STRING(100),
        allowNull: true, // "confirm_permanent" | "extend_probation_3m" | "recommend_promotion" | "recommend_increment" | "needs_pip"
      },
      hod_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hr_decision: {
        type: DataTypes.STRING(100),
        allowNull: true, // "confirm_permanent" | "extend_probation_3m" | "reject" | "approve_appraisal"
      },
      hr_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      initiated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      self_submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      tl_reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      manager_reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hod_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hr_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "performance_reviews",
      timestamps: true,
      underscored: true,
    }
  );

  return PerformanceReview;
};
