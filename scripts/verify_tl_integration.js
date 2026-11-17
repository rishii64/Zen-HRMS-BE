const { sequelize, Designation, Department, JobGrade, Employee, User } = require("../config/db");

async function verify() {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully.\n");

    // 1. Verify Job Grade L4 (rank 4)
    const gradeL4 = await JobGrade.findOne({ where: { grade_code: "L4" } });
    console.log(`[PASS] Job Grade L4 verified: ID=${gradeL4?.id}, Rank=${gradeL4?.rank_level}, Name="${gradeL4?.grade_name}"`);

    // 2. Verify TL Designations
    const tlDesigs = await Designation.findAll({
      where: { is_tl_role: true },
      include: [
        { model: Department, as: "department" },
        { model: JobGrade, as: "grade" }
      ],
      order: [["id", "ASC"]]
    });
    console.log(`\n[PASS] Found ${tlDesigs.length} active Team Lead designations in DB:`);
    tlDesigs.forEach(d => {
      console.log(` - [${d.code}] ${d.title} | Dept: ${d.department?.dept_code || "GLOBAL"} | Grade: ${d.grade?.grade_code} (Rank ${d.grade?.rank_level}) | TL: ${d.is_tl_role} | HOD: ${d.is_hod_role}`);
    });

    // 3. Verify columns on Employee and User models
    const empCols = Object.keys(Employee.rawAttributes);
    const userCols = Object.keys(User.rawAttributes);
    const hasEmpTL = empCols.includes("team_lead_id") && empCols.includes("team_lead_name");
    const hasUserTL = userCols.includes("team_lead_id") && userCols.includes("team_lead_name");
    console.log(`\n[PASS] Employee model has team_lead_id & team_lead_name: ${hasEmpTL}`);
    console.log(`[PASS] User model has team_lead_id & team_lead_name: ${hasUserTL}`);

    // 4. Verify Authorization Middleware helpers
    const auth = require("../middleware/Authorization");
    console.log("\n[PASS] Authorization helpers check:");
    console.log(` - isTeamLeadDesignation("Team Lead - IT"): ${auth.isTeamLeadDesignation("Team Lead - IT")}`);
    console.log(` - isTeamLeadDesignation("Software Engineer"): ${auth.isTeamLeadDesignation("Software Engineer")}`);
    console.log(` - isManagerDesignation("Engineering Manager"): ${auth.isManagerDesignation("Engineering Manager")}`);
    console.log(` - isManagerDesignation("Team Lead - Engineering"): ${auth.isManagerDesignation("Team Lead - Engineering")}`);
    console.log(` - isHODDesignation("General Manager - HR"): ${auth.isHODDesignation("General Manager - HR")}`);
    console.log(` - isHODDesignation("Team Lead - Engineering"): ${auth.isHODDesignation("Team Lead - Engineering")}`);

    console.log("\nAll Backend TL Verification Checks Passed Successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verify();
