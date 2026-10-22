const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AssessmentSubmission = sequelize.define(
    "AssessmentSubmission",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assessment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      program_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      attempt_number: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      answers: {
        type: DataTypes.JSONB,
        defaultValue: [],
        // Structure: [
        //   {
        //     question_id: "q_1",
        //     employee_answer: "A",
        //     is_correct: true,
        //     marks_awarded: 10,
        //     max_marks: 10,
        //     evaluator_feedback: ""
        //   }
        // ]
      },
      auto_evaluated_score: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      manual_evaluated_score: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      total_score: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      percentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      pass_status: {
        type: DataTypes.STRING(50),
        defaultValue: "Pending Evaluation", // Passed, Failed, Pending Evaluation
      },
      requires_manual_grading: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      evaluated_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      evaluated_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      evaluated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Controlled release by HR!
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      published_by: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "training_assessment_submissions",
      timestamps: true,
      underscored: true,
    }
  );

  return AssessmentSubmission;
};
