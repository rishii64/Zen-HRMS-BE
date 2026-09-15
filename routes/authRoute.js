const express = require("express");
const AuthController = require("../controller/authController");
const EmployeeController = require("../controller/employeeController");
const AttendanceController = require("../controller/attendanceController");
const ScheduleController = require("../controller/scheduleController");
const LeaveController = require("../controller/leaveController");
const HODController = require("../controller/hodController");
const ResignationController = require("../controller/resignationController");
const PayrollController = require("../controller/payrollController");
const authenticate = require("../middleware/Authorization");
const { authorizeRoles } = require("../middleware/Authorization");
const upload = require("../utils/multer");

const router = express.Router();

// Public routes
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOTP);

// Protected routes (require valid JWT)
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

// Detailed Profile Update with Document Upload
router.post("/employee/:empId/profile",
  upload.fields([
    { name: "doc_resume", maxCount: 1 },
    { name: "doc_id", maxCount: 1 },
    { name: "doc_cert", maxCount: 1 },
    { name: "profile_photo", maxCount: 1 }
  ]),
  EmployeeController.updateDetailedProfile
);

// Attendance routes
router.get("/attendance", authenticate, AttendanceController.getAttendance);
router.get("/attendance/today-status", authenticate, AttendanceController.getTodayStatus);
router.post("/attendance/check-in", authenticate, AttendanceController.checkIn);
router.post("/attendance/check-out", authenticate, AttendanceController.checkOut);
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
router.get("/resignation/:id", authenticate, ResignationController.getResignationById);
router.post("/resignation/apply", authenticate, ResignationController.applyResignation);
router.patch("/resignation/:id/manager-action", authenticate, ResignationController.managerReview);
router.patch("/resignation/:id/hr-action", authenticate, ResignationController.hrReview);
router.patch("/resignation/:id/clearance", authenticate, ResignationController.updateClearance);
router.delete("/resignation/:id/cancel", authenticate, ResignationController.cancelResignation);

// HOD Dashboard routes
router.get("/hod/dashboard-stats", authenticate, HODController.getDashboardStats);

module.exports = router;
