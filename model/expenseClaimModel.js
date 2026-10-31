const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ExpenseClaim = sequelize.define(
    "ExpenseClaim",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      claim_number: {
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
        type: DataTypes.STRING(150),
      },
      department: {
        type: DataTypes.STRING(100),
      },
      designation: {
        type: DataTypes.STRING(100),
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      claim_type: {
        type: DataTypes.ENUM(
          "TRAVEL",
          "GENERAL_EXPENSE",
          "CLIENT_MEETING",
          "TRAINING_CERTIFICATION",
          "OFFICE_PURCHASE",
          "OTHER"
        ),
        defaultValue: "TRAVEL",
      },
      travel_start_date: {
        type: DataTypes.DATEONLY,
      },
      travel_end_date: {
        type: DataTypes.DATEONLY,
      },
      travel_destination: {
        type: DataTypes.STRING(200),
      },
      purpose: {
        type: DataTypes.TEXT,
      },
      total_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false,
      },
      approved_amount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      currency: {
        type: DataTypes.STRING(10),
        defaultValue: "INR",
      },
      status: {
        type: DataTypes.ENUM(
          "DRAFT",
          "SUBMITTED",
          "APPROVED_BY_MANAGER",
          "REJECTED_BY_MANAGER",
          "APPROVED_BY_FINANCE",
          "REJECTED_BY_FINANCE",
          "PAID",
          "CANCELLED"
        ),
        defaultValue: "SUBMITTED",
      },
      current_stage: {
        type: DataTypes.ENUM("MANAGER", "FINANCE", "PAYMENT", "COMPLETED", "REJECTED"),
        defaultValue: "MANAGER",
      },
      // Manager Tier Approval
      manager_id: {
        type: DataTypes.STRING(50),
      },
      manager_name: {
        type: DataTypes.STRING(150),
      },
      manager_decision: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        defaultValue: "PENDING",
      },
      manager_decision_at: {
        type: DataTypes.DATE,
      },
      manager_comments: {
        type: DataTypes.TEXT,
      },
      // Finance / Accounts Tier Approval
      finance_id: {
        type: DataTypes.STRING(50),
      },
      finance_name: {
        type: DataTypes.STRING(150),
      },
      finance_decision: {
        type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
        defaultValue: "PENDING",
      },
      finance_decision_at: {
        type: DataTypes.DATE,
      },
      finance_comments: {
        type: DataTypes.TEXT,
      },
      // Payment Settlement
      payment_mode: {
        type: DataTypes.STRING(50), // Bank Transfer, UPI, Payroll Addition, Cash, Cheque
      },
      payment_reference: {
        type: DataTypes.STRING(100), // UTR, Transaction ID, Cheque No
      },
      disbursed_at: {
        type: DataTypes.DATE,
      },
      disbursed_by_id: {
        type: DataTypes.STRING(50),
      },
      disbursed_by_name: {
        type: DataTypes.STRING(150),
      },
      payment_notes: {
        type: DataTypes.TEXT,
      },
      // HR Oversight Action / Override
      hr_override_id: {
        type: DataTypes.STRING(50),
      },
      hr_override_name: {
        type: DataTypes.STRING(150),
      },
      hr_override_notes: {
        type: DataTypes.TEXT,
      },
      supporting_documents: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
    },
    {
      tableName: "expense_claims",
      timestamps: true,
      indexes: [
        { fields: ["employee_id"] },
        { fields: ["claim_number"], unique: true },
        { fields: ["status"] },
        { fields: ["current_stage"] },
        { fields: ["department"] },
      ],
    }
  );

  return ExpenseClaim;
};
