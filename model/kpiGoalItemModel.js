const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const KpiGoalItem = sequelize.define(
    "KpiGoalItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      assignment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 100,
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "%",
      },
      weightage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 25.0,
      },
      actual_achieved: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      self_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },
      self_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      manager_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
      },
      manager_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "kpi_goal_items",
      timestamps: true,
      underscored: true,
    }
  );

  return KpiGoalItem;
};
