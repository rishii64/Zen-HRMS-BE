const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const KpiTemplate = sequelize.define(
    "KpiTemplate",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "All",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target_metric: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 100,
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "%",
      },
      default_weight: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 25.0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "kpi_templates",
      timestamps: true,
      underscored: true,
    }
  );

  return KpiTemplate;
};
