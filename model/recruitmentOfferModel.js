const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RecruitmentOffer = sequelize.define(
    "RecruitmentOffer",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      offer_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      candidate_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      requisition_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      candidate_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      candidate_email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      candidate_phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      candidate_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      designation: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      reporting_manager: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      work_location: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Kolkata HQ",
      },
      employment_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Full Time (Probation)",
      },
      probation_period_months: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 6,
      },
      notice_period_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      offer_expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      // Compensation / CTC Breakdown
      annual_ctc: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
      },
      monthly_gross: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
      },
      monthly_basic: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
      },
      monthly_hra: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
      },
      monthly_special_allowance: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      monthly_conveyance: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      monthly_medical: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      annual_performance_bonus: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      employer_pf_annual: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      other_benefits_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      salary_breakdown_json: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      terms_conditions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Multi-Stage Approval Chain
      // "DRAFT" | "PENDING_HOD_APPROVAL" | "PENDING_MANAGEMENT_APPROVAL" | "APPROVED" | "REJECTED"
      approval_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      // Current active approver: "DRAFT" | "HOD" | "MANAGEMENT" | "COMPLETED" | "REJECTED"
      current_approval_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      hod_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hod_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hod_decision: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING", // "PENDING", "APPROVED", "REJECTED"
      },
      hod_decision_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hod_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      management_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      management_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      management_decision: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING", // "PENDING", "APPROVED", "REJECTED"
      },
      management_decision_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      management_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Candidate Release & Digital Acceptance Lifecycle
      // "DRAFT" | "APPROVAL_PENDING" | "APPROVED" | "SENT_TO_CANDIDATE" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "JOINED"
      offer_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      sent_to_candidate_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      sent_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      sent_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      acceptance_token: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      candidate_decision: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING", // "PENDING", "ACCEPTED", "DECLINED"
      },
      candidate_decided_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      candidate_signature_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      candidate_confirmed_joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      candidate_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      candidate_ip_address: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      candidate_user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      // Signatory
      official_signatory_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Ms. Priyanka Mukherjee",
      },
      official_signatory_title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Head - Human Resources",
      },
      created_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      created_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "recruitment_offers",
      timestamps: true,
    }
  );

  return RecruitmentOffer;
};

