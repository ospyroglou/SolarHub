/**
 * Single entry component (BuildSpec §11): default export, no required
 * props, renders standalone inside any layout. Everything is scoped under
 * the .sh-explorer root; the only external dependency is tokens.css.
 */

import { FilterBar } from './components/FilterBar';
import { useStrings } from './i18n';
import { meta } from './lib/data';
import { ConfidenceLadder } from './modules/ConfidenceLadder';
import { Hero } from './modules/Hero';
import { WhoAnswered } from './modules/WhoAnswered';
import { FilterProvider, useFilters } from './state/filter-context';

export default function EmploymentExplorer() {
  return (
    <FilterProvider>
      <div className="sh-explorer min-h-screen">
        <Hero />
        <FilterBar />
        <main>
          <WhoAnswered />
          <ConfidenceLadder />
        </main>
        <Footer />
      </div>
    </FilterProvider>
  );
}

/**
 * Interim footer. The hero's honesty line links to #methodology; until the
 * full §6.13 module is built, this stub carries the accurate one-line
 * sample account so the link never dangles.
 */
function Footer() {
  const { state } = useFilters();
  const t = useStrings(state.language);
  return (
    <footer
      id="methodology"
      className="mx-auto mt-sh-module max-w-sh-content border-t border-sh-rule px-6 py-10"
    >
      <p className="max-w-3xl text-sh-chart text-sh-muted">
        {t.methodologyStub(
          meta.employeeCollected,
          meta.employeePilotExcluded,
          meta.employerCollected,
          meta.employerPilotExcluded,
        )}
      </p>
      <p className="mt-3 text-sh-tick text-sh-muted">{t.footerLine}</p>
    </footer>
  );
}
