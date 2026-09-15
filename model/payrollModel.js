const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Payroll = sequelize.define(
    "Payroll",
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

      month_year: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      // Fixed Pay Breakdown
      fixed_pay: {
        type: DataTypes.TEXT, // JSON: { basic, da, hra, conveyance, medical, allowance, total_fixed }
        allowNull: true,
      },

      // Variable Pay Breakdown
      variable_pay: {
        type: DataTypes.TEXT, // JSON: { bonus, overtime, incentive, reimbursement, total_variable }
        allowNull: true,
      },

      gross_pay: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Attendance & LOP
      attendance_summary: {
        type: DataTypes.TEXT, // JSON: { total_days, working_days, present_days, lop_days, lop_amount }
        allowNull: true,
      },

      lop_deduction: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Tax Deductions
      tax_deductions: {
        type: DataTypes.TEXT, // JSON: { taxable_pay, tds, other_tax, total_tax }
        allowNull: true,
      },

      // Statutory Deductions
      statutory_deductions: {
        type: DataTypes.TEXT, // JSON: { pf, esi, pt, others, total_statutory }
        allowNull: true,
      },

      total_deductions: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      net_salary: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Finalized", // "Draft", "Finalized", "Paid"
      },

      payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      payment_mode: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "Bank Transfer",
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "payrolls",
      timestamps: true,
      underscored: true,
    }
  );

  return Payroll;
};
