const express = require("express");
const AuthController = require("../controller/authController");
const EmployeeController = require("../controller/employeeController");
const AttendanceController = require("../controller/attendanceController");
const ScheduleController = require("../controller/scheduleController");
const LeaveController = require("../controller/leaveController");
const HODController = require("../controller/hodController");
const ResignationController = require("../controller/resignationController");
const PayrollController = require("../controller/payrollController");
const ITDeclarationController = require("../controller/itDeclarationController");
const MediclaimController = require("../controller/mediclaimController");
const KpiController = require("../controller/kpiController");
const RecruitmentController = require("../controller/recruitmentController");
const OnboardingController = require("../controller/onboardingController");
const HolidayController = require("../controller/holidayController");
const AdminTaskController = require("../controller/adminTaskController");
const HrEventController = require("../controller/hrEventController");
const TrainingController = require("../controller/trainingController");
const BiometricController = require("../controller/biometricController");
const FnfController = require("../controller/fnfController");
const OfferController = require("../controller/offerController");
const ClaimController = require("../controller/claimController");
const OrganizationController = require("../controller/organizationController");
const authenticate = require("../middleware/Authorization");
const { authorizeRoles, authenticateAllowExpired } = require("../middleware/Authorization");
const upload = require("../utils/multer");

// Middleware to permit hardware push via device key or token
const optionalDeviceAuth = (req, res, next) => {
  if (req.headers["x-device-key"] || req.query.api_key || req.body?.api_key) {
    return next();
  }
  return authenticate(req, res, next);
};

const router = express.Router();

// Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOTP);

// Protected routes (require valid JWT)
router.post("/change-password", authenticate, AuthController.changePassword);
router.patch("/users/:id/password", authenticate, AuthController.changePassword);
router.post("/acknowledge-notice", authenticate, AuthController.acknowledgeNotice);

// Administrative routes (require 'hr' role)
router.get("/users", authenticate, authorizeRoles("hr", "admin", "ceo", "coo", "hrmanager"), AuthController.getAllUsers);
router.patch("/users/:id/status", authenticate, authorizeRoles("hr", "admin", "ceo", "coo", "hrmanager"), AuthController.toggleStatus);
router.delete("/users/:id", authenticate, authorizeRoles("hr", "admin", "ceo", "coo", "hrmanager"), AuthController.deleteUser);

// Employee Management routes (called by HR / Admin)
router.get("/employees", EmployeeController.getAllEmployees);
router.post("/employees/add", EmployeeController.addEmployee);
router.post("/employees/update", EmployeeController.updateEmployee);
router.post("/employees/delete", EmployeeController.deleteEmployee);
router.post("/employees/toggle-tabs", EmployeeController.toggleEmployeeTabs);
router.post("/employees/update-tabs", EmployeeController.updateEmployeeTabs);
router.get("/employee/:empId", EmployeeController.getEmployeeByCode);
router.get("/employee/profile/:empId", EmployeeController.getEmployeeByCode);
// router.get("/employees/profile/:empId", EmployeeController.getEmployeeByCode);
// router.get("/employees/:empId", EmployeeController.getEmployeeByCode);
router.get("/employees/:empId/salary", EmployeeController.getSalaryStructure);
router.post("/employees/:empId/salary", EmployeeController.updateSalaryStructure);
router.get("/employee/:empId/salary", EmployeeController.getSalaryStructure);
router.post("/employee/:empId/salary", EmployeeController.updateSalaryStructure);
router.post("/employees/verify-documents", authenticate, authorizeRoles("hr", "admin", "ceo", "coo", "hrmanager"), EmployeeController.verifyEmployeeDocuments);

