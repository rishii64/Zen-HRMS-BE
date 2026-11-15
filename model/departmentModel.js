const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Department = sequelize.define(
    "Department",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dept_code: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      dept_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hod_employee_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hod_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      parent_dept_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "departments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Department;
};

