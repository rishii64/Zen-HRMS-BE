const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Holiday = sequelize.define(
    "Holiday",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      day: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      month: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      day_num: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Public", // Public, National, Festival, Company, Gazetted, Optional
      },
      dept: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "All",
      },
      created_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "holidays",
      timestamps: true,
      underscored: true,
    }
  );

  return Holiday;
};
