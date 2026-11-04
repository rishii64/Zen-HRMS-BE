const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Transfer = sequelize.define(
    "Transfer",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transfer_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
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
      transfer_type: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: "Inter-Departmental", // "Inter-Departmental", "Branch Transfer", "Deputation", "Role Reassignment"
      },
      current_department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      current_branch: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Kolkata HQ",
      },
      target_branch: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      current_designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      current_reporting_manager: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_reporting_manager: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      current_salary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      revised_salary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
      deputation_allowance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      relocation_allowance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      deputation_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      deputation_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Approved", "Effective", "Rejected", "Cancelled"
      },
      workflow_step: {
        type: DataTypes.STRING(60),
        allowNull: true,
        defaultValue: "HR Review",
      },
      initiated_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      initiated_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      approved_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      approved_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      approval_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      handover_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "In Progress", "Completed", "Waived"
      },
      handover_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      letter_ref_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      letter_issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      letter_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Draft", // "Draft", "Issued", "Acknowledged"
      },
      letter_signatory_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
        defaultValue: "Priyanka Mukherjee",
      },
      letter_signatory_title: {
        type: DataTypes.STRING(150),
        allowNull: true,
        defaultValue: "CHRO & VP - Human Resources",
      },
      sync_employee_record: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "employee_transfers",
      timestamps: true,
      underscored: true,
    }
  );

  return Transfer;
};

