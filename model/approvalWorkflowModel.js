const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ApprovalWorkflow = sequelize.define(
    "ApprovalWorkflow",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      module: {
        type: DataTypes.STRING(50),
        allowNull: false, // "LEAVE", "EXPENSE_CLAIM", "OVERTIME", "TRANSFER", "RESIGNATION", "GENERAL"
      },
      workflow_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "ALL", // "ALL" or specific department name
      },
      min_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      min_days: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      allow_auto_skip: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // auto-skip level if applicant is the approver
      },
      notify_on_each_step: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.STRING(100),
        defaultValue: "HR Admin",
      },
      updated_by: {
        type: DataTypes.STRING(100),
        defaultValue: "HR Admin",
      },
    },
    {
      tableName: "approval_workflows",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  const ApprovalWorkflowStep = sequelize.define(
    "ApprovalWorkflowStep",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      workflow_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      level_order: {
        type: DataTypes.INTEGER,
        allowNull: false, // 1, 2, 3, 4...
      },
      level_name: {
        type: DataTypes.STRING(150),
        allowNull: false, // e.g. "Reporting Manager Endorsement"
      },
      approver_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "REPORTING_MANAGER", // "REPORTING_MANAGER", "HOD", "ROLE", "SPECIFIC_USER"
      },
      approver_role: {
        type: DataTypes.STRING(50),
        allowNull: true, // "manager", "hod", "hr", "finance", "management", "director", "admin"
      },
      specific_employee_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      specific_employee_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      condition_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ALWAYS", // "ALWAYS", "AMOUNT_GREATER_THAN", "DAYS_GREATER_THAN"
      },
      condition_value: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      is_mandatory: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      can_auto_skip: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sla_hours: {
        type: DataTypes.INTEGER,
        defaultValue: 48,
      },
    },
    {
      tableName: "approval_workflow_steps",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return { ApprovalWorkflow, ApprovalWorkflowStep };
};
