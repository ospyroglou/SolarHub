/**
 * §6.1 — Hero. Full-width, no chart: title, framing, four large statistics
 * with count-up, and the small-sample honesty sentence up top where it
 * belongs. The 65% and 84% are computed from the dataset, not hard-coded
 * (13/20 graduate-readiness disagreement; 37/44 clean-energy agreement —
 * exact-share rounding, which is how the report's hero figures round).
 */

import { ArrowDown } from 'lucide-react';

import { useStrings } from '../i18n';
import { employees, employers, meta } from '../lib/data';
import { useCountUp, useReducedMotion } from '../lib/hooks';
import { summariseLikert } from '../lib/stats';
import { useFilters } from '../state/filter-context';

const graduateDisagreePct = Math.round(
  (summariseLikert(employers, (r) => r.graduate_readiness).counts.slice(0, 2).reduce((a, b) => a + b, 0) /
    employers.length) *
    100,
);

const cleanEnergySummary = summariseLikert(employees, (r) => r.clean_energy_satisfaction);
const cleanEnergyAgreePct = Math.round(
  (cleanEnergySummary.agreeCount / cleanEnergySummary.n) * 100,
);

export function Hero() {
  const { state } = useFilters();
  const t = useStrings(state.language);
  const reduced = useReducedMotion();

  const scrollToData = () => {
    document
      .getElementById('who-answered')
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <header className="border-b border-sh-rule bg-sh-sand">
      <div className="mx-auto max-w-sh-content px-6 pb-14 pt-16">
        <p className="text-sh-tick font-semibold uppercase tracking-wide text-sh-teal">
          SolarHub · Horizon Europe · {meta.workPackage} · GA {meta.grantNumber}
        </p>
        <h1 className="mt-3 max-w-3xl text-sh-h1 tracking-tight text-sh-deep">
          {t.heroTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-sh-body text-sh-ink">{t.heroSubtitle}</p>

        <dl className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
          <HeroStat value={meta.employeeN} label={t.heroStatEmployees} accent="employee" />
          <HeroStat value={meta.employerN} label={t.heroStatEmployers} accent="employer" />
          <HeroStat value={graduateDisagreePct} suffix="%" label={t.heroStatGraduates} accent="employer" />
          <HeroStat value={cleanEnergyAgreePct} suffix="%" label={t.heroStatPurpose} accent="employee" />
        </dl>

        {/* Honesty at the top, not buried in a footer (§6.1). */}
        <p className="mt-8 max-w-2xl text-sh-chart text-sh-muted">
          {t.heroHonesty}{' '}
          <a href="#methodology" className="underline underline-offset-2 hover:text-sh-ink">
            {t.heroMethodologyLink}
          </a>
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={scrollToData}
            className="inline-flex items-center gap-2 rounded-lg bg-sh-deep px-5 py-2.5 text-sh-body font-semibold text-sh-surface hover:opacity-90"
          >
            {t.exploreData}
            <ArrowDown size={16} aria-hidden="true" />
          </button>
          {/* Canonical report URL / Zenodo DOI pending — Items to Confirm 7. */}
          <button
            type="button"
            disabled
            title={t.downloadPending}
            className="cursor-not-allowed rounded-lg border border-sh-rule px-5 py-2.5 text-sh-body font-medium text-sh-muted"
          >
            {t.downloadReport}
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroStat({
  value,
  label,
  suffix = '',
  accent,
}: {
  value: number;
  label: string;
  suffix?: string;
  accent: 'employee' | 'employer';
}) {
  const displayed = useCountUp(value);
  return (
    <div className="border-l-4 pl-4" style={{ borderColor: `var(--sh-${accent})` }}>
      <dt className="sr-only">{label}</dt>
      <dd className="m-0 p-0">
        <span className="sh-num block text-[44px] font-bold leading-none tracking-tight text-sh-deep">
          {displayed}
          {suffix}
        </span>
        <span aria-hidden="true" className="mt-2 block max-w-[26ch] text-sh-chart leading-snug text-sh-muted">
          {label}
        </span>
      </dd>
    </div>
  );
}
