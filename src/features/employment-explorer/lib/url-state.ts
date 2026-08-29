/**
 * URL state serialisation (BuildSpec §6.0/§10): every filter and toggle
 * serialises to the query string so any filtered view can be shared as a
 * link and restores exactly. Pure functions — the History API wiring lives
 * in the filter context. No browser storage APIs are used (§2 hard rule).
 */

import {
  DEFAULT_FILTER_STATE,
  EMPLOYEE_FILTERS,
  EMPLOYER_FILTERS,
  type FilterCategoryDef,
  type FilterState,
  type Lens,
  type Selections,
} from './filters';

const LENSES: Lens[] = ['employees', 'employers', 'compare'];

/** Values are slug-safe (snake_case), so '.' is an unambiguous separator. */
const VALUE_SEPARATOR = '.';

function serializeSelections<R>(
  params: URLSearchParams,
  selections: Selections,
  defs: FilterCategoryDef<R>[],
): void {
  for (const def of defs) {
    const selected = selections[def.key];
    if (!selected || selected.length === 0) continue;
    // Keep the dictionary's option order for a canonical, shareable URL.
    const ordered = def.options
      .map((o) => o.value)
      .filter((v) => selected.includes(v));
    if (ordered.length > 0) params.set(def.urlKey, ordered.join(VALUE_SEPARATOR));
  }
}

export function serializeFilterState(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.lens !== DEFAULT_FILTER_STATE.lens) params.set('lens', state.lens);
  if (state.language !== DEFAULT_FILTER_STATE.language) params.set('lang', state.language);
  serializeSelections(params, state.employee, EMPLOYEE_FILTERS);
  serializeSelections(params, state.employer, EMPLOYER_FILTERS);
  return params.toString();
}

function parseSelections<R>(
  params: URLSearchParams,
  defs: FilterCategoryDef<R>[],
): Selections {
  const selections: Selections = {};
  for (const def of defs) {
    const raw = params.get(def.urlKey);
    if (!raw) continue;
    const known = new Set(def.options.map((o) => o.value));
    // Unknown values are dropped silently: a stale or hand-edited link must
    // never create a filter the UI cannot display or clear.
    const values = raw.split(VALUE_SEPARATOR).filter((v) => known.has(v));
    if (values.length > 0) selections[def.key] = values;
  }
  return selections;
}

export function parseFilterState(search: string): FilterState {
  const params = new URLSearchParams(search);
  const lensRaw = params.get('lens');
  const langRaw = params.get('lang');
  return {
    lens: LENSES.includes(lensRaw as Lens) ? (lensRaw as Lens) : DEFAULT_FILTER_STATE.lens,
    language: langRaw === 'tr' ? 'tr' : DEFAULT_FILTER_STATE.language,
    employee: parseSelections(params, EMPLOYEE_FILTERS),
    employer: parseSelections(params, EMPLOYER_FILTERS),
  };
}
