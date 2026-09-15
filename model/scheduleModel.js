const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Schedule = sequelize.define(
    "Schedule",
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

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      dept: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      shift_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "General Shift", // Morning Shift, General Shift, Evening Shift, Night Shift, Off
      },

      start_time: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "10:00",
      },

      end_time: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "19:00",
      },

      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      week_start: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "Published",
      },

      created_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "schedules",
      timestamps: true,
      underscored: true,
    }
  );

  return Schedule;
};
