const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BiometricPunch = sequelize.define(
    "BiometricPunch",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      device_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      device_serial: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      biometric_user_id: {
        type: DataTypes.STRING(100),
        allowNull: false, // Machine enrollment ID / card ID / badge ID
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: true, // Resolved HRMS employee code e.g. EMP-001
      },
      punch_time: {
        type: DataTypes.STRING(20),
        allowNull: false, // "HH:MM:SS"
      },
      punch_date: {
        type: DataTypes.DATEONLY,
        allowNull: false, // "YYYY-MM-DD"
      },
      punch_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "AUTO", // CHECK_IN, CHECK_OUT, AUTO
      },
      verification_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "FINGERPRINT", // FINGERPRINT, FACE, RFID_CARD, PASSWORD, PALM
      },
      sync_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PROCESSED", // PROCESSED, UNRESOLVED_USER, DUPLICATE, FAILED
      },
      punch_category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "FIRST_ENTRY", // FIRST_ENTRY, LAST_EXIT, IN_BETWEEN_AUDIT, UNMAPPED, DUPLICATE
      },
      attendance_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      raw_data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "biometric_punches",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["biometric_user_id", "punch_date"],
        },
        {
          fields: ["employee_id", "punch_date"],
        },
        {
          fields: ["device_id"],
        },
      ],
    }
  );

  return BiometricPunch;
};
