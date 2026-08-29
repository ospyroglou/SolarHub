/**
 * Global filter state: React Context + useReducer (§2 — no external state
 * library). The state hydrates from the URL query string on mount and every
 * change is written back with history.replaceState, so any filtered view is
 * shareable as a link (§10). No browser storage APIs are involved.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import type { EmployeeRecord, EmployerRecord } from '../../../types/survey';
import { makeBase, type BaseInfo } from '../lib/base-count';
import { employees as allEmployees, employers as allEmployers, type Language } from '../lib/data';
import {
  DEFAULT_FILTER_STATE,
  filterEmployees,
  filterEmployers,
  type FilterState,
  type Lens,
} from '../lib/filters';
import { parseFilterState, serializeFilterState } from '../lib/url-state';

export type FilterAction =
  | { type: 'setLens'; lens: Lens }
  | { type: 'setLanguage'; language: Language }
  | { type: 'toggle'; dataset: 'employee' | 'employer'; key: string; value: string }
  | { type: 'clearCategory'; dataset: 'employee' | 'employer'; key: string }
  | { type: 'clearAll' };

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'setLens':
      return { ...state, lens: action.lens };
    case 'setLanguage':
      return { ...state, language: action.language };
    case 'toggle': {
      const selections = state[action.dataset];
      const current = selections[action.key] ?? [];
      const next = current.includes(action.value)
        ? current.filter((v) => v !== action.value)
        : [...current, action.value];
      const nextSelections = { ...selections };
      if (next.length === 0) {
        delete nextSelections[action.key];
      } else {
        nextSelections[action.key] = next;
      }
      return { ...state, [action.dataset]: nextSelections };
    }
    case 'clearCategory': {
      const nextSelections = { ...state[action.dataset] };
      delete nextSelections[action.key];
      return { ...state, [action.dataset]: nextSelections };
    }
    case 'clearAll':
      // Lens and language survive a filter reset.
      return { ...state, employee: {}, employer: {} };
    default:
      return state;
  }
}

interface FilterContextValue {
  state: FilterState;
  dispatch: Dispatch<FilterAction>;
  /** Filtered record sets — every module reads these, never the raw data. */
  filteredEmployees: EmployeeRecord[];
  filteredEmployers: EmployerRecord[];
  /** Dataset-level bases with §7 status, for the live indicator and charts. */
  employeeBase: BaseInfo;
  employerBase: BaseInfo;
}

const FilterContext = createContext<FilterContextValue | null>(null);

function initState(): FilterState {
  if (typeof window === 'undefined') return DEFAULT_FILTER_STATE;
  return parseFilterState(window.location.search);
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(filterReducer, undefined, initState);

  // Serialise every change back to the URL without adding history entries.
  useEffect(() => {
    const query = serializeFilterState(state);
    const url = query
      ? `${window.location.pathname}?${query}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }, [state]);

  const value = useMemo<FilterContextValue>(() => {
    const filteredEmployees = filterEmployees(allEmployees, state.employee);
    const filteredEmployers = filterEmployers(allEmployers, state.employer);
    return {
      state,
      dispatch,
      filteredEmployees,
      filteredEmployers,
      employeeBase: makeBase(filteredEmployees.length, allEmployees.length),
      employerBase: makeBase(filteredEmployers.length, allEmployers.length),
    };
  }, [state]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside <FilterProvider>');
  return ctx;
}
