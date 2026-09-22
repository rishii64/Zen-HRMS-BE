const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MediclaimPolicy = sequelize.define(
    "MediclaimPolicy",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      policy_number: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "GHI-ZEN-2025-0894",
      },
      tpa_name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Medi Assist TPA Services",
      },
      insurance_company: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ICICI Lombard GIC Ltd",
      },
      policy_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: "2025-04-01",
      },
      policy_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: "2026-03-31",
      },
      sum_insured: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 500000.0,
      },
      plan_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Corporate Group Floater Plan (1+3)",
      },
      nominee_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nominee_relation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      nominee_contact: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // Array of dependents: [{ id, name, relation, dob, age, gender, blood_group, tpa_member_id }]
      enrolled_dependents: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      emergency_helpline: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "1800-425-9449 / 022-6692-2000",
      },
      tpa_email: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "claims@mediassist.in",
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Active",
      },
    },
    {
      tableName: "mediclaim_policies",
      timestamps: true,
      underscored: true,
    }
  );

  return MediclaimPolicy;
};