// Payroll Management routes
router.get("/payroll/settings", authenticate, PayrollController.getPayrollSettings);
router.post("/payroll/settings", authenticate, authorizeRoles("accounts", "admin", "payroll", "hr"), PayrollController.updatePayrollSettings);
router.get("/payroll/facilities", authenticate, PayrollController.getAllEmployeeFacilities);
router.post("/payroll/facilities/batch", authenticate, PayrollController.batchUpdateEmployeeFacilities);
router.get("/payroll/facilities/:employeeId", authenticate, PayrollController.getEmployeeFacilities);
router.post("/payroll/facilities/:employeeId", authenticate, PayrollController.updateEmployeeFacilities);
router.put("/payroll/facilities/:employeeId", authenticate, PayrollController.updateEmployeeFacilities);
router.get("/payroll", PayrollController.getAllPayrolls);
router.get("/payroll/all", PayrollController.getAllPayrolls);
router.get("/payroll/summary-sheet", PayrollController.getMonthlySummarySheet);
router.get("/payroll/data/:employeeId", PayrollController.getPayrollData);
router.post("/payroll/finalize", PayrollController.finalizePayroll);
router.post("/payroll/assign-company", PayrollController.assignCompanyLocation);
router.post("/payroll/disburse-batch", PayrollController.disburseBatch);
router.get("/payroll/history/:employeeId", PayrollController.getPayrollHistory);

// Detailed Profile Update with Document Upload (supports multiple files)
router.post("/employee/:empId/profile",
  upload.any(),
  EmployeeController.updateDetailedProfile
);

// Attendance routes
router.get("/attendance", authenticate, AttendanceController.getAttendance);
router.get("/attendance/today-status", authenticate, AttendanceController.getTodayStatus);
router.post("/attendance/check-in", authenticate, AttendanceController.checkIn);
router.post("/attendance/check-out", authenticate, AttendanceController.checkOut);
router.post("/attendance/auto-clock-out", authenticateAllowExpired, AttendanceController.autoClockOut);
router.post("/attendance/portal-logout", authenticateAllowExpired, AttendanceController.portalLogout);
router.post("/attendance/mark", authenticate, AttendanceController.markManualAttendance);

// Biometric Hardware & Real-Time Sync routes
router.post("/attendance/biometric/punch", optionalDeviceAuth, BiometricController.recordPunch);
router.post("/attendance/biometric/batch-sync", optionalDeviceAuth, BiometricController.batchSyncPunches);
router.post("/attendance/biometric/import-file", authenticate, BiometricController.importPunchFile);
router.get("/attendance/biometric/devices", authenticate, BiometricController.getDevices);
router.post("/attendance/biometric/devices", authenticate, BiometricController.createDevice);
router.put("/attendance/biometric/devices/:id", authenticate, BiometricController.updateDevice);
router.delete("/attendance/biometric/devices/:id", authenticate, BiometricController.deleteDevice);
router.post("/attendance/biometric/devices/:id/test-ping", authenticate, BiometricController.testPingDevice);
router.post("/attendance/biometric/devices/:id/regenerate-key", authenticate, BiometricController.generateDeviceKey);
router.get("/attendance/biometric/punches", authenticate, BiometricController.getPunches);
router.post("/attendance/biometric/map-user", authenticate, BiometricController.mapBiometricUser);
router.get("/attendance/biometric/stats", authenticate, BiometricController.getBiometricStats);

// Work Schedule & Shift Planning routes
router.get("/schedule", authenticate, ScheduleController.getSchedule);
router.post("/schedule/create", authenticate, ScheduleController.createSchedule);
router.post("/schedule/assign-rotational", authenticate, ScheduleController.assignRotationalWeekOff);
router.post("/schedule/bulk-upload", authenticate, ScheduleController.bulkUploadSchedule);
router.delete("/schedule/:id", authenticate, ScheduleController.deleteSchedule);

// Holiday Calendar routes
router.get("/holidays", HolidayController.getHolidays);
router.post("/holidays", authenticate, HolidayController.addHoliday);
router.post("/holidays/add", authenticate, HolidayController.addHoliday);
router.delete("/holidays/:id", authenticate, HolidayController.deleteHoliday);

// Leave Management routes
router.get("/leave", authenticate, LeaveController.getLeaves);
router.get("/leave/balance", authenticate, LeaveController.getLeaveBalance);
router.post("/leave/apply", authenticate, upload.single("doc_url"), LeaveController.applyLeave);
router.patch("/leave/:id/status", authenticate, LeaveController.updateLeaveStatus);
router.delete("/leave/:id/cancel", authenticate, LeaveController.cancelLeave);

