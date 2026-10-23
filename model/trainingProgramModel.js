const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TrainingProgram = sequelize.define(
    "TrainingProgram",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
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
      objectives: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "HR", // "HR" (Central HR Training) or "DEPARTMENTAL"
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Technical", // Technical, Compliance, Soft Skills, Safety, Induction, Leadership, Process, Quality
      },
      delivery_mode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Offline", // Offline, Online, Blended
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true, // null for company-wide, or specific dept
      },
      target_audience_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ALL", // ALL, DEPARTMENT, SELECTED_EMPLOYEES, ONBOARDING
      },
      target_employee_ids: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
      is_mandatory: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_onboarding_mandatory: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      duration_hours: {
        type: DataTypes.FLOAT,
        defaultValue: 2.0,
      },
      completion_criteria: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      trainer_type: {
        type: DataTypes.STRING(50),
        defaultValue: "INTERNAL", // INTERNAL, EXTERNAL
      },
      trainer_employee_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      trainer_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      trainer_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      trainer_bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      venue: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      meeting_link: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      session_instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      learning_materials: {
        type: DataTypes.JSONB,
        defaultValue: [], // [{ name, url, type, size }]
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Published", // Draft, Proposed, Approved, Published, In Progress, Completed, Cancelled, Archived
      },
      proposal_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Approved", // Draft, Pending Approval, Approved, Rejected, Changes Requested
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      created_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      created_by_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      approved_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      approved_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
      },
      assessment_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      feedback_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      certificate_provided: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      company_logo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "training_programs",
      timestamps: true,
      underscored: true,
    }
  );

  return TrainingProgram;
};
