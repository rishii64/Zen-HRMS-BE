/**
 * Indian Income Tax Calculator Utility
 * Supports FY 2024-25, FY 2025-26, and FY 2026-27 (AY 2025-26, 2026-27, 2027-28)
 * Under Section 115BAC (New Tax Regime) and Old Tax Regime
 */

// Slabs for New Tax Regime (Section 115BAC - Revised with ₹75,000 Standard Deduction)
const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 700000, rate: 0.05 },
  { min: 700000, max: 1000000, rate: 0.10 },
  { min: 1000000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.20 },
  { min: 1500000, max: Infinity, rate: 0.30 },
];

// Slabs for Old Tax Regime (Individuals below 60 years)
const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 0.05 },
  { min: 500000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: Infinity, rate: 0.30 },
];

/**
 * Compute tax based on slabs
 */
function computeSlabTax(taxableIncome, slabs) {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      const taxableAmount = Math.min(taxableIncome, slab.max) - slab.min;
      tax += taxableAmount * slab.rate;
    }
  }
  return Math.round(tax);
}

/**
 * Calculate HRA Exemption under Section 10(13A)
 * Minimum of:
 * 1. Actual HRA received
 * 2. Rent paid minus 10% of Basic Salary (+ DA if applicable)
 * 3. 50% of Basic Salary (if in Delhi, Mumbai, Kolkata, Chennai) or 40% (other cities)
 */
function calculateHRAExemption({
  annualBasic = 0,
  annualHRA = 0,
  annualRentPaid = 0,
  isMetro = false,
}) {
  if (!annualRentPaid || annualRentPaid <= 0) return 0;
  const tenPercentBasic = annualBasic * 0.10;
  const rentMinusTenPercent = Math.max(0, annualRentPaid - tenPercentBasic);
  const metroFactor = isMetro ? 0.50 : 0.40;
  const salaryCap = annualBasic * metroFactor;

  const exemption = Math.min(annualHRA, rentMinusTenPercent, salaryCap);
  return Math.max(0, Math.round(exemption));
}

/**
 * Calculate Section 80C total eligible amount (Capped at ₹1,50,000)
 */
function calculate80CEligible(items = {}) {
  const sum = Object.values(items).reduce((acc, val) => {
    const num = typeof val === "object" && val !== null ? (parseFloat(val.declared || val.amount || 0) || 0) : (parseFloat(val) || 0);
    return acc + num;
  }, 0);
  return Math.min(150000, Math.round(sum));
}

/**
 * Calculate Section 80CCD(1B) NPS Additional (Capped at ₹50,000)
 */
function calculate80CCDEligible(items = {}) {
  const nps = typeof items === "object" && items !== null
    ? (parseFloat(items.nps_additional?.declared || items.nps_additional || items.amount || 0) || 0)
    : (parseFloat(items) || 0);
  return Math.min(50000, Math.round(nps));
}

/**
 * Calculate Section 80D Health Insurance deduction
 * Self & Family: ₹25,000 (₹50,000 if senior citizen)
 * Parents: ₹25,000 (₹50,000 if senior citizen)
 * Preventive Health Checkup: Included within limits, max ₹5,000
 */
function calculate80DEligible(items = {}) {
  const selfLimit = items.self_senior ? 50000 : 25000;
  const parentLimit = items.parents_senior ? 50000 : 25000;

  const selfDeclared = parseFloat(items.self_spouse_children?.declared || items.self_spouse_children || 0) || 0;
  const parentsDeclared = parseFloat(items.parents?.declared || items.parents || 0) || 0;
  const healthCheckup = Math.min(5000, parseFloat(items.preventive_health_checkup?.declared || items.preventive_health_checkup || 0) || 0);

  const selfEligible = Math.min(selfLimit, selfDeclared + healthCheckup);
  const parentsEligible = Math.min(parentLimit, parentsDeclared);

  return Math.round(selfEligible + parentsEligible);
}

/**
 * Calculate Section 24(b) Home Loan Interest deduction
 * Self-occupied: Max ₹2,00,000 deduction
 * Let-out: Net loss capped at ₹2,00,000 under section 71
 */
