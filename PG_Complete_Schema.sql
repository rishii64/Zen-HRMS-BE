-- ==========================================================================
-- HRMS LATEST COMPLETE POSTGRESQL MASTER SCHEMA & MIGRATION SCRIPT
-- Target: Hosted / Production PostgreSQL (AWS RDS / Supabase / Neon / Render / Local)
-- Includes: All 61 Tables, Complete Column Definitions, Defaults & Safe Migrations
-- Safe to run multiple times: Uses 'IF NOT EXISTS' for extensions, tables, columns & indexes
-- ==========================================================================

-- 1. Enable Required Extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================================
-- TABLE: departments (10 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  dept_code VARCHAR(30) NOT NULL,
  dept_name VARCHAR(100) NOT NULL,
  description TEXT,
  hod_employee_id VARCHAR(50),
  hod_name VARCHAR(150),
  parent_dept_id INTEGER,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if departments already exists
ALTER TABLE departments ADD COLUMN IF NOT EXISTS dept_code VARCHAR(30);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS dept_name VARCHAR(100);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_employee_id VARCHAR(50);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_name VARCHAR(150);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS parent_dept_id INTEGER;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: job_grades (11 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS job_grades (
  id SERIAL PRIMARY KEY,
  grade_code VARCHAR(20) NOT NULL,
  grade_name VARCHAR(100) NOT NULL,
  rank_level INTEGER DEFAULT 1 NOT NULL,
  min_salary DECIMAL(14,2) DEFAULT 0 NOT NULL,
  max_salary DECIMAL(14,2) DEFAULT 0 NOT NULL,
  notice_period_days INTEGER DEFAULT 30 NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if job_grades already exists
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS grade_code VARCHAR(20);
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS grade_name VARCHAR(100);
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS rank_level INTEGER DEFAULT 1;
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS min_salary DECIMAL(14,2) DEFAULT 0;
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS max_salary DECIMAL(14,2) DEFAULT 0;
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE job_grades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: designations (12 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS designations (
  id SERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  department_id INTEGER,
  grade_id INTEGER NOT NULL,
  job_family VARCHAR(100) DEFAULT 'General' NOT NULL,
  is_hod_role BOOLEAN DEFAULT false NOT NULL,
  is_tl_role BOOLEAN DEFAULT false NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if designations already exists
ALTER TABLE designations ADD COLUMN IF NOT EXISTS title VARCHAR(150);
ALTER TABLE designations ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE designations ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS grade_id INTEGER;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS job_family VARCHAR(100) DEFAULT 'General';
ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_hod_role BOOLEAN DEFAULT false;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_tl_role BOOLEAN DEFAULT false;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: users (72 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  work_email VARCHAR(255),
  personal_email VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'employee' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  status VARCHAR(50) DEFAULT 'Active' NOT NULL,
  employment_type VARCHAR(50) DEFAULT 'Permanent' NOT NULL,
  current_salary DECIMAL(12,2),
  dept VARCHAR(100),
  designation VARCHAR(100),
  department_id INTEGER,
  designation_id INTEGER,
  grade_id INTEGER,
  reporting_manager_id VARCHAR(50),
  team_lead_id VARCHAR(50),
  team_lead_name VARCHAR(100) DEFAULT 'N/A',
  hod_id VARCHAR(50),
  hod_name VARCHAR(100) DEFAULT 'N/A',
  role_updated_at TIMESTAMPTZ,
  group_name VARCHAR(100) DEFAULT 'TATA Company',
  company_name VARCHAR(100) DEFAULT 'TATA Steel',
  work_location VARCHAR(100) DEFAULT 'Kolkata',
  weekly_off VARCHAR(20) DEFAULT 'Sunday',
  joining_date DATE,
  reporting_manager VARCHAR(100) DEFAULT 'N/A',
  phone_no VARCHAR(20),
  kpi TEXT,
  tabs_enabled BOOLEAN DEFAULT false NOT NULL,
  enabled_tabs VARCHAR(255) DEFAULT '1,2,3,4' NOT NULL,
  notice_acknowledged BOOLEAN DEFAULT false NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  nationality VARCHAR(50),
  address_current TEXT,
  address_permanent TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  education TEXT,
  highest_qualification VARCHAR(150),
  family_details TEXT,
  doc_resume VARCHAR(255),
  doc_id VARCHAR(255),
  doc_cert VARCHAR(255),
  profile_photo VARCHAR(255),
  blood_group VARCHAR(10),
  religion VARCHAR(50),
  total_experience TEXT,
  previous_experience TEXT,
  marital_status VARCHAR(50),
  certifications TEXT,
  passport_visa TEXT,
  bank_details TEXT,
  document_status VARCHAR(50) DEFAULT 'Not Uploaded' NOT NULL,
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
  salary_structure TEXT,
  facilities TEXT,
  esi_threshold DECIMAL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if users already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Permanent';
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_salary DECIMAL(12,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_manager_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_lead_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_lead_name VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE users ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_off VARCHAR(20) DEFAULT 'Sunday';
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reporting_manager VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_no VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kpi TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tabs_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS enabled_tabs VARCHAR(255) DEFAULT '1,2,3,4';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notice_acknowledged BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_current TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_permanent TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS highest_qualification VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_details TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_resume VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_cert VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_experience TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS previous_experience TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_visa TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_details TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Not Uploaded';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pan_no VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS driving_license VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_pan VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_aadhaar VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_payslips TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_exp_cert TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS doc_last_company TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS uploaded_documents TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_company_details TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_structure TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facilities TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS esi_threshold DECIMAL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: employees (69 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  work_email VARCHAR(255),
  personal_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Active' NOT NULL,
  employment_type VARCHAR(50) DEFAULT 'Permanent' NOT NULL,
  job_role VARCHAR(50) DEFAULT 'employee' NOT NULL,
  dept VARCHAR(100),
  designation VARCHAR(100),
  department_id INTEGER,
  designation_id INTEGER,
  grade_id INTEGER,
  reporting_manager_id VARCHAR(50),
  team_lead_id VARCHAR(50),
  team_lead_name VARCHAR(100) DEFAULT 'N/A',
  hod_id VARCHAR(50),
  hod_name VARCHAR(100) DEFAULT 'N/A',
  role_updated_at TIMESTAMPTZ,
  group_name VARCHAR(100) DEFAULT 'TATA Company',
  company_name VARCHAR(100) DEFAULT 'TATA Steel',
  work_location VARCHAR(100) DEFAULT 'Kolkata',
  weekly_off VARCHAR(20) DEFAULT 'Sunday',
  current_salary DECIMAL(12,2),
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
  highest_qualification VARCHAR(150),
  family_details TEXT,
  doc_resume VARCHAR(255),
  doc_id VARCHAR(255),
  doc_cert VARCHAR(255),
  profile_photo VARCHAR(255),
  blood_group VARCHAR(10),
  religion VARCHAR(50),
  total_experience TEXT,
  previous_experience TEXT,
  marital_status VARCHAR(50),
  certifications TEXT,
  passport_visa TEXT,
  bank_details TEXT,
  document_status VARCHAR(50) DEFAULT 'Not Uploaded' NOT NULL,
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
  salary_structure TEXT,
  facilities TEXT,
  esi_threshold DECIMAL,
  biometric_device_id VARCHAR(100)
);

-- Safe Migration: Add any missing column if employees already exists
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Permanent';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_role VARCHAR(50) DEFAULT 'employee';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS grade_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_lead_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_lead_name VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role_updated_at TIMESTAMPTZ;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) DEFAULT 'TATA Company';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT 'TATA Steel';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS weekly_off VARCHAR(20) DEFAULT 'Sunday';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS current_salary DECIMAL(12,2);
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
ALTER TABLE employees ADD COLUMN IF NOT EXISTS highest_qualification VARCHAR(150);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS family_details TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_resume VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_id VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS doc_cert VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS total_experience TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS previous_experience TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_visa TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_details TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS document_status VARCHAR(50) DEFAULT 'Not Uploaded';
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
ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_structure TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS facilities TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS esi_threshold DECIMAL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_device_id VARCHAR(100);

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

-- Safe Migration: Add any missing column if password_resets already exists
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS otp VARCHAR(6);
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: system_settings
-- ==========================================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS key VARCHAR(100);
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

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
  work_hours DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'Present' NOT NULL,
  late_count INTEGER DEFAULT 0 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if attendance already exists
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in VARCHAR(20);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out VARCHAR(20);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS work_hours DECIMAL(5,2);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Present';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS late_count INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

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
  is_rotational_off BOOLEAN DEFAULT false NOT NULL,
  created_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if schedules already exists
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
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_rotational_off BOOLEAN DEFAULT false;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: attendance_regularizations (24 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS attendance_regularizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  attendance_date DATE NOT NULL,
  request_type VARCHAR(50) DEFAULT 'MISSED_PUNCH' NOT NULL,
  original_check_in VARCHAR(20),
  original_check_out VARCHAR(20),
  original_status VARCHAR(50) DEFAULT 'Absent',
  requested_check_in VARCHAR(20) DEFAULT '09:30' NOT NULL,
  requested_check_out VARCHAR(20) DEFAULT '18:30' NOT NULL,
  requested_status VARCHAR(50) DEFAULT 'Present' NOT NULL,
  calculated_work_hours DECIMAL(5,2) DEFAULT 9,
  reason TEXT NOT NULL,
  supporting_doc_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  reviewed_by_id VARCHAR(50),
  reviewed_by_name VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  review_remarks TEXT,
  attendance_id INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if attendance_regularizations already exists
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS request_no VARCHAR(50);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS employee_name VARCHAR(100);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS attendance_date DATE;
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS request_type VARCHAR(50) DEFAULT 'MISSED_PUNCH';
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS original_check_in VARCHAR(20);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS original_check_out VARCHAR(20);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS original_status VARCHAR(50) DEFAULT 'Absent';
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS requested_check_in VARCHAR(20) DEFAULT '09:30';
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS requested_check_out VARCHAR(20) DEFAULT '18:30';
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS requested_status VARCHAR(50) DEFAULT 'Present';
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS calculated_work_hours DECIMAL(5,2) DEFAULT 9;
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS supporting_doc_url VARCHAR(500);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS reviewed_by_id VARCHAR(50);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(100);
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS review_remarks TEXT;
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS attendance_id INTEGER;
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE attendance_regularizations ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: work_from_homes (20 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS work_from_homes (
  id SERIAL PRIMARY KEY,
  request_no VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_type VARCHAR(50) DEFAULT 'Full Day' NOT NULL,
  total_days DECIMAL(4,1) DEFAULT 1 NOT NULL,
  reason TEXT NOT NULL,
  work_plan TEXT,
  emergency_contact VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  current_level INTEGER DEFAULT 1,
  approver_id VARCHAR(50),
  approver_name VARCHAR(100),
  approval_remarks TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if work_from_homes already exists
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS request_no VARCHAR(50);
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS employee_name VARCHAR(100);
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS day_type VARCHAR(50) DEFAULT 'Full Day';
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS total_days DECIMAL(4,1) DEFAULT 1;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS work_plan TEXT;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50);
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS approver_id VARCHAR(50);
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS approver_name VARCHAR(100);
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS approval_remarks TEXT;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE work_from_homes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: biometric_devices (17 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS biometric_devices (
  id SERIAL PRIMARY KEY,
  device_name VARCHAR(150) NOT NULL,
  device_serial VARCHAR(100) NOT NULL,
  device_type VARCHAR(50) DEFAULT 'ZKTeco' NOT NULL,
  ip_address VARCHAR(50) DEFAULT '192.168.1.201',
  port INTEGER DEFAULT 4370 NOT NULL,
  location VARCHAR(150) DEFAULT 'Main Reception HQ' NOT NULL,
  api_key VARCHAR(100) NOT NULL,
  status VARCHAR(30) DEFAULT 'ONLINE' NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_ping_at TIMESTAMPTZ,
  total_punches_synced INTEGER DEFAULT 0 NOT NULL,
  sync_mode VARCHAR(50) DEFAULT 'REALTIME_PUSH' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if biometric_devices already exists
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS device_name VARCHAR(150);
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS device_serial VARCHAR(100);
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) DEFAULT 'ZKTeco';
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50) DEFAULT '192.168.1.201';
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 4370;
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS location VARCHAR(150) DEFAULT 'Main Reception HQ';
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS api_key VARCHAR(100);
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ONLINE';
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ;
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS total_punches_synced INTEGER DEFAULT 0;
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS sync_mode VARCHAR(50) DEFAULT 'REALTIME_PUSH';
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE biometric_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: biometric_punches (17 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS biometric_punches (
  id SERIAL PRIMARY KEY,
  device_id INTEGER,
  device_name VARCHAR(150),
  device_serial VARCHAR(100),
  biometric_user_id VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50),
  punch_time VARCHAR(20) NOT NULL,
  punch_date DATE NOT NULL,
  punch_type VARCHAR(30) DEFAULT 'AUTO' NOT NULL,
  verification_type VARCHAR(50) DEFAULT 'FINGERPRINT' NOT NULL,
  sync_status VARCHAR(50) DEFAULT 'PROCESSED' NOT NULL,
  punch_category VARCHAR(50) DEFAULT 'FIRST_ENTRY' NOT NULL,
  attendance_id INTEGER,
  raw_data TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if biometric_punches already exists
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS device_id INTEGER;
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS device_name VARCHAR(150);
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS device_serial VARCHAR(100);
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS biometric_user_id VARCHAR(100);
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS punch_time VARCHAR(20);
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS punch_date DATE;
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS punch_type VARCHAR(30) DEFAULT 'AUTO';
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS verification_type VARCHAR(50) DEFAULT 'FINGERPRINT';
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'PROCESSED';
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS punch_category VARCHAR(50) DEFAULT 'FIRST_ENTRY';
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS attendance_id INTEGER;
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS raw_data TEXT;
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE biometric_punches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: holidays (14 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  date DATE NOT NULL,
  day VARCHAR(30),
  month VARCHAR(10),
  day_num INTEGER,
  type VARCHAR(50) DEFAULT 'Public' NOT NULL,
  is_working_day BOOLEAN DEFAULT false NOT NULL,
  dept VARCHAR(100) DEFAULT 'All' NOT NULL,
  branch_location VARCHAR(120) DEFAULT 'All' NOT NULL,
  created_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if holidays already exists
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS day VARCHAR(30);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS month VARCHAR(10);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS day_num INTEGER;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Public';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_working_day BOOLEAN DEFAULT false;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS dept VARCHAR(100) DEFAULT 'All';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS branch_location VARCHAR(120) DEFAULT 'All';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: admin_tasks (15 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS admin_tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Facilities & Maintenance' NOT NULL,
  description TEXT,
  requester_name VARCHAR(150),
  requester_id VARCHAR(50),
  dept VARCHAR(100) DEFAULT 'General',
  priority VARCHAR(50) DEFAULT 'Medium' NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  due_date DATE,
  assigned_to VARCHAR(150) DEFAULT 'Admin Team',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if admin_tasks already exists
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Facilities & Maintenance';
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS requester_name VARCHAR(150);
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS requester_id VARCHAR(50);
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS dept VARCHAR(100) DEFAULT 'General';
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium';
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(150) DEFAULT 'Admin Team';
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE admin_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: hr_events (21 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS hr_events (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(150) DEFAULT 'Zentelex' NOT NULL,
  branch_location VARCHAR(150) DEFAULT 'Kolkata HQ' NOT NULL,
  address TEXT,
  event_name VARCHAR(255) NOT NULL,
  event_category VARCHAR(100) DEFAULT 'Event' NOT NULL,
  event_date DATE NOT NULL,
  start_time VARCHAR(50) DEFAULT '10:00 AM',
  end_time VARCHAR(50) DEFAULT '01:00 PM',
  content TEXT NOT NULL,
  sign_off VARCHAR(100) DEFAULT 'HR Team' NOT NULL,
  target_audience VARCHAR(100) DEFAULT 'All Employees' NOT NULL,
  status VARCHAR(50) DEFAULT 'Draft' NOT NULL,
  theme VARCHAR(50) DEFAULT 'purple' NOT NULL,
  created_by_id VARCHAR(50),
  created_by_name VARCHAR(150),
  created_by_role VARCHAR(50),
  emails_sent_count INTEGER DEFAULT 0 NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if hr_events already exists
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS company_name VARCHAR(150) DEFAULT 'Zentelex';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS branch_location VARCHAR(150) DEFAULT 'Kolkata HQ';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS event_category VARCHAR(100) DEFAULT 'Event';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS start_time VARCHAR(50) DEFAULT '10:00 AM';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS end_time VARCHAR(50) DEFAULT '01:00 PM';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS sign_off VARCHAR(100) DEFAULT 'HR Team';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100) DEFAULT 'All Employees';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT 'purple';
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(50);
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150);
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50);
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS emails_sent_count INTEGER DEFAULT 0;
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE hr_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: notifications (15 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_id VARCHAR(100) DEFAULT 'ALL' NOT NULL,
  recipient_role VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' NOT NULL,
  category VARCHAR(50) DEFAULT 'General' NOT NULL,
  link VARCHAR(255),
  priority VARCHAR(20) DEFAULT 'normal' NOT NULL,
  is_read BOOLEAN DEFAULT false NOT NULL,
  read_by TEXT,
  source_module VARCHAR(100),
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if notifications already exists
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id VARCHAR(100) DEFAULT 'ALL';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'General';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_by TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_module VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: leave_policies (14 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS leave_policies (
  id SERIAL PRIMARY KEY,
  leave_code VARCHAR(20) NOT NULL,
  leave_name VARCHAR(100) NOT NULL,
  default_annual_quota DOUBLE PRECISION DEFAULT 0 NOT NULL,
  can_carry_forward BOOLEAN DEFAULT false NOT NULL,
  carry_forward_max_years INTEGER DEFAULT 0 NOT NULL,
  max_stack_limit INTEGER DEFAULT 0 NOT NULL,
  applicable_gender VARCHAR(20) DEFAULT 'All' NOT NULL,
  employment_type_eligibility VARCHAR(50) DEFAULT 'All' NOT NULL,
  color VARCHAR(30) DEFAULT '#3b82f6',
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if leave_policies already exists
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS leave_code VARCHAR(20);
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS leave_name VARCHAR(100);
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS default_annual_quota DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS can_carry_forward BOOLEAN DEFAULT false;
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS carry_forward_max_years INTEGER DEFAULT 0;
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS max_stack_limit INTEGER DEFAULT 0;
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS applicable_gender VARCHAR(20) DEFAULT 'All';
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS employment_type_eligibility VARCHAR(50) DEFAULT 'All';
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS color VARCHAR(30) DEFAULT '#3b82f6';
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE leave_policies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: leave_allocations (19 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS leave_allocations (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150),
  dept VARCHAR(100) DEFAULT 'General',
  year INTEGER DEFAULT 2026 NOT NULL,
  leave_type VARCHAR(100) NOT NULL,
  leave_code VARCHAR(20) NOT NULL,
  allocated_days DOUBLE PRECISION DEFAULT 0 NOT NULL,
  carried_forward DOUBLE PRECISION DEFAULT 0 NOT NULL,
  used_days DOUBLE PRECISION DEFAULT 0 NOT NULL,
  lapsed_days DOUBLE PRECISION DEFAULT 0 NOT NULL,
  balance DOUBLE PRECISION DEFAULT 0 NOT NULL,
  can_carry_forward BOOLEAN DEFAULT false NOT NULL,
  max_stack_limit INTEGER DEFAULT 45 NOT NULL,
  carry_forward_max_years INTEGER DEFAULT 3 NOT NULL,
  notes TEXT,
  allocated_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if leave_allocations already exists
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS dept VARCHAR(100) DEFAULT 'General';
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2026;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS leave_type VARCHAR(100);
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS leave_code VARCHAR(20);
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS allocated_days DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS carried_forward DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS used_days DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS lapsed_days DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS balance DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS can_carry_forward BOOLEAN DEFAULT false;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS max_stack_limit INTEGER DEFAULT 45;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS carry_forward_max_years INTEGER DEFAULT 3;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS allocated_by VARCHAR(100);
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: leave_carry_forward_logs (19 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS leave_carry_forward_logs (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150),
  dept VARCHAR(100),
  leave_code VARCHAR(20) NOT NULL,
  leave_type VARCHAR(100) NOT NULL,
  from_year INTEGER NOT NULL,
  to_year INTEGER NOT NULL,
  unutilized_balance DOUBLE PRECISION DEFAULT 0 NOT NULL,
  years_carried INTEGER DEFAULT 1 NOT NULL,
  eligible_carry_forward DOUBLE PRECISION DEFAULT 0 NOT NULL,
  excess_lapsed DOUBLE PRECISION DEFAULT 0 NOT NULL,
  actual_carried_forward DOUBLE PRECISION DEFAULT 0 NOT NULL,
  total_stacked DOUBLE PRECISION DEFAULT 0 NOT NULL,
  expiry_year INTEGER NOT NULL,
  notes TEXT,
  processed_by VARCHAR(100) DEFAULT 'HR',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if leave_carry_forward_logs already exists
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS dept VARCHAR(100);
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS leave_code VARCHAR(20);
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS leave_type VARCHAR(100);
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS from_year INTEGER;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS to_year INTEGER;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS unutilized_balance DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS years_carried INTEGER DEFAULT 1;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS eligible_carry_forward DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS excess_lapsed DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS actual_carried_forward DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS total_stacked DOUBLE PRECISION DEFAULT 0;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS expiry_year INTEGER;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS processed_by VARCHAR(100) DEFAULT 'HR';
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE leave_carry_forward_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

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
  total_days DOUBLE PRECISION DEFAULT 1 NOT NULL,
  reason TEXT,
  emergency_contact VARCHAR(255),
  doc_url VARCHAR(255),
  status VARCHAR(255) DEFAULT 'Pending' NOT NULL,
  approver VARCHAR(255),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if leaves already exists
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS employee_id VARCHAR(255);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS dept VARCHAR(255) DEFAULT 'General';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS leave_type VARCHAR(255) DEFAULT 'Casual Leave';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS day_type VARCHAR(255) DEFAULT 'Full Day';
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS total_days DOUBLE PRECISION DEFAULT 1;
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
  gross_pay DECIMAL(12,2) DEFAULT 0 NOT NULL,
  attendance_summary TEXT,
  lop_deduction DECIMAL(12,2) DEFAULT 0 NOT NULL,
  tax_deductions TEXT,
  statutory_deductions TEXT,
  adjustments TEXT,
  total_deductions DECIMAL(12,2) DEFAULT 0 NOT NULL,
  net_salary DECIMAL(12,2) DEFAULT 0 NOT NULL,
  status VARCHAR(50) DEFAULT 'Finalized' NOT NULL,
  payment_date DATE,
  payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if payrolls already exists
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS month_year VARCHAR(50);
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS fixed_pay TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS variable_pay TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS attendance_summary TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS lop_deduction DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS tax_deductions TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS statutory_deductions TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS adjustments TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS net_salary DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Finalized';
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Bank Transfer';
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

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

-- Safe Migration: Add any missing column if it_declarations already exists
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
-- TABLE: loans_advances (40 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS loans_advances (
  id SERIAL PRIMARY KEY,
  application_number VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(255),
  department VARCHAR(100),
  designation VARCHAR(100),
  type VARCHAR(50) DEFAULT 'SALARY_ADVANCE' NOT NULL,
  principal_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  interest_rate DOUBLE PRECISION DEFAULT 0 NOT NULL,
  interest_type VARCHAR(50) DEFAULT 'REDUCING_BALANCE',
  tenure_months INTEGER DEFAULT 1 NOT NULL,
  monthly_emi DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_interest DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_repayable DECIMAL(12,2) DEFAULT 0 NOT NULL,
  remaining_balance DECIMAL(12,2) DEFAULT 0 NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  paid_installments INTEGER DEFAULT 0,
  total_installments INTEGER DEFAULT 1 NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  reason_details TEXT,
  repayment_start_month VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING_APPROVAL' NOT NULL,
  repayment_schedule JSONB,
  manager_id VARCHAR(50),
  manager_name VARCHAR(150),
  manager_decision VARCHAR(50),
  manager_comments TEXT,
  manager_action_date TIMESTAMPTZ,
  finance_id VARCHAR(50),
  finance_name VARCHAR(150),
  finance_decision VARCHAR(50),
  finance_comments TEXT,
  finance_action_date TIMESTAMPTZ,
  disbursement_date DATE,
  disbursement_mode VARCHAR(50) DEFAULT 'Bank Transfer',
  disbursement_ref VARCHAR(100),
  disbursed_by VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if loans_advances already exists
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS application_number VARCHAR(50);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'SALARY_ADVANCE';
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS principal_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS interest_rate DOUBLE PRECISION DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS interest_type VARCHAR(50) DEFAULT 'REDUCING_BALANCE';
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS tenure_months INTEGER DEFAULT 1;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS monthly_emi DECIMAL(12,2) DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS total_interest DECIMAL(12,2) DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS total_repayable DECIMAL(12,2) DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS paid_installments INTEGER DEFAULT 0;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS total_installments INTEGER DEFAULT 1;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS purpose VARCHAR(255);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS reason_details TEXT;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS repayment_start_month VARCHAR(20);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING_APPROVAL';
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS repayment_schedule JSONB;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS manager_decision VARCHAR(50);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS manager_comments TEXT;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS manager_action_date TIMESTAMPTZ;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS finance_id VARCHAR(50);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS finance_name VARCHAR(150);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS finance_decision VARCHAR(50);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS finance_comments TEXT;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS finance_action_date TIMESTAMPTZ;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS disbursement_date DATE;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS disbursement_mode VARCHAR(50) DEFAULT 'Bank Transfer';
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS disbursement_ref VARCHAR(100);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS disbursed_by VARCHAR(150);
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE loans_advances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: loan_repayment_logs (15 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS loan_repayment_logs (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  month_year VARCHAR(20) NOT NULL,
  installment_number INTEGER NOT NULL,
  emi_amount DECIMAL(12,2) NOT NULL,
  principal_component DECIMAL(12,2) NOT NULL,
  interest_component DECIMAL(12,2) DEFAULT 0 NOT NULL,
  remaining_balance_after DECIMAL(12,2) NOT NULL,
  payment_source VARCHAR(50) DEFAULT 'PAYROLL_DEDUCTION',
  payroll_id INTEGER,
  deduction_date DATE DEFAULT '{}'::jsonb NOT NULL,
  remarks VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if loan_repayment_logs already exists
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS loan_id INTEGER;
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS month_year VARCHAR(20);
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS installment_number INTEGER;
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS emi_amount DECIMAL(12,2);
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS principal_component DECIMAL(12,2);
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS interest_component DECIMAL(12,2) DEFAULT 0;
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS remaining_balance_after DECIMAL(12,2);
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS payment_source VARCHAR(50) DEFAULT 'PAYROLL_DEDUCTION';
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS payroll_id INTEGER;
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS deduction_date DATE DEFAULT '{}'::jsonb;
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS remarks VARCHAR(255);
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE loan_repayment_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: overtime_tickets (36 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS overtime_tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  designation VARCHAR(100),
  attendance_id INTEGER,
  attendance_date DATE NOT NULL,
  shift_name VARCHAR(60) DEFAULT 'General Shift' NOT NULL,
  shift_start VARCHAR(20) DEFAULT '10:00' NOT NULL,
  shift_end VARCHAR(20) DEFAULT '19:00' NOT NULL,
  check_in VARCHAR(20),
  check_out VARCHAR(20),
  total_work_hours DECIMAL(5,2) DEFAULT 0,
  standard_hours DECIMAL(5,2) DEFAULT 8 NOT NULL,
  overtime_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  overtime_minutes INTEGER DEFAULT 0 NOT NULL,
  hourly_rate DECIMAL(10,2) DEFAULT 0 NOT NULL,
  ot_multiplier DECIMAL(4,2) DEFAULT 1.5 NOT NULL,
  estimated_payout DECIMAL(10,2) DEFAULT 0 NOT NULL,
  reason_for_ot VARCHAR(255) NOT NULL,
  task_description TEXT,
  reporting_manager VARCHAR(150),
  reporting_manager_id VARCHAR(50),
  status VARCHAR(30) DEFAULT 'Pending' NOT NULL,
  reviewed_by VARCHAR(50),
  reviewed_by_name VARCHAR(150),
  reviewed_at TIMESTAMPTZ,
  approved_hours DECIMAL(5,2),
  approved_payout DECIMAL(10,2) DEFAULT 0,
  manager_remarks TEXT,
  payout_status VARCHAR(30) DEFAULT 'Unpaid' NOT NULL,
  payroll_month VARCHAR(30),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if overtime_tickets already exists
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(50);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS attendance_id INTEGER;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS attendance_date DATE;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS shift_name VARCHAR(60) DEFAULT 'General Shift';
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS shift_start VARCHAR(20) DEFAULT '10:00';
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS shift_end VARCHAR(20) DEFAULT '19:00';
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS check_in VARCHAR(20);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS check_out VARCHAR(20);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS total_work_hours DECIMAL(5,2) DEFAULT 0;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS standard_hours DECIMAL(5,2) DEFAULT 8;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5,2) DEFAULT 0;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS ot_multiplier DECIMAL(4,2) DEFAULT 1.5;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS estimated_payout DECIMAL(10,2) DEFAULT 0;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS reason_for_ot VARCHAR(255);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS task_description TEXT;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS reporting_manager VARCHAR(150);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS reporting_manager_id VARCHAR(50);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(50);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(150);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS approved_hours DECIMAL(5,2);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS approved_payout DECIMAL(10,2) DEFAULT 0;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS manager_remarks TEXT;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS payout_status VARCHAR(30) DEFAULT 'Unpaid';
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS payroll_month VARCHAR(30);
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE overtime_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: mediclaim_policies (23 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS mediclaim_policies (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  policy_number VARCHAR(255) DEFAULT 'GHI-ZEN-2025-0894' NOT NULL,
  tpa_name VARCHAR(255) DEFAULT 'Medi Assist TPA Services' NOT NULL,
  insurance_company VARCHAR(255) DEFAULT 'ICICI Lombard GIC Ltd' NOT NULL,
  policy_start_date DATE DEFAULT '2025-04-01',
  policy_end_date DATE DEFAULT '2026-03-31',
  sum_insured DOUBLE PRECISION DEFAULT 500000 NOT NULL,
  plan_type VARCHAR(255) DEFAULT 'Corporate Group Floater Plan (1+3)' NOT NULL,
  nominee_name VARCHAR(255),
  nominee_relation VARCHAR(255),
  nominee_contact VARCHAR(255),
  enrolled_dependents TEXT,
  emergency_helpline VARCHAR(255) DEFAULT '1800-425-9449 / 022-6692-2000' NOT NULL,
  tpa_email VARCHAR(255) DEFAULT 'claims@mediassist.in' NOT NULL,
  status VARCHAR(255) DEFAULT 'Active' NOT NULL,
  renewal_reminder_30d_sent BOOLEAN DEFAULT false NOT NULL,
  renewal_reminder_15d_sent BOOLEAN DEFAULT false NOT NULL,
  renewal_reminder_7d_sent BOOLEAN DEFAULT false NOT NULL,
  last_renewal_reminder_date TIMESTAMPTZ,
  renewal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if mediclaim_policies already exists
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS employee_id VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS policy_number VARCHAR(255) DEFAULT 'GHI-ZEN-2025-0894';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS tpa_name VARCHAR(255) DEFAULT 'Medi Assist TPA Services';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(255) DEFAULT 'ICICI Lombard GIC Ltd';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS policy_start_date DATE DEFAULT '2025-04-01';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS policy_end_date DATE DEFAULT '2026-03-31';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS sum_insured DOUBLE PRECISION DEFAULT 500000;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS plan_type VARCHAR(255) DEFAULT 'Corporate Group Floater Plan (1+3)';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS nominee_name VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS nominee_relation VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS nominee_contact VARCHAR(255);
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS enrolled_dependents TEXT;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS emergency_helpline VARCHAR(255) DEFAULT '1800-425-9449 / 022-6692-2000';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS tpa_email VARCHAR(255) DEFAULT 'claims@mediassist.in';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'Active';
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS renewal_reminder_30d_sent BOOLEAN DEFAULT false;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS renewal_reminder_15d_sent BOOLEAN DEFAULT false;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS renewal_reminder_7d_sent BOOLEAN DEFAULT false;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS last_renewal_reminder_date TIMESTAMPTZ;
ALTER TABLE mediclaim_policies ADD COLUMN IF NOT EXISTS renewal_notes TEXT;
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
  claimed_amount DOUBLE PRECISION DEFAULT 0 NOT NULL,
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

-- Safe Migration: Add any missing column if mediclaim_claims already exists
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
ALTER TABLE mediclaim_claims ADD COLUMN IF NOT EXISTS claimed_amount DOUBLE PRECISION DEFAULT 0;
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
-- TABLE: mediclaim_highlights (9 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS mediclaim_highlights (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  badge VARCHAR(255) DEFAULT 'Included' NOT NULL,
  badge_color VARCHAR(255) DEFAULT 'emerald' NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(255) DEFAULT 'shield' NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if mediclaim_highlights already exists
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS badge VARCHAR(255) DEFAULT 'Included';
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS badge_color VARCHAR(255) DEFAULT 'emerald';
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS icon VARCHAR(255) DEFAULT 'shield';
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE mediclaim_highlights ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: mediclaim_hospitals (10 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS mediclaim_hospitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  area VARCHAR(255),
  address TEXT,
  helpline VARCHAR(255) DEFAULT '+91 1800 425 9449',
  cashless BOOLEAN DEFAULT true NOT NULL,
  hospital_type VARCHAR(255) DEFAULT 'Multi Specialty' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if mediclaim_hospitals already exists
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS area VARCHAR(255);
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS helpline VARCHAR(255) DEFAULT '+91 1800 425 9449';
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS cashless BOOLEAN DEFAULT true;
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(255) DEFAULT 'Multi Specialty';
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE mediclaim_hospitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: approval_workflows (14 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS approval_workflows (
  id SERIAL PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  workflow_name VARCHAR(150) NOT NULL,
  description TEXT,
  department VARCHAR(100) DEFAULT 'ALL' NOT NULL,
  min_amount DECIMAL(12,2) DEFAULT 0,
  min_days DOUBLE PRECISION DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  allow_auto_skip BOOLEAN DEFAULT true NOT NULL,
  notify_on_each_step BOOLEAN DEFAULT true NOT NULL,
  created_by VARCHAR(100) DEFAULT 'HR Admin',
  updated_by VARCHAR(100) DEFAULT 'HR Admin',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if approval_workflows already exists
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS module VARCHAR(50);
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS workflow_name VARCHAR(150);
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'ALL';
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS min_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS min_days DOUBLE PRECISION DEFAULT 0;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS allow_auto_skip BOOLEAN DEFAULT true;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS notify_on_each_step BOOLEAN DEFAULT true;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'HR Admin';
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100) DEFAULT 'HR Admin';
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: approval_workflow_steps (15 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS approval_workflow_steps (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL,
  level_order INTEGER NOT NULL,
  level_name VARCHAR(150) NOT NULL,
  approver_type VARCHAR(50) DEFAULT 'REPORTING_MANAGER' NOT NULL,
  approver_role VARCHAR(50),
  specific_employee_id VARCHAR(50),
  specific_employee_name VARCHAR(150),
  condition_type VARCHAR(50) DEFAULT 'ALWAYS' NOT NULL,
  condition_value DOUBLE PRECISION DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT true NOT NULL,
  can_auto_skip BOOLEAN DEFAULT true NOT NULL,
  sla_hours INTEGER DEFAULT 48,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if approval_workflow_steps already exists
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS workflow_id INTEGER;
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS level_order INTEGER;
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS level_name VARCHAR(150);
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS approver_type VARCHAR(50) DEFAULT 'REPORTING_MANAGER';
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS approver_role VARCHAR(50);
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS specific_employee_id VARCHAR(50);
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS specific_employee_name VARCHAR(150);
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS condition_type VARCHAR(50) DEFAULT 'ALWAYS';
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS condition_value DOUBLE PRECISION DEFAULT 0;
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true;
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS can_auto_skip BOOLEAN DEFAULT true;
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT 48;
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE approval_workflow_steps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: approval_requests (28 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  workflow_id INTEGER,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(255),
  department VARCHAR(100),
  designation VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) DEFAULT 0,
  days DOUBLE PRECISION DEFAULT 0,
  total_levels INTEGER DEFAULT 1 NOT NULL,
  current_level INTEGER DEFAULT 1 NOT NULL,
  current_level_name VARCHAR(150),
  current_approver_id VARCHAR(50),
  current_approver_name VARCHAR(150),
  current_approver_role VARCHAR(50),
  status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  final_decision VARCHAR(50),
  final_decision_date TIMESTAMPTZ,
  final_decision_by VARCHAR(150),
  final_remarks TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if approval_requests already exists
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS request_number VARCHAR(50);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS module VARCHAR(50);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS workflow_id INTEGER;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS days DOUBLE PRECISION DEFAULT 0;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS total_levels INTEGER DEFAULT 1;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS current_level_name VARCHAR(150);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS current_approver_id VARCHAR(50);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS current_approver_name VARCHAR(150);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS current_approver_role VARCHAR(50);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS final_decision VARCHAR(50);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS final_decision_date TIMESTAMPTZ;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS final_decision_by VARCHAR(150);
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS final_remarks TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: approval_request_steps (17 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS approval_request_steps (
  id SERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  level_order INTEGER NOT NULL,
  level_name VARCHAR(150) NOT NULL,
  approver_type VARCHAR(50) NOT NULL,
  approver_role VARCHAR(50),
  assigned_to_id VARCHAR(50),
  assigned_to_name VARCHAR(150),
  status VARCHAR(50) DEFAULT 'WAITING' NOT NULL,
  decision VARCHAR(50),
  comments TEXT,
  acted_by_id VARCHAR(50),
  acted_by_name VARCHAR(150),
  acted_by_role VARCHAR(50),
  action_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if approval_request_steps already exists
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS request_id UUID;
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS level_order INTEGER;
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS level_name VARCHAR(150);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS approver_type VARCHAR(50);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS approver_role VARCHAR(50);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS assigned_to_id VARCHAR(50);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(150);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'WAITING';
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS decision VARCHAR(50);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS acted_by_id VARCHAR(50);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS acted_by_name VARCHAR(150);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS acted_by_role VARCHAR(50);
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS action_date TIMESTAMPTZ;
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE approval_request_steps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: expense_claims (40 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(150),
  department VARCHAR(100),
  designation VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  claim_type VARCHAR(50) DEFAULT 'TRAVEL',
  travel_start_date DATE,
  travel_end_date DATE,
  travel_destination VARCHAR(200),
  purpose TEXT,
  total_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  approved_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'SUBMITTED',
  current_stage VARCHAR(50) DEFAULT 'MANAGER',
  manager_id VARCHAR(50),
  manager_name VARCHAR(150),
  manager_decision VARCHAR(50) DEFAULT 'PENDING',
  manager_decision_at TIMESTAMPTZ,
  manager_comments TEXT,
  finance_id VARCHAR(50),
  finance_name VARCHAR(150),
  finance_decision VARCHAR(50) DEFAULT 'PENDING',
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
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if expense_claims already exists
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS claim_number VARCHAR(50);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS employee_email VARCHAR(150);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS claim_type VARCHAR(50) DEFAULT 'TRAVEL';
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS travel_start_date DATE;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS travel_end_date DATE;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS travel_destination VARCHAR(200);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR';
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SUBMITTED';
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'MANAGER';
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_decision VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_decision_at TIMESTAMPTZ;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_comments TEXT;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS finance_id VARCHAR(50);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS finance_name VARCHAR(150);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS finance_decision VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS finance_decision_at TIMESTAMPTZ;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS finance_comments TEXT;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS disbursed_by_id VARCHAR(50);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS disbursed_by_name VARCHAR(150);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS payment_notes TEXT;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS hr_override_id VARCHAR(50);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS hr_override_name VARCHAR(150);
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS hr_override_notes TEXT;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS supporting_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: expense_claim_items (16 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS expense_claim_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  merchant_name VARCHAR(150),
  description TEXT,
  bill_number VARCHAR(100),
  amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  approved_amount DECIMAL(10,2),
  tax_amount DECIMAL(10,2) DEFAULT 0,
  receipt_url VARCHAR(500),
  receipt_filename VARCHAR(255),
  status VARCHAR(30) DEFAULT 'PENDING',
  remarks VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if expense_claim_items already exists
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS claim_id UUID;
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS expense_date DATE;
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(150);
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS bill_number VARCHAR(100);
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(10,2);
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500);
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS receipt_filename VARCHAR(255);
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS remarks VARCHAR(255);
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE expense_claim_items ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: employee_transfers (41 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS employee_transfers (
  id SERIAL PRIMARY KEY,
  transfer_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(255),
  transfer_type VARCHAR(60) DEFAULT 'Inter-Departmental' NOT NULL,
  current_department VARCHAR(100),
  target_department VARCHAR(100),
  current_branch VARCHAR(100) DEFAULT 'Kolkata HQ',
  target_branch VARCHAR(100),
  current_designation VARCHAR(100),
  target_designation VARCHAR(100),
  current_reporting_manager VARCHAR(100),
  target_reporting_manager VARCHAR(100),
  current_salary DECIMAL(12,2),
  revised_salary DECIMAL(12,2),
  deputation_allowance DECIMAL(12,2) DEFAULT 0,
  relocation_allowance DECIMAL(12,2) DEFAULT 0,
  effective_date DATE NOT NULL,
  deputation_start_date DATE,
  deputation_end_date DATE,
  reason TEXT,
  status VARCHAR(30) DEFAULT 'Pending' NOT NULL,
  workflow_step VARCHAR(60) DEFAULT 'HR Review',
  initiated_by VARCHAR(100),
  initiated_by_name VARCHAR(150),
  approved_by VARCHAR(100),
  approved_by_name VARCHAR(150),
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  remarks TEXT,
  handover_status VARCHAR(30) DEFAULT 'Pending' NOT NULL,
  handover_notes TEXT,
  letter_ref_no VARCHAR(100),
  letter_issue_date DATE,
  letter_status VARCHAR(30) DEFAULT 'Draft' NOT NULL,
  letter_signatory_name VARCHAR(150) DEFAULT 'Priyanka Mukherjee',
  letter_signatory_title VARCHAR(150) DEFAULT 'CHRO & VP - Human Resources',
  sync_employee_record BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if employee_transfers already exists
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS transfer_code VARCHAR(50);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(60) DEFAULT 'Inter-Departmental';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS current_department VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS target_department VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS current_branch VARCHAR(100) DEFAULT 'Kolkata HQ';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS target_branch VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS current_designation VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS target_designation VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS current_reporting_manager VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS target_reporting_manager VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS current_salary DECIMAL(12,2);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS revised_salary DECIMAL(12,2);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS deputation_allowance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS relocation_allowance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS deputation_start_date DATE;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS deputation_end_date DATE;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS workflow_step VARCHAR(60) DEFAULT 'HR Review';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS initiated_by VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS initiated_by_name VARCHAR(150);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(150);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS handover_status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS handover_notes TEXT;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS letter_ref_no VARCHAR(100);
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS letter_issue_date DATE;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS letter_status VARCHAR(30) DEFAULT 'Draft';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS letter_signatory_name VARCHAR(150) DEFAULT 'Priyanka Mukherjee';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS letter_signatory_title VARCHAR(150) DEFAULT 'CHRO & VP - Human Resources';
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS sync_employee_record BOOLEAN DEFAULT false;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE employee_transfers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: employee_promotions (38 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS employee_promotions (
  id SERIAL PRIMARY KEY,
  promotion_code VARCHAR(50) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(255),
  department VARCHAR(100),
  promotion_type VARCHAR(60) DEFAULT 'Merit Promotion' NOT NULL,
  current_designation VARCHAR(150) NOT NULL,
  target_designation VARCHAR(150) NOT NULL,
  current_grade_code VARCHAR(20) DEFAULT 'L2',
  target_grade_code VARCHAR(20) DEFAULT 'L3',
  current_rank_level INTEGER DEFAULT 2,
  target_rank_level INTEGER DEFAULT 3,
  current_salary DECIMAL(14,2) DEFAULT 0,
  revised_salary DECIMAL(14,2) DEFAULT 0 NOT NULL,
  increment_amount DECIMAL(14,2) DEFAULT 0,
  increment_percentage DECIMAL(6,2) DEFAULT 0,
  payout_basis VARCHAR(30) DEFAULT 'monthly',
  performance_rating VARCHAR(100),
  effective_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'Pending' NOT NULL,
  workflow_step VARCHAR(60) DEFAULT 'HR Review',
  initiated_by VARCHAR(100),
  initiated_by_name VARCHAR(150),
  approved_by VARCHAR(100),
  approved_by_name VARCHAR(150),
  approval_date TIMESTAMPTZ,
  justification TEXT,
  remarks TEXT,
  rejection_reason TEXT,
  letter_ref_no VARCHAR(100),
  letter_issue_date DATE,
  letter_status VARCHAR(30) DEFAULT 'Draft' NOT NULL,
  letter_signatory_name VARCHAR(150) DEFAULT 'Priyanka Mukherjee',
  letter_signatory_title VARCHAR(150) DEFAULT 'CHRO & VP - Human Resources',
  sync_employee_record BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if employee_promotions already exists
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS promotion_code VARCHAR(50);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS promotion_type VARCHAR(60) DEFAULT 'Merit Promotion';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS current_designation VARCHAR(150);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS target_designation VARCHAR(150);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS current_grade_code VARCHAR(20) DEFAULT 'L2';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS target_grade_code VARCHAR(20) DEFAULT 'L3';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS current_rank_level INTEGER DEFAULT 2;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS target_rank_level INTEGER DEFAULT 3;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS current_salary DECIMAL(14,2) DEFAULT 0;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS revised_salary DECIMAL(14,2) DEFAULT 0;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS increment_amount DECIMAL(14,2) DEFAULT 0;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS increment_percentage DECIMAL(6,2) DEFAULT 0;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS payout_basis VARCHAR(30) DEFAULT 'monthly';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS performance_rating VARCHAR(100);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS workflow_step VARCHAR(60) DEFAULT 'HR Review';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS initiated_by VARCHAR(100);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS initiated_by_name VARCHAR(150);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(150);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS letter_ref_no VARCHAR(100);
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS letter_issue_date DATE;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS letter_status VARCHAR(30) DEFAULT 'Draft';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS letter_signatory_name VARCHAR(150) DEFAULT 'Priyanka Mukherjee';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS letter_signatory_title VARCHAR(150) DEFAULT 'CHRO & VP - Human Resources';
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS sync_employee_record BOOLEAN DEFAULT false;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE employee_promotions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: resignations (104 columns)
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
  tl_id VARCHAR(50),
  tl_name VARCHAR(100),
  tl_decision VARCHAR(50),
  tl_comments TEXT,
  tl_action_date TIMESTAMPTZ,
  tl_recommended_lwd DATE,
  manager_id VARCHAR(50),
  manager_name VARCHAR(100),
  manager_decision VARCHAR(50),
  manager_comments TEXT,
  manager_action_date TIMESTAMPTZ,
  manager_recommended_lwd DATE,
  hod_id VARCHAR(50),
  hod_name VARCHAR(100),
  hod_decision VARCHAR(50),
  hod_comments TEXT,
  hod_action_date TIMESTAMPTZ,
  hod_recommended_lwd DATE,
  hr_id VARCHAR(50),
  hr_name VARCHAR(100),
  hr_decision VARCHAR(50),
  hr_comments TEXT,
  hr_action_date TIMESTAMPTZ,
  hr_confirmed_lwd DATE,
  admin_id VARCHAR(50),
  admin_name VARCHAR(100),
  admin_decision VARCHAR(50),
  admin_comments TEXT,
  admin_action_date TIMESTAMPTZ,
  approval_stage VARCHAR(50) DEFAULT 'PENDING_TL_OR_MANAGER' NOT NULL,
  withdrawn_at TIMESTAMPTZ,
  withdrawn_by VARCHAR(100),
  withdrawal_reason TEXT,
  clearance_raised BOOLEAN DEFAULT false NOT NULL,
  clearance_raised_by VARCHAR(100),
  clearance_raised_date TIMESTAMPTZ,
  clearance_steps JSONB DEFAULT '[]'::jsonb,
  clearance_overall_status VARCHAR(50) DEFAULT 'Not Raised' NOT NULL,
  exit_interview_raised BOOLEAN DEFAULT false NOT NULL,
  exit_interview_raised_by VARCHAR(100),
  exit_interview_raised_date TIMESTAMPTZ,
  exit_interview_status VARCHAR(50) DEFAULT 'Not Scheduled' NOT NULL,
  exit_interview_date VARCHAR(100),
  exit_interview_time VARCHAR(50),
  exit_interview_interviewer VARCHAR(100),
  exit_interview_mode VARCHAR(50),
  exit_interview_location VARCHAR(255),
  exit_interview_notes TEXT,
  exit_interview_questions JSONB DEFAULT '[]'::jsonb,
  exit_interview_feedback TEXT,
  notifications JSONB DEFAULT '[]'::jsonb,
  clearance_it_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  clearance_finance_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  clearance_admin_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  clearance_hr_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  handover_status VARCHAR(50) DEFAULT 'NOT_ASSIGNED',
  handover_assigned_by_id VARCHAR(50),
  handover_assigned_by_name VARCHAR(100),
  handover_assigned_date TIMESTAMPTZ,
  handover_employee_remarks TEXT,
  handover_employee_completed_at TIMESTAMPTZ,
  handover_assignee_remarks TEXT,
  handover_assignee_confirmed_at TIMESTAMPTZ,
  handover_docs_checklist JSONB DEFAULT '[]'::jsonb,
  kt_tasks JSONB DEFAULT '[]'::jsonb,
  kt_status VARCHAR(50) DEFAULT 'NOT_STARTED' NOT NULL,
  kt_recipient_feedback TEXT,
  kt_recipient_rating INTEGER,
  kt_recipient_signed_at TIMESTAMPTZ,
  kt_recipient_signed_by_id VARCHAR(50),
  kt_recipient_signed_by_name VARCHAR(100),
  kt_manager_verification_notes TEXT,
  kt_manager_verified_at TIMESTAMPTZ,
  kt_manager_verified_by_id VARCHAR(50),
  kt_manager_verified_by_name VARCHAR(100),
  kt_certificate_number VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if resignations already exists
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
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS tl_recommended_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS manager_recommended_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hod_recommended_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS hr_confirmed_lwd DATE;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_decision VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_comments TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS admin_action_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS approval_stage VARCHAR(50) DEFAULT 'PENDING_TL_OR_MANAGER';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS withdrawn_by VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_raised BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_raised_by VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_raised_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_overall_status VARCHAR(50) DEFAULT 'Not Raised';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_raised BOOLEAN DEFAULT false;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_raised_by VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_raised_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_status VARCHAR(50) DEFAULT 'Not Scheduled';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_date VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_time VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_interviewer VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_mode VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_location VARCHAR(255);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_notes TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS exit_interview_feedback TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_it_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_finance_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_admin_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS clearance_hr_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_status VARCHAR(50) DEFAULT 'NOT_ASSIGNED';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assigned_by_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assigned_by_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assigned_date TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_employee_remarks TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_employee_completed_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assignee_remarks TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_assignee_confirmed_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS handover_docs_checklist JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_status VARCHAR(50) DEFAULT 'NOT_STARTED';
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_recipient_feedback TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_recipient_rating INTEGER;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_recipient_signed_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_recipient_signed_by_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_recipient_signed_by_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_manager_verification_notes TEXT;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_manager_verified_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_manager_verified_by_id VARCHAR(50);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_manager_verified_by_name VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS kt_certificate_number VARCHAR(100);
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE resignations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: fnf_settlements (64 columns)
-- ==========================================================================
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
  status VARCHAR(50) DEFAULT 'Draft' NOT NULL,
  monthly_gross DECIMAL(12,2) DEFAULT 0 NOT NULL,
  monthly_basic DECIMAL(12,2) DEFAULT 0 NOT NULL,
  per_day_rate DECIMAL(12,2) DEFAULT 0 NOT NULL,
  notice_period_days INTEGER DEFAULT 30 NOT NULL,
  notice_served_days INTEGER DEFAULT 30 NOT NULL,
  notice_shortfall_days INTEGER DEFAULT 0 NOT NULL,
  notice_waiver_granted BOOLEAN DEFAULT false NOT NULL,
  notice_recovery_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  unpaid_salary_days DECIMAL(6,2) DEFAULT 0 NOT NULL,
  unpaid_salary_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  leave_encashment_days DECIMAL(6,2) DEFAULT 0 NOT NULL,
  leave_encashment_rate DECIMAL(12,2) DEFAULT 0 NOT NULL,
  leave_encashment_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  gratuity_eligible BOOLEAN DEFAULT false NOT NULL,
  tenure_years DECIMAL(6,2) DEFAULT 0 NOT NULL,
  gratuity_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  bonus_incentive_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  reimbursement_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  other_earnings DECIMAL(12,2) DEFAULT 0 NOT NULL,
  other_earnings_remarks VARCHAR(255),
  total_earnings DECIMAL(12,2) DEFAULT 0 NOT NULL,
  loan_outstanding_recovery DECIMAL(12,2) DEFAULT 0 NOT NULL,
  advance_salary_recovery DECIMAL(12,2) DEFAULT 0 NOT NULL,
  asset_damage_recovery DECIMAL(12,2) DEFAULT 0 NOT NULL,
  statutory_pf DECIMAL(12,2) DEFAULT 0 NOT NULL,
  statutory_esi DECIMAL(12,2) DEFAULT 0 NOT NULL,
  mediclaim_deduction DECIMAL(12,2) DEFAULT 0 NOT NULL,
  statutory_pt DECIMAL(12,2) DEFAULT 0 NOT NULL,
  tax_tds_deduction DECIMAL(12,2) DEFAULT 0 NOT NULL,
  other_deductions DECIMAL(12,2) DEFAULT 0 NOT NULL,
  other_deductions_remarks VARCHAR(255),
  total_deductions DECIMAL(12,2) DEFAULT 0 NOT NULL,
  net_payable_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  settlement_type VARCHAR(50) DEFAULT 'PAYABLE_TO_EMPLOYEE' NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  payment_date DATE,
  payment_mode VARCHAR(50) DEFAULT 'Bank Transfer',
  payment_reference VARCHAR(100),
  bank_name VARCHAR(100),
  bank_account_no VARCHAR(50),
  ifsc_code VARCHAR(30),
  remarks TEXT,
  prepared_by VARCHAR(100),
  approved_by VARCHAR(100),
  relieving_letter_issued BOOLEAN DEFAULT false NOT NULL,
  relieving_letter_ref_no VARCHAR(100),
  relieving_letter_date DATE,
  experience_letter_issued BOOLEAN DEFAULT false NOT NULL,
  experience_letter_ref_no VARCHAR(100),
  experience_letter_date DATE,
  conduct_remarks VARCHAR(100) DEFAULT 'Exemplary',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if fnf_settlements already exists
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS resignation_id INTEGER;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS employee_name VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS dept VARCHAR(100) DEFAULT 'General';
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS resignation_date DATE;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS last_working_date DATE;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS settlement_date DATE;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft';
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS monthly_gross DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS monthly_basic DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS per_day_rate DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS notice_served_days INTEGER DEFAULT 30;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS notice_shortfall_days INTEGER DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS notice_waiver_granted BOOLEAN DEFAULT false;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS notice_recovery_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS unpaid_salary_days DECIMAL(6,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS unpaid_salary_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS leave_encashment_days DECIMAL(6,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS leave_encashment_rate DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS leave_encashment_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS gratuity_eligible BOOLEAN DEFAULT false;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS tenure_years DECIMAL(6,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS gratuity_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS bonus_incentive_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS reimbursement_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS other_earnings DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS other_earnings_remarks VARCHAR(255);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS loan_outstanding_recovery DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS advance_salary_recovery DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS asset_damage_recovery DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS statutory_pf DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS statutory_esi DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS mediclaim_deduction DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS statutory_pt DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS tax_tds_deduction DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS other_deductions DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS other_deductions_remarks VARCHAR(255);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS net_payable_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(50) DEFAULT 'PAYABLE_TO_EMPLOYEE';
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'Bank Transfer';
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(30);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS relieving_letter_issued BOOLEAN DEFAULT false;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS relieving_letter_ref_no VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS relieving_letter_date DATE;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS experience_letter_issued BOOLEAN DEFAULT false;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS experience_letter_ref_no VARCHAR(100);
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS experience_letter_date DATE;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS conduct_remarks VARCHAR(100) DEFAULT 'Exemplary';
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE fnf_settlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: recruitment_requisitions (40 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS recruitment_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_code VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(150) NOT NULL,
  vacancies_count INTEGER DEFAULT 1 NOT NULL,
  experience_required VARCHAR(100) NOT NULL,
  job_description TEXT NOT NULL,
  max_salary DECIMAL(14,2) NOT NULL,
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
  approval_document_url VARCHAR(500),
  approval_document_filename VARCHAR(255),
  reason_for_hiring VARCHAR(100),
  replacement_for_employee VARCHAR(100),
  hod_id VARCHAR(50) NOT NULL,
  hod_name VARCHAR(100) DEFAULT 'Department Head',
  hod_email VARCHAR(255),
  hr_assigned_id VARCHAR(50),
  hr_assigned_name VARCHAR(100),
  hr_notes TEXT,
  finalization_status VARCHAR(50) DEFAULT 'PENDING_CHRO' NOT NULL,
  finalized_by_id VARCHAR(50),
  finalized_by_name VARCHAR(100),
  finalized_by_role VARCHAR(50),
  finalized_at TIMESTAMPTZ,
  chro_comments TEXT,
  delegated_finalizer_id VARCHAR(50),
  delegated_finalizer_name VARCHAR(100),
  delegated_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'SOURCING_CANDIDATES' NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if recruitment_requisitions already exists
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS requisition_code VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS position VARCHAR(150);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS vacancies_count INTEGER DEFAULT 1;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS experience_required VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS max_salary DECIMAL(14,2);
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
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS approval_document_url VARCHAR(500);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS approval_document_filename VARCHAR(255);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS reason_for_hiring VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS replacement_for_employee VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100) DEFAULT 'Department Head';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hod_email VARCHAR(255);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hr_assigned_id VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hr_assigned_name VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS hr_notes TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS finalization_status VARCHAR(50) DEFAULT 'PENDING_CHRO';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS finalized_by_id VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS finalized_by_name VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS finalized_by_role VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS chro_comments TEXT;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS delegated_finalizer_id VARCHAR(50);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS delegated_finalizer_name VARCHAR(100);
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMPTZ;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SOURCING_CANDIDATES';
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE recruitment_requisitions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: recruitment_candidates (33 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL,
  candidate_name VARCHAR(150) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  current_company VARCHAR(150),
  current_designation VARCHAR(150),
  experience_years VARCHAR(50) NOT NULL,
  current_ctc DECIMAL(14,2),
  expected_ctc DECIMAL(14,2),
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
  interview_evaluations JSONB DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if recruitment_candidates already exists
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS requisition_id UUID;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS candidate_name VARCHAR(150);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS current_company VARCHAR(150);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS current_designation VARCHAR(150);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS experience_years VARCHAR(50);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS current_ctc DECIMAL(14,2);
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS expected_ctc DECIMAL(14,2);
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
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS interview_evaluations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE recruitment_candidates ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: recruitment_offers (59 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS recruitment_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code VARCHAR(50) NOT NULL,
  candidate_id UUID NOT NULL,
  requisition_id UUID NOT NULL,
  candidate_name VARCHAR(150) NOT NULL,
  candidate_email VARCHAR(255) NOT NULL,
  candidate_phone VARCHAR(50),
  candidate_address TEXT,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(150) NOT NULL,
  reporting_manager VARCHAR(150),
  work_location VARCHAR(100) DEFAULT 'Kolkata HQ' NOT NULL,
  employment_type VARCHAR(50) DEFAULT 'Full Time (Probation)' NOT NULL,
  probation_period_months INTEGER DEFAULT 6 NOT NULL,
  notice_period_days INTEGER DEFAULT 30 NOT NULL,
  joining_date DATE NOT NULL,
  offer_expiry_date DATE NOT NULL,
  annual_ctc DECIMAL(14,2) NOT NULL,
  monthly_gross DECIMAL(14,2) NOT NULL,
  monthly_basic DECIMAL(14,2) NOT NULL,
  monthly_hra DECIMAL(14,2) NOT NULL,
  monthly_special_allowance DECIMAL(14,2) DEFAULT 0 NOT NULL,
  monthly_conveyance DECIMAL(14,2) DEFAULT 0 NOT NULL,
  monthly_medical DECIMAL(14,2) DEFAULT 0 NOT NULL,
  annual_performance_bonus DECIMAL(14,2) DEFAULT 0 NOT NULL,
  employer_pf_annual DECIMAL(14,2) DEFAULT 0 NOT NULL,
  other_benefits_notes TEXT,
  salary_breakdown_json JSONB DEFAULT '{}'::jsonb,
  terms_conditions TEXT,
  approval_status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
  current_approval_stage VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
  hod_id VARCHAR(50),
  hod_name VARCHAR(100),
  hod_decision VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  hod_decision_at TIMESTAMPTZ,
  hod_comments TEXT,
  management_id VARCHAR(50),
  management_name VARCHAR(100),
  management_decision VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  management_decision_at TIMESTAMPTZ,
  management_comments TEXT,
  offer_status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
  sent_to_candidate_at TIMESTAMPTZ,
  sent_by_id VARCHAR(50),
  sent_by_name VARCHAR(100),
  acceptance_token VARCHAR(100),
  candidate_decision VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
  candidate_decided_at TIMESTAMPTZ,
  candidate_signature_name VARCHAR(150),
  candidate_confirmed_joining_date DATE,
  candidate_comments TEXT,
  candidate_ip_address VARCHAR(100),
  candidate_user_agent VARCHAR(255),
  official_signatory_name VARCHAR(100) DEFAULT 'Ms. Priyanka Mukherjee' NOT NULL,
  official_signatory_title VARCHAR(100) DEFAULT 'Head - Human Resources' NOT NULL,
  created_by_id VARCHAR(50),
  created_by_name VARCHAR(100),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if recruitment_offers already exists
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS offer_code VARCHAR(50);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_id UUID;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS requisition_id UUID;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_name VARCHAR(150);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_email VARCHAR(255);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_phone VARCHAR(50);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_address TEXT;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS designation VARCHAR(150);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS reporting_manager VARCHAR(150);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS work_location VARCHAR(100) DEFAULT 'Kolkata HQ';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'Full Time (Probation)';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS probation_period_months INTEGER DEFAULT 6;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS offer_expiry_date DATE;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS annual_ctc DECIMAL(14,2);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS monthly_gross DECIMAL(14,2);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS monthly_basic DECIMAL(14,2);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS monthly_hra DECIMAL(14,2);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS monthly_special_allowance DECIMAL(14,2) DEFAULT 0;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS monthly_conveyance DECIMAL(14,2) DEFAULT 0;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS monthly_medical DECIMAL(14,2) DEFAULT 0;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS annual_performance_bonus DECIMAL(14,2) DEFAULT 0;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS employer_pf_annual DECIMAL(14,2) DEFAULT 0;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS other_benefits_notes TEXT;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS salary_breakdown_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'DRAFT';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS current_approval_stage VARCHAR(50) DEFAULT 'DRAFT';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS hod_decision VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS hod_decision_at TIMESTAMPTZ;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS hod_comments TEXT;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS management_id VARCHAR(50);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS management_name VARCHAR(100);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS management_decision VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS management_decision_at TIMESTAMPTZ;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS management_comments TEXT;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS offer_status VARCHAR(50) DEFAULT 'DRAFT';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS sent_to_candidate_at TIMESTAMPTZ;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS sent_by_id VARCHAR(50);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS sent_by_name VARCHAR(100);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS acceptance_token VARCHAR(100);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_decision VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_decided_at TIMESTAMPTZ;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_signature_name VARCHAR(150);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_confirmed_joining_date DATE;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_comments TEXT;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_ip_address VARCHAR(100);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS candidate_user_agent VARCHAR(255);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS official_signatory_name VARCHAR(100) DEFAULT 'Ms. Priyanka Mukherjee';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS official_signatory_title VARCHAR(100) DEFAULT 'Head - Human Resources';
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(50);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(100);
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE recruitment_offers ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: onboardings (71 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  documents JSONB DEFAULT '[{"key": "aadhaar", "label": "Aadhaar Card", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "pan", "label": "PAN Card", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "education", "label": "Educational Degree / Certificates", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "experience", "label": "Relieving / Prior Experience Letters", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "offer_letter", "label": "Signed Offer & Appointment Letter", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "nda", "label": "Signed NDA & Policies Agreement", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "bank", "label": "Bank Details / Cancelled Cheque", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "photo", "label": "Passport Sized Photograph", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}]'::jsonb NOT NULL,
  hr_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["Company History, Culture & Core Values", "HR Policies, Attendance & Regularization Rules", "Leave System, Holiday Calendar & Shift Regulations", "POSH, Anti-Harassment & Workplace Code of Conduct", "Payroll Cycle, Payslips & Mediclaim Benefits"]}'::jsonb NOT NULL,
  admin_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["Office Administration & Facility Guidelines", "Physical Security, Access Badges & Visitor Entry", "Fire Safety, Disaster Management & Emergency Exits", "Asset Care, Stationery & Helpdesk Protocol", "Workstation Ergonomics & Clean Desk Policy"]}'::jsonb NOT NULL,
  pos_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["POS System Architecture & Login Credentials", "Billing, Invoicing & Cash Register Operations", "Discount Schemes, Return Policies & Customer Service", "Inventory Lookup, Stock Sync & Discrepancies", "Day-End Closing & Transaction Audit Reports"]}'::jsonb NOT NULL,
  dept_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "mentor_name": "", "department_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["Department Technology Stack, Tools & Architecture", "Standard Operating Procedures (SOP) & Workflows", "Live Project Architecture, Repositories & Access Setup", "Team Intro, Roles, Key Result Areas (KRAs) & KPIs", "First Deliverable Setup & Mentorship Review"]}'::jsonb NOT NULL,
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
  hod_performance_rating DECIMAL(3,1),
  hod_kpi_rating DECIMAL(3,1),
  hod_discipline_rating DECIMAL(3,1),
  hod_culture_fit_rating DECIMAL(3,1),
  hod_analysis_remarks TEXT,
  hod_decision VARCHAR(50),
  hod_decision_reason TEXT,
  hod_decision_date TIMESTAMPTZ,
  hod_decision_by_id VARCHAR(50),
  hod_decision_by_name VARCHAR(100),
  hod_extension_months INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if onboardings already exists
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
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[{"key": "aadhaar", "label": "Aadhaar Card", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "pan", "label": "PAN Card", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "education", "label": "Educational Degree / Certificates", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "experience", "label": "Relieving / Prior Experience Letters", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "offer_letter", "label": "Signed Offer & Appointment Letter", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "nda", "label": "Signed NDA & Policies Agreement", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "bank", "label": "Bank Details / Cancelled Cheque", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}, {"key": "photo", "label": "Passport Sized Photograph", "number": "", "doc_url": "", "status": "PENDING", "remarks": ""}]'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hr_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["Company History, Culture & Core Values", "HR Policies, Attendance & Regularization Rules", "Leave System, Holiday Calendar & Shift Regulations", "POSH, Anti-Harassment & Workplace Code of Conduct", "Payroll Cycle, Payslips & Mediclaim Benefits"]}'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS admin_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["Office Administration & Facility Guidelines", "Physical Security, Access Badges & Visitor Entry", "Fire Safety, Disaster Management & Emergency Exits", "Asset Care, Stationery & Helpdesk Protocol", "Workstation Ergonomics & Clean Desk Policy"]}'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS pos_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["POS System Architecture & Login Credentials", "Billing, Invoicing & Cash Register Operations", "Discount Schemes, Return Policies & Customer Service", "Inventory Lookup, Stock Sync & Discrepancies", "Day-End Closing & Transaction Audit Reports"]}'::jsonb;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS dept_training JSONB DEFAULT '{"status": "NOT_STARTED", "trainer_name": "", "mentor_name": "", "department_name": "", "scheduled_date": null, "completed_date": null, "score": null, "feedback": "", "modules": ["Department Technology Stack, Tools & Architecture", "Standard Operating Procedures (SOP) & Workflows", "Live Project Architecture, Repositories & Access Setup", "Team Intro, Roles, Key Result Areas (KRAs) & KPIs", "First Deliverable Setup & Mentorship Review"]}'::jsonb;
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
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_performance_rating DECIMAL(3,1);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_kpi_rating DECIMAL(3,1);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_discipline_rating DECIMAL(3,1);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_culture_fit_rating DECIMAL(3,1);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_analysis_remarks TEXT;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_reason TEXT;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_date TIMESTAMPTZ;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_by_id VARCHAR(50);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_decision_by_name VARCHAR(100);
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS hod_extension_months INTEGER;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE onboardings ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: candidate_pre_joinings (33 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS candidate_pre_joinings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(128) NOT NULL,
  candidate_id UUID,
  onboarding_id UUID,
  offer_id INTEGER,
  candidate_name VARCHAR(255) NOT NULL,
  candidate_email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  designation VARCHAR(255),
  department VARCHAR(255),
  joining_date DATE,
  work_location VARCHAR(255) DEFAULT 'Headquarters',
  expires_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING_UPLOAD' NOT NULL,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by_name VARCHAR(255),
  verification_remarks TEXT,
  personal_details JSONB DEFAULT '{}'::jsonb,
  bank_details JSONB DEFAULT '{}'::jsonb,
  kyc_documents JSONB DEFAULT '{}'::jsonb,
  prior_employment JSONB DEFAULT '{}'::jsonb,
  educational_documents JSONB DEFAULT '{}'::jsonb,
  digital_signature_name VARCHAR(255),
  declaration_agreed BOOLEAN DEFAULT false NOT NULL,
  submission_ip VARCHAR(100),
  submission_user_agent TEXT,
  synced_to_onboarding BOOLEAN DEFAULT false NOT NULL,
  synced_at TIMESTAMPTZ,
  created_by_name VARCHAR(255),
  created_by_id VARCHAR(100),
  "createdAt" TIMESTAMPTZ NOT NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if candidate_pre_joinings already exists
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS token VARCHAR(128);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS candidate_id UUID;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS onboarding_id UUID;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS offer_id INTEGER;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS candidate_name VARCHAR(255);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS candidate_email VARCHAR(255);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS work_location VARCHAR(255) DEFAULT 'Headquarters';
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING_UPLOAD';
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS verified_by_name VARCHAR(255);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS verification_remarks TEXT;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS personal_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}'::jsonb;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS prior_employment JSONB DEFAULT '{}'::jsonb;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS educational_documents JSONB DEFAULT '{}'::jsonb;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS digital_signature_name VARCHAR(255);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS declaration_agreed BOOLEAN DEFAULT false;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS submission_ip VARCHAR(100);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS submission_user_agent TEXT;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS synced_to_onboarding BOOLEAN DEFAULT false;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(100);
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ;
ALTER TABLE candidate_pre_joinings ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: kpi_templates (11 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS kpi_templates (
  id SERIAL PRIMARY KEY,
  department VARCHAR(100) NOT NULL,
  designation VARCHAR(100) DEFAULT 'All' NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_metric DECIMAL(10,2) DEFAULT 100 NOT NULL,
  unit VARCHAR(50) DEFAULT '%' NOT NULL,
  default_weight DECIMAL(5,2) DEFAULT 25 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if kpi_templates already exists
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS designation VARCHAR(100) DEFAULT 'All';
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS target_metric DECIMAL(10,2) DEFAULT 100;
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT '%';
ALTER TABLE kpi_templates ADD COLUMN IF NOT EXISTS default_weight DECIMAL(5,2) DEFAULT 25;
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
  total_weightage DECIMAL(5,2) DEFAULT 100 NOT NULL,
  self_overall_score DECIMAL(3,2),
  manager_overall_score DECIMAL(3,2),
  final_calibrated_score DECIMAL(3,2),
  manager_recommendation VARCHAR(100),
  manager_remarks TEXT,
  hr_remarks TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if kpi_assignments already exists
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS cycle_name VARCHAR(100) DEFAULT 'Q1 2026';
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Assigned';
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS total_weightage DECIMAL(5,2) DEFAULT 100;
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS self_overall_score DECIMAL(3,2);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS manager_overall_score DECIMAL(3,2);
ALTER TABLE kpi_assignments ADD COLUMN IF NOT EXISTS final_calibrated_score DECIMAL(3,2);
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
  target DECIMAL(10,2) DEFAULT 100 NOT NULL,
  unit VARCHAR(50) DEFAULT '%' NOT NULL,
  weightage DECIMAL(5,2) DEFAULT 25 NOT NULL,
  actual_achieved DECIMAL(10,2) DEFAULT 0,
  self_rating DECIMAL(3,2),
  self_comment TEXT,
  manager_rating DECIMAL(3,2),
  manager_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if kpi_goal_items already exists
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS assignment_id INTEGER;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS target DECIMAL(10,2) DEFAULT 100;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT '%';
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS weightage DECIMAL(5,2) DEFAULT 25;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS actual_achieved DECIMAL(10,2) DEFAULT 0;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS self_rating DECIMAL(3,2);
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS self_comment TEXT;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS manager_rating DECIMAL(3,2);
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS manager_comment TEXT;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE kpi_goal_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: performance_reviews (38 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS performance_reviews (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  review_type VARCHAR(50) DEFAULT 'probation' NOT NULL,
  cycle_name VARCHAR(100) DEFAULT '6-Month Probation Review' NOT NULL,
  department VARCHAR(100),
  designation VARCHAR(100),
  probation_start_date DATE,
  probation_end_date DATE,
  tl_id VARCHAR(50),
  tl_name VARCHAR(100),
  manager_id VARCHAR(50),
  manager_name VARCHAR(100),
  hod_id VARCHAR(50),
  hod_name VARCHAR(100),
  current_stage VARCHAR(50) DEFAULT 'self' NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending_Self' NOT NULL,
  self_overall_score DECIMAL(5,2),
  tl_overall_score DECIMAL(5,2),
  manager_overall_score DECIMAL(5,2),
  hod_overall_score DECIMAL(5,2),
  final_score DECIMAL(5,2),
  self_remarks TEXT,
  tl_recommendation VARCHAR(100),
  tl_remarks TEXT,
  manager_recommendation VARCHAR(100),
  manager_remarks TEXT,
  hod_decision VARCHAR(100),
  hod_remarks TEXT,
  hr_decision VARCHAR(100),
  hr_remarks TEXT,
  initiated_at TIMESTAMPTZ DEFAULT '{}'::jsonb,
  self_submitted_at TIMESTAMPTZ,
  tl_reviewed_at TIMESTAMPTZ,
  manager_reviewed_at TIMESTAMPTZ,
  hod_approved_at TIMESTAMPTZ,
  hr_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if performance_reviews already exists
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(50) DEFAULT 'probation';
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS cycle_name VARCHAR(100) DEFAULT '6-Month Probation Review';
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS probation_start_date DATE;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS probation_end_date DATE;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS tl_id VARCHAR(50);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS tl_name VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hod_id VARCHAR(50);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hod_name VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'self';
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending_Self';
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS self_overall_score DECIMAL(5,2);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS tl_overall_score DECIMAL(5,2);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_overall_score DECIMAL(5,2);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hod_overall_score DECIMAL(5,2);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS final_score DECIMAL(5,2);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS self_remarks TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS tl_recommendation VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS tl_remarks TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_recommendation VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_remarks TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hod_decision VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hod_remarks TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hr_decision VARCHAR(100);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hr_remarks TEXT;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ DEFAULT '{}'::jsonb;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS self_submitted_at TIMESTAMPTZ;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS tl_reviewed_at TIMESTAMPTZ;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS manager_reviewed_at TIMESTAMPTZ;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hod_approved_at TIMESTAMPTZ;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS hr_completed_at TIMESTAMPTZ;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: review_question_items (17 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS review_question_items (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL,
  question_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  weightage DECIMAL(5,2) DEFAULT 20 NOT NULL,
  self_rating DECIMAL(5,2),
  self_comment TEXT,
  tl_rating DECIMAL(5,2),
  tl_comment TEXT,
  manager_rating DECIMAL(5,2),
  manager_comment TEXT,
  hod_rating DECIMAL(5,2),
  hod_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if review_question_items already exists
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS review_id INTEGER;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS question_key VARCHAR(100);
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS weightage DECIMAL(5,2) DEFAULT 20;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS self_rating DECIMAL(5,2);
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS self_comment TEXT;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS tl_rating DECIMAL(5,2);
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS tl_comment TEXT;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS manager_rating DECIMAL(5,2);
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS manager_comment TEXT;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS hod_rating DECIMAL(5,2);
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS hod_comment TEXT;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE review_question_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: feedback_cycles_360 (15 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS feedback_cycles_360 (
  id SERIAL PRIMARY KEY,
  cycle_code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE DEFAULT '{}'::jsonb NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Active' NOT NULL,
  allow_anonymous_peer BOOLEAN DEFAULT true NOT NULL,
  allow_anonymous_subordinate BOOLEAN DEFAULT true NOT NULL,
  allow_anonymous_stakeholder BOOLEAN DEFAULT false NOT NULL,
  min_raters_required INTEGER DEFAULT 3 NOT NULL,
  competencies_config TEXT,
  created_by VARCHAR(100) DEFAULT 'HR Operations',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if feedback_cycles_360 already exists
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS cycle_code VARCHAR(100);
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT '{}'::jsonb;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS allow_anonymous_peer BOOLEAN DEFAULT true;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS allow_anonymous_subordinate BOOLEAN DEFAULT true;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS allow_anonymous_stakeholder BOOLEAN DEFAULT false;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS min_raters_required INTEGER DEFAULT 3;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS competencies_config TEXT;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'HR Operations';
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE feedback_cycles_360 ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: feedback_assignments_360 (21 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS feedback_assignments_360 (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL,
  evaluatee_id VARCHAR(50) NOT NULL,
  evaluatee_name VARCHAR(120),
  evaluatee_dept VARCHAR(100),
  evaluatee_designation VARCHAR(120),
  rater_id VARCHAR(50) NOT NULL,
  rater_name VARCHAR(120),
  rater_dept VARCHAR(100),
  rater_designation VARCHAR(120),
  rater_relationship VARCHAR(50) DEFAULT 'Peer' NOT NULL,
  is_anonymous BOOLEAN DEFAULT false NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  overall_score DECIMAL(4,2),
  competency_scores TEXT,
  strengths_feedback TEXT,
  growth_areas_feedback TEXT,
  general_comments TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if feedback_assignments_360 already exists
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS cycle_id INTEGER;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS evaluatee_id VARCHAR(50);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS evaluatee_name VARCHAR(120);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS evaluatee_dept VARCHAR(100);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS evaluatee_designation VARCHAR(120);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS rater_id VARCHAR(50);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS rater_name VARCHAR(120);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS rater_dept VARCHAR(100);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS rater_designation VARCHAR(120);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS rater_relationship VARCHAR(50) DEFAULT 'Peer';
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS overall_score DECIMAL(4,2);
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS competency_scores TEXT;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS strengths_feedback TEXT;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS growth_areas_feedback TEXT;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS general_comments TEXT;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE feedback_assignments_360 ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: feedback_summaries_360 (21 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS feedback_summaries_360 (
  id SERIAL PRIMARY KEY,
  cycle_id INTEGER NOT NULL,
  evaluatee_id VARCHAR(50) NOT NULL,
  evaluatee_name VARCHAR(120),
  evaluatee_dept VARCHAR(100),
  evaluatee_designation VARCHAR(120),
  total_raters_assigned INTEGER DEFAULT 0 NOT NULL,
  total_raters_submitted INTEGER DEFAULT 0 NOT NULL,
  self_avg_score DECIMAL(4,2),
  manager_avg_score DECIMAL(4,2),
  peer_avg_score DECIMAL(4,2),
  subordinate_avg_score DECIMAL(4,2),
  stakeholder_avg_score DECIMAL(4,2),
  composite_score DECIMAL(4,2),
  competency_radar_data TEXT,
  qualitative_summary TEXT,
  status VARCHAR(50) DEFAULT 'In_Progress' NOT NULL,
  published_at TIMESTAMPTZ,
  hr_summary_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if feedback_summaries_360 already exists
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS cycle_id INTEGER;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS evaluatee_id VARCHAR(50);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS evaluatee_name VARCHAR(120);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS evaluatee_dept VARCHAR(100);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS evaluatee_designation VARCHAR(120);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS total_raters_assigned INTEGER DEFAULT 0;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS total_raters_submitted INTEGER DEFAULT 0;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS self_avg_score DECIMAL(4,2);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS manager_avg_score DECIMAL(4,2);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS peer_avg_score DECIMAL(4,2);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS subordinate_avg_score DECIMAL(4,2);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS stakeholder_avg_score DECIMAL(4,2);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS composite_score DECIMAL(4,2);
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS competency_radar_data TEXT;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS qualitative_summary TEXT;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'In_Progress';
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS hr_summary_notes TEXT;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE feedback_summaries_360 ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: training_programs (43 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  objectives TEXT,
  type VARCHAR(50) DEFAULT 'HR' NOT NULL,
  category VARCHAR(100) DEFAULT 'Technical' NOT NULL,
  delivery_mode VARCHAR(50) DEFAULT 'Offline' NOT NULL,
  department VARCHAR(100),
  target_audience_type VARCHAR(50) DEFAULT 'ALL' NOT NULL,
  target_employee_ids JSONB DEFAULT '[]'::jsonb,
  is_mandatory BOOLEAN DEFAULT false,
  is_onboarding_mandatory BOOLEAN DEFAULT false,
  duration_hours DOUBLE PRECISION DEFAULT 2,
  completion_criteria TEXT,
  trainer_type VARCHAR(50) DEFAULT 'INTERNAL',
  trainer_employee_id VARCHAR(50),
  trainer_name VARCHAR(150),
  trainer_email VARCHAR(255),
  trainer_bio TEXT,
  venue TEXT,
  meeting_link TEXT,
  session_instructions TEXT,
  learning_materials JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'Published' NOT NULL,
  proposal_status VARCHAR(50) DEFAULT 'Approved' NOT NULL,
  rejection_reason TEXT,
  created_by_id VARCHAR(50),
  created_by_name VARCHAR(150),
  created_by_role VARCHAR(50),
  approved_by_id VARCHAR(50),
  approved_by_name VARCHAR(150),
  approved_at TIMESTAMPTZ,
  start_date DATE,
  end_date DATE,
  due_date DATE,
  capacity INTEGER DEFAULT 50,
  assessment_required BOOLEAN DEFAULT false,
  feedback_required BOOLEAN DEFAULT true,
  certificate_provided BOOLEAN DEFAULT true,
  company_logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if training_programs already exists
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS objectives TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'HR';
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Technical';
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(50) DEFAULT 'Offline';
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS target_audience_type VARCHAR(50) DEFAULT 'ALL';
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS target_employee_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS is_onboarding_mandatory BOOLEAN DEFAULT false;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS duration_hours DOUBLE PRECISION DEFAULT 2;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS completion_criteria TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS trainer_type VARCHAR(50) DEFAULT 'INTERNAL';
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS trainer_employee_id VARCHAR(50);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS trainer_name VARCHAR(150);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS trainer_email VARCHAR(255);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS trainer_bio TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS session_instructions TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS learning_materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Published';
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS proposal_status VARCHAR(50) DEFAULT 'Approved';
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(50);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS created_by_role VARCHAR(50);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS approved_by_id VARCHAR(50);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(150);
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS assessment_required BOOLEAN DEFAULT false;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS feedback_required BOOLEAN DEFAULT true;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS certificate_provided BOOLEAN DEFAULT true;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE training_programs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: training_sessions (12 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  batch_name VARCHAR(100) DEFAULT 'Batch 1' NOT NULL,
  session_date DATE NOT NULL,
  start_time VARCHAR(50) DEFAULT '10:00 AM' NOT NULL,
  end_time VARCHAR(50) DEFAULT '12:00 PM' NOT NULL,
  venue_or_link TEXT,
  trainer_name VARCHAR(150),
  capacity INTEGER DEFAULT 50,
  status VARCHAR(50) DEFAULT 'Scheduled' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if training_sessions already exists
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100) DEFAULT 'Batch 1';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS session_date DATE;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS start_time VARCHAR(50) DEFAULT '10:00 AM';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS end_time VARCHAR(50) DEFAULT '12:00 PM';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS venue_or_link TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS trainer_name VARCHAR(150);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 50;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Scheduled';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: training_enrollments (26 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  session_id UUID,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  employee_email VARCHAR(255),
  department VARCHAR(100),
  enrollment_type VARCHAR(50) DEFAULT 'MANUAL_ASSIGNMENT' NOT NULL,
  attendance_status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  attendance_marked_at TIMESTAMPTZ,
  attendance_marked_by VARCHAR(100),
  attendance_notes TEXT,
  completion_status VARCHAR(50) DEFAULT 'Not Started' NOT NULL,
  completed_at TIMESTAMPTZ,
  assessment_status VARCHAR(50) DEFAULT 'Not Applicable' NOT NULL,
  assessment_score DOUBLE PRECISION,
  assessment_attempts_used INTEGER DEFAULT 0,
  feedback_submitted BOOLEAN DEFAULT false,
  certificate_issued BOOLEAN DEFAULT false,
  certificate_number VARCHAR(100),
  certificate_url TEXT,
  certificate_issued_at TIMESTAMPTZ,
  due_date DATE,
  company_logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if training_enrollments already exists
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS enrollment_type VARCHAR(50) DEFAULT 'MANUAL_ASSIGNMENT';
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS attendance_marked_by VARCHAR(100);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS attendance_notes TEXT;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS completion_status VARCHAR(50) DEFAULT 'Not Started';
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS assessment_status VARCHAR(50) DEFAULT 'Not Applicable';
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS assessment_score DOUBLE PRECISION;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS assessment_attempts_used INTEGER DEFAULT 0;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS feedback_submitted BOOLEAN DEFAULT false;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT false;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS certificate_issued_at TIMESTAMPTZ;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: training_assessments (13 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS training_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  duration_minutes INTEGER DEFAULT 30,
  total_marks DOUBLE PRECISION DEFAULT 100,
  pass_percentage DOUBLE PRECISION DEFAULT 60,
  max_attempts INTEGER DEFAULT 2,
  questions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  allow_retake BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if training_assessments already exists
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS total_marks DOUBLE PRECISION DEFAULT 100;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS pass_percentage DOUBLE PRECISION DEFAULT 60;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 2;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN DEFAULT true;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE training_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: training_assessment_submissions (23 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS training_assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL,
  program_id UUID NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  answers JSONB DEFAULT '[]'::jsonb,
  auto_evaluated_score DOUBLE PRECISION DEFAULT 0,
  manual_evaluated_score DOUBLE PRECISION DEFAULT 0,
  total_score DOUBLE PRECISION DEFAULT 0,
  percentage DOUBLE PRECISION DEFAULT 0,
  pass_status VARCHAR(50) DEFAULT 'Pending Evaluation',
  requires_manual_grading BOOLEAN DEFAULT false,
  evaluated_by_id VARCHAR(50),
  evaluated_by_name VARCHAR(150),
  evaluated_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  published_by VARCHAR(150),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if training_assessment_submissions already exists
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS assessment_id UUID;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS auto_evaluated_score DOUBLE PRECISION DEFAULT 0;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS manual_evaluated_score DOUBLE PRECISION DEFAULT 0;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS total_score DOUBLE PRECISION DEFAULT 0;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS percentage DOUBLE PRECISION DEFAULT 0;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS pass_status VARCHAR(50) DEFAULT 'Pending Evaluation';
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS requires_manual_grading BOOLEAN DEFAULT false;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS evaluated_by_id VARCHAR(50);
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS evaluated_by_name VARCHAR(150);
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS published_by VARCHAR(150);
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE training_assessment_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: training_feedbacks (13 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS training_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL,
  enrollment_id UUID,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150),
  content_quality_rating INTEGER DEFAULT 5 NOT NULL,
  trainer_effectiveness_rating INTEGER DEFAULT 5 NOT NULL,
  relevance_to_job_rating INTEGER DEFAULT 5 NOT NULL,
  overall_satisfaction_rating INTEGER DEFAULT 5 NOT NULL,
  suggestions TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if training_feedbacks already exists
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS enrollment_id UUID;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS content_quality_rating INTEGER DEFAULT 5;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS trainer_effectiveness_rating INTEGER DEFAULT 5;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS relevance_to_job_rating INTEGER DEFAULT 5;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS overall_satisfaction_rating INTEGER DEFAULT 5;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS suggestions TEXT;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE training_feedbacks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: employee_certifications (28 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  source_type VARCHAR(50) DEFAULT 'EXTERNAL' NOT NULL,
  internal_program_id UUID,
  course_name VARCHAR(255) NOT NULL,
  provider_institution VARCHAR(255) NOT NULL,
  skills_acquired TEXT,
  start_date DATE,
  completion_date DATE NOT NULL,
  duration_hours DOUBLE PRECISION DEFAULT 0,
  credential_id VARCHAR(150),
  verification_url TEXT,
  issue_date DATE,
  expiry_date DATE,
  certificate_file_url TEXT,
  certificate_file_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Submitted' NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  reviewed_by_id VARCHAR(50),
  reviewed_by_name VARCHAR(150),
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  rejection_reason TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if employee_certifications already exists
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'EXTERNAL';
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS internal_program_id UUID;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS course_name VARCHAR(255);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS provider_institution VARCHAR(255);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS skills_acquired TEXT;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS duration_hours DOUBLE PRECISION DEFAULT 0;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS credential_id VARCHAR(150);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS verification_url TEXT;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS certificate_file_url TEXT;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS certificate_file_name VARCHAR(255);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Submitted';
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS reviewed_by_id VARCHAR(50);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(150);
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS review_comments TEXT;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE employee_certifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: infosec_campaigns (17 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS infosec_campaigns (
  id SERIAL PRIMARY KEY,
  campaign_code VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Phishing & Social Engineering' NOT NULL,
  description TEXT,
  start_date DATE DEFAULT '{}'::jsonb NOT NULL,
  end_date DATE NOT NULL,
  target_departments VARCHAR(255) DEFAULT 'All' NOT NULL,
  status VARCHAR(50) DEFAULT 'Active' NOT NULL,
  mandatory BOOLEAN DEFAULT true NOT NULL,
  passing_score INTEGER DEFAULT 80 NOT NULL,
  training_modules TEXT,
  quiz_questions TEXT,
  acknowledgment_statement TEXT,
  created_by VARCHAR(100) DEFAULT 'InfoSec Compliance Officer' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if infosec_campaigns already exists
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS campaign_code VARCHAR(100);
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Phishing & Social Engineering';
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT '{}'::jsonb;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS target_departments VARCHAR(255) DEFAULT 'All';
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS mandatory BOOLEAN DEFAULT true;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 80;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS training_modules TEXT;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS quiz_questions TEXT;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS acknowledgment_statement TEXT;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'InfoSec Compliance Officer';
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE infosec_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- TABLE: infosec_acknowledgments (20 columns)
-- ==========================================================================
CREATE TABLE IF NOT EXISTS infosec_acknowledgments (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(150),
  employee_email VARCHAR(150),
  department VARCHAR(100),
  designation VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  quiz_score INTEGER,
  quiz_attempts INTEGER DEFAULT 0 NOT NULL,
  quiz_passed BOOLEAN DEFAULT false NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  ip_address VARCHAR(100),
  user_agent TEXT,
  compliance_hash VARCHAR(100),
  certificate_issued BOOLEAN DEFAULT false NOT NULL,
  certificate_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Safe Migration: Add any missing column if infosec_acknowledgments already exists
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS employee_name VARCHAR(150);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS employee_email VARCHAR(150);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS quiz_score INTEGER;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS quiz_attempts INTEGER DEFAULT 0;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS quiz_passed BOOLEAN DEFAULT false;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS compliance_hash VARCHAR(100);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS certificate_issued BOOLEAN DEFAULT false;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100);
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE infosec_acknowledgments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ==========================================================================
-- PERFORMANCE INDEXES & ESSENTIAL CONSTRAINTS
-- ==========================================================================

-- Users & Employees
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_emp_id ON users(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_dept_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_desig_id ON users(designation_id);
CREATE INDEX IF NOT EXISTS idx_users_grade_id ON users(grade_id);
CREATE INDEX IF NOT EXISTS idx_users_tl_id ON users(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_desig_id ON employees(designation_id);
CREATE INDEX IF NOT EXISTS idx_employees_grade_id ON employees(grade_id);
CREATE INDEX IF NOT EXISTS idx_employees_tl_id ON employees(team_lead_id);

-- Attendance & Schedules
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_dept_date ON attendance(dept, date);
CREATE INDEX IF NOT EXISTS idx_schedules_emp_date ON schedules(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_att_reg_emp ON attendance_regularizations(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_reg_date ON attendance_regularizations(attendance_date);
CREATE INDEX IF NOT EXISTS idx_att_reg_status ON attendance_regularizations(status);
CREATE INDEX IF NOT EXISTS idx_wfh_emp_id ON work_from_homes(employee_id);
CREATE INDEX IF NOT EXISTS idx_wfh_dates ON work_from_homes(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_wfh_status ON work_from_homes(status);

-- Biometrics
CREATE INDEX IF NOT EXISTS idx_biometric_punches_emp_date ON biometric_punches(employee_id, punch_date);
CREATE INDEX IF NOT EXISTS idx_biometric_punches_user_date ON biometric_punches(biometric_user_id, punch_date);

-- Leaves
CREATE INDEX IF NOT EXISTS idx_leaves_emp_id ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_emp_year ON leave_allocations(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_cf_logs_emp_year ON leave_carry_forward_logs(employee_id, to_year);

-- Payroll & Settlements
CREATE INDEX IF NOT EXISTS idx_payrolls_emp_month ON payrolls(employee_id, month_year);
CREATE INDEX IF NOT EXISTS idx_fnf_emp_id ON fnf_settlements(employee_id);
CREATE INDEX IF NOT EXISTS idx_fnf_resignation_id ON fnf_settlements(resignation_id);

-- Holidays
CREATE INDEX IF NOT EXISTS idx_holidays_branch ON holidays(branch_location);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Organization Structure
CREATE INDEX IF NOT EXISTS idx_designations_dept ON designations(department_id);
CREATE INDEX IF NOT EXISTS idx_designations_grade ON designations(grade_id);
CREATE INDEX IF NOT EXISTS idx_designations_is_tl ON designations(is_tl_role);

-- Recruitment & Pre-Joining
CREATE INDEX IF NOT EXISTS idx_recruitment_cand_req ON recruitment_candidates(requisition_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_offers_cand_id ON recruitment_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_offers_req_id ON recruitment_offers(requisition_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_offers_token ON recruitment_offers(acceptance_token);
CREATE INDEX IF NOT EXISTS idx_recruitment_offers_status ON recruitment_offers(offer_status);
CREATE INDEX IF NOT EXISTS idx_prejoin_token ON candidate_pre_joinings(token);
CREATE INDEX IF NOT EXISTS idx_prejoin_email ON candidate_pre_joinings(candidate_email);
CREATE INDEX IF NOT EXISTS idx_prejoin_status ON candidate_pre_joinings(status);

-- Expense Claims & Items
CREATE INDEX IF NOT EXISTS idx_expense_claims_emp_id ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_stage ON expense_claims(current_stage);
CREATE INDEX IF NOT EXISTS idx_claim_items_claim_id ON expense_claim_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_items_category ON expense_claim_items(category);

-- Approvals Workflow & Requests
CREATE INDEX IF NOT EXISTS idx_approval_req_emp ON approval_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_mod ON approval_requests(module);
CREATE INDEX IF NOT EXISTS idx_approval_req_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_req_steps_req ON approval_request_steps(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_req_steps_assign ON approval_request_steps(assigned_to_id);

-- Loans & Advances
CREATE INDEX IF NOT EXISTS idx_loan_emp ON loans_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_loan_status ON loans_advances(status);
CREATE INDEX IF NOT EXISTS idx_loan_type ON loans_advances(type);
CREATE INDEX IF NOT EXISTS idx_repayment_loan_id ON loan_repayment_logs(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayment_emp ON loan_repayment_logs(employee_id);

-- InfoSec Compliance
CREATE INDEX IF NOT EXISTS idx_infosec_camp_code ON infosec_campaigns(campaign_code);
CREATE INDEX IF NOT EXISTS idx_infosec_camp_status ON infosec_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_infosec_ack_camp ON infosec_acknowledgments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_infosec_ack_emp ON infosec_acknowledgments(employee_id);
CREATE INDEX IF NOT EXISTS idx_infosec_ack_status ON infosec_acknowledgments(status);

-- 360-Degree Feedback
CREATE INDEX IF NOT EXISTS idx_f360_cycle_code ON feedback_cycles_360(cycle_code);
CREATE INDEX IF NOT EXISTS idx_f360_cycle_status ON feedback_cycles_360(status);
CREATE INDEX IF NOT EXISTS idx_f360_assign_cycle ON feedback_assignments_360(cycle_id);
CREATE INDEX IF NOT EXISTS idx_f360_assign_eval ON feedback_assignments_360(evaluatee_id);
CREATE INDEX IF NOT EXISTS idx_f360_assign_rater ON feedback_assignments_360(rater_id);
CREATE INDEX IF NOT EXISTS idx_f360_assign_status ON feedback_assignments_360(status);
CREATE INDEX IF NOT EXISTS idx_f360_summary_eval ON feedback_summaries_360(evaluatee_id);

-- Training & Development
CREATE INDEX IF NOT EXISTS idx_training_programs_type_status ON training_programs(type, status);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_emp ON training_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_prog ON training_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_training_submissions_prog_emp ON training_assessment_submissions(program_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_certs_emp ON employee_certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_certs_status ON employee_certifications(status);

-- ==========================================================================
-- ESSENTIAL SYSTEM SETTINGS & INITIAL SEEDS
-- ==========================================================================
INSERT INTO system_settings (key, value) VALUES ('global_esi_threshold', '21000') ON CONFLICT (key) DO NOTHING;
INSERT INTO system_settings (key, value) VALUES ('company_loan_interest_rate', '8.5') ON CONFLICT (key) DO NOTHING;

-- Seed Default Leave Policies
INSERT INTO leave_policies (leave_code, leave_name, default_annual_quota, can_carry_forward, carry_forward_max_years, max_stack_limit, applicable_gender, employment_type_eligibility, color, description)
VALUES 
  ('CL', 'Casual Leave', 5, false, 0, 0, 'All', 'All', '#10b981', '5 Days Yearly for all staff (cannot carry forward)'),
  ('SL', 'Sick Leave', 5, false, 0, 0, 'All', 'Permanent', '#3b82f6', '5 Days Yearly for permanent staff (cannot carry forward)'),
  ('EL', 'Earned Leave', 12, true, 3, 45, 'All', 'Permanent', '#8b5cf6', '12 Days Yearly. Carry-forward up to 3 years, stacking up to 45 leaves beyond which will be lapsed.'),
  ('PL', 'Privilege Leave', 15, true, 3, 45, 'All', 'Permanent', '#6366f1', '15 Days Yearly. Carry-forward up to 3 years, stacking up to 45 leaves beyond which will be lapsed.'),
  ('ML', 'Maternity Leave', 90, false, 0, 0, 'Female', 'Permanent', '#ec4899', '90 Days Maternity Leave for female permanent staff'),
  ('PAT', 'Paternity Leave', 5, false, 0, 0, 'Male', 'Permanent', '#06b6d4', '5 Days Paternity Leave for male permanent staff'),
  ('CO', 'Comp Off', 0, false, 0, 0, 'All', 'All', '#f97316', 'Compensatory Off credited for approved duty')
ON CONFLICT (leave_code) DO NOTHING;

-- Seed Default Job Grades
INSERT INTO job_grades (grade_code, grade_name, rank_level, min_salary, max_salary, notice_period_days, description)
VALUES
  ('L1', 'Intern / Trainee', 1, 200000, 450000, 15, 'Interns, apprentices, and entry-level trainee roles'),
  ('L2', 'Executive / Associate', 2, 350000, 800000, 30, 'Individual contributors: Executives, Software Engineers, BDAs, Associates'),
  ('L3', 'Sr. Executive / Specialist', 3, 650000, 1300000, 45, 'Experienced staff: Sr. Executives, Sr. Engineers, Sr. Accountants, Supervisors'),
  ('L4', 'Asst. Manager / Lead', 4, 1100000, 1900000, 60, 'First-line leadership: Assistant Managers, Technical Leads, Team Leads'),
  ('L5', 'Deputy Manager', 5, 1600000, 2500000, 60, 'Deputy operational leadership: Deputy Managers, Senior Functional Leads'),
  ('L6', 'Manager', 6, 2100000, 3400000, 60, 'Mid-level leadership & department operations: Managers, Team Heads'),
  ('L7', 'Sr. Manager', 7, 2800000, 4500000, 90, 'Senior management: Senior Managers, Practice Leads, Delivery Heads'),
  ('L8', 'Asst. General Manager (AGM)', 8, 3800000, 6000000, 90, 'Executive leadership: Assistant General Managers (AGM)'),
  ('L9', 'Deputy General Manager (DGM)', 9, 5000000, 8500000, 90, 'Senior executive leadership: Deputy General Managers (DGM)'),
  ('L10', 'General Manager (GM)', 10, 7000000, 12500000, 90, 'Departmental & Divisional Heads: General Managers (GM)'),
  ('L11', 'Department Head / VP / CXO', 11, 10000000, 25000000, 90, 'Executive Committee / C-Suite: CHRO, CTO, CFO, COO, CEO, VP')
ON CONFLICT (grade_code) DO NOTHING;

-- Seed Default Departments
INSERT INTO departments (dept_code, dept_name, description)
VALUES
  ('IT', 'IT Department', 'Information Technology, Systems, DevOps, Cloud Infrastructure, and Technical Support'),
  ('SALES', 'Sales & Marketing', 'Business development, enterprise sales, marketing campaigns, client relations'),
  ('FIN', 'Accounts & Finance', 'Financial management, taxation, accounting, payroll, and billing'),
  ('HR', 'Human Resources (HR)', 'Talent acquisition, employee welfare, policies, and people operations'),
  ('OPS', 'Operations', 'Production, factory/plant operations, supply chain, and logistics'),
  ('ADMIN', 'Administration & Facilities', 'Office infrastructure, maintenance, facilities, and admin support'),
  ('CS', 'Customer Support', 'Customer care, technical helpdesk, and client satisfaction'),
  ('LEGAL', 'Legal Cell', 'Corporate compliance, contracts, regulatory affairs, and legal advisory'),
  ('EXEC', 'Management / Executive', 'Executive leadership, corporate strategy, and board members'),
  ('GEN', 'General / Corporate', 'Cross-functional, shared corporate resources, and unassigned staff')
ON CONFLICT (dept_code) DO NOTHING;

-- Seed Default Biometric Terminals
INSERT INTO biometric_devices (device_name, device_serial, device_type, ip_address, port, location, api_key, status, sync_mode, is_active, notes)
VALUES
  ('SilkBio-101 Reception Terminal', 'BIO-ZKT-HQ-01', 'ZKTeco', '192.168.1.201', 4370, 'Main Reception (Tower A, Ground Floor)', 'BIO-KEY-HQ-REC-8849', 'ONLINE', 'REALTIME_PUSH', true, 'Primary employee biometric terminal with facial recognition and fingerprint sensor.'),
  ('eSSL BioFinger - IT Wing', 'BIO-ESSL-IT-02', 'eSSL', '192.168.1.205', 4370, '4th Floor IT Development Center', 'BIO-KEY-IT-WING-7192', 'ONLINE', 'REALTIME_PUSH', true, 'Secondary biometric access terminal with smart card and optical fingerprint sensor.')
ON CONFLICT (device_serial) DO NOTHING;
