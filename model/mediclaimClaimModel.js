const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MediclaimClaim = sequelize.define(
    "MediclaimClaim",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      claim_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dept: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      patient_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      patient_relation: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Self",
      },
      hospital_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hospital_city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hospital_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Network (Cashless)",
      },
      admission_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      discharge_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      ailment_diagnosis: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      treatment_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Inpatient Hospitalization",
      },
      claimed_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      approved_amount: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      settled_amount: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Submitted", // "Submitted", "Under Review", "Documents Verified", "Approved", "Settled", "Rejected", "Query Raised"
      },
      submission_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      settlement_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      settlement_ref: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      hr_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tpa_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Array of supporting documents: [{ id, filename, original_name, category, size, mimetype, upload_date, url }]
      supporting_documents: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "mediclaim_claims",
      timestamps: true,
      underscored: true,
    }
  );

  return MediclaimClaim;
};
