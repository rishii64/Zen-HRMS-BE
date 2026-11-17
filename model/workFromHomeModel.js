const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const WorkFromHome = sequelize.define(
    "WorkFromHome",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      request_no: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      day_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Full Day",
      },
      total_days: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 1.0,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      work_plan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emergency_contact: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending",
      },
      current_level: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      approver_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      approver_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      approval_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "work_from_homes",
      timestamps: true,
      underscored: true,
    }
  );

  return WorkFromHome;
};
