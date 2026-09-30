const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RecruitmentRequisition = sequelize.define(
    "RecruitmentRequisition",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      requisition_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      position: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      vacancies_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      experience_required: {
        type: DataTypes.STRING(100),
        allowNull: false, // e.g. "3-5 years"
      },
      job_description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      max_salary: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false, // Max salary for the position
      },
      salary_frequency: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Per Annum (CTC)", // or "Per Month"
      },
      joining_date_type: {
        type: DataTypes.STRING(50),
        allowNull: false, // "Immediate" or "Normal"
        defaultValue: "Normal",
      },
      tentative_joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_budgeted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // true = Yes, false = No
      },
      // CEO / COO Approval for unbudgeted recruitment
      budget_approval_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "NOT_REQUIRED", // "NOT_REQUIRED", "PENDING_CEO_COO", "APPROVED_BY_CEO", "REJECTED_BY_CEO"
      },
      ceo_coo_approver_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      ceo_coo_approver_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      ceo_coo_approver_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      ceo_coo_decision_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ceo_coo_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approval_document_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      approval_document_filename: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      reason_for_hiring: {
        type: DataTypes.STRING(100),
        allowNull: true, // "Team Expansion", "Backfill / Replacement", "New Project", etc.
      },
      replacement_for_employee: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // HOD details
      hod_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      hod_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Department Head",
      },
      hod_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      // HR details
      hr_assigned_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hr_assigned_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hr_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Overall Status
      // "PENDING_CEO_COO_APPROVAL" | "SOURCING_CANDIDATES" | "HOD_REVIEW" | "INTERVIEWS_IN_PROGRESS" | "CLOSED" | "REJECTED"
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "SOURCING_CANDIDATES",
      },
    },
    {
      tableName: "recruitment_requisitions",
      timestamps: true,
    }
  );

  return RecruitmentRequisition;
};
