/**
 * Typed access to the static dataset (§2: data is imported at build time —
 * no fetch, no backend) plus label lookup helpers for the EN/TR toggle.
 */

import rawData from '../../../data/survey-data.json';
import type {
  EmployeeRecord,
  EmployerRecord,
  Question,
  SurveyData,
} from '../../../types/survey';

export const surveyData = rawData as unknown as SurveyData;

export const employees: EmployeeRecord[] = surveyData.employees;
export const employers: EmployerRecord[] = surveyData.employers;
export const meta = surveyData.meta;

export type Language = 'en' | 'tr';

const questionIndex = new Map<string, Question>(
  surveyData.questions.map((q) => [q.id, q]),
);

export function getQuestion(id: string): Question {
  const q = questionIndex.get(id);
  if (!q) throw new Error(`Unknown question id: ${id}`);
  return q;
}

export function questionLabel(id: string, lang: Language): string {
  const q = getQuestion(id);
  return lang === 'tr' ? q.labelTr : q.labelEn;
}

export function optionLabel(questionId: string, value: string, lang: Language): string {
  const q = getQuestion(questionId);
  const opt = q.options?.find((o) => o.value === value);
  if (!opt) return value;
  return lang === 'tr' ? opt.labelTr : opt.labelEn;
}

export function optionsOf(questionId: string) {
  return getQuestion(questionId).options ?? [];
}
