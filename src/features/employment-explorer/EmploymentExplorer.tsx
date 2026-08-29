/**
 * Single entry component (BuildSpec §11): default export, no required
 * props, renders standalone inside any layout. Everything is scoped under
 * the .sh-explorer root; the only external dependency is tokens.css.
 *
 * Twelve modules in the §6 order. §6.9 (TurnoverRetention) is gated by
 * FEATURES.turnoverModule — off until authorial clearance (lib/features.ts).
 */

import { FilterBar } from './components/FilterBar';
import { useStrings } from './i18n';
import { FEATURES } from './lib/features';
import { ConfidenceLadder } from './modules/ConfidenceLadder';
import { EducationGap } from './modules/EducationGap';
import { ExpectationAsymmetry } from './modules/ExpectationAsymmetry';
import { FreeTextDrawer } from './modules/FreeTextDrawer';
import { GrowthOutlook } from './modules/GrowthOutlook';
import { Hero } from './modules/Hero';
import { LikertExplorer } from './modules/LikertExplorer';
import { Methodology } from './modules/Methodology';
import { PayConditions } from './modules/PayConditions';
import { StrategyMatrix } from './modules/StrategyMatrix';
import { TurnoverRetention } from './modules/TurnoverRetention';
import { WhoAnswered } from './modules/WhoAnswered';
import { WorkforceComposition } from './modules/WorkforceComposition';
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
          <LikertExplorer />
          <PayConditions />
          <EducationGap />
          <ExpectationAsymmetry />
          <WorkforceComposition />
          {FEATURES.turnoverModule && <TurnoverRetention />}
          <GrowthOutlook />
          <FreeTextDrawer />
          <StrategyMatrix />
          <Methodology />
        </main>
        <Footer />
      </div>
    </FilterProvider>
  );
}

function Footer() {
  const { state } = useFilters();
  const t = useStrings(state.language);
  return (
    <footer className="mx-auto mt-sh-module max-w-sh-content border-t border-sh-rule px-6 py-10">
      <p className="text-sh-tick text-sh-muted">{t.footerLine}</p>
    </footer>
  );
}
