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
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
      min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,
      acquire: 60000,
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
const LeaveAllocation = require("../model/leaveAllocationModel")(sequelize);
const LeaveCarryForwardLog = require("../model/leaveCarryForwardLogModel")(sequelize);
const LeavePolicy = require("../model/leavePolicyModel")(sequelize);
const Resignation = require("../model/resignationModel")(sequelize);
const Payroll = require("../model/payrollModel")(sequelize);
const ITDeclaration = require("../model/itDeclarationModel")(sequelize);
const MediclaimPolicy = require("../model/mediclaimModel")(sequelize);
const MediclaimClaim = require("../model/mediclaimClaimModel")(sequelize);
const MediclaimHighlight = require("../model/mediclaimHighlightModel")(sequelize);
const MediclaimHospital = require("../model/mediclaimHospitalModel")(sequelize);
const KpiTemplate = require("../model/kpiTemplateModel")(sequelize);
const KpiAssignment = require("../model/kpiAssignmentModel")(sequelize);
const KpiGoalItem = require("../model/kpiGoalItemModel")(sequelize);
const PerformanceReview = require("../model/performanceReviewModel")(sequelize);
const ReviewQuestionItem = require("../model/reviewQuestionItemModel")(sequelize);
const RecruitmentRequisition = require("../model/recruitmentRequisitionModel")(sequelize);
const RecruitmentCandidate = require("../model/recruitmentCandidateModel")(sequelize);
const RecruitmentOffer = require("../model/recruitmentOfferModel")(sequelize);
const Onboarding = require("../model/onboardingModel")(sequelize);
const Holiday = require("../model/holidayModel")(sequelize);
const AdminTask = require("../model/adminTaskModel")(sequelize);
const HrEvent = require("../model/hrEventModel")(sequelize);
const TrainingProgram = require("../model/trainingProgramModel")(sequelize);
const TrainingSession = require("../model/trainingSessionModel")(sequelize);
const TrainingEnrollment = require("../model/trainingEnrollmentModel")(sequelize);
const TrainingAssessment = require("../model/trainingAssessmentModel")(sequelize);
const AssessmentSubmission = require("../model/assessmentSubmissionModel")(sequelize);
const TrainingFeedback = require("../model/trainingFeedbackModel")(sequelize);
const EmployeeCertification = require("../model/employeeCertificationModel")(sequelize);
const BiometricDevice = require("../model/biometricDeviceModel")(sequelize);
const BiometricPunch = require("../model/biometricPunchModel")(sequelize);
const FnfSettlement = require("../model/fnfSettlementModel")(sequelize);
const ExpenseClaim = require("../model/expenseClaimModel")(sequelize);
const ExpenseClaimItem = require("../model/expenseClaimItemModel")(sequelize);
const Department = require("../model/departmentModel")(sequelize);
const JobGrade = require("../model/jobGradeModel")(sequelize);
const Designation = require("../model/designationModel")(sequelize);

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

// 22. Expense Claims & Itemized Receipts
ExpenseClaim.hasMany(ExpenseClaimItem, {
  foreignKey: "claim_id",
  as: "items",
  onDelete: "CASCADE",
});
ExpenseClaimItem.belongsTo(ExpenseClaim, {
  foreignKey: "claim_id",
  as: "claim",
});

Employee.hasMany(ExpenseClaim, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "expenseClaims",
});
ExpenseClaim.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

User.hasMany(ExpenseClaim, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "expenseClaims",
});
ExpenseClaim.belongsTo(User, {
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

// 11B. PerformanceReview <-> ReviewQuestionItem & User/Employee
PerformanceReview.hasMany(ReviewQuestionItem, {
  foreignKey: "review_id",
  as: "questions",
  onDelete: "CASCADE",
});
ReviewQuestionItem.belongsTo(PerformanceReview, {
  foreignKey: "review_id",
  as: "review",
});

User.hasMany(PerformanceReview, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "performanceReviews",
});
PerformanceReview.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employee",
});

Employee.hasMany(PerformanceReview, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "performanceReviews",
});
PerformanceReview.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employeeProfile",
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

// 12b. RecruitmentOffer Associations
RecruitmentCandidate.hasOne(RecruitmentOffer, {
  foreignKey: "candidate_id",
  as: "offer",
  onDelete: "CASCADE",
});
RecruitmentOffer.belongsTo(RecruitmentCandidate, {
  foreignKey: "candidate_id",
  as: "candidate",
});

RecruitmentRequisition.hasMany(RecruitmentOffer, {
  foreignKey: "requisition_id",
  as: "offers",
  onDelete: "CASCADE",
});
RecruitmentOffer.belongsTo(RecruitmentRequisition, {
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

// 14. Training & Development Module Associations
TrainingProgram.hasMany(TrainingSession, {
  foreignKey: "program_id",
  as: "sessions",
  onDelete: "CASCADE",
});
TrainingSession.belongsTo(TrainingProgram, {
  foreignKey: "program_id",
  as: "program",
});

TrainingProgram.hasMany(TrainingEnrollment, {
  foreignKey: "program_id",
  as: "enrollments",
  onDelete: "CASCADE",
});
TrainingEnrollment.belongsTo(TrainingProgram, {
  foreignKey: "program_id",
  as: "program",
});

TrainingSession.hasMany(TrainingEnrollment, {
  foreignKey: "session_id",
  as: "sessionEnrollments",
  onDelete: "SET NULL",
});
TrainingEnrollment.belongsTo(TrainingSession, {
  foreignKey: "session_id",
  as: "session",
});

TrainingProgram.hasOne(TrainingAssessment, {
  foreignKey: "program_id",
  as: "assessment",
  onDelete: "CASCADE",
});
TrainingAssessment.belongsTo(TrainingProgram, {
  foreignKey: "program_id",
  as: "program",
});

TrainingAssessment.hasMany(AssessmentSubmission, {
  foreignKey: "assessment_id",
  as: "submissions",
  onDelete: "CASCADE",
});
AssessmentSubmission.belongsTo(TrainingAssessment, {
  foreignKey: "assessment_id",
  as: "assessment",
});

TrainingProgram.hasMany(TrainingFeedback, {
  foreignKey: "program_id",
  as: "feedbacks",
  onDelete: "CASCADE",
});
TrainingFeedback.belongsTo(TrainingProgram, {
  foreignKey: "program_id",
  as: "program",
});

Employee.hasMany(TrainingEnrollment, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "trainingEnrollments",
});
TrainingEnrollment.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employeeProfile",
});

Employee.hasMany(EmployeeCertification, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "certificationsList",
});
EmployeeCertification.belongsTo(Employee, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "employeeProfile",
});

EmployeeCertification.belongsTo(TrainingProgram, {
  foreignKey: "internal_program_id",
  as: "internalProgram",
});

// Biometric Hardware & Punch Associations
BiometricDevice.hasMany(BiometricPunch, {
  foreignKey: "device_id",
  as: "punches",
  onDelete: "SET NULL",
});
BiometricPunch.belongsTo(BiometricDevice, {
  foreignKey: "device_id",
  as: "device",
});

Attendance.hasMany(BiometricPunch, {
  foreignKey: "attendance_id",
  as: "biometricPunches",
  onDelete: "SET NULL",
});
BiometricPunch.belongsTo(Attendance, {
  foreignKey: "attendance_id",
  as: "attendance",
});


// 15. Full & Final (F&F) Settlement Associations
Resignation.hasOne(FnfSettlement, {
  foreignKey: "resignation_id",
  as: "fnfSettlement",
  onDelete: "SET NULL",
});
FnfSettlement.belongsTo(Resignation, {
  foreignKey: "resignation_id",
  as: "resignation",
});

User.hasMany(FnfSettlement, {
  foreignKey: "employee_id",
  sourceKey: "employee_id",
  as: "fnfSettlements",
});
FnfSettlement.belongsTo(User, {
  foreignKey: "employee_id",
  targetKey: "employee_id",
  as: "user",
});

// 23. Organization Structure Associations (Department, JobGrade, Designation)
Department.hasMany(Designation, {
  foreignKey: "department_id",
  as: "designations",
  onDelete: "SET NULL",
});
Designation.belongsTo(Department, {
  foreignKey: "department_id",
  as: "department",
});

JobGrade.hasMany(Designation, {
  foreignKey: "grade_id",
  as: "designations",
  onDelete: "RESTRICT",
});
Designation.belongsTo(JobGrade, {
  foreignKey: "grade_id",
  as: "grade",
});

Department.hasMany(Employee, {
  foreignKey: "department_id",
  as: "employees",
  onDelete: "SET NULL",
});
Employee.belongsTo(Department, {
  foreignKey: "department_id",
  as: "departmentProfile",
});

Designation.hasMany(Employee, {
  foreignKey: "designation_id",
  as: "employees",
  onDelete: "SET NULL",
});
Employee.belongsTo(Designation, {
  foreignKey: "designation_id",
  as: "designationProfile",
});

