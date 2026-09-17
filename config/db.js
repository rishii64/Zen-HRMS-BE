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


// -- 1. USERS TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS users (
//     id SERIAL PRIMARY KEY,
//     employee_id VARCHAR(50) NOT NULL UNIQUE,
//     name VARCHAR(100) NOT NULL,
//     email VARCHAR(255) NOT NULL UNIQUE,
//     password VARCHAR(255) NOT NULL,
//     role VARCHAR(50) NOT NULL DEFAULT 'employee',
//     is_active BOOLEAN NOT NULL DEFAULT true,
//     current_salary NUMERIC(12, 2),
//     dept VARCHAR(100),
//     designation VARCHAR(100),
//     joining_date DATE,
//     reporting_manager VARCHAR(100) DEFAULT 'N/A',
//     phone_no VARCHAR(20),
//     kpi TEXT,
//     tabs_enabled BOOLEAN NOT NULL DEFAULT false,
//     enabled_tabs VARCHAR(255) NOT NULL DEFAULT '1,2,3,4',
//     dob DATE,
//     gender VARCHAR(20),
//     nationality VARCHAR(50),
//     address_current TEXT,
//     address_permanent TEXT,
//     emergency_contact_name VARCHAR(100),
//     emergency_contact_phone VARCHAR(20),
//     education TEXT,
//     family_details TEXT,
//     doc_resume VARCHAR(255),
//     doc_id VARCHAR(255),
//     doc_cert VARCHAR(255),
//     profile_photo VARCHAR(255),
//     blood_group VARCHAR(10),
//     religion VARCHAR(50),
//     total_experience VARCHAR(50),
//     marital_status VARCHAR(50),
//     certifications TEXT,
//     passport_visa TEXT,
//     bank_details TEXT,
//     document_status VARCHAR(50) NOT NULL DEFAULT 'Not Uploaded',
//     salary_structure TEXT,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
// );

// -- 2. EMPLOYEES TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS employees (
//     id SERIAL PRIMARY KEY,
//     employee_id VARCHAR(50) NOT NULL UNIQUE,
//     first_name VARCHAR(100),
//     last_name VARCHAR(100),
//     email VARCHAR(255) NOT NULL UNIQUE,
//     status VARCHAR(50) NOT NULL DEFAULT 'Active',
//     job_role VARCHAR(50) NOT NULL DEFAULT 'employee',
//     dept VARCHAR(100),
//     designation VARCHAR(100),
//     current_salary NUMERIC(12, 2),
//     joining_date DATE,
//     reporting_manager VARCHAR(100) DEFAULT 'N/A',
//     phone_no VARCHAR(20),
//     kpi TEXT,
//     tabs_enabled BOOLEAN NOT NULL DEFAULT false,
//     enabled_tabs VARCHAR(255) NOT NULL DEFAULT '1,2,3,4',
//     dob DATE,
//     gender VARCHAR(20),
//     nationality VARCHAR(50),
//     address_current TEXT,
//     address_permanent TEXT,
//     emergency_contact_name VARCHAR(100),
//     emergency_contact_phone VARCHAR(20),
//     education TEXT,
//     family_details TEXT,
//     doc_resume VARCHAR(255),
//     doc_id VARCHAR(255),
//     doc_cert VARCHAR(255),
//     profile_photo VARCHAR(255),
//     blood_group VARCHAR(10),
//     religion VARCHAR(50),
//     total_experience VARCHAR(50),
//     marital_status VARCHAR(50),
//     certifications TEXT,
//     passport_visa TEXT,
//     bank_details TEXT,
//     document_status VARCHAR(50) NOT NULL DEFAULT 'Not Uploaded',
//     salary_structure TEXT,
//     CONSTRAINT fk_employees_user FOREIGN KEY (employee_id) 
//         REFERENCES users(employee_id) ON UPDATE CASCADE ON DELETE CASCADE
// );

// -- 3. PASSWORD_RESETS TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS password_resets (
//     id SERIAL PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     otp VARCHAR(6) NOT NULL,
//     expires_at TIMESTAMPTZ NOT NULL,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT fk_password_resets_user FOREIGN KEY (email) 
//         REFERENCES users(email) ON UPDATE CASCADE ON DELETE CASCADE
// );

// -- 4. ATTENDANCE TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS attendance (
//     id SERIAL PRIMARY KEY,
//     employee_id VARCHAR(50) NOT NULL,
//     name VARCHAR(100) NOT NULL,
//     dept VARCHAR(100) NOT NULL,
//     date DATE NOT NULL,
//     check_in VARCHAR(20),
//     check_out VARCHAR(20),
//     work_hours NUMERIC(5, 2),
//     status VARCHAR(50) NOT NULL DEFAULT 'Present',
//     late_count INTEGER NOT NULL DEFAULT 0,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) 
//         REFERENCES users(employee_id) ON UPDATE CASCADE ON DELETE CASCADE
// );

// -- 5. SCHEDULES TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS schedules (
//     id SERIAL PRIMARY KEY,
//     employee_id VARCHAR(50) NOT NULL,
//     name VARCHAR(100) NOT NULL,
//     dept VARCHAR(100) NOT NULL,
//     designation VARCHAR(100),
//     shift_name VARCHAR(50) NOT NULL DEFAULT 'General Shift',
//     start_time VARCHAR(10) NOT NULL DEFAULT '10:00',
//     end_time VARCHAR(10) NOT NULL DEFAULT '19:00',
//     date DATE NOT NULL,
//     week_start DATE,
//     status VARCHAR(20) NOT NULL DEFAULT 'Published',
//     created_by VARCHAR(100),
//     notes TEXT,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT fk_schedules_employee FOREIGN KEY (employee_id) 
//         REFERENCES users(employee_id) ON UPDATE CASCADE ON DELETE CASCADE
// );

