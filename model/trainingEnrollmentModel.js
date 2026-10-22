const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TrainingEnrollment = sequelize.define(
    "TrainingEnrollment",
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
      session_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      employee_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      enrollment_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "MANUAL_ASSIGNMENT", // MANUAL_ASSIGNMENT, AUTO_ONBOARDING, SELF_ENROLLED, DEPT_MANDATORY
      },
      attendance_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Pending", // Pending, Attended, Absent, Excused
      },
      attendance_marked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      attendance_marked_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      attendance_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      completion_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Not Started", // Not Started, In Progress, Completed, Failed, Overdue
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      assessment_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Not Applicable", // Not Applicable, Pending, Passed, Failed
      },
      assessment_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      assessment_attempts_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      feedback_submitted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      certificate_issued: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      certificate_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      certificate_issued_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      company_logo_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "training_enrollments",
      timestamps: true,
      underscored: true,
    }
  );

  return TrainingEnrollment;
};
