const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ITDeclaration = sequelize.define(
    "ITDeclaration",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      employee_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      financial_year: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "2025-2026",
      },

      assessment_year: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "2026-2027",
      },

      regime: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "new", // "new" | "old"
      },

      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Draft", // "Draft", "Submitted", "Pending Verification", "Approved", "Rejected"
      },

      submission_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      verification_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      verified_by: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Section 80C Items (JSON: { lic, ppf, epf_vpf, elss, nsc, ssy, ulip, tax_saving_fd, tuition_fees, home_loan_principal, stamp_duty, total_declared, total_eligible, ... })
      section_80c: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Section 80CCD(1B) NPS Additional (JSON: { nps_additional, total_eligible, ... })
      section_80ccd_1b: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Section 80D Health Insurance (JSON: { self_spouse_children, parents, preventive_health_checkup, self_senior, parents_senior, total_eligible, ... })
      section_80d: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Section 24(b) Home Loan Interest (JSON: { interest_paid, property_type, lender_name, lender_pan, total_eligible, ... })
      section_24_home_loan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Section 10(13A) House Rent Allowance (JSON: { annual_rent_paid, monthly_rent, landlord_name, landlord_pan, rental_address, city_type, exemption_amount, ... })
      section_hra: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Other Chapter VI-A Deductions (JSON: { sec_80e_edu_loan, sec_80g_donations, sec_80tta_savings_interest, sec_80u_disability, sec_80dd_dependent_disability, total_eligible, ... })
      other_deductions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Other Income / Previous Employment (JSON: { previous_employer_income, previous_employer_tds, savings_interest_income, other_sources_income, total_other_income, ... })
      other_income: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Full Tax Computation & Regime Comparison (JSON: { gross_annual_salary, total_deductions, net_taxable_income, slab_tax, cess, total_annual_tax, monthly_tds, new_regime, old_regime, comparison, ... })
      tax_computation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Uploaded Proof Documents (JSON array: [{ id, filename, original_name, url, category, upload_date, size, verified, approved_amount }])
      proof_attachments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "it_declarations",
      timestamps: true,
      underscored: true,
    }
  );

  return ITDeclaration;
};