function calculateSection24Eligible(items = {}) {
  const interest = parseFloat(items.interest_paid?.declared || items.interest_paid || items.amount || 0) || 0;
  return Math.min(200000, Math.round(interest));
}

/**
 * Complete Indian Income Tax Calculation Engine
 * Returns calculation for both Old and New Tax Regimes with recommendations
 */
function calculateTax({
  annualGrossSalary = 0,
  annualBasicSalary = 0,
  annualHRA = 0,
  section80c = {},
  section80ccd = {},
  section80d = {},
  section24 = {},
  hraDetails = {},
  otherDeductions = {},
  otherIncome = {},
  financialYear = "2025-2026",
}) {
  const grossSalary = parseFloat(annualGrossSalary) || 0;
  const otherIncomeTotal =
    (parseFloat(otherIncome.savings_interest_income) || 0) +
    (parseFloat(otherIncome.other_sources_income) || 0) +
    (parseFloat(otherIncome.previous_employer_income) || 0);

  const totalGrossIncome = grossSalary + otherIncomeTotal;

  // -------------------------------------------------------------
  // 1. NEW TAX REGIME COMPUTATION (u/s 115BAC)
  // -------------------------------------------------------------
  // Standard Deduction in New Regime is ₹75,000 for FY 2024-25 / FY 2025-26+
  const newStandardDeduction = 75000;
  const newNetTaxableIncome = Math.max(0, totalGrossIncome - newStandardDeduction);

  let newSlabTax = computeSlabTax(newNetTaxableIncome, NEW_REGIME_SLABS);
  let newRebate87A = 0;

  // Section 87A rebate for New Regime:
  // If taxable income <= ₹7,00,000, tax is NIL (rebate up to ₹25,000)
  // Marginal relief: if taxable income is slightly above ₹7,00,000, tax cannot exceed income in excess of ₹7L
  if (newNetTaxableIncome <= 700000) {
    newRebate87A = newSlabTax;
    newSlabTax = 0;
  } else if (newNetTaxableIncome > 700000 && newNetTaxableIncome <= 727777) {
    const excessIncome = newNetTaxableIncome - 700000;
    if (newSlabTax > excessIncome) {
      newRebate87A = newSlabTax - excessIncome;
      newSlabTax = excessIncome;
    }
  }

  const newCess = Math.round(newSlabTax * 0.04);
  const newTotalTax = newSlabTax + newCess;
  const newMonthlyTDS = Math.round(newTotalTax / 12);

  // -------------------------------------------------------------
  // 2. OLD TAX REGIME COMPUTATION
  // -------------------------------------------------------------
  // Standard Deduction in Old Regime is ₹50,000
  const oldStandardDeduction = 50000;

  // HRA Exemption
  const basicSalary = parseFloat(annualBasicSalary) || Math.round(grossSalary * 0.40);
  const hraAmount = parseFloat(annualHRA) || Math.round(grossSalary * 0.40);
  const annualRentPaid = parseFloat(hraDetails.annual_rent_paid?.declared || hraDetails.annual_rent_paid || 0) || 0;
  const isMetro = Boolean(hraDetails.city_type === "metro" || hraDetails.isMetro);

  const hraExemption = calculateHRAExemption({
    annualBasic: basicSalary,
    annualHRA: hraAmount,
    annualRentPaid,
    isMetro,
  });

  // Chapter VI-A Deductions
  const eligible80C = calculate80CEligible(section80c);
  const eligible80CCD = calculate80CCDEligible(section80ccd);
  const eligible80D = calculate80DEligible(section80d);
  const eligibleSec24 = calculateSection24Eligible(section24);

  const sec80E = parseFloat(otherDeductions.sec_80e_edu_loan?.declared || otherDeductions.sec_80e_edu_loan || 0) || 0;
  const sec80G = parseFloat(otherDeductions.sec_80g_donations?.declared || otherDeductions.sec_80g_donations || 0) || 0;
  const sec80TTA = Math.min(10000, parseFloat(otherDeductions.sec_80tta_savings_interest?.declared || otherDeductions.sec_80tta_savings_interest || 0) || 0);
  const sec80U = parseFloat(otherDeductions.sec_80u_disability?.declared || otherDeductions.sec_80u_disability || 0) || 0;
  const sec80DD = parseFloat(otherDeductions.sec_80dd_dependent_disability?.declared || otherDeductions.sec_80dd_dependent_disability || 0) || 0;

  const totalOtherDeductions = sec80E + sec80G + sec80TTA + sec80U + sec80DD;
  const totalChapterVIA = eligible80C + eligible80CCD + eligible80D + totalOtherDeductions;

  // Old Regime Total Deductions & Exemptions
  const oldTotalDeductions = oldStandardDeduction + hraExemption + eligibleSec24 + totalChapterVIA;
  const oldNetTaxableIncome = Math.max(0, totalGrossIncome - oldTotalDeductions);

  let oldSlabTax = computeSlabTax(oldNetTaxableIncome, OLD_REGIME_SLABS);
  let oldRebate87A = 0;

  // Section 87A rebate for Old Regime:
  // If taxable income <= ₹5,00,000, tax is NIL (rebate up to ₹12,500)
  if (oldNetTaxableIncome <= 500000) {
    oldRebate87A = oldSlabTax;
    oldSlabTax = 0;
  }

  const oldCess = Math.round(oldSlabTax * 0.04);
  const oldTotalTax = oldSlabTax + oldCess;
  const oldMonthlyTDS = Math.round(oldTotalTax / 12);

  // -------------------------------------------------------------
  // 3. COMPARISON & RECOMMENDATION
  // -------------------------------------------------------------
  const taxDifference = oldTotalTax - newTotalTax;
  let recommendedRegime = "new";
  let savings = 0;

  if (taxDifference > 0) {
    recommendedRegime = "new";
    savings = taxDifference;
  } else if (taxDifference < 0) {
    recommendedRegime = "old";
    savings = Math.abs(taxDifference);
  } else {
    recommendedRegime = "new"; // Default to New if taxes are equal due to simpler filing
    savings = 0;
  }

  return {
    gross_annual_salary: grossSalary,
    other_income_total: otherIncomeTotal,
    total_gross_income: totalGrossIncome,
    financial_year: financialYear,

    new_regime: {
      standard_deduction: newStandardDeduction,
      total_exemptions: 0,
      total_deductions: newStandardDeduction,
      net_taxable_income: newNetTaxableIncome,
      slab_tax: computeSlabTax(newNetTaxableIncome, NEW_REGIME_SLABS),
      rebate_87a: newRebate87A,
      tax_after_rebate: newSlabTax,
      cess: newCess,
      total_annual_tax: newTotalTax,
      monthly_tds: newMonthlyTDS,
    },

    old_regime: {
      standard_deduction: oldStandardDeduction,
      hra_exemption: hraExemption,
      section_24_home_loan: eligibleSec24,
      section_80c: eligible80C,
      section_80ccd_1b: eligible80CCD,
      section_80d: eligible80D,
      other_chapter_vi_a: totalOtherDeductions,
      total_chapter_vi_a: totalChapterVIA,
      total_deductions: oldTotalDeductions,
      net_taxable_income: oldNetTaxableIncome,
      slab_tax: computeSlabTax(oldNetTaxableIncome, OLD_REGIME_SLABS),
      rebate_87a: oldRebate87A,
      tax_after_rebate: oldSlabTax,
      cess: oldCess,
      total_annual_tax: oldTotalTax,
      monthly_tds: oldMonthlyTDS,
    },

    comparison: {
      recommended_regime: recommendedRegime,
      savings,
      tax_difference: taxDifference,
      new_regime_tax: newTotalTax,
      old_regime_tax: oldTotalTax,
      new_monthly_tds: newMonthlyTDS,
      old_monthly_tds: oldMonthlyTDS,
    },
  };
}

module.exports = {
  calculateTax,
  calculateHRAExemption,
  calculate80CEligible,
  calculate80CCDEligible,
  calculate80DEligible,
  calculateSection24Eligible,
  NEW_REGIME_SLABS,
  OLD_REGIME_SLABS,
};
