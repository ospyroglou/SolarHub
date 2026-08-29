/**
 * Type definitions for the SolarHub Employment Explorer dataset.
 *
 * `SurveyData` and `Question` follow BuildSpec v1.1 §3.5 verbatim.
 * `EmployeeRecord`, `EmployerRecord` and `Recommendation` are not spelled
 * out in the spec; they are defined here to satisfy §3.5's "one record per
 * respondent with question IDs as keys" and §6.12.
 */

export interface SurveyData {
  meta: {
    reportTitle: string;
    reportVersion: string; // "1.0"
    submissionDate: string; // "2026-07-31"
    workPackage: string; // "WP1"
    grantNumber: string; // "101086110"
    employeeFieldwork: [string, string]; // ["2026-03-04", "2026-06-02"]
    employerFieldwork: [string, string]; // ["2026-03-04", "2026-07-13"]
    employeeN: number; // 44 analysed
    employerN: number; // 20 analysed
    employeeCollected: number; // 48 raw
    employerCollected: number; // 23 raw
    employeePilotExcluded: number; // 4
    employerPilotExcluded: number; // 3
    employerSelfCompleted: number; // 16
    employerInterviewed: number; // 7
  };
  questions: Question[]; // full dictionary, see BuildSpec §4
  employees: EmployeeRecord[]; // 44
  employers: EmployerRecord[]; // 20
  strategyMatrix: Recommendation[]; // 15, see BuildSpec §6.12
}

export type QuestionType =
  | 'single'
  | 'multi'
  | 'likert5'
  | 'band'
  | 'numeric'
  | 'freetext';

export interface QuestionOption {
  value: string;
  labelEn: string;
  labelTr: string;
  order: number;
}

export interface Question {
  id: string;
  dataset: 'employee' | 'employer';
  labelEn: string;
  labelTr: string; // retain for the TR locale
  shortLabel: string; // ≤40 chars, for axes and chips
  type: QuestionType;
  options?: QuestionOption[];
  dimension: string; // one of the research dimensions
  reportFigure?: string; // e.g. "Fig. 4.9" — links back to the PDF
  n: number; // answered count; may be < dataset N
  notes?: string; // data-quality caveat surfaced in the UI
}

/** A quarantined response that did not match any known option (§3.2 step 7). */
export interface OtherResponse {
  /** Question id the response came from. */
  question: string;
  /** Verbatim Turkish text, untranslated and untrimmed beyond whitespace. */
  valueTr: string;
}

/** Likert answers are integers 1–5; missing stays null (§3.2 step 6). */
export type Likert = 1 | 2 | 3 | 4 | 5 | null;

export type EducationMatchBand = 'misaligned' | 'neutral' | 'aligned';
export type Seniority = 'early' | 'mid' | 'senior';
export type FirmScale = 'micro' | 'small_mid' | 'large' | 'corporate';

/**
 * One employee respondent (dataset n = 44). Question IDs from BuildSpec §4.1
 * are the keys. Single-select fields hold an option `value` slug from the
 * question dictionary, or null when unanswered / routed to `_other`.
 */
export interface EmployeeRecord {
  /** Stable respondent id "E01"…"E44", in sheet (chronological) order. */
  id: string;

  // Profile
  age: string | null;
  gender: string | null;
  experience: string | null;
  activity_field: string | null;
  company_size: string | null;
  education_level: string | null;

  // Competence
  certificates: string[];
  education_role_match: Likert;
  certificate_value: Likert;

  // Conditions
  training_support: Likert;

  // Pay
  pay_fairness: Likert;
  rights_compliance: Likert;
  field_allowances: Likert;
  wage_comparison: string | null;

  // Security
  confidence_self: Likert;
  confidence_employer: Likert;
  confidence_sector: Likert;
  subcontractor_status: string | null;

  // Satisfaction
  clean_energy_satisfaction: Likert;
  work_life_balance: Likert;
  mobility_willingness: Likert;

