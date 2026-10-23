const http = require("http");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey";

const hrToken = jwt.sign(
  { employee_id: "HR-PM-02", name: "Priyanka Mukherjee", role: "hr", dept: "HR" },
  JWT_SECRET
);
const hodToken = jwt.sign(
  { employee_id: "HOD-BB-01", name: "Biswajit Bag", role: "employee", designation: "HOD", dept: "Engineering" },
  JWT_SECRET
);
const empToken = jwt.sign(
  { employee_id: "EMP-RM-66", name: "Rishi Mitra", role: "employee", dept: "IT" },
  JWT_SECRET
);

function apiRequest(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/auth${path}`,
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

async function runTests() {
  console.log("=================================================");
  console.log("🚀 STARTING TRAINING & DEVELOPMENT AUTOMATED TESTS");
  console.log("=================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Dashboard stats for HR
    const dashRes = await apiRequest("GET", "/training/dashboard-stats", hrToken);
    assert(dashRes.status === 200 && dashRes.data.success, "HR Dashboard stats fetched successfully");
    assert(dashRes.data.data.role === "hr", "HR role identified in dashboard response");

    // 2. Dashboard stats for Employee
    const empDashRes = await apiRequest("GET", "/training/dashboard-stats", empToken);
    assert(empDashRes.status === 200 && empDashRes.data.data.role === "employee", "Employee dashboard stats separated");

    // 3. Program Listing
    const progRes = await apiRequest("GET", "/training/programs", hrToken);
    const testProg =
      progRes.data.data.find((p) => p.assessment || p.title?.includes("POSH")) ||
      progRes.data.data[0];

    // 4. Permission check: Employee cannot create HR training
    const unauthorizedCreate = await apiRequest("POST", "/training/programs", empToken, {
      title: "Unauthorized Course",
      type: "HR",
    });
    assert(unauthorizedCreate.status === 403, "Employees forbidden from creating HR training programs");

    // 5. HOD creates Departmental Proposal
    const hodProposal = await apiRequest("POST", "/training/programs", hodToken, {
      title: "DevOps CI/CD Pipeline Mastery",
      description: "Hands on Kubernetes & GitHub Actions workshop",
      type: "DEPARTMENTAL",
      department: "Engineering",
      category: "Technical",
      delivery_mode: "Online",
      duration_hours: 4,
      trainer_name: "External DevOps Consultant",
    });
    assert(
      hodProposal.status === 201 && hodProposal.data.data.proposal_status === "Approved",
      "HOD departmental program is created directly with 'Approved' published status"
    );
    const proposalId = hodProposal.data.data.id;

    // 6. HR reviews and approves proposal
    const hrApproval = await apiRequest(
      "PATCH",
      `/training/programs/${proposalId}/review-proposal`,
      hrToken,
      { decision: "Approved" }
    );
    assert(
      hrApproval.status === 200 && hrApproval.data.data.proposal_status === "Approved",
      "HR can approve departmental training proposals"
    );

    // 7. Enrollment & Assignment
    const assignRes = await apiRequest("POST", `/training/programs/${testProg.id}/assign`, hrToken, {
      employee_ids: ["EMP-RM-66"],
    });
    assert(assignRes.status === 200 && assignRes.data.success, "Employees assigned to training program");

    // 8. My Trainings for Employee
    const myTrainRes = await apiRequest("GET", "/training/my-trainings", empToken);
    assert(
      myTrainRes.status === 200 && myTrainRes.data.data.length > 0,
      "Employee sees assigned training in 'My Training' dashboard"
    );
    const myEnrollment = myTrainRes.data.data.find((e) => e.program_id === testProg.id);

    // 9. Attendance marking
    if (myEnrollment) {
      const attendRes = await apiRequest(
        "PATCH",
        `/training/enrollments/${myEnrollment.id}/attendance`,
        hrToken,
        { attendance_status: "Attended" }
      );
      assert(attendRes.status === 200 && attendRes.data.data.attendance_status === "Attended", "Attendance marked successfully");
    }

    // 10. Post-Training Assessment Question masking for students
    if (testProg.hasAssessment || testProg.assessment_required) {
      const studentExam = await apiRequest("GET", `/training/programs/${testProg.id}/assessment`, empToken);
      if (studentExam.status === 200 && studentExam.data?.data?.questions) {
        const hasUnmaskedAnswers = (studentExam.data.data.questions || []).some((q) => q.correct_answer !== undefined);
        assert(!hasUnmaskedAnswers, "Correct answers are properly hidden from employee taking the exam");

      // 11. Student takes assessment
      const examSubmit = await apiRequest(
        "POST",
        `/training/programs/${testProg.id}/assessment/submit`,
        empToken,
        {
          answers: [
            {
              question_id: "q_1",
              employee_answer: "Within 3 months from the date of the incident",
            },
            {
              question_id: "q_2",
              employee_answer: "True",
            },
            {
              question_id: "q_3",
              employee_answer: "I would immediately check in with the colleague and file an IC report.",
            },
          ],
        }
      );
      assert(
        (examSubmit.status === 200 && examSubmit.data?.success) ||
        (examSubmit.status === 400 &&
          (examSubmit.data?.error?.includes("Maximum assessment attempts reached") ||
           examSubmit.data?.error?.includes("already attended and submitted"))),
        "Assessment submission handled properly"
      );
      }
    }

    // 12. Feedback submission
    const feedbackRes = await apiRequest("POST", `/training/programs/${testProg.id}/feedback`, empToken, {
      content_quality_rating: 5,
      trainer_effectiveness_rating: 5,
      relevance_to_job_rating: 5,
      overall_satisfaction_rating: 5,
      suggestions: "Excellent interactive workshop!",
    });
    assert(feedbackRes.status === 201 && feedbackRes.data.success, "Employee feedback submitted successfully");

    // 13. External Certification Submission & HR Queue Review
    const certSubmit = await apiRequest("POST", "/training/certifications", empToken, {
      course_name: "AWS Certified Solutions Architect",
      provider_institution: "Amazon Web Services (AWS)",
      skills_acquired: "Cloud Architecture, VPC, IAM, S3, EC2",
      completion_date: "2026-09-15",
      credential_id: "AWS-PSA-998877",
      verification_url: "https://aws.amazon.com/verify/123",
      status: "Submitted",
    });
    assert(
      certSubmit.status === 201 && certSubmit.data.data.status === "Submitted",
      "Employee successfully submitted external certification"
    );
    const certId = certSubmit.data.data.id;

    // HR Review Queue
    const queueRes = await apiRequest("GET", "/training/certifications/queue", hrToken);
    assert(queueRes.status === 200 && Array.isArray(queueRes.data.data), "HR review queue lists submitted certifications");

    // HR Approves Certification
    const reviewCert = await apiRequest("PATCH", `/training/certifications/${certId}/review`, hrToken, {
      status: "Approved",
      is_verified: true,
      review_comments: "Verified against AWS public credential directory.",
    });
    assert(
      reviewCert.status === 200 && reviewCert.data.data.status === "Approved" && reviewCert.data.data.is_verified === true,
      "HR verified and approved external certification"
    );

    // 14. Onboarding Integration
    const onbRes = await apiRequest("GET", "/training/onboarding/EMP-RM-66", hrToken);
    assert(
      onbRes.status === 200 && Array.isArray(onbRes.data.data.trainings),
      "Onboarding mandatory training status tracked per employee"
    );

    // 15. Reports & Exports
    const reportRes = await apiRequest("GET", "/training/reports", hrToken);
    assert(
      reportRes.status === 200 && reportRes.data.data.summary.totalTrainings >= 2,
      "Training reports & analytics aggregated successfully"
    );

    console.log("=================================================");
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
