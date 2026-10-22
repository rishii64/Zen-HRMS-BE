const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TrainingAssessment = sequelize.define(
    "TrainingAssessment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
      },
      total_marks: {
        type: DataTypes.FLOAT,
        defaultValue: 100,
      },
      pass_percentage: {
        type: DataTypes.FLOAT,
        defaultValue: 60,
      },
      max_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
      },
      questions: {
        type: DataTypes.JSONB,
        defaultValue: [],
        // Structure: [
        //   {
        //     id: "q_1",
        //     type: "MCQ" | "TRUE_FALSE" | "DESCRIPTIVE",
        //     question: "...",
        //     options: ["A", "B", "C", "D"], // for MCQ
        //     correct_answer: "A", // string or boolean
        //     marks: 10,
        //     explanation: "..."
        //   }
        // ]
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      allow_retake: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "training_assessments",
      timestamps: true,
      underscored: true,
    }
  );

  return TrainingAssessment;
};
