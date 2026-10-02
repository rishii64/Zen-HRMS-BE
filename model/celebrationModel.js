const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const CelebrationBroadcast = sequelize.define(
    "CelebrationBroadcast",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.STRING(50), // 'birthday' or 'anniversary'
        defaultValue: "birthday",
      },
      employee_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      event_date: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "celebration_broadcasts",
      timestamps: true,
      underscored: true,
    }
  );

  return CelebrationBroadcast;
};