// Leave Allocation & Carry-Forward Engine (HR / Admin)
// Rules: Only Earned Leaves (EL) & Privilege Leaves (PL) carry forward up to 3 years (stacking up to 45 leaves, beyond which is lapsed).
router.get("/leave/allocations", authenticate, LeaveController.getAllocations);
router.post("/leave/allocate/individual", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), LeaveController.allocateIndividual);
router.post("/leave/allocate/bulk", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), LeaveController.allocateBulk);
router.post("/leave/cleanup-gender-allocations", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), LeaveController.cleanupGenderAllocations);
router.post("/leave/process-carry-forward", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), LeaveController.processCarryForward);
router.get("/leave/carry-forward-history/:employeeId", authenticate, LeaveController.getCarryForwardHistory);
router.get("/leave/policies", authenticate, LeaveController.getLeavePolicies);
router.put("/leave/policies/:code", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), LeaveController.updateLeavePolicy);

// Resignation & Separation routes
router.get("/resignation", authenticate, ResignationController.getResignations);
router.get("/resignation/my", authenticate, ResignationController.getMyResignation);
router.get("/resignation/employee/:id/history", authenticate, ResignationController.getEmployeeResignationHistory);
router.get("/resignation/:id", authenticate, ResignationController.getResignationById);
router.post("/resignation/apply", authenticate, ResignationController.applyResignation);

// Hierarchical Multi-Level Approvals: TL -> Manager -> HOD -> Admin -> HR
router.patch("/resignation/:id/tl-action", authenticate, ResignationController.tlReview);
router.patch("/resignation/:id/manager-action", authenticate, ResignationController.managerReview);
router.patch("/resignation/:id/hod-action", authenticate, ResignationController.hodReview);
router.patch("/resignation/:id/submit-handover", authenticate, ResignationController.submitHandover);
router.patch("/resignation/:id/confirm-handover", authenticate, ResignationController.confirmHandover);
router.patch("/resignation/:id/admin-action", authenticate, ResignationController.adminReview);
router.patch("/resignation/:id/hr-action", authenticate, ResignationController.hrReview);

// Serial Department Clearances & Custom Departments
router.post("/resignation/:id/raise-clearance", authenticate, ResignationController.raiseClearance);
router.post("/resignation/:id/add-clearance-dept", authenticate, ResignationController.addCustomClearanceDept);
router.patch("/resignation/:id/clear-dept", authenticate, ResignationController.clearDepartmentStep);
router.patch("/resignation/:id/clearance", authenticate, ResignationController.updateClearance);

// Exit Interview Form (Details & 10 Questions)
router.post("/resignation/:id/raise-exit-interview", authenticate, ResignationController.raiseExitInterview);
router.patch("/resignation/:id/submit-exit-interview", authenticate, ResignationController.submitExitInterview);

router.delete("/resignation/:id/cancel", authenticate, ResignationController.cancelResignation);

