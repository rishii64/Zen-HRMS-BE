const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Leave = sequelize.define(
    "Leave",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      dept: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "General",
      },
      leave_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Casual Leave",
      },
      day_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Full Day",
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      total_days: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emergency_contact: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      doc_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Approved", "Rejected", "Cancelled"
      },
      approver: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "leaves",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Leave;
};
