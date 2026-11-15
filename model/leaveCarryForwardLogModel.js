const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LeaveCarryForwardLog = sequelize.define(
    "LeaveCarryForwardLog",
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
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      leave_code: {
        type: DataTypes.STRING(20),
        allowNull: false, // "EL" or "PL"
      },
      leave_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      from_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      to_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      unutilized_balance: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      years_carried: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1st, 2nd, or 3rd year
      },
      eligible_carry_forward: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      excess_lapsed: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0, // Lapsed because > 45 cap or > 3 years
      },
      actual_carried_forward: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      total_stacked: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0, // Cumulative carry-forward balance, capped at 45
      },
      expiry_year: {
        type: DataTypes.INTEGER,
        allowNull: false, // from_year + 3
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      processed_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "HR",
      },
    },
    {
      tableName: "leave_carry_forward_logs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LeaveCarryForwardLog;
};