// ==========================================
// Full & Final (F&F) Settlement & Letters Routes
// ==========================================
router.get("/fnf", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll", "hrmanager", "ceo", "coo"), FnfController.getSettlements);
router.get("/fnf/my", authenticate, FnfController.getMySettlement);
router.get("/fnf/eligible-resignations", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll", "hrmanager", "ceo", "coo"), FnfController.getEligibleResignations);
router.get("/fnf/preview/:resignationId", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll", "hrmanager", "ceo", "coo"), FnfController.previewSettlement);
router.post("/fnf/calculate", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll", "hrmanager", "ceo", "coo"), FnfController.calculateSettlement);
router.post("/fnf/save", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll", "hrmanager", "ceo", "coo"), FnfController.saveSettlement);
router.patch("/fnf/:id/finalize", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), FnfController.finalizeSettlement);
router.patch("/fnf/:id/disburse", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll", "hrmanager", "ceo", "coo"), FnfController.disburseSettlement);
router.get("/fnf/letter/:type/:id", authenticate, FnfController.getExitLetterData);
router.delete("/fnf/:id", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), FnfController.deleteSettlement);

// Offer Management & Candidate Digital Acceptance
router.get("/offers", authenticate, authorizeRoles("hr", "admin", "hod", "manager", "teamlead", "hrmanager", "ceo", "coo"), OfferController.getOffers);
router.get("/offers/:id", authenticate, OfferController.getOfferById);
router.post("/offers/calculate-structure", authenticate, OfferController.calculateStructure);
router.post("/offers", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), OfferController.createOffer);
router.put("/offers/:id", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), OfferController.updateOffer);
router.post("/offers/:id/approve", authenticate, authorizeRoles("hr", "admin", "hod", "manager", "hrmanager", "ceo", "coo"), OfferController.approveOffer);
router.post("/offers/:id/send", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), OfferController.sendOfferToCandidate);
router.delete("/offers/:id", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo"), OfferController.deleteOffer);

// Public Candidate Acceptance routes (Token secured, no login required)
router.get("/offers/candidate-view/:token", OfferController.getCandidateOfferByToken);
router.post("/offers/candidate-respond/:token", OfferController.candidateRespondOffer);

// =========================================================================
// Employee Claims & Reimbursement Module
// =========================================================================
// 1. Employee self-service
router.get("/claims/my", authenticate, ClaimController.getMyClaims);
router.post("/claims", authenticate, ClaimController.createClaim);
router.post("/claims/upload-receipt", authenticate, upload.single("receipt"), ClaimController.uploadReceipt);
router.get("/claims/:id", authenticate, ClaimController.getClaimById);
router.put("/claims/:id", authenticate, ClaimController.updateClaim);
router.delete("/claims/:id", authenticate, ClaimController.deleteClaim);
router.post("/claims/:id/cancel", authenticate, ClaimController.cancelClaim);

// 2. Manager / HOD review
router.get("/claims/workflow/manager-pending", authenticate, authorizeRoles("hod", "manager", "teamlead", "hr", "admin", "ceo", "coo", "hrmanager"), ClaimController.getManagerPendingClaims);
router.post("/claims/:id/manager-review", authenticate, authorizeRoles("hod", "manager", "teamlead", "hr", "admin", "ceo", "coo", "hrmanager"), ClaimController.managerReviewClaim);

// 3. Finance / Accounts review & disbursement
router.get("/claims/workflow/finance-pending", authenticate, authorizeRoles("accounts", "payroll", "finance", "hr", "admin", "ceo", "coo", "cfo", "management"), ClaimController.getFinancePendingClaims);
router.post("/claims/:id/finance-review", authenticate, authorizeRoles("accounts", "payroll", "finance", "hr", "admin", "ceo", "coo", "cfo", "management"), ClaimController.financeReviewClaim);
router.post("/claims/:id/disburse", authenticate, authorizeRoles("accounts", "payroll", "finance", "hr", "admin", "ceo", "coo", "cfo", "management"), ClaimController.disburseClaim);

// 4. HR Global Oversight & Analytics
router.get("/claims/oversight/all", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo", "management"), ClaimController.getAllClaims);
router.post("/claims/:id/hr-override", authenticate, authorizeRoles("hr", "admin", "hrmanager", "ceo", "coo", "management"), ClaimController.hrOverrideClaim);

// HOD Dashboard routes
router.get("/hod/dashboard-stats", authenticate, HODController.getDashboardStats);

// IT Declaration routes (Employee self-service)
router.get("/it-declaration/my", authenticate, ITDeclarationController.getMyDeclaration);
router.post("/it-declaration/save", authenticate, ITDeclarationController.saveDeclaration);
router.post("/it-declaration/preview-tax", authenticate, ITDeclarationController.calculateTaxPreview);
router.post("/it-declaration/upload-proof", authenticate, upload.single("proof_file"), ITDeclarationController.uploadProof);
router.delete("/it-declaration/delete-proof/:declarationId/:proofId", authenticate, ITDeclarationController.deleteProof);

// IT Declaration Admin / HR / Accounts review routes
router.get("/it-declaration/all", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), ITDeclarationController.getAllDeclarations);
router.get("/it-declaration/:id", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), ITDeclarationController.getDeclarationById);
router.patch("/it-declaration/:id/review", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), ITDeclarationController.reviewDeclaration);

