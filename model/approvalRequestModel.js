const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ApprovalRequest = sequelize.define(
    "ApprovalRequest",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      request_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true, // e.g. "APP-2026-0001"
      },
      module: {
        type: DataTypes.STRING(50),
        allowNull: false, // "LEAVE", "EXPENSE_CLAIM", "OVERTIME", "TRANSFER", "RESIGNATION", "GENERAL"
      },
      entity_id: {
        type: DataTypes.STRING(100),
        allowNull: true, // ID of source record (Leave ID, Claim ID, etc.)
      },
      workflow_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      employee_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      days: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      total_levels: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      current_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // Currently pending level order
      },
      current_level_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      current_approver_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      current_approver_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      current_approver_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING", // "PENDING", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "CANCELLED"
      },
      final_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "APPROVED", "REJECTED", "CANCELLED"
      },
      final_decision_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      final_decision_by: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      final_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: "approval_requests",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  const ApprovalRequestStep = sequelize.define(
    "ApprovalRequestStep",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      request_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      level_order: {
        type: DataTypes.INTEGER,
        allowNull: false, // 1, 2, 3...
      },
      level_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      approver_type: {
        type: DataTypes.STRING(50),
        allowNull: false, // "REPORTING_MANAGER", "HOD", "ROLE", "SPECIFIC_USER"
      },
      approver_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      assigned_to_id: {
        type: DataTypes.STRING(50),
        allowNull: true, // Employee ID of resolved approver
      },
      assigned_to_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "WAITING", // "WAITING", "PENDING", "APPROVED", "REJECTED", "SKIPPED", "CHANGES_REQUESTED"
      },
      decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "APPROVED", "REJECTED", "AUTO_SKIPPED", "CHANGES_REQUESTED"
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      acted_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      acted_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      acted_by_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "approval_request_steps",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return { ApprovalRequest, ApprovalRequestStep };
};
