const http = require("http");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey";

const hrToken = jwt.sign(
  { employee_id: "HR-PM-02", name: "Priyanka Mukherjee", role: "hr", dept: "HR" },
  JWT_SECRET
);
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

async function runTest() {
  console.log("=================================================");
  console.log("🧪 TESTING COMPANY LOGO CUSTOMIZATION & PUBLISHING");
  console.log("=================================================");

  // 1. Create a training program as HR
  const createProgRes = await apiRequest("POST", "/training/programs", hrToken, {
    title: "Logo Test Certification Program",
    category: "Technical",
    delivery_mode: "Online",
    capacity: 25,
    duration_hours: 4,
    start_date: "2026-11-01",
    end_date: "2026-11-02",
    assessment_required: true,
  });
  if (createProgRes.status !== 201) throw new Error("Program creation failed: " + JSON.stringify(createProgRes.data));
  const progId = createProgRes.data.data.id;
  console.log("✅ Step 1: Created test program with ID:", progId);

  // 2. Assign employee to program
  const assignRes = await apiRequest("POST", `/training/programs/${progId}/assign`, hrToken, {
    employee_ids: ["EMP-RM-66"],
  });
  if (assignRes.status !== 200) throw new Error("Assign failed: " + JSON.stringify(assignRes.data));
  console.log("✅ Step 2: Assigned employee EMP-RM-66");

  // 3. Find employee enrollment
  const myTrainRes = await apiRequest("GET", "/training/my-trainings", empToken);
  const myEnrollment = myTrainRes.data.data.find((e) => e.program_id === progId);
  if (!myEnrollment) throw new Error("Enrollment not found");
  console.log("✅ Step 3: Located employee enrollment:", myEnrollment.id);

  // 4. Test Publishing results with company_logo_url
  const testLogoUrl = "/uploads/test-company-logo.png";
  const publishRes = await apiRequest("POST", `/training/programs/${progId}/publish-results`, hrToken, {
    publish_all: true,
    company_logo_url: testLogoUrl,
  });
  if (publishRes.status !== 200) throw new Error("Publish results failed: " + JSON.stringify(publishRes.data));
  if (publishRes.data.data.company_logo_url !== testLogoUrl) {
    throw new Error(`Expected logo ${testLogoUrl}, got ${publishRes.data.data.company_logo_url}`);
  }
  console.log("✅ Step 4: Published assessment results with custom company logo:", publishRes.data.data.company_logo_url);

  // 5. Test Certificate retrieval includes the company logo
  const certRes = await apiRequest("GET", `/training/certificates/${myEnrollment.id}`, hrToken);
  if (certRes.status !== 200) throw new Error("Certificate fetch failed: " + JSON.stringify(certRes.data));
  if (certRes.data.data.company_logo_url !== testLogoUrl) {
    throw new Error(`Certificate expected company_logo_url ${testLogoUrl}, got ${certRes.data.data.company_logo_url}`);
  }
  console.log("✅ Step 5: Certificate verified with customized logo URL:", certRes.data.data.company_logo_url);

  console.log("=================================================");
  console.log("🎉 ALL COMPANY LOGO CUSTOMIZATION CHECKS PASSED!");
  console.log("=================================================");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
