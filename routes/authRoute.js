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
const authenticate = require("../middleware/Authorization");
const { authorizeRoles, authenticateAllowExpired } = require("../middleware/Authorization");
const upload = require("../utils/multer");

const router = express.Router();

// Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOTP);

// Protected routes (require valid JWT)
router.post("/change-password", authenticate, AuthController.changePassword);
router.patch("/users/:id/password", authenticate, AuthController.changePassword);

// Administrative routes (require 'hr' role)
router.get("/users", authenticate, authorizeRoles("hr"), AuthController.getAllUsers);
router.patch("/users/:id/status", authenticate, authorizeRoles("hr"), AuthController.toggleStatus);
router.delete("/users/:id", authenticate, authorizeRoles("hr"), AuthController.deleteUser);

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
router.post("/employees/verify-documents", authenticate, authorizeRoles("hr"), EmployeeController.verifyEmployeeDocuments);

// Payroll Management routes
router.get("/payroll/all", PayrollController.getAllPayrolls);
router.get("/payroll/data/:employeeId", PayrollController.getPayrollData);
router.post("/payroll/finalize", PayrollController.finalizePayroll);
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

// Work Schedule & Shift Planning routes
router.get("/schedule", authenticate, ScheduleController.getSchedule);
router.post("/schedule/create", authenticate, ScheduleController.createSchedule);
router.post("/schedule/bulk-upload", authenticate, ScheduleController.bulkUploadSchedule);
router.delete("/schedule/:id", authenticate, ScheduleController.deleteSchedule);

// Leave Management routes
router.get("/leave", authenticate, LeaveController.getLeaves);
router.get("/leave/balance", authenticate, LeaveController.getLeaveBalance);
router.post("/leave/apply", authenticate, upload.single("doc_url"), LeaveController.applyLeave);
router.patch("/leave/:id/status", authenticate, LeaveController.updateLeaveStatus);
router.delete("/leave/:id/cancel", authenticate, LeaveController.cancelLeave);

// Resignation & Separation routes
router.get("/resignation", authenticate, ResignationController.getResignations);
router.get("/resignation/my", authenticate, ResignationController.getMyResignation);
router.get("/resignation/employee/:id/history", authenticate, ResignationController.getEmployeeResignationHistory);
router.get("/resignation/:id", authenticate, ResignationController.getResignationById);
router.post("/resignation/apply", authenticate, ResignationController.applyResignation);

// Hierarchical Multi-Level Approvals: TL -> Manager -> HOD -> HR
router.patch("/resignation/:id/tl-action", authenticate, ResignationController.tlReview);
router.patch("/resignation/:id/manager-action", authenticate, ResignationController.managerReview);
router.patch("/resignation/:id/hod-action", authenticate, ResignationController.hodReview);
router.patch("/resignation/:id/submit-handover", authenticate, ResignationController.submitHandover);
router.patch("/resignation/:id/confirm-handover", authenticate, ResignationController.confirmHandover);
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

module.exports = router;
