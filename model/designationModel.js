const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Designation = sequelize.define(
    "Designation",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      department_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // NULL means Global / cross-department designation (e.g. "Manager", "General Manager", "HOD")
      },
      grade_id: {
        type: DataTypes.INTEGER,
        allowNull: false, // Links to JobGrade (rank & pay band)
      },
      job_family: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "General",
      },
      is_hod_role: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      tableName: "designations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Designation;
};

