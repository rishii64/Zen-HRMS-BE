require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "hrms",
  process.env.DB_USERNAME || "postgres",
  process.env.DB_PASSWORD || "rishiPDB",
  {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: "postgres",
    timezone: "+05:30",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Import models
const User = require("../model/auth/userModel")(sequelize);
const Employee = require("../model/employeeModel")(sequelize);
const PasswordReset = require("../model/auth/passwordResetModel")(sequelize);
const Attendance = require("../model/attendanceModel")(sequelize);
const Schedule = require("../model/scheduleModel")(sequelize);
const Leave = require("../model/leaveModel")(sequelize);
const Resignation = require("../model/resignationModel")(sequelize);
const Payroll = require("../model/payrollModel")(sequelize);

// Model Associations

// 1. User <-> Employee
User.hasOne(Employee, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "employeeProfile",
});
Employee.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "userAccount",
});

// 2. User <-> Attendance
User.hasMany(Attendance, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "attendanceLogs",
});
Attendance.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

// 3. Employee <-> Attendance
Employee.hasMany(Attendance, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "attendanceLogs",
});
Attendance.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

// 4. User <-> PasswordReset
User.hasMany(PasswordReset, {
  foreignKey: "email",
  sourceKey: "email",
  as: "passwordResets",
});
PasswordReset.belongsTo(User, {
  foreignKey: "email",
  targetKey: "email",
  as: "user",
});

// 5. User <-> Schedule & Employee <-> Schedule
User.hasMany(Schedule, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "schedules",
});
Schedule.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

Employee.hasMany(Schedule, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "schedules",
});
Schedule.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

// 6. User <-> Leave & Employee <-> Leave
User.hasMany(Leave, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "leaves",
});
Leave.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

Employee.hasMany(Leave, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "leaves",
});
Leave.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

// 7. User <-> Resignation & Employee <-> Resignation
User.hasMany(Resignation, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "resignations",
});
Resignation.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

Employee.hasMany(Resignation, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "resignations",
});
Resignation.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

// 8. User <-> Payroll & Employee <-> Payroll
User.hasMany(Payroll, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "payrolls",
});
Payroll.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

Employee.hasMany(Payroll, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "payrolls",
});
Payroll.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    // Sync models (alter table structure to match models if changed)
    await sequelize.sync({ alter: true });
    console.log("PG connected...");
  } catch (err) {
    console.error("Postgres connection error:", err);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB,
  User,
  Employee,
  PasswordReset,
  Attendance,
  Schedule,
  Leave,
  Resignation,
  Payroll,
};