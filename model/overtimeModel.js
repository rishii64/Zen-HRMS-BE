const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OvertimeTicket = sequelize.define(
    "OvertimeTicket",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      ticket_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },

      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      attendance_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      attendance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      shift_name: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: "General Shift",
      },

      shift_start: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "10:00",
      },

      shift_end: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "19:00",
      },

      check_in: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      check_out: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      total_work_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.0,
      },

      standard_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 8.0,
      },

      overtime_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      overtime_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      hourly_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      ot_multiplier: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1.5, // Standard overtime 1.5x, weekend/holiday 2.0x
      },

      estimated_payout: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      reason_for_ot: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      task_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      reporting_manager: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      reporting_manager_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Pending", // "Pending", "Approved", "Rejected"
      },

      reviewed_by: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      reviewed_by_name: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      approved_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },

      approved_payout: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },

      manager_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      payout_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "Unpaid", // "Unpaid", "Synced to Payroll", "Paid"
      },

      payroll_month: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },

      synced_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "overtime_tickets",
      timestamps: true,
      underscored: true,
    }
  );

  return OvertimeTicket;
};

