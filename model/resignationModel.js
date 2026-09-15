const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Resignation = sequelize.define(
    "Resignation",
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
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "General",
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      last_working_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      notice_period: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "1 month",
      },
      reason: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      reason_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      schedule_exit_interview: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      interview_preferred_date: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      interview_mode: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "In person",
      },
      handover_person_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      handover_person_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      handover_target_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      handover_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reassign_items_to_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      reassign_items_to_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      email_forwarding_to_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      email_forwarding_to_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      ack_claims_expenses: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ack_final_pay: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ack_return_assets: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending Manager Approval", // "Draft", "Pending Manager Approval", "Pending HR Approval", "Approved", "Rejected", "Cancelled"
      },
      manager_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      manager_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manager_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "Approved", "Rejected", "Pending"
      },
      manager_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      manager_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      manager_recommended_lwd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      hr_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hr_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hr_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "Approved", "Rejected", "Pending"
      },
      hr_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hr_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hr_confirmed_lwd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      exit_interview_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Not Scheduled", // "Not Scheduled", "Scheduled", "Completed", "Waived"
      },
      exit_interview_date: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      clearance_it_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Cleared"
      },
      clearance_finance_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending",
      },
      clearance_admin_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending",
      },
      clearance_hr_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending",
      },
    },
    {
      tableName: "resignations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Resignation;
};
