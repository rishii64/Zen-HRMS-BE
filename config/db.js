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

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    try {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';
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
};