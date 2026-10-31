const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LeaveAllocation = sequelize.define(
    "LeaveAllocation",
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
        defaultValue: "General",
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: new Date().getFullYear(),
      },
      leave_type: {
        type: DataTypes.STRING(100),
        allowNull: false, // "Earned Leave", "Privilege Leave", "Casual Leave", "Sick Leave", etc.
      },
      leave_code: {
        type: DataTypes.STRING(20),
        allowNull: false, // "EL", "PL", "CL", "SL", "ML", "PAT", "CO"
      },
      allocated_days: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      carried_forward: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0, // Only applicable to EL and PL
      },
      used_days: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      lapsed_days: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0, // Leaves lapsed due to > 3 years or exceeding 45 cap
      },
      balance: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      can_carry_forward: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // true ONLY for EL and PL
      },
      max_stack_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 45, // Cap at 45 leaves for EL/PL
      },
      carry_forward_max_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3, // Up to 3 years
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      allocated_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "leave_allocations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["employee_id", "year", "leave_code"],
          name: "leave_allocations_emp_year_code_uniq",
        },
      ],
    }
  );

  return LeaveAllocation;
};

