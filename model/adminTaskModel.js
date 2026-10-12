const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AdminTask = sequelize.define(
    "AdminTask",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Facilities & Maintenance",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      requester_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      requester_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      dept: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "General",
      },
      priority: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Medium", // "Urgent", "High", "Medium", "Low"
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "In Progress", "Completed"
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      assigned_to: {
        type: DataTypes.STRING(150),
        allowNull: true,
        defaultValue: "Admin Team",
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "admin_tasks",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return AdminTask;
};
