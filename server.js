process.env.TZ = process.env.TZ || "Asia/Kolkata";
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const db = require("./config/db");
const authRoutes = require("./routes/authRoute");
const authenticate = require("./middleware/Authorization");
const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5001;

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use("/uploads", express.static(uploadsDir));
app.use("/api/uploads", express.static(uploadsDir));
app.use("/api/auth/uploads", express.static(uploadsDir));

// Prevent caching on dynamic API routes so edits always reflect immediately
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Health check
app.get("/", (req, res) => { res.send("Backend working!"); });

// API Routes
// API Routes
app.use("/api/auth", authRoutes);

// Direct root aliases for predictive analytics and public portal to prevent any double-prefix 404
const CustomReportController = require("./controller/customReportController");
const PreJoiningController = require("./controller/preJoiningController");
const upload = require("./utils/multer");
app.get("/api/analytics/predictive", authenticate, CustomReportController.getPredictiveAnalytics);
app.get("/api/auth/api/analytics/predictive", authenticate, CustomReportController.getPredictiveAnalytics);
app.get("/api/pre-joining/public/:token", PreJoiningController.publicGetPortalData);
app.post("/api/pre-joining/public/:token/upload", upload.single("doc_file"), PreJoiningController.publicUploadDoc);
app.post("/api/pre-joining/public/:token/submit", PreJoiningController.publicSubmitPortal);

const HolidayController = require("./controller/holidayController");
app.get("/api/holidays", HolidayController.getHolidays);
app.post("/api/holidays", HolidayController.addHoliday);
app.post("/api/holidays/add", HolidayController.addHoliday);
app.delete("/api/holidays/:id", HolidayController.deleteHoliday);

const EmployeeController = require("./controller/employeeController");
app.get("/api/salary/:code", EmployeeController.getSalaryStructure);
app.post("/api/salary/:code", EmployeeController.updateSalaryStructure);

const HrEventController = require("./controller/hrEventController");
app.get("/api/hr-events", authenticate, HrEventController.getEvents);
app.get("/api/hr-events/:id", authenticate, HrEventController.getEventById);
app.post("/api/hr-events", authenticate, HrEventController.createEvent);
app.put("/api/hr-events/:id", authenticate, HrEventController.updateEvent);
app.delete("/api/hr-events/:id", authenticate, HrEventController.deleteEvent);
app.post("/api/hr-events/:id/broadcast", authenticate, HrEventController.broadcastEvent);

const http = require("http");
const { initSocket } = require("./socket");
const { initPolicyRenewalScheduler } = require("./services/policyRenewalScheduler");
const { initInfoSecScheduler } = require("./services/infoSecScheduler");

// Database connection
db.connectDB()
  .then(() => {
    console.log("Database connected...");
    initPolicyRenewalScheduler();
    initInfoSecScheduler();
  })
  .catch((err) => console.log("Error: " + err));

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
