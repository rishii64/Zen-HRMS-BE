const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const LeavePolicy = sequelize.define(
    "LeavePolicy",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      leave_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      leave_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      default_annual_quota: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      can_carry_forward: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      carry_forward_max_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      max_stack_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      applicable_gender: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "All", // "All", "Female", "Male"
      },
      employment_type_eligibility: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "All", // "All" or "Permanent"
      },
      color: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: "#3b82f6",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "leave_policies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return LeavePolicy;
};

