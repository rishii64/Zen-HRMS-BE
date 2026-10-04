require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "hrms",
  process.env.DB_USERNAME || "postgres",
  process.env.DB_PASSWORD || "rishiPDB",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    dialect: "postgres",
    timezone: "+05:30",
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      acquire: 20000,
      idle: 10000,
      evict: 5000,
    },
    dialectOptions: {
      connectTimeout: 10000,
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
const ITDeclaration = require("../model/itDeclarationModel")(sequelize);
const MediclaimPolicy = require("../model/mediclaimModel")(sequelize);
const MediclaimClaim = require("../model/mediclaimClaimModel")(sequelize);
const KpiTemplate = require("../model/kpiTemplateModel")(sequelize);
const KpiAssignment = require("../model/kpiAssignmentModel")(sequelize);
const KpiGoalItem = require("../model/kpiGoalItemModel")(sequelize);
const RecruitmentRequisition = require("../model/recruitmentRequisitionModel")(sequelize);
const RecruitmentCandidate = require("../model/recruitmentCandidateModel")(sequelize);
const Onboarding = require("../model/onboardingModel")(sequelize);
const Holiday = require("../model/holidayModel")(sequelize);
const CelebrationBroadcast = require("../model/celebrationModel")(sequelize);

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

// 9. User <-> ITDeclaration & Employee <-> ITDeclaration
User.hasMany(ITDeclaration, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "itDeclarations",
});
ITDeclaration.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

Employee.hasMany(ITDeclaration, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "itDeclarations",
});
ITDeclaration.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

// 10. Employee <-> MediclaimPolicy & MediclaimClaim
Employee.hasOne(MediclaimPolicy, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "mediclaimPolicy",
});
MediclaimPolicy.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

Employee.hasMany(MediclaimClaim, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "mediclaimClaims",
});
MediclaimClaim.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

// 11. Employee & User <-> KpiAssignment <-> KpiGoalItem
Employee.hasMany(KpiAssignment, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "kpiAssignments",
});
KpiAssignment.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employeeProfile",
});

User.hasMany(KpiAssignment, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "kpiAssignments",
});
KpiAssignment.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});
KpiAssignment.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

KpiAssignment.hasMany(KpiGoalItem, {
  foreignKey: "assignment_id",
  as: "goals",
  onDelete: "CASCADE",
});
KpiGoalItem.belongsTo(KpiAssignment, {
  foreignKey: "assignment_id",
  as: "assignment",
});

// 12. RecruitmentRequisition <-> RecruitmentCandidate
RecruitmentRequisition.hasMany(RecruitmentCandidate, {
  foreignKey: "requisition_id",
  as: "candidates",
  onDelete: "CASCADE",
});
RecruitmentCandidate.belongsTo(RecruitmentRequisition, {
  foreignKey: "requisition_id",
  as: "requisition",
});

// 13. RecruitmentCandidate <-> Onboarding & Employee <-> Onboarding
RecruitmentCandidate.hasOne(Onboarding, {
  foreignKey: "candidate_id",
  as: "onboarding",
  onDelete: "SET NULL",
});
Onboarding.belongsTo(RecruitmentCandidate, {
  foreignKey: "candidate_id",
  as: "candidate",
});

Employee.hasOne(Onboarding, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "onboarding",
});
Onboarding.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully.");

    // Fast, non-blocking check to ensure celebration_broadcasts table & index exist without catalog locking
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS celebration_broadcasts (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) DEFAULT 'birthday',
          employee_name VARCHAR(255) NOT NULL,
          event_date VARCHAR(50),
          title VARCHAR(255),
          message TEXT,
          created_by VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_celebration_active_created ON celebration_broadcasts (is_active, created_at DESC);
      `);
    } catch (tblErr) {
      console.warn("Could not ensure celebration_broadcasts table:", tblErr.message);
    }

    // Seed standard initial company holidays if none exist
    try {
      const hCount = await Holiday.count();
      if (hCount === 0) {
        const DEFAULT_HOLIDAYS = [
          { name: "New Year Day", day: "Thursday", date: "2026-01-01", month: "JAN", day_num: 1, type: "Public" },
          { name: "Republic Day", day: "Monday", date: "2026-01-26", month: "JAN", day_num: 26, type: "National" },
          { name: "Holi Festival", day: "Wednesday", date: "2026-03-25", month: "MAR", day_num: 25, type: "Festival" },
          { name: "Independence Day", day: "Saturday", date: "2026-08-15", month: "AUG", day_num: 15, type: "National" },
          { name: "Gandhi Jayanti", day: "Friday", date: "2026-10-02", month: "OCT", day_num: 2, type: "National" },
          { name: "Durga Puja (Maha Saptami)", day: "Saturday", date: "2026-10-17", month: "OCT", day_num: 17, type: "Festival" },
          { name: "Durga Puja (Maha Ashtami)", day: "Sunday", date: "2026-10-18", month: "OCT", day_num: 18, type: "Festival" },
          { name: "Durga Puja (Maha Navami)", day: "Tuesday", date: "2026-10-20", month: "OCT", day_num: 20, type: "Festival" },
          { name: "Durga Puja (Bijoya Dashami)", day: "Wednesday", date: "2026-10-21", month: "OCT", day_num: 21, type: "Festival" },
          { name: "Diwali / Deepavali", day: "Sunday", date: "2026-11-08", month: "NOV", day_num: 8, type: "Festival" },
          { name: "Christmas Day", day: "Friday", date: "2026-12-25", month: "DEC", day_num: 25, type: "Public" }
        ];
        await Holiday.bulkCreate(DEFAULT_HOLIDAYS);
        console.log("Default company holidays seeded successfully.");
      }
    } catch (seedErr) {
      console.warn("Could not seed default holidays:", seedErr.message);
    }

    console.log("PG ready for requests.");
  } catch (err) {
    console.error("Postgres connection error:", err);
    throw err;
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
  ITDeclaration,
  MediclaimPolicy,
  MediclaimClaim,
  KpiTemplate,
  KpiAssignment,
  KpiGoalItem,
  RecruitmentRequisition,
  RecruitmentCandidate,
  Onboarding,
  Holiday,
  CelebrationBroadcast,
};