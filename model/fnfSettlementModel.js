const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const FnfSettlement = sequelize.define(
    "FnfSettlement",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      resignation_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Nullable in case of immediate termination / direct F&F
      },

      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      employee_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
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

      resignation_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      last_working_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      settlement_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Draft", // "Draft", "Approved", "Finalized", "Paid"
      },

      // Salary baseline
      monthly_gross: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      monthly_basic: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      per_day_rate: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Notice Period Calculation
      notice_period_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },

      notice_served_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },

      notice_shortfall_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      notice_waiver_granted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      notice_recovery_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Unpaid Salary in Final Month
      unpaid_salary_days: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },

      unpaid_salary_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Leave Encashment (Earned & Privilege leaves)
      leave_encashment_days: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },

      leave_encashment_rate: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      leave_encashment_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Statutory Gratuity
      gratuity_eligible: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      tenure_years: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },

      gratuity_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Additional Additions & Earnings
      bonus_incentive_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      reimbursement_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      other_earnings: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      other_earnings_remarks: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      total_earnings: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Deductions & Recoveries
      loan_outstanding_recovery: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      advance_salary_recovery: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      asset_damage_recovery: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      statutory_pf: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      statutory_esi: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      statutory_pt: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      tax_tds_deduction: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      other_deductions: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      other_deductions_remarks: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      total_deductions: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Net Payable / Net Recoverable
      net_payable_amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      settlement_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PAYABLE_TO_EMPLOYEE", // "PAYABLE_TO_EMPLOYEE", "RECOVERABLE_FROM_EMPLOYEE", "BALANCED"
      },

      // Payment & Bank Details
      payment_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Processed", "Paid"
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

      payment_reference: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      bank_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      bank_account_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      ifsc_code: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      prepared_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      approved_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      // Official Exit Letters
      relieving_letter_issued: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      relieving_letter_ref_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      relieving_letter_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      experience_letter_issued: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      experience_letter_ref_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      experience_letter_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      conduct_remarks: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Exemplary", // "Exemplary", "Good", "Satisfactory"
      },
    },
    {
      tableName: "fnf_settlements",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return FnfSettlement;
};

