const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Onboarding = sequelize.define(
    "Onboarding",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      candidate_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      employee_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      personal_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      joining_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      current_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "JOINING", // JOINING, DOCUMENTATION, TRAINING, DEPT_ASSIGNMENT, PROBATION_EVALUATION, COMPLETED, REJECTED
      },
      overall_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "IN_PROGRESS", // IN_PROGRESS, COMPLETED, REJECTED
      },

      // ==========================================
      // a) Joining — Asset & Credential Issuance
      // ==========================================
      joining_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      joining_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      joining_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      email_issued: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email_address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      email_issued_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      id_card_issued: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      id_card_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      id_card_issued_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      biometric_registered: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      biometric_device_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      biometric_registered_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      laptop_issued: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      laptop_serial_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      laptop_model: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      laptop_issued_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      bag_issued: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      bag_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      bag_issued_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      stationery_issued: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      stationery_details: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      stationery_issued_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      additional_assets: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      assets_acknowledged: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // ==========================================
      // b) Documentation Process
      // ==========================================
      documentation_status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "PENDING", // PENDING, IN_PROGRESS, VERIFIED, REJECTED
      },
      documentation_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      documentation_verified_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      documentation_verified_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      documentation_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      documents: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [
          { key: "aadhaar", label: "Aadhaar Card", number: "", doc_url: "", status: "PENDING", remarks: "" },
          { key: "pan", label: "PAN Card", number: "", doc_url: "", status: "PENDING", remarks: "" },
          { key: "education", label: "Educational Degree / Certificates", number: "", doc_url: "", status: "PENDING", remarks: "" },
          { key: "experience", label: "Relieving / Prior Experience Letters", number: "", doc_url: "", status: "PENDING", remarks: "" },
          { key: "offer_letter", label: "Signed Offer & Appointment Letter", number: "", doc_url: "", status: "PENDING", remarks: "" },
          { key: "nda", label: "Signed NDA & Policies Agreement", number: "", doc_url: "", status: "PENDING", remarks: "" },
          { key: "bank", label: "Bank Details / Cancelled Cheque", number: "", doc_url: "", status: "PENDING", remarks: "" },
          { key: "photo", label: "Passport Sized Photograph", number: "", doc_url: "", status: "PENDING", remarks: "" },
        ],
      },

      // ==========================================
      // c) Intro & Training
      // (i) HR Training
      // (ii) Admin Training
      // (iii) POS Training
      // (iv) Dept. Training
      // ==========================================
      hr_training: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          status: "NOT_STARTED", // NOT_STARTED, IN_PROGRESS, COMPLETED
          trainer_name: "",
          scheduled_date: null,
          completed_date: null,
          score: null,
          feedback: "",
          modules: [
            "Company History, Culture & Core Values",
            "HR Policies, Attendance & Regularization Rules",
            "Leave System, Holiday Calendar & Shift Regulations",
            "POSH, Anti-Harassment & Workplace Code of Conduct",
            "Payroll Cycle, Payslips & Mediclaim Benefits"
          ]
        },
      },
      admin_training: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          status: "NOT_STARTED",
          trainer_name: "",
          scheduled_date: null,
          completed_date: null,
          score: null,
          feedback: "",
          modules: [
            "Office Administration & Facility Guidelines",
            "Physical Security, Access Badges & Visitor Entry",
            "Fire Safety, Disaster Management & Emergency Exits",
            "Asset Care, Stationery & Helpdesk Protocol",
            "Workstation Ergonomics & Clean Desk Policy"
          ]
        },
      },
      pos_training: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          status: "NOT_STARTED",
          trainer_name: "",
          scheduled_date: null,
          completed_date: null,
          score: null,
          feedback: "",
          modules: [
            "POS System Architecture & Login Credentials",
            "Billing, Invoicing & Cash Register Operations",
            "Discount Schemes, Return Policies & Customer Service",
            "Inventory Lookup, Stock Sync & Discrepancies",
            "Day-End Closing & Transaction Audit Reports"
          ]
        },
      },
      dept_training: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          status: "NOT_STARTED",
          trainer_name: "",
          mentor_name: "",
          department_name: "",
          scheduled_date: null,
          completed_date: null,
          score: null,
          feedback: "",
          modules: [
            "Department Technology Stack, Tools & Architecture",
            "Standard Operating Procedures (SOP) & Workflows",
            "Live Project Architecture, Repositories & Access Setup",
            "Team Intro, Roles, Key Result Areas (KRAs) & KPIs",
            "First Deliverable Setup & Mentorship Review"
          ]
        },
      },
      trainings_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // =======================================================
      // d) Department Assignment (Unlocked after Dept Training)
      // =======================================================
      is_assigned_to_dept: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      assigned_department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      assigned_hod_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      assigned_hod_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      assigned_reporting_manager: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      assigned_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      assignment_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // =======================================================
      // e) 6-Month Probation Tracking & HOD Permanent / Reject Decision
      // =======================================================
      probation_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      probation_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      probation_period_months: {
        type: DataTypes.INTEGER,
        defaultValue: 6,
      },
      probation_status: {
        type: DataTypes.STRING(50),
        defaultValue: "NOT_STARTED", // NOT_STARTED, IN_PROBATION, CONFIRMED_PERMANENT, REJECTED, EXTENDED
      },

      // HOD Department Analysis & Final Choice
      hod_analysis_completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      hod_performance_rating: {
        type: DataTypes.DECIMAL(3, 1), // e.g. 4.5 out of 5
        allowNull: true,
      },
      hod_kpi_rating: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
      },
      hod_discipline_rating: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
      },
      hod_culture_fit_rating: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
      },
      hod_analysis_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hod_decision: {
        type: DataTypes.STRING(50),
        allowNull: true, // "PERMANENT", "REJECTED", "EXTENDED"
      },
      hod_decision_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hod_decision_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      hod_decision_by_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      hod_decision_by_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hod_extension_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "onboardings",
      timestamps: true,
    }
  );

  return Onboarding;
};
