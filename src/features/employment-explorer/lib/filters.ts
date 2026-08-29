/**
 * Filter definitions and predicates (BuildSpec §6.0).
 *
 * Semantics: every filter is multi-select. OR within a category, AND across
 * categories. A record whose value for an active category is null cannot
 * match any selected option and is excluded — missing stays missing, it is
 * never treated as a wildcard.
 */

import type { EmployeeRecord, EmployerRecord } from '../../../types/survey';
import { optionsOf, type Language } from './data';

export type Lens = 'employees' | 'employers' | 'compare';

export interface FilterOption {
  value: string;
  labelEn: string;
  labelTr: string;
}

export interface FilterCategoryDef<R> {
  /** State + URL key within the dataset namespace. */
  key: string;
  /** Short key used in the URL query string. */
  urlKey: string;
  labelEn: string;
  labelTr: string;
  options: FilterOption[];
  /** Maps a record to the categorical value the filter tests against. */
  accessor: (record: R) => string | null;
}

const YES_NO: FilterOption[] = [
  { value: 'yes', labelEn: 'Yes', labelTr: 'Evet' },
  { value: 'no', labelEn: 'No', labelTr: 'Hayır' },
];

/** Bands of the derived firm-scale fields (§3.4), shared by both datasets. */
export const FIRM_SCALE_OPTIONS: FilterOption[] = [
  { value: 'micro', labelEn: '1–9', labelTr: '1–9' },
  { value: 'small_mid', labelEn: '10–149', labelTr: '10–149' },
  { value: 'large', labelEn: '150–499', labelTr: '150–499' },
  { value: 'corporate', labelEn: '500+', labelTr: '500+' },
];

function questionOptions(questionId: string): FilterOption[] {
  return optionsOf(questionId).map((o) => ({
    value: o.value,
    labelEn: o.labelEn,
    labelTr: o.labelTr,
  }));
}

/** Employee-lens filter set (§6.0). */
export const EMPLOYEE_FILTERS: FilterCategoryDef<EmployeeRecord>[] = [
  {
    key: 'age', urlKey: 'e_age', labelEn: 'Age group', labelTr: 'Yaş grubu',
    options: questionOptions('age'), accessor: (r) => r.age,
  },
  {
    key: 'gender', urlKey: 'e_gender', labelEn: 'Gender', labelTr: 'Cinsiyet',
    options: questionOptions('gender'), accessor: (r) => r.gender,
  },
  {
    key: 'experience', urlKey: 'e_exp', labelEn: 'Experience band', labelTr: 'Deneyim',
    options: questionOptions('experience'), accessor: (r) => r.experience,
  },
  {
    key: 'activity_field', urlKey: 'e_field', labelEn: 'Activity field', labelTr: 'Faaliyet alanı',
    options: questionOptions('activity_field'), accessor: (r) => r.activity_field,
  },
  {
    key: 'company_size', urlKey: 'e_size', labelEn: 'Company size', labelTr: 'Firma büyüklüğü',
    options: questionOptions('company_size'), accessor: (r) => r.company_size,
  },
  {
    key: 'education_level', urlKey: 'e_edu', labelEn: 'Education level', labelTr: 'Eğitim seviyesi',
    options: questionOptions('education_level'), accessor: (r) => r.education_level,
  },
  {
    key: 'has_certificate', urlKey: 'e_cert', labelEn: 'Holds a certificate', labelTr: 'Sertifika sahibi',
    options: YES_NO, accessor: (r) => (r.has_certificate ? 'yes' : 'no'),
  },
];

/** Employer-lens filter set (§6.0). */
export const EMPLOYER_FILTERS: FilterCategoryDef<EmployerRecord>[] = [
  {
    key: 'main_activity_field', urlKey: 'r_field', labelEn: 'Main activity field', labelTr: 'Ana faaliyet alanı',
    options: questionOptions('main_activity_field'), accessor: (r) => r.main_activity_field,
  },
  {
    key: 'years_operating', urlKey: 'r_years', labelEn: 'Years operating', labelTr: 'Faaliyet yılı',
    options: questionOptions('years_operating'), accessor: (r) => r.years_operating,
  },
  {
    key: 'employee_count_band', urlKey: 'r_size', labelEn: 'Headcount band', labelTr: 'Çalışan sayısı',
    options: FIRM_SCALE_OPTIONS, accessor: (r) => r.employee_count_band,
  },
  {
    key: 'international_share', urlKey: 'r_intl', labelEn: 'International operations', labelTr: 'Yurt dışı operasyon',
    options: questionOptions('international_share'), accessor: (r) => r.international_share,
  },
  {
    key: 'is_manufacturer', urlKey: 'r_manu', labelEn: 'Manufacturer', labelTr: 'Üretici',
    options: YES_NO, accessor: (r) => (r.is_manufacturer ? 'yes' : 'no'),
  },
];

/** Active selections per dataset: category key → selected option values. */
export type Selections = Record<string, string[]>;

export interface FilterState {
  lens: Lens;
  language: Language;
  employee: Selections;
  employer: Selections;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  lens: 'employees',
  language: 'en',
  employee: {},
  employer: {},
};

function matches<R>(
  record: R,
  selections: Selections,
  defs: FilterCategoryDef<R>[],
): boolean {
  for (const def of defs) {
    const selected = selections[def.key];
    if (!selected || selected.length === 0) continue;
    const value = def.accessor(record);
    if (value === null || !selected.includes(value)) return false;
  }
  return true;
}

export function filterEmployees(
  records: EmployeeRecord[],
  selections: Selections,
): EmployeeRecord[] {
  return records.filter((r) => matches(r, selections, EMPLOYEE_FILTERS));
}

export function filterEmployers(
  records: EmployerRecord[],
  selections: Selections,
): EmployerRecord[] {
  return records.filter((r) => matches(r, selections, EMPLOYER_FILTERS));
}

/** Count of active (non-empty) categories across both datasets. */
export function activeFilterCount(state: FilterState): number {
  const count = (s: Selections) =>
    Object.values(s).reduce((acc, v) => acc + (v.length > 0 ? v.length : 0), 0);
  return count(state.employee) + count(state.employer);
}

export function findCategory<R>(
  defs: FilterCategoryDef<R>[],
  key: string,
): FilterCategoryDef<R> | undefined {
  return defs.find((d) => d.key === key);
}
