const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CandidatePreJoining = sequelize.define(
    "CandidatePreJoining",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      token: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      candidate_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      onboarding_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      offer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      candidate_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      candidate_email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      department: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      work_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "Headquarters",
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING_UPLOAD", // PENDING_UPLOAD | SUBMITTED | UNDER_REVIEW | VERIFIED | REJECTED | EXPIRED
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verified_by_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      verification_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      personal_details: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      bank_details: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      kyc_documents: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      prior_employment: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      educational_documents: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      digital_signature_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      declaration_agreed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      submission_ip: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      submission_user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      synced_to_onboarding: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_by_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_by_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      tableName: "candidate_pre_joinings",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["token"] },
        { fields: ["candidate_email"] },
        { fields: ["status"] },
        { fields: ["expires_at"] },
      ],
    }
  );

  return CandidatePreJoining;
};
