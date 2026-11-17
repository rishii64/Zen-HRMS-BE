const { sequelize, Designation, Department, JobGrade } = require("../config/db");

async function setupTeamLeadDesignations() {
  try {
    console.log("Connecting to database and running TL (Team Lead) migrations...");
    await sequelize.authenticate();

    // 1. Database schema column migrations
    await sequelize.query(`
      ALTER TABLE designations ADD COLUMN IF NOT EXISTS is_tl_role BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS team_lead_id VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS team_lead_name VARCHAR(100) DEFAULT 'N/A';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_lead_id VARCHAR(50);
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS team_lead_name VARCHAR(100) DEFAULT 'N/A';

      CREATE INDEX IF NOT EXISTS idx_designations_is_tl ON designations(is_tl_role);
      CREATE INDEX IF NOT EXISTS idx_employees_tl_id ON employees(team_lead_id);
      CREATE INDEX IF NOT EXISTS idx_users_tl_id ON users(team_lead_id);
    `);
    console.log("Schema columns & indices verified.");

    // 2. Fetch Job Grade L4 (rank 4: Asst. Manager / Lead)
    const gradeL4 = await JobGrade.findOne({
      where: { grade_code: "L4" }
    });
    if (!gradeL4) {
      throw new Error("Job Grade L4 not found in database.");
    }
    console.log(`Found Grade L4: id=${gradeL4.id}, name=${gradeL4.grade_name}, rank=${gradeL4.rank_level}`);

    // 3. Fetch all departments
    const departments = await Department.findAll();
    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.dept_code] = d.id;
    });

    // 4. Define Team Lead designations across each department + Global (Grade L4: up to Assistant Manager level)
    const tlDesignations = [
      {
        title: "Team Lead - Human Resources",
        code: "HR-TL",
        department_id: deptMap["HR"] || null,
        grade_id: gradeL4.id,
        job_family: "HR",
        is_hod_role: false,
        is_tl_role: true,
        description: "First-line people operations leader: manages HR recruitment, onboarding, employee queries, and welfare teams.",
      },
      {
        title: "Team Lead - IT",
        code: "IT-TL",
        department_id: deptMap["IT"] || deptMap["ENG"] || null,
        grade_id: gradeL4.id,
        job_family: "IT",
        is_hod_role: false,
        is_tl_role: true,
        description: "Technical & IT team lead: oversees software development sprints, infrastructure, code quality, architecture, and team mentorship.",
      },
      {
        title: "Team Lead - Sales & Business Development",
        code: "SLS-TL",
        department_id: deptMap["SALES"] || null,
        grade_id: gradeL4.id,
        job_family: "Sales",
        is_hod_role: false,
        is_tl_role: true,
        description: "Sales team lead: guides BDEs/BDAs, manages regional sales pipelines, lead conversions, and sales targets.",
      },
      {
        title: "Team Lead - Accounts & Finance",
        code: "FIN-TL",
        department_id: deptMap["FIN"] || null,
        grade_id: gradeL4.id,
        job_family: "Finance",
        is_hod_role: false,
        is_tl_role: true,
        description: "Finance team lead: supervises daily ledger postings, billing verification, bank reconciliations, and payroll support.",
      },
      {
        title: "Team Lead - Operations",
        code: "OPS-TL",
        department_id: deptMap["OPS"] || null,
        grade_id: gradeL4.id,
        job_family: "Operations",
        is_hod_role: false,
        is_tl_role: true,
        description: "Plant & operational line leader: coordinates shift execution, floor supervision, quality checks, and logistics dispatch.",
      },
      {
        title: "Team Lead - Administration & Facilities",
        code: "ADM-TL",
        department_id: deptMap["ADMIN"] || null,
        grade_id: gradeL4.id,
        job_family: "Admin",
        is_hod_role: false,
        is_tl_role: true,
        description: "Facilities team lead: coordinates office infrastructure, vendor management, workplace maintenance, and inventory.",
      },
      {
        title: "Team Lead - Customer Support",
        code: "CS-TL",
        department_id: deptMap["CS"] || null,
        grade_id: gradeL4.id,
        job_family: "Support",
        is_hod_role: false,
        is_tl_role: true,
        description: "Customer service team lead: monitors helpdesk queues, ticket resolutions, escalations, and SLA adherence.",
      },
      {
        title: "Team Lead - Legal & Compliance",
        code: "LEG-TL",
        department_id: deptMap["LEGAL"] || null,
        grade_id: gradeL4.id,
        job_family: "Legal",
        is_hod_role: false,
        is_tl_role: true,
        description: "Legal team lead: manages contract drafting, initial compliance verification, documentation audits, and filings.",
      },
      {
        title: "Executive Team Lead",
        code: "EXEC-TL",
        department_id: deptMap["EXEC"] || null,
        grade_id: gradeL4.id,
        job_family: "Executive",
        is_hod_role: false,
        is_tl_role: true,
        description: "Management support team lead: coordinates executive office tasks, special projects, and inter-departmental initiatives.",
      },
      {
        title: "Team Lead (TL)",
        code: "GEN-TL",
        department_id: null,
        grade_id: gradeL4.id,
        job_family: "Leadership",
        is_hod_role: false,
        is_tl_role: true,
        description: "Universal cross-department team lead: applicable to functional units and cross-functional teams.",
      },
    ];

    console.log(`Upserting ${tlDesignations.length} Team Lead designations...`);
    for (const d of tlDesignations) {
      const existing = await Designation.findOne({ where: { code: d.code } });
      if (existing) {
        await existing.update({
          title: d.title,
          department_id: d.department_id,
          grade_id: d.grade_id,
          job_family: d.job_family,
          is_hod_role: false,
          is_tl_role: true,
          description: d.description,
          is_active: true,
        });
        console.log(`Updated existing designation: ${d.code} -> ${d.title} (Dept: ${d.department_id || "GLOBAL"})`);
      } else {
        await Designation.create(d);
        console.log(`Created new designation: ${d.code} -> ${d.title} (Dept: ${d.department_id || "GLOBAL"})`);
      }
    }

    // 5. Also flag any existing designations that represent a Team Lead or Tech Lead
    await sequelize.query(`
      UPDATE designations 
      SET is_tl_role = true 
      WHERE (
        title ILIKE '%team lead%' 
        OR title ILIKE '%tech lead%' 
        OR title ILIKE '%team leader%'
        OR code ILIKE '%-TL%'
        OR code ILIKE '%-STL%'
      )
      AND is_hod_role = false;
    `);
    console.log("Updated is_tl_role flags on matching lead designations.");

    // 6. Display all active TL designations in DB
    const [tlRows] = await sequelize.query(`
      SELECT d.id, d.code, d.title, dep.dept_name, jg.grade_code, jg.rank_level, d.is_tl_role, d.is_hod_role
      FROM designations d
      LEFT JOIN departments dep ON d.department_id = dep.id
      JOIN job_grades jg ON d.grade_id = jg.id
      WHERE d.is_tl_role = true
      ORDER BY dep.id ASC NULLS LAST, d.id ASC;
    `);

    console.log("\nSuccessfully populated TL designations:");
    console.table(tlRows);

    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

setupTeamLeadDesignations();