// Mediclaim & Health Insurance routes (Employee self-service)
router.get("/mediclaim/my", authenticate, MediclaimController.getMyMediclaim);
router.post("/mediclaim/dependents", authenticate, MediclaimController.updateDependents);
router.post("/mediclaim/upload-doc", authenticate, upload.single("doc_file"), MediclaimController.uploadSupportingDocument);
router.post("/mediclaim/claim/submit", authenticate, MediclaimController.submitClaim);
router.delete("/mediclaim/claim/:id/cancel", authenticate, MediclaimController.cancelClaim);

// Mediclaim Admin / HR / Accounts review routes
router.get("/mediclaim/all-claims", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.getAllClaims);
router.patch("/mediclaim/claim/:id/review", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.reviewClaim);
router.get("/mediclaim/stats", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.getMediclaimStats);
router.post("/mediclaim/policy/manage", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.managePolicy);

// Mediclaim Highlights (Viewable by all, editable by HR)
router.get("/mediclaim/highlights", authenticate, MediclaimController.getHighlights);
router.post("/mediclaim/highlights", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.saveHighlights);
router.post("/mediclaim/highlights/reset", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.resetHighlights);

// Mediclaim Hospital Directory (Viewable by all with city filtering, upload & manage by HR)
router.get("/mediclaim/hospitals", authenticate, MediclaimController.getHospitals);
router.post("/mediclaim/hospitals/upload", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.uploadHospitals);
router.post("/mediclaim/hospitals", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.createHospital);
router.delete("/mediclaim/hospitals/:id", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.deleteHospital);

// Mediclaim Employee Coverage (Sum Insured) Desk (HR only)
router.get("/mediclaim/employees-coverage", authenticate, authorizeRoles("hr", "admin", "accounts", "payroll"), MediclaimController.getEmployeesCoverage);

// ==========================================
// KPI & Performance Management Routes
// ==========================================

// Master Templates (HR / HOD / Admin)
router.get("/kpi/templates", authenticate, KpiController.getTemplates);
router.post("/kpi/templates", authenticate, authorizeRoles("hr", "admin"), KpiController.createTemplate);
router.put("/kpi/templates/:id", authenticate, authorizeRoles("hr", "admin"), KpiController.updateTemplate);
router.delete("/kpi/templates/:id", authenticate, authorizeRoles("hr", "admin"), KpiController.deleteTemplate);

// Goal Assignment (HR / HOD / Admin)
router.post("/kpi/assign", authenticate, authorizeRoles("hr", "admin", "hod"), KpiController.assignKpi);
router.post("/kpi/bulk-assign", authenticate, authorizeRoles("hr", "admin", "hod"), KpiController.bulkAssignDepartment);

// Employee Self-Assessment
router.get("/kpi/my-goals", authenticate, KpiController.getMyKpi);
router.post("/kpi/my-goals/save", authenticate, KpiController.saveSelfAssessment);

// HOD / Manager Review
router.get("/kpi/team-reviews", authenticate, authorizeRoles("hod", "hr", "admin"), KpiController.getTeamReviews);
router.post("/kpi/team-reviews/:id/evaluate", authenticate, authorizeRoles("hod", "hr", "admin"), KpiController.evaluateTeamMember);

// HR Admin Calibration & Company-wide view
router.get("/kpi/all-cycles", authenticate, authorizeRoles("hr", "admin"), KpiController.getAllCompanyKpis);
router.post("/kpi/calibrate/:id", authenticate, authorizeRoles("hr", "admin"), KpiController.calibrateAndApprove);

