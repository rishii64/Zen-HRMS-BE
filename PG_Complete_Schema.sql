-- ==========================================================================
-- HRMS LATEST COMPLETE POSTGRESQL SCHEMA & MIGRATION SCRIPT
-- Target: Production / Hosted PostgreSQL (AWS EC2 / RDS / Local)
-- Includes: All 18 Tables, Column Definitions, Defaults & Migration Alters
-- Safe to run multiple times: Uses 'IF NOT EXISTS' for tables and columns
-- ==========================================================================

-- ==========================================================================
-- TABLE: users (56 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  dept VARCHAR(100),
  designation VARCHAR(100),
  current_salary NUMERIC,
  joining_date DATE,
  reporting_manager VARCHAR(100) DEFAULT 'N/A',
  phone_no VARCHAR(20),
  kpi TEXT,
  tabs_enabled BOOLEAN DEFAULT false NOT NULL,
  enabled_tabs VARCHAR(255) DEFAULT '1,2,3,4' NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  nationality VARCHAR(50),
  address_current TEXT,
  address_permanent TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  education TEXT,
  family_details TEXT,
  doc_resume VARCHAR(255),
  doc_id VARCHAR(255),
  doc_cert VARCHAR(255),
  profile_photo VARCHAR(255),
  blood_group VARCHAR(10),
  religion VARCHAR(50),
  total_experience VARCHAR(50),
  marital_status VARCHAR(50),
  document_status VARCHAR(50) DEFAULT 'Not Uploaded' NOT NULL,
  certifications TEXT,
  passport_visa TEXT,
  bank_details TEXT,
  salary_structure TEXT,
  previous_experience VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Active' NOT NULL,
  personal_email VARCHAR(255),
  work_email VARCHAR(255),
  pan_no VARCHAR(20),
  aadhaar_no VARCHAR(20),
  driving_license VARCHAR(50),
  doc_payslips TEXT,
  doc_exp_cert TEXT,
  doc_last_company TEXT,
  doc_pan VARCHAR(255),
  doc_aadhaar VARCHAR(255),
  uploaded_documents TEXT,
  last_company_details TEXT,
  weekly_off VARCHAR(20) DEFAULT 'Sunday',
  employment_type VARCHAR(50) DEFAULT 'Permanent' NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_salary NUMERIC;
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_manager VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_no VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kpi TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tabs_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled_tabs VARCHAR(255) DEFAULT '1,2,3,4';
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_current TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_permanent TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_details TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_resume VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_cert VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_experience VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Not Uploaded';
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_visa TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_details TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_structure TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_experience VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_no VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS driving_license VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_payslips TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_exp_cert TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_last_company TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_pan VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_aadhaar VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS uploaded_documents TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_company_details TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_off VARCHAR(20) DEFAULT 'Sunday';
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Permanent';

-- ==========================================================================
-- TABLE: employees (53 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Active' NOT NULL,
  job_role VARCHAR(50) DEFAULT 'employee' NOT NULL,
  dept VARCHAR(100),
  designation VARCHAR(100),
  current_salary NUMERIC,
  joining_date DATE,
  reporting_manager VARCHAR(100) DEFAULT 'N/A',
  phone_no VARCHAR(20),
  kpi TEXT,
  tabs_enabled BOOLEAN DEFAULT false NOT NULL,
  enabled_tabs VARCHAR(255) DEFAULT '1,2,3,4' NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  nationality VARCHAR(50),
  address_current TEXT,
  address_permanent TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  education TEXT,
  family_details TEXT,
  doc_resume VARCHAR(255),
  doc_id VARCHAR(255),
  doc_cert VARCHAR(255),
  profile_photo VARCHAR(255),
  blood_group VARCHAR(10),
  religion VARCHAR(50),
  total_experience VARCHAR(50),
  marital_status VARCHAR(50),
  document_status VARCHAR(50) DEFAULT 'Not Uploaded' NOT NULL,
  certifications TEXT,
  passport_visa TEXT,
  bank_details TEXT,
  salary_structure TEXT,
  previous_experience VARCHAR(100),
  work_email VARCHAR(255),
  personal_email VARCHAR(255),
  pan_no VARCHAR(20),
  aadhaar_no VARCHAR(20),
  driving_license VARCHAR(50),
  doc_pan VARCHAR(255),
  doc_aadhaar VARCHAR(255),
  doc_payslips TEXT,
  doc_exp_cert TEXT,
  doc_last_company TEXT,
  uploaded_documents TEXT,
  last_company_details TEXT,
  weekly_off VARCHAR(20) DEFAULT 'Sunday',
  employment_type VARCHAR(50) DEFAULT 'Permanent' NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_role VARCHAR(50) DEFAULT 'employee';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS current_salary NUMERIC;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone_no VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS kpi TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tabs_enabled BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS enabled_tabs VARCHAR(255) DEFAULT '1,2,3,4';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_current TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address_permanent TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS family_details TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_resume VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_id VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_cert VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS total_experience VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Not Uploaded';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_visa TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_details TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_structure TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS previous_experience VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan_no VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS driving_license VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_pan VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_aadhaar VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_payslips TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_exp_cert TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_last_company TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS uploaded_documents TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_company_details TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekly_off VARCHAR(20) DEFAULT 'Sunday';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Permanent';

-- ==========================================================================
-- TABLE: password_resets (5 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS otp VARCHAR(6);
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: attendance (13 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  dept VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  check_in VARCHAR(20),
  check_out VARCHAR(20),
  work_hours NUMERIC,
  status VARCHAR(50) DEFAULT 'Present' NOT NULL,
  late_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  notes TEXT
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in VARCHAR(20);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out VARCHAR(20);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS work_hours NUMERIC;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Present';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_count INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- ==========================================================================
-- TABLE: schedules (16 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  dept VARCHAR(100) NOT NULL,
  designation VARCHAR(100),
  shift_name VARCHAR(50) DEFAULT 'General Shift' NOT NULL,
  start_time VARCHAR(10) DEFAULT '10:00' NOT NULL,
  end_time VARCHAR(10) DEFAULT '19:00' NOT NULL,
  date DATE NOT NULL,
  week_start DATE,
  status VARCHAR(20) DEFAULT 'Published' NOT NULL,
  created_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  is_rotational_off BOOLEAN DEFAULT false NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shift_name VARCHAR(50) DEFAULT 'General Shift';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS start_time VARCHAR(10) DEFAULT '10:00';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS end_time VARCHAR(10) DEFAULT '19:00';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS week_start DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Published';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_rotational_off BOOLEAN DEFAULT false;

-- ==========================================================================
-- TABLE: leaves (17 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  dept VARCHAR(255) DEFAULT 'General',
  leave_type VARCHAR(255) DEFAULT 'Casual Leave' NOT NULL,
  day_type VARCHAR(255) DEFAULT 'Full Day' NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DOUBLE PRECISION DEFAULT '1'::double precision NOT NULL,
  reason TEXT,
  emergency_contact VARCHAR(255),
  doc_url VARCHAR(255),
  status VARCHAR(255) DEFAULT 'Pending' NOT NULL,
  approver VARCHAR(255),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS employee_id VARCHAR(255);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS dept VARCHAR(255) DEFAULT 'General';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS leave_type VARCHAR(255) DEFAULT 'Casual Leave';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS day_type VARCHAR(255) DEFAULT 'Full Day';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS total_days DOUBLE PRECISION DEFAULT '1'::double precision;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS doc_url VARCHAR(255);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'Pending';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS approver VARCHAR(255);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: payrolls (19 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS payrolls (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  month_year VARCHAR(50) NOT NULL,
  fixed_pay TEXT,
  variable_pay TEXT,
  gross_pay NUMERIC DEFAULT 0 NOT NULL,
  attendance_summary TEXT,
  lop_deduction NUMERIC DEFAULT 0 NOT NULL,
  tax_deductions TEXT,
  statutory_deductions TEXT,
  total_deductions NUMERIC DEFAULT 0 NOT NULL,
  net_salary NUMERIC DEFAULT 0 NOT NULL,
  status VARCHAR(50) DEFAULT 'Finalized' NOT NULL,
  payment_date DATE,
  payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  adjustments TEXT
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS month_year VARCHAR(50);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS fixed_pay TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS variable_pay TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS gross_pay NUMERIC DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS attendance_summary TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS lop_deduction NUMERIC DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS tax_deductions TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS statutory_deductions TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS total_deductions NUMERIC DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS net_salary NUMERIC DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Finalized';
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Bank Transfer';
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS adjustments TEXT;

-- ==========================================================================
-- TABLE: holidays (12 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  date DATE NOT NULL,
  day VARCHAR(30),
  month VARCHAR(10),
  day_num INTEGER,
  type VARCHAR(50) DEFAULT 'Public' NOT NULL,
  dept VARCHAR(100) DEFAULT 'All' NOT NULL,
  created_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS day VARCHAR(30);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS month VARCHAR(10);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS day_num INTEGER;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Public';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS dept VARCHAR(100) DEFAULT 'All';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: resignations (87 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS resignations (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  dept VARCHAR(100) DEFAULT 'General',
  designation VARCHAR(100),
  joining_date DATE,
  last_working_date DATE NOT NULL,
  notice_period VARCHAR(50) DEFAULT '1 month' NOT NULL,
  reason VARCHAR(200) NOT NULL,
  reason_details TEXT,
  schedule_exit_interview BOOLEAN DEFAULT false NOT NULL,
  interview_preferred_date VARCHAR(100),
  interview_mode VARCHAR(50) DEFAULT 'In person',
  handover_person_id VARCHAR(50),
  handover_person_name VARCHAR(100),
  handover_target_date DATE,
  handover_note TEXT,
  reassign_items_to_id VARCHAR(50),
  reassign_items_to_name VARCHAR(100),
  email_forwarding_to_id VARCHAR(50),
  email_forwarding_to_name VARCHAR(100),
  ack_claims_expenses BOOLEAN DEFAULT false NOT NULL,
  ack_final_pay BOOLEAN DEFAULT false NOT NULL,
  ack_return_assets BOOLEAN DEFAULT false NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending Manager Approval' NOT NULL,
  manager_id VARCHAR(50),
  manager_name VARCHAR(100),
  manager_decision VARCHAR(50),
  manager_comments TEXT,
  manager_action_date TIMESTAMPTZ,
  manager_recommended_lwd DATE,
  hr_id VARCHAR(50),
  hr_name VARCHAR(100),
  hr_decision VARCHAR(50),
  hr_comments TEXT,
  hr_action_date TIMESTAMPTZ,
  hr_confirmed_lwd DATE,
  exit_interview_status VARCHAR(50) DEFAULT 'Not Scheduled' NOT NULL,
  exit_interview_date VARCHAR(100),
  clearance_it_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  clearance_finance_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  clearance_admin_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  clearance_hr_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  tl_id VARCHAR(50),
  tl_name VARCHAR(100),
  tl_decision VARCHAR(50),
  tl_comments TEXT,
  tl_action_date TIMESTAMPTZ,
  tl_recommended_lwd DATE,
  hod_id VARCHAR(50),
  hod_name VARCHAR(100),
  hod_decision VARCHAR(50),
  hod_comments TEXT,
  hod_action_date TIMESTAMPTZ,
  hod_recommended_lwd DATE,
  approval_stage VARCHAR(50) DEFAULT 'PENDING_TL_OR_MANAGER' NOT NULL,
  clearance_raised BOOLEAN DEFAULT false NOT NULL,
  clearance_raised_by VARCHAR(100),
  clearance_raised_date TIMESTAMPTZ,
  clearance_steps JSONB DEFAULT '[]'::jsonb,
  clearance_overall_status VARCHAR(50) DEFAULT 'Not Raised' NOT NULL,
  exit_interview_raised BOOLEAN DEFAULT false NOT NULL,
  exit_interview_raised_by VARCHAR(100),
  exit_interview_raised_date TIMESTAMPTZ,
  exit_interview_time VARCHAR(50),
  exit_interview_interviewer VARCHAR(100),
  exit_interview_mode VARCHAR(50),
  exit_interview_location VARCHAR(255),
  exit_interview_notes TEXT,
  exit_interview_questions JSONB DEFAULT '[]'::jsonb,
  exit_interview_feedback TEXT,
  notifications JSONB DEFAULT '[]'::jsonb,
  handover_status VARCHAR(50) DEFAULT 'NOT_ASSIGNED',
  handover_assigned_by_id VARCHAR(50),
  handover_assigned_by_name VARCHAR(100),
  handover_assigned_date TIMESTAMPTZ,
  handover_employee_remarks TEXT,
  handover_employee_completed_at TIMESTAMPTZ,
  handover_assignee_remarks TEXT,
  handover_assignee_confirmed_at TIMESTAMPTZ,
  handover_docs_checklist JSONB DEFAULT '[]'::jsonb,
  withdrawn_at TIMESTAMPTZ,
  withdrawn_by VARCHAR(100),
  withdrawal_reason TEXT
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS dept VARCHAR(100) DEFAULT 'General';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS last_working_date DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS notice_period VARCHAR(50) DEFAULT '1 month';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS reason VARCHAR(200);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS reason_details TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS schedule_exit_interview BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS interview_preferred_date VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(50) DEFAULT 'In person';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_person_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_person_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_target_date DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_note TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS reassign_items_to_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS reassign_items_to_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS email_forwarding_to_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS email_forwarding_to_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS ack_claims_expenses BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS ack_final_pay BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS ack_return_assets BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending Manager Approval';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_recommended_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_confirmed_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_status VARCHAR(50) DEFAULT 'Not Scheduled';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_date VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_it_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_finance_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_admin_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_hr_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_recommended_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_recommended_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS approval_stage VARCHAR(50) DEFAULT 'PENDING_TL_OR_MANAGER';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_raised BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_raised_by VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_raised_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_overall_status VARCHAR(50) DEFAULT 'Not Raised';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_raised BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_raised_by VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_raised_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_time VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_interviewer VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_mode VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_location VARCHAR(255);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_notes TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_feedback TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_status VARCHAR(50) DEFAULT 'NOT_ASSIGNED';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assigned_by_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assigned_by_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assigned_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_employee_remarks TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_employee_completed_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assignee_remarks TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assignee_confirmed_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_docs_checklist JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS withdrawn_by VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- ==========================================================================
-- TABLE: it_declarations (21 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS it_declarations (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  financial_year VARCHAR(20) DEFAULT '2025-2026' NOT NULL,
  assessment_year VARCHAR(20) DEFAULT '2026-2027' NOT NULL,
  regime VARCHAR(20) DEFAULT 'new' NOT NULL,
  status VARCHAR(50) DEFAULT 'Draft' NOT NULL,
  submission_date TIMESTAMPTZ,
  verification_date TIMESTAMPTZ,
  verified_by VARCHAR(100),
  remarks TEXT,
  section_80c TEXT,
  section_80ccd_1b TEXT,
  section_80d TEXT,
  section_24_home_loan TEXT,
  section_hra TEXT,
  other_deductions TEXT,
  other_income TEXT,
  tax_computation TEXT,
  proof_attachments TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20) DEFAULT '2025-2026';
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS assessment_year VARCHAR(20) DEFAULT '2026-2027';
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS regime VARCHAR(20) DEFAULT 'new';
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft';
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS submission_date TIMESTAMPTZ;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100);
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS section_80c TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS section_80ccd_1b TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS section_80d TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS section_24_home_loan TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS section_hra TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS other_deductions TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS other_income TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS tax_computation TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS proof_attachments TEXT;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE it_declarations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: mediclaim_policies (18 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS mediclaim_policies (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  policy_number VARCHAR(255) DEFAULT 'GHI-ZEN-2025-0894' NOT NULL,
  tpa_name VARCHAR(255) DEFAULT 'Medi Assist TPA Services' NOT NULL,
  insurance_company VARCHAR(255) DEFAULT 'ICICI Lombard GIC Ltd' NOT NULL,
  policy_start_date DATE DEFAULT '2025-04-01',
  policy_end_date DATE DEFAULT '2026-03-31',
  sum_insured DOUBLE PRECISION DEFAULT '500000'::double precision NOT NULL,
  plan_type VARCHAR(255) DEFAULT 'Corporate Group Floater Plan (1+3)' NOT NULL,
  nominee_name VARCHAR(255),
  nominee_relation VARCHAR(255),
  nominee_contact VARCHAR(255),
  enrolled_dependents TEXT,
  emergency_helpline VARCHAR(255) DEFAULT '1800-425-9449 / 022-6692-2000' NOT NULL,
  tpa_email VARCHAR(255) DEFAULT 'claims@mediassist.in' NOT NULL,
  status VARCHAR(255) DEFAULT 'Active' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS employee_id VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS policy_number VARCHAR(255) DEFAULT 'GHI-ZEN-2025-0894';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS tpa_name VARCHAR(255) DEFAULT 'Medi Assist TPA Services';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(255) DEFAULT 'ICICI Lombard GIC Ltd';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS policy_start_date DATE DEFAULT '2025-04-01';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS policy_end_date DATE DEFAULT '2026-03-31';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS sum_insured DOUBLE PRECISION DEFAULT '500000'::double precision;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS plan_type VARCHAR(255) DEFAULT 'Corporate Group Floater Plan (1+3)';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS nominee_name VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS nominee_relation VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS nominee_contact VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS enrolled_dependents TEXT;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS emergency_helpline VARCHAR(255) DEFAULT '1800-425-9449 / 022-6692-2000';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS tpa_email VARCHAR(255) DEFAULT 'claims@mediassist.in';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'Active';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: mediclaim_claims (26 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS mediclaim_claims (
  id SERIAL PRIMARY KEY,
  claim_number VARCHAR(255) NOT NULL,
  employee_id VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255),
  dept VARCHAR(255),
  patient_name VARCHAR(255) NOT NULL,
  patient_relation VARCHAR(255) DEFAULT 'Self' NOT NULL,
  hospital_name VARCHAR(255) NOT NULL,
  hospital_city VARCHAR(255) NOT NULL,
  hospital_type VARCHAR(255) DEFAULT 'Network (Cashless)' NOT NULL,
  admission_date DATE NOT NULL,
  discharge_date DATE NOT NULL,
  ailment_diagnosis VARCHAR(255) NOT NULL,
  treatment_type VARCHAR(255) DEFAULT 'Inpatient Hospitalization' NOT NULL,
  claimed_amount DOUBLE PRECISION DEFAULT '0'::double precision NOT NULL,
  approved_amount DOUBLE PRECISION,
  settled_amount DOUBLE PRECISION,
  status VARCHAR(255) DEFAULT 'Submitted' NOT NULL,
  submission_date TIMESTAMPTZ,
  settlement_date TIMESTAMPTZ,
  settlement_ref VARCHAR(255),
  hr_remarks TEXT,
  tpa_remarks TEXT,
  supporting_documents TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS claim_number VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS employee_id VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS dept VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS patient_relation VARCHAR(255) DEFAULT 'Self';
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS hospital_city VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(255) DEFAULT 'Network (Cashless)';
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS discharge_date DATE;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS ailment_diagnosis VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS treatment_type VARCHAR(255) DEFAULT 'Inpatient Hospitalization';
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS claimed_amount DOUBLE PRECISION DEFAULT '0'::double precision;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS approved_amount DOUBLE PRECISION;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS settled_amount DOUBLE PRECISION;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'Submitted';
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS submission_date TIMESTAMPTZ;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS settlement_date TIMESTAMPTZ;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS settlement_ref VARCHAR(255);
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS hr_remarks TEXT;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS tpa_remarks TEXT;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS supporting_documents TEXT;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: kpi_templates (11 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS kpi_templates (
  id SERIAL PRIMARY KEY,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) DEFAULT 'All' NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_metric NUMERIC DEFAULT 100 NOT NULL,
  unit VARCHAR(50) DEFAULT '%' NOT NULL,
  default_weight NUMERIC DEFAULT 25 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS designation VARCHAR(100) DEFAULT 'All';
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS target_metric NUMERIC DEFAULT 100;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT '%';
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS default_weight NUMERIC DEFAULT 25;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: kpi_assignments (18 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS kpi_assignments (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  cycle_name VARCHAR(100) DEFAULT 'Q1 2026' NOT NULL,
  department VARCHAR(100),
  designation VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Assigned' NOT NULL,
  total_weightage NUMERIC DEFAULT 100 NOT NULL,
  self_overall_score NUMERIC,
  manager_overall_score NUMERIC,
  final_calibrated_score NUMERIC,
  manager_recommendation VARCHAR(100),
  manager_remarks TEXT,
  hr_remarks TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS cycle_name VARCHAR(100) DEFAULT 'Q1 2026';
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Assigned';
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS total_weightage NUMERIC DEFAULT 100;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS self_overall_score NUMERIC;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS manager_overall_score NUMERIC;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS final_calibrated_score NUMERIC;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS manager_recommendation VARCHAR(100);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS manager_remarks TEXT;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS hr_remarks TEXT;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: kpi_goal_items (14 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS kpi_goal_items (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target NUMERIC DEFAULT 100 NOT NULL,
  unit VARCHAR(50) DEFAULT '%' NOT NULL,
  weightage NUMERIC DEFAULT 25 NOT NULL,
  actual_achieved NUMERIC DEFAULT 0,
  self_rating NUMERIC,
  self_comment TEXT,
  manager_rating NUMERIC,
  manager_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS assignment_id INTEGER;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS target NUMERIC DEFAULT 100;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT '%';
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS weightage NUMERIC DEFAULT 25;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS actual_achieved NUMERIC DEFAULT 0;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS self_rating NUMERIC;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS self_comment TEXT;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS manager_rating NUMERIC;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS manager_comment TEXT;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: recruitment_requisitions (31 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS recruitment_requisitions (
  id UUID NOT NULL,
  requisition_code VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(150) NOT NULL,
  vacancies_count INTEGER DEFAULT 1 NOT NULL,
  experience_required VARCHAR(100) NOT NULL,
  job_description TEXT NOT NULL,
  max_salary NUMERIC NOT NULL,
  salary_frequency VARCHAR(30) DEFAULT 'Per Annum (CTC)' NOT NULL,
  joining_date_type VARCHAR(50) DEFAULT 'Normal' NOT NULL,
  tentative_joining_date DATE,
  is_budgeted BOOLEAN DEFAULT true NOT NULL,
  budget_approval_status VARCHAR(50) DEFAULT 'NOT_REQUIRED' NOT NULL,
  ceo_coo_approver_id VARCHAR(50),
  ceo_coo_approver_name VARCHAR(100),
  ceo_coo_approver_role VARCHAR(50),
  ceo_coo_decision_at TIMESTAMPTZ,
  ceo_coo_comments TEXT,
  reason_for_hiring VARCHAR(100),
  replacement_for_employee VARCHAR(100),
  hod_id VARCHAR(50) NOT NULL,
  hod_name VARCHAR(100) DEFAULT 'Department Head',
  hod_email VARCHAR(255),
  hr_assigned_id VARCHAR(50),
  hr_assigned_name VARCHAR(100),
  hr_notes TEXT,
  status VARCHAR(50) DEFAULT 'SOURCING_CANDIDATES' NOT NULL,
  createdAt TIMESTAMPTZ NOT NULL,
  updatedAt TIMESTAMPTZ NOT NULL,
  approval_document_url VARCHAR(500),
  approval_document_filename VARCHAR(255)
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS requisition_code VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS position VARCHAR(150);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS vacancies_count INTEGER DEFAULT 1;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS experience_required VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS max_salary NUMERIC;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS salary_frequency VARCHAR(30) DEFAULT 'Per Annum (CTC)';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS joining_date_type VARCHAR(50) DEFAULT 'Normal';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS tentative_joining_date DATE;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS is_budgeted BOOLEAN DEFAULT true;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS budget_approval_status VARCHAR(50) DEFAULT 'NOT_REQUIRED';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS ceo_coo_approver_id VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS ceo_coo_approver_name VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS ceo_coo_approver_role VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS ceo_coo_decision_at TIMESTAMPTZ;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS ceo_coo_comments TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS reason_for_hiring VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS replacement_for_employee VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100) DEFAULT 'Department Head';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hod_email VARCHAR(255);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hr_assigned_id VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hr_assigned_name VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hr_notes TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SOURCING_CANDIDATES';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMPTZ;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS approval_document_url VARCHAR(500);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS approval_document_filename VARCHAR(255);

-- ==========================================================================
-- TABLE: recruitment_candidates (33 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id UUID NOT NULL,
  requisition_id UUID NOT NULL,
  candidate_name VARCHAR(150) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  current_company VARCHAR(150),
  current_designation VARCHAR(150),
  experience_years VARCHAR(50) NOT NULL,
  current_ctc NUMERIC,
  expected_ctc NUMERIC,
  notice_period VARCHAR(50) DEFAULT '30 Days' NOT NULL,
  resume_url VARCHAR(500),
  resume_filename VARCHAR(255),
  source VARCHAR(100) DEFAULT 'HR Sourced',
  hr_screening_notes TEXT,
  hr_added_by_id VARCHAR(50),
  hr_added_by_name VARCHAR(100),
  hod_selection_status VARCHAR(50) DEFAULT 'PENDING_REVIEW' NOT NULL,
  hod_feedback TEXT,
  hod_decision_at TIMESTAMPTZ,
  hod_decision_by_id VARCHAR(50),
  hod_decision_by_name VARCHAR(100),
  interview_requested BOOLEAN DEFAULT false NOT NULL,
  interview_requested_at TIMESTAMPTZ,
  interview_stage VARCHAR(50) DEFAULT 'NOT_SCHEDULED' NOT NULL,
  interview_date DATE,
  interview_time VARCHAR(50),
  interview_mode VARCHAR(50),
  interview_meeting_link VARCHAR(500),
  interview_notes TEXT,
  createdAt TIMESTAMPTZ NOT NULL,
  updatedAt TIMESTAMPTZ NOT NULL,
  interview_evaluations JSONB DEFAULT '[]'::jsonb
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS requisition_id UUID;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS candidate_name VARCHAR(150);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS current_company VARCHAR(150);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS current_designation VARCHAR(150);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS experience_years VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS current_ctc NUMERIC;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS expected_ctc NUMERIC;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS notice_period VARCHAR(50) DEFAULT '30 Days';
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS resume_url VARCHAR(500);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS resume_filename VARCHAR(255);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'HR Sourced';
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hr_screening_notes TEXT;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hr_added_by_id VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hr_added_by_name VARCHAR(100);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hod_selection_status VARCHAR(50) DEFAULT 'PENDING_REVIEW';
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hod_feedback TEXT;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hod_decision_at TIMESTAMPTZ;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hod_decision_by_id VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS hod_decision_by_name VARCHAR(100);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_requested BOOLEAN DEFAULT false;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_requested_at TIMESTAMPTZ;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_stage VARCHAR(50) DEFAULT 'NOT_SCHEDULED';
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_date DATE;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_time VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_meeting_link VARCHAR(500);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_notes TEXT;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMPTZ;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_evaluations JSONB DEFAULT '[]'::jsonb;

-- ==========================================================================
-- TABLE: onboardings (71 columns)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS onboardings (
  id UUID NOT NULL,
  employee_id VARCHAR(50),
  candidate_id UUID,
  employee_name VARCHAR(150) NOT NULL,
  personal_email VARCHAR(255),
  phone VARCHAR(50),
  designation VARCHAR(100),
  target_department VARCHAR(100),
  joining_date DATE,
  current_stage VARCHAR(50) DEFAULT 'JOINING' NOT NULL,
  overall_status VARCHAR(50) DEFAULT 'IN_PROGRESS' NOT NULL,
  joining_completed BOOLEAN DEFAULT false,
  joining_completed_at TIMESTAMPTZ,
  joining_remarks TEXT,
  email_issued BOOLEAN DEFAULT false,
  email_address VARCHAR(255),
  email_issued_date DATE,
  id_card_issued BOOLEAN DEFAULT false,
  id_card_number VARCHAR(100),
  id_card_issued_date DATE,
  biometric_registered BOOLEAN DEFAULT false,
  biometric_device_id VARCHAR(100),
  biometric_registered_date DATE,
  laptop_issued BOOLEAN DEFAULT false,
  laptop_serial_no VARCHAR(100),
  laptop_model VARCHAR(100),
  laptop_issued_date DATE,
  bag_issued BOOLEAN DEFAULT false,
  bag_type VARCHAR(100),
  bag_issued_date DATE,
  stationery_issued BOOLEAN DEFAULT false,
  stationery_details VARCHAR(255),
  stationery_issued_date DATE,
  additional_assets JSONB DEFAULT '[]'::jsonb,
  assets_acknowledged BOOLEAN DEFAULT false,
  documentation_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  documentation_completed_at TIMESTAMPTZ,
  documentation_verified_by_id VARCHAR(50),
  documentation_verified_by_name VARCHAR(100),
  documentation_remarks TEXT,
  documents JSONB DEFAULT '[{"key": "aadhaar", "label": "Aadhaar Card", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "pan", "label": "PAN Card", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "education", "label": "Educational Degree / Certificates", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "experience", "label": "Relieving / Prior Experience Letters", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "offer_letter", "label": "Signed Offer & Appointment Letter", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "nda", "label": "Signed NDA & Policies Agreement", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "bank", "label": "Bank Details / Cancelled Cheque", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "photo", "label": "Passport Sized Photograph", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}]'::jsonb NOT NULL,
  hr_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["Company History, Culture & Core Values", "HR Policies, Attendance & Regularization Rules", "Leave System, Holiday Calendar & Shift Regulations", "POSH, Anti-Harassment & Workplace Code of Conduct", "Payroll Cycle, Payslips & Mediclaim Benefits"], "feedback": "", "trainer_name": "", "completed_date": null, "scheduled_date": null}'::jsonb NOT NULL,
  admin_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["Office Administration & Facility Guidelines", "Physical Security, Access Badges & Visitor Entry", "Fire Safety, Disaster Management & Emergency Exits", "Asset Care, Stationery & Helpdesk Protocol", "Workstation Ergonomics & Clean Desk Policy"], "feedback": "", "trainer_name": "", "completed_date": null, "scheduled_date": null}'::jsonb NOT NULL,
  pos_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["POS System Architecture & Login Credentials", "Billing, Invoicing & Cash Register Operations", "Discount Schemes, Return Policies & Customer Service", "Inventory Lookup, Stock Sync & Discrepancies", "Day-End Closing & Transaction Audit Reports"], "feedback": "", "trainer_name": "", "completed_date": null, "scheduled_date": null}'::jsonb NOT NULL,
  dept_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["Department Technology Stack, Tools & Architecture", "Standard Operating Procedures (SOP) & Workflows", "Live Project Architecture, Repositories & Access Setup", "Team Intro, Roles, Key Result Areas (KRAs) & KPIs", "First Deliverable Setup & Mentorship Review"], "feedback": "", "mentor_name": "", "trainer_name": "", "completed_date": null, "scheduled_date": null, "department_name": ""}'::jsonb NOT NULL,
  trainings_completed BOOLEAN DEFAULT false,
  is_assigned_to_dept BOOLEAN DEFAULT false,
  assigned_department VARCHAR(100),
  assigned_hod_id VARCHAR(50),
  assigned_hod_name VARCHAR(100),
  assigned_reporting_manager VARCHAR(100),
  assigned_date DATE,
  assignment_notes TEXT,
  probation_start_date DATE,
  probation_end_date DATE,
  probation_period_months INTEGER DEFAULT 6,
  probation_status VARCHAR(50) DEFAULT 'NOT_STARTED',
  hod_analysis_completed BOOLEAN DEFAULT false,
  hod_performance_rating NUMERIC,
  hod_kpi_rating NUMERIC,
  hod_discipline_rating NUMERIC,
  hod_culture_fit_rating NUMERIC,
  hod_analysis_remarks TEXT,
  hod_decision VARCHAR(50),
  hod_decision_reason TEXT,
  hod_decision_date TIMESTAMPTZ,
  hod_decision_by_id VARCHAR(50),
  hod_decision_by_name VARCHAR(100),
  hod_extension_months INTEGER,
  createdAt TIMESTAMPTZ NOT NULL,
  updatedAt TIMESTAMPTZ NOT NULL
);

-- Migration: Ensure every column exists if table already existed
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS candidate_id UUID;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS target_department VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'JOINING';
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS overall_status VARCHAR(50) DEFAULT 'IN_PROGRESS';
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS joining_completed BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS joining_completed_at TIMESTAMPTZ;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS joining_remarks TEXT;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS email_issued BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS email_address VARCHAR(255);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS email_issued_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS id_card_issued BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS id_card_issued_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS biometric_registered BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS biometric_device_id VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS biometric_registered_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS laptop_issued BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS laptop_serial_no VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS laptop_model VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS laptop_issued_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS bag_issued BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS bag_type VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS bag_issued_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS stationery_issued BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS stationery_details VARCHAR(255);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS stationery_issued_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS additional_assets JSONB DEFAULT '[]'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS assets_acknowledged BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS documentation_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS documentation_completed_at TIMESTAMPTZ;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS documentation_verified_by_id VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS documentation_verified_by_name VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS documentation_remarks TEXT;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[{"key": "aadhaar", "label": "Aadhaar Card", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "pan", "label": "PAN Card", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "education", "label": "Educational Degree / Certificates", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "experience", "label": "Relieving / Prior Experience Letters", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "offer_letter", "label": "Signed Offer & Appointment Letter", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "nda", "label": "Signed NDA & Policies Agreement", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "bank", "label": "Bank Details / Cancelled Cheque", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}, {"key": "photo", "label": "Passport Sized Photograph", "number": "", "status": "PENDING", "doc_url": "", "remarks": ""}]'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hr_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["Company History, Culture & Core Values", "HR Policies, Attendance & Regularization Rules", "Leave System, Holiday Calendar & Shift Regulations", "POSH, Anti-Harassment & Workplace Code of Conduct", "Payroll Cycle, Payslips & Mediclaim Benefits"], "feedback": "", "trainer_name": "", "completed_date": null, "scheduled_date": null}'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS admin_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["Office Administration & Facility Guidelines", "Physical Security, Access Badges & Visitor Entry", "Fire Safety, Disaster Management & Emergency Exits", "Asset Care, Stationery & Helpdesk Protocol", "Workstation Ergonomics & Clean Desk Policy"], "feedback": "", "trainer_name": "", "completed_date": null, "scheduled_date": null}'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS pos_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["POS System Architecture & Login Credentials", "Billing, Invoicing & Cash Register Operations", "Discount Schemes, Return Policies & Customer Service", "Inventory Lookup, Stock Sync & Discrepancies", "Day-End Closing & Transaction Audit Reports"], "feedback": "", "trainer_name": "", "completed_date": null, "scheduled_date": null}'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS dept_training JSONB DEFAULT '{"score": null, "status": "NOT_STARTED", "modules": ["Department Technology Stack, Tools & Architecture", "Standard Operating Procedures (SOP) & Workflows", "Live Project Architecture, Repositories & Access Setup", "Team Intro, Roles, Key Result Areas (KRAs) & KPIs", "First Deliverable Setup & Mentorship Review"], "feedback": "", "mentor_name": "", "trainer_name": "", "completed_date": null, "scheduled_date": null, "department_name": ""}'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS trainings_completed BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS is_assigned_to_dept BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS assigned_department VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS assigned_hod_id VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS assigned_hod_name VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS assigned_reporting_manager VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS assigned_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS assignment_notes TEXT;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS probation_start_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS probation_end_date DATE;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS probation_period_months INTEGER DEFAULT 6;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS probation_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_analysis_completed BOOLEAN DEFAULT false;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_performance_rating NUMERIC;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_kpi_rating NUMERIC;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_discipline_rating NUMERIC;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_culture_fit_rating NUMERIC;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_analysis_remarks TEXT;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_reason TEXT;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_date TIMESTAMPTZ;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_by_id VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_by_name VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_extension_months INTEGER;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMPTZ;

-- ==========================================================================
-- PERFORMANCE INDEXES & ESSENTIAL CONSTRAINTS
-- ==========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_emp_id ON users(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_schedules_emp_date ON schedules(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_payrolls_emp_month ON payrolls(employee_id, month_year);
CREATE INDEX IF NOT EXISTS idx_leaves_emp_id ON leaves(employee_id);

