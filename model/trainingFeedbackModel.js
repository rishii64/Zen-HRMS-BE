const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TrainingFeedback = sequelize.define(
    "TrainingFeedback",
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
      enrollment_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      content_quality_rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5, // 1 to 5
      },
      trainer_effectiveness_rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5, // 1 to 5
      },
      relevance_to_job_rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5, // 1 to 5
      },
      overall_satisfaction_rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5, // 1 to 5
      },
      suggestions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_anonymous: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "training_feedbacks",
      timestamps: true,
      underscored: true,
    }
  );

  return TrainingFeedback;
};
