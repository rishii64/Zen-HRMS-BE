const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AttendanceRegularization = sequelize.define(
    "AttendanceRegularization",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      request_no: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      employee_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      request_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "MISSED_PUNCH",
        // MISSED_PUNCH_IN | MISSED_PUNCH_OUT | MISSED_BOTH | ON_DUTY_OUTDOOR | WFH_REMOTE | REVERSAL_DISCREPANCY | LATE_WAIVER
      },
      original_check_in: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      original_check_out: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      original_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "Absent",
      },
      requested_check_in: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "09:30",
      },
      requested_check_out: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "18:30",
      },
      requested_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Present",
      },
      calculated_work_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 9.0,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      supporting_doc_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING", // PENDING | APPROVED | REJECTED | REVERSED
      },
      reviewed_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      reviewed_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      review_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      attendance_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "attendance_regularizations",
      timestamps: true,
      indexes: [
        { unique: true, fields: ["request_no"] },
        { fields: ["employee_id"] },
        { fields: ["attendance_date"] },
        { fields: ["status"] },
        { fields: ["request_type"] },
      ],
    }
  );

  return AttendanceRegularization;
};
