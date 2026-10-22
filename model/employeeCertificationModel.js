const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const EmployeeCertification = sequelize.define(
    "EmployeeCertification",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      source_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "EXTERNAL", // "EXTERNAL", "INTERNAL_HR", "DEPARTMENTAL"
      },
      internal_program_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      course_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      provider_institution: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      skills_acquired: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      completion_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      duration_hours: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      credential_id: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      verification_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      certificate_file_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      certificate_file_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Submitted", // Draft, Submitted, Under Review, Approved, Rejected, Changes Requested
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      reviewed_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      reviewed_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      review_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      history: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
    },
    {
      tableName: "employee_certifications",
      timestamps: true,
      underscored: true,
    }
  );

  return EmployeeCertification;
};
