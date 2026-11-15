const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const JobGrade = sequelize.define(
    "JobGrade",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      grade_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      grade_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      rank_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1 (lowest entry) to 10 (highest CXO)
      },
      min_salary: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      max_salary: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      notice_period_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "job_grades",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return JobGrade;
};

