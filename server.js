process.env.TZ = process.env.TZ || "Asia/Kolkata";
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");
const db = require("./config/db");
const authRoutes = require("./routes/authRoute");
const authenticate = require("./middleware/Authorization");
const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/", (req, res) => { res.send("Backend working!"); });

// API Routes
app.use("/api/auth", authRoutes);

const EmployeeController = require("./controller/employeeController");
app.get("/api/salary/:code", EmployeeController.getSalaryStructure);
app.post("/api/salary/:code", EmployeeController.updateSalaryStructure);

// Database connection
db.connectDB()
  .then(() => console.log("Database connected..."))
  .catch((err) => console.log("Error: " + err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
