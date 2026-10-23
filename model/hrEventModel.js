const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const HrEvent = sequelize.define(
    "HrEvent",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      company_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: "Zentelex",
      },
      branch_location: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: "Kolkata HQ",
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      event_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      event_category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Event", // Event, Meeting, Presentation, Celebration, Townhall, Workshop, Training, Conference
      },
      event_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "10:00 AM",
      },
      end_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "01:00 PM",
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      sign_off: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "HR Team",
      },
      target_audience: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "All Employees",
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Draft", // Draft, Sent, Cancelled
      },
      theme: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "purple", // purple, emerald, blue, sunset
      },
      created_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      created_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      created_by_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      emails_sent_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "hr_events",
      timestamps: true,
      underscored: true,
    }
  );

  return HrEvent;
};
