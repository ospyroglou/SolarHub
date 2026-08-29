/**
 * ETL: converts data/C_alıs_an_Anketi__Responses_.xlsx into
 * src/data/survey-data.json (BuildSpec v1.1 §3).
 *
 * Reads ONLY the analysed sheets ('Analize dahil edilenler',
 * 'İşveren dahil edilenler'). The pilot cut-off at 2026-03-04 (§3.1a) is
 * asserted against both the analysed and the raw sheets on every run, and
 * the build fails unless exactly 44 employee and 20 employer records emerge.
 *
 * Re-runnable and idempotent: same workbook in, byte-identical JSON out.
 *
 * Usage: npm run build:data
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  EmployeeRecord,
  EmployerRecord,
  FirmScale,
  Likert,
  OtherResponse,
  Question,
  SurveyData,
} from '../src/types/survey';
import {
  EMPLOYEE_QUESTIONS,
  EMPLOYER_QUESTIONS,
  LIKERT_OPTIONS,
  foldTr,
  normSpace,
  normValue,
  type OptionDef,
  type QuestionDef,
} from './lib/dictionary';
import {
  applyCutoff,
  readSheet,
  serialToIsoDate,
  SHEET_EMPLOYEE_ANALYSED,
  SHEET_EMPLOYEE_RAW,
  SHEET_EMPLOYER_ANALYSED,
  SHEET_EMPLOYER_RAW,
  type Cell,
  type Sheet,
  type SheetRow,
} from './lib/workbook';

const OUTPUT_PATH = fileURLToPath(
  new URL('../src/data/survey-data.json', import.meta.url),
);

/* ------------------------------------------------------------------ */
/* Assertion helper — every breach fails the build (§3.2 step 10)      */
/* ------------------------------------------------------------------ */

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ETL assertion failed: ${message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Option matching                                                     */
/* ------------------------------------------------------------------ */

interface PreparedOption {
  def: OptionDef;
  /** Whitespace-normalised variant strings (labelTr first). */
  variants: string[];
}

function prepareOptions(options: OptionDef[]): PreparedOption[] {
  return options.map((def) => ({
    def,
    variants: [def.labelTr, ...(def.trVariants ?? [])].map(normSpace),
  }));
}

/** Exact single-value match (Turkish-case- and dash-spacing-insensitive). */
function matchSingle(raw: string, prepared: PreparedOption[]): OptionDef | null {
  const key = normValue(raw);
  for (const { def, variants } of prepared) {
    if (variants.some((v) => normValue(v) === key)) return def;
  }
  return null;
}

/**
 * Tokenise a Google-Forms multi-select cell against the known options.
 *
 * BuildSpec §3.2 step 5 says "split on comma", but several option labels
 * themselves contain commas ("Kurulum, Taahhüt, İnşaat, …"), so a naive
 * split would shred them. Instead the known option strings are matched
 * greedily (longest first, Turkish-case-insensitively) and only the
 * unmatched remainder is treated as free text for `_other`. Free-text
 * remainders are kept whole — they are never split on their own commas.
 */
function splitMulti(
  raw: string,
  prepared: PreparedOption[],
): { values: string[]; other: string[] } {
  const s = normSpace(raw);
  const folded = foldTr(s);
  // All variants, longest first so comma-bearing labels win.
  const variants = prepared
    .flatMap(({ def, variants: vs }) => vs.map((v) => ({ def, folded: foldTr(v) })))
    .sort((a, b) => b.folded.length - a.folded.length);

  const matchAt = (pos: number): { def: OptionDef; len: number } | null => {
    for (const { def, folded: v } of variants) {
      if (
        folded.startsWith(v, pos) &&
        (pos + v.length === folded.length || folded[pos + v.length] === ',')
      ) {
        return { def, len: v.length };
      }
    }
    return null;
  };

  const values: string[] = [];
  const other: string[] = [];
  let pos = 0;
  while (pos < s.length) {
    // Skip separators between tokens.
    while (pos < s.length && (s[pos] === ',' || s[pos] === ' ')) pos++;
    if (pos >= s.length) break;

    const hit = matchAt(pos);
    if (hit) {
      if (!values.includes(hit.def.value)) values.push(hit.def.value);
      pos += hit.len;
      continue;
    }

    // Free text: consume up to the next position where a known option
    // starts right after a comma, or to the end of the cell.
    let end = s.length;
    for (let j = pos + 1; j < s.length; j++) {
      if (s[j - 1] !== ',' && !(s[j - 1] === ' ' && s[j - 2] === ',')) continue;
      if (matchAt(j)) {
        end = j;
        break;
      }
    }
    const chunk = s.slice(pos, end).replace(/[,\s]+$/u, '');
    if (chunk.length > 0) other.push(chunk);
    pos = end;
  }
  return { values, other };
}

/* ------------------------------------------------------------------ */
/* Cell coercion                                                       */
/* ------------------------------------------------------------------ */

function cellText(cell: Cell): string | null {
  if (cell === null || cell === undefined) return null;
  const s = typeof cell === 'string' ? cell : String(cell);
  return s.trim() === '' ? null : s;
}

function parseLikert(cell: Cell): { value: Likert; unparsed: string | null } {
  const text = cellText(cell);
  if (text === null) return { value: null, unparsed: null };
  const n = Number(normSpace(text));
  if (Number.isInteger(n) && n >= 1 && n <= 5) {
    return { value: n as Likert, unparsed: null };
  }
  return { value: null, unparsed: text };
}

/* ------------------------------------------------------------------ */
/* Sheet-shape validation                                              */
/* ------------------------------------------------------------------ */

const CONSENT_HEADER_KEY = 'SolarHub Projesi';

function validateHeaders(sheet: Sheet, defs: QuestionDef[], consentCol: number): void {
  for (const def of defs) {
    const header = sheet.headers[def.col - 1] ?? '';
    assert(
      foldTr(normSpace(header)).includes(foldTr(normSpace(def.headerKey))),
      `sheet '${sheet.name}' column ${def.col} does not look like '${def.id}' ` +
        `(expected header to contain '${def.headerKey}', got '${header.slice(0, 80)}…')`,
    );
  }
  const consentHeader = sheet.headers[consentCol - 1] ?? '';
  assert(
    consentHeader.includes(CONSENT_HEADER_KEY),
    `sheet '${sheet.name}' column ${consentCol} is not the consent/GDPR column`,
  );
}

/* ------------------------------------------------------------------ */
/* Record builders                                                     */
/* ------------------------------------------------------------------ */

interface ParsedFields {
  fields: Record<string, unknown>;
  _other: OtherResponse[];
  flags: string[];
}

/**
 * Generic pass over a question dictionary for one row. Special cases
 * (career_plan_5y "1 ve 3", numeric/freetext employer fields) are handled
 * by the callers before/after this pass.
 */
function parseRow(
  row: SheetRow,
  defs: QuestionDef[],
  skipIds: ReadonlySet<string>,
): ParsedFields {
  const fields: Record<string, unknown> = {};
  const _other: OtherResponse[] = [];
  const flags: string[] = [];

  for (const def of defs) {
    if (skipIds.has(def.id)) continue;
    const cell = row.cells[def.col - 1] ?? null;
    const text = cellText(cell);

    switch (def.type) {
      case 'likert5': {
        const { value, unparsed } = parseLikert(cell);
        fields[def.id] = value;
        if (unparsed !== null) {
          _other.push({ question: def.id, valueTr: unparsed });
        }
        break;
      }
      case 'single':
      case 'band': {
        if (text === null) {
          fields[def.id] = null;
          break;
        }
        const prepared = prepareOptions(def.options ?? []);
        const hit = matchSingle(text, prepared);
        if (hit) {
          fields[def.id] = hit.value;
        } else {
          fields[def.id] = null;
          _other.push({ question: def.id, valueTr: normSpace(text) });
        }
        break;
      }
      case 'multi': {
        if (text === null) {
          fields[def.id] = [];
          break;
        }
        const prepared = prepareOptions(def.options ?? []);
        const { values, other } = splitMulti(text, prepared);
        fields[def.id] = values;
        for (const o of other) _other.push({ question: def.id, valueTr: o });
        break;
      }
      case 'numeric': {
        if (text === null) {
          fields[def.id] = null;
          break;
        }
        const n = Number(normSpace(text).replace(/\./g, ''));
        if (Number.isFinite(n)) {
          fields[def.id] = Math.round(n);
        } else {
          fields[def.id] = null;
          _other.push({ question: def.id, valueTr: normSpace(text) });
        }
        break;
      }
      case 'freetext': {
        fields[def.id] = text === null ? null : normSpace(text);
        break;
      }
    }
  }
  return { fields, _other, flags };
}

const SENIORITY: Record<string, EmployeeRecord['seniority']> = {
  '1_3': 'early',
  '3_5': 'mid',
  '5_10': 'mid',
  '10_plus': 'senior',
};

const FIRM_SCALE: Record<string, FirmScale> = {
  '1_9': 'micro',
  '10_49': 'small_mid',
  '50_149': 'small_mid',
  '150_299': 'large',
  '300_499': 'large',
  '500_plus': 'corporate',
};

function buildEmployee(row: SheetRow, index: number): EmployeeRecord {
  const careerDef = EMPLOYEE_QUESTIONS.find((d) => d.id === 'career_plan_5y')!;
  const careerRaw = cellText(row.cells[careerDef.col - 1] ?? null);

  // §3.3: "1 ve 3" = respondent selected options 1 and 3 of career_plan_5y.
  const isOneAndThree = careerRaw !== null && normSpace(careerRaw) === '1 ve 3';
  const skip = new Set<string>(isOneAndThree ? ['career_plan_5y'] : []);

  const { fields, _other, flags } = parseRow(row, EMPLOYEE_QUESTIONS, skip);

  let career_plan_5y = (fields['career_plan_5y'] ?? null) as string | null;
  let career_plan_5y_multi: string[] | null = null;
  if (isOneAndThree) {
    career_plan_5y = null;
    const opts = careerDef.options!;
    career_plan_5y_multi = [opts[0]!.value, opts[2]!.value]; // options 1 and 3
    flags.push('career_plan_5y_multiple_selection');
  }

  const certificates = fields['certificates'] as string[];
  const eduMatch = fields['education_role_match'] as Likert;

  return {
    id: `E${String(index + 1).padStart(2, '0')}`,
    age: fields['age'] as string | null,
    gender: fields['gender'] as string | null,
    experience: fields['experience'] as string | null,
    activity_field: fields['activity_field'] as string | null,
    company_size: fields['company_size'] as string | null,
    education_level: fields['education_level'] as string | null,
    certificates,
    education_role_match: eduMatch,
    certificate_value: fields['certificate_value'] as Likert,
    training_support: fields['training_support'] as Likert,
    pay_fairness: fields['pay_fairness'] as Likert,
    rights_compliance: fields['rights_compliance'] as Likert,
    field_allowances: fields['field_allowances'] as Likert,
    wage_comparison: fields['wage_comparison'] as string | null,
    confidence_self: fields['confidence_self'] as Likert,
    confidence_employer: fields['confidence_employer'] as Likert,
    confidence_sector: fields['confidence_sector'] as Likert,
    subcontractor_status: fields['subcontractor_status'] as string | null,
    clean_energy_satisfaction: fields['clean_energy_satisfaction'] as Likert,
    work_life_balance: fields['work_life_balance'] as Likert,
    mobility_willingness: fields['mobility_willingness'] as Likert,
    development_intent: fields['development_intent'] as Likert,
    loyalty_factor: fields['loyalty_factor'] as string | null,
    career_plan_5y,
    career_plan_5y_multi,
    _other,
    flags,
    // Derived (§3.4). No imputation: null stays null.
    has_certificate:
      certificates.length > 0 && !certificates.every((c) => c === 'none'),
    education_match_band:
      eduMatch === null ? null : eduMatch <= 2 ? 'misaligned' : eduMatch === 3 ? 'neutral' : 'aligned',
    seniority: fields['experience'] ? SENIORITY[fields['experience'] as string] ?? null : null,
    firm_scale: fields['company_size'] ? FIRM_SCALE[fields['company_size'] as string] ?? null : null,
  };
}

const TURNOVER_IDS = [
  'turnover_manager',
  'turnover_project_specialist',
  'turnover_rd_engineer',
  'turnover_project_technical',
  'turnover_entry_engineer',
  'turnover_technician',
  'turnover_field_worker',
  'turnover_admin',
] as const;

const TURNOVER_ORDER = ['0_10', '11_20', '21_30', '31_40', '41_plus'] as const;

function employeeCountBand(count: number | null): FirmScale | null {
  if (count === null) return null;
  if (count <= 9) return 'micro';
  if (count <= 149) return 'small_mid';
  if (count <= 499) return 'large';
  return 'corporate';
}

/** Modal turnover band across the 8 staff-group columns; ties resolve to the lower band. */
function turnoverMeanBand(record: Record<string, unknown>): string | null {
  const counts = new Map<string, number>();
  for (const id of TURNOVER_IDS) {
    const v = record[id];
    if (typeof v === 'string') counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: string | null = null;
  let bestCount = -1;
  for (const band of TURNOVER_ORDER) {
    const c = counts.get(band) ?? 0;
    if (c > bestCount) {
      best = band;
      bestCount = c;
    }
  }
  return best;
}

function buildEmployer(row: SheetRow, index: number): EmployerRecord {
  const { fields, _other, flags } = parseRow(row, EMPLOYER_QUESTIONS, new Set());

  const main = fields['main_activity_field'] as string | null;
  const others = fields['other_activity_fields'] as string[];
  const manufacturingValues = new Set(['cell_panel_manufacturing', 'component_manufacturing']);
  const totalEmployees = fields['total_employees'] as number | null;

  return {
    id: `R${String(index + 1).padStart(2, '0')}`,
    main_activity_field: main,
    other_activity_fields: others,
    years_operating: fields['years_operating'] as string | null,
    total_employees: totalEmployees,
    annual_volume: fields['annual_volume'] as string | null,
    international_share: fields['international_share'] as string | null,
    staff_dist_project_dev: fields['staff_dist_project_dev'] as string | null,
    staff_dist_install: fields['staff_dist_install'] as string | null,
    staff_dist_manufacturing: fields['staff_dist_manufacturing'] as string | null,
    staff_dist_admin: fields['staff_dist_admin'] as string | null,
    staff_dist_sales: fields['staff_dist_sales'] as string | null,
    edu_dist_doctorate: fields['edu_dist_doctorate'] as string | null,
    edu_dist_postgrad: fields['edu_dist_postgrad'] as string | null,
    edu_dist_bachelor: fields['edu_dist_bachelor'] as string | null,
    edu_dist_associate: fields['edu_dist_associate'] as string | null,
    edu_dist_secondary: fields['edu_dist_secondary'] as string | null,
    edu_dist_primary: fields['edu_dist_primary'] as string | null,
    turnover_manager: fields['turnover_manager'] as string | null,
    turnover_project_specialist: fields['turnover_project_specialist'] as string | null,
    turnover_rd_engineer: fields['turnover_rd_engineer'] as string | null,
    turnover_project_technical: fields['turnover_project_technical'] as string | null,
    turnover_entry_engineer: fields['turnover_entry_engineer'] as string | null,
    turnover_technician: fields['turnover_technician'] as string | null,
    turnover_field_worker: fields['turnover_field_worker'] as string | null,
    turnover_admin: fields['turnover_admin'] as string | null,
    employment_type_permanent: fields['employment_type_permanent'] as string | null,
    employment_type_project: fields['employment_type_project'] as string | null,
    female_technical: fields['female_technical'] as string | null,
    female_management: fields['female_management'] as string | null,
    certified_performance: fields['certified_performance'] as Likert,
    poaching_frequency: fields['poaching_frequency'] as Likert,
    graduate_readiness: fields['graduate_readiness'] as Likert,
    regulatory_complexity: fields['regulatory_complexity'] as Likert,
    outflow_other_sectors: fields['outflow_other_sectors'] as Likert,
    field_fatigue: fields['field_fatigue'] as Likert,
    hardest_role: fields['hardest_role'] as string | null,
    recruitment_barriers: fields['recruitment_barriers'] as string[],
    volume_headcount_relation: fields['volume_headcount_relation'] as string | null,
    training_hours: fields['training_hours'] as string | null,
    academia_collaboration: fields['academia_collaboration'] as string | null,
    resignation_reason: fields['resignation_reason'] as string | null,
    retention_methods: fields['retention_methods'] as string[],
    growth_tech_areas: fields['growth_tech_areas'] as string[],
    employment_change_2y: fields['employment_change_2y'] as string | null,
    employment_change_drivers: fields['employment_change_drivers'] as string[],
    _other,
    flags,
    // Derived (§3.4)
    employee_count_band: employeeCountBand(totalEmployees),
    turnover_mean_band: turnoverMeanBand(fields),
    is_manufacturer:
      (main !== null && manufacturingValues.has(main)) ||
      others.some((o) => manufacturingValues.has(o)),
  };
}

/* ------------------------------------------------------------------ */
/* Question dictionary output                                          */
/* ------------------------------------------------------------------ */

function buildQuestions(
  defs: QuestionDef[],
  dataset: 'employee' | 'employer',
  sheet: Sheet,
  rows: SheetRow[],
): Question[] {
  return defs.map((def) => {
    const labelTr = normSpace(sheet.headers[def.col - 1] ?? '');
    const n = rows.filter((r) => cellText(r.cells[def.col - 1] ?? null) !== null).length;
    const options =
      def.type === 'likert5'
        ? LIKERT_OPTIONS
        : def.options;
    const q: Question = {
      id: def.id,
      dataset,
      labelEn: def.labelEn,
      labelTr,
      shortLabel: def.shortLabel,
      type: def.type,
      ...(options
        ? {
            options: options.map((o, i) => ({
              value: o.value,
              labelEn: o.labelEn,
              labelTr: o.labelTr,
              order: i + 1,
            })),
          }
        : {}),
      dimension: def.dimension,
      n,
      ...(def.notes ? { notes: def.notes } : {}),
    };
    return q;
  });
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function main(): void {
  /* 1. Read the analysed sheets (§3.2 step 1). */
  const employeeSheet = readSheet(SHEET_EMPLOYEE_ANALYSED);
  const employerSheet = readSheet(SHEET_EMPLOYER_ANALYSED);
  validateHeaders(employeeSheet, EMPLOYEE_QUESTIONS, 26);
  validateHeaders(employerSheet, EMPLOYER_QUESTIONS, 47);

  /* Pilot cut-off assertions (§3.1a, §3.2 step 10). */
  const employeeRows = employeeSheet.rows;
  const employerRows = employerSheet.rows;

  assert(
    employeeRows.length === 44,
    `expected exactly 44 analysed employee records, got ${employeeRows.length}`,
  );
  assert(
    employerRows.length === 20,
    `expected exactly 20 analysed employer records, got ${employerRows.length}`,
  );
  for (const row of [...employeeRows, ...employerRows]) {
    assert(
      row.timestampIso.slice(0, 10) >= '2026-03-04',
      `analysed record carries a pre-cut-off timestamp: ${row.timestampIso}`,
    );
  }

  /* Cross-check: the same cut-off applied to the RAW sheets must reproduce
     the analysed sets exactly (§3.1a — this is what makes the pipeline safe
     to re-run against a fresh export). */
  const rawEmployee = readSheet(SHEET_EMPLOYEE_RAW);
  const rawEmployer = readSheet(SHEET_EMPLOYER_RAW);
  assert(
    rawEmployee.rows.length === 48,
    `expected 48 raw employee responses, got ${rawEmployee.rows.length}`,
  );
  assert(
    rawEmployer.rows.length === 23,
    `expected 23 raw employer responses, got ${rawEmployer.rows.length}`,
  );
  const cutEmployee = applyCutoff(rawEmployee.rows);
  const cutEmployer = applyCutoff(rawEmployer.rows);
  assert(
    cutEmployee.length === 44,
    `cut-off applied to raw employee sheet yields ${cutEmployee.length}, expected 44`,
  );
  assert(
    cutEmployer.length === 20,
    `cut-off applied to raw employer sheet yields ${cutEmployer.length}, expected 20`,
  );
  const tsKey = (rows: SheetRow[]) => rows.map((r) => r.timestamp).sort().join(',');
  assert(
    tsKey(cutEmployee) === tsKey(employeeRows),
    'raw employee sheet after cut-off does not match the analysed sheet',
  );
  assert(
    tsKey(cutEmployer) === tsKey(employerRows),
    'raw employer sheet after cut-off does not match the analysed sheet',
  );

  /* 2–8. Transform (Timestamp and consent columns are simply not mapped). */
  const employees = employeeRows.map(buildEmployee);
  const employers = employerRows.map(buildEmployer);

  /* Fieldwork ranges derived from the data must match the report (§3.5). */
  const dates = (rows: SheetRow[]) => rows.map((r) => serialToIsoDate(r.timestamp));
  const employeeDates = dates(employeeRows);
  const employerDates = dates(employerRows);
  const employeeFieldwork: [string, string] = [
    employeeDates.reduce((a, b) => (a < b ? a : b)),
    employeeDates.reduce((a, b) => (a > b ? a : b)),
  ];
  const employerFieldwork: [string, string] = [
    employerDates.reduce((a, b) => (a < b ? a : b)),
    employerDates.reduce((a, b) => (a > b ? a : b)),
  ];
  assert(
    employeeFieldwork[0] === '2026-03-04' && employeeFieldwork[1] === '2026-06-02',
    `employee fieldwork range ${employeeFieldwork.join(' – ')} does not match the report (2026-03-04 – 2026-06-02)`,
  );
  assert(
    employerFieldwork[0] === '2026-03-04' && employerFieldwork[1] === '2026-07-13',
    `employer fieldwork range ${employerFieldwork.join(' – ')} does not match the report (2026-03-04 – 2026-07-13)`,
  );

  /* 9. Emit (§3.5). */
  const data: SurveyData = {
    meta: {
      reportTitle: 'SolarHub Employment Report',
      reportVersion: '1.0',
      submissionDate: '2026-07-31',
      workPackage: 'WP1',
      grantNumber: '101086110',
      employeeFieldwork,
      employerFieldwork,
      employeeN: employees.length,
      employerN: employers.length,
      employeeCollected: rawEmployee.rows.length,
      employerCollected: rawEmployer.rows.length,
      employeePilotExcluded: rawEmployee.rows.length - cutEmployee.length,
      employerPilotExcluded: rawEmployer.rows.length - cutEmployer.length,
      employerSelfCompleted: 16,
      employerInterviewed: 7,
    },
    questions: [
      ...buildQuestions(EMPLOYEE_QUESTIONS, 'employee', employeeSheet, employeeRows),
      ...buildQuestions(EMPLOYER_QUESTIONS, 'employer', employerSheet, employerRows),
    ],
    employees,
    employers,
    // The 15 recommendations live in the published PDF, not the workbook.
    // They must be transcribed into the ETL before module §6.12 is built —
    // see REPORT.md.
    strategyMatrix: [],
  };

  const json = JSON.stringify(data, null, 2) + '\n';
  const bytes = Buffer.byteLength(json, 'utf8');
  assert(bytes < 500 * 1024, `survey-data.json is ${bytes} bytes; §2 caps it at 500 KB`);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, json, 'utf8');

  /* Summary. */
  console.log(`✔ ${employees.length} employee and ${employers.length} employer records`);
  console.log(
    `✔ pilot cut-off ${'2026-03-04'} excluded ${data.meta.employeePilotExcluded} employee / ${data.meta.employerPilotExcluded} employer raw responses`,
  );
  console.log(`✔ wrote ${OUTPUT_PATH} (${(bytes / 1024).toFixed(1)} KB)`);

  const otherSummary = new Map<string, number>();
  for (const r of [...employees, ...employers]) {
    for (const o of r._other) {
      otherSummary.set(o.question, (otherSummary.get(o.question) ?? 0) + 1);
    }
  }
  if (otherSummary.size > 0) {
    console.log('\nQuarantined _other responses (nothing was discarded):');
    for (const [question, count] of [...otherSummary.entries()].sort()) {
      console.log(`  ${question}: ${count}`);
    }
  }
}

main();
