const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MediclaimHospital = sequelize.define(
    "MediclaimHospital",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      area: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      helpline: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "+91 1800 425 9449",
      },
      cashless: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      hospital_type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Multi Specialty",
      },
    },
    {
      tableName: "mediclaim_hospitals",
      timestamps: true,
      underscored: true,
    }
  );

  return MediclaimHospital;
};
