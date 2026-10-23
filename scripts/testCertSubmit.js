const http = require("http");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey";

const empToken = jwt.sign(
  { employee_id: "EMP-RM-66", name: "Rishi Mitra", role: "employee", dept: "IT" },
  JWT_SECRET
);

function apiRequest(method, endpoint, token, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/auth${endpoint}`,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk) => (respBody += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(respBody) });
          } catch (e) {
            resolve({ status: res.statusCode, data: respBody });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log("=================================================");
  console.log("🧪 TESTING SUBMISSION OF CERTIFICATION WITH VARIOUS DATES");
  console.log("=================================================");

  // Test 1: Submitting with empty string dates and "Invalid date" (the exact bug user encountered)
  const res1 = await apiRequest("POST", "/training/certifications", empToken, {
    course_name: "Coursera Training Test",
    provider_institution: "Zentelex Pvt. Ltd",
    completion_date: "2026-10-16",
    start_date: "Invalid date",
    issue_date: "",
    expiry_date: "Invalid date",
    credential_id: "CERT-ZEN-0110",
    verification_url: "https://www.google.com",
  });

  console.log("Test 1 Result (Invalid / Empty dates sent):", res1.status, res1.data?.message || res1.data);
  if (res1.status !== 201) {
    throw new Error("Test 1 failed: " + JSON.stringify(res1.data));
  }
  console.log("✅ PASS: Successfully handled empty and 'Invalid date' strings without database errors");

  // Test 2: Submitting with valid dates
  const res2 = await apiRequest("POST", "/training/certifications", empToken, {
    course_name: "AWS Certified Solutions Architect",
    provider_institution: "Amazon Web Services",
    completion_date: "2026-10-15",
    start_date: "2026-06-01",
    issue_date: "2026-10-15",
    expiry_date: "2029-10-15",
    credential_id: "AWS-PSA-9901",
    verification_url: "https://aws.amazon.com/verify",
  });

  console.log("Test 2 Result (Valid dates sent):", res2.status, res2.data?.message || res2.data);
  if (res2.status !== 201) {
    throw new Error("Test 2 failed: " + JSON.stringify(res2.data));
  }
  console.log("✅ PASS: Successfully saved certification with valid dates");

  console.log("=================================================");
  console.log("🎉 ALL CERTIFICATION SUBMISSION DATE TESTS PASSED!");
  console.log("=================================================");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
