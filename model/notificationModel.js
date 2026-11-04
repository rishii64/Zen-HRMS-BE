const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Notification = sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      recipient_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "ALL", // "ALL", "HR", "ADMIN", "MANAGEMENT", or employee_code like "HR-PM-02"
      },
      recipient_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "info", // "approval", "leave", "announcement", "attendance", "claim"
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "General", // "Approvals", "Leaves", "Announcements", "Attendance", "General"
      },
      link: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "normal", // "low", "normal", "high", "urgent"
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      read_by: {
        type: DataTypes.TEXT,
        allowNull: true, // Comma-separated list of employee IDs who read broadcast notifications
      },
      source_module: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "notifications",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Notification;
};

