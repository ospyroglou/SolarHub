/**
 * §6.0 — the full filter set in a right-hand drawer. The visible categories
 * follow the lens: employee set, employer set, or both under Compare.
 */

import { useStrings } from '../i18n';
import {
  EMPLOYEE_FILTERS,
  EMPLOYER_FILTERS,
  type FilterCategoryDef,
} from '../lib/filters';
import { useFilters } from '../state/filter-context';
import { Checkbox } from './ui/checkbox';
import { SheetContent } from './ui/sheet';

export function FilterDrawer() {
  const { state, dispatch, employeeBase, employerBase } = useFilters();
  const t = useStrings(state.language);

  const showEmployee = state.lens !== 'employers';
  const showEmployer = state.lens !== 'employees';

  return (
    <SheetContent
      title={t.filters}
      description={`${
        showEmployee ? `${t.lensEmployees}: ${t.baseLabel(employeeBase.n, employeeBase.total)}` : ''
      }${showEmployee && showEmployer ? ` ${t.andConnector} ` : ''}${
        showEmployer ? `${t.lensEmployers}: ${t.baseLabel(employerBase.n, employerBase.total)}` : ''
      }`}
      closeLabel={t.close}
    >
      <div className="flex flex-col gap-6 pb-6">
        {showEmployee ? (
          <FilterGroup heading={t.employeePanel} dataset="employee" defs={EMPLOYEE_FILTERS} />
        ) : null}
        {showEmployer ? (
          <FilterGroup heading={t.employerPanel} dataset="employer" defs={EMPLOYER_FILTERS} />
        ) : null}
        <button
          type="button"
          onClick={() => dispatch({ type: 'clearAll' })}
          className="self-start rounded-md border border-sh-rule px-3 py-1.5 text-sh-chart text-sh-muted hover:text-sh-ink"
        >
          {t.clearAll}
        </button>
      </div>
    </SheetContent>
  );
}

function FilterGroup<R>({
  heading,
  dataset,
  defs,
}: {
  heading: string;
  dataset: 'employee' | 'employer';
  defs: FilterCategoryDef<R>[];
}) {
  const { state, dispatch } = useFilters();

  return (
    <section aria-label={heading}>
      <h3 className="flex items-center gap-2 text-sh-h4 text-sh-deep">
        <span
          aria-hidden="true"
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            dataset === 'employee' ? 'bg-sh-employee' : 'bg-sh-employer'
          }`}
        />
        {heading}
      </h3>
      <div className="mt-3 flex flex-col gap-4">
        {defs.map((def) => {
          const selected = state[dataset][def.key] ?? [];
          return (
            <fieldset key={def.key} className="border-0 p-0">
              <legend className="mb-1.5 p-0 text-sh-chart font-semibold text-sh-ink">
                {state.language === 'tr' ? def.labelTr : def.labelEn}
              </legend>
              <ul className="flex flex-col gap-1">
                {def.options.map((opt) => {
                  const id = `flt-${dataset}-${def.key}-${opt.value}`;
                  return (
                    <li key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={selected.includes(opt.value)}
                        onCheckedChange={() =>
                          dispatch({ type: 'toggle', dataset, key: def.key, value: opt.value })
                        }
                      />
                      <label htmlFor={id} className="cursor-pointer text-sh-chart text-sh-ink">
                        {state.language === 'tr' ? opt.labelTr : opt.labelEn}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
