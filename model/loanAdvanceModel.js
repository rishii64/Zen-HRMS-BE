const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LoanAdvance = sequelize.define(
    "LoanAdvance",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      application_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true, // e.g. "LOAN-2026-0001", "ADV-2026-0001"
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
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "SALARY_ADVANCE", // "SALARY_ADVANCE" or "LOAN"
      },
      principal_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      interest_rate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0, // 0% for salary advance, e.g. 8.5% for company loan
      },
      interest_type: {
        type: DataTypes.STRING(50),
        defaultValue: "REDUCING_BALANCE", // "REDUCING_BALANCE" or "FLAT"
      },
      tenure_months: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1 to 6 for advance, 6 to 60 for loan
      },
      monthly_emi: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_interest: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_repayable: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      remaining_balance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paid_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0,
      },
      paid_installments: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      total_installments: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      purpose: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      reason_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      repayment_start_month: {
        type: DataTypes.STRING(20),
        allowNull: false, // e.g. "2026-12"
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING_APPROVAL", // "PENDING_APPROVAL", "APPROVED", "REJECTED", "DISBURSED", "ACTIVE", "COMPLETED", "CANCELLED"
      },
      repayment_schedule: {
        type: DataTypes.JSONB,
        allowNull: true, // Array of { installment_no, month_year, opening_balance, emi, principal, interest, closing_balance, status }
      },
      manager_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      manager_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      manager_decision: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      manager_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      manager_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      finance_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      finance_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      finance_decision: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      finance_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      finance_action_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      disbursement_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      disbursement_mode: {
        type: DataTypes.STRING(50),
        defaultValue: "Bank Transfer",
      },
      disbursement_ref: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      disbursed_by: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
    },
    {
      tableName: "loans_advances",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  const LoanRepaymentLog = sequelize.define(
    "LoanRepaymentLog",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      loan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      month_year: {
        type: DataTypes.STRING(20),
        allowNull: false, // "2026-11"
      },
      installment_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      emi_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      principal_component: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      interest_component: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      remaining_balance_after: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      payment_source: {
        type: DataTypes.STRING(50),
        defaultValue: "PAYROLL_DEDUCTION", // "PAYROLL_DEDUCTION" or "MANUAL_PAYMENT"
      },
      payroll_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      deduction_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      remarks: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "loan_repayment_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return { LoanAdvance, LoanRepaymentLog };
};
