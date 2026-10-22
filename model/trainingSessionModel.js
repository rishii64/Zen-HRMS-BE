const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TrainingSession = sequelize.define(
    "TrainingSession",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batch_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Batch 1",
      },
      session_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "10:00 AM",
      },
      end_time: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "12:00 PM",
      },
      venue_or_link: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      trainer_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Scheduled", // Scheduled, Ongoing, Completed, Cancelled
      },
    },
    {
      tableName: "training_sessions",
      timestamps: true,
      underscored: true,
    }
  );

  return TrainingSession;
};
