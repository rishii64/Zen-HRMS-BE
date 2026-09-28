const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const KpiAssignment = sequelize.define(
    "KpiAssignment",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      cycle_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Q1 2026",
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Assigned", // Assigned | Self_Submitted | HOD_Reviewed | HR_Approved
      },
      total_weightage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100.0,
      },
      self_overall_score: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },
      manager_overall_score: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },
      final_calibrated_score: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },
      manager_recommendation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      manager_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hr_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "kpi_assignments",
      timestamps: true,
      underscored: true,
    }
  );

  return KpiAssignment;
};