// 6-Month Probation & Annual Appraisal Questionnaire Routes
// Flow: Employee Self -> TL (if avail) -> Manager (if avail) -> HOD -> HR
router.get("/kpi/reviews/demo-questions", authenticate, KpiController.getDemoQuestions);
router.get("/kpi/reviews/eligible-employees", authenticate, authorizeRoles("hr", "admin", "hod"), KpiController.getEligibleEmployees);
router.get("/kpi/reviews/hierarchy-options", authenticate, authorizeRoles("hr", "admin", "hod"), KpiController.getHierarchyOptions);
router.post("/kpi/reviews/initiate", authenticate, authorizeRoles("hr", "admin"), KpiController.initiateReview);
router.get("/kpi/reviews/my-reviews", authenticate, KpiController.getMyReviews);
router.get("/kpi/reviews/pending-reviews", authenticate, authorizeRoles("teamlead", "manager", "hod", "hr", "admin"), KpiController.getPendingReviews);
router.get("/kpi/reviews/all", authenticate, authorizeRoles("hr", "admin", "hod"), KpiController.getAllReviews);
router.get("/kpi/reviews/:id", authenticate, KpiController.getReviewById);
router.post("/kpi/reviews/:id/self-submit", authenticate, KpiController.submitSelfRating);
router.post("/kpi/reviews/:id/tl-review", authenticate, authorizeRoles("teamlead", "hr", "admin"), KpiController.submitTlReview);
router.post("/kpi/reviews/:id/manager-review", authenticate, authorizeRoles("manager", "hr", "admin"), KpiController.submitManagerReview);
router.post("/kpi/reviews/:id/hod-approve", authenticate, authorizeRoles("hod", "hr", "admin"), KpiController.submitHodApproval);
router.post("/kpi/reviews/:id/hr-decision", authenticate, authorizeRoles("hr", "admin"), KpiController.submitHrDecision);
router.delete("/kpi/reviews/:id", authenticate, authorizeRoles("hr", "admin"), KpiController.deleteReview);

// ==========================================
// Recruitment & Hiring Process Routes
// ==========================================

// Requisition Management (HODs of All Departments / HR / Admin / CHRO)
router.post("/recruitment/requisitions", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "teamlead", "ceo", "coo", "hrmanager", "chro", "vphr", "accounts", "sales", "operations", "employee"), upload.single("approval_document"), RecruitmentController.createRequisition);
router.get("/recruitment/requisitions", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "teamlead", "ceo", "coo", "hrmanager", "chro", "vphr", "accounts", "sales", "operations", "employee"), RecruitmentController.getRequisitions);
router.get("/recruitment/requisitions/:id", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "teamlead", "ceo", "coo", "hrmanager", "chro", "vphr", "accounts", "sales", "operations", "employee"), RecruitmentController.getRequisitionById);
router.put("/recruitment/requisitions/:id", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "teamlead", "ceo", "coo", "hrmanager", "chro", "vphr"), RecruitmentController.updateRequisition);

// CHRO / VP HR Finalization of Requisitions (or Delegated General Manager - HR)
router.post("/recruitment/requisitions/:id/finalize", authenticate, authorizeRoles("chro", "vphr", "hr", "admin", "hrmanager", "ceo", "coo", "management", "gm_hr", "gm", "employee"), RecruitmentController.finalizeRequisition);
router.post("/recruitment/requisitions/:id/delegate", authenticate, authorizeRoles("chro", "vphr", "admin", "management", "hr", "hrmanager"), RecruitmentController.delegateFinalizer);
router.get("/recruitment/eligible-finalizers", authenticate, authorizeRoles("chro", "vphr", "admin", "management", "hr", "hrmanager"), RecruitmentController.getEligibleFinalizers);

// CEO / COO Approval for Unbudgeted Recruitment
router.post("/recruitment/requisitions/:id/request-approval", authenticate, authorizeRoles("hr", "admin", "hod", "hrmanager"), RecruitmentController.requestCeoApproval);
router.post("/recruitment/requisitions/:id/approve-budget", authenticate, authorizeRoles("ceo", "coo", "admin", "hr", "hrmanager"), RecruitmentController.approveRejectBudget);

// Candidate Resume Listing (HR)
router.post("/recruitment/candidates", authenticate, authorizeRoles("hr", "admin", "hrmanager"), upload.single("resume"), RecruitmentController.addCandidate);
router.get("/recruitment/candidates", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "ceo", "coo", "hrmanager"), RecruitmentController.getCandidates);
router.get("/recruitment/candidates/:candidate_id", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "ceo", "coo", "hrmanager"), RecruitmentController.getCandidateById);
router.post("/recruitment/candidates/:candidate_id/evaluation", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "hrmanager"), RecruitmentController.submitCandidateEvaluation);
router.patch("/recruitment/candidates/:candidate_id/stage", authenticate, authorizeRoles("hr", "admin", "hrmanager"), RecruitmentController.updateInterviewStage);
router.delete("/recruitment/candidates/:candidate_id", authenticate, authorizeRoles("hr", "admin", "hrmanager"), RecruitmentController.deleteCandidate);

