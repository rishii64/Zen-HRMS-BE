const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const PasswordReset = sequelize.define(
    "PasswordReset",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      otp: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "password_resets",
      timestamps: true,
      updatedAt: false, // only createdAt
      underscored: true,
    }
  );

  return PasswordReset;
};
