const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MediclaimHighlight = sequelize.define(
    "MediclaimHighlight",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      badge: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Included",
      },
      badge_color: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "emerald",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "shield",
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "mediclaim_highlights",
      timestamps: true,
      underscored: true,
    }
  );

  return MediclaimHighlight;
};