// HOD Candidate Selection & Interview Request
router.post("/recruitment/candidates/:candidate_id/hod-action", authenticate, authorizeRoles("hod", "hr", "admin", "manager"), RecruitmentController.hodCandidateAction);

// Recruitment Dashboard Metrics
router.get("/recruitment/stats", authenticate, authorizeRoles("hod", "hr", "admin", "manager", "ceo", "coo", "hrmanager"), RecruitmentController.getRecruitmentStats);

// ==========================================
// Onboarding Process Routes
// a) Joining (email, id card, biometric, laptop, bag, stationery)
// b) Documentation process
// c) Intro & Training (HR, Admin, POS, Dept)
// d) Department Assignment (after dept training)
// e) 6-Month Probation Review & HOD Permanent / Reject Decision
// ==========================================

// Pipeline listing & stats
router.get("/onboarding/stats", authenticate, authorizeRoles("hr", "admin", "hod", "manager", "ceo", "coo"), OnboardingController.getOnboardingStats);
router.get("/onboarding/my", authenticate, OnboardingController.getMyOnboarding);
router.get("/onboarding", authenticate, authorizeRoles("hr", "admin", "hod", "manager", "ceo", "coo"), OnboardingController.getAllOnboardings);
router.get("/onboarding/:id", authenticate, OnboardingController.getOnboardingById);
router.post("/onboarding/initiate", authenticate, authorizeRoles("hr", "admin"), OnboardingController.initiateOnboarding);

// Stage A: Joining & Asset Issuance
router.patch("/onboarding/:id/joining-assets", authenticate, authorizeRoles("hr", "admin"), OnboardingController.updateJoiningAssets);

// Stage B: Documentation Process & File Uploads
router.patch("/onboarding/:id/documentation", authenticate, authorizeRoles("hr", "admin"), OnboardingController.updateDocumentation);
router.post("/onboarding/:id/documentation/upload", authenticate, upload.single("doc_file"), OnboardingController.uploadDocumentFile);

// Stage C: Intro & 4-Stage Training Modules (HR, Admin, POS, Dept)
router.patch("/onboarding/:id/training", authenticate, authorizeRoles("hr", "admin", "hod", "manager"), OnboardingController.updateTrainingModule);

// Stage D: Department Assignment (Unlocked after Dept Training)
router.patch("/onboarding/:id/assign-department", authenticate, authorizeRoles("hr", "admin", "hod"), OnboardingController.assignDepartment);

// Stage E: 6-Month Probation Review & HOD Permanent / Reject Decision
router.patch("/onboarding/:id/probation-decision", authenticate, authorizeRoles("hod", "hr", "admin", "manager"), OnboardingController.submitProbationDecision);

// Unofficial Admin Operations & Tasks Desk
router.get("/admin/tasks", authenticate, AdminTaskController.getTasks);
router.post("/admin/tasks", authenticate, AdminTaskController.createTask);
router.patch("/admin/tasks/:id/status", authenticate, AdminTaskController.updateTaskStatus);
router.put("/admin/tasks/:id", authenticate, AdminTaskController.updateTask);
router.delete("/admin/tasks/:id", authenticate, AdminTaskController.deleteTask);

