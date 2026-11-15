const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const BiometricDevice = sequelize.define(
    "BiometricDevice",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      device_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      device_serial: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      device_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ZKTeco", // ZKTeco, eSSL, Hikvision, Matrix, Anviz, Generic API
      },
      ip_address: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "192.168.1.201",
      },
      port: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4370,
      },
      location: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: "Main Reception HQ",
      },
      api_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "ONLINE", // ONLINE, OFFLINE, SYNCING
      },
      last_sync_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_ping_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      total_punches_synced: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sync_mode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "REALTIME_PUSH", // REALTIME_PUSH, POLLING, FILE_IMPORT
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "biometric_devices",
      timestamps: true,
      underscored: true,
    }
  );

  return BiometricDevice;
};