  // Future
  development_intent: Likert;
  loyalty_factor: string | null;
  career_plan_5y: string | null;
  /**
   * Set only for the respondent who answered "1 ve 3" on career_plan_5y
   * (§3.3): the two selected option values. career_plan_5y itself is null
   * for that record and the record carries a flag.
   */
  career_plan_5y_multi: string[] | null;

  /** Quarantined free-text responses to closed questions (§3.2 step 7). */
  _other: OtherResponse[];
  /** Data-quality flags, e.g. "career_plan_5y_multiple_selection" (§3.3). */
  flags: string[];

  // Derived fields (§3.4)
  has_certificate: boolean;
  education_match_band: EducationMatchBand | null;
  seniority: Seniority | null;
  firm_scale: FirmScale | null;
}

/**
 * One employer respondent (dataset n = 20). Question IDs from BuildSpec §4.2
 * are the keys. Band fields hold a band option `value` slug or null.
 */
export interface EmployerRecord {
  /** Stable respondent id "R01"…"R20", in sheet (chronological) order. */
  id: string;

  // Profile
  main_activity_field: string | null;
  other_activity_fields: string[];
  years_operating: string | null;
  total_employees: number | null;
  /** Free text with mixed units — verbatim, methodology drawer only (§3.3). */
  annual_volume: string | null;
  international_share: string | null;

  // Composition — staff distribution by function
  staff_dist_project_dev: string | null;
  staff_dist_install: string | null;
  staff_dist_manufacturing: string | null;
  staff_dist_admin: string | null;
  staff_dist_sales: string | null;

  // Composition — workforce distribution by education level
  edu_dist_doctorate: string | null;
  edu_dist_postgrad: string | null;
  edu_dist_bachelor: string | null;
  edu_dist_associate: string | null;
  edu_dist_secondary: string | null;
  edu_dist_primary: string | null;

  // Composition — annual average turnover rate by staff group
  turnover_manager: string | null;
  turnover_project_specialist: string | null;
  turnover_rd_engineer: string | null;
  turnover_project_technical: string | null;
  turnover_entry_engineer: string | null;
  turnover_technician: string | null;
  turnover_field_worker: string | null;
  turnover_admin: string | null;

  // Composition — employment type and female share
  employment_type_permanent: string | null;
  employment_type_project: string | null;
  female_technical: string | null;
  female_management: string | null;

  // Likert
  certified_performance: Likert;
  poaching_frequency: Likert;
  graduate_readiness: Likert;
  regulatory_complexity: Likert;
  outflow_other_sectors: Likert;
  field_fatigue: Likert;

  // Challenges / Skills / Retention / Future
  hardest_role: string | null;
  recruitment_barriers: string[];
  volume_headcount_relation: string | null;
  training_hours: string | null;
  academia_collaboration: string | null;
  resignation_reason: string | null;
  retention_methods: string[];
  growth_tech_areas: string[];
  employment_change_2y: string | null;
  employment_change_drivers: string[];

  /**
   * Quarantined free-text responses (§3.2 step 7). Present in the data
   * layer; §7 forbids DISPLAYING employer verbatim text anywhere in the UI.
   */
  _other: OtherResponse[];
  flags: string[];

  // Derived fields (§3.4)
  employee_count_band: FirmScale | null;
  turnover_mean_band: string | null;
  is_manufacturer: boolean;
}

export type StakeholderGroup =
  | 'Employees'
  | 'Employers'
  | 'Public'
  | 'NGO'
  | 'Academia'
  | 'Finance';

/**
 * One of the report's 15 recommendations (§6.12). The recommendation texts
 * live in the published PDF, not in the survey workbook — they must be
 * supplied to the ETL separately (see REPORT.md).
 */
export interface Recommendation {
  id: string;
  textEn: string;
  textTr: string;
  /** Stakeholder groups this recommendation applies to. */
  stakeholders: { group: StakeholderGroup; role: 'primary' | 'secondary' }[];
}