// ==========================================
// HR Events & Corporate Announcements
// ==========================================
router.get("/hr-events", authenticate, HrEventController.getEvents);
router.get("/hr-events/:id", authenticate, HrEventController.getEventById);
router.post("/hr-events", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), HrEventController.createEvent);
router.put("/hr-events/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), HrEventController.updateEvent);
router.delete("/hr-events/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), HrEventController.deleteEvent);
router.post("/hr-events/:id/broadcast", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), HrEventController.broadcastEvent);

// ==========================================
// TRAINING & DEVELOPMENT MODULE
// ==========================================

// Dashboard & Summary Stats
router.get("/training/dashboard-stats", authenticate, TrainingController.getTrainingDashboardStats);

// Programs (HR & Departmental)
router.get("/training/programs", authenticate, TrainingController.getTrainingPrograms);
router.get("/training/programs/:id", authenticate, TrainingController.getTrainingProgramById);
router.post("/training/programs", authenticate, upload.single("company_logo"), TrainingController.createTrainingProgram);
router.put("/training/programs/:id", authenticate, upload.single("company_logo"), TrainingController.updateTrainingProgram);
router.delete("/training/programs/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), TrainingController.deleteTrainingProgram);
router.patch("/training/programs/:id/review-proposal", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), TrainingController.reviewDepartmentalProposal);
router.post("/training/programs/:programId/logo", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), upload.single("company_logo"), TrainingController.uploadProgramLogo);

// Sessions & Attendance
router.post("/training/programs/:programId/sessions", authenticate, TrainingController.addSession);
router.patch("/training/enrollments/:enrollmentId/attendance", authenticate, TrainingController.markAttendance);
router.post("/training/attendance/bulk", authenticate, TrainingController.bulkMarkAttendance);

// Enrollments & Assignments
router.post("/training/programs/:programId/assign", authenticate, TrainingController.assignTraining);
router.get("/training/programs/:programId/enrollments", authenticate, TrainingController.getProgramEnrollments);
router.get("/training/my-trainings", authenticate, TrainingController.getMyTrainings);

// Post-Training Assessments
router.get("/training/programs/:programId/assessment", authenticate, TrainingController.getAssessmentForProgram);
router.post("/training/programs/:programId/assessment", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), TrainingController.createOrUpdateAssessment);
router.post("/training/programs/:programId/assessment/submit", authenticate, TrainingController.submitAssessment);
router.get("/training/programs/:programId/submissions", authenticate, TrainingController.getSubmissionsForProgram);
router.post("/training/submissions/:submissionId/evaluate", authenticate, TrainingController.evaluateDescriptiveAnswers);
router.post("/training/programs/:programId/publish-results", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), upload.single("company_logo"), TrainingController.publishResults);

// Employee Feedback
router.post("/training/programs/:programId/feedback", authenticate, TrainingController.submitFeedback);
router.get("/training/programs/:programId/feedback", authenticate, TrainingController.getProgramFeedback);

// Issued Training Certificates
router.get("/training/certificates/issued", authenticate, TrainingController.getAllIssuedCertificates);
router.get("/training/certificates/:enrollmentId", authenticate, TrainingController.getCertificateById);

// Employee Upskilling & Certifications
router.post("/training/certifications", authenticate, upload.single("certificate_file"), TrainingController.submitCertification);
router.get("/training/certifications/my", authenticate, TrainingController.getMyCertifications);
router.get("/training/certifications/queue", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), TrainingController.getAllCertificationsQueue);
router.patch("/training/certifications/:id/review", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), TrainingController.reviewCertification);

// Onboarding Integration
router.get("/training/onboarding/:employeeId", authenticate, TrainingController.getOnboardingTrainingStatus);
router.post("/training/onboarding/:employeeId/assign", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), TrainingController.assignOnboardingMandatoryTrainings);

// Reports & Exports
router.get("/training/reports", authenticate, TrainingController.getTrainingReportsData);

// ==========================================
// Organization Structure & Department Masters
// ==========================================
router.get("/organization/structure", OrganizationController.getOrganizationStructure);

// Departments
router.get("/departments", OrganizationController.getDepartments);
router.post("/departments", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.createDepartment);
router.put("/departments/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.updateDepartment);
router.delete("/departments/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.deleteDepartment);

// Job Grades
router.get("/job-grades", OrganizationController.getJobGrades);
router.post("/job-grades", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.createJobGrade);
router.put("/job-grades/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.updateJobGrade);

// Designations
router.get("/designations", OrganizationController.getDesignations);
router.post("/designations", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.createDesignation);
router.put("/designations/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.updateDesignation);
router.delete("/designations/:id", authenticate, authorizeRoles("hr", "admin", "management", "ceo", "coo", "hrmanager"), OrganizationController.deleteDesignation);

module.exports = router;
