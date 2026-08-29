/**
 * §6.12 — Strategy Matrix. The report's 15 recommendations against six
 * stakeholder groups, filterable by "I am a…" so a ministry official or an
 * association gets a printable action list. Primary and secondary roles are
 * encoded with distinct SHAPES as well as colour (the source document's ◉
 * and 🞈 are not accessible).
 *
 * The grid is fully functional and driven by surveyData.strategyMatrix;
 * the 15 recommendation texts live in the published PDF and have not yet
 * been transcribed into the ETL (see REPORT.md), so until then the module
 * renders an honest placeholder instead of fabricated content.
 */

import { useState } from 'react';

import { ModuleSection } from '../components/ModuleSection';
import { cn } from '../lib/cn';
import { surveyData, type Language } from '../lib/data';
import { filterRecommendations } from '../lib/module-data';
import { useFilters } from '../state/filter-context';
import type { StakeholderGroup } from '../../../types/survey';

const GROUPS: StakeholderGroup[] = ['Employees', 'Employers', 'Public', 'NGO', 'Academia', 'Finance'];

const COPY: Record<Language, {
  title: string;
  intro: string;
  iAm: string;
  all: string;
  primary: string;
  secondary: string;
  placeholderTitle: string;
  placeholder: string;
  groupLabels: Record<StakeholderGroup, string>;
  showing: (n: number, total: number) => string;
}> = {
  en: {
    title: 'Strategy Matrix',
    intro:
      "The report's 15 recommendations mapped to the six stakeholder groups. Pick who you are to see only what applies to you.",
    iAm: 'I am a…',
    all: 'Everyone',
    primary: 'Primary',
    secondary: 'Secondary',
    placeholderTitle: 'Recommendations pending transcription',
    placeholder:
      'The interactive grid is ready, but the 15 recommendation texts live in the published report PDF and have not yet been transcribed into the data pipeline. Once they are added to the ETL, this module fills itself — no interface work remains.',
    groupLabels: {
      Employees: 'Employees',
      Employers: 'Employers',
      Public: 'Public sector',
      NGO: 'NGOs & associations',
      Academia: 'Academia',
      Finance: 'Finance',
    },
    showing: (n, total) => `Showing ${n} of ${total} recommendations`,
  },
  tr: {
    title: 'Strateji Matrisi',
    intro:
      'Raporun 15 önerisi altı paydaş grubuyla eşleştirildi. Kim olduğunuzu seçin; yalnızca size ait olanları görün.',
    iAm: 'Ben bir…',
    all: 'Herkes',
    primary: 'Birincil',
    secondary: 'İkincil',
    placeholderTitle: 'Öneriler aktarım bekliyor',
    placeholder:
      'Etkileşimli tablo hazır; ancak 15 öneri metni yayımlanan rapor PDF’inde ve henüz veri hattına aktarılmadı. ETL’ye eklendiğinde bu modül kendiliğinden dolar — arayüz tarafında iş kalmadı.',
    groupLabels: {
      Employees: 'Çalışanlar',
      Employers: 'İşverenler',
      Public: 'Kamu',
      NGO: 'STK ve dernekler',
      Academia: 'Akademi',
      Finance: 'Finans',
    },
    showing: (n, total) => `${total} öneriden ${n} tanesi gösteriliyor`,
  },
};

export function StrategyMatrix() {
  const { state } = useFilters();
  const c = COPY[state.language];
  const [stakeholder, setStakeholder] = useState<StakeholderGroup | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const all = surveyData.strategyMatrix;
  const filtered = filterRecommendations(all, stakeholder);

  return (
    <ModuleSection id="strategy-matrix" title={c.title} intro={c.intro}>
      {all.length === 0 ? (
        <div className="rounded-sh-card border border-dashed border-sh-rule bg-sh-surface p-6">
          <h4 className="text-sh-h4 text-sh-deep">{c.placeholderTitle}</h4>
          <p className="mt-2 max-w-2xl text-sh-chart leading-relaxed text-sh-muted">{c.placeholder}</p>
        </div>
      ) : (
        <div className="rounded-sh-card border border-sh-rule bg-sh-surface p-5">
          {/* "I am a…" selector (§6.12). */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sh-chart font-medium text-sh-ink">{c.iAm}</span>
            <div className="flex flex-wrap gap-1 rounded-lg border border-sh-rule p-0.5">
              <button
                type="button"
                aria-pressed={stakeholder === null}
                onClick={() => setStakeholder(null)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-sh-tick font-medium',
                  stakeholder === null ? 'bg-sh-deep text-sh-surface' : 'text-sh-muted hover:text-sh-ink',
                )}
              >
                {c.all}
              </button>
              {GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={stakeholder === g}
                  onClick={() => setStakeholder(g)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-sh-tick font-medium',
                    stakeholder === g ? 'bg-sh-deep text-sh-surface' : 'text-sh-muted hover:text-sh-ink',
                  )}
                >
                  {c.groupLabels[g]}
                </button>
              ))}
            </div>
          </div>
          <p className="sh-num mt-2 text-sh-tick text-sh-muted">{c.showing(filtered.length, all.length)}</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sh-chart">
              <thead>
                <tr>
                  <th scope="col" className="border-b border-sh-rule px-2 py-2 text-left font-semibold text-sh-deep">
                    #
                  </th>
                  <th scope="col" className="border-b border-sh-rule px-2 py-2 text-left font-semibold text-sh-deep" />
                  {GROUPS.map((g) => (
                    <th key={g} scope="col" className="border-b border-sh-rule px-2 py-2 text-center font-semibold text-sh-deep">
                      {c.groupLabels[g]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec, i) => (
                  <tr key={rec.id}>
                    <td className="sh-num border-b border-sh-rule px-2 py-2 align-top text-sh-muted">{i + 1}</td>
                    <td className="border-b border-sh-rule px-2 py-2">
                      <button
                        type="button"
                        aria-expanded={expanded === rec.id}
                        onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}
                        className="text-left text-sh-ink hover:text-sh-deep"
                      >
                        {expanded === rec.id
                          ? state.language === 'tr'
                            ? rec.textTr
                            : rec.textEn
                          : `${(state.language === 'tr' ? rec.textTr : rec.textEn).slice(0, 90)}…`}
                      </button>
                    </td>
                    {GROUPS.map((g) => {
                      const role = rec.stakeholders.find((s) => s.group === g)?.role;
                      return (
                        <td key={g} className="border-b border-sh-rule px-2 py-2 text-center">
                          {role === 'primary' ? (
                            <span title={c.primary} aria-label={c.primary} className="inline-block h-3 w-3 rounded-[2px] bg-sh-deep" />
                          ) : role === 'secondary' ? (
                            <span title={c.secondary} aria-label={c.secondary} className="inline-block h-3 w-3 rounded-full border-2 border-sh-teal" />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shape legend — never colour alone (§6.12). */}
          <ul className="mt-3 flex gap-5">
            <li className="flex items-center gap-1.5 text-sh-tick text-sh-ink">
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-[2px] bg-sh-deep" /> {c.primary}
            </li>
            <li className="flex items-center gap-1.5 text-sh-tick text-sh-ink">
              <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border-2 border-sh-teal" /> {c.secondary}
            </li>
          </ul>
        </div>
      )}
    </ModuleSection>
  );
}
