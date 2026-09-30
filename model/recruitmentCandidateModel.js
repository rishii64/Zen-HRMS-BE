const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RecruitmentCandidate = sequelize.define(
    "RecruitmentCandidate",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      requisition_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      candidate_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      current_company: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      current_designation: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      experience_years: {
        type: DataTypes.STRING(50),
        allowNull: false, // e.g. "4.5 years"
      },
      current_ctc: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      expected_ctc: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      notice_period: {
        type: DataTypes.STRING(50),
        allowNull: false, // "Immediate", "15 Days", "30 Days", "60 Days", etc.
        defaultValue: "30 Days",
      },
      resume_url: {
        type: DataTypes.STRING(500),
        allowNull: true, // File path or link
      },
      resume_filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      source: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "HR Sourced", // "LinkedIn", "Naukri", "Referral", "Direct"
      },
      hr_screening_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hr_added_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hr_added_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // HOD Shortlisting / Selection
      // "PENDING_REVIEW" | "SHORTLISTED_FOR_INTERVIEW" | "ON_HOLD" | "REJECTED"
      hod_selection_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING_REVIEW",
      },
      hod_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hod_decision_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hod_decision_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hod_decision_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      interview_requested: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      interview_requested_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Interview Progress
      // "NOT_SCHEDULED" | "INTERVIEW_REQUESTED" | "SCHEDULED" | "ROUND_1_HR" | "ROUND_2_TECH" | "ROUND_3_FINAL" | "SELECTED" | "REJECTED" | "OFFERED" | "JOINED"
      interview_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "NOT_SCHEDULED",
      },
      interview_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      interview_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      interview_mode: {
        type: DataTypes.STRING(50),
        allowNull: true, // "Online", "Face to Face"
      },
      interview_meeting_link: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      interview_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      interview_evaluations: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      tableName: "recruitment_candidates",
      timestamps: true,
    }
  );

  return RecruitmentCandidate;
};
