const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Promotion = sequelize.define(
    "Promotion",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      promotion_code: {
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
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      promotion_type: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: "Merit Promotion", // "Merit Promotion", "Grade Progression", "Accelerated Promotion", "Role Elevation"
      },
      current_designation: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      target_designation: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      current_grade_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "L2",
      },
      target_grade_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "L3",
      },
      current_rank_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 2,
      },
      target_rank_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 3,
      },
      current_salary: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      revised_salary: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      increment_amount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      increment_percentage: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      payout_basis: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: "monthly", // "monthly", "annual", "lpa"
      },
      performance_rating: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      effective_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Approved", "Effective", "Rejected", "Deferred"
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
      justification: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rejection_reason: {
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
      tableName: "employee_promotions",
      timestamps: true,
      underscored: true,
    }
  );

  return Promotion;
};