JobGrade.hasMany(Employee, {
  foreignKey: "grade_id",
  as: "employees",
  onDelete: "SET NULL",
});
Employee.belongsTo(JobGrade, {
  foreignKey: "grade_id",
  as: "gradeProfile",
});

Department.hasMany(User, {
  foreignKey: "department_id",
  as: "users",
  onDelete: "SET NULL",
});
User.belongsTo(Department, {
  foreignKey: "department_id",
  as: "departmentProfile",
});

Designation.hasMany(User, {
  foreignKey: "designation_id",
  as: "users",
  onDelete: "SET NULL",
});
User.belongsTo(Designation, {
  foreignKey: "designation_id",
  as: "designationProfile",
});

JobGrade.hasMany(User, {
  foreignKey: "grade_id",
  as: "users",
  onDelete: "SET NULL",
});
User.belongsTo(JobGrade, {
  foreignKey: "grade_id",
  as: "gradeProfile",
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    try {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS designation_id INTEGER;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_id INTEGER;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_manager_id VARCHAR(50);

        ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INTEGER;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation_id INTEGER;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS grade_id INTEGER;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id VARCHAR(50);

        CREATE TABLE IF NOT EXISTS departments (
          id SERIAL PRIMARY KEY,
          dept_code VARCHAR(30) NOT NULL UNIQUE,
          dept_name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          hod_employee_id VARCHAR(50),
          hod_name VARCHAR(150),
          parent_dept_id INTEGER,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS job_grades (
          id SERIAL PRIMARY KEY,
          grade_code VARCHAR(20) NOT NULL UNIQUE,
          grade_name VARCHAR(100) NOT NULL,
          rank_level INTEGER NOT NULL DEFAULT 1,
          min_salary DECIMAL(14, 2) NOT NULL DEFAULT 0.0,
          max_salary DECIMAL(14, 2) NOT NULL DEFAULT 0.0,
          notice_period_days INTEGER NOT NULL DEFAULT 30,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS designations (
          id SERIAL PRIMARY KEY,
          title VARCHAR(150) NOT NULL,
          code VARCHAR(50) NOT NULL UNIQUE,
          department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
          grade_id INTEGER NOT NULL REFERENCES job_grades(id) ON DELETE RESTRICT,
          job_family VARCHAR(100) NOT NULL DEFAULT 'General',
          is_hod_role BOOLEAN NOT NULL DEFAULT false,
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_designations_dept ON designations(department_id);
        CREATE INDEX IF NOT EXISTS idx_designations_grade ON designations(grade_id);
        CREATE INDEX IF NOT EXISTS idx_employees_dept_id ON employees(department_id);
        CREATE INDEX IF NOT EXISTS idx_employees_desig_id ON employees(designation_id);
        CREATE INDEX IF NOT EXISTS idx_employees_grade_id ON employees(grade_id);
        CREATE INDEX IF NOT EXISTS idx_users_dept_id ON users(department_id);
        CREATE INDEX IF NOT EXISTS idx_users_desig_id ON users(designation_id);
        CREATE INDEX IF NOT EXISTS idx_users_grade_id ON users(grade_id);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';

        CREATE TABLE IF NOT EXISTS admin_tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL DEFAULT 'Facilities & Maintenance',
          description TEXT,
          requester_name VARCHAR(150),
          requester_id VARCHAR(50),
          dept VARCHAR(100) DEFAULT 'General',
          priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
          status VARCHAR(50) NOT NULL DEFAULT 'Pending',
          due_date DATE,
          assigned_to VARCHAR(150) DEFAULT 'Admin Team',
          completed_at TIMESTAMP WITH TIME ZONE,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS hr_events (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(150) NOT NULL DEFAULT 'TATA Steel',
          branch_location VARCHAR(150) NOT NULL DEFAULT 'Kolkata HQ',
          address TEXT,
          event_name VARCHAR(255) NOT NULL,
          event_category VARCHAR(100) NOT NULL DEFAULT 'Event',
          event_date DATE NOT NULL,
          start_time VARCHAR(50) DEFAULT '10:00 AM',
          end_time VARCHAR(50) DEFAULT '01:00 PM',
          content TEXT NOT NULL,
          sign_off VARCHAR(100) NOT NULL DEFAULT 'HR Team',
          target_audience VARCHAR(100) NOT NULL DEFAULT 'All Employees',
          status VARCHAR(50) NOT NULL DEFAULT 'Draft',
          created_by_id VARCHAR(50),
          created_by_name VARCHAR(150),
          created_by_role VARCHAR(50),
          emails_sent_count INTEGER NOT NULL DEFAULT 0,
          sent_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mediclaim_highlights (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          badge VARCHAR(100) NOT NULL DEFAULT 'Included',
          badge_color VARCHAR(50) NOT NULL DEFAULT 'emerald',
          description TEXT NOT NULL,
          icon VARCHAR(50) NOT NULL DEFAULT 'shield',
          order_index INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mediclaim_hospitals (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          city VARCHAR(150) NOT NULL,
          area VARCHAR(255),
          address TEXT,
          helpline VARCHAR(100) DEFAULT '+91 1800 425 9449',
          cashless BOOLEAN NOT NULL DEFAULT TRUE,
          hospital_type VARCHAR(100) NOT NULL DEFAULT 'Multi Specialty',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_device_id VARCHAR(100);

        CREATE TABLE IF NOT EXISTS biometric_devices (
          id SERIAL PRIMARY KEY,
          device_name VARCHAR(150) NOT NULL,
          device_serial VARCHAR(100) NOT NULL UNIQUE,
          device_type VARCHAR(50) NOT NULL DEFAULT 'ZKTeco',
          ip_address VARCHAR(50) DEFAULT '192.168.1.201',
          port INTEGER NOT NULL DEFAULT 4370,
          location VARCHAR(150) NOT NULL DEFAULT 'Main Reception HQ',
          api_key VARCHAR(100) NOT NULL UNIQUE,
          status VARCHAR(30) NOT NULL DEFAULT 'ONLINE',
          last_sync_at TIMESTAMPTZ,
          last_ping_at TIMESTAMPTZ,
          total_punches_synced INTEGER NOT NULL DEFAULT 0,
          sync_mode VARCHAR(50) NOT NULL DEFAULT 'REALTIME_PUSH',
          is_active BOOLEAN NOT NULL DEFAULT true,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS biometric_punches (
          id SERIAL PRIMARY KEY,
          device_id INTEGER REFERENCES biometric_devices(id) ON DELETE SET NULL,
          device_name VARCHAR(150),
          device_serial VARCHAR(100),
          biometric_user_id VARCHAR(100) NOT NULL,
          employee_id VARCHAR(50),
          punch_time VARCHAR(20) NOT NULL,
          punch_date DATE NOT NULL,
          punch_type VARCHAR(30) NOT NULL DEFAULT 'AUTO',
          verification_type VARCHAR(50) NOT NULL DEFAULT 'FINGERPRINT',
          sync_status VARCHAR(50) NOT NULL DEFAULT 'PROCESSED',
          punch_category VARCHAR(50) NOT NULL DEFAULT 'FIRST_ENTRY',
          attendance_id INTEGER,
          raw_data TEXT,
          error_message TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS punch_category VARCHAR(50) DEFAULT 'FIRST_ENTRY';

        CREATE INDEX IF NOT EXISTS idx_biometric_punches_emp_date ON biometric_punches (employee_id, punch_date);
        CREATE INDEX IF NOT EXISTS idx_biometric_punches_user_date ON biometric_punches (biometric_user_id, punch_date);

        CREATE TABLE IF NOT EXISTS leave_policies (
          id SERIAL PRIMARY KEY,
          leave_code VARCHAR(20) NOT NULL UNIQUE,
          leave_name VARCHAR(100) NOT NULL,
          default_annual_quota REAL NOT NULL DEFAULT 0.0,
          can_carry_forward BOOLEAN NOT NULL DEFAULT false,
          carry_forward_max_years INTEGER NOT NULL DEFAULT 0,
          max_stack_limit INTEGER NOT NULL DEFAULT 0,
          applicable_gender VARCHAR(20) NOT NULL DEFAULT 'All',
          employment_type_eligibility VARCHAR(50) NOT NULL DEFAULT 'All',
          color VARCHAR(30) DEFAULT '#3b82f6',
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS leave_allocations (
          id SERIAL PRIMARY KEY,
          employee_id VARCHAR(50) NOT NULL,
          employee_name VARCHAR(150),
          dept VARCHAR(100) DEFAULT 'General',
          year INTEGER NOT NULL DEFAULT 2026,
          leave_type VARCHAR(100) NOT NULL,
          leave_code VARCHAR(20) NOT NULL,
          allocated_days REAL NOT NULL DEFAULT 0.0,
          carried_forward REAL NOT NULL DEFAULT 0.0,
          used_days REAL NOT NULL DEFAULT 0.0,
          lapsed_days REAL NOT NULL DEFAULT 0.0,
          balance REAL NOT NULL DEFAULT 0.0,
          can_carry_forward BOOLEAN NOT NULL DEFAULT false,
          max_stack_limit INTEGER NOT NULL DEFAULT 45,
          carry_forward_max_years INTEGER NOT NULL DEFAULT 3,
          notes TEXT,
          allocated_by VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT leave_allocations_emp_year_code_uniq UNIQUE (employee_id, year, leave_code)
        );

        CREATE TABLE IF NOT EXISTS leave_carry_forward_logs (
          id SERIAL PRIMARY KEY,
          employee_id VARCHAR(50) NOT NULL,
          employee_name VARCHAR(150),
          dept VARCHAR(100),
          leave_code VARCHAR(20) NOT NULL,
          leave_type VARCHAR(100) NOT NULL,
          from_year INTEGER NOT NULL,
          to_year INTEGER NOT NULL,
          unutilized_balance REAL NOT NULL DEFAULT 0.0,
          years_carried INTEGER NOT NULL DEFAULT 1,
          eligible_carry_forward REAL NOT NULL DEFAULT 0.0,
          excess_lapsed REAL NOT NULL DEFAULT 0.0,
          actual_carried_forward REAL NOT NULL DEFAULT 0.0,
          total_stacked REAL NOT NULL DEFAULT 0.0,
          expiry_year INTEGER NOT NULL,
          notes TEXT,
          processed_by VARCHAR(100) DEFAULT 'HR',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_leave_allocations_emp_year ON leave_allocations (employee_id, year);
        CREATE INDEX IF NOT EXISTS idx_leave_cf_logs_emp_year ON leave_carry_forward_logs (employee_id, to_year);

        CREATE TABLE IF NOT EXISTS fnf_settlements (
          id SERIAL PRIMARY KEY,
          resignation_id INTEGER,
          employee_id VARCHAR(50) NOT NULL,
          employee_name VARCHAR(100) NOT NULL,
          dept VARCHAR(100) DEFAULT 'General',
          designation VARCHAR(100),
          joining_date DATE,
          resignation_date DATE,
          last_working_date DATE NOT NULL,
          settlement_date DATE,
          status VARCHAR(50) NOT NULL DEFAULT 'Draft',
          monthly_gross DECIMAL(12, 2) NOT NULL DEFAULT 0,
          monthly_basic DECIMAL(12, 2) NOT NULL DEFAULT 0,
          per_day_rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
          notice_period_days INTEGER NOT NULL DEFAULT 30,
          notice_served_days INTEGER NOT NULL DEFAULT 30,
          notice_shortfall_days INTEGER NOT NULL DEFAULT 0,
          notice_waiver_granted BOOLEAN NOT NULL DEFAULT false,
          notice_recovery_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          unpaid_salary_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
          unpaid_salary_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          leave_encashment_days DECIMAL(6, 2) NOT NULL DEFAULT 0,
          leave_encashment_rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
          leave_encashment_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          gratuity_eligible BOOLEAN NOT NULL DEFAULT false,
          tenure_years DECIMAL(6, 2) NOT NULL DEFAULT 0,
          gratuity_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          bonus_incentive_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          reimbursement_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          other_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
          other_earnings_remarks VARCHAR(255),
          total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
          loan_outstanding_recovery DECIMAL(12, 2) NOT NULL DEFAULT 0,
          advance_salary_recovery DECIMAL(12, 2) NOT NULL DEFAULT 0,
          asset_damage_recovery DECIMAL(12, 2) NOT NULL DEFAULT 0,
          statutory_pf DECIMAL(12, 2) NOT NULL DEFAULT 0,
          statutory_esi DECIMAL(12, 2) NOT NULL DEFAULT 0,
          statutory_pt DECIMAL(12, 2) NOT NULL DEFAULT 0,
          tax_tds_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
          other_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
          other_deductions_remarks VARCHAR(255),
          total_deductions DECIMAL(12, 2) NOT NULL DEFAULT 0,
          net_payable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          settlement_type VARCHAR(50) NOT NULL DEFAULT 'PAYABLE_TO_EMPLOYEE',
          payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
          payment_date DATE,
          payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
          payment_reference VARCHAR(100),
          bank_name VARCHAR(100),
          bank_account_no VARCHAR(50),
          ifsc_code VARCHAR(30),
          remarks TEXT,
          prepared_by VARCHAR(100),
          approved_by VARCHAR(100),
          relieving_letter_issued BOOLEAN NOT NULL DEFAULT false,
          relieving_letter_ref_no VARCHAR(100),
          relieving_letter_date DATE,
          experience_letter_issued BOOLEAN NOT NULL DEFAULT false,
          experience_letter_ref_no VARCHAR(100),
          experience_letter_date DATE,
          conduct_remarks VARCHAR(100) DEFAULT 'Exemplary',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_fnf_emp_id ON fnf_settlements (employee_id);
        CREATE INDEX IF NOT EXISTS idx_fnf_resignation_id ON fnf_settlements (resignation_id);

        CREATE TABLE IF NOT EXISTS recruitment_offers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          offer_code VARCHAR(50) NOT NULL UNIQUE,
          candidate_id UUID NOT NULL,
          requisition_id UUID NOT NULL,
          candidate_name VARCHAR(150) NOT NULL,
          candidate_email VARCHAR(255) NOT NULL,
          candidate_phone VARCHAR(50),
          candidate_address TEXT,
          department VARCHAR(100) NOT NULL,
          designation VARCHAR(150) NOT NULL,
          reporting_manager VARCHAR(150),
          work_location VARCHAR(100) NOT NULL DEFAULT 'Kolkata HQ',
          employment_type VARCHAR(50) NOT NULL DEFAULT 'Full Time (Probation)',
          probation_period_months INTEGER NOT NULL DEFAULT 6,
          notice_period_days INTEGER NOT NULL DEFAULT 30,
          joining_date DATE NOT NULL,
          offer_expiry_date DATE NOT NULL,
          annual_ctc DECIMAL(14, 2) NOT NULL,
          monthly_gross DECIMAL(14, 2) NOT NULL,
          monthly_basic DECIMAL(14, 2) NOT NULL,
          monthly_hra DECIMAL(14, 2) NOT NULL,
          monthly_special_allowance DECIMAL(14, 2) NOT NULL DEFAULT 0,
          monthly_conveyance DECIMAL(14, 2) NOT NULL DEFAULT 0,
          monthly_medical DECIMAL(14, 2) NOT NULL DEFAULT 0,
          annual_performance_bonus DECIMAL(14, 2) NOT NULL DEFAULT 0,
          employer_pf_annual DECIMAL(14, 2) NOT NULL DEFAULT 0,
          other_benefits_notes TEXT,
          salary_breakdown_json JSONB DEFAULT '{}'::jsonb,
          terms_conditions TEXT,
          approval_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
          current_approval_stage VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
          hod_id VARCHAR(50),
          hod_name VARCHAR(100),
          hod_decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          hod_decision_at TIMESTAMPTZ,
          hod_comments TEXT,
          management_id VARCHAR(50),
          management_name VARCHAR(100),
          management_decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          management_decision_at TIMESTAMPTZ,
          management_comments TEXT,
          offer_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
          sent_to_candidate_at TIMESTAMPTZ,
          sent_by_id VARCHAR(50),
          sent_by_name VARCHAR(100),
          acceptance_token VARCHAR(100) UNIQUE,
          candidate_decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          candidate_decided_at TIMESTAMPTZ,
          candidate_signature_name VARCHAR(150),
          candidate_confirmed_joining_date DATE,
          candidate_comments TEXT,
          candidate_ip_address VARCHAR(100),
          candidate_user_agent VARCHAR(255),
          official_signatory_name VARCHAR(100) NOT NULL DEFAULT 'Ms. Priyanka Mukherjee',
          official_signatory_title VARCHAR(100) NOT NULL DEFAULT 'Head - Human Resources',
          created_by_id VARCHAR(50),
          created_by_name VARCHAR(100),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_recruitment_offers_cand_id ON recruitment_offers (candidate_id);
        CREATE INDEX IF NOT EXISTS idx_recruitment_offers_req_id ON recruitment_offers (requisition_id);

        CREATE TABLE IF NOT EXISTS expense_claims (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          claim_number VARCHAR(50) NOT NULL UNIQUE,
          employee_id VARCHAR(50) NOT NULL,
          employee_name VARCHAR(150) NOT NULL,
          employee_email VARCHAR(150),
          department VARCHAR(100),
          designation VARCHAR(100),
          title VARCHAR(255) NOT NULL,
          claim_type VARCHAR(50) NOT NULL DEFAULT 'TRAVEL',
          travel_start_date DATE,
          travel_end_date DATE,
          travel_destination VARCHAR(200),
          purpose TEXT,
          total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          approved_amount DECIMAL(12, 2) DEFAULT 0.00,
          currency VARCHAR(10) NOT NULL DEFAULT 'INR',
          status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
          current_stage VARCHAR(50) NOT NULL DEFAULT 'MANAGER',
          manager_id VARCHAR(50),
          manager_name VARCHAR(150),
          manager_decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          manager_decision_at TIMESTAMPTZ,
          manager_comments TEXT,
          finance_id VARCHAR(50),
          finance_name VARCHAR(150),
          finance_decision VARCHAR(50) NOT NULL DEFAULT 'PENDING',
          finance_decision_at TIMESTAMPTZ,
          finance_comments TEXT,
          payment_mode VARCHAR(50),
          payment_reference VARCHAR(100),
          disbursed_at TIMESTAMPTZ,
          disbursed_by_id VARCHAR(50),
          disbursed_by_name VARCHAR(150),
          payment_notes TEXT,
          hr_override_id VARCHAR(50),
          hr_override_name VARCHAR(150),
          hr_override_notes TEXT,
          supporting_documents JSONB DEFAULT '[]'::jsonb,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_expense_claims_emp_id ON expense_claims (employee_id);
        CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims (status);
        CREATE INDEX IF NOT EXISTS idx_expense_claims_stage ON expense_claims (current_stage);
        CREATE INDEX IF NOT EXISTS idx_expense_claims_dept ON expense_claims (department);

        CREATE TABLE IF NOT EXISTS expense_claim_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          claim_id UUID NOT NULL,
          expense_date DATE NOT NULL,
          category VARCHAR(100) NOT NULL,
          merchant_name VARCHAR(150),
          description TEXT,
          bill_number VARCHAR(100),
          amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          approved_amount DECIMAL(10, 2),
          tax_amount DECIMAL(10, 2) DEFAULT 0.00,
          receipt_url VARCHAR(500),
          receipt_filename VARCHAR(255),
          status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
          remarks VARCHAR(255),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_claim_items_claim_id ON expense_claim_items (claim_id);
        CREATE INDEX IF NOT EXISTS idx_claim_items_category ON expense_claim_items (category);
        CREATE INDEX IF NOT EXISTS idx_recruitment_offers_token ON recruitment_offers (acceptance_token);
        CREATE INDEX IF NOT EXISTS idx_recruitment_offers_status ON recruitment_offers (offer_status);

      `);
    } catch (migErr) {
      console.warn("Schema initialization check note:", migErr.message);
    }
    // In production, schema is managed via PG_Complete_Schema.sql to prevent lock contention
    if (process.env.NODE_ENV !== "production") {
      try {
        await sequelize.sync({ alter: true });
      } catch (syncErr) {
        console.warn("Sequelize sync warning (schema migration available in PG Doc.txt):", syncErr.message);
      }
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

    // Seed default leave policies if not present
    try {
      const pCount = await LeavePolicy.count();
      if (pCount === 0) {
        await LeavePolicy.bulkCreate([
          { leave_code: "CL", leave_name: "Casual Leave", default_annual_quota: 5, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0, applicable_gender: "All", employment_type_eligibility: "All", color: "#10b981", description: "5 Days Yearly for all staff (cannot carry forward)" },
          { leave_code: "SL", leave_name: "Sick Leave", default_annual_quota: 5, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0, applicable_gender: "All", employment_type_eligibility: "Permanent", color: "#3b82f6", description: "5 Days Yearly for permanent staff (cannot carry forward)" },
          { leave_code: "EL", leave_name: "Earned Leave", default_annual_quota: 12, can_carry_forward: true, carry_forward_max_years: 3, max_stack_limit: 45, applicable_gender: "All", employment_type_eligibility: "Permanent", color: "#8b5cf6", description: "12 Days Yearly. Carry-forward up to 3 years, stacking up to 45 leaves beyond which will be lapsed." },
          { leave_code: "PL", leave_name: "Privilege Leave", default_annual_quota: 15, can_carry_forward: true, carry_forward_max_years: 3, max_stack_limit: 45, applicable_gender: "All", employment_type_eligibility: "Permanent", color: "#6366f1", description: "15 Days Yearly. Carry-forward up to 3 years, stacking up to 45 leaves beyond which will be lapsed." },
          { leave_code: "ML", leave_name: "Maternity Leave", default_annual_quota: 90, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0, applicable_gender: "Female", employment_type_eligibility: "Permanent", color: "#ec4899", description: "90 Days Maternity Leave for female permanent staff" },
          { leave_code: "PAT", leave_name: "Paternity Leave", default_annual_quota: 5, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0, applicable_gender: "Male", employment_type_eligibility: "Permanent", color: "#06b6d4", description: "5 Days Paternity Leave for male permanent staff" },
          { leave_code: "CO", leave_name: "Comp Off", default_annual_quota: 0, can_carry_forward: false, carry_forward_max_years: 0, max_stack_limit: 0, applicable_gender: "All", employment_type_eligibility: "All", color: "#f97316", description: "Compensatory Off credited for approved duty" }
        ]);
        console.log("Default Leave Policies seeded successfully.");
      }
    } catch (polSeedErr) {
      console.warn("Could not seed default leave policies:", polSeedErr.message);
    }
      }
    } catch (seedErr) {
      console.warn("Could not seed default holidays:", seedErr.message);
    }

    // Automatically ensure hr_events table and columns exist
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS hr_events (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(150) NOT NULL DEFAULT 'Zentelex',
          branch_location VARCHAR(150) NOT NULL DEFAULT 'Kolkata HQ',
          address TEXT,
          event_name VARCHAR(255) NOT NULL,
          event_category VARCHAR(100) NOT NULL DEFAULT 'Event',
          event_date DATE NOT NULL,
          start_time VARCHAR(50) DEFAULT '10:00 AM',
          end_time VARCHAR(50) DEFAULT '01:00 PM',
          content TEXT NOT NULL,
          sign_off VARCHAR(100) NOT NULL DEFAULT 'HR Team',
          target_audience VARCHAR(100) NOT NULL DEFAULT 'All Employees',
          status VARCHAR(50) NOT NULL DEFAULT 'Draft',
          theme VARCHAR(50) NOT NULL DEFAULT 'purple',
          created_by_id VARCHAR(50),
          created_by_name VARCHAR(150),
          created_by_role VARCHAR(50),
          emails_sent_count INTEGER NOT NULL DEFAULT 0,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT 'purple';
      `);
    } catch (thmErr) {
      // ignore
    }

    // Seed sample initial HR event if none exist
    try {
      const eCount = await HrEvent.count();
      if (eCount === 0) {
        await HrEvent.create({
          company_name: "TATA Steel",
          branch_location: "Kolkata HQ (Main Campus)",
          address: "Auditorium Hall 1, 5th Floor, Tower B, Salt Lake Sector V, Kolkata 700091",
          event_name: "Annual Corporate Townhall & Tech Innovation Showcase 2026",
          event_category: "Townhall",
          event_date: "2026-10-28",
          start_time: "10:30 AM",
          end_time: "01:30 PM",
          content: "We cordially invite all company employees to the Annual Corporate Townhall 2026! Agenda includes executive keynote by the leadership team, quarterly business performance review, employee milestone recognitions, and preview of upcoming enterprise initiatives followed by lunch & networking.",
          sign_off: "HR Team",
          target_audience: "All Employees",
          status: "Sent",
          created_by_name: "HR Operations Desk",
          created_by_role: "hr",
          emails_sent_count: 5,
          sent_at: new Date(),
        });
        console.log("Initial default HR event seeded.");
      }
    } catch (eventSeedErr) {
      console.warn("Could not seed default HR event:", eventSeedErr.message);
    }

    // Ensure performance indexes exist for high-traffic tables (attendance, schedules, holidays)
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance (employee_id, date);
        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);
        CREATE INDEX IF NOT EXISTS idx_attendance_dept_date ON attendance (dept, date);
        CREATE INDEX IF NOT EXISTS idx_schedules_emp_date ON schedules (employee_id, date);
        CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays (date);
      `);
    } catch (idxErr) {
      console.warn("Performance indexing check note:", idxErr.message);
    }

    // Automatically ensure system role 'employees' is updated to canonical 'employee'
    try {
      await sequelize.query(`
        UPDATE users SET role = 'employee' WHERE LOWER(role) = 'employees';
        UPDATE employees SET job_role = 'employee' WHERE LOWER(job_role) = 'employees';
      `);
    } catch (roleErr) {
      // ignore
    }

    // Automatically ensure users table has all required columns
    try {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS notice_acknowledged BOOLEAN DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS facilities TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS esi_threshold NUMERIC;
      `);
    } catch (userColErr) {
      // ignore
    }

    // Automatically ensure resignations table has admin approval tracking columns
    try {
      await sequelize.query(`
        ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_id VARCHAR(50);
        ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_name VARCHAR(100);
        ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_decision VARCHAR(50);
        ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_comments TEXT;
        ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_action_date TIMESTAMPTZ;
      `);
    } catch (colErr) {
      // ignore
    }

    // Automatically ensure training tables support company_logo_url
    try {
      await sequelize.query(`
        ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
        ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
      `);
    } catch (trainColErr) {
      // ignore
    }

    // Seed initial training programs if none exist
    try {
      const tpCount = await TrainingProgram.count();
      if (tpCount === 0) {
        const poshProgram = await TrainingProgram.create({
          code: "TRN-2026-001",
          title: "Corporate POSH & Workplace Ethics 2026",
          description: "Comprehensive annual compliance training on Prevention of Sexual Harassment (POSH), workplace ethics, diversity & inclusion, and respectful corporate communication.",
          objectives: "Understand legal definitions of harassment, ICC complaint procedure, gender sensitivity, bystander intervention, and maintaining a dignified professional workspace.",
          type: "HR",
          category: "Compliance",
          delivery_mode: "Blended",
          department: null,
          target_audience_type: "ALL",
          is_mandatory: true,
          is_onboarding_mandatory: true,
          duration_hours: 3.0,
          completion_criteria: "Complete interactive session attendance and achieve at least 70% in the post-training assessment.",
          trainer_type: "INTERNAL",
          trainer_name: "Anita Sharma (Legal & Compliance)",
          trainer_email: "anita.sharma@tata.com",
          venue: "Conference Room A, 4th Floor, Kolkata HQ",
          meeting_link: "https://meet.google.com/xyz-posh-2026",
          session_instructions: "Please review the attached POSH handbook before attending. Assessment will unlock immediately after session attendance.",
          learning_materials: [
            { name: "POSH Policy Handbook 2026.pdf", type: "pdf", url: "/api/uploads/posh_handbook.pdf" },
            { name: "ICC Members Contact & Guidelines.pdf", type: "pdf", url: "/api/uploads/icc_guidelines.pdf" }
          ],
          status: "Published",
          proposal_status: "Approved",
          created_by_name: "HR Operations Desk",
          created_by_role: "hr",
          start_date: "2026-10-25",
          end_date: "2026-10-27",
          due_date: "2026-11-15",
          capacity: 100,
          assessment_required: true,
          feedback_required: true,
          certificate_provided: true,
        });

        // Seed session
        await TrainingSession.create({
          program_id: poshProgram.id,
          batch_name: "Cohort 1 - Morning Batch",
          session_date: "2026-10-25",
          start_time: "10:30 AM",
          end_time: "01:30 PM",
          venue_or_link: "Conference Room A / GMeet Live",
          trainer_name: "Anita Sharma",
          capacity: 50,
          status: "Scheduled",
        });

        // Seed assessment
        await TrainingAssessment.create({
          program_id: poshProgram.id,
          title: "POSH & Workplace Conduct Certification Assessment 2026",
          instructions: "Answer all questions. Assessment includes Multiple Choice, True/False, and short scenario-based questions. Passing percentage is 70%.",
          duration_minutes: 25,
          total_marks: 30,
          pass_percentage: 70,
          max_attempts: 3,
          questions: [
            {
              id: "q_1",
              type: "MCQ",
              question: "Under the POSH Act, what is the statutory time period within which an aggrieved woman can file a written complaint to the Internal Committee (IC)?",
              options: [
                "Within 1 month from the date of the incident",
                "Within 3 months from the date of the incident",
                "Within 6 months from the date of the incident",
                "Within 1 year from the date of the incident"
              ],
              correct_answer: "Within 3 months from the date of the incident",
              marks: 10,
              explanation: "Under Section 9 of the POSH Act, a written complaint must be submitted to the Internal Committee within 3 months of the incident."
            },
            {
              id: "q_2",
              type: "TRUE_FALSE",
              question: "Workplace under the POSH Act includes any place visited by the employee arising out of or during the course of employment, including transportation provided by the employer.",
              options: ["True", "False"],
              correct_answer: "True",
              marks: 10,
              explanation: "The Act defines an extended workplace which covers official trips, offsite events, client locations, and company transport."
            },
            {
              id: "q_3",
              type: "DESCRIPTIVE",
              question: "Describe what proactive steps you would take as a team member or lead if you witness inappropriate or uncomfortable conduct towards a colleague.",
              correct_answer: "",
              marks: 10,
              explanation: "Should include active bystander intervention, checking in with the colleague, maintaining confidentiality, and reporting through appropriate HR/IC channels."
            }
          ],
          is_active: true,
          allow_retake: true,
        });

        // Seed Departmental program
        await TrainingProgram.create({
          code: "TRN-2026-002",
          title: "Modern React 19, TypeScript & Next.js Architecture",
          description: "Advanced engineering workshop for frontend and full-stack software engineers covering React 19 server actions, TypeScript 5.x patterns, and scalable micro-frontend architecture.",
          objectives: "Master state management, clean architecture, performance profiling, and test-driven UI development.",
          type: "DEPARTMENTAL",
          category: "Technical",
          delivery_mode: "Online",
          department: "IT / Engineering",
          target_audience_type: "DEPARTMENT",
          is_mandatory: false,
          is_onboarding_mandatory: false,
          duration_hours: 6.0,
          completion_criteria: "Attend live coding labs and submit repository link.",
          trainer_type: "INTERNAL",
          trainer_name: "Rishi Kumar (Lead Architect)",
          trainer_email: "rishi.kumar@tata.com",
          meeting_link: "https://zoom.us/j/9988776655",
          session_instructions: "Node.js v20+ and VSCode required. Git clone the starter repo before attending.",
          learning_materials: [
            { name: "React 19 Deep Dive Slide Deck.pdf", type: "pdf", url: "/api/uploads/react19_deck.pdf" }
          ],
          status: "Published",
          proposal_status: "Approved",
          created_by_name: "Engineering HOD",
          created_by_role: "hod",
          start_date: "2026-11-05",
          end_date: "2026-11-06",
          due_date: "2026-11-20",
          capacity: 40,
          assessment_required: false,
          feedback_required: true,
          certificate_provided: true,
        });

        console.log("Initial default Training & Development programs seeded.");
      }
    } catch (trainSeedErr) {
      console.warn("Could not seed default training programs:", trainSeedErr.message);
    }


    // Seed default biometric devices if none exist
    try {
      const devCount = await BiometricDevice.count();
      if (devCount === 0) {
        await BiometricDevice.bulkCreate([
          {
            device_name: "SilkBio-101 Reception Terminal",
            device_serial: "BIO-ZKT-HQ-01",
            device_type: "ZKTeco",
            ip_address: "192.168.1.201",
            port: 4370,
            location: "Main Reception (Tower A, Ground Floor)",
            api_key: "BIO-KEY-HQ-REC-8849",
            status: "ONLINE",
            sync_mode: "REALTIME_PUSH",
            is_active: true,
            notes: "Primary employee biometric terminal with facial recognition and fingerprint sensor.",
          },
          {
            device_name: "eSSL BioFinger - IT Wing",
            device_serial: "BIO-ESSL-IT-02",
            device_type: "eSSL",
            ip_address: "192.168.1.205",
            port: 4370,
            location: "4th Floor IT Development Center",
            api_key: "BIO-KEY-IT-WING-7192",
            status: "ONLINE",
            sync_mode: "REALTIME_PUSH",
            is_active: true,
            notes: "Secondary biometric access terminal with smart card and optical fingerprint sensor.",
          },
        ]);
        console.log("Default Biometric Devices seeded successfully.");
      }
    } catch (bioDevErr) {
      console.warn("Could not seed default biometric devices:", bioDevErr.message);
    }

    // Seed default Job Grades, Departments, and Designations
    try {
      const gradeCount = await JobGrade.count();
      if (gradeCount === 0) {
        await JobGrade.bulkCreate([
          { grade_code: "L1", grade_name: "Intern / Trainee", rank_level: 1, min_salary: 200000, max_salary: 450000, notice_period_days: 15, description: "Interns, apprentices, and entry-level trainee roles" },
          { grade_code: "L2", grade_name: "Executive / Associate", rank_level: 2, min_salary: 350000, max_salary: 800000, notice_period_days: 30, description: "Individual contributors: Executives, Software Engineers, BDAs, Associates" },
          { grade_code: "L3", grade_name: "Sr. Executive / Specialist", rank_level: 3, min_salary: 650000, max_salary: 1300000, notice_period_days: 45, description: "Experienced staff: Sr. Executives, Sr. Engineers, Sr. Accountants, Supervisors" },
          { grade_code: "L4", grade_name: "Asst. Manager / Lead", rank_level: 4, min_salary: 1100000, max_salary: 1900000, notice_period_days: 60, description: "First-line leadership: Assistant Managers, Technical Leads, Team Leads" },
          { grade_code: "L5", grade_name: "Deputy Manager", rank_level: 5, min_salary: 1600000, max_salary: 2500000, notice_period_days: 60, description: "Deputy operational leadership: Deputy Managers, Senior Functional Leads" },
          { grade_code: "L6", grade_name: "Manager", rank_level: 6, min_salary: 2100000, max_salary: 3400000, notice_period_days: 60, description: "Mid-level leadership & department operations: Managers, Team Heads" },
          { grade_code: "L7", grade_name: "Sr. Manager", rank_level: 7, min_salary: 2800000, max_salary: 4500000, notice_period_days: 90, description: "Senior management: Senior Managers, Practice Leads, Delivery Heads" },
          { grade_code: "L8", grade_name: "Asst. General Manager (AGM)", rank_level: 8, min_salary: 3800000, max_salary: 6000000, notice_period_days: 90, description: "Executive leadership: Assistant General Managers (AGM)" },
          { grade_code: "L9", grade_name: "Deputy General Manager (DGM)", rank_level: 9, min_salary: 5000000, max_salary: 8500000, notice_period_days: 90, description: "Senior executive leadership: Deputy General Managers (DGM)" },
          { grade_code: "L10", grade_name: "General Manager (GM)", rank_level: 10, min_salary: 7000000, max_salary: 12500000, notice_period_days: 90, description: "Departmental & Divisional Heads: General Managers (GM)" },
          { grade_code: "L11", grade_name: "Department Head / VP / CXO", rank_level: 11, min_salary: 10000000, max_salary: 25000000, notice_period_days: 90, description: "Executive Committee / C-Suite: CHRO, CTO, CFO, COO, CEO, VP" },
        ]);
        console.log("Default Job Grades (L1-L11) seeded.");
      }

      const deptCount = await Department.count();
      if (deptCount === 0) {
        await Department.bulkCreate([
          { dept_code: "ENG", dept_name: "Engineering / Tech", description: "Software development, QA, DevOps, and Technology infrastructure" },
          { dept_code: "SALES", dept_name: "Sales & Marketing", description: "Business development, enterprise sales, marketing campaigns, client relations" },
          { dept_code: "FIN", dept_name: "Accounts & Finance", description: "Financial management, taxation, accounting, payroll, and billing" },
          { dept_code: "HR", dept_name: "Human Resources (HR)", description: "Talent acquisition, employee welfare, policies, and people operations" },
          { dept_code: "OPS", dept_name: "Operations", description: "Production, factory/plant operations, supply chain, and logistics" },
          { dept_code: "ADMIN", dept_name: "Administration & Facilities", description: "Office infrastructure, maintenance, facilities, and admin support" },
          { dept_code: "CS", dept_name: "Customer Support", description: "Customer care, technical helpdesk, and client satisfaction" },
          { dept_code: "LEGAL", dept_name: "Legal Cell", description: "Corporate compliance, contracts, regulatory affairs, and legal advisory" },
          { dept_code: "EXEC", dept_name: "Management / Executive", description: "Executive leadership, corporate strategy, and board members" },
          { dept_code: "GEN", dept_name: "General / Corporate", description: "Cross-functional, shared corporate resources, and unassigned staff" },
        ]);
        console.log("Default Departments seeded.");
      }

      const desigCount = await Designation.count();
      if (desigCount === 0) {
        const allGrades = await JobGrade.findAll();
        const allDepts = await Department.findAll();

        const gradeMap = {};
        allGrades.forEach(g => { gradeMap[g.grade_code] = g.id; });

        const deptMap = {};
        allDepts.forEach(d => { deptMap[d.dept_code] = d.id; });

        const designationsToSeed = [
          // 1. Human Resources (HR)
          { title: "HR Intern", code: "HR-INT", department_id: deptMap["HR"], grade_id: gradeMap["L1"], job_family: "HR", is_hod_role: false },
          { title: "HR Executive", code: "HR-EXE", department_id: deptMap["HR"], grade_id: gradeMap["L2"], job_family: "HR", is_hod_role: false },
          { title: "Sr. HR Executive", code: "HR-SEXE", department_id: deptMap["HR"], grade_id: gradeMap["L3"], job_family: "HR", is_hod_role: false },
          { title: "Asst. HR Manager", code: "HR-AHM", department_id: deptMap["HR"], grade_id: gradeMap["L4"], job_family: "HR", is_hod_role: false },
          { title: "Deputy HR Manager", code: "HR-DHM", department_id: deptMap["HR"], grade_id: gradeMap["L5"], job_family: "HR", is_hod_role: false },
          { title: "HR Manager", code: "HR-MGR", department_id: deptMap["HR"], grade_id: gradeMap["L6"], job_family: "HR", is_hod_role: true },
          { title: "Sr. HR Manager", code: "HR-SMGR", department_id: deptMap["HR"], grade_id: gradeMap["L7"], job_family: "HR", is_hod_role: true },
          { title: "Asst. General Manager (AGM - HR)", code: "HR-AGM", department_id: deptMap["HR"], grade_id: gradeMap["L8"], job_family: "HR", is_hod_role: true },
          { title: "Deputy General Manager (DGM - HR)", code: "HR-DGM", department_id: deptMap["HR"], grade_id: gradeMap["L9"], job_family: "HR", is_hod_role: true },
          { title: "General Manager - HR", code: "HR-GM", department_id: deptMap["HR"], grade_id: gradeMap["L10"], job_family: "HR", is_hod_role: true },
          { title: "CHRO / VP HR", code: "HR-CHRO", department_id: deptMap["HR"], grade_id: gradeMap["L11"], job_family: "HR", is_hod_role: true },

          // 2. Engineering / Tech
          { title: "Graduate Engineer Trainee (GET)", code: "ENG-GET", department_id: deptMap["ENG"], grade_id: gradeMap["L1"], job_family: "Engineering", is_hod_role: false },
          { title: "Software Engineer", code: "ENG-SE", department_id: deptMap["ENG"], grade_id: gradeMap["L2"], job_family: "Engineering", is_hod_role: false },
          { title: "Sr. Software Engineer", code: "ENG-SSE", department_id: deptMap["ENG"], grade_id: gradeMap["L3"], job_family: "Engineering", is_hod_role: false },
          { title: "Asst. Engineering Manager / Tech Lead", code: "ENG-TL", department_id: deptMap["ENG"], grade_id: gradeMap["L4"], job_family: "Engineering", is_hod_role: false },
          { title: "Deputy Engineering Manager", code: "ENG-DEM", department_id: deptMap["ENG"], grade_id: gradeMap["L5"], job_family: "Engineering", is_hod_role: false },
          { title: "Engineering Manager", code: "ENG-MGR", department_id: deptMap["ENG"], grade_id: gradeMap["L6"], job_family: "Engineering", is_hod_role: true },
          { title: "Sr. Engineering Manager", code: "ENG-SMGR", department_id: deptMap["ENG"], grade_id: gradeMap["L7"], job_family: "Engineering", is_hod_role: true },
          { title: "Asst. General Manager (AGM - Technology)", code: "ENG-AGM", department_id: deptMap["ENG"], grade_id: gradeMap["L8"], job_family: "Engineering", is_hod_role: true },
          { title: "Deputy General Manager (DGM - Engineering)", code: "ENG-DGM", department_id: deptMap["ENG"], grade_id: gradeMap["L9"], job_family: "Engineering", is_hod_role: true },
          { title: "General Manager - Technology", code: "ENG-GM", department_id: deptMap["ENG"], grade_id: gradeMap["L10"], job_family: "Engineering", is_hod_role: true },
          { title: "CTO / VP Engineering", code: "ENG-CTO", department_id: deptMap["ENG"], grade_id: gradeMap["L11"], job_family: "Engineering", is_hod_role: true },

          // 3. Sales & Marketing
          { title: "Sales Trainee", code: "SLS-TRN", department_id: deptMap["SALES"], grade_id: gradeMap["L1"], job_family: "Sales", is_hod_role: false },
          { title: "Business Development Executive (BDE) / BDA", code: "SLS-BDA", department_id: deptMap["SALES"], grade_id: gradeMap["L2"], job_family: "Sales", is_hod_role: false },
          { title: "Sr. Business Development Executive (Sr. BDE)", code: "SLS-SBDA", department_id: deptMap["SALES"], grade_id: gradeMap["L3"], job_family: "Sales", is_hod_role: false },
          { title: "Asst. Sales Manager", code: "SLS-ASM", department_id: deptMap["SALES"], grade_id: gradeMap["L4"], job_family: "Sales", is_hod_role: false },
          { title: "Deputy Sales Manager", code: "SLS-DSM", department_id: deptMap["SALES"], grade_id: gradeMap["L5"], job_family: "Sales", is_hod_role: false },
          { title: "Sales Manager", code: "SLS-MGR", department_id: deptMap["SALES"], grade_id: gradeMap["L6"], job_family: "Sales", is_hod_role: true },
          { title: "Sr. Sales Manager", code: "SLS-SMGR", department_id: deptMap["SALES"], grade_id: gradeMap["L7"], job_family: "Sales", is_hod_role: true },
          { title: "Asst. General Manager (AGM - Sales)", code: "SLS-AGM", department_id: deptMap["SALES"], grade_id: gradeMap["L8"], job_family: "Sales", is_hod_role: true },
          { title: "Deputy General Manager (DGM - Sales & BD)", code: "SLS-DGM", department_id: deptMap["SALES"], grade_id: gradeMap["L9"], job_family: "Sales", is_hod_role: true },
          { title: "General Manager - Sales & Marketing", code: "SLS-GM", department_id: deptMap["SALES"], grade_id: gradeMap["L10"], job_family: "Sales", is_hod_role: true },
          { title: "VP of Sales & Growth / CCO", code: "SLS-VP", department_id: deptMap["SALES"], grade_id: gradeMap["L11"], job_family: "Sales", is_hod_role: true },

          // 4. Accounts & Finance
          { title: "Accounts Trainee", code: "FIN-TRN", department_id: deptMap["FIN"], grade_id: gradeMap["L1"], job_family: "Finance", is_hod_role: false },
          { title: "Accounts Executive", code: "FIN-EXE", department_id: deptMap["FIN"], grade_id: gradeMap["L2"], job_family: "Finance", is_hod_role: false },
          { title: "Sr. Accounts Executive / Sr. Accountant", code: "FIN-ACC", department_id: deptMap["FIN"], grade_id: gradeMap["L3"], job_family: "Finance", is_hod_role: false },
          { title: "Asst. Finance Manager", code: "FIN-AFM", department_id: deptMap["FIN"], grade_id: gradeMap["L4"], job_family: "Finance", is_hod_role: false },
          { title: "Deputy Finance Manager", code: "FIN-DFM", department_id: deptMap["FIN"], grade_id: gradeMap["L5"], job_family: "Finance", is_hod_role: false },
          { title: "Finance Manager", code: "FIN-MGR", department_id: deptMap["FIN"], grade_id: gradeMap["L6"], job_family: "Finance", is_hod_role: true },
          { title: "Sr. Finance Manager", code: "FIN-SMGR", department_id: deptMap["FIN"], grade_id: gradeMap["L7"], job_family: "Finance", is_hod_role: true },
          { title: "Asst. General Manager (AGM - Finance)", code: "FIN-AGM", department_id: deptMap["FIN"], grade_id: gradeMap["L8"], job_family: "Finance", is_hod_role: true },
          { title: "Deputy General Manager (DGM - Finance & Accounts)", code: "FIN-DGM", department_id: deptMap["FIN"], grade_id: gradeMap["L9"], job_family: "Finance", is_hod_role: true },
          { title: "General Manager - Finance & Accounts", code: "FIN-GM", department_id: deptMap["FIN"], grade_id: gradeMap["L10"], job_family: "Finance", is_hod_role: true },
          { title: "Chief Financial Officer (CFO) / VP Finance", code: "FIN-CFO", department_id: deptMap["FIN"], grade_id: gradeMap["L11"], job_family: "Finance", is_hod_role: true },

          // 5. Operations / Plant
          { title: "Operations Trainee / Plant Trainee", code: "OPS-TRN", department_id: deptMap["OPS"], grade_id: gradeMap["L1"], job_family: "Operations", is_hod_role: false },
          { title: "Operations Executive / Junior Operator", code: "OPS-EXE", department_id: deptMap["OPS"], grade_id: gradeMap["L2"], job_family: "Operations", is_hod_role: false },
          { title: "Sr. Operations Executive / Floor Supervisor", code: "OPS-SUP", department_id: deptMap["OPS"], grade_id: gradeMap["L3"], job_family: "Operations", is_hod_role: false },
          { title: "Asst. Operations Manager", code: "OPS-AOM", department_id: deptMap["OPS"], grade_id: gradeMap["L4"], job_family: "Operations", is_hod_role: false },
          { title: "Deputy Operations Manager", code: "OPS-DOM", department_id: deptMap["OPS"], grade_id: gradeMap["L5"], job_family: "Operations", is_hod_role: false },
          { title: "Operations Manager / Plant Manager", code: "OPS-MGR", department_id: deptMap["OPS"], grade_id: gradeMap["L6"], job_family: "Operations", is_hod_role: true },
          { title: "Sr. Operations Manager", code: "OPS-SMGR", department_id: deptMap["OPS"], grade_id: gradeMap["L7"], job_family: "Operations", is_hod_role: true },
          { title: "Asst. General Manager (AGM - Operations)", code: "OPS-AGM", department_id: deptMap["OPS"], grade_id: gradeMap["L8"], job_family: "Operations", is_hod_role: true },
          { title: "Deputy General Manager (DGM - Operations)", code: "OPS-DGM", department_id: deptMap["OPS"], grade_id: gradeMap["L9"], job_family: "Operations", is_hod_role: true },
          { title: "General Manager - Plant & Operations", code: "OPS-GM", department_id: deptMap["OPS"], grade_id: gradeMap["L10"], job_family: "Operations", is_hod_role: true },
          { title: "Chief Operating Officer (COO) / VP Operations", code: "OPS-COO", department_id: deptMap["OPS"], grade_id: gradeMap["L11"], job_family: "Operations", is_hod_role: true },

          // 6. Administration & Facilities
          { title: "Admin & Facilities Trainee", code: "ADM-TRN", department_id: deptMap["ADMIN"], grade_id: gradeMap["L1"], job_family: "Admin", is_hod_role: false },
          { title: "Admin Executive", code: "ADM-EXE", department_id: deptMap["ADMIN"], grade_id: gradeMap["L2"], job_family: "Admin", is_hod_role: false },
          { title: "Sr. Admin Executive / Facilities Executive", code: "ADM-SEXE", department_id: deptMap["ADMIN"], grade_id: gradeMap["L3"], job_family: "Admin", is_hod_role: false },
          { title: "Asst. Admin Manager", code: "ADM-AAM", department_id: deptMap["ADMIN"], grade_id: gradeMap["L4"], job_family: "Admin", is_hod_role: false },
          { title: "Deputy Facilities Manager", code: "ADM-DFM", department_id: deptMap["ADMIN"], grade_id: gradeMap["L5"], job_family: "Admin", is_hod_role: false },
          { title: "Facilities & Admin Manager", code: "ADM-MGR", department_id: deptMap["ADMIN"], grade_id: gradeMap["L6"], job_family: "Admin", is_hod_role: true },
          { title: "Sr. Facilities & Admin Manager", code: "ADM-SMGR", department_id: deptMap["ADMIN"], grade_id: gradeMap["L7"], job_family: "Admin", is_hod_role: true },
          { title: "Asst. General Manager (AGM - Facilities & Admin)", code: "ADM-AGM", department_id: deptMap["ADMIN"], grade_id: gradeMap["L8"], job_family: "Admin", is_hod_role: true },
          { title: "Deputy General Manager (DGM - Corporate Infrastructure)", code: "ADM-DGM", department_id: deptMap["ADMIN"], grade_id: gradeMap["L9"], job_family: "Admin", is_hod_role: true },
          { title: "General Manager - Administration & Facilities", code: "ADM-GM", department_id: deptMap["ADMIN"], grade_id: gradeMap["L10"], job_family: "Admin", is_hod_role: true },
          { title: "VP - Corporate Services & Real Estate", code: "ADM-VP", department_id: deptMap["ADMIN"], grade_id: gradeMap["L11"], job_family: "Admin", is_hod_role: true },

          // 7. Customer Support
          { title: "Customer Support Trainee", code: "CS-TRN", department_id: deptMap["CS"], grade_id: gradeMap["L1"], job_family: "Support", is_hod_role: false },
          { title: "Customer Support Executive", code: "CS-EXE", department_id: deptMap["CS"], grade_id: gradeMap["L2"], job_family: "Support", is_hod_role: false },
          { title: "Sr. Customer Support Executive", code: "CS-SEXE", department_id: deptMap["CS"], grade_id: gradeMap["L3"], job_family: "Support", is_hod_role: false },
          { title: "Asst. Support Manager / Team Lead", code: "CS-ASM", department_id: deptMap["CS"], grade_id: gradeMap["L4"], job_family: "Support", is_hod_role: false },
          { title: "Deputy Customer Support Manager", code: "CS-DSM", department_id: deptMap["CS"], grade_id: gradeMap["L5"], job_family: "Support", is_hod_role: false },
          { title: "Customer Support Manager", code: "CS-MGR", department_id: deptMap["CS"], grade_id: gradeMap["L6"], job_family: "Support", is_hod_role: true },
          { title: "Sr. Customer Support Manager", code: "CS-SMGR", department_id: deptMap["CS"], grade_id: gradeMap["L7"], job_family: "Support", is_hod_role: true },
          { title: "Asst. General Manager (AGM - Customer Support)", code: "CS-AGM", department_id: deptMap["CS"], grade_id: gradeMap["L8"], job_family: "Support", is_hod_role: true },
          { title: "Deputy General Manager (DGM - Customer Success)", code: "CS-DGM", department_id: deptMap["CS"], grade_id: gradeMap["L9"], job_family: "Support", is_hod_role: true },
          { title: "General Manager - Customer Experience & Operations", code: "CS-GM", department_id: deptMap["CS"], grade_id: gradeMap["L10"], job_family: "Support", is_hod_role: true },
          { title: "VP - Customer Success & Experience (CX)", code: "CS-VP", department_id: deptMap["CS"], grade_id: gradeMap["L11"], job_family: "Support", is_hod_role: true },

          // 8. Legal Cell
          { title: "Legal Intern / Legal Trainee", code: "LEG-TRN", department_id: deptMap["LEGAL"], grade_id: gradeMap["L1"], job_family: "Legal", is_hod_role: false },
          { title: "Legal Executive / Legal Associate", code: "LEG-EXE", department_id: deptMap["LEGAL"], grade_id: gradeMap["L2"], job_family: "Legal", is_hod_role: false },
          { title: "Sr. Legal Executive / Sr. Legal Counsel", code: "LEG-SEXE", department_id: deptMap["LEGAL"], grade_id: gradeMap["L3"], job_family: "Legal", is_hod_role: false },
          { title: "Asst. Legal Manager", code: "LEG-ALM", department_id: deptMap["LEGAL"], grade_id: gradeMap["L4"], job_family: "Legal", is_hod_role: false },
          { title: "Deputy Legal Manager", code: "LEG-DLM", department_id: deptMap["LEGAL"], grade_id: gradeMap["L5"], job_family: "Legal", is_hod_role: false },
          { title: "Legal Manager / Legal Advisor", code: "LEG-MGR", department_id: deptMap["LEGAL"], grade_id: gradeMap["L6"], job_family: "Legal", is_hod_role: true },
          { title: "Sr. Legal Manager", code: "LEG-SMGR", department_id: deptMap["LEGAL"], grade_id: gradeMap["L7"], job_family: "Legal", is_hod_role: true },
          { title: "Asst. General Manager (AGM - Legal & Regulatory)", code: "LEG-AGM", department_id: deptMap["LEGAL"], grade_id: gradeMap["L8"], job_family: "Legal", is_hod_role: true },
          { title: "Deputy General Manager (DGM - Legal & Compliance)", code: "LEG-DGM", department_id: deptMap["LEGAL"], grade_id: gradeMap["L9"], job_family: "Legal", is_hod_role: true },
          { title: "General Manager - Legal Affairs", code: "LEG-GM", department_id: deptMap["LEGAL"], grade_id: gradeMap["L10"], job_family: "Legal", is_hod_role: true },
          { title: "General Counsel / VP Legal Affairs", code: "LEG-GC", department_id: deptMap["LEGAL"], grade_id: gradeMap["L11"], job_family: "Legal", is_hod_role: true },

          // 9. Global Cross-Department Designations (department_id: null)
          { title: "Intern", code: "GEN-INT", department_id: null, grade_id: gradeMap["L1"], job_family: "General", is_hod_role: false },
          { title: "Executive", code: "GEN-EXE", department_id: null, grade_id: gradeMap["L2"], job_family: "General", is_hod_role: false },
          { title: "Sr. Executive", code: "GEN-SEXE", department_id: null, grade_id: gradeMap["L3"], job_family: "General", is_hod_role: false },
          { title: "Asst. Manager", code: "GEN-AM", department_id: null, grade_id: gradeMap["L4"], job_family: "Leadership", is_hod_role: false },
          { title: "Deputy Manager", code: "GEN-DM", department_id: null, grade_id: gradeMap["L5"], job_family: "Leadership", is_hod_role: false },
          { title: "Manager", code: "GEN-MGR", department_id: null, grade_id: gradeMap["L6"], job_family: "Leadership", is_hod_role: true },
          { title: "Sr. Manager", code: "GEN-SMGR", department_id: null, grade_id: gradeMap["L7"], job_family: "Leadership", is_hod_role: true },
          { title: "Asst. General Manager (AGM)", code: "GEN-AGM", department_id: null, grade_id: gradeMap["L8"], job_family: "Leadership", is_hod_role: true },
          { title: "Deputy General Manager (DGM)", code: "GEN-DGM", department_id: null, grade_id: gradeMap["L9"], job_family: "Leadership", is_hod_role: true },
          { title: "General Manager (GM)", code: "GEN-GM", department_id: null, grade_id: gradeMap["L10"], job_family: "Leadership", is_hod_role: true },
          { title: "Vice President (VP)", code: "GEN-VP", department_id: null, grade_id: gradeMap["L11"], job_family: "Executive", is_hod_role: true },
          { title: "Chief Executive Officer (CEO)", code: "GEN-CEO", department_id: null, grade_id: gradeMap["L11"], job_family: "Executive", is_hod_role: true },
          { title: "Chief Operating Officer (COO)", code: "GEN-COO", department_id: null, grade_id: gradeMap["L11"], job_family: "Executive", is_hod_role: true },
          { title: "Chief Technology Officer (CTO)", code: "GEN-CTO", department_id: null, grade_id: gradeMap["L11"], job_family: "Executive", is_hod_role: true },
          { title: "Chief Financial Officer (CFO)", code: "GEN-CFO", department_id: null, grade_id: gradeMap["L11"], job_family: "Executive", is_hod_role: true },
        ];

        await Designation.bulkCreate(designationsToSeed);
        console.log("Default Designations (11-Tier Ladder) seeded across all departments.");
      }

      // Auto-migrate existing employees/users to link department_id, designation_id, grade_id
      try {
        const unlinkedEmployees = await Employee.findAll({
          where: { department_id: null }
        });
        if (unlinkedEmployees.length > 0) {
          const depts = await Department.findAll();
          const desigs = await Designation.findAll();

          for (const emp of unlinkedEmployees) {
            let matchedDeptId = null;
            let matchedDesigId = null;
            let matchedGradeId = null;

            if (emp.dept) {
              const dStr = emp.dept.trim().toLowerCase();
              const foundD = depts.find(d => 
                d.dept_name.toLowerCase() === dStr ||
                d.dept_name.toLowerCase().includes(dStr) ||
                dStr.includes(d.dept_code.toLowerCase())
              );
              if (foundD) matchedDeptId = foundD.id;
            }

            if (emp.designation) {
              const desStr = emp.designation.trim().toLowerCase();
              const foundDes = desigs.find(des => 
                des.title.toLowerCase() === desStr ||
                des.code.toLowerCase() === desStr
              );
              if (foundDes) {
                matchedDesigId = foundDes.id;
                matchedGradeId = foundDes.grade_id;
              }
            }

            if (matchedDeptId || matchedDesigId || matchedGradeId) {
              await emp.update({
                department_id: matchedDeptId,
                designation_id: matchedDesigId,
                grade_id: matchedGradeId
              });
              await User.update(
                {
                  department_id: matchedDeptId,
                  designation_id: matchedDesigId,
                  grade_id: matchedGradeId
                },
                { where: { employee_id: emp.employee_id } }
              );
            }
          }
          console.log(`Auto-mapped ${unlinkedEmployees.length} legacy employees to normalized Department/Designation/Grade records.`);
        }
      } catch (linkErr) {
        console.warn("Could not auto-link legacy employees:", linkErr.message);
      }
    } catch (orgSeedErr) {
      console.warn("Could not seed organization masters:", orgSeedErr.message);
    }

    console.log("PG connected...");
  } catch (err) {
    console.error("Postgres connection error:", err.message);
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
  MediclaimHighlight,
  MediclaimHospital,
  KpiTemplate,
  KpiAssignment,
  KpiGoalItem,
  PerformanceReview,
  ReviewQuestionItem,
  RecruitmentRequisition,
  RecruitmentCandidate,
  RecruitmentOffer,
  Onboarding,
  Holiday,
  AdminTask,
  HrEvent,
  TrainingProgram,
  TrainingSession,
  TrainingEnrollment,
  TrainingAssessment,
  AssessmentSubmission,
  TrainingFeedback,
  EmployeeCertification,
  BiometricDevice,
  BiometricPunch,
  LeaveAllocation,
  LeaveCarryForwardLog,
  LeavePolicy,
  FnfSettlement,  ExpenseClaim,  ExpenseClaimItem,
  Department,
  JobGrade,
  Designation,
};