// -- 6. LEAVES TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS leaves (
//     id SERIAL PRIMARY KEY,
//     employee_id VARCHAR(255) NOT NULL,
//     name VARCHAR(255) NOT NULL,
//     dept VARCHAR(255) DEFAULT 'General',
//     leave_type VARCHAR(255) NOT NULL DEFAULT 'Casual Leave',
//     day_type VARCHAR(255) NOT NULL DEFAULT 'Full Day',
//     start_date DATE NOT NULL,
//     end_date DATE NOT NULL,
//     total_days REAL NOT NULL DEFAULT 1.0,
//     reason TEXT,
//     emergency_contact VARCHAR(255),
//     doc_url VARCHAR(255),
//     status VARCHAR(255) NOT NULL DEFAULT 'Pending',
//     approver VARCHAR(255),
//     comments TEXT,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT fk_leaves_employee FOREIGN KEY (employee_id) 
//         REFERENCES users(employee_id) ON UPDATE CASCADE ON DELETE CASCADE
// );

// -- 7. RESIGNATIONS TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS resignations (
//     id SERIAL PRIMARY KEY,
//     employee_id VARCHAR(50) NOT NULL,
//     name VARCHAR(100) NOT NULL,
//     email VARCHAR(255),
//     dept VARCHAR(100) DEFAULT 'General',
//     designation VARCHAR(100),
//     joining_date DATE,
//     last_working_date DATE NOT NULL,
//     notice_period VARCHAR(50) NOT NULL DEFAULT '1 month',
//     reason VARCHAR(200) NOT NULL,
//     reason_details TEXT,
//     schedule_exit_interview BOOLEAN NOT NULL DEFAULT false,
//     interview_preferred_date VARCHAR(100),
//     interview_mode VARCHAR(50) DEFAULT 'In person',
//     handover_person_id VARCHAR(50),
//     handover_person_name VARCHAR(100),
//     handover_target_date DATE,
//     handover_note TEXT,
//     reassign_items_to_id VARCHAR(50),
//     reassign_items_to_name VARCHAR(100),
//     email_forwarding_to_id VARCHAR(50),
//     email_forwarding_to_name VARCHAR(100),
//     ack_claims_expenses BOOLEAN NOT NULL DEFAULT false,
//     ack_final_pay BOOLEAN NOT NULL DEFAULT false,
//     ack_return_assets BOOLEAN NOT NULL DEFAULT false,
//     status VARCHAR(50) NOT NULL DEFAULT 'Pending Manager Approval',
//     manager_id VARCHAR(50),
//     manager_name VARCHAR(100),
//     manager_decision VARCHAR(50),
//     manager_comments TEXT,
//     manager_action_date TIMESTAMPTZ,
//     manager_recommended_lwd DATE,
//     hr_id VARCHAR(50),
//     hr_name VARCHAR(100),
//     hr_decision VARCHAR(50),
//     hr_comments TEXT,
//     hr_action_date TIMESTAMPTZ,
//     hr_confirmed_lwd DATE,
//     exit_interview_status VARCHAR(50) NOT NULL DEFAULT 'Not Scheduled',
//     exit_interview_date VARCHAR(100),
//     clearance_it_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
//     clearance_finance_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
//     clearance_admin_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
//     clearance_hr_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
//     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT fk_resignations_employee FOREIGN KEY (employee_id) 
//         REFERENCES users(employee_id) ON UPDATE CASCADE ON DELETE CASCADE
// );

// -- 8. PAYROLLS TABLE --------------------------------------------
// CREATE TABLE IF NOT EXISTS payrolls (
//     id SERIAL PRIMARY KEY,
//     employee_id VARCHAR(50) NOT NULL,
//     month_year VARCHAR(50) NOT NULL,
//     fixed_pay TEXT,               -- JSON: { basic, da, hra, conveyance, medical, allowance, total_fixed }
//     variable_pay TEXT,            -- JSON: { bonus, overtime, incentive, reimbursement, total_variable }
//     gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
//     attendance_summary TEXT,      -- JSON: { total_days, working_days, present_days, lop_days, lop_amount }
//     lop_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
//     tax_deductions TEXT,          -- JSON: { taxable_pay, tds, other_tax, total_tax }
//     statutory_deductions TEXT,    -- JSON: { pf, esi, pt, others, total_statutory }
//     total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
//     net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
//     status VARCHAR(50) NOT NULL DEFAULT 'Finalized',
//     payment_date DATE,
//     payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
//     remarks TEXT,
//     created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
//     CONSTRAINT fk_payrolls_employee FOREIGN KEY (employee_id) 
//         REFERENCES users(employee_id) ON UPDATE CASCADE ON DELETE CASCADE
// );


// -- PERFORMANCE INDEXES =====================================================================
// CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
// CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
// CREATE INDEX IF NOT EXISTS idx_schedules_emp_date ON schedules(employee_id, date);
// CREATE INDEX IF NOT EXISTS idx_leaves_emp_status ON leaves(employee_id, status);
// CREATE INDEX IF NOT EXISTS idx_resignations_emp_status ON resignations(employee_id, status);
// CREATE INDEX IF NOT EXISTS idx_payrolls_emp_month ON payrolls(employee_id, month_year);
// CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